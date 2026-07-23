// Instala TODA a arte da luta do chefão da Fase 1 com UMA caixa de recorte compartilhada.
//
// A luta troca de arte no meio (solo -> decolagem -> ar), e as trocas têm que ser INVISÍVEIS:
// a fortaleza não pode saltar de lugar quando o sprite muda de textura. Isso só se garante
// recortando TODOS os quadros — os dois estáticos, o fogo de solo, o hover e o fogo aéreos, e a
// decolagem — pela MESMA caixa (a união de todos). Cada PNG sai do mesmo tamanho, com a
// fortaleza no mesmo pixel; o clarão do disparo e as chamas dos propulsores viram só margem
// que sobra nos outros quadros.
//
// É o mesmo princípio do install-anim-par.mjs, estendido para N grupos + 2 estáticos.
//
// A limpeza (xadrez + bordas 100% opacas) é a de sempre, e vem ANTES da caixa.
//
// uso: node scripts/install-boss-fight.mjs
import sharp from 'sharp';
import fs from 'fs';

const U = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const O_SOLO = '49a4f934-6aa9-4d85-aaec-9334890a5816'; // arte pousada (base de pedra)
const O_AR = '2d499c7d-e5c5-4d66-9612-15381f050126'; // estado com propulsores

const raiz = (obj) => `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${U}/${obj}`;
const anim = (obj, grp) => `${raiz(obj)}/animations/${grp}/unknown`;
const estatico = (obj) => `${raiz(obj)}/rotations/unknown.png`;

// Cada item vira arquivos public/sprites/<nome>-<i>.png. `estatico` recebe também um PNG solto.
const grupos = [
  { nome: 'boss-fire-anim', base: anim(O_SOLO, '894d1f08-f198-4545-8e48-273b8c345e06') },
  { nome: 'boss-air-anim', base: anim(O_AR, '950a9859-1f90-45ab-9358-7ce1a0be15b3') },
  { nome: 'boss-air-fire-anim', base: anim(O_AR, '55cc09a4-13bf-46e3-a177-0885ed65c851') },
  { nome: 'boss-takeoff-anim', base: anim(O_SOLO, 'e30a7e1b-b946-4e78-9bea-76c464d876c0') },
];
const estaticos = [
  { nome: 'boss', url: estatico(O_SOLO) }, // fase 1, pousada
  { nome: 'boss-air', url: estatico(O_AR) }, // fase 2, no ar
];

let xadrezTotal = 0;
let bordasTotal = 0;

/** Limpa um quadro RAW: apaga o xadrez desenhado e as bordas 100% opacas. */
function limpar(data, W, H) {
  const A = (x, y) => data[(y * W + x) * 4 + 3];
  for (let p = 0; p < W * H; p++) {
    const [r, g, b, a] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2], data[p * 4 + 3]];
    const neutro = Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && Math.abs(r - b) < 6;
    const claro = r > 140 && r < 215;
    if (a > 10 && neutro && claro) {
      data[p * 4 + 3] = 0;
      xadrezTotal++;
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
      bordasTotal++;
    }
  }
  for (const y of [0, H - 1]) {
    if (linhaCheia(y)) {
      for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;
      bordasTotal++;
    }
  }
  return data;
}

async function baixarLimpo(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: limpar(data, info.width, info.height), W: info.width, H: info.height };
}

// 1) Baixa e limpa tudo. Grupos: fetch sequencial até 404 (não confio na contagem de cabeça).
const todos = []; // { destino: 'nome-i' | 'nome', frame }
for (const g of grupos) {
  fs.mkdirSync(`assets/raw/anim-${g.nome}`, { recursive: true });
  for (let i = 0; ; i++) {
    const q = await baixarLimpo(`${g.base}/${i}.png`);
    if (!q) {
      g.n = i;
      break;
    }
    todos.push({ destino: `${g.nome}-${i}`, frame: q });
  }
}
for (const e of estaticos) {
  const q = await baixarLimpo(e.url);
  if (!q) throw new Error(`estático ${e.nome}: falhou`);
  todos.push({ destino: e.nome, frame: q });
}

// 2) A caixa ÚNICA: união do conteúdo de TODOS os quadros.
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

// 3) Extrai tudo pela caixa e grava.
for (const { destino, frame } of todos) {
  await sharp(frame.data, { raw: { width: frame.W, height: frame.H, channels: 4 } })
    .extract(box)
    .png()
    .toFile(`public/sprites/${destino}.png`);
}

console.log(
  `caixa ÚNICA ${box.width}x${box.height} em [${box.left},${box.top}]` +
    (xadrezTotal ? ` · xadrez: ${xadrezTotal}px` : '') +
    (bordasTotal ? ` · bordas: ${bordasTotal}` : ''),
);
for (const g of grupos) console.log(`  ${g.nome}: ${g.n} quadros`);
for (const e of estaticos) console.log(`  ${e.nome}.png (estático)`);
