import type { Camada } from './mixagem.ts';
import type { Prioridade } from './vozes.ts';

/**
 * THE SOUND CATALOGUE (block SOUND, 15/11 — spec `specs/2026-11-15-bloco-som-design.md` §3.2) — data, no Phaser (the
 * mould of `catalogoCartas`). The scenes call the NAME, never the file. A sound only enters here after HE chose it on
 * its sheet; each one has its files in `public/sfx/<arquivo>.ogg` + `.m4a` and its line in `docs/SONS.md`.
 */
export interface DefSom {
  /** Path under `public/sfx/`, without the extension. */
  arquivo: string;
  camada: Camada;
  /** The mix level of the sound itself, 0–1. */
  volume: number;
  /** How many copies of it may sound at once. */
  vozes: number;
  /** Per-shot variation: pitch ± `tom`, volume ± `vol` (fractions). */
  variacao: { tom: number; vol: number };
  prioridade: Prioridade;
  /** `fundo` = lives in the back layers (in space: only the dull thump). Default `perto`. */
  plano?: 'perto' | 'fundo';
  laco?: boolean;
  /** Hz: a low-pass of its own (the engines: *"mais baixos e mais abafados"*, 15/11). */
  passaBaixa?: number;
  /** Hz: a low-pass only in the VACUUM (the cabin place) — the TERMINUS rotary gun *"no espaço menos abafado, mas ainda
   *  com o abafo"* (16/11). */
  passaBaixaNoVacuo?: number;
  /** Energy it pours into the LASTRO each time it plays (× its `forca`): the explosions. */
  lastro?: number;
  /**
   * It CROSSES a scene change (`Som.trocarDeCena` leaves it). THE ONE EXCEPTION to "no sound crosses a scene change",
   * by his ask (16/11): the sonic boom starts on the hangar's black veil and *"quando chegar na fase, já estar acabando"*.
   */
  ponte?: boolean;
}

export const NOME_SOM = /^[a-z][a-z0-9]*(\.[a-z][a-zA-Z0-9]*){1,3}$/;

/** A one-shot of the player's ship (the action layer, the player's priority). */
const daNave = (arquivo: string, volume: number, vozes = 1, tom = 0.02, vol = 0.05): DefSom => ({
  arquivo, camada: 'acao', volume, vozes, variacao: { tom, vol }, prioridade: 'jogador',
});
/**
 * The engine loop: the auto-presence layer (low under the music, full without it). 15/11, him: *"os motores podem ficar
 * mais baixos e mais abafados, de todas as naves. É um som que precisa estar ali, mas não brigar com nada (mesmo com
 * trilha sonora ou sem)"* — half the level and a low-pass that leaves only the body.
 */
const MOTOR_PASSA_BAIXA = 1100;
const motor = (arquivo: string, volume: number): DefSom => ({
  arquivo, camada: 'motor', volume, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'jogador', laco: true, passaBaixa: MOTOR_PASSA_BAIXA,
});

/**
 * SHEET 1 — THE SHIP (his choices, 15/11; `assets/raw/sons/nave/_escolhas.txt`). The volumes are the starting mix —
 * tuned by him PLAYING. The shot repeats 4.5×/s: low and with variation; the death and the boom are the loudest.
 */
const FOLHA_1_NAVE: Record<string, DefSom> = {
  'nave.xaelo.tiro': daNave('nave/nave.xaelo.tiro', 0.4, 4, 0.04, 0.1),
  'nave.xaelo.motor': motor('nave/nave.xaelo.motor', 0.17),
  'nave.xaelo.atingida': daNave('nave/nave.xaelo.atingida', 0.8, 2),
  'nave.xaelo.vida': daNave('nave/nave.xaelo.vida', 0.75),
  'nave.xaelo.morte': daNave('nave/nave.xaelo.morte', 1),
  // THE TERMINUS SHOT IS A ROTARY GUN (16/11, his idea, sheet 7): the M2 while the trigger is held (spin-up, loop,
  // spin-down — `WeaponSystem.somRotativo`), and on the RELEASE the A1 arrives (the A-10 buzz, the sound that travelled):
  // the PEAK in the atmosphere, the burst through the hull in space. No `nave.terminus.tiro` any more.
  'nave.terminus.rotativa.arranque': { ...daNave('terminus-rotativa/nave.terminus.rotativa.arranque', 0.5, 1, 0.02, 0.05), passaBaixaNoVacuo: 1800 },
  'nave.terminus.rotativa.laco': { ...daNave('terminus-rotativa/nave.terminus.rotativa.laco', 0.5, 1, 0, 0), laco: true, passaBaixaNoVacuo: 1800 },
  'nave.terminus.rotativa.parada': { ...daNave('terminus-rotativa/nave.terminus.rotativa.parada', 0.5, 1, 0.02, 0.05), passaBaixaNoVacuo: 1800 },
  'nave.terminus.chegada.pico': daNave('terminus-rotativa/nave.terminus.chegada.pico', 0.45, 2, 0.03, 0.08),
  'nave.terminus.chegada.casco': daNave('terminus-rotativa/nave.terminus.chegada.casco', 0.3, 2, 0.03, 0.08),
  'nave.terminus.motor': motor('nave/nave.terminus.motor', 0.17),
  'nave.terminus.atingida': daNave('nave/nave.terminus.atingida', 0.8, 2),
  'nave.terminus.vida': daNave('nave/nave.terminus.vida', 0.75),
  'nave.terminus.morte': daNave('nave/nave.terminus.morte', 1),
  'nave.charybdis.tiro': daNave('nave/nave.charybdis.tiro', 0.4, 4, 0.04, 0.1),
  'nave.charybdis.motor': motor('nave/nave.charybdis.motor', 0.17),
  'nave.charybdis.atingida': daNave('nave/nave.charybdis.atingida', 0.8, 2),
  'nave.charybdis.vida': daNave('nave/nave.charybdis.vida', 0.75),
  'nave.charybdis.morte': daNave('nave/nave.charybdis.morte', 1),
  'nave.missil.lancar': daNave('nave/nave.missil.lancar', 0.55, 3, 0.03, 0.08),
  'nave.missil.travar': daNave('nave/nave.missil.travar', 0.4, 2),
  'nave.drone.tiro': daNave('nave/nave.drone.tiro', 0.25, 3, 0.05, 0.1),
  'nave.bomba.lancar': daNave('nave/nave.bomba.lancar', 0.7, 2),
  'nave.dash': daNave('nave/nave.dash', 0.6, 1, 0.03, 0.08),
  'nave.impulso': daNave('nave/nave.impulso', 0.35, 2, 0.04, 0.1),
  'nave.casco.absorver': daNave('nave/nave.casco.absorver', 0.7),
  'nave.casco.quebrar': daNave('nave/nave.casco.quebrar', 0.55),
  'nave.casco.voltar': daNave('nave/nave.casco.voltar', 0.5),
  'nave.flare.soltar': daNave('nave/nave.flare.soltar', 0.55, 2),
  'momento.f1.estrondo': { arquivo: 'nave/momento.f1.estrondo', camada: 'acao', volume: 0.9, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena', ponte: true },
};

/** A one-shot of the world (explosions, effects, hits): `prioridade` says who may push it out under the voice cap. */
const doMundo = (arquivo: string, volume: number, vozes: number, prioridade: DefSom['prioridade'], tom = 0.06, vol = 0.12): DefSom => ({
  arquivo, camada: 'acao', volume, vozes, variacao: { tom, vol }, prioridade,
});

/**
 * SHEET 2 — THE EXPLOSIONS (his choices, 15/11; `assets/raw/sons/explosoes/_escolhas.txt`). The material of whoever dies
 * picks the sound (`somDaExplosao.ts`). The small metal one, the shock and the arc went back for a second round (sheet
 * 2b) and enter when he chooses. The hits play on EVERY shot that lands: low, many voices, the widest variation.
 */
const FOLHA_2_EXPLOSOES: Record<string, DefSom> = {
  'explosao.perigo': doMundo('explosoes/explosao.perigo', 0.75, 4, 'inimigo'),
  'explosao.metalGrande': doMundo('explosoes/explosao.metalGrande', 0.85, 3, 'inimigo', 0.04, 0.08),
  'explosao.chefeFim': doMundo('explosoes/explosao.chefeFim', 1, 1, 'chefe', 0, 0),
  'explosao.luz': doMundo('explosoes/explosao.luz', 0.6, 4, 'inimigo'),
  'explosao.biomec': doMundo('explosoes/explosao.biomec', 0.8, 3, 'inimigo', 0.04, 0.08),
  'explosao.carne': doMundo('explosoes/explosao.carne', 0.65, 4, 'inimigo'),
  'explosao.rocha': doMundo('explosoes/explosao.rocha', 0.6, 4, 'inimigo'),
  'explosao.carta': doMundo('explosoes/explosao.carta', 0.6, 4, 'jogador', 0.05, 0.1),
  'explosao.implosao': doMundo('explosoes/explosao.implosao', 1, 1, 'cena', 0, 0),
  'efeito.incendiar': doMundo('explosoes/efeito.incendiar', 0.4, 3, 'jogador', 0.05, 0.1),
  'efeito.combustao': doMundo('explosoes/efeito.combustao', 0.55, 3, 'jogador', 0.05, 0.1),
  'efeito.sobrecarga': doMundo('explosoes/efeito.sobrecarga', 0.6, 2, 'jogador', 0.04, 0.08),
  'acerto.metal': doMundo('explosoes/acerto.metal', 0.22, 4, 'inimigo', 0.08, 0.15),
  'acerto.carne': doMundo('explosoes/acerto.carne', 0.25, 4, 'inimigo', 0.08, 0.15),
  'acerto.rocha': doMundo('explosoes/acerto.rocha', 0.22, 4, 'inimigo', 0.08, 0.15),
  // THE ADJUSTMENTS SHEET (15/11): the swarm drone's own death (the A "para testarmos" — new takes coming) and the
  // LASTRO, the rumble under every chain (his metal-grande C stretched; it rides the action bus, through the place).
  // ROUND 3 (15/11), in the directions he chose after two rounds sent back: the drone = MATTER BREAKING (a quiet take,
  // RMS −26 dB, so it sits high), the small metal = a SHORT DRY blast, the shock and the arc = a PHYSICAL electric snap.
  'acerto.drone': doMundo('rodada3/acerto.drone', 0.35, 4, 'inimigo', 0.08, 0.15),
  'explosao.drone': doMundo('rodada3/explosao.drone', 0.9, 4, 'inimigo', 0.06, 0.12),
  'explosao.metal': doMundo('rodada3/explosao.metal', 0.65, 4, 'inimigo', 0.06, 0.12),
  'efeito.choque': doMundo('rodada3/efeito.choque', 0.45, 3, 'jogador', 0.06, 0.12),
  'efeito.arco': doMundo('rodada3/efeito.arco', 0.45, 3, 'jogador', 0.06, 0.12),
  'explosao.lastro': { arquivo: 'ajustes/explosao.lastro', camada: 'acao', volume: 0.5, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena', laco: true },
};

/**
 * How much each blast pours into the LASTRO (the shared rumble, `mixagem.ts`): the big ones fill it, the small ones
 * keep it going in a chain, the light and the hits do not count.
 */
const LASTRO_DA_EXPLOSAO: Record<string, number> = {
  'explosao.perigo': 0.5,
  'explosao.metal': 0.35,
  'explosao.drone': 0.2,
  'explosao.metalGrande': 0.8,
  'explosao.chefeFim': 1.6,
  'explosao.biomec': 0.6,
  'explosao.carne': 0.3,
  'explosao.rocha': 0.3,
  'explosao.carta': 0.3,
  'explosao.implosao': 1.6,
  'efeito.combustao': 0.3,
};
for (const [nome, e] of Object.entries(LASTRO_DA_EXPLOSAO)) if (FOLHA_2_EXPLOSOES[nome]) FOLHA_2_EXPLOSOES[nome] = { ...FOLHA_2_EXPLOSOES[nome], lastro: e };

export const SONS: Record<string, DefSom> = { ...FOLHA_1_NAVE, ...FOLHA_2_EXPLOSOES };

/** Every problem of a catalogue, as text (empty = valid). `existe` receives a path under `public/sfx/`. */
export function validarCatalogo(sons: Record<string, DefSom>, existe: (caminho: string) => boolean, creditos: string): string[] {
  const erros: string[] = [];
  for (const [nome, d] of Object.entries(sons)) {
    if (!NOME_SOM.test(nome)) erros.push(`${nome}: the name is not grupo.dono.acao`);
    for (const ext of ['ogg', 'm4a']) if (!existe(`${d.arquivo}.${ext}`)) erros.push(`${nome}: missing public/sfx/${d.arquivo}.${ext}`);
    if (!creditos.includes(`\`${nome}\``)) erros.push(`${nome}: no line in docs/SONS.md`);
    if (!(d.volume > 0 && d.volume <= 1)) erros.push(`${nome}: volume ${d.volume} outside (0, 1]`);
    if (!(Number.isInteger(d.vozes) && d.vozes >= 1)) erros.push(`${nome}: voices ${d.vozes}`);
    if (d.variacao.tom < 0 || d.variacao.tom > 0.1) erros.push(`${nome}: pitch variation ${d.variacao.tom} outside [0, 0.1]`);
    if (d.variacao.vol < 0 || d.variacao.vol > 0.3) erros.push(`${nome}: volume variation ${d.variacao.vol} outside [0, 0.3]`);
    if (d.camada === 'interface' && d.plano === 'fundo') erros.push(`${nome}: the interface has no background`);
    if (d.passaBaixa !== undefined && !(d.passaBaixa >= 100 && d.passaBaixa <= 20000)) erros.push(`${nome}: low-pass ${d.passaBaixa} outside [100, 20000] Hz`);
    if (d.lastro !== undefined && !(d.lastro > 0 && d.lastro <= 2)) erros.push(`${nome}: lastro ${d.lastro} outside (0, 2]`);
  }
  return erros;
}
