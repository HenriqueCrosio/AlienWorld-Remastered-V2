// THE SQUEEZE, the pure rules (23/11, step 4 — spec 2026-11-22 §7): the ring's profile, the phases, the push.
//   node --experimental-transform-types scripts/test-guardiao-aperto.mjs
import { APERTO, VAOS_Y, Aperto, anel, deslocamentos, empurrar } from '../src/entities/guardiao/aperto.ts';

const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${ok ? '' : ` → ${JSON.stringify(info)}`}`);
  if (!ok) falhas.push(nome);
};
const DT = 1 / 60;
// the arena's surfaces drift a couple of px with the plates (measured: 29–31 and 183–187)
const tetoEm = (x) => 29 + ((x >> 5) % 3);
const chaoEm = (x) => 183 + ((x >> 6) % 5);

// ── the profile ──
conferir(anel(100, 100) === 1 && anel(100 + APERTO.MEIA, 100) === 0 && anel(100 - APERTO.MEIA, 100) === 0, 'o anel: 1 no centro, 0 nas pontas', null);
{
  let menor = Infinity, inteiro = true, onde = null;
  for (const vaoY of VAOS_Y)
    for (let xc = -60; xc <= 420; xc += 3)
      for (let amp = 0; amp <= 1.0001; amp += 0.05)
        for (let x = 0; x < 384; x++) {
          const d = deslocamentos(x, tetoEm(x), chaoEm(x), xc, amp, vaoY);
          if (!Number.isInteger(d.teto) || !Number.isInteger(d.chao)) inteiro = false;
          const vao = chaoEm(x) - d.chao - (tetoEm(x) + d.teto);
          if (vao < menor) { menor = vao; onde = { vaoY, xc, amp, x }; }
        }
  conferir(menor >= APERTO.VAO, `o vão nunca fecha abaixo de ${APERTO.VAO} px`, { menor, onde });
  conferir(inteiro, 'cada coluna desloca um número INTEIRO de pixels', null);
  // at the peak the walls reach the gap lines (within the 1 px of the floor)
  for (const vaoY of VAOS_Y) {
    const x = 200, d = deslocamentos(x, tetoEm(x), chaoEm(x), x, 1, vaoY);
    const vao = chaoEm(x) - d.chao - (tetoEm(x) + d.teto);
    conferir(vao <= APERTO.VAO + 2 && Math.abs(tetoEm(x) + d.teto + vao / 2 - vaoY) <= 1.5, `no pico o vão é ~${APERTO.VAO} px centrado em y ${vaoY}`, { vao, d });
  }
  conferir(VAOS_Y[0] < 100 && VAOS_Y[1] > 120, 'os dois vãos: A alto, B baixo (a figura fixa que alterna)', VAOS_Y);
}

// ── the phases ──
{
  const a = new Aperto(VAOS_Y[0]);
  const fases = [];
  let t = 0, tCorre = null, tFim = null, xcAntes = a.xc, volta = false, ampNoAviso = 0;
  for (let i = 0; i < 60 * 10 && !a.acabou; i++) {
    a.passo(DT);
    t += DT;
    if (fases[fases.length - 1] !== a.fase) fases.push(a.fase);
    if (a.fase === 'aviso') ampNoAviso = Math.max(ampNoAviso, a.amp);
    if (a.fase === 'corre' && tCorre === null) tCorre = t;
    if (a.fase === 'corre' && a.xc > xcAntes + 1e-9) volta = true;
    xcAntes = a.xc;
    if (a.acabou) tFim = t;
  }
  conferir(fases.join('>') === 'aviso>cresce>corre>fim', 'as fases: aviso → cresce → corre → fim', fases);
  conferir(ampNoAviso === 0, 'no aviso a borda só estremece (o anel não incha)', ampNoAviso);
  conferir(Math.abs(tCorre - APERTO.AVISO - APERTO.CRESCE) < 2 * DT, 'o anel corre depois do aviso e de inchar no lugar', tCorre);
  conferir(Math.abs(tFim - tCorre - APERTO.TRAVESSIA) < 2 * DT, `atravessa a tela em ${APERTO.TRAVESSIA} s`, tFim - tCorre);
  conferir(!volta, 'corre só da direita para a esquerda', null);
  conferir(APERTO.X0 + APERTO.MEIA > 384 - 1 && APERTO.X1 + APERTO.MEIA <= 0, 'nasce na borda da direita e sai inteiro pela esquerda', { X0: APERTO.X0, X1: APERTO.X1 });
  conferir(Aperto.velocidade > 110 * 1.3, 'mais rápido que a nave (110 px/s): não dá para ficar à frente dele, só passar pelo vão', Aperto.velocidade);
}

// ── the push ──
{
  const W = 21, H = 9;
  const vaoY = VAOS_Y[0];
  const xc = 120;
  const parede = (amp) => ({
    teto: (x) => tetoEm(x) + deslocamentos(x, tetoEm(x), chaoEm(x), xc, amp, vaoY).teto,
    chao: (x) => chaoEm(x) - deslocamentos(x, tetoEm(x), chaoEm(x), xc, amp, vaoY).chao,
  });
  const p = parede(1);
  // in the gap: untouched
  const noVao = empurrar({ x: xc, y: vaoY }, W, H, p.teto, p.chao);
  conferir(noVao.x === xc && noVao.y === vaoY, 'no vão: nada encosta', noVao);
  // in the middle of the bottom wall at the ring's center: pushed up, into the gap, straight
  const dentro = empurrar({ x: xc, y: 150 }, W, H, p.teto, p.chao);
  conferir(dentro.y + H / 2 <= p.chao(xc) + 1e-6 && Math.abs(dentro.x - xc) < 1.5, 'dentro da parede: sai para o vão', dentro);
  // on the ring's FRONT flank (left of the center): pushed up AND left, with it
  const flanco = empurrar({ x: xc - 25, y: 160 }, W, H, p.teto, p.chao);
  conferir(flanco.y < 160 && flanco.x < xc - 25, 'no flanco da frente: a parede leva a nave para a esquerda', flanco);
  // away from the ring: untouched
  const longe = empurrar({ x: xc - 80, y: 160 }, W, H, p.teto, p.chao);
  conferir(longe.x === xc - 80 && longe.y === 160, 'longe do anel: nada', longe);
  // the gap fits the ship with room
  conferir(APERTO.VAO >= H + 30, 'o vão cabe a nave com folga', { VAO: APERTO.VAO, H });
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
