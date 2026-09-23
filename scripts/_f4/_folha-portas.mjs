// A FOLHA DOS CANDIDATOS A PORTA, DENTRO DO DUTO.
//
// ⚠️ CANDIDATO EM FUNDO QUADRICULADO NÃO DIZ NADA. A pergunta do critério de aceite do Bloco C é
// *"a porta diz 'atire em mim' antes de você bater nela?"*, e isso só se responde com a peça
// contra a parede de carne, no tamanho de tela, centrada no VÃO que ela tem de tapar.
//
// ⚠️ E A PRIMEIRA VERSÃO DESTA FOLHA MENTIU. `sharp(x).composite(...).extract(...)` NÃO faz o que
// se lê: o `extract` roda ANTES do `composite` no mesmo pipeline, então a cena era recortada e a
// porta colada depois, em coordenadas de outra imagem. O resultado foi uma folha com a porta alta
// demais, que eu quase mandei ele julgar. Por isso as duas etapas abaixo são SEPARADAS, com um
// `.toBuffer()` no meio: colar, materializar, e só então recortar.
//
//   node scripts/_f4/_ver-portas-cena.mjs      (uma vez, para ter a cena e o vão)
//   node scripts/_f4/_folha-portas.mjs <cand.png>...
import sharp from 'sharp';
import fs from 'fs';

// ⚠️ SAÍDA CONFIGURÁVEL: no Windows um visualizador com o PNG aberto TRAVA o arquivo, e o sharp
// morre com 'unable to open for write' depois de já ter feito todo o trabalho. FOLHA_OUT salva a
// folha noutro nome em vez de perder a rodada.
const SAIDA = process.env.FOLHA_OUT || 'scripts/_f4/_folha-portas.png';

const arqs = process.argv.slice(2);
if (!arqs.length) { console.error('uso: node _folha-portas.mjs <png>...'); process.exit(1); }

const CENA = 'scripts/_f4/_cena-duto.png';
if (!fs.existsSync(CENA)) { console.error(`falta ${CENA} — rode _ver-portas-cena.mjs antes`); process.exit(1); }
const INFO = JSON.parse(fs.readFileSync('scripts/_f4/_cena-duto.json', 'utf8'));

const X_PORTA = 384 - 64 - 40;       // onde a peça é colada na cena
const JAN_W = 150, JAN_X = 384 - JAN_W;
const Z = 3, PAD = 12, TOPO = 46, PIX_Z = 3;

const comps = [], rot = [];
let x = PAD;
const colW = Math.max(JAN_W * Z, 64 * PIX_Z);
const altura = TOPO + 112 * PIX_Z + PAD + 216 * Z + PAD;

for (const f of arqs) {
  const m = await sharp(f).metadata();
  if (m.width !== 64 || m.height !== 112) console.error(`⚠️ ${f} é ${m.width}x${m.height}, e a sonda cobra 64x112`);

  comps.push({ input: await sharp(f).resize(64 * PIX_Z, 112 * PIX_Z, { kernel: 'nearest' }).png().toBuffer(),
    left: x + Math.round((colW - 64 * PIX_Z) / 2), top: TOPO });

  // ETAPA 1 — colar e MATERIALIZAR.
  const colada = await sharp(CENA)
    .composite([{ input: f, left: X_PORTA, top: INFO.centroVao - 56 }])
    .png().toBuffer();
  // ETAPA 2 — recortar o buffer já colado.
  const cena = await sharp(colada)
    .extract({ left: JAN_X, top: 0, width: JAN_W, height: 216 })
    .resize(JAN_W * Z, 216 * Z, { kernel: 'nearest' }).png().toBuffer();
  comps.push({ input: cena, left: x + Math.round((colW - JAN_W * Z) / 2), top: TOPO + 112 * PIX_Z + PAD });

  rot.push({ x, nome: f.replace(/^.*[\/]/, '') });
  x += colW + PAD;
}

const largura = x;
const t = (x, y, s, cor, tam, peso) =>
  `<text x="${x}" y="${y}" font-family="Segoe UI, sans-serif" font-size="${tam}" font-weight="${peso}" fill="${cor}">${s}</text>`;
const svg = `<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
  ${t(PAD, 22, 'CANDIDATOS À PORTA DO DUTO — 64×112 · em cima o pixel (3×), embaixo plantada no vão, escala de jogo (3×)', '#f0c674', 15, 700)}
  ${t(PAD, 38, `o vão desta cena vai de y=${INFO.teto} a y=${INFO.chao}; a peça de ${INFO.centroVao - 56} a ${INFO.centroVao + 55}`, '#9aa0a6', 12, 400)}
  ${rot.map((r, i) => t(r.x, TOPO - 8, `${i + 1} · ${r.nome}`, '#e8e2d8', 14, 600)).join('')}
</svg>`;

await sharp({ create: { width: largura, height: altura, channels: 4, background: { r: 22, g: 22, b: 26, alpha: 1 } } })
  .composite([...comps, { input: Buffer.from(svg), left: 0, top: 0 }])
  .png().toFile(SAIDA);
console.log(`${SAIDA}  ${largura}x${altura}`);
