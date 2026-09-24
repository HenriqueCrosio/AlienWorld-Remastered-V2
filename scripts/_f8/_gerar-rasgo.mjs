// P2 · O ESTOURO DA PAREDE (capítulo 2). Pedido dele em 24/09, depois de ver o capítulo 1 pulsando:
// *"podemos até mostrar a camara D inicialmente, mas o rasgo na estrutura tem que vir logo depois"* — e a
// cena é sobre a coisa EXPLODIR dali. Por isso o rasgo NÃO interpola do intacto ao rasgado (a v3,
// atravessando uma distância grande, inventa manchas chapadas — lição da P1): é um CORTE no impacto,
// escondido por destroços, e depois a parede JÁ RASGADA se mexe (distância pequena — o que a v3 faz bem).
//
// ⚠️ 2ª RODADA (24/09): o rasgado do conceito vai até o topo da tela, e o recorte que protegia o teto da
// moldura o cortava numa LINHA RETA (ele marcou: *"existe angulos muito retos… como se houvesse um corte"*).
// Agora o rasgo SE FECHA POR DENTRO antes do teto: as linhas acima de `FECHA_Y` voltam a ser a câmara
// intacta, e um inpaint na faixa de transição pinta o lábio de cima do rasgo. Nada mais é recortado na cena.
//
//   1. rasgado = conceito aprovado (`conceito-2-rasgo-22.png`) com o topo devolvido à câmara intacta;
//   2. inpaint da faixa [FECHA_Y − 6, FECHA_Y + 30] dentro da caixa: o topo do rasgo, orgânico;
//   3. a caixa e o ALFA saem da DIFERENÇA para a câmara intacta (não de uma máscara desenhada);
//   4. a v3 anima as BORDAS a partir desse rasgado (seed 21 — a aprovada);
//   5. paleta da câmara D + o alfa.
//
//   node scripts/_f8/_gerar-rasgo.mjs [seed ...]  → public/sprites/f8-rasgo-<seed>.png + scripts/_f8/_rasgo-caixa.json
import fs from 'node:fs';
import sharp from 'sharp';
import { b64, gerar } from './_pl.mjs';
import { paletaDe, naPaleta } from './_paleta.mjs';

const F = 'docs/superpowers/folhas/2026-09-23';
const D = 'public/sprites/paint-bg-f4-d.png';
const W = 384, H = 216;
/** Abaixo do teto mais grosso da moldura da arena (32) — o rasgo tem de TERMINAR antes dele. */
const FECHA_Y = 44;
const seeds = process.argv.slice(2).map(Number);
if (!seeds.length) seeds.push(21);

const paleta = await paletaDe(D, 64);
const intacta = await sharp(D).ensureAlpha().raw().toBuffer();
const conceito = await sharp(`${F}/conceito-2-rasgo-22.png`).ensureAlpha().raw().toBuffer();

// 1 · o topo volta a ser a câmara intacta
const base = Buffer.from(conceito);
for (let y = 0; y < FECHA_Y; y++) intacta.copy(base, y * W * 4, y * W * 4, (y + 1) * W * 4);
const basePng = await sharp(base, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();

// 2 · o lábio de cima: inpaint numa faixa dentro da largura do rasgo (x 205..363)
const mascara = Buffer.alloc(W * H * 3);
for (let y = FECHA_Y - 6; y < FECHA_Y + 30; y++) for (let x = 205; x < 364; x++) mascara.fill(255, (y * W + x) * 3, (y * W + x) * 3 + 3);
const mascaraPng = await sharp(mascara, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
const CACHE = 'scripts/_f8/_rasgado-cheio.png';
const [fechado] = fs.existsSync(CACHE) ? [fs.readFileSync(CACHE)] : await gerar('/inpaint-v3', {
  description: 'the ragged UPPER EDGE of a rupture in a living organic wall: the dark tear narrows and closes here with a torn lip of dark crimson membrane, loose tissue strands and a few glowing lava drops along the edge, blending into the intact wall above. Dark, desaturated pixel art.',
  inpainting_image: { image: b64(basePng), size: { width: W, height: H } },
  mask_image: { image: b64(mascaraPng), size: { width: W, height: H } },
  seed: 5,
});
const rasgadoCheio = await naPaleta(fechado, paleta);
fs.writeFileSync('scripts/_f8/_rasgado-cheio.png', rasgadoCheio);

// 3 · a caixa e o alfa pela DIFERENÇA para a câmara intacta — ⚠️ a intacta passada pela MESMA paleta: a
// quantização mexe em todo pixel um pouco, e comparar com a original marcava a tela inteira como diferente.
const intactaQ = await sharp(await naPaleta(await sharp(D).png().toBuffer(), paleta)).ensureAlpha().raw().toBuffer();
// ⚠️ E SÓ DENTRO DA REGIÃO DO RASGO: o inpaint do PixelLab mexe de leve na imagem INTEIRA, então a diferença
// sozinha marcava a tela toda. A região = a máscara do conceito alargada 4px + a faixa do lábio de cima.
const { data: mOrig } = await sharp(`${F}/mask-rasgo.png`).greyscale().raw().toBuffer({ resolveWithObject: true });
const regiao = new Uint8Array(W * H);
/** Dentro da máscara ORIGINAL do conceito (alargada): o rasgo aprovado. Fora dela só vale a faixa do lábio. */
const naMascara = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  let perto = false;
  for (let dy = -4; dy <= 4 && !perto; dy++) for (let dx = -4; dx <= 4 && !perto; dx++) {
    const yy = y + dy, xx = x + dx;
    if (yy >= 0 && xx >= 0 && yy < H && xx < W && mOrig[yy * W + xx] > 127) perto = true;
  }
  const naFaixa = y >= FECHA_Y - 6 && y < FECHA_Y + 30 && x >= 205 && x < 364;
  // na faixa do lábio a máscara do conceito NÃO vale: lá só entra a borda do buraco (os salpicos moravam ali)
  naMascara[y * W + x] = perto && y >= FECHA_Y + 30 ? 1 : 0;
  regiao[y * W + x] = y >= FECHA_Y - 6 && (perto || naFaixa) ? 1 : 0;
}
const cheio = await sharp(rasgadoCheio).ensureAlpha().raw().toBuffer();
const difere = new Uint8Array(W * H);
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let p = 0; p < W * H; p++) {
  if (!regiao[p]) continue;
  const i = p * 4;
  const d = Math.abs(cheio[i] - intactaQ[i]) + Math.abs(cheio[i + 1] - intactaQ[i + 1]) + Math.abs(cheio[i + 2] - intactaQ[i + 2]);
  if (d > 24) {
    difere[p] = 1;
    const x = p % W, y = (p / W) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
}
// fecha os furinhos do alfa (um pixel igual por acaso no meio do rasgo não pode virar buraco)
const alfaTela = new Uint8Array(W * H);
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += difere[(y + dy) * W + x + dx];
  alfaTela[y * W + x] = n >= 3 ? 1 : 0;
}
// ⚠️ SÓ A MAIOR REGIÃO CONTÍNUA fica (4ª rodada, 24/09): o inpaint do lábio deixou ILHAS soltas que diferem da
// câmara mas não são o rasgo — eram os salpicos. O rasgo é UM corpo; tudo o que não está ligado a ele sai.
{
  const rotulo = new Int32Array(W * H).fill(-1);
  let maior = -1, tamMaior = 0, n = 0;
  for (let p0 = 0; p0 < W * H; p0++) {
    if (!alfaTela[p0] || rotulo[p0] !== -1) continue;
    const fila = [p0]; rotulo[p0] = n;
    for (let k = 0; k < fila.length; k++) {
      const p = fila[k], x = p % W, y = (p / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, q = yy * W + xx;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H || rotulo[q] !== -1 || !alfaTela[q]) continue;
        rotulo[q] = n; fila.push(q);
      }
    }
    if (fila.length > tamMaior) { tamMaior = fila.length; maior = n; }
    n++;
  }
  x0 = W; y0 = H; x1 = 0; y1 = 0;
  for (let p = 0; p < W * H; p++) {
    alfaTela[p] = rotulo[p] === maior ? 1 : 0;
    if (!alfaTela[p]) continue;
    const x = p % W, y = (p / W) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  console.log(`regiões: ${n} · fica a maior, ${tamMaior}px`);
}
const caixa = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
fs.writeFileSync('scripts/_f8/_rasgo-caixa.json', JSON.stringify(caixa));
console.log('caixa do rasgo', caixa);
const rasgada = await sharp(rasgadoCheio).extract(caixa).png().toBuffer();

// ⚠️ 3ª RODADA (24/09), vista ampliada na tela: a v3 mexe em TODA a caixa — pontinhos salmão soltos longe do
// rasgo — e o topo dela carrega contornos salmão chapados. Duas travas, sem gerar de novo:
//   · a animação só vale na ZONA DA BORDA (a ≤ 4px de um pixel do buraco); fora dela, o rasgado fica parado;
//   · na FAIXA DO LÁBIO (fora da máscara do conceito), só entra pixel perto do buraco — os pontinhos salmão
//     soltos eram do próprio inpaint da faixa, longe de qualquer borda.
// ⚠️ Tentei AMANSAR (os 2 tons mais claros → o 3º) e as bordas viraram vermelho-escuro chapado: a lava das
//   bordas é ENERGIA, e ele aprovou o estouro com ela acesa. Ficou a paleta cheia.
const rasgadoRaw = await sharp(rasgada).ensureAlpha().raw().toBuffer();
const lumPx = (b, i) => 0.3 * b[i] + 0.59 * b[i + 1] + 0.11 * b[i + 2];
const buraco = new Uint8Array(caixa.width * caixa.height);
// ⚠️ O BURACO é o que ficou preto E ANTES NÃO ERA: a câmara é cheia de sombra quase preta, e "todo pixel escuro"
// marcava a caixa inteira como borda — os salpicos passavam pelo filtro por isso.
for (let p = 0; p < buraco.length; p++) {
  const x = p % caixa.width, y = (p / caixa.width) | 0;
  const t = ((y + caixa.top) * W + x + caixa.left) * 4;
  buraco[p] = lumPx(rasgadoRaw, p * 4) < 14 && lumPx(intactaQ, t) >= 20 ? 1 : 0;
}
const borda = new Uint8Array(buraco.length);
for (let y = 0; y < caixa.height; y++) for (let x = 0; x < caixa.width; x++) {
  let perto = 0;
  for (let dy = -4; dy <= 4 && !perto; dy++) for (let dx = -4; dx <= 4 && !perto; dx++) {
    const yy = y + dy, xx = x + dx;
    if (yy >= 0 && xx >= 0 && yy < caixa.height && xx < caixa.width && buraco[yy * caixa.width + xx]) perto = 1;
  }
  borda[y * caixa.width + x] = perto;
}

// OS SALPICOS: o inpaint do lábio atendeu "a few glowing lava drops" espalhando pintinhas salmão soltas. Todo
// grupo de pixels CLAROS com menos de 12px que não encosta na zona da borda sai do alfa (a câmara de baixo volta).
const claro = new Uint8Array(buraco.length);
for (let p = 0; p < claro.length; p++) claro[p] = lumPx(rasgadoRaw, p * 4) > 90 ? 1 : 0;
const salpico = new Uint8Array(buraco.length);
const visto = new Uint8Array(buraco.length);
for (let p0 = 0; p0 < claro.length; p0++) {
  if (!claro[p0] || visto[p0]) continue;
  const grupo = [p0];
  visto[p0] = 1;
  let encosta = false;
  for (let k = 0; k < grupo.length; k++) {
    const p = grupo[k], x = p % caixa.width, y = (p / caixa.width) | 0;
    if (borda[p]) encosta = true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const xx = x + dx, yy = y + dy, q = yy * caixa.width + xx;
      if (xx < 0 || yy < 0 || xx >= caixa.width || yy >= caixa.height || visto[q] || !claro[q]) continue;
      visto[q] = 1;
      grupo.push(q);
    }
  }
  if (grupo.length < 12 && !encosta) for (const p of grupo) salpico[p] = 1;
}

const CACHE_V3 = (seed) => `scripts/_f8/_rasgo-v3-${seed}.json`;
for (const seed of seeds) {
  const quadros = fs.existsSync(CACHE_V3(seed))
    ? JSON.parse(fs.readFileSync(CACHE_V3(seed), 'utf8')).map((s) => Buffer.from(s, 'base64'))
    : await gerar('/animate-with-text-v3', {
    first_frame: b64(rasgada),
    action: 'the torn edges of the ruptured organic wall flap and stretch as air rushes out, loose membrane strands whipping toward the dark opening, glowing lava dripping along the torn edges. The black space in the opening stays still. Keep the same composition and colors.',
    frame_count: 8,
    seed,
    no_background: false,
  });
  fs.writeFileSync(CACHE_V3(seed), JSON.stringify(quadros.map((b) => b.toString('base64'))));
  const prontos = [];
  for (const q of quadros) {
    const cor = await naPaleta(await sharp(q).resize(caixa.width, caixa.height, { kernel: 'nearest' }).png().toBuffer(), paleta);
    const { data, info } = await sharp(cor).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const parado = await sharp(await naPaleta(rasgada, paleta)).ensureAlpha().raw().toBuffer();
    for (let y = 0; y < caixa.height; y++) for (let x = 0; x < caixa.width; x++) {
      const p = y * caixa.width + x;
      if (!borda[p]) for (let ch = 0; ch < 3; ch++) data[p * 4 + ch] = parado[p * 4 + ch];
      const t = (y + caixa.top) * W + x + caixa.left;
      data[p * 4 + 3] = alfaTela[t] ? 255 : 0;
    }
    prontos.push(await sharp(data, { raw: info }).png().toBuffer());
  }
  await sharp({ create: { width: caixa.width * prontos.length, height: caixa.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(prontos.map((input, i) => ({ input, left: i * caixa.width, top: 0 })))
    .png()
    .toFile(`public/sprites/f8-rasgo-${seed}.png`);
  console.log(`seed ${seed}: ${prontos.length} quadros de ${caixa.width}×${caixa.height}`);
}
