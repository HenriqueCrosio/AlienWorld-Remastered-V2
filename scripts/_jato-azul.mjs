// O JATO AZUL DOS PROPULSORES (04/10, ele: *"ao escolher o propulsor, o jato da nave humana receba a coloração azul"*).
// Para cada nave humana (T0, T1 = o jato, T2, T3), os quadros do motor ganham uma versão `-azul`: só a CHAMA muda — a
// traseira (x < TRASEIRA) e só as cores de FOGO (muito brilhantes e saturadas, ou o branco do núcleo); os laranjas do
// casco ficam abaixo desse brilho e não mudam. A chama é remapeada pela luminância na rampa do ícone dos Propulsores.
// Lê os quadros aprovados (intocados) e escreve `<arquivo>-azul-anim-N.png`. Uso, da raiz: node scripts/_jato-azul.mjs
import fs from 'fs';
import sharp from 'sharp';

const NAVES = [
  // O JATO (T1): só a EXAUSTÃO desenhada à mão em 04/10 (`_exaustao-jato.mjs`, linhas 10–13). As amarelas no alto e
  // embaixo da traseira são as LUZES das asas (ele: *"aquelas luzes na asa pra mim sempre foram luzes"*) — ficam.
  { de: 'public/sprites/ship-jato-anim', para: 'public/sprites/ship-jato-azul-anim', linhas: [10, 13] },
  { de: 'public/sprites/naves/humana-t0-anim', para: 'public/sprites/naves/humana-t0-azul-anim' },
  { de: 'public/sprites/naves/humana-t2-anim', para: 'public/sprites/naves/humana-t2-azul-anim' },
  { de: 'public/sprites/naves/humana-t3-anim', para: 'public/sprites/naves/humana-t3-azul-anim' },
];
const TRASEIRA = 14;
// A rampa do ícone (icone-MOV_001): do azul fundo ao branco do núcleo, por luminância.
const RAMPA = [
  [90, '041ef7'],
  [130, '0378fa'],
  [165, '0399fa'],
  [195, '09cefa'],
  [225, '08ecfc'],
  [245, 'e2feff'],
  [256, 'fafcfc'],
];
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const ehFogo = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return (max >= 235 && (max - min) / max >= 0.6) || (min >= 200 && max >= 245);
};

for (const { de, para, linhas = [0, Infinity] } of NAVES) {
  const pasta = de.slice(0, de.lastIndexOf('/'));
  const base = de.slice(de.lastIndexOf('/') + 1);
  const quadros = fs.readdirSync(pasta).filter((f) => new RegExp(`^${base}-\\d+\\.png$`).test(f));
  let trocados = 0;
  for (const f of quadros) {
    const n = f.match(/-(\d+)\.png$/)[1];
    const { data, info } = await sharp(`${pasta}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = Math.max(0, linhas[0]); y <= Math.min(info.height - 1, linhas[1]); y++)
      for (let x = 0; x < Math.min(TRASEIRA, info.width); x++) {
        const k = (y * info.width + x) * 4;
        if (!data[k + 3] || !ehFogo(data[k], data[k + 1], data[k + 2])) continue;
        const l = lum(data[k], data[k + 1], data[k + 2]);
        const hex = RAMPA.find(([teto]) => l < teto)[1];
        data[k] = parseInt(hex.slice(0, 2), 16);
        data[k + 1] = parseInt(hex.slice(2, 4), 16);
        data[k + 2] = parseInt(hex.slice(4, 6), 16);
        trocados++;
      }
    await sharp(data, { raw: info }).png().toFile(`${para}-${n}.png`);
  }
  console.log(`${para}-*.png`, quadros.length, 'quadros,', trocados, 'pixels de chama');
}
