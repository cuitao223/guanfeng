import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const [rootArg, backendArg, generationId, ownerPortArg, ownerIdArg] = process.argv.slice(2);
const root=path.resolve(rootArg,'dist'), backend=new URL(backendArg);
if(!['127.0.0.1','localhost'].includes(backend.hostname)) throw Error('Backend must be loopback');
const ownerPort=ownerPortArg || backend.port || '80';
// Resolve the current backend owner when a user restarts an exported app.
const ownerId=ownerIdArg || await new Promise((resolve,reject)=>{
 const request=http.get(new URL('/api/wb/generation/owner',backend),response=>{
  let body='';response.on('data',part=>body+=part);response.on('end',()=>{
   try{const value=JSON.parse(body).data.ownerId;if(!value)throw Error('Missing owner');resolve(value)}catch{reject(Error('Local backend owner is unavailable'))}
  });
 });request.setTimeout(5000,()=>request.destroy());request.on('error',()=>reject(Error('Local backend owner is unavailable')));
});
const routes={'/runtime/datasets':['GET','datasets'],'/runtime/dataset':['GET','dataset'],'/runtime/analysis':['POST','analysis'],'/runtime/workflow/validate':['POST','workflow/validate'],'/runtime/workflow/run':['POST','workflow/run']};
const csp="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'";
const server=http.createServer((req,res)=>{
 res.setHeader('Content-Security-Policy',csp);res.setHeader('X-Content-Type-Options','nosniff');
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/health') {res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({status:'healthy',generationId}));}
 const route=routes[url.pathname];
 if(route){
  if(req.method!==route[0]) {res.writeHead(405);return res.end();}
  const target=new URL(`/api/wb/generation/${generationId}/runtime/${route[1]}`,backend);
  if(route[1]==='dataset') target.search=url.search;
  let size=0; const chunks=[];
  req.on('data',chunk=>{size+=chunk.length;if(size>1048576)req.destroy();else chunks.push(chunk)});
  req.on('end',()=>{const proxy=http.request(target,{method:req.method,headers:{'content-type':'application/json'},timeout:30000},upstream=>{res.writeHead(upstream.statusCode,{'content-type':'application/json'});upstream.pipe(res)});proxy.on('timeout',()=>proxy.destroy());proxy.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end('{"error":"Local analysis runtime unavailable"}')});proxy.end(Buffer.concat(chunks))});return;
 }
 if(req.method!=='GET') {res.writeHead(405);return res.end();}
 let decoded;try{decoded=decodeURIComponent(url.pathname)}catch{res.writeHead(400);return res.end()}
 const file=path.resolve(root,'.'+(decoded==='/'?'/index.html':decoded));
 if(!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
 const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'};
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
server.listen(0,'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port,status:'listening'})));
let misses=0;
const watchdog=setInterval(()=>{const req=http.get(`http://127.0.0.1:${ownerPort}/api/wb/generation/owner`,res=>{let body='';res.on('data',x=>body+=x);res.on('end',()=>{try{if(JSON.parse(body).data.ownerId!==ownerId)process.exit(0);misses=0}catch{if(++misses>=3)process.exit(0)}})});req.setTimeout(3000,()=>req.destroy());req.on('error',()=>{if(++misses>=3)process.exit(0)})},10000);
process.on('SIGTERM',()=>{clearInterval(watchdog);server.close(()=>process.exit(0))});
