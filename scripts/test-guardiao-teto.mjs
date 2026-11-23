// THE BLEEDING CEILING, the pure rules (23/11, step 5 — spec 2026-11-22 §7): the timeline, the points, the swelling,
// the drops' schedule.
//   node --experimental-transform-types scripts/test-guardiao-teto.mjs
import { TETO, PONTOS_A, PONTOS_B, TetoQueSangra } from '../src/entities/guardiao/tetoSangra.ts';

const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${ok ? '' : ` → ${JSON.stringify(info)}`}`);
  if (!ok) falhas.push(nome);
};
const DT = 1 / 60;
const NAVE_W = 21;

// ── the figure ──
{
  const todos = [...PONTOS_A, ...PONTOS_B];
  conferir(PONTOS_A.length >= 4 && PONTOS_A.length <= 6 && PONTOS_B.length >= 4 && PONTOS_B.length <= 6, '4–6 pontos por onda', { A: PONTOS_A.length, B: PONTOS_B.length });
  conferir(todos.every((x) => x > 0 && x <= 384 * (2 / 3)), 'sobre os 2/3 da esquerda', todos);
  conferir(PONTOS_A.every((a) => !PONTOS_B.includes(a)), 'as duas ondas nunca caem no mesmo x (nunca se sobrepõem)', null);
  // each B point sits in the middle of a gap of A (or past the last A, the same step away)
  const passo = PONTOS_A[1] - PONTOS_A[0];
  conferir(PONTOS_B.every((b) => PONTOS_A.some((a) => Math.abs(b - a - passo / 2) < 1e-9)), 'B no meio de cada vão de A', { passo });
  // inside ONE wave the lane between two columns fits the ship with room
  const vao = passo - 2 * TETO.RAIO - NAVE_W;
  conferir(vao >= 30, `numa onda, o vão entre duas colunas cabe a nave com folga (${vao} px)`, vao);
}

// ── the timeline ──
{
  const s = new TetoQueSangra();
  const fases = [];
  const quedas = [];
  let maxInchaco = 0;
  for (let i = 0; i < 60 * 6 && !s.acabou; i++) {
    s.passo(DT);
    if (fases[fases.length - 1] !== s.fase) fases.push(s.fase);
    for (const q of s.quedas) quedas.push({ ...q, t: s.t });
    for (let x = 0; x < 384; x++) maxInchaco = Math.max(maxInchaco, s.deslocar(x, 30, 185).teto);
  }
  conferir(fases.join('>') === 'sobe>espalha>sangra>fim', 'as fases: sobe → espalha → sangra → fim', fases);
  const A = quedas.filter((q) => q.onda === 0), B = quedas.filter((q) => q.onda === 1);
  conferir(A.length === PONTOS_A.length * TETO.GOTAS && B.length === PONTOS_B.length * TETO.GOTAS, `${TETO.GOTAS} gotas por ponto (a coluna)`, { A: A.length, B: B.length });
  const tA = Math.min(...A.map((q) => q.t)), tB = Math.min(...B.map((q) => q.t));
  conferir(Math.abs(tB - tA - 0.7) < 2 * DT, 'a 2ª onda cai 0,7 s depois da 1ª', tB - tA);
  conferir(Math.abs(tA - TETO.SOBE - TETO.ESPALHA - TETO.INCHA_A) < 2 * DT, 'a 1ª onda incha e acende ~0,8 s antes de soltar', tA);
  conferir(Number.isInteger(maxInchaco) && maxInchaco === TETO.ALTURA, 'o ponto incha um número inteiro de px', maxInchaco);
  // the ceiling only ever moves DOWN (teto), never the floor
  const so = new TetoQueSangra();
  let chao = 0;
  for (let i = 0; i < 60 * 4; i++) { so.passo(DT); for (let x = 0; x < 384; x += 4) chao = Math.max(chao, so.deslocar(x, 30, 185).chao); }
  conferir(chao === 0, 'só o teto incha', chao);
}

// ── fairness: a swap window at every height ──
{
  // a ship standing under a B point must leave before B's first drop reaches its height, and can only step into A's
  // column after A's last drop passed it: the window is the same at every height (both fall from the same line)
  const y0 = 36;
  let pior = Infinity;
  // from y 60 down: above it the ship is under the swollen points themselves (they bite), not in the columns' lanes
  for (let y = 60; y <= 200; y += 4) {
    const passaA = TetoQueSangra.ultima(0) + TetoQueSangra.queda(y0, y + 4.5 + TETO.RAIO);
    const chegaB = TetoQueSangra.solta(1) + TetoQueSangra.queda(y0, y - 4.5 - TETO.RAIO);
    pior = Math.min(pior, chegaB - passaA);
  }
  const anda = (PONTOS_A[1] - PONTOS_A[0]) / 2 / 110;
  conferir(pior >= anda + 0.04, `a troca de coluna cabe em toda altura (janela ${pior.toFixed(2)} s, a nave anda 32 px em ${anda.toFixed(2)} s)`, { pior, anda });
}

// ── the pulse and the hanging drops ──
{
  const s = new TetoQueSangra();
  let subiu = false, correu = false, voltou = false, ultimaFrente = Infinity, esticou = 0, luzComFio = 0;
  for (let i = 0; i < 60 * 4; i++) {
    s.passo(DT);
    if (s.pulsoCabos !== null) subiu = true;
    const f = s.frente;
    if (f !== null) { correu = true; if (f > ultimaFrente + 1e-9) voltou = true; ultimaFrente = f; }
    for (const p of s.penduradas()) esticou = Math.max(esticou, p.k);
    for (let x = 0; x < 384; x++) if (s.luzTeto(x) && s.deslocar(x, 30, 185).teto > 0) luzComFio++;
  }
  conferir(subiu && correu && !voltou, 'o pulso sobe pelos cabos e corre a borda da direita para a esquerda', { subiu, correu, voltou });
  conferir(esticou > 0.9, 'a gota estica pendurada antes de soltar', esticou);
  conferir(luzComFio === 0, 'o pulso (luz que não morde) nunca está onde um ponto inchou: as duas luzes não se confundem', luzComFio);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
