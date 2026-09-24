// A CUTSCENE FINAL EM RELÓGIO DE PAREDE — o que a pessoa vê em cada instante real. Beat de ruptura
// só se julga em movimento; isto é o mínimo até existir a sonda de vídeo.
//
//   npm run dev  noutro terminal, depois
//   node scripts/_f8/_ver-final.mjs 9500,9800,10200,10700,11300,12000,12700,13300 scripts/_f8/_folha-descompressao.png
import { chromium } from 'playwright';
import sharp from 'sharp';

const INSTANTES = (process.argv[2] ?? '5000,6000,7000,8000,9500,10500,11500,13000').split(',').map(Number);
const saida = process.argv[3] ?? 'scripts/_f8/_folha.png';
const L = 768, A = 432, COLS = 4;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: L, height: A } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F');
const t0 = Date.now();
const fotos = [];
for (const ms of INSTANTES) {
  const falta = ms - (Date.now() - t0);
  if (falta > 0) await page.waitForTimeout(falta);
  fotos.push({ ms, buf: await page.screenshot() });
}
await browser.close();
const lin = Math.ceil(fotos.length / COLS);
const tiras = await Promise.all(fotos.map(async ({ ms, buf }) =>
  sharp(buf).resize(384, 216).composite([{ input: Buffer.from(`<svg width="384" height="20"><rect width="70" height="18" fill="#000"/><text x="4" y="14" font-family="monospace" font-size="13" fill="#fc6">${ms}ms</text></svg>`), left: 0, top: 0 }]).png().toBuffer()));
await sharp({ create: { width: 384 * COLS, height: 216 * lin, channels: 4, background: '#111' } })
  .composite(tiras.map((input, i) => ({ input, left: (i % COLS) * 384, top: Math.floor(i / COLS) * 216 })))
  .png().toFile(saida);
console.log('folha:', saida);
