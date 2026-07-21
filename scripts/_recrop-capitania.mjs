// Re-recorta as DUAS anims da Capitânia (idle 7f + fogo 9f) e o estático pela MESMA caixa
// (a união de todos os quadros, lição 5: anims do mesmo objeto com caixas diferentes fazem o
// sprite SALTAR ao trocar). Lê os raws 128×128 de assets/raw/ e regrava public/sprites/.
import sharp from 'sharp';
import fs from 'fs';

const conjuntos = [
  { dir: 'assets/raw/anim-capitania-anim', saida: 'capitania-anim', n: 7 },
  { dir: 'assets/raw/anim-capitania-fire-anim', saida: 'capitania-fire-anim', n: 9 },
];

const limpa = (data, W, H) => {
  const A = (x, y) => data[(y * W + x) * 4 + 3];
  // Xadrez desenhado: cinza neutro claro opaco -> transparente.
  for (let p = 0; p < W * H; p++) {
    const [r, g, b, a] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2], data[p * 4 + 3]];
    const neutro = Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && Math.abs(r - b) < 6;
    if (a > 10 && neutro && r > 140 && r < 215) data[p * 4 + 3] = 0;
  }
  // Bordas 100% opacas: moldura, não arte.
  for (const x of [0, W - 1]) {
    let cheia = true;
    for (let y = 0; y < H; y++) if (A(x, y) < 250) { cheia = false; break; }
    if (cheia) for (let y = 0; y < H; y++) data[(y * W + x) * 4 + 3] = 0;
  }
  for (const y of [0, H - 1]) {
    let cheia = true;
    for (let x = 0; x < W; x++) if (A(x, y) < 250) { cheia = false; break; }
    if (cheia) for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;
  }
};

let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
const tudo = [];

for (const c of conjuntos) {
  c.quadros = [];
  for (let i = 0; i < c.n; i++) {
    const { data, info } = await sharp(`${c.dir}/${i}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const px = new Uint8Array(data);
    limpa(px, info.width, info.height);
    c.quadros.push({ data: px, W: info.width, H: info.height });
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (px[(y * info.width + x) * 4 + 3] > 10) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
}

const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
console.log(`caixa união: ${box.width}x${box.height} @ (${box.left},${box.top})`);

for (const c of conjuntos) {
  for (let i = 0; i < c.n; i++) {
    const { data, W, H } = c.quadros[i];
    await sharp(Buffer.from(data.buffer), { raw: { width: W, height: H, channels: 4 } })
      .extract(box)
      .png()
      .toFile(`public/sprites/${c.saida}-${i}.png`);
  }
}

// O estático acompanha a MESMA caixa (quadro 0 do idle = a arte original).
const q0 = conjuntos[0].quadros[0];
await sharp(Buffer.from(q0.data.buffer), { raw: { width: q0.W, height: q0.H, channels: 4 } })
  .extract(box)
  .png()
  .toFile('public/sprites/capitania.png');

console.log('idle 7f + fogo 9f + capitania.png regravados na caixa união');
