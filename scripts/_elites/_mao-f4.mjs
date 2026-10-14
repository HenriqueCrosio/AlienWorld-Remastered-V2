// THE F4 HAND-DRAWN PIECES (spec fatia F4 §5), shared by the staged GIF (`_gif-f4.mjs`) and the installer
// (`_instalar-f4.mjs`): the pupa, the fly, the ring shot and the hole. All of them are DRAFTS until he approves them.
import sharp from 'sharp';

/** A tiny sprite drawn by hand: rows of characters, one colour per character. Returns a PNG buffer. */
export const pixel = (linhas, cores) => {
  const w = linhas[0].length, h = linhas.length, buf = Buffer.alloc(w * h * 4);
  linhas.forEach((l, y) => [...l].forEach((c, x) => {
    const cor = cores[c];
    if (cor) buf.set([...cor, 255], (y * w + x) * 4);
  }));
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
};
/** The elites' reds, dark to bright; `w` = the fly's wing. */
export const CORES = { k: [20, 8, 12], d: [92, 22, 30], r: [168, 36, 44], o: [236, 72, 56], y: [255, 168, 96], w: [214, 132, 120] };

/** The PUPA, 7×8: dark, and lit (it pulses between the two). */
export const pupa = () => Promise.all([
  pixel(['..kkk..', '.kdrdk.', 'kdrrrdk', 'kdrorrk', 'kdrrrdk', 'kdrrrdk', '.kdrdk.', '..kkk..'], CORES),
  pixel(['..kkk..', '.krork.', 'kroyork', 'koyyyok', 'kroyork', 'krrorrk', '.krrrk.', '..kkk..'], CORES),
]);

/** The FLY, 9×6, facing LEFT (the lit eye in front): wings up, wings swept back. */
export const mosca = () => Promise.all([
  pixel(['....ww...', '...www...', '.kkkwkk..', 'kyrrrddk.', 'krrrdddk.', '.kkkkkk..'], CORES),
  pixel(['.........', '.........', '.kkkkkwww', 'kyrrrddww', 'krrrdddk.', '.kkkkkk..'], CORES),
]);

/** The RING SHOT, 5×5: round, a lit core in a dark rim (of the family of the other elites' shots). */
export const tiroAnel = () => pixel(['.kkk.', 'krook', 'koyok', 'krook', '.kkk.'], CORES);

export const BW = 32, BH = 28;
/**
 * THE HOLE: a torn mouth in the painting — the palette is sampled from the duct's own red wall (the neighbour), the
 * steps joined by a 2×2 Bayer dither. Returns { abre: 5 buffers (opening), cicatriz: 4 buffers (the scar, losing pixels) }.
 */
export async function buraco(fotoDoDuto) {
  const parede = await sharp(fotoDoDuto).extract({ left: 0, top: 14, width: 384, height: 60 }).raw().toBuffer({ resolveWithObject: true });
  const vermelhos = [];
  for (let i = 0; i < parede.data.length; i += parede.info.channels) {
    const [r, g, b] = [parede.data[i], parede.data[i + 1], parede.data[i + 2]];
    if (r > 36 && r > g * 1.7) vermelhos.push([r, g, b]);
  }
  vermelhos.sort((a, b) => a[0] - b[0]);
  const tom = (p) => vermelhos[Math.floor(p * (vermelhos.length - 1))];
  const PAL = { fundo: [6, 3, 5], breu: tom(0.04).map((c) => c >> 1), garganta: tom(0.12), labio: tom(0.6), luz: tom(0.93) };
  // 14/10 — LAVA CRACKS (he: "a cor do buraco pode ter a rachadura de lava, assim destaca um pouco mais"): on chamber
  // A's teal plate the dark cracks vanished. Hot at the lip, cooling to an ember at the tip; the scar cools as it fades.
  const LAVA = { quente: [255, 196, 92], lava: [240, 112, 36], brasa: [150, 38, 22] };
  const RX = 12, RY = 10;
  const BAYER = [[0, 2], [3, 1]];
  const RACHAS = [[0.35, 7], [1.5, 5], [2.6, 8], [3.7, 6], [4.6, 7], [5.6, 5]]; // [angle, length]
  const borda = (ang) => 1 + 0.13 * Math.sin(3 * ang + 1.3) + 0.08 * Math.sin(7 * ang + 0.4) + 0.05 * Math.sin(11 * ang + 2.1);
  const quadro = (s, resto = 1) => {
    const buf = Buffer.alloc(BW * BH * 4);
    const pinta = (x, y, cor) => {
      if (x < 0 || y < 0 || x >= BW || y >= BH) return;
      if (resto < 1 && (BAYER[y & 1][x & 1] + 0.5) / 4 > resto) return;
      buf.set([...cor, 255], (y * BW + x) * 4);
    };
    const cx = BW / 2, cy = BH / 2;
    // The cracks first: they are what is left when the mouth is shut — and then they are the SCAR, in the lip's red
    // (dark cracks vanish on the dark painting: the scar of the 1st draft, 13/10, could not be seen in game).
    const fechada = s <= 0.02;
    // The lava along a crack, from the lip (u = 0) to the tip (u = 1); shut, it cools with what is left of the scar.
    const corDaLava = (u) => {
      const frio = fechada ? 1 - resto : 0;
      const q = u + frio * 0.6;
      return q < 0.35 ? LAVA.quente : q < 0.75 ? LAVA.lava : LAVA.brasa;
    };
    const vazio = (x, y) => x >= 0 && y >= 0 && x < BW && y < BH && buf[(y * BW + x) * 4 + 3] === 0;
    // The cracks start at `r0` from the centre. Open, they are drawn OVER the lip (from inside it outwards): lava veins
    // splitting the rim — drawn under it, the open mouth covered all but the tips.
    const rachas = (r0, extra) => {
      for (const [ang, comp] of RACHAS) {
        const n = Math.round(comp * (0.5 + 0.5 * Math.min(1, s + 0.5))) + extra;
        for (let k = 0; k < n; k++) {
          const r = r0 + k, quebra = k > 2 ? Math.sin(ang * 5) * 0.25 : 0;
          const x = Math.round(cx + Math.cos(ang + quebra) * r), y = Math.round(cy + Math.sin(ang + quebra) * r * (RY / RX));
          // A dark seam under each lava pixel (one down), only on bare ground: the crack has depth, not a painted line.
          if ((!fechada || resto > 0.5) && vazio(x, y + 1)) pinta(x, y + 1, PAL.breu);
          pinta(x, y, corDaLava(k / Math.max(1, n - 1)));
        }
      }
    };
    if (fechada) rachas(0, 0);
    if (fechada) {
      // Shut: the lips pressed together, a jagged seam still lit.
      for (let x = -7; x <= 7; x++) pinta(Math.round(cx + x), Math.round(cy + Math.sin(x * 1.7) * 1.2), Math.abs(x) % 3 === 0 ? PAL.luz : PAL.labio);
      return sharp(buf, { raw: { width: BW, height: BH, channels: 4 } }).png().toBuffer();
    }
    const dentro = (x, y) => {
      const dx = (x + 0.5 - cx) / (RX * s), dy = (y + 0.5 - cy) / (RY * s);
      return Math.hypot(dx, dy) / borda(Math.atan2(dy, dx));
    };
    for (let y = 0; y < BH; y++)
      for (let x = 0; x < BW; x++) {
        const d = dentro(x, y), limiar = (BAYER[y & 1][x & 1] + 0.5) / 4;
        if (d >= 1) {
          // The dark outline: one pixel around the lip.
          if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => dentro(x + a, y + b) < 1)) pinta(x, y, PAL.breu);
          continue;
        }
        const cima = y + 0.5 < cy && x + 0.5 < cx + 3; // the light comes from the upper left, as in the painting
        let cor;
        if (d > 0.84) cor = cima && d > 0.9 ? PAL.luz : PAL.labio;
        else if (d > 0.66) cor = (d - 0.66) / 0.18 > limiar ? PAL.labio : PAL.garganta;
        else if (d > 0.46) cor = (d - 0.46) / 0.2 > limiar ? PAL.garganta : PAL.fundo;
        else cor = PAL.fundo;
        pinta(x, y, cor);
      }
    rachas(s * RX * 0.72, 2);
    return sharp(buf, { raw: { width: BW, height: BH, channels: 4 } }).png().toBuffer();
  };
  return {
    abre: await Promise.all([0.12, 0.38, 0.72, 1.1, 1].map((s) => quadro(s))),
    cicatriz: await Promise.all([1, 0.75, 0.5, 0.25].map((r) => quadro(0, r))),
  };
}
