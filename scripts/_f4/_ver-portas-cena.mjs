// A CENA LIMPA DO DUTO, 384×216, SEM PORTA — o fundo contra o qual os candidatos são julgados.
// Mata a porta provisória antes do print, senão o candidato aparece em cima dela.
//   node scripts/_f4/_ver-portas-cena.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 384, height: 216 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  if (s.golfinho) s.encerrarGolfinho(false);
  s.elapsed = 76; s.director.skipTo(76); s.aplicaCorredorEMoldura(76);
});
await page.waitForTimeout(6000);
const r = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  // fora a porta provisória e as ondas: o fundo é a PAREDE, não o combate
  for (const p of s.terrain.props.getChildren()) if (p.getData('kind') === 'porta') p.destroy();
  for (const e of s.enemies.enemies.getChildren()) e.destroy();
  if (s.ship) s.ship.setVisible(false);
  const segs = s.children.list.filter((o) => o.name === 'faixaChao');
  // ⚠️ O CENTRO DO VÃO, e não o meio da tela: é onde o spawnPorta ancora a peça. Plantar o
  // candidato no meio da tela faria a folha julgar um enquadramento que o jogo nunca desenha.
  const X_PORTA = 384 - 64 - 40 + 32;
  return { t: Math.round(s.elapsed), texturas: [...new Set(segs.map((o) => o.texture.key))],
    centroVao: Math.round(s.moldura.vaoEm(X_PORTA)),
    chao: Math.round(s.moldura.superficieChaoEm(X_PORTA)),
    teto: Math.round(s.moldura.superficieTetoEm(X_PORTA)) };
});
await page.waitForTimeout(120);
await page.screenshot({ path: 'scripts/_f4/_cena-duto.png' });
await browser.close();
fs.writeFileSync('scripts/_f4/_cena-duto.json', JSON.stringify(r));
console.log(`t=${r.t}  ${JSON.stringify(r.texturas)}  vao=${r.centroVao} (teto ${r.teto}, chao ${r.chao})  ->  scripts/_f4/_cena-duto.png`);
