// 25/10 (evening) — A NEW PAINT FOR THE JATO (the old human T1, `ship-jato`). He brought it back as the second ship of
// the hangar: "voltar a nave humana T1 antiga como outra escolha e pintar uma (com uma cor diferente das outras, você
// decide. Obs: dica, ela é inspirada na x-wing fighter)". The jato flaps its wings frame to frame, so the repaint is a
// PALETTE SWAP (no positions) over the 9 thrust frames, the 9 blue ones and the still:
//   - kept: the outline, the hand-drawn flame (and its blue), the yellow wing-tip lights that blink, the greys, the
//     dark teal canopy;
//   - the copper hull (oranges, browns, the cream plates of the nose) → the paint's HULL ramp, by luminance × GANHO;
//   - the red family (the stripe along the nose and the red-brown edges of the wing tips — where an X-wing wears its
//     squadron stripes) → the paint's STRIPE ramp, by luminance.
//   node scripts/_naves/_pintar-jato.mjs <outDir> <paint> [--nome=ship-jato]       paint: one of PINTURAS below
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ARGS = process.argv.slice(2);
const [OUT, PINTURA] = ARGS.filter((a) => !a.startsWith('--'));
const NOME = (ARGS.find((a) => a.startsWith('--nome=')) ?? '--nome=ship-jato').split('=')[1];
const SRC = 'public/sprites';

const rgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
const hsv = ([r, g, b]) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0 };
};

// Each paint: the hull ramp and the stripe ramp (dark → light), and the gain on the hull luminance.
const PINTURAS = {
  // The X-wing: weathered bone hull, red stripes. The jato's nose already wears a cream plate with a red stripe.
  osso: {
    casco: ['1e1c1a', '2e2b27', '403c36', '56514a', '6d675e', '857e73', '9c9588', 'b2ab9d', 'c6bfb1', 'd8d2c5'],
    faixa: ['3a1210', '5a1a16', '7a231d', '9a2c24', 'b8352c', 'c73d37', 'd84a3c', 'e45841'],
    ganho: 1.12,
  },
  // Gunmetal blue, red stripes: darker, closer to the game's hulls.
  aco: {
    casco: ['161b22', '222a35', '303b49', '3f4d5e', '506074', '627489', '76899e', '8b9db1', 'a2b2c3', 'bac7d4'],
    faixa: ['3a1210', '5a1a16', '7a231d', '9a2c24', 'b8352c', 'c73d37', 'd84a3c', 'e45841'],
    ganho: 1.0,
  },
  // Olive drab, sand stripes: the military one.
  oliva: {
    casco: ['1b1d12', '292c1b', '383d25', '484f30', '59623b', '6b7547', '7e8855', '939c67', 'a8af7c', 'bcc293'],
    faixa: ['3b3426', '5a5039', '7a6d4f', '9a8b66', 'b8a881', 'cfc09a', 'e0d3b0'],
    ganho: 1.0,
  },
};
const P = PINTURAS[PINTURA];
if (!P) throw new Error(`paint must be one of ${Object.keys(PINTURAS).join(', ')}`);
const CASCO = P.casco.map(rgb), FAIXA = P.faixa.map(rgb);

function naRampa(rampa, l) {
  const ls = rampa.map(lum);
  if (l <= ls[0]) return rampa[0];
  for (let i = 1; i < rampa.length; i++) {
    if (l <= ls[i]) {
      const t = (l - ls[i - 1]) / (ls[i] - ls[i - 1]);
      return rampa[i - 1].map((v, c) => Math.round(v + (rampa[i][c] - v) * t));
    }
  }
  return rampa[rampa.length - 1];
}

// The hand-drawn flame (`scripts/_exaustao-jato.mjs`), kept as is.
const CHAMA = new Set(['fffe0b', 'ffd60a', 'ffac0c', 'fe0101', 'b2321e']);
const hex = (c) => c.map((v) => v.toString(16).padStart(2, '0')).join('');

// What a colour of the jato becomes.
function nova(c) {
  const l = lum(c), { h, s } = hsv(c);
  if (l < 12 || CHAMA.has(hex(c))) return c; // outline, flame
  if (s > 0.8 && h >= 38 && h <= 62 && l > 170) return c; // the blinking yellow wing-tip lights
  if (s < 0.12 || (h >= 150 && h <= 260)) return c; // greys, the dark teal canopy
  if (h > 60 && h < 150) return c; // nothing green in the jato, but never repaint what this does not know
  // The red family: the nose stripe and the red-brown edges of the wing tips.
  if ((h < 18 || h > 340) && s > 0.6 && l >= 45) return naRampa(FAIXA, l * 1.15);
  return naRampa(CASCO, l * P.ganho);
}

fs.mkdirSync(OUT, { recursive: true });
const entradas = [['ship-jato.png', `${NOME}.png`]];
for (let i = 0; i < 9; i++) {
  entradas.push([`ship-jato-anim-${i}.png`, `${NOME}-anim-${i}.png`]);
  entradas.push([`ship-jato-azul-anim-${i}.png`, `${NOME}-azul-anim-${i}.png`]);
}
for (const [de, para] of entradas) {
  const { data, info } = await sharp(path.join(SRC, de)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 40) continue;
    const c = nova([data[i], data[i + 1], data[i + 2]]);
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(path.join(OUT, para));
}
console.log(`${NOME} (${PINTURA}): still + 9 + 9 azul → ${OUT}`);
