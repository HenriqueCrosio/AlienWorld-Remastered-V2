// A ABERTURA DO MENU (spec 2026-10-19-menu-refeito-design.md §6). Uso, da raiz: node scripts/test-menu-abertura.mjs
import { ABERTURA, JATOS } from '../src/menu/numerosMenu.ts';
import {
  posicaoLetreiro, velocidadeLetreiro, aceleracaoLetreiro, particulasDosJatos, quedaLista, alfaItem, acesa,
  letraAcesa, olhosAcesos, respiracao, alfaVeu, quieto, T_SUB, T_ACESO, T_OLHOS, T_LISTA_POUSA, T_FIM,
} from '../src/menu/abertura.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const perto = (a, b, e = 1e-3) => Math.abs(a - b) <= e;
const L = ABERTURA.letreiro;

// ── A QUEDA (§6.2) ──
conferir(perto(posicaoLetreiro(0).y, L.yIni), 'o letreiro entra em y −30', posicaoLetreiro(0));
conferir(perto(posicaoLetreiro(L.queima).y, ABERTURA.layout.titulo + L.sobra), 'o fim da queima para 2,5 px além do ponto', posicaoLetreiro(L.queima));
conferir(perto(posicaoLetreiro(9).y, ABERTURA.layout.titulo, 0.05), 'e firma no ponto (y 58)', posicaoLetreiro(9));
conferir(perto(posicaoLetreiro(9).x, ABERTURA.layout.x, 0.05), 'centralizado (x 192)', posicaoLetreiro(9));
conferir(perto(posicaoLetreiro(-0.001).y, posicaoLetreiro(0.001).y, 0.2), 'sem salto ao entrar', null);
const v0 = velocidadeLetreiro(0.01).vy;
conferir(v0 > 55 && v0 < 58, `entra a ~57 px/s (${v0.toFixed(1)})`, v0);
conferir(perto(velocidadeLetreiro(-0.01).vy, velocidadeLetreiro(0.01).vy, 1), 'sem salto de velocidade ao entrar', null);
// (A aceleração salta ali — é o sopro final —, então a velocidade se mede bem rente ao instante.)
conferir(Math.abs(velocidadeLetreiro(L.queima - 0.002).vy - velocidadeLetreiro(L.queima + 0.002).vy) < 0.5, 'nem no fim da queima', null);
conferir(aceleracaoLetreiro(-1).ay === 0, 'antes de entrar, sem aceleração (sem jato)', null);
conferir(aceleracaoLetreiro(1).ay < 0, 'na queima, a aceleração é para cima (os retrofoguetes freiam)', aceleracaoLetreiro(1));

// A MESMA PLUMA da rodada 7 (2,2 s): a força vertical, na mesma fração da queima, é a mesma.
const p = L.forma, Dq = ABERTURA.layout.titulo + L.sobra - L.yIni;
for (const f of [0.2, 0.4, 0.6, 0.8]) {
  const tau = f * L.queima, ay = -aceleracaoLetreiro(tau).ay;
  const ref = JATOS.aRef * (JATOS.queimaAprovada / L.queima) ** 2;
  const aprovada = (p * (p - 1) * Dq * (1 - f) ** (p - 2)) / JATOS.queimaAprovada ** 2 / JATOS.aRef;
  conferir(perto(ay / ref, aprovada, 0.01), `a força em ${f * 100}% da queima é a da rodada 7 (${(ay / ref).toFixed(3)})`, aprovada);
}

// ── OS JATOS (§6.3) ──
conferir(particulasDosJatos(L.t0 - 0.5).length === 0, 'antes de o letreiro entrar, nenhum jato', null);
const p1 = particulasDosJatos(L.t0 + 1);
conferir(p1.length > 40, `na queima, a pluma (${p1.length} partículas)`, p1.length);
conferir(JSON.stringify(p1) === JSON.stringify(particulasDosJatos(L.t0 + 1)), 'os jatos são função pura do tempo', null);
const cy = posicaoLetreiro(1).y;
conferir(p1.filter((q) => q.y > cy).length > p1.length * 0.6, 'a maior parte do gás sai por baixo (o freio)', null);
conferir(particulasDosJatos(L.t0 + L.queima + L.fimJatos + 0.5).length === 0, 'depois da queima e do ajuste, os jatos param', null);
conferir(p1.every((q) => q.alfa >= 0 && q.alfa <= 1 && q.tam > 0), 'alfa e tamanho válidos', null);

// ── A LISTA (§6.4) ──
conferir(quedaLista(0, 7.2).dy === -14 && quedaLista(0, 7.2).alfa === 0, 'a lista começa 14 px acima, invisível', quedaLista(0, 7.2));
conferir(Math.abs(quedaLista(2, 9.5).dy) < 0.3 && quedaLista(2, 9.5).alfa === 1, 'e pousa no lugar', quedaLista(2, 9.5));
conferir(perto(T_LISTA_POUSA, 7.2 + 0.16 + 1.4), `pousa em ${T_LISTA_POUSA.toFixed(2)} s`, T_LISTA_POUSA);
conferir(alfaItem(false, 20, 10, true) === 0.7, 'item fora do cursor a 0,7', null);
conferir(perto(alfaItem(true, 10, 10, true), 1) && perto(alfaItem(true, 11.1, 10, true), 0.4), 'o do cursor pisca de 1 a 0,4 em 2,2 s', null);

// ── O ACENDER (§6.4) ──
conferir(acesa(0, 0.02) && !acesa(0, 0.06) && acesa(0, 0.1) && !acesa(0, -0.01), 'cada letra: acesa, apagada, acesa de vez', null);
conferir(!letraAcesa(0, 8.79) && letraAcesa(0, 8.9), 'a 1ª letra acende aos 8,8 s', null);
conferir(perto(T_SUB, 9.6) && perto(T_ACESO, 9.95) && perto(T_OLHOS, 10.4), `REMASTERED ${T_SUB.toFixed(2)}, aceso ${T_ACESO.toFixed(2)}, olhos ${T_OLHOS.toFixed(2)}`, null);
conferir(!olhosAcesos(10.3) && olhosAcesos(10.6), 'os olhos por último (~10,4 s)', null);
conferir(T_FIM > T_OLHOS, 'a abertura acaba depois dos olhos', T_FIM);
conferir(respiracao(9) === 1, 'antes de acender inteiro, o letreiro não respira', null);
const minimo = Math.min(...Array.from({ length: 60 }, (_, i) => respiracao(T_ACESO + i * 0.1)));
conferir(perto(minimo, 0.82, 0.01), `depois respira até 0,82 (${minimo.toFixed(3)})`, minimo);

// ── O VÉU E A JANELA QUIETA (§6.1, §4.3) ──
conferir(alfaVeu(0) === 1 && alfaVeu(1.2) === 0, 'o véu sai em 1,2 s', null);
conferir(!quieto(2.4, false), 'o 1º relâmpago (2,4 s) pode cair', null);
conferir(quieto(3, false) && quieto(10.45, false) && !quieto(10.6, false), 'nenhum relâmpago de 3,0 a 10,5 s', null);
conferir(!quieto(5, true), 'pulada a abertura, o céu volta a poder trovejar', null);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
