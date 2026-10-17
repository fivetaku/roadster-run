"""Record one autoplay video per course WITH game audio (music + SFX) to out/courses/<id>.mp4.

Video comes from Playwright's recorder; audio is captured inside the page from the game's own
audio graph (RR.tapAudio -> MediaRecorder) and muxed with ffmpeg, offset by the recorder start time.
"""
import base64, pathlib, shutil, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "out" / "courses"; OUT.mkdir(parents=True, exist_ok=True)
TMP = ROOT / "out" / "video-tmp"

with sync_playwright() as p:
    b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
    ids = sys.argv[1:]
    if not ids:
        pg = b.new_page(); pg.goto((ROOT / "index.html").as_uri()); ids = pg.evaluate("RR.LEVELS.map(l => l.id)"); pg.close()
    for lid in ids:
        shutil.rmtree(TMP, ignore_errors=True)
        ctx = b.new_context(viewport={"width": 800, "height": 448}, record_video_dir=str(TMP), record_video_size={"width": 800, "height": 448})
        pg = ctx.new_page()
        pg.goto((ROOT / "index.html").as_uri() + f"?autoplay=1&level={lid}")
        pg.evaluate("""() => {
          const rec = new MediaRecorder(RR.tapAudio(), { mimeType: 'audio/webm' });
          window.__chunks = []; rec.ondataavailable = e => window.__chunks.push(e.data);
          window.__recStart = performance.now(); rec.start(250); window.__rec = rec;
        }""")
        pg.wait_for_function("RR.G.done === true", timeout=300000, polling=250)
        pg.wait_for_timeout(600)
        audio_b64 = pg.evaluate("""() => new Promise(res => {
          window.__rec.onstop = async () => {
            const buf = await new Blob(window.__chunks, { type: 'audio/webm' }).arrayBuffer();
            let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode(...u.subarray(i, i + 8192));
            res(btoa(bin));
          };
          window.__rec.stop();
        })""")
        offset = pg.evaluate("window.__recStart") / 1000
        stats = pg.evaluate("({score: RR.G.score, deaths: RR.G.deaths})")
        webm = pg.video.path(); ctx.close()
        wav = TMP / "audio.webm"; wav.write_bytes(base64.b64decode(audio_b64))
        mp4 = OUT / f"{lid}.mp4"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", webm, "-itsoffset", f"{offset:.3f}", "-i", str(wav),
                        "-map", "0:v", "-map", "1:a", "-vf", "fps=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "21",
                        "-c:a", "aac", "-b:a", "160k", "-shortest", str(mp4)], check=True)
        print(lid, stats, f"audio offset {offset:.2f}s", mp4, flush=True)
    b.close()
