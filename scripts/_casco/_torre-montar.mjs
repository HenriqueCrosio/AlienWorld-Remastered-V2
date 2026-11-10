// F3 HULL LAUNCHER (10/11) — the chosen concept (T2, the cradle of ribs: his "só os lançadores de mísseis com a variância
// da T2") assembled into the game's three variants. His note on the sheet: "existe uma diferença de cor, quero que você
// deixe os lança mísseis com a aparência que estão realmente conectados ao casco" + "caso queira criar uma base que case
// com o casco, fique à vontade".
//
// The raw palettes already match (the generation was palette-locked to the hull). What read as another colour was the
// MOUND each candidate brought along as its ground: a square-cut hump painted with the hull's LIGHT tones over a large
// area. So the mound goes, and the base is rebuilt from the hull's own art: the scale patch of `casco-escama` (where the
// hull's bones come out of scales), masked into a low dome that tapers to nothing at both ends and dissolves into the
// hull at its foot. The ribs, the pod and the copper pipes are kept pixel for pixel, in front of it.
//   node scripts/_casco/_torre-montar.mjs [--instalar]
// Writes `torre/lanca-misseis{,2,3}.png` + the measured mouths (`torre/bocas.json`) in the sheet's folder; with
// --instalar, also into public/sprites/.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-11-10/casco-pecas';
const INSTALAR = process.argv.includes('--instalar');
/** per variant: the row where the candidate's own mound starts (everything dark from there down is dropped) */
const VARIANTES = [
  // `bocas`: the CENTRE of each of the four launch holes, read on the enlarged art with a ruler (frame px). The amber
  // glints inside them are 1–3 px and off-centre, so the automatic measure below is only a cross-check.
  { de: 'torreCostela-a', para: 'lanca-misseis', corte: 41, bocas: [[46, 5], [53, 5], [51, 14], [58, 14]] },
  { de: 'torreCostela-b', para: 'lanca-misseis2', corte: 41, bocas: [[46, 5], [53, 5], [51, 14], [58, 14]] },
  { de: 'torreCostela-c', para: 'lanca-misseis3', corte: 42, bocas: [[46, 6], [53, 5], [50, 14], [57, 14]] },
];
/** the scale patch of the hull tile (`casco-escama`): x0, y0 of the sample window */
const ESCAMA = { arq: 'public/sprites/casco-escama.png', x0: 19, y0: 24, limpo: 54 };
const PRETO = [2, 1, 2];
/** the dome: how tall at its middle, how many rows of its foot dissolve into the hull */
const DOMO = { altura: 15, some: 5 };
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

const ler = async (arq) => {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
};
const ehOsso = (r, g, b) => r > 140 && g > 130 && b > 100 && r - b < 70;
const ehCobre = (r, g, b) => r > 95 && r - b > 35 && g > b && r > g && !(r > 200 && g > 160);
const ehBoca = (r, g, b) => r > 200 && g > 140 && b < 150 && r - b > 80;

const escama = await ler(ESCAMA.arq);
fs.mkdirSync(path.join(DIR, 'torre'), { recursive: true });
const bocasPorPeca = {};

for (const v of VARIANTES) {
  const src = await ler(path.join(DIR, 'escolhidas', `${v.de}.png`));
  const { w, h } = src;
  const out = Buffer.alloc(w * h * 4);
  const px = (buf, x, y) => { const i = (y * w + x) * 4; return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]; };
  const poe = (x, y, [r, g, b], a = 255) => { const i = (y * w + x) * 4; out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = a; };

  // 1 — the dome, from the hull's scales
  const cx = (w - 1) / 2, raio = w / 2 + 1;
  const topo = (x) => h - DOMO.altura * Math.sqrt(Math.max(0, 1 - ((x - cx) / raio) ** 2));
  for (let x = 0; x < w; x++) {
    const t = Math.round(topo(x));
    for (let y = t; y < h; y++) {
      const falta = h - 1 - y; // rows left to the foot
      if (falta < DOMO.some && BAYER[y & 3][x & 3] >= ((falta + 1) / (DOMO.some + 1)) * 16) continue; // dissolves
      if (y === t) { poe(x, y, PRETO); continue; } // the crest's outline
      // mirrored past the patch's clean width: further right the tile has a bone claw and a copper crack of its own
      const sx = ESCAMA.x0 + (x < ESCAMA.limpo ? x : 2 * ESCAMA.limpo - 1 - x);
      const i = ((ESCAMA.y0 + (y - (h - DOMO.altura))) * escama.w + sx) * 4;
      poe(x, y, [escama.d[i], escama.d[i + 1], escama.d[i + 2]]);
    }
  }

  // 2 — the candidate in front: all of it above the cut; from the cut down, only bone and copper (the roots)
  const manteve = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = px(src.d, x, y);
      if (a < 128) continue;
      if (y >= v.corte && !ehOsso(r, g, b) && !ehCobre(r, g, b)) continue;
      poe(x, y, [r, g, b]);
      manteve[y * w + x] = 1;
    }
  }
  // 3 — the roots keep a dark outline over the dome (their own went with the mound)
  for (let y = v.corte; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (manteve[y * w + x]) continue;
      const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const X = x + dx, Y = y + dy;
        return X >= 0 && X < w && Y >= v.corte && Y < h && manteve[Y * w + X];
      });
      if (viz && out[(y * w + x) * 4 + 3]) poe(x, y, PRETO);
    }
  }

  // 4 — the four mouths, measured: the amber clusters of the pod's face (x from the CENTRE, y from the TOP — `BOCAS`)
  const visto = new Uint8Array(w * h), bocas = [];
  for (let y = 0; y < v.corte; y++) {
    for (let x = 0; x < w; x++) {
      if (visto[y * w + x] || !ehBoca(...px(out, x, y))) continue;
      const fila = [[x, y]]; visto[y * w + x] = 1;
      let sx = 0, sy = 0, n = 0;
      while (fila.length) {
        const [a, b] = fila.pop(); sx += a; sy += b; n++;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const X = a + dx, Y = b + dy;
          if (X < 0 || X >= w || Y < 0 || Y >= v.corte || visto[Y * w + X] || !ehBoca(...px(out, X, Y))) continue;
          visto[Y * w + X] = 1; fila.push([X, Y]);
        }
      }
      bocas.push([Math.round(sx / n - w / 2), Math.round(sy / n), n]);
    }
  }
  bocasPorPeca[v.para] = v.bocas.map(([x, y]) => [x - w / 2, y]);
  console.log(`${v.para}: ${w}x${h}, mouths ${JSON.stringify(bocasPorPeca[v.para])} (glints seen at ${bocas.map(([x, y]) => `${x},${y}`).join(' ')})`);

  const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  fs.writeFileSync(path.join(DIR, 'torre', `${v.para}.png`), png);
  if (INSTALAR) fs.writeFileSync(`public/sprites/${v.para}.png`, png);
}
fs.writeFileSync(path.join(DIR, 'torre', 'bocas.json'), JSON.stringify(bocasPorPeca, null, 2) + '\n');
