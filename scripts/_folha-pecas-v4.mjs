// Round 4 sheet: hand-made pixel pieces (thin drone shots, shards), the alien missile as a recolour of #46, the new
// SKILL explosions, the new combustions, and every ANIMATION as a frame strip + an animated GIF.
// The enemy is shown FACING LEFT, as in the game (EnemySystem flips the sprite).
// Usage: node scripts/_folha-pecas-v4.mjs <artdir> <bg-1152.png> <outdir>
import fs from 'fs';
import sharp from 'sharp';

const [ARTE, BG, OUT] = process.argv.slice(2);
const S = 3, LARG = 1640, COLV = 130 * S + 16;
const PECAS = 'docs/superpowers/folhas/2026-10-01/pecas-novas';
// The hand-made pieces are already tight (and libvips' trim breaks on 1-px-tall images): trim only what is bigger.
const trim = async (f) => {
  const m = await sharp(f).metadata();
  return m.width <= 8 || m.height <= 4 ? sharp(f).ensureAlpha().png().toBuffer() : sharp(f).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
};
const up = async (buf, z) => { const m = await sharp(buf).metadata(); return { buf: await sharp(buf).resize(m.width * z, m.height * z, { kernel: 'nearest' }).toBuffer(), w: m.width * z, h: m.height * z }; };
const texto = (s, w, size = 20, cor = '#ffb040') => Buffer.from(`<svg width="${w}" height="${size + 10}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${size}" font-family="Consolas, monospace" font-size="${size}" fill="${cor}">${s}</text></svg>`);
async function vinheta(pecas) {
  const fundo = await sharp(BG).extract({ left: 150 * S, top: 100 * S, width: 130 * S, height: 60 * S }).toBuffer();
  const camadas = [];
  for (const p of pecas) {
    const m = await sharp(p.buf).metadata();
    const x = p.cx !== undefined ? p.cx - m.width / 2 : p.x;
    const y = p.cy !== undefined ? p.cy - m.height / 2 : p.y;
    camadas.push({ input: (await up(p.buf, S)).buf, left: Math.round(x * S), top: Math.round(y * S) });
  }
  return sharp(fundo).composite(camadas).png().toBuffer();
}
const nave = await trim('public/sprites/naves/humana-t2.png');
const naveAlien = await trim('public/sprites/naves/alien-t1.png');
const inimigo = await sharp(await trim('public/sprites/enemy-drone.png')).flop().png().toBuffer(); // faces LEFT, as in game
const N = { x: 50, y: 18 }, ALVO = { cx: 104, cy: 30 };

const comp = [{ input: texto('PEÇAS · 4ª RODADA — pixel à mão, míssil alien repintado, explosões das skills, combustões e as ANIMAÇÕES (1152 · inimigo virado para a esquerda, como no jogo)', LARG, 18, '#e0e6f0'), left: 20, top: 16 }];
let y = 56;
async function secao(tag, pecas, z, cenaFn) {
  comp.push({ input: texto(tag, LARG), left: 20, top: y });
  y += 30;
  let x = 20, alt = 0;
  const cenas = [];
  for (const [i, p] of pecas.entries()) {
    const cru = await up(p.buf, z);
    comp.push({ input: texto(p.nome, 160, 14, '#8a93a6'), left: x, top: y });
    comp.push({ input: cru.buf, left: x, top: y + 18 });
    if (cenaFn) cenas.push(await vinheta(cenaFn(p.buf, i)));
    x += Math.max(cru.w, 90) + 22;
    alt = Math.max(alt, cru.h);
  }
  y += 18 + alt + 10;
  // 4 scenes per row; more wrap to the next row
  cenas.forEach((c, i) => comp.push({ input: c, left: 20 + (i % 4) * COLV, top: y + Math.floor(i / 4) * (60 * S + 12) }));
  if (cenas.length) y += Math.ceil(cenas.length / 4) * (60 * S + 12) - 12;
  y += 22;
}
const arq = async (f, nome) => ({ nome, buf: await trim(f) });

await secao('TIROS DOS DRONES · finos como "–", à mão (humano / alien)', [
  ...await Promise.all(['A', 'B', 'C'].map((v) => arq(`${ARTE}/pixel/tiro-humano-${v}.png`, `humano ${v}`))),
  ...await Promise.all(['A', 'B', 'C'].map((v) => arq(`${ARTE}/pixel/tiro-alien-${v}.png`, `alien ${v}`))),
].slice(0, 6), 10, (p, i) => [{ buf: inimigo, ...ALVO }, { buf: i < 3 ? nave : naveAlien, ...N }, { buf: p, cx: 84, cy: 30 }, { buf: p, cx: 70, cy: 26 }]);
await secao('FRAGMENTAÇÃO · estilhaços à mão (2–4px)', await Promise.all(['A', 'B', 'C', 'D'].map((v) => arq(`${ARTE}/pixel/estilhaco-${v}.png`, v))), 12,
  (p) => [{ buf: inimigo, ...ALVO }, { buf: p, cx: 92, cy: 20 }, { buf: p, cx: 118, cy: 40 }, { buf: p, cx: 114, cy: 18 }, { buf: p, cx: 90, cy: 42 }]);
await secao('MÍSSIL · humano #46 e o ALIEN = o #46 repintado na manta (A: tudo manta · B: mantém o aço)', [
  await arq(`${PECAS}/missil-medio-46.png`, 'humano #46'), await arq(`${ARTE}/pixel/missil-alien-A.png`, 'alien A'), await arq(`${ARTE}/pixel/missil-alien-B.png`, 'alien B')], 6,
  (p, i) => [{ buf: i === 0 ? nave : naveAlien, ...N }, { buf: p, x: N.x + 50, y: N.y + 4 }, { buf: p, x: N.x + 34, y: N.y + 18 }]);
await secao('EXPLOSÃO DAS SKILLS · pequena (Explosivo, Míssil) — nova, não é a genérica do jogo', await Promise.all([11, 27, 43, 60].map((k) => arq(`${ARTE}/exp-skill-peq/${k}.png`, `#${k}`))), 5,
  (p) => [{ buf: inimigo, ...ALVO }, { buf: p, cx: ALVO.cx - 4, cy: ALVO.cy }]);
await secao('EXPLOSÃO DAS SKILLS · grande (Explosão Maior)', await Promise.all([1, 13, 30, 47].map((k) => arq(`${ARTE}/exp-skill-grande/${k}.png`, `#${k}`))), 4,
  (p) => [{ buf: inimigo, ...ALVO }, { buf: p, ...ALVO }]);
await secao('COMBUSTÃO · novas, sem fumaça, no estilo da #11 (a #11 aprovada à esquerda)', [
  await arq(`${PECAS}/rodada3/fx-fogo-11.png`, '#11 (aprovada)'), ...await Promise.all([1, 16, 20, 38].map((k) => arq(`${ARTE}/combustao-v2/${k}.png`, `#${k}`)))], 4,
  (p) => [{ buf: inimigo, ...ALVO }, { buf: p, ...ALVO }]);

// THE ANIMATIONS: strip + GIF each.
const ANIMS = [
  ['FLARE aceso (aprovado)', `${PECAS}/flare-loop`, [1, 2, 3, 4, 5, 6, 7, 8], 'flare-aceso', 110],
  ['DRONE humano · esfera #26', `${ARTE}/anim-r2`, [1, 2, 3, 4, 5, 6, 7, 8], 'drone-humano', 110],
  ['DRONE alien · água-viva #60', `${ARTE}/anim-agua`, [1, 2, 3, 4, 5, 6, 7, 8], 'drone-alien', 120],
  ['COMBUSTÃO #11 (explode e se apaga)', `${ARTE}/anim-fogo`, [0, 1, 2, 3, 4, 5, 6, 7], 'combustao', 80],
  ['SOBRECARGA #4 (o pulso)', `${ARTE}/anim-pulso`, [0, 1, 2, 3, 4, 5, 6, 7], 'sobrecarga', 80],
  ['INCENDIÁRIO · queimando #12', `${ARTE}/anim-queimando`, [1, 2, 3, 4, 5, 6, 7, 8], 'queimando', 100],
  ['ELÉTRICO · faísca #17', `${ARTE}/anim-faisca`, [0, 1, 2, 3, 4, 5, 6, 7], 'faisca', 70],
  ['ELÉTRICO · eletrificado #29 (travado)', `${ARTE}/anim-eletrificado`, [1, 2, 3, 4, 5, 6, 7, 8], 'eletrificado', 90],
];
fs.mkdirSync(`${OUT}/gif`, { recursive: true });
for (const [tag, dir, idx, nome, ms] of ANIMS) {
  comp.push({ input: texto(`ANIMAÇÃO · ${tag}  (GIF: gif/${nome}.gif)`, LARG), left: 20, top: y });
  y += 30;
  const quadros = await Promise.all(idx.map((i) => sharp(`${dir}/${i}.png`).ensureAlpha().png().toBuffer()));
  const m = await sharp(quadros[0]).metadata();
  const z = m.width <= 32 ? 4 : 3;
  let x = 20;
  for (const q of quadros) { const u = await up(q, z); comp.push({ input: u.buf, left: x, top: y }); x += u.w + 6; }
  // the GIF: frames over a dark backdrop, scaled ×z, looping
  const fundo = { r: 11, g: 13, b: 20, alpha: 1 };
  const gifQuadros = await Promise.all(quadros.map(async (q) => sharp({ create: { width: m.width * z, height: m.height * z, channels: 4, background: fundo } })
    .composite([{ input: (await up(q, z)).buf }]).png().toBuffer()));
  await sharp(gifQuadros, { join: { animated: true } }).gif({ delay: Array(gifQuadros.length).fill(ms), loop: 0 }).toFile(`${OUT}/gif/${nome}.gif`);
  y += m.height * z + 24;
}
await sharp({ create: { width: 20 + 4 * COLV + 20, height: y, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(`${OUT}/pecas-novas-rodada4.png`);
console.log(`${OUT}/pecas-novas-rodada4.png`);
