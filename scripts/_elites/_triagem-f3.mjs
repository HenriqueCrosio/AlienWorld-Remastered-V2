// Contact sheet: one row per piece, 16 candidates each, zoom 3, index labels.
import sharp from 'sharp';
const D = 'docs/superpowers/folhas/2026-10-07/elites/cand';
const PECAS = ['cacadorLula', 'cacadorVespa', 'cacadorArraia', 'cacadorLouva'];
const Z = 3, C = 48 * Z + 8, LH = 18;
const comp = [];
PECAS.forEach((p, r) => {
  for (let i = 0; i < 16; i++) {
    const x = i % 8, y = r * 2 + Math.floor(i / 8);
    comp.push({
      input: Buffer.from(`<svg width="${C}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><text x="2" y="14" font-family="Consolas" font-size="13" fill="#ffb040">${p.replace('cacador', '')} ${i}</text></svg>`),
      left: x * C, top: y * (C + LH),
    });
    comp.push({ file: `${D}/${p}-21-${i}.png`, left: x * C + 4, top: y * (C + LH) + LH });
  }
});
const inputs = await Promise.all(comp.map(async (c) => c.file
  ? { input: await sharp(c.file).flop().resize(48 * Z, 48 * Z, { kernel: 'nearest' }).png().toBuffer(), left: c.left, top: c.top }
  : c));
await sharp({ create: { width: 8 * C, height: 8 * (C + LH), channels: 4, background: '#2a3040' } })
  .composite(inputs).png().toFile(process.argv[2]);
