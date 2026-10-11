const fs=require('fs');
function load(dir){const all=[];for(const f of ['axe-ceo','axe-pm','axe-worker','axe-portal'])all.push(...JSON.parse(fs.readFileSync(dir+'/'+f+'.json')));return all;}
function agg(all){const a={};for(const r of all)for(const v of r.violations){const x=a[v.id]??={impact:v.impact,nodes:0,pages:0};x.nodes+=v.nodes;x.pages++;}return a;}
const b=agg(load('out-before')),a=agg(load('out'));
const ids=[...new Set([...Object.keys(b),...Object.keys(a)])];
console.log('rule'.padEnd(26),'before(nodes/pages)'.padEnd(22),'after(nodes/pages)');
for(const id of ids.sort())console.log(id.padEnd(26),(b[id]?b[id].nodes+'/'+b[id].pages:'-').padEnd(22),a[id]?a[id].nodes+'/'+a[id].pages:'0');
const tot=o=>Object.values(o).reduce((s,x)=>s+x.nodes,0);console.log('TOTAL nodes',tot(b),'->',tot(a));
const k=require('./out/keyboard-ceo.json'),kb=require('./out-before/keyboard-ceo.json');
console.log('cards focusable before',JSON.stringify([kb.jobCardsKeyboard,kb.scheduleCards]),'after',JSON.stringify([k.jobCardsKeyboard,k.scheduleCards]));
for(const u of Object.keys(k))if(k[u].unnamedStops!==undefined)console.log(u,'unnamed stops',kb[u].unnamedStops,'->',k[u].unnamedStops);
console.log('worker banner',JSON.stringify(require('./out/keyboard-worker.json').offlineBanner));
