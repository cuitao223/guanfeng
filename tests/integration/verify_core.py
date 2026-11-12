#!/usr/bin/env python3
"""Core HTTP acceptance checks for the GuanFeng workbench.

This script talks to a live server. It never mocks HTTP responses and never
prints or persists session tokens. Session/project/plugin mutation checks are
opt-in with --sessions because the server must first be restarted with safe
application logging. If another editor already exists, supply
GUANFENG_TEST_EDITOR_TOKEN (used only to issue an invite) or a fresh
GUANFENG_TEST_EDITOR_INVITE in the environment. Neither is logged or saved.

Examples (run from the repository root):
  python guanfeng/tests/integration/verify_core.py --base http://127.0.0.1:18180
  python guanfeng/tests/integration/verify_core.py --base http://127.0.0.1:18180 --sessions
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
from pathlib import Path
import re
import sys
import tempfile
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
RADAR_ROOT = ROOT / "data" / "radar"
EVIDENCE = ROOT / "tests" / "integration" / "evidence" / "core-http.json"
PUBLIC_MANIFEST = ROOT / "data" / "public" / "manifest.json"
MISSING = 999.0


class CheckFailure(RuntimeError):
    pass


@dataclass
class Check:
    name: str
    status: str
    detail: dict[str, Any]


class Reporter:
    def __init__(self, base: str):
        self.base = base.rstrip("/")
        self.checks: list[Check] = []
        self.http: list[dict[str, Any]] = []
        self.runtime_files: list[str] = []
        self._editor_token: str | None = None
        self._owned_sessions: list[str] = []

    def record(self, name: str, status: str, **detail: Any) -> None:
        self.checks.append(Check(name, status, detail))
        marker = "PASS" if status == "passed" else "FAIL" if status == "failed" else "SKIP"
        print(f"[{marker}] {name}: {detail.get('message', '')}")

    def request(self, method: str, path: str, body: Any = None,
                headers: dict[str, str] | None = None, expected: set[int] | None = None) -> tuple[int, Any, str]:
        url = self.base + path
        data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
        request_headers = {"Accept": "application/json"}
        if data is not None:
            request_headers["Content-Type"] = "application/json"
        if headers:
            request_headers.update(headers)
        request = urllib.request.Request(url, data=data, headers=request_headers, method=method)
        status = 0
        raw = b""
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                status = response.status
                raw = response.read(5 * 1024 * 1024)
        except urllib.error.HTTPError as error:
            status = error.code
            raw = error.read(5 * 1024 * 1024)
        except urllib.error.URLError as error:
            raise ConnectionError(f"server unreachable at {self.base}: {error.reason}") from error
        text = raw.decode("utf-8", errors="replace")
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            payload = {"_raw": text[:1000]}
        # Only sessions actually created through this reporter belong to the test.
        # A sponsor token supplied via the environment never enters this list.
        if method == "POST" and path == "/api/wb/session" and isinstance(payload, dict) and payload.get("code") == 200:
            created = payload.get("data")
            token = created.get("token") if isinstance(created, dict) else None
            if isinstance(token, str) and token:
                self._owned_sessions.append(token)
        # Do not retain request/response headers or bodies that could contain tokens.
        self.http.append({"method": method, "path": path, "status": status,
                          "responseCode": payload.get("code") if isinstance(payload, dict) else None})
        if expected is not None and status not in expected:
            raise CheckFailure(f"{method} {path}: HTTP {status}, expected {sorted(expected)}")
        return status, payload, text

    @staticmethod
    def data(payload: Any) -> Any:
        if not isinstance(payload, dict) or payload.get("code") != 200:
            raise CheckFailure(f"API envelope is not successful: {safe_json(payload)}")
        return payload.get("data")

    def cleanup_sessions(self) -> None:
        count = 0
        for token in list(reversed(self._owned_sessions)):
            try:
                _, payload, _ = self.request("POST", "/api/wb/session/leave",
                                             headers={"X-Session": token}, expected={200})
                data = payload.get("data")
                if payload.get("code") != 200 or not isinstance(data, dict) or data.get("left") is not True:
                    raise CheckFailure("server did not confirm leaving the test-owned session")
                self._owned_sessions.remove(token)
                if self._editor_token == token:
                    self._editor_token = None
                count += 1
            except Exception:
                # Never print or serialize a token, request header or session payload.
                self.record("session-cleanup", "failed", message="could not revoke a test-owned session")
        if count:
            self.record("session-cleanup", "passed", left=count,
                        message="test-owned sessions revoked; environment sponsor session preserved")

    def save(self, connection_error: str | None = None) -> None:
        EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
        report = {
            "schemaVersion": 1,
            "verifiedAt": datetime.now().astimezone().isoformat(),
            "base": self.base,
            "realHttp": True,
            "mocked": False,
            "connectionError": connection_error,
            "checks": [{"name": c.name, "status": c.status, **c.detail} for c in self.checks],
            "http": self.http,
            "runtimeArtifacts": self.runtime_files,
            "security": {"sessionTokensPersisted": False, "keysRead": False,
                         "requestBodiesPersisted": False, "responseBodiesPersisted": False},
        }
        text = json.dumps(report, ensure_ascii=False, indent=2)
        if re.search(r"(?i)(session|bearer|token|api.?key|secret|password)\s*[:=]\s*[A-Za-z0-9._-]{12,}", text):
            raise RuntimeError("refusing to write evidence containing a possible secret")
        EVIDENCE.write_text(text + "\n", encoding="utf-8")
        print(f"Evidence: {EVIDENCE}")


def safe_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))[:1000]


def finite(value: Any) -> bool:
    return isinstance(value, (int, float)) and math.isfinite(float(value))


def is_missing(value: Any) -> bool:
    return not finite(value) or float(value) == MISSING or float(value) <= -999


def independent_dbs_expectation(path: Path, low: float, high: float, threshold: float) -> dict[str, Any]:
    """Independent CSV calculation matching the documented HTTP quality rules."""
    with path.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if not reader.fieldnames:
            raise CheckFailure(f"empty CSV header: {path.name}")
        speed_columns: dict[float, str] = {}
        direction_columns: dict[float, str] = {}
        for name in reader.fieldnames:
            match = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)m WindSpeed\s*$", name)
            if match:
                speed_columns[float(match.group(1))] = name
            match = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)m WindDirection\s*$", name)
            if match:
                direction_columns[float(match.group(1))] = name
        heights = sorted(set(speed_columns) & set(direction_columns))
        selected = [height for height in heights if low <= height <= high]
        if not selected:
            raise CheckFailure(f"no heights in {low}..{high} for {path.name}")
        total = valid = missing = exceed = 0
        total_value = 0.0
        maximum: float | None = None
        rows = 0
        for row in reader:
            if not (row.get("Date_time") or "").strip():
                continue
            rows += 1
            for height in selected:
                total += 1
                try:
                    speed = float((row.get(speed_columns[height]) or "").strip())
                    direction = float((row.get(direction_columns[height]) or "").strip())
                except (TypeError, ValueError):
                    missing += 1
                    continue
                # Java's valid() and analyze() rules: finite, not 999, > -999;
                # direction is additionally constrained to 0..360.
                if is_missing(speed) or is_missing(direction) or direction < 0 or direction > 360 or speed < 0:
                    missing += 1
                    continue
                valid += 1
                total_value += speed
                maximum = speed if maximum is None else max(maximum, speed)
                if speed > threshold:
                    exceed += 1
        if rows == 0:
            raise CheckFailure(f"no observation rows: {path.name}")
        return {"file": path.name, "heightMin": low, "heightMax": high,
                "heights": selected, "records": rows, "totalCount": total,
                "validCount": valid, "missingCount": missing, "exceedCount": exceed,
                "mean": total_value / valid if valid else None, "max": maximum}


def choose_dbs_dataset(datasets: list[dict[str, Any]]) -> tuple[dict[str, Any], Path]:
    candidates = [item for item in datasets if item.get("format") == "radar-dbs"]
    if not candidates:
        raise CheckFailure("HTTP dataset list has no radar-dbs dataset")
    for item in candidates:
        name = str(item.get("name", ""))
        matches = [p for p in RADAR_ROOT.glob("*.csv") if p.name == name]
        if matches:
            return item, matches[0]
    raise CheckFailure("HTTP radar-dbs metadata did not map to a local original CSV")


def assert_close(actual: Any, expected: Any, name: str, tolerance: float = 1e-9) -> None:
    if expected is None:
        if actual is not None:
            raise CheckFailure(f"{name}: expected null, got {actual}")
    elif not finite(actual) or abs(float(actual) - float(expected)) > tolerance:
        raise CheckFailure(f"{name}: expected {expected}, got {actual}")


def check_health(reporter: Reporter) -> None:
    status, payload, _ = reporter.request("GET", "/api/wb/health", expected={200})
    data = reporter.data(payload)
    if data.get("status") != "ok":
        raise CheckFailure(f"health status: {safe_json(data)}")
    reporter.record("health", "passed", httpStatus=status, message="live server reports status=ok")


def check_datasets_and_reads(reporter: Reporter) -> tuple[dict[str, Any], Path, list[dict[str, Any]]]:
    _, payload, _ = reporter.request("GET", "/api/wb/datasets", expected={200})
    datasets = reporter.data(payload)
    if not isinstance(datasets, list) or len(datasets) != 160:
        raise CheckFailure(f"expected 160 datasets, got {len(datasets) if isinstance(datasets, list) else type(datasets)}")
    formats = {item.get("format") for item in datasets}
    if not {"radar-dbs", "radar-ppi", "netcdf", "grib"}.issubset(formats):
        raise CheckFailure(f"missing required formats: {formats}")
    dbs, dbs_path = choose_dbs_dataset(datasets)
    if not dbs.get("id") or not dbs.get("name"):
        raise CheckFailure("DBS metadata has no stable id/name")
    selected_reads: dict[str, dict[str, Any]] = {}
    for format_name in ("radar-dbs", "radar-ppi", "netcdf", "grib"):
        candidates = [x for x in datasets if x.get("format") == format_name]
        if not candidates:
            raise CheckFailure(f"no HTTP dataset candidate for {format_name}")
        last_error = None
        for item in candidates:
            try:
                _, read_payload, _ = reporter.request("GET", f"/api/wb/datasets/{item['id']}", expected={200})
                read_data = reporter.data(read_payload)
                if not isinstance(read_data, dict) or not read_data.get("dataset"):
                    raise CheckFailure(f"empty read result for {format_name}")
                if format_name in {"netcdf", "grib"}:
                    grid = read_data.get("grid") or {}
                    values = grid.get("values")
                    if not grid.get("x") or not grid.get("y") or not values or not grid.get("unit"):
                        raise CheckFailure(f"incomplete public grid response for {format_name}")
                    if grid.get("sampling", {}).get("interpolated") is True:
                        raise CheckFailure(f"public grid unexpectedly claims interpolation: {format_name}")
                selected_reads[format_name] = {"id": item["id"], "name": item.get("name")}
                break
            except (CheckFailure, StopIteration) as error:
                last_error = str(error)
        else:
            raise CheckFailure(f"no decodable HTTP dataset for {format_name}: {last_error}")
    reporter.record("datasets-and-four-format-reads", "passed", count=len(datasets), formats=sorted(formats),
                    selectedReads=selected_reads, dbsId=dbs["id"], dbsFile=dbs["name"],
                    message="160 live datasets and all required formats decoded over HTTP")
    return dbs, dbs_path, datasets


def check_radar_analysis(reporter: Reporter, dbs: dict[str, Any], csv_path: Path) -> None:
    expected_default = independent_dbs_expectation(csv_path, 127, 500, 10)
    request = {"datasetId": dbs["id"], "heightMin": 127, "heightMax": 500,
               "threshold": 10, "rejectInvalidDirection": True}
    _, payload, _ = reporter.request("POST", "/api/wb/analysis", request, expected={200})
    result = reporter.data(payload)
    summary = result.get("summary") or {}
    for key in ("mean", "max", "validCount", "missingCount", "exceedCount"):
        actual = summary.get(key)
        expected = expected_default[key]
        assert_close(actual, expected, f"default analysis summary.{key}", 1e-8 if isinstance(expected, float) else 1e-9)
    if result.get("provenance", {}).get("file") != csv_path.name:
        raise CheckFailure("analysis provenance does not identify the source CSV")
    expected_three = independent_dbs_expectation(csv_path, 127, 156, 10)
    _, payload_three, _ = reporter.request("POST", "/api/wb/analysis",
        {"datasetId": dbs["id"], "heightMin": 127, "heightMax": 156, "threshold": 10}, expected={200})
    summary_three = (reporter.data(payload_three) or {}).get("summary") or {}
    for key in ("mean", "max", "validCount", "missingCount", "exceedCount"):
        assert_close(summary_three.get(key), expected_three[key], f"three-point summary.{key}", 1e-8 if isinstance(expected_three[key], float) else 1e-9)
    _, error_payload, _ = reporter.request("POST", "/api/wb/analysis",
        {"datasetId": dbs["id"], "heightMin": 80, "heightMax": 500, "threshold": 10}, expected={200})
    if error_payload.get("code") == 200:
        raise CheckFailure("80 m analysis unexpectedly succeeded")
    _, high_payload, _ = reporter.request("POST", "/api/wb/analysis",
        {"datasetId": dbs["id"], "heightMin": 127, "heightMax": 500, "threshold": 15}, expected={200})
    high = reporter.data(high_payload)
    high_summary = high.get("summary") or {}
    expected_high = independent_dbs_expectation(csv_path, 127, 500, 15)
    for key in ("mean", "max", "validCount", "missingCount", "exceedCount"):
        assert_close(high_summary.get(key), expected_high[key], f"threshold-15 summary.{key}", 1e-8 if isinstance(expected_high[key], float) else 1e-9)
    if summary.get("exceedCount") == high_summary.get("exceedCount"):
        raise CheckFailure("threshold change did not change exceedance count")
    reporter.record("independent-radar-analysis", "passed", sourceCsv=csv_path.name,
                    default=expected_default, threePoint=expected_three, threshold15=expected_high,
                    message="HTTP statistics match independent CSV calculation; 80 m rejected")


def workflow_payload(dataset_id: str, cycle: bool = False) -> dict[str, Any]:
    nodes = [
        {"id": "reader", "component": "reader", "version": "1.0.0", "params": {"datasetId": dataset_id}},
        {"id": "quality", "component": "quality", "version": "1.0.0", "params": {"heightMin": 127, "heightMax": 500}},
        {"id": "statistics", "component": "statistics", "version": "1.0.0", "params": {}},
        {"id": "events", "component": "events", "version": "1.0.0", "params": {"threshold": 10}},
        {"id": "chart", "component": "chart", "version": "1.0.0", "params": {}},
        {"id": "export", "component": "export", "version": "1.0.0", "params": {}},
    ]
    edges = [{"from": "reader", "to": "quality"}, {"from": "quality", "to": "statistics"},
             {"from": "statistics", "to": "events"}, {"from": "events", "to": "chart"},
             {"from": "events", "to": "export"}]
    if cycle:
        edges.append({"from": "chart", "to": "reader"})
    return {"nodes": nodes, "edges": edges}


def check_workflow(reporter: Reporter, dbs: dict[str, Any]) -> None:
    valid = workflow_payload(dbs["id"])
    _, payload, _ = reporter.request("POST", "/api/wb/workflow/validate", valid, expected={200})
    result = reporter.data(payload)
    if result.get("valid") is not True or len(result.get("order", [])) != 6:
        raise CheckFailure(f"valid workflow rejected: {safe_json(result)}")
    _, cycle_payload, _ = reporter.request("POST", "/api/wb/workflow/validate", workflow_payload(dbs["id"], True), expected={200})
    if cycle_payload.get("code") == 200:
        raise CheckFailure("cyclic workflow unexpectedly accepted")
    reporter.record("workflow-dag-and-cycle", "passed", order=result.get("order"),
                    message="valid branched DAG accepted and cycle rejected")


def create_plugin_manifests() -> tuple[Path, list[Path]]:
    plugin_dir = ROOT / "plugins"
    plugin_dir.mkdir(parents=True, exist_ok=True)
    stamp = f"httpverify-{os.getpid()}-{int(time.time())}"
    paths = [plugin_dir / f"{stamp}-v1.json", plugin_dir / f"{stamp}-v2.json"]
    base = {"id": stamp, "apiVersion": "1", "name": "HTTP verification plugin",
            "description": "Created only for live acceptance and removed afterward",
            "inputType": "analysis", "outputType": "analysis", "unit": "fraction"}
    manifests = [dict(base, version="1.0.0", expression="exceedCount / validCount"),
                 dict(base, version="2.0.0", expression="exceedCount / validCount * 100", unit="%")]
    for path, manifest in zip(paths, manifests):
        if path.exists():
            raise CheckFailure(f"refusing to overwrite existing plugin file: {path.name}")
        path.write_text(json.dumps(manifest, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    return plugin_dir, paths


def cleanup_plugin_manifests(paths: list[Path], reporter: Reporter, expected: dict[Path, bytes]) -> None:
    for path in paths:
        if not path.exists():
            continue
        try:
            if path.read_bytes() != expected[path]:
                reporter.record("plugin-cleanup", "failed", message=f"refusing to remove changed file {path.name}")
                continue
            path.unlink()
        except OSError as error:
            reporter.record("plugin-cleanup", "failed", message=f"cannot remove {path.name}: {error}")
    reporter.runtime_files.extend([str(path.relative_to(ROOT)) for path in paths])


def editor_session(reporter: Reporter) -> str:
    # Reuse the session created by this run, including between plugin/collab checks.
    if reporter._editor_token:
        return reporter._editor_token
    invite = os.environ.get("GUANFENG_TEST_EDITOR_INVITE", "").strip()
    sponsor = os.environ.get("GUANFENG_TEST_EDITOR_TOKEN", "").strip()
    if sponsor:
        _, payload, _ = reporter.request("POST", "/api/wb/projects/demo/invite", {"role": "editor"},
                                        headers={"X-Session": sponsor}, expected={200})
        if payload.get("code") != 200 or not isinstance(payload.get("data"), dict):
            raise CheckFailure("configured editor could not issue an invite; use a valid editor session")
        invite = payload["data"].get("invite")
        if not isinstance(invite, str) or not invite:
            raise CheckFailure("editor invite was not issued")
    body = {"name": "HTTP-plugin-collab", "role": "editor"}
    if invite:
        body["invite"] = invite
    _, payload, _ = reporter.request("POST", "/api/wb/session", body, expected={200})
    # Do not serialize the response: a successful session contains credentials.
    data = payload.get("data")
    if payload.get("code") != 200 or not isinstance(data, dict):
        raise CheckFailure("editor session creation failed; if an editor already exists, set "
                           "GUANFENG_TEST_EDITOR_TOKEN or GUANFENG_TEST_EDITOR_INVITE")
    token = data.get("token")
    if data.get("role") != "editor" or not isinstance(token, str) or not token:
        raise CheckFailure("server did not create an editor session")
    reporter._editor_token = token
    return token


def check_plugins(reporter: Reporter, dbs: dict[str, Any]) -> None:
    token = editor_session(reporter)
    headers = {"X-Session": token}
    _, payload, _ = reporter.request("GET", "/api/wb/projects/demo", headers=headers, expected={200})
    original = reporter.data(payload)
    # Deep copy before any test edits; restoration always uses optimistic revision checks.
    original_workflow = json.loads(json.dumps(original["workflow"]))
    original_title = original["title"]
    revision = int(original["revision"])
    owned_workflow: dict[str, Any] | None = None
    owned_revision: int | None = None
    _, paths = create_plugin_manifests()
    manifest_bytes = {path: path.read_bytes() for path in paths}
    plugin_id = json.loads(manifest_bytes[paths[0]])["id"]

    def save_workflow(workflow: dict[str, Any]) -> dict[str, Any]:
        nonlocal revision, owned_revision, owned_workflow
        # Keep the expected commit even if the HTTP response is lost after saving.
        owned_revision = revision + 1
        owned_workflow = json.loads(json.dumps(workflow))
        _, saved_payload, _ = reporter.request("PUT", "/api/wb/projects/demo",
            {"revision": revision, "workflow": workflow, "title": original_title},
            headers=headers, expected={200})
        saved = reporter.data(saved_payload)
        if (int(saved["revision"]) != owned_revision or saved["workflow"] != workflow
                or saved["title"] != original_title):
            raise CheckFailure("saved plugin workflow differs from the requested project")
        revision = int(saved["revision"])
        return saved

    def run_value(workflow: dict[str, Any], version: str) -> tuple[float, dict[str, Any], str]:
        _, payload, _ = reporter.request("POST", "/api/wb/workflow/run", workflow, expected={200})
        run = reporter.data(payload)
        if run.get("status") != "succeeded":
            raise CheckFailure(f"plugin {version} workflow failed: {safe_json(run)}")
        result = run.get("result", {})
        metric = result.get("pluginResults", {}).get(f"{plugin_id}@{version}", {})
        value = metric.get("value")
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise CheckFailure(f"plugin {version} has no finite numeric result")
        return float(value), result.get("summary", {}), run["id"]

    def disable(version: str) -> Any:
        _, payload, _ = reporter.request("POST", "/api/wb/plugins/state",
            {"id": plugin_id, "version": version, "enabled": False}, expected={200})
        return payload

    try:
        _, reload_payload, _ = reporter.request("POST", "/api/wb/plugins/reload", expected={200})
        if reporter.data(reload_payload).get("loaded", 0) < 8:
            raise CheckFailure("reload did not load built-ins and both test plugin versions")
        _, components_payload, _ = reporter.request("GET", "/api/wb/components", expected={200})
        components = reporter.data(components_payload)
        versions = {item.get("version") for item in components if item.get("id") == plugin_id}
        if versions != {"1.0.0", "2.0.0"}:
            raise CheckFailure(f"fixed plugin versions absent: {versions}")
        v1 = workflow_payload(dbs["id"])
        v1["nodes"].append({"id": "ratio", "component": plugin_id, "version": "1.0.0", "params": {}})
        v1["edges"].append({"from": "events", "to": "ratio"})
        save_workflow(v1)
        _, saved_payload, _ = reporter.request("GET", "/api/wb/projects/demo", headers=headers, expected={200})
        saved = reporter.data(saved_payload)
        if saved["workflow"] != v1 or int(saved["revision"]) != revision:
            raise CheckFailure("project did not retain the pinned v1 workflow")
        rejected = disable("1.0.0")
        if rejected.get("code") != 400 or "referenced" not in rejected.get("msg", "").lower():
            raise CheckFailure("saved project v1 reference did not specifically reject disabling")
        hidden = paths[0].with_suffix(".json.hidden")
        if hidden.exists():
            raise CheckFailure("refusing to overwrite a pre-existing hidden plugin manifest")
        paths[0].rename(hidden)
        try:
            _, removal_payload, _ = reporter.request("POST", "/api/wb/plugins/reload", expected={200})
            if removal_payload.get("code") != 400 or "referenced" not in removal_payload.get("msg", "").lower():
                raise CheckFailure("removing a referenced manifest did not reject reload")
            _, retained_payload, _ = reporter.request("GET", "/api/wb/components", expected={200})
            if not any(c.get("id") == plugin_id and c.get("version") == "1.0.0" for c in reporter.data(retained_payload)):
                raise CheckFailure("rejected reload did not retain the previous registered component")
        finally:
            if hidden.exists() and not paths[0].exists():
                hidden.rename(paths[0])
        _, restored_payload, _ = reporter.request("POST", "/api/wb/plugins/reload", expected={200})
        reporter.data(restored_payload)
        v1_value, summary, v1_run = run_value(saved["workflow"], "1.0.0")
        v2 = json.loads(json.dumps(v1))
        next(node for node in v2["nodes"] if node["id"] == "ratio")["version"] = "2.0.0"
        v2_value, v2_summary, v2_run = run_value(v2, "2.0.0")
        count, exceed = summary.get("validCount", 0), summary.get("exceedCount", 0)
        if count <= 0 or exceed <= 0 or summary != v2_summary:
            raise CheckFailure("version comparison needs identical real data with nonzero exceedances")
        if not math.isclose(v1_value, exceed / count, rel_tol=1e-12, abs_tol=1e-12):
            raise CheckFailure("v1 result does not match real exceedCount / validCount")
        if not math.isclose(v2_value, 100 * v1_value, rel_tol=1e-12, abs_tol=1e-12):
            raise CheckFailure("v2 result is not 100 times the actual v1 result")
        # A saved v1 reference remains protected after both versions have executed.
        rejected = disable("1.0.0")
        if rejected.get("code") != 400 or "referenced" not in rejected.get("msg", "").lower():
            raise CheckFailure("running versioned workflows lost saved-project reference protection")
        save_workflow(original_workflow)
        for version in ("1.0.0", "2.0.0"):
            if reporter.data(disable(version)).get("enabled") is not False:
                raise CheckFailure(f"previously executed {version} cannot be disabled after removing reference")
        _, reload_payload, _ = reporter.request("POST", "/api/wb/plugins/reload", expected={200})
        reporter.data(reload_payload)
        _, payload, _ = reporter.request("GET", "/api/wb/components", expected={200})
        disabled = {item["version"]: item.get("enabled") for item in reporter.data(payload)
                    if item.get("id") == plugin_id}
        if disabled != {"1.0.0": False, "2.0.0": False}:
            raise CheckFailure("disabled version states did not survive registry reload")
        for version, workflow in (("1.0.0", v1), ("2.0.0", v2)):
            _, payload, _ = reporter.request("POST", "/api/wb/workflow/validate", workflow, expected={200})
            if payload.get("code") != 400:
                raise CheckFailure(f"disabled version {version} unexpectedly remains usable")
        reporter.record("plugin-hot-load-versioned-disable", "passed", pluginId=plugin_id,
                        versions=sorted(versions), v1Value=v1_value, v2Value=v2_value,
                        v1Run=v1_run, v2Run=v2_run,
                        message="saved v1 reference rejected disable and manifest removal reload; restored manifest; real v1/v2 values match 100x; "
                                "removed reference and disabled both previously run versions")
    finally:
        # Restore only our own revision; never overwrite another editor's changes.
        removable = False
        try:
            _, payload, _ = reporter.request("GET", "/api/wb/projects/demo", headers=headers, expected={200})
            current = reporter.data(payload)
            if current["workflow"] != original_workflow or current["title"] != original_title:
                if (int(current["revision"]) != owned_revision or current["workflow"] != owned_workflow
                        or current["title"] != original_title):
                    raise CheckFailure("project changed concurrently; retained current project and test manifests")
                _, payload, _ = reporter.request("PUT", "/api/wb/projects/demo",
                    {"revision": current["revision"], "workflow": original_workflow, "title": original_title},
                    headers=headers, expected={200})
                restored = reporter.data(payload)
                if restored["workflow"] != original_workflow or restored["title"] != original_title:
                    raise CheckFailure("project restoration did not preserve original workflow/title")
            removable = True
        except Exception as error:
            reporter.record("plugin-project-restore", "failed", message=str(error))
        if removable:
            cleanup_plugin_manifests(paths, reporter, manifest_bytes)
            try:
                _, payload, _ = reporter.request("POST", "/api/wb/plugins/reload", expected={200})
                reporter.data(payload)
            except Exception as error:
                reporter.record("plugin-cleanup-reload", "failed", message=str(error))
        else:
            reporter.runtime_files.extend(str(path.relative_to(ROOT)) for path in paths)


def session_json(payload: Any) -> dict[str, Any]:
    data = payload if isinstance(payload, dict) else {}
    token = data.get("token")
    if token:
        raise CheckFailure("session token reached an in-memory result serializer")
    return data


def check_projects(reporter: Reporter, dbs: dict[str, Any]) -> None:
    # Tokens live only in local variables and are never put in evidence or logs.
    a_token = editor_session(reporter)
    _, invite_payload, _ = reporter.request("POST", "/api/wb/projects/demo/invite", {"role": "editor"},
        headers={"X-Session": a_token}, expected={200})
    invite_data = reporter.data(invite_payload)
    invite = invite_data.get("invite")
    if not isinstance(invite, str) or not invite:
        raise CheckFailure("editor invite was not created")
    _, b_payload, _ = reporter.request("POST", "/api/wb/session", {"name": "HTTP-B", "role": "editor", "invite": invite}, expected={200})
    b_data = reporter.data(b_payload)
    b_token = b_data.get("token")
    _, viewer_payload, _ = reporter.request("POST", "/api/wb/session", {"name": "HTTP-V", "role": "viewer"}, expected={200})
    viewer = reporter.data(viewer_payload).get("token")
    if not isinstance(b_token, str) or not isinstance(viewer, str):
        raise CheckFailure("collaboration sessions were not created")
    _, initial_payload, _ = reporter.request("GET", "/api/wb/projects/demo", headers={"X-Session": a_token}, expected={200})
    initial = reporter.data(initial_payload)
    revision = int(initial["revision"])
    workflow = initial["workflow"]
    updated_workflow = json.loads(json.dumps(workflow))
    _, update_payload, _ = reporter.request("PUT", "/api/wb/projects/demo",
        {"revision": revision, "workflow": updated_workflow, "title": "HTTP verification temporary title"},
        headers={"X-Session": a_token}, expected={200})
    updated = reporter.data(update_payload)
    new_revision = int(updated["revision"])
    try:
        _, shared_payload, _ = reporter.request("GET", "/api/wb/projects/demo", headers={"X-Session": b_token}, expected={200})
        if int(reporter.data(shared_payload)["revision"]) != new_revision:
            raise CheckFailure("second editor did not observe shared revision")
        _, conflict_payload, _ = reporter.request("PUT", "/api/wb/projects/demo",
            {"revision": revision, "workflow": workflow}, headers={"X-Session": b_token}, expected={200})
        if conflict_payload.get("code") != 409:
            raise CheckFailure("stale editor update did not return revision conflict 409")
        _, viewer_update, _ = reporter.request("PUT", "/api/wb/projects/demo",
            {"revision": new_revision, "workflow": workflow}, headers={"X-Session": viewer}, expected={200})
        if viewer_update.get("code") != 400:
            raise CheckFailure("viewer update unexpectedly succeeded")
        _, diff_payload, _ = reporter.request("GET", f"/api/wb/projects/demo/diff?from={revision}&to={new_revision}",
            headers={"X-Session": b_token}, expected={200})
        if not (reporter.data(diff_payload) or {}).get("changes"):
            raise CheckFailure("project diff has no changes")
        _, rollback_payload, _ = reporter.request("POST", "/api/wb/projects/demo/rollback",
            {"revision": new_revision, "targetRevision": revision}, headers={"X-Session": a_token}, expected={200})
        restored = reporter.data(rollback_payload)
        if int(restored["revision"]) != new_revision + 1:
            raise CheckFailure("rollback did not create a new revision")
        reporter.record("two-editor-project-collaboration", "passed", initialRevision=revision,
                        updatedRevision=new_revision, rollbackRevision=restored["revision"],
                        message="invite, viewer denial, stale 409, shared read, diff and rollback passed")
    finally:
        try:
            _, payload, _ = reporter.request("GET", "/api/wb/projects/demo",
                                            headers={"X-Session": a_token}, expected={200})
            current = reporter.data(payload)
            if current["workflow"] != workflow or current["title"] != initial["title"]:
                if (int(current["revision"]) != new_revision or current["workflow"] != updated_workflow
                        or current["title"] != "HTTP verification temporary title"):
                    raise CheckFailure("collaboration cleanup refused to overwrite a concurrent project edit")
                _, payload, _ = reporter.request("PUT", "/api/wb/projects/demo",
                    {"revision": current["revision"], "workflow": workflow, "title": initial["title"]},
                    headers={"X-Session": a_token}, expected={200})
                restored = reporter.data(payload)
                if restored["workflow"] != workflow or restored["title"] != initial["title"]:
                    raise CheckFailure("collaboration cleanup did not restore original project")
        except Exception as error:
            reporter.record("collaboration-project-restore", "failed", message=str(error))


def run(base: str, sessions: bool) -> int:
    reporter = Reporter(base)
    connection_error = None
    try:
        check_health(reporter)
        dbs, csv_path, datasets = check_datasets_and_reads(reporter)
        check_radar_analysis(reporter, dbs, csv_path)
        check_workflow(reporter, dbs)
        if sessions:
            check_plugins(reporter, dbs)
            check_projects(reporter, dbs)
        else:
            reporter.record("plugin-and-project-mutations", "skipped",
                            message="not run until server logging is confirmed safe; rerun with --sessions")
    except ConnectionError as error:
        connection_error = str(error)
        reporter.record("connection", "blocked", message=connection_error)
    except Exception as error:
        reporter.record("core-http", "failed", message=str(error), errorType=type(error).__name__)
    finally:
        reporter.cleanup_sessions()
        reporter.save(connection_error=connection_error)
    if connection_error is not None:
        return 2
    return 0 if all(c.status in {"passed", "skipped"} for c in reporter.checks) else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://127.0.0.1:18180")
    parser.add_argument("--sessions", action="store_true", help="run plugin/project/session mutations after safe server restart")
    args = parser.parse_args()
    return run(args.base, args.sessions)


if __name__ == "__main__":
    raise SystemExit(main())
