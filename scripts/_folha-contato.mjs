// FOLHA DE CONTATO de um pacote de review do PixelLab: baixa os N quadros e monta uma grade
// AMPLIADA (nearest), para dar para escolher olhando em vez de adivinhar na miniatura.
// uso: node scripts/_f3/folha-contato.mjs <object-id> <n-quadros> <zoom> <saida.png>
import sharp from 'sharp';

const [objId, nRaw, zoomRaw, saida] = process.argv.slice(2);
const N = Number(nRaw);
const ZOOM = Number(zoomRaw);
const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const base = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${objId}/rotations`;

const quadros = [];
for (let i = 0; i < N; i++) {
  const r = await fetch(`${base}/frame_${i}.png`);
  if (!r.ok) throw new Error(`HTTP ${r.status} no quadro ${i}`);
  quadros.push(Buffer.from(await r.arrayBuffer()));
}
const m = await sharp(quadros[0]).metadata();
const W = m.width * ZOOM;
const H = m.height * ZOOM;
const cols = Math.ceil(Math.sqrt(N));
const linhas = Math.ceil(N / cols);

const comps = [];
for (let i = 0; i < N; i++) {
  comps.push({
    input: await sharp(quadros[i]).resize(W, H, { kernel: 'nearest' }).toBuffer(),
    left: (i % cols) * W,
    top: Math.floor(i / cols) * H,
  });
}
await sharp({
  create: { width: cols * W, height: linhas * H, channels: 4, background: { r: 18, g: 22, b: 34, alpha: 1 } },
})
  .composite(comps)
  .png()
  .toFile(saida);
console.log(`${saida}: ${N} quadros ${m.width}x${m.height} em ${cols}x${linhas}, zoom ${ZOOM}x`);
