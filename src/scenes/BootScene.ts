import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';

/**
 * Quantos quadros cada animação tem EM DISCO.
 *
 * É declarado, não adivinhado: tentar carregar quadros que não existem enche o console de erro
 * (o servidor devolve o index.html no lugar do PNG, e a decodificação falha). Ao instalar uma
 * animação nova, atualize o número aqui.
 */
const FRAMES: Record<string, number> = {
  // A luta da Torre tem DUAS formas de arte (solo -> ar) + a decolagem que liga uma à outra.
  // Tudo vem do PixelLab por SELEÇÃO de quadros (ver scripts/install-boss-fight.mjs) — menos o
  // `boss-idle`, que é o pulso do olho na forma pousada, sintetizado do estático
  // (scripts/pulsar-brilho.mjs) porque o v3 estroboscopa em idle de sprite grande e parado.
  bossIdleAnim: 8,
  bossFireAnim: 5,
  bossAirAnim: 6,
  bossAirFireAnim: 4,
  bossTakeoffAnim: 7,
  shipAnim: 7,
  droneAnim: 7,
  gunshipAnim: 7,
  turretAnim: 7,
  buildingAnim: 7,
  baseAnim: 7,
  radarAnim: 7,
  cometAnim: 7,
  blastAnim: 7,

  // ─── A FASE 2, animada ───
  // Até aqui o cinturão inteiro era ESTÁTICO: a Capitânia pairava como um adesivo, a mina não
  // piscava, e os inimigos novos não tinham motor aceso. Num jogo em que tudo o mais respira,
  // o que não se mexe lê como cenário — e cenário não mata ninguém, então o olho o descarta.
  // 9, e não os 7 do resto: a arte nova do kamikaze (feita à mão, 2026-08-10) veio com o ciclo
  // mais longo — a cauda chicoteia num vaivém que 7 quadros cortariam no meio.
  kamikazeAnim: 9,
  scoutAnim: 7,
  // 13: a arte nova do cargueiro (2026-08-10) cicla a baia de lançamento por vermelho → oliva →
  // amarelo, e o ciclo inteiro precisa dos 13 quadros para fechar sem salto de cor.
  carrierAnim: 13,
  sensorAnim: 7,
  capitaniaAnim: 7,
  // A SALVA das baterias (2026-07-21): 8 quadros + o de referência. Mesma caixa união do idle
  // (scripts/_recrop-capitania.mjs) — caixas diferentes fariam o sprite saltar na troca.
  capitaniaFireAnim: 9,
  minaAnim: 7,
  flakAnim: 7,

  // A FACÇÃO DO CINTURÃO (passe visual 2026-08-08): canhoneira e batedor trocam de pele por
  // FASE (ver EnemySystem.STAGE_2_SKIN) — estas são as chaves de animação da pele nova.
  scoutCinturaoAnim: 11,
  gunshipCinturaoAnim: 7,
  // A BOLA de energia da canhoneira do cinturão, agora ANIMADA (2026-08-09): ela pulsa e solta
  // fagulha no ar em vez de ser um adesivo. Os quadros nasceram com DERIVA (o desenho escorregava
  // 5.6px para a esquerda ao longo do ciclo, o que num projétil soma à velocidade e vira
  // solavanco) — corrigida no disco por `scripts/centrar-anim.mjs`, não em runtime.
  bulletOrbAnim: 7,

  // ─── O RÓSTER v2 (2026-07-17): 7 naves de perfil, cada uma com a sua propulsão. ───
  // 9 quadros (v3 do PixelLab guarda o quadro de referência como frame 0 — e o PNG estático
  // de cada nave É esse quadro 0, então estático e animação nunca saltam entre si).
  // ─── FASE 3: a serpente em 4 formas (anatomia da luta) + a aranha andadora. ───
  serpenteAnim: 9,
  serpente2cAnim: 9,
  serpente1cAnim: 9,
  serpenteFusaoAnim: 9,
  aranhaAnim: 9,
  aranhaJumpAnim: 9,
  aguaVivaAnim: 9,

  // A GARGANTA da Cutscene 3: 9 quadros por animação (o v3 do PixelLab guarda o quadro de
  // referência como frame 0, então frame_count=8 grava 9 em disco).
  gargantaIdleAnim: 11,
  // ⚠️ A MORTE TEM 7, NÃO 9, E OS DOIS QUE SAÍRAM SAÍRAM POR DEFEITO DA ARTE. O gerador devolveu
  // os dois últimos quadros com um artefato — uma cruz marrom clara no meio da boca, do nada. E
  // como esta animação NÃO repete (`loop: false`), ela CONGELA no último quadro: a cruz ficaria na
  // tela do impacto até o fim da cena. Cortados no disco, a morte termina onde ela devia terminar,
  // no buraco preto. ⚠️ A caixa do recorte foi calculada com os 19 quadros ORIGINAIS, então
  // apagar dois arquivos não desalinha nada — o sprite não salta.
  gargantaMorteAnim: 11,

  shipJatoAnim: 9,
  shipVerdeAnim: 9,
  shipCremeAnim: 9,
  // A Fantasma usa a arte ORIGINAL da 1ª nave (pedido do Henrique) — a animação daquela era tem
  // 7 quadros, não 9.
  shipCinzaAnim: 7,
  shipBrancaAnim: 9,
  shipCanhoesAnim: 9,
  shipAlien2Anim: 9,
  // O ARAUTO também ganhou propulsão (2026-07-21): era a única nave jogável sem motor animado.
  shipArautoAnim: 9,

  // A AURORA da cutscene 1. Remodelada em 2026-08-09 (casco escuro, luzes vermelhas piscando e
  // os propulsores roxos pulsando atrás) — a arte anterior tinha saído da linha dark sci-fi.
  carrierBigAnim: 9,
};

/**
 * Animações do jogo. Cada quadro é um PNG solto (`<nome>-0.png`, `-1.png`, …) em vez de um
 * spritesheet: não obriga a fixar o tamanho de quadro antes de a arte existir, e uma animação
 * que ainda não foi gerada simplesmente não aparece.
 *
 * Rocha e prédio NÃO têm animação de propósito — pedra não se mexe, e animar por animar polui.
 */
const ANIMS: { key: string; prefix: string; frameRate: number; loop?: boolean }[] = [
  // FORMA POUSADA (fase 1): olho pulsando + o disparo do canhão.
  { key: 'boss-idle', prefix: 'bossIdleAnim', frameRate: 10 },
  { key: 'boss-fire', prefix: 'bossFireAnim', frameRate: 14, loop: false },
  // A DECOLAGEM: toca UMA vez na virada de fúria — o fogo corre pela junta da cidadela e a
  // arrebenta. 7 quadros a 8fps = 875ms, e é esse número que o `Boss.SWAP_AT` persegue: a forma
  // aérea entra no quadro seguinte ao último desta, debaixo do estouro grande.
  { key: 'boss-takeoff', prefix: 'bossTakeoffAnim', frameRate: 8, loop: false },
  // FORMA NO AR (fase 2): propulsores queimando + o disparo.
  { key: 'boss-air-hover', prefix: 'bossAirAnim', frameRate: 10 },
  { key: 'boss-air-fire', prefix: 'bossAirFireAnim', frameRate: 14, loop: false },
  { key: 'ship-thrust', prefix: 'shipAnim', frameRate: 12 },
  { key: 'drone-fly', prefix: 'droneAnim', frameRate: 12 },
  { key: 'gunship-fly', prefix: 'gunshipAnim', frameRate: 8 },
  { key: 'turret-idle', prefix: 'turretAnim', frameRate: 8 },
  // A colônia viva: janelas piscando e o radar varrendo. Lentas de propósito — luz de
  // cenário piscando rápido rouba a atenção do que importa (o perigo).
  { key: 'building-lights', prefix: 'buildingAnim', frameRate: 5 },
  { key: 'base-lights', prefix: 'baseAnim', frameRate: 5 },
  { key: 'radar-scan', prefix: 'radarAnim', frameRate: 6 },
  // Projéteis ardendo. Rápidos: fogo lento parece plástico.
  { key: 'comet-burn', prefix: 'cometAnim', frameRate: 14 },
  { key: 'blast-burn', prefix: 'blastAnim', frameRate: 14 },

  // ─── FASE 2 ───
  //
  // A CADÊNCIA CONTA A INTENÇÃO. Não é enfeite: é a mesma informação que a silhueta dá, no
  // tempo. O kamikaze vibra RÁPIDO (14) porque está se jogando em você; o cargueiro arrasta a
  // 6 porque é um bicho pesado que você tem tempo de decidir matar; a Capitânia respira a 8,
  // como um navio ancorado.
  { key: 'kamikaze-fly', prefix: 'kamikazeAnim', frameRate: 14 },
  { key: 'scout-fly', prefix: 'scoutAnim', frameRate: 12 },
  // A pele do cinturão (Fase 2) do batedor: MESMA cadência do 'scout-fly' — é o mesmo
  // comportamento, só a pele muda (ver EnemySystem.STAGE_2_SKIN).
  { key: 'scout-cinturao-fly', prefix: 'scoutCinturaoAnim', frameRate: 12 },
  // A pele do cinturão da canhoneira: MESMA cadência do 'gunship-fly' (8) — é o mesmo
  // comportamento pesado, só a pele muda.
  { key: 'gunship-cinturao-fly', prefix: 'gunshipCinturaoAnim', frameRate: 8 },
  // A BOLA de energia dela: 14, a mesma cadência do 'comet-burn'/'blast-burn'. Projétil é a
  // única coisa no jogo que pulsa RÁPIDO — energia lenta parece plástico, e um tiro que parece
  // plástico não lê como perigo.
  { key: 'bullet-orb-pulse', prefix: 'bulletOrbAnim', frameRate: 14 },
  { key: 'carrier-fly', prefix: 'carrierAnim', frameRate: 6 },
  { key: 'capitania-idle', prefix: 'capitaniaAnim', frameRate: 8 },
  // O clarão da salva: toca no disparo e volta para o idle ao terminar (BossCapitania.playFire).
  { key: 'capitania-fire', prefix: 'capitaniaFireAnim', frameRate: 14, loop: false },

  // As minas PISCAM devagar (5): é o pulso de uma coisa parada e paciente. Rápido demais, elas
  // competiriam com o telégrafo de perigo — que é justamente uma piscada RÁPIDA (o pavio). O
  // contraste entre os dois ritmos é o que diz ao jogador que a mina acordou.
  { key: 'mina-pulse', prefix: 'minaAnim', frameRate: 5 },
  { key: 'sensor-idle', prefix: 'sensorAnim', frameRate: 5 },

  // A cápsula de flak: a luz do pavio pisca enquanto ela voa.
  { key: 'flak-arm', prefix: 'flakAnim', frameRate: 10 },

  // ─── FASE 3. A serpente respira DEVAGAR (8) — massa; a fúria e a aranha a 10: agitação. ───
  { key: 'serpente-idle', prefix: 'serpenteAnim', frameRate: 8 },
  { key: 'serpente-2c-idle', prefix: 'serpente2cAnim', frameRate: 8 },
  { key: 'serpente-1c-idle', prefix: 'serpente1cAnim', frameRate: 8 },
  { key: 'serpente-fusao-fury', prefix: 'serpenteFusaoAnim', frameRate: 10 },
  { key: 'aranha-walk', prefix: 'aranhaAnim', frameRate: 10 },
  // O PULO toca UMA vez por salto (o EnemySystem devolve o walk na aterrissagem).
  { key: 'aranha-jump', prefix: 'aranhaJumpAnim', frameRate: 10, loop: false },
  // A ÁGUA-VIVA do Ato 1 da Fase 3: o sino contrai e os tentáculos arrastam. 6fps de propósito —
  // ela é a única coisa LENTA da nebulosa, e pulsar rápido a transformaria em mais uma nave.
  { key: 'aguaviva-drift', prefix: 'aguaVivaAnim', frameRate: 6 },

  // ─── A GARGANTA (cutscene 3) ───
  // Ela respira a 6, a mesma cadência da água-viva: é a coisa LENTA do quadro. Pulsar rápido
  // faria dela mais um inimigo, e ela não é inimigo — ela é o LUGAR, e está ali desde o primeiro
  // quadro da cena.
  { key: 'garganta-idle', prefix: 'gargantaIdleAnim', frameRate: 6 },
  // A MORTE toca UMA vez, a 5 — e o número foi MEDIDO, não escolhido.
  //
  // ⚠️ ELA ESTAVA A 12 E O HENRIQUE NÃO CONSEGUIA VÊ-LA. Ele jogou e relatou "o idle funciona, o
  // da morte não". A animação rodava: `scripts/_cut3/_diag-morte.mjs` amostrou a cena a cada 80ms
  // e pegou os 7 quadros passando — em **480ms**, debaixo de um `explodeBig` que cobria a criatura
  // inteira, de um flash de tela e de um shake. Não era um defeito de animação, era um defeito de
  // TEMPO: meio segundo escondido não existe para quem está jogando.
  //
  // 7 quadros a 5fps = 1,4s. Ela morre devagar, que é o beat: a boca dá um flare e apaga.
  { key: 'garganta-morte', prefix: 'gargantaMorteAnim', frameRate: 5, loop: false },

  // ─── As propulsões do róster v2. O mesmo 12 da nave base: o motor é o mesmo verbo. ───
  { key: 'ship-jato-thrust', prefix: 'shipJatoAnim', frameRate: 12 },
  { key: 'ship-verde-thrust', prefix: 'shipVerdeAnim', frameRate: 12 },
  { key: 'ship-creme-thrust', prefix: 'shipCremeAnim', frameRate: 12 },
  { key: 'ship-cinza-thrust', prefix: 'shipCinzaAnim', frameRate: 12 },
  { key: 'ship-branca-thrust', prefix: 'shipBrancaAnim', frameRate: 12 },
  { key: 'ship-canhoes-thrust', prefix: 'shipCanhoesAnim', frameRate: 12 },
  { key: 'ship-alien2-thrust', prefix: 'shipAlien2Anim', frameRate: 12 },
  { key: 'ship-arauto-thrust', prefix: 'shipArautoAnim', frameRate: 12 },

  // A AURORA respira a 8, como a Capitânia: navio ancorado, luzes e propulsores em marcha lenta.
  { key: 'carrier-big-idle', prefix: 'carrierBigAnim', frameRate: 8 },
];

/**
 * SPRITESHEETS (quadros lado a lado num PNG só) — o formato novo do passe visual (2026-07-20).
 *
 * Diferente das anims legadas (um PNG por quadro), aqui o tamanho do quadro é FIXO e declarado
 * — as sheets foram geradas no PixelLab já em grade: explosão 13×64², explosão grande
 * 13×128², Leviatã-baleia morrendo 10×144². Sem o arquivo, a textura simplesmente não existe e o
 * Fx cai nas partículas de sempre (arte entra asset por asset — a guarda é o `textures.exists`
 * no registro das animações, não um placeholder desenhado: explosão procedural JÁ existe, são
 * as fagulhas).
 */
const SHEET_ANIMS: {
  key: string;
  sheet: string;
  frames: number;
  frameRate: number;
  /** Ausente = laço infinito, como sempre foi. `false` = toca UMA vez (o cone do estouro). */
  loop?: boolean;
}[] = [
  // A PORTA DO DUTO RESPIRANDO. 8 quadros a 10/s = 0,8s por volta — a batida de uma coisa viva
  // esperando, não a de um alarme.
  //
  // ⚠️ SEM `yoyo`, E É POR CONSTRUÇÃO DA ARTE. Os 8 quadros já são um cosseno completo (aceso →
  // frio → aceso), então o quadro 7 encosta no 0 com a mesma derivada e o laço fecha sozinho. Um
  // `yoyo` aqui tocaria a volta duas vezes e dobraria o período sem querer.
  { key: 'porta-nucleo', sheet: 'portaNucleoSheet', frames: 8, frameRate: 10 },

  // ─── A SOLEIRA DO NÚCLEO (21/09, o esfíncter) ───
  //
  // O GÁS a 8/s: devagar o bastante para o jogador ver ENGROSSAR. É a única parte da cena que
  // pede paciência dele, e acelerar aqui mataria a antecipação — que é a peça inteira. Ver o
  // `VAZANDO_MS` do `Esfincter`.
  // A GARGANTA DA F4 RESPIRANDO, a 6/s — a mesma cadência da versão da cutscene, porque é o mesmo
  // bicho. O que muda é só o teto de brilho (ver `gargantaVivaSheet`).
  { key: 'garganta-viva', sheet: 'gargantaVivaSheet', frames: 11, frameRate: 6 },
  // A MORTE DA GARGANTA DA F4, a 5/s e UMA vez — os mesmos números da versão da cutscene, medidos
  // lá em 04/09 (a 12 ela passava em 480ms debaixo do estouro e ele não conseguia vê-la).
  //
  // ⚠️ E AQUI O TETO DE BRILHO IMPORTA MAIS QUE NO IDLE: é esta animação que fica na tela depois
  // do estouro, enquanto a carcaça rola pelo duto. No cru os dentes voltam BRANCOS (18,2% de px
  // claros contra 0,8% do estático) e a criatura morta lia mais clara que viva.
  { key: 'garganta-morta', sheet: 'gargantaMortaSheet', frames: 11, frameRate: 5, loop: false },
  // AS MANGUEIRAS a 7/s: elas BALANÇAM, não tremem. O gesto é de coisa pendurada num sopro lento,
  // e acelerar aqui as transformaria em algo agitado — que é o oposto de uma parede vazando.
  { key: 'f4-mangueiras', sheet: 'f4MangueirasSheet', frames: 9, frameRate: 7 },
  { key: 'f4-gas', sheet: 'f4GasSheet', frames: 8, frameRate: 8 },
  // O CONE a 14/s e UMA vez só: 10 quadros = 0,71s. Rápido, porque ele é o pagamento, não a
  // espera. ⚠️ `loop: false` — um estouro em laço é um incêndio, e a passagem já está aberta.
  { key: 'f4-cone', sheet: 'f4ConeSheet', frames: 10, frameRate: 14, loop: false },
];

const SHEETS: Record<string, { path: string; w: number; h: number }> = {
  // A explosão-MESTRA do jogo: núcleo branco-quente → chamas → fumaça escura → some.
  explosionSheet: { path: 'sprites/explosion-sheet.png', w: 64, h: 64 },
  // A detonação apocalíptica (bosses, bombas, set-pieces). INVERTIDA vira IMPLOSÃO (Fx).
  explosionBigSheet: { path: 'sprites/explosion-big-sheet.png', w: 128, h: 128 },
  // A explosão PEQUENA (9f 32²): drones, batedores, kamikazes, minas. Antes TUDO usava a
  // mestra de 64px — o estouro de um drone de 24px cobria o dobro do cadáver e lia como
  // capital. Explosão tem TAMANHO DE CASO agora (ver Fx.explode): pequena/média/grande.
  explosionSmallSheet: { path: 'sprites/explosion-small-sheet.png', w: 32, h: 32 },
  // O GUARDIÃO respirando (9f 256² — a massa vermelha pulsa como coração) e o NÚCLEO
  // batendo (9f 128² — a ferida acende e apaga). O núcleo tem CANVAS QUADRADO com a criatura
  // centralizada, e a âncora é outra em relação ao estático recortado (nucleo.png 122×122).
  //
  // ⚠️ O GUARDIÃO NÃO TEM MAIS ESSA ARMADILHA (15/09, B1): a arte nova DELE (PixelLab 9436240c) sai
  // com estático, respiração, morte e destruído no MESMO quadro de 256², montados sem recorte por
  // `scripts/_f4/_instalar-guardiao.mjs`. Um offset vale para os quatro.
  guardiaoIdleSheet: { path: 'sprites/guardiao-idle-sheet.png', w: 256, h: 256 },
  // A MORTE (9f, a que termina OCA). Toca na troca para a 2ª forma, com as explosões do motor por
  // cima e o `guardiaoDestruido` no fim — a decisão dele de 15/09 (ver `BossNucleo.trocarParaCoracao`).
  guardiaoMorteSheet: { path: 'sprites/guardiao-morte-sheet.png', w: 256, h: 256 },
  nucleoBeatSheet: { path: 'sprites/nucleo-beat-sheet.png', w: 128, h: 128 },
  // A PORTA DO DUTO RESPIRANDO (20/09, M4): 8 quadros de 64×112, só a FENDA pulsa.
  //
  // ⚠️ ASSADA, NÃO GERADA — `scripts/_f4/_assar-porta-nucleo.mjs`, e por duas razões. A primeira é
  // a de sempre nesta fase (o gerador não obedece limite de cor: *"pulsar = clarear"*, e o núcleo
  // volta estourado em branco). A segunda é só desta peça: gerar 8 quadros redesenharia a chapa
  // inteira, e os ~40 REBITES iam rastejar 1px por quadro. A chapa sai IDÊNTICA nos 8; o que
  // respira é só a brasa, e o pico é o estático que ele aprovou — o pulso só DESCE.
  portaNucleoSheet: { path: 'sprites/f4-porta-nucleo-sheet.png', w: 64, h: 112 },
  // O PREDADOR (16/09, B3): a 2ª forma do chefão final — o que sai de dentro do guardião. Todos os clipes
  // no MESMO quadro de 256² (v3 do PixelLab a partir de PNG local), montados sem recorte por
  // `scripts/_f4/_instalar-predador.mjs`. Um offset por POSE vale para os clipes que partem dela.
  predadorUrroSheet: { path: 'sprites/predador-urro-sheet.png', w: 256, h: 256 },
  predadorGiroSheet: { path: 'sprites/predador-giro-sheet.png', w: 256, h: 256 },
  predadorPuloSheet: { path: 'sprites/predador-pulo-sheet.png', w: 256, h: 256 },
  predadorAndarSheet: { path: 'sprites/predador-andar-sheet.png', w: 256, h: 256 },
  predadorQuatroSheet: { path: 'sprites/predador-quatro-sheet.png', w: 256, h: 256 },
  predadorCorridaSheet: { path: 'sprites/predador-corrida-sheet.png', w: 256, h: 256 },
  predadorAgarraSheet: { path: 'sprites/predador-agarra-sheet.png', w: 256, h: 256 },
  predadorTetoBalancoSheet: { path: 'sprites/predador-teto-balanco-sheet.png', w: 256, h: 256 },
  predadorSlashSheet: { path: 'sprites/predador-slash-sheet.png', w: 256, h: 256 },
  predadorRasgoSheet: { path: 'sprites/predador-rasgo-sheet.png', w: 256, h: 256 },
  predadorLavaSheet: { path: 'sprites/predador-lava-sheet.png', w: 256, h: 256 },
  predadorTetoLavaSheet: { path: 'sprites/predador-teto-lava-sheet.png', w: 256, h: 256 },
  // A SERRA DO GUARDIÃO (19/09, a skill nova da 1ª forma). Montadas por `scripts/_f4/_instalar-serra.mjs`
  // a partir da candidata `a-disco`. Ver `src/entities/SerraGuardiao.ts`.
  serraGiroSheet: { path: 'sprites/serra-giro-sheet.png', w: 96, h: 96 },
  serraTravadaSheet: { path: 'sprites/serra-travada-sheet.png', w: 96, h: 96 },
  // O FIM DO PREDADOR (17/09, rodada 5): o piso rasgando e a poça de lava, assados em PIXEL na resolução
  // nativa por `scripts/_f4/_assar-fim-f4.mjs` — a paleta sai da própria faixa do chão da arena. Ver
  // `src/entities/fimDoPredador.ts`.
  // A SOLEIRA DO NÚCLEO (21/09, o esfíncter): as três assadas em PIXEL na resolução nativa por
  // `_assar-gas.mjs`, `_assar-cone.mjs` e `_assar-gore.mjs`. Ver `src/entities/esfincter.ts`.
  //
  // ⚠️ O GORE SAI RECORTADO DOS PIXELS DA PRÓPRIA GARGANTA, e é daí que vem a garantia de paleta:
  // a peça é a fonte da própria luz, então não existe como o destroço destoar da criatura de que
  // ele saiu. É o mesmo princípio do `_assar-porta-nucleo`, onde o pico do pulso É o estático.
  // ⚠️ A GARGANTA RESPIRANDO, COM O ESTOURO DE BRANCO CORRIGIDO — chave NOVA, e a razão é medida.
  // A `garganta-idle` crua caiu na armadilha que este projeto já documentou duas vezes: o gerador
  // não obedece limite de cor, e "pulsar" virou "clarear". No quadro 6 ela tem 10,2% de px claros
  // contra 0,8% do estático — o miolo não está aceso, está BRANCO PURO. Na cutscene do hangar
  // passa; no DUTO, a câmara mais escura das quatro, vira a coisa mais brilhante da tela.
  // `_assar-garganta-viva.mjs` põe um teto e puxa a luz de volta para o magenta da goela.
  //
  // ⚠️ A `garganta-idle` ORIGINAL FICA INTOCADA: a cutscene 3 está mergeada e aprovada com ela.
  gargantaVivaSheet: { path: 'sprites/garganta-viva-sheet.png', w: 97, h: 171 },
  gargantaMortaSheet: { path: 'sprites/garganta-morta-sheet.png', w: 97, h: 171 },
  // AS MANGUEIRAS DA SOLEIRA (21/09, 2ª volta): substituem o `f4Cano2`, que era um cano INTEIRO e
  // lia como encanamento em ordem. Pedido dele: *"quero mangueiras soltas e soltando o gás,
  // parecidas com a do guardião"* — e é a mesma língua mesmo, os cabos arrancados do guardião.
  //
  // ⚠️ A ARTE JÁ TRAZ A PLUMA. O gás não é só o `f4GasSheet` colado por cima: a peça vaza sozinha,
  // então a NUVEM tem de onde sair. Foi a queixa contra o portão da cutscene 3 que ensinou isto —
  // efeito sem causa lê como adesivo.
  //
  // ⚠️ E ELAS NÃO CLAREARAM, o que é raro neste gerador. Medido pelo `_instalar-mangueiras.mjs`:
  // 0% dos px acima do teto do quadro parado, nos 9 quadros. O assador fica no lugar mesmo assim —
  // ele é a rede, e regerar sem ele traria o estouro de volta sem ninguém notar.
  // ⚠️ 32×44, METADE DA FONTE — pedido dele depois de jogar (*"diminua quase pela metade do
  // tamanho do sprite"*): a 64×88 elas competiam com a criatura. A redução é por 2 exato, que é o
  // único fator que mapeia 4 px em 1 sem inventar cor; 0,55 ou 0,6 borrariam a linha do metal.
  // Assada no `_instalar-mangueiras.mjs`, então a peça vive em ESCALA 1 no jogo.
  f4MangueirasSheet: { path: 'sprites/f4-mangueiras-sheet.png', w: 32, h: 44 },
  f4GasSheet: { path: 'sprites/f4-gas-sheet.png', w: 128, h: 176 },
  f4ConeSheet: { path: 'sprites/f4-cone-sheet.png', w: 256, h: 176 },
  // ⚠️ 53×76 POR CÉLULA, E OS PEDAÇOS VÊM DO PIXELLAB — a 1ª versão eram recortes MEUS de 24×24
  // tirados da criatura por script, e ele reprovou jogando: liam como estilhaço genérico, não como
  // bicho. Os de agora são placas de casco rasgadas, presas curvas e segmentos do anel de dentes.
  // Recortados por ILHA (o `_instalar-destroco.mjs`), porque uma grade fixa cortaria caco ao meio.
  f4GoreSheet: { path: 'sprites/f4-gore-sheet.png', w: 53, h: 76 },

  // O SANGUE DELA (22/09). Três peças assadas em pixel por `_assar-sangue.mjs`, na resolução
  // nativa e na paleta MEDIDA da criatura — magenta sobre roxo quase preto, nunca o carmim do
  // predador. Ver o cabeçalho do assador para o porquê de não serem `Graphics`.
  f4SangueSheet: { path: 'sprites/f4-sangue-sheet.png', w: 16, h: 10 },
  f4RespingoSheet: { path: 'sprites/f4-respingo-sheet.png', w: 44, h: 28 },

  // AS VÍSCERAS (22/09, PixelLab, a partir da original). 13 cacos de 17 a 39px: segmentos do anel
  // de dentes com a matéria ainda presa, sacos com nervura, membranas rasgadas e cordões compridos.
  // ⚠️ SÃO A ALTERNATIVA AO `f4GoreSheet`, não a substituição: a folha aprovada é de CASCO, esta é
  // de MATÉRIA MOLE. Qual das duas entra é a escolha dele entre as três variações de 22/09.
  f4VisceraSheet: { path: 'sprites/f4-viscera-sheet.png', w: 39, h: 61 },
  f4RachaSheet: { path: 'sprites/f4-racha-sheet.png', w: 384, h: 30 },
  f4LavaSheet: { path: 'sprites/f4-lava-sheet.png', w: 384, h: 36 },
  // FATIA 8 · A CUTSCENE FINAL. P1: as rachaduras da convulsão, assadas com a paleta da câmara D
  // (`scripts/_f8/_assar-convulsao.mjs`). 8 estágios cumulativos sobre a pintura inteira.
  f8ConvulsaoSheet: { path: 'sprites/f8-convulsao-sheet.png', w: 384, h: 216 },
  f4Destroco: { path: 'sprites/f4-destroco.png', w: 12, h: 10 },
  predadorMorteSheet: { path: 'sprites/predador-morte-sheet.png', w: 256, h: 256 },

  // AS DUAS PEÇAS-ASSINATURA DO CENÁRIO DA F4, RESPIRANDO (13/09). O coração no chão e o
  // maquinário no teto — as mesmas peças estáticas de sempre (`orgao`/`maquinario`), agora com o
  // que acende passeando. 9 quadros de 122×122, assados por `scripts/_f4/_assar-anim.mjs`.
  //
  // ⚠️ O QUADRO 0 É O SPRITE ESTÁTICO, e isso não é coincidência: o assador ancora a animação
  // inteira nele (média 42,5 nos dois). A peça respira EM VOLTA do que já foi aprovado jogando,
  // em vez de trocar de aparência.
  //
  // ⚠️ E O ASSADOR EXISTE PORQUE O GERADOR NÃO OBEDECE LIMITE DE COR: duas rodadas pediram "nunca
  // branco" com todas as letras e as duas voltaram com o núcleo estourado. O teto se impõe no
  // disco, onde é determinístico. Ver o cabeçalho do script.
  //
  // ⚠️ AS DUAS PEÇAS FORAM REGERADAS EM 14/09, VERTICAIS. A arte de 13/09 era radial — tubos para
  // todos os lados — e os laterais ficavam no ar mesmo dissolvidos: *"os tubos dos maquinários
  // ainda aparecem sim, podemos tentar gerar novos assets com tubos somente em cima e embaixo"*.
  // Objetos PixelLab `7d5df865` (o coração em coluna, 9 quadros de 96×128) e `a4f7f9e0` (o
  // maquinário, 6 quadros de 96×128: os quadros 6–8 do gerador estouravam a brasa num halo que a
  // trava de brilho transformava em mancha bege). Os dois são COLUNAS, do chão ao teto — ver o
  // `maquinario` no `Parallax`. Brutos em `assets/raw/anim-
  // orgao-v` e `anim-maquinario-v`.
  orgaoAnimSheet: { path: 'sprites/orgao-anim.png', w: 96, h: 128 },
  maquinarioAnimSheet: { path: 'sprites/maquinario-anim.png', w: 96, h: 128 },
  // O Leviatã-BALEIA (o mesmo do menu) com fissuras pulsando e explosões na espinha (cutscene
  // final, beat 3). ⚠️ CANVAS QUADRADO 144×144 com a criatura CENTRALIZADA — a âncora é outra
  // em relação ao sprite estático `leviathanWhaleDying` (140×87 recortado). O centro visual do
  // bicho no quadro é MEDIDO no PNG (bbox do alfa, média dos quadros) — a Interlude4 posiciona
  // por ele (Interlude4Scene.LEVI_VIS_*).
  leviathanWhaleDyingSheet: { path: 'sprites/leviathan-whale-dying-sheet.png', w: 144, h: 144 },

  // O LEVIATÃ VIVO (menu "O DESPERTAR"): o objeto canônico biomecânico com a lava das costelas
  // pulsando num ritmo cardíaco e o corpo ondulando. É a cara do jogo. Célula quadrada 116×116
  // (o tamanho impresso por anim-sheet.mjs); 9 quadros lado a lado.
  leviathanAliveSheet: { path: 'sprites/leviathan-alive-sheet.png', w: 116, h: 116 },

  // O LEVIATÃ que NADA pelo menu "O DESPERTAR": a baleia BLINDADA com as costelas expostas
  // (objeto `e9f7e0dc`), animada num ciclo de ondulação. Atravessa o céu UMA vez e some atrás da
  // lua. Célula quadrada 116×116 (o tamanho impresso por anim-sheet.mjs); 17 quadros lado a lado.
  leviathanSwimSheet: { path: 'sprites/leviathan-swim-sheet.png', w: 116, h: 116 },

  // O EMBLEMA do jogo que SURGE quando o Leviatã some atrás da lua (menu). Brasão circular que
  // faísca em loop. Célula 64×64; 9 quadros lado a lado.
  menuLogoSheet: { path: 'sprites/menu-logo-sheet.png', w: 64, h: 64 },

  // O GOLFINHO BIOMECÂNICO — o mini-chefão da câmara B da Fase 4 (spec 2026-09-11). Animações
  // PixMiniMax aprovadas pelo Henrique, 80×80 com o bicho virado para a ESQUERDA (o sentido dos
  // inimigos). ⚠️ O QUADRO NÃO É O CORPO: o golfinho ocupa ~42×30 do quadro, e a hitbox é fixada à
  // mão no `Golfinho`. ⚠️ A bala que as animações traziam desenhada foi APAGADA por
  // `scripts/_f4/_golfinho-sheets.mjs` — rodar de novo a cada reinstalação.
  golfinhoNado: { path: 'sprites/golfinho-nado.png', w: 80, h: 80 },
  golfinhoFlip: { path: 'sprites/golfinho-flip.png', w: 80, h: 80 },
  golfinhoCambalhota: { path: 'sprites/golfinho-cambalhota.png', w: 80, h: 80 },
};

/** Registra os quadros de uma animação no mapa de ART. */
function animFrames(prefix: string, file: string): Record<string, string> {
  return Object.fromEntries(
    Array.from({ length: FRAMES[prefix] ?? 0 }, (_, i) => [
      `${prefix}${i}`,
      `sprites/${file}-${i}.png`,
    ]),
  );
}

/**
 * Arte final do PixelLab. Ausente = cai no placeholder gerado em runtime.
 *
 * As chaves terminadas em número são VARIANTES (ver src/art.ts): `spire`, `spire2`, `spire3`
 * são a mesma coisa no jogo, com silhuetas diferentes. Um lote do PixelLab devolve dezenas de
 * candidatos pelo mesmo preço — quando mais de um fica bom, todos entram.
 */
const ART: Record<string, string> = {
  ship: 'sprites/ship.png',
  // As naves escolhíveis na interlude (src/ships.ts). Sem PNG, a nave cai na `ship` padrão —
  // o jogo roda com as três, e a arte entra depois.
  ship2: 'sprites/ship-2.png',
  ship3: 'sprites/ship-3.png',
  // A 4ª nave: a ALIENÍGENA (o Arauto), encontrada na doca do cinturão. Casco orgânico verde —
  // ela é a única coisa do róster que NÃO é humana, e a cor grita isso antes da silhueta.
  ship4: 'sprites/ship-4.png',

  // ─── O RÓSTER v2: as 7 naves de perfil (src/ships.ts). ───
  shipJato: 'sprites/ship-jato.png',
  shipVerde: 'sprites/ship-verde.png',
  shipCreme: 'sprites/ship-creme.png',
  shipCinza: 'sprites/ship-cinza.png',
  shipBranca: 'sprites/ship-branca.png',
  shipCanhoes: 'sprites/ship-canhoes.png',
  shipAlien2: 'sprites/ship-alien2.png',
  ...animFrames('shipJatoAnim', 'ship-jato-anim'),
  ...animFrames('shipVerdeAnim', 'ship-verde-anim'),
  ...animFrames('shipCremeAnim', 'ship-creme-anim'),
  ...animFrames('shipCinzaAnim', 'ship-cinza-anim'),
  ...animFrames('shipBrancaAnim', 'ship-branca-anim'),
  ...animFrames('shipCanhoesAnim', 'ship-canhoes-anim'),
  ...animFrames('shipAlien2Anim', 'ship-alien2-anim'),
  ...animFrames('shipArautoAnim', 'ship-arauto-anim'),

  boss: 'sprites/boss.png',
  bossAir: 'sprites/boss-air.png',
  groundTile: 'sprites/ground-tile.png',

  // ─── Camadas de FUNDO do passe visual (2026-07-18). Sem placeholder de propósito: fundo
  // opcional — sem o PNG, o addLayer do Parallax pula a camada e nada quebra. ───
  skyline: 'sprites/skyline.png',
  skyline2: 'sprites/skyline-2.png',
  derelict: 'sprites/derelict.png',
  cometSky: 'sprites/comet-sky.png',
  cometSky2: 'sprites/comet-sky-2.png',

  // ─── FASE 3 ───
  nebula3: 'sprites/nebula3.png',
  nebula32: 'sprites/nebula3-2.png',
  nebula33: 'sprites/nebula3-3.png',
  serpente: 'sprites/serpente.png',
  serpente2c: 'sprites/serpente-2c.png',
  serpente1c: 'sprites/serpente-1c.png',
  serpenteFusao: 'sprites/serpente-fusao.png',

  // ⚠️ O NÚCLEO DA FUSÃO — a única peça de ARTE da cena da fusão; o resto dela é tween.
  // A divisão segue a lição que esta fatia pagou: o v3 do PixelLab leu "bater para cima e para
  // baixo" como GIRAR. Anel que cresce, fio que percorre um caminho e implosão são
  // transformação geométrica e vivem melhor em código; textura é o que código não faz.
  //
  // ⚠️ E ELE É DE UMA COR SÓ, DE PROPÓSITO. A primeira versão da spec pedia as TRÊS cores
  // (ciano/verde/laranja) vazando dele. Errado por dois motivos: três cores em 52px viram lama,
  // e narrativamente o núcleo é justamente onde as três viram UMA. As três cores vivem nos FIOS
  // que chegam nele; ele é o resultado.
  fusaoNucleo: 'sprites/fusao-nucleo.png',
  aranha: 'sprites/aranha.png',
  aguaViva: 'sprites/agua-viva.png',
  ...animFrames('serpenteAnim', 'serpente-anim'),
  ...animFrames('serpente2cAnim', 'serpente-2c-anim'),
  ...animFrames('serpente1cAnim', 'serpente-1c-anim'),
  ...animFrames('serpenteFusaoAnim', 'serpente-fusao-anim'),
  ...animFrames('aranhaAnim', 'aranha-anim'),
  ...animFrames('aranhaJumpAnim', 'aranha-jump-anim'),
  ...animFrames('aguaVivaAnim', 'agua-viva-anim'),

  // O CASCO DO LEVIATÃ (Fase 3, Ato 2) — 6 artes do PixelLab (Henrique, 2026-08-28), 116²,
  // recortadas para 114×66 por `scripts/instalar-casco.mjs`. Fontes em `assets/raw/casco-*.png`.
  //
  // ⚠️ ESTAS SUBSTITUEM AS SETE PEÇAS DE 72² DE 25/08, e o motivo é COR. Aquelas voltaram do
  // gerador marrom-oliva (#32312b, R−B +7) contra um rabo e um modelo original frios (#19222a,
  // R−B −17) — o Henrique jogou duas vezes e reclamou nas duas de que "o casco está de outra
  // cor". A rodada anterior tapou o buraco com `tint 0x84c0ff`; estas nascem no canon e o tint
  // sumiu junto. A régua é `scripts/_medir-paleta.mjs`.
  //
  // QUATRO famílias, e elas não são decoração: são a ANATOMIA em ordem. O Parallax escolhe entre
  // elas pela DISTÂNCIA já percorrida sobre o bicho, não por sorteio — blindagem na cauda,
  // COSTELA no meio, maquinário perto da cabeça. Ver `buildNebula()` / `familiaDoCasco()`.
  //
  //   cascoPlaca     blindagem hexagonal lisa — a chapa, o trecho "só casco"
  //   cascoEscama    couro escamado com costelas assomando — a pele da cauda
  //   cascoCostela   a caixa torácica: osso grande atravessando a faixa (+ variante com maquinário)
  //   cascoDuto      dutos, conduítes e o nó azul aceso — a víscera técnica da proa
  cascoPlaca: 'sprites/casco-placa.png',
  cascoEscama: 'sprites/casco-escama.png',
  cascoCostela: 'sprites/casco-costela.png',
  cascoCostela2: 'sprites/casco-costela2.png',
  cascoDuto: 'sprites/casco-duto.png',
  cascoDuto2: 'sprites/casco-duto2.png',

  // O QUE VIVE EM CIMA DO CASCO (Fase 3, Ato 2). O Ato 2 sorteava `turret`/`radar`/`silo` — a
  // colônia da FASE 1 reaproveitada. Estas duas são a defesa do PRÓPRIO Leviatã, geradas com o
  // Leviatã armored como referência de estilo (`assets/raw/ref-leviata-armored.png`).
  //
  // ⚠️ O `lancaMisseis` foi gerado NA SEGUNDA TENTATIVA. A primeira pedia "missile launcher
  // mounted on a WHALE HULL" com a baleia de referência, e as 16 candidatas voltaram sendo A
  // BALEIA com um canhão nas costas — a mesma armadilha da doca da Fatia 4 (arte gerada a
  // partir da coisa em que ela se apoia volta como cópia dessa coisa). A que funcionou não
  // menciona baleia em lugar nenhum e usa o prefixo de estilo da casa, sem referência.
  // A tira que esconde o PÉ dos props no casco — o `groundFront` da Fase 3. Gerada por
  // `scripts/casco-frente.mjs` a partir da peça lisa da base. Ver `buildNebula()`.
  cascoFrente: 'sprites/casco-frente.png',

  lancaMisseis: 'sprites/lanca-misseis.png',
  lancaMisseis2: 'sprites/lanca-misseis2.png',
  respiradouro: 'sprites/respiradouro.png',
  respiradouro2: 'sprites/respiradouro2.png',
  respiradouro3: 'sprites/respiradouro3.png',

  // O RABO do Leviatã: a nadadeira traseira, em perfil lateral, que chega na virada do Ato 1
  // para o Ato 2 e se segura na direita batendo.
  //
  // ⚠️ SÓ O ESTÁTICO, E DE PROPÓSITO. A animação do PixelLab foi gerada e DESCARTADA: o v3 leu
  // "bater para cima e para baixo" como "girar", e os quadros 4 a 8 rodavam a nadadeira em
  // torno do próprio eixo — o bicho virava uma hélice. A batida vive em código, como rotação em
  // torno do pedúnculo (ver `GameScene.raboDoLeviata()`), que é o movimento real de uma baleia
  // e não tem como dar a volta.
  raboLeviata: 'sprites/rabo-leviata.png',

  ...animFrames('bossIdleAnim', 'boss-idle-anim'),
  ...animFrames('bossFireAnim', 'boss-fire-anim'),
  ...animFrames('bossAirAnim', 'boss-air-anim'),
  ...animFrames('bossAirFireAnim', 'boss-air-fire-anim'),
  ...animFrames('bossTakeoffAnim', 'boss-takeoff-anim'),
  ...animFrames('shipAnim', 'ship-anim'),
  ...animFrames('droneAnim', 'drone-anim'),
  ...animFrames('gunshipAnim', 'gunship-anim'),
  ...animFrames('turretAnim', 'turret-anim'),
  ...animFrames('buildingAnim', 'building-anim'),
  ...animFrames('baseAnim', 'base-anim'),
  ...animFrames('radarAnim', 'radar-anim'),
  ...animFrames('cometAnim', 'comet-anim'),
  ...animFrames('blastAnim', 'blast-anim'),

  ...animFrames('kamikazeAnim', 'kamikaze-anim'),
  ...animFrames('scoutAnim', 'scout-anim'),
  ...animFrames('carrierAnim', 'carrier-anim'),
  ...animFrames('sensorAnim', 'sensor-anim'),
  ...animFrames('capitaniaAnim', 'capitania-anim'),
  ...animFrames('capitaniaFireAnim', 'capitania-fire-anim'),
  ...animFrames('minaAnim', 'mina-anim'),
  ...animFrames('flakAnim', 'flak-anim'),

  // O RÓSTER. Cada inimigo tem a SUA silhueta — o batedor, o kamikaze e o cargueiro deixaram de
  // ser o drone e a canhoneira recolorados (ver src/systems/EnemySystem.ts).
  enemyDrone: 'sprites/enemy-drone.png',
  // SEM `enemyDrone2`: a variante 2 é a arte VELHA do drone. Com ela registrada, `pickVariant`
  // sorteava entre o pod novo e o inseto antigo, e o enxame virava duas facções na mesma tela.
  // A variante volta quando houver um segundo candidato do lote NOVO.
  enemyGunship: 'sprites/enemy-gunship.png',
  enemyScout: 'sprites/enemy-scout.png',
  enemyKamikaze: 'sprites/enemy-kamikaze.png',
  enemyCarrier: 'sprites/enemy-carrier.png',
  // SEM `enemyCarrier2`, pela mesma razão que o drone não tem a dele: a variante 2 é a arte VELHA
  // do cargueiro (julho). Com ela registrada, `pickVariant` sortearia metade dos cargueiros com o
  // sprite antigo lilás — e sem animação, porque a animação só toca na variante BASE.
  // A variante volta quando houver um segundo candidato da arte NOVA.

  // A FACÇÃO DO CINTURÃO (Fase 2, passe visual 2026-08-08): canhoneira/batedor trocam de pele
  // por fase (STAGE_2_SKIN no EnemySystem) — sem este PNG, a Fase 2 cai de volta na arte biomec
  // de sempre (guarda de textura).
  enemyScoutCinturao: 'sprites/enemy-scout-cinturao.png',
  ...animFrames('scoutCinturaoAnim', 'scout-cinturao-anim'),
  enemyGunshipCinturao: 'sprites/enemy-gunship-cinturao.png',
  ...animFrames('gunshipCinturaoAnim', 'gunship-cinturao-anim'),
  // A BOLA de energia que a canhoneira do cinturão cospe (ver STAGE_2_SKIN.canhoneira.bullet):
  // o traço `bolt2` sumia no fundo escuro da Fase 2. Sem este PNG, o tiro cai no traço de sempre.
  bulletOrb: 'sprites/bullet-orb.png',
  ...animFrames('bulletOrbAnim', 'bullet-orb-anim'),

  turret: 'sprites/turret.png',
  turret2: 'sprites/turret-2.png',

  building: 'sprites/building.png',
  building2: 'sprites/building-2.png',
  building3: 'sprites/building-3.png',

  spire: 'sprites/spire.png',
  spire2: 'sprites/spire-2.png',
  spire3: 'sprites/spire-3.png',

  // Projéteis: um sprite por arma. Os inimigos usam o mesmo, tingido de magenta.
  bolt: 'sprites/bolt.png',
  bolt2: 'sprites/bolt-2.png',
  bolt3: 'sprites/bolt-3.png',
  flash: 'sprites/flash.png',
  // Projéteis de fogo (chefão e shotgun), animados.
  comet: 'sprites/comet.png',
  blast: 'sprites/blast.png',
  // O MÍSSIL das torres de solo (TerrainSystem). Placeholder de piloto: a arte do PixelLab
  // entra depois COM ESTA MESMA CHAVE, só copiando o PNG para cá. Desenhado apontando para a
  // DIREITA, como todo sprite do jogo — o voo o gira (setRotation).
  missile: 'sprites/missile.png',

  // ⚠️ O MÍSSIL DA COLÔNIA — a ordenança do CHEFÃO DA FASE 1 na fase aérea, e ele existe porque
  // o `missile` acima estava vestindo os dois. O Henrique topou com isso jogando: *"a segunda
  // fase do boss da Fase 1 está atirando o mesmo míssel que o canhão do casco"*. É a QUARTA vez
  // nesta campanha que duas coisas diferentes dividiam um projétil só, e a terceira em que quem
  // achou foi ele, jogando.
  //
  // A separação é de FICÇÃO antes de ser de arte, a mesma regra da munição da torre: um
  // lança-mísseis do Leviatã dispara ordenança do bicho — o `missile` é OSSO, corpo claro e
  // chama laranja. A cidadela da colônia dispara ordenança industrial — corpo gunmetal escuro e
  // chama FRIA, a mesma família do `shotTorre` que a torre de solo dela acabou de ganhar.
  //
  // As duas se separam em DOIS eixos ao mesmo tempo, e isso foi escolhido: valor do corpo
  // (claro contra escuro) e temperatura da chama (laranja contra azul). Um eixo só se perde
  // quando o projétil está a 27px voando.
  missilColonia: 'sprites/missil-colonia.png',

  // Cápsulas de arma (o "emblema" que fica flutuando).
  capsule: 'sprites/capsule.png',
  capsule2: 'sprites/capsule-2.png',

  // A colônia: bases, silos, antenas e destroços. Sorteados pelo roteiro da fase.
  base: 'sprites/base.png',
  base2: 'sprites/base-2.png',
  silo: 'sprites/silo.png',
  silo2: 'sprites/silo-2.png',
  radar: 'sprites/radar.png',
  wreck: 'sprites/wreck.png',
  wreck2: 'sprites/wreck-2.png',

  // O cinturão da Fase 2. A rocha e a mina ainda são PLACEHOLDER procedural — a arte do
  // PixelLab entra só copiando os PNGs para cá: `pickVariant` acha as variantes sozinho e
  // nenhuma linha de código muda (docs/ASSETS.md).
  asteroid: 'sprites/asteroid.png',
  asteroid2: 'sprites/asteroid-2.png',
  asteroid3: 'sprites/asteroid-3.png',
  mina: 'sprites/mina.png',
  mina2: 'sprites/mina-2.png',

  // A MINA SENSORA: acorda quando você passa perto e estilhaça (src/systems/DebrisSystem.ts).
  // Olho de escaneamento MAGENTA — a cor de perigo. A primeira leva veio com o olho CIANO, que é
  // a cor do JOGADOR: um perigo pintado com a cor do aliado mente sobre o que ele é, e foi
  // regerada por isso (docs/ASSETS.md).
  sensorMine: 'sprites/sensor-mine.png',
  sensorMine2: 'sprites/sensor-mine-2.png',

  // DESTROÇO SOLTO: casco rasgado à deriva. NÃO é a `wreck` da Fase 1 — aquela é uma nave caída,
  // desenhada assentada no chão da lua, e no vácuo ela boiava com uma base reta embaixo.
  destroco: 'sprites/destroco.png',
  destroco2: 'sprites/destroco-2.png',
  destroco3: 'sprites/destroco-3.png',

  // A CÁPSULA DE FLAK da Capitânia: ela ARREMESSA isto num ponto da tela, e o estouro é que
  // cospe os estilhaços (src/entities/BossCapitania.ts).
  flakShell: 'sprites/flak-shell.png',
  // A CAPITÂNIA: o chefão da Fase 2. Sem PNG ainda — cai no placeholder.
  capitania: 'sprites/capitania.png',
  // A AURORA: a capitânia da SUA frota, onde a nave pousa na interlude. Ela implode ali —
  // e é o cadáver dela que vira o cinturão da Fase 2.
  carrier: 'sprites/carrier.png',

  // A DOCA KEPLER-9: a estação de mineração encravada na rocha, onde a nave pousa na 2ª cutscene
  // e onde o ARAUTO (a nave alienígena) está encalhado. É a imagem que o Henrique ESCOLHEU (o
  // outpost largo e denso, 160×160) — ver assets/raw/prompts.json.
  //
  // ⚠️ A linha da PISTA é MEDIDA neste PNG (Interlude2Scene.PAD_ROW = 90, onde as marcações de
  // pouso VERMELHAS aparecem). Trocar a arte OBRIGA a remedir — chutar a linha do convés já fez a
  // nave pousar no vazio, 30px abaixo da tela. Ferramenta: node scripts/find-pad.mjs doca 80.
  doca: 'sprites/doca.png',

  // A DOCA DO CINTURÃO — a 2ª arte (PixelLab c166782d), corrigida no tom (ganho ×1.5) por
  // `scripts/_cut2-doca2.mjs`. SEM feather nas bordas: a arte já vem com cutout e silhueta
  // próprios (decisão do Henrique, "tire todo o esmaecer da imagem") — feather era remédio da
  // 1ª arte (906bb897), um recorte retangular que já foi substituído.
  // ⚠️ NUNCA renomear para `doca2`: o pickVariant trataria isso como VARIANTE e sortearia entre
  // a arte nova e a velha a cada spawn. Foi o que pegou o cargueiro na Fatia 3.
  docaCinturao: 'sprites/doca-cinturao.png',

  // O HANGAR DO LEVIATÃ: o interior onde a nave danificada cai na 3ª cutscene (160×160, escolha
  // do Henrique — lote 1 do prompts.json). ⚠️ As JANELAS são VAZADAS (scripts/vazar-janelas.mjs,
  // rodar de novo a cada reinstalação): o starfield/parallax da cena aparece ATRAVÉS delas. A
  // linha do convés é MEDIDA (Interlude3Scene.DECK_ROW = 138, a faixa vermelha de largura total;
  // ferramenta: node scripts/find-pad.mjs hangar 80). Trocar a arte OBRIGA a remedir.
  hangar: 'sprites/hangar.png',

  // ─── OS QUATRO FUNDOS DA FASE 4 (Fatia 7, arte do Henrique) ───
  // A jornada anatômica: o hangar engolido → a caixa torácica → o duto → a câmara do núcleo.
  // Quem troca de um para o outro é o ROTEIRO (evento `cenario` no STAGE_4), não o Parallax.
  //
  // ⚠️ 384×216 = a resolução EXATA do jogo, ASSADA no arquivo
  // (`scripts/instalar-fundos-f4.mjs`), e desenhados em escala 1. É a grade de pixel casando com
  // a da tela que dá a PROFUNDIDADE — pintura esticada em runtime achata o fundo. Reduzir pode;
  // AMPLIAR, nunca: se ficar pequena para o enquadramento, gere de novo maior.
  //
  // Sem placeholder: sem eles, o `interior` cai nas camadas procedurais de sempre.
  paintBgF4a: 'sprites/paint-bg-f4-a.png',
  paintBgF4b: 'sprites/paint-bg-f4-b.png',
  paintBgF4c: 'sprites/paint-bg-f4-c.png',
  paintBgF4d: 'sprites/paint-bg-f4-d.png',

  // A BALA DO GOLFINHO: o tiro vermelho que o Henrique aprovou na animação do flip, recortado,
  // virado para a direita e reduzido a 13×9 — o quadro do `bolt2`, de onde a hitbox do pool vem.
  shotGolfinho: 'sprites/shot-golfinho.png',

  // A SERRA parada — o motor cai nela se as folhas faltarem (arte entra asset por asset).
  serraGuardiao: 'sprites/serra-guardiao.png',
  // O GLÓBULO da salva do guardião (19/09). Substitui o `bolt3` tingido de laranja, que era um projétil
  // genérico: este é do mesmo material da serra, e já vem com a própria cor (⚠️ NÃO tingir).
  globuloGuardiao: 'sprites/globulo-guardiao.png',

  // O NÚCLEO: o coração blindado do Leviatã, chefão FINAL (Fase 4). Escolha do Henrique
  // (cf5b3e43, 128px → 122×122 instalado). ⚠️ A FERIDA (a zona vulnerável) é MEDIDA no PNG:
  // x=52..91 y=56..87 (node scripts/find-pad.mjs nucleo 0 — os vermelhos de y<52 são luzes da
  // blindagem, não alvo). Trocar a arte OBRIGA a remedir (BossNucleo.CORE_OFF_*).
  nucleo: 'sprites/nucleo.png',

  // O GUARDIÃO: a 1ª forma do chefão final — a besta blindada ENROLADA em volta da massa
  // viva. A ARTE NOVA DELE (15/09, B1 da Fatia 7): PixelLab 9436240c, 256×256, casco escuro com
  // a massa exposta — substitui a 03ef8c07 (256×227, casco verde-oliva).
  // ⚠️ A massa vermelha (alvo) é MEDIDA: x=115..192 y=109..176, centroide 152,141
  // (`scripts/_f4/_medir-guardiao.mjs`). Trocar a arte OBRIGA a remedir (BossNucleo.G_CORE_OFF_*).
  guardiao: 'sprites/guardiao.png',
  // O último quadro da morte — o casco partido em anel, o único em que a silhueta QUEBRA.
  guardiaoDestruido: 'sprites/guardiao-destruido.png',
  // O PREDADOR, as três POSES (16/09, B3). Miolo MEDIDO (`scripts/_f4/_medir-predador.mjs`), offset ao
  // centro do quadro VIRTUAL: S +6,−5 · luta −23,−3 · pendurado −25,−24 (ver `Predador.QUADRO`) (ver `Predador.MIOLO`).
  predadorS: 'sprites/predador-s.png',
  predadorLuta: 'sprites/predador-luta.png',
  predadorTeto: 'sprites/predador-teto.png',

  // ─── O INTERIOR ORGÂNICO DA FASE 4 (2026-07-21) ───
  // Os corredores do Leviatã eram picos e rochas de superfície tingidos — pedra lunar dentro
  // de um bicho VIVO, o lugar mentindo sobre o que é. O interior dele é costela biônica,
  // pedaço de órgão e maquinário pesado (a referência do Henrique: giger industrial).
  // Sem placeholder: sem o PNG, o corredor cai nas colunas de rocha de sempre.
  costela: 'sprites/costela.png',
  orgao: 'sprites/orgao.png',
  maquinario: 'sprites/maquinario.png',

  // ─── AS PEÇAS QUE SAÍRAM DAS 64 CANDIDATURAS DELE (12/09) ───
  //
  // ⚠️ ELAS FORAM REPROVADAS COMO FAIXA E APROVADAS COMO PROP, e a diferença é a pergunta. Faixa
  // precisa sangrar nas três bordas com topo reto — medido, nenhuma das 64 tem (o sangramento
  // lateral varia de 0% a 100% da altura, sem regra). Mas `create_1_direction_object` faz bem
  // exatamente o que a faixa não queria: RECORTAR um objeto do fundo. Como prop, o recorte é a
  // virtude. Ver `scripts/_f4/_assar-cand.mjs`.
  //
  // A PONTE é a assinatura da câmara A — a doca engolida: dois pilares de convés industrial com
  // guarda-corpo e lâmpada âmbar, tomados pelas veias do bicho, e um VÃO suspenso entre eles.
  //
  // ⚠️ ELA ERA SÓ UM PILAR ATÉ O TESTE JOGADO DE 12/09. Veredicto dele: *"sobre o asset da ponte,
  // eu achei, é que ele está pequeno e as mesas e bordas tampam ele... hoje nós temos o que seria
  // o INÍCIO de uma ponte"*. O diagnóstico é dele e está certo: a peça de 71px não era pequena por
  // acidente — ela é a PONTA de uma ponte, e ponta sozinha não lê como ponte.
  //
  // ⚠️ O VÃO É PROCEDURAL (`scripts/_f4/_assar-ponte.mjs`), desenhado coluna a coluna a partir do
  // próprio original — não é uma fatia repetida, que denunciaria a costura a cada 18px. As
  // `f4-passarela*.png` continuam no disco porque são a ENTRADA desse forno, mas não são mais
  // carregadas: quem entra em cena é a ponte inteira.
  f4Ponte: 'sprites/f4-ponte.png',
  f4Ponte2: 'sprites/f4-ponte2.png',
  f4Ponte3: 'sprites/f4-ponte3.png',
  // O GÂNGLIO é um núcleo nervoso ACESO. ⚠️ A escolha anterior eram os anéis de cartilagem da
  // câmara B, e o mock contra a pintura os matou: a pintura da câmara B JÁ É uma caixa torácica,
  // então a peça repetia o que já estava lá. Estes dizem o que nenhuma das quatro pinturas diz —
  // um ponto de luz PRÓPRIO, que é a fase inteira em uma peça (*luz só onde há energia*).
  // ESFUMADOS numa elipse irregular: são textura de quadro cheio, e sem isso entrariam como
  // quadrado colado ("sprite com BORDA RETA é veneno").
  f4Ganglio: 'sprites/f4-ganglio.png',
  f4Ganglio2: 'sprites/f4-ganglio2.png',
  // O CANO DE DESPEJO da câmara B: a FONTE da água. ⚠️ Pedido dele depois de jogar o enchimento —
  // *"se quiser implementar canos soltando a água, como um asset visual diferente. Assim fica mais
  // plausível"*. Nível que sobe sozinho é exatamente o que um cenário não pode fazer; o Leviatã
  // engoliu uma doca, e doca tem encanamento. Nasceram deitados e entram de pé (giro de 90°, que
  // em pixel art é exato) — flange no teto, boca despejando para baixo. scripts/_f4/_assar-cano.mjs.
  f4Cano: 'sprites/f4-cano.png',
  f4Cano2: 'sprites/f4-cano2.png',
  f4Cano3: 'sprites/f4-cano3.png',

  // ─── A MOLDURA DA FASE 4 (Fatia 7 · M1) ───
  //
  // AS BORDAS DAS CÂMARAS — a arte de verdade da moldura, instalada no M2 (13/09).
  //
  // ⚠️ A FAIXA É 128×64 E ENTRA EM ESCALA 1, ancorada pela SUPERFÍCIE — o que sobra dela sai da
  // tela. É por isso que `Moldura.ESPESSURA_MAX` é 54 e não 64. **Qualquer peça registrada aqui
  // TEM de ser 128×64**; a `probe-f4-moldura` cobra isso de cada uma, uma a uma.
  //
  // ⚠️ UMA ARTE POR CÂMARA, E ISSO É DECISÃO DELE, NÃO LIMITAÇÃO. A câmara A entrou com duas
  // irmãs sorteadas (A-0 e A-2) para matar as 3 cópias idênticas na tela ao mesmo tempo
  // (384 ÷ 128 = 3). Ele jogou e reprovou: *"quero a pintura que tem o músculo apenas e não o
  // músculo com ossos… unifique as câmaras com sua única arte, não tenha duas"*. As duas irmãs
  // não liam como variedade da mesma parede — liam como duas paredes emendadas, que é um defeito
  // PIOR que a repetição que elas vieram resolver.
  //
  // A convenção do `pickVariant` (src/art.ts) continua de pé — `<base>`, `<base>2`, `<base>3`… —
  // e é por isso que desfazer isto é copiar um PNG e escrever uma linha aqui, sem tocar em código.
  //
  // ⚠️ A CÂMARA C É A ÚNICA GROSSA — 128×**80**, contra 128×64 das outras três —, e isso é arte
  // dele aprovada em 12/09 (*"as do duto e do núcleo ficaram ótimas"*), não um acidente de
  // exportação. Ela ficou PARADA de 12/09 a 20/09 porque o motor media a peça por um literal 64;
  // quem ensinou a altura variável foi o M4. Ver a conta em `Moldura.ESPESSURA_MAX` e a âncora da
  // saia em `Moldura.enche`, que hoje saem da peça e não de um número.
  //
  // ⚠️ E OS 16px A MAIS SÃO COBERTURA, NÃO APERTO — decisão dele em 20/09: *"use a arte que temos
  // guardada e utilize-a da mesma forma que a atual"*. O `ESPESSURA_MAX` continua 54, então o duto
  // tem exatamente a mesma largura de antes; o que muda é que a parede vira ARTE onde antes entrava
  // saia. Subir o teto para 70 (que a peça de 80 permitiria) apertaria o duto, e isso é mudança de
  // JOGO numa fase que ele já aprovou jogada — não entra de carona numa troca de arte.
  //
  // ⚠️ `f4-faixa-prov.png` FICA NO DISCO. A regra de saída é dele — *"caso não fique bom, mantemos
  // a que está agora"* — e voltar atrás é reapontar estas chaves para o provisório.
  f4FaixaA: 'sprites/f4-faixa-a.png',
  f4FaixaB: 'sprites/f4-faixa-b.png',
  f4FaixaC: 'sprites/f4-faixa-c.png',
  f4FaixaD: 'sprites/f4-faixa-d.png',
  // A MESA: 96×112, TOPO CHATO. A hitbox sai da largura da TEXTURA, então topo chato é o que a
  // torna honesta por construção (`scripts/_f4/_medir-colunas.mjs`).
  //
  // ⚠️ A CHAVE TEM DE SE CHAMAR `mesa`, NÃO `f4Mesa`. `TerrainSystem.spawn` resolve a textura por
  // `pickVariant(scene, kind)` (src/art.ts) — o nome do `PropKind` É a chave da arte, sem
  // tradução no meio. Uma chave fora dessa convenção não gera erro nenhum: o `pickVariant` procura
  // 'mesa', não acha, e o Phaser devolve a textura de erro (`__MISSING`) — que tem 32×32, então
  // `body.setSize(width * 0.6, height)` também sai errado, e o obstáculo perde a hitbox junto com
  // a arte. Foi exatamente o que aconteceu: a Task 5 criou o kind `mesa`, a Task 3 registrou a
  // arte como `f4Mesa`, e as quatro sondas passaram porque nenhuma olhava a TEXTURA carregada
  // (ver os asserts novos em `scripts/probe-f4-moldura.mjs`). Quando a arte de verdade entrar
  // (M2–M5), as variantes são `mesa2`, `mesa3`… — o `pickVariant` sorteia entre elas sem mudar
  // nenhuma linha de código, DE GRAÇA, porque a convenção foi respeitada desde o nome.
  // ⚠️ A ARTE DE VERDADE ENTROU EM 12/09 (M2). A estrutura foi decidida com ele: **aço ENGOLIDO,
  // não carne**. A mesa é a única coisa da fase que mata por ser TERRENO — todo o resto ou é fundo
  // (tingido escuro, depth negativo) ou é inimigo (se move, atira), e por isso ela é a única peça
  // da F4 que nasce SEM tint. Biomecânica seria feita da mesma matéria da faixa, das costelas e da
  // parede de onde ela cresce: camuflagem. É a mesma língua da `f4Ponte` e do `f4Cano`, então a
  // fase passa a ter uma frase só — *isto era uma doca, e o bicho está digerindo*.
  //
  // ⚠️ AS TRÊS ENTRAM COM O MESMO RODAPÉ HORIZONTAL (94px de largura em tela), e isso é
  // deliberado: o prop nasce em escala 1, então a largura em tela é a da TEXTURA. As candidaturas
  // vieram quase quadradas (101–112 para 110 de altura) e instalar assim engordaria o obstáculo em
  // até 19% — o que estica o tempo que o jogador passa dentro do aperto. **O vão é dele**
  // (126/112/120, calibrado jogando em 12/09); arte não mexe em dificuldade de lado. Ver
  // `scripts/_f4/_assar-mesa.mjs`.
  //
  // ⚠️ `f4-mesa-prov.png` FICA NO DISCO de propósito. A regra de saída é dele: *"caso não fique
  // bom, mantemos a que está agora"* — voltar atrás é trocar esta linha, não regerar nada.
  mesa: 'sprites/f4-mesa.png',
  mesa2: 'sprites/f4-mesa2.png',
  mesa3: 'sprites/f4-mesa3.png',
  // A MESA DO MAR — a câmara alagada do golfinho (14/09). Um `PropKind` próprio, não `mesa4`: ver o
  // `mesaMar` do `TerrainSystem`. Assadas por `scripts/_f4/_assar-mesa-mar.mjs`, 94px como as de aço.
  mesaMar: 'sprites/f4-mesa-mar.png',
  mesaMar2: 'sprites/f4-mesa-mar2.png',
  // ⚠️ A CHAVE É O NOME DO `PropKind`, e é a lei que custou caro em 09/09: `pickVariant(scene,
  // kind)` procura a textura pelo nome do kind, e registrá-la como `f4Porta` faria o Phaser
  // devolver a textura de ERRO (32×32) com a hitbox junto — sem nenhuma sonda ficar vermelha.
  //
  // A ARTE FINAL ENTROU EM 20/09 (M4), escolhida por ele entre 8 candidatas: o anteparo escuro
  // rebitado com a FENDA acesa dentro de um soquete de anéis blindados. A fenda é um acento
  // VERTICAL num duto cujas veias são todas horizontais, e é por isso que ela recorta contra a
  // parede em vez de sumir nela.
  //
  // ⚠️ `f4-porta-prov.png` FICA NO DISCO, como a faixa e a mesa: a regra de saída é dele.
  porta: 'sprites/f4-porta.png',
  // A LASCA — o que sobra depois do estouro. A porta PARTE AO MEIO e restam dois cotos presos à
  // parede, em cima e embaixo, com a passagem aberta entre eles. O pedido é dele, 20/09: *"a porta
  // vai precisar partir ao meio… sobrando apenas uma lasca de cima e de baixo… assim a nave
  // consegue passar e dá a sensação que explodimos uma porta mesmo"*.
  //
  // ⚠️ NÃO É `porta2`, E A DIFERENÇA É O `pickVariant`: irmãs da mesma base são SORTEADAS quando o
  // prop nasce, então uma porta inteira nasceria já em cacos de vez em quando. A lasca é um estado,
  // não uma variante — quem a instala é o `matarPorta` da `GameScene`, trocando a textura.
  //
  // ⚠️ A FRESTA MEDE 38px, contra um corpo de nave de 17×6 e um sprite de 31×15
  // (`scripts/_f4/_medir-nave.mjs`). A arte promete passagem e a passagem existe — se alguém trocar
  // esta peça por uma de fresta menor, é essa conta que tem de ser refeita.
  portaLasca: 'sprites/f4-porta-lasca.png',

  // O DESTROÇO DA GARGANTA (21/09, 2ª volta do esfíncter): o que sobra dela depois do estouro —
  // um anel arrombado com a goela arrancada e cotos de dente na borda.
  //
  // ⚠️ É A MESMA IDEIA DA `portaLasca`, E PELO MESMO MOTIVO. A morte dela era a `garganta-morta`:
  // 11 quadros em que a boca FECHA e o corpo amolece. Bonita, e contava a história errada — *ela
  // morreu*, quando o que ele pediu foi *"que o player sinta que explodiu a criatura e rompeu o
  // obstáculo rumo ao núcleo"*. Uma troca de textura seca diz isso; uma morte lenta não.
  //
  // ⚠️ E ELA NASCE NO QUADRO DA VIVA (97×171), montada pelo `_instalar-destroco.mjs`. O cru veio
  // 170×170 com 80×134 de conteúdo; colado assim, a peça saltaria de lugar no quadro da ignição.
  // É a lei da `portaLasca`, que tem exatamente os 64×112 da porta.
  //
  // ⚠️ Gerado com `edit_image` A PARTIR DA ORIGINAL — pedido dele: *"a explosão gore precisa vir
  // de criar no pixellab a partir da imagem original"*. Não é um desenho novo: são os pixels dela,
  // arrombados.
  gargantaDestroco: 'sprites/garganta-destroco.png',

  // A poça: o que escorre da carcaça e FICA. Assada em pixel (`_assar-sangue.mjs`).
  f4Poca: 'sprites/f4-poca.png',

  // Emblema do menu. Sem placeholder: se não existir, o título aparece sem ele.
  emblem: 'sprites/emblem.png',

  // A KEY ART DO MENU (PixelLab, 384×216 = a resolução EXATA do jogo): o Leviatã-baleia
  // sobre a lua morta, a nave solitária de rastro azul — a história do jogo num quadro só.
  // Sem placeholder: se não existir, o menu cai no fundo antigo (parallax + véu).
  menuKeyart: 'sprites/menu-keyart.png',

  // A LUA MORTA do diorama do menu (passe visual "O DESPERTAR"): esfera detalhada de crateras,
  // sombra à esquerda, borda ciano — o foco do céu. Sem placeholder: sem ela, o MenuScene cai na
  // lua procedural do Boot (`moon`).
  menuMoon: 'sprites/menu-moon.png',

  // A MESMA lua, recortada em 96×96 (a caixa da placeholder procedural) para servir de "a lua
  // que você deixou" no `Parallax` da Fase 2 (`setApproach()`) — o disco vinha com um cinturão de
  // destroços em volta, que sobra de graça para o tema do cinturão. Sem ela, o `Parallax` cai na
  // lua procedural (`moon`), que ficava com "cara de placeholder" ao lado do fundo pintado.
  moonBelt: 'sprites/moon-belt.png',

  // Moldura de HUD (PixelLab `create_ui_asset`, 384×216 = a tela inteira, miolo TRANSPARENTE).
  // Sem placeholder: se não existir, o menu de naves simplesmente aparece sem moldura.
  uiFrame: 'sprites/ui-frame.png',

  // Fundo profundo. Sem placeholder: se não existirem, a camada simplesmente não entra.
  nebula: 'sprites/nebula.png',
  nebula2: 'sprites/nebula-2.png',
  planet: 'sprites/planet.png',

  // ─── O FUNDO DA FASE 2: ele tem que dizer CINTURÃO ───
  //
  // O fundo do vácuo era o MESMO da Fase 1 (nebulosa + o planeta anelado) com uma camada de
  // asteroides por cima. O resultado é que o cemitério da frota tinha exatamente o céu da lua de
  // onde o jogador acabou de decolar — o fundo dizia "você continua no mesmo lugar" enquanto a
  // fase inteira tenta dizer o contrário.
  //
  // Estes dois assets contam de onde o cinturão VEIO:
  //   planetBroken  um mundo PARTIDO, rachado até o núcleo, sangrando escombros.
  //   belt          a faixa densa de rocha — o cinturão visto de longe, de perfil.
  //
  // Juntos, o fundo passa a ser uma frase: *aquele planeta se quebrou, e a poeira dele é isto
  // aqui em volta de você.*
  planetBroken: 'sprites/planet-broken.png',
  belt: 'sprites/belt.png',
  belt2: 'sprites/belt-2.png',

  // O PLANETA EXPLODINDO — um mundo partido com o núcleo em lava sangrando para fora. Sem
  // placeholder: se não existir, a camada simplesmente não entra. Só a 2ª cutscene (a Doca) o usa,
  // como o grande fundo dramático atrás da estação — é a causa do cinturão, vista de perto.
  planetShattered: 'sprites/planet-shattered.png',

  // O LEVIATÃ: o destino da campanha inteira, e o CHÃO da Fase 3. Era um polígono desenhado em
  // runtime, e contra o fundo novo ele aparecia como uma laje azul-clara de bordas retas no meio
  // do céu. O parallax o desenha com TINT escuro — o que está longe é escuro (ver Parallax.ts).
  leviathan: 'sprites/leviathan.png',

  // O LEVIATÃ-BALEIA MORRENDO e PARTIDO EM DOIS — os dois estados dele na CUTSCENE FINAL
  // (Interlude4Scene). É A MESMA BALEIA DA KEY ART DO MENU (gerada com ela como style_images):
  // primeiro o casco rachado com fissuras de lava e explosões na espinha; depois o corpo
  // rasgado no meio, com o interior incandescente exposto. Paleta Deep Void + laranja #ff8c1a,
  // nariz à direita (140×87 e 140×75, PixelLab). Sem placeholder: só a cena final os usa.
  leviathanWhale: 'sprites/leviathan-whale.png',
  leviathanWhaleDying: 'sprites/leviathan-whale-dying.png',
  leviathanWhaleSplit: 'sprites/leviathan-whale-split.png',

  mtnFar: 'sprites/mtn-far.png',
  mtnFar2: 'sprites/mtn-far-2.png',
  mtnFar3: 'sprites/mtn-far-3.png',

  mtnMid: 'sprites/mtn-mid.png',
  mtnMid2: 'sprites/mtn-mid-2.png',
  mtnMid3: 'sprites/mtn-mid-3.png',

  // FUNDO PINTADO da Fase 1 (estilo Metal Slug): a colônia alienígena escarpada, arte do Henrique.
  // Camada mais distante do parallax de superfície; substitui o céu pixelado por trás do foreground.
  paintBgF1: 'sprites/paint-bg-f1.png',

  // FUNDO PINTADO da SAÍDA DA ATMOSFERA (arte do Henrique): a órbita baixa vista de cima do
  // planeta, com o arco de atmosfera ainda aceso embaixo. Entra só nos ~6.5s de zero-G entre a
  // Torre morrer e a cutscene 1 (ver `Parallax.breakAtmosphere`) — sem este PNG, a passagem
  // continua exatamente como era, contra o cenário da Fase 1.
  //
  // Ele é o ANTECESSOR do `paintBgCut1`, não um substituto: aqui o planeta ainda está embaixo;
  // lá ele já sumiu e sobrou a lua. É o afastamento, contado em duas pinturas.
  paintBgZeroG: 'sprites/paint-bg-zerog.png',

  // FUNDO PINTADO da cutscene 1 (espaço aberto: a lua que ficou + a borda do cinturão à direita,
  // arte do Henrique). Camada mais distante da InterludeScene; o parallax 'espaco' é o fallback.
  paintBgCut1: 'sprites/paint-bg-cut1.png',

  // O céu da CUTSCENE 2 — a doca no cinturão. Mesmo tratamento do paintBgCut1: 480×270, 1px de
  // arte = 1px de jogo, posicionada em y=-27. A pintura é do Henrique.
  paintBgCut2: 'sprites/paint-bg-cut2.png',

  // ⚠️ A PINTURA DO HANGAR DA CUTSCENE 3 — asset NOVO, e ela NÃO substitui o `hangar.png`.
  // Aquele arquivo é também a parede de fundo da FASE 4 (`Parallax` modo `interior`): trocá-lo
  // faria a Fatia 6 mudar a Fase 4 sem ninguém pedir, e a Fase 4 é a Fatia 7. A mesma lei que o
  // cooldown dos canhões já custou nesta campanha.
  //
  // As cinco janelas são vazadas por `scripts/instalar-cut3.mjs` (preenchimento a partir de
  // sementes, nunca limiar global — 20,5% da parede cai na mesma faixa neutra do xadrez).
  paintBgCut3: 'sprites/paint-bg-cut3.png',

  // ⚠️ A NADADEIRA PEITORAL SAIU DA ÁRVORE EM 2026-09-05, e sai daqui como aviso.
  //
  // Ela era ideia do Henrique e passou por TRÊS versões: a original, a refeita com o
  // `leviathan-swim-sheet` como referência de estilo, e o movimento trocado de travessia por pivô.
  // As três foram reprovadas por ele jogando. O veredicto final foi de ESCOPO, não de qualidade:
  // *"não quero ficar dias resolvendo algo desse porte. Isso não faz diferença no final das
  // contas."*
  //
  // ⚠️ SE ALGUÉM PENSAR EM RESSUSCITAR: o custo real não é a arte, é o número de rodadas de
  // julgamento. Uma peça que só aparece por um buraco de 116×89 durante 4 segundos não paga três
  // idas ao gerador. Antes de repor qualquer coisa "do lado de fora das janelas", pergunte a ele
  // se vale a rodada.

  // ⚠️ AS CARCAÇAS DA FROTA ENGOLIDA (cutscene 3). O HANDOFF promete desde julho que "o hangar
  // guarda carcaças da frota engolida — a Frota Morta da F2, vista por dentro", e que o painel de
  // naves existe porque "você não compra uma nave, você SALVA uma nave irmã do cemitério". Até
  // 2026-09-01 isso só existia em comentário: no convés havia três borrões cinzas genéricos.
  carcaca1: 'sprites/carcaca-1.png',
  carcaca2: 'sprites/carcaca-2.png',
  carcaca3: 'sprites/carcaca-3.png',

  // ⚠️ OS DESTROÇOS BIOMECÂNICOS que muram a saída (cutscene 3, 2ª volta). Eles substituem
  // `asteroid`/`asteroid2`/`asteroid3` com `setTint(0x39415c)` — três pedras genéricas de 24px
  // esticadas 2,5× e pintadas de azul. Na descrição do Henrique: restos de fuselagem com traços
  // biomecânicos, ossos envoltos de tecnologia e carne, que é o padrão que a arte do jogo já tem.
  //
  // ⚠️ O TAMANHO E A COR ESTÃO ASSADOS NOS ARQUIVOS (scripts/_cut3/_instalar-destrocos.mjs): a
  // cena desenha em escala 1 e sem tint nenhum.
  //
  // ⚠️ E A CHAVE É `entulho`, NÃO `destroco`. O jogo JÁ TEM `destroco`/`destroco2`/`destroco3`
  // (linha ~498): o casco rasgado à deriva que as Fases 2 e 3 cospem como perigo
  // (`DebrisSystem.HAZARDS`). Usar aquele nome aqui sobrescreveu a arte deles em disco antes de o
  // typecheck acusar a chave duplicada. Nome de asset novo se confere ANTES de escrever no disco.
  entulho1: 'sprites/entulho-1.png',
  entulho2: 'sprites/entulho-2.png',
  entulho3: 'sprites/entulho-3.png',
  entulho4: 'sprites/entulho-4.png',

  // ⚠️ A GARGANTA — a criatura que substituiu o portão (2ª volta da Fatia 6, 2026-09-04).
  //
  // O portão foi reprovado no teste jogado por DUAS coisas somadas: sem MOLDURA (colado sobre
  // parede pintada) e sem CAUSA (o entulho caía porque um banner dizia que estava caindo). A
  // garganta escapa das duas: ela não finge ser parede, ela é um CORPO dentro do hangar, na
  // frente da parede, ocluindo as janelas #4 e #5 — e é a explosão dela que derruba o teto, então
  // o banner vira legenda do que o jogador viu, não a causa.
  //
  // ⚠️ ELA EXISTE DESDE O PRIMEIRO QUADRO. Respira durante a queda, a derrapagem e o painel de
  // escolha. Surgir foi exatamente a queixa contra o portão.
  gargantaCut3: 'sprites/garganta.png',
  // ⚠️ A MESMA IMAGEM SOB DUAS CHAVES, e não é descuido. A chave da arte de um prop É o nome do
  // `PropKind` (`pickVariant(scene, kind)`), então o esfíncter da Fase 4 precisa dela como
  // `garganta`. A `gargantaCut3` fica INTOCADA: a cutscene 3 está mergeada e aprovada, e trocar a
  // chave dela de carona seria atravessar a mesma fronteira que o M1 pagou caro para aprender —
  // a faixa da F4 foi parar nas Fases 1, 2 e 3 e nenhuma sonda pegou.
  garganta: 'sprites/garganta.png',
  ...animFrames('gargantaIdleAnim', 'garganta-idle-anim'),
  ...animFrames('gargantaMorteAnim', 'garganta-morte-anim'),

  // FUNDO PINTADO da Fase 2 (a colônia de mineração do cinturão, arte do Henrique): camada NOVA
  // no `buildSpace()`, atrás até da nebulosa procedural — NÃO substitui `Parallax('espaco')` (a
  // lua que encolhe e o Leviatã que cresce continuam vindo da nebulosa/planeta existentes).
  paintBgF2: 'sprites/paint-bg-f2.png',

  // O céu do ATO 1 da FASE 3 — a nebulosa de Kepler, pintada pelo Henrique. Mesma receita do
  // paintBgF2: 480×270, posicionada em y=-27. Ela SEGUE o nebulaDim (some quando a nuvem abre).
  paintBgF3: 'sprites/paint-bg-f3.png',

  // A AURORA nítida (cutscene 1): ~192px exibida ×2 inteira. O `carrier` antigo é o fallback.
  // O estático É o quadro 0 da animação (mesma caixa união — install-anim.mjs), então
  // estático e animação nunca saltam entre si.
  carrierBig: 'sprites/carrier-big.png',
  ...animFrames('carrierBigAnim', 'carrier-big-anim'),
};

/**
 * A arte entra ASSET POR ASSET, sem big bang.
 *
 * Cada sprite em `ART` é carregado de `public/`; se o arquivo ainda não existe, o
 * placeholder desenhado em runtime assume o mesmo key. O jogo nunca quebra no meio
 * da produção de arte, e um sprite novo entra em jogo só por existir no disco.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Um asset que falta ainda não é erro — é só arte que não foi feita.
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.info(`[art] '${file.key}' ausente — usando placeholder.`);
    });

    for (const [key, path] of Object.entries(ART)) this.load.image(key, path);

    for (const [key, sheet] of Object.entries(SHEETS)) {
      this.load.spritesheet(key, sheet.path, { frameWidth: sheet.w, frameHeight: sheet.h });
    }

    this.load.audio('stage1', 'audio/stage1.mp3');
    this.load.audio('boss', 'audio/boss.mp3');
  }

  create(): void {
    // Placeholder só para quem ainda não tem arte real. A arte entra asset por asset.
    const fallback: Record<string, () => void> = {
      ship: () => this.makeShip(),
      enemyDrone: () => this.makeEnemy('enemyDrone'),
      enemyGunship: () => this.makeEnemy('enemyGunship'),
      turret: () => this.makeTurret(),
      building: () => this.makeBuilding(),
      spire: () => this.makeSpire(),
      boss: () => this.makeBoss(),
      mtnFar: () => this.makeRidge('mtnFar', COLORS.bgMid, 22, 7),
      mtnMid: () => this.makeRidge('mtnMid', COLORS.bgFar, 30, 11),
      groundTile: () => this.makeGroundTile(),

      // O cinturão da Fase 2. Estes SÃO placeholders de piloto: a arte do PixelLab está por
      // vir, e por isso eles têm que passar pela guarda `!textures.exists` como todo o resto.
      // Gerados incondicionalmente, colidiriam com o PNG assim que ele entrasse.
      asteroid: () => this.makeAsteroid(),
      mina: () => this.makeMine(),
      capitania: () => this.makeCapitania(),
      carrier: () => this.makeCarrier(),
      // O míssil da torre de solo — placeholder até a arte do PixelLab entrar com esta chave.
      missile: () => this.makeMissile(),

      // ⚠️ O LEVIATÃ E A LUA ENTRARAM AQUI, e o Leviatã por pouco não custou a arte nova dele.
      //
      // `makeLeviathan()` era chamado INCONDICIONALMENTE, logo abaixo. `generateTexture` grava
      // por CHAVE: no instante em que `leviathan.png` passou a existir, o polígono desenhado em
      // runtime **sobrescreveria o PNG recém-carregado** — a arte entraria no disco, o jogo a
      // carregaria, e a tela continuaria mostrando a laje velha. Um bug que se investiga no lugar
      // errado (na arte, no instalador) porque a arte está lá, correta, e mesmo assim não aparece.
      //
      // É exatamente a armadilha nº 8 (`makeAsteroid`), repetida. TODO placeholder de algo que um
      // dia terá arte passa pela guarda `!textures.exists(key)` — sem exceção.
      leviathan: () => this.makeLeviathan(),
      moon: () => this.makeMoon(),
    };

    for (const [key, make] of Object.entries(fallback)) {
      if (!this.textures.exists(key)) make();
    }

    // Estes nunca são gerados no PixelLab: partículas e formas de 3 cores (docs/ASSETS.md).
    this.makeFlak();
    this.makeBullet();
    this.makeTracerRound();
    this.makeShots();
    this.makeShotsChefes();
    this.makeTorpedo();
    this.makePuff();
    this.makeSpark();
    this.makeColonyLight();
    this.makeEnemyBullet();
    this.makePickup();
    this.makeFogBand();
    this.makeGodRay();
    this.registerAnims();

    this.scene.start('Menu');
  }

  /**
   * Monta cada animação a partir dos quadros que existirem em disco.
   * Sem quadros, a animação não é registrada e o sprite fica estático — o jogo não quebra.
   */
  private registerAnims(): void {
    for (const { key, prefix, frameRate, loop = true } of ANIMS) {
      const frames = Array.from(
        { length: FRAMES[prefix] ?? 0 },
        (_, i) => `${prefix}${i}`,
      ).filter((k) => this.textures.exists(k));

      if (frames.length < 2) continue;

      this.anims.create({
        key,
        frames: frames.map((k) => ({ key: k })),
        frameRate,
        repeat: loop ? -1 : 0,
      });
    }

    // ─── As anims de SPRITESHEET do cenário ───
    //
    // ⚠️ ELAS NÃO CABEM NO LAÇO ACIMA, que é do formato legado (um PNG por quadro, contados em
    // `FRAMES`). Uma sheet é uma textura só, e os quadros saem de `generateFrameNumbers`.
    //
    // ⚠️ E ELAS MORAM AQUI, E NÃO EM QUEM AS USA, porque quem toca a da porta é o `TerrainSystem` —
    // ele só chama `p.play(def.anim)` se `anims.exists` for verdade, e a porta nasce no meio da fase,
    // muito depois de qualquer `create` de entidade. Registrar tarde é a animação simplesmente não
    // tocar, sem erro nenhum na tela.
    for (const { key, sheet, frames, frameRate, loop } of SHEET_ANIMS) {
      if (!this.textures.exists(sheet) || this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(sheet, { start: 0, end: frames - 1 }),
        frameRate,
        repeat: loop === false ? 0 : -1,
      });
    }
  }

  /**
   * Crista de montanha TILEÁVEL: a altura do primeiro pixel tem que bater com a do
   * último, senão aparece uma emenda visível a cada repetição do tile.
   */
  private makeRidge(key: string, color: number, height: number, teeth: number): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const w = GAME_WIDTH;
    const step = w / teeth;

    g.fillStyle(color, 1);
    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: 64 }];

    for (let i = 0; i <= teeth; i++) {
      // O último pico repete o primeiro: é isso que fecha o tile sem emenda.
      const h = i === teeth ? height : Phaser.Math.Between(height * 0.35, height);
      pts.push({ x: i * step, y: 64 - (i === 0 ? height : h) });
    }
    pts.push({ x: w, y: 64 });

    g.fillPoints(pts, true);
    g.generateTexture(key, w, 64);
    g.destroy();
  }

  /** Tile de solo 16×16, costurável — o mesmo formato do tileset do PixelLab. */
  private makeGroundTile(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(COLORS.metalDark, 1);
    g.fillRect(0, 0, 16, 16);
    g.fillStyle(COLORS.bgFar, 1);
    g.fillRect(0, 0, 16, 2);

    g.fillStyle(COLORS.bgDeep, 1);
    g.fillRect(3, 6, 2, 2);
    g.fillRect(11, 10, 2, 2);

    g.generateTexture('groundTile', 16, 16);
    g.destroy();
  }

  /** A lua que você acabou de deixar. Encolhe nas fases seguintes. */
  private makeMoon(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.bgFar, 1);
    g.fillCircle(48, 48, 44);
    g.fillStyle(COLORS.bgMid, 1);
    g.fillCircle(34, 38, 9);
    g.fillCircle(60, 60, 13);
    g.fillCircle(66, 28, 6);
    g.generateTexture('moon', 96, 96);
    g.destroy();
  }

  /** O LEVIATÃ. Silhueta no horizonte — o destino da campanha inteira. */
  private makeLeviathan(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(COLORS.bgMid, 1);
    g.fillPoints(
      [
        { x: 0, y: 40 },
        { x: 40, y: 16 },
        { x: 150, y: 8 },
        { x: 190, y: 30 },
        { x: 190, y: 52 },
        { x: 140, y: 70 },
        { x: 30, y: 66 },
      ],
      true,
    );

    // Luzes: é o que faz uma silhueta parecer uma nave habitada, e não uma pedra.
    g.fillStyle(COLORS.enemy, 1);
    for (let i = 0; i < 14; i++) {
      g.fillRect(Phaser.Math.Between(30, 175), Phaser.Math.Between(20, 60), 2, 1);
    }
    g.fillStyle(COLORS.hot, 1);
    g.fillRect(2, 36, 5, 6);

    g.generateTexture('leviathan', 192, 80);
    g.destroy();
  }

  /** Pico de rocha: sobe do chão. Indestrutível — para desviar, não para abater. */
  private makeSpire(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(COLORS.metalDark, 1);
    g.fillPoints(
      [
        { x: 0, y: 96 },
        { x: 5, y: 40 },
        { x: 11, y: 12 },
        { x: 14, y: 0 },
        { x: 18, y: 18 },
        { x: 24, y: 52 },
        { x: 28, y: 96 },
      ],
      true,
    );

    // Aresta clara de um lado só: é o que dá volume a uma silhueta chapada.
    g.fillStyle(COLORS.metalMid, 1);
    g.fillPoints(
      [
        { x: 14, y: 0 },
        { x: 18, y: 18 },
        { x: 24, y: 52 },
        { x: 28, y: 96 },
        { x: 21, y: 96 },
        { x: 15, y: 30 },
      ],
      true,
    );

    g.generateTexture('spire', 28, 96);
    g.destroy();
  }

  /** Construção da colônia: destrutível, dá pontos. */
  private makeBuilding(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(COLORS.metalDark, 1);
    g.fillRect(0, 8, 36, 56);
    g.fillStyle(COLORS.metalMid, 1);
    g.fillRect(4, 0, 28, 10);
    g.fillRect(0, 30, 36, 3);

    // Janelas acesas: transformam um bloco em algo habitado.
    g.fillStyle(COLORS.hot, 1);
    for (let y = 14; y < 58; y += 12) {
      for (let x = 5; x < 32; x += 10) {
        if (Math.random() > 0.35) g.fillRect(x, y, 4, 4);
      }
    }

    g.generateTexture('building', 36, 64);
    g.destroy();
  }

  /** Torre de solo: mira em você. Prioridade de alvo. */
  private makeTurret(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(COLORS.metalDark, 1);
    g.fillRect(2, 10, 20, 14);
    g.fillStyle(COLORS.metalMid, 1);
    g.fillRect(6, 3, 12, 9);
    g.fillStyle(COLORS.enemyBright, 1);
    g.fillRect(9, 6, 6, 3);
    g.fillStyle(COLORS.metalLight, 1);
    g.fillRect(0, 5, 8, 3);

    g.generateTexture('turret', 24, 24);
    g.destroy();
  }

  /** Chefão da Fase 1: Torre de Defesa da Colônia. */
  private makeBoss(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(COLORS.metalDark, 1);
    g.fillRect(8, 10, 48, 70);
    g.fillStyle(COLORS.metalMid, 1);
    g.fillRect(0, 22, 64, 14);
    g.fillRect(4, 52, 56, 10);
    g.fillStyle(COLORS.enemyBright, 1);
    g.fillRect(6, 26, 8, 6);
    g.fillStyle(COLORS.hot, 1);
    g.fillRect(20, 0, 24, 12);

    g.generateTexture('boss', 64, 80);
    g.destroy();
  }

  /**
   * Inimigo placeholder. Aponta para a DIREITA, como todos os sprites gerados —
   * o espelhamento para a esquerda é feito em jogo (`setFlipX`).
   */
  private makeEnemy(key: string): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.enemy, 1);
    g.fillTriangle(0, 1, 16, 7, 0, 13);
    g.fillStyle(COLORS.enemyDark, 1);
    g.fillRect(0, 5, 6, 4);
    g.fillStyle(COLORS.enemyBright, 1);
    g.fillRect(11, 6, 3, 2);
    g.generateTexture(key, 16, 14);
    g.destroy();
  }

  /** Projétil inimigo: magenta, redondo — nunca se confunde com o seu tiro. */
  private makeEnemyBullet(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.enemyBright, 1);
    g.fillRect(1, 0, 2, 4);
    g.fillRect(0, 1, 4, 2);
    g.generateTexture('enemyBullet', 4, 4);
    g.destroy();
  }

  /** Engradado de arma 12×12. UM asset: a letra vai por cima, em texto (docs/ASSETS.md). */
  private makePickup(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.metalLight, 1);
    g.fillRect(0, 0, 12, 12);
    g.fillStyle(COLORS.metalDark, 1);
    g.fillRect(1, 1, 10, 10);
    g.fillStyle(COLORS.hotBright, 1);
    g.fillRect(2, 2, 8, 1);
    g.fillRect(2, 9, 8, 1);
    g.generateTexture('pickup', 12, 12);
    g.destroy();
  }

  /**
   * MÍSSIL 16×6 — o tiro das torres de solo da Fase 1.
   *
   * ALONGADO de propósito: a leitura que o Henrique pediu é "míssil", e a 384×216 quem diz isso
   * é a silhueta comprida com nariz e empenas, não a cor. Aponta para a DIREITA (convenção de
   * todos os sprites); o TerrainSystem o gira para alinhar com o vetor de voo, e a fumaça de
   * exaustão sai por trás. NÃO é teleguiado — o número de balanceamento é o mesmo do traçante
   * que ele substitui (só a leitura mudou).
   */
  private makeMissile(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Corpo tubular.
    g.fillStyle(COLORS.metalMid, 1);
    g.fillRect(3, 1, 10, 4);
    g.fillStyle(COLORS.metalLight, 1);
    g.fillRect(3, 1, 10, 1);

    // Nariz — magenta: a cor de quem atira (o inimigo), lida antes da forma.
    g.fillStyle(COLORS.enemyBright, 1);
    g.fillTriangle(13, 0, 16, 3, 13, 6);

    // Empenas na cauda.
    g.fillStyle(COLORS.metalDark, 1);
    g.fillTriangle(3, 1, 3, 0, 6, 1);
    g.fillTriangle(3, 5, 3, 6, 6, 5);

    // Bocal escuro + brasa do motor.
    g.fillStyle(COLORS.enemyDark, 1);
    g.fillRect(2, 2, 1, 2);
    g.fillStyle(COLORS.hotBright, 1);
    g.fillRect(0, 2, 2, 2);

    g.generateTexture('missile', 16, 6);
    g.destroy();
  }

  /**
   * GRANADA DE FLAK 8×8 — a barragem da Capitânia na fúria.
   *
   * REDONDA E GORDA, ao contrário de todo projétil do jogo (que é um traço fino). A forma é o
   * aviso: esta coisa não te acerta em movimento, ela ESTOURA num ponto. O jogador precisa
   * distinguir "desvie" de "saia daí" num relance, e em 384×216 quem faz isso é a silhueta,
   * não a cor (docs/GDD.md pilar 3: ninguém morre por não ter enxergado).
   */
  private makeFlak(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(COLORS.hot, 1);
    g.fillCircle(4, 4, 4);
    g.fillStyle(COLORS.hotBright, 1);
    g.fillCircle(4, 4, 2);
    // Núcleo escuro: sem ele, no blend claro a granada some contra a nebulosa.
    g.fillStyle(COLORS.enemyDark, 1);
    g.fillRect(3, 3, 2, 2);

    g.generateTexture('flak', 8, 8);
    g.destroy();
  }

  /** Projétil 5×2 — 2 cores. Nunca será um asset gerado (docs/ASSETS.md). */
  private makeBullet(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(COLORS.playerGlow, 1);
    g.fillRect(0, 0, 5, 2);
    g.fillStyle(COLORS.playerBright, 1);
    g.fillRect(4, 0, 1, 2);
    g.generateTexture('bullet', 5, 2);
    g.destroy();
  }

  /**
   * A MUNIÇÃO TRAÇANTE do jato (pedido do Henrique): um risco FINO vermelho/laranja, ponta
   * quente. É a bala de canhão de um jato de combate, não um raio de energia — por isso ela
   * NÃO é ciano: traçante real queima em laranja, e a cor separa "metralha comum" (a base que
   * o jogador quer trocar) de "arma de energia" (as especiais que ele caça).
   */
  private makeTracerRound(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xb2321e, 1); // a cauda vermelha, esfriando
    g.fillRect(0, 0, 4, 1);
    g.fillStyle(0xff7a2a, 1); // o corpo laranja
    g.fillRect(3, 0, 3, 1);
    g.fillStyle(0xffd9a0, 1); // a ponta quente
    g.fillRect(6, 0, 2, 1);
    g.generateTexture('tracerRound', 8, 1);
    g.destroy();
  }

  /**
   * OS PROJÉTEIS DO JOGADOR — desenhados em CÓDIGO, um desenho por arma (2026-07-21).
   *
   * Decisão do Henrique: tiro do jogador NÃO é sprite de arquivo. O sprite gerado (PixelLab)
   * chegava GRANDE demais para uma bala de 11×6, e o upscale esmagava o desenho. O tiro tem
   * que ler como LASER — núcleo branco-quente, corpo saturado, halo baixo em volta — e isso
   * se desenha em três passadas de fillRect, não se pinta.
   *
   * ⚠️ AS DIMENSÕES SÃO AS DOS PNGs QUE SUBSTITUEM (bolt 11×6, bolt2 13×9, bolt3 12×5): a
   * hitbox do projétil deriva do tamanho da textura (WeaponSystem.shoot), e o balanceamento
   * está fechado — mudar o quadro muda a hitbox. A LÂMINA é a exceção consciente: o desenho
   * já nasce ALTO (11×19, o tamanho de mundo que o stretch 3.2 entregava) e o `bulletScaleY`
   * dela foi aposentado — hitbox de mundo igual, arte sem esticão borrado.
   */
  /**
   * OS PROJÉTEIS DOS DOIS CHEFES DA FASE 3 — desenhados em código, pela MESMA razão que os do
   * jogador (ver `makeShots` logo abaixo): projétil de 13px não se gera, se desenha.
   *
   * ⚠️ POR QUE ELES EXISTEM. Até 2026-08-29 a aranha e a serpente cuspiam a mesma coisa: o
   * `bolt2` — que é o TRAÇO DA NAVE DO JOGADOR — tingido de `0xff3a78`. Mesmo asset, mesma cor,
   * escalas 0,8 e 0,9. O Henrique, jogando: *"É um tiro magenta igual, sem característica
   * nenhuma."* Ele tinha razão de um jeito literal: forma era a única coisa que ninguém nunca
   * tinha mexido nesses dois tiros.
   *
   * ⚠️ E A COR SAIU DO CONTRATO DO MAGENTA, POR DECISÃO DELE. O jogo ensinava `magenta = isto te
   * mata` (é o que a bola da Fase 2 preserva de propósito, ver `STAGE_2_SKIN`), e eu perguntei
   * antes de romper. Ele escolheu romper: cada chefe passa a atirar na cor DELE. Se um dia
   * alguém achar que "faltou coerência", não foi esquecimento — foi escolhido, com o preço na
   * mesa.
   *
   * ⚠️ O CIANO ESTÁ FORA, E ESSE FOI O ACHADO QUE SALVOU UMA RODADA. O acento medido da serpente
   * é `#48e8f0`, que é praticamente o `playerBright` (`#3ee0f0`) da nave: um tiro ciano leria
   * como tiro do próprio jogador. O verde `#60f088`/`#70d890` é o OUTRO acento dela (a cabeça do
   * meio, a que pinga veneno), e é o que não colide com ninguém.
   *
   * ⚠️ AS CAIXAS SÃO AS DE ANTES, E ISSO NÃO É DETALHE. A hitbox do slot vem do quadro do
   * `bolt2` (13×9, ver `EnemySystem.release`). A munição da aranha nasce nesse mesmo 13×9, então
   * o balanceamento não se mexe nem um pixel. A gota da serpente é MAIOR na tela (16×12) porque
   * é o ponto dela, e por isso ela — e só ela — precisa cravar o corpo à mão no `tiro()`.
   *
   * ⚠️ OS DOIS APONTAM PARA A DIREITA. Quem os gira é o `setRotation(angle)` de quem atira; um
   * desenho simétrico perderia a informação de para onde o tiro vai, que é a única coisa que um
   * projétil carrega.
   */
  private makeShotsChefes(): void {
    const tex = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    // A ARANHA — MATÉRIA. Ela é uma máquina de aço com um cano soltando fumaça em cima, e o
    // acento dela e do casco inteiro é COBRE (`#e0a878`, `#f8e898`, medidos). Então o tiro dela
    // é munição: casco frio atrás, corpo de cobre, ogiva quente na frente. Curto e duro — ela
    // cospe leque de 3 e anel de 6, e muitos projéteis pequenos precisam ler por SILHUETA.
    tex('shotAranha', 13, 9, (g) => {
      g.fillStyle(0xc07840, 0.22);
      g.fillRect(0, 3, 13, 3);
      // ⚠️ O CONTORNO QUASE PRETO É FUNCIONAL, NÃO ESTILO. Ela voa sobre um casco que tem
      // costuras de COBRE — a mesma família da munição. Sem a borda escura o corpo do projétil
      // se dissolve nas costuras e sobra só o bico.
      g.fillStyle(0x120c08, 1);
      g.fillRect(1, 2, 11, 5);
      g.fillStyle(0x6b4630, 1); // a cauda: casco que já esfriou
      g.fillRect(2, 3, 4, 3);
      g.fillStyle(0xc98a52, 1); // o corpo de cobre
      g.fillRect(6, 3, 4, 3);
      g.fillStyle(0xf8e898, 1); // a ogiva quente
      g.fillTriangle(9, 1, 13, 4, 9, 7);
      g.fillStyle(0xffffff, 1); // o bico
      g.fillRect(10, 4, 2, 1);
    });

    // A TORRE DA COLÔNIA (FASE 1) — UM TRAÇANTE, NÃO UM FOGUETE.
    //
    // ⚠️ ELA DISPARAVA A TEXTURA `missile`, A MESMA DO LANÇA-MÍSSEIS DO CASCO, e isso é anterior
    // a esta fatia (commit `0b23c55`, já na `main`): o `TerrainSystem.fireAt` é compartilhado por
    // todo prop que atira e vestia foguete em todos. O Henrique topou com isso jogando a Fase 1
    // em 2026-08-30 — *"os misseis das torres da fase 1 viraram o mesmo missel do canhão do
    // casco"*. É a mesma queixa dos dois chefes, num terceiro par.
    //
    // A separação é de FICÇÃO antes de ser de arte: um lança-mísseis do Leviatã dispara
    // ordenança; uma torre fixa de colônia dispara munição de canhão. Foguete tem corpo, aleta e
    // fumaça de exaustão — nada disso pertence a uma peça de artilharia parada num rochedo.
    //
    // ⚠️ A COR É A FRIA DA COLÔNIA, e é o que a separa do cobre do casco a 384px de largura. A
    // Fase 1 é azul-aço: o traçante sai gelo-quente no núcleo e azul no corpo, com a mesma borda
    // escura das outras duas munições — pelo mesmo motivo de sempre, que é não depender da cor
    // para ser visto.
    //
    // ⚠️ E A CAIXA NÃO MUDA: o `fireAt` crava 10×7 em px de MUNDO para todo prop que atira,
    // independentemente do quadro da arte. Trocar a textura aqui não encosta no balanceamento
    // da Fase 1 — que é a condição para mexer numa fase mergeada.
    tex('shotTorre', 13, 9, (g) => {
      g.fillStyle(0x6ab0e0, 0.22);
      g.fillRect(0, 3, 13, 3);
      g.fillStyle(0x0a1018, 1); // a borda escura
      g.fillRect(2, 2, 10, 5);
      g.fillStyle(0x2f6a9e, 1); // a cauda, esfriando
      g.fillRect(3, 3, 4, 3);
      g.fillStyle(0x6ab0e0, 1); // o corpo
      g.fillRect(7, 3, 3, 3);
      g.fillStyle(0xd8f0ff, 1); // a cabeça quente
      g.fillRect(10, 3, 2, 3);
      g.fillStyle(0xffffff, 1);
      g.fillRect(11, 4, 1, 1);
    });

    // A SERPENTE — ENERGIA CUSPIDA. Uma gota com cauda, não um traço: ela sai de uma BOCA, não
    // de um cano. O corpo é o verde medido da cabeça do meio, com núcleo quase branco para não
    // depender da cor para ser vista (é a lição da bola da Fase 2) e uma borda escura que a
    // separa do casco quase preto por cima do qual ela voa.
    // ⚠️ ELA NÃO PODE DEPENDER DO VERDE PARA SER VISTA, E A PRIMEIRA VERSÃO DEPENDIA. Capturada
    // em voo, a gota sumia — porque o corpo da própria serpente é verde e ciano, e um projétil
    // verde desaparece dentro do dono no exato instante em que o jogador precisa lê-lo para
    // desviar. É o defeito que a bola da Fase 2 já tinha resolvido, e a solução é a mesma dela:
    // contraste de LUMINÂNCIA, não de cor. Borda quase preta e núcleo quase branco, grandes o
    // bastante para sobreviverem a 0,9 de escala.
    // ⚠️ 13×9 — O MESMO QUADRO DO `bolt2`, E ISSO É UMA DECISÃO DE SEGURANÇA, NÃO DE ESTILO.
    // A primeira versão nasceu 16×12 (uma gota maior na tela) e cravava o corpo à mão com
    // `body.setSize(13, 9)`. Medindo, a caixa saiu 10×7 em vez de 12×8: o `Body` do Arcade
    // guarda a escala do frame ANTERIOR, e o slot vinha de um tiro da aranha (escala 0,8), então
    // `13 × 0,8 = 10,4`. A hitbox passava a depender de QUEM tinha usado o slot antes — um bug
    // que ninguém acharia jogando e que nenhum assert de "o tiro existe" pegaria.
    //
    // Nascendo no quadro do `bolt2`, o corpo que o `release` devolve já é o certo, não há
    // `setSize` nenhum, e a caixa fica PROVADAMENTE igual à de antes desta mudança — que é o
    // único jeito de trocar a arte de um chefe já balanceado sem reabrir o balanceamento.
    tex('shotVeneno', 13, 9, (g) => {
      g.fillStyle(0x60f088, 0.18);
      g.fillCircle(8, 4, 4);
      g.fillStyle(0x07120c, 1); // a borda: o que a separa do próprio bicho
      g.fillEllipse(8, 4, 10, 9);
      g.fillStyle(0x2f7a52, 1);
      g.fillEllipse(8, 4, 8, 7);
      g.fillStyle(0x60f088, 1);
      g.fillEllipse(8, 4, 6, 5);
      // A CAUDA: o rastro do cuspe, afinando para trás. É o que separa "gota lançada" de "bola".
      g.fillStyle(0x50b080, 0.8);
      g.fillTriangle(5, 2, 5, 6, 0, 4);
      g.fillStyle(0xe8fff0, 1); // o núcleo: quase branco, e é ele que carrega a leitura
      g.fillEllipse(9, 4, 4, 4);
    });
  }

  private makeShots(): void {
    const tex = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void): void => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      draw(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    // PULSE 11×6 — a régua. Cápsula ciano de núcleo branco: o laser na forma mais limpa.
    tex('shotPulse', 11, 6, (g) => {
      g.fillStyle(0x3ee0f0, 0.2);
      g.fillRect(0, 1, 11, 4);
      g.fillStyle(0x3ee0f0, 1);
      g.fillRect(1, 2, 10, 2);
      g.fillStyle(0xb5f7ff, 1);
      g.fillRect(3, 2, 8, 1);
      g.fillStyle(0xffffff, 1);
      g.fillRect(7, 2, 4, 1);
    });

    // LANÇA 12×5 (estica 2.16× em voo) — a pesada de precisão: dourada, ponta de flecha.
    tex('shotLance', 12, 5, (g) => {
      g.fillStyle(0xffd966, 0.25);
      g.fillRect(0, 1, 12, 3);
      g.fillStyle(0xd9a43a, 1); // a cauda esfriando
      g.fillRect(0, 2, 4, 1);
      g.fillStyle(0xffe9a8, 1);
      g.fillRect(4, 2, 5, 1);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(8, 0, 12, 2, 8, 4);
      g.fillRect(8, 2, 2, 1);
    });

    // DISPERSOR 13×9 — a pelota do leque: losango laranja, quente como o traçante.
    tex('shotSpread', 13, 9, (g) => {
      g.fillStyle(0xff9a3c, 0.25);
      g.fillCircle(6, 4, 4);
      g.fillStyle(0xff9a3c, 1);
      g.fillPoints([{ x: 6, y: 1 }, { x: 10, y: 4 }, { x: 6, y: 7 }, { x: 2, y: 4 }], true);
      g.fillStyle(0xffe9c8, 1);
      g.fillRect(5, 3, 2, 2);
    });

    // ENXAME 13×9 — a vagem ALIEN: teal, orgânica, quase um ovo. O rastro teal do
    // homingTrail desenha a curva; o corpo é só o bicho vivo que voa.
    tex('shotEnxame', 13, 9, (g) => {
      g.fillStyle(0x5ef2d8, 0.22);
      g.fillCircle(7, 4, 4);
      g.fillStyle(0x2fbfae, 1);
      g.fillEllipse(7, 4, 9, 6);
      g.fillStyle(0x5ef2d8, 1);
      g.fillEllipse(8, 4, 5, 3);
      g.fillStyle(0xffffff, 1);
      g.fillRect(8, 3, 2, 2);
    });

    // HMG 12×5 — a cápsula de chumbo da mini-gun. A rajada é DENSA (18/s): o desenho é
    // deliberadamente discreto, senão o fluxo vira uma barra contínua (armadilha nº 35).
    tex('shotHmg', 12, 5, (g) => {
      g.fillStyle(0xffe9a8, 0.3);
      g.fillRect(0, 1, 12, 3);
      g.fillStyle(0xffd966, 1);
      g.fillRect(1, 2, 11, 1);
      g.fillStyle(0xffffff, 1);
      g.fillRect(7, 2, 5, 1);
    });

    // OBUS 12×5 (escala 1.7) — o pesado lento: uma esfera CARREGADA, quente por dentro.
    tex('shotObus', 12, 5, (g) => {
      g.fillStyle(0xff7a2a, 0.35);
      g.fillEllipse(6, 2, 12, 5);
      g.fillStyle(0xff9a3c, 1);
      g.fillEllipse(6, 2, 9, 4);
      g.fillStyle(0xffe9c8, 1);
      g.fillEllipse(7, 2, 5, 2);
      g.fillStyle(0xffffff, 1);
      g.fillRect(6, 2, 3, 1);
    });

    // AGULHA 11×6 — o tiro quase-instantâneo: um fio de 1px azul-gelo. A silhueta É a
    // promessa da arma (nunca chega tarde): a bala mais fina do jogo.
    tex('shotAgulha', 11, 6, (g) => {
      g.fillStyle(0x9fd8ff, 0.3);
      g.fillRect(0, 2, 11, 3);
      g.fillStyle(0x9fd8ff, 1);
      g.fillRect(0, 2, 9, 1);
      g.fillStyle(0xffffff, 1);
      g.fillRect(4, 2, 7, 1);
    });

    // SALVA 11×6 — a rajada de 3: dois chevrons ciano em disparada, um empurrando o outro.
    tex('shotSalva', 11, 6, (g) => {
      g.fillStyle(0x3ee0f0, 0.2);
      g.fillRect(0, 1, 11, 4);
      g.fillStyle(0x3ee0f0, 1);
      g.fillTriangle(1, 1, 5, 3, 1, 5);
      g.fillStyle(0xb5f7ff, 1);
      g.fillTriangle(5, 1, 9, 3, 5, 5);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(7, 2, 10, 3, 7, 4);
    });

    // PERFURANTE 12×5 — o dardo que atravessa carne: flecha de ponta branca, rastro ciano.
    tex('shotPerfurante', 12, 5, (g) => {
      g.fillStyle(0xb5f7ff, 0.25);
      g.fillRect(0, 1, 12, 3);
      g.fillStyle(0x3ee0f0, 1);
      g.fillRect(0, 2, 8, 1);
      g.fillTriangle(0, 1, 3, 2, 0, 3);
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(7, 0, 12, 2, 7, 4);
    });

    // BATERIA 11×6 — o feixe dos 4 canos: barra ciano dupla, núcleo branco curto.
    tex('shotBateria', 11, 6, (g) => {
      g.fillStyle(0x3ee0f0, 0.22);
      g.fillRect(0, 1, 11, 4);
      g.fillStyle(0x3ee0f0, 1);
      g.fillRect(1, 2, 10, 1);
      g.fillStyle(0x3ee0f0, 0.8);
      g.fillRect(2, 3, 8, 1);
      g.fillStyle(0xffffff, 1);
      g.fillRect(6, 2, 5, 1);
    });

    // LÂMINA 11×19 — tecnologia ALIEN na mão do jogador: uma lâmina teal na VERTICAL, já
    // desenhada na altura de mundo (o stretch 3.2 de um bolt horizontal virava borrão).
    // Teal, nunca magenta: a cor tem dono (armadilha 24).
    tex('shotLamina', 11, 19, (g) => {
      g.fillStyle(0x5ef2d8, 0.2);
      g.fillEllipse(5, 9, 11, 19);
      g.fillStyle(0x2fbfae, 1);
      g.fillPoints([{ x: 5, y: 0 }, { x: 9, y: 9 }, { x: 5, y: 18 }, { x: 1, y: 9 }], true);
      g.fillStyle(0x5ef2d8, 1);
      g.fillPoints([{ x: 5, y: 2 }, { x: 8, y: 9 }, { x: 5, y: 16 }, { x: 2, y: 9 }], true);
      g.fillStyle(0xffffff, 1);
      g.fillRect(5, 4, 1, 11);
    });
  }

  /**
   * O TORPEDO DA CUTSCENE 3 — a única arma que o jogador dispara numa interlude.
   *
   * ⚠️ ELE NÃO É O `bolt2` TINGIDO, E ESSA É A RAZÃO DE ELE EXISTIR. Esse padrão — mesmo asset,
   * cor trocada — já foi reprovado duas vezes nesta campanha ("um tiro magenta igual, sem
   * característica nenhuma"), e é o defeito anotado em BossCapitania.ts:578. Um tiro carrega uma
   * informação só, e essa informação é a SILHUETA.
   *
   * ⚠️ E ELE É CIANO, NÃO MAGENTA, DE PROPÓSITO. O jogo ensina `magenta = isto te mata`; este é o
   * único tiro da campanha que sai DA nave do jogador numa cutscene, então ele veste a paleta
   * dele (`player`/`playerGlow`). O rastro laranja atrás é o motor, não a munição.
   *
   * 15×7, apontando para a DIREITA — a garganta está à direita da nave.
   */
  private makeTorpedo(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // O rastro: o motor ardendo atrás, que é o que separa "torpedo" de "traço".
    g.fillStyle(COLORS.hot, 1);
    g.fillRect(0, 3, 3, 1);
    // O casco, e as duas aletas que dão a silhueta de corpo lançado.
    g.fillStyle(COLORS.metalDark, 1);
    g.fillRect(2, 2, 9, 3);
    g.fillRect(2, 1, 3, 1);
    g.fillRect(2, 5, 3, 1);
    // A ogiva.
    g.fillStyle(COLORS.player, 1);
    g.fillRect(11, 2, 2, 3);
    g.fillStyle(COLORS.playerGlow, 1);
    g.fillRect(13, 3, 2, 1);

    g.generateTexture('torpedoCut3', 15, 7);
    g.destroy();
  }

  /**
   * PARTÍCULA DE FUMAÇA: um sopro REDONDO 7×7 com borda irregular. A `spark` (quadrado 2×2)
   * serve para clarão ADITIVO — escalada com blend normal, como fumaça, ela aparecia como
   * QUADRADOS soltos na boca das torres lança-mísseis (bug apontado pelo Henrique).
   */
  private makePuff(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillRect(2, 1, 3, 1);
    g.fillRect(1, 2, 5, 3);
    g.fillRect(2, 5, 3, 1);
    g.fillStyle(0xffffff, 0.55); // cantos meio-transparentes: quebra o contorno de caixa
    g.fillRect(1, 1, 1, 1);
    g.fillRect(5, 1, 1, 1);
    g.fillRect(1, 5, 1, 1);
    g.fillRect(5, 5, 1, 1);
    g.generateTexture('puff', 7, 7);
    g.destroy();
  }

  /** Partícula 2×2 para explosões — com blend aditivo vira clarão. */
  private makeSpark(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture('spark', 2, 2);
    g.destroy();
  }

  /**
   * Ponto de luz FRIA da colônia (passe visual F1): núcleo claro + halo ciano-frio, 4×4. Usada
   * ADITIVA (ScatterLayer.glow) — vira brilho no horizonte, não um quadrado. Nunca é arte do
   * PixelLab: é forma de 3 cores, como spark/puff.
   */
  private makeColonyLight(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x8fc4ff, 0.4);
    g.fillCircle(2, 2, 2);
    g.fillStyle(0xe6f4ff, 1);
    g.fillCircle(2, 2, 1);
    g.generateTexture('colonyLight', 4, 4);
    g.destroy();
  }

  /**
   * BANDA DE NÉVOA 256×64, EMENDÁVEL na horizontal — a camada de bruma da saída da atmosfera
   * (`Parallax.breakAtmosphere`). Branca: a cor vem do `tint` de cada camada, como spark/puff.
   *
   * Emendável não é detalhe: ela é usada em TileSprite, e um borrão que não fecha nas bordas
   * desenha uma costura vertical rolando pela tela — que é exatamente o defeito que a névoa
   * deveria estar escondendo. Por isso todo círculo que encosta numa borda é desenhado DE NOVO
   * do outro lado.
   *
   * A opacidade cai com a distância da linha do meio: sem isso a banda tem topo e base retos, e
   * uma névoa com aresta lê como faixa de cor, não como ar.
   */
  private makeFogBand(): void {
    const W = 256;
    const H = 64;

    // CANVAS, e não `Graphics` — as duas razões são visíveis em tela:
    //
    //  1. `fillCircle` desenha um disco de aresta DURA. Cem discos duros em alpha baixo somam um
    //     degradê liso, que é filtro de cor, não névoa. O gradiente radial do canvas dá borrão de
    //     verdade, e é dele que vem o corpo.
    //  2. `Graphics` não sabe APAGAR. A queda das bordas precisa ser um recorte por cima do
    //     desenho pronto (`destination-out`); calculá-la por borrão não funciona — um borrão de
    //     raio 40 numa faixa de 64 cobre a altura inteira em alpha uniforme e devolve a faixa uma
    //     ARESTA RETA no topo e na base. Foi exatamente o que apareceu na primeira versão: as
    //     cinco camadas com emendas horizontais atravessando a pintura.
    const tex = this.textures.createCanvas('fogBand', W, H);
    if (!tex) return;
    const ctx = tex.getContext();

    // LCG: a textura tem que sair IGUAL toda vez. Uma névoa sorteada com Math.random muda a cada
    // recarga, e aí nenhuma revisão visual vale para a próxima.
    let semente = 0x5eed;
    const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    const borrao = (x: number, y: number, r: number, a: number): void => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(255,255,255,${a})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };

    // DUAS PASSADAS, e é isso que dá VOLUME em vez de véu: massas grandes que se acumulam onde se
    // sobrepõem (a nuvem) e borrões pequenos por cima (o grão que prova que ela tem textura).
    // Os alphas são ALTOS para gradiente radial: o borrão só entrega o valor de pico no centro
    // exato e cai a zero na borda, então a média que ele deposita é uma fração do número aqui.
    // Os 0.12/0.09 da primeira tentativa (herdados dos discos duros do `Graphics`) devolveram
    // uma bruma transparente demais — foi preciso mais que o dobro para a mesma densidade.
    const passadas = [
      { n: 34, rMin: 16, rMax: 38, alpha: 0.26 }, // as massas
      { n: 55, rMin: 5, rMax: 14, alpha: 0.18 }, // o grão
    ];

    for (const p of passadas) {
      for (let i = 0; i < p.n; i++) {
        const x = rnd() * W;
        const y = H / 2 + (rnd() - 0.5) * H * 0.9;
        const r = p.rMin + rnd() * (p.rMax - p.rMin);
        borrao(x, y, r, p.alpha);
        // As cópias que fecham a emenda horizontal (ela roda em TileSprite).
        if (x - r < 0) borrao(x + W, y, r, p.alpha);
        if (x + r > W) borrao(x - W, y, r, p.alpha);
      }
    }

    // A QUEDA DAS BORDAS, recortada por cima: sem ela a faixa tem topo e base retos, e névoa com
    // aresta lê como faixa de cor. Só na vertical — na horizontal ela precisa fechar, não sumir.
    const recorte = ctx.createLinearGradient(0, 0, 0, H);
    recorte.addColorStop(0, 'rgba(0,0,0,1)');
    recorte.addColorStop(0.22, 'rgba(0,0,0,0)');
    recorte.addColorStop(0.78, 'rgba(0,0,0,0)');
    recorte.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = recorte;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    tex.refresh();
  }

  /**
   * RAIO 192×24: um facho de luz de bordas suaves, que ganha o ângulo e a cor no uso
   * (`Parallax`). É o único elemento CLARO da saída da atmosfera — a luz vem do arco aceso do
   * planeta, e o resto da cena é casco escuro e bruma.
   *
   * Some nas DUAS pontas de propósito: um facho com fim reto vira um retângulo deitado. E o pico
   * fica em 0.55, não em 1 — ele é somado (blend ADD) por cima da névoa, e um facho a pino
   * estoura a tela, que é justamente o que não se quer aqui.
   */
  private makeGodRay(): void {
    const W = 192;
    const H = 24;
    const PASSO = 6;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    for (let y = 0; y < H; y++) {
      // Queda transversal ao facho, ao quadrado: o miolo concentra e a borda dissolve.
      const t = 1 - Math.abs(y - (H - 1) / 2) / ((H - 1) / 2);
      const transversal = t * t;
      if (transversal <= 0) continue;

      for (let x = 0; x < W; x += PASSO) {
        // Queda ao LONGO do facho: entra e sai suave (meio seno nas duas pontas).
        const u = (x + PASSO / 2) / W;
        const longitudinal = Math.sin(Math.PI * u);
        g.fillStyle(0xffffff, 0.55 * transversal * longitudinal);
        g.fillRect(x, y, PASSO, 1);
      }
    }

    g.generateTexture('godRay', W, H);
    g.destroy();
  }

  /** Nave 16×12: cunha apontando para a direita + brilho de motor. */
  private makeShip(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(COLORS.player, 1);
    g.fillTriangle(0, 0, 16, 6, 0, 12);
    g.fillStyle(COLORS.playerDark, 1);
    g.fillRect(0, 4, 6, 4);
    g.fillStyle(COLORS.playerBright, 1);
    g.fillRect(2, 5, 2, 2);
    g.fillStyle(COLORS.playerGlow, 1);
    g.fillRect(0, 5, 1, 2);

    g.generateTexture('ship', 16, 12);
    g.destroy();
  }

  /**
   * MINA 14×14: núcleo magenta pulsando entre espinhos.
   *
   * Lê como PERIGO à primeira vista — é estática e explode em raio, então o jogador precisa
   * identificá-la de longe, não descobrir o que era depois de encostar. Cor de inimigo,
   * nunca de rocha (docs/GDD.md: "o jogador nunca morre por não ter enxergado").
   */
  private makeMine(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Espinhos, nos 4 eixos.
    g.fillStyle(COLORS.metalMid, 1);
    g.fillRect(6, 0, 2, 14);
    g.fillRect(0, 6, 14, 2);

    g.fillStyle(COLORS.metalDark, 1);
    g.fillCircle(7, 7, 5);
    g.fillStyle(COLORS.enemy, 1);
    g.fillCircle(7, 7, 3);
    g.fillStyle(COLORS.enemyBright, 1);
    g.fillRect(6, 6, 2, 2);

    g.generateTexture('mina', 14, 14);
    g.destroy();
  }

  /**
   * CANHONEIRA-CAPITÂNIA 112×64 — chefão da Fase 2.
   *
   * Deitada e LONGA, não uma torre: é uma nave capital, e a silhueta tem que dizer isso
   * antes de o jogador ler qualquer barra de vida. Aponta para a ESQUERDA (vem na sua direção),
   * ao contrário dos sprites gerados — este é desenhado, então já nasce virado.
   */
  private makeCapitania(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Casco: cunha longa, proa à esquerda.
    g.fillStyle(COLORS.metalDark, 1);
    g.fillPoints(
      [
        { x: 0, y: 34 },
        { x: 30, y: 14 },
        { x: 100, y: 8 },
        { x: 112, y: 22 },
        { x: 112, y: 46 },
        { x: 96, y: 58 },
        { x: 28, y: 52 },
      ],
      true,
    );

    // Superestrutura: a massa que quebra a silhueta e dá leitura de "capitânia".
    g.fillStyle(COLORS.metalMid, 1);
    g.fillRect(56, 4, 34, 14);
    g.fillRect(20, 28, 76, 6);

    // Baterias (de onde saem os leques) e a ponte.
    g.fillStyle(COLORS.enemyBright, 1);
    g.fillRect(10, 30, 7, 5);
    g.fillRect(34, 40, 6, 5);
    g.fillRect(62, 8, 8, 5);

    // Motores, à ré.
    g.fillStyle(COLORS.hot, 1);
    g.fillRect(106, 26, 6, 6);
    g.fillRect(106, 38, 6, 6);

    g.generateTexture('capitania', 112, 64);
    g.destroy();
  }

  /**
   * A AURORA 160×72 — a capitânia da SUA frota. Placeholder da interlude.
   *
   * Cor de ALIADO (o azul da paleta do jogador), não de inimigo: o jogador tem que saber, sem
   * uma linha de texto, que aquilo ali é casa. A Canhoneira-Capitânia inimiga é cinza-metal com
   * luzes magenta; esta é azul com luzes quentes.
   *
   * Tem um HANGAR aberto na proa — é onde a nave pousa. A doca precisa ser um lugar visível na
   * silhueta, senão o pouso parece a nave sumindo dentro de um bloco.
   */
  private makeCarrier(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    g.fillStyle(COLORS.bgFar, 1);
    g.fillPoints(
      [
        { x: 0, y: 40 },
        { x: 34, y: 18 },
        { x: 140, y: 12 },
        { x: 160, y: 30 },
        { x: 160, y: 52 },
        { x: 132, y: 66 },
        { x: 30, y: 60 },
      ],
      true,
    );

    g.fillStyle(COLORS.playerDark, 1);
    g.fillRect(78, 6, 46, 14);
    g.fillRect(24, 36, 116, 5);

    // O HANGAR: boca escura na proa. É a doca — o alvo do pouso.
    g.fillStyle(COLORS.bgDeep, 1);
    g.fillRect(8, 40, 34, 14);
    g.fillStyle(COLORS.player, 1);
    g.fillRect(8, 39, 34, 1);
    g.fillRect(8, 54, 34, 1);

    // Janelas acesas: é o que faz uma silhueta parecer HABITADA — e é o que transforma a
    // implosão numa perda, em vez de uma explosão bonita.
    g.fillStyle(COLORS.hotBright, 1);
    for (let i = 0; i < 22; i++) {
      g.fillRect(Phaser.Math.Between(46, 150), Phaser.Math.Between(16, 58), 2, 1);
    }

    g.fillStyle(COLORS.playerBright, 1);
    g.fillRect(154, 32, 6, 7);
    g.fillRect(154, 44, 6, 7);

    g.generateTexture('carrier', 160, 72);
    g.destroy();
  }

  /**
   * Asteroide 24×24. Placeholder de piloto — a arte do PixelLab está por vir.
   *
   * É um POLÍGONO IRREGULAR, não um retângulo. A versão anterior empilhava dois `fillRect` e
   * saía um quadrado — o que passava despercebido enquanto o asteroide não era usado, mas na
   * Fase 2 ele é o cinturão INTEIRO (obstáculo + as duas camadas de parallax). Um quadrado
   * girando é a única coisa que se vê, e a silhueta é justamente o que precisamos julgar antes
   * de gastar geração no PixelLab.
   */
  private makeAsteroid(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Raio sorteado por vértice: nenhum lado reto, nenhuma simetria.
    const pts: Phaser.Types.Math.Vector2Like[] = [];
    const lados = 9;

    for (let i = 0; i < lados; i++) {
      const a = (i / lados) * Math.PI * 2;
      const r = Phaser.Math.Between(8, 12);
      pts.push({ x: 12 + Math.cos(a) * r, y: 12 + Math.sin(a) * r });
    }

    g.fillStyle(COLORS.metalDark, 1);
    g.fillPoints(pts, true);

    // Aresta clara de UM lado só: é o que dá volume a uma silhueta chapada (o mesmo truque
    // do `spire`). Sem ela a rocha é uma mancha.
    g.fillStyle(COLORS.metalMid, 1);
    g.fillPoints(pts.slice(0, 4).concat([{ x: 12, y: 12 }]), true);

    // Crateras: duas manchas escuras quebram a superfície lisa.
    g.fillStyle(COLORS.bgDeep, 1);
    g.fillCircle(9, 14, 2.5);
    g.fillCircle(16, 9, 1.5);

    g.generateTexture('asteroid', 24, 24);
    g.destroy();
  }
}
