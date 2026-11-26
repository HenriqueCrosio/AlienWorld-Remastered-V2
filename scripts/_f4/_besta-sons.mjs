// 25/11, the Beast's step 10 — the new sounds in the running game (npm run dev, 5173), in the dark (`besta3`): every
// besta.* file loads (no 404), the murmurs loop under the dark, the track closes (the low-pass and the level), the eyes
// play the laugh / the eyes / the leap, the heart plays the squeeze / the frozen ring / the restart and closes the track
// all the way while it is stopped. The audio is unlocked by a key press (the browser's rule).
//   node scripts/_f4/_besta-sons.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
const faltam = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('response', (r) => { if (r.url().includes('/sfx/besta/') && r.status() >= 400) faltam.push(r.url()); });
const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${info !== undefined ? ` → ${JSON.stringify(info)}` : ''}`);
  if (!ok) falhas.push(nome);
};
await page.goto('http://localhost:5173/?fase=besta3&mao=nenhuma', { waitUntil: 'domcontentloaded' });
await page.keyboard.press('Shift');
await page.waitForFunction(() => {
  const g = window.__game?.scene;
  if (!g) return false;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const sc = g.getScene('Game');
  if (!g.isActive('Game') || !sc?.boss) return false;
  sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  sc.damageShip = () => {};
  return true;
}, null, { timeout: 240000, polling: 100 });
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss?.predador; return p?.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });
// record every voice that starts
await page.evaluate(() => {
  window.__vozes = new Set();
  const tick = () => {
    const d = window.__som?.diagnostico?.();
    for (const v of d?.vozes ?? []) window.__vozes.add(v);
    requestAnimationFrame(tick);
  };
  tick();
});
await page.waitForTimeout(3000);
const escuro = await page.evaluate(() => {
  const M = window.__music;
  return { hz: M?.escuroFiltro?.frequency.value, nivel: M?.escuroNo?.gain.value, vozes: [...window.__vozes] };
});
conferir(escuro.vozes.includes('besta.murmurio'), 'no breu: os murmúrios em laço', escuro.vozes.filter((v) => v.startsWith('besta')));
conferir(escuro.hz < 300 && escuro.nivel < 0.1, 'no breu: a trilha quase nula e abafada (~220 Hz, −22 dB)', { hz: Math.round(escuro.hz), nivel: +escuro.nivel?.toFixed(3) });
// the eyes, then the heart
await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.estadoT = 999; p.olhos(); });
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado === 'chao' && window.__vozes.has('besta.olhos.salto'), null, { timeout: 20000, polling: 50 });
await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.estadoT = 999; p.coracao(); });
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.congelado, null, { timeout: 10000, polling: 16 });
await page.waitForTimeout(400);
const parado = await page.evaluate(() => ({ hz: window.__music?.escuroFiltro?.frequency.value, nivel: window.__music?.escuroNo?.gain.value }));
conferir(parado.hz < 200 && parado.nivel < 0.05, 'com o coração parado a trilha quase some (~180 Hz, −28 dB)', { hz: Math.round(parado.hz), nivel: +parado.nivel?.toFixed(3) });
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.estado !== 'coracao', null, { timeout: 10000, polling: 50 });
const vozes = await page.evaluate(() => [...window.__vozes]);
for (const n of ['besta.risada', 'besta.olhos.acende', 'besta.murmurio.olhos', 'besta.olhos.salto', 'besta.coracao.aperta', 'besta.coracao.parado', 'besta.coracao.volta']) conferir(vozes.includes(n), `toca ${n}`);
// the death: the murmurs stop and the track opens again — after the howl (26/11: `MORTE_TRILHA_MS` 1.9 s + its 0.8 s)
await page.evaluate(() => { const sc = window.__game.scene.getScene('Game'); sc.boss.predador.hp = 1; sc.boss.damage(9999); });
await page.waitForTimeout(3000);
const fim = await page.evaluate(() => ({ hz: window.__music?.escuroFiltro?.frequency.value, murm: window.__som?.diagnostico?.().vozes.includes('besta.murmurio'), saida: window.__vozes.has('besta.murmurio.saida') }));
conferir(fim.saida, 'na morte, saindo do escuro, os sussurros da saída (a E)');
conferir(fim.hz > 15000, 'na morte a trilha abre de novo', Math.round(fim.hz));
conferir(faltam.length === 0, 'nenhum arquivo besta.* faltando', faltam);
conferir(erros.length === 0, 'nenhum erro no console', erros.slice(0, 5));
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas.length ? 1 : 0);
