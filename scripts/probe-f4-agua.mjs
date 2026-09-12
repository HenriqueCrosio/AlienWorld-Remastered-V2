// FATIA 7 · A ÁGUA DA ARENA DO GOLFINHO — a sonda do alagamento da câmara B.
//
// ⚠️ O QUE ELA EXISTE PARA COBRAR é UM número em DOIS arquivos: o `miniboss` de t=40 (GameScene,
// `spawnGolfinho` → `agua.encher()`) e o `cenario` de t=40,95 (STAGE_4). O pedido do Henrique era
// *"encher de água a tela e assim escondemos a transição das imagens de fundo"* — ou seja, a troca
// de pintura TEM de acontecer com a água cobrindo. Mexer num tempo sem o outro devolve o corte
// seco, e nenhuma outra sonda percebe.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(800);

// ─── A ÁGUA NASCE SECA, e fora da arena ela não existe ───
const antes = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { agua: s.agua?.estadoAtual ?? null, cobrindo: s.agua?.cobrindo ?? null };
});
console.log('antes    ', JSON.stringify(antes));
ok(antes.agua?.estado === 'seco', `fora da arena a água é SECA (${antes.agua?.estado})`);
ok(antes.agua?.alpha === 0, `e não pinta nada (alpha=${antes.agua?.alpha})`);

// ─── O SALTO: à beira da câmara B, com o estado que o roteiro teria deixado ───
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.elapsed = 39.6;
  s.director.skipTo(39.6);
  s.aplicaCorredorEMoldura(39.6);
  s.hazardRate = 0;
  s.propRate = 0;
});

// ⚠️ AMOSTRAGEM DENSA, e é o ponto da sonda: o instante em que a textura troca dura UM frame. Um
// `waitForTimeout` grosso pularia por cima dele e a sonda passaria verde sem ter olhado nada.
const trilha = [];
let noSwap = null;
let pico = 0;
let viuEnchendo = false;
let viuSuperficie = false;
for (let i = 0; i < 160; i++) {
  const q = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 99;
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    return {
      t: +(s.elapsed ?? 0).toFixed(2),
      e: s.agua?.estadoAtual ?? null,
      cobrindo: s.agua?.cobrindo ?? null,
      pintura: s.parallax?.pinturaAtual ?? null,
      vivo: !!s.golfinho,
    };
  });
  if (!q.e) break;
  if (q.e.estado === 'enchendo') viuEnchendo = true;
  if (q.e.nivel > 0.02 && q.e.nivel < 0.98) viuSuperficie = true;
  pico = Math.max(pico, q.e.alpha);
  // O primeiro quadro em que a pintura JÁ É a da câmara B: é aqui que o corte aconteceu.
  if (noSwap === null && q.pintura === 'paintBgF4b') noSwap = q;
  trilha.push(q);
  if (noSwap && q.e.estado === 'submerso') break;
  await page.waitForTimeout(30);
}

console.log('no corte ', JSON.stringify(noSwap));
console.log('pico     ', pico.toFixed(3));

ok(viuEnchendo, 'a água ENCHE (o estado `enchendo` foi visto)');
ok(viuSuperficie, 'e enche SUBINDO — há quadro com a superfície no meio da tela');
ok(noSwap !== null, 'a pintura trocou para a câmara B');
// ⚠️ O ASSERT QUE É A RAZÃO DE ESTA SONDA EXISTIR.
ok(
  noSwap?.cobrindo === true,
  `⭐ a troca de pintura acontece com a água COBRINDO (alpha=${noSwap?.e?.alpha}, nivel=${noSwap?.e?.nivel})`,
);
ok(pico >= 0.9, `o surto chega a tapar a tela (pico de alpha ${pico.toFixed(3)})`);

// ─── O REPOUSO: submerso tem de deixar a fase legível ───
const submerso = await page.evaluate(async () => {
  const s = window.__game.scene.getScenes(true)[0];
  return { e: s.agua?.estadoAtual ?? null, vivo: !!s.golfinho };
});
console.log('submerso ', JSON.stringify(submerso));
ok(submerso.e?.estado === 'submerso', `assenta em SUBMERSO (${submerso.e?.estado})`);
ok(
  submerso.e?.alpha > 0.1 && submerso.e?.alpha < 0.35,
  `e o véu de repouso deixa a fase legível (alpha=${submerso.e?.alpha}, esperado 0,1–0,35)`,
);
ok(submerso.vivo, 'e tudo isso com o golfinho ainda vivo — a água é da ARENA, não da morte dele');

// ─── A DRENAGEM: morto o golfinho, a câmara seca ───
await page.evaluate(() => window.__game.scene.getScenes(true)[0].matarGolfinho());
let secou = null;
for (let i = 0; i < 60; i++) {
  const q = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return { e: s.agua?.estadoAtual ?? null, vivo: !!s.golfinho };
  });
  if (q.e?.estado === 'seco') { secou = q; break; }
  await page.waitForTimeout(50);
}
console.log('secou    ', JSON.stringify(secou));
ok(secou !== null, 'morto o golfinho, a água DRENA até secar');
ok(secou?.e?.alpha === 0, `e não deixa véu nenhum para trás (alpha=${secou?.e?.alpha})`);

// ─── O `G` PARA O CHEFÃO: a água some na hora, sem drenar por cima do salto ───
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.elapsed = 39.6;
  s.director.skipTo(39.6);
  s.spawnGolfinho(undefined, 49.5);
});
await page.waitForTimeout(700);
const antesDoG = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.agua?.estadoAtual ?? null;
});
await page.keyboard.press('G');
await page.waitForTimeout(200);
const depoisDoG = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { agua: s.agua?.estadoAtual ?? null, vivo: !!s.golfinho };
});
console.log('G        ', JSON.stringify({ antesDoG, depoisDoG }));
ok(antesDoG?.estado !== 'seco', `o G foi testado com água na tela (${antesDoG?.estado})`);
ok(
  depoisDoG.agua?.estado === 'seco' && depoisDoG.agua?.alpha === 0,
  `o G para o chefão APAGA a água na hora, sem drenar (${depoisDoG.agua?.estado})`,
);

console.log(falhas === 0 ? '\n✔ A ÁGUA DA ARENA ESTÁ DE PÉ' : `\n✘ ${falhas} FALHA(S)`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
