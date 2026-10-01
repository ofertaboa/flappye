// Dumpa o DOM final de uma URL apos o JS rodar e mostra a URL final + console.
// Uso:  node tools\dump.js <url> [--file out.html]
const {spawnSync}=require('child_process'),fs=require('fs'),path=require('path'),os=require('os');
const CHROME='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url=process.argv[2];
if(!url){console.log('uso: node tools\\dump.js <url>');process.exit(2);}
const res=spawnSync(CHROME,['--headless=new','--disable-gpu','--no-sandbox','--virtual-time-budget=15000',
  '--user-data-dir='+path.join(os.tmpdir(),'fgdump_'+Date.now()),'--enable-logging=stderr','--v=0','--dump-dom',url],
  {encoding:'utf8',timeout:180000,maxBuffer:64*1024*1024});
const html=res.stdout||'';
const noise=/AudioContext|beforeinstallprompt|preloaded using link|Download the React DevTools|favicon\.ico/i;
const errs=(res.stderr||'').split(/\r?\n/).filter(l=>l.includes('CONSOLE')&&!noise.test(l));
console.log('tamanho do dom: '+html.length);
console.log('erros de console: '+errs.length);
errs.slice(0,20).forEach(e=>console.log('  '+e.slice(0,300)));
const fi=process.argv.indexOf('--file');
if(fi>0&&process.argv[fi+1]){fs.writeFileSync(process.argv[fi+1],html);console.log('gravado: '+process.argv[fi+1]);}
else console.log('\n'+html.slice(0,3000));
