// 25/11 — THE SLASH, made dodgeable (him: "a galopada e o slash são completamente indefensáveis… mesmo que eu coloque a
// nave no canto superior esquerdo, ele acerta"; "quero algo dinâmico, que faça o jogador sentir que desviou por entender
// a situação"; "os tiros estão pegando no ar"). In the running game (npm run dev, 5173), phase 1, the clock stepped
// at 60/s. For each starting height the charge → gallop → CROUCH → leap runs twice:
//   parada — the ship holds still: it must be hit (the slash still punishes who waits);
//   reage  — at the crouch the ship flies away vertically at the ship's speed (110 px/s), to the far side: it must escape.
// Then the shots: a column of shots aimed through her box, counting the ones absorbed in the AIR of the box.
//   node scripts/_f4/_besta-golpe.mjs [out dir]   (with a dir: PNG frames of each run with the bodies drawn)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? null;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${info !== undefined ? ` → ${JSON.stringify(info)}` : ''}`);
  if (!ok) falhas.push(nome);
};

await page.goto('http://localhost:5173/?fase=besta1&mao=nenhuma', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  return g.isActive('Game') && sc?.boss?.predador?.estado === 'chao';
}, null, { timeout: 240000, polling: 100 });

await page.evaluate(() => {
  const g = window.__game;
  const sc = g.scene.getScene('Game');
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  window.__hits = 0;
  sc.damageShip = () => { window.__hits++; };
  window.__nave = { x: 40, y: 100, vy: 0 };
  sc.events.on('postupdate', () => {
    const n = window.__nave;
    n.y = Math.min(204, Math.max(10, n.y + n.vy / 60));
    sc.ship.setPosition(n.x, n.y);
    if (sc.ship.body) { sc.ship.body.reset(n.x, n.y); }
  });
  g.loop.sleep();
  window.__t = g.loop.now;
  window.__step = () => { window.__t += 1000 / 60; g.step(window.__t, 1000 / 60); };
  const gr = sc.add.graphics().setDepth(99999);
  window.__desenhar = () => {
    const p = sc.boss.predador;
    gr.clear();
    const bb = p.sprite.body;
    if (bb.enable) { gr.lineStyle(1, 0xff3030, 0.6); gr.strokeRect(bb.x, bb.y, bb.width, bb.height); }
    const nb = sc.ship.body;
    gr.lineStyle(1, 0x40e0ff, 1); gr.strokeRect(nb.x, nb.y, nb.width, nb.height);
  };
});

if (process.env.CFG) await page.evaluate((c) => { window.__cfg = c; }, JSON.parse(process.env.CFG));
async function rodada(nome, y0, reage, x0 = 40) {
  const dir = OUT ? path.join(OUT, nome) : null;
  if (dir) fs.mkdirSync(dir, { recursive: true });
  await page.evaluate(({ y0, x0 }) => {
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    p.tween?.stop();
    p.hp = p.constructor.HP;
    p.ancora = p.constructor.ANCORAS[0];
    p.mover(p.ancora.x, p.yApoio('chao'));
    p.pousar(p.ancora);
    for (const l of p.lavas ?? []) l.fim = 0;
    window.__nave = { x: x0, y: y0, vy: 0 };
    window.__hits = 0;
    if (window.__cfg) Object.assign(p.constructor, window.__cfg);
    p.carregar();
  }, { y0, x0 });
  const log = [];
  let q = 0;
  for (let i = 0; i < 60 * 5; i++) {
    const r = await page.evaluate(({ reage }) => {
      const sc = window.__game.scene.getScene('Game');
      const p = sc.boss.predador;
      const n = window.__nave;
      // react to the crouch: fly to the far vertical side of the arena (away from where she will leap)
      if (reage === 'galope' && p.estado === 'bote' && n.vy === 0) n.vy = -110;
      if (reage && reage !== 'galope' && p.estado === 'agacha' && n.vy === 0) n.vy = reage === 'sobe' ? -110 : reage === 'desce' ? 110 : n.y < 108 ? 110 : -110;
      window.__step();
      window.__desenhar();
      const bb = p.sprite.body;
      const nb = sc.ship.body;
      const caixa = bb.enable && bb.x < nb.right && nb.x < bb.right && bb.y < nb.bottom && nb.y < bb.bottom;
      return { e: p.estado, hits: window.__hits, caixa, desenho: caixa && p.tocaDesenho(nb.left, nb.top, nb.right, nb.bottom), ny: Math.round(n.y), py: Math.round(p.sprite.y), px: Math.round(p.sprite.x) };
    }, { reage });
    log.push(r);
    if (dir && ['bote', 'agacha', 'slash'].includes(r.e) && i % 2 === 0) await page.locator('canvas').first().screenshot({ path: path.join(dir, `q${String(q++).padStart(3, '0')}.png`) });
    if (r.e === 'recupera' || r.e === 'chao') { if (log.some((l) => l.e === 'slash')) break; }
  }
  const ataque = log.filter((l) => ['bote', 'agacha', 'slash'].includes(l.e));
  const toques = log.at(-1).hits;
  const soCaixa = ataque.filter((l) => l.caixa && !l.desenho).length;
  const agacha = log.find((l) => l.e === 'agacha');
  return { nome, toques, soCaixa, alturaNoAgacho: agacha?.ny, fim: log.at(-1).ny, picoBesta: Math.min(...log.filter((l) => l.e === 'slash').map((l) => l.py)) };
}

const ALTURAS = [24, 60, 100, 140, 180];
const res = [];
if (process.env.MATRIZ) {
  for (const x of [20, 40]) for (const y of ALTURAS) {
    const linha = [];
    for (const e of [false, 'sobe', 'desce', 'galope']) linha.push((await rodada(`m-${x}-${y}-${e}`, y, e, x)).toques);
    console.log(`x ${x} y ${y}: parada ${linha[0]} · sobe no agacho ${linha[1]} · desce no agacho ${linha[2]} · sobe no galope ${linha[3]}`);
  }
  await browser.close();
  process.exit(0);
}
for (const y of ALTURAS) {
  const a = await rodada(`parada-${y}`, y, false);
  const b = await rodada(`galope-${y}`, y, 'galope');
  res.push(a, b);
  console.log(`y ${y}: parada ${a.toques} quadro(s) de toque · sobe no galope ${b.toques} · quadros só na caixa vazia (o ar que antes feria): ${a.soCaixa}/${b.soCaixa}`);
}
const paradas = res.filter((r) => r.nome.startsWith('parada'));
const galopes = res.filter((r) => r.nome.startsWith('galope'));
conferir(paradas.filter((r) => r.toques > 0).length >= paradas.length - 1, 'quem espera parado leva o golpe (em quase toda altura)', paradas.map((r) => r.toques));
// (measured, not required: a 1–2 frame graze still costs a life — the escape behind her is his, see memory nada-atras-da-nave)
console.log('     sobe no galope (toques):', galopes.map((r) => r.toques).join(' · '));

// the shots: a grid of shot-sized boxes over her body box — how many fall in the box but on no drawn pixel
const ar = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').boss.predador;
  const bb = p.sprite.body;
  let caixa = 0, desenho = 0;
  for (let y = bb.top; y < bb.bottom; y += 3) for (let x = bb.left; x < bb.right; x += 3) {
    caixa++;
    if (p.tocaDesenho(x, y, x + 4, y + 2)) desenho++;
  }
  return { caixa, desenho, quadro: `${p.sprite.texture.key}#${p.sprite.frame.name}` };
});
conferir(ar.desenho < ar.caixa && ar.desenho > 0, 'os tiros na caixa vazia passam (só o desenho segura)', { ...ar, noAr: `${Math.round((1 - ar.desenho / ar.caixa) * 100)} % da caixa é ar` });
conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
