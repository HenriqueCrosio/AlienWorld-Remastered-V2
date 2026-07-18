import type { EnemyKind } from './EnemySystem';
import type { PropKind } from './TerrainSystem';
import type { HazardKind } from './DebrisSystem';

export type StageEvent =
  | { t: number; type: 'wave'; kind: EnemyKind; count: number; spacing: number; y: number }
  /** Relevo ANCORADO no chão. Só faz sentido com gravidade (Fase 1). */
  | { t: number; type: 'terrain'; rate: number; mix: PropKind[] }
  /** Destroços FLUTUANDO. O equivalente do relevo no vácuo (Fase 2). */
  | { t: number; type: 'hazard'; rate: number; mix: HazardKind[] }
  | { t: number; type: 'banner'; text: string }
  /**
   * Densidade da NEBULOSA (Fase 3): 1 = dentro da nuvem, 0 = fora. A transição para 0 é a
   * virada do Ato 1 para o Ato 2 — a nuvem rareia e o CASCO do Leviatã aparece por baixo
   * (as duas coisas são o mesmo fade, ver Parallax.setNebulaDensity).
   */
  | { t: number; type: 'nebula'; density: number }
  /** O MINI-BOSS do Ato 2 (a aranha que anda no casco). Um por fase, roteirizado. */
  | { t: number; type: 'miniboss' }
  | { t: number; type: 'boss' };

/**
 * FASE 1 — A DECOLAGEM. Duração ~75s.
 *
 * Arco: rasante na superfície da lua (é o Alien World v2) → chefão → e só ENTÃO a
 * atmosfera rompe. A zero-G é a RECOMPENSA por vencer, não um evento no meio.
 * Toda a fase é jogada no FLAP, porque há gravidade — é o berço da condução.
 *
 * RITMO (playtest): a primeira versão era "um passeio no parque". As ondas agora se
 * SOBREPÕEM em vez de se revezarem, o relevo é contínuo, e nunca há tela vazia — exceto
 * o silêncio deliberado antes do boss, que é o telégrafo mais barato que existe.
 */
export const STAGE_1: StageEvent[] = [
  { t: 0.5, type: 'banner', text: 'LUA DE KEPLER · SETOR 7' },
  { t: 1, type: 'terrain', rate: 2.0, mix: ['spire'] },

  // Só picos e drones: o jogador aprende a voar e atirar ao mesmo tempo.
  { t: 4, type: 'wave', kind: 'drone', count: 4, spacing: 0.45, y: 70 },
  { t: 8, type: 'wave', kind: 'drone', count: 4, spacing: 0.4, y: 120 },

  // A COLÔNIA aparece: construções, silos, antenas e destroços entram no relevo.
  // A mistura é o que faz a superfície parecer um lugar habitado (e morto), não um corredor.
  { t: 12, type: 'terrain', rate: 1.5, mix: ['spire', 'spire', 'building', 'silo', 'wreck'] },
  { t: 13, type: 'wave', kind: 'batedor', count: 3, spacing: 0.5, y: 90 },
  { t: 17, type: 'wave', kind: 'drone', count: 5, spacing: 0.3, y: 50 },
  { t: 18, type: 'wave', kind: 'batedor', count: 3, spacing: 0.5, y: 130 },

  // Torres de solo: agora o CHÃO atira em você. UMA torre a cada 4 props — o relevo
  // precisa ser majoritariamente rocha, senão não sobra cobertura para se esconder.
  { t: 23, type: 'banner', text: 'DEFESAS DE SOLO ATIVAS' },
  { t: 24, type: 'terrain', rate: 1.5, mix: ['spire', 'turret', 'building', 'spire', 'radar', 'silo'] },
  { t: 27, type: 'wave', kind: 'batedor', count: 4, spacing: 0.35, y: 70 },
  { t: 31, type: 'wave', kind: 'drone', count: 6, spacing: 0.25, y: 110 },

  // Canhoneira: o primeiro inimigo aéreo que revida. Junto com torres no chão.
  { t: 35, type: 'wave', kind: 'canhoneira', count: 1, spacing: 0, y: 80 },
  { t: 37, type: 'wave', kind: 'batedor', count: 4, spacing: 0.3, y: 120 },
  // O coração da colônia: a BASE, grande e valiosa (250 pontos), entre torres.
  { t: 41, type: 'terrain', rate: 1.3, mix: ['spire', 'turret', 'base', 'building', 'spire', 'wreck'] },
  { t: 42, type: 'wave', kind: 'drone', count: 6, spacing: 0.25, y: 60 },

  // PICO DE PRESSÃO: fogo do chão e do ar ao mesmo tempo. O playtest confirmou que é o
  // melhor momento da fase — mantido intacto, só com rocha extra para dar cobertura.
  { t: 47, type: 'banner', text: 'FOGO CRUZADO' },
  { t: 47.5, type: 'terrain', rate: 1.1, mix: ['spire', 'spire', 'turret', 'spire'] },
  // Canhoneiras cortadas de 4 para 2 na fase inteira (playtest): mesmo com telégrafo,
  // várias mirando ao mesmo tempo satura o espaço de fuga. A pressão do fogo cruzado
  // agora vem do VOLUME de batedores/drones, não do tiro mirado.
  { t: 48, type: 'wave', kind: 'canhoneira', count: 1, spacing: 0, y: 60 },
  { t: 50, type: 'wave', kind: 'batedor', count: 5, spacing: 0.3, y: 130 },
  { t: 54, type: 'wave', kind: 'drone', count: 8, spacing: 0.2, y: 90 },
  { t: 57, type: 'wave', kind: 'drone', count: 6, spacing: 0.22, y: 130 },
  { t: 58, type: 'wave', kind: 'batedor', count: 5, spacing: 0.25, y: 70 },

  // Silêncio. O vazio anuncia o boss melhor que qualquer aviso.
  { t: 63, type: 'terrain', rate: 0, mix: [] },
  { t: 65, type: 'banner', text: 'ALERTA · TORRE DE DEFESA' },
  { t: 68, type: 'boss' },
];

/**
 * FASE 2 — FROTA MORTA. Duração ~78s.
 *
 * O vácuo. Sem chão, sem gravidade: a condução é LIVRE, e é a primeira vez que o jogador
 * voa em 8 direções. A Fase 1 acabou de tirar o flap dele — esta fase é onde ele respira.
 *
 * O ARCO RESPIRA (docs/GDD.md §7): a Fase 1 era fechada (chão embaixo). Esta é ABERTA.
 * Por isso a dificuldade NÃO vem de apertar o corredor — vem do VOLUME e de inimigos que
 * perseguem. O espaço é livre; o que o povoa é que mata.
 *
 * O cenário conta a história sozinho: a Lua de Kepler ficando para trás (encolhendo) e o
 * LEVIATÃ crescendo ao fundo. É o que dá sentido a "aproximação" sem uma linha de diálogo.
 *
 * RITMO: asteroides desde o início (o obstáculo que se aprende a ATIRAR, não a desviar) →
 * destroços da sua própria frota → minas → kamikazes → cargueiro → Canhoneira-Capitânia.
 */
export const STAGE_2: StageEvent[] = [
  { t: 0.5, type: 'banner', text: 'CINTURÃO DE DESTROÇOS · FROTA MORTA' },

  // Só asteroides: no vácuo o obstáculo não é para desviar, é para ABATER. É a diferença
  // com a Fase 1 e o jogador precisa senti-la antes de qualquer inimigo aparecer.
  { t: 1, type: 'hazard', rate: 1.4, mix: ['asteroid'] },
  { t: 5, type: 'wave', kind: 'drone', count: 4, spacing: 0.4, y: 80 },
  { t: 9, type: 'wave', kind: 'batedor', count: 4, spacing: 0.4, y: 130 },

  // A FROTA MORTA: os destroços são das SUAS naves. Indestrutíveis — massa de metal
  // morto que não se abate, só se contorna. É o cemitério, e ele tem que pesar.
  { t: 13, type: 'banner', text: 'RESTOS DA 3ª FROTA' },
  { t: 14, type: 'hazard', rate: 1.2, mix: ['asteroid', 'asteroid', 'destroco'] },
  { t: 15, type: 'wave', kind: 'drone', count: 5, spacing: 0.3, y: 60 },
  { t: 18, type: 'wave', kind: 'batedor', count: 5, spacing: 0.32, y: 110 },

  // ─── A MINA SENSORA ENTRA AQUI, E SOZINHA ───
  //
  // É a peça nova da fase, e por isso ela é APRESENTADA antes de ser cobrada: um par de minas
  // num céu limpo, sem onda nenhuma competindo pela atenção. O jogador tem que poder chegar
  // perto, ver a coisa ACORDAR e piscar, e descobrir no susto que a resposta é o gatilho.
  // Ensinar uma mecânica no meio de um enxame não é dificuldade, é sonegação.
  { t: 22, type: 'banner', text: 'CAMPO MINADO · SENSORES ATIVOS' },
  { t: 23, type: 'hazard', rate: 2.0, mix: ['sensor', 'asteroid'] },
  { t: 27, type: 'wave', kind: 'batedor', count: 5, spacing: 0.3, y: 70 },

  // Agora ela é COBRADA: sensor + mina comum + destroço, com pressão aérea por cima. É aqui que
  // a fase deixa de ser "atire no que vem" e passa a exigir que o jogador LIMPE O CAMINHO À
  // FRENTE — que é exatamente o que faltava para ela pesar tanto quanto a Fase 1.
  { t: 30, type: 'hazard', rate: 1.15, mix: ['asteroid', 'sensor', 'mina', 'destroco'] },
  { t: 31, type: 'wave', kind: 'drone', count: 6, spacing: 0.25, y: 120 },

  // KAMIKAZE: acelera na sua direção. O primeiro inimigo que te CAÇA — e a resposta certa
  // é atirar, não desviar. Entra sozinho, para ser lido.
  { t: 34, type: 'banner', text: 'CONTATO · INTERCEPTADORES' },
  { t: 35, type: 'wave', kind: 'kamikaze', count: 3, spacing: 0.8, y: 90 },
  { t: 39, type: 'hazard', rate: 1.2, mix: ['asteroid', 'destroco', 'sensor', 'mina'] },
  { t: 40, type: 'wave', kind: 'kamikaze', count: 3, spacing: 0.7, y: 60 },
  { t: 42, type: 'wave', kind: 'batedor', count: 5, spacing: 0.28, y: 130 },

  // O CRUZAMENTO CRUEL: o kamikaze te empurra para trás, a mina sensora pune quem recua sem
  // olhar. Duas peças que, juntas, negam as duas saídas fáceis — e nenhuma delas é nova.
  // É o "fogo cruzado" da Fase 1 traduzido para um espaço sem chão.
  { t: 46, type: 'banner', text: 'CARGUEIRO INIMIGO' },
  { t: 47, type: 'wave', kind: 'cargueiro', count: 1, spacing: 0, y: 80 },
  { t: 50, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.6, y: 120 },
  { t: 52, type: 'wave', kind: 'batedor', count: 4, spacing: 0.3, y: 55 },

  // PICO DE PRESSÃO: o cinturão inteiro em cima do jogador. Sem chão para raspar e sem
  // rocha para se esconder — no vácuo a cobertura é o próprio destroço.
  { t: 55, type: 'banner', text: 'ENXAME' },
  { t: 55.5, type: 'hazard', rate: 0.85, mix: ['asteroid', 'destroco', 'sensor', 'mina'] },
  { t: 56, type: 'wave', kind: 'canhoneira', count: 1, spacing: 0, y: 70 },
  { t: 58, type: 'wave', kind: 'kamikaze', count: 5, spacing: 0.5, y: 100 },
  { t: 61, type: 'wave', kind: 'drone', count: 8, spacing: 0.2, y: 60 },
  { t: 63, type: 'wave', kind: 'batedor', count: 6, spacing: 0.25, y: 140 },
  { t: 65, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.55, y: 80 },
  { t: 66, type: 'wave', kind: 'canhoneira', count: 1, spacing: 0, y: 120 },

  // Silêncio — o mesmo telégrafo da Fase 1. Funciona; não se conserta o que não quebrou.
  { t: 70, type: 'hazard', rate: 0, mix: [] },
  { t: 72, type: 'banner', text: 'ALERTA · CANHONEIRA-CAPITÂNIA' },
  { t: 75, type: 'boss' },
];

/**
 * FASE 3 — O CASCO. Duração ~88s. DOIS ATOS (design fechado com o Henrique).
 *
 * ATO 1 (0–42s): DENTRO da nebulosa. O impacto visual que tira o jogo do tom monótono — e a
 * visibilidade reduzida é o tema mecânico: os véus na frente escondem o que vem. O vocabulário
 * é o da Fase 2 (o jogador já sabe ler tudo), com pressão maior e cachos de minas.
 *
 * ~42s: a nave SAI da nuvem (nebula → 0). O fade é a virada de ato: a nebulosa rareia e o que
 * aparece por baixo é o CASCO do Leviatã — o destino da campanha virando CHÃO, o mesmo truque
 * de escala da Aurora e da Doca.
 *
 * ATO 2 (48–88s): o vocabulário da FASE 1 transplantado — torres e radares sobre o casco
 * (TerrainSystem no vácuo: o casco é a superfície). A ARANHA mini-boss abre o ato: um andador
 * finalmente tem chão para andar. Depois dela, 9s de RESPIRO (auditoria: release depois do
 * mini-boss, senão é ruído). O pico final mistura os dois mundos, e o silêncio anuncia a
 * SERPENTE.
 */
export const STAGE_3: StageEvent[] = [
  { t: 0.5, type: 'banner', text: 'NEBULOSA DE KEPLER · APROXIMAÇÃO FINAL' },
  { t: 0.6, type: 'nebula', density: 1 },

  // Dentro da nuvem: asteroides e drones — o básico da F2, mas com véus na frente.
  { t: 2, type: 'hazard', rate: 1.3, mix: ['asteroid'] },
  { t: 5, type: 'wave', kind: 'drone', count: 5, spacing: 0.35, y: 80 },
  { t: 9, type: 'wave', kind: 'batedor', count: 4, spacing: 0.35, y: 130 },

  // Minas em CACHOS na névoa: a visibilidade curta transforma uma peça conhecida em susto
  // honesto — o telégrafo delas (acordar e piscar) continua lá, só se vê mais tarde.
  { t: 13, type: 'banner', text: 'SENSORES NA NÉVOA' },
  { t: 14, type: 'hazard', rate: 1.0, mix: ['sensor', 'sensor', 'asteroid', 'mina'] },
  { t: 16, type: 'wave', kind: 'drone', count: 6, spacing: 0.28, y: 60 },
  { t: 20, type: 'wave', kind: 'kamikaze', count: 3, spacing: 0.7, y: 100 },
  { t: 24, type: 'wave', kind: 'batedor', count: 5, spacing: 0.3, y: 70 },

  // Pico do Ato 1: cargueiro + kamikazes dentro da nuvem.
  { t: 28, type: 'banner', text: 'CARGUEIRO NA NEBULOSA' },
  { t: 29, type: 'wave', kind: 'cargueiro', count: 1, spacing: 0, y: 90 },
  { t: 32, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.55, y: 70 },
  { t: 35, type: 'wave', kind: 'drone', count: 7, spacing: 0.22, y: 120 },

  // ─── A VIRADA: sair da nuvem. O casco aparece por baixo dela. ───
  { t: 40, type: 'hazard', rate: 0, mix: [] },
  { t: 42, type: 'nebula', density: 0 },
  { t: 44, type: 'banner', text: 'O CASCO DO LEVIATÃ' },

  // ATO 2: o casco é a superfície — torres e radares SOBRE ele (vocabulário da F1;
  // no vácuo o verbo continua o da F2: tudo se abate).
  { t: 46, type: 'terrain', rate: 1.6, mix: ['wreck', 'turret', 'wreck', 'radar'] },
  { t: 48, type: 'wave', kind: 'drone', count: 5, spacing: 0.3, y: 70 },

  // O MINI-BOSS: a aranha entra andando no casco. As pernas dela finalmente têm motivo.
  { t: 52, type: 'banner', text: 'SENTINELA DO CASCO' },
  { t: 53, type: 'miniboss' },

  // RESPIRO pós-aranha (~9s sem spawns novos): a auditoria pediu, e o silêncio também é o
  // contraste que faz o pico final pesar.
  { t: 54, type: 'terrain', rate: 0, mix: [] },

  { t: 63, type: 'terrain', rate: 1.4, mix: ['wreck', 'turret', 'wreck', 'silo'] },
  { t: 64, type: 'wave', kind: 'batedor', count: 5, spacing: 0.28, y: 110 },
  { t: 67, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.55, y: 80 },
  { t: 70, type: 'banner', text: 'DEFESAS DO CASCO' },
  { t: 71, type: 'wave', kind: 'canhoneira', count: 1, spacing: 0, y: 70 },
  { t: 73, type: 'wave', kind: 'drone', count: 8, spacing: 0.2, y: 120 },
  { t: 76, type: 'wave', kind: 'kamikaze', count: 5, spacing: 0.5, y: 100 },
  { t: 78, type: 'wave', kind: 'batedor', count: 6, spacing: 0.25, y: 60 },

  // Silêncio → serpente. O mesmo telégrafo das duas fases.
  { t: 82, type: 'terrain', rate: 0, mix: [] },
  { t: 84, type: 'banner', text: 'ALERTA · SERPENTE DO CASCO' },
  { t: 88, type: 'boss' },
];

/** Onde a nave está. A física do mundo, não uma preferência do jogador (docs/GDD.md §3). */
export type Zone = 'atmosfera' | 'vacuo';

export interface StageDef {
  id: number;
  /** Nome da fase, mostrado no fim. */
  name: string;
  script: StageEvent[];
  /**
   * A física do lugar. É ela que decide a condução no modo diegético:
   * atmosfera tem gravidade → flap; vácuo não tem → livre.
   */
  zone: Zone;
  /** Trilha da fase (a do chefão é sempre 'boss'). */
  music: string;
  /**
   * Modo do fundo, quando a zona não basta. A Fase 3 é `vacuo` (voo livre) mas abre DENTRO
   * de uma nebulosa — o fundo é outro sem a física ser outra. Ausente = derivado da zona.
   */
  parallax?: 'superficie' | 'espaco' | 'nebulosa';
  /** Fase seguinte, ou null se é a última que existe hoje. */
  next: number | null;
  /**
   * Cena que toca ENTRE esta fase e a seguinte, se houver.
   *
   * É o encaixe da cutscene: a Fase 1 entrega a `Interlude` (pouso na capitânia → escolha de
   * nave → ela implode), e a Interlude é quem chama a Fase 2. Nem a fase que sai nem a que
   * entra sabem que ela existe.
   */
  interlude: string | null;
}

/**
 * A CAMPANHA. Acrescentar uma fase é acrescentar uma entrada aqui — a GameScene não
 * conhece nenhuma fase em particular, ela executa a que recebe.
 */
export const STAGES: Record<number, StageDef> = {
  1: {
    id: 1,
    name: 'A DECOLAGEM',
    script: STAGE_1,
    // Começa COM gravidade. A atmosfera só rompe ao matar o chefão — e é aí que a
    // Fase 1 entrega a Fase 2 já no vácuo.
    zone: 'atmosfera',
    music: 'stage1',
    next: 2,
    // Matar a Torre não entrega a Fase 2 direto: entrega o pouso na capitânia — e é a implosão
    // dela que EXPLICA o cinturão de destroços da Fase 2.
    interlude: 'Interlude',
  },
  2: {
    id: 2,
    name: 'FROTA MORTA',
    script: STAGE_2,
    // Vácuo do começo ao fim: a atmosfera ficou para trás na fase passada.
    zone: 'vacuo',
    music: 'stage1',
    next: 3,
    // A DOCA KEPLER-9: pouso na estação de mineração, a nave ALIENÍGENA entra no róster, e a doca
    // explode. É a ponte para a Fase 3 — que agora EXISTE (2026-07-18).
    interlude: 'Interlude2',
  },
  3: {
    id: 3,
    name: 'O CASCO',
    script: STAGE_3,
    // Vácuo (voo livre) — mas o FUNDO é a nebulosa: a física e o cenário são decisões
    // separadas de propósito (ver `parallax` na StageDef).
    zone: 'vacuo',
    parallax: 'nebulosa',
    music: 'stage1',
    // A Fase 4 (O Interior) ainda não existe: vencer a serpente fecha a campanha na vitória.
    next: null,
    interlude: null,
  },
};

/**
 * Executa o roteiro: dispara cada evento quando o relógio o alcança.
 * A fase é DADO, não código — balancear não pode exigir recompilar (docs/TECH.md).
 */
export class StageDirector {
  private next = 0;

  constructor(private readonly script: StageEvent[]) {}

  /**
   * Instante em que o chefão entra — o modo treino salta para cá.
   *
   * É de INSTÂNCIA, não estático. Enquanto só existia a Fase 1, um `static` que lia
   * STAGE_1 dava a resposta certa por acidente; com duas fases ele mandaria o treino da
   * Fase 2 para o relógio do chefão da Fase 1.
   */
  get bossTime(): number {
    const boss = this.script.find((e) => e.type === 'boss');
    return boss ? boss.t : 0;
  }

  /**
   * Descarta tudo o que aconteceria antes de `t`, sem executar.
   * É o que permite treinar o chefão sem jogar a fase inteira antes.
   */
  skipTo(t: number): void {
    while (this.next < this.script.length && this.script[this.next].t < t) this.next++;
  }

  /** @returns os eventos que devem disparar agora. */
  update(elapsed: number): StageEvent[] {
    const due: StageEvent[] = [];

    while (this.next < this.script.length && this.script[this.next].t <= elapsed) {
      due.push(this.script[this.next]);
      this.next++;
    }

    return due;
  }
}
