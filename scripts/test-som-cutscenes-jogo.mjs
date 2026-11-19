// BLOCK SOUND (17/11) — sheet 7 (the cutscenes) IN THE GAME, fast-forwarded with the game's own `avancoRapido`: the F1's
// way out (the ship's own sound, the acoustics opening to the cabin), the Aurora, the Dock, the Leviathan's hangar and
// the final cutscene (chapter by chapter, the place moving with the camera). The card tables are chosen with Enter.
//   npm run dev  in another terminal, then  node scripts/test-som-cutscenes-jogo.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const porta = process.argv.includes('--porta') ? process.argv[process.argv.indexOf('--porta') + 1] : '5173';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1200);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());
const diag = () => page.evaluate(() => window.__som.diagnostico());
const desde = async () => (await diag()).tocados.length;
const novos = async (n0) => (await diag()).tocados.slice(n0);
const ativa = (k) => page.waitForFunction((x) => window.__game.scene.isActive(x), k, { timeout: 30000 }).then(() => true, () => false);
const cena = (k, dados) => page.evaluate(([x, d]) => { const g = window.__game; g.scene.getScenes(true)[0].scene.start(x, d); }, [k, dados]);
const rapido = (k, v) => page.evaluate(async ([x, f]) => { const { avancoRapido } = await import('/src/pausa/avancoRapido.ts'); avancoRapido(window.__game.scene.getScene(x), f); }, [k, v]);
const antes = (t, a, b) => t.indexOf(a) >= 0 && t.indexOf(a) < t.indexOf(b);
/** waits for `nome` to be played since `n0`, confirming with Enter whatever asks (the Dock's ship panel, a card table)
 *  — the choice resets the fast-forward, so it is put back */
async function esperar(n0, nome, ms, chave) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if ((await novos(n0)).includes(nome)) return true;
    const pede = await page.evaluate((k) => window.__game.scene.isActive('Cartas') || !!window.__game.scene.getScene(k)?.panel, chave);
    if (pede) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      if (chave) await rapido(chave, 3);
    }
    await page.waitForTimeout(150);
  }
  return false;
}

// ── the F1's way out ──
await cena('Game', { stage: 1, ship: 'interceptor' });
await page.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.ship?.active; }, null, { timeout: 30000 });
await page.waitForTimeout(800);
let n = await desde();
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; s.breakAtmosphere(); });
await page.waitForTimeout(400);
let t = await novos(n);
const nave = await page.evaluate(() => window.__game.scene.getScene('Game').naveSom);
ok(t.includes(`momento.f1.saida.${nave}`), `the way out of the atmosphere: the ${nave}'s own sound`, t);
ok((await diag()).lugar === 'cabine', 'the climb OPENS the acoustics to space (the cabin)', (await diag()).lugar);

// ── cutscene 1, the Aurora ──
n = await desde();
await cena('Interlude', { score: 1000, handling: 'diegetico' });
await ativa('Interlude');
await rapido('Interlude', 3);
ok(await esperar(n, 'cut.decolagem.xaelo', 40000, 'Interlude') || (await novos(n)).some((x) => x.startsWith('cut.decolagem.')), 'the Aurora runs to the departure');
t = await novos(n);
ok(antes(t, 'cut.piloto', 'cut.aurora.capitania') || (t.includes('cut.piloto') && t.includes('cut.aurora.capitania')), 'the autopilot and the Aurora rising', t);
const descida = t.find((x) => x.startsWith('cut.pouso.descida.'));
const toque = t.find((x) => x.startsWith('cut.pouso.toque.'));
ok(descida && toque && antes(t, descida, toque), `the landing: the descent, then the touch (${descida}, ${toque})`, t);
ok(t.some((x) => x.startsWith('nave.') && x.endsWith('.motor')), 'the ship\'s own ENGINE while it flies in', t);

// ── cutscene 2, the Dock ──
n = await desde();
await cena('Interlude2', { score: 1000, handling: 'diegetico', ship: 'interceptor', stage: 3 });
await ativa('Interlude2');
await rapido('Interlude2', 3);
ok(await esperar(n, 'cut.doca.afunda2', 45000, 'Interlude2'), 'the Dock runs to the dock going down');
t = await novos(n);
ok(t.includes('cut.piloto') && t.some((x) => x.startsWith('cut.pouso.toque.')), 'the Dock: the autopilot and the landing', t);
ok(antes(t, 'cut.doca.alarme', 'cut.doca.afunda') && antes(t, 'cut.doca.afunda', 'cut.doca.cabos') && t.includes('cut.doca.afunda2'), 'the alarm, the dock breaking (A), the cables and the dock giving way (B)', t);
ok(t.some((x) => x.startsWith('cut.decolagem.')), 'the ship leaves', t);

// ── cutscene 3, the Leviathan's hangar ──
n = await desde();
await cena('Interlude3', { score: 1000, handling: 'diegetico', ship: 'interceptor', stage: 4 });
await ativa('Interlude3');
await rapido('Interlude3', 3);
ok(await esperar(n, 'cut.leviata.selar', 50000, 'Interlude3'), 'the hangar runs to the mouth sealing');
t = await novos(n);
ok(antes(t, 'cut.leviata.alerta', 'cut.leviata.derrapagem'), 'the alarm, then the skid', t);
ok(antes(t, 'nave.missil.lancar', 'cut.leviata.colapso') && antes(t, 'cut.leviata.colapso', 'cut.leviata.colapso2'), 'the torpedo, the throat caving in A then B', t);
ok(antes(t, 'cut.leviata.engolida', 'cut.leviata.selar'), 'swallowed, then the mouth seals', t);

// ── the final cutscene ──
n = await desde();
await cena('Interlude4', { score: 1000, handling: 'diegetico', ship: 'interceptor', stage: 4, practice: true });
await ativa('Interlude4');
await rapido('Interlude4', 3);
const lugares = [];
const faixas = [];
const fimFinal = Date.now() + 25000;
while (Date.now() < fimFinal && !(await novos(n)).includes('fim.apaga2')) {
  const l = (await diag()).lugar;
  if (lugares[lugares.length - 1] !== l) lugares.push(l);
  const m = await page.evaluate(() => window.__music.diagnostico());
  const f = `${m.faixa}/${m.contexto}`;
  if (faixas[faixas.length - 1] !== f) faixas.push(f);
  await page.waitForTimeout(200);
}
t = await novos(n);
const final = ['fim.rasgo', 'fim.descompressao', 'fim.ferida', 'fim.ferida2', 'fim.queda'];
ok(final.every((x, i) => i === 0 || antes(t, final[i - 1], x)), 'the final: the rip, the decompression, the wound A then B, the fall', final.filter((x) => !t.includes(x)));
ok(t.some((x) => x.startsWith('fim.sobrevoo.')) && antes(t, 'fim.apaga', 'fim.apaga2'), 'the flyover (the ship\'s own), the lava cooling A then B', t.filter((x) => x.startsWith('fim.')));
ok(lugares.join() === 'interior,cabine,atmosfera', `the place moves with the camera (${lugares.join(' → ')})`, lugares);
// 19/11 — sheet 10: the impact at the burst, a bed under every chapter crossing into the next, his closing theme from the wound
ok(antes(t, 'fim.queda', 'fim.impacto') && t.some((x, i) => x.startsWith('fim.sobrevoo.') && i > t.indexOf('fim.impacto')), 'the Leviathan HITS the colony: the impact after the fall, before the flyover', t.filter((x) => x.startsWith('fim.')));
const fundos = ['amb.f4.interior', 'amb.fim.ferida', 'amb.fim.queda', 'amb.fim.superficie', 'amb.fim.superficie2'];
ok(fundos.every((x, i) => i === 0 || antes(t, fundos[i - 1], x)), 'a bed for each chapter, in order: inside, the wound, the fall, the surface burning, then the dawn wind', fundos.filter((x) => !t.includes(x)));
ok(antes(t, 'amb.fim.queda', 'fim.impacto') && t.indexOf('amb.fim.superficie') > t.indexOf('fim.impacto'), 'the surface bed comes in with the impact', null);
ok(faixas.includes('final/cena'), `his closing theme plays in the cutscene, at the scenes' level (${faixas.join(' → ')})`, faixas);

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
