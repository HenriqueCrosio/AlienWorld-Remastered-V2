// 25/10 (evening) — THE HUMAN SHIP ON THE BLACK "a" MOLD. He played the orange "a" and changed the base: "aquele
// conceito da nave preta 'a' que tínhamos na folha tem o melhor design ... podemos usar a preta 'a' como molde para
// fazer a laranja". So the FORM is the black "a" (`preta-48x32-21-00`), pixel for pixel, and both paints come from it:
//   <nome>.png, <nome>-anim-0..7.png, <nome>-azul-anim-0..7.png   (44x26, like every ship)
// - THE FRAME: the black "a" (48x32) moved by (DX,DY) so its drawn box (with the painted flame) is centred on the
//   44x26 frame — the fixed hitbox is centred on the frame.
// - THE FLAME: the one painted in the black "a" (x4–7, rows 16–18, against the nozzle ring at x8) is erased and
//   redrawn by hand in 8 frames, in the flame colours of the orange "a" (the game's language); 3 rows, the nozzle of
//   the black "a" is smaller than the orange one's. The blue one (the Propulsores card) goes through the luminance
//   ramp of `scripts/_jato-azul.mjs`.
// - THE BLACK PAINT: the black "a" itself, its graphite hull lightened to S × its luminance on its own ramp (the raw
//   one measured 1.03–1.13× in F3; the bar is 1.5×). Amber canopy, orange lights, nose and nozzle stay.
// - THE ORANGE PAINT: the graphite hull goes to the copper ramp of the orange "a" by QUANTILE (each graphite tone takes
//   the copper tone at the same rank, so the shading of the black "a" stays and the brightness is the orange "a"'s);
//   the amber canopy goes back to the cyan of the orange "a", the orange keel lights to its yellow lights; the steel
//   nose and the nozzle stay grey.
//   node scripts/_naves/_nave-molde-preta.mjs <outDir> [S=1.0] [--so=laranja|preta] [--nome=humana]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const MOLDE = 'docs/superpowers/folhas/2026-10-22/naves/cru/conceito/gerado/preta-48x32-21-00.png';
const COBRE = 'docs/superpowers/folhas/2026-10-22/naves/cru/conceito/gerado/laranja-48x32-21-00.png';
const ARGS = process.argv.slice(2);
const opt = (k, d) => (ARGS.find((a) => a.startsWith(`--${k}=`)) ?? `=${d}`).split('=')[1];
const [OUT, SS] = ARGS.filter((a) => !a.startsWith('--'));
const S = Number(SS ?? 1.0);
const SO = opt('so', '');
const NOME = opt('nome', 'humana');
const W = 44, H = 26, DX = -2, DY = -3;

// The flame, rows 16–18 of the black "a", each string ending at x7 (the column touching the nozzle). '.' = empty.
const COR_FOGO = { W: 'f9f4de', H: 'f0b65a', Y: 'f9ab03', O: 'de8d47', R: 'ea4a1f' };
const FOGO = [
  ['RYH', 'RRYHW', 'RRO'], // 0: the size of the flame painted in the black "a"
  ['RRYH', 'RRRYHW', 'RRO'],
  ['RYH', 'R.RYHW', 'RRRO'],
  ['RRYH', 'RRYHW', 'RO'],
  ['YH', 'RYHW', 'RO'],
  ['RYH', 'RRRYHW', 'R.RO'],
  ['RRRYH', 'RRRRYHW', 'RRRO'].map((l) => l.slice(-6)),
  ['RRYH', 'RRYHW', 'RO'], // not a copy of frame 0: the loop would hold a frame where it wraps
];
const FOGO_Y0 = 16, FOGO_X1 = 7;
// THE SWAY — tried and taken out the same night. He asked for the jato's bob (the whole ship rising and falling 2 px
// on a slow sine, 16 frames = two turns of the flame), then: "não faz sentido deixar uma movimentação de flutuando em
// naves que voam no espaço, além disso, no flap não fica perceptível ... podemos retirar". BALANCO_PX = 0 → 8 frames,
// the flame only; 1 brings the bob back (16 frames; BootScene's frame counts follow).
const BALANCO_PX = 0;
const N_QUADROS = BALANCO_PX ? 16 : FOGO.length;
const BALANCO = Array.from({ length: N_QUADROS }, (_, i) => -Math.round(BALANCO_PX * Math.sin((2 * Math.PI * i) / N_QUADROS)));

const RAMPA = [[90, '041ef7'], [130, '0378fa'], [165, '0399fa'], [195, '09cefa'], [225, '08ecfc'], [245, 'e2feff'], [256, 'fafcfc']];
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const sat = ([r, g, b]) => { const mx = Math.max(r, g, b); return mx ? (mx - Math.min(r, g, b)) / mx : 0; };
const rgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
const azul = (hex) => RAMPA.find(([t]) => lum(rgb(hex)) < t)[1];

// A colour on a ramp (sorted dark → light) at luminance l, interpolated between neighbours.
function naRampa(rampa, l) {
  const ls = rampa.map(lum);
  if (l <= ls[0]) return rampa[0];
  for (let i = 1; i < rampa.length; i++) {
    if (l <= ls[i]) {
      const t = (l - ls[i - 1]) / (ls[i] - ls[i - 1]);
      return rampa[i - 1].map((v, c) => Math.round(v + (rampa[i][c] - v) * t));
    }
  }
  const top = rampa[rampa.length - 1], s = l / ls[ls.length - 1];
  return top.map((v) => Math.min(255, Math.round(v * s)));
}
// The graphite ramp of the black "a" (its own hull colours) and the copper ramp of the orange "a" (its saturated hull).
const GRAFITE = ['080809', '0f1115', '14171a', '1c1a1b', '222124', '28292a', '302f31', '383536', '413e3e', '4c4949', '55524c',
  '615f5a', '696565', '6d6961', '766f64', '7f807b', 'a4a6a2'].map(rgb);
const COBRE_RAMPA = ['281b15', '3a231a', '513222', '703d25', '7c4528', '874d2d', '935631', 'aa6437', 'bb6736', 'cf7f44', 'd38854'].map(rgb);
// The orange "a" canopy and lights.
const CIANO = { escuro: rgb('449fb3'), claro: rgb('c0e2da') };
const LUZ = { forte: rgb('f0b65a'), clara: rgb('fde18b') };

const ler = async (f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data: base, info } = await ler(MOLDE);
const at = (x, y) => (y * info.width + x) * 4;
const px = (d, w, x, y) => [d[(y * w + x) * 4], d[(y * w + x) * 4 + 1], d[(y * w + x) * 4 + 2]];

// Regions of the black "a" (its own coordinates).
const ehChama = (x, y) => x <= FOGO_X1 && y >= 15 && y <= 19;
const ehBocal = (x, y) => x >= 8 && x <= 12 && y >= 15 && y <= 19; // the double nozzle ring
const ehNariz = (x, y) => x >= 37 && y >= 15 && y <= 18; // the steel needle
const ehCabine = (x, y) => x >= 28 && x <= 33 && y >= 13 && y <= 14;

// What a pixel of the black "a" is.
function classe(x, y, c) {
  const l = lum(c);
  if (l < 20) return 'contorno';
  if (ehCabine(x, y) && (sat(c) >= 0.3 || l >= 180)) return 'cabine'; // the amber glass and its pale glint
  if (sat(c) >= 0.3) return 'luz'; // the orange keel lights and the red one
  if (ehBocal(x, y) || ehNariz(x, y)) return 'aco';
  return 'casco';
}

// THE QUANTILE MAP graphite → copper: the share of hull pixels darker than each graphite tone picks the copper tone at
// the same share of the orange "a"'s copper pixels.
const cascoLs = [];
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const i = at(x, y);
  if (base[i + 3] <= 40 || ehChama(x, y)) continue;
  const c = px(base, info.width, x, y);
  if (classe(x, y, c) === 'casco') cascoLs.push(lum(c));
}
cascoLs.sort((a, b) => a - b);
const cobre = await ler(COBRE);
const cobreLs = [];
for (let y = 0; y < cobre.info.height; y++) for (let x = 0; x < cobre.info.width; x++) {
  if (cobre.data[(y * cobre.info.width + x) * 4 + 3] <= 40 || (x <= 8 && y >= 15 && y <= 19)) continue;
  const c = px(cobre.data, cobre.info.width, x, y);
  if (sat(c) >= 0.3 && c[2] < c[0] && lum(c) < 185 && lum(c) >= 22) cobreLs.push(lum(c));
}
cobreLs.sort((a, b) => a - b);
function quantil(l) {
  const abaixo = cascoLs.filter((v) => v < l).length, igual = cascoLs.filter((v) => v === l).length;
  const u = (abaixo + igual / 2) / cascoLs.length;
  return cobreLs[Math.min(cobreLs.length - 1, Math.max(0, Math.round(u * (cobreLs.length - 1))))];
}

function pintar(pintura, x, y, c) {
  const k = classe(x, y, c), l = lum(c);
  if (k === 'contorno' || k === 'aco') return c;
  if (pintura === 'preta') {
    if (k === 'casco' && l < 160) return naRampa(GRAFITE, Math.min(160, l * S));
    return c;
  }
  if (k === 'cabine') return l >= 190 ? CIANO.claro : CIANO.escuro;
  if (k === 'luz') return l >= 150 ? LUZ.clara : LUZ.forte;
  return naRampa(COBRE_RAMPA, quantil(l));
}

// Frame q of the thrust: the flame of frame q % 8, the whole ship (flame included) moved by the sway of frame q.
function quadro(pintura, q, motorAzul) {
  const o = Buffer.alloc(W * H * 4);
  const f = q % FOGO.length, dy = DY + BALANCO[q];
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = at(x, y);
    if (base[i + 3] <= 40 || ehChama(x, y)) continue;
    const X = x + DX, Y = y + dy;
    if (X < 0 || Y < 0 || X >= W || Y >= H) throw new Error(`the black "a" does not fit the frame at ${x},${y}`);
    o.set([...pintar(pintura, x, y, px(base, info.width, x, y)), 255], (Y * W + X) * 4);
  }
  FOGO[f].forEach((linha, j) => {
    [...linha].forEach((ch, k) => {
      if (ch === '.') return;
      const X = FOGO_X1 - (linha.length - 1 - k) + DX, Y = FOGO_Y0 + j + dy;
      if (X < 0) throw new Error(`flame frame ${f} row ${j} runs out of the frame`);
      const hex = motorAzul ? azul(COR_FOGO[ch]) : COR_FOGO[ch];
      o.set([...rgb(hex), 255], (Y * W + X) * 4);
    });
  });
  return sharp(o, { raw: { width: W, height: H, channels: 4 } }).png();
}

fs.mkdirSync(OUT, { recursive: true });
for (const pintura of SO ? [SO] : ['laranja', 'preta']) {
  const nome = pintura === 'laranja' ? NOME : `${NOME}-preta`;
  await quadro(pintura, 0, false).toFile(path.join(OUT, `${nome}.png`));
  for (let q = 0; q < N_QUADROS; q++) {
    await quadro(pintura, q, false).toFile(path.join(OUT, `${nome}-anim-${q}.png`));
    await quadro(pintura, q, true).toFile(path.join(OUT, `${nome}-azul-anim-${q}.png`));
  }
  console.log(`${nome}: still + ${N_QUADROS} + ${N_QUADROS} azul, sway ${BALANCO.join(',')}${pintura === 'preta' ? ` (S ${S})` : ''}`);
}
