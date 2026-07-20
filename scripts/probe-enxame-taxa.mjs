// Sonda da CURVA do Enxame — taxa de acerto REAL (tiros que conectam / tiros disparados),
// em duas janelas: batedores (pequenos, em senoide) e cargueiro (grande e lento).
//
// A promessa de design (docs/HANDOFF.md): alvo GRANDE e LENTO → impossível de errar;
// alvo PEQUENO e RÁPIDO → quase sempre erra. A trava é o `turn` (graus/s). Se a taxa
// contra batedor sair alta, a curva está rápida demais e a arma virou "modo fácil".
//
// Uso:  node scripts/probe-enxame-taxa.mjs [turn]   (turn em graus/s; default = o do jogo)
import { chromium } from 'playwright';

const turnArg = process.argv[2] ? Number(process.argv[2]) : null;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await page.keyboard.press('v'); // Fase 2
await page.waitForTimeout(800);

// Instrumentação: conta DISPAROS (shoot) e ACERTOS (bulletHitEnemy), por janela.
await page.evaluate(async (turn) => {
  const scene = window.__game.scene.getScene('Game');
  scene.lives = 999;

  if (turn !== null) {
    // O def é um objeto compartilhado do módulo — mutável mesmo com binding read-only.
    // Em dev, o Vite serve o módulo TS direto: dá para importá-lo da página.
    const mod = await import('/src/systems/WeaponSystem.ts');
    mod.WEAPONS.enxame.homing.turn = turn;
  }

  window.__tiros = 0;
  window.__hits = 0;
  const ws = scene.weapons;
  const oShoot = ws.shoot.bind(ws);
  ws.shoot = (...a) => {
    window.__tiros++;
    return oShoot(...a);
  };
  const oHit = scene.bulletHitEnemy.bind(scene);
  scene.bulletHitEnemy = (b, e) => {
    if (b.active) window.__hits++;
    return oHit(b, e);
  };
}, turnArg);

// Enxame equipado (atalho de dev `4`), gatilho segurado o trecho inteiro.
await page.keyboard.press('4');
await page.keyboard.down('j');

// ─── Janela A: batedores (t≈8s → t≈34s) ───
await page.waitForTimeout(26000);
const A = await page.evaluate(() => ({ tiros: window.__tiros, hits: window.__hits }));

// ─── Janela B: o cargueiro (t=47) ───
await page.evaluate(() => {
  window.__tirosB = 0;
  window.__hitsB = 0;
  const scene = window.__game.scene.getScene('Game');
  const ws = scene.weapons;
  const oShoot = ws.shoot.bind(ws);
  ws.shoot = (...a) => {
    window.__tirosB++;
    return oShoot(...a);
  };
  const oHit = scene.bulletHitEnemy.bind(scene);
  scene.bulletHitEnemy = (b, e) => {
    if (b.active) window.__hitsB++;
    return oHit(b, e);
  };
});

let espera = 0;
let cargueiroVisto = false;
let cargueiroMorto = false;
while (espera < 75000) {
  await page.waitForTimeout(500);
  espera += 500;
  const st = await page.evaluate(() => {
    const vivos = window.__game.scene
      .getScene('Game')
      .enemies.enemies.getChildren()
      .filter((e) => e.active && e.getData('kind') === 'cargueiro').length;
    return { vivos, cena: window.__game.scene.getScenes(true)[0].scene.key };
  });
  if (st.cena !== 'Game') break; // a sonda morreu para a fase — aborta a janela B
  if (st.vivos > 0) cargueiroVisto = true;
  if (cargueiroVisto && st.vivos === 0) {
    cargueiroMorto = true;
    break;
  }
}

const B = await page.evaluate(() => ({
  tiros: window.__tirosB ?? 0,
  hits: window.__hitsB ?? 0,
}));

const pct = (h, t) => (t > 0 ? ((h / t) * 100).toFixed(0) + '%' : '—');
console.log(
  `\nturn=${turnArg ?? 'o do jogo (ver WeaponSystem.enxame)'}\n` +
    `batedores:  ${A.hits}/${A.tiros} acertos = ${pct(A.hits, A.tiros)}\n` +
    `cargueiro:  ${B.hits}/${B.tiros} acertos = ${pct(B.hits, B.tiros)}` +
    (cargueiroMorto ? '' : cargueiroVisto ? '  (não morreu na janela)' : '  (não apareceu)'),
);

await browser.close();
