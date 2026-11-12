/** Live generated workflow -> unsaved canvas -> parameter edit -> async execution.
 * Run after the backend implements POST /workflow/jobs and GET /workflow/jobs/{id}.
 * No generation requests, project PUT/rollback, Vue internals, mocks or credentials on disk.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const taskId = process.env.WB_GENERATION_ID || '2d20db9d-5bfb-4260-83f8-e25ba89237f3';
const backend = process.env.WB_BACKEND_URL || 'http://127.0.0.1:18080';
const frontend = process.env.WB_BROWSER_URL || 'http://127.0.0.1:5174';
const out = path.join(__dirname, 'generated-workflow-' + new Date().toISOString().replace(/[:.]/g,'-'));
const report = {taskId,startedAt:new Date().toISOString(),checks:[],cleanup:[],errors:[],evidence:[],asyncSnapshots:[],sharedWrites:0};
const secrets = new Set();
let context,browser,request,page,token,original,task;
const delay = ms => new Promise(resolve=>setTimeout(resolve,ms));
function assert(value,message){if(!value)throw new Error(message);}
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value && typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
function equal(a,b){return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));}
function clean(value){let s=String(value);for(const secret of secrets)s=s.split(secret).join('[REDACTED]');return s.replace(/sk-[A-Za-z0-9_-]{12,}/g,'[REDACTED]');}
function check(name,details={}){report.checks.push({name,status:'passed',...details});console.log('PASSED: '+name);}
async function evidence(name,value){await fs.writeFile(path.join(out,name),clean(JSON.stringify(value,null,2))+'\n');report.evidence.push(name);}
async function shot(name){await page.screenshot({path:path.join(out,name),fullPage:true});report.evidence.push(name);}
async function api(method,url,data,authenticated=false){const response=await request.fetch(backend+url,{method,data,headers:authenticated?{'X-Session':token}:{},timeout:20000});const json=await response.json();return{response,json};}
function data(result){assert(result.response.ok() && result.json.code===200,'API failed: '+result.json.msg);return result.json.data;}
async function waitFor(predicate,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){if(await predicate())return;await delay(100);}throw new Error('Timed out waiting for real UI/API state');}
async function tab(name){await page.getByRole('tab',{name,exact:true}).click();}
async function showTask(){
 await tab('AI application builder');
 await page.locator('.wb-generation-layout .el-table__body tbody tr').filter({hasText:taskId}).click();
 await waitFor(async()=>await page.getByRole('heading',{name:taskId,exact:true}).count()===1);
 await waitFor(async()=>await page.getByTestId('edit-generated-workflow').isVisible());
}
async function join(role){
 await tab('Collaboration & history');
 await page.getByRole('textbox',{name:'Display name',exact:true}).fill('Generated workflow browser '+role);
 await page.locator('.wb-session-form label.el-radio').filter({hasText:new RegExp('^'+role+'$','i')}).click();
 const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/wb/session')&&r.request().method()==='POST'),page.getByTestId('join-session').click()]);
 const json=await response.json();
 if(json.code!==200){const e=new Error(json.msg || 'Session rejected');e.blocked=true;throw e;}
 token=json.data.token;secrets.add(token);
 assert(json.data.role===role,'Session role mismatch');
}
async function revoke(usingUi=false){
 if(!token)return;
 const old=token;
 if(usingUi){
  await tab('Collaboration & history');
  const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/wb/session/leave')),page.getByRole('button',{name:'Leave session',exact:true}).click()]);
  assert((await response.json()).code===200,'UI session leave failed');
 }else{assert(data(await api('POST','/api/wb/session/leave',{},true)).left===true,'Session leave failed');}
 const denied=await request.get(backend+'/api/wb/projects/demo',{headers:{'X-Session':old}});
 assert((await denied.json()).code!==200,'Revoked session retained project access');
 token=null;report.cleanup.push({action:usingUi?'viewer-leave':'editor-leave',status:'passed',accessRevoked:true});
}
async function selectNode(id){await page.locator(`.wb-dag-node[aria-label="${id}"]`).click();await waitFor(async()=>(await page.locator('.wb-node-inspector p').innerText()).includes(id));}
async function params(id,value,apply=true){await selectNode(id);await page.getByRole('textbox',{name:'Parameters',exact:true}).fill(JSON.stringify(value));if(apply)await page.locator('.wb-node-inspector').getByRole('button',{name:/Save project Parameters/i}).click();}
async function unchanged(){const current=data(await api('GET','/api/wb/projects/demo',undefined,true));assert(current.revision===original.revision && current.title===original.title && equal(current.workflow,original.workflow),'Shared project changed during local draft test');assert(report.sharedWrites===0,'UI issued a shared-project write');return current;}
async function runUi(name){
 const snapshots=[];
 const listener=async response=>{
  if(!/\/api\/wb\/workflow\/jobs(?:\/[^/?]+)?$/.test(response.url()))return;
  try{const json=await response.json();if(json.code===200){const x=json.data;snapshots.push({method:response.request().method(),id:x.id,status:x.status,transitions:x.transitions||[],nodes:(x.nodes||[]).map(n=>({id:n.id,status:n.status,startedAt:n.startedAt,finishedAt:n.finishedAt}))});}}catch{}
 };
 page.on('response',listener);
 try{
  const [started]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/wb/workflow/jobs')&&r.request().method()==='POST'),page.getByTestId('run-workflow').click()]);
  const accepted=await started.json();await evidence(name+'-accepted.json',{httpStatus:started.status(),response:accepted});
  assert(accepted.code===200,'Async workflow API rejected request: '+accepted.code+' '+accepted.msg);
  const job=accepted.data;assert(job?.id,'Async job did not return ID');
  const submitted=started.request().postDataJSON();
  await waitFor(async()=>{
   const statuses=snapshots.filter(s=>s.method==='GET'&&s.id===job.id);return statuses.some(s=>['succeeded','failed','interrupted'].includes(s.status));
  },120000);
  const result=data(await api('GET','/api/wb/workflow/jobs/'+job.id,undefined,true));
  assert(result.status==='succeeded' && result.nodes.every(n=>n.status==='succeeded'),'Real async workflow failed');
  assert(snapshots.some(s=>s.method==='GET'&&s.id===job.id),'No real job polling observed');
  assert(snapshots.some(s=>['queued','running'].includes(s.status)),'No actual queued/running response observed');
  const transitions=result.transitions||[];
  for(const node of result.nodes){
   const events=transitions.filter(t=>t.nodeId===node.id);
   const running=events.find(t=>t.status==='running'),done=events.find(t=>t.status==='succeeded');
   assert(running && done && running.sequence<done.sequence,'Missing ordered real running/succeeded transitions for '+node.id);
   assert(running.at && done.at && Date.parse(running.at)<=Date.parse(done.at),'Invalid real node transition timestamps');
  }
  assert(snapshots.some(s=>s.method==='GET'&&s.transitions.some(t=>t.nodeId&&t.status==='running')),'Polling did not observe real node execution history');
  const history=page.getByTestId('workflow-transitions');await history.waitFor({state:'visible'});
  await waitFor(async()=>await history.locator('.el-table__body tbody tr').count()===transitions.length);
  assert((await history.innerText()).includes('Running'),'UI did not show recorded running transitions');
  const statusTag=page.getByTestId('workflow-execution-status');await waitFor(async()=>(await statusTag.innerText())==='Succeeded');
  const chart=page.getByTestId('workflow-profile-chart');await chart.waitFor({state:'visible'});
  await waitFor(async()=>await chart.locator('canvas').evaluate(c=>{if(!c.width||!c.height)return false;const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i+3]&&p[i]+p[i+1]+p[i+2]>180)n++;return n>100;}));
  report.asyncSnapshots.push({scenario:name,snapshots});
  await evidence(name+'.json',{jobId:job.id,submitted,result,snapshots});await shot(name+'.png');
  check(name,{jobId:job.id,polls:snapshots.filter(s=>s.method==='GET').length,observedStatuses:[...new Set(snapshots.map(s=>s.status))],observedNodeStatuses:[...new Set(transitions.filter(t=>t.nodeId).map(t=>t.status))]});
  return{result,submitted};
 }finally{page.off('response',listener);}
}
async function main(){
 await fs.mkdir(out,{recursive:true});
 let modulePath=process.env.WB_PLAYWRIGHT;
 if(!modulePath){try{modulePath=require.resolve('playwright');}catch{modulePath=execFileSync(process.env.GUANFENG_PYTHON||'python',['-c','import pathlib,playwright; print(pathlib.Path(playwright.__file__).parent / "driver" / "package")'],{encoding:'utf8',windowsHide:true}).trim();}}
 const pw=require(modulePath);request=await pw.request.newContext();
 task=data(await api('GET','/api/wb/generation/'+taskId));assert(task.status==='ready','Specified generation task is not ready');
 assert(task.plan?.workflow || task.workflow,'Task lacks a real generated workflow');
 const source=task.workflow || task.plan.workflow;
 await evidence('generated-task-source.json',{id:task.id,status:task.status,plan:task.plan,workflow:source,sourceHash:createHash('sha256').update(JSON.stringify(canonical(source))).digest('hex')});
 browser=await pw.chromium.launch({executablePath:process.env.WB_CHROME||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 context=await browser.newContext({viewport:{width:1920,height:1080}});await context.addCookies([{name:'language',value:'En',url:frontend}]);context.setDefaultTimeout(12000);
 page=await context.newPage();page.on('pageerror',e=>report.errors.push(clean(e.message)));
 page.on('request',r=>{if(r.url().includes('/api/wb/projects/demo')&&['PUT','POST','DELETE'].includes(r.method()))report.sharedWrites++;});
 await page.goto(frontend+'/workbench',{waitUntil:'domcontentloaded'});
 await showTask();assert(await page.getByTestId('edit-generated-workflow').isDisabled(),'Unauthenticated import button was enabled');check('no-session-import-disabled');
 await join('viewer');await showTask();assert(await page.getByTestId('edit-generated-workflow').isDisabled(),'Viewer import button was enabled');check('viewer-import-disabled');await revoke(true);
 await join('editor');original=data(await api('GET','/api/wb/projects/demo',undefined,true));await evidence('original-shared-project.json',{revision:original.revision,title:original.title,workflow:original.workflow});
 await tab('Workflow studio');await page.getByRole('button',{name:'Load project',exact:true}).click();await waitFor(async()=>await page.locator('.wb-dag-node').count()>0);
 const editable=original.workflow.nodes.find(n=>n.component==='quality')||original.workflow.nodes[0];const unsaved={...editable.params,threshold:12};await params(editable.id,unsaved,false);
 await showTask();await page.getByTestId('edit-generated-workflow').click();
 await page.locator('.el-message-box').getByRole('button',{name:'Cancel',exact:true}).click();
 await tab('Workflow studio');await selectNode(editable.id);assert(equal(JSON.parse(await page.getByRole('textbox',{name:'Parameters',exact:true}).inputValue()),unsaved),'Cancel discarded unsaved local parameters');await unchanged();check('dirty-import-cancel-preserves-local-and-shared-project');
 await showTask();await page.getByTestId('edit-generated-workflow').click();await page.locator('.el-message-box').getByRole('button',{name:'Confirm',exact:true}).click();
 await page.getByTestId('generated-workflow-draft').waitFor({state:'visible'});assert((await page.getByTestId('generated-workflow-draft').innerText()).includes(taskId),'Draft lacks real source task ID');
 assert(equal(await page.locator('.wb-dag-node').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),source.nodes.map(n=>n.id)),'Canvas node IDs differ from generated workflow');
 for(const node of source.nodes){await selectNode(node.id);assert(equal(JSON.parse(await page.getByRole('textbox',{name:'Parameters',exact:true}).inputValue()),node.params||{}),'Imported params differ from generated task');}
 await unchanged();check('confirmed-import-is-unsaved-real-generated-draft',{nodes:source.nodes.length,edges:source.edges.length});
 const first=await runUi('generated-baseline-run');assert(equal(first.submitted,source),'First executed workflow differs from generated workflow');
 const eventNode=source.nodes.find(n=>n.component==='events');assert(eventNode,'Generated workflow has no threshold event component');
 const threshold=Number(eventNode.params?.threshold||10)+1;await params(eventNode.id,{...eventNode.params,threshold});
 const second=await runUi('generated-edited-run');assert(second.submitted.nodes.find(n=>n.id===eventNode.id).params.threshold===threshold,'Edited threshold not submitted');
 const reader=source.nodes.find(n=>n.component==='reader'),quality=source.nodes.find(n=>n.component==='quality');
 const analysis=data(await api('POST','/api/wb/analysis',{...quality.params,...eventNode.params,datasetId:reader.params.datasetId,threshold}));
 const chart=second.result.result.chart;assert(equal(chart.data.summary,analysis.summary),'Edited canvas execution differs from real analysis API');assert(chart.data.provenance.threshold===threshold,'Returned provenance lost edited parameter');
 assert(second.result.result.summary.exceedCount!==first.result.result.summary.exceedCount,'Threshold change did not change real exceedance result');
 check('edited-generated-workflow-changes-real-result',{threshold,before:first.result.result.summary.exceedCount,after:analysis.summary.exceedCount});
 await unchanged();check('shared-project-not-saved',{revision:original.revision,sharedWrites:report.sharedWrites});
 assert(report.errors.length===0,'Uncaught browser errors');
}
(async()=>{
 try{await main();}
 catch(e){report.errors.push(clean(e.stack||e.message));report.blocked=Boolean(e.blocked);console.log((e.blocked?'BLOCKED':'FAILED')+': '+clean(e.message));if(page)await shot('failure.png').catch(()=>{});}
 finally{
  if(token){try{if(original){await unchanged();report.cleanup.push({action:'shared-project-preserved',status:'passed',revision:original.revision});}}catch(e){report.cleanup.push({action:'shared-project-preserved',status:'failed',message:clean(e.message)});}
   try{await revoke();}catch(e){report.cleanup.push({action:'session-leave',status:'failed',message:clean(e.message)});}}
  if(context)await context.close().catch(()=>{});if(browser)await browser.close().catch(()=>{});if(request)await request.dispose().catch(()=>{});
  report.finishedAt=new Date().toISOString();report.passed=report.errors.length===0 && report.cleanup.every(x=>x.status==='passed');report.credentialsPersisted=false;
  await evidence('results.json',report);console.log('Evidence: '+out);process.exitCode=report.passed?0:report.blocked?2:1;
 }
})();
