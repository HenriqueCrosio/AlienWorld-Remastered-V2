// A CAVERNA DA F1 (spec 2026-10-21-f1-caverna-design.md — a faixa de rocha NA FRENTE da nave): a geometria pura.
// Uso: node scripts/test-f1-caverna.mjs
import fs from 'node:fs';
import { CAVERNA_F1 as C } from '../src/f1/numerosF1.ts';
import { posicoesCaverna, regiaoCaverna, salaoVisivel, derivaCaverna } from '../src/f1/ritmosF1.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
// a faixa assada (a largura e a boca reais)
const D = JSON.parse(fs.readFileSync('public/sprites/f1/caverna.json', 'utf8'));
const L = D.largura, FM = D.fundoMeio, FMAX = Math.max(...D.fundo);
const k = C.paralaxe;
const p0 = posicoesCaverna(0, FM, L), p100 = posicoesCaverna(100, FM, L);
conferir(p0.entrada === C.x0, 'a faixa da entrada nasce na borda direita', p0);
conferir(p0.entrada - p100.entrada === 100 * k && p0.saida - p100.saida === 100 * k, '`paralaxe` px de tela por px de mundo (mais perto da câmera que o mundo)', [p0, p100]);
const [vde, vate] = salaoVisivel(p0, FM, L);
conferir(Math.abs(vate - vde - k * C.salao) < 1e-9, 'o salão visível tem `salao` px de mundo na linha do meio', [vde, vate]);
const [de, ate] = regiaoCaverna(p0, L);
// a troca fica no meio da rocha em TODA linha (o contorno é simétrico): longe das duas bordas
const folga = Math.min(...D.fundo.map((f) => Math.min(de - (p0.entrada + f + 1), p0.entrada + L - 2 - f - de)));
conferir(folga > 100, 'a troca de cena fica no meio da rocha, a mais de 100 px das bordas em toda linha', folga);
conferir(de < vde && ate > vate, 'as duas trocas ficam FORA do salão visível (atrás das rochas)', [de, vde, vate, ate]);
// A TELA INTEIRA COBERTA por um instante: o lado de fora sai antes de o salão entrar
conferir(L - 3 - 2 * FMAX >= 384, 'a rocha cobre a tela inteira por um instante, em toda linha', L - 3 - 2 * FMAX);
const percurso = (C.x0 + (p0.saida - p0.entrada) + L) / k;
conferir(derivaCaverna(0, percurso) === 0 && derivaCaverna(1e9, percurso) === -C.deriva && Number.isInteger(derivaCaverna(333, percurso)), 'o fundo deriva até `deriva` px, em pixel inteiro', [derivaCaverna(0, percurso), derivaCaverna(333, percurso)]);

// O TEMPO, a 83 px/s com a nave em x 70 (a sonda mede no jogo). Uma marca da faixa em `x0 + off` chega a `alvo` em…
const V = 83, NAVE = 70, TELA = 384;
const t = (off, alvo = NAVE) => C.inicio + (C.x0 + off - alvo) / (k * V);
const dS = p0.saida - p0.entrada;
const tAtras = t(FM + 1), tSalao = t(L - 1 - FM), tSalaoFim = t(dS + FM);
conferir(tSalao - tAtras > 1.5 && tSalao - tAtras < 2.5, 'a nave passa ~2 s atrás da rocha da entrada', { tAtras, tSalao });
conferir(tSalaoFim - tSalao > 11.5 && tSalaoFim - tSalao < 12.5, 'o salão dura ~12 s', tSalaoFim - tSalao);
// o exterior parou de plantar aos 37: o que nasceu antes já saiu da tela quando o salão aparece na borda direita
const tSalaoNaTela = t(L - 1 - FMAX, TELA);
conferir(tSalaoNaTela >= 37 + TELA / V, 'o salão só aparece depois de a última estrutura de fora sair da tela', { tSalaoNaTela, saiu: 37 + 384 / V });
// o roteiro volta (o 'terrain' que replanta o exterior, `inicio + empurra + 1`) logo depois de o lado de fora reaparecer
// à direita da faixa da saída (na linha do meio) — nem antes (estruturas atrás da rocha), nem muito depois
const tFora = t(dS + L - 1 - FM, TELA);
const volta = C.inicio + C.empurra + 1;
conferir(volta >= tFora && volta <= tFora + 2, 'o roteiro volta logo depois de o lado de fora reaparecer à direita', { tFora, volta });

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
