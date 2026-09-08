// FOLHA DE CONTATO — as quatro faixas no enquadramento real (Fatia 7 · a moldura).
//
// ⚠️ NADA AQUI INSTALA ARTE.
//
// Cada faixa aparece repetida 3× (384 ÷ 128 = 3 exatas) no chão e, espelhada, no teto — sobre a
// pintura da própria câmara, na espessura que a spec dá àquele trecho. As três cópias na tela ao
// mesmo tempo são o PIOR CASO de repetição: no jogo elas rolam, então a repetição acontece no
// tempo, não no espaço. Se passar aqui, passa lá.
//
// As marcas vermelhas em cima apontam as emendas (x = 0, 128, 256). É onde a repetição denuncia.
import sharp from 'sharp';

const W = 384, H = 216, GROUND_Y = 206, TETO_Y = 10, ZOOM = 2;

// Cada câmara aparece DUAS vezes: como saiu do gerador e depois do acerto de valor
// (`_valor-faixa.mjs`). A comparação é o ponto da folha — o defeito não é o desenho, é o VALOR.
const ESP = { A: 18, B: 36, C: 64, D: 18 };
const NOME = {
  A: 'A  a doca engolida   — t=1..40, espessura 18px',
  B: 'B  a garganta        — t=40..68, espessura 36px',
  C: 'C  o ganglio / duto  — t=68..82, espessura 64px (cheia)',
  D: 'D  o coracao (arena) — t=82+, espessura 18px',
};
const BG = { A: 'a', B: 'b', C: 'c', D: 'd' };
const CAMARAS = [];
for (const L of ['A', 'B', 'C', 'D']) {
  CAMARAS.push([`${NOME[L]}   [CRU, como saiu do gerador]`, `_faixa-${L}`, `paint-bg-f4-${BG[L]}`, ESP[L]]);
  CAMARAS.push([`${NOME[L]}   [VALOR CORRIGIDO]`, `_faixa-${L}-v`, `paint-bg-f4-${BG[L]}`, ESP[L]]);
}

async function quadro(faixa, fundo, esp) {
  const src = `scripts/_f4/${faixa}.png`;
  const m = await sharp(src).metadata();
  const tira = Buffer.concat([]);           // (a fita é montada por composite, abaixo)

  // O chão: a faixa cortada na espessura pedida, contada a partir do GROUND_Y para baixo é o
  // CORPO; o que aparece acima do GROUND_Y é a espessura. A peça é ancorada pelo TOPO.
  const topoChao = GROUND_Y - esp;
  const topoTeto = TETO_Y;

  const comp = [];
  for (let i = 0; i < Math.ceil(W / m.width); i++) {
    comp.push({ input: src, left: i * m.width, top: topoChao });
    comp.push({ input: await sharp(src).flip().png().toBuffer(), left: i * m.width, top: topoTeto + esp - m.height });
  }
  // as marcas de emenda
  for (let x = 0; x <= W; x += m.width) {
    comp.push({
      input: Buffer.from(`<svg width="3" height="10"><rect width="3" height="10" fill="#ff3b3b"/></svg>`),
      left: Math.min(x, W - 3), top: 0,
    });
  }
  return sharp(`public/sprites/${fundo}.png`).composite(comp).png().toBuffer();
}

const ROT = 26, PAD = 8, ZW = W * ZOOM, ZH = H * ZOOM;
const rotulo = (t) => Buffer.from(
  `<svg width="${ZW}" height="${ROT}"><rect width="${ZW}" height="${ROT}" fill="#0b0f1a"/>` +
  `<text x="10" y="18" font-family="monospace" font-size="15" fill="${t.includes('CORRIGIDO') ? '#7fe3ff' : '#ff9a6b'}">${t}</text></svg>`);

const partes = [];
for (const [txt, faixa, fundo, esp] of CAMARAS) {
  partes.push(await sharp(rotulo(txt)).png().toBuffer());
  partes.push(await sharp(await quadro(faixa, fundo, esp)).resize(ZW, ZH, { kernel: 'nearest' }).png().toBuffer());
}

const comp = [];
let y = PAD;
for (let i = 0; i < partes.length; i += 2) {
  comp.push({ input: partes[i], top: y, left: 0 });
  comp.push({ input: partes[i + 1], top: y + ROT, left: 0 });
  y += ROT + ZH + PAD;
}
await sharp({ create: { width: ZW, height: CAMARAS.length * (ROT + ZH) + PAD * (CAMARAS.length + 1), channels: 3, background: '#0b0f1a' } })
  .composite(comp).png().toFile('scripts/_f4/_folha-faixas.png');
console.log('scripts/_f4/_folha-faixas.png pronto');
