(function(G){
'use strict';
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let uidN=0;
const uid=p=>(p||'')+Date.now().toString(36).slice(-4)+Math.random().toString(36).slice(2,7)+(uidN++).toString(36);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sum=a=>a.reduce((x,y)=>x+y,0);
const avg=a=>a.length?sum(a)/a.length:0;
const num=(v,d)=>{const x=parseFloat(v);return isFinite(x)?x:d};
const intOr=(v,d)=>{if(v===''||v==null)return d;const x=parseInt(v,10);return isFinite(x)?x:d};
const byId=(arr,id)=>arr.find(x=>x.id===id);
const clone=o=>JSON.parse(JSON.stringify(o));
function fnv(str){let h=0x811c9dc5;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193)}return(h>>>0).toString(36)}
function gini(xs){const n=xs.length;if(!n)return 0;const s=sum(xs);if(!s)return 0;const a=xs.slice().sort((x,y)=>x-y);let g=0;for(let i=0;i<n;i++)g+=(2*(i+1)-n-1)*a[i];return g/(n*s)}
function mulberry32(a){return function(){a|=0;a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}

const pISO=s=>{const p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])};
const fISO=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addISO=(s,n)=>{const d=pISO(s);d.setDate(d.getDate()+n);return fISO(d)};
const dowOf=s=>pISO(s).getDay();
const dayNum=s=>{const p=s.split('-').map(Number);return Math.round(Date.UTC(p[0],p[1]-1,p[2])/864e5)};
const diffDays=(a,b)=>dayNum(b)-dayNum(a);
const todayISO=()=>fISO(new Date());
const validISO=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&fISO(pISO(s))===s;
function weekStartOf(iso,ws){const d=dowOf(iso);return addISO(iso,-((d-ws+7)%7))}

const COLORS=['#5A4E7C','#6F8AA3','#4D7178','#B0765A','#6E8A63','#A0596A','#8A7A4C','#4F7C72','#7B6592','#98806C'];
const LEVELS=[0,25,50,75,100];
const WEIGHT_KEYS=['goals','book','rank','fair','rotate','mix','pref','home','route','focus','cluster','spacing','pairs','likes'];
const defaultWeights=()=>({fair:70,pref:45,home:35,route:40,rotate:60,mix:60,focus:55,cluster:45,spacing:35,pairs:50,likes:40,rank:60,goals:80,book:50});
const defaultUseW=()=>{const o={};WEIGHT_KEYS.forEach(k=>o[k]=true);return o};
const defaultRules=()=>({perDay:1,runMax:1,offMin:1,distinct:true,siteGap:0,mode:'bend',nearKm:10,weekStart:0,rankGate:'off',rankTol:25});
const defaultEngine=()=>({seed:20260907,quality:'balanced',runs:3,live:true});
const defaultSizing=()=>({mode:'rhythm',total:40});
const WEEK5=(start,n)=>{const w=[];for(let i=0;i<7;i++)w.push({on:false,n:0,focus:'auto'});for(let i=0;i<5;i++)w[(start+i)%7]={on:true,n,focus:'auto'};return w};

const TERM_DEFAULT={
  en:{visit:'visit',visits:'visits',site:'site',sites:'sites',person:'person',people:'people'},
  ar:{visit:'زيارة',visits:'زيارات',site:'موقع',sites:'مواقع',person:'فرد',people:'أفراد'}
};

function blankWS(name){
  const now=Date.now();
  return {v:3,id:uid('w'),name:name||'Untitled plan',created:now,updated:now,
    template:'blank',
    terms:clone(TERM_DEFAULT),unit:'km',
    roles:[],categories:[],sites:[],people:[],locations:[],routes:[],goals:[],book:[],sizing:defaultSizing(),source:null,
    week:WEEK5(1,1),overrides:{},
    scope:{mode:'month',start:fISO(new Date(new Date().getFullYear(),new Date().getMonth(),1)),end:''},
    rules:defaultRules(),weights:defaultWeights(),useW:defaultUseW(),engine:defaultEngine(),
    locks:{sites:{},seats:{}},snapshots:[],plan:null};
}
function mkRole(name,color){return {id:uid('r'),name,color}}
function mkCat(name,color,staff,share,planned){return {id:uid('c'),name,color,staff:staff||{},share:share==null?1:share,planned:planned!==false}}
function mkLoc(name,km,o){return Object.assign({id:uid('l'),name,km:km||0},o||{})}
function mkSite(name,cat,km,o){return Object.assign({id:uid('s'),name,cat,km:km||0,loc:'',crit:50,tag:'',zone:'',weight:1,minV:'',maxV:'',days:[true,true,true,true,true,true,true],blackout:[],active:true,note:''},o||{})}
function mkPerson(name,roles,o){return Object.assign({id:uid('p'),name,roles:roles||[],home:0,homeLoc:'',rank:50,rankBy:{},gender:'',pref:'none',weight:1,days:[true,true,true,true,true,true,true],off:[],maxLoad:'',maxWeek:'',runMax:'',offMin:'',avoid:[],pair:[],likes:[],bans:[],active:true},o||{})}
function mkGoal(o){return Object.assign({id:uid('g'),on:true,per:'each',scope:'all',ref:'',op:'min',n:1},o||{})}

const SENSES=['prefer','avoid','only','never'];
const WHO_K=['all','person','role','gender','rankGe','rankLe','homeLoc'];
const WHAT_K=['all','site','cat','loc','tag','critGe','critLe','kmGe','kmLe'];
const RELS=['site','day','with','team','count'];
const TEAM_OPS=['min','max','exact','ifany'],COUNT_OPS=['min','max','exact'];
const FLIP={prefer:'avoid',avoid:'prefer',only:'never',never:'only'};
const isHard=r=>r.sense==='only'||r.sense==='never';
function normC(m,ks){m=m||{};const k=ks.includes(m.k)?m.k:'all';return {k,v:m.v==null?'':String(m.v),not:!!m.not&&k!=='all'}}
function normM(m,ks){const x=normC(m,ks);const more=(Array.isArray(m&&m.more)?m.more:[]).slice(0,3).map(c=>normC(c,ks)).filter(c=>c.k!=='all');if(more.length){x.more=more;x.join=m.join==='or'?'or':'and'}return x}
function parseDates(s){const out=new Set();String(s||'').split(/[\s,;]+/).forEach(tk=>{const m=tk.split('..');if(m.length===2&&validISO(m[0])&&validISO(m[1])){for(let d=m[0];d<=m[1]&&out.size<800;d=addISO(d,1))out.add(d)}else if(validISO(tk))out.add(tk)});return out}
function normRule(r){
  r=r||{};const rel=RELS.includes(r.rel)?r.rel:'site';
  let sense=SENSES.includes(r.sense)?r.sense:'avoid';
  const grp=rel==='team'||rel==='count';
  if(grp){if(sense==='avoid')sense='prefer';if(sense==='never')sense='only'}
  const ops=rel==='team'?TEAM_OPS:rel==='count'?COUNT_OPS:['min','max'];
  let what;
  if(rel==='day')what=r.what&&r.what.k==='dates'?{k:'dates',v:String(r.what.v||'')}:{k:'dow',v:arr7(r.what&&r.what.v,false)};
  else what=normM(r.what,rel==='with'?WHO_K:WHAT_K);
  return {id:typeof r.id==='string'&&r.id?r.id:uid('b'),on:r.on!==false,rel,sense,who:normM(r.who,WHO_K),what,
    op:ops.includes(r.op)?r.op:'max',n:clamp(intOr(r.n,1),0,rel==='count'?99:20),per:r.per==='week'?'week':'plan',w:clamp(num(r.w,50),0,100),note:String(r.note||'').slice(0,160)};
}
function mkRule(o){return normRule(Object.assign({on:true,rel:'site',sense:'avoid',who:{k:'all',v:''},what:{k:'all',v:''},op:'max',n:1,w:50},o||{}))}
function whoRaw(p,m){
  switch(m.k){
    case 'person':return p.id===m.v;
    case 'role':return p.roles.includes(m.v);
    case 'gender':return (p.gender||'')===m.v;
    case 'rankGe':return (+p.rank||0)>=(+m.v||0);
    case 'rankLe':return (+p.rank||0)<=(+m.v||0);
    case 'homeLoc':return (p.homeLoc||'')===m.v;
  }
  return true;
}
function whatRaw(s,m){
  switch(m.k){
    case 'site':return s.id===m.v;
    case 'cat':return s.cat===m.v;
    case 'loc':return s.loc===m.v;
    case 'tag':return (s.tag||'')===m.v;
    case 'critGe':return (+s.crit||0)>=(+m.v||0);
    case 'critLe':return (+s.crit||0)<=(+m.v||0);
    case 'kmGe':return (+s.km||0)>=(+m.v||0);
    case 'kmLe':return (+s.km||0)<=(+m.v||0);
  }
  return true;
}
function mc(raw,o,c){const x=raw(o,c);return c.not&&c.k!=='all'?!x:x}
function mAll(raw,o,m){let r=mc(raw,o,m);if(m.more)for(const c of m.more){const y=mc(raw,o,c);r=m.join==='or'?(r||y):(r&&y)}return r}
function whoMatch(p,m){return mAll(whoRaw,p,m)}
function whatMatch(s,m){return mAll(whatRaw,s,m)}
function refResolver(ws){
  const by=(arr,v,pre)=>{if(v==null||v==='')return '';v=String(v);const x=arr.find(a=>a.id===v)||arr.find(a=>a.id===pre+v)||arr.find(a=>String(a.name).trim()===v.trim());return x?x.id:v};
  return (k,v)=>{
    switch(k){
      case 'person':return by(ws.people,v,'p_');
      case 'role':return by(ws.roles,v,'r_');
      case 'cat':return by(ws.categories,v,'c_');
      case 'loc':case 'homeLoc':return by(ws.locations||[],v,'l_');
      case 'site':return by(ws.sites,v,'f_');
    }
    return v==null?'':String(v);
  };
}
function resolveBook(ws,list){
  const R=refResolver(ws);
  return (Array.isArray(list)?list:[]).map(r=>{
    const x=normRule(r);
    const rs=m=>{m.v=R(m.k,m.v);(m.more||[]).forEach(c=>c.v=R(c.k,c.v))};
    rs(x.who);
    if(x.rel!=='day')rs(x.what);
    if(!(r&&typeof r.id==='string'&&r.id))x.id=uid('b');
    return x;
  });
}
function resolveGoals(ws,list){
  const R=refResolver(ws);const map={cat:'cat',loc:'loc',site:'site'};
  return (Array.isArray(list)?list:[]).map(g=>mkGoal(Object.assign({},g,{id:uid('g'),ref:map[g.scope]?R(map[g.scope],g.ref):String(g.ref==null?'':g.ref)})));
}
function bookForExport(ws,list){
  const nm=(arr,id)=>{const x=byId(arr,id);return x?x.name:id};
  const out=(k,v)=>{
    switch(k){
      case 'role':return String(v).replace(/^r_/,'');
      case 'cat':return /^c_/.test(v)?v.slice(2):nm(ws.categories,v);
      case 'loc':case 'homeLoc':return nm(ws.locations||[],v);
      case 'site':return nm(ws.sites,v);
    }
    return v;
  };
  const side=(m)=>{const o={k:m.k,v:out(m.k,m.v)};if(m.not)o.not=true;if(m.more&&m.more.length){o.more=m.more.map(side);o.join=m.join}return o};
  return (list||ws.book||[]).map(r=>{const o={on:r.on,rel:r.rel,sense:r.sense,who:side(r.who),what:r.rel==='day'?(r.what.k==='dates'?{k:'dates',v:r.what.v}:{k:'dow',v:r.what.v.slice()}):side(r.what),w:r.w};
    if(r.rel==='team'||r.rel==='count'){o.op=r.op;o.n=r.n}if(r.rel==='count')o.per=r.per;if(r.note)o.note=r.note;return o});
}

function tplBlank(){
  const w=blankWS('Untitled plan');
  const r=mkRole('Lead',COLORS[0]);w.roles=[r];
  w.categories=[mkCat('Standard',COLORS[0],{[r.id]:1},1)];
  return w;
}
function tplField(){
  const w=blankWS('Field inspections');w.template='field';
  w.terms={en:{visit:'visit',visits:'visits',site:'facility',sites:'facilities',person:'inspector',people:'inspectors'},
           ar:{visit:'زيارة',visits:'زيارات',site:'مرفق',sites:'مرافق',person:'مفتش',people:'مفتشون'}};
  const fin=mkRole('Financial',COLORS[0]),cli=mkRole('Clinical',COLORS[2]);w.roles=[fin,cli];
  const main=mkCat('Main',COLORS[0],{[fin.id]:2,[cli.id]:2},3),con=mkCat('Contracted',COLORS[3],{[fin.id]:1,[cli.id]:2},1),exc=mkCat('Excluded',COLORS[6],{},0,false);
  w.categories=[main,con,exc];
  const locs=[['Central',0],['North',18],['Old Town',25],['East',26],['Westgate',29],['Riverside',37],['South',45],['Harbour',50],['Hills',66],['Valley',82]].map(([n,k])=>mkLoc(n,k));
  w.locations=locs;const L=n=>locs.find(l=>l.name===n).id;
  const mains=[['Branch HQ','Central',100],['Records Office','Central',75],['Medical Affairs','Central',75],['Legal Affairs','Central',50],['Fleet Depot','Central',50],['Annex','Central',50],['North Clinic','North',75],['North Students Unit','North',75],['East Workforce Unit','East',100],['East Evening Clinic','East',50],['Riverside Clinic','Riverside',75],['Harbour Clinic','Harbour',75],['South Students Unit','South',75],['South Evening Clinic','South',50],['Westgate Clinic','Westgate',75],['Hill District Unit','Hills',75],['Valley Unit','Valley',50],['Old Town Clinic','Old Town',75]];
  const cons=[['Alpha Imaging','Central'],['Crescent Hospital','Central'],['Nile Heart Center','Central'],['Royal East Hospital','Central'],['Family Lab','Central'],['Delta Scan','Riverside'],['Riverside Radiology','Riverside'],['Harbour Dialysis','Harbour'],['Sunrise Nursery','Old Town'],['Hope Kidney Center','Hills'],['Prime Lab','North'],['Grand Hospital','South']];
  const excl=[['Governorate Office','Central'],['Election Committee','Central'],['Prosecution Office','East']];
  w.sites=mains.map(([n,l,c])=>mkSite(n,main.id,0,{loc:L(l),crit:c,tag:'Clinic'})).concat(cons.map(([n,l])=>mkSite(n,con.id,0,{loc:L(l),crit:50,tag:'Provider'}))).concat(excl.map(([n,l])=>mkSite(n,exc.id,0,{loc:L(l),crit:0})));
  const P=(n,r,home,pref,rank)=>mkPerson(n,[r],{homeLoc:L(home),pref,rank,days:[true,true,true,true,true,false,false]});
  w.people=[P('Lubna',fin.id,'Central','near',50),P('Abaza',fin.id,'North','none',75),P('Shaltout',fin.id,'East','near',50),P('Amani',fin.id,'Central','none',100),P('Ghada',fin.id,'Old Town','near',50),
    P('Hamoudin',cli.id,'Central','near',75),P('Shawky',cli.id,'South','far',25),P('Asmaa',cli.id,'Central','none',50),P('Mariam',cli.id,'Riverside','near',100),P('Sharnouby',cli.id,'North','none',50),P('Maysara',cli.id,'Central','near',75)];
  w.week=[{on:true,n:1,focus:'auto'},{on:true,n:1,focus:'auto'},{on:true,n:1,focus:'auto'},{on:true,n:1,focus:'auto'},{on:true,n:2,focus:'near'},{on:false,n:0,focus:'auto'},{on:false,n:0,focus:'auto'}];
  w.rules.weekStart=0;w.rules.rankGate='lead';
  syncLoc(w);
  return w;
}
function tplRetail(){
  const w=blankWS('Store audits');w.template='retail';
  w.terms={en:{visit:'audit',visits:'audits',site:'store',sites:'stores',person:'auditor',people:'field team'},
           ar:{visit:'تدقيق',visits:'تدقيقات',site:'متجر',sites:'متاجر',person:'مدقق',people:'الفريق الميداني'}};
  const au=mkRole('Auditor',COLORS[0]),me=mkRole('Merchandiser',COLORS[4]);w.roles=[au,me];
  const fl=mkCat('Flagship',COLORS[0],{[au.id]:1,[me.id]:2},2),fr=mkCat('Franchise',COLORS[2],{[au.id]:1,[me.id]:1},3),ki=mkCat('Kiosk',COLORS[7],{[me.id]:1},2);
  w.categories=[fl,fr,ki];
  const zones=['North','South','East','West','Central'];const rnd=mulberry32(77);
  const names=['Market Square','Harbor Point','Maple Row','Station Plaza','Cedar Mall','Riverside','Old Mill','Lakeside','Grand Avenue','Park Lane','Union Street','Hilltop','Oak Court','Bayview','Kings Cross','Garden City','Metro Hub','Airport','University','Seafront','Westfield','East Gate','Pine Ridge','Canal Walk','Sunset Blvd','Highland','Queensway','Mill Road'];
  names.forEach((n,i)=>{const cat=i<5?fl.id:i<17?fr.id:ki.id;const z=i%5;w.sites.push(mkSite(n,cat,Math.round(2+rnd()*40),{zone:zones[z],weight:i<5?1.5:1,crit:i<5?75:50}))});
  const P=(n,r,home,pref)=>mkPerson(n,[r],{home,pref,days:[false,true,true,true,true,true,false]});
  w.people=[P('Noah',au.id,8,'none'),P('Layla',au.id,20,'far'),P('Omar',au.id,5,'near'),P('Zara',au.id,14,'none'),
    P('Ivy',me.id,6,'near'),P('Sami',me.id,18,'none'),P('Rana',me.id,11,'far'),P('Theo',me.id,3,'near'),P('Mina',me.id,25,'none'),P('Karim',me.id,9,'none')];
  w.people[0].roles=[au.id,me.id];
  w.week=WEEK5(1,3);w.rules.weekStart=1;w.rules.siteGap=5;w.rules.runMax=0;w.rules.offMin=0;
  return w;
}
function tplCare(){
  const w=blankWS('Home-care rounds');w.template='care';
  w.terms={en:{visit:'round',visits:'rounds',site:'client',sites:'clients',person:'carer',people:'carers'},
           ar:{visit:'جولة',visits:'جولات',site:'عميل',sites:'عملاء',person:'مقدّم رعاية',people:'مقدّمو الرعاية'}};
  const nu=mkRole('Nurse',COLORS[0]),ai=mkRole('Aide',COLORS[4]);w.roles=[nu,ai];
  const cx=mkCat('Complex care',COLORS[0],{[nu.id]:1,[ai.id]:1},1),rt=mkCat('Routine',COLORS[4],{[ai.id]:1},2);
  w.categories=[cx,rt];
  const rnd=mulberry32(19);const zones=['A','B','C'];
  const names=['Mrs. Adams','Mr. Baker','Ms. Chen','Mr. Diaz','Mrs. Evans','Mr. Farouk','Ms. Grant','Mr. Hughes','Mrs. Ito','Mr. Jensen','Ms. Khan','Mr. Lopez','Mrs. Moreau','Mr. Novak','Ms. Okafor','Mr. Patel'];
  names.forEach((n,i)=>w.sites.push(mkSite(n,i<6?cx.id:rt.id,Math.round(1+rnd()*18),{zone:zones[i%3],minV:i<6?2:'',weight:i<6?1.3:1,crit:i<6?75:25})));
  const P=(n,r,home,pref,days)=>mkPerson(n,[r],{home,pref,days,maxWeek:5});
  const wd=[false,true,true,true,true,true,false],all=[true,true,true,true,true,true,true];
  w.people=[P('Alice',nu.id,4,'near',wd),P('Ben',nu.id,9,'none',all),P('Carla',nu.id,12,'far',wd),
    P('Dev',ai.id,2,'near',wd),P('Ella',ai.id,7,'none',all),P('Femi',ai.id,15,'none',wd),P('Gia',ai.id,5,'near',wd),P('Hugo',ai.id,10,'none',all)];
  w.week=[{on:true,n:2,focus:'auto'},{on:true,n:4,focus:'auto'},{on:true,n:4,focus:'auto'},{on:true,n:4,focus:'auto'},{on:true,n:4,focus:'auto'},{on:true,n:4,focus:'auto'},{on:true,n:2,focus:'auto'}];
  w.rules.weekStart=1;w.rules.runMax=0;w.rules.offMin=0;w.rules.nearKm=8;w.scope={mode:'week',start:weekStartOf(todayISO(),1),end:''};
  return w;
}
const TEMPLATES={blank:tplBlank,field:tplField,retail:tplRetail,care:tplCare};
const TEMPLATE_ORDER=['field','retail','care','blank'];

function fromDataset(o,name){
  const w=blankWS(name||o.name||'Beheira branch');w.template='dataset';
  w.terms={en:{visit:'visit',visits:'visits',site:'facility',sites:'facilities',person:'member',people:'team'},
           ar:{visit:'زيارة',visits:'زيارات',site:'منشأة',sites:'منشآت',person:'عضو',people:'الفريق'}};
  if(o.terms&&typeof o.terms==='object'){w.terms.en=Object.assign(w.terms.en,o.terms.en||{});w.terms.ar=Object.assign(w.terms.ar,o.terms.ar||{})}
  const dist=o.location_distances_km||{};
  const lid=n=>'l_'+fnv(String(n));
  w.locations=Object.keys(dist).map(n=>mkLoc(n,Math.max(0,num(dist[n],0)),{id:lid(n)}));
  const locId=n=>{if(!n)return '';let l=w.locations.find(x=>x.name===n);if(!l){l=mkLoc(n,0,{id:lid(n),unknown:true});w.locations.push(l)}return l.id};
  const pools=o.pools||{fin:{id:'fin',name:'Financial/Admin',seats:{basic:2,contracted:1}},clin:{id:'clin',name:'Clinical',seats:{basic:2,contracted:2}}};
  const pk=Object.keys(pools);
  const roles={};pk.forEach((k,i)=>{roles[k]=mkRole(pools[k].name||k,pools[k].color||COLORS[i===0?0:2+i]);roles[k].id='r_'+k});
  w.roles=pk.map(k=>roles[k]);
  const st=kind=>{const s={};pk.forEach(k=>s[roles[k].id]=intOr(pools[k].seats&&pools[k].seats[kind],0));return s};
  const ds=o.default_settings||{};
  const rp=num(ds.ratioP,.25);const bShare=rp>0&&rp<1?Math.max(1,Math.round((1-rp)/rp)):3;
  const cBasic=mkCat('Basic',COLORS[0],st('basic'),bShare),cCon=mkCat('Contracted',COLORS[3],st('contracted'),1),cExc=mkCat('Excluded',COLORS[6],{},0,false);
  cBasic.id='c_basic';cCon.id='c_contracted';cExc.id='c_excluded';
  w.categories=[cBasic,cCon,cExc];
  const kindCat={basic:cBasic.id,contracted:cCon.id,excluded:cExc.id};
  const cg=o.categories||{};const pats=cg.excluded_by_name_pattern||[];
  const kindOf=f=>{if(f.kind)return f.kind;if(pats.some(p=>String(f.name).includes(p)))return 'excluded';for(const k of ['basic','contracted','excluded'])if((cg[k]||[]).includes(f.category))return k;return 'basic'};
  const crits=o.facility_criticality||{};
  const facs=o.facilities||[];
  w.sites=facs.map((f,i)=>{const k=kindOf(f);const cr=f.crit!=null?f.crit:crits[f.name]!=null?crits[f.name]:(k==='excluded'?0:50);
    const low=(o.admin_low_frequency_facilities||[]).includes(f.name);
    return mkSite(String(f.name),kindCat[k]||cBasic.id,0,{id:f.id||('f_'+i),loc:locId(f.location),tag:f.category||'',crit:clamp(num(cr,50),0,100),weight:clamp(num(f.weight,low?.5:1),.1,3),active:f.active!==false,minV:f.min==null?'':f.min,maxV:f.max==null?'':f.max})});
  const wd=Array.isArray(ds.weekdays)?ds.weekdays:[0,1,2,3,4];
  const per=Math.max(1,intOr(ds.maxVisitsPerDay,1));
  w.week=[0,1,2,3,4,5,6].map(i=>({on:wd.includes(i),n:wd.includes(i)?per:0,focus:'auto'}));
  w.people=(o.people||[]).map((p,i)=>{
    const rr=roles[p.pool]?[roles[p.pool].id]:w.roles.map(r=>r.id);
    const rb=num(p.rankBasic,null),rc=num(p.rankContracted,null);
    const rank=p.rank!=null?num(p.rank,50):(rb!=null&&rc!=null?Math.round((rb+rc)/2):50);
    const rankBy={};if(rb!=null)rankBy[cBasic.id]=rb;if(rc!=null)rankBy[cCon.id]=rc;
    const days=Array.isArray(p.workWeekdays)?[0,1,2,3,4,5,6].map(d=>p.workWeekdays.includes(d)):[true,true,true,true,true,true,true];
    const pat=p.pattern&&typeof p.pattern==='object'?p.pattern:{};
    return mkPerson(String(p.name),rr,{id:p.id||('p_'+i),homeLoc:locId(p.originLocationId||''),rank,rankBy,gender:p.gender||'',weight:clamp(num(p.weight,1),.1,3),active:p.active!==false,days,
      off:(Array.isArray(p.unavailable)?p.unavailable:[]).filter(validISO),bans:Array.isArray(p.blockedFacilities)?p.blockedFacilities:[],pref:num(p.distanceAffinity,0)>0?'far':num(p.distanceAffinity,0)<0?'near':'none',note:p.title||'',
      runMax:pat.work==null?'':intOr(pat.work,''),offMin:pat.rest==null?'':intOr(pat.rest,''),maxLoad:p.maxTotal==null?'':p.maxTotal,maxWeek:p.maxWeek==null?'':p.maxWeek})});
  const cad=ds.cadence||{};const gap=intOr(cad.gapDays,2);
  w.rules.runMax=gap>=2?1:0;w.rules.offMin=gap>=2?gap-1:0;
  w.rules.perDay=1;w.rules.weekStart=6;
  w.rules.rankGate=ds.critMode==='require'?'lead':'off';w.rules.rankTol=25;
  if(cad.mode==='strict')w.rules.mode='strict';
  (Array.isArray(ds.holidays)?ds.holidays:[]).filter(validISO).forEach(iso=>{w.overrides[iso]={on:false,n:0,focus:'auto'}});
  const d=new Date();w.scope={mode:'month',start:fISO(new Date(d.getFullYear(),d.getMonth(),1)),end:''};
  const R=refResolver(w);
  w.routes=(Array.isArray(o.routes)?o.routes:[]).map(r=>({id:uid('t'),a:R('loc',r.from!=null?r.from:r.a),b:R('loc',r.to!=null?r.to:r.b),km:Math.max(0,num(r.km,0))})).filter(r=>r.a&&r.b&&r.a!==r.b);
  const se=o.settings&&typeof o.settings==='object'?o.settings:{};
  if(se.rules)Object.assign(w.rules,se.rules);
  if(se.weights)Object.assign(w.weights,se.weights);
  if(se.useW)Object.assign(w.useW,se.useW);
  if(se.engine)Object.assign(w.engine,se.engine);
  if(se.sizing)Object.assign(w.sizing,se.sizing);
  if(se.unit)w.unit=se.unit;
  if(Array.isArray(se.week))w.week=normWeek(se.week);
  if(se.categories&&typeof se.categories==='object')for(const k in se.categories){const c=w.categories.find(x=>x.id==='c_'+k||x.name===k);if(c)Object.assign(c,se.categories[k])}
  if(Array.isArray(se.goals))w.goals=resolveGoals(w,se.goals);
  const book=o.rulebook||se.rulebook;
  if(Array.isArray(book))w.book=resolveBook(w,book);
  const gr=ds.genderRule&&typeof ds.genderRule==='object'?ds.genderRule:{};
  Object.keys(gr).forEach(kind=>{
    const v=String(gr[kind]==null?'':gr[kind]).trim();if(!/^\d\d$/.test(v))return;
    const cid='c_'+kind;if(!w.categories.some(c=>c.id===cid))return;
    if(w.book.some(r=>r.rel==='team'&&r.who.k==='gender'&&r.who.v==='f'&&r.what.k==='cat'&&r.what.v===cid))return;
    w.book.push(normRule({rel:'team',sense:'prefer',what:{k:'cat',v:cid},op:'max',n:+v[1],who:{k:'gender',v:'f'},w:40,note:'genderRule.'+kind+' = '+v}));
  });
  syncLoc(w);
  return normalize(w);
}
function mergeDataset(old,nw){
  const remap={};
  const match=(oa,na)=>na.forEach(n=>{const o=oa.find(x=>x.id===n.id)||oa.find(x=>x.name===n.name);if(o&&o.id!==n.id)remap[n.id]=o.id});
  match(old.roles,nw.roles);match(old.categories,nw.categories);match(old.locations||[],nw.locations);match(old.sites,nw.sites);match(old.people,nw.people);
  const R=id=>remap[id]||id;
  const rk=o=>{const x={};for(const k in o)x[R(k)]=o[k];return x};
  nw.roles.forEach(r=>r.id=R(r.id));
  nw.categories.forEach(c=>{c.id=R(c.id);c.staff=rk(c.staff)});
  nw.locations.forEach(l=>l.id=R(l.id));
  nw.sites.forEach(s=>{s.id=R(s.id);s.cat=R(s.cat);s.loc=R(s.loc)});
  nw.people.forEach(p=>{p.id=R(p.id);p.roles=p.roles.map(R);p.homeLoc=R(p.homeLoc);p.rankBy=rk(p.rankBy);p.bans=p.bans.map(R);p.likes=p.likes.map(R)});
  (nw.routes||[]).forEach(r=>{r.a=R(r.a);r.b=R(r.b)});
  const out=clone(old);
  out.roles=nw.roles.map(r=>{const o=byId(old.roles,r.id);return o?Object.assign({},r,{name:o.name,color:o.color}):r});
  const oldExtraCats=old.categories.filter(c=>!nw.categories.some(n=>n.id===c.id)&&old.sites.some(s=>s.cat===c.id&&!nw.sites.some(n=>n.id===s.id)));
  out.categories=nw.categories.map(c=>{const o=byId(old.categories,c.id);return o?clone(o):c}).concat(oldExtraCats.map(clone));
  out.locations=nw.locations;
  const uniq=a=>Array.from(new Set(a));
  out.sites=nw.sites.map(s=>{const o=byId(old.sites,s.id);if(!o)return s;return Object.assign({},s,{days:o.days,blackout:o.blackout,zone:o.zone,note:o.note,weight:o.weight,active:s.active&&o.active,minV:o.minV!==''?o.minV:s.minV,maxV:o.maxV!==''?o.maxV:s.maxV})});
  out.people=nw.people.map(p=>{const o=byId(old.people,p.id);if(!o)return p;return Object.assign({},p,{days:o.days,off:uniq(o.off.concat(p.off)),avoid:o.avoid,pair:o.pair,likes:uniq(o.likes.concat(p.likes)),bans:uniq(o.bans.concat(p.bans)),
    maxLoad:o.maxLoad!==''?o.maxLoad:p.maxLoad,maxWeek:o.maxWeek!==''?o.maxWeek:p.maxWeek,runMax:o.runMax!==''?o.runMax:p.runMax,offMin:o.offMin!==''?o.offMin:p.offMin,pref:o.pref!=='none'?o.pref:p.pref,active:p.active&&o.active})});
  out.routes=(nw.routes||[]).length?nw.routes:(old.routes||[]);
  out.book=(old.book||[]).length?old.book:(nw.book||[]);
  out.goals=old.goals.length?old.goals:nw.goals;
  out.source=nw.source||old.source;
  out.updated=Date.now();
  syncLoc(out);
  return normalize(out);
}
function toDataset(ws){
  const ln=id=>{const l=byId(ws.locations||[],id);return l?l.name:''};
  const kindOf=cid=>/^c_/.test(cid)?cid.slice(2):String((byId(ws.categories,cid)||{}).name||cid).toLowerCase();
  const pools={};ws.roles.forEach(r=>{const k=r.id.replace(/^r_/,'');const seats={};ws.categories.forEach(c=>{if(c.planned)seats[kindOf(c.id)]=c.staff[r.id]||0});pools[k]={id:k,name:r.name,color:r.color,seats}});
  const dist={};(ws.locations||[]).slice().sort((a,b)=>a.km-b.km).forEach(l=>dist[l.name]=l.km);
  const crit={};ws.sites.forEach(s=>crit[s.name]=s.crit);
  const cats={};ws.categories.forEach(c=>{const k=kindOf(c.id);cats[k]=Array.from(new Set(ws.sites.filter(s=>s.cat===c.id).map(s=>s.tag).filter(Boolean)))});
  const pc=ws.categories.filter(c=>c.planned);
  const weekdays=[];ws.week.forEach((d,i)=>{if(d.on)weekdays.push(i)});
  return {
    format:'cadence-dataset',version:2,exported:new Date().toISOString(),name:ws.name,terms:ws.terms,
    location_distances_km:dist,categories:cats,facility_criticality:crit,pools,
    default_settings:{weekdays,maxVisitsPerDay:Math.max(1,...ws.week.map(d=>d.n)),holidays:Object.keys(ws.overrides).filter(k=>ws.overrides[k].on===false),critMode:ws.rules.rankGate!=='off'?'require':'prefer',cadence:{mode:ws.rules.mode==='strict'?'strict':'prefer',gapDays:ws.rules.runMax===1?ws.rules.offMin+1:1}},
    people:ws.people.map(p=>{const o={id:p.id,name:p.name,gender:p.gender||'',pool:p.roles.length>1&&p.roles.length===ws.roles.length?'any':(p.roles[0]||'').replace(/^r_/,''),rank:p.rank,weight:p.weight,active:p.active,originLocationId:ln(p.homeLoc),unavailable:p.off.slice(),blockedFacilities:p.bans.slice(),distanceAffinity:p.pref==='far'?1:p.pref==='near'?-1:0,workWeekdays:p.days.every(Boolean)?null:p.days.map((x,i)=>x?i:-1).filter(i=>i>=0)};
      pc.forEach(c=>{if(p.rankBy[c.id]!=null){const k=kindOf(c.id);o['rank'+k.charAt(0).toUpperCase()+k.slice(1)]=p.rankBy[c.id]}});
      if(p.runMax!==''||p.offMin!=='')o.pattern={work:p.runMax===''?null:p.runMax,rest:p.offMin===''?null:p.offMin};
      if(p.maxLoad!=='')o.maxTotal=p.maxLoad;if(p.maxWeek!=='')o.maxWeek=p.maxWeek;if(p.note)o.title=p.note;return o}),
    facilities:ws.sites.map(s=>{const o={id:s.id,name:s.name,category:s.tag||'',location:ln(s.loc),kind:kindOf(s.cat),weight:s.weight,crit:s.crit};if(!s.active)o.active=false;if(s.minV!=='')o.min=s.minV;if(s.maxV!=='')o.max=s.maxV;return o}),
    routes:(ws.routes||[]).map(r=>({from:ln(r.a),to:ln(r.b),km:r.km})),
    settings:{rules:ws.rules,weights:ws.weights,useW:ws.useW,engine:{seed:ws.engine.seed,quality:ws.engine.quality,runs:ws.engine.runs},sizing:ws.sizing,unit:ws.unit,week:ws.week,
      goals:ws.goals.map(g=>({on:g.on,per:g.per,scope:g.scope,ref:g.scope==='cat'?kindOf(g.ref):g.scope==='loc'?ln(g.ref):g.scope==='site'?((byId(ws.sites,g.ref)||{}).name||g.ref):g.ref,op:g.op,n:g.n}))},
    rulebook:bookForExport(ws)
  };
}

function locDist(ws){
  const L={};(ws.locations||[]).forEach(l=>L[l.id]=+l.km||0);
  const R={};(ws.routes||[]).forEach(r=>{R[r.a+'|'+r.b]=+r.km;R[r.b+'|'+r.a]=+r.km});
  return (la,ka,lb,kb)=>{if(la&&lb){if(la===lb)return 0;const x=R[la+'|'+lb];if(x!=null)return x}return Math.abs((la&&L[la]!=null?L[la]:ka)-(lb&&L[lb]!=null?L[lb]:kb))};
}
function syncLoc(ws){
  const m={};(ws.locations||[]).forEach(l=>m[l.id]=l);
  ws.sites.forEach(s=>{if(s.loc){const l=m[s.loc];if(l)s.km=+l.km||0;else s.loc=''}});
  ws.people.forEach(p=>{if(p.homeLoc){const l=m[p.homeLoc];if(l)p.home=+l.km||0;else p.homeLoc=''}});
  return ws;
}

function normWeek(w){
  const out=[];for(let i=0;i<7;i++){const x=(w&&w[i])||{};out.push({on:!!x.on,n:clamp(intOr(x.n,x.on?1:0),0,50),focus:typeof x.focus==='string'?x.focus:'auto'})}
  return out;
}
function arr7(a,def){if(!Array.isArray(a)||a.length!==7)return [def,def,def,def,def,def,def];return a.map(Boolean)}
const lvl=(v,d)=>clamp(num(v,d),0,100);
function normalize(o){
  if(!o||typeof o!=='object')throw new Error('not an object');
  if(!Array.isArray(o.sites)||!Array.isArray(o.people)||!Array.isArray(o.roles)||!Array.isArray(o.categories))throw new Error('missing sites / people / roles / categories');
  const w=blankWS(o.name);
  w.id=typeof o.id==='string'&&o.id?o.id:w.id;
  w.name=String(o.name||'Imported plan').slice(0,80);
  w.created=+o.created||Date.now();w.updated=+o.updated||Date.now();
  w.template=o.template||'custom';
  w.terms={en:Object.assign({},TERM_DEFAULT.en,(o.terms&&o.terms.en)||{}),ar:Object.assign({},TERM_DEFAULT.ar,(o.terms&&o.terms.ar)||{})};
  w.unit=o.unit==='mi'?'mi':'km';
  const ids=new Set();
  const okId=(x,p)=>{let id=typeof x==='string'&&x?x:uid(p);while(ids.has(id))id=uid(p);ids.add(id);return id};
  w.roles=o.roles.map((r,i)=>({id:okId(r.id,'r'),name:String(r.name||'Role '+(i+1)),color:r.color||COLORS[i%COLORS.length]}));
  const rIds=new Set(w.roles.map(r=>r.id));
  w.categories=o.categories.map((c,i)=>{const st={};if(c.staff)for(const k in c.staff)if(rIds.has(k))st[k]=clamp(intOr(c.staff[k],0),0,20);
    return {id:okId(c.id,'c'),name:String(c.name||'Category '+(i+1)),color:c.color||COLORS[i%COLORS.length],staff:st,share:Math.max(0,num(c.share,1)),planned:c.planned!==false}});
  const cIds=new Set(w.categories.map(c=>c.id));
  w.locations=(Array.isArray(o.locations)?o.locations:[]).map((l,i)=>({id:okId(l.id,'l'),name:String(l.name||'Location '+(i+1)),km:Math.max(0,num(l.km,0)),unknown:!!l.unknown}));
  const lIds=new Set(w.locations.map(l=>l.id));
  w.routes=(Array.isArray(o.routes)?o.routes:[]).filter(r=>r&&lIds.has(r.a)&&lIds.has(r.b)&&r.a!==r.b).map(r=>({id:typeof r.id==='string'&&r.id?r.id:uid('t'),a:r.a,b:r.b,km:Math.max(0,num(r.km,0))}));
  w.source=o.source&&typeof o.source==='object'?{url:String(o.source.url||''),hash:String(o.source.hash||''),at:+o.source.at||0,auto:o.source.auto!==false}:null;
  w.sites=o.sites.map((s,i)=>({id:okId(s.id,'s'),name:String(s.name||'Site '+(i+1)),cat:cIds.has(s.cat)?s.cat:(w.categories[0]&&w.categories[0].id),
    km:Math.max(0,num(s.km,0)),loc:lIds.has(s.loc)?s.loc:'',crit:lvl(s.crit,50),tag:String(s.tag||''),zone:String(s.zone||''),weight:clamp(num(s.weight,1),.1,3),minV:s.minV===''||s.minV==null?'':Math.max(0,intOr(s.minV,0)),maxV:s.maxV===''||s.maxV==null?'':Math.max(0,intOr(s.maxV,0)),
    days:arr7(s.days,true),blackout:Array.isArray(s.blackout)?s.blackout.filter(validISO):[],active:s.active!==false,note:String(s.note||'')}));
  const sIds=new Set(w.sites.map(s=>s.id));
  w.people=o.people.map((p,i)=>{const rb={};if(p.rankBy&&typeof p.rankBy==='object')for(const k in p.rankBy)if(cIds.has(k))rb[k]=lvl(p.rankBy[k],50);
    return {id:okId(p.id,'p'),name:String(p.name||'Person '+(i+1)),roles:(Array.isArray(p.roles)?p.roles:[]).filter(r=>rIds.has(r)),
    home:Math.max(0,num(p.home,0)),homeLoc:lIds.has(p.homeLoc)?p.homeLoc:'',rank:lvl(p.rank,50),rankBy:rb,gender:String(p.gender||''),note:String(p.note||''),
    pref:['near','far','none'].includes(p.pref)?p.pref:'none',weight:clamp(num(p.weight,1),.1,3),
    days:arr7(p.days,true),off:Array.isArray(p.off)?p.off.filter(validISO):[],maxLoad:p.maxLoad===''||p.maxLoad==null?'':Math.max(0,intOr(p.maxLoad,0)),maxWeek:p.maxWeek===''||p.maxWeek==null?'':Math.max(0,intOr(p.maxWeek,0)),
    runMax:p.runMax===''||p.runMax==null?'':clamp(intOr(p.runMax,0),0,14),offMin:p.offMin===''||p.offMin==null?'':clamp(intOr(p.offMin,0),0,14),
    avoid:Array.isArray(p.avoid)?p.avoid:[],pair:Array.isArray(p.pair)?p.pair:[],likes:(Array.isArray(p.likes)?p.likes:[]).filter(x=>sIds.has(x)),bans:(Array.isArray(p.bans)?p.bans:[]).filter(x=>sIds.has(x)),active:p.active!==false}});
  const pIds=new Set(w.people.map(p=>p.id));
  w.people.forEach(p=>{p.avoid=p.avoid.filter(x=>pIds.has(x)&&x!==p.id);p.pair=p.pair.filter(x=>pIds.has(x)&&x!==p.id)});
  w.book=(Array.isArray(o.book)?o.book:[]).map(normRule);
  w.goals=(Array.isArray(o.goals)?o.goals:[]).map(g=>({id:okId(g.id,'g'),on:g.on!==false,per:g.per==='total'?'total':'each',scope:['all','cat','loc','tag','site','crit'].includes(g.scope)?g.scope:'all',ref:String(g.ref||''),op:['min','exact','max'].includes(g.op)?g.op:'min',n:clamp(intOr(g.n,1),0,9999)}));
  const sz=o.sizing||{};w.sizing={mode:['rhythm','total','goals'].includes(sz.mode)?sz.mode:'rhythm',total:clamp(intOr(sz.total,40),0,9999)};
  w.week=normWeek(o.week);
  w.overrides={};if(o.overrides&&typeof o.overrides==='object')for(const k in o.overrides)if(validISO(k))w.overrides[k]=o.overrides[k];
  const sc=o.scope||{};w.scope={mode:['week','month','custom'].includes(sc.mode)?sc.mode:'month',start:validISO(sc.start)?sc.start:w.scope.start,end:validISO(sc.end)?sc.end:''};
  const ru=o.rules||{};
  w.rules=Object.assign(defaultRules(),ru);
  if(ru.runMax===undefined&&ru.rest!==undefined){const r=intOr(ru.rest,0);w.rules.runMax=r>0?1:0;w.rules.offMin=r}
  delete w.rules.rest;
  w.rules.perDay=clamp(intOr(w.rules.perDay,1),0,10);w.rules.runMax=clamp(intOr(w.rules.runMax,0),0,14);w.rules.offMin=clamp(intOr(w.rules.offMin,0),0,14);w.rules.siteGap=clamp(intOr(w.rules.siteGap,0),0,60);
  w.rules.nearKm=Math.max(0,num(w.rules.nearKm,10));w.rules.weekStart=clamp(intOr(w.rules.weekStart,0),0,6);w.rules.mode=w.rules.mode==='strict'?'strict':'bend';w.rules.distinct=!!w.rules.distinct;
  w.rules.rankGate=['off','lead','all'].includes(w.rules.rankGate)?w.rules.rankGate:'off';w.rules.rankTol=clamp(intOr(w.rules.rankTol,25),0,100);
  w.weights=Object.assign(defaultWeights(),o.weights||{});WEIGHT_KEYS.forEach(k=>w.weights[k]=clamp(num(w.weights[k],50),0,100));
  w.useW=Object.assign(defaultUseW(),o.useW||{});
  w.engine=Object.assign(defaultEngine(),o.engine||{});w.engine.seed=Math.max(1,intOr(w.engine.seed,1));w.engine.runs=clamp(intOr(w.engine.runs,3),1,16);
  if(!['fast','balanced','thorough','max'].includes(w.engine.quality))w.engine.quality='balanced';
  w.locks={sites:Object.assign({},(o.locks&&o.locks.sites)||{}),seats:Object.assign({},(o.locks&&o.locks.seats)||{})};
  w.snapshots=Array.isArray(o.snapshots)?o.snapshots.filter(s=>s&&s.plan).slice(0,30):[];
  w.plan=o.plan&&o.plan.res&&o.plan.map?o.plan:null;
  syncLoc(w);
  return w;
}
function migrateLegacy(o){
  const w=blankWS('Imported rota');w.template='field';
  w.terms={en:{visit:'visit',visits:'visits',site:'facility',sites:'facilities',person:'person',people:'people'},ar:{visit:'زيارة',visits:'زيارات',site:'مرفق',sites:'مرافق',person:'فرد',people:'الفريق'}};
  const st=o.settings||{};
  const fin=mkRole('Financial',COLORS[0]),cli=mkRole('Clinical',COLORS[2]);w.roles=[fin,cli];
  const sf=st.staffing||{main:{fin:2,clin:2},contracted:{fin:1,clin:2}};
  const ratio=st.ratio||{m:3,c:1};
  const main=mkCat('Main',COLORS[0],{[fin.id]:sf.main.fin,[cli.id]:sf.main.clin},ratio.m);
  const con=mkCat('Contracted',COLORS[3],{[fin.id]:sf.contracted.fin,[cli.id]:sf.contracted.clin},ratio.c);
  const exc=mkCat('Excluded',COLORS[6],{},0,false);
  w.categories=[main,con,exc];
  const cmap={main:main.id,contracted:con.id,excluded:exc.id};
  w.sites=(o.facilities||[]).map(f=>mkSite(f.name,cmap[f.type]||main.id,f.km,{id:f.id||uid('s'),weight:f.weight||1,active:f.active!==false}));
  w.people=(o.people||[]).map(p=>mkPerson(p.name,[p.pool==='clin'?cli.id:fin.id],{id:p.id||uid('p'),home:p.originKm||0,pref:p.pref||'none',weight:p.weight||1,days:arr7(p.weekdays,true),off:Array.isArray(p.offDates)?p.offDates:[],active:p.active!==false}));
  if(Array.isArray(st.weekdayDefaults))w.week=st.weekdayDefaults.map(d=>({on:!!d.on,n:d.visits||0,focus:d.pref==='near'?'near':d.pref==='main'?main.id:'auto'}));
  if(o.dayOverrides)for(const k in o.dayOverrides){const x=o.dayOverrides[k],y={};if(x.on!==undefined)y.on=x.on;if(x.visits!==undefined)y.n=x.visits;if(x.pref)y.focus=x.pref==='near'?'near':x.pref==='main'?main.id:'auto';w.overrides[k]=y}
  if(o.scope)w.scope={mode:o.scope.mode||'custom',start:o.scope.start||w.scope.start,end:o.scope.end||''};
  w.rules.runMax=st.noConsecutive===false?0:1;w.rules.offMin=w.rules.runMax;w.rules.perDay=st.oneVisitPerDay===false?2:1;w.rules.mode=st.relaxMode==='strict'?'strict':'bend';w.rules.nearKm=st.nearKm||10;w.rules.distinct=st.distinctPerDay!==false;
  if(st.weights){const x=st.weights;w.weights.fair=x.fairness!=null?x.fairness:70;w.weights.pref=x.pref!=null?x.pref:45;w.weights.home=x.distance!=null?x.distance:35;w.weights.rotate=x.facility!=null?x.facility:60}
  if(st.seed)w.engine.seed=st.seed;
  return normalize(w);
}

const IDX='mauvine.v2.index',WSK='mauvine.v2.ws.',LEGACY='mauveineRota.v1';
const Store={
  quotaErr:false,
  index(){try{const o=JSON.parse(localStorage.getItem(IDX)||'null');if(o&&Array.isArray(o.list))return Object.assign({active:null,list:[],prefs:{}},o)}catch(e){}return {active:null,list:[],prefs:{}}},
  saveIndex(ix){try{localStorage.setItem(IDX,JSON.stringify(ix));return true}catch(e){return false}},
  load(id){try{const raw=localStorage.getItem(WSK+id);if(raw)return normalize(JSON.parse(raw))}catch(e){}return null},
  save(ws,ix){
    try{localStorage.setItem(WSK+ws.id,JSON.stringify(ws));this.quotaErr=false}
    catch(e){try{const lite=Object.assign({},ws,{snapshots:[]});localStorage.setItem(WSK+ws.id,JSON.stringify(lite))}catch(e2){this.quotaErr=true;return false}}
    const it=ix.list.find(x=>x.id===ws.id);
    if(it){it.name=ws.name;it.updated=ws.updated;it.template=ws.template}else ix.list.push({id:ws.id,name:ws.name,updated:ws.updated,template:ws.template});
    ix.active=ws.id;this.saveIndex(ix);return true;
  },
  remove(id,ix){try{localStorage.removeItem(WSK+id)}catch(e){}ix.list=ix.list.filter(x=>x.id!==id);if(ix.active===id)ix.active=ix.list[0]?ix.list[0].id:null;this.saveIndex(ix)},
  legacy(){try{const raw=localStorage.getItem(LEGACY);if(!raw)return null;const o=JSON.parse(raw);if(Array.isArray(o.facilities)&&Array.isArray(o.people))return o}catch(e){}return null},
  usage(){let n=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.indexOf('mauvine')===0)n+=(localStorage.getItem(k)||'').length*2}}catch(e){}return n}
};

function rangeOf(ws){
  const sc=ws.scope;let start=validISO(sc.start)?sc.start:todayISO(),end;
  if(sc.mode==='week'){start=weekStartOf(start,ws.rules.weekStart);end=addISO(start,6)}
  else if(sc.mode==='month'){const d=pISO(start);start=fISO(new Date(d.getFullYear(),d.getMonth(),1));end=fISO(new Date(d.getFullYear(),d.getMonth()+1,0))}
  else{end=validISO(sc.end)&&sc.end>=start?sc.end:start;if(diffDays(start,end)>365)end=addISO(start,365)}
  return {start,end};
}
function daysIn(start,end){const out=[];for(let d=start;d<=end;d=addISO(d,1))out.push(d);return out}
function dayCfg(ws,iso){
  const b=ws.week[dowOf(iso)],o=ws.overrides[iso];
  const c={on:b.on,n:b.n,focus:b.focus||'auto',over:!!o};
  if(o){if(o.on!==undefined)c.on=o.on;if(o.n!==undefined)c.n=o.n;if(o.focus)c.focus=o.focus}
  if(!c.on)c.n=0;
  return c;
}
function plannable(ws){const pc=new Set(ws.categories.filter(c=>c.planned).map(c=>c.id));return ws.sites.filter(s=>s.active&&pc.has(s.cat))}
function goalSites(ws,g,list){
  list=list||plannable(ws);
  switch(g.scope){
    case 'cat':return list.filter(s=>s.cat===g.ref);
    case 'loc':return list.filter(s=>s.loc===g.ref);
    case 'tag':return list.filter(s=>(s.tag||'')===g.ref);
    case 'site':return list.filter(s=>s.id===g.ref);
    case 'crit':return list.filter(s=>(+s.crit||0)>=(+g.ref||0));
  }
  return list;
}
function goalNeed(ws){
  const list=plannable(ws);const minE={};let allT=-1,allCap=Infinity;const tots=[];
  ws.goals.forEach(g=>{if(!g.on)return;const set=goalSites(ws,g,list);
    if(g.per==='each'){if(g.op!=='max')set.forEach(s=>minE[s.id]=Math.max(minE[s.id]||0,g.n))}
    else if(g.scope==='all'){if(g.op!=='max')allT=Math.max(allT,g.n);if(g.op!=='min')allCap=Math.min(allCap,g.n)}
    else if(g.op!=='max')tots.push({set,n:g.n});
  });
  let need=0;for(const k in minE)need+=minE[k];
  tots.forEach(x=>{let inside=0;x.set.forEach(s=>inside+=minE[s.id]||0);need+=Math.max(0,x.n-inside)});
  need=Math.max(need,allT);if(isFinite(allCap))need=Math.min(need,allCap);
  return Math.max(0,Math.round(need));
}
function planTotal(ws,days){
  const md=ws.sizing.mode;
  if(md==='total')return Math.max(0,intOr(ws.sizing.total,0));
  if(md==='goals'){const g=goalNeed(ws);if(g>0)return g}
  return sum(days.map(d=>d.cfg.n));
}
function planDays(ws,keepZero){
  const {start,end}=rangeOf(ws);const out=[];
  for(const iso of daysIn(start,end)){const c=dayCfg(ws,iso);if(c.on&&c.n>0)out.push({iso,cfg:c,n:c.n})}
  if(ws.sizing.mode!=='rhythm'&&out.length){
    const T=planTotal(ws,out);
    const W=sum(out.map(d=>d.cfg.n));let acc=0,prev=0;
    out.forEach(d=>{acc+=d.cfg.n;const cur=Math.round(T*acc/W);d.n=cur-prev;prev=cur});
  }
  return keepZero?out:out.filter(d=>d.n>0);
}
function fpOf(ws){
  return fnv(JSON.stringify([ws.roles.map(r=>r.id),ws.categories.map(c=>[c.id,c.staff,c.share,c.planned]),
    ws.sites.map(s=>[s.id,s.cat,s.km,s.loc,s.crit,s.tag,s.zone,s.weight,s.minV,s.maxV,s.days,s.blackout,s.active]),
    ws.people.map(p=>[p.id,p.roles,p.home,p.homeLoc,p.rank,p.rankBy,p.gender,p.pref,p.weight,p.days,p.off,p.maxLoad,p.maxWeek,p.runMax,p.offMin,p.avoid,p.pair,p.likes,p.bans,p.active]),
    ws.book||[],ws.routes||[],ws.goals,ws.sizing,ws.week,ws.overrides,ws.scope,ws.rules,ws.weights,ws.useW,ws.engine.seed,ws.engine.quality,ws.engine.runs]));
}
function fpWithLocks(ws){return fnv(fpOf(ws)+JSON.stringify(ws.locks))}

function compile(ws){
  const {start,end}=rangeOf(ws);
  const warn=[];
  const days=planDays(ws);
  const roles=ws.roles.slice();const R=roles.length;const rIx={};roles.forEach((r,i)=>rIx[r.id]=i);
  const siteActive=ws.sites.filter(s=>s.active);
  const cats=ws.categories.filter(c=>c.planned&&siteActive.some(s=>s.cat===c.id));const C=cats.length;const cIx={};cats.forEach((c,i)=>cIx[c.id]=i);
  const sites=siteActive.filter(s=>cIx[s.cat]!==undefined);const S=sites.length;const sIx={};sites.forEach((s,i)=>sIx[s.id]=i);
  const people=ws.people.filter(p=>p.active&&p.roles.some(r=>rIx[r]!==undefined));const N=people.length;const pIx={};people.forEach((p,i)=>pIx[p.id]=i);
  const D=days.length;
  const sCat=sites.map(s=>cIx[s.cat]);
  const need=new Array(C*R).fill(0);
  cats.forEach((c,ci)=>roles.forEach((r,ri)=>need[ci*R+ri]=Math.max(0,intOr(c.staff[r.id],0))));
  const seatsPerRole=roles.map((r,ri)=>{let m=0;for(let c=0;c<C;c++)m=Math.max(m,need[c*R+ri]);return m});
  const dayNumA=days.map(d=>dayNum(d.iso));
  const ws0=ws.rules.weekStart;
  const dayWeek=days.map(d=>dayNum(weekStartOf(d.iso,ws0)));
  const dayFocus=days.map(d=>{const f=d.cfg.focus;if(f==='near')return -2;if(f==='far')return -3;if(cIx[f]!==undefined)return cIx[f];return -1});
  const vDay=[],vLock=[],vSeat0=[],vSeatN=[],visits=[];
  const seatVisit=[],seatRole=[],seatIdx=[],seatLock=[],seats=[];
  days.forEach((d,di)=>{
    if(!C)return;
    for(let k=0;k<d.n;k++){
      const key=d.iso+'#'+k,v=visits.length;
      visits.push({key,d:di,k});vDay.push(di);
      const ls=ws.locks.sites[key];vLock.push(ls&&sIx[ls]!==undefined?sIx[ls]:-2);
      vSeat0.push(seats.length);
      roles.forEach((r,ri)=>{for(let i=0;i<seatsPerRole[ri];i++){
        const sk=key+'#'+r.id+'#'+i;seats.push({key:sk,v,r:ri,i});
        seatVisit.push(v);seatRole.push(ri);seatIdx.push(i);
        const lp=ws.locks.seats[sk];
        seatLock.push(lp==='__open'?-1:(lp&&pIx[lp]!==undefined&&byId(people,lp).roles.includes(r.id)?pIx[lp]:-2));
      }});
      vSeatN.push(seats.length-vSeat0[v]);
      visits[v].z0=vSeat0[v];visits[v].zn=vSeatN[v];
    }
  });
  const V=visits.length,Z=seats.length;
  const sAvail=new Array(S*D).fill(0);
  sites.forEach((s,si)=>days.forEach((d,di)=>{sAvail[si*D+di]=s.days[dowOf(d.iso)]&&!s.blackout.includes(d.iso)?1:0}));
  const pAvail=new Array(N*D).fill(0);
  people.forEach((p,pi)=>days.forEach((d,di)=>{pAvail[pi*D+di]=p.days[dowOf(d.iso)]&&!p.off.includes(d.iso)?1:0}));
  const roleMembers=roles.map(r=>{const a=[];people.forEach((p,pi)=>{if(p.roles.includes(r.id))a.push(pi)});return a});

  const gMin=new Array(S).fill(0),gMax=new Array(S).fill(-1);
  const grpN=[],grpOp=[],grpGoal=[],siteGrp=sites.map(()=>[]);
  const catFloor=new Array(C).fill(0),catCeil=new Array(C).fill(Infinity);
  const OPC={min:0,exact:1,max:2};
  const activeGoals=ws.goals.filter(g=>g.on);
  activeGoals.forEach(g=>{
    const set=goalSites(ws,g,sites).map(s=>sIx[s.id]).filter(x=>x!==undefined);
    if(g.per==='each'){set.forEach(si=>{if(g.op!=='max')gMin[si]=Math.max(gMin[si],g.n);if(g.op!=='min')gMax[si]=gMax[si]<0?g.n:Math.min(gMax[si],g.n)})}
    else{
      if(g.scope==='all'&&g.op==='min')return;
      const gi=grpN.length;grpN.push(g.n);grpOp.push(OPC[g.op]);grpGoal.push(g.id);set.forEach(si=>siteGrp[si].push(gi));
      if(g.scope==='cat'&&cIx[g.ref]!==undefined){const ci=cIx[g.ref];if(g.op!=='max')catFloor[ci]=Math.max(catFloor[ci],g.n);if(g.op!=='min')catCeil[ci]=Math.min(catCeil[ci],g.n)}
    }
  });
  const goalsOn=activeGoals.length>0;
  const shareSum=sum(cats.map(c=>c.share));
  const mixOn=shareSum>0&&C>1;
  const base=cats.map((c,ci)=>shareSum>0?c.share/shareSum:sites.filter(s=>s.cat===c.id).length/Math.max(1,S));
  let catTarget=cats.map((c,ci)=>V*base[ci]);
  if(goalsOn&&C){
    const floor=cats.map((c,ci)=>{let f=0;sites.forEach((s,si)=>{if(sCat[si]===ci)f+=gMin[si]});return Math.max(f,catFloor[ci])});
    const ceil=cats.map((c,ci)=>{const ms=[];sites.forEach((s,si)=>{if(sCat[si]===ci)ms.push(si)});let cap=catCeil[ci];if(ms.length&&ms.every(si=>gMax[si]>=0))cap=Math.min(cap,sum(ms.map(si=>gMax[si])));return Math.max(cap,floor[ci])});
    const rest=Math.max(0,V-sum(floor));
    catTarget=cats.map((c,ci)=>Math.min(ceil[ci],floor[ci]+rest*base[ci]));
    const left=V-sum(catTarget);
    if(left>.01){const open=cats.map((c,ci)=>ci).filter(ci=>catTarget[ci]<ceil[ci]-.01);const bs=sum(open.map(ci=>base[ci]))||1;open.forEach(ci=>catTarget[ci]=Math.min(ceil[ci],catTarget[ci]+left*(base[ci]||1/open.length)/bs))}
  }
  const demand=roles.map((r,ri)=>{let x=0;for(let c=0;c<C;c++)x+=catTarget[c]*need[c*R+ri];return x});
  const pTarget=new Array(N).fill(0);
  roles.forEach((r,ri)=>{
    const mem=roleMembers[ri];if(!mem.length)return;
    const wts=mem.map(pi=>people[pi].weight/people[pi].roles.filter(x=>rIx[x]!==undefined).length);
    const caps=mem.map(pi=>{let a=0;for(let d=0;d<D;d++)a+=pAvail[pi*D+d];let c=a*(ws.rules.perDay||10);const ml=people[pi].maxLoad;if(ml!==''&&ml!=null)c=Math.min(c,+ml);return c});
    const dem=demand[ri];
    const tot=l=>{let s=0;for(let i=0;i<mem.length;i++)s+=Math.min(caps[i],l*wts[i]);return s};
    let lo=0,hi=1;while(tot(hi)<dem&&hi<1e7)hi*=2;
    for(let it=0;it<60;it++){const m=(lo+hi)/2;if(tot(m)<dem)lo=m;else hi=m}
    mem.forEach((pi,i)=>pTarget[pi]+=Math.min(caps[i],hi*wts[i]));
  });
  const span=D?dayNumA[D-1]-dayNumA[0]+1:0;
  const pIdeal=pTarget.map(t=>t>=1.5?Math.min(7,span/t)*.8:0);
  const sExp=new Array(S).fill(0);
  cats.forEach((c,ci)=>{
    const ms=[];sites.forEach((s,si)=>{if(sCat[si]===ci)ms.push(si)});if(!ms.length)return;
    const b=sum(ms.map(si=>gMin[si]));const left=Math.max(0,catTarget[ci]-b);
    const free=ms.filter(si=>gMax[si]<0||gMax[si]>gMin[si]);const tw=sum(free.map(si=>sites[si].weight))||1;
    ms.forEach(si=>{let e=gMin[si]+(free.includes(si)?left*sites[si].weight/tw:0);if(gMax[si]>=0)e=Math.min(e,gMax[si]);sExp[si]=e});
  });
  const sMin=sites.map(s=>s.minV===''?0:+s.minV);
  const sMax=sites.map(s=>s.maxV===''?-1:+s.maxV);
  const zoneIx={};let zn=0;
  const sZone=sites.map(s=>{const z=((s.zone||'').trim().toLowerCase())||(s.loc?'@'+s.loc:'');if(!z)return -1;if(zoneIx[z]===undefined)zoneIx[z]=zn++;return zoneIx[z]});
  const rel=new Array(N*N).fill(0);
  people.forEach((p,pi)=>{p.avoid.forEach(q=>{const qi=pIx[q];if(qi!==undefined){rel[pi*N+qi]=1;rel[qi*N+pi]=1}});p.pair.forEach(q=>{const qi=pIx[q];if(qi!==undefined&&rel[pi*N+qi]!==1){rel[pi*N+qi]=2;rel[qi*N+pi]=2}})});
  const aff=new Array(N*S).fill(0);
  people.forEach((p,pi)=>{p.likes.forEach(s=>{if(sIx[s]!==undefined)aff[pi*S+sIx[s]]=1});p.bans.forEach(s=>{if(sIx[s]!==undefined)aff[pi*S+sIx[s]]=2})});
  const sCrit=sites.map(s=>+s.crit||0);
  const pRankC=new Array(N*Math.max(1,C)).fill(50);
  people.forEach((p,pi)=>cats.forEach((c,ci)=>{const v=p.rankBy&&p.rankBy[c.id]!=null?p.rankBy[c.id]:p.rank;pRankC[pi*C+ci]=+v}));
  const Dn=Math.max(10,...sites.map(s=>s.km),...people.map(p=>p.home));
  const w={};WEIGHT_KEYS.forEach(k=>w[k]=ws.useW[k]?ws.weights[k]/50:0);
  const q={fast:25000,balanced:90000,thorough:300000,max:900000}[ws.engine.quality]||90000;
  const iters=Math.round(q*clamp((Z+V)/120,.6,5));
  const gate={off:0,lead:1,all:2}[ws.rules.rankGate]||0;
  if(!D)warn.push({k:'nodays'});
  if(!C)warn.push({k:'nosites'});
  roles.forEach((r,ri)=>{if(demand[ri]>0&&!roleMembers[ri].length)warn.push({k:'norole',r:r.id})});
  const nWeeks=new Set(dayWeek).size||1;
  const pRun=people.map(p=>p.runMax===''?ws.rules.runMax:+p.runMax),pOff=people.map(p=>p.offMin===''?(p.runMax===''?ws.rules.offMin:Math.max(1,ws.rules.offMin)):+p.offMin);
  const capOf=pi=>{let a=0;for(let d=0;d<D;d++)a+=pAvail[pi*D+d];let c=a*(ws.rules.perDay||10);const p=people[pi];if(p.maxLoad!=='')c=Math.min(c,+p.maxLoad);if(p.maxWeek!=='')c=Math.min(c,+p.maxWeek*nWeeks);
    const rm=pRun[pi],om=pOff[pi];if(rm>0&&span>0)c=Math.min(c,Math.ceil(span*rm/(rm+Math.max(1,om)))*(ws.rules.perDay||1));return c};
  const wkIx={};const dayWk=dayWeek.map(w=>wkIx[w]!==undefined?wkIx[w]:(wkIx[w]=Object.keys(wkIx).length));const nWk=Object.keys(wkIx).length;
  const bk=compileBook(ws,people,sites,days,cats,roles);
  bk.warn.forEach(x=>warn.push(x));
  const dist=locDist(ws);
  const sDist=new Float64Array(S*S);
  for(let a=0;a<S;a++)for(let b=a+1;b<S;b++){const x=dist(sites[a].loc,+sites[a].km||0,sites[b].loc,+sites[b].km||0);sDist[a*S+b]=x;sDist[b*S+a]=x}
  const pSiteD=new Float64Array(N*S);
  people.forEach((p,pi)=>sites.forEach((s,si)=>{pSiteD[pi*S+si]=p.homeLoc?dist(p.homeLoc,+p.home||0,s.loc,+s.km||0):Math.abs((+p.home||0)-(+s.km||0))}));
  roles.forEach((r,ri)=>{if(!roleMembers[ri].length)return;let cap=0;roleMembers[ri].forEach(pi=>{cap+=capOf(pi)/people[pi].roles.filter(x=>rIx[x]!==undefined).length});cap=Math.floor(cap);if(demand[ri]>cap+.01)warn.push({k:'capacity',r:r.id,need:Math.round(demand[ri]),cap})});
  cats.forEach((c,ci)=>{const mins=sum(sites.filter(s=>s.cat===c.id).map(s=>s.minV===''?0:+s.minV));if(mins>catTarget[ci]+.5)warn.push({k:'minover',c:c.id,need:mins,have:Math.round(catTarget[ci])})});
  if(goalsOn&&ws.sizing.mode!=='goals'){const gn=goalNeed(ws);if(gn>V)warn.push({k:'goalshort',need:gn,have:V})}
  if(gate&&N){
    const bad=[];sites.forEach((s,si)=>{const cr=sCrit[si];if(!cr)return;const ci=sCat[si];let best=-1;for(let p=0;p<N;p++)best=Math.max(best,pRankC[p*C+ci]);if(best<cr-ws.rules.rankTol)bad.push(s.name)});
    if(bad.length)warn.push({k:'rankgap',n:bad.length,ex:bad.slice(0,3).join(', ')});
  }
  if(ws.rules.runMax===1&&ws.rules.offMin>0&&pRun.every(x=>x===1)){
    roles.forEach((r,ri)=>{const mem=roleMembers[ri];if(!mem.length)return;
      for(let i=0;i+1<D;i++){if(dayNumA[i+1]-dayNumA[i]>ws.rules.offMin)continue;
        const nA=days[i].n,nB=days[i+1].n;let minNeed=Infinity;for(let c=0;c<C;c++)if(catTarget[c]>0)minNeed=Math.min(minNeed,need[c*R+ri]);if(!isFinite(minNeed))minNeed=0;
        const needAB=minNeed*(nA+nB);let free=0;mem.forEach(pi=>{if(pAvail[pi*D+i]||pAvail[pi*D+i+1])free++});
        if(needAB>free+.01){warn.push({k:'tight',r:r.id,d1:days[i].iso,d2:days[i+1].iso,need:Math.ceil(needAB),free});break}}
    });
  }
  const P={D,V,S,N,R,C,Z,vDay,vLock,vSeat0,vSeatN,seatVisit,seatRole,seatIdx,seatLock,
    sCat,sKm:sites.map(s=>+s.km||0),sZone,sExp,sMin,sMax,sAvail,need,catTarget,mixOn,
    gMin,gMax,grpN,grpOp,siteGrp,sCrit,pRankC,
    pAvail,pHome:people.map(p=>+p.home||0),pPref:people.map(p=>p.pref==='near'?1:p.pref==='far'?2:0),pTarget,
    pMaxLoad:people.map(p=>p.maxLoad===''?-1:+p.maxLoad),pMaxWeek:people.map(p=>p.maxWeek===''?-1:+p.maxWeek),pIdeal,rel,aff,
    dayNum:dayNumA,dayWeek,dayFocus,roleMembers,w,pRun,pOff,sDist:Array.from(sDist),pSiteD:Array.from(pSiteD),
    bkS:bk.bkS,bkSH:bk.bkSH,bkSR:bk.bkSR,bkD:bk.bkD,bkDH:bk.bkDH,bkDR:bk.bkDR,bkP:bk.bkP,bkPH:bk.bkPH,bkPR:bk.bkPR,team:bk.team,cnt:bk.cnt,cntBy:bk.cntBy,dayWk,nWk,bookOn:bk.on,
    rules:{perDay:ws.rules.perDay,runMax:ws.rules.runMax,offMin:ws.rules.offMin,strict:ws.rules.mode==='strict',distinct:ws.rules.distinct,siteGap:ws.rules.siteGap,nearKm:ws.rules.nearKm,rankGate:gate,rankTol:ws.rules.rankTol},
    Dn,seed:ws.engine.seed,iters,runs:ws.engine.runs};
  const map={start,end,days:days.map(d=>({iso:d.iso,n:d.n,focus:d.cfg.focus})),visits,seats:seats.map(s=>({key:s.key,v:s.v,r:s.r,i:s.i})),
    roles:roles.map(r=>r.id),cats:cats.map(c=>c.id),sites:sites.map(s=>s.id),people:people.map(p=>p.id),pTarget,catTarget,demand,sExp,grpGoal,gMin,gMax,book:bk.ids};
  return {P,map,warn};
}

const SOFT_SITE=1.2,SOFT_WITH_AV=3,SOFT_WITH_PR=.8,SOFT_TEAM=2,SOFT_COUNT=2;
const OPN={min:0,max:1,exact:2,ifany:3};
function compileBook(ws,people,sites,days,cats,roles){
  const N=people.length,S=sites.length,D=days.length;
  const out={bkS:null,bkSH:null,bkSR:null,bkD:null,bkDH:null,bkDR:null,bkP:null,bkPH:null,bkPR:null,team:[],cnt:[],cntBy:people.map(()=>[]),ids:[],warn:[],on:false};
  const list=(ws.book||[]).filter(r=>r.on);
  if(!list.length||!N)return out;
  const bw=ws.useW&&ws.useW.book===false?0:((ws.weights&&ws.weights.book!=null?ws.weights.book:50)/50);
  const dows=days.map(d=>dowOf(d.iso));
  const mk=n=>new Array(n).fill(0),mkR=n=>new Array(n).fill(-1);
  list.forEach(r=>{
    const ri=out.ids.length;out.ids.push(r.id);
    const pm=people.map(p=>whoMatch(p,r.who));
    const nP=pm.filter(Boolean).length;
    const hard=isHard(r),soft=r.w*bw;
    if(!nP){out.warn.push({k:'rulenone',b:r.id});return}
    if(r.rel==='site'){
      const sm=sites.map(s=>whatMatch(s,r.what));
      if(!sm.some(Boolean)){out.warn.push({k:'rulenone',b:r.id});return}
      if(!out.bkS){out.bkS=mk(N*S);out.bkSH=mk(N*S);out.bkSR=mkR(N*S)}
      for(let p=0;p<N;p++){if(!pm[p])continue;for(let s=0;s<S;s++){
        const i=p*S+s,hit=sm[s];
        if(r.sense==='prefer'){if(hit&&soft)out.bkS[i]-=SOFT_SITE*soft}
        else if(r.sense==='avoid'){if(hit&&soft){out.bkS[i]+=SOFT_SITE*soft;if(out.bkSR[i]<0)out.bkSR[i]=ri}}
        else if((r.sense==='never'&&hit)||(r.sense==='only'&&!hit)){out.bkSH[i]++;out.bkSR[i]=ri}
      }}
      out.on=true;
    }else if(r.rel==='day'){
      let dm;if(r.what.k==='dates'){const ds=parseDates(r.what.v);dm=days.map(d=>ds.has(d.iso))}else dm=dows.map(w=>!!r.what.v[w]);
      if(!out.bkD){out.bkD=mk(N*D);out.bkDH=mk(N*D);out.bkDR=mkR(N*D)}
      for(let p=0;p<N;p++){if(!pm[p])continue;for(let d=0;d<D;d++){
        const i=p*D+d,hit=dm[d];
        if(r.sense==='prefer'){if(hit&&soft)out.bkD[i]-=SOFT_SITE*soft}
        else if(r.sense==='avoid'){if(hit&&soft){out.bkD[i]+=SOFT_SITE*soft;if(out.bkDR[i]<0)out.bkDR[i]=ri}}
        else if((r.sense==='never'&&hit)||(r.sense==='only'&&!hit)){out.bkDH[i]++;out.bkDR[i]=ri}
      }}
      out.on=true;
    }else if(r.rel==='with'){
      const qm=people.map(p=>whoMatch(p,r.what));
      if(!out.bkP){out.bkP=mk(N*N);out.bkPH=mk(N*N);out.bkPR=mkR(N*N)}
      const set=(a,b,fn)=>{fn(a*N+b);fn(b*N+a)};
      for(let a=0;a<N;a++){if(!pm[a])continue;for(let b=0;b<N;b++){
        if(a===b)continue;const hit=qm[b];
        if(r.sense==='prefer'){if(hit&&soft)set(a,b,i=>out.bkP[i]-=SOFT_WITH_PR*soft/2)}
        else if(r.sense==='avoid'){if(hit&&soft)set(a,b,i=>{out.bkP[i]+=SOFT_WITH_AV*soft/2;if(out.bkPR[i]<0)out.bkPR[i]=ri})}
        else if((r.sense==='never'&&hit)||(r.sense==='only'&&!hit))set(a,b,i=>{out.bkPH[i]=1;out.bkPR[i]=ri});
      }}
      out.on=true;
    }else if(r.rel==='team'){
      const sm=sites.map(s=>whatMatch(s,r.what));
      if(!sm.some(Boolean)){out.warn.push({k:'rulenone',b:r.id});return}
      out.team.push({ri,pm:pm.map(x=>x?1:0),sm:sm.map(x=>x?1:0),op:OPN[r.op]||0,n:r.n,hard:hard?1:0,w:SOFT_TEAM*soft});
      if(r.op!=='max'&&r.n>0){
        const seatsMax=sum(ws.categories.filter(c=>c.planned).map(c=>sum(Object.values(c.staff||{}))));
        if(r.n>Math.max(1,seatsMax))out.warn.push({k:'ruleteam',b:r.id,n:r.n,have:seatsMax});
      }
      out.on=true;
    }else if(r.rel==='count'){
      const sm=sites.map(s=>whatMatch(s,r.what));
      if(!sm.some(Boolean)&&r.op!=='max'){out.warn.push({k:'rulenone',b:r.id});return}
      const ci=out.cnt.length;
      out.cnt.push({ri,sm:sm.map(x=>x?1:0),op:OPN[r.op]||0,n:r.n,per:r.per==='week'?1:0,hard:hard?1:0,w:SOFT_COUNT*soft});
      pm.forEach((x,p)=>{if(x)out.cntBy[p].push(ci)});
      out.on=true;
    }
  });
  return out;
}

function csvParse(text){
  const rows=[];let row=[],f='',q=false;
  const t=String(text||'').replace(/^\uFEFF/,'');
  const first=t.split('\n')[0];
  const cnt=ch=>(first.match(new RegExp(ch,'g'))||[]).length;
  const delim=cnt('\t')>cnt(',')?'\t':cnt(';')>cnt(',')?';':',';
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
    else if(c==='"')q=true;
    else if(c===delim){row.push(f);f=''}
    else if(c==='\n'){row.push(f);rows.push(row);row=[];f=''}
    else if(c!=='\r')f+=c;
  }
  if(f!==''||row.length){row.push(f);rows.push(row)}
  return rows.filter(r=>r.some(x=>x.trim()!==''));
}
const csvCell=v=>{const s=String(v==null?'':v);return /[",\n\r;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const csvRow=a=>a.map(csvCell).join(',');

G.MV={$,$$,esc,uid,clamp,sum,avg,num,intOr,byId,clone,fnv,gini,mulberry32,
  pISO,fISO,addISO,dowOf,dayNum,diffDays,todayISO,validISO,weekStartOf,daysIn,
  COLORS,LEVELS,WEIGHT_KEYS,defaultWeights,defaultUseW,defaultRules,defaultEngine,TERM_DEFAULT,
  TEMPLATES,TEMPLATE_ORDER,blankWS,mkRole,mkCat,mkLoc,mkSite,mkPerson,mkGoal,normalize,migrateLegacy,fromDataset,syncLoc,
  Store,rangeOf,dayCfg,planDays,planTotal,plannable,goalSites,goalNeed,fpOf,fpWithLocks,compile,csvParse,csvRow,
  SENSES,WHO_K,WHAT_K,RELS,TEAM_OPS,COUNT_OPS,FLIP,isHard,normRule,mkRule,whoMatch,whatMatch,resolveBook,resolveGoals,parseDates,bookForExport,toDataset,mergeDataset,locDist,arr7};
})(window);
