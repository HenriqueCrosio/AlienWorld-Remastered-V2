// Round 3 sheet of the card art: smaller drones, the alien missile, drone shots and the effects (fire burst, shockwave,
// overload pulse, shard, burning, spark, electrified, shield). Raw + IN SCENE at the 1152 scale.
// Usage: node scripts/_folha-pecas-v3.mjs <artdir> <bg-1152.png> <out.png>
import sharp from 'sharp';

const [ARTE, BG, OUT] = process.argv.slice(2);
const S = 3;
const LARG = 1640;
const COLV = 130 * S + 16;
const trim = (f) => sharp(f).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
const flipH = async (b) => sharp(b).flop().png().toBuffer();
const up = async (buf, z) => { const m = await sharp(buf).metadata(); return { buf: await sharp(buf).resize(m.width * z, m.height * z, { kernel: 'nearest' }).toBuffer(), w: m.width * z, h: m.height * z }; };
const texto = (s, w, size = 22, cor = '#ffb040') => Buffer.from(`<svg width="${w}" height="${size + 10}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${size}" font-family="Consolas, monospace" font-size="${size}" fill="${cor}">${s}</text></svg>`);
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
const inimigo = await trim('public/sprites/enemy-drone.png');
const N = { x: 60, y: 18 };
const ALVO = { cx: 100, cy: 30 }; // enemy centre in the vignette

const SECOES = [
  { tag: 'DRONE humano · MENOR (a esfera #9 redesenhada em ~11×12)', dir: 'r2-menor', picks: [2, 12, 26, 49], z: 6, cena: (p) => [{ buf: nave, ...N }, { buf: p, x: N.x - 12, y: N.y + 22 }] },
  { tag: 'MÍSSIL · ALIEN (espinho orgânico nas cores da manta)', dir: 'missil-alien', picks: [17, 25, 33, 41], z: 5, cena: (p) => [{ buf: naveAlien, ...N }, { buf: p, x: N.x + 48, y: N.y + 4 }, { buf: p, x: N.x + 32, y: N.y + 18 }] },
  { tag: 'TIRO do drone · humano', dir: 'tiro-drone-humano', picks: [9, 25, 41, 45], z: 6, cena: (p) => [{ buf: inimigo, ...ALVO }, { buf: p, cx: 70, cy: 34 }, { buf: p, cx: 50, cy: 38 }] },
  { tag: 'TIRO do drone · alien (espelhado: vinha virado para trás)', dir: 'tiro-drone-alien', picks: [2, 8, 16, 24], z: 6, flip: true, cena: (p) => [{ buf: inimigo, ...ALVO }, { buf: p, cx: 70, cy: 34 }, { buf: p, cx: 50, cy: 38 }] },
  { tag: 'COMBUSTÃO · a explosão de FOGO', dir: 'fx-fogo', picks: [6, 10, 7, 11], z: 3, cena: (p) => [{ buf: p, ...ALVO }] },
  { tag: 'CASCO REATIVO · a onda de choque', dir: 'fx-choque', picks: [2, 4, 7, 13], z: 3, cena: (p) => [{ buf: nave, ...N }, { buf: p, cx: N.x + 22, cy: N.y + 13 }] },
  { tag: 'SOBRECARGA · o pulso elétrico', dir: 'fx-pulso', picks: [0, 4, 7, 13], z: 3, cena: (p) => [{ buf: p, ...ALVO }] },
  { tag: 'FRAGMENTAÇÃO · o estilhaço', dir: 'fx-estilhaco', picks: [7, 36, 39, 60], z: 6, cena: (p) => [{ buf: inimigo, ...ALVO }, { buf: p, cx: 84, cy: 20 }, { buf: p, cx: 118, cy: 44 }] },
  { tag: 'INCENDIÁRIO · inimigo QUEIMANDO', dir: 'fx-queimando', picks: [4, 12, 41, 61], z: 6, cena: (p) => [{ buf: inimigo, ...ALVO }, { buf: p, cx: ALVO.cx, cy: ALVO.cy - 6 }] },
  { tag: 'ELÉTRICO · a faísca do acerto', dir: 'fx-faisca', picks: [3, 13, 17, 61], z: 6, cena: (p) => [{ buf: inimigo, ...ALVO }, { buf: p, cx: ALVO.cx - 6, cy: ALVO.cy }] },
  { tag: 'ELÉTRICO · inimigo ELETRIFICADO (travado)', dir: 'fx-eletrificado', picks: [28, 29, 30, 60], z: 5, cena: (p) => [{ buf: inimigo, ...ALVO }, { buf: p, ...ALVO }] },
  { tag: 'CASCO quebrando saiu como ESCUDO — melhor como ÍCONE da carta Casco (a quebra em jogo vai em código, pela silhueta)', dir: 'fx-casco', picks: [0, 2, 9, 14], z: 4, cena: null },
];

const comp = [{ input: texto('PEÇAS NOVAS · 3ª RODADA — drones menores, míssil alien, tiros dos drones e os EFEITOS das skills (1152)', LARG, 24, '#e0e6f0'), left: 20, top: 16 }];
let y = 64;
for (const s of SECOES) {
  comp.push({ input: texto(s.tag, LARG, 20), left: 20, top: y });
  y += 32;
  let x = 20, alt = 0;
  for (const [i, k] of s.picks.entries()) {
    let peca = await trim(`${ARTE}/${s.dir}/${k}.png`);
    if (s.flip) peca = await flipH(peca);
    const cru = await up(peca, s.z);
    comp.push({ input: texto(`#${k}`, 80, 16, '#8a93a6'), left: x, top: y });
    comp.push({ input: cru.buf, left: x, top: y + 20 });
    if (s.cena) comp.push({ input: await vinheta(s.cena(peca)), left: 20 + i * COLV, top: y + 20 + Math.max(alt, cru.h) + 8 });
    x += Math.max(cru.w, 100) + 24;
    alt = Math.max(alt, cru.h);
  }
  // second pass to align scenes under the tallest raw piece of the row
  y += 20 + alt + 8 + (s.cena ? 60 * S : 0) + 24;
}
await sharp({ create: { width: 20 + 4 * COLV + 20, height: y, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(OUT);
console.log(OUT);
