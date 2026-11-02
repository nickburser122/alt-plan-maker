const TEMPLATES=['field','retail','care','blank'];
function base(M,name){
  const ws=M.TEMPLATES[name]();
  ws.scope=name==='care'?{mode:'week',start:'2026-10-05',end:''}:{mode:'month',start:'2026-10-01',end:''};
  return ws;
}
function tune(ws,seed,quality){
  ws.engine.seed=seed;ws.engine.quality=quality;ws.engine.runs=3;
  return ws;
}
function everyDay(){return [0,1,2,3,4,5,6].map(()=>({on:true,n:1,focus:'auto'}))}
function fPin(M){
  const ws=base(M,'field');
  const probe=M.compile(ws);
  const fin=ws.roles[0].id;
  const who=ws.people.find(p=>p.roles.includes(fin)&&p.name==='Abaza');
  const site=ws.sites.find(s=>s.name==='Fleet Depot');
  const seatKey=probe.map.seats.find(z=>probe.map.visits[z.v].d===3).key;
  const visitKey=probe.map.visits[5].key;
  ws.locks.seats[seatKey]=who.id;
  ws.locks.sites[visitKey]=site.id;
  return {ws,pins:{seatKey,person:who.id,visitKey,site:site.id}};
}
function fImp(M){
  const ws=M.TEMPLATES.blank();
  ws.people=[M.mkPerson('Solo',[ws.roles[0].id])];
  ws.sites=[M.mkSite('A',ws.categories[0].id,1),M.mkSite('B',ws.categories[0].id,3)];
  ws.week=everyDay();
  ws.rules.runMax=1;ws.rules.offMin=1;
  ws.scope={mode:'week',start:'2026-10-05',end:''};
  return ws;
}
function fTight(M,fair){
  const ws=M.TEMPLATES.blank();
  const r=ws.roles[0].id;
  ws.categories[0].staff={[r]:2};
  ws.people=['P1','P2','P3','P4'].map(n=>M.mkPerson(n,[r]));
  ws.sites=['A','B','C','D','E','F'].map((n,i)=>M.mkSite(n,ws.categories[0].id,i+1));
  ws.week=[0,1,2,3,4,5,6].map(i=>({on:i<5,n:i<5?2:0,focus:'auto'}));
  ws.rules.runMax=0;ws.rules.offMin=0;ws.rules.weekStart=0;
  ws.scope={mode:'week',start:'2026-10-05',end:''};
  ws.weights.fair=fair==null?100:fair;
  return ws;
}
function fGoal(M){
  const ws=base(M,'field');
  const main=ws.categories[0],con=ws.categories[1];
  ws.goals=[
    M.mkGoal({per:'total',what:{k:'cat',v:[main.id]},op:'min',n:12}),
    M.mkGoal({per:'total',what:{k:'loc',v:[ws.locations.find(l=>l.name==='North').id]},op:'min',n:3}),
    M.mkGoal({per:'each',what:{k:'cat',v:[con.id]},op:'max',n:2}),
    M.mkGoal({per:'total',what:{k:'critGe',v:'75'},op:'min',n:4})
  ];
  const ab=ws.people.find(p=>p.name==='Abaza'),depot=ws.sites.find(x=>x.name==='Fleet Depot');
  ws.goals.push(M.mkGoal({kind:'inject',what:{k:'site',v:[depot.id]},inject:{mode:'dates',dates:'2026-10-13'},who:{k:'person',v:[ab.id]},hard:true}));
  ws.goals.push(M.mkGoal({kind:'inject',what:{k:'loc',v:[ws.locations.find(l=>l.name==='East').id]},inject:{mode:'pick',per:'any',op:'exact',n:1},who:{k:'role',v:[ws.roles[1].id]},hard:false,w:80}));
  return ws;
}
function fAvoid(M,seats,pairsW){
  const ws=M.TEMPLATES.blank();const r=ws.roles[0].id;
  ws.categories[0].staff={[r]:seats};
  ws.people=Array.from({length:8},(_,i)=>M.mkPerson('P'+i,[r]));
  ws.people.forEach((p,i)=>{p.avoid=ws.people.filter((q,j)=>j!==i).map(q=>q.id)});
  ws.sites=['A','B','C','D'].map((n,i)=>M.mkSite(n,ws.categories[0].id,i+1));
  ws.week=[0,1,2,3,4,5,6].map(i=>({on:i<5,n:1,focus:'auto'}));
  ws.rules.runMax=0;ws.rules.offMin=0;ws.scope={mode:'week',start:'2026-10-05',end:''};
  ws.weights.pairs=pairsW;
  return ws;
}
function fLoad(M,mode){
  const ws=M.TEMPLATES.blank();const r=ws.roles[0].id;
  ws.people=[M.mkPerson('Solo',[r],{maxLoad:3,bans:[]})];
  ws.sites=[M.mkSite('A',ws.categories[0].id,1),M.mkSite('B',ws.categories[0].id,2)];
  ws.people[0].bans=[ws.sites[1].id];
  ws.week=everyDay();ws.rules.runMax=0;ws.rules.offMin=0;ws.rules.mode=mode;
  ws.scope={mode:'week',start:'2026-10-05',end:''};
  return ws;
}
module.exports={fLoad,fAvoid,TEMPLATES,base,tune,fPin,fImp,fTight,fGoal,everyDay};
function fAlt(M,k,days,mode){
  const ws=M.TEMPLATES.blank();const r=ws.roles[0].id;
  ws.categories[0].staff={[r]:k};
  ws.people=Array.from({length:2*k},(_,i)=>M.mkPerson('P'+i,[r]));
  ws.sites=Array.from({length:6},(_,i)=>M.mkSite('S'+i,ws.categories[0].id,i+1));
  ws.week=[0,1,2,3,4,5,6].map(()=>({on:true,n:1,focus:'auto'}));
  ws.rules.runMax=1;ws.rules.offMin=1;ws.rules.weekStart=0;ws.rules.mode=mode||'bend';
  ws.scope={mode:'custom',start:'2026-10-05',end:new Date(Date.UTC(2026,9,5+days-1)).toISOString().slice(0,10)};
  return ws;
}
module.exports.fAlt=fAlt;
function fShort(M){
  const ws=M.TEMPLATES.blank();
  const rx=ws.roles[0],ry=M.mkRole('Y',M.COLORS[3]);ws.roles=[rx,ry];
  const ca=ws.categories[0];ca.staff={[rx.id]:2,[ry.id]:1};
  const cb=M.mkCat('B',M.COLORS[4],{[ry.id]:1},1);ws.categories=[ca,cb];
  const dow=(...on)=>[0,1,2,3,4,5,6].map(i=>on.includes(i));
  ws.people=[M.mkPerson('X1',[rx.id],{days:dow(0,1)}),M.mkPerson('X2',[rx.id],{days:dow(0,1)}),M.mkPerson('X3',[rx.id],{days:dow(0,1,2)}),
    M.mkPerson('Y1',[ry.id]),M.mkPerson('Y2',[ry.id]),M.mkPerson('Y3',[ry.id])];
  ws.sites=['A1','A2','A3','A4'].map((n,i)=>M.mkSite(n,ca.id,i+1)).concat(['B1','B2','B3','B4'].map((n,i)=>M.mkSite(n,cb.id,i+1)));
  ws.week=[0,1,2,3,4,5,6].map(i=>({on:i<5,n:2,focus:'auto'}));
  ws.rules.runMax=0;ws.rules.offMin=0;ws.rules.weekStart=0;
  ws.scope={mode:'custom',start:'2026-10-05',end:'2026-10-25'};
  return ws;
}
module.exports.fShort=fShort;
