// Final frame concept: M2 (a2) with M3's (b1) bottom energy strip set into M2's foot tab. Renders it on the REAL table.
// Usage: node scripts/_folha-final.mjs <m2.png> <m3.png> <outdir> <tmpdir>   (npm run dev running)
import { chromium } from 'playwright';
import sharp from 'sharp';

const [M2, M3, OUTDIR, TMP] = process.argv.slice(2);
const P1 = { comum: 0xa8b0bc, incomum: 0x4fc85a, rara: 0x3f7bff, epica: 0xa45cff };
const RARIDADES = ['comum', 'incomum', 'rara', 'epica'];
const MESA = ['WPN_001', 'WPN_002', 'DEF_003', 'EFF_006'];

const raw = async (f) => sharp(f).ensureAlpha().trim({ threshold: 1 }).raw().toBuffer({ resolveWithObject: true });
const a = await raw(M2); // 105×141
const b = await raw(M3); // 87×108
const W = a.info.width;
const get = (img, x, y) => { const i = (y * img.info.width + x) * 4; return img.data.subarray(i, i + 4); };
const set = (img, x, y, p) => { const i = (y * img.info.width + x) * 4; img.data.set(p, i); };

// M3's strip: rows 100–102, x 28..58 (31 px — the glow only; x 24–27 is M3's housing). Keep 4-px ends, shorten the middle → 25 px, into M2's tab x 40..64, y 136..138.
const FONTE = { x0: 28, x1: 58, y0: 100 }, ALVO = { x0: 40, y0: 136, w: 25 };
const ponta = 4, meio = ALVO.w - 2 * ponta;
const colFonte = (i) => (i < ponta ? FONTE.x0 + i
  : i >= ALVO.w - ponta ? FONTE.x1 - (ALVO.w - 1 - i)
  : FONTE.x0 + ponta + Math.round(((i - ponta) / (meio - 1)) * (FONTE.x1 - FONTE.x0 - 2 * ponta)));
for (let r = 0; r < 3; r++)
  for (let i = 0; i < ALVO.w; i++) set(a, ALVO.x0 + i, ALVO.y0 + r, get(b, colFonte(i), FONTE.y0 + r));
const base = await sharp(a.data, { raw: a.info }).png().toBuffer();
await sharp(base).toFile(`${OUTDIR}/moldura-final-base.png`);

async function recolorir(buf, cor) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const alvo = [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255];
  const out = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    const [r, , bl] = [data[i], data[i + 1], data[i + 2]];
    if (data[i + 3] === 0 || !(bl > r + 35 && bl > 90)) continue;
    const k = Math.min(1.35, bl / 200);
    for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, Math.round(alvo[c] * k));
  }
  return sharp(out, { raw: info }).png().toBuffer();
}
const porRaridade = {};
for (const r of RARIDADES) porRaridade[r] = await recolorir(base, P1[r]);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const fotos = [];
for (const [VW, VH] of [[1152, 648], [1920, 1080]]) {
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  await page.evaluate(async (P1) => {
    const m = await import('/src/cartas.ts');
    Object.assign(m.COR_RARIDADE, P1);
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    g.registry.set('cartas', ['EFF_004']); g.registry.set('tierNave', 1);
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
  }, P1);
  await page.waitForTimeout(4000);
  const tex = Object.fromEntries(RARIDADES.map((r) => [r, `data:image/png;base64,${porRaridade[r].toString('base64')}`]));
  await page.evaluate(async (tex) => {
    const hd = window.__gameHD;
    await Promise.all(Object.entries(tex).map(([r, uri]) => new Promise((ok) => {
      hd.textures.once(`addtexture-final-${r}`, ok);
      hd.textures.addBase64(`final-${r}`, uri);
    })));
    const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = s.time.now + 1e7;
    s.scene.launch('Cartas', { opcoes: ['WPN_001', 'WPN_002', 'DEF_003', 'EFF_006'], titulo: 'SUPRIMENTO ENCONTRADO', onEscolha: () => {} });
  }, tex);
  await page.waitForTimeout(1200);
  await page.evaluate(({ rar, P1 }) => {
    const c = window.__gameHD.scene.getScene('Cartas');
    const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;
    c.cartas.forEach((k, i) => {
      const r = rar[i];
      const [corpo, faixaNome, nome, icone, plaqueta, raridade, efeito] = k.list;
      corpo.setVisible(false); faixaNome.setVisible(false); plaqueta.setVisible(false);
      // one frame texel = one FINE pixel (round(2s/3) screen px): scale pf/s, and the slices stretch to fill 72×96
      const s = window.__gameHD.canvas.width / 384, pf = Math.max(1, Math.round((2 * s) / 3)), e = pf / s;
      k.addAt(c.add.nineslice(0, 0, `final-${r}`, undefined, Math.round(72 / e), Math.round(96 / e), 16, 16, 16, 16).setScale(e), 0);
      nome.setY(-41);                                   // in M2's top name slot
      icone.setY(-15);                                  // in the visor
      raridade.setY(5).setColor(hex(P1[r]));            // the rarity word, in its colour, at the visor foot
      efeito.setY(29);                                  // in M2's bottom plate
    });
  }, { rar: RARIDADES, P1 });
  await page.waitForTimeout(300);
  const k = VH / 216;
  const f = `${TMP}/final-${VW}.png`;
  await page.screenshot({ path: f, clip: { x: 18 * k, y: 36 * k, width: 348 * k, height: 132 * k } });
  fotos.push({ f, VW, w: Math.round(348 * k), h: Math.round(132 * k) });
  await page.close();
}
await browser.close();

const texto = (s, w, size = 24, cor = '#ffb040') =>
  Buffer.from(`<svg width="${w}" height="${size + 12}" xmlns="http://www.w3.org/2000/svg"><text x="0" y="${size}" font-family="Consolas, monospace" font-size="${size}" fill="${cor}">${s}</text></svg>`);
const G = 30, big = fotos[1], small = fotos[0];
const SW = big.w + G * 2;
const cruY = 70 + small.h + 50 + G;
const bigY = cruY + 50 + 141 * 3 + G * 2;
const SH = bigY + 50 + big.h + G;
const comp = [
  { input: texto('A MOLDURA FINAL (conceito) — M2 + o feixe do pé da M3 · paleta P1 · a raridade mora na moldura', SW, 26, '#e0e6f0'), left: G, top: 18 },
  { input: texto('1152×648 (pixel fino = 2px de tela)', SW, 22), left: G, top: 70 - 4 },
  { input: small.f, left: G, top: 70 + 36 },
  { input: texto('a moldura crua nas quatro raridades, 3×', SW, 22, '#8a93a6'), left: G, top: cruY },
];
for (const [i, r] of RARIDADES.entries())
  comp.push({ input: await sharp(porRaridade[r]).resize(W * 3, 141 * 3, { kernel: 'nearest' }).toBuffer(), left: G + i * (W * 3 + 40), top: cruY + 44 });
comp.push({ input: texto('1920×1080 (pixel fino = 3px de tela) — a mesma carta, as 9 fatias no tamanho certo', SW, 22), left: G, top: bigY - 4 });
comp.push({ input: big.f, left: G, top: bigY + 36 });
await sharp({ create: { width: SW, height: SH + 40, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(`${OUTDIR}/moldura-final.png`);
console.log(`${OUTDIR}/moldura-final.png`, SW, SH);
