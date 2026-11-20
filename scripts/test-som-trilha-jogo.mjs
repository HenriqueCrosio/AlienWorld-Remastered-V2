// BLOCK SOUND (18/11) — HIS SOUNDTRACK IN THE GAME: each place plays its track, at its level, under the world; the loud moments
// push it down and it comes back; the loop has no gap; MÚSICA at 0 silences it; the hangar has its thunder.
//   npm run dev  in another terminal, then  node scripts/test-som-trilha-jogo.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${c || extra === undefined ? '' : `  ${JSON.stringify(extra)}`}`); if (!c) falhas++; };

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, reducedMotion: 'reduce' });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());
await page.waitForFunction(() => window.__music?.diagnostico().tocando, null, { timeout: 15000 }).catch(() => {});

const diag = () => page.evaluate(() => window.__music.diagnostico());
const irPara = async (cena, dados) => {
  // (the idle ship may have died meanwhile: the SHIP LOST window holds the stage paused behind it)
  await page.evaluate(([c, d]) => {
    const g = window.__game.scene;
    if (g.isActive('Pausa')) g.stop('Pausa');
    window.__som.abafar(1, 0);
    window.__music.abafar(null, 1, 0);
    g.getScenes(false).find((s) => !['IrmaHD', 'Pausa'].includes(s.scene.key) && (s.scene.isActive() || s.scene.isPaused())).scene.start(c, d);
  }, [cena, dados]);
  await page.waitForFunction((c) => window.__game.scene.isActive(c), cena, { timeout: 30000 });
};
/** LUFS of the track as it leaves its chain (BS.1770 weighting, the mean of the 400 ms blocks), `ms` from `seek` s into it. */
const lufs = (seek, ms) => page.evaluate(async ([seek, ms]) => {
  const M = window.__music; const ctx = window.__som.contexto();
  M.atual.el.currentTime = seek;
  await new Promise((r) => setTimeout(r, 500));
  const sp = ctx.createScriptProcessor(4096, 2, 2); const mudo = ctx.createGain(); mudo.gain.value = 0;
  const L = []; const R = [];
  sp.onaudioprocess = (e) => { L.push(new Float32Array(e.inputBuffer.getChannelData(0))); R.push(new Float32Array(e.inputBuffer.getChannelData(1))); };
  M.saidaNo.connect(sp).connect(mudo).connect(ctx.destination);
  await new Promise((r) => setTimeout(r, ms));
  M.saidaNo.disconnect(sp); sp.disconnect();
  const junta = (bs) => { const o = new Float32Array(bs.reduce((a, b) => a + b.length, 0)); let p = 0; for (const b of bs) { o.set(b, p); p += b.length; } return o; };
  const pesar = async (pcm) => {
    const off = new OfflineAudioContext(1, pcm.length, ctx.sampleRate); const b = off.createBuffer(1, pcm.length, ctx.sampleRate); b.copyToChannel(pcm, 0);
    const src = off.createBufferSource(); src.buffer = b;
    const pre = off.createBiquadFilter(); pre.type = 'highshelf'; pre.frequency.value = 1681; pre.gain.value = 4;
    const rlb = off.createBiquadFilter(); rlb.type = 'highpass'; rlb.frequency.value = 38; rlb.Q.value = 0.5;
    src.connect(pre).connect(rlb).connect(off.destination); src.start();
    return (await off.startRendering()).getChannelData(0);
  };
  const [kl, kr] = [await pesar(junta(L)), await pesar(junta(R))];
  let e = 0; for (let i = 0; i < kl.length; i += 3) e += kl[i] * kl[i] + kr[i] * kr[i];
  return -0.691 + 10 * Math.log10(e / (kl.length / 3) + 1e-12);
}, [seek, ms]);

// THE MENU
{
  const a = await diag();
  ok(a.faixa === 'menu' && a.tocando && a.contexto === 'menu', 'the menu plays its own track', a);
  await page.waitForTimeout(1000);
  ok((await diag()).tempo > a.tempo, 'the track really advances');
  const v = await lufs(60, 8000);
  // (19/11, the mix pass: the track up front — spec §10.11)
  ok(Math.abs(v - -18) <= 2.5, `the menu level: ${v.toFixed(1)} LUFS (target −18)`, v);
}

// THE SIDECHAIN: a loud moment pushes the track down, held gunfire does not, and it comes back
{
  await page.evaluate(() => { for (const s of window.__game.scene.getScenes(true)) s.scene.pause(); });
  await page.waitForFunction(() => window.__music.diagnostico().duckDb > -0.5, null, { timeout: 15000 }).catch(() => {});
  const fogo = await page.evaluate(async () => {
    const l = window.__som.laco('nave.terminus.rotativa.laco', 1); let pior = 0;
    for (let i = 0; i < 60; i++) { await new Promise((r) => setTimeout(r, 50)); pior = Math.min(pior, window.__music.diagnostico().duckDb); }
    l?.parar(50); return pior;
  });
  ok(fogo > -1.5, `held gunfire leaves the track alone (${fogo.toFixed(1)} dB)`, fogo);
  const estouro = await page.evaluate(async () => {
    window.__som.tocar('explosao.chefeFim'); let pior = 0;
    for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 50)); pior = Math.min(pior, window.__music.diagnostico().duckDb); }
    return pior;
  });
  ok(estouro <= -3.5, `a boss's end pushes the track down (${estouro.toFixed(1)} dB)`, estouro);
  await page.waitForFunction(() => window.__music.diagnostico().duckDb > -0.5, null, { timeout: 15000 }).then(() => ok(true, 'and it comes back'), () => ok(false, 'and it comes back'));
  const laser = await page.evaluate(async () => {
    window.__som.tocar('fx.f2.laser'); let pior = 0;
    for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 50)); pior = Math.min(pior, window.__music.diagnostico().duckDb); }
    return pior;
  });
  ok(laser <= -1.5, `a far event of the scenery clears space (${laser.toFixed(1)} dB)`, laser);
  await page.evaluate(() => { for (const s of window.__game.scene.getScenes(false)) if (s.scene.isPaused()) s.scene.resume(); });
}

// THE LOOP: the next lap crosses in before the end, with no hole
{
  const r = await page.evaluate(async () => {
    const M = window.__music; const f0 = M.atual;
    f0.el.currentTime = f0.el.duration - 5;
    const an = window.__som.contexto().createAnalyser(); an.fftSize = 2048; M.saidaNo.connect(an);
    const b = new Float32Array(2048); let menor = 0;
    for (let i = 0; i < 80; i++) { await new Promise((ok) => setTimeout(ok, 100)); an.getFloatTimeDomainData(b); let e = 0; for (const v of b) e += v * v; if (i > 3) menor = Math.min(menor, 10 * Math.log10(e / b.length + 1e-12)); }
    M.saidaNo.disconnect(an);
    return { trocou: M.atual !== f0, tempo: M.atual.el.currentTime, menor, faixa: M.atual.track };
  });
  ok(r.trocou && r.faixa === 'menu' && r.tempo < 8, 'the track loops on a new lap', r);
  ok(r.menor > -60, `no hole in the seam (quietest moment ${r.menor.toFixed(0)} dB)`, r);
}

// MÚSICA AT 0
{
  const p = await page.evaluate(async () => {
    const M = window.__music; const antes = M.fator; M.fator = () => 0; M.atualizarVolume();
    await new Promise((r) => setTimeout(r, 300));
    const an = window.__som.contexto().createAnalyser(); an.fftSize = 2048; M.saidaNo.connect(an);
    const b = new Float32Array(2048); an.getFloatTimeDomainData(b); M.saidaNo.disconnect(an);
    M.fator = antes; M.atualizarVolume();
    return Math.max(...b.map(Math.abs));
  });
  ok(p < 1e-4, 'MÚSICA at 0 silences the track', p);
}

// THE HANGAR: the menu's track goes on, and the storm rolls outside
{
  const t0 = await diag();
  await irPara('Hangar', { handling: 'diegetico' });
  const n = await page.evaluate(() => window.__som.diagnostico().tocados.length);
  await page.waitForTimeout(600);
  const d = await diag();
  ok(d.faixa === 'menu' && d.tempo >= t0.tempo, 'the hangar goes on with the same track, without restarting', d);
  await page.waitForFunction((k) => window.__som.diagnostico().tocados.slice(k).includes('fx.hangar.trovao'), n, { timeout: 9000 }).then(() => ok(true, 'a rolling thunder is heard from inside the hangar'), () => ok(false, 'a rolling thunder is heard from inside the hangar'));
}

// EACH STAGE HAS ITS TRACK, AND THE CUTSCENE ONLY LOWERS IT
for (const n of [1, 2, 3, 4]) {
  // (`decolou`: the F1 as the hangar delivers it. The retry's entrance dips the track for a moment, on the stage's clock)
  await irPara('Game', { stage: n, handling: 'diegetico', decolou: true });
  await page.waitForFunction((f) => window.__music.diagnostico().faixa === f && window.__music.diagnostico().tocando, `f${n}`, { timeout: 15000 }).catch(() => {});
  const d = await diag();
  ok(d.faixa === `f${n}` && d.tocando && d.contexto === 'fase', `the F${n} plays its own track`, d);
  if (n === 1) {
    // (the stage held still and quiet: only the snapshot is being measured, not the duck)
    await page.evaluate(() => { window.__game.scene.getScene('Game').scene.pause(); window.__som.abafar(0, 50); });
    await page.waitForFunction(() => window.__music.diagnostico().duckDb > -0.3, null, { timeout: 15000 }).catch(() => {});
    const l = await lufs(50, 6000);
    ok(Math.abs(l - -19) <= 2.5, `the stage level: ${l.toFixed(1)} LUFS (target −19)`, l);
    await page.evaluate(() => { window.__som.abafar(1, 50); window.__game.scene.getScene('Game').scene.resume(); });
  }
}
// 20/11 — the cutscenes BETWEEN stages are silent of music (him: *"só ocorra os efeitos e ambientação. É a pausa que o
// jogador precisa entre as fases para começar com a música de cada fase"*): the stage's track leaves as one opens
{
  const f = (await diag()).faixa;
  await irPara('Interlude3', { score: 0, handling: 'diegetico' });
  await page.waitForTimeout(400);
  await page.evaluate(() => window.__game.scene.getScene('Interlude3').colapso());
  await page.waitForTimeout(300);
  const d = await diag();
  ok(f !== null && d.faixa === null, `a cutscene between stages lets the track go (${f} → ${d.faixa})`, d);
}

// 19/11 — THE CLOSING THEME is the dawn menu's: the result screen (where the final cutscene lands) plays it at the menu's
// level, the hangar carries it on, and the night menu goes back to the orchestra
{
  const espera = (f) => page.waitForFunction((x) => window.__music.diagnostico().faixa === x && window.__music.diagnostico().tocando, f, { timeout: 15000 }).catch(() => {});
  await irPara('Menu', { resultado: { score: 1000, handling: 'diegetico', ensaio: true } });
  await espera('final');
  let d = await diag();
  ok(d.faixa === 'final' && d.tocando && d.contexto === 'menu', 'the dawn (the result) plays his closing theme, at the menu level', d);
  const t0 = d.tempo;
  await irPara('Hangar', { handling: 'diegetico' });
  await page.waitForTimeout(1200);
  d = await diag();
  ok(d.faixa === 'final' && d.tempo >= t0, 'the hangar carries the dawn menu track on, without restarting', d);
  await page.evaluate(() => { window.__game.registry.set('menuForcado', 'noite'); });
  await irPara('Menu', { direto: true });
  await espera('menu');
  d = await diag();
  ok(d.faixa === 'menu' && d.tocando, 'the night menu goes back to the orchestra', d);
  await page.evaluate(() => { window.__game.registry.remove('menuForcado'); });
}

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
