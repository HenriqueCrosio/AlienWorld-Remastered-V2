// A IMAGEM DE ESTILO que faz o PixelLab REDESENHAR a criatura em 191px.
//
// ⚠️ POR QUE ELA EXISTE. A face `south` do objeto tem 132x131 de conteúdo, e o enquadramento
// aprovado pede 191 de altura. Esticar 1,46x quebra a grade de pixel — é o erro nº 4 da 1ª volta
// (`setScale()` contra a lei "1px de arte = 1px de jogo").
//
// O caminho verificado: `create_1_direction_object` NÃO aceita `size` junto com `style_images` —
// quando há imagem de estilo, é A MAIOR DELAS que determina o tamanho da saída. Então a face sobe
// para 191x191 AQUI, entra como estilo, e o modelo REDESENHA naquela resolução em vez de esticar.
// É upscale por redesenho: o único que não quebra a grade.
//
// ⚠️ O REDIMENSIONAMENTO AQUI É LEGÍTIMO e não fere a lei: esta imagem NUNCA vai para
// `public/sprites/`. Ela é prompt, não asset.
//
// ⚠️ E O PNG TEM QUE SER PEQUENO, o que custou uma tentativa (2026-09-04). O base64 viaja DENTRO
// da chamada MCP, e uma string de ~10 mil caracteres chega truncada — o servidor recusa o PNG com
// "broken data stream". O `sharp` deste ambiente não tem libimagequant, então `png({palette:true})`
// não quantiza de verdade e o arquivo fica em 7,7 KB. `_png8.mjs` escreve um PNG INDEXADO à mão:
// 32 cores, ~4,4 KB, ~6 mil caracteres de base64. É o que passa.
//
//   node scripts/_cut3/_estilo-garganta.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import { png8 } from './_png8.mjs';

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const OBJ = '15f111fd-62c2-4689-9a33-93c931b5b796';
const CAIXA = { left: 19, top: 19, width: 132, height: 131 }; // medida por _med-south.mjs
const LADO = 191;
const CORES = 32;

const res = await fetch(`https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${OBJ}/rotations/south.png`);
if (!res.ok) throw new Error(`HTTP ${res.status}`);

const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()))
  .extract(CAIXA)
  // `nearest`: o lanczos inventaria meio-tons que o modelo leria como estilo borrado.
  .resize(LADO, LADO, { kernel: 'nearest' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const png = png8(data, info.width, info.height, CORES);
fs.writeFileSync('scripts/_cut3/_estilo-garganta.png', png);
fs.writeFileSync('scripts/_cut3/_estilo-garganta.b64.txt', png.toString('base64'));

console.log(`scripts/_cut3/_estilo-garganta.png  ${LADO}x${LADO}  ${CORES} cores  ${png.length} bytes`);
console.log(`scripts/_cut3/_estilo-garganta.b64.txt  ${png.toString('base64').length} chars de base64`);
