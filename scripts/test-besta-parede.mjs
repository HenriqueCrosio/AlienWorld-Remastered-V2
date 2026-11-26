// THE SLOW WALL, the pure rules (25/11, the Beast's step 11): the slab's columns, the corridor through it, the time
// she holds on the wall. Each figure must be a tube the ship (21×9, 110 px/s) can drift along; nothing else is open.
//   node --experimental-transform-types scripts/test-besta-parede.mjs
import { PAREDE, figuraDaParede, nascimento, pecasDaColuna, percorrivel, segura } from '../src/entities/besta/parede.ts';

const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${info !== undefined ? ` → ${JSON.stringify(info)}` : ''}`);
  if (!ok) falhas.push(nome);
};

conferir(PAREDE.FIGURAS.length === 3, 'três corredores fixos', PAREDE.FIGURAS.map((f) => f.nome));
for (const f of PAREDE.FIGURAS) {
  conferir(f.vaos.length === PAREDE.COLUNAS, `${f.nome}: um vão por coluna`, f.vaos.length);
  conferir(f.vaos.every((v) => v - PAREDE.VAO / 2 >= PAREDE.TOPO && v + PAREDE.VAO / 2 <= PAREDE.FUNDO), `${f.nome}: todo vão dentro da sala`, f.vaos);
  const trocas = f.vaos.slice(1).map((v, i) => Math.abs(v - f.vaos[i]));
  conferir(Math.max(...trocas) <= PAREDE.TROCA_MAX, `${f.nome}: o vão muda no máximo ${PAREDE.TROCA_MAX} px de uma coluna para a outra`, trocas);
  const p = percorrivel(f.vaos);
  conferir(p.ok, `${f.nome}: a nave (9 px) segue o corredor com ≥ 3 px de folga e a ≤ 60 % da velocidade`, { folga: p.folga, v: +p.vNecessaria.toFixed(1) });
  // each column: closed except its gap (no crack the 9 px ship fits in)
  for (const [i, v] of f.vaos.entries()) {
    const ys = pecasDaColuna(v);
    const frestas = ys.slice(1).map((y, k) => y - ys[k] - PAREDE.CAIXA[1]);
    const vao = ys.find((y) => y > v) - ys.findLast((y) => y < v) - PAREDE.CAIXA[1];
    const fechadas = frestas.filter((g) => g !== vao);
    if (!(Math.max(...fechadas) < 9 && vao >= PAREDE.VAO && ys[0] - PAREDE.CAIXA[1] / 2 <= 20 && ys.at(-1) + PAREDE.CAIXA[1] / 2 >= 182)) {
      conferir(false, `${f.nome}, coluna ${i}: fechada do teto ao chão, só o vão aberto`, { frestas, vao, topo: ys[0], fundo: ys.at(-1) });
    }
  }
}
conferir(figuraDaParede(3).nome === PAREDE.FIGURAS[0].nome, 'os corredores giram (o 4º é o 1º)');
const pecas = PAREDE.FIGURAS.map((f) => f.vaos.reduce((s, v) => s + pecasDaColuna(v).length, 0));
conferir(Math.max(...pecas) <= 60, 'até 60 lascas por parede', pecas);
conferir(Math.abs(nascimento(1) - PAREDE.ESPACO / PAREDE.VEL) < 1e-9, 'uma coluna nasce a cada espaço de viagem (a laje sai dela)', +nascimento(1).toFixed(2));
const s = segura();
conferir(s > 5 && s < 8, `ela segura na parede ~${s.toFixed(1)} s (até a última coluna passar do lado da nave)`, +s.toFixed(2));
const total = nascimento(PAREDE.COLUNAS - 1) + (PAREDE.X0 + 10) / PAREDE.VEL;
conferir(total < 10, `a laje inteira sai pela esquerda em ~${total.toFixed(1)} s`, +total.toFixed(1));

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
process.exit(falhas.length ? 1 : 0);
