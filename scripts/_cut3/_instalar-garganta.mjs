// Instala a GARGANTA inteira — o estático e os quadros das DUAS animações — de uma vez só.
//
// ⚠️ POR QUE UM INSTALADOR PRÓPRIO, e não o `install-anim.mjs` duas vezes. Aquele calcula a caixa
// união DE UM LOTE. Rodado duas vezes, o idle e a morte ganhariam caixas DIFERENTES, e o sprite
// SALTARIA no instante exato do impacto — o único quadro da cena em que ninguém pode piscar. Aqui
// a caixa é a união de TUDO: estático + idle + morte.
//
// ⚠️ E A LIMPEZA VEM ANTES DA CAIXA. Os quadros herdam os dois defeitos do gerador (docs/HANDOFF.md,
// lições 16-17): o xadrez de transparência desenhado dentro do PNG e colunas/linhas de borda 100%
// opacas. Uma borda opaca é opaca em TODOS os quadros, então entraria na união e inflaria o
// recorte do sprite inteiro.
//
// ⚠️ E A PALETA É ASSADA AQUI, no mesmo passe (ver `paraFamilia` em _paleta.mjs).
//
// ⚠️ O ID DA ANIMAÇÃO NA URL NÃO É O `animation_group_id`. O `get_object` devolve os dois:
// o group id (que a API usa) e, dentro da própria URL dos quadros, OUTRO id. É este último que
// entra aqui. Passar o group id devolve 404 em todos os quadros.
//
//   node scripts/_cut3/_instalar-garganta.mjs <object-id> <anim-idle-url> <anim-morte-url> [n-quadros]
import sharp from 'sharp';
import fs from 'node:fs';
import { paraFamilia, estatistica } from './_paleta.mjs';

const [OBJ, GRP_IDLE, GRP_MORTE, N_RAW] = process.argv.slice(2);
const N = Number(N_RAW ?? 9);
if (!OBJ || !GRP_IDLE || !GRP_MORTE) {
  console.error('uso: node scripts/_cut3/_instalar-garganta.mjs <object-id> <grupo-idle> <grupo-morte> [n]');
  process.exit(1);
}

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const raiz = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${OBJ}`;

const tmp = 'assets/raw/anim-garganta';
fs.mkdirSync(tmp, { recursive: true });

async function baixarLimpo(url, guardarComo) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const bruto = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(`${tmp}/${guardarComo}`, bruto);

  const { data, info } = await sharp(bruto).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const A = (x, y) => data[(y * W + x) * 4 + 3];

  // XADREZ: cinzas neutros e claros opacos são o padrão de transparência desenhado por engano.
  for (let p = 0; p < W * H; p++) {
    const [r, g, b, a] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2], data[p * 4 + 3]];
    const neutro = Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && Math.abs(r - b) < 6;
    const claro = r > 140 && r < 215;
    if (a > 10 && neutro && claro) data[p * 4 + 3] = 0;
  }

  // BORDAS 100% OPACAS: se a borda inteira é opaca, é moldura, não arte.
  const colunaCheia = (x) => { for (let y = 0; y < H; y++) if (A(x, y) < 250) return false; return true; };
  const linhaCheia = (y) => { for (let x = 0; x < W; x++) if (A(x, y) < 250) return false; return true; };
  for (const x of [0, W - 1]) if (colunaCheia(x)) for (let y = 0; y < H; y++) data[(y * W + x) * 4 + 3] = 0;
  for (const y of [0, H - 1]) if (linhaCheia(y)) for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;

  return { data, W, H };
}

const pecas = [];
pecas.push({ saida: 'garganta', quadro: await baixarLimpo(`${raiz}/rotations/unknown.png`, 'estatico.png') });
for (const [grp, nome] of [[GRP_IDLE, 'garganta-idle-anim'], [GRP_MORTE, 'garganta-morte-anim']]) {
  for (let i = 0; i < N; i++) {
    pecas.push({
      saida: `${nome}-${i}`,
      quadro: await baixarLimpo(`${raiz}/animations/${grp}/unknown/${i}.png`, `${nome}-${i}.png`),
    });
  }
}

// A CAIXA ÚNICA — a união dos alphas de TODOS os quadros já limpos.
let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
for (const { quadro: { data, W, H } } of pecas) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] <= 10) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}
if (maxX < 0) throw new Error('todos os quadros ficaram vazios depois da limpeza');
const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };

let antes = null, depois = null, gama = 1;
for (const { saida, quadro: { data, W, H } } of pecas) {
  const recortado = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract(box).raw().toBuffer({ resolveWithObject: true });
  const corrigido = paraFamilia(recortado.data, 4);
  if (saida === 'garganta') {
    antes = estatistica(recortado.data, 4);
    depois = estatistica(corrigido, 4);
    gama = corrigido.gama ?? 1;
  }
  await sharp(corrigido, { raw: { width: box.width, height: box.height, channels: 4 } })
    .png().toFile(`public/sprites/${saida}.png`);
}

console.log(`garganta: ${pecas.length} arquivos, TODOS na caixa ${box.width}x${box.height} (de ${box.left},${box.top})`);
console.log(`  estático  antes: média ${antes.media.toFixed(1)}  pico ${antes.pico.toFixed(0)}`);
console.log(`  estático depois: média ${depois.media.toFixed(1)}  pico ${depois.pico.toFixed(0)}  (gama ${gama.toFixed(2)})`);
if (depois.pico > 140) console.log('  ⚠️  o pico ainda passa de 140 — a peça vai gritar no quadro escuro.');
if (box.height < 170) console.log(`  ⚠️  a criatura saiu com ${box.height}px de altura, abaixo dos 191 do enquadramento.`);
