// Abre o jogo num Chromium headless, entra no treino de chefão, e reporta
// o console + o estado real do boss. É a única forma de ver o que o navegador vê.
import { chromium } from 'playwright';

// WebGL não funciona no Chromium headless puro: força renderização por software.
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();

page.on('console', (m) => console.log(`[console:${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// No menu, 1 = diegético e INICIA a partida (não é ESPAÇO).
await page.keyboard.press('1');
await page.waitForTimeout(400);
// Já dentro da cena Game, 3 = shotgun. (Ao morrer, a arma volta para a PULSE.)
await page.keyboard.press('3');
console.log('\n>> fase 1 normal, flapando...\n');

// Sem flapar, a nave cai, bate no chão e morre. A 250ms ela ainda afunda; a 120ms se sustenta.
for (let i = 0; i < 70; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(120);
}

const estado = await page.evaluate(() => {
  const game = window.__game;
  if (!game) return { erro: 'jogo não encontrado' };

  const scene = game.scene.getScenes(true)[0];
  const boss = scene?.boss;

  const ship = scene?.ship;

  const props = (scene?.terrain?.props?.getChildren() ?? []).slice(0, 5).map((p) => ({
    tex: p.texture.key,
    y: p.y.toFixed(1),
    origem: `${p.originX},${p.originY}`,
    alturaExibida: p.displayHeight.toFixed(1),
    baseVisual: (p.y - p.displayHeight * (1 - p.originY)).toFixed(1),
    corpoTopo: p.body?.y?.toFixed(1),
    corpoBase: p.body ? (p.body.y + p.body.height).toFixed(1) : null,
  }));

  return {
    GROUND_Y: 206,
    props,
    cenaAtiva: scene?.scene?.key,
    elapsed: scene?.elapsed?.toFixed(1),
    naveX: ship?.x?.toFixed(1),
    naveY: ship?.y?.toFixed(1),
    naveVisible: ship?.visible,
    naveVidas: scene?.lives,
    naveTextura: ship?.texture?.key,
    naveTamanho: ship ? `${ship.width}x${ship.height}` : null,
    bossExiste: !!boss,
    bossX: boss?.sprite?.x?.toFixed(1),
    bossY: boss?.sprite?.y?.toFixed(1),
    bossVisible: boss?.sprite?.visible,
    bossAlpha: boss?.sprite?.alpha,
    bossVelX: boss?.sprite?.body?.velocity?.x?.toFixed(1),
    bossEntering: boss?.entering,
    texturaBoss: game.textures.exists('boss'),
  };
});

console.log('ESTADO REAL:', JSON.stringify(estado, null, 2));

await page.screenshot({ path: 'probe-boss.png' });
console.log('\nscreenshot: probe-boss.png');

await browser.close();
