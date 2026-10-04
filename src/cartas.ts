import type Phaser from 'phaser';
import { WEAPONS, type WeaponDef } from './systems/WeaponSystem';
import { RARIDADES, type Raridade } from './raridade';
import { CARTAS, type CartaDef } from './data/catalogoCartas';
import { NUMEROS } from './data/numerosCartas';

/**
 * AS CARTAS — o sistema de cartas (branch `feat/cartas-preview`; protótipo de 27/09, catálogo de 24 em 01/10).
 *
 * Fonte: `sistema_de_cartas_skills_shoot_em_up_v2.md` (o documento do Henrique), revisado contra o jogo na spec
 * `2026-10-01-catalogo-cartas-design.md`. O CATÁLOGO mora em `data/catalogoCartas.ts` (puro, testado em node); aqui
 * ficam as regras de mão e de mesa:
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

export { COR_RARIDADE, NOME_RARIDADE, RARIDADES, type Raridade } from './raridade';
export { CARTAS, ICONES_CARTAS, type CartaDef, type Categoria } from './data/catalogoCartas';

const ORDEM = RARIDADES;

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
  if (cadencia) def.rate = base.rate * Math.pow(NUMEROS.cadencia.fator, cadencia);
  if (tem(reg, 'WPN_007')) def.pierce = true;
  if (tem(reg, 'WPN_008')) {
    def.damage = base.damage * NUMEROS.pesado.dano;
    def.speed = base.speed * NUMEROS.pesado.velocidade;
    def.bulletScale = base.bulletScale * NUMEROS.pesado.escala;
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
