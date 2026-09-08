// MOCK DA MOLDURA — a borda da pintura trazida para o plano de jogo (Fatia 7 · Bloco A).
//
// ⚠️ ISTO NÃO É ARTE FINAL E NÃO INSTALA NADA. É um esboço PROCEDURAL para responder uma
// pergunta de ESTRUTURA: "se o chão e o teto forem uma faixa contínua, as colunas param de
// parecer adesivos?". A arte de verdade sai depois, no PixelLab ou da mão dele.
//
// A textura da faixa é a PRÓPRIA pintura, ampliada e escurecida — porque a tese da moldura é
// exatamente essa: a borda já está pintada na `paint-bg-f4-*`, três planos atrás. A moldura só
// traz essa borda para a frente.
//
// ⚠️ A FAIXA É DECORAÇÃO, NÃO COLISÃO. Ela vive fora do corredor: o vão de 110px centrado em
// VAO_Y=108 (y 53..163) nunca é tocado. Quem colide continua sendo a SALIÊNCIA, com a mesma
// `alturaPx` que o roteiro já cospe — então a linha de base [110,110,110] da `probe-stage4`
// segue valendo e nenhuma física nova entra.
import sharp from 'sharp';

const W = 384, H = 216, GROUND_Y = 206, TETO_Y = 10, VAO_Y = 108, GAP = 110, ZOOM = 2;
const FUNDO = 'public/sprites/paint-bg-f4-a.png';
const XS = [78, 196, 314];                 // os três pares que o roteiro cospe na tela

const vaoChao = VAO_Y + GAP / 2;           // 163 — o teto da saliência do chão
const vaoTeto = VAO_Y - GAP / 2;           // 53  — o piso da saliência do teto

// ─── o perfil da faixa ───────────────────────────────────────────────────────────────────────
// ⚠️ Perfil SEGMENTADO, não senoidal. Uma onda lisa lê como "onda"; o que lê como PAREDE é uma
// sequência de placas de larguras diferentes, cada uma num degrau. É o que a costela/o casco
// fazem, e é o que a pintura do fundo já faz nas bordas.
const PLACA = 19;                                   // largura nominal de uma placa
const rnd = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };
const degrau = (x, semente, base, amp) => {
  const i = Math.floor(x / PLACA);
  const a = base + amp * rnd(i + semente);
  const b = base + amp * rnd(i + 1 + semente);
  const t = (x % PLACA) / PLACA;
  // bisel curto na emenda: placa reta no meio, quina nos 18% da borda
  const k = t < 0.18 ? t / 0.18 * 0.5 : t > 0.82 ? 0.5 + (t - 0.82) / 0.18 * 0.5 : 0.5;
  return a + (b - a) * (k * k * (3 - 2 * k));
};
const ondaChao = (x) => degrau(x, 3.1, 10, 15) + 3 * Math.sin(x / 53);
const ondaTeto = (x) => degrau(x, 8.7, 9, 13) + 3 * Math.sin(x / 61 + 1.2);

function superficies(comSaliencia) {
  const chao = new Float64Array(W), teto = new Float64Array(W);
  for (let x = 0; x < W; x++) {
    let c = GROUND_Y - ondaChao(x), t = TETO_Y + ondaTeto(x);
    if (comSaliencia) {
      // ⚠️ MESA, não colina. O topo é CHATO na largura do encaixe e os ombros descem em rampa
      // curta — é o perfil que faz a hitbox ser honesta (o desenho alcança a largura da textura
      // na altura da PONTA) e é o que lê como parede avançando, não como monte de terra.
      for (const cx of XS) {
        const d = Math.abs(x - cx);
        const TOPO = 30, OMBRO = 20;                 // topo chato + rampa
        if (d <= TOPO + OMBRO) {
          const k = d <= TOPO ? 1 : 1 - (d - TOPO) / OMBRO;
          const suave = k * k * (3 - 2 * k);
          c = Math.min(c, c - (c - vaoChao) * suave);
          t = Math.max(t, t + (vaoTeto - t) * suave);
        }
      }
    }
    chao[x] = c; teto[x] = t;
  }
  return { chao, teto };
}

// ─── a folha ─────────────────────────────────────────────────────────────────────────────────
const bgRaw = await sharp(FUNDO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// A textura da faixa: a mesma pintura AMPLIADA 1.7x e escurecida. Escala diferente = não lê como
// cópia do fundo; mesma origem = mesma família de cor, que é a lei que as colunas quebraram.
// ⚠️ O recorte é a BORDA ESQUERDA da pintura — a massa orgânica que ele já pintou como moldura,
// não a pintura inteira. É literalmente "trazer a borda para a frente": mesma mão, mesma família
// de cor, e uma estrutura que já É parede.
const texRaw = await sharp(FUNDO)
  .extract({ left: 0, top: 0, width: 96, height: H })
  .resize(Math.round(W * 1.3), Math.round(H * 1.3), { kernel: 'nearest' })
  .modulate({ brightness: 1.35, saturation: 1.25 }).linear(1.45, -26)
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const BRASA = [255, 122, 60];

function quadro(comSaliencia, comFaixa) {
  const { chao, teto } = superficies(comSaliencia);
  const out = Buffer.from(bgRaw.data);
  if (!comFaixa) return { buf: out, chao, teto };

  const tw = texRaw.info.width, th = texRaw.info.height;
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const dentro = y >= chao[x] || y <= teto[x];
      if (!dentro) continue;
      const i = (y * W + x) * 4;
      const j = (((y + 37) % th) * tw + ((x + 61) % tw)) * 4;
      out[i] = texRaw.data[j]; out[i + 1] = texRaw.data[j + 1]; out[i + 2] = texRaw.data[j + 2];

      // ⚠️ SEM CONTORNO ACESO. Contorno neon é o oposto da lei: luz SÓ onde há energia, e energia
      // é PONTUAL. A borda ganha: (a) uma quina 1px mais clara, que é volume, não luz; (b) uma
      // sombra de queda logo abaixo; (c) brasa em POUCOS pontos, nas emendas entre placas.
      const dist = y >= chao[x] ? y - chao[x] : teto[x] - y;
      const emenda = Math.abs((x % PLACA) - PLACA / 2) > PLACA / 2 - 1.2;   // a costura da placa
      if (dist < 1) {
        for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, out[i + c] * 1.45 + 10);
      } else if (dist < 4) {
        for (let c = 0; c < 3; c++) out[i + c] = out[i + c] * 0.5;
      }
      if (emenda && dist > 1 && dist < 22) {
        for (let c = 0; c < 3; c++) out[i + c] = out[i + c] * 0.62;         // a nervura entre placas
      }
      // A brasa: só nas emendas, e só em 1 de cada 3 delas. Contada, não contínua.
      const idPlaca = Math.floor(x / PLACA);
      if (emenda && rnd(idPlaca + 21) > 0.66 && dist > 2 && dist < 7) {
        const f = 0.75 * (1 - Math.abs(dist - 4.5) / 2.5);
        for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, out[i + c] * (1 - f) + BRASA[c] * f);
      }
    }
  }
  return { buf: out, chao, teto };
}

/** Planta um prop de hoje na SUPERFÍCIE da faixa — não no `GROUND_Y` vazio. É o ponto da folha. */
async function props(base, chao, teto) {
  const HOJE = ['costela', 'orgao', 'maquinario'];
  const comp = [];
  for (let i = 0; i < XS.length; i++) {
    for (const cima of [false, true]) {
      const nome = HOJE[(i + (cima ? 1 : 0)) % 3];
      const y0 = cima ? teto[XS[i]] : chao[XS[i]];
      const alt = cima ? vaoTeto - y0 : y0 - vaoChao;
      if (alt < 14) continue;
      const arq = `public/sprites/${nome}.png`;
      const m = await sharp(arq).metadata();
      const h = Math.round(alt), w = Math.round(m.width * (alt / m.height));
      let b = await sharp(arq).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
      if (cima) b = await sharp(b).flip().png().toBuffer();
      comp.push({ input: b, left: Math.round(XS[i] - w / 2), top: Math.round(cima ? y0 : y0 - h) });
    }
  }
  return sharp(base, { raw: { width: W, height: H, channels: 4 } }).composite(comp).png().toBuffer();
}

const FAIXAS = [
  ['1  HOJE      — a pintura e os props soltos no vao (o que esta no jogo)', false, false, true],
  ['2  MOLDURA   — a borda da pintura trazida para a frente, continua e rolando', false, true, false],
  ['3  + SALIENCIAS — o obstaculo deixa de ser prop e vira a parede avancando (vao 110)', true, true, false],
  ['4  MOLDURA + os props de HOJE plantados NA faixa (ninguem mais flutua)', false, true, true],
];

const ROT = 26, PAD = 8, ZW = W * ZOOM, ZH = H * ZOOM;
const rotulo = (txt, cor) => Buffer.from(
  `<svg width="${ZW}" height="${ROT}"><rect width="${ZW}" height="${ROT}" fill="#0b0f1a"/>` +
  `<text x="10" y="18" font-family="monospace" font-size="15" fill="${cor}">${txt}</text></svg>`);

const partes = [];
for (const [txt, sal, faixa, comProps] of FAIXAS) {
  partes.push(await sharp(rotulo(txt, faixa ? '#ff9a6b' : '#7fe3ff')).png().toBuffer());
  const q = quadro(sal, faixa);
  const png = comProps
    ? await props(q.buf, q.chao, q.teto)
    : await sharp(q.buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
  partes.push(await sharp(png).resize(ZW, ZH, { kernel: 'nearest' }).png().toBuffer());
}

const comp = [];
let y = PAD;
for (let i = 0; i < partes.length; i += 2) {
  comp.push({ input: partes[i], top: y, left: 0 });
  comp.push({ input: partes[i + 1], top: y + ROT, left: 0 });
  y += ROT + ZH + PAD;
}
await sharp({ create: { width: ZW, height: FAIXAS.length * (ROT + ZH) + PAD * (FAIXAS.length + 1), channels: 3, background: '#0b0f1a' } })
  .composite(comp).png().toFile('scripts/_f4/_mock-moldura.png');
console.log('scripts/_f4/_mock-moldura.png pronto — vao 110 preservado, faixa e DECORACAO (sem colisao)');
