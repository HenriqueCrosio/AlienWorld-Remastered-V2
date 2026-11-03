# A Serpente de 3 cabeças: as habilidades no jogo — design

> 02/11/2026. Depois das rodadas 1–14 das habilidades (todas em maquete, na pasta
> `docs/superpowers/folhas/2026-10-31/serpente-habilidades/`), ele: *"O proximo passo é instalar as habilidades no
> jogo"*. Nada commitado.
>
> **As escolhas dele (02/11, com opções):**
> - **as habilidades morrem com a cabeça:** a forma A tem tudo; a B perde o raio; a C fica com o que tem hoje;
> - **o contra do gás tira um pedaço da vida** (15% da forma, calibrável);
> - **a investida sai de todas as formas**, inclusive da fusão;
> - **tudo numa entrega só**;
> - **a ordem na A:** *"chuva raio e gás, além disso, quero variações de tiros comuns. Eles necessitam de serem lidos
>   também, de forma mais simples claro"* → entram **o leque de veneno** (verde) e **o cerco** (duas cabeças), além do
>   tiro mirado de hoje; *"No 'cerco' elas se revezam na dupla de ataque conjunto"*;
> - **os gestos do gás na B:** *"faça animações diferentes, as cabeças reagindo de outra forma"* → **feridas e
>   furiosas**;
> - **a abordagem:** portar as maquetes como estão, com os efeitos numa camada de pixels.
>
> **EMENDA 02–03/11 (a pausa 2, ele jogando o link e vendo `luta-tiros.html`; escolhas com opções):**
> - *"A serpente sobe e desce no buraco, com um movimento muito irreal"* → **ela fica FIXA no posto baixo** (y 142) a
>   luta inteira, em todas as formas: sem troca de posto, sem a "respiração" que deslizava o desenho, sem descer antes
>   da habilidade. Só as animações (o idle, os gestos) a mexem. Ela sobe pelo rombo só na chegada (até o posto baixo) e
>   afunda só na morte/fusão.
> - *"não faz mais sentido fazer o player mirar em cada cabeça… basta acertar o corpo e as cabeças vão caindo conforme a
>   vida desce, assim fica mais justo"* → **o corpo inteiro leva dano**: qualquer pixel visível dela (a máscara do quadro
>   mostrado; onde o lábio do rombo cobre as roscas, o casco absorve). A cabeça que vai cair vale **mais, mas não o
>   dobro** (ele: *"Ele recompensa, mas não facilita o dobro"*): **1,5×**, calibrável. As veias seguem mostrando qual é.
>   A ordem das cabeças e a troca de forma pela vida continuam. A vida de cada forma **dobra** (provisório: quase todo
>   tiro agora acerta; calibrar jogando). Acerto no corpo = a marca + a fagulha; na cabeça = a marca + o respingo.
>
> **EMENDA 03/11 (as pausas 3–5, ele vendo `chuva.html`, `raio.html` e `gas.html` da instalação; tudo APROVADO):**
> - **a chuva:** o cuspe que o gerador pintou no gesto da chuva da A saiu (*"pode limpar"*), e a boca vermelha de carne
>   da laranja no ERGUER da B e da C foi para a brasa (*"destoa do restante das animações"*);
> - **a boca aberta conta como cabeça** (*"pode fazer contar como cabeça"*): num quadro de gesto, o corte da cápsula da
>   cabeça vai 10 px além da boca (`ALEM_GESTO`), e a luz da cabeça perto da boca (`BOCA_ACESA` 1,2 × o raio) também
>   conta, valendo os 1,5×;
> - **o gás da B tem a SUA sequência** (*"a de 3 cabeças pode manter como está, mas a sequência dos 3 tiros na de 2
>   cabeças precisa mudar"*): RASTEIRA → CORTINA → FILA FUNDA (`HAB.gas.ordem.B`); a da A não mudou;
> - **o casco NÃO é chão** (*"A nave não bate no casco, então ela pode se esconder embaixo dele [...] o último tiro da
>   leva B eu quero que cruze o casco para baixo"*): na F3 a nave desce sobre o casco até ~211, e quem foge para baixo
>   se esconde sob a crista. A FILA FUNDA termina com dois leques que ATRAVESSAM a crista (`cruza`) e pegam o
>   esconderijo; as outras duas da B deixam ele escapar, de propósito (o castigo é a terceira).
>
> **A fonte da verdade são as maquetes aprovadas** (`scripts/_serpente/_habilidades-maquete.mjs`) e os registros
> `PROGRESSO-gravidade-zero.md` e `PROGRESSO-corpo-cor.md`. Onde esta spec não dá um número, vale o da maquete.

## 0. O que já está aprovado (e onde)

| Peça | Rodada / folha | O que ficou |
|---|---|---|
| Mísseis da chuva | 3 `gravidade-zero.html` | sobem com o motor desligado, viram acima da tela, voltam de nariz, do repouso, a 160 px/s²; 10 vagas de 22 px, o vão anda uma vaga por onda; estouram no casco |
| Gás + faísca (mecânica) | 6 `geleia-plasma.html`, 7 `termometro-esquivas.html` | geleia de plasma viscosa ("B que depois pinga"); 3 esquivas (leque, trilhos, fila); termômetro que zera a cada faísca; contra que explode na cara; a carta INCENDIÁRIO |
| Raio da azul (mecânica) | 8 `raio-varredura.html`, 9 `raio-salva.html`, 10 `raio-foco-faiscas.html` | a varredura avisada em fatias (cima → baixo), o foco reto do olho, a SALVA de 6 raios finos sorteada com regra |
| Gestos da azul | 11 `raio-cabeca.html` | 4 conjuntos do PixelLab (`cru3/cabeca-raio/` + `pontos.json`); lê / ensaia / prepara / dispara / recupera |
| Efeitos do raio | 12 `raio-efeitos.html` | energia entrando, luzes acendendo, raio em camadas, frente de energia (só o desenhado fere), clarão + tranco 2 px, descargas, vapor, a fatia de baixo começando NO casco (o casco é cortado) |
| Gestos + efeitos do gás | 13 `gas-cabecas.html` | 6 conjuntos (`cru3/cabeca-gas/` + `pontos.json`); luzes pulsando/acendendo, arcos no focinho, bicada curta, tranco 1 px, fumaça, último sopro; no contra as três se encolhem |
| Projéteis | 14 `projeteis.html` | tiros **B** (agulha / veneno / brasa) com o cuspe do gerador limpo e um clarão de 3 px; míssil **casulo**; a chama na cor da cabeça |

## 1. Escopo

**Entra:** as formas A, B e C da luta com as habilidades abaixo; a fusão sem a investida; a arte nova do PixelLab (§4);
o que a cena precisa para isso (§5.5); sondas e vídeos (§6).

**Não entra:** som (só depois do balanceamento do jogo inteiro); a serpente maior (a fusão refeita); a chegada, o
rombo e a morte (ficam como estão); balanceamento fino (os números saem das maquetes e se calibram depois, no jogo).

## 2. A luta, forma por forma

A anatomia continua: cada forma tem UMA cabeça que cai quando a vida da forma acaba, e a queda troca a arte. Agora a
cabeça que cai LEVA A HABILIDADE DELA. (Emenda 03/11: o corpo inteiro leva dano, a cabeça que vai cair vale 1,5×.)

### 2.1 A forma A — 3 cabeças, a azul vulnerável

- **O ciclo:** chuva → raio → gás + faísca → repete.
- **Entre duas habilidades:** uma pausa de ~2,4 s com dois tiros comuns, a variação em rodízio (§3.1).
- **Durante uma habilidade:** os tiros comuns param (as esquivas foram medidas sem nada mais na tela). Ela está no
  **posto baixo** do rombo (y 142, o da maquete) — desde a emenda de 03/11, a luta inteira.
- **O raio é da azul:** a cabeça vulnerável se mexe para mirar, e a hitbox dela segue o crânio do quadro (§4.3).

### 2.2 A forma B — verde + laranja, a verde vulnerável

- **O ciclo:** chuva de 2 ondas (verde, laranja) → gás + faísca → repete.
- **Os gestos do gás são os da B** (§4.2, feridas e furiosas), nunca os da A.
- **Os tiros comuns:** o mirado, o leque de veneno e o cerco, com a dupla verde + laranja sempre.
- A boca da verde da B está noutro lugar, então as esquivas mudam de geometria: a sonda mede as três na B (§6), e os
  alvos dos padrões se ajustam até a folga mínima voltar a ≥ 12 px com a esquiva certa e a errada continuar
  levando dano.

### 2.3 A forma C — só a laranja, vulnerável

Fica com a rajada mirada e o leque de hoje, agora com a brasa (§3.1). Sem a investida.

### 2.4 A fusão

Fica com o leque e a rajada de hoje, sem a investida, com o tiro dela de hoje (a gota), até ser refeita como a serpente
maior.

### 2.5 O que vale para todas

- **A investida sai do jogo:** o estado `Investida`, a rachadura, o rasgo, a trava, o bote, a janela e o que só existe
  para ela. O casco vivo da chegada fica.
- **O contra do gás tira 15% da vida da forma** (`numeros`), pelo mesmo caminho de dano da cabeça (pode trocar a forma,
  se zerar).
- **Se a cabeça morre no meio de uma habilidade,** a habilidade se desfaz em 0,5 s:
  - o raio apaga;
  - o gás se dissipa;
  - a geleia e os mísseis em voo somem.

  Depois a troca de forma segue como hoje.

## 3. As habilidades

### 3.1 Os tiros comuns

- **Os sprites:** os da rodada 14, conceito B (`folhas/.../projeteis/tiro-B/`): a agulha da azul, a gota de veneno da
  verde, a brasa da laranja.
  - Animados (15 / 10 / 12 fps), giram na direção do voo (`setRotation`).
  - O rastro de cada um é só visual: a verde pinga, a laranja solta fumaça e fagulha.
- **A caixa de colisão continua a de hoje** (≈ 12×8, a do `bolt2` a 0,9). Os sprites são desenhados para escala 1; a
  sonda prova a caixa igual à de antes (§6).
- **O clarão na boca:** o da rodada 14b, de 3 px por 0,03 s e 1 px por 0,07 s.
  - A laranja solta junto 2 fagulhas e um fio de fumaça; a verde, 3 gotinhas.
  - A azul fica com o clipe dela como está.
- **O gesto:**
  - Na A, no mirado, cada cabeça toca o próprio clipe de tiro: `tiroAk` (azul), `tiroCk` (laranja) e `tiroBk` (verde),
    os dois últimos LIMPOS (`cru2/tirosK-limpo/`). O tiro sai no quadro de ação, da boca daquele quadro (a rodada 4
    mediu: ciano 26,84 · laranja 106,98 · verde 64,85 em px do quadro de 256²).
  - Na A, o leque de veneno toca o `tiroBk` limpo; o cerco toca o clipe novo da dupla (§4.2).
  - Na B e na C, o erguer de hoje.
- **As variações** (a leitura entre parênteses):

| Variação | Quem | O que sai | Leitura |
|---|---|---|---|
| Mirado (a de hoje) | uma cabeça, em rodízio | 1 tiro na direção da nave, ±0,35 rad, 140 px/s | saia de onde está |
| Leque de veneno | a verde | 3 gotas abertas em leque de 30°, 105 px/s | fique no vão |
| Cerco | uma dupla, em rodízio (A: azul+verde → verde+laranja → azul+laranja; B: verde+laranja) | 2 tiros juntos, mirados 22 px acima e 22 px abaixo da nave, 140 px/s | fique no meio |

Os números de velocidade, abertura e afastamento são o ponto de partida; calibram no jogo.

### 3.2 A chuva de casulos

- **O comportamento é o da rodada 3, com a correção da 14:** a 1ª onda (a azul) cai.
  - Cada cabeça viva lança uma salva de 9 para cima e para fora, com o motor desligado.
  - Acima da tela, as ondas voltam de nariz, do repouso, acelerando a 160 px/s².
  - São 10 vagas de 22 px, todas na frente dela, e o vão de 3 vagas anda uma vaga por onda.
  - O míssil estoura no casco (o estouro de hoje da maquete).
- **O míssil é o casulo** (`projeteis/missil-B/`).
  - A chama sai na cor da cabeça, presa à cauda.
  - A fumaça do motor também sai na cor da cabeça.
- **O gesto:** na A, o clipe `chuvaM2`. Na B, o erguer.
- **Fere:** o míssil inteiro, subindo ou descendo. A caixa é a do casulo na direção do voo: 7×11 descendo, 9×9 subindo
  na diagonal.

### 3.3 O raio da azul (só na A)

- **A sequência da maquete `varredura`** (rodadas 8–12): 2 fatias, cima (−10 → 90) e baixo (172 → 60, começando no
  casco); depois a salva de 6 raios finos.
  - A salva é sorteada a cada luta com a regra: cada fatia cobre a nave e deixa saída ≤ 25 px.
  - Cada disparo segue as fases lê 0,35 / ensaia 0,45 / prepara 0,8 / dispara / recupera ~1,2 s.
- **Os gestos:** os 4 conjuntos da rodada 11 (fechada, aberta, abre, recupera), com o olho e a boca por quadro de
  `pontos.json`.
- **Os efeitos são os da rodada 12, todos:**
  - a energia entrando na boca e a esfera;
  - as luzes da cabeça acendendo;
  - o raio em camadas, com a frente de energia;
  - o clarão e o tranco de 2 px;
  - o casco cortado, que esfria;
  - as descargas e o vapor depois.
- **Fere só o que está desenhado:** a frente avança e o raio atrás dela fere. É uma medição da linha (com a largura)
  contra a caixa da nave.

### 3.4 O gás + faísca (A e B)

- **A mecânica é a da rodada 7:**
  - o sopro sai da boca aberta da verde a ~50° para baixo e vira um banco no casco;
  - a laranja carrega 2,5 s e solta a faísca em 3,6 / 7,1 / 10,6 s;
  - os 3 padrões são leque, trilhos e fila, com a geleia de plasma "B que depois pinga";
  - **só o fogo fere** (a geleia acesa), e o gás não.
- **O termômetro:**
  - Fica ao lado dela (x 370) e sobe com cada tiro do jogador que atravessa o gás: 1/12 × a densidade mais grossa
    cruzada.
  - Esfria 0,04/s e zera a cada faísca.
  - Cheio, dispara o contra: o fogo volta pelo sopro e explode na cara das cabeças vivas, com a geleia grudada
    queimando, o tranco e o clarão quente. Esse contra tira 15% da vida da forma (§2.5).
- **A carta INCENDIÁRIO:** com ela, o primeiro tiro que toca o gás acende tudo. O termômetro pega fogo e estoura.
- **Os gestos e efeitos da A** (rodada 13):
  - A verde abre e despeja, e o pescoço bombeia nas janelas livres.
  - A laranja recua tremendo, com os arcos no focinho e as luzes acendendo, e dá a bicada curta. Cada bicada traz
    fumaça, descargas e um tranco de 1 px.
  - No contra, as três se encolhem.
  - Ao fechar, sai o último sopro.
- **Os gestos da B são novos** (§4.2), com os mesmos efeitos aplicados às duas cabeças vivas.

## 4. A arte

### 4.1 O que já existe e entra como está

- `cru3/cabeca-raio/` (fechada 19, aberta 22, abre 9, recupera 13) + `pontos.json`.
- `cru3/cabeca-gas/` (abre 12, sopra 9, carga 9, bote 3, fecha 9, encolhe 13) + `pontos.json`.
- `cru2/tirosK-limpo/`: `tiroAk` = quadros 0–7; `tiroCk` = o quadro 0 + os quadros 8–14; `tiroBk` = o quadro 0 + os
  quadros 15–21.
- `cru2/chuvaM2/` (16 quadros).
- `projeteis/tiro-B/` e `projeteis/missil-B/`.

### 4.2 O que vai ser gerado no PixelLab

Pelas lições de `pixminimax-animacao`:
- o 1º quadro é a arte aprovada da forma;
- o corpo se mexe junto, sempre "in place";
- a cor de cada boca vai dita no pedido;
- vale **"Nothing comes out of any mouth"** (o efeito é nosso, discreto);
- a forma da cabeça a manter vai dita;
- cada gesto começa e termina na pose aprovada;
- são intermediários pinados onde o gerador pular.

Tudo é conferido ampliado e limpo: a mancha cinza, as pintas e o cuspe que escapar.

- **Na A, os gestos do cerco:** 3 clipes, um por dupla (azul+verde, verde+laranja, azul+laranja). As duas cabeças da
  dupla avançam e abrem a boca juntas; a terceira fica quieta.
- **Na B, os gestos do gás, feridos e furiosos** (sobre a arte de 2 cabeças, `serpente-2c`):
  - **a verde abre** e, no sopro, **sacode a cabeça** e solta o gás aos solavancos (a boca fica alta: a lição de
    02/11 sobre o lugar de onde o efeito sai);
  - **a laranja gira o focinho como uma torre**, mirando, na carga, e **recua como um canhão** no disparo (o focinho de
    canhão mantido);
  - **o fechamento;**
  - **no contra, as duas se debatem.**

  São os conjuntos abre / sopra / carga / bote / fecha / encolhe, com os mesmos papéis dos da A e gestos diferentes.

### 4.3 O que se mede em cada quadro

Para cada quadro de cada conjunto, um script mede e grava num arquivo gerado (`src/entities/serpente/gestosHab.ts`), em
px de arte a partir do centro, como o `ERGUER` de hoje:
- as bocas das cabeças vivas (de onde sai cada tiro, sopro, faísca e raio);
- o olho da azul (o foco);
- o crânio da cabeça vulnerável (a hitbox).

### 4.4 As luzes

As luzes que acendem (a azul com a carga, a verde com as baforadas, a laranja com a carga) e o clarão quente do contra
são pintados por cima do corpo como na maquete.

- Um script assa, para cada quadro, a máscara dos pixels de luz de cada cabeça, pelos mesmos testes de cor da maquete.
- No jogo, um sprite por máscara acompanha o quadro, na cor-alvo, com alfa = k × luz. Isso é a mesma mistura da
  maquete.
- O clarão quente é o próprio quadro com `setTintFill` quente e alfa 0,32 × tinta.

## 5. A arquitetura

### 5.1 A camada de pixels

Os efeitos são desenhados como na maquete, pixel a pixel na resolução nativa, numa `CanvasTexture` de 384×216, limpa e
redesenhada a cada quadro, com uma função `put(x, y, cor, alfa)` igual à da maquete. Isso vale para:
- o gás, a geleia, os arcos, o termômetro;
- o aviso, o raio e os efeitos do raio;
- as chamas e a fumaça dos mísseis;
- os rastros e clarões dos tiros;
- o estouro no casco.

Fica numa profundidade acima dela e abaixo da nave e do HUD. É o que garante que o aprovado é o que aparece; nada de
`Graphics` vetorial ([[efeito-de-cena-assado-em-pixel]]).

### 5.2 Os módulos (`src/entities/serpente/`)

| Arquivo | Faz |
|---|---|
| `numerosHab.ts` | todos os números das habilidades, num lugar só, calibráveis |
| `camadaPixels.ts` | a camada da §5.1 |
| `gestosHab.ts` | (gerado) as chaves dos conjuntos, os quadros e os pontos medidos (§4.3) |
| `tocador.ts` | toca um conjunto no sprite dela (fps, ida e volta, de trás para frente), com a origem do quadro de 256² |
| `luzes.ts` | os sprites das máscaras de luz e o clarão quente (§4.4) |
| `tiros.ts` | as variações de tiro comum, os clarões e os rastros |
| `chuva.ts` | os casulos |
| `raio.ts` | o raio da azul (sequência, sorteio da salva, aviso, efeitos, `morde`) |
| `gas.ts` | o gás + faísca (sopro, banco, geleia, padrões, termômetro, contra, carta, efeitos, `morde`, `esquenta`) |

O `BossSerpente.ts` fica com:
- o ciclo de cada forma e o posto baixo durante as habilidades;
- a vida, o contra e a troca de forma;
- a hitbox da cabeça vulnerável seguindo o quadro;
- a saída da investida.

A lógica de cada habilidade vem da maquete, traduzida para o relógio do jogo (`update(dt)`), com dois dados:
- o da física (`acaso`);
- o visual (`visual`), separado como na maquete.

### 5.3 O que fere

- **Os tiros e os mísseis** usam o pool de balas inimigas (`EnemySystem.enemyBullets`), com a colisão de sempre.
- **O raio e a geleia de fogo** ferem por MEDIÇÃO: o chefão ganha um `morde?(esq, dir, topo, base): boolean` opcional
  no `StageBoss`, e a cena chama a cada quadro com a caixa da nave → `damageShip()`. É a mesma lei da parede do duto e
  do teto da caverna, sem corpo e sem empurrão.

### 5.4 O que o gás precisa saber da cena

- **As balas do jogador:** a `ArenaSerpente` ganha `balas()`, as ativas, para o termômetro. A bala que atravessa o gás
  segue voando, e o que conta é ela cruzar a densidade, como na maquete.
- **A carta:** a `ArenaSerpente` ganha `incendiario()`; o `CartasEmJogo` ganha `temIncendiario` (como o `temGuiado`).

### 5.5 Código compartilhado que muda (pouco)

- `Boss.ts`: o `morde?` opcional no `StageBoss`.
- `GameScene.ts`:
  - chama o `morde` do chefão com a caixa da nave;
  - passa `balas` e `incendiario` à Serpente.
- `CartasEmJogo.ts`: o getter `temIncendiario`.
- `BootScene.ts`: carrega as texturas e anims novas (os conjuntos, as máscaras, os tiros, o casulo).

Nenhum outro chefão, carta ou fase muda de comportamento.

### 5.6 O atalho de teste (só em dev)

Um parâmetro na URL abre a Fase 3 direto na luta, na forma pedida e com a habilidade pedida forçada, por exemplo
`?serpente=A&hab=raio`. As sondas e os vídeos usam o atalho; fora de dev ele não existe.

## 6. Como provar

**As sondas** (Playwright, como as de hoje; a nave presa em posições escolhidas):
- os tiros comuns: a caixa de colisão é igual à de antes; o leque deixa vão; o cerco erra quem fica no meio;
- a chuva: as 3 ondas (2 na B) caem; o manequim no vão passa;
- o raio: quem fica na fatia leva, quem sai não; a salva sempre tem saída;
- o gás, na A e na B:
  - as 3 esquivas certas passam com folga ≥ 12 px e as erradas levam;
  - ~12 tiros no banco disparam o contra, que tira 15% da forma;
  - com a carta, acende no 1º toque;
- a investida não existe mais (nenhum estado dela é alcançado em 3 minutos de luta);
- a troca de forma no meio de uma habilidade não deixa nada para trás;
- o desempenho: a luta inteira roda sem queda de quadro perceptível com a camada de pixels (o tempo de quadro medido);
- as outras fases e chefões passam nas sondas de hoje.

**Os vídeos:** cada habilidade, em cada forma, gravada NO JOGO, numa folha para ele julgar em velocidade real
([[avaliar-skill-por-gif]]). A arte nova (os gestos do cerco e os da B) vai na mesma folha, ampliada.

## 7. Riscos

- **Os gestos da B podem não sair na primeira:** o gerador trocou a cabeça da laranja por uma bocarra quando pedimos
  "abrir" na A. Os pedidos levam as lições, e o que não ficar bom é gerado de novo antes da entrega.
- **O peso da camada de pixels:** o gás é uma grade de 192×108 por quadro. Se medir caro, a grade passa a ser
  atualizada a 30 Hz, sem mudar o desenho.
- **As esquivas da B:** com a boca noutro lugar, os alvos dos padrões podem precisar de ajuste para manter a folga
  (§2.2).
