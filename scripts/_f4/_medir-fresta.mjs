// A FRESTA DE UM DESTROÇO — quanto de passagem LIVRE a arte promete, medido em px.
//
// ⚠️ A ARTE TEM DE PROMETER A PASSAGEM QUE O MOTOR ENTREGA, e essa conta já existe nesta fase: a
// lasca da porta mede **38px** de fresta contra um corpo de nave de 17×6 e um sprite de 31×15
// (`_medir-nave.mjs`). Um destroço com fresta menor mostra uma passagem que a nave não cabe, e
// o jogador lê isso como bug mesmo quando o `inerte` deixa ele atravessar.
//
// Mede, para cada coluna da peça, a maior faixa VERTICAL transparente que não toca o topo nem a
// base — ou seja, um buraco de verdade, não o vazio em volta da silhueta. Reporta a pior coluna
// da metade central, que é por onde a nave passa.
//
//   node scripts/_f4/_medir-fresta.mjs <arquivo-ou-url>...
import sharp from 'sharp';

const pegar = async (f) => {
  if (!/^https?:/.test(f)) return sharp(f);
  const r = await fetch(f);
  if (!r.ok) throw new Error(`${r.status} em ${f}`);
  return sharp(Buffer.from(await r.arrayBuffer()));
};

for (const f of process.argv.slice(2)) {
  const { data, info } = await (await pegar(f)).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const opaco = (x, y) => data[(y * W + x) * 4 + 3] > 40;

  let piorCentro = Infinity;
  let melhor = 0;
  let colMelhor = -1;
  for (let x = 0; x < W; x++) {
    // O topo e a base da SILHUETA nesta coluna. Sem peça na coluna, ela não conta.
    let topo = -1,
      base = -1;
    for (let y = 0; y < H; y++) if (opaco(x, y)) { if (topo < 0) topo = y; base = y; }
    if (topo < 0) continue;
    // A maior faixa transparente ENTRE o topo e a base: o buraco.
    let maior = 0,
      corrente = 0;
    for (let y = topo; y <= base; y++) {
      if (opaco(x, y)) corrente = 0;
      else { corrente++; if (corrente > maior) maior = corrente; }
    }
    if (maior > melhor) { melhor = maior; colMelhor = x; }
    // A metade central é por onde a nave passa de verdade.
    if (x > W * 0.3 && x < W * 0.7 && maior < piorCentro) piorCentro = maior;
  }

  const nome = f.split('/').slice(-3).join('/');
  const veredicto =
    piorCentro >= 38 ? 'PASSA' : piorCentro >= 24 ? 'apertado' : 'NÃO PROMETE PASSAGEM';
  console.log(
    `${String(piorCentro === Infinity ? 0 : piorCentro).padStart(3)}px no pior ponto do meio  ` +
      `(maior buraco ${melhor}px na coluna ${colMelhor})  ${veredicto.padEnd(21)} ${nome}`,
  );
}
console.log('\nreferência: a lasca da porta promete 38px, e a nave tem corpo 17×6 / sprite 31×15');
