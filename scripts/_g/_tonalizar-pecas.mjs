// BLOCO G · round 6 — the candidate structures RE-TONED into the painting's darkness (the same curve as the ground's
// cadence, `_camadas-chao-f1.mjs` §6): L' = a·L^γ fitted so the piece's median and 90th percentile (the energy lights left
// out) land on the target; the hue kept (RGB × L'/L); the energy (amber windows, magenta pods) left as it is — it is
// light, not hull. Writes <outDir>/<piece>/<same name>.
//   node scripts/_g/_tonalizar-pecas.mjs <inDir> <outDir> [p50=30] [p90=56]
// (30/56: the in-game test of 20/10 — at the painting's own 18/36 the pieces sank into the ground and stopped reading as
// targets; raw at 42/74 they still stood out a step too light.)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const [IN, OUT, A50 = '30', A90 = '56'] = process.argv.slice(2);
const ALVO = { p50: Number(A50), p90: Number(A90) };
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const energia = (r, g, b) => (r >= 90 && r > b + 40 && r > g * 1.1) || (r > 120 && b > 90 && g < r * 0.6);

export async function tonalizar(arq, alvo = ALVO, clarear = false) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ls = [];
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128 && !energia(data[i], data[i + 1], data[i + 2])) ls.push(lum(data[i], data[i + 1], data[i + 2]));
  ls.sort((p, q) => p - q);
  const p50 = Math.max(1, ls[Math.floor(ls.length * 0.5)]), p90 = Math.max(p50 + 1, ls[Math.floor(ls.length * 0.9)]);
  // ONLY DARKENS by default: a piece already inside the target stays as it came, and no pixel is lifted. `clarear` (the
  // OBSTACLES — the rock and the wreck kill on touch, and at the painting's own darkness they vanished into the ground,
  // 20/10) lands them exactly on the target, lifting if needed.
  if (!clarear && p50 <= alvo.p50 && p90 <= alvo.p90) return sharp(arq).png().toBuffer();
  const t50 = clarear ? alvo.p50 : Math.min(alvo.p50, p50), t90 = clarear ? alvo.p90 : Math.min(alvo.p90, p90);
  const gama = Math.log(t90 / t50) / Math.log(p90 / p50);
  const a = t50 / Math.pow(p50, gama);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0 || energia(data[i], data[i + 1], data[i + 2])) continue;
    const L = lum(data[i], data[i + 1], data[i + 2]);
    if (L < 0.5) continue;
    const k = clarear ? (a * Math.pow(L, gama)) / L : Math.min(1, (a * Math.pow(L, gama)) / L);
    for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, Math.round(data[i + c] * k));
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

// The obstacles (indestructible, kill on touch) are landed on their own target, lifting if needed.
const OBSTACULOS = { pilar: { p50: 26, p90: 50 }, pilarAlto: { p50: 26, p90: 50 }, destroco: { p50: 26, p90: 50 } };
// The CLUSTERS are decoration on a plane BEHIND the structures (a step darker: the cadence) — darkened only.
const FUNDO = { aglomerado: { p50: 11, p90: 24 } };
if (IN && OUT) {
  for (const peca of fs.readdirSync(IN).filter((d) => fs.statSync(path.join(IN, d)).isDirectory())) {
    fs.mkdirSync(path.join(OUT, peca), { recursive: true });
    const obst = OBSTACULOS[peca];
    const a = obst ?? FUNDO[peca] ?? ALVO;
    let n = 0;
    for (const f of fs.readdirSync(path.join(IN, peca)).filter((f) => f.endsWith('.png'))) {
      fs.writeFileSync(path.join(OUT, peca, f), await tonalizar(path.join(IN, peca, f), a, !!obst));
      n++;
    }
    console.log(peca, n, `→ p50 ${a.p50}, p90 ${a.p90}${obst ? ' (obstáculo: pode clarear)' : ''}`);
  }
}
