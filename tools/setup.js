// Aplica o base path (tools/base.js) no codigo do espelho. Idempotente.
// Uso:  node tools\setup.js              -> base do GitHub Pages (/flappye)
//       node tools\setup.js --root       -> raiz do dominio (Netlify / Cloudflare / VPS)
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const argBase=(()=>{const a=process.argv.find(x=>x.startsWith('--base='));return a?a.slice(7):null})();
let B=(process.argv.includes('--root')?'' : argBase!==null?argBase : require('./base'));
B=String(B).trim().replace(/\/+$/g,'');           // '' = raiz do dominio
if(B&&!B.startsWith('/'))B='/'+B;
const ORIGIN='https://flappygamepay.site';
let changed=0;
function save(rel,before,after){ if(after===before){console.log('sem mudanca '+rel);return false;} fs.writeFileSync(path.join(ROOT,rel),after); changed++; console.log('PATCH '+rel); return true; }
function edit(rel,re,rep){
  const p=path.join(ROOT,rel);
  if(!fs.existsSync(p)){console.log('AUSENTE '+rel);return;}
  const before=fs.readFileSync(p,'utf8');
  const after=before.replace(re,rep);
  if(after!==before){fs.writeFileSync(p,after);changed++;console.log('PATCH '+rel);}
  else if(!re.test(before)&&!String(after).includes(B))console.log('JA OK? '+rel);
}
const has=(rel,s)=>{const p=path.join(ROOT,rel);return fs.existsSync(p)&&fs.readFileSync(p,'utf8').includes(s);};

/* ---------- boot-redirect.js ---------- */
const BR='platform/js/shared/boot-redirect.js';
if(fs.existsSync(path.join(ROOT,BR))){
  let t=fs.readFileSync(path.join(ROOT,BR),'utf8');
  const M='/*__SITE_BASE__*/';
  if(!t.includes(M)){
    t=t.replace("'use strict';", "'use strict';\n\n  var SITE_BASE = '"+B+"'; "+M);
  }else{
    t=t.replace(/var SITE_BASE = '[^']*'; \/\*__SITE_BASE__\*\//, "var SITE_BASE = '"+B+"'; "+M);
  }
  // isLocalDev -> sempre producao (o espelho e servido com a mesma estrutura em localhost tambem)
  t=t.replace(/function isLocalDev\(\)\s*\{[\s\S]*?\n  \}/,
    'function isLocalDev() {\n    return false;\n  }');
  // raiz do site com base
  t=t.replace(/function getSiteOriginRoot\(\)\s*\{\s*if \(!isLocalDev\(\)\) \{\s*return location\.origin;/,
    'function getSiteOriginRoot() {\n    if (!isLocalDev()) {\n      return location.origin + SITE_BASE;');
  // base do projeto com base
  t=t.replace(/function detectProjectBase\(\)\s*\{\s*if \(!isLocalDev\(\)\) \{\s*return '';/,
    "function detectProjectBase() {\n    if (!isLocalDev()) {\n      return SITE_BASE;");
  // urls de versao (evita 404 em /api e na raiz do dominio)
  t=t.replace(/return \{\s*auto: '\/api\/build-version\.php',\s*file: '\/platform\/js\/shared\/build\.txt',\s*\};/,
    "return {\n        auto: SITE_BASE + '/platform/js/shared/build.txt',\n        file: SITE_BASE + '/platform/js/shared/build.txt',\n      };");
  // <base href> injetado no head -> resolve TODOS os caminhos relativos do HTML
  t=t.replace(/var basePath = isLocalDev\(\) \? detectProjectBase\(\) : '';/,
    'var basePath = SITE_BASE;');
  // redirect de referral para /register
  t=t.replace(/\?\s*\(registerBase \+ '\/pages\/register\.html'\)\s*:\s*'\/register';/,
    "? (registerBase + '/pages/register.html')\n        : (SITE_BASE + '/register');");
  save(BR, fs.existsSync(path.join(ROOT,BR))?fs.readFileSync(path.join(ROOT,BR),'utf8'):'', t);
}

/* ---------- paths.js ---------- */
const PJ='platform/js/shared/paths.js';
if(fs.existsSync(path.join(ROOT,PJ))){
  let t=fs.readFileSync(path.join(ROOT,PJ),'utf8');
  const M='/*__SITE_BASE__*/';
  if(!t.includes(M)){
    if(/^(import|export|const|let|var) /m.test(t)) t=t.replace(/^(import[^\n]*\n)/m,"$1const SITE_BASE = '"+B+"'; "+M+"\n");
    if(!t.includes(M)) t="const SITE_BASE = '"+B+"'; "+M+"\n"+t;
  }else{
    t=t.replace(/const SITE_BASE = '[^']*'; \/\*__SITE_BASE__\*\//g,"const SITE_BASE = '"+B+"'; "+M);
  }
  // remove eventual duplicata deixada por versoes anteriores (so se houver mais de uma)
  const decl=/^const SITE_BASE = '[^']*'; \/\*__SITE_BASE__\*\/\n/gm;
  if((t.match(decl)||[]).length>1){
    t=t.replace(decl,(m,i)=>i===0?m:'');
  }
  t=t.replace(/export function isLocalHost\(\)\s*\{[\s\S]*?\n\}/,
    'export function isLocalHost() {\n  return false;\n}');
  t=t.replace(/export function projectBase\(\)\s*\{\s*if \(isProductionSite\(\)\) \{\s*return '';/,
    "export function projectBase() {\n  if (isProductionSite()) {\n    return SITE_BASE;");
  save(PJ, fs.existsSync(path.join(ROOT,PJ))?fs.readFileSync(path.join(ROOT,PJ),'utf8'):'', t);
}

/* ---------- api.js: aponta para a API real do origem (Pages nao roda PHP) ---------- */
const AP='platform/js/shared/api.js';
if(fs.existsSync(path.join(ROOT,AP))){
  let t=fs.readFileSync(path.join(ROOT,AP),'utf8');
  const M='/*__API_ORIGIN__*/';
  if(!t.includes(M)){
    t=t.replace(/^(import[^\n]*\n)+/m,m=>m+"const API_ORIGIN = '"+ORIGIN+"'; "+M+"\n");
  }
  t=t.replace(/return `\$\{window\.location\.origin\}\$\{projectRootPrefix\(\)\}\/api\/\$\{phpFile\}\$\{query\}`;/,
    'return `${API_ORIGIN}/api/${phpFile}${query}`;');
  save(AP, fs.existsSync(path.join(ROOT,AP))?fs.readFileSync(path.join(ROOT,AP),'utf8'):'', t);
}

/* ---------- HTML: o src do boot-redirect e resolvido ANTES do <base> injetado ---------- */
const shells=[];
(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
  if(f.isDirectory()){if(['tools','.git','node_modules'].includes(f.name))continue;walk(p);}
  else if(f.name==='index.html')shells.push(p);}})(ROOT);
for(const p of shells){
  const before=fs.readFileSync(p,'utf8');
  let t=before
    .replace(/src="\.\.\/platform\/js\/shared\/boot-redirect\.js"/g,'src="'+B+'/platform/js/shared/boot-redirect.js"')
    .replace(/src="platform\/js\/shared\/boot-redirect\.js"/g,'src="'+B+'/platform/js/shared/boot-redirect.js"')
    .replace(/src="\/[^"]*\/platform\/js\/shared\/boot-redirect\.js"/g,'src="'+B+'/platform/js/shared/boot-redirect.js"');
  if(t!==before){fs.writeFileSync(p,t);changed++;console.log('PATCH '+path.relative(ROOT,p));}
}

console.log('\nbase: '+B);
console.log('arquivos alterados: '+changed);
