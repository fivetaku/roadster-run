"""Render one loop of the theme offline to out/volt-roadster-theme.wav and report levels."""
import base64, pathlib
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto((ROOT / "index.html").as_uri()); pg.wait_for_timeout(300)
    res = pg.evaluate("""async () => {
      const sr = 44100, secs = Music.STEPS * 0.1 + 0.4, oc = new OfflineAudioContext(1, Math.ceil(sr * secs), sr);
      Music.renderTo(oc, 1);
      const buf = await oc.startRendering(), d = buf.getChannelData(0);
      let peak = 0, sum = 0; for (const v of d) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
      const pcm = new DataView(new ArrayBuffer(44 + d.length * 2)), w = (o, s) => [...s].forEach((c, i) => pcm.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); pcm.setUint32(4, 36 + d.length * 2, true); w(8, 'WAVEfmt '); pcm.setUint32(16, 16, true); pcm.setUint16(20, 1, true);
      pcm.setUint16(22, 1, true); pcm.setUint32(24, sr, true); pcm.setUint32(28, sr * 2, true); pcm.setUint16(32, 2, true); pcm.setUint16(34, 16, true);
      w(36, 'data'); pcm.setUint32(40, d.length * 2, true);
      const k = 0.9 / Math.max(peak, 1e-6) < 1 ? 0.9 / peak : 1;
      d.forEach((v, i) => pcm.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v * k)) * 32767, true));
      let bin = ''; const u = new Uint8Array(pcm.buffer); for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode(...u.subarray(i, i + 8192));
      return { secs: buf.duration, peak, rms: Math.sqrt(sum / d.length), wav: btoa(bin) };
    }""")
    (ROOT / "out" / "volt-roadster-theme.wav").write_bytes(base64.b64decode(res.pop("wav")))
    print(res, errs); b.close()
