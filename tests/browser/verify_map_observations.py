"""Validate public METAR markers against archived NOAA rows and live browser output."""
import csv, gzip, hashlib, json, math
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'evidence/maps/observations'
OUT.mkdir(parents=True, exist_ok=True)
snapshot = json.loads((ROOT / 'frontend/src/data/metar-observations.json').read_text(encoding='utf-8'))
report = {'at': datetime.now(timezone.utc).isoformat(), 'checks': [], 'errors': []}
def check(name, passed, **details):
    report['checks'].append({'name': name, 'passed': bool(passed), **details})
    print(name, bool(passed), details, flush=True)
    assert passed, name
raw = ROOT / 'data/public/map-observations/metars.cache.csv.gz'
check('raw-source-hash', hashlib.sha256(raw.read_bytes()).hexdigest() == snapshot['source']['rawSha256'])
source_rows = list(csv.DictReader(gzip.decompress(raw.read_bytes()).decode('utf-8').splitlines()))
for o in snapshot['observations']:
    r = next(r for r in source_rows if r['station_id'] == o['id'] and r['observation_time'] == o['observedAt'])
    assert float(r['latitude']) == o['latitude'] and float(r['longitude']) == o['longitude']
    assert (float(r['temp_c']) if r['temp_c'] else None) == o['temperatureC']
    if r['wind_speed_kt']: assert math.isclose(float(r['wind_speed_kt']) * 1852/3600, o['windSpeedMs'])
    assert r['raw_text'] == o['rawMetar']
check('all-observations-match-original-noaa-rows', True, stations=len(snapshot['observations']))
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge',headless=True, args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
    page = browser.new_page(viewport={'width': 1600, 'height': 1000})
    page.on('pageerror', lambda e: report['errors'].append(e.stack))
    try:
        response=page.context.request.post('http://127.0.0.1:5274/api/wb/auth/login', data={'platform':'cloud','username':'creator','password':'Guanfeng2026!'})
        assert response.status == 200
        for route in ['developer/maps','developer/device-overview','developer/other-mode','developer/wind-3d']:
            page.goto('http://127.0.0.1:5274/' + route)
            page.wait_for_function('() => document.querySelectorAll(".weather-observation-marker").length === 39', timeout=30000)
            page.wait_for_timeout(1800)
            check(route + '-39-public-stations', page.locator('.weather-observation-marker').count()==39)
            controls=page.get_by_test_id('observation-controls')
            check(route + '-source-and-time-visible', 'METAR' in controls.inner_text() and '2026' in controls.inner_text())
            page.screenshot(path=str(OUT/(route.rsplit('/',1)[-1]+'-stations.png')), timeout=30000)
            marker=page.locator('.weather-observation-marker[data-station="ZLXY"]')
            marker.click()
            popup=page.locator('.weather-observation-popup').last
            popup.wait_for(state='visible',timeout=8000)
            page.wait_for_timeout(400)
            check(route + '-raw-metar-popup', 'ZLXY' in popup.inner_text() and 'NOAA' in popup.inner_text())
            page.screenshot(path=str(OUT/(route.rsplit('/',1)[-1]+'-detail.png')),timeout=30000)
            controls.locator('button').nth(1).click()
            page.wait_for_timeout(300)
            check(route + '-wind-mode', 'm/s' in page.locator('.weather-observation-marker').first.inner_text())
            page.screenshot(path=str(OUT/(route.rsplit('/',1)[-1]+'-wind.png')),timeout=30000)
            controls.locator('button').nth(2).click()
            page.wait_for_timeout(300)
            check(route + '-hide-stations',page.locator('.weather-observation-marker').count()==0)
            controls.locator('button').nth(2).click()
            page.wait_for_timeout(300)
            check(route + '-show-stations',page.locator('.weather-observation-marker').count()==39)
        check('no-javascript-errors', not report['errors'], errors=report['errors'])
    finally:
        (OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()
