// BLOCK SOUND (17/11) — the bosses' REGULATION, step 1: MEASURE before touching. Each boss sound plays ALONE, in its real
// place (the tower in the atmosphere, the rest in the cabin), through the real chain; the tap is the world's output after
// the acoustics (before the master). Per sound: the file's own level (the generation), the in-game peak and a short
// K-weighted loudness (the loudest 400 ms), against references he already approved (the big metal explosion, the X-AELO
// shot, a common enemy shot) — the quietest on top.
//   npm run dev  in another terminal, then  node scripts/_som/_medir-chefes.mjs [--json out.json]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const saidaJson = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.error('pageerror', String(e)));
const porta = process.argv.includes('--porta') ? process.argv[process.argv.indexOf('--porta') + 1] : '5173';
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());
await page.waitForTimeout(500);
if (process.argv.includes('--comparar')) await page.evaluate(() => { window.__comparar = true; });
// --interface: the interface sounds (sheet 6), tapped at the end of the chain; the soundtrack sits ≈ −20 LUFS in the game
// (the file −13.5 × `Music.VOLUME` 0.45)
if (process.argv.includes('--interface')) await page.evaluate(() => { window.__interface = true; });
if (process.argv.includes('--cena')) await page.evaluate(() => { window.__cena = true; });

const resultado = await page.evaluate(async () => {
  const Som = window.__som;
  const ctx = Som.contexto();
  const { SONS } = await import('/src/som/catalogoSons.ts');
  // silence the menu: its voices out, then wait for the tails
  Som.trocarDeCena('atmosfera', 50);
  await new Promise((r) => setTimeout(r, 1200));

  // the tap: after the acoustics (abafoNo) → K-weighting (approx.) → a script processor that keeps 100 ms blocks
  const hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 1681; hs.gain.value = 4;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38; hp.Q.value = 0.5;
  const sp = ctx.createScriptProcessor(4096, 2, 2);
  const mudo = ctx.createGain(); mudo.gain.value = 0;
  // (--interface: the interface layer skips the world's chain, so the tap is the very end, after the limiter)
  const ponto = window.__interface ? Som.fimNo : Som.abafoNo;
  ponto.connect(hs); hs.connect(hp); hp.connect(sp);
  // a raw tap too, for the true peak
  const sp2 = ctx.createScriptProcessor(4096, 2, 2);
  ponto.connect(sp2);
  sp.connect(mudo); sp2.connect(mudo); mudo.connect(ctx.destination);
  const bloco = Math.round(ctx.sampleRate * 0.1);
  let gravando = false; let blocos = []; let acc = 0; let nAcc = 0; let pico = 0;
  sp.onaudioprocess = (e) => {
    if (!gravando) return;
    const L = e.inputBuffer.getChannelData(0); const R = e.inputBuffer.getChannelData(1);
    for (let i = 0; i < L.length; i++) {
      acc += L[i] * L[i] + R[i] * R[i]; nAcc++;
      if (nAcc >= bloco) { blocos.push(acc / nAcc); acc = 0; nAcc = 0; }
    }
  };
  sp2.onaudioprocess = (e) => {
    if (!gravando) return;
    for (let c = 0; c < 2; c++) { const d = e.inputBuffer.getChannelData(c); for (let i = 0; i < d.length; i++) pico = Math.max(pico, Math.abs(d[i])); }
  };
  const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  const lufs = (ms) => (ms > 0 ? -0.691 + 10 * Math.log10(ms) : -Infinity);
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  // the file's own level (the generation): peak and loudest 400 ms RMS, unweighted
  function nivelDoArquivo(buf) {
    let p = 0; const n = buf.length; const ch = [...Array(buf.numberOfChannels).keys()].map((c) => buf.getChannelData(c));
    const w = Math.round(buf.sampleRate * 0.1); const bl = [];
    for (let i = 0; i < n; i += w) {
      let s = 0; let k = 0;
      for (let j = i; j < Math.min(n, i + w); j++) for (const d of ch) { s += d[j] * d[j]; p = Math.max(p, Math.abs(d[j])); k++; }
      bl.push(s / Math.max(1, k));
    }
    let m = 0;
    for (let i = 0; i < Math.max(1, bl.length - 3); i++) { const s = bl.slice(i, i + 4); m = Math.max(m, s.reduce((a, b) => a + b, 0) / s.length); }
    return { picoDb: db(p), rms400Db: 10 * Math.log10(m || 1e-12) };
  }

  async function medir(nome, lugar) {
    const s = Som.achar(nome);
    if (!s) return { nome, lugar, erro: 'não carregado' };
    Som.lugar(lugar, 0);
    await espera(300);
    blocos = []; acc = 0; nAcc = 0; pico = 0; gravando = true;
    const laco = !!s.def.laco;
    let l = null;
    if (laco) { l = Som.laco(nome, 1); await espera(3000); l?.parar(50); await espera(300); }
    else { Som.tocar(nome); await espera(Math.min(6000, s.buffer.duration * 1000 + 500)); }
    gravando = false;
    let m = 0;
    for (let i = 0; i + 4 <= blocos.length; i++) m = Math.max(m, (blocos[i] + blocos[i + 1] + blocos[i + 2] + blocos[i + 3]) / 4);
    const arq = nivelDoArquivo(s.buffer);
    await espera(400);
    return {
      nome, lugar, laco, camada: s.def.camada, volume: s.def.volume, passaBaixa: s.def.passaBaixa ?? null,
      arqPicoDb: +arq.picoDb.toFixed(1), arqRmsDb: +arq.rms400Db.toFixed(1),
      jogoPicoDb: +db(pico).toFixed(1), jogoLufsM: +lufs(m).toFixed(1), dur: +s.buffer.duration.toFixed(2),
    };
  }

  if (window.__interface) {
    const out = [];
    for (const r of ['nave.xaelo.tiro', 'explosao.metalGrande']) out.push({ ...(await medir(r, 'atmosfera')), ref: true });
    for (const n of Object.keys(SONS).filter((x) => SONS[x].camada === 'interface')) out.push(await medir(n, 'atmosfera'));
    return out;
  }
  if (window.__cena) {
    // --cena: the cutscene sounds (sheet 7), each in the place it plays (the final's chapters move it)
    const lugar = (n) => (/^fim\.(sobrevoo|apaga)|^momento\.f1\.saida/.test(n) ? 'atmosfera' : /^fim\.(rasgo|descompressao)/.test(n) ? 'interior' : 'cabine');
    const out = [];
    for (const r of ['nave.xaelo.tiro', 'explosao.metalGrande']) out.push({ ...(await medir(r, 'cabine')), ref: true });
    for (const n of Object.keys(SONS).filter((x) => /^(cut|fim)\.|^momento\.f1\.saida/.test(x))) out.push(await medir(n, lugar(n)));
    return out;
  }
  const chefes = Object.keys(SONS).filter((n) => SONS[n].prioridade === 'chefe');
  // (the F4 core fights INSIDE the creature: the `interior` place, no vacuum containment)
  const lugarDe = (n) => (n.startsWith('chefe.torre.') ? 'atmosfera' : /^(guardiao|predador)\./.test(n) ? 'interior' : 'cabine');
  const refs = ['explosao.metalGrande', 'nave.xaelo.tiro', 'aranha.tiro', 'drone.tiro'];
  const out = [];
  for (const r of refs) for (const l of ['atmosfera', 'cabine']) out.push({ ...(await medir(r, l)), ref: true });
  for (const n of [...chefes, 'chefe.torre.motor']) out.push(await medir(n, lugarDe(n)));
  // the same cabin sounds in the open air: the difference is what the vacuum containment takes away
  if (window.__comparar) for (const n of chefes) if (lugarDe(n) === 'cabine') out.push({ ...(await medir(n, 'atmosfera')), comparacao: true });
  // the loops that are not 'chefe' but belong to a boss fight? (none yet) — and the sentinel/drone loops for comparison
  for (const n of ['drone.minerar', 'sentinela.rolar', 'mosca.zumbido']) if (SONS[n]) out.push({ ...(await medir(n, n === 'mosca.zumbido' ? 'interior' : 'cabine')), elite: true });
  return out;
});

await browser.close();
if (saidaJson) writeFileSync(saidaJson, JSON.stringify(resultado, null, 2));
// --sugerir (with --comparar): the `ganhoNoVacuo` that puts each contained boss sound ALVO dB under the same sound in the
// open air (contained, never louder), its peak held under −1 dB; × the one it already has
if (process.argv.includes('--sugerir')) {
  const ALVO = 1.5;
  const { SONS } = await import('../../src/som/catalogoSons.ts').catch(() => ({ SONS: null }));
  console.log(`\n── ganhoNoVacuo sugerido (cabine = ar − ${ALVO} dB, pico antes do limitador ≤ +3 dB) ──`);
  for (const c of resultado.filter((x) => x.lugar === 'cabine' && !x.ref && !x.elite && !x.comparacao)) {
    const ar = resultado.find((x) => x.comparacao && x.nome === c.nome);
    if (!ar) continue;
    let db = ar.jogoLufsM - ALVO - c.jogoLufsM;
    // (the peak here is BEFORE the safety limiter, `LIMITADOR` at −3 dB: up to +3 dB lets it shave at most ~6 dB)
    db = Math.min(db, 3 - c.jogoPicoDb);
    if (Math.abs(db) < 0.7) continue;
    const atual = SONS?.[c.nome]?.ganhoNoVacuo ?? 1;
    console.log(`  '${c.nome}': ganhoNoVacuo ${(Math.round(atual * 10 ** (db / 20) * 20) / 20).toFixed(2)}   (${db > 0 ? '+' : ''}${db.toFixed(1)} dB)`);
  }
}
const linhas = [...resultado].sort((a, b) => (a.jogoLufsM ?? -99) - (b.jogoLufsM ?? -99));
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('som', 30), pad('lugar', 10), pad('laço', 5), pad('vol', 5), pad('lp', 6), pad('arq pico', 9), pad('arq rms', 8), pad('JOGO pico', 10), pad('JOGO LUFS', 10), 'dur');
for (const r of linhas) {
  if (r.erro) { console.log(pad(r.nome, 30), r.erro); continue; }
  const tag = r.ref ? ' ◆ref' : r.elite ? ' ·elite' : '';
  console.log(pad(r.nome + tag, 30), pad(r.lugar, 10), pad(r.laco ? 'sim' : '', 5), pad(r.volume, 5), pad(r.passaBaixa ?? '', 6), pad(r.arqPicoDb, 9), pad(r.arqRmsDb, 8), pad(r.jogoPicoDb, 10), pad(r.jogoLufsM, 10), r.dur);
}
