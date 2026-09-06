// A EMENDA, QUADRO A QUADRO: o mergulho do rabo e o nascimento do casco, na hora exata.
// Janela padrão t=44..49 — quando a nadadeira limpa o rodapé, o toco fica e o chão cresce dele.
//
// ⚠️ Polling de intervalo FIXO e teto de iterações. A primeira versão dormia
// `(alvo − t) × 700ms`, o que assume que o headless roda em tempo real — ele não roda, e quando
// a cena não avançava o laço ficava mudo para sempre. Sonda que pode travar em silêncio não é
// sonda.
import { chromium } from 'playwright';
import sharp from 'sharp';

const DE = Number(process.argv[2] ?? 44);
const ATE = Number(process.argv[3] ?? 49);
const PASSO = Number(process.argv[4] ?? 0.6);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.lives !== undefined) s.lives = 9;
    const r = s.children?.list.find((o) => o.texture && o.texture.key === 'raboLeviata');
    return {
      cena: s.scene.key,
      t: s.elapsed ?? 0,
      rabo: r ? { x: Math.round(r.x), y: Math.round(r.y), a: Number(r.angle.toFixed(1)), d: r.depth, al: Number(r.alpha.toFixed(2)) } : null,
      casco: Number((s.parallax?.cascoReveal ?? 0).toFixed(2)),
    };
  });

const tiros = [];
const zooms = [];
let voltas = 0;
for (let alvo = DE; alvo <= ATE + 0.001; alvo += PASSO) {
  let e = await estado();
  while (e.t < alvo) {
    if (++voltas > 400) throw new Error(`travou em t=${e.t.toFixed(1)} (cena ${e.cena}) esperando ${alvo}`);
    await page.waitForTimeout(400);
    e = await estado();
  }
  console.log(`t=${e.t.toFixed(1)}  casco=${e.casco}  rabo=${JSON.stringify(e.rabo)}`);
  const bruto = await page.screenshot();
  tiros.push(await sharp(bruto).resize(384 * 2, 216 * 2, { kernel: 'nearest' }).toBuffer());
  // E a QUINA INFERIOR DIREITA ampliada: é lá que a emenda acontece, e num tiro de tela inteira
  // ela tem 60px de altura. Sem o zoom o olho não julga o que está julgando.
  zooms.push(await sharp(bruto).extract({ left: 192, top: 116, width: 192, height: 100 }).resize(192 * 4, 100 * 4, { kernel: 'nearest' }).toBuffer());
}

const COLS = 2;
const linhas = Math.ceil(tiros.length / COLS);
await sharp({ create: { width: COLS * (384 * 2 + 4), height: linhas * (216 * 2 + 4), channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } } })
  .composite(tiros.map((b, i) => ({ input: b, left: (i % COLS) * (384 * 2 + 4), top: Math.floor(i / COLS) * (216 * 2 + 4) })))
  .png()
  .toFile('scripts/_f3/ver-emenda.png');
console.log('\nscripts/_f3/ver-emenda.png');
await sharp({ create: { width: 192 * 4, height: zooms.length * (100 * 4 + 4), channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } } })
  .composite(zooms.map((b, i) => ({ input: b, left: 0, top: i * (100 * 4 + 4) })))
  .png()
  .toFile('scripts/_f3/ver-emenda-zoom.png');
console.log('+ scripts/_f3/ver-emenda-zoom.png (quina inferior direita, x4)');

await browser.close();
