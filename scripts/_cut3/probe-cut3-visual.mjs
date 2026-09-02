// A FATIA 6 na tela. Cobre a pintura, a fronteira com a Fase 4, a nadadeira, as carcaças e o
// portão. Roda UMA POR VEZ (três browsers no mesmo Vite quebram).
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PAGINA] ${e.message}`));

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  window.__game.scene.stop('Menu');
  window.__game.scene.start('Interlude3', { score: 4200, handling: 'diegetico', naveId: 'arauto' });
});
await page.waitForTimeout(1500);

const cena = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const acha = (n) => s.children.list.filter((o) => o.name === n);
    const p = acha('paredeCut3')[0];
    return {
      key: s.scene.key,
      parede: p ? { tex: p.texture.key, x: Math.round(p.x), y: Math.round(p.y), w: p.width, h: p.height } : null,
      // Quantas imagens ainda usam a arte da FASE 4 nesta cena.
      usamHangar: s.children.list.filter((o) => o.texture && o.texture.key === 'hangar').length,
    };
  });

const c = await cena();
console.log('cena  ', JSON.stringify(c));
ok(c.key === 'Interlude3', 'a cutscene 3 abriu');
ok(!!c.parede, 'a parede da cena existe e tem nome (paredeCut3)');
if (c.parede) {
  ok(c.parede.tex === 'paintBgCut3', `a parede e a PINTURA (${c.parede.tex})`);
  ok(c.parede.w === 384 && c.parede.h === 216, `em 384x216 (${c.parede.w}x${c.parede.h})`);
  ok(c.parede.x === 0 && c.parede.y === 0, `ancorada em 0,0 (${c.parede.x},${c.parede.y})`);
}
ok(c.usamHangar === 0, `nenhuma imagem da cena usa mais o 'hangar' da Fase 4 (${c.usamHangar})`);

console.log('');
console.log(falhas ? `${falhas} FALHA(S)` : '✔ A FATIA 6 ESTA DE PE');
await browser.close();
process.exit(falhas ? 1 : 0);
