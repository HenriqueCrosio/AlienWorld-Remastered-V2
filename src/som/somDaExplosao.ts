import type { TipoExplosao } from '../systems/explosoes/tipoExplosao.ts';

/**
 * WHICH SOUND AN EXPLOSION MAKES (block SOUND, sheet 2, 15/11). Pure. The type is the material of whoever dies (block I,
 * `tipoDoMaterial`); the metal splits by SIZE — a drone and a cargo ship cannot sound alike — at the `explode` size 2
 * (the same boundary where `escolheFolha` takes the big sheet's family: mines, capitals, `explodeBig`).
 */
export const METAL_GRANDE_A_PARTIR = 2;

export function somDaExplosao(tipo: TipoExplosao, size: number): string {
  if (tipo === 'metal') return size >= METAL_GRANDE_A_PARTIR ? 'explosao.metalGrande' : 'explosao.metal';
  return `explosao.${tipo}`;
}

/** How loud: a bigger explosion is louder, never past 1 (`size` in the `explode` units, 1 = a common enemy). */
export const forcaDaExplosao = (size: number): number => Math.min(1, 0.65 + 0.2 * Math.max(0, size));

/**
 * THE SWARM'S OWN SOUNDS (15/11, him: *"o barulho fino de metal incomoda [...] não ter conseguido ouvir o barulho da
 * explosão deles [...] podemos colocar uma categoria somente para eles"*): the `drone`, the enemy of the swarms since
 * the F1 (25 waves), has a soft hit and a soft pop of its own instead of the shared metal ones.
 */
export const DO_ENXAME = new Set(['drone']);

/** The death sound an enemy kind plays by itself (its blasts then stay mute), or `null` = the material's explosion. */
export const somDaMorte = (kind: string | undefined): string | null => (kind && DO_ENXAME.has(kind) ? `explosao.${kind}` : null);

/** The hit of the player's shot by the material it lands on (no material = metal: the ships); the swarm has its own. */
export function somDoAcerto(material: string | undefined, kind?: string): string {
  if (kind && DO_ENXAME.has(kind)) return `acerto.${kind}`;
  if (material === 'carne' || material === 'biomec') return 'acerto.carne';
  if (material === 'rocha') return 'acerto.rocha';
  return 'acerto.metal';
}
