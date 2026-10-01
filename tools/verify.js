// Procura defeitos de base path nos arquivos do espelho.
// Uso:  node tools\verify.js
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const ROOT=path.join(__dirname,'..');
const EX=new Set(['tools','.git','node_modules','orig']);
function walk(d,o=[]){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(EX.has(f.name))continue;walk(p,o);}
 else if(/\.(html|js|mjs|css|webmanifest|json)$/.test(f.name))o.push(p);}return o;}

const RAW=require('./base');
const B=RAW?(String(RAW).startsWith('/')?String(RAW):'/'+String(RAW)).replace(/\/+$/g,''):'';
// diretorios que PRECISAM do base (outra coisa absoluta a partir da raiz = defeito)
const SEG='(?:platform|assets|css|js)';
const BAD=B?['undefined/','href="/"','src="/"','start_url":"/"','location.origin + \'/']:
             ['undefined/'];
let bad=0;
for(const f of walk(ROOT)){
  const t=fs.readFileSync(f,'utf8');
  const rel=path.relative(ROOT,f);
  for(const p of BAD)if(t.includes(p)){console.log('DEFEITO  '+JSON.stringify(p)+'  ->  '+rel);bad++;}
  if(!B)continue;
  // boot-redirect.js monta as URLs a partir de SITE_BASE (concatenacao) -> check.js valida em runtime
  if(rel.replace(/\\/g,'/')==='platform/js/shared/boot-redirect.js')continue;
  // raiz-escapadas: aspas + /seg/ sem o base (ignora chave de objeto literal: "..." + ':')
  let m;
  const naked=new RegExp('["\'`](\\/'+SEG+'\\/[^"\'`]*)["\'`]','g');
  while((m=naked.exec(t))){
    const after=t.slice(m.index+m[0].length,m.index+m[0].length+6);
    if(/^\s*:/.test(after))continue;          // import map / mapa de rotas
    console.log('SEM BASE '+m[1]+'  ->  '+rel);bad++;break;
  }
}
console.log('defeitos: '+bad);

if(process.argv.includes('--hash')){
  const h={};
  for(const f of walk(ROOT))h[path.relative(ROOT,f)]=crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
  fs.writeFileSync(process.argv[process.argv.indexOf('--hash')+1],JSON.stringify(h));
  console.log('snapshot gravado: '+Object.keys(h).length+' arquivos');
}
if(process.argv.includes('--cmp')){
  const a=JSON.parse(fs.readFileSync(process.argv[process.argv.indexOf('--cmp')+1],'utf8'));
  let d=0;
  for(const f of walk(ROOT)){const rel=path.relative(ROOT,f);
    const v=crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
    if(a[rel]!==v){console.log('DIFERE '+rel);d++;}}
  console.log('arquivos diferentes do snapshot: '+d);
}
