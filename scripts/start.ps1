#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$CheckOnly,
    [ValidateRange(1024,65535)][int]$BackendPort = 18180,
    [ValidateRange(1024,65535)][int]$FrontendPort = 5274,
    [ValidateRange(5,300)][int]$TimeoutSeconds = 90,
    [string]$KeyFile = $env:GUANFENG_KEY_FILE
)
. (Join-Path $PSScriptRoot 'common.ps1')
$lock = $null
$state = $null
try {
    $lock = Enter-ServiceLock
    Initialize-Tools -RequireVenv
    if ($BackendPort -eq $FrontendPort) { throw 'Frontend and backend ports must be different.' }
    $previous = Read-ServiceState
    if ($null -ne $previous) {
        foreach ($record in @($previous.processes)) {
            $process = Get-OwnedProcess $record $previous.runId
            if ($null -ne $process) { $process.Dispose(); throw 'Script-owned services are running. Use stop.ps1 first; no restart was attempted.' }
        }
    }
    Assert-PortFree $BackendPort
    Assert-PortFree $FrontendPort
    $frontend = Join-Path $script:ProjectRoot 'frontend'
    $vite = Join-Path $frontend 'node_modules/vite/bin/vite.js'
    if (-not (Test-Path -LiteralPath $vite)) { throw 'Frontend dependencies are missing. Run scripts/setup.ps1 first.' }
    $jar = Join-Path $script:ProjectRoot 'backend/target/leice-radar-series-demo-0.1.0.jar'
    if (-not $Build -and -not (Test-Path -LiteralPath $jar)) { throw 'Backend JAR is missing; run scripts/setup.ps1 or use -Build.' }
    if ([string]::IsNullOrWhiteSpace($KeyFile)) { $KeyFile = Join-Path $script:ProjectRoot 'config/model-api.key' }
    # Relative user-supplied paths resolve against this checkout, independent of caller cwd.
    if (-not [IO.Path]::IsPathRooted($KeyFile)) { $KeyFile = Join-Path $script:ProjectRoot $KeyFile }
    $keyPath = [IO.Path]::GetFullPath($KeyFile)
    if (Test-Path -LiteralPath $keyPath -PathType Container) { throw 'KeyFile must name a file, not a directory.' }
    if (-not (Test-Path -LiteralPath $keyPath -PathType Leaf)) { Write-Warning 'External key file is absent; model generation will not be available.' }
    if ($CheckOnly) { Write-Output 'Preflight passed. No services started and no key contents read.'; exit 0 }
    if ($Build) {
        Push-Location $script:ProjectRoot
        try {
            & $script:Maven -B -q -f '.harness/backend/code/leice-radar-series-service/pom.xml' install
            if ($LASTEXITCODE -ne 0) { throw 'Reference component build failed.' }
            & $script:Maven -B -q -f 'backend/pom.xml' package
            if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
            Push-Location $frontend
            try { & $script:Node $vite build --mode production; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' } } finally { Pop-Location }
        } finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
    }
    $runId = [guid]::NewGuid().ToString('N')
    $runDirectory = Join-Path $script:StateRoot $runId
    $null = New-Item -ItemType Directory -Path $runDirectory -Force
    # A generated config inherits the checked-in Vite config, replacing only local proxy/address settings.
    $viteApiUrl = ([Uri](Join-Path $frontend 'node_modules/vite/dist/node/index.js')).AbsoluteUri
    $baseConfigJson = (Join-Path $frontend 'vite.config.js') | ConvertTo-Json -Compress
    $frontendJson = $frontend | ConvertTo-Json -Compress
    $cacheJson = (Join-Path $runDirectory 'vite-cache') | ConvertTo-Json -Compress
    $config = @"
import { loadConfigFromFile } from '$viteApiUrl';
export default async (context) => {
  const loaded = await loadConfigFromFile(context, $baseConfigJson, $frontendJson);
  if (!loaded) throw new Error('Cannot load project Vite config');
  const base = loaded.config;
  return { ...base, cacheDir: $cacheJson, server: { ...base.server, host: '127.0.0.1', port: $FrontendPort, strictPort: true,
    proxy: { ...base.server?.proxy, '/api/wb': { target: 'http://127.0.0.1:$BackendPort', changeOrigin: true } } } };
};
"@
    $configPath = Join-Path $runDirectory 'vite.config.mjs'
    [IO.File]::WriteAllText($configPath,$config,(New-Object Text.UTF8Encoding($false)))
    $env:GUANFENG_ROOT = $script:ProjectRoot
    $env:RADAR_DATA_DIR = Join-Path $script:ProjectRoot 'data/radar'
    $env:GUANFENG_KEY_FILE = $keyPath
    if (-not $env:GUANFENG_MODEL) { $env:GUANFENG_MODEL = 'deepseek-flash' }
    $env:GUANFENG_THINKING = 'false'
    $state = [pscustomobject]@{ schemaVersion=1; projectRoot=$script:ProjectRoot; runId=$runId; status='starting'; startedAt=[DateTime]::UtcNow.ToString('o'); backendPort=$BackendPort; frontendPort=$FrontendPort; logDirectory=$runDirectory; processes=@() }
    Write-JsonFile $script:StateFile $state
    $record = Start-OwnedProcess 'backend' $script:Java @("-Dguanfeng.launch.id=$runId",'-jar',$jar,'--server.address=127.0.0.1',"--server.port=$BackendPort") $script:ProjectRoot $runId $runDirectory
    $state.processes += $record
    Write-JsonFile $script:StateFile $state
    Wait-ServiceReady $record $runId "http://127.0.0.1:$BackendPort/api/wb/health" $TimeoutSeconds -Backend
    Assert-LoopbackListener $record $BackendPort
    $record = Start-OwnedProcess 'frontend' $script:Node @($vite,'--config',$configPath,'--host','127.0.0.1','--port',"$FrontendPort",'--strictPort') $frontend $runId $runDirectory
    $state.processes += $record
    Write-JsonFile $script:StateFile $state
    Wait-ServiceReady $record $runId "http://127.0.0.1:$FrontendPort/" $TimeoutSeconds
    Assert-LoopbackListener $record $FrontendPort
    # Validate the frontend proxy as well as the HTML response.
    Wait-ServiceReady $record $runId "http://127.0.0.1:$FrontendPort/api/wb/health" $TimeoutSeconds -Backend
    $state.status = 'ready'
    Write-JsonFile $script:StateFile $state
    Write-Output "Ready: http://127.0.0.1:$FrontendPort/ (backend $BackendPort)"
    Write-Output ('Owned PID state: ' + $script:StateFile)
    exit 0
} catch {
    Write-Warning $_.Exception.Message
    if ($null -ne $state) {
        $cleanupFailed = $false
        foreach ($record in @($state.processes | Sort-Object role -Descending)) {
            try { $null = Stop-OwnedProcess $record $state.runId } catch { $cleanupFailed=$true; Write-Warning $_.Exception.Message }
        }
        $state.status = if ($cleanupFailed) { 'cleanup-failed' } else { 'start-failed' }
        Write-JsonFile $script:StateFile $state
    }
    exit 1
} finally { if ($null -ne $lock) { $lock.ReleaseMutex(); $lock.Dispose() } }
