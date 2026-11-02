const EPS=1e-6;
const HARD=20000,NOSITE=6000,OPEN=1000,DUP=2500;
const GROUPS=[
  {term:'hard',test:i=>['maxload','maxweek','perday','ban','unavail','sitemax','siteoff','dupseat'].includes(i.k)},
  {term:'rest',test:i=>i.k==='rest'||i.k==='run'},
  {term:'coverage',test:i=>i.k==='nosite'||i.k==='open'},
  {term:'distinct',test:i=>i.k==='dup'},
  {term:'goalsH',test:i=>i.k==='injset'||((i.k==='goal'||i.k==='injwho')&&i.sev==='warn')},
  {term:'bookH',test:i=>['rulesite','ruleday','rulewith'].includes(i.k)||((i.k==='ruleteam'||i.k==='rulecount')&&i.sev==='warn')},
  {term:'recencyH',test:i=>i.k==='rcearly'&&i.sev==='warn'}
];
function counts(issues){const c={};for(const i of issues)c[i.k]=(c[i.k]||0)+1;return c}
function units(iss){
  let hard=0,open=0,nosite=0,dup=0;
  for(const i of iss){
    if(i.k==='maxload')hard+=i.n-i.max;
    else if(i.k==='perday')hard+=i.n-1;
    else if(i.k==='maxweek')hard+=i.n-i.max;
    else if(i.k==='ban'||i.k==='unavail'||i.k==='siteoff'||i.k==='dupseat')hard+=1;
    else if(i.k==='sitemax')hard+=i.n-i.max;
    else if(i.k==='open')open+=i.n;
    else if(i.k==='nosite')nosite+=1;
    else if(i.k==='dup')dup+=1;
  }
  return {hard,open,nosite,dup};
}
function check(sol,evalRes,opts){
  const fails=[];
  const bd=sol.breakdown,iss=sol.issues;
  for(const g of GROUPS){
    const t=bd[g.term]>EPS,n=iss.filter(g.test).length>0;
    if(t!==n)fails.push({rule:g.term,breakdown:bd[g.term],issues:iss.filter(g.test).length});
  }
  if(opts&&opts.units){
    const u=units(iss);
    const eq=(a,b)=>Math.abs(a-b)<1e-6;
    if(!eq(bd.hard,u.hard*HARD))fails.push({rule:'hard-units',breakdown:bd.hard/HARD,issues:u.hard});
    if(!eq(bd.coverage,u.open*OPEN+u.nosite*NOSITE))fails.push({rule:'coverage-units',breakdown:bd.coverage,issues:u.open*OPEN+u.nosite*NOSITE});
    if(!eq(bd.distinct,u.dup*DUP))fails.push({rule:'distinct-units',breakdown:bd.distinct,issues:u.dup*DUP});
  }
  const total=Object.keys(bd).reduce((a,k)=>a+bd[k],0);
  if(Math.abs(total-sol.cost)>1e-6*Math.max(1,Math.abs(sol.cost)))fails.push({rule:'sum',breakdown:total,cost:sol.cost});
  if(evalRes&&Math.abs(evalRes.cost-sol.cost)>1e-6*Math.max(1,Math.abs(sol.cost)))fails.push({rule:'evaluate',a:evalRes.cost,b:sol.cost});
  return fails;
}
module.exports={check,counts,GROUPS};
