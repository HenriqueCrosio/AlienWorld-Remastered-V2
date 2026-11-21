// THE ROOM AT BIRTH of the hazards (21/11: an asteroid born on top of another / of the miner's rock).
// From the root: node --experimental-transform-types scripts/test-destrocos-vaga.mjs
import { seEncontram, livre, alturaSorteada, alturaMaisPerto, raioDe, FOLGA } from '../src/systems/vagaDosDestrocos.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
let semente = 11;
const rnd = () => (semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0) / 4294967296;

const X = 424; // GAME_WIDTH + 40
const T = (X + 50) / 84; // the whole crossing
const rocha = { x: X, y: 100, vy: 0, r: raioDe(62, 63) };
const ast = (y, vy = 0, x = X) => ({ x, y, vy, r: raioDe(32, 32) });

// ── the pair ──
conferir(seEncontram(ast(110), rocha, T), 'the asteroid born on the rock (the bug he saw) overlaps', null);
conferir(!seEncontram(ast(100 + rocha.r + ast(0).r + FOLGA + 1), rocha, 0), 'just outside the gap, at rest: clear', null);
conferir(!seEncontram(ast(100, 0, X + 200), rocha, T), 'another column never meets it (same scroll speed)', null);
conferir(seEncontram(ast(160, -10), rocha, T), 'born clear but drifting into the rock: overlaps', null);
conferir(!seEncontram(ast(160, 10), rocha, T), 'born clear and drifting away: clear', null);
conferir(seEncontram(ast(40, 60), ast(140, -60), T), 'two drifting past each other: overlaps (the gap changes sign)', null);

// ── the random height ──
let nuncaEmCima = true;
let nulos = 0;
for (let i = 0; i < 500; i++) {
  const outros = [rocha, ast(60, -3, X + 60)];
  const vy = (rnd() * 2 - 1) * 10;
  const y = alturaSorteada(rnd, [30, 192], { x: X, vy, r: raioDe(32, 32) }, outros, T);
  if (y === null) { nulos++; continue; }
  if (!livre({ x: X, y, vy, r: raioDe(32, 32) }, outros, T)) nuncaEmCima = false;
}
conferir(nuncaEmCima, 'the drawn height is always clear for the whole crossing', null);
conferir(nulos < 100, 'with room in the column, the birth is rarely skipped', nulos);
const cheia = [ast(40), ast(75), ast(110), ast(145), ast(180)];
conferir(alturaSorteada(rnd, [30, 192], { x: X, vy: 0, r: raioDe(32, 32) }, cheia, T) === null, 'a full column skips the birth', null);

// ── the rock steps aside as little as it must ──
conferir(alturaMaisPerto(100, [30, 192], { x: X, vy: 0, r: rocha.r }, [], T) === 100, 'an empty column keeps the script height', null);
const yr = alturaMaisPerto(100, [30, 192], { x: X, vy: 0, r: rocha.r }, [ast(120)], T);
conferir(yr !== null && yr < 100 && livre({ ...rocha, y: yr }, [ast(120)], T), 'an asteroid below: the rock steps up just enough', yr);
conferir(Math.abs(yr - (120 - rocha.r - ast(0).r - FOLGA)) <= 2, 'the step is the minimum one', yr);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo OK');
process.exit(falhas.length ? 1 : 0);
