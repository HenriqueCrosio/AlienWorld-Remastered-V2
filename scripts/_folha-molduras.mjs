// Sheet: frame concepts on the REAL table (1152×648 → 1 frame px = 2 screen px, the HD fine pixel), energy recoloured
// per rarity (P1). Usage: node scripts/_folha-molduras.mjs <out.png> <tmpdir> <tag=file.png>...   (npm run dev running)
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, TMP, ...ARGS] = process.argv.slice(2);
const CONCEITOS = ARGS.map((a) => { const [tag, f] = a.split('='); return { tag, f }; });
const P1 = { comum: 0xa8b0bc, incomum: 0x4fc85a, rara: 0x3f7bff, epica: 0xa45cff };
const RARIDADES = ['comum', 'incomum', 'rara', 'epica'];
const MESA = ['WPN_001', 'WPN_002', 'DEF_003', 'EFF_006'];

/** The blue energy → the rarity colour, keeping each pixel's brightness. */
async function recolorir(file, cor) {
  // trim the generator's transparent margin: the nine-slice stretches the frame to the card
  const cortada = await sharp(file).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
  const { data, info } = await sharp(cortada).raw().toBuffer({ resolveWithObject: true });
  const alvo = [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255];
  const out = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    if (data[i + 3] === 0 || !(b > r + 35 && b > 90)) continue;
    const k = Math.min(1.35, b / 200);
    out[i] = Math.min(255, Math.round(alvo[0] * k)); out[i + 1] = Math.min(255, Math.round(alvo[1] * k)); out[i + 2] = Math.min(255, Math.round(alvo[2] * k));
  }
  const png = await sharp(out, { raw: info }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
await page.evaluate(async (P1) => {
  const m = await import('/src/cartas.ts');
  Object.assign(m.COR_RARIDADE, P1);
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []); g.registry.set('tierNave', 1);
  g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
}, P1);
await page.waitForTimeout(4000);
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = s.time.now + 1e7; s.scene.pause(); });

const fotos = [];
for (const [ci, c] of CONCEITOS.entries()) {
  const tex = {};
  for (const r of RARIDADES) tex[r] = await recolorir(c.f, P1[r]);
  await page.evaluate(async ({ tex, ci }) => {
    const hd = window.__gameHD;
    await Promise.all(Object.entries(tex).map(([r, uri]) => new Promise((ok) => {
      const key = `moldura-${ci}-${r}`;
      if (hd.textures.exists(key)) return ok();
      hd.textures.once(`addtexture-${key}`, ok);
      hd.textures.addBase64(key, uri);
    })));
  }, { tex, ci });
  await page.evaluate(({ mesa }) => {
    const hd = window.__gameHD;
    if (hd.scene.getScene('Cartas').sys.isActive()) hd.scene.stop('Cartas');
    window.__game.scene.stop('Cartas');
    window.__game.scene.getScene('Game').scene.launch('Cartas', { opcoes: mesa, titulo: 'SUPRIMENTO ENCONTRADO', onEscolha: () => {} });
  }, { mesa: MESA });
  await page.waitForTimeout(1200);
  await page.evaluate(({ ci, rar }) => {
    const c = window.__gameHD.scene.getScene('Cartas');
    c.cartas.forEach((k, i) => {
      const r = rar[i];
      k.list[0].setVisible(false); // the flat provisional card body
      // NINE-SLICE: 16px corners stay exact, the edges stretch to 108×144 texels = the 72×96 card at the fine pixel
      const img = c.add.nineslice(0, 0, `moldura-${ci}-${r}`, undefined, 108, 144, 16, 16, 16, 16).setScale(72 / 108);
      k.addAt(img, 0);
    });
  }, { ci, rar: RARIDADES });
  await page.waitForTimeout(300);
  const f = `${TMP}/moldura-${ci}.png`;
  await page.screenshot({ path: f, clip: { x: 18 * 3, y: 40 * 3, width: 348 * 3, height: 126 * 3 } });
  fotos.push(f);
}
await browser.close();

const texto = (s, w, size = 24, cor = '#ffb040') =>
  Buffer.from(`<svg width="${w}" height="${size + 12}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${size}" font-family="Consolas, monospace" font-size="${size}" fill="${cor}">${s}</text></svg>`);
const CW = 348 * 3, CH = 126 * 3, G = 30, CRU = 144 * 2;
const W = CW * 2 + G * 3, linhas = Math.ceil(fotos.length / 2);
const H = 70 + linhas * (CH + 50 + G) + 60 + CRU + G;
const comp = [{ input: texto('A MOLDURA — conceitos na mesa real (1152×648 · paleta P1 · ícones e faixas ainda provisórios)', W, 26, '#e0e6f0'), left: G, top: 18 }];
fotos.forEach((f, i) => {
  const x = G + (i % 2) * (CW + G), y = 70 + Math.floor(i / 2) * (CH + 50 + G);
  comp.push({ input: texto(CONCEITOS[i].tag, CW, 22), left: x, top: y });
  comp.push({ input: f, left: x, top: y + 40 });
});
const yc = 70 + linhas * (CH + 50 + G);
comp.push({ input: texto('as molduras cruas, 2× (como saíram do PixelLab)', W, 22, '#8a93a6'), left: G, top: yc });
for (const [i, c] of CONCEITOS.entries())
  comp.push({ input: await sharp(c.f).resize(216, 288, { kernel: 'nearest' }).toBuffer(), left: G + i * (216 + 40), top: yc + 50 });
await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(OUT);
console.log(OUT, W, H);
