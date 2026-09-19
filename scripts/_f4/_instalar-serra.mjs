// INSTALA A SERRA DO GUARDIÃO (Fase 4, skill nova de 19/09). Zero geração: só monta as folhas.
//
//   serra-guardiao.png        ← a candidata escolhida, parada (o motor cai nela se faltar clipe)
//   serra-giro-sheet.png      ← o giro no voo   (N × 96²)
//   serra-travada-sheet.png   ← travada na borda, tentando girar (N × 96²)
//
// A escolhida saiu de 4 candidatas em `assets/raw/serra-guardiao/` (folha
// `docs/superpowers/folhas/2026-09-19/serra-candidatas.png`): a `a-disco` é a única que LÊ COMO SERRA nos
// ~44px que ela tem na tela e respeita a lei do dark sci-fi — corpo escuro, luz só no core de lava.
// As outras: `b-cruz` e `d-volante` clareiam demais, `c-anel` some no fundo por não ter core.
//
// E o GLÓBULO NOVO da salva (`globulo-guardiao.png`), que ele pediu junto: *"os tiros podem continuar em
// salvas entre as skills, mas precisamos mudar o desenho dos projéteis"*. A escolhida é a **`2d-escoria`**,
// decisão dele depois de jogar (19/09: *"quero o glóbulo seja a escória"*) — crosta escura com veios de lava
// correndo por dentro. Eu tinha instalado a `2b-lasca` (lasca do mesmo aço da serra); ele preferiu a escória,
// e a preferência dele é o critério. ⚠️ É REDUZIDA de 32×16 para 16×8: o glóbulo antigo tinha 12×5, e ampliar
// arte assada é proibido neste projeto — reduzir pode.
//
//   node scripts/_f4/_instalar-serra.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const OUT = 'public/sprites';
const RAW = 'assets/raw/serra-guardiao';
const Q = 96;
const ESCOLHIDA = process.env.SERRA ?? `${RAW}/a-disco.png`;

await sharp(ESCOLHIDA).png().toFile(`${OUT}/serra-guardiao.png`);
console.log(`${OUT}/serra-guardiao.png`);

const quadros = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b)).map((f) => `${dir}/${f}`)
    : [];

for (const [nome, dir] of [
  ['serra-giro-sheet.png', `${RAW}/giro`],
  ['serra-travada-sheet.png', `${RAW}/travada`],
]) {
  const qs = quadros(dir);
  if (!qs.length) {
    console.log(`(pulado) ${nome}: sem quadros em ${dir}`);
    continue;
  }
  const comp = [];
  for (const [i, q] of qs.entries()) {
    const m = await sharp(q).metadata();
    if (m.width !== Q || m.height !== Q) throw new Error(`${q} é ${m.width}x${m.height}, esperado ${Q}²`);
    comp.push({ input: await sharp(q).toBuffer(), left: i * Q, top: 0 });
  }
  await sharp({ create: { width: qs.length * Q, height: Q, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comp).png().toFile(`${OUT}/${nome}`);
  console.log(`${OUT}/${nome}  (${qs.length} × ${Q}²)`);
}

// ─── O GLÓBULO DA SALVA ───
const GLOB = process.env.GLOBULO ?? 'assets/raw/globulo-guardiao/2d-escoria.png';
const g = await sharp(GLOB).metadata();
await sharp(GLOB)
  .resize(Math.round(g.width / 2), Math.round(g.height / 2), { kernel: 'nearest' })
  .png()
  .toFile(`${OUT}/globulo-guardiao.png`);
console.log(`${OUT}/globulo-guardiao.png  (${g.width}x${g.height} → ${Math.round(g.width / 2)}x${Math.round(g.height / 2)})`);
