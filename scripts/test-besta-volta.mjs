// THE RETURN, the pure route (25/11, the Beast's step 6 — spec 2026-11-24 §4.2): half a loop IN FRONT of the ship
// (his call: no left wall), the claws always on the border of the leg, the two right corners in order, the core exposed
// the whole way, the ceiling crossed hand over hand ending on hand 1 at the corner anchor.
//   node --experimental-transform-types scripts/test-besta-volta.mjs
import { VOLTA, rotaDaVolta, duracao, fimDoTeto } from '../src/entities/besta/volta.ts';

const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${ok ? '' : ` → ${JSON.stringify(info)}`}`);
  if (!ok) falhas.push(nome);
};
const A = { escala: 0.7, largura: 384, chaoApoio: 190, garraCrava: 19, garraTetoY: 3 - 128, rasgoX: 192, galopeVel: 300, agarraMs: 850, passoA: 48, passoB: 64 };
const e = A.escala;
const yChao = A.chaoApoio - 124 * e;
const yTeto = A.garraCrava - A.garraTetoY * e;
const quase = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

for (const x0 of [300, 238]) {
  const r = rotaDaVolta(x0, A);
  conferir(quase(r[0].de.x, x0) && quase(r[0].de.y, yChao), `x0=${x0}: começa no chão onde está`, r[0].de);
  const ult = r.at(-1);
  conferir(quase(ult.ate.x, A.rasgoX) && quase(ult.ate.y, yChao) && ult.borda === 'chao', `x0=${x0}: termina no chão, no meio (o rasgo)`, ult.ate);

  // the borders in order, each once
  const seq = r.map((t) => t.borda).filter((b, i, a) => b !== a[i - 1]);
  conferir(seq.join() === 'teto,paredeD,chao', 'a ordem: teto → parede D → chão (nunca a parede da esquerda)', seq);
  conferir(r.filter((t) => t.canto).length === 0 && r.filter((t) => t.parede).length === 1, 'nenhum golpe de canto (atacavam o ar); a parede lenta, uma vez, no meio da parede da direita', r.filter((t) => t.canto || t.parede).map((t) => t.nome));
  const pd = r.find((t) => t.parede);
  // (the wall pose high on the wall = yTeto − QW_ALTO_DY; low = the floor's)
  const yAlto = yTeto - VOLTA.QW_ALTO_DY * e;
  conferir(pd && Math.abs(pd.de.y - (yAlto + yChao) / 2) < 1 && pd.de.y - yAlto > 15 && yChao - pd.de.y > 15, 'a parede lenta sai do MEIO da parede, não de um canto', { y: pd?.de.y, alto: yAlto, chao: yChao });
  conferir(r.every((t) => t.exposta), 'o core exposto a volta inteira', r.filter((t) => !t.exposta).map((t) => t.nome));
  conferir(r[0].clipe === 'agarra' && quase(r[0].ate.y, yTeto), 'começa agarrando o teto', r[0]);

  // the claws on the border of each leg, at both ends
  for (const t of r) {
    for (const [nome, q] of [['de', t.de], ['ate', t.ate]]) {
      let ok = true;
      const parede = t.clipe === 'escalada' ? (t.espelho ? -VOLTA.ESCALADA_DX : VOLTA.ESCALADA_DX) * e : 0;
      if (t.borda === 'paredeD' && ['canto', 'escalada', 'parede-descola'].includes(t.clipe)) ok = quase(q.x - parede + (VOLTA.DESCOLA_GARRA_X - 128) * e, A.largura);
      if (t.nome.startsWith('troca')) ok = quase(q.y + A.garraTetoY * e, A.garraCrava);
      if (t.borda === 'chao' && !t.parado) ok = quase(q.y, yChao);
      if (t.clipe === 'agarra' && nome === 'de') ok = quase(q.y, yChao);
      if (!ok) conferir(false, `as garras na borda: ${t.nome} (${nome})`, q);
    }
  }
  conferir(true, 'as garras sempre na borda do trecho');
  // the top-right corner ends ON the wall; the top-left one starts from the wall pose high
  const qcd = r.find((t) => t.nome === 'quina CD');
  conferir(quase(qcd.ate.x + (VOLTA.DESCOLA_GARRA_X - 128) * e, A.largura), 'a quina CD termina na parede da direita', qcd.ate);
  // the ceiling: swaps alternate a/b, end on hand 1, each moves by its painted step
  const trocas = r.filter((t) => t.nome.startsWith('troca'));
  conferir(trocas.length === VOLTA.TROCAS && trocas.at(-1).mao === 1 && quase(trocas.at(-1).ate.x, VOLTA.TETO_FIM_X), `o teto: ${VOLTA.TROCAS} trocas, termina na mão 1 na âncora do canto`, trocas.map((t) => [t.mao, t.ate.x]));
  conferir(trocas.every((t, i) => t.clipe === (i % 2 ? 'teto-anda-a' : 'teto-anda-b') && t.reverso), 'as trocas alternam b e a, tocadas ao contrário (para a direita)', trocas.map((t) => t.clipe));
  conferir(trocas.every((t) => quase(t.ate.x - t.de.x, (t.clipe === 'teto-anda-a' ? A.passoA : A.passoB) * e)), 'cada troca leva o passo pintado', trocas.map((t) => t.ate.x - t.de.x));
  // the turn on the ceiling keeps the holding claw where it was
  const ultTroca = trocas.at(-1);
  const garraAntes = ultTroca.ate.x + (VOLTA.TETO1_GARRA_X - 128) * e;
  const garraDepois = qcd.de.x + (255 - VOLTA.TETO1_GARRA_X - 128) * e;
  conferir(quase(garraAntes, garraDepois), 'a virada no teto: a garra fica onde segura', [garraAntes, garraDepois]);
  conferir(r.every((t) => t.de.x >= A.largura / 2 - 60 || t.borda === 'chao'), 'fica na metade da frente (nunca atrás da nave)', r.filter((t) => t.de.x < A.largura / 2 - 60).map((t) => t.nome));
  conferir(r.every((t) => t.de.x >= 0 && t.de.x <= A.largura && t.ate.x >= 0 && t.ate.x <= A.largura), 'nunca sai da tela', null);
  console.log(`   x0=${x0}: ${r.length} trechos, ${(duracao(r) / 1000).toFixed(2)} s até o rasgo`);
}

// ── already hanging: whole swaps to the right, ending on hand 1 nearest the corner anchor ──
{
  const ciclo = (A.passoA + A.passoB) * e;
  const casos = [[322, 1], [210, 2], [210, 1], [150, 2]].map(([x, m]) => [x, m, fimDoTeto(x, m, A)]);
  const inteiro = casos.every(([x, m, f]) => { const d = f - (m === 1 ? x : x + A.passoA * e); return Math.abs(d / ciclo - Math.round(d / ciclo)) < 1e-6 && d >= -1e-6; });
  conferir(inteiro, 'do teto: só trocas inteiras para a direita, termina na mão 1', casos);
  conferir(quase(fimDoTeto(322, 1, A), 322) && quase(fimDoTeto(210, 2, A), 322), 'das âncoras do teto, chega na âncora do canto (322)', casos);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
process.exit(falhas.length ? 1 : 0);
