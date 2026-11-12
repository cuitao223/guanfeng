"""Real Java/model-connection failure with an isolated root and real observation data."""
import json, os, shutil, socket, subprocess, time, urllib.request, uuid
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[2]
PORT=18182
ID=os.environ.get("GUANFENG_TEST_GENERATION_ID","2d20db9d-5bfb-4260-83f8-e25ba89237f3")
BASE=f"http://127.0.0.1:{PORT}"
with socket.socket() as probe:
    probe.bind(("127.0.0.1",PORT))
# The proxy listener must be absent: this test proves a real connection error without sending a model request remotely.
with socket.socket() as proxy:
    proxy.bind(("127.0.0.1",18183))
run=ROOT/"runtime"/("outage-acceptance-"+uuid.uuid4().hex)
(run/"frontend").mkdir(parents=True)
(run/"data/radar").mkdir(parents=True)
(run/"generation-template").mkdir()
skill=run/".harness/backend/skills/guanfeng-generate"
skill.mkdir(parents=True)
shutil.copyfile(ROOT/".harness/backend/skills/guanfeng-generate/SKILL.md",skill/"SKILL.md")
radar=next(p for p in sorted((ROOT/"data/radar").glob("*DBS*.csv")))
shutil.copyfile(radar,run/"data/radar"/radar.name)
shutil.copyfile(ROOT/"generation-template/runtime-server.mjs",run/"generation-template/runtime-server.mjs")
shutil.copytree(ROOT/"runtime/generation"/ID,run/"runtime/generation"/ID)
java=json.loads((ROOT/".tools/environment.json").read_text(encoding="utf-8-sig"))["java"]
env=os.environ.copy()
env.update({"GUANFENG_ROOT":str(run),"RADAR_DATA_DIR":str(run/"data/radar"),"GUANFENG_KEY_FILE":str(ROOT.parent/"deepseek api key"),"RADAR_DEMO_PORT":str(PORT)})
kwargs={"creationflags":subprocess.CREATE_NO_WINDOW} if os.name=="nt" else {}
log=open(run/"backend-outage.log","wb")
proc=subprocess.Popen([java,"-Dhttps.proxyHost=127.0.0.1","-Dhttps.proxyPort=18183","-jar",str(ROOT/"backend/target/leice-radar-series-demo-0.1.0.jar")],cwd=run,env=env,stdout=log,stderr=subprocess.STDOUT,**kwargs)
def call(path,body=None):
    request=urllib.request.Request(BASE+path,data=None if body is None else json.dumps(body).encode(),headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(request,timeout=15) as response:return json.load(response)
report={"startedAt":datetime.now(timezone.utc).isoformat(),"isolatedRoot":str(run.relative_to(ROOT)),"realHttp":True,"mocked":False,"fault":"JVM HTTPS proxy points to confirmed unbound loopback port 18183; actual connection must fail","remoteModelPurchase":False}
try:
    deadline=time.monotonic()+45
    while True:
        try:
            health=call("/api/wb/health")
            if health["code"]==200:break
        except Exception:
            if proc.poll() is not None: raise RuntimeError("Isolated backend exited")
            if time.monotonic()>deadline:raise
            time.sleep(.5)
    task=call("/api/wb/generation",{"prompt":"Create an observation analysis app using real DBS data with editable threshold"})["data"]
    deadline=time.monotonic()+45
    while True:
        failed=call("/api/wb/generation/"+task["id"])["data"]
        if failed["status"] in {"ready","failed","interrupted"}:break
        if time.monotonic()>deadline:raise RuntimeError("Model connection failure did not terminate within 45 seconds")
        time.sleep(.4)
    assert failed["status"]=="failed" and failed["calls"],"No truthful failure"
    assert all(c["status"]=="failed" for c in failed["calls"]),"Unexpected remote success"
    assert any("connection" in c.get("error","").lower() for c in failed["calls"]),"Failure is not a connection error"
    report["failedGeneration"]={k:failed[k] for k in ("id","status","stages","calls","errors")}
    dep=call(f"/api/wb/generation/{ID}/deploy",{})["data"]
    assert dep["status"]=="running"
    request=urllib.request.Request(dep["url"]+"/runtime/analysis",data=json.dumps({"datasetId":"dbs-ef1e48d6cf40","heightMin":127,"heightMax":500,"threshold":10}).encode(),headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(request,timeout=15) as response: analysis=json.load(response)
    assert analysis["code"]==200 and analysis["data"]["summary"]["validCount"]==3857
    with urllib.request.urlopen(dep["url"],timeout=15) as response: assert response.status==200
    report["existingApplication"]={"generationId":ID,"deployed":True,"pageStatus":200,"summary":analysis["data"]["summary"]}
    stopped=call(f"/api/wb/generation/{ID}/stop",{})["data"]
    assert stopped["status"]=="stopped"
    report["passed"]=True
finally:
    try:call(f"/api/wb/generation/{ID}/stop",{})
    except Exception:pass
    proc.terminate()
    try:proc.wait(timeout=8)
    except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
    log.close()
    report["backendExited"]=proc.poll() is not None
    report["finishedAt"]=datetime.now(timezone.utc).isoformat()
    out=ROOT/"tests/integration/evidence/model-outage.json"
    out.write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps({"passed":report.get("passed",False),"backendExited":report["backendExited"],"evidence":str(out)}))
