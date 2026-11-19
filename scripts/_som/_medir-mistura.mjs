// BLOCK SOUND · THE MIX PASS (19/11, spec §10.11) — the soundtrack and the world MEASURED TOGETHER, place by place, in the
// same run: the track as it leaves its chain (`Music.saidaNo`) and the effects as they leave theirs (`Som.fimNo`), K-weighted
// (BS.1770: the mean power of the window), at the same moment. Then the distances between the layers against the targets:
//   menu   — the track at −18 LUFS, ≥ 10 dB over the storm in its rain (1:20); the hangar ≥ 6 dB over the rain inside
//   stage  — the track at −19 LUFS, ≥ 6 dB over the bed (the action muted: the place + the engine), and from −5 to +1 dB
//            of the play itself (gunfire held, the stage running: the transients stand out, the track holds the line)
//   no music (MÚSICA 0) — the bed back where he approved it (up by the floor and the hole it gave the music)
// The track is measured at three points of itself (25/50/75%) and averaged: its sections differ by several dB.
//   node scripts/_som/_medir-mistura.mjs [port=5173] [--exigir]
import { chromium } from 'playwright';

const PORTA = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '5173';
const EXIGIR = process.argv.includes('--exigir');
let falhas = 0;
const linhas = [];
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, reducedMotion: 'reduce' });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${PORTA}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());
await page.waitForFunction(() => window.__music?.diagnostico().tocando, null, { timeout: 20000 }).catch(() => {});

const irPara = async (cena, dados) => {
  await page.evaluate(([c, d]) => {
    const g = window.__game.scene;
    if (g.isActive('Pausa')) g.stop('Pausa');
    window.__som.abafar(1, 0);
    window.__music.abafar(null, 1, 0);
    g.getScenes(false).find((s) => !['IrmaHD', 'Pausa'].includes(s.scene.key) && (s.scene.isActive() || s.scene.isPaused())).scene.start(c, d);
  }, [cena, dados]);
  await page.waitForFunction((c) => window.__game.scene.isActive(c), cena, { timeout: 30000 });
};

/** Both buses recorded over the same `ms`, then K-weighted: { musica, mundo } in LUFS. */
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
const registrar = (lugar, m, extra = '') => {
  linhas.push({ lugar, ...m });
  console.log(`  ${lugar.padEnd(30)} música ${m.musica.toFixed(1).padStart(6)}  mundo ${m.mundo.toFixed(1).padStart(6)}  → a música ${(m.musica - m.mundo >= 0 ? '+' : '')}${(m.musica - m.mundo).toFixed(1)} dB ${extra}`);
};
const volumeMusica = (v) => page.evaluate((v) => {
  const s = window.__som; const M = window.__music;
  const antes = s.volumes; s.volumes = () => ({ ...antes(), musica: v }); M.fator = () => v;
  s.atualizarVolume(); M.atualizarVolume();
}, v);
/** The action layer muted (the bed alone: the place + the engine) or back. */
const calarAcao = (sim) => page.evaluate((sim) => window.__som.abafar(1, 30, sim), sim);
/** The track measured at three points of itself (its loudness varies by section): the mean power, and the duck seen. */
const musicaMedia = async (ms) => {
  let e = 0; let duck = 0; let mundo = 0;
  for (const u of [0.25, 0.5, 0.75]) {
    await page.evaluate((u) => { const el = window.__music.atual.el; el.currentTime = el.duration * u; }, u);
    await page.waitForTimeout(400);
    const m = await medir(ms);
    duck += (await page.evaluate(() => window.__music.diagnostico().duckDb)) / 3;
    e += 10 ** (m.musica / 10) / 3; mundo += 10 ** (m.mundo / 10) / 3;
  }
  return { musica: 10 * Math.log10(e), mundo: 10 * Math.log10(mundo), duck };
};

// ── THE MENU: the bed = the storm in its rain (1:20), thunder muted with the action ──
await page.evaluate(() => { const f = window.__som.fluxos.find((x) => x.nome === 'amb.menu.tempestade'); if (f) f.el.currentTime = 80; });
await calarAcao(true);
await page.waitForTimeout(1500);
const menu = await musicaMedia(3000);
registrar('menu: a trilha × a tempestade', menu, `(abaixada ${menu.duck.toFixed(1)} dB)`);
ok(Math.abs(menu.musica - -18) <= 1.5, `menu: a trilha em −18 ± 1,5 LUFS (${menu.musica.toFixed(1)})`);
ok(menu.musica - menu.mundo >= 10, `menu: a trilha ≥ 10 dB sobre a tempestade (${(menu.musica - menu.mundo).toFixed(1)})`);
await calarAcao(false);

// ── THE HANGAR: the bed = the rain heard from inside ──
await irPara('Hangar', { handling: 'diegetico' });
await calarAcao(true);
await page.waitForTimeout(2500);
const hangar = await medir(4000);
registrar('hangar: a trilha × a chuva', hangar);
ok(hangar.musica - hangar.mundo >= 6, `hangar: a trilha ≥ 6 dB sobre a chuva de dentro (${(hangar.musica - hangar.mundo).toFixed(1)})`);
await calarAcao(false);

// ── THE STAGES: the bed (action muted) and the play (gunfire held, the stage running) ──
const fundos = {};
for (const n of [1, 2, 3, 4]) {
  await irPara('Game', { stage: n, handling: 'diegetico', decolou: true });
  await page.evaluate(() => { window.__game.scene.getScene('Game').invulnerableUntil = 1e12; });
  await calarAcao(true);
  await page.waitForTimeout(2500);
  const fundo = await musicaMedia(2500);
  fundos[n] = fundo;
  registrar(`F${n}: a trilha × o fundo`, fundo);
  ok(Math.abs(fundo.musica - -19) <= 1.5, `F${n}: a trilha em −19 ± 1,5 LUFS (${fundo.musica.toFixed(1)})`);
  ok(fundo.musica - fundo.mundo >= 6, `F${n}: a trilha ≥ 6 dB sobre o fundo (${(fundo.musica - fundo.mundo).toFixed(1)})`);
  if (n === 1) {
    // NO MUSIC (MÚSICA 0): the bed back where he approved it — up by the floor and the hole it gave the music. (Here, on
    // the first visit: re-entering a stage later, its entrance undid the muted action.) The wind gusts move a short window
    // by several dB: the mean power of four.
    const media = async () => { let e = 0; for (let k = 0; k < 4; k++) e += 10 ** ((await medir(2500)).mundo / 10) / 4; return 10 * Math.log10(e); };
    const com = await media();
    await volumeMusica(0);
    await page.waitForTimeout(800);
    const sem = await media();
    const d = await page.evaluate(() => window.__som.diagnostico());
    console.log(`  F1, o fundo: com a trilha ${com.toFixed(1)}, com MÚSICA 0 ${sem.toFixed(1)} (+${(sem - com).toFixed(1)} dB)`);
    ok(sem - com >= 3 && sem - com <= 7, `sem música, o fundo volta ao aprovado: +3 a +7 dB (${(sem - com).toFixed(1)})`);
    ok(Math.abs(d.buraco) < 0.01 && d.ganhos.ambiente === 1 && d.ganhos.motor === 1, `sem música, o ambiente e o motor voltam a 1 e o buraco fecha (${JSON.stringify(d.ganhos)}, ${d.buraco})`);
    await volumeMusica(1);
  }
  await calarAcao(false);
  await page.keyboard.down('Space');
  await page.waitForTimeout(1500);
  const jogo = await medir(5000);
  const duck = await page.evaluate(() => window.__music.diagnostico().duckDb);
  await page.keyboard.up('Space');
  registrar(`F${n}: a trilha × o jogo (atirando)`, jogo, `(abaixada ${duck.toFixed(1)} dB)`);
  // (the standing balance: a far event clearing space in that window — a flyby, the eel — is the duck doing its job)
  const base = jogo.musica - duck - jogo.mundo;
  ok(base >= -5 && base <= 1, `F${n}: a trilha de −5 a +1 dB do jogo atirando, sem o abaixamento do instante (${base.toFixed(1)})`);
}

await browser.close();
if (erros.length) console.log('ERROS:', erros.join(' | '));
console.log(falhas ? `${falhas} fora do alvo` : 'a mistura no alvo');
if (EXIGIR && (falhas || erros.length)) process.exitCode = 1;
