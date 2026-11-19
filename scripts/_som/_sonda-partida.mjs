// BLOCK SOUND (18/11) — does a sound STAND OUT in a real run? The stage plays by itself (fire held, the ship cannot die), the
// effects are tapped at the very end of the chain, and each ambience sound that fires is compared with what was sounding
// just before it: `salta` = dB the mix jumps when it enters. Around 0 = nobody can hear it. The music is not in this chain.
//   npm run dev  in another terminal, then  node scripts/_som/_sonda-partida.mjs [--fase 2] [--seg 60] [--sem-tiro]
import { chromium } from 'playwright';

const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const seg = Number(arg('--seg') ?? 60);
const fases = arg('--fase') ? [Number(arg('--fase'))] : [1, 2, 3, 4];
const atirar = !process.argv.includes('--sem-tiro');

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, reducedMotion: 'reduce' });
page.on('pageerror', (e) => console.error('pageerror', String(e)));
await page.goto(`http://localhost:${arg('--porta') ?? '5173'}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.keyboard.press('ArrowDown');
// --tiro-db -6: an EXPERIMENT, in this page only (the game's files are not touched): the ship's shots and their hits lower
const tiroDb = Number(arg('--tiro-db') ?? 0);
if (tiroDb) {
  await page.evaluate((d) => {
    // (through the player's own lookup: a dynamic import of the catalogue can be ANOTHER instance of the module under Vite.
    // The TERMINUS, the ship a run starts with here, fires the rotary gun: a held LOOP, not `nave.*.tiro`.)
    const Som = window.__som;
    const achar = Som.achar.bind(Som);
    const k = 10 ** (d / 20);
    const alvo = (n) => /^nave\.[a-z]+\.tiro$/.test(n) || n.startsWith('nave.terminus.rotativa.') || n.startsWith('acerto.') || n === 'nave.drone.tiro';
    Som.achar = (n) => { const s = achar(n); return s && alvo(n) ? { def: { ...s.def, volume: s.def.volume * k }, buffer: s.buffer } : s; };
  }, tiroDb);
  console.log(`EXPERIMENTO: tiros e acertos em ${tiroDb} dB`);
}
await page.evaluate((comTrilha) => {
  const Som = window.__som;
  const ctx = Som.contexto();
  ctx.resume();
  const sonda = { blocos: [], t0: null, log: [] };
  window.__sonda = sonda;
  const sp = ctx.createScriptProcessor(4096, 2, 1);
  const mudo = ctx.createGain(); mudo.gain.value = 0;
  Som.fimNo.connect(sp).connect(mudo).connect(ctx.destination);
  // --com-trilha: what the player hears, the soundtrack included
  if (comTrilha) window.__music.saidaNo.connect(sp);
  sp.onaudioprocess = (e) => {
    if (sonda.t0 === null) sonda.t0 = e.playbackTime;
    const [l, r] = [e.inputBuffer.getChannelData(0), e.inputBuffer.getChannelData(1)];
    const m = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) m[i] = (l[i] + r[i]) / 2;
    sonda.blocos.push(m);
  };
  const quer = (n) => n.startsWith('fx.') || n === 'drone.minerar' || n === 'larva.perfura';
  const tocar = Som.tocar.bind(Som);
  Som.tocar = (n, o) => { if (quer(n)) sonda.log.push({ n, t: ctx.currentTime }); return tocar(n, o); };
  const laco = Som.laco.bind(Som);
  Som.laco = (n, i) => { if (quer(n)) sonda.log.push({ n, t: ctx.currentTime }); return laco(n, i); };
}, process.argv.includes('--com-trilha'));

for (const fase of fases) {
  await page.evaluate((f) => {
    const s = window.__sonda; s.blocos = []; s.t0 = null; s.log = [];
    window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: f, handling: 'diegetico' });
  }, fase);
  await page.waitForFunction(() => window.__game.scene.isActive('Game'), null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => { const g = window.__game.scene.getScene('Game'); g.damageShip = () => {}; g.gameOver = () => {}; });
  if (atirar) await page.keyboard.down('Space');
  await page.waitForTimeout(seg * 1000);
  if (atirar) await page.keyboard.up('Space');
  const r = await page.evaluate(async () => {
    const s = window.__sonda; const ctx = window.__som.contexto(); const sr = ctx.sampleRate;
    const voz = window.__som.diagnostico().vozes;
    const pcm = new Float32Array(s.blocos.reduce((a, b) => a + b.length, 0));
    let p = 0;
    for (const b of s.blocos) { pcm.set(b, p); p += b.length; }
    const off = new OfflineAudioContext(1, pcm.length, sr);
    const b = off.createBuffer(1, pcm.length, sr); b.copyToChannel(pcm, 0);
    const src = off.createBufferSource(); src.buffer = b;
    const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 100;
    const pk = off.createBiquadFilter(); pk.type = 'highshelf'; pk.frequency.value = 1500; pk.gain.value = 4;
    src.connect(hp).connect(pk).connect(off.destination); src.start();
    const k = (await off.startRendering()).getChannelData(0);
    const passo = Math.floor(0.1 * sr); const jan = Math.floor(0.4 * sr);
    const e = [];
    for (let i = 0; i + jan <= k.length; i += passo) { let x = 0; for (let j = i; j < i + jan; j += 8) x += k[j] * k[j]; e.push(x / (jan / 8)); }
    const db = (x) => 10 * Math.log10(x + 1e-12);
    const ord = [...e].sort((x, y) => x - y);
    const eventos = s.log.map(({ n, t }) => {
      const i = Math.round((t - s.t0) / 0.1);
      const antes = e.slice(Math.max(0, i - 30), Math.max(1, i - 2)).sort((x, y) => x - y);
      const base = antes[Math.floor(antes.length / 2)] ?? 0;
      const dur = Math.min(6, (window.__som.duracao(n) || 3) + 0.4);
      const depois = e.slice(i, i + Math.ceil(dur / 0.1));
      return { n, t: t - s.t0, base: db(base), pico: db(Math.max(0, ...depois)), salta: db(Math.max(0, ...depois)) - db(base) };
    });
    // THE CONTROL: the same jump measured at moments when no ambience sound fired (combat alone moves the mix this much)
    const livres = [];
    for (let i = 40; i < e.length - 40; i += 7) {
      const t = s.t0 + i * 0.1;
      if (s.log.some((l) => Math.abs(l.t - t) < 4)) continue;
      const antes = e.slice(i - 30, i - 2).sort((x, y) => x - y);
      livres.push(db(Math.max(...e.slice(i, i + 30))) - db(antes[Math.floor(antes.length / 2)]));
    }
    livres.sort((x, y) => x - y);
    const controle = livres.length ? { n: livres.length, p50: livres[Math.floor(livres.length / 2)], p90: livres[Math.floor(livres.length * 0.9)] } : null;
    return { eventos, controle, mediana: db(ord[Math.floor(ord.length / 2)] ?? 0), alto: db(ord[Math.floor(ord.length * 0.95)] ?? 0), voz };
  });
  console.log(`\n=== F${fase} (${seg} s${atirar ? ', atirando' : ', sem atirar'}) — a mistura: mediana ${r.mediana.toFixed(1)} dB, trechos altos ${r.alto.toFixed(1)} dB; motor tocando: ${r.voz.some((v) => v.endsWith('.motor'))}`);
  if (!r.eventos.length) console.log('  (nenhum som de ambiente disparou)');
  console.log(r.controle ? `  controle (sem som de ambiente, ${r.controle.n} momentos): salta ${r.controle.p50.toFixed(1)} dB típico, ${r.controle.p90.toFixed(1)} dB nos 10% maiores` : '  controle: sem trechos livres');
  const porNome = new Map();
  for (const ev of r.eventos.filter((x) => x.pico > -100)) porNome.set(ev.n, [...(porNome.get(ev.n) ?? []), ev.salta]);
  for (const [n, v] of [...porNome].sort()) {
    const o = [...v].sort((a, b) => a - b);
    const med = o[Math.floor(o.length / 2)];
    console.log(`  ${n.padEnd(22)} ${String(v.length).padStart(3)}×  salta ${med.toFixed(1).padStart(5)} dB${r.controle && med <= r.controle.p90 ? '   ← não se distingue do combate' : ''}`);
  }
}
await browser.close();
