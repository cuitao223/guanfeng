#!/usr/bin/env node
// Real UI / real observations only. No session, shared project edits, generation or fixture data.
// node guanfeng/tests/browser/verify_dynamic.cjs --run
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const here = __dirname;
const stamp = new Date().toISOString().replace(/[:.]/g,'-');
const out = path.join(here,`extended-dynamic-${stamp}`);
const base = process.env.WB_BROWSER_URL || 'http://127.0.0.1:5174';
const report = {startedAt:new Date().toISOString(),base,scope:'AnalysisPanel only; no sessions or project mutations',checks:[],errors:[]};
let browser,context,page;
const assert = (ok,message) => {if(!ok)throw Error(message)};
const delay = ms => new Promise(r=>setTimeout(r,ms));
const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
async function save(name,value){await fs.writeFile(path.join(out,name),JSON.stringify(value,null,2));}
function pass(name,details={}){report.checks.push({name,status:'passed',...details});console.log('PASS '+name);}
async function screenshot(name){await page.screenshot({path:path.join(out,name),fullPage:true});}
function input(label,role='spinbutton'){return page.getByRole(role,{name:label,exact:true});}
async function analyze(name){
  const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/wb/analysis'&&r.request().method()==='POST');
  await page.getByTestId('analyze').click();
  const response=await pending;const envelope=await response.json();
  assert(response.ok()&&envelope.code===200,`Analysis ${name} failed: ${envelope.code}`);
  const request=response.request().postDataJSON(),data=envelope.data;
  await page.waitForFunction(()=>document.querySelectorAll('.wb-metric strong').length===5);
  await save(`${name}.json`,{request,data});
  const metrics=await page.locator('.wb-metric strong').allTextContents();
  ['mean','max','validCount','missingCount','exceedCount'].forEach((key,i)=>{
    const expected=data.summary[key];assert(expected===null?metrics[i].trim()==='—':Math.abs(Number(metrics[i])-expected)<=0.0051,`${key} UI differs from response`);
  });
  const props=await page.locator('.wb-chart').evaluate(root=>{
    const queue=[];for(const element of [root,...root.querySelectorAll('*')])if(element.__vueParentComponent)queue.push(element.__vueParentComponent);
    const seen=new Set();while(queue.length){const c=queue.shift();if(!c||seen.has(c))continue;seen.add(c);const p=c.props;
      if(p&&Array.isArray(p.values)&&Array.isArray(p.times)&&Array.isArray(p.heightArr))return {name:c.type?.name,times:p.times,heightArr:p.heightArr,values:p.values,dirs:p.dirs,heightMin:p.heightMin,heightMax:p.heightMax,unit:p.unit};
      if(c.parent)queue.push(c.parent);
    }return null;
  });
  assert(props,'Could not inspect rendered chart input props');
  assert(same(props.times,data.times)&&same(props.heightArr,data.heightArr)&&same(props.values,data.values)&&same(props.dirs,data.dirs),'Chart received different data from real analysis');
  assert(Number(props.heightMin)===Number(request.heightMin)&&Number(props.heightMax)===Number(request.heightMax),'Chart height parameters differ from applied analysis');
  assert(await page.locator('.wb-chart svg,.wb-chart canvas').count()>0,'No chart rendered');
  await save(`${name}-chart.json`,props);await screenshot(`${name}.png`);
  pass(`${name}: real summary and chart props match response`,{request,summary:data.summary,timeCount:data.times.length,heightCount:data.heightArr.length});
  return {request,data};
}
async function exportResult(format,captured,name){
  const responseWait=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/wb/analysis/export');
  const downloadWait=page.waitForEvent('download');
  await page.getByRole('button',{name:format==='csv'?'Export CSV':'Export report',exact:true}).click();
  const [response,download]=await Promise.all([responseWait,downloadWait]);
  assert(response.request().method()==='GET'&&response.ok(),'Export is not successful GET');
  const query=new URL(response.url()).searchParams;
  for(const [key,value]of Object.entries(captured.request))if(value!==''&&value!==null&&value!==undefined)assert(query.get(key)===String(value),`Export parameter ${key} differs from applied analysis`);
  const target=path.join(out,`${name}.${format}`);await download.saveAs(target);
  const bytes=await fs.readFile(target),text=bytes.toString('utf8');
  if(format==='csv'){
    const rows=JSON.parse(execFileSync(process.env.GUANFENG_PYTHON||'python',['-c','import csv,json,sys; print(json.dumps(list(csv.DictReader(open(sys.argv[1],encoding="utf-8-sig",newline="")))))',target],{encoding:'utf8',windowsHide:true}));
    assert(rows.length===captured.data.events.length,'CSV event count differs');
    rows.forEach((row,i)=>{const event=captured.data.events[i];assert(row.start===event.start&&row.end===event.end,'CSV event time differs');assert(Number(row.peak_m_per_s)===event.peak&&Number(row.observation_records)===event.records,'CSV event numbers differ');assert(same(JSON.parse(row.heights_m),event.heights),'CSV event heights differ');});
  }else{
    assert(/<html|<!doctype/i.test(text),'HTML export is not HTML');
    for(const token of [`threshold=${captured.request.threshold}`,`heightMin=${captured.request.heightMin}`,`heightMax=${captured.request.heightMax}`,captured.data.provenance.start,captured.data.provenance.end])assert(text.includes(token),`HTML lacks applied result/provenance ${token}`);
  }
  pass(`${name}: ${format} browser download matches applied parameters/results`,{method:response.request().method(),httpStatus:response.status(),contentType:response.headers()['content-type'],bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
async function main(){
  if(!process.argv.includes('--run')){console.log('Prepared only. After new quality JAR is ready, run: node guanfeng/tests/browser/verify_dynamic.cjs --run');return;}
  await fs.mkdir(out,{recursive:true});
  let modulePath=process.env.WB_PLAYWRIGHT; if(!modulePath){try{modulePath=require.resolve('playwright')}catch{modulePath=execFileSync(process.env.GUANFENG_PYTHON||'python',['-c','import pathlib,playwright; print(pathlib.Path(playwright.__file__).parent / "driver" / "package")'],{encoding:'utf8',windowsHide:true}).trim()}}
  const {chromium}=require(modulePath);browser=await chromium.launch({executablePath:process.env.WB_CHROME||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  context=await browser.newContext({viewport:{width:1600,height:1100},acceptDownloads:true});await context.addCookies([{name:'language',value:'En',url:base}]);
  await context.route('**/api/wb/**',route=>{
    const r=route.request(),u=new URL(r.url());
    if(!['GET','HEAD','OPTIONS'].includes(r.method())&&!(r.method()==='POST'&&u.pathname==='/api/wb/analysis')){report.errors.push('Blocked unexpected write '+r.method()+' '+u.pathname);return route.abort();}return route.continue();
  });
  page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  const catalogWait=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/wb/datasets');
  await page.goto(base+'/workbench',{waitUntil:'domcontentloaded'});const catalog=(await(await catalogWait).json()).data;
  const dataset=catalog.find(d=>d.format==='radar-dbs');assert(dataset,'No real DBS dataset');
  await page.getByTestId('analyze').waitFor();
  // First real DBS is the normal page default; explicitly choose it if catalogue ordering changed.
  const datasetBox=page.getByRole('combobox',{name:'Dataset',exact:true});
  if(await datasetBox.count()&&!(await datasetBox.innerText()).includes(dataset.name)){
    await datasetBox.click();await page.getByRole('option',{name:dataset.name,exact:true}).click();
  }
  await input('Minimum height (m)').fill('127');await input('Maximum height (m)').fill('500');await input('Threshold (m/s)').fill('9.2');
  const checkbox=page.getByRole('checkbox',{name:'Reject invalid directions',exact:true});if(!await checkbox.isChecked())await page.locator('label.el-checkbox').filter({hasText:'Reject invalid directions'}).click();
  const thresholdValidity=await input('Threshold (m/s)').evaluate(el=>({valid:el.validity.valid,stepMismatch:el.validity.stepMismatch,step:el.step,value:el.value,message:el.validationMessage}));
  if(!thresholdValidity.valid){
    report.checks.push({name:'decimal threshold native form validation',status:'failed',details:thresholdValidity});
    await screenshot('decimal-threshold-invalid.png');
    await input('Threshold (m/s)').fill('10');
    console.log('DEFECT decimal threshold blocked by native validation; continuing with valid integer 10');
  }else pass('decimal threshold accepted by native form validation');
  const initial=await analyze('full-coverage');
  await exportResult('csv',initial,'full-coverage');
  const selectedTimes=initial.data.times.slice(0,7);assert(selectedTimes.length===7,'Need seven real observed timestamps');
  await input('Start time','textbox').fill(selectedTimes[0]);await input('End time','textbox').fill(selectedTimes.at(-1));
  assert(await page.getByRole('button',{name:'Export CSV',exact:true}).isDisabled(),'Stale analysis export remains enabled after date change');
  const narrowed=await analyze('date-range');
  assert(same(narrowed.data.times,selectedTimes),'Date range did not narrow response to actual selected interval');
  assert(narrowed.data.provenance.start===selectedTimes[0]&&narrowed.data.provenance.end===selectedTimes.at(-1),'Date provenance mismatch');pass('date range applies to real response and disables stale exports');
  await exportResult('csv',narrowed,'date-range');await exportResult('html',narrowed,'date-range');
  await page.locator('label.el-checkbox').filter({hasText:'Reject invalid directions'}).click();
  assert(!await checkbox.isChecked(),'Quality checkbox did not toggle');
  assert(await page.getByRole('button',{name:'Export CSV',exact:true}).isDisabled(),'QC change left stale export enabled');
  const relaxed=await analyze('direction-not-required');assert(relaxed.request.rejectInvalidDirection===false&&relaxed.data.quality.directionRequired===false,'False quality flag not honored');
  // The real sample may yield equal counts. Flag propagation is required; numerical change is not fabricated.
  assert(relaxed.data.summary.validCount>=narrowed.data.summary.validCount,'Relaxed direction policy decreased valid count');
  pass('quality checkbox reaches backend and actual quality metadata',{strict:narrowed.data.summary,relaxed:relaxed.data.summary,numericChangeObserved:!same(narrowed.data.summary,relaxed.data.summary)});
  await exportResult('csv',relaxed,'direction-not-required');
  const secondHeight=relaxed.data.heightArr[1];assert(secondHeight!==undefined,'Not enough actual height levels');await input('Minimum height (m)').fill(String(secondHeight));
  const changed=await analyze('height-range');assert(changed.data.heightArr.every(h=>h>=secondHeight&&h<=500),'Height filter not applied');await exportResult('csv',changed,'height-range');
  assert(report.errors.length===0,'Browser errors or prohibited writes occurred');pass('no browser errors, sessions, shared project changes or paid calls');
}
main().catch(e=>{report.checks.push({name:'dynamic UI acceptance',status:'failed',error:e.message});console.error(e.message);process.exitCode=1;}).finally(async()=>{
  if(page&&process.exitCode)try{await screenshot('failure.png')}catch{}
  if(context)await context.close();if(browser)await browser.close();
  if(report.checks.some(c=>c.status==='failed'))process.exitCode=1;
  if(process.argv.includes('--run')){report.finishedAt=new Date().toISOString();await save('results.json',report);console.log('Evidence: '+out)}
});
