const {load}=require('./load');
const F=require('./fixtures');
const O=require('./oracle');
const SEEDS=[1,2,3,7,42],QUALITIES=['fast','balanced'];
function fnv(a){let h=0x811c9dc5;for(let i=0;i<a.length;i++){h^=a[i]&0xff;h=Math.imul(h,0x01000193);h^=(a[i]>>8)&0xff;h=Math.imul(h,0x01000193)}return(h>>>0).toString(36)}
function round(o){const r={};for(const k in o)r[k]=Math.round(o[k]*1e6)/1e6;return r}
function record(M,E,ws){
  const C=M.compile(ws);
  if(process.env.MV_TIERS==='off')C.P.tiers=false;
  const t0=process.hrtime.bigint();
  const r=E.solve(C.P);
  const ms=Number((process.hrtime.bigint()-t0)/1000000n);
  if(r.empty)return {empty:true,V:0};
  const ev=E.evaluate(C.P,r);
  const mem=[...r.siteOf,...r.seatP];
  return {V:C.P.V,Z:C.P.Z,iters:C.P.iters,cost:Math.round(r.cost*1e6)/1e6,breakdown:round(r.breakdown),issues:O.counts(r.issues),filled:r.stats.filled,seats:r.stats.seats,hash:fnv(mem),ms,oracle:O.check(r,ev),P:C.P,sol:r};
}
function matrix(opts){
  const {M,E}=load();
  const out={};
  const names=(opts&&opts.templates)||F.TEMPLATES,seeds=(opts&&opts.seeds)||SEEDS,quals=(opts&&opts.qualities)||QUALITIES;
  for(const name of names)for(const q of quals)for(const seed of seeds){
    const ws=F.tune(F.base(M,name),seed,q);
    const rec=record(M,E,ws);
    out[name+'/'+q+'/'+seed]=rec;
  }
  return out;
}
function strip(rec){const o=Object.assign({},rec);delete o.P;delete o.sol;return o}
module.exports={matrix,record,strip,fnv,SEEDS,QUALITIES};
