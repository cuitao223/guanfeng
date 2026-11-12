const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
const {validate}=require('./validate-source.cjs');
const frontend=path.resolve(__dirname,'../frontend');
const app=`<script>
import {analyze} from './api.js';
export default {name:'Generated',data(){return {result:null,language:'En',messages:{Cn:{title:'????'},En:{title:'Observation analysis'}}}},computed:{text(){return this.messages[this.language]}},methods:{async load(){this.result=await analyze({datasetId:'test-fixture'})}},mounted(){this.load()}};
</script><template><main><h1>{{text.title}}</h1><pre>{{result}}</pre></main></template><style>main{padding:20px}</style>`;
const api=`export async function loadDatasets(){const r=await fetch('/runtime/datasets');return (await r.json()).data}\nexport async function analyze(params){const r=await fetch('/runtime/analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params)});return (await r.json()).data}\nexport async function validateWorkflow(workflow){const r=await fetch('/runtime/workflow/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(workflow)});return (await r.json()).data}\nexport async function runWorkflow(workflow){const r=await fetch('/runtime/workflow/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(workflow)});return (await r.json()).data}`;
function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),'guanfeng-generation-test-'));fs.mkdirSync(path.join(root,'src'));fs.writeFileSync(path.join(root,'src/App.vue'),app);fs.writeFileSync(path.join(root,'src/api.js'),api);fs.writeFileSync(path.join(root,'src/main.js'),"import {createApp} from 'vue';import App from './App.vue';createApp(App).mount('#app');");fs.writeFileSync(path.join(root,'index.html'),`<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>`);return root}
function run(args){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,TEMP:process.env.TEMP},windowsHide:true});let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);child.on('error',reject);child.on('exit',code=>resolve({code,output}));})}
test('source policy accepts local Vue/API and rejects restricted capabilities',()=>{
 const root=fixture();assert.equal(validate(root,frontend).status,'passed');
 fs.writeFileSync(path.join(root,'src/App.vue'),app.replace('export default {','export default {setup(){return {}},'));assert.throws(()=>validate(root,frontend));fs.writeFileSync(path.join(root,'src/App.vue'),app);
 for(const malicious of ["fetch('https://example.invalid')","const f=fetch;f('/runtime/analysis')","import fs from 'node:fs'","const x=globalThis","const x=({})['con'+'structor']","const x=({}).constructor","const x=Function('return 1')()","import('vue')"]){fs.writeFileSync(path.join(root,'src/api.js'),malicious);assert.throws(()=>validate(root,frontend),undefined,malicious)}
 fs.writeFileSync(path.join(root,'src/api.js'),api);
 for(const bad of ['<iframe src="/runtime/analysis"></iframe>','<div v-html="x"></div>','<component :is="x"/>','<style>@import "evil";</style>']){fs.writeFileSync(path.join(root,'src/App.vue'),app+bad);assert.throws(()=>validate(root,frontend),undefined,bad)}
});
test('actual fixed Vite build, process health, runtime proxy and stop',async()=>{
 const root=fixture();const built=await run([path.join(__dirname,'build.cjs'),root,frontend]);assert.equal(built.code,0,built.output);assert.ok(fs.existsSync(path.join(root,'dist/index.html')));
 const id='11111111-1111-4111-8111-111111111111', ownerId='explicit-synthetic-test-owner';
 let forwarded;
 const backend=http.createServer((req,res)=>{if(req.url.endsWith('/owner'))return res.end(JSON.stringify({code:200,data:{ownerId}}));let body='';req.on('data',x=>body+=x);req.on('end',()=>{forwarded={url:req.url,method:req.method,body:JSON.parse(body)};res.setHeader('Content-Type','application/json');res.end(JSON.stringify({code:200,data:{label:'explicit synthetic proxy test only'}}))})});
 await new Promise(resolve=>backend.listen(0,'127.0.0.1',resolve));
 const port=backend.address().port;
 const child=spawn(process.execPath,[path.join(__dirname,'runtime-server.mjs'),root,`http://127.0.0.1:${port}`,id,String(port),ownerId],{env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot},windowsHide:true});
 try{
  const startup=await Promise.race([new Promise((resolve,reject)=>{child.stdout.once('data',x=>{try{resolve(JSON.parse(x.toString()))}catch(e){reject(e)}});child.once('error',reject);child.once('exit',code=>reject(Error('runtime exited '+code)))}),new Promise((_,reject)=>setTimeout(()=>reject(Error('startup timeout')),8000).unref())]);
  const url=`http://127.0.0.1:${startup.port}`;const health=await fetch(url+'/health');assert.equal((await health.json()).generationId,id);
  const page=await fetch(url+'/');assert.equal(page.status,200);assert.match(page.headers.get('content-security-policy'),/connect-src 'self'/);assert.match(await page.text(),/id="app"/);
  const analysis=await fetch(url+'/runtime/analysis',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({threshold:17})});assert.equal(analysis.status,200);assert.equal(forwarded.url,`/api/wb/generation/${id}/runtime/analysis`);assert.deepEqual(forwarded.body,{threshold:17});
  assert.equal((await fetch(url+'/runtime/analysis')).status,405);assert.equal((await fetch(url+'/not-a-file')).status,404);
 }finally{const exit=new Promise(resolve=>child.once('exit',resolve));child.kill();await exit;await new Promise(resolve=>backend.close(resolve));}
});
