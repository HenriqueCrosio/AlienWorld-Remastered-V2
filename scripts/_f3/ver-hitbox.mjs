// A CAIXA da gota da serpente ao nascer e nos frames seguintes. O Body do Arcade guarda a escala
// do frame anterior; a pergunta e se isso se corrige sozinho (e se ja era assim com o bolt2).
import { chromium } from 'playwright';
const TEX = process.argv[2] ?? 'shotVeneno';
const browser = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
for (let i=0;i<60;i++){ if (await page.evaluate(()=>!!(window.__game?.scene.getScene('Game')?.terrain))) break; await page.waitForTimeout(250); }
const viva = () => page.evaluate(() => { const s=window.__game.scene.getScene('Game'); if(!s||!s.scene.isActive()) return null; s.lives=9; return Number((s.elapsed??0).toFixed(1)); });
let t = 0;
while ((t = await viva()) !== null && t < 90) await page.waitForTimeout(500);
// instala o rastreador DENTRO do update da cena, para amostrar frame a frame sem perder a cena
await page.evaluate((tex) => {
  const s = window.__game.scene.getScene('Game');
  window.__hb = [];
  const seen = new Map();
  s.events.on('postupdate', () => {
    for (const b of s.enemies.enemyBullets.getChildren()) {
      if (!b.active || b.texture.key !== tex) continue;
      if (!seen.has(b)) { seen.set(b, []); }
      const r = seen.get(b);
      if (r.length < 4) { r.push(Math.round(b.body.width)+'x'+Math.round(b.body.height)); if (r.length===4) window.__hb.push(r.join(' -> ')); }
    }
  });
}, TEX);
for (let i=0;i<40;i++){ const v = await viva(); if (v===null) break; await page.waitForTimeout(400); const n = await page.evaluate(()=>window.__hb?.length??0); if (n>=4) break; }
const hb = await page.evaluate(() => window.__hb ?? []);
console.log('textura ' + TEX + ' — caixa nos 4 primeiros frames de cada tiro:');
for (const l of hb) console.log('  ' + l);
await browser.close();
