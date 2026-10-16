"""Run a course with autoplay until the first death; save the death frame and a short trace."""
import pathlib, sys, json
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out" / "levels"; OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    for lid in sys.argv[1:]:
        pg = b.new_page(viewport={"width": 800, "height": 448})
        pg.goto((ROOT / "index.html").as_uri() + f"?autoplay=1&level={lid}"); pg.wait_for_timeout(200)
        tr = pg.evaluate("""() => { const t = []; for (let i = 0; i < 20000; i++) { RR.stepN(1); const P = RR.P, G = RR.G;
            t.push([G.state, Math.round(P.x), Math.round(P.y), +P.vx.toFixed(1), +P.vy.toFixed(1), P.onGround ? 'g' : 'a', P.jumps, P.onLift ? 'L' : '',
              RR.enemies.filter(e => e.alive && Math.abs(e.x - P.x) < 120).map(e => e.t[0] + Math.round(e.x) + ',' + Math.round(e.y)).join(' ')].join(' '));
            if (G.state === 'dying' || G.state === 'clear') break; } return t.slice(-40).filter((_, k) => k % 3 === 0); }""")
        pg.screenshot(path=str(OUT / f"death-{lid}.png"))
        print(lid); print("\n".join(tr))
        pg.close()
    b.close()
