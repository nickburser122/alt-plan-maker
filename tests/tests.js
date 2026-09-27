(function(){
const M=window.MV,E=window.MauvineEngine;
const out=[];const log=s=>{out.push(s);console.log(s)};
const counts=r=>{const c={};r.issues.forEach(x=>c[x.k]=(c[x.k]||0)+1);return JSON.stringify(c)};
function run(name,ws){
  const C=M.compile(ws);const t0=performance.now();const r=E.solve(C.P);const ms=Math.round(performance.now()-t0);
  log(name+': V='+C.P.V+' Z='+C.P.Z+' N='+C.P.N+' S='+C.P.S+' iters='+C.P.iters+' cost='+r.cost.toFixed(2)+' filled='+r.stats.filled+'/'+r.stats.seats+' issues='+counts(r)+' warn='+JSON.stringify(C.warn.map(w=>w.k))+' '+ms+'ms');
  return {C,r};
}
function month(ws,y,m){ws.scope={mode:'month',start:y+'-'+String(m).padStart(2,'0')+'-01',end:''};return ws}
['field','retail','care','blank'].forEach(k=>{const ws=M.TEMPLATES[k]();if(k!=='care')month(ws,2026,10);run(k,ws)});
const a=run('det-a',month(M.TEMPLATES.field(),2026,10));
const ws2=month(M.TEMPLATES.field(),2026,10);
const b=E.solve(a.C.P);
log('deterministic same P: '+(JSON.stringify(b.siteOf)===JSON.stringify(a.r.siteOf)&&JSON.stringify(b.seatP)===JSON.stringify(a.r.seatP)));
const tight=M.TEMPLATES.blank();tight.people=[M.mkPerson('Solo',[tight.roles[0].id])];tight.week=[0,1,2,3,4,5,6].map(()=>({on:true,n:1,focus:'auto'}));tight.sites=[M.mkSite('A',tight.categories[0].id,1),M.mkSite('B',tight.categories[0].id,3)];tight.scope={mode:'week',start:'2026-10-05',end:''};
run('impossible bend',tight);
tight.rules.mode='strict';run('impossible strict',tight);
const big=month(M.TEMPLATES.field(),2026,10);big.scope={mode:'custom',start:'2026-10-01',end:'2026-12-31'};run('field 3 months',big);
const lk=month(M.TEMPLATES.field(),2026,10);
const r0=run('pre-lock',lk);
const key=r0.C.map.seats[0].key;const pid=lk.people.find(p=>p.roles.includes(lk.roles[0].id)&&p.name==='Abaza').id;
lk.locks.seats[key]=pid;const r1=run('with lock',lk);
log('lock honored: '+(r1.C.map.people[r1.r.seatP[0]]===pid));
const W=E.solve(Object.assign({},r1.C.P,{warm:{siteOf:r1.r.siteOf,seatP:r1.r.seatP}}));
log('warm cost '+W.cost.toFixed(2)+' vs '+r1.r.cost.toFixed(2)+' ms '+W.ms);
let same=0;for(let i=0;i<W.seatP.length;i++)if(W.seatP[i]===r1.r.seatP[i])same++;log('warm stability '+same+'/'+W.seatP.length);
const ex=E.explain(r1.C.P,r1.r,{seat:3});log('explain seat: '+ex.length+' first='+JSON.stringify(ex[0])+' second='+JSON.stringify(ex[1]));
const ev=E.explain(r1.C.P,r1.r,{visit:2});log('explain visit: '+ev.length+' second='+JSON.stringify(ev[1]));
fetch('../data/complete_data.json').then(r=>r.json()).then(o=>{
  const ds=M.fromDataset(o,'ds');month(ds,2026,10);
  log('dataset: locs='+ds.locations.length+' sites='+ds.sites.length+' plannable='+M.plannable(ds).length+' people='+ds.people.length);
  run('dataset rhythm',ds);
  ds.goals=[M.mkGoal({per:'each',scope:'all',op:'min',n:1})];ds.sizing.mode='goals';
  const g=run('dataset once each (goals)',ds);
  log('covered '+g.r.stats.covered+'/'+g.C.P.S+' goalMet '+g.r.stats.goalMet+'/'+g.r.stats.goalSites+' crit '+g.r.stats.critHit+'/'+g.r.stats.critN);
  const kd=ds.locations.find(l=>l.name==='كفر الدوار');
  ds.goals=[M.mkGoal({per:'total',scope:'all',op:'exact',n:60}),M.mkGoal({per:'total',scope:'loc',ref:kd.id,op:'min',n:8}),M.mkGoal({per:'total',scope:'cat',ref:ds.categories[0].id,op:'min',n:20})];
  ds.sizing.mode='total';ds.sizing.total=60;
  const m=run('dataset 60 / 8 KD / 20 basic',ds);
  log('groups '+JSON.stringify(m.r.stats.grpCnt));
  ds.rules.runMax=2;ds.rules.offMin=1;run('dataset 2on1off',ds);
  ds.rules.runMax=1;ds.rules.offMin=1;ds.week=[0,1,2,3,4,5,6].map(i=>({on:i===6,n:i===6?2:0,focus:'auto'}));ds.sizing.mode='rhythm';ds.goals=[];run('dataset saturdays x2',ds);
  document.getElementById('out').textContent=out.join('\n');
});
document.getElementById('out').textContent=out.join('\n');
})();
