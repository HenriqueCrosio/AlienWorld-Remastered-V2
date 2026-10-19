// BLOCO E — a mock-up of the new menu INSIDE the running game, without touching src/: the capture hides the old
// diorama, lays his painting in two layers (sky behind, the cut-out city in front) with the approved Leviathan swim
// between them, and moves the real menu text (HD layer) to a proposed layout. Stepped clock as in `_capturar-menu.mjs`.
//   node scripts/_menu/_maquete.mjs <outDir> <ceu.png> <cidade.png> <layout> <escala> [segundos=16]
// layout: 'esquerda' (title in the sky, left) | 'centro' (title in the sky, centred) | 'hoje' (today's positions)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, CEU, CIDADE, LAYOUT = 'esquerda', ESCALA_S = '0.6', SEG_S = '16'] = process.argv.slice(2);
const QUADRO = 1000 / 60, POR_FOTO = 6, SEG = Number(SEG_S);
// The creature: 'nado:<scale>:<tint hex>' = the approved menu swim; 'longe:<width>' = the far silhouette of block D.
const [MODO, A1, A2] = ESCALA_S.includes(':') ? ESCALA_S.split(':') : ['nado', ESCALA_S, '8c9bb6'];
const BICHO = MODO === 'longe' ? { modo: 'longe', largura: Number(A1) } : { modo: 'nado', escala: Number(A1), tint: parseInt(A2 ?? '8c9bb6', 16) };
const NOME = ESCALA_S.replace(/:/g, '-');
fs.mkdirSync(OUT, { recursive: true });
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

// The crossing: from behind the left cloud edge of the window to past the right edge, behind the spires.
const TRAVESSIA = { x0: 190, x1: 440, y: 34 };
// Text positions per layout (game coords; the text objects are centred).
const LAYOUTS = {
  esquerda: { titulo: [104, 22], sub: [104, 38], lista: [104, 52], rot: [192, 172], cond: [183, 194, 205].map((y) => [192, y]) },
  centro: { titulo: [192, 150], sub: [192, 166], lista: [192, 178], rot: null, cond: null },
  hoje: null,
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.getScene('Menu')?.sys?.isActive(), null, { polling: 4, timeout: 30000 });
await page.evaluate(async ({ ceu, cidade }) => {
  const g = window.__game;
  g.loop.sleep();
  const m = g.scene.getScene('Menu');
  const carregar = (k, src) => new Promise((ok) => { m.textures.once(`addtexture-${k}`, ok); m.textures.addBase64(k, src); });
  await carregar('maqCeu', ceu);
  await carregar('maqCidade', cidade);
}, { ceu: b64(CEU), cidade: b64(CIDADE) });
await page.evaluate(({ TRAVESSIA, BICHO, layout, SEG }) => {
  const g = window.__game;
  window.__passo = { t: g.loop.now };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + Math.round(window.__passo.t - t0);
  const m = g.scene.getScene('Menu');
  // Skip the opening so the text is settled, then rebuild the stage.
  m.skipIntro();
  for (const o of m.children.list) o.setVisible(false);
  m.starfield = null;
  m.add.image(0, 0, 'maqCeu').setOrigin(0).setDepth(0);
  m.add.image(0, 0, 'maqCidade').setOrigin(0).setDepth(2);
  let lev;
  if (BICHO.modo === 'longe') {
    // The far silhouette: one baked width, the 3 fps swim clock (Parallax.quadroLeviata).
    lev = m.add.sprite(TRAVESSIA.x0, TRAVESSIA.y, 'leviathanLonge', (BICHO.largura - 28) * 16).setDepth(1);
    const t0 = m.time.now;
    m.events.on('update', () => lev.setFrame((BICHO.largura - 28) * 16 + (Math.floor(((m.time.now - t0) / 1000) * 3) % 16)));
  } else {
    lev = m.add.sprite(TRAVESSIA.x0, TRAVESSIA.y, 'leviathanSwimSheet', 0).setDepth(1).setScale(BICHO.escala).setTint(BICHO.tint);
    lev.play('leviathan-swim');
  }
  m.tweens.add({ targets: lev, x: TRAVESSIA.x1, duration: SEG * 1000, ease: 'Linear' });
  window.__lev = lev;
  // The HD text: hide the dev lines; move the rest to the proposed layout.
  const cenas = [...(window.__gameHD?.scene.getScenes(true) ?? [])];
  for (const c of cenas) for (const o of c.children.list) {
    if (typeof o.text === 'string' && /\[B\] chef|\[I\]\[O\]/.test(o.text)) o.setVisible(false);
  }
  if (layout) {
    const [titulo, sub, , rot, c1, c2, c3] = m.uiTargets.map((u) => u.obj);
    titulo.setPosition(...layout.titulo);
    sub.setPosition(...layout.sub);
    m.itensMenu.forEach((t, i) => t.setPosition(layout.lista[0], layout.lista[1] + i * 10));
    if (layout.rot) rot.setPosition(...layout.rot); else rot.setVisible(false);
    [c1, c2, c3].forEach((c, i) => (layout.cond ? c.setPosition(...layout.cond[i]) : c.setVisible(false)));
  }
}, { TRAVESSIA, BICHO, layout: LAYOUTS[LAYOUT], SEG });

const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { k: c.width / 384, left: c.left, top: c.top };
});
const foto = async () => {
  const f = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  return sharp(f).resize(1152, 648, { kernel: 'nearest' }).png().toBuffer();
};
const quadros = [];
const total = Math.round(SEG * 60);
for (let passo = 0; passo < total; passo += POR_FOTO) {
  await page.evaluate(({ n, QUADRO }) => {
    const g = window.__game;
    for (let k = 0; k < n; k++) { window.__passo.t += QUADRO; g.step(window.__passo.t, QUADRO); }
  }, { n: POR_FOTO, QUADRO });
  const tela = await foto();
  quadros.push(await sharp(tela).resize(768, 432).png().toBuffer());
  if (passo === Math.round(total * 0.3 / POR_FOTO) * POR_FOTO) fs.writeFileSync(path.join(OUT, `maquete-${LAYOUT}-${NOME}.png`), tela);
}
await browser.close();
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(path.join(OUT, `maquete-${LAYOUT}-${NOME}.gif`));
console.log(OUT, LAYOUT, NOME, quadros.length, 'quadros');
