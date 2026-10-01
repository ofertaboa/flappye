// Relatorio detalhado das refs (usa o mesmo scan do check.js).
// Uso:  node tools\refs.js
const fs=require('fs');
const {scan,BASE}=require('./scan');
const s=scan();
console.log('base: '+JSON.stringify(BASE));
console.log('\n=== INTERNAS FALTANDO ===');
const miss=s.local.filter(r=>!r.dest);
miss.forEach(r=>console.log('  FALTA  '+r.ref+'   <- '+r.from+'   cands: '+r.cands.slice(0,3).join(' | ')));
console.log('  total faltando: '+miss.length+' / '+s.local.length);
console.log('\n=== ABSOLUTAS SEM BASE ===');
const esc=s.abs.filter(a=>!fs.existsSync(a.dest));
esc.forEach(a=>console.log('  ESCAPA '+a.ref+'   <- '+a.from));
console.log('  total: '+esc.length+' / '+s.abs.length);
console.log('\n=== EXTERNAS ===');
s.ext.forEach(e=>console.log('  '+e.ref+'   <- '+e.from));
