// 08/11 — THE EEL'S FIGHT THROUGH THE PORT (plan `plans/2026-11-08-enguia-instalacao.md`, Task 8): the mock's loop
// (`_enguia-maquete.mjs` 172–523) with HER part replaced by `src/entities/serpente/enguia/luta.ts` (`LutaEnguia`) and
// the frame by `desenho.ts` into the oracle's target (`AlvoQuadro`, the mock's own frame) — and the mock's own probe
// player, shots, counts and log around it. Run next to the mock (`md5=1`): the JSON and the md5 of every raw frame must
// be the same.
//   node scripts/_serpente/_enguia-porte.mjs <desvia|parado> <out-dir> [ate=<s>]
//   → <out-dir>/<jogador>-pele.json, <jogador>-pele-md5.txt
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const sharp = createRequire(import.meta.url)('sharp');
const [JOG = 'desvia', OUT = 'docs/superpowers/folhas/2026-11-08/enguia-porte/cru', ...resto] = process.argv.slice(2);
const opc = Object.fromEntries(resto.map((a) => a.split('=')));
const ARENA = opc.arena ?? 'docs/superpowers/folhas/2026-10-29/serpente-casco/cru';
fs.mkdirSync(OUT, { recursive: true });
const P = (p) => import(pathToFileURL(path.resolve(`src/entities/serpente/enguia/${p}`)).href);
const M = (p) => import(pathToFileURL(path.resolve(`scripts/_serpente/enguia/${p}`)).href);

const { N } = await P('numeros.ts');
const { Jogador } = await M('jogador.mjs');
const { folga } = await P('perigos.ts');
const { preparaDesenho, quadro } = await P('desenho.ts');
const { AlvoQuadro } = await P('alvos.ts');
const { LutaEnguia } = await P('luta.ts');
const { medidas } = await P('medidas.ts');
const { carregaArte } = await P('arte.ts');
const { carregaGestos } = await P('gestos.ts');
const { ARQUIVOS_ENGUIA } = await P('arquivos.ts');
const { normaliza } = await P('fonte.ts');
const { duracaoCanos } = await P('roteiro.ts');

const raw = async (a) => { const { data, info } = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data: new Uint8Array(data), w: info.width, h: info.height }; };
const cache = new Map();
for (const [k, f] of Object.entries(ARQUIVOS_ENGUIA)) cache.set(k, normaliza(await raw(`public/sprites/enguia/${f}`)));
const ler = (k) => cache.get(k);
const med = medidas(N, ler('enguiaCabeca'), ler('enguiaF1'));
const arte = carregaArte(N, ler), G = carregaGestos(ler, arte.dorsoCabeca);
const fundo = (await raw(`${ARENA}/arena-semnave.png`)).data, comNave = (await raw(`${ARENA}/arena.png`)).data;
const D = preparaDesenho(N, med, arte, { fundo, labio: await raw('public/sprites/serpente-rombo-labio.png') });
// the mock's ship sprite: the photo with the ship against the one without (the mock 210–215)
const naveSprite = [];
for (let y = 86; y < 114; y++) for (let x = 44; x < 94; x++) {
  const i = (y * N.tela.W + x) * 4;
  if (Math.abs(comNave[i] - fundo[i]) + Math.abs(comNave[i + 1] - fundo[i + 1]) + Math.abs(comNave[i + 2] - fundo[i + 2]) > 8)
    naveSprite.push({ dx: x - 70, dy: y - 100, c: [comNave[i], comNave[i + 1], comNave[i + 2]] });
}

const luta = new LutaEnguia(med, G, D, { sementes: { rnd: 20261107, sorte: 5 }, maquete: true });
const jog = new Jogador(JOG, N);
const FPS = N.tela.fps, dt = 1 / FPS, ATE = opc.ate ? Number(opc.ate) : Infinity;
const alvo = new AlvoQuadro(fundo);
const capitulos = [], toques = [], tocando = new Map(), folgas = new Map(), tirosPorCap = {}, acertos = { corpo: 0, cabeca: 0 };
const tiros = [], md5s = [];
let proxTiro = 0, capAtual = null;
const t0Run = performance.now();

for (let f = 0; ; f++) {
  const t = f * dt;
  if (t > ATE) break;
  if (luta.morta && t > luta.R.T) break;
  if (f % 300 === 0 && opc.progresso) console.error(`  t=${t.toFixed(1)} ${luta.R.estado(t).trecho.nome} T=${luta.R.T.toFixed(1)} trechos=${luta.R.trechos.length} (${((performance.now() - t0Run) / 1000).toFixed(1)} s)`);
  // (the mock's `e`, before its loop's work: the chapters)
  const tr0 = luta.R.estado(t).trecho;
  luta.antes(t, dt, { x: jog.x, y: jog.y });
  const tr = luta.R.estado(t).trecho;
  void tr0;
  const cap = `${tr.cap}${tr.ciclo ? ` · ciclo ${tr.ciclo}` : ''}`;
  if (cap !== capAtual) { capitulos.push({ t: +t.toFixed(2), cap: tr.cap, ciclo: tr.ciclo ?? null }); capAtual = cap; }
  // the probe plays, records its trail, fires
  jog.passo(t, dt, luta.mundo);
  luta.grava(jog.x, jog.y);
  if (t >= proxTiro) { tiros.push({ x: jog.x + N.nave.nariz, y: jog.y, cap: tr.cap }); proxTiro = t + N.tiro.cada; tirosPorCap[tr.cap] ??= { tiros: 0, acertos: 0, cabeca: 0 }; tirosPorCap[tr.cap].tiros++; }
  // what hurts now: touches and the closest call per hazard
  let ferida = false;
  const vistos = new Set();
  for (const h of luta.agora) {
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
  const alvos = luta.agora.filter((h) => h.tipo === 'corpo' || h.tipo === 'cabeca');
  for (let i = tiros.length - 1; i >= 0; i--) {
    const b = tiros[i];
    b.x += N.tiro.vel * dt;
    const a = alvos.find((h) => Math.hypot(b.x - h.forma.c.x, b.y - h.forma.c.y) <= h.forma.c.r);
    if (a) {
      acertos[a.tipo]++; tirosPorCap[b.cap].acertos++; if (a.tipo === 'cabeca') tirosPorCap[b.cap].cabeca++;
      luta.faisca(b.x, b.y);
      tiros.splice(i, 1);
    } else if (b.x > N.tela.W + 4) tiros.splice(i, 1);
  }
  luta.depois(dt);
  // the frame: hers through the port, then the mock's ship and shots (the mock 589–590)
  alvo.limpa();
  const s = { ...luta.cena(), cascoProprio: true };
  quadro(D, s, alvo);
  for (const b of tiros) for (let k = 0; k < 4; k++) { const c = k ? [255, 220, 120] : [255, 255, 230]; alvo.put(b.x - k, b.y, c[0], c[1], c[2], 1 - k * 0.2, 0); }
  for (const p of naveSprite) { const c = ferida ? [255, 70 + p.c[1] * 0.2, 60] : p.c; alvo.put(jog.x + p.dx, jog.y + p.dy, c[0], c[1], c[2], 1, 0); }
  md5s.push(createHash('md5').update(alvo.out).digest('hex'));
}

// the pipes' margins (the mock 500–508)
const F = N.canos.faixas, margens = [];
for (const C of luta.canos) for (const sv of C.salvas) {
  if (sv.livre == null) continue;
  const tA = C.t0 + sv.tAviso, tF = C.t0 + sv.tFogo;
  let dentro = null;
  for (const p of luta.trilha.p) if (p.t >= tA && p.t <= tF + 0.6 && p.y - N.nave.hit.h / 2 >= F[sv.livre] && p.y + N.nave.hit.h / 2 <= F[sv.livre + 1]) { dentro = p.t; break; }
  margens.push({ t: +tA.toFixed(2), salva: sv.i + 1, livre: sv.livre, daNave: sv.daNave, aviso: N.canos.aviso[sv.i], sobra: dentro == null ? null : +(tF - dentro).toFixed(2) });
}
const minPorTipo = {};
for (const [, v] of folgas) if (minPorTipo[v.tipo] == null || v.min < minPorTipo[v.tipo].min) minPorTipo[v.tipo] = v;
const postos = luta.R.trechos.filter((t) => t.hab === 'canos');
const mordLista = [...luta.mord.map((m) => ({ pct: m.pct, pedida: +m.tPedido.toFixed(2), t: +m.t.toFixed(2) })), ...(luta.cranio ? [{ pct: 5, pedida: +luta.cranio.t.toFixed(2), t: +luta.cranio.t.toFixed(2) }] : [])];
const json = {
  jogador: JOG, T: +luta.R.T.toFixed(2), filmado: +Math.min(luta.R.T, ATE).toFixed(2), ciclo: postos[1] ? +(postos[1].t0 - postos[0].t0).toFixed(2) : null,
  capitulos, toques, toquesPorTipo: toques.reduce((a, q) => ((a[q.tipo] = (a[q.tipo] ?? 0) + 1), a), {}),
  folgaMinimaPorTipo: minPorTipo, tiros: { porCapitulo: tirosPorCap, acertos },
  canos: margens, eco: luta.ecos.flatMap((E) => E.justica().map(({ E: _, ...j }) => ({ t0: +E.t0.toFixed(2), ...j }))),
  mordidas: mordLista,
  geiseres: luta.geis.map((g) => ({ x: g.x, ciclo: g.ciclo, via: g.via, t: +g.tAviso.toFixed(2) })),
  aneis: { inicio: N.corpo.aneis, fim: luta.nAneis },
};
void duracaoCanos;
fs.writeFileSync(path.join(OUT, `${JOG}-pele.json`), JSON.stringify(json, null, 1));
fs.writeFileSync(path.join(OUT, `${JOG}-pele-md5.txt`), md5s.join('\n'));
console.log(`${JOG} (porte): ${json.filmado} s · ${md5s.length} quadros em ${((performance.now() - t0Run) / 1000).toFixed(1)} s · toques ${JSON.stringify(json.toquesPorTipo)} · acertos ${JSON.stringify(acertos)}`);
