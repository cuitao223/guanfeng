"""Download only pinned public samples (4 MiB/file); never overwrite mismatched data."""
from datetime import datetime, timezone, timedelta
import hashlib
import json
from pathlib import Path
import urllib.request

import numpy as np
import xarray as xr

ROOT = Path(__file__).resolve().parents[1] / "data" / "public"
LIMIT = 4 * 1024 * 1024
SPECS = [
    {
        "id": "era5-temperature", "name": "ECMWF ERA5 ensemble pressure-level sample",
        "file": "era5-levels-members.grib", "format": "grib", "kind": "grid",
        "source": "https://raw.githubusercontent.com/ecmwf/cfgrib/master/era5-levels-members.grib",
        "sourceDocumentation": "https://github.com/ecmwf/cfgrib",
        "sha256": "c144fde61ca5d53702bf6f212775ef2cc783bdd66b6865160bf597c1b35ed898",
        "variables": ["t", "z"], "defaultVariable": "t", "satellite": False,
        "license": {
            "data": "Copernicus ERA5: CC-BY-4.0, attribution required",
            "spdx": "CC-BY-4.0",
            "dataLicenseUrl": "https://cds.climate.copernicus.eu/datasets/reanalysis-era5-pressure-levels?tab=overview",
            "distribution": "ECMWF cfgrib repository: Apache-2.0",
            "distributionLicenseUrl": "https://github.com/ecmwf/cfgrib/blob/master/LICENSE",
            "attribution": "Contains Copernicus Climate Change Service information (2017). ERA5 sample distributed by ECMWF/cfgrib. Neither the European Commission nor ECMWF is responsible for its use."
        },
    },
    {
        "id": "goes16-c13", "name": "NOAA GOES-16 ABI C13 mesoscale brightness temperature",
        "file": "goes16-c13-m1-20240101T000028.nc", "format": "netcdf", "kind": "grid",
        "source": "https://noaa-goes16.s3.amazonaws.com/ABI-L2-CMIPM/2024/001/00/OR_ABI-L2-CMIPM1-M6C13_G16_s20240010000281_e20240010000350_c20240010000422.nc",
        "sourceDocumentation": "https://registry.opendata.aws/noaa-goes/",
        "sha256": "12f713d3740f70ae1d6474a3d46a8215993f8a44c59b9c20a95b9cad98bc49f7",
        "variables": ["CMI"], "defaultVariable": "CMI", "satellite": True,
        "license": {
            "data": "NOAA NODD open public data; attribution requested; no implied NOAA endorsement",
            "dataLicenseUrl": "https://registry.opendata.aws/noaa-goes/",
            "attribution": "NOAA/NESDIS GOES-16 ABI L2 Cloud and Moisture Imagery, accessed 2026-11-02 via NOAA NODD on AWS.",
            "embeddedAttribute": "Unclassified data.  Access is restricted to approved users only.",
            "embeddedAttributeNote": "Original file attribute retained verbatim. Official NODD catalog explicitly publishes these data as open to the public and usable as desired; access to this object is anonymous."
        },
    },
]


def utc_string(value):
    return str(np.datetime_as_string(np.datetime64(value, 's'), unit='s')) + 'Z'


def local_string(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(
        timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S')


def fetch(spec):
    target = ROOT / spec['file']
    if target.is_symlink():
        raise ValueError('Sample symlinks are forbidden')
    if target.exists():
        if target.stat().st_size > LIMIT:
            raise ValueError('Existing sample exceeds limit')
        content = target.read_bytes()
    else:
        with urllib.request.urlopen(spec['source'], timeout=60) as response:
            declared = response.headers.get('Content-Length')
            if declared and int(declared) > LIMIT:
                raise ValueError('Download exceeds 4 MiB limit')
            content = response.read(LIMIT + 1)
        if len(content) > LIMIT:
            raise ValueError('Download exceeds 4 MiB limit')
    if hashlib.sha256(content).hexdigest() != spec['sha256']:
        raise ValueError('SHA-256 mismatch; refusing to replace or accept data')
    if not target.exists():
        with target.open('xb') as stream:
            stream.write(content)
    item = dict(spec, bytes=len(content), verifiedAt=datetime.now(timezone.utc).isoformat(),
                downloadedAtUTC=datetime.fromtimestamp(target.stat().st_mtime, timezone.utc).isoformat(),
                retrieval={'transport': 'HTTPS', 'authentication': 'anonymous',
                           'maximumBytes': LIMIT, 'integrity': 'pinned SHA-256',
                           'downloadTimestampBasis': 'local file modification time from successful original download'})
    options = {'engine': 'cfgrib', 'backend_kwargs': {'indexpath': ''}, 'decode_timedelta': True} if spec['format'] == 'grib' else {'engine': 'netcdf4'}
    with xr.open_dataset(target, **options) as ds:
        if spec['format'] == 'grib':
            start, end = utc_string(ds.time.values[0]), utc_string(ds.time.values[-1])
            item['spatial'] = {'coordinateSystem': 'latitude_longitude', 'west': float(ds.longitude.min()),
                               'east': float(ds.longitude.max()), 'south': float(ds.latitude.min()),
                               'north': float(ds.latitude.max()), 'originalShape': [int(ds.sizes['latitude']), int(ds.sizes['longitude'])],
                               'gridResolutionDegrees': 3.0}
            item['availableSelections'] = {'timesUTC': [utc_string(t) for t in ds.time.values],
                                          'pressureLevelsHpa': ds.isobaricInhPa.values.tolist(),
                                          'ensembleMembers': ds.number.values.tolist()}
            item['defaultSelection'] = {'timeUTC': start, 'pressureHpa': 850, 'ensembleMember': 0}
            item['description'] = 'Real ERA5 GRIB1 sample on a 3-degree grid, read through cfgrib/ecCodes. The adapter selects the first time, ensemble member 0 and 850 hPa. This is an atmospheric reanalysis, not a surface wind measurement.'
        else:
            start, end = ds.attrs['time_coverage_start'], ds.attrs['time_coverage_end']
            extent = ds.geospatial_lat_lon_extent.attrs
            item['spatial'] = {'coordinateSystem': 'geostationary_fixed_grid',
                              'west': float(extent['geospatial_westbound_longitude']),
                              'east': float(extent['geospatial_eastbound_longitude']),
                              'south': float(extent['geospatial_southbound_latitude']),
                              'north': float(extent['geospatial_northbound_latitude']),
                              'xUnit': 'rad', 'yUnit': 'rad', 'originalShape': [int(ds.sizes['y']), int(ds.sizes['x'])],
                              'resolution': ds.attrs['spatial_resolution']}
            item['description'] = 'Real GOES-16 ABI L2 C13 infrared brightness temperature, not air temperature or a wind retrieval. NetCDF packed values are decoded with scale/offset and fill handling; only DQF==0 is kept. Native scan-angle coordinates are not longitude/latitude.'
        item.update(sourceTimeStart=start, sourceTimeEnd=end,
                    timeStart=local_string(start), timeEnd=local_string(end), timeZone='Asia/Shanghai')
        item['units'] = {v: str(ds[v].attrs.get('units', '1')) for v in spec['variables']}
        item['fusionPerformed'] = False
    return item


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    if any(p.is_symlink() or (hasattr(p, 'is_junction') and p.is_junction()) for p in (ROOT, *ROOT.parents)):
        raise ValueError('Linked data roots are forbidden')
    datasets = [fetch(spec) for spec in SPECS]
    payload = {'schemaVersion': 1, 'verifiedOn': '2026-11-02',
               'downloadLimitBytesPerFile': LIMIT, 'synthetic': False, 'datasets': datasets}
    manifest = ROOT / 'manifest.json'
    if manifest.is_symlink():
        raise ValueError('Manifest symlinks are forbidden')
    manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'datasets': [{k: d[k] for k in ('id', 'bytes', 'sha256')} for d in datasets]}))


if __name__ == '__main__':
    main()
