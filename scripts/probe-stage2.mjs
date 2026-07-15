// Fase 2 (Frota Morta) num Chromium headless: o cinturão, os inimigos novos e a Capitânia.
// No menu: V = fase 2 do início · C = treino da Capitânia.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();

page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log(`[console:${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

const estado = () =>
  page.evaluate(() => {
    const game = window.__game;
    const s = game.scene.getScenes(true)[0];
    if (!s) return { erro: 'sem cena' };

    const vivos = (g) => (g?.getChildren() ?? []).filter((o) => o.active);
    const conta = (arr, campo) =>
      arr.reduce((acc, o) => {
        const k = o.getData(campo) ?? '?';
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

    return {
      cena: s.scene.key,
      fase: s.stage?.id,
      nomeFase: s.stage?.name,
      zona: s.zone,
      conducao: s.controller?.id,
      elapsed: Number(s.elapsed?.toFixed(1)),
      vidas: s.lives,
      destrocos: conta(vivos(s.debris?.hazards), 'kind'),
      inimigos: conta(vivos(s.enemies?.enemies), 'kind'),
      chefao: s.boss
        ? {
            x: Number(s.boss.sprite.x.toFixed(1)),
            y: Number(s.boss.sprite.y.toFixed(1)),
            visivel: s.boss.sprite.visible,
            textura: s.boss.sprite.texture.key,
          }
        : null,
      // O fundo conta a história: a lua encolhe, o Leviatã cresce.
      lua: Number(s.parallax?.moon?.scaleX?.toFixed(2)),
      leviata: Number(s.parallax?.leviathan?.scaleX?.toFixed(2)),
    };
  });

// ─── 1. A fase, do início ────────────────────────────────────────────────────
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('V');
await page.waitForTimeout(1200);

await page.keyboard.down('J'); // no voo LIVRE o tiro é manual

console.log('t≈2s  ', JSON.stringify(await estado()));
await page.waitForTimeout(6000);
await page.screenshot({ path: 'probe-stage2-cinturao.png' });
console.log('t≈8s  ', JSON.stringify(await estado()));

// Até os kamikazes (t=35) e o cargueiro (t=47).
await page.waitForTimeout(29000);
await page.screenshot({ path: 'probe-stage2-kamikaze.png' });
console.log('t≈37s ', JSON.stringify(await estado()));

await page.waitForTimeout(12000);
await page.screenshot({ path: 'probe-stage2-cargueiro.png' });
console.log('t≈49s ', JSON.stringify(await estado()));

await page.keyboard.up('J');

// ─── 2. A Capitânia, direto ──────────────────────────────────────────────────
await page.keyboard.press('Escape');
await page.waitForTimeout(700);
await page.keyboard.press('C');
await page.waitForTimeout(1500);
await page.keyboard.down('J');

await page.waitForTimeout(6000);
await page.screenshot({ path: 'probe-stage2-capitania.png' });
console.log('CAPITÂNIA', JSON.stringify(await estado()));

await page.keyboard.up('J');
await browser.close();
