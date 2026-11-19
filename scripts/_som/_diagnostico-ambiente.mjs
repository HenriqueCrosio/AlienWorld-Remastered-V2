// BLOCK SOUND (18/11) — why were the sheet 8 sounds not heard? Evidence at each layer, nothing changed:
//   1. the page: the player's volumes as they really start, and which sounds decoded;
//   2. the MASKING: each sound at the end of the chain, octave band by octave band, against the soundtrack in that band
//      (the margin of its best band: below about −3 dB the music covers it);
//   3. real play on the F2 with the gun held: how many voices sound at once, how many were refused, and whether a long far
//      sound survives to its end under the voice cap.
//   npm run dev  in another terminal, then  node scripts/_som/_diagnostico-ambiente.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, reducedMotion: 'reduce' });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());
await page.waitForTimeout(500);

// ── 1. the page ──
const base = await page.evaluate(async () => {
  const Som = window.__som;
  const { SONS } = await import('/src/som/catalogoSons.ts');
  const novos = Object.keys(SONS).filter((n) => n.startsWith('amb.') || n.startsWith('fx.'));
  const faltam = novos.filter((n) => Som.duracao(n) === 0);
  const d = Som.diagnostico();
  return { volumes: Som.volumes(), ganhos: d.ganhos, abafo: d.abafo, carregados: d.carregados, novos: novos.length, faltam };
});
console.log('1. A PÁGINA', JSON.stringify(base));

// ── 2. the masking ──
const NOMES = [
  ['nave.xaelo.tiro', 'cabine'], ['explosao.metal', 'cabine'],
  ['amb.f1.fora', 'atmosfera'], ['amb.f2', 'cabine'], ['amb.f3.nebulosa', 'cabine'], ['amb.f3.casco', 'cabine'], ['amb.f4.interior', 'interior'], ['amb.f4.agua', 'agua'],
  ['fx.f1.flyby', 'atmosfera'], ['fx.f1.artilharia', 'atmosfera'], ['fx.f1.flak', 'atmosfera'], ['fx.f1.explosao', 'atmosfera'], ['fx.f1.aranha', 'caverna'],
  ['fx.f2.laser', 'cabine'], ['fx.f2.martelo', 'cabine'], ['fx.f2.metal', 'cabine'], ['fx.f2.rangido', 'cabine'], ['fx.f2.passa', 'cabine'], ['fx.f2.cascalho', 'cabine'],
  ['fx.f3.enguia', 'cabine'], ['fx.f3.rabo', 'cabine'], ['fx.f3.vapor', 'cabine'], ['fx.f3.faiscas', 'cabine'], ['fx.f3.baque', 'cabine'],
  ['fx.f4.coracao', 'interior'], ['fx.f4.fornalha', 'interior'], ['fx.f4.golfinho', 'agua'], ['fx.f4.agua.sobe', 'interior'],
];
const mascara = await page.evaluate(async (nomes) => {
  const Som = window.__som;
  const ctx = Som.contexto();
  const { SONS } = await import('/src/som/catalogoSons.ts');
  for (const s of window.__game.scene.getScenes(true)) s.scene.pause();
  const BANDAS = [63, 125, 250, 500, 1000, 2000, 4000];
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  /** the energy of a mono signal in one octave band: the loudest 400 ms (`pico`) or the median 400 ms (the music) */
  async function bandas(pcm, sr, modo) {
    const out = [];
    for (const f of BANDAS) {
      const off = new OfflineAudioContext(1, pcm.length, sr);
      const b = off.createBuffer(1, pcm.length, sr);
      b.copyToChannel(pcm, 0);
      const src = off.createBufferSource();
      src.buffer = b;
      const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = f / Math.SQRT2;
      const lp = off.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f * Math.SQRT2;
      src.connect(hp).connect(lp).connect(off.destination);
      src.start();
      const r = (await off.startRendering()).getChannelData(0);
      const n = Math.floor(0.4 * sr);
      const js = [];
      for (let i = 0; i + n <= r.length; i += Math.floor(n / 2)) {
        let s = 0;
        for (let j = i; j < i + n; j += 4) s += r[j] * r[j];
        js.push(s / (n / 4));
      }
      js.sort((a, b2) => a - b2);
      const e = modo === 'pico' ? js[js.length - 1] : js[Math.floor(js.length / 2)];
      out.push(10 * Math.log10((e ?? 0) + 1e-12));
    }
    return out;
  }
  // the soundtrack as the game plays it (the file × Music.VOLUME 0.45)
  const bruto = await (await fetch('/audio/stage1.mp3')).arrayBuffer();
  const mus = await ctx.decodeAudioData(bruto);
  const ini = Math.floor(mus.length * 0.2);
  const trecho = mus.getChannelData(0).slice(ini, ini + mus.sampleRate * 40).map((v) => v * 0.45);
  const musica = await bandas(trecho, mus.sampleRate, 'mediana');

  Som.volumes = () => ({ geral: 1, efeitos: 1, musica: 1 });
  Som.atualizarVolume();
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
  const out = [];
  for (const [nome, lugar] of nomes) {
    Som.trocarDeCena(lugar, 30);
    await espera(250);
    blocos = [];
    if (SONS[nome].laco) {
      const l = Som.laco(nome, 1);
      await espera(4000);
      l?.parar(30);
    } else {
      Som.tocar(nome, { x: 192 });
      await espera(Math.min(6000, Som.duracao(nome) * 1000 + 800));
    }
    const tot = blocos.reduce((a, b) => a + b.length, 0);
    const pcm = new Float32Array(tot);
    let p = 0;
    for (const b of blocos) { pcm.set(b, p); p += b.length; }
    const e = await bandas(pcm, ctx.sampleRate, 'pico');
    const margens = e.map((v, i) => v - musica[i]);
    const melhor = margens.indexOf(Math.max(...margens));
    out.push({ nome, nivel: e, margem: margens[melhor], banda: BANDAS[melhor], grave: Math.max(...e.slice(0, 2)), medio: Math.max(...e.slice(3)) });
  }
  return { musica, out, BANDAS };
}, NOMES);
console.log('\n2. O MASCARAMENTO (a margem da melhor banda contra a trilha; abaixo de −3 dB a música cobre)');
console.log('   trilha por banda:', mascara.BANDAS.map((b, i) => `${b}Hz ${mascara.musica[i].toFixed(0)}`).join('  '));
for (const l of mascara.out) {
  const v = l.margem < -3 ? 'COBERTO' : l.margem < 3 ? 'no limite' : 'ouve-se';
  console.log(`   ${l.nome.padEnd(20)} margem ${l.margem.toFixed(1).padStart(6)} dB em ${String(l.banda).padStart(4)} Hz  ${v.padEnd(10)} energia acima de 500 Hz ${l.medio.toFixed(0).padStart(4)} dB`);
}
await browser.close();

// ── 3. real play ──
const b2 = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p2 = await b2.newPage({ viewport: { width: 1152, height: 648 }, reducedMotion: 'reduce' });
await p2.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await p2.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await p2.waitForTimeout(1200);
await p2.keyboard.press('ArrowDown');
await p2.evaluate(() => window.__som.contexto().resume());
await p2.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 2, ship: 'interceptor' }));
await p2.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.ship?.active && s.stage?.id === 2; }, null, { timeout: 60000 });
await p2.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; s.elapsed = 40; });
await p2.keyboard.down('Space');
const jogo = await p2.evaluate(async () => {
  const Som = window.__som;
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const r0 = Som.diagnostico().recusadas;
  let max = 0, soma = 0, n = 0, longos = 0, cortados = 0;
  const fim = performance.now() + 30000;
  let proximo = performance.now() + 1000;
  while (performance.now() < fim) {
    const d = Som.diagnostico();
    max = Math.max(max, d.vozes.length); soma += d.vozes.length; n++;
    if (performance.now() > proximo) {
      proximo = performance.now() + 9000;
      Som.tocar('fx.f2.laser', { x: 192 });
      longos++;
      await espera(6000);
      if (!Som.tocando('fx.f2.laser')) cortados++;
    }
    await espera(100);
  }
  const d = Som.diagnostico();
  return { maxVozes: max, mediaVozes: +(soma / n).toFixed(1), recusadas: d.recusadas - r0, longos, cortados, ganhos: d.ganhos, abafo: d.abafo, acaoMuda: d.acaoMuda, volumes: Som.volumes() };
});
console.log('\n3. JOGANDO A F2 COM O TIRO APERTADO', JSON.stringify(jogo));
await b2.close();
console.log(erros.length ? `erros: ${erros.join(' | ')}` : '\nsem erros na página');
