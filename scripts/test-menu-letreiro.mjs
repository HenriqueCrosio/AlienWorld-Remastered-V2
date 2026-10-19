// O NEON DO LETREIRO (spec 2026-10-19-menu-refeito-design.md §6.5): o gerador do jogo reproduz, pixel a pixel, os três
// estados aprovados na rodada 7 (o gabarito em scripts/fixtures/menu/). Uso, da raiz: node scripts/test-menu-letreiro.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { pintarLetreiro, faixasDasLetras, PAD } from '../src/menu/letreiroPixels.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const DIR = 'scripts/fixtures/menu';
const glifos = JSON.parse(fs.readFileSync(`${DIR}/glifos-alien-world.json`, 'utf8'));

for (const [estado, arquivo] of [['apagado', 'neon-apagado.png'], ['aceso', 'neon-aceso.png'], ['olhos', 'neon-olhos.png']]) {
  const img = pintarLetreiro(glifos, 4, estado);
  const { data, info } = await sharp(`${DIR}/${arquivo}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  conferir(img.w === info.width && img.h === info.height, `${estado}: o tamanho (${img.w}×${img.h})`, [info.width, info.height]);
  let dif = 0, primeiro = null;
  for (let i = 0; i < data.length; i++) {
    if (data[i] !== img.rgba[i]) {
      dif++;
      if (!primeiro) primeiro = { px: Math.floor(i / 4), canal: i % 4, gabarito: data[i], gerado: img.rgba[i] };
    }
  }
  conferir(dif === 0, `${estado}: idêntico ao aprovado, pixel a pixel`, { dif, primeiro });
}

const f4 = faixasDasLetras(glifos, 4);
conferir(f4.length === 10 && f4.map((l) => l.ch).join('') === 'ALIENWORLD', 'dez letras, na ordem', f4.map((l) => l.ch).join(''));
conferir(f4[0].ini === 0 && f4.at(-1).fim === glifos.w * 4 + 2 * PAD, 'as faixas cobrem o letreiro inteiro', [f4[0], f4.at(-1)]);
conferir(f4.every((l, i) => i === 0 || l.ini === f4[i - 1].fim), 'sem buraco nem sobreposição entre letras', null);

// Outra escala (Full HD, s = 5): o mesmo desenho num grão maior, com os olhos só no estado `olhos`.
const vermelhos = (img) => {
  let n = 0;
  for (let i = 0; i < img.rgba.length; i += 4) if (img.rgba[i] === 255 && img.rgba[i + 1] === 58 && img.rgba[i + 2] === 42) n++;
  return n;
};
const a5 = pintarLetreiro(glifos, 5, 'aceso'), o5 = pintarLetreiro(glifos, 5, 'olhos');
conferir(a5.w === glifos.w * 5 + 2 * PAD && a5.h === glifos.h * 5 + 2 * PAD, `em P = 5: ${a5.w}×${a5.h}`, null);
conferir(vermelhos(a5) === 0 && vermelhos(o5) > 0, 'os olhos só no estado com olhos', [vermelhos(a5), vermelhos(o5)]);
conferir(vermelhos(pintarLetreiro(glifos, 4, 'apagado')) === 0, 'apagado: sem nenhum sinal dos olhos', null);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
