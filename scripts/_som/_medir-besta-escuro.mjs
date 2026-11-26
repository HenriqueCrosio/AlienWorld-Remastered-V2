// 25/11 — THE BEAST'S DARK, MEASURED BY THE SIGNAL (him, playing: "a música da trilha sonora não ficou abafada a ponto
// de quase sumir"; his call: "deixá-la muito baixa e abafada para dar a entender que ela ainda está lá, mas os murmúrios,
// batimentos etc são mais importantes"). In `?fase=besta3`, the track as it leaves its chain (`Music.saidaNo`) and the
// effects as they leave theirs (`Som.fimNo`), K-weighted (BS.1770, the window's mean power — as `_medir-mistura.mjs`):
//   the track OPEN (the dark's filter lifted for the reference), the track IN THE DARK, the track WITH THE HEART STOPPED,
//   and the world (the murmurs, the beats) in the dark. Targets: the dark ≥ 15 dB under the open track and the world
//   over the track; the heart ≥ 25 dB under. The track's sections differ: each window is measured at the same point.
//   node scripts/_som/_medir-besta-escuro.mjs [port=5173]
import { chromium } from 'playwright';

const PORTA = process.argv[2] ?? '5173';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK  ' : 'FALHOU'} ${m}`); if (!c) falhas++; };

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
await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss?.predador; return p?.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });
await page.waitForFunction(() => window.__music?.diagnostico?.().tocando, null, { timeout: 20000 }).catch(() => {});
// hold her still (no attack while measuring)
await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.estadoT = 999; });
await page.waitForTimeout(3000);

const medir = (ms) => page.evaluate(async (ms) => {
  const ctx = window.__som.contexto();
  const gravar = (no) => {
    const sp = ctx.createScriptProcessor(4096, 2, 2); const mudo = ctx.createGain(); mudo.gain.value = 0;
    const L = []; const R = [];
    sp.onaudioprocess = (e) => { L.push(new Float32Array(e.inputBuffer.getChannelData(0))); R.push(new Float32Array(e.inputBuffer.getChannelData(1))); };
    no.connect(sp).connect(mudo).connect(ctx.destination);
    return () => { no.disconnect(sp); sp.disconnect(); return [L, R]; };
  };
  const pararM = gravar(window.__music.saidaNo);
  const pararW = gravar(window.__som.fimNo);
  await new Promise((r) => setTimeout(r, ms));
  const junta = (bs) => { const o = new Float32Array(bs.reduce((a, b) => a + b.length, 0)); let p = 0; for (const b of bs) { o.set(b, p); p += b.length; } return o; };
  const pesar = async (pcm) => {
    const off = new OfflineAudioContext(1, Math.max(1, pcm.length), ctx.sampleRate); const b = off.createBuffer(1, Math.max(1, pcm.length), ctx.sampleRate); b.copyToChannel(pcm, 0);
    const src = off.createBufferSource(); src.buffer = b;
    const pre = off.createBiquadFilter(); pre.type = 'highshelf'; pre.frequency.value = 1681; pre.gain.value = 4;
    const rlb = off.createBiquadFilter(); rlb.type = 'highpass'; rlb.frequency.value = 38; rlb.Q.value = 0.5;
    src.connect(pre).connect(rlb).connect(off.destination); src.start();
    return (await off.startRendering()).getChannelData(0);
  };
  const lufs = async ([L, R]) => {
    const [kl, kr] = [await pesar(junta(L)), await pesar(junta(R))];
    let e = 0; for (let i = 0; i < kl.length; i += 3) e += kl[i] * kl[i] + kr[i] * kr[i];
    return -0.691 + 10 * Math.log10(e / (kl.length / 3) + 1e-12);
  };
  return { musica: await lufs(pararM()), mundo: await lufs(pararW()) };
}, ms);
/** The track at the same point of itself before each window (its sections differ by several dB). */
const ponto = () => page.evaluate(() => { const el = window.__music.atual?.el; if (el && el.duration) el.currentTime = el.duration * 0.4; });

const tocando = await page.evaluate(() => !!window.__music?.diagnostico?.().tocando);
ok(tocando, 'a trilha está tocando no besta3');

await ponto();
const escuro = await medir(3000);
await page.evaluate(() => window.__music.escuro(null, 0));
await ponto();
await page.waitForTimeout(150);
const aberto = await medir(3000);
await page.evaluate(() => { const P = window.__game.scene.getScene('Game').boss.predador.constructor; window.__music.escuro(P.ESCURO_TRILHA, 0); });
await page.waitForTimeout(150);
// the heart: squeeze, frozen
await page.evaluate(() => { const p = window.__game.scene.getScene('Game').boss.predador; p.coracao(); });
await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.congelado, null, { timeout: 10000, polling: 16 });
await page.waitForTimeout(350);
const parado = await medir(1300);

const f = (v) => v.toFixed(1).padStart(6);
console.log(`  a trilha aberta (referência)   ${f(aberto.musica)} LUFS`);
console.log(`  a trilha no escuro             ${f(escuro.musica)} LUFS (${(escuro.musica - aberto.musica).toFixed(1)} dB) · o mundo (murmúrios, batimento) ${f(escuro.mundo)}`);
console.log(`  a trilha com o coração parado  ${f(parado.musica)} LUFS (${(parado.musica - aberto.musica).toFixed(1)} dB) · o mundo ${f(parado.mundo)}`);
ok(escuro.musica - aberto.musica <= -15, `no escuro a trilha cai ≥ 15 dB (${(escuro.musica - aberto.musica).toFixed(1)})`);
ok(escuro.musica > -70, `no escuro a trilha ainda está lá (${escuro.musica.toFixed(1)} LUFS, não muda)`);
ok(escuro.mundo - escuro.musica >= 3, `no escuro os murmúrios e o batimento passam por cima da trilha (+${(escuro.mundo - escuro.musica).toFixed(1)} dB)`);
ok(parado.musica - aberto.musica <= -25, `com o coração parado a trilha quase some (${(parado.musica - aberto.musica).toFixed(1)})`);
ok(erros.length === 0, `nenhum erro no console ${erros.slice(0, 3).join(' | ')}`);
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo certo');
await browser.close();
process.exit(falhas ? 1 : 0);
