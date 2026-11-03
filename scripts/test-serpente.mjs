// The serpent's fight, the pure part (`src/entities/numerosSerpente.ts`). S1 (28/10) and S1b (29/10, "she lives in the
// hull"): in the breach the live head is on screen and above the crest at every post; hidden, she is below the screen;
// the world's brake stops the breach at her post; the heartbeat stays within 0..1 and beats faster when asked.
// 02/11 (the skills installed): the charge is gone — its numbers too.
// 03/11 (his choices at the 2nd pause): she is FIXED on the low post (no post changes, no breathing slide); the whole
// body takes damage and the head about to fall is worth more, not double; each form's life doubles (provisional).
//   node scripts/test-serpente.mjs
import { LUTA, FORMAS, romboY, escondidaRombo, pulso, freadaDe, golpeMax } from '../src/entities/numerosSerpente.ts';

let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };

for (const [nome, f] of Object.entries(FORMAS)) {
  // in the breach she shows whole: the live head on screen and clear of the boss bar, above the crest; hidden below the screen
  const cy = romboY() + f.cabeca.y * f.escala;
  ok(cy > 22 && cy < LUTA.crista - 10, `${nome}: no rombo, no posto, a cabeça viva em y ${cy.toFixed(0)}`);
  ok(escondidaRombo(f) - (f.altura / 2) * f.escala > 216, `${nome}: escondida no rombo, abaixo da tela`);
}
ok(!('investida' in LUTA) && !('chuva' in LUTA), 'a investida saiu dos números (e a chuva tripla: a chuva nova é a de casulos, em numerosHab)');
ok(romboY() === 142, 'o posto é o das maquetes (y 142): as habilidades tocam nele');
ok(!('trocaPosto' in LUTA) && !('postosRombo' in LUTA), 'um posto só: sem troca de altura (ele: "movimento muito irreal")');
ok(LUTA.cabecaVale > 1 && LUTA.cabecaVale < 2, `a cabeça que vai cair vale mais, mas não o dobro (${LUTA.cabecaVale}×)`);
ok(LUTA.vida.A === 100 && LUTA.vida.B === 100 && LUTA.vida.C === 100 && LUTA.vida.fusao === 120, 'a vida de cada forma dobrou (o corpo inteiro leva dano)');
ok(golpeMax(LUTA.vida.A) >= 12, 'a bomba (12) cabe no teto por golpe de uma forma');
// the brake: from the full scroll, the distance it takes is where the breach must be when it starts
{
  const v = 84;
  const d = freadaDe(v);
  let x = LUTA.rombo.x + d, vel = v, t = 0;
  while (vel > 0 && t < 10) { const dt = 1 / 60; vel = Math.max(0, vel - LUTA.freada * dt); x -= vel * dt; t += dt; }
  ok(Math.abs(x - LUTA.rombo.x) < 2 && t > 2 && t < 4.5, `a freada para o rombo no posto (${x.toFixed(1)} em ${t.toFixed(2)} s)`);
}
const a = [...Array(200)].map((_, i) => pulso(i / 200, 1));
ok(a.every((v) => v >= 0 && v <= 1) && Math.max(...a) > 0.9 && Math.min(...a) < 0.1, 'o pulso vai de ~0 a ~1');
ok(pulso(0.3, 2.5) !== pulso(0.3, 1), 'o pulso acelera');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
