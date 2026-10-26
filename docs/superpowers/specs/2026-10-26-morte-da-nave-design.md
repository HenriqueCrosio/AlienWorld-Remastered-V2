# A morte da nave — design

> 26/10/2026. Ele: *"Quero efeitos de destroços quando elas explodem, pode ser um efeito procedural ou manual. Quero que
> ela se desintegre, hoje ela explode com uma explosão criada no pixellab. Ela já tem um efeito de fumaça quando está
> com a última vida, mas quero algo mais dramático quando morre."*
>
> Folha: `folhas/2026-10-26/morte/morte.html` (os filmes em `filme/`). A técnica inteira, para reusar em outra
> morte: `docs/DESTROCOS.md`.

> **O que valeu (26/10, à tarde).** Ele gostou das três versões: *"quero fazer com que cada tipo de nave tenha uma. A
> x-wing vai ter a ruptura. A terminus a estilhaço e a charybdis a desintegração. Acho que o tempo ao game over nao
> ficou longo, ficou cinemática a morte. E sobre as vidas, acho que podemos adicionar esse efeito de perda de casco,
> para ser um aviso visual também. Só precisamos tomar cuidado, pois vai variar quantas vidas o jogador tem ou acumulou
> durante a partida."* Então: cada nave com a sua (§3), o tempo fica, e as vidas do meio lascam o casco (§8).

## 1. Onde fica

- **A morte inteira só na última vida** (o `gameOver` da `GameScene`). Uma vida perdida no meio da fase solta uma
  lasca do casco (§8), e a nave segue voando.
- O último golpe não estoura mais no `damageShip`: o estouro é a própria morte.
- **O mundo continua andando:** enquanto a morte corre, `over` já é verdade (nada de comando, roteiro, tiro, dano ou
  pontos). Mas o `update` chama `atualizarMorte`, que segue rolando o cenário, os bichos e o chefão, na escala da câmera
  lenta. Antes o `update` parava inteiro, e com uma morte de 2 s o fundo congelado leria como jogo travado.
- **A câmera lenta:** a curva do esfíncter, mais curta (`MORTE.lenta`: 110 ms normal, desce em 140 ms, segura 700 ms a
  0,35, volta em 520 ms). Ela entra no momento grande de cada versão (`aoClimax`). A `camaraLenta` da cena agora recebe
  a curva.
- **O GAME OVER** vem quando a morte inteira acabou (relógio da cena, que anda na escala da câmera lenta). Dá 3,3 a
  3,8 s depois do golpe; antes eram 0,9 s. Quem sai da cena devolve o tempo ao normal antes.

## 2. Como é feita (`src/systems/morte/`)

- **Os pixels da própria nave:** o quadro que está na tela é lido de volta da textura. A chama do motor sai do casco
  (as cores exatas das chamas desenhadas à mão, nas 10 primeiras colunas) e vira fogo na hora.
- **O corte** (`pedacos.ts`, puro, testado em Node):
  - cada pixel vai para a semente mais próxima, com a distância entortada por um ruído, então o corte nunca é reto;
  - as partes separadas por um vão viram pedaços próprios;
  - o pixel na linha do corte é o que fica em brasa.
- **O desenho:** três telas de pixel em 384×216, a fumaça, os destroços e o brilho (aditivo). Os pedaços giram por
  amostragem do vizinho mais próximo. Nada de traço vetorial nem degradê liso.
- **As cores:**
  - o fogo esfria pela paleta da explosão do PixelLab (amostrada de `explosion-sheet.png`), em degraus;
  - o casco carboniza em três degraus;
  - os pedaços somem pixel a pixel (Bayer), não por transparência;
  - a fumaça é de discos de pixel com três opacidades, nos tons da fumaça da nave avariada.
- **A Charybdis** não pega fogo. A rampa dela é a bioluminescência (amostrada das manchas ciano), e no lugar da bola de
  fogo ela dá a descarga elétrica da água-viva (`Fx.choque`).
- **A F1:** gravidade e ar; nada se desenha abaixo do chão. **O vácuo:** os destroços derivam e ficam um pouco para trás.
- **Relógio:** tudo é função do `t` acumulado no `update` (nada de tween), então o relógio em passos dos filmes vê o que
  o jogador vê.

## 3. As três versões (`numerosMorte.ts`)

- **A — Estilhaços:**
  - o casco fica branco por 0,05 s e estoura em 7 pedaços grandes;
  - as rachaduras em brasa, os pedaços grandes com rastro de fumaça;
  - uma bola de fogo pequena (0,5) atrás deles.
- **B — Desintegração:**
  - um estalo no motor;
  - uma frente de queima fina atravessa o casco do motor ao nariz em 1 s;
  - cada pixel se solta como brasa (ou cinza, 22%) e fica para trás.
- **C — Ruptura:**
  - três estalos ao longo do casco (cauda, meio, nariz), com a nave capotando cada vez mais rápido;
  - o motor tossindo e o casco queimado em volta dos estalos;
  - aos 0,72 s, ela se parte em 3 ou 4 partes grandes pelo eixo e uma asa, com lascas voando;
  - a parte do motor continua cuspindo faísca.

**Cada nave tem a sua** (`ESTILO_DA_NAVE` / `estiloDaNave` em `numerosMorte.ts`, decisão dele):

- a X-Aelo se rompe (C);
- a Terminus se estilhaça (A);
- a Charybdis se desintegra (B).

Vale para as duas pinturas de cada modelo. O registry `estiloMorte` passa por cima, para o dev e os filmes.

## 4. Testes e ferramentas

- `scripts/test-morte.mjs`: o corte nas cinco naves de verdade, a chama separada e as rampas.
- `scripts/_morte/_testar-morte.mjs`: a morte no jogo (três versões, a Charybdis na F3, a F1 e a F4):
  - a nave some e as telas aparecem;
  - a câmera lenta entra;
  - o GAME OVER vem na janela certa;
  - o tempo volta a 1 e as telas somem;
  - não há erro na página.
- `scripts/_morte/_filmar-morte.mjs`: o filme da folha. O painel `antes` repete a morte antiga.
- `scripts/_morte/_filmar-golpe.mjs`: cada nave com dois golpes e a morte dela (§8).
- Para olhar de perto: `_grade.mjs` (com zoom), `_grade-gif.mjs`, `_ver-pedacos.mjs`, `_ver-chama.mjs`, `_paleta.mjs`,
  `_contato.mjs` e `_tira.mjs`.

## 5. Junto: a X-Aelo só com o fogo do motor

Ele: *"na nave x-aelo uma das animações faz com que a ponta das asas pisque, quero que tire essa piscada (mesmo que
seja para gerar nova animação) e deixe apenas o fogo do motor"*.

- Os quadros 2, 3 e 5 acendiam as pontas das asas: eram as luzes falsas de "jato" de antes de 04/10.
- `_jato-sem-balanco.mjs` agora usa o corpo do quadro 0 nos nove quadros, e só a chama B anda. Depois,
  `_pintar-jato.mjs` faz o osso.
- O teste é `scripts/_naves/_testar-so-chama.mjs`: nenhum pixel do casco muda entre os quadros, na X-Aelo, no osso, nos
  azuis e na Terminus.

## 6. Junto: os nomes

X-AELO (o jato; Aelo, a harpia grega), TERMINUS (a "a") e CHARYBDIS (a manta). Estão em `NOME_MODELO`, `NOME_ALIEN`
e `nomeDaNave` (`src/ships.ts`), e aparecem no hangar e no painel da Doca.

## 7. Decidido (26/10, à tarde)

- As três versões ficam, uma por nave (§3).
- Os 3,3 a 3,8 s até o GAME OVER ficam (*"ficou cinemática a morte"*).
- As vidas do meio lascam o casco (§8).
- Em aberto: o tamanho da mordida e quanto a cicatriz dura, que ele vai sentir jogando.

## 8. As lascas do casco (as vidas do meio)

**A medida é o golpe, não as vidas** (o cuidado dele: o número de vidas varia com as cartas e o 1-UP).

- **A mordida:** cada vida perdida que não é a última arranca do casco uma mordida de **exatamente 24 px**
  (`MORTE.golpe.pixels`, uns 5% de uma nave de 40×20).
  - O centro é um pixel da borda, entre 22% e 72% do comprimento: longe da chama e da ponta do nariz.
  - Ela cresce a partir dele, primeiro o casco mais perto por uma distância entortada, então é rasgada e não um disco.
  - Ela é sempre uma peça só.
  - Um raio fixo mordia de 6 a 39 px conforme o ponto (ponta de asa ou flanco), e isso não é medida definida
    (`lasca` em `pedacos.ts`).
- **No estilo da morte da nave, pequeno.** É a antecipação dela.
  - **X-Aelo:** um estalo atrás da nave; a peça sai inteira, girando e lascando, e a mordida solta fumaça por 0,6 s.
  - **Terminus:** a mordida fica branca por 0,05 s e estoura em três estilhaços.
  - **Charybdis:** a mordida queima da borda para dentro em 0,22 s, cada pixel uma brasa ciano, com uma descarga pequena.
- **Os estouros são pequenos e ficam atrás da nave.** No 1º filme, o estouro na frente e a descarga a 0,45 cobriam a
  mordida.
- **A cicatriz:** o buraco quase preto. Na Charybdis ele fica no ciano mais escuro dela, com um aro ciano; o escuro
  sobre o verde-escuro dela não lia.
  - O aro fica em brasa por 0,35 s e depois carbonizado.
  - Ela dura a invulnerabilidade (1,4 s, piscando junto com a nave) e some pixel a pixel em 0,3 s.
  - Não fica até o fim da fase porque aí contaria golpes: com 6 vidas, a nave estaria toda mordida ainda com metade das
    vidas.
  - A cicatriz é desenhada no quadro que está na tela, porque as nadadeiras da manta mexem.
  - Ela é desenhada no `PRE_RENDER`: a física move a nave depois do `update` da cena, e desenhada nele a cicatriz
    ficaria um quadro atrás (3 px no flap rápido).
- **O resto:**
  - o aviso de "a próxima é a última" continua sendo a fumaça e o motor tossindo da última vida;
  - a lasca substitui a explosão do PixelLab que o golpe tinha, e o clarão rosa da tela fica;
  - a carta Casco segurando o golpe não lasca, porque não se perdeu vida.
- **O código:** `MorteDaNave` com `golpe: true`.
  - O casco inteiro fica como âncora: ele segue a nave e nunca é desenhado inteiro, porque o sprite continua lá.
  - A `GameScene` guarda as lascas em `golpes` e as atualiza no `update` e durante a morte (`atualizarGolpes`).
  - `opcoesDaMorte` serve à morte e às lascas.
- **Testes:**
  - `test-morte.mjs`: 40 golpes por nave, sempre 24 px, na borda e na faixa, com aro, e as partes somam a mordida;
  - `_testar-morte.mjs`: a lasca no estilo da nave, a nave segue voando, a cicatriz anda com ela, tudo some em 2 s, e
    depois a morte da nave.
- **Filme:** `scripts/_morte/_filmar-golpe.mjs` (`filme/cada-nave.webm` e o close `cada-nave-perto.gif`).
