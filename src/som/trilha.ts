/**
 * THE SOUNDTRACK'S PLACE IN THE MIX (18/11, him: *"a trilha nao pode sobrepor completamente os outros sons, precisa ser um
 * casamento perfeito entre todos os sons do jogo"*). Pure: `systems/Music.ts` plays, this decides. Four techniques games use:
 *
 *  1. SNAPSHOTS: one level per situation (`CONTEXTOS`), under the world while playing.
 *  2. AN EQ POCKET: the track gives up the sub (explosions, engines) and the presence band (shots, hits, far events).
 *  3. A SIDECHAIN: the loud moments of the world push the track down by themselves, and it comes back slowly.
 *  4. CLEARED SPACE: the far events of the scenery ask the track for a few dB while they sound.
 */
/**
 * 19/11 `final`: his melancholic close (him: *"uma trilha mais melancolica para fechar o game"*): it comes in at the wound
 * of the final cutscene, carries it to the result and the credits, and is the DAWN menu's track from then on (the night
 * menu keeps `menu`). The track a menu plays is the menu's: `trilhaDoMenu`.
 */
export type Track = 'menu' | 'f1' | 'f2' | 'f3' | 'f4' | 'final';
export type ContextoTrilha = 'menu' | 'fase' | 'cena';

/** The level every track is brought to before the snapshot (LUFS). */
export const LUFS_DE_REFERENCIA = -14;

/**
 * `lufs`: the file's integrated loudness (measured). `cauda`: seconds before its end where the next lap crosses in, covering
 * the track's own closing fade, so the loop has no gap.
 */
export const FAIXAS: Record<Track, { arquivo: string; lufs: number; cauda: number }> = {
  menu: { arquivo: 'menu', lufs: -13.7, cauda: 3 },
  f1: { arquivo: 'f1', lufs: -14, cauda: 3.5 },
  f2: { arquivo: 'f2', lufs: -14, cauda: 6 },
  f3: { arquivo: 'f3', lufs: -14.3, cauda: 5 },
  f4: { arquivo: 'f4', lufs: -13.7, cauda: 4 },
  // (4:33; it closes on its own fade from ~4:28)
  final: { arquivo: 'final', lufs: -13.8, cauda: 4.5 },
};

/** The track of each menu: the night's orchestra, or the closing theme over the fallen Leviathan. */
export const trilhaDoMenu = (qual: 'noite' | 'amanhecer'): Track => (qual === 'amanhecer' ? 'final' : 'menu');

/**
 * Each situation: the track's loudness (LUFS) and how deep the pocket is (dB in the sub, dB in the presence band).
 * 19/11, THE MIX PASS (spec §10.11; him: *"a musica precisa ter um destaque tambem [...] a trilha é um layer, os efeitos
 * outros"*, and *"a musica pode manter de frente o jogo todo"*): the track sits LEVEL WITH THE ACTION — in a stage about the
 * held gunfire (−22) — not under it (it was −27, 7–13 dB under the guns once the pocket and the duck took their share).
 * The pocket is shallow: it only clears where the blasts and the shots fight it. Measured with `_medir-mistura.mjs`: the
 * track 7–10 dB over each stage's bed and 1–5 dB under the whole play (gunfire + enemies + blasts), where the transients
 * must stand out.
 */
export const CONTEXTOS: Record<ContextoTrilha, { lufs: number; graves: number; presenca: number }> = {
  menu: { lufs: -18, graves: 0, presenca: 0 },
  fase: { lufs: -19, graves: -3, presenca: -2 },
  cena: { lufs: -19, graves: -2, presenca: -1 },
};

export const BOLSO = { gravesHz: 140, presencaHz: 2800, presencaQ: 0.9 } as const;

const db = (d: number): number => 10 ** (d / 20);

/** The gain that brings a track to the reference level. */
export const ganhoDaFaixa = (t: Track): number => db(LUFS_DE_REFERENCIA - FAIXAS[t].lufs);
/** The gain of a snapshot, from the reference level. */
export const ganhoDoContexto = (c: ContextoTrilha): number => db(CONTEXTOS[c].lufs - LUFS_DE_REFERENCIA);

/** 19/11: only what is BIG pushes the track (a common blast and up), never deep, and it comes back in ~1.6 s. */
export const DUCK = {
  /** dBFS (short RMS of the world): under this the track is left alone. Held gunfire stays far under it: it never pumps. */
  limiar: -15,
  /** dB the track goes down per dB of the world over the threshold */
  inclinacao: 0.5,
  /** dB: the deepest it goes */
  maximo: -4,
  /** dB: what a far event of the scenery asks for */
  cenario: -2,
  /** dB per second going down and coming back */
  ataque: 40,
  soltura: 2.5,
} as const;

/** The far events worth clearing space for. What repeats all the time (guns on the horizon, heartbeat) does not ask. */
// (19/11: 'fx.f1.explosao' left — the invasion's far blasts come every few seconds, they kept the track 2 dB down all F1)
const ABREM_ESPACO = ['fx.menu.trovao', 'fx.hangar.trovao', 'fx.f1.flyby', 'fx.f2.laser', 'fx.f2.martelo', 'fx.f2.metal', 'fx.f2.rangido', 'fx.f3.enguia', 'fx.f3.rabo', 'fx.f3.vapor', 'fx.f4.golfinho', 'fx.f4.agua', 'drone.minerar', 'momento.'];
export const abreEspaco = (nome: string): boolean => ABREM_ESPACO.some((p) => nome.startsWith(p));

/** How many dB (≤ 0) the track should be down, for the world's level now and whether a far event is sounding. */
export function reducaoDaTrilha(rmsDb: number, cenario: boolean): number {
  const nivel = Math.max(DUCK.maximo, Math.min(0, -(rmsDb - DUCK.limiar) * DUCK.inclinacao));
  return Math.min(nivel, cenario ? DUCK.cenario : 0);
}

/** One step of the duck: quick to get out of the way, slow to come back (the return must not be noticed). */
export function proximoDuck(atual: number, alvo: number, dt: number): number {
  if (alvo < atual) return Math.max(alvo, atual - DUCK.ataque * dt);
  return Math.min(alvo, atual + DUCK.soltura * dt);
}

/** The equal-power crossfade: `u` (0–1) of the way, the gain of the track coming in (the one leaving is `curvaEntra(1 − u)`). */
export const curvaEntra = (u: number): number => Math.sin((Math.min(1, Math.max(0, u)) * Math.PI) / 2);
