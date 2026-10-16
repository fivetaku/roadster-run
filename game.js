// VOLT ROADSTER — original 8-bit fan game. All art and sound are drawn/synthesized here.
'use strict';

const W = 400, H = 224, TS = 16, ROWS = 14;
const ROLL_N = 40; // barrel-roll length in frames
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const params = new URLSearchParams(location.search);
const AUTOPLAY = params.has('autoplay');
const START_LEVEL = params.get('level');

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
function disc(x, cx, cy, r, col) {
  x.fillStyle = col;
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) x.fillRect(cx + i, cy + j, 1, 1);
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
// rolling tire enemy (14x14), two spoke frames
const TIRE = [0, 1].map(f => {
  const c = mk(14, 14), x = c.getContext('2d');
  disc(x, 7, 7, 7, '#14121a'); disc(x, 7, 7, 6, '#2b2d33'); disc(x, 7, 7, 3, '#9aa0a8'); disc(x, 7, 7, 1, '#14121a');
  x.fillStyle = '#4a4e57';
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + f * Math.PI / 4; x.fillRect(7 + Math.round(Math.cos(a) * 5), 7 + Math.round(Math.sin(a) * 5), 2, 2); }
  x.fillStyle = '#ff3b3b'; x.fillRect(4, 4, 2, 2); x.fillRect(8, 4, 2, 2); // angry eyes on the hub
  return c;
});
// molten-metal blob (12x12)
const BLOB = [0, 1].map(f => {
  const c = mk(12, 12), x = c.getContext('2d');
  disc(x, 6, 6, 6, '#14121a'); disc(x, 6, 6, 5, f ? '#ff6a1a' : '#ff8c1a'); disc(x, 5, 5, 2, '#ffd31a');
  x.fillStyle = '#14121a'; x.fillRect(3, 5, 2, 2); x.fillRect(7, 5, 2, 2);
  return c;
});
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

// ---------------------------------------------------------------- tiles (themed)
function tileCanvas(draw) { const c = mk(16, 16); draw(c.getContext('2d')); return c; }
function rng(seed) { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }
const makeRoad = (base, line, edge = '#9aa0a8') => tileCanvas(x => {
  x.fillStyle = base; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#14121a'; x.fillRect(0, 0, 16, 2);
  x.fillStyle = edge; x.fillRect(0, 2, 16, 1);
  x.fillStyle = line; x.fillRect(4, 8, 8, 2);
  x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 14, 16, 2);
  const r = rng(7); x.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 6; i++) x.fillRect((r() * 16) | 0, 3 + ((r() * 10) | 0), 1, 1);
});
const makeFill = (base, a, b, dot) => tileCanvas(x => {
  x.fillStyle = base; x.fillRect(0, 0, 16, 16);
  const r = rng(11);
  for (let i = 0; i < 14; i++) { x.fillStyle = r() > .5 ? a : b; x.fillRect((r() * 15) | 0, (r() * 15) | 0, 2, 1); }
  x.fillStyle = dot; x.fillRect(3, 11, 2, 2); x.fillRect(11, 5, 2, 1);
});
const makeBrick = (base, mortar, hi) => tileCanvas(x => {
  x.fillStyle = base; x.fillRect(0, 0, 16, 16);
  x.fillStyle = mortar;
  for (let r = 0; r < 4; r++) { x.fillRect(0, r * 4 + 3, 16, 1); x.fillRect(r % 2 ? 4 : 12, r * 4, 1, 3); }
  x.fillStyle = hi;
  for (let r = 0; r < 4; r++) x.fillRect(r % 2 ? 5 : 0, r * 4, r % 2 ? 6 : 11, 1);
  x.strokeStyle = '#14121a'; x.strokeRect(0.5, 0.5, 15, 15);
});
const makeStone = (base, hi, lo, mid) => tileCanvas(x => {
  x.fillStyle = base; x.fillRect(0, 0, 16, 16);
  x.fillStyle = hi; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16);
  x.fillStyle = lo; x.fillRect(0, 15, 16, 1); x.fillRect(15, 0, 1, 16);
  x.fillStyle = mid; x.fillRect(4, 5, 3, 1); x.fillRect(9, 10, 4, 1); x.fillRect(3, 11, 1, 2);
});
const makeGirder = (base, hi, lo) => tileCanvas(x => {
  x.fillStyle = lo; x.fillRect(0, 0, 16, 16);
  x.fillStyle = base; x.fillRect(0, 0, 16, 2); x.fillRect(0, 14, 16, 2); x.fillRect(0, 0, 2, 16); x.fillRect(14, 0, 2, 16);
  for (let i = 0; i < 12; i++) { x.fillRect(2 + i, 2 + i, 2, 1); x.fillRect(13 - i, 2 + i, 2, 1); }
  x.fillStyle = hi; x.fillRect(0, 0, 16, 1); x.fillRect(0, 0, 1, 16);
});
const makeBeam = (base, hi, neon) => tileCanvas(x => {
  x.fillStyle = '#14121a'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = base; x.fillRect(0, 1, 16, 12);
  x.fillStyle = hi; x.fillRect(0, 1, 16, 2);
  x.fillStyle = '#14121a'; x.fillRect(3, 6, 2, 2); x.fillRect(11, 6, 2, 2);
  x.fillStyle = neon; x.fillRect(0, 13, 16, 2);
});
const makeSteel = (base, hi, lo) => tileCanvas(x => {
  x.fillStyle = base; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#14121a'; x.fillRect(0, 0, 16, 1);
  x.fillStyle = hi; x.fillRect(0, 1, 16, 1); x.fillRect(1, 1, 1, 14);
  x.fillStyle = lo; x.fillRect(0, 15, 16, 1); x.fillRect(15, 1, 1, 15);
  x.fillStyle = '#14121a'; [[3, 4], [12, 4], [3, 11], [12, 11]].forEach(([a, b]) => x.fillRect(a, b, 1, 1));
  x.fillStyle = hi; [[4, 4], [13, 4], [4, 11], [13, 11]].forEach(([a, b]) => x.fillRect(a, b, 1, 1));
});
const MOLTEN = [0, 1].map(f => tileCanvas(x => {
  x.fillStyle = '#d9480f'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#ff8c1a';
  for (let i = 0; i < 16; i++) x.fillRect(i, 2 + Math.round(Math.sin((i + f * 4) / 2.5) * 1.5), 1, 3);
  x.fillStyle = '#ffd31a'; x.fillRect(3 + f * 6, 7, 3, 1); x.fillRect(10 - f * 5, 11, 2, 1);
  x.fillStyle = '#9a2a08'; x.fillRect(0, 14, 16, 2);
}));
const BRIDGE = tileCanvas(x => {
  x.fillStyle = '#14121a'; x.fillRect(0, 0, 16, 10);
  x.fillStyle = '#8a5a2a'; x.fillRect(0, 1, 16, 6);
  x.fillStyle = '#b07a40'; x.fillRect(0, 1, 16, 1);
  x.fillStyle = '#14121a'; x.fillRect(5, 1, 1, 6); x.fillRect(11, 1, 1, 6);
  x.fillStyle = '#9aa0a8'; for (let i = 0; i < 16; i += 4) x.fillRect(i, 8, 3, 2);
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
  "'": [4,4,8,0,0,0,0], ' ': [0,0,0,0,0,0,0], '>': [8,4,2,1,2,4,8],
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

// ---------------------------------------------------------------- backgrounds
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
function skyline(seed, width, minH, maxH, body, wins, pWin) {
  const c = mk(width, 150), x = c.getContext('2d'), r = rng(seed);
  let px = 0;
  while (px < width) {
    const w = 16 + ((r() * 5) | 0) * 8, h = minH + ((r() * (maxH - minH)) | 0);
    x.fillStyle = body; x.fillRect(px, 150 - h, w, h);
    if (r() > 0.6) x.fillRect(px + (w >> 1) - 1, 150 - h - 10, 2, 10); // antenna
    for (let wy = 150 - h + 6; wy < 146; wy += 8) for (let wx = px + 4; wx < px + w - 4; wx += 6)
      if (r() < pWin) { x.fillStyle = wins[(r() * wins.length) | 0]; x.fillRect(wx, wy, 3, 4); }
    px += w + ((r() * 3) | 0) * 4;
  }
  return c;
}
function factoryLayer(seed, width) {
  const c = mk(width, 170), x = c.getContext('2d'), r = rng(seed);
  for (let px = 0; px < width; px += 64 + ((r() * 4) | 0) * 16) {
    const h = 60 + ((r() * 70) | 0);
    x.fillStyle = '#2a1618'; x.fillRect(px, 170 - h, 40, h);                    // machine housing
    x.fillStyle = '#3a2022'; x.fillRect(px + 2, 170 - h + 2, 36, 4);
    x.fillStyle = '#ff8c1a'; x.fillRect(px + 8, 170 - h + 14, 24, 6);            // furnace window
    x.fillStyle = '#ffd31a'; x.fillRect(px + 10, 170 - h + 16, 20, 2);
    x.fillStyle = '#24130f'; x.fillRect(px + 46, 20, 8, 150);                     // vertical pipe
    x.fillStyle = '#3a2022'; x.fillRect(px + 46, 20 + ((r() * 100) | 0), 8, 4);
  }
  x.fillStyle = '#24130f'; x.fillRect(0, 40, width, 6); x.fillRect(0, 70, width, 4); // horizontal pipes
  return c;
}
const CLOUD = (() => {
  const c = mk(48, 20), x = c.getContext('2d');
  [[12, 12, 7], [24, 9, 9], [36, 12, 7]].forEach(([a, b, r]) => disc(x, a, b + 1, r, '#14121a'));
  [[12, 12, 6], [24, 9, 8], [36, 12, 6]].forEach(([a, b, r]) => disc(x, a, b, r, '#ffffff'));
  x.fillStyle = '#cfe6ff'; x.fillRect(6, 15, 36, 2);
  return c;
})();
const STARS = Array.from({ length: 60 }, (_, i) => { const r = rng(i * 97 + 5); return [r() * 800, r() * 110, r() > 0.8]; });

const BG = {
  desert: { far: mesaLayer(3, 1200, 30, 92, '#a77aa6', '#8a5a8e', '#7a4c80'), near: mesaLayer(9, 1200, 14, 60, '#e08a5a', '#c8643c', '#b0532e') },
  dusk: { far: mesaLayer(4, 1200, 30, 92, '#7a3f6e', '#5e2c58', '#4f2349'), near: mesaLayer(8, 1200, 14, 60, '#9a4a3a', '#7a3428', '#68291f') },
  city: { far: skyline(21, 1200, 40, 110, '#1e2550', ['#ffd86b', '#fff3a0'], 0.18), near: skyline(33, 1200, 24, 80, '#0f132b', ['#9ff8ff', '#ff6ad5', '#ffd86b'], 0.22) },
  city2: { far: skyline(22, 1200, 40, 110, '#3a1650', ['#ff6ad5', '#ffd86b'], 0.18), near: skyline(34, 1200, 24, 80, '#1a0b2a', ['#ff6ad5', '#9ff8ff'], 0.25) },
  factory: { far: factoryLayer(5, 1280) },
};
function parallax(img, k, y, cam) {
  const ox = -((cam * k) % img.width);
  ctx.drawImage(img, Math.round(ox), y); ctx.drawImage(img, Math.round(ox + img.width), y);
}
function drawBackground(T, cam) {
  ctx.fillStyle = T.sky; ctx.fillRect(0, 0, W, H);
  if (T.bg === 'desert' || T.bg === 'dusk') {
    if (T.bg === 'dusk') {
      ctx.fillStyle = '#ffb36b'; ctx.fillRect(0, 96, W, 40); ctx.fillStyle = '#ffd08a'; ctx.fillRect(0, 120, W, 20);
      const sx = 290 - cam * 0.03; disc(ctx, Math.round(sx), 112, 22, '#fff0b0'); disc(ctx, Math.round(sx), 112, 18, '#ffe27a');
    }
    parallax(BG[T.bg].far, 0.2, 60, cam); parallax(BG[T.bg].near, 0.45, 70, cam);
    for (let i = 0; i < 8; i++) {
      const cx = ((i * 230 + 40 - cam * 0.15) % 1840 + 1840) % 1840 - 60, cy = 26 + (i * 37) % 50;
      if (cx < W) ctx.drawImage(CLOUD, Math.round(cx), cy);
    }
  } else if (T.bg === 'tunnel') {
    ctx.fillStyle = '#1b1f27'; ctx.fillRect(0, 32, W, 160);
    ctx.fillStyle = '#232833'; ctx.fillRect(0, 150, W, 42);
    for (let i = -1; i < 6; i++) {
      const px = Math.round(i * 112 - ((cam * 0.5) % 112));
      ctx.fillStyle = '#2b313c'; ctx.fillRect(px, 32, 22, 160);
      ctx.fillStyle = '#353c49'; ctx.fillRect(px, 32, 3, 160);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? '#14121a' : '#ffd31a'; ctx.fillRect(px, 168 + k * 6, 22, 6); }
      ctx.fillStyle = '#fff3a0'; ctx.fillRect(px + 46, 34, 26, 3);
      ctx.fillStyle = 'rgba(255,243,160,0.06)'; ctx.fillRect(px + 38, 37, 42, 120);
      text(T.floor || 'B2', px + 4, 60, '#7a828e', 1, false);
    }
  } else if (T.bg === 'city' || T.bg === 'city2') {
    const bands = T.bg === 'city' ? ['#0b0e26', '#141a3c', '#2a2457'] : ['#14061f', '#25103a', '#4a1650'];
    ctx.fillStyle = bands[1]; ctx.fillRect(0, 70, W, 60); ctx.fillStyle = bands[2]; ctx.fillRect(0, 130, W, 70);
    ctx.fillStyle = bands[0]; ctx.fillRect(0, 0, W, 70);
    for (const [sx, sy, big] of STARS) {
      const x = Math.round(((sx - cam * 0.05) % 800 + 800) % 800) - 200;
      if (x >= 0 && x < W) { ctx.fillStyle = (G.frame >> 4) % 7 === (sx | 0) % 7 ? '#9ff8ff' : '#ffffff'; ctx.fillRect(x, sy | 0, big ? 2 : 1, big ? 2 : 1); }
    }
    disc(ctx, 330, 40, 12, '#fff6d8'); disc(ctx, 335, 36, 10, bands[0]);
    parallax(BG[T.bg].far, 0.15, 50, cam); parallax(BG[T.bg].near, 0.35, 64, cam);
    if (T.rain) {
      ctx.fillStyle = 'rgba(159,248,255,0.35)';
      for (let i = 0; i < 70; i++) { const rx = (i * 53 + G.frame * 3) % (W + 40) - 20, ry = (i * 71 + G.frame * 7) % H; ctx.fillRect(rx, ry, 1, 5); }
    }
  } else if (T.bg === 'factory') {
    ctx.fillStyle = '#1a0d10'; ctx.fillRect(0, 0, W, H);
    parallax(BG.factory.far, 0.3, 30, cam);
    ctx.fillStyle = 'rgba(255,120,30,0.08)'; ctx.fillRect(0, 150 + Math.sin(G.frame / 20) * 3, W, 50);
  }
}

// ---------------------------------------------------------------- themes
const T_DESERT = {
  name: 'desert', sky: '#2a86ff', bg: 'desert', song: 'highway', deco: 'cactus', hud: '#ffffff',
  tiles: { G: makeRoad('#3a3d44', '#ffd31a'), D: makeFill('#d9a35a', '#b07a3a', '#f0c27a', '#8a5528'), B: makeBrick('#c8642a', '#6e2c10', '#ef9a5a'), S: makeStone('#b8643c', '#e09060', '#6e3418', '#9a4e2c') },
};
const THEMES = {
  desert: T_DESERT,
  dusk: { ...T_DESERT, name: 'dusk', sky: '#e86a5a', bg: 'dusk' },
  tunnel: {
    name: 'tunnel', sky: '#0d0f14', bg: 'tunnel', song: 'tunnel', deco: 'sign', floor: 'B2',
    tiles: { G: makeRoad('#5d636e', '#e8e8ea', '#b8bec8'), D: makeFill('#3e434c', '#4a505a', '#33373f', '#2a2e35'), B: makeBrick('#4d6b8c', '#1d2a3a', '#86a6c6'), S: makeStone('#6d7480', '#9aa0a8', '#3a3e46', '#565c66') },
  },
  night: {
    name: 'night', sky: '#141a3c', bg: 'city', song: 'night', deco: 'lamp', neon: '#35d4ff',
    tiles: { G: makeRoad('#2b2d36', '#ffd31a', '#6a7088'), D: makeGirder('#4a5f9a', '#6a80c0', '#141a3c'), B: makeBrick('#5a3fa5', '#21134a', '#8a6fe0'), S: makeStone('#3c4a6e', '#5a6a94', '#1a2240', '#2c3858'), T: makeBeam('#9aa0a8', '#c4c8cf', '#35d4ff') },
  },
  rain: {
    name: 'rain', sky: '#25103a', bg: 'city2', song: 'night', deco: 'lamp', neon: '#ff6ad5', rain: true,
    tiles: { G: makeRoad('#2b2532', '#ff6ad5', '#6a5a7a'), D: makeGirder('#7a3f8a', '#a05ab0', '#1a0b2a'), B: makeBrick('#a53f8a', '#3a0d2a', '#e06ac0'), S: makeStone('#5a3a6e', '#7a5a94', '#2a1240', '#4a2c58'), T: makeBeam('#9aa0a8', '#c4c8cf', '#ff6ad5') },
  },
  factory: {
    name: 'factory', sky: '#1a0d10', bg: 'factory', song: 'factory', deco: null,
    tiles: { G: makeSteel('#6a625e', '#9a908a', '#3a3230'), D: makeFill('#3a3230', '#4a403c', '#2a2422', '#1a1514'), B: makeBrick('#6e2a22', '#2a0d0a', '#a04a3a'), S: makeStone('#5a4e4a', '#8a7a74', '#2a2422', '#443a36'), Z: BRIDGE },
  },
};

// ---------------------------------------------------------------- levels
// rows: 12 = ground surface, 13 = fill. Enemies standing on the ground use row 11.
const LEVELS = [
  { id: '1-1', name: 'DESERT HIGHWAY', theme: 'desert', cols: 220, check: 100, goal: 'charger', build(L) {
    L.put(9, 8, 'BLB'); L.put(16, 8, '?');
    L.e('cone', 22, 11); L.deco(3, 19);
    L.put(28, 8, 'B?BRB'); L.put(30, 4, '?');
    L.e('cone', 36, 11); L.e('cone', 39, 11);
    L.col(43, 10, 11); L.col(48, 9, 11); L.e('cone', 45, 11); L.deco(33);
    L.pit(53, 55); L.cells([[53, 9], [54, 9], [55, 9]]);
    L.pit(60, 64); L.put(61, 9, 'SSS'); L.cells([[61, 8], [62, 8], [63, 8]]);
    L.e('drone', 68, 9); L.put(70, 8, 'B?B'); L.deco(58, 75);
    L.pit(80, 89); L.col(84, 10, 13); L.col(85, 10, 13);
    L.cells([[80, 7], [81, 6], [82, 5], [83, 4], [86, 4], [87, 5], [88, 6], [89, 7]]);
    L.up(92, 3); for (let c = 95; c <= 110; c++) L.col(c, 9, 11);
    L.e('cone', 101, 8); L.e('cone', 105, 8); L.cells([[98, 6], [99, 6], [100, 6]]);
    L.pit(118, 120); L.e('drone', 116, 8); L.e('drone', 128, 7); L.e('drone', 138, 8);
    L.put(124, 8, 'B?BLB?'); L.cells([[125, 4], [126, 4], [127, 4], [128, 4]]);
    L.pit(134, 136); L.cells([[134, 9], [135, 9], [136, 9]]); L.deco(113, 131);
    L.up(144, 4); L.pit(148, 149); L.down(150, 4);
    L.e('cone', 157, 11); L.e('cone', 161, 11);
    L.put(162, 8, '????'); L.col(167, 10, 11); L.e('cone', 170, 11); L.e('cone', 172, 11);
    L.put(176, 8, 'BBBBB'); L.cellRow(176, 180, 7); L.deco(154, 174);
    L.up(184, 8); L.goal(202); L.deco(197, 216);
  } },
  { id: '1-2', name: 'B2 PARKING', theme: 'tunnel', cols: 200, check: 100, goal: 'charger', build(L) {
    L.ceil(0, 199);
    L.put(10, 8, 'B?LB?');
    [[18, 10], [20, 9], [22, 8], [24, 8], [26, 9], [28, 10]].forEach(([c, r]) => L.col(c, r, 11, 'B'));
    L.cells([[20, 8], [22, 7], [24, 7], [26, 8]]);
    L.e('cone', 32, 11); L.e('tire', 38, 11); L.e('cone', 42, 11);
    L.fill(46, 60, 2, 6, 'B'); L.cellRow(48, 58, 9); L.e('tire', 58, 11);
    L.pit(63, 65);
    L.put(68, 8, 'BB?RBB'); L.e('cone', 72, 11);
    L.pit(78, 81); L.put(79, 10, 'SS');
    L.e('cone', 86, 11); L.e('cone', 89, 11); L.e('tire', 94, 11);
    L.col(100, 7, 11, 'B');
    L.pit(109, 111); L.put(113, 9, 'BBB'); L.pit(116, 118); L.e('tire', 121, 11);
    L.pit(124, 127); L.cells([[124, 9], [125, 8], [126, 8], [127, 9]]);
    L.put(132, 8, '?L?'); L.e('cone', 136, 11); L.e('tire', 142, 11);
    L.put(146, 8, 'B?B?B'); L.e('cone', 150, 11); L.e('cone', 153, 11);
    L.fill(156, 166, 2, 7, 'B'); L.cellRow(158, 164, 10);
    L.up(170, 4, 'B'); L.goal(184);
    L.deco(6, 36, 90, 140, 178);
  } },
  { id: '1-3', name: 'NEON SKYWAY', theme: 'night', cols: 210, check: 104, goal: 'charger', build(L) {
    L.put(6, 8, 'B?RB');
    L.pit(15, 21); L.lift(15, 10, 'x', 64, 0.02);
    L.e('drone', 28, 8);
    L.pit(31, 55); L.girder(32, 9, 4); L.girder(39, 7, 4); L.girder(46, 9, 4); L.girder(52, 8, 3);
    L.cellRow(33, 34, 8); L.cellRow(40, 41, 6); L.cellRow(47, 48, 8);
    L.put(60, 8, 'B?LB'); L.e('cone', 66, 11); L.e('cone', 70, 11);
    L.pit(75, 82); L.lift(75, 10, 'x', 80, 0.018);
    L.e('drone', 108, 8); L.e('drone', 112, 6);
    L.lift(99, 11, 'y', 64, 0.02); L.girder(102, 6, 6); L.cellRow(102, 107, 5);
    L.pit(110, 140);
    [[111, 10], [116, 8], [121, 10], [126, 7], [131, 9], [136, 10]].forEach(([c, r]) => L.girder(c, r, 3));
    L.cellRow(116, 118, 6); L.cellRow(126, 128, 5);
    L.e('cone', 146, 11); L.put(150, 8, '?B?'); L.e('tire', 154, 11);
    L.pit(160, 167); L.lift(160, 10, 'x', 96, 0.02);
    L.up(176, 5, 'S'); L.goal(192);
    L.deco(4, 12, 24, 58, 72, 86, 144, 170, 205);
  } },
  { id: '1-4', name: 'GIGAFACTORY', theme: 'factory', cols: 160, check: 80, goal: 'switch', build(L) {
    L.ceil(0, 159);
    L.put(6, 8, 'BLB');
    L.molten(13, 16);
    L.bar(22, 8, 4, 0.05);
    L.fill(26, 32, 2, 5, 'B');
    L.molten(34, 39); L.col(36, 10, 13, 'S'); L.e('blob', 35, 13); L.e('blob', 38, 13);
    L.bar(44, 9, 4, -0.045); L.e('drone', 48, 8);
    L.put(52, 8, '?B?');
    L.bar(58, 7, 5, 0.04);
    L.molten(63, 69); L.put(65, 9, 'SS'); L.e('blob', 64, 13); L.e('blob', 68, 13);
    L.e('drone', 74, 8); L.bar(78, 9, 4, 0.05);
    L.molten(86, 91); L.col(88, 9, 13, 'S'); L.e('blob', 87, 13);
    L.cellRow(95, 100, 9); L.e('drone', 100, 7);
    L.up(104, 3, 'S'); L.fill(107, 113, 9, 11, 'S');
    L.molten(114, 138); L.bridge(114, 138, 9);
    L.e('boss', 132, 9, { min: 122, max: 136, fire: 150, spd: 0.5 });
    L.fill(139, 145, 9, 13, 'S'); L.switchAt(140);
  } },
  { id: '2-1', name: 'SUNSET HIGHWAY', theme: 'dusk', cols: 230, check: 110, goal: 'charger', build(L) {
    L.put(8, 8, 'B?B'); L.e('cone', 16, 11); L.e('cone', 19, 11);
    L.put(22, 8, 'BLB?B'); L.put(24, 4, '?');
    L.pit(30, 33); L.e('drone', 36, 8);
    L.col(40, 10, 11); L.col(44, 9, 11); L.col(48, 8, 11); L.e('cone', 42, 11); L.e('cone', 46, 11);
    L.pit(52, 57); L.put(54, 9, 'SS'); L.cellRow(54, 55, 8);
    L.e('drone', 64, 8); L.e('drone', 70, 6);
    L.put(70, 8, '?R?');
    L.pit(76, 85); L.col(80, 10, 13); L.col(81, 10, 13);
    L.cells([[76, 7], [77, 6], [78, 5], [79, 4], [82, 4], [83, 5], [84, 6], [85, 7]]);
    L.up(88, 4); L.fill(92, 108, 8, 11, 'S'); L.e('cone', 98, 7); L.e('cone', 105, 7); L.down(109, 4);
    L.pit(114, 116); L.pit(120, 123); L.e('tire', 126, 11); L.e('drone', 130, 8);
    L.put(134, 8, 'B?BLB?B');
    L.up(144, 4); L.pit(148, 150); L.down(151, 4);
    L.e('cone', 158, 11); L.e('cone', 161, 11); L.e('cone', 164, 11); L.e('tire', 170, 11);
    L.pit(174, 178); L.put(176, 9, 'S');
    L.put(182, 8, '????'); L.e('drone', 186, 7);
    L.up(192, 8); L.goal(210);
    L.deco(3, 14, 38, 62, 112, 140, 156, 180, 222);
  } },
  { id: '2-2', name: 'DEEP GARAGE', theme: 'tunnel', cols: 210, check: 104, goal: 'charger', floor: 'B5', build(L) {
    L.ceil(0, 209);
    L.put(8, 8, 'B?B'); L.e('tire', 16, 11);
    L.fill(20, 32, 2, 6, 'B'); L.cellRow(22, 30, 9); L.e('tire', 30, 11); L.e('cone', 33, 11);
    L.pit(37, 39);
    L.col(42, 9, 11, 'B'); L.col(46, 8, 11, 'B'); L.col(49, 9, 11, 'B'); L.cells([[42, 8], [46, 7], [49, 8]]);
    L.pit(54, 56); L.e('tire', 58, 11); L.e('tire', 62, 11);
    L.put(66, 8, 'BLB'); L.fill(70, 80, 2, 7, 'B'); L.e('cone', 75, 11);
    L.pit(82, 86); L.put(84, 10, 'S');
    L.e('tire', 90, 11); L.e('cone', 94, 11); L.e('tire', 98, 11);
    L.col(103, 6, 11, 'B');
    L.pit(108, 112); L.put(110, 9, 'BB');
    L.fill(116, 130, 2, 6, 'B'); L.e('tire', 124, 11); L.cellRow(118, 128, 10);
    L.pit(133, 135); L.pit(139, 141); L.pit(145, 148);
    L.put(152, 8, '?R?'); L.e('cone', 156, 11); L.e('cone', 158, 11); L.e('tire', 164, 11);
    L.up(170, 5, 'B'); L.fill(175, 180, 7, 11, 'B'); L.down(181, 5, 'B');
    L.goal(192);
    L.deco(4, 40, 64, 100, 150, 188);
  } },
  { id: '2-3', name: 'NEON RAIN', theme: 'rain', cols: 220, check: 110, goal: 'charger', build(L) {
    L.pit(13, 19); L.lift(13, 10, 'x', 64, 0.022);
    L.put(22, 8, '?L?');
    L.pit(27, 60);
    [[29, 9, 3], [34, 7, 3], [39, 9, 2], [43, 6, 3], [48, 8, 2], [52, 10, 3], [57, 8, 3]].forEach(([c, r, w]) => L.girder(c, r, w));
    L.cellRow(43, 45, 5); L.cellRow(34, 36, 6);
    L.e('cone', 70, 11); L.e('tire', 74, 11);
    L.pit(79, 88); L.lift(79, 10, 'x', 96, 0.02);
    L.e('drone', 104, 8); L.e('drone', 108, 6); L.put(96, 8, 'B?RB');
    L.pit(112, 150);
    [[113, 10], [118, 9], [123, 8], [128, 9], [132, 10], [137, 8], [142, 9], [147, 8]].forEach(([c, r]) => L.girder(c, r, 3));
    L.cellRow(123, 125, 7); L.cellRow(137, 139, 7);
    L.e('cone', 156, 11); L.e('cone', 159, 11); L.e('tire', 165, 11);
    L.pit(170, 177); L.lift(170, 10, 'x', 96, 0.022);
    L.up(184, 5, 'S'); L.goal(200);
    L.deco(4, 10, 64, 76, 92, 108, 154, 180, 215);
  } },
  { id: '2-4', name: 'FACTORY CORE', theme: 'factory', cols: 170, check: 84, goal: 'switch', build(L) {
    L.ceil(0, 169);
    L.put(5, 8, 'BLB');
    L.molten(12, 17); L.col(14, 10, 13, 'S'); L.col(15, 10, 13, 'S'); L.e('blob', 13, 13); L.e('blob', 16, 13);
    L.bar(22, 8, 4, 0.05); L.bar(30, 8, 4, -0.05);
    L.fill(34, 40, 2, 6, 'B');
    L.molten(44, 52); L.put(46, 9, 'SS'); L.put(50, 8, 'SS'); L.e('blob', 45, 13); L.e('blob', 48, 13); L.e('blob', 52, 13);
    L.e('drone', 56, 8); L.bar(60, 9, 4, 0.06);
    L.put(64, 8, '?L?');
    L.molten(70, 76); L.col(73, 9, 13, 'S'); L.e('blob', 71, 13); L.e('blob', 75, 13);
    L.bar(80, 7, 5, 0.045); L.e('drone', 84, 7);
    L.molten(90, 96); L.put(92, 10, 'SS'); L.e('blob', 91, 13); L.e('blob', 95, 13);
    L.bar(100, 9, 4, -0.06); L.e('drone', 104, 8);
    L.up(108, 3, 'S'); L.fill(111, 117, 9, 11, 'S');
    L.molten(118, 144); L.bridge(118, 144, 9);
    L.e('boss', 138, 9, { min: 128, max: 142, fire: 110, spd: 0.7 });
    L.fill(145, 151, 9, 13, 'S'); L.switchAt(146);
  } },
];
const levelIndex = id => Math.max(0, LEVELS.findIndex(l => l.id === id));

const SOLID = new Set(['G', 'D', 'B', '?', 'L', 'R', 'U', 'S', 'T', 'Z']);
let COLS = 220, grid, entityDefs, decos, liftDefs, barDefs, GOAL_X, SWITCH_X, CHECK_X, LV, TH, bridgeSpan;
function buildLevel() {
  LV = LEVELS[G.level]; TH = { ...THEMES[LV.theme], floor: LV.floor || THEMES[LV.theme].floor };
  COLS = LV.cols;
  grid = Array.from({ length: ROWS }, () => Array(COLS).fill('.'));
  entityDefs = []; decos = []; liftDefs = []; barDefs = []; GOAL_X = SWITCH_X = Infinity; bridgeSpan = null;
  CHECK_X = LV.check * TS;
  const L = {
    pit: (a, b) => { for (let c = a; c <= b; c++) { grid[12][c] = '.'; grid[13][c] = '.'; } },
    molten: (a, b) => { for (let c = a; c <= b; c++) { grid[12][c] = 'M'; grid[13][c] = 'M'; } },
    put: (c, r, s) => [...s].forEach((ch, i) => { grid[r][c + i] = ch; }),
    col: (c, r0, r1, ch = 'S') => { for (let r = r0; r <= r1; r++) grid[r][c] = ch; },
    fill: (c0, c1, r0, r1, ch) => { for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) grid[r][c] = ch; },
    ceil: (a, b) => L.fill(a, b, 0, 1, 'B'),
    up: (c, n, ch = 'S') => { for (let i = 0; i < n; i++) L.col(c + i, 11 - i, 11, ch); },
    down: (c, n, ch = 'S') => { for (let i = 0; i < n; i++) L.col(c + i, 11 - (n - 1 - i), 11, ch); },
    girder: (c, r, w) => { for (let i = 0; i < w; i++) grid[r][c + i] = 'T'; },
    bridge: (a, b, r) => { for (let c = a; c <= b; c++) grid[r][c] = 'Z'; bridgeSpan = { a, b, r }; },
    e: (t, c, r, o = {}) => entityDefs.push({ t, c, r, ...o }),
    cells: pts => pts.forEach(([c, r]) => L.e('cell', c, r)),
    cellRow: (c0, c1, r) => { for (let c = c0; c <= c1; c++) L.e('cell', c, r); },
    lift: (c, r, axis, range, spd) => liftDefs.push({ c, r, axis, range, spd }),
    bar: (c, r, len, spd) => { grid[r][c] = 'U'; barDefs.push({ c, r, len, spd }); },
    deco: (...cs) => cs.forEach(c => decos.push(c)),
    goal: c => { GOAL_X = c * TS; },
    switchAt: c => { SWITCH_X = c * TS; },
  };
  for (let c = 0; c < COLS; c++) { grid[12][c] = 'G'; grid[13][c] = 'D'; }
  LV.build(L);
}

// ---------------------------------------------------------------- audio (synth, original)
let AC = null, muted = false;
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
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
  zap: () => tone(1200, 0.12, 'sawtooth', 0.04, 300),
  crash: () => tone(120, 0.5, 'sawtooth', 0.08, 40),
  button: () => [784, 1047].forEach((f, i) => tone(f, 0.08, 'square', 0.07, 0, i * 0.07)),
  ending: () => [523, 659, 784, 1047, 880, 1047, 1175, 1319, 1568].forEach((f, i) => tone(f, 0.2, 'square', 0.07, 0, i * 0.15)),
};

// ---------------------------------------------------------------- input
const keys = { left: false, right: false, jump: false, run: false, start: false };
let prevJump = false, prevStart = false;
const tapped = { jump: false, start: false }; // latched presses so a tap shorter than one frame still counts
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'jump', Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
  KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run', Enter: 'start',
};
addEventListener('keydown', e => {
  audio();
  if (e.code === 'KeyM') { muted = !muted; Music.setMuted(muted); return; }
  const k = KEYMAP[e.code]; if (k) { if (!e.repeat) { if (k === 'jump') tapped.jump = tapped.start = true; if (k === 'start') tapped.start = true; } keys[k] = true; if (k === 'jump') keys.start = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  const k = KEYMAP[e.code]; if (k) { keys[k] = false; if (k === 'jump') keys.start = false; }
});
if ('ontouchstart' in window) {
  document.getElementById('touch').style.display = 'flex';
  document.querySelectorAll('#touch button').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); audio(); keys[k] = true; if (k === 'jump') { keys.start = true; tapped.jump = tapped.start = true; } };
    const off = e => { e.preventDefault(); keys[k] = false; if (k === 'jump') keys.start = false; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });
  cv.addEventListener('pointerdown', () => { audio(); tapped.start = true; });
}

// ---------------------------------------------------------------- game state
const G = {
  state: 'title', frame: 0, score: 0, cells: 0, lives: 3, time: 300, timeF: 0, level: levelIndex(START_LEVEL),
  cam: 0, checkpoint: false, stateT: 0, charge: 0, done: false, deaths: 0, maxX: 0, keep: null, clearT: 0, cleared: [],
};
let P, enemies, items, cellsList, parts, pops, bumps, pending, lifts, bars;

function resetLevel() {
  buildLevel();
  const startX = G.checkpoint ? CHECK_X : 2 * TS;
  P = {
    x: startX, y: 0, w: 26, h: 14, vx: 0, vy: 0, face: 1, onGround: false,
    charged: !!(G.keep && G.keep.charged), rocket: !!(G.keep && G.keep.rocket), fuel: 80, inv: 0, wheel: 0, dist: 0,
    jumps: 0, roll: 0, holdJ: 0, trail: [], onLift: null,
  };
  const c = Math.floor((startX + 8) / TS);
  let r = 2; while (r < ROWS && !SOLID.has(grid[r][c])) r++;
  P.y = r * TS - P.h;
  enemies = []; items = []; parts = []; pops = []; bumps = {};
  cellsList = entityDefs.filter(d => d.t === 'cell').map(d => ({ x: d.c * TS + 4, y: d.r * TS + 2, w: 8, h: 12, alive: true }));
  pending = entityDefs.filter(d => d.t !== 'cell' && !(G.checkpoint && d.c * TS < startX + 112)).map(d => ({ ...d }));
  lifts = liftDefs.map(d => ({ x: d.c * TS, y: d.r * TS, x0: d.c * TS, y0: d.r * TS, w: 48, h: 8, axis: d.axis, range: d.range, spd: d.spd, ph: 0, dx: 0, dy: 0 }));
  bars = barDefs.map(d => ({ cx: d.c * TS + 8, cy: d.r * TS + 8, len: d.len, spd: d.spd, ang: d.c, orbs: [] }));
  G.cam = Math.max(0, Math.min(P.x - 140, COLS * TS - W));
  G.time = 300; G.timeF = 0; G.charge = 0; G.clearT = 0; G.collapse = -1;
}
function newGame(level = 0) { G.score = 0; G.cells = 0; G.lives = 3; G.checkpoint = false; G.done = false; G.deaths = 0; G.maxX = 0; G.keep = null; G.level = level; startIntro(); }
function startIntro() { resetLevel(); G.state = 'intro'; G.stateT = 0; Music.stop(); }
function nextLevel() {
  G.cleared.push(LV.id);
  G.keep = { charged: P.charged, rocket: P.rocket };
  if (AUTOPLAY && START_LEVEL) { G.done = true; return; }
  G.checkpoint = false;
  if (G.level + 1 >= LEVELS.length) { G.state = 'ending'; G.stateT = 0; SFX.ending(); return; }
  G.level++; startIntro();
}

const tileAt = (px, py) => {
  const c = Math.floor(px / TS), r = Math.floor(py / TS);
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return '.';
  return grid[r][c];
};
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
  } else if (ch === 'B' && r >= 2) {
    if (P.charged) {
      grid[r][c] = '.'; SFX.brk(); addScore(50);
      for (let i = 0; i < 4; i++) parts.push({ k: 'debris', x: c * TS + (i % 2) * 8, y: r * TS + (i >> 1) * 8, vx: (i % 2 ? 1.5 : -1.5), vy: -5 + (i >> 1) * 2, t: 0 });
    } else { bumps[key] = 8; SFX.bump(); }
  } else SFX.bump();
  for (const en of enemies) if (en.alive && STOMPABLE.has(en.t) && Math.abs(en.y + en.h - r * TS) < 3 && en.x + en.w > c * TS && en.x < c * TS + TS) killFlip(en);
}
const STOMPABLE = new Set(['cone', 'drone', 'tire']);
function killFlip(en) { en.alive = false; en.flip = true; en.vy = -4; en.vx = 1; addScore(100, en.x, en.y); SFX.stomp(); }

function hurt(why = '?') {
  if (P.inv > 0 || G.state !== 'play') return;
  G.why = why;
  if (P.charged || P.rocket) { P.charged = false; P.rocket = false; P.inv = 100; SFX.hurt(); return; }
  die();
}
function die() {
  if (G.state !== 'play') return;
  G.state = 'dying'; G.stateT = 0; P.vy = -6; P.vx = 0; Music.stop(); SFX.die(); G.deaths++; G.keep = null;
  (G.deathLog = G.deathLog || []).push(LV.id + '@' + Math.round(P.x / TS) + ' ' + G.why);
}

// ---------------------------------------------------------------- autopilot (for demo/video & level checks)
const liftAt = (c, r) => lifts.some(l => l.x < c * TS + 12 && l.x + l.w > c * TS + 4 && Math.floor(l.y / TS) === r);
const isSolidTile = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS && (SOLID.has(grid[r][c]) || liftAt(c, r));
function threats() {
  const list = enemies.filter(en => en.alive && !(en.t === 'blob' && en.hidden));
  return list;
}
function bot() {
  keys.left = false; keys.right = true; keys.run = true;
  const front = P.x + P.w;
  const feetRow = Math.floor((P.y + P.h + 2) / TS);
  const bodyRow = Math.floor((P.y + P.h / 2) / TS);
  const foes = threats();
  let want = false;
  if (P.onGround && !keys.jump) P.holdJ = 0;
  if (P.onGround) {
    // wait for spinning spark bars to swing out of the way
    const orbIn = (lo, hi, top) => bars.some(b => b.orbs.some((o, k) => k > 0 && o.x - P.x > lo && o.x - front < hi && o.y > top && o.y < P.y + P.h + 6));
    if (orbIn(-10, 30, P.y - 4)) { keys.right = false; keys.run = false; keys.jump = false; return; }
    var orbHigh = orbIn(-40, 90, P.y - 70);
    // on a lift: ride until solid ground is in reach
    if (P.onLift) {
      let land = false;
      for (let k = 1; k <= 3; k++) for (let r = feetRow - 3; r <= feetRow + 2; r++) if (r >= 0 && r < ROWS && SOLID.has(grid[r][Math.floor(front / TS) + k] || '.')) land = true;
      if (!land) { keys.right = false; keys.run = false; keys.jump = false; P.vx *= 0.8; return; }
    }
    const cAhead = Math.floor((front + 6) / TS);
    const wall = isSolidTile(cAhead, bodyRow) || isSolidTile(Math.floor((front + 14) / TS), bodyRow);
    let wallH = 0; for (let r = bodyRow; r >= 2 && (isSolidTile(cAhead, r) || isSolidTile(cAhead + 1, r)); r--) wallH++;
    const gapC = Math.floor((front + 10) / TS);
    const gap = !isSolidTile(gapC, feetRow) && !isSolidTile(gapC, feetRow + 1) && !isSolidTile(gapC, feetRow + 2);
    // a lift sitting in the gap ahead: wait at the edge until it comes close
    if (gap) {
      const l = lifts.find(l => l.x + l.w > front && l.x < front + 140);
      if (l && P.onGround && !P.onLift) {
        const close = l.x - front < 14 && l.x + l.w > front + 4 && Math.abs(l.y - (P.y + P.h)) < 40;
        if (!close && l.axis === 'x') { keys.right = false; keys.run = false; P.vx *= 0.6; keys.jump = false; return; }
      }
    }
    const near = (lo, hi) => foes.some(en => en.x - front > lo && en.x - front < hi && Math.abs((en.y + en.h) - (P.y + P.h)) < 40);
    // jump when contact is 4-18 frames away (time-based so fast tires and shots are handled too)
    const foe = foes.some(en => {
      const d = en.x - front, rel = P.vx - en.vx;
      return d > -6 && rel > 0.2 && d / rel < 18 && Math.abs((en.y + en.h) - (P.y + P.h)) < 40;
    });
    const pc = Math.floor((P.x + P.w / 2 + 18) / TS);
    let block = false;
    for (let r = bodyRow - 4; r < bodyRow; r++) if (r >= 2 && 'LR?'.includes(grid[r][pc])) { block = true; break; }
    if (near(-8, 70)) block = false;
    want = wall || gap || foe || block;
    if (orbHigh && !gap) {
      if (wall || foe) { keys.right = false; keys.run = false; P.vx *= 0.7; }
      want = false;
    }
    if (want) { P.holdJ = gap || wallH >= 4 ? 40 : 24; P.botDouble = gap || wallH >= 4 || foes.some(en => en.t === 'boss' && en.x - front < 90); }
  } else {
    // would the current arc land on solid tiles? (lifts move, so they don't count)
    let sx = P.x, sy = P.y, svy = P.vy, groundBelow = false;
    for (let i = 0; i < 120; i++) {
      svy = Math.min(7, svy + 0.6); sx += P.vx; sy += svy;
      if (solidAt(sx + P.w, sy + P.h / 2) || sy > H) break;
      if (svy > 0 && [sx + 1, sx + P.w / 2, sx + P.w - 1].some(x => solidAt(x, sy + P.h))) { groundBelow = true; break; }
    }
    const foeLand = foes.some(en => en.x + en.w - P.x > -6 && en.x - front < 40 && en.y > P.y + P.h - 2);
    if (!P.botTap && P.jumps === 1 && P.vy > -0.5 && (!groundBelow || P.botDouble || foeLand)) { keys.jump = false; prevJump = false; P.holdJ = 30; P.botDouble = false; P.botTap = 2; }
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
function spawn(d) {
  const x = d.c * TS, y = d.r * TS;
  if (d.t === 'cone') enemies.push({ t: 'cone', x, y: y + 1, w: 16, h: 15, vx: -0.5, vy: 0, alive: true, anim: 0 });
  if (d.t === 'tire') enemies.push({ t: 'tire', x, y: y + 2, w: 14, h: 14, vx: -1.1, vy: 0, alive: true, anim: 0 });
  if (d.t === 'drone') enemies.push({ t: 'drone', x, y, by: y, w: 16, h: 8, vx: -0.7, vy: 0, alive: true, anim: 0, ph: d.c });
  if (d.t === 'blob') enemies.push({ t: 'blob', x: x + 2, y: 12 * TS + 4, home: 12 * TS + 4, w: 12, h: 12, vx: 0, vy: 0, alive: true, anim: 0, wait: 40 + (d.c * 13) % 70, hidden: true });
  if (d.t === 'boss') enemies.push({ t: 'boss', x, y: y - 44, w: 46, h: 44, vx: -d.spd, vy: 0, alive: true, anim: 0, min: d.min * TS, max: d.max * TS, fire: d.fire, spd: d.spd, t2: 0 });
}
function updateLifts() {
  for (const l of lifts) {
    l.ph += l.spd;
    const k = (1 - Math.cos(l.ph)) / 2;
    const nx = l.axis === 'x' ? l.x0 + k * l.range : l.x0, ny = l.axis === 'y' ? l.y0 - k * l.range : l.y0;
    l.dx = nx - l.x; l.dy = ny - l.y; l.x = nx; l.y = ny;
  }
}
function updateBars() {
  for (const b of bars) {
    b.ang += b.spd; b.orbs.length = 0;
    for (let k = 0; k < b.len; k++) b.orbs.push({ x: b.cx + Math.cos(b.ang) * k * 8, y: b.cy + Math.sin(b.ang) * k * 8 });
  }
}
function updateEnemy(en) {
  en.anim++;
  if (!en.alive) {
    if (en.flip || en.falling) { en.vy += 0.4; en.y += en.vy; en.x += en.vx; }
    en.dead = (en.dead || 0) + 1; return;
  }
  if (en.x > G.cam + W + 64 && en.t !== 'boss') return;
  if (en.t === 'cone' || en.t === 'tire') {
    en.vy = Math.min(6, en.vy + 0.5);
    const old = en.vx, res = moveBody(en);
    if (res.wall) en.vx = -old;
    if (en.y > H + 32) { en.alive = false; en.gone = true; }
  } else if (en.t === 'drone') {
    en.x += en.vx; en.y = en.by + Math.sin((en.anim + en.ph * 7) / 18) * 14;
  } else if (en.t === 'blob') {
    if (en.hidden) { if (--en.wait <= 0) { en.hidden = false; en.vy = -7.2; } }
    else { en.vy += 0.3; en.y += en.vy; if (en.y >= en.home && en.vy > 0) { en.y = en.home; en.vy = 0; en.hidden = true; en.wait = 90 + (en.anim % 50); } }
  } else if (en.t === 'shot') {
    en.x += en.vx; en.y += Math.sin(en.anim / 6) * 0.6;
    if (en.x < G.cam - 20) { en.alive = false; en.gone = true; }
  } else if (en.t === 'boss') {
    en.t2++;
    if (en.t2 % 80 === 0) en.vx = (((en.t2 / 80) | 0) % 3 === 0 ? 1 : -1) * en.spd;
    if (en.x < en.min) en.vx = Math.abs(en.vx); if (en.x > en.max) en.vx = -Math.abs(en.vx);
    if (en.onGround && en.t2 % 130 === 65) en.vy = -5;
    en.vy = Math.min(7, en.vy + 0.4);
    moveBody(en);
    if (en.t2 % en.fire === 0 && en.x < G.cam + W) {
      enemies.push({ t: 'shot', x: en.x - 12, y: en.y + ((en.t2 / en.fire) % 2 ? 10 : 30), w: 10, h: 6, vx: -2.3, vy: 0, alive: true, anim: 0 });
      SFX.zap();
    }
  }
  if (G.state === 'play' && en.alive && !(en.t === 'blob' && en.hidden) && overlap(P, en)) {
    if (STOMPABLE.has(en.t) && (P.vy > 0.5 || P.lastVy > 0.5) && P.y + P.h - en.y < (P.lastVy > 3 ? 17 : 14)) {
      en.alive = false; en.squash = en.t === 'cone'; if (!en.squash) { en.flip = true; en.vy = -2; en.vx = 0; }
      P.vy = keys.jump ? -6.5 : -4; P.jumps = 1; addScore(100, en.x, en.y - 8); SFX.stomp();
    } else hurt(en.t);
  }
}

function updatePlay() {
  const jumpPressed = (keys.jump && !prevJump) || (!AUTOPLAY && tapped.jump);
  const max = keys.run ? 3.0 : 1.8, acc = keys.run ? 0.13 : 0.1;
  if (keys.right && !keys.left) { P.vx = Math.min(max, P.vx + acc); P.face = 1; }
  else if (keys.left && !keys.right) { P.vx = Math.max(-max, P.vx - acc); P.face = -1; }
  else { P.vx -= Math.sign(P.vx) * Math.min(Math.abs(P.vx), 0.1); }
  if (Math.abs(P.vx) > max) P.vx -= Math.sign(P.vx) * 0.05;

  if (jumpPressed && P.onGround) {
    P.vy = -6.3 - Math.abs(P.vx) * 0.18; P.jumps = 1; P.onLift = null; SFX.jump();
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

  updateLifts(); updateBars();
  if (P.onLift && P.vy >= 0) { P.x += P.onLift.dx; P.y = P.onLift.y - P.h; }
  if (P.x < G.cam && P.vx < 0) { P.x = G.cam; P.vx = 0; }
  P.lastVy = P.vy;
  const prevBottom = P.y + P.h;
  const r = moveBody(P);
  if (r.bumpCol >= 0) bump(r.bumpCol, r.bumpRow);
  P.onLift = null;
  if (P.vy >= 0) for (const l of lifts) {
    if (P.x + P.w > l.x + 2 && P.x < l.x + l.w - 2 && P.y + P.h >= l.y - 1 && prevBottom <= l.y + Math.max(0, l.dy) + 4) {
      P.y = l.y - P.h; P.vy = 0; P.onGround = true; P.onLift = l; break;
    }
  }
  if (P.roll > 0 && G.frame % 3 === 0) { P.trail.push({ x: P.x, y: P.y, r: P.roll }); if (P.trail.length > 4) P.trail.shift(); }
  if (!P.roll && P.trail.length && G.frame % 3 === 0) P.trail.shift();
  if (P.onGround) { P.jumps = 0; if (P.roll > ROLL_N - 8) P.roll = 0; P.fuel = Math.min(80, P.fuel + 2); }
  if (r.wall) P.vx = 0;
  P.dist += Math.abs(P.vx); P.wheel = ((P.dist / 6) | 0) % 2;
  if (P.inv > 0) P.inv--;
  if (P.x > CHECK_X) G.checkpoint = true;
  G.maxX = Math.max(G.maxX, P.x);

  const target = P.x - 150;
  G.cam = Math.max(G.cam, Math.min(target, COLS * TS - W));

  for (let i = pending.length - 1; i >= 0; i--) {
    const d = pending[i];
    if (d.c * TS < G.cam + W + 24) { pending.splice(i, 1); spawn(d); }
  }
  for (const en of enemies.slice()) updateEnemy(en);
  enemies = enemies.filter(en => !(en.dead > 40 && en.squash) && !(en.flip && en.y > H + 40) && !en.gone && (en.x > G.cam - 64 || en.t === 'boss'));

  // spark bars
  const hb = { x: P.x + 4, y: P.y + 3, w: P.w - 8, h: P.h - 5 };
  for (const b of bars) for (const o of b.orbs) if (overlap(hb, { x: o.x - 3, y: o.y - 3, w: 6, h: 6 })) hurt('bar');

  for (const it of items) {
    it.t++;
    if (it.t < 16) it.y -= 1;
    else {
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

  if (++G.timeF % 24 === 0) { G.time--; if (G.time === 100) { Music.hurry(); pops.push({ x: P.x, y: P.y - 16, txt: 'HURRY!', t: 0 }); } if (G.time <= 0) { G.why = 'time'; die(); } }
  if (P.y + P.h > 12 * TS + 4 && tileAt(P.x + P.w / 2, P.y + P.h) === 'M') { G.why = 'molten'; die(); }
  if (P.y > H + 16) { G.why = 'pit'; die(); }
  if (G.state !== 'play') return;
  if (P.x + P.w >= GOAL_X - 2) { G.state = 'clear'; G.stateT = 0; P.vx = 0; Music.stop(); SFX.clear(); }
  if (P.x + P.w >= SWITCH_X + 4 && P.y + P.h <= 9 * TS + 2) {
    G.state = 'clear'; G.stateT = 0; P.vx = 0; Music.stop(); SFX.button(); G.collapse = bridgeSpan ? bridgeSpan.b : -1;
    enemies = enemies.filter(en => en.t !== 'shot');
  }
}

function updateClear() {
  G.stateT++;
  P.vy = Math.min(7, P.vy + 0.6); P.vx = 0; moveBody(P); P.roll = 0; P.trail.length = 0;
  if (P.onGround) P.jumps = 0;
  if (LV.goal === 'charger') {
    if (G.stateT > 20 && G.charge < 1) {
      G.charge = Math.min(1, G.charge + 1 / 90);
      if (G.frame % 4 === 0) parts.push({ k: 'spark', x: GOAL_X + 4, y: 150 + Math.random() * 30, vx: -1 - Math.random(), vy: -Math.random(), t: 0 });
    }
  } else {
    // switch pressed: the bridge drops tile by tile, the boss goes with it
    if (G.collapse >= 0 && bridgeSpan && G.stateT > 20 && G.stateT % 3 === 0) {
      const c = G.collapse, r = bridgeSpan.r;
      grid[r][c] = '.'; parts.push({ k: 'debris', x: c * TS, y: r * TS, vx: 0, vy: 1, t: 0 });
      G.collapse = c > bridgeSpan.a ? c - 1 : -1;
      if (G.collapse < 0) SFX.crash();
    }
    for (const en of enemies) if (en.t === 'boss' && en.alive) {
      en.vy = Math.min(7, en.vy + 0.4); moveBody(en); en.anim++;
      if (!en.onGround && en.y > 10 * TS) { en.alive = false; en.falling = true; addScore(5000, en.x, en.y); }
    }
    for (const en of enemies) if (en.falling) { en.vy += 0.3; en.y += en.vy; }
    if (G.collapse < 0 && G.stateT > 120) G.charge = 1;
  }
  if (G.charge >= 1 && G.time > 0) {
    const d = Math.min(2, G.time); G.time -= d; G.score += 50 * d; if (G.frame % 3 === 0) SFX.tick();
  }
  if (G.charge >= 1 && G.time <= 0) G.clearT++;
  if (G.clearT > 150) nextLevel();
}

function update() {
  G.frame++;
  if (AUTOPLAY && G.state === 'play') bot();
  const startPressed = (keys.start && !prevStart) || tapped.start;
  if (G.state === 'title') { if (startPressed || AUTOPLAY) newGame(levelIndex(START_LEVEL)); }
  else if (G.state === 'intro') { if (++G.stateT > (AUTOPLAY ? 70 : 110)) { G.state = 'play'; if (audio()) Music.start(AC, TH.song); } }
  else if (G.state === 'play') updatePlay();
  else if (G.state === 'dying') {
    G.stateT++;
    if (G.stateT > 20) { P.vy += 0.4; P.y += P.vy; }
    if (G.stateT > 150) { G.lives--; if (G.lives > 0) startIntro(); else { G.state = 'gameover'; G.stateT = 0; } }
  } else if (G.state === 'clear') updateClear();
  else if (G.state === 'gameover') {
    // continue from the first course of the current world
    if (AUTOPLAY && START_LEVEL) { G.done = true; return; }
    if (++G.stateT > 90 && (startPressed || AUTOPLAY)) newGame(G.level - (G.level % 4));
  } else if (G.state === 'ending') {
    if (++G.stateT > 240 && AUTOPLAY) G.done = true;
    if (G.stateT > 120 && startPressed) { G.state = 'title'; G.level = 0; resetLevel(); }
  }
  prevJump = keys.jump; prevStart = keys.start; tapped.jump = tapped.start = false;

  for (const p of parts) {
    p.t++; p.x += p.vx || 0; p.y += p.vy || 0;
    if (p.k === 'debris') p.vy += 0.35;
    if (p.k === 'popcell') p.vy += 0.3;
  }
  parts = parts.filter(p => p.t < (p.k === 'debris' ? 60 : p.k === 'popcell' ? 22 : p.k === 'flame' ? 12 : 24));
  for (const p of pops) { p.t++; p.y -= 0.6; }
  pops = pops.filter(p => p.t < 50);
  for (const k in bumps) if (--bumps[k] <= 0) delete bumps[k];
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
  const c0 = Math.max(0, Math.floor(cam / TS)), c1 = Math.min(COLS - 1, c0 + Math.ceil(W / TS) + 1);
  for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
    const ch = grid[r][c]; if (ch === '.') continue;
    const b = bumps[c + ',' + r]; const oy = b ? -Math.sin((8 - b) / 8 * Math.PI) * 5 : 0;
    const x = c * TS - cam, y = r * TS + oy;
    let img = TH.tiles[ch];
    if (ch === 'U') img = USED;
    else if (ch === '?' || ch === 'L' || ch === 'R') img = QBLOCK[[0, 1, 0, 2][(G.frame >> 4) % 4]];
    else if (ch === 'M') img = MOLTEN[(G.frame >> 4) % 2];
    if (img) ctx.drawImage(img, Math.round(x), Math.round(y));
  }
}
function drawDeco(c, cam) {
  const x = c * TS - cam; if (x < -40 || x > W + 10) return;
  if (TH.deco === 'cactus') ctx.drawImage(CACTUS, x, 192 - 28, 24, 28);
  else if (TH.deco === 'sign') {
    ctx.fillStyle = '#7a828e'; ctx.fillRect(x + 8, 150, 2, 42);
    ctx.fillStyle = '#14121a'; ctx.fillRect(x - 1, 133, 20, 18);
    ctx.fillStyle = '#2b8a3e'; ctx.fillRect(x, 134, 18, 16);
    text('P', x + 6, 138, '#ffffff', 1, false);
  } else if (TH.deco === 'lamp') {
    ctx.fillStyle = '#4a5068'; ctx.fillRect(x + 6, 100, 3, 92); ctx.fillRect(x + 6, 100, 14, 3);
    ctx.fillStyle = '#fff3a0'; ctx.fillRect(x + 16, 103, 6, 2);
    ctx.fillStyle = 'rgba(255,243,160,0.10)'; ctx.beginPath(); ctx.moveTo(x + 16, 105); ctx.lineTo(x + 2, 192); ctx.lineTo(x + 36, 192); ctx.lineTo(x + 22, 105); ctx.fill();
  }
}
function drawCharger(cam) {
  if (!isFinite(GOAL_X)) return;
  const x = GOAL_X - cam, y = 148;
  if (x > W + 220 || x < -230) return;
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
    [[9, 7], [8, 8], [7, 9], [7, 10], [8, 10], [9, 10], [10, 10], [11, 10], [10, 11], [9, 12], [8, 13], [10, 7], [9, 8], [8, 9], [11, 11], [10, 12], [9, 13], [8, 14], [7, 15]]
      .forEach(([a, b]) => ctx.fillRect(sx + a, sy + b + 1, 1, 1));
    ctx.fillStyle = '#35d4ff'; ctx.fillRect(sx + 4, sy + 26, 3, 3);
    ctx.fillStyle = '#14121a'; ctx.fillRect(sx + 22, sy + 14, 4, 2); ctx.fillRect(sx + 25, sy + 14, 2, 22); ctx.fillRect(sx + 21, sy + 34, 5, 2);
  }
}
function drawSwitch(cam) {
  if (!isFinite(SWITCH_X)) return;
  const x = SWITCH_X - cam, y = 9 * TS, pressed = G.state === 'clear';
  ctx.fillStyle = '#14121a'; ctx.fillRect(x + 5, y - 18, 6, 18);
  ctx.fillStyle = '#9aa0a8'; ctx.fillRect(x + 6, y - 17, 4, 17);
  ctx.fillStyle = '#14121a'; ctx.fillRect(x, y - 22 + (pressed ? 3 : 0), 16, 6);
  ctx.fillStyle = pressed ? '#5fd068' : ((G.frame >> 4) % 2 ? '#e5432c' : '#ff6a3d'); ctx.fillRect(x + 1, y - 21 + (pressed ? 3 : 0), 14, 4);
  if (!pressed) text('OFF', x - 1, y - 32, '#ffd31a');
}
function drawLift(l, cam) {
  const x = Math.round(l.x - cam), y = Math.round(l.y);
  ctx.fillStyle = '#14121a'; ctx.fillRect(x, y, l.w, l.h);
  ctx.fillStyle = '#9aa0a8'; ctx.fillRect(x + 1, y + 1, l.w - 2, l.h - 3);
  ctx.fillStyle = '#c4c8cf'; ctx.fillRect(x + 1, y + 1, l.w - 2, 1);
  ctx.fillStyle = TH.neon || '#35d4ff'; ctx.fillRect(x + 1, y + l.h - 2, l.w - 2, 1);
  ctx.fillStyle = '#14121a'; for (let i = 6; i < l.w - 4; i += 12) ctx.fillRect(x + i, y + 3, 2, 2);
}
function drawBoss(en, cam) {
  ctx.save(); ctx.translate(Math.round(en.x - cam), Math.round(en.y)); ctx.scale(1.5, 1.5);
  const x = 0, y = 0, blink = (en.anim >> 3) % 2;
  ctx.fillStyle = '#14121a'; ctx.fillRect(x + 1, y + 23, 31, 7);
  for (const wx of [5, 16, 27]) disc(ctx, x + wx, y + 26, 3, '#7a828e');
  ctx.fillStyle = '#14121a'; ctx.fillRect(x + 3, y + 9, 27, 15);
  ctx.fillStyle = '#7d838d'; ctx.fillRect(x + 4, y + 10, 25, 13);
  ctx.fillStyle = '#5c6370'; ctx.fillRect(x + 10, y + 13, 13, 7);
  ctx.fillStyle = blink ? '#e5432c' : '#ff9a7a'; ctx.fillRect(x + 15, y + 15, 3, 3);
  ctx.fillStyle = '#14121a'; ctx.fillRect(x + 7, y, 19, 10);
  ctx.fillStyle = '#9aa0a8'; ctx.fillRect(x + 8, y + 1, 17, 8);
  ctx.fillStyle = '#e5432c'; ctx.fillRect(x + 8, y + 4, 12, 2);
  ctx.fillStyle = '#ffd31a'; ctx.fillRect(x + 8 + (en.anim >> 2) % 10, y + 4, 2, 2);
  ctx.fillStyle = '#14121a'; ctx.fillRect(x + 16, y - 5, 1, 5); ctx.fillStyle = blink ? '#ff3b3b' : '#ffd31a'; ctx.fillRect(x + 15, y - 7, 3, 2);
  ctx.fillStyle = '#14121a'; ctx.fillRect(x - 6, y + 13, 12, 6);
  ctx.fillStyle = '#3a3d44'; ctx.fillRect(x - 5, y + 14, 10, 4);
  ctx.fillStyle = '#35d4ff'; ctx.fillRect(x - 6, y + 15, 2, 2);
  ctx.restore();
}
function drawEnemies(cam) {
  for (const en of enemies) {
    const x = Math.round(en.x - cam), y = Math.round(en.y);
    if (en.t === 'cone') {
      if (en.squash) ctx.drawImage(CONE_FLAT, x, y + 10);
      else if (en.flip) { ctx.save(); ctx.translate(x, y + 16); ctx.scale(1, -1); ctx.drawImage(CONE[0], 0, 0); ctx.restore(); }
      else ctx.drawImage(CONE[(en.anim >> 3) % 2], x, y - 1);
    } else if (en.t === 'drone') {
      if (en.flip) { ctx.save(); ctx.translate(x, y + 8); ctx.scale(1, -1); ctx.drawImage(DRONE[0], 0, 0); ctx.restore(); }
      else ctx.drawImage(DRONE[(en.anim >> 1) % 2], x, y);
    } else if (en.t === 'tire') {
      if (en.flip) { ctx.save(); ctx.translate(x, y + 14); ctx.scale(1, -1); ctx.drawImage(TIRE[0], 0, 0); ctx.restore(); }
      else ctx.drawImage(TIRE[(en.anim >> 2) % 2], x, y);
    } else if (en.t === 'blob') {
      if (!en.hidden) ctx.drawImage(BLOB[(en.anim >> 3) % 2], x, y);
    } else if (en.t === 'shot') {
      ctx.fillStyle = '#14121a'; ctx.fillRect(x - 1, y - 1, 12, 8);
      ctx.fillStyle = (en.anim >> 1) % 2 ? '#9ff8ff' : '#35d4ff'; ctx.fillRect(x, y, 10, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 2, 5, 2);
    } else if (en.t === 'boss') drawBoss(en, cam);
  }
}
function drawHUD() {
  text('ROADSTER', 8, 6); text(String(G.score).padStart(6, '0'), 62, 6);
  const bx = 112;
  ctx.fillStyle = '#14121a'; ctx.fillRect(bx, 4, 20, 11); ctx.fillRect(bx + 20, 7, 3, 5);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(bx + 1, 5, 18, 9); ctx.fillRect(bx + 20, 8, 2, 3);
  ctx.fillStyle = '#14121a'; ctx.fillRect(bx + 2, 6, 16, 7);
  const lvl = 1 + (P && P.charged ? 1 : 0) + (P && P.rocket ? 1 : 0);
  ctx.fillStyle = lvl === 1 ? '#ff6a3d' : '#35d4ff';
  for (let i = 0; i < lvl; i++) ctx.fillRect(bx + 3 + i * 5, 7, 4, 5);
  ctx.drawImage(BOLT, 134, 3, 10, 10);
  text('x' + String(G.cells).padStart(2, '0'), 146, 6);
  text('WORLD ' + LV.id, 232, 6); text('TIME ' + String(Math.max(0, G.time)).padStart(3, '0'), 330, 6);
  if (P && P.rocket) {
    ctx.fillStyle = '#14121a'; ctx.fillRect(170, 7, 34, 6);
    ctx.fillStyle = '#ff8c1a'; ctx.fillRect(171, 8, Math.round(32 * P.fuel / 80), 4);
  }
}
function render() {
  const cam = Math.round(G.cam);
  if (G.state === 'intro' || G.state === 'gameover' || G.state === 'ending') {
    ctx.fillStyle = '#0b0b10'; ctx.fillRect(0, 0, W, H);
    drawHUD();
    if (G.state === 'intro') {
      ctext('WORLD ' + LV.id, 72, '#ffffff', 2);
      ctext(LV.name, 98, '#ffd31a');
      ctx.drawImage(CAR[0], 160, 118);
      text('x  ' + G.lives, 204, 122, '#ffffff', 1);
      if (G.checkpoint) ctext('CHECKPOINT', 156, '#9ff8ff');
    } else if (G.state === 'gameover') ctext('GAME OVER', 100, '#ffffff', 2);
    else {
      ctext('ALL CLEAR!', 56, '#ffd31a', 3);
      ctext('THE GIGAFACTORY IS SHUT DOWN.', 96, '#9ff8ff');
      ctext('THANKS FOR DRIVING!', 112, '#ffffff');
      ctext('SCORE ' + String(G.score).padStart(6, '0'), 136, '#ffffff', 2);
      ctx.drawImage(CAR[(G.frame >> 3) % 2], 184, 170);
      if (G.stateT > 120 && (G.frame >> 5) % 2) ctext('PRESS ENTER', 200, '#ffd31a');
    }
    return;
  }
  drawBackground(TH, cam);
  for (const c of decos) drawDeco(c, cam);
  drawCharger(cam);
  drawTiles(cam);
  drawSwitch(cam);
  for (const l of lifts) drawLift(l, cam);
  for (const b of bars) for (const o of b.orbs) {
    const x = Math.round(o.x - cam), y = Math.round(o.y);
    ctx.fillStyle = '#14121a'; ctx.fillRect(x - 4, y - 4, 8, 8);
    ctx.fillStyle = (G.frame >> 2) % 2 ? '#ffd31a' : '#ff8c1a'; ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  for (const c of cellsList) if (c.alive) {
    const f = [0, 0, 0, 1, 2, 1][(G.frame >> 3) % 6];
    ctx.drawImage(CELL[f], Math.round(c.x - cam), c.y);
  }
  for (const it of items) ctx.drawImage(it.type === 'bolt' ? BOLT : ROCKET, Math.round(it.x - cam + (it.type === 'bolt' ? 0 : 1)), Math.round(it.y));
  drawEnemies(cam);
  if (P && G.state !== 'title' && G.state !== 'map') {
    const blink = P.inv > 0 && (G.frame >> 2) % 2;
    if (P.trail.length) {
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
    if (p.k === 'debris') ctx.drawImage(TH.tiles.B || USED, 0, 0, 8, 8, x, y, 8, 8);
    else if (p.k === 'popcell') ctx.drawImage(CELL[0], x, y);
    else if (p.k === 'flame') { ctx.fillStyle = p.t < 5 ? '#ffd31a' : '#ff8c1a'; ctx.fillRect(x, y, 3, 3); }
    else { ctx.fillStyle = p.t % 4 < 2 ? '#9ff8ff' : '#ffffff'; ctx.fillRect(x, y, 2, 2); }
  }
  for (const p of pops) text(p.txt, Math.round(p.x - cam), Math.round(p.y), p.txt.includes('CHARGE') || p.txt.includes('THRUST') ? '#9ff8ff' : p.txt === 'ROLL!' ? '#ffd31a' : '#ffffff');
  if (G.state !== 'map') drawHUD();

  if (G.state === 'title') {
    ctx.fillStyle = 'rgba(11,11,16,0.55)'; ctx.fillRect(0, 40, W, 128);
    ctext('VOLT ROADSTER', 56, '#ffffff', 3);
    ctext('CHARGE UP. ROLL. REACH THE STATION.', 86, '#9ff8ff');
    ctx.drawImage(CAR[(G.frame >> 3) % 2], 184, 104);
    if ((G.frame >> 5) % 2) ctext('PRESS ENTER OR TAP', 132, '#ffd31a');
    ctext('ARROWS MOVE  Z JUMP  ZZ ROLL  X RUN  M MUTE', 152, '#ffffff');
    ctext('FAN GAME - NOT AFFILIATED WITH TESLA OR NINTENDO', 206, '#cfe6ff');
  }
  if (G.state === 'clear') {
    if (LV.goal === 'charger') {
      ctx.fillStyle = '#14121a'; ctx.fillRect(140, 44, 120, 14);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(141, 45, 118, 12);
      ctx.fillStyle = '#14121a'; ctx.fillRect(142, 46, 116, 10);
      ctx.fillStyle = '#35d4ff'; ctx.fillRect(143, 47, Math.round(114 * G.charge), 8);
      text(G.charge < 1 ? 'CHARGING ' + Math.round(G.charge * 100) + '%' : 'FULLY CHARGED!', 152, 64, '#9ff8ff');
      if (G.clearT > 20) ctext('COURSE CLEAR!', 86, '#ffd31a', 2);
    } else {
      if (G.stateT > 60) ctext('POWER DOWN!', 50, '#9ff8ff', 2);
      if (G.charge >= 1) ctext(G.level === LEVELS.length - 1 ? 'FACTORY SHUT DOWN!' : 'WORLD CLEAR!', 80, '#ffd31a', 2);
    }
  }
}

// full level snapshot (design review): draws the whole map to one canvas
function renderFullMap() {
  const saved = { cam: G.cam, state: G.state };
  const big = mk(COLS * TS, H), bx = big.getContext('2d');
  updateBars();
  for (let cam = 0; cam < COLS * TS; cam += W) {
    G.cam = Math.min(cam, COLS * TS - W); G.state = 'map';
    render();
    for (const d of entityDefs) if (d.t === 'boss') drawBoss({ x: d.c * TS, y: d.r * TS - 44, anim: 0 }, G.cam);
    bx.drawImage(cv, G.cam, 0);
  }
  for (const d of entityDefs) {
    const img = { cone: CONE[0], drone: DRONE[0], tire: TIRE[0], blob: BLOB[0] }[d.t];
    if (img) bx.drawImage(img, d.c * TS, d.t === 'blob' ? 11 * TS : d.r * TS);
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
  G, LEVELS, get P() { return P; }, get enemies() { return enemies; }, get LV() { return LV; },
  stepN(n) { for (let i = 0; i < n; i++) { update(); if (G.done) break; } render(); return { state: G.state, level: LV.id, x: Math.round(P.x), score: G.score, deaths: G.deaths, lives: G.lives }; },
  renderFullMap,
  loadLevel(id) { G.level = levelIndex(id); G.checkpoint = false; resetLevel(); },
  icon(size) {
    const c = mk(size, size), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.fillStyle = '#2a86ff'; x.fillRect(0, 0, size, size);
    const k = size / 16; x.drawImage(BOLT, k * 0.5, k, BOLT.width * k * 0.95, BOLT.height * k * 0.95);
    return c.toDataURL('image/png');
  },
};
