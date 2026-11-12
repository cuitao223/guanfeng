"""Download a bounded NOAA GFS snapshot and normalize GRIB vectors for 3D layers."""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import requests
import numpy as np
import eccodes as ec
ROOT = Path(__file__).resolve().parents[1]
PRESSURES = [925, 850, 700, 500]

def decode(path):
    fields = {}
    valid_time = None
    with path.open('rb') as stream:
        while (handle := ec.codes_grib_new_from_file(stream)) is not None:
            try:
                name, pressure = ec.codes_get(handle, 'shortName'), ec.codes_get(handle, 'level')
                if name not in ('u', 'v', 'gh') or pressure not in PRESSURES:
                    continue
                lats = ec.codes_get_array(handle, 'latitudes')
                lons = ec.codes_get_array(handle, 'longitudes')
                order = np.lexsort((lons, -lats))
                values = ec.codes_get_values(handle)[order]
                if not np.all(np.isfinite(values)) or np.any(np.abs(values) > 1e6):
                    raise ValueError('Missing or invalid source field; no synthetic replacement allowed')
                fields[(pressure, name)] = values
                valid_time = datetime.strptime(str(ec.codes_get(handle, 'validityDate')) + f"{ec.codes_get(handle, 'validityTime'):04d}", '%Y%m%d%H%M').replace(tzinfo=timezone.utc).isoformat()
                nx, ny = ec.codes_get(handle, 'Ni'), ec.codes_get(handle, 'Nj')
                sorted_lats, sorted_lons = lats[order], lons[order]
            finally:
                ec.codes_release(handle)
    if len(fields) != 12:
        raise ValueError(f'Expected 12 pressure/variable fields, got {len(fields)}')
    header = dict(nx=nx, ny=ny, lo1=float(sorted_lons.min()), la1=float(sorted_lats.max()), lo2=float(sorted_lons.max()), la2=float(sorted_lats.min()), dx=0.25, dy=0.25)
    levels = []
    for pressure in PRESSURES:
        u, v, gh = (fields[(pressure, name)] for name in ('u', 'v', 'gh'))
        speeds = np.hypot(u, v)
        directions = (np.degrees(np.arctan2(-u, -v)) + 360) % 360
        levels.append(dict(pressure=pressure, height=round(float(gh.mean()), 2), heightMin=round(float(gh.min()), 2), heightMax=round(float(gh.max()), 2), header=header, u=u.tolist(), v=v.tolist(), geopotentialHeights=gh.tolist(), speeds=speeds.tolist(), dirs=directions.tolist(), speedMin=float(speeds.min()), speedMax=float(speeds.max()), speedMean=float(speeds.mean())))
    return dict(validTime=valid_time, levels=levels)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', default='20261111')
    parser.add_argument('--cycle', default='12', choices=['00','06','12','18'])
    parser.add_argument('--offline', action='store_true')
    args = parser.parse_args()
    folder = ROOT/'data/public/gfs-wind'
    folder.mkdir(parents=True, exist_ok=True)
    sources, frames = [], []
    for hour in [0, 3, 6]:
        name = f'gfs-{args.date}-{args.cycle}-f{hour:03d}.grib2'
        path = folder/name
        params = {'file':f'gfs.t{args.cycle}z.pgrb2.0p25.f{hour:03d}', 'dir':f'/gfs.{args.date}/{args.cycle}/atmos', 'subregion':'', 'leftlon':112, 'rightlon':120, 'toplat':36, 'bottomlat':28, 'var_UGRD':'on', 'var_VGRD':'on', 'var_HGT':'on'}
        for pressure in PRESSURES:
            params[f'lev_{pressure}_mb'] = 'on'
        request = requests.Request('GET', 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_0p25.pl', params=params).prepare()
        if not path.exists():
            if args.offline:
                raise FileNotFoundError(path)
            response = requests.get(request.url, timeout=90)
            response.raise_for_status()
            if not response.content.startswith(b'GRIB'):
                raise ValueError('NOAA did not return GRIB data')
            path.write_bytes(response.content)
        frame = decode(path)
        frame['forecastHour'] = hour
        frames.append(frame)
        sources.append(dict(file=name, url=request.url, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), bytes=path.stat().st_size))
        print(name, frame['validTime'], len(frame['levels']), flush=True)
    data = dict(id=f'gfs-{args.date}-{args.cycle}-china-wind', source='NOAA/NCEP GFS 0.25 degree', kind='numerical weather prediction snapshot', cycle=f'{args.date[:4]}-{args.date[4:6]}-{args.date[6:]}T{args.cycle}:00:00+00:00', bounds=dict(west=112,east=120,south=28,north=36), pressureLevels=PRESSURES, frames=frames)
    output = ROOT/'frontend/src/data/gfs-wind.json'
    output.write_text(json.dumps(data, separators=(',',':'), allow_nan=False), encoding='utf-8')
    manifest = dict(source=data['source'], cycle=data['cycle'], preparedAt=datetime.now(timezone.utc).isoformat(), bounds=data['bounds'], sourceCoordinates='WGS84', grid='33x33, 0.25 degree, north-to-south rows', windUnits='m/s', pressureUnits='hPa', heightUnits='geopotential metre (gpm), not height above ground', calculation='speed=hypot(u,v); meteorological wind-from direction=atan2(-u,-v); render flat layers at per-surface mean geopotential height; vertical exaggeration is visual only; no spatial wind interpolation in source export', dataKind='GFS analysis f000 and forecast f003/f006, not radar observations or live measurements', license='US NOAA public data; NOAA/NCEP attribution retained', files=sources, normalizedFile=str(output.relative_to(ROOT)).replace(chr(92),'/'), normalizedSha256=hashlib.sha256(output.read_bytes()).hexdigest())
    (folder/'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')

if __name__ == '__main__':
    main()
