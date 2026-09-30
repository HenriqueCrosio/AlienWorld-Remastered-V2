// Sheet: rarity palettes on the REAL table (1152×648), four cards (one per rarity), icons in their real colours.
// Usage: node scripts/_folha-raridade.mjs <out.png> <tmpdir>   (with `npm run dev` running)
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, TMP] = process.argv.slice(2);
const PALETAS = [
  { tag: 'P1 · CONVENÇÃO (WoW/Borderlands): cinza · verde · azul · roxo', cores: { comum: 0xa8b0bc, incomum: 0x4fc85a, rara: 0x3f7bff, epica: 0xa45cff } },
  { tag: 'P2 · CONVENÇÃO, TOPO DOURADO (Fortnite/Destiny): cinza · verde · azul · laranja', cores: { comum: 0xa8b0bc, incomum: 0x4fc85a, rara: 0x3f7bff, epica: 0xff9a1a } },
  { tag: 'P3 · A SUA IDEIA (Balatro): azul claro · verde · roxo · laranja', cores: { comum: 0x7fb8ff, incomum: 0x4fc85a, rara: 0xa45cff, epica: 0xff9a1a } },
  { tag: 'HOJE: cinza · ciano · roxo · laranja', cores: { comum: 0x8a93a6, incomum: 0x3ee0f0, rara: 0xb07cff, epica: 0xff8c1a } },
];
const MESA = ['WPN_001', 'WPN_002', 'DEF_003', 'EFF_006']; // comum · incomum · rara · épica

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(6000);
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []); g.registry.set('tierNave', 1);
  g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
});
await page.waitForTimeout(4000);
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = s.time.now + 1e7; s.scene.pause(); });

const fotos = [];
for (const [i, p] of PALETAS.entries()) {
  await page.evaluate(async ({ cores, mesa }) => {
    const m = await import('/src/cartas.ts');
    Object.assign(m.COR_RARIDADE, cores);
    const hd = window.__gameHD;
    if (hd.scene.getScene('Cartas').sys.isActive()) hd.scene.stop('Cartas');
    window.__game.scene.stop('Cartas');
    window.__game.scene.getScene('Game').scene.launch('Cartas', { opcoes: mesa, titulo: 'SUPRIMENTO ENCONTRADO', onEscolha: () => {} });
  }, { cores: p.cores, mesa: MESA });
  await page.waitForTimeout(1200);
  const f = `${TMP}/raridade-${i}.png`;
  // world x 18..366, y 40..166
  await page.screenshot({ path: f, clip: { x: 18 * 3, y: 40 * 3, width: 348 * 3, height: 126 * 3 } });
  fotos.push(f);
}
await browser.close();

const texto = (s, w, size = 24, cor = '#ffb040') =>
  Buffer.from(`<svg width="${w}" height="${size + 12}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${size}" font-family="Consolas, monospace" font-size="${size}" fill="${cor}">${s}</text></svg>`);
const CW = 348 * 3, CH = 126 * 3, G = 30;
const W = CW * 2 + G * 3, H = 70 + 2 * (CH + 50 + G) + 10;
const comp = [{ input: texto('AS CORES DA RARIDADE — na mesa real (1152×648), uma carta de cada: comum · incomum · rara · épica', W, 26, '#e0e6f0'), left: G, top: 18 }];
fotos.forEach((f, i) => {
  const x = G + (i % 2) * (CW + G), y = 70 + Math.floor(i / 2) * (CH + 50 + G);
  comp.push({ input: texto(PALETAS[i].tag, CW, 22), left: x, top: y });
  comp.push({ input: f, left: x, top: y + 40 });
});
await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(OUT);
console.log(OUT, W, H);
