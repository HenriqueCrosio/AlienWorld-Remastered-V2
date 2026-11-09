// BLOCO I, etapa 1 (09/11) — the explosions (plan `plans/2026-11-09-bloco-i-explosoes.md`):
//   receitas — every type draws, the same twice, no forbidden colour, the physics (no rising in the vacuum, rising in
//              the atmosphere), flesh without fire;
//   folhas   — the baked sheets match the generated manifest, alpha 0/255, the light layer, `escolheFolha` never enlarges;
//   tipo     — every material of the game maps to a baked type.
//   node scripts/test-explosoes.mjs [section …]
import fs from 'node:fs';
import sharp from 'sharp';
import { createFrame, clearFrame, painterFor } from '../src/fx/pixelfx/core/index.js';
import { TIPOS, TAMANHOS, ZONAS_DO_TIPO, receita } from './_i/explosoes/receitas.mjs';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const secoes = process.argv.slice(2);
const roda = (s) => !secoes.length || secoes.includes(s);
const lum = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
// the white flash of the first frames is allowed (r and g high too); warning red and free-lane white-blue are not
const proibida = (c) => (c[0] > 200 && c[1] < 80) || (c[2] > c[0] && lum(c) > 0.8 && !(c[0] > 240 && c[1] > 240));

function quadro(tipo, zona, tam, age, seed = 3) {
  const t = TAMANHOS[tam], f = createFrame(t.cel, t.cel);
  clearFrame(f);
  const p = painterFor(f);
  p.reset();
  p.place(t.cel / 2, t.cel / 2);
  receita(tipo, zona)(p, age, { R: t.R, D: t.D, seed });
  return f;
}
const centroY = (f) => { let s = 0, n = 0; for (let i = 0; i < f.color.length; i++) if (f.color[i] >>> 24) { s += Math.floor(i / f.w); n++; } return n ? s / n : NaN; };

if (roda('receitas')) {
  for (const tipo of TIPOS) for (const zona of ZONAS_DO_TIPO[tipo]) {
    const a = quadro(tipo, zona, 'M', 0.3), b = quadro(tipo, zona, 'M', 0.3);
    ok(a.color.some((v) => v) && a.color.every((v, i) => v === b.color[i]), `${tipo}/${zona}: desenha, e igual duas vezes`);
    let ruins = 0;
    for (const t of [0.1, 0.3, 0.6, 1.0]) {
      const f = quadro(tipo, zona, 'M', t);
      for (const v of f.color) if (v >>> 24) { const c = [v & 255, (v >>> 8) & 255, (v >>> 16) & 255]; if (proibida(c)) ruins++; }
    }
    ok(ruins === 0, `${tipo}/${zona}: nenhuma cor proibida (${ruins})`);
  }
  for (const tipo of ['perigo', 'chefeFim']) {
    const t = TAMANHOS.G;
    // (the centroid of a vacuum cloud wanders a few px with the draw of its lobes — that is not rising: it stays around
    // the burst's point; the atmosphere's sits clearly above the vacuum's at the same instant)
    const meio = t.cel / 2;
    const v1 = centroY(quadro(tipo, 'vac', 'G', t.D * 1.2)), a1 = centroY(quadro(tipo, 'atm', 'G', t.D * 1.2));
    ok(Math.abs(v1 - meio) < t.R * 0.35, `${tipo}: no vácuo a fumaça fica em volta do estouro (${(meio - v1).toFixed(1)} px)`);
    ok(v1 - a1 > t.R * 0.3, `${tipo}: na atmosfera ela sobe (${(v1 - a1).toFixed(1)} px acima da do vácuo)`);
  }
  {
    let quentes = 0;
    for (const t of [0.05, 0.15, 0.4]) {
      const f = quadro('carne', 'vac', 'M', t);
      for (const v of f.color) if (v >>> 24) { const r = v & 255, g = (v >>> 8) & 255; if (r > 200 && g > 120) quentes++; }
    }
    ok(quentes === 0, `carne: sem fogo (${quentes} px quentes)`);
  }
}

if (roda('folhas')) {
  const { FOLHAS_EXPLOSAO, escolheFolha, FAIXAS } = await import('../src/systems/explosoes/folhasExplosao.ts');
  let bytes = 0;
  for (const [chave, f] of Object.entries(FOLHAS_EXPLOSAO)) {
    const arq = `public/${f.arq}`, arqL = `public/${f.arqLuz}`;
    if (!fs.existsSync(arq) || !fs.existsSync(arqL)) { ok(false, `${chave}: os PNGs existem`); continue; }
    bytes += fs.statSync(arq).size + fs.statSync(arqL).size;
    const { data, info } = await sharp(arq).raw().toBuffer({ resolveWithObject: true });
    const mL = await sharp(arqL).metadata();
    let meio = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 0 && data[i] !== 255) meio++;
    const linhas = Math.ceil(f.quadros / f.colunas);
    ok(info.width === f.cel * f.colunas && info.width <= 4096 && info.height === f.cel * linhas && mL.width === info.width && mL.height === info.height && meio === 0,
      `${chave}: ${f.quadros} quadros de ${f.cel}px em ${f.colunas}×${linhas} (≤ 4096 px), a luz junto, alpha 0/255`);
  }
  ok(bytes <= 12 * 1024 * 1024, `as folhas somam ${(bytes / 1048576).toFixed(1)} MB (≤ 12)`);
  for (const tipo of TIPOS) for (const s of [0.3, 0.5, 1, 1.25, 1.5, 2, 2.6, 3.4]) {
    const e = escolheFolha(tipo, 'atm', s);
    if (!e || e.escala > 1) { ok(false, `${tipo} size ${s}: ${e ? `escala ${e.escala}` : 'sem folha'}`); }
  }
  ok(true, 'escolheFolha: nunca amplia (todos os tipos, de 0,3 a 3,4)');
  ok(FAIXAS.G.nativo >= 3.4, 'a grande cobre a bomba (explodeBig 1,7 = size 3,4)');
}

if (roda('tipo')) {
  const { tipoDoMaterial } = await import('../src/systems/explosoes/tipoExplosao.ts');
  const { SEPARACAO, CHEFOES, PECAS } = await import('../src/systems/morte/numerosDestrocos.ts');
  const { FOLHAS_EXPLOSAO } = await import('../src/systems/explosoes/folhasExplosao.ts');
  const tem = (t) => Object.keys(FOLHAS_EXPLOSAO).some((k) => k.startsWith(`${t}-`));
  for (const [n, v] of [...Object.entries(SEPARACAO), ...Object.entries(CHEFOES), ...Object.entries(PECAS)]) {
    const t = tipoDoMaterial(v.material, v.classe);
    if (!tem(t)) ok(false, `${n} (${v.material}) → ${t}: sem folha`);
  }
  ok(tipoDoMaterial('metal', 'chefe') === 'chefeFim' && tipoDoMaterial('metal', 'comum') === 'metal' && tipoDoMaterial(undefined) === 'perigo', 'metal chefe → chefeFim; sem material → perigo');
  ok(['luz', 'biomec', 'carne', 'rocha'].every((m) => tipoDoMaterial(m) === m), 'luz, biomec, carne e rocha têm a sua');
}

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok');
// (exitCode, not exit(): on Windows `process.exit` with sharp's handles still open aborts in libuv — a false failure)
process.exitCode = falhas ? 1 : 0;
