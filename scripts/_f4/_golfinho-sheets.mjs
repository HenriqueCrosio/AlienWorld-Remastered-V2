// O GOLFINHO (Fatia 7) — monta as três folhas do mini-chefão e recorta a bala dele.
//
// A arte são as animações PixMiniMax aprovadas pelo Henrique em 11/09 (nado, flip, cambalhota v1),
// 80×80 com o golfinho virado para a ESQUERDA. Os quadros crus moram em assets/raw/anim-golfinho/.
//
// ⚠️ A BALA DESENHADA É APAGADA, e é o motivo de este script existir. O flip e a cambalhota trazem
// a bala vermelha voando dentro do quadro; no jogo quem voa e fere é a bala REAL, e com as duas
// haveria dois tiros na tela e só um mataria. Em cada quadro de tiro apaga-se o que está FORA da
// silhueta da pose limpa anterior, e só à frente do focinho — o brilho da boca, que fica dentro do
// corpo, sobrevive.
//
// Uso: node scripts/_f4/_golfinho-sheets.mjs
import sharp from 'sharp';

const RAW = 'assets/raw/anim-golfinho';
const OUT = 'public/sprites';
const Q = 80;
/** Colunas à frente do focinho onde a bala desenhada mora (medido: ela vai de x=5 a x=30). */
const FRENTE = 31;

const CLIPES = [
  { nome: 'nado', n: 9, arquivo: 'golfinho-nado', tiro: null },
  // Medido em 11/09: o vermelho da bala aparece no quadro 11 do flip e no 14 da cambalhota; o
  // quadro anterior de cada um é a pose ereta, limpa.
  { nome: 'flip', n: 17, arquivo: 'golfinho-flip', tiro: { limpo: 10, primeiro: 11 } },
  { nome: 'cambalhota', n: 17, arquivo: 'golfinho-cambalhota', tiro: { limpo: 13, primeiro: 14 } },
];

const vermelho = (r, g, b) => r > 140 && g < 90 && b < 90;

async function carrega(nome, n) {
  const quadros = [];
  for (let i = 0; i < n; i++) {
    const { data, info } = await sharp(`${RAW}/${nome}/${i}.png`)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width !== Q || info.height !== Q) {
      throw new Error(`${nome}/${i}.png tem ${info.width}x${info.height}, esperado ${Q}x${Q}`);
    }
    quadros.push(Buffer.from(data));
  }
  return quadros;
}

const alfa = (buf, x, y) => buf[(y * Q + x) * 4 + 3];

/** O focinho da pose limpa: a coluna opaca mais à esquerda na faixa da boca (y 30..50). */
function focinho(ref) {
  let min = Q;
  for (let y = 30; y <= 50; y++) {
    for (let x = 0; x < Q; x++) {
      if (alfa(ref, x, y) >= 128) {
        min = Math.min(min, x);
        break;
      }
    }
  }
  return min;
}

let balaCrua = null;

for (const clipe of CLIPES) {
  const quadros = await carrega(clipe.nome, clipe.n);

  if (clipe.tiro) {
    const ref = quadros[clipe.tiro.limpo];
    const bico = focinho(ref);
    for (let i = clipe.tiro.primeiro; i < clipe.n; i++) {
      const q = quadros[i];
      // O que for apagado do flip no quadro 12 (o maior da bala) é a própria bala: guardado.
      const guarda = clipe.nome === 'flip' && i === 12 ? Buffer.alloc(Q * Q * 4) : null;
      let apagados = 0;
      for (let y = 0; y < Q; y++) {
        for (let x = 0; x < FRENTE; x++) {
          const k = (y * Q + x) * 4;
          if (q[k + 3] > 0 && alfa(ref, x, y) < 128) {
            // ⚠️ SÓ O QUENTE vai para a bala. O recuo do tiro desloca o contorno escuro do focinho
            // para fora da silhueta da pose limpa, e esses pixels cinza entravam no recorte como
            // cantos sujos (conferido na ampliação de 11/09). A bala é vermelha e branca: R alto.
            if (guarda && q[k] >= 140) q.copy(guarda, k, k, k + 4);
            q[k] = q[k + 1] = q[k + 2] = q[k + 3] = 0;
            apagados++;
          }
        }
      }
      if (guarda) balaCrua = guarda;
      // A VERIFICAÇÃO: nenhum vermelho sobra à frente do focinho da pose limpa.
      let sobra = 0;
      for (let y = 0; y < Q; y++) {
        for (let x = 0; x < bico; x++) {
          const k = (y * Q + x) * 4;
          if (q[k + 3] >= 128 && vermelho(q[k], q[k + 1], q[k + 2])) sobra++;
        }
      }
      console.log(`${clipe.nome} q${i}: ${apagados} px apagados, vermelho à frente do focinho (x<${bico}): ${sobra}`);
      if (sobra > 0) throw new Error(`${clipe.nome} q${i}: a bala desenhada sobreviveu (${sobra} px)`);
    }
  }

  await sharp({
    create: { width: Q * clipe.n, height: Q, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(quadros.map((q, i) => ({ input: q, raw: { width: Q, height: Q, channels: 4 }, left: i * Q, top: 0 })))
    .png()
    .toFile(`${OUT}/${clipe.arquivo}.png`);
  console.log(`✔ ${OUT}/${clipe.arquivo}.png (${clipe.n} quadros de ${Q}x${Q})`);
}

// ─── A BALA: o recorte do flip, virado para a DIREITA e reduzido a 13×9 ───
//
// ⚠️ 13×9 é o quadro do `bolt2` e da `shotAranha`: a hitbox do pool de balas inimigas vem desse
// quadro (ver `EnemySystem.release`). Reduzir é permitido pela lei da resolução.
// ⚠️ PARA A DIREITA porque a munição inimiga gira com `setRotation(angulo)`, e ângulo 0 é direita.
const bruta = await sharp(balaCrua, { raw: { width: Q, height: Q, channels: 4 } }).png().toBuffer();
const aparada = await sharp(bruta).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });
console.log(`bala crua: ${aparada.info.width}x${aparada.info.height}`);
const reduzida = await sharp(aparada.data)
  .flop()
  .resize(13, 9, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
// Alfa binário: meio-transparente numa bala de 13px vira borrão.
const px = reduzida.data;
for (let k = 3; k < px.length; k += 4) px[k] = px[k] >= 96 ? 255 : 0;
await sharp(px, { raw: { width: 13, height: 9, channels: 4 } }).png().toFile(`${OUT}/shot-golfinho.png`);
console.log(`✔ ${OUT}/shot-golfinho.png (13x9)`);
