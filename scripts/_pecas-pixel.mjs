// Hand-made pixel pieces for the cards (the tiny ones the generator draws too big) + the alien missile as a RECOLOUR of
// the approved human missile #46. Usage: node scripts/_pecas-pixel.mjs <missil46.png> <outdir>
import fs from 'fs';
import sharp from 'sharp';

const [MISSIL, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255, 255];
const VAZIO = [0, 0, 0, 0];

/** Draws a sprite from rows of palette letters ('.' = empty). */
async function desenhar(nome, linhas, paleta) {
  const h = linhas.length, w = linhas[0].length;
  const buf = Buffer.alloc(w * h * 4);
  linhas.forEach((l, y) => [...l].forEach((c, x) => buf.set(c === '.' ? VAZIO : hex(paleta[c]), (y * w + x) * 4)));
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(`${OUT}/${nome}.png`);
}

// Palettes: hot (human / explosion) and energy (alien / shock).
const QUENTE = { a: 0x5c1a06, b: 0xa83a0e, c: 0xff8c1a, d: 0xffb040, e: 0xffd447, f: 0xfff1c0 };
const CIANO = { a: 0x0a3a44, b: 0x0e6b7a, c: 0x17a6bd, d: 0x3ee0f0, e: 0x8ff2fa, f: 0xe8feff };

// DRONE SHOTS — thin as a "-", flying right (bright head on the right).
await desenhar('tiro-humano-A', ['abcdef'], QUENTE);
await desenhar('tiro-humano-B', ['.bcdd.', 'abcdef', '.bcdd.'].map((l, i) => (i === 1 ? l : l.replace(/./g, (c) => (c === '.' ? '.' : 'a')))), QUENTE);
await desenhar('tiro-humano-C', ['bcdef'], QUENTE);
await desenhar('tiro-alien-A', ['abcdef'], CIANO);
await desenhar('tiro-alien-B', ['.bcdd.', 'abcdef', '.bcdd.'].map((l, i) => (i === 1 ? l : l.replace(/./g, (c) => (c === '.' ? '.' : 'a')))), CIANO);
await desenhar('tiro-alien-C', ['bcdef'], CIANO);

// THE MISSILE, redrawn small (16×5) from the approved #46: flame · fins · rusty body · steel band · nose. He found the
// 26×7 too big next to the 44×26 ship. Same drawing, two palettes (human; alien B = manta, keeps the steel).
const MISSIL_PEQ = [
  '....oR..........',
  '.Fo,,,,,,ssss o.'.replace(' ', 's'),
  'FGHR,RRRRSSssnno',
  '.Fo RRRRRRSSSSo.'.replace(' ', 'R'),
  '....oR..........',
];
const HUMANO = { o: 0x040202, R: 0x603c28, ',': 0x956143, S: 0x404547, s: 0x8a8c89, n: 0x686a69, F: 0xdd4f0f, G: 0xfb9317, H: 0xfecf5c };
const ALIEN = { ...HUMANO, R: 0x163a3b, ',': 0x2f6e66, F: 0x0e6b7a, G: 0x3ee0f0, H: 0xe8feff };
await desenhar('missil-humano-pequeno', MISSIL_PEQ, HUMANO);
await desenhar('missil-alien-pequeno', MISSIL_PEQ, ALIEN);

// SHARDS (Fragmentação) — 2 to 4 px slivers, hot metal.
await desenhar('estilhaco-A', ['..f', '.d.', 'b..'], QUENTE);
await desenhar('estilhaco-B', ['df', 'bd'], QUENTE);
await desenhar('estilhaco-C', ['bcdf'], QUENTE);
await desenhar('estilhaco-D', ['.e', 'cf', 'b.'], QUENTE);

// THE ALIEN MISSILE — the approved #46, recoloured to the manta: rusty hull → teal ramp, flame → cyan ramp, steel → dark
// teal-grey. Brightness of every pixel is kept (picks the ramp step by luminance).
const MANTA = [0x0c1f22, 0x163a3b, 0x22554f, 0x2f6e66, 0x4a8f86];
const JATO = [0x0e6b7a, 0x17a6bd, 0x3ee0f0, 0xb5f7ff, 0xffffff];
const { data, info } = await sharp(MISSIL).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (const [nome, manterAco] of [['missil-alien-A', false], ['missil-alien-B', true]]) {
  const out = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const quente = r > g + 25 && r > b + 40;
    const chama = quente && r > 200 && g > 110;
    let cor;
    if (chama) cor = JATO[Math.min(4, Math.floor(l * 5.2))];
    else if (quente) cor = MANTA[Math.min(4, Math.floor(l * 7))];
    else if (manterAco) continue;
    else cor = MANTA[Math.min(4, Math.floor(l * 6))];
    out.set(hex(cor).slice(0, 3), i);
  }
  await sharp(out, { raw: info }).png().toFile(`${OUT}/${nome}.png`);
}
console.log('ok', fs.readdirSync(OUT).join(' '));
