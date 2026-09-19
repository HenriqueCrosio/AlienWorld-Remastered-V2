// A SERRA DO GUARDIÃO EM JOGO (19/09) — a conjuração com o fio de aviso, o voo na diagonal, as duas
// cravadas e a saída. Rotulado pelo ESTADO lido do jogo, nunca por ms (screenshot custa 100–300ms).
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-serra.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'docs/superpowers/folhas/2026-09-19/serra-em-jogo.png';
const Z = 2;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
await page.keyboard.press('G');
await page.waitForFunction(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s.boss || s.boss.entering) return false;
  s.lives = 999;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.ship.setPosition(70, 110);
  s.ship.body.reset(70, 110);
  return true;
}, null, { timeout: 60000, polling: 100 });

const tiras = [];
const foto = async () => {
  const info = await page.evaluate(() => {
    const b = window.__game.scene.getScenes(true)[0].boss;
    const s = b.serra;
    return {
      acao: b.acao,
      degrau: b.degrau,
      cabo: b.segurandoCabo,
      serra: s ? { e: s.estado, x: Math.round(s.sprite.x), y: Math.round(s.sprite.y) } : null,
    };
  });
  const rot = `${info.acao}${info.serra ? ` · serra=${info.serra.e} (${info.serra.x},${info.serra.y})` : ''}${info.cabo ? ' · CABO (dano x2)' : ''} · degrau ${info.degrau}`;
  console.log(rot);
  const png = await page.screenshot();
  tiras.push(await sharp(png)
    .composite([{ input: Buffer.from(`<svg width="${384 * Z}" height="${216 * Z}"><text x="8" y="${216 * Z - 10}" fill="#ffd166" font-size="17" font-family="monospace" stroke="#000" stroke-width="4" paint-order="stroke">${rot}</text></svg>`) }])
    .png().toBuffer());
};

// Espera a CONJURAÇÃO e fotografa a skill inteira.
const ok = await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].boss?.acao === 'serra', null, { timeout: 60000, polling: 16 }).then(() => true, () => false);
if (!ok) { console.log('não peguei a serra'); await browser.close(); process.exit(1); }
for (let i = 0; i < 14; i++) {
  await foto();
  await page.waitForTimeout(210);
}
await browser.close();

const COLS = 2, PAD = 6, W = 384 * Z, H = 216 * Z;
const linhas = Math.ceil(tiras.length / COLS);
await sharp({ create: { width: PAD + COLS * (W + PAD), height: PAD + linhas * (H + PAD), channels: 4, background: '#231c24' } })
  .composite(tiras.map((t, i) => ({ input: t, left: PAD + (i % COLS) * (W + PAD), top: PAD + Math.floor(i / COLS) * (H + PAD) })))
  .png().toFile(saida);
console.log(saida, `${tiras.length} fotos`);
