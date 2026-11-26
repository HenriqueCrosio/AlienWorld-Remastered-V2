// 26/11 — CAN THE HEART BE HEARD IN THE EYES? (him, playing: "eu mal escuto o coração nessa parte... o trunfo de escutar o
// coração nas batidas certas nem existe"). In `?fase=besta3`, the eyes forced on, the whole mix (track + world, as the
// player hears it) recorded; each heartbeat's window (beat → +180 ms) against the bed between beats (+450 → +800 ms),
// K-weighted short-term power. Target: every beat ≥ 8 dB over the bed.
//   node scripts/_som/_medir-besta-batimento.mjs [port=5173]
import { chromium } from 'playwright';

const PORTA = process.argv[2] ?? '5173';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FALHOU'} ${m}`); if (!c) falhas++; };

const ANTES = process.argv.includes('--antes');
await page.goto(`http://localhost:${PORTA}/?fase=besta3&mao=nenhuma`, { waitUntil: 'domcontentloaded' });
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
await page.evaluate(() => window.__som.contexto().resume());
await page.evaluate((a) => { window.__antes = a; }, ANTES);
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss?.predador; return p?.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });
await page.waitForFunction(() => window.__music?.diagnostico?.().tocando, null, { timeout: 20000 }).catch(() => {});
await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.estadoT = 999; });
await page.waitForTimeout(2500);

const r = await page.evaluate(async () => {
  const ctx = window.__som.contexto();
  const sc = window.__game.scene.getScene('Game');
  const p = sc.boss.predador;
  const batidas = [];
  const tocar = window.__som.tocar.bind(window.__som);
  window.__ativas = []; window.__som.tocar = (nome, op) => { if (window.__antes && nome === 'besta.coracao.batida') nome = 'predador.pulso2'; if ((nome.startsWith('predador.pulso') || nome === 'besta.coracao.batida') && p.estado === 'olhos') { batidas.push(ctx.currentTime); setTimeout(() => window.__ativas.push(window.__som.ativas.map((v) => v.nome + ':' + (v.ganho?.gain?.value ?? 0).toFixed(2)).join(' ')), 60); } return tocar(nome, op); };
  if (window.__antes) {
    // the mix as it was (25/11): the whispers whole, the track at the dark's level
    p.constructor.OLHOS_MURMURIO = 1;
    p.constructor.OLHOS_MURMURIO_BREU = 1;
    const esc = window.__music.escuro.bind(window.__music);
    window.__music.escuro = (alvo, ms) => (alvo && alvo.db <= -28 ? undefined : esc(alvo, ms));
  }
  p.olhos();
  await new Promise((res) => { const f = () => (p.luzesOlhos.length ? res() : requestAnimationFrame(f)); f(); });
  const sp = ctx.createScriptProcessor(4096, 2, 2); const mudo = ctx.createGain(); mudo.gain.value = 0;
  const L = []; let t0 = null;
  sp.onaudioprocess = (e) => { if (t0 === null) t0 = e.playbackTime; const a = e.inputBuffer.getChannelData(0), b = e.inputBuffer.getChannelData(1); const m = new Float32Array(a.length); for (let i = 0; i < a.length; i++) m[i] = (a[i] + b[i]) / 2; L.push(m); };
  window.__music.saidaNo.connect(sp); window.__som.fimNo.connect(sp); sp.connect(mudo).connect(ctx.destination);
  await new Promise((res) => { const f = () => (p.olhosAvisando || p.olhosSaltando || p.estado !== 'olhos' ? res() : setTimeout(f, 30)); f(); });
  window.__music.saidaNo.disconnect(sp); window.__som.fimNo.disconnect(sp); sp.disconnect();
  const pcm = new Float32Array(L.reduce((a, b) => a + b.length, 0)); let o = 0; for (const b of L) { pcm.set(b, o); o += b.length; }
  // K-weighted; and as a LAPTOP SPEAKER / small headphone plays it (nothing under ~150 Hz: two 150 Hz high-passes)
  const render = async (falante) => {
    const off = new OfflineAudioContext(1, pcm.length, ctx.sampleRate); const buf = off.createBuffer(1, pcm.length, ctx.sampleRate); buf.copyToChannel(pcm, 0);
    const src = off.createBufferSource(); src.buffer = buf;
    const pre = off.createBiquadFilter(); pre.type = 'highshelf'; pre.frequency.value = 1681; pre.gain.value = 4;
    const rlb = off.createBiquadFilter(); rlb.type = 'highpass'; rlb.frequency.value = falante ? 150 : 38; rlb.Q.value = 0.5;
    const rlb2 = off.createBiquadFilter(); rlb2.type = 'highpass'; rlb2.frequency.value = falante ? 150 : 10;
    src.connect(pre).connect(rlb).connect(rlb2).connect(off.destination); src.start();
    return (await off.startRendering()).getChannelData(0);
  };
  const kK = await render(false);
  const kF = await render(true);
  let k = kK;
  const sr = ctx.sampleRate;
  const db = (a, b) => { const i0 = Math.max(0, Math.round((a - t0) * sr)), i1 = Math.min(k.length, Math.round((b - t0) * sr)); let e = 0; for (let i = i0; i < i1; i++) e += k[i] * k[i]; return 10 * Math.log10(e / Math.max(1, i1 - i0) + 1e-12); };
  window.__env = Array.from({ length: Math.floor(k.length / (sr * 0.1)) }, (_, j) => +db(t0 + j * 0.1, t0 + j * 0.1 + 0.1).toFixed(0)).join(' ');
  window.__bt = batidas.map((b) => +(b - t0).toFixed(2)).join(' ');
  // (the recorder runs ~0.1–0.25 s behind the trigger: the beat's window is the loudest 0.2 s within 0.45 s of it; the bed
  // is the quiet end of the period, after the take's second thump)
  const P = 1.25;
  const medir = (arr) => { k = arr; return batidas.filter((b) => b - t0 > 0.05 && b + P - t0 < k.length / sr).map((b) => {
    let pico = -120;
    for (let d = 0; d <= 0.25; d += 0.025) pico = Math.max(pico, db(b + d, b + d + 0.2));
    return { batida: +pico.toFixed(1), leito: +db(b + 0.9, b + 1.2).toFixed(1) };
  }); };
  return { K: medir(kK), F: medir(kF) };
});
for (const [nome, arr] of [['K (medidor)', r.K], ['alto-falante (> 150 Hz)', r.F]]) {
  console.log(nome);
  for (const [i, b] of arr.entries()) console.log(`  batimento ${i + 1}: ${b.batida} dB · entre batimentos ${b.leito} dB · contraste ${(b.batida - b.leito).toFixed(1)} dB`);
}
ok(r.K.length >= 4, `batimentos medidos: ${r.K.length}`);
// (the first beat shares its window with the laugh going away: the reading starts at the 2nd)
const min = (arr) => Math.min(...arr.slice(1).map((b) => b.batida - b.leito));
ok(min(r.K) >= 8, `todo batimento ≥ 8 dB acima do resto (medidor; o pior: ${min(r.K).toFixed(1)} dB)`);
ok(min(r.F) >= 8, `todo batimento ≥ 8 dB acima do resto num alto-falante de notebook (o pior: ${min(r.F).toFixed(1)} dB)`);
ok(erros.length === 0, `nenhum erro no console ${erros.slice(0, 3).join(' | ')}`);
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas ? 1 : 0);
