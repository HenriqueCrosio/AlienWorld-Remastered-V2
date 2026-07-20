// Sonda do ENXAME (a arma alienígena) — A/B contra a PULSE, medido, não lido.
//
// Por que ela existe: o Enxame é a única arma nunca jogada por um humano, e a trava de
// balanceamento dele é a CURVA de 150°/s — o tipo de número que só se descobre errado
// jogando (docs/HANDOFF.md). A promessa de design: alvo GRANDE e LENTO = impossível de
// errar; alvo PEQUENO e RÁPIDO = quase sempre erra. Se as duas colunas saírem parecidas,
// a curva está errada.
//
// O que mede (Fase 2, nave parada, gatilho segurado):
//   A) t=8→34s — o trecho dos BATEDORES (pequenos, em senoide): abates e dano real.
//   B) o CARGUEIRO do t=47 (grande e lento): tempo para matar.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function medir(teclaArma, nomeArma) {
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  // [V] = entra direto na Fase 2 (voo livre).
  await page.keyboard.press('v');
  await page.waitForTimeout(800);

  // Vidas para cima (a sonda não sabe jogar — testa-se a ARMA, não a sobrevivência) e a
  // instrumentação: conta abates e dano REAL no bulletHitEnemy, que é a única verdade.
  await page.evaluate(() => {
    const scene = window.__game.scene.getScene('Game');
    scene.lives = 999;
    window.__kills = 0;
    window.__dmg = 0;
    const orig = scene.bulletHitEnemy.bind(scene);
    scene.bulletHitEnemy = (b, e) => {
      const antes = e.getData('hp');
      orig(b, e);
      window.__dmg += Math.min(b.getData('damage'), Math.max(0, antes));
      if (!e.active) window.__kills++;
    };
  });

  // Equipa a arma do experimento (atalhos de dev) e segura o gatilho o trecho inteiro.
  await page.keyboard.press(teclaArma);
  await page.keyboard.down('j');

  // Janela A: t≈8s → t≈34s (batedores + drones; kamikazes chegam depois).
  await page.waitForTimeout(26000);
  const janelaA = await page.evaluate(() => ({
    kills: window.__kills,
    dmg: window.__dmg,
    elapsed: window.__game.scene.getScene('Game').elapsed,
  }));

  // Janela B: o CARGUEIRO (t=47). Espera ele nascer e mede o tempo até morrer.
  let nascimento = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(500);
    const tem = await page.evaluate(() =>
      window.__game.scene
        .getScene('Game')
        .enemies.enemies.getChildren()
        .some((e) => e.active && e.getData('kind') === 'cargueiro'),
    );
    if (tem) {
      nascimento = Date.now();
      break;
    }
  }

  let ttk = null;
  if (nascimento) {
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(500);
      const vivo = await page.evaluate(() =>
        window.__game.scene
          .getScene('Game')
          .enemies.enemies.getChildren()
          .some((e) => e.active && e.getData('kind') === 'cargueiro'),
      );
      if (!vivo) {
        ttk = (Date.now() - nascimento) / 1000;
        break;
      }
    }
  }

  await page.keyboard.up('j');
  await page.close();
  return { nomeArma, janelaA, ttkCargueiro: ttk };
}

const pulse = await medir('1', 'PULSE');
const enxame = await medir('4', 'ENXAME');

console.log('\n=== A/B: alvo PEQUENO E RÁPIDO (batedores, 26s de gatilho) ===');
for (const r of [pulse, enxame]) {
  console.log(
    `${r.nomeArma.padEnd(7)} abates=${String(r.janelaA.kills).padStart(3)}  dano=${Math.round(r.janelaA.dmg)}`,
  );
}
console.log('\n=== A/B: alvo GRANDE E LENTO (cargueiro, tempo até morrer) ===');
for (const r of [pulse, enxame]) {
  console.log(
    `${r.nomeArma.padEnd(7)} ${r.ttkCargueiro === null ? 'não morreu' : r.ttkCargueiro.toFixed(1) + 's'}`,
  );
}

await browser.close();
