// THE CABLE-SERPENTS IN GAME (spec 2026-11-22-guardiao-coleira-design.md §6 and §8). npm run dev, then
//   node scripts/test-guardiao-serpente-jogo.mjs [--porta 5173]
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
await page.waitForFunction(() => {
  const g = window.__game.scene;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering && s.boss.acao === 'flutua';
}, null, { timeout: 120000, polling: 250 });
await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  // a TOUCH is a rising edge of "damageShip was called in this step"
  window.__tocou = false;
  s.damageShip = () => { window.__tocou = true; };
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  window.__step = () => {
    window.__tocou = false;
    window.__passo.t += 1000 / 60;
    g.step(window.__passo.t, 1000 / 60);
    return window.__tocou;
  };
});

// ── one serpent action at a life step: the ship still, or reading the strike (it steps aside at every lock) ──
const rodar = (vida, le) =>
  page.evaluate(({ vida, le }) => {
    const s = window.__game.scene.getScene('Game');
    const b = s.boss;
    const C = b.constructor;
    b.hpGuardiao = C.HP_GUARDIAO * vida;
    b.serra?.destroy?.();
    b.serra = null;
    b.acao = 'flutua';
    b.proxima = 'serpentes';
    b.acaoT = 0;
    b.cdTiro = 99;
    const casa = { x: 80, y: 110 };
    s.ship.setPosition(casa.x, casa.y);
    const balas = () => s.enemies.enemyBullets.getChildren().filter((o) => o.active).length;
    for (let i = 0; i < 30 && b.acao !== 'serpentes'; i++) window.__step();
    const n = b.serpentes.lista.length;
    const x0 = b.sprite.x;
    let juntas = 0, botes = 0, toques = 0, antes = false, maxX = 0, maxBalas = 0, dano = null, quadros = 0;
    const fases = new Map();
    const desvio = new Set();
    // the bottom root rides with him: (drawn root − body) stays put, and the body keeps a reduced sway
    const raizB = () => { const c = b.serpentes.lista[1].corpo(); return c.length ? c[c.length - 1] : null; };
    let rel0 = null, maxRel = 0, yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i < 60 * 40 && b.acao === 'serpentes'; i++) {
      const L = b.serpentes.lista;
      if (le) {
        // at the first frame of each lock the ship steps 60 px off the strike line (perpendicular to it), to the side with
        // more room — the walls and the other heads standing at their posts; home after the recoil
        for (const sp of L) {
          if (sp.fase !== 'trava' || desvio.has(sp)) continue;
          desvio.add(sp);
          const dx = sp.alvo.x - sp.cabeca.x, dy = sp.alvo.y - sp.cabeca.y, d = Math.hypot(dx, dy) || 1;
          const lado = (k) => {
            const x = s.ship.x - (dy / d) * 60 * k, y = s.ship.y + (dx / d) * 60 * k;
            const cab = L.filter((o) => o !== sp && !o.acabou).map((o) => Math.hypot(o.cabeca.x - x, o.cabeca.y - y) - 26);
            return { x, y, folga: Math.min(x - 16, 170 - x, y - 14, 202 - y, ...cab) };
          };
          const a = lado(1), b = lado(-1), m = a.folga >= b.folga ? a : b;
          s.ship.setPosition(m.x, m.y);
        }
        if (!L.some((sp) => sp.atacando)) { desvio.clear(); s.ship.setPosition(casa.x, casa.y); }
      }
      const t = window.__step();
      if (t && !antes) toques++;
      antes = t;
      quadros++;
      if (L.filter((sp) => sp.atacando).length > 1) juntas++;
      for (const sp of L) {
        if (sp.fase === 'bote' && fases.get(sp) !== 'bote') botes++;
        fases.set(sp, sp.fase);
      }
      // from where the action began (the entry stops up to one frame past the station: a fixed offset, not motion)
      maxX = Math.max(maxX, Math.abs(b.sprite.x - x0));
      if (i > 60) { yMin = Math.min(yMin, b.sprite.y); yMax = Math.max(yMax, b.sprite.y); }
      const r = raizB();
      if (r) {
        const rel = { x: r.x - b.sprite.x, y: r.y - b.sprite.y };
        if (!rel0) rel0 = rel;
        else maxRel = Math.max(maxRel, Math.hypot(rel.x - rel0.x, rel.y - rel0.y));
      }
      maxBalas = Math.max(maxBalas, balas());
      if (i === 200 && dano === null) {
        const h0 = b.hpGuardiao;
        b.damage(1);
        dano = h0 - b.hpGuardiao;
      }
    }
    const ligados = s.boss.perigos.getChildren().filter((o) => o.getData('serpente') && o.body.enable).length;
    return { maxRel, balanco: yMax - yMin, n, juntas, botes, toques, maxX, maxBalas, dano, acao: b.acao, ligados, quadros, y: b.sprite.y, yBase: C.G_BASE_Y };
  }, { vida, le });

const d1 = await rodar(0.5, false);
conferir(d1.n === 2, '66–33%: duas serpentes', d1.n);
conferir(d1.juntas === 0, '66–33%: nunca duas atacando ao mesmo tempo', d1.juntas);
conferir(d1.botes === 4, '66–33%: 4 botes (2 por serpente)', d1.botes);
conferir(d1.maxX < 0.5, 'ele não sai da estação', d1.maxX);
conferir(d1.maxRel < 0.5, 'a raiz de baixo acompanha o corpo dele (nada de corda presa)', d1.maxRel);
conferir(d1.balanco > 4 && d1.balanco < 14, 'ele segue balançando, reduzido (16 px → ~5 de amplitude)', d1.balanco);
conferir(d1.maxBalas === 0, 'sem salva nem lava durante as serpentes', d1.maxBalas);
conferir(d1.toques >= 1, 'a nave PARADA é atingida', d1.toques);
conferir(d1.dano === 1, 'a janela: o miolo aberto toma dano nas serpentes', d1.dano);
conferir(d1.acao === 'flutua', 'no fim ele volta a flutuar', d1.acao);
conferir(d1.ligados === 0, 'no fim nada mais fere', d1.ligados);
console.log(`     66–33%: ${(d1.quadros / 60).toFixed(1)} s de ação`);

const d2 = await rodar(0.2, false);
conferir(d2.n === 2, '33–0%: as mesmas duas serpentes (nada de 3ª)', d2.n);
conferir(d2.juntas === 0, '33–0%: nunca duas atacando ao mesmo tempo', d2.juntas);
conferir(d2.botes === 4, '33–0%: 4 botes (2 por serpente, ele: "duas serpentes, 2 botes cada")', d2.botes);
console.log(`     33–0%: ${(d2.quadros / 60).toFixed(1)} s de ação`);

const le = await rodar(0.5, true);
conferir(le.toques === 0, 'a nave que sai da reta na trava não é atingida', le.toques);

// ── the rotation in game, at 66–33%: lunge → saw → serpents ──
const ordem = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const b = s.boss;
  b.hpGuardiao = b.constructor.HP_GUARDIAO * 0.5;
  b.acao = 'flutua';
  b.proxima = 'investida';
  b.acaoT = 0;
  b.cdTiro = 99;
  s.ship.setPosition(60, 110);
  const vistos = [];
  let antes = b.acao;
  for (let i = 0; i < 60 * 80 && vistos.length < 4; i++) {
    if (b.acao === 'flutua') { b.acaoT = Math.min(b.acaoT, 0.2); b.cdTiro = 99; }
    window.__step();
    if (b.acao !== antes && ['telegrafo', 'serra', 'serpentes'].includes(b.acao)) vistos.push(b.acao);
    antes = b.acao;
  }
  return vistos;
});
conferir(ordem.join(',') === 'telegrafo,serra,serpentes,telegrafo', 'o rodízio de 66–33%: investida → serra → serpentes', ordem);
conferir(erros.length === 0, 'nenhum erro de página', erros);

await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
