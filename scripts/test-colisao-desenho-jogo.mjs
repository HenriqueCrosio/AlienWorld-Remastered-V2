// THE SHIP TOUCHED WHERE IT IS DRAWN, IN THE GAME (27/11, the rebalance, step 2 — `src/systems/colisao/`).
// For the three ship models: a drone swept over a grid around the ship; at every spot the game's `tocaNave` is compared
// with a pixel count written HERE, apart (the ship's hull = what all its frames share, eroded by the game's forgiveness; the drone's frame),
// and with today's rule (the two Arcade boxes). Then the wiring: a drone and an enemy shot on the ship cost a life and
// the shot goes back to the pool.
//   node scripts/test-colisao-desenho-jogo.mjs [porta=5173]   (the forgiveness is read from the game: 2 px since 27/11)
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

async function fase(ship, modelo, pintura) {
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = undefined;
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate(({ ship, modelo, pintura }) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.registry.set('modeloNave', modelo);
    g.registry.set('pinturaNave', pintura);
    g.scene.start('Game', { stage: 2, ship, handling: 'diegetico' });
  }, { ship, modelo, pintura });
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    s.invulnerableUntil = s.time.now + 1e9;
  });
}

const NAVES = [
  { nome: 'Terminus', ship: 'humana', modelo: 'a', pintura: 'laranja' },
  { nome: 'X-Aelo', ship: 'humana', modelo: 'jato', pintura: 'laranja' },
  { nome: 'Charybdis', ship: 'alienigena', modelo: 'a', pintura: 'laranja' },
];

for (const n of NAVES) {
  await fase(n.ship, n.modelo, n.pintura);
  const r = await page.evaluate(async () => {
    const { tocaNave, PERDAO_NAVE_PX } = await import('/src/systems/colisao/colisaoPeloDesenho.ts');
    const s = window.__game.scene.getScene('Game');
    const nave = s.ship;
    // ── the pixel count written apart ──
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
    const anim = nave.anims.currentAnim;
    const nada = anim.key.includes('nado');
    const quadros = nada ? [alfa(nave.texture.key, nave.frame.name)] : anim.frames.map((f) => alfa(f.textureKey, f.textureFrame));
    const W = quadros[0].w, H = quadros[0].h;
    const casco = (x, y) => quadros.every((q) => q.on(x, y));
    // the forgiveness the game uses (2 px since 27/11), eroded here with the 4 neighbours, n times
    const erodido = (n, x, y) => (n === 0 ? casco(x, y) : erodido(n - 1, x, y) && erodido(n - 1, x - 1, y) && erodido(n - 1, x + 1, y) && erodido(n - 1, x, y - 1) && erodido(n - 1, x, y + 1));
    const cascoErodido = (x, y) => erodido(PERDAO_NAVE_PX, x, y);
    const naveEm = (wx, wy) => cascoErodido(Math.floor((wx - nave.x) / nave.scaleX + nave.displayOriginX), Math.floor((wy - nave.y) / nave.scaleY + nave.displayOriginY));

    s.enemies.spawn('drone', nave.y, nave.x);
    const kids = s.enemies.enemies.getChildren();
    const d = kids[kids.length - 1];
    d.body.setVelocity(0, 0);
    const qd = alfa(d.texture.key, d.frame.name);
    const droneEm = (wx, wy) => {
      let x = (wx - d.x) / Math.abs(d.scaleX) + d.displayOriginX;
      if (d.flipX) x = qd.w - x;
      return qd.on(Math.floor(x), Math.floor((wy - d.y) / Math.abs(d.scaleY) + d.displayOriginY));
    };
    const verdade = () => {
      const x0 = Math.floor(Math.max(nave.x - W, d.x - qd.w)), x1 = Math.ceil(Math.min(nave.x + W, d.x + qd.w));
      const y0 = Math.floor(Math.max(nave.y - H, d.y - qd.h)), y1 = Math.ceil(Math.min(nave.y + H, d.y + qd.h));
      for (let wy = y0; wy < y1; wy++) for (let wx = x0; wx < x1; wx++) if (naveEm(wx + 0.5, wy + 0.5) && droneEm(wx + 0.5, wy + 0.5)) return true;
      return false;
    };
    const nb = nave.body;
    let difere = 0, hojeSemDesenho = 0, desenhoSemHoje = 0, tocouDesenho = 0, posicoes = 0;
    const exemplo = [];
    for (let dy = -24; dy <= 24; dy++)
      for (let dx = -40; dx <= 40; dx++) {
        d.setPosition(nave.x + dx, nave.y + dy);
        d.body.updateFromGameObject(); // (not `reset`: it parks the body at the frame corner, WITHOUT its offset, until the next physics step)
        posicoes++;
        const novo = tocaNave(nave, d);
        const v = verdade();
        const db = d.body;
        const hoje = nb.right > db.left && nb.left < db.right && nb.bottom > db.top && nb.top < db.bottom;
        if (novo !== v) { difere++; if (exemplo.length < 3) exemplo.push({ dx, dy, novo, v }); }
        if (v) tocouDesenho++;
        if (hoje && !v) hojeSemDesenho++;
        if (v && !hoje) desenhoSemHoje++;
      }
    d.destroy();
    return { perdao: PERDAO_NAVE_PX, anim: anim.key, posicoes, difere, exemplo, tocouDesenho, hojeSemDesenho, desenhoSemHoje, blend: d.blendMode };
  });
  conferir(r.difere === 0, `${n.nome}: o jogo bate com a conta feita à parte em todas as ${r.posicoes} posições`, r);
  console.log(`     ${n.nome} (${r.anim}): desenho encosta em ${r.tocouDesenho} · a regra de HOJE dava golpe sem desenho em ${r.hojeSemDesenho} · e NÃO dava golpe com o desenho encostando em ${r.desenhoSemHoje}`);
}

// ── the wiring: a drone and a shot on the ship cost a life; the shot goes back to the pool ──
await fase('humana', 'a', 'laranja');
const ligacao = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const nave = s.ship;
  const v0 = s.lives;
  s.enemies.spawn('drone', nave.y, nave.x);
  const kids = s.enemies.enemies.getChildren();
  const d = kids[kids.length - 1];
  d.body.setVelocity(0, 0);
  d.setPosition(nave.x, nave.y);
  s.invulnerableUntil = 0;
  await dormir(150);
  const v1 = s.lives;
  d.destroy();
  s.invulnerableUntil = 0;
  await dormir(50);
  const b = s.enemies.enemyBullets.get(nave.x, nave.y, 'bolt2');
  b.setActive(true).setVisible(true).setPosition(nave.x, nave.y);
  b.body.enable = true;
  b.body.reset(nave.x, nave.y);
  b.body.setVelocity(0, 0);
  await dormir(150);
  return { v0, v1, v2: s.lives, tiroAtivo: b.active };
});
conferir(ligacao.v1 === ligacao.v0 - 1, 'o drone em cima da nave custa uma vida', ligacao);
conferir(ligacao.v2 === ligacao.v1 - 1 && !ligacao.tiroAtivo, 'o tiro em cima da nave custa uma vida e volta ao pool', ligacao);

conferir(erros.length === 0, 'sem erro na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
