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

// ⚠️ A 1ª VERSÃO DESTA RÉGUA MEDIA A PERGUNTA ERRADA, e o erro só apareceu porque o resultado
// discordou do olho. Ela media, por COLUNA, o maior vazio vertical — e dava 0 para uma peça em
// forma de ANEL, que obviamente tem passagem. O que a nave precisa não é de uma coluna vazia: é de
// uma FAIXA HORIZONTAL livre de ponta a ponta, porque é na horizontal que ela voa.
//
// A régua agora varre LINHAS: uma linha é livre se nenhuma coluna da peça a obstrui. O maior bloco
// de linhas livres consecutivas é a fresta. Na lasca da porta isso dá a banda entre as duas metades.
for (const f of process.argv.slice(2)) {
  const { data, info } = await (await pegar(f)).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const opaco = (x, y) => data[(y * W + x) * 4 + 3] > 40;

  // O topo e a base da SILHUETA inteira: fora disso é o vazio em volta, não passagem.
  let topo = -1, base = -1;
  for (let y = 0; y < H; y++) {
    let tem = false;
    for (let x = 0; x < W && !tem; x++) if (opaco(x, y)) tem = true;
    if (tem) { if (topo < 0) topo = y; base = y; }
  }

  // ⚠️ TOLERÂNCIA: UM CABO PENDURADO NÃO É PAREDE. A 2ª versão desta régua exigia a linha
  // PERFEITAMENTE vazia e dava 0 para um destroço que o olho lê como aberto — porque dois ou três
  // fios de cabo arrancado cruzam o vão. Esses fios são a parte que faz a peça parecer arrancada, e
  // mecanicamente não bloqueiam nada: o destroço é `inerte`, como a lasca da porta.
  //
  // Uma linha conta como LIVRE quando menos de 8% da largura da peça a ocupa. O 8% é largo o
  // bastante para os fios e estreito o bastante para não deixar passar uma chapa.
  const larguraPeca = (() => {
    let e = W, d = 0;
    for (let x = 0; x < W; x++) for (let y = topo; y <= base; y++) if (opaco(x, y)) { if (x < e) e = x; if (x > d) d = x; break; }
    return Math.max(1, d - e + 1);
  })();
  const LIMITE = Math.max(2, Math.round(larguraPeca * 0.08));

  let maior = 0, corrente = 0, fimDaFaixa = -1;
  for (let y = topo; y <= base; y++) {
    let ocupado = 0;
    for (let x = 0; x < W; x++) if (opaco(x, y)) ocupado++;
    if (ocupado > LIMITE) corrente = 0;
    else { corrente++; if (corrente > maior) { maior = corrente; fimDaFaixa = y; } }
  }

  const nome = f.split('/').slice(-2).join('/');
  const veredicto = maior >= 38 ? 'PASSA' : maior >= 24 ? 'apertado' : 'NÃO PROMETE PASSAGEM';
  console.log(
    `${String(maior).padStart(3)}px de faixa livre  ` +
      `(y ${fimDaFaixa - maior + 1}..${fimDaFaixa} de uma peça de ${base - topo + 1}px)  ` +
      `${veredicto.padEnd(21)} ${nome}`,
  );
}
console.log('');
console.log('referência: a lasca da porta promete 38px, e a nave tem corpo 17×6 / sprite 31×15');
