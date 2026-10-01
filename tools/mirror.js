// Crawler do espelho estatico de flappygamepay.site
// Uso:  node tools\mirror.js
const fs=require('fs'),path=require('path'),http=require('http'),https=require('https');
const ORIGIN='https://flappygamepay.site';
const OUT=path.join(__dirname,'..');
const seen=new Set(),queue=[],routes=new Set();
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';

function get(u,bin){return new Promise((res,rej)=>{
  const mod=u.startsWith('https')?https:http;
  const r=mod.get(u,{headers:{'user-agent':UA,'accept':'*/*'},timeout:45000},(s)=>{
    if(s.statusCode>=300&&s.statusCode<400&&s.headers.location)return res(get(new URL(s.headers.location,u).href,bin));
    if(s.statusCode!==200){s.resume();return rej(new Error(u+' -> '+s.statusCode));}
    const c=[];s.on('data',d=>c.push(d));s.on('end',()=>res(bin?Buffer.concat(c):Buffer.concat(c).toString('utf8')));
  });
  r.on('error',rej);r.on('timeout',()=>r.destroy(new Error('timeout '+u)));
});}

function save(rel,buf){
  const p=path.join(OUT,rel.replace(/^\/+/,''));
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,buf);
}
function abs(u,base){try{return new URL(u,base).href}catch(e){return null}}

function pushUrl(u){
  if(!u||/^(data:|mailto:|#|javascript:)/.test(u))return;
  if(u.startsWith('http')&&!u.startsWith(ORIGIN))return;
  const url=u.startsWith('http')?u:ORIGIN+(u.startsWith('/')?u:'/'+u);
  if(seen.has(url))return;seen.add(url);queue.push(url);
}

const extRe=/\.(js|css|woff2?|ttf|otf|png|jpe?g|webp|gif|svg|ico|mp3|mp4|webm|wav|ogg|m4a|m3u8|ts|json|webmanifest|txt|xml|map|avif|bmp|webp)(\?|$)/i;
function collectRefs(text,base){
  if(!text)return;
  const re=/(?:src|href|srcSet|url|from|import)\s*[:=]?\s*["'`]([^"'`]+)["'`]|["'`](\.{0,2}\/[^"'`\s)]*)["'`]|["'`]([^"'`\s)]+\.(?:png|jpe?g|webp|gif|svg|ico|mp3|mp4|webm|wav|ogg|m4a|m3u8|ts|woff2?|css|js|json|map)(\?[^"'`\s)]*)?)["'`]/gi;
  let m;
  while((m=re.exec(text))){
    let u=m[1]||m[2]||m[3];
    if(!u)continue;
    if(u.startsWith('//')||u.startsWith('data:')||u.startsWith('#'))continue;
    if(u.startsWith('http')&&!u.startsWith(ORIGIN))continue;
    if(!extRe.test(u)&&!/\.html?(\?|$)/i.test(u))continue;
    const a=abs(u,base);
    if(a&&a.startsWith(ORIGIN))pushUrl(a);
  }
}
function collectRoutes(text){
  if(!text)return;
  const re=/["'`](\/[a-z0-9][a-z0-9\-\/]{0,40})["'`]/gi;
  let m;
  while((m=re.exec(text))){
    const p=m[1];
    if(/\.(png|jpe?g|webp|gif|svg|ico|mp3|mp4|js|css|m3u8|ts|woff2?|json|webmanifest|txt|xml|map|webm|wav|ogg)(\?|$)/i.test(p))continue;
    if(p.startsWith('/api/'))continue;
    if(/\/(node_modules|src|app|pages|components|lib|public|_vercel)/.test(p))continue;
    if(p.split('/').filter(Boolean).length<=3)routes.add(p);
  }
}

const SEEDS=['/','/login','/register','/dashboard','/admin','/admin-login','/manager','/manager-login','/manager-register','/game'];

(async()=>{
  SEEDS.forEach(p=>pushUrl(ORIGIN+p));
  let guard=0;
  while(queue.length&&guard<4000){
    guard++;
    const url=queue.shift();
    let buf;
    try{buf=await get(url,true);}catch(e){console.log('FAIL',e.message);continue;}
    const p=new URL(url).pathname;
    const head=buf.slice(0,400).toString('utf8').toLowerCase();
    const isHtml=head.includes('<!doctype')||head.includes('<html');
    if(isHtml||/\.(txt|xml|webmanifest|json)(\?|$)/i.test(p)){
      const rel=p==='/'?'/index.html':(extRe.test(p)?p:(p.replace(/\/+$/,'')+'/index.html'));
      save(rel,buf);
      const t=buf.toString('utf8');
      collectRefs(t,url);
      if(isHtml){collectRoutes(t);console.log('HTML ',p,'->',rel,buf.length);}
      else console.log('JSON ',p,buf.length);
    }else{
      save(p,buf);console.log('ASSET',p,buf.length);
      if(/\.(js|css|map|m3u8)$/i.test(p)){const t=buf.toString('utf8');collectRefs(t,url);collectRoutes(t);}
    }
    // rotas descobertas -> busca o HTML delas
    for(const r of [...routes]){
      const u=ORIGIN+(r==='/'?'/':r);
      if(!seen.has(u))pushUrl(u);
    }
    if(queue.length>3000)break;
  }
  fs.writeFileSync(path.join(__dirname,'routes.json'),JSON.stringify([...routes].sort(),null,2));
  console.log('\nROUTES:',[...routes].sort().join('  '));
  console.log('DONE urls=',seen.size);
})().catch(e=>{console.error('FATAL',e);process.exit(1)});
