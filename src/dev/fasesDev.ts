import { ehNomeMao, type NomeMao } from './maos.ts';

/**
 * THE BOSS PHASES THE DEV KEYS KNOW (spec 2026-11-24-besta-refeita §7), per stage, in fight order. Each boss says
 * which one it is in (`StageBoss.devFaseAtual`) and jumps to the next (`devProximaFase`). The eel starts at full life
 * (her own shortcut, `?serpente=fusao&vida=`, starts it lower). Transitions also have names a boss can report but
 * nobody targets: 'troca' (the Guardian becoming the Beast), 'fusao' (the Serpent's fusion scene, which ends in the eel).
 */
export type Estagio = 1 | 2 | 3 | 4;
export const FASES_DEV: Record<Estagio, readonly string[]> = {
  1: ['torre1', 'torre2'],
  2: ['capitania1', 'capitania2'],
  3: ['serpenteA', 'serpenteB', 'serpenteC', 'enguia'],
  4: ['guardiao1', 'guardiao2', 'guardiao3', 'besta1', 'besta2', 'besta3'],
};

export function estagioDaFase(fase: string): Estagio | null {
  for (const st of [1, 2, 3, 4] as const) if (FASES_DEV[st].includes(fase)) return st;
  return null;
}

export interface AtalhoFase {
  stage: Estagio;
  fase: string;
  /** null = keep the registry's hand */
  mao: NomeMao | null;
}

/** `?fase=besta3&mao=mediana`. No (or an unknown) `fase` = no shortcut; an unknown `mao` = keep the hand. */
export function lerAtalhoFase(qs: URLSearchParams): AtalhoFase | null {
  const fase = qs.get('fase');
  if (fase === null) return null;
  const stage = estagioDaFase(fase);
  if (stage === null) return null;
  const m = qs.get('mao');
  return { stage, fase, mao: ehNomeMao(m) ? m : null };
}
