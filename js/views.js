(function(G){
'use strict';
const M=G.MV,{esc,byId,pISO,fISO,addISO,dowOf,todayISO,sum,avg,gini,clamp,daysIn,dayCfg,rangeOf,weekStartOf}=M;
const {t,arr}=G.I18N;
const A=()=>G.APP;
const ic=(n,c)=>'<svg class="ic '+(c||'')+'" aria-hidden="true"><use href="#'+n+'"/></svg>';
const L=()=>G.I18N.lang();
const fmtD=iso=>{const d=pISO(iso);return arr('dows')[d.getDay()]+' '+d.getDate()+' '+arr('months')[d.getMonth()]};
const fmtDL=iso=>{const d=pISO(iso);return arr('dows')[d.getDay()]+' · '+d.getDate()+' '+arr('monthsL')[d.getMonth()]+' '+d.getFullYear()};
const fmtDS=iso=>{const d=pISO(iso);return d.getDate()+' '+arr('months')[d.getMonth()]};
const unitL=()=>{const u=A().ws.unit;return L()==='ar'?(u==='mi'?'ميل':'كم'):u};
const r1=x=>Math.round(x*10)/10;
const fmtN=x=>{const v=Math.round(x*10)/10;return (Math.abs(v)>=1000?Math.round(v).toLocaleString('en'):String(v))};
const fmtMs=ms=>ms<1000?ms+' ms':(ms/1000).toFixed(1)+' s';
const fill=(v,mn,mx)=>((v-mn)/(mx-mn)*100)+'%';
const swBtn=(on,act,attrs,sm)=>'<button class="sw'+(sm?' sm':'')+(on?' on':'')+'" role="switch" aria-checked="'+(on?'true':'false')+'" data-act="'+act+'" '+(attrs||'')+'></button>';
const stepper=(act,attrs,v)=>'<div class="step"><button data-act="'+act+'" '+attrs+' data-d="-1" aria-label="−">'+ic('ic-minus')+'</button><span class="v">'+v+'</span><button data-act="'+act+'" '+attrs+' data-d="1" aria-label="+">'+ic('ic-plus')+'</button></div>';
const wdChips=(days,act,attrs)=>{const n=arr('dows1');const ws=A().ws.rules.weekStart;let h='<div class="wds">';for(let k=0;k<7;k++){const i=(ws+k)%7;h+='<button class="wd'+(days[i]?' on':'')+'" data-act="'+act+'" '+attrs+' data-i="'+i+'" title="'+esc(arr('dows')[i])+'">'+n[i]+'</button>'}return h+'</div>'};
const DD=new Map();let ddN=0;
function dd(bind,attrs,val,opts,o){
  o=o||{};
  const id='d'+(ddN++);DD.set(id,{bind,opts,val:String(val==null?'':val),search:o.search!=null?o.search:opts.length>9});
  const cur=opts.find(x=>String(x[0])===String(val));
  const sw=x=>x&&x[2]?'<span class="dot" style="--c:'+esc(x[2])+'"></span>':'';
  const lab=cur&&!o.ph?cur[1]:(o.ph||'—');
  return '<button type="button" class="dd'+(o.cls?' '+o.cls:'')+(cur&&!o.ph?'':' ph')+'" data-act="dd" data-dd="'+id+'" data-bind="'+esc(bind)+'" '+(attrs||'')+(o.title?' title="'+esc(o.title)+'"':'')+' aria-haspopup="listbox">'+(o.ph?'':sw(cur))+'<span class="ddv">'+esc(lab)+'</span>'+ic('ic-chev','ddc')+'</button>';
}
function ddPop(id,q){
  const st=DD.get(id);if(!st)return '';
  q=(q||'').trim().toLowerCase();
  const list=st.opts.map((x,i)=>[x,i]).filter(([x])=>!q||String(x[1]).toLowerCase().includes(q)||String(x[3]||'').toLowerCase().includes(q));
  return (st.search?'<div class="ddsearch">'+ic('ic-search')+'<input id="ddQ" autocomplete="off" placeholder="'+esc(t('search'))+'" value="'+esc(q)+'"></div>':'')
    +'<div class="ddlist" role="listbox">'+(list.length?list.map(([x,i])=>'<button type="button" class="ddopt'+(String(x[0])===st.val?' on':'')+'" data-act="ddPick" data-i="'+i+'" role="option">'+(x[2]?'<span class="dot" style="--c:'+esc(x[2])+'"></span>':'')+'<span class="ddl">'+esc(x[1])+'</span>'+(x[3]?'<small>'+esc(x[3])+'</small>':'')+(String(x[0])===st.val?ic('ic-check','ddok'):'')+'</button>').join(''):'<div class="ddnone">'+esc(t('noMatch'))+'</div>')+'</div>';
}
const lvlOpts=()=>M.LEVELS.map(v=>[v,v+' · '+t('lvl'+v)]);
const lvlChip=v=>'<span class="lvl l'+v+'" title="'+esc(t('lvl'+v))+'">'+v+'</span>';
const locOf=id=>byId(A().ws.locations||[],id);
const locOpts=(none)=>[['',none||t('noLoc')]].concat((A().ws.locations||[]).slice().sort((a,b)=>a.km-b.km||a.name.localeCompare(b.name)).map(l=>[l.id,l.name,null,r1(l.km)+' '+unitL()]));
const catOf=id=>byId(A().ws.categories,id);
const roleOf=id=>byId(A().ws.roles,id);
const catColor=id=>{const c=catOf(id);return c?c.color:'#999'};
const ctag=c=>c?'<span class="ctag" style="--c:'+esc(c.color)+'">'+esc(c.name)+'</span>':'';

function derive(){
  const ws=A().ws,pl=ws.plan;
  if(!pl||!pl.res||!pl.map)return null;
  if(pl.derived&&pl.derived._ws===ws.updated)return pl.derived;
  const m=pl.map,r=pl.res;
  const siteOfV=v=>{const i=r.siteOf[v];return i>=0?byId(ws.sites,m.sites[i]):null};
  const personOfZ=z=>{const i=r.seatP[z];return i>=0?byId(ws.people,m.people[i]):null};
  const byDay=m.days.map(()=>[]);
  m.visits.forEach((v,vi)=>byDay[v.d].push(vi));
  const pd={};
  m.seats.forEach((s,z)=>{const p=r.seatP[z];if(p<0||!r.stats.active[z])return;const pid=m.people[p],d=m.visits[s.v].d;(pd[pid+'|'+d]=pd[pid+'|'+d]||[]).push(z)});
  const flagged=new Set(),dayIss=new Set();
  const iss=(r.issues||[]).map(x=>Object.assign({},x));
  iss.forEach(x=>{
    if(x.v!=null)dayIss.add(m.visits[x.v].d);
    if(x.d!=null)dayIss.add(x.d);
    if(x.k==='rest'||x.k==='run'){flagged.add(m.people[x.p]+'|'+x.d1);flagged.add(m.people[x.p]+'|'+x.d2);dayIss.add(x.d2)}
    if(x.k==='perday'||x.k==='unavail')flagged.add(m.people[x.p]+'|'+(x.d!=null?x.d:m.visits[x.v].d));
  });
  const loads={};m.people.forEach((pid,i)=>loads[pid]=r.stats.loads[i]);
  const targets={};m.people.forEach((pid,i)=>targets[pid]=m.pTarget[i]);
  const uses={};m.sites.forEach((sid,i)=>uses[sid]=r.stats.siteUse[i]);
  const goalIx={};
  (ws.goals||[]).forEach(g=>{if(!g.on)return;const set=M.goalSites(ws,g).filter(s=>uses[s.id]!=null);
    const ok=u=>g.op==='min'?u>=g.n:g.op==='max'?u<=g.n:u===g.n;
    if(g.per==='each'){const met=set.filter(s=>ok(uses[s.id]||0)).length;goalIx[g.id]={met:met===set.length,txt:met+'/'+set.length}}
    else{const tot=sum(set.map(s=>uses[s.id]||0));goalIx[g.id]={met:ok(tot),txt:tot+' / '+g.n}}});
  const D={m,r,siteOfV,personOfZ,byDay,pd,flagged,dayIss,iss,loads,targets,uses,goalIx,_ws:ws.updated};
  Object.defineProperty(pl,'derived',{value:D,enumerable:false,configurable:true,writable:true});
  return D;
}

function issueText(x,D){
  const ws=A().ws,m=D.m;
  const pn=i=>{const p=byId(ws.people,m.people[i]);return p?p.name:'—'};
  const sn=i=>{const s=byId(ws.sites,m.sites[i]);return s?s.name:'—'};
  const dn=i=>fmtD(m.days[i].iso);
  const vd=v=>fmtD(m.days[m.visits[v].d].iso);
  const vs=v=>{const s=D.siteOfV(v);return s?s.name:'—'};
  const rn=i=>{const r=roleOf(m.roles[i]);return r?r.name:'—'};
  switch(x.k){
    case 'nosite':return t('i_nosite',{d:vd(x.v),k:m.visits[x.v].k+1});
    case 'siteoff':return t('i_siteoff',{d:vd(x.v),s:sn(x.s)});
    case 'open':return t('i_open',{d:vd(x.v),s:vs(x.v),n:x.n,r:rn(x.r)});
    case 'rest':return t('i_rest',{p:pn(x.p),d1:dn(x.d1),d2:dn(x.d2),n:x.n});
    case 'run':return t('i_run',{p:pn(x.p),d1:dn(x.d1),d2:dn(x.d2),n:x.n});
    case 'rankgap':return t('i_rankgap',{s:sn(x.s),d:vd(x.v),n:x.n,max:x.max});
    case 'goalmiss':return t('i_goalmiss',{s:sn(x.s),n:x.n,min:x.min});
    case 'goalover':return t('i_goalover',{s:sn(x.s),n:x.n,max:x.max});
    case 'goalgrp':{const g=byId(ws.goals,m.grpGoal&&m.grpGoal[x.g]);return t('i_goalgrp',{g:g?goalText(g):'—',n:x.n,max:x.max})}
    case 'perday':return t('i_perday',{p:pn(x.p),n:x.n,d:dn(x.d)});
    case 'maxload':return t('i_maxload',{p:pn(x.p),n:x.n,max:x.max});
    case 'maxweek':return t('i_maxweek',{p:pn(x.p),n:x.n,max:x.max});
    case 'ban':return t('i_ban',{p:pn(x.p),s:sn(x.s),d:vd(x.v)});
    case 'unavail':return t('i_unavail',{p:pn(x.p),d:dn(x.d)});
    case 'sitemax':return t('i_sitemax',{s:sn(x.s),n:x.n,max:x.max});
    case 'sitemin':return t('i_sitemin',{s:sn(x.s),n:x.n,min:x.min});
    case 'sitegap':return t('i_sitegap',{s:sn(x.s),d1:dn(x.d1),d2:dn(x.d2)});
    case 'dup':return t('i_dup',{s:sn(x.s),d:dn(x.d)});
    case 'avoid':return t('i_avoid',{p:pn(x.p),q:pn(x.q),s:vs(x.v),d:vd(x.v)});
  }
  return x.k;
}
function issueDay(x,D){
  if(x.v!=null)return D.m.days[D.m.visits[x.v].d].iso;
  if(x.d!=null)return D.m.days[x.d].iso;
  if(x.d2!=null)return D.m.days[x.d2].iso;
  return null;
}
function warnText(w){
  const rn=id=>{const r=roleOf(id);return r?r.name:'—'};
  switch(w.k){
    case 'nodays':return t('w_nodays');
    case 'nosites':return t('w_nosites');
    case 'norole':return t('w_norole',{r:rn(w.r)});
    case 'capacity':return t('w_capacity',{r:rn(w.r),need:w.need,cap:w.cap});
    case 'minover':{const c=catOf(w.c);return t('w_minover',{c:c?c.name:'—',need:w.need,have:w.have})}
    case 'tight':return t('w_tight',{r:rn(w.r),d1:fmtD(w.d1),d2:fmtD(w.d2),need:w.need,free:w.free});
    case 'goalshort':return t('w_goalshort',{need:w.need,have:w.have});
    case 'rankgap':return t('w_rankgap',{n:w.n,ex:w.ex});
  }
  return w.k;
}

function mast(){
  const a=A(),ws=a.ws;
  const pl=ws.plan;
  return '<button class="palbtn" data-act="palette" aria-label="'+esc(t('palette'))+'">'+ic('ic-search')+'<span>'+esc(t('palette'))+'</span><kbd>Ctrl K</kbd></button>'
    +'<button class="ibtn" data-act="undo" title="'+esc(t('undo'))+' (Ctrl Z)" '+(a.hist.u.length?'':'disabled style="opacity:.4"')+'>'+ic('ic-undo')+'</button>'
    +'<button class="ibtn" data-act="redo" title="'+esc(t('redo'))+' (Ctrl Shift Z)" '+(a.hist.r.length?'':'disabled style="opacity:.4"')+'>'+ic('ic-redo')+'</button>'
    +'<button class="ibtn" data-act="theme" title="'+esc(t('themeT'))+'">'+ic(a.prefs.theme==='dusk'?'ic-sun':'ic-moon')+'</button>'
    +'<div class="seg mini" role="group" aria-label="language"><button class="'+(L()==='en'?'on':'')+'" data-act="lang" data-v="en">EN</button><button class="'+(L()==='ar'?'on':'')+'" data-act="lang" data-v="ar">ع</button></div>'
    +'<div class="seedchip mono">'+esc(t('seed'))+' <b>'+ws.engine.seed+'</b></div>';
}
function tagline(){
  const ws=A().ws;
  return '<span>'+esc(t('tagline'))+'</span><span>·</span><button class="wsbtn" data-act="tab" data-view="workspace">'+esc(ws.name)+ic('ic-chev')+'</button>';
}
function tabs(){
  const v=A().view,ws=A().ws;
  const D=derive();const nIss=D&&!A().isStale()?D.iss.filter(x=>x.sev!=='info').length:0;
  const T=TABS;
  return T.map(([k,i,l],n)=>'<button class="tab'+(v===k?' on':'')+'" role="tab" aria-selected="'+(v===k)+'" data-act="tab" data-view="'+k+'" title="'+esc(t(l))+' ('+(n+1)+')">'+ic(i)+'<span class="tablab">'+esc(t(l))+'</span>'+(k==='plan'&&nIss?'<span class="badge">'+nIss+'</span>':'')+'</button>').join('');
}

const TABS=[['plan','ic-cal','tabPlan'],['sites','ic-build','tabSites'],['people','ic-users','tabPeople'],['rules','ic-sliders','tabRules'],['model','ic-sigma','tabModel'],['insights','ic-chart','tabInsights'],['workspace','ic-layers','tabWs']];
function ringSvg(f){const c=2*Math.PI*9;return '<svg class="ring" viewBox="0 0 22 22"><circle class="bg" cx="11" cy="11" r="9"/><circle class="fg" cx="11" cy="11" r="9" stroke-dasharray="'+c+'" stroke-dashoffset="'+(c*(1-f))+'"/></svg>'}
function statusHTML(){
  const a=A(),ws=a.ws;
  if(a.solving)return ringSvg(a.solving.f||0)+'<span>'+esc(t('solving'))+' '+Math.round((a.solving.f||0)*100)+'%</span>';
  const pl=ws.plan;if(!pl||!pl.res)return '';
  const D=derive();const n=D.iss.filter(x=>x.sev!=='info').length;
  return (n?'<span class="chip warn">'+ic('ic-alert')+t('nIssues',{n})+'</span>':'<span class="chip good">'+ic('ic-check')+esc(t('allClean'))+'</span>')
    +'<span class="mono tiny muted">'+esc(t('cost'))+' '+fmtN(pl.res.cost)+' · '+esc(t('solvedIn',{ms:fmtMs(pl.res.ms)}))+'</span>';
}

function planView(){
  const a=A(),ws=a.ws;const {start,end}=rangeOf(ws);
  const list=daysIn(start,end).map(iso=>({iso,cfg:dayCfg(ws,iso)}));
  if(!a.selDay||!list.some(d=>d.iso===a.selDay))a.selDay=(list.find(d=>d.cfg.on)||list[0]).iso;
  const work=list.filter(d=>d.cfg.on&&d.cfg.n>0);
  const pdays=M.planDays(ws,true);const pdn={};pdays.forEach(d=>pdn[d.iso]=d.n);
  const V=sum(pdays.map(d=>d.n));
  const C=a.compiled();
  const D=derive();const stale=a.isStale();
  const td=todayISO();
  const tiles=list.map(d=>{
    const on=d.cfg.on&&d.cfg.n>0,sel=d.iso===a.selDay,nn=pdn[d.iso]!=null?pdn[d.iso]:0;
    let dots='';
    if(on){dots=nn<=4?'<i></i>'.repeat(nn):'<b>'+nn+'</b>';
      if(d.cfg.focus==='near')dots+=ic('ic-pin');
      else if(d.cfg.focus==='far')dots+='<b>↗</b>';
      else if(d.cfg.focus!=='auto'&&catOf(d.cfg.focus))dots+='<span class="dot" style="--c:'+esc(catColor(d.cfg.focus))+';width:6px;height:6px"></span>';}
    let hasI=false;
    if(D&&!stale){const di=D.m.days.findIndex(x=>x.iso===d.iso);if(di>=0&&D.dayIss.has(di))hasI=true}
    return '<button class="tile'+(on?'':' off')+(sel?' sel':'')+(d.cfg.over?' ov':'')+(d.iso===td?' today':'')+(hasI?' hasiss':'')+'" data-act="tile" data-iso="'+d.iso+'" title="'+esc(fmtDL(d.iso)+' · '+(on?t('nVisits',{n:d.cfg.n}):t('dayOff')))+'"><span class="dw">'+arr('dows')[dowOf(d.iso)]+'</span><span class="dn">'+pISO(d.iso).getDate()+'</span><span class="tdots">'+dots+'</span></button>';
  }).join('');
  const sd=list.find(d=>d.iso===a.selDay);
  const focusOpts=[['auto',t('fAuto')],['near',t('fNear')],['far',t('fFar')]].concat(ws.categories.filter(c=>c.planned).map(c=>[c.id,c.name]));
  const dayEdit=sd?'<div class="day-edit noprint"><div class="de-date"><b>'+esc(fmtDL(sd.iso))+'</b><span>'+esc(sd.cfg.over?t('overridden'):t('followsWeek'))+'</span></div>'
    +'<div class="de-ctl"><span class="lbl">'+esc(sd.cfg.on?t('dayOn'):t('dayOff'))+'</span>'+swBtn(sd.cfg.on,'dayOn','data-iso="'+sd.iso+'"')+'</div>'
    +(sd.cfg.on?'<div class="de-ctl"><span class="lbl">'+esc(t('visitsLbl'))+'</span>'+stepper('dayN','data-iso="'+sd.iso+'"',sd.cfg.n)+'</div>'
      +'<div class="de-ctl"><span class="lbl">'+esc(t('focus'))+'</span>'+dd('dayFocus','data-iso="'+sd.iso+'"',sd.cfg.focus,focusOpts)+'</div>':'')
    +(sd.cfg.over?'<button class="linkbtn" data-act="dayReset" data-iso="'+sd.iso+'">'+ic('ic-undo')+esc(t('resetDay'))+'</button>':'')+'</div>':'';
  const sm=ws.scope.mode;
  const scope='<section class="card noprint" id="scope-card"><div class="card-head"><div><div class="kicker">'+esc(t('kScope'))+'</div><h2 class="ctitle">'+esc(t('planWindow'))+'</h2></div>'
    +'<div class="seg" role="group">'+['week','month','custom'].map(k=>'<button class="'+(sm===k?'on':'')+'" data-act="scopeMode" data-v="'+k+'">'+esc(t(k))+'</button>').join('')+'</div></div>'
    +'<div class="scope-row"><label class="fld"><span>'+esc(t('start'))+'</span>'+dpkTrigger('scopeStart',sm==='month'?start:ws.scope.start,sm==='month'?'month':'')+'</label>'
    +(sm==='custom'?'<label class="fld"><span>'+esc(t('end'))+'</span>'+dpkTrigger('scopeEnd',end)+'</label><div class="fld"><span>'+esc(t('lenDays'))+'</span>'+stepper('scopeLen','',M.diffDays(start,end)+1)+'</div>':'')
    +'<div class="navpair"><button class="ibtn" data-act="scopeShift" data-d="-1" title="'+esc(t('prevW'))+'">'+ic('ic-chevl','flip')+'</button><button class="btn sm ghost" data-act="scopeToday">'+esc(t('thisW'))+'</button><button class="ibtn" data-act="scopeShift" data-d="1" title="'+esc(t('nextW'))+'">'+ic('ic-chevr','flip')+'</button></div>'
    +'<div class="scope-stats"><span class="chip">'+esc(t('nWork',{n:work.length}))+'</span><span class="chip">'+esc(t('nVisits',{n:V}))+'</span><span class="chip">'+esc(t('nPeopleA',{n:C.P.N}))+'</span></div></div>'
    +'<div class="ribbon" id="ribbon">'+tiles+'</div>'+dayEdit
    +'<div class="cta-row"><button class="btn primary" data-act="solve">'+ic('ic-wand')+esc(t('solve'))+'<kbd>G</kbd></button>'
    +'<button class="btn" data-act="reroll">'+ic('ic-dice')+esc(t('reroll'))+'<kbd>R</kbd></button>'
    +'<button class="btn" data-act="export">'+ic('ic-down')+esc(t('exportB'))+'<kbd>E</kbd></button>'
    +'<button class="btn ghost" data-act="print">'+ic('ic-print')+esc(t('print'))+'</button>'
    +'<div class="status" id="status">'+statusHTML()+'</div></div></section>';
  return scope+recipeCard(ws,pdays,V,C)+scheduleCard(C,D,stale);
}
function goalText(g){
  const ws=A().ws;
  const sc=g.scope==='all'?t('g_allSites'):g.scope==='crit'?t('g_critTxt',{n:g.ref||0}):g.scope==='cat'?((catOf(g.ref)||{}).name||'—'):g.scope==='loc'?((locOf(g.ref)||{}).name||'—'):g.scope==='tag'?(g.ref||'—'):((byId(ws.sites,g.ref)||{}).name||'—');
  return t(g.per==='each'?'g_txtEach':'g_txtTotal',{op:t('op_'+g.op),n:g.n,s:sc});
}
function goalRefOpts(g){
  const ws=A().ws;
  if(g.scope==='cat')return ws.categories.filter(c=>c.planned).map(c=>[c.id,c.name,c.color,ws.sites.filter(s=>s.cat===c.id&&s.active).length+'']);
  if(g.scope==='loc'){const cnt={};M.plannable(ws).forEach(s=>{if(s.loc)cnt[s.loc]=(cnt[s.loc]||0)+1});return (ws.locations||[]).filter(l=>cnt[l.id]).sort((a,b)=>a.km-b.km).map(l=>[l.id,l.name,null,cnt[l.id]+' · '+r1(l.km)+' '+unitL()])}
  if(g.scope==='tag'){const cnt={};M.plannable(ws).forEach(s=>{if(s.tag)cnt[s.tag]=(cnt[s.tag]||0)+1});return Object.keys(cnt).sort().map(k=>[k,k,null,cnt[k]+''])}
  if(g.scope==='crit')return [25,50,75,100].map(v=>[String(v),'≥ '+v+' · '+t('lvl'+v),null,M.plannable(ws).filter(s=>s.crit>=v).length+'']);
  if(g.scope==='site')return M.plannable(ws).map(s=>[s.id,s.name,catColor(s.cat),(locOf(s.loc)||{}).name||'']);
  return [];
}
function recipeCard(ws,pdays,V,C){
  const sz=ws.sizing,mode=sz.mode;
  const need=M.goalNeed(ws),nOn=ws.goals.filter(g=>g.on).length;
  const rhythmN=sum(pdays.map(d=>d.cfg.n));
  const nPl=M.plannable(ws).length;
  const D=derive(),ok=D&&!A().isStale();
  const gi=D?D.goalIx:null;
  let h='<section class="card noprint" id="recipe-card"><div class="card-head"><div><div class="kicker">'+esc(t('kRecipe'))+'</div><h2 class="ctitle">'+esc(t('recipeT'))+'</h2></div>'
    +'<div class="row">'+dd('preset','',"",[['once',t('pr_once')],['twice',t('pr_twice')],['crit',t('pr_crit')],['clear',t('pr_clear')]],{ph:t('presets'),cls:'ghostdd'})+'</div></div>';
  h+='<div class="sizing"><div class="szq"><span class="lbl">'+esc(t('howMany'))+'</span><div class="seg">'+[['rhythm','sz_rhythm'],['total','sz_total'],['goals','sz_goals']].map(([k,l])=>'<button class="'+(mode===k?'on':'')+'" data-act="sizeMode" data-v="'+k+'">'+esc(t(l))+'</button>').join('')+'</div>'
    +(mode==='total'?'<span class="sznum"><input class="inp num" type="number" min="0" data-bind="sizeTotal" value="'+sz.total+'"></span>':'')+'</div>'
    +'<div class="szsum"><b class="bignum">'+V+'</b><span>'+esc(t('szSum',{d:pdays.filter(d=>d.n>0).length}))+'</span>'
    +(mode==='rhythm'?'<small>'+esc(t('szRhythmN'))+'</small>':mode==='total'?'<small>'+esc(t('szTotalN',{r:rhythmN}))+'</small>':'<small>'+esc(nOn?t('szGoalsN',{n:need}):t('szGoalsNone'))+'</small>')+'</div>'
    +'<div class="szdays"><span class="lbl">'+esc(t('workDays'))+'</span>'+wdChips(ws.week.map(d=>d.on),'weekOn','')+'</div></div>';
  h+='<div class="goals"><div class="grouplbl">'+esc(t('goalsT'))+' <span class="muted mono tiny">'+esc(t('nPlannable',{n:nPl}))+'</span></div>';
  if(!ws.goals.length)h+='<div class="goal-empty">'+ic('ic-target')+'<span>'+esc(t('goalsEmpty'))+'</span></div>';
  ws.goals.forEach(g=>{
    const refOpts=goalRefOpts(g);
    const set=M.goalSites(ws,g);const imp=g.per==='each'?set.length*g.n:g.n;
    let prog='';
    if(ok&&gi&&gi[g.id]){const x=gi[g.id];prog='<span class="gprog '+(x.met?'good':'bad')+'">'+ic(x.met?'ic-check':'ic-alert')+esc(x.txt)+'</span>'}
    h+='<div class="goal'+(g.on?'':' off')+'">'+swBtn(g.on,'goalOn','data-id="'+g.id+'"',true)
      +'<div class="gsent">'+dd('goal','data-id="'+g.id+'" data-f="per"',g.per,[['each',t('g_each')],['total',t('g_total')]])
      +dd('goal','data-id="'+g.id+'" data-f="scope"',g.scope,[['all',t('g_allSites')],['cat',t('g_cat')],['loc',t('g_loc')],['tag',t('g_tag')],['crit',t('g_crit')],['site',t('g_site')]])
      +(g.scope!=='all'?dd('goal','data-id="'+g.id+'" data-f="ref"',g.ref,refOpts,{search:refOpts.length>7,ph:refOpts.some(o=>o[0]===g.ref)?null:t('pick')}):'')
      +'<span class="gw">'+esc(t('g_gets'))+'</span>'+dd('goal','data-id="'+g.id+'" data-f="op"',g.op,[['min',t('op_min')],['exact',t('op_exact')],['max',t('op_max')]])
      +stepper('goalN','data-id="'+g.id+'"',g.n)+'<span class="gw">'+esc(t('visitsLbl').toLowerCase())+'</span></div>'
      +'<span class="gmeta mono tiny">'+esc(g.per==='each'?t('g_sitesX',{n:set.length,v:imp}):t('g_sitesIn',{n:set.length}))+'</span>'+prog
      +'<button class="ibtn" data-act="goalDel" data-id="'+g.id+'" title="'+esc(t('remove'))+'">'+ic('ic-trash')+'</button></div>';
  });
  h+='<button class="btn sm addgoal" data-act="goalAdd">'+ic('ic-plus')+esc(t('addGoal'))+'</button></div>'
    +'<p class="quiet">'+ic('ic-info')+esc(t('recipeNote'))+'</p></section>';
  return h;
}
function scheduleCard(C,D,stale){
  const a=A(),ws=a.ws;
  const lay=a.prefs.layout||'agenda';
  const nPins=Object.keys(ws.locks.sites).length+Object.keys(ws.locks.seats).length;
  let h='<section class="card" id="schedule-card"><div class="card-head"><div><div class="kicker">'+esc(t('kSched'))+'</div><h2 class="ctitle">'+esc(ws.name)+' · '+esc(fmtDS(C.map.start))+' – '+esc(fmtDS(C.map.end))+'</h2></div>'
    +'<div class="row noprint">'+(nPins?'<span class="chip">'+ic('ic-lock')+esc(t('nPins',{n:nPins}))+'</span><button class="linkbtn" data-act="clearPins">'+esc(t('clearPins'))+'</button>':'')
    +(D&&!stale?'<button class="linkbtn" data-act="lockAll">'+ic('ic-lock')+esc(t('lockAll'))+'</button>':'')
    +'<div class="seg" role="group">'+[['agenda','ic-list'],['matrix','ic-grid'],['calendar','ic-cal']].map(([k,i])=>'<button class="'+(lay===k?'on':'')+'" data-act="layout" data-v="'+k+'">'+ic(i)+esc(t(k))+'</button>').join('')+'</div></div></div>';
  if(stale&&D&&!a.solving)h+='<div class="banner stale noprint">'+ic('ic-info')+'<span class="grow">'+esc(t('stale'))+'</span><button class="btn sm" data-act="solve">'+ic('ic-wand')+esc(t('resolve'))+'</button></div>';
  if(C.warn.length){
    h+='<details class="issues noprint" '+(D?'':'open')+'><summary>'+ic('ic-info')+esc(t('preflight'))+' <span class="chip warn">'+C.warn.length+'</span>'+ic('ic-chev','chev')+'</summary><div class="issue-list">'
      +C.warn.map(w=>'<div class="issue pre warn">'+ic('ic-alert')+'<span>'+esc(warnText(w))+'</span></div>').join('')+'</div></details>';
  }
  if(D&&!stale&&D.iss.length){
    const order={error:0,warn:1,info:2};
    const iss=D.iss.slice().sort((x,y)=>order[x.sev]-order[y.sev]);
    const nE=iss.filter(x=>x.sev!=='info').length;
    h+='<details class="issues noprint"'+(a.issuesOpen?' open':'')+' id="issuesBox"><summary data-act="issuesToggle">'+ic('ic-alert')+esc(t('issues'))+' <span class="chip '+(nE?'bad':'')+'">'+iss.length+'</span>'+ic('ic-chev','chev')+'</summary><div class="issue-list">'
      +iss.slice(0,300).map(x=>{const di=issueDay(x,D);return '<div class="issue '+x.sev+'" data-act="gotoDay" data-iso="'+(di||'')+'">'+ic(x.sev==='info'?'ic-info':'ic-alert')+'<span>'+esc(issueText(x,D))+'</span></div>'}).join('')+'</div></details>';
  }
  if(!D){
    h+='<div class="empty-state">'+ic('ic-cal','bigic')+'<h3 class="ctitle">'+esc(C.P.V?t('noPlan'):t('nothing'))+'</h3><p>'+esc(t('noPlanTxt'))+'</p>'+(C.P.V?'<button class="btn primary" data-act="solve">'+ic('ic-wand')+esc(t('solve'))+'</button>':'')+'</div>';
    return h+'</section>';
  }
  if(!D.m.visits.length){h+='<div class="empty-state">'+ic('ic-cal','bigic')+'<h3 class="ctitle">'+esc(t('nothing'))+'</h3><p>'+esc(t('w_nodays'))+'</p></div>';return h+'</section>'}
  if(lay==='matrix')h+=matrixHTML(D);
  else if(lay==='calendar')h+=calendarHTML(D);
  else h+=agendaHTML(D);
  h+='<p class="quiet noprint">'+ic('ic-info')+esc(t('hoverTrace'))+'</p>';
  return h+'</section>';
}
function pillHTML(p,z,role,D,d,locked){
  const pid=p.id;const fl=D.flagged.has(pid+'|'+d);
  return '<button class="pill'+(fl?' flagged':'')+'" style="--c:'+esc(role.color)+'" data-act="xseat" data-z="'+z+'" data-pid="'+esc(pid)+'">'+esc(p.name)+(locked?ic('ic-lock','pinic'):'')+'</button>';
}
function agendaHTML(D){
  const a=A(),ws=a.ws,m=D.m,r=D.r;
  const roles=m.roles.map(id=>roleOf(id)).filter(Boolean);
  let h='<div class="tblwrap"><table class="sched'+(a.animate?' anim':'')+'"><thead><tr><th>#</th><th>'+esc(t('site'))+'</th>'+roles.map(ro=>'<th><span class="rolecol"><span class="dot" style="--c:'+esc(ro.color)+'"></span>'+esc(ro.name)+'</span></th>').join('')+'</tr></thead>';
  m.days.forEach((dd,d)=>{
    const vs=D.byDay[d];
    const foc=dd.focus==='near'?t('fNear'):dd.focus==='far'?t('fFar'):(catOf(dd.focus)?catOf(dd.focus).name:'');
    const km=sum(vs.map(v=>{const s=D.siteOfV(v);return s?+s.km:0}));
    h+='<tbody class="dayg" id="day-'+dd.iso+'" style="--i:'+Math.min(d,14)+'"><tr class="dayhead"><td colspan="'+(2+roles.length)+'"><span class="dh"><b>'+esc(arr('dows')[dowOf(dd.iso)])+'</b> '+esc(fmtDS(dd.iso))+'</span><span class="dhmeta">'+esc(t('nVisits',{n:vs.length}))+' · '+r1(km)+' '+unitL()+(foc?' · '+esc(t('focus'))+': '+esc(foc):'')+'</span></td></tr>';
    vs.forEach(v=>{
      const vis=m.visits[v],s=D.siteOfV(v),cat=s?catOf(s.cat):null;
      const lockedS=!!ws.locks.sites[vis.key];
      h+='<tr><td class="vnum">'+(vis.k+1)+'</td><td><button class="sitebtn" data-act="xvisit" data-v="'+v+'"><span class="fname">'+(s?esc(s.name):'<i class="muted">'+esc(t('open'))+'</i>')+(lockedS?' '+ic('ic-lock','pinic'):'')+'</span><span class="submeta">'+ctag(cat)+(s?'<span>'+r1(+s.km)+' '+unitL()+'</span>'+(s.zone?'<span>'+esc(s.zone)+'</span>':''):'')+'</span></button></td>';
      roles.forEach((ro,ri)=>{
        let cell='';
        for(let z=vis.z0;z<vis.z0+vis.zn;z++){
          const st=m.seats[z];if(st.r!==ri||!r.stats.active[z])continue;
          const p=D.personOfZ(z);const lk=ws.locks.seats[st.key];
          if(p)cell+=pillHTML(p,z,ro,D,d,!!lk);
          else cell+='<button class="pill open'+(lk==='__open'?' forced':'')+'" data-act="xseat" data-z="'+z+'">'+esc(t('open'))+(lk?ic('ic-lock','pinic'):'')+'</button>';
        }
        h+='<td><div class="team">'+(cell||'<span class="muted tiny">—</span>')+'</div></td>';
      });
      h+='</tr>';
    });
    h+='</tbody>';
  });
  return h+'</table></div>';
}
function matrixHTML(D){
  const a=A(),ws=a.ws,m=D.m,r=D.r;
  const roles=m.roles.map(id=>roleOf(id)).filter(Boolean);
  let h='<div class="tblwrap"><table class="mtx"><thead><tr><th class="who"></th>'+m.days.map(dd=>'<th>'+esc(arr('dows')[dowOf(dd.iso)])+'<b>'+pISO(dd.iso).getDate()+'</b></th>').join('')+'<th>'+esc(t('total'))+'</th></tr></thead><tbody>';
  const seen=new Set();
  roles.forEach(ro=>{
    const ppl=m.people.map(id=>byId(ws.people,id)).filter(p=>p&&p.roles.includes(ro.id)&&!seen.has(p.id));
    if(!ppl.length)return;
    h+='<tr class="grp"><td colspan="'+(m.days.length+2)+'"><span class="rolecol"><span class="dot" style="--c:'+esc(ro.color)+'"></span>'+esc(ro.name)+'</span></td></tr>';
    ppl.forEach(p=>{
      seen.add(p.id);
      h+='<tr><td class="who"><span class="pill" style="--c:'+esc(ro.color)+'" data-pid="'+esc(p.id)+'">'+esc(p.name)+'</span></td>';
      m.days.forEach((dd,d)=>{
        const zs=D.pd[p.id+'|'+d]||[];
        const na=!p.days[dowOf(dd.iso)]||p.off.includes(dd.iso);
        const fl=D.flagged.has(p.id+'|'+d);
        h+='<td class="mcell'+(na?' na':'')+'">'+zs.map(z=>{const v=m.seats[z].v,s=D.siteOfV(v);return '<span class="mb'+(fl?' flag':'')+'" style="--c:'+esc(s?catColor(s.cat):'#999')+'" data-act="xseat" data-z="'+z+'" title="'+esc((s?s.name:'—')+' · '+fmtD(dd.iso))+'">'+esc(s?s.name:'—')+'</span>'}).join('')+'</td>';
      });
      const ld=D.loads[p.id]||0,tg=D.targets[p.id]||0;
      h+='<td class="mtot">'+ld+' <small>/ '+r1(tg)+'</small></td></tr>';
    });
  });
  return h+'</tbody></table></div>';
}
function calendarHTML(D){
  const a=A(),ws=a.ws,m=D.m;
  const w0=ws.rules.weekStart;
  const st=weekStartOf(m.start,w0);let en=m.end;while((dowOf(en)-w0+7)%7!==6)en=addISO(en,1);
  const dix={};m.days.forEach((d,i)=>dix[d.iso]=i);
  let h='<div class="cal">';
  for(let k=0;k<7;k++)h+='<div class="cdow">'+esc(arr('dows')[(w0+k)%7])+'</div>';
  daysIn(st,en).forEach(iso=>{
    const inR=iso>=m.start&&iso<=m.end,d=dix[iso];
    h+='<div class="cday'+(inR?'':' out')+(d==null&&inR?' offd':'')+'"><div class="cn">'+pISO(iso).getDate()+(d!=null?'<small>'+D.byDay[d].length+'</small>':'')+'</div>';
    if(d!=null)D.byDay[d].forEach(v=>{
      const s=D.siteOfV(v),vis=m.visits[v];
      const names=[];for(let z=vis.z0;z<vis.z0+vis.zn;z++){const p=D.personOfZ(z);if(p&&D.r.stats.active[z])names.push(p.name)}
      h+='<div class="cv" style="--c:'+esc(s?catColor(s.cat):'#999')+'" data-act="xvisit" data-v="'+v+'" title="'+esc((s?s.name:'—')+' — '+names.join(', '))+'">'+esc(s?s.name:t('open'))+'<small>'+esc(names.join(', '))+'</small></div>';
    });
    h+='</div>';
  });
  return h+'</div>';
}

function explainPop(q){
  const a=A(),ws=a.ws,D=derive();
  if(!D)return '';
  const m=D.m;
  const x=q.res;
  let h='<div class="pophead"><div><div class="kicker">'+esc(t('why'))+'</div>';
  const termChips=terms=>{const ks=Object.keys(terms||{}).filter(k=>Math.abs(terms[k])>=.05).sort((p,q)=>Math.abs(terms[q])-Math.abs(terms[p])).slice(0,4);
    return ks.length?'<div class="terms">'+ks.map(k=>'<span class="tchip '+(terms[k]>0?'up':'dn')+'">'+esc(t('term_'+k))+' '+(terms[k]>0?'+':'')+fmtN(terms[k])+'</span>').join('')+'</div>':''};
  const dl=v=>{if(v==null)return '';if(Math.abs(v)<.05)return '<span class="delta">±0</span>';return '<span class="delta '+(v>0?'up':'dn')+'">'+(v>0?'+':'')+fmtN(v)+'</span>'};
  if(q.seat!=null){
    const z=q.seat,st=m.seats[z],vis=m.visits[st.v],s=D.siteOfV(st.v),ro=roleOf(m.roles[st.r]);
    const lk=ws.locks.seats[st.key];
    h+='<h3 class="ctitle">'+esc(ro?ro.name:'')+' · '+esc(s?s.name:'—')+'</h3><div class="tiny muted">'+esc(fmtDL(m.days[vis.d].iso))+'</div></div><button class="ibtn" data-act="popClose">'+ic('ic-x')+'</button></div>';
    h+='<div class="row" style="margin-bottom:10px">'+(lk?'<button class="btn sm" data-act="unpinSeat" data-z="'+z+'">'+ic('ic-lock')+esc(t('unpin'))+'</button>':'<button class="btn sm" data-act="pinSeat" data-z="'+z+'">'+ic('ic-lock')+esc(t('pin'))+'</button>')
      +(lk!=='__open'?'<button class="btn sm ghost" data-act="openSeat" data-z="'+z+'">'+esc(t('leaveOpen'))+'</button>':'')+'</div>';
    h+='<div class="mlab">'+esc(t('alts'))+'</div>';
    if(!x){h+='<div class="muted tiny">'+esc(t('explainStale'))+'</div>';return h}
    x.slice(0,40).forEach(o=>{
      const p=o.p>=0?byId(ws.people,m.people[o.p]):null;
      const nm=o.p<0?t('openSeat'):(p?p.name:'—');
      const ld=o.p>=0&&p?(D.loads[p.id]||0)+'/'+r1(D.targets[p.id]||0):'';
      h+='<div class="alt'+(o.current?' cur':'')+(o.blocked?' blk':'')+'"><div class="an"><span>'+esc(nm)+'</span>'+(ld?'<span class="mono tiny muted">'+ld+'</span>':'')+(o.current?'<span class="chip">'+esc(t('current'))+'</span>':'')+'</div>'
        +(o.blocked?'<span class="tiny muted">'+esc(o.blocked==='unavail'?t('blockedUn'):t('blockedIn'))+'</span><span></span>':dl(o.current?null:o.delta)+(o.current?'<span></span>':'<button class="btn sm" data-act="useSeat" data-z="'+z+'" data-p="'+o.p+'">'+esc(t('use'))+'</button>'))
        +(o.blocked||o.current?'':termChips(o.terms))+'</div>';
    });
  }else{
    const v=q.visit,vis=m.visits[v],s=D.siteOfV(v),lk=ws.locks.sites[vis.key];
    h+='<h3 class="ctitle">'+esc(s?s.name:t('open'))+'</h3><div class="tiny muted">'+esc(fmtDL(m.days[vis.d].iso))+' · #'+(vis.k+1)+'</div></div><button class="ibtn" data-act="popClose">'+ic('ic-x')+'</button></div>';
    h+='<div class="row" style="margin-bottom:10px">'+(lk?'<button class="btn sm" data-act="unpinVisit" data-v="'+v+'">'+ic('ic-lock')+esc(t('unpin'))+'</button>':(s?'<button class="btn sm" data-act="pinVisit" data-v="'+v+'">'+ic('ic-lock')+esc(t('pin'))+'</button>':''))+'</div>';
    h+='<div class="mlab">'+esc(t('alts'))+'</div>';
    if(!x){h+='<div class="muted tiny">'+esc(t('explainStale'))+'</div>';return h}
    x.slice(0,40).forEach(o=>{
      const st=byId(ws.sites,m.sites[o.s]);const cat=st?catOf(st.cat):null;
      h+='<div class="alt'+(o.current?' cur':'')+'"><div class="an"><span class="dot" style="--c:'+esc(cat?cat.color:'#999')+'"></span><span>'+esc(st?st.name:'—')+'</span><span class="mono tiny muted">'+(st?r1(+st.km)+' '+unitL():'')+' · '+(D.uses[st&&st.id]||0)+'×</span>'+(o.current?'<span class="chip">'+esc(t('current'))+'</span>':'')+'</div>'
        +(o.current?'<span></span><span></span>':dl(o.delta)+'<button class="btn sm" data-act="useVisit" data-v="'+v+'" data-s="'+o.s+'">'+esc(t('use'))+'</button>')
        +(o.current?'':termChips(o.terms))+'</div>';
    });
  }
  return h;
}

function dpkTrigger(target,iso,mode,icon){
  if(icon)return '<button class="dpk-trigger icon" data-act="dpk" data-target="'+esc(target)+'" title="'+esc(t('addDate'))+'">'+ic('ic-plus')+'</button>';
  const d=pISO(iso);
  const lbl=mode==='month'?arr('monthsL')[d.getMonth()]+' '+d.getFullYear():fmtDL(iso);
  return '<button class="dpk-trigger" data-act="dpk" data-target="'+esc(target)+'" data-iso="'+esc(iso)+'">'+ic('ic-cal')+'<span class="dpk-val">'+esc(lbl)+'</span></button>';
}
function dpkHTML(st){
  const d=pISO(st.view);const y=d.getFullYear(),mo=d.getMonth();
  const w0=A().ws.rules.weekStart;
  const first=new Date(y,mo,1);const lead=(first.getDay()-w0+7)%7;
  let h='<div class="dpk-head"><button class="dpk-nav" data-act="dpkNav" data-d="-1">'+ic('ic-chevl','flip')+'</button><div class="dpk-title">'+esc(arr('monthsL')[mo]+' '+y)+'</div><button class="dpk-nav" data-act="dpkNav" data-d="1">'+ic('ic-chevr','flip')+'</button></div><div class="dpk-grid">';
  for(let k=0;k<7;k++)h+='<div class="dpk-dow">'+esc(arr('dows1')[(w0+k)%7])+'</div>';
  const td=todayISO();
  for(let i=0;i<42;i++){
    const dt=new Date(y,mo,1-lead+i),iso=fISO(dt);
    const cls=['dpk-day'];if(dt.getMonth()!==mo)cls.push('mute');if(iso===td)cls.push('today');if(iso===st.sel)cls.push('sel');if(st.marks&&st.marks.includes(iso))cls.push('mark');
    if(st.range&&iso>=st.range[0]&&iso<=st.range[1]&&iso!==st.sel)cls.push('inr');
    h+='<button class="'+cls.join(' ')+'" data-act="dpkPick" data-iso="'+iso+'">'+dt.getDate()+'</button>';
    if(i===34&&new Date(y,mo,1-lead+35).getMonth()!==mo)break;
  }
  h+='</div><div class="dpk-foot"><button class="linkbtn" data-act="dpkPick" data-iso="'+td+'">'+esc(t('thisW'))+'</button><button class="linkbtn" data-act="popClose">'+esc(t('close'))+'</button></div>';
  return h;
}

function pager(total,page,per,act){
  const pages=Math.ceil(total/per);if(pages<=1)return '';
  return '<div class="pgn"><button class="ibtn" data-act="'+act+'" data-p="'+(page-1)+'" '+(page<=0?'disabled':'')+'>'+ic('ic-chevl','flip')+'</button><span class="mono tiny">'+(page+1)+' / '+pages+'</span><button class="ibtn" data-act="'+act+'" data-p="'+(page+1)+'" '+(page>=pages-1?'disabled':'')+'>'+ic('ic-chevr','flip')+'</button></div>';
}
function dateChips(list,act,id){
  const max=3;const l=list.slice().sort();
  return '<div class="offs">'+l.slice(0,max).map(iso=>'<span class="offchip">'+esc(fmtDS(iso))+'<button data-act="'+act+'" data-id="'+esc(id)+'" data-iso="'+iso+'" aria-label="'+esc(t('remove'))+'">'+ic('ic-x')+'</button></span>').join('')+(l.length>max?'<span class="more" title="'+esc(l.slice(max).map(fmtDS).join(', '))+'">+'+(l.length-max)+'</span>':'')+'</div>';
}
function sitesView(){
  const a=A(),ws=a.ws,D=derive(),stale=a.isStale();
  const q=(a.f.siteQ||'').trim().toLowerCase(),fc=a.f.siteCat||'all';
  const counts={};ws.sites.forEach(s=>counts[s.cat]=(counts[s.cat]||0)+1);
  const fl=a.f.siteLoc||'';
  let list=ws.sites.filter(s=>(fc==='all'||s.cat===fc)&&(!fl||s.loc===fl)&&(!q||s.name.toLowerCase().includes(q)||(s.tag||'').toLowerCase().includes(q)||((locOf(s.loc)||{}).name||'').toLowerCase().includes(q)));
  const per=40,pages=Math.max(1,Math.ceil(list.length/per));a.f.sitePage=clamp(a.f.sitePage||0,0,pages-1);
  const page=list.slice(a.f.sitePage*per,(a.f.sitePage+1)*per);
  let h='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kList'))+'</div><h2 class="ctitle">'+esc(t('tabSites'))+' <span class="muted mono tiny">'+ws.sites.length+'</span></h2></div>'
    +'<div class="row"><button class="btn primary sm" data-act="addSite">'+ic('ic-plus')+esc(t('addSite'))+'</button><button class="btn sm" data-act="csvImport" data-kind="sites">'+ic('ic-up')+esc(t('importCsv'))+'</button><button class="btn sm ghost" data-act="csvTpl" data-kind="sites">'+esc(t('template'))+'</button><button class="btn sm ghost" data-act="csvExport" data-kind="sites">'+ic('ic-down')+esc(t('exportCsv'))+'</button></div></div>';
  h+='<div class="toolbar"><label class="search">'+ic('ic-search')+'<input class="inp slim" type="search" placeholder="'+esc(t('search'))+'" data-bind="siteQ" value="'+esc(a.f.siteQ||'')+'"></label>'
    +'<button class="fchip'+(fc==='all'?' on':'')+'" data-act="siteCat" data-v="all">'+esc(t('all'))+' <small>'+ws.sites.length+'</small></button>'
    +ws.categories.map(c=>'<button class="fchip'+(fc===c.id?' on':'')+'" data-act="siteCat" data-v="'+esc(c.id)+'"><span class="dot" style="--c:'+esc(c.color)+'"></span>'+esc(c.name)+' <small>'+(counts[c.id]||0)+'</small></button>').join('')
    +((ws.locations||[]).length?dd('siteLoc','',fl,[['',t('allLocs')]].concat(locOpts().slice(1)),{search:true,cls:'fdd'}):'')+'</div>';
  if(!ws.sites.length){h+='<div class="empty-state">'+ic('ic-build','bigic')+'<p>'+esc(t('noSites'))+'</p></div></section>';return h}
  const catOpts=ws.categories.map(c=>[c.id,c.name+(c.planned?'':' ('+t('unplanned')+')'),c.color]);
  const lo=locOpts();
  h+='<div class="tblwrap"><table class="ledger"><thead><tr><th>'+esc(t('active'))+'</th><th>'+esc(t('name'))+'</th><th>'+esc(t('category'))+'</th><th>'+esc(t('location'))+'</th><th>'+esc(t('dist'))+'</th><th>'+esc(t('crit'))+'</th><th>'+esc(t('tag'))+'</th><th>'+esc(t('weight'))+'</th><th>'+esc(t('minMax'))+'</th><th>'+esc(t('days'))+'</th><th>'+esc(t('blackout'))+'</th><th>'+esc(t('used'))+'</th><th></th></tr></thead><tbody>';
  if(!page.length)h+='<tr><td colspan="13" class="empty">'+esc(t('noMatch'))+'</td></tr>';
  page.forEach(s=>{
    const cat=catOf(s.cat);const u=D&&!stale?(D.uses[s.id]||0):null;
    const sa='data-id="'+esc(s.id)+'"';
    h+='<tr class="'+(s.active?'':'inactive')+'" data-id="'+esc(s.id)+'"><td>'+swBtn(s.active,'siteActive',sa,true)+'</td>'
      +'<td class="nm"><input class="inp bare" data-bind="site" '+sa+' data-f="name" value="'+esc(s.name)+'" aria-label="'+esc(t('name'))+'"></td>'
      +'<td>'+dd('site',sa+' data-f="cat"',s.cat,catOpts)+'</td>'
      +'<td>'+dd('site',sa+' data-f="loc"',s.loc,lo,{search:true})+'</td>'
      +'<td>'+(s.loc?'<span class="mono tiny kmro">'+r1(s.km)+' '+unitL()+'</span>':'<span class="numwrap"><input class="inp num s" type="number" min="0" step="0.5" data-bind="site" '+sa+' data-f="km" value="'+s.km+'"><span class="unit">'+unitL()+'</span></span>')+'</td>'
      +'<td>'+dd('site',sa+' data-f="crit"',s.crit,lvlOpts(),{cls:'lvdd l'+s.crit})+'</td>'
      +'<td><input class="inp slim" style="width:104px" data-bind="site" '+sa+' data-f="tag" value="'+esc(s.tag||'')+'" placeholder="—"></td>'
      +'<td><span class="numwrap"><input type="range" class="rng sm" min="0.1" max="3" step="0.05" value="'+s.weight+'" style="--fill:'+fill(s.weight,.1,3)+'" data-bind="site" data-id="'+esc(s.id)+'" data-f="weight"><span class="mono tiny">'+(+s.weight).toFixed(2)+'</span></span></td>'
      +'<td><span class="numwrap"><input class="inp num s" type="number" min="0" placeholder="—" data-bind="site" data-id="'+esc(s.id)+'" data-f="minV" value="'+s.minV+'"><input class="inp num s" type="number" min="0" placeholder="—" data-bind="site" data-id="'+esc(s.id)+'" data-f="maxV" value="'+s.maxV+'"></span></td>'
      +'<td>'+wdChips(s.days,'siteDay','data-id="'+esc(s.id)+'"')+'</td>'
      +'<td><div class="row" style="gap:5px;flex-wrap:nowrap">'+dateChips(s.blackout,'siteBlackoutDel',s.id)+dpkTrigger('siteBlackout:'+s.id,null,null,true)+'</div></td>'
      +'<td>'+(u==null?'<span class="muted">—</span>':'<span class="mono">'+u+'×</span>')+'</td>'
      +'<td><button class="ibtn" data-act="delSite" data-id="'+esc(s.id)+'" title="'+esc(t('remove'))+'">'+ic('ic-trash')+'</button></td></tr>';
  });
  h+='</tbody></table></div>'+pager(list.length,a.f.sitePage,per,'sitePage');
  h+='<p class="quiet">'+ic('ic-info')+esc(t('sitesNote'))+' CSV: name, category, location, '+esc(ws.unit)+', crit, tag, weight, min, max, days(7×1/0), blackout(|), active.</p></section>';
  return h+locationsCard();
}
function locationsCard(){
  const a=A(),ws=a.ws,L0=ws.locations||[];
  const cs={},cp={};ws.sites.forEach(s=>{if(s.loc)cs[s.loc]=(cs[s.loc]||0)+1});ws.people.forEach(p=>{if(p.homeLoc)cp[p.homeLoc]=(cp[p.homeLoc]||0)+1});
  const list=L0.slice().sort((x,y)=>x.km-y.km||x.name.localeCompare(y.name));
  const mx=Math.max(10,...list.map(l=>l.km));
  let h='<section class="card" id="locations-card"><div class="card-head"><div><div class="kicker">'+esc(t('kLoc'))+'</div><h2 class="ctitle">'+esc(t('locT'))+' <span class="muted mono tiny">'+L0.length+'</span></h2></div><div class="row"><button class="btn sm" data-act="addLoc">'+ic('ic-plus')+esc(t('addLoc'))+'</button><button class="btn sm ghost" data-act="csvImport" data-kind="locations">'+ic('ic-up')+esc(t('importCsv'))+'</button></div></div>';
  if(!L0.length){h+='<div class="goal-empty">'+ic('ic-pin')+'<span>'+esc(t('noLocs'))+'</span></div></section>';return h}
  h+='<div class="locgrid">'+list.map(l=>'<div class="locitem'+(l.unknown?' unk':'')+'"><input class="inp bare" data-bind="loc" data-id="'+esc(l.id)+'" data-f="name" value="'+esc(l.name)+'"><span class="numwrap"><input class="inp num s" type="number" min="0" step="1" data-bind="loc" data-id="'+esc(l.id)+'" data-f="km" value="'+l.km+'"><span class="unit">'+unitL()+'</span></span><div class="locbar"><i style="width:'+(l.km/mx*100)+'%"></i></div><span class="mono tiny muted" title="'+esc(t('locUse'))+'">'+(cs[l.id]||0)+' · '+(cp[l.id]||0)+'</span><button class="ibtn" data-act="delLoc" data-id="'+esc(l.id)+'">'+ic('ic-trash')+'</button></div>').join('')+'</div>'
    +'<p class="quiet">'+ic('ic-info')+esc(t('locNote'))+'</p></section>';
  return h;
}
function tokenBox(list,act,id,field,opts,labelOf){
  let h='<div class="tokens">'+list.map(x=>'<span class="token">'+esc(labelOf(x))+'<button data-act="'+act+'" data-id="'+esc(id)+'" data-f="'+field+'" data-v="'+esc(x)+'">'+ic('ic-x')+'</button></span>').join('');
  const rest=opts.filter(o=>!list.includes(o.id));
  if(rest.length)h+=dd('tokenAdd','data-id="'+esc(id)+'" data-f="'+field+'"','',rest.map(o=>[o.id,o.name]),{ph:'+ '+t('addEllipsis'),cls:'adddd'});
  return h+'</div>';
}
function peopleView(){
  const a=A(),ws=a.ws,D=derive(),stale=a.isStale();
  const q=(a.f.peopleQ||'').trim().toLowerCase(),fr=a.f.peopleRole||'all';
  const counts={};ws.people.forEach(p=>p.roles.forEach(r=>counts[r]=(counts[r]||0)+1));
  const list=ws.people.filter(p=>(fr==='all'||p.roles.includes(fr))&&(!q||p.name.toLowerCase().includes(q)));
  let h='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kList'))+'</div><h2 class="ctitle">'+esc(t('tabPeople'))+' <span class="muted mono tiny">'+ws.people.length+'</span></h2></div>'
    +'<div class="row"><button class="btn primary sm" data-act="addPerson">'+ic('ic-plus')+esc(t('addPerson'))+'</button><button class="btn sm" data-act="csvImport" data-kind="people">'+ic('ic-up')+esc(t('importCsv'))+'</button><button class="btn sm ghost" data-act="csvTpl" data-kind="people">'+esc(t('template'))+'</button><button class="btn sm ghost" data-act="csvExport" data-kind="people">'+ic('ic-down')+esc(t('exportCsv'))+'</button></div></div>';
  h+='<div class="toolbar"><label class="search">'+ic('ic-search')+'<input class="inp slim" type="search" placeholder="'+esc(t('search'))+'" data-bind="peopleQ" value="'+esc(a.f.peopleQ||'')+'"></label>'
    +'<button class="fchip'+(fr==='all'?' on':'')+'" data-act="peopleRole" data-v="all">'+esc(t('all'))+' <small>'+ws.people.length+'</small></button>'
    +ws.roles.map(r=>'<button class="fchip'+(fr===r.id?' on':'')+'" data-act="peopleRole" data-v="'+esc(r.id)+'"><span class="dot" style="--c:'+esc(r.color)+'"></span>'+esc(r.name)+' <small>'+(counts[r.id]||0)+'</small></button>').join('')+'</div>';
  if(!ws.people.length){h+='<div class="empty-state">'+ic('ic-users','bigic')+'<p>'+esc(t('noPeople'))+'</p></div></section>';return h}
  const maxLoad=D&&!stale?Math.max(1,...Object.values(D.loads),...Object.values(D.targets).map(Math.ceil)):1;
  const pc=ws.categories.filter(c=>c.planned);
  h+='<div class="tblwrap"><table class="ledger"><thead><tr><th>'+esc(t('active'))+'</th><th>'+esc(t('name'))+'</th><th>'+esc(t('roles'))+'</th><th>'+esc(t('rank'))+'</th><th>'+esc(t('home'))+'</th><th>'+esc(t('pref'))+'</th><th>'+esc(t('weight'))+'</th><th>'+esc(t('days'))+'</th><th>'+esc(t('offDays'))+'</th><th>'+esc(t('limits'))+'</th><th>'+esc(t('load'))+'</th><th></th></tr></thead><tbody>';
  if(!list.length)h+='<tr><td colspan="12" class="empty">'+esc(t('noMatch'))+'</td></tr>';
  list.forEach(p=>{
    const open=a.f.drawer===p.id;
    const ld=D&&!stale?D.loads[p.id]:null,tg=D&&!stale?D.targets[p.id]:null;
    const c=p.roles.length?roleOf(p.roles[0]).color:'#999';
    h+='<tr class="'+(p.active?'':'inactive')+'"><td>'+swBtn(p.active,'personActive','data-id="'+esc(p.id)+'"',true)+'</td>'
      +'<td class="nm"><input class="inp bare" data-bind="person" data-id="'+esc(p.id)+'" data-f="name" value="'+esc(p.name)+'" aria-label="'+esc(t('name'))+'"></td>'
      +'<td><div class="rolechips">'+ws.roles.map(r=>'<button class="rchip'+(p.roles.includes(r.id)?' on':'')+'" style="--c:'+esc(r.color)+'" data-act="personRole" data-id="'+esc(p.id)+'" data-r="'+esc(r.id)+'">'+esc(r.name)+'</button>').join('')+(p.roles.length?'':'<span class="chip bad">'+esc(t('noRoleWarn'))+'</span>')+'</div></td>'
      +'<td><div class="rankcell">'+dd('person','data-id="'+esc(p.id)+'" data-f="rank"',p.rank,lvlOpts(),{cls:'lvdd l'+p.rank,title:t('rankAll')})+(pc.length>1?pc.map(c=>{const v=p.rankBy[c.id];return dd('rankBy','data-id="'+esc(p.id)+'" data-c="'+esc(c.id)+'"',v==null?'':v,[['',t('inherit')+' ('+p.rank+')']].concat(lvlOpts()),{cls:'lvdd mini'+(v==null?' inh':' l'+v),title:c.name,ph:v==null?c.name.slice(0,1)+'·'+p.rank:null})}).join(''):'')+'</div></td>'
      +'<td>'+((ws.locations||[]).length?dd('person','data-id="'+esc(p.id)+'" data-f="homeLoc"',p.homeLoc,locOpts(t('customKm')),{search:true})+(p.homeLoc?'':'<span class="numwrap"><input class="inp num s" type="number" min="0" step="0.5" data-bind="person" data-id="'+esc(p.id)+'" data-f="home" value="'+p.home+'"><span class="unit">'+unitL()+'</span></span>'):'<span class="numwrap"><input class="inp num s" type="number" min="0" step="0.5" data-bind="person" data-id="'+esc(p.id)+'" data-f="home" value="'+p.home+'"><span class="unit">'+unitL()+'</span></span>')+'</td>'
      +'<td>'+dd('person','data-id="'+esc(p.id)+'" data-f="pref"',p.pref,[['none',t('prefNone')],['near',t('fNear')],['far',t('fFar')]])+'</td>'
      +'<td><span class="numwrap"><input type="range" class="rng sm" min="0.1" max="3" step="0.05" value="'+p.weight+'" style="--fill:'+fill(p.weight,.1,3)+'" data-bind="person" data-id="'+esc(p.id)+'" data-f="weight"><span class="mono tiny">'+(+p.weight).toFixed(2)+'</span></span></td>'
      +'<td>'+wdChips(p.days,'personDay','data-id="'+esc(p.id)+'"')+'</td>'
      +'<td><div class="row" style="gap:5px;flex-wrap:nowrap">'+dateChips(p.off,'personOffDel',p.id)+dpkTrigger('personOff:'+p.id,null,null,true)+'</div></td>'
      +'<td><span class="numwrap"><input class="inp num s" type="number" min="0" placeholder="∞" data-bind="person" data-id="'+esc(p.id)+'" data-f="maxLoad" value="'+p.maxLoad+'"><input class="inp num s" type="number" min="0" placeholder="∞" data-bind="person" data-id="'+esc(p.id)+'" data-f="maxWeek" value="'+p.maxWeek+'"></span></td>'
      +'<td>'+(ld==null?'<span class="muted">—</span>':'<div class="usebar" title="'+ld+' / '+r1(tg||0)+'"><b>'+ld+'</b><div class="bar'+(tg!=null&&ld>tg+1.01?' over':'')+'" style="--c:'+esc(c)+'"><i style="width:'+(ld/maxLoad*100)+'%"></i>'+(tg!=null?'<span class="tick" style="--t:'+(tg/maxLoad*100)+'%"></span>':'')+'</div></div>')+'</td>'
      +'<td><div class="row" style="gap:2px;flex-wrap:nowrap"><button class="ibtn'+(open?' on':'')+'" data-act="drawer" data-id="'+esc(p.id)+'" title="'+esc(t('details'))+'">'+ic('ic-chev')+'</button><button class="ibtn" data-act="delPerson" data-id="'+esc(p.id)+'" title="'+esc(t('remove'))+'">'+ic('ic-trash')+'</button></div></td></tr>';
    if(open){
      const others=ws.people.filter(x=>x.id!==p.id).map(x=>({id:x.id,name:x.name}));
      const sites=ws.sites.map(x=>({id:x.id,name:x.name}));
      const pn=id=>{const x=byId(ws.people,id);return x?x.name:'—'},sn=id=>{const x=byId(ws.sites,id);return x?x.name:'—'};
      h+='<tr class="drawer"><td colspan="12"><div class="drawer-grid">'
        +'<div><span class="lbl">'+esc(t('avoidWith'))+'</span>'+tokenBox(p.avoid,'tokenDel',p.id,'avoid',others,pn)+'</div>'
        +'<div><span class="lbl">'+esc(t('pairWith'))+'</span>'+tokenBox(p.pair,'tokenDel',p.id,'pair',others,pn)+'</div>'
        +'<div><span class="lbl">'+esc(t('likes'))+'</span>'+tokenBox(p.likes,'tokenDel',p.id,'likes',sites,sn)+'</div>'
        +'<div><span class="lbl">'+esc(t('bans'))+'</span>'+tokenBox(p.bans,'tokenDel',p.id,'bans',sites,sn)+'</div>'
        +'</div></td></tr>';
    }
  });
  h+='</tbody></table></div><p class="quiet">'+ic('ic-info')+esc(t('peopleNote'))+' CSV: name, roles(|), rank, home, pref, weight, days(7×1/0), off(|), max, max_week, active.</p></section>';
  return h;
}

function rulesView(){
  const a=A(),ws=a.ws;
  const words=['visit','visits','site','sites','person','people'];
  const lng=L();
  let h='<div class="grid2"><section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kWords'))+'</div><h2 class="ctitle">'+esc(t('wordsT'))+'</h2></div>'
    +'<div class="row"><span class="lbl">'+esc(t('unit'))+'</span>'+dd('unit','',ws.unit,[['km','km'],['mi','mi']])+'</div></div>'
    +'<div class="words">'+words.map(w=>'<label><span class="lbl">'+esc(t('w_'+w))+'</span><input class="inp slim" data-bind="term" data-f="'+w+'" value="'+esc(ws.terms[lng][w])+'"></label>').join('')+'</div>'
    +'<p class="quiet">'+ic('ic-globe')+esc(t('wordsNote'))+' ('+(lng==='ar'?'العربية':'English')+')</p></section>';
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kRoles'))+'</div><h2 class="ctitle">'+esc(t('rolesT'))+'</h2></div><button class="btn sm" data-act="addRole">'+ic('ic-plus')+esc(t('addRole'))+'</button></div><div class="rolelist">'
    +ws.roles.map(r=>{const n=ws.people.filter(p=>p.roles.includes(r.id)).length;return '<div class="roleitem"><button class="colorpick" style="--c:'+esc(r.color)+'" data-act="color" data-kind="role" data-id="'+esc(r.id)+'" aria-label="colour"></button><input class="inp slim" data-bind="role" data-id="'+esc(r.id)+'" data-f="name" value="'+esc(r.name)+'"><span class="chip">'+esc(t('members',{n}))+'</span><button class="ibtn" data-act="delRole" data-id="'+esc(r.id)+'">'+ic('ic-trash')+'</button></div>'}).join('')
    +'</div><p class="quiet">'+ic('ic-info')+esc(t('rolesNote'))+'</p></section></div>';
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kCats'))+'</div><h2 class="ctitle">'+esc(t('catsT'))+'</h2></div><button class="btn sm" data-act="addCat">'+ic('ic-plus')+esc(t('addCat'))+'</button></div><div class="catlist">';
  const shareSum=sum(ws.categories.filter(c=>c.planned).map(c=>c.share))||1;
  ws.categories.forEach(c=>{
    const n=ws.sites.filter(s=>s.cat===c.id).length;
    h+='<div class="catitem'+(c.planned?'':' unpl')+'"><div class="cattop"><button class="colorpick" style="--c:'+esc(c.color)+'" data-act="color" data-kind="cat" data-id="'+esc(c.id)+'" aria-label="colour"></button><input class="inp slim" data-bind="cat" data-id="'+esc(c.id)+'" data-f="name" value="'+esc(c.name)+'"><span class="chip">'+esc(t('nSitesC',{n}))+'</span>'
      +'<span class="lbl">'+esc(t('planned'))+'</span>'+swBtn(c.planned,'catPlanned','data-id="'+esc(c.id)+'"',true)
      +'<button class="ibtn" data-act="delCat" data-id="'+esc(c.id)+'">'+ic('ic-trash')+'</button></div>';
    if(c.planned)h+='<div class="catstaff"><span class="lbl">'+esc(t('staff'))+'</span>'+ws.roles.map(r=>'<span class="sc"><span class="dot" style="--c:'+esc(r.color)+'"></span>'+esc(r.name)+stepper('catStaff','data-id="'+esc(c.id)+'" data-r="'+esc(r.id)+'"',c.staff[r.id]||0)+'</span>').join('')
      +'<span class="sc" style="margin-inline-start:auto"><span class="lbl">'+esc(t('share'))+'</span>'+stepper('catShare','data-id="'+esc(c.id)+'"',c.share)+'<span class="mono tiny muted">'+Math.round(c.share/shareSum*100)+'%</span></span></div>';
    h+='</div>';
  });
  h+='</div><p class="quiet">'+ic('ic-info')+esc(t('catsNote'))+'</p></section>';
  const w0=ws.rules.weekStart;
  const focusOpts=[['auto',t('fAuto')],['near',t('fNear')],['far',t('fFar')]].concat(ws.categories.filter(c=>c.planned).map(c=>[c.id,c.name]));
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kRhythm'))+'</div><h2 class="ctitle">'+esc(t('weekT'))+'</h2></div></div><div class="wkgrid">';
  for(let k=0;k<7;k++){const i=(w0+k)%7,d=ws.week[i];
    h+='<div class="wkcell'+(d.on?'':' off')+'"><div class="wktop"><span class="wkname">'+esc(arr('dows')[i])+'</span>'+swBtn(d.on,'weekOn','data-i="'+i+'"',true)+'</div>'
      +(d.on?stepper('weekN','data-i="'+i+'"',d.n)+dd('weekFocus','data-i="'+i+'"',d.focus,focusOpts,{cls:'full'}):'<span class="tiny muted">'+esc(t('dayOff'))+'</span>')+'</div>'}
  h+='</div><p class="quiet">'+ic('ic-info')+esc(t('weekNote'))+'</p></section>';
  const R=ws.rules;
  h+='<div class="grid2"><section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kRules'))+'</div><h2 class="ctitle">'+esc(t('hardT'))+'</h2></div></div><div class="setgrid">'
    +'<div class="setrow"><span class="rl">'+esc(t('perDay'))+'<small>'+esc(t('perDayN'))+'</small></span>'+stepper('ruleStep','data-k="perDay"',R.perDay)+'</div>'
    +'<div class="setrow"><span class="rl">'+esc(t('siteGap'))+'</span>'+stepper('ruleStep','data-k="siteGap"',R.siteGap)+'</div>'
    +'<div class="setrow"><span class="rl">'+esc(t('distinct'))+'</span>'+swBtn(R.distinct,'ruleToggle','data-k="distinct"')+'</div>'
    +'<div class="setrow"><span class="rl">'+esc(t('whenFail'))+'</span><div class="seg">'+['bend','strict'].map(k=>'<button class="'+(R.mode===k?'on':'')+'" data-act="ruleMode" data-v="'+k+'">'+esc(t(k))+'</button>').join('')+'</div></div>'
    +'<div class="setrow"><span class="rl">'+esc(t('nearKm'))+'</span><span class="numwrap"><input class="inp num" type="number" min="0" data-bind="rule" data-k="nearKm" value="'+R.nearKm+'"><span class="unit">'+unitL()+'</span></span></div>'
    +'<div class="setrow"><span class="rl">'+esc(t('weekStart'))+'</span>'+dd('rule','data-k="weekStart"',R.weekStart,[0,1,6].map(i=>[i,arr('dows')[i]]))+'</div>'
    +'</div></section>';
  h=h.replace('<div class="grid2"><section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kRules'))+'</div>',patternCard(R)+rankCard(R)+'<div class="grid2"><section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kRules'))+'</div>');
  const E=ws.engine;
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kEngine'))+'</div><h2 class="ctitle">'+esc(t('engineT'))+'</h2></div></div><div class="setgrid">'
    +'<div class="setrow"><span class="rl">'+esc(t('seed'))+'</span><input class="inp num" style="width:120px" type="number" min="1" data-bind="engine" data-k="seed" value="'+E.seed+'"><button class="ibtn" data-act="reroll">'+ic('ic-dice')+'</button></div>'
    +'<div class="setrow"><span class="rl">'+esc(t('quality'))+'</span><div class="seg">'+[['fast','qFast'],['balanced','qBal'],['thorough','qTh'],['max','qMax']].map(([k,l])=>'<button class="'+(E.quality===k?'on':'')+'" data-act="engQuality" data-v="'+k+'">'+esc(t(l))+'</button>').join('')+'</div></div>'
    +'<div class="setrow"><span class="rl">'+esc(t('runs'))+'</span>'+stepper('engRuns','',E.runs)+'</div>'
    +'<div class="setrow"><span class="rl">'+esc(t('live'))+'</span>'+swBtn(E.live,'engLive','')+'</div>'
    +'</div><p class="quiet">'+ic('ic-info')+esc(t('engineNote'))+'</p></section></div>';
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kWeights'))+'</div><h2 class="ctitle">'+esc(t('weightsT'))+'</h2></div><button class="linkbtn" data-act="restoreW">'+ic('ic-undo')+esc(t('restoreW'))+'</button></div><div>';
  M.WEIGHT_KEYS.forEach(k=>{const on=ws.useW[k],v=ws.weights[k];
    h+='<div class="wrow'+(on?'':' off')+'">'+swBtn(on,'useW','data-k="'+k+'"',true)+'<span class="wlab">'+esc(t('wt_'+k))+'</span><input type="range" class="rng" min="0" max="100" step="1" value="'+v+'" style="--fill:'+v+'%" data-bind="weight" data-k="'+k+'"><span class="wv">'+v+'</span></div>'});
  h+='</div><p class="quiet">'+ic('ic-info')+esc(t('weightsNote'))+'</p></section>';
  return h;
}

const PATTERNS=[['free',0,0],['alt',1,1],['alt2',1,2],['p21',2,1],['p22',2,2],['p31',3,1],['p52',5,2]];
function patternStrip(rm,om){
  let h='<div class="pstrip" aria-hidden="true">';
  if(!rm){for(let i=0;i<14;i++)h+='<i class="w"></i>';return h+'</div>'}
  let i=0;while(i<14){for(let k=0;k<rm&&i<14;k++,i++)h+='<i class="w"></i>';for(let k=0;k<Math.max(1,om)&&i<14;k++,i++)h+='<i></i>'}
  return h+'</div>';
}
function patternCard(R){
  const cur=PATTERNS.find(p=>p[1]===R.runMax&&p[2]===R.offMin);
  let h='<section class="card" id="pattern-card"><div class="card-head"><div><div class="kicker">'+esc(t('kPattern'))+'</div><h2 class="ctitle">'+esc(t('patternT'))+'</h2></div>'+(cur?'':'<span class="chip">'+esc(t('customPat'))+'</span>')+'</div><div class="patgrid">';
  PATTERNS.forEach(([k,rm,om])=>{h+='<button class="patcard'+(cur&&cur[0]===k?' on':'')+'" data-act="pattern" data-rm="'+rm+'" data-om="'+om+'"><b>'+esc(t('pat_'+k))+'</b>'+patternStrip(rm,om)+'<small>'+esc(t('patD_'+k))+'</small></button>'});
  h+='</div><div class="patcustom"><span class="lbl">'+esc(t('patCustom'))+'</span><span class="sc">'+esc(t('patWork'))+stepper('ruleStep','data-k="runMax"',R.runMax||'∞')+'</span><span class="sc">'+esc(t('patRest'))+stepper('ruleStep','data-k="offMin"',R.offMin)+'</span>'+patternStrip(R.runMax,R.offMin)+'</div>'
    +'<p class="quiet">'+ic('ic-info')+esc(t('patternNote'))+'</p></section>';
  return h;
}
function rankCard(R){
  return '<section class="card" id="rank-card"><div class="card-head"><div><div class="kicker">'+esc(t('kRank'))+'</div><h2 class="ctitle">'+esc(t('rankT'))+'</h2></div></div><div class="setgrid">'
    +'<div class="setrow"><span class="rl">'+esc(t('rankGate'))+'<small>'+esc(t('rankGateN'))+'</small></span><div class="seg">'+['off','lead','all'].map(k=>'<button class="'+(R.rankGate===k?'on':'')+'" data-act="rankGate" data-v="'+k+'">'+esc(t('rg_'+k))+'</button>').join('')+'</div></div>'
    +'<div class="setrow"><span class="rl">'+esc(t('rankTol'))+'<small>'+esc(t('rankTolN'))+'</small></span>'+dd('rule','data-k="rankTol"',R.rankTol,[[0,'0 · '+t('tol0')],[25,'25 · '+t('tol25')],[50,'50 · '+t('tol50')]])+'</div>'
    +'<div class="setrow"><span class="rl">'+esc(t('rankScale'))+'</span><div class="lvrow">'+M.LEVELS.map(v=>lvlChip(v)+'<span class="tiny muted">'+esc(t('lvl'+v))+'</span>').join('')+'</div></div>'
    +'</div><p class="quiet">'+ic('ic-info')+esc(t('rankNote'))+'</p></section>';
}

function modelView(){
  const a=A(),ws=a.ws,C=a.compiled(),D=derive(),stale=a.isStale();
  const W=C.P.w,R=ws.rules;
  const bd=D&&!stale?D.r.breakdown||{}:null;
  const tot=bd?Math.max(1,sum(Object.keys(bd).map(k=>Math.max(0,bd[k])))):1;
  const rows=[
    ['goals','goals','t_goals','Σ 120·w·short + 250·w·over'],
    ['rank','rank','t_rank','Σ w·(4·def·(1.5+4·def) + 0.6·waste)'],
    ['fair','fair','t_fair','Σ 1.5·w·(load − target)²'],
    ['rotate','rotate','t_rotate','Σ 1.2·w·(uses − expected)²'],
    ['mix','mix','t_mix','Σ w·(count − target)²'],
    ['pref','pref','t_pref','2·w·km/Dmax'],
    ['home','home','t_home','2·w·|home − km|/Dmax'],
    ['focus','focus','t_focus','4·w·Δkm/Dmax  |  6·w'],
    ['cluster','cluster','t_cluster','3·w·span/Dmax + 2·w·(zones−1)'],
    ['spacing','spacing','t_spacing','2·w·((ideal−gap)/ideal)²'],
    ['pairs','pairs','t_pairs','avoid +150·w, prefer −3·w'],
    ['likes','likes','t_likes','−1.5·w per liked visit']
  ];
  const hard=[['coverage','t_coverage','1000 / open seat · 6000 / empty visit'],['hard','t_hard','20000 each'],['rest','t_restH',R.mode==='strict'?'40000':'300'],['distinct','t_distinct','2500']];
  let h='<section class="card" id="equation-card"><div class="card-head"><div><div class="kicker">'+esc(t('kModel'))+'</div><h2 class="ctitle">'+esc(t('modelT'))+'</h2></div>'+(bd?'<span class="chip">'+esc(t('cost'))+' '+fmtN(D.r.cost)+'</span>':'<button class="btn sm" data-act="solve">'+ic('ic-wand')+esc(t('solve'))+'</button>')+'</div>';
  const on=rows.filter(r=>W[r[1]]>0);
  h+='<div class="eq"><span class="eqf">min&nbsp;J =</span> '+hard.map(x=>'<span class="eqt hard">'+esc(t(x[1]))+'</span>').join(' + ')+(on.length?' + '+on.map(r=>'<span class="eqt"><b>'+ws.weights[r[1]]+'</b>·'+esc(t(r[2]))+'</span>').join(' + '):'')+'</div>';
  h+='<p class="quiet">'+ic('ic-info')+esc(t('modelNote'))+'</p></section>';
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kNeedle'))+'</div><h2 class="ctitle">'+esc(t('needleT'))+'</h2></div><button class="linkbtn" data-act="restoreW">'+ic('ic-undo')+esc(t('restoreW'))+'</button></div>';
  h+='<div class="needle"><div class="nhead"><span></span><span>'+esc(t('term'))+'</span><span>'+esc(t('formula'))+'</span><span>'+esc(t('weightW'))+'</span><span>'+esc(t('share'))+'</span></div>';
  hard.forEach(([k,l,f])=>{const v=bd?bd[k]||0:0;h+='<div class="nrow hard"><span class="lock">'+ic('ic-lock')+'</span><span class="nl">'+esc(t(l))+'</span><code>'+esc(f)+'</code><span class="tiny muted">'+esc(t('fixed'))+'</span>'+shareBar(v,tot,bd)+'</div>'});
  rows.forEach(([k,wk,l,f])=>{const onW=ws.useW[wk],val=ws.weights[wk];const v=bd?bd[k]||0:0;
    h+='<div class="nrow'+(onW?'':' off')+'">'+swBtn(onW,'useW','data-k="'+wk+'"',true)+'<span class="nl">'+esc(t('wt_'+wk))+'<small>'+esc(t('why_'+wk))+'</small></span><code>'+esc(f)+'</code><span class="nw"><input type="range" class="rng" min="0" max="100" step="1" value="'+val+'" style="--fill:'+val+'%" data-bind="weight" data-k="'+wk+'"><span class="wv">'+val+'</span></span>'+shareBar(v,tot,bd)+'</div>'});
  h+='</div><p class="quiet">'+ic('ic-info')+esc(t('needleNote'))+'</p></section>';
  const P=C.P;
  h+='<div class="grid2"><section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kSize'))+'</div><h2 class="ctitle">'+esc(t('sizeT'))+'</h2></div></div><div class="kpis">'
    +kpi(t('kVisits'),P.V,t('sz_'+ws.sizing.mode))+kpi(t('seatsK'),P.Z,P.R+' '+t('roles').toLowerCase())+kpi(t('tabSites'),P.S,P.C+' '+t('catsK'))+kpi(t('tabPeople'),P.N,'')+kpi(t('itersK'),fmtN(P.iters),P.runs+'× · '+t(({fast:'qFast',balanced:'qBal',thorough:'qTh',max:'qMax'})[ws.engine.quality]))
    +'</div><p class="quiet">'+ic('ic-info')+esc(t('algoNote'))+'</p></section>';
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kFlow'))+'</div><h2 class="ctitle">'+esc(t('flowT'))+'</h2></div></div><ol class="flow">'+['f1','f2','f3','f4','f5'].map(k=>'<li><b>'+esc(t(k+'a'))+'</b><span>'+esc(t(k+'b'))+'</span></li>').join('')+'</ol></section></div>';
  return h;
}
function shareBar(v,tot,bd){if(!bd)return '<span class="nshare muted tiny">—</span>';const p=Math.max(0,v)/tot*100;return '<span class="nshare"><span class="bar"><i style="width:'+Math.min(100,p)+'%"></i></span><span class="mono tiny">'+(p<1&&v>0?'<1':Math.round(p))+'%</span></span>'}

function insightsView(){
  const a=A(),ws=a.ws,D=derive();
  if(!D||!D.m.visits.length)return '<section class="card"><div class="empty-state">'+ic('ic-chart','bigic')+'<h3 class="ctitle">'+esc(t('insightsT'))+'</h3><p>'+esc(t('noInsights'))+'</p><button class="btn primary" data-act="solve">'+ic('ic-wand')+esc(t('solve'))+'</button></div></section>';
  const m=D.m,r=D.r,st=r.stats;
  const stale=a.isStale();
  const ld=m.people.map((id,i)=>st.loads[i]);
  const nBreak=D.iss.filter(x=>x.sev==='warn').length,nOpen=D.iss.filter(x=>x.k==='open').reduce((s,x)=>s+x.n,0);
  const perRoleG=m.roles.map((rid,ri)=>{const ps=m.people.map((id,i)=>i).filter(i=>{const p=byId(ws.people,m.people[i]);return p&&p.roles[0]===rid});return gini(ps.map(i=>st.loads[i]/Math.max(.01,m.pTarget[i])))});
  const G=avg(perRoleG.filter(x=>isFinite(x)));
  let h=(stale?'<div class="banner stale">'+ic('ic-info')+'<span class="grow">'+esc(t('stale'))+'</span><button class="btn sm" data-act="solve">'+ic('ic-wand')+esc(t('resolve'))+'</button></div>':'');
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kKpi'))+'</div><h2 class="ctitle">'+esc(t('insightsT'))+'</h2></div><button class="btn sm" data-act="copyReport">'+ic('ic-copy')+esc(t('copyReport'))+'</button></div><div class="kpis">'
    +kpi(t('kWorkDays'),m.days.length,fmtDS(m.start)+' – '+fmtDS(m.end))
    +kpi(t('kVisits'),m.visits.length,r1(m.visits.length/Math.max(1,m.days.length))+' / '+t('day'))
    +kpi(t('kFilled'),st.filled+' / '+st.seats,Math.round(st.filled/Math.max(1,st.seats)*100)+'%',st.filled<st.seats?'bad':'good')
    +kpi(t('kDist'),fmtN(st.km)+' '+unitL(),'avg '+r1(st.km/Math.max(1,m.visits.length))+' '+unitL())
    +kpi(t('kFair'),G.toFixed(3),t('lowerBetter'),G<.08?'good':'')
    +kpi(t('kBreaks'),nBreak+nOpen,nOpen+' '+t('open')+' · '+nBreak+' ⚠',nBreak+nOpen?'bad':'good')
    +kpi(t('kCover'),(st.covered||0)+' / '+m.sites.length,Math.round((st.covered||0)/Math.max(1,m.sites.length)*100)+'%')
    +kpi(t('kCrit'),st.critN?Math.round(st.critHit/st.critN*100)+'%':'—',t('kCritS',{g:r1(st.rankGap||0)}),st.critN&&st.critHit<st.critN?'':'good')
    +kpi(t('kCost'),fmtN(r.cost),r.runs+'× · '+fmtMs(r.ms))
    +'</div></section>';
  const cnt=k=>D.iss.filter(x=>x.k===k).length;
  const R=ws.rules;
  const chk=(lbl,n,on)=>'<div class="check '+(on===false?'na':n?'bad':'ok')+'">'+ic(on===false?'ic-minus':n?'ic-alert':'ic-check')+'<span class="clbl">'+esc(lbl)+'</span><span class="cval">'+esc(on===false?t('off'):n?t('nFound',{n}):t('ok'))+'</span></div>';
  h+='<div class="grid2"><section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kRules'))+'</div><h2 class="ctitle">'+esc(t('auditT'))+'</h2></div></div><div class="checks">'
    +chk(t('a_cover'),nOpen+cnt('nosite'))
    +chk(t('a_rest'),cnt('rest')+cnt('run'),R.runMax>0)
    +chk(t('a_goals'),cnt('goalmiss')+cnt('goalover')+cnt('goalgrp'),(ws.goals||[]).some(g=>g.on))
    +chk(t('a_rank'),cnt('rankgap'),R.rankGate!=='off')
    +chk(t('a_perday'),cnt('perday'),R.perDay>0)
    +chk(t('a_limits'),cnt('maxload')+cnt('maxweek'))
    +chk(t('a_avail'),cnt('unavail')+cnt('ban')+cnt('siteoff'))
    +chk(t('a_dup'),cnt('dup'),R.distinct)
    +chk(t('a_bounds'),cnt('sitemax')+cnt('sitemin'))
    +chk(t('a_gap'),cnt('sitegap'),R.siteGap>0)
    +chk(t('a_pairs'),cnt('avoid'))
    +'</div></section>';
  const cats=m.cats.map(id=>catOf(id)).filter(Boolean);
  const tot=Math.max(1,sum(st.catCount));
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kCats'))+'</div><h2 class="ctitle">'+esc(t('mixT'))+'</h2></div></div>'
    +'<div class="lbl">'+esc(t('achieved'))+'</div><div class="mixbar">'+cats.map((c,i)=>'<i style="--c:'+esc(c.color)+';width:'+(st.catCount[i]/tot*100)+'%"></i>').join('')+'</div>'
    +'<div class="lbl">'+esc(t('targeted'))+'</div><div class="mixbar">'+cats.map((c,i)=>'<i style="--c:'+esc(c.color)+';opacity:.55;width:'+(m.catTarget[i]/tot*100)+'%"></i>').join('')+'</div>'
    +'<div class="legend">'+cats.map((c,i)=>'<span><span class="dot" style="--c:'+esc(c.color)+'"></span>'+esc(c.name)+' <b>'+st.catCount[i]+'</b><span class="muted mono tiny">/ '+r1(m.catTarget[i])+'</span></span>').join('')+'</div>';
  const bd=r.breakdown||{};const bks=Object.keys(bd).filter(k=>bd[k]>.05).sort((x,y)=>bd[y]-bd[x]);const bmax=Math.max(1,...bks.map(k=>bd[k]));
  h+='<div class="grouplbl" style="margin-top:22px">'+esc(t('costT'))+'</div>'+bks.map(k=>'<div class="costrow"><span>'+esc(t('term_'+k))+'</span><div class="bar"><i style="width:'+(bd[k]/bmax*100)+'%"></i></div><span class="cv2">'+fmtN(bd[k])+'</span></div>').join('')
    +'<p class="quiet">'+ic('ic-info')+esc(t('costNote'))+'</p></section></div>';
  const maxL=Math.max(1,...ld,...m.pTarget.map(Math.ceil));
  h+='<div class="grid2"><section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kFair'))+'</div><h2 class="ctitle">'+esc(t('loadT'))+'</h2></div></div>';
  const seen=new Set();
  m.roles.forEach(rid=>{
    const ro=roleOf(rid);if(!ro)return;
    const idx=m.people.map((id,i)=>i).filter(i=>{const p=byId(ws.people,m.people[i]);return p&&p.roles.includes(rid)&&!seen.has(p.id)});
    if(!idx.length)return;
    h+='<div class="grouplbl"><span class="dot" style="--c:'+esc(ro.color)+'"></span>'+esc(ro.name)+'</div>';
    idx.sort((x,y)=>st.loads[y]-st.loads[x]).forEach(i=>{
      const p=byId(ws.people,m.people[i]);seen.add(p.id);
      const L2=st.loads[i],T2=m.pTarget[i];
      h+='<div class="loadrow"><span class="ln" data-pid="'+esc(p.id)+'">'+esc(p.name)+'</span><div class="bar'+(L2>T2+1.01?' over':'')+'" style="--c:'+esc(ro.color)+'"><i style="width:'+(L2/maxL*100)+'%"></i><span class="tick" style="--t:'+(T2/maxL*100)+'%"></span></div><span class="lv">'+L2+' <small>/ '+r1(T2)+'</small></span></div>';
    });
  });
  h+='<p class="quiet">'+ic('ic-info')+esc(t('loadNote'))+'</p></section>';
  const sites=m.sites.map((id,i)=>({s:byId(ws.sites,id),u:st.siteUse[i]})).filter(x=>x.s);
  const unused=sites.filter(x=>!x.u);
  const top=sites.slice().sort((x,y)=>y.u-x.u).slice(0,12);const umax=Math.max(1,...top.map(x=>x.u));
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('term_rotate'))+'</div><h2 class="ctitle">'+esc(t('usageT'))+'</h2></div><span class="chip">'+esc(t('unused'))+' · '+unused.length+'</span></div>'
    +top.map(x=>'<div class="loadrow"><span class="ln"><span class="dot" style="--c:'+esc(catColor(x.s.cat))+'"></span>'+esc(x.s.name)+'</span><div class="bar" style="--c:'+esc(catColor(x.s.cat))+'"><i style="width:'+(x.u/umax*100)+'%"></i></div><span class="lv">'+x.u+'×</span></div>').join('')
    +(unused.length?'<div class="grouplbl" style="margin-top:16px">'+esc(t('unused'))+'</div><div class="tokens">'+unused.slice(0,40).map(x=>'<span class="chip"><span class="dot" style="--c:'+esc(catColor(x.s.cat))+'"></span>'+esc(x.s.name)+'</span>').join('')+(unused.length>40?'<span class="more">+'+(unused.length-40)+'</span>':'')+'</div>':'')
    +'</section></div>';
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kSched'))+'</div><h2 class="ctitle">'+esc(t('ledgerT'))+'</h2></div></div><div class="tblwrap"><table><thead><tr><th>'+esc(t('day'))+'</th><th class="numc">'+esc(t('kVisits'))+'</th><th>'+esc(t('focus'))+'</th><th class="numc">'+esc(t('dist'))+'</th><th class="numc">'+esc(t('kFilled'))+'</th><th>'+esc(t('issues'))+'</th></tr></thead><tbody>'
    +m.days.map((dd,d)=>{const vs=D.byDay[d];const km=sum(vs.map(v=>{const s=D.siteOfV(v);return s?+s.km:0}));let seats=0,fl=0;vs.forEach(v=>{const vis=m.visits[v];for(let z=vis.z0;z<vis.z0+vis.zn;z++)if(st.active[z]){seats++;if(r.seatP[z]>=0)fl++}});
      const ni=D.iss.filter(x=>issueDay(x,D)===dd.iso&&x.sev!=='info').length;
      const foc=dd.focus==='near'?t('fNear'):dd.focus==='far'?t('fFar'):(catOf(dd.focus)?catOf(dd.focus).name:t('fAuto'));
      return '<tr><td>'+esc(fmtD(dd.iso))+'</td><td class="numc">'+vs.length+'</td><td>'+esc(foc)+'</td><td class="numc">'+r1(km)+' '+unitL()+'</td><td class="numc">'+fl+'/'+seats+'</td><td>'+(ni?'<span class="chip bad">'+ni+'</span>':'<span class="chip good">'+ic('ic-check')+'</span>')+'</td></tr>'}).join('')
    +'</tbody></table></div></section>';
  return h;
}
function kpi(l,v,s,cls){return '<div class="kpi '+(cls||'')+'"><div class="kl">'+esc(l)+'</div><div class="kv">'+esc(v)+'</div><div class="ks">'+esc(s||'')+'</div></div>'}

function workspaceView(){
  const a=A(),ws=a.ws;
  let h='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kWsList'))+'</div><h2 class="ctitle">'+esc(t('wsT'))+'</h2></div>'
    +'<label class="fld"><span>'+esc(t('wsName'))+'</span><input class="inp slim" data-bind="wsName" value="'+esc(ws.name)+'" style="min-width:220px"></label></div><div class="wscards">';
  a.ix.list.slice().sort((x,y)=>y.updated-x.updated).forEach(it=>{
    const on=it.id===ws.id;
    h+='<div class="wscard'+(on?' on':'')+'"><div class="wn">'+esc(it.name)+'</div><div class="wm">'+esc(new Date(it.updated).toLocaleString(L()==='ar'?'ar-EG':'en-GB',{dateStyle:'medium',timeStyle:'short'}))+(on?' · '+esc(t('activeWs')):'')+'</div><div class="wa">'
      +(on?'':'<button class="btn sm" data-act="wsOpen" data-id="'+esc(it.id)+'">'+esc(t('open_'))+'</button>')
      +'<button class="btn sm ghost" data-act="wsDup" data-id="'+esc(it.id)+'">'+ic('ic-copy')+esc(t('duplicate'))+'</button>'
      +(a.ix.list.length>1?'<button class="ibtn" data-act="wsDel" data-id="'+esc(it.id)+'" title="'+esc(t('del'))+'">'+ic('ic-trash')+'</button>':'')+'</div></div>';
  });
  h+='</div><div class="grouplbl" style="margin-top:22px">'+esc(t('newFrom'))+'</div><div class="wscards">'
    +M.TEMPLATE_ORDER.map(k=>'<button class="tplcard" data-act="wsNew" data-tpl="'+k+'"><b>'+ic('ic-plus')+esc(t('tpl_'+k))+'</b><span>'+esc(t('tplD_'+k))+'</span></button>').join('')
    +'</div><p class="quiet">'+ic('ic-info')+esc(t('wsNote'))+'</p></section>';
  h+='<div class="grid2"><section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kSnaps'))+'</div><h2 class="ctitle">'+esc(t('snapsT'))+'</h2></div><button class="btn sm" data-act="snapSave" '+(ws.plan?'':'disabled')+'>'+ic('ic-camera')+esc(t('saveSnap'))+'</button></div>';
  if(!ws.snapshots.length)h+='<div class="muted tiny">'+esc(t('noSnaps'))+'</div>';
  ws.snapshots.forEach(s=>{h+='<div class="snap"><span class="sn">'+esc(s.name)+'</span><span class="sm">'+esc(new Date(s.at).toLocaleString(L()==='ar'?'ar-EG':'en-GB',{dateStyle:'short',timeStyle:'short'}))+' · '+esc(t('cost'))+' '+fmtN(s.plan.res.cost)+'</span><button class="btn sm" data-act="snapRestore" data-id="'+esc(s.id)+'">'+esc(t('restore'))+'</button><button class="ibtn" data-act="snapDel" data-id="'+esc(s.id)+'">'+ic('ic-trash')+'</button></div>'});
  h+='<p class="quiet">'+ic('ic-info')+esc(t('snapNote'))+'</p></section>';
  h+='<section class="card"><div class="card-head"><div><div class="kicker">'+esc(t('kIO'))+'</div><h2 class="ctitle">'+esc(t('ioT'))+'</h2></div></div><div class="setgrid">'
    +'<div class="setrow"><span class="rl">JSON</span><button class="btn sm" data-act="wsExport">'+ic('ic-down')+esc(t('expJson'))+'</button><button class="btn sm" data-act="wsImport">'+ic('ic-up')+esc(t('impJson'))+'</button></div>'
    +'<div class="setrow"><span class="rl">'+esc(t('dataset'))+'<small>'+esc(t('datasetN'))+'</small></span><button class="btn sm primary" data-act="loadDataset">'+ic('ic-layers')+esc(t('loadDataset'))+'</button><button class="btn sm" data-act="wsImport">'+ic('ic-up')+esc(t('impDataset'))+'</button></div>'
    +'<div class="setrow"><span class="rl">'+esc(t('language'))+'</span><div class="seg"><button class="'+(L()==='en'?'on':'')+'" data-act="lang" data-v="en">English</button><button class="'+(L()==='ar'?'on':'')+'" data-act="lang" data-v="ar">العربية</button></div></div>'
    +'<div class="setrow"><span class="rl">'+esc(t('theme'))+'</span><div class="seg"><button class="'+(a.prefs.theme!=='dusk'?'on':'')+'" data-act="themeSet" data-v="light">'+ic('ic-sun')+esc(t('light'))+'</button><button class="'+(a.prefs.theme==='dusk'?'on':'')+'" data-act="themeSet" data-v="dusk">'+ic('ic-moon')+esc(t('dusk'))+'</button></div></div>'
    +'<div class="setrow"><span class="rl">'+esc(t('storage'))+'</span><span class="mono tiny">'+(M.Store.usage()/1024).toFixed(0)+' KB</span></div>'
    +'<div class="setrow"><span class="rl">'+esc(t('resetWs'))+'</span><button class="btn sm" data-act="wsReset">'+ic('ic-undo')+esc(t('resetWs').split(' ')[0])+'</button></div>'
    +'</div></section></div>';
  return h;
}

function exportModal(st){
  const a=A(),ws=a.ws;
  const fmts=[['csv','CSV'],['tsv','Excel (TSV)'],['md','Markdown'],['wa','WhatsApp'],['ics','Calendar (.ics)'],['json','JSON']];
  const ppl=ws.people.filter(p=>p.active);
  const cols=[['cat','colCat'],['km','colDist'],['zone','colZone'],['dow','colDow']];
  let h='<div class="modal" role="dialog" aria-modal="true"><div class="mhead"><div><div class="kicker">'+esc(t('exportB'))+'</div><h2 class="ctitle">'+esc(t('exportT'))+'</h2></div><button class="ibtn" data-act="modalClose">'+ic('ic-x')+'</button></div>'
    +'<div class="msec"><div class="mlab">'+esc(t('fmt'))+'</div><div class="seg">'+fmts.map(([k,l])=>'<button class="'+(st.fmt===k?'on':'')+'" data-act="expFmt" data-v="'+k+'">'+esc(l)+'</button>').join('')+'</div></div>'
    +'<div class="msec row"><div><div class="mlab">'+esc(t('forWho'))+'</div>'+dd('expWho','',st.who,[['',t('everyone')]].concat(ppl.map(p=>[p.id,p.name])))+'</div>'
    +'<div class="grow"><div class="mlab">'+esc(t('cols'))+'</div><div class="colgrid">'+cols.map(([k,l])=>'<span class="colcell">'+swBtn(st.cols[k],'expCol','data-k="'+k+'"',true)+esc(t(l))+'</span>').join('')+'</div></div></div>'
    +'<div class="msec"><div class="mlab">'+esc(t('preview'))+'</div><pre class="export-preview" id="expPrev" dir="auto"></pre></div>'
    +'<div class="mfoot"><button class="btn primary" data-act="expDownload">'+ic('ic-down')+esc(t('download'))+'</button><button class="btn" data-act="expCopy">'+ic('ic-copy')+esc(t('copy'))+'</button><span class="grow"></span><button class="btn ghost" data-act="modalClose">'+esc(t('close'))+'</button></div></div>';
  return h;
}
function paletteHTML(q,items,sel){
  return '<div class="palette" role="dialog" aria-modal="true"><div class="pin">'+ic('ic-search')+'<input id="palIn" autocomplete="off" placeholder="'+esc(t('palPh'))+'" value="'+esc(q)+'"><kbd>Esc</kbd></div><div class="pal-list" id="palList">'+paletteList(items,sel)+'</div></div>';
}
function paletteList(items,sel){
  if(!items.length)return '<div class="pal-item muted">'+esc(t('palNone'))+'</div>';
  return items.map((it,i)=>'<div class="pal-item'+(i===sel?' on':'')+'" data-act="palRun" data-i="'+i+'">'+ic(it.icon||'ic-cmd')+'<span>'+esc(it.label)+'</span><small>'+esc(it.kind)+'</small></div>').join('');
}
function kbdModal(){
  const rows=[['<kbd>1</kbd>–<kbd>7</kbd>',t('kbTabs')],['<kbd>G</kbd>',t('kbSolve')],['<kbd>R</kbd>',t('kbReroll')],['<kbd>E</kbd>',t('kbExport')],['<kbd>L</kbd>',t('kbLayout')],['<kbd>Ctrl</kbd><kbd>K</kbd>',t('kbPalette')],['<kbd>Ctrl</kbd><kbd>Z</kbd> / <kbd>Ctrl</kbd><kbd>⇧</kbd><kbd>Z</kbd>',t('kbUndo')],['<kbd>?</kbd>',t('kbHelp')]];
  return '<div class="modal sm" role="dialog" aria-modal="true"><div class="mhead"><div><div class="kicker">'+esc(t('kbdT'))+'</div><h2 class="ctitle">'+esc(t('kbdT'))+'</h2></div><button class="ibtn" data-act="modalClose">'+ic('ic-x')+'</button></div><div class="kbgrid msec">'+rows.map(([k,l])=>'<span>'+k+'</span><span>'+esc(l)+'</span>').join('')+'</div></div>';
}
function swatches(){return M.COLORS.map(c=>'<button style="--c:'+c+'" data-act="colorPick" data-c="'+c+'" aria-label="'+c+'"></button>').join('')}

G.VIEWS={DD,ddPop,modelView,goalText,ic,fmtD,fmtDL,fmtDS,unitL,derive,issueText,warnText,mast,tagline,tabs,statusHTML,planView,sitesView,peopleView,rulesView,insightsView,workspaceView,explainPop,dpkHTML,exportModal,paletteHTML,paletteList,kbdModal,swatches,r1,fmtN};
})(window);
