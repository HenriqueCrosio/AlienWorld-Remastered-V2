// A VEIA ACESA DO DUTO, ATRAVESSANDO. Três fotos seguidas dentro da câmara C, para julgar a única
// coisa que nenhum assert vê: se a linha de luz da borda LÊ como uma veia contínua ou como uma
// linha quebrada. É o pedido dele de 20/09 — *"o certo seria emendar na linha das luzes"*.
//
//   node scripts/_f4/_ver-duto-luz.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  if (s.golfinho) s.encerrarGolfinho(false);
  s.elapsed = 74; s.director.skipTo(74); s.aplicaCorredorEMoldura(74);
});
await page.waitForTimeout(5000);

const tiras = [];
for (let i = 0; i < 3; i++) {
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    const segs = s.children.list.filter((o) => o.name === 'faixaChao');
    return { t: Math.round(s.elapsed * 10) / 10, ys: segs.map((o) => Math.round(o.y)) };
  });
  console.log(`t=${info.t}  superfícies na tela: ${JSON.stringify(info.ys)}`);
  tiras.push(await page.screenshot());
  await page.waitForTimeout(3000);
}
await browser.close();

const PAD = 8;
await sharp({ create: { width: 768 + PAD * 2, height: tiras.length * (432 + PAD) + PAD,
  channels: 4, background: { r: 24, g: 24, b: 28, alpha: 1 } } })
  .composite(tiras.map((b, i) => ({ input: b, left: PAD, top: PAD + i * (432 + PAD) })))
  .png().toFile('scripts/_f4/_folha-duto-luz.png');
console.log('\nscripts/_f4/_folha-duto-luz.png');
