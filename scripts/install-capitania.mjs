// Instala a arte da CAPITÂNIA (chefão da Fase 2) com UMA caixa de recorte compartilhada.
//
// Mesmo princípio do install-boss-fight.mjs: o sprite troca de textura no meio da luta (idle ↔
// salva, ver BossCapitania.playFire), e recortar cada grupo pela sua própria caixa faria a nave
// SALTAR na troca. A caixa é a união do estático com todos os quadros da salva — os clarões de
// boca alargam a caixa, e essa margem sobra nos outros quadros, que é exatamente o que se quer.
//
// ─── O IDLE É SINTETIZADO, NÃO GERADO ───
//
// Foi tentado no PixelLab (2026-08-09) e saiu ruim de um jeito instrutivo: o v3 inventou um
// painel AZUL brilhante no casco que virava magenta e depois vermelho ao longo do loop. Num
// navio ancorado a 8fps isso não é "respirar", é pisca-pisca — e azul não existe na paleta da
// facção. É o mesmo defeito que o cabeçalho do pulsar-brilho.mjs já documentava para a
// fortaleza da Fase 1: o v3 não entrega idle SUTIL em sprite grande e detalhado.
//
// A síntese é determinística e não redesenha nada: modula cada pixel pela própria "magentice"
// (R−G), então o casco cinza fica intacto e só as luzes e o brilho dos motores respiram. O
// quadro 0 é o original byte a byte, então o PNG estático e a animação nunca saltam entre si.
//
// uso: node scripts/install-capitania.mjs
import sharp from 'sharp';

const U = 'f7282f36-b779-4f64-832a-4693ca4cc628';
// A Capitânia remodelada (2026-08-09, escolha do Henrique): mesma proa, mesmo layout e MESMA
// orientação da arte anterior (aponta para a ESQUERDA — ela vem na sua direção), só bem mais
// escura e com os dois canhões grandes desenhados. Por isso não leva `espelhar.mjs`.
const OBJ = '2f764be7-b3fa-4e24-a983-42fb32bb369c';
const ANIM_SALVA = 'cc5d7a84-71e9-4be7-94f8-27828ddf8a1d';

const raiz = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${U}/${OBJ}`;
const N_SALVA = 9;

let xadrez = 0;
let bordas = 0;

/** Limpa um quadro RAW: apaga o xadrez desenhado e as bordas 100% opacas (lições 16-17). */
function limpar(data, W, H) {
  const A = (x, y) => data[(y * W + x) * 4 + 3];
  for (let p = 0; p < W * H; p++) {
    const [r, g, b, a] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2], data[p * 4 + 3]];
    const neutro = Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && Math.abs(r - b) < 6;
    const claro = r > 140 && r < 215;
    if (a > 10 && neutro && claro) {
      data[p * 4 + 3] = 0;
      xadrez++;
    }
  }
  const colunaCheia = (x) => {
    for (let y = 0; y < H; y++) if (A(x, y) < 250) return false;
    return true;
  };
  const linhaCheia = (y) => {
    for (let x = 0; x < W; x++) if (A(x, y) < 250) return false;
    return true;
  };
  for (const x of [0, W - 1]) {
    if (colunaCheia(x)) {
      for (let y = 0; y < H; y++) data[(y * W + x) * 4 + 3] = 0;
      bordas++;
    }
  }
  for (const y of [0, H - 1]) {
    if (linhaCheia(y)) {
      for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;
      bordas++;
    }
  }
  return data;
}

async function baixarLimpo(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: limpar(data, info.width, info.height), W: info.width, H: info.height };
}

const todos = [{ destino: 'capitania', frame: await baixarLimpo(`${raiz}/rotations/unknown.png`) }];
for (let i = 0; i < N_SALVA; i++) {
  todos.push({
    destino: `capitania-fire-anim-${i}`,
    frame: await baixarLimpo(`${raiz}/animations/${ANIM_SALVA}/unknown/${i}.png`),
  });
}

// A caixa ÚNICA: união do conteúdo de TODOS os quadros.
let minX = 1e9;
let minY = 1e9;
let maxX = -1;
let maxY = -1;
for (const { frame } of todos) {
  const { data, W, H } = frame;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
}
const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };

for (const { destino, frame } of todos) {
  await sharp(frame.data, { raw: { width: frame.W, height: frame.H, channels: 4 } })
    .extract(box)
    .png()
    .toFile(`public/sprites/${destino}.png`);
}

console.log(
  `caixa ÚNICA ${box.width}x${box.height} em [${box.left},${box.top}]` +
    (xadrez ? ` · xadrez: ${xadrez}px` : '') +
    (bordas ? ` · bordas: ${bordas}` : ''),
);
console.log(`  capitania.png (estático) + capitania-fire-anim: ${N_SALVA} quadros`);
console.log(
  '\nfalta o IDLE (sintetizado — ver o cabeçalho):\n' +
    '  node scripts/pulsar-brilho.mjs public/sprites/capitania.png public/sprites/capitania-anim 7\n' +
    'e remedir as baterias/hangar do BossCapitania:\n' +
    '  node scripts/_medir-capitania.mjs',
);
