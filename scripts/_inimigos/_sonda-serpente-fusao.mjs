// 28/10 — THE SERPENT'S FUSION PROBE (spec `docs/superpowers/specs/2026-10-28-serpente-fusao-mordidas-design.md`): the
// whole fight in the practice arena of the F3, under the ship's REAL bullets (every 0.1 s, over the live head) plus a
// slow drain, on a stepped clock with fixed luck. It logs the forms, the star and the bites, and saves crops:
//   - each head form (A, B, C) at its first free frame and 1.5 s later — the "nothing else changed" proof: the crops of
//     two runs (before and after a change) must be the same, pixel for pixel (`--comparar`);
//   - each bite of the fusion, 1/3 s after it.
// With `--novo` it also checks the fusion's new bites: three, all in the fusion, in order (neck, chin, skull), each
// nearest its own point; the star hidden in every form (S1, 28/10: the veins mark the live head); no explosion sheet in
// these bites.
//   node scripts/_inimigos/_sonda-serpente-fusao.mjs <dir> [--novo]
//   node scripts/_inimigos/_sonda-serpente-fusao.mjs --comparar=<dirA>,<dirB>
// (with `npm run dev` running)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FALHA'} ${msg}`);
  if (!cond) falhas++;
};

const comparar = args.find((a) => a.startsWith('--comparar='))?.slice(11).split(',');
if (comparar) {
  const [a, b] = comparar;
  const nomes = fs.readdirSync(a).filter((n) => /^f[012]-/.test(n) && n.endsWith('.png')).sort();
  ok(nomes.length === 6, `seis recortes das formas de cabeça em ${a} (${nomes.length})`);
  for (const n of nomes) {
    if (!fs.existsSync(path.join(b, n))) {
      ok(false, `${n}: falta em ${b}`);
      continue;
    }
    const [x, y] = await Promise.all([a, b].map((d) => sharp(path.join(d, n)).raw().toBuffer()));
    let dif = 0;
    for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) dif++;
    ok(dif === 0, `${n}: idêntico pixel a pixel (${dif} bytes diferentes)`);
  }
  console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
  process.exit(falhas ? 1 : 0);
}

const [OUT] = args.filter((a) => !a.startsWith('--'));
const NOVO = args.includes('--novo');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
/** the fusion's three points (art px from the sprite's centre), in the order they are bitten */
const PONTOS = [
  { nome: 'pescoço', x: -18, y: -2 },
  { nome: 'queixo', x: -54, y: 2 },
  { nome: 'crânio', x: -52, y: -75.6 },
];

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

// A DETERMINISTIC START (the "nothing else changed" proof compares two runs pixel for pixel; the 1st version let the
// game run 800 ms of REAL time before the stepped clock, and two runs of the same code came out a step apart): the luck
// is fixed and the clock goes on steps BEFORE the phase starts — no real-time wait after this.
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  let a = 20261026;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // (and Phaser's own generator, seeded with the real clock at boot: the parallax picks its layers' tints with it)
  window.Phaser.Math.RND.sow(['20261026']);
  g.loop.sleep();
  window.__passo = { t: g.loop.now, seg: 0 };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + (window.__passo.t - t0);
  const pisa = (n) => {
    for (let i = 0; i < n; i++) {
      window.__passo.t += 1000 / 60;
      g.step(window.__passo.t, 1000 / 60);
    }
  };
  pisa(2);
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.registry.set('modeloNave', 'a');
  g.registry.set('pinturaNave', 'laranja');
  g.registry.set('sementeMorte', 20261026);
  g.registry.set('destrocosVariantes', undefined);
  const velha = g.scene.getScene('Game');
  if (velha) velha.cartas = null;
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico', practice: true });
  for (let i = 0; i < 600 && !g.scene.getScene('Game')?.cartas; i++) pisa(1);
  const s = g.scene.getScene('Game');
  s.cartas.abrirMesa = () => {};
  // (the practice run starts past the mid-phase table's second: it may have opened and paused the phase)
  for (let i = 0; i < 4; i++) {
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    pisa(12);
  }
  s.victory = () => {};
  s.invulnerableUntil = 1e12;
  s.lives = 3;
  s.cartas.abrirMesa = () => {};
  // the explosion sheets started INSIDE a bite (the organic bite has none)
  window.__folhasNaMordida = 0;
  const d = s.destrocos;
  const morder = d.morder.bind(d);
  let dentro = false;
  d.morder = (...a) => {
    dentro = true;
    try {
      return morder(...a);
    } finally {
      dentro = false;
    }
  };
  const folha = s.fx.sheetSprite.bind(s.fx);
  s.fx.sheetSprite = (...a) => {
    if (dentro && s.boss && !s.boss.isDead) window.__folhasNaMordida++;
    return folha(...a);
  };
});

const passo = (n) => page.evaluate((n) => {
  const g = window.__game;
  for (let i = 0; i < n; i++) {
    if (!g.scene.isActive('Game')) return null;
    const s = g.scene.getScene('Game');
    const P = window.__passo;
    const b = s.boss;
    const vivo = b && !b.isDead && !b.entering;
    const alvo = vivo ? b.targets?.find((x) => x.active) : undefined;
    if (!s.over) {
      s.ship.setPosition(40, alvo ? alvo.y + Math.sin(P.seg * 1.3) * 8 : 108);
      s.ship.body.setVelocity(0, 0);
      if (alvo && Math.round(P.seg * 60) % 6 === 0) s.weapons.shoot(s.ship.x + 10, s.ship.y);
    }
    if (s.boss) {
      s.enemies.enemies.clear(true, true);
      s.enemies.enemyBullets?.clear(true, true);
    }
    P.t += 1000 / 60;
    P.seg += 1 / 60;
    g.step(P.t, 1000 / 60);
  }
  const s = g.scene.getScene('Game');
  const b = s.boss;
  if (!b) return { boss: false };
  const c = b.cabeca;
  const cic = s.destrocos.cicatrizes.get(b.sprite);
  return {
    boss: true,
    entrando: !!b.entering,
    morto: !!b.isDead,
    fase: b.faseIdx,
    vida: +(b.hpTotal / b.maxHpTotal).toFixed(3),
    imune: b.imune > 0,
    cab: c && c.active ? { x: +c.x.toFixed(1), y: +c.y.toFixed(1), vis: c.visible } : null,
    spr: { x: b.sprite.x, y: b.sprite.y, esc: b.sprite.scaleX },
    mord: s.destrocos.mordidas(b.sprite),
    // the last bite's start, in art px from the sprite's centre (`feridas` are kept in the first frame's bitmap)
    ferida: cic?.feridas.length ? { x: (cic.feridas.at(-1).x + 0.5 - cic.w / 2) / b.sprite.scaleX, y: (cic.feridas.at(-1).y + 0.5 - cic.h / 2) / b.sprite.scaleY } : null,
    folhas: window.__folhasNaMordida,
    seg: +window.__passo.seg.toFixed(2),
  };
}, n);

let r;
for (let i = 0; i < 1200; i++) {
  r = await passo(2);
  if (r && r.boss && !r.entrando) break;
}
await passo(10);

const foto = async (nome, centro) => {
  const W = 120, H = 90;
  const cx = Math.round(Math.min(384 - W / 2, Math.max(W / 2, centro.x)));
  const cy = Math.round(Math.min(216 - H / 2, Math.max(H / 2, centro.y)));
  const clip = { x: geo.left + (cx - W / 2) * geo.k, y: geo.top + (cy - H / 2) * geo.k, width: W * geo.k, height: H * geo.k };
  await sharp(await page.screenshot({ clip })).resize(W * 4, H * 4, { kernel: 'nearest' }).png().toFile(path.join(OUT, nome + '.png'));
};

const log = [];
const estrela = { cabecas: [], fusao: [] };
const mordidas = [];
let fase = -1, mord = 0, fim = 0, folhas = 0;
const depois = [];
for (let i = 0; i < 60 * 120; i++) {
  if (i % 3 === 0) {
    const st = await page.evaluate((d) => {
      const s = window.__game.scene.getScene('Game');
      const b = s.boss;
      if (!b || b.isDead) return 'morto';
      if (b.damage(d)) {
        s.killBoss();
        return 'morto';
      }
      return 'vivo';
    }, 0.8);
    if (st === 'morto' && !fim) fim = i;
  }
  r = await passo(2);
  if (!r) break;
  if (i % 15 === 0) log.push(r);
  folhas = Math.max(folhas, r.folhas ?? 0);
  if (r.boss && !r.morto && r.cab && !r.imune) (r.fase === 3 ? estrela.fusao : estrela.cabecas).push(r.cab.vis);
  if (r.boss && r.fase !== fase && !r.imune) {
    fase = r.fase;
    log.push({ evento: 'fase', ...r });
    if (fase < 3 && r.cab) {
      await foto(`f${fase}-a-inicio`, r.cab);
      depois.push({ i: i + 45, nome: `f${fase}-b-1.5s` });
    }
  }
  if (r.boss && !r.morto && r.mord > mord) {
    mord = r.mord;
    log.push({ evento: 'mordida', ...r });
    mordidas.push(r);
    depois.push({ i: i + 10, nome: `f${r.fase}-mordida${mord}` });
  }
  for (const d of depois.filter((d) => d.i === i)) if (r.cab) await foto(d.nome, r.cab);
  if (fim && i - fim > 60) break;
}
fs.writeFileSync(path.join(OUT, 'log.json'), JSON.stringify(log, null, 1));
for (const m of mordidas) {
  const f = m.ferida;
  console.log(`mordida ${m.mord}: forma ${m.fase}, vida ${m.vida}, aos ${m.seg} s, começa em (${f?.x.toFixed(1)}, ${f?.y.toFixed(1)}) px de arte`);
}
console.log(`a estrela: visível em ${estrela.cabecas.filter(Boolean).length}/${estrela.cabecas.length} quadros das cabeças, ${estrela.fusao.filter(Boolean).length}/${estrela.fusao.length} da fusão`);
console.log(`folhas de explosão dentro das mordidas: ${folhas}`);

if (NOVO) {
  ok(mordidas.length === 3, `três mordidas antes da morte (${mordidas.length})`);
  ok(mordidas.every((m) => m.fase === 3), `todas na fusão (${mordidas.map((m) => m.fase).join(', ')})`);
  const lim = [0.22, 0.13, 0.05];
  ok(mordidas.every((m, i) => m.vida <= lim[i] && m.vida > lim[i] - 0.04), `nos limiares 22%, 13%, 5% (${mordidas.map((m) => m.vida).join(', ')})`);
  mordidas.forEach((m, i) => {
    const f = m.ferida;
    const dist = PONTOS.map((p) => Math.hypot(f.x - p.x, f.y - p.y));
    const maisPerto = dist.indexOf(Math.min(...dist));
    ok(maisPerto === i && dist[i] < 30, `a ${i + 1}ª mordida começa no ${PONTOS[i].nome} (a ${dist[i].toFixed(1)} px de arte do ponto; o mais perto é o ${PONTOS[maisPerto].nome})`);
  });
  // (S1, 28/10 à noite: a estrela saiu de TODAS as formas — quem marca a cabeça viva são as veias)
  ok(estrela.cabecas.length > 0 && estrela.cabecas.every((v) => !v), 'a estrela não aparece nas formas de 3, 2 e 1 cabeça (S1)');
  ok(estrela.fusao.length > 0 && estrela.fusao.every((v) => !v), 'a estrela some na fusão');
  ok(folhas === 0, `nenhuma folha de explosão nas mordidas da fusão (${folhas})`);
}
await browser.close();
ok(erros.length === 0, `sem erro de página${erros.length ? `: ${erros.join(' | ')}` : ''}`);
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
