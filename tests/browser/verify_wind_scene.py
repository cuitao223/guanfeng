"""Verify real GFS data provenance and browser/WebGL wind-scene behavior."""
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
import eccodes as ec
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'evidence/wind-scene'
OUT.mkdir(parents=True,exist_ok=True)
report={'at':datetime.now(timezone.utc).isoformat(),'checks':[],'errors':[]}
def check(name,ok,**details):
    report['checks'].append({'name':name,'passed':bool(ok),**details})
    print(name,bool(ok),details,flush=True)
    assert ok,name
DATA=json.loads((ROOT/'frontend/src/data/gfs-wind.json').read_text(encoding='utf-8'))
MANIFEST=json.loads((ROOT/'data/public/gfs-wind/manifest.json').read_text(encoding='utf-8'))
def source_checks():
    check('normalized-file-sha256',hashlib.sha256((ROOT/MANIFEST['normalizedFile']).read_bytes()).hexdigest()==MANIFEST['normalizedSha256'])
    count=0
    for frame,source in zip(DATA['frames'],MANIFEST['files']):
        path=ROOT/'data/public/gfs-wind'/source['file']
        check('source-sha256-f'+str(frame['forecastHour']),hashlib.sha256(path.read_bytes()).hexdigest()==source['sha256'])
        checked_fields=0
        with path.open('rb') as stream:
            while (g:=ec.codes_grib_new_from_file(stream)) is not None:
                try:
                    short=ec.codes_get(g,'shortName');pressure=ec.codes_get(g,'level')
                    key={'u':'u','v':'v','gh':'geopotentialHeights'}.get(short)
                    if key is None:continue
                    level=next(x for x in frame['levels'] if x['pressure']==pressure)
                    assert ec.codes_get(g,'units')==('gpm' if short=='gh' else 'm s**-1')
                    assert ec.codes_get(g,'validityDate')==int(frame['validTime'][:10].replace('-',''))
                    assert ec.codes_get(g,'validityTime')==int(frame['validTime'][11:16].replace(':',''))
                    for lon,lat,value in zip(ec.codes_get_array(g,'longitudes'),ec.codes_get_array(g,'latitudes'),ec.codes_get_values(g)):
                        col=round((lon-112)/.25);row=round((36-lat)/.25)
                        assert abs(level[key][row*33+col]-value)<1e-9
                    checked_fields+=1
                finally:ec.codes_release(g)
        check('all-source-vectors-and-heights-f'+str(frame['forecastHour']),checked_fields==12)
        for level in frame['levels']:
            for i,(u,v) in enumerate(zip(level['u'],level['v'])):
                assert abs(level['speeds'][i]-math.hypot(u,v))<1e-9
                assert abs(level['dirs'][i]-(math.degrees(math.atan2(-u,-v))+360)%360)<1e-9
                count+=1
    check('all-speed-direction-calculations',count==13068,grid_vectors=count)
GET_VM="""() => {let c=document.querySelector('.wind-scene').__vueParentComponent;while(c&&!c.proxy?.currentFrame)c=c.parent;return c.proxy}"""
def state(page):
    return page.evaluate("""() => {let c=document.querySelector('.wind-scene').__vueParentComponent;while(c&&!c.proxy?.currentFrame)c=c.parent;const x=c.proxy;return {frame:x.frameIndex,pressures:x.visibleLevels.map(l=>l.pressure),sample:x.sampleIndex,speed:x.currentFrame.levels[3].speeds[x.sampleIndex],fieldMeshes:x.context?.scene.children.filter(o=>o.type==='Mesh').length,particleMeshes:x.context?.overlayScene.children.filter(o=>o.type==='Mesh').length,barbLines:x.context?.overlayScene.children.filter(o=>o.type==='LineSegments').length,calls:x.context?.renderer.info.render.calls,opacity:x.opacity,playing:x.playing}}""")
try:
    source_checks()
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
        context=browser.new_context(viewport={'width':1600,'height':1000})
        page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.goto('http://127.0.0.1:5274/operations/wind');page.wait_for_url('**/login-network?**')
        check('wind-route-requires-operations-login',True)
        page.locator('input[name="username"]').fill('observer');page.locator('input[name="password"]').fill('Guanfeng2026!');page.get_by_test_id('portal-login').click();page.wait_for_url('**/operations/wind')
        page.locator('.leice-map-3d-overlay').wait_for(timeout=30000);page.wait_for_timeout(3500)
        s=state(page)
        check('four-real-pressure-surface-meshes',s['fieldMeshes']==4 and s['pressures']==[925,850,700,500],state=s)
        check('four-particle-layers-and-render-calls',s['particleMeshes']==4 and s['calls']>=8)
        text=page.locator('.wind-scene').inner_text()
        check('source-and-nonlive-model-label',all(x in text for x in ['GFS','非实时雷达观测','2026-11-11']))
        expected=DATA['frames'][0]['levels'][3]['speeds'][544]
        check('initial-table-matches-grib-derived-value',abs(s['speed']-expected)<1e-9)
        page.screenshot(path=str(OUT/'wind-default.png'))
        opacity_slider=page.locator('.wind-controls [role="slider"]').nth(0)
        opacity_slider.focus();page.keyboard.press('ArrowLeft');page.wait_for_timeout(200)
        op=state(page)['opacity']
        uniforms=page.evaluate("""() => {let c=document.querySelector('.wind-scene').__vueParentComponent;while(c&&!c.proxy?.currentFrame)c=c.parent;return c.proxy.context.scene.children.filter(o=>o.type==='Mesh').map(o=>o.material.uniforms.uOpacity.value)}""")
        check('opacity-slider-updates-actual-shader',op<.7 and all(abs(value-op)<1e-8 for value in uniforms))
        opacity_slider.focus();page.keyboard.press('ArrowRight')
        height_slider=page.locator('.wind-controls [role="slider"]').nth(1)
        height_slider.focus();page.keyboard.press('ArrowRight');page.wait_for_timeout(200)
        height=page.evaluate("""() => {let c=document.querySelector('.wind-scene').__vueParentComponent;while(c&&!c.proxy?.currentFrame)c=c.parent;const x=c.proxy;return {factor:x.exaggeration,z:x.context.scene.children.filter(o=>o.type==='Mesh').map(o=>o.geometry.attributes.position.array[2])}}""")
        check('height-slider-rebuilds-distinct-layer-heights',height['factor']==36 and len(set(height['z']))==4)
        height_slider.focus();page.keyboard.press('ArrowLeft')
        page.get_by_test_id('wind-time-1').click();page.wait_for_timeout(500)
        s=state(page);check('time-switch-rebuilds-real-field',s['frame']==1 and abs(s['speed']-DATA['frames'][1]['levels'][3]['speeds'][544])<1e-9)
        page.get_by_test_id('wind-time-2').click();page.wait_for_timeout(500)
        check('forecast-date-crosses-midnight-correctly','2026-11-12 02:00 UTC+8' in page.locator('.wind-timeline').inner_text())
        page.get_by_test_id('pressure-controls').locator('.el-checkbox').first.click();page.wait_for_timeout(300)
        s=state(page);check('pressure-checkbox-removes-field-and-particles',s['fieldMeshes']==3 and s['particleMeshes']==3 and 925 not in s['pressures'])
        page.get_by_test_id('pressure-controls').locator('.el-checkbox').first.click()
        page.get_by_test_id('form-controls').locator('.el-checkbox').nth(1).click();page.wait_for_timeout(300)
        check('wind-barbs-render-real-vectors',state(page)['barbLines']==4)
        page.screenshot(path=str(OUT/'wind-with-barbs.png'))
        page.get_by_test_id('form-controls').locator('.el-checkbox').first.click();page.wait_for_timeout(300)
        check('field-can-hide-with-vectors-retained',state(page)['fieldMeshes']==0 and state(page)['barbLines']==4)
        page.screenshot(path=str(OUT/'wind-vectors.png'))
        page.get_by_test_id('form-controls').locator('.el-checkbox').first.click()
        page.get_by_test_id('wind-play').click();initial=state(page)['frame']
        page.wait_for_function("""before=>{let c=document.querySelector('.wind-scene').__vueParentComponent;while(c&&!c.proxy?.currentFrame)c=c.parent;return c.proxy.frameIndex!==before}""",arg=initial,timeout=12000)
        page.get_by_test_id('wind-play').click();check('playback-advances-real-snapshots',not state(page)['playing'])
        page.mouse.click(900,740);page.wait_for_timeout(300)
        check('map-click-selects-nearest-grid',state(page)['sample']!=544,sample=state(page)['sample'])
        page.locator('.wind-values details summary').click()
        with page.expect_download() as result:page.locator('.wind-values details .el-button').click()
        downloaded=result.value;export_path=OUT/'exported-grid.json';downloaded.save_as(export_path)
        exported=json.loads(export_path.read_text(encoding='utf-8'))
        check('export-contains-source-vectors',len(exported['levels'])==4 and exported['levels'][0]['u']==DATA['frames'][state(page)['frame']]['levels'][0]['u'])
        page.goto('http://127.0.0.1:5274/wind-3d');page.wait_for_url('**/operations/wind');check('legacy-wind-link-opens-restored-page',True)
        page.locator('.leice-map-3d-overlay').wait_for();page.wait_for_timeout(700)
        check('no-javascript-errors',not report['errors'],errors=report['errors'])
        context.request.post('http://127.0.0.1:5274/api/wb/auth/logout',data={'platform':'operations'})
        browser.close()
finally:
    (OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
