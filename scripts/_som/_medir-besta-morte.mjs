// 26/11 — IS HER DEATH HOWL HEARD? (him, after killing her: "na morte do boss não escutei algum urro de morte, nós temos
// isso?"). `?fase=besta3`, her heart already stopped once, she is killed on the ground in the dark; the whole mix
// (track + world) is recorded from the blow for 3.5 s, every sound played is logged, and the same death is run again
// with `predador.morte` muted: the difference, window by window, is what the howl adds to what the player hears
// (K-weighted, and as a laptop speaker plays it: nothing under ~150 Hz).
//   node scripts/_som/_medir-besta-morte.mjs [--sem]   (--sem: only the muted run, for a quick look)
import { chromium } from 'playwright';

const TIRA = (process.argv.find((a) => a.startsWith('--tira=')) ?? '--tira=').slice(7).split(',').filter(Boolean);
const rodar = async (mudo) => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
  await page.goto('http://localhost:5173/?fase=besta3&mao=nenhuma', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Shift');
  await page.waitForFunction(() => {
    const g = window.__game?.scene;
    if (!g) return false;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const sc = g.getScene('Game');
    if (!g.isActive('Game') || !sc?.boss?.predador) return false;
    sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    sc.damageShip = () => {};
    return true;
  }, null, { timeout: 240000, polling: 100 });
  await page.evaluate(() => window.__som.contexto().resume());
  await page.waitForFunction(() => { const p = window.__game.scene.getScene('Game').boss?.predador; return p?.breu && p.estado === 'chao'; }, null, { timeout: 90000, polling: 50 });
  await page.waitForTimeout(2500);
  await page.evaluate((t) => { window.__tira = t; }, TIRA);
  const r = await page.evaluate(async (mudo) => {
    const ctx = window.__som.contexto();
    const sc = window.__game.scene.getScene('Game');
    const p = sc.boss.predador;
    p.vistas.add('coracao');
    const log = [];
    const tocar = window.__som.tocar.bind(window.__som);
    let tb = null;
    window.__som.tocar = (nome, op) => { if (tb !== null) log.push(`${(ctx.currentTime - tb).toFixed(2)} ${nome}${op?.forca !== undefined ? ' f' + op.forca : ''}`); if ((mudo && nome === 'predador.morte') || window.__tira.includes(nome)) return null; return tocar(nome, op); };
    const sp = ctx.createScriptProcessor(4096, 2, 2); const z = ctx.createGain(); z.gain.value = 0;
    const L = []; let t0 = null;
    sp.onaudioprocess = (e) => { if (t0 === null) t0 = e.playbackTime; const a = e.inputBuffer.getChannelData(0), b = e.inputBuffer.getChannelData(1); const m = new Float32Array(a.length); for (let i = 0; i < a.length; i++) m[i] = (a[i] + b[i]) / 2; L.push(m); };
    window.__music.saidaNo.connect(sp); window.__som.fimNo.connect(sp); sp.connect(z).connect(ctx.destination);
    await new Promise((res) => setTimeout(res, 1000));
    // (the lava in the air is cleared, so both runs hear the same world)
    for (const l of p.lavas) if (l.b.active) { l.b.setData('lava', false); sc.enemies.release(l.b); }
    await new Promise((res) => setTimeout(res, 400));
    tb = ctx.currentTime;
    sc.boss.damage(99999);
    await new Promise((res) => setTimeout(res, 3800));
    window.__music.saidaNo.disconnect(sp); window.__som.fimNo.disconnect(sp); sp.disconnect();
    const pcm = new Float32Array(L.reduce((a, b) => a + b.length, 0)); let o = 0; for (const b of L) { pcm.set(b, o); o += b.length; }
    const render = async (falante) => {
      const off = new OfflineAudioContext(1, pcm.length, ctx.sampleRate); const buf = off.createBuffer(1, pcm.length, ctx.sampleRate); buf.copyToChannel(pcm, 0);
      const src = off.createBufferSource(); src.buffer = buf;
      const pre = off.createBiquadFilter(); pre.type = 'highshelf'; pre.frequency.value = 1681; pre.gain.value = 4;
      const h1 = off.createBiquadFilter(); h1.type = 'highpass'; h1.frequency.value = falante ? 150 : 38; h1.Q.value = 0.5;
      const h2 = off.createBiquadFilter(); h2.type = 'highpass'; h2.frequency.value = falante ? 150 : 10;
      src.connect(pre).connect(h1).connect(h2).connect(off.destination); src.start();
      return (await off.startRendering()).getChannelData(0);
    };
    const sr = ctx.sampleRate;
    const curva = (k) => Array.from({ length: 18 }, (_, j) => { const a = tb - 0.6 + j * 0.25; const i0 = Math.max(0, Math.round((a - t0) * sr)), i1 = Math.min(k.length, Math.round((a + 0.4 - t0) * sr)); let e = 0; for (let i = i0; i < i1; i++) e += k[i] * k[i]; return +(10 * Math.log10(e / Math.max(1, i1 - i0) + 1e-12)).toFixed(1); });
    return { log, K: curva(await render(false)), F: curva(await render(true)), musica: window.__music.diagnostico?.() };
  }, mudo);
  await browser.close();
  return r;
};

const so = process.argv.includes('--sem');
const sem = await rodar(true);
const com = so ? null : await rodar(false);
console.log('sons a partir do golpe (s):');
for (const l of (com ?? sem).log) console.log('  ' + l);
console.log('\njanelas de 0,4 s (início em s, a partir do golpe) · K com / sem / o que o urro soma · alto-falante com / sem / soma');
for (let j = 0; j < sem.K.length; j++) {
  const t = (-0.6 + j * 0.25).toFixed(2);
  if (!com) { console.log(`  ${t}  ${sem.K[j]}  ${sem.F[j]}`); continue; }
  console.log(`  ${t.padStart(5)}   ${com.K[j]} / ${sem.K[j]} / ${(com.K[j] - sem.K[j]).toFixed(1)}    ${com.F[j]} / ${sem.F[j]} / ${(com.F[j] - sem.F[j]).toFixed(1)}`);
}
