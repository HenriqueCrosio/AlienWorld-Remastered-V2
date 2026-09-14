// AS BORDAS DAS CÂMARAS, JOGANDO. Captura a fase em cada câmara instalada e monta a folha —
// é a única coisa que julga se a borda PERTENCE ao lugar, que é o critério dele de 12/09.
//
// ⚠️ ASSERT VERDE NÃO JULGA COMPOSIÇÃO. A sonda cobra família, dimensão e alinhamento; nenhuma
// delas vê uma borda que briga com a pintura atrás dela.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-bordas.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';

const PARADAS = [
  { t: 7, nome: 'A · a doca engolida' },
  { t: 45, nome: 'B · a garganta' },
  { t: 74, nome: 'C · o duto (borda de B, herdada)' },
  { t: 111, nome: 'D · o nucleo' },
];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on("pageerror", (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(700);

const tiras = [];
for (const p of PARADAS) {
  await page.evaluate((t) => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 999;
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    if (s.golfinho) s.encerrarGolfinho(false);
    s.elapsed = t;
    s.director.skipTo(t);
    s.aplicaCorredorEMoldura(t);
  }, p.t);
  // A parede persegue o alvo a 8px/s; 7s cobrem o pior salto (54 -> 16).
  await page.waitForTimeout(7000);
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const seg = s.children.list.filter((o) => o.name === 'faixaChao' || o.name === 'faixaTeto');
    return {
      t: Math.round(s.elapsed),
      texturas: [...new Set(seg.map((o) => o.texture.key))].sort(),
      espessura: Math.round(s.moldura.espessura),
    };
  });
  console.log(`t=${info.t}  ${p.nome}\n   ${JSON.stringify(info.texturas)}  parede ${info.espessura}px`);
  tiras.push({ buf: await page.screenshot(), nome: p.nome });
}
await browser.close();

const PAD = 8;
const comps = tiras.map((t, i) => ({ input: t.buf, left: PAD, top: PAD + i * (432 + PAD) }));
await sharp({ create: { width: 768 + PAD * 2, height: tiras.length * (432 + PAD) + PAD,
  channels: 4, background: { r: 24, g: 24, b: 28, alpha: 1 } } })
  .composite(comps).png().toFile('scripts/_f4/_folha-bordas.png');
console.log('\nscripts/_f4/_folha-bordas.png');
