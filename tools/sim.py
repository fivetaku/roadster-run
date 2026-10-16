"""Headless check: run autoplay fast, log progress, save full-map PNG and a few frames."""
import base64, json, sys, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"; OUT.mkdir(exist_ok=True)
url = (ROOT / "index.html").as_uri() + "?autoplay=1"

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 800, "height": 448})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
    pg.goto(url); pg.wait_for_timeout(300)
    data = pg.evaluate("RR.renderFullMap()")
    (OUT / "fullmap.png").write_bytes(base64.b64decode(data.split(",")[1]))
    log, shots = [], 0
    for i in range(80):
        s = pg.evaluate("RR.stepN(300)")
        log.append(s)
        print(json.dumps(s))
        if i % 6 == 3 and shots < 6:
            pg.screenshot(path=str(OUT / f"frame-{shots}.png")); shots += 1
        if s["state"] in ("gameover",) or pg.evaluate("RR.G.done"):
            break
    pg.screenshot(path=str(OUT / "final.png"))
    print("maxX", pg.evaluate("RR.G.maxX"), "done", pg.evaluate("RR.G.done"), "errors", errs)
    b.close()
