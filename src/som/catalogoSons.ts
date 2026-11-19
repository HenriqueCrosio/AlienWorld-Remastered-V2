import type { Distancia } from './distancia.ts';
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
  /** How far away it happens (`distancia.ts`: level, highs, tail and stereo width move together). Default: right here. */
  distancia?: Distancia;
  laco?: boolean;
  /** Hz: a low-pass of its own (the engines: *"mais baixos e mais abafados"*, 15/11). */
  passaBaixa?: number;
  /** Hz: a low-pass only in the VACUUM (the cabin place) — the TERMINUS rotary gun *"no espaço menos abafado, mas ainda
   *  com o abafo"* (16/11). */
  passaBaixaNoVacuo?: number;
  /** × on a BOSS sound in the vacuum (`CHEFE_NO_VACUO`), for one whose energy is mostly above the 2.2 kHz cut (17/11:
   *  measured, the cut took 7–9 dB off them) — the space stays, the level comes back. */
  ganhoNoVacuo?: number;
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
  // THE GUNFIRE SITS LOW (18/11, him: *"um jogador que busca a competitividade vai deixar o tiro o tempo todo acionado, isso
  // até o final pode cansar"*): the shots, the rotary gun and the hits are 6 dB under where they were, so the world is heard
  'nave.xaelo.tiro': daNave('nave/nave.xaelo.tiro', 0.2, 4, 0.04, 0.1),
  // (the engines: sheet 9, his choices 18/11 — the X-AELO's C, the TERMINUS's C, the Manta's D)
  'nave.xaelo.motor': motor('motores/nave.xaelo.motor', 0.51),
  'nave.xaelo.atingida': daNave('nave/nave.xaelo.atingida', 0.8, 2),
  'nave.xaelo.vida': daNave('nave/nave.xaelo.vida', 0.75),
  'nave.xaelo.morte': daNave('nave/nave.xaelo.morte', 1),
  // THE TERMINUS SHOT IS A ROTARY GUN (16/11, his idea, sheet 7): the M2 while the trigger is held (spin-up, loop,
  // spin-down — `WeaponSystem.somRotativo`), and on the RELEASE the A1 arrives (the A-10 buzz, the sound that travelled):
  // the PEAK in the atmosphere, the burst through the hull in space. No `nave.terminus.tiro` any more.
  'nave.terminus.rotativa.arranque': { ...daNave('terminus-rotativa/nave.terminus.rotativa.arranque', 0.25, 1, 0.02, 0.05), passaBaixaNoVacuo: 1800 },
  'nave.terminus.rotativa.laco': { ...daNave('terminus-rotativa/nave.terminus.rotativa.laco', 0.25, 1, 0, 0), laco: true, passaBaixaNoVacuo: 1800 },
  'nave.terminus.rotativa.parada': { ...daNave('terminus-rotativa/nave.terminus.rotativa.parada', 0.25, 1, 0.02, 0.05), passaBaixaNoVacuo: 1800 },
  'nave.terminus.chegada.pico': daNave('terminus-rotativa/nave.terminus.chegada.pico', 0.45, 2, 0.03, 0.08),
  'nave.terminus.chegada.casco': daNave('terminus-rotativa/nave.terminus.chegada.casco', 0.3, 2, 0.03, 0.08),
  'nave.terminus.motor': motor('motores/nave.terminus.motor', 0.43),
  'nave.terminus.atingida': daNave('nave/nave.terminus.atingida', 0.8, 2),
  'nave.terminus.vida': daNave('nave/nave.terminus.vida', 0.75),
  'nave.terminus.morte': daNave('nave/nave.terminus.morte', 1),
  'nave.charybdis.tiro': daNave('nave/nave.charybdis.tiro', 0.2, 4, 0.04, 0.1),
  'nave.charybdis.motor': motor('motores/nave.charybdis.motor', 0.29),
  'nave.charybdis.atingida': daNave('nave/nave.charybdis.atingida', 0.8, 2),
  'nave.charybdis.vida': daNave('nave/nave.charybdis.vida', 0.75),
  'nave.charybdis.morte': daNave('nave/nave.charybdis.morte', 1),
  'nave.missil.lancar': daNave('nave/nave.missil.lancar', 0.55, 3, 0.03, 0.08),
  'nave.missil.travar': daNave('nave/nave.missil.travar', 0.4, 2),
  'nave.drone.tiro': daNave('nave/nave.drone.tiro', 0.13, 3, 0.05, 0.1),
  'nave.bomba.lancar': daNave('nave/nave.bomba.lancar', 0.7, 2),
  'nave.dash': daNave('nave/nave.dash', 0.6, 1, 0.03, 0.08),
  'nave.impulso': daNave('nave/nave.impulso', 0.35, 2, 0.04, 0.1),
  'nave.casco.absorver': daNave('nave/nave.casco.absorver', 0.7),
  'nave.casco.quebrar': daNave('nave/nave.casco.quebrar', 0.55),
  'nave.casco.voltar': daNave('nave/nave.casco.voltar', 0.5),
  'nave.flare.soltar': daNave('nave/nave.flare.soltar', 0.55, 2),
  // the Aurora's last blast in cutscene 1 (16/11, him: *"continua bem estilo de atmosfera, quero um bum oco e abafado"*):
  // the boss's end cut to its low body, hollowed, its open-air tail removed, a sub thump under it
  'momento.aurora.fim': { arquivo: 'momentos/momento.aurora.fim', camada: 'acao', volume: 0.85, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena' },
  'momento.f1.estrondo': { arquivo: 'nave/momento.f1.estrondo', camada: 'acao', volume: 0.9, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena', ponte: true },
  // (18/11, him: the boom stays with the TERMINUS, *"acrescentar aquele flyby da falcon para quem escolhe a X-aelo"*)
  'momento.f1.estrondo.xaelo': { arquivo: 'cutscenes/fim.sobrevoo.xaelo', camada: 'acao', volume: 0.74, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena', ponte: true },
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
  'acerto.metal': doMundo('explosoes/acerto.metal', 0.11, 4, 'inimigo', 0.08, 0.15),
  'acerto.carne': doMundo('explosoes/acerto.carne', 0.13, 4, 'inimigo', 0.08, 0.15),
  'acerto.rocha': doMundo('explosoes/acerto.rocha', 0.11, 4, 'inimigo', 0.08, 0.15),
  // THE ADJUSTMENTS SHEET (15/11): the swarm drone's own death (the A "para testarmos" — new takes coming) and the
  // LASTRO, the rumble under every chain (his metal-grande C stretched; it rides the action bus, through the place).
  // ROUND 3 (15/11), in the directions he chose after two rounds sent back: the drone = MATTER BREAKING (a quiet take,
  // RMS −26 dB, so it sits high), the small metal = a SHORT DRY blast, the shock and the arc = a PHYSICAL electric snap.
  'acerto.drone': doMundo('rodada3/acerto.drone', 0.18, 4, 'inimigo', 0.08, 0.15),
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

/**
 * SHEET 3 — THE COMMON ENEMIES AND THE HAZARDS (his choices, 16/11; `assets/raw/sons/inimigos/_escolhas.txt`). Their
 * deaths are sheet 2 (the material); here the SHOT, the WARNING (the telegraph, as long as the blink) and their own
 * moments. The enemy shot is the most repeated sound of the game: low, many voices, the widest variation — it warns,
 * it does not scare. The two takes he picked that measured bright (the jellyfish's crackle, the sensor waking) get a
 * low-pass of their own. `kamikaze.travar` and `acerto.indestrutivel` went back for a second round.
 */
const FOLHA_3_INIMIGOS: Record<string, DefSom> = {
  // (18/11: at the level of the ship's own gunfire, never over it)
  'inimigo.tiro': doMundo('inimigos/inimigo.tiro', 0.18, 4, 'inimigo', 0.05, 0.1),
  'inimigo.aviso': doMundo('inimigos/inimigo.aviso', 0.3, 3, 'inimigo', 0.03, 0.08),
  'aranha.tiro': doMundo('inimigos/aranha.tiro', 0.45, 2, 'inimigo', 0.04, 0.08),
  'aranha.aviso': doMundo('inimigos/aranha.aviso', 0.5, 1, 'inimigo', 0.02, 0.05),
  'aranha.salto': doMundo('inimigos/aranha.salto', 0.55, 1, 'inimigo', 0.02, 0.05),
  'aranha.pouso': doMundo('inimigos/aranha.pouso', 0.7, 1, 'inimigo', 0.02, 0.05),
  'aguaviva.estalo': { ...doMundo('inimigos/aguaviva.estalo', 0.25, 3, 'inimigo', 0.08, 0.15), passaBaixa: 4500 },
  'cargueiro.largar': doMundo('inimigos/cargueiro.largar', 0.3, 2, 'inimigo', 0.05, 0.1),
  'torre.aviso': doMundo('inimigos/torre.aviso', 0.3, 3, 'inimigo', 0.03, 0.08),
  'torre.tiro': doMundo('inimigos/torre.tiro', 0.4, 3, 'inimigo', 0.05, 0.1),
  'torre.missil': doMundo('inimigos/torre.missil', 0.5, 3, 'inimigo', 0.04, 0.08),
  'sensor.acordar': { ...doMundo('inimigos/sensor.acordar', 0.45, 2, 'inimigo', 0.03, 0.08), passaBaixa: 4500 },
  'sensor.pavio': doMundo('inimigos/sensor.pavio', 0.45, 3, 'inimigo', 0.02, 0.05),
  // under the ship's own "hit" (the rock colliding in the vacuum: only what comes through the hull)
  'perigo.impacto': doMundo('inimigos/perigo.impacto', 0.75, 1, 'jogador', 0.04, 0.08),
  'porta.romper': doMundo('inimigos/porta.romper', 0.6, 1, 'cena', 0.03, 0.08),
  'esfincter.gas': { arquivo: 'inimigos/esfincter.gas', camada: 'acao', volume: 0.6, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena', laco: true },
  'esfincter.acender': doMundo('inimigos/esfincter.acender', 0.85, 1, 'cena', 0, 0),
  'esfincter.respingo': doMundo('inimigos/esfincter.respingo', 0.55, 1, 'cena', 0.03, 0.08),
  // round 3, in his direction: *"algo que dá lock em você, mas mais curto e agudo. Como algo sibilante que te marca"*
  'kamikaze.travar': doMundo('inimigos/kamikaze.travar', 0.35, 2, 'inimigo', 0.03, 0.08),
  // THE RICOCHET IS THE SHIP'S (16/11, his ask): the player's shot on what does not die sounds like THAT ship's
  // projectile bouncing off something harder. `nave.<nave>.ricochete*` — every name with that start is a variation,
  // drawn at random (`GameScene.ricochetear`). The Manta's: round 3's I. The TERMINUS's (5, drawn) and the X-AELO's are
  // HIS — he made them after the generated ones did not please (`assets/raw/sons/dele/`).
  'nave.charybdis.ricochete': daNave('inimigos/nave.charybdis.ricochete', 0.3, 3, 0.06, 0.12),
  'nave.terminus.ricochete1': daNave('dele/nave.terminus.ricochete1', 0.3, 3, 0.04, 0.1),
  'nave.terminus.ricochete2': daNave('dele/nave.terminus.ricochete2', 0.3, 3, 0.04, 0.1),
  'nave.terminus.ricochete3': daNave('dele/nave.terminus.ricochete3', 0.3, 3, 0.04, 0.1),
  'nave.terminus.ricochete4': daNave('dele/nave.terminus.ricochete4', 0.3, 3, 0.04, 0.1),
  'nave.terminus.ricochete5': daNave('dele/nave.terminus.ricochete5', 0.3, 3, 0.04, 0.1),
  'nave.xaelo.ricochete': daNave('dele/nave.xaelo.ricochete', 0.3, 3, 0.05, 0.1),
};

/** A loop of the world that lives under an entity while it is on screen (the drill, the wheel, the swarm). */
const lacoDoMundo = (arquivo: string, volume: number, passaBaixa?: number): DefSom => ({
  arquivo, camada: 'acao', volume, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'inimigo', laco: true, ...(passaBaixa ? { passaBaixa } : {}),
});

/**
 * SHEET 4 — THE ELITES (his choices, 16/11; `assets/raw/sons/elites/_escolhas.txt`). Their deaths are sheet 2. His notes
 * are in the numbers: the drill *"com mais efeito de espaço, mais abafado"*, the alert *"mais baixo, esse efeito está bem
 * alto"*, the fuse *"modulado, e com o efeito abafado do espaço"* (the C2), the shield breaking *"mais abafado e mais
 * baixo"* — a low-pass of their own and a lower level. The ones he chose that measured bright (the swarm, the needles,
 * the lock, the pupa) get a low-pass too. `sentinela.sobrecarga` went back for a second round (sheet 4b).
 */
const FOLHA_4_ELITES: Record<string, DefSom> = {
  'drone.minerar': lacoDoMundo('elites/drone.minerar', 0.87, 1200),
  'drone.alerta': { ...doMundo('elites/drone.alerta', 0.28, 1, 'inimigo', 0.02, 0.05), passaBaixa: 1800 },
  'drone.tiro': doMundo('elites/drone.tiro', 0.3, 4, 'inimigo', 0.05, 0.1),
  'drone.pisca': { ...doMundo('elites/drone.pisca', 0.45, 1, 'inimigo', 0.02, 0.05), passaBaixa: 1600 },
  'sentinela.rolar': lacoDoMundo('elites/sentinela.rolar', 0.35),
  'sentinela.abrir': doMundo('elites/sentinela.abrir', 0.5, 1, 'inimigo', 0.02, 0.05),
  'sentinela.escudo': doMundo('elites/sentinela.escudo', 0.3, 3, 'inimigo', 0.06, 0.12),
  'sentinela.escudoQuebra': { ...doMundo('elites/sentinela.escudoQuebra', 0.42, 1, 'inimigo', 0.02, 0.05), passaBaixa: 1800 },
  'sentinela.balaco': doMundo('elites/sentinela.balaco', 0.45, 2, 'inimigo', 0.04, 0.08),
  'sentinela.minigun': doMundo('elites/sentinela.minigun', 0.3, 4, 'inimigo', 0.05, 0.1),
  'sentinela.fechar': doMundo('elites/sentinela.fechar', 0.5, 1, 'inimigo', 0.02, 0.05),
  // round 2's D, *"mais grave e bem mais abafado"* (the D2, lower) + a low-pass of 900 Hz
  'sentinela.sobrecarga': { ...doMundo('elites/sentinela.sobrecarga', 0.5, 1, 'inimigo', 0.02, 0.05), passaBaixa: 900 },
  'lula.surge': doMundo('elites/lula.surge', 0.5, 1, 'inimigo', 0.03, 0.08),
  'lula.mira': doMundo('elites/lula.mira', 0.4, 1, 'inimigo', 0.02, 0.05),
  'lula.trava': { ...doMundo('elites/lula.trava', 0.45, 1, 'inimigo', 0.02, 0.05), passaBaixa: 5000 },
  'lula.agulhas': { ...doMundo('elites/lula.agulhas', 0.4, 2, 'inimigo', 0.04, 0.08), passaBaixa: 4500 },
  'lula.tinta': doMundo('elites/lula.tinta', 0.55, 2, 'inimigo', 0.03, 0.08),
  'lula.fuga': doMundo('elites/lula.fuga', 0.6, 1, 'inimigo', 0.02, 0.05),
  'larva.perfura': doMundo('elites/larva.perfura', 0.55, 1, 'inimigo', 0.03, 0.08),
  'larva.sai': doMundo('elites/larva.sai', 0.5, 1, 'inimigo', 0.03, 0.08),
  'larva.tranco': doMundo('elites/larva.tranco', 0.5, 1, 'inimigo', 0.03, 0.08),
  'larva.poe': doMundo('elites/larva.poe', 0.5, 1, 'inimigo', 0.03, 0.08),
  'larva.mergulha': doMundo('elites/larva.mergulha', 0.5, 1, 'inimigo', 0.03, 0.08),
  'pupa.eclode': { ...doMundo('elites/pupa.eclode', 0.35, 3, 'inimigo', 0.06, 0.1), passaBaixa: 5000 },
  // ONE loop for the whole swarm, its level following how many flies are alive (`EnemySystem.somDoEnxame`)
  'mosca.zumbido': lacoDoMundo('elites/mosca.zumbido', 0.4, 3000),
  'tubo.incha': doMundo('elites/tubo.incha', 0.5, 2, 'inimigo', 0.02, 0.05),
  'tubo.pulso': doMundo('elites/tubo.pulso', 0.5, 2, 'inimigo', 0.04, 0.08),
  'esporo.grudar': doMundo('elites/esporo.grudar', 0.5, 2, 'jogador', 0.05, 0.1),
};

/**
 * SHEET 5a — THE MACHINE BOSSES (his choices, 16/11; `assets/raw/sons/chefes-maquinas/_escolhas.txt`): the F1 tower
 * (a metronome) and the Capitânia (a ship: salvo and silence). Their pain and death are sheet 2. The tower's engine loop
 * (*"um som mais de thrusters mesmo"*) and the flak's fuse went back for a round 2; the takeoff gets a rocket layer on
 * its B (round 2 too) — until then the B alone.
 */
const doChefe = (arquivo: string, volume: number, vozes = 1, tom = 0.02, vol = 0.05): DefSom => ({
  arquivo, camada: 'acao', volume, vozes, variacao: { tom, vol }, prioridade: 'chefe',
});
const FOLHA_5A_MAQUINAS: Record<string, DefSom> = {
  'chefe.torre.leque': doChefe('chefes-maquinas/chefe.torre.leque', 0.6, 2, 0.03, 0.08),
  'chefe.torre.mirado': doChefe('chefes-maquinas/chefe.torre.mirado', 0.45, 2, 0.04, 0.08),
  'chefe.torre.missilCarga': doChefe('chefes-maquinas/chefe.torre.missilCarga', 0.5),
  'chefe.torre.missil': doChefe('chefes-maquinas/chefe.torre.missil', 0.6),
  // the B + a rocket on top (round 2's BF1, *"adicionar uma geração de efeito de foguete em lançamento"*)
  'chefe.torre.decolagem': doChefe('chefes-maquinas/chefe.torre.decolagem', 0.85, 1, 0, 0),
  // round 2's G (Kenney `thrusterFire_003`), *"um som mais de thrusters mesmo"*; it lives under the fight
  // (17/11: re-levelled as ACTION — it had been installed at the engine's −24 LUFS and sat at −26 under the fight)
  'chefe.torre.motor': lacoDoMundo('chefes-maquinas/chefe.torre.motor', 0.45),
  'chefe.capitania.hangar': doChefe('chefes-maquinas/chefe.capitania.hangar', 0.55),
  'chefe.capitania.bordada': doChefe('chefes-maquinas/chefe.capitania.bordada', 0.55, 3, 0.04, 0.08),
  'chefe.capitania.flak': doChefe('chefes-maquinas/chefe.capitania.flak', 0.5, 2),
  // round 3's G, *"o som precisa ser de um click/estalo"*: two dry clicks (bright: a light low-pass; one per shell)
  // (17/11: 0.45 → 0.9 — a thin click, −25 LUFS even in the open air)
  'chefe.capitania.flakPavio': { ...doChefe('chefes-maquinas/chefe.capitania.flakPavio', 0.9, 3, 0.03, 0.08), passaBaixa: 5000 },
  'chefe.capitania.flakEstouro': doChefe('chefes-maquinas/chefe.capitania.flakEstouro', 0.55, 3, 0.05, 0.1),
  'chefe.capitania.mirado': doChefe('chefes-maquinas/chefe.capitania.mirado', 0.55, 2),
  'chefe.capitania.furia': doChefe('chefes-maquinas/chefe.capitania.furia', 0.85, 1, 0, 0),
};

/**
 * SHEET 5b — THE SERPENTE AND THE EEL (his choices, 16/11; `assets/raw/sons/chefes-serpente/_escolhas.txt`). The F3
 * fight, in the vacuum. The heads' skills reach the sound through the `CorpoSerpente` facade (`som` / `somLaco`, optional:
 * the oracles run them in Node); the eel's through what her worker sends (`emJogo.ts`). The four he chose that measured
 * bright (the lock, the geyser, the undoing, the convergence) get a low-pass. The rain's salvo went back (round 2).
 */
const S5B = (nome: string, volume: number, vozes = 1, tom = 0.02, vol = 0.05, passaBaixa?: number): DefSom => ({
  ...doChefe(`chefes-serpente/${nome}`, volume, vozes, tom, vol), ...(passaBaixa ? { passaBaixa } : {}),
});
const FOLHA_5B_SERPENTE: Record<string, DefSom> = {
  'serpente.chegada.tremor': S5B('serpente.chegada.tremor', 0.7, 1, 0, 0),
  'serpente.chegada.rompe': S5B('serpente.chegada.rompe', 0.95, 1, 0, 0),
  'serpente.gesto': S5B('serpente.gesto', 0.45, 3, 0.05, 0.1),
  'serpente.tiro': S5B('serpente.tiro', 0.5, 4, 0.05, 0.1),
  'serpente.dor': S5B('serpente.dor', 0.7),
  'serpente.cabecaMorre': S5B('serpente.cabecaMorre', 0.85, 1, 0, 0),
  // round 2's D, *"pense numa salva de mísseis descendo"* — ONE per head (*"cada cabeça lança uma salva"*), so 3 voices
  'serpente.chuva.salva': S5B('serpente.chuva.salva', 0.5, 3, 0.05, 0.1),
  // (17/11, round 4 on sheet 5c — him: *"o apito dos mísseis caindo parece fogos de artifício, quero o som de um míssil
  // no espaço"*; measured: the old one was a tone sliding 4.7 octaves up to 4.5 kHz; the E burns under 410 Hz)
  'serpente.chuva.onda': { ...doChefe('chefes-nucleo/serpente.chuva.onda', 0.5, 3, 0.04, 0.08) },
  // (17/11: 0.25 → 0.6 — it measured −30 LUFS even in the open air: inaudible)
  'serpente.chuva.impacto': S5B('serpente.chuva.impacto', 0.6, 4, 0.08, 0.15),
  'serpente.raio.leitura': S5B('serpente.raio.leitura', 0.35),
  'serpente.raio.trava': S5B('serpente.raio.trava', 0.45, 1, 0.02, 0.05, 5000),
  'serpente.raio.carga': S5B('serpente.raio.carga', 0.55),
  'serpente.raio.disparo': S5B('serpente.raio.disparo', 0.7, 2, 0.03, 0.05),
  'serpente.raio.recupera': S5B('serpente.raio.recupera', 0.5),
  // (17/11: the loops re-levelled as ACTION — installed at the engine's level they sat 9–14 dB under the fight; the
  // volumes come down so a held loop stays under the hits: the breath ~−17, the rumble under the hull ~−17 LUFS)
  'serpente.gas.sopro': { ...S5B('serpente.gas.sopro', 0.4, 1, 0, 0), laco: true },
  'serpente.gas.carga': S5B('serpente.gas.carga', 0.55),
  'serpente.gas.faisca': S5B('serpente.gas.faisca', 0.6, 3, 0.05, 0.1),
  'serpente.gas.retorno': S5B('serpente.gas.retorno', 0.85, 1, 0, 0),
  'serpente.fusao.afunda': S5B('serpente.fusao.afunda', 0.75, 1, 0, 0),
  'serpente.fusao.converge': S5B('serpente.fusao.converge', 0.7, 1, 0, 0, 5000),
  'enguia.sobCasco': { ...S5B('enguia.sobCasco', 0.3, 1, 0, 0), laco: true },
  // her body scraping the hull (*"uma estrutura enorme raspando em outra estrutura"*): A and B, *"variação é bom"* — one
  // of the two drawn at each scrape (`EnguiaEmJogo.soar`)
  'enguia.raspa': { ...S5B('enguia.raspa', 0.6, 1, 0, 0), laco: true },
  'enguia.raspa2': { ...S5B('enguia.raspa2', 0.6, 1, 0, 0), laco: true },
  'enguia.geiser': S5B('enguia.geiser', 0.55, 3, 0.05, 0.1, 5000),
  'enguia.canos.carga': S5B('enguia.canos.carga', 0.55),
  'enguia.canos.jato': S5B('enguia.canos.jato', 0.6, 3, 0.04, 0.08),
  'enguia.eco.leitura': S5B('enguia.eco.leitura', 0.45),
  'enguia.eco.estouro': S5B('enguia.eco.estouro', 0.5, 3, 0.05, 0.1),
  'enguia.anel': S5B('enguia.anel', 0.75, 2),
  'enguia.presa': S5B('enguia.presa', 0.8, 1, 0, 0),
  'enguia.desfaz': S5B('enguia.desfaz', 0.75, 1, 0, 0, 5000),
  'enguia.afunda': S5B('enguia.afunda', 0.75, 1, 0, 0),
};

/**
 * SHEET 5c — THE F4 CORE (his choices, 17/11; `assets/raw/sons/chefes-nucleo/_escolhas.txt`): the Guardião (the
 * globules, the telegraph with its lock, the lunge, the SAW — its warning, launch, spin loop, bite, jolts — and the shell
 * bursting) and the Predador (the landings, the ceiling grip, the warning, the chest charge, the slash — A when it HITS
 * the ship, B when it misses —, the lava, the rip with its molten metal, the dark and its heartbeat — two takes drawn in
 * turn —, the death). Inside the creature: the `interior` place, no vacuum containment. The roar and the gallop went
 * back for a round 2. The Serpente rain's wave was redone here too (*"míssil no espaço"*: no whistle).
 */
const S5C = (nome: string, volume: number, vozes = 1, tom = 0.02, vol = 0.05): DefSom => doChefe(`chefes-nucleo/${nome}`, volume, vozes, tom, vol);
const FOLHA_5C_NUCLEO: Record<string, DefSom> = {
  'guardiao.leque': S5C('guardiao.leque', 0.55, 2, 0.04, 0.08),
  // (the volumes measured in the game, `_medir-chefes.mjs`, 17/11: the interior's room swells the low ones — the
  // warnings sit ~−10 LUFS, a repeated one ~−11/−12, against the X-AELO shot at −15 and a big blast at −10)
  'guardiao.telegrafo': S5C('guardiao.telegrafo', 0.42),
  'guardiao.trava': S5C('guardiao.trava', 0.75),
  'guardiao.investida': S5C('guardiao.investida', 0.7),
  'guardiao.serra.aviso': S5C('guardiao.serra.aviso', 0.75),
  'guardiao.serra.lanca': S5C('guardiao.serra.lanca', 0.6),
  'guardiao.serra.giro': { ...S5C('guardiao.serra.giro', 0.4, 1, 0, 0), laco: true },
  'guardiao.serra.crava': S5C('guardiao.serra.crava', 0.7, 2, 0.03, 0.06),
  'guardiao.serra.tranco': S5C('guardiao.serra.tranco', 0.55, 2, 0.05, 0.1),
  'guardiao.casca': S5C('guardiao.casca', 0.9, 1, 0, 0),
  'predador.pouso': S5C('predador.pouso', 0.45, 2, 0.04, 0.08),
  'predador.agarra': S5C('predador.agarra', 0.65),
  'predador.aviso': S5C('predador.aviso', 0.5),
  'predador.carga': S5C('predador.carga', 0.42),
  'predador.golpe.acerta': S5C('predador.golpe.acerta', 0.75),
  'predador.golpe.erra': S5C('predador.golpe.erra', 0.65),
  'predador.lava.carga': S5C('predador.lava.carga', 0.4),
  'predador.lava.arremesso': S5C('predador.lava.arremesso', 0.55, 2, 0.03, 0.06),
  'predador.lava.impacto': S5C('predador.lava.impacto', 0.5, 4, 0.06, 0.12),
  // (his B is almost all above 5 kHz and the interior cuts at 4.5: at 0.5 it measured −26 LUFS)
  'predador.lava.estilhaco': S5C('predador.lava.estilhaco', 1, 2, 0.05, 0.1),
  'predador.rasgo': S5C('predador.rasgo', 0.75),
  'predador.metal': S5C('predador.metal', 0.6),
  'predador.breu': S5C('predador.breu', 0.9, 1, 0, 0),
  // (a beat every 2.4 s in the dark: felt, not on top — the A measured 3 dB over the B, so it sits lower)
  'predador.pulso': S5C('predador.pulso', 0.27, 1, 0.02, 0.05),
  'predador.pulso2': S5C('predador.pulso2', 0.35, 1, 0.02, 0.05),
  'predador.morte': S5C('predador.morte', 0.9, 1, 0, 0),
  // ROUND 2 (17/11, him: *"F para o urro, e E e D em outros momentos. Podem até entrar antes mesmo do encontro, para
  // mostrar que o jogador se aproxima de algo infernal"*): the F is his arrival; the E when he turns to phase 2, the D
  // when he leaves the screen; and the same D and E FAR AWAY on the way to the core (`StageDirector`, the `urro` event:
  // the background plane — the interior's 1.8 kHz and half the level — and louder each time, as the core comes near)
  'predador.urro': S5C('predador.urro', 0.85, 1, 0, 0),
  'predador.urro2': S5C('predador.urro2', 0.75, 1, 0.02, 0.05),
  'predador.urro3': S5C('predador.urro3', 0.75, 1, 0.02, 0.05),
  'predador.urroLonge': { ...S5C('predador.urroLonge', 0.8, 1, 0.03, 0.05), plano: 'fundo' },
  'predador.urroLonge2': { ...S5C('predador.urroLonge2', 0.8, 1, 0.03, 0.05), plano: 'fundo' },
  'predador.galope': { ...S5C('predador.galope', 0.5, 1, 0, 0), laco: true },
};

/**
 * SHEET 6 — THE INTERFACE (his choices, 17/11; `assets/raw/sons/interface/_escolhas.txt`): the screen, not the world —
 * the `interface` layer skips the place's acoustics (the same in the F1 and in space). Kenney (A), PixelLab (B) and the
 * RETRO touches synthesized here (C, `_sintetizar-folha6.mjs`). The navigation is shared by every list (the menu, the
 * pause, the settings, the Archive, the hangar); the pause's own sounds come from its state machine (`somDaPausa`).
 * The star climbs a step per star of the stage (`estrela.pegar1/2/3`). His "não": no alert on the banners.
 */
const DA_TELA = (nome: string, volume: number, vozes = 1, tom = 0, vol = 0): DefSom => ({
  arquivo: `interface/${nome}`, camada: 'interface', volume, vozes, variacao: { tom, vol }, prioridade: 'interface',
});
const FOLHA_6_INTERFACE: Record<string, DefSom> = {
  'ui.mover': DA_TELA('ui.mover', 0.45, 2, 0.02, 0.05),
  'ui.confirmar': DA_TELA('ui.confirmar', 0.55),
  'ui.voltar': DA_TELA('ui.voltar', 0.5),
  // (the volumes measured at the output, 17/11 — `_medir-chefes.mjs --interface`; the soundtrack sits ≈ −20 LUFS:
  // the confirm ~−16, the pause and the refusal under it, the stars over the music, the big stings ~−12)
  'ui.ajustar': DA_TELA('ui.ajustar', 0.55, 2, 0.02, 0.05),
  'ui.aba': DA_TELA('ui.aba', 0.45, 1, 0.02, 0.05),
  'ui.negar': DA_TELA('ui.negar', 0.32),
  'ui.pausa.abrir': DA_TELA('ui.pausa.abrir', 0.25),
  'ui.pausa.fechar': DA_TELA('ui.pausa.fechar', 0.3),
  'ui.captura': DA_TELA('ui.captura', 0.5),
  'ui.troca': DA_TELA('ui.troca', 0.5),
  'ui.comecar': DA_TELA('ui.comecar', 0.6),
  'cartas.mesa': DA_TELA('cartas.mesa', 0.55),
  'cartas.escolher': DA_TELA('cartas.escolher', 0.55),
  'cartas.raridade.comum': DA_TELA('cartas.raridade.comum', 0.45),
  'cartas.raridade.incomum': DA_TELA('cartas.raridade.incomum', 0.5),
  'cartas.raridade.rara': DA_TELA('cartas.raridade.rara', 0.55),
  'cartas.raridade.epica': DA_TELA('cartas.raridade.epica', 0.6),
  'estrela.pegar1': DA_TELA('estrela.pegar1', 0.7),
  'estrela.pegar2': DA_TELA('estrela.pegar2', 0.7),
  'estrela.pegar3': DA_TELA('estrela.pegar3', 0.7),
  'estrela.completa': DA_TELA('estrela.completa', 0.55),
  'vida.extra': DA_TELA('vida.extra', 0.55),
  'ui.navePerdida': DA_TELA('ui.navePerdida', 0.6),
  'resultado.fase': DA_TELA('resultado.fase', 0.6),
  'resultado.conta': { ...DA_TELA('resultado.conta', 0.35), laco: true },
  'resultado.medalha': DA_TELA('resultado.medalha', 0.6),
  'resultado.recorde': DA_TELA('resultado.recorde', 0.55),
};

/**
 * SHEET 7 — THE CUTSCENES (his choices, 17/11; `assets/raw/sons/cutscenes/_escolhas.txt`): the mechanical and story
 * beats (the explosions were sheet 2's). PER SHIP (him: *"D2 para X-aelo e D3 para terminus"*): the way out of the
 * atmosphere, the landing (descent, touch), the departure and the final flyover are `<nome>.<nave>` —
 * `naveDoSom` picks it (`somDaCutscene`); HIS flybys are the X-AELO's and the TERMINUS's. IN SEQUENCE (*"A e B na
 * sequência ficaram bons"*): `<nome>` then `<nome>2`. The final cutscene, mute until today, sounds chapter by chapter.
 */
const DA_CENA = (nome: string, volume: number, vozes = 1, tom = 0, vol = 0): DefSom => ({
  arquivo: `cutscenes/${nome}`, camada: 'acao', volume, vozes, variacao: { tom, vol }, prioridade: 'cena',
});
// (the volumes measured in their places, 17/11 — `_medir-chefes.mjs --cena`: the beats ~-10/-13 LUFS, the big moments
// -7/-9, the wound "almost nothing" ~-15, the ships' versions matched to each other)
const FOLHA_7_CUTSCENES: Record<string, DefSom> = {
  'momento.f1.saida.xaelo': DA_CENA('momento.f1.saida.xaelo', 0.8),
  'momento.f1.saida.terminus': DA_CENA('momento.f1.saida.terminus', 0.8),
  'cut.piloto': DA_CENA('cut.piloto', 0.36),
  'cut.pouso.descida.xaelo': DA_CENA('cut.pouso.descida.xaelo', 0.41),
  'cut.pouso.descida.terminus': DA_CENA('cut.pouso.descida.terminus', 0.68),
  'cut.pouso.toque.xaelo': DA_CENA('cut.pouso.toque.xaelo', 0.52),
  'cut.pouso.toque.terminus': DA_CENA('cut.pouso.toque.terminus', 0.65),
  'cut.decolagem.xaelo': DA_CENA('cut.decolagem.xaelo', 0.6),
  'cut.decolagem.terminus': DA_CENA('cut.decolagem.terminus', 0.5),
  'cut.aurora.capitania': DA_CENA('cut.aurora.capitania', 0.38),
  'cut.doca.alarme': DA_CENA('cut.doca.alarme', 0.66),
  'cut.doca.cabos': DA_CENA('cut.doca.cabos', 0.87),
  'cut.doca.afunda': DA_CENA('cut.doca.afunda', 0.52),
  'cut.doca.afunda2': DA_CENA('cut.doca.afunda2', 0.47),
  'cut.leviata.alerta': DA_CENA('cut.leviata.alerta', 0.42),
  'cut.leviata.derrapagem': DA_CENA('cut.leviata.derrapagem', 0.7),
  'cut.leviata.colapso': DA_CENA('cut.leviata.colapso', 0.5),
  'cut.leviata.colapso2': DA_CENA('cut.leviata.colapso2', 0.55),
  'cut.leviata.engolida': DA_CENA('cut.leviata.engolida', 0.49),
  'cut.leviata.selar': DA_CENA('cut.leviata.selar', 0.55, 3, 0.05, 0.1),
  'fim.rasgo': DA_CENA('fim.rasgo', 0.85),
  'fim.descompressao': DA_CENA('fim.descompressao', 0.8),
  'fim.ferida': DA_CENA('fim.ferida', 0.2),
  'fim.ferida2': DA_CENA('fim.ferida2', 0.21),
  'fim.queda': DA_CENA('fim.queda', 0.8),
  'fim.sobrevoo.xaelo': DA_CENA('fim.sobrevoo.xaelo', 0.75),
  'fim.sobrevoo.terminus': DA_CENA('fim.sobrevoo.terminus', 0.75),
  'fim.apaga': DA_CENA('fim.apaga', 0.27),
  'fim.apaga2': DA_CENA('fim.apaga2', 0.9),
  // ROUND 2 (17/11): the MANTA's own (*"falta a Manta"*) — its way out of the F1 is kept for later (him: *"ela só
  // aparece na doca da Fase 2. Mas deixe guardado"*: today it never plays) — and the fall redone (*"engine falhando"*)
  // (measured, matched to the X-AELO's and the TERMINUS's)
  'momento.f1.saida.charybdis': DA_CENA('momento.f1.saida.charybdis', 0.69),
  'fim.sobrevoo.charybdis': DA_CENA('fim.sobrevoo.charybdis', 0.65),
  'cut.pouso.descida.charybdis': DA_CENA('cut.pouso.descida.charybdis', 0.44),
  'cut.pouso.toque.charybdis': DA_CENA('cut.pouso.toque.charybdis', 0.44),
  'cut.decolagem.charybdis': DA_CENA('cut.decolagem.charybdis', 0.48),
  'cut.leviata.queda': DA_CENA('cut.leviata.queda', 0.6),
};

/**
 * SHEET 8 — THE AMBIENCE AND THE SOUNDS OF EACH STAGE (his choices, 18/11; `assets/raw/sons/ambiente/_escolhas-folha1.txt`
 * and `-folha2.txt`; spec §10.10). The beds ride the `ambiente` layer (low under the music, up without it). The effects
 * ride the action layer and take their place in the world from `distancia`: him, *"o laser e batidas do cinturao ficam
 * muito distantes, algumas outras coisas mais perto, as naves da F1 descendo na colonia ficam distantes"*.
 */
const FUNDO = (nome: string, volume: number): DefSom => ({
  arquivo: `ambiente/${nome}`, camada: 'ambiente', volume, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena', laco: true,
});
const NO_MUNDO = (nome: string, volume: number, distancia?: Distancia, vozes = 2, tom = 0.04, vol = 0.12): DefSom => ({
  arquivo: `ambiente/${nome}`, camada: 'acao', volume, vozes, variacao: { tom, vol }, prioridade: 'inimigo', ...(distancia ? { distancia } : {}),
});
/** A moment of the stage: nothing pushes it out, it does not vary. */
const MOMENTO = (nome: string, volume: number, distancia?: Distancia): DefSom => ({
  ...NO_MUNDO(nome, volume, distancia, 1, 0, 0), prioridade: 'cena',
});
const FOLHA_8_AMBIENTE: Record<string, DefSom> = {
  // (the volumes are MEASURED at the end of the chain against THE SCALE of the game, WITHOUT the music — him: *"a ambientação
  // precisa funcionar perfeitamente antes mesmo da música entrar"*: `scripts/_som/_calibrar-escala.mjs`. Re-measure after
  // changing a take or a distance.)
  'amb.menu.noite': FUNDO('amb.menu.noite', 0.39),
  'amb.amanhecer': FUNDO('amb.amanhecer', 0.3),
  'amb.hangar': FUNDO('amb.hangar', 0.3),
  // HIS files (18/11, complements of what was already here): the rain heard from inside the hangar, over its room tone, and
  // the tension under the two space stages
  'amb.hangar.chuva': FUNDO('amb.hangar.chuva', 0.92),
  'amb.espaco.tensao': FUNDO('amb.espaco.tensao', 0.34),
  'amb.f1.fora': FUNDO('amb.f1.fora', 0.39),
  'amb.f1.caverna': FUNDO('amb.f1.caverna', 0.32),
  'amb.f2': FUNDO('amb.f2', 0.31),
  'amb.f3.nebulosa': FUNDO('amb.f3.nebulosa', 0.4),
  'amb.f3.casco': FUNDO('amb.f3.casco', 0.31),
  'amb.f4.interior': FUNDO('amb.f4.interior', 0.35),
  'amb.f4.interior2': FUNDO('amb.f4.interior2', 0.31),
  'amb.f4.agua': FUNDO('amb.f4.agua', 0.27),
  // the storm: the bolt is close, the flash alone rolls far behind the clouds
  'fx.menu.trovao.perto': MOMENTO('fx.menu.trovao.perto', 0.27, 'medio'),
  'fx.menu.trovao.perto2': MOMENTO('fx.menu.trovao.perto2', 0.58, 'medio'),
  'fx.menu.trovao.longe': MOMENTO('fx.menu.trovao.longe', 0.79, 'muitoLonge'),
  'fx.menu.trovao.longe2': MOMENTO('fx.menu.trovao.longe2', 0.95, 'muitoLonge'),
  'fx.menu.trovao.longe3': MOMENTO('fx.menu.trovao.longe3', 1, 'muitoLonge'),
  'fx.menu.trovao.longe4': MOMENTO('fx.menu.trovao.longe4', 1, 'muitoLonge'),
  'fx.menu.trovao.longe5': MOMENTO('fx.menu.trovao.longe5', 0.84, 'muitoLonge'),
  // his rolling thunder again, this time heard through the hangar's walls (18/11)
  'fx.hangar.trovao': { ...MOMENTO('fx.menu.trovao.longe5', 0.51, 'longe'), passaBaixa: 1200 },
  // F1: the invasion is on the horizon; the spider is in the same cave as the ship
  'fx.f1.flyby': NO_MUNDO('fx.f1.flyby', 0.31, 'longe'),
  'fx.f1.flyby2': NO_MUNDO('fx.f1.flyby2', 0.63, 'longe'),
  'fx.f1.flyby3': NO_MUNDO('fx.f1.flyby3', 0.61, 'longe'),
  'fx.f1.artilharia': NO_MUNDO('fx.f1.artilharia', 0.86, 'muitoLonge'),
  'fx.f1.flak': NO_MUNDO('fx.f1.flak', 0.74, 'muitoLonge'),
  'fx.f1.flak2': NO_MUNDO('fx.f1.flak2', 0.5, 'muitoLonge'),
  'fx.f1.explosao': NO_MUNDO('fx.f1.explosao', 0.43, 'muitoLonge'),
  'fx.f1.explosao2': NO_MUNDO('fx.f1.explosao2', 0.37, 'muitoLonge'),
  'fx.f1.aranha': NO_MUNDO('fx.f1.aranha', 0.38, undefined, 1),
  // F2: the rigs are very far, the dead metal far, the cabin and the rocks right here
  'fx.f2.laser': NO_MUNDO('fx.f2.laser', 0.61, 'muitoLonge', 1),
  'fx.f2.martelo': NO_MUNDO('fx.f2.martelo', 0.75, 'muitoLonge', 1),
  'fx.f2.metal': NO_MUNDO('fx.f2.metal', 0.2, 'longe', 1),
  'fx.f2.rangido': NO_MUNDO('fx.f2.rangido', 0.7, undefined, 1),
  'fx.f2.rangido2': NO_MUNDO('fx.f2.rangido2', 0.29, undefined, 1),
  'fx.f2.cascalho': NO_MUNDO('fx.f2.cascalho', 0.56),
  'fx.f2.passa': NO_MUNDO('fx.f2.passa', 0.2, undefined, 2),
  // F3: the eel and the battle are far off; the Leviathan's tail is enormous and near; the hull is under the ship
  'fx.f3.enguia': NO_MUNDO('fx.f3.enguia', 0.33, 'longe', 1),
  'fx.f3.rabo': MOMENTO('fx.f3.rabo', 0.44, 'medio'),
  'fx.f3.vapor': NO_MUNDO('fx.f3.vapor', 0.56, 'medio'),
  'fx.f3.faiscas': { ...NO_MUNDO('fx.f3.faiscas', 0.72, 'medio'), passaBaixa: 3500 },
  'fx.f3.faiscas2': { ...NO_MUNDO('fx.f3.faiscas2', 0.66, 'medio'), passaBaixa: 3500 },
  'fx.f3.baque': NO_MUNDO('fx.f3.baque', 0.39, 'muitoLonge'),
  // F4: the creature is all around the ship; the others of the dolphin's kind are far behind the duel
  'fx.f4.coracao': NO_MUNDO('fx.f4.coracao', 0.18, 'medio', 1, 0.01, 0.05),
  'fx.f4.fornalha': NO_MUNDO('fx.f4.fornalha', 0.23, 'medio', 1),
  'fx.f4.agua.sobe': MOMENTO('fx.f4.agua.sobe', 0.34),
  'fx.f4.agua.desce': MOMENTO('fx.f4.agua.desce', 0.44),
  'fx.f4.golfinho': NO_MUNDO('fx.f4.golfinho', 0.33, 'longe', 1),
};

/**
 * THE BOSSES' LEVEL IN THE VACUUM (17/11, him: *"melhore e deixe perceptível os sons, mas eles não podem perder o efeito
 * do espaço"*). Measured one by one (`node scripts/_som/_medir-chefes.mjs --comparar --sugerir`): the containment
 * (`CHEFE_NO_VACUO`, the same 2.2 kHz cut and closed room) takes a different amount off each sound — the bright ones
 * lost 7–9 dB, the low-mid ones came out LOUDER than in the air. This × puts each one ~1.5 dB under the same sound in
 * the open air (contained, never louder). The few that peak past 0 dB (the break-out, a boss's end, the ring) lean on
 * the SAFETY LIMITER (`LIMITADOR`, at most ~6 dB shaved off a peak). Re-measure after changing a take or the containment.
 */
const NO_VACUO: Record<string, number> = {
  'explosao.chefeFim': 1.1,
  'chefe.capitania.bordada': 1.1, 'chefe.capitania.flak': 1.15, 'chefe.capitania.flakPavio': 1.35,
  'chefe.capitania.flakEstouro': 1.3, 'chefe.capitania.mirado': 1.3, 'chefe.capitania.furia': 0.9,
  'serpente.chegada.tremor': 1.1, 'serpente.chegada.rompe': 1.05, 'serpente.tiro': 1.15, 'serpente.cabecaMorre': 1.2,
  'serpente.chuva.salva': 1.2, 'serpente.chuva.onda': 0.8, 'serpente.raio.leitura': 1.1, 'serpente.raio.trava': 1.7,
  'serpente.raio.carga': 1.25, 'serpente.raio.disparo': 1.1, 'serpente.gas.sopro': 1.6, 'serpente.gas.carga': 1.4,
  'serpente.gas.faisca': 1.15, 'serpente.gas.retorno': 0.9,
  'enguia.raspa2': 1.2, 'enguia.canos.carga': 1.1, 'enguia.anel': 1.15, 'enguia.canos.jato': 0.9, 'enguia.eco.leitura': 1.1,
  'enguia.eco.estouro': 1.35, 'enguia.presa': 0.65, 'enguia.desfaz': 1.8,
};
const comVacuo = (sons: Record<string, DefSom>): Record<string, DefSom> =>
  Object.fromEntries(Object.entries(sons).map(([n, d]) => [n, NO_VACUO[n] ? { ...d, ganhoNoVacuo: NO_VACUO[n] } : d]));

/**
 * A sound too long to live decoded in memory: the player STREAMS it from its file (`Som.fluxo`) instead of loading it at the
 * boot. His six-minute storm of the night menu (18/11), which comes near and goes away: decoded it would take ~130 MB.
 */
export interface DefFluxo {
  arquivo: string;
  camada: Camada;
  volume: number;
}
export const FLUXOS: Record<string, DefFluxo> = {
  'amb.menu.tempestade': { arquivo: 'ambiente/amb.menu.tempestade', camada: 'ambiente', volume: 0.7 },
};

export const SONS: Record<string, DefSom> = comVacuo({ ...FOLHA_8_AMBIENTE, ...FOLHA_1_NAVE, ...FOLHA_2_EXPLOSOES, ...FOLHA_3_INIMIGOS, ...FOLHA_4_ELITES, ...FOLHA_5A_MAQUINAS, ...FOLHA_5B_SERPENTE, ...FOLHA_5C_NUCLEO, ...FOLHA_6_INTERFACE, ...FOLHA_7_CUTSCENES });

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
