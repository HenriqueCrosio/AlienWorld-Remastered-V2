// A RÉGUA DA PALETA. Mede a COR DO MATERIAL de uma arte, não o brilho dela.
//
// ⚠️ "REALCE = OS 8% MAIS CLAROS" NÃO SERVE PARA ESTA FAMÍLIA, e a rodada de 27/08 usou isso.
// Funcionava enquanto as peças eram chapa lisa; os tiles novos do casco têm OSSO quase branco e
// COBRE saturado, e os 8% mais claros passam a medir o osso — `#b8b19b`, R−B +29, que diria
// "quente" de uma peça cujo material é azul-frio. A cor de um material é a cor que ele REPETE.
//
// O que sai daqui:
//   modal   a cor opaca mais frequente (o material: a chapa, não o veio nem o realce)
//   R−B     o viés de temperatura do modal. Negativo = frio. O canon do Leviatã é ~−23.
//   lum     luminância média de tudo que é opaco (a régua de "escuro demais")
import sharp from 'sharp';

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export async function medir(arquivo) {
  const { data, info } = await sharp(arquivo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  const conta = new Map();
  let soma = 0;
  let n = 0;
  let topo = -1;
  let base = -1;

  for (let y = 0; y < H; y++) {
    let opacoNaLinha = false;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] <= 128) continue;
      opacoNaLinha = true;
      const k = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      conta.set(k, (conta.get(k) ?? 0) + 1);
      soma += lum(data[i], data[i + 1], data[i + 2]);
      n++;
    }
    if (opacoNaLinha) {
      if (topo < 0) topo = y;
      base = y;
    }
  }

  const [modal] = [...conta.entries()].sort((a, b) => b[1] - a[1]);
  const r = (modal[0] >> 16) & 255;
  const g = (modal[0] >> 8) & 255;
  const b = modal[0] & 255;

  return {
    w: W, h: H, topo, base,
    modal: hex(r, g, b),
    rb: r - b,
    parte: modal[1] / n,
    lum: n ? soma / n : 0,
  };
}

if (process.argv[2]) {
  for (const f of process.argv.slice(2)) {
    const m = await medir(f);
    console.log(
      `${f.split(/[\/]/).pop().padEnd(24)} ${(m.w + 'x' + m.h).padEnd(9)} y ${String(m.topo).padStart(3)}..${String(m.base).padStart(3)}` +
        `   modal ${m.modal}  R−B ${String(m.rb).padStart(4)}  (${(m.parte * 100).toFixed(0)}% dos pixels)   lum ${m.lum.toFixed(3)}`,
    );
  }
}
