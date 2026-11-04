// prints the alpha bounding box (w×h) and lit-pixel counts of PNGs — for comparing head sizes
import sharp from 'sharp';
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, branco = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4; if (data[i + 3] < 128) continue;
    n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 200) branco++;
  }
  console.log(f.split('/').pop().padEnd(34), `${info.width}x${info.height}`, `bbox ${x1 - x0 + 1}x${y1 - y0 + 1}`, `px ${n}`, `branco ${branco}`);
}
