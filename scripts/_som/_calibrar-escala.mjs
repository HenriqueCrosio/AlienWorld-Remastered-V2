// BLOCK SOUND (18/11) — THE SCALE OF THE GAME, without the music (him: *"precisamos construir uma escala lógica dos sons"*).
// Each sound has a step on one ladder, in LUFS (momentary, BS.1770 weighting, tapped at the very end of the real chain, in its
// place): a one-shot is judged by its loudest 400 ms, a loop by its mean. Far is still far (dark, narrow, with a tail), but
// what is huge and far away stands next to the small gun right here, as it would in reality.
//   npm run dev  in another terminal, then
//   node scripts/_som/_calibrar-escala.mjs [--so prefixo] [--aplicar] [--exigir]
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);

/**
 * THE LADDER (LUFS), anchored on what he already approved, measured on this same ruler (`--referencias`): a boss's end −7,
 * the boom −9, a big blast −12, a common blast −15.5, the ship's gunfire −22 (it fires all the time: 6 dB under where it was).
 * Between them, the world: what is huge and far stands near the small gun right here.
 */
const DEGRAU = {
  trovaoPerto: -17, momento: -15, perto: -17, trovaoLonge: -18, medio: -19, sobrevoo: -19, colosso: -20, longe: -21,
  broca: -21, muitoLonge: -22, repetido: -23, chuva: -24, motor: -29, fundo: -30, tensao: -31, detalhe: -31,
};
const ESCALA = {
  // the place
  'amb.menu.noite': 'fundo', 'amb.amanhecer': 'fundo', 'amb.hangar': 'fundo', 'amb.f1.fora': 'fundo', 'amb.f1.caverna': 'fundo', 'amb.f2': 'fundo',
  'amb.f3.nebulosa': 'fundo', 'amb.f3.casco': 'fundo', 'amb.f4.interior': 'fundo', 'amb.f4.interior2': 'fundo', 'amb.f4.agua': 'fundo',
  'amb.espaco.tensao': 'tensao', 'amb.hangar.chuva': 'chuva',
  // the ship
  'nave.xaelo.motor': 'motor', 'nave.terminus.motor': 'motor', 'nave.charybdis.motor': 'motor',
  // the storm
  'fx.menu.trovao.perto': 'trovaoPerto', 'fx.menu.trovao.perto2': 'trovaoPerto', 'fx.menu.trovao.longe': 'trovaoLonge', 'fx.menu.trovao.longe2': 'trovaoLonge',
  'fx.menu.trovao.longe3': 'trovaoLonge', 'fx.menu.trovao.longe4': 'trovaoLonge', 'fx.menu.trovao.longe5': 'trovaoLonge', 'fx.hangar.trovao': 'colosso',
  // F1
  'fx.f1.flyby': 'sobrevoo', 'fx.f1.flyby2': 'sobrevoo', 'fx.f1.flyby3': 'sobrevoo', 'fx.f1.artilharia': 'repetido', 'fx.f1.flak': 'muitoLonge', 'fx.f1.flak2': 'muitoLonge',
  'fx.f1.explosao': 'muitoLonge', 'fx.f1.explosao2': 'muitoLonge', 'fx.f1.aranha': 'detalhe',
  // F2
  'fx.f2.laser': 'colosso', 'fx.f2.martelo': 'colosso', 'fx.f2.metal': 'longe', 'fx.f2.rangido': 'medio', 'fx.f2.rangido2': 'medio', 'fx.f2.cascalho': 'perto', 'fx.f2.passa': 'repetido',
  'drone.minerar': 'broca',
  // F3
  'fx.f3.enguia': 'sobrevoo', 'fx.f3.rabo': 'momento', 'fx.f3.vapor': 'longe', 'fx.f3.faiscas': 'longe', 'fx.f3.faiscas2': 'longe', 'fx.f3.baque': 'muitoLonge',
  // F4
  'fx.f4.coracao': 'repetido', 'fx.f4.fornalha': 'repetido', 'fx.f4.agua.sobe': 'perto', 'fx.f4.agua.desce': 'perto', 'fx.f4.golfinho': 'longe',
};
const LUGAR = (n) => {
  if (n === 'amb.f1.caverna' || n === 'fx.f1.aranha') return 'caverna';
  if (n === 'amb.f4.agua' || n === 'fx.f4.agua.desce' || n === 'fx.f4.golfinho') return 'agua';
  if (n.startsWith('amb.f4') || n.startsWith('fx.f4')) return 'interior';
  if (n.startsWith('amb.f2') || n.startsWith('amb.f3') || n.startsWith('amb.espaco') || n.startsWith('fx.f2') || n.startsWith('fx.f3') || n === 'drone.minerar' || n.endsWith('.motor')) return 'cabine';
  return 'atmosfera';
};

const so = arg('--so');
// --referencias: only prints where the sounds he already approved stand on this same ruler (the anchors of the ladder)
const REFERENCIAS = ['nave.xaelo.tiro', 'nave.charybdis.tiro', 'nave.terminus.rotativa.laco', 'acerto.metal', 'acerto.rocha', 'explosao.metal', 'explosao.perigo', 'explosao.metalGrande', 'explosao.chefeFim', 'momento.f1.estrondo', 'momento.f1.estrondo.xaelo', 'inimigo.tiro', 'drone.tiro'];
const soReferencias = process.argv.includes('--referencias');
const nomes = soReferencias ? REFERENCIAS : Object.keys(ESCALA).filter((n) => !so || n.startsWith(so));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 }, reducedMotion: 'reduce' });
page.on('pageerror', (e) => console.error('pageerror', String(e)));
await page.goto(`http://localhost:${arg('--porta') ?? '5173'}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());

const linhas = await page.evaluate(async ({ nomes, lugares }) => {
  const Som = window.__som;
  const ctx = Som.contexto();
  for (const s of window.__game.scene.getScenes(true)) s.scene.pause();
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  // the measure takes no chance: no per-shot variation
  const achar = Som.achar.bind(Som);
  Som.achar = (n) => { const s = achar(n); return s ? { def: { ...s.def, variacao: { tom: 0, vol: 0 } }, buffer: s.buffer } : s; };
  Som.volumes = () => ({ geral: 1, efeitos: 1, musica: 0 });
  Som.atualizarVolume();
  const sp = ctx.createScriptProcessor(4096, 2, 2);
  const mudo = ctx.createGain(); mudo.gain.value = 0;
  Som.fimNo.connect(sp).connect(mudo).connect(ctx.destination);
  let L = []; let R = [];
  sp.onaudioprocess = (e) => { L.push(new Float32Array(e.inputBuffer.getChannelData(0))); R.push(new Float32Array(e.inputBuffer.getChannelData(1))); };
  const junta = (bs) => { const o = new Float32Array(bs.reduce((a, b) => a + b.length, 0)); let p = 0; for (const b of bs) { o.set(b, p); p += b.length; } return o; };
  async function pesar(pcm) {
    const off = new OfflineAudioContext(1, pcm.length, ctx.sampleRate);
    const b = off.createBuffer(1, pcm.length, ctx.sampleRate); b.copyToChannel(pcm, 0);
    const src = off.createBufferSource(); src.buffer = b;
    const pre = off.createBiquadFilter(); pre.type = 'highshelf'; pre.frequency.value = 1681; pre.gain.value = 4;
    const rlb = off.createBiquadFilter(); rlb.type = 'highpass'; rlb.frequency.value = 38; rlb.Q.value = 0.5;
    src.connect(pre).connect(rlb).connect(off.destination); src.start();
    return (await off.startRendering()).getChannelData(0);
  }
  const out = [];
  for (const nome of nomes) {
    const s = Som.achar(nome);
    if (!s) { out.push({ nome, falta: true }); continue; }
    Som.trocarDeCena(lugares[nome], 30);
    await espera(300);
    const laco = !!s.def.laco;
    const l = laco ? Som.laco(nome, 1) : null;
    if (laco) await espera(400);
    L = []; R = [];
    if (!laco) Som.tocar(nome, { x: 192 });
    await espera(laco ? 3500 : Math.min(7000, Som.duracao(nome) * 1000 + 900));
    l?.parar(30);
    const [kl, kr] = [await pesar(junta(L)), await pesar(junta(R))];
    const n = Math.floor(0.4 * ctx.sampleRate); const js = [];
    for (let i = 0; i + n <= kl.length; i += Math.floor(n / 4)) { let e = 0; for (let j = i; j < i + n; j += 2) e += kl[j] * kl[j] + kr[j] * kr[j]; js.push(e / (n / 2)); }
    const e = laco ? js.reduce((a, b) => a + b, 0) / Math.max(1, js.length) : Math.max(0, ...js);
    out.push({ nome, volume: s.def.volume, lufs: -0.691 + 10 * Math.log10(e + 1e-12) });
  }
  return out;
}, { nomes, lugares: Object.fromEntries(nomes.map((n) => [n, LUGAR(n)])) });
await browser.close();

if (soReferencias) {
  for (const l of linhas) console.log(`${l.nome.padEnd(30)} ${l.falta ? 'não carregado' : `${l.lufs.toFixed(1).padStart(6)} LUFS  (vol ${l.volume})`}`);
  process.exit(0);
}
let falhas = 0;
let texto = readFileSync('src/som/catalogoSons.ts', 'utf8');
for (const l of linhas) {
  if (l.falta) { console.log(`✘ ${l.nome}: não carregado`); falhas++; continue; }
  const alvo = DEGRAU[ESCALA[l.nome]];
  const sugere = l.volume * 10 ** ((alvo - l.lufs) / 20);
  const teto = sugere > 1;
  const erro = Math.abs(l.lufs - alvo) > 1.5;
  if (erro) falhas++;
  console.log(`${erro ? '✘' : '✔'} ${l.nome.padEnd(24)} ${ESCALA[l.nome].padEnd(12)} alvo ${String(alvo).padStart(4)}  medido ${l.lufs.toFixed(1).padStart(6)}  vol ${l.volume.toFixed(2)} → ${Math.min(1, sugere).toFixed(2)}${teto ? '  (NO TETO)' : ''}`);
  if (process.argv.includes('--aplicar')) {
    const re = new RegExp(`('${l.nome.replaceAll('.', '\\.')}':\\s*\\{?\\s*(?:\\.\\.\\.)?\\w+\\('[^']*',\\s*)[0-9.]+`);
    if (!re.test(texto)) throw new Error(`${l.nome}: a linha do catálogo não foi achada`);
    texto = texto.replace(re, `$1${+Math.max(0.02, Math.min(1, sugere)).toFixed(2)}`);
  }
}
if (process.argv.includes('--aplicar')) { writeFileSync('src/som/catalogoSons.ts', texto); console.log('catálogo atualizado'); }
console.log(falhas ? `${falhas} fora da escala` : 'todos na escala');
if (process.argv.includes('--exigir') && falhas) process.exitCode = 1;
