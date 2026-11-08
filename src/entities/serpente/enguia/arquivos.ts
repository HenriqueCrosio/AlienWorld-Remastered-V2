/**
 * THE EEL'S APPROVED ART in `public/sprites/enguia/` (copied from the sheets by `scripts/_serpente/_enguia-assets.mjs`,
 * md5-checked), as Phaser keys → paths. The game reads their pixels and runs the mock's own code on them
 * (`arte.ts`, `gestos.ts`): nothing is baked, so what shows is what he approved. Pure: Node reads it too.
 */
export const GESTOS_N = { eco: 12, canos: 17, prepara: 9, nadar: 12, dor: 4, agonia: 9 } as const;
export type PastaGesto = keyof typeof GESTOS_N;
export const PASTAS_GESTO = Object.keys(GESTOS_N) as PastaGesto[];
export const chaveGesto = (p: PastaGesto, k: number): string => `enguiaG_${p}_${k}`;
export const chaveNormaisGesto = (p: PastaGesto): string => `enguiaGN_${p}`;

/** the single pieces: Phaser key → file name in `sprites/enguia/` */
export const PECAS = {
  enguiaF1: 'enguia-f1.png',
  enguiaCabeca: 'cabeca-e3-pescoco.png',
  enguiaFaixaNA: 'faixa-a-normal.png',
  enguiaFaixaNB: 'faixa-b-normal.png',
  enguiaCabecaN: 'cabeca-normal.png',
  enguiaDorso: 'dorso-corpo.png',
  enguiaDorsoCabeca: 'dorso-cabeca.png',
} as const;

/** every key → its path under `sprites/enguia/` (the Node reader and the Boot loader both walk it) */
export const ARQUIVOS_ENGUIA: Record<string, string> = (() => {
  const a: Record<string, string> = {};
  for (const [k, f] of Object.entries(PECAS)) a[k] = f;
  for (const p of PASTAS_GESTO) {
    for (let k = 0; k < GESTOS_N[p]; k++) a[chaveGesto(p, k)] = `gestos/${p}/q${String(k).padStart(2, '0')}.png`;
    a[chaveNormaisGesto(p)] = `gestos/${p}/normais.png`;
  }
  return a;
})();

/** the same, as the Boot's image list wants it (key → `sprites/enguia/…`) */
export const ARQUIVOS: Record<string, string> = Object.fromEntries(Object.entries(ARQUIVOS_ENGUIA).map(([k, v]) => [k, `sprites/enguia/${v}`]));
