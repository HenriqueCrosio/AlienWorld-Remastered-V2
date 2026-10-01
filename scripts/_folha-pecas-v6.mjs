// Round 6 sheet: the directional explosions SMALLER (shrunk by code from the approved #3/#15, and PixelLab's redraw),
// the round #53 for the missile, and the ALIEN directional (manta recolour vs its own energy cone).
// Usage: node scripts/_folha-pecas-v6.mjs <artdir> <bg-1152.png> <out.png>
import sharp from 'sharp';

const [ARTE, BG, OUT] = process.argv.slice(2);
const S = 3, LARG = 1640, COLV = 130 * S + 16;
const R5 = 'docs/superpowers/folhas/2026-10-01/pecas-novas/rodada5';
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
    const x = p.cx !== undefined ? p.cx - m.width / 2 : p.ix !== undefined ? p.ix - m.width * 0.22 : p.x;
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
const missilH = await trim(`${ARTE}/pixel/missil-humano-pequeno.png`);
const N = { x: 14, y: 18 }, ALVO = { cx: 100, cy: 30 };
const impacto = { ix: ALVO.cx - 7, iy: ALVO.cy };

const comp = [{ input: texto('PEÇAS · 6ª RODADA — as direcionais MENORES, a redonda #53 no míssil e a ALIEN direcional (1152)', LARG, 18, '#e0e6f0'), left: 20, top: 16 }];
let y = 56;
async function secao(tag, pecas, z, cenaFn) {
  comp.push({ input: texto(tag, LARG), left: 20, top: y });
  y += 30;
  let x = 20, alt = 0;
  const cenas = [];
  for (const [i, p] of pecas.entries()) {
    const cru = await up(p.buf, z);
    comp.push({ input: texto(p.nome, 200, 14, '#8a93a6'), left: x, top: y });
    comp.push({ input: cru.buf, left: x, top: y + 18 });
    if (cenaFn) cenas.push(await vinheta(cenaFn(p.buf, i)));
    x += Math.max(cru.w, 110) + 22;
    alt = Math.max(alt, cru.h);
  }
  y += 18 + alt + 10;
  cenas.forEach((c, i) => comp.push({ input: c, left: 20 + (i % 4) * COLV, top: y + Math.floor(i / 4) * (60 * S + 12) }));
  if (cenas.length) y += Math.ceil(cenas.length / 4) * (60 * S + 12) - 12;
  y += 22;
}
const arq = async (f, nome) => ({ nome, buf: await trim(f) });
const cenaH = (p) => [{ buf: nave, ...N }, { buf: tiroH, x: 62, y: 30 }, { buf: inimigo, ...ALVO }, { buf: p, ...impacto }];
const cenaA = (p) => [{ buf: naveAlien, ...N }, { buf: tiroA, x: 62, y: 30 }, { buf: inimigo, ...ALVO }, { buf: p, ...impacto }];

await secao('HUMANA · direcional PEQUENA menor — a #3 aprovada, reduzida por código (75% · 60%) e redesenhada pelo PixelLab', [
  await arq(`${R5}/dir-peq-3.png`, '#3 original'),
  await arq(`${ARTE}/reduzidas/dir-peq-3-0.75.png`, '#3 · 75%'), await arq(`${ARTE}/reduzidas/dir-peq-3-0.6.png`, '#3 · 60%'),
  ...await Promise.all([0, 8, 40, 48].map((k) => arq(`${ARTE}/dir-peq-menor/${k}-u.png`, `redesenho #${k}`)))], 6, cenaH);
await secao('HUMANA · direcional GRANDE menor — a #15 aprovada, reduzida por código', [
  await arq(`${R5}/dir-grande-15.png`, '#15 original'),
  await arq(`${ARTE}/reduzidas/dir-grande-15-0.75.png`, '#15 · 75%'), await arq(`${ARTE}/reduzidas/dir-grande-15-0.6.png`, '#15 · 60%')], 4, cenaH);
await secao('MÍSSIL · explode REDONDO (#53) — chega de qualquer ângulo, então dispensa as 8 direções', [
  await arq(`${R5}/redonda-grande-53.png`, '#53')], 4,
  (p) => [{ buf: nave, ...N }, { buf: missilH, x: 64, y: 22 }, { buf: inimigo, ...ALVO }, { buf: p, cx: ALVO.cx - 4, cy: ALVO.cy }]);
await secao('ALIEN · direcional = a humana REPINTADA na manta', [
  await arq(`${ARTE}/reduzidas/alien-dir-peq-3-0.75.png`, 'pequena 75%'), await arq(`${ARTE}/reduzidas/alien-dir-peq-3-0.6.png`, 'pequena 60%'),
  await arq(`${ARTE}/reduzidas/alien-dir-grande-15-0.75.png`, 'grande 75%'), await arq(`${ARTE}/reduzidas/alien-dir-grande-15-0.6.png`, 'grande 60%')], 5, cenaA);
await secao('ALIEN · direcional PRÓPRIA — um cone de energia (plasma, sem fogo)', await Promise.all([8, 15, 34, 39].map((k) => arq(`${ARTE}/energia-dir/${k}.png`, `#${k}`))), 5, cenaA);

await sharp({ create: { width: 20 + 4 * COLV + 20, height: y, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(OUT);
console.log(OUT);
