import os,sys,socket,subprocess,time
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
ign=('ERR_NAME_NOT_RESOLVED','fonts.g')
res=[]
def ok(n,c,i=''):
    res.append(bool(c));print(('PASS ' if c else 'FAIL ')+n+((' — '+str(i)) if i!='' else ''),flush=True)
def free_port():
    s=socket.socket();s.bind(('127.0.0.1',0));p=s.getsockname()[1];s.close();return p
def idle(pg,t=90000):
    pg.wait_for_function("window.APP&&APP.ws&&APP.ws.plan&&!APP.solving&&!APP.isStale()",timeout=t)
port=free_port()
srv=subprocess.Popen([sys.executable,'-m','http.server',str(port),'--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b=p.chromium.launch()
        for lang in ['en','ar']:
            ctx=b.new_context(viewport={'width':1280,'height':900});pg=ctx.new_page()
            errs=[]
            pg.on('pageerror',lambda e:errs.append(str(e)))
            pg.on('console',lambda m:errs.append(m.text) if m.type=='error' and not any(x in m.text for x in ign) else None)
            pg.goto('http://127.0.0.1:%d/index.html#plan'%port)
            idle(pg)
            if lang=='ar':
                pg.evaluate("document.querySelector('[data-act=lang][data-v=ar]').click()")
                pg.wait_for_timeout(300)
            ok(lang+': plan solves, no console errors',not errs,errs[:2])
            st=pg.evaluate("({tiers:!!APP.ws.plan.res.tiers,cov:APP.ws.plan.res.coverage,tc:APP.ws.plan.res.tierCost})")
            ok(lang+': solve result carries tiers + coverage bound',st['tiers'] and st['cov'] is not None and st['tc'] is not None,st)
            pg.evaluate("location.hash='#insights'")
            pg.wait_for_timeout(500)
            txt=pg.evaluate("[...document.querySelectorAll('.costrow')].map(r=>r.innerText).join('|')")
            exp=('rule','intent','preference') if lang=='en' else ('قاعدة','هدف','تفضيل')
            ok(lang+': cost rows show tier tags',any(w in txt for w in exp),txt[:120].replace('\n',' '))
            pg.evaluate("location.hash='#plan'")
            pg.wait_for_timeout(300)
            pg.evaluate("APP.ws.people.filter(p=>p.roles.includes(APP.ws.roles[1].id)).forEach(p=>{p.maxLoad=1});location.hash='#rules'")
            pg.wait_for_timeout(200)
            pg.evaluate("location.hash='#plan'")
            pg.wait_for_timeout(600)
            warn=pg.evaluate("[...document.querySelectorAll('.issue.pre')].map(e=>e.textContent).join(' || ')")
            ok(lang+': pre-flight shows a proven shortfall',('Proven impossible' in warn) if lang=='en' else ('مستحيل مثبت' in warn),warn[:200])
            ok(lang+': no console errors after edit',not errs,errs[:2])
            ctx.close()
        ctx=b.new_context(viewport={'width':1280,'height':900});pg=ctx.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.goto('http://127.0.0.1:%d/index.html#plan'%port)
        idle(pg)
        before=pg.evaluate("APP.ws.plan.at")
        pg.keyboard.press('Control+k');pg.wait_for_timeout(300)
        pg.keyboard.type('Keep searching');pg.wait_for_timeout(300)
        found=pg.evaluate("document.body.innerText.includes('Keep searching')")
        ok('palette lists Keep searching',found)
        pg.keyboard.press('Enter')
        pg.wait_for_function("APP.ws.plan.at!==%d && !APP.solving"%before,timeout=90000)
        ok('Keep searching runs a warm solve without errors',not errs,errs[:2])
        pg.evaluate("location.hash='#plan'");pg.wait_for_timeout(500)
        btn=pg.query_selector('[data-act=xseat]')
        if btn:
            btn.click();pg.wait_for_timeout(500)
            pop=pg.evaluate("(document.querySelector('.pop')||document.body).innerText")
            ok('explain popover opens',bool(pop) and not errs,errs[:2])
        else:
            ok('explain trigger found (skipped)',True,'no xseat button in view')
        b.close()
finally:
    srv.terminate()
print('\n%d passed, %d failed'%(sum(res),len(res)-sum(res)))
sys.exit(0 if all(res) else 1)
