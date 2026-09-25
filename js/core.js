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

const COLORS=['#6D4461','#9A6B8C','#4F6D7A','#7A6A4F','#5E7A5A','#8C5A5A','#5A5F8C','#8C7A5A','#4F7A73','#7A4F6D'];
const WEIGHT_KEYS=['fair','pref','home','rotate','mix','focus','cluster','spacing','pairs','likes'];
const defaultWeights=()=>({fair:70,pref:45,home:35,rotate:60,mix:60,focus:55,cluster:45,spacing:35,pairs:50,likes:40});
const defaultUseW=()=>{const o={};WEIGHT_KEYS.forEach(k=>o[k]=true);return o};
const defaultRules=()=>({perDay:1,rest:1,distinct:true,siteGap:0,mode:'bend',nearKm:10,weekStart:0});
const defaultEngine=()=>({seed:20260907,quality:'balanced',runs:3,live:true});
const WEEK5=(start,n)=>{const w=[];for(let i=0;i<7;i++)w.push({on:false,n:0,focus:'auto'});for(let i=0;i<5;i++)w[(start+i)%7]={on:true,n,focus:'auto'};return w};

const TERM_DEFAULT={
  en:{visit:'visit',visits:'visits',site:'site',sites:'sites',person:'person',people:'people'},
  ar:{visit:'زيارة',visits:'زيارات',site:'موقع',sites:'مواقع',person:'فرد',people:'أفراد'}
};

function blankWS(name){
  const now=Date.now();
  return {v:2,id:uid('w'),name:name||'Untitled plan',created:now,updated:now,
    template:'blank',
    terms:clone(TERM_DEFAULT),unit:'km',
    roles:[],categories:[],sites:[],people:[],
    week:WEEK5(1,1),overrides:{},
    scope:{mode:'month',start:fISO(new Date(new Date().getFullYear(),new Date().getMonth(),1)),end:''},
    rules:defaultRules(),weights:defaultWeights(),useW:defaultUseW(),engine:defaultEngine(),
    locks:{sites:{},seats:{}},snapshots:[],plan:null};
}
function mkRole(name,color){return {id:uid('r'),name,color}}
function mkCat(name,color,staff,share,planned){return {id:uid('c'),name,color,staff:staff||{},share:share==null?1:share,planned:planned!==false}}
function mkSite(name,cat,km,o){return Object.assign({id:uid('s'),name,cat,km:km||0,zone:'',weight:1,minV:'',maxV:'',days:[true,true,true,true,true,true,true],blackout:[],active:true,note:''},o||{})}
function mkPerson(name,roles,o){return Object.assign({id:uid('p'),name,roles:roles||[],home:0,pref:'none',weight:1,days:[true,true,true,true,true,true,true],off:[],maxLoad:'',maxWeek:'',avoid:[],pair:[],likes:[],bans:[],active:true},o||{})}

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
  const zones=['Central','North','East','South','West'];
  const mains=[['Branch HQ',0,0],['Records Office',0,0],['Medical Affairs',2,0],['Legal Affairs',1,0],['Fleet Depot',4,0],['Annex',1,0],['North Clinic',18,1],['North Students Unit',22,1],['East Workforce Unit',26,2],['East Evening Clinic',26,2],['Riverside Clinic',37,2],['Harbour Clinic',50,3],['South Students Unit',45,3],['South Evening Clinic',45,3],['Westgate Clinic',29,4],['Hill District Unit',66,4],['Valley Unit',82,4],['Old Town Clinic',25,1]];
  const cons=[['Alpha Imaging',0,0],['Crescent Hospital',0,0],['Nile Heart Center',3,0],['Royal East Hospital',5,0],['Family Lab',0,0],['Delta Scan',37,2],['Riverside Radiology',37,2],['Harbour Dialysis',50,3],['Sunrise Nursery',25,1],['Hope Kidney Center',66,4],['Prime Lab',27,1],['Grand Hospital',45,3]];
  const excl=[['Governorate Office',0,0],['Election Committee',0,0],['Prosecution Office',26,2]];
  w.sites=mains.map(([n,k,z])=>mkSite(n,main.id,k,{zone:zones[z]})).concat(cons.map(([n,k,z])=>mkSite(n,con.id,k,{zone:zones[z]}))).concat(excl.map(([n,k,z])=>mkSite(n,exc.id,k,{zone:zones[z]})));
  const P=(n,r,home,pref)=>mkPerson(n,[r],{home,pref,days:[true,true,true,true,true,false,false]});
  w.people=[P('Lubna',fin.id,5,'near'),P('Abaza',fin.id,12,'none'),P('Shaltout',fin.id,8,'near'),P('Amani',fin.id,4,'none'),P('Ghada',fin.id,10,'near'),
    P('Hamoudin',cli.id,6,'near'),P('Shawky',cli.id,16,'far'),P('Asmaa',cli.id,3,'none'),P('Mariam',cli.id,7,'near'),P('Sharnouby',cli.id,11,'none'),P('Maysara',cli.id,9,'near')];
  w.week=[{on:true,n:1,focus:'auto'},{on:true,n:1,focus:'auto'},{on:true,n:1,focus:'auto'},{on:true,n:1,focus:'auto'},{on:true,n:2,focus:'near'},{on:false,n:0,focus:'auto'},{on:false,n:0,focus:'auto'}];
  w.rules.weekStart=0;
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
  names.forEach((n,i)=>{const cat=i<5?fl.id:i<17?fr.id:ki.id;const z=i%5;w.sites.push(mkSite(n,cat,Math.round(2+rnd()*40),{zone:zones[z],weight:i<5?1.5:1}))});
  const P=(n,r,home,pref)=>mkPerson(n,[r],{home,pref,days:[false,true,true,true,true,true,false]});
  w.people=[P('Noah',au.id,8,'none'),P('Layla',au.id,20,'far'),P('Omar',au.id,5,'near'),P('Zara',au.id,14,'none'),
    P('Ivy',me.id,6,'near'),P('Sami',me.id,18,'none'),P('Rana',me.id,11,'far'),P('Theo',me.id,3,'near'),P('Mina',me.id,25,'none'),P('Karim',me.id,9,'none')];
  w.people[0].roles=[au.id,me.id];
  w.week=WEEK5(1,3);w.rules.weekStart=1;w.rules.siteGap=5;w.rules.rest=0;
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
  names.forEach((n,i)=>w.sites.push(mkSite(n,i<6?cx.id:rt.id,Math.round(1+rnd()*18),{zone:zones[i%3],minV:i<6?2:'',weight:i<6?1.3:1})));
  cx.share=1;rt.share=1;
  const P=(n,r,home,pref,days)=>mkPerson(n,[r],{home,pref,days,maxWeek:5});
  const wd=[false,true,true,true,true,true,false],all=[true,true,true,true,true,true,true];
  w.people=[P('Alice',nu.id,4,'near',wd),P('Ben',nu.id,9,'none',all),P('Carla',nu.id,12,'far',wd),
    P('Dev',ai.id,2,'near',wd),P('Ella',ai.id,7,'none',all),P('Femi',ai.id,15,'none',wd),P('Gia',ai.id,5,'near',wd),P('Hugo',ai.id,10,'none',all)];
  w.week=[{on:true,n:2,focus:'auto'},{on:true,n:4,focus:'auto'},{on:true,n:4,focus:'auto'},{on:true,n:4,focus:'auto'},{on:true,n:4,focus:'auto'},{on:true,n:4,focus:'auto'},{on:true,n:2,focus:'auto'}];
  w.rules.weekStart=1;w.rules.rest=0;w.rules.nearKm=8;w.scope={mode:'week',start:weekStartOf(todayISO(),1),end:''};
  return w;
}
const TEMPLATES={blank:tplBlank,field:tplField,retail:tplRetail,care:tplCare};
const TEMPLATE_ORDER=['field','retail','care','blank'];

function normWeek(w){
  const out=[];for(let i=0;i<7;i++){const x=(w&&w[i])||{};out.push({on:!!x.on,n:clamp(intOr(x.n,x.on?1:0),0,50),focus:typeof x.focus==='string'?x.focus:'auto'})}
  return out;
}
function arr7(a,def){if(!Array.isArray(a)||a.length!==7)return [def,def,def,def,def,def,def];return a.map(Boolean)}
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
  w.sites=o.sites.map((s,i)=>({id:okId(s.id,'s'),name:String(s.name||'Site '+(i+1)),cat:cIds.has(s.cat)?s.cat:(w.categories[0]&&w.categories[0].id),
    km:Math.max(0,num(s.km,0)),zone:String(s.zone||''),weight:clamp(num(s.weight,1),.5,2),minV:s.minV===''||s.minV==null?'':Math.max(0,intOr(s.minV,0)),maxV:s.maxV===''||s.maxV==null?'':Math.max(0,intOr(s.maxV,0)),
    days:arr7(s.days,true),blackout:Array.isArray(s.blackout)?s.blackout.filter(validISO):[],active:s.active!==false,note:String(s.note||'')}));
  const sIds=new Set(w.sites.map(s=>s.id));
  w.people=o.people.map((p,i)=>({id:okId(p.id,'p'),name:String(p.name||'Person '+(i+1)),roles:(Array.isArray(p.roles)?p.roles:[]).filter(r=>rIds.has(r)),
    home:Math.max(0,num(p.home,0)),pref:['near','far','none'].includes(p.pref)?p.pref:'none',weight:clamp(num(p.weight,1),.5,2),
    days:arr7(p.days,true),off:Array.isArray(p.off)?p.off.filter(validISO):[],maxLoad:p.maxLoad===''||p.maxLoad==null?'':Math.max(0,intOr(p.maxLoad,0)),maxWeek:p.maxWeek===''||p.maxWeek==null?'':Math.max(0,intOr(p.maxWeek,0)),
    avoid:Array.isArray(p.avoid)?p.avoid:[],pair:Array.isArray(p.pair)?p.pair:[],likes:(Array.isArray(p.likes)?p.likes:[]).filter(x=>sIds.has(x)),bans:(Array.isArray(p.bans)?p.bans:[]).filter(x=>sIds.has(x)),active:p.active!==false}));
  const pIds=new Set(w.people.map(p=>p.id));
  w.people.forEach(p=>{p.avoid=p.avoid.filter(x=>pIds.has(x)&&x!==p.id);p.pair=p.pair.filter(x=>pIds.has(x)&&x!==p.id)});
  w.week=normWeek(o.week);
  w.overrides={};if(o.overrides&&typeof o.overrides==='object')for(const k in o.overrides)if(validISO(k))w.overrides[k]=o.overrides[k];
  const sc=o.scope||{};w.scope={mode:['week','month','custom'].includes(sc.mode)?sc.mode:'month',start:validISO(sc.start)?sc.start:w.scope.start,end:validISO(sc.end)?sc.end:''};
  w.rules=Object.assign(defaultRules(),o.rules||{});
  w.rules.perDay=clamp(intOr(w.rules.perDay,1),0,10);w.rules.rest=clamp(intOr(w.rules.rest,0),0,14);w.rules.siteGap=clamp(intOr(w.rules.siteGap,0),0,60);
  w.rules.nearKm=Math.max(0,num(w.rules.nearKm,10));w.rules.weekStart=clamp(intOr(w.rules.weekStart,0),0,6);w.rules.mode=w.rules.mode==='strict'?'strict':'bend';w.rules.distinct=!!w.rules.distinct;
  w.weights=Object.assign(defaultWeights(),o.weights||{});WEIGHT_KEYS.forEach(k=>w.weights[k]=clamp(num(w.weights[k],50),0,100));
  w.useW=Object.assign(defaultUseW(),o.useW||{});
  w.engine=Object.assign(defaultEngine(),o.engine||{});w.engine.seed=Math.max(1,intOr(w.engine.seed,1));w.engine.runs=clamp(intOr(w.engine.runs,3),1,16);
  if(!['fast','balanced','thorough'].includes(w.engine.quality))w.engine.quality='balanced';
  w.locks={sites:Object.assign({},(o.locks&&o.locks.sites)||{}),seats:Object.assign({},(o.locks&&o.locks.seats)||{})};
  w.snapshots=Array.isArray(o.snapshots)?o.snapshots.filter(s=>s&&s.plan).slice(0,30):[];
  w.plan=o.plan&&o.plan.res&&o.plan.map?o.plan:null;
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
  w.rules.rest=st.noConsecutive===false?0:1;w.rules.perDay=st.oneVisitPerDay===false?2:1;w.rules.mode=st.relaxMode==='strict'?'strict':'bend';w.rules.nearKm=st.nearKm||10;w.rules.distinct=st.distinctPerDay!==false;
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
function fpOf(ws){
  return fnv(JSON.stringify([ws.roles.map(r=>r.id),ws.categories.map(c=>[c.id,c.staff,c.share,c.planned]),
    ws.sites.map(s=>[s.id,s.cat,s.km,s.zone,s.weight,s.minV,s.maxV,s.days,s.blackout,s.active]),
    ws.people.map(p=>[p.id,p.roles,p.home,p.pref,p.weight,p.days,p.off,p.maxLoad,p.maxWeek,p.avoid,p.pair,p.likes,p.bans,p.active]),
    ws.week,ws.overrides,ws.scope,ws.rules,ws.weights,ws.useW,ws.engine.seed,ws.engine.quality,ws.engine.runs]));
}
function fpWithLocks(ws){return fnv(fpOf(ws)+JSON.stringify(ws.locks))}

function compile(ws){
  const {start,end}=rangeOf(ws);
  const warn=[];
  const all=daysIn(start,end);
  const days=[];
  for(const iso of all){const c=dayCfg(ws,iso);if(c.on&&c.n>0)days.push({iso,cfg:c})}
  const roles=ws.roles.slice();const R=roles.length;const rIx={};roles.forEach((r,i)=>rIx[r.id]=i);
  const siteActive=ws.sites.filter(s=>s.active);
  const cats=ws.categories.filter(c=>c.planned&&siteActive.some(s=>s.cat===c.id));const C=cats.length;const cIx={};cats.forEach((c,i)=>cIx[c.id]=i);
  const sites=siteActive.filter(s=>cIx[s.cat]!==undefined);const S=sites.length;const sIx={};sites.forEach((s,i)=>sIx[s.id]=i);
  const people=ws.people.filter(p=>p.active&&p.roles.some(r=>rIx[r]!==undefined));const N=people.length;const pIx={};people.forEach((p,i)=>pIx[p.id]=i);
  const D=days.length;
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
    for(let k=0;k<d.cfg.n;k++){
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
  const shareSum=sum(cats.map(c=>c.share));
  const mixOn=shareSum>0&&C>1;
  const catTarget=cats.map((c,ci)=>{
    if(shareSum>0)return V*c.share/shareSum;
    const n=sites.filter(s=>s.cat===c.id).length;return V*n/Math.max(1,S);
  });
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
  const sExp=sites.map(s=>{const c=cIx[s.cat];const tw=sum(sites.filter(x=>x.cat===s.cat).map(x=>x.weight));return catTarget[c]*s.weight/tw});
  const sMin=sites.map(s=>s.minV===''?0:+s.minV);
  const sMax=sites.map(s=>s.maxV===''?-1:+s.maxV);
  const zoneIx={};let zn=0;
  const sZone=sites.map(s=>{const z=(s.zone||'').trim().toLowerCase();if(!z)return -1;if(zoneIx[z]===undefined)zoneIx[z]=zn++;return zoneIx[z]});
  const rel=new Array(N*N).fill(0);
  people.forEach((p,pi)=>{p.avoid.forEach(q=>{const qi=pIx[q];if(qi!==undefined){rel[pi*N+qi]=1;rel[qi*N+pi]=1}});p.pair.forEach(q=>{const qi=pIx[q];if(qi!==undefined&&rel[pi*N+qi]!==1){rel[pi*N+qi]=2;rel[qi*N+pi]=2}})});
  const aff=new Array(N*S).fill(0);
  people.forEach((p,pi)=>{p.likes.forEach(s=>{if(sIx[s]!==undefined)aff[pi*S+sIx[s]]=1});p.bans.forEach(s=>{if(sIx[s]!==undefined)aff[pi*S+sIx[s]]=2})});
  const Dn=Math.max(10,...sites.map(s=>s.km),...people.map(p=>p.home));
  const w={};WEIGHT_KEYS.forEach(k=>w[k]=ws.useW[k]?ws.weights[k]/50:0);
  const q={fast:25000,balanced:90000,thorough:300000}[ws.engine.quality]||90000;
  const iters=Math.round(q*clamp((Z+V)/120,.6,5));
  if(!D)warn.push({k:'nodays'});
  if(!C)warn.push({k:'nosites'});
  roles.forEach((r,ri)=>{if(demand[ri]>0&&!roleMembers[ri].length)warn.push({k:'norole',r:r.id})});
  const nWeeks=new Set(dayWeek).size||1;
  const capOf=pi=>{let a=0;for(let d=0;d<D;d++)a+=pAvail[pi*D+d];let c=a*(ws.rules.perDay||10);const p=people[pi];if(p.maxLoad!=='')c=Math.min(c,+p.maxLoad);if(p.maxWeek!=='')c=Math.min(c,+p.maxWeek*nWeeks);return c};
  roles.forEach((r,ri)=>{if(!roleMembers[ri].length)return;let cap=0;roleMembers[ri].forEach(pi=>{cap+=capOf(pi)/people[pi].roles.filter(x=>rIx[x]!==undefined).length});cap=Math.floor(cap);if(demand[ri]>cap+.01)warn.push({k:'capacity',r:r.id,need:Math.round(demand[ri]),cap})});
  cats.forEach((c,ci)=>{const mins=sum(sites.filter(s=>s.cat===c.id).map(s=>s.minV===''?0:+s.minV));if(mins>catTarget[ci]+.5)warn.push({k:'minover',c:c.id,need:mins,have:Math.round(catTarget[ci])})});
  if(ws.rules.rest>0){
    roles.forEach((r,ri)=>{const mem=roleMembers[ri];if(!mem.length)return;
      for(let i=0;i+1<D;i++){if(dayNumA[i+1]-dayNumA[i]>ws.rules.rest)continue;
        const nA=days[i].cfg.n,nB=days[i+1].cfg.n;let minNeed=Infinity;for(let c=0;c<C;c++)if(catTarget[c]>0)minNeed=Math.min(minNeed,need[c*R+ri]);if(!isFinite(minNeed))minNeed=0;
        const needAB=minNeed*(nA+nB);let free=0;mem.forEach(pi=>{if(pAvail[pi*D+i]||pAvail[pi*D+i+1])free++});
        if(needAB>free+.01){warn.push({k:'tight',r:r.id,d1:days[i].iso,d2:days[i+1].iso,need:Math.ceil(needAB),free});break}}
    });
  }
  const P={D,V,S,N,R,C,Z,vDay,vLock,vSeat0,vSeatN,seatVisit,seatRole,seatIdx,seatLock,
    sCat:sites.map(s=>cIx[s.cat]),sKm:sites.map(s=>+s.km||0),sZone,sExp,sMin,sMax,sAvail,need,catTarget,mixOn,
    pAvail,pHome:people.map(p=>+p.home||0),pPref:people.map(p=>p.pref==='near'?1:p.pref==='far'?2:0),pTarget,
    pMaxLoad:people.map(p=>p.maxLoad===''?-1:+p.maxLoad),pMaxWeek:people.map(p=>p.maxWeek===''?-1:+p.maxWeek),pIdeal,rel,aff,
    dayNum:dayNumA,dayWeek,dayFocus,roleMembers,w,
    rules:{perDay:ws.rules.perDay,rest:ws.rules.rest,strict:ws.rules.mode==='strict',distinct:ws.rules.distinct,siteGap:ws.rules.siteGap,nearKm:ws.rules.nearKm},
    Dn,seed:ws.engine.seed,iters,runs:ws.engine.runs};
  const map={start,end,days:days.map(d=>({iso:d.iso,n:d.cfg.n,focus:d.cfg.focus})),visits,seats:seats.map(s=>({key:s.key,v:s.v,r:s.r,i:s.i})),
    roles:roles.map(r=>r.id),cats:cats.map(c=>c.id),sites:sites.map(s=>s.id),people:people.map(p=>p.id),pTarget,catTarget,demand};
  return {P,map,warn};
}

function csvParse(text){
  const rows=[];let row=[],f='',q=false;
  const t=String(text||'').replace(/^\uFEFF/,'');
  const delim=(t.split('\n')[0].match(/\t/g)||[]).length>(t.split('\n')[0].match(/,/g)||[]).length?'\t':(t.split('\n')[0].match(/;/g)||[]).length>(t.split('\n')[0].match(/,/g)||[]).length?';':',';
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
  COLORS,WEIGHT_KEYS,defaultWeights,defaultUseW,defaultRules,defaultEngine,TERM_DEFAULT,
  TEMPLATES,TEMPLATE_ORDER,blankWS,mkRole,mkCat,mkSite,mkPerson,normalize,migrateLegacy,
  Store,rangeOf,dayCfg,fpOf,fpWithLocks,compile,csvParse,csvRow};
})(window);
