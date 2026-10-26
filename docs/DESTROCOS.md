# OS DESTROÇOS — a técnica da morte da nave (26/10/2026)

Como um sprite se desfaz nos PRÓPRIOS pixels: ele estilhaça, queima em brasas ou se parte. Tudo é desenhado pixel a
pixel na resolução do jogo, sem uma peça de arte nova. A técnica foi feita para a morte da nave e para a lasca do casco
a cada vida perdida (spec `docs/superpowers/specs/2026-10-26-morte-da-nave-design.md`, folha
`docs/superpowers/folhas/2026-10-26/morte/morte.html`). Ela vale para qualquer coisa que se quebra em cena: um inimigo,
um chefão, uma peça do cenário.

Onde fica:
- o código está em `src/systems/morte/`: `pedacos.ts` é a parte pura, sem Phaser; `MorteDaNave.ts` é o efeito;
  `numerosMorte.ts` guarda os números aprovados;
- as ferramentas estão em `scripts/_morte/`, e o teste puro em `scripts/test-morte.mjs`.

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
