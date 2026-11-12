"""Check user-installed Windows tools. Never download tools or write environment files.

Install JDK 17, Maven 3.9.x (3.8+ compatible), Node.js 20+ with npm and
Python 3.11+ first. Set JAVA_HOME and PATH, then run scripts/setup.ps1.
Optional JDK/Maven installations under this project's .tools take precedence.
"""
import shutil
import subprocess
import sys
from pathlib import Path


def main():
    if sys.platform != "win32":
        print("These launch scripts require Windows PowerShell 5.1+.", file=sys.stderr)
        return 1
    powershell = shutil.which("powershell.exe")
    if not powershell:
        print("Windows PowerShell 5.1+ (powershell.exe) is required.", file=sys.stderr)
        return 1
    common = Path(__file__).resolve().with_name("common.ps1")
    # Use the same discovery/version checks as setup/start; no separate download logic.
    quoted = str(common).replace("'", "''")
    command = (
        "$ErrorActionPreference = 'Stop'; try { "
        f". '{quoted}'; Initialize-Tools; "
        "Write-Output 'Tool checks passed. Run scripts/setup.ps1 to install project dependencies.'; "
        "exit 0 } catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }"
    )
    return subprocess.run(
        [powershell, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command],
        check=False,
    ).returncode


if __name__ == "__main__":
    raise SystemExit(main())
