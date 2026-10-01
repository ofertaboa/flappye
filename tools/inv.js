// Inventario: todas as refs (href/src), rotas internas e assets do espelho.
// Uso:  node tools\inv.js
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const EX=new Set(['.git','tools','node_modules','orig']);
const files=[];
(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(EX.has(f.name))continue;walk(p);continue;}
 if(/\.(html|js|mjs|css|json|webmanifest)$/i.test(f.name))files.push(p);}})(ROOT);

const ATTR=/(?:href|src|data-src|poster|srcset|content)\s*=\s*"([^"]+)"|'(https?:\/\/[^']+)'|(https?:\/\/[^\s"'<>`)]+\.(?:png|jpe?g|webp|gif|svg|ico|bmp|avif|mp3|ogg|wav|m4a|mp4|webm|m3u8|mpd|woff2?|ttf|otf|css|js|json|xml|txt)(?:\?[^\s"'<>`)]*)?)/gi;
const STR=/"((?:https?:)?\/{2}[^"]+?\.(?:png|jpe?g|webp|gif|svg|ico|bmp|avif|mp3|ogg|wav|m4a|mp4|webm|m3u8|mpd|woff2?|ttf|otf|css|js|json|xml|txt|html)(?:\?[^"]*)?)"|'((?:https?:)?\/{2}[^']+?\.(?:png|jpe?g|webp|gif|svg|ico|bmp|avif|mp3|ogg|wav|m4a|mp4|webm|m3u8|mpd|woff2?|ttf|otf|css|js|json|xml|txt|html)(?:\?[^']*)?)'/gi;

const attrs=[],routes=new Set(),ext=new Set();
for(const p of files){
  const rel=path.relative(ROOT,p);
  let t;try{t=fs.readFileSync(p,'utf8')}catch(e){continue}
  let m;
  const a=new RegExp(ATTR.source,'gi');
  while((m=a.exec(t))){
    let v=m[1]||m[2]||m[3]||'';
    if(!v)continue;
    attrs.push([rel,v]);
    if(/^https?:\/\//i.test(v))ext.add(v.split('#')[0]);
    else if(v.startsWith('/')||/^[a-z]/i.test(v)){
      const clean=v.split('?')[0].split('#')[0];
      if(/\.(png|jpe?g|webp|gif|svg|ico|bmp|avif|mp3|ogg|wav|m4a|mp4|webm|m3u8|mpd|woff2?|ttf|otf|css|js|json|xml|txt|html)$/i.test(clean))continue;
      if(clean&&clean!=='#')routes.add(clean);
    }
  }
  const s=new RegExp(STR.source,'gi');
  while((m=s.exec(t)))ext.add((m[1]||m[2]).split('#')[0]);
}
console.log('arquivos lidos: '+files.length);
console.log('attrs: '+attrs.length+'   rotas internas: '+routes.size+'   URLs externas: '+ext.size);
console.log('\n=== ROTAS INTERNAS ===');
[...routes].sort().forEach(r=>console.log('  '+r));
console.log('\n=== URLS EXTERNAS ===');
[...ext].sort().forEach(u=>console.log('  '+u));
if(process.argv.includes('--attrs')){
  console.log('\n=== ATTRS ===');
  attrs.forEach(a=>console.log('  '+a[0]+'  ->  '+a[1]));
}
