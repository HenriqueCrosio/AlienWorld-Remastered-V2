// A luta do chefão da Fase 1 nas suas TRÊS fases: pousada → decolagem → aérea.
//
// Aplica dano por código (não dá para depender da mira da sonda) até cruzar 50%, e fotografa:
//  1. pousada atirando o leque (sem mísseis),
//  2. o instante da decolagem (imune, subindo),
//  3. a fase aérea com a salva de mísseis calando o leque.
//
// Também mede o que a fatia exige: que a fase pousada NÃO solte míssil, e que na fase aérea o
// leque fique CALADO enquanto a salva carrega.
//
// uso: node scripts/probe-chefao-fases.mjs   (com `npm run dev` no ar)
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free', practice: true });
});
await page.waitForTimeout(600);

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__s = s;
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) {
      s.ship.x = 46;
      s.ship.y = 120;
      s.ship.body?.setVelocity?.(0, 0);
    }
  }, 40);
});

const estado = () =>
  page.evaluate(() => {
    const b = window.__s.boss;
    if (!b) return null;
    const misseis = window.__s.enemies.enemyBullets
      .getChildren()
      .filter((x) => x.active && x.getData('missile') === true).length;
    const cometas = window.__s.enemies.enemyBullets
      .getChildren()
      .filter((x) => x.active && x.getData('missile') !== true).length;
    return {
      entering: b.entering,
      airborne: b.airborne,
      takingOff: b.takingOff,
      fanMute: +(b.fanMute ?? 0).toFixed(2),
      missileCharge: +(b.missileCharge ?? 0).toFixed(2),
      y: Math.round(b.sprite.y),
      tex: b.sprite.texture.key,
      hp: b.hp,
      misseis,
      cometas,
    };
  });

// Espera entrar em posição.
for (let i = 0; i < 200; i++) {
  await page.waitForTimeout(100);
  const e = await estado();
  if (e && !e.entering) break;
}

// FASE POUSADA: observa ~4s e confirma que NENHUM míssil sai.
let missilNaPousada = 0;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(100);
  const e = await estado();
  if (e.airborne || e.takingOff) break;
  missilNaPousada = Math.max(missilNaPousada, e.misseis);
}
await page.screenshot({ path: 'scripts/_chefao-fase-pousada.png' });
const posPousada = await estado();
console.log(`POUSADA: y=${posPousada.y} tex=${posPousada.tex} — mísseis vistos: ${missilNaPousada} (deve ser 0)`);

// Aplica dano até cruzar 50% para forçar a decolagem.
await page.evaluate(() => {
  const b = window.__s.boss;
  const alvo = Math.ceil(b.maxHp / 2);
  while (b.hp > alvo) b.damage(5);
});

// Pega o instante da decolagem.
let viuDecolagem = false;
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(50);
  const e = await estado();
  if (e.takingOff) {
    viuDecolagem = true;
    await page.screenshot({ path: 'scripts/_chefao-fase-decolagem.png' });
    console.log(`DECOLAGEM: takingOff=${e.takingOff} y=${e.y} tex=${e.tex} (imune, subindo)`);
    break;
  }
  if (e.airborne) break;
}

// Espera assentar no ar.
for (let i = 0; i < 80; i++) {
  await page.waitForTimeout(100);
  const e = await estado();
  if (e.airborne) break;
}
const posAr = await estado();
console.log(`AÉREA: y=${posAr.y} tex=${posAr.tex} (subiu de ${posPousada.y})`);

// FASE AÉREA: observa um ciclo e checa que quando a salva carrega, o leque está calado.
let violacao = false;
let viuSalva = false;
let viuCometa = false;
for (let i = 0; i < 140; i++) {
  await page.waitForTimeout(100);
  const e = await estado();
  if (e.missileCharge > 0) {
    viuSalva = true;
    // Durante a carga da salva, o fanMute tem que estar ativo (leque calado).
    if (e.fanMute <= 0) violacao = true;
  }
  if (e.misseis >= 4) {
    await page.screenshot({ path: 'scripts/_chefao-fase-aerea.png' });
  }
  if (e.cometas > 0) viuCometa = true;
}

console.log('');
console.log(`fase pousada sem mísseis: ${missilNaPousada === 0 ? 'PASS' : 'FALHA'}`);
console.log(`decolagem imune vista:    ${viuDecolagem ? 'PASS' : 'FALHA'}`);
console.log(`subiu na decolagem:       ${posAr.y < posPousada.y ? 'PASS' : 'FALHA'} (${posPousada.y} -> ${posAr.y})`);
console.log(`trocou para arte aérea:   ${posAr.tex === 'bossAir' || posAr.tex.startsWith('bossAir') ? 'PASS' : 'FALHA'} (${posAr.tex})`);
console.log(`salva cala o leque:       ${viuSalva && !violacao ? 'PASS' : viuSalva ? 'FALHA (leque disparou durante a carga)' : 'sem salva no intervalo'}`);
console.log(`leque ativo na fase aérea:${viuCometa ? ' PASS' : ' sem cometa no intervalo'}`);
console.log('screenshots: _chefao-fase-pousada / -decolagem / -aerea .png');

await browser.close();
