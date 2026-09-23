// FATIA 7 · A ABERTURA DA FASE 4 — a captura que julga a LEITURA do miolo.
//
// ⚠️ ELA EXISTE PORQUE NÚMERO SOZINHO NÃO DECIDE COMPOSIÇÃO. A sonda cobra a invariante (o
// destroço fora do terço central, o topo do coração enterrado na faixa); esta aqui mostra o
// QUANTO — e foi ela que pegou o coração saindo com 263px de largura, dois terços da tela,
// numa versão que passava em todos os asserts.
//
// Uso: npm run dev noutro terminal, depois
//   node scripts/_f4/_ver-abertura.mjs scripts/_f4/_abertura.png
// Escreve _abertura-t7.png, -t20.png e -t33.png, e imprime a caixa de cada peça.
// ⚠️ scripts/_f4/*.png é ignorado pelo git — as capturas existem só neste disco.
import { chromium } from 'playwright';
const SAIDA = process.argv[2];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(600);
// A sonda não sabe jogar: vidas para cima, senão a captura de t=33 mede o GameOver.
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  setInterval(() => { s.lives = 99; }, 200);
});

// Espera por ESTADO (o relógio da fase), nunca por relógio de parede.
const esperarT = async (alvo) => {
  await page.waitForFunction(
    (a) => (window.__game.scene.getScenes(true)[0]?.elapsed ?? 0) >= a,
    alvo,
    { timeout: 60000 },
  );
};

const medir = async () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const imgs = s.children.list.filter((o) => o.type === 'Image' && o.visible);
  const na = (k) => imgs.filter((o) => String(o.texture?.key).startsWith(k));
  const caixa = (o) => ({
    topo: Math.round(o.y - o.displayHeight * o.originY),
    base: Math.round(o.y + o.displayHeight * (1 - o.originY)),
    x: Math.round(o.x),
    larg: Math.round(o.displayWidth),
  });
  const naTela = (o) => o.x > -o.displayWidth && o.x < 384 + o.displayWidth;
  return {
    t: +(s.elapsed ?? 0).toFixed(1),
    // o destroço de PRIMEIRO PLANO é o único derelict em depth 60
    frente: na('derelict').filter((o) => o.depth === 60 && naTela(o)).map(caixa),
    orgao: na('orgao').filter(naTela).map(caixa),
  };
});

await esperarT(7);
console.log('t=7  ', JSON.stringify(await medir()));
await page.screenshot({ path: SAIDA.replace('.png', '-t7.png') });

await esperarT(20);
console.log('t=20 ', JSON.stringify(await medir()));
await page.screenshot({ path: SAIDA.replace('.png', '-t20.png') });

await esperarT(33);
console.log('t=33 ', JSON.stringify(await medir()));
await page.screenshot({ path: SAIDA.replace('.png', '-t33.png') });

await browser.close();
