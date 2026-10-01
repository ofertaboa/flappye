// Verifica o espelho: rotas respondem 200 e TODAS as refs de arquivo resolvem.
// Uso:  node tools\check.js                 (http://localhost:8080)
//       set PORT=8090 && node tools\check.js
//       set SITE=https://ofertaboa.github.io && node tools\check.js
const fs=require('fs'),path=require('path');
const netfetch=globalThis.fetch;
const {scan,BASE,ROOT}=require('./scan');
const HOST=(process.env.SITE||('http://localhost:'+(process.env.PORT||8080))).replace(/\/+$/,'');
const ROUTES=['/','/login','/register','/dashboard','/admin','/admin-login','/manager','/manager-login','/manager-register','/game'];
const ASSET=/\.(png|jpe?g|webp|gif|svg|ico|bmp|avif|mp4|webm|m3u8|mp3|ogg|wav|m4a|woff2?|ttf|otf|css|js|json|xml|txt|webmanifest|map)$/i;
const url=u=>BASE&&!(u===BASE||u.startsWith(BASE+'/'))?BASE+u:u;
async function get(u){
  try{
    const s=await netfetch(u,{redirect:'follow',signal:AbortSignal.timeout(20000)});
    const b=Buffer.from(await s.arrayBuffer());
    return{code:s.status,len:b.length,url:s.url||u,err:''};
  }catch(e){return{code:0,len:0,url:u,err:e.message};}
}
(async()=>{
  const bad=[];
  console.log('SITE : '+HOST);
  console.log('base : '+JSON.stringify(BASE));
  console.log('\n=== ROTAS ===');
  for(const r of ROUTES){
    const x=await get(HOST+url(r));
    const ok=x.code===200;
    if(!ok)bad.push([r,x.code]);
    console.log((ok?'OK   ':'FALHA')+'  '+String(x.code)+'  '+r+'  '+x.len+(x.err?'  '+x.err:''));
  }
  const s=scan();
  console.log('\n=== REFS INTERNAS (filesystem) ===');
  let miss=0;
  for(const r of s.local){
    if(r.dest)continue;
    miss++;bad.push([r.ref,'404']);
    console.log('FAIL  404  '+r.ref+'   <- '+r.from);
  }
  console.log('  resolvendo: '+(s.local.length-miss)+'/'+s.local.length);

  console.log('\n=== REFS ABSOLUTAS SEM BASE ===');
  let esc=0;
  for(const a of s.abs){
    if(fs.existsSync(a.dest))continue;
    esc++;bad.push([a.ref,'404(raiz)']);
    console.log('FAIL  404  '+a.ref+'   <- '+a.from);
  }
  if(!esc)console.log('  (nenhuma)  total='+s.abs.length);

  console.log('\n=== URLS EXTERNAS DE ARQUIVO ===');
  let extBad=0,extOK=0;
  for(const e of s.ext){
    if(!ASSET.test(e.ref.split('?')[0]))continue;
    const x=await get(e.ref);
    if(x.code!==200){extBad++;bad.push([e.ref,x.code]);console.log('FAIL  '+String(x.code)+'  '+e.ref+'   <- '+e.from);}
    else extOK++;
  }
  console.log('  ok='+extOK+'  falhas='+extBad+'   (hosts sem extensao sao ignorados: fonts/api)');

  console.log('\n=== FALHAS: '+bad.length+' ===');
  bad.forEach(b=>console.log('  '+b.join('  ')));
  process.exit(bad.length?1:0);
})();
