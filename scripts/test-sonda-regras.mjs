// THE SONDA's pure rules (spec 2026-11-20-bloco-f-sonda-design.md §3). From the root: node scripts/test-sonda-regras.mjs
import { SONDA as S } from '../src/data/numerosSonda.ts';
import {
  sortearCaminho, yNoCaminho, quemAtira, xDoPrimeiroAviso, atiraDeNovo, esquivaNova, alinhada, passoEsquiva, desvioDaEsquiva,
  inclinacao, ladosDaDispersao, caminhoDoMembro, balanco, faseDoBalanco,
} from '../src/entities/sonda/regras.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
/** a fixed sequence for `rnd` */
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
let semente = 7;
const rnd = () => (semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0) / 4294967296;

// ── the path ──
const merg = sortearCaminho(seq(0.1, 0.1), 120);
conferir(merg.tipo === 'mergulho' && merg.y0 === S.faixa[0] && merg.y1 === 120, 'rnd baixo: o mergulho, entrando alto, até a altura da nave', merg);
const diag = sortearCaminho(seq(0.9, 0.5), 120);
conferir(diag.tipo === 'diagonal' && diag.y0 === S.faixa[1] && diag.y1 === S.faixa[0], 'rnd alto: o corte em diagonal, de baixo para cima', diag);
conferir(sortearCaminho(seq(0.1, 0.1), 999).y1 === S.faixa[1], 'a nave fora da faixa: o mergulho para na borda da faixa', null);
const disp = sortearCaminho(seq(0.5, 0.9, 0.5), 120);
conferir(disp.tipo === 'dispersao' && disp.y0 >= S.dispersao.alturaY[0] && disp.y0 <= S.dispersao.alturaY[1], 'o 3º terço: a DISPERSÃO, numa altura do meio', disp);
const cima = caminhoDoMembro(disp, -1), reto = caminhoDoMembro(disp, 0), baixo = caminhoDoMembro(disp, 1);
conferir(cima.y1 < disp.y0 && reto.y1 === disp.y0 && baixo.y1 > disp.y0, 'na dispersão cada uma abre para o seu lado', [cima.y1, reto.y1, baixo.y1]);
conferir(yNoCaminho(cima, S.dispersao.abre[0] + 10) === yNoCaminho(baixo, S.dispersao.abre[0] + 10), 'elas entram juntas, em fila, antes de abrir', null);
conferir(caminhoDoMembro(merg, 1) === merg, 'fora da dispersão o membro segue o caminho da onda', null);
let nuncaIguais = true;
for (let i = 0; i < 300; i++) { const l = ladosDaDispersao(rnd, 3); if (new Set(l).size < 2) nuncaIguais = false; }
conferir(nuncaIguais, 'o leque nunca sai com as três para o mesmo lado', null);
const tipos = new Set();
for (let i = 0; i < 300; i++) tipos.add(sortearCaminho(rnd, 100).tipo);
conferir(tipos.size === 3, 'os três caminhos acontecem', [...tipos]);
for (const c of [merg, diag, disp, cima, baixo, sortearCaminho(seq(0.9, 0.1), 60), sortearCaminho(seq(0.1, 0.5), 60)]) {
  conferir(Math.abs(yNoCaminho(c, S.xEntra) - c.y0) < 1e-9, `${c.tipo}: nasce na altura de entrada`, yNoCaminho(c, S.xEntra));
  conferir(Math.abs(yNoCaminho(c, S.xSai) - c.y1) < 1e-9, `${c.tipo}: sai na altura final`, yNoCaminho(c, S.xSai));
  let dentro = true;
  for (let x = S.xEntra; x >= S.xSai; x -= 4) {
    const y = yNoCaminho(c, x);
    if (y < S.faixa[0] - 1e-9 || y > S.faixa[1] + 1e-9) dentro = false;
  }
  conferir(dentro, `${c.tipo}: o caminho inteiro fica dentro da faixa`, null);
}
conferir(yNoCaminho(merg, S.curva[1]) === yNoCaminho(merg, 0), 'o mergulho termina a curva e segue reto', [yNoCaminho(merg, S.curva[1]), yNoCaminho(merg, 0)]);
conferir(yNoCaminho(merg, S.curva[0] + 20) === merg.y0, 'o mergulho entra reto antes de curvar', null);

// ── who shoots ──
let soUmOuDois = true;
let viuUm = false;
let viuDois = false;
for (let i = 0; i < 500; i++) {
  const q = quemAtira(rnd, 3).filter(Boolean).length;
  if (q < 1 || q > 2) soUmOuDois = false;
  if (q === 1) viuUm = true;
  if (q === 2) viuDois = true;
}
conferir(soUmOuDois && viuUm && viuDois, 'numa onda de 3, atiram 1 ou 2 (os dois casos acontecem)', null);
conferir(JSON.stringify(quemAtira(rnd, 1)) === '[true]' && quemAtira(rnd, 0).length === 0, 'onda de 1: ela atira; onda vazia: ninguém', null);
let avisoNaFaixa = true;
for (let i = 0; i < 200; i++) {
  const x = xDoPrimeiroAviso(rnd);
  if (x > S.tiro.xPrimeiro[0] || x < S.tiro.xPrimeiro[1] || x > 384 - 13) avisoNaFaixa = false;
}
conferir(avisoNaFaixa, 'o 1º aviso logo que ela está inteira na tela', null);
conferir(!atiraDeNovo(0, 9, 300, 60), 'antes do 1º tiro, só o 1º aviso conta', null);
conferir(!atiraDeNovo(1, S.tiro.intervaloS - 0.01, 300, 60) && atiraDeNovo(1, S.tiro.intervaloS, 300, 60), 'o próximo tiro, um intervalo depois', null);
conferir(!atiraDeNovo(S.tiro.max, 9, 300, 60), 'no máximo `max` tiros', S.tiro.max);
conferir(!atiraDeNovo(1, 9, 60 + S.tiro.frente - 1, 60), 'colada na nave (ou atrás dela) não atira', null);

// ── the dodge ──
conferir(alinhada(80, 100, 300, 104) && !alinhada(80, 130, 300, 104) && !alinhada(320, 104, 300, 104), 'alinhada = mesma altura e À FRENTE dela', null);
conferir(!alinhada(80, 104, S.esquiva.xMax + 1, 104) && alinhada(80, 104, S.esquiva.xMax, 104), 'na borda, entrando: ainda não esquiva', null);
let e = esquivaNova();
e = passoEsquiva(e, 0.2, 0.2, true, 60);
conferir(e.inicio === null, 'alinhada por menos que a demora: não esquiva', e);
e = passoEsquiva(e, 0.3, 0.1, true, 60);
conferir(e.inicio === 0.3 && e.dir === 1, 'alinhada pela demora: esquiva, para baixo quando está alta', e);
const antes = e;
e = passoEsquiva(e, 5, 0.1, true, 60);
conferir(e === antes, 'esquiva UMA vez só', e);
conferir(passoEsquiva(passoEsquiva(esquivaNova(), 0.2, 0.2, true, 60), 0.3, 0.1, false, 60).inicio === null, 'desalinhou antes da demora: o relógio zera', null);
conferir(passoEsquiva(passoEsquiva(esquivaNova(), 0.2, 0.2, true, 170), 0.3, 0.1, true, 170).dir === -1, 'baixa: esquiva para cima', null);
const pico = desvioDaEsquiva(e, 0.3 + S.esquiva.idaS);
conferir(Math.abs(pico - S.esquiva.passo) < 1e-9, 'o passo inteiro no fim da ida', pico);
conferir(desvioDaEsquiva(e, 0.3 + S.esquiva.idaS + S.esquiva.voltaS + 0.01) === 0, 'e volta ao caminho', null);
conferir(desvioDaEsquiva(esquivaNova(), 3) === 0, 'sem esquiva: desvio zero', null);

// ── the sway (round 3) ──
let maxDy = 0, maxVy = 0, maxVx = 0;
for (let t = 0; t < 6; t += 0.01) {
  const a = balanco(t, 0.4), b = balanco(t + 0.01, 0.4);
  maxDy = Math.max(maxDy, Math.abs(a.dy));
  maxVy = Math.max(maxVy, Math.abs(b.dy - a.dy) / 0.01);
  maxVx = Math.max(maxVx, Math.abs(a.vx));
}
conferir(maxDy <= S.balanco.amp + 1e-9 && maxDy > S.balanco.amp * 0.95, `o balanço sobe e desce ${S.balanco.amp} px (o batedor: 28)`, maxDy);
conferir(maxVy < S.inclina, `leve: a velocidade dele (${maxVy.toFixed(1)} px/s) nunca dispara a inclinação (${S.inclina})`, maxVy);
conferir(maxVx > 0 && maxVx < 6, 'o avanço e recuo, pequeno', maxVx);
const f0 = faseDoBalanco(0, () => 0.5), f1 = faseDoBalanco(1, () => 0.5);
conferir(Math.abs(balanco(1, f0).dy - balanco(1, f1).dy) > 0.5, 'cada uma da fila na sua fase (não balançam juntas)', [balanco(1, f0).dy, balanco(1, f1).dy]);

// ── the lean ──
conferir(inclinacao(-S.inclina - 1) === 'sobe' && inclinacao(S.inclina + 1) === 'desce' && inclinacao(0) === 'reto', 'a inclinação pela velocidade vertical', null);

console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo certo');
process.exitCode = falhas.length ? 1 : 0;
