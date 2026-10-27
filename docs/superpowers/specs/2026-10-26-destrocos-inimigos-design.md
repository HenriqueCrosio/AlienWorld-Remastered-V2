# Os destroços dos inimigos — design (em mesa)

> 26/10/2026, à noite. Ele: *"Já faça uma separação dos inimigos, elites, mini boss e boss do jogo para aplicarmos
> efeitos de dano, explosões, derrotas decentes iguais ao das naves, isso acrescenta demais ao jogo e a riqueza
> visual. Acho interessante já fazer isso, contando que a técnica é nova e documentada"*. E depois: *"Você vai
> desenvolver variações com base no que estudar sobre os inimigos, vai trabalhar sozinho, portanto quero que avance com
> as etapas até criar uma folha com exemplos, quando eu voltar eu analiso e decidimos"*.
>
> Folha: `folhas/2026-10-26/inimigos/inimigos.html` (os filmes em `filme/`, a prancha em `prancha.png`). A técnica é a
> da nave, em `docs/DESTROCOS.md`.
>
> **27/10, a escolha dele:** *"Vou com a sua recomendação: A1 e A3 misto, B1, C1, D1"*. Ligada no jogo, e estendida aos
> chefões que tinham ficado de fora (§10). Nada commitado.

## 1. A separação

A classe decide **quanto a morte pode durar**, porque quem morre muito precisa morrer rápido e sem tapar a tela. O
material decide **as cores**. Está em `SEPARACAO`, em `src/systems/morte/numerosDestrocos.ts`; a prancha de estudo é
`scripts/_inimigos/_prancha.mjs`.

| Classe | Quem | Quantos | Material |
|---|---|---|---|
| comum | drone, batedor, canhoneira, kamikaze, cargueiro | dezenas por fase | metal |
| comum | água-viva | algumas (F3) | luz |
| comum | pupa, mosca | os miúdos da larva (F4) | carne |
| elite | drone minerador, sentinela (F2) | alguns | metal |
| elite | lula (F3), larva (F4) | alguns | biomec |
| elite | tubo (F4) | alguns | carne |
| mini | aranha (F3) | um | metal |
| mini | golfinho (F4) | um | biomec (fora desta rodada) |
| chefão | Capitânia (F2) | um | metal (o exemplo desta rodada) |
| chefão | Torre (F1), Serpente (F3), Guardião e Predador (F4) | um | fora desta rodada: as mortes da Torre e do F4 já foram aprovadas |

**Os materiais:**

- **metal:** queima nas cores da explosão do PixelLab.
- **luz:** se apaga na própria cor. A rampa **MEDUSA** saiu da água-viva. No lugar do fogo vem a descarga elétrica.
- **carne:** a rampa **CARNE** saiu do tubo e da larva. Os pedaços têm a borda vermelha molhada e vem um jorro de gotas.
  Não há fogo nem branco.
- **biomec:** o corte e as gotas da carne, com uma bola de fogo pequena.

## 2. As variações (`VARIANTES`, `ESTILO_DA_VARIANTE`)

- **Comuns:**
  - **A1 · lascas** (a recomendação): três a seis pedaços saem de uma bola de fogo menor que a de hoje. Dura 0,5 a
    0,7 s.
  - **A2 · ao meio:** duas metades se separam girando, com o corte aceso e fumaçando.
  - **A3 · carcaça:** o inimigo carboniza e capota por meio segundo, e então estoura.
- **Elites:**
  - **B1 · ruptura** (a recomendação): dois estalos e a quebra em partes grandes. É a morte da X-Aelo, em pequeno.
  - **B2 · estilhaços:** um clarão de 0,05 s, o estouro e um congelamento de 45 ms. A carne não tem clarão: ela rebenta
    com um jorro maior.
- **Mini chefões:** **C1** é a ruptura (a recomendação) e **C2** a carcaça. As duas usam a câmera lenta da morte da nave
  no momento grande.
- **Chefões:** **D1**. Os limiares mordem o casco. Na morte, a cadeia de explosões vira cinco mordidas com estouro, e
  depois vem a ruptura nos próprios pixels, com a explosão grande atrás dos pedaços e a câmera lenta.
- **A luz:** sempre se desmancha (`desintegra`), porque a água-viva não tem casco para partir.
- **hoje:** a morte de antes. Fica na mesa para a comparação, e o registry `destrocosVariantes` volta a ela.

## 3. O dano: as lascas por limiar de vida (`DESTROCOS.lasca`)

Na nave, a medida era o golpe, porque as vidas mudam com as cartas e o 1-UP. **Nos inimigos, a medida é a barra de
vida**, porque a vida de cada tipo é fixa e uma fração dela é honesta.

- **Os limiares por classe (26/10; em 27/10 eles foram para perto da morte, e as marcas dos golpes mostram a luta —
  §11):**
  - comum: 50% (vida até 3), 60 e 30% (até 10), ou 75, 50 e 25%;
  - elite: 75, 50 e 25%;
  - mini: 80, 60, 40 e 20%;
  - chefão: 85, 70, 55, 40, 25 e 12%.
- **A mordida:** uma fração do corpo por classe (10, 8, 5 e 3%). Ela cresce a partir da borda do lado de onde veio o
  tiro (`lasca` com `perto`). Na aranha, ela mira a base, então ela perde as patas.
- **O buraco é real** (`furar`): o sprite mostra uma cópia do próprio quadro com os pixels mordidos transparentes, e o
  fundo aparece. Na 1ª rodada o buraco era pintado de quase preto e lia como mancha, não como pedaço faltando.
  - A animação, o piscar do dano e a tinta continuam, porque é o mesmo sprite.
  - Cada quadro tem a sua cópia, feita na primeira vez que aparece. Uma mordida nova joga as cópias fora.
  - Os elites que trocam a textura por estado (`vestir`) devolvem o original no `update`, e o motor põe a cópia de
    volta antes do desenho.
- **O aro diz o material:**
  - metal: em brasa por 0,4 s, depois carbonizado, com brasas que continuam piscando;
  - carne: a ferida vermelha;
  - luz: a própria cor acesa.
- **A ferida solta** fumaça e faíscas (metal), gotas (carne) e brasas (luz) até ele morrer.
- **Na morte, o corpo já mordido é o que se parte.**
- **O chefão** leva dano por muitos caminhos (tiro, bomba, cartas). A vida dele é vigiada a cada quadro
  (`StageBoss.destrocos` + `vigiar`).

## 4. O motor (`src/systems/morte/Destrocos.ts`)

- **Um por cena**, com as três telas de pixel 384×216 (fumaça, destroços, brilho aditivo) compartilhadas. Corpos,
  brasas, gotas e fumaça vivem em listas planas (até 3200 partículas e 700 fumos). Ele desenha no `PRE_RENDER` e só
  manda as telas quando há algo.
- **Cada inimigo é cortado no tamanho em que o jogo o desenha** (`reduzir`: escala, espelho e a tinta de repouso, a
  `tint` dele). Os pedaços ficam em pixel de jogo, como os da nave.
- **As formas:** `lascas`, `meio`, `carcaca`, `ruptura`, `estilhacos` e `desintegra`. O material pinta cada uma.
  `aoClimax` liga a câmera lenta nos mini chefões e nos chefões.
- **A cena:**
  - `matarInimigo(e, de)` chama `destrocos.morrer`;
  - `ferirInimigo` chama `destrocos.ferir`, e o `de` é o lado do tiro;
  - `atualizarDestrocos` roda no `update` e na morte da nave;
  - o `killBoss` tem a D1 de quem a pede em `CHEFOES` (a Capitânia e a Serpente);
  - o `EnemySystem` guarda `hpMax`;
  - o `StageBoss` ganhou o `destrocos?` opcional (quem é, a vida, a forma, a mira), e o `matarGolfinho` tem a C1.
- **A morte da nave** (`MorteDaNave`) não mudou. Ela só exporta a `Tela` para o motor novo, que ganhou um `depth`
  para subir acima da Serpente.

## 5. O que os filmes ensinaram

- **A bola de fogo da A1 a 0,42 era pequena:** os pedaços escuros somem no céu escuro e a morte não lia de relance.
  Subiu para 0,62.
- **Os estalos e a bola da ruptura de elite** (0,32 e 0,6) faziam a morte nova mais fraca que a de hoje. Subiram para
  0,45 e 0,85. O chefão ganha ×1,3, com a folha grande, atrás dos pedaços.
- **A cicatriz pintada não lia.** Agora o buraco é real, o aro do metal tem brasa piscando e a carne tem a ferida
  vermelha.
- **A fumaça do metal**, no tom da nave avariada, sumia no céu da F2. Ficou um tom mais clara.
- **O clarão branco da B2 na carne** virou uma bolha rosa e saiu (carne não brilha).
- **O custo tinha picos de até 135 ms** (`_custo-destrocos.mjs`): o `visto` relia a cópia furada, e ler uma textura de
  canvas de volta é leitura da GPU. Agora ele lê o quadro ORIGINAL da cópia, e a máscara sabe os buracos. As telas
  também são mandadas vazias uma vez na criação, para a primeira morte da fase não pagar o primeiro envio.
  - Medido só o motor, num Chrome sem placa de vídeo, na onda da F2: 0,5 ms por quadro em média, 1 ms no p95 e
    2,2 ms no máximo.
  - No pior caso (doze drones mortos no mesmo quadro, com três cargueiros feridos): 0,6 ms em média e 2,9 ms no
    máximo. Um quadro tem 16,7 ms.

## 6. Testes e ferramentas

- **`scripts/test-morte.mjs`:** dez inimigos de verdade, conferindo:
  - o tamanho de tela;
  - os pixels conservados;
  - quatro sementes da cauda ao nariz;
  - 30 tiros da esquerda que mordem sempre o terço da esquerda;
  - o espelho e a tinta;
  - as rampas CARNE e MEDUSA.
- **`scripts/_inimigos/_filmar-destrocos.mjs <out.webm> <grupo>`:** cada célula é uma rodada no jogo de verdade, com o
  relógio a passos, a mesma sorte e o caminho real de dano e morte.
  - Os grupos: `jogo` (a onda voando, com tremor), `comuns`, `f1`, `vivos`, `elites`, `mini` e `chefe`.
  - Só no filme: o voo dos inimigos fica congelado (para a morte ser vista), e a mesa de cartas, a intocabilidade e o
    escudo ficam desligados.

## 7. A recomendação

- **Comuns:** A1 nos pequenos e A3 nos grandes (canhoneira e cargueiro). Se for uma só, A1.
- **Elites:** B1.
- **Mini chefões:** C1.
- **Chefões:** D1 na Capitânia, e a Serpente na cor de cada cabeça. Na Torre, no Guardião e no Predador, só as lascas
  por vida.
- **As lascas por vida:** em todas as classes.

## 8. Fora da 1ª rodada

- **A Serpente, o golfinho, a Torre, o Guardião e o Predador:** ficaram de fora em 26/10 e entraram em 27/10 (§10).
- **Os perigos do cenário** (rochas, minas, sensores): seguem de fora.

## 9. As decisões

1. **Comuns:** o misto (27/10). A1 nos pequenos, e A3 na canhoneira e no cargueiro (`PADRAO_DO_TIPO`).
2. **Elites:** B1 (27/10).
3. **Mini chefões:** C1 (27/10), e o golfinho também (§10).
4. **Chefões:** D1 na Capitânia e na Serpente. A Torre, o Guardião e o Predador ficam com as mortes aprovadas e só
   levam as mordidas (27/10, com a recomendação; §10).
5. **A pupa:** fica o respingo pequeno de carne, e a mosca também (27/10: *"A pupa e as moscas estão com ótimo
   efeito"*). A spec da F4 dizia que ela some sem explodir; vale esta.
6. **As mordidas:** viraram as marcas dos golpes, com os pedaços grandes só perto da morte (27/10, ideia dele; §11).
   O tamanho ele sente jogando.
7. **A morte da nave do jogador:** ganhou a assinatura (27/10, §12).

## 10. A extensão aos chefões e ao golfinho (27/10)

A tabela é `CHEFOES`, em `numerosDestrocos.ts`. Cada chefão diz ao motor a sua vida e a sua forma pelo
`StageBoss.destrocos`, e a cena o vigia a cada quadro (`vigiar`).

Todos levam as marcas dos golpes (§11). Os pedaços grandes caem em 15% e 6% da vida:

| Quem | Material | Morte | Os pedaços grandes |
|---|---|---|---|
| Torre (F1) | metal | a aprovada (bloco G) | na cabeça e no ombro, em rodízio de três pontos (`mira`, em `Boss.MIRAS`). Do lado da nave, sem mira, caíam na base de pedra, que vira propulsor na decolagem: o buraco sumia junto |
| Capitânia (F2) | metal | D1 | do lado da nave |
| Serpente (F3) | biomec | D1, na fusão | no crânio da fusão (a vida é a da luta inteira: 15% e 6% caem nela). Nas cabeças, só as marcas, e a arte nova leva as marcas da velha junto (`esquecer`). A `mira` é a cabeça viva |
| Guardião (F4) | biomec | a aprovada | na casca (a vida é a dele: 15% e 6% antes da troca). As folhas da respiração, da morte e do destruído têm a casca no mesmo lugar. Saem na troca para o Predador |
| Predador (F4) | carne | a aprovada | **sem buraco** (`furo: false`): o pixel e o pedaço voam, a carne jorra, e o corpo fica inteiro |
| golfinho (F4) | biomec | C1, com a câmera lenta | **sem buraco**, pela mesma razão |

**Por que sem buraco no Predador e no golfinho:**
- O buraco mora no pixel do quadro.
- O predador anda, golpeia, gira e se pendura no teto, e cada folha tem o corpo num lugar e numa pose. O golfinho dá
  cambalhota dentro do quadro.
- O buraco feito numa pose cairia em outra parte do corpo na pose seguinte.
- A prancha das poses é `scripts/_inimigos/_poses.mjs`.

**A Serpente** é desenhada na profundidade 30, acima das telas do motor. O motor sobe as telas para logo acima do
chefão vivo (`acima`).

**Os filmes** estão em `filme/capitania.webm`, `torre.webm`, `serpente.webm`, `nucleo.webm` e `golfinho.webm`.
- Mostram a luta inteira, na arena do modo treino, com a mesa de cartas do meio da fase fechada.
- O dano chega em fluxo constante, um golpe a cada 0,1 s com a marca dele, e as transições ficam imunes como no jogo.
- São gerados pelo `_filmar-destrocos.mjs`, nos grupos de mesmo nome.
- A sonda é `scripts/_inimigos/_sonda-chefes.mjs`.

## 11. As marcas dos golpes (27/10, a ideia dele)

Ele, testando no sandbox: *"os inimigos que têm movimentos (bosses, elites e mini bosses) quando recebem a camada de
dano (marca do tiro), ao se mexer, a camada não acompanha"*.

**A causa:** o buraco mora no pixel do quadro. A pata da aranha anda e o buraco fica onde ela estava; o aro pinta o
lugar antigo ou outra parte que passe por ali. Eu ia fazer cada mordida seguir o próprio pedaço (casamento de molde a
cada quadro). Ele propôs outra coisa, mais barata e que resolve na raiz:

> *"E se os danos nesses inimigos maiores não tirarem lascas (deixar as lascas e estilhaços para momentos antes de
> matá-los). Fazer com que os tiros e explosões tirem pedaços bem menores. Assim, um tiro tira 1 px e explosões
> pequenas 3 px e maiores 4 px. Ser simbólico mas dar um efeito que, os tiros realmente tiram pixels e explosões
> também"* — *"O mesmo poderá ser implementado de forma global"* — *"No caso da aranha, por exemplo, as patas saírem
> pode ser no momento final antes de matá-la"*.

- **A marca** (`Destrocos.marcar`, `DESTROCOS.marca`):
  - todo golpe que não mata tira `px` pixels do corpo: o tiro 1, a explosão das cartas e o míssil 3, a bomba 4;
  - o pixel tirado é o do corpo mais perto de onde o golpe veio (o `de` do `ferirInimigo`, 16 px atrás do tiro), e os
    vizinhos mais perto dele — **substituído na 2ª rodada (§13): a marca come a BORDA, na linha do golpe**;
  - os pixels voam na própria cor, com uma faísca no metal e gotas na carne;
  - o furo fica, com um aro (o valor 3 da máscara) que esquenta 0,25 s e depois carboniza, sem a brasa piscando;
  - a queima e o choque não têm lado e não tiram pixel.
- **Por que funciona no corpo que se mexe:** um furo de 1 a 4 px que não acompanha a pose quase não se nota.
- **Custo:** o furo novo é aplicado direto nas cópias furadas que já existem (`furarMais`, com `clearRect` nos pixels
  de origem). Não nasce textura nova por tiro, e os quadros sem cópia são refeitos quando aparecem.
- **Os pedaços grandes vão para perto da morte** (`DESTROCOS.lasca.*.limiares`):
  - comum: 30% (os de 2 a 3 de vida, 50%);
  - elite: 20%;
  - mini: 20% e 10% (as patas da aranha caindo);
  - chefão: 15% e 6%. Na D1 vêm depois as cinco mordidas da morte.
- **Onde marca:**
  - `ferirInimigo` marca os inimigos;
  - `bulletHitBoss` e as bombas (`ferirChefe` ganhou o ponto da explosão) marcam o chefão;
  - `bulletHitGolfinho` e as bombas marcam o golfinho.
- **O filme** é o `filme/marcas.webm` (grupo `marcas`): um tiro a cada 0,1 s, da esquerda, em alturas variadas. A
  aranha está viva. A sonda do inimigo vivo é `scripts/_inimigos/_sonda-movimento.mjs`.

## 12. A assinatura da nave do jogador (27/10)

Ele: *"o efeito de destruição da nave Terminus ficou muito parecida com o efeito de destruição dos inimigos, fui morto
perto de inimigos como kamikazes e batedores e percebi que a explosão é idêntica"*.

**A causa:** as mortes dos inimigos saíram das naves. A A1 dos comuns é a mesma folha de explosão dos estilhaços da
Terminus, e a bola da nave (0,5) era menor que a do comum (0,62). A B1 é a ruptura da X-Aelo, e a luz se desmancha
como a Charybdis.

**A escolha dele:** a assinatura, com a ressalva *"ontem já tínhamos escolhido uma explosão para cada nave, mas gostei
do acréscimo das características antes da explosão"*. Depois ele perguntou do anel e dos cacos, e eles entraram como
camadas por cima. Cada nave mantém a sua morte. As três camadas estão em `MORTE.assinatura`, e cada uma liga e
desliga sozinha:

- **A sobrecarga (0,34 s, antes da morte):**
  - o casco treme cada vez mais (de 1 a 2,6 px);
  - pixels esquentam e piscam pelo corpo como rachaduras se formando, cada vez mais;
  - saem faíscas do casco e do bocal, e o fogo do motor engasga;
  - dois arcos elétricos pequenos (`Fx.estalo`) correm pelo casco; na Charybdis, dois de cada vez, contidos no corpo.
  - Ela roda num relógio próprio (`pre`), antes do relógio da morte: nenhum tempo das três mortes mudou. A `duracao`
    soma a sobrecarga, e o GAME OVER espera por ela.
- **O anel de choque**, no momento grande (o clarão e a câmera lenta): um anel de pixel que abre de 5 a 46 px em
  0,42 s, na rampa da nave (fogo, ou o ciano da Charybdis), sólido ao nascer e sumindo em degradê enquanto abre.
- **A cadeia:** quatro a seis pedaços (de 10 px ou mais) estouram pequenos enquanto voam, até 1 s depois. A
  Charybdis vira brasa e não tem pedaço, então ela descarrega no que resta do casco.

**O retorno dele aos filmes (27/10):**
- *"Os arcos ficaram grandes em todas as naves, pode diminuir em todas"*: o meio comprimento do arco caiu de 8–14 px
  para 3–5 px.
- *"Na manta, os choques que antecedem a explosão podem ficar menores e mais contidos"*: no lugar da descarga cheia da
  água-viva (`Fx.choque`, 7 raios de ~22 px e um anel), ela solta dois arcos pequenos no próprio corpo, a cada vez.
- *"O arco do anel precisa sumir com o tempo, usando um degradê de sólido no início e dar um fade para no crescimento
  do anel ser visto pouco antes de sumir"*: o anel não some mais em pontilhado. A opacidade cai em degradê,
  (1 − u)^1,6 ao longo da vida dele, e o brilho cai junto.

**Onde está:** em `MorteDaNave.ts` (`sobrecarga`, `assinar`, `estourarCadeia`, `desenharAneis`). A lasca de uma vida
perdida (`golpe`) não muda. O registry `assinaturaMorte = false` desliga tudo (dev e filmes). Os filmes são
`filme/nave-terminus.webm`, `nave-xaelo.webm` e `nave-charybdis.webm` (`_filmar-morte.mjs`, painel `estilo:sem` ao
lado do painel com a assinatura).

## 13. A marca na borda, e o asset destrutível (27/10, 2ª rodada)

Ele, jogando, sobre o Guardião: *"as marcas se concentram onde, provavelmente, é o hitbox e isso fica parecendo uma
mancha"*, e a primeira lasca saindo da cabeça. Sobre a Torre: *"não vejo o impacto dos tiros e explosões nele … o
corte ficou com pixels flutuantes"*. Sobre a Serpente: os tiros depois da 1ª cabeça *"atingem somente o primeiro
toco"*. E a regra que ele queria desde o começo: *"pense nos inimigos, bosses, mini bosses e elites como um asset,
cada tiro tira 1 px da borda do asset, para começar a deformá-lo"*.

**As causas** (achadas com a nave e as balas do jogo, `_sonda-tiro-real.mjs`; as sondas e os filmes de antes atiravam
com um ponto de fora do corpo e esconderam todas):
- **Guardião:** a marca ia para o pixel do corpo mais perto de um ponto 16 px atrás de onde a bala tocou a hitbox. A
  hitbox dele fica dentro do desenho, e todos os tiros cavavam a mesma coluna no meio da casca.
- **Torre:** pela mesma regra, o pixel mais perto era a parte de baixo do cano, escuro contra o céu escuro.
- **Serpente:** a hitbox da cabeça é um círculo de 33 px de raio, e ele estava fora do lugar (um `setCircle(15)` num
  `flash` de 16×16 sem deslocamento), uns 15 px abaixo e à direita da cabeça, em cima do pescoço e do toco. A bala era
  pega ali, a fagulha acendia ali e a marca ia para o toco.
- **Os pixels flutuantes:** a mordida não olhava o que ficava solto depois dela.
- **E mais um, achado na sonda:** a arte do Guardião balança até 3 px dentro do próprio quadro. Um furo fixo no pixel
  do quadro escorregava para fora da borda.

**O que mudou** (detalhes no `docs/DESTROCOS.md` §14):
- **A borda:** a marca come o primeiro pixel do corpo na linha do golpe, do lado de onde veio. Uma série de tiros no
  mesmo lugar cava um V estreito (`sulco` 3), e a explosão faz uma mordida redonda pequena.
- **A lança cava mais:** o tiro tira o seu dano, de 1 a 3 px.
- **A fagulha acende no pixel comido**, não onde a bala tocou a hitbox.
- **A cicatriz é uma história de golpes,** refeita na arte de cada quadro, com o balanço dele compensado. A marca
  fica na borda em qualquer pose. Custa 0,16 ms por marca.
- **O que o corte deixa pendurado cai,** na marca e na mordida.
- **Serpente:** as marcas só caem na cabeça viva, numa borda de verdade (`zona`). O círculo da cabeça foi centrado
  nela, com o mesmo raio.
- **Guardião:** os pedaços grandes saem dos tubos de cima, dos tubos do alto à direita e dos tentáculos de baixo, não
  da cara.
- **O aro da marca no biomec** é a cor dele escurecida. O vermelho de carne na casca marrom desenhava uma linha rosa
  ao longo da borda.
- **Os estilhaços no ar caem já** (ele: *"estilhaços já quebram e caem direto"*). Na F1, nenhum pedaço de morte é
  jogado para cima; a fagulha e a brasa continuam subindo. No vácuo, os pedaços seguem à deriva.

**O próximo passo: as peças destrutíveis** (ele: *"pensa no asset como um asset destrutível, cada pixel é um pedacinho
dele que pode tomar dano e se desfazer"*). As decisões dele, de 27/10:
- **As peças:** o cinturão da F2 (o asteroide, a mina, a mina sensora, o asteroide minerável) e os destroços de nave
  (a frota da F2 e o que o Leviatã engoliu, na F4). Os destroços continuam indestrutíveis: só perdem pixels.
- **A resistência é pelo material:** a carne e a rocha perdem 1 px por tiro. O metal de destroço é mais duro, 1 px a
  cada 2 tiros (`dureza`). A arma forte cava mais.
- **O asteroide:** a explosão do PixelLab continua, mas ele se parte como rocha no espaço, diferente dos estilhaços
  dos inimigos (*"para não ter um estilhaço igual ao dos inimigos"*).
- **O buraco:**
  - ele prefere que o buraco mude o jogo além do visual, e se for pesado, fica só o visual;
  - a recomendação aceita: a bala passa só onde um pixel foi destruído, nunca onde a arte nunca teve pixel, para o
    balanço das hitboxes folgadas ficar igual;
  - a nave continua batendo na forma inteira;
  - furar uma estrutura só com muito poder de fogo, e o ritmo da fase não deixa.
- **A ordem:**
  1. os chefões (esta rodada);
  2. as marcas nas peças;
  3. a bala atravessando o buraco.
- **A etapa 2 entrou em 27/10** (detalhes no `DESTROCOS.md` §14.1):
  - a tabela `PECAS` e o material `rocha`;
  - a quebra de rocha em três jeitos, para ele escolher no filme `rocha.webm` (R1, a fratura, é o padrão até lá);
  - o destroço marcado e indestrutível, de dureza 2;
  - a sonda `_sonda-cinturao.mjs` e o filme `pecas.webm`.
- **O retorno dele à etapa 2 (27/10):** *"Vou com R2 para as rochas grandes e R3 para as pequenas. Mas faça com que os
  pedaços desapareçam mais rápido. As marcas nas bordas ficaram boas e nas peças também"*.
  - A grande esfarela e a pequena se parte, pelo tamanho desenhado (`pxGrande`).
  - Os pedaços somem em cerca de metade do tempo.
  - Na Serpente: *"quando ela vira uma serpente maior, os pedaços grandes que saem dela na hora da explosão deixam marcas
    cor avermelhadas fixadas"*. As marcas dos estouros e a borda do corte deixam de ficar vermelhas nos pedaços de um
    chefão de carne (`DESTROCOS.md` §14.3).
- **A etapa 3 entrou em 27/10** (`DESTROCOS.md` §14.2): a bala segue pela parte que os tiros tiraram de um inimigo ou de
  uma peça, até o primeiro pixel vivo; com o túnel aberto, ela atravessa. A faixa intacta acerta como antes, e a nave
  bate na forma inteira.
