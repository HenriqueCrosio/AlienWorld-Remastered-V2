// A COSTURA B → C, AO VIVO. O `_ver-bordas` salta com `imediato` (sem emenda); esta deixa o
// relógio ATRAVESSAR o t=68 e fotografa a junta entre a garganta e o duto — a única das três
// trocas de câmara que o roteiro não manda pilar nenhum tapar.
//
//   node scripts/_f4/_ver-emenda-bc.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(700);

await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 999;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  if (s.golfinho) s.encerrarGolfinho(false);
  s.elapsed = 64;
  s.director.skipTo(64);
  s.aplicaCorredorEMoldura(64);
});

// Espera a emenda NASCER e depois a persegue pela tela, fotografando onde ela está.
const tiras = [];
for (let i = 0; i < 70; i++) {
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const segs = s.children.list.filter((o) => o.name === 'faixaChao');
    const chaves = segs.map((o) => ({ x: Math.round(o.x), k: o.texture.key }));
    const temC = chaves.some((c) => /^f4FaixaC/.test(c.k));
    const j = s.children.list.find((o) => o.name === 'juntaChao');
    const pilar = !!(j && j.visible && j.x > 60 && j.x < 330);
    const temB = chaves.some((c) => /^f4FaixaB/.test(c.k));
    return { t: Math.round(s.elapsed * 10) / 10, emenda: temB && temC && pilar, pilarX: j ? Math.round(j.x) : null, chaves };
  });
  if (info.emenda) {
    tiras.push({ buf: await page.screenshot(), nome: `t=${info.t}  ${info.chaves.map((c) => c.k.slice(7)).join(' ')}` });
    console.log(`t=${info.t}  EMENDA NA TELA  ${JSON.stringify(info.chaves)}`);
    if (tiras.length >= 3) break;
    await page.waitForTimeout(900);
  }
  if (info.t > 76) break;
}
await browser.close();

if (!tiras.length) { console.log('a emenda não apareceu na janela medida'); process.exit(0); }
const PAD = 8;
await sharp({ create: { width: 768 + PAD * 2, height: tiras.length * (432 + PAD) + PAD,
  channels: 4, background: { r: 24, g: 24, b: 28, alpha: 1 } } })
  .composite(tiras.map((t, i) => ({ input: t.buf, left: PAD, top: PAD + i * (432 + PAD) })))
  .png().toFile('scripts/_f4/_folha-emenda-bc3.png');
console.log('\nscripts/_f4/_folha-emenda-bc2.png');
