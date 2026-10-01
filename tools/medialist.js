// Relatorio: arquivos de midia locais x refs de midia citadas (e onde resolvem).
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const EX=new Set(['.git','tools','node_modules','orig']);
const MEDIA=/\.(png|jpe?g|webp|gif|svg|ico|bmp|avif|mp4|webm|mov|m3u8|mpd|mp3|ogg|wav|m4a|aac|flac|woff2?|ttf|otf|eot)$/i;
const local=[];
(function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);
 if(f.isDirectory()){if(EX.has(f.name))continue;walk(p);continue;}
 if(MEDIA.test(f.name))local.push(path.relative(ROOT,p).replace(/\\/g,'/'+''+'/'));}})(ROOT);
console.log('=== ARQUIVOS DE MIDIA LOCAIS: '+local.length+' ===');
local.sort().forEach(f=>console.log('  '+f));
