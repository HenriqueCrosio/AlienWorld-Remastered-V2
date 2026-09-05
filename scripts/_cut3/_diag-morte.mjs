// DIAGNÓSTICO: a animação de morte da garganta ACONTECE na tela?
//
// O Henrique jogou e disse que o idle roda e a morte não. A sonda da fatia só cobra que a
// animação ENTRA (`currentAnim.key === 'garganta-morte'`) — isso não prova que ela AVANÇA de
// quadro, nem que ela é VISÍVEL. Aqui a cena é jogada e o estado da animação é amostrado a cada
// 80ms do impacto em diante.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PAGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// O que o BootScene REGISTROU: existe a animação? com quantos quadros?
const reg = await page.evaluate(() => {
  const g = window.__game;
  const info = (k) => {
    const a = g.anims.get(k);
    return a ? { existe: true, quadros: a.frames.length, fps: a.frameRate, repeat: a.repeat } : { existe: false };
  };
  return {
    idle: info('garganta-idle'),
    morte: info('garganta-morte'),
    texturas: Object.keys(g.textures.list).filter((k) => k.startsWith('gargantaMorte')).sort(),
  };
});
console.log('REGISTRO   ', JSON.stringify(reg));

await page.evaluate(() => {
  window.__game.scene.stop('Menu');
  window.__game.scene.start('Interlude3', { score: 4200, handling: 'diegetico', naveId: 'arauto' });
});

// espera o painel e joga
let painel = false;
for (let i = 0; i < 60 && !painel; i++) {
  painel = await page.evaluate(() => !!window.__game.scene.getScenes(true)[0].panel);
  if (!painel) await page.waitForTimeout(400);
}
console.log('painel     ', painel);
await page.keyboard.press('8');
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.keyboard.press('Enter');

// amostra o estado da garganta a cada 80ms por 5s
const linhas = [];
for (let i = 0; i < 62; i++) {
  const s = await page.evaluate(() => {
    const sc = window.__game.scene.getScenes(true)[0];
    const g = sc.children.list.filter((o) => o.name === 'gargantaCut3')[0];
    if (!g) return null;
    const a = g.anims;
    return {
      anim: a && a.currentAnim ? a.currentAnim.key : null,
      quadro: a && a.currentFrame ? a.currentFrame.index : null,
      tex: g.texture.key,
      tocando: !!(a && a.isPlaying),
      visivel: g.visible,
      alpha: +g.alpha.toFixed(2),
      // quantos objetos estão DESENHANDO por cima dela neste instante
      porCima: sc.children.list.filter((o) => o.depth > g.depth && o.visible && (o.alpha ?? 1) > 0.05).length,
    };
  });
  linhas.push({ t: i * 80, ...s });
  await page.waitForTimeout(80);
}

console.log('\n  t(ms)  anim               quadro  tex                    tocando  alpha  porCima');
let ant = null;
for (const l of linhas) {
  const chave = `${l.anim}|${l.quadro}|${l.tocando}|${l.alpha}|${l.porCima}`;
  if (chave === ant) continue; // só as MUDANÇAS, senão são 62 linhas iguais
  ant = chave;
  console.log(
    `  ${String(l.t).padStart(5)}  ${String(l.anim).padEnd(18)} ${String(l.quadro).padStart(5)}  ${String(l.tex).padEnd(22)} ${String(l.tocando).padStart(7)}  ${String(l.alpha).padStart(5)}  ${String(l.porCima).padStart(7)}`,
  );
}

const quadrosVistos = [...new Set(linhas.filter((l) => l.anim === 'garganta-morte').map((l) => l.quadro))];
console.log(`\nquadros de MORTE realmente vistos: ${quadrosVistos.length ? quadrosVistos.join(', ') : 'NENHUM'}`);

await browser.close();
