// VOLT ROADSTER — original 4-channel chiptunes, synthesized with Web Audio.
// Channels: pulse lead, pulse arpeggio/stabs, triangle bass, noise drums.
'use strict';

const Music = (() => {
  // ---- songs. Lead/riff bars are written on an 8th-note grid ('-' holds, '.' rests);
  // chords are one per bar, or two per bar separated by a space.
  const SONGS = {
    // 1-1 / 2-1 — bright major cruise
    highway: {
      bpm: 150, spb: 16, duty: 0.25, vol: 0.1, arp: true, bass: 'bounce', fill: true,
      drums: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
      lead: [
        'E5 . G5 . C6 - B5 G5', 'A5 - E5 . A5 C6 B5 A5', 'F5 . A5 . C6 - A5 F5', 'G5 - D5 . G5 - B5 -',
        'E5 . G5 . C6 - E6 D6', 'C6 - A5 . E5 . A5 B5', 'C6 . A5 F5 B5 . G5 D5', 'C6 - - . G5 E5 C5 .',
        'A5 A5 . A5 C6 . A5 .', 'B5 B5 . B5 D6 . B5 .', 'G5 . B5 . E6 - D6 B5', 'C6 - - A5 E5 - - .',
        'F5 A5 C6 F6 E6 - C6 .', 'D6 B5 G5 D6 C6 - B5 .', 'A5 C6 E6 - D6 C6 B5 A5', 'G5 . B5 . D6 . G6 -',
      ],
      chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F G', 'C', 'F', 'G', 'Em', 'Am', 'F', 'G', 'Am', 'G'],
    },
    // 1-2 / 2-2 — bass-led groove for the underground garage
    tunnel: {
      bpm: 132, spb: 16, duty: 0.125, vol: 0.08, arp: false, bass: 'riff', fill: false,
      drums: { k: 'x.....x...x.....', s: '....x.......x...', h: '..x...x...x...x.' },
      riff: ['E2 . E3 . D3 . B2 .', 'G2 . A2 . B2 . D3 B2', 'C3 . C4 . B3 . G3 .', 'A2 . B2 . D3 . E3 .'],
      lead: [
        '. . E5 . . . G5 .', '. . A5 G5 E5 . . .', '. . E5 . . . G5 .', '. . B5 A5 G5 . E5 .',
        '. . C6 . B5 . G5 .', 'A5 . . . . . . .', 'B5 . D6 . B5 . A5 .', 'G5 - - . E5 - - .',
      ],
      chords: ['Em', 'G', 'C', 'D', 'Em', 'G', 'C', 'D'],
    },
    // 1-3 / 2-3 — night waltz over the neon skyway (3/4)
    night: {
      bpm: 112, spb: 12, duty: 0.5, vol: 0.08, arp: false, bass: 'waltz', fill: false,
      drums: { k: 'x...........', s: '............', h: '....x...x...' },
      lead: [
        'E5 - - - A5 B5', 'C6 - - - B5 A5', 'G5 - - - E5 G5', 'D5 - - - - .',
        'E5 - - - A5 B5', 'C6 - - - D6 E6', 'B5 - - - G#5 B5', 'E6 - - - - .',
        'A5 - C6 - F6 -', 'D6 - - - B5 G5', 'E6 - D6 - B5 -', 'C6 - - - A5 .',
        'F5 - A5 - D6 -', 'B5 - - - G5 B5', 'E6 - D6 - C6 G5', 'G#5 - - - B5 .',
      ],
      chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'E', 'E', 'F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'E'],
    },
    // 1-4 / 2-4 — driving minor for the gigafactory and the boss
    factory: {
      bpm: 168, spb: 16, duty: 0.25, vol: 0.09, arp: true, bass: 'drive', fill: true,
      drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
      lead: [
        'D5 . D5 F5 A5 . G5 F5', 'E5 . C5 . D5 - - .', 'D5 . D5 F5 Bb5 . A5 G5', 'G5 . E5 . C5 - - .',
        'A5 . A5 C6 D6 . C6 A5', 'Bb5 . A5 . F5 - - .', 'G5 . Bb5 . D6 . C6 Bb5', 'A5 - C#6 - E6 - A5 .',
      ],
      chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A'],
    },
  };

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(s) {
    let n = NOTE[s[0]], i = 1;
    if (s[1] === '#') { n++; i++; } else if (s[1] === 'b') { n--; i++; }
    return n + 12 * (+s.slice(i) + 1);
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function chordPCs(name) {
    const m = name.match(/^([A-G][#b]?)(m?)$/), root = ((midi(m[1] + '4') % 12) + 12) % 12;
    return [root, root + (m[2] ? 3 : 4), root + 7];
  }
  // expand 8th-note bars to 16th steps and resolve note lengths
  function events(bars) {
    const steps = [];
    bars.forEach(b => b.split(' ').forEach(t => steps.push(t, '-')));
    const ev = [];
    for (let i = 0; i < steps.length; i++) {
      const t = steps[i]; if (t === '-' || t === '.') continue;
      let len = 1; while (i + len < steps.length && steps[i + len] === '-') len++;
      ev[i] = { m: midi(t), len };
    }
    return ev;
  }
  for (const s of Object.values(SONGS)) {
    s.steps = s.spb * s.lead.length;
    s.leadEv = events(s.lead);
    if (s.riff) { s.riffEv = events(s.riff); s.riffSteps = s.spb * s.riff.length; }
    s.chordAt = step => {
      const parts = s.chords[Math.floor(step / s.spb) % s.chords.length].split(' ');
      return chordPCs(parts[parts.length > 1 && (step % s.spb) >= s.spb / 2 ? 1 : 0]);
    };
  }

  // ---- synth
  let ac = null, out = null, noise = null, waves = {}, taps = [];
  let song = SONGS.highway, playing = false, nextT = 0, step = 0, timer = 0, tempo = 1, gain = 0.55;
  function pulse(duty) {
    if (waves[duty]) return waves[duty];
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return (waves[duty] = ac.createPeriodicWave(re, im));
  }
  function init(ctx) {
    if (ac === ctx) return;
    ac = ctx; waves = {};
    out = ac.createGain(); out.gain.value = gain; out.connect(ac.destination);
    taps.forEach(n => n.context === ac && out.connect(n));
    const len = ac.sampleRate * 0.5, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    noise = buf;
  }
  function osc(t, f, dur, vol, wave, slideTo) {
    const o = ac.createOscillator(), g = ac.createGain();
    if (typeof wave === 'number') o.setPeriodicWave(pulse(wave)); else o.type = wave;
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  function hit(t, dur, vol, hp) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + dur + 0.02);
  }
  function schedule(S, i, t, sx) {
    const s = i % S.steps, b = s % S.spb, ch = S.chordAt(s);
    const e = S.leadEv[s];
    if (e) osc(t, hz(e.m), e.len * sx * 0.95, S.vol, S.duty);
    if (S.arp) osc(t, hz(60 + ch[[0, 1, 2, 1][s % 4]]), sx * 0.8, 0.035, 0.125);
    // bass
    if (S.bass === 'bounce' && s % 2 === 0) osc(t, hz(36 + ch[0] + (s % 4 ? 12 : 0)), sx * 1.7, 0.16, 'triangle');
    if (S.bass === 'drive' && s % 2 === 0) osc(t, hz(36 + ch[0] + (b === 6 || b === 14 ? 7 : 0)), sx * 1.2, 0.17, 'triangle');
    if (S.bass === 'riff') { const r = S.riffEv[i % S.riffSteps]; if (r) osc(t, hz(r.m), r.len * sx * 0.9, 0.2, 'triangle'); }
    if (S.bass === 'waltz') {
      if (b === 0) osc(t, hz(36 + ch[0]), sx * 3.6, 0.17, 'triangle');
      if (b === 4 || b === 8) for (const k of [1, 2]) osc(t, hz(60 + ch[k]), sx * 1.6, 0.03, 0.125);
    }
    // drums (with a snare fill over the last beat of the loop)
    const fill = S.fill && Math.floor(s / S.spb) === S.lead.length - 1 && b >= S.spb - 4;
    if (S.drums.k[b] === 'x') osc(t, 150, 0.12, 0.14, 'sine', 45);
    if (S.drums.s[b] === 'x' || fill) hit(t, fill ? 0.06 : 0.12, fill ? 0.09 : 0.13, 1200);
    if (S.drums.h[b] === 'x') hit(t, 0.03, 0.035, 7000);
  }
  const stepDur = S => 60 / S.bpm / 4;
  function pump() {
    if (!playing) return;
    const sx = stepDur(song) / tempo;
    while (nextT < ac.currentTime + 0.15) { schedule(song, step, nextT, sx); nextT += sx; step++; }
  }

  return {
    SONGS,
    start(ctx, id = 'highway') {
      init(ctx);
      if (playing && song === SONGS[id]) return;
      clearInterval(timer);
      song = SONGS[id] || SONGS.highway;
      playing = true; step = 0; tempo = 1; nextT = ac.currentTime + 0.05;
      out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(gain, ac.currentTime);
      pump(); timer = setInterval(pump, 25);
    },
    stop() {
      playing = false; clearInterval(timer);
      if (out) { out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(out.gain.value, ac.currentTime); out.gain.linearRampToValueAtTime(0, ac.currentTime + 0.08); }
    },
    hurry() { tempo = 1.3; },
    tap(node) { taps.push(node); if (out && node.context === ac) out.connect(node); }, // extra output (recording)
    get playing() { return playing; },
    get song() { return Object.keys(SONGS).find(k => SONGS[k] === song); },
    setMuted(m) { gain = m ? 0 : 0.55; if (out) out.gain.setValueAtTime(gain, ac.currentTime); },
    // offline render of one loop, for checks and exporting preview files
    renderTo(ctx, id) {
      init(ctx); const S = SONGS[id], sx = stepDur(S);
      for (let i = 0; i < S.steps; i++) schedule(S, i, 0.05 + i * sx, sx);
      return S.steps * sx + 0.4;
    },
  };
})();
