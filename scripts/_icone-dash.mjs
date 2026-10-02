// The DASH card icon from the approved ship sprite: the ship + 3 ghost copies trailing left (the same effect as in
// game). Usage: node scripts/_icone-dash.mjs <nave.png> <out.png>
import sharp from 'sharp';
const [NAVE, OUT] = process.argv.slice(2);
const n = await sharp(NAVE).ensureAlpha().trim({ threshold: 1 }).raw().toBuffer({ resolveWithObject: true });
const fantasma = (a) => { const b = Buffer.from(n.data); for (let i = 3; i < b.length; i += 4) b[i] = Math.round(b[i] * a); return b; };
const PASSO = 6, W = n.info.width + 3 * PASSO, H = n.info.height;
const camadas = [0.18, 0.32, 0.5].map((a, i) => ({ input: fantasma(a), raw: n.info, left: i * PASSO, top: 0 }));
camadas.push({ input: n.data, raw: n.info, left: 3 * PASSO, top: 0 });
await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(camadas).png().toFile(OUT);
console.log(OUT, `${W}x${H}`);
