"""Live browser acceptance for real map tiles; no observation data is synthesized."""
import json
from pathlib import Path
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5274"
OUT = Path(__file__).resolve().parents[2] / "evidence" / "maps"
OUT.mkdir(parents=True, exist_ok=True)
report = {"at": datetime.now(timezone.utc).isoformat(), "checks": [], "errors": []}

def check(name, value, **details):
    report["checks"].append({"name": name, "passed": bool(value), **details})
    print(name, bool(value), details, flush=True)
    assert value, name

def wait_tiles(page):
    page.wait_for_function("""() => {
      const el = document.querySelector('.real-map__status');
      const tiles = [...document.querySelectorAll('img.leaflet-tile')];
      return el && !el.classList.contains('is-error') && tiles.length > 0 && tiles.every(t => t.complete && t.naturalWidth > 0);
    }""", timeout=30000)
    page.wait_for_timeout(400)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge',headless=True, args=['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'])
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.on('pageerror', lambda e: report['errors'].append(e.stack))
    try:
        response = page.context.request.post(BASE + '/api/wb/auth/login', data={'platform':'cloud','username':'creator','password':'Guanfeng2026!'})
        assert response.status == 200
        for route in ['developer/maps', 'developer/device-overview', 'developer/other-mode']:
            page.goto(BASE + '/' + route)
            wait_tiles(page)
            loaded = page.locator('img.leaflet-tile').count()
            check(route + '-live-tiles', loaded > 0, loaded=loaded)
            check(route + '-attribution', page.locator('.leaflet-control-attribution').is_visible())
            page.screenshot(path=str(OUT / (route.rsplit('/',1)[-1] + '.png')))
        page.goto(BASE + '/developer/maps')
        wait_tiles(page)
        buttons = page.locator('.map-type-item')
        check('map-controls-visible', buttons.count() == 3 and buttons.first.is_visible())
        for index, name, source in [(0,'satellite','style=6'),(1,'roads','style=7'),(2,'terrain','arcgisonline')]:
            buttons.nth(index).click()
            page.wait_for_timeout(800)
            wait_tiles(page)
            urls = page.locator('img.leaflet-tile').evaluate_all('(els)=>els.map(e=>e.src)')
            check('switch-' + name, any(source in u for u in urls))
            page.screenshot(path=str(OUT / ('maps-' + name + '.png')))
        buttons.nth(1).click()
        page.wait_for_timeout(500)
        wait_tiles(page)
        before = page.locator('img.leaflet-tile').evaluate_all('(els)=>els.map(e=>e.src).sort().join()')
        page.mouse.move(720, 400)
        page.mouse.wheel(0, -550)
        page.wait_for_timeout(1300)
        wait_tiles(page)
        after = page.locator('img.leaflet-tile').evaluate_all('(els)=>els.map(e=>e.src).sort().join()')
        check('zoom-fetches-new-tiles', before != after)
        page.mouse.move(720, 400)
        page.mouse.down()
        page.mouse.move(900, 500, steps=10)
        page.mouse.up()
        page.wait_for_timeout(1200)
        wait_tiles(page)
        check('pan-fetches-new-tiles', page.locator('img.leaflet-tile').evaluate_all('(els)=>els.map(e=>e.src).sort().join()') != after)
        # Inject only a network failure, then restore the actual provider and retry.
        page.route('**/*autonavi.com/**', lambda route: route.abort())
        buttons.nth(0).click()
        page.wait_for_selector('.real-map__status.is-error', timeout=20000)
        check('failed-tiles-visible-error', page.locator('.real-map__status.is-error > button').is_visible())
        page.screenshot(path=str(OUT / 'maps-network-error.png'))
        page.unroute('**/*autonavi.com/**')
        page.locator('.real-map__status > button').click()
        wait_tiles(page)
        check('retry-real-provider-recovers', not page.locator('.real-map__status').evaluate('(el)=>el.classList.contains("is-error")'))
        responses=[]
        page.on('response', lambda r: responses.append({'status':r.status,'url':r.url}) if 'autonavi.com/appmaptile' in r.url else None)
        page.goto(BASE + '/developer/wind-3d')
        page.wait_for_selector('.leice-map-3d canvas', timeout=20000)
        page.wait_for_timeout(6000)
        state=page.locator('.wind3d-page').evaluate('(el)=>{const v=el.__vueParentComponent.proxy;return {center:v.mapView.center, unlocatedOverlays:v.sampleGeoreferenced}}')
        check('3d-real-tiles', any(r['status']==200 and 'style=6' in r['url'] for r in responses), responses=len(responses), state=state)
        check('3d-default-china-view', state['center']==[105,35])
        check('unlocated-samples-not-georeferenced', state['unlocatedOverlays'] is False)
        page.screenshot(path=str(OUT / 'wind-3d.png'), timeout=30000)
        check('no-browser-errors', not report['errors'], errors=report['errors'])
    finally:
        (OUT / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
        browser.close()
