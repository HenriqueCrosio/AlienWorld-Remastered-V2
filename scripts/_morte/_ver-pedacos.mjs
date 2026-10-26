// Debug: the pieces of each ship, magnified — each piece in a flat colour, the cut in white, the flame in red.
// Two rows per ship: the shatter and the break-up.   node scripts/_morte/_ver-pedacos.mjs <out.png> [semente=7]
import sharp from 'sharp';
import { sorte, ruido, ehChama, sementesEspalhadas, sementesNoEixo, partir, canais } from '../../src/systems/morte/pedacos.ts';
const [OUT, SEM = '7'] = process.argv.slice(2);
const ARQS = ['public/sprites/naves/humana-anim-3.png', 'public/sprites/naves/humana-preta-anim-3.png', 'public/sprites/ship-jato-anim-3.png',
  'public/sprites/naves/jato-osso-anim-3.png', 'public/sprites/naves/alien-t2-anim-3.png'];
const Z = 6, W = 44, H = 26;
const PAL = [[230, 120, 60], [70, 160, 220], [120, 200, 90], [200, 90, 200], [230, 200, 70], [90, 210, 200], [160, 120, 240], [240, 150, 160], [140, 140, 140], [200, 60, 60], [60, 100, 200], [180, 230, 140], [250, 180, 90], [110, 80, 160]];
const comp = [];
let y0 = 8;
for (const arq of ARQS) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cor = new Uint32Array(data.buffer, data.byteOffset, W * H).slice();
  const casco = { w: W, h: H, cor: cor.map((c, i) => (ehChama(c, i % W) ? 0 : c)) };
  const rnd = sorte(Number(SEM));
  const torto = ruido(W, H, 4, rnd);
  const modos = [partir(casco, sementesEspalhadas(casco, 11, 6, rnd), torto, 2.5), partir(casco, sementesNoEixo(casco, rnd), torto, 3.5)];
  let x0 = 8;
  for (const pedacos of [null, ...modos]) {
    const buf = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      const [r, g, b, a] = canais(cor[i]);
      if (a < 128) continue;
      let c = [r, g, b];
      if (ehChama(cor[i], i % W)) c = [255, 0, 0];
      buf.set([...c, 255], i * 4);
    }
    if (pedacos) pedacos.forEach((p, k) => {
      for (let j = 0; j < p.bmp.w * p.bmp.h; j++) {
        if (!p.bmp.cor[j]) continue;
        const x = p.x0 + (j % p.bmp.w), y = p.y0 + Math.floor(j / p.bmp.w);
        const c = p.corte[j] === 2 ? [255, 255, 255] : p.n < 12 ? [70, 70, 70] : PAL[k % PAL.length];
        buf.set([...c, 255], (y * W + x) * 4);
      }
    });
    comp.push({ input: await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).resize(W * Z, H * Z, { kernel: 'nearest' }).png().toBuffer(), left: x0, top: y0 });
    x0 += W * Z + 8;
  }
  y0 += H * Z + 8;
}
await sharp({ create: { width: 3 * (W * Z + 8) + 8, height: y0, channels: 4, background: '#14171f' } }).composite(comp).png().toFile(OUT);
console.log(OUT);
