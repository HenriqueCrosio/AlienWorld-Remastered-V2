// A MARÉ DA CÂMARA DO GOLFINHO, JOGANDO — as mesas de aço recolhem, as do mar emergem, o golfinho
// morre, as do mar explodem e afundam, e o aço volta emergindo. Monta a folha de contato.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-mare.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'scripts/_f4/_folha-mare.png';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(700);

await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 999;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.elapsed = 33;
  s.director.skipTo(33);
  s.aplicaCorredorEMoldura(33);
});

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const props = s.terrain.props.getChildren().filter((p) => p.active && p.x < 400);
    const cont = {};
    for (const p of props) {
      const k = `${p.getData('kind')}${p.getData('inerte') ? '·inerte' : ''}`;
      cont[k] = (cont[k] ?? 0) + 1;
    }
    return { t: s.elapsed.toFixed(2), mare: s.mare, agua: s.agua.estadoAtual.estado, golfinho: !!s.golfinho, props: cont };
  });

const tiras = [];
const foto = async (rotulo) => {
  const e = await estado();
  console.log(`${rotulo.padEnd(18)} ${JSON.stringify(e)}`);
  tiras.push(await page.screenshot());
};
const ate = (t) =>
  page.waitForFunction((a) => window.__game.scene.getScenes(true)[0].elapsed >= a, t, {
    timeout: 120000,
    polling: 16,
  });

await ate(35.6); await foto('antes da maré');
await ate(36.3); await foto('o tranco');
await ate(37.0); await foto('desmoronando');
await ate(38.9); await foto('câmara cheia');
await ate(40.6); await foto('a junta A|B');
await ate(42.2); await foto('a junta passando');
await ate(46); await foto('duelo');

// Mata o golfinho por código, esperando ele ficar vulnerável.
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].golfinho?.vulneravel, null, {
  timeout: 60000,
  polling: 50,
});
await page.waitForTimeout(3000); await foto('duelo, vulnerável');
await page.evaluate(() => window.__game.scene.getScenes(true)[0].matarGolfinho());
await page.waitForTimeout(180); await foto('explode');
await page.waitForTimeout(700); await foto('afundando');
await page.waitForTimeout(1600); await foto('aço voltando');
await page.waitForTimeout(2600); await foto('aço de volta');
await browser.close();

const PAD = 6, COLS = 3;
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
