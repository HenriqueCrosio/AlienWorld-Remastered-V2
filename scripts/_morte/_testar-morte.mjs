// 26/10 — THE SHIP'S DEATH in the real game, on a stepped clock. Each ship dies its own way (no override: the X-Aelo
// breaks up, the Terminus shatters, the Charybdis comes apart in embers), in the F1 with its gravity and in the vacuum:
//   - A LIFE LOST (3 → 2): the hull loss runs in the ship's style (`golpes`), the ship flies on (no `over`), the bite's
//     scar rides on the ship when it moves, and it all goes (canvases removed) by 2 s;
//   - THE LAST LIFE: the ship hides and the death runs (`morte`) in the same style, the slow motion kicks in at its big
//     moment, the world keeps rolling under it, and the GAME OVER screen comes after the whole death (game time within
//     the expected window), with the time back to normal and the death's canvases gone;
//   - the `estiloMorte` override still wins (dev and the films);
//   - no page error.
//   node scripts/_morte/_testar-morte.mjs        (needs `npm run dev` on :5173)
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };
const CASOS = [
  { espera: 'estilhacos', stage: 2, ship: 'humana', modelo: 'a', pintura: 'laranja' },
  { espera: 'ruptura', stage: 2, ship: 'humana', modelo: 'jato', pintura: 'osso' },
  { espera: 'desintegra', stage: 3, ship: 'alienigena', modelo: 'a', pintura: 'laranja' },
  { espera: 'estilhacos', stage: 4, ship: 'humana', modelo: 'a', pintura: 'preta' },
  { espera: 'ruptura', stage: 1, ship: 'humana', modelo: 'jato', pintura: 'laranja' },
  // the override (dev, films)
  { estilo: 'desintegra', espera: 'desintegra', stage: 2, ship: 'humana', modelo: 'a', pintura: 'laranja' },
];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1000);

for (const c of CASOS) {
  const nome = `F${c.stage} · ${c.ship === 'alienigena' ? 'Charybdis' : `${c.modelo === 'jato' ? 'X-Aelo' : 'Terminus'} ${c.pintura}`}${c.estilo ? ` · forçada ${c.estilo}` : ''}`;
  await page.evaluate(() => {
    const g = window.__game;
    g.loop.wake();
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
  });
  await page.evaluate((c) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.registry.set('modeloNave', c.modelo);
    g.registry.set('pinturaNave', c.pintura);
    g.registry.set('estiloMorte', c.estilo);
    g.scene.start('Game', { stage: c.stage, ship: c.ship, handling: 'diegetico' });
  }, c);
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  // untouchable from the start: in the F1 the ship, with no hand on the flap, fell and hit the ground during this
  // real-time wait — a hull loss before the test's own (2 losses, 6 canvases, and `golpes[0]` was the wrong one)
  await page.evaluate(() => { window.__game.scene.getScene('Game').invulnerableUntil = 1e12; });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    const telas = () => g.textures.getTextureKeys().filter((k) => k.startsWith('morte-')).length;
    g.loop.sleep();
    let t = g.loop.now;
    let y = 108;
    const passo = () => {
      if (!s.over) {
        s.ship.setPosition(110, y);
        s.ship.body.setVelocity(0, 0);
      }
      t += 1000 / 60;
      g.step(t, 1000 / 60);
    };
    // the warm-up is untouchable: in the F1 the parked ship was sometimes hit by the scenery before the test's own blow
    // (2 hull losses, 6 canvases — 27/10)
    s.invulnerableUntil = 1e12;
    for (let i = 0; i < 10; i++) passo();

    // A LIFE LOST (any earlier one cleared first: only the test's blow counts)
    for (const v of s.golpes) v.destroy();
    s.golpes = [];
    s.lives = 3;
    s.invulnerableUntil = 0;
    s.damageShip();
    const gp = s.golpes[0];
    const golpe = {
      vidas: s.lives, over: s.over, morte: !!s.morte, n: s.golpes.length, estilo: gp?.o.estilo, golpe: gp?.o.golpe,
      cicatriz: !!gp?.cicatriz, telas: telas(),
    };
    // the most pixels it puts on screen in its first 0.3 s (the scar blinks with the ship's i-frames)
    golpe.desenhou = 0;
    for (let i = 0; i < 18; i++) {
      passo();
      golpe.desenhou = Math.max(golpe.desenhou, gp ? gp.tela.px.reduce((a, v) => a + (v ? 1 : 0), 0) : 0);
    }
    // the ship moves: the scar goes with it
    y = 130;
    passo();
    golpe.segue = gp && gp.casco && Math.abs(gp.casco.y - s.ship.y) < 0.01 && Math.abs(gp.casco.x - s.ship.x) < 0.01;
    for (let i = 0; i < 60 * 2; i++) passo();
    golpe.depois = { n: s.golpes.length, telas: telas(), over: s.over };

    // THE LAST LIFE
    y = 108;
    s.lives = 1;
    s.invulnerableUntil = 0;
    s.damageShip();
    const morre = { over: s.over, morte: !!s.morte, estilo: s.morte?.o.estilo, nave: s.ship.visible, telas: telas() };
    let escalaMin = 1, passos = 0, mundoAnda = false;
    while (g.scene.isActive('Game') && passos < 60 * 8) {
      passo();
      passos++;
      if (g.scene.isActive('Game')) {
        escalaMin = Math.min(escalaMin, s.anims.globalTimeScale);
        if (passos === 30) mundoAnda = s.morte?.t > 0;
      }
    }
    return {
      golpe,
      morre,
      escalaMin,
      segundos: passos / 60,
      gameOver: g.scene.isActive('GameOver'),
      escalaDepois: g.anims.globalTimeScale,
      telasDepois: telas(),
      mundoAnda,
    };
  });
  const gp = r.golpe;
  ok(gp.vidas === 2 && !gp.over && !gp.morte && gp.n === 1 && gp.golpe && gp.cicatriz && gp.telas === 3,
    `${nome}: uma vida perdida solta a lasca (3 telas) e a nave segue voando` +
      ` (vidas ${gp.vidas}, over ${gp.over}, morte ${gp.morte}, golpes ${gp.n}, cicatriz ${gp.cicatriz}, telas ${gp.telas})`);
  ok(gp.estilo === c.espera, `${nome}: a lasca é no estilo da nave (${gp.estilo})`);
  ok(gp.desenhou > 10, `${nome}: a lasca aparece na tela (${gp.desenhou} px)`);
  ok(gp.segue, `${nome}: a cicatriz anda com a nave`);
  ok(gp.depois.n === 0 && gp.depois.telas === 0 && !gp.depois.over, `${nome}: em 2 s a lasca acabou e as telas sumiram`);
  ok(r.morre.over && r.morre.morte && !r.morre.nave && r.morre.telas === 3, `${nome}: o último golpe esconde a nave e começa a morte (3 telas de pixel)`);
  ok(r.morre.estilo === c.espera, `${nome}: a morte é a da nave (${r.morre.estilo})`);
  ok(r.mundoAnda, `${nome}: a morte anda enquanto o jogo está em "over"`);
  ok(r.escalaMin < 0.5, `${nome}: a câmera lenta entra (escala mínima ${r.escalaMin.toFixed(2)})`);
  ok(r.gameOver && r.segundos >= 2 && r.segundos <= 4.5, `${nome}: o GAME OVER vem depois da morte inteira (${r.segundos.toFixed(2)} s de relógio)`);
  ok(r.escalaDepois === 1 && r.telasDepois === 0, `${nome}: o tempo volta ao normal e as telas da morte somem`);
}
ok(erros.length === 0, `sem erro na página (${erros.length}) ${erros.slice(0, 3).join(' | ')}`);
await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
