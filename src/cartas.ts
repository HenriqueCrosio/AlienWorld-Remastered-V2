import type Phaser from 'phaser';
import { WEAPONS, type WeaponDef } from './systems/WeaponSystem';

/**
 * AS CARTAS — o PROTÓTIPO do sistema de cartas (branch `feat/cartas-preview`, 2026-09-27).
 *
 * Fonte: `sistema_de_cartas_skills_shoot_em_up_v2.md` (o documento do Henrique), recortado para a 1ª leva de 13
 * cartas. As regras que vieram de lá e que este arquivo guarda:
 * - uma ideia por carta, efeito que se VÊ, poucos números;
 * - 3 cartas na mesa, escolhe 1;
 * - cartas com LIMITE de acúmulo (`max`) e com REQUISITO (`requer`);
 * - quem mexe na MESMA propriedade não soma: o Triplo SUBSTITUI o Duplo (§14 do documento).
 *
 * Duas adaptações ao jogo:
 * - **a Defesa vive dentro das 3 vidas** (decisão de 27/09): não há barra de escudo. O CASCO absorve 1 golpe e
 *   recarrega; a Blindagem virou VIDA EXTRA.
 * - **a Fase 1 é voo por impulso**: carta de movimento não aparece nela (`semF1`).
 *
 * O estado mora no `registry` do jogo — ele atravessa as cutscenes sem precisar de payload. A Fase N guarda um
 * CHECKPOINT das cartas na entrada: morrer e repetir a fase devolve as cartas de ENTRADA, não as ganhas nela.
 */

export type Raridade = 'comum' | 'incomum' | 'rara' | 'epica';
export type Categoria = 'arma' | 'efeito' | 'defesa' | 'movimento';

export interface CartaDef {
  id: string;
  nome: string;
  /** UMA linha curta — cabe em ~16 caracteres por linha, duas linhas no máximo. */
  texto: string;
  /** O efeito em UMA linha só, em caixa alta (a carta compacta; referência: Deep Rock Galactic: Survivor). */
  curto: string;
  categoria: Categoria;
  raridade: Raridade;
  /** Quantas vezes pode ser escolhida. */
  max: number;
  /** Só aparece com esta carta já na mão. */
  requer?: string;
  /** Some da mesa quando esta outra já foi escolhida (o Duplo depois do Triplo). */
  excluiSe?: string;
  /** Não aparece na Fase 1 (voo por impulso). */
  semF1?: boolean;
  /** Textura do ícone, se a arte já existir. */
  icone?: string;
}

export const CARTAS: Record<string, CartaDef> = {
  // ─── 🔫 ARMAMENTO ───
  WPN_001: { id: 'WPN_001', nome: 'TIRO DUPLO', texto: 'dispara 2\nprojéteis', curto: '2 PROJÉTEIS', categoria: 'arma', raridade: 'comum', max: 1, excluiSe: 'WPN_002' },
  WPN_002: { id: 'WPN_002', nome: 'TIRO TRIPLO', texto: 'dispara 3\nem leque', curto: '3 EM LEQUE', categoria: 'arma', raridade: 'incomum', max: 1 },
  WPN_004: { id: 'WPN_004', nome: 'CADÊNCIA', texto: '+15% de\ncadência', curto: '+15% CADÊNCIA', categoria: 'arma', raridade: 'comum', max: 3 },
  WPN_007: { id: 'WPN_007', nome: 'PERFURANTE', texto: 'atravessa\ninimigos', curto: 'ATRAVESSA INIMIGOS', categoria: 'arma', raridade: 'incomum', max: 1 },
  WPN_008: { id: 'WPN_008', nome: 'TIRO PESADO', texto: 'dano x2,\nmais lento', curto: 'DANO x2', categoria: 'arma', raridade: 'rara', max: 1 },
  // ─── 💥 EFEITO ───
  EFF_001: { id: 'EFF_001', nome: 'EXPLOSIVO', texto: 'explode ao\nacertar', curto: 'EXPLODE AO ACERTAR', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_004: { id: 'EFF_004', nome: 'INCENDIÁRIO', texto: 'chance de\nincendiar', curto: 'PODE INCENDIAR', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_006: { id: 'EFF_006', nome: 'COMBUSTÃO', texto: 'queimado\nexplode', curto: 'QUEIMADO EXPLODE', categoria: 'efeito', raridade: 'epica', max: 1, requer: 'EFF_004' },
  // ─── 🛡️ DEFESA (dentro das 3 vidas) ───
  DEF_001: { id: 'DEF_001', nome: 'CASCO', texto: 'absorve 1\ngolpe', curto: 'ABSORVE 1 GOLPE', categoria: 'defesa', raridade: 'comum', max: 1 },
  DEF_002: { id: 'DEF_002', nome: 'RECARGA', texto: 'o casco\nvolta rápido', curto: 'CASCO VOLTA RÁPIDO', categoria: 'defesa', raridade: 'incomum', max: 2, requer: 'DEF_001' },
  DEF_003: { id: 'DEF_003', nome: 'VIDA EXTRA', texto: '+1 vida', curto: '+1 VIDA', categoria: 'defesa', raridade: 'rara', max: 1 },
  DEF_004: { id: 'DEF_004', nome: 'CASCO REATIVO', texto: 'casco partido\nexplode', curto: 'CASCO EXPLODE', categoria: 'defesa', raridade: 'rara', max: 1, requer: 'DEF_001' },
  // ─── ⚡ MOVIMENTO ───
  MOV_001: { id: 'MOV_001', nome: 'PROPULSORES', texto: '+12% de\nvelocidade', curto: '+12% VELOCIDADE', categoria: 'movimento', raridade: 'comum', max: 2, semF1: true },
};

/** A cor da raridade — é a ENERGIA da carta (dark sci-fi: a luz só onde há energia). */
export const COR_RARIDADE: Record<Raridade, number> = {
  comum: 0x8a93a6,
  incomum: 0x3ee0f0,
  rara: 0xb07cff,
  epica: 0xff8c1a,
};

export const NOME_RARIDADE: Record<Raridade, string> = {
  comum: 'COMUM',
  incomum: 'INCOMUM',
  rara: 'RARA',
  epica: 'ÉPICA',
};

const ORDEM: Raridade[] = ['comum', 'incomum', 'rara', 'epica'];

// ─── O ESTADO DA JOGADA (registry) ───────────────────────────────────────────────────────────────

const CHAVE = 'cartas';
const CHAVE_CHECKPOINT = 'cartasCheckpoint';

/** As cartas na mão, com repetição (Cadência 2× aparece duas vezes). */
export function mao(reg: Phaser.Data.DataManager): string[] {
  return (reg.get(CHAVE) as string[] | undefined) ?? [];
}

export function quantas(reg: Phaser.Data.DataManager, id: string): number {
  return mao(reg).filter((c) => c === id).length;
}

export function tem(reg: Phaser.Data.DataManager, id: string): boolean {
  return quantas(reg, id) > 0;
}

export function adicionar(reg: Phaser.Data.DataManager, id: string): void {
  reg.set(CHAVE, [...mao(reg), id]);
}

/**
 * Chamado na ENTRADA de cada fase. A Fase 1 zera tudo (jogada nova, ou o retry da F1). Nas outras: a 1ª entrada
 * grava o checkpoint; um retry (a fase já tem checkpoint) devolve a mão de ENTRADA — sem isto, morrer depois de uma
 * escolha no meio da fase daria a carta de novo na repetição, e o jogador farmaria cartas morrendo.
 */
export function entrarNaFase(reg: Phaser.Data.DataManager, fase: number): void {
  const cps = (reg.get(CHAVE_CHECKPOINT) as Record<number, string[]> | undefined) ?? {};
  if (fase <= 1) {
    reg.set(CHAVE, []);
    reg.set(CHAVE_CHECKPOINT, { 1: [] });
    return;
  }
  if (cps[fase]) {
    reg.set(CHAVE, [...cps[fase]]);
  } else {
    reg.set(CHAVE_CHECKPOINT, { ...cps, [fase]: [...mao(reg)] });
  }
}

// ─── O SORTEIO ───────────────────────────────────────────────────────────────────────────────────

export interface Mesa {
  /** A fase em que a escolha acontece (a F1 corta movimento). */
  fase: number;
  /** Piso de raridade GARANTIDO em pelo menos uma das 3 (recompensa de chefão, §15 do documento). */
  garante?: Raridade;
  /** Peso por raridade. Ausente = a curva padrão. */
  pesos?: Partial<Record<Raridade, number>>;
}

const PESOS_PADRAO: Record<Raridade, number> = { comum: 50, incomum: 32, rara: 14, epica: 4 };

function elegivel(reg: Phaser.Data.DataManager, c: CartaDef, fase: number): boolean {
  if (quantas(reg, c.id) >= c.max) return false;
  if (c.requer && !tem(reg, c.requer)) return false;
  if (c.excluiSe && tem(reg, c.excluiSe)) return false;
  if (c.semF1 && fase <= 1) return false;
  return true;
}

/** Sorteia 3 cartas distintas. Pode devolver menos se o baralho secar. */
export function sortear(reg: Phaser.Data.DataManager, mesa: Mesa): string[] {
  const pesos = { ...PESOS_PADRAO, ...mesa.pesos };
  const pool = Object.values(CARTAS).filter((c) => elegivel(reg, c, mesa.fase));
  const escolhidas: CartaDef[] = [];

  const tirar = (candidatas: CartaDef[]): void => {
    const total = candidatas.reduce((s, c) => s + pesos[c.raridade], 0);
    let r = Math.random() * total;
    for (const c of candidatas) {
      r -= pesos[c.raridade];
      if (r <= 0) {
        escolhidas.push(c);
        return;
      }
    }
    if (candidatas.length) escolhidas.push(candidatas[candidatas.length - 1]);
  };

  // O GARANTIDO primeiro: uma carta do piso para cima, se existir alguma.
  if (mesa.garante) {
    const piso = ORDEM.indexOf(mesa.garante);
    const altas = pool.filter((c) => ORDEM.indexOf(c.raridade) >= piso);
    if (altas.length) tirar(altas);
  }
  while (escolhidas.length < 3) {
    const resto = pool.filter((c) => !escolhidas.includes(c));
    if (!resto.length) break;
    tirar(resto);
  }
  return embaralhar(escolhidas).map((c) => c.id);
}

function embaralhar<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// ─── A ARMA DA NAVE, COM AS CARTAS ───────────────────────────────────────────────────────────────

/** O id sob o qual a arma montada é registrada em `WEAPONS` (o `setBase` só conhece ids). */
export const ARMA_MONTADA = 'naveMontada';

/**
 * Monta a arma da nave: a BASE da linhagem + as cartas de ARMAMENTO. As de efeito/defesa/movimento não mexem na
 * `WeaponDef` — elas moram na cena (`GameScene`), onde estão o acerto, o dano e o controle.
 */
export function montarArma(reg: Phaser.Data.DataManager, baseId: string): string {
  const base = WEAPONS[baseId];
  if (!base) return baseId;
  const def: WeaponDef = { ...base, id: ARMA_MONTADA };

  if (tem(reg, 'WPN_002')) {
    // Triplo: um leque curto, a partir de três bocas próximas.
    def.muzzles = [
      { dy: -3, angle: -5 },
      { dy: 0, angle: 0 },
      { dy: 3, angle: 5 },
    ];
    def.pellets = 3;
  } else if (tem(reg, 'WPN_001')) {
    def.muzzles = [
      { dy: -2, angle: 0 },
      { dy: 2, angle: 0 },
    ];
    def.pellets = 2;
  }
  const cadencia = quantas(reg, 'WPN_004');
  if (cadencia) def.rate = base.rate * Math.pow(1.15, cadencia);
  if (tem(reg, 'WPN_007')) def.pierce = true;
  if (tem(reg, 'WPN_008')) {
    def.damage = base.damage * 2;
    def.speed = base.speed * 0.7;
    def.bulletScale = base.bulletScale * 1.3;
  }

  WEAPONS[ARMA_MONTADA] = def;
  return ARMA_MONTADA;
}

/**
 * A MESA DA CONQUISTA — a recompensa do chefão, aberta na cutscene que vem depois dele (§15 do documento). Ela
 * ocupa o lugar do painel de nave: a cutscene espera a escolha e segue com `depois`.
 */
export function mesaDaCutscene(
  scene: Phaser.Scene,
  titulo: string,
  mesa: Mesa,
  depois: () => void,
  onSair?: () => void,
): void {
  const opcoes = sortear(scene.registry, mesa);
  if (!opcoes.length) {
    depois();
    return;
  }
  scene.scene.launch('Cartas', {
    opcoes,
    titulo,
    onEscolha: (id: string) => {
      adicionar(scene.registry, id);
      depois();
    },
    onSair,
  });
}

/**
 * O RESET DA ALIEN — a escolha entre o CERTO e o INCERTO (decisão do Henrique, 27/09).
 *
 * Na Doca, quem fica na humana leva a carta normal da conquista (o certo). Quem troca para a alien DEVOLVE a mão
 * inteira e refaz tudo em mesas ALEATÓRIAS, uma atrás da outra: as N que tinha + a da conquista + 1 EXTRA (a alien
 * "já vem no tier 1") — o incerto. É o conserto para quem errou a build ou não viu a carta que queria.
 */
export function resetDaAlien(scene: Phaser.Scene, depois: () => void, onSair?: () => void): void {
  const total = mao(scene.registry).length + 2;
  scene.registry.set(CHAVE, []);
  const proxima = (i: number): void => {
    if (i > total) {
      depois();
      return;
    }
    mesaDaCutscene(
      scene,
      `RECONFIGURAÇÃO ALIEN · ${i}/${total}`,
      // A última é a da conquista da Capitânia: ela mantém o piso Raro.
      { fase: 3, garante: i === total ? 'rara' : undefined },
      () => proxima(i + 1),
      onSair,
    );
  };
  proxima(1);
}
