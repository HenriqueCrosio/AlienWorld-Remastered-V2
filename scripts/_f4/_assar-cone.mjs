// O CONE DO ESTOURO da garganta, assado em PIXEL na resolução nativa.
//
// ⚠️ ELE DISPARA PARA A DIREITA, e isso é regra de JOGO, não de estilo: o cone projeta para DENTRO
// do núcleo, longe da nave. Um estouro que se abrisse para trás mataria o jogador pelo próprio
// acerto — e a peça foi desenhada como fácil.
//
// ⚠️ ASSADO, NUNCA `Graphics`. A lei mais cara da Fatia 7.
//
// ⚠️ E ELE SÓ ESCURECE. Os expoentes são os mesmos do `_assar-porta-nucleo.mjs`: o branco-quente
// dura pouco, o âmbar sustenta, o vermelho-escuro sobra. Esfriar não é baixar o alpha — é a cor
// ANDAR na rampa, que é como fogo morre. Clarear no fim é o defeito que o gerador comete sozinho.
//
//   node scripts/_f4/_assar-cone.mjs
import sharp from 'sharp';

const W = 256,
  H = 176,
  N = 10;
const SAIDA = 'public/sprites/f4-cone-sheet.png';

const PARADAS = [
  [255, 236, 190],
  [255, 154, 52],
  [138, 32, 18],
];

let semente = 0x85ebca6b;
const rnd = () => {
  semente ^= semente << 13;
  semente ^= semente >>> 17;
  semente ^= semente << 5;
  return ((semente >>> 0) % 100000) / 100000;
};

const cor = (t) => {
  const s = Math.min(0.999, Math.max(0, t)) * (PARADAS.length - 1);
  const i = Math.floor(s),
    f = s - i;
  const a = PARADAS[i],
    b = PARADAS[Math.min(PARADAS.length - 1, i + 1)];
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f));
};

const quadros = [];
for (let q = 0; q < N; q++) {
  const t = q / (N - 1);
  // O alcance cresce rápido e para; o brilho cai o tempo todo. É assim que fogo morre.
  const alcance = W * Math.min(1, Math.pow(t, 0.42) * 1.2);
  const forca = Math.pow(1 - t * 0.92, 1.25);
  const buf = Buffer.alloc(W * H * 4, 0);
  for (let x = 0; x < alcance; x++) {
    const d = x / W;
    // A BOCA DO CONE: estreita na origem, ABERTA na ponta. O 96 estoura os 88px de meia-altura
    // do quadro de propósito — a ponta do cone sai por cima e por baixo da tela, e é isso que faz
    // um estouro parecer grande em vez de caber.
    const meia = 13 + d * 96;
    for (let dy = -meia; dy <= meia; dy++) {
      const y = Math.round(H / 2 + dy);
      if (y < 0 || y >= H) continue;
      // Perfil vertical CHEIO: o expoente 1.7 mantém o miolo inteiro quente e só derruba perto
      // da borda. Um perfil linear afina o cone todo e ele vira jato.
      const perfilY = 1 - Math.pow(Math.abs(dy) / meia, 1.7);
      // Perfil horizontal: a FRENTE é a mais quente, mas a cauda continua acesa. A 1ª versão
      // usava uma casca fina em volta da frente e o cone saía OCO.
      const perfilX = 0.55 + 0.45 * (1 - Math.abs(d - alcance / W) / Math.max(0.25, alcance / W));
      const calor = forca * perfilY * Math.max(0.2, perfilX);
      // ⚠️ MIOLO SÓLIDO, FRANJA DITHERIZADA — a correção que fez esta peça existir.
      //
      // A 1ª versão sorteava TODO pixel contra o calor e o cone saía RALO: lia como uma nuvem de
      // poeira, não como uma explosão. Num estouro o centro é matéria opaca; o que se desfaz é a
      // beirada. Dither no miolo é o erro que transforma fogo em chuvisco.
      let a;
      if (calor > 0.5) a = 255;
      else if (calor > 0.28) a = rnd() > 0.12 ? 226 : 0;
      else if (calor > 0.14) a = rnd() > 0.42 ? 176 : 0;
      else if (calor > 0.05) a = rnd() > 0.72 ? 116 : 0;
      else a = 0;
      if (a === 0) continue;
      const [r, g, b] = cor(1 - calor);
      const i = (y * W + x) * 4;
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = a;
    }
  }
  quadros.push(await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
}

await sharp({
  create: { width: W * N, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(quadros.map((input, i) => ({ input, left: i * W, top: 0 })))
  .png()
  .toFile(SAIDA);
console.log(`${SAIDA}  ${N} quadros de ${W}x${H}`);
