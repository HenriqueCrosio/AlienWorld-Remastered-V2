// ASSA O NÚCLEO DA PORTA PULSANDO, a partir do estático APROVADO.
//
// ⚠️ POR QUE NÃO SAI DO GERADOR. Duas razões, e a segunda é específica desta peça:
//   1. o modelo não obedece limite de cor — é a mesma lição que `_assar-anim.mjs` já registrou:
//      *"pulsar = clarear"*, e duas rodadas pedindo "nunca branco" voltaram estouradas;
//   2. aqui só a FENDA respira. Gerar 8 quadros redesenharia a chapa inteira, e os REBITES iam
//      rastejar de quadro a quadro — um tremor de 1px em 40 pontos fixos, que ninguém nomeia mas
//      todo mundo vê. A chapa tem de sair IDÊNTICA nos 8 quadros, e identidade não se pede a um
//      gerador: se impõe aqui.
//
// ⚠️ O PICO É O ESTÁTICO, E O PULSO SÓ DESCE. `k` nunca passa de 1, então nenhum quadro pode ser
// mais claro que a peça que ele aprovou — o branco fica impossível por construção, não por
// vigilância. É o inverso do que o gerador faz, e é de propósito: a brasa ESFRIA e reacende.
//
// ⚠️ E ESFRIAR NÃO É ESCURECER. Uma brasa perde verde e azul antes do vermelho; multiplicar os
// três canais pelo mesmo número dá um botão de dimmer, que lê como bug de opacidade. Os expoentes
// abaixo (0,45 / 1,3 / 1,8) fazem o âmbar cair para vermelho-escuro, que é como fogo morre.
//
//   node scripts/_f4/_assar-porta-nucleo.mjs <estatico.png> <saida.png> [quadros=8] [min=0.45]
import sharp from 'sharp';

const [entrada, saida, nArg, minArg] = process.argv.slice(2);
if (!entrada || !saida) { console.error('uso: _assar-porta-nucleo.mjs <estatico.png> <saida.png> [quadros] [min]'); process.exit(1); }
const N = Number(nArg ?? 8);
const MIN = Number(minArg ?? 0.45);

const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// ⚠️ A MÁSCARA É SUAVE, e tem de ser. Um corte duro em "L > limiar" desenharia a borda da própria
// máscara no meio do pulso — uma silhueta que aparece e some, que é pior que não pulsar.
// `quente` isola a brasa do metal: a chapa é quase neutra, a fenda é âmbar forte.
const suave = (x, a, b) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const peso = new Float32Array(W * H);
let acesos = 0;
for (let i = 0; i < W * H; i++) {
  const o = i * 4;
  if (data[o + 3] < 8) continue;
  const r = data[o], g = data[o + 1], b = data[o + 2];
  const quente = suave((r - b) / 255, 0.12, 0.45);
  const claro = suave(L(r, g, b), 55, 130);
  peso[i] = quente * claro;
  if (peso[i] > 0.5) acesos++;
}
console.log(`máscara: ${acesos} px de brasa (de ${W * H}), peso máximo ${Math.max(...peso).toFixed(2)}`);
if (!acesos) { console.error('✘ nenhuma brasa encontrada — a máscara não pegou nada'); process.exit(1); }

const p99 = (buf) => {
  const vs = [];
  for (let i = 0; i < W * H; i++) { const o = i * 4; if (buf[o + 3] >= 8) vs.push(L(buf[o], buf[o + 1], buf[o + 2])); }
  vs.sort((a, b) => a - b);
  return { p99: vs[Math.floor(vs.length * 0.99)], media: vs.reduce((s, v) => s + v, 0) / vs.length };
};
const base = p99(data);

const quadros = [];
for (let f = 0; f < N; f++) {
  // ⚠️ COSSENO, e não uma rampa: o loop fecha por construção (o quadro N−1 encosta no 0 com a
  // mesma derivada), então a folha pode tocar em `repeat: -1` sem YOYO e sem tranco na virada.
  const k = MIN + (1 - MIN) * (0.5 + 0.5 * Math.cos((2 * Math.PI * f) / N));
  const kr = Math.pow(k, 0.45), kg = Math.pow(k, 1.3), kb = Math.pow(k, 1.8);
  const q = Buffer.from(data);
  for (let i = 0; i < W * H; i++) {
    const w = peso[i];
    if (w <= 0) continue;
    const o = i * 4;
    q[o]     = Math.round(data[o]     * (1 - w) + data[o]     * kr * w);
    q[o + 1] = Math.round(data[o + 1] * (1 - w) + data[o + 1] * kg * w);
    q[o + 2] = Math.round(data[o + 2] * (1 - w) + data[o + 2] * kb * w);
  }
  const m = p99(q);
  // AS TRAVAS, no espírito do `_assar-anim.mjs`: nenhum quadro passa do estático aprovado.
  const sinal = m.p99 <= base.p99 + 0.5 ? '✔' : '✘';
  console.log(`quadro ${f}  k=${k.toFixed(2)}  p99=${m.p99.toFixed(1)} (estático ${base.p99.toFixed(1)}) ${sinal}  média=${m.media.toFixed(1)}`);
  if (m.p99 > base.p99 + 0.5) { console.error('✘ um quadro ficou mais claro que o estático — a trava é o ponto deste script'); process.exit(1); }
  quadros.push(await sharp(q, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
}

await sharp({ create: { width: W * N, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(quadros.map((b, i) => ({ input: b, left: i * W, top: 0 })))
  .png().toFile(saida);
console.log(`\n${saida}  ${W * N}x${H}  (${N} quadros de ${W}x${H})`);
