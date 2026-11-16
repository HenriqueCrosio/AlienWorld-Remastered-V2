# START — o SOM, folha 3: os inimigos comuns e os perigos

> ⚠️ **ESTE START FICOU COMO O REGISTRO DE 16/11** (as folhas 3, 4, 5a e 5b, na ordem em que aconteceram). A próxima
> sessão abre no `plans/2026-11-17-som-chefes-START.md`.

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. Em 15–16/11 o SOM entrou antes do F (a trilha é
> dele, os efeitos são meus): a fundação, a folha 1 (a nave, com a TERMINUS rotativa) e a folha 2 (as explosões, com o
> lastro e o drone próprio) estão no jogo, aprovadas, commitadas e empurradas. A sessão abre na FOLHA 3: os inimigos
> comuns e os perigos. Conferir no código antes de gerar; listar o que vai na folha; ele escolhe na folha e confere
> jogando no `?sandbox`."**
> A spec é `specs/2026-11-15-bloco-som-design.md` — LER A §10 ("O que mudou na execução"): ela vale sobre o resto.

## ▶️ ONDE ESTAMOS (16/11, fim da sessão)

- Branch `feat/cartas-preview`, empurrada para `origin` (nunca `legacy`). Os commits do som: `4a7d151` (o jogo),
  `257987b` (as ferramentas, os testes, as folhas 1–7, os originais), `241608d` (os docs). Depois deles, só docs
  (este START, a §10 da spec, o 🧭) — sem commit, a pedido dele.
- **No jogo:** o tocador (`src/som/Som.ts`), a acústica pelo lugar, o LASTRO, `Som.trocarDeCena` em toda cena (o
  estrondo da F1 é a única `ponte`), as 3 naves, as cartas, as 10 explosões + os efeitos das cartas + os acertos, o
  drone com categoria própria, a TERMINUS rotativa (o M2 segurando, o A1 chegando ao soltar). 2,2 MB em `public/sfx/`;
  créditos em `docs/SONS.md`.
- **Ele, depois de jogar no sandbox (16/11):** *"com muitos inimigos e sons ficaram realmente muito bons"*; mas *"sem
  trilha sonora, ainda os barulhos estão bem isolados"* → o PASSE DE MIXAGEM (§10.6 da spec) está proposto e espera a
  decisão dele de quando fazer (antes, durante ou depois das folhas 3–8).
- ✅ **16/11 (sessão da folha 3) — os originais em FLAC** (ele: *"sim, converter agora"*): os 144 WAV viraram FLAC,
  cada um conferido amostra a amostra (31,3 → 16,3 MB); `scripts/_som/_original.mjs` (`original()` acha o `.flac` de um
  caminho `.wav`; `guardarComoFlac()` converte e prova antes de apagar). O `_folha-montar` grava FLAC sozinho depois de
  baixar/sintetizar; os `local` dos `_origem.json` apontam para `.flac`. Provado: a TERMINUS recomposta dos FLAC sai
  idêntica às 10 composições de antes; `test-som` e `test-som-tratar` verdes. Os sons do jogo (`public/sfx/`) não mudaram.
- ✅ **O passe de mixagem fica DEPOIS da folha 3** (ele, 16/11).
- 🟠 **A FOLHA 3 (16/11):** 20 sons, 58 versões (`folhas/2026-11-16/sons/8-inimigos/`, grupo `inimigos`); os 3 opcionais
  entraram (ele: *"o perigo do impacto do asteroide precisa ser de uma rocha colidindo no espaço. O ricochete é uma boa
  o respingo tb"*). **18 escolhidos e NO JOGO** (`FOLHA_3_INIMIGOS` no catálogo, `public/sfx/inimigos/`): o tiro e o
  aviso da canhoneira (`EnemySystem.fireAt`/`updateGunner`), o leque da aranha como UM tiro + agachar/salto/pouso
  (`updateAranha`), o estalo da água-viva (renomeado `aguaviva.estalo`: o 1º trecho do nome é só minúsculas), a baia do
  cargueiro, o aviso/tiro da torre e o míssil do casco (`TerrainSystem`), o acordar + pavio da sensora (`DebrisSystem`),
  a rocha batendo (`damageShip(impacto)`, só quando o golpe CONTA; asteroide/minerável/destroço), o rasgo da porta
  (`matarPorta`, antes do estouro), o gás em laço / a ignição / o respingo do esfíncter. Passa-baixa 4,5 kHz no estalo
  e no acordar (eram agudos). `scripts/test-som-inimigos-jogo.mjs` (21 verificações) + os testes do som e o build verdes.
  **Voltaram para refazer (sem nota):** `kamikaze.travar` e `acerto.indestrutivel` → rodada 2 na folha
  `.../8b-refazer/` (o corpo do kamikaze em vez do bipe; o tiro morrendo em vez do tinido). Ganchos deles só depois da
  escolha. Se recusarem de novo: PERGUNTAR A DIREÇÃO. Ferramenta nova: `_sintetizar-folha3.mjs`.
  **A rodada 2 voltou, agora COM a direção dele:** o travar = *"algo que dá lock em você, mas mais curto e agudo. Como
  algo sibilante que te marca"*; o ricochete = *"som de ricochete, algo batendo num objeto mais duro que faz o projétil
  ricochetear"* → rodada 3 em `.../8c-rodada3/` (G/H/I PixelLab, J sintetizado em cada).
  **Escolhas da rodada 3:** o travar = H (no jogo: toca UMA vez quando o kamikaze entra na tela); o I do ricochete virou
  o da MANTA (`nave.charybdis.ricochete`). **O RICOCHETE É DA NAVE** (a ideia dele): `GameScene.ricochetear` sorteia
  entre todo `nave.<nave>.ricochete*` do catálogo, no máximo 1 a cada 110 ms, só no DURO que não morre (pico, nave
  caída, costela, maquinário, mesas; o destroço da F2/F3 — não na carne da F4); a nave sem ricochete fica com o acerto
  do material. Para a TERMINUS (*"recorte cada um deles e coloque como randomico"*) e a X-AELO (o laser) ele mandou 2
  referências (`C:/Users/Henrique/Music/ricochetes variados.mp3` e `ricochete laser.mp3`) de **licença incerta** (ele
  respondeu) → SÓ MEDIDAS: a TERMINUS tem 5 ricochetes colados (0,26/0,49/0,80/1,23/1,56 s; o estalo ~4,8 kHz + o
  zumbido com nota 650–1.200 Hz), o laser desce 2,3 kHz → 300 Hz em 0,89 s. Sintetizados desse perfil
  (`_sintetizar-ricochete.mjs`, conferidos contra a medida) + PixelLab: folha `.../8d-ricochetes/` (grupo
  `ricochetes`; o conjunto da TERMINUS = `ricocheteS1…S5` ou `ricocheteP1…P4`, cada variação no catálogo com o próprio
  nome). `test-som-inimigos-jogo` tem 23 verificações, verdes.
  **A folha 8d foi REPROVADA** (ele: *"não ficaram boas as gerações... eu construí o que precisávamos"*) e ELE entregou os
  arquivos (`C:/Users/Henrique/Music/efeitos terminus/`; ele confirmou: feitos por ele, próprios) → grupo `dele`
  (`assets/raw/sons/dele/`, os originais em m4a como ele mandou; `_som-instalar` ganhou o crédito `dele: true` → "feito
  por ele | Henrique | próprio"): `nave.terminus.ricochete1…5` (sorteados) e `nave.xaelo.ricochete` (o laser) NO JOGO,
  sem folha. O 2 e o 5 têm 0,12 s de som ANTES do golpe (deixado como ele mandou; perguntado se corta). O grupo
  `ricochetes` (os sintetizados e os do PixelLab) fica só como registro.
  **OS FLYBYS DELE ficam GUARDADOS** (*"nos efeitos, deixei separado alguns flybys para encher com mais imersão"*):
  `assets/raw/sons/dele/flybys/` — `flyby_jet_far` (8,2 s), `flyby_spaceship_falconstyle` (3,9 s),
  `flyby_spaceship_variation` (3,6 s), todos estéreo. NÃO instalados: são para a folha 7 (cutscenes) / 8 (ambiente) —
  perguntar onde cada um passa (a frota ao fundo da F3? a decolagem do hangar? o menu?). `test-som-inimigos-jogo`: 24.
  Os ricochetes da TERMINUS: *"ficou ótimo"* — o 2 e o 5 ficam como ele mandou. **A FOLHA 3 FECHOU.**
- 🟠 **A FOLHA 4 (os elites), 16/11:** a lista de 28 aprovada (*"pode ser assim, siga"*); a folha
  `folhas/2026-11-16/sons/9-elites/` (grupo `elites`, 62 versões: PixelLab A/B, sintetizado C nos avisos de tempo exato
  — `_sintetizar-folha4.mjs`: o pavio do drone 0,6 s, a mira 0,6 s e o trava 0,3 s da lula, o inchar do Tubo 0,6 s, e o
  tiro do drone, porque o PixelLab deu DUAS mudas para "crystal shard" — e Kenney no escudo e na minigun). Os ganchos
  estão levantados (os `entrar`/`atualizar` de `src/entities/elites/*.ts`); o enxame das moscas = UM laço que sobe com o
  número delas.
  **As escolhas (16/11): 27 NO JOGO** (`FOLHA_4_ELITES`, `public/sfx/elites/`), com as notas dele nos números: a broca B
  *"mais abafado"* (passa-baixa 1,2 kHz), o alerta A *"mais baixo"* e abafado, o pavio = a C **modulada** (C2: vibrato +
  tremor 6 → 22 Hz, passa-baixa 1,6 kHz), a quebra do escudo B *"mais abafado e mais baixo"*; passa-baixa nos agudos
  escolhidos (o enxame A 3 kHz, as agulhas A, o trava A, a pupa B). Os ganchos nos `entrar`/`atualizar` dos elites
  (laços da broca e da roda por entidade, parados no `destroy`; o enxame = UM laço no `EnemySystem.somDoEnxame`).
  `scripts/test-som-elites-jogo.mjs` (20 verificações) + os outros testes do som e o build verdes.
  **A sobrecarga voltou (sem nota)** → rodada 2 na folha `.../9b-sobrecarga/` (o motor acelerando: D sintetizado, E/F
  PixelLab); o gancho já está no `Sentinela.entrar` (fica mudo até a escolha). Se voltar de novo: PERGUNTAR A DIREÇÃO.
  **Escolhida: a D, *"mais grave e bem mais abafado"*** → a D2 (o mesmo arranque mais grave: corpo 65 → 160 Hz) +
  passa-baixa 900 Hz, NO JOGO; `test-som-elites-jogo` com 20 verificações, verde. **A FOLHA 4 FECHOU no código** (falta
  ele conferir jogando). Próxima: a folha 5 (os chefões).
- 🟠 **A FOLHA 5 (os chefões), 16/11 — dividida em 3 a pedido (são ~58 momentos):** 5a as máquinas (a Torre da F1, a
  Capitânia), 5b a Serpente e a enguia, 5c o Guardião e o Predador. **A 5a montada:** `folhas/2026-11-16/sons/
  10-chefes-maquinas/` (grupo `chefes-maquinas`, 13 sons, 26 versões; nomes `chefe.torre.*` / `chefe.capitania.*`;
  sintetizados em `_sintetizar-folha5.mjs`: a carga do míssil 0,65 s, o pavio do flak 0,35 s). Os ganchos: `Boss.ts`
  (o `update` do leque, o `aimed` com atraso, `tickMissiles` a carga, `launchMissile`, `startTakeoff`, `swapToAirArt`/
  `finishTakeoff` para o laço do motor) e `BossCapitania.ts` (`launch` = o hangar, `burst` = uma bateria, `lancarCapsulas`
  = o flak, `tickFlak` fuse ≤ 0,35 = o pavio, `detonate`, `aimed`, a troca `enraged` = a fúria).
  **Escolhas da 5a: 11 NO JOGO** (`FOLHA_5A_MAQUINAS`, `public/sfx/chefes-maquinas/`, prioridade `chefe`), os ganchos
  acima ligados; `scripts/test-som-chefes-jogo.mjs` (a 5a: 9 verificações) verde. Rodada 2 em `.../10b-maquinas-r2/`:
  a DECOLAGEM = a B dele + um foguete por cima (*"adicionar uma geração de efeito de foguete em lançamento"*; BF1/BF2,
  mixados com ffmpeg, B 55 % + foguete 45 %) — no jogo fica a B até a escolha; o MOTOR (*"um som mais de thrusters
  mesmo"*: E/F PixelLab, G/H Kenney `thrusterFire`), gancho no `finishTakeoff`, mudo até a escolha; o PAVIO DO FLAK
  (voltou sem nota: D chiando, E assobiando), gancho no `tickFlak`, mudo até a escolha.
  **Escolhidas:** a decolagem BF1 e o motor G (Kenney `thrusterFire_003`, laço 0,35), NO JOGO (o teste confere o laço no
  ar). Duas correções de ferramenta: o `_som-instalar` lia "BF1" como "B" (a versão agora é letra + letras/dígitos) e
  ganhou o crédito `mistura` (PixelLab mixado no projeto); o `test-som` só cobra o "baixo e abafado" dos motores DAS
  NAVES. **O pavio do flak voltou de novo, agora com direção** (*"o som precisa ser de um click/estalo"*) → rodada 3
  em `.../10c-flakpavio/` (F um clique, G dois, H três acelerando sintetizado, I interruptor Kenney).
  **Escolhido: o G** (dois cliques secos, PixelLab; passa-baixa 5 kHz, um por cápsula), NO JOGO; `test-som-chefes-jogo`
  com 11 verificações, verde. **A 5a FECHOU.** Próxima: a 5b (a Serpente e a enguia), depois a 5c (o Guardião e o
  Predador). Nada commitado desde `241608d` (as folhas 3, 4 e 5a estão no jogo, sem commit).
- 🟠 **A 5b (a Serpente e a enguia) montada:** `folhas/2026-11-16/sons/11-serpente/` (grupo `chefes-serpente`, 30 sons,
  65 versões; C sintetizadas no `_sintetizar-folha5.mjs`: o tremor 1,2 s, a carga do raio 0,75 s, a da laranja 2,5 s, a
  dos canos 1,8 s, a leitura do Eco 2 s; 3 mudas do PixelLab trocadas por A2/B2). **Os ganchos, quando ele escolher:**
  as habilidades rodam no Node para os oráculos → o som entra por um método OPCIONAL `som?()`/`somLaco?()` na fachada
  `CorpoSerpente` (`serpente/habilidade.ts`), implementado no `BossSerpente`; a chuva (`subir` i=0 = a salva, `onda`,
  o casulo no casco = o impacto), o raio (os cruzamentos de `t0`/`tC`/`tA`/`t1`/`t3` de cada fatia), o gás (`G.sopro`
  = o laço, `tc` = a carga, `feitas[i]` + `golpeia` = a faísca, `acende('nave')` = o retorno), o `contra` = a dor, a
  `transicao` = a cabeça morrendo, `fusao`/`acenderLuzes` = a fusão, a `chegar` (`tremendo`/`estourarChegada`) = a
  chegada. A ENGUIA roda num worker: o motor tem que mandar os perigos com TIPO e ID (`L.agora`: `fogo`/`geiser`/`eco`)
  e a cena (`emJogo.recebe`) toca quando um id novo aparece; os gestos saem da troca do `estado.hab` (`canos`, `eco`,
  `presa`, `desfaz`, `resto`), o ronco do `estado.lombada`, o anel de cada `mordida`.
  **Escolhas da 5b: 29 NO JOGO** (`FOLHA_5B_SERPENTE`, `public/sfx/chefes-serpente/`; passa-baixa 5 kHz no trava B, no
  gêiser A, no desfaz B e na convergência A), com TODOS os ganchos acima ligados (a fachada ganhou `som?`/`somLaco?`; o
  worker manda `vivos` = [tipo, id, x]; `EnguiaEmJogo.soar`). Os oráculos (`test-serpente-hab`, `test-enguia-porte`,
  `test-enguia`, `test-serpente`) seguem verdes — o som não mudou o comportamento. `test-som-chefes-jogo`: 25
  verificações (a 5a + a Serpente + a enguia), 3 rodadas verdes seguidas (dois testes oscilantes do hangar e do flak
  consertados no roteiro). **A salva da chuva voltou** (*"pense numa salva de mísseis descendo"*) → rodada 2 em
  `.../11b-salva/` (D nove mísseis em sequência, E cascata caindo, F rajada de mini-mísseis); o gancho já está no
  `Chuva.subir` (i = 0), mudo até a escolha.
  **Escolhida: a D** (*"lembrando que cada cabeça lança uma salva"*), NO JOGO. O teste pegou que só UMA soava (as três
  cabeças cospem no mesmo quadro e o tocador segura um som igual por quadro) → cada cabeça soa num casulo diferente da
  própria salva (o 1º, o 4º, o 7º: 66 ms entre elas); `test-som-chefes-jogo` confere 3 salvas para 3 cabeças. **A 5b
  FECHOU.** Próxima: a 5c (o Guardião e o Predador).
- **16/11 noite — ele jogou (depois do Ctrl+Shift+R: a aba dele estava com o código antigo, sem os sons novos;
  medido: numa aba nova os 148 carregam e saem com sinal) e pediu 4 ajustes:**
  1. **A SALVA "mais abafada e oca, como se estivessem no espaço"** → a D2 (a D com passa-alta 140, passa-baixa 1 kHz e um
     pente de ecos 9/17 ms; crédito `mistura` = PixelLab mixado no projeto), NO JOGO.
  2. **O RASPAR DA ENGUIA** (*"quando a enguia entra, ela salta e raspa seu corpo várias vezes no casco [...] uma estrutura
     enorme raspando em outra estrutura, na pegada de efeitos de filmes com naves gigantes no espaço"*): a `Luta` já
     calculava os contatos do corpo com a borda (as faíscas e a fumaça) → `luta.raspou` (só leitura, sem dado: os
     oráculos `test-enguia*` verdes) → `EstadoEnguia.raspa` → `EnguiaEmJogo.soar`: um laço `enguia.raspa` que cresce com
     o número de contatos e some 0,3 s depois do último. 3 versões (PixelLab) na folha `.../11c-raspa/`; o gancho está
     pronto, a entrada do catálogo entra com a escolha.
  3. **OS CHEFÕES NO ESPAÇO "contidos, como num local fechado"** → `CHEFE_NO_VACUO` (`acustica.ts`), aplicado no
     `Som.voz`: na cabine, todo som de `prioridade: 'chefe'` (camada ação) passa por passa-baixa 2,2 kHz, desce a 70 % e
     manda 8 % para uma SALA FECHADA (um eco curto e escuro, convolver de 0,6 s). Medido: o mirado da Capitânia
     0,50 → 0,36, o raio da Serpente 0,53 → 0,32, o fim de chefão 0,79 → 0,58 (a 1ª tentativa, sala a 35 %, saiu MAIS
     ALTA que na atmosfera — corrigida).
  4. **A ÚLTIMA EXPLOSÃO DA AURORA alta e aberta** → ela é o `explosao.chefeFim` (prioridade `chefe`) numa cena de cabine:
     entra na regra 3, abafada e mais baixa.
  **Ele confirmou:** o raspar = A e B (*"variação é bom"*: `enguia.raspa` / `enguia.raspa2`, sorteados a cada raspada;
  medido: o worker manda até 63 contatos no arco da entrada e no mergulho), a salva D2. **A Aurora continuou "estilo de
  atmosfera"** (*"quero um bum oco e abafado"*) — o filtro não apaga a cauda de céu aberto gravada no arquivo → um som
  PRÓPRIO, `momento.aurora.fim` (grupo `momentos`): os 2,2 s iniciais do chefeFim A, só o grave (450 Hz), o pente
  12/23 ms, a cauda cortada e um golpe sub-grave (55 → 32 Hz); a cutscene estoura em silêncio e toca ele + o lastro.
  `test-som-chefes-jogo`: 29 verificações (o raspar contado desde a fusão; a Aurora sem o chefeFim), 2 rodadas verdes.

## ▶️ A FOLHA 3: o que vai nela (do roadmap da spec §6, a conferir no código)

1. **Os inimigos comuns** — o TIRO de cada um, o AVISO (o telegrafar) onde houver, e a morte só onde não for a
   explosão do material (a folha 2 já cobre a morte pelo material):
   - `batedor`, `canhoneira`, `kamikaze` (o mergulho/a aceleração), `cargueiro`, `aranha`, `aguaViva` (o choque dela);
   - o `drone` já tem acerto e morte próprios (folha 2) — falta o TIRO dele, se ele atira.
2. **Os perigos** — as minas sensoras (o sensor acordando, o bip, a detonação já é `explosao.perigo`), os asteroides
   (o impacto na nave; a quebra já é `explosao.rocha`), os destroços (o ricochete do tiro no indestrutível), as portas
   da F4 (abrir/fechar), o esfíncter da F4 (a garganta, o gás, o estouro), as torres (o tiro delas).

**Onde está no código (o ponto de partida, conferir antes de perguntar):**
- o tiro dos inimigos: `EnemySystem.fireAt` (`src/systems/EnemySystem.ts`, chamado no `update`); o das torres:
  `TerrainSystem.fireAt` (`src/systems/TerrainSystem.ts`);
- os perigos: `src/systems/DebrisSystem.ts` (`HazardKind`, `spawn`, `explodesOnDeath`, `updateSensor` das minas);
- o esfíncter: `src/entities/esfincter.ts` (`armar`, o gás); as portas: `TerrainSystem` + `src/systems/RaizesPorta.ts`;
- o tiro inimigo absorvido pelo cenário: `GameScene.enemyBulletHitCover`.

## As leis do som (da memória `som-composicao-nao-isolado` e da §10 da spec)

- **Nada isolado:** cadeia tem base que cola (o lastro); momento roteirizado se compõe na cena.
- **O que repete muito é macio:** o tiro inimigo toca MUITO (filas coladas, ondas) — baixo, sem chiado; medir o agudo
  acima de 5–6 kHz contra o corpo ANTES de mostrar. Inimigo muito frequente pode ganhar categoria própria (o enxame).
- **Pressionar sem punir também no som:** o tiro inimigo avisa, não assusta; o aviso (telegrafar) é para o jogador LER.
- **Nenhum som atravessa a troca de cena** (`Som.trocarDeCena`); a exceção (`ponte`) só com pedido dele.
- **No espaço as explosões são mais baixas;** o fundo no vácuo é só o grave (`plano: 'fundo'`).
- **Recusado duas vezes sem nota:** perguntar a DIREÇÃO, não gerar às cegas.
- **A folha:** 2–3 versões por som (PixelLab + Kenney CC0 + sintetizado quando servir), ×8 para o que repete, o lugar
  certo de cada linha; ele cola as escolhas; instalar com `_som-instalar` + o catálogo à mão + os ganchos no código.
- **Licença:** só CC0, PixelLab (a conta dele) ou próprio; referência de terceiros (myinstants etc.) só se MEDE.

## As ferramentas (scripts/_som/)

`_folha-montar.mjs <grupo> <pasta>` (baixa o PixelLab, trata, descarta as mudas) · `_folha-dados.mjs` (`--folha`,
`--rodada`) · `_folha-sons.mjs` · `_folha-conferir.mjs` (a folha no navegador) · `_som-instalar.mjs <grupo> <pasta>` ·
`_som-tratar.mjs` (`--max`, `--tempo`, `--limpar`, `--laco`) · `_kenney-baixar.mjs` (os pacotes CC0: sci-fi, impact,
interface — `assets/raw/sons/_kenney/`, fora do git) · os sintetizadores (`_sintetizar-zing`, `-tup`, `-estalo`,
`-minigun`, `_compor-terminus`). Os originais e os manifestos de cada folha: `assets/raw/sons/<grupo>/` (`_origem.json`,
`_folha.json`, `_escolhas.txt`). O orçamento PixelLab: 3.845 gerações em 16/11, renova em 04/12 (o som das folhas 1 e 2 gastou ~140; conferir com
`get_balance`).

## Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status` (limpo, fora os vídeos, os `q/` e as fotos de 13/11).
2. Perguntar a ele, uma coisa por vez: (a) o FLAC antes? (b) o passe de mixagem agora ou depois da folha 3?
3. Ler no código os pontos acima; LISTAR o que vai na folha 3 (com o que cada som é e onde toca) e mostrar antes de gerar.
4. Gerar, medir, montar a folha, mostrar; com as escolhas, instalar e ele confere jogando no `?sandbox`.

## As leis de sempre

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, `q/`, `cru/`
  fora. A ordem: o jogo (`feat`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês.
- Editar com Edit/Write; um heredoc por comando; PowerShell sem `-Encoding utf8` corrompe acentos.
- Testes do som: `test-som`, `test-som-tratar`, `test-som-jogo`, `test-som-nave-jogo` (+ os do M e o build).
