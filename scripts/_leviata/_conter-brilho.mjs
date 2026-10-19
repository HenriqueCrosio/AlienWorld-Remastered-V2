// BLOCO D · passo 2 — his pick of 18/10 is `edit-73`, whose mouth burns too yellow (186 lava pixels with G > 150
// against today's 74). The Atmosfera does not tame it (its halo ADDS orange around hot pixels); what dims it is the
// lava layer fading 0.85 → 0.5 over chapter 4. This writes, for previews:
//   · <name>-cena85 / -cena50: cold body + lava at the start and at the end of the chapter;
//   · <name>-contido-*: the same with the yellow core of the HEAD (x < CABECA_X) moved to the nearest orange of
//     today's lava (G ≤ 150) — nothing else changes.
//   node scripts/_leviata/_conter-brilho.mjs <recorteDir> <name> [cabecaX=100]
import path from 'node:path';
import sharp from 'sharp';

const [DIR, NOME, CAB_S = '100'] = process.argv.slice(2);
const CABECA_X = Number(CAB_S);
const corpo = await sharp(path.join(DIR, `${NOME}-corpo.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const lava = await sharp(path.join(DIR, `${NOME}-lava.png`)).ensureAlpha().raw().toBuffer();
const { width: W, height: H } = corpo.info;

const hoje = await sharp('public/sprites/f8-leviata-lava.png').ensureAlpha().raw().toBuffer();
const laranjas = new Map();
for (let i = 0; i < hoje.length; i += 4) if (hoje[i + 3] && hoje[i + 1] <= 150) laranjas.set((hoje[i] << 16) | (hoje[i + 1] << 8) | hoje[i + 2], [hoje[i], hoje[i + 1], hoje[i + 2]]);
const pal = [...laranjas.values()];
const lumi = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
// Nearest by luminance first (keeps the light order of the core), hue second.
const laranja = (r, g, b) => {
  let best = pal[0], d = Infinity;
  for (const c of pal) { const e = (lumi(c) - lumi([r, g, b])) ** 2 * 2 + (c[0] - r) ** 2 + (c[2] - b) ** 2; if (e < d) { d = e; best = c; } }
  return best;
};
const contida = Buffer.from(lava);
let n = 0;
for (let p = 0; p < W * H; p++) {
  const i = p * 4;
  if (!contida[i + 3] || p % W >= CABECA_X || contida[i + 1] <= 150) continue;
  const c = laranja(contida[i], contida[i + 1], contida[i + 2]);
  contida[i] = c[0]; contida[i + 1] = c[1]; contida[i + 2] = c[2]; n++;
}

const raw = { raw: { width: W, height: H, channels: 4 } };
for (const [rot, lv] of [['', lava], ['-contido', contida]]) {
  if (rot) await sharp(lv, raw).png().toFile(path.join(DIR, `${NOME}${rot}-lava.png`));
  for (const a of [0.85, 0.5]) {
    const cena = Buffer.from(corpo.data);
    for (let o = 0; o < cena.length; o += 4) if (lv[o + 3]) for (let c = 0; c < 3; c++) cena[o + c] = Math.round(corpo.data[o + c] * (1 - a) + lv[o + c] * a);
    await sharp(cena, raw).png().toFile(path.join(DIR, `${NOME}${rot}-cena${Math.round(a * 100)}.png`));
  }
}
console.log(`${NOME}: ${n} pixels amarelos da cabeça contidos`);
