"""Scan the submission for credential-shaped strings without reading external key files."""
from pathlib import Path
from datetime import datetime,timezone
import json,os,re,zipfile
ROOT=Path(__file__).resolve().parents[1]
patterns=[re.compile(rb"sk-(?:ant-)?[A-Za-z0-9_-]{24,}"),re.compile(rb'"(?:apiKey|api_key|accessToken|refreshToken)"\s*:\s*"[A-Za-z0-9_.-]{32,}"')]
excluded={"node_modules",".tools",".git",".venv",".state","__pycache__"}
hits=[];scanned=0
for directory,folders,files in os.walk(ROOT):
 folders[:]=[f for f in folders if f not in excluded]
 for name in files:
  item=Path(directory)/name
  if item.suffix.lower() in {".png",".jpg",".nc",".grib",".grib2",".woff",".woff2",".ttf",".otf",".mp4"}:continue
  if item.name=="model-api.key":
   hits.append({"file":str(item.relative_to(ROOT)),"reason":"credential file must not be submitted"});continue
  if item.stat().st_size>64*1024*1024:continue
  def check(body,entry=None):
   global scanned
   scanned+=1
   if any(p.search(body) for p in patterns):hits.append({"file":str(item.relative_to(ROOT)),"entry":entry})
  try:
   if item.suffix.lower() in {".jar",".zip"}:
    with zipfile.ZipFile(item) as z:
     for e in z.infolist():
      if not e.is_dir() and e.file_size<32*1024*1024:check(z.read(e),e.filename)
   else:check(item.read_bytes())
  except (OSError,zipfile.BadZipFile):continue
report={"at":datetime.now(timezone.utc).isoformat(),"method":"credential-pattern scan; no external credentials read", "passed":not hits,"scannedEntries":scanned,"hits":hits,"excludedDirectories":sorted(excluded)}
output=ROOT/"evidence/submission/secret-scan.json";output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps({"passed":not hits,"scannedEntries":scanned,"hitCount":len(hits)}))
raise SystemExit(0 if not hits else 1)
