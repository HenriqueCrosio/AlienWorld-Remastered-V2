// 27/10 — A SONDA DOS DESTROÇOS NOS CHEFÕES: each boss's whole fight in the practice arena, damaged step by step,
// checking what the debris engine did with it.
//   - the tower: bites only on what its ground and air arts share (y < 70 of the 145 drawn), and its approved death;
//   - the serpent: a new art (a head died) leaves no scar behind; it dies in its own pixels (D1);
//   - the guardian: holes in the shell, gone when the predator takes the sprite; the predator: bites WITHOUT a hole;
//   - the dolphin: bites without a hole, and the C1 death.
//   node scripts/_inimigos/_sonda-chefes.mjs [torre|serpente|nucleo|golfinho …]   (with `npm run dev` running)
import { chromium } from 'playwright';

const QUAIS = process.argv.slice(2).length ? process.argv.slice(2) : ['torre', 'serpente', 'nucleo', 'golfinho'];
let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'ok  ' : 'FALHA'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => { erros.push(String(e)); console.log('ERRO DE PÁGINA', String(e)); });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);

async function abrir(stage, treino) {
  // a fresh page per boss (after the serpent's death the next phase did not start in the same page)
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(({ stage, treino }) => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    // (the scene object is reused: without this, the wait below sees the last run's cards and resolves too early)
    const velha = g.scene.getScene('Game');
    if (velha) velha.cartas = null;
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.registry.set('destrocosVariantes', undefined);
    g.scene.start('Game', { stage, ship: 'humana', handling: 'diegetico', practice: treino });
  }, { stage, treino });
  // the practice run starts past the mid-phase table's second: it may open (and pause the phase) at any of the first
  // frames — closed until the phase runs with it switched off
  for (let k = 0; k < 200; k++) {
    const r = await page.evaluate(() => {
      const g = window.__game, s = g.scene.getScene('Game');
      const estado = g.scene.getScenes(false).filter((x) => x.sys.settings.status > 0).map((x) => `${x.scene.key}:${x.sys.settings.status}`).join(' ');
      if (!s?.cartas) return { pronto: false, estado };
      s.cartas.abrirMesa = () => {};
      if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
      if (g.scene.isPaused('Game')) g.scene.resume('Game');
      s.invulnerableUntil = 1e12;
      s.lives = 99;
      s.victory = () => {};
      return { pronto: g.scene.isActive('Game') && !g.scene.isActive('Cartas'), estado };
    });
    if (r.pronto) return;
    if (k === 199) throw new Error(`a fase não rodou: ${r.estado}`);
    await page.waitForTimeout(100);
  }
}

/** The practice run's boss arrives (1 s) and glides in; says the scene's state if it does not. */
async function esperarChefe() {
  let r;
  for (let k = 0; k < 600; k++) {
    r = await page.evaluate(() => {
      const g = window.__game, s = g.scene.getScene('Game');
      if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
      if (g.scene.isPaused('Game')) g.scene.resume('Game');
      return { pronto: !!s?.boss && !s.boss.entering, elapsed: s?.elapsed, boss: !!s?.boss, over: s?.over, cenas: g.scene.getScenes(true).map((x) => x.scene.key).join(' ') };
    });
    if (r.pronto) return;
    await page.waitForTimeout(100);
  }
  throw new Error(`o chefão não chegou: ${JSON.stringify(r)}`);
}

/** What the engine holds for the boss now. */
const ler = () => page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const b = s.boss, d = s.destrocos;
  if (!b) return null;
  const cic = d.cicatrizes.get(b.sprite);
  let furos = 0;
  furos = d.furosDe(b.sprite);
  return { vida: b.destrocos?.vida, forma: b.destrocos?.forma, quem: b.destrocos?.quem, mordidas: d.mordidas(b.sprite), furos, h: cic?.h, feridas: cic?.feridas.map((f) => f.y) ?? [], ativo: d.ativo, morto: b.isDead };
});

/** Damage the boss by `passo` every 60 ms until `ate(estado)`; kills go through the scene's `killBoss`. */
async function bater(passo, ate, max = 900) {
  const vistos = [];
  for (let k = 0; k < max; k++) {
    await page.evaluate((passo) => {
      const s = window.__game.scene.getScene('Game');
      s.enemies.enemyBullets?.clear(true, true);
      s.enemies.enemies.clear(true, true);
      const b = s.boss;
      if (!b || b.isDead) return;
      // the hit's mark first (a shot from the left, at a random height), as `bulletHitBoss` does
      s.marcarChefe('tiro', { x: b.sprite.x - b.sprite.displayWidth * 0.6, y: b.sprite.y + (Math.random() - 0.5) * b.sprite.displayHeight * 0.5 });
      if (b.damage(passo)) s.killBoss();
    }, passo);
    await page.waitForTimeout(60);
    const e = await ler();
    if (e) vistos.push(e);
    if (!e || ate(e)) return vistos;
  }
  return vistos;
}

if (QUAIS.includes('torre')) {
  await abrir(1, true);
  await esperarChefe();
  const meio = await bater(2, (e) => e.vida <= 0.3);
  ok(meio.at(-1)?.mordidas === 0 && meio.at(-1)?.furos > 0, `Torre: até 30% de vida, só as marcas dos tiros (${meio.at(-1)?.furos} px) e nenhum pedaço grande (${meio.at(-1)?.mordidas})`);
  const v = await bater(2, (e) => e.vida <= 0.05);
  const ult = v.at(-1);
  ok(ult?.mordidas === 2, `Torre: os dois pedaços grandes perto da morte, em 15% e 6% (${ult?.mordidas})`);
  ok(ult?.feridas.every((y) => y < 70), `Torre: na cabeça e no ombro, que as duas formas têm (y ${ult?.feridas.map((y) => y | 0).join(', ')} < 70)`);
}

if (QUAIS.includes('serpente')) {
  await abrir(3, true);
  await esperarChefe();
  const v = await bater(2, (e) => e.morto);
  // the frame right after an art change carries no scar from the old art
  const trocas = v.filter((e, i) => i > 0 && e.forma !== v[i - 1].forma);
  ok(trocas.length === 3, `Serpente: três trocas de arte (${trocas.length})`);
  ok(trocas.every((e) => e.furos === 0), `Serpente: a arte nova nasce sem as marcas da velha (${trocas.map((e) => e.furos).join(', ')})`);
  ok(v.every((e) => e.forma === 3 || e.mordidas === 0), 'Serpente: nenhum pedaço grande nas cabeças (só as marcas)');
  ok(v.some((e) => e.forma === 3 && e.mordidas === 2), 'Serpente: os dois pedaços grandes na fusão, perto da morte');
  await page.waitForTimeout(1500);
  const morte = await page.evaluate(() => window.__game.scene.getScene('Game').destrocos.ativo);
  ok(morte, 'Serpente: a morte é a ruptura nos próprios pixels (os destroços no ar 1,5 s depois)');
}

if (QUAIS.includes('nucleo')) {
  await abrir(4, true);
  await esperarChefe();
  const g = await bater(2, (e) => e.quem === 'guardiao' && e.vida <= 0.1);
  ok(g.at(-1)?.furos > 0 && g.at(-1)?.mordidas === 1, `Guardião: as marcas na casca (${g.at(-1)?.furos} px) e um pedaço grande em 15% (${g.at(-1)?.mordidas})`);
  const t = await bater(2, (e) => e.quem === 'predador');
  ok(t.at(-1)?.quem === 'predador' && t.at(-1)?.furos === 0, `Predador: a troca leva os buracos do guardião (${t.at(-1)?.furos})`);
  const p = await bater(2, (e) => e.vida <= 0.3, 1500);
  ok(p.at(-1)?.vida <= 0.3 && p.every((e) => e.furos === 0), `Predador: mordido até ${Math.round((p.at(-1)?.vida ?? 1) * 100)}% sem nenhum buraco`);
}

if (QUAIS.includes('golfinho')) {
  await abrir(4, false);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.elapsed = 39.6;
    s.director.skipTo(39.6);
    s.aplicaCorredorEMoldura(39.6);
    s.hazardRate = 0;
    s.propRate = 0;
    s.spawnGolfinho('sobe', 49.5);
  });
  let estado = null, mordeu = false;
  for (let k = 0; k < 1500; k++) {
    estado = await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      s.enemies.enemyBullets?.clear(true, true);
      s.enemies.enemies.clear(true, true);
      const g = s.golfinho;
      if (!g) return { morto: true, ativo: s.destrocos.ativo };
      if (g.vulneravel && g.damage(1)) s.matarGolfinho();
      return { morto: !s.golfinho, vida: g.hp / 50, cic: !!s.destrocos.cicatrizes.get(g.sprite), ativo: s.destrocos.ativo };
    });
    if (estado.cic) mordeu = true;
    if (estado.morto) break;
    await page.waitForTimeout(60);
  }
  ok(estado?.morto, 'golfinho: morreu');
  ok(!mordeu, 'golfinho: mordido sem buraco (nenhuma cicatriz no sprite)');
  ok(estado?.ativo, 'golfinho: a morte é a C1, nos próprios pixels');
}

await browser.close();
ok(erros.length === 0, `sem erro de página${erros.length ? `: ${erros.join(' | ')}` : ''}`);
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
