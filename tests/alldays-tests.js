(function(){
const M=window.MV,E=window.MauvineEngine;
const out=[];const log=s=>{out.push(s);console.log(s)};let pass=0,fail=0;
const ok=(n,c,i)=>{c?pass++:fail++;log((c?'PASS ':'FAIL ')+n+(i!=null?' — '+i:''))};
const J=o=>JSON.stringify(o);
const MON='2026-10-05',TUE='2026-10-06',WED='2026-10-07',THU='2026-10-08',FRI='2026-10-09',SAT='2026-10-10',SUN='2026-10-11';
function mini(o){
  o=o||{};
  const ws=M.TEMPLATES.blank();
  ws.roles=[M.mkRole('R',M.COLORS[0])];
  ws.categories=[M.mkCat('C',M.COLORS[0],{[ws.roles[0].id]:o.seats||1},1)];
  ws.sites=[];for(let i=0;i<(o.sites==null?6:o.sites);i++)ws.sites.push(M.mkSite('S'+i,ws.categories[0].id,i+1));
  ws.people=[];for(let i=0;i<(o.people==null?6:o.people);i++)ws.people.push(M.mkPerson('P'+i,[ws.roles[0].id]));
  ws.week=[0,1,2,3,4,5,6].map(i=>({on:i>=1&&i<=5,n:o.n==null?1:o.n,focus:'auto'}));
  ws.rules.runMax=0;ws.rules.offMin=0;ws.rules.weekStart=1;
  ws.scope={mode:'week',start:MON,end:''};
  ws.engine.runs=1;
  return ws;
}
const useAll=(ws,mode,total)=>{ws.sizing.useAllDays=true;if(mode)ws.sizing.mode=mode;if(total!=null)ws.sizing.total=total;return ws};
const solve=(ws,it)=>{const C=M.compile(ws);C.P.iters=it||15000;C.P.runs=1;return {C,r:E.solve(C.P)}};
const dayN=(ws,keepZero)=>{const o={};M.planDays(ws,!!keepZero).forEach(d=>o[d.iso]=d.n);return o};
const warns=ws=>M.compile(ws).warn;
const refAlloc=(ws,T)=>{const days=M.daysIn(M.rangeOf(ws).start,M.rangeOf(ws).end).map(i=>({iso:i,c:M.dayCfg(ws,i)})).filter(d=>d.c.on&&d.c.n>0);const W=days.reduce((a,d)=>a+d.c.n,0);let acc=0,prev=0;const o={};days.forEach(d=>{acc+=d.c.n;const cur=Math.round(T*acc/W);o[d.iso]=cur-prev;prev=cur});return o};

{
  const ws=M.blankWS('x');ok('1 default is off',ws.sizing.useAllDays===false);
  const legacy=JSON.parse(JSON.stringify(M.TEMPLATES.field()));delete legacy.sizing.useAllDays;
  ok('1 missing property normalises to false',M.normalize(legacy).sizing.useAllDays===false);
  const t=M.TEMPLATES.field();
  const pol=[[true,true],[false,false],['true',true],['false',false],['TRUE',true],[1,true],[0,false],['0',false],['yes',false],[null,false],[undefined,false],[{},false]];
  const bad=pol.filter(([v,e])=>{const o=JSON.parse(JSON.stringify(t));o.sizing.useAllDays=v;return M.normalize(o).sizing.useAllDays!==e});
  ok('1 boolean policy (string "false" stays off)',!bad.length,J(bad));
  ok('1 explicit true survives normalize',M.normalize(JSON.parse(JSON.stringify(useAll(M.TEMPLATES.field())))).sizing.useAllDays===true);
}
{
  const ws=mini();ws.sizing.mode='total';ws.sizing.total=3;
  ok('2 off keeps the original proportional allocation',J(dayN(ws))===J(refAlloc(ws,3))||J(Object.values(dayN(ws)))===J(Object.values(refAlloc(ws,3)).filter(x=>x>0)),J(dayN(ws))+' vs '+J(refAlloc(ws,3)));
  const w2=mini();w2.sizing.mode='total';w2.sizing.total=12;
  ok('2 off keeps total and may leave days empty',Object.values(dayN(w2)).reduce((a,b)=>a+b,0)===12);
  const w3=mini();w3.week[3].n=0;
  ok('2 off: an enabled zero-count day stays out of the plan days',!(WED in dayN(w3)));
  ok('2 off: no alldays warnings',!warns(ws).some(w=>/alldays/.test(w.k)));
}
{
  const ws=useAll(mini(),'total',5);
  const n=dayN(ws);ok('3 total equals enabled days: one visit each',Object.keys(n).length===5&&Object.values(n).every(x=>x===1),J(n));
  const w2=useAll(mini(),'total',12);const n2=dayN(w2);
  ok('4 total above enabled days: every day covered, total preserved',Object.values(n2).every(x=>x>=1)&&Object.values(n2).reduce((a,b)=>a+b,0)===12&&Object.keys(n2).length===5,J(n2));
  const w3=useAll(mini(),'total',3);const C=M.compile(w3);const wr=C.warn.find(w=>w.k==='alldaysshort');
  ok('5 total below enabled days: explicit conflict, total not raised',!!wr&&wr.need===5&&wr.have===3&&C.P.V===3,J(wr)+' V='+C.P.V);
  ok('5 conflict keeps the required dates diagnosable',C.map.reqDates.length===5&&C.map.reqAbsent.length===2,J(C.map.reqAbsent));
}
{
  const ws=useAll(mini(),'goals');ws.goals=[M.mkGoal({per:'total',op:'min',n:2,what:{k:'all',v:''}})];
  ok('6 goals sizing below the minimum is raised to it',M.compile(ws).P.V===5&&M.goalNeed(ws)===2,'V='+M.compile(ws).P.V);
  const w2=useAll(mini(),'goals');w2.goals=[M.mkGoal({per:'total',op:'min',n:9,what:{k:'all',v:''}})];
  const n=dayN(w2);ok('6 goals sizing above the minimum is kept and spread',Object.values(n).reduce((a,b)=>a+b,0)===9&&Object.values(n).every(x=>x>=1),J(n));
  const w3=useAll(mini(),'goals');
  ok('6 goals mode without goals falls back to the rhythm total',Object.values(dayN(w3)).reduce((a,b)=>a+b,0)===5);
}
{
  const ws=useAll(mini({n:2}));
  ok('7 rhythm mode keeps rhythm counts',J(Object.values(dayN(ws)))===J([2,2,2,2,2]));
  const w2=useAll(mini());w2.week[3].n=0;
  const n=dayN(w2);ok('7 rhythm mode lifts an enabled zero-count day to one visit',n[WED]===1&&Object.values(n).reduce((a,b)=>a+b,0)===5,J(n));
  ok('10 enabled zero-count day is a required day',M.requiredDays(w2).includes(WED)&&M.requiredDays(w2).length===5);
  const w3=useAll(mini(),'total',6);w3.week.forEach(d=>{if(d.on)d.n=0});
  const n3=dayN(w3);ok('10 all-zero rhythm weights spread evenly',Object.values(n3).reduce((a,b)=>a+b,0)===6&&Object.values(n3).every(x=>x>=1),J(n3));
}
{
  const ws=useAll(mini(),'total',8);ws.overrides[WED]={on:false,n:0};
  const rq=M.requiredDays(ws);ok('8 a holiday override is not required and gets no ordinary visit',!rq.includes(WED)&&rq.length===4&&!(WED in dayN(ws)),J(rq));
  const w2=useAll(mini(),'total',8);w2.overrides[SAT]={on:true,n:1};
  ok('9 an enabled override day is required',M.requiredDays(w2).includes(SAT)&&M.requiredDays(w2).length===6&&dayN(w2)[SAT]>=1,J(dayN(w2)));
  const w3=mini();w3.overrides[WED]={on:false,n:0};
  ok('8 requiredDays is empty while the setting is off',M.requiredDays(w3).length===0&&M.enabledDays(w3).length===4);
}
{
  const ws=useAll(mini(),'total',5);
  ws.goals=[M.mkGoal({kind:'inject',what:{k:'all',v:''},inject:{mode:'dates',dates:SUN,n:1}})];
  const d=M.planDays(ws,true),sun=d.find(x=>x.iso===SUN);
  ok('11 fixed injection on a disabled day: kept, no ordinary visit, not required',sun&&sun.n===0&&sun.extra.length===1&&!M.requiredDays(ws).includes(SUN));
  const w2=useAll(mini(),'total',5);
  w2.goals=[M.mkGoal({kind:'inject',what:{k:'all',v:''},inject:{mode:'dates',dates:WED,n:1,add:'replace'}})];
  const C=M.compile(w2);const wed=M.planDays(w2,true).find(x=>x.iso===WED);
  ok('11 fixed replacement keeps the total and covers the day by the injected visit',C.P.V===5&&wed.n===0&&wed.extra.length===1&&!C.warn.some(w=>w.k==='replacecap'),'V='+C.P.V);
  const x=solve(w2);const du=M.dayUseOf(x.C.map,x.r);ok('11 replaced day is still counted as used',du&&du.ok,J(du));
  const w3=useAll(mini(),'total',5);
  w3.goals=[M.mkGoal({kind:'inject',what:{k:'all',v:''},inject:{mode:'pick',n:1,op:'exact',add:'replace'}})];
  const C3=M.compile(w3);const rc=C3.warn.find(w=>w.k==='replacecap');
  ok('11 optional replacement cannot erase a required day: conflict reported',!!rc&&rc.need===1&&rc.have===0&&M.planDays(w3,true).every(d=>d.n>=1),J(rc));
  const w4=useAll(mini(),'total',9);
  w4.goals=[M.mkGoal({kind:'inject',what:{k:'all',v:''},inject:{mode:'pick',n:1,op:'exact',add:'replace'}})];
  const n4=M.planDays(w4,true).reduce((a,d)=>a+d.n,0);
  ok('11 optional replacement takes only visits above the day minimum',n4===8&&M.planDays(w4,true).every(d=>d.n>=1)&&!M.compile(w4).warn.some(w=>w.k==='replacecap'),'ordinary='+n4);
  const w5=useAll(mini(),'total',3);w5.goals=[M.mkGoal({kind:'inject',what:{k:'all',v:''},when:{k:'dates',v:THU},inject:{mode:'pick',n:1,op:'exact'}})];
  const C5=M.compile(w5);const P5=C5.P;
  const thu=C5.map.days.findIndex(d=>d.iso===THU);
  const optV=C5.map.visits.map((v,i)=>i).filter(i=>C5.map.visits[i].opt&&C5.map.visits[i].d===thu);
  const sol={siteOf:C5.map.visits.map((v,i)=>v.opt?-1:0),seatP:new Array(P5.Z).fill(-1)};
  const ev=E.evaluate(P5,sol);const du5=M.dayUseOf(C5.map,{stats:ev.stats});
  ok('11 an unselected optional slot does not count as using a day',optV.length>0&&du5.unc.includes(THU),J(du5));
}
{
  const ws=useAll(mini({sites:0}),'total',5);
  const x=solve(ws);const du=M.dayUseOf(x.C.map,x.r);
  ok('12 no sites: every required day reported unused, plan not claimed satisfied',du&&!du.ok&&du.unc.length===5&&x.C.warn.some(w=>w.k==='nosites'),J(du&&du.unc));
  const w2=useAll(mini({people:0}),'total',5);const x2=solve(w2);const d2=M.dayUseOf(x2.C.map,x2.r);
  ok('12 no people: days are used but incomplete',d2&&!d2.ok&&d2.unc.length===0&&d2.inc.length===5&&x2.r.issues.some(i=>i.k==='dayincomplete'),J(d2));
  const w3=useAll(mini(),'total',5);w3.sites.forEach(s=>s.blackout=[WED]);
  const C3=M.compile(w3);const b3=C3.warn.filter(w=>w.k==='alldaysblocked');
  ok('12 blackout on every site: exact date reported at preflight',b3.length===1&&b3[0].d===WED&&b3[0].w==='site',J(b3));
  const r3=E.solve(Object.assign({},C3.P,{iters:8000,runs:1}));const d3=M.dayUseOf(C3.map,r3);
  ok('12 blackout day is reported uncovered after solving',d3&&d3.unc.join()===WED&&r3.issues.some(i=>i.k==='dayunused'),J(d3));
  const w4=useAll(mini(),'total',5);w4.people.forEach(p=>p.off=[THU]);
  const C4=M.compile(w4);const b4=C4.warn.filter(w=>w.k==='alldaysblocked');
  const r4=E.solve(Object.assign({},C4.P,{iters:8000,runs:1}));const d4=M.dayUseOf(C4.map,r4);
  ok('12 nobody available: preflight names the date, solver marks it incomplete',b4.length===1&&b4[0].d===THU&&b4[0].w==='staff'&&d4.inc.join()===THU,J(b4)+J(d4));
  const w5=useAll(mini(),'total',5);w5.people.forEach(p=>p.days=[false,true,true,true,true,true,false]);
  ok('12 weekday availability that is fine raises no preflight conflict',!warns(w5).some(w=>w.k==='alldaysblocked'));
}
{
  const ws=useAll(mini(),'total',7);
  const C0=M.compile(ws);const key=C0.map.visits[2].key,sid=ws.sites[4].id;
  ws.locks.sites[key]=sid;
  const x=solve(ws);const pinned=x.C.map.visits.findIndex(v=>v.key===key);
  ok('13 a pinned visit keeps its place',x.C.map.sites[x.r.siteOf[pinned]]===sid);
  const du=M.dayUseOf(x.C.map,x.r);ok('13 pins do not break day coverage',du.ok,J(du));
  const w2=useAll(mini(),'total',7);const sk=M.compile(w2).map.seats[0].key;w2.locks.seats[sk]=w2.people[3].id;
  const x2=solve(w2);ok('13 a pinned seat is honoured',x2.C.map.people[x2.r.seatP[0]]===w2.people[3].id);
}
{
  const ws=useAll(mini(),'total',3);const x=solve(ws);const du=M.dayUseOf(x.C.map,x.r);
  ok('14 zero-slot required dates stay diagnosable after solving',du.unc.length===2&&!du.ok&&du.used===3&&du.req===5,J(du));
  const full=useAll(mini(),'total',5);const y=solve(full);const d2=M.dayUseOf(y.C.map,y.r);
  ok('14 a satisfiable plan reports every day used',d2.ok&&d2.used===5&&d2.req===5&&!y.r.issues.some(i=>/^day(unused|incomplete)$/.test(i.k)),J(d2));
  ok('14 no summary while the setting is off',M.dayUseOf(M.compile(mini()).map,solve(mini()).r)===null);
}
{
  const ws=useAll(mini(),'total',9);
  const ds=M.toDataset(ws);ok('15 dataset export carries the setting',ds.settings.sizing.useAllDays===true);
  const back=M.fromDataset(ds,'x');ok('15 dataset import restores it',back.sizing.useAllDays===true);
  const nw=M.fromDataset(ds,'x');nw.sizing.useAllDays=false;const merged=M.mergeDataset(ws,nw);
  ok('15 dataset refresh never overwrites the chosen value',merged.sizing.useAllDays===true&&merged.sizing.total===9);
  const w2=useAll(mini(),'total',9);const m2=M.mergeDataset(w2,M.fromDataset(M.toDataset(mini()),'x'));
  ok('15 merge keeps an explicit off too',M.mergeDataset(mini(),nw).sizing.useAllDays===false&&m2.sizing.useAllDays===true);
  const rt=M.normalize(JSON.parse(JSON.stringify(ws)));ok('15 workspace JSON round trip',rt.sizing.useAllDays===true&&rt.sizing.mode==='total'&&rt.sizing.total===9);
  const ix={active:null,list:[],prefs:{}};M.Store.save(ws,ix);const ld=M.Store.load(ws.id);ok('15 storage round trip',ld&&ld.sizing.useAllDays===true);
  const dup=JSON.parse(JSON.stringify(ws));ok('15 duplicate keeps it',dup.sizing.useAllDays===true);
  const old=JSON.parse(JSON.stringify(mini()));delete old.sizing.useAllDays;
  const lo=M.normalize(old);ok('15 stored workspaces from before the setting keep their data',lo.sizing.useAllDays===false&&lo.sizing.mode==='rhythm'&&lo.sites.length===6);
}
{
  const a=mini(),b=JSON.parse(JSON.stringify(a));b.sizing.useAllDays=true;
  ok('16 toggling changes the fingerprint',M.fpOf(a)!==M.fpOf(b)&&M.fpWithLocks(a)!==M.fpWithLocks(b));
  const legacy=JSON.parse(JSON.stringify(a));delete legacy.sizing.useAllDays;
  ok('16 off keeps the fingerprint of workspaces saved before the setting',M.fpOf(legacy)===M.fpOf(a));
  const c=JSON.parse(JSON.stringify(a));c.sizing.useAllDays=true;ok('16 identical settings give identical fingerprints',M.fpOf(b)===M.fpOf(c));
}
{
  const mk=()=>{const ws=useAll(mini(),'total',9);ws.goals=[M.mkGoal({kind:'inject',what:{k:'all',v:''},inject:{mode:'dates',dates:WED,n:1}})];return ws};
  const x=solve(mk(),20000),y=solve(mk(),20000);
  ok('17 repeated solves are identical',J(x.r.siteOf)===J(y.r.siteOf)&&J(x.r.seatP)===J(y.r.seatP)&&x.r.cost===y.r.cost);
  const ev=E.evaluate(x.C.P,x.r);
  ok('18 solver cost equals a full re-evaluation',Math.abs(ev.cost-x.r.cost)<1e-6,x.r.cost+' vs '+ev.cost);
  ok('18 day-use summary is identical in solve and evaluate',J(ev.stats.dayUse)===J(x.r.stats.dayUse));
  const off=mini(),on=useAll(mini());
  const a=solve(off,12000),b=solve(on,12000);
  ok('18 setting does not change cost when every day is already used',Math.abs(a.r.cost-b.r.cost)<1e-9,a.r.cost+' vs '+b.r.cost);
}
fetch('../data/complete_data.json').then(r=>r.json()).then(o=>{
  const base=()=>{const ws=M.fromDataset(o,'ds');ws.scope={mode:'month',start:'2026-10-01',end:''};ws.goals=[];ws.engine.runs=1;return ws};
  const plain=base();const R=M.enabledDays(plain).length;
  const a=useAll(base(),'total',R);const x=solve(a,40000);const du=M.dayUseOf(x.C.map,x.r);
  ok('dataset: total = enabled days uses every day once',du&&du.ok&&du.req===R&&x.C.P.V===R,J(du)+' R='+R+' V='+x.C.P.V);
  const b=useAll(base(),'total',R-3);const Cb=M.compile(b);
  ok('dataset: short total reports the conflict and keeps the total',Cb.P.V===R-3&&Cb.warn.some(w=>w.k==='alldaysshort'&&w.need===R&&w.have===R-3));
  const c=base();const Vc=M.compile(c).P.V;const d=useAll(base());
  ok('dataset: rhythm sizing with the setting on keeps the total when no day is empty',M.compile(d).P.V===Vc,Vc+' vs '+M.compile(d).P.V);
  const ex=M.toDataset(a);const re=M.fromDataset(JSON.parse(JSON.stringify(ex)),'r');
  ok('dataset: export/import keeps the setting',re.sizing.useAllDays===true&&re.sizing.mode==='total');
  document.getElementById('out').textContent=out.join('\n');
  log('\n'+pass+' passed, '+fail+' failed');document.getElementById('out').textContent=out.join('\n');
});
})();
