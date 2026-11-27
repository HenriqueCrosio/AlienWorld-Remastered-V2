// THE FIGHT RECORDER'S MATHS (spec 2026-11-26 §3): the denied area, the breathing room, the per-phase summary.
//   node --experimental-transform-types scripts/test-registro-contas.mjs
import { areaNegada, respiroMax, resumirTrecho } from '../src/dev/registro/contas.ts';

const falhas = [];
const conferir = (ok, nome, info) => { console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${ok ? '' : ` → ${JSON.stringify(info)}`}`); if (!ok) falhas.push(nome); };
conferir(areaNegada([], 384, 216) === 0, 'nenhuma ameaça: nada negado');
// one point threat in the middle: a disc of radius 12 → π·144 / (384·216) ≈ 0.55 %
const um = areaNegada([{ l: 192, r: 192, t: 108, b: 108 }], 384, 216);
conferir(Math.abs(um - (Math.PI * 144) / (384 * 216)) < 0.002, 'um ponto nega um disco de 12 px', um);
// a box covering the whole screen denies everything
conferir(areaNegada([{ l: -10, r: 400, t: -10, b: 230 }], 384, 216) === 1, 'a tela coberta: tudo negado');
// breathing room: threats at 1, 2, 6 s in a phase 0..8 s → the biggest gap is 4 s (2 → 6)
conferir(respiroMax([1, 2, 6], 0, 8) === 4, 'o maior respiro entre ameaças novas', respiroMax([1, 2, 6], 0, 8));
conferir(respiroMax([], 3, 5) === 2, 'sem ameaça nova: a fase inteira é respiro');
const r = resumirTrecho({
  fase: 'capitania1', t0: 1000, t1: 11000, dano: 40, disparos: 50, acertos: 40,
  golpes: [
    { t: 2000, causa: 'tiro', ataque: 'base', quem: 'tracer', x: 60, y: 100, absorvido: false },
    { t: 3000, causa: 'tiro', ataque: 'base', quem: 'tracer', x: 60, y: 100, absorvido: true },
    { t: 4000, causa: 'inimigo', ataque: 'base', quem: 'kamikaze', x: 60, y: 100, absorvido: false },
  ],
  amostras: [{ n: 2, area: 0.1 }, { n: 6, area: 0.3 }],
  novas: [1500, 9000],
});
conferir(r.s === 10, 'o tempo da fase em s', r.s);
conferir(r.acerto === 0.8, 'a fração de acerto', r.acerto);
conferir(r.golpes === 3 && r.vidas === 2, 'os golpes e as vidas (o absorvido não conta como vida)', r);
conferir(r.porCausa['tiro:tracer'] === 2 && r.porCausa['inimigo:kamikaze'] === 1, 'os golpes por causa', r.porCausa);
conferir(r.ameacasMedia === 4 && r.ameacasPico === 6, 'as ameaças na tela, média e pico', r);
conferir(Math.abs(r.areaMedia - 0.2) < 1e-9 && r.areaPico === 0.3, 'a área negada, média e pico', r);
conferir(r.respiroMax === 7.5, 'o respiro da fase (1,5 → 9 s)', r.respiroMax);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
process.exit(falhas.length ? 1 : 0);
