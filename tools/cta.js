// Mostra o contexto do CTA "acessar agora" e todos os <a> da landing.
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const lower=html.toLowerCase();
for(const kw of ['acessar','jogar agora','agora','login','register']){
  let i=0,n=0;
  while((i=lower.indexOf(kw,i))>=0&&n<3){
    console.log('\n--- "'+kw+'" @'+i+' ---');
    console.log(JSON.stringify(html.slice(Math.max(0,i-300),i+250)));
    i+=kw.length;n++;
  }
}
console.log('\n=== todos os <a ...> ===');
const re=/<a\b[^>]*>[\s\S]*?<\/a>/gi;let m;
while((m=re.exec(html))){
  const tag=m[0].replace(/\s+/g,' ');
  if(tag.length>400)console.log('  '+tag.slice(0,400)+' ...');
  else console.log('  '+tag);
}
