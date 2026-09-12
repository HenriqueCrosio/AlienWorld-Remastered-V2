// FATIA 7 · A ÁGUA DA ARENA — a captura que julga o enchimento e o submerso.
//
// ⚠️ O QUE SÓ A IMAGEM DECIDE: se o véu tapa a troca de pintura sem virar tela azul chapada, e se
// a nave, o golfinho e os tiros continuam legíveis debaixo d'água. Os asserts ficam na
// probe-f4-agua; aqui é o olho.
//
// Uso: npm run dev noutro terminal, depois
//   node scripts/_f4/_ver-agua.mjs scripts/_f4/_agua.png
// ⚠️ scripts/_f4/*.png é ignorado pelo git.
import { chromium } from 'playwright';
const SAIDA = process.argv[2] ?? 'scripts/_f4/_agua.png';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(800);

// Salta para a beira da arena, como faz a probe-f4-golfinho.
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  setInterval(() => { s.lives = 99; s.invulnerableUntil = Number.MAX_SAFE_INTEGER; }, 200);
  s.elapsed = 39.6;
  s.director.skipTo(39.6);
  s.aplicaCorredorEMoldura(39.6);
  s.hazardRate = 0;
  s.propRate = 0;
});

const estado = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return {
    t: +(s.elapsed ?? 0).toFixed(2),
    agua: s.agua?.estadoAtual ?? null,
    cobrindo: s.agua?.cobrindo ?? null,
    pintura: s.parallax?.pinturaAtual ?? null,
    golfinho: s.golfinho ? s.golfinho.fase ?? 'vivo' : null,
  };
});

// Amostra densa durante o enchimento: é lá que o casamento com o roteiro acontece.
// ⚠️ Os instantes são ACUMULADOS desde o salto — a espera é o delta entre um e o anterior.
let anterior = 0;
for (const ms of [400, 700, 1000, 1250, 1500, 1900, 2700, 4500, 7500]) {
  await page.waitForTimeout(Math.max(16, ms - anterior));
  anterior = ms;
  const e = await estado();
  console.log(String(ms).padStart(5), JSON.stringify(e));
  await page.screenshot({ path: SAIDA.replace('.png', `-${String(ms).padStart(5, '0')}.png`) });
}

// A DRENAGEM: mata o golfinho e olha a água descer.
await page.evaluate(() => window.__game.scene.getScenes(true)[0].matarGolfinho());
for (const ms of [200, 600, 1100]) {
  await page.waitForTimeout(ms === 200 ? 200 : 400);
  const e = await estado();
  console.log('drena', String(ms).padStart(5), JSON.stringify(e));
  await page.screenshot({ path: SAIDA.replace('.png', `-drena${String(ms).padStart(5, '0')}.png`) });
}

await browser.close();
