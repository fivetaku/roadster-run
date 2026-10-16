// VOLT ROADSTER — original 4-channel chiptune ("Desert Highway"), synthesized with Web Audio.
// Channels: pulse lead (25% duty), pulse arpeggio (12.5%), triangle bass, noise drums.
'use strict';

const Music = (() => {
  // ---- composition: 16 bars, 8th-note grid. '-' holds, '.' rests.
  const LEAD = [
    'E5 . G5 . C6 - B5 G5', 'A5 - E5 . A5 C6 B5 A5', 'F5 . A5 . C6 - A5 F5', 'G5 - D5 . G5 - B5 -',
    'E5 . G5 . C6 - E6 D6', 'C6 - A5 . E5 . A5 B5', 'C6 . A5 F5 B5 . G5 D5', 'C6 - - . G5 E5 C5 .',
    'A5 A5 . A5 C6 . A5 .', 'B5 B5 . B5 D6 . B5 .', 'G5 . B5 . E6 - D6 B5', 'C6 - - A5 E5 - - .',
    'F5 A5 C6 F6 E6 - C6 .', 'D6 B5 G5 D6 C6 - B5 .', 'A5 C6 E6 - D6 C6 B5 A5', 'G5 . B5 . D6 . G6 -',
  ];
  // one chord per half-bar: [root, third, fifth]
  const CH = {
    C: ['C', 'E', 'G'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], G: ['G', 'B', 'D'], Em: ['E', 'G', 'B'],
  };
  const CHORDS = [
    'C C', 'Am Am', 'F F', 'G G', 'C C', 'Am Am', 'F G', 'C C',
    'F F', 'G G', 'Em Em', 'Am Am', 'F F', 'G G', 'Am Am', 'G G',
  ];
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = s => NOTE[s[0]] + (s[1] === '#' ? 1 : 0) + 12 * (+s[s.length - 1] + 1);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  // flatten to 16th-note steps
  const STEPS = 16 * LEAD.length;
  const lead = [];
  LEAD.forEach(bar => bar.split(' ').forEach(t => { lead.push(t, '-'); }));
  // resolve note lengths (in 16ths)
  const leadEv = [];
  for (let i = 0; i < lead.length; i++) {
    const t = lead[i];
    if (t === '-' || t === '.') continue;
    let len = 1; while (i + len < lead.length && lead[i + len] === '-') len++;
    leadEv[i] = { m: midi(t), len };
  }
  const chordAt = step => CH[CHORDS[step >> 4].split(' ')[(step >> 3) & 1]];

  // ---- synth
  let ac = null, out = null, noise = null, waves = {};
  let playing = false, nextT = 0, step = 0, timer = 0, tempo = 1, gain = 0.9;
  function pulse(duty) {
    if (waves[duty]) return waves[duty];
    const n = 64, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return (waves[duty] = ac.createPeriodicWave(re, im));
  }
  function init(ctx) {
    if (ac) return;
    ac = ctx; out = ac.createGain(); out.gain.value = gain; out.connect(ac.destination);
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
  function schedule(i, t, sx) {
    const s = i % STEPS;
    // lead
    const e = leadEv[s];
    if (e) osc(t, hz(e.m), e.len * sx * 0.95, 0.1, 0.25);
    // arpeggio: chord tones cycling in 16ths, an octave below the lead
    const ch = chordAt(s), arp = [0, 1, 2, 1][s % 4];
    osc(t, hz(midi(ch[arp] + '4')), sx * 0.8, 0.035, 0.125);
    // bass: octave-bouncing root on 8ths
    if (s % 2 === 0) osc(t, hz(midi(ch[0] + (s % 4 ? '3' : '2'))), sx * 1.7, 0.16, 'triangle');
    // drums: kick on beats 1/3, snare on 2/4, closed hat on 8ths, fill on the last bar
    const b = s % 16, fill = (s >> 4) === LEAD.length - 1 && b >= 12;
    if (b === 0 || b === 8 || (b === 10 && (s >> 4) % 2)) osc(t, 150, 0.12, 0.14, 'sine', 45);
    if (b === 4 || b === 12 || fill) hit(t, fill ? 0.06 : 0.12, fill ? 0.09 : 0.13, 1200);
    if (s % 2 === 0) hit(t, 0.03, 0.035, 7000);
  }
  function pump() {
    if (!playing) return;
    const sx = 0.1 / tempo; // 150 BPM 16ths
    while (nextT < ac.currentTime + 0.15) { schedule(step, nextT, sx); nextT += sx; step++; }
  }

  return {
    STEPS,
    start(ctx) {
      init(ctx);
      if (playing) return;
      playing = true; step = 0; tempo = 1; nextT = ac.currentTime + 0.05;
      out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(gain, ac.currentTime);
      pump(); timer = setInterval(pump, 25);
    },
    stop() {
      playing = false; clearInterval(timer);
      if (out) { out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(out.gain.value, ac.currentTime); out.gain.linearRampToValueAtTime(0, ac.currentTime + 0.08); }
    },
    hurry() { tempo = 1.3; },
    get playing() { return playing; },
    setMuted(m) { gain = m ? 0 : 0.9; if (out) out.gain.setValueAtTime(gain, ac.currentTime); },
    // offline render for checks / exporting a preview file
    renderTo(ctx, loops = 1) { init(ctx); const sx = 0.1; for (let i = 0; i < STEPS * loops; i++) schedule(i, 0.05 + i * sx, sx); },
  };
})();
