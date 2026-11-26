// 25/11 — THE SLOW WALL in the running game (npm run dev, 5173), phase 2 (`besta2`): the return reaches the middle of
// the right wall, she pushes out the slab and holds there while it crosses. For each of the three corridors:
//   segue  — the ship (its hull box) at x 60 rides the corridor at ≤ 110 px/s: it must take NO hit;
//   parada — the ship holds still at a height the corridor leaves: it must be hit.
// Also: no corner strike any more, the slab leaves by the left edge, the return ends in the rip, no console error.
//   node scripts/_f4/_besta-parede.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${info !== undefined ? ` → ${JSON.stringify(info)}` : ''}`);
  if (!ok) falhas.push(nome);
};

await page.goto('http://localhost:5173/?fase=besta2&mao=nenhuma', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  if (!g.isActive('Game') || !sc?.boss?.predador) return false;
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  return true;
}, null, { timeout: 240000, polling: 100 });
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'chao', null, { timeout: 60000, polling: 50 });
// the ship: its HULL BOX centre is driven (the box sits off the sprite's centre)
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  window.__alvo = { x: 60, y: 100 };
  window.__off = { x: 0, y: 0 };
  // the sprite is placed; the physics step places the body from it (never `body.reset`: it puts the box elsewhere)
  sc.events.on('postupdate', () => {
    sc.ship.setPosition(window.__alvo.x - window.__off.x, window.__alvo.y - window.__off.y);
    sc.ship.body.setVelocity(0, 0);
  });
});
await page.waitForTimeout(500);
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  const nb = sc.ship.body;
  window.__off = { x: nb.x + nb.width / 2 - sc.ship.x, y: nb.y + nb.height / 2 - sc.ship.y };
});

async function umaParede(nome, segue) {
  await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'chao', null, { timeout: 60000, polling: 50 });
  const r = await page.evaluate(async (segue) => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    for (const l of p.lavas) if (l.b.active) { l.b.setData('lava', false); sc.enemies.release(l.b); }
    window.__alvo = { x: 60, y: 100 };
    let hits = 0;
    const fonte = [];
    sc.damageShip = () => {
      hits++;
      const nb = sc.ship.body;
      if (fonte.length < 3) fonte.push({ trecho: p.trechoAtual?.nome, est: p.estado, nave: [Math.round(nb.x), Math.round(nb.y), nb.width, nb.height], besta: [Math.round(p.sprite.x), Math.round(p.sprite.y), p.sprite.texture.key + '#' + p.sprite.frame.name], corpo: p.tocaDesenho(nb.left, nb.top, nb.right, nb.bottom, true), pecas: p.lavas.filter((l) => l.b.active && Math.abs(l.b.x - (nb.x + 10)) < 24 && Math.abs(l.b.y - (nb.y + 4)) < 20).map((l) => [Math.round(l.b.x), Math.round(l.b.y), l.b.getData('parede'), l.tipo]) });
    };
    const nomes = [];
    let figura = null;
    const lancar = p.lancarParede.bind(p);
    p.lancarParede = () => { figura = p.constructor.prototype && null; lancar(); };
    p.estadoT = 999;
    p.volta();
    const PAREDE_VEL = 55;
    let parado = null;
    let saiu = true;
    let maxPecas = 0;
    await new Promise((res) => {
      const tick = () => {
        const t = p.trechoAtual?.nome;
        if (t && nomes.at(-1) !== t) nomes.push(t);
        const pecas = p.lavas.filter((l) => l.b.active && l.b.getData('parede'));
        maxPecas = Math.max(maxPecas, pecas.length);
        if (pecas.length) {
          // the columns by x; the corridor at the ship's x: the gap of the column nearest in front / over the ship
          const cols = new Map();
          for (const l of pecas) { const k = Math.round(l.b.x / 4); (cols.get(k) ?? cols.set(k, []).get(k)).push(l.b); }
          const colunas = [...cols.values()].map((bs) => {
            const ys = bs.map((b) => b.y).sort((a, b) => a - b);
            let melhor = { g: 0, c: 100 };
            const borda = ys;
            for (let i = 1; i < borda.length; i++) { const g = borda[i] - borda[i - 1]; if (g > melhor.g) melhor = { g, c: (borda[i] + borda[i - 1]) / 2 }; }
            return { x: bs[0].x, vao: melhor.c };
          }).sort((a, b) => a.x - b.x);
          if (segue) {
            // ride the tube: the column not yet past the ship, and the next — sit where their gaps overlap (the midpoint
            // of the two centres: inside both), as a player threads it
            const nb = sc.ship.body;
            const i = colunas.findIndex((c) => c.x + 5 > nb.x);
            if (i >= 0) {
              const alvoY = (colunas[i].vao + (colunas[i + 1]?.vao ?? colunas[i].vao)) / 2;
              window.__rastro = window.__rastro ?? [];
              window.__rastro.push({ i, alvoY: Math.round(alvoY), naveY: Math.round(nb.y + nb.height / 2), naveX: Math.round(nb.x), cols: colunas.slice(0, 3).map((c) => [Math.round(c.x), Math.round(c.vao)]), hits });
              if (window.__rastro.length > 400) window.__rastro.shift();
              const dy = alvoY - (nb.y + nb.height / 2);
              const v = 110 / 60;
              window.__alvo.y += Math.abs(dy) <= v ? dy : Math.sign(dy) * v;
            }
          } else if (parado === null) {
            // stand where the FIRST column is closed (the gap far from it)
            parado = colunas[0].vao > 100 ? 40 : 160;
            window.__alvo.y = parado;
          }
          if (pecas.some((l) => l.b.x < -12)) saiu = false;
        }
        if (p.estado === 'rasgo' || p.estado === 'recupera' || p.estado === 'chao') return res();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const rastro = (window.__rastro ?? []);
    const k = rastro.findIndex((q) => q.hits > 0);
    window.__rastro = [];
    return { rastroHit: k >= 0 ? rastro.slice(Math.max(0, k - 6), k + 1) : null, hits, fonte, nomes, maxPecas, sobrou: p.lavas.filter((l) => l.b.active && l.b.getData('parede')).length, estado: p.estado };
  }, segue);
  if (segue) {
    conferir(!r.nomes.some((n) => n.startsWith('canto')) && r.nomes.includes('parede'), `${nome}: nenhum golpe de canto; a parede lenta sai do meio da parede`, r.nomes);
    conferir(r.maxPecas >= 40, `${nome}: a laje tem ${r.maxPecas} lascas no ar`, r.maxPecas);
    conferir(r.hits === 0, `${nome}: quem segue o corredor não toma dano`, { hits: r.hits, fonte: r.fonte, rastro: r.rastroHit });
    conferir(r.sobrou === 0, `${nome}: a laje já saiu pela esquerda quando ela rasga o chão`, r.sobrou);
  } else {
    conferir(r.hits > 0, `${nome}: quem fica parado leva a laje`, r.hits);
  }
}

for (let i = 0; i < 3; i++) await umaParede(`parede-${i + 1}`, true);
await umaParede('parede-parada', false);
conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
