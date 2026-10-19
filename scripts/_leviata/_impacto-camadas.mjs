// BLOCO D · the IMPACT — the layers of the close shot, from the colony without the carcass (`_colonia-sem-carcaca.mjs`,
// seed 11: the domes with lit windows right where the body lands):
//   f8-impacto-colonia.png — the whole frame (the colony before the impact);
//   f8-impacto-frente.png  — the ground IN FRONT of the impact: every pixel below an IRREGULAR line (never a straight
//                            cut — `partir-da-arte-aprovada`); the body's nose sinks behind it;
//   src/scenes/final/janelasImpacto.ts — the lit windows (pixel, colour) and the wall colour that replaces them when
//                            the lights die, in sequence from the impact outward.
//   node scripts/_leviata/_impacto-camadas.mjs [seed=11]
import fs from 'node:fs';
import sharp from 'sharp';

const [SEED = '11'] = process.argv.slice(2);
const SRC = `docs/superpowers/folhas/2026-10-18/leviata/impacto/colonia/colonia-${SEED}-0.png`;
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
await sharp(SRC).png().toFile('public/sprites/f8-impacto-colonia.png');

// The front line: around y≈160 with an uneven wobble (three incommensurate sines). ⚠️ A dome ellipse in front took sky
// pixels with it (it would have cut the body with a visible patch): the nose stops left of the right dome instead.
const corte = (x) => Math.round(160 + 2.5 * Math.sin(x * 0.11) + 1.8 * Math.sin(x * 0.29 + 1) + 1.2 * Math.sin(x * 0.71 + 2.3));
const frente = Buffer.alloc(W * H * 4, 0);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (y < corte(x)) continue;
  const i = (y * W + x) * 4;
  frente[i] = data[i]; frente[i + 1] = data[i + 1]; frente[i + 2] = data[i + 2]; frente[i + 3] = 255;
}
await sharp(frente, { raw: info }).png().toFile('public/sprites/f8-impacto-frente.png');

// The windows: warm lit pixels (r > 120, r − b > 35, g in 70..r). The wall colour is the darkest of the 4 neighbours
// that is not a window.
const janela = (i) => data[i] > 120 && data[i] - data[i + 2] > 35 && data[i + 1] > 70 && data[i + 1] < data[i];
const lista = [];
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const i = (y * W + x) * 4;
  if (!janela(i)) continue;
  let parede = null, lum = Infinity;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const j = ((y + dy) * W + x + dx) * 4;
    if (janela(j)) continue;
    const l = data[j] + data[j + 1] + data[j + 2];
    if (l < lum) { lum = l; parede = (data[j] << 16) | (data[j + 1] << 8) | data[j + 2]; }
  }
  lista.push({ x, y, parede: parede ?? 0x1b242d });
}
const ts = `// GERADO por \`scripts/_leviata/_impacto-camadas.mjs\` (não edite à mão): as janelas acesas da colônia do plano
// do impacto (\`f8-impacto-colonia.png\`) e a cor da parede que as cobre quando a luz morre.
export const JANELAS_IMPACTO: ReadonlyArray<{ x: number; y: number; parede: number }> = [
${lista.map((j) => `  { x: ${j.x}, y: ${j.y}, parede: 0x${j.parede.toString(16).padStart(6, '0')} },`).join('\n')}
];
`;
fs.writeFileSync('src/scenes/final/janelasImpacto.ts', ts);
console.log(`colonia + frente (corte ~160) · ${lista.length} janelas`);
