const {load}=require('./load');
const F=require('./fixtures');
const O=require('./oracle');
const fs=require('fs'),path=require('path');
function rng(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function randomSol(P,seed){
  const r=rng(seed);
  const siteOf=new Array(P.V).fill(-1),seatP=new Array(P.Z).fill(-1);
  for(let v=0;v<P.V;v++)siteOf[v]=r()<.05?-1:(r()*P.S)|0;
  for(let z=0;z<P.Z;z++){const mem=P.roleMembers[P.seatRole[z]];seatP[z]=!mem.length||r()<.1?-1:mem[(r()*mem.length)|0]}
  return {siteOf,seatP};
}
function variants(M){
  const out=[];
  for(const n of ['field','retail','care'])out.push([n,F.base(M,n)]);
  const f=F.base(M,'field');f.rules.siteGap=6;f.rules.rankGate='all';f.rules.runMax=2;f.rules.offMin=2;out.push(['field-gap-gate',f]);
  const r=F.base(M,'retail');r.people.forEach((p,i)=>{p.maxWeek=2;p.maxLoad=5;if(i%3===0)p.bans=r.sites.slice(0,3).map(s=>s.id);if(i%4===0)p.likes=r.sites.slice(3,6).map(s=>s.id)});out.push(['retail-limits',r]);
  const s=F.base(M,'field');s.rules.mode='strict';out.push(['field-strict',s]);
  const g=F.fGoal(M);out.push(['goal',g]);
  const gh=F.fGoal(M);gh.goals.forEach(q=>{q.hard=true});out.push(['goal-hard',gh]);
  const bh=F.base(M,'field');
  const who=n=>bh.people.find(p=>p.name===n).id;
  bh.book=[
    M.mkRule({rel:'site',sense:'never',who:{k:'person',v:who('Amani')},what:{k:'cat',v:bh.categories[0].id}}),
    M.mkRule({rel:'day',sense:'never',who:{k:'all',v:''},what:{k:'dow',v:[false,true,false,false,false,false,false]}}),
    M.mkRule({rel:'with',sense:'never',who:{k:'person',v:who('Abaza')},what:{k:'person',v:who('Lubna')}}),
    M.mkRule({rel:'team',sense:'only',who:{k:'gender',v:'f'},what:{k:'all',v:''},op:'ifany',n:2}),
    M.mkRule({rel:'count',sense:'only',who:{k:'person',v:who('Ghada')},what:{k:'cat',v:bh.categories[0].id},op:'min',n:5})
  ];out.push(['book-hard',bh]);
  const ds=M.fromDataset(JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','complete_data.json'),'utf8')),'ds');
  ds.scope={mode:'month',start:'2026-10-01',end:''};out.push(['dataset',ds]);
  const rh=M.fromDataset(JSON.parse(fs.readFileSync(path.join(__dirname,'..','data','complete_data.json'),'utf8')),'rh');
  rh.scope={mode:'month',start:'2026-10-01',end:''};rh.book=[];rh.goals=[];
  const pl=M.plannable(rh);
  const aoa=[['date','place','people']].concat(pl.slice(0,15).map((s,i)=>['2026-09-'+String(10+i%15).padStart(2,'0'),s.name,rh.people[0].name]));
  rh.history=M.mergeHistory([],M.parseHistoryRows(rh,aoa).recs).list;
  rh.recency=M.normRecency({mode:'range',min:45,max:75,hard:true,personDays:30});
  out.push(['recency-hard',rh]);
  out.push(['imp',F.fImp(M)]);out.push(['tight',F.fTight(M,100)]);
  return out;
}
function run(opts){
  const {M,E}=load();
  const res=[];
  for(const [name,ws] of variants(M)){
    const C=M.compile(ws);
    if(!C.P.V)continue;
    for(let k=1;k<=(opts&&opts.n||6);k++){
      const sol=randomSol(C.P,k*131+7);
      const ev=E.evaluate(C.P,sol);
      const fake={cost:ev.cost,breakdown:ev.breakdown,issues:ev.issues};
      const fails=O.check(fake,null,{units:true});
      res.push({name,k,fails,cnt:O.counts(ev.issues),bd:ev.breakdown});
    }
  }
  return res;
}
module.exports={run,randomSol,variants};
