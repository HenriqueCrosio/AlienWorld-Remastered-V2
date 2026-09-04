// MOCK de conferência: a garganta na geometria do spec (centro x 330, topo y 8, 191x191) sobre a
// pintura instalada, com o VÃO DE PARADA da nave e as três carcaças marcados.
// ⚠️ É bancada, não asset: aqui a face é REDIMENSIONADA só para a conferência. A arte de verdade
// nasce redesenhada em 191 pelo PixelLab (o upscale por filtro é o erro nº 4 da 1ª volta).
// ⚠️ DUAS PASSADAS: no sharp o `resize` roda ANTES do `composite` no mesmo pipeline — compor e
// ampliar de uma vez põe a criatura em 1/3 do x pedido. Compõe primeiro, amplia depois.
import sharp from 'sharp';

const W = 384, H = 216;
const CX = 330, TOPO = 8, LADO = 191;
const NAVE = { x: 258, y: 164, w: 30, h: 22 };
const CARCACAS = [{ x: 64, w: 41, h: 25 }, { x: 150, w: 47, h: 24 }, { x: 330, w: 39, h: 28 }];
const DECK_Y = 171;

const criatura = await sharp('scripts/_cut3/_south-bruta.png')
  .extract({ left: 19, top: 19, width: 132, height: 131 })
  .resize(LADO, LADO, { kernel: 'nearest' })
  .png()
  .toBuffer();

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${CX - LADO / 2}" y="${TOPO}" width="${LADO}" height="${LADO}" fill="none" stroke="#00ff88" stroke-width="1"/>
  <rect x="${NAVE.x - NAVE.w / 2}" y="${NAVE.y - NAVE.h / 2}" width="${NAVE.w}" height="${NAVE.h}" fill="none" stroke="#ffdd00" stroke-width="1"/>
  ${CARCACAS.map((c) => `<rect x="${c.x - c.w / 2}" y="${DECK_Y - c.h}" width="${c.w}" height="${c.h}" fill="none" stroke="#ff3355" stroke-width="1"/>`).join('')}
</svg>`;

// O fundo PRETO entra por baixo: as cinco janelas são vazadas, e sem chapa o alpha delas sai
// branco no PNG de conferência — o oposto do que a cena mostra.
const plano = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 5, g: 6, b: 13, alpha: 1 } } })
  .composite([
    { input: 'public/sprites/paint-bg-cut3.png', left: 0, top: 0 },
    { input: criatura, left: Math.round(CX - LADO / 2), top: TOPO },
    { input: Buffer.from(svg), left: 0, top: 0 },
  ])
  .png()
  .toBuffer();

await sharp(plano).resize(W * 3, H * 3, { kernel: 'nearest' }).png().toFile('scripts/_cut3/_mock-garganta.png');

console.log('scripts/_cut3/_mock-garganta.png  (3x)');
console.log(`  verde   = a garganta do spec: x ${CX - LADO / 2}..${CX + LADO / 2}, y ${TOPO}..${TOPO + LADO}`);
console.log(`  amarelo = o vao de parada da nave (x ${NAVE.x})`);
console.log(`  vermelho= as tres carcacas (x ${CARCACAS.map((c) => c.x).join(', ')})`);
