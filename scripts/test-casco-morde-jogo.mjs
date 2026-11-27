// THE WALLS BITE THE HULL, NOT THE BOX, IN THE GAME (27/11, the rebalance, step 2 — `cascoMorde`). Him: "quero que o
// jogador entenda que encostar dá dano, fica feio se ele começar a perceber que pode 'afundar' a asa no cenário sem
// tomar". A floor with the borders' own rule (it bites when the query's bottom goes `MORDIDA` = 3 px past it —
// `Moldura.morde`, `cavernaF1`): set right at the HULL's edge it bites; 1 px further out it does not — wherever the
// old 21×9 box was (it let the wing sink, or, tilted, hit without touching). For the three ships, flat and tilted.
//   node scripts/test-casco-morde-jogo.mjs [porta=5173]
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
}

for (const [nome, ship, modelo, pintura] of [['Terminus', 'humana', 'a', 'laranja'], ['X-Aelo', 'humana', 'jato', 'laranja'], ['Charybdis', 'alienigena', 'a', 'laranja']]) {
  await fase(ship, modelo, pintura);
  const r = await page.evaluate(async () => {
    const { cascoMorde, faixasDaNave } = await import('/src/systems/colisao/colisaoPeloDesenho.ts');
    const s = window.__game.scene.getScene('Game');
    s.physics.world.pause();
    const nave = s.ship;
    const MORDIDA = 3;
    const out = [];
    for (const ang of [0, 20]) {
      nave.setAngle(ang);
      nave.body.updateFromGameObject();
      const { caixa } = faixasDaNave(nave);
      const b = nave.body;
      // the floor right where only the hull's lowest strip bites
      const chao = caixa.y1 - MORDIDA;
      const chaoMorde = (_e, _d, _t, base) => base - MORDIDA >= chao;
      const chao1 = chao + 1;
      const chaoMorde1 = (_e, _d, _t, base) => base - MORDIDA >= chao1;
      const teto = caixa.y0 + MORDIDA;
      const tetoMorde = (_e, _d, topo) => topo + MORDIDA <= teto;
      const teto1 = teto - 1;
      const tetoMorde1 = (_e, _d, topo) => topo + MORDIDA <= teto1;
      out.push({
        ang,
        // + = the hull reaches past the box (the box let the wing sink); − = the box reaches past the hull (the box hit
        // without touching — the box does not tilt with the ship)
        abaixo: Math.round((caixa.y1 - b.bottom) * 10) / 10,
        acima: Math.round((b.top - caixa.y0) * 10) / 10,
        chaoCasco: cascoMorde(nave, chaoMorde),
        chao1Casco: cascoMorde(nave, chaoMorde1),
        tetoCasco: cascoMorde(nave, tetoMorde),
        teto1Casco: cascoMorde(nave, tetoMorde1),
      });
    }
    nave.setAngle(0);
    s.physics.world.resume();
    return out;
  });
  for (const x of r) {
    conferir(x.chaoCasco && !x.chao1Casco, `${nome} a ${x.ang}°: o chão morde na borda do casco e não 1 px abaixo (o casco passa da caixa ${x.abaixo} px)`, x);
    conferir(x.tetoCasco && !x.teto1Casco, `${nome} a ${x.ang}°: o teto morde na borda do casco e não 1 px acima (o casco passa da caixa ${x.acima} px)`, x);
  }
}

conferir(erros.length === 0, 'sem erro na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
