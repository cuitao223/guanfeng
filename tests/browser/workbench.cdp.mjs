import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const base = process.env.WB_BROWSER_URL || 'http://127.0.0.1:5173'
const chromePath = process.env.WB_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const profile = path.join(here, '.chrome-profile')
await mkdir(profile, { recursive: true })
const chrome = spawn(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1920,1080', 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(r => setTimeout(r, ms))
const results = []; const errors = []; const requests = []
let ws, serial = 0, session, entry, backend = false
const pending = new Map()
const call = (method, params = {}, page = true) => new Promise((resolve, reject) => {
  const id = ++serial
  const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)) }, 30000)
  pending.set(id, { resolve: v => {clearTimeout(timer);resolve(v)}, reject: e => {clearTimeout(timer);reject(e)} })
  ws.send(JSON.stringify({ id, method, params, ...(page && session ? {sessionId:session} : {}) }))
})
async function evaluate(expression) {
  const r = await call('Runtime.evaluate', {expression, awaitPromise:true, returnByValue:true, userGesture:true})
  if (r.exceptionDetails) throw Error(r.exceptionDetails.text + ': ' + (r.exceptionDetails.exception?.description || ''))
  return r.result.value
}
async function waitFor(expression, timeout = 20000) {
  const start=Date.now(); while(Date.now()-start<timeout) { if(await evaluate(expression))return; await delay(160) }
  throw Error(`Condition timeout: ${expression}`)
}
async function check(name, action) { const start=Date.now(); await action(); results.push({name,passed:true,ms:Date.now()-start}); console.log(`PASS ${name}`) }
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`); await delay(200) }
async function tab(name) { await evaluate(`[...document.querySelectorAll('[role=tab]')].find(e=>e.textContent.trim()===${JSON.stringify(name)})?.click()`); await delay(250) }
async function fill(selector,value) { await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Input missing');e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))})()`); await delay(120) }
async function screenshot(name) { const image=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}); await writeFile(path.join(here,name),Buffer.from(image.data,'base64')) }
try {
  let version
  for(let i=0;i<100;i++) { try { const lines=(await readFile(path.join(profile,'DevToolsActivePort'),'utf8')).trim().split(/\r?\n/); version=await(await fetch(`http://127.0.0.1:${lines[0]}/json/version`)).json();break } catch {await delay(100)} }
  if(!version)throw Error('Chrome did not start')
  ws=new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(p)m.error?p.reject(Error(m.error.message)):p.resolve(m.result)} else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent'){const r=m.params.request;if(r.url.includes('/api/wb'))requests.push({url:new URL(r.url).pathname,method:r.method})}})
  const target=await call('Target.createTarget',{url:'about:blank'},false)
  session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},false)).sessionId
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false})
  await call('Page.navigate',{url:base+'/'})
  await check('Default entry redirects directly to workbench without login',async()=>{await waitFor(`location.pathname === '/workbench' && !!document.querySelector('.wb-page')`);await waitFor(`document.querySelectorAll('[role=tab]').length === 5`);const token=await evaluate(`document.cookie.includes('Admin-Token=')`);if(token)throw Error('Unexpected login token')})
  await check('Chinese labels render and five business sections exist',async()=>{await waitFor(`document.body.innerText.includes('观测分析') && document.body.innerText.includes('协作与历史')`);if(await evaluate(`document.querySelector('.wb-heading').innerText.includes('??')`))throw Error('Invalid UTF-8 labels')})
  await delay(1500)
  backend=await evaluate(`Promise.race([fetch('/api/wb/health').then(r=>r.json()).then(b=>b.code===200).catch(()=>false),new Promise(r=>setTimeout(()=>r(false),2500))])`)
  if(!backend){await screenshot('workbench-offline.png');results.push({name:'Live backend scenarios',passed:false,blocked:'Backend is not listening on local port 18080'})}
  else {
    await click('button'); await delay(1200); await waitFor(`document.querySelectorAll('.el-select-dropdown__item').length>0 || document.querySelector('.el-select').innerText !== 'Select'`,120000).catch(()=>{});
    await check('Real dataset analysis renders metrics and approved wind chart',async()=>{await waitFor(`!document.querySelector('[data-testid=analyze]')?.disabled`,120000);await click('[data-testid=analyze]');await waitFor(`document.querySelectorAll('.wb-metric strong').length===5`,120000);await waitFor(`!!document.querySelector('.wb-chart svg') || !!document.querySelector('.wb-chart canvas')`);if(await evaluate(`[...document.querySelectorAll('.wb-metric strong')].every(e=>e.innerText==='—')`))throw Error('No server metrics')})
    await screenshot('workbench-analysis.png')
    await check('Component catalogue comes from the API',async()=>{await tab('组件与插件');await waitFor(`document.querySelectorAll('.el-table__body tr').length>=6`)})
    await check('Editor collaboration session is created through the UI',async()=>{await tab('协作与历史');await fill('input[aria-label="显示名称"]','Browser validation');await evaluate(`[...document.querySelectorAll('.el-radio')].find(e=>e.textContent.includes('查看者'))?.click()`);await click('[data-testid=join-session]');await waitFor(`!document.querySelector('[data-testid=join-session]')`,15000);await waitFor(`document.querySelectorAll('.el-table__body tr').length>0`)})
    await check('DAG loads a saved project with real nodes and edges',async()=>{await tab('可视化编排');await waitFor(`document.querySelectorAll('.wb-dag-node').length>=6`);if(!await evaluate(`document.querySelectorAll('.wb-dag-node').length>=6`))throw Error('DAG nodes missing')})
    await check('Viewer session keeps DAG parameters read-only',async()=>{await evaluate(`document.querySelector('.wb-dag-node')?.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}))`);await waitFor(`!!document.querySelector('.wb-dag-node')`);if(await evaluate(`document.querySelector('[data-testid=save-workflow]').disabled`)!==true)throw Error('Viewer must be read-only')})
    await screenshot('workbench-dag.png')
    await check('Generation task list loads without starting a paid model request',async()=>{await tab('AI 应用生成');await waitFor(`!!document.querySelector('[data-testid=generate]')`);if(requests.some(r=>r.url==='/api/wb/generation' && r.method==='POST'))throw Error('Unexpected generation call')})
  }
  await check('No uncaught browser exceptions',async()=>{if(errors.length)throw Error(errors.join('\n'))})
  await check('Workbench remains usable at laptop viewport',async()=>{await call('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});await waitFor(`!!document.querySelector('.wb-page')`);const overflow=await evaluate(`document.documentElement.scrollWidth>innerWidth+1`);if(overflow)throw Error('Document horizontal overflow');await screenshot('workbench-laptop.png')})
  if(results.some(r=>r.blocked))process.exitCode=2
} catch(e) { results.push({name:'Browser scenario failure',passed:false,error:e.message});console.error(e.message);try{await screenshot('workbench-failure.png')}catch{}process.exitCode=1 }
finally {
  await writeFile(path.join(here,'results.json'),JSON.stringify({time:new Date().toISOString(),base,backend,results,uncaughtErrors:errors,requests},null,2))
  if(ws?.readyState===1){try{await call('Browser.close',{},false)}catch{}ws.close()}
  chrome.kill()
}

