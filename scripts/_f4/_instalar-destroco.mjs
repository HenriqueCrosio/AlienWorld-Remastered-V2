// O DESTROÇO DA GARGANTA E OS PEDAÇOS — as duas peças que a morte passa a usar.
//
// ⚠️ O DESTROÇO NASCE NO MESMO QUADRO DA VIVA (97×171), e isso é o que faz a troca de textura
// funcionar. É a lei da `portaLasca`: ela tem exatamente os 64×112 da porta, então trocar a
// textura não move a peça um pixel. O destroço da garganta veio 170×170 com 80×134 de conteúdo —
// colado cru, ele saltaria de lugar e de tamanho no quadro da ignição.
//
// O conteúdo é CENTRADO no centro do conteúdo da viva (medido, não chutado): a criatura perde
// matéria ao estourar, mas o que sobra fica onde estava.
//
// ⚠️ E OS PEDAÇOS SAEM RECORTADOS POR ILHA, não por grade. A folha do PixelLab traz os cacos
// espalhados com vazio entre eles; uma grade fixa cortaria pedaço ao meio. O recorte segue as
// ilhas opacas conectadas, e só depois elas são centradas em células iguais — que é o que o
// `generateFrameNumbers` do Phaser exige.
//
// ⚠️ AS SAÍDAS SÃO ARGUMENTO, e isso foi conserto de 22/09. Com os caminhos cravados, montar uma
// CANDIDATA sobrescrevia a arte que ele já tinha aprovado jogando — e a única forma de comparar
// duas versões é as duas existirem ao mesmo tempo. Sem argumento, os padrões são os de sempre.
//
//   node scripts/_f4/_instalar-destroco.mjs <destroco.png> <pedacos.png> [saidaDestroco] [saidaPedacos]
import sharp from 'sharp';

const [FONTE_DESTROCO, FONTE_PEDACOS, ARG_SD, ARG_SP] = process.argv.slice(2);
if (!FONTE_DESTROCO || !FONTE_PEDACOS) {
  console.error('uso: node scripts/_f4/_instalar-destroco.mjs <destroco.png> <pedacos.png> [saidaDestroco] [saidaPedacos]');
  process.exit(1);
}

const SAIDA_DESTROCO = ARG_SD ?? 'public/sprites/garganta-destroco.png';
const SAIDA_PEDACOS = ARG_SP ?? 'public/sprites/f4-gore-sheet.png';
const VIVA = 'public/sprites/garganta.png';

const cru = async (f) => sharp(f).raw().ensureAlpha().toBuffer({ resolveWithObject: true });

/** A caixa do conteúdo opaco, e o centro dela. */
const caixa = ({ data, info }) => {
  const { width: W, height: H } = info;
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (data[(y * W + x) * 4 + 3] > 40) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
};

// ─── 1 · O DESTROÇO, no quadro da viva ───
const viva = await cru(VIVA);
const cViva = caixa(viva);
const d = await cru(FONTE_DESTROCO);
const cD = caixa(d);

// ⚠️ O TETO DE BRILHO SAI DA VIVA. O `edit_image` também clareia — o mesmo defeito do resto deste
// gerador — e a carcaça não pode ler mais acesa que a criatura que estava viva um quadro antes.
let tetoViva = 0;
for (let i = 0; i < viva.data.length; i += 4) {
  if (viva.data[i + 3] < 40) continue;
  const l = (viva.data[i] + viva.data[i + 1] + viva.data[i + 2]) / 3;
  if (l > tetoViva) tetoViva = l;
}
let acima = 0, total = 0;
for (let i = 0; i < d.data.length; i += 4) {
  if (d.data[i + 3] < 40) continue;
  total++;
  const lum = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3;
  if (lum <= tetoViva) continue;
  acima++;
  const k = tetoViva / lum;
  d.data[i] = Math.round(d.data[i] * k);
  d.data[i + 1] = Math.round(d.data[i + 1] * k);
  d.data[i + 2] = Math.round(d.data[i + 2] * k);
}
console.log(
  `destroço: teto da viva ${Math.round(tetoViva)} · ${((acima / total) * 100).toFixed(1)}% dos px estavam acima`,
);

const recorte = await sharp(d.data, { raw: { width: d.info.width, height: d.info.height, channels: 4 } })
  .extract({ left: cD.x0, top: cD.y0, width: cD.w, height: cD.h })
  .png()
  .toBuffer();

await sharp({
  create: { width: viva.info.width, height: viva.info.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: recorte, left: Math.round(cViva.cx - cD.w / 2), top: Math.round(cViva.cy - cD.h / 2) }])
  .png()
  .toFile(SAIDA_DESTROCO);
console.log(`${SAIDA_DESTROCO}  ${viva.info.width}x${viva.info.height} (conteúdo ${cD.w}x${cD.h}, centrado no da viva)`);

// ─── 2 · OS PEDAÇOS, por ilha ───
const p = await cru(FONTE_PEDACOS);
const { width: PW, height: PH } = p.info;
const visto = new Uint8Array(PW * PH);
const opaco = (i) => p.data[i * 4 + 3] > 40;
const ilhas = [];
for (let i = 0; i < PW * PH; i++) {
  if (visto[i] || !opaco(i)) continue;
  const pilha = [i];
  visto[i] = 1;
  const px = [];
  let x0 = PW, x1 = 0, y0 = PH, y1 = 0;
  while (pilha.length) {
    const q = pilha.pop();
    px.push(q);
    const x = q % PW, y = (q - x) / PW;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= PW || ny >= PH) continue;
      const r = ny * PW + nx;
      if (!visto[r] && opaco(r)) { visto[r] = 1; pilha.push(r); }
    }
  }
  // ⚠️ O PISO DE 200px DESCARTA A SUJEIRA SOLTA da geração — pontinhos de 3 ou 4 px que viram
  // destroço invisível voando pela tela. É o mesmo cuidado do assert "nenhum pedaço vazio".
  if (px.length >= 200) ilhas.push({ px, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
}
ilhas.sort((a, b) => b.px.length - a.px.length);

const CEL_W = Math.max(...ilhas.map((i) => i.w));
const CEL_H = Math.max(...ilhas.map((i) => i.h));
const cacos = [];
for (const c of ilhas) {
  const b = Buffer.alloc(c.w * c.h * 4, 0);
  for (const q of c.px) {
    const x = q % PW, y = (q - x) / PW;
    const dst = ((y - c.y0) * c.w + (x - c.x0)) * 4;
    b[dst] = p.data[q * 4];
    b[dst + 1] = p.data[q * 4 + 1];
    b[dst + 2] = p.data[q * 4 + 2];
    b[dst + 3] = 255;
  }
  cacos.push({
    buf: await sharp(b, { raw: { width: c.w, height: c.h, channels: 4 } }).png().toBuffer(),
    w: c.w,
    h: c.h,
  });
}

await sharp({
  create: { width: CEL_W * cacos.length, height: CEL_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(
    cacos.map((c, i) => ({
      input: c.buf,
      left: i * CEL_W + Math.round((CEL_W - c.w) / 2),
      top: Math.round((CEL_H - c.h) / 2),
    })),
  )
  .png()
  .toFile(SAIDA_PEDACOS);
console.log(`${SAIDA_PEDACOS}  ${cacos.length} pedaços em células de ${CEL_W}x${CEL_H}`);
console.log('  tamanhos: ' + cacos.map((c) => `${c.w}x${c.h}`).join(' · '));
