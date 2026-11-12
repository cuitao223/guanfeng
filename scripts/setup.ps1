#requires -Version 5.1
[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'common.ps1')
Initialize-Tools
$venv = Join-Path $script:ProjectRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $venv)) {
    & $script:Python -m venv (Join-Path $script:ProjectRoot '.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Virtual environment creation failed.' }
}
# Rebind the environment after creating the venv so builds/adapters use its packages.
Initialize-Tools -RequireVenv
& $venv -m pip install -r (Join-Path $script:ProjectRoot 'adapters/requirements-data.txt') playwright
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
& $venv -m playwright install chromium
if ($LASTEXITCODE -ne 0) { throw 'Chromium installation failed.' }
Push-Location (Join-Path $script:ProjectRoot 'frontend')
try {
    & $script:Npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
} finally { Pop-Location }
Push-Location $script:ProjectRoot
try {
    & $script:Maven -B -q -f '.harness/backend/code/leice-radar-series-service/pom.xml' install
    if ($LASTEXITCODE -ne 0) { throw 'Reference build failed.' }
    & $script:Maven -B -q -f 'backend/pom.xml' package
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
    Push-Location (Join-Path $script:ProjectRoot 'frontend')
    try { & $script:Npm run build:prod; if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' } } finally { Pop-Location }
} finally { Pop-Location }
Write-Output 'Setup complete. Run start.ps1.'
