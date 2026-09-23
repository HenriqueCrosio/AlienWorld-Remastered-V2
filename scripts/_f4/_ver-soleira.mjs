// A SOLEIRA DO NÚCLEO — o que existe hoje entre a 3ª porta e o chefão, e que a GARGANTA
// (o esfíncter) vai cobrir ou substituir. Seis fotos com a espessura da parede medida em cada
// uma, porque é ela que decide se a criatura de 167px cabe.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-soleira.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'scripts/_f4/_folha-soleira.png';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(700);

const salta = (t) =>
  page.evaluate((t) => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 999;
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    s.elapsed = t;
    s.director.skipTo(t);
    s.aplicaCorredorEMoldura(t);
  }, t);
const ate = (t) =>
  page.waitForFunction((a) => window.__game.scene.getScenes(true)[0].elapsed >= a, t, {
    timeout: 120000,
    polling: 16,
  });

// A ESPESSURA REAL da parede naquele instante, lida do motor — não estimada da rampa.
const espessura = () =>
  page.evaluate(() => {
    const m = window.__game.scene.getScenes(true)[0].moldura;
    return { e: Math.round(m.espessura ?? -1), alvo: Math.round(m.alvo ?? -1) };
  });

const tiras = [];
const foto = async (t) => {
  const { e, alvo } = await espessura();
  const corredor = 216 - 2 * e;
  const sobra = corredor - 167;
  console.log(
    `t=${t}  espessura=${e} (alvo ${alvo})  corredor=${corredor}px  ` +
      `garganta 167px → ${sobra >= 0 ? `folga ${sobra}px` : `${-sobra}px enterrados`}`,
  );
  tiras.push(await page.screenshot());
};

await salta(94);
for (const t of [104, 106.5, 107.5, 108.5, 110, 111.5]) {
  await ate(t);
  await foto(t);
}
await browser.close();

const PAD = 6, COLS = 2;
const linhas = Math.ceil(tiras.length / COLS);
await sharp({
  create: { width: COLS * (768 + PAD) + PAD, height: linhas * (432 + PAD) + PAD, channels: 4,
    background: { r: 24, g: 24, b: 28, alpha: 1 } },
})
  .composite(tiras.map((buf, i) => ({ input: buf, left: PAD + (i % COLS) * (768 + PAD),
    top: PAD + Math.floor(i / COLS) * (432 + PAD) })))
  .png()
  .toFile(saida);
console.log(saida);
