// A IMAGEM DE ESTILO da nadadeira: o QUADRO 0 do `leviathan-swim-sheet`.
//
// ⚠️ POR QUE ESTA REFERÊNCIA, E POR QUE ELA NÃO É NEGOCIÁVEL. A nadadeira da 1ª volta foi gerada
// SEM referência nenhuma e reprovada no teste jogado ("ficou péssima"). Posta lado a lado com o
// `rabo-leviata.png` — canônico, aprovado depois de QUATRO reprovações —, ela não compartilhava
// um único traço: o rabo é placa escura segmentada com costura de energia; ela era ASA DE MORCEGO,
// com membrana e dedos ósseos.
//
// O quadro 0 desta sheet é o Leviatã BLINDADO do key art do Menu — o corpo que o jogo usa — e ele
// já tem a peitoral desenhada LISA, ESCURA, ARDÓSIA, sem membrana e sem dedos. É a instrução
// literal do Henrique: "baseada no corpo do leviatã usado, cor escura e nadadeira lisa".
//
// ⚠️ Gerar sem passar este quadro como estilo é repetir o erro de 02/09.
//
// ⚠️ E O PNG SAI INDEXADO (ver _png8.mjs). O base64 viaja DENTRO da chamada MCP, e string longa
// demais chega truncada — custou uma tentativa na garganta (2026-09-04).
//
//   node scripts/_cut3/_estilo-nadadeira.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import { png8 } from './_png8.mjs';

const SHEET = 'public/sprites/leviathan-swim-sheet.png';
const CELULA = 116; // o tamanho de quadro declarado em BootScene.SHEETS.leviathanSwimSheet
const CORES = 32;

const { data, info } = await sharp(SHEET)
  .extract({ left: 0, top: 0, width: CELULA, height: CELULA })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const png = png8(data, info.width, info.height, CORES);
fs.writeFileSync('scripts/_cut3/_estilo-nadadeira.png', png);
fs.writeFileSync('scripts/_cut3/_estilo-nadadeira.b64.txt', png.toString('base64'));

console.log(`scripts/_cut3/_estilo-nadadeira.png  ${CELULA}x${CELULA}  ${CORES} cores  ${png.length} bytes`);
console.log(`  ${png.toString('base64').length} chars de base64`);
console.log('⚠️  ABRA A IMAGEM antes de gerar: ela tem que mostrar o Leviatã blindado inteiro,');
console.log('    com a peitoral LISA e ESCURA. Se o quadro 0 estiver vazio ou cortado, a sheet');
console.log('    mudou de layout e a referência tem que ser re-medida.');
