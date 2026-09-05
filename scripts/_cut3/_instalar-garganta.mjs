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
// ⚠️ E A PALETA NÃO É TOCADA — DECISÃO DO HENRIQUE, 2026-09-05: "quero a cor que foi criada, a
// original, sem tint".
//
// Este instalador CORRIGIA a cor, seguindo a lei do spec de 03/09 (`paraFamilia` em _paleta.mjs):
// o casco frio girava para a ferrugem do hangar, a saturação caía a 55% e o realce era comprimido.
// Medido depois que ele jogou: **52% dos pixels da peça tinham o matiz girado**, de azul-petróleo
// para lodo, e o pico caía de 207 para 105 — metade do brilho e outra cor.
//
// ⚠️ E O MOTIVO ESCRITO NA LEI NÃO SE SUSTENTAVA NESTA PEÇA. Ela dizia "teal é `player 0x17a6bd`,
// a cor do JOGADOR". Conferido no `COLORS`: o ciano do jogador é matiz **188°**, e o casco desta
// criatura está em **220–260°** — azul-índigo, não ciano. A faixa vinha de outra peça e foi
// aplicada nesta sem medir; em 04/09 eu ainda a alarguei de 215 para 265, o que dobrou o estrago.
//
// A peça entra CRUA: só a limpeza (xadrez e bordas opacas) e o recorte pela caixa única.
//
// ⚠️ O ID DA ANIMAÇÃO NA URL NÃO É O `animation_group_id`. O `get_object` devolve os dois:
// o group id (que a API usa) e, dentro da própria URL dos quadros, OUTRO id. É este último que
// entra aqui. Passar o group id devolve 404 em todos os quadros.
//
// ⚠️ A DIREÇÃO É PARÂMETRO. O objeto do Henrique (15f111fd) tem 8 direções e a cutscene usa só
// a `south` — a boca frontal. Um objeto de 1 direção usa `unknown`, que é o padrão.
//
//   node scripts/_cut3/_instalar-garganta.mjs <object-id> <anim-idle-url> <anim-morte-url> [n] [direcao] [--flip]
//
// `--flip` espelha TUDO na horizontal, antes da limpeza e da caixa. É o que traz uma face `east`
// para a direção que a cena usa.
import sharp from 'sharp';
import fs from 'node:fs';
import { estatistica } from './_paleta.mjs';

const args = process.argv.slice(2);
const FLIP = args.includes('--flip');
const [OBJ, GRP_IDLE, GRP_MORTE, N_RAW, DIR_RAW] = args.filter((a) => a !== '--flip');
const DIR = DIR_RAW ?? 'unknown';
const N = Number(N_RAW ?? 9);
if (!OBJ || !GRP_IDLE || !GRP_MORTE) {
  console.error('uso: node scripts/_cut3/_instalar-garganta.mjs <object-id> <anim-idle> <anim-morte> [n] [direcao]');
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

  // ⚠️ O ESPELHAMENTO ACONTECE AQUI, ANTES DA LIMPEZA E DA CAIXA. As animações que o Henrique
  // fez estão na face `east` — a criatura olha para a DIREITA. Na cena ela vive na direita e a
  // nave chega pela esquerda, então ela precisa olhar para a esquerda.
  //
  // ⚠️ E ESPELHAR EM DISCO, NUNCA COM `setFlipX` NA CENA. É a mesma lei que `install-sprite.mjs`
  // já paga (o chefão que vinha apontando para o lado errado): o flip em jogo não acompanha nada
  // que seja medido a partir do centro — e aqui a peça é ancorada pelo pé e pelo x=330. Espelhando
  // ANTES da caixa união, os 23 quadros saem alinhados entre si por construção.
  const fonte = FLIP ? await sharp(bruto).flop().png().toBuffer() : bruto;

  const { data, info } = await sharp(fonte).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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

/**
 * ⚠️ OS DOIS ÚLTIMOS QUADROS DA MORTE SÃO LIXO DO GERADOR, e isto é código porque já voltaram uma
 * vez. Os índices 7 e 8 vieram com um artefato — uma cruz marrom clara no meio da boca, do nada — e
 * como a animação NÃO repete (`loop: false`), ela CONGELA no último quadro: a cruz ficava na tela
 * do impacto até o fim da cena.
 *
 * Eu os apaguei à mão em 04/09 e a reinstalação de 05/09 os trouxe de volta, porque nada aqui
 * sabia deles. **Descarte que mora fora do instalador não é descarte, é lembrete.**
 *
 * ⚠️ O CORTE É POR LOTE, não uma lei da peça: os 9 quadros SOUTH tinham lixo nos dois últimos, e
 * um lote novo pode não ter. Por isso o padrão é NÃO CORTAR NADA (todos os N), e o corte entra por
 * ambiente:
 *
 *     MORTE_UTEIS=7 node scripts/_cut3/_instalar-garganta.mjs ...
 *
 * ⚠️ Antes de cortar, OLHE os quadros — cortar de memória é o que trouxe o lixo de volta.
 *
 * ⚠️ A CAIXA CONTINUA SENDO A DE TODOS OS QUADROS BAIXADOS: os descartados entram no cálculo da
 * união e só depois são jogados fora, então cortar não desalinha nada e o sprite não salta.
 */
const MORTE_UTEIS = Number(process.env.MORTE_UTEIS ?? N);

const pecas = [];
pecas.push({ saida: 'garganta', quadro: await baixarLimpo(`${raiz}/rotations/${DIR}.png`, 'estatico.png') });
for (const [grp, nome] of [[GRP_IDLE, 'garganta-idle-anim'], [GRP_MORTE, 'garganta-morte-anim']]) {
  for (let i = 0; i < N; i++) {
    pecas.push({
      saida: `${nome}-${i}`,
      quadro: await baixarLimpo(`${raiz}/animations/${grp}/${DIR}/${i}.png`, `${nome}-${i}.png`),
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

let stat = null;
const descartados = [];
for (const { saida, quadro: { data, W, H } } of pecas) {
  const recortado = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract(box).raw().toBuffer({ resolveWithObject: true });
  if (saida === 'garganta') stat = estatistica(recortado.data, 4);

  // O descarte acontece DEPOIS da caixa união, nunca antes (ver MORTE_UTEIS).
  const m = saida.match(/^garganta-morte-anim-(\d+)$/);
  if (m && Number(m[1]) >= MORTE_UTEIS) {
    descartados.push(saida);
    continue;
  }

  await sharp(recortado.data, { raw: { width: box.width, height: box.height, channels: 4 } })
    .png().toFile(`public/sprites/${saida}.png`);
}

console.log(`garganta: ${pecas.length} arquivos, TODOS na caixa ${box.width}x${box.height} (de ${box.left},${box.top})`);
console.log(`  estático, CRU: média ${stat.media.toFixed(1)}  pico ${stat.pico.toFixed(0)}`);
console.log('  (a pintura do hangar tem média 13,1 e teto prático ~110 — a peça entra crua POR DECISÃO)');
if (descartados.length) {
  console.log(`  descartados por artefato do gerador: ${descartados.join(', ')}`);
}
