// QUANTO A LUZ DA BORDA C PULA DENTRO DO DUTO.
//
// A veia acesa da peça é uma linha horizontal na linha 41 da arte; na tela ela cai em
// `superficieChao + 41`, placa a placa. Se a superfície anda, a luz anda com ela — e é isso que
// ele viu jogando: *"ficar em um degrau diferente fica estranho in game"*.
//
// ⚠️ MEDE O QUE ESTÁ DESENHADO, e não a curva perguntada à frente. Perguntar `superficieChaoEm`
// 3000px adiante devolve placas que o roteiro ainda não configurou (medi 49px de degrau assim,
// contra os 14 do `PASSO_MAX`) — a curva só é verdade onde ela já nasceu.
//
//   node scripts/_f4/_medir-degrau-duto.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(1200);

await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  if (s.golfinho) s.encerrarGolfinho(false);
  s.elapsed = 68; s.director.skipTo(68); s.aplicaCorredorEMoldura(68);
});

const placas = new Map(); // índice no mundo -> { chao, teto }
for (let i = 0; i < 200; i++) {
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    const segs = s.children.list.filter((o) => o.name === 'faixaChao' && /^f4FaixaC/.test(o.texture.key));
    const tetos = s.children.list.filter((o) => o.name === 'faixaTeto');
    const out = [];
    for (const g of segs) {
      const t = tetos.find((o) => Math.abs(o.x - g.x) < 1);
      out.push({ n: Math.round((g.x + s.moldura.xMundo) / 128), chao: Math.round(g.y), teto: t ? Math.round(t.y) : null });
    }
    return { t: Math.round(s.elapsed * 10) / 10, gap: s.moldura.gap, duto: s.moldura.duto, out };
  });
  for (const p of r.out) if (p.teto !== null) placas.set(p.n, p);
  if (r.t > 105) break;
  await page.waitForTimeout(300);
}
await browser.close();

const ord = [...placas.values()].sort((a, b) => a.n - b.n);
const chao = ord.map((p) => p.chao), teto = ord.map((p) => p.teto);
const deg = (a) => a.slice(1).map((v, i) => v - a[i]);
const dC = deg(chao), dT = deg(teto);
const abs = (a) => a.map(Math.abs);
const bandas = ord.map((p) => p.chao - p.teto);

console.log(`placas de C medidas: ${ord.length}  (índices ${ord[0].n} → ${ord[ord.length - 1].n})`);
console.log(`\nsuperfície do CHÃO : ${JSON.stringify(chao)}`);
console.log(`degraus entre vizinhas: ${JSON.stringify(dC)}`);
console.log(`superfície do TETO : ${JSON.stringify(teto)}`);
console.log(`degraus entre vizinhas: ${JSON.stringify(dT)}`);
console.log(`\nA LUZ PULA — chão: espalhamento ${Math.max(...chao) - Math.min(...chao)}px, maior degrau ${Math.max(...abs(dC))}px`);
console.log(`A LUZ PULA — teto: espalhamento ${Math.max(...teto) - Math.min(...teto)}px, maior degrau ${Math.max(...abs(dT))}px`);
console.log(`degraus de 0px (a luz CONTINUA): ${dC.filter((d) => d === 0).length + dT.filter((d) => d === 0).length} de ${dC.length + dT.length}`);
console.log(`\nbanda jogável hoje: min ${Math.min(...bandas)}px, max ${Math.max(...bandas)}px`);
console.log(`SE A PAREDE FICASSE CHATA (o envelope de tudo): ${Math.min(...chao) - Math.max(...teto)}px`);
