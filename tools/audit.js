// Audita referencias de assets: o que existe localmente, o que falta e onde achar no origem.
// Uso:  node tools\audit.js [--fetch]
const fs=require('fs'),path=require('path'),https=require('https');
const ROOT=path.join(__dirname,'..');
const ORIGIN='https://flappygamepay.site';
const FETCH=process.argv.includes('--fetch');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const EX=new Set(['tools','.git','node_modules']);
const SKIP=new Set(['pages/register.html/index.html']);

function walk(d,o=[]){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
  if(f.isDirectory()){if(EX.has(f.name))continue;walk(p,o);}
  else if(/\.(html|js|css|json|webmanifest|txt)$/i.test(f.name))o.push(p);}return o;}

const ASSET=/["'(]([a-zA-Z0-9_\-\./]*\.(?:png|jpe?g|svg|webp|gif|ico|mp3|mp4|woff2?|ttf|otf|css|js|json|txt))(\?[^"')\s]*)?["')]/gi;
const refs=new Map(); // relDoArquivo -> Set(refs)

for(const f of walk(ROOT)){
  const rel=path.relative(ROOT,f).replace(/\\/g,'/');
  const dir=path.posix.dirname(rel);
  const t=fs.readFileSync(f,'utf8');
  let m;
  while((m=ASSET.exec(t))){
    let u=m[1];
    if(/^(https?:|data:|\/\/)/i.test(u))continue;
    if(!refs.has(rel))refs.set(rel,new Set());
    refs.get(rel).add(u);
  }
}

const localSet=new Set();
(function scanAssets(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
  if(f.isDirectory()){if(EX.has(f.name)||f.name==='tools')continue;scanAssets(p);}
  else localSet.add(path.relative(ROOT,p).replace(/\\/g,'/'));}})(ROOT);

function resolveLocal(relFile,u){
  const dir=path.posix.dirname(relFile);
  let p=path.posix.normalize(path.posix.join(dir,u));
  if(p.startsWith('../'))p=p.slice(3);
  return p.replace(/^\.\//,'');
}

const missing=new Map(); // caminho provavel -> [referencia, arquivo]
const ok=[];
for(const [file,set] of refs){
  for(const u of set){
    const cand=resolveLocal(file,u);
    if(localSet.has(cand)){ok.push(cand);continue;}
    // tenta pela raiz do site (o runtime resolve a partir do documento)
    const rootish=u.replace(/^(\.\.\/)+/,'').replace(/^\.\//,'');
    if(localSet.has(rootish)){ok.push(rootish);continue;}
    if(!missing.has(rootish))missing.set(rootish,[]);
    missing.get(rootish).push(file+'  <-  '+u);
  }
}
console.log('refs resolvidas: '+ok.length);
console.log('faltando: '+missing.size);
for(const [k,v] of missing)console.log('  FALTA '+k+'\n         '+v.slice(0,2).join('\n         '));

if(FETCH){
  function head(u){return new Promise(res=>{
    const r=https.get(u,{headers:{'user-agent':UA},timeout:30000},s=>{s.resume();
      if(s.statusCode>=300&&s.statusCode<400&&s.headers.location)return res({code:s.statusCode,loc:s.headers.location});
      res({code:s.statusCode});});
    r.on('error',()=>res({code:0}));r.on('timeout',()=>{r.destroy();res({code:0});});
  });}
  function get(u){return new Promise((res,rej)=>{
    const r=https.get(u,{headers:{'user-agent':UA},timeout:45000},s=>{
      if(s.statusCode>=300&&s.statusCode<400&&s.headers.location)return res(get(new URL(s.headers.location,u).href));
      if(s.statusCode!==200){s.resume();return rej(new Error(u+' -> '+s.statusCode));}
      const c=[];s.on('data',d=>c.push(d));s.on('end',()=>res(Buffer.concat(c)));
    });
    r.on('error',rej);r.on('timeout',()=>r.destroy(new Error('timeout')));});}

  (async()=>{
    let got=0,notfound=0;
    for(const [k] of missing){
      const url=ORIGIN+'/'+k.replace(/^\//,'');
      const h=await head(url);
      if(h.code===200){
        try{
          const buf=await get(url);
          const p=path.join(ROOT,k);
          fs.mkdirSync(path.dirname(p),{recursive:true});
          fs.writeFileSync(p,buf);
          console.log('BAIXOU '+k+'  '+buf.length);
          got++;
        }catch(e){console.log('ERRO '+k+' '+e.message);}
      }else{
        console.log('NAO EXISTE NO ORIGEM '+k+'  (http '+h.code+')');
        notfound++;
      }
    }
    console.log('\nbaixados: '+got+'   nao existem: '+notfound);
  })().catch(e=>{console.error('FATAL',e);process.exit(1)});
}
