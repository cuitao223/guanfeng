#requires -Version 5.1
[CmdletBinding()]
param(
    [ValidateRange(1024,65535)][int]$BackendPort = 18180,
    [ValidateRange(1024,65535)][int]$FrontendPort = 5274,
    [switch]$SkipHttp,
    [switch]$StartupSmoke,
    [switch]$ScanSecrets
)
. (Join-Path $PSScriptRoot 'common.ps1')
$results = New-Object 'System.Collections.Generic.List[object]'
$directory = Join-Path $script:StateRoot ('verify-' + [DateTime]::UtcNow.ToString('yyyyMMddTHHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
$null = New-Item -ItemType Directory -Path $directory -Force
function Invoke-Verification([string]$Name, [string]$Executable, [string[]]$Arguments, [string]$WorkingDirectory) {
    $log = Join-Path $directory ($Name + '.log')
    $clock = [Diagnostics.Stopwatch]::StartNew()
    $code = 1
    Push-Location $WorkingDirectory
    try {
        $ErrorActionPreference = 'Continue'
        $global:LASTEXITCODE = $null
        & $Executable @Arguments *> $log
        $code = $LASTEXITCODE
        if ($null -eq $code) { $code = 1 }
    } catch { $code=1; [IO.File]::AppendAllText($log,'Verification invocation failed; inspect tool configuration.') }
    finally { Pop-Location }
    $results.Add([pscustomobject]@{ name=$Name; status=$(if($code -eq 0){'passed'}else{'failed'}); exitCode=[int]$code; seconds=[Math]::Round($clock.Elapsed.TotalSeconds,2); log=$log })
    Write-Output (('{0}: exit {1}' -f $Name,$code))
}
try {
    Initialize-Tools -RequireVenv
    $snapshot = Join-Path $directory 'project'
    Invoke-Verification 'snapshot' $script:Python @('-B',(Join-Path $PSScriptRoot 'verify_support.py'),'snapshot',$snapshot) $script:ProjectRoot
    if ($results[$results.Count-1].exitCode -ne 0) { throw 'Snapshot preparation failed.' }
    $dependencies = Join-Path $script:ProjectRoot 'frontend/node_modules'
    if (-not (Test-Path -LiteralPath $dependencies)) { throw 'Frontend node_modules is missing; no dependencies are installed automatically.' }
    # Share installed dependencies; builds and report output remain inside the snapshot.
    $null = New-Item -ItemType Junction -Path (Join-Path $snapshot 'frontend/node_modules') -Target $dependencies
    Invoke-Verification 'java-tests-and-package' $script:Maven @('-B','-q','-f',(Join-Path $snapshot 'pom.xml'),'package') $snapshot
    Invoke-Verification 'frontend-build' $script:Node @((Join-Path $dependencies 'vite/bin/vite.js'),'build','--mode','production') (Join-Path $snapshot 'frontend')
    Invoke-Verification 'scientific-data-tests' $script:Python @('-B',(Join-Path $snapshot 'tests/data/run_checks.py')) $snapshot
    if ($StartupSmoke) {
        $null = New-Item -ItemType Junction -Path (Join-Path $snapshot '.venv') -Target (Join-Path $script:ProjectRoot '.venv')
        Invoke-Verification 'isolated-service-lifecycle' 'powershell.exe' @('-NoProfile','-ExecutionPolicy','Bypass','-File',(Join-Path $PSScriptRoot 'test_lifecycle.ps1'),'-Snapshot',$snapshot) $script:ProjectRoot
    } else {
        $results.Add([pscustomobject]@{name='isolated-service-lifecycle';status='skipped';exitCode=$null;reason='Opt in with -StartupSmoke; no live-service restart is performed.'})
    }
    if ($SkipHttp) {
        $results.Add([pscustomobject]@{name='live-http';status='skipped';exitCode=$null;reason='Explicit -SkipHttp; no live-service acceptance claimed.'})
    } else {
        Invoke-Verification 'live-http' $script:Python @('-B',(Join-Path $PSScriptRoot 'verify_support.py'),'http','--backend',"http://127.0.0.1:$BackendPort",'--frontend',"http://127.0.0.1:$FrontendPort",'--output',(Join-Path $directory 'http.json')) $script:ProjectRoot
    }
    if ($ScanSecrets) {
        # The scanner detects credential patterns without reading external key files.
        Invoke-Verification 'secret-scan' $script:Python @('-B',(Join-Path $PSScriptRoot 'scan_secrets.py')) $script:ProjectRoot
    } else {
        $results.Add([pscustomobject]@{name='secret-scan';status='skipped';exitCode=$null;reason='Opt in with -ScanSecrets; the scanner writes evidence/submission/secret-scan.json.'})
    }
} catch {
    Write-Warning $_.Exception.Message
    $results.Add([pscustomobject]@{name='verification-setup';status='failed';exitCode=1})
}
$exitCode = if (@($results | Where-Object status -eq 'failed').Count -gt 0) { 1 } else { 0 }
$summary = [ordered]@{ verifiedAt=[DateTime]::UtcNow.ToString('o'); projectRoot=$script:ProjectRoot; exitCode=$exitCode; steps=@($results.ToArray()); scope='CPU; no model API calls, purchases, service restarts, project/plugin/session mutations, or source edits. Build output is isolated under scripts/.state.' }
Write-JsonFile (Join-Path $directory 'summary.json') $summary
Write-Output ('Summary: ' + (Join-Path $directory 'summary.json'))
exit $exitCode
