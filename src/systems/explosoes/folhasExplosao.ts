// GERADO por scripts/_i/_explosoes-assar.mjs — não editar à mão (bloco I, etapa 1; spec
// `specs/2026-11-09-bloco-i-explosoes-design.md`). As explosões do jogo, por tipo × zona × tamanho: a folha de COR e a de
// LUZ (tocada em ADD por cima), em grade de `colunas`, a 20 quadros/s.
export interface FolhaExplosao {
  chave: string;
  luz: string;
  arq: string;
  arqLuz: string;
  cel: number;
  quadros: number;
  colunas: number;
}
export const FPS_EXPLOSAO = 20;
/** o maior `size` (as unidades do `Fx.explode`) que cada tamanho cobre, e o size em que ele foi assado (escala 1) */
export const FAIXAS = { P: { ate: 1.25, nativo: 1.25 }, M: { ate: 2, nativo: 2 }, G: { ate: Infinity, nativo: 3.4 } } as const;
export const FOLHAS_EXPLOSAO: Record<string, FolhaExplosao> = {
  'perigo-vac-P': { chave: 'explosao-perigo-vac-P', luz: 'explosao-perigo-vac-P-luz', arq: 'sprites/explosoes/perigo-vac-P.png', arqLuz: 'sprites/explosoes/perigo-vac-P-luz.png', cel: 60, quadros: 16, colunas: 16 },
  'perigo-vac-M': { chave: 'explosao-perigo-vac-M', luz: 'explosao-perigo-vac-M-luz', arq: 'sprites/explosoes/perigo-vac-M.png', arqLuz: 'sprites/explosoes/perigo-vac-M-luz.png', cel: 116, quadros: 24, colunas: 24 },
  'perigo-vac-G': { chave: 'explosao-perigo-vac-G', luz: 'explosao-perigo-vac-G-luz', arq: 'sprites/explosoes/perigo-vac-G.png', arqLuz: 'sprites/explosoes/perigo-vac-G-luz.png', cel: 264, quadros: 35, colunas: 15 },
  'perigo-atm-P': { chave: 'explosao-perigo-atm-P', luz: 'explosao-perigo-atm-P-luz', arq: 'sprites/explosoes/perigo-atm-P.png', arqLuz: 'sprites/explosoes/perigo-atm-P-luz.png', cel: 60, quadros: 16, colunas: 16 },
  'perigo-atm-M': { chave: 'explosao-perigo-atm-M', luz: 'explosao-perigo-atm-M-luz', arq: 'sprites/explosoes/perigo-atm-M.png', arqLuz: 'sprites/explosoes/perigo-atm-M-luz.png', cel: 116, quadros: 24, colunas: 24 },
  'perigo-atm-G': { chave: 'explosao-perigo-atm-G', luz: 'explosao-perigo-atm-G-luz', arq: 'sprites/explosoes/perigo-atm-G.png', arqLuz: 'sprites/explosoes/perigo-atm-G-luz.png', cel: 264, quadros: 35, colunas: 15 },
  'metal-vac-P': { chave: 'explosao-metal-vac-P', luz: 'explosao-metal-vac-P-luz', arq: 'sprites/explosoes/metal-vac-P.png', arqLuz: 'sprites/explosoes/metal-vac-P-luz.png', cel: 60, quadros: 13, colunas: 13 },
  'metal-vac-M': { chave: 'explosao-metal-vac-M', luz: 'explosao-metal-vac-M-luz', arq: 'sprites/explosoes/metal-vac-M.png', arqLuz: 'sprites/explosoes/metal-vac-M-luz.png', cel: 116, quadros: 20, colunas: 20 },
  'metal-vac-G': { chave: 'explosao-metal-vac-G', luz: 'explosao-metal-vac-G-luz', arq: 'sprites/explosoes/metal-vac-G.png', arqLuz: 'sprites/explosoes/metal-vac-G-luz.png', cel: 264, quadros: 29, colunas: 15 },
  'metal-atm-P': { chave: 'explosao-metal-atm-P', luz: 'explosao-metal-atm-P-luz', arq: 'sprites/explosoes/metal-atm-P.png', arqLuz: 'sprites/explosoes/metal-atm-P-luz.png', cel: 60, quadros: 13, colunas: 13 },
  'metal-atm-M': { chave: 'explosao-metal-atm-M', luz: 'explosao-metal-atm-M-luz', arq: 'sprites/explosoes/metal-atm-M.png', arqLuz: 'sprites/explosoes/metal-atm-M-luz.png', cel: 116, quadros: 19, colunas: 19 },
  'metal-atm-G': { chave: 'explosao-metal-atm-G', luz: 'explosao-metal-atm-G-luz', arq: 'sprites/explosoes/metal-atm-G.png', arqLuz: 'sprites/explosoes/metal-atm-G-luz.png', cel: 264, quadros: 30, colunas: 15 },
  'chefeFim-vac-P': { chave: 'explosao-chefeFim-vac-P', luz: 'explosao-chefeFim-vac-P-luz', arq: 'sprites/explosoes/chefeFim-vac-P.png', arqLuz: 'sprites/explosoes/chefeFim-vac-P-luz.png', cel: 60, quadros: 18, colunas: 18 },
  'chefeFim-vac-M': { chave: 'explosao-chefeFim-vac-M', luz: 'explosao-chefeFim-vac-M-luz', arq: 'sprites/explosoes/chefeFim-vac-M.png', arqLuz: 'sprites/explosoes/chefeFim-vac-M-luz.png', cel: 116, quadros: 29, colunas: 29 },
  'chefeFim-vac-G': { chave: 'explosao-chefeFim-vac-G', luz: 'explosao-chefeFim-vac-G-luz', arq: 'sprites/explosoes/chefeFim-vac-G.png', arqLuz: 'sprites/explosoes/chefeFim-vac-G-luz.png', cel: 264, quadros: 43, colunas: 15 },
  'chefeFim-atm-P': { chave: 'explosao-chefeFim-atm-P', luz: 'explosao-chefeFim-atm-P-luz', arq: 'sprites/explosoes/chefeFim-atm-P.png', arqLuz: 'sprites/explosoes/chefeFim-atm-P-luz.png', cel: 60, quadros: 19, colunas: 19 },
  'chefeFim-atm-M': { chave: 'explosao-chefeFim-atm-M', luz: 'explosao-chefeFim-atm-M-luz', arq: 'sprites/explosoes/chefeFim-atm-M.png', arqLuz: 'sprites/explosoes/chefeFim-atm-M-luz.png', cel: 116, quadros: 27, colunas: 27 },
  'chefeFim-atm-G': { chave: 'explosao-chefeFim-atm-G', luz: 'explosao-chefeFim-atm-G-luz', arq: 'sprites/explosoes/chefeFim-atm-G.png', arqLuz: 'sprites/explosoes/chefeFim-atm-G-luz.png', cel: 264, quadros: 43, colunas: 15 },
  'luz-vac-P': { chave: 'explosao-luz-vac-P', luz: 'explosao-luz-vac-P-luz', arq: 'sprites/explosoes/luz-vac-P.png', arqLuz: 'sprites/explosoes/luz-vac-P-luz.png', cel: 60, quadros: 11, colunas: 11 },
  'luz-vac-M': { chave: 'explosao-luz-vac-M', luz: 'explosao-luz-vac-M-luz', arq: 'sprites/explosoes/luz-vac-M.png', arqLuz: 'sprites/explosoes/luz-vac-M-luz.png', cel: 116, quadros: 16, colunas: 16 },
  'luz-vac-G': { chave: 'explosao-luz-vac-G', luz: 'explosao-luz-vac-G-luz', arq: 'sprites/explosoes/luz-vac-G.png', arqLuz: 'sprites/explosoes/luz-vac-G-luz.png', cel: 264, quadros: 24, colunas: 15 },
  'biomec-vac-P': { chave: 'explosao-biomec-vac-P', luz: 'explosao-biomec-vac-P-luz', arq: 'sprites/explosoes/biomec-vac-P.png', arqLuz: 'sprites/explosoes/biomec-vac-P-luz.png', cel: 60, quadros: 19, colunas: 19 },
  'biomec-vac-M': { chave: 'explosao-biomec-vac-M', luz: 'explosao-biomec-vac-M-luz', arq: 'sprites/explosoes/biomec-vac-M.png', arqLuz: 'sprites/explosoes/biomec-vac-M-luz.png', cel: 116, quadros: 28, colunas: 28 },
  'biomec-vac-G': { chave: 'explosao-biomec-vac-G', luz: 'explosao-biomec-vac-G-luz', arq: 'sprites/explosoes/biomec-vac-G.png', arqLuz: 'sprites/explosoes/biomec-vac-G-luz.png', cel: 264, quadros: 42, colunas: 15 },
  'carne-vac-P': { chave: 'explosao-carne-vac-P', luz: 'explosao-carne-vac-P-luz', arq: 'sprites/explosoes/carne-vac-P.png', arqLuz: 'sprites/explosoes/carne-vac-P-luz.png', cel: 60, quadros: 19, colunas: 19 },
  'carne-vac-M': { chave: 'explosao-carne-vac-M', luz: 'explosao-carne-vac-M-luz', arq: 'sprites/explosoes/carne-vac-M.png', arqLuz: 'sprites/explosoes/carne-vac-M-luz.png', cel: 116, quadros: 28, colunas: 28 },
  'carne-vac-G': { chave: 'explosao-carne-vac-G', luz: 'explosao-carne-vac-G-luz', arq: 'sprites/explosoes/carne-vac-G.png', arqLuz: 'sprites/explosoes/carne-vac-G-luz.png', cel: 264, quadros: 43, colunas: 15 },
  'rocha-vac-P': { chave: 'explosao-rocha-vac-P', luz: 'explosao-rocha-vac-P-luz', arq: 'sprites/explosoes/rocha-vac-P.png', arqLuz: 'sprites/explosoes/rocha-vac-P-luz.png', cel: 60, quadros: 13, colunas: 13 },
  'rocha-vac-M': { chave: 'explosao-rocha-vac-M', luz: 'explosao-rocha-vac-M-luz', arq: 'sprites/explosoes/rocha-vac-M.png', arqLuz: 'sprites/explosoes/rocha-vac-M-luz.png', cel: 116, quadros: 19, colunas: 19 },
  'rocha-vac-G': { chave: 'explosao-rocha-vac-G', luz: 'explosao-rocha-vac-G-luz', arq: 'sprites/explosoes/rocha-vac-G.png', arqLuz: 'sprites/explosoes/rocha-vac-G-luz.png', cel: 264, quadros: 29, colunas: 15 },
  'carta-vac-P': { chave: 'explosao-carta-vac-P', luz: 'explosao-carta-vac-P-luz', arq: 'sprites/explosoes/carta-vac-P.png', arqLuz: 'sprites/explosoes/carta-vac-P-luz.png', cel: 60, quadros: 11, colunas: 11 },
  'carta-vac-M': { chave: 'explosao-carta-vac-M', luz: 'explosao-carta-vac-M-luz', arq: 'sprites/explosoes/carta-vac-M.png', arqLuz: 'sprites/explosoes/carta-vac-M-luz.png', cel: 116, quadros: 18, colunas: 18 },
  'carta-vac-G': { chave: 'explosao-carta-vac-G', luz: 'explosao-carta-vac-G-luz', arq: 'sprites/explosoes/carta-vac-G.png', arqLuz: 'sprites/explosoes/carta-vac-G-luz.png', cel: 264, quadros: 26, colunas: 15 },
  'implosao-vac-G': { chave: 'explosao-implosao-vac-G', luz: 'explosao-implosao-vac-G-luz', arq: 'sprites/explosoes/implosao-vac-G.png', arqLuz: 'sprites/explosoes/implosao-vac-G-luz.png', cel: 264, quadros: 31, colunas: 15 },
};
/**
 * A folha e a escala (≤ 1: o jogo só REDUZ) de um estouro. A zona cai no vácuo quando o tipo não tem a da atmosfera;
 * um tipo sem folha cai no `perigo` (o A). `explodeBig(escala e)` equivale a `size = 2 × e`.
 */
export function escolheFolha(tipo: string, zona: 'vac' | 'atm', size: number): { folha: FolhaExplosao; escala: number } | null {
  const tam = tipo === 'implosao' ? 'G' : size <= FAIXAS.P.ate ? 'P' : size <= FAIXAS.M.ate ? 'M' : 'G';
  const f = FOLHAS_EXPLOSAO[`${tipo}-${zona}-${tam}`] ?? FOLHAS_EXPLOSAO[`${tipo}-vac-${tam}`] ?? FOLHAS_EXPLOSAO[`perigo-vac-${tam}`];
  if (!f) return null;
  return { folha: f, escala: Math.min(1, size / FAIXAS[tam].nativo) };
}
