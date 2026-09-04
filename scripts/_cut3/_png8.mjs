// Codificador de PNG INDEXADO (color type 3) com paleta reduzida + tRNS.
//
// ⚠️ POR QUE ELE EXISTE. A imagem de estilo viaja como base64 DENTRO da chamada MCP, e uma string
// de 14 mil caracteres não sobrevive ao trânsito — chega truncada e o servidor recusa o PNG. O
// `sharp` neste ambiente não tem libimagequant, então `png({palette:true})` não quantiza de
// verdade: ele grava RGBA e o arquivo fica grande. Aqui a paleta é feita à mão (median cut) e o
// PNG sai com 1 byte por pixel.
//
//   import { png8 } from './_png8.mjs'
//   const buf = png8(rgbaBuffer, W, H, nCores)
import zlib from 'node:zlib';

function medianCut(pixels, n) {
  // pixels: array de [r,g,b] dos opacos. Devolve n cores representativas.
  let caixas = [pixels];
  while (caixas.length < n) {
    // parte a caixa com maior extensão num canal
    let melhor = -1, canal = 0, ext = -1;
    caixas.forEach((cx, i) => {
      if (cx.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let mn = 255, mx = 0;
        for (const p of cx) { if (p[c] < mn) mn = p[c]; if (p[c] > mx) mx = p[c]; }
        if (mx - mn > ext) { ext = mx - mn; melhor = i; canal = c; }
      }
    });
    if (melhor < 0) break;
    const cx = caixas[melhor].slice().sort((a, b) => a[canal] - b[canal]);
    const meio = cx.length >> 1;
    caixas.splice(melhor, 1, cx.slice(0, meio), cx.slice(meio));
  }
  return caixas.filter((c) => c.length).map((cx) => {
    let r = 0, g = 0, b = 0;
    for (const p of cx) { r += p[0]; g += p[1]; b += p[2]; }
    return [Math.round(r / cx.length), Math.round(g / cx.length), Math.round(b / cx.length)];
  });
}

function chunk(tipo, dados) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corpo) >>> 0);
  return Buffer.concat([len, corpo, crc]);
}

let TAB = null;
function crc32(buf) {
  if (!TAB) {
    TAB = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TAB[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TAB[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

export function png8(rgba, W, H, nCores) {
  const opacos = [];
  for (let i = 0; i < W * H; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    opacos.push([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]);
  }
  // índice 0 fica reservado para o TRANSPARENTE (tRNS de 1 byte).
  const paleta = [[0, 0, 0], ...medianCut(opacos, nCores - 1)];

  const idx = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i++) {
    if (rgba[i * 4 + 3] < 128) { idx[i] = 0; continue; }
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    let melhor = 1, dist = Infinity;
    for (let k = 1; k < paleta.length; k++) {
      const d = (r - paleta[k][0]) ** 2 + (g - paleta[k][1]) ** 2 + (b - paleta[k][2]) ** 2;
      if (d < dist) { dist = d; melhor = k; }
    }
    idx[i] = melhor;
  }

  // scanlines com filtro 0 (nenhum) — em imagem indexada de blocos chapados o zlib já resolve.
  const bruto = Buffer.alloc(H * (W + 1));
  for (let y = 0; y < H; y++) {
    bruto[y * (W + 1)] = 0;
    idx.copy(bruto, y * (W + 1) + 1, y * W, (y + 1) * W);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 3;   // color type: indexado
  const plte = Buffer.concat(paleta.map(([r, g, b]) => Buffer.from([r, g, b])));
  const trns = Buffer.from([0]); // só o índice 0 é transparente

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('tRNS', trns),
    chunk('IDAT', zlib.deflateSync(bruto, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
