"""Rebuild actual UI-downloaded source ZIP without its dist; start/exported runtime and analyze real data."""
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,os,shutil,subprocess,time,urllib.request,uuid,zipfile
ROOT=Path(__file__).resolve().parents[2]
ID="69fa5fd7-98c1-4c3d-808c-28fcde85d647"
ARCHIVE=ROOT/"evidence/submission/generated-app-source.zip"
with urllib.request.urlopen("http://127.0.0.1:18180/api/wb/generation/"+ID+"/export",timeout=30) as response:
 ARCHIVE.parent.mkdir(parents=True,exist_ok=True);ARCHIVE.write_bytes(response.read())
RUN=ROOT/"runtime"/("export-rebuild-"+uuid.uuid4().hex)
RUN.mkdir()
report={"startedAt":datetime.now(timezone.utc).isoformat(),"archiveSha256":hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),"generationId":ID,"realHttp":True,"mocked":False,"modelCalls":0,"originalTaskModified":False,"excludedPrebuiltDist":True}
proc=None
try:
 with zipfile.ZipFile(ARCHIVE) as archive:
  for entry in archive.infolist():
   name=entry.filename;target=(RUN/name).resolve()
   if not target.is_relative_to(RUN.resolve()):raise ValueError("Unsafe exported archive path")
   if name.startswith("dist/") or entry.is_dir():continue
   target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read(entry))
 assert not (RUN/"dist").exists()
 env={k:v for k,v in os.environ.items() if k.upper() in {"PATH","SYSTEMROOT","WINDIR","TEMP","TMP","USERPROFILE","APPDATA","LOCALAPPDATA"}}
 build=subprocess.run([shutil.which("node"),str(RUN/"tools/build.cjs"),str(RUN),str(ROOT/"frontend")],env=env,capture_output=True,text=True,encoding="utf-8",timeout=90,creationflags=subprocess.CREATE_NO_WINDOW if os.name=="nt" else 0)
 (RUN/"build.log").write_text(build.stdout+build.stderr,encoding="utf-8");assert build.returncode==0, "Exported source build failed"
 report["buildExitCode"]=build.returncode;report["builtFiles"]=[str(p.relative_to(RUN)) for p in (RUN/"dist").rglob("*") if p.is_file()]
 proc=subprocess.Popen([shutil.which("node"),str(RUN/"tools/runtime-server.mjs"),str(RUN),"http://127.0.0.1:18180",ID],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding="utf-8",env=env,creationflags=subprocess.CREATE_NO_WINDOW if os.name=="nt" else 0)
 # The fixed runtime reports its actual bound ephemeral port as its first stdout line.
 import concurrent.futures
 with concurrent.futures.ThreadPoolExecutor(max_workers=1) as reader:
  line=reader.submit(proc.stdout.readline).result(timeout=15)
 port=json.loads(line)["port"];base="http://127.0.0.1:"+str(port)
 with urllib.request.urlopen(base+"/health",timeout=10) as r:assert json.load(r)["generationId"]==ID
 with urllib.request.urlopen(base,timeout=10) as r:assert r.status==200 and b'id="app"' in r.read()
 request=urllib.request.Request(base+"/runtime/analysis",json.dumps({"datasetId":"dbs-ef1e48d6cf40","heightMin":127,"heightMax":500,"threshold":10,"rejectInvalidDirection":True}).encode(),{"Content-Type":"application/json"})
 with urllib.request.urlopen(request,timeout=20) as r:payload=json.load(r)
 assert payload["code"]==200 and payload["data"]["summary"]["validCount"]==3857
 report.update({"healthPassed":True,"pageStatus":200,"summary":payload["data"]["summary"],"passed":True})
finally:
 if proc:
  proc.terminate()
  try:proc.wait(timeout=5)
  except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
 report["runtimeExited"]=proc is None or proc.poll() is not None
 report["finishedAt"]=datetime.now(timezone.utc).isoformat();report["rebuildDirectory"]=str(RUN.relative_to(ROOT))
 (ROOT/"tests/integration/evidence/export-rebuild.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps({k:report.get(k) for k in ("passed","buildExitCode","pageStatus","runtimeExited")}))
