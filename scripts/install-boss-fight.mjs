// Instala TODA a arte da luta do chefão da Fase 1 com UMA caixa de recorte compartilhada.
//
// A luta troca de arte no meio (solo -> decolagem -> ar), e a troca tem que ser INVISÍVEL: a
// fortaleza não pode saltar de lugar quando o sprite muda de textura. Isso só se garante
// recortando TODOS os quadros — os dois estáticos e os quatro grupos — pela MESMA caixa (a união).
// Cada PNG sai do mesmo tamanho, com a fortaleza no mesmo pixel; o clarão do disparo e as chamas
// dos propulsores viram só margem que sobra nos outros quadros.
//
// É o mesmo princípio do install-anim-par.mjs, estendido para N grupos + 2 estáticos.
//
// A limpeza (xadrez + bordas 100% opacas) é a de sempre, e vem ANTES da caixa.
//
// ─── SELEÇÃO DE QUADROS (2026-08-09) ───
//
// Cada grupo declara QUAIS índices entram, não "todos até dar 404". As animações que vieram COM
// a torre remodelada não estavam limpas: no grupo de disparo aéreo, o quadro 2 é um borrão cinza
// (a arte se perdeu) e os quadros 4 e 8 têm um clarão branco SOLTO no ar à direita do casco — e
// um quadro solto assim não é só feio, ele entra na caixa UNIÃO e infla o recorte de todo mundo.
// Os índices são os quadros aprovados a olho, na ORDEM em que devem tocar (clarão grande ->
// pequeno), não a ordem em que o gerador os cuspiu.
//
// ─── A DECOLAGEM FOI REGERADA (2026-08-09, 2ª volta) ───
//
// O Henrique não conseguiu tirar do PixelLab uma animação de voo/decolagem sem os tais "brilhos
// estranhos". O que resolveu foi PROIBIR explicitamente no prompt, item por item: "no muzzle
// flash, no white sparks, no white lightning, no bright flares outside the silhouette". Saiu uma
// decolagem de 13 quadros em que a base pega fogo, racha, os pedaços voam e a torre sobe nas
// chamas — o último fica pálido (as chamas lavam) e fica de fora.
//
// O hover regerado no mesmo embalo foi DESCARTADO por ele: ver a nota no grupo `boss-air-anim`.
//
// Só o IDLE de solo continua sintetizado do estático por scripts/pulsar-brilho.mjs — a torre
// pousada não tem o que mexer além do olho, e o v3 estroboscopa nesse caso (ver o cabeçalho dele).
//
// uso: node scripts/install-boss-fight.mjs
import sharp from 'sharp';
import fs from 'fs';

const U = 'f7282f36-b779-4f64-832a-4693ca4cc628';
// A TORRE REMODELADA (passe visual 2026-08-09, escolha do Henrique): a linha dark sci-fi que a
// arte anterior tinha perdido. Duas formas, um objeto cada.
const O_SOLO = '5bba5ffc-778a-4c25-b4df-47fd623b9923'; // pousada, sobre a cidadela de pedra
const O_AR = '48724795-10f8-4653-832d-d1bea410b33e'; // quebrada, sobre os três propulsores

const raiz = (obj) => `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${U}/${obj}`;
const anim = (obj, grp) => `${raiz(obj)}/animations/${grp}/unknown`;
const estatico = (obj) => `${raiz(obj)}/rotations/unknown.png`;

// Cada item vira arquivos public/sprites/<nome>-<i>.png, numerados 0..n-1 na ordem de `quadros`.
const grupos = [
  {
    nome: 'boss-fire-anim',
    base: anim(O_SOLO, 'ce2e52b4-260b-4ee1-a0be-d205c886d020'),
    // 0..3 são a torre em repouso (olho apagado) — no disparo elas atrasariam o clarão em ~0.3s
    // contra as balas, que saem no mesmo frame em que o Boss.update manda tocar.
    quadros: [4, 5, 6, 7, 8],
  },
  {
    nome: 'boss-air-fire-anim',
    base: anim(O_AR, 'b0af9567-7173-45e0-a797-4564bd94253a'),
    // O grupo do ar ORIGINAL é "pairar + atirar" num só. Aqui ficam SÓ os quadros de disparo, do
    // clarão maior ao menor; o 2 (borrão) e o 4/8 (clarão solto) ficam de fora.
    quadros: [1, 6, 7, 3],
  },
  {
    nome: 'boss-air-anim',
    // O HOVER sai do MESMO grupo original, e isso foi ESCOLHA do Henrique depois de ver as duas
    // lado a lado: a versão regerada acende fogo de verdade nos bocais, mas ele preferiu esta —
    // aqui a minigun aparece ATIRANDO durante o voo, e os bocais brilham/pulsam em vez de
    // cuspir chama, o que ele achou um efeito melhor. (A regerada continua no PixelLab, no
    // grupo 2867ac17, caso ele mude de ideia.)
    //
    // Ordem: calmo → fogo → fogo → calmo → fogo → fogo. Os quadros 2 (borrão), 4 e 8 (clarão
    // branco solto) ficam de fora — são exatamente os "brilhos estranhos" que ele não quer.
    base: anim(O_AR, 'b0af9567-7173-45e0-a797-4564bd94253a'),
    quadros: [0, 1, 3, 5, 6, 7],
  },
  {
    nome: 'boss-takeoff-anim',
    // DO DISCO, não do PixelLab: o Henrique recortou à mão a parte da decolagem gerada que
    // presta e deixou em `assets/raw/anim_transi_boss_1`. São só os 7 primeiros quadros — a
    // base pegando fogo e explodindo — e o corte é deliberado: a partir do 8º a torre se
    // desprende e sobe, mas a torre que o gerador desenhou ali NÃO é a dos grandes propulsores
    // (a forma aérea de verdade). Deixar a animação seguir mostraria uma terceira torre que não
    // existe no jogo. Ela mostra a base explodir; quem entra em cena depois é `boss-air`.
    arquivos: Array.from({ length: 7 }, (_, i) => `assets/raw/anim_transi_boss_1/frame_00${i}.png`),
  },
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

/** Um quadro pronto para a caixa: já limpo, ainda no tamanho do gerador. */
async function carregarLimpo(origem) {
  const bruto =
    typeof origem === 'string' && origem.startsWith('http')
      ? await fetch(origem).then((r) => (r.ok ? r.arrayBuffer().then(Buffer.from) : null))
      : fs.readFileSync(origem);
  if (!bruto) return null;
  const { data, info } = await sharp(bruto).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: limpar(data, info.width, info.height), W: info.width, H: info.height };
}

// 1) Carrega e limpa tudo. Um grupo vem da API (`base` + `quadros`) OU do disco (`arquivos`).
const todos = []; // { destino: 'nome-i' | 'nome', frame }
for (const g of grupos) {
  const origens = g.arquivos ?? g.quadros.map((q) => `${g.base}/${q}.png`);
  for (let i = 0; i < origens.length; i++) {
    const q = await carregarLimpo(origens[i]);
    if (!q) throw new Error(`${g.nome}: quadro ${origens[i]} não carregou`);
    todos.push({ destino: `${g.nome}-${i}`, frame: q });
  }
  g.n = origens.length;
  g.fonte = g.arquivos ? 'disco' : `lote ${g.quadros.join(',')}`;
}
for (const e of estaticos) {
  const q = await carregarLimpo(e.url);
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
for (const g of grupos) console.log(`  ${g.nome}: ${g.n} quadros (${g.fonte})`);
for (const e of estaticos) console.log(`  ${e.nome}.png (estático)`);
console.log(
  '\nfalta o IDLE DE SOLO (sintetizado, não gerado):\n' +
    '  node scripts/pulsar-brilho.mjs public/sprites/boss.png public/sprites/boss-idle-anim 8\n' +
    'e remedir os offsets, que a caixa nova mexeu:\n' +
    '  node scripts/_medir-boss.mjs',
);
