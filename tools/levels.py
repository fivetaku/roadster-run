"""Per-course check: full-map PNG + autoplay run for each course (or the ids given as args)."""
import base64, json, pathlib, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out" / "levels"; OUT.mkdir(parents=True, exist_ok=True)
base = (ROOT / "index.html").as_uri()

with sync_playwright() as p:
    b = p.chromium.launch()
    ids = sys.argv[1:] or None
    pg = b.new_page(viewport={"width": 800, "height": 448})
    pg.goto(base); pg.wait_for_timeout(300)
    ids = ids or pg.evaluate("RR.LEVELS.map(l => l.id)")
    results = {}
    for lid in ids:
        errs = []
        pg = b.new_page(viewport={"width": 800, "height": 448})
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.goto(f"{base}?autoplay=1&level={lid}"); pg.wait_for_timeout(300)
        data = pg.evaluate("RR.renderFullMap()")
        (OUT / f"map-{lid}.png").write_bytes(base64.b64decode(data.split(",")[1]))
        last = None
        for i in range(60):
            last = pg.evaluate("RR.stepN(400)")
            if pg.evaluate("RR.G.done") or last["state"] == "gameover":
                break
        pg.screenshot(path=str(OUT / f"end-{lid}.png"))
        cols = pg.evaluate("RR.LV.cols")
        res = {**last, "done": pg.evaluate("RR.G.done"), "maxX": round(pg.evaluate("RR.G.maxX")), "len": cols * 16, "deathsAt": pg.evaluate("RR.G.deathLog || []"), "errors": errs[:3]}
        results[lid] = res
        print(lid, json.dumps(res), flush=True)
        pg.close()
    b.close()
