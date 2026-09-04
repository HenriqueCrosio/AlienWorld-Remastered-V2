// Instala as 4 peças de entulho biomecânico da Cutscene 3.
//
// ⚠️ AS CHAVES SÃO `entulho`, NÃO `destroco`, E ISSO CUSTOU DOIS ARQUIVOS (2026-09-04). O jogo JÁ
// TEM `destroco`/`destroco2`/`destroco3` — o casco rasgado à deriva que as Fases 2 e 3 cospem
// como perigo (`DebrisSystem.HAZARDS`). Gravar `destroco-2.png` aqui sobrescreveu a arte deles em
// disco e duplicou a chave no `ART`. Nome novo de asset se confere ANTES de escrever no disco.
//
// Faz, em ordem, as quatro coisas que toda peça desta fatia precisa:
//   1. limpa o xadrez e as bordas opacas do gerador (docs/HANDOFF.md, lições 16-17);
//   2. recorta pela caixa de conteúdo real;
//   3. ASSA O TAMANHO no arquivo — cada peça tem a sua altura, e a variedade vem daí;
//   4. ASSA A PALETA no arquivo (ver _paleta.mjs).
//
// ⚠️ O TAMANHO É ASSADO, NÃO `setScale()`. A 1ª volta desenhava asteroides de 24px com
// `setScale(2.2..2.8)` — 24px de arte espremidos em 62px de tela, com a grade de pixel do sprite
// deixando de casar com a da tela. As alturas abaixo reproduzem os tamanhos QUE JÁ ESTAVAM na
// tela (2,2 a 2,8 × 24 = 53 a 67), agora com escala 1 no jogo.
//
// ⚠️ E A COR SAI DO `setTint`. `setTint(0x39415c)` multiplicava a peça inteira por um azul só —
// silhueta chapada, e a peça deixava de ser da família do hangar para ser da cor do tint.
//
//   node scripts/_cut3/_instalar-destrocos.mjs <id1> <id2> <id3> <id4>
import sharp from 'sharp';
import { paraFamilia, estatistica } from './_paleta.mjs';

const IDS = process.argv.slice(2);
if (IDS.length !== 4) {
  console.error('uso: node scripts/_cut3/_instalar-destrocos.mjs <id1> <id2> <id3> <id4>');
  process.exit(1);
}

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
// As quatro alturas alvo, derivadas das escalas da 1ª volta (24px × 2,2 / 2,8 / 2,4 / 2,6).
const ALTURAS = [53, 67, 58, 62];

for (let k = 0; k < IDS.length; k++) {
  const url = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${IDS[k]}/rotations/unknown.png`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);

  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const A = (x, y) => data[(y * W + x) * 4 + 3];

  for (let p = 0; p < W * H; p++) {
    const [r, g, b, a] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2], data[p * 4 + 3]];
    const neutro = Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && Math.abs(r - b) < 6;
    if (a > 10 && neutro && r > 140 && r < 215) data[p * 4 + 3] = 0;
  }
  const colunaCheia = (x) => { for (let y = 0; y < H; y++) if (A(x, y) < 250) return false; return true; };
  const linhaCheia = (y) => { for (let x = 0; x < W; x++) if (A(x, y) < 250) return false; return true; };
  for (const x of [0, W - 1]) if (colunaCheia(x)) for (let y = 0; y < H; y++) data[(y * W + x) * 4 + 3] = 0;
  for (const y of [0, H - 1]) if (linhaCheia(y)) for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;

  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (A(x, y) <= 10) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) throw new Error(`${IDS[k]}: quadro vazio depois da limpeza`);

  const alvo = ALTURAS[k];
  const larg = Math.max(1, Math.round(((x1 - x0 + 1) * alvo) / (y1 - y0 + 1)));

  const red = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize(larg, alvo, { kernel: 'lanczos3' })
    .raw().toBuffer({ resolveWithObject: true });

  // O alpha é RELIMIARIZADO depois do lanczos: a franja parcial da borda vira contorno fantasma
  // sobre o fundo escuro do hangar (a mesma lei do reduzir-sprite.mjs).
  for (let i = 0; i < red.info.width * red.info.height; i++) {
    red.data[i * 4 + 3] = red.data[i * 4 + 3] >= 128 ? 255 : 0;
  }

  const antes = estatistica(red.data, 4);
  const corrigido = paraFamilia(red.data, 4);
  const depois = estatistica(corrigido, 4);

  await sharp(corrigido, { raw: { width: red.info.width, height: alvo, channels: 4 } })
    .png().toFile(`public/sprites/entulho-${k + 1}.png`);

  console.log(`entulho-${k + 1}.png   ${red.info.width}x${alvo}   media ${antes.media.toFixed(1)}->${depois.media.toFixed(1)}   pico ${antes.pico.toFixed(0)}->${depois.pico.toFixed(0)}   gama ${(corrigido.gama ?? 1).toFixed(2)}`);
  if (depois.pico > 140) console.log('  ⚠️  o pico ainda passa de 140.');
}
