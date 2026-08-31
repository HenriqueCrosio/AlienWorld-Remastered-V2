// O MÍSSIL DA CIDADELA (Fase 1, fase AÉREA do chefão) — ele é a arte DELE, e a caixa não mudou.
//
// Cobra as três coisas que o conserto de 2026-08-31 prometeu:
//   1. a textura é `missilColonia`, e NÃO o `missile` do lança-mísseis do casco da Fase 3;
//   2. a hitbox continua ~16x7 em px de MUNDO, apesar de a escala da arte ter caído 0,9 -> 0,6
//      (era o risco: um divisor cravado mudaria o peso de uma fase fechada);
//   3. a flag `missile` continua ligada, senao o rastro de exaustao some.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PAGINA] ${e.message}`));

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' });
});
await page.waitForTimeout(800);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__s = s;
  setInterval(() => { s.invulnerableUntil = 1e12; s.lives = 99; }, 40);
});
// 'g' pula direto para o chefao.
await page.keyboard.press('g');
await page.waitForTimeout(1500);

// Bate ate ele DECOLAR (a fase aerea e a unica que tem missil).
let aereo = false;
for (let i = 0; i < 400 && !aereo; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(80);
  aereo = await page.evaluate(() => {
    const s = window.__s;
    if (s?.boss && !s.boss.isDead && s.boss.hp > 60) s.boss.damage(6);
    return !!s?.boss?.airborne;
  });
}
ok(aereo, 'o chefao DECOLOU (a fase aerea e a que tem missil)');
if (!aereo) { await browser.close(); process.exit(1); }

// Espera um missil nascer.
let m = null;
for (let i = 0; i < 200 && !m; i++) {
  await page.waitForTimeout(100);
  m = await page.evaluate(() => {
    const s = window.__s;
    for (const o of s.enemies.enemyBullets.getChildren()) {
      if (!o.active) continue;
      if (o.getData('missile') !== true) continue;
      const b = o.body;
      return {
        tex: o.texture.key,
        escala: +o.scaleX.toFixed(2),
        // A caixa em px de MUNDO: o corpo do Arcade ja vem escalado.
        // ⚠️ `body.width` JA VEM EM PX DE MUNDO — o Arcade aplica a escala do sprite nele. A
        // primeira versao desta sonda multiplicava pela escala de novo e reprovava um codigo
        // certo (17,6 contra os 16 esperados). Assert que erra a unidade acusa inocente.
        caixa: [+b.width.toFixed(2), +b.height.toFixed(2)],
        frame: [o.frame.realWidth, o.frame.realHeight],
        desenho: [Math.round(o.displayWidth), Math.round(o.displayHeight)],
        flagMissile: o.getData('missile'),
      };
    }
    return null;
  });
}
ok(!!m, 'o chefao disparou um missil');
if (m) {
  console.log('missil  ', JSON.stringify(m));
  ok(m.tex === 'missilColonia', `a arte e a DA CIDADELA (${m.tex}), nao o 'missile' do casco`);
  ok(m.tex !== 'missile', "e nao e o foguete do lanca-misseis da Fase 3");
  ok(Math.abs(m.caixa[0] - 16) < 0.5, `a caixa continua 16px de LARGURA em mundo (${m.caixa[0]})`);
  ok(Math.abs(m.caixa[1] - 7) < 0.5, `a caixa continua 7px de ALTURA em mundo (${m.caixa[1]})`);
  ok(m.escala === 0.6, `a arte desenha a 0,6 (${m.escala}) — o corpo dela casa com a caixa`);
  
  ok(m.flagMissile === true, 'a flag `missile` segue ligada (o rastro de exaustao depende dela)');
}

console.log('');
console.log(falhas ? `${falhas} FALHA(S)` : '✔ O MISSIL DA CIDADELA E DELE, E A CAIXA NAO SE MEXEU');
await browser.close();
process.exit(falhas ? 1 : 0);
