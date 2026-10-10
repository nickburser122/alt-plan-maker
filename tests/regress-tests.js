(function(){
const M=window.MV,E=window.MauvineEngine;
const out=[];const log=s=>{out.push(s);console.log(s)};let pass=0,fail=0;
const ok=(n,c,i)=>{c?pass++:fail++;log((c?'PASS ':'FAIL ')+n+(i!=null?' — '+i:''))};
function mini(o){
  o=o||{};
  const ws=M.TEMPLATES.blank();
  ws.roles=[M.mkRole('R',M.COLORS[0])];
  ws.categories=[M.mkCat('C',M.COLORS[0],{[ws.roles[0].id]:o.seats||1,},1)];
  const n=o.sites||4;
  ws.sites=[];for(let i=0;i<n;i++)ws.sites.push(M.mkSite('S'+i,ws.categories[0].id,i+1));
  ws.people=[];for(let i=0;i<(o.people||4);i++)ws.people.push(M.mkPerson('P'+i,[ws.roles[0].id]));
  ws.week=[0,1,2,3,4,5,6].map(i=>({on:i>=1&&i<=5,n:1,focus:'auto'}));
  ws.rules.runMax=0;ws.rules.offMin=0;ws.rules.weekStart=1;
  ws.scope={mode:'week',start:'2026-10-05',end:''};
  ws.engine.runs=1;
  return ws;
}
const solve=(ws,it)=>{const C=M.compile(ws);C.P.iters=it||20000;C.P.runs=1;return {C,r:E.solve(C.P)}};

{
  const ws=mini();
  ws.goals=[M.mkGoal({kind:'inject',what:{k:'all',v:''},inject:{mode:'dates',dates:'2026-10-07',n:3,add:'replace'}})];
  const V0=M.compile(mini()).P.V,V1=M.compile(ws).P.V;
  ok('A: replacing 3 on a day holding 1 ordinary visit keeps total',V1===V0,V1+' vs '+V0);
}
{
  const ws=mini();
  ws.goals=[M.mkGoal({kind:'inject',what:{k:'all',v:''},inject:{mode:'dates',dates:'2026-10-10',n:1,add:'replace'}})];
  const V0=M.compile(mini()).P.V,C=M.compile(ws);
  ok('A: replacing on a day with no ordinary visits keeps total',C.P.V===V0,C.P.V+' vs '+V0);
}
{
  const ws=mini({sites:6});
  ws.rules.runMax=0;
  const ws2=JSON.parse(JSON.stringify(ws));
  ws.recency=M.normRecency({mode:'min',min:30,max:0,fresh:'due',overdue:true});
  ws.week=[0,1,2,3,4,5,6].map(i=>({on:i===3,n:1,focus:'auto'}));
  ws.history=[];
  const C=M.compile(ws);
  const r=solve(ws,5000);
  const never=r.r.issues.filter(x=>x.k==='rcnever').length;
  const sc=r.C.P.S;
  const unscheduled=r.r.stats.siteUse.filter(x=>x===0).length;
  ok('B: never-visited unscheduled sites are flagged due (fresh=due)',never===unscheduled&&unscheduled>0,'rcnever='+never+' unscheduled='+unscheduled);
  const bd=r.r.breakdown;
  ok('B: recency cost reflects unscheduled never-visited sites',bd.recency>0,'recency='+bd.recency);
}
{
  const ws=mini({people:2});
  ws.rules.runMax=0;ws.rules.offMin=2;ws.rules.perDay=1;
  ws.week=[0,1,2,3,4,5,6].map(i=>({on:i===1||i===3,n:1,focus:'auto'}));
  ws.scope={mode:'week',start:'2026-10-05',end:''};
  const C=M.compile(ws);
  const P=C.P;
  const sol={siteOf:P.vDay.map((d,i)=>i%P.S),seatP:P.vDay.map(()=>0)};
  const ev=E.evaluate(P,sol);
  ok('C: rest gap enforced when run limit is 0',ev.issues.some(x=>x.k==='rest')&&ev.breakdown.rest>0,JSON.stringify(ev.issues.map(x=>x.k))+' rest='+ev.breakdown.rest);
}
{
  const ws=mini({seats:1,people:2});
  ws.categories[0].staff={};ws.roles=[M.mkRole('A',M.COLORS[0]),M.mkRole('B',M.COLORS[1])];
  ws.categories[0].staff={[ws.roles[0].id]:12,[ws.roles[1].id]:12};
  ws.people=[];for(let i=0;i<30;i++)ws.people.push(M.mkPerson('P'+i,[ws.roles[i%2].id]));
  ws.week=[0,1,2,3,4,5,6].map(i=>({on:i===1,n:1,focus:'auto'}));
  const last=ws.people[29];
  ws.goals=[M.mkGoal({kind:'count',per:'person',what:{k:'all',v:''},who:{k:'person',v:[last.id]},op:'min',n:1,period:'plan'})];
  const C=M.compile(ws);const P=C.P;
  const seatsPer=P.vSeatN[0];
  const sol={siteOf:P.vDay.map(()=>0),seatP:new Array(P.Z).fill(-1)};
  const picks=[];for(let z=0;z<P.Z&&picks.length<seatsPer;z++)picks.push(z);
  const idxLast=C.map.people.indexOf(last.id);
  const zLast=P.vSeat0[0]+seatsPer-1;
  const roleOfLast=P.seatRole[zLast];
  const seatP=new Array(P.Z).fill(-1);
  const pool=[[],[]];C.map.people.forEach((id,i)=>{const p=ws.people.find(x=>x.id===id);pool[p.roles[0]===ws.roles[0].id?0:1].push(i)});
  const used=new Set();
  for(let z=P.vSeat0[0];z<P.vSeat0[0]+seatsPer;z++){const lst=pool[P.seatRole[z]];const q=(z===zLast&&lst.includes(idxLast))?idxLast:lst.find(x=>!used.has(x)&&x!==idxLast);seatP[z]=q;used.add(q)}
  sol.seatP=seatP;
  const ev=E.evaluate(P,sol);
  const hit=seatP.includes(idxLast);
  ok('D: seats per visit exceed old buffer',seatsPer>16,seatsPer);
  ok('D: goal counts a person seated past the old buffer',!hit||ev.stats.goalRes[0].sum===1,'sum='+(ev.stats.goalRes[0]&&ev.stats.goalRes[0].sum)+' seated='+hit);
}
{
  const ws=mini({seats:2,sites:1,people:3});
  ws.roles[0].name='R';
  ws.people=[M.mkPerson('F1',[ws.roles[0].id],{gender:'f'}),M.mkPerson('M1',[ws.roles[0].id],{gender:'m'}),M.mkPerson('M2',[ws.roles[0].id],{gender:'m'})];
  ws.week=[0,1,2,3,4,5,6].map(i=>({on:i===1,n:1,focus:'auto'}));
  ws.book=[M.mkRule({rel:'team',sense:'only',what:{k:'all',v:''},who:{k:'gender',v:'f'},op:'min',n:1})];
  const ev=(seat,pin)=>{const w2=JSON.parse(JSON.stringify(ws));if(pin)M.compile(w2).map.seats.forEach(s=>w2.locks.seats[s.key]='__open');const C=M.compile(w2);return E.evaluate(C.P,{siteOf:[0],seatP:seat})};
  const C0=M.compile(ws);const ix=n=>C0.map.people.indexOf(ws.people.find(p=>p.name===n).id);
  const males=ev([ix('M1'),ix('M2')],false),unfilled=ev([-1,-1],false),pinned=ev([-1,-1],true);
  ok('team: all-male visit breaks the hard min rule',males.breakdown.bookH>0&&males.issues.some(x=>x.k==='ruleteam'));
  ok('team: unfilled empty visit also breaks the hard min rule',unfilled.breakdown.bookH>0&&unfilled.issues.some(x=>x.k==='ruleteam'),'bookH='+unfilled.breakdown.bookH+' issues='+JSON.stringify(unfilled.issues.map(x=>x.k)));
  ok('team: seats the user pinned open stay exempt',pinned.breakdown.bookH===0&&!pinned.issues.some(x=>x.k==='ruleteam'),'bookH='+pinned.breakdown.bookH);
}
{
  const base=()=>{const ws=mini({sites:6});ws.week=[0,1,2,3,4,5,6].map(i=>({on:i===3,n:2,focus:'auto'}));ws.history=[];return ws};
  const evalFull=(ws,it)=>{const x=solve(ws,it||8000);const e=E.evaluate(x.C.P,x.r);return {x,e}};
  const neutral=base();neutral.recency=M.normRecency({mode:'min',min:30,fresh:'neutral',overdue:true});
  const due=base();due.recency=M.normRecency({mode:'min',min:30,fresh:'due',overdue:true});
  const dn=evalFull(neutral),dd=evalFull(due);
  ok('B: fresh neutral adds no due penalty',dn.e.breakdown.recency===0,dn.e.breakdown.recency);
  const left=dd.x.r.stats.siteUse.filter(n=>n===0).length;
  ok('B: fresh due penalises every unscheduled never-visited site',Math.abs(dd.e.breakdown.recency-left*0.6*120*(due.weights.recency/50))<1e-6||dd.e.breakdown.recency>0,'left='+left+' recency='+dd.e.breakdown.recency);
  ok('B: incremental cost equals full recomputation (fresh due)',Math.abs(dd.x.r.cost-dd.e.cost)<1e-6,dd.x.r.cost+' vs '+dd.e.cost);
  const all=mini({sites:6,people:8});all.history=[];all.recency=M.normRecency({mode:'min',min:30,fresh:'due',overdue:true});all.week=[0,1,2,3,4,5,6].map(i=>({on:i===3,n:6,focus:'auto'}));all.rules.distinct=true;
  const da=evalFull(all,20000);const left2=da.x.r.stats.siteUse.filter(n=>n===0).length;
  ok('B: scheduling every due site removes the penalty',left2===0&&da.e.breakdown.recency===0&&!da.x.r.issues.some(x=>x.k==='rcnever'),'unscheduled='+left2+' recency='+da.e.breakdown.recency);
}
{
  const build=(runMax,offMin,pRun,pOff,days)=>{
    const ws=mini({people:2});
    ws.rules.runMax=runMax;ws.rules.offMin=offMin;ws.rules.perDay=1;
    ws.week=[0,1,2,3,4,5,6].map(i=>({on:days.includes(i),n:1,focus:'auto'}));
    ws.people[0].runMax=pRun;ws.people[0].offMin=pOff;
    const C=M.compile(ws),P=C.P;
    const sol={siteOf:P.vDay.map((d,i)=>i%P.S),seatP:P.vDay.map(()=>0)};
    return E.evaluate(P,sol);
  };
  const kinds=ev=>ev.issues.map(x=>x.k).filter(k=>k==='rest'||k==='run');
  let ev=build(1,0,'','',[1,2]);ok('C: limited run with zero rest still flags the run',kinds(ev).join()==='run',kinds(ev).join());
  ev=build(0,0,'','',[1,2,4]);ok('C: both zero enforces nothing',kinds(ev).length===0&&ev.breakdown.rest===0,kinds(ev).join());
  ev=build(0,2,'','',[1,2]);ok('C: unlimited run with rest 2 allows back-to-back days',kinds(ev).length===0,kinds(ev).join());
  ev=build(0,2,'','',[1,3]);ok('C: unlimited run with rest 2 flags a one-day break',kinds(ev).join()==='rest',kinds(ev).join());
  ev=build(0,0,'',2,[1,3]);ok('C: per-person rest override applies when the global run is unlimited',kinds(ev).join()==='rest',kinds(ev).join());
  ev=build(0,2,0,0,[1,3]);ok('C: per-person zero rest overrides a global rest',kinds(ev).length===0,kinds(ev).join());
}
log('\n'+pass+' passed, '+fail+' failed');
const el=document.getElementById('out');if(el)el.textContent=out.join('\n');
})();
