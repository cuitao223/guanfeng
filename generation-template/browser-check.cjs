/** Real browser gate: fixed local static server proxies actual Java API, never synthetic responses. */
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {execFileSync}=require('node:child_process');
const [rootArg,backendArg,roundArg='0']=process.argv.slice(2);
const root=path.resolve(rootArg), backend=new URL(backendArg);
const folder=path.join(root,'validation');
fs.mkdirSync(folder,{recursive:true});
const report={startedAt:new Date().toISOString(),round:Number(roundArg),realBackend:true,mocked:false,checks:[],errors:[]};
let browser, server;
function requireTrue(ok,message){if(!ok)throw Error(message)}
(async()=>{
 let modulePath=process.env.GUANFENG_PLAYWRIGHT;
 if(!modulePath){try{modulePath=require.resolve('playwright')}catch{
  modulePath=execFileSync(process.env.GUANFENG_PYTHON||'python',['-c','import pathlib,playwright; print(pathlib.Path(playwright.__file__).parent / "driver" / "package")'],{encoding:'utf8',windowsHide:true}).trim();
 }}
 const pw=require(modulePath);
 const allowed={'/runtime/datasets':['GET','datasets'],'/runtime/analysis':['POST','analysis'],'/runtime/workflow/validate':['POST','workflow/validate'],'/runtime/workflow/run':['POST','workflow/run']};
 server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost'),route=allowed[u.pathname];
  if(route){
   if(req.method!==route[0]){res.writeHead(405);return res.end()}
   const proxy=http.request(new URL('/api/wb/'+route[1],backend),{method:req.method,headers:{'content-type':'application/json'},timeout:30000},up=>{res.writeHead(up.statusCode,{'content-type':'application/json'});up.pipe(res)});
   proxy.on('error',()=>{res.writeHead(502);res.end('Local Java backend unavailable')});req.pipe(proxy);return;
  }
  let decoded;try{decoded=decodeURIComponent(u.pathname)}catch{res.writeHead(400);return res.end()}
  const dist=path.resolve(root,'dist'),file=path.resolve(dist,'.'+(decoded==='/'?'/index.html':decoded));
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await pw.chromium.launch({executablePath:process.env.GUANFENG_BROWSER||(fs.existsSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe')?'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe':undefined),headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',e=>report.errors.push(e.message));
 const analyses=[];
 page.on('response',async response=>{if(new URL(response.url()).pathname==='/runtime/analysis'){try{const payload=await response.json();analyses.push({request:response.request().postDataJSON(),payload})}catch{}}});
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle',timeout:30000});
 let deadline=Date.now()+7000;
 while(!analyses.length&&Date.now()<deadline)await page.waitForTimeout(100);
 requireTrue(analyses.length,'Page must call analyze(params) automatically after datasets load in mounted(); no real analysis request occurred');
 const initial=analyses.at(-1);requireTrue(initial.payload.code===200,'Initial real analysis failed: '+initial.payload.msg);
 await page.waitForTimeout(300);
 let text=await page.locator('body').innerText();
 requireTrue(!text.includes('[object Object]'),'Object rendered as [object Object]; render nested fields explicitly');
 const summary=initial.payload.data.summary;
 for(const key of ['max','validCount','missingCount','exceedCount'])requireTrue(text.includes(String(summary[key])), 'Visible summary does not contain actual '+key+'='+summary[key]);
 const data=initial.payload.data;
 if(data.events.length){const event=data.events[0];requireTrue(text.includes(event.start)&&text.includes(event.end)&&text.includes(String(event.peak)),'Visible exceedance events must render actual start/end/peak fields')}
 const coverage=data.quality.coverage;
 requireTrue(text.includes(String(coverage.minHeight))&&text.includes(String(coverage.maxHeight)),'Observed height range minHeight/maxHeight must be visible in m, separate from selected height limits');
 const prompt=JSON.parse(fs.readFileSync(path.join(root,'task.json'),'utf8')).prompt||'';
 if(/SVG|profile|chart|\u5ed3\u7ebf|\u56fe\u8868/i.test(prompt)){
  requireTrue(await page.locator('svg polyline,svg path,canvas').count()>0,'Requested real profile chart is missing: use response.values[timeIndex][heightIndex], not speed or other invented fields');
  const lines=await page.locator('svg polyline').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points')));
  if(lines.length)requireTrue(lines.some(v=>v&&v.split(/[ ,]+/).length>=4&&!/NaN|undefined/.test(v)),'Profile chart contains no finite source points');
 }
 await page.screenshot({path:path.join(folder,'browser-'+roundArg+'.png'),fullPage:true});
 report.checks.push({name:'real-page-initial-analysis-summary-events-coverage-and-chart',passed:true,request:initial.request,summary});
 const inputs=page.getByRole('spinbutton');
 let threshold;
 for(let i=0;i<await inputs.count();i++){const el=inputs.nth(i),label=await el.evaluate(e=>e.closest('label')?.textContent||e.getAttribute('aria-label')||'');if(/threshold|\u9608\u503c/i.test(label)){threshold=el;break}}
 requireTrue(threshold,'Editable threshold input must have a semantic label');
 await threshold.fill(String(summary.max+1));
 const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/runtime/analysis',{timeout:12000});
 const buttons=page.getByRole('button');let button;
 for(let i=0;i<await buttons.count();i++){const el=buttons.nth(i),label=await el.innerText();if(/\u5206\u6790|Analyze|Analysis/i.test(label)&&!(/\u6240\u9009|selected/i.test(label))){button=el;break}}
 requireTrue(button,'Analysis action button missing');await button.click();
 const response=await responsePromise,payload=await response.json();requireTrue(payload.code===200,'Dynamic threshold request failed');
 requireTrue(response.request().postDataJSON().threshold===summary.max+1,'Threshold control did not reach actual analysis request');
 requireTrue(payload.data.events.length===0&&payload.data.summary.exceedCount===0,'Threshold above actual maximum must produce no exceedances');
 await page.waitForTimeout(300);requireTrue(!report.errors.length,'Uncaught browser exception: '+report.errors.join('; '));
 report.checks.push({name:'dynamic-threshold-real-backend',passed:true,threshold:summary.max+1});
 report.status='passed';
})().catch(e=>{report.status='failed';report.error=e.message;console.error('Validation browser failed: '+e.message);process.exitCode=1}).finally(async()=>{
 if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
 report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(folder,'browser-'+roundArg+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:report.checks,error:report.error}));
});
