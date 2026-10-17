// 15/10 — THE SPHINCTER'S ROOTS, BY HAND (polish block B; he: "raízes como as do pé do Tubo, para deixar claro que
// ele vive no tecido/colado no tecido").
//
// Two pieces, both drawn for the FLOOR (the wall's surface line at row SUP; the game flips them on the ceiling):
//   raiz       — the creature's own roots: a fleshy LIP over the line where its body disappears behind the border
//                (it crosses the surface over ~62px), and roots digging DOWN into the border, sideways only a little —
//                the piece must stay on the first plate of chamber D (the pillar on the left, a step on the right).
//   trepadeira — the same tissue grown over the END of the junction pillar (the stone/metal pillar that stood alone,
//                polish item 4): a mat over its end, tendrils draping down its face and a few reaching right, toward
//                the creature's roots, so the pillar and the creature read as ONE threshold.
// Colours: the creature's body ramp (sampled: its outline 16,16,32, teal 24,48,64 — the SAME teal as the border D
// tiles) and its violet veins, fading at the root tips into the border's darks, so they read as grown in, not set down.
// Deterministic (seeded). Writes the candidates into <out dir>:
//   node scripts/_polimento/_raizes-esfincter.mjs <out dir>
import fs from 'node:fs';
import { Grade, gavinha, labio, prng } from './_raizes-lib.mjs';

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

// ⚠️ DARK, NOT TEAL. The 1st take used the body's teal — and the body's teal IS the border D tile (24,48,64): in the
// game the roots vanished into the wall, and the lit rim read as a pale SHELF. What already reads on these walls is
// the pillar's red cracks: dark lines with a glow inside. So the roots are the creature's dark violet (its shadow
// side) with its magenta running in the veins — the colour of its mouth, pumping into the wall.
const C = {
  k: [14, 8, 22], // outline
  b: [32, 18, 42], // body
  B: [50, 28, 60], // body, the side facing the corridor
  h: [72, 40, 84], // a lump catching light (sparse)
  v: [110, 44, 112], // vein
  V: [186, 74, 170], // vein lit (the mouth's magenta)
  m: [22, 14, 34], // sinking into the wall
  f: [12, 10, 24], // the wall's dark
};

async function raiz(nome, seed, { gavinhas = 9, grossura = 3.4, veias = true } = {}) {
  // Anchor column AX = the creature's centre: −40 … +47 (the pillar's flank is at −40.5 with the creature at +80).
  const W = 88, H = 28, SUP = 7, AX = 40;
  for (const [lado, s] of [['chao', seed], ['teto', seed + 101]]) {
    const rnd = prng(s);
    const G = new Grade(W, H, C);
    labio(G, rnd, AX - 36, AX + 36, SUP, 6, 4, veias);
    // A FAN, not a comb: evenly spaced roots all digging straight down read in the game as the teeth of a comb. They
    // leave from the middle of the lip and open outwards; the outer ones are the longest and bend to hug the wall.
    for (let i = 0; i < gavinhas; i++) {
      const u = (i + 0.5) / gavinhas;
      const fora = (u - 0.5) * 2;
      const x = AX + fora * 26 + (rnd() - 0.5) * 4;
      const ang = Math.PI / 2 - fora * (1.0 + rnd() * 0.45);
      const len = 10 + Math.abs(fora) * 12 + rnd() * 8;
      gavinha(G, rnd, x, SUP + 2, ang, len, grossura * (0.8 + rnd() * 0.4), {
        veia: veias && rnd() < 0.6, galho: 0.3, puxa: fora * 0.03, curva: 0.16,
      });
    }
    G.contorno((x, y) => y >= SUP - 7);
    await G.png(`${OUT}/raiz-${nome}-${lado}.png`, lado === 'teto');
  }
}

async function trepadeira(nome, seed, { pendentes = 6, ponte = 3 } = {}) {
  // Anchor column AX = the pillar's centre (it is 75px wide at its 0.8 scale: −37.6 … +37.6). The pillar's END is row
  // SUP; on the right the chamber D surface sits ~18px further in (the pillar sticks out past the thinner wall).
  const W = 104, H = 34, SUP = 4, AX = 48;
  for (const [lado, s] of [['chao', seed], ['teto', seed + 101]]) {
    const rnd = prng(s);
    const G = new Grade(W, H, C);
    // The mat over the pillar's end — not across all of it: the stone still shows on the left.
    labio(G, rnd, AX - 18, AX + 37, SUP, 3, 2);
    // Draping down the pillar's face (straight down, a little sway).
    for (let i = 0; i < pendentes; i++) {
      const x = AX - 14 + ((i + 0.5) / pendentes) * 48 + (rnd() - 0.5) * 5;
      gavinha(G, rnd, x, SUP + 1, Math.PI / 2 + (rnd() - 0.5) * 0.3, 8 + rnd() * 16, 2.6 + rnd() * 1, { afunda: 0.75, curva: 0.08 });
    }
    // The bridge: off the pillar's right flank, down the 18px drop and along to where the creature's roots start.
    for (let i = 0; i < ponte; i++) {
      // Steep first (down the pillar's flank), then bending flat along the wall: a straight diagonal read as a ROD.
      gavinha(G, rnd, AX + 35 + rnd() * 3, SUP + 1 + i * 2, 1.3 + rnd() * 0.2, 22 + rnd() * 8, 3.4 - i * 0.5, { afunda: 0.8, veia: i === 0, curva: 0.1, puxa: -0.045 });
    }
    G.contorno((x, y) => y >= SUP - 4);
    await G.png(`${OUT}/trepadeira-${nome}-${lado}.png`, lado === 'teto');
  }
}

// The candidates: A = few thick roots, B = more and thinner, C = A's shape with no veins (only the dark body).
await raiz('A', 11, { gavinhas: 6, grossura: 5.5 });
await raiz('B', 23, { gavinhas: 8, grossura: 4.5 });
await raiz('C', 37, { gavinhas: 6, grossura: 5.5, veias: false });
await trepadeira('A', 5, { pendentes: 5, ponte: 3 });
await trepadeira('B', 19, { pendentes: 8, ponte: 2 });
console.log('ok', OUT);
