// FATIA 7 · a régua das 64 candidaturas, olhadas como PEÇA DE CENÁRIO (não como faixa).
//
// ⚠️ A PERGUNTA MUDOU, E POR ISSO A RÉGUA MUDOU. Como faixa, a pergunta era "sangra nas três
// bordas?" e a resposta foi não para as 64. Como prop de cenário a pergunta é o OPOSTO: tem
// silhueta? não encosta nas bordas (senão o recorte aparece)? é escura o bastante para a fase?
// tem estrutura, ou é textura amorfa que vira borrão a 40px?
import fs from 'fs';
import sharp from 'sharp';

const ALVO = process.argv[2] ?? 'scripts/_f4/_cand';

// A luminância média das quatro pinturas da F4, medida em 09/09 (spec da moldura): a régua de
// valor da fase. Peça de cenário acima de ~1,5× a pintura vira adesivo aceso.
const LUM_PINTURA = 22;

const linhas = [];
for (const f of fs.readdirSync(ALVO).filter((n) => n.endsWith('.png')).sort()) {
  const img = sharp(`${ALVO}/${f}`);
  const { width: W, height: H } = await img.metadata();
  const { data } = await img.raw().toBuffer({ resolveWithObject: true });

  let minX = W, maxX = -1, minY = H, maxY = -1, opacos = 0, soma = 0;
  let bordaEsq = 0, bordaDir = 0, bordaTopo = 0, bordaBase = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] < 24) continue;
      opacos++;
      soma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0) bordaEsq++;
      if (x === W - 1) bordaDir++;
      if (y === 0) bordaTopo++;
      if (y === H - 1) bordaBase++;
    }
  }
  if (opacos === 0) { linhas.push({ f, vazio: true }); continue; }

  linhas.push({
    f,
    // Quanto do quadro a peça ocupa. Muito alto = é textura de quadro cheio, não prop.
    preenche: +(opacos / (W * H)).toFixed(2),
    caixa: `${maxX - minX + 1}x${maxY - minY + 1}`,
    // Encostar nas bordas laterais é o que denuncia o RECORTE quando a peça é prop solto.
    sangra: [bordaEsq, bordaDir, bordaTopo, bordaBase].map((n) => (n > 2 ? 1 : 0)).join(''),
    lum: Math.round(soma / opacos),
    // ⚠️ O número que a fase cobra: quantas vezes mais clara que a pintura da câmara.
    vsPintura: +(soma / opacos / LUM_PINTURA).toFixed(2),
  });
}

console.log('arquivo   preenche  caixa    sangra(E D T B)  lum  ×pintura');
for (const l of linhas) {
  if (l.vazio) { console.log(`${l.f}  VAZIO`); continue; }
  const alerta = l.vsPintura > 1.6 ? ' ⚠️ clara' : l.preenche > 0.9 ? ' ⚠️ quadro cheio' : '';
  console.log(
    `${l.f}  ${String(l.preenche).padStart(5)}  ${l.caixa.padStart(7)}  ${l.sangra.padStart(11)}  ${String(l.lum).padStart(4)}  ${String(l.vsPintura).padStart(6)}${alerta}`,
  );
}
