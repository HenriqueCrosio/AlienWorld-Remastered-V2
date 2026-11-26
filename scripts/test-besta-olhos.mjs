// THE EYES IN THE DARK, the pure rules (25/11, the Beast's step 7 — spec 2026-11-24 §4.3, his "A"): three lights only in
// front of the ship, one true per figure, alternating wall / ceiling; the true one pulses with the heart and the
// embers never peak with it; two beats in ~1.6 s; the leap goes through where the ship was at the last beat.
//   node --experimental-transform-types scripts/test-besta-olhos.mjs
import { OLHOS, luzes, pulsoDa, batidas, salto } from '../src/entities/besta/olhos.ts';

const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${ok ? '' : ` → ${JSON.stringify(info)}`}`);
  if (!ok) falhas.push(nome);
};
const A = {
  escala: 0.7, largura: 384, chaoApoio: 190, garraCrava: 19, garraTetoY: 3 - 128,
  coreParede: [196.3, 159.8], coreTeto: [101.8, 114.1], coreVoo: [110.1, 136.8], coreLado: [116.6, 169.7],
};
const quase = (a, b, t = 0.5) => Math.abs(a - b) <= t;

const lados = [];
for (let n = 0; n < 6; n++) {
  const L = luzes(n, A);
  conferir(L.length === 3 && L.filter((l) => l.verdadeira).length === 1, `figura ${n}: três luzes, uma verdadeira`, L);
  conferir(L.every((l) => l.x >= A.largura * 0.45 && l.x <= A.largura && l.y >= 10 && l.y <= 200), `figura ${n}: todas na frente da nave (x ≥ 45% da sala) e na tela`, L.map((l) => [Math.round(l.x), Math.round(l.y)]));
  conferir(L.every((l) => l.borda === 'paredeD' || l.borda === 'teto'), `figura ${n}: só parede da direita e teto`, L.map((l) => l.borda));
  // no two lights on top of each other
  let perto = Infinity;
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) perto = Math.min(perto, Math.hypot(L[i].x - L[j].x, L[i].y - L[j].y));
  conferir(perto >= 40, `figura ${n}: as luzes a ≥ 40 px uma da outra`, perto);
  lados.push(L.find((l) => l.verdadeira).borda);
  // the rhythm: the true one peaks at its beats; the embers are low there, and they do pulse
  const V = L.find((l) => l.verdadeira);
  const B = batidas();
  conferir(B.every((t) => pulsoDa(V, t) > 0.99), `figura ${n}: a verdadeira acende em cada batimento`, B.map((t) => pulsoDa(V, t)));
  const falsas = L.filter((l) => !l.verdadeira);
  const naBatida = Math.max(...falsas.flatMap((f) => B.map((t) => pulsoDa(f, t))));
  conferir(naBatida < 0.35, `figura ${n}: as brasas ficam apagadas nos batimentos (fora do ritmo)`, naBatida);
  const pico = Math.min(...falsas.map((f) => Math.max(...Array.from({ length: 200 }, (_, i) => pulsoDa(f, (i / 200) * (B.at(-1) + OLHOS.ATRASO_S))))));
  conferir(pico > 0.6, `figura ${n}: as brasas também pulsam (iscas)`, pico);
}
conferir(lados.slice(0, 3).join() === 'paredeD,teto,paredeD', 'a verdadeira alterna parede / teto / parede', lados);
conferir(OLHOS.BATIDAS === 6 && quase(batidas().at(-1) + OLHOS.ATRASO_S, 7.35, 0.3), 'seis batimentos lentos e o aviso: ~7,4 s até o salto (26/11; era ~3,9)', batidas());

// the leaps
for (const nave of [{ x: 60, y: 60 }, { x: 90, y: 170 }, { x: 140, y: 110 }]) {
  const parede = luzes(0, A).find((l) => l.verdadeira);
  const s = salto(parede, nave, A);
  const yNaLinha = s.de.y + ((s.ate.y - s.de.y) * (nave.x - s.de.x)) / (s.ate.x - s.de.x);
  conferir(quase(yNaLinha, nave.y, 1), `da parede: a linha passa onde a nave estava (${nave.x},${nave.y})`, yNaLinha);
  conferir(s.fim.x < -40, 'da parede: sai inteira pela borda da esquerda (não fica atrás da nave)', s.fim);
  const v = Math.hypot(s.ate.x - s.de.x, s.ate.y - s.de.y) / (s.ms / 1000);
  conferir(quase(v, OLHOS.VEL, 1), `da parede: a ${OLHOS.VEL} px/s`, v);
  const teto = luzes(1, A).find((l) => l.verdadeira);
  const t = salto(teto, nave, A);
  conferir(quase(t.ate.x, nave.x, 1) && t.fim.y > 90, `do teto: cai na coluna da nave (${nave.x})`, t.ate);
  conferir(t.inicio.x === t.fim.x, 'do teto: a queda é reta (o corpo nunca desliza pendurado)', [t.inicio, t.fim]);
  conferir(t.deslize && quase(t.deslize.de, teto.x) && quase(t.deslize.ate, t.de.x), 'do teto: antes, os olhos correm pelo teto da luz até a coluna', t.deslize);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
process.exit(falhas.length ? 1 : 0);
