// A FATIA 4 — a apresentação da doca do cinturão. Entra pelo atalho [O] do menu.
// Ela ASSERTA (não só fotografa): cada achado desta fatia vira uma condição que reprova.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '✔ ' : '✘ ') + msg);
  if (!cond) falhas++;
};

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const acha = (k) =>
      s.children.list.find((o) => o.texture && o.texture.key === k) ?? null;
    const ceu = acha('paintBgCut2');
    return {
      cena: s.scene.key,
      ceu: ceu ? { x: Math.round(ceu.x), y: Math.round(ceu.y), d: ceu.depth } : null,
      temParallaxPixel: !!s.parallax,
    };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
await page.waitForTimeout(2500);

const e = await estado();
console.log('estado', JSON.stringify(e));

ok(e.cena === 'Interlude2', 'está na Interlude2');
ok(e.ceu !== null, 'a PINTURA do cinturão está na cena');
ok(e.ceu !== null && e.ceu.d === -110, 'a pintura está no depth -110 (atrás do starfield)');
ok(e.temParallaxPixel === false, 'o parallax pixel foi APOSENTADO (a pintura o substituiu)');

await page.screenshot({ path: 'probe-cut2-aproximacao.png' });

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE');
process.exit(falhas ? 1 : 0);
