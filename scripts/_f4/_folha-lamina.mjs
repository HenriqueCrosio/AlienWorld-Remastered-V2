// FOLHA DE CONTATO — a lamina larga MISTURADA com os três props de hoje.
// (Fatia 7 · Bloco A · Task 4 · Passo 6)
//
// ⚠️ NADA AQUI INSTALA ARTE.
//
// A pergunta desta folha NÃO é mais "qual das dez?". Ele já respondeu isso: a 6, bem grande,
// entrando no sorteio JUNTO com `costela`/`orgao`/`maquinario` — e só na parte LARGA da fase.
// Então a pergunta virou: **"a lamina grande convive com os três de hoje na mesma tela?"**
// Por isso a faixa de baixo é MISTA, não uma faixa só da lamina.
//
// O vão é o da PARTE LARGA (gap 110, `corredor` de t=1 no StageDirector), não o do aperto de 76:
// o aperto ganha assets próprios no Bloco C — fronteira cravada por ele em 07/09.
//
// A geometria é copiada de `spawnCorredores` + `TerrainSystem.spawn`, não inventada:
//   • escala UNIFORME `alturaPx / textura.height`  (TerrainSystem.ts:278)
//   • chão: origem na BASE, plantado em GROUND_Y=206, ângulo −funil
//   • teto: `setFlipY(true)`, origem no TOPO, pendurado em TETO_Y=10, ângulo +funil
//
//   node scripts/_f4/_folha-lamina.mjs scripts/_f4/_lam-X.png
import sharp from 'sharp';

const GAME_W = 384, GAME_H = 216, GROUND_Y = 206, TETO_Y = 10;
const VAO_Y = 108, FUNIL = 9, ZOOM = 2;
const FUNDO = 'public/sprites/paint-bg-f4-a.png';   // a câmara da PARTE LARGA (t < 40)

const LAMINAS = process.argv.slice(2);
if (!LAMINAS.length) { console.error('uso: node scripts/_f4/_folha-lamina.mjs <lamina.png> [outra.png ...]'); process.exit(1); }

const H = (n) => `public/sprites/${n}.png`;
const HOJE = [H('costela'), H('orgao'), H('maquinario')];
const nome = (f) => f.split(/[\/]/).pop().replace(/\.png$/, '');

// Seis encaixes por quadro: 3 pares (chão, teto). A faixa MISTA põe a candidata em 2 dos 6 — mais
// ou menos o peso que ela teria num sorteio de quatro nomes.
const FAIXAS = [
  ['HOJE  — o sorteio de hoje: costela / orgao / maquinario   (gap 110, a parte LARGA)', 110,
    [HOJE[0], HOJE[1], HOJE[1], HOJE[2], HOJE[2], HOJE[0]], false],
];
for (const L of LAMINAS) {
  FAIXAS.push([`MISTO — ${nome(L)} entra no sorteio JUNTO com os tres   (gap 110)`, 110,
    [L, HOJE[1], HOJE[0], L, HOJE[2], HOJE[0]], true]);
  FAIXAS.push([`MISTO — ${nome(L)} no segundo trecho largo   (gap 96, t=15)`, 96,
    [HOJE[1], L, HOJE[2], HOJE[0], L, HOJE[1]], true]);
}

/**
 * Planta um sprite como o jogo planta: escala uniforme pela ALTURA, gira em torno da ÂNCORA
 * (base no chão, topo no teto).
 *
 * ⚠️ O `sharp.rotate` gira em torno do CENTRO e expande a tela — a âncora é recalculada à mão.
 * Sem isso a coluna flutua, que é o defeito que o `body.reset` conserta no motor.
 *
 * ⚠️ O `trim` não é enfeite: é como a textura vai entrar. Aparar na largura do DESENHO conserta
 * de uma vez a hitbox que sai da textura e a folga na base que faz a coluna flutuar.
 */
async function planta(arquivo, alturaPx, teto) {
  const src = await sharp(arquivo).trim({ threshold: 1 }).png().toBuffer();
  const meta = await sharp(src).metadata();
  const escala = alturaPx / meta.height;
  const w = Math.round(meta.width * escala), h = Math.round(meta.height * escala);

  let buf = await sharp(src).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
  if (teto) buf = await sharp(buf).flip().png().toBuffer();      // flip() = setFlipY

  const ang = teto ? FUNIL : -FUNIL;
  const bufRot = await sharp(buf).rotate(ang, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const m = await sharp(bufRot).metadata();

  const t = (ang * Math.PI) / 180;
  const dy = teto ? -h / 2 : h / 2;                 // vetor centro→âncora, antes de girar
  return { buf: bufRot, ax: m.width / 2 + -dy * Math.sin(t), ay: m.height / 2 + dy * Math.cos(t) };
}

async function quadro(gap, seis) {
  const meio = gap / 2;
  const alturaChao = GROUND_Y - (VAO_Y + meio);
  const alturaTeto = VAO_Y - meio - TETO_Y;
  const xs = [78, 196, 314];

  const comp = [];
  for (let i = 0; i < xs.length; i++) {
    for (const [alt, teto, arq] of [[alturaChao, false, seis[i * 2]], [alturaTeto, true, seis[i * 2 + 1]]]) {
      if (alt < 14) continue;
      const p = await planta(arq, alt, teto);
      comp.push({ input: p.buf, left: Math.round(xs[i] - p.ax), top: Math.round((teto ? TETO_Y : GROUND_Y) - p.ay) });
    }
  }
  return sharp(FUNDO).composite(comp).png().toBuffer();
}

const ROT = 26, PAD = 8, W = GAME_W * ZOOM, HH = GAME_H * ZOOM;
const rotulo = (txt, cor) => Buffer.from(
  `<svg width="${W}" height="${ROT}"><rect width="${W}" height="${ROT}" fill="#0b0f1a"/>` +
  `<text x="10" y="18" font-family="monospace" font-size="15" fill="${cor}">${txt}</text></svg>`);

const partes = [];
for (const [txt, gap, seis, mista] of FAIXAS) {
  partes.push(await sharp(rotulo(txt, mista ? '#ff9a6b' : '#7fe3ff')).png().toBuffer());
  partes.push(await sharp(await quadro(gap, seis)).resize(W, HH, { kernel: 'nearest' }).png().toBuffer());
}

const comp = [];
let y = PAD;
for (let i = 0; i < partes.length; i += 2) {
  comp.push({ input: partes[i], top: y, left: 0 });
  comp.push({ input: partes[i + 1], top: y + ROT, left: 0 });
  y += ROT + HH + PAD;
}
await sharp({ create: { width: W, height: FAIXAS.length * (ROT + HH) + PAD * (FAIXAS.length + 1), channels: 3, background: '#0b0f1a' } })
  .composite(comp).png().toFile('scripts/_f4/_folha-lamina.png');
console.log(`scripts/_f4/_folha-lamina.png pronto — ${LAMINAS.map(nome).join(', ')}, funil ${FUNIL}deg, zoom ${ZOOM}x`);
