// BLOCK SOUND (18/11) — sheet 8: each ambience sound ALONE, in its place, through the real chain, tapped at the very end,
// and compared with THE SOUNDTRACK BAND BY BAND. The number that matters is the MARGIN: how many dB the sound stands over
// the music in its best octave band. What he hears well sits at about +3 (the X-AELO's shot +2.7, the metal blast +2.8);
// under −3 the music covers it. A level measured alone says nothing: the first calibration (−29 to −34 LUFS, alone) left
// 22 of 26 sounds under the music. Each plane of distance has its margin, and the far ones stay audible.
//   npm run dev  in another terminal, then
//   node scripts/_som/_medir-ambiente.mjs [--so prefixo] [--aplicar] [--exigir]
//     --aplicar  writes the suggested volumes into src/som/catalogoSons.ts      --exigir  exit 1 if a sound misses its margin
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const porta = arg('--porta') ?? '5173';
const so = arg('--so');

/** The margin (dB over the music, best band) of each plane. Beds lie UNDER the music on purpose: they are its floor. */
const MARGEM = { fundo: -6, perto: 3, medio: 1.5, longe: 0, muitoLonge: -1.5 };
const EXCECOES = {
  'fx.f3.rabo': 4, 'fx.f4.agua.sobe': 4, 'fx.f4.agua.desce': 3, 'fx.menu.trovao.perto': 3, 'fx.menu.trovao.perto2': 3,
  'fx.f2.rangido': 1.5, 'fx.f2.rangido2': 1.5, 'fx.f1.aranha': 1,
};
const LUGAR = (n) => {
  if (n === 'amb.f1.caverna' || n === 'fx.f1.aranha') return 'caverna';
  if (n === 'amb.f4.agua' || n === 'fx.f4.agua.desce' || n === 'fx.f4.golfinho') return 'agua';
  if (n.startsWith('amb.f4') || n.startsWith('fx.f4')) return 'interior';
  if (n.startsWith('amb.f2') || n.startsWith('amb.f3') || n.startsWith('fx.f2') || n.startsWith('fx.f3')) return 'cabine';
  return 'atmosfera';
};

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
// (reduced motion: the night menu's lightning, on the HD layer's own game, would thunder over the measurements)
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, reducedMotion: 'reduce' });
page.on('pageerror', (e) => console.error('pageerror', String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());

const linhas = await page.evaluate(async ({ MARGEM, EXCECOES, so, lugares }) => {
  const Som = window.__som;
  const ctx = Som.contexto();
  const { SONS } = await import('/src/som/catalogoSons.ts');
  for (const s of window.__game.scene.getScenes(true)) s.scene.pause();
  const BANDAS = [63, 125, 250, 500, 1000, 2000, 4000];
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
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
      js.sort((x, y) => x - y);
      // (a bed is judged by its mean energy: the median falls in the gaps of one that breathes)
      const media = js.reduce((a, b2) => a + b2, 0) / Math.max(1, js.length);
      out.push(10 * Math.log10((modo === 'pico' ? js[js.length - 1] : modo === 'media' ? media : js[Math.floor(js.length / 2)] ?? 0) + 1e-12));
    }
    return out;
  }
  // the soundtrack as the game plays it (the file × Music.VOLUME 0.45), its typical 400 ms in each band
  const mus = await ctx.decodeAudioData(await (await fetch('/audio/stage1.mp3')).arrayBuffer());
  const ini = Math.floor(mus.length * 0.2);
  const musica = await bandas(mus.getChannelData(0).slice(ini, ini + mus.sampleRate * 40).map((v) => v * 0.45), mus.sampleRate, 'mediana');

  Som.volumes = () => ({ geral: 1, efeitos: 1, musica: 1 });
  Som.atualizarVolume();
  const sp = ctx.createScriptProcessor(4096, 2, 1);
  const mudo = ctx.createGain(); mudo.gain.value = 0;
  Som.fimNo.connect(sp).connect(mudo).connect(ctx.destination);
  let blocos = [];
  let pico = 0;
  sp.onaudioprocess = (e) => {
    const [l, r] = [e.inputBuffer.getChannelData(0), e.inputBuffer.getChannelData(1)];
    const m = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) { m[i] = (l[i] + r[i]) / 2; pico = Math.max(pico, Math.abs(l[i]), Math.abs(r[i])); }
    blocos.push(m);
  };
  const nomes = Object.keys(SONS).filter((n) => (n.startsWith('amb.') || n.startsWith('fx.')) && (!so || n.startsWith(so)));
  const out = [];
  for (const nome of nomes) {
    const def = SONS[nome];
    Som.trocarDeCena(lugares[nome], 30);
    await espera(250);
    blocos = []; pico = 0;
    if (def.laco) {
      const l = Som.laco(nome, 1);
      await espera(4500);
      l?.parar(30);
    } else {
      Som.tocar(nome, { x: 192 });
      await espera(Math.min(6500, Som.duracao(nome) * 1000 + 900));
    }
    const pcm = new Float32Array(blocos.reduce((a, b) => a + b.length, 0));
    let p = 0;
    for (const b of blocos) { pcm.set(b, p); p += b.length; }
    const e = await bandas(pcm, ctx.sampleRate, def.laco ? 'media' : 'pico');
    const margens = e.map((v, i) => v - musica[i]);
    const margem = Math.max(...margens);
    const alvo = EXCECOES[nome] ?? (def.laco ? MARGEM.fundo : MARGEM[def.distancia ?? 'perto']);
    out.push({ nome, plano: def.laco ? 'fundo' : (def.distancia ?? 'perto'), volume: def.volume, margem, banda: BANDAS[margens.indexOf(margem)], alvo, pico: 20 * Math.log10(pico + 1e-9), sugere: def.volume * 10 ** ((alvo - margem) / 20) });
  }
  return out;
}, { MARGEM, EXCECOES, so, lugares: Object.fromEntries((await page.evaluate(async () => Object.keys((await import('/src/som/catalogoSons.ts')).SONS))).map((n) => [n, LUGAR(n)])) });
await browser.close();

let falhas = 0;
for (const l of linhas) {
  const d = l.margem - l.alvo;
  const noTeto = l.sugere > 1;
  const erro = Math.abs(d) > 1.5;
  if (erro) falhas++;
  console.log(`${erro ? '✘' : '✔'} ${l.nome.padEnd(24)} ${l.plano.padEnd(10)} vol ${l.volume.toFixed(2)}  margem ${l.margem.toFixed(1).padStart(6)} dB em ${String(l.banda).padStart(4)} Hz  alvo ${String(l.alvo).padStart(4)}  pico ${l.pico.toFixed(1).padStart(6)}  → vol ${Math.min(1, l.sugere).toFixed(2)}${noTeto ? '  (NO TETO)' : ''}`);
}
console.log(falhas ? `${falhas} fora da margem` : 'todos na margem');

if (process.argv.includes('--aplicar')) {
  const arq = 'src/som/catalogoSons.ts';
  let texto = readFileSync(arq, 'utf8');
  let trocados = 0;
  for (const l of linhas) {
    const v = Math.max(0.02, Math.min(1, l.sugere));
    const nome = l.nome.replaceAll('.', '\\.');
    const re = new RegExp(`((?:FUNDO|NO_MUNDO|MOMENTO)\\('${nome}', )[0-9.]+`);
    if (!re.test(texto)) throw new Error(`${l.nome}: a linha do catálogo não foi achada`);
    texto = texto.replace(re, `$1${+v.toFixed(2)}`);
    trocados++;
  }
  writeFileSync(arq, texto);
  console.log(`catálogo: ${trocados} volumes escritos`);
}
if (process.argv.includes('--exigir') && falhas) process.exitCode = 1;
