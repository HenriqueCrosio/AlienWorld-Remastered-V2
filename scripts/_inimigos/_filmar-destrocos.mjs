// 26/10 — THE ENEMIES' DEBRIS, filmed in the real game on a stepped clock (60 steps/s, a photo every 2 = 30 fps): one
// cell per (enemy, variation), each its own run — the same enemy, at the same place, with the same luck, only the
// variation changes (`hoje` = today's death, for the comparison). The hits go through the scene's REAL damage road
// (`ferirInimigo`: the HP thresholds bite the hull on the shot's side) and the kill through it too (`matarInimigo`).
// The world is cleared and the enemies' own update frozen (they stay put to be seen); the animations keep playing.
// Output: a grid video (rows = enemies, columns = variations) and a still per cell at chosen seconds.
//   node scripts/_inimigos/_filmar-destrocos.mjs <out.webm> <grupo> [--manter]
//   grupos: comuns (F2: drone, batedor, canhoneira, kamikaze, cargueiro) · f1 (F1: drone, batedor, canhoneira — the air)
//           · vivos (água-viva F3, pupa e mosca F4) · elites · mini (a aranha) · chefe (a Capitânia) · jogo (a wave, as in play)
//           · torre · serpente · nucleo (guardião e predador) · golfinho — the whole fight, in the practice arena (27/10)
// (with `npm run dev` running; do not touch src/ or .html while it films — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { webm } from '../_menu/_webm.mjs';

const args = process.argv.slice(2);
const MANTER = args.includes('--manter');
const [OUT, GRUPO = 'comuns'] = args.filter((a) => !a.startsWith('--'));
const ROTULO = 24;

/** a hit that crosses one threshold of `frac` (of the full HP) without killing */
const golpes = (hp, fracs, de = 0.45, passo = 0.6) => fracs.map((f, i) => ({ t: de + i * passo, dano: hp * f + 0.01 }));
const GRUPOS = {
  comuns: {
    cols: ['hoje', 'A1', 'A2', 'A3'],
    cel: { w: 150, h: 96 },
    linhas: [
      { rotulo: 'drone', stage: 2, kind: 'drone', golpes: golpes(2, [0.5]), mata: 1.3, ate: 2.9 },
      { rotulo: 'batedor (F2)', stage: 2, kind: 'batedor', golpes: golpes(2, [0.5]), mata: 1.3, ate: 2.9 },
      { rotulo: 'canhoneira (F2)', stage: 2, kind: 'canhoneira', golpes: golpes(6, [0.4, 0.3]), mata: 1.8, ate: 3.4 },
      { rotulo: 'kamikaze', stage: 2, kind: 'kamikaze', golpes: golpes(2, [0.5]), mata: 1.3, ate: 2.9 },
      { rotulo: 'cargueiro', stage: 2, kind: 'cargueiro', golpes: golpes(24, [0.25, 0.25, 0.25], 0.4, 0.5), mata: 2.1, ate: 3.8 },
    ],
  },
  // (27/10, him: the shards were thrown up before falling — now they fall at once, `cairJa`; `escolha` = what plays)
  f1: {
    cols: ['hoje', 'escolha'],
    cel: { w: 150, h: 110 },
    linhas: [
      { rotulo: 'drone (F1, ar)', stage: 1, kind: 'drone', golpes: golpes(2, [0.5]), mata: 1.3, ate: 3.0 },
      { rotulo: 'batedor (F1)', stage: 1, kind: 'batedor', golpes: golpes(2, [0.5]), mata: 1.3, ate: 3.0 },
      { rotulo: 'canhoneira (F1)', stage: 1, kind: 'canhoneira', golpes: golpes(6, [0.4, 0.3]), mata: 1.8, ate: 3.4 },
    ],
  },
  vivos: {
    cols: ['hoje', 'A1', 'A2', 'A3'],
    cel: { w: 120, h: 96 },
    linhas: [
      { rotulo: 'água-viva (luz)', stage: 3, kind: 'aguaViva', golpes: golpes(10, [0.4, 0.3]), mata: 1.8, ate: 3.2 },
      { rotulo: 'pupa (carne)', stage: 4, kind: 'pupa', golpes: [], mata: 0.8, ate: 2.2 },
      { rotulo: 'mosca (carne)', stage: 4, kind: 'mosca', golpes: [], mata: 0.8, ate: 2.2 },
    ],
  },
  elites: {
    cols: ['hoje', 'B1', 'B2'],
    cel: { w: 170, h: 120 },
    linhas: [
      { rotulo: 'drone minerador (metal)', stage: 2, kind: 'droneMineracao', golpes: golpes(10, [0.26, 0.25, 0.25]), mata: 2.4, ate: 4.2 },
      { rotulo: 'sentinela (metal)', stage: 2, kind: 'sentinela', golpes: golpes(18, [0.26, 0.25, 0.25]), mata: 2.4, ate: 4.2 },
      { rotulo: 'lula (biomec)', stage: 3, kind: 'cacador', golpes: golpes(10, [0.26, 0.25, 0.25]), mata: 2.4, ate: 4.2 },
      { rotulo: 'larva (biomec)', stage: 4, kind: 'larva', golpes: golpes(12, [0.26, 0.25, 0.25]), mata: 2.4, ate: 4.2 },
      { rotulo: 'tubo (carne)', stage: 4, kind: 'tubo', golpes: golpes(10, [0.26, 0.25, 0.25]), mata: 2.4, ate: 4.2 },
    ],
  },
  mini: {
    cols: ['hoje', 'C1', 'C2'],
    cel: { w: 200, h: 130 },
    linhas: [{ rotulo: 'aranha (F3)', stage: 3, kind: 'aranha', golpes: golpes(50, [0.21, 0.2, 0.2, 0.2], 0.4, 0.55), mata: 2.8, ate: 5.6, y: 'aranha' }],
  },
  // AS IN PLAY: a F2 wave flying for real, shot down one hit at a time (a hit every 0.1 s on the front-most enemy, from
  // the ship's side), with the camera shake on — today's deaths next to the recommended ones.
  jogo: {
    cols: ['hoje', 'A1'],
    cel: { w: 384, h: 216 },
    linhas: [{
      rotulo: 'F2: uma onda abatida, como no jogo',
      stage: 2,
      onda: [
        { kind: 'drone', y: 60, x: 400 }, { kind: 'drone', y: 92, x: 420 }, { kind: 'drone', y: 124, x: 440 }, { kind: 'drone', y: 156, x: 460 },
        { kind: 'batedor', y: 80, x: 470 }, { kind: 'batedor', y: 140, x: 490 }, { kind: 'canhoneira', y: 108, x: 430 },
        { kind: 'drone', y: 70, x: 540 }, { kind: 'drone', y: 110, x: 560 }, { kind: 'drone', y: 150, x: 580 },
      ],
      golpes: [],
      mata: 99,
      ate: 7,
    }],
  },
  chefe: {
    cols: ['hoje', 'D1'],
    cel: { w: 240, h: 150 },
    linhas: [{ rotulo: 'Capitânia (F2)', stage: 2, chefe: true, golpes: golpes(150, [0.16, 0.15, 0.15, 0.15, 0.15, 0.13], 0.4, 0.55), mata: 4.0, ate: 7.6 }],
  },
  // 27/10 — THE MARKS (his idea: each hit takes 1 px, the big pieces only near the death): a stream of shots from the
  // left (`fluxo`: that many hits to kill, one every 0.1 s, at varied heights), through the scene's real damage road.
  // `escolha` = what the game plays (his choice of 27/10: the commons' mix included). The spider lives (`vivo`: its
  // own update on — she walks while she is shot); the others keep still, their animations playing.
  marcas: {
    cols: ['hoje', 'escolha'],
    cel: { w: 200, h: 130 },
    linhas: [
      { rotulo: 'canhoneira (F2) · A3', stage: 2, kind: 'canhoneira', fluxo: 12, golpes: [], mata: 99, ate: 4.4, depois: 2.2 },
      { rotulo: 'cargueiro · A3', stage: 2, kind: 'cargueiro', fluxo: 24, golpes: [], mata: 99, ate: 5.6, depois: 2.4 },
      { rotulo: 'drone minerador (metal) · B1', stage: 2, kind: 'droneMineracao', fluxo: 24, golpes: [], mata: 99, ate: 5.2, depois: 2 },
      { rotulo: 'sentinela (metal) · B1', stage: 2, kind: 'sentinela', fluxo: 30, golpes: [], mata: 99, ate: 5.8, depois: 2 },
      { rotulo: 'lula (biomec) · B1', stage: 3, kind: 'cacador', fluxo: 24, golpes: [], mata: 99, ate: 5.2, depois: 2 },
      { rotulo: 'larva (biomec) · B1', stage: 4, kind: 'larva', fluxo: 24, golpes: [], mata: 99, ate: 5.2, depois: 2 },
      { rotulo: 'tubo (carne) · B1', stage: 4, kind: 'tubo', fluxo: 24, golpes: [], mata: 99, ate: 5.2, depois: 2 },
      { rotulo: 'aranha (F3), viva · C1', stage: 3, kind: 'aranha', vivo: true, fluxo: 40, golpes: [], mata: 99, ate: 7.5, depois: 2.6, y: 'aranha' },
    ],
  },
  // 27/10 — THE REST OF THE BOSSES, the whole fight: the practice mode's arena (1 s before the boss), the boss living
  // (moving, its own states; its shots cleared), and a steady stream of damage (`dps`, a hit every 0.1 s while it can
  // be hurt: the transitions are immune), each hit with its mark. The film ends `depois` seconds after the kill.
  capitania: {
    cols: ['hoje', 'escolha'],
    cel: { w: 384, h: 216 },
    linhas: [{ rotulo: 'Capitânia (F2): as marcas, os pedaços perto da morte, e a D1', stage: 2, treino: true, dps: 30, depois: 4, ate: 30, golpes: [], mata: 99 }],
  },
  // 27/10 — STEP 2, THE BELT: the asteroid breaking like a rock (his pick among the three, the PixelLab explosion over
  // it, as today), and the pieces that only lose pixels. The ship fires for real from `fogoEm` on; the piece is held in
  // place, still turning. `hoje` = today: no mark, and the explosion alone.
  // (27/10, his choice: R2 on the big rocks, R3 on the small ones, the pieces gone sooner — `escolha` plays it)
  rocha: {
    cols: ['hoje', 'escolha'],
    cel: { w: 110, h: 90 },
    zoom: 3,
    linhas: [
      { rotulo: 'asteroide grande (F2)', stage: 2, peca: 'asteroid', escala: 1.8, fogoEm: 0.3, golpes: [], mata: 99, ate: 3.4 },
      { rotulo: 'asteroide pequeno (F2)', stage: 2, peca: 'asteroid', escala: 0.9, fogoEm: 0.3, golpes: [], mata: 99, ate: 3.0 },
    ],
  },
  pecas: {
    cols: ['hoje', 'escolha'],
    cel: { w: 140, h: 100 },
    zoom: 3,
    linhas: [
      { rotulo: 'destroço (F2): indestrutível, perde 1 px a cada 2 tiros', stage: 2, peca: 'destroco', escala: 1.4, fogoEm: 0.2, golpes: [], mata: 99, ate: 7 },
      { rotulo: 'destroço engolido (F4)', stage: 4, peca: 'destroco', fogoEm: 0.2, golpes: [], mata: 99, ate: 7 },
      { rotulo: 'mina sensora (F2)', stage: 2, peca: 'sensor', fogoEm: 0.2, golpes: [], mata: 99, ate: 2.4 },
      { rotulo: 'asteroide minerável (F2)', stage: 2, peca: 'mineravel', fogoEm: 0.2, golpes: [], mata: 99, ate: 6 },
    ],
  },
  // 27/10 — STEP 3, THE BULLET THROUGH THE HOLE: the ship holds one height and fires at a wreck for 25 s, at the
  // phase's own rate — the notch deepens, the bullets go into it, and (if the plate is thin there) out the far side
  brecha: {
    cols: ['hoje', 'escolha'],
    cel: { w: 150, h: 90 },
    zoom: 3,
    linhas: [
      { rotulo: 'destroço (F2), a nave parada numa altura por 25 s', stage: 2, peca: 'destroco', escala: 0.9, fixo: 0.18, fogoEm: 0.2, golpes: [], mata: 99, ate: 25 },
    ],
  },
  // (27/10, 2ª rodada: cropped round the boss at 3×, and the extra damage down from 30 to 8 a second — the real bullets
  // add 10 — so the fight lasts and the marks pile up where they can be seen)
  torre: {
    cols: ['hoje', 'escolha'],
    cel: { w: 230, h: 160 },
    zoom: 3,
    linhas: [{ rotulo: 'Torre (F1): as marcas na borda, os pedaços perto da morte, e a morte aprovada', stage: 1, treino: true, dps: 8, depois: 4, ate: 30, golpes: [], mata: 99 }],
  },
  serpente: {
    cols: ['hoje', 'escolha'],
    cel: { w: 230, h: 160 },
    zoom: 3,
    linhas: [{ rotulo: 'Serpente (F3): as marcas na cabeça viva, os pedaços na fusão perto da morte, e a D1', stage: 3, treino: true, dps: 8, depois: 4, ate: 45, golpes: [], mata: 99 }],
  },
  nucleo: {
    cols: ['hoje', 'escolha'],
    cel: { w: 230, h: 160 },
    zoom: 3,
    linhas: [{ rotulo: 'Guardião e Predador (F4): as marcas na borda, os pedaços nos tubos, e as mortes aprovadas', stage: 4, treino: true, dps: 8, depois: 5, ate: 50, golpes: [], mata: 99 }],
  },
  golfinho: {
    cols: ['hoje', 'escolha'],
    cel: { w: 384, h: 216 },
    linhas: [{ rotulo: 'golfinho (F4): os pixels voam sem furar, e a C1', stage: 4, golfinho: true, dps: 20, depois: 4, ate: 34, golpes: [], mata: 99 }],
  },
};
const G = GRUPOS[GRUPO];
// (the bosses' films are cropped round the boss and drawn at 3×: a mark of 1 px is too small at 2× of the whole screen)
const ZOOM = G.zoom ?? 2;
if (!G) throw new Error(`grupo desconhecido: ${GRUPO}`);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);
const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { k: c.width / 384, left: c.left, top: c.top };
});

const CX = 192, CY = 104;

async function gravar(linha, variante) {
  await page.evaluate(() => {
    const g = window.__game;
    g.loop.wake();
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
  });
  await page.waitForFunction(() => !window.__game.scene.isActive('Game'));
  await page.evaluate(({ linha, variante }) => {
    const g = window.__game;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.registry.set('modeloNave', 'a');
    g.registry.set('pinturaNave', 'laranja');
    g.registry.set('estiloMorte', undefined);
    g.registry.set('sementeMorte', 20261026);
    // (`escolha` = what the game plays: no override, the kinds' and classes' own — the commons' mix included)
    g.registry.set('destrocosVariantes', variante === 'escolha' ? undefined : { comum: variante, elite: variante, mini: variante, chefe: variante });
    // (the scene object is reused: the wait below must see THIS run's cards, not the last one's)
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = null;
    g.scene.start('Game', { stage: linha.stage, ship: 'humana', handling: 'diegetico', practice: !!linha.treino });
  }, { linha, variante });
  await page.waitForFunction(() => window.__game.scene.getScene('Game')?.cartas);
  // the practice run starts past the mid-phase table's second: it opens at once and pauses the phase — closed, and off
  await page.evaluate(() => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    s.cartas.abrirMesa = () => {};
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
  });
  await page.waitForFunction(() => window.__game.scene.isActive('Game'));
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const g = window.__game;
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
  });
  await page.evaluate(({ linha, variante, CX, CY }) => {
    const s = window.__game.scene.getScene('Game');
    // (the practice run keeps its director: it is 1 s from the boss, and nothing else is left before it)
    if (!linha.treino) s.director.update = () => [];
    // the film goes on past the kill (the victory would leave the scene)
    s.victory = () => {};
    s.enemies.enemies.clear(true, true);
    s.enemies.enemyBullets?.clear(true, true);
    s.spawnHazards = () => {};
    s.debris.hazards.clear(true, true);
    s.parallax.setForegroundDimmed(true, 0);
    s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
    s.banner.setAlpha(0);
    s.bannerFaixa.setAlpha(0);
    s.invulnerableUntil = 1e12;
    s.lives = 3;
    // for the film only: no card table (the spider's death opens one and pauses the phase), and every shot lands
    // (with their behaviour frozen the squid stays hidden — untouchable — and the shields stay up)
    s.cartas.abrirMesa = () => {};
    s.enemies.intocavel = () => false;
    s.enemies.bloqueia = () => false;
    let a = 20261026;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    window.__alvo = null;
    window.__peca = null;
    window.__onda = !!linha.onda;
    window.__tiroT = 0;
    window.__vivo = !!linha.vivo;
    if (linha.chefe) {
      s.spawnBoss();
    } else if (linha.treino) {
      // the director brings the boss in 1 s
    } else if (linha.golfinho) {
      // the probe's jump (`probe-f4-golfinho`): the B chamber with its walls and water, and the dolphin on cue
      s.elapsed = 39.6;
      s.director.skipTo(39.6);
      s.aplicaCorredorEMoldura(39.6);
      s.hazardRate = 0;
      s.propRate = 0;
      s.spawnGolfinho('sobe', 49.5);
      if (variante !== 'escolha') s.golfinho?.sprite.setData('variante', variante);
    } else if (linha.onda) {
      for (const o of linha.onda) s.enemies.spawn(o.kind, o.y, o.x);
    } else if (linha.peca) {
      // A PIECE OF THE BELT (27/10, step 2): held in place, still turning; the ship fires at it for real (`passo`)
      const h = s.debris.spawnEm(linha.peca, CX, CY);
      if (linha.escala) h.setScale(linha.escala);
      if (variante !== 'escolha') h.setData('variante', variante);
      h.setVelocity(0, 0);
      window.__alvo = h;
      // (`fixo` = the ship holds one height, a share of the piece's height from its middle: the shots dig one notch)
      window.__peca = { desde: linha.fogoEm ?? 0.2, fixo: linha.fixo !== undefined ? linha.fixo * h.displayHeight : undefined };
    } else {
      // the enemies stay put: their own update (flight, shots, the elites' states) is frozen; animations keep playing
      if (!linha.vivo) s.enemies.update = () => {};
      const e = s.enemies.spawn(linha.kind, CY, CX);
      if (variante !== 'escolha') e.setData('variante', variante);
      e.setVisible(true).setAlpha(1);
      if (linha.y !== 'aranha') e.setPosition(CX, CY);
      else e.setPosition(CX, e.y);
      e.body?.setVelocity(0, 0);
      e.body?.setAcceleration?.(0, 0);
      window.__alvo = e;
    }
    const g = window.__game;
    g.loop.sleep();
    window.__passo = { t: g.loop.now, seg: 0 };
    const base = Date.now(), t0 = window.__passo.t;
    Date.now = () => base + (window.__passo.t - t0);
  }, { linha, variante, CX, CY });
  const passo = (n) => page.evaluate((n) => {
    const g = window.__game;
    for (let i = 0; i < n; i++) {
      if (!g.scene.isActive('Game')) return null;
      const s = g.scene.getScene('Game');
      // the ship parked on the left, out of the way — in the bosses' films it FIRES (27/10: the marks under real fire;
      // the hits from outside the body hid the guardian's stain): the game's own bullets, every 0.1 s, its height
      // sweeping slowly over the live head (the serpent) or the boss's middle half
      const P0 = window.__passo;
      const b0 = s.boss, g0 = s.golfinho;
      const pc = window.__peca, alvoPc = window.__alvo;
      const mira = b0 && !b0.isDead && !b0.entering
        ? (b0.targets?.find((a) => a.active)?.y ?? b0.sprite.y) + Math.sin(P0.seg * 1.3) * (b0.targets?.length ? 8 : b0.sprite.displayHeight * 0.25)
        : g0?.vulneravel ? g0.sprite.y
        // (a piece of the belt: its height, sweeping a little over its middle)
        : pc && alvoPc?.active && P0.seg >= pc.desde ? alvoPc.y + (pc.fixo ?? Math.sin(P0.seg * 2.1) * alvoPc.displayHeight * 0.22) : undefined;
      if (pc && alvoPc?.active) alvoPc.body?.setVelocity(0, 0);
      if (!s.over) {
        s.ship.setPosition(40, mira ?? 108);
        s.ship.body.setVelocity(0, 0);
        if (mira !== undefined && Math.round(P0.seg * 60) % 6 === 0) s.weapons.shoot(s.ship.x + 10, s.ship.y);
      }
      const e = window.__alvo;
      if (e?.active && !window.__vivo) {
        e.body?.setVelocity(0, 0);
      }
      // the boss's (and the dolphin's) kamikazes and shots are not in the film
      if (s.boss || s.golfinho) {
        s.enemies.enemies.clear(true, true);
        s.enemies.enemyBullets?.clear(true, true);
      }
      // (the living spider's shots, too — not the spider)
      if (window.__vivo) s.enemies.enemyBullets?.clear(true, true);
      const P = window.__passo;
      // the wave: a hit every 0.1 s on the front-most enemy on screen, from the ship's side
      if (window.__onda && P.seg - window.__tiroT >= 0.1) {
        window.__tiroT = P.seg;
        const alvos = s.enemies.enemies.getChildren().filter((x) => x.active && x.x > 60 && x.x < 340);
        alvos.sort((a, b) => a.x - b.x);
        const e = alvos[0];
        if (e) {
          s.fx.hit(e.x - e.displayWidth * 0.3, e.y);
          s.ferirInimigo(e, 1, 'tiro', { x: s.ship.x, y: e.y });
        }
        s.enemies.enemyBullets?.clear(true, true);
      }
      P.t += 1000 / 60;
      P.seg += 1 / 60;
      g.step(P.t, 1000 / 60);
    }
    const s = g.scene.getScene('Game');
    return g.scene.isActive('Game') ? { boss: !!s.boss, entrando: s.boss ? !!s.boss.entering : false, golfinho: !!s.golfinho?.vulneravel } : null;
  }, n);
  // the boss glides in first (invulnerable while it does): wait for it (the practice run: for it to arrive, too)
  if (linha.chefe || linha.treino) {
    for (let i = 0; i < 900; i++) {
      const r = await passo(2);
      if (!r || (r.boss && !r.entrando)) break;
    }
    await passo(linha.treino ? 10 : 30);
  }
  // the dolphin's warning and wait (untouchable): film from a moment before its first pass
  if (linha.golfinho) {
    for (let i = 0; i < 900; i++) {
      const r = await passo(2);
      if (!r || r.golfinho) break;
    }
  }
  const alvo = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const e = window.__alvo ?? s.boss?.sprite;
    return e ? { x: e.x, y: e.y } : { x: 192, y: 104 };
  });
  const cel = G.cel;
  const cx = Math.round(Math.min(384 - cel.w / 2, Math.max(cel.w / 2, alvo.x))), cy = Math.round(Math.min(216 - cel.h / 2, Math.max(cel.h / 2, alvo.y)));
  const clip = { x: geo.left + (cx - cel.w / 2) * geo.k, y: geo.top + (cy - cel.h / 2) * geo.k, width: cel.w * geo.k, height: cel.h * geo.k };
  const eventos = [...linha.golpes.map((g) => ({ t: g.t, dano: g.dano })), { t: linha.mata, dano: 1e6 }].sort((a, b) => a.t - b.t);
  const quadros = [];
  let morteEm;
  for (let i = 0; i < linha.ate * 30; i++) {
    const seg = i / 30;
    // the steady stream (the bosses' whole fight): the ship's real bullets mark it (see `passo`); this only hurries the
    // life down, every 0.1 s, without a mark
    if (linha.dps && i % 3 === 0 && morteEm === undefined) {
      const st = await page.evaluate(({ d, golf }) => {
        const s = window.__game.scene.getScene('Game');
        if (golf) {
          const g = s.golfinho;
          if (!g) return 'morto';
          if (!g.vulneravel) return 'vivo';
          if (g.damage(d)) {
            s.matarGolfinho();
            return 'morto';
          }
          return 'vivo';
        }
        const b = s.boss;
        if (!b || b.isDead) return 'morto';
        if (b.damage(d)) {
          s.killBoss();
          return 'morto';
        }
        return 'vivo';
      }, { d: linha.dps * 0.1, golf: !!linha.golfinho });
      if (st === 'morto') morteEm = seg;
    }
    // the stream of shots on an enemy (`fluxo` hits to kill it, one every 0.1 s, from the left at varied heights)
    if (linha.fluxo && i % 3 === 0 && morteEm === undefined) {
      const st = await page.evaluate((n) => {
        const s = window.__game.scene.getScene('Game');
        const e = window.__alvo;
        if (!e?.active) return 'morto';
        const de = { x: e.x - 60, y: e.y + (Math.random() - 0.5) * e.displayHeight * 0.6 };
        s.fx.hit(e.x - e.displayWidth * 0.3, de.y);
        return s.ferirInimigo(e, e.getData('hpMax') / n + 1e-6, 'tiro', de) === 'morto' ? 'morto' : 'vivo';
      }, linha.fluxo);
      if (st === 'morto') morteEm = seg;
    }
    if (morteEm !== undefined && seg - morteEm >= linha.depois) break;
    while (eventos.length && seg >= eventos[0].t) {
      const ev = eventos.shift();
      await page.evaluate(({ dano, chefe }) => {
        const s = window.__game.scene.getScene('Game');
        if (chefe) {
          if (s.boss && !s.boss.isDead && s.boss.damage(dano)) s.killBoss();
          return;
        }
        const e = window.__alvo;
        if (e?.active) s.ferirInimigo(e, dano, 'tiro', { x: e.x - 70, y: e.y });
      }, { dano: ev.dano, chefe: !!linha.chefe });
    }
    const r = await passo(2);
    if (!r) break;
    const foto = await page.screenshot({ clip });
    quadros.push(await sharp(foto).resize(cel.w * ZOOM, cel.h * ZOOM, { kernel: 'nearest' }).png().toBuffer());
  }
  return quadros;
}

const rotulo = (txt, w, cor = '#ffb040') => sharp(Buffer.from(
  `<svg width="${w}" height="${ROTULO}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="${ROTULO - 7}" font-family="Consolas, monospace" font-size="14" fill="${cor}">${txt}</text></svg>`,
)).png().toBuffer();

const celulas = [];
for (const linha of G.linhas) {
  const lin = [];
  for (const v of G.cols) {
    const q = await gravar(linha, v);
    console.log(linha.rotulo, v, q.length, 'quadros');
    lin.push(q);
  }
  celulas.push(lin);
}
await browser.close();

const CW = G.cel.w * ZOOM, CH = G.cel.h * ZOOM, GAP = 4;
const W = G.cols.length * (CW + GAP) - GAP;
const H = ROTULO + G.linhas.length * (ROTULO + CH + GAP);
const cab = await Promise.all(G.cols.map((v) => rotulo(v === 'hoje' ? 'hoje (a de antes)' : v === 'escolha' ? 'a escolha (27/10), com as marcas' : v, CW, '#c8cdd8')));
const nomes = await Promise.all(G.linhas.map((l) => rotulo(l.rotulo, W)));
const nq = Math.max(...celulas.flat().map((q) => q.length));
const dir = path.join(path.dirname(OUT), `_q-${path.basename(OUT, path.extname(OUT))}`);
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
for (let i = 0; i < nq; i++) {
  const comp = [];
  G.cols.forEach((_, c) => comp.push({ input: cab[c], left: c * (CW + GAP), top: 0 }));
  celulas.forEach((lin, r) => {
    const top = ROTULO + r * (ROTULO + CH + GAP);
    comp.push({ input: nomes[r], left: 0, top });
    lin.forEach((q, c) => comp.push({ input: q[Math.min(i, q.length - 1)], left: c * (CW + GAP), top: top + ROTULO }));
  });
  const png = await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer();
  fs.writeFileSync(path.join(dir, `${String(i).padStart(5, '0')}.png`), png);
}
const feitos = await webm(dir, OUT, 30);
if (!MANTER) fs.rmSync(dir, { recursive: true, force: true });
console.log(OUT, feitos, 'quadros', `${W}x${H}`, erros.length ? erros : 'sem erro');
