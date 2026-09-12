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
  /**
   * O MINI-CHEFÃO de uma fase, roteirizado — um por fase.
   *
   * `kind` ausente é a ARANHA (Fase 3): o `STAGE_3` não muda uma linha. `golfinho` é o da câmara B
   * da Fase 4 (spec 2026-09-11), e ele traz a ARENA: `seguraEm` é o `t` que o relógio da fase não
   * passa enquanto ele viver.
   *
   * ⚠️ O TETO É DO ROTEIRO, NÃO DA ENTIDADE, e é "não passa de", não "para quando o duelo começa".
   * O X do golfinho não tem duração exata — cada cambalhota o freia — e, se a pausa esperasse o
   * estado de duelo, um X mais longo deixaria os eventos seguintes nascerem DENTRO da arena.
   */
  | { t: number; type: 'miniboss'; kind?: 'aranha' | 'golfinho'; seguraEm?: number }
  /**
   * O RABO DO LEVIATÃ atravessando a tela (Fase 3): a nadadeira traseira entra pela DIREITA,
   * bate uma vez com tudo — o nado espacial dele — e sai pela esquerda. É a TRANSIÇÃO do Ato 1
   * para o Ato 2, e ela conta uma coisa que nenhum banner contava: a perseguição acabou, o
   * jogador ALCANÇOU o Leviatã por trás. O casco que vira chão logo depois é a mesma criatura,
   * vista de perto demais.
   *
   * ⚠️ SEM HITBOX. É cenário roteirizado, não inimigo — nada de onda, dano ou colisão muda.
   */
  | { t: number; type: 'rabo' }
  /**
   * CORREDOR de precisão (Fase 4): pares chão+TETO com VÃO GARANTIDO de `gap` px, em altura
   * sorteada. É o cano do flappy virando terreno — o DNA do v2 — mas SEM flap: no voo livre o
   * desafio é posição, não ritmo. O par é atômico de propósito: duas alturas independentes
   * podem somar uma parede impassável, e corredor impassável não é difícil, é roubado.
   */
  | { t: number; type: 'corredor'; rate: number; gap: number }
  /**
   * A ESPESSURA DA FAIXA da moldura (Fase 4), em px — do `GROUND_Y` para cima no chão e do
   * `TETO_Y` para baixo no teto, as mesmas âncoras que o `TerrainSystem` já usa.
   *
   * ⚠️ É UM EVENTO SEPARADO DO `corredor`, DE PROPÓSITO. O `gap` manda na COLISÃO; a espessura
   * manda no DESENHO — é a separação que protege a fase de virar um conserto de colisão. E, na
   * prática: a batida do duto (t=68) não tem evento `corredor` nenhum.
   *
   * A fase inteira vira uma frase: **a fase é emoldurada, o duto fecha, e o núcleo reabre.**
   *
   * ⚠️ A CURVA NÃO SOBE MAIS MONOTONICAMENTE, e isso foi uma decisão, não um descuido. Até o teste
   * jogado de 10/09 ela subia em seis degraus do começo ao fim; o Henrique jogou e pediu borda de
   * MARGEM na fase inteira, fechando só no duto e **abrindo no chefão** — *"isso dá o desafio
   * extra de desviar e conseguir sair do duto com vida"*. Quem quiser voltar a exigir monotonia
   * numa sonda vai reprovar o desenho aprovado.
   *
   * `letal` é a parede COBRANDO o encosto, e só o duto pede isso. ⚠️ Ela NÃO é deduzida da
   * espessura: um roteiro futuro que pedisse 54px por outro motivo ganharia parede assassina sem
   * ninguém ter escrito isso. Quem manda é esta linha. Ver `Moldura.morde`.
   *
   * ⚠️ Os números são CHUTE CALIBRADO até o playtest, com a mesma etiqueta dos vãos e dos HP das
   * portas.
   */
  | { t: number; type: 'moldura'; espessura: number; duto?: boolean }
  /**
   * UMA PORTA do duto (Fase 4): a comporta que TAPA O VÃO INTEIRO e só deixa passar quem a
   * destrói. Ela é o que faz o duto ser um lugar em vez de uma passagem estreita — o veredicto
   * do teste jogado de 10/09.
   *
   * ⚠️ É UM EVENTO PONTUAL, não uma taxa. `corredor` e `hazard` cravam um RITMO que persiste; a
   * porta é um instante, como o `miniboss` e o `rabo`. Três portas roteirizadas uma a uma valem
   * mais que um `rate`: elas têm HP crescente, e é essa progressão que dá começo, meio e fim ao
   * duto.
   *
   * ⚠️ O `hp` VIVE AQUI, e não na tabela de props. Ele sobrepõe o `PropDef` porta a porta (6, 8,
   * 10 — os números da spec de 06/09, chute calibrado até o playtest): a conta é que a porta
   * chega em quem voa em ~3,5s e a PULSE, o pior caso, entrega 7 de dano/s.
   */
  | { t: number; type: 'porta'; hp: number }
  /**
   * TROCA O CENÁRIO PINTADO (Fase 4). A fase é uma jornada anatômica — o hangar engolido, a
   * caixa torácica, o duto e a câmara do núcleo — e cada câmara tem a pintura dela.
   *
   * ⚠️ É O ROTEIRO QUE MANDA, não o `Parallax`: a forma da fase mora toda num lugar só. Um
   * relógio interno no fundo derivaria do roteiro na primeira vez que alguém mexesse nos
   * tempos, e a troca cairia no meio de uma onda em vez de no respiro.
   */
  /**
   * Troca a pintura da câmara (Fase 4).
   *
   * `fadeMs` encurta o mergulho no escuro do `setPintura` (600 por omissão). ⚠️ ELE EXISTE PARA A
   * TROCA DE t=40,95, que acontece atrás da água: o mergulho é justamente o truque de ESCONDER o
   * corte, e ele vira contraproducente quando já há um véu opaco por cima — a pintura nova
   * reaparecendo por baixo da água que assenta lê como pisca. Sob água, o corte pode ser rápido.
   */
  | { t: number; type: 'cenario'; key: string; fadeMs?: number }
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
  // ─── A ÁGUA-VIVA: a vida da nebulosa, e o único ritmo lento do Ato 1 ───
  //
  // ⚠️ ELAS CAEM EM CIMA DAS ONDAS RÁPIDAS DE PROPÓSITO. Lento e rápido no mesmo quadro é o
  // contraste que justifica ela existir; sozinha numa janela vazia ela vira só um asteroide
  // bonito que brilha.
  //
  // ⚠️ O ÚLTIMO SPAWN TEM QUE LIMPAR A TELA ANTES DE t=38, e a margem é APERTADA. Ela nasce em
  // `x = GAME_WIDTH + 16` (400), não em 384 — são 400px a 28px/s, ou seja **14,3s** de travessia,
  // e não os 13,7 que a largura da tela sugere. A primeira versão pôs a segunda onda em t=19: o
  // último nascia em 23,2 e ainda estava vivo em t=38. A sonda pegou.
  //
  // O quadro precisa estar VAZIO quando o rabo entra — o vazio é o que faz a chegada dele pesar,
  // e é para isso que o `hazard rate 0` existe em t=37,5. Com a onda em t=16, o último nasce em
  // 20,2 e limpa em t≈34,5. NÃO empurrar estas ondas para depois de t=23.
  // ⚠️ O `y` AQUI É IGNORADO: a travessia vertical nasce NA borda (ver `EnemySystem.spawn`). O
  // roteiro escolhe QUANDO ela cruza, não a que altura — altura de quem atravessa é a borda.
  { t: 8, type: 'wave', kind: 'aguaViva', count: 3, spacing: 1.6, y: 100 },
  { t: 9, type: 'wave', kind: 'batedor', count: 4, spacing: 0.35, y: 130 },

  // Minas em CACHOS na névoa: a visibilidade curta transforma uma peça conhecida em susto
  // honesto — o telégrafo delas (acordar e piscar) continua lá, só se vê mais tarde.
  { t: 13, type: 'banner', text: 'SENSORES NA NÉVOA' },
  { t: 14, type: 'hazard', rate: 1.0, mix: ['sensor', 'sensor', 'asteroid', 'mina'] },
  { t: 16, type: 'wave', kind: 'drone', count: 6, spacing: 0.28, y: 60 },
  { t: 16, type: 'wave', kind: 'aguaViva', count: 4, spacing: 1.4, y: 75 },
  { t: 20, type: 'wave', kind: 'kamikaze', count: 3, spacing: 0.7, y: 100 },

  // ⚠️ O LEVIATÃ COMEÇA A APARECER NA METADE DO ATO 1 (Fatia 5). O `HANDOFF` sempre pediu isso —
  // "na metade do tempo, o Leviatã começa a aparecer" — e o código nunca fez: o casco ficava em
  // alpha 0 até a virada em t=42 e SALTAVA para visível.
  //
  // `density 0.75` faz duas coisas de uma vez, e as duas são desejadas: afina a nuvem em 25% e
  // sobe o casco a 0.25 (o alpha dele é `1 − nebulaDim`). A nuvem abrindo é o que MOTIVA o casco
  // aparecer — melhor do que ele surgir através de uma nuvem inalterada.
  //
  // ⚠️ É UMA INSINUAÇÃO, NÃO UMA REVELAÇÃO. Se der para LER a estrutura do casco antes dos 42s, a
  // virada perde o efeito e este número está alto demais. O critério é "sentir que há algo por
  // baixo", não "ver o casco".
  { t: 21, type: 'nebula', density: 0.75 },

  { t: 24, type: 'wave', kind: 'batedor', count: 5, spacing: 0.3, y: 70 },

  // Pico do Ato 1: cargueiro + kamikazes dentro da nuvem.
  { t: 28, type: 'banner', text: 'CARGUEIRO NA NEBULOSA' },
  { t: 29, type: 'wave', kind: 'cargueiro', count: 1, spacing: 0, y: 90 },
  { t: 32, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.55, y: 70 },
  { t: 35, type: 'wave', kind: 'drone', count: 7, spacing: 0.22, y: 120 },

  // ─── A VIRADA: O RABO. ───
  //
  // A nuvem para de cuspir asteroide em t=40 e o quadro esvazia — e é no vazio que o RABO
  // entra pela direita, ainda ATRÁS dos véus, e bate a nadadeira uma vez com tudo. A ordem
  // importa: primeiro o jogador vê O QUE alcançou, e só DEPOIS a nuvem abre e revela em cima
  // do que ele está voando. Invertido (nuvem primeiro, rabo depois) o casco chegaria como
  // cenário anônimo e o rabo viraria decoração atrasada.
  // ⚠️ O RABO ANDOU PARA TRÁS: 40,5 → 38 (2026-08-27). A coreografia nova — a remada final que
  // manda a nadadeira para fora do rodapé, o toco segurando, e o casco nascendo dele — precisa
  // de ~2,5s a mais de pista. Puxar o rabo é mais barato do que empurrar o Ato 2 inteiro.
  //
  // O `hazard rate 0` andou junto (40 → 37,5) porque ele NÃO é do Ato 2: é a preparação do
  // rabo. Esvaziar o quadro é o que faz a chegada pesar, e tem que acontecer antes dela.
  //
  // ⚠️ O BANNER SAIU DAQUI (2026-08-29). Ele já tinha andado de 44 para 48,5 porque anunciava um
  // casco que só existia em t=48 — legenda antes da imagem. Agora ele nem mora mais no relógio:
  // quem o dispara é `GameScene.escurecerParaOCasco`, no instante em que a tela fica preta, que
  // é onde o Henrique pediu que o nome aparecesse. Horário fixo para um evento que é o fim de um
  // tween é a mesma armadilha que o casco já tinha: os dois derivam na primeira mudança de
  // duração. Se você procurar 'O CASCO DO LEVIATÃ' e não achar aqui, é por isso.
  //
  // ⚠️ A "INSINUAÇÃO" DE t=21 NÃO REVELA MAIS O CASCO, e isso é deliberado. O `density 0.75`
  // continua lá afinando a nuvem, mas o casco não está mais amarrado a ele (ver
  // `Parallax.cascoReveal`). O HANDOFF pedia a insinuação desde sempre; ela foi implementada em
  // 26/08, foi JOGADA, e o Henrique reprovou. O teste jogado vence o documento.
  { t: 37.5, type: 'hazard', rate: 0, mix: [] },
  { t: 38, type: 'rabo' },
  { t: 42, type: 'nebula', density: 0 },

  // ATO 2: o casco é a superfície — e o que há EM CIMA dele é a defesa do próprio Leviatã.
  //
  // ⚠️ Aqui vivia a colônia da FASE 1 transplantada: `wreck`, `turret`, `radar`, `silo`. Como
  // bloco de jogo funcionava; como ficção mentia — o casco vivo de uma baleia biomecânica não
  // tem reservatório de colônia nem antena de rádio parafusada em cima. As duas peças novas
  // (`lancaMisseis`, `respiradouro`) foram geradas com o Leviatã armored como referência.
  //
  // ⚠️ A PROPORÇÃO DE QUEM ATIRA CONTINUA A MESMA — E É POR ISSO QUE OS DOIS NÚMEROS MUDARAM
  // JUNTOS (2026-08-27). A cadência caiu pela metade (1,6s → 3,0s) e a mistura dobrou a favor do
  // lança (1:3 → 1:1). Os dois se cancelam exatamente na conta de quem atira:
  //
  //   antes   27s de janela / 1,6s × 0,25 = 4,22 lança-mísseis
  //   depois  25s de janela / 3,0s × 0,50 = 4,17 lança-mísseis
  //
  // A janela encolheu porque os props começam em t=48, quando o casco fica SÓLIDO, e não mais em
  // t=46: prop opaco sobre casco meio transparente é o defeito que a virada nova conserta. O 3,0
  // (em vez do 3,2 da spec) é o que compensa esses 2 segundos.
  //
  // O respiradouro cai de ~12,7 para ~3 — e quem garante o ESPAÇAMENTO é a carência no
  // `GameScene.spawnProps`, não esta mistura. Sorteio uniforme pode dar dois seguidos.
  { t: 48, type: 'terrain', rate: 3.0, mix: ['respiradouro', 'lancaMisseis'] },
  { t: 48, type: 'wave', kind: 'drone', count: 5, spacing: 0.3, y: 70 },

  // O MINI-BOSS: a aranha entra andando no casco. As pernas dela finalmente têm motivo.
  { t: 52, type: 'banner', text: 'SENTINELA DO CASCO' },
  { t: 53, type: 'miniboss' },

  // RESPIRO pós-aranha (~9s sem spawns novos): a auditoria pediu, e o silêncio também é o
  // contraste que faz o pico final pesar.
  { t: 54, type: 'terrain', rate: 0, mix: [] },

  { t: 63, type: 'terrain', rate: 3.0, mix: ['respiradouro', 'lancaMisseis'] },
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

/**
 * FASE 4 — O INTERIOR. Duração ~86s. A FASE FINAL (decisão do Henrique, 2026-07-19).
 *
 * Dentro do Leviatã. Zero-G (o bicho não tem gravidade artificial — a regra diegética fica
 * intacta: vácuo → voo livre, SEM flap), e o eixo de dificuldade é o que nenhuma fase cobrou
 * ainda: PRECISÃO DE VOO. A campanha fechou o ciclo dos verbos: F1 desviar (chão) → F2 abater
 * (aberto) → F3 anatomia → F4 desviar DOS DOIS LADOS (chão E teto — a primeira fase fechada
 * por cima). Referência do Henrique: corredores industriais tipo Metroid.
 *
 * O arco: entrar (corredores largos, aprender que o teto EXISTE) → o interior reage (defesas
 * + minas em corredores médios) → o APERTO (corredores estreitos + kamikazes: posição sob
 * pressão) → silêncio → o NÚCLEO (chefão final — design pendente com o Henrique).
 *
 * Sem asteroide aqui: pedra não faz sentido dentro do bicho. O entulho do interior é
 * `destroco` (o que ele engoliu) e as minas são as defesas DELE.
 */
export const STAGE_4: StageEvent[] = [
  { t: 0.5, type: 'banner', text: 'O INTERIOR · SEM VOLTA' },

  // Corredores LARGOS primeiro: o jogador precisa descobrir que o teto mata ANTES de o vão
  // apertar. Aprender a regra nova no aperto é sonegação, não dificuldade.
  //
  // ⚠️ OS TRÊS VÃOS ANTES DO GOLFINHO SUBIRAM +16 (110→126, 96→112, 104→120) no teste jogado de
  // 12/09: *"diminua o tamanho das mesas no início da fase 4 — diminuir elas quer dizer aumentar
  // o espaço de navegação da nave; deixe para as mesas crescerem a partir do golfinho"*. O vão é
  // o ÚNICO knob da mesa: ela nasce da borda até a borda do vão, então +16 de vão é −16 de mesa
  // somados chão e teto. A maior mesa isolada da abertura cai de 62px para 46px.
  //
  // ⚠️ O RITMO INTERNO FOI PRESERVADO — os três andaram juntos, então largo→aperta→respira
  // continua sendo a forma da câmara A. E a queda para 76 em t=50 fica MAIOR de propósito: é o
  // golfinho que passa a ser a fronteira entre o lugar largo e a garganta.
  //
  // ⚠️ O PREÇO ESTÁ NA ONDULAÇÃO, e é aritmética, não gosto: o centro do vão anda em
  // [TETO_Y + MARGEM + meio, GROUND_Y − MARGEM − meio], uma faixa de "148 − gap" px. Em 110 o
  // corredor tinha 38px de sobe-e-desce; em 126 tem 22. Se a abertura ficar RETA demais no teste
  // jogado, o knob é a Moldura.MARGEM (24) para baixo, não o vão de volta para 110.
  { t: 1, type: 'corredor', rate: 2.2, gap: 126 },
  // ⚠️ A ESPESSURA É A DRAMATURGIA DA FASE — e ela já estava escrita nos vãos desde a Fatia 7, só
  // não estava visível. A moldura é o que faz o jogador ENXERGAR o que os números já faziam com
  // ele. 16px: você entrou num lugar grande.
  //
  // ⚠️ E 16px É ONDE ELA FICA ATÉ t=55. Depois do teste jogado de 10/09 a moldura é uma BORDA que
  // margeia a fase, não uma parede que cresce a fase inteira: o aperto do miolo vem do VÃO (76px
  // em t=43), e é o duto — e só ele — que fecha de verdade. Ver a spec de 10/09.
  { t: 1, type: 'moldura', espessura: 16 },
  { t: 5, type: 'wave', kind: 'drone', count: 4, spacing: 0.4, y: 90 },
  { t: 9, type: 'wave', kind: 'batedor', count: 4, spacing: 0.38, y: 120 },

  // O interior REAGE: minas sensoras nos vãos (a defesa imune do bicho) + pressão aérea.
  { t: 14, type: 'banner', text: 'ANTICORPOS · SENSORES ATIVOS' },
  { t: 15, type: 'corredor', rate: 2.4, gap: 112 },
  { t: 15, type: 'moldura', espessura: 16 },        // a borda margeia, e é só isso
  { t: 15.5, type: 'hazard', rate: 2.2, mix: ['sensor', 'destroco'] },
  { t: 17, type: 'wave', kind: 'drone', count: 5, spacing: 0.3, y: 60 },
  { t: 21, type: 'wave', kind: 'batedor', count: 5, spacing: 0.3, y: 140 },

  // Kamikazes num espaço FECHADO: o perseguidor conhecido, mas agora recuar tem parede.
  { t: 26, type: 'banner', text: 'INTERCEPTADORES NO DUTO' },
  { t: 27, type: 'wave', kind: 'kamikaze', count: 3, spacing: 0.75, y: 100 },
  { t: 30, type: 'wave', kind: 'drone', count: 6, spacing: 0.25, y: 80 },
  { t: 33, type: 'wave', kind: 'kamikaze', count: 3, spacing: 0.65, y: 130 },

  // Respiro estrutural: corredor solto, sem onda — o jogador reaprende a voar antes do aperto.
  { t: 37, type: 'corredor', rate: 2.6, gap: 120 },
  { t: 37, type: 'moldura', espessura: 16 },        // ainda margem: o respiro é largo de verdade
  { t: 38, type: 'hazard', rate: 0, mix: [] },
  // A ARENA ABRE. O corredor para de nascer 1,5s antes da câmara: as últimas mesas saem da tela em
  // 384 ÷ 84 = 4,6s, ou seja, em t≈43,1 — antes de o X do golfinho começar (t≈43,5).
  { t: 38.5, type: 'corredor', rate: 0, gap: 120 },

  // ─── O GOLFINHO: o motivo de a câmara mudar (spec 2026-09-11). ───
  //
  // O Henrique, depois de jogar o M1.5: *"quero que tenha um porquê de mudar o fundo"*. Antes daqui
  // os inimigos, as minas e a mesa eram os mesmos dos dois lados da troca. Agora a pintura azul chega
  // junto com o primeiro habitante do Leviatã: aviso A→B, o X, e o duelo em arena.
  //
  // ⚠️ `seguraEm: 49.5`: o relógio não passa daqui enquanto ele viver, e entre 41 e 50 o roteiro
  // não tem NADA marcado — é isso que faz a arena ser só o jogador e o golfinho.
  { t: 40, type: 'miniboss', kind: 'golfinho', seguraEm: 49.5 },

  // A CÂMARA 2 — a caixa torácica. Azul frio contra o vermelho da câmara 1: é a troca de
  // PALETA que faz "estou indo fundo" ser lido. Duas câmaras vermelhas seguidas leriam como o
  // mesmo lugar. Cai no RESPIRO (sem onda no ar), não no meio de uma.
  //
  // ⚠️ ERA t=40 E VIROU t=40,7 EM 12/09, E O NÚMERO É CASADO COM A `Agua`. Pedido dele: *"para
  // casar com a transição da imagem de fundo, tenha um pequeno efeito para encher de água a tela e
  // assim escondemos a transição das imagens de fundo"*. A troca sempre foi um CORTE SECO de uma
  // pintura para outra; agora ela cai dentro do SURTO da água, quando o véu está em alpha 0,96 e a
  // tela é uma cor só. A conta: o `miniboss` acima chama `encher()` em t=40, o pico completo
  // chega em 0,78s (`ENCHE_DUR` 0,62 + `SURTO_DUR` 0,16) e se sustenta por mais 0,45s — então a
  // janela vai de t=40,78 a t=41,23, e 40,95 cai no meio dela com ~0,2s de folga dos dois lados.
  //
  // ⚠️ ELE TEM DE VIR DEPOIS DO `miniboss` NO ARRAY, e não é estilo: o `StageDirector` caminha com
  // um cursor monotônico, e evento fora de ordem dispara no `t` do VIZINHO ANTERIOR. Trocar a
  // ordem destas duas linhas faria a pintura trocar em t=40, antes de existir água para escondê-la.
  //
  // ⚠️ MEXER NUM SEM O OUTRO DEVOLVE O CORTE SECO. A `probe-f4-agua` cobra exatamente isso: que no
  // instante em que a pintura troca, a água esteja `cobrindo`.
  { t: 40.95, type: 'cenario', key: 'paintBgF4b', fadeMs: 200 },
  { t: 41, type: 'banner', text: 'AS PROFUNDEZAS' },

  // ─── O APERTO: o coração da fase. Vão 76px (a nave tem ~22 de hitbox: passa com folga
  // CURTA), minas nos vãos, cargueiro cuspindo drones no corredor. Posição sob pressão. ───
  //
  // ⚠️ ENCOLHEU DE 20s PARA 13s (e a onda de batedores de t=46 saiu) para o golfinho caber sem
  // empurrar o duto aprovado para fora de t=68.
  { t: 50, type: 'banner', text: 'A GARGANTA APERTA' },
  { t: 50, type: 'corredor', rate: 1.9, gap: 76 },
  // ⚠️ O APERTO NÃO É DA PAREDE, É DO VÃO. A borda continua em 16 aqui: quem cobra posição é o
  // `corredor` de 76px acima, e empilhar parede grossa em cima do vão mais estreito da fase era
  // justamente o que fazia a moldura deixar de ler como borda.
  { t: 50, type: 'moldura', espessura: 16 },
  { t: 50.5, type: 'hazard', rate: 2.6, mix: ['sensor', 'mina', 'destroco'] },
  { t: 52, type: 'banner', text: 'CARGUEIRO NO CORREDOR' },
  { t: 52.5, type: 'wave', kind: 'cargueiro', count: 1, spacing: 0, y: 100 },
  { t: 54, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.6, y: 90 },
  // A PAREDE COMEÇA A GANHAR CORPO — o primeiro degrau real da fase, e ele cai no meio do pico,
  // sem evento `corredor` junto: o jogador sente o lugar apertar sem que o vão tenha mudado.
  { t: 55, type: 'moldura', espessura: 32 },
  { t: 58, type: 'wave', kind: 'drone', count: 7, spacing: 0.22, y: 110 },

  // PICO FINAL: o corredor continua estreito e TUDO vem junto — mas menos volume que o pico
  // da F2/F3: aqui o terreno já cobra metade da atenção, e pressão dupla total é ilegível.
  { t: 63, type: 'banner', text: 'REJEIÇÃO TOTAL' },
  { t: 63.5, type: 'corredor', rate: 1.7, gap: 84 },
  { t: 63.5, type: 'moldura', espessura: 44 },      // não é mais câmara
  { t: 64, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.55, y: 70 },
  { t: 67, type: 'wave', kind: 'canhoneira', count: 1, spacing: 0, y: 100 },
  // O DUTO — a mais escura das quatro (luminância média 11,7), e é onde a leitura mais
  // importa. Na Fatia 7 · Bloco C esta linha se realinha com a entrada das paredes contínuas.
  { t: 68, type: 'cenario', key: 'paintBgF4c' },
  // O DUTO: a faixa CHEIA, E ELA PASSA A MORDER. 54 é o teto da peça de 64px ancorada pela
  // superfície (`Moldura.ESPESSURA_MAX`), e a partir daqui a mesa vira parede — a trava dos 8px
  // apara o resto sozinha enquanto o corredor existir.
  //
  // ⚠️ `duto` CAI JUNTO COM A TROCA DE PINTURA, e não é coincidência: a faixa acende no mesmo
  // instante (ver `Moldura.setDuto`), então a regra nova chega ANUNCIADA. Parede que foi cenário
  // por 68s e de repente cobra é sonegação — a mesma lei que abre esta fase com corredor largo
  // para o jogador descobrir que o teto mata.
  //
  // ⚠️ `duto: true` FAZ DUAS COISAS: a parede COLA no corredor (deixa de sair da espessura) e ela
  // MORDE. A primeira é o conserto de 10/09 — sem ela o duto media 127px de banda aberta para um
  // corredor de 84, e a parede do teto ficava em 16,6px de média onde esta linha pede 54.
  { t: 68, type: 'moldura', espessura: 54, duto: true },
  { t: 69, type: 'wave', kind: 'batedor', count: 5, spacing: 0.28, y: 130 },

  // ─── AS TRÊS PORTAS. O duto deixa de ser uma passagem estreita e vira um LUGAR. ───
  //
  // ⚠️ ELAS SÃO O MOTIVO DE O DUTO TER 38s EM VEZ DE 11s. Uma porta chega em quem voa em ~3,5s;
  // três portas coladas viravam uma fila, e o duto que o teste jogado pediu precisa de espaço
  // entre elas para as ondas respirarem. A fase passa de 86s para 113s, autorizado em 10/09.
  //
  // ⚠️ O VÃO APERTA A CADA PORTA (84 → 76 → 68) e o HP SOBE (6 → 8 → 10). É a progressão que dá
  // começo, meio e fim ao duto — e é ela, não a duração, que faz o trecho ter forma.
  { t: 72, type: 'porta', hp: 6 },
  { t: 74, type: 'wave', kind: 'drone', count: 7, spacing: 0.22, y: 60 },
  { t: 78, type: 'corredor', rate: 1.7, gap: 76 },
  { t: 82, type: 'porta', hp: 8 },
  { t: 84, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.6, y: 110 },
  { t: 88, type: 'banner', text: 'ESFÍNCTER FINAL' },
  { t: 89, type: 'corredor', rate: 1.7, gap: 68 },
  { t: 94, type: 'porta', hp: 10 },

  // O PICO: o duto no seu mais fechado, e tudo junto. Menos volume que o pico da F2/F3 — aqui a
  // parede morde e cobra metade da atenção sozinha.
  { t: 97, type: 'wave', kind: 'batedor', count: 5, spacing: 0.28, y: 100 },
  { t: 100, type: 'wave', kind: 'drone', count: 7, spacing: 0.2, y: 90 },
  { t: 103, type: 'wave', kind: 'kamikaze', count: 3, spacing: 0.55, y: 120 },

  // Silêncio → o NÚCLEO. O mesmo telégrafo de todas as fases.
  { t: 106, type: 'corredor', rate: 0, gap: 0 },
  // A PAREDE RECUA NO SILÊNCIO. `RAMPA` é 8px/s, então 54→16 leva 4,75s: a abertura termina em
  // t≈110,75 e o chefão (t=113) luta numa arena EMOLDURADA, não dentro de um duto. O jogador VÊ a
  // parede abrir enquanto sai — é a recompensa de ter saído do duto com vida.
  //
  // ⚠️ `duto: false` é explícito, e tem de ser: sem ele a parede continuaria colada e mordendo
  // durante os 4,75s em que ainda está grossa, numa fase que já tirou o corredor do jogador.
  { t: 106, type: 'moldura', espessura: 16, duto: false },
  { t: 106.5, type: 'hazard', rate: 0, mix: [] },
  // A CÂMARA DO NÚCLEO. Entra no SILÊNCIO que o roteiro já fazia — a sala muda antes do
  // alarme tocar, então o jogador vê onde chegou antes de ser avisado do que vem.
  { t: 109, type: 'cenario', key: 'paintBgF4d' },
  { t: 109, type: 'banner', text: 'ALERTA · O NÚCLEO' },
  { t: 113, type: 'boss' },
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
  parallax?: 'superficie' | 'espaco' | 'nebulosa' | 'interior';
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
    // Vencer a serpente entrega o HANGAR DO LEVIATÃ (3ª cutscene): a nave sai danificada e é
    // engolida — e a cutscene entrega a Fase 4, que agora EXISTE (2026-07-19).
    next: 4,
    interlude: 'Interlude3',
  },
  4: {
    id: 4,
    name: 'O INTERIOR',
    script: STAGE_4,
    // Zero-G dentro do bicho (regra diegética intacta: vácuo → livre, SEM flap — decisão do
    // Henrique que REVERTEU o plano antigo de o flap voltar aqui).
    zone: 'vacuo',
    parallax: 'interior',
    music: 'stage1',
    // A FASE FINAL: não há próxima. Mas Vencer o NÚCLEO não cai direto na tela de fim:
    // entrega a CUTSCENE FINAL (O AFASTAMENTO — vitória amarga, 2026-07-20). É a
    // GameScene.victory quem honra a interlude mesmo com `next: null` — sem isso a
    // última cena da campanha seria inalcançável.
    next: null,
    interlude: 'Interlude4',
  },
};

/**
 * Executa o roteiro: dispara cada evento quando o relógio o alcança.
 * A fase é DADO, não código — balancear não pode exigir recompilar (docs/TECH.md).
 */
export class StageDirector {
  private next = 0;

  /**
   * ⚠️ O ROTEIRO TEM DE ESTAR EM ORDEM CRESCENTE DE `t`, E ISTO NÃO É ESTILO — É CORRETUDE. O
   * `update` caminha com um CURSOR MONOTÔNICO (`next`), então um evento fora de ordem não dispara
   * no instante que ele declara: dispara quando o cursor chega nele, ou seja, no `t` do vizinho
   * anterior. Ele fica escrito no roteiro com um número e acontece com outro.
   *
   * ⚠️ ESTE GUARD NASCEU DE UM DEFEITO REAL, em 10/09: o evento `{ t: 55, moldura 32 }` foi
   * inserido depois de um `{ t: 58, wave }`, e a parede só começava a engrossar em t=58. A sonda
   * passou VERDE — ela amostrava em t=60, e a rampa de 2s terminava justo a tempo. Quem pegou foi
   * uma CAPTURA de tela em t=58. Um assert de sonda não teria segurado isso; este segura, porque
   * falha na carga da fase e não depende de instante amostrado.
   *
   * Lança em vez de ordenar sozinho: ordenar em silêncio faria o roteiro rodar diferente do que
   * está escrito no arquivo, que é exatamente o defeito que se quer impedir.
   */
  constructor(private readonly script: StageEvent[]) {
    for (let i = 1; i < script.length; i++) {
      if (script[i].t < script[i - 1].t) {
        throw new Error(
          `Roteiro fora de ordem no índice ${i}: t=${script[i].t} (${script[i].type}) vem depois ` +
            `de t=${script[i - 1].t} (${script[i - 1].type}). O cursor de \`update\` é monotônico: ` +
            `este evento dispararia em t=${script[i - 1].t}, não em t=${script[i].t}.`,
        );
      }
    }
  }

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
