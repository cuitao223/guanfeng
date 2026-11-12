const fs = require('node:fs');
const path = require('node:path');
function validate(root, frontend) {
  const req = require('node:module').createRequire(path.join(frontend, 'package.json'));
  const parser = req('@babel/parser');
  const sfc = req('@vue/compiler-sfc');
  const forbidden = /\b(?:window|document|globalThis|self|top|parent|frames|location|navigator|localStorage|sessionStorage|indexedDB|caches|eval|Function|constructor|__proto__|prototype|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|ServiceWorker|WebAssembly|process|require|Deno|Bun|Buffer|Reflect|Proxy|setTimeout|setInterval|importScripts|innerHTML|outerHTML|insertAdjacentHTML|ownerDocument|defaultView|contentWindow|sendBeacon|open|defineProperty|getPrototypeOf|createElement|createElementNS)\b/;
  function walk(node, api = false, compiled = false, parent = null) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'ImportDeclaration' && !compiled && node.source.value !== './api.js') throw Error('Only ./api.js imports are allowed');
    if (['ImportExpression','MetaProperty','TaggedTemplateExpression','ExportAllDeclaration'].includes(node.type)) throw Error('Dynamic code or re-exports are restricted');
    if (node.type === 'CallExpression' && node.callee.type === 'Import') throw Error('Dynamic imports are restricted');
    if (node.type === 'NewExpression' && !(node.callee.type === 'Identifier' && node.callee.name === 'Error')) throw Error('Only Error construction is allowed');
    if (node.type === 'Identifier' && forbidden.test(node.name)) throw Error('Restricted decoded identifier');
    if ((node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') && node.object?.type === 'ThisExpression' && (node.computed || node.property?.type !== 'Identifier' || node.property.name.startsWith('$'))) throw Error('Dangerous this property access is restricted');
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'fetch' && (!api || node.arguments[0]?.type !== 'StringLiteral' || !['/runtime/datasets','/runtime/dataset','/runtime/analysis','/runtime/workflow/validate','/runtime/workflow/run'].includes(node.arguments[0].value))) throw Error('fetch must use a fixed local runtime endpoint. In EACH exported API function write fetch("/runtime/analysis", options) or its appropriate allowlisted path DIRECTLY. The first argument must be a quoted string literal, never a variable, constant, template literal or helper parameter. Do not use a generic post(path,body) or request(url,options) wrapper.');
    if (node.type === 'Identifier' && node.name === 'fetch' && !(parent?.type === 'CallExpression' && parent.callee === node)) throw Error('fetch cannot be aliased');
    if (node.type === 'StringLiteral' && /(?:https?:|wss?:|file:|data:|javascript:|\/\/)/i.test(node.value)) throw Error('External addresses and executable URLs are restricted');
    for (const [key, value] of Object.entries(node)) if (!['loc','start','end','extra'].includes(key)) { if (Array.isArray(value)) value.forEach(child => walk(child, api, compiled, node)); else if (value && typeof value === 'object') walk(value, api, compiled, node); }
  }
  function parseJs(source, api = false, compiled = false) { if (forbidden.test(source)) throw Error('Restricted browser capability in generated source');
const ast=parser.parse(source,{sourceType:'module'}); walk(ast,api,compiled); return ast; }
  const app=fs.readFileSync(path.join(root,'src/App.vue'),'utf8');
  if (/(?:https?:|wss?:|javascript:|file:|data:(?=[\/\"'])|\/\/|@import|url\s*\(|v-html|<\s*(?:iframe|object|embed|link|meta|base|component)\b)/i.test(app)) throw Error('Restricted template, CSS or address');
  const parsed=sfc.parse(app); if(parsed.errors.length) throw Error(parsed.errors.map(String).join('\n'));
  if(parsed.descriptor.scriptSetup || !parsed.descriptor.script || parsed.descriptor.script.src || parsed.descriptor.template?.src || parsed.descriptor.styles.some(s=>s.src||s.lang||/[@\\]/.test(s.content)) || parsed.descriptor.customBlocks.length) throw Error('A plain Options API script and plain CSS are required');
  const script=parseJs(parsed.descriptor.script.content); const exported=script.program.body.find(n=>n.type==='ExportDefaultDeclaration');
  if(!exported || exported.declaration.type!=='ObjectExpression') throw Error('Options API export default object is required');
  const names=new Set(exported.declaration.properties.filter(p=>p.type==='ObjectProperty'||p.type==='ObjectMethod').map(p=>p.key.name));
  for(const required of ['data','computed','methods','mounted']) if(!names.has(required)) throw Error('Options API requires '+required); if(names.has('setup')) throw Error('setup is forbidden');
  const tpl=sfc.compileTemplate({source:parsed.descriptor.template.content,filename:'App.vue',id:'generation'}); if(tpl.errors.length) throw Error(tpl.errors.map(String).join('\n')); parseJs(tpl.code,false,true); parseJs(fs.readFileSync(path.join(root,'src/api.js'),'utf8'),true);
  return {status:'passed',files:['src/App.vue','src/api.js'],policy:'restricted-vue-options-api-v2'};
}
module.exports={validate};
if(require.main===module){try{console.log(JSON.stringify(validate(process.argv[2],process.argv[3])))}catch(e){console.error(e.message);process.exitCode=1}}
