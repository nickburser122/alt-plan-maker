const vm=require('vm'),fs=require('fs'),path=require('path');
function runSuite(root,file){
  return new Promise(resolve=>{
    const lines=[];
    const out={textContent:''};
    const w={console:{log:s=>lines.push(String(s)),error:s=>lines.push('ERR '+s),warn(){}},performance:{now:()=>Date.now()},setTimeout,clearTimeout};
    w.window=w;w.self=w;
    w.document={getElementById:()=>out,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({style:{},appendChild(){},setAttribute(){}}),body:{appendChild(){}}};
    w.fetch=u=>{const f=path.join(root,'tests',u);return Promise.resolve({json:()=>Promise.resolve(JSON.parse(fs.readFileSync(f,'utf8'))),text:()=>Promise.resolve(fs.readFileSync(f,'utf8'))})};
    const mem={};w.localStorage={getItem:k=>k in mem?mem[k]:null,setItem(k,v){mem[k]=String(v)},removeItem(k){delete mem[k]},key:i=>Object.keys(mem)[i]||null,get length(){return Object.keys(mem).length}};
    vm.createContext(w);
    try{
      for(const f of ['i18n','core','engine'])vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),w,{filename:f});
      vm.runInContext(fs.readFileSync(path.join(root,'tests',file),'utf8'),w,{filename:file});
    }catch(e){lines.push('THROW '+e.message)}
    const tick=setInterval(()=>{},50);
    let waited=0,seen=-1,quiet=0;
    const poll=setInterval(()=>{
      waited+=200;
      if(lines.length!==seen){seen=lines.length;quiet=0}else quiet+=200;
      const done=lines.some(l=>/\d+ passed, \d+ failed/.test(l))||waited>240000||(lines.length&&quiet>=6000);
      if(done||waited>3000&&!lines.length){clearInterval(poll);clearInterval(tick);resolve(lines)}
    },200);
  });
}
module.exports={runSuite};
if(require.main===module){
  const root=process.argv[2],files=process.argv.slice(3);
  (async()=>{for(const f of files){const l=await runSuite(root,f);const sum=(l.filter(x=>/passed, \d+ failed/.test(x)).pop()||'').trim();const fails=l.filter(x=>/^FAIL|^THROW|^ERR/.test(x));console.log(f.padEnd(22),sum||('no summary; lines='+l.length),fails.length?' FAILS: '+fails.slice(0,4).join(' || '):'')}process.exit(0)})();
}
