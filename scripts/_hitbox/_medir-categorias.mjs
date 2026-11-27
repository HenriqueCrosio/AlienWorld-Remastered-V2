// DOES EVERY PIECE NEED THE COLLISION BY THE DRAWING, OR ONLY THE SHIP? (27/11, the rebalance, step 2). Him: "analise
// também se é preciso refazer de todos. Caso fosse apenas o problema da nave, menos trabalho".
// For each kind of piece that still collides by box (the asteroids and wrecks, the F1 rocks and buildings), a sweep
// around the piece, at a few rotations, comparing three rules against the DRAWING-vs-DRAWING truth (`tocaNave`):
//   hoje     — today: the ship's 21×9 box against the piece's Arcade body;
//   soNave   — only the ship fixed: the ship's hull (2 px forgiveness) against the piece's Arcade body;
//   desenho  — both drawings (the truth).
// Counts the spots where each rule disagrees with the truth. Usage: node scripts/_hitbox/_medir-categorias.mjs [porta]
import { chromium } from 'playwright';

const PORTA = process.argv[2] ?? '5173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${PORTA}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

async function fase(stage, modelo, pintura) {
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = undefined;
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate(({ stage, modelo, pintura }) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.registry.set('modeloNave', modelo);
    g.registry.set('pinturaNave', pintura);
    g.scene.start('Game', { stage, ship: 'humana', handling: 'diegetico' });
  }, { stage, modelo, pintura });
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.invulnerableUntil = s.time.now + 1e9;
    s.physics.world.pause();
  });
}

const medir = (pecas) =>
  page.evaluate(async (pecas) => {
    const { tocaNave, mascaraDaNave, poseDe } = await import('/src/systems/colisao/colisaoPeloDesenho.ts');
    const { paraQuadro, desenhado } = await import('/src/systems/colisao/mascaraPixel.ts');
    const s = window.__game.scene.getScene('Game');
    const nave = s.ship;
    const mn = mascaraDaNave(nave);
    const nb = nave.body;
    const R = new Phaser.Geom.Rectangle();
    const out = [];
    for (const { tipo, criar, angulos } of pecas) {
      for (const ang of angulos) {
        const p = eval(criar)(s);
        if (!p) { out.push({ tipo, ang, falhou: true }); continue; }
        p.setAngle(ang);
        let verdade = 0, errHoje = 0, errSoNave = 0, n = 0;
        p.getBounds(R);
        const rx = Math.ceil(R.width / 2 + 26), ry = Math.ceil(R.height / 2 + 16);
        const cx = p.x, cy = p.y;
        for (let dy = -ry; dy <= ry; dy += 2)
          for (let dx = -rx; dx <= rx; dx += 2) {
            p.setPosition(nave.x + dx, nave.y + dy);
            p.body.updateFromGameObject(); // (not `reset`: it parks the body at the frame corner, WITHOUT its offset, until the next physics step)
            const pb = p.body;
            n++;
            const v = tocaNave(nave, p);
            const hoje = nb.right > pb.left && nb.left < pb.right && nb.bottom > pb.top && nb.top < pb.bottom;
            // only the ship fixed: the hull against the piece's box
            let so = false;
            const pose = poseDe(nave);
            const x0 = Math.max(nave.x - 22, pb.left), x1 = Math.min(nave.x + 22, pb.right);
            const y0 = Math.max(nave.y - 13, pb.top), y1 = Math.min(nave.y + 13, pb.bottom);
            for (let wy = Math.floor(y0); wy < y1 && !so; wy++)
              for (let wx = Math.floor(x0); wx < x1 && !so; wx++) {
                const q = paraQuadro(pose, mn, wx + 0.5, wy + 0.5);
                if (desenhado(mn, q.x, q.y)) so = true;
              }
            if (v) verdade++;
            if (hoje !== v) errHoje++;
            if (so !== v) errSoNave++;
          }
        out.push({ tipo, ang, textura: p.texture.key, tela: `${Math.round(R.width)}×${Math.round(R.height)}`, corpo: `${Math.round(p.body.width)}×${Math.round(p.body.height)}`, n, verdade, errHoje, errSoNave });
        p.setPosition(cx, cy);
        p.destroy();
      }
    }
    return out;
  }, pecas);

const relatorio = [];
for (const [modelo, pintura, nome] of [['a', 'laranja', 'Terminus'], ['jato', 'laranja', 'X-Aelo']]) {
  if (!process.env.SO_F1) await fase(2, modelo, pintura);
  if (!process.env.SO_F1) for (const r of await medir([
    { tipo: 'asteroide', criar: '(s) => s.debris.spawnEm("asteroid", 300, 108)', angulos: [0, 30, 60] },
    { tipo: 'destroço', criar: '(s) => s.debris.spawnEm("destroco", 300, 108)', angulos: [0, 30] },
    { tipo: 'rocha do minerador', criar: '(s) => s.debris.spawnEm("mineravel", 300, 108)', angulos: [0, 30] },
  ])) relatorio.push({ nave: nome, ...r });
  await fase(1, modelo, pintura);
  for (const r of await medir([
    { tipo: 'rocha da F1 (spire)', criar: "(s) => { s.terrain.spawn(\"spire\"); const k = s.terrain.props.getChildren(); return k[k.length - 1]; }", angulos: [0] },
    { tipo: 'prédio da F1', criar: "(s) => { s.terrain.spawn(\"building\"); const k = s.terrain.props.getChildren(); return k[k.length - 1]; }", angulos: [0] },
  ])) relatorio.push({ nave: nome, ...r });
}
for (const r of relatorio) {
  if (r.falhou) { console.log(`${r.nave} · ${r.tipo} ${r.ang}°: não nasceu`); continue; }
  const pct = (x) => `${Math.round((100 * x) / Math.max(1, r.verdade))}%`;
  console.log(`${r.nave.padEnd(9)} ${r.tipo.padEnd(20)} ${String(r.ang).padStart(2)}° tela ${r.tela.padEnd(7)} corpo ${r.corpo.padEnd(7)} | encosta ${String(r.verdade).padStart(4)} | erra HOJE ${String(r.errHoje).padStart(4)} (${pct(r.errHoje)}) | erra SÓ A NAVE ${String(r.errSoNave).padStart(4)} (${pct(r.errSoNave)})`);
}
console.log('erros na página:', erros);
await browser.close();
