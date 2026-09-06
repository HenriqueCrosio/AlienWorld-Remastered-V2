// DEMO da transição do Ato 1 para o Ato 2 da Fase 3: fotografa o RABO atravessando a tela e
// depois o Ato 2 com os props novos. Script pontual — a verificação que vale é o olho.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
await page.waitForTimeout(3000);

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.lives = 9;
    const rabo = s.children.list.filter((o) => o.texture && String(o.texture.key).startsWith('raboLeviata'));
    const props = s.terrain ? s.terrain.props.getChildren().filter((p) => p.active) : [];
    return {
      t: Number((s.elapsed ?? 0).toFixed(1)),
      nebulaDim: s.parallax ? Number(s.parallax.nebulaDim.toFixed(2)) : null,
      rabo: rabo.length
        ? { n: rabo.length, x: Math.round(rabo[0].x), y: Math.round(rabo[0].y), a: Number(rabo[0].alpha.toFixed(2)), anim: rabo[0].anims?.currentAnim?.key ?? null }
        : null,
      props: props.map((p) => p.getData('kind')),
    };
  });

// Vai até t=41 (o rabo entra em 40.5), fotografando a travessia.
let e = await estado();
while (e.t < 41) {
  await page.waitForTimeout(1200);
  e = await estado();
}
for (const marca of [0, 2, 4, 6, 8]) {
  const st = await estado();
  console.log(`t=${st.t} nebulaDim=${st.nebulaDim} rabo=${JSON.stringify(st.rabo)}`);
  await page.screenshot({ path: `scripts/_f3/transicao-${marca}.png` });
  if (marca < 8) await page.waitForTimeout(1900);
}

// O ATO 2 com os props novos.
while ((await estado()).t < 68) await page.waitForTimeout(1500);
const ato2 = await estado();
console.log(`\nATO 2  t=${ato2.t}  props na tela: ${JSON.stringify(ato2.props)}`);
await page.screenshot({ path: 'scripts/_f3/ato2-props.png' });
await browser.close();
