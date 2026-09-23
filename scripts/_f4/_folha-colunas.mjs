// FOLHA DE CONTATO — as colunas candidatas do interior (Fatia 7 · Bloco A · Task 4).
//
// ⚠️ NADA AQUI INSTALA ARTE. Este script só DESENHA as candidatas no enquadramento real do
// jogo para o Henrique responder uma pergunta: "dá para achar o vão de relance?".
//
// A geometria é copiada de `spawnCorredores` + `TerrainSystem.spawn`, não inventada:
//   • escala UNIFORME `alturaPx / textura.height`  (TerrainSystem.ts:278)
//   • chão: origem na BASE, plantado em GROUND_Y=206, ângulo −funil
//   • teto: `setFlipY(true)`, origem no TOPO, pendurado em TETO_Y=10, ângulo +funil
//   • o vão sorteado nunca encosta nas bordas (margem 24)
//
// O vão usado é o do APERTO (t=42, gap 76) — o momento mais apertado da fase, que é onde a
// leitura mais importa. O ângulo fica cravado em 9° (o sorteio real é 6..13) para todas as
// candidatas serem comparadas sob a MESMA condição.
import sharp from 'sharp';

const GAME_W = 384, GAME_H = 216, GROUND_Y = 206, TETO_Y = 10;
const GAP = 76, VAO_Y = 108, FUNIL = 9, ZOOM = 2;

const FUNDO = 'public/sprites/paint-bg-f4-a.png';

// Duas folhas, porque são DUAS perguntas diferentes.
//
// A rodada 1 forçou a paleta da própria pintura (`color_image_base64`) e ganhou a FORMA — mas
// pagou com o CONTRASTE: coluna da cor do fundo é coluna que some. A rodada 2 largou a paleta
// forçada e foi atrás de valor.
const CONTROLE = ['HOJE  — costela + orgao (a arte que esta no jogo)', ['costela', 'orgao'], 'public/sprites'];

const FOLHAS = [
  ['_folha-colunas-forma.png', [
    CONTROLE,
    ['1  costela   — casco escuro, costura vermelha, ponta agulha', ['_col-1-costela'], null],
    ['2  costela+tocha — a PONTA ACESA marca onde o vao comeca', ['_col-2-costela-tocha'], null],
    ['3  duto      — segmentado, ponta cega, sem luz', ['_col-3-duto'], null],
    ['4  duto+anel — anel vermelho na boca do duto', ['_col-4-duto-anel'], null],
    ['5  pistao    — maquinario pesado, respiro de brasa no topo', ['_col-5-pistao'], null],
    ['6  lamina    — costela-lamina, a silhueta mais afiada das seis', ['_col-6-lamina'], null],
  ]],
  ['_folha-colunas-contraste.png', [
    CONTROLE,
    ['7  tocha    — corpo inteiro em brasa laranja (o extremo oposto)', ['_col-7-tocha-total'], null],
    ['8  osso     — osso claro, costuras pretas: valor, nao brilho', ['_col-8-osso-claro'], null],
    ['9  ciano    — duto preto com fio de luz fria nas duas bordas', ['_col-9-duto-ciano'], null],
    ['10 aco      — pilar de aco claro, respiro de brasa no topo', ['_col-10-aco-claro'], null],
  ]],
];

/**
 * Planta um sprite como o jogo planta: escala uniforme pela ALTURA, gira em torno da ÂNCORA
 * (base no chão, topo no teto) e devolve o `composite` já posicionado.
 *
 * ⚠️ O `sharp.rotate` gira em torno do CENTRO e expande a tela — por isso a âncora é
 * recalculada à mão. Sem isso a coluna flutua, que é exatamente o defeito que o `body.reset`
 * conserta no motor.
 */
async function planta(arquivo, alturaPx, teto) {
  const meta = await sharp(arquivo).metadata();
  const escala = alturaPx / meta.height;
  const w = Math.round(meta.width * escala), h = Math.round(meta.height * escala);

  let buf = await sharp(arquivo).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
  if (teto) buf = await sharp(buf).flop(false).flip().png().toBuffer(); // flip() = setFlipY

  const ang = teto ? FUNIL : -FUNIL;
  const rot = sharp(buf).rotate(ang, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const bufRot = await rot.png().toBuffer();
  const m = await sharp(bufRot).metadata();

  // A âncora no sprite original: base-centro (chão) ou topo-centro (teto).
  const t = (ang * Math.PI) / 180;
  const dy = teto ? -h / 2 : h / 2;               // vetor centro→âncora, antes de girar
  const ax = m.width / 2 + -dy * Math.sin(t);
  const ay = m.height / 2 + dy * Math.cos(t);
  return { buf: bufRot, ax, ay, w, h };
}

async function quadro(sprites, dir) {
  const base = sharp(FUNDO);
  const meio = GAP / 2;
  const alturaChao = GROUND_Y - (VAO_Y + meio);
  const alturaTeto = VAO_Y - meio - TETO_Y;

  const comp = [];
  // Três pares na tela, como o roteiro cospe no aperto (rate 1.7s).
  const xs = [78, 196, 314];
  for (let i = 0; i < xs.length; i++) {
    const arq = (n) => (dir ? `${dir}/${n}.png` : `scripts/_f4/${n}.png`);
    const nome = sprites[i % sprites.length];
    for (const [alt, teto] of [[alturaChao, false], [alturaTeto, true]]) {
      if (alt < 14) continue;
      const p = await planta(arq(sprites.length > 1 ? sprites[(i + (teto ? 1 : 0)) % sprites.length] : nome), alt, teto);
      comp.push({
        input: p.buf,
        left: Math.round(xs[i] - p.ax),
        top: Math.round((teto ? TETO_Y : GROUND_Y) - p.ay),
      });
    }
  }
  return base.composite(comp).png().toBuffer();
}

const ROT = 26, PAD = 8, W = GAME_W * ZOOM, H = GAME_H * ZOOM;
const rotulo = (txt, cor) =>
  Buffer.from(
    `<svg width="${W}" height="${ROT}"><rect width="${W}" height="${ROT}" fill="#0b0f1a"/>` +
      `<text x="10" y="18" font-family="monospace" font-size="15" fill="${cor}">${txt}</text></svg>`,
  );

for (const [saida, linhas] of FOLHAS) {
  const partes = [];
  for (const [txt, sprites, dir] of linhas) {
    partes.push(await sharp(rotulo(txt, dir ? '#ff9a6b' : '#7fe3ff')).png().toBuffer());
    const q = await quadro(sprites, dir);
    partes.push(await sharp(q).resize(W, H, { kernel: 'nearest' }).png().toBuffer());
  }

  const alturaTotal = linhas.length * (ROT + H) + PAD * (linhas.length + 1);
  const comp = [];
  let y = PAD;
  for (let i = 0; i < partes.length; i += 2) {
    comp.push({ input: partes[i], top: y, left: 0 });
    comp.push({ input: partes[i + 1], top: y + ROT, left: 0 });
    y += ROT + H + PAD;
  }

  await sharp({ create: { width: W, height: alturaTotal, channels: 3, background: '#0b0f1a' } })
    .composite(comp)
    .png()
    .toFile(`scripts/_f4/${saida}`);
  console.log(`scripts/_f4/${saida} pronto — vao ${GAP}px, funil ${FUNIL}deg, zoom ${ZOOM}x`);
}
