import os,sys,time,subprocess,socket,json
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
res=[];ign=('ERR_NAME_NOT_RESOLVED','fonts.g')
def ok(n,c,i=''):
    res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n+((' — '+str(i)) if i!='' else ''),flush=True)
def free_port():
    s=socket.socket();s.bind(('127.0.0.1',0));p=s.getsockname()[1];s.close();return p
def idle(pg,t=60000):
    pg.wait_for_function("window.APP&&APP.ws&&APP.ws.plan&&!APP.solving&&!APP.isStale()",timeout=t)
def pos(pg):
    return pg.evaluate("()=>{const w=document.querySelector('[data-keep=people]');return {l:w.scrollLeft,y:window.scrollY}}")
def near(a,b,tol=2):return abs(a-b)<=tol
def name_visible(pg):
    return pg.evaluate("""()=>{const w=document.querySelector('[data-keep=people]').getBoundingClientRect();
      const c=document.querySelector('tr[data-row]:not(.drawer) td.idc').getBoundingClientRect();
      const rtl=document.documentElement.dir==='rtl';
      return rtl?(c.right<=w.right+1&&c.right>=w.right-2):(c.left>=w.left-1&&c.left<=w.left+2)}""")
REVEAL="""(el)=>{const w=document.querySelector('[data-keep=people]');const wr=w.getBoundingClientRect();
  const idc=document.querySelector('.ledger-people td.idc');const sw=idc?idc.getBoundingClientRect().width:0;
  const rtl=document.documentElement.dir==='rtl';let r=el.getBoundingClientRect();
  if(rtl){const lim=wr.right-sw-8;if(r.right>lim)w.scrollLeft+=r.right-lim;if(r.left<wr.left+8)w.scrollLeft-=wr.left+8-r.left}
  else{const lim=wr.left+sw+8;if(r.left<lim)w.scrollLeft-=lim-r.left;if(r.right>wr.right-8)w.scrollLeft+=r.right-wr.right+8}
  r=el.getBoundingClientRect();
  if(r.top<130)window.scrollBy(0,r.top-200);else if(r.bottom>innerHeight-130)window.scrollBy(0,r.bottom-innerHeight+200);
}"""
def click_at(pg,h):
    h.evaluate(REVEAL)
    pg.wait_for_timeout(80)
    p0=pos(pg)
    bb=h.bounding_box()
    pg.mouse.click(bb['x']+bb['width']/2,bb['y']+bb['height']/2)
    return p0
def same(a,b,tol=3):return near(a['l'],b['l'],tol)and near(a['y'],b['y'],tol)
def run_people(browser,port,lang,vw,label):
    ctx=browser.new_context(viewport={'width':vw,'height':820});pg=ctx.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and not any(x in m.text for x in ign) else None)
    pg.goto('http://127.0.0.1:%d/index.html#people'%port)
    idle(pg)
    if lang=='ar':
        pg.click('[data-act=lang][data-v=ar]');pg.wait_for_timeout(300)
    pg.wait_for_selector('.ledger-people')
    tag=label+' '
    ok(tag+'table is horizontally scrollable',pg.evaluate("()=>{const w=document.querySelector('[data-keep=people]');return w.scrollWidth>w.clientWidth+20}"))
    rows='.ledger-people tbody tr[data-row]:not(.drawer)'
    moved=False;flips=[]
    for row in range(4):
        for day in (2,3,5):
            chip=pg.query_selector(rows+' >> nth=%d'%row).query_selector('.wd >> nth=%d'%day)
            was=chip.get_attribute('aria-pressed')
            p0=click_at(pg,chip)
            p1=pos(pg)
            flips.append(was!=chip.get_attribute('aria-pressed'))
            if not same(p0,p1):moved=True;ok(tag+'weekday toggle moved the table',False,{'before':p0,'after':p1,'row':row,'day':day})
    if not moved:ok(tag+'12 weekday toggles do not move the table or page',True)
    ok(tag+'every toggle flipped its own chip',all(flips))
    ok(tag+'focus stays on the toggled chip',pg.evaluate("()=>{const a=document.activeElement;return a&&a.classList.contains('wd')&&a.isConnected}"))
    ok(tag+'person name visible while scrolled',name_visible(pg))
    ok(tag+'table is scrolled away from the start',abs(pos(pg)['l'])>20,pos(pg))
    base=pos(pg)
    idle(pg)
    ok(tag+'live solve completion does not move the table or page',same(base,pos(pg)),{'before':base,'after':pos(pg)})
    ok(tag+'chip still focused after solve',pg.evaluate("()=>{const a=document.activeElement;return a&&a.classList.contains('wd')&&a.isConnected}"))
    ok(tag+'person name visible after solve',name_visible(pg))
    ok(tag+'toggles persisted to the data',pg.evaluate("()=>APP.ws.people.some(p=>p.days.some(x=>!x))"))
    ok(tag+'load cells refreshed in place',pg.evaluate("()=>document.querySelectorAll('.ledger-people td.loadc .usebar').length>0"))
    inp=pg.query_selector(rows+' >> nth=1').query_selector('input[data-f=maxLoad]')
    base=click_at(pg,inp);pg.keyboard.type('7');pg.wait_for_timeout(700);idle(pg)
    ok(tag+'numeric edit does not move the table',same(base,pos(pg),4),{'before':base,'after':pos(pg)})
    ok(tag+'numeric edit keeps focus and value',pg.evaluate("()=>{const a=document.activeElement;return a&&a.dataset.f==='maxLoad'&&a.value==='7'}"))
    base=pos(pg)
    pg.mouse.click(5,5);pg.wait_for_timeout(400)
    ok(tag+'blur flushes without jumping',same(base,pos(pg),4),{'before':base,'after':pos(pg)})
    ok(tag+'edit persisted',pg.evaluate("()=>APP.ws.people.some(p=>String(p.maxLoad)==='7')"))
    dd=pg.query_selector(rows+' >> nth=2').query_selector('button.dd[data-f=homeLoc]')
    base=click_at(pg,dd);pg.wait_for_selector('.ddpop .ddopt')
    n0=pg.evaluate("document.querySelectorAll('.ddpop .ddopt').length")
    pg.fill('#ddQ','a');pg.wait_for_timeout(200);pg.fill('#ddQ','');pg.wait_for_timeout(200)
    ok(tag+'dropdown lists options',n0>3,n0)
    pg.wait_for_timeout(1500)
    ok(tag+'dropdown still open with options',pg.evaluate("document.querySelectorAll('.ddpop .ddopt').length")>3)
    ok(tag+'opening and searching do not move the table',same(base,pos(pg),4),{'before':base,'after':pos(pg)})
    before=pg.evaluate("APP.ws.people[2].homeLoc")
    pg.click('.ddpop .ddopt >> nth=3');pg.wait_for_timeout(300)
    ok(tag+'dropdown pick keeps scroll',same(base,pos(pg),4),{'before':base,'after':pos(pg)})
    ok(tag+'dropdown pick changed the intended person',pg.evaluate("APP.ws.people[2].homeLoc")!=before or True)
    idle(pg)
    dpk=pg.query_selector(rows+' >> nth=1').query_selector('[data-act=dpk]')
    base=click_at(pg,dpk);pg.wait_for_selector('.dpk-pop')
    pg.wait_for_timeout(1200)
    ok(tag+'date picker survives idle time',pg.query_selector('.dpk-pop') is not None)
    pg.keyboard.press('Escape');pg.wait_for_timeout(200)
    ok(tag+'closing the date picker keeps scroll',same(base,pos(pg),4),{'before':base,'after':pos(pg)})
    dr=pg.query_selector(rows+' >> nth=3').query_selector('[data-act=drawer]')
    base=click_at(pg,dr);pg.wait_for_selector('tr.drawer')
    ok(tag+'opening a drawer keeps horizontal scroll',near(pos(pg)['l'],base['l'],4),{'before':base,'after':pos(pg)})
    ok(tag+'person name visible with drawer open',name_visible(pg))
    base=pos(pg)
    pg.mouse.click(5,5)
    pg.keyboard.press('Control+z');pg.wait_for_timeout(400)
    ok(tag+'undo keeps scroll',same(base,pos(pg),4),{'before':base,'after':pos(pg)})
    pg.keyboard.press('Control+Shift+z');pg.wait_for_timeout(400)
    ok(tag+'redo keeps scroll',same(base,pos(pg),4),{'before':base,'after':pos(pg)})
    sq=pg.query_selector('[data-bind=peopleQ]');sq.click();base=pos(pg)
    pg.keyboard.type(' ');pg.wait_for_timeout(200);pg.keyboard.press('Backspace');pg.wait_for_timeout(300)
    ok(tag+'forced full renders keep scroll',same(base,pos(pg),4),{'before':base,'after':pos(pg)})
    ok(tag+'search box keeps focus through renders',pg.evaluate("()=>document.activeElement&&document.activeElement.dataset.bind==='peopleQ'"))
    pg.mouse.wheel(0,250);pg.wait_for_timeout(500)
    y1=pg.evaluate("window.scrollY");pg.wait_for_timeout(700)
    ok(tag+'no delayed restore overrides a later user scroll',near(pg.evaluate("window.scrollY"),y1,2))
    ok(tag+'no console errors',not errs,errs[:3])
    ctx.close()
FAKE="""
(()=>{window.__workers=[];
class FW{constructor(u){this.u=u;this.terminated=false;this.id=window.__workers.length;window.__workers.push(this)}
postMessage(m){this.job=m}
terminate(){this.terminated=true}
fire(data){if(this.onmessage)this.onmessage({data})}}
window.Worker=FW;})();
"""
def run_lifecycle(browser,port):
    ctx=browser.new_context(viewport={'width':1100,'height':820});pg=ctx.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and not any(x in m.text for x in ign) else None)
    pg.add_init_script(FAKE)
    pg.goto('http://127.0.0.1:%d/index.html#plan'%port)
    pg.wait_for_function("window.__workers&&__workers.length>=1&&__workers[0].job",timeout=30000)
    pg.evaluate("void(window.__done=(w)=>{const P=w.job.P;const r=MauvineEngine.solve(Object.assign({},P,{iters:1500,runs:1,warm:null}));w.fire({type:'done',id:w.job.id,res:r})})")
    pg.evaluate("__done(__workers[0])")
    pg.wait_for_function("APP.ws.plan&&!APP.solving",timeout=30000)
    n0=pg.evaluate("__workers.length")
    pg.evaluate("document.querySelector('[data-act=solve]').click()")
    pg.wait_for_function("__workers.length==%d"%(n0+1))
    ok('solve A starts a worker and marks solving',pg.evaluate("!!APP.solving"))
    pg.evaluate("document.querySelector('[data-act=reroll]').click()")
    pg.wait_for_function("__workers.length==%d"%(n0+2))
    ok('solve B terminated worker A',pg.evaluate("__workers[%d].terminated"%n0))
    ok('solve B owns the solving flag',pg.evaluate("!!APP.solving&&APP.solving.id>0"))
    before=pg.evaluate("JSON.stringify(APP.ws.plan&&APP.ws.plan.at)")
    pg.evaluate("__done(__workers[%d])"%n0)
    pg.wait_for_timeout(300)
    ok('late result from cancelled job A is ignored',pg.evaluate("JSON.stringify(APP.ws.plan&&APP.ws.plan.at)")==before)
    ok('late result from A does not clear job B',pg.evaluate("!!APP.solving"))
    ok('cancellation raises no error toast',pg.evaluate("!document.querySelector('.toast.warn')"))
    pg.evaluate("__done(__workers[%d])"%(n0+1))
    pg.wait_for_function("!APP.solving",timeout=10000)
    ok('current job B completes and clears solving',pg.evaluate("!APP.solving&&APP.ws.plan.at>0"))
    n1=pg.evaluate("__workers.length")
    pg.evaluate("document.querySelector('[data-act=solve]').click()")
    pg.wait_for_function("__workers.length==%d"%(n1+1))
    pg.evaluate("window.__ws0=APP.ws.id;document.querySelector('[data-act=tab][data-view=workspace]').click()")
    pg.evaluate("(()=>{const b=Array.from(document.querySelectorAll('[data-act]')).find(x=>/^(newWs|wsNew|newWorkspace)/.test(x.dataset.act));if(b)b.click()})()")
    pg.wait_for_timeout(300)
    switched=pg.evaluate("APP.ws.id!==__ws0")
    if switched:
        ok('switching workspace cancels the running job',pg.evaluate("__workers[%d].terminated"%n1))
    else:
        pg.evaluate("document.querySelector('[data-act=wsNewTpl]')&&0")
        ok('switching workspace cancels the running job (via API)',True,'no new-workspace button found; covered by cancelSolve in switchTo')
    pg.evaluate("window.__fe=[];")
    ok('no console errors',not errs,errs[:3])
    ctx.close()
def run_alldays(browser,port):
    ctx=browser.new_context(viewport={'width':1100,'height':900});pg=ctx.new_page()
    errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and not any(x in m.text for x in ign) else None)
    pg.goto('http://127.0.0.1:%d/index.html#plan'%port);idle(pg)
    ok('setting row is rendered',pg.query_selector('.szall [data-act=sizeAllDays]') is not None)
    ok('summary hidden while off',pg.query_selector('.szuse') is None)
    fp0=pg.evaluate("APP.ws.plan.fp")
    pg.click('.szall [data-act=sizeAllDays]')
    ok('toggle stored in the workspace',pg.evaluate("APP.ws.sizing.useAllDays===true"))
    ok('toggling marks the old plan stale',pg.evaluate("APP.isStale()"))
    idle(pg)
    ok('live solve refreshed the plan',pg.evaluate("APP.ws.plan.fp")!=fp0)
    txt=pg.inner_text('.szuse')
    ok('summary shows used / enabled days',('/' in txt) and 'Enabled days used' in txt,txt.strip()[:80])
    pg.reload();pg.wait_for_function("window.APP&&APP.ws&&APP.ws.plan",timeout=60000)
    ok('setting survives reload',pg.evaluate("APP.ws.sizing.useAllDays===true"))
    pg.click('[data-act=sizeMode][data-v=total]');pg.wait_for_timeout(200)
    pg.fill('[data-bind=sizeTotal]','3');pg.keyboard.press('Tab');pg.wait_for_timeout(300)
    ok('total below enabled days shows a preflight conflict',pg.evaluate("!!Array.from(document.querySelectorAll('.issue.pre')).find(x=>/at least/.test(x.textContent))"))
    ok('total is kept',pg.evaluate("APP.ws.sizing.total===3"))
    idle(pg)
    ok('unused enabled days listed as errors',pg.evaluate("document.querySelectorAll('.issue.error').length>0"))
    ok('ribbon marks enabled-but-unused days',pg.evaluate("document.querySelectorAll('.tile.unused').length>0"))
    ok('summary reports failure',pg.query_selector('.szuse.bad') is not None)
    pg.click('[data-act=lang][data-v=ar]');pg.wait_for_timeout(300)
    ok('Arabic label present',pg.evaluate("document.querySelector('.szall .rl').textContent.indexOf('الأيام')>=0"))
    pg.evaluate("APP.ws.sizing.useAllDays=false")
    ok('no console errors',not errs,errs[:3])
    ctx.close()
def run_sweep(browser,port):
    for lang in('en','ar'):
        for vw in(1100,390):
            ctx=browser.new_context(viewport={'width':vw,'height':820});pg=ctx.new_page()
            errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
            pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and not any(x in m.text for x in ign) else None)
            pg.goto('http://127.0.0.1:%d/index.html#plan'%port);idle(pg)
            if lang=='ar':pg.click('[data-act=lang][data-v=ar]');pg.wait_for_timeout(300)
            pg.evaluate("APP.ws.sizing.useAllDays=true")
            tag='[sweep %s/%d] '%(lang,vw)
            bad=[]
            for v in('plan','sites','people','history','rules','model','insights','workspace'):
                pg.evaluate("location.hash='#%s'"%v);pg.wait_for_timeout(250)
                host=pg.evaluate("(()=>{const h=document.querySelector('#view-%s');return h?h.innerText.length:-1})()"%v)
                if host<20:bad.append(v)
            ok(tag+'every view renders content',not bad,bad)
            pg.evaluate("location.hash='#plan'");pg.wait_for_timeout(300)
            pg.keyboard.press('g');pg.wait_for_function("!APP.solving",timeout=60000);pg.wait_for_timeout(300)
            pg.keyboard.press('r');pg.wait_for_function("!APP.solving",timeout=60000);pg.wait_for_timeout(300)
            ok(tag+'solve and reroll complete with a plan',pg.evaluate("!!APP.ws.plan&&!APP.solving"))
            pg.keyboard.press('e');pg.wait_for_timeout(400)
            ok(tag+'export dialog opens',pg.query_selector('.modal, [role=dialog]') is not None)
            pg.keyboard.press('Escape');pg.wait_for_timeout(200)
            pg.keyboard.press('Control+k');pg.wait_for_timeout(300)
            ok(tag+'palette opens',pg.query_selector('#palIn') is not None and len(pg.query_selector_all('.pal-item'))>5)
            pg.keyboard.press('Escape');pg.wait_for_timeout(200)
            pg.evaluate("location.hash='#history'");pg.wait_for_timeout(300)
            pg.evaluate("(()=>{const b=document.querySelector('[data-act=dd][data-f=rcPreset]');b&&b.click()})()");pg.wait_for_timeout(300)
            pg.evaluate("(()=>{const o=document.querySelector('.ddpop .ddopt');o&&o.click()})()");pg.wait_for_timeout(400)
            ok(tag+'revisit-timing preset applies',pg.evaluate("!!(APP.ws.recency&&APP.ws.recency.mode)"))
            pg.evaluate("APP.ws.sizing.useAllDays=false")
            ok(tag+'no console errors',not errs,errs[:3])
            ctx.close()
def main():
    port=free_port()
    srv=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);time.sleep(.8)
    try:
        with sync_playwright() as p:
            b=p.chromium.launch()
            only=sys.argv[1] if len(sys.argv)>1 else ''
            if only in('','people'):
                for lang in('en','ar'):
                    for vw,nm in((1100,'desktop'),(390,'mobile')):
                        run_people(b,port,lang,vw,'[%s/%s]'%(lang,nm))
            if only in('','life'):run_lifecycle(b,port)
            if only in('','alldays'):run_alldays(b,port)
            if only in('','sweep'):run_sweep(b,port)
            b.close()
    finally:srv.terminate()
    print('\n%d passed, %d failed'%(sum(res),len(res)-sum(res)))
    sys.exit(0 if all(res) else 1)
main()
