// A PLUMA DE GÁS da soleira do núcleo, assada em PIXEL na resolução nativa.
//
// ⚠️ ASSADA, NUNCA `Graphics`: a lei mais cara da Fatia 7 (o 1º fim do predador foi reprovado na
// hora — *"ficou gerado e sem custos"*).
//
// ⚠️ E ELA É ESCURA DE PROPÓSITO. Gás não é energia, e a regra do dark sci-fi é luz só onde há
// energia. A cor sai do risco âmbar do `f4-cano2` (a pressão que vazou dele), dessaturada. O que
// brilha nesta cena é o ESTOURO — se a pluma competir com ele, o clímax vira mais do mesmo.
//
// ⚠️ O RUÍDO É ESTÁVEL (xorshift com semente fixa): a mesma pluma toda vez que o script roda. Um
// gás sorteado a cada assadura mudaria de forma entre builds e ninguém saberia por quê.
//
//   node scripts/_f4/_assar-gas.mjs
import sharp from 'sharp';

const W = 128,
  H = 176,
  N = 8;
const SAIDA = 'public/sprites/f4-gas-sheet.png';

// A paleta, medida no risco âmbar do cano e puxada para baixo.
const BASE = [122, 96, 44];

let semente = 0x9e3779b9;
const rnd = () => {
  semente ^= semente << 13;
  semente ^= semente >>> 17;
  semente ^= semente << 5;
  return ((semente >>> 0) % 100000) / 100000;
};

// ⚠️ RUÍDO DE VALOR, NÃO RUÍDO POR PIXEL — a correção mais importante desta peça.
//
// A 1ª versão sorteava cada pixel sozinho e o resultado lia como POEIRA/estática, não como gás:
// um campo uniforme de faíscas sem forma nenhuma. Gás tem GRUMO. Aqui um reticulado esparso de
// valores aleatórios é interpolado, e duas oitavas dão nuvem com bolo e com rarefação.
const GRADE = 22;
const reticulado = [];
for (let o = 0; o < 2; o++) {
  const passo = GRADE / (o + 1) / (o + 1);
  const cols = Math.ceil(W / passo) + 3;
  const rows = Math.ceil((H * 2) / passo) + 3;
  const v = new Float32Array(cols * rows);
  for (let k = 0; k < v.length; k++) v[k] = rnd();
  reticulado.push({ passo, cols, rows, v });
}
const suave = (t) => t * t * (3 - 2 * t);
const oitava = ({ passo, cols, rows, v }, x, y) => {
  const fx = x / passo,
    fy = y / passo;
  const x0 = Math.floor(fx),
    y0 = Math.floor(fy);
  const tx = suave(fx - x0),
    ty = suave(fy - y0);
  const at = (cx, cy) => v[Math.min(rows - 1, cy) * cols + Math.min(cols - 1, cx)];
  const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
  const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
  return a + (b - a) * ty;
};
// A nuvem DERIVA para baixo quadro a quadro: o gás desce do cano, e um campo parado lê como
// textura colada na tela.
const nuvemEm = (x, y, f) =>
  oitava(reticulado[0], x, y + f * 7) * 0.68 + oitava(reticulado[1], x, y + f * 11) * 0.32;

const quadros = [];
for (let f = 0; f < N; f++) {
  // A densidade sobe com o quadro: 0 é um fio saindo do cano, 7 é a faixa tomada.
  const densidade = 0.30 + (f / (N - 1)) * 0.46;
  const buf = Buffer.alloc(W * H * 4, 0);
  for (let y = 0; y < H; y++) {
    // A pluma desce do teto: quem está perto de y=0 é denso desde o começo, o resto enche depois.
    const alcance = Math.min(1, (f / (N - 1)) * 1.5 + 0.22) * H;
    if (y > alcance) continue;
    const perto = Math.min(1, (alcance - y) / 46);
    for (let x = 0; x < W; x++) {
      // Afina nas pontas para a nuvem não ter borda reta — borda reta lê como retângulo.
      const beira = Math.min(1, Math.min(x, W - 1 - x) / 30);
      // ⚠️ O JITTER FINO NO LIMIAR É O QUE DISSOLVE A BORDA DO GRUMO. Sem ele os três degraus
      // desenham fronteiras DURAS e a nuvem lê como CAMUFLAGEM — manchas chapadas com contorno.
      // Sacudir cada pixel um pouco em volta do limiar transforma cada fronteira numa faixa
      // DITHERIZADA, que é como pixel art faz degradê desde sempre.
      const massa = nuvemEm(x, y, f) * densidade * perto * beira * (0.86 + rnd() * 0.28);
      // ⚠️ TRÊS DEGRAUS, NÃO UM GRADIENTE. O pixel art desta fase não tem gradiente contínuo em
      // lugar nenhum, e o miolo do grumo tem de ser SÓLIDO — é o que separa gás de chuvisco.
      let k, a;
      if (massa > 0.42) { k = 1.15; a = 112; }
      else if (massa > 0.30) { k = 0.85; a = 82; }
      else if (massa > 0.21) { k = 0.62; a = 54; }
      else continue;
      const i = (y * W + x) * 4;
      buf[i] = Math.min(255, BASE[0] * k);
      buf[i + 1] = Math.min(255, BASE[1] * k);
      buf[i + 2] = Math.min(255, BASE[2] * k);
      buf[i + 3] = a;
    }
  }
  quadros.push(await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
}

await sharp({
  create: { width: W * N, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(quadros.map((input, i) => ({ input, left: i * W, top: 0 })))
  .png()
  .toFile(SAIDA);
console.log(`${SAIDA}  ${N} quadros de ${W}x${H}`);
