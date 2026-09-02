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

// ─── A NADADEIRA: uma remada só, da DIREITA para a ESQUERDA, e só o `x` se mexe ───
//
// ⚠️ O ASSERT COBRA A DIREÇÃO QUE O DESENHO EXIGE, NÃO A QUE O CÓDIGO ESCOLHEU. O assert do rabo
// cobrava `x2 < x1` e ficou VERDE em cima da versão que o Henrique reprovou, porque media a
// escolha de quem o escreveu. Aqui a direita→esquerda foi derivada da Fase 3 (o corpo do Leviatã
// está fora do quadro à direita, ele nada para a direita, a remada de força varre para trás) e
// CONFIRMADA por ele antes de uma linha ser escrita.
const nad = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const n = s.children.list.filter((o) => o.name === 'nadadeiraCut3')[0];
    const p = s.children.list.filter((o) => o.name === 'paredeCut3')[0];
    return n
      ? { x: Math.round(n.x), y: Math.round(n.y), ang: Math.round(n.angle),
          alpha: +n.alpha.toFixed(2), depth: n.depth, depthParede: p ? p.depth : null }
      : null;
  });

let a = null;
for (let i = 0; i < 60 && !a; i++) { a = await nad(); if (!a) await page.waitForTimeout(200); }
ok(!!a, 'a nadadeira entra em cena');
if (a) {
  await page.waitForTimeout(1500);
  const b = await nad();
  console.log('nadadeira', JSON.stringify(a), '->', JSON.stringify(b));
  ok(!!b, 'ela ainda esta na tela 1,5s depois (a remada e lenta)');
  if (b) {
    ok(b.x < a.x, `ela varre da DIREITA para a ESQUERDA (${a.x} -> ${b.x})`);
    ok(b.y === a.y, `sem eixo Y — a saida e uma linha so (${a.y} -> ${b.y})`);
    ok(b.ang === a.ang, `sem giro (${a.ang}deg)`);
    ok(b.alpha === a.alpha && b.alpha === 1, `sem fade: alpha fica em 1 (${a.alpha} -> ${b.alpha})`);
    ok(b.depth < b.depthParede, `ela fica ATRAS da pintura (${b.depth} < ${b.depthParede}), entao so aparece pelas janelas`);
  }
}

console.log('');
console.log(falhas ? `${falhas} FALHA(S)` : '✔ A FATIA 6 ESTA DE PE');
await browser.close();
process.exit(falhas ? 1 : 0);
