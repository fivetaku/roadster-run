import sys, pathlib
from playwright.sync_api import sync_playwright
u=pathlib.Path(__file__).resolve().parent.parent.joinpath('index.html').as_uri()+'?autoplay=1'
skip=int(sys.argv[1]) if len(sys.argv)>1 else 70; n=int(sys.argv[2]) if len(sys.argv)>2 else 400; every=int(sys.argv[3]) if len(sys.argv)>3 else 6
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":800,"height":448}); pg.goto(u); pg.wait_for_timeout(200)
    pg.evaluate(f"RR.stepN({skip})")
    for i in range(n):
        s=pg.evaluate("(()=>{RR.stepN(1);const P=RR.P;return [RR.G.state,+P.x.toFixed(1),+P.y.toFixed(1),+P.vx.toFixed(2),+P.vy.toFixed(2),P.onGround,P.jumps,P.charged,P.rocket,RR.enemies.filter(e=>e.alive).map(e=>e.t[0]+(e.x|0)+','+(e.y|0)).join(' ')]})()")
        if i%every==0 or s[0]!='play': print(i,s)
        if s[0]!='play': pg.screenshot(path='out/death.png'); break
    b.close()
