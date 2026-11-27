// THE HULL'S CAP PER STAGE, IN THE GAME (27/11, the rebalance: "you have the regen, but it breaks at some point. It
// renews on the next stage"): `?fase=guardiao1&mao=mediana` (the medium hand holds the Hull), blows forced through the
// scene's `damageShip`, the recharge skipped by hand. The Hull absorbs `porFase` blows, then never comes back in the
// stage and the next blow costs a life; the HUD shows how many are left; a fresh stage starts full again.
//   node scripts/test-casco-teto-jogo.mjs [porta=5173]
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

const entrar = async () => {
  await page.waitForFunction(() => {
    const g = window.__game?.scene;
    if (!g) return false;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const sc = g.getScene('Game');
    return g.isActive('Game') && sc?.cartas && sc.boss;
  }, null, { timeout: 240000, polling: 100 });
};

await page.goto(`http://localhost:${PORTA}/?fase=guardiao1&mao=mediana`, { waitUntil: 'domcontentloaded' });
await entrar();

const r = await page.evaluate(async () => {
  const sc = window.__game.scene.getScene('Game');
  const quadros = (n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const teto = sc.cartas.cascoRestantes;
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER; // nothing of the fight touches the ship between the forced blows
  const golpe = () => {
    sc.invulnerableUntil = 0;
    sc.semDanoAte = 0;
    sc.damageShip(undefined, undefined, 'teste');
    sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  };
  const passos = [];
  const hud0 = sc.hud.text;
  for (let i = 0; i < teto; i++) {
    const antes = sc.lives;
    golpe();
    passos.push({ absorveu: sc.lives === antes, restam: sc.cartas.cascoRestantes });
    sc.cartas.cascoVoltaEm = 0; // skip the recharge
    await quadros(4);
    passos[i].voltou = sc.cartas.cascoAtivo;
  }
  const vidasAntes = sc.lives;
  golpe();
  return { teto, hud0, passos, voltouNoFim: sc.cartas.cascoAtivo, perdeuVida: sc.lives === vidasAntes - 1 };
});

conferir(r.teto === 3, 'o teto por fase é 3', r.teto);
conferir(/CASCO 3/.test(r.hud0), 'a HUD mostra quantos restam', r.hud0);
conferir(r.passos.every((p) => p.absorveu), 'os 3 golpes absorvidos sem perder vida', r.passos);
conferir(r.passos.slice(0, -1).every((p) => p.voltou), 'ele volta depois dos dois primeiros', r.passos.map((p) => p.voltou));
conferir(r.passos[r.passos.length - 1].voltou === false && r.voltouNoFim === false, 'depois do 3º ele não volta mais na fase');
conferir(r.perdeuVida, 'o 4º golpe custa uma vida');

// A fresh stage (the scene starts again, as on every stage and every retry) comes back with the full cap.
await page.evaluate(() => {
  const sc = window.__game.scene.getScene('Game');
  sc.scene.restart();
});
await page.waitForTimeout(500);
await entrar();
const depois = await page.evaluate(() => window.__game.scene.getScene('Game').cartas.cascoRestantes);
conferir(depois === 3, 'a fase nova começa com o teto cheio', depois);

conferir(erros.length === 0, 'sem erro na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
