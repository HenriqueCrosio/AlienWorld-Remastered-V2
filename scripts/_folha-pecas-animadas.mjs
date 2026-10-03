// A FOLHA EM CENA das peças animadas com o TAMANHO em aberto (03/10): flare aceso, faísca #17, eletrificado #29 e
// queimando #12 — cada uma a 100%, 75% e 50%, animada no ritmo dela, sobre a F2 real (o fundo do GIF da bomba, 2×).
// A redução é a da casa (`_reduzir.mjs`): vizinho mais próximo + alfa binário, mas com o recorte pela UNIÃO dos
// quadros (recortar quadro a quadro faria a peça pular).
// Uso: node scripts/_folha-pecas-animadas.mjs <out.gif>   (precisa do GIF da bomba em folhas/2026-10-03/bomba/)
import fs from 'fs';
import sharp from 'sharp';

const [OUT = 'docs/superpowers/folhas/2026-10-03/pecas/pecas-animadas-tamanhos.gif'] = process.argv.slice(2);
const P = 'docs/superpowers/folhas/2026-10-01/pecas-novas';
const FUNDO = 'docs/superpowers/folhas/2026-10-03/bomba/bomba-de-queda.gif';
const Z = 2; // o fundo é o painel do vácuo do GIF da bomba, a 2×
const ESCALAS = [1, 0.75, 0.5];
// Onde cada peça vai, em pixels do JOGO: o inimigo (drone) está em (200, 108); a nave em (80, 108).
const PECAS = [
  { nome: 'FLARE aceso (16×18)', pasta: 'flare-loop', recorte: [40, 80], ponto: [52, 112] },
  { nome: 'FAÍSCA do acerto #17 (32×32)', pasta: 'rodada4/anim/anim-faisca', recorte: [160, 80], ponto: [193, 108] },
  { nome: 'ELETRIFICADO #29 (21×22)', pasta: 'rodada4/anim/anim-eletrificado', recorte: [160, 80], ponto: [200, 108] },
  { nome: 'QUEIMANDO #12 (8×11)', pasta: 'rodada4/anim/anim-queimando', recorte: [160, 80], ponto: [200, 104] },
];
const CEL = { w: 96, h: 56 }; // a janela do jogo de cada célula

// O quadro 2: a nave PISCA no GIF da bomba (intocável), e no 3 ela some.
const fundo = await sharp(FUNDO, { page: 2 }).extract({ left: 0, top: 22 + 432 + 22, width: 768, height: 432 }).png().toBuffer();

/** Os quadros de uma pasta, recortados pela união e reduzidos a `f` (vizinho + alfa binário). */
async function quadros(pasta, f) {
  const nomes = fs.readdirSync(`${P}/${pasta}`).filter((n) => /^\d+\.png$/.test(n)).sort((a, b) => parseInt(a) - parseInt(b));
  const brutos = await Promise.all(nomes.map((n) => sharp(`${P}/${pasta}/${n}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const { data, info } of brutos)
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++)
        if (data[(y * info.width + x) * 4 + 3] > 40) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const W = Math.max(1, Math.round(w * f)), H = Math.max(1, Math.round(h * f));
  return Promise.all(brutos.map(async ({ data, info }) => {
    const c = await sharp(data, { raw: info }).extract({ left: x0, top: y0, width: w, height: h }).resize(W, H, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < c.data.length; i += 4) c.data[i] = c.data[i] > 110 ? 255 : 0;
    return { buf: await sharp(c.data, { raw: c.info }).resize(W * Z, H * Z, { kernel: 'nearest' }).png().toBuffer(), w: W, h: H };
  }));
}

const celulas = []; // [linha][coluna] = lista de quadros PNG da célula
for (const f of ESCALAS) {
  const linha = [];
  for (const p of PECAS) {
    const base = await sharp(fundo).extract({ left: p.recorte[0] * Z, top: p.recorte[1] * Z, width: CEL.w * Z, height: CEL.h * Z }).png().toBuffer();
    const qs = await quadros(p.pasta, f);
    linha.push(await Promise.all(qs.map((q) => sharp(base).composite([{
      input: q.buf,
      left: Math.round((p.ponto[0] - p.recorte[0] - q.w / 2) * Z),
      top: Math.round((p.ponto[1] - p.recorte[1] - q.h / 2) * Z),
    }]).png().toBuffer())));
  }
  celulas.push(linha);
}

const ROT = 26, ROT_L = 70, GAP = 6;
const CW = CEL.w * Z, CH = CEL.h * Z;
const W = ROT_L + PECAS.length * (CW + GAP), H = ROT + ESCALAS.length * (CH + GAP);
const texto = (t, w, h, cor = '#ffb040') => sharp(Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><text x="4" y="${h - 8}" font-family="Consolas, monospace" font-size="13" fill="${cor}">${t}</text></svg>`)).png().toBuffer();
const rotulos = [
  ...(await Promise.all(PECAS.map(async (p, c) => ({ input: await texto(p.nome, CW, ROT), left: ROT_L + c * (CW + GAP), top: 0 })))),
  ...(await Promise.all(ESCALAS.map(async (f, l) => ({ input: await texto(`${f * 100}%`, ROT_L, CH / 2 + 10, '#e0e6f0'), left: 0, top: ROT + l * (CH + GAP) + CH / 4 })))),
];
const N = 16; // dois ciclos das de 8–9 quadros, a ~10 qps
const saida = [];
for (let i = 0; i < N; i++) {
  const comp = [...rotulos];
  celulas.forEach((linha, l) => linha.forEach((qs, c) => comp.push({ input: qs[i % qs.length], left: ROT_L + c * (CW + GAP), top: ROT + l * (CH + GAP) })));
  saida.push(await sharp({ create: { width: W, height: H, channels: 4, background: '#0b0d14' } }).composite(comp).png().toBuffer());
}
await sharp(saida, { join: { animated: true } }).gif({ delay: Array(N).fill(100), loop: 0 }).toFile(OUT);
// E uma foto parada (o 1º quadro) para quem olha sem tocar o GIF.
await sharp(saida[2]).png().toFile(OUT.replace(/\.gif$/, '.png'));
console.log(OUT, `${W}×${H}`, N, 'quadros');
