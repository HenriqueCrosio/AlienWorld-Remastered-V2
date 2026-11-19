// BLOCK SOUND (18/11) — the ambience WITHOUT the music (him: *"a ambientação precisa funcionar perfeitamente antes mesmo da
// música entrar"*). Place by place, through the real chain, tapped at the very end: the bed, the ship's engine and each
// sound of that place alone. The number that matters is how far each sound stands over WHAT IS ALREADY SOUNDING THERE
// (the bed + the engine), in its best octave band, next to the sounds he hears well (the shot, a blast).
//   npm run dev  in another terminal, then  node scripts/_som/_medir-sem-musica.mjs [--lugar f2] [--json arquivo]
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const REF = ['nave.xaelo.tiro', 'explosao.metal'];
const LUGARES = [
  { id: 'menu', lugar: 'atmosfera', fundo: 'amb.menu.noite', sons: ['fx.menu.trovao.perto', 'fx.menu.trovao.perto2', 'fx.menu.trovao.longe', 'fx.menu.trovao.longe2'] },
  { id: 'f1', lugar: 'atmosfera', fundo: 'amb.f1.fora', motor: true, sons: ['fx.f1.flyby', 'fx.f1.flyby2', 'fx.f1.flyby3', 'fx.f1.artilharia', 'fx.f1.flak', 'fx.f1.flak2', 'fx.f1.explosao', 'fx.f1.explosao2', ...REF] },
  { id: 'caverna', lugar: 'caverna', fundo: 'amb.f1.caverna', motor: true, sons: ['fx.f1.aranha', ...REF] },
  { id: 'f2', lugar: 'cabine', fundo: 'amb.f2', motor: true, sons: ['fx.f2.laser', 'fx.f2.martelo', 'fx.f2.metal', 'fx.f2.rangido', 'fx.f2.rangido2', 'fx.f2.passa', 'fx.f2.cascalho', 'drone.minerar', ...REF] },
  { id: 'f3', lugar: 'cabine', fundo: 'amb.f3.nebulosa', motor: true, sons: ['fx.f3.enguia', 'fx.f3.rabo', 'drone.minerar', ...REF] },
  { id: 'casco', lugar: 'cabine', fundo: 'amb.f3.casco', motor: true, sons: ['fx.f3.vapor', 'fx.f3.faiscas', 'fx.f3.faiscas2', 'fx.f3.baque', ...REF] },
  { id: 'f4', lugar: 'interior', fundo: 'amb.f4.interior', motor: true, sons: ['fx.f4.coracao', 'fx.f4.fornalha', 'fx.f4.agua.sobe', 'larva.perfura', ...REF] },
  { id: 'agua', lugar: 'agua', fundo: 'amb.f4.agua', motor: true, sons: ['fx.f4.agua.desce', 'fx.f4.golfinho', ...REF] },
].filter((l) => !arg('--lugar') || l.id === arg('--lugar'));

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, reducedMotion: 'reduce' });
page.on('pageerror', (e) => console.error('pageerror', String(e)));
await page.goto(`http://localhost:${arg('--porta') ?? '5173'}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());

const saida = await page.evaluate(async ({ LUGARES }) => {
  const Som = window.__som;
  const ctx = Som.contexto();
  for (const s of window.__game.scene.getScenes(true)) s.scene.pause();
  const BANDAS = [63, 125, 250, 500, 1000, 2000, 4000];
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const db = (p) => 10 * Math.log10(p + 1e-12);
  async function filtra(pcm, sr, ligar) {
    const off = new OfflineAudioContext(1, pcm.length, sr);
    const b = off.createBuffer(1, pcm.length, sr);
    b.copyToChannel(pcm, 0);
    const src = off.createBufferSource();
    src.buffer = b;
    ligar(off, src).connect(off.destination);
    src.start();
    return (await off.startRendering()).getChannelData(0);
  }
  function janelas(r, sr) {
    const n = Math.floor(0.4 * sr);
    const js = [];
    for (let i = 0; i + n <= r.length; i += Math.floor(n / 2)) {
      let s = 0;
      for (let j = i; j < i + n; j += 4) s += r[j] * r[j];
      js.push(s / (n / 4));
    }
    return js.length ? js : [0];
  }
  const resumo = (js, modo) => (modo === 'media' ? js.reduce((a, b) => a + b, 0) / js.length : Math.max(...js));
  async function medir(pcm, modo) {
    const sr = ctx.sampleRate;
    const bandas = [];
    for (const f of BANDAS) {
      const r = await filtra(pcm, sr, (off, src) => {
        const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = f / Math.SQRT2;
        const lp = off.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f * Math.SQRT2;
        return src.connect(hp).connect(lp);
      });
      bandas.push(resumo(janelas(r, sr), modo));
    }
    // the broad level, weighted roughly like the ear: little under 100 Hz, a lift around 3 kHz
    const r = await filtra(pcm, sr, (off, src) => {
      const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 100;
      const pk = off.createBiquadFilter(); pk.type = 'highshelf'; pk.frequency.value = 1500; pk.gain.value = 4;
      return src.connect(hp).connect(pk);
    });
    return { bandas, nivel: db(resumo(janelas(r, sr), modo)) };
  }
  const sp = ctx.createScriptProcessor(4096, 2, 1);
  const mudo = ctx.createGain(); mudo.gain.value = 0;
  Som.fimNo.connect(sp).connect(mudo).connect(ctx.destination);
  let blocos = [];
  sp.onaudioprocess = (e) => {
    const [l, r] = [e.inputBuffer.getChannelData(0), e.inputBuffer.getChannelData(1)];
    const m = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) m[i] = (l[i] + r[i]) / 2;
    blocos.push(m);
  };
  const colher = () => {
    const pcm = new Float32Array(blocos.reduce((a, b) => a + b.length, 0));
    let p = 0;
    for (const b of blocos) { pcm.set(b, p); p += b.length; }
    return pcm;
  };
  const volumes = (musica) => { Som.volumes = () => ({ geral: 1, efeitos: 1, musica }); Som.atualizarVolume(); };
  async function laco(lugar, nome) {
    Som.trocarDeCena(lugar, 30);
    await espera(350);
    const l = Som.laco(nome, 1);
    await espera(500);
    blocos = [];
    await espera(3200);
    const m = await medir(colher(), 'media');
    l?.parar(30);
    return m;
  }
  async function umSom(lugar, nome) {
    Som.trocarDeCena(lugar, 30);
    await espera(350);
    blocos = [];
    if (Som.duracao(nome) === 0) return null;
    const ehLaco = nome === 'drone.minerar';
    const l = ehLaco ? Som.laco(nome, 1) : (Som.tocar(nome, { x: 192 }), null);
    await espera(ehLaco ? 3000 : Math.min(7000, Som.duracao(nome) * 1000 + 1200));
    l?.parar(30);
    return medir(colher(), 'pico');
  }
  const out = [];
  for (const L of LUGARES) {
    const porMusica = {};
    for (const musica of [1, 0]) {
      volumes(musica);
      const fundo = await laco(L.lugar, L.fundo);
      const motor = L.motor ? await laco(L.lugar, 'nave.xaelo.motor') : null;
      porMusica[musica] = { fundo, motor };
    }
    volumes(1);
    const sons = [];
    for (const nome of L.sons) sons.push({ nome, m: await umSom(L.lugar, nome) });
    out.push({ id: L.id, porMusica, sons });
  }
  return { BANDAS, out };
}, { LUGARES });
await browser.close();

const db = (p) => 10 * Math.log10(p + 1e-12);
const f = (v) => v.toFixed(1).padStart(6);
for (const L of saida.out) {
  console.log(`\n=== ${L.id} ===`);
  for (const musica of ['1', '0']) {
    const { fundo, motor } = L.porMusica[musica];
    const piso = fundo.bandas.map((b, i) => b + (motor?.bandas[i] ?? 0));
    const sobre = motor ? Math.max(...motor.bandas.map((b, i) => db(b) - db(fundo.bandas[i]))) : null;
    console.log(`MÚSICA ${musica === '1' ? '10' : ' 0'}: fundo ${f(fundo.nivel)} dB   motor ${motor ? f(motor.nivel) : '   — '} dB   motor sobre o fundo ${sobre === null ? '—' : `${f(sobre)} dB`}`);
    L[`piso${musica}`] = piso;
  }
  for (const { nome, m } of L.sons) {
    if (!m) { console.log(`  ${nome.padEnd(24)} (não carregado)`); continue; }
    const margem = (piso) => { const ms = m.bandas.map((b, i) => db(b) - db(piso[i])); const v = Math.max(...ms); return [v, saida.BANDAS[ms.indexOf(v)]]; };
    const [m10, b10] = margem(L.piso1);
    const [m0] = margem(L.piso0);
    console.log(`  ${nome.padEnd(24)} nível ${f(m.nivel)} dB   sobre fundo+motor ${f(m10)} dB em ${String(b10).padStart(4)} Hz (MÚSICA 0: ${f(m0)})`);
  }
}
if (arg('--json')) writeFileSync(arg('--json'), JSON.stringify(saida));
