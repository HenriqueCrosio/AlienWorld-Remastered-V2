// A LEI DE COR da Cutscene 3, em um lugar só.
//
// ⚠️ Por que no arquivo e não em `setTint()`: `setTint` multiplica a textura INTEIRA por uma cor
// só — ele não sabe separar o casco do miolo, e some com a única luz que a peça tem direito de
// ter. A mesma lei do `reduzir-sprite.mjs`: 1px de arte = 1px de jogo, 1 cor de arte = 1 cor de
// jogo.
//
// O QUE A PINTURA DO HANGAR EXIGE (medido em 2026-09-03):
//   luminância média 13,1  ·  só 31 pixels da tela inteira passam de 110 (0,05%)
// O teto prático do quadro é ~110. Uma peça com pico 207 grita.

export const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return [h, s, l];
}

export function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Média e pico de luminância dos pixels OPACOS (alpha ≥ 200). */
export function estatistica(buf, ch) {
  let soma = 0, n = 0, pico = 0;
  for (let i = 0; i < buf.length; i += ch) {
    if (buf[i + 3] < 200) continue;
    const L = lum(buf[i], buf[i + 1], buf[i + 2]);
    soma += L; n++;
    if (L > pico) pico = L;
  }
  return { media: n ? soma / n : 0, pico };
}

/**
 * AS TRÊS OPERAÇÕES, e o motivo de cada uma:
 *   1. o casco TEAL (matiz 140°–215°) gira para a FERRUGEM do hangar (~18°).
 *      Teal é `player 0x17a6bd` — a cor do JOGADOR. Um inimigo vestido da cor do jogador mente.
 *   2. o miolo ROSA/MAGENTA (matiz ≥280° ou ≤15°) MANTÉM o matiz.
 *      Rosa é `enemyBright 0xe8306b` — paleta de inimigo. Está certo, e é a energia da peça.
 *   3. COMPRESSÃO DE REALCE acima de L=90: a curva achata em 0,36, teto vira ~132.
 *      É isso que tira o grito sem escurecer o corpo — a média mal se move.
 *
 * Aferida na criatura da garganta: 31,8/207 → 30,6/132.
 */
export function corrigirPaleta(buf, ch) {
  const saida = Buffer.from(buf);

  for (let i = 0; i < saida.length; i += ch) {
    if (saida[i + 3] < 8) continue;

    let [h, s, l] = rgb2hsl(saida[i], saida[i + 1], saida[i + 2]);

    if (h >= 140 && h <= 215) {
      h = 18 + (h - 140) * 0.10;
      s *= 0.55;
      l *= 0.80;
    } else if (h >= 280 || h <= 15) {
      s *= 0.92;
    }

    let [r, g, b] = hsl2rgb(h, s, l);

    const L = lum(r, g, b);
    if (L > 90) {
      const k = (90 + (L - 90) * 0.36) / L;
      r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k);
    }

    saida[i] = Math.min(255, r);
    saida[i + 1] = Math.min(255, g);
    saida[i + 2] = Math.min(255, b);
  }

  return saida;
}

/**
 * PARA A FAMÍLIA — `corrigirPaleta` mais um ajuste de MÉDIA, medido.
 *
 * ⚠️ POR QUE ISTO PRECISOU EXISTIR (2026-09-04). `corrigirPaleta` foi aferida numa peça que já
 * chegava com média 31,8: ela gira o matiz e ACHATA O PICO, mas quase não mexe na média — é o que
 * está escrito lá em cima, "a média mal se move". O spec da 2ª volta assumiu que toda arte nova
 * chegaria por volta de 32 e mandou passar tudo pela mesma correção. Medido: os destroços vieram
 * com média 50 a 69 e a criatura com 37. Contra uma pintura de média 13,1, isso não é família —
 * é um borrão claro colado na cena, e foi exatamente assim que a 1ª geração da garganta apareceu.
 *
 * O ajuste é uma CURVA DE POTÊNCIA sobre a luminância (L' = 255·(L/255)^γ), com o γ resolvido por
 * bisseção até a média cair no alvo. Potência, e não ganho multiplicativo: ganho puro empurra a
 * peça inteira para o preto e mata o contraste interno; a potência escurece os meios-tons e deixa
 * a faixa escura quase parada, que é onde a silhueta mora.
 *
 * O canal de cor é reescalado pelo MESMO fator (L'/L), então matiz e saturação não se mexem — só
 * a intensidade. O achatamento do realce roda DEPOIS, para o teto valer sobre o resultado final.
 */
export function paraFamilia(buf, ch, mediaAlvo = 30) {
  const base = corrigirPaleta(buf, ch);
  const m0 = estatistica(base, ch).media;
  if (!(m0 > mediaAlvo)) return base; // já está na família (ou mais escura) — não clarear nada

  const mediaCom = (gama) => {
    let soma = 0, n = 0;
    for (let i = 0; i < base.length; i += ch) {
      if (base[i + 3] < 200) continue;
      const L = lum(base[i], base[i + 1], base[i + 2]);
      soma += L > 0 ? 255 * (L / 255) ** gama : 0;
      n++;
    }
    return n ? soma / n : 0;
  };

  let lo = 1, hi = 6;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    if (mediaCom(mid) > mediaAlvo) lo = mid; else hi = mid;
  }
  const gama = (lo + hi) / 2;

  const saida = Buffer.from(base);
  for (let i = 0; i < saida.length; i += ch) {
    if (saida[i + 3] < 8) continue;
    const L = lum(saida[i], saida[i + 1], saida[i + 2]);
    if (L <= 0) continue;
    const k = (255 * (L / 255) ** gama) / L;
    saida[i] = Math.min(255, Math.round(saida[i] * k));
    saida[i + 1] = Math.min(255, Math.round(saida[i + 1] * k));
    saida[i + 2] = Math.min(255, Math.round(saida[i + 2] * k));
  }

  // O TETO VALE SOBRE O RESULTADO: a mesma compressão acima de L=90 da lei original, agora
  // aplicada depois do escurecimento.
  for (let i = 0; i < saida.length; i += ch) {
    if (saida[i + 3] < 8) continue;
    const L = lum(saida[i], saida[i + 1], saida[i + 2]);
    if (L <= 90) continue;
    const k = (90 + (L - 90) * 0.36) / L;
    saida[i] = Math.round(saida[i] * k);
    saida[i + 1] = Math.round(saida[i + 1] * k);
    saida[i + 2] = Math.round(saida[i + 2] * k);
  }

  saida.gama = gama;
  return saida;
}
