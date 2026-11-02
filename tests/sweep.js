const {load}=require('./load');
const F=require('./fixtures');
const SEEDS=[1,2,3,7,42];
function run(variants,opts){
  const {M,E}=load();
  const names=(opts&&opts.templates)||['field','retail','care'],q=(opts&&opts.quality)||'fast';
  const out={};
  for(const v of variants){
    out[v.name]={};let tot=0,n=0;
    for(const name of names){
      const costs=[];let h=0;
      for(const seed of SEEDS){
        const ws=F.tune(opts&&opts.make?opts.make(M,name):F.base(M,name),seed,q);
        const C=M.compile(ws);Object.assign(C.P,v.p||{});
        const r=E.solve(C.P);costs.push(r.cost);h+=r.tierCost.H+r.tierCost.I;
      }
      const mean=costs.reduce((a,b)=>a+b,0)/costs.length;
      out[v.name][name]={mean,costs,hi:h};tot+=mean;n++;
    }
    out[v.name].avg=tot/n;
  }
  return out;
}
module.exports={run,SEEDS};
