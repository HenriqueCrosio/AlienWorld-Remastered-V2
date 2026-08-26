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
  // batendo (9f 128² — a ferida acende e apaga). CANVAS QUADRADO com a criatura centralizada:
  // a âncora é OUTRA em relação aos estáticos recortados (guardiao.png 256×227, nucleo.png
  // 122×122) — o BossNucleo compensa (a mesma armadilha da sheet do Leviatã, nº 33).
  guardiaoIdleSheet: { path: 'sprites/guardiao-idle-sheet.png', w: 256, h: 256 },
  nucleoBeatSheet: { path: 'sprites/nucleo-beat-sheet.png', w: 128, h: 128 },
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
  aranha: 'sprites/aranha.png',
  ...animFrames('serpenteAnim', 'serpente-anim'),
  ...animFrames('serpente2cAnim', 'serpente-2c-anim'),
  ...animFrames('serpente1cAnim', 'serpente-1c-anim'),
  ...animFrames('serpenteFusaoAnim', 'serpente-fusao-anim'),
  ...animFrames('aranhaAnim', 'aranha-anim'),
  ...animFrames('aranhaJumpAnim', 'aranha-jump-anim'),

  // O CASCO DO LEVIATÃ (Fase 3, Ato 2) — 7 artes do PixelLab (Henrique, 2026-08-25), 72×72.
  // Fontes em `assets/raw/casco-leviata-{1..7}.png`.
  //
  // DUAS famílias de propósito: `cascoLeviata` são os trechos LISOS (a base contínua da faixa) e
  // `cascoDetalhe` são os trechos com maquinário/veios/escamas (a pontuação). O `pickVariant`
  // sorteia UNIFORME dentro de cada família — a proporção entre elas sai do `gap` das duas
  // camadas no Parallax, não de peso. Ver `buildNebula()`.
  cascoLeviata: 'sprites/casco-leviata.png',
  cascoLeviata2: 'sprites/casco-leviata2.png',
  cascoDetalhe: 'sprites/casco-detalhe.png',
  cascoDetalhe2: 'sprites/casco-detalhe2.png',
  cascoDetalhe3: 'sprites/casco-detalhe3.png',
  cascoDetalhe4: 'sprites/casco-detalhe4.png',
  cascoDetalhe5: 'sprites/casco-detalhe5.png',

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

  // O NÚCLEO: o coração blindado do Leviatã, chefão FINAL (Fase 4). Escolha do Henrique
  // (cf5b3e43, 128px → 122×122 instalado). ⚠️ A FERIDA (a zona vulnerável) é MEDIDA no PNG:
  // x=52..91 y=56..87 (node scripts/find-pad.mjs nucleo 0 — os vermelhos de y<52 são luzes da
  // blindagem, não alvo). Trocar a arte OBRIGA a remedir (BossNucleo.CORE_OFF_*).
  nucleo: 'sprites/nucleo.png',

  // O GUARDIÃO: a 1ª forma do chefão final — a besta blindada ENROLADA em volta da massa
  // viva (arte CRIADA PELO HENRIQUE na interface do PixelLab, 03ef8c07, 256px → 256×227).
  // ⚠️ A massa vermelha (alvo) é MEDIDA: x=106..197 y=105..186 (find-pad guardiao 0).
  // Trocar a arte OBRIGA a remedir (BossNucleo.G_CORE_OFF_*).
  guardiao: 'sprites/guardiao.png',

  // ─── O INTERIOR ORGÂNICO DA FASE 4 (2026-07-21) ───
  // Os corredores do Leviatã eram picos e rochas de superfície tingidos — pedra lunar dentro
  // de um bicho VIVO, o lugar mentindo sobre o que é. O interior dele é costela biônica,
  // pedaço de órgão e maquinário pesado (a referência do Henrique: giger industrial).
  // Sem placeholder: sem o PNG, o corredor cai nas colunas de rocha de sempre.
  costela: 'sprites/costela.png',
  orgao: 'sprites/orgao.png',
  maquinario: 'sprites/maquinario.png',

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
