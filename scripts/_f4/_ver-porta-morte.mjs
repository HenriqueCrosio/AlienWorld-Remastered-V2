// A MORTE DA PORTA, JOGANDO — os dois tempos que nenhum assert julga: a porta viva respirando,
// a LASCA no quadro em que ela parte, e a cena depois do estouro.
//
//   node scripts/_f4/_ver-porta-morte.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 384, height: 216 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  if (s.golfinho) s.encerrarGolfinho(false);
  s.elapsed = 70; s.director.skipTo(70); s.aplicaCorredorEMoldura(70);
});

// Espera a porta entrar de fato na tela — nascer não basta, ela nasce fora dela.
for (let i = 0; i < 400; i++) {
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    const p = s.terrain.props.getChildren().find((o) => o.active && o.getData('kind') === 'porta');
    return p ? Math.round(p.x) : null;
  });
  if (r !== null && r < 300) break;
  await page.waitForTimeout(100);
}

const tiras = [];
const foto = async (nome) => tiras.push({ nome, buf: await page.screenshot() });
await foto('1 · viva, respirando');

await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const p = s.terrain.props.getChildren().find((o) => o.active && o.getData('kind') === 'porta');
  if (p) s.matarPorta(p);
});
await page.waitForTimeout(60);
await foto('2 · a LASCA — a luz morreu, a peça partiu');
await page.waitForTimeout(140);
await foto('3 · o estouro');
await page.waitForTimeout(300);
// ⚠️ NÃO TENTO FOTOGRAFAR A NAVE ATRAVESSANDO. Tentei, e o controlador a puxa de volta no quadro
// seguinte: a foto saiu sem a nave e sem prova. Quem prova que a lasca não cobra vida é a
// `probe-f4-moldura` (o par `cobra`/`atravessa`, com inimigos varridos e a mordida da parede
// conferida). Aqui se julga o que só o olho julga: que a lasca FICA e rola com o duto.
await foto('4 · a lasca FICA e rola com o mundo — o duto guarda o que foi aberto');
await browser.close();

const Z = 2, PAD = 8, ROT = 22;
const largura = 384 * Z + PAD * 2;
const altura = tiras.length * (216 * Z + ROT + PAD) + PAD;
const comps = [];
for (let i = 0; i < tiras.length; i++) {
  comps.push({ input: await sharp(tiras[i].buf).resize(384 * Z, 216 * Z, { kernel: 'nearest' }).png().toBuffer(),
    left: PAD, top: PAD + i * (216 * Z + ROT + PAD) + ROT });
}
const svg = `<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">${
  tiras.map((t, i) => `<text x="${PAD}" y="${PAD + i * (216 * Z + ROT + PAD) + 16}" font-family="Segoe UI, sans-serif" font-size="14" font-weight="600" fill="#f0c674">${t.nome}</text>`).join('')
}</svg>`;
await sharp({ create: { width: largura, height: altura, channels: 4, background: { r: 22, g: 22, b: 26, alpha: 1 } } })
  .composite([...comps, { input: Buffer.from(svg), left: 0, top: 0 }])
  .png().toFile('scripts/_f4/_folha-porta-morte3.png');
console.log('scripts/_f4/_folha-porta-morte3.png');
