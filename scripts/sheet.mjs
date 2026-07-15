// Contact sheet dos candidatos de um lote do PixelLab, ampliados.
//
// NÃO DÁ PARA ESCOLHER UM SPRITE OLHANDO A MINIATURA DE 32px. A silhueta é o que decide (é ela
// que o jogador lê em movimento), e a 32px ela é um borrão — foi assim que a leva de naves quase
// entrou em VISTA DE CIMA sem ninguém notar.
//
// ⚠️ CADA CANDIDATO VEM COM UM TAMANHO DIFERENTE (o gerador já entrega recortado). Uma folha que
// assume a caixa do primeiro candidato para todos faz os maiores VAZAREM para a célula vizinha —
// e aí a folha mente sobre a silhueta, que é a única coisa que ela existe para mostrar. Cada
// candidato é CENTRADO numa célula do tamanho do MAIOR.
//
// uso: node scripts/sheet.mjs <object-id> <saida.png> <i> <i> ...
import sharp from 'sharp';

const [objId, saida, ...idx] = process.argv.slice(2);

if (!objId || !saida || idx.length === 0) {
  console.error('uso: node scripts/sheet.mjs <object-id> <saida.png> <indices...>');
  process.exit(1);
}

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const base = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${objId}/rotations`;

const Z = 7;
const COLS = 4;
/** Respiro entre as células: sprites colados um no outro leem como um sprite só. */
const PAD = 8;

const tiles = [];
for (const i of idx) {
  const res = await fetch(`${base}/frame_${i}.png`);
  if (!res.ok) throw new Error(`frame ${i}: HTTP ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const m = await sharp(buf).metadata();

  tiles.push({
    // `nearest`: qualquer outro kernel INTERPOLA, e um pixel borrado não é a arte que vai
    // para o jogo — a ampliação existe para ver o pixel, não para suavizá-lo.
    buf: await sharp(buf).resize(m.width * Z, m.height * Z, { kernel: 'nearest' }).toBuffer(),
    w: m.width * Z,
    h: m.height * Z,
  });
}

const cellW = Math.max(...tiles.map((t) => t.w)) + PAD * 2;
const cellH = Math.max(...tiles.map((t) => t.h)) + PAD * 2;
const rows = Math.ceil(tiles.length / COLS);

await sharp({
  create: {
    width: cellW * COLS,
    height: cellH * rows,
    channels: 4,
    // Fundo na cor do jogo: um sprite escuro julgado contra branco mente sobre a leitura dele.
    background: { r: 11, g: 15, b: 30, alpha: 1 },
  },
})
  .composite(
    tiles.map((t, n) => ({
      input: t.buf,
      // Centrado na célula — senão candidatos de tamanhos diferentes não se comparam.
      left: (n % COLS) * cellW + Math.floor((cellW - t.w) / 2),
      top: Math.floor(n / COLS) * cellH + Math.floor((cellH - t.h) / 2),
    })),
  )
  .png()
  .toFile(saida);

console.log(`${saida} — ${tiles.length} candidatos (${COLS} por linha), na ordem: ${idx.join(' ')}`);
