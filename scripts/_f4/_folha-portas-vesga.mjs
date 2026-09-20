// O TESTE DE VESGA — o que sobra da porta quando o jogador NÃO está olhando para ela.
//
// ⚠️ ZOOM 3× FAVORECE TODO CANDIDATO. Numa fase que rola a 110px/s a porta é vista de relance,
// e a pergunta do Bloco C (*"a porta diz 'atire em mim' antes de você bater nela?"*) é sobre
// esse relance, não sobre a peça parada debaixo de uma lupa. Borrar a cena joga fora o detalhe
// e deixa só a MASSA DE LUZ: o que continuar visível é o que o olho pega em movimento.
//
// Mede também para onde o olho vai: a fração da luz da tela que está DENTRO da porta.
//
//   node scripts/_f4/_folha-portas-vesga.mjs <cand.png>...
import sharp from 'sharp';
import fs from 'fs';

// ⚠️ SAÍDA CONFIGURÁVEL: no Windows um visualizador com o PNG aberto TRAVA o arquivo, e o sharp
// morre com 'unable to open for write' depois de já ter feito todo o trabalho. FOLHA_OUT salva a
// folha noutro nome em vez de perder a rodada.
const SAIDA = process.env.FOLHA_OUT || 'scripts/_f4/_folha-portas-vesga.png';

const arqs = process.argv.slice(2);
if (!arqs.length) { console.error('uso: node _folha-portas-vesga.mjs <png>...'); process.exit(1); }
const INFO = JSON.parse(fs.readFileSync('scripts/_f4/_cena-duto.json', 'utf8'));
const X_PORTA = 384 - 64 - 40, Y_PORTA = INFO.centroVao - 56;
const Z = 3, PAD = 12, TOPO = 46, BORRAO = 2.2;

const comps = [], rot = [];
let x = PAD;
const colW = 384 * Z / 2;   // metade da tela: a janela onde a porta vive
const JAN_W = 192, JAN_X = 384 - JAN_W;
const altura = TOPO + 216 * Z + PAD;

for (const f of arqs) {
  // ⚠️ DUAS ETAPAS, sempre: `composite().extract()` no mesmo pipeline recorta ANTES de colar.
  const colada = await sharp('scripts/_f4/_cena-duto.png')
    .composite([{ input: f, left: X_PORTA, top: Y_PORTA }]).png().toBuffer();

  const cena = await sharp(colada).extract({ left: JAN_X, top: 0, width: JAN_W, height: 216 })
    .resize(JAN_W * Z, 216 * Z, { kernel: 'nearest' })
    .blur(BORRAO * Z)
    .png().toBuffer();
  comps.push({ input: cena, left: x, top: TOPO });

  // ONDE ESTÁ A LUZ: soma a luminância da tela inteira e a fração dela dentro do retângulo da porta.
  const { data, info } = await sharp(colada).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, CH = info.channels;
  let total = 0, dentro = 0;
  for (let y = 0; y < info.height; y++) {
    for (let cx = 0; cx < W; cx++) {
      const o = (y * W + cx) * CH;
      const L = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
      const peso = L > 60 ? L : 0;   // só a luz conta; a massa escura não puxa o olho
      total += peso;
      if (cx >= X_PORTA && cx < X_PORTA + 64 && y >= Y_PORTA && y < Y_PORTA + 112) dentro += peso;
    }
  }
  const pct = (100 * dentro / total).toFixed(1);
  rot.push({ x, nome: f.replace(/^.*[\/]/, ''), pct });
  console.log(`${f.replace(/^.*[\/]/, '').padEnd(24)} ${pct}% da luz da tela está DENTRO da porta`);
  x += colW + PAD;
}

const largura = x;
const t = (x, y, s, cor, tam, peso) =>
  `<text x="${x}" y="${y}" font-family="Segoe UI, sans-serif" font-size="${tam}" font-weight="${peso}" fill="${cor}">${s}</text>`;
const svg = `<svg width="${largura}" height="${altura}" xmlns="http://www.w3.org/2000/svg">
  ${t(PAD, 24, 'O TESTE DE VESGA — a cena borrada: o que sobra é o que o olho pega de relance', '#f0c674', 16, 700)}
  ${rot.map((r, i) => t(r.x, TOPO - 8, `${i + 1} · ${r.nome}  —  ${r.pct}% da luz da tela`, '#e8e2d8', 14, 600)).join('')}
</svg>`;
await sharp({ create: { width: largura, height: altura, channels: 4, background: { r: 22, g: 22, b: 26, alpha: 1 } } })
  .composite([...comps, { input: Buffer.from(svg), left: 0, top: 0 }])
  .png().toFile(SAIDA);
console.log(`\nscripts/_f4/_folha-portas-vesga.png  ${largura}x${altura}`);
