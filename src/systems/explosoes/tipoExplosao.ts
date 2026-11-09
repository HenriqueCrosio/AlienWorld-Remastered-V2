import type { Classe, Material } from '../morte/numerosDestrocos';

/**
 * O TIPO DE UMA EXPLOSÃO (09/11, bloco I, etapa 1 — spec `specs/2026-11-09-bloco-i-explosoes-design.md` §4b). Ele gostou
 * dos quatro conceitos: *"vamos usar todos. misturando alguns quando for conveniente"*. Cada tipo é uma mistura deles
 * (`scripts/_i/explosoes/receitas.mjs`): perigo = A · metal = D (+ o fogo do A) · chefeFim = C fechando A + D · luz e
 * carta = B · biomec = B → C · carne = C de matéria · rocha = D em pedra · implosao = a da Aurora.
 */
export type TipoExplosao = 'perigo' | 'metal' | 'chefeFim' | 'luz' | 'biomec' | 'carne' | 'rocha' | 'carta' | 'implosao';

/** A explosão de um corpo pelo material dele (o que o jogo já dá em `numerosDestrocos.ts`); o chefe de metal fecha na
 *  nuvem (`chefeFim`); sem material, o A (`perigo`). */
export function tipoDoMaterial(material: Material | undefined, classe?: Classe): TipoExplosao {
  if (!material) return 'perigo';
  if (material === 'metal') return classe === 'chefe' ? 'chefeFim' : 'metal';
  return material;
}
