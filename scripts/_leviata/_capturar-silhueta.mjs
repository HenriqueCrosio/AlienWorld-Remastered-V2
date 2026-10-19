// BLOCO D · the distant silhouette candidates (`_silhueta.mjs`) inside the REAL game, paused: the Leviathan's texture is
// swapped for each candidate's swim sheet (16 × 133×60, frames added by hand), with its own tint and alpha — today's
// tint/alpha for `menu` (the reference), no tint and a higher alpha for the baked-distance ones. Today's art first.
//   · F2 far (setApproach 0) and near (setApproach 1), the scale ×116/133 (so the size on screen is today's);
//   · F3 (the nebula: 1.15 of 116 → 1.0);
// For each: a still (whole frame ×2) and a zoomed GIF of the 16 swim frames, then one 2×2 GIF per place.
// Needs `npm run dev` on :5173.
//   node scripts/_leviata/_capturar-silhueta.mjs <silhuetaDir> [fps=6]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const [DIR = 'docs/superpowers/folhas/2026-10-19/leviata/silhueta', FPS_S = '6'] = process.argv.slice(2);
const FPS = Number(FPS_S);
const CANDS = ['menu', 'arolava', 'aro', 'lava'];
/** tint and alpha (far → near) per candidate; `menu` keeps today's. */
const LOOK = {
  hoje: { tint: 0x2a3352, a: [0.45, 0.8], f3: 0.5 },
  menu: { tint: 0x2a3352, a: [0.45, 0.8], f3: 0.5 },
  arolava: { tint: 0xffffff, a: [0.75, 1], f3: 0.85 },
  aro: { tint: 0xffffff, a: [0.75, 1], f3: 0.85 },
  lava: { tint: 0xffffff, a: [0.75, 1], f3: 0.85 },
};
const N = 16, W = 133, H = 60;
const imgDir = path.join(DIR, 'img');
fs.mkdirSync(imgDir, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

const foto = () => page.evaluate(() => new Promise((res) => window.__game.renderer.snapshot((img) => {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  res(c.toDataURL('image/png'));
}))).then((u) => Buffer.from(u.split(',')[1], 'base64'));
const ampliar = async (buf, k) => { const m = await sharp(buf).metadata(); return sharp(buf).resize(m.width * k, m.height * k, { kernel: 'nearest' }).png().toBuffer(); };

async function abrir(tecla) {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.keyboard.press(tecla);
  await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) >= 1, null, { polling: 16, timeout: 30000 });
  await page.evaluate(async ({ texs, W, H, N }) => {
    const s = window.__game.scene.getScene('Game');
    s.scene.pause();
    for (const g of [s.enemies?.enemies, s.debris?.hazards]) g?.getChildren().forEach((o) => o.setVisible(false));
    for (const [k, url] of texs) {
      if (s.textures.exists(k)) continue;
      await new Promise((res) => { s.textures.once(`addtexture-${k}`, res); s.textures.addBase64(k, url); });
      const t = s.textures.get(k);
      for (let i = 0; i < N; i++) t.add(i, 0, i * W, 0, W, H);
    }
  }, { texs: CANDS.map((c) => [`sil-${c}`, `data:image/png;base64,${fs.readFileSync(path.join(DIR, c, 'sheet.png')).toString('base64')}`]), W, H, N });
}

/** Puts a candidate (or today's art) on the silhouette, at approach t (F2) or as F3 has it. */
const vestir = (nome, t, f3) => page.evaluate(({ nome, t, f3, look }) => {
  const p = window.__game.scene.getScene('Game').parallax;
  const l = p.leviathan;
  if (!f3) p.setApproach(t);
  else l.setPosition(310, 66).setScale(1.15);
  const base = l.getData('escalaHoje') ?? null;
  const sx = f3 ? 1.15 : l.scaleX;
  if (nome === 'hoje') l.setTexture('leviathan').setScale(sx);
  else l.setTexture(`sil-${nome}`, 0).setScale((sx * 116) / 133);
  l.setTint(look.tint);
  l.setAlpha(f3 ? look.f3 : look.a[0] + (look.a[1] - look.a[0]) * t);
  return { x: l.x, y: l.y, w: l.displayWidth, base };
}, { nome, t, f3, look: LOOK[nome] });
const quadro = (nome, i) => page.evaluate(({ nome, i }) => {
  const l = window.__game.scene.getScene('Game').parallax.leviathan;
  if (nome !== 'hoje') l.setFrame(i);
}, { nome, i });

const LUGARES = [
  { id: 'f2-longe', tecla: 'V', t: 0, f3: false, caixa: { left: 250, top: 42, width: 110, height: 60 }, z: 4 },
  { id: 'f2-perto', tecla: 'V', t: 1, f3: false, caixa: { left: 166, top: 44, width: 168, height: 84 }, z: 3 },
  { id: 'f3', tecla: 'M', t: 1, f3: true, caixa: { left: 216, top: 24, width: 168, height: 84 }, z: 3 },
];
let aberta = null;
for (const lugar of LUGARES) {
  if (aberta !== lugar.tecla) { await abrir(lugar.tecla); aberta = lugar.tecla; }
  const paineis = [];
  for (const nome of ['hoje', ...CANDS]) {
    const info = await vestir(nome, lugar.t, lugar.f3);
    await new Promise((r) => setTimeout(r, 200));
    const inteira = await foto();
    fs.writeFileSync(path.join(imgDir, `${nome}-${lugar.id}.png`), await ampliar(inteira, 2));
    if (nome === 'hoje') { console.log(lugar.id, 'hoje em', info); continue; }
    const qs = [];
    for (let i = 0; i < N; i++) {
      await quadro(nome, i);
      await new Promise((r) => setTimeout(r, 60));
      qs.push(await ampliar(await sharp(await foto()).extract(lugar.caixa).png().toBuffer(), lugar.z));
    }
    paineis.push(qs);
    console.log(lugar.id, nome);
  }
  // 2×2 GIF: menu | arolava / aro | lava
  const cw = lugar.caixa.width * lugar.z, ch = lugar.caixa.height * lugar.z, g = 6;
  const grade = [];
  for (let i = 0; i < N; i++) {
    grade.push(await sharp({ create: { width: cw * 2 + g, height: ch * 2 + g, channels: 4, background: '#0d0f15' } })
      .composite(paineis.map((qs, k) => ({ input: qs[i], left: (k % 2) * (cw + g), top: Math.floor(k / 2) * (ch + g) })))
      .png().toBuffer());
  }
  await sharp(grade, { join: { animated: true } }).gif({ delay: Array(N).fill(Math.round(1000 / FPS)), loop: 0 })
    .toFile(path.join(DIR, `nado-${lugar.id}.gif`));
}
await browser.close();
