function exactStaffing(P,siteOf,limit){
  const D=P.D,S=P.S,perDay=P.rules.perDay>0?P.rules.perDay:99;
  const seats=[];
  for(let v=0;v<P.V;v++){
    const s=siteOf[v];if(s<0)continue;
    for(let z=P.vSeat0[v];z<P.vSeat0[v]+P.vSeatN[v];z++){
      if(P.need[P.sCat[s]*P.R+P.seatRole[z]]>P.seatIdx[z]&&P.seatLock[z]===-2)seats.push(z);
    }
  }
  const worked=Array.from({length:P.N},()=>[]),dayCnt=new Int32Array(P.N*D),inVisit=new Set();
  const assign=new Map();let nodes=0;
  const okAdd=(p,z)=>{
    const v=P.seatVisit[z],d=P.vDay[v],s=siteOf[v];
    if(!P.pAvail[p*D+d])return false;
    if(P.aff&&P.aff[p*S+s]===2)return false;
    if(inVisit.has(p*100000+v))return false;
    if(dayCnt[p*D+d]>=perDay)return false;
    const w=worked[p];
    const days=dayCnt[p*D+d]>0?w.slice():w.concat([d]);
    if(P.pMaxLoad[p]>=0&&w.length+1>P.pMaxLoad[p])return false;
    if(P.pMaxWeek[p]>=0){const cnt={};let tot=0;for(const x of w.concat([d]))cnt[P.dayWk[x]]=(cnt[P.dayWk[x]]||0)+1;for(const k in cnt)if(cnt[k]>P.pMaxWeek[p])return false}
    if(dayCnt[p*D+d]===0){
      const all=w.concat([d]).sort((a,b)=>a-b);const rm=P.pRun[p],om=P.pOff[p];
      let run=1;
      for(let i=1;i<all.length;i++){
        const g=P.dayNum[all[i]]-P.dayNum[all[i-1]];
        if(rm>0){if(g===1){run++;if(run>rm)return false}else{run=1;if(g-1<om)return false}}
        else if(g>1&&g-1<om)return false;
      }
    }
    return true;
  };
  const dom=z=>{const out=[];for(const p of P.roleMembers[P.seatRole[z]])if(okAdd(p,z))out.push(p);return out};
  const left=new Set(seats);
  const rec=()=>{
    if(!left.size)return true;
    if(++nodes>limit)throw new Error('limit');
    let bz=-1,bd=null;
    for(const z of left){const d=dom(z);if(!d.length)return false;if(bd===null||d.length<bd.length){bd=d;bz=z;if(d.length===1)break}}
    left.delete(bz);
    const v=P.seatVisit[bz],d=P.vDay[v];
    for(const p of bd){
      const had=dayCnt[p*D+d]>0;
      if(!had)worked[p].push(d);dayCnt[p*D+d]++;inVisit.add(p*100000+v);
      if(rec())return true;
      inVisit.delete(p*100000+v);dayCnt[p*D+d]--;if(!had)worked[p].pop();
    }
    left.add(bz);return false;
  };
  try{return {feasible:rec(),nodes,seats:seats.length}}catch(e){return {feasible:null,nodes,seats:seats.length}}
}
module.exports={exactStaffing};
