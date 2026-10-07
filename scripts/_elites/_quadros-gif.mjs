import sharp from 'sharp';
const [gif, out] = process.argv.slice(2);
const pages = [6, 14, 22, 38];
const bufs = await Promise.all(pages.map((p) => sharp(gif, { page: p }).resize({ width: 600 }).png().toBuffer()));
const m = await sharp(bufs[0]).metadata();
await sharp({ create: { width: 1200, height: m.height * 2, channels: 4, background: '#000' } })
  .composite(bufs.map((b, i) => ({ input: b, left: (i % 2) * 600, top: Math.floor(i / 2) * m.height }))).png().toFile(out);
