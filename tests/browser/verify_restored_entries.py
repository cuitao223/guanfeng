"""Real browser verification of restored navigation, reference views and GFS analysis tools."""
import json
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'evidence/restored-entries'
OUT.mkdir(parents=True,exist_ok=True)
report={'at':datetime.now(timezone.utc).isoformat(),'checks':[],'errors':[]}
def check(name,ok,**details):
 report['checks'].append({'name':name,'passed':bool(ok),**details});print(name,bool(ok),details,flush=True);assert ok,name
BASE='http://127.0.0.1:5274'
def login(page,path,user):
 page.goto(BASE+path);page.locator('input[name="username"]').fill(user);page.locator('input[name="password"]').fill('Guanfeng2026!');page.get_by_test_id('portal-login').click()
def vm(page,expression):
 return page.evaluate("""() => {let c=document.querySelector('.wind-scene').__vueParentComponent;while(c&&!c.proxy?.currentFrame)c=c.parent;const x=c.proxy;return """+expression+"}")
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(channel='msedge',headless=True,args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader'])
  context=browser.new_context(viewport={'width':1600,'height':1000});page=context.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
  page.goto(BASE+'/cloud/resources/charts');page.wait_for_url('**/login-cloud?**');check('cloud-resources-protected',True)
  login(page,'/login-cloud','creator');page.wait_for_url('**/cloud')
  nav=page.locator('.header-nav').inner_text();check('cloud-workflow-and-resources-navigation','流程编排' in nav and '组件资源' in nav)
  page.goto(BASE+'/cloud/resources');page.get_by_test_id('resource-charts').wait_for();check('cloud-resource-links',page.locator('.resource-card').count()==9)
  page.wait_for_timeout(300);check('resource-data-kind-labels-visible',page.locator('.resource-card .el-tag').first.evaluate('e=>Number(getComputedStyle(e).opacity)')==1);page.screenshot(path=str(OUT/'cloud-resources.png'))
  for key in ['charts','maps','ui','widgets','overview','pages','sample']:
   page.goto(BASE+'/cloud/resources/'+key);page.locator('.reference-content > *').first.wait_for(timeout=30000);page.wait_for_timeout(400)
   check('cloud-reference-'+key,page.locator('.reference-page').get_attribute('data-reference')==key and len(page.locator('.reference-content').inner_text())>10)
   check('provenance-'+key,len(page.locator('.reference-notice').inner_text())>20)
   if key in ['charts','maps','ui']:page.screenshot(path=str(OUT/('resource-'+key+'.png')))
  page.goto(BASE+'/cloud/workbench?tab=workflow');page.locator('.wb-content').wait_for();check('workflow-business-entry-restored','tab=workflow' in page.url)
  page.goto(BASE+'/operations/tools');page.wait_for_url('**/login-network?**');check('operations-tools-require-own-login',True)
  login(page,'/login-network','observer');page.wait_for_url('**/operations')
  page.goto(BASE+'/operations/tools');page.get_by_test_id('resource-devices').wait_for();check('operations-tool-links',page.locator('.resource-card').count()==6)
  page.screenshot(path=str(OUT/'operations-tools.png'))
  for key in ['devices','multimode','models','wind-tools']:
   page.goto(BASE+'/operations/tools/'+key);page.locator('.reference-content > *').first.wait_for(timeout=30000);page.wait_for_timeout(500)
   check('operations-reference-'+key,page.locator('.reference-page').get_attribute('data-reference')==key and len(page.locator('.reference-content').inner_text())>10)
   check('provenance-'+key,len(page.locator('.reference-notice').inner_text())>20)
   if key=='models':
    check('model-page-does-not-pretend-connected','未接入' in page.locator('.reference-notice').inner_text())
    page.locator('.manage-add-btn').click();page.locator('.platform-dialog-btn--confirm').click();page.locator('.el-message--warning').wait_for();check('unconnected-model-form-refuses-fake-save','未保存' in page.locator('.el-message--warning').inner_text());page.locator('.device-model-page .el-dialog__headerbtn').click()
   if key in ['devices','multimode']:page.screenshot(path=str(OUT/('tool-'+key+'.png')))
  page.goto(BASE+'/operations/wind');page.locator('.leice-map-3d-overlay').wait_for(timeout=30000);page.wait_for_timeout(1000)
  page.get_by_test_id('wind-analysis-tools').click();page.locator('.wind-profile-chart .profile-chart').wait_for();page.wait_for_timeout(500)
  check('actual-gfs-profile-renders',page.locator('.wind-profile-chart svg path').count()>0 and 'gpm' in page.locator('.wind-profile-chart').inner_text())
  data=json.loads((ROOT/'frontend/src/data/gfs-wind.json').read_text(encoding='utf-8'));frame=data['frames'][0]
  profile=vm(page,'({heights:x.profileHeights,speeds:x.profileSpeeds,index:x.sampleIndex})')
  check('profile-values-match-real-selected-grid',profile['heights']==[l['geopotentialHeights'][profile['index']] for l in frame['levels']] and profile['speeds']==[l['speeds'][profile['index']] for l in frame['levels']])
  page.screenshot(path=str(OUT/'wind-profile.png'))
  page.get_by_role('tab',name='风速分布',exact=True).click();hist=vm(page,'x.histogram');check('histogram-counts-all-selected-real-grids',sum(b['count'] for b in hist)==4356)
  page.screenshot(path=str(OUT/'wind-histogram.png'))
  page.get_by_role('tab',name='风速阈值检查',exact=True).click();expected=sum(v>=15 for l in frame['levels'] for v in l['speeds']);check('threshold-count-is-actual-data',vm(page,'x.exceedanceCount')==expected,count=expected)
  page.get_by_test_id('wind-rule-threshold').locator('input').fill('20');page.get_by_test_id('wind-rule-threshold').locator('input').press('Tab');page.wait_for_timeout(200)
  expected20=sum(v>=20 for l in frame['levels'] for v in l['speeds']);check('threshold-parameter-recomputes-count',vm(page,'x.exceedanceCount')==expected20,count=expected20)
  page.get_by_test_id('wind-rule-overlay').click();page.wait_for_timeout(200)
  check('threshold-overlay-creates-real-geometry',vm(page,"x.context.scene.children.some(o=>o.type==='Group')"))
  page.screenshot(path=str(OUT/'wind-threshold.png'))
  page.locator('.wind-analysis-dialog .el-dialog__headerbtn').click();page.get_by_test_id('wind-ruler').click();page.wait_for_timeout(300)
  check('spatial-ruler-renders',vm(page,"x.showRuler && x.context.scene.children.filter(o=>o.type==='Group').length>=2"))
  page.get_by_test_id('wind-annotations').click();check('annotation-controls-open',page.locator('.picture-edit').is_visible())
  page.locator('.picture-edit__btn').nth(2).click();page.mouse.move(720,350);page.mouse.down();page.mouse.move(830,440,steps=5);page.mouse.up();check('annotation-rectangle-created',page.locator('.picture-edit__item.is-rect').count()==1);page.get_by_test_id('wind-annotations').click()
  page.get_by_role('button',name='全屏',exact=True).click();page.wait_for_function('()=>Boolean(document.fullscreenElement)');check('fullscreen-opens',page.evaluate('document.fullscreenElement===document.documentElement'))
  page.get_by_role('button',name='色标配置',exact=True).click();page.locator('.legend-settings').wait_for();page.locator('.legend-settings__range input').nth(1).fill('35');page.locator('.legend-settings__range input').nth(1).press('Tab');page.locator('.el-dialog:visible').get_by_role('button',name='确定',exact=True).click();page.wait_for_timeout(300)
  check('color-settings-update-real-layer-and-legend',vm(page,'x.colorMax')==35 and '35' in page.locator('.wind-colorbar').inner_text());page.get_by_role('button',name='全屏',exact=True).click();page.wait_for_function('()=>!document.fullscreenElement');check('fullscreen-exits-through-ui',True)
  previous=vm(page,'x.sampleIndex');vm(page,"(x.pickPoint({lnglat:{getLng:()=>100,getLat:()=>20}}),true)");check('outside-grid-does-not-snap-to-edge',vm(page,'x.sampleIndex')==previous and bool(vm(page,'x.pickError')))
  check('both-platform-sessions-preserved',context.request.get(BASE+'/api/wb/auth/me?platform=cloud').status==200 and context.request.get(BASE+'/api/wb/auth/me?platform=operations').status==200)
  check('no-javascript-errors',not report['errors'],errors=report['errors'])
  context.request.post(BASE+'/api/wb/auth/logout',data={'platform':'cloud'});context.request.post(BASE+'/api/wb/auth/logout',data={'platform':'operations'});browser.close()
finally:
 (OUT/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
