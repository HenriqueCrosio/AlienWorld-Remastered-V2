// A RÉGUA DE HONESTIDADE DE UMA COLUNA (Fatia 7 · Bloco A · Task 4).
//
// ⚠️ Este script não gera nem instala nada. Ele responde UMA pergunta que o olho não responde:
// "onde esta arte MATA sem DESENHAR?".
//
// Por que ela existe: a hitbox de um prop de cenário sai da LARGURA DA TEXTURA, não do desenho
// (`TerrainSystem.ts:307`, `body.setSize(p.width * 0.6, p.height)`) — e é um retângulo de ALTURA
// CHEIA. Então uma lâmina de base larga e ponta fina mata numa faixa larga na altura da PONTA,
// que é exatamente por onde o jogador passa. Alargar a base PIORA isso: a base engorda a textura,
// a hitbox engorda junto, e a ponta continua fina.
//
// A referência não é um ideal: são os três props que já estão no jogo e ele já aceitou. Eles são
// largos de baixo até em cima (costela: 102px na faixa do topo contra 71 de hitbox). Uma coluna
// nova é honesta quando o desenho na faixa do topo alcança a hitbox como a deles alcança.
//
// A medida é feita na altura REAL do jogo (110px, `alturaPx` do roteiro) e depois do APARO — que
// é como a textura vai entrar, porque aparar conserta de uma vez a hitbox mentirosa e a folga na
// base que faz a coluna flutuar.
//
//   node scripts/_f4/_medir-colunas.mjs [arquivo.png ...]
import sharp from 'sharp';

const ALTURA = 110;              // `alturaPx` dos corredores da F4 (StageDirector)
const FATIA = 0.6;               // TerrainSystem.ts:307 — body.setSize(p.width * 0.6, ...)

const HOJE = ['public/sprites/costela.png', 'public/sprites/orgao.png', 'public/sprites/maquinario.png'];
const alvos = process.argv.slice(2);
const files = [...HOJE, ...alvos];

const FAIXAS = [[0, 0.1], [0.1, 0.2], [0.2, 0.3], [0.45, 0.55], [0.75, 0.85], [0.97, 1]];

async function medir(f) {
  // Aparado: é assim que a textura entra. O bounding box vira a textura.
  const t = await sharp(f).trim({ threshold: 1 }).png().toBuffer();
  const m = await sharp(t).metadata();
  const W = Math.max(1, Math.round((m.width * ALTURA) / m.height));
  const { data, info } = await sharp(t)
    .resize(W, ALTURA, { kernel: 'nearest', fit: 'fill' })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const larguraDaLinha = (y) => {
    let a = Infinity, b = -1;
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 8) { if (x < a) a = x; if (x > b) b = x; }
    }
    return b < 0 ? 0 : b - a + 1;
  };
  const faixa = ([p0, p1]) => {
    let mx = 0;
    for (let y = Math.floor(ALTURA * p0); y < Math.ceil(ALTURA * p1); y++) mx = Math.max(mx, larguraDaLinha(y));
    return mx;
  };

  return { W, hitbox: Math.round(W * FATIA), perfil: FAIXAS.map(faixa) };
}

console.log(`altura ${ALTURA}px, hitbox = ${FATIA} da largura da textura APARADA\n`);
console.log('arquivo'.padEnd(24) + 'texW hitbox |  10%  20%  30%  50%  80% base   veredicto');
for (const f of files) {
  const { W, hitbox, perfil } = await medir(f);
  const topo = Math.max(perfil[0], perfil[1]);       // a faixa que decide: a PONTA
  const morte = Math.max(0, hitbox - topo);
  const nota = files.indexOf(f) < HOJE.length
    ? 'HOJE (referencia)'
    : morte <= 8 ? `honesta (${morte}px de folga na ponta)` : `⚠️ mata ${morte}px no vazio na ponta`;
  console.log(
    f.split(/[\/]/).pop().padEnd(24) +
    String(W).padStart(4) + String(hitbox).padStart(6) + '  | ' +
    perfil.map((v) => String(v).padStart(4)).join(' ') + '   ' + nota,
  );
}
