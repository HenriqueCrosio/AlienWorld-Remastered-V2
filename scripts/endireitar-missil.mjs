// ENDIREITA o míssil do Henrique e instala como `missile.png`.
//
// POR QUE PRECISA ENDIREITAR: o `TerrainSystem.fireAt` faz `b.setRotation(angle)` — ele gira o
// sprite na direção do voo. Isso só funciona se a arte já estiver HORIZONTAL apontando para a
// direita (a convenção de todo sprite do projeto). A arte veio inclinada ~11,5°, e instalada
// crua o míssil voaria com o nariz torto em relação à trajetória — errado o tempo todo, e
// invisivelmente errado, porque ninguém compara o ângulo do sprite com o vetor da velocidade.
//
// ⚠️ GIRA EM 4x E VOLTA, COM NEAREST. Girar pixel art direto no tamanho nativo passa um filtro
// suave em cima e derrete as bordas duras — o defeito que o prefixo de estilo da casa gasta uma
// linha inteira proibindo ("hard edges, no anti-aliasing"). Ampliar 4x com nearest, girar, e
// reduzir 4x com nearest mantém a aresta.
//
// uso: node scripts/endireitar-missil.mjs <object-id> <graus> [saida]
import sharp from 'sharp';

const [objId, grausRaw, saida = 'missile'] = process.argv.slice(2);
if (!objId || grausRaw === undefined) {
  console.error('uso: node scripts/endireitar-missil.mjs <object-id> <graus> [saida]');
  process.exit(1);
}
const graus = Number(grausRaw);

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const url = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${objId}/rotations/unknown.png`;

const res = await fetch(url);
if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${objId}`);
const bruto = Buffer.from(await res.arrayBuffer());
const meta = await sharp(bruto).metadata();

const AMPL = 4;
const girado = await sharp(bruto)
  .resize(meta.width * AMPL, meta.height * AMPL, { kernel: 'nearest' })
  .rotate(graus, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();
const g = await sharp(girado).metadata();
const reduzido = await sharp(girado)
  .resize(Math.round(g.width / AMPL), Math.round(g.height / AMPL), { kernel: 'nearest' })
  .toBuffer();

// A caixa real depois do giro (o giro sempre sobra transparência nos cantos).
const { data, info } = await sharp(reduzido).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let x0 = 1e9;
let x1 = -1;
let y0 = 1e9;
let y1 = -1;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 60) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
}
if (x1 < 0) throw new Error('o giro esvaziou o sprite');

await sharp(reduzido)
  .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
  .png()
  .toFile(`public/sprites/${saida}.png`);

const fim = await sharp(`public/sprites/${saida}.png`).metadata();
console.log(`${saida}.png: ${fim.width}x${fim.height} (de ${meta.width}x${meta.height}, girado ${graus}°)`);
