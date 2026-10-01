// Sheet of the new card art concepts (drones, missile, flare, dash): 4 picks each, raw (6×) and IN SCENE at the real
// 1152 scale (world ×3) next to the human T2 ship over the F2 background.
// Usage: node scripts/_folha-pecas-novas.mjs <artdir> <bg-1152.png> <out.png>
import sharp from 'sharp';

const [ARTE, BG, OUT] = process.argv.slice(2);
const S = 3; // world → screen at 1152
const NAVE = 'public/sprites/naves/humana-t2.png';
const NAVE_ALIEN = 'public/sprites/naves/alien-t1.png';
const trim = (f) => sharp(f).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
const up = async (buf, z) => { const m = await sharp(buf).metadata(); return { buf: await sharp(buf).resize(m.width * z, m.height * z, { kernel: 'nearest' }).toBuffer(), w: m.width * z, h: m.height * z, w1: m.width, h1: m.height }; };
const texto = (s, w, size = 22, cor = '#ffb040') => Buffer.from(`<svg width="${w}" height="${size + 10}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${size}" font-family="Consolas, monospace" font-size="${size}" fill="${cor}">${s}</text></svg>`);

/** A scene vignette: a crop of the F2 background (world 130×60) with the ship and one extra piece, at ×3. */
async function vinheta(pecas) {
  const W = 130, H = 60;
  const fundo = await sharp(BG).extract({ left: 150 * S, top: 100 * S, width: W * S, height: H * S }).toBuffer();
  const camadas = [];
  for (const p of pecas) camadas.push({ input: (await up(p.buf, S)).buf, left: Math.round(p.x * S), top: Math.round(p.y * S) });
  return sharp(fundo).composite(camadas).png().toBuffer();
}

/** The flame of a dash candidate: columns left of the hull (x < 50), trimmed. */
async function chama(f) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  for (let y = 0; y < info.height; y++) for (let x = 50; x < info.width; x++) out[(y * info.width + x) * 4 + 3] = 0;
  return sharp(out, { raw: info }).trim({ threshold: 1 }).png().toBuffer();
}

/** The ghost-trail alternative: 3 copies of the original ship behind it, fading. */
async function fantasmas(navef) {
  const nave = await sharp(navef).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const copia = (a) => { const b = Buffer.from(nave.data); for (let i = 3; i < b.length; i += 4) b[i] = Math.round(b[i] * a); return sharp(b, { raw: nave.info }).png().toBuffer(); };
  return [await copia(0.15), await copia(0.3), await copia(0.5)];
}

const nave = await trim(NAVE);
const naveAlien = await trim(NAVE_ALIEN);
const N = { x: 60, y: 18 }; // ship position in the vignette (world)

const SECOES = [
  { tag: 'DRONE AUXILIAR · humano', picks: [1, 16, 20, 38], dir: 'drone-humano', cena: async (p) => [{ buf: nave, ...N }, { buf: p, x: N.x - 18, y: N.y + 24 }] },
  { tag: 'DRONE AUXILIAR · alien', picks: [4, 5, 27, 58], dir: 'drone-alien', cena: async (p) => [{ buf: naveAlien, ...N }, { buf: p, x: N.x - 18, y: N.y + 24 }] },
  { tag: 'MÍSSIL GUIADO (do jogador)', picks: [16, 19, 36, 61], dir: 'missil', cena: async (p) => [{ buf: nave, ...N }, { buf: p, x: N.x + 50, y: N.y + 4 }, { buf: p, x: N.x + 34, y: N.y + 20 }] },
  { tag: 'FLARE (fica para trás)', picks: [4, 22, 43, 62], dir: 'flare', cena: async (p) => [{ buf: nave, ...N }, { buf: p, x: N.x - 40, y: N.y + 6 }] },
  { tag: 'DASH · o jato (só a chama vai para a nave ORIGINAL)', picks: [0, 3, 7, 15], dir: 'dash-humana-t2', chama: true, cena: async (p) => { const c = await sharp(p).metadata(); return [{ buf: p, x: N.x - c.width + 2, y: N.y + 13 - Math.round(c.height / 2) }, { buf: nave, ...N }]; } },
];

const LARG = 1640;
const comp = [{ input: texto('PEÇAS NOVAS DAS CARTAS — PixelLab · 4 de cada · crus e EM CENA na escala real (1152)', LARG, 24, '#e0e6f0'), left: 20, top: 16 }];
let y = 64;
const COLV = 130 * S + 16;
for (const s of SECOES) {
  comp.push({ input: texto(s.tag, LARG), left: 20, top: y });
  y += 36;
  let x = 20, alt = 0;
  for (const [i, k] of s.picks.entries()) {
    const f = `${ARTE}/${s.dir}/${k}.png`;
    const peca = s.chama ? await chama(f) : await trim(f);
    const cru = await up(peca, s.chama ? 3 : 6);
    comp.push({ input: texto(`#${k}`, 80, 18, '#8a93a6'), left: x, top: y });
    comp.push({ input: cru.buf, left: x, top: y + 24 });
    const v = await vinheta(await s.cena(peca));
    comp.push({ input: v, left: 20 + i * COLV, top: y + 24 + 150 });
    x += Math.max(cru.w, 120) + 30;
    alt = Math.max(alt, cru.h);
  }
  y += 24 + 150 + 60 * S + 30;
}
// The ghost alternative for the dash.
comp.push({ input: texto('DASH · alternativa SEM arte nova: imagens-fantasma da própria nave', LARG), left: 20, top: y });
y += 36;
const fs3 = await fantasmas(NAVE);
comp.push({ input: await vinheta([{ buf: fs3[0], x: N.x - 30, y: N.y }, { buf: fs3[1], x: N.x - 20, y: N.y }, { buf: fs3[2], x: N.x - 10, y: N.y }, { buf: nave, ...N }]), left: 20, top: y });
y += 60 * S + 30;

await sharp({ create: { width: 20 + 4 * COLV + 20, height: y, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(OUT);
console.log(OUT);
