#requires -Version 5.1
# Exercise real services in the verification snapshot, never the live application's runtime.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Snapshot)
. (Join-Path $PSScriptRoot 'common.ps1')
Initialize-Tools
$destination = [IO.Path]::GetFullPath($Snapshot)
if (-not $destination.StartsWith(($script:StateRoot.TrimEnd('\') + '\'),[StringComparison]::OrdinalIgnoreCase)) { throw 'Smoke snapshot must be under scripts/.state.' }
$launchScripts = Join-Path $destination 'scripts'
$null = New-Item -ItemType Directory -Path $launchScripts -Force
foreach ($name in @('start.ps1','stop.ps1','common.ps1')) { Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $launchScripts -Force }
$localTools = Join-Path $destination '.tools'
$null = New-Item -ItemType Directory -Path $localTools -Force
$javaHome = Split-Path (Split-Path $script:Java -Parent) -Parent
$mavenHome = Split-Path (Split-Path $script:Maven -Parent) -Parent
foreach ($pair in @(@('jdk17',$javaHome),@('maven',$mavenHome))) {
    $link = Join-Path $localTools $pair[0]
    if (-not (Test-Path -LiteralPath $link)) { $null = New-Item -ItemType Junction -Path $link -Target $pair[1] }
}
Write-JsonFile (Join-Path $localTools 'environment.json') @{java=(Join-Path $localTools 'jdk17/bin/java.exe');maven=(Join-Path $localTools 'maven/bin/mvn.cmd')}
$radar = Join-Path $destination 'data/radar'
$null = New-Item -ItemType Directory -Path $radar -Force
Get-ChildItem -LiteralPath (Join-Path $script:ProjectRoot 'data/radar') -File | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $radar -Force }
function Get-FreePort {
    $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,0)
    try { $listener.Start(); return $listener.LocalEndpoint.Port } finally { $listener.Stop() }
}
$backendPort = Get-FreePort
$frontendPort = Get-FreePort
while ($frontendPort -eq $backendPort) { $frontendPort=Get-FreePort }
$checks = New-Object 'System.Collections.Generic.List[object]'
$before = @(Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('java.exe','node.exe') } | ForEach-Object { [pscustomobject]@{pid=$_.ProcessId;ticks=$_.CreationDate.ToUniversalTime().Ticks.ToString()} })
$started = $false
$code = 0
try {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $launchScripts 'start.ps1') -BackendPort $backendPort -FrontendPort $frontendPort -KeyFile (Join-Path $destination 'no-external-key')
    if ($LASTEXITCODE -ne 0) { throw 'Isolated start.ps1 failed.' }
    $started = $true
    $checks.Add(@{name='actual-backend-frontend-start-and-proxy-ready';passed=$true})
    $state = Get-Content -LiteralPath (Join-Path $launchScripts '.state/services.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($state.status -ne 'ready' -or @($state.processes).Count -ne 2) { throw 'Missing ready status or owned PIDs.' }
    foreach ($record in @($state.processes)) {
        $process = Get-OwnedProcess $record $state.runId
        if ($null -eq $process) { throw 'Expected process missing.' }; $process.Dispose()
        $record.creationTicks = '0'
        $rejected = $false
        try { $process = Get-OwnedProcess $record $state.runId; if($null -ne $process){$process.Dispose()} } catch { $rejected=$true }
        if (-not $rejected) { throw 'Forged process identity was accepted.' }
    }
    $checks.Add(@{name='pid-reuse-or-identity-mismatch-refused';passed=$true})
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $launchScripts 'start.ps1') -BackendPort $backendPort -FrontendPort $frontendPort -CheckOnly
    if ($LASTEXITCODE -eq 0) { throw 'Start unexpectedly adopted running services.' }
    $checks.Add(@{name='repeat-start-refused-without-restart';passed=$true})
} catch { $code=1; $checks.Add(@{name='lifecycle-error';passed=$false;message=$_.Exception.Message}) }
finally {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $launchScripts 'stop.ps1')
    if ($LASTEXITCODE -ne 0) { $code=1; $checks.Add(@{name='stop';passed=$false}) }
    elseif ($started) {
        $checks.Add(@{name='actual-owned-process-stop';passed=$true})
        $remaining = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in @($backendPort,$frontendPort) })
        if ($remaining.Count -gt 0) { $code=1; $checks.Add(@{name='ports-released';passed=$false}) } else { $checks.Add(@{name='ports-released';passed=$true}) }
    }
    foreach ($record in $before) {
        $item = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $record.pid)
        if ($null -eq $item -or $item.CreationDate.ToUniversalTime().Ticks.ToString() -ne $record.ticks) {
            $code=1; $checks.Add(@{name='pre-existing-process-preserved';passed=$false;pid=$record.pid})
        }
    }
    if (-not @($checks | Where-Object { $_.name -eq 'pre-existing-process-preserved' }).Count) { $checks.Add(@{name='pre-existing-processes-preserved';passed=$true}) }
    Write-JsonFile (Join-Path (Split-Path $destination -Parent) 'lifecycle.json') @{exitCode=$code;checks=@($checks.ToArray());backendPort=$backendPort;frontendPort=$frontendPort;isolatedRuntime=$destination;modelApiCalled=$false}
}
exit $code
