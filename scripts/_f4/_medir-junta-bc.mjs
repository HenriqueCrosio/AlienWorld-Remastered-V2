// O PILAR DA COSTURA B→C APARECEU? Mede os dois objetos `juntaChao`/`juntaTeto` enquanto o
// relógio atravessa o t=68 — visibilidade, textura e posição.
//
// ⚠️ UM ASSERT DE OLHO NÃO SERVE AQUI: o pilar é plantado na emenda e sai de cena junto com ela,
// e a captura pode simplesmente não pegar o instante. Medir o objeto é o que distingue "não
// apareceu" de "não fotografei".
//
//   node scripts/_f4/_medir-junta-bc.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  if (s.golfinho) s.encerrarGolfinho(false);
  s.elapsed = 66; s.director.skipTo(66); s.aplicaCorredorEMoldura(66);
});

let vistos = 0;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(250);
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    const j = ['juntaChao', 'juntaTeto'].map((n) => {
      const o = s.children.list.find((c) => c.name === n);
      return o ? { n, vis: o.visible, tex: o.texture.key, x: Math.round(o.x), y: Math.round(o.y) } : { n, ausente: true };
    });
    return { t: Math.round(s.elapsed * 10) / 10, j };
  });
  if (r.j.some((o) => o.vis)) { console.log(`t=${r.t}  ${JSON.stringify(r.j)}`); vistos++; }
  if (r.t > 74) break;
}
await browser.close();
console.log(vistos ? `\nO PILAR APARECEU em ${vistos} leituras.` : '\n✘ O PILAR NUNCA FICOU VISIVEL.');
