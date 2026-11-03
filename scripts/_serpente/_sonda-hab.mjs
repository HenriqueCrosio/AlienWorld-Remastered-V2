// 02/11 — THE SERPENT'S SKILLS, PROBED IN THE GAME (spec `2026-11-02-serpente-habilidades-instalacao-design.md` §6, plan
// Tasks 6–14). The F3 practice run on a deterministic start (our luck and Phaser's own fixed, the clock on 1/60 steps —
// the `_sonda-luta.mjs` harness), straight into her fight by the dev shortcut's data (`serpente: { forma, hab }`), the
// ship untouchable but every hit COUNTED (shots, and the `morde` measurement). One mode per check:
//   carga       every set's sheets (frames, veins, shadow, lights) and the idles' light masks are loaded
//   atalho      `serpente: { forma: 'B' }` opens the fight already in the B
//   (the later tasks add: investida, tiros, chuva, raio, gas, contra, carta, troca, desempenho)
// Each mode writes { ok, linhas, medidas } to <out.json> and exits 1 on a failure. `--filmar <dir>` keeps a photo every
// 2 steps (30 fps, ×2) for the sheet's videos.
//   node scripts/_serpente/_sonda-hab.mjs <modo> <out.json> [--forma A|B|C|fusao] [--hab chuva|raio|gas|tiros] [--filmar <dir>] [--ate <s>]
// (with `npm run dev` running; do not touch src/ or .html while it runs — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
const COM_VALOR = ['--forma', '--hab', '--filmar', '--ate', '--esquiva', '--mapa', '--quadros', '--volta'];
const pos = args.filter((a, i) => !a.startsWith('--') && !COM_VALOR.includes(args[i - 1]));
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const [MODO, OUT] = pos;
const FORMA = opt('--forma', 'A'), HAB = opt('--hab', null), FILMAR = opt('--filmar', null), ATE = Number(opt('--ate', 60));

const linhas = [];
let falhas = 0;
const ok = (c, m) => { const l = `${c ? 'ok  ' : 'FALHA'} ${m}`; console.log(l); linhas.push(l); if (!c) falhas++; };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 90000 });
await page.waitForTimeout(800);
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const clip = { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k };

async function fim(medidas = {}) {
  ok(erros.length === 0, `sem erros na página (${erros.length}${erros.length ? ': ' + erros[0].slice(0, 160) : ''})`);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ modo: MODO, forma: FORMA, hab: HAB, ok: falhas === 0, linhas, medidas, erros }, null, 1));
  await browser.close();
  process.exit(falhas ? 1 : 0);
}

// ─── carga: the sheets are loaded (no fight needed) ───
if (MODO === 'carga') {
  const r = await page.evaluate(async () => {
    const { CONJUNTOS, IDLE_HAB } = await import('/src/entities/serpente/gestosHab.ts');
    const t = window.__game.textures, falta = [];
    for (const [k, c] of Object.entries(CONJUNTOS)) {
      const folhas = [`serpenteHab_${k}`, `serpenteHabVeias_${k}`, ...(c.sombra ? [`serpenteHabSombra_${k}`] : []), ...c.luzes.map((cor) => `serpenteHabLuz_${cor}_${k}`)];
      // (a spritesheet's frameTotal counts the __BASE frame too; the sheet is 8 columns, so it holds ≥ the set's frames)
      for (const f of folhas) if (!t.exists(f) || t.get(f).frameTotal - 1 < c.quadros) falta.push(f);
    }
    for (const F of ['A', 'B']) for (const cor of IDLE_HAB[F].luzes) if (!t.exists(`serpenteHabLuz_${cor}_idle${F}`)) falta.push(`serpenteHabLuz_${cor}_idle${F}`);
    return { falta, conjuntos: Object.keys(CONJUNTOS).length };
  });
  ok(r.falta.length === 0, `carga: as folhas dos ${r.conjuntos} conjuntos e as luzes dos idles carregadas (${r.falta.length} faltando${r.falta.length ? ': ' + r.falta.slice(0, 5).join(', ') : ''})`);
  await fim({ conjuntos: r.conjuntos });
}

// ─── the fight, deterministic (the `_sonda-luta.mjs` harness), with the dev shortcut's data ───
await page.evaluate(({ FORMA, HAB }) => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  let a = 20261026;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.Phaser.Math.RND.sow(['20261026']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now, seg: 0 };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + (window.__passo.t - t0);
  const pisa = (n) => { for (let i = 0; i < n; i++) { window.__passo.t += 1000 / 60; g.step(window.__passo.t, 1000 / 60); } };
  pisa(2);
  g.registry.set('cartas', []); g.registry.set('cartasCheckpoint', {}); g.registry.set('modeloNave', 'a'); g.registry.set('pinturaNave', 'laranja'); g.registry.set('sementeMorte', 20261026); g.registry.set('destrocosVariantes', undefined);
  const velha = g.scene.getScene('Game'); if (velha) velha.cartas = null;
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico', practice: true, serpente: { forma: FORMA, hab: HAB } });
  for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) pisa(1);
  const s = g.scene.getScene('Game');
  s.cartas.abrirMesa = () => {};
  for (let i = 0; i < 4; i++) { if (g.scene.isActive('Cartas')) g.scene.stop('Cartas'); if (g.scene.isPaused('Game')) g.scene.resume('Game'); pisa(12); }
  s.victory = () => {};
  s.lives = 3;
  // every hit counted, none felt: the ship stays untouchable; `damageShip` is watched before its own check
  const R = (window.__reg = { tiro: 0, morde: 0, golpes: [] });
  const dano = s.damageShip.bind(s);
  s.damageShip = (...x) => { R.tiro++; R.golpes.push(+window.__passo.seg.toFixed(2)); return dano(...x); };
  window.__nave = { x: 60, y: 100 };
}, { FORMA, HAB });

/** n steps; each step the mode's in-page controller (`window.__ctrl`, if any) runs first; the ship is parked where
 * `window.__nave` says (its real speed is the controller's job) */
const pisa = (n) => page.evaluate((n) => {
  const g = window.__game, P = window.__passo;
  for (let i = 0; i < n; i++) {
    if (!g.scene.isActive('Game')) return null;
    const s = g.scene.getScene('Game');
    s.invulnerableUntil = 1e12;
    s.enemies.enemies.clear(true, true);
    window.__ctrl?.(s, s.boss, P.seg);
    if (!s.over) {
      s.ship.setPosition(window.__nave.x, window.__nave.y);
      s.ship.body.setVelocity(0, 0);
      s.ship.setVisible(true).setAlpha(1);
    }
    P.t += 1000 / 60;
    P.seg += 1 / 60;
    g.step(P.t, 1000 / 60);
  }
  const b = g.scene.getScene('Game').boss;
  return { seg: +P.seg.toFixed(2), entrando: !!b?.entering, forma: b?.faseIdx, morto: !b || b.isDead };
}, n);

/** steps until she has arrived (the fight starts), at most `max` steps */
async function chegar(max = 4000) {
  for (let i = 0; i < max; i += 30) { const r = await pisa(30); if (r && !r.entrando) return r; }
  return null;
}

/** films `seg` seconds (a photo every 2 steps) into FILMAR, stepping with the mode's controller */
async function filmar(seg) {
  fs.rmSync(FILMAR, { recursive: true, force: true });
  fs.mkdirSync(FILMAR, { recursive: true });
  // (the ship is untouchable for the count, and the game blinks an untouchable ship — `GameScene` 933: in the film it
  // stays shown, as in play between hits)
  await page.evaluate(() => {
    const sh = window.__game.scene.getScene('Game').ship, mostra = sh.setVisible.bind(sh);
    sh.setVisible = () => mostra(true);
  });
  for (let i = 0; i < seg * 30; i++) {
    await pisa(2);
    const foto = await page.screenshot({ clip });
    await sharp(foto).resize(768, 432, { kernel: 'nearest' }).png().toFile(path.join(FILMAR, `${String(i).padStart(5, '0')}.png`));
  }
}

// ─── atalho: the dev shortcut's form, already on arrival ───
if (MODO === 'atalho') {
  const r = await chegar();
  const forma = { A: 0, B: 1, C: 2, fusao: 3 }[FORMA];
  ok(!!r && r.forma === forma, `atalho: ela chega na forma ${FORMA} (faseIdx ${r?.forma}, em ${r?.seg} s)`);
  await fim({ chegada: r?.seg });
}

// ─── investida: 3 minutes of the whole fight under the ship's real fire — she never leaves the breach ───
if (MODO === 'investida') {
  await chegar();
  await page.evaluate(() => {
    const R = window.__reg;
    R.xMin = 999; R.xMax = -999; R.semInvestida = true; R.estados = {}; R.formas = {};
    window.__ctrl = (s, b, seg) => {
      if (!b || b.isDead) return;
      // the ship: parked at x 60, following the live head's height, firing every 0.1 s
      const alvo = b.targets?.find((x) => x.active);
      if (alvo) window.__nave.y = Math.max(28, Math.min(150, alvo.y));
      if (alvo && Math.round(seg * 60) % 6 === 0) s.weapons.shoot(s.ship.x + 10, s.ship.y);
      if (!b.entering && !b.colapso && b.sprite.visible) { R.xMin = Math.min(R.xMin, b.sprite.x); R.xMax = Math.max(R.xMax, b.sprite.x); }
      if ('investida' in b) R.semInvestida = false;
      const e = `${b.faseIdx}:${b.ciclo?.estado}`;
      R.estados[e] = (R.estados[e] ?? 0) + 1;
      R.formas[b.faseIdx] = (R.formas[b.faseIdx] ?? 0) + 1;
    };
  });
  for (let i = 0; i < 180 * 2; i++) { const r = await pisa(30); if (!r || r.morto) break; }
  const R = await page.evaluate(() => { const R = window.__reg; return { xMin: R.xMin, xMax: R.xMax, semInvestida: R.semInvestida, estados: R.estados, formas: R.formas, tiro: R.tiro }; });
  const rombo = 300;
  ok(R.semInvestida, 'a investida não existe mais no chefão (nenhum campo `investida`)');
  ok(R.xMin >= rombo - 2 && R.xMax <= rombo + 2, `ela nunca sai do rombo (x de ${R.xMin.toFixed(1)} a ${R.xMax.toFixed(1)})`);
  ok(Object.keys(R.formas).length >= 2, `a luta anda: formas vistas ${Object.keys(R.formas).join(', ')}`);
  await fim(R);
}

// ─── corpo (03/11, his two choices at the 2nd pause): she stays ON HER POST — no slide, no breathing, in the pauses and
// in the skills — and THE WHOLE BODY takes damage: a shot on the head about to fall is worth `cabecaVale`, on the drawn
// body 1×, above her nothing; the breach's lip in front of her coils absorbs ───
if (MODO === 'corpo') {
  await chegar();
  await page.evaluate(() => {
    const R = window.__reg;
    Object.assign(R, { yMin: 999, yMax: -999, xMin: 999, xMax: -999, estados: {} });
    window.__ctrl = (s, b) => {
      if (!b || b.isDead || b.entering || b.colapso || !b.sprite.visible) return;
      R.yMin = Math.min(R.yMin, b.sprite.y); R.yMax = Math.max(R.yMax, b.sprite.y);
      R.xMin = Math.min(R.xMin, b.sprite.x); R.xMax = Math.max(R.xMax, b.sprite.x);
      R.estados[b.ciclo.estado] = (R.estados[b.ciclo.estado] ?? 0) + 1;
    };
  });
  // 20 s of the fight without a shot: pauses AND skills
  for (let i = 0; i < 40; i++) await pisa(30);
  const P = await page.evaluate(() => { const R = window.__reg; return { yMin: R.yMin, yMax: R.yMax, xMin: R.xMin, xMax: R.xMax, estados: R.estados }; });
  ok(P.yMin === 142 && P.yMax === 142, `ela fica no posto, sem subir nem descer (y de ${P.yMin} a ${P.yMax} em 20 s)`);
  ok(P.xMin >= 298 && P.xMax <= 302, `e no rombo (x de ${P.xMin.toFixed(1)} a ${P.xMax.toFixed(1)})`);
  // (the skills enter with plan Tasks 10–13: until a module is in, the cycle is all pauses)
  console.log(`     estados do ciclo vistos: ${JSON.stringify(P.estados)}`);

  // (wait for a pause's start, out of a skill and before its first common shot: she is idle on her post — the gestures
  // move her head, and in the B's gas the green's gaping lower jaw lies outside the head's capsule)
  const emPausa = async () => {
    await page.evaluate(() => { window.__ctrl = null; });
    for (let i = 0; i < 200; i++) {
      const livre = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return b.ciclo.estado === 'pausa' && b.ciclo.t < 0.5 && b.imune <= 0; });
      if (livre) return;
      await pisa(5);
    }
  };
  // one shot from the parked ship at height y; the HP lost after 1.5 s, against the shot's own damage
  const tiro = async (y) => {
    await emPausa();
    const a = await page.evaluate((y) => {
      const s = window.__game.scene.getScene('Game');
      window.__nave.y = y;
      s.ship.setPosition(60, y);
      const antes = new Set(s.weapons.bullets.getChildren().filter((o) => o.active));
      s.weapons.shoot(70, y);
      const novas = s.weapons.bullets.getChildren().filter((o) => o.active && !antes.has(o));
      return { hp: s.boss.hpTotal, n: novas.length, dano: novas.reduce((t, o) => t + (o.getData('damage') ?? 0), 0), cabeca: s.boss.targets[0]?.y };
    }, y);
    await pisa(90);
    const hp = await page.evaluate(() => window.__game.scene.getScene('Game').boss.hpTotal);
    return { ...a, perdeu: +(a.hp - hp).toFixed(3) };
  };
  // THE HIT MAP (`--mapa <png>`): the fight as it is now, her pixels tinted by what a shot there does — head (worth more)
  // in red, body in green, the lip covering her in blue — and the head's capsule and circle outlined
  const MAPA = opt('--mapa', null);
  await emPausa();
  if (MAPA) {
    const m = await page.evaluate(() => {
      const b = window.__game.scene.getScene('Game').boss, cor = b.fase.cores[0], cls = [];
      for (let y = 0; y < 216; y++) for (let x = 0; x < 384; x++) cls.push(({ cabeca: 1, corpo: 2, casco: 3 })[b.acertoNoCorpo(x, y, x + 1, y + 1)] ?? 0);
      return { cls, cranio: b.posCabeca(), boca: cor ? b.posBoca(cor) : b.posBocaFusao(), r: b.targets[0].body.halfWidth };
    });
    const foto = await sharp(await page.screenshot({ clip })).resize(384 * 3, 216 * 3, { kernel: 'nearest' }).raw().ensureAlpha().toBuffer();
    const TINTA = [null, [255, 40, 40], [40, 230, 90], [60, 120, 255]];
    for (let i = 0; i < 384 * 216; i++) {
      const t = TINTA[m.cls[i]];
      if (!t) continue;
      const x = i % 384, y = Math.floor(i / 384);
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) {
        const j = ((y * 3 + dy) * 384 * 3 + x * 3 + dx) * 4;
        for (let q = 0; q < 3; q++) foto[j + q] = Math.round(foto[j + q] * 0.45 + t[q] * 0.55);
      }
    }
    const k = 3, c = m.cranio, bo = m.boca;
    const svg = `<svg width="${384 * k}" height="${216 * k}"><circle cx="${c.x * k}" cy="${c.y * k}" r="${m.r * k}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6 4"/><line x1="${c.x * k}" y1="${c.y * k}" x2="${bo.x * k}" y2="${bo.y * k}" stroke="#ff0" stroke-width="2"/><circle cx="${bo.x * k}" cy="${bo.y * k}" r="4" fill="#ff0"/></svg>`;
    await sharp(foto, { raw: { width: 384 * k, height: 216 * k, channels: 4 } }).composite([{ input: Buffer.from(svg) }]).png().toFile(MAPA);
    console.log(`     o mapa do acerto: ${MAPA}`);
  }
  // THE HEAD MUST BE REACHABLE (the old "cabeça inalcançável" bug of probe-stage3, now by pixel): a row where the first
  // drawn pixel a shot meets, coming from the left, is the head about to fall (in the C the dead green's stump sits in
  // front of the orange's skull: the shot at the skull's own height hits the stump, the body)
  const alcance = await page.evaluate(() => {
    const b = window.__game.scene.getScene('Game').boss, c = b.targets[0], r = Math.ceil(c.body.halfWidth), linhas = [];
    for (let y = Math.round(c.y - r); y <= Math.round(c.y + r); y++) {
      let primeiro = null;
      for (let x = 150; x < 384 && !primeiro; x++) primeiro = b.acertoNoCorpo(x, y, x + 1, y + 1);
      if (primeiro === 'cabeca') linhas.push(y);
    }
    return { linhas, centro: c.y };
  });
  ok(alcance.linhas.length >= 4, `a cabeça é alcançável: ${alcance.linhas.length} linhas onde o tiro encontra a cabeça primeiro (${alcance.linhas[0]}–${alcance.linhas.at(-1)}; o crânio em y ${alcance.centro.toFixed(0)})`);
  const yCabeca = alcance.linhas.length ? alcance.linhas[Math.floor(alcance.linhas.length / 2)] : alcance.centro;
  // (every hit, as the scene takes it: where, how much it is worth, head or body)
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game'), orig = s.bulletHitBoss.bind(s);
    window.__acertos = [];
    s.bulletHitBoss = (bala, vale = 1, noAlvo = true) => {
      const c = bala.body;
      window.__acertos.push({ x: +bala.x.toFixed(1), y: +bala.y.toFixed(1), caixa: [c.left, c.top, c.right, c.bottom].map((v) => +v.toFixed(1)), vale, noAlvo });
      return orig(bala, vale, noAlvo);
    };
  });
  const cab = await tiro(yCabeca);
  console.log(`     o acerto: ${JSON.stringify(await page.evaluate(() => window.__acertos.at(-1)))}`);
  // (the body: the first row up from the hull's crest where the shot meets her body first — the necks)
  const yCorpo = await page.evaluate(() => {
    const b = window.__game.scene.getScene('Game').boss;
    for (let y = 148; y > 60; y--) {
      let primeiro = null;
      for (let x = 150; x < 384 && !primeiro; x++) primeiro = b.acertoNoCorpo(x, y, x + 1, y + 4);
      if (primeiro === 'corpo') return y;
    }
    return null;
  });
  const corpo = await tiro(yCorpo + 1);
  const acima = await tiro(40);
  const vale = await page.evaluate(() => window.__game.scene.getScene('Game').boss.valeAlvo);
  ok(cab.n >= 1 && Math.abs(cab.perdeu - cab.dano * vale) < 1e-6, `na cabeça (y ${yCabeca.toFixed(0)}): perdeu ${cab.perdeu} = ${cab.dano} × ${vale}`);
  ok(corpo.n >= 1 && Math.abs(corpo.perdeu - corpo.dano) < 1e-6, `no corpo (y ${yCorpo + 1}, os pescoços): perdeu ${corpo.perdeu} = ${corpo.dano} × 1`);
  ok(acima.perdeu === 0, `acima dela (y 40): o tiro passa, perdeu ${acima.perdeu}`);
  // the breach's lip (it rims the hole; inside it her coils show and take damage): every 1-px box over the band — where
  // the lip is opaque in front of her the hull absorbs, and none of those comes back 'corpo'
  const labio = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game'), b = s.boss, L = b.romboLabio, conta = { cabeca: 0, corpo: 0, casco: 0, nada: 0, labioCorpo: 0 };
    const t = s.textures;
    for (let x = 230; x < 370; x++) for (let y = 145; y < 200; y++) {
      const r = b.acertoNoCorpo(x, y, x + 1, y + 1) ?? 'nada';
      conta[r]++;
      // (the lip's own alpha at this pixel, read the way Phaser draws it)
      const fx = Math.floor((x + 0.5 - (L.x - L.displayOriginX * L.scaleX)) / L.scaleX), fy = Math.floor((y + 0.5 - (L.y - L.displayOriginY * L.scaleY)) / L.scaleY);
      if (r === 'corpo' && fx >= 0 && fy >= 0 && fx < L.frame.cutWidth && fy < L.frame.cutHeight && t.getPixelAlpha(fx, fy, L.texture.key, L.frame.name) >= 128) conta.labioCorpo++;
    }
    return conta;
  });
  ok(labio.casco > 0 && labio.labioCorpo === 0, `o lábio do rombo absorve onde cobre as roscas (${labio.casco} px), e nenhum pixel dele fere (${JSON.stringify(labio)})`);
  // (`--filmar`: the ship sweeps slowly from her head to her coils and back, firing — the sparks on the body, the
  // spatter on the head, and her standing still on the post)
  if (FILMAR) {
    await page.evaluate(() => {
      window.__ctrl = (s, b, seg) => {
        if (!b || b.isDead) return;
        window.__nave.y = 112 - 42 * Math.cos(seg * 0.9);
        if (Math.round(seg * 60) % 6 === 0) s.weapons.shoot(s.ship.x + 10, s.ship.y);
      };
    });
    await filmar(ATE);
  }
  await fim({ posto: P, cab, corpo, acima, labio });
}

// ─── tiros: the common shots in the pauses (`--hab tiros`) — the box, the turns, the fan's gap, the encirclement's middle ───
if (MODO === 'tiros') {
  const ACIMA = args.includes('--cerco-acima');
  await chegar();
  await page.evaluate((ACIMA) => {
    const R = window.__reg, s = window.__game.scene.getScene('Game');
    Object.assign(R, { caixa: { wMin: 99, wMax: 0, hMin: 99, hMax: 0, visiveis: 0, n: 0 }, porVar: {}, vistas: [], disparos: {} });
    const ativos = new Map();
    // each hit goes to the shot that made it: one of the serpent's that was alive last step, gone now, by the ship
    const dano0 = s.damageShip;
    s.damageShip = (...x) => {
      for (const [b, v] of ativos) if (!b.active && Math.abs(b.x - s.ship.x) < 26 && Math.abs(b.y - s.ship.y) < 18) { R.porVar[v] = (R.porVar[v] ?? 0) + 1; ativos.delete(b); break; }
      return dano0(...x);
    };
    let lidos = 0;
    window.__nave = { x: 80, y: 100 };
    window.__ctrl = (s, b) => {
      if (!b || b.isDead || b.entering) return;
      const reg = b.tiros.registro;
      for (; lidos < reg.length; lidos++) {
        const e = reg[lidos];
        R.disparos[e.variacao] = (R.disparos[e.variacao] ?? 0) + 1;
        R.vistas.push(e.variacao === 'cerco' ? `cerco:${e.cores.join('+')}` : e.variacao);
        if (e.variacao === 'leque') {
          // the gap: halfway between the middle drop's path and a neighbour's, at the ship's x — the gap nearer the
          // screen's middle (always the upper one ratcheted the ship up to the edge, onto the middle drop's path)
          const b0 = e.bocas[0], ys = e.angulos.map((a) => b0.y + (window.__nave.x - b0.x) * Math.tan(a)).sort((u, v) => u - v);
          const cima = (ys[0] + ys[1]) / 2, baixo = (ys[1] + ys[2]) / 2;
          window.__nave.y = Math.max(30, Math.min(140, Math.abs(cima - 100) < Math.abs(baixo - 100) ? cima : baixo));
        } else if (e.variacao === 'cerco' && ACIMA) window.__nave.y = Math.max(30, window.__nave.y - 22);
        // (the ship stays put otherwise: moving it while a volley flies would turn a miss into a hit)
      }
      ativos.clear();
      for (const o of s.enemies.enemyBullets.getChildren()) {
        if (!o.active || !o.getData('serpTiro')) continue;
        ativos.set(o, o.getData('serpVar'));
        // (the box from its second step: the physics applies the 0.9 scale at the start of the step after the spawn,
        // before any collision — on the spawn's own step the body is still the pool's unscaled frame)
        const tk = o.getData('serpTiro');
        if (!R.vistosTk) R.vistosTk = new Set();
        if (!R.vistosTk.has(tk)) { R.vistosTk.add(tk); continue; }
        const c = R.caixa;
        c.n++; c.wMin = Math.min(c.wMin, o.body.width); c.wMax = Math.max(c.wMax, o.body.width);
        c.hMin = Math.min(c.hMin, o.body.height); c.hMax = Math.max(c.hMax, o.body.height);
        if (o.visible) c.visiveis++;
      }
    };
  }, ACIMA);
  if (FILMAR) await filmar(ATE);
  else for (let i = 0; i < ATE * 2; i++) { const r = await pisa(30); if (!r || r.morto) break; }
  const R = await page.evaluate(() => { const R = window.__reg; return { caixa: R.caixa, porVar: R.porVar, vistas: R.vistas, disparos: R.disparos, tiro: R.tiro }; });
  const c = R.caixa;
  ok(c.n > 0 && Math.abs(c.wMin - 11.7) < 0.05 && Math.abs(c.wMax - 11.7) < 0.05 && Math.abs(c.hMin - 8.1) < 0.05 && Math.abs(c.hMax - 8.1) < 0.05,
    `a caixa de cada tiro é a de hoje (${c.wMin}–${c.wMax} × ${c.hMin}–${c.hMax}, em ${c.n} medidas)`);
  ok(c.visiveis === 0, `a bala do pool é invisível: o tiro é desenhado na camada (${c.visiveis} visíveis)`);
  const vars = R.vistas.map((v) => v.split(':')[0]);
  const ciclo = FORMA === 'A' || FORMA === 'B' ? ['mirado', 'leque', 'cerco'] : [];
  ok(ciclo.length === 0 || vars.every((v, i) => v === ciclo[i % 3]), `as variações em rodízio: ${vars.slice(0, 6).join(', ')}…`);
  if (FORMA === 'A') {
    const pares = R.vistas.filter((v) => v.startsWith('cerco')).map((v) => v.split(':')[1]);
    const esperado = ['ciano+verde', 'verde+laranja', 'ciano+laranja'];
    ok(pares.length >= 3 && pares.every((p, i) => p.split('+').sort().join() === esperado[i % 3].split('+').sort().join()), `as duplas do cerco se revezam: ${pares.slice(0, 4).join(', ')}`);
  }
  if (ciclo.length) {
    // (with `--cerco-acima` the ship jumps up while the fan's drops still fly: only the encirclement is judged there)
    if (!ACIMA) ok((R.disparos.leque ?? 0) >= 3 && !R.porVar.leque, `o leque deixa vão: a nave no vão, ${R.porVar.leque ?? 0} acertos em ${R.disparos.leque ?? 0} leques`);
    if (ACIMA) ok((R.porVar.cerco ?? 0) >= 1, `o cerco acerta quem sobe 22 px (${R.porVar.cerco ?? 0} acertos em ${R.disparos.cerco ?? 0})`);
    else ok((R.disparos.cerco ?? 0) >= 3 && !R.porVar.cerco, `o cerco erra quem fica no meio (${R.porVar.cerco ?? 0} acertos em ${R.disparos.cerco ?? 0})`);
  }
  await fim(R);
}

// ─── chuva (plan Task 10): the cocoon rain (`--hab chuva`) — two rounds: the 1st with the mock's mannequin riding the
// gap (no hit), the 2nd with the ship parked under the 1st wave's first cocoon (hit); the waves and their cocoons, the
// salvo, the boxes along the flight, the burst on the hull ───
if (MODO === 'chuva') {
  await chegar();
  await page.evaluate((FILMAR) => {
    const R = window.__reg, s = window.__game.scene.getScene('Game');
    Object.assign(R, { rodadas: [], ativa: false, vistos: new Set(), caixa: { desce: { w: [99, 0], h: [99, 0], n: 0 }, sobe: { w: [99, 0], h: [99, 0], n: 0 } }, visiveis: 0, yMax: -99 });
    // each hit goes to what made it: the scene lets the bullet go right before it hurts the ship
    const rel = s.enemies.release.bind(s.enemies);
    s.enemies.release = (b) => { window.__solto = b.getData('serpCasulo') ? 'casulo' : 'outro'; return rel(b); };
    const dano0 = s.damageShip;
    s.damageShip = (...x) => {
      const r = R.rodadas.at(-1);
      if (r && R.ativa) r[window.__solto === 'casulo' ? 'casulo' : 'outro']++;
      window.__solto = null;
      return dano0(...x);
    };
    window.__nave = { x: 60, y: 100 };
    window.__ctrl = (s, b) => {
      if (!b || b.isDead || b.entering) return;
      const h = b.habs.chuva, emHab = b.ciclo.estado === 'hab' && b.ciclo.hab === 'chuva';
      if (emHab && !R.ativa) {
        R.ativa = true;
        const modo = R.rodadas.length === 0 || FILMAR ? 'manequim' : 'parado';
        R.rodadas.push({ modo, casulo: 0, outro: 0, porOnda: [], sobem: 0, vaos: [...h.vaos], vagas: h.vagas.map((v) => [...v]) });
        window.__nave = modo === 'parado' ? { x: h.vagas[0][0], y: 100 } : { x: 60, y: 100 };
      }
      if (!emHab && R.ativa) { R.ativa = false; R.rodadas.at(-1).ondas = h.ondas; }
      const r = R.rodadas.at(-1);
      if (!R.ativa || !r) return;
      // the mannequin: from the strike, into the 1st wave's gap; then, as each wave comes in, into its gap (110 px/s)
      if (r.modo === 'manequim' && h.tAcao !== null) {
        const alvo = h.vaos[Math.max(0, h.ondas - 1)], d = alvo - window.__nave.x;
        window.__nave.x += Math.sign(d) * Math.min(Math.abs(d), 110 / 60);
      }
      // the cocoons in the pool: each wave's count as it comes in, the salvo's, the box (from the 2nd sighting), the burst
      const novos = { desce: 0, sobe: 0 };
      for (const o of s.enemies.enemyBullets.getChildren()) {
        const tk = o.getData('serpCasulo');
        if (!o.active || !tk) continue;
        const k = o.getData('serpDesce') ? 'desce' : 'sobe';
        if (o.visible) R.visiveis++;
        if (k === 'desce') R.yMax = Math.max(R.yMax, o.y);
        if (!R.vistos.has(tk)) { R.vistos.add(tk); novos[k]++; continue; }
        const c = R.caixa[k];
        c.n++; c.w = [Math.min(c.w[0], o.body.width), Math.max(c.w[1], o.body.width)]; c.h = [Math.min(c.h[0], o.body.height), Math.max(c.h[1], o.body.height)];
      }
      if (novos.desce) r.porOnda.push(novos.desce);
      r.sobem += novos.sobe;
    };
  }, !!FILMAR);
  if (FILMAR) await filmar(ATE);
  else for (let i = 0; i < 80; i++) {
    const r = await pisa(30);
    if (!r || r.morto) break;
    if (await page.evaluate(() => window.__reg.rodadas.length >= 2 && !window.__reg.ativa)) break;
  }
  const R = await page.evaluate(() => { const R = window.__reg; return { rodadas: R.rodadas, caixa: R.caixa, visiveis: R.visiveis, yMax: R.yMax }; });
  const cabecas = { A: 3, B: 2 }[FORMA];
  const [m, p] = R.rodadas;
  ok(!!m && m.ondas === cabecas && m.porOnda.length === cabecas && m.porOnda.every((n) => n === 7), `as ondas: ${m?.ondas} (esperado ${cabecas}), com ${m?.porOnda.join(', ')} casulos (7 cada)`);
  ok(!!m && m.sobem === 9 * cabecas, `a salva: ${m?.sobem} casulos sobem (9 por cabeça viva = ${9 * cabecas})`);
  ok(!!m && m.casulo === 0, `o manequim no vão passa: ${m?.casulo} acertos de casulo (vãos em x ${m?.vaos.join(', ')}; ${m?.outro} de tiro comum nas pausas, à parte)`);
  if (!FILMAR) ok(!!p && p.casulo >= 1, `a nave parada sob o 1º casulo da 1ª onda (x ${p?.vagas[0][0]}) é atingida: ${p?.casulo} acertos`);
  const cx = (c, w, h) => c.n > 0 && Math.abs(c.w[0] - w) < 0.05 && Math.abs(c.w[1] - w) < 0.05 && Math.abs(c.h[0] - h) < 0.05 && Math.abs(c.h[1] - h) < 0.05;
  ok(cx(R.caixa.desce, 7, 11), `a caixa descendo é 7×11 (${R.caixa.desce.w.join('–')} × ${R.caixa.desce.h.join('–')}, ${R.caixa.desce.n} medidas)`);
  ok(cx(R.caixa.sobe, 9, 9), `a caixa subindo é 9×9 (${R.caixa.sobe.w.join('–')} × ${R.caixa.sobe.h.join('–')}, ${R.caixa.sobe.n} medidas)`);
  ok(R.visiveis === 0, `a bala do pool é invisível: o casulo é desenhado na camada (${R.visiveis} visíveis)`);
  ok(R.yMax <= 151 + 2, `estoura no casco: nenhum casulo vivo abaixo de y ${151 + 2} (o mais baixo em ${R.yMax.toFixed(1)})`);
  await fim(R);
}

// ─── raio (plan Task 11): the cyan's beam (`--forma A --hab raio`) — two rounds: the 1st with the mock's mannequin
// (1846–1852: under the top slice, over the bottom one, and each salvo slice's way out, `de` → `para` in
// [t1 − 0.32, t1 − 0.06]) — no bite; the 2nd with the ship parked in the path (y 60 for the top slice, 130 for the
// bottom one) — bitten. The bites are the scene's own `morde` measurement, counted per slice. And the salvo always has
// a way out: 200 seeds drawn with her real mouth ───
if (MODO === 'raio') {
  await chegar();
  await page.evaluate((FILMAR) => {
    const R = window.__reg, s = window.__game.scene.getScene('Game'), b = s.boss, h = b.habs.raio;
    Object.assign(R, { rodadas: [], ativa: false });
    // every bite, as the scene measures it, to the slice firing then
    const m0 = b.morde.bind(b);
    b.morde = (...a) => {
      const r = m0(...a), rd = R.rodadas.at(-1);
      if (r && rd && R.ativa) {
        const i = h.fatias.findIndex((f) => h.tq >= f.t1 && h.tq < f.t3);
        rd.mordidas[i] = (rd.mordidas[i] ?? 0) + 1;
      }
      return r;
    };
    const suave = (u) => u * u * (3 - 2 * u);
    window.__nave = { x: 85, y: 100 };
    window.__ctrl = (s, b) => {
      if (!b || b.isDead || b.entering) return;
      const emHab = b.ciclo.estado === 'hab' && b.ciclo.hab === 'raio';
      if (emHab && !R.ativa) {
        R.ativa = true;
        R.rodadas.push({ modo: R.rodadas.length === 0 || FILMAR ? 'sai' : 'fica', mordidas: {}, salva: [] });
      }
      if (!emHab && R.ativa) {
        R.ativa = false;
        R.rodadas.at(-1).salva = h.fatias.filter((f) => f.salva).map((f) => ({ de: +f.de.toFixed(2), ate: +f.ate.toFixed(2), para: +f.para.toFixed(2) }));
      }
      const rd = R.rodadas.at(-1);
      if (!R.ativa || !rd) return;
      const t = h.t, F2 = h.fatias[1];
      if (rd.modo === 'fica') { window.__nave.y = t < h.fatias[0].t3 ? 60 : 130; return; }
      // the mock's mannequin: keyframes [t, y] on the skill's clock (eased, or `true` = a steady glide)
      const cam = [[0, 100], [0.6, 100], [1.0, 128], [F2.t0 + 0.3, 128], [F2.t1 - 0.2, 50]];
      let P = 50;
      for (const f of h.fatias.filter((f) => f.salva && !f.pendente)) { cam.push([f.t1 - 0.32, P], [f.t1 - 0.06, f.para, true]); P = f.para; }
      let y = cam[cam.length - 1][1];
      if (t <= cam[0][0]) y = cam[0][1];
      else for (let i = 1; i < cam.length; i++) if (t <= cam[i][0]) {
        const [t0, y0] = cam[i - 1], [t1, y1, reta] = cam[i], u = (t - t0) / (t1 - t0);
        y = y0 + (y1 - y0) * (reta ? u : suave(u));
        break;
      }
      window.__nave.y = y;
    };
  }, !!FILMAR);
  if (FILMAR) await filmar(ATE);
  else for (let i = 0; i < 140; i++) {
    const r = await pisa(30);
    if (!r || r.morto) break;
    if (await page.evaluate(() => window.__reg.rodadas.length >= 2 && !window.__reg.ativa)) break;
  }
  // the salvo's rule with her real mouth: 200 seeds, six slices each, from y 50 at the mannequin's column
  const regra = await page.evaluate(async () => {
    const { sorteiaFatia } = await import('/src/entities/serpente/geometriaRaio.ts');
    const { gerador } = await import('/src/entities/serpente/numerosHab.ts');
    const h = window.__game.scene.getScene('Game').boss.habs.raio;
    let ruins = 0, maior = 0, n = 0;
    for (let semente = 1; semente <= 200; semente++) {
      const sorte = gerador(semente);
      let P = 50;
      for (let i = 0; i < 6; i++, n++) {
        const f = sorteiaFatia(P, 83.5, sorte, h.bocaPara);
        maior = Math.max(maior, Math.abs(f.para - P));
        if (Math.abs(f.para - P) > 25 || f.para < 30 || f.para > 143 || P < f.lo || P > f.hi) ruins++;
        P = f.para;
      }
    }
    return { ruins, maior, n };
  });
  const R = await page.evaluate(() => ({ rodadas: window.__reg.rodadas }));
  const [sai, fica] = R.rodadas;
  const total = (m) => Object.values(m ?? {}).reduce((a, b) => a + b, 0);
  ok(!!sai && total(sai.mordidas) === 0, `quem segue o manequim (lê cada fatia e sai) não é mordido: ${total(sai?.mordidas)} mordidas (salva: ${sai?.salva.map((f) => f.para).join(' → ')})`);
  if (!FILMAR) {
    ok(!!fica && (fica.mordidas[0] ?? 0) >= 1, `quem fica em y 60 na fatia de cima é mordido (${fica?.mordidas[0] ?? 0} quadros)`);
    ok(!!fica && (fica.mordidas[1] ?? 0) >= 1, `quem fica em y 130 na fatia de baixo é mordido (${fica?.mordidas[1] ?? 0} quadros)`);
    console.log(`     mordidas da nave parada por fatia: ${JSON.stringify(fica?.mordidas)}`);
  }
  ok(regra.ruins === 0, `a salva sempre tem saída com a boca de verdade: ${regra.n} fatias de 200 sementes, a maior saída ${regra.maior.toFixed(1)} px (≤ 25), ${regra.ruins} ruins`);
  await fim({ ...R, regra });
}

// ─── gas / contra / carta (plan Task 12): the gas + spark (`--hab gas`), on the skill's own clock (`hab.t`) ───
//   gas     two rounds: the RIGHT dodges (the mock's `CAM.padroes`, 1820–1824: up out of the fan's line, still between
//           the rails, gliding up through the file) — no bite, and the burning jelly's outline ≥ 12 px from the ship's
//           box in each pattern (the rounds 7 and 13 measure); then the WRONG ones (still in the fan's line, up into a
//           rail, still in the file) — bitten in each
//   contra  the mock's `CAM.contra`, firing for real (her shot damage off, so the form lives to the counter): the
//           thermometer fills, her HP takes the counter once (`HAB.contra` of the form's), the three flinch
//   carta   INCENDIÁRIO in hand: it lights at the first shot that touches the gas (≤ 0.2 s)
if (MODO === 'gas' || MODO === 'contra' || MODO === 'carta') {
  await chegar();
  await page.evaluate(({ MODO, FILMAR, FORMA, VOLTA }) => {
    const R = window.__reg, s = window.__game.scene.getScene('Game'), b = s.boss, h = b.habs.gas;
    Object.assign(R, { rodadas: [], ativa: false, danos: [], cheio: null, fogo: null, toque: null, encolheu: false });
    if (MODO === 'carta') b.arena.incendiario = () => true;
    // the bites, as the scene measures them, to the pattern struck last; the counter's damage apart from the shots'
    const m0 = b.morde.bind(b);
    const padrao = () => { let i = -1; for (let j = 0; j < h.ataques.length; j++) if (h.t >= h.ataques[j].tf) i = j; return i; };
    b.morde = (...a) => {
      const r = m0(...a), rd = R.rodadas.at(-1);
      if (r && rd && R.ativa) { const i = padrao(); rd.mordidas[i] = (rd.mordidas[i] ?? 0) + 1; }
      return r;
    };
    const d0 = b.damage.bind(b);
    b.damage = (q, onde) => {
      if (MODO !== 'gas' && onde) return false; // (the player's shots: off — the form must live to the counter)
      if (R.ativa && !onde) R.danos.push({ q: +q.toFixed(3), hp: b.fase.hp, t: +h.t.toFixed(2) });
      return d0(q, onde);
    };
    const suave = (u) => u * u * (3 - 2 * u);
    // the ship's y on the skill's clock. The A's (the mock's): the right dodges (up out of the fan's line, still between
    // the rails, gliding up through the file) and a wrong one (still in the fan's line, up into a rail, still in the
    // file). The B's own sequence (03/11): the right dodges (up out of the low fan, half a step into the curtain's gap,
    // gliding up through the low file), standing still, and THE DIVE to the hull after each strike
    const CAMS = FORMA === 'B' ? {
      certa: [[0, 100], [4.25, 100], [4.65, 73], [6.1, 73], [6.7, 100], [7.75, 100], [8.15, 73], [9.6, 73], [10.0, 100], [10.3, 118], [11.9, 30, true]],
      parada: [[0, 100]],
      mergulho: [[0, 100], [3.9, 100], [4.3, 141], [6.6, 141], [7.0, 100], [7.4, 100], [7.8, 141], [9.9, 141], [10.3, 100], [10.8, 100], [11.2, 141]],
      // (the hull lies in the background: a ship can hide UNDER its crest — only the B's last dodge reaches there)
      escondida: [[0, 185]],
    } : {
      certa: [[0, 100], [4.25, 100], [4.65, 73], [6.1, 73], [6.7, 100], [9.6, 100], [10.05, 120], [10.4, 120], [11.9, 30, true]],
      errada: [[0, 100], [7.3, 100], [7.8, 70], [9.6, 70], [9.9, 100]],
    };
    Object.assign(CAMS, { contra: [[0, 100], [2.3, 100], [2.7, 132], [4.2, 132], [4.6, 104], [5.95, 104], [6.35, 132]], carta: [[0, 100], [0.9, 100], [1.3, 132]] });
    const VOLTAS = FORMA === 'B' ? ['certa', 'parada', 'mergulho', 'escondida'] : ['certa', 'errada'];
    window.__nave = { x: MODO === 'gas' ? 85 : 90, y: 100 };
    window.__ctrl = (s, b, seg) => {
      if (!b || b.isDead || b.entering) return;
      const emHab = b.ciclo.estado === 'hab' && b.ciclo.hab === 'gas';
      if (emHab && !R.ativa) {
        R.ativa = true;
        R.rodadas.push({ modo: MODO !== 'gas' ? MODO : FILMAR ? (VOLTA ?? 'certa') : VOLTAS[Math.min(R.rodadas.length, VOLTAS.length - 1)], mordidas: {}, folga: {} });
      }
      if (!emHab && R.ativa) R.ativa = false;
      const rd = R.rodadas.at(-1);
      if (!R.ativa || !rd) return;
      const cam = CAMS[rd.modo], t = h.t;
      let y = cam[cam.length - 1][1];
      if (t <= cam[0][0]) y = cam[0][1];
      else for (let i = 1; i < cam.length; i++) if (t <= cam[i][0]) {
        const [t0, y0] = cam[i - 1], [t1, y1, reta] = cam[i], u = (t - t0) / (t1 - t0);
        y = y0 + (y1 - y0) * (reta ? u : suave(u));
        break;
      }
      window.__nave.y = y;
      // the gap: the burning jelly's outline to the ship's box, per pattern
      const c = s.ship.body, i = padrao(), f = h.geleias.folga(c.left, c.right, c.top, c.bottom);
      if (i >= 0 && Number.isFinite(f)) rd.folga[i] = Math.min(rd.folga[i] ?? 99, +f.toFixed(1));
      if (MODO !== 'gas' && Math.round(seg * 60) % 6 === 0) s.weapons.shoot(s.ship.x + 10, s.ship.y);
      if (h.termo.estado === 'cheio' && R.cheio === null) R.cheio = +t.toFixed(2);
      if (h.termo.estado === 'fogo' && R.fogo === null) R.fogo = +t.toFixed(2);
      if (b.tocador.atual?.chave?.startsWith('gasEncolhe')) R.encolheu = true;
      // the first touch: a live shot in a cell of the gas thick enough to burn (the card lights there)
      if (R.toque === null) for (const o of s.weapons.bullets.getChildren()) {
        if (!o.active) continue;
        const cx = Math.floor(o.x / 2), cy = Math.floor(o.y / 2);
        if (cx >= 0 && cy >= 0 && cx < 192 && cy < 108 && h.densB[cy * 192 + cx] > 0.9) { R.toque = +t.toFixed(2); break; }
      }
    };
  }, { MODO, FILMAR: !!FILMAR, FORMA, VOLTA: opt('--volta', null) });
  if (FILMAR) await filmar(ATE);
  else for (let i = 0; i < 240; i++) { // (the B's four rounds: ~80 s of play)
    const r = await pisa(30);
    if (!r || r.morto) break;
    if (await page.evaluate((n) => window.__reg.rodadas.length >= n && !window.__reg.ativa, MODO !== 'gas' ? 1 : FORMA === 'B' ? 4 : 2)) break;
  }
  const R = await page.evaluate(() => { const R = window.__reg; return { rodadas: R.rodadas, danos: R.danos, cheio: R.cheio, fogo: R.fogo, toque: R.toque, encolheu: R.encolheu }; });
  const NOMES = FORMA === 'B' ? ['rasteira', 'cortina', 'fila funda'] : ['leque', 'trilhos', 'fila'];
  // which wrong dodges each pattern must bite (hidden under the crest: only the B's last)
  const ESPERA = { errada: [0, 1, 2], parada: [0, 1, 2], mergulho: [0, 1, 2], escondida: [2] };
  if (MODO === 'gas') {
    const [certa, ...erradas] = R.rodadas;
    const morde = (rd, i) => rd?.mordidas[i] ?? 0;
    for (let i = 0; i < 3; i++) {
      ok(!!certa && morde(certa, i) === 0 && (certa.folga[i] ?? 99) >= 12, `${NOMES[i]}: a esquiva certa passa (${morde(certa, i)} mordidas; folga mínima ${certa?.folga[i]} px, ≥ 12)`);
      if (!FILMAR) for (const e of erradas) {
        if (ESPERA[e.modo].includes(i)) ok(morde(e, i) >= 1, `${NOMES[i]}: a esquiva errada (${e.modo}) é mordida (${morde(e, i)} quadros)`);
        else console.log(`     ${NOMES[i]}: ${e.modo} — ${morde(e, i)} quadros (escapa, de propósito)`);
      }
    }
  }
  if (MODO === 'contra') {
    const hp = R.danos[0]?.hp ?? 0;
    ok(R.cheio !== null, `o termômetro enche com os tiros pelo gás (em t ${R.cheio})`);
    ok(R.danos.length === 1 && Math.abs(R.danos[0].q - hp * 0.15) <= 1, `o contra tira ${R.danos[0]?.q} da forma (15% de ${hp}), num toque só (${R.danos.length} toques)`);
    ok(R.encolheu, 'as cabeças se encolhem (o tocador passa pelo encolhe da forma)');
  }
  if (MODO === 'carta') {
    ok(R.fogo !== null && R.toque !== null && R.fogo - R.toque <= 0.2 + 1e-9, `com o INCENDIÁRIO acende no primeiro toque (toque em t ${R.toque}, fogo em ${R.fogo})`);
  }
  await fim(R);
}

// ─── mapa-gestos (03/11, his "pode fazer contar como cabeça"): the hit map on her GESTURE frames — each listed frame
// shown on her (`--quadros gasSopraB:4,erguer:6,…`; `erguer:i` is the form's rise), classified pixel by pixel as the
// scene does (head red, body green, lip blue), the skull and the mouth marked; one panel per frame in `--mapa <png>` ───
if (MODO === 'mapa-gestos') {
  await chegar();
  for (let i = 0; i < 200; i++) { // (a pause's start: nothing of hers on screen)
    const livre = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return b.ciclo.estado === 'pausa' && b.ciclo.t < 0.5; });
    if (livre) break;
    await pisa(5);
  }
  const lista = opt('--quadros', '').split(',').filter(Boolean);
  const paineis = [];
  for (const q of lista) {
    const [chave, iq] = q.split(':');
    const r = await page.evaluate(({ chave, i }) => {
      const b = window.__game.scene.getScene('Game').boss;
      if (chave === 'erguer') { // (the rise, as the boss plays it — its origin included — held on frame i)
        b.tocarGesto();
        b.sprite.anims.pause();
        b.sprite.anims.setCurrentFrame(b.sprite.anims.currentAnim.frames[i]);
      } else b.tocador.mostrar(chave, i);
      b.sincronizarCabeca();
      const cls = [], cor = b.fase.cores[0];
      for (let y = 0; y < 216; y++) for (let x = 0; x < 384; x++) cls.push(({ cabeca: 1, corpo: 2, casco: 3 })[b.acertoNoCorpo(x, y, x + 1, y + 1)] ?? 0);
      return { cls, cranio: b.posCabeca(), boca: cor ? b.posBoca(cor) : b.posBocaFusao() };
    }, { chave, i: Number(iq) });
    paineis.push({ rotulo: q, ...r });
  }
  // her pixels by class on a dark ground, 3×, around her (x 190–370, y 20–200)
  const X0 = 190, Y0 = 20, LW = 180, LH = 180, Z = 3, TINTA = [null, [235, 60, 60], [60, 200, 100], [70, 120, 255]];
  const comp = [];
  for (const [k, p] of paineis.entries()) {
    const buf = Buffer.alloc(LW * Z * LH * Z * 4);
    for (let y = 0; y < LH * Z; y++) for (let x = 0; x < LW * Z; x++) {
      const c = p.cls[(Y0 + Math.floor(y / Z)) * 384 + X0 + Math.floor(x / Z)], j = (y * LW * Z + x) * 4, t = TINTA[c] ?? [14, 16, 24];
      buf[j] = t[0]; buf[j + 1] = t[1]; buf[j + 2] = t[2]; buf[j + 3] = 255;
    }
    const svg = `<svg width="${LW * Z}" height="${LH * Z}"><circle cx="${(p.cranio.x - X0) * Z}" cy="${(p.cranio.y - Y0) * Z}" r="5" fill="#fff"/><circle cx="${(p.boca.x - X0) * Z}" cy="${(p.boca.y - Y0) * Z}" r="5" fill="#ff0"/><text x="6" y="22" font-size="20" font-family="monospace" fill="#fff">${p.rotulo}</text></svg>`;
    comp.push({ input: await sharp(buf, { raw: { width: LW * Z, height: LH * Z, channels: 4 } }).composite([{ input: Buffer.from(svg) }]).png().toBuffer(), left: (k % 4) * (LW * Z + 6), top: Math.floor(k / 4) * (LH * Z + 6) });
  }
  const linhasP = Math.ceil(paineis.length / 4);
  await sharp({ create: { width: 4 * (LW * Z + 6), height: linhasP * (LH * Z + 6), channels: 4, background: '#05060a' } }).composite(comp).png().toFile(opt('--mapa', 'mapa-gestos.png'));
  // (from the left, as the ship shoots: the rows whose first pixel of hers is the head)
  for (const p of paineis) {
    let deFrente = 0;
    for (let y = 0; y < 216; y++) for (let x = 150; x < 384; x++) { const c = p.cls[y * 384 + x]; if (c) { if (c === 1) deFrente++; break; } }
    console.log(`     ${p.rotulo}: cabeça ${p.cls.filter((c) => c === 1).length} px, ${deFrente} linhas de cabeça de frente`);
  }
  await fim({});
}

ok(false, `modo desconhecido: ${MODO}`);
await fim();
