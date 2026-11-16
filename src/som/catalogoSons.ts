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
  // the Aurora's last blast in cutscene 1 (16/11, him: *"continua bem estilo de atmosfera, quero um bum oco e abafado"*):
  // the boss's end cut to its low body, hollowed, its open-air tail removed, a sub thump under it
  'momento.aurora.fim': { arquivo: 'momentos/momento.aurora.fim', camada: 'acao', volume: 0.85, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena' },
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

/**
 * SHEET 3 — THE COMMON ENEMIES AND THE HAZARDS (his choices, 16/11; `assets/raw/sons/inimigos/_escolhas.txt`). Their
 * deaths are sheet 2 (the material); here the SHOT, the WARNING (the telegraph, as long as the blink) and their own
 * moments. The enemy shot is the most repeated sound of the game: low, many voices, the widest variation — it warns,
 * it does not scare. The two takes he picked that measured bright (the jellyfish's crackle, the sensor waking) get a
 * low-pass of their own. `kamikaze.travar` and `acerto.indestrutivel` went back for a second round.
 */
const FOLHA_3_INIMIGOS: Record<string, DefSom> = {
  'inimigo.tiro': doMundo('inimigos/inimigo.tiro', 0.3, 4, 'inimigo', 0.05, 0.1),
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
  'drone.minerar': lacoDoMundo('elites/drone.minerar', 0.35, 1200),
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
  'chefe.torre.motor': lacoDoMundo('chefes-maquinas/chefe.torre.motor', 0.35),
  'chefe.capitania.hangar': doChefe('chefes-maquinas/chefe.capitania.hangar', 0.55),
  'chefe.capitania.bordada': doChefe('chefes-maquinas/chefe.capitania.bordada', 0.55, 3, 0.04, 0.08),
  'chefe.capitania.flak': doChefe('chefes-maquinas/chefe.capitania.flak', 0.5, 2),
  // round 3's G, *"o som precisa ser de um click/estalo"*: two dry clicks (bright: a light low-pass; one per shell)
  'chefe.capitania.flakPavio': { ...doChefe('chefes-maquinas/chefe.capitania.flakPavio', 0.45, 3, 0.03, 0.08), passaBaixa: 5000 },
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
  'serpente.tiro': S5B('serpente.tiro', 0.4, 4, 0.05, 0.1),
  'serpente.dor': S5B('serpente.dor', 0.7),
  'serpente.cabecaMorre': S5B('serpente.cabecaMorre', 0.85, 1, 0, 0),
  // round 2's D, *"pense numa salva de mísseis descendo"* — ONE per head (*"cada cabeça lança uma salva"*), so 3 voices
  'serpente.chuva.salva': S5B('serpente.chuva.salva', 0.5, 3, 0.05, 0.1),
  'serpente.chuva.onda': S5B('serpente.chuva.onda', 0.5, 3, 0.04, 0.08),
  'serpente.chuva.impacto': S5B('serpente.chuva.impacto', 0.25, 4, 0.08, 0.15),
  'serpente.raio.leitura': S5B('serpente.raio.leitura', 0.35),
  'serpente.raio.trava': S5B('serpente.raio.trava', 0.45, 1, 0.02, 0.05, 5000),
  'serpente.raio.carga': S5B('serpente.raio.carga', 0.55),
  'serpente.raio.disparo': S5B('serpente.raio.disparo', 0.7, 2, 0.03, 0.05),
  'serpente.raio.recupera': S5B('serpente.raio.recupera', 0.5),
  'serpente.gas.sopro': { ...S5B('serpente.gas.sopro', 0.5, 1, 0, 0), laco: true },
  'serpente.gas.carga': S5B('serpente.gas.carga', 0.55),
  'serpente.gas.faisca': S5B('serpente.gas.faisca', 0.6, 3, 0.05, 0.1),
  'serpente.gas.retorno': S5B('serpente.gas.retorno', 0.85, 1, 0, 0),
  'serpente.fusao.afunda': S5B('serpente.fusao.afunda', 0.75, 1, 0, 0),
  'serpente.fusao.converge': S5B('serpente.fusao.converge', 0.7, 1, 0, 0, 5000),
  'enguia.sobCasco': { ...S5B('enguia.sobCasco', 0.5, 1, 0, 0), laco: true },
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

export const SONS: Record<string, DefSom> = { ...FOLHA_1_NAVE, ...FOLHA_2_EXPLOSOES, ...FOLHA_3_INIMIGOS, ...FOLHA_4_ELITES, ...FOLHA_5A_MAQUINAS, ...FOLHA_5B_SERPENTE };

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
