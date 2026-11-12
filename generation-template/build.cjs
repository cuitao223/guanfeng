const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {validate} = require('./validate-source.cjs');
(async()=>{
 const root=path.resolve(process.argv[2]), frontend=path.resolve(process.argv[3]);
 console.log(JSON.stringify(validate(root,frontend)));
 const req=require('node:module').createRequire(path.join(frontend,'package.json'));
 const {build}=await import(pathToFileURL(req.resolve('vite')).href);
 const vue=req('@vitejs/plugin-vue');
 await build({configFile:false,envFile:false,root,base:'./',plugins:[vue()],resolve:{alias:{vue:path.join(frontend,'node_modules/vue/dist/vue.runtime.esm-bundler.js')}},build:{outDir:'dist',emptyOutDir:true,sourcemap:false},logLevel:'warn'});
 console.log(JSON.stringify({status:'built'}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
