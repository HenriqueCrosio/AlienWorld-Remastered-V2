// O ACERTO DE VALOR DE UMA FAIXA (Fatia 7 · a moldura).
//
// ⚠️ "Mais contraste que a pintura" NÃO quer dizer "mais clara que a pintura". Foi assim que eu
// escrevi a lei na spec e foi assim que ela saiu errada: as quatro faixas nasceram de 1,55× a
// 4,06× mais claras que o próprio fundo, e uma parede 4× mais clara que o lugar onde ela está
// não lê como plano da frente — lê como adesivo branco.
//
// O que "plano da frente" quer dizer, em número:
//   • a MÉDIA da faixa fica pouco acima da média da pintura (alvo 1,3×), não muito
//   • o CONTRASTE INTERNO da faixa sobe (fator 1,4) — a diferença mora DENTRO da peça
//
// Ou seja: a faixa é mais contrastada e só um pouco mais presente. O brilho é local, não geral.
//
//   node scripts/_f4/_valor-faixa.mjs <faixa.png> <pintura.png> <saida.png> [alvo] [contraste]
import sharp from 'sharp';

const [faixa, pintura, saida, alvoArg, contArg] = process.argv.slice(2);
if (!saida) { console.error('uso: _valor-faixa.mjs <faixa> <pintura> <saida> [alvo=1.3] [contraste=1.4]'); process.exit(1); }
const ALVO = Number(alvoArg ?? 1.3), K = Number(contArg ?? 1.4);

const media = async (f) => {
  const { data } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let s = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; n++;
  }
  return s / n;
};

const mp = await media(pintura), mf = await media(faixa);
const g = (mp * ALVO) / mf;                       // o ganho que leva a média ao alvo
const alvoMedia = mp * ALVO;

const { data, info } = await sharp(faixa).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  for (let c = 0; c < 3; c++) {
    const v = data[i + c] * g;
    data[i + c] = Math.max(0, Math.min(255, alvoMedia + (v - alvoMedia) * K));
  }
}
await sharp(data, { raw: info }).png().toFile(saida);
console.log(`${saida}  pintura ${mp.toFixed(1)}  faixa ${mf.toFixed(1)} -> ${(await media(saida)).toFixed(1)}  (alvo ${alvoMedia.toFixed(1)})`);
