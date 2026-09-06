// Confere o REVEZAMENTO das 4 bocas do lanca-misseis e o mistil novo em voo.
// Planta um lanca-misseis na tela e faz ele atirar varias vezes, anotando de onde saiu cada tiro.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
await page.waitForTimeout(4000);

const saidas = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  s.lives = 9;
  const t = s.terrain;
  // planta UM lanca-misseis e o segura no lugar
  t.spawn('lancaMisseis');
  const p = t.props.getChildren().filter((o) => o.active).pop();
  p.x = 300;
  const alvo = s.ship;
  const res = [];
  for (let i = 0; i < 6; i++) {
    const antes = t.enemyBullets.getChildren().filter((b) => b.active).length;
    t.fireAt(p, alvo);
    const balas = t.enemyBullets.getChildren().filter((b) => b.active);
    const nova = balas[balas.length - 1];
    res.push({
      tiro: i,
      boca: p.getData('boca'),
      dx: Number((nova.getData('ox') - p.x).toFixed(1)),
      dy: Number((nova.getData('oy') - (p.y - p.displayHeight)).toFixed(1)),
      textura: nova.texture.key,
      antes,
    });
    nova.setActive(false).setVisible(false);
  }
  return { sprite: { w: p.width, h: p.height, flip: p.flipX }, res };
});

console.log('lanca-misseis ' + JSON.stringify(saidas.sprite));
console.log('\ntiro | boca | offset do centro (dx) | offset do topo (dy) | textura');
for (const r of saidas.res) {
  console.log(`  ${r.tiro}  |  ${r.boca}   |  dx=${String(r.dx).padStart(6)}          |  dy=${String(r.dy).padStart(5)}       | ${r.textura}`);
}
const dxs = saidas.res.map((r) => r.dx);
const unicos = [...new Set(dxs.slice(0, 4))];
console.log(`\n4 bocas distintas nos 4 primeiros tiros? ${unicos.length === 4 ? 'SIM' : 'NAO (' + unicos.length + ')'}`);
console.log(`o 5o tiro repete o 1o (ciclo fechado)? ${dxs[4] === dxs[0] ? 'SIM' : 'NAO'}`);
await browser.close();
