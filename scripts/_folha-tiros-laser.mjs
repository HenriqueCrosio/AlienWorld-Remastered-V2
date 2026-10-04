// A FOLHA DOS TIROS LASER (04/10, ele: *"estou achando os tiros base das naves (ambas) muito grossos e
// desproporcionais, precisamos deixá-los mais com cara de tiro laser"* — desenho à mão, como o tiro do drone). Quatro
// conceitos por linhagem, desenhados pixel a pixel nas cores de cada uma, em CENA: o fundo real da F2, a nave e uma
// rajada saindo dela, ampliados sem suavizar. Linha de cima = o tiro de HOJE, para comparar.
// Uso, da raiz: node scripts/_folha-tiros-laser.mjs   → folhas/2026-10-04/tiros/ (+ os PNGs de cada conceito)
import fs from 'fs';
import sharp from 'sharp';

const OUT = 'docs/superpowers/folhas/2026-10-04/tiros';
fs.mkdirSync(OUT, { recursive: true });
const Z = 4;

/** Um tiro a partir de LINHAS de pixels: cada linha é uma lista de cores (hex) ou `null` (vazio). */
const tiro = (linhas) => ({ w: Math.max(...linhas.map((l) => l.length)), h: linhas.length, linhas });
const rep = (cor, n) => Array(n).fill(cor);
const _ = null;

// HUMANA — o traçante quente (as cores de hoje: cauda vermelha, corpo laranja, ponta clara).
const H = { cauda: 'b2321e', corpo: 'ff7a2a', ponta: 'ffd9a0', brasa: 'fff3e0', aro: '6e1a10' };
// ALIEN — a energia da manta (a rampa do cone alien e do míssil repintado).
const A = { cauda: '0e6b7a', corpo: '10ad9f', claro: '54fad2', ponta: 'e2feff', aro: '0a3d3a' };

const CONCEITOS = {
  humana: [
    { nome: 'HOJE — traçante 8×1 + o halo', hoje: true },
    { nome: 'A · FIO 10×1 — a de hoje, mais comprida, sem halo', t: tiro([[...rep(H.cauda, 3), ...rep(H.corpo, 4), ...rep(H.ponta, 2), H.brasa]]) },
    { nome: 'B · RISCO 14×1 — longo, esfriando em degraus', t: tiro([[...rep(H.aro, 2), ...rep(H.cauda, 3), ...rep(H.corpo, 5), ...rep(H.ponta, 3), H.brasa]]) },
    { nome: 'C · FEIXE 12×3 — núcleo claro, aro escuro', t: tiro([[_, _, ...rep(H.aro, 8)], [...rep(H.cauda, 2), ...rep(H.corpo, 5), ...rep(H.ponta, 4), H.brasa], [_, _, ...rep(H.aro, 8)]]) },
    { nome: 'D · AGULHA 12×1 — só a ponta acesa, corpo escuro', t: tiro([[...rep(H.aro, 4), ...rep(H.cauda, 4), H.corpo, H.corpo, H.ponta, H.brasa]]) },
  ],
  alien: [
    { nome: 'HOJE — pulso 11×6 (tingido)', hoje: true },
    { nome: 'A · FIO 10×1 — energia, sem halo', t: tiro([[...rep(A.cauda, 3), ...rep(A.corpo, 3), ...rep(A.claro, 3), A.ponta]]) },
    { nome: 'B · RISCO 14×1 — longo, em degraus', t: tiro([[...rep(A.aro, 2), ...rep(A.cauda, 3), ...rep(A.corpo, 4), ...rep(A.claro, 4), A.ponta]]) },
    { nome: 'C · FEIXE 12×3 — núcleo claro, aro escuro', t: tiro([[_, _, ...rep(A.aro, 8)], [...rep(A.cauda, 2), ...rep(A.corpo, 4), ...rep(A.claro, 5), A.ponta], [_, _, ...rep(A.aro, 8)]]) },
    { nome: 'D · GOTA 9×3 — o pulso afinado, cabeça redonda', t: tiro([[_, _, _, _, ...rep(A.corpo, 3), A.claro, _], [...rep(A.cauda, 3), ...rep(A.corpo, 2), ...rep(A.claro, 2), A.ponta, A.ponta], [_, _, _, _, ...rep(A.corpo, 3), A.claro, _]]) },
  ],
};

// A RODADA 2 (ele: *"quero um tiro mais fino"* — os de 10–14px AUMENTAVAM o de hoje, 8×1): todos com 1px de altura
// (o mínimo da resolução do mundo) e 7–8px de comprimento (o drone é 6×1 e o da nave tem de ser um pouco maior). O
// "fino" vem de quantos pixels ACENDEM: a ponta clara, o resto apagando. `RODADA=2 node scripts/_folha-tiros-laser.mjs`.
const CONCEITOS2 = {
  humana: [
    { nome: 'HOJE — traçante 8×1 (em jogo + o halo)', hoje: true },
    { nome: 'E · PONTA 8×1 — o tamanho de hoje, só a ponta acesa', t: tiro([[...rep(H.aro, 3), ...rep(H.cauda, 2), H.corpo, H.ponta, H.brasa]]) },
    { nome: 'F · CURTO 7×1 — um pixel a menos, aceso', t: tiro([[...rep(H.cauda, 2), ...rep(H.corpo, 2), H.ponta, H.ponta, H.brasa]]) },
    { nome: 'G · BRASA 7×1 — curto e só a ponta acesa', t: tiro([[...rep(H.aro, 3), H.cauda, H.corpo, H.ponta, H.brasa]]) },
  ],
  alien: [
    { nome: 'HOJE — pulso 11×6 (tingido)', hoje: true },
    { nome: 'E · PONTA 8×1 — só a ponta acesa', t: tiro([[...rep(A.aro, 3), ...rep(A.cauda, 2), A.corpo, A.claro, A.ponta]]) },
    { nome: 'F · CURTO 7×1 — aceso', t: tiro([[...rep(A.cauda, 2), ...rep(A.corpo, 2), A.claro, A.claro, A.ponta]]) },
    { nome: 'G · BRASA 7×1 — curto e só a ponta acesa', t: tiro([[...rep(A.aro, 3), A.cauda, A.corpo, A.claro, A.ponta]]) },
  ],
};
const RODADA = process.env.RODADA === '2' ? 2 : 1;

const png = async (t) => {
  const buf = Buffer.alloc(t.w * t.h * 4);
  t.linhas.forEach((l, y) =>
    l.forEach((hex, x) => {
      if (!hex) return;
      const k = (y * t.w + x) * 4;
      buf[k] = parseInt(hex.slice(0, 2), 16);
      buf[k + 1] = parseInt(hex.slice(2, 4), 16);
      buf[k + 2] = parseInt(hex.slice(4, 6), 16);
      buf[k + 3] = 255;
    }),
  );
  return sharp(buf, { raw: { width: t.w, height: t.h, channels: 4 } }).png().toBuffer();
};

// O tiro de HOJE, como o jogo o desenha (BootScene): o traçante 8×1 e o pulso 11×6 tingido de 0x5ef2d8.
const HOJE = {
  humana: tiro([[...rep(H.cauda, 3), H.corpo, H.corpo, H.corpo, H.ponta, H.ponta]]),
  // A cápsula do pulso multiplicada pelo tint da base alien (0x5ef2d8): o que aparece na tela.
  alien: (() => {
    const t = (hex, a) => {
      const c = [0, 2, 4].map((i, j) => Math.round((parseInt(hex.slice(i, i + 2), 16) * [0x5e, 0xf2, 0xd8][j]) / 255));
      return a < 1 ? `${c.map((v) => Math.round(v * a).toString(16).padStart(2, '0')).join('')}` : c.map((v) => v.toString(16).padStart(2, '0')).join('');
    };
    const fundo = t('3ee0f0', 0.2), ciano = t('3ee0f0', 1), claro = t('b5f7ff', 1), branco = t('ffffff', 1);
    return tiro([
      [],
      rep(fundo, 11),
      [fundo, ...rep(ciano, 2), ...rep(claro, 4), ...rep(branco, 4)],
      [fundo, ...rep(ciano, 10)],
      rep(fundo, 11),
      [],
    ]);
  })(),
};

// O FUNDO: a F2 real (o 2º quadro do GIF da bomba, 2×, sem a nave nesta faixa) reduzido a 1×.
const FUNDO = 'docs/superpowers/folhas/2026-10-03/bomba/bomba-de-queda.gif';
const fundo = await sharp(FUNDO, { page: 2 }).extract({ left: 0, top: 22 + 432 + 22, width: 768, height: 432 }).resize(384, 216, { kernel: 'nearest' }).png().toBuffer();
const JANELA = { x: 30, y: 30, w: 230, h: 30 };
const NAVE = { humana: 'public/sprites/ship-jato.png', alien: 'public/sprites/naves/alien-t1.png' };

const ROT = 22;
const paineis = [];
for (const [linhagem, lista] of Object.entries(RODADA === 2 ? CONCEITOS2 : CONCEITOS)) {
  const nave = await sharp(NAVE[linhagem]).png().toBuffer();
  const nm = await sharp(nave).metadata();
  for (const c of lista) {
    const t = c.hoje ? HOJE[linhagem] : c.t;
    const img = await png(t);
    const y = Math.round(JANELA.h / 2);
    const naveX = 4;
    const boca = naveX + nm.width - 2;
    // A rajada: quatro tiros saindo da nave, espaçados como na cadência de hoje (4,5/s a ~400px/s ≈ 90px — aqui
    // aproximado em 50px para caber três na janela).
    const comp = [{ input: nave, left: naveX, top: y - Math.round(nm.height / 2) }];
    for (const dx of [8, 58, 108, 158]) comp.push({ input: img, left: boca + dx, top: y - Math.floor(t.h / 2) });
    const cena = await sharp(fundo).extract({ left: JANELA.x, top: JANELA.y, width: JANELA.w, height: JANELA.h }).composite(comp).png().toBuffer();
    const grande = await sharp(cena).resize(JANELA.w * Z, JANELA.h * Z, { kernel: 'nearest' }).png().toBuffer();
    const rot = await sharp(Buffer.from(`<svg width="${JANELA.w * Z}" height="${ROT}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="16" font-family="Consolas, monospace" font-size="14" fill="${c.hoje ? '#8a93a6' : '#ffb040'}">${linhagem.toUpperCase()} · ${c.nome}</text></svg>`)).png().toBuffer();
    paineis.push(rot, grande);
    if (!c.hoje) await sharp(img).toFile(`${OUT}/${linhagem}-${c.nome[0]}.png`);
  }
}
const alturas = await Promise.all(paineis.map(async (p) => (await sharp(p).metadata()).height));
let topo = 0;
const comp = paineis.map((input, i) => {
  const c = { input, left: 0, top: topo };
  topo += alturas[i] + (i % 2 ? 6 : 0);
  return c;
});
await sharp({ create: { width: JANELA.w * Z, height: topo, channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(`${OUT}/tiros-laser${RODADA === 2 ? '-2' : ''}.png`);
console.log(`${OUT}/tiros-laser${RODADA === 2 ? '-2' : ''}.png`);
