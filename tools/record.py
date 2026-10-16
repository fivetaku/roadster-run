"""Record a real-time autoplay run to out/volt-roadster-full-run.mp4 (video only; headless capture has no audio)."""
import pathlib, shutil, subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out"; OUT.mkdir(exist_ok=True)
VID = OUT / "video"; shutil.rmtree(VID, ignore_errors=True)
url = (ROOT / "index.html").as_uri() + "?autoplay=1"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 800, "height": 448}, record_video_dir=str(VID),
                        record_video_size={"width": 800, "height": 448})
    pg = ctx.new_page()
    pg.goto(url)
    pg.wait_for_function("RR.G.done === true", timeout=420000, polling=500)
    pg.wait_for_timeout(800)
    stats = pg.evaluate("({score: RR.G.score, deaths: RR.G.deaths, frames: RR.G.frame})")
    webm = pg.video.path()
    ctx.close(); b.close()

mp4 = OUT / "volt-roadster-full-run.mp4"
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", webm, "-vf", "fps=30",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", str(mp4)], check=True)
print(stats, mp4)
