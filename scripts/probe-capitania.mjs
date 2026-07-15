// A CANHONEIRA-CAPITÂNIA, nas duas fases.
// Verifica o que só se vê rodando: ela LARGA kamikazes, a salva rolante sai bateria a bateria,
// e o FLAK só aparece na fúria (<50% de vida).
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const b = s?.boss;
    const balas = (s?.enemies?.enemyBullets?.getChildren() ?? []).filter((x) => x.active);

    return {
      vida: b ? `${b.hp}/${b.maxHp}` : null,
      furia: b?.hp <= b?.maxHp / 2,
      compasso: Number(b?.cycleT?.toFixed(2)),
      kamikazesVivos: (s?.enemies?.enemies?.getChildren() ?? []).filter(
        (e) => e.active && e.getData('kind') === 'kamikaze',
      ).length,
      granadasNoAr: b?.flak?.length ?? 0,
      // O projétil dela tem que ser TRAÇANTE (bolt2), não a bola de fogo da Torre (comet).
      texturasDeTiro: [...new Set(balas.map((x) => x.texture.key))],
      vidas: s?.lives,
    };
  });

/**
 * A sonda é um alvo parado: ela não desvia. Sem vidas forçadas, os kamikazes a matam antes da
 * fúria e o teste vira um teste do GameOver — o que se quer ver aqui é o PADRÃO.
 */
async function observar(ms) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    await page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      if (s?.lives !== undefined) s.lives = 9;
    });
    await page.waitForTimeout(120);
  }
}

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('C'); // menu: treino da Capitânia
await page.keyboard.down('J'); // no voo LIVRE o tiro é manual
await observar(4000);

console.log('\n── INTEIRA (salva rolante + lançamento) ──');
for (let i = 0; i < 4; i++) {
  await observar(1400);
  console.log(JSON.stringify(await estado()));
}
await page.screenshot({ path: 'probe-capitania-salva.png' });

// Empurra para a FÚRIA sem ter que lutar 2 minutos: o que se testa é o padrão, não o DPS.
await page.evaluate(() => {
  const b = window.__game.scene.getScenes(true)[0]?.boss;
  if (b) b.hp = Math.floor(b.maxHp * 0.45);
});

console.log('\n── FÚRIA (onda apertada + FLAK + mirada) ──');
let viuFlak = false;

for (let i = 0; i < 10; i++) {
  await observar(700);
  const e = await estado();
  if (e.granadasNoAr > 0 && !viuFlak) {
    viuFlak = true;
    await page.screenshot({ path: 'probe-capitania-furia.png' });
  }
  console.log(JSON.stringify(e));
}

console.log(viuFlak ? '\n✔ FLAK observado no ar' : '\n✘ FLAK NUNCA apareceu');
await page.keyboard.up('J');
await browser.close();
