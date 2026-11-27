// THE CANHÃO (spec 2026-11-26-medicao-das-lutas §4.1): the ship cannot be hurt; it keeps 90 px left of the boss's weak
// point of the moment, level with it, moving at its own max speed, and holds the fire key. It measures the SHORTEST
// time of each phase with a hand: the ceiling of what the hand can do.
//   node scripts/_rebalance/robo/canhao.mjs --chefe capitania|guardiao|torre|serpente --mao nenhuma|mediana|forte
//        [--porta 5173] [--teto 900 (game s)] [--saida file.json]
import fs from 'node:fs';
import { abrirLuta, arg, imprimir, instalarCanhao, olhar } from './comum.mjs';

const chefe = arg('--chefe', 'capitania');
const mao = arg('--mao', 'mediana');
const porta = arg('--porta', '5173');
const TETO = Number(arg('--teto', '900'));
const saida = arg('--saida', '');

const { browser, page, erros } = await abrirLuta({ porta, chefe, mao });
await instalarCanhao(page);
await page.keyboard.down('Space');
let teto = false;
for (;;) {
  const o = await olhar(page);
  if (o.morto) break;
  if (o.t > TETO) { teto = true; break; }
  await page.waitForTimeout(500);
}
await page.keyboard.up('Space');
await page.waitForTimeout(300);
const resumo = await page.evaluate(() => window.__registro.resumo());
imprimir(`canhão · ${chefe} · ${mao}`, resumo);
if (erros.length) console.log('ERROS NO CONSOLE:', erros.slice(0, 3));
if (saida) fs.writeFileSync(saida, JSON.stringify({ robo: 'canhao', chefe, mao, teto, resumo, erros: erros.slice(0, 5) }, null, 1));
await browser.close();
process.exit(0);
