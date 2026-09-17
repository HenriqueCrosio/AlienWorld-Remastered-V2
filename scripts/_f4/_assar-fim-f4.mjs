// ASSA A MORTE DO PREDADOR (B3, rodada 5) — a rachadura do piso e a poça de lava, em PIXEL, na RESOLUÇÃO
// NATIVA (384 de largura, escala 1). Nada aqui é desenhado com `Graphics` em tempo de jogo: a 1ª versão saiu
// *"gerada e sem custos"* (17/09) porque era traço vetorial antisserrilhado e uma faixa amarela lisa.
//
// A LEI DA PALETA: as cores saem da PRÓPRIA faixa do chão da arena (`public/sprites/f4-faixa-d.png`, 42 cores) —
// azuis quase pretos com frisos vermelho-escuros. A lava é a MESMA família, só com três degraus quentes a mais, e
// o que brilha ocupa pouca área (a lei do dark sci-fi: luz só onde há energia).
//
//   node scripts/_f4/_assar-fim-f4.mjs
//
// Sai em `public/sprites/`:
//   f4-racha-sheet.png     6 estágios × 384×30 — o metal RASGANDO (lábio claro em cima, sombra embaixo,
//                          o vão abrindo no meio e o brilho de dentro)
//   f4-lava-sheet.png      8 quadros × 384×36 — a poça: CROSTA escura em placas (Voronoi) com as costuras
//                          acesas, a crista na superfície e o fundo esfriando. Emenda fechada em x.
//   f4-destroco.png        4 × 12×10 — lascas de placa arrancadas (para voarem no estouro)
import fs from 'node:fs';
import sharp from 'sharp';

const W = 384;
const OUT = 'public/sprites';

// ─── A PALETA (da faixa do chão + 3 degraus quentes) ───
const P = {
  vazio: [0, 2, 11],
  placaFundo: [5, 12, 24],
  placa: [13, 25, 38],
  placaAlta: [31, 49, 68],
  brasaFria: [58, 4, 8],
  brasa: [99, 0, 10],
  brasaMedia: [132, 0, 8],
  brasaViva: [147, 32, 40],
  quente: [196, 52, 26],
  maisQuente: [232, 100, 31],
  crista: [255, 176, 74],
};

const criar = (w, h) => ({ w, h, buf: Buffer.alloc(w * h * 4, 0) });
const por = (im, x, y, cor, a = 255) => {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= im.w || y >= im.h) return;
  const i = (y * im.w + x) * 4;
  im.buf[i] = cor[0];
  im.buf[i + 1] = cor[1];
  im.buf[i + 2] = cor[2];
  im.buf[i + 3] = a;
};
const gravar = async (im, arquivo) => {
  await sharp(im.buf, { raw: { width: im.w, height: im.h, channels: 4 } }).png().toFile(arquivo);
  console.log(arquivo, `${im.w}×${im.h}`);
};
/**
 * O DEGRAU DITHERIZADO: leva `calor` (0..1) para a escada de brasas, costurando cada par de degraus com um
 * Bayer 2×2. É o que transforma uma mancha chapada de vermelho em magma com textura.
 */
const ESCADA = ['brasa', 'brasaMedia', 'brasaViva', 'quente', 'maisQuente', 'crista'];
const BAYER = [
  [0.25, 0.75],
  [1.0, 0.5],
];
const degrau = (calor, x, y) => {
  const v = presa(calor) * (ESCADA.length - 1);
  const i = Math.floor(v);
  const frac = v - i;
  const limiar = BAYER[y & 1][x & 1];
  const j = Math.min(ESCADA.length - 1, i + (frac > limiar ? 1 : 0));
  return P[ESCADA[j]];
};
/** Prende em 0..1. */
const presa = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Ruído de hash — determinístico e periódico em x (a emenda da faixa fecha). */
const hash = (x, y, s = 0) => {
  const n = Math.sin(((x % W) + 1) * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453;
  return n - Math.floor(n);
};

// ═══ 1. A RACHADURA — o metal RASGANDO ═══
// Uma fenda principal que corre pela faixa com galhos, e um VÃO que abre no meio (onde o corpo caiu). O que
// faz ler como metal e não como risco: o LÁBIO de cima (1px claro, a placa levantando) e a SOMBRA de baixo.
const ESTAGIOS = 6;
const H_RACHA = 30;

const caminho = (x0, y0, passos, amp, semente) => {
  const pontos = [{ x: x0, y: y0 }];
  let x = x0;
  let y = y0;
  for (let i = 0; i < passos; i++) {
    x += 1;
    y += (hash(x, i, semente) - 0.5) * amp;
    pontos.push({ x, y });
  }
  return pontos;
};

const assarRacha = async () => {
  const centro = W / 2;
  // A fenda principal: sai do centro para os dois lados, subindo e descendo dentro da faixa.
  const dir = caminho(centro, 9, W / 2, 1.5, 1);
  const esq = caminho(centro, 9, W / 2, 1.5, 2).map((p) => ({ x: centro - (p.x - centro), y: p.y }));
  const principal = [...esq.reverse(), ...dir];
  // Os galhos: saem da principal em diagonal e morrem em 6..18px.
  const galhos = [];
  for (let i = 0; i < 20; i++) {
    const base = principal[Math.floor(hash(i, 7, 3) * principal.length)];
    const n = 10 + Math.floor(hash(i, 11, 4) * 16);
    const dy = hash(i, 13, 5) < 0.5 ? -1 : 1;
    const g = [];
    let x = base.x;
    let y = base.y;
    for (let j = 0; j < n; j++) {
      x += hash(i, j, 6) < 0.5 ? -1 : 1;
      y += dy * (0.4 + hash(i, j, 7) * 0.5);
      g.push({ x, y });
    }
    galhos.push(g);
  }

  for (let e = 0; e < ESTAGIOS; e++) {
    const k = (e + 1) / ESTAGIOS;
    const im = criar(W, H_RACHA);
    // Quanto da fenda já correu (do centro para fora) e quanto o vão já abriu.
    const alcance = (W / 2) * Math.min(1, k * 1.35);
    const abertura = Math.max(0, k - 0.25) * 13;

    const traçar = (pontos, largura, brilho) => {
      for (const p of pontos) {
        const d = Math.abs(p.x - centro);
        if (d > alcance) continue;
        // O vão é largo no centro e some nas pontas.
        const perto = Math.max(0, 1 - d / 110) ** 0.7;
        const meia = Math.max(0.5, (largura + abertura * perto) / 2);
        const topo = Math.round(p.y - meia);
        const base = Math.round(p.y + meia);
        for (let y = topo; y <= base; y++) {
          // Dentro do vão: o breu, e o fundo acendendo conforme abre.
          const fundo = (y - topo) / Math.max(1, base - topo);
          // O VÃO é breu na boca e ACENDE NO FUNDO (o calor vem de baixo), mais forte a cada estágio.
          let cor = P.vazio;
          if (brilho && meia > 1.2) {
            if (fundo > 0.78) cor = k > 0.7 ? P.maisQuente : P.quente;
            else if (fundo > 0.58) cor = k > 0.7 ? P.quente : P.brasaMedia;
            else if (fundo > 0.4) cor = k > 0.55 ? P.brasaMedia : P.brasa;
            else if (fundo > 0.26) cor = P.brasaFria;
          }
          por(im, p.x, y, cor);
        }
        // O LÁBIO: a placa LEVANTA de um lado (dois px claros) e joga sombra do outro — é isso que faz ler como
        // chapa arrancada, e não como risco de lápis.
        por(im, p.x, topo - 1, hash(p.x, 3, 8) > 0.3 ? P.placaAlta : P.placa);
        if (meia > 1.6 && hash(p.x, 5, 14) > 0.45) por(im, p.x, topo - 2, P.placa);
        por(im, p.x, base + 1, P.vazio);
        por(im, p.x, base + 2, P.placaFundo);
        // Fagulhas presas na greta, só quando já abriu.
        if (k > 0.5 && hash(p.x, e, 9) > 0.93) por(im, p.x, topo - 2, P.brasaViva);
      }
    };

    for (const g of galhos) traçar(g, 1, false);
    traçar(principal, 1.2, true);

    // Os DENTES do rasgo: lascas de placa viradas para dentro do vão, no trecho mais aberto.
    if (k > 0.55) {
      for (let i = 0; i < 26; i++) {
        const x = centro + (hash(i, e, 10) - 0.5) * 150;
        const p = principal[Math.round(x - principal[0].x)];
        if (!p) continue;
        const alto = 4 + Math.floor(hash(i, e, 11) * 4);
        const cima = hash(i, e, 12) > 0.5;
        for (let j = 0; j < alto; j++) {
          const y = cima ? p.y - 2 - j : p.y + 2 + j;
          for (let dx = 0; dx <= Math.max(0, alto - j - 1); dx++) por(im, x + dx, y, j === 0 ? P.placaAlta : P.placa);
        }
      }
    }
    await gravar(im, `${OUT}/f4-racha-${e}.png`);
  }

  // A folha: os 6 estágios empilhados em COLUNA (o motor lê como quadros de 384×30).
  const folha = criar(W, H_RACHA * ESTAGIOS);
  for (let e = 0; e < ESTAGIOS; e++) {
    const { data } = await sharp(`${OUT}/f4-racha-${e}.png`).raw().toBuffer({ resolveWithObject: true });
    data.copy(folha.buf, e * W * H_RACHA * 4);
    fs.unlinkSync(`${OUT}/f4-racha-${e}.png`);
  }
  await gravar(folha, `${OUT}/f4-racha-sheet.png`);
};

// ═══ 2. A LAVA — crosta em placas com as costuras acesas ═══
// A crosta é um VORONOI: cada placa é o pedaço mais perto de uma semente. Onde duas placas se encostam, a
// costura ACENDE (é por ali que o calor sobe). As sementes andam para a esquerda a cada quadro, então a poça
// escorre no mesmo sentido do cenário — o chão nunca mais "passa embaixo" de um corpo parado.
const H_LAVA = 36;
const QUADROS = 8;
/** Mais sementes = placas menores. Com 26 a crosta lia GRANDE demais para uma faixa de 26px (17/09). */
const SEMENTES = 44;
/** A espessura da costura acesa (e a da boca dela na superfície). Medidas pela ÁREA que acendem — ver o assador. */
const LIMIAR_COSTURA = 0.55;
const LIMIAR_BOCA = 0.16;

const assarLava = async () => {
  const folha = criar(W, H_LAVA * QUADROS);
  const base = [];
  for (let i = 0; i < SEMENTES; i++) base.push({ x: hash(i, 1, 20) * W, y: 4 + hash(i, 2, 21) * (H_LAVA - 6) });

  for (let q = 0; q < QUADROS; q++) {
    const desloca = (q * W) / (QUADROS * 6); // a crosta anda 8px no ciclo inteiro
    const fase = (q / QUADROS) * Math.PI * 2;
    const sementes = base.map((s, i) => ({
      x: (s.x - desloca + W) % W,
      y: s.y + Math.sin(fase + i) * 0.8,
    }));

    for (let y = 0; y < H_LAVA; y++) {
      // A superfície ondula 2px e é QUANTIZADA no pixel (seno liso lê como vetor).
      for (let x = 0; x < W; x++) {
        const onda = Math.round(Math.sin(fase + x * 0.07) * 1.5 + Math.sin(fase * 0.6 + x * 0.021) * 1.2);
        const topo = 3 + onda;
        if (y < topo) continue;

        // As duas sementes mais perto (com a distância dando a volta pela emenda).
        let d1 = 1e9;
        let d2 = 1e9;
        for (const s of sementes) {
          let dx = Math.abs(x - s.x);
          if (dx > W / 2) dx = W - dx;
          const d = dx * dx * 0.55 + (y - s.y) * (y - s.y) * 2.4;
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) d2 = d;
        }
        // `costura` alto = bem no meio de uma placa; baixo = na divisa entre duas. ⚠️ A diferença CRUA entre as
        // duas distâncias engorda onde as sementes estão longe uma da outra, e vira borrão vermelho chapado.
        // Dividir pela distância à semente mais perto mantém a costura com a MESMA espessura na poça inteira.
        const r1 = Math.sqrt(d1);
        const costura = (Math.sqrt(d2) - r1) / (1.6 + r1 * 0.3);
        const fundura = (y - topo) / (H_LAVA - topo);
        const ruido = hash(x, y, q) * 0.5;
        const pulso = 0.6 + 0.4 * Math.sin(fase * 2 + x * 0.05 + y * 0.2);

        // ⚠️ A CRISTA NÃO É UMA TIRA. A 1ª assada pintou a linha inteira de laranja e leu como fita colada: a
        // superfície de uma poça com crosta é ESCURA, e só acende onde uma COSTURA chega nela.
        const naCostura = costura < LIMIAR_COSTURA + ruido * 0.08;
        // Na SUPERFÍCIE a costura tem de ser bem estreita para acender: uma crista acesa de ponta a ponta é
        // exatamente a "fita colada" da 1ª versão.
        const bocaQuente = costura < LIMIAR_BOCA + ruido * 0.05;
        let cor;
        if (y === topo) {
          cor = bocaQuente ? (pulso > 0.8 ? P.crista : P.maisQuente) : ruido > 0.7 ? P.placaAlta : P.placa;
        } else if (y === topo + 1) {
          cor = bocaQuente ? P.quente : naCostura ? P.brasaFria : ruido > 0.5 ? P.placa : P.placaFundo;
        } else if (naCostura) {
          // O MAGMA entre as placas. Três coisas o tiram do chapado: ele esfria com a fundura, esfria ao chegar
          // na borda da placa, e os degraus da paleta são costurados com DITHER ordenado (Bayer 2×2) — sem isso
          // o vermelho vira mancha de balde de tinta.
          const daBorda = 1 - costura / (LIMIAR_COSTURA + ruido * 0.08);
          const calor = (1 - fundura * 0.8) * pulso * (0.45 + 0.55 * daBorda);
          cor = degrau(calor, x, y);
        } else if (costura < (LIMIAR_COSTURA + ruido * 0.08) * 1.35) {
          // O RIM: o fio escuro na beirada da placa, onde a crosta esfriou encostada no magma. É ele que dá
          // volume às ilhas — sem o rim, a placa parece recortada com tesoura.
          cor = P.vazio;
        } else {
          // A PLACA de crosta: fria, da paleta do próprio chão.
          const alto = costura > 1.5 && ruido > 0.32;
          cor = alto ? P.placa : fundura > 0.7 ? P.vazio : P.placaFundo;
          // Um respingo aceso de vez em quando: a placa rachando por dentro.
          if (ruido > 0.46 && costura < 0.75) cor = P.brasaFria;
        }
        por(folha, x, q * H_LAVA + y, cor);
      }
    }
  }
  await gravar(folha, `${OUT}/f4-lava-sheet.png`);
};

// ═══ 3. OS DESTROÇOS — lascas de placa arrancadas ═══
const assarDestrocos = async () => {
  const w = 12;
  const h = 10;
  const im = criar(w * 4, h);
  for (let d = 0; d < 4; d++) {
    const lw = 6 + Math.floor(hash(d, 1, 30) * 5);
    const lh = 4 + Math.floor(hash(d, 2, 31) * 4);
    const ox = d * w + Math.floor((w - lw) / 2);
    const oy = Math.floor((h - lh) / 2);
    for (let y = 0; y < lh; y++) {
      for (let x = 0; x < lw; x++) {
        // Bordas mordidas: o canto some quando o ruído manda.
        const borda = x === 0 || y === 0 || x === lw - 1 || y === lh - 1;
        if (borda && hash(x + d * 9, y, 32) > 0.62) continue;
        const cor = y === 0 ? P.placaAlta : y === lh - 1 ? P.brasa : hash(x, y + d, 33) > 0.7 ? P.placa : P.placaFundo;
        por(im, ox + x, oy + y, cor);
      }
    }
  }
  await gravar(im, `${OUT}/f4-destroco.png`);
};

await assarRacha();
await assarLava();
await assarDestrocos();
