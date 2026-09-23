// O GUARDIÃO NOVO JOGANDO (B1): parado respirando, com o CORPO (verde) e o ALVO (ciano) desenhados
// por cima, o leque saindo do bico, e a MORTE composta quadro a quadro até o coração surgir.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-guardiao.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'scripts/_f4/_folha-ver-guardiao.png';
const Z = 2; // o viewport é 768×432 = 2× a tela do jogo

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
await page.keyboard.press('G');

const cena = (fn, arg) => page.evaluate(fn, arg);
await page.waitForFunction(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s.boss || s.boss.entering) return false;
  s.lives = 999;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  return true;
}, null, { timeout: 60000, polling: 100 });

const tiras = [];
const foto = async (rotulo, caixas = true) => {
  const info = await cena(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const b = s.boss;
    const r = (body) => ({ x: body.x, y: body.y, w: body.width, h: body.height });
    const balas = s.enemies.enemyBullets.getChildren().filter((o) => o.active).map((o) => [Math.round(o.x), Math.round(o.y)]);
    return {
      forma: b.forma, acao: b.acao, tex: b.sprite.texture.key,
      anim: b.sprite.anims?.currentAnim?.key ?? null, quadro: b.sprite.anims?.currentFrame?.index ?? null,
      // ⚠️ O ALVO SAI DO `core.x/y`, NÃO DO `body.x/y`: o `posicionarCore` faz `body.reset`, que grava
      // o canto SEM o offset do `setSize`. A colisão roda no passo da física, com o corpo já centrado
      // (medido: `body.center` = `core.x/y`), mas lido daqui a caixa sai meio corpo para baixo e direita.
      corpo: r(b.sprite.body),
      alvo: { x: b.core.x - b.core.body.width / 2, y: b.core.y - b.core.body.height / 2, w: b.core.body.width, h: b.core.body.height },
      balas,
    };
  });
  console.log(rotulo.padEnd(20), JSON.stringify({ ...info, balas: info.balas.length }));
  let img = sharp(await page.screenshot());
  if (caixas) {
    const rect = (c, cor) =>
      `<rect x="${c.x * Z}" y="${c.y * Z}" width="${c.w * Z}" height="${c.h * Z}" fill="none" stroke="${cor}" stroke-width="2"/>`;
    const svg = `<svg width="768" height="432">${rect(info.corpo, '#39ff88')}${rect(info.alvo, '#33e6ff')}
      <text x="8" y="424" fill="#fff" font-size="16" font-family="monospace">${rotulo}</text></svg>`;
    img = img.composite([{ input: Buffer.from(svg) }]);
  }
  tiras.push(await img.png().toBuffer());
};

// Parado, em três momentos da respiração (os quadros 6–8 são o miolo apagado).
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].boss.acao === 'flutua', null, { timeout: 30000 });
for (const q of [1, 4, 7]) {
  await page.waitForFunction((a) => window.__game.scene.getScenes(true)[0].boss.sprite.anims?.currentFrame?.index === a, q, { timeout: 10000, polling: 16 });
  await foto(`respira q${q}`);
}
// O leque: espera balas na tela.
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].enemies.enemyBullets.getChildren().some((o) => o.active), null, { timeout: 10000, polling: 16 });
await page.waitForTimeout(60);
await foto('leque do bico');

// A morte composta.
await cena(() => window.__game.scene.getScenes(true)[0].boss.damage(999));
for (const ms of [150, 450, 800, 1050, 1300, 1700]) {
  await page.waitForTimeout(ms - (tiras.__t ?? 0));
  tiras.__t = ms;
  await foto(`morte +${ms}ms`, false);
}
await browser.close();

const PAD = 6, COLS = 3;
const linhas = Math.ceil(tiras.length / COLS);
await sharp({
  create: { width: COLS * (768 + PAD) + PAD, height: linhas * (432 + PAD) + PAD, channels: 4,
    background: { r: 24, g: 24, b: 28, alpha: 1 } },
})
  .composite(tiras.map((buf, i) => ({ input: buf, left: PAD + (i % COLS) * (768 + PAD),
    top: PAD + Math.floor(i / COLS) * (432 + PAD) })))
  .png()
  .toFile(saida);
console.log(saida);
