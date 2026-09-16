// INSTALA O PREDADOR (B3 da Fatia 7) — a 2ª forma do chefão final. Zero geração: só monta as folhas.
//
//   predador-s.png              ← furia-predador-giro/corrigido/0   (a S, o surgimento)
//   predador-luta.png           ← furia-predador-giro/corrigido/8   (três quartos p/ a esquerda: a pose da luta)
//   predador-teto.png           ← furia-predador-teto/base-espelhada (a luta espelhada, pendurado no teto)
//   predador-<clipe>-sheet.png  ← os quadros de cada clipe, em linha (N × 256²)
//
// ⚠️ SÓ O GIRO leva a correção de brilho (`corrigido/`): ele clareava quadro a quadro SEM querer. No urro,
// no idle e na lava o clarão do core é o gesto — igualar a lum ao quadro 0 apagaria o que o clipe diz.
// ⚠️ Clipe sem quadros é pulado (arte entra asset por asset): o motor cai no estático.
//
//   node scripts/_f4/_instalar-predador.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const OUT = 'public/sprites';
const Q = 256;
const ANIM = 'assets/raw/furia-predador-anim';
// A RODADA 2 (16/09, depois do 1º teste jogado): as escolhidas de cada clipe refeito. `-mini` = PixMiniMax.
const ANIM2 = 'assets/raw/furia-predador-anim2';

const CLIPES = {
  urro: `${ANIM}/urro`,
  giro: 'assets/raw/furia-predador-giro/corrigido',
  pulo: process.env.PULO ?? `${ANIM2}/pulo-mini`,
  idle: `${ANIM}/idle`,
  slash: `${ANIM2}/slash-mini`,
  lava: `${ANIM}/lava`,
  'teto-lava': `${ANIM2}/teto-mini`,
  morte: process.env.MORTE ?? `${ANIM2}/morte-mini`,
};

const quadros = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b)).map((f) => `${dir}/${f}`)
    : [];

for (const [saida, src] of [
  ['predador-s.png', 'assets/raw/furia-predador-giro/corrigido/0.png'],
  ['predador-luta.png', 'assets/raw/furia-predador-giro/corrigido/8.png'],
  // O teto é a pose de LUTA ESPELHADA: a pose editada (`teto/pose.png`) deformava o bicho (*"quase irreconhecível"*).
  ['predador-teto.png', 'assets/raw/furia-predador-teto/base-espelhada.png'],
]) {
  await sharp(src).png().toFile(`${OUT}/${saida}`);
  console.log(`${OUT}/${saida}`);
}

for (const [nome, dir] of Object.entries(CLIPES)) {
  const qs = quadros(dir);
  if (!qs.length) {
    console.log(`(pulado) ${nome}: sem quadros em ${dir}`);
    continue;
  }
  const comp = [];
  for (const [i, q] of qs.entries()) {
    const m = await sharp(q).metadata();
    if (m.width !== Q || m.height !== Q) throw new Error(`${q} é ${m.width}x${m.height}, esperado ${Q}²`);
    comp.push({ input: q, left: i * Q, top: 0 });
  }
  await sharp({ create: { width: qs.length * Q, height: Q, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comp)
    .png()
    .toFile(`${OUT}/predador-${nome}-sheet.png`);
  console.log(`${OUT}/predador-${nome}-sheet.png  (${qs.length} × ${Q}²)`);
}
