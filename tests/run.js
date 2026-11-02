const fs=require('fs'),path=require('path');
const {load}=require('./load');
const F=require('./fixtures');
const O=require('./oracle');
const G=require('./golden');
const Ch=require('./chaos');
const PF=require('./preflight');
const X=require('./exact');
const GOLD=path.join(__dirname,'golden.json');
const args=process.argv.slice(2);
const cmd=args[0]||'all';
const flags=new Set(args.slice(1));
let pass=0,fail=0;
const ok=(name,cond,info)=>{cond?pass++:fail++;console.log((cond?'PASS ':'FAIL ')+name+(info!=null?' — '+info:''))};
const hardOf=bd=>bd.hard+bd.goalsH+bd.bookH+bd.recencyH;
function goldenRun(){
  const cur=G.matrix();
  const out={};for(const k in cur)out[k]=G.strip(cur[k]);
  return out;
}
function cmdGolden(){
  const cur=goldenRun();
  if(flags.has('--write')){fs.writeFileSync(GOLD,JSON.stringify(cur,null,1));console.log('wrote '+Object.keys(cur).length+' records');return}
  if(!fs.existsSync(GOLD)){ok('golden.json exists',false);return}
  const old=JSON.parse(fs.readFileSync(GOLD,'utf8'));
  let same=0,diff=0,worse=0,hardUp=0,better=0;const lines=[];
  for(const k in old){
    const a=old[k],b=cur[k];
    if(!b){diff++;continue}
    if(a.empty&&b.empty){same++;continue}
    if(a.hash===b.hash&&Math.abs(a.cost-b.cost)<1e-6){same++;continue}
    diff++;
    const ha=a.breakdown?hardOf(a.breakdown):0,hb=b.breakdown?hardOf(b.breakdown):0;
    if(hb>ha+1e-6)hardUp++;
    if(b.cost>a.cost+1e-6)worse++;else if(b.cost<a.cost-1e-6)better++;
    lines.push(k+' cost '+a.cost+' → '+b.cost+' H '+ha.toFixed(0)+' → '+hb.toFixed(0)+' filled '+a.filled+'/'+a.seats+' → '+b.filled+'/'+b.seats);
  }
  console.log('golden: identical '+same+', changed '+diff+' (better '+better+', worse '+worse+')');
  if(flags.has('--verbose')||diff<=12)lines.forEach(l=>console.log('  '+l));
  ok('golden: no run raised hard cost',hardUp===0,hardUp);
  if(flags.has('--strict'))ok('golden: byte-identical',diff===0,diff);
}
function cmdOracle(){
  const m=G.matrix();let bad=0;
  for(const k in m){const r=m[k];if(r.oracle&&r.oracle.length){bad++;console.log('  '+k+' '+JSON.stringify(r.oracle))}}
  ok('oracle: solved golden runs ('+Object.keys(m).length+')',bad===0,bad+' failing');
  const ch=Ch.run({n:6});let cb=0;const seen={};
  for(const r of ch)if(r.fails.length){cb++;r.fails.forEach(f=>seen[f.rule]=(seen[f.rule]||0)+1)}
  ok('oracle: chaotic states ('+ch.length+')',cb===0,JSON.stringify(seen));
}
function issuesOf(r){return O.counts(r.issues)}
function cmdFixtures(){
  const {M,E}=load();
  const solveWs=(ws,seed,q)=>{F.tune(ws,seed,q||'fast');const C=M.compile(ws);return {C,r:E.solve(C.P)}};
  for(const seed of [1,2,3,7,42]){
    const {ws,pins}=F.fPin(M);const {C,r}=solveWs(ws,seed);
    const vi=C.map.visits.findIndex(v=>v.key===pins.visitKey),zi=C.map.seats.findIndex(z=>z.key===pins.seatKey);
    ok('F-PIN seed '+seed,C.map.sites[r.siteOf[vi]]===pins.site&&C.map.people[r.seatP[zi]]===pins.person);
  }
  {
    const ws=F.fImp(M);ws.rules.mode='bend';const {r}=solveWs(ws,1);
    ok('F-IMP bend: impossible rest is bent and reported',r.stats.filled===r.stats.seats&&(r.breakdown.rest||0)>0&&r.issues.some(i=>i.k==='rest'||i.k==='run'),JSON.stringify(issuesOf(r)));
  }
  {
    const ws=F.fImp(M);ws.rules.mode='strict';const {r}=solveWs(ws,1);
    ok('F-IMP strict: rest never bent, seats left open',(r.breakdown.rest||0)===0&&r.stats.filled<r.stats.seats,JSON.stringify(issuesOf(r)));
  }
  for(const seed of [1,2,3,7,42]){
    const {r}=solveWs(F.fTight(M,100),seed);
    ok('F-TIGHT fair=100 seed '+seed+': 0 open, 0 hard',r.stats.filled===r.stats.seats&&hardOf(r.breakdown)===0,r.stats.filled+'/'+r.stats.seats+' hard='+hardOf(r.breakdown));
  }
  for(const seed of [1,2,3,7,42]){
    const {C,r}=solveWs(F.fGoal(M),seed);
    const gi=r.issues.filter(i=>i.k==='goal'||i.k==='injwho').length;
    ok('F-GOAL seed '+seed+': filled, hard request met, all goals met',r.stats.filled===r.stats.seats&&r.breakdown.goalsH===0&&gi===0,r.stats.filled+'/'+r.stats.seats+' goalIssues='+gi+' goals='+r.breakdown.goals.toFixed(0)+' V='+C.P.V);
  }
  for(const [seats,pw] of [[5,100],[6,100]]){
    const on=solveWs(F.fAvoid(M,seats,pw),1);
    const offWs=F.fAvoid(M,seats,pw);F.tune(offWs,1,'fast');const Co=M.compile(offWs);Co.P.tiers=false;const off=E.solve(Co.P);
    ok('F-AVOID '+seats+' seats pairs='+pw+': coverage beats soft pairs',on.r.stats.filled===on.r.stats.seats,'tiers on '+on.r.stats.filled+'/'+on.r.stats.seats+' · tiers off '+off.stats.filled+'/'+off.stats.seats);
  }
  for(const [name,mk] of [['field',()=>F.base(M,'field')],['retail',()=>F.base(M,'retail')],['goal',()=>F.fGoal(M)],['avoid',()=>F.fAvoid(M,5,100)],['imp',()=>F.fImp(M)]]){
    const ws=F.tune(mk(),1,'fast');const C=M.compile(ws);const d=E.checkDrift(C.P,5,20000);
    ok('tier drift '+name+': incremental H/I equal full recompute',d.dt<1e-6&&d.dh<1e-6&&d.di<1e-6,'dTotal='+d.dt.toExponential(1)+' dH='+d.dh.toExponential(1)+' dI='+d.di.toExponential(1));
  }
  for(const mode of ['bend','strict']){
    const {r}=solveWs(F.fLoad(M,mode),1);const c=issuesOf(r);
    ok('M13 '+mode+': maxLoad and ban are never bent (seats stay open)',!c.maxload&&!c.ban&&r.stats.filled===3,JSON.stringify(c)+' filled '+r.stats.filled+'/'+r.stats.seats);
  }
  {
    const open=aware=>{let n=0;for(const seed of [1,2,3,7,42]){const ws=F.tune(F.fShort(M),seed,'fast');const C=M.compile(ws);C.P.iters=0;C.P.runs=1;C.P.staffAware=aware;const r=E.solve(C.P);n+=r.stats.seats-r.stats.filled}return n};
    const a0=open(true),b0=open(false);
    ok('M5 F-SHORT: construction alone leaves no open seats when staffing-aware',a0===0&&b0>0,'aware '+a0+' · unaware '+b0+' (5 seeds)');
  }
  {
    let never=0,det=0,n=0;
    for(const name of ['field','care']){
      const {C,r}=solveWs(F.base(M,name),2,'fast');let prev=r;
      for(let round=1;round<=3;round++){
        const P=Object.assign({},C.P,{warm:{siteOf:prev.siteOf,seatP:prev.seatP},round});
        const x=E.solve(P),y=E.solve(Object.assign({},P));n++;
        if(JSON.stringify(x.seatP)===JSON.stringify(y.seatP))det++;
        if(x.tierCost.H<=prev.tierCost.H+1e-9&&(x.tierCost.H<prev.tierCost.H-1e-9||x.tierCost.I<=prev.tierCost.I+1e-9)&&(x.tierCost.H<prev.tierCost.H-1e-9||x.tierCost.I<prev.tierCost.I-1e-9||x.cost<=prev.cost+1e-6))never++;
        prev=x;
      }
    }
    ok('G keep searching: deterministic per (seed, round) and never worse',det===n&&never===n,'deterministic '+det+'/'+n+' never worse '+never+'/'+n);
  }
  const a=solveWs(F.base(M,'field'),3,'fast'),b=E.solve(a.C.P);
  ok('determinism: same P twice',JSON.stringify(a.r.siteOf)===JSON.stringify(b.siteOf)&&JSON.stringify(a.r.seatP)===JSON.stringify(b.seatP)&&a.r.cost===b.cost);
}
function cmdPreflight(){
  const {M,E}=load();
  const pre=ws=>M.compile(F.tune(ws,1,'fast')).pre;
  for(const n of ['field','retail','care'])ok('E no false proofs on template '+n,pre(F.base(M,n)).proven.length===0);
  ok('E no false proofs on F-GOAL, F-TIGHT, F-ALT',[F.fGoal(M),F.fTight(M,100),F.fAlt(M,4,28)].every(w=>pre(w).proven.length===0));
  for(const mode of ['bend','strict']){const w=F.fImp(M);w.rules.mode=mode;const p=pre(w);ok('E F-IMP '+mode+': proven rest conflict',p.proven.some(x=>x.k==='prest'&&x.need===7&&x.have===4),JSON.stringify(p.proven.map(x=>[x.k,x.need,x.have])))}
  {
    const w=F.tune(F.fLoad(M,'bend'),1,'fast');const C=M.compile(w);const r=E.solve(C.P);
    ok('E F-LOAD: lower bound equals solver open seats',C.pre.lbOpen===4&&r.coverage.open===4&&r.coverage.optimal,JSON.stringify(r.coverage));
  }
  {
    const w=F.tune(F.fAlt(M,3,14),1,'fast');const C=M.compile(w);const r=E.solve(C.P);
    const x=X.exactStaffing(C.P,r.siteOf,3e5);
    ok('E exact checker positive control: finds the staffing of a fully filled plan',r.stats.filled===r.stats.seats&&x.feasible===true,JSON.stringify(x));
  }
  for(const i of [56,103]){
    const w=F.tune(PF.randomWs(M,i,'strict'),i,'fast');const C=M.compile(w);const r=E.solve(C.P);
    const x=X.exactStaffing(C.P,r.siteOf,3e5);
    ok('E gap instance strict#'+i+': solver leaves '+(r.stats.seats-r.stats.filled)+' open, bound '+C.pre.lbOpen+'; exact search proves its own layout cannot be fully staffed',r.stats.filled<r.stats.seats&&x.feasible===false,JSON.stringify(x));
  }
  const rr=PF.run(60);
  ok('E bound is tight for at least 90% of instances that have one ('+rr.tight+'/'+rr.withBound+')',rr.withBound>0&&rr.tight/rr.withBound>=.9);
  ok('E soundness: solver never beats the proven bound ('+rr.total+' random instances, tight in '+rr.tight+'/'+rr.withBound+')',rr.unsound.length===0,JSON.stringify(rr.unsound.slice(0,3)));
}
function cmdMoves(){
  const {M,E}=load();
  const OPTS=[['chain (default)',{}],['hungarian',{hung:.05}],['day-swap',{dswap:.05}],['hot-set',{hot:1}],['flow layout',{layout:'flow'}],['mix polish',{polishMix:1}],['everything',{hung:.03,chain:.15,dswap:.03,hot:1,layout:'flow',polishMix:1}],['chain off',{chain:0}]];
  const cases=[['field',()=>F.base(M,'field')],['retail',()=>F.base(M,'retail')],['care',()=>F.base(M,'care')],['goal',()=>F.fGoal(M)],['tight',()=>F.fTight(M,100)],['alt',()=>F.fAlt(M,4,14)]];
  for(const [on,fl] of OPTS){
    let drift=0,orc=0,det=0,n=0,hard=0;
    for(const [cn,mk] of cases){
      const C=M.compile(F.tune(mk(),3,'fast'));if(!C.P.V)continue;n++;
      const P=Object.assign({},C.P,fl);
      const d=E.checkDrift(P,5,5000);if(!(d.dt<1e-6&&d.dh<1e-6&&d.di<1e-6))drift++;
      const r=E.solve(P),r2=E.solve(Object.assign({},P));
      if(JSON.stringify(r.seatP)===JSON.stringify(r2.seatP)&&JSON.stringify(r.siteOf)===JSON.stringify(r2.siteOf)&&r.cost===r2.cost)det++;
      if(O.check(r,E.evaluate(P,r)).length)orc++;
      if(r.tierCost.H>1e-6)hard++;
    }
    ok('moves ['+on+']: no drift, oracle agrees, deterministic, no hard cost',drift===0&&orc===0&&det===n&&hard===0,'drift '+drift+' oracle '+orc+' deterministic '+det+'/'+n+' hard '+hard);
  }
  {
    const w=F.tune(F.fTight(M,100),2,'fast');const C=M.compile(w);
    const r=E.solve(Object.assign({},C.P,{hung:.05,chain:.15,dswap:.03,layout:'flow'}));
    ok('F-TIGHT with every option on: 0 open seats',r.stats.filled===r.stats.seats,r.stats.filled+'/'+r.stats.seats);
  }
}
function cmdBench(){
  const {M,E}=load();const rows=[];
  const cases=[['field month','field',null],['retail month','retail',null],['care week','care',null],['field quarter','field','quarter']];
  for(const [label,name,mode] of cases){
    const ws=F.tune(F.base(M,name),1,'balanced');
    if(mode==='quarter')ws.scope={mode:'custom',start:'2026-10-01',end:'2026-12-31'};
    const C=M.compile(ws);const t0=process.hrtime.bigint();const r=E.solve(C.P);const ms=Number((process.hrtime.bigint()-t0)/1000000n);
    const moves=C.P.iters*C.P.runs;
    rows.push(label+': V='+C.P.V+' Z='+C.P.Z+' iters='+C.P.iters+'x'+C.P.runs+' '+ms+' ms '+Math.round(moves/ms*1000)+' moves/s cost='+r.cost.toFixed(2)+' filled='+r.stats.filled+'/'+r.stats.seats);
  }
  rows.forEach(l=>console.log(l));
  if(flags.has('--write')){fs.mkdirSync(path.join(__dirname,'..','docs'),{recursive:true});fs.writeFileSync(path.join(__dirname,'..','docs','baseline.txt'),rows.join('\n')+'\n')}
}
const table={moves:cmdMoves,preflight:cmdPreflight,golden:cmdGolden,oracle:cmdOracle,fixtures:cmdFixtures,bench:cmdBench};
if(cmd==='all'){cmdOracle();cmdFixtures();cmdMoves();cmdPreflight();cmdGolden()}
else if(table[cmd])table[cmd]();
else{console.log('usage: node tests/run.js [all|golden|oracle|fixtures|bench] [--write] [--strict] [--verbose]');process.exit(2)}
console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
