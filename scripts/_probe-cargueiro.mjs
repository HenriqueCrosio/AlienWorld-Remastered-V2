// O CARGUEIRO, e a única pergunta que importa nele: o drone nasce de dentro da BAIA?
//
// `updateCarrier` cospe o drone em `e.y + Between(4, 14)` — relativo ao CENTRO do sprite, medido
// contra a arte antiga. Arte nova com a baia em outra altura faria o drone brotar do meio do
// casco (ou do vácuo ao lado dele), e nada no código acusaria: o número continua válido, só
// deixou de apontar para o lugar certo do desenho.
//
// Por isso este script não julga por screenshot: ele mede onde os drones apareceram, em pixels
// relativos ao centro do cargueiro, e compara com a faixa que a arte desenha como baia.
//
// uso: node scripts/_probe-cargueiro.mjs <saida.png>
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('V'); // fase 2
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  // Um só, no meio da tela: dois cargueiros embaralhariam de quem é cada drone.
  s.enemies.spawn('cargueiro', 110, 300);
});

// `spawnRate` 1.5s — 4s garante alguns drones no ar sem o cargueiro ter saído da tela.
await page.waitForTimeout(4000);

const medida = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const vivos = (s.enemies.enemies.getChildren() ?? []).filter((o) => o.active);
  const carg = vivos.find((o) => o.getData('kind') === 'cargueiro');
  if (!carg) return { erro: 'cargueiro já saiu da tela' };

  const drones = vivos
    .filter((o) => o.getData('kind') === 'drone')
    .map((d) => ({
      dx: Number((d.x - carg.x).toFixed(1)),
      dy: Number((d.y - carg.y).toFixed(1)),
    }));

  return {
    cargueiro: {
      x: Number(carg.x.toFixed(1)),
      y: Number(carg.y.toFixed(1)),
      emTela: `${carg.displayWidth.toFixed(1)}x${carg.displayHeight.toFixed(1)}`,
      hitbox: `${carg.body.width.toFixed(1)}x${carg.body.height.toFixed(1)}`,
      textura: carg.texture.key,
      quadro: carg.anims.currentFrame?.index ?? null,
    },
    drones,
  };
});

console.log(JSON.stringify(medida, null, 2));

const cru = await page.screenshot();
await sharp(cru).toFile(process.argv[2]);

// Zoom no cargueiro: a 66px numa tela de 384, a baia não se julga no screenshot cheio.
if (medida.cargueiro) {
  const m = await sharp(cru).metadata();
  const escala = m.width / 384;
  const lado = 110;
  const left = Math.max(0, Math.round(medida.cargueiro.x * escala - (lado * escala) / 2));
  const top = Math.max(0, Math.round(medida.cargueiro.y * escala - (lado * escala) / 2));
  const w = Math.min(Math.round(lado * escala), m.width - left);
  const h = Math.min(Math.round(lado * escala), m.height - top);
  await sharp(cru)
    .extract({ left, top, width: w, height: h })
    .resize(w * 2, h * 2, { kernel: 'nearest' })
    .toFile(process.argv[2].replace('.png', '-zoom.png'));
}

await browser.close();
