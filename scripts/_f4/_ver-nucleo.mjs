// Captura a passagem duto -> nucleo jogando em tempo real, e o nucleo ja com o chefao.
//   node cap-transicao.mjs <saida.png> [inicio] [paradas...]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2];
const inicio = Number(process.argv[3] ?? 102);
const PARADAS = process.argv.slice(4).map(Number);
const alvos = PARADAS.length ? PARADAS : [105, 107, 108.6, 109.2, 110, 112, 118, 125];

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(700);

await page.evaluate((t) => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 999;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  if (s.golfinho) s.encerrarGolfinho(false);
  s.elapsed = t;
  s.director.skipTo(t);
  s.aplicaCorredorEMoldura(t);
}, inicio);

const tiras = [];
for (const alvo of alvos) {
  await page.waitForFunction(
    (a) => window.__game.scene.getScenes(true)[0].elapsed >= a,
    alvo,
    { timeout: 120000, polling: 16 },
  );
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const seg = s.children.list.filter((o) => o.name === 'faixaChao' || o.name === 'faixaTeto');
    const fundo = s.children.list.filter(
      (o) => o.texture && ['orgao', 'maquinario', 'orgaoAnimSheet', 'maquinarioAnimSheet', 'costela', 'derelict', 'f4Ponte', 'f4Ganglio'].includes(o.texture.key) && o.visible && o.alpha > 0 && o.x > -50 && o.x < 434,
    );
    const cont = {};
    for (const o of fundo) cont[o.texture.key] = (cont[o.texture.key] ?? 0) + 1;
    return {
      t: s.elapsed.toFixed(2),
      texturas: seg.map((o) => `${o.texture.key}@${Math.round(o.x)}`),
      esp: Math.round(s.moldura.espessura),
      duto: s.moldura.duto,
      boss: !!s.boss,
      fundo: cont,
    };
  });
  console.log(JSON.stringify(info));
  tiras.push(await page.screenshot());
}
await browser.close();

const PAD = 6;
const cols = 2;
const rows = Math.ceil(tiras.length / cols);
const comps = tiras.map((buf, i) => ({
  input: buf,
  left: PAD + (i % cols) * (768 + PAD),
  top: PAD + Math.floor(i / cols) * (432 + PAD),
}));
await sharp({
  create: {
    width: cols * (768 + PAD) + PAD,
    height: rows * (432 + PAD) + PAD,
    channels: 4,
    background: { r: 24, g: 24, b: 28, alpha: 1 },
  },
})
  .composite(comps)
  .png()
  .toFile(saida);
console.log(saida);
