// 17/10 — THE DUCT DOOR'S ROOTS, BY HAND (polish block C, item 2b; his suggestion: "você colocou raízes nos tubos…
// enraizou o esfíncter final… mas as portas dos dutos ainda estão sem acabamento, não seria interessante enraizá-las
// também?").
//
// The `porta` (64×112, anchored by its centre) lives BEHIND the duct border (faixa C) and always sinks 14px into it on
// each side: today the border's lit surface line simply cuts across it — a ruler line, no transition. A root piece sits
// IN FRONT of the border (the game would put it at −0.52, like the sphincter's) right on that line, one per side, and
// moves WITH the door (the lesson of the vine: what is fixed to a piece lives with it). It stays after the blast: the
// two stubs of the `portaLasca` keep their roots.
//
// ⚠️ IT MUST NOT INVADE THE PASSAGE. The broken door leaves a 38px slit; its stubs show (gap − 38)/2 = 15–23px of
// door inside the corridor. So everything above the surface line (the lip and the tendrils climbing the door's face)
// stays under 10px, and inside the door's width.
//
// Drawn for the FLOOR (the wall's surface line at row SUP; the ceiling piece is the same drawing flipped). Colours: the
// DUCT, sampled from `f4-porta.png` and `f4-faixa-c.png` — wine-black tissue, red veins, and the door slit's lava
// orange lighting them (the recipe that reads on these walls: a dark line with a glow inside).
//   node scripts/_polimento/_raizes-porta.mjs <out dir>
import fs from 'node:fs';
import { Grade, gavinha, labio, prng } from './_raizes-lib.mjs';

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const C = {
  k: [10, 0, 4], // outline
  b: [40, 8, 16], // body
  B: [64, 12, 22], // body, the side facing the corridor
  h: [96, 24, 32], // a lump catching light (sparse)
  v: [144, 32, 24], // vein
  V: [232, 64, 0], // vein lit (the slit's lava orange)
  m: [24, 0, 4], // sinking into the wall
  f: [8, 0, 4], // the wall's dark
};

/** The piece: W wide, the door's centre at column AX, the surface line at row SUP. */
const W = 100, H = 40, SUP = 10, AX = 50;

/**
 * @param lip      half-width of the lip over the surface line (the door's body is ~27px each side of its centre)
 * @param raizes   roots fanning DOWN into the wall
 * @param sobe     tendrils climbing the door's face (above the line), ≤ 9px
 * @param abraca   the outer roots bend to hug the wall sideways (0 = a fan, 1 = claws along the surface)
 */
// `acesas` (17/10, after the first GIFs): A–C read, but faintly — the root body is nearly the duct border's own dark.
// Every root gets a vein, and the vein runs down 80% of it instead of 55%: the lit line is what reads on this wall.
async function raiz(nome, seed, { lip = 30, alto = 4, raizes = 6, grossura = 4.5, sobe = 0, abraca = 0, veias = true, acesas = false } = {}) {
  for (const [lado, s] of [['chao', seed], ['teto', seed + 101]]) {
    const rnd = prng(s);
    const G = new Grade(W, H, C);
    labio(G, rnd, AX - lip, AX + lip, SUP, alto, 3, veias);
    for (let i = 0; i < raizes; i++) {
      const u = (i + 0.5) / raizes;
      const fora = (u - 0.5) * 2;
      const x = AX + fora * (lip - 6) + (rnd() - 0.5) * 4;
      // A fan opening outwards; with `abraca` the outer ones leave almost flat and run along the wall.
      const ang = Math.PI / 2 - fora * (1.0 + abraca * 0.45 + rnd() * 0.35);
      const len = 9 + Math.abs(fora) * (10 + abraca * 10) + rnd() * 7;
      gavinha(G, rnd, x, SUP + 2, ang, len, grossura * (0.8 + rnd() * 0.4), {
        veia: veias && (rnd() < 0.6 || acesas), afunda: acesas ? 0.8 : 0.55, galho: 0.3, puxa: fora * (0.03 + abraca * 0.03), curva: 0.16,
      });
    }
    // Up the door's face: thin, short, inside its width, never past 9px above the line.
    for (let i = 0; i < sobe; i++) {
      const x = AX - 18 + ((i + 0.5) / sobe) * 36 + (rnd() - 0.5) * 4;
      gavinha(G, rnd, x, SUP - 1, -Math.PI / 2 + (rnd() - 0.5) * 0.5, 4 + rnd() * 5, 2.2 + rnd() * 0.6, { afunda: 1, curva: 0.1 });
    }
    // Nothing above SUP − 9: wipe it, then outline.
    for (let y = 0; y < SUP - 9; y++) for (let x = 0; x < W; x++) G.set(x, y, '.');
    G.contorno((x, y) => y >= SUP - 9);
    // No straight cuts: a root that reaches the canvas edge would end on a ruler line in the game.
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
      if ((x === 0 || x === W - 1 || y === H - 1) && G.get(x, y) !== '.') throw new Error(`raiz ${nome}/${lado} touches the edge at ${x},${y}`);
    }
    await G.png(`${OUT}/raiz-${nome}-${lado}.png`, lado === 'teto');
  }
}

// A = a lip and a fan of thick roots (the sphincter's B, in the duct's colours); B = claws hugging the wall, a thinner
// lip; C = A plus tendrils climbing the door's face (the door grown INTO the tissue, not only sunk in it).
await raiz('A', 11, { lip: 30, raizes: 6, grossura: 5 });
await raiz('B', 23, { lip: 24, alto: 3, raizes: 5, grossura: 4.5, abraca: 1 });
await raiz('C', 37, { lip: 30, raizes: 6, grossura: 5, sobe: 5 });
// D = C with the veins lit down the whole root.
await raiz('D', 37, { lip: 30, raizes: 6, grossura: 5, sobe: 5, acesas: true });
console.log('ok', OUT);
