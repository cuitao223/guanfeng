"""Live real-file checks independent of Java measurement parsing."""
import csv, io, json, math, urllib.request, urllib.parse
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[2]
BASE="http://127.0.0.1:18180"
def call(path, body=None):
    req=urllib.request.Request(BASE+path, data=None if body is None else json.dumps(body).encode(), headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req,timeout=120) as r: data=json.load(r)
    assert data["code"]==200, data.get("msg")
    return data["data"]
checks=[]
def record(name, **details):
    checks.append({"name":name,"passed":True,**details}); print("PASS",name)
items=call("/api/wb/datasets")
ppis=[d for d in items if d["format"]=="radar-ppi"]
# Audit every provided PPI file to avoid passing only one favorable sample.
count=0; points=0
for item in ppis:
    actual=call("/api/wb/datasets/"+item["id"])
    with (ROOT/"data/radar"/item["name"]).open(encoding="utf-8-sig",newline="") as f:
        rows=list(csv.DictReader(f))
    by_angle={}
    for row in rows: by_angle.setdefault(float(row["Azimuth"]),row)
    angles=sorted(by_angle)
    gates=sorted(float(k.split("m ")[0]) for k in rows[0] if k.endswith("m RadialWind(m/s)"))
    assert actual["angles"]==angles and actual["heightArr"]==gates
    for i,angle in enumerate(angles):
        for j,gate in enumerate(gates):
            raw=by_angle[angle][f"{gate:g}m RadialWind(m/s)"].strip()
            try: expected=float(raw)
            except ValueError: expected=999.0
            if not math.isfinite(expected): expected=999.0
            assert actual["values"][i][j]==expected, (item["id"],i,j)
            points+=1
    count+=1
record("all-organizer-ppi-values-match-independent-csv",files=count,points=points,coordinatesInvented=False,measurement="radial wind only")
for data_id in ("era5-temperature","goes16-c13"):
    flow={"nodes":[{"id":"read","component":"reader","version":"1.0.0","params":{"datasetId":data_id}}, {"id":"qc","component":"quality","version":"1.0.0","params":{}},{"id":"plot","component":"chart","version":"1.0.0","params":{}}],"edges":[{"from":"read","to":"qc"},{"from":"qc","to":"plot"}]}
    run=call("/api/wb/workflow/run",flow)
    assert run["status"]=="succeeded" and run["result"]["chartReady"] is True
    grid=run["result"]["grid"]
    assert len(grid["values"])>0 and grid["unit"]=="K"
    record("grid-workflow-"+data_id,runId=run["id"],unit=grid["unit"],rows=len(grid["values"]),columns=len(grid["x"]))
id=next(d["id"] for d in items if d["format"]=="radar-dbs")
for threshold in (10,15):
    params={"datasetId":id,"heightMin":127,"heightMax":500,"threshold":threshold}
    analysis=call("/api/wb/analysis",params)
    uri=BASE+"/api/wb/analysis/export?"+urllib.parse.urlencode({**params,"format":"csv"})
    with urllib.request.urlopen(uri,timeout=30) as response: text=response.read().decode("utf-8-sig")
    rows=list(csv.DictReader(io.StringIO(text)))
    assert len(rows)==len(analysis["events"])
    for row,event in zip(rows,analysis["events"]):
        assert row["start"]==event["start"] and row["end"]==event["end"]
        assert float(row["peak_m_per_s"])==event["peak"]
    record("dynamic-export-consistency-"+str(threshold),eventCount=len(rows),exceedCount=analysis["summary"]["exceedCount"])
report={"verifiedAt":datetime.now(timezone.utc).isoformat(),"realHttp":True,"mocked":False,"checks":checks,"passed":True}
out=ROOT/"tests/integration/evidence/scientific-http.json"
out.write_text(json.dumps(report,indent=2),encoding="utf-8")
print("Evidence:",out)
