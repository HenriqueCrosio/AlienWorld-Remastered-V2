// A RÉGUA DE UMA FAIXA (Fatia 7 · a moldura).
//
// ⚠️ Uma faixa não é um objeto: é uma PAREDE. Ela tem de sangrar nas três bordas — esquerda,
// direita e base — senão vira um adesivo com ar em volta, que é exatamente o defeito que a
// moldura existe para matar.
//
// Quatro medidas, todas objetivas:
//   BORDA E/D  quantos % da coluna de pixels da borda estão opacos (precisa ser alto: a peça
//              encosta na cópia seguinte)
//   BASE       quantos % da linha de baixo estão opacos (buraco embaixo = parede flutuando)
//   TOPO       quanto o contorno de cima varia (a spec pede topo RETO: quem faz a parede subir
//              e descer é o código, colocando cada placa numa altura; topo irregular briga com
//              a curva)
//   EMENDA     a diferença média entre a coluna da direita e a coluna da esquerda — é o quanto
//              a emenda vai aparecer quando a peça se repetir encostada nela mesma
//
//   node scripts/_f4/_medir-faixas.mjs scripts/_f4/_faixas/A-*.png
import sharp from 'sharp';

const arquivos = process.argv.slice(2);
const pct = (v) => `${Math.round(v * 100)}%`.padStart(4);

console.log('arquivo        bordaE bordaD  base   topo(dp)  emenda   veredicto');
for (const f of arquivos) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const a = (x, y) => data[(y * W + x) * 4 + 3];
  const px = (x, y, c) => data[(y * W + x) * 4 + c];

  const colOpaca = (x) => { let n = 0; for (let y = 0; y < H; y++) if (a(x, y) > 8) n++; return n / H; };
  const bordaE = colOpaca(0), bordaD = colOpaca(W - 1);
  let base = 0; for (let x = 0; x < W; x++) if (a(x, H - 1) > 8) base++; base /= W;

  // o contorno de cima, coluna a coluna
  const topo = [];
  for (let x = 0; x < W; x++) { let y = 0; while (y < H && a(x, y) <= 8) y++; topo.push(y); }
  const med = topo.reduce((s, v) => s + v, 0) / W;
  const dp = Math.sqrt(topo.reduce((s, v) => s + (v - med) ** 2, 0) / W);

  // a emenda: a coluna da direita contra a da esquerda, se as duas forem opacas
  let dif = 0, n = 0;
  for (let y = 0; y < H; y++) {
    if (a(0, y) > 8 && a(W - 1, y) > 8) {
      for (let c = 0; c < 3; c++) dif += Math.abs(px(0, y, c) - px(W - 1, y, c));
      n += 3;
    }
  }
  const emenda = n ? dif / n : 255;

  const serve = bordaE > 0.8 && bordaD > 0.8 && base > 0.9;
  const nota = !serve
    ? `⚠️ nao sangra nas bordas — e objeto, nao parede`
    : dp > 6 ? `⚠️ topo irregular (dp ${dp.toFixed(1)}) — briga com a curva`
    : emenda > 45 ? `serve; emenda forte (${emenda.toFixed(0)}), fecho no aparo`
    : `✅ serve (emenda ${emenda.toFixed(0)})`;

  console.log(
    f.split(/[\/]/).pop().padEnd(14) + pct(bordaE) + '  ' + pct(bordaD) + '  ' + pct(base) +
    '   ' + dp.toFixed(1).padStart(5) + '   ' + emenda.toFixed(0).padStart(5) + '   ' + nota);
}
