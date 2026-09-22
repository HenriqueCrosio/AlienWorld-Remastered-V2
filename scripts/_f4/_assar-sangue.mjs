// O SANGUE DA GARGANTA — gotas, respingo de parede e poça, ASSADOS EM PIXEL na resolução nativa.
//
// ⚠️ NÃO É `Graphics`. A lei que a Fatia 7 pagou caro: efeito de cenário desenhado em vetor no
// motor lê como "gerado" sobre uma fase pintada — o círculo perfeito e a borda antisserrilhada
// denunciam. O `sangue.ts` do predador se safa porque lá é PARTÍCULA de `puff` e mancha de tela,
// nunca peça parada no cenário. Aqui a peça encosta na parede, então ela é pixel.
//
// ⚠️ E O SANGUE DELA NÃO É VERMELHO. Medida a `garganta.png`: 41 cores, o corpo em azul-roxo
// quase preto (#141122, #1b2a39) e a luz só na goela, em magenta (#ad1f5d, #ed2778, #fd4795). Um
// jorro carmim do predador (#5a0508) brigaria com a criatura de onde ele sai — é o mesmo motivo
// pelo qual os cacos são RECORTADOS dela. O sangue aqui é o magenta dela puxado para baixo.
//
//   node scripts/_f4/_assar-sangue.mjs
import sharp from 'sharp';

// A rampa, do fundo ao brilho molhado. Escura por lei do dark sci-fi: luz só onde há energia.
// ⚠️ A 1ª RAMPA ERA ESCURA DEMAIS E SUMIU NA TELA (medido na folha de 22/09: as gotas liam como
// poeira sobre a parede azul, e a bola de fogo do `fx.explode` comia o resto). Dark sci-fi é luz
// SÓ onde há energia — e sangue quente saindo de um corpo que acabou de queimar É energia. A rampa
// subiu um degrau inteiro e continua dentro da paleta dela: o topo (#d9296c) fica ABAIXO do
// #ed2778 que a goela dela já usa.
const SOMBRA = [0x35, 0x0c, 0x26];
const CORPO = [0x6b, 0x12, 0x40];
const CLARO = [0xa3, 0x1a, 0x55];
const UMIDO = [0xd9, 0x29, 0x6c];

let semente = 0x5eed1a37;
const rnd = () => {
  semente ^= semente << 13;
  semente ^= semente >>> 17;
  semente ^= semente << 5;
  return ((semente >>> 0) % 100000) / 100000;
};

/** Uma tela crua RGBA, com `pt` para cravar um pixel. */
const tela = (w, h) => {
  const b = Buffer.alloc(w * h * 4, 0);
  return {
    w,
    h,
    b,
    pt(x, y, cor, a = 255) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = (y * w + x) * 4;
      b[i] = cor[0];
      b[i + 1] = cor[1];
      b[i + 2] = cor[2];
      b[i + 3] = a;
    },
    png: () => sharp(b, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer(),
  };
};

/** Um borrão irregular: disco de raio `r` com a borda mordida, e o brilho molhado em cima. */
const borrao = (t, cx, cy, r, { umido = true, achatar = 1 } = {}) => {
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const dx = (x - cx) / achatar;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r * (0.72 + rnd() * 0.42)) continue;
      t.pt(x, y, d > r * 0.66 ? SOMBRA : CORPO);
    }
  if (!umido || r < 1.6) return;
  // O molhado: um par de px CLARO fora de centro, e no máximo um ÚMIDO. Mais que isso e a gota
  // vira lâmpada — o defeito que o gerador comete sozinho e que este projeto já corrigiu 3 vezes.
  t.pt(cx - r * 0.35, cy - r * 0.42, CLARO);
  if (r >= 2.4) t.pt(cx - r * 0.35 + 1, cy - r * 0.42, CLARO);
  if (r >= 3.2) t.pt(cx - r * 0.3, cy - r * 0.5, UMIDO);
};

// ─── 1 · AS GOTAS ───────────────────────────────────────────────────────────
// Seis calibres. As três primeiras são respingo (2–3px), as três últimas são NACO — é o naco que
// diz "isso saiu de um corpo"; um chuvisco só de pontinhos lê como faísca.
const CEL_W = 16,
  CEL_H = 10;
const RAIOS = [1.0, 1.4, 1.9, 2.6, 3.3, 4.1];
const gotas = [];
for (const r of RAIOS) {
  const t = tela(CEL_W, CEL_H);
  // ⚠️ A GOTA NÃO É CENTRADA NA CÉLULA. Ela fica À DIREITA e a cauda ocupa o resto: numa célula
  // quadrada a cauda do calibre 4,1 caía FORA e as gotas grandes — justamente as que o olho pega —
  // voavam sem direção nenhuma.
  const cx = CEL_W - 5.5,
    cy = CEL_H / 2 - 0.5;
  borrao(t, cx, cy, r, { achatar: 1 + rnd() * 0.5 });
  // A cauda: gota que voa se ESTICA. É o que dá direção a 384x216, onde ela tem 3px e o olho não
  // vê forma, só vetor.
  if (r >= 1.9) {
    const n = Math.round(r * 1.8);
    for (let i = 1; i <= n; i++) {
      t.pt(cx - r - i, cy, SOMBRA);
      if (i <= n / 2 && r >= 3.2) t.pt(cx - r - i, cy + (rnd() < 0.5 ? 1 : -1), SOMBRA);
    }
  }
  gotas.push(await t.png());
}
await sharp({
  create: { width: CEL_W * gotas.length, height: CEL_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(gotas.map((input, i) => ({ input, left: i * CEL_W, top: 0 })))
  .png()
  .toFile('public/sprites/f4-sangue-sheet.png');
console.log(`public/sprites/f4-sangue-sheet.png  ${gotas.length} gotas em ${CEL_W}x${CEL_H}`);

// ─── 2 · O RESPINGO DE PAREDE ───────────────────────────────────────────────
// Quatro manchas que GRUDAM e escorrem. Elas rolam com o mundo, então são cenário: a escorrida
// desce, porque sangue parado obedece à gravidade e mancha que não escorre lê como tinta.
//
// ⚠️ A LINHA `IMPACTO` É UM CONTRATO COM O MOTOR, e ela nasceu de um defeito que ele fotografou:
// *"elas ficam flutuando depois, quero que elas fiquem na borda, como se tivesse jorrado lá"*. A 1ª
// versão desenhava o borrão no MEIO do quadro (tinta de y=8 a y=28, massa em y=12–18) e o motor
// ancorava o TOPO do quadro na superfície — então a mancha nascia 12 a 18px dentro do corredor.
//
// ⚠️ E A SONDA APROVAVA, porque ela media a ÂNCORA contra a parede, e a âncora estava certíssima.
// **Quem promete encostar tem de ser medido pela TINTA, não pelo ponto de origem.** Agora o borrão
// mora na linha `IMPACTO` e o motor põe ESSA linha na superfície; o que está acima dela pinta a
// FACE da parede (é sangue na borda) e o que está abaixo escorre para o corredor.
const RW = 44,
  RH = 28,
  IMPACTO = 4;
const respingos = [];
for (let v = 0; v < 4; v++) {
  const t = tela(RW, RH);
  const cx = 14 + rnd() * 6;
  const cy = IMPACTO;
  borrao(t, cx, cy, 5 + v * 0.9, { achatar: 1.35 });
  // Os satélites, jogados para a DIREITA e para BAIXO: o cone empurra para dentro do núcleo, e o
  // que respinga para cima bate na parede que já está ali.
  const n = 16 + v * 5;
  for (let i = 0; i < n; i++) {
    // Adensado para perto do impacto: satélite espalhado por igual lê como poeira, não como
    // esguicho. A raiz puxa a nuvem para o centro e deixa poucos longe.
    const d = 4 + Math.pow(rnd(), 1.7) * (22 + v * 5);
    const a = rnd() * 1.2 - 0.15;
    borrao(t, cx + d, cy + Math.sin(a) * d * 0.7, 0.9 + rnd() * 1.9, { umido: false });
  }
  // As escorridas, todas a partir da linha do impacto.
  for (let i = 0; i < 3 + v; i++) {
    const x = cx - 4 + rnd() * (14 + v * 4);
    const h = 4 + rnd() * (11 + v * 2);
    for (let y = 0; y < h; y++) t.pt(x, cy + 3 + y, y > h - 3 ? SOMBRA : CORPO);
    t.pt(x, cy + 3 + h, SOMBRA);
  }
  respingos.push(await t.png());
}
await sharp({
  create: { width: RW * respingos.length, height: RH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(respingos.map((input, i) => ({ input, left: i * RW, top: 0 })))
  .png()
  .toFile('public/sprites/f4-respingo-sheet.png');
console.log(`public/sprites/f4-respingo-sheet.png  ${respingos.length} respingos em ${RW}x${RH}, impacto na linha ${IMPACTO}`);

// ─── 3 · A POÇA ─────────────────────────────────────────────────────────────
// O que escorre da carcaça e fica. ⚠️ MESMO CONTRATO: a massa mora na linha `IMPACTO`, e é ELA que
// o motor encosta no chão. Antes o corpo da poça ficava a ~7px do fundo de um quadro de 18 e a peça
// era ancorada pela base — a poça pairava 10px acima do chão.
const PW = 80,
  PH = 14;
const p = tela(PW, PH);
for (let i = 0; i < 9; i++) borrao(p, 10 + i * 7.5 + rnd() * 3, IMPACTO + (rnd() - 0.5) * 2.5, 3.4 + rnd() * 2.2, { achatar: 1.8 });
for (let i = 0; i < 11; i++) {
  const x = 8 + rnd() * (PW - 16);
  const h = 2 + rnd() * 5;
  for (let y = 0; y < h; y++) p.pt(x, IMPACTO + 3 + y, SOMBRA);
}
await sharp(p.b, { raw: { width: PW, height: PH, channels: 4 } }).png().toFile('public/sprites/f4-poca.png');
console.log(`public/sprites/f4-poca.png  ${PW}x${PH}, impacto na linha ${IMPACTO}`);
