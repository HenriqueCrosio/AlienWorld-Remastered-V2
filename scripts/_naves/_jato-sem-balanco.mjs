// 26/10 — and now WITHOUT THE BLINK: the body is frame 0 in all nine frames, only the flame animates (see `parados`).
// 25/10 (night) — THE JATO WITHOUT THE BOB. Its 9 approved frames (the S-foils flapping) also bobbed the whole ship
// 2 px up and down; he: "não faz sentido deixar uma movimentação de flutuando em naves que voam no espaço ... retirar
// ou diminuir de todas as naves". The wings keep flapping; only the bob goes:
//   - from the approved frames WITHOUT the flame (`folhas/2026-10-04/exaustao/original/`), each frame is moved so its
//     rigid nose (columns 30–40) sits on the rows of frame 0 (the bob was 0,0,−1,−1,−2,−2,−1,0,0);
//   - the flame is drawn again exactly as `scripts/_exaustao-jato.mjs` size B (the one he approved on 04/10), on the
//     fixed rows 10–13 — now the nozzle stays on them in every frame (before, it drifted 2 px off the flame);
//   - the blue thrust (Propulsores) as `scripts/_jato-azul.mjs` does it (rows 10–13, x < 14, fire colours → the ramp).
// Writes public/sprites/ship-jato-anim-0..8.png and ship-jato-azul-anim-0..8.png. The bone paint comes after:
//   node scripts/_naves/_jato-sem-balanco.mjs && node scripts/_naves/_pintar-jato.mjs public/sprites/naves osso --nome=jato-osso
import sharp from 'sharp';

const ORIGINAL = 'docs/superpowers/folhas/2026-10-04/exaustao/original';
const JOGO = 'public/sprites';
const N = 9;

// ─── the flame, size B of `_exaustao-jato.mjs` (copied: that script runs on import) ───
const COR = { branco: 'fffe0b', claro: 'ffd60a', amarelo: 'ffac0c', vermelho: 'fe0101', brasa: 'b2321e' };
const BOCAL = 8;
const B = { L: [7, 6, 8, 7, 6, 7, 8, 6, 7], borda: 3 };
function chama(i) {
  const px = {};
  const L = B.L[i % B.L.length];
  for (const y of [11, 12]) {
    const comp = y === (i % 2 ? 11 : 12) ? L : L - 1;
    for (let d = 0; d < comp; d++) {
      const x = BOCAL - d;
      if (x < 0) continue;
      px[`${x},${y}`] = d <= 0 ? COR.branco : d <= 1 ? COR.claro : d <= 3 ? COR.amarelo : d < comp - 1 ? COR.vermelho : COR.brasa;
    }
  }
  for (const y of [10, 13]) for (let d = 0; d < B.borda; d++) px[`${BOCAL - d},${y}`] = d === B.borda - 1 ? COR.brasa : COR.vermelho;
  return px;
}

// ─── the blue thrust of `_jato-azul.mjs` ───
const RAMPA = [[90, '041ef7'], [130, '0378fa'], [165, '0399fa'], [195, '09cefa'], [225, '08ecfc'], [245, 'e2feff'], [256, 'fafcfc']];
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const ehFogo = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return (max >= 235 && (max - min) / max >= 0.6) || (min >= 200 && max >= 245);
};

// The top row of the nose (columns 30–40) of a frame.
const topoDoNariz = (data, w, h) => {
  for (let y = 0; y < h; y++) for (let x = 30; x <= 40; x++) if (data[(y * w + x) * 4 + 3] > 40) return y;
  return -1;
};

const quadros = [];
for (let i = 0; i < N; i++) quadros.push(await sharp(`${ORIGINAL}/ship-jato-anim-${i}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
const { width: W, height: H } = quadros[0].info;
const base = topoDoNariz(quadros[0].data, W, H);
const deslocamentos = [];

// Every frame held on the rows of frame 0.
const estabilizados = quadros.map(({ data }) => {
  const dy = base - topoDoNariz(data, W, H); // how far down this frame must go
  deslocamentos.push(dy);
  const o = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sy = y - dy;
    if (sy < 0 || sy >= H) continue;
    data.copy(o, (y * W + x) * 4, (sy * W + x) * 4, (sy * W + x) * 4 + 4);
  }
  return o;
});
// 26/10 — ONLY THE FLAME MOVES (he: "na nave x-aelo uma das animações faz com que a ponta das asas pisque, quero que
// tire essa piscada (mesmo que seja para gerar nova animação) e deixe apenas o fogo do motor"). Frames 2, 3 and 5 lit
// the wing tips yellow (the fake "jet" lights of before 04/10, blinking with the S-foils). Now every frame is the body
// of frame 0 — clean, no lit tip — and only the flame B below changes, as in the "a".
const parados = estabilizados.map(() => Buffer.from(estabilizados[0]));
// Where the flame may go: the rule of 04/10 (an empty pixel, or the fake "jet" light that blinked) — in this frame OR
// in frame 0. Without the bob, the tip of the upper wing comes down over the flame in frames 4–5; the flame of frame 0
// is the approved one, so what was free there stays free (else the flame thins to 1 px every cycle).
const livre = (o, p) => {
  const [r, g, b, a] = o.subarray(p, p + 4);
  return !a || (Math.max(r, g, b) >= 235 && (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b) >= 0.6);
};

const livre0 = Array.from({ length: W * H }, (_, s) => livre(parados[0], s * 4)); // before frame 0 gets its flame

for (let i = 0; i < N; i++) {
  const o = parados[i];
  for (const [k, hex] of Object.entries(chama(i))) {
    const [x, y] = k.split(',').map(Number);
    const p = (y * W + x) * 4;
    if (!livre(o, p) && !livre0[p / 4]) continue;
    o[p] = parseInt(hex.slice(0, 2), 16); o[p + 1] = parseInt(hex.slice(2, 4), 16); o[p + 2] = parseInt(hex.slice(4, 6), 16); o[p + 3] = 255;
  }
  await sharp(o, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${JOGO}/ship-jato-anim-${i}.png`);
  // The blue one.
  for (let y = 10; y <= 13; y++) for (let x = 0; x < 14; x++) {
    const k = (y * W + x) * 4;
    if (!o[k + 3] || !ehFogo(o[k], o[k + 1], o[k + 2])) continue;
    const hex = RAMPA.find(([teto]) => lum(o[k], o[k + 1], o[k + 2]) < teto)[1];
    o[k] = parseInt(hex.slice(0, 2), 16); o[k + 1] = parseInt(hex.slice(2, 4), 16); o[k + 2] = parseInt(hex.slice(4, 6), 16);
  }
  await sharp(o, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${JOGO}/ship-jato-azul-anim-${i}.png`);
}
// Nothing of the ship may have been pushed off the bottom: every frame's lowest opaque row + its shift stays inside.
for (let i = 0; i < N; i++) {
  const { data } = quadros[i];
  let fundo = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > 40) fundo = y;
  if (fundo + deslocamentos[i] >= H) throw new Error(`frame ${i} loses its bottom row`);
}
console.log('jato: 9 + 9 azul, bob removed — shifts per frame', deslocamentos.join(','));
