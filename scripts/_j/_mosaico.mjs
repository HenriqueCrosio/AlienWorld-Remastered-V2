import sharp from 'sharp';
const dir = process.argv[2], out = process.argv[3];
const nomes = ['paintBgF1','paintBgCaverna','paintBgZeroG','paintBgF2','paintBgF3','paintBgF3Casco','paintBgF3Arena','paintBgF4a','paintBgF4b','paintBgF4c','paintBgF4d'];
const W = 384, H = 216, C = 4, L = Math.ceil(nomes.length / C);
await sharp({ create: { width: W * C, height: H * L, channels: 3, background: '#000' } })
  .composite(nomes.map((n, i) => ({ input: `${dir}/${n}.png`, left: (i % C) * W, top: Math.floor(i / C) * H })))
  .png().toFile(out);
