// A DOCA DO CINTURÃO — SEGUNDA ARTE (c166782d-84e8-4dca-9017-ebdbd26ef0bf).
//
// A primeira arte (`_cut2-doca.mjs`, deixada intacta — documenta o pipeline dela) foi gerada pelo
// PixelLab A PARTIR da própria pintura do céu (`paintBgCut2`). O diagnóstico do Henrique, verbatim:
// "usar duas imagens sobrepostas e parecidas causa estranheza". Duas versões da mesma composição
// empilhadas brigavam.
//
// Esta arte é genuinamente outra: um cais industrial encravado num paredão de asteroide, com TRÊS
// plataformas em balanço. Lê como doca contra céu, não como pintura contra cópia em pixel dela
// mesma.
//
// ⚠️ GANHO 1.5, não 1.0 nem 2.0 — testado em A/B pelo Henrique: ×1.0 deixa o convés de pouso
// escuro demais para ler como alvo; ×2.0 estoura as plataformas para quase-branco, e a doca vira a
// coisa mais clara da tela — o MESMO defeito que matou a arte anterior. Não mude este número.
//
// ⚠️ A ARTE ENCOSTA NA BORDA ESQUERDA DA TELA (Interlude2Scene: DOCA_X = ART_W/2). O lado esquerdo
// do sprite fica fora da tela — por isso NÃO esfumamos a borda esquerda: esfumá-la comeria arte
// que de fato aparece. As outras três (topo, base, direita) continuam retas por definição de PNG,
// então levam feather.
//
// ⚠️ Das três plataformas (y≈92..110, y≈127..144, y≈169..183), o Henrique escolheu a MAIS BAIXA e
// MAIOR — y≈169..183 — como pista de pouso. A regra genérica "linha com mais pixels de tom médio"
// já acha essa faixa sozinha (y=175 é a linha mais larga da arte inteira), então reusamos a mesma
// medição do script anterior.
//
// uso: node scripts/_cut2-doca2.mjs [ganho]     (padrão: 1.5)
import sharp from 'sharp';

const GANHO = Number(process.argv[2] ?? 1.5);
const SRC = 'scripts/_cut2/doca2-base.png';
const OUT = 'public/sprites/doca-cinturao.png';
const FADE = 20; // largura da rampa de alpha, em px — topo, base e direita (NÃO a esquerda)

// 1. Corrigir o tom com ganho linear sobre a arte inteira (256×256).
const corrigida = await sharp(SRC).linear(GANHO, 0).png().toBuffer();

// 2. MEDIR a laje: a linha com mais pixels de tom médio é o convés — a mesma regra genérica do
// pipeline anterior encontra a plataforma certa aqui (y=175 é a mais larga da arte inteira).
const { data, info } = await sharp(corrigida)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const lum = (b, i) => (b[i] * 0.299 + b[i + 1] * 0.587 + b[i + 2] * 0.114) / 255;
let melhor = { y: -1, n: -1, x0: 0, x1: 0 };
for (let y = 0; y < info.height; y++) {
  let n = 0, x0 = info.width, x1 = 0;
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] > 8 && lum(data, i) > 0.17) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  }
  if (n > melhor.n) melhor = { y, n, x0, x1 };
}
console.log(`LAJE medida: y=${melhor.y} (${melhor.n} px claros) x ${melhor.x0}..${melhor.x1}`);

const PAD_ROW = melhor.y;

// 3. FEATHER no TOPO, na BASE e na DIREITA. A ESQUERDA fica reta — a doca está colada na borda
// esquerda da tela (fora de vista), esfumá-la comeria arte visível.
const idx = (x, y) => (y * info.width + x) * 4 + 3;
for (let x = 0; x < info.width; x++) {
  for (let k = 0; k < FADE; k++) {
    const f = (k + 1) / (FADE + 1);
    const top = idx(x, k);
    data[top] = Math.round(data[top] * f);
    const bot = idx(x, info.height - 1 - k);
    data[bot] = Math.round(data[bot] * f);
  }
}
for (let y = 0; y < info.height; y++) {
  for (let k = 0; k < FADE; k++) {
    const f = (k + 1) / (FADE + 1);
    const right = idx(info.width - 1 - k, y);
    data[right] = Math.round(data[right] * f);
  }
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile(OUT);

console.log(`${OUT}: ${info.width}x${info.height}`);
console.log(`>>> CONSTANTES para Interlude2Scene:`);
console.log(`    ART_W = ${info.width}`);
console.log(`    ART_H = ${info.height}`);
console.log(`    PAD_ROW = ${PAD_ROW}`);
console.log(`    PAD_X0 = ${melhor.x0}`);
console.log(`    PAD_X1 = ${melhor.x1}`);
