// Sonda da BOMBA (K) e do SCORE ACUMULADO.
//
// Por que ela existe: a bomba é a mecânica nova do rebalanceamento (GDD §5, nunca
// implementada) e o score em cadeia é a base do placar online. As duas são invisíveis
// para as sondas de fase — se quebrarem, nenhuma outra sonda grita.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘ FALHOU'} ${msg}`);
  if (!cond) falhas++;
};

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Treino do chefão da Fase 1 ([B]): a Torre cospe leques de cometas — é o jeito mais
// rápido de ter TIRO INIMIGO DE VERDADE na tela para a bomba apagar.
await page.keyboard.press('b');
await page.waitForTimeout(1500);

// Vidas para cima: testa-se a MECÂNICA, não a habilidade da sonda (a lição do probe-chain).
await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  scene.lives = 99;
});

// Espera o chefão entrar e cuspir o primeiro leque.
let comBalas = null;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(500);
  comBalas = await page.evaluate(() => {
    const scene = window.__game.scene.getScene('Game');
    const ativas = scene.enemies.enemyBullets.getChildren().filter((b) => b.active).length;
    return { boss: !!scene.boss, balas: ativas, bombas: scene.bombs };
  });
  if (comBalas.boss && comBalas.balas >= 3) break;
}

ok(comBalas.boss, 'o chefão entrou em cena');
ok(comBalas.balas >= 3, `há tiros inimigos na tela (${comBalas?.balas})`);
ok(comBalas.bombas === 3, 'o estoque abre com 3 bombas');

const hpAntes = await page.evaluate(
  () => window.__game.scene.getScene('Game').boss?.hp ?? window.__game.scene.getScene('Game').boss?.vida,
);

// K — detona. Segurar alguns frames: `press()` desce e sobe a tecla dentro do MESMO frame
// do navegador, e o JustDown do Phaser (lido no update seguinte) nunca a vê descida.
await page.keyboard.down('k');
await page.waitForTimeout(120);
await page.keyboard.up('k');
await page.waitForTimeout(250);

const depois = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  return {
    bombas: scene.bombs,
    balasAtivas: scene.enemies.enemyBullets.getChildren().filter((b) => b.active).length,
    iFrames: scene.invulnerableUntil > scene.time.now,
    hpBoss: scene.boss?.hp ?? scene.boss?.vida,
  };
});

ok(depois.bombas === 2, `a bomba foi gasta (3 → ${depois.bombas})`);
ok(depois.balasAtivas === 0, `a tela ficou SEM tiros inimigos (${depois.balasAtivas} ativos)`);
ok(depois.iFrames, 'a bomba deu i-frames');
if (typeof hpAntes === 'number' && typeof depois.hpBoss === 'number') {
  // ≥ 12, não exato: o tiro automático do flap também acerta o chefão entre as duas medições.
  ok(hpAntes - depois.hpBoss >= 12, `o chefão pagou ao menos os 12 da bomba (${hpAntes} → ${depois.hpBoss})`);
}

// K de novo imediatamente: o estoque é gasto de verdade (JustDown, não segurar).
await page.keyboard.down('k');
await page.waitForTimeout(120);
await page.keyboard.up('k');
await page.waitForTimeout(250);
const estoque = await page.evaluate(() => window.__game.scene.getScene('Game').bombs);
ok(estoque === 1, `a segunda bomba saiu do estoque (${estoque})`);

// O DANO repõe o estoque (3 por vida) e marca o no-hit como perdido. A vida é medida no
// MESMO evaluate: entre evaluates o chefão continua atirando e cobraria as dele também.
const dano = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  const vidasAntes = scene.lives;
  scene.invulnerableUntil = 0; // apaga os i-frames da bomba para o dano entrar
  scene.damageShip();
  return { bombas: scene.bombs, tomouDano: scene.tookDamage, vidasAntes, vidas: scene.lives };
});
ok(dano.bombas === 3, `tomar dano repõe o estoque (${dano.bombas})`);
ok(dano.tomouDano === true, 'o dano marca o fim do no-hit');
ok(dano.vidas === dano.vidasAntes - 1, `a vida foi cobrada (${dano.vidasAntes} → ${dano.vidas})`);

// SCORE ACUMULADO: o total corrido inclui o checkpoint das fases anteriores.
const score = await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Game');
  scene.scoreBase = 5000;
  return { total: scene.totalScore(), base: scene.scoreBase };
});
ok(score.total >= 5000, `o total corrido soma o checkpoint (${score.total} ≥ ${score.base})`);

await page.screenshot({ path: 'probe-bomba.png' });
console.log('\nscreenshot: probe-bomba.png');
console.log(falhas === 0 ? '\n✔ BOMBA + SCORE ACUMULADO' : `\n✘ ${falhas} FALHAS`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
