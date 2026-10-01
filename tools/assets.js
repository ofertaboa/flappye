// Baixa para o lugar certo TODO asset (imagem/audio/video/HLS/fonte/etc) referenciado pelo site.
//  - resolve refs relativas contra a pasta certa
//  - acha candidatos no servidor de origem quando falta localmente
// Uso:  node tools\assets.js            (dry-run)
//       node tools\assets.js --fetch    (baixa os que faltarem)
const fs=require('fs'),path=require('path');
const netfetch=globalThis.fetch;
const ROOT=path.join(__dirname,'..');
const ORIGIN='https://flappygamepay.site';
const FETCH=process.argv.includes('--fetch');
const EX=new Set(['.git','tools','node_modules','orig']);
const MEDIA=/\.(png|jpe?g|webp|gif|svg|ico|bmp|avif|mp4|webm|mov|mkv|m3u8|mpd|mp3|ogg|wav|m4a|aac|flac|woff2?|ttf|otf|eot|css|json|xml|txt|webmanifest|map)$/i;

const files=[];
(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(EX.has(f.name))continue;walk(p);continue;}
 if(/\.(html|js|mjs|css|json|webmanifest)$/i.test(f.name))files.push(p);}})(ROOT);

// rotas = diretorios com index.html
const ROUTES=[];
for(const f of fs.readdirSync(ROOT,{withFileTypes:true})){
  if(f.isDirectory()&&!EX.has(f.name)&&fs.existsSync(path.join(ROOT,f.name,'index.html')))ROUTES.push(f.name);
}
console.log('rotas: '+ROUTES.join(', '));

// --- extrai refs ---
const refs=new Map(); // origem(raw) -> arquivo que citou
function add(raw,from){if(!raw||raw.startsWith('data:')||raw.startsWith('#'))return;
  const k=raw.split('#')[0]; if(!k)return;
  const cur=refs.get(k); if(!cur||!cur.includes(from))refs.set(k,(cur?cur+',':'')+from);
}
for(const p of files){
  const rel=path.relative(ROOT,p);
  let t;try{t=fs.readFileSync(p,'utf8')}catch(e){continue}
  // html attrs + strings de js/css
  const re=/(?:href|src|data-src|poster|srcset|content)\s*=\s*"([^"]+)"|url\(\s*['"]?([^'")]+)|["'`]((?:https?:)?\/{2}[^"'`\s<>]*?\.(?:png|jpe?g|webp|gif|svg|ico|bmp|avif|mp4|webm|mov|m3u8|mpd|mp3|ogg|wav|m4a|aac|flac|woff2?|ttf|otf|eot|css|json|xml|txt|webmanifest|map)(?:\?[^"'`\s<>]*)?)["'`]|["'`]([^"'`\s<>()]*?\.(?:png|jpe?g|webp|gif|svg|ico|bmp|avif|mp4|webm|mov|m3u8|mpd|mp3|ogg|wav|m4a|aac|flac|woff2?|ttf|otf|eot)(?:\?[^"'`\s<>()]*)?)["'`]/gi;
  let m;while((m=re.exec(t)))add(m[1]||m[2]||m[3]||m[4],rel);
}
console.log('refs encontradas: '+refs.size);

// --- resolve localmente ---
const jobs=[]; // {url, dest}
const ok=[],missing=[];
for(const [raw,from] of refs){
  let u=raw.trim();
  if(/^https?:\/\//i.test(u)){
    const pth=(u.startsWith(ORIGIN)?u.slice(ORIGIN.length):null);
    if(pth===null){continue;}                       // externo de outro dominio: nao baixamos (fonts/unsplash ficam)
    if(!MEDIA.test(pth.split('?')[0]))continue;
    const dest=path.join(ROOT,decodeURIComponent(pth.split('?')[0]).replace(/^\//,''));
    if(fs.existsSync(dest)){ok.push(pth);continue;}
    jobs.push({url:u,dest,why:'abs'});
    continue;
  }
  if(!MEDIA.test(u.split('?')[0]))continue;
  const clean=decodeURIComponent(u.split('?')[0]).replace(/^\.\//,'');
  const cands=[];
  if(clean.startsWith('/')){
    let c=clean.replace(/^\//,'');
    if(c.startsWith('flappygamepay/')||c.startsWith('flappye/'))c=c.replace(/^[^/]+\//,'');
    cands.push(c);
  }else{
    // relativa: pasta do arquivo citante + cada rota (JS seta src em tempo de execucao na pagina)
    const dir=path.dirname(from);
    cands.push(path.join(dir,clean).replace(/\\/g,'/'));
    for(const r of ROUTES)cands.push(path.join(r,clean).replace(/\\/g,'/'));
    cands.push(clean);
  }
  let found=null;
  for(const c of cands){const c2=c.replace(/^\.\//,'');if(fs.existsSync(path.join(ROOT,c2))){found=c2;break;}}
  if(found){ok.push(found);continue;}
  missing.push({raw,from,cands:[...new Set(cands.map(c=>c.replace(/^\.\//,'')))]});
}
console.log('ok (ja locais): '+ok.length);
console.log('faltando      : '+missing.length);

// --- tenta achar os faltantes na origem e baixa ---
const results=[];
(async()=>{
  for(const m of missing){
    let got=null;
    for(const c of m.cands){
      const url=ORIGIN+'/'+c.replace(/\\/g,'/').replace(/^\/+/,'');
      try{
        const r=await netfetch(url,{method:'GET',signal:AbortSignal.timeout(20000),redirect:'follow'});
        if(r.status===200){
          const ct=r.headers.get('content-type')||'';
          if(/text\/html/i.test(ct))continue;
          got={url,dest:path.join(ROOT,c),buf:Buffer.from(await r.arrayBuffer())};
          break;
        }
      }catch(e){/* segue */}
    }
    if(!got){results.push(['404',m.raw,'('+m.from+')']);continue;}
    if(FETCH){
      fs.mkdirSync(path.dirname(got.dest),{recursive:true});
      fs.writeFileSync(got.dest,got.buf);
      results.push(['BAIXOU '+String(got.buf.length).padStart(7),m.raw,'-> '+path.relative(ROOT,got.dest)]);
    }else{
      results.push(['DISPONIVEL',m.raw,got.url]);
    }
  }
  results.sort();
  console.log('\n=== RESULTADO ===');
  results.forEach(r=>console.log('  '+r.join('  ')));
  const fail=results.filter(r=>r[0]==='404');
  console.log('\nbaixados/ok: '+(results.length-fail.length)+'   nao encontrados: '+fail.length+(FETCH?'':'  (dry-run: use --fetch)'));
})();
