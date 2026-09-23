// O PREDADOR NAS ÂNCORAS (B3, seção 2 do design): a pose da luta (quadro 8 do giro, brilho corrigido) na
// arena de verdade, em 0,47, nas quatro superfícies candidatas — o chão como veio, o teto espelhado, e a
// borda direita girada 90° nas duas leituras possíveis (frente para baixo / frente para cima). Zero geração:
// só o motor desenhando a arte que já existe. O guardião é escondido e congelado.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_mock-predador-ancoras.mjs [saida.png]
import fs from 'node:fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'docs/superpowers/folhas/2026-09-16/predador-ancoras.png';
const POSE = 'assets/raw/furia-predador-giro/corrigido/8.png';
const dataUrl = `data:image/png;base64,${fs.readFileSync(POSE).toString('base64')}`;

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

await page.waitForFunction(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s.boss || s.boss.entering) return false;
  s.lives = 999;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  return true;
}, null, { timeout: 60000, polling: 100 });

// Esconde e congela o guardião; limpa as balas; carrega a pose.
await page.evaluate((url) => {
  const s = window.__game.scene.getScenes(true)[0];
  s.boss.update = () => {};
  s.boss.sprite.setVisible(false);
  s.boss.sprite.body.enable = false;
  s.boss.core.body.enable = false;
  s.textures.addBase64('mockPredador', url);
}, dataUrl);
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].textures.exists('mockPredador'), null, { timeout: 10000 });

const VARIANTES = [
  { rotulo: 'chao', flipY: false, angle: 0, flipX: false },
  { rotulo: 'teto (espelhado)', flipY: true, angle: 0, flipX: false },
  { rotulo: 'borda direita (frente p/ baixo)', flipY: false, angle: -90, flipX: false },
  { rotulo: 'borda direita (frente p/ cima)', flipY: false, angle: -90, flipX: true },
];

const tiras = [];
for (const v of VARIANTES) {
  const caixa = await page.evaluate((v) => {
    const s = window.__game.scene.getScenes(true)[0];
    s.enemies.enemyBullets.getChildren().forEach((o) => o.active && o.setActive(false).setVisible(false));
    s.ship.setPosition(64, 108);
    s.ship.body.reset(64, 108);
    s.__mock?.destroy();
    const img = s.add.image(0, 0, 'mockPredador').setScale(0.47).setDepth(30);
    img.setFlip(v.flipX, v.flipY).setAngle(v.angle);
    // Encosta pela CAIXA desenhada (o quadro de 256² tem folga transparente, medida: x=22..214, y=4..253).
    const e = 0.47;
    const cx = 118 - 128, cy = 128.5 - 128; // centro do conteúdo a partir do centro do quadro
    const w = 192 * e, h = 249 * e;
    const GROUND_Y = 206, TETO_Y = 10, DIR = 384;
    if (v.angle === 0 && !v.flipY) img.setPosition(300 - cx * e, GROUND_Y - h / 2 - cy * e);
    else if (v.flipY) img.setPosition(300 - cx * e, TETO_Y + h / 2 + cy * e);
    else img.setPosition(DIR - h / 2, 108);
    s.__mock = img;
    const b = img.getBounds();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  }, v);
  await page.waitForTimeout(120);
  console.log(v.rotulo.padEnd(34), JSON.stringify(caixa));
  const svg = `<svg width="768" height="432"><text x="8" y="424" fill="#fff" font-size="16" font-family="monospace" stroke="#000" stroke-width="3" paint-order="stroke">${v.rotulo}</text></svg>`;
  tiras.push(await sharp(await page.screenshot()).composite([{ input: Buffer.from(svg) }]).png().toBuffer());
}
await browser.close();

const P = 8;
await sharp({ create: { width: P + 2 * (768 + P), height: P + 2 * (432 + P), channels: 4, background: '#231c24' } })
  .composite(tiras.map((t, i) => ({ input: t, left: P + (i % 2) * (768 + P), top: P + Math.floor(i / 2) * (432 + P) })))
  .png()
  .toFile(saida);
console.log(saida);
