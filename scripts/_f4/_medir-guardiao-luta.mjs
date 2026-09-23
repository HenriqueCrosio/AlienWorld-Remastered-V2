// A LUTA DO GUARDIÃO EM NÚMEROS (19/09: *"a investida é impossível de desviar"* · *"os 3 tiros são muito fáceis"*).
// Mede o que decide as duas coisas: a altura do corpo na INVESTIDA contra o vão jogável, e a velocidade dos
// glóbulos contra a velocidade da nave.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_medir-guardiao-luta.mjs
import { chromium } from 'playwright';

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
  return true;
}, null, { timeout: 60000, polling: 100 });

const nave = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { w: s.ship.body.width, h: s.ship.body.height, y: Math.round(s.ship.y) };
});
console.log(`NAVE: corpo ${nave.w}x${nave.h}px`);

// Espera a INVESTIDA e mede o corpo do guardião no instante em que ele está passando.
const ok = await page.waitForFunction(() => {
  const b = window.__game.scene.getScenes(true)[0].boss;
  return b?.acao === 'investe' && b.sprite.x < 260;
}, null, { timeout: 60000, polling: 16 }).then(() => true, () => false);
if (!ok) { console.log('não peguei a investida'); await browser.close(); process.exit(1); }

const inv = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const b = s.boss;
  return {
    w: Math.round(b.body.width), h: Math.round(b.body.height),
    topo: Math.round(b.body.top), base: Math.round(b.body.bottom),
    vx: Math.round(b.body.velocity.x), vy: Math.round(b.body.velocity.y),
  };
});
const VAO_TOPO = 30, VAO_BASE = 190; // Predador.TETO_APOIO / CHAO_APOIO
const vao = VAO_BASE - VAO_TOPO;
const folga = vao - inv.h;
console.log(`INVESTIDA: corpo ${inv.w}x${inv.h}px na tela, de y=${inv.topo} a y=${inv.base}, v=(${inv.vx},${inv.vy})`);
console.log(`VÃO jogável (y ${VAO_TOPO}..${VAO_BASE}) = ${vao}px  →  FOLGA = ${folga}px para um corpo de ${inv.h}px`);
console.log(`   descontando a nave (${nave.h}px de corpo), sobram ${folga - nave.h}px de escapatória, divididos entre em cima e embaixo`);

// Os glóbulos do leque — esperar pelo TIRO, não por um relógio: ele só atira em `flutua`, e depois da
// investida ainda há a volta até a estação.
await page.waitForFunction(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.enemies.enemyBullets.getMatching('active', true).length >= 3;
}, null, { timeout: 40000, polling: 16 }).catch(() => {});
const bolas = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.enemies.enemyBullets.getMatching('active', true).map((b) => ({
    v: Math.round(Math.hypot(b.body.velocity.x, b.body.velocity.y)),
  }));
});
console.log(`LEQUE: ${bolas.length} glóbulo(s) no ar, velocidade ${[...new Set(bolas.map((b) => b.v))].join('/')} px/s`);
console.log(`   a NAVE anda a 110 px/s (FreeController.SPEED) — glóbulo mais lento que a nave é glóbulo que não ameaça`);
await browser.close();
