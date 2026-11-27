// THE SCENERY TOUCHES THE SHIP WHERE IT IS DRAWN, IN THE GAME (27/11, the rebalance, step 2, the steps 3 and 4 of
// `plans/2026-11-27-hitbox-pelo-desenho.md`): an asteroid at three angles, a wreck (the F2) and an F1 rock swept
// around the ship; the game's `tocaNave` against a pixel count written HERE, apart, WITH the rotation. Then the wiring:
// the rock and the F1 spire on the ship cost a life (the rock gets its `bateu`, the sound's mark).
//   node scripts/test-colisao-cenario-jogo.mjs [porta=5173]
import { chromium } from 'playwright';

const PORTA = process.argv[2] ?? '5173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${info !== undefined ? ` → ${JSON.stringify(info)}` : ''}`);
  if (!ok) falhas.push(nome);
};
await page.goto(`http://localhost:${PORTA}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

async function fase(stage) {
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = undefined;
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate((stage) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.registry.set('modeloNave', 'jato');
    g.registry.set('pinturaNave', 'laranja');
    g.scene.start('Game', { stage, ship: 'humana', handling: 'diegetico' });
  }, stage);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.invulnerableUntil = s.time.now + 1e9;
  });
}

/** The sweep, with the pixel count apart (the ship's hull eroded by the game's forgiveness; the piece rotated). */
const varrer = (criar, angulos) =>
  page.evaluate(async ({ criar, angulos }) => {
    const { tocaNave, PERDAO_NAVE_PX } = await import('/src/systems/colisao/colisaoPeloDesenho.ts');
    const s = window.__game.scene.getScene('Game');
    s.physics.world.pause();
    const nave = s.ship;
    const alfa = (key, frame) => {
      const f = s.textures.getFrame(key, frame);
      const cv = document.createElement('canvas');
      cv.width = f.cutWidth;
      cv.height = f.cutHeight;
      const c = cv.getContext('2d');
      c.drawImage(f.source.image, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
      const d = c.getImageData(0, 0, f.cutWidth, f.cutHeight).data;
      return { w: f.cutWidth, h: f.cutHeight, on: (x, y) => x >= 0 && y >= 0 && x < f.cutWidth && y < f.cutHeight && d[(y * f.cutWidth + x) * 4 + 3] >= 128 };
    };
    const quadros = nave.anims.currentAnim.frames.map((f) => alfa(f.textureKey, f.textureFrame));
    const casco = (x, y) => quadros.every((q) => q.on(x, y));
    const er = (n, x, y) => (n === 0 ? casco(x, y) : er(n - 1, x, y) && er(n - 1, x - 1, y) && er(n - 1, x + 1, y) && er(n - 1, x, y - 1) && er(n - 1, x, y + 1));
    // (the ship TILTS in the flap — up to 25° with its speed, `GameScene` — so its pose is rotated too)
    const naveEm = (wx, wy) => {
      const dx = wx - nave.x, dy = wy - nave.y, c = Math.cos(-nave.rotation), sn = Math.sin(-nave.rotation);
      return er(PERDAO_NAVE_PX, Math.floor(dx * c - dy * sn + nave.displayOriginX), Math.floor(dx * sn + dy * c + nave.displayOriginY));
    };
    const out = [];
    for (const ang of angulos) {
      const p = eval(criar)(s);
      p.body.setVelocity?.(0, 0);
      p.setAngle(ang);
      const q = alfa(p.texture.key, p.frame.name);
      const pecaEm = (wx, wy) => {
        const dx = wx - p.x, dy = wy - p.y, c = Math.cos(-p.rotation), sn = Math.sin(-p.rotation);
        let x = (dx * c - dy * sn) / Math.abs(p.scaleX) + p.displayOriginX;
        let y = (dx * sn + dy * c) / Math.abs(p.scaleY) + p.displayOriginY;
        if (p.flipX) x = q.w - x;
        if (p.flipY) y = q.h - y;
        return q.on(Math.floor(x), Math.floor(y));
      };
      const R = p.getBounds();
      const rx = Math.ceil(R.width / 2 + 24), ry = Math.ceil(R.height / 2 + 14);
      let n = 0, difere = 0, toca = 0;
      const exemplo = [];
      for (let dy = -ry; dy <= ry; dy += 2)
        for (let dx = -rx; dx <= rx; dx += 2) {
          p.setPosition(nave.x + dx, nave.y + dy);
          p.body.updateFromGameObject();
          n++;
          const b = p.getBounds();
          let v = false;
          for (let wy = Math.floor(Math.max(b.top, nave.y - 24)); wy < Math.min(b.bottom, nave.y + 24) && !v; wy++)
            for (let wx = Math.floor(Math.max(b.left, nave.x - 24)); wx < Math.min(b.right, nave.x + 24) && !v; wx++)
              if (naveEm(wx + 0.5, wy + 0.5) && pecaEm(wx + 0.5, wy + 0.5)) v = true;
          const jogo = tocaNave(nave, p);
          if (v) toca++;
          if (v !== jogo) { difere++; if (exemplo.length < 3) exemplo.push({ dx, dy, v, jogo }); }
        }
      out.push({ ang, textura: p.texture.key, n, toca, difere, exemplo });
      p.destroy();
    }
    s.physics.world.resume();
    return out;
  }, { criar, angulos });

await fase(2);
for (const [nome, criar, angulos] of [
  ['asteroide', '(s) => s.debris.spawnEm("asteroid", 300, 108)', [0, 37, 71]],
  ['destroço', '(s) => s.debris.spawnEm("destroco", 300, 108)', [0, 23]],
]) for (const r of await varrer(criar, angulos))
  conferir(r.difere === 0 && r.toca > 0, `${nome} a ${r.ang}°: o jogo bate com a conta feita à parte (${r.n} posições, ${r.toca} encostando)`, r.difere ? r : undefined);

// the wiring in the F2: a rock on the ship costs a life and gets its `bateu`
const pedra = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const h = s.debris.spawnEm('asteroid', s.ship.x, s.ship.y);
  h.body.setVelocity(0, 0);
  const v0 = s.lives;
  s.invulnerableUntil = 0;
  await dormir(150);
  return { v0, v1: s.lives, bateu: h.getData('bateu') === true };
});
conferir(pedra.v1 === pedra.v0 - 1 && pedra.bateu, 'a pedra em cima da nave custa uma vida e marca o "bateu"', pedra);

await fase(1);
for (const r of await varrer('(s) => { s.terrain.spawn("spire"); const k = s.terrain.props.getChildren(); return k[k.length - 1]; }', [0]))
  conferir(r.difere === 0 && r.toca > 0, `a rocha da F1: o jogo bate com a conta feita à parte (${r.n} posições, ${r.toca} encostando)`, r.difere ? r : undefined);
const rocha = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  s.terrain.spawn('spire');
  const k = s.terrain.props.getChildren();
  const p = k[k.length - 1];
  p.body.setVelocity?.(0, 0);
  // the spire's origin is its foot: its middle on the ship
  p.setPosition(s.ship.x, s.ship.y + p.displayHeight / 2);
  p.body.reset(p.x, p.y);
  const v0 = s.lives;
  s.invulnerableUntil = 0;
  await dormir(150);
  return { v0, v1: s.lives };
});
conferir(rocha.v1 === rocha.v0 - 1, 'a rocha da F1 em cima da nave custa uma vida', rocha);

conferir(erros.length === 0, 'sem erro na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
