// QUANTO O METAL SOBE (19/09: *"quero que seja mais alto… pode subir o dobro ou menos um pouco"*).
// Mede o ÁPICE real das lascas do rasgo, em px acima do chão — o arco é resolvido para cair onde a nave
// estava, então a altura sai do TEMPO DE VOO (`METAL_VOO`), não de um número de altura.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_medir-metal.mjs
import { chromium } from 'playwright';

const CHAO = 186; // Predador.CHAO_APOIO − 4, de onde as lascas saem
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
  // A nave na altura média: é ela que o arco mira, então fixá-la torna a medida comparável.
  s.ship.setPosition(90, 110);
  s.ship.body.reset(90, 110);
  return true;
}, null, { timeout: 60000, polling: 100 });

await page.evaluate(() => window.__game.scene.getScenes(true)[0].boss.damage(999));
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'chao', null, { timeout: 60000, polling: 50 });
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.boss.damage(Math.ceil(s.boss.predador.hp - 180 * 0.6));
  // A nave presa: o arco tem de mirar sempre o mesmo ponto para a medida valer.
  s.__fixa = setInterval(() => { s.ship.setPosition(90, 110); s.ship.body.reset(90, 110); }, 16);
});

const ok = await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'rasgo', null, { timeout: 90000, polling: 16 }).then(() => true, () => false);
if (!ok) { console.log('✖ não peguei o rasgo'); await browser.close(); process.exit(1); }

// Segue as lascas por 2,5s e guarda o y mais alto de cada uma.
const apice = await page.evaluate(async () => {
  const s = window.__game.scene.getScenes(true)[0];
  const topo = new Map();
  const t0 = performance.now();
  while (performance.now() - t0 < 2500) {
    for (const b of s.enemies.enemyBullets.getMatching('active', true)) {
      if (b.texture.key !== 'metalBrasa') continue;
      const id = b.name || (b.name = 'm' + Math.random().toString(36).slice(2, 8));
      topo.set(id, Math.min(topo.get(id) ?? 999, b.y));
    }
    await new Promise((r) => setTimeout(r, 16));
  }
  return [...topo.values()].sort((a, b) => a - b);
});
await browser.close();

if (!apice.length) { console.log('✖ nenhuma lasca medida'); process.exit(1); }
const voo = process.env.VOO ?? '(o do código)';
console.log(`METAL_VOO = ${voo}`);
console.log(`lascas medidas: ${apice.length}`);
console.log(`ápices (y): ${apice.map((y) => Math.round(y)).join(', ')}`);
console.log(`a mais alta sobe ${Math.round(CHAO - apice[0])}px acima do chão (y=${Math.round(apice[0])}); a nave estava em y=110, o teto em y=30`);
