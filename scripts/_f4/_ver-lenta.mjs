// A CÂMERA LENTA DO ESTOURO, EM RELÓGIO DE PAREDE — o que o jogador vê em cada instante real.
//
// ⚠️ OS INSTANTES SÃO DE RELÓGIO CRU, não de jogo: a pergunta dele é "dá para VER os pedaços?", e
// quem vê é a pessoa, no tempo dela. Cada tira sai com a escala do mundo e a contagem do gore.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-lenta.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'scripts/_f4/_folha-lenta.png';
const INSTANTES = [60, 180, 350, 550, 800, 1050, 1300, 1550, 1800, 2100];
const L = 768,
  A = 432,
  COLS = 5;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: L, height: A } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
const blindar = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 999;
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  });
await blindar();
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.elapsed = 107;
  s.director.skipTo(107);
  s.aplicaCorredorEMoldura(107);
});
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].elapsed >= 110.2, null, {
  timeout: 120000,
  polling: 16,
});
await blindar();
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].esfincter?.denso === true, null, {
  timeout: 20000,
  polling: 40,
});
await page.evaluate(() => {
  window.__t0 = performance.now();
  window.__game.scene.getScenes(true)[0].matarGarganta();
});

const tiras = [];
const rotulos = [];
for (const ms of INSTANTES) {
  await page.waitForFunction((alvo) => performance.now() - window.__t0 >= alvo, ms, { polling: 4 });
  tiras.push(await page.screenshot());
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const gore = s.children.list.filter((o) => o.name === 'f4Gore').length;
    return { real: Math.round(performance.now() - window.__t0), escala: s.tweens.timeScale.toFixed(2), gore };
  });
  rotulos.push(`${info.real}ms  x${info.escala}  gore ${info.gore}`);
}
console.log(rotulos.join('\n'));
await browser.close();

const PAD = 6,
  CAB = 26;
const linhas = Math.ceil(tiras.length / COLS);
const pecas = [];
tiras.forEach((t, i) => {
  const c = i % COLS,
    l = Math.floor(i / COLS);
  const x = PAD + c * (L + PAD),
    y = PAD + l * (CAB + A + PAD);
  pecas.push({
    input: Buffer.from(
      `<svg width="${L}" height="${CAB}"><text x="6" y="19" font-family="monospace" font-size="17" fill="#e8d6e4">${rotulos[i]}</text></svg>`,
    ),
    left: x,
    top: y,
  });
  pecas.push({ input: t, left: x, top: y + CAB });
});
await sharp({
  create: {
    width: PAD + COLS * (L + PAD),
    height: PAD + linhas * (CAB + A + PAD),
    channels: 4,
    background: { r: 18, g: 14, b: 22, alpha: 1 },
  },
})
  .composite(pecas)
  .png()
  .toFile(saida);
console.log(saida);
