const {load}=require('./load');
const F=require('./fixtures');
function rng(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function randomWs(M,seed,mode){
  const r=rng(seed*7919+13),pick=(a,b)=>a+Math.floor(r()*(b-a+1));
  const ws=M.TEMPLATES.blank();
  const r1=ws.roles[0],R=pick(1,2);if(R===2)ws.roles.push(M.mkRole('Y',M.COLORS[3]));
  ws.categories[0].staff={[r1.id]:pick(1,3)};
  if(R===2)ws.categories[0].staff[ws.roles[1].id]=pick(0,2);
  const np=pick(3,9);
  ws.people=Array.from({length:np},(_,i)=>{
    const role=R===2&&r()<.5?ws.roles[1].id:r1.id;
    const days=[0,1,2,3,4,5,6].map(()=>r()<.75);
    return M.mkPerson('P'+i,[role],{days,maxLoad:r()<.4?pick(2,6):'',maxWeek:r()<.3?pick(2,4):'',runMax:r()<.4?pick(1,3):'',offMin:r()<.4?pick(1,2):''});
  });
  ws.sites=Array.from({length:pick(3,6)},(_,i)=>M.mkSite('S'+i,ws.categories[0].id,i+1,{maxV:r()<.2?pick(1,3):''}));
  ws.week=[0,1,2,3,4,5,6].map(()=>({on:r()<.8,n:pick(1,2),focus:'auto'}));
  ws.rules.runMax=pick(0,2);ws.rules.offMin=pick(0,2);ws.rules.weekStart=0;ws.rules.mode=mode;
  ws.scope={mode:'custom',start:'2026-10-05',end:'2026-10-'+String(pick(11,18))};
  return ws;
}
function run(n){
  const {M,E}=load();
  let sound=0,unsound=[],tight=0,withBound=0,total=0,fp=0;
  for(const mode of ['bend','strict'])for(let i=1;i<=n;i++){
    const ws=F.tune(randomWs(M,i,mode),i,'fast');
    const C=M.compile(ws);if(!C.P.V)continue;
    const r=E.solve(C.P);total++;
    const open=r.stats.seats-r.stats.filled,lb=C.pre.lbOpen;
    if(open>=lb)sound++;else unsound.push({mode,i,open,lb});
    if(lb>0){withBound++;if(open===lb)tight++}
  }
  return {total,sound,unsound,withBound,tight};
}
module.exports={run,randomWs};
