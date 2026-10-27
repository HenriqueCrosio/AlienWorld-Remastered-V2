# OS DESTROÇOS — a destruição por pixel, no jogo inteiro (26–27/10/2026)

Como um sprite se desfaz nos PRÓPRIOS pixels: ele estilhaça, queima em brasas ou se parte, e cada golpe que leva tira
pixels da borda dele. Tudo é desenhado pixel a pixel na resolução do jogo, sem uma peça de arte nova. A técnica nasceu
na morte da nave e na lasca do casco a cada vida perdida (spec `docs/superpowers/specs/2026-10-26-morte-da-nave-design.md`,
folha `docs/superpowers/folhas/2026-10-26/morte/morte.html`). Em 26–27/10 ela foi para o jogo todo: inimigos, elites,
minis, chefões, o golfinho, o cinturão da F2 e os destroços de nave (spec
`docs/superpowers/specs/2026-10-26-destrocos-inimigos-design.md`, folha `docs/superpowers/folhas/2026-10-26/inimigos/inimigos.html`).
Ele: *"pensa no asset como um asset destrutível, cada pixel é um pedacinho dele que pode tomar dano e se desfazer"*.

Onde fica:
- o código está em `src/systems/morte/`:
  - `pedacos.ts` é a parte pura, sem Phaser: o corte, a mordida e as rampas;
  - `MorteDaNave.ts` é a morte da nave do jogador, e `numerosMorte.ts` os números dela;
  - `Destrocos.ts` é o motor dos outros (um por cena), e `numerosDestrocos.ts` a separação, as tabelas e os números;
- na cena, os ganchos são do `GameScene` (§15);
- as ferramentas estão em `scripts/_morte/` (a nave) e `scripts/_inimigos/` (os outros), e o teste puro em
  `scripts/test-morte.mjs`.

Como ler:
- **§0–13:** a técnica de base, na morte da nave (o corte, a mordida, a queima, as cores, as telas, a física);
- **§13½:** a assinatura que só a nave do jogador tem;
- **§14:** os inimigos e os chefões (as mortes, as marcas na borda, a cicatriz refeita por quadro);
- **§14.1–14.3:** as peças do cinturão, a bala pela brecha e os chefões de carne;
- **§15:** o mapa do motor (as funções, as tabelas e os ganchos);
- **§16:** a receita para ligar a destruição numa coisa nova.

## 0. O método (antes de qualquer código)

1. **Os destroços são a arte que está na tela.** O quadro que o sprite mostra no momento é lido de volta da textura e
   cortado. Por isso a mesma morte serve para as quatro escolhas do hangar e para a Charybdis, e qualquer arte nova já
   nasce com a sua.
2. **Tudo em pixel, na resolução nativa.** Pedaço, brasa, fumaça e brilho vão para telas de 384×216, pixel por pixel.
   Não entra traço vetorial, degradê liso nem transparência para sumir (ver a memória
   `efeito-de-cena-assado-em-pixel`). As cores andam em degraus, e o que some, some pixel a pixel.
3. **Tudo é função do relógio `t` e de uma sorte com semente.** Não há tween. O mesmo `t` e a mesma semente dão o mesmo
   quadro, e é isso que deixa filmar a passos, comparar estilos com o mesmo golpe e testar.
4. **A parte pura é separada e testada em Node, nos sprites de verdade:** o corte, a mordida, a frente de queima e as
   rampas. Os testes conferem que nenhum pixel se perde ou se duplica e que os tamanhos são os pedidos.
5. **Filme no jogo, lado a lado e conferido ampliado.** Os painéis usam a mesma semente e a morte vem pelo caminho real
   (`damageShip`). Antes de mostrar, olhe cada momento numa grade ampliada (`_grade.mjs`): foi olhando os quadros
   ampliados do 1º filme das lascas que apareceu que a de 16 px sumia debaixo do estouro.

## 1. Ler o quadro e tirar a chama (`lerQuadro`, `ehChama`)

- **O quadro da tela:** `nave.frame` (`cutX/cutY/cutWidth/cutHeight` da fonte) é desenhado num canvas 2D
  (`willReadFrequently`) e lido como `Uint32Array`, no formato `0xAABBGGRR`. Esse é o `Bitmap` com que tudo trabalha.
  Um pixel conta como cheio com alfa ≥ 128.
- **A chama do motor não é casco.** Ela não vira pedaço; vira fogo na hora (`soltarChama`: cada pixel sai como brasa
  para trás). Para achar a chama:
  - use as cores EXATAS das chamas desenhadas à mão, nas 10 primeiras colunas;
  - um teste de cor não serve: o casco bege do jato (`d48744`) é gêmeo do laranja da chama da "a" (`de8d47`), e as
    luzes da "a" são o `f0b65a` da chama, só que mais à frente;
  - a chama fica numa lista à parte; na Ruptura ela tosse (acende e apaga ao acaso) até a nave se partir.
- **Para outro sprite** (um inimigo), a lista de cores de `ehChama` precisa virar parâmetro. Hoje ela é das chamas
  humanas, e um inimigo com essas cores exatas perto da borda esquerda perderia esses pixels.

## 2. O corte (`pedacos.ts`)

O corte vai em quatro passos, sempre os mesmos:

1. **As sementes:**
   - `sementesEspalhadas` (Estilhaços): sementes jogadas ao acaso com uma distância mínima, para um estilhaço por
     igual;
   - `sementesNoEixo` (Ruptura): três sementes no eixo comprido (cauda 18%, meio 50%, nariz 80%, na altura média da
     coluna) e uma na asa. A da asa é o pixel mais longe do eixo nos dois terços de trás, se estiver a 5 px ou mais
     dele, posta a 70% do caminho do eixo até a ponta, para o corte atravessar a raiz da asa e não a ponta. O resultado
     são partes que leem como partes de uma nave, não como cascalho.
2. **O rótulo** (`rotular`): cada pixel cheio vai para a semente mais perto, mas a distância é entortada por um ruído
   (`ruido`: valor ao acaso a cada 4 px, bilinear no meio, em −1..1, vezes `amp`). Cada semente lê o ruído deslocado
   (`x + k·17, y + k·11`), então cada fronteira entorta do seu jeito e o corte nunca sai reto.
3. **Os componentes** (`componentes`): o mesmo rótulo separado por um vão (entre duas asas) vira dois pedaços. A
   ligação é pelos 4 vizinhos.
4. **A extração** (`extrair`): cada pedaço guarda o bitmap na caixa dele, o canto, o centroide e a marca do corte em
   cada pixel:
   - **2:** o pixel está no corte (um vizinho de 4 é nave, mas de outro pedaço). É a linha que fica em brasa;
   - **1:** o pixel é vizinho de 8 de um pixel de corte. Só brilha um instante;
   - **0:** o resto, incluindo o contorno original da nave, que não acende.

Pedaço com menos de 5 px não vira corpo: cada pixel dele sai como brasa ou cinza (`corpoDe`).

**Quantos pedaços:** poucos e grandes. Uma nave tem uns 40×20 px e uns 450 px de casco. Com uma dúzia de estilhaços era
só rachadura e nenhum casco; ficou em 7 (`distMin` 8). A Ruptura dá 3 a 6 partes grandes.

## 3. A mordida de tamanho fixo (`lasca`, `soltarLasca`)

Esta é a perda de casco de cada vida que não é a última.

- **O centro:** um pixel da BORDA do casco (um vizinho de 4 vazio), entre 22% e 72% do comprimento. Assim a mordida
  fica longe da chama e da ponta do nariz.
- **O crescimento:** uma fila de prioridade a partir do centro, pelos vizinhos de 4. A chave é a distância entortada
  pelo ruído (`amp` 1,2), e a fila para em EXATAMENTE `alvo` pixels. Por isso a mordida sai rasgada, não um disco, e
  sempre numa peça só: ela nunca atravessa um vão.
  - Um raio fixo mordia de 6 a 39 px conforme caísse na ponta de uma asa ou no flanco. Contar pixels é o que dá uma
    medida definida.
- **A máscara:** 2 é a mordida; 1 é o aro, o casco que encosta nela.
- **`soltarLasca`:** a mordida é cortada em N partes e o RESTO do casco entra como mais um rótulo. Assim o corte das
  partes também marca o lado que rasgou do casco, e é esse lado que brilha. Só as partes da mordida voltam.

## 4. A frente de queima (`temposDeQueima`)

É a Desintegração. Cada pixel ganha a hora em que queima: a distância entortada até a origem, dividida pela maior,
vezes a duração. A origem é o motor, a 22% do comprimento, e a frente cruza o casco em 1 s. Os pixels vão numa lista
ordenada pela hora; a cada quadro, os que chegaram na hora se soltam (`queimarAte`).

- Antes da hora, o pixel continua casco. A 0,17 s da hora (2,4 × 0,07) ele chamusca (`queimar` 0,45). Nos últimos
  0,07 s ele brilha na rampa, do 0,4 ao branco.
- Na hora, ele sai como brasa: para fora a partir do pivô, a 10–34 px/s, e para trás a 16 px/s. Com o mundo rolando, o
  pó da nave fica para trás. 22% dos pixels saem como cinza (escura, lenta, dura 1,3–2,1 s).
- A brasa se solta no calor 0,88, não no branco: uma nuvem inteira de branco lia como mais uma bola de fogo. A frente
  também é fina (0,07 s): uma frente grossa cobria o casco.

## 5. As cores

- **As rampas** (`RAMPA_FOGO`, `RAMPA_BIO`) vão do branco-quente (h = 1) à brasa apagada (h = 0), em degraus:
  - o fogo é a paleta da PRÓPRIA explosão do PixelLab, amostrada de `explosion-sheet.png` com `_paleta.mjs`. Os
    pedaços queimam nas cores da bola de fogo de onde saem. O degrau mais frio é a cinza (marrom-acinzentado);
  - a Charybdis não pega fogo. A rampa dela é a bioluminescência, amostrada das manchas ciano dela.
- **`corDaRampa`** pega o degrau de baixo mais perto. Pixel art troca de cor; não esmaece entre cores.
- **`queimar`** carboniza em três níveis (1, 0,72, 0,5) e puxa para o marrom-escuro da brasa, não para o cinza.
- **O corte:** só a linha do corte (marca 2) é quente: 0,95 no começo, esfriando em 0,65 s (Estilhaços) ou 0,8 s
  (Ruptura). O pixel de trás (marca 1) só brilha um instante. O resto é CASCO. Na 1ª rodada, as duas fileiras quentes
  faziam os pedaços lerem como contornos acesos, e não como pedaços da nave.
- **O carvão:** nos Estilhaços, o miolo do pedaço carboniza até 0,5 em 1,6 s.
- **Sumir:** um Bayer 4×4 (`bayer(i, j)` nas coordenadas do bitmap, então o padrão gira com o pedaço). O pixel some
  quando `bayer < (t − some) / someEm`.

## 6. O desenho (as três telas)

Cada morte cria três `CanvasTexture` de 384×216 com chave única por instância (`serie`). Elas ficam presas à
profundidade da nave:

| tela | profundidade | o quê |
|---|---|---|
| fumaça | nave − 0,04 | os fumos, debaixo de tudo |
| destroços | nave + 0,02 | os corpos, as brasas, a cinza, a chama tossindo |
| brilho | nave + 0,03, aditiva | a luz de cada pixel quente |

- **A cada quadro:** zere as três, desenhe e mande com `putImageData` + `refresh`.
- **Um corpo girando** (`desenharCorpo`): para cada pixel da tela na caixa do corpo, pegue o pixel do bitmap pela
  rotação INVERSA (vizinho mais próximo). Nunca rode a imagem com filtro. O casco que está morrendo treme 1 px por
  quadro.
- **A luz** (`luz`): o pixel e uma cruz em volta, a 0,38. A tela do brilho guarda o MAIOR valor de cada canal, então
  duas luzes juntas não estouram em branco.
- **A fumaça** (`desenharFumos`): cada fumo é um disco de pixels que cresce e afina.
  - São três degraus de opacidade (0,62, 0,42, 0,22), não um degradê. O miolo é um tom mais claro que a borda.
  - Onde dois fumos se cruzam, vence o mais denso; não se somam numa mancha preta.
  - As cores são as da fumaça da nave avariada (a da Charybdis é o verde-escuro dela).
  - As partículas `puff` do Phaser liam como quadrados cinza ao lado dos destroços de pixel.
- **O chão (F1):** nada se desenha da linha do chão para baixo. O que cai some atrás dele.
- **Os estouros:** a folha do PixelLab (`Fx.sheetSprite`) fica 0,03 atrás da tela dos destroços, ou 0,03 na frente
  nos estalos pequenos. O tremor da câmera vem de `Fx.abalo`. Na Charybdis, o estouro é a descarga elétrica da
  água-viva (`Fx.choque`), e não fogo laranja em volta dos destroços ciano.

## 7. A física

- **Corpos rígidos** (`Corpo`): o bitmap, o pivô no centroide, a posição, o ângulo, a velocidade e o giro.
  - Na largada, cada pedaço sai de onde estava no casco, com 40% da velocidade da nave (`herda`) mais a deriva para
    trás (−40 px/s na atmosfera, −18 no vácuo).
  - O impulso é para fora, a partir do centro do estouro. Nos Estilhaços, pedaço pequeno vai mais rápido
    (`× (1 + 2,5/√n)`) e gira mais (`× min(1,6, 3/√n)`).
- **O mundo:**
  - na atmosfera (F1), gravidade 170 e arrasto 0,9;
  - no vácuo, sem gravidade e com arrasto 0,18, então os destroços derivam;
  - a brasa é leve (35% da gravidade) e a fumaça sobe no ar;
  - tudo freia por `1 − arrasto·dt`.
- **Brasas e fumos** ficam em arrays planos (`Float32Array`, até 2600 brasas e 400 fumos). Quem morre é trocado pelo
  último da lista, sem alocação, porque uma morte solta mais de mil.

## 8. A coreografia (`numerosMorte.ts`)

Cada estilo é uma sequência de horas no `t`. O momento grande chama `aoClimax`, e a cena liga a câmera lenta.

| estilo | o que acontece | dura |
|---|---|---|
| **A — Estilhaços** (Terminus) | o casco fica branco por 0,05 s e estoura em 7 pedaços grandes, de uma bola de fogo pequena (0,5) atrás deles; a chama vira fogo; pedaços de 22 px ou mais deixam rastro de fumaça; somem entre 1,4 e 1,9 s | 2,4 s |
| **B — Desintegração** (Charybdis) | um estalo pequeno no motor, na frente; a frente de queima cruza o casco em 1 s; cada pixel se solta como brasa ou cinza | 2,3 s |
| **C — Ruptura** (X-Aelo) | três estalos aos 0,06, 0,30 e 0,52 s (cauda, meio, nariz); a capotagem acelera em smoothstep até 2,6 rad/s; o motor tosse; aos 0,72 s, as queimaduras são assadas no casco e ele se parte pelo eixo e pela asa; 30% dos pixels do corte voam como lascas; a parte do motor segue cuspindo faísca | 2,8 s |

- **As queimaduras da Ruptura:** cada estalo deixa uma mancha. Até 3,4 px dela o casco carboniza e brilha, esfriando
  em 0,55 s; até 5,2 px, só chamusca. A fumaça sai das manchas.
- **A câmera lenta** (`MORTE.lenta`): o golpe entra na velocidade normal por 110 ms. Depois desce em smoothstep por
  140 ms, segura 700 ms a 0,35 e volta em 520 ms (curva k²). É a curva do esfíncter, mais curta.
- **Um clarão de câmera só,** curto e escuro (60 ms, `rgb(120, 80, 48)`). Um `flash` com força total pinta a tela
  inteira nos primeiros quadros: no 1º filme, a Ruptura mostrou duas telas beges.
- **Os estouros são pequenos e ficam atrás.** A bola de fogo de 1,05 cobria a própria quebra.
- **A folga:** 0,25 s depois do efeito, antes do GAME OVER. Da batida ao GAME OVER dá 3,3 a 3,8 s. Ele aprovou: *"ficou
  cinemática a morte"*.

**Cada nave tem a sua** (`ESTILO_DA_NAVE` / `estiloDaNave`): o jato se rompe, a "a" se estilhaça e a alien se
desintegra. Vale para as duas pinturas de cada modelo. O registry `estiloMorte` passa por cima, para o dev e os filmes.

## 9. A perda de casco: a medida é o golpe, não as vidas

A regra é dele. O número de vidas varia (cartas, 1-UP), então o aviso visual de um golpe tem que ser uma medida FIXA
por golpe, nunca uma fração das vidas que restam.

- **Cada vida perdida que não é a última** arranca 24 px da borda (§3), uns 5% da nave, no estilo da morte daquela
  nave. É uma prévia de como ela vai morrer (`MORTE.golpe`):
  - **Ruptura:** a peça sai INTEIRA (uma parte só, que se reconhece), girando e soltando lascas, e a mordida solta
    fumaça por 0,6 s;
  - **Estilhaços:** a mordida fica branca por 0,05 s e estoura em três estilhaços;
  - **Desintegração:** a mordida queima da borda para dentro em 0,22 s, cada pixel uma brasa.
- **A peça sai rápido** (48–72 px/s, 3–6 rad/s), na direção do pivô da nave para a mordida, com um leque de ±0,35 rad
  (Ruptura) ou ±0,65 (Estilhaços). Assim ela sai de cima da nave em poucos quadros. Junto saem 8 faíscas da ferida.
- **A cicatriz** fica no casco só durante a invulnerabilidade (1,4 s) e some pixel a pixel em 0,3 s:
  - o buraco é quase preto (o casco queimado duas vezes); o aro fica em brasa por 0,35 s e depois carbonizado;
  - na Charybdis, o buraco é o ciano mais escuro da rampa dela, com um aro ciano: escuro sobre o verde-escuro dela não
    lia;
  - se ficasse até o fim da fase, a cicatriz contaria golpes: com 6 vidas, a nave estaria toda mordida ainda com metade
    das vidas.
- **O aviso de "a próxima mata"** continua sendo a fumaça e o motor tossindo da última vida.
- **A carta Casco** segurando o golpe não lasca, porque não se perdeu vida.
- **Como é feita:**
  - é a mesma `MorteDaNave` com `golpe: true`. O casco inteiro vira uma âncora que segue a nave (posição, inclinação e
    velocidade, em `seguirNave`) e nunca é desenhado inteiro, porque o sprite continua lá;
  - a cicatriz é desenhada sobre o quadro que está NA TELA (`quadroAtual`, lido uma vez por quadro de animação e
    guardado por `textura:quadro`), porque as nadadeiras da manta mexem;
  - ela só aparece quando a nave está visível, então pisca com os i-frames;
  - é desenhada no `PRE_RENDER` da cena (§10).

## 10. Na cena (`GameScene`)

- **`gameOver`** cria a `MorteDaNave` com `opcoesDaMorte()`: estilo, material (`bio` na alien), atmosfera, linha do
  chão, `Fx` e semente.
  - A nave some e o corpo dela desliga.
  - A espera do GAME OVER é `morte.duracao` no relógio da cena. Esse relógio anda na escala da câmera lenta, então a
    espera dura a morte inteira, lenta ou não.
- **O mundo continua andando:** com `over` verdadeiro, o `update` chama `atualizarMorte`. Ela segue rolando o cenário,
  os bichos e o chefão na escala da câmera lenta, sem comando, roteiro, tiro, dano ou pontos. Antes o `update` parava
  inteiro, e com 2 s de destroços o fundo congelado leria como jogo travado.
- **`damageShip`** põe uma lasca em `golpes` (no lugar da explosão do PixelLab; o clarão rosa da tela ficou). A
  `atualizarGolpes(dt)` atualiza todas e destrói as que terminaram. Ela roda depois de a nave ser posicionada e
  piscada, e também durante a morte.
- **O `dt`** chega já multiplicado pela câmera lenta, e tudo dentro da morte anda nele, a fumaça também.

## 11. As armadilhas da implementação

- **A física do Arcade move a nave DEPOIS do `update` da cena.** Uma cicatriz desenhada no `update` fica um quadro
  atrás da nave (3 px no flap rápido). Ela se desenha no `Phaser.Scenes.Events.PRE_RENDER`. O ouvinte sai no
  `destroy`, e o `destroy` roda no `SHUTDOWN` da cena.
- **O `globalTimeScale` é do JOGO, não da cena.** Quem sai da cena no meio da câmera lenta devolve o tempo antes
  (`tempoNormal`); senão o menu inteiro roda a 35%.
- **As telas são texturas do gerenciador:** uma chave única por instância (várias lascas convivem com a morte) e
  `textures.remove` no fim.
- **O sprite pode trocar de quadro:** a cicatriz confere se o quadro de agora tem o tamanho do bitmap da mordida, e não
  desenha se não tiver.
- **Pedaço pequeno vira brasa,** senão sobra pó girando como corpo rígido.

## 12. Os testes e as ferramentas

- **`scripts/test-morte.mjs`** (Node, nos PNGs de verdade das cinco naves):
  - a chama tem 8–20 px, só atrás do bocal, e nada dela sobra no casco;
  - todo pixel do casco cai em exatamente um pedaço;
  - Estilhaços dá de 7 a 14 pedaços de 12 px ou mais, e a Ruptura de 3 a 6 partes grandes;
  - todo pedaço grande tem corte, e a frente de queima chega a todo o casco no tempo;
  - as rampas sobem do escuro ao branco;
  - em 40 golpes por nave, a mordida tem sempre 24 px, na borda e na faixa, com aro, e as partes somam a mordida.
- **`scripts/_morte/_testar-morte.mjs`** (no jogo, com `npm run dev`), para cada nave na F1 e no vácuo:
  - a lasca no estilo certo, sem `over`, com a cicatriz andando com a nave, e tudo some em 2 s;
  - depois a morte: a câmera lenta entra, o mundo continua, o GAME OVER vem na janela certa, o tempo volta a 1, as
    telas somem e não há erro na página.
- **Os filmes:**
  - `_filmar-morte.mjs <out.webm> <cena> [estilos]`: um painel por estilo, com a mesma semente (o painel `antes`
    repete a morte antiga);
  - `_filmar-golpe.mjs <out.webm> [naves]`: cada nave com dois golpes e a morte dela, mais o close dos golpes em GIF.
  - **O relógio a passos:**
    - `game.loop.sleep()`, e depois `game.step(t, 1000/60)` 60 vezes por segundo, com uma foto a cada 2 passos
      (30 qps);
    - `Date.now` falso, preso ao relógio dos passos;
    - `Math.random` com semente (o mesmo mulberry32 da `sorte`) e o registry `sementeMorte`;
    - o mundo limpo: sem roteiro, inimigos, rochas nem letreiro;
    - a morte entra pelo caminho real (`lives = 1` e `damageShip()`).
  - ⚠️ Não edite `src/` nem `.html` durante a filmagem: o Vite recarrega e a filmagem morre.
- **Para olhar de perto:**
  - `_grade.mjs` (os quadros de um filme guardado com `--manter`, numa grade com zoom);
  - `_grade-gif.mjs` (os quadros de um GIF numa grade);
  - `_ver-pedacos.mjs` (os pedaços de cada nave ampliados, o corte em branco e a chama em vermelho);
  - `_ver-chama.mjs` (a máscara da chama em ASCII);
  - `_paleta.mjs` (as cores principais de uma imagem, para amostrar uma rampa);
  - `_tira.mjs` (os quadros de uma animação lado a lado);
  - `_contato.mjs <out.png> <pngs...>` (várias imagens empilhadas a 8×).

## 13. Para uma morte nova (um inimigo, um chefão, uma peça)

1. **A arte:** o sprite precisa ter o quadro legível (`lerQuadro`). Se ele tem pixels que não são casco (uma chama, um
   núcleo de energia), liste as cores exatas e a região, como em `ehChama`, e passe isso como parâmetro.
2. **O estilo pela matéria e pela forma:**
   - casco rígido e compacto → Estilhaços;
   - comprido, com eixo (uma nave, uma serpente) → Ruptura, com as sementes no eixo;
   - orgânico ou de energia → Desintegração, com a rampa da luz dele.
3. **A rampa:** amostre a explosão que vai junto (`_paleta.mjs`), ou a luz da criatura se ela não queima. Em degraus,
   do escuro ao branco.
4. **Os números** vão num `numeros*.ts`, com o porquê de cada um no comentário. O clímax liga a câmera lenta só nas
   mortes que merecem (o jogador, um chefão).
5. **O teste em Node, no PNG de verdade:** os pixels se conservam, os pedaços têm o tamanho e a quantidade pedidos e o
   corte existe.
6. **Filme no jogo, a passos e com a mesma semente em todos os painéis.** Confira ampliado na grade, monte a folha e
   ele olha. Ajuste o que esconde o efeito (estouro grande, clarão cheio, escuro sobre escuro) antes de mexer no
   efeito.
7. **Um dano que se repete** (vidas, escudo, pedaços de chefão) segue a regra do §9: uma medida fixa por golpe, que
   some antes do próximo, e nunca uma fração de um total que pode mudar.

## 13½. A assinatura da nave do jogador (27/10)

As mortes dos inimigos saíram das naves, e ele viu: *"a explosão é idêntica"* à de um kamikaze. **Uma morte do jogador
precisa de algo que nenhum inimigo tem.** Cada nave mantém a sua morte (escolhida em 26/10), e por cima entram três
camadas (`MORTE.assinatura`, cada uma liga e desliga sozinha):
- **a sobrecarga antes**, num relógio próprio, para nenhum tempo da morte mudar: tremor crescente, pixels quentes
  piscando, faíscas, o fogo engasgando e um arco;
- **o anel de choque** no momento grande, na rampa da nave;
- **a cadeia**: pedaços estourando pequenos enquanto voam.

Ao inventar uma morte nova de inimigo, não reaproveite estas três camadas: elas são o que diz "foi você".

## 14. Os inimigos (26–27/10)

A técnica foi levada aos inimigos: `src/systems/morte/Destrocos.ts` e `numerosDestrocos.ts`, spec
`docs/superpowers/specs/2026-10-26-destrocos-inimigos-design.md`, folha `folhas/2026-10-26/inimigos/inimigos.html`.
Em 27/10 ele escolheu: *"Vou com a sua recomendação: A1 e A3 misto, B1, C1, D1"*.
- A1 nos comuns pequenos e A3 na canhoneira e no cargueiro (`PADRAO_DO_TIPO`).
- B1, C1 e D1 nas outras classes.
- D1 na Capitânia e na Serpente.
- A Torre, o Guardião e o Predador ficam com as mortes aprovadas e só levam as mordidas (`CHEFOES`).

O que vale para a técnica:

- **Um motor por cena, não um efeito por morte.** Um drone morre dezenas de vezes por fase, e uma carta de reação em
  cadeia mata uma fila no mesmo quadro. São três telas de pixel compartilhadas, e corpos, partículas (com a rampa de
  cada uma) e fumos em listas planas. Ele desenha no `PRE_RENDER` e só manda as telas quando há o que desenhar.
- **A separação manda na duração.** Comum, elite, mini e chefão: quem morre muito morre rápido. O material manda nas
  cores:
  - **metal:** o fogo;
  - **luz:** a rampa MEDUSA e a descarga;
  - **carne:** a rampa CARNE, gotas e nada de fogo nem branco;
  - **biomec:** a carne com uma bola de fogo pequena.
- **O corte no tamanho em que o jogo desenha** (`reduzir`: escala por vizinho mais próximo, espelho e a tinta de
  repouso, `getData('tint')` e não a do piscar do dano). Os inimigos aparecem de 0,28 a 1,1×, e os pedaços têm que
  sair em pixel de jogo.
- **A medida do dano do inimigo é a barra de vida** (limiares por classe). A vida dele é fixa, ao contrário das vidas
  do jogador (§9). A mordida mira o lado do tiro (`lasca` com `perto`).
- **O buraco de verdade** (`furar`):
  - pintar o buraco de escuro por cima lê como mancha numa pata cinza;
  - o sprite passa a mostrar uma cópia do quadro atual com os pixels mordidos transparentes (uma `CanvasTexture` por
    quadro, feita quando ele aparece);
  - a animação devolve o original quando avança, e o motor põe a cópia de volta antes do desenho;
  - um golpe novo é furado na cópia de cada quadro quando ele aparece de novo (ver abaixo, "a cicatriz é uma história");
  - por cima fica só o aro: em brasa piscando no metal, vermelho na carne, aceso na luz.
- **Armadilha:** os elites que se vestem por estado comparam `texture.key` (`vestir`) e trocam de volta a cada
  `update`. Funciona, porque a cópia volta no `PRE_RENDER`. Mas nenhuma lógica pode decidir coisas pela chave da
  textura de um inimigo mordido.
- **O chefão** leva dano por vários caminhos, então a vida dele é vigiada a cada quadro (`vigiar`, com o
  `StageBoss.destrocos`). O golfinho também. A cadeia de explosões da morte vira mordidas com estouro, e a ruptura final
  ganha a folha grande atrás dos pedaços.
- **Onde sai o pedaço grande de um chefão** (`mira`, em rodízio): o pedaço não sai de onde o desenho tem mais detalhe.
  - **O Guardião (27/10):** do lado da nave, o pedaço saía da cara, e ele disse: *"a cabeça tem muito detalhe, o que
    podem sair são os tubos de cima, pedaços de outras partes"*. Agora sai dos tubos de cima, dos tubos do alto à
    direita e dos tentáculos de baixo.
  - **A Torre:** sai da cabeça e do ombro, que as duas formas dela têm.
- **As marcas dos golpes (27/10, ideia dele).** Todo golpe que não mata tira pixels do corpo (`marcar`,
  `DESTROCOS.marca`): o tiro tira o seu dano, de 1 a 3 (a lança cava mais); a explosão e o míssil tiram 3; a bomba
  tira 4. Os pixels voam na própria cor, e o furo fica com um aro que carboniza. Os pedaços grandes ficaram para perto
  da morte (a aranha perde as patas no fim).
- **A marca come a BORDA, na linha do golpe** (27/10, 2ª rodada, ele: *"pense nos inimigos … como um asset, cada
  tiro tira 1 px da borda do asset, para começar a deformá-lo"*).
  - **O erro da 1ª versão:** ela tirava o pixel do corpo mais perto de um ponto 16 px atrás de onde a bala tocou a
    hitbox. A hitbox de um chefão fica DENTRO da arte. No Guardião, todos os tiros cavaram a mesma coluna no meio da
    casca, uma mancha. Na Torre, o pixel mais perto era a parte de baixo do cano, escuro contra o céu escuro, e
    ninguém via nada.
  - **A regra:** o golpe come o primeiro pixel vivo na faixa dele (a linha, para um tiro de lado; a coluna, de cima
    ou de baixo), a partir do lado de onde veio.
  - **O sulco:** uma série de tiros no mesmo lugar cava um V estreito. Uma faixa só come o vizinho quando está
    `sulco` (3) px mais funda que ele. Os pixels de uma explosão se espalham numa mordida redonda pequena. Furar uma
    chapa de 10 px pede uns 30 tiros no mesmo lugar, e um destroço maciço de 40 px uns 500: o ritmo da fase não deixa.
  - **A dureza:** um corpo duro perde um pixel a cada `dureza` px de golpe (a sobra vai acumulando). Quando o golpe
    não chega a tirar um pixel, sai só a fagulha.
  - **A fagulha acende no pixel comido** (`marcar` devolve onde), e não onde a bala tocou a hitbox.
- **A cicatriz é uma história de golpes, refeita em cada quadro da animação** (27/10).
  - **O problema:** o Guardião balança até 3 px dentro do próprio quadro, e os tubos dele se mexem. Um furo fixo no
    pixel do quadro escorregava para fora do corpo.
  - **O que o motor guarda:** os golpes (`Golpe`), cada um com a faixa e a hora; a mordida guarda ainda a sorte e o
    ruído. Os lugares ficam no quadro de referência, o primeiro que apareceu.
  - **Cada quadro joga os golpes na própria arte** (`Desgaste`), deslocado do quadro de referência pelo `registro`.
    O `registro` compara os perfis de pixels opacos por coluna e por linha.
  - **O resultado:** a marca fica na borda em qualquer pose, e a mordida volta a crescer da borda mais perto do
    mesmo ponto.
  - **A preguiça:** um quadro só recebe os golpes quando aparece (`emDia`, chamado do `furar`). As cópias tocadas
    vão para a placa de vídeo uma vez por desenho (`sujas`).
    - **Antes:** furar todas as cópias a cada tiro custava 2 ms, com picos de 20 ms.
    - **Agora:** a marca custa 0,16 ms em média.
- **O que o corte deixa pendurado cai** (`soltos`), na marca e na mordida (ele: *"o corte ficou com pixels
  flutuantes"*).
  - **O que cai:** partes que perderam a ligação (8 vizinhos) com o corpo, até `ilha` (20%) do corpo.
  - **O que não cai:** a arte que toca a beira do quadro continua alguma coisa fora dele, como os tubos do Guardião
    até o teto. Ela segura.
  - **O atalho:** o pixel único de uma marca só procura o que se soltou quando os vizinhos dele não se ligam em volta
    dele (`anelUnido`).
- **A zona** (a Serpente). As marcas só caem dentro do círculo da cabeça viva e só numa borda de verdade, um pixel
  com vazio antes dele na faixa. Sem a segunda condição, o círculo da zona virou borda falsa e as marcas desenharam o
  arco dele atravessando o pescoço.
- **Quem não ganha buraco:** o Predador anda, golpeia e se pendura no teto, e o golfinho dá cambalhota. Mudam tanto de
  pose que até a borda de cada quadro é outra parte do corpo. Neles o golpe arranca sem furar (`furo: false`): o pixel
  e o pedaço voam, e o corpo fica inteiro. Confira as poses (`scripts/_inimigos/_poses.mjs`) e o balanço dentro do
  quadro (`scripts/_inimigos/_registro.mjs`) antes de ligar o buraco num corpo novo.
- **Armadilha das sondas:** uma sonda que "atira" com um ponto de fora do corpo esconde tudo isso. A de 27/10 passava
  com a mancha no jogo. As marcas se conferem com a nave e as balas do próprio jogo (`_sonda-tiro-real.mjs`, que
  também desenha o mapa do que foi comido) e com os filmes, que atiram de verdade desde 27/10.
- **Armadilha da Serpente (antiga, achada pelas marcas):**
  - **O defeito:** o círculo da cabeça (`setCircle(15)`, 30 px de diâmetro) estava num `flash` de 16×16 px sem
    deslocamento. Ele nascia no canto do quadro e, na escala 2,2, ficava uns 15 px abaixo e à direita da cabeça, em
    cima do pescoço e do toco da cabeça morta.
  - **A correção:** o círculo está centrado na cabeça, com o mesmo raio.
- **No ar, os pedaços caem já** (`cairJa`, ele: *"estilhaços já quebram e caem direto"*).
  - **Na F1:** o estouro só espalha os pedaços para os lados, e nenhum é jogado para cima. A fagulha e a brasa
    continuam subindo, porque são leves.
  - **No vácuo:** nada puxa, e os pedaços seguem à deriva.
- **A arte que vira outra leva as cicatrizes junto** (`esquecer`, quando a `forma` muda).
  - A Serpente perde a cabeça e veste a arte com o coto. As mordidas dela miram a CABEÇA VIVA (`mira`), então o
    pedaço some junto com a cabeça morta.
  - O Guardião vira o Predador no mesmo sprite, e os buracos da casca não podem aparecer no bicho novo.
  - A vida vigiada NÃO volta a 1 numa forma nova: voltar faria os limiares já cruzados morderem de novo.
- **Chefão desenhado acima das telas** (a Serpente está na profundidade 30): o motor sobe as três telas para logo
  acima dele (`acima`). Senão o aro e os pedaços ficam escondidos atrás dela.
- **Armadilha:** o `furar` guardava "este quadro não tem buraco" quando o quadro aparecia num tamanho diferente (o
  aperto da fusão da Serpente é uma escala animada), e o quadro nunca mais furava. Agora o tamanho é conferido antes,
  e o quadro só é guardado como "sem buraco" quando nenhum pixel dele foi mordido.

### 14.1 As peças do cinturão (27/10, etapa 2)

Ele: *"pensa no asset como um asset destrutível, cada pixel é um pedacinho dele que pode tomar dano e se desfazer"*.
As escolhas dele: o cinturão da F2 e os destroços de nave; a resistência pelo material; o asteroide com a explosão do
PixelLab e uma quebra de rocha.

- **A tabela `PECAS`** (`numerosDestrocos.ts`) diz a classe, o material e a `dureza` de cada peça.
  - O asteroide e o asteroide minerável são de rocha, dureza 1, e quebram como rocha.
  - O destroço é metal na F2 e `biomec` na F4 (a frota engolida, aço tomado de tecido), com dureza 2. Ele continua
    indestrutível e só perde pixel.
  - A mina e a mina sensora são de metal.
- **O tiro marca a peça** como marca um inimigo (`GameScene.marcarPeca`, chamado do `bulletHitHazard`). A fagulha acende
  no pixel comido. O destroço, que antes só ricocheteava, agora fica marcado.
- **O material ROCHA não tem fogo:**
  - a rampa `RAMPA_ROCHA` foi tirada da própria arte dos asteroides;
  - a poeira tem o tom de pó azul-cinza da pedra;
  - a face nova fica um pouco mais clara (`clarear`), em vez de carbonizar;
  - o cascalho guarda a cor da pedra (a brasa da carne e do metal escurece para o vermelho);
  - a marca solta uma poeirinha, sem faísca.
- **A quebra de rocha** (`estilo: 'rocha'`, `DESTROCOS.rocha`). É diferente do A1 dos inimigos:
  - sem bola de fogo própria (a explosão do PixelLab continua por cima, no `killHazard`), sem corte em brasa e sem
    fumaça;
  - blocos angulosos (o corte quase não entorta), que derivam e giram devagar no vácuo;
  - a face nova pisca clara um instante e fica mais clara;
  - cascalho saindo dos cortes, e um anel de poeira que fica no ar e se desfaz.
- **As três quebras, para ele escolher no filme `rocha.webm`:**
  - **R1, a fratura:** de 4 a 7 blocos;
  - **R2, o esfarelar:** muitos pedaços pequenos numa nuvem;
  - **R3, partir em dois ou três.**
  
  A quebra sai pelo tamanho (a escolha dele, abaixo). O registry `destrocosVariantes.rocha` força uma (dev), e
  `'hoje'` volta à explosão sozinha.
- **A sonda:** `scripts/_inimigos/_sonda-cinturao.mjs`, com tiro de verdade. O asteroide leva as marcas e quebra; o
  destroço continua lá e perde 1 px a cada 2 tiros; o da F4 é marcado como `biomec`.
- **Armadilha das sondas:** trocar de fase na mesma página (parar e começar no mesmo tique) deixa a fase nova
  carregando para sempre. Use uma página por fase, ou espere a cena parar antes de começar a outra, como o filme faz.
- **A escolha dele (27/10):** *"Vou com R2 para as rochas grandes e R3 para as pequenas. Mas faça com que os pedaços
  desapareçam mais rápido"*.
  - A rocha de `pxGrande` (850) px opacos ou mais, como é desenhada, esfarela (R2). A menor se parte (R3). Um asteroide
    é grande a partir de ~1,3×, e a rocha minerável é sempre grande.
  - Os pedaços, o cascalho e a poeira duram cerca de metade do que duravam.

### 14.2 A bala passa pela brecha (27/10, etapa 3)

Ele: *"eu acharia interessante que o buraco mudasse o jogo e visual"*.

- **`Destrocos.atravessa`**, chamado pelo segundo callback do overlap de bala (`GameScene.pelaBrecha`), nas peças do
  cinturão e nos inimigos.
  - **A regra:** na faixa da bala, a partir do lado de onde ela veio, procura o primeiro pixel vivo. Se antes dele
    algum pixel foi tirado e a bala ainda não chegou nele, ela segue voando e come o pixel quando chega lá. Sem pixel
    vivo na faixa, é um túnel, e ela atravessa.
  - **O que não muda:** a faixa sem nada tirado acerta onde sempre acertou, inclusive na folga da hitbox antes da
    arte. O balanço fica igual, e a nave continua batendo na forma inteira.
- **Armadilha (a 1ª versão):** ela só olhava a faixa até a bala. A hitbox do destroço começa antes da arte, então a bala
  era pega nessa folga e nunca chegava ao túnel. Agora ela olha a faixa à frente até o primeiro pixel vivo.
- **A sonda:** `scripts/_inimigos/_sonda-brecha.mjs`.
  - Abre um túnel de 7 linhas num destroço, pelo próprio caminho das marcas. A arma base atira duas balas, a 2 px
    acima e abaixo da linha da nave.
  - Na linha do túnel, a bala sai do outro lado. Numa linha inteira, ela para no casco e marca, 1 px a cada 2 tiros.
- **Os chefões ficam de fora:** a hitbox deles fica dentro da arte (o Guardião) ou é outra peça (a cabeça da
  Serpente), e a brecha quase nunca está no caminho.

### 14.3 A Serpente sem marcas vermelhas fixas (27/10)

Ele, na fusão: *"os pedaços grandes que saem dela na hora da explosão deixam marcas cor avermelhadas fixadas"*.

- **A causa:** os estouros da quebra (B1/C1/D1) deixam uma marca cujo raio cresce com o corpo. Na fusão, ela passava
  de 20 px. Na carne-metal ela era pintada de vermelho de carne e gravada nos pedaços quando o corpo se partia. A borda
  do corte também ficava vermelho-molhado para sempre.
- **A correção** (`Corpo.limpa`), só para chefão de carne ou carne-metal: na morte, é a Serpente (a única dessas com
  ruptura); nas mordidas, a Serpente, o Guardião e o Predador:
  - a marca fica pequena (até 5 px);
  - ela respinga vermelho um instante e depois só escurece a cor do próprio corpo;
  - nada vermelho é gravado nos pedaços;
  - a borda do corte, depois de 0,25 s, vira a cor do corpo escurecida. Com 0,7 s, a câmera lenta da morte esticava o
    rosa por 1,5 s de filme;
  - as mordidas de chefão de carne ou carne-metal (a Serpente e o Guardião) também perderam o aro rosa no corpo vivo:
    a borda delas escurece na cor do bicho;
  - o pedaço que cada mordida arranca (em 15% e 6%) leva a mesma regra: a borda rosa dura 0,25 s e escurece. Na
    primeira correção só a morte usava o `limpa`, e os pedaços das mordidas da fusão seguiam voando com o contorno
    vermelho. Eram eles os *"pedaços grandes que saem dela"* (`morder` liga o `limpa` nos pedaços).
  
  A pupa, a mosca e os elites de carne seguem como foram aprovados.

## 15. O mapa do motor (27/10)

### O motor (`Destrocos.ts`, um por cena)

| Função | O que faz |
| --- | --- |
| `morrer(s, o)` | A morte nos próprios pixels, no `estilo` da variação (`lascas`, `meio`, `carcaca`, `ruptura`, `estilhacos`, `desintegra`, `rocha`). O sprite sai de cena, e os pedaços ficam com o motor. |
| `marcar(s, px, de, classe, material, furo, { zona, rumo, dureza })` | A marca de um golpe que não mata: come `px` pixels da BORDA, na faixa de onde o golpe veio (`rumo`). Devolve o ponto comido, onde a cena acende a fagulha (ou `null`). |
| `ferir(s, antes, hp, hpMax, classe, material, de, perto)` | Os pedaços grandes nos limiares da vida (`DESTROCOS.lasca`). Usado pelos inimigos. |
| `vigiar(s, fracao, classe, material, de, { mira, furo })` | O mesmo para quem leva dano por muitos caminhos (o chefão, o golfinho): a cena passa a vida a cada quadro. |
| `morder(s, classe, material, de, perto, furo)` | Uma mordida agora: o pedaço voa e o corpo fica com o buraco (ou sem ele, com `furo: false`). |
| `esquecer(s)` | A arte virou outra (a Serpente sem a cabeça, o Guardião virando o Predador): as cicatrizes da velha saem. |
| `acima(depth)` | Sobe as telas para logo acima de um chefão desenhado alto (a Serpente, na profundidade 30). |
| `atravessa(s, x, y, rumo)` | A bala passa pela brecha? (§14.2) |
| `furosDe(s)`, `mordidas(s)` | Quantos pixels foram comidos e quantas mordidas houve (as sondas). |
| `update(dt)`, `destroy()` | O relógio e o fim da cena. |

O que ele guarda:
- **`Corpo`:** um pedaço que voa ou cai (o bitmap, o mapa do corte, as manchas, a física, o `limpa`);
- **`Cicatriz`:** a história de um sprite vivo: os golpes (`Golpe`, uma `marca` ou uma `mordida`, cada um com a faixa
  ou a sorte, no quadro de referência), a dureza que sobrou e as cópias furadas de cada quadro;
- **`Desgaste`:** um quadro da animação com os golpes já aplicados (o que foi comido, o aro, o deslocamento do
  `registro`). É feito quando o quadro aparece (`emDia`).

### As tabelas (`numerosDestrocos.ts`)

- **`SEPARACAO`:** o tipo de inimigo → a classe e o material.
- **`CHEFOES`:** o chefão → a classe, o material, se a morte vira a ruptura nos próprios pixels (`morte`) e se as
  mordidas furam (`furo`).
- **`PECAS`:** a peça do cenário → a classe, o material, a `dureza`, se quebra como rocha, e o material na F4.
- **`VARIANTES`, `PADRAO`, `PADRAO_DO_TIPO`, `ESTILO_DA_VARIANTE`:** que morte cada classe e cada tipo usa.
- **`DESTROCOS`:** os números:
  - o mundo (a gravidade, o arrasto);
  - a lasca (os limiares, os tamanhos);
  - a marca (`px` por fonte de dano, `sulco`, `alcance`, `ilha`, `registro`);
  - as variações e a rocha (`pxGrande`, R1–R3).
- **O registry `destrocosVariantes`** troca a variação de uma classe ou da rocha (dev e filmes). `'hoje'` volta à morte
  de antes.

### Os ganchos na cena (`GameScene`)

- **Os inimigos:**
  - `bulletHitEnemy` → `deOndeVeio` (o ponto e o rumo da bala) → `ferirInimigo` (`marcar` e `ferir`);
  - a morte → `matarInimigo` (`morrer`, com a variação de `varianteDe`).
- **Os chefões:**
  - `bulletHitBoss` → `marcarChefe`, e a fagulha vai no ponto comido;
  - a vida é vigiada em `atualizarDestrocos` pelo `StageBoss.destrocos` (`quem`, `vida`, `forma`, `mira`, `zona`);
  - `killBoss`: a ruptura, ou a morte aprovada.
- **O golfinho:** `bulletHitGolfinho` → `marcarGolfinho`.
- **As bombas:** `ferirChefe(dano, de)` marca o chefão no ponto da explosão.
- **As peças:**
  - `bulletHitHazard` → `marcarPeca` (a dureza e o material da F4);
  - `killHazard` → `morrer` com o estilo `rocha`, e a explosão do PixelLab continua por cima.
- **A brecha:** `pelaBrecha` é o segundo callback dos overlaps de bala contra inimigos e contra peças.

## 16. A receita: ligar a destruição numa coisa nova

1. **Diga quem é.** Escolha a tabela:
   - um inimigo vai em `SEPARACAO`;
   - um chefão vai em `CHEFOES`, e o `StageBoss` dele expõe `destrocos`;
   - uma peça do cenário vai em `PECAS`.
   O material decide as cores e o fogo (metal, luz, carne, biomec, rocha). A classe decide quanto a morte pode durar.
2. **Veja se o corpo aguenta buraco.** Rode:
   - `scripts/_inimigos/_poses.mjs`, para ver as poses;
   - `scripts/_inimigos/_registro.mjs`, para ver quanto a arte balança dentro do quadro.
   Se a borda de cada quadro é outra parte do corpo (cambalhota, golpe, pendurar), use `furo: false`. O pixel e o pedaço
   voam, e o corpo fica inteiro.
3. **Diga onde.** Para os pedaços grandes, a `mira`: longe do detalhe que identifica o bicho (a cara do Guardião). Para
   as marcas, a `zona`: quando a hitbox pega a bala longe da arte, como na cabeça da Serpente.
4. **A dureza** de uma peça: quanto golpe por pixel. A rocha é 1 e o destroço de nave é 2.
5. **Confira com tiro de verdade**, nunca com um golpe de mentira vindo de fora do corpo (foi o que escondeu a mancha
   do Guardião). Rode:
   - `_sonda-tiro-real.mjs` (a borda, o custo, os pixels soltos e o mapa do que foi comido);
   - `_sonda-chefes.mjs`, `_sonda-cinturao.mjs` e `_sonda-brecha.mjs`, conforme o caso.
6. **Filme com a nave atirando** (`_filmar-destrocos.mjs`, com a coluna `hoje` ao lado) e confira os quadros
   ampliados (`_quadros-filme.mjs`, `_grade.mjs`) antes de montar a folha.
7. **Custo:** uma marca custa ~0,16 ms. Uma mordida grande custa até ~7 ms na primeira vez que cada quadro aparece. Meça
   com `_custo-destrocos.mjs` e `_tempo-mordida.mjs` se o corpo for grande ou tiver muitos quadros.
