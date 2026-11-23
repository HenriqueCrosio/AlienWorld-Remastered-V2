import Phaser from 'phaser';
import { BARRA_CHEFAO_Y, COLORS, GAME_WIDTH } from '../config';
import type { StageBoss } from './Boss';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Fx } from '../systems/Fx';
import type { TerrainSystem } from '../systems/TerrainSystem';
import { Predador } from './Predador';
import { SerraGuardiao } from './SerraGuardiao';
import { afundarNaLava } from './fimDoPredador';
import { explosaoSangrenta, sangueNaTela } from './sangue';
import { Som } from '../som/Som';
import { CamadaCabos } from './guardiao/camadaCabos';
import { TRANCOS, deslocTranco, voltaElastica, xDaParada, type Tranco } from './guardiao/coleira';
import { LavaGuardiao, type PulsoDisparado } from './guardiao/lavaGuardiao';
import { angulosPulso, angulosSalva, miraSalva, proximaAcao, type AcaoGuardiao, type Ponto } from './guardiao/padroes';
import { CamadaSerpentes } from './guardiao/camadaSerpentes';
import type { ParamSerpente } from './guardiao/serpente';
import { CamadaBorda } from './guardiao/camadaBorda';
import { VAOS_Y, empurrar } from './guardiao/aperto';
import { TetoQueSangra } from './guardiao/tetoSangra';
import { SangueTeto } from './guardiao/sangueTeto';
import type { Moldura } from '../systems/Moldura';

/**
 * O CHEFÃO FINAL da Fase 4, em DUAS FORMAS (design do Henrique, 2026-07-19):
 *
 *   1. O GUARDIÃO (`guardiao.png`, arte criada POR ELE) — a besta blindada ENROLADA em volta
 *      da massa viva. Móvel: flutua, cospe glóbulos do bico e INVESTE telegrafado. A barriga
 *      vermelha é o alvo PERMANENTE — mas só quando ele está PARADO: em movimento, o corpo
 *      fecha inteiro. O ritmo dele é o do coração dito de outro jeito: mover = sístole.
 *   2. O PREDADOR (16/09, B3 — substitui o coração) — a casca morre numa explosão SANGRENTA e o
 *      que estava dentro dela SAI: urra, salta girando para a nave, e caça. Mora em `Predador.ts`;
 *      este arquivo fica com o guardião e a TROCA, e delega a luta da 2ª forma.
 *
 * ─── GEOMETRIA MEDIDA, NUNCA CHUTADA (lição 13; find-pad nos dois PNGs) ───
 *
 *  - GUARDIÃO (256×256, a arte nova de 15/09): massa vermelha em x=115..192, y=109..176
 *    (centroide ≈152,141 → offset +24,+13 do centro). Casca/bico à ESQUERDA na MESMA altura da
 *    massa — por isso o corpo-absorvedor cobre SÓ O DOMO SUPERIOR (a bala cruza o rebordo da
 *    casca sem morrer e cobra na massa; o mesmo pacto visual da faixa das cabeças da serpente).
 *  - PREDADOR: ver `Predador.MIOLO`.
 */
export class BossNucleo implements StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  /** O alvo vivo da forma atual (massa ou ferida). O teleguiado mira nele. */
  readonly targets: Phaser.Physics.Arcade.Sprite[];

  // Antes dos campos de instância que os usam (ordem de inicialização de classe).
  private static readonly HP_GUARDIAO = 90;
  private static readonly HP_TOTAL = BossNucleo.HP_GUARDIAO + Predador.HP;
  /** Do estouro final até a cutscene: o corpo no chão, o piso rachando e a lava subindo (ver `fimDoPredador`). */
  static readonly CORPO_FICA_MS = 4200;

  /** Lida pela sonda (`probe-stage4`). */
  forma: 'guardiao' | 'predador' = 'guardiao';
  private hpGuardiao = BossNucleo.HP_GUARDIAO;
  /** A 2ª forma, depois da troca. A sonda lê o estado dela por aqui. */
  predador: Predador | null = null;
  /** O estouro grande da troca (ver a fumaça em `trocarParaPredador`). */
  private estouro: Phaser.GameObjects.Sprite | null = null;
  /** A arma trava desde a vida do guardião zerar — antes de o predador existir. */
  private travaTroca = false;
  private dead = false;
  private entering = true;
  private trocando = false;
  private t = 0;

  /** Guardião: máquina de estados do movimento. Parado = vulnerável; movendo = fechado. */
  private acao: 'flutua' | 'telegrafo' | 'investe' | 'tranco' | 'segura' | 'volta' | 'serra' | 'serpentes' | 'aperto' | 'teto' = 'flutua';
  private acaoT = 0;
  private cdTiro = 0;
  /**
   * As duas skills se ALTERNAM (spec de 19/09). A investida empurra o jogador para as bordas; a salva
   * torna a borda cara; a serra é a ameaça de caminho fixo E a janela de dano. A dificuldade mora na
   * tensão entre elas, não em cada uma ficar mais rápida.
   * ⚠️ 23/11: o RODÍZIO por degrau (`proximaAcao`, spec 2026-11-22 §8) — de 66% em diante entram as serpentes.
   */
  private proxima: AcaoGuardiao = 'serra';
  /** os cabos-serpente (spec 2026-11-22 §6): lidos pelos testes e pelo filme (`serpentes.lista`) */
  private readonly serpentes: CamadaSerpentes;
  /**
   * a BORDA VIVA (spec 2026-11-22 §7): a faixa redesenhada coluna a coluna — o aperto (passo 4) e o teto que sangra (passo
   * 5); lida pelos testes e pelo filme
   */
  private readonly borda: CamadaBorda;
  /** o teto que sangra em curso (o passo 5) e as gotas dele (lidos pelos testes e pelo filme) */
  private teto: TetoQueSangra | null = null;
  private readonly sangue: SangueTeto;
  /** o bombear de cada onda do teto: os cabos dão um tranco curto quando as gotas soltam */
  private static readonly TETO_BOMBEIA = 4;
  /** quantos apertos já houve: o vão alterna alto/baixo (`VAOS_Y`) */
  private vezAperto = 0;
  /** a caixa da nave (`GameScene.HITBOX_NAVE`): é ela que a parede do aperto empurra */
  private static readonly CAIXA_NAVE = { w: 21, h: 9 };
  /** a nave encostou na borda TORCIDA neste quadro (lido e zerado pelo `morde`) */
  private mordeuAperto = false;
  /** o puxão do aviso do aperto: os cabos esticam e vibram forte */
  private static readonly APERTO_PUXAO = 9;
  /**
   * ─── OS CABOS-SERPENTE (23/11, o passo 3) ───
   * ⚠️ O DESENHO DELE (23/11, por cima da 1ª rodada, que corria pela borda até a nave — recusada): *"as serpentes saem do
   * próprio guardião"* — num ARCO LARGO, a de cima sobe quase até o teto e desce, a de baixo desce quase até o chão e
   * sobe, e as cabeças ficam POSTADAS À FRENTE DELE. Medido no desenho (na tela de 384×216): a de cima sai do alto do domo
   * (a raiz do recorte em (7, −73) do PNG ≈ (303, 53) na tela), o topo do arco em y ≈ 30, a cabeça em (183, 54); a de baixo
   * sai de baixo da carcaça (ver `RAIZ_BAIXO`), o fundo do arco em y ≈ 182, a cabeça em (178, 128).
   * `c1` é o 1º controle da cúbica (calculado para o topo/fundo do arco cair onde o desenho mostra); o 2º fica 40 px
   * atrás do posto, NA ALTURA DELE: o arco chega ao posto na HORIZONTAL, apontado para a esquerda — o traço final do
   * desenho dele —, e a cabeça nunca precisa dar meia-volta para mirar a nave (chegando de baixo para cima, a de baixo
   * virava um grampo com a nave lá embaixo: medido, `_dobra.mjs`).
   * ⚠️ 23/11 AS RESPOSTAS DELE: a cabeça fica (a ponta afilada da corda); o tom fica (75 %); NADA de 3ª serpente — no
   * último degrau são as MESMAS duas com mais botes (*"duas com mais botes, dois botes cada fica bom"*): 2 por serpente
   * aos 66–33 % e 3 aos 33–0 % (o 3 é decisão minha, perguntada na folha); o ensaio 1,1 s com 2 fintas e 0,7 s com 1.
   */
  private static readonly RAIZ_ALTO = { x: 7, y: -73 };
  /**
   * ⚠️ 23/11, duas correções dele: *"a serpente de baixo sai do nada"* e, de novo, *"quero que ela saia de trás do
   * guardião, como eu disse"*. A 1ª raiz, (72, 68) = (200, 196) do PNG, caía num pixel TRANSPARENTE; a 2ª, (84, 67) =
   * (212, 195), na faixa de tentáculos — opaca, mas escura como o fundo, e a corda ainda lia nascendo no vazio. O traço
   * dele sobe da corda até (332, 148) na tela = (183, 185) do PNG: a BORDA DE BAIXO DA CARCAÇA, entre os pingos do miolo
   * e os tentáculos. Agora a raiz é (58, 40) = (186, 168), DENTRO da carcaça (opaca em todos os 9 quadros de y 160 a
   * 182 nessa coluna); a corda desce escondida atrás dela e APARECE saindo de baixo da borda, em y ≈ 184 do PNG.
   */
  private static readonly RAIZ_BAIXO = { x: 58, y: 40 };
  private static readonly SERPENTE_CIMA = { posto: { x: 183, y: 54 }, c1: { x: 245, y: -2 } };
  // c1 logo abaixo da raiz: a corda sai da carcaça DESCENDO, na vertical, antes de varrer o chão para a esquerda
  private static readonly SERPENTE_BAIXO = { posto: { x: 178, y: 128 }, c1: { x: 330, y: 240 } };
  private static readonly SERPENTES: { raiz: Ponto; posto: Ponto; c1: Ponto; atraso: number }[][] = [
    [
      { raiz: BossNucleo.RAIZ_ALTO, ...BossNucleo.SERPENTE_CIMA, atraso: 0.3 },
      { raiz: BossNucleo.RAIZ_BAIXO, ...BossNucleo.SERPENTE_BAIXO, atraso: 0.8 },
    ],
    [
      { raiz: BossNucleo.RAIZ_ALTO, ...BossNucleo.SERPENTE_CIMA, atraso: 0.3 },
      { raiz: BossNucleo.RAIZ_BAIXO, ...BossNucleo.SERPENTE_BAIXO, atraso: 0.6 },
    ],
  ];
  private static readonly SERPENTE_BOTES = [2, 2];
  /**
   * ⚠️ 23/11 (ele: *"antes das serpentes saírem, o guardião e os cabos estão balançando como devem ser, mas depois que
   * saem, os cabos ficam presos e o guardião continua se movendo menos — quero que os cabos acompanhem essa reduzida de
   * movimento, mas continuem acompanhando o guardião"*): nas serpentes ele NÃO para — segue flutuando com o balanço
   * REDUZIDO a esta fração (16 px → ~5), a amplitude descendo e voltando suave; e as raízes das serpentes vão junto
   * com o corpo (`Serpente.desvio`), antes pregadas onde ele estava quando elas saíram.
   */
  private static readonly SERPENTE_BALANCO = 0.35;
  /** a amplitude do balanço do flutuar (1 = os 16 px de sempre), descendo nas serpentes */
  private ampBalanco = 1;
  /** onde o corpo estava quando as serpentes saíram (o `desvio` delas é o quanto ele andou desde então) */
  private origemSerpentes: Ponto | null = null;
  private static readonly SERPENTE_ENSAIO = [1.1, 0.7];
  private static readonly SERPENTE_FINTAS = [2, 1];
  private serra: SerraGuardiao | null = null;
  /**
   * O que FERE por contato mas NÃO é alvo: a serra. Fica num grupo próprio justamente porque ninguém
   * registra as balas do jogador contra ele — é o que mantém a linha de tiro limpa na cravada.
   * A cena liga o `overlap` com a nave em `spawnBoss` (ver `StageBoss.perigos`).
   */
  readonly perigos: Phaser.Physics.Arcade.Group;

  private readonly core: Phaser.Physics.Arcade.Sprite;
  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly bar: Phaser.GameObjects.Rectangle;
  private readonly glow: Phaser.GameObjects.Particles.ParticleEmitter;
  /**
   * O rastro dos glóbulos: UM emissor de cada família para TODOS eles (armadilha nº 5 — nunca um
   * emissor por bala). Quem decide de quem é o rastro é a TEXTURA do projétil, lida no laço: só a
   * `globuloGuardiao` deixa fumaça, e a bala volta limpa para o pool sozinha.
   */
  private readonly fumaca: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly brasa: Phaser.GameObjects.Particles.ParticleEmitter;
  /** A carga do telégrafo: o anel que FECHA no miolo antes da investida. */
  private readonly carga: Phaser.GameObjects.Particles.ParticleEmitter;
  private cargaT = 0;
  /**
   * A mira da investida DEPOIS da trava — `null` enquanto ele ainda lê a nave. É o campo que torna a
   * jogada dele possível: a partir da trava, mexer a nave não move mais a investida.
   * ⚠️ Lido pela sonda e pela captura (`_f4/_ver-aviso.mjs`): "travado" é estado, não é aparência.
   */
  private vyTravado: number | null = null;
  private recuoT = 0;

  /**
   * ─── A COLEIRA (22/11, spec 2026-11-22-guardiao-coleira-design.md) ───
   * Ele: *"como se fosse um cachorro raivoso que vai atacar e é travado por uma coleira presa"*. Os cabos do alto saíram
   * do desenho e viraram CORDAS presas ao teto (`entities/guardiao/`): a investida vai até a primeira chegar ao máximo,
   * e aí o TRANCO — o corpo passa um pouco, a corda o segura, e os cabos o recolhem até a estação. A investida não
   * termina mais atrás da nave: termina no meio.
   */
  private readonly cabos: CamadaCabos;
  /** a lava do miolo: os pulsos do tranco (spec 2026-11-22 §5) */
  private readonly lava: LavaGuardiao;
  /**
   * ─── OS PULSOS ALTERNADOS (22/11, a escolha dele) ───
   * Ele: *"eu priorizo muito a perspectiva de bullet hell, ou seja, são formatos mais geométricos que induzem o jogador a
   * ler o ataque, cobra quem demora ou não percebe o padrão"*. O leque com UM vão sorteado (o passo 2, rodada 1) era só
   * reação: saiu. No tranco a lava sai em PULSOS de raios retos e ângulos fixos (`angulosPulso`): A (7), B (8, meio
   * passo, nos vãos do A), A… Com 10° de passo nenhum ponto parado da metade esquerda escapa dos dois pulsos, e na
   * coluna da nave (x ≈ 40–80) o vão livre é de 11–18 px (a nave tem 9). Perto do Guardião os raios se fecham num muro.
   *
   * ⚠️ ELE SEGURA NA PARADA enquanto os pulsos saem (a escolha dele, entre SEGURA e RECUA, no GIF lado a lado): com a
   * fonte recuando, os arcos deixavam de ser concêntricos e às vezes abria um ponto parado seguro (MEDIDO: a nave parada
   * levou lava nas 2 investidas segurando, em 1 só recuando). Cada pulso depois do 1º é um mini-tranco na corda tensa.
   *
   * ⚠️ A VELOCIDADE É A DELE, jogando: 200 px/s e 0,3 s entre pulsos *"está bem rápido"*; com `?lavaVel=160&lavaEntre=0.4`,
   * *"achei mais interessante as duas juntas"*. O ÚLTIMO DEGRAU É IGUAL AOS OUTROS (23/11, ele): *"tem que manter igual
   * aos outros, exatamente por conta da dificuldade da parede. Mesmo do jeito que está hoje, está difícil desviar"* — o
   * 190 px/s · 0,32 s (a proporção de antes, decisão minha) saiu; o aperto do fim vem do passo 4/5, não da lava.
   * ⚠️ E O BOLSÃO COLADO NELE FICA (23/11, ele): de x ≈ 90 em diante os cantos da tela ficam fora da figura de 7 raios,
   * *"é muito arriscado ir para esse spot pequeno"* — não abrir para 9 raios.
   */
  private static readonly LAVA_PULSOS = [2, 3, 3];
  private static readonly LAVA_RAIOS = 7;
  private static readonly LAVA_PASSO = 10;
  private static readonly LAVA_VEL = [160, 160, 160];
  private static readonly LAVA_ENTRE = [0.4, 0.4, 0.4];
  /** quanto ele segura na parada depois do último pulso, antes da volta (s) */
  private static readonly SEGURA_FIM = 0.15;
  /** o mini-tranco de cada pulso, segurando: a corda já tensa dá um solavanco */
  private static readonly MINI_TRANCO: Tranco = { passa: 1.5, volta: 0.1, vibra: 3, tremor: 0.002, molas: 0 };
  private readonly lavaVel: number[];
  private readonly lavaEntre: number[];
  private pulsoK = 0;
  private pulsoT = 0;
  private miniT = 1;
  /** o último pulso (lido pelo teste e pelo filme) */
  get ultimoPulso(): PulsoDisparado | null {
    return this.lava.ultimoPulso;
  }
  /** o tranco em uso — `?tranco=A|B|C` na URL (A seco · B elástico · C vibrante), para comparar; padrão A */
  private readonly tranco: Tranco;
  private parada = { x: 0, y: 0 };
  private trancoT = 0;
  /** a parada de referência, na altura da base: o centro do corpo aqui deixa o focinho a ~1/3 da tela */
  static readonly X_PARADA = 200;
  /** a volta puxada pelos cabos (s) */
  private static readonly VOLTA_S = 0.8;

  // ─── Guardião (256×256 a escala 0.7 ≈ 179×179) ───
  private static readonly G_ESCALA = 0.7;
  private static readonly G_STATION_X = GAME_WIDTH - 86;
  private static readonly G_BASE_Y = 104;
  /**
   * Centro da massa vermelha, em px do PNG a partir do centro do sprite (medido,
   * `scripts/_f4/_medir-guardiao.mjs`).
   *
   * ⚠️ E AGORA ELE VALE DURANTE A RESPIRAÇÃO TAMBÉM. A arte antiga tinha o estático em 256×227 e a
   * sheet em 256² alinhada no topo: com a sheet tocando (o tempo todo), o centro do quadro descia
   * 14,5px e o +31 medido no estático punha o alvo ~10px de tela ABAIXO do miolo desenhado. A arte
   * nova sai toda no mesmo quadro.
   */
  private static readonly G_CORE_OFF_X = 24;
  private static readonly G_CORE_OFF_Y = 13;
  /**
   * O bico (a boca dos glóbulos): a ponta do gancho da cabeça, em (34,172) do PNG.
   *
   * ⚠️ O ANTIGO (−100,−20) ERA "A OLHO" E CAÍA NO VAZIO: 64px acima da cabeça, fora do casco. O leque
   * saía do ar. Este ponto é medido, e baixa a origem dos glóbulos ~45px na tela.
   */
  private static readonly G_MUZZLE_X = -94;
  private static readonly G_MUZZLE_Y = 44;
  /** A morte na troca: 9 quadros a 9 q/s, o destruído, e o coração surge. Ver `trocarParaPredador`. */
  private static readonly MORTE_MS = 1000;
  private static readonly TROCA_MS = 1500;
  /**
   * ─── O RITMO, POR DEGRAU DE VIDA (19/09) ───
   * Mesma gramática do predador (66% e 33%), por consistência. **Nada de novo aparece nos degraus: o que
   * muda é o ritmo.** Os três ataques existem desde 100% — a serra precisa estar lá desde o começo,
   * porque é dela que sai a janela de dano.
   */
  private static readonly DEGRAUS = [0.66, 0.33];
  /** A pausa entre skills, por degrau. Era 6s fixos — e 6s de risco zero eram metade da queixa dele. */
  private static readonly PAUSA = [4.2, 3.4, 2.6];
  /** Quantos glóbulos por salva, por degrau. */
  private static readonly SALVA_N = [3, 4, 5];
  /** Quantas cravadas a serra dá antes de sair, por degrau. No último ela fica mais tempo na arena. */
  private static readonly SERRA_CRAVADAS = [2, 2, 3];
  /**
   * ⚠️ 0,55 → 0,7 (20/09). O aviso não era curto de mais para DESVIAR — era curto de mais para ser
   * LIDO: *"o aviso, que é a aceleração do core do guardião, precisa estar mais distinta"*. A
   * aceleração da respiração precisa de ~0,7s para subir de 1× a 5× e o olho perceber que subiu.
   * Voltar é um número: 0,55 devolve a janela antiga sem desfazer a linguagem nova.
   *
   * ⚠️ 0,7 → 1,15 (20/09, o 7º teste) — e desta vez a razão é MECÂNICA, não leitura: *"preciso que
   * aumente o tempo de carga para a investida, assim o jogador consegue usar a mecânica que citei:
   * esperar até o último segundo de carregamento para travar o boss numa direção e ter tempo de
   * desviar para os cantos"*. ⚠️ Alongar SOZINHO não entregava a mecânica — ver `TELEG_TRAVA`.
   */
  private static readonly TELEGRAFO_DUR = 1.15;
  /**
   * ─── ONDE A INVESTIDA TRAVA A MIRA (20/09) ───
   *
   * ⚠️ A MIRA ERA TOMADA NO INSTANTE DO ARRANQUE, e é por isso que esticar o telégrafo não bastava: o
   * guardião lia a altura da nave no MESMO quadro em que saía, então *atrair a investida para um lado e
   * depois desviar* não existia como jogada — não havia instante em que ele estivesse comprometido e
   * ainda parado. Mais carga só dava mais tempo de esperar pela mesma armadilha.
   *
   * Agora o telégrafo tem DOIS tempos: até `TELEG_TRAVA` ele carrega e ainda lê a nave; dali em diante a
   * mira está CRAVADA (`vyTravado`) e o resto da carga é a janela de fuga. MEDIDO
   * (`scripts/_f4/_medir-investida.mjs`), com 1,15s e a trava em 0,62: **450ms de desvio antes do
   * arranque**, que somados aos 760ms de travessia dão **1210ms** contra os 760ms de antes. A 110px/s
   * do `FreeController` são **133px** de deslocamento contra 83px — num vão de 160px com um corpo de
   * 133px, é a diferença entre *dá se for perfeito* e uma mecânica.
   *
   * ⚠️ A sonda não confia na aparência: ela põe a nave em y=170 (que dá vy +70), espera a trava,
   * TELEPORTA a nave para y=40 (que daria vy −70) e confere que o arranque saiu com +70. Mira travada
   * é comportamento, e comportamento se prova com um discriminador, não com uma foto bonita.
   */
  private static readonly TELEG_TRAVA = 0.62;
  /** O recuo da trava: ele puxa para trás antes de saltar. É o sinal, no corpo, de que a mira FECHOU. */
  private static readonly RECUO_VEL = 45;
  private static readonly RECUO_MS = 0.18;
  /** A respiração acelera de 1× até este fator — e CRAVA no máximo a partir da trava. */
  private static readonly TELEG_RESPIRO = 5;
  /** O tint do casco no telégrafo: FRIO. É o contrário do flash de dano (0xffb090), e é o ponto. */
  private static readonly CASCO_FRIO = 0x7a8290;
  /** O raio do anel de carga em volta do miolo: abre em `CARGA_R0` e FECHA em `CARGA_R1`. */
  private static readonly CARGA_R0 = 26;
  private static readonly CARGA_R1 = 4;
  /**
   * O intervalo entre sopros da carga, do começo (lento) ao fim (jorro).
   *
   * ⚠️ MEDIDO na captura, e o intervalo sozinho não resolveu: com 70→22ms o anel fechava com 6
   * partículas vivas no pico, e apertar para 55→16 deu 7 — a vida de 240ms limita o acúmulo, não o
   * intervalo. Por isso a METADE FINAL solta DOIS sopros por batida (ver o `case 'telegrafo'`): 14
   * vivas no fim, e a densidade dobra exatamente onde o aviso precisa gritar.
   */
  private static readonly CARGA_MS0 = 55;
  private static readonly CARGA_MS1 = 16;
  /**
   * DEPOIS da trava a carga SEGURA — não continua subindo.
   *
   * ⚠️ MEDIDO: mantendo o ritmo da carga (16ms, dois por batida) no raio mínimo, chegavam **30
   * partículas vivas** empilhadas no mesmo pixel e o ADD saturava em BRANCO no miolo. Branco não existe
   * nesta arte. Um sopro por batida a 26ms, com o raio abrindo de leve, assenta em 7–9 vivas: brasa acesa e
   * segura, que é o que "carregado e comprometido" precisa dizer.
   */
  private static readonly CARGA_MS_TRAVA = 26;
  /**
   * ─── O RASTRO DO GLÓBULO (20/09) ───
   * *"pode gerar um efeito de rastro do projétil, como fumaça ou algo incandescente"*. São as duas
   * coisas: uma BRASA que esfria (a espinha do rastro) e uma FUMAÇA quente em volta dela.
   *
   * ⚠️ A 1ª TENTATIVA FOI MEDIDA E DESCARTADA: fumaça na CROSTA FRIA da escória (0x24343c/0x1c292d,
   * blend NORMAL, as cores mais claras do próprio PNG) some por completo no fundo — a pintura da
   * arena é vermelho escuro de luminância parecida, e cinza-azulado a 50% em cima dela não tem
   * contraste nenhum. A lei do dark sci-fi diz *luz só onde há energia*, e o glóbulo É energia: a
   * saída não é clarear o rastro, é fazê-lo QUENTE e curto. A fumaça vira ADD com tom baixo
   * (0x3a241c/0x2a1a16) — acrescenta calor, não clarão — e a brasa passa a sair quase todo sopro.
   */
  /**
   * ⚠️ O ESPAÇAMENTO É O QUE FAZ O RASTRO SER RASTRO. Com 0,034s (um sopro a cada 2 quadros) e 150px/s
   * a brasa nascia a cada ~7px e a captura mostrou uma FILEIRA DE PONTOS, não uma esteira: com 130–220ms
   * de vida, só 3 brasas ficavam vivas por glóbulo. Um sopro POR QUADRO põe a brasa a cada ~2,5px e
   * mantém 8–10 vivas — aí o rastro tem corpo e afina para trás sozinho, pela escala e pelo alpha.
   */
  private static readonly RASTRO_MS = 0.016;
  /** Chance de um sopro também soltar brasa. É a espinha do rastro: abaixo de ~0,6 vira ponto solto. */
  private static readonly RASTRO_BRASA = 0.8;
  /**
   * ⚠️ A SALVA COBRE AS BORDAS, e é de propósito. A investida empurra o jogador para o canto (medido:
   * o casco de 133px deixa ~20px de folga num vão de 160px), e no canto não acontecia nada — por isso
   * os dois ataques eram fáceis SEPARADAMENTE. Abrindo o leque, o canto passa a ter preço.
   */
  private static readonly SALVA_ABRE = 96;
  /**
   * ⚠️ E ELA PRECISA SER MAIS RÁPIDA QUE A NAVE. Os 100px/s antigos perdiam para os 110px/s do
   * `FreeController`: dava para simplesmente andar para longe do tiro. Projétil mais lento que quem
   * desvia não é ameaça — era a outra metade do *"os 3 tiros dele são muito fáceis"*.
   */
  private static readonly SALVA_VEL = 150;
  /** Cravada = ele segurando o cabo, ancorado e em esforço: o dano dobra, como a recuperação do predador. */
  private static readonly DANO_CRAVADA = 2;
  /**
   * A boca do cabo da serra, em px do PNG a partir do centro.
   *
   * ⚠️ NASCE ABAIXO DO CENTRO, e é medida de propósito. O feixe de cabos dele sai por CIMA, e foi de lá
   * que a primeira versão lançou: com a âncora em y≈72 e a borda de cima em 48, a primeira diagonal virou
   * um TOCO de 47px — ele mal soltava a serra e ela já cravava. Saindo por baixo, a subida tem ~70px de
   * altura e a coreografia que ele desenhou (sobe, crava, desce, crava) ganha espaço para ser lida.
   */
  private static readonly G_CABO_X = 40;
  private static readonly G_CABO_Y = 20;
  /** O vão jogável da arena — as bordas em que a serra crava. */
  private static readonly ARENA_TOPO = 30;
  private static readonly ARENA_BASE = 190;

  private static readonly ENTRY_SPEED = 40;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    // O terreno era das PAREDES do coração; o predador não usa. Fica na assinatura da cena.
    _terrain: TerrainSystem,
    private readonly fx: Fx,
    moldura?: Moldura,
  ) {
    this.sprite = scene.physics.add.sprite(GAME_WIDTH + 120, BossNucleo.G_BASE_Y, 'guardiao');
    this.sprite.setScale(BossNucleo.G_ESCALA);
    this.sprite.setData('boss', this);
    this.cabos = new CamadaCabos(
      scene,
      BossNucleo.G_ESCALA,
      { x: BossNucleo.G_STATION_X, y: BossNucleo.G_BASE_Y },
      { x: BossNucleo.X_PARADA, y: BossNucleo.G_BASE_Y },
    );
    this.lava = new LavaGuardiao(scene, enemies, BossNucleo.ARENA_TOPO, BossNucleo.ARENA_BASE);
    const qTranco = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('tranco') : null;
    this.tranco = TRANCOS[qTranco === 'B' || qTranco === 'C' ? qTranco : 'A'];
    const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    // para calibrar jogando (22/11): `?lavaVel=160` (px/s, todos os degraus) e `?lavaEntre=0.4` (s entre pulsos)
    const qVel = Number(q?.get('lavaVel'));
    const qEntre = Number(q?.get('lavaEntre'));
    this.lavaVel = qVel > 0 ? [qVel, qVel, qVel] : BossNucleo.LAVA_VEL;
    this.lavaEntre = qEntre > 0 ? [qEntre, qEntre, qEntre] : BossNucleo.LAVA_ENTRE;

    // O GUARDIÃO RESPIRA (sheet do PixelLab): a massa vermelha pulsa como um coração — mover =
    // sístole, e até parado ele é órgão vivo. Sem a sheet, o estático segura a luta (arte entra
    // asset por asset). Yoyo: o pulso vai E VOLTA sem corte. A âncora não precisa de compensação:
    // a arte do guardião sai toda no mesmo quadro de 256² (ver `G_CORE_OFF_X`).
    const anims = scene.anims;
    if (scene.textures.exists('guardiaoMorteSheet') && !anims.exists('guardiao-morte')) {
      anims.create({
        key: 'guardiao-morte',
        frames: anims.generateFrameNumbers('guardiaoMorteSheet', { start: 0, end: 8 }),
        frameRate: 9000 / BossNucleo.MORTE_MS,
        repeat: 0,
      });
    }
    if (scene.textures.exists('guardiaoIdleSheet') && !anims.exists('guardiao-idle')) {
      anims.create({
        key: 'guardiao-idle',
        frames: anims.generateFrameNumbers('guardiaoIdleSheet', { start: 0, end: 8 }),
        frameRate: 6,
        repeat: -1,
        yoyo: true,
      });
    }
    if (anims.exists('guardiao-idle')) this.sprite.play('guardiao-idle');

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.corpoDomo();
    body.setVelocityX(-BossNucleo.ENTRY_SPEED);

    this.core = scene.physics.add.sprite(this.sprite.x, this.sprite.y, 'spark');
    this.core.setVisible(false);
    const coreBody = this.core.body as Phaser.Physics.Arcade.Body;
    coreBody.setAllowGravity(false);
    // A massa medida (78×68 no PNG) na escala 0,7.
    coreBody.setSize(54, 48);
    this.targets = [this.core];

    this.glow = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 260, max: 480 },
        speed: { min: 4, max: 18 },
        scale: { start: 0.9, end: 1.9 },
        alpha: { start: 0.55, end: 0 },
        tint: [0xffa040, 0xff6a2a, 0xffd447],
        blendMode: 'ADD',
        frequency: 85,
        emitting: false,
      })
      .setDepth(51);

    // ─── O rastro do glóbulo (ver `RASTRO_MS`) ───
    // A FUMAÇA: ADD com tom BAIXO (não é o mesmo que ADD com tom claro — somar 0x3a241c acrescenta
    // um véu de calor, não um clarão). Ela cresce e apaga: 280ms a 150px/s ≈ 42px de esteira, que é
    // comprimento de munição. Cometa é assinatura de chefão, e o glóbulo não é o chefão.
    this.fumaca = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 220, max: 340 },
        speed: { min: 2, max: 14 },
        scale: { start: 0.6, end: 1.8 },
        alpha: { start: 0.85, end: 0 },
        tint: [0x4a2e22, 0x3a241c, 0x2a1a16],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(19);
    // A BRASA é a luz — e é a espinha do rastro. Curta (160ms ≈ 24px) e apertada, para ler como
    // material incandescente desprendendo da crosta, não como chama.
    this.brasa = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 130, max: 220 },
        speed: { min: 2, max: 16 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.95, end: 0 },
        tint: [0xfc9a04, 0xf46b02, 0xec3c05],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(20);

    // A CARGA do telégrafo. Ao contrário do `glow` (que CRESCE e se espalha: o bicho respirando), a
    // partícula da carga ENCOLHE — e o anel de onde ela nasce fecha no miolo. É matéria sendo puxada
    // para dentro, o oposto visual da respiração, e é por isso que o aviso não se confunde com ela.
    this.carga = scene.add
      .particles(0, 0, 'puff', {
        lifespan: 240,
        speed: { min: 0, max: 8 },
        scale: { start: 1.3, end: 0.2 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xffd447, 0xff8a2a, 0xff4a10],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(52);

    // ⚠️ `allowGravity: false`: a serra anda pela própria coreografia, não pela física da cena.
    this.perigos = scene.physics.add.group({ allowGravity: false });
    SerraGuardiao.registrarAnims(scene);
    this.serpentes = new CamadaSerpentes(scene, this.perigos, BossNucleo.G_ESCALA);
    this.borda = new CamadaBorda(scene, moldura ?? null);
    this.sangue = new SangueTeto(scene, this.perigos);

    this.barBg = scene.add
      .rectangle(GAME_WIDTH / 2, BARRA_CHEFAO_Y, 160, 4, COLORS.enemyDark)
      .setDepth(100);
    this.bar = scene.add
      .rectangle(GAME_WIDTH / 2 - 80, BARRA_CHEFAO_Y, 160, 4, COLORS.enemyBright)
      .setOrigin(0, 0.5)
      .setDepth(101);

    this.acaoT = BossNucleo.pausa(1);
    this.cdTiro = 1.4;
  }

  /** 0, 1 ou 2 — o degrau de vida em que a luta está. Lido pela sonda. */
  get degrau(): number {
    const k = this.hpGuardiao / BossNucleo.HP_GUARDIAO;
    return k > BossNucleo.DEGRAUS[0] ? 0 : k > BossNucleo.DEGRAUS[1] ? 1 : 2;
  }

  /** A pausa entre skills no degrau atual. `pausa(1)` serve ao construtor, antes de haver vida lida. */
  private static pausa(d: number): number {
    return BossNucleo.PAUSA[d];
  }

  /** A serra está cravada: ele segura o cabo, ancorado, e o dano dobra. */
  get segurandoCabo(): boolean {
    return this.serra?.cravada === true;
  }

  get isDead(): boolean {
    return this.dead;
  }

  /**
   * Os DESTROÇOS (27/10): as duas formas têm as mortes aprovadas e só levam as mordidas. O guardião perde pedaços da
   * casca (as folhas da respiração e da morte têm a casca no mesmo lugar do quadro: os buracos vão até o destruído). O
   * predador é OUTRA arte no mesmo sprite (`forma`): as cicatrizes do guardião saem na troca, e as dele não furam
   * (`CHEFOES`: ele anda, golpeia e se pendura no teto — o buraco ficaria no lugar errado do corpo).
   */
  get destrocos(): { quem: string; vida: number; forma: string; mira?: { x: number; y: number }[] } {
    if (this.predador) return { quem: 'predador', vida: this.predador.hp / Predador.HP, forma: 'predador' };
    const s = this.sprite, w = s.displayWidth, h = s.displayHeight;
    return {
      quem: 'guardiao',
      vida: this.hpGuardiao / BossNucleo.HP_GUARDIAO,
      forma: 'guardiao',
      mira: BossNucleo.MIRAS.map((m) => ({ x: s.x + m.x * w, y: s.y + m.y * h })),
    };
  }

  /**
   * ONDE OS PEDAÇOS GRANDES SAEM do guardião (27/10, ele: *"a primeira lasca que sai dele é a cabeça, fica estranho por
   * que a cabeça tem muito detalhe, o que podem sair são os tubos de cima, pedaços de outras partes"*): do lado da nave
   * a mordida caía na cara. Em rodízio: os tubos de cima, os tubos do alto à direita, os tentáculos de baixo à direita
   * — em fração do quadro desenhado, a partir do centro (medidos na grade do `guardiao-idle-sheet`, 256²: (124, 44),
   * (186, 62), (200, 196)).
   */
  private static readonly MIRAS = [
    { x: -0.016, y: -0.33 },
    { x: 0.227, y: -0.258 },
    { x: 0.281, y: 0.266 },
  ];

  get armaTravada(): boolean {
    return this.travaTroca || (this.predador?.armaTravada ?? false);
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /** Corpo = só o DOMO superior: a faixa do alvo fica de corredor livre para a bala. */
  private corpoDomo(): void {
    // Dimensões CONSTANTES, em px do quadro de 256² (não `sprite.width/height`, que muda com a textura).
    // ⚠️ O DOMO ACABA ONDE A MASSA COMEÇA (y=109 no PNG): y=14..109, x=28..228. Mais baixo e ele
    // comeria o topo do alvo — a bala morreria no casco em cima do miolo aceso.
    this.body.setSize(200, 95);
    this.body.setOffset(28, 14);
  }

  /** Corpo INTEIRO: a investida é toda perigo — e fecha o alvo (bala morre no casco). */
  private corpoInteiro(): void {
    // O casco inteiro do quadro de 256² (x=27..255, y=0..249), sem as pontas dos tentáculos.
    this.body.setSize(210, 190);
    this.body.setOffset(23, 18);
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    // ANTES de qualquer saída antecipada: os glóbulos no ar continuam sendo glóbulos depois que o
    // guardião morre (a salva sobrevive à troca por ~2s), e um rastro que corta no meio se denuncia.
    this.rastroGlobulos(dt);
    // os cabos seguem o corpo SEMPRE (na entrada, na troca, arrebentados na morte)
    this.cabos.atualizar(dt, this.sprite);
    // a lava no ar segue caindo depois da morte, como os glóbulos
    this.lava.atualizar(dt);
    // as serpentes (na troca elas arrebentam e a camada apaga)
    const o = this.origemSerpentes;
    this.serpentes.atualizar(dt, target, o ? { x: this.sprite.x - o.x, y: this.sprite.y - o.y } : undefined);
    // a borda viva (o aperto, o teto que sangra): deformada, e onde ela está torcida MORDE e empurra a nave para fora
    this.borda.atualizar(dt);
    if (!this.borda.terminou) this.empurrarNave(target);
    // o teto que sangra: o pulso nos cabos, as gotas penduradas esticando, as que soltam; as no ar caem até depois da morte
    const ts = this.teto;
    if (ts) {
      this.cabos.pulso(ts.pulsoCabos);
      if (ts.quedas.length) {
        for (const q of ts.quedas) this.sangue.soltar(q.x, this.borda.tetoEm(q.x));
        this.cabos.golpe(BossNucleo.TETO_BOMBEIA);
      }
      this.sangue.pendurar(ts.penduradas(), (x) => this.borda.tetoEm(x));
    }
    this.sangue.atualizar((x) => this.borda.chaoEm(x));

    // O predador roda até DEPOIS de morto (a luz apaga, o breu sai, a lava no ar segue caindo).
    if (this.predador) {
      this.predador.update(dt, target);
      return;
    }
    if (this.dead || this.trocando) return;

    if (this.entering) {
      const alvo = BossNucleo.G_STATION_X;
      this.posicionarCore();
      if (this.sprite.x > alvo) return;
      this.body.setVelocityX(0);
      this.entering = false;
    }

    this.t += dt;

    this.updateGuardiao(dt, target);

    this.posicionarCore();
  }

  // ─── FORMA 1: o guardião ───────────────────────────────────────────────────

  private updateGuardiao(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    this.acaoT -= dt;

    switch (this.acao) {
      case 'flutua': {
        this.ampBalanco = Math.min(1, this.ampBalanco + dt * 1.5);
        const alvoY = BossNucleo.G_BASE_Y + Math.sin(this.t * 0.7) * 16 * this.ampBalanco;
        this.body.setVelocityY((alvoY - this.sprite.y) * 6);

        // A barriga exposta BRILHA de leve: parado = vulnerável, e o brilho é o telégrafo.
        if (Math.random() < 0.35) this.glow.emitParticleAt(this.core.x, this.core.y);

        this.cdTiro -= dt;
        if (this.cdTiro <= 0) {
          this.cdTiro = 1.8;
          this.leque(BossNucleo.SALVA_N[this.degrau], this.gMuzzle(), target);
          // one sound per fan (block SOUND, sheet 5c)
          Som.tocar('guardiao.leque', { x: this.sprite.x });
          this.scene.cameras.main.shake(40, 0.002);
        }

        if (this.acaoT <= 0) {
          // o RODÍZIO do degrau (spec 2026-11-22 §8)
          const agora = this.proxima;
          this.proxima = proximaAcao(this.degrau, agora);
          if (agora === 'teto') {
            // O TETO QUE SANGRA (§7). Ele BOMBEIA pelos cabos: o pulso sobe ao teto, corre a borda, os pontos incham e
            // soltam colunas de gotas em duas ondas alternadas. Na estação, miolo aberto, sem salva.
            this.acao = 'teto';
            this.body.setVelocityY(0);
            this.teto = new TetoQueSangra();
            this.borda.iniciar(this.teto);
            this.cabos.golpe(BossNucleo.TETO_BOMBEIA);
          } else if (agora === 'aperto') {
            // O APERTO (§7). Ele opera o hospedeiro pelos cabos: o PUXÃO (os cabos esticam para cima e vibram, a borda
            // estremece), e a constrição corre a arena. Na estação, miolo aberto, sem salva — o vão é o desafio inteiro.
            this.acao = 'aperto';
            this.body.setVelocityY(0);
            this.borda.soltar(VAOS_Y[this.vezAperto++ % VAOS_Y.length]);
            this.cabos.setTensa(true);
            this.cabos.golpe(BossNucleo.APERTO_PUXAO);
            this.scene.cameras.main.shake(600, 0.003);
          } else if (agora === 'serpentes') {
            // OS CABOS-SERPENTE. Ele fica na estação operando os cabos: parado, à direita, miolo aberto (§8).
            this.acao = 'serpentes';
            this.body.setVelocityY(0);
            this.serpentes.soltar(this.paramSerpentes());
            this.origemSerpentes = { x: this.sprite.x, y: this.sprite.y };
          } else if (agora === 'serra') {
            // A SERRA. Ele fica na estação segurando o cabo: parado, à direita, miolo aberto.
            this.acao = 'serra';
            this.body.setVelocityY(0);
            this.serra = new SerraGuardiao(
              this.scene,
              this.perigos,
              this.fx,
              () => this.gCabo(),
              BossNucleo.ARENA_TOPO,
              BossNucleo.ARENA_BASE,
              BossNucleo.SERRA_CRAVADAS[this.degrau],
            );
          } else {
            // TELEGRAFO: pisca e FECHA o corpo — quem ainda estiver na frente foi avisado.
            this.acao = 'telegrafo';
            this.acaoT = BossNucleo.TELEGRAFO_DUR;
            // the heart racing (sheet 5c): as long as the telegraph, the lock sounds on its own below
            Som.tocar('guardiao.telegrafo', { x: this.sprite.x });
            this.cargaT = 0;
            this.vyTravado = null;
            this.recuoT = 0;
            this.corpoInteiro();
            this.body.setVelocityY(0);
            // O CASCO ESFRIA enquanto o miolo acende. O tint escuro diz "fechado" (a bala morre no
            // casco a partir de agora) e libera a linguagem do CALOR para o aviso — ver o `case`.
            this.sprite.setTint(BossNucleo.CASCO_FRIO);
          }
        }
        break;
      }

      case 'telegrafo': {
        /**
         * ─── O AVISO É A ACELERAÇÃO DO CORE (20/09, pedido dele) ───
         *
         * ⚠️ O QUE ESTAVA ERRADO NÃO ERA A DURAÇÃO, ERA O VOCABULÁRIO: o telégrafo piscava o corpo
         * INTEIRO em rosa (0xffd0d0/0xff6060) — a MESMA gramática do flash de dano (0xffb090, ver
         * `damage`). O jogador via o guardião piscar e lia "acertei nele", não "ele vai investir".
         * Agora as duas coisas não podem ser confundidas: no dano, o casco esquenta por 60ms; aqui o
         * casco ESFRIA e quem acende é o miolo, em três camadas que sobem juntas:
         *
         *   1. a RESPIRAÇÃO acelera (`timeScale` 1× → `TELEG_RESPIRO`) — é o coração disparando, e é
         *      literalmente o que ele pediu. ⚠️ Ela é a única camada que existe mesmo sem partícula:
         *      se um dia a sheet sumir, o aviso degrada, não desaparece;
         *   2. o ANEL DE CARGA fecha no miolo (`CARGA_R0` → `CARGA_R1`), com o sopro acelerando de
         *      `CARGA_MS0` a `CARGA_MS1`. Encolher é o oposto do `glow` do `flutua`, que se espalha;
         *   3. no estalo, o `glow` solta uma coroa de 14 de uma vez: a carga SOLTANDO.
         *
         * ─── E O AVISO TEM DOIS TEMPOS (20/09, o 7º teste) ───
         * Até `TELEG_TRAVA` ele CARREGA e ainda lê a nave; dali em diante a mira está cravada e o que
         * sobra da carga é a JANELA DE FUGA. A virada tem de ser visível, senão a jogada dele não
         * existe — ele precisa saber QUANDO parou de valer a pena ficar no lugar. São três sinais no
         * mesmo quadro: o RECUO do corpo (ele puxa para trás antes de saltar), o estalo do `glow`, e a
         * carga que para de fechar e passa a segurar cravada no miolo.
         */
        const k = 1 - Math.max(0, this.acaoT) / BossNucleo.TELEGRAFO_DUR;
        const kCarga = Math.min(1, k / BossNucleo.TELEG_TRAVA);
        // ⚠️ A respiração acelera até a TRAVA e fica cravada no máximo depois dela: se continuasse
        // subindo, a rampa contaria uma história que o corpo já não está contando (ele já decidiu).
        this.sprite.anims.timeScale = 1 + kCarga * (BossNucleo.TELEG_RESPIRO - 1);

        if (this.recuoT > 0) {
          this.recuoT -= dt;
          if (this.recuoT <= 0) this.body.setVelocityX(0);
        }

        if (this.vyTravado === null && k >= BossNucleo.TELEG_TRAVA) {
          // A MIRA FECHA AQUI. Daqui para a frente mexer a nave não move mais a investida — é o que
          // transforma "esperar até o último instante" numa jogada em vez de numa armadilha.
          this.vyTravado = Phaser.Math.Clamp((target.y - this.sprite.y) * 1.2, -70, 70);
          Som.tocar('guardiao.trava', { x: this.sprite.x });
          this.glow.emitParticleAt(this.core.x, this.core.y, 10);
          this.body.setVelocityX(BossNucleo.RECUO_VEL);
          this.recuoT = BossNucleo.RECUO_MS;
          this.scene.cameras.main.shake(70, 0.003);
        }

        this.cargaT -= dt;
        if (this.cargaT <= 0) {
          const travado = this.vyTravado !== null;
          this.cargaT =
            (travado
              ? BossNucleo.CARGA_MS_TRAVA
              : Phaser.Math.Linear(BossNucleo.CARGA_MS0, BossNucleo.CARGA_MS1, kCarga)) / 1000;
          // Travado, o raio ABRE um pouco e o sopro é UM só: sem isso tudo cai no mesmo pixel e o ADD
          // satura em branco. Antes da trava, o anel fecha — e na metade final saem DOIS por batida,
          // em lados opostos, que é o que o transforma de cacho de partículas em ANEL.
          const raio = travado
            ? BossNucleo.CARGA_R1 + Math.random() * 4
            : Phaser.Math.Linear(BossNucleo.CARGA_R0, BossNucleo.CARGA_R1, kCarga);
          const a = Math.random() * Math.PI * 2;
          this.carga.emitParticleAt(this.core.x + Math.cos(a) * raio, this.core.y + Math.sin(a) * raio);
          if (!travado && kCarga > 0.5) {
            this.carga.emitParticleAt(this.core.x - Math.cos(a) * raio, this.core.y - Math.sin(a) * raio);
          }
        }

        if (this.acaoT <= 0) {
          this.sprite.clearTint();
          this.sprite.anims.timeScale = 1;
          this.glow.emitParticleAt(this.core.x, this.core.y, 14);
          this.acao = 'investe';
          Som.tocar('guardiao.investida', { x: this.sprite.x });
          // o teto solta cabo quase reto: o cachorro puxando a coleira
          this.cabos.setTensa(true);
          // Investe na altura lida NA TRAVA — mirada no passado, e agora num passado que ele pode ver
          // acontecer. O `??` é a rede: sem trava (se alguém zerar `TELEG_TRAVA`), vale a leitura do
          // instante do arranque, que é o comportamento antigo.
          this.body.setVelocity(
            -300,
            this.vyTravado ?? Phaser.Math.Clamp((target.y - this.sprite.y) * 1.2, -70, 70),
          );
          this.vyTravado = null;
        }
        break;
      }

      case 'serra': {
        // Ele NÃO se mexe enquanto a serra corre: está ancorado no cabo. É a janela de dano da luta —
        // a nave atira para a direita, então só serve para ela um guardião parado e à direita.
        this.serra?.update(dt);
        if (Math.random() < (this.segurandoCabo ? 0.5 : 0.35)) {
          this.glow.emitParticleAt(this.core.x, this.core.y);
        }
        if (!this.serra?.viva) {
          this.serra = null;
          this.acao = 'flutua';
          this.acaoT = BossNucleo.pausa(this.degrau);
          this.cdTiro = 0.6;
        }
        break;
      }

      case 'serpentes': {
        // operando os cabos: o balanço REDUZIDO (`SERPENTE_BALANCO`, a mesma onda do flutuar, sem emenda), as raízes
        // indo junto com o corpo, o miolo aberto e brilhando — a janela de dano (§8). Sem salva: as serpentes são a
        // ameaça inteira.
        const alvoAmp = BossNucleo.SERPENTE_BALANCO;
        this.ampBalanco = Math.max(alvoAmp, this.ampBalanco - dt * 1.5);
        const alvoY = BossNucleo.G_BASE_Y + Math.sin(this.t * 0.7) * 16 * this.ampBalanco;
        this.body.setVelocityY((alvoY - this.sprite.y) * 6);
        if (Math.random() < 0.35) this.glow.emitParticleAt(this.core.x, this.core.y);
        if (this.serpentes.terminou) {
          this.body.setVelocityY(0);
          this.acao = 'flutua';
          this.acaoT = BossNucleo.pausa(this.degrau);
          this.cdTiro = 0.6;
        }
        break;
      }

      case 'teto': {
        // firme na estação (o balanço reduzido), o miolo aberto e brilhando; sem salva. Acaba quando a borda murchou e a
        // última gota saiu da tela.
        this.ampBalanco = Math.max(BossNucleo.SERPENTE_BALANCO, this.ampBalanco - dt * 1.5);
        const alvoY = BossNucleo.G_BASE_Y + Math.sin(this.t * 0.7) * 16 * this.ampBalanco;
        this.body.setVelocityY((alvoY - this.sprite.y) * 6);
        if (Math.random() < 0.35) this.glow.emitParticleAt(this.core.x, this.core.y);
        if ((!this.teto || this.teto.acabou) && this.sangue.vazio) {
          this.teto = null;
          this.cabos.pulso(null);
          this.body.setVelocityY(0);
          this.acao = 'flutua';
          this.acaoT = BossNucleo.pausa(this.degrau);
          this.cdTiro = 0.6;
        }
        break;
      }

      case 'aperto': {
        // firme na estação (o balanço reduzido, como nas serpentes), o miolo aberto e brilhando; sem salva
        this.ampBalanco = Math.max(BossNucleo.SERPENTE_BALANCO, this.ampBalanco - dt * 1.5);
        const alvoY = BossNucleo.G_BASE_Y + Math.sin(this.t * 0.7) * 16 * this.ampBalanco;
        this.body.setVelocityY((alvoY - this.sprite.y) * 6);
        if (Math.random() < 0.35) this.glow.emitParticleAt(this.core.x, this.core.y);
        if (this.borda.terminou) {
          this.body.setVelocityY(0);
          this.cabos.setTensa(false);
          this.acao = 'flutua';
          this.acaoT = BossNucleo.pausa(this.degrau);
          this.cdTiro = 0.6;
        }
        break;
      }

      case 'investe': {
        // A COLEIRA: até a primeira corda chegar ao máximo — e aí o TRANCO. O `x < 70` antigo fica só como rede.
        if (this.cabos.noLimite(this.sprite) || this.sprite.x < 70) {
          // a parada EXATA do alcance (a 300 px/s um quadro lento passaria 5–15 px dela)
          this.parada = { x: Math.max(this.sprite.x, this.xParadaEm(this.sprite.y)), y: this.sprite.y };
          this.body.reset(this.parada.x, this.parada.y);
          this.acao = 'tranco';
          this.trancoT = 0;
          this.cabos.golpe(this.tranco.vibra);
          this.scene.cameras.main.shake(90, this.tranco.tremor);
          // O 1º PULSO: a inércia arranca a lava do miolo, na figura fixa
          this.pulsoK = 0;
          this.pulsoT = 0;
          this.dispararPulso();
        }
        break;
      }

      case 'tranco': {
        // o corpo passa um pouco da parada (a inércia) e a corda o segura de volta
        this.trancoT += dt;
        this.seguirPulsos(dt);
        this.body.reset(this.parada.x - deslocTranco(this.trancoT, this.tranco), this.parada.y);
        if (this.trancoT >= this.tranco.volta) {
          this.trancoT = 0;
          this.acao = 'segura';
        }
        break;
      }

      case 'segura': {
        // preso na parada, a corda tensa, um mini-tranco a cada pulso — e só depois do último, a volta
        this.seguirPulsos(dt);
        this.miniT += dt;
        this.body.reset(this.parada.x - deslocTranco(this.miniT, BossNucleo.MINI_TRANCO), this.parada.y);
        if (this.pulsoK >= BossNucleo.LAVA_PULSOS[this.degrau] && this.pulsoT >= BossNucleo.SEGURA_FIM) {
          this.acao = 'volta';
          this.trancoT = 0;
          this.cabos.setTensa(false);
        }
        break;
      }

      case 'volta': {
        // os cabos o RECOLHEM: rápido no começo, assentando na estação (era uma reta a 150 px/s)
        this.trancoT += dt;
        const kVolta = voltaElastica(Math.min(1, this.trancoT / BossNucleo.VOLTA_S));
        this.body.reset(
          Phaser.Math.Linear(this.parada.x, BossNucleo.G_STATION_X, kVolta),
          Phaser.Math.Linear(this.parada.y, BossNucleo.G_BASE_Y, kVolta),
        );
        if (this.trancoT >= BossNucleo.VOLTA_S) {
          this.body.reset(BossNucleo.G_STATION_X, BossNucleo.G_BASE_Y);
          this.acao = 'flutua';
          this.acaoT = BossNucleo.pausa(this.degrau);
          this.cdTiro = 1.0;
          this.corpoDomo();
        }
        break;
      }
    }
  }

  /** O próximo pulso da figura, do miolo de agora. Cada pulso depois do 1º é um mini-tranco. */
  private dispararPulso(): void {
    this.posicionarCore();
    const boca = { x: this.core.x, y: this.core.y };
    const alvo = { x: 0, y: (BossNucleo.ARENA_TOPO + BossNucleo.ARENA_BASE) / 2 };
    const angulos = angulosPulso(this.pulsoK, BossNucleo.LAVA_RAIOS, BossNucleo.LAVA_PASSO, boca, alvo);
    this.lava.pulso(boca, angulos, this.lavaVel[this.degrau]);
    if (this.pulsoK > 0) {
      this.miniT = 0;
      this.cabos.golpe(BossNucleo.MINI_TRANCO.vibra);
      this.scene.cameras.main.shake(50, BossNucleo.MINI_TRANCO.tremor);
    }
    this.pulsoK++;
  }

  /** O relógio dos pulsos: corre no tranco e segurando. Depois do último, conta o fim. */
  private seguirPulsos(dt: number): void {
    this.pulsoT += dt;
    if (this.pulsoK >= BossNucleo.LAVA_PULSOS[this.degrau]) return;
    const entre = this.lavaEntre[this.degrau];
    if (this.pulsoT < entre) return;
    this.pulsoT -= entre;
    this.dispararPulso();
  }

  /**
   * a parede do aperto encostou na nave: se foi na borda TORCIDA (o fio aceso), MORDE — 1 vida, pela cena (`morde`,
   * a mesma lei da parede do duto; os i-frames separam os toques) — e ela sai pela normal (`empurrar`), para não ficar
   * dentro da parede
   */
  private empurrarNave(nave: Phaser.Physics.Arcade.Sprite): void {
    const C = BossNucleo.CAIXA_NAVE;
    for (let x = Math.round(nave.x - C.w / 2); x <= Math.round(nave.x + C.w / 2); x++) {
      const naTeto = this.borda.torcidaEm(x, true) && nave.y - C.h / 2 < this.borda.tetoEm(x);
      const naChao = this.borda.torcidaEm(x, false) && nave.y + C.h / 2 > this.borda.chaoEm(x);
      if (naTeto || naChao) {
        this.mordeuAperto = true;
        break;
      }
    }
    const n = empurrar({ x: nave.x, y: nave.y }, C.w, C.h, (x) => this.borda.tetoEm(x), (x) => this.borda.chaoEm(x));
    if (n.x === nave.x && n.y === nave.y) return;
    nave.setPosition(Math.max(C.w / 2, n.x), n.y);
    (nave.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
  }

  /** O que ele fere POR MEDIÇÃO (o gancho da cena, `StageBoss.morde`): a borda torcida do aperto. */
  morde(_esq: number, _dir: number, _topo: number, _base: number): boolean {
    const m = this.mordeuAperto;
    this.mordeuAperto = false;
    return m;
  }

  /** As serpentes do degrau de agora, com as raízes na tela (o corpo está na estação). */
  private paramSerpentes(): ParamSerpente[] {
    const k = Math.max(0, this.degrau - 1);
    const e = BossNucleo.G_ESCALA;
    return BossNucleo.SERPENTES[k].map((c) => {
      const raiz = { x: this.sprite.x + c.raiz.x * e, y: this.sprite.y + c.raiz.y * e };
      return {
        raiz,
        c1: c.c1,
        // na altura do posto: o arco chega nele na horizontal (ver `SERPENTES`)
        c2: { x: c.posto.x + 40, y: c.posto.y },
        posto: c.posto,
        atraso: c.atraso,
        botes: BossNucleo.SERPENTE_BOTES[k],
        ensaio: BossNucleo.SERPENTE_ENSAIO[k],
        fintas: BossNucleo.SERPENTE_FINTAS[k],
      };
    });
  }

  /** Lido pelo teste: onde a coleira pararia o corpo na altura `y`. */
  xParadaEm(y: number): number {
    return this.cabos.xParada(y, xDaParada);
  }

  private gMuzzle(): { x: number; y: number } {
    const e = BossNucleo.G_ESCALA;
    return {
      x: this.sprite.x + BossNucleo.G_MUZZLE_X * e,
      y: this.sprite.y + BossNucleo.G_MUZZLE_Y * e,
    };
  }

  /**
   * A TROCA: a casca MORRE — e o PREDADOR sai de dentro dela (B3, 16/09).
   *
   * ⚠️ A MORTE DO GUARDIÃO É COMPOSTA NO MOTOR, e é decisão dele (15/09). Duas animações geradas convergiram
   * no mesmo limite do gerador: o miolo explode, mas o grosso da silhueta fica inteiro. Então são camadas:
   *   1. a `guardiao-morte` (o miolo estourando até ficar oco), 0 → `MORTE_MS`;
   *   2. as explosões do jogo subindo pela casca por cima dela;
   *   3. o `guardiaoDestruido` + a EXPLOSÃO SANGRENTA + o SANGUE NA TELA em `MORTE_MS` (o pedido dele:
   *      *"fica imersivo e dá mais desvio para a transição"*) — a carcaça apaga sob o sangue;
   *   4. o predador em `TROCA_MS`, surgindo (ver `Predador.surgir`).
   * A arma trava JÁ no golpe fatal: a pausa dramática inteira é para olhar.
   */
  private trocarParaPredador(): void {
    this.trocando = true;
    this.travaTroca = true;
    // a COLEIRA arrebenta no golpe final: as cordas chicoteiam penduradas no casco e apagam
    this.cabos.arrebentar();
    this.serpentes.arrebentar();
    this.borda.cancelar();
    this.teto = null;
    this.cabos.pulso(null);
    this.sangue.soltarTudo();
    // A serra é do GUARDIÃO. Se ele morre com ela na arena, ela some junto — o predador tem as armas dele.
    this.serra?.destroy();
    this.serra = null;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.glow.emitting = false;
    this.sprite.clearTint();

    // ⚠️ `anims.stop()` ANTES de tocar a morte: a respiração está em yoyo e sobrescreveria o quadro.
    // E o `timeScale` VOLTA A 1: morrer no meio do telégrafo deixava a respiração em 5× e a morte
    // inteira tocava acelerada — o `timeScale` é do sprite, não do clipe.
    this.sprite.anims.timeScale = 1;
    this.sprite.anims.stop();
    if (this.scene.anims.exists('guardiao-morte')) this.sprite.play('guardiao-morte');

    const e = BossNucleo.G_ESCALA;
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(80 + i * 150, () => {
        if (this.dead) return;
        this.fx.explode(
          this.sprite.x + Phaser.Math.Between(-90, 90) * e,
          this.sprite.y + Phaser.Math.Between(-70, 80) * e,
          1.6,
          52,
          'biomec',
        );
      });
    }

    this.scene.time.delayedCall(BossNucleo.MORTE_MS, () => {
      if (this.dead) return;
      this.sprite.anims.stop();
      if (this.scene.textures.exists('guardiaoDestruido')) this.sprite.setTexture('guardiaoDestruido');
      // the shell bursting (sheet 5c) — the blasts of the death are sheet 2's, they already sound
      Som.tocar('guardiao.casca', { x: this.core.x });
      this.estouro = this.fx.explodeBig(this.core.x, this.core.y, 1.1, 52, 'biomec');
      explosaoSangrenta(this.scene, this.core.x, this.core.y);
      sangueNaTela(this.scene);
      this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: BossNucleo.TROCA_MS - BossNucleo.MORTE_MS });
    });

    this.scene.time.delayedCall(BossNucleo.TROCA_MS, () => {
      if (this.dead) return;
      this.forma = 'predador';
      // ⚠️ A FUMAÇA do fim do estouro ainda está no ar e caía como uma MANCHA PRETA sobre a barriga dele recém-
      // surgido (capturas de 16/09). Ela passa para TRÁS do predador: o que sobra dela vira fundo do surgimento.
      if (this.estouro?.active) this.estouro.setDepth(-0.05);
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setPosition(BossNucleo.G_STATION_X, BossNucleo.G_BASE_Y);
      this.body.reset(BossNucleo.G_STATION_X, BossNucleo.G_BASE_Y);
      this.predador = new Predador(this.scene, this.enemies, this.fx, this.sprite, this.core, () => this.atualizarBarra());
      this.travaTroca = false;
      this.trocando = false;
    });
  }

  /** O alvo acompanha o corpo — `reset` (posição E posição-anterior, lição 3). */
  private posicionarCore(): void {
    const e = BossNucleo.G_ESCALA;
    const x = this.sprite.x + BossNucleo.G_CORE_OFF_X * e;
    const y = this.sprite.y + BossNucleo.G_CORE_OFF_Y * e;
    this.core.setPosition(x, y);
    (this.core.body as Phaser.Physics.Arcade.Body).reset(x, y);
  }

  /** A SALVA MIRADA: a mesma abertura e o mesmo número, o centro na nave (spec 2026-11-22 §5). */
  private leque(n: number, boca: { x: number; y: number }, alvo: { x: number; y: number }): void {
    const centro = miraSalva(boca, alvo);
    for (const angle of angulosSalva(n, BossNucleo.SALVA_ABRE, centro, Math.random)) {
      this.gLobulo(angle, BossNucleo.SALVA_VEL, boca);
    }
  }

  /** A boca do CABO: de onde a serra sai e onde o cabo fica preso. Ele flutua, então é lido a cada quadro. */
  private gCabo(): { x: number; y: number } {
    const e = BossNucleo.G_ESCALA;
    return {
      x: this.sprite.x + BossNucleo.G_CABO_X * e,
      y: this.sprite.y + BossNucleo.G_CABO_Y * e,
    };
  }

  /**
   * O RASTRO dos glóbulos no ar. Quem tem rastro é decidido pela TEXTURA, não por uma lista: o pool
   * de balas é compartilhado com os inimigos comuns, e uma lista de referências envelheceria mal
   * (a bala volta para o pool e renasce como outra coisa). `globuloGuardiao` só ele atira.
   *
   * ⚠️ Cada bala carrega o PRÓPRIO relógio (`rt`), e não o do quadro: com 5 glóbulos abertos num
   * leque, emitir "uma vez por quadro por bala" faria o rastro engrossar junto com a salva.
   */
  private rastroGlobulos(dt: number): void {
    if (!this.scene.textures.exists('globuloGuardiao')) return;
    for (const obj of this.enemies.enemyBullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (!b.active || b.texture.key !== 'globuloGuardiao') continue;

      const rt = ((b.getData('rt') as number) ?? 0) - dt;
      if (rt > 0) {
        b.setData('rt', rt);
        continue;
      }
      b.setData('rt', BossNucleo.RASTRO_MS);

      // Atrás da bala, nunca em cima dela: o sopro nasce na cauda (o glóbulo tem 12px de corpo no
      // sprite de 32×16) para o rastro sair de trás e não engolir a própria silhueta.
      const ang = b.rotation;
      const x = b.x - Math.cos(ang) * 6;
      const y = b.y - Math.sin(ang) * 6;
      this.fumaca.emitParticleAt(x, y);
      if (Math.random() < BossNucleo.RASTRO_BRASA) this.brasa.emitParticleAt(x, y);
    }
  }

  /** O glóbulo (bolt3 laranja) do bico do guardião. */
  private gLobulo(angle: number, speed: number, boca: { x: number; y: number }): void {
    const b = this.enemies.enemyBullets.get(boca.x, boca.y) as
      | Phaser.Physics.Arcade.Sprite
      | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;

    // ⚠️ SEM TINT. A arte nova já traz a própria cor (casco escuro, só a brasa acesa); tingir de laranja
    // acendia o corpo inteiro e devolvia o projétil genérico que ele mandou trocar.
    if (this.scene.textures.exists('globuloGuardiao')) {
      b.setTexture('globuloGuardiao');
      b.clearTint();
    } else if (this.scene.textures.exists('bolt3')) {
      b.setTexture('bolt3');
      b.setTint(0xffa040);
    }
    b.setScale(1);
    b.setFlipX(false);
    b.setRotation(angle);

    b.setData('ox', boca.x);
    b.setData('oy', boca.y);
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  /**
   * O gate do dano é o ESTADO: o guardião fecha ao MOVER (o corpo inteiro absorve — este método nem é
   * chamado); o predador decide o dele (o surgimento não fere, a recuperação dobra).
   */
  damage(amount: number): boolean {
    if (this.predador) {
      if (!this.predador.damage(amount)) return false;
      this.dead = true;
      return true;
    }
    if (this.dead || this.entering || this.trocando) return false;

    // Ancorado no cabo, em esforço: o dano dobra. Mesma gramática da recuperação do predador — a
    // janela de dano da luta tem de PAGAR, senão ela é só um lugar onde nada acontece.
    const dano = this.segurandoCabo ? amount * BossNucleo.DANO_CRAVADA : amount;
    this.hpGuardiao = Math.max(0, this.hpGuardiao - dano);
    this.atualizarBarra();

    this.sprite.setTint(0xffb090);
    // ⚠️ O flash de dano NÃO pode apagar o tint frio do telégrafo: um golpe que cai no último quadro
    // antes do aviso deixava o `clearTint` atrasado limpar o casco no meio da carga.
    this.scene.time.delayedCall(60, () => {
      if (this.dead) return;
      if (this.acao === 'telegrafo') this.sprite.setTint(BossNucleo.CASCO_FRIO);
      else this.sprite.clearTint();
    });

    if (this.hpGuardiao === 0) this.trocarParaPredador();
    return false;
  }

  /** UMA barra para as duas formas: a luta é uma só, e a barra é a promessa do tamanho dela. */
  private atualizarBarra(): void {
    this.bar.width = 160 * ((this.hpGuardiao + (this.predador?.hp ?? Predador.HP)) / BossNucleo.HP_TOTAL);
  }

  /** O corpo do predador fica na tela, racha o chão e afunda na lava antes da cutscene — ver `destroy`. */
  get pausaFinalMs(): number | undefined {
    return this.predador ? BossNucleo.CORPO_FICA_MS : undefined;
  }

  destroy(): void {
    this.serra?.destroy();
    this.cabos.destroy();
    this.serpentes.destroy();
    this.borda.destroy();
    this.sangue.destroy();
    this.lava.destroy();
    this.serra = null;
    // O CORPO FICA (17/09: *"a animação dele morto não apareceu, ele sumiu"*): a cena destrói o chefão 1,2s depois
    // do golpe final, bem quando o clipe da morte termina estendido. O último quadro vira uma imagem solta no
    // chão — e dali sai o FIM: o piso racha, estoura, a lava sobe e o corpo afunda (ver `fimDoPredador`).
    if (this.predador?.dead && this.sprite.active) {
      const s = this.sprite;
      const corpo = this.scene.add
        .image(s.x, s.y, s.texture.key, s.frame.name)
        .setOrigin(s.originX, s.originY)
        .setScale(s.scaleX, s.scaleY)
        .setFlip(s.flipX, s.flipY)
        .setDepth(s.depth);
      afundarNaLava(this.scene, corpo, this.fx, Predador.CHAO_APOIO);
    }
    this.predador?.destroy();
    this.sprite.destroy();
    this.core.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.glow.destroy();
    this.fumaca.destroy();
    this.brasa.destroy();
    this.carga.destroy();
  }
}
