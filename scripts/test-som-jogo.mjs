// BLOCK SOUND (15/11) — the sound-effects engine IN THE GAME (spec `specs/2026-11-15-bloco-som-design.md` §3, §7):
// it is born with the context; the caps hold; EFEITOS 0 = zero gain; MÚSICA 0 = the ambience full; the pause ducks
// the world; SHIP LOST silences the action; each scene sets its place.
// The automated Chromium has Web Audio: this measures the NODES and the gains, not the ear.
//   npm run dev  in another terminal, then  node scripts/test-som-jogo.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1200);
const diag = () => page.evaluate(() => window.__som.diagnostico());
const ativa = (k, ms = 20000) => page.waitForFunction((x) => window.__game.scene.isActive(x), k, { timeout: ms }).then(() => true, () => false);
const prefs = (campo, d, n = 10) => page.evaluate(async ([c, dd, nn]) => { const m = await import('/src/aplicarPreferencias.ts'); for (let i = 0; i < nn; i++) m.mudarPref(c, dd); }, [campo, d, n]);

let d = await diag();
ok(d.iniciado, 'the engine started with the Phaser context', d);
ok(d.lugar === 'atmosfera', 'the menu is in the atmosphere', d.lugar);

await page.keyboard.press('ArrowDown');
await page.waitForTimeout(300);
await page.evaluate(() => window.__som.contexto().resume());
d = await diag();
ok(d.pronto, 'the context runs', d.estado);

// a synthetic test sound (100 ms of a 440 Hz sine) and a loop
await page.evaluate(() => {
  const S = window.__som; const ctx = S.contexto();
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
  const c = b.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.sin((i / ctx.sampleRate) * 2 * Math.PI * 440) * 0.3;
  S.registrar('teste.bip', { arquivo: '-', camada: 'acao', volume: 0.5, vozes: 2, variacao: { tom: 0.04, vol: 0.1 }, prioridade: 'jogador' }, b);
  S.registrar('teste.amb', { arquivo: '-', camada: 'ambiente', volume: 0.5, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena', laco: true }, b);
});
const antes = (await diag()).recusadas;
await page.evaluate(() => { for (let i = 0; i < 6; i++) window.__som.tocar('teste.bip'); });
d = await diag();
ok(d.vozes.filter((v) => v === 'teste.bip').length === 1 && d.recusadas - antes === 5, 'six in the same instant: one plays, five are refused', d);
await page.evaluate(async () => { for (let i = 0; i < 6; i++) { window.__som.tocar('teste.bip'); await new Promise((r) => setTimeout(r, 20)); } });
d = await diag();
ok(d.vozes.filter((v) => v === 'teste.bip').length <= 2, 'the per-sound cap (2) holds', d.vozes);
await page.evaluate(() => { window.__lacoTeste = window.__som.laco('teste.amb'); });
d = await diag();
ok(d.vozes.includes('teste.amb'), 'the loop plays', d.vozes);

// the volumes, through the real settings bridge
await prefs('volume.efeitos', -1);
d = await diag();
ok(d.ganhos.acao === 0 && d.ganhos.ambiente === 0 && d.ganhos.interface === 0, 'EFEITOS 0 = zero gain on every layer', d.ganhos);
await prefs('volume.efeitos', 1);
d = await diag();
ok(d.ganhos.acao === 1, 'EFEITOS back to 10', d.ganhos);
await prefs('volume.musica', -1);
d = await diag();
ok(d.ganhos.ambiente === 1 && d.ganhos.motor === 1, 'MÚSICA 0 = the ambience and the engine full', d.ganhos);
await prefs('volume.musica', 1);
d = await diag();
ok(d.ganhos.ambiente < 0.5 && d.ganhos.acao === 1, 'MÚSICA 10 = the ambience under the music, the action untouched', d.ganhos);
await page.evaluate(() => window.__lacoTeste.parar(0));

// THE LASTRO (the bed under the chains): a registered rumble loop and a blast that feeds it
await page.evaluate(() => {
  const S = window.__som; const ctx = S.contexto();
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const c = b.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.sin((i / ctx.sampleRate) * 2 * Math.PI * 60) * 0.3;
  S.registrar('explosao.lastro', { arquivo: '-', camada: 'acao', volume: 0.6, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena', laco: true }, b);
  S.registrar('teste.boom', { arquivo: '-', camada: 'acao', volume: 0.5, vozes: 4, variacao: { tom: 0, vol: 0 }, prioridade: 'inimigo', lastro: 0.8 }, b);
});
d = await diag();
ok(!d.lastro.tocando, 'no blast, no bed', d.lastro);
await page.evaluate(async () => { for (let i = 0; i < 6; i++) { window.__som.tocar('teste.boom'); await new Promise((r) => setTimeout(r, 150)); } });
d = await diag();
ok(d.lastro.tocando && d.vozes.includes('explosao.lastro') && d.lastro.energia > 1, 'a chain of blasts starts the bed', d.lastro);
await page.waitForTimeout(9000);
d = await diag();
ok(!d.lastro.tocando && !d.vozes.includes('explosao.lastro'), 'the bed drains and stops after the chain', d.lastro);

// stage 2: the cabin; the pause ducks the world
await page.keyboard.press('KeyV');
ok(await ativa('Game'), 'stage 2 opened');
await page.waitForTimeout(2500);
d = await diag();
ok(d.lugar === 'cabine', 'stage 2 is in the cabin', d.lugar);
await page.keyboard.press('Escape');
ok(await ativa('Pausa'), 'the pause opened');
await page.waitForTimeout(600);
d = await diag();
ok(d.abafo < 0.6 && d.acaoMuda === 1, 'the pause ducks the world, the action is not silenced', d);
const picoPausa = await page.evaluate(async () => { window.__som.tocar('teste.bip'); return window.__som.picoDaAcao(150); });
ok(picoPausa > 0.05, 'in the pause a shot still sounds (the signal)', picoPausa);
await page.keyboard.press('Escape');
await page.waitForTimeout(600);
d = await diag();
ok(d.abafo === 1 && d.acaoMuda === 1, 'closing the pause restores', d);

// SHIP LOST: the action is silenced, the ambience stays
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.damageShip = () => {}; s.gameOver(); });
// (the window opens only after the death animation; wait for the 'derrota' kind, not for any pause)
const derrota = await page.waitForFunction(() => { const g = window.__game; return g.scene.isActive('Pausa') && g.scene.getScene('Pausa').ctx?.tipo === 'derrota'; }, null, { timeout: 20000 }).then(() => true, () => false);
ok(derrota, 'the SHIP LOST window opened');
await page.waitForTimeout(800);
d = await diag();
ok(d.acaoMuda === 0 && d.abafo > 0, 'SHIP LOST: the action silenced, the ambience low', d);
const pico = await page.evaluate(async () => { window.__som.tocar('teste.bip'); return window.__som.picoDaAcao(150); });
ok(pico < 0.001, 'SHIP LOST: a shot fired now is really silent (the signal, not the param)', pico);

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
