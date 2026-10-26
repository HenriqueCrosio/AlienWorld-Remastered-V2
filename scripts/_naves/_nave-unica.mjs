// ⚠️ SUPERSEDED the same evening by `_nave-molde-preta.mjs` (he: "a preta 'a' tem o melhor design ... usar a preta 'a'
// como molde para fazer a laranja"). Kept only to rebuild the orange "a" of the afternoon for comparison.
// 25/10 — THE SINGLE HUMAN SHIP. He dropped the tier ladder ("vou retirar os tiers e trabalhar apenas com 1 tipo de
// nave, exatamente como aparecem no primeiro hangar") — the human flies the orange "a" from F1 to the end, in the paint
// picked in the hangar: orange or black. Whether they read well in play "precisamos descobrir jogando", so this writes
// the playable set straight into the game:
//   humana[-preta].png, humana[-preta]-anim-0..7.png, humana[-preta]-azul-anim-0..7.png   (44x26, like every ship)
// - THE FRAME: the "a" (48x32) moved by (DX,DY) so its drawn box is centred on the 44x26 frame (the fixed hitbox is
//   centred on the frame), with 2 free columns behind it for the flame to flicker into.
// - THE FLAME: the one painted in the "a" is erased and redrawn by hand, 8 frames (FOGO below, frame 0 = the painted
//   one), in the "a"'s own flame colours. The blue one (the Propulsores card) is the same flame through the luminance
//   ramp of `scripts/_jato-azul.mjs`.
// - THE BLACK PAINT (spec 2026-10-25 §4): the copper hull goes to the graphite ramp of the black "a" at K × its
//   luminance (K lightens it: the raw black "a" measured 1.03–1.13× in F3, the bar is 1.5×), the cyan canopy goes to
//   the amber of the black "a"; outline, greys, amber lights and the flame stay. Measured in F3 (`_plantar.mjs` +
//   `_contraste-jogo.mjs`, t30 at 110,108 and t75 at 120,60): K 0.6 → 1.33–1.6×, 0.75 → 1.47–1.76×, 0.8 → 1.67–1.75×
//   (the orange: 1.91–2.2×). 0.8 is the darkest that clears 1.5× in both spots — the installed one.
//   node scripts/_naves/_nave-unica.mjs <outDir> [K=0.8] [--so-preta]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BASE = 'docs/superpowers/folhas/2026-10-22/naves/cru/conceito/gerado/laranja-48x32-21-00.png';
const ARGS = process.argv.slice(2);
const [OUT, KS] = ARGS.filter((a) => !a.startsWith('--'));
const K = Number(KS ?? 0.8);
const SO_PRETA = ARGS.includes('--so-preta');
const W = 44, H = 26, DX = -1, DY = -3;

// The flame, rows y15–19 of the "a", each string ending at x8 (the column touching the nozzle). '.' = empty.
const COR_FOGO = { W: 'f9f4de', H: 'f0b65a', Y: 'f9ab03', O: 'de8d47', R: 'ea4a1f' };
const FOGO = [
  ['RRRO', 'RRYHW', 'RRYHHW', 'RRROH', 'RRR'], // 0: the flame painted in the "a"
  ['RRRRO', 'RRRYHW', 'RRRYHHW', 'RRRROH', 'RRRR'],
  ['RRRO', 'R.RRYHW', 'RRRYYHW', 'RRROH', 'RR'],
  ['RRO', 'RRYHW', 'RRYHHW', 'RRRROH', 'RRRR'],
  ['RO', 'RYHW', 'RRYHW', 'RROH', 'RR'],
  ['RRRO', 'RRYHW', 'RRRYHHW', 'RRROH', 'R.RR'],
  ['RRRRO', 'RRRYHW', 'RRRRYHHW', 'RRRROH', 'RRR'],
  ['RRO', 'RRYHW', 'RRRYHW', 'RROH', 'RRR'],
];
const FOGO_Y0 = 15, FOGO_X1 = 8;

// The blue flame: the ramp of the Propulsores icon, by luminance (as in `_jato-azul.mjs`).
const RAMPA = [[90, '041ef7'], [130, '0378fa'], [165, '0399fa'], [195, '09cefa'], [225, '08ecfc'], [245, 'e2feff'], [256, 'fafcfc']];
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const rgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
const azul = (hex) => RAMPA.find(([t]) => lum(rgb(hex)) < t)[1];

// The graphite ramp of the black "a" (its low-saturation hull colours, dark → light) and its amber canopy.
const GRAFITE = ['080809', '0f1115', '14171a', '1c1a1b', '222124', '28292a', '302f31', '383536', '413e3e', '4c4949', '55524c',
  '615f5a', '696565', '6d6961', '766f64', '7f807b', 'a4a6a2'].map(rgb);
const AMBAR = ['c86835', 'de843d', 'e5cfa9'].map(rgb);
// A colour on the graphite ramp at luminance l (interpolated between its neighbours, so no two hull tones merge).
function grafite(l) {
  const ls = GRAFITE.map(lum);
  if (l <= ls[0]) return GRAFITE[0];
  for (let i = 1; i < GRAFITE.length; i++) {
    if (l <= ls[i]) {
      const t = (l - ls[i - 1]) / (ls[i] - ls[i - 1]);
      return GRAFITE[i - 1].map((v, c) => Math.round(v + (GRAFITE[i][c] - v) * t));
    }
  }
  const top = GRAFITE[GRAFITE.length - 1], s = l / ls[ls.length - 1];
  return top.map((v) => Math.min(255, Math.round(v * s)));
}

const { data: base, info } = await sharp(BASE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const at = (x, y) => (y * info.width + x) * 4;
const ehChama = (x, y) => x <= FOGO_X1 && y >= FOGO_Y0 && y < FOGO_Y0 + 5;

// What each colour of the "a" becomes in the black paint.
function pretaDe(c) {
  const [r, g, b] = c, mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0, l = lum(c);
  if (l < 22) return c; // the outline
  if (sat < 0.3) return c; // the greys (nozzle, nose)
  if (b > r) return AMBAR[Math.min(AMBAR.length - 1, Math.floor((l - 120) / 40))]; // the cyan canopy → amber
  if (l >= 185) return c; // the amber lights
  return grafite(K * l); // the copper hull
}

function quadro(pintura, f, motorAzul) {
  const o = Buffer.alloc(W * H * 4);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = at(x, y);
    if (base[i + 3] <= 40 || ehChama(x, y)) continue;
    const X = x + DX, Y = y + DY;
    if (X < 0 || Y < 0 || X >= W || Y >= H) throw new Error(`the "a" does not fit the frame at ${x},${y}`);
    const c = [base[i], base[i + 1], base[i + 2]];
    o.set([...(pintura === 'preta' ? pretaDe(c) : c), 255], (Y * W + X) * 4);
  }
  FOGO[f].forEach((linha, j) => {
    [...linha].forEach((ch, k) => {
      if (ch === '.') return;
      const X = FOGO_X1 - (linha.length - 1 - k) + DX, Y = FOGO_Y0 + j + DY;
      if (X < 0) throw new Error(`flame frame ${f} row ${j} runs out of the frame`);
      const hex = motorAzul ? azul(COR_FOGO[ch]) : COR_FOGO[ch];
      o.set([...rgb(hex), 255], (Y * W + X) * 4);
    });
  });
  return sharp(o, { raw: { width: W, height: H, channels: 4 } }).png();
}

fs.mkdirSync(OUT, { recursive: true });
for (const pintura of SO_PRETA ? ['preta'] : ['laranja', 'preta']) {
  const nome = pintura === 'laranja' ? 'humana' : 'humana-preta';
  await quadro(pintura, 0, false).toFile(path.join(OUT, `${nome}.png`));
  for (let f = 0; f < FOGO.length; f++) {
    await quadro(pintura, f, false).toFile(path.join(OUT, `${nome}-anim-${f}.png`));
    await quadro(pintura, f, true).toFile(path.join(OUT, `${nome}-azul-anim-${f}.png`));
  }
  console.log(`${nome}: still + ${FOGO.length} + ${FOGO.length} azul${pintura === 'preta' ? ` (K ${K})` : ''}`);
}
