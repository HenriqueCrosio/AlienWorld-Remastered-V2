// Espelha PNGs horizontalmente NO DISCO, EM BLOCO.
//
// Por que em bloco, e não um `--flip` por arquivo: `install-anim.mjs` recorta o estático e todos
// os quadros pela MESMA caixa união, e é isso que impede o sprite de tremer entre eles. Espelhar
// a caixa inteira preserva esse alinhamento (todo mundo tem a mesma largura, então o espelho de
// cada um cai no mesmo lugar); reinstalar um arquivo por vez com um recorte próprio, não.
//
// Quando é preciso: a convenção do projeto é que a arte nasce apontando para a DIREITA (o jogo
// espelha em runtime via setFlipX quando a nave vem na sua direção). O PixelLab não obedece o
// "facing right" do prompt de forma confiável — ver a lição no plano do passe visual da Fase 2.
//
// uso: node scripts/espelhar.mjs <arquivo.png> [arquivo.png ...]
import sharp from 'sharp';
import fs from 'fs';

const arquivos = process.argv.slice(2);
if (!arquivos.length) {
  console.error('uso: node scripts/espelhar.mjs <arquivo.png> [...]');
  process.exit(1);
}

for (const f of arquivos) {
  // `.toFile` no mesmo caminho que está sendo lido corromperia o arquivo — sharp faz streaming.
  const buf = await sharp(f).flop().png().toBuffer();
  fs.writeFileSync(f, buf);
  const { width, height } = await sharp(buf).metadata();
  console.log(`${f} espelhado (${width}x${height})`);
}
