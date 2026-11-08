// 08/11 — THE EEL'S COST PER FRAME (plan `plans/2026-11-08-enguia-instalacao.md`, Task 9): the whole fight through the
// port at the game's 60 frames/s, drawn into the game's target (`AlvoLonas`), the mock's dodging probe flying the ship
// (its own cost left out). Per frame: her logic (`antes` + `grava` + `depois`) and her frame (`quadro`). Prints p50 / p95
// / max per chapter and overall (the budget, spec §8: p95 ≤ 4 ms in the game, upload included — so ≤ ~3 ms here).
//   node scripts/_serpente/_enguia-desempenho.mjs [fps=60] [jogador=desvia]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const sharp = createRequire(import.meta.url)('sharp');
const opc = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=')));
const FPS = Number(opc.fps ?? 60), JOG = opc.jogador ?? 'desvia';
const P = (p) => import(pathToFileURL(path.resolve(`src/entities/serpente/enguia/${p}`)).href);
const M = (p) => import(pathToFileURL(path.resolve(`scripts/_serpente/enguia/${p}`)).href);
const { N } = await P('numeros.ts');
const { Jogador } = await M('jogador.mjs');
const { preparaDesenho, quadro } = await P('desenho.ts');
const { AlvoLonas } = await P('alvos.ts');
const { LutaEnguia } = await P('luta.ts');
const { medidas } = await P('medidas.ts');
const { carregaArte } = await P('arte.ts');
const { carregaGestos } = await P('gestos.ts');
const { ARQUIVOS_ENGUIA } = await P('arquivos.ts');
const { normaliza } = await P('fonte.ts');
const raw = async (a) => { const { data, info } = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data: new Uint8Array(data), w: info.width, h: info.height }; };
const cache = new Map();
for (const [k, f] of Object.entries(ARQUIVOS_ENGUIA)) cache.set(k, normaliza(await raw(`public/sprites/enguia/${f}`)));
const ler = (k) => cache.get(k);
let t0 = performance.now();
const med = medidas(N, ler('enguiaCabeca'), ler('enguiaF1'));
const arte = carregaArte(N, ler), G = carregaGestos(ler, arte.dorsoCabeca);
const labio = await raw('public/sprites/serpente-rombo-labio.png');
const D = preparaDesenho(N, med, arte, { labio });
console.log(`preparo da arte: ${(performance.now() - t0).toFixed(0)} ms`);
const luta = new LutaEnguia(med, G, D, { sementes: { rnd: 20261107, sorte: 5 }, maquete: true });
const alvo = new AlvoLonas();
alvo.defineLabio(D.labioTela);
const jog = new Jogador(JOG, N);
const dt = 1 / FPS, porCap = new Map(), todos = [];
for (let f = 0; ; f++) {
  const t = f * dt;
  if (luta.morta && t > luta.R.T) break;
  const a = performance.now();
  luta.antes(t, dt, { x: jog.x, y: jog.y });
  const b = performance.now();
  jog.passo(t, dt, luta.mundo);
  const c = performance.now();
  luta.grava(jog.x, jog.y);
  luta.fere({ x0: jog.x - 10.5, y0: jog.y - 4.5, x1: jog.x + 10.5, y1: jog.y + 4.5 });
  luta.depois(dt);
  alvo.limpa();
  const s = luta.cena();
  // (`sem=particulas|respiros|pfx`: leave a part out, to see what it costs)
  if (opc.sem === 'particulas') s.particulas = [];
  if (opc.sem === 'respiros') s.respiros = null;
  const d = performance.now();
  quadro(D, s, alvo);
  const e = performance.now();
  const ms = { logica: b - a + (d - c), quadro: e - d };
  const cap = s.pose.e.trecho.cap;
  if (!porCap.has(cap)) porCap.set(cap, []);
  porCap.get(cap).push(ms);
  todos.push(ms);
}
const q = (xs, p) => { const o = [...xs].sort((u, v) => u - v); return o[Math.min(o.length - 1, Math.floor(p * o.length))]; };
const linha = (nome, l) => {
  const tot = l.map((m) => m.logica + m.quadro);
  console.log(`${nome.padEnd(10)} n=${String(l.length).padStart(5)}  total p50 ${q(tot, 0.5).toFixed(2)} p95 ${q(tot, 0.95).toFixed(2)} máx ${q(tot, 1).toFixed(2)}  | lógica p95 ${q(l.map((m) => m.logica), 0.95).toFixed(2)} | quadro p95 ${q(l.map((m) => m.quadro), 0.95).toFixed(2)} ms`);
};
for (const [cap, l] of porCap) linha(cap, l);
linha('TUDO', todos);
