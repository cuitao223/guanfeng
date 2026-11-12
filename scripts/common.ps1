# Shared Windows PowerShell 5.1+ helpers. Do not execute directly.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:ProjectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$script:StateRoot = Join-Path $PSScriptRoot '.state'
$script:StateFile = Join-Path $script:StateRoot 'services.json'

function Write-JsonFile($Path, $Value) {
    $temporary = $Path + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
    [IO.File]::WriteAllText($temporary, ($Value | ConvertTo-Json -Depth 20), (New-Object Text.UTF8Encoding($false)))
    Move-Item -LiteralPath $temporary -Destination $Path -Force
}
function Enter-ServiceLock {
    $hash = [Security.Cryptography.SHA256]::Create()
    try { $tag = [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($script:ProjectRoot.ToLowerInvariant()))).Replace('-', '') }
    finally { $hash.Dispose() }
    $mutex = New-Object Threading.Mutex($false, ('Local\GuanfengScripts_' + $tag))
    try { $locked = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { $mutex.Dispose(); throw 'Another start/stop operation is running.' }
    return $mutex
}
function Find-Application([string]$Name, [string]$Hint) {
    $command = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -eq $command) { throw ("Missing $Name. $Hint No tools are downloaded automatically.") }
    return $command.Source
}
function Get-ToolOutput([string]$Executable, [string[]]$Arguments) {
    # Windows PowerShell treats native stderr (including java -version) as error records.
    $savedPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $global:LASTEXITCODE = $null
        $output = & $Executable @Arguments 2>&1
        $code = $LASTEXITCODE
    } finally { $ErrorActionPreference = $savedPreference }
    if ($null -eq $code -or $code -ne 0) { throw ("Tool check failed: $Executable (exit $code). Check the installation.") }
    return (($output | ForEach-Object { $_.ToString() }) -join "`n")
}
function Initialize-Tools([switch]$RequireVenv) {
    $tools = Join-Path $script:ProjectRoot '.tools'
    $script:Java = $null
    $script:Maven = $null
    # Optional developer tools belong to this checkout only; never search its parent.
    if (Test-Path -LiteralPath $tools -PathType Container) {
        foreach ($toolDirectory in @(Get-ChildItem -LiteralPath $tools -Directory | Sort-Object Name)) {
            if ($toolDirectory.Name -match '^jdk-?17(?:[.\-+_]|$)' -and -not $script:Java) {
                $candidate = Join-Path $toolDirectory.FullName 'bin/java.exe'
                if (Test-Path -LiteralPath $candidate -PathType Leaf) { $script:Java = $candidate }
            }
            if ($toolDirectory.Name -like '*maven*' -and -not $script:Maven) {
                $candidate = Join-Path $toolDirectory.FullName 'bin/mvn.cmd'
                if (Test-Path -LiteralPath $candidate -PathType Leaf) { $script:Maven = $candidate }
            }
        }
    }
    if ($script:Java) {
        $javaHome = Split-Path (Split-Path $script:Java -Parent) -Parent
    } elseif (-not [string]::IsNullOrWhiteSpace($env:JAVA_HOME)) {
        $javaHome = [IO.Path]::GetFullPath($env:JAVA_HOME)
    } else {
        $pathJava = Find-Application 'java.exe' 'Install JDK 17 and set JAVA_HOME or add its bin directory to PATH.'
        $settings = Get-ToolOutput $pathJava @('-XshowSettings:properties','-version')
        if ($settings -notmatch '(?m)^\s*java[.]home\s*=\s*(.+?)\s*$') { throw 'Cannot discover JDK home from java.exe on PATH. Set JAVA_HOME to JDK 17.' }
        $javaHome = $Matches[1].Trim()
    }
    $script:Java = Join-Path $javaHome 'bin/java.exe'
    $release = Join-Path $javaHome 'release'
    if (-not (Test-Path -LiteralPath $script:Java -PathType Leaf) -or
        -not (Test-Path -LiteralPath (Join-Path $javaHome 'bin/javac.exe') -PathType Leaf) -or
        -not (Test-Path -LiteralPath $release -PathType Leaf)) {
        throw ("JDK 17 installation is incomplete or missing at '$javaHome'. Set JAVA_HOME to an installed JDK 17.")
    }
    if ((Get-Content -LiteralPath $release -Raw) -notmatch '(?m)^JAVA_VERSION="17(?:[.\-+]|\")') {
        throw ("JDK 17 is required at '$javaHome'. Check project .tools, JAVA_HOME and PATH in that order.")
    }
    $env:JAVA_HOME = $javaHome
    $env:PATH = (Join-Path $javaHome 'bin') + ';' + $env:PATH
    $null = Get-ToolOutput $script:Java @('-version')
    if (-not $script:Maven) { $script:Maven = Find-Application 'mvn.cmd' 'Install Maven 3.9.x (3.8+ compatible) and add its bin directory to PATH.' }
    $mavenVersion = Get-ToolOutput $script:Maven @('-version')
    $mavenVersion = $mavenVersion -replace '\x1b\[[0-9;]*m', ''
    if ($mavenVersion -notmatch 'Apache Maven\s+(\d+)[.](\d+)(?:[.](\d+))?' -or [int]$Matches[1] -ne 3 -or [int]$Matches[2] -lt 8) {
        throw 'Maven 3.9.x is recommended; Maven 3.8+ in the 3.x series is required.'
    }
    $script:Node = Find-Application 'node.exe' 'Install Node.js 20+ with npm and add it to PATH.'
    $nodeVersion = Get-ToolOutput $script:Node @('--version')
    if ($nodeVersion -notmatch '^v(\d+)[.]' -or [int]$Matches[1] -lt 20) { throw 'Node.js 20+ is required.' }
    $script:Npm = Find-Application 'npm.cmd' 'Install npm with Node.js 20+ and add it to PATH.'
    $venvPython = Join-Path $script:ProjectRoot '.venv/Scripts/python.exe'
    if (Test-Path -LiteralPath $venvPython -PathType Leaf) {
        $script:Python = $venvPython
    } elseif ($RequireVenv) {
        throw 'Project .venv is missing. Run scripts/setup.ps1 first to install Python dependencies.'
    } else {
        $script:Python = Find-Application 'python.exe' 'Install Python 3.11+ and add python.exe to PATH.'
    }
    $pythonVersion = Get-ToolOutput $script:Python @('-c','import sys; print(str(sys.version_info.major)+chr(46)+str(sys.version_info.minor))')
    if ($pythonVersion.Trim() -notmatch '^(\d+)[.](\d+)$' -or [int]$Matches[1] -ne 3 -or [int]$Matches[2] -lt 11) { throw 'Python 3.11+ is required (Python 3.x).' }
    $env:GUANFENG_NODE = $script:Node
    $env:GUANFENG_PYTHON = $script:Python
    $env:PYTHONUTF8 = '1'
    $env:PYTHONDONTWRITEBYTECODE = '1'
}
function Quote-NativeArgument([string]$Value) {
    # Windows CommandLineToArgvW quoting, including trailing backslashes.
    if ($Value.Length -gt 0 -and $Value -notmatch '[\s"]') { return $Value }
    return '"' + [regex]::Replace([regex]::Replace($Value, '(\\*)"', '$1$1\"'), '(\\+)$', '$1$1') + '"'
}
function Join-NativeArguments([string[]]$Values) {
    return (($Values | ForEach-Object { Quote-NativeArgument $_ }) -join ' ')
}
function Read-ServiceState {
    if (-not (Test-Path -LiteralPath $script:StateFile)) { return $null }
    $state = Get-Content -LiteralPath $script:StateFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($state.schemaVersion -ne 1 -or $state.projectRoot -ne $script:ProjectRoot -or $state.runId -notmatch '^[a-f0-9]{32}$') {
        throw 'Unrecognized service state. Nothing will be stopped or overwritten.'
    }
    return $state
}
function Get-OwnedProcess($Record, [string]$RunId) {
    if ($Record.runId -ne $RunId -or $Record.commandLine -notlike ('*' + $RunId + '*')) {
        throw 'Invalid process ownership record; refusing to stop.'
    }
    if ($Record.role -notin @('backend','frontend') -or [int]$Record.pid -le 0) { throw 'Invalid role or PID.' }
    $item = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + [int]$Record.pid)
    if ($null -eq $item) { return $null }
    if ($item.ExecutablePath -ne $Record.executable -or $item.CommandLine -cne $Record.commandLine -or
        $item.CreationDate.ToUniversalTime().Ticks.ToString() -ne $Record.creationTicks) {
        throw ('PID identity mismatch for ' + $Record.role + '; refusing to touch this process.')
    }
    # Hold a process handle before re-checking creation time to prevent PID reuse races.
    $process = [Diagnostics.Process]::GetProcessById([int]$Record.pid)
    try {
        $null = $process.Handle
        if ($process.StartTime.ToUniversalTime().Ticks.ToString() -ne $Record.startTicks) {
            throw 'Process start time changed; refusing to stop.'
        }
        return $process
    } catch { $process.Dispose(); throw }
}
function Start-OwnedProcess([string]$Role, [string]$Executable, [string[]]$Arguments, [string]$Directory, [string]$RunId, [string]$LogDirectory) {
    $process = Start-Process -FilePath $Executable -ArgumentList (Join-NativeArguments $Arguments) -WorkingDirectory $Directory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $LogDirectory ($Role + '.stdout.log')) -RedirectStandardError (Join-Path $LogDirectory ($Role + '.stderr.log'))
    try {
        $null = $process.Handle
        $item = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $process.Id)
        if ($null -eq $item -or $process.HasExited) { throw ('New ' + $Role + ' process exited before ownership capture.') }
        return [pscustomobject]@{ role=$Role; pid=$process.Id; runId=$RunId; executable=$item.ExecutablePath; commandLine=$item.CommandLine; creationTicks=$item.CreationDate.ToUniversalTime().Ticks.ToString(); startTicks=$process.StartTime.ToUniversalTime().Ticks.ToString() }
    } catch {
        # The handle refers only to the new child even if its PID has been reused.
        if (-not $process.HasExited) { $process.Kill(); $null=$process.WaitForExit(10000) }
        throw
    } finally { $process.Dispose() }
}
function Stop-OwnedProcess($Record, [string]$RunId) {
    $process = Get-OwnedProcess $Record $RunId
    if ($null -eq $process) { return 'already-exited' }
    try {
        if (-not $process.HasExited) { $process.Kill(); if (-not $process.WaitForExit(15000)) { throw 'Owned process did not exit within 15 seconds.' } }
        return 'stopped'
    } finally { $process.Dispose() }
}
function Assert-PortFree([int]$Port) {
    $listeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    if ($listeners.Count -gt 0) { throw ('Port ' + $Port + ' is occupied. Existing services will not be adopted or stopped.') }
    $probe = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $Port)
    try { $probe.Start() } finally { $probe.Stop() }
}
function Assert-LoopbackListener($Record, [int]$Port) {
    $items = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
    if ($items.Count -eq 0) { throw ('No listener on expected port ' + $Port) }
    foreach ($item in $items) {
        if ($item.OwningProcess -ne $Record.pid -or $item.LocalAddress -ne '127.0.0.1') { throw ('Unexpected listener ownership or non-loopback address on port ' + $Port) }
    }
}
function Wait-ServiceReady($Record, [string]$RunId, [string]$Url, [int]$TimeoutSeconds, [switch]$Backend) {
    $clock = [Diagnostics.Stopwatch]::StartNew()
    while ($clock.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        $process = Get-OwnedProcess $Record $RunId
        if ($null -eq $process) { throw ($Record.role + ' exited during startup. See its local logs.') }
        $process.Dispose()
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3 -MaximumRedirection 0
            if ($response.StatusCode -eq 200) {
                if ($Backend) {
                    $payload = $response.Content | ConvertFrom-Json
                    if ($payload.code -eq 200 -and $payload.data.status -eq 'ok') { return }
                } elseif ($response.Content -match '<html|<!doctype') { return }
            }
        } catch { }
        Start-Sleep -Milliseconds 400
    }
    throw ($Record.role + ' readiness timed out. See its local logs.')
}
