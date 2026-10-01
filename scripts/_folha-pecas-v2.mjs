// Round 2 sheet of the new card art: the small drones, the medium missile and the flare animations (idle loop + its
// own blast), raw and IN SCENE at the real 1152 scale. Usage: node scripts/_folha-pecas-v2.mjs <artdir> <bg-1152.png> <out.png>
import sharp from 'sharp';

const [ARTE, BG, OUT] = process.argv.slice(2);
const S = 3;
const LARG = 1640;
const trim = (f) => sharp(f).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
const up = async (buf, z) => { const m = await sharp(buf).metadata(); return { buf: await sharp(buf).resize(m.width * z, m.height * z, { kernel: 'nearest' }).toBuffer(), w: m.width * z, h: m.height * z }; };
const texto = (s, w, size = 22, cor = '#ffb040') => Buffer.from(`<svg width="${w}" height="${size + 10}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${size}" font-family="Consolas, monospace" font-size="${size}" fill="${cor}">${s}</text></svg>`);
async function vinheta(pecas) {
  const fundo = await sharp(BG).extract({ left: 150 * S, top: 100 * S, width: 130 * S, height: 60 * S }).toBuffer();
  const camadas = [];
  for (const p of pecas) camadas.push({ input: (await up(p.buf, S)).buf, left: Math.round(p.x * S), top: Math.round(p.y * S) });
  return sharp(fundo).composite(camadas).png().toBuffer();
}
const nave = await trim('public/sprites/naves/humana-t2.png');
const naveAlien = await trim('public/sprites/naves/alien-t1.png');
const N = { x: 60, y: 18 };

const comp = [{ input: texto('PEÇAS NOVAS · 2ª RODADA — drones pequenos, míssil médio, flare animado · crus e EM CENA (1152)', LARG, 24, '#e0e6f0'), left: 20, top: 16 }];
let y = 64;
const COLV = 130 * S + 16;

const SECOES = [
  { tag: 'DRONE · humano (esfera, estilo astromecânico)', dir: 'drone-r2b', picks: [9, 17, 26, 37], z: 6, cena: (p) => [{ buf: nave, ...N }, { buf: p, x: N.x - 14, y: N.y + 22 }] },
  { tag: 'DRONE · alien (água-viva nas cores da manta)', dir: 'drone-agua', picks: [16, 34, 48, 60], z: 6, cena: (p) => [{ buf: naveAlien, ...N }, { buf: p, x: N.x - 14, y: N.y + 22 }] },
  { tag: 'MÍSSIL GUIADO · tamanho médio (entre o #36 e o #19)', dir: 'missil-medio', sufixo: '-u', picks: [16, 22, 41, 46], z: 5, cena: (p) => [{ buf: nave, ...N }, { buf: p, x: N.x + 48, y: N.y + 4 }, { buf: p, x: N.x + 32, y: N.y + 20 }] },
];
for (const s of SECOES) {
  comp.push({ input: texto(s.tag, LARG), left: 20, top: y });
  y += 36;
  let x = 20;
  for (const [i, k] of s.picks.entries()) {
    const peca = await trim(`${ARTE}/${s.dir}/${k}${s.sufixo ?? ''}.png`);
    const cru = await up(peca, s.z);
    comp.push({ input: texto(`#${k}`, 80, 18, '#8a93a6'), left: x, top: y });
    comp.push({ input: cru.buf, left: x, top: y + 24 });
    comp.push({ input: await vinheta(s.cena(peca)), left: 20 + i * COLV, top: y + 24 + 130 });
    x += Math.max(cru.w, 120) + 30;
  }
  y += 24 + 130 + 60 * S + 30;
}

// THE FLARE: the idle loop (PixMiniMax, 8 frames) and its own blast (frames 1–4 of the other tool), frame by frame.
const tira = async (dir, idx, z) => {
  let x = 20;
  for (const i of idx) {
    const f = await up(await sharp(`${ARTE}/${dir}/${i}.png`).png().toBuffer(), z);
    comp.push({ input: f.buf, left: x, top: y });
    x += f.w + 8;
  }
};
comp.push({ input: texto('FLARE · aceso, esperando (loop de 8 quadros — PixMiniMax)', LARG), left: 20, top: y });
y += 36;
await tira('flare-anim-pixminimax', [1, 2, 3, 4, 5, 6, 7, 8], 3);
y += 64 * 3 + 20;
comp.push({ input: texto('FLARE · a explosão PRÓPRIA dele (quadros 1–4 da outra ferramenta) — depois de ~3s, ou ao tocar', LARG), left: 20, top: y });
y += 36;
await tira('flare-anim-v2', [0, 1, 2, 3, 4], 3);
y += 64 * 3 + 20;
comp.push({ input: texto('FLARE em cena (atrás da nave) — e o DASH com imagens-fantasma', LARG), left: 20, top: y });
y += 36;
const flare = await trim(`${ARTE}/flare-anim-pixminimax/2.png`);
comp.push({ input: await vinheta([{ buf: nave, ...N }, { buf: flare, x: N.x - 40, y: N.y + 2 }]), left: 20, top: y });
const naveRaw = await sharp(nave).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const fantasma = (a) => { const b = Buffer.from(naveRaw.data); for (let i = 3; i < b.length; i += 4) b[i] = Math.round(b[i] * a); return sharp(b, { raw: naveRaw.info }).png().toBuffer(); };
comp.push({ input: await vinheta([{ buf: await fantasma(0.15), x: N.x - 30, y: N.y }, { buf: await fantasma(0.3), x: N.x - 20, y: N.y }, { buf: await fantasma(0.5), x: N.x - 10, y: N.y }, { buf: nave, ...N }]), left: 20 + COLV, top: y });
y += 60 * S + 30;

await sharp({ create: { width: 20 + 4 * COLV + 20, height: y, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(OUT);
console.log(OUT);
