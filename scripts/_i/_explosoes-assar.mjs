// BLOCO I, etapa 1 (09/11) — BAKES the explosion recipes (`explosoes/receitas.mjs`) into sprite sheets and writes the
// manifest `src/systems/explosoes/folhasExplosao.ts` (plan `plans/2026-11-09-bloco-i-explosoes.md` Task 3).
// Per type × zone × size (the implosion only vac-G): frames at 20 fps until the colour and the light are empty 2 frames
// in a row (cap 3 s), each frame two cells — the COLOUR (the painter's opaque pixels, alpha 0/255) and the LIGHT (the
// additive buffer: RGB = the light, alpha 255 where there is any; the game plays it with blendMode ADD). The frames go
// in a GRID no wider than 4096 px (a single row of the big one would be ~11 000 px: past many GPUs' texture limit).
// A fixed seed per type: the same burst every time (the game varies it by scale and flipX).
//   node scripts/_i/_explosoes-assar.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createFrame, clearFrame, painterFor } from '../../src/fx/pixelfx/core/index.js';
import { TIPOS, TAMANHOS, ZONAS_DO_TIPO, receita } from './explosoes/receitas.mjs';

const FPS = 20, LARG_MAX = 4096, TETO = 3;
const DIR = 'public/sprites/explosoes';
const MANIFESTO = 'src/systems/explosoes/folhasExplosao.ts';
fs.mkdirSync(DIR, { recursive: true });
fs.mkdirSync(path.dirname(MANIFESTO), { recursive: true });

const entradas = [];
for (const [ti, tipo] of TIPOS.entries()) {
  for (const zona of ZONAS_DO_TIPO[tipo]) {
    for (const tam of tipo === 'implosao' ? ['G'] : ['P', 'M', 'G']) {
      const t = TAMANHOS[tam], cel = t.cel, desenha = receita(tipo, zona), seed = 3 + ti;
      const cores = [], luzes = [];
      let vazios = 0;
      for (let q = 0; q < TETO * FPS; q++) {
        const age = q / FPS, f = createFrame(cel, cel);
        clearFrame(f);
        const p = painterFor(f);
        p.reset();
        p.place(cel / 2, cel / 2);
        desenha(p, age, { R: t.R, D: t.D, seed });
        const cor = Buffer.alloc(cel * cel * 4), luz = Buffer.alloc(cel * cel * 4);
        let tem = false;
        for (let i = 0; i < cel * cel; i++) {
          const c = f.color[i], a = c >>> 24;
          if (a >= 128) { cor[i * 4] = c & 255; cor[i * 4 + 1] = (c >>> 8) & 255; cor[i * 4 + 2] = (c >>> 16) & 255; cor[i * 4 + 3] = 255; tem = true; }
          const l = f.light[i];
          const r = l & 255, g = (l >>> 8) & 255, b = (l >>> 16) & 255;
          if (r | g | b) { luz[i * 4] = r; luz[i * 4 + 1] = g; luz[i * 4 + 2] = b; luz[i * 4 + 3] = 255; tem = true; }
        }
        if (!tem && q > 2) { if (++vazios >= 2) break; } else vazios = 0;
        cores.push(cor); luzes.push(luz);
      }
      // drop the trailing empty frames
      while (cores.length > 1 && !cores[cores.length - 1].some((v, i) => i % 4 === 3 && v) && !luzes[luzes.length - 1].some((v, i) => i % 4 === 3 && v)) { cores.pop(); luzes.pop(); }
      const n = cores.length, colunas = Math.min(n, Math.floor(LARG_MAX / cel)), linhas = Math.ceil(n / colunas);
      const chave = `${tipo}-${zona}-${tam}`;
      for (const [sufixo, buf] of [['', cores], ['-luz', luzes]]) {
        const comps = buf.map((b, k) => ({ input: b, raw: { width: cel, height: cel, channels: 4 }, left: (k % colunas) * cel, top: Math.floor(k / colunas) * cel }));
        await sharp({ create: { width: colunas * cel, height: linhas * cel, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
          .composite(comps).png({ compressionLevel: 9, palette: false }).toFile(path.join(DIR, `${chave}${sufixo}.png`));
      }
      entradas.push({ chave, cel, quadros: n, colunas });
      console.log(chave, `${n} quadros (${(n / FPS).toFixed(2)} s), ${colunas}×${linhas} de ${cel}px`);
    }
  }
}

const ts = `// GERADO por scripts/_i/_explosoes-assar.mjs — não editar à mão (bloco I, etapa 1; spec
// \`specs/2026-11-09-bloco-i-explosoes-design.md\`). As explosões do jogo, por tipo × zona × tamanho: a folha de COR e a de
// LUZ (tocada em ADD por cima), em grade de \`colunas\`, a ${FPS} quadros/s.
export interface FolhaExplosao {
  chave: string;
  luz: string;
  arq: string;
  arqLuz: string;
  cel: number;
  quadros: number;
  colunas: number;
}
export const FPS_EXPLOSAO = ${FPS};
/** o maior \`size\` (as unidades do \`Fx.explode\`) que cada tamanho cobre, e o size em que ele foi assado (escala 1) */
export const FAIXAS = { P: { ate: 1.25, nativo: 1.25 }, M: { ate: 2, nativo: 2 }, G: { ate: Infinity, nativo: 3.4 } } as const;
export const FOLHAS_EXPLOSAO: Record<string, FolhaExplosao> = {
${entradas.map((e) => `  '${e.chave}': { chave: 'explosao-${e.chave}', luz: 'explosao-${e.chave}-luz', arq: 'sprites/explosoes/${e.chave}.png', arqLuz: 'sprites/explosoes/${e.chave}-luz.png', cel: ${e.cel}, quadros: ${e.quadros}, colunas: ${e.colunas} },`).join('\n')}
};
/**
 * A folha e a escala (≤ 1: o jogo só REDUZ) de um estouro. A zona cai no vácuo quando o tipo não tem a da atmosfera;
 * um tipo sem folha cai no \`perigo\` (o A). \`explodeBig(escala e)\` equivale a \`size = 2 × e\`.
 */
export function escolheFolha(tipo: string, zona: 'vac' | 'atm', size: number): { folha: FolhaExplosao; escala: number } | null {
  const tam = tipo === 'implosao' ? 'G' : size <= FAIXAS.P.ate ? 'P' : size <= FAIXAS.M.ate ? 'M' : 'G';
  const f = FOLHAS_EXPLOSAO[\`\${tipo}-\${zona}-\${tam}\`] ?? FOLHAS_EXPLOSAO[\`\${tipo}-vac-\${tam}\`] ?? FOLHAS_EXPLOSAO[\`perigo-vac-\${tam}\`];
  if (!f) return null;
  return { folha: f, escala: Math.min(1, size / FAIXAS[tam].nativo) };
}
`;
fs.writeFileSync(MANIFESTO, ts);
const total = fs.readdirSync(DIR).reduce((s, a) => s + fs.statSync(path.join(DIR, a)).size, 0);
console.log(MANIFESTO, `${entradas.length} folhas, ${(total / 1048576).toFixed(1)} MB`);
