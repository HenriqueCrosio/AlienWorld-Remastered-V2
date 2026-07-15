// O que EXATAMENTE está desenhado no fundo da Fase 2, e onde.
//
// Existe porque uma laje cinza-clara de bordas retas apareceu no céu do cinturão, e "parece que
// é o X" é como se perde uma tarde. A sonda pergunta ao jogo, e o jogo responde com a textura,
// a caixa e a profundidade de cada coisa que ele desenhou.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('V');
await page.waitForTimeout(4000);

const fundo = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];

  // Tudo o que a cena desenha atrás da nave, com a caixa de verdade.
  return s.children.list
    .filter((o) => o.depth < 0 && o.texture)
    .map((o) => ({
      textura: o.texture.key,
      depth: o.depth,
      x: Math.round(o.x),
      y: Math.round(o.y),
      w: Math.round(o.displayWidth),
      h: Math.round(o.displayHeight),
      alpha: Number((o.alpha ?? 1).toFixed(2)),
      tint: '#' + (o.tintTopLeft ?? 0xffffff).toString(16).padStart(6, '0'),
    }))
    .sort((a, b) => a.depth - b.depth);
});

// Agrupa por textura: o que importa é QUANTOS e de que TAMANHO, não cada pedra.
const porTextura = {};
for (const o of fundo) {
  const k = `${o.textura} (depth ${o.depth})`;
  porTextura[k] ??= { n: 0, maiorW: 0, maiorH: 0, tint: o.tint, alpha: o.alpha };
  porTextura[k].n++;
  porTextura[k].maiorW = Math.max(porTextura[k].maiorW, o.w);
  porTextura[k].maiorH = Math.max(porTextura[k].maiorH, o.h);
}

console.log('CAMADAS DE FUNDO (Fase 2):');
for (const [k, v] of Object.entries(porTextura)) {
  console.log(`  ${k.padEnd(28)} n=${String(v.n).padStart(3)}  maior=${v.maiorW}x${v.maiorH}  tint=${v.tint} alpha=${v.alpha}`);
}

// A laje suspeita: qualquer coisa GRANDE e clara no fundo.
console.log('\nOBJETOS GRANDES (>90px):');
for (const o of fundo.filter((o) => o.w > 90 || o.h > 90)) {
  console.log(`  ${o.textura.padEnd(16)} depth=${String(o.depth).padStart(4)} em (${o.x},${o.y}) ${o.w}x${o.h} tint=${o.tint} alpha=${o.alpha}`);
}

await browser.close();
