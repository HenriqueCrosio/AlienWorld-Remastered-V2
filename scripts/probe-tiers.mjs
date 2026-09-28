// PROTÓTIPO DAS CARTAS: a nave de cada linhagem em cada fase (o tier certo, em jogo). Fotografa um recorte
// em volta da nave e reporta a textura, a animação e o tamanho do corpo.
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

const casos = [
  ['humana', 1], ['humana', 2], ['humana', 3], ['humana', 4],
  ['alienigena', 3], ['alienigena', 4],
];
const relatorio = [];
for (const [ship, stage] of casos) {
  await page.evaluate(({ ship, stage }) => {
    const g = window.__game;
    // ⚠️ Só as OUTRAS cenas: parar a Game e dar `start` nela no mesmo quadro a deixa PARADA (o start vira restart
    // e o stop enfileirado roda depois). O `start` já reinicia a Game se ela estiver rodando.
    g.scene.getScenes(true).filter((s) => s.scene.key !== 'Game').forEach((s) => s.scene.stop());
    g.scene.start('Game', { stage, ship, handling: 'diegetico' });
  }, { ship, stage });
  await page.waitForTimeout(1800);
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const n = s.ship;
    return { tex: n.texture.key, anim: n.anims?.currentAnim?.key ?? null, ativo: n.active, x: n.x, y: n.y, corpo: n.body ? `${n.body.width.toFixed(0)}x${n.body.height.toFixed(0)}` : null, descentro: n.body ? `${(n.body.center.x - n.x).toFixed(1)},${(n.body.center.y - n.y).toFixed(1)}` : null, quadro: `${n.width}x${n.height}` };
  });
  await page.screenshot({
    path: `${OUT}/tier-${ship}-f${stage}.png`,
    clip: { x: Math.max(0, r.x * 3 - 90), y: Math.max(0, r.y * 3 - 60), width: 180, height: 120 },
  });
  relatorio.push({ ship, stage, ...r });
}
console.log(JSON.stringify({ relatorio, erros }, null, 2));
await browser.close();
