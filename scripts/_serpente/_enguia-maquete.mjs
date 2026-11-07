// 07/11 — THE COLOSSAL EEL, MOCKED IN BLOCKS (spec `2026-11-03-serpente-grande-enguia-design.md` §7.1, plan
// `plans/2026-11-07-serpente-grande-enguia.md` Part A): the whole fight — the arrival, the five ways, the pipes, the
// Echo, the geysers, the bites, the final stretch and the death in the breach — with grey blocks measured on the
// approved art, on the arena's photo, at real speed, played by a probe player. Not the engine: the oracle for it.
//   node scripts/_serpente/_enguia-maquete.mjs <parado|desvia> <out-dir> [ate=<s>] [fotos=1] [arena=<dir>]
// → <out-dir>/<jogador>.mp4 (×3, 30 fps), <jogador>.json (chapters, touches, clearances, shots, the pipes' margins,
// the Echo's fairness) and, with fotos=1, <jogador>-<moment>.png (×3) of the key moments.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { N, LCG } from './enguia/numeros.mjs';
import { montaRoteiro } from './enguia/roteiro.mjs';
import { medidas } from './enguia/medidas.mjs';
import { pose, mordidas, nAneisEm, cabecaParaTela } from './enguia/corpo.mjs';
import { Canos, faixaDe } from './enguia/canos.mjs';
import { Eco, Trilha } from './enguia/eco.mjs';
import { geiseres, lombada, fissuras } from './enguia/geiseres.mjs';
import { perigos, folga } from './enguia/perigos.mjs';
import { Jogador } from './enguia/jogador.mjs';
import { preparaDesenho, quadro, pixelsDaCabeca, bocaNaTela, VENENO } from './enguia/desenho.mjs';

const [JOG = 'desvia', OUT = 'docs/superpowers/folhas/2026-11-07/enguia-maquete/cru', ...resto] = process.argv.slice(2);
const opc = Object.fromEntries(resto.map((a) => a.split('=')));
const ARENA = opc.arena ?? 'docs/superpowers/folhas/2026-10-29/serpente-casco/cru';
fs.mkdirSync(OUT, { recursive: true });

const med = await medidas(N);
const R = montaRoteiro(N, med, { chegada: opc.chegada }); // (`chegada=r4`: the 4th round's arc, to compare)
const mord = mordidas(R, N, med);
const geis = geiseres(R, N);
const D = await preparaDesenho(N, med, ARENA);
// Part B (the rings): `corpo=pele|aneis` dresses her in the approved art (the strip + the head, relit by their normal
// maps) instead of the grey blocks; `de=<s>` films from there on (the fight is still simulated from 0)
const CORPO = opc.corpo ?? 'blocos';
if (CORPO !== 'blocos') { const { carregaArte } = await import('./enguia/arte.mjs'); D.arte = await carregaArte(N); }
// stage 3 (the head's animations): `gestos=0` keeps the E3 still, to compare
const GESTOS = CORPO !== 'blocos' && opc.gestos !== '0' ? await (await import('./enguia/gestos.mjs')).carregaGestos() : null;
const { quadroEco, quadroCanos, chuteCanos, quadroPrepara, quadroNadar, quadroMergulho, MERGULHOS, quadroMordida, chuteMordida, quadroPresa } = await import('./enguia/gestos.mjs');
// (the swim's breath: only while she swims in sight on the profile — no skill, no draw-back, no turn-over view)
const respira = {};
// (the dives: how long the head stays in sight from the stretch's start — the mouth shuts in the middle of that)
const vistaCache = new Map();
function vistaNoTrecho(tr) {
  if (!vistaCache.has(tr)) {
    let v = tr.t1 - tr.t0;
    for (let u = tr.t0; u < tr.t1; u += 1 / 30) {
      const C = pose(R, N, med, u, { mord }).cabeca;
      if (C.focinho.y < -10 || C.focinho.y > N.tela.H || C.focinho.x < -10 || C.focinho.x > N.tela.W + 10) { v = u - tr.t0; break; }
    }
    vistaCache.set(tr, v);
  }
  return vistaCache.get(tr);
}
function podeRespirar(t0) { // the seconds free ahead of t0 (up to a whole breath)
  for (let u = t0; u <= t0 + 2.4 + 1e-9; u += 0.05) {
    const tr = R.estado(u).trecho;
    let livre = !(tr.hab || tr.prepara || MERGULHOS.includes(tr.nome) || quadroPrepara(u, R.trechos) != null);
    if (livre) {
      const C = pose(R, N, med, u, { mord }).cabeca, kV = Math.round((C.fi * 180) / Math.PI / 10);
      if (C.focinho.y < -10 || C.focinho.y > N.tela.H || C.focinho.x < -10 || C.focinho.x > N.tela.W + 10 || (kV > 0 && kV < 18)) livre = false;
    }
    if (!livre) return u - t0 - 0.05;
  }
  return 2.4;
}
D.semLuz = opc.luz === '0'; // (`luz=0`: the art as drawn, no relight — for the sheet's comparison)
D.rolagemAneis = opc.rolagem === 'aneis'; // (`rolagem=aneis`: the skin, but the roll ring by ring — his comparison)
const NOME = `${JOG}${CORPO !== 'blocos' ? `-${CORPO}` : ''}${D.semLuz ? '-semluz' : ''}${D.rolagemAneis ? '-rolaneis' : ''}${opc.chegada ? `-cheg${opc.chegada}` : ''}`;
const FPS = N.tela.fps, dt = 1 / FPS, T = Math.min(R.T, opc.ate ? Number(opc.ate) : R.T), DE = Number(opc.de ?? 0);
const rnd = LCG(20261107), sorte = LCG(5);
const cranio = mord.find((m) => m.cranio);
// the game's flesh ramps (`src/systems/morte/pedacos.ts`): the oily fluid with its orange glint, and the flesh reds
const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const raspado = []; // (the rim's recent contact spots, still smoking: {x, y, dx, dy, t})
const FLUIDO = ['0a0608', '140a0a', '1a0b06', '2c0b04', '4a1d05', '5c2300', '7d2900', '913300', 'b5500c'].map(hex);
const CARNE = ['0c040c', '1c0c14', '2c0c1c', '3c1424', '541c2c', '6c2434', '94343c', 'b84850', 'd87060'].map(hex);
const MORDIDA_CRANIO = { x: 48, y: 4, r: 7 };

// the world the hazards and the probe read
let giro = 0;
const M = { R, N, med, mord, canos: [], ecos: [], geis, giro: () => giro };
const canosDe = new Map(), ecoDe = new Map();
const trilha = new Trilha();
const jog = new Jogador(JOG, N);
const tiros = [], particulas = [];
let proxTiro = 0;

// the measures
const capitulos = [];
const toques = [], tocando = new Map(), folgas = new Map();
const tirosPorCap = {}, acertos = { corpo: 0, cabeca: 0 };
const momentos = {
  chegada: R.trechos.find((t) => t.nome === 'arco').t0 + 2.2,
  'canos-aviso': R.trechos.find((t) => t.hab === 'canos').t0 + N.canos.antes + 0.9,
  'canos-fogo': R.trechos.find((t) => t.hab === 'canos').t0 + N.canos.antes + N.canos.aviso[0] + 0.3,
  mergulho: R.trechos.find((t) => t.nome === 'mergulho').t0 + 1.3,
  'erguida-eco': R.trechos.find((t) => t.hab === 'eco').t0 + N.eco.leitura + N.eco.voo + 0.35,
  // (stage 3: the Echo's mouth — shut while reading, wide at the spit)
  'eco-lendo': R.trechos.find((t) => t.hab === 'eco').t0 + 1.2,
  // (stage 3: the pipes' mouth — charged at the end of the 1st warning, slammed shut in its fire)
  'canos-carga': R.trechos.find((t) => t.hab === 'canos').t0 + N.canos.antes + N.canos.aviso[0] - 0.05,
  'canos-bate': R.trechos.find((t) => t.hab === 'canos').t0 + N.canos.antes + N.canos.aviso[0] + 0.15,
  'eco-cuspe': R.trechos.find((t) => t.hab === 'eco').t0 + N.eco.leitura + 0.1,
  geiser: geis[2].tColuna + 0.15,
  volta: R.trechos.find((t) => t.nome === 'volta').t0 + 1.4,
  mordida: mord[0].t + 0.1,
  // (his note: the stump torn, ragged — seen once the debris has gone)
  toco: mord[0].t + 0.35,
  toco2: mord[1].t + 1.5,
  'sob-vazio': R.trechos.find((t) => t.sob === 'ida').t0 + 0.9,
  posto: R.trechos.find((t) => t.hab === 'canos').t0 + 0.3,
  // (his note: the 2nd and 3rd pipes, with the tail bitten off — the bottom lane still fires from her body)
  'posto2-fogo': R.trechos.filter((t) => t.hab === 'canos')[1].t0 + N.canos.antes + N.canos.aviso[0] + 0.3,
  'posto3-fogo': R.trechos.filter((t) => t.hab === 'canos')[2].t0 + N.canos.antes + N.canos.aviso[0] + 0.3,
  presa: R.trechos.find((t) => t.hab === 'presa').t0 + 0.8,
  // (3rd round: the scrape on the rim, the head blowing apart, the neck pumping)
  raspa: R.trechos.find((t) => t.nome === 'mergulho-cauda').t0 + 1.2,
  'raspa-esfria': R.trechos.find((t) => t.nome === 'mergulho-cauda').t1 + 0.3,
  explode: R.trechos.find((t) => t.hab === 'desfaz').t0 + 0.12,
  ferida: R.trechos.filter((t) => t.hab === 'eco').at(-1).t0 + 1.0, // (5th round: the skull's bite as a wound)
  jorro: R.trechos.find((t) => t.hab === 'desfaz').t0 + 1.2,
  fim: R.trechos.find((t) => t.hab === 'fim').t0 + 0.6,
};
const fotosFeitas = new Set();
// (`em=<t>,<t>…`: photos at chosen times too, with the skull joint's screen place in <nome>-juntas.json)
const juntas = {};
for (const tm of (opc.em ?? '').split(',').filter(Boolean)) momentos[`em-${tm}`] = Number(tm);

// the gap probe (`vaos=1`)
const MAGENTA = Buffer.alloc(N.tela.W * N.tela.H * 4);
for (let i = 0; i < MAGENTA.length; i += 4) { MAGENTA[i] = 255; MAGENTA[i + 1] = 0; MAGENTA[i + 2] = 255; MAGENTA[i + 3] = 255; }
const vaosLista = [];
function vaosNoQuadro(s, t, gesto) {
  const fundo = D.fundo, naFrente = D.naFrente;
  D.fundo = MAGENTA; D.naFrente = new Uint8Array(N.tela.W * N.tela.H);
  const buf = quadro(D, { ...s, particulas: [], tiros: [], canos: null, brasas: [], eco: null, geis: [], sinais: [], fissuras: [] });
  D.fundo = fundo; D.naFrente = naFrente;
  const W = N.tela.W, H = N.tela.H, J = s.pose.cabeca.pescoco, R0 = 22, Rf = 2;
  const x0 = Math.max(0, Math.floor(J.x - R0)), x1 = Math.min(W - 1, Math.ceil(J.x + R0)), y0 = Math.max(0, Math.floor(J.y - R0)), y1 = Math.min(H - 1, Math.ceil(J.y + R0));
  const bicho = (x, y) => { const i = (y * W + x) * 4; return !(buf[i] === 255 && buf[i + 1] === 0 && buf[i + 2] === 255); };
  const vaos = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (bicho(x, y)) continue;
    // closed by the eel: eel pixels on both sides within Rf, horizontally or vertically or on a diagonal
    const lados = [[1, 0], [0, 1], [1, 1], [1, -1]].some(([dx, dy]) => {
      let a = false, b = false;
      for (let k = 1; k <= Rf + 1; k++) { const X = x + dx * k, Y = y + dy * k; if (X >= 0 && X < W && Y >= 0 && Y < H && bicho(X, Y)) { a = true; break; } }
      for (let k = 1; k <= Rf + 1; k++) { const X = x - dx * k, Y = y - dy * k; if (X >= 0 && X < W && Y >= 0 && Y < H && bicho(X, Y)) { b = true; break; } }
      return a && b;
    });
    if (lados) vaos.push([x, y]);
  }
  if (vaos.length) vaosLista.push({ t: +t.toFixed(2), n: vaos.length, gesto: gesto ? gesto.k : 0, hab: s.pose.e.trecho.hab ?? s.pose.e.trecho.nome, rel: vaos.map(([x, y]) => [x - Math.round(J.x), y - Math.round(J.y)]) });
}

// the video: raw frames into ffmpeg (×3, nearest)
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${N.tela.W}x${N.tela.H}`, '-r', String(FPS), '-i', '-',
  '-vf', 'scale=iw*3:ih*3:flags=neighbor', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, `${NOME}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
const escreve = (buf) => new Promise((ok) => (ff.stdin.write(buf) ? ok() : ff.stdin.once('drain', ok)));

const nasce = (p) => particulas.push({ idade: 0, tam: 1, ...p });
let capAtual = null, desfeita = false, cranioFeito = false, mordidasFeitas = 0;

for (let f = 0; f * dt <= T; f++) {
  const t = f * dt, e = R.estado(t), tr = e.trecho;
  const cap = `${tr.cap}${tr.ciclo ? ` · ciclo ${tr.ciclo}` : ''}`;
  if (cap !== capAtual) { capitulos.push({ t: +t.toFixed(2), cap: tr.cap, ciclo: tr.ciclo ?? null }); capAtual = cap; }

  // the skills start at their pauses
  if (tr.hab === 'canos' && !canosDe.has(tr)) { const C = new Canos(tr.t0, N, rnd, tr.corte); canosDe.set(tr, C); M.canos.push(C); }
  if (tr.hab === 'eco' && !ecoDe.has(tr)) { const E = new Eco(tr.t0, N, tr.final); ecoDe.set(tr, E); M.ecos.push(E); }
  for (const C of M.canos) C.atualiza(t, jog.y);

  // the head's gestures (blocks; the real ones come from the PixelLab in Part B): in the Echo it follows the ship
  // (±30°) and kicks up as it spits; before leaving rest it draws back; at the pipes' charge it trembles
  const P0 = pose(R, N, med, t, { mord });
  const acima = Math.cos(P0.cabeca.ang) < 0 ? 1 : -1; // the sign that turns the snout up
  const cabecaVisivel = P0.cabeca.focinho.y > -10 && P0.cabeca.focinho.y < N.tela.H && P0.cabeca.focinho.x > -10 && P0.cabeca.focinho.x < N.tela.W + 10;
  let alvoGiro = 0, rapido = 8;
  if (tr.hab === 'eco') {
    const alvo = Math.atan2(jog.y - P0.cabeca.pescoco.y, jog.x - P0.cabeca.pescoco.x);
    let d = Math.atan2(Math.sin(alvo - P0.cabeca.ang), Math.cos(alvo - P0.cabeca.ang));
    const lim = (N.eco.giro * Math.PI) / 180;
    alvoGiro = tr.t1 - t < 0.5 ? 0 : Math.max(-lim, Math.min(lim, d));
    rapido = 5;
  } else if (['presa', 'desfaz'].includes(tr.hab) || (tr.nome === 'afunda-morte' && e.tl > (tr.t1 - tr.t0) * 0.6)) {
    // (his circle on the stuck head: straight up it read wrong — it slumps sideways onto the breach's rim, spent)
    alvoGiro = (P0.cabeca.espelho ? 1 : -1) * 0.95; rapido = 3; // (toward the side her face looks: never upside down)
  } else if (tr.prepara && cabecaVisivel) {
    const k = Math.min(1, e.tl / (N.prepara.dur * 0.7));
    alvoGiro = acima * N.prepara.giro * k * k * (3 - 2 * k);
    rapido = 14;
  }
  giro += (alvoGiro - giro) * Math.min(1, dt * rapido);
  let tranco = 0;
  for (const E of M.ecos) for (const r of E.rodadas) if (t >= r.cospe && t < r.cospe + 0.35) tranco = acima * 0.22 * (1 - (t - r.cospe) / 0.35);
  if (GESTOS && tr.hab === 'canos') tranco += acima * chuteCanos(t, M.canos.at(-1)); // (stage 3: the slam's kick)
  if (GESTOS) tranco += acima * chuteMordida(t, cranio.t); // (stage 3: the shriek's jerk)
  let treme = null;
  if (tr.hab === 'presa' || (GESTOS && t >= cranio.t && t < cranio.t + 0.45)) treme = { x: Math.round(sorte() * 2 - 1), y: Math.round(sorte() * 2 - 1) };
  else if (tr.hab === 'canos') {
    const q = M.canos.at(-1)?.estado(t);
    if (q && q.fase === 'aviso' && sorte() < q.k * 0.7) treme = { x: Math.round(sorte() * 2 - 1), y: Math.round(sorte() * 2 - 1) };
  }
  const P = pose(R, N, med, t, { mord, giro: giro + tranco, treme });
  // the head's gesture frame now (null = the E3 as approved)
  let gesto = null, gestoFixo = false;
  // (the bite in the skull and the death come first: they play over the canos' cut and the draw-back)
  if (GESTOS) { const m = quadroMordida(t, cranio.t); if (m) { gestoFixo = true; gesto = m[0] === 'eco' && !m[1] ? null : GESTOS[m[0]][m[1]]; } }
  if (GESTOS && !gestoFixo) { const k = quadroPresa(t, tr); if (k != null) { gestoFixo = true; gesto = GESTOS.agonia[k]; } } // (0 is the shut mouth here)
  if (GESTOS && !gestoFixo && tr.hab === 'eco') { const k = quadroEco(t, M.ecos.flatMap((E) => E.rodadas)); if (k) gesto = GESTOS.eco[k]; }
  if (GESTOS && !gestoFixo && tr.hab === 'canos') { const k = quadroCanos(t, M.canos.at(-1)); if (k) gesto = GESTOS.canos[k]; }
  if (GESTOS && !gesto && !gestoFixo) { const m = quadroMergulho(t, tr, R.trechos, vistaNoTrecho(tr)); if (m && m[1]) gesto = GESTOS[m[0]][m[1]]; } // (the dives: shut)
  if (GESTOS && !gesto && !gestoFixo && !tr.hab && !MERGULHOS.includes(tr.nome) && cabecaVisivel) { const k = quadroPrepara(t, R.trechos); if (k) gesto = GESTOS.prepara[k]; }
  if (GESTOS && !gesto && !gestoFixo) { const k = quadroNadar(t, respira, podeRespirar); if (k) gesto = GESTOS.nadar[k]; }
  const boca = () => (gesto?.boca ? cabecaParaTela(P.cabeca, med, gesto.boca) : bocaNaTela(P, med));
  for (const E of M.ecos) {
    const antes = E.rodadas.map((r) => !!r.sementes);
    E.atualiza(t, trilha, boca());
    E.rodadas.forEach((r, i) => { // the spit's flash at the mouth
      if (!antes[i] && r.sementes) { const b = boca(); for (let k = 0; k < 14; k++) { const an = sorte() * Math.PI * 2; nasce({ x: b.x, y: b.y, vx: Math.cos(an) * 40, vy: Math.sin(an) * 40, vida: 0.25, cor: [150, 220, 255] }); } nasce({ x: b.x, y: b.y, vx: 0, vy: 0, vida: 0.15, cor: [220, 245, 255], tam: 5 }); }
    });
  }
  // ── the SCRAPE (5th round, his drawing over the breach and: "uma estrutura de metal gigante friccionou contra a
  // borda, causando faísca, pedaços voando, efeito de solda"; and the body clips the rim, so the effect must hide it).
  // Wherever the EDGE of her body crosses the lip's metal while she moves (a band of the body's rim, not a line), the
  // metal is welded: it melts (heat), cools slowly from white to dull red, and leaves a scorch that fades; every frame
  // of contact flashes at the contact (drawn over her body), throws a shower of sparks along her motion, molten drops,
  // shards of the plate itself and smoke.
  // (6th round, his note: no lit edges on the lip — "em todos os lados ela fica voando"; the sparks and the smoke hide it
  // well: more of both, no weld left on the metal)
  const contato = [];
  {
    const vel = Math.abs(R.estado(t + dt).s - e.s) / dt, W = N.tela.W;
    // (7 Nov, his ask: while she stands in the breach — hovering through the Echo — the rim keeps smoking and throwing
    // a few sparks where her body crosses it, as the scrape's afterglow does; it hides the crossing and holds the
    // moment. Standing still, the crossing only feeds the smouldering spots, never the moving scrape's burst; once she
    // moves off, the scrape is as before)
    const fumega = vel <= 30 && tr.cap === 'erguida';
    if (vel > 30 || fumega) for (let i = 0; i < P.tubo.length; i += 2) {
      const a = P.tubo[i];
      if (a.x < N.rombo.x0 - 40 || a.x > N.rombo.x1 + 40 || a.y < N.rombo.labio.y - a.r || a.y > N.tela.H + a.r) continue;
      // (6th round (2): where she CLIPS — the hole's edge cutting across her body, her body vanishing behind the lip: the
      // lip's edge pixels (3 px band) inside her silhouette; sparks fly from there AWAY from the hole, over the lip)
      const r1 = a.r;
      for (let Y = Math.floor(a.y - r1); Y <= a.y + r1; Y++) for (let X = Math.floor(a.x - r1); X <= a.x + r1; X++) {
        if (X < 0 || X >= W || Y < N.rombo.labio.y + 2 || Y >= N.tela.H) continue;
        const d = Math.hypot(X + 0.5 - a.x, Y + 0.5 - a.y), j = Y * W + X;
        if (d > r1 || !D.pertoBorda[j] || D.pertoBorda[j] > 3) continue;
        if (sorte() < 0.04) {
          const hx = X + 0.5 - N.rombo.x, hy = Y + 0.5 - 200, m = Math.hypot(hx, hy) || 1;
          contato.push({ x: X, y: Y, dx: a.dx, dy: a.dy, ox: hx / m, oy: hy / m });
        }
      }
    }
    // (6th round (2), his note: the clip still showed — more sparks and smoke, over more of the rim, lasting longer: every
    // contact spot keeps smoking and throwing a few sparks for ~1.2 s after her body has passed, dying down)
    for (const c of contato) if (sorte() < (fumega ? 0.12 : 0.25)) raspado.push({ ...c, t });
    // (standing: his picture is THICK smoke with a few sparks — so the crossing breathes the scrape's heavy smoke, and
    // feeds half as many smouldering spots, which are what throw the sparks)
    if (fumega) for (const c of contato) if (sorte() < 0.5)
      nasce({ x: c.x + (sorte() - 0.5) * 8, y: c.y + (sorte() - 0.5) * 6, vx: (sorte() - 0.5) * 14 + c.ox * 8, vy: -6 - sorte() * 12, vida: 2.0 + sorte() * 1.2, cor: sorte() < 0.5 ? [52, 48, 52] : [36, 34, 38], tam: 3.5 + sorte() * 3, cresce: true, a: 0.5 });
    for (let i = raspado.length - 1; i >= 0; i--) {
      const c = raspado[i], idade = t - c.t, k = 1 - idade / 1.2;
      if (k <= 0) { raspado.splice(i, 1); continue; }
      if (sorte() < 0.12 * k) nasce({ x: c.x + (sorte() - 0.5) * 3, y: c.y, vx: (sorte() - 0.5) * 14, vy: -6 - sorte() * 12, vida: 1.6 + sorte() * 1.2, cor: sorte() < 0.5 ? [58, 54, 58] : [40, 38, 42], tam: 2.5 + sorte() * 2.5, cresce: true, a: 0.38 * k });
      if (sorte() < 0.08 * k) { const an = -Math.PI / 2 + (sorte() - 0.5) * 2.2, v = 40 + sorte() * 70; nasce({ x: c.x, y: c.y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.3 + sorte() * 0.4, cor: [255, 210, 120], arrasto: 1.4, gota: true }); }
    }
    // the contact's debris (a capped number per frame)
    for (const c of fumega ? [] : contato.slice(0, 36)) {
      // sparks: thrown OUT from her body at the contact, fanning (most), a few dragged along her motion — never riding
      // down with her (that buried her body in sparks)
      for (let k = 0; k < 2; k++) {
        const fora = sorte() < 0.75, bx = fora ? c.ox : c.dx, by = fora ? c.oy : c.dy;
        const v = fora ? 60 + sorte() * 110 : vel * (0.5 + sorte() * 0.6), an = (sorte() - 0.5) * (fora ? 1.6 : 0.8), ca = Math.cos(an), sa = Math.sin(an);
        const ux = bx * ca - by * sa, uy = bx * sa + by * ca;
        nasce({ x: c.x + c.ox * 2, y: c.y + c.oy * 2, vx: ux * v, vy: uy * v, vida: 0.2 + sorte() * 0.3, cor: sorte() < 0.35 ? [255, 252, 230] : sorte() < 0.7 ? [255, 214, 120] : [255, 150, 60], arrasto: 1.4, gota: true });
      }
      // (the smoke carries the hiding: thick, dark, lasting)
      if (sorte() < 0.6) nasce({ x: c.x + (sorte() - 0.5) * 8, y: c.y + (sorte() - 0.5) * 8, vx: (sorte() - 0.5) * 14 + c.ox * 10, vy: -6 - sorte() * 12, vida: 2.0 + sorte() * 1.2, cor: sorte() < 0.5 ? [52, 48, 52] : [36, 34, 38], tam: 3.5 + sorte() * 3, cresce: true, a: 0.5 });
      if (sorte() < 0.35) { const an = sorte() * Math.PI * 2, v = 25 + sorte() * 55; nasce({ x: c.x, y: c.y, vx: Math.cos(an) * v + c.dx * 40, vy: Math.sin(an) * v + c.dy * 40, vida: 0.5 + sorte() * 0.5, cor: sorte() < 0.5 ? [255, 160, 60] : [255, 110, 30], tam: 1.5, arrasto: 1.2, gota: true }); } // molten drops
      if (sorte() < 0.18) { // a shard of the plate itself, glowing at its edge
        const i0 = (c.y * N.tela.W + c.x) * 4, cor = [D.fundo[i0], D.fundo[i0 + 1], D.fundo[i0 + 2]], an = sorte() * Math.PI * 2, v = 30 + sorte() * 60;
        const pedaco = [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0]].slice(0, 2 + Math.floor(sorte() * 4)).map(([dx, dy]) => ({ dx, dy, c: cor, borda: true, brasa: sorte() < 0.5 }));
        nasce({ x: c.x, y: c.y, vx: Math.cos(an) * v + c.dx * 30, vy: Math.sin(an) * v + c.dy * 30, vida: 0.8 + sorte() * 0.6, arrasto: 0.8, pedaco });
      }
      if (sorte() < 0.7) nasce({ x: c.x + (sorte() - 0.5) * 6, y: c.y + (sorte() - 0.5) * 6, vx: (sorte() - 0.5) * 18 + c.dx * 15, vy: -8 - sorte() * 16 + c.dy * 15, vida: 1.6 + sorte() * 1.2, cor: sorte() < 0.5 ? [64, 60, 62] : [44, 42, 46], tam: 3 + sorte() * 3, cresce: true, a: 0.45 }); // smoke
    }
  }
  // the breach's tell: dust breathing out of it before she breaks out
  for (const g of R.sinais) if (t >= g.t0 && t < g.t1 && sorte() < 0.8)
    nasce({ x: g.x + (sorte() - 0.5) * 60, y: N.crista + sorte() * 40, vx: (sorte() - 0.5) * 16, vy: -12 - sorte() * 22, vida: 0.7, cor: sorte() < 0.3 ? [90, 150, 170] : [70, 66, 70], tam: sorte() < 0.4 ? 1.5 : 1, a: 0.7 });

  // the probe plays, records its trail, fires
  jog.passo(t, dt, M);
  trilha.grava(t, jog.x, jog.y);
  if (t >= proxTiro) { tiros.push({ x: jog.x + N.nave.nariz, y: jog.y, cap: tr.cap }); proxTiro = t + N.tiro.cada; tirosPorCap[tr.cap] ??= { tiros: 0, acertos: 0, cabeca: 0 }; tirosPorCap[tr.cap].tiros++; }

  // what hurts now: touches (rising edges) and the closest call per hazard
  const agora = perigos(M, t, P);
  let ferida = false;
  const vistos = new Set();
  for (const h of agora) {
    const fo = folga({ x: jog.x, y: jog.y }, N.nave.hit, h.forma);
    const prev = folgas.get(h.id);
    if (!prev || fo < prev.min) folgas.set(h.id, { tipo: h.tipo, min: +fo.toFixed(1), t: +t.toFixed(2), cap: tr.cap });
    if (fo < 0) {
      ferida = true;
      if (!vistos.has(h.id)) { vistos.add(h.id); if (!tocando.get(h.id)) toques.push({ t: +t.toFixed(2), tipo: h.tipo, cap: tr.cap, ciclo: tr.ciclo ?? null }); }
    }
  }
  for (const id of tocando.keys()) tocando.set(id, false);
  for (const id of vistos) tocando.set(id, true);

  // the shots fly and die on the first ring / head in sight
  const alvos = agora.filter((h) => h.tipo === 'corpo' || h.tipo === 'cabeca');
  for (let i = tiros.length - 1; i >= 0; i--) {
    const b = tiros[i];
    b.x += N.tiro.vel * dt;
    const alvo = alvos.find((h) => Math.hypot(b.x - h.forma.c.x, b.y - h.forma.c.y) <= h.forma.c.r);
    if (alvo) {
      acertos[alvo.tipo]++; tirosPorCap[b.cap].acertos++; if (alvo.tipo === 'cabeca') tirosPorCap[b.cap].cabeca++;
      nasce({ x: b.x, y: b.y, vx: -20, vy: (sorte() - 0.5) * 30, vida: 0.12, cor: [255, 240, 180] });
      tiros.splice(i, 1);
    } else if (b.x > N.tela.W + 4) tiros.splice(i, 1);
  }

  // the looks: jets on the bends, the bites, the steam, the undoing
  if (tr.tipo === 'move' && !tr.recua) {
    for (let k = 1; k < P.aneis.length - 1; k++) {
      const a = P.aneis[k], b0 = P.aneis[k - 1], b1 = P.aneis[k + 1];
      const curva = (b0.x - a.x) * (b1.y - a.y) - (b0.y - a.y) * (b1.x - a.x);
      if (Math.abs(curva) < 120 || sorte() > 0.3 || a.toca) continue;
      const lado = curva > 0 ? 1 : -1, nx = -a.dy * lado, ny = a.dx * lado;
      const cor = k < 4 ? [96, 240, 136] : k > P.aneis.length - 5 ? [88, 200, 255] : [255, 160, 64];
      nasce({ x: a.x + nx * a.r, y: a.y + ny * a.r, vx: nx * 40 - a.dx * 20, vy: ny * 40 - a.dy * 20, vida: 0.3, cor });
    }
  }
  if (mordidasFeitas < 2 && t >= mord[mordidasFeitas].t) {
    const m = mord[mordidasFeitas];
    const ant = pose(R, N, med, t, { mord: [] });
    for (let k = m.de; k < m.ate; k++) {
      const a = ant.aneis[k];
      if (!a) continue;
      for (let i = 0; i < 46; i++) { const an = sorte() * Math.PI * 2, v = 15 + sorte() * 50; nasce({ x: a.x + Math.cos(an) * a.r * sorte(), y: a.y + Math.sin(an) * a.r * sorte(), vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.7 + sorte() * 0.6, cor: sorte() < 0.25 ? [255, 160, 64] : [86, 90, 102] }); }
      nasce({ x: a.x, y: a.y, vx: 0, vy: 0, vida: 0.16, cor: [255, 200, 120], tam: Math.max(3, a.r * 0.5), a: 0.85 });
    }
    mordidasFeitas++;
  }
  // the stump's jet for 1.2 s after each bite
  for (const m of mord.filter((q) => !q.cranio && t >= q.t && t < q.t + 1.2)) {
    const ultimo = P.aneis.at(-1);
    if (ultimo && sorte() < 0.7) nasce({ x: ultimo.x - ultimo.dx * ultimo.r, y: ultimo.y - ultimo.dy * ultimo.r, vx: -ultimo.dx * 70 + (sorte() - 0.5) * 20, vy: -ultimo.dy * 70 + (sorte() - 0.5) * 20, vida: 0.35, cor: [88, 200, 255] });
  }
  if (!cranioFeito && t >= cranio.t) {
    cranioFeito = true;
    const c = pose(R, N, med, t, { mord }).cabeca;
    const p = { x: c.pescoco.x + (c.focinho.x - c.pescoco.x) * 0.55, y: c.pescoco.y + (c.focinho.y - c.pescoco.y) * 0.55 - 18 };
    for (let i = 0; i < 40; i++) { const an = sorte() * Math.PI * 2, v = 20 + sorte() * 60; nasce({ x: p.x, y: p.y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.6 + sorte() * 0.5, cor: sorte() < 0.3 ? [255, 140, 48] : [104, 108, 120] }); }
    nasce({ x: p.x, y: p.y, vx: 0, vy: 0, vida: 0.3, cor: [255, 236, 200], tam: 9, cresce: true });
  }
  for (const g of geis) {
    const yc = D.trilha[Math.round(g.x)];
    // the steam left behind: a bank of green-grey that spreads and drifts up (nothing falls)
    if (Math.abs(t - g.tFim) < dt / 2) for (let i = 0; i < 34; i++) nasce({ x: g.x + (sorte() - 0.5) * 18, y: N.geiser.topo + sorte() * (yc - N.geiser.topo), vx: (sorte() - 0.5) * 36, vy: -8 - sorte() * 22, vida: N.geiser.vapor * (0.7 + sorte() * 0.6), cor: sorte() < 0.5 ? [96, 170, 128] : [70, 120, 100], tam: 2 + sorte() * 3, cresce: true, a: 0.45 });
    // the warning: the crack hisses — puffs out of it
    if (t >= g.tAviso && t < g.tColuna && sorte() < 0.6) nasce({ x: g.x + (sorte() - 0.5) * 14, y: yc - 1, vx: (sorte() - 0.5) * 14, vy: -14 - sorte() * 18, vida: 0.45, cor: [150, 230, 170], tam: 1.5, a: 0.6 });
    // (4th round) the rupture spits venom as it bursts, and the column sheds globules that fly off and float
    if (Math.abs(t - g.tColuna) < dt / 2) for (let i = 0; i < 16; i++) {
      const an = -Math.PI / 2 + (sorte() - 0.5) * 2.4, v = 60 + sorte() * 90;
      nasce({ x: g.x + (sorte() - 0.5) * 8, y: yc, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.6 + sorte() * 0.5, cor: VENENO[3 + Math.floor(sorte() * 4)], tam: sorte() < 0.4 ? 1.5 : 1, arrasto: 1.4, gota: true });
    }
    if (t >= g.tColuna && t < g.tFim && sorte() < 0.9) for (let i = 0; i < 2; i++) {
      const lado = sorte() < 0.5 ? -1 : 1, y = N.geiser.topo + sorte() * (yc - N.geiser.topo);
      nasce({ x: g.x + lado * 7, y, vx: lado * (30 + sorte() * 60), vy: -20 - sorte() * 50, vida: 0.5 + sorte() * 0.5, cor: VENENO[3 + Math.floor(sorte() * 4)], tam: sorte() < 0.3 ? 1.5 : 1, arrasto: 1.6, gota: true });
    }
  }
  // ── the death (3rd round, his note: "mais efeitos e depois fluidos saindo do corpo decapitado, trazer o gore"): the
  // head BLOWS APART — a flash, a shock ring, the skull in pieces carried whole, embers, a mist of flesh — and then the
  // neck, torn open, pumps her fluid out in pulses that weaken (the game's flesh language: the dark oily fluid with the
  // orange glint and the flesh reds of the fusion's bites, `RAMPA_FLUIDO`/`RAMPA_CARNE`). In the vacuum nothing falls:
  // the globules fly out and float, slowing.
  if (tr.hab === 'desfaz' && !desfeita) {
    desfeita = true;
    const ps = pixelsDaCabeca(D, P, { mordida: MORDIDA_CRANIO });
    const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
    const cor0 = (p) => p.c ?? [104, 108, 120];
    // the skull in pieces: 5×5 cells of her own pixels, most flying as a whole piece
    const celulas = new Map();
    for (const p of ps) { const k = `${Math.floor(p.x / 5)},${Math.floor(p.y / 5)}`; if (!celulas.has(k)) celulas.set(k, []); celulas.get(k).push(p); }
    for (const cel of celulas.values()) {
      const mx = cel.reduce((a, p) => a + p.x, 0) / cel.length, my = cel.reduce((a, p) => a + p.y, 0) / cel.length;
      const an = Math.atan2(my - cy, mx - cx) + (sorte() - 0.5) * 0.7, v = 25 + sorte() * 70;
      if (cel.length >= 6 && sorte() < 0.7) {
        const tem = new Set(cel.map((p) => `${p.x},${p.y}`));
        nasce({ x: mx, y: my, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 1.2 + sorte() * 0.9, arrasto: 0.5,
          pedaco: cel.map((p) => ({ dx: p.x - mx, dy: p.y - my, c: cor0(p), brasa: sorte() < 0.3, borda: [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !tem.has(`${p.x + a},${p.y + b}`)) })) });
      } else for (const p of cel) nasce({ x: p.x, y: p.y, vx: Math.cos(an) * v * 0.7, vy: Math.sin(an) * v * 0.7, vida: 0.6 + sorte() * 0.7, cor: cor0(p), arrasto: 0.6 });
    }
    nasce({ x: cx, y: cy, vx: 0, vy: 0, vida: 0.22, cor: [255, 244, 220], tam: 16, cresce: true });
    nasce({ x: cx, y: cy, vx: 0, vy: 0, vida: 0.45, cor: [255, 150, 60], tam: 10, cresce: true, a: 0.7 });
    nasce({ x: cx, y: cy, vx: 0, vy: 0, vida: 0.5, cor: [255, 200, 140], tam: 9, anel: true });
    nasce({ x: cx, y: cy, vx: 0, vy: 0, vida: 0.75, cor: [200, 70, 40], tam: 6, anel: true, a: 0.6 });
    for (let i = 0; i < 46; i++) { const an = sorte() * Math.PI * 2, v = 60 + sorte() * 120; nasce({ x: cx, y: cy, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.4 + sorte() * 0.5, cor: sorte() < 0.5 ? [255, 210, 120] : [255, 120, 40], arrasto: 1.2 }); }
    for (let i = 0; i < 34; i++) { const an = sorte() * Math.PI * 2, v = 50 + sorte() * 110; nasce({ x: cx + (sorte() - 0.5) * 10, y: cy + (sorte() - 0.5) * 10, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 1.0 + sorte() * 1.0, cor: sorte() < 0.5 ? CARNE[4 + Math.floor(sorte() * 5)] : FLUIDO[4 + Math.floor(sorte() * 5)], tam: sorte() < 0.5 ? 1.5 + sorte() * 1.5 : 1, arrasto: 0.8, gota: true }); }
    for (let i = 0; i < 16; i++) { const an = sorte() * Math.PI * 2, v = 10 + sorte() * 30; nasce({ x: cx + (sorte() - 0.5) * 14, y: cy + (sorte() - 0.5) * 14, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.9 + sorte() * 0.7, cor: CARNE[2 + Math.floor(sorte() * 4)], tam: 3 + sorte() * 3, cresce: true, a: 0.55, arrasto: 1 }); }
  }
  // the neck pumping her fluid out, from the head blowing off to the end, weaker and weaker
  if (['desfaz', 'resto', 'fim'].includes(tr.hab) && desfeita) {
    const morte0 = R.trechos.find((q) => q.hab === 'desfaz').t0, tm = t - morte0;
    const forca = Math.exp(-tm / 2.2), pulso = tm % 0.34 < dt;
    const a = P.tubo[Math.min(P.tubo.length - 1, 8)], b = P.tubo[0];
    const fx = b.x + (a.x - b.x) * 0.2, fy = b.y + (a.y - b.y) * 0.2, ux = a.dx, uy = a.dy;
    const n = pulso ? Math.round(16 * forca) + 3 : sorte() < 0.6 * forca ? 1 : 0;
    for (let i = 0; i < n; i++) {
      const v = (pulso ? 70 + sorte() * 90 : 30 + sorte() * 40) * (0.4 + 0.6 * forca), lado = (sorte() - 0.5) * 2;
      const g = sorte() < 0.3 ? CARNE[4 + Math.floor(sorte() * 4)] : FLUIDO[4 + Math.floor(sorte() * 5)];
      nasce({ x: fx + (sorte() - 0.5) * 6, y: fy + (sorte() - 0.5) * 6, vx: ux * v - uy * lado * 35, vy: uy * v + ux * lado * 35, vida: 1.4 + sorte() * 1.2, cor: g, tam: sorte() < 0.45 ? 1.5 + sorte() * 1.2 : 1, arrasto: 0.9, gota: true });
    }
  }
  // the fusion's stand-in: three lights (blue, green, orange) converge on the breach and implode
  const efemeras = [];
  if (tr.hab === 'fusao') {
    const k = Math.min(1, e.tl / 1.2), alvo = { x: N.rombo.x, y: 178 };
    [[230, 120, [88, 200, 255]], [290, 110, [96, 240, 136]], [350, 125, [255, 160, 64]]].forEach(([x, y, cor]) => {
      const px = x + (alvo.x - x) * k * k, py = y + (alvo.y - y) * k * k;
      efemeras.push({ x: px, y: py, vida: 1, idade: 0, tam: 3, cor }, { x: px, y: py, vida: 1, idade: 0, tam: 6, cor, a: 0.3 });
    });
    if (e.tl > 1.2) efemeras.push({ x: alvo.x, y: alvo.y, vida: 1, idade: (e.tl - 1.2) / 0.4, tam: 26, cor: [255, 245, 230], cresce: true });
  }
  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.idade += dt; p.x += (p.vx ?? 0) * dt; p.y += (p.vy ?? 0) * dt;
    if (p.arrasto) { const k = Math.max(0, 1 - p.arrasto * dt); p.vx *= k; p.vy *= k; } // (slowing, never falling)
    if (p.idade >= p.vida) particulas.splice(i, 1);
  }

  // the frame
  const canosAgora = M.canos.map((C) => C.estado(t)).find((q) => q && q.fase !== 'fecha') ?? null;
  const ecoAgora = M.ecos.find((E) => t >= E.t0 && t < E.rodadas.at(-1).fim + 0.4);
  let eco = null;
  if (ecoAgora) {
    const q = ecoAgora.estado(t);
    eco = { ...q, rastro: q.lendo ? trilha.entre(t - ecoAgora.leitura, t) : null };
  }
  const hab = tr.hab;
  const s = {
    t, f, pose: P, caminho: R.caminho, geis, lombada: lombada(R, N, t),
    canos: canosAgora, brasas: M.canos.flatMap((C) => C.brasas(t)), eco,
    sinais: R.sinais.filter((a) => t >= a.t0 && t < a.t1), fissuras: fissuras(R, N, t),
    particulas: [...particulas, ...efemeras], tiros, nave: { x: jog.x, y: jog.y }, naveFerida: ferida,
    semCabeca: ['desfaz', 'resto', 'fim'].includes(hab), morta: hab === 'fusao',
    mordida: t >= cranio.t ? MORDIDA_CRANIO : null, olhoAceso: !!eco?.lendo, modoCorpo: CORPO, gesto,
    decapitada: desfeita,
  };
  // (stage 3, his note "esses gaps em todas as gerações": `vaos=1` probes every frame for the scene showing through at
  // the skull's joint — the frame drawn again on a flat magenta ground; magenta pixels near the joint that a closing of
  // the eel's pixels would fill are gaps)
  if (opc.vaos === '1' && t >= DE - 1e-9 && !s.semCabeca) vaosNoQuadro(s, t, gesto);
  const filma = t >= DE - 1e-9, foto = opc.fotos && Object.entries(momentos).some(([nome, tm]) => !fotosFeitas.has(nome) && t >= tm);
  if (!filma && !foto) continue;
  const buf = quadro(D, s);
  if (filma) await escreve(buf);
  if (opc.fotos) for (const [nome, tm] of Object.entries(momentos)) if (!fotosFeitas.has(nome) && t >= tm) {
    fotosFeitas.add(nome);
    await sharp(Buffer.from(buf), { raw: { width: N.tela.W, height: N.tela.H, channels: 4 } }).resize(N.tela.W * 3, N.tela.H * 3, { kernel: 'nearest' }).png().toFile(path.join(OUT, `${NOME}-${nome}.png`));
    if (nome.startsWith('em-')) juntas[nome] = { x: +P.cabeca.pescoco.x.toFixed(1), y: +P.cabeca.pescoco.y.toFixed(1), ang: +P.cabeca.ang.toFixed(3), gesto: gesto?.k ?? 0 };
  }
}
ff.stdin.end();
await new Promise((ok) => ff.on('close', ok));

// the pipes' margins: when the ship's box sat whole in the free lane, against the fire's start
const F = N.canos.faixas, margens = [];
for (const C of M.canos) for (const sv of C.salvas) {
  if (sv.livre == null) continue;
  const tA = C.t0 + sv.tAviso, tF = C.t0 + sv.tFogo;
  let dentro = null;
  for (const p of trilha.p) if (p.t >= tA && p.t <= tF + 0.6 && p.y - N.nave.hit.h / 2 >= F[sv.livre] && p.y + N.nave.hit.h / 2 <= F[sv.livre + 1]) { dentro = p.t; break; }
  margens.push({ t: +tA.toFixed(2), salva: sv.i + 1, livre: sv.livre, daNave: sv.daNave, aviso: N.canos.aviso[sv.i], sobra: dentro == null ? null : +(tF - dentro).toFixed(2) });
}
const minPorTipo = {};
for (const [, v] of folgas) if (minPorTipo[v.tipo] == null || v.min < minPorTipo[v.tipo].min) minPorTipo[v.tipo] = v;
const postos = R.trechos.filter((t) => t.hab === 'canos');
const json = {
  jogador: JOG, T: +R.T.toFixed(2), filmado: +T.toFixed(2), ciclo: +(postos[1].t0 - postos[0].t0).toFixed(2),
  capitulos, toques, toquesPorTipo: toques.reduce((a, q) => ((a[q.tipo] = (a[q.tipo] ?? 0) + 1), a), {}),
  folgaMinimaPorTipo: minPorTipo, tiros: { porCapitulo: tirosPorCap, acertos },
  canos: margens, eco: M.ecos.flatMap((E) => E.justica().map(({ E: _, ...j }) => ({ t0: +E.t0.toFixed(2), ...j }))),
  mordidas: mord.map((m) => ({ pct: m.pct, pedida: +m.tPedido.toFixed(2), t: +m.t.toFixed(2) })),
  geiseres: geis.map((g) => ({ x: g.x, ciclo: g.ciclo, via: g.via, t: +g.tAviso.toFixed(2) })),
  aneis: { inicio: N.corpo.aneis, fim: nAneisEm(R.T, N, mord) },
};
fs.writeFileSync(path.join(OUT, `${NOME}.json`), JSON.stringify(json, null, 1));
if (opc.em) fs.writeFileSync(path.join(OUT, `${NOME}-juntas.json`), JSON.stringify(juntas, null, 1));
if (opc.vaos === '1') fs.writeFileSync(path.join(OUT, `${NOME}-vaos.json`), JSON.stringify(vaosLista));
console.log(`${JOG}: ${f2(T)} s · toques ${JSON.stringify(json.toquesPorTipo)} · ciclo ${json.ciclo} s · acertos ${JSON.stringify(acertos)}`);
function f2(x) { return x.toFixed(1); }
