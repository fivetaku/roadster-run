// ROADSTER RUN — original 8-bit fan game. All art and sound are drawn/synthesized here.
'use strict';

const W = 400, H = 224, TS = 16, COLS = 220, ROWS = 14;
const ROLL_N = 40; // barrel-roll length in frames
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const params = new URLSearchParams(location.search);
const AUTOPLAY = params.has('autoplay');

// ---------------------------------------------------------------- palette & sprites
const PAL = {
  K: '#14121a', W: '#f2f2ee', S: '#c4c8cf', G: '#7d838d', B: '#b07a40', b: '#5e3b1f',
  y: '#fff3a0', L: '#9ff8ff', T: '#23262d', H: '#7a828e', O: '#ff8c1a', Y: '#ffd31a',
  w: '#ffffff', C: '#35d4ff', R: '#e5432c', Q: '#f2a93b', q: '#b8641c', U: '#8a4b22',
  u: '#5b2f12', g: '#2b8a3e', v: '#5fd068', P: '#ff6a3d',
};

function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function spr(rows, pal = PAL) {
  const w = Math.max(...rows.map(r => r.length)), h = rows.length;
  const c = mk(w, h), x = c.getContext('2d');
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.' && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1); }
  }));
  return c;
}
function flip(src) {
  const c = mk(src.width, src.height), x = c.getContext('2d');
  x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c;
}
function silhouette(src, color) {
  const c = mk(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height); return c;
}

// Roadster body, facing right (nose = LED bar on the right). Wheels drawn separately.
const CAR_BODY = spr([
  '...........KKKKKKKK.............',
  '........KKKbbbbbbbbKKK..........',
  '......KKbbBBBBBBBBBBbbKK........',
  '....KKWKbBBByBBBBBBBBBbbKK......',
  '..KKWWWWKbbbbbbbbbbbbbbbbbKKKK..',
  '.KWWWWWWWWWWWWWWWWWWWWWWWWWWWWKK',
  'KSWWWWWWWWWWWWWWWWWWWWWWWWWWWWLL',
  'KSSWWWWWWWWWWWWWWWWWWWWWWWWWWWLK',
  'KSSSSSSSSSSSSSSSSSSSSSSSSSSSSSKK',
  'KGGKKKKKKGGGGGGGGGGKKKKKKKGGGK..',
  '.KK........KKKKKKKK........KKK..',
]);
const WHEEL = [spr([
  '..TTTTTT..', '.TTTTTTTT.', 'TTTHHHHTTT', 'TTHHTTHHTT', 'TTHTGGTHTT',
  'TTHTGGTHTT', 'TTHHTTHHTT', 'TTTHHHHTTT', '.TTTTTTTT.', '..TTTTTT..',
]), spr([
  '..TTTTTT..', '.TTTTTTTT.', 'TTTHTTHTTT', 'TTHHHHHHTT', 'TTTHGGHTTT',
  'TTTHGGHTTT', 'TTHHHHHHTT', 'TTTHTTHTTT', '.TTTTTTTT.', '..TTTTTT..',
])];
// full car composite (32x16) per wheel frame, both facings, plus glow silhouettes
function buildCar(frame) {
  const c = mk(32, 16), x = c.getContext('2d');
  x.drawImage(CAR_BODY, 0, 2);
  x.drawImage(WHEEL[frame], 3, 6); x.drawImage(WHEEL[frame], 19, 6);
  return c;
}
const CAR = [buildCar(0), buildCar(1)];
const CAR_L = CAR.map(flip);
const CAR_GLOW = CAR.map(c => silhouette(c, '#35d4ff'));
const CAR_GLOW_L = CAR_L.map(c => silhouette(c, '#35d4ff'));

const CONE = [0, 1].map(f => spr([
  '.......KK.......',
  '......KOOK......',
  '......KOOK......',
  '.....KwwwwK.....',
  '.....KwwwwK.....',
  '....KOOOOOOK....',
  '...KOKKOOKKOK...',
  '...KOwKOOKwOK...',
  '...KOOOOOOOOK...',
  '..KwwwwwwwwwwK..',
  '..KwwwwwwwwwwK..',
  '.KOOOOOOOOOOOOK.',
  'KKKKKKKKKKKKKKKK',
  'KGGGGGGGGGGGGGGK',
  'KKKKKKKKKKKKKKKK',
  f ? '...KK......KK...' : '.KK..........KK.',
]));
const CONE_FLAT = spr([
  '....KKKKKKKK....',
  '..KOKKOOOOKKOK..',
  '.KwwwwwwwwwwwwK.',
  'KOOOOOOOOOOOOOOK',
  'KKKKKKKKKKKKKKKK',
]);
const DRONE = [0, 1].map(f => spr([
  f ? '.KKK........KKK.' : 'KKKKK......KKKKK',
  '..K..........K..',
  '..K..KKKKKK..K..',
  '..KKKGGGGGGKKK..',
  '.....KGRRGGK....',
  '....KGGGGGGGGK..',
  '....KKKKKKKKKK..',
  '......K....K....',
]));
const BOLT = spr([
  '........KKKKK...',
  '.......KYYYyK...',
  '......KYYYyK....',
  '.....KYYYyK.....',
  '....KYYYYK......',
  '...KYYYYYKKKK...',
  '..KYYYYYYYYYK...',
  '..KKKKKYYYYK....',
  '......KYYYK.....',
  '.....KYYYK......',
  '....KYYK........',
  '...KYYK.........',
  '..KYK...........',
  '..KK............',
]);
const ROCKET = spr([
  '......KK......',
  '.....KwwK.....',
  '....KwCCwK....',
  '....KwCCwK....',
  '....KwwwwK....',
  '....KwwwwK....',
  '...KKwRRwKK...',
  '..KRKwRRwKRK..',
  '..KRKwwwwKRK..',
  '..KKKKKKKKKK..',
  '....KOyyOK....',
  '.....KOOK.....',
  '......KK......',
]);
const CELL = [spr([
  '...KK...', '..KKKK..', '.KKKKKK.', '.KCCCCK.', '.KCwCCK.', '.KCCCCK.', '.KCCCCK.',
  '.KYYYYK.', '.KYwYYK.', '.KYYYYK.', '.KYYYYK.', '.KKKKKK.',
]), spr([
  '...KK...', '...KK...', '..KKKK..', '..KCCK..', '..KwCK..', '..KCCK..', '..KCCK..',
  '..KYYK..', '..KwYK..', '..KYYK..', '..KYYK..', '..KKKK..',
]), spr([
  '...KK...', '...KK...', '...KK...', '...KK...', '...KK...', '...KK...', '...KK...',
  '...KK...', '...KK...', '...KK...', '...KK...', '...KK...',
])];
const CACTUS = spr([
  '....KKK.....', '...KgvgK....', '...KgvgK....', 'K..KgvgK....', 'gK.KgvgK..K.',
  'gK.KgvgK.KgK', 'gKKKgvgK.KgK', 'KggggvgKKKgK', '.KKKgvggggK.', '...KgvgKKK..',
  '...KgvgK....', '...KgvgK....', '...KgvgK....', '..KKKKKKK...',
]);
const Q_ROWS = [
  'KKKKKKKKKKKKKKKK', 'KyyyyyyyyyyyyyqK', 'KyKQQQQQQQQQQKqK', 'KyQQQQuuuuQQQQqK',
  'KyQQQuuQQuuQQQqK', 'KyQQQuuQQuuQQQqK', 'KyQQQQQQQuuQQQqK', 'KyQQQQQQuuQQQQqK',
  'KyQQQQQuuQQQQQqK', 'KyQQQQQuuQQQQQqK', 'KyQQQQQQQQQQQQqK', 'KyQQQQQuuQQQQQqK',
  'KyQQQQQuuQQQQQqK', 'KyKQQQQQQQQQQKqK', 'KqqqqqqqqqqqqqqK', 'KKKKKKKKKKKKKKKK',
];
const QBLOCK = ['#f2a93b', '#ffbf4f', '#d98f2a'].map(c => spr(Q_ROWS, { ...PAL, Q: c }));
const USED = spr(Q_ROWS.map(r => r.replace(/[uQy]/g, 'U').replace(/q/g, 'u')));

function tileCanvas(draw) { const c = mk(16, 16); draw(c.getContext('2d')); return c; }
function rng(seed) { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }
const ROAD = tileCanvas(x => {
  x.fillStyle = '#3a3d44'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#14121a'; x.fillRect(0, 0, 16, 2);
  x.fillStyle = '#9aa0a8'; x.fillRect(0, 2, 16, 1);
  x.fillStyle = '#ffd31a'; x.fillRect(4, 8, 8, 2);
  x.fillStyle = '#2a2c31'; x.fillRect(0, 14, 16, 2);
  const r = rng(7); x.fillStyle = '#4a4e57';
  for (let i = 0; i < 6; i++) x.fillRect((r() * 16) | 0, 3 + ((r() * 10) | 0), 1, 1);
});
const DIRT = tileCanvas(x => {
  x.fillStyle = '#d9a35a'; x.fillRect(0, 0, 16, 16);
  const r = rng(11);
  for (let i = 0; i < 14; i++) { x.fillStyle = r() > .5 ? '#b07a3a' : '#f0c27a'; x.fillRect((r() * 15) | 0, (r() * 15) | 0, 2, 1); }
  x.fillStyle = '#8a5528'; x.fillRect(3, 11, 2, 2); x.fillRect(11, 5, 2, 1);
});
const BRICK = tileCanvas(x => {
  x.fillStyle = '#c8642a'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#6e2c10';
  for (let r = 0; r < 4; r++) {
    x.fillRect(0, r * 4 + 3, 16, 1);
    const off = r % 2 ? 4 : 12; x.fillRect(off, r * 4, 1, 3);
  }
  x.fillStyle = '#ef9a5a';
  for (let r = 0; r < 4; r++) x.fillRect(r % 2 ? 5 : 0, r * 4, r % 2 ? 6 : 11, 1);
  x.fillStyle = '#14121a'; x.strokeStyle = '#14121a'; x.strokeRect(0.5, 0.5, 15, 15);
});
const STONE = tileCanvas(x => {
  x.fillStyle = '#b8643c'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#e09060'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16);
  x.fillStyle = '#6e3418'; x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16);
  x.fillStyle = '#9a4e2c'; x.fillRect(4, 5, 3, 1); x.fillRect(9, 10, 4, 1); x.fillRect(3, 11, 1, 2);
  x.fillStyle = '#d07a4c'; x.fillRect(10, 3, 2, 1);
});

// ---------------------------------------------------------------- pixel font
const F = {
  A: [14,17,17,31,17,17,17], B: [30,17,17,30,17,17,30], C: [14,17,16,16,16,17,14], D: [30,17,17,17,17,17,30],
  E: [31,16,16,30,16,16,31], F: [31,16,16,30,16,16,16], G: [14,17,16,23,17,17,15], H: [17,17,17,31,17,17,17],
  I: [14,4,4,4,4,4,14], J: [7,2,2,2,2,18,12], K: [17,18,20,24,20,18,17], L: [16,16,16,16,16,16,31],
  M: [17,27,21,21,17,17,17], N: [17,17,25,21,19,17,17], O: [14,17,17,17,17,17,14], P: [30,17,17,30,16,16,16],
  Q: [14,17,17,17,21,18,13], R: [30,17,17,30,20,18,17], S: [15,16,16,14,1,1,30], T: [31,4,4,4,4,4,4],
  U: [17,17,17,17,17,17,14], V: [17,17,17,17,17,10,4], W: [17,17,17,21,21,21,10], X: [17,17,10,4,10,17,17],
  Y: [17,17,10,4,4,4,4], Z: [31,1,2,4,8,16,31],
  0: [14,17,19,21,25,17,14], 1: [4,12,4,4,4,4,14], 2: [14,17,1,2,4,8,31], 3: [31,2,4,2,1,17,14],
  4: [2,6,10,18,31,2,2], 5: [31,16,30,1,1,17,14], 6: [6,8,16,30,17,17,14], 7: [31,1,2,4,8,8,8],
  8: [14,17,17,14,17,17,14], 9: [14,17,17,15,1,2,12],
  '-': [0,0,0,31,0,0,0], '+': [0,4,4,31,4,4,0], x: [0,0,17,10,4,10,17], '!': [4,4,4,4,4,0,4],
  ':': [0,12,12,0,12,12,0], '.': [0,0,0,0,0,12,12], '?': [14,17,1,2,4,0,4], '/': [1,1,2,4,8,16,16],
  "'": [4,4,8,0,0,0,0], ' ': [0,0,0,0,0,0,0],
};
function text(str, x, y, color = '#fff', s = 1, shadow = true) {
  if (shadow) text(str, x + s, y + s, '#14121a', s, false);
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of String(str)) {
    const g = F[ch] || F[ch.toUpperCase()] || F[' '];
    for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++)
      if (g[r] & (16 >> b)) ctx.fillRect(cx + b * s, y + r * s, s, s);
    cx += 6 * s;
  }
}
const tw = (str, s = 1) => String(str).length * 6 * s - s;
const ctext = (str, y, color, s = 1) => text(str, Math.round((W - tw(str, s)) / 2), y, color, s);

// ---------------------------------------------------------------- background
function mesaLayer(seed, width, minH, maxH, colTop, colBody, colLine) {
  const c = mk(width, 140), x = c.getContext('2d'), r = rng(seed);
  const hs = []; let i = 0;
  while (i < width / 4) {
    const plateau = 10 + ((r() * 22) | 0), top = minH + ((r() * (maxH - minH)) | 0);
    const valley = 4 + ((r() * 14) | 0), low = 4 + ((r() * 10) | 0);
    for (let k = 0; k < 3; k++) hs[i++] = low + ((top - low) * (k + 1)) / 4;
    for (let k = 0; k < plateau; k++) hs[i++] = top;
    for (let k = 0; k < 3; k++) hs[i++] = top - ((top - low) * (k + 1)) / 4;
    for (let k = 0; k < valley; k++) hs[i++] = low;
  }
  for (let k = 0; k < width / 4; k++) {
    const h = Math.round(hs[k] / 4) * 4;
    x.fillStyle = colBody; x.fillRect(k * 4, 140 - h, 4, h);
    x.fillStyle = colTop; x.fillRect(k * 4, 140 - h, 4, 4);
    if (h > 24) { x.fillStyle = colLine; x.fillRect(k * 4, 140 - h + 12, 4, 2); x.fillRect(k * 4, 140 - h + 26, 4, 2); }
  }
  return c;
}
const FAR = mesaLayer(3, 1200, 30, 92, '#a77aa6', '#8a5a8e', '#7a4c80');
const NEAR = mesaLayer(9, 1200, 14, 60, '#e08a5a', '#c8643c', '#b0532e');
const CLOUD = (() => {
  const c = mk(48, 20), x = c.getContext('2d');
  const blob = (cx, cy, r, col) => { x.fillStyle = col; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) x.fillRect(cx + i, cy + j, 1, 1); };
  [[12, 12, 7], [24, 9, 9], [36, 12, 7]].forEach(([a, b, r]) => blob(a, b + 1, r, '#14121a'));
  [[12, 12, 6], [24, 9, 8], [36, 12, 6]].forEach(([a, b, r]) => blob(a, b, r, '#ffffff'));
  x.fillStyle = '#cfe6ff'; x.fillRect(6, 15, 36, 2);
  return c;
})();

// ---------------------------------------------------------------- level
const SOLID = new Set(['G', 'D', 'B', '?', 'L', 'R', 'U', 'S']);
let grid, entityDefs, decos, GOAL_X, CHECK_X = 100 * TS;
function buildLevel() {
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  entityDefs = []; decos = [];
  const ground = (a, b) => { for (let c = a; c <= b; c++) { grid[12][c] = 'G'; grid[13][c] = 'D'; } };
  const pit = (a, b) => { for (let c = a; c <= b; c++) { grid[12][c] = '.'; grid[13][c] = '.'; } };
  const put = (c, r, s) => [...s].forEach((ch, i) => { grid[r][c + i] = ch; });
  const col = (c, r0, r1, ch = 'S') => { for (let r = r0; r <= r1; r++) grid[r][c] = ch; };
  const up = (c, n) => { for (let i = 0; i < n; i++) col(c + i, 11 - i, 11); };
  const down = (c, n) => { for (let i = 0; i < n; i++) col(c + i, 11 - (n - 1 - i), 11); };
  const e = (t, c, r) => entityDefs.push({ t, c, r });
  const cells = (pts) => pts.forEach(([c, r]) => e('cell', c, r));

  ground(0, COLS - 1);
  // A — start
  put(9, 8, 'BLB'); put(16, 8, '?');
  e('cone', 22, 11); decos.push([3, 'cactus'], [19, 'cactus']);
  // B — blocks
  put(28, 8, 'B?BRB'); put(30, 4, '?');
  e('cone', 36, 11); e('cone', 39, 11);
  col(43, 10, 11); col(48, 9, 11); e('cone', 45, 11);
  decos.push([33, 'cactus']);
  // C — first pits + rocket
  pit(53, 55); cells([[53, 9], [54, 9], [55, 9]]);
  pit(60, 64); put(61, 9, 'SSS'); cells([[61, 8], [62, 8], [63, 8]]);
  e('drone', 68, 9);
  put(70, 8, 'B?B'); decos.push([58, 'cactus'], [75, 'cactus']);
  // D — thruster test
  pit(80, 89); col(84, 10, 13); col(85, 10, 13);
  cells([[80, 7], [81, 6], [82, 5], [83, 4], [86, 4], [87, 5], [88, 6], [89, 7]]);
  up(92, 3); for (let c = 95; c <= 110; c++) col(c, 9, 11);
  e('cone', 101, 8); e('cone', 105, 8); cells([[98, 6], [99, 6], [100, 6]]);
  // E — drones
  pit(118, 120); e('drone', 116, 8); e('drone', 128, 7); e('drone', 138, 8);
  put(124, 8, 'B?BLB?'); cells([[125, 4], [126, 4], [127, 4], [128, 4]]);
  pit(134, 136); cells([[134, 9], [135, 9], [136, 9]]);
  decos.push([113, 'cactus'], [131, 'cactus']);
  // F — pyramid + cone crowd
  up(144, 4); pit(148, 149); down(150, 4);
  e('cone', 157, 11); e('cone', 161, 11);
  put(162, 8, '????'); col(167, 10, 11); e('cone', 170, 11); e('cone', 172, 11);
  put(176, 8, 'BBBBB'); cells([[176, 7], [177, 7], [178, 7], [179, 7], [180, 7]]);
  decos.push([154, 'cactus'], [174, 'cactus']);
  // G — staircase + goal
  up(184, 8);
  GOAL_X = 202 * TS;
  decos.push([197, 'cactus'], [216, 'cactus']);
}

// ---------------------------------------------------------------- audio (synth, original)
let AC = null, muted = false, bgmOn = false, bgmT = 0, bgmStep = 0;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return AC; }
function tone(f, d, type = 'square', v = 0.08, slide = 0, delay = 0) {
  const a = AC; if (!a || muted) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.02);
}
const SFX = {
  jump: () => tone(330, 0.16, 'square', 0.07, 760),
  roll: () => { tone(520, 0.1, 'square', 0.06, 1200); tone(900, 0.12, 'triangle', 0.05, 1500, 0.06); },
  cell: () => { tone(988, 0.06, 'square', 0.06); tone(1319, 0.18, 'square', 0.06, 0, 0.06); },
  bump: () => tone(140, 0.08, 'square', 0.08, 90),
  brk: () => tone(200, 0.2, 'sawtooth', 0.07, 60),
  sprout: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.08, 'square', 0.05, 0, i * 0.05)),
  power: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.09, 'square', 0.06, 0, i * 0.06)),
  stomp: () => tone(600, 0.12, 'square', 0.07, 150),
  hurt: () => tone(400, 0.4, 'square', 0.07, 80),
  die: () => [494, 466, 440, 349, 262].forEach((f, i) => tone(f, 0.16, 'square', 0.07, 0, i * 0.14)),
  thrust: () => tone(90 + Math.random() * 60, 0.05, 'sawtooth', 0.025),
  clear: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.07, 0, i * 0.12)),
  tick: () => tone(1760, 0.03, 'square', 0.03),
};
// original looping chiptune (C mixolydian-ish), 8th notes
const BGM = [60,0,64,67, 72,0,70,67, 65,0,69,72, 70,67,64,0, 60,0,64,67, 72,74,72,67, 65,64,62,64, 60,0,0,0];
const BASS = [36,36,43,43, 41,41,43,43];
function bgmTick() {
  if (!bgmOn || !AC || muted) return;
  if (++bgmT % 9) return;
  const n = BGM[bgmStep % BGM.length], b = BASS[(bgmStep >> 2) % BASS.length];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  if (n) tone(hz(n), 0.12, 'square', 0.025);
  if (bgmStep % 2 === 0) tone(hz(b), 0.14, 'triangle', 0.05);
  bgmStep++;
}

// ---------------------------------------------------------------- input
const keys = { left: false, right: false, jump: false, run: false, start: false };
let prevJump = false, prevStart = false;
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'jump', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
  KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run', Enter: 'start',
};
addEventListener('keydown', e => {
  audio();
  if (e.code === 'KeyM') { muted = !muted; return; }
  const k = KEYMAP[e.code]; if (k) { keys[k] = true; if (k === 'jump') keys.start = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  const k = KEYMAP[e.code]; if (k) { keys[k] = false; if (k === 'jump') keys.start = false; }
});
if ('ontouchstart' in window) {
  document.getElementById('touch').style.display = 'flex';
  document.querySelectorAll('#touch button').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); audio(); keys[k] = true; if (k === 'jump') keys.start = true; };
    const off = e => { e.preventDefault(); keys[k] = false; if (k === 'jump') keys.start = false; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });
  cv.addEventListener('pointerdown', () => { audio(); keys.start = true; setTimeout(() => keys.start = false, 120); });
}

// ---------------------------------------------------------------- game state
const G = {
  state: 'title', frame: 0, score: 0, cells: 0, lives: 3, time: 300, timeF: 0,
  cam: 0, checkpoint: false, stateT: 0, charge: 0, done: false, deaths: 0, maxX: 0,
};
let P, enemies, items, cellsList, parts, pops, bumps, pending;

function resetLevel() {
  buildLevel();
  const startX = G.checkpoint ? CHECK_X : 2 * TS;
  P = {
    x: startX, y: 0, w: 26, h: 14, vx: 0, vy: 0, face: 1, onGround: false,
    charged: false, rocket: false, fuel: 80, inv: 0, wheel: 0, dist: 0,
    air: 0, jumps: 0, roll: 0, holdJ: 0,
  };
  // drop onto the surface below the spawn column
  const c = Math.floor((startX + 8) / TS);
  let r = 0; while (r < ROWS && !SOLID.has(grid[r][c])) r++;
  P.y = r * TS - P.h;
  enemies = []; items = []; parts = []; pops = []; bumps = {};
  cellsList = entityDefs.filter(d => d.t === 'cell').map(d => ({ x: d.c * TS + 4, y: d.r * TS + 2, w: 8, h: 12, alive: true }));
  pending = entityDefs.filter(d => d.t !== 'cell' && !(G.checkpoint && d.c * TS < startX + 112)).map(d => ({ ...d }));
  G.cam = Math.max(0, Math.min(P.x - 140, COLS * TS - W));
  G.time = 300; G.timeF = 0; G.charge = 0;
}
function newGame() { G.score = 0; G.cells = 0; G.lives = 3; G.checkpoint = false; G.done = false; G.deaths = 0; G.maxX = 0; startIntro(); }
function startIntro() { resetLevel(); G.state = 'intro'; G.stateT = 0; bgmOn = false; }

const solidAt = (px, py) => {
  const c = Math.floor(px / TS), r = Math.floor(py / TS);
  if (c < 0 || c >= COLS) return true;
  if (r < 0 || r >= ROWS) return false;
  return SOLID.has(grid[r][c]);
};
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function addScore(n, x, y) { G.score += n; if (x !== undefined) pops.push({ x, y, txt: String(n), t: 0 }); }
function addCell(x, y) {
  G.cells++; addScore(200, x, y); SFX.cell();
  if (G.cells >= 100) { G.cells -= 100; G.lives++; pops.push({ x, y: y - 10, txt: '1UP', t: 0 }); }
}

// returns {wall, bumpCol, bumpRow}
function moveBody(e) {
  const res = { wall: false, bumpCol: -1, bumpRow: -1 };
  e.x += e.vx;
  const ys = [e.y + 1, e.y + e.h / 2, e.y + e.h - 1];
  if (e.vx > 0) {
    const R = e.x + e.w;
    if (ys.some(y => solidAt(R, y))) { e.x = Math.floor(R / TS) * TS - e.w - 0.01; res.wall = true; }
  } else if (e.vx < 0) {
    if (ys.some(y => solidAt(e.x, y))) { e.x = (Math.floor(e.x / TS) + 1) * TS; res.wall = true; }
  }
  e.y += e.vy; e.onGround = false;
  const xs = [e.x + 1, e.x + e.w / 2, e.x + e.w - 1];
  if (e.vy > 0) {
    const B = e.y + e.h;
    if (xs.some(x => solidAt(x, B))) { e.y = Math.floor(B / TS) * TS - e.h; e.vy = 0; e.onGround = true; }
  } else if (e.vy < 0) {
    const hits = xs.filter(x => solidAt(x, e.y));
    if (hits.length) {
      const cx = e.x + e.w / 2;
      hits.sort((a, b) => Math.abs(a - cx) - Math.abs(b - cx));
      res.bumpCol = Math.floor(hits[0] / TS); res.bumpRow = Math.floor(e.y / TS);
      e.y = (res.bumpRow + 1) * TS; e.vy = 0;
    }
  }
  return res;
}

function bump(c, r) {
  const ch = grid[r][c];
  const key = c + ',' + r;
  if (ch === '?') { grid[r][c] = 'U'; bumps[key] = 8; addCell(c * TS + 4, r * TS - 8); parts.push({ k: 'popcell', x: c * TS + 4, y: r * TS - 14, vy: -4, t: 0 }); }
  else if (ch === 'L' || ch === 'R') {
    grid[r][c] = 'U'; bumps[key] = 8; SFX.sprout();
    items.push({ type: ch === 'L' ? 'bolt' : 'rocket', x: c * TS, y: r * TS, base: (r - 1) * TS - 2, t: 0, w: 16, h: 14 });
  } else if (ch === 'B') {
    if (P.charged) {
      grid[r][c] = '.'; SFX.brk(); addScore(50);
      for (let i = 0; i < 4; i++) parts.push({ k: 'debris', x: c * TS + (i % 2) * 8, y: r * TS + (i >> 1) * 8, vx: (i % 2 ? 1.5 : -1.5), vy: -5 + (i >> 1) * 2, t: 0 });
    } else { bumps[key] = 8; SFX.bump(); }
  } else SFX.bump();
  // knock enemies standing on the bumped tile
  for (const en of enemies) if (en.alive && Math.abs(en.y + en.h - r * TS) < 3 && en.x + en.w > c * TS && en.x < c * TS + TS) killFlip(en);
}
function killFlip(en) { en.alive = false; en.flip = true; en.vy = -4; en.vx = 1; addScore(100, en.x, en.y); SFX.stomp(); }

function hurt() {
  if (P.inv > 0 || G.state !== 'play') return;
  if (P.charged || P.rocket) { P.charged = false; P.rocket = false; P.inv = 100; SFX.hurt(); return; }
  die();
}
function die() {
  G.state = 'dying'; G.stateT = 0; P.vy = -6; P.vx = 0; bgmOn = false; SFX.die(); G.deaths++;
}

// ---------------------------------------------------------------- autopilot (for demo/video)
const isSolidTile = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS && SOLID.has(grid[r][c]);
function bot() {
  keys.left = false; keys.right = true; keys.run = true;
  const front = P.x + P.w;
  const feetRow = Math.floor((P.y + P.h + 2) / TS);
  const bodyRow = Math.floor((P.y + P.h / 2) / TS);
  let want = false;
  if (P.onGround && !keys.jump) P.holdJ = 0;
  if (P.onGround) {
    const cAhead = Math.floor((front + 6) / TS);
    const wall = isSolidTile(cAhead, bodyRow) || isSolidTile(Math.floor((front + 14) / TS), bodyRow);
    const gapC = Math.floor((front + 10) / TS);
    const gap = !isSolidTile(gapC, feetRow) && !isSolidTile(gapC, feetRow + 1) && !isSolidTile(gapC, feetRow + 2);
    const near = (lo, hi) => enemies.some(en => en.alive && en.x - front > lo && en.x - front < hi && Math.abs((en.y + en.h) - (P.y + P.h)) < 40);
    const foe = near(30 + P.vx * 8, 70 + P.vx * 14);
    const pc = Math.floor((P.x + P.w / 2 + 18) / TS);
    let block = false;
    for (let r = bodyRow - 4; r < bodyRow; r++) if (r >= 0 && 'LR?'.includes(grid[r][pc])) { block = true; break; }
    if (near(-8, 70)) block = false;
    want = wall || gap || foe || block;
    if (want) { P.holdJ = gap ? 40 : 24; P.botDouble = gap; }
  } else {
    // second jump + roll at the apex when crossing a pit, or to get over something still ahead
    const below = Math.floor((P.x + P.w / 2) / TS);
    let groundBelow = false;
    for (let r = Math.max(0, feetRow); r < ROWS; r++) if (isSolidTile(below, r) || isSolidTile(below + 1, r)) { groundBelow = true; break; }
    const foeLand = enemies.some(en => en.alive && en.x + en.w - P.x > -6 && en.x - front < 40 && en.y > P.y + P.h - 2);
    if (P.jumps === 1 && P.vy > -0.5 && (!groundBelow || P.botDouble || foeLand)) { keys.jump = false; prevJump = false; P.holdJ = 30; P.botDouble = false; P.botTap = 2; }
  }
  if (P.botTap) { P.botTap--; keys.jump = P.botTap === 0; return; }
  if (want) { keys.jump = !prevJump; if (prevJump) P.holdJ = Math.max(P.holdJ, 1); return; }
  if (P.holdJ > 0) { P.holdJ--; keys.jump = true; } else keys.jump = false;
  if (P.rocket && !P.onGround && P.vy > 0) {
    const below = Math.floor((P.x + P.w / 2) / TS);
    let g2 = false; for (let r = feetRow; r < ROWS; r++) if (isSolidTile(below, r) || isSolidTile(below + 2, r)) { g2 = true; break; }
    if (!g2) keys.jump = true;
  }
}

// ---------------------------------------------------------------- update
function updatePlay() {
  const jumpPressed = keys.jump && !prevJump;
  // horizontal
  const max = keys.run ? 3.0 : 1.8, acc = keys.run ? 0.13 : 0.1;
  if (keys.right && !keys.left) { P.vx = Math.min(max, P.vx + acc); P.face = 1; }
  else if (keys.left && !keys.right) { P.vx = Math.max(-max, P.vx - acc); P.face = -1; }
  else { P.vx -= Math.sign(P.vx) * Math.min(Math.abs(P.vx), 0.1); }
  if (Math.abs(P.vx) > max) P.vx -= Math.sign(P.vx) * 0.05;

  // jump / double jump with barrel roll / thrust
  if (jumpPressed && P.onGround) {
    P.vy = -6.3 - Math.abs(P.vx) * 0.18; P.jumps = 1; SFX.jump();
  } else if (jumpPressed && !P.onGround && P.jumps < 2) {
    P.vy = P.rocket ? -6.4 : -6.0; P.jumps = 2; P.roll = 1; P.trail = []; SFX.roll();
    pops.push({ x: P.x + 2, y: P.y - 12, txt: 'ROLL!', t: 0 });
    for (let i = 0; i < 8; i++) parts.push({ k: 'spark', x: P.x + P.w / 2, y: P.y + P.h, vx: Math.cos(i * 0.785) * 1.6, vy: Math.sin(i * 0.785) * 1.6, t: 0 });
  }
  const g = (keys.jump && P.vy < 0) ? 0.27 : 0.6;
  P.vy = Math.min(7, P.vy + g);
  P.thrusting = false;
  if (P.rocket && keys.jump && !P.onGround && P.roll === 0 && P.vy > -1 && P.fuel > 0) {
    P.vy = Math.max(-2.6, P.vy - 0.95); P.fuel--; P.thrusting = true;
    if (G.frame % 3 === 0) SFX.thrust();
    parts.push({ k: 'flame', x: P.x + 6 + Math.random() * 14, y: P.y + P.h, vx: 0, vy: 1.5 + Math.random(), t: 0 });
  }
  if (P.roll > 0) { P.roll += 1; if (P.roll > ROLL_N) P.roll = 0; }

  // camera lock: can't drive back past the left screen edge
  if (P.x < G.cam && P.vx < 0) { P.x = G.cam; P.vx = 0; }
  P.lastVy = P.vy;
  const r = moveBody(P);
  if (r.bumpCol >= 0) bump(r.bumpCol, r.bumpRow);
  if (P.roll > 0 && G.frame % 3 === 0) { P.trail.push({ x: P.x, y: P.y, r: P.roll }); if (P.trail.length > 4) P.trail.shift(); }
  if (!P.roll && P.trail && P.trail.length && G.frame % 3 === 0) P.trail.shift();
  if (P.onGround) { P.jumps = 0; if (P.roll > ROLL_N - 8) P.roll = 0; P.fuel = Math.min(80, P.fuel + 2); }
  if (r.wall) P.vx = 0;
  P.dist += Math.abs(P.vx); P.wheel = ((P.dist / 6) | 0) % 2;
  if (P.inv > 0) P.inv--;
  if (P.x > CHECK_X) G.checkpoint = true;
  G.maxX = Math.max(G.maxX, P.x);

  // camera
  const target = P.x - 150;
  G.cam = Math.max(G.cam, Math.min(target, COLS * TS - W));

  // spawn enemies
  for (let i = pending.length - 1; i >= 0; i--) {
    const d = pending[i];
    if (d.c * TS < G.cam + W + 24) {
      pending.splice(i, 1);
      if (d.t === 'cone') enemies.push({ t: 'cone', x: d.c * TS, y: d.r * TS + 1, w: 16, h: 15, vx: -0.5, vy: 0, alive: true, anim: 0 });
      if (d.t === 'drone') enemies.push({ t: 'drone', x: d.c * TS, y: d.r * TS, by: d.r * TS, w: 16, h: 8, vx: -0.7, vy: 0, alive: true, anim: 0, ph: d.c });
    }
  }
  // enemies
  for (const en of enemies) {
    en.anim++;
    if (!en.alive) {
      if (en.flip) { en.vy += 0.4; en.y += en.vy; en.x += en.vx; }
      en.dead = (en.dead || 0) + 1; continue;
    }
    if (en.x > G.cam + W + 64) continue;
    if (en.t === 'cone') {
      en.vy = Math.min(6, en.vy + 0.5);
      const old = en.vx, res = moveBody(en);
      if (res.wall) en.vx = -old;
      if (en.y > H + 32) en.alive = false, en.gone = true;
    } else {
      en.x += en.vx; en.y = en.by + Math.sin((en.anim + en.ph * 7) / 18) * 14;
    }
    if (G.state === 'play' && overlap(P, en)) {
      if ((P.vy > 0.5 || P.lastVy > 0.5) && P.y + P.h - en.y < 14) {
        en.alive = false; en.squash = en.t === 'cone'; if (!en.squash) { en.flip = true; en.vy = -2; en.vx = 0; }
        P.vy = keys.jump ? -6.5 : -4; P.jumps = 1; addScore(100, en.x, en.y - 8); SFX.stomp();
      } else hurt();
    }
  }
  enemies = enemies.filter(en => !(en.dead > 40 && en.squash) && !(en.flip && en.y > H + 40) && !en.gone && en.x > G.cam - 64);

  // items
  for (const it of items) {
    it.t++;
    if (it.t < 16) it.y -= 1;
    else {
      // charge magnet: the floating power-up drifts into the car once it's close
      const dx = P.x + P.w / 2 - (it.x + 8), dy = P.y + P.h / 2 - (it.y + 7), d = Math.hypot(dx, dy);
      if (d < 84 || it.pull) { it.pull = true; const sp = Math.min(d, 6); it.x += dx / d * sp; it.y += dy / d * sp; }
      else it.y = it.base + Math.sin(it.t / 10) * 2;
    }
    if (it.t > 16 && overlap(P, it)) {
      it.got = true; SFX.power(); addScore(1000, it.x, it.y - 8);
      if (it.type === 'bolt') { P.charged = true; pops.push({ x: it.x + 18, y: it.y, txt: '+1 CHARGE', t: 0 }); }
      else { P.rocket = true; P.fuel = 80; pops.push({ x: it.x + 18, y: it.y, txt: 'THRUSTER!', t: 0 }); }
      for (let i = 0; i < 12; i++) parts.push({ k: 'spark', x: P.x + P.w / 2, y: P.y + P.h / 2, vx: Math.cos(i * 0.52) * 2.2, vy: Math.sin(i * 0.52) * 2.2, t: 0 });
    }
  }
  items = items.filter(it => !it.got);
  for (const c of cellsList) if (c.alive && overlap(P, c)) { c.alive = false; addCell(c.x, c.y - 6); }

  // timer
  if (++G.timeF % 24 === 0) { G.time--; if (G.time <= 0) die(); }
  // pit death
  if (P.y > H + 16) die();
  // goal
  if (P.x + P.w >= GOAL_X - 2 && G.state === 'play') {
    G.state = 'clear'; G.stateT = 0; P.vx = 0; bgmOn = false; SFX.clear();
  }
}

function updateClear() {
  G.stateT++;
  P.vy = Math.min(7, P.vy + 0.6); P.vx = 0; moveBody(P); P.roll = 0;
  if (P.onGround) P.jumps = 0;
  if (G.stateT > 20 && G.charge < 1) {
    G.charge = Math.min(1, G.charge + 1 / 90);
    if (G.frame % 4 === 0) parts.push({ k: 'spark', x: GOAL_X + 4, y: 150 + Math.random() * 30, vx: -1 - Math.random(), vy: -Math.random(), t: 0 });
  }
  if (G.charge >= 1 && G.time > 0) {
    const d = Math.min(2, G.time); G.time -= d; G.score += 50 * d; if (G.frame % 3 === 0) SFX.tick();
  }
  if (G.charge >= 1 && G.time <= 0) G.clearT = (G.clearT || 0) + 1;
  if (G.clearT > 200) G.done = true;
  if (G.clearT > 120 && keys.start && !prevStart) newGame();
}

function update() {
  G.frame++;
  if (AUTOPLAY && G.state === 'play') bot();
  const startPressed = keys.start && !prevStart;
  if (G.state === 'title') { if (startPressed || AUTOPLAY) newGame(); }
  else if (G.state === 'intro') { if (++G.stateT > (AUTOPLAY ? 70 : 110)) { G.state = 'play'; bgmOn = true; } }
  else if (G.state === 'play') updatePlay();
  else if (G.state === 'dying') {
    G.stateT++;
    if (G.stateT > 20) { P.vy += 0.4; P.y += P.vy; }
    if (G.stateT > 150) { G.lives--; if (G.lives > 0) startIntro(); else { G.state = 'gameover'; G.stateT = 0; } }
  } else if (G.state === 'clear') updateClear();
  else if (G.state === 'gameover') { if (++G.stateT > 90 && (startPressed || AUTOPLAY)) newGame(); }
  prevJump = keys.jump; prevStart = keys.start;

  for (const p of parts) {
    p.t++; p.x += p.vx || 0; p.y += p.vy || 0;
    if (p.k === 'debris') p.vy += 0.35;
    if (p.k === 'popcell') p.vy += 0.3;
  }
  parts = parts.filter(p => p.t < (p.k === 'debris' ? 60 : p.k === 'popcell' ? 22 : p.k === 'flame' ? 12 : 24));
  for (const p of pops) { p.t++; p.y -= 0.6; }
  pops = pops.filter(p => p.t < 50);
  for (const k in bumps) if (--bumps[k] <= 0) delete bumps[k];
  bgmTick();
}

// ---------------------------------------------------------------- render
function drawCar(x, y, opts = {}) {
  const f = P.wheel, left = P.face < 0;
  const img = left ? CAR_L[f] : CAR[f];
  const glow = left ? CAR_GLOW_L[f] : CAR_GLOW[f];
  ctx.save();
  ctx.translate(Math.round(x + 16), Math.round(y + 8));
  let under = 0;
  if (opts.roll) {
    // barrel roll around the car's length axis: squash through upside-down, underside shows mid-roll
    const a = (opts.roll / ROLL_N) * Math.PI * 2, c = Math.cos(a);
    ctx.translate(0, -Math.sin(a / 2) * 3);
    ctx.scale(1, Math.sign(c || 1) * Math.max(0.12, Math.abs(c)));
    under = Math.abs(c) < 0.45 ? 1 : 0;
  }
  if (opts.upside) ctx.scale(1, -1);
  if (P.charged && (G.frame >> 2) % 3) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(glow, -16 + dx, -8 + dy);
  }
  ctx.drawImage(img, -16, -8);
  if (under) { ctx.fillStyle = '#3a3d44'; ctx.fillRect(-15, -3, 30, 6); ctx.fillStyle = '#9ff8ff'; ctx.fillRect(-13, -1, 26, 1); }
  ctx.restore();
}
function drawTiles(cam) {
  const c0 = Math.floor(cam / TS), c1 = Math.min(COLS - 1, c0 + Math.ceil(W / TS) + 1);
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
    const ch = grid[r][c]; if (ch === '.') continue;
    const b = bumps[c + ',' + r]; const oy = b ? -Math.sin((8 - b) / 8 * Math.PI) * 5 : 0;
    const x = c * TS - cam, y = r * TS + oy;
    let img = null;
    if (ch === 'G') img = ROAD; else if (ch === 'D') img = DIRT; else if (ch === 'B') img = BRICK;
    else if (ch === 'S') img = STONE; else if (ch === 'U') img = USED;
    else if (ch === '?' || ch === 'L' || ch === 'R') img = QBLOCK[[0, 1, 0, 2][(G.frame >> 4) % 4]];
    if (img) ctx.drawImage(img, Math.round(x), Math.round(y));
  }
}
function drawCharger(cam) {
  const x = GOAL_X - cam, y = 148;
  // canopy station
  ctx.fillStyle = '#14121a'; ctx.fillRect(x + 54, y - 22, 156, 10);
  ctx.fillStyle = '#e8e8ea'; ctx.fillRect(x + 55, y - 21, 154, 8);
  ctx.fillStyle = '#e5432c'; ctx.fillRect(x + 55, y - 15, 154, 2);
  ctx.fillStyle = '#14121a'; ctx.fillRect(x + 62, y - 12, 4, 56); ctx.fillRect(x + 200, y - 12, 4, 56);
  text('CHARGE STATION', x + 90, y - 33, '#ffffff');
  for (let k = 0; k < 3; k++) {
    const sx = x + (k === 0 ? 0 : 84 + k * 36), sy = y;
    ctx.fillStyle = '#14121a'; ctx.fillRect(sx - 1, sy - 1, 24, 46);
    ctx.fillStyle = '#f2f2ee'; ctx.fillRect(sx, sy, 22, 44);
    ctx.fillStyle = '#c4c8cf'; ctx.fillRect(sx + 18, sy, 4, 44);
    ctx.fillStyle = '#1b2a36'; ctx.fillRect(sx + 3, sy + 5, 14, 15);
    const on = k > 0 || G.state !== 'clear' || (G.frame >> 3) % 2;
    ctx.fillStyle = on ? '#35d4ff' : '#9ff8ff';
    [[9, 7], [8, 8], [7, 9], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10], [10, 11], [9, 12], [8, 13], [9, 7], [10, 7], [9, 8], [8, 9], [11, 11], [10, 12], [9, 13], [8, 14], [7, 15]]
      .forEach(([a, b]) => ctx.fillRect(sx + a, sy + b + 1, 1, 1));
    ctx.fillStyle = '#35d4ff'; ctx.fillRect(sx + 4, sy + 26, 3, 3);
    ctx.fillStyle = '#14121a'; ctx.fillRect(sx + 22, sy + 14, 4, 2); ctx.fillRect(sx + 25, sy + 14, 2, 22); ctx.fillRect(sx + 21, sy + 34, 5, 2);
  }
}
function drawHUD() {
  text('ROADSTER', 8, 6); text(String(G.score).padStart(6, '0'), 62, 6);
  // battery: empty / half / full = normal / charged / charged+thruster
  const bx = 112;
  ctx.fillStyle = '#14121a'; ctx.fillRect(bx, 4, 20, 11); ctx.fillRect(bx + 20, 7, 3, 5);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 1, 5, 18, 9); ctx.fillRect(bx + 20, 8, 2, 3);
  ctx.fillStyle = '#14121a'; ctx.fillRect(bx + 2, 6, 16, 7);
  const lvl = 1 + (P && P.charged ? 1 : 0) + (P && P.rocket ? 1 : 0);
  ctx.fillStyle = lvl === 1 ? '#ff6a3d' : '#35d4ff';
  for (let i = 0; i < lvl; i++) ctx.fillRect(bx + 3 + i * 5, 7, 4, 5);
  ctx.drawImage(BOLT, 134, 3, 10, 10);
  text('x' + String(G.cells).padStart(2, '0'), 146, 6);
  text('WORLD 1-1', 232, 6); text('TIME ' + String(Math.max(0, G.time)).padStart(3, '0'), 330, 6);
  if (P && P.rocket) {
    ctx.fillStyle = '#14121a'; ctx.fillRect(170, 7, 34, 6);
    ctx.fillStyle = '#ff8c1a'; ctx.fillRect(171, 8, Math.round(32 * P.fuel / 80), 4);
  }
}
function render() {
  const cam = Math.round(G.cam);
  ctx.fillStyle = '#2a86ff'; ctx.fillRect(0, 0, W, H);
  if (G.state === 'intro' || (G.state === 'gameover')) {
    ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, W, H);
    drawHUD();
    if (G.state === 'intro') {
      ctext('WORLD 1-1', 80, '#ffffff', 2);
      ctx.drawImage(CAR[0], 160, 112);
      text('x  ' + G.lives, 204, 116, '#ffffff', 1);
      ctext(G.checkpoint ? 'CHECKPOINT' : 'DESERT HIGHWAY', 150, '#ffd31a');
    } else ctext('GAME OVER', 100, '#ffffff', 2);
    return;
  }
  // parallax
  for (const [img, k, y] of [[FAR, 0.2, 60], [NEAR, 0.45, 70]]) {
    const ox = -((cam * k) % img.width);
    ctx.drawImage(img, Math.round(ox), y); ctx.drawImage(img, Math.round(ox + img.width), y);
  }
  for (let i = 0; i < 8; i++) {
    const cx = ((i * 230 + 40 - cam * 0.15) % 1840 + 1840) % 1840 - 60, cy = 26 + (i * 37) % 50;
    if (cx < W) ctx.drawImage(CLOUD, Math.round(cx), cy);
  }
  for (const [c] of decos) { const x = c * TS - cam; if (x > -20 && x < W) ctx.drawImage(CACTUS, x, 192 - 28, 12 * 2, 14 * 2); }
  drawCharger(cam);
  drawTiles(cam);
  for (const c of cellsList) if (c.alive) {
    const f = [0, 0, 0, 1, 2, 1][(G.frame >> 3) % 6];
    ctx.drawImage(CELL[f], Math.round(c.x - cam), c.y);
  }
  for (const it of items) ctx.drawImage(it.type === 'bolt' ? BOLT : ROCKET, Math.round(it.x - cam + (it.type === 'bolt' ? 0 : 1)), Math.round(it.y));
  for (const en of enemies) {
    const x = Math.round(en.x - cam), y = Math.round(en.y);
    if (en.t === 'cone') {
      if (en.squash) ctx.drawImage(CONE_FLAT, x, y + 10);
      else if (en.flip) { ctx.save(); ctx.translate(x, y + 16); ctx.scale(1, -1); ctx.drawImage(CONE[0], 0, 0); ctx.restore(); }
      else ctx.drawImage(CONE[(en.anim >> 3) % 2], x, y - 1);
    } else {
      if (en.flip) { ctx.save(); ctx.translate(x, y + 8); ctx.scale(1, -1); ctx.drawImage(DRONE[0], 0, 0); ctx.restore(); }
      else ctx.drawImage(DRONE[(en.anim >> 1) % 2], x, y);
    }
  }
  // player
  if (P && G.state !== 'title' && G.state !== 'map') {
    const blink = P.inv > 0 && (G.frame >> 2) % 2;
    if (P.trail && P.trail.length) {
      ctx.save();
      P.trail.forEach((g, i) => { ctx.globalAlpha = 0.12 + i * 0.07; drawCar(g.x - 3 - cam, g.y - 2, { roll: g.r }); });
      ctx.restore();
    }
    if (!blink) drawCar(P.x - 3 - cam, P.y - 2, { roll: P.roll, upside: G.state === 'dying' });
    if (P.thrusting) {
      ctx.fillStyle = (G.frame >> 1) % 2 ? '#ff8c1a' : '#ffd31a';
      ctx.fillRect(Math.round(P.x + 4 - cam), Math.round(P.y + P.h), 4, 4);
      ctx.fillRect(Math.round(P.x + 18 - cam), Math.round(P.y + P.h), 4, 4);
    }
  }
  for (const p of parts) {
    const x = Math.round(p.x - cam), y = Math.round(p.y);
    if (p.k === 'debris') { ctx.drawImage(BRICK, 0, 0, 8, 8, x, y, 8, 8); }
    else if (p.k === 'popcell') ctx.drawImage(CELL[0], x, y);
    else if (p.k === 'flame') { ctx.fillStyle = p.t < 5 ? '#ffd31a' : '#ff8c1a'; ctx.fillRect(x, y, 3, 3); }
    else { ctx.fillStyle = p.t % 4 < 2 ? '#9ff8ff' : '#ffffff'; ctx.fillRect(x, y, 2, 2); }
  }
  for (const p of pops) text(p.txt, Math.round(p.x - cam), Math.round(p.y), p.txt.includes('CHARGE') || p.txt.includes('THRUST') ? '#9ff8ff' : p.txt === 'ROLL!' ? '#ffd31a' : '#ffffff');
  if (G.state !== 'map') drawHUD();

  if (G.state === 'title') {
    ctx.fillStyle = 'rgba(11,11,16,0.55)'; ctx.fillRect(0, 40, W, 128);
    ctext('ROADSTER RUN', 56, '#ffffff', 3);
    ctext('AN 8-BIT FAN GAME', 86, '#9ff8ff');
    ctx.drawImage(CAR[(G.frame >> 3) % 2], 184, 104);
    if ((G.frame >> 5) % 2) ctext('PRESS ENTER OR TAP', 132, '#ffd31a');
    ctext('ARROWS MOVE  Z JUMP  ZZ ROLL  X RUN', 152, '#ffffff');
    ctext('FAN GAME - NOT AFFILIATED WITH TESLA OR NINTENDO', 206, '#cfe6ff');
  }
  if (G.state === 'clear') {
    // charging bar
    ctx.fillStyle = '#14121a'; ctx.fillRect(140, 44, 120, 14);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(141, 45, 118, 12);
    ctx.fillStyle = '#14121a'; ctx.fillRect(142, 46, 116, 10);
    ctx.fillStyle = '#35d4ff'; ctx.fillRect(143, 47, Math.round(114 * G.charge), 8);
    text(G.charge < 1 ? 'CHARGING ' + Math.round(G.charge * 100) + '%' : 'FULLY CHARGED!', 152, 64, '#9ff8ff');
    if (G.clearT > 20) ctext('COURSE CLEAR!', 86, '#ffd31a', 2);
    if (G.clearT > 120 && (G.frame >> 5) % 2) ctext('PRESS ENTER TO PLAY AGAIN', 112, '#ffffff');
  }
}

// full level snapshot (design review): draws the whole map to one canvas
function renderFullMap() {
  const saved = { cam: G.cam, state: G.state };
  const big = mk(COLS * TS, H), bx = big.getContext('2d');
  for (let cam = 0; cam < COLS * TS; cam += W) {
    G.cam = Math.min(cam, COLS * TS - W); G.state = 'map';
    render();
    bx.drawImage(cv, G.cam, 0);
  }
  // spawn markers for enemies
  bx.fillStyle = '#ff3b6b';
  for (const d of entityDefs) if (d.t !== 'cell') {
    const img = d.t === 'cone' ? CONE[0] : DRONE[0];
    bx.drawImage(img, d.c * TS, d.r * TS + (d.t === 'cone' ? 0 : 0));
  }
  Object.assign(G, saved);
  return big.toDataURL('image/png');
}

// ---------------------------------------------------------------- loop & sizing
function fit() {
  const s = Math.max(1, Math.min(innerWidth / W, innerHeight / H));
  const k = s >= 2 ? Math.floor(s) : s;
  cv.style.width = Math.round(W * k) + 'px'; cv.style.height = Math.round(H * k) + 'px';
}
addEventListener('resize', fit); fit();

resetLevel();
let last = performance.now(), acc = 0;
function loop(t) {
  acc += Math.min(100, t - last); last = t;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// test hooks
window.RR = {
  G, get P() { return P; }, get enemies() { return enemies; },
  stepN(n) { for (let i = 0; i < n; i++) update(); render(); return { state: G.state, x: P.x, score: G.score, deaths: G.deaths, lives: G.lives }; },
  renderFullMap,
};
