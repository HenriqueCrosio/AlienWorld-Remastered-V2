// A CANHONEIRA do cinturão em jogo, na Fase 2 — tamanho real, ao lado do resto do róster.
//
// O que se julga aqui não é a silhueta ampliada (o contact sheet já mostrou isso), é o que o
// contact sheet NÃO mostra: se ela lê como PESADA ao lado do batedor, se os 88px de comprimento
// tomam lane demais, e se ela aponta para o lado do movimento (a lição da orientação invertida).
//
// A onda de canhoneira da Fase 2 sai lá pelos t=56s, então a sonda pula o relógio em vez de
// esperar: `GameScene.elapsed` é o cronômetro, e o `director.skipTo` descarta os eventos
// anteriores sem executá-los (mexer só no elapsed faria o diretor despejar a fase inteira de uma vez).
//
// uso: node scripts/_probe-canhoneira-cinturao.mjs   (com `npm run dev` no ar)
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__game.scene
    .getScene('Menu')
    // SEM `practice: true`: o modo treino manda a GameScene pular o diretor direto para o
    // chefão (`skipTo(bossTime - 1)`), e `skipTo` só anda PARA A FRENTE — depois disso não há
    // como voltar às ondas comuns, e a canhoneira nunca sai. A sonda empurra o relógio na mão.
    .scene.start('Game', { stage: 2, handling: 'free' });
});
await page.waitForTimeout(800);

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__s = s;
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) {
      s.ship.x = 60;
      s.ship.y = 100;
      s.ship.body?.setVelocity?.(0, 0);
    }
  }, 40);
});

const estado = () =>
  page.evaluate(() => {
    const vivos = window.__s.enemies.enemies.getChildren().filter((e) => e.active);
    return {
      t: +(window.__s.elapsed ?? 0).toFixed(1),
      inimigos: vivos.map((e) => ({
        kind: e.getData('kind'),
        tex: e.texture.key,
        x: Math.round(e.x),
        y: Math.round(e.y),
        w: Math.round(e.displayWidth),
        h: Math.round(e.displayHeight),
        vx: Math.round(e.body.velocity.x),
        flip: e.flipX,
      })),
    };
  });

for (let i = 0; i < 120; i++) {
  await page.waitForTimeout(200);
  const e = await estado();
  const c = e.inimigos.find((x) => x.kind === 'canhoneira');
  if (c && c.x < 320) {
    console.log(`t=${e.t}s  CANHONEIRA ${c.tex} ${c.w}x${c.h} em (${c.x},${c.y}) vx=${c.vx} flip=${c.flip}`);
    console.log(`  resto na tela: ${e.inimigos.filter((x) => x.kind !== 'canhoneira').map((x) => `${x.kind} ${x.w}x${x.h}`).join(', ') || '(nenhum)'}`);
    await page.screenshot({ path: 'probe-canhoneira-cinturao.png' });

    // E o TIRO: ela atira a cada 1.6s (DEFS.fireRate). O que se confere aqui é que a bola da
    // pele saiu mesmo — o `bolt2` de sempre no lugar dela significa que a guarda de textura
    // caiu, não que o desenho está errado.
    for (let k = 0; k < 60; k++) {
      await page.waitForTimeout(200);
      const tiros = await page.evaluate(() =>
        window.__s.enemies.enemyBullets
          .getChildren()
          .filter((b) => b.active)
          .map((b) => `${b.texture.key} ${Math.round(b.displayWidth)}x${Math.round(b.displayHeight)}`),
      );
      if (tiros.length) {
        console.log(`  tiros no ar: ${[...new Set(tiros)].join(', ')}`);
        await page.screenshot({ path: 'probe-canhoneira-tiro.png' });
        break;
      }
    }
    break;
  }
  // Empurra o relógio da fase para não esperar o minuto inteiro até a onda dela.
  if (e.t < 54) await page.evaluate(() => { window.__s.elapsed = 54; window.__s.director.skipTo(54); });
}

await browser.close();
