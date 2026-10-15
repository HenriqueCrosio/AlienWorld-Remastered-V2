// 14/10 — THE POLISH SWEEP: plays the whole campaign (menu → F1 → cutscene → F2 → … → F4 → final cutscene → game
// over) frame by frame and photographs it every `PASSO_S` seconds of game time, at full canvas size, so every stretch
// can be looked at. The ship is untouchable and keeps firing; card tables pick the first card; minibosses and bosses
// are filmed for a while, then killed. Nothing in the game is changed.
//   node scripts/_polimento/_varrer-campanha.mjs <out dir> [step s] [first stage]   (npm run dev running)
import fs from 'node:fs';
import { chromium } from 'playwright';

const [OUT = 'varredura', PASSO_ARG = '2', FASE0 = '1'] = process.argv.slice(2);
const PASSO_S = Number(PASSO_ARG);
const QUADRO = 1000 / 60;
const CHEFE_S = 14, MINI_S = 10;
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const log = [];
page.on('pageerror', (e) => log.push(`[ERRO] ${e.message}`));
page.on('console', (m) => m.type() === 'error' && log.push(`[console] ${m.text()}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(2500);

let n = 0;
const foto = async (rotulo) => {
  const c = await page.evaluate(() => {
    const r = window.__game.canvas.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  const nome = `${String(n++).padStart(4, '0')}-${rotulo.replace(/[^\w.-]+/g, '_')}.png`;
  await page.screenshot({ path: `${OUT}/${nome}`, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
  return nome;
};
const estado = () =>
  page.evaluate(() => {
    const g = window.__game;
    const ativas = g.scene.getScenes(true).map((s) => s.scene.key);
    const s = g.scene.getScene('Game');
    const jogo = g.scene.isActive('Game') || g.scene.isPaused('Game');
    return {
      ativas,
      fase: jogo ? s.stage?.id : null,
      t: jogo ? Math.round(s.elapsed * 10) / 10 : null,
      chefe: jogo && !!s.boss && !s.boss.isDead,
      golfinho: jogo && !!s.golfinho,
      aranha: jogo && s.enemies.enemies.getChildren().some((e) => e.active && e.getData('kind') === 'aranha'),
    };
  });

// The menu, then the campaign from stage FASE0.
await foto('menu');
await page.evaluate((fase) => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: fase, ship: 'humana', handling: 'diegetico' });
}, Number(FASE0));
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.evaluate(() => {
  window.__game.loop.sleep();
  window.__passo = { t: window.__game.loop.now };
});
await page.keyboard.down('Space');

// Steps `k` frames; inside the game the ship is untouchable and holds the middle of the screen's left third.
const passo = (k) =>
  page.evaluate(({ k, QUADRO }) => {
    const g = window.__game;
    for (let i = 0; i < k; i++) {
      const s = g.scene.getScene('Game');
      if (g.scene.isActive('Game') && s.ship) {
        // Untouchable without the invulnerability BLINK (that would hide the ship in the photos).
        s.damageShip = () => {};
        let meio = 108;
        if (s.stage?.id === 4 && s.moldura) meio = (s.moldura.superficieTetoEm(70) + s.moldura.superficieChaoEm(70)) / 2;
        const body = s.ship.body;
        s.ship.setPosition(70, s.ship.y + Math.sign(meio - s.ship.y) * Math.min(1.5, Math.abs(meio - s.ship.y)));
        if (body) { body.reset(s.ship.x, s.ship.y); }
      }
      window.__passo.t += QUADRO;
      g.step(window.__passo.t, QUADRO);
    }
  }, { k, QUADRO });

const visto = { chefeDesde: null, miniDesde: null, parado: 0, ultimo: '' };
const k = Math.round(PASSO_S * 60);
for (let i = 0; i < 2000; i++) {
  const e = await estado();
  const onde = e.ativas.join('+');
  const rot = e.fase ? `F${e.fase}-t${e.t}${e.chefe ? '-chefe' : ''}${e.golfinho ? '-golfinho' : ''}${e.aranha ? '-aranha' : ''}${e.ativas.includes('Cartas') ? '-mesa' : ''}` : onde;
  const nome = await foto(rot);
  log.push(`${nome}  ${onde}`);
  if (e.ativas.includes('GameOver')) break;
  // A card table (in a stage or in a cutscene): one photo, then the first card.
  if (e.ativas.includes('Cartas')) {
    await page.keyboard.press('Digit1');
    await passo(30);
    await foto(`${rot}-depois-da-mesa`);
  }
  // Minibosses and bosses: filmed for a while, then killed (the cutscene that follows is what matters).
  if (e.chefe) {
    visto.chefeDesde ??= i;
    if ((i - visto.chefeDesde) * PASSO_S >= CHEFE_S) {
      // As the game does it: `killBoss` only when `damage` says it died (the F4 boss first turns into the Predator).
      await page.evaluate(() => {
        const s = window.__game.scene.getScene('Game');
        if (s.boss.damage(999999)) s.killBoss();
      });
      visto.chefeDesde = null;
    }
  }
  if (e.golfinho || e.aranha) {
    visto.miniDesde ??= i;
    if ((i - visto.miniDesde) * PASSO_S >= MINI_S) {
      await page.evaluate(() => {
        const s = window.__game.scene.getScene('Game');
        if (s.golfinho) s.matarGolfinho();
        for (const a of s.enemies.enemies.getChildren().filter((x) => x.active && x.getData('kind') === 'aranha')) s.ferirInimigo(a, 9999, 'probe');
      });
      visto.miniDesde = null;
    }
  } else visto.miniDesde = null;
  // Stuck in the same place (a choice nobody makes): press the usual keys.
  const chave = `${onde}|${e.t}`;
  visto.parado = chave === visto.ultimo ? visto.parado + 1 : 0;
  visto.ultimo = chave;
  if (visto.parado >= 4) {
    log.push(`  (parado em ${onde}: Digit1 + Enter)`);
    await page.keyboard.press('Digit1');
    await page.keyboard.press('Enter');
  }
  await passo(k);
}
await page.keyboard.up('Space');
fs.writeFileSync(`${OUT}/_log.txt`, log.join('\n'));
await browser.close();
console.log(`${n} fotos em ${OUT}`);
