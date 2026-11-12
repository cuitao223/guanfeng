"""Reproducible maintained-source size; not an originality or quality metric."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json
ROOT=Path(__file__).resolve().parents[1]
patterns={
 "java_backend":["backend/src/main/java/**/*.java"],
 "frontend_workbench":["frontend/src/views/workbench/*.vue"],
 "frontend_api":["frontend/src/api/workbench/*.js"],
 "scientific_adapter":["adapters/*.py"],
 "java_tests":["backend/src/test/java/**/*.java"],
 "python_tests":["tests/data/*.py","tests/integration/*.py"],
 "browser_tests":["tests/browser/*.cjs","tests/demo/*.cjs"],
 "generation_tools":["generation-template/*.cjs","generation-template/*.mjs"],
 "operation_scripts":["scripts/*.ps1","scripts/*.py","delivery/*.py"],
}
groups={}
for name,globs in patterns.items():
 paths=sorted({p for pattern in globs for p in ROOT.glob(pattern) if p.is_file()})
 entries=[]
 for p in paths:
  body=p.read_bytes();lines=body.decode("utf-8-sig").splitlines()
  origin="team-added-or-adapted"
  if p.name=="RadarSeriesDemoApplication.java":origin="organizer-entrypoint-reused"
  entries.append({"path":p.relative_to(ROOT).as_posix(),"lines":len(lines),"nonblank":sum(bool(v.strip()) for v in lines),"origin":origin,"sha256":hashlib.sha256(body).hexdigest()})
 groups[name]={"files":len(entries),"lines":sum(v["lines"] for v in entries),"nonblank":sum(v["nonblank"] for v in entries),"entries":entries}
report={"measuredAt":datetime.now(timezone.utc).isoformat(),"method":"UTF-8 maintained source, line and nonblank counts. Excludes generated apps, dependencies and original Harness. Size is not originality or quality.","groups":groups,"totalFiles":sum(g["files"] for g in groups.values()),"totalLines":sum(g["lines"] for g in groups.values())}
(ROOT/"evidence/source-statistics.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps({k:report[k] for k in ("measuredAt","totalFiles","totalLines")}))
