// BLOCO I, etapa 2 (13/11) — the flashes become local light / vignette / weak screen (plan `plans/2026-11-13-bloco-i-flashes.md`):
//   regras — the ceiling, the impact radius, the disc, the vignette, the quantisation;
//   src    — no camera flash left in src/.
//   node scripts/test-claroes.mjs [section …]
import fs from 'node:fs';
import path from 'node:path';
import { CLARAO, nivel, forcaDisco, forcaVinheta, raioDoImpacto, teto } from '../src/systems/clarao/claraoRegras.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const secoes = process.argv.slice(2);
const roda = (s) => !secoes.length || secoes.includes(s);

if (roda('regras')) {
  const j = [];
  const f = [0, 100, 200, 300, 400].map((t) => teto(j, t));
  ok(f[0] === 1 && f[1] === 1 && f[2] === 1, 'o teto: os 3 primeiros do segundo saem inteiros');
  ok(f[3] === CLARAO.teto.atenuado && f[4] === CLARAO.teto.atenuado, 'o teto: do 4º em diante, atenuado');
  ok(teto(j, 1500) === 1, 'o teto: depois de 1 s sem nada, volta inteiro');
  ok(raioDoImpacto(0.1) === 40 && raioDoImpacto(9) === 120, 'o raio do impacto fica entre 40 e 120');
  ok(raioDoImpacto(1) === 56 && raioDoImpacto(1.7) % 4 === 0, 'o raio do impacto: 56 por escala, em múltiplos de 4');
  ok(forcaDisco(60, 60, 60) > 0.9 && forcaDisco(0, 0, 60) === 0 && forcaDisco(119, 60, 60) < 0.01, 'o disco: cheio no centro, zero fora do raio');
  ok(forcaVinheta(192, 108) === 0 && forcaVinheta(96, 108) === 0, 'a vinheta: o meio da tela fica limpo');
  ok(forcaVinheta(0, 0) === 1 && forcaVinheta(383, 215) === 1, 'a vinheta: cheia nos cantos');
  let max = 0, min = 9;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) for (const v of [0, 0.3, 0.7, 1, 2]) { const n = nivel(v, x, y); max = Math.max(max, n); min = Math.min(min, n); }
  ok(max === CLARAO.niveis && min === 0, 'a quantização: de 0 a 4 níveis, nunca mais');
  ok(nivel(0, 3, 3) === 0, 'a quantização: luz zero não acende pixel nenhum');
}

if (roda('src')) {
  const achados = [];
  const anda = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) anda(p); else if (/\.ts$/.test(e.name) && /cameras\.main\.flash\(|\.flashEffect/.test(fs.readFileSync(p, 'utf8'))) achados.push(p); } };
  anda('src');
  ok(achados.length === 0, `nenhum flash de câmera em src/ ${achados.length ? '→ ' + achados.join(', ') : ''}`);
}

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok');
process.exitCode = falhas ? 1 : 0;
