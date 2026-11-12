#requires -Version 5.1
[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'common.ps1')
$lock = $null
try {
    $lock = Enter-ServiceLock
    $state = Read-ServiceState
    if ($null -eq $state) { Write-Output 'No script-owned PID state. No process was touched.'; exit 0 }
    $failed = $false
    foreach ($record in @($state.processes | Sort-Object role -Descending)) {
        try {
            $result = Stop-OwnedProcess $record $state.runId
            Write-Output ($record.role + ': ' + $result)
        } catch { $failed=$true; Write-Warning $_.Exception.Message }
    }
    $state.status = if ($failed) { 'stop-failed' } else { 'stopped' }
    Write-JsonFile $script:StateFile $state
    if ($failed) { exit 1 }
    exit 0
} catch { Write-Warning $_.Exception.Message; exit 1 }
finally { if ($null -ne $lock) { $lock.ReleaseMutex(); $lock.Dispose() } }
