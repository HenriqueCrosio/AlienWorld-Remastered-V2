// THE FIGHT RECORDER IN THE GAME (spec 2026-11-26-medicao-das-lutas §3, §8): `?fase=besta3&registro`, the ship held
// aligned with her core and firing for real for 3 s, two blows forced through the scene's `damageShip` with a known
// cause, then she is killed. The summary has to show the phase, the two blows with their cause, the shots and the hits,
// the damage and the samples — and the fight closed.
//   node scripts/test-registro-jogo.mjs [porta=5173]
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
await page.goto(`http://localhost:${PORTA}/?fase=besta3&mao=nenhuma&registro`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  return g.isActive('Game') && sc?.boss?.predador && window.__registro;
}, null, { timeout: 240000, polling: 100 });
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss.predador; return p.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  const p = sc.boss.predador;
  p.estadoT = -999; // she stays grounded while the ship shoots
  sc.events.on('postupdate', () => {
    if (sc.boss?.isDead) return;
    const nb = sc.ship.body;
    const oy = nb.y + nb.height / 2 - sc.ship.y;
    sc.ship.setPosition(Math.max(30, sc.boss.core.x - 90), sc.boss.core.y - oy);
    nb.setVelocity(0, 0);
  });
});
await page.keyboard.down('Space');
await page.waitForTimeout(3000);
await page.keyboard.up('Space');
const r = await page.evaluate(async () => {
  const sc = window.__game.scene.getScene('Game');
  for (let i = 0; i < 2; i++) {
    sc.invulnerableUntil = 0;
    sc.semDanoAte = 0;
    sc.damageShip(undefined, undefined, 'teste');
  }
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  sc.boss.predador.vistas.add('coracao');
  sc.boss.damage(99999);
  await new Promise((res) => setTimeout(res, 300));
  return window.__registro.resumo();
});
const f3 = r.fases.find((f) => f.fase === 'besta3');
conferir(r.comecou && r.terminou, 'a luta começou e terminou', { comecou: r.comecou, terminou: r.terminou });
conferir(!!f3, 'a fase besta3 está no registro', r.fases.map((f) => f.fase));
conferir(r.total.golpes === 2 && r.total.porCausa.teste === 2, 'os dois golpes, com a causa', r.total.porCausa);
conferir(r.total.disparos > 10, 'os tiros disparados', r.total.disparos);
conferir(r.total.acertos > 0 && r.total.acertos <= r.total.disparos, 'os acertos (0 < acertos ≤ disparos)', [r.total.acertos, r.total.disparos]);
conferir(r.total.dano > 0, 'o dano nela', r.total.dano);
conferir(f3 && f3.s > 3, 'o tempo da fase', f3?.s);
conferir(r.total.ameacasMedia >= 0 && r.total.areaMedia >= 0 && r.total.respiroMax > 0, 'as amostras de ameaça', { m: r.total.ameacasMedia, a: r.total.areaMedia, resp: r.total.respiroMax });
conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log(JSON.stringify(r.total));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
