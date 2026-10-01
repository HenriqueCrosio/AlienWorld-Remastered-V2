// Round 5 sheet: the small hand-drawn missiles, and the impact explosions BY LINEAGE — human = real explosive (the
// DIRECTIONAL ones, projected along the shot, vs the round ones), alien = energy burst in the manta colours.
// Usage: node scripts/_folha-pecas-v5.mjs <artdir> <bg-1152.png> <out.png>
import sharp from 'sharp';

const [ARTE, BG, OUT] = process.argv.slice(2);
const S = 3, LARG = 1640, COLV = 130 * S + 16;
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
    const x = p.cx !== undefined ? p.cx - m.width / 2 : p.ix !== undefined ? p.ix - m.width * 0.22 : p.x; // ix: impact point at ~22% of the width (directional)
    const y = p.cy !== undefined ? p.cy - m.height / 2 : p.iy !== undefined ? p.iy - m.height / 2 : p.y;
    camadas.push({ input: (await up(p.buf, S)).buf, left: Math.round(x * S), top: Math.round(y * S) });
  }
  return sharp(fundo).composite(camadas).png().toBuffer();
}
const nave = await trim('public/sprites/naves/humana-t2.png');
const naveAlien = await trim('public/sprites/naves/alien-t1.png');
const inimigo = await sharp(await trim('public/sprites/enemy-drone.png')).flop().png().toBuffer();
const tiroH = await trim(`${ARTE}/pixel/tiro-humano-A.png`);
const tiroA = await trim(`${ARTE}/pixel/tiro-alien-A.png`);
const N = { x: 14, y: 18 }, ALVO = { cx: 100, cy: 30 };
const impacto = { ix: ALVO.cx - 7, iy: ALVO.cy };

const comp = [{ input: texto('PEÇAS · 5ª RODADA — mísseis pequenos (à mão) e a EXPLOSÃO DE IMPACTO por linhagem (1152 · o tiro vem da esquerda)', LARG, 18, '#e0e6f0'), left: 20, top: 16 }];
let y = 56;
async function secao(tag, pecas, z, cenaFn) {
  comp.push({ input: texto(tag, LARG), left: 20, top: y });
  y += 30;
  let x = 20, alt = 0;
  const cenas = [];
  for (const [i, p] of pecas.entries()) {
    const cru = await up(p.buf, z);
    comp.push({ input: texto(p.nome, 180, 14, '#8a93a6'), left: x, top: y });
    comp.push({ input: cru.buf, left: x, top: y + 18 });
    if (cenaFn) cenas.push(await vinheta(cenaFn(p.buf, i)));
    x += Math.max(cru.w, 90) + 22;
    alt = Math.max(alt, cru.h);
  }
  y += 18 + alt + 10;
  cenas.forEach((c, i) => comp.push({ input: c, left: 20 + (i % 4) * COLV, top: y + Math.floor(i / 4) * (60 * S + 12) }));
  if (cenas.length) y += Math.ceil(cenas.length / 4) * (60 * S + 12) - 12;
  y += 22;
}
const arq = async (f, nome) => ({ nome, buf: await trim(f) });
const lote = (dir, ks, pre = '') => Promise.all(ks.map((k) => arq(`${ARTE}/${dir}/${pre}${k}.png`, `#${k}`)));

await secao('MÍSSIL · redesenhado à mão em 16×5 (era 26×7) — humano e alien B', [
  await arq(`${ARTE}/pixel/missil-humano-pequeno.png`, 'humano'), await arq(`${ARTE}/pixel/missil-alien-pequeno.png`, 'alien B')], 10,
  (p, i) => [{ buf: i === 0 ? nave : naveAlien, x: 30, y: 18 }, { buf: p, x: 80, y: 22 }, { buf: p, x: 66, y: 36 }]);

const cenaH = (p) => [{ buf: nave, ...N }, { buf: tiroH, x: 62, y: 30 }, { buf: inimigo, ...ALVO }, { buf: p, ...impacto }];
const cenaHr = (p) => [{ buf: nave, ...N }, { buf: tiroH, x: 62, y: 30 }, { buf: inimigo, ...ALVO }, { buf: p, cx: impacto.ix, cy: impacto.iy }];
await secao('HUMANA · DIRECIONAL pequena (Explosivo) — o fogo segue o tiro', await lote('exp-dir-peq', [3, 13, 33, 48]), 5, cenaH);
await secao('HUMANA · DIRECIONAL grande (Explosão Maior) — #13 deixa o rastro de fumaça', await lote('exp-dir-grande', [2, 7, 13, 15]), 4, cenaH);
await secao('HUMANA · REDONDA pequena (para comparar)', await lote('exp-humana-peq', [7, 13, 30, 62]), 5, cenaHr);
await secao('HUMANA · REDONDA grande, com pouca fumaça (para comparar)', await lote('exp-humana-grande', [5, 23, 44, 53]), 4, cenaHr);
const cenaA = (p) => [{ buf: naveAlien, ...N }, { buf: tiroA, x: 62, y: 30 }, { buf: inimigo, ...ALVO }, { buf: p, cx: impacto.ix, cy: impacto.iy }];
await secao('ALIEN · estouro de ENERGIA pequeno (o plasma repintado na manta)', await lote('alien-energia', [11, 27, 43, 60], 'peq-'), 5, cenaA);
await secao('ALIEN · estouro de ENERGIA grande', await lote('alien-energia', [1, 13, 30, 47], 'grande-'), 4, cenaA);

await sharp({ create: { width: 20 + 4 * COLV + 20, height: y, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(OUT);
console.log(OUT);
