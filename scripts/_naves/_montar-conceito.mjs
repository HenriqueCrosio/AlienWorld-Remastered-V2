// 23/10 — the sheet image for HIS concepts recreated in PixelLab: per paint, his concept (the render, scaled to the
// row height) then the picked candidates at ×Z (frames 48×32), with today's T2 at the head of the orange row.
//   node scripts/_naves/_montar-conceito.mjs <out.png> --laranja=<png,...> --preta=<png,...>
import sharp from 'sharp';

const args = process.argv.slice(2);
const OUT = args.find((a) => !a.startsWith('--'));
const lista = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3).split(',') ?? [];
const C = 'docs/superpowers/folhas/2026-10-22/naves/cru/conceito';
const Z = 6, FW = 48, FH = 32, CW = FW * Z, CH = FH * Z, M = 14, LAB = 24, CONC = Math.round(CH * 1.7);

const texto = (t, w, size = 15, cor = '#d9dde6') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${LAB}"><text x="2" y="17" font-family="monospace" font-size="${size}" fill="${cor}">${t}</text></svg>`);
const sprite = async (f) => {
  const m = await sharp(f).metadata();
  const l = Math.floor((FW - m.width) / 2), t = Math.floor((FH - m.height) / 2);
  const cheio = await sharp(f).extend({ left: l, right: FW - m.width - l, top: t, bottom: FH - m.height - t, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp(cheio).resize({ width: CW, kernel: 'nearest' }).png().toBuffer();
};

const LINHAS = [
  ['LARANJA', `${C}/conceito-laranja.png`, [['T2 de hoje', 'public/sprites/naves/humana-t2.png'], ...lista('laranja').map((f, i) => [`candidata ${'abcd'[i]}`, f])]],
  ['PRETA', `${C}/conceito-preta.png`, [['', null], ...lista('preta').map((f, i) => [`candidata ${'abcd'[i]}`, f])]],
];
const tiles = [];
let top = M, largura = 0;
for (const [rot, conc, itens] of LINHAS) {
  tiles.push({ input: texto(rot, 600, 17), left: M, top });
  top += LAB;
  tiles.push({ input: texto('o seu concept', CONC, 13, '#9aa3b5'), left: M, top });
  tiles.push({ input: await sharp(conc).resize({ width: CONC, height: CH, fit: 'cover' }).png().toBuffer(), left: M, top: top + LAB });
  let x = M + CONC + M;
  for (const [nome, f] of itens) {
    if (f) {
      tiles.push({ input: texto(nome, CW, 13, '#9aa3b5'), left: x, top });
      tiles.push({ input: await sprite(f), left: x, top: top + LAB });
    }
    x += CW + M;
  }
  largura = Math.max(largura, x);
  top += LAB + CH + M * 2;
}
await sharp({ create: { width: largura, height: top, channels: 4, background: '#14161d' } }).composite(tiles).png().toFile(OUT);
console.log(OUT);
