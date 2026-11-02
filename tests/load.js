const vm=require('vm'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
function load(){
  const w={console,performance:{now:()=>Number(process.hrtime.bigint()/1000n)/1000}};
  w.window=w;w.self=w;
  vm.createContext(w);
  for(const f of ['i18n','core','engine'])vm.runInContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),w,{filename:f+'.js'});
  return {M:w.MV,E:w.MauvineEngine};
}
module.exports={load,root};
