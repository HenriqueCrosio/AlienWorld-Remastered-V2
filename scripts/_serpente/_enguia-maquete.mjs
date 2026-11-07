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
import { pose, mordidas, nAneisEm } from './enguia/corpo.mjs';
import { Canos, faixaDe } from './enguia/canos.mjs';
import { Eco, Trilha } from './enguia/eco.mjs';
import { geiseres, lombada, fissuras } from './enguia/geiseres.mjs';
import { perigos, folga } from './enguia/perigos.mjs';
import { Jogador } from './enguia/jogador.mjs';
import { preparaDesenho, quadro, pixelsDaCabeca, bocaNaTela } from './enguia/desenho.mjs';

const [JOG = 'desvia', OUT = 'docs/superpowers/folhas/2026-11-07/enguia-maquete/cru', ...resto] = process.argv.slice(2);
const opc = Object.fromEntries(resto.map((a) => a.split('=')));
const ARENA = opc.arena ?? 'docs/superpowers/folhas/2026-10-29/serpente-casco/cru';
fs.mkdirSync(OUT, { recursive: true });

const med = await medidas(N);
const R = montaRoteiro(N, med);
const mord = mordidas(R, N, med);
const geis = geiseres(R, N);
const D = await preparaDesenho(N, med, ARENA);
const FPS = N.tela.fps, dt = 1 / FPS, T = Math.min(R.T, opc.ate ? Number(opc.ate) : R.T);
const rnd = LCG(20261107), sorte = LCG(5);
const cranio = mord.find((m) => m.cranio);
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
  geiser: geis[2].tColuna + 0.15,
  volta: R.trechos.find((t) => t.nome === 'volta').t0 + 1.4,
  mordida: mord[0].t + 0.1,
  'sob-vazio': R.trechos.find((t) => t.sob === 'ida').t0 + 0.9,
  posto: R.trechos.find((t) => t.hab === 'canos').t0 + 0.3,
  // (his note: the 2nd and 3rd pipes, with the tail bitten off — the bottom lane still fires from her body)
  'posto2-fogo': R.trechos.filter((t) => t.hab === 'canos')[1].t0 + N.canos.antes + N.canos.aviso[0] + 0.3,
  'posto3-fogo': R.trechos.filter((t) => t.hab === 'canos')[2].t0 + N.canos.antes + N.canos.aviso[0] + 0.3,
  presa: R.trechos.find((t) => t.hab === 'presa').t0 + 0.4,
  fim: R.trechos.find((t) => t.hab === 'fim').t0 + 0.6,
};
const fotosFeitas = new Set();

// the video: raw frames into ffmpeg (×3, nearest)
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${N.tela.W}x${N.tela.H}`, '-r', String(FPS), '-i', '-',
  '-vf', 'scale=iw*3:ih*3:flags=neighbor', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, `${JOG}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
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
  } else if (tr.prepara && cabecaVisivel) {
    const k = Math.min(1, e.tl / (N.prepara.dur * 0.7));
    alvoGiro = acima * N.prepara.giro * k * k * (3 - 2 * k);
    rapido = 14;
  }
  giro += (alvoGiro - giro) * Math.min(1, dt * rapido);
  let tranco = 0;
  for (const E of M.ecos) for (const r of E.rodadas) if (t >= r.cospe && t < r.cospe + 0.35) tranco = acima * 0.22 * (1 - (t - r.cospe) / 0.35);
  let treme = null;
  if (tr.hab === 'presa') treme = { x: Math.round(sorte() * 2 - 1), y: Math.round(sorte() * 2 - 1) };
  else if (tr.hab === 'canos') {
    const q = M.canos.at(-1)?.estado(t);
    if (q && q.fase === 'aviso' && sorte() < q.k * 0.7) treme = { x: Math.round(sorte() * 2 - 1), y: Math.round(sorte() * 2 - 1) };
  }
  const P = pose(R, N, med, t, { mord, giro: giro + tranco, treme });
  for (const E of M.ecos) {
    const antes = E.rodadas.map((r) => !!r.sementes);
    E.atualiza(t, trilha, bocaNaTela(P, med));
    E.rodadas.forEach((r, i) => { // the spit's flash at the mouth
      if (!antes[i] && r.sementes) { const b = bocaNaTela(P, med); for (let k = 0; k < 14; k++) { const an = sorte() * Math.PI * 2; nasce({ x: b.x, y: b.y, vx: Math.cos(an) * 40, vy: Math.sin(an) * 40, vida: 0.25, cor: [150, 220, 255] }); } nasce({ x: b.x, y: b.y, vx: 0, vy: 0, vida: 0.15, cor: [220, 245, 255], tam: 5 }); }
    });
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
    if (Math.abs(t - g.tFim) < dt / 2) for (let i = 0; i < 26; i++) nasce({ x: g.x + (sorte() - 0.5) * 16, y: N.geiser.topo + sorte() * 120, vx: (sorte() - 0.5) * 30, vy: -10 - sorte() * 20, vida: N.geiser.vapor, cor: [120, 190, 150], tam: 2 + sorte() * 2, cresce: true, a: 0.5 });
    if (t >= g.tAviso && t < g.tColuna && sorte() < 0.5) nasce({ x: g.x + (sorte() - 0.5) * 14, y: N.geiser.yLombada + 3, vx: (sorte() - 0.5) * 12, vy: -18 - sorte() * 14, vida: 0.4, cor: [150, 230, 180], tam: 1.5, a: 0.6 });
  }
  if (tr.hab === 'desfaz' && !desfeita) {
    desfeita = true;
    const ps = pixelsDaCabeca(D, P, { mordida: MORDIDA_CRANIO });
    const cx = ps.reduce((a, p) => a + p.x, 0) / ps.length, cy = ps.reduce((a, p) => a + p.y, 0) / ps.length;
    for (const p of ps) { const an = Math.atan2(p.y - cy, p.x - cx) + (sorte() - 0.5) * 0.8, v = 8 + sorte() * 40; nasce({ x: p.x, y: p.y, vx: Math.cos(an) * v, vy: Math.sin(an) * v, vida: 0.7 + sorte() * 0.7, cor: sorte() < 0.08 ? [255, 140, 48] : sorte() < 0.05 ? [96, 210, 255] : [104, 108, 120] }); }
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
    mordida: t >= cranio.t ? MORDIDA_CRANIO : null, olhoAceso: !!eco?.lendo,
  };
  const buf = quadro(D, s);
  await escreve(buf);
  if (opc.fotos) for (const [nome, tm] of Object.entries(momentos)) if (!fotosFeitas.has(nome) && t >= tm) {
    fotosFeitas.add(nome);
    await sharp(Buffer.from(buf), { raw: { width: N.tela.W, height: N.tela.H, channels: 4 } }).resize(N.tela.W * 3, N.tela.H * 3, { kernel: 'nearest' }).png().toFile(path.join(OUT, `${JOG}-${nome}.png`));
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
fs.writeFileSync(path.join(OUT, `${JOG}.json`), JSON.stringify(json, null, 1));
console.log(`${JOG}: ${f2(T)} s · toques ${JSON.stringify(json.toquesPorTipo)} · ciclo ${json.ciclo} s · acertos ${JSON.stringify(acertos)}`);
function f2(x) { return x.toFixed(1); }
