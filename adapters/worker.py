"""Bounded, offline JSON adapter for the two public meteorological samples.
Run: echo '{"op":"list"}' | python adapters/worker.py
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import sys
from typing import Any

import numpy as np
import xarray as xr

PUBLIC_ROOT = Path(__file__).resolve().parents[1] / "data" / "public"
MAX_FILE_BYTES = 4 * 1024 * 1024
MAX_REQUEST_BYTES = 16 * 1024
MAX_SIDE = 128
MISSING = 999
ALLOWED_IDS = {"era5-temperature", "goes16-c13"}


class AdapterError(ValueError):
    pass


def _public_path(filename: str, root: Path) -> Path:
    """Never accept a caller-supplied path or follow a sample symlink."""
    if not isinstance(filename, str) or not filename or Path(filename).name != filename:
        raise AdapterError("Invalid manifest filename")
    if any(c in filename for c in ("/", "\\", ":")) or filename in {".", ".."}:
        raise AdapterError("Invalid manifest filename")
    # Also reject a symlink/junction in the public root itself or its ancestors.
    if any(p.is_symlink() or (hasattr(p, "is_junction") and p.is_junction())
           for p in (root, *root.parents)):
        raise AdapterError("Linked data directories are not allowed")
    path = root / filename
    if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
        raise AdapterError("Dataset path escapes the public data directory")
    if not path.is_file():
        raise AdapterError("Public sample is absent; run adapters/fetch_public_data.py")
    return path


def _catalog(root: Path) -> dict[str, dict[str, Any]]:
    manifest = _public_path("manifest.json", root)
    if manifest.stat().st_size > 256 * 1024:
        raise AdapterError("Manifest exceeds size limit")
    data = json.loads(manifest.read_text(encoding="utf-8"))
    records = data.get("datasets", [])
    result = {}
    for item in records:
        identifier = item.get("id")
        if identifier not in ALLOWED_IDS or identifier in result:
            raise AdapterError("Invalid or duplicate manifest dataset id")
        result[identifier] = item
    if set(result) != ALLOWED_IDS:
        raise AdapterError("Incomplete public sample manifest")
    return result


def _verified_file(item: dict, root: Path) -> Path:
    path = _public_path(item["file"], root)
    size = path.stat().st_size
    if size > MAX_FILE_BYTES or size != item["bytes"]:
        raise AdapterError("Dataset size does not match manifest")
    if hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"]:
        raise AdapterError("Dataset SHA-256 does not match manifest")
    return path


def encode_values(values: Any, quality: Any = None) -> tuple[list, dict]:
    """Use decoded fill masks and the backend missing sentinels; retain valid zero."""
    masked = np.ma.asarray(values, dtype=np.float64)
    array = np.asarray(masked.filled(np.nan), dtype=np.float64)
    invalid = np.ma.getmaskarray(masked) | ~np.isfinite(array) | (array == MISSING) | (array <= -999)
    if quality is not None:
        q = np.ma.asarray(quality, dtype=np.float64).filled(np.nan)
        if q.shape != array.shape:
            raise AdapterError("Quality and measurement shapes differ")
        invalid |= ~np.isfinite(q) | (q != 0)
    finite = array[~invalid]
    summary = {
        "min": float(finite.min()) if finite.size else None,
        "max": float(finite.max()) if finite.size else None,
        "mean": float(finite.mean()) if finite.size else None,
        "validCount": int(finite.size),
        "missingCount": int(invalid.sum()),
        "totalCount": int(array.size),
        "missingValue": MISSING,
        "statisticsScope": "returned-grid",
    }
    return np.where(invalid, MISSING, array).tolist(), summary


def _stride(length: int) -> int:
    return max(1, math.ceil(length / MAX_SIDE))


def read_dataset(item: dict, path: Path, variable: str) -> dict:
    if not isinstance(variable, str) or variable not in item["variables"]:
        raise AdapterError("Unknown variable for dataset")
    if item["format"] == "grib":
        options = {"engine": "cfgrib", "backend_kwargs": {"indexpath": ""},
                   "decode_timedelta": True}
    else:
        options = {"engine": "netcdf4"}
    with xr.open_dataset(path, **options) as ds:
        if item["format"] == "grib":
            field = ds[variable].isel(number=0, time=0).sel(isobaricInhPa=850)
            y_name, x_name = "latitude", "longitude"
            selection = {"number": int(ds.number.values[0]), "isobaricInhPa": 850,
                         "timeUTC": str(ds.time.values[0])[:19] + "Z"}
            coords = {"xName": "longitude", "yName": "latitude",
                      "xUnit": "degrees_east", "yUnit": "degrees_north",
                      "gridMapping": {"grid_mapping_name": "latitude_longitude"}}
        else:
            field = ds[variable]
            y_name, x_name = "y", "x"
            selection = {"timeUTC": ds.attrs["time_coverage_start"], "band": 13,
                         "qualityRule": "DQF == 0 (good pixels only)"}
            coords = {"xName": "GOES fixed-grid scan angle x",
                      "yName": "GOES fixed-grid scan angle y", "xUnit": "rad", "yUnit": "rad",
                      "gridMapping": dict(ds.goes_imager_projection.attrs)}
        field = field.transpose(y_name, x_name)
        ys, xs = _stride(field.sizes[y_name]), _stride(field.sizes[x_name])
        indexer = {y_name: slice(None, None, ys), x_name: slice(None, None, xs)}
        selected = field.isel(indexer)
        quality = ds.DQF.isel(indexer).transpose(y_name, x_name).values if item["format"] == "netcdf" else None
        values, summary = encode_values(selected.values, quality)
        grid = {"x": selected[x_name].values.astype(float).tolist(),
                "y": selected[y_name].values.astype(float).tolist(),
                "values": values, "unit": str(field.attrs.get("units", "1")),
                "variable": variable, "missingValue": MISSING, **coords,
                "selection": selection,
                "sampling": {"method": "native-point-stride", "xStride": xs, "yStride": ys,
                             "originalShape": [field.sizes[y_name], field.sizes[x_name]],
                             "returnedShape": [len(values), len(values[0])],
                             "interpolated": False}}
    summary["fusionPerformed"] = False
    return {"dataset": item, "grid": grid, "summary": summary}


def dispatch(request: Any, root: Path | None = None) -> dict:
    root = PUBLIC_ROOT if root is None else Path(root)
    if not isinstance(request, dict):
        raise AdapterError("Request must be a JSON object")
    op = request.get("op")
    allowed = {"list": {"op"}, "read": {"op", "id", "variable"}}
    if not isinstance(op, str) or op not in allowed:
        raise AdapterError("Unknown operation; expected list or read")
    if set(request) - allowed[op]:
        raise AdapterError("Unsupported request fields; paths are not accepted")
    if op == "read":
        identifier = request.get("id")
        if not isinstance(identifier, str) or identifier not in ALLOWED_IDS:
            raise AdapterError("Unknown dataset id; paths are not accepted")
    catalog = _catalog(root)
    if op == "list":
        for item in catalog.values():
            _verified_file(item, root)
        return {"datasets": list(catalog.values())}
    item = catalog[request["id"]]
    path = _verified_file(item, root)
    return read_dataset(item, path, request.get("variable", item["defaultVariable"]))


def main() -> int:
    try:
        raw = sys.stdin.buffer.read(MAX_REQUEST_BYTES + 1)
        if len(raw) > MAX_REQUEST_BYTES:
            raise AdapterError("Request exceeds 16 KiB limit")
        result = dispatch(json.loads(raw.decode("utf-8-sig")))
    except (AdapterError, ValueError, KeyError, OSError, ImportError, RuntimeError) as exc:
        result = {"error": str(exc)}
        status = 1
    except Exception:
        # Keep the Java subprocess protocol intact even for backend decoder errors.
        result = {"error": "Dataset decoder failed"}
        status = 1
    else:
        status = 0
    sys.stdout.write(json.dumps(result, ensure_ascii=True, allow_nan=False))
    sys.stdout.write("\n")
    return status


if __name__ == "__main__":
    raise SystemExit(main())
