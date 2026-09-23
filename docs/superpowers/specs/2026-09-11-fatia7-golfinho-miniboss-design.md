# SPEC — O GOLFINHO: O MINI-CHEFÃO QUE DÁ MOTIVO À CÂMARA B

**Data:** 2026-09-11 · **Branch:** `feat/fase4-visual` · **Fatia 7**

Aprovado pelo Henrique em 11/09/2026, em quatro partes, depois de jogar e aprovar o M1.5.

---

## 0. DE ONDE ISTO VEIO

Ele jogou o M1.5 e aprovou: *"o duto com as portas ficou muito legal"*, *"a sequência de moldura
se fechando no duto e abrindo no boss ficou como pedi"*. E trouxe o problema seguinte:

> *"Quero que tenha um porquê de mudar o fundo. O jogador entrou em outra parte? Novos inimigos?
> Algo diferente? Hoje em dia apenas se muda o fundo e continua a mesma coisa."*

**A medição confirmou.** Das três trocas de pintura da Fase 4, duas têm motivo: t=68 (o duto
fecha, morde, as portas chegam) e t=109 (silêncio, a parede recua, o chefão). **A de t=40 não tem
nenhum** — os inimigos, as minas e a arte da mesa são os mesmos antes e depois, e o banner de t=42
diz "O DUTO APERTA" 26 segundos antes do duto de verdade.

E um fato por baixo: **nenhum inimigo da Fase 4 mora dentro do Leviatã.** Drone, batedor,
kamikaze, cargueiro e canhoneira vêm das Fases 1 e 2. Ele respondeu que a reciclagem faz parte da
evolução do jogo, *"só que sinto falta de alguns novos"* — e já tinha criado um protótipo no
PixelLab: um golfinho biomecânico (`f37ab55c-be70-49da-8ed5-3bd5e168da31`), sem uso pensado.

> *"Algo que possa entrar na fase 4 onde o azul torácico do segundo fundo aparece, trazendo um
> novo inimigo das profundezas do Leviatã."*

### A receita que o duto já provava

O duto funcionou porque chega com três coisas: **uma regra nova** (a parede fecha e morde), **um
obstáculo que só existe ali** (as portas) e **um aviso na entrada** (o fio acende junto com a
pintura). O golfinho é essa receita aplicada à câmara B: ele é o obstáculo, o aviso e — como
mini-chefão com arena própria — a regra.

A Fase 3 já tem essa forma (a aranha no meio, a serpente no fim). A Fase 4 passa a ter também.

---

## 1. A SEQUÊNCIA

```
TETO ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   (sorteio desta partida: de baixo para cima)
                             B ●   ① AVISO: nada de A até B (sem colisão)
                           ↙   ↑
  ▶ nave            ↙          ↑   ② X, 1ª diagonal: sai de B
              ↘  ↙             ↑   ③ X, 2ª diagonal: sai de A
            ↙  ↘               ↑
         ↙        ↖            ↑
                     ↖       A ●
CHÃO ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

### 1.1 O aviso

Ele nada de **A até B**, e A e B ficam em **paredes opostas** na mesma coluna (`x = 320`). O
sorteio de cada partida escolhe o sentido — de baixo para cima ou de cima para baixo — *"para o
jogador ter a surpresa de estar na segunda run e se deparar com um ataque em lugar diferente"*.

- **B marca de onde o ataque sai.** Palavras dele: *"a marcação do ataque é a posição B,
  independente de onde seja"*.
- **Não ataca e não colide.** A bala do jogador atravessa.
- A travessia é VERTICAL, então o sprite gira **90°** — o único ângulo em que pixel art gira sem
  serrilhar. Dura 2,0s; depois ele segura 1,5s em B, virado para a esquerda.
- A altura em cada parede sai da `Moldura` (`superficieTetoEm`/`superficieChaoEm`), com o centro do
  corpo **4px para dentro** da faixa jogável: colado na parede, girado, metade do comprimento dele
  sobre a faixa. Como o aviso é intocável, a distância não cobra nada — ela é leitura.
- ⚠️ **O primeiro plano sai de cena enquanto ele vive** e volta quando ele morre (achado na captura
  da implementação: a viga cobria o aviso, o X e o duelo). É a lei do chefão e do duto.

### 1.2 O estágio 1 — o X

**A e B são exatamente os dois pontos de partida do X.** Quem prestou atenção no aviso sabe de onde
o ataque vem; quem joga de novo encontra o X invertido.

- **1ª diagonal:** sai de B e cruza até a borda esquerda, na altura da parede de A.
- **2ª diagonal:** entra pela direita na altura de A e cruza até a borda esquerda, na altura de B.
- **As duas vão da direita para a esquerda.** O golfinho fica sempre virado para a esquerda, com a
  arte que existe, sem espelhar. **Nas diagonais ele NÃO gira** — uma inclinação de ~21° serrilharia
  a arte, e a cambalhota esconde o movimento.
- **Em cada diagonal ele dá UMA cambalhota e dispara o LEQUE DE 3** (mirado na nave, ±13°, como o da
  aranha). ⚠️ **Ele FREIA durante a cambalhota**, em `x ≤ 280`: a animação dura 1,4s e o tiro sai no
  fim dela; em movimento, o leque sairia na metade ESQUERDA da tela, nas costas do jogador.
- Velocidade na diagonal: 190px/s.

### 1.3 O estágio 2 — o duelo

Ele aparece **pela direita, na meia altura, de frente para a nave**, e estaciona em `x = 300`. Daí
em diante, até morrer ou o jogador perder:

> *"flip para cima e atira, flip para baixo e atira (até o jogador conseguir matá-lo ou morrer)"*

- **Flip subindo → rajada curta; flip descendo → rajada curta**, alternando.
- **Rajada curta = 3 tiros mirados em fila**, 0,09s entre eles.
- O deslocamento do flip é de 36px, feito durante a rolagem (antes do tiro). A altura fica presa
  entre as paredes (22px de margem de cada lado); bateu no limite, inverte.

### 1.4 Os dois ataques são dois idiomas

| movimento | tiro | a pergunta ao jogador |
|---|---|---|
| **cambalhota** (estágio 1) | leque de 3 | *ache o buraco* |
| **flip** (estágio 2) | rajada de 3 em fila | *saia da linha* |

É o vocabulário que o jogo já ensina (a aranha abre leque, a canhoneira mira), e cada animação
anuncia o seu tiro: **o giro É o telégrafo**, e ele dá ~1s de leitura antes da bala.

---

## 2. A ARENA — A FASE SEGURA

> *"A fase se abre, os inimigos cessam, as minas e desafios, apenas o jogador e o golfinho."*

### 2.1 O relógio não passa de t=49,5 enquanto ele viver

O relógio do roteiro é uma linha (`elapsed += dt`, `GameScene.ts:453`). É dele que saem o roteiro, a
aproximação do fundo, a barra de progresso e os pontos por tempo.

⚠️ **A REGRA É "NÃO PASSA DE 49,5 COM ELE VIVO", E NÃO "PARA QUANDO O DUELO COMEÇA".** A diferença é
de robustez, não de efeito. O X não tem duração exata — cada cambalhota freia o golfinho — e, se a
pausa esperasse o estado de duelo, um X um pouco mais longo deixaria os eventos de t=50 (o corredor
e as minas) nascerem antes do duelo, dentro da arena. Com o teto em 49,5 isso é impossível por
construção. Para o jogador dá no mesmo: entre 41 e 50 o roteiro não tem nada marcado.

**O número mora no roteiro:** `{ t: 40, type: 'miniboss', kind: 'golfinho', seguraEm: 49.5 }`.
Quem manda na forma da fase continua sendo o roteiro, nunca a entidade.

| congela | continua |
|---|---|
| o roteiro | o mundo rolando (fundo e parede) |
| a aproximação do fundo | a física, as armas, o calor da mini-gun |
| a barra de progresso | os i-frames depois de perder vida |
| **os pontos por tempo** — enrolar no duelo não rende | |

**Nada novo nasce na arena, e não por sorte:** o corredor para em t=38,5, as minas estão desligadas
desde t=38, e não há onda marcada entre 41 e 50.

### 2.2 A pausa nunca prende a fase

Ela depende de o golfinho EXISTIR E ESTAR VIVO. Qualquer caminho que o tire de cena a solta:

- **Morreu por bala ou bomba** → a fase segue de 49,5.
- **Perder uma vida no duelo** → a nave volta, o duelo continua.
- **Fim de jogo** → a tela de fim de sempre.
- **Atalho `G` e modo treino** → o golfinho é destruído e a fase anda. (O treino pula direto para o
  chefão com `skipTo`, e o evento de t=40 nunca dispara.)

---

## 3. COLISÃO E VIDA

| | **aviso** | **X** | **duelo** |
|---|---|---|---|
| encostar na nave | não fere | **fere** | **fere** |
| a bala do jogador | **atravessa** | **fere** | **fere** |
| a bomba | nada | 12 de vida | 12 de vida |
| o teleguiado | ignora | **persegue** | **persegue** |
| a barra de vida | escondida | **aparece** | visível |
| o piso de vida | — | **não desce de 25** | sem piso |

- **Vida 50, piso 25** — chute calibrado até o teste jogado. No pior caso (PULSE, 7 de dano/s):
  quem acertou tudo no X precisa de ~4s de tiro certo no duelo; quem não acertou nada, de ~7s.
- **No piso, a bala continua fazendo fagulha** e só a barra para. O jogador vê que acertou; o
  golfinho não parece imune por defeito.
- **Decisão dele (a opção C):** o X conta, mas o duelo SEMPRE acontece. Quem mira bem no X chega ao
  duelo com ele mais fraco; ninguém pula a arena.
- **A barra** tem a cara da do chefão (`enemyDark`/`enemyBright`, y=16), com 100px contra os 160
  dele — a promessa de que esta luta é menor que a do final.
- **Ao morrer:** `Fx.explodeBig`, **500 pontos** (o mesmo da aranha), **sem hitstop** — a pausa
  dramática é dos chefões.
- Os tiros saem do **pool de balas inimigas** (`enemies.enemyBullets`). A bomba já os limpa.

---

## 4. A ARTE

### 4.1 O que existe e fica — nada a gerar

| peça | origem | uso |
|---|---|---|
| **nado** (9 quadros, 80×80) | PixMiniMax `39d99a12`, aprovado | aviso, espera em B, diagonais, entrada do duelo — em **vai-e-volta** (o loop direto dá tranco: 3,91 contra 2,8 entre vizinhos) |
| **flip + tiro** (17) | PixMiniMax `279cc362`, *"ficou perfeito"* | duelo |
| **cambalhota v1 + tiro** (17) | PixMiniMax `3d081f67`, aprovada | as diagonais do X |
| **a bala** | recortada do flip | o leque e a rajada |
| a explosão | `Fx.explodeBig` | a morte |

A v2 da cambalhota (`ff2a4a3b`, a do laser) fica guardada, fora do jogo.

### 4.2 Os cinco cuidados

1. ⚠️ **A BALA DESENHADA NA ANIMAÇÃO É APAGADA.** O flip e a cambalhota trazem a bala voando dentro
   do quadro; no jogo haveria dois tiros na tela e só um mataria. Em cada quadro de tiro, apagam-se
   os pixels que estão FORA da silhueta da pose limpa anterior (flip: quadros 11–16 contra o 10;
   cambalhota: 14–16 contra o 13). O brilho da boca, que fica dentro do corpo, sobrevive. **A bala
   real nasce no focinho no quadro exato em que o vermelho aparecia: 11 no flip, 14 na cambalhota.**
2. **A bala sai em 13×9**, o quadro do `bolt2` e da `shotAranha`: a hitbox do pool vem desse quadro.
   O recorte tem ~20×8; reduzir é permitido. Ela gira para apontar para onde vai.
3. ⚠️ **A HITBOX SAI DO CORPO, NÃO DO QUADRO.** O golfinho ocupa ~42×30 de um quadro de 80×80
   (medido: x=20..60, y=27..56 na pose de nado). O corpo físico é fixado à mão em **34×20**,
   centrado em (40, 41). Com a regra padrão ele mataria 38px de vazio.
4. **Só gira de 90 em 90.** Aviso: ±90°. Diagonais: 0°.
5. **Os quadros originais vão para `assets/raw/anim-golfinho/`**; as folhas montadas vão para
   `public/sprites/` em escala 1.

### 4.3 As chaves

| chave | arquivo | quadro |
|---|---|---|
| `golfinhoNado` | `sprites/golfinho-nado.png` | 80×80 × 9 |
| `golfinhoFlip` | `sprites/golfinho-flip.png` | 80×80 × 17 |
| `golfinhoCambalhota` | `sprites/golfinho-cambalhota.png` | 80×80 × 17 |
| `shotGolfinho` | `sprites/shot-golfinho.png` | 13×9 |

---

## 5. O ROTEIRO DA CÂMARA B

| t | antes | depois |
|---|---|---|
| 37–38 | respiro | igual |
| **38,5** | — | **`corredor` rate 0** — as últimas mesas saem da tela em 4,6s (384÷84), antes do X |
| **40** | pintura azul | pintura azul + **`miniboss` golfinho, `seguraEm: 49.5`** |
| 41 | — | banner **"AS PROFUNDEZAS"** |
| 42 | banner "O DUTO APERTA" ⚠️ | *removido* |
| 43–51 | corredor 76, minas, batedores, cargueiro | *a arena* |
| **50** | — | banner **"A GARGANTA APERTA"** + corredor 76 + moldura 16 |
| 50,5 | — | minas (sensor, mina, destroço) |
| 52 / 52,5 | — | banner do cargueiro / cargueiro |
| 54 → 113 | kamikazes, parede 32, drones, REJEIÇÃO TOTAL, duto, portas, núcleo | **nada muda** |

- **O aperto encolhe de 20s para 13s** e a onda de batedores de t=46 sai. Assim **o duto aprovado
  continua em t=68 e o roteiro continua com 113s.** O tempo real cresce só o que o duelo durar.
- ⚠️ A lei do roteiro em ordem crescente de `t` vale — o guarda do `StageDirector` confere na carga.
- O evento `miniboss` ganha `kind?: 'aranha' | 'golfinho'` e `seguraEm?: number`. **Sem `kind`, é a
  aranha** — o `STAGE_3` não muda uma linha.

---

## 6. A CONSTRUÇÃO

**Uma entidade própria, `src/entities/Golfinho.ts`**, no molde dos chefões (decisão dele, opção 1).
Os três estados têm regra própria — intocável, piso de vida, ficar de frente, segurar a fase — e a
aranha coube no `EnemySystem` (814 linhas, sete inimigos) porque tinha um ciclo simples; ele não
caberia sem dobrar o arquivo. A esteira do chefão (`spawnBoss`) foi descartada: ela é o fim da fase
(matar chama a vitória e a cutscene).

A `GameScene` só faz o que é dela: cria a entidade no evento, liga as colisões (nave × corpo, balas ×
corpo — `overlap(sprite, grupo)`, na ordem que o `bulletHitBoss` já documenta), pergunta se ele é
vulnerável e se está vivo, dá os 500 pontos, e segura o relógio.

---

## 7. COMO SE VERIFICA

### 7.1 A sonda nova — `scripts/probe-f4-golfinho.mjs`

Pula para t≈39,5 (o que o `G` já faz: `skipTo` + `aplicaCorredorEMoldura`), blinda a nave, e **fere
com BALA REAL** — a lição da Fase 3: sonda que pula a balística não testa a luta.

| momento | o que ela cobra |
|---|---|
| aviso | chave de textura e dimensão das 3 folhas e da bala; **hitbox 34×20**; o corpo não fere; a bala atravessa sem tirar vida; barra escondida; **A e B em paredes opostas nos DOIS sorteios** (a sonda força cada um) |
| X | barra visível; o leque sai com 3 balas **em `x > 192`**; a bala é `shotGolfinho` 13×9; **o piso segura em 25** |
| duelo | **`elapsed` não passa de 49,5** por ~3s de jogo, **mas a moldura continua rolando**; nenhum prop, perigo ou inimigo novo; a rajada sai com 3 balas; a altura dele fica entre as paredes |
| morte | morto por bala real, a pausa solta; o evento de t=50 dispara; o placar ganha +500 |
| escapes | `G` no duelo → o golfinho some e a fase chega ao chefão; perder vida no duelo → ele continua |

E fora do navegador, na montagem da arte: **nenhum pixel da bala desenhada sobrevive à frente do
focinho** nos quadros de tiro.

### 7.2 A regressão — uma sonda por vez

- `npm run build` limpo.
- `probe-stage4` 22/22 com **`vaos:[110,110,110]`** intacto.
- `probe-f4-moldura` e `probe-f4-visual` — ⚠️ **as duas atravessam t=49,5 e ficariam presas no
  duelo.** Ganham um ajudante que mata o golfinho, e a `moldura` passa a medir a mesa depois de t=50.
- `probe-stage3` — o `miniboss` sem `kind` tem de continuar sendo a aranha.
- **ABRA A IMAGEM:** capturas no aviso, nas duas diagonais, no duelo e em t=50.

---

## 8. OS RISCOS

| risco | por que é real | como se descobre cedo |
|---|---|---|
| as sondas atuais presas no duelo | ninguém nelas sabe matar o golfinho | rodar as três logo depois de ligar a pausa, antes da arte |
| duas balas na tela | as animações trazem a bala desenhada | a verificação de pixels + a captura do X |
| a hitbox do quadro inteiro | a regra padrão tira a hitbox da textura | o assert de dimensão |
| evento fora de ordem | o cursor só anda para a frente | o guarda + "t=50 dispara em 50" |
| a fase longa demais | o duelo soma 10–20s | só o teste jogado; os knobs são a vida (50) e o piso (25) |

---

## 9. O AJUSTE DO TESTE JOGADO (11/09, o mesmo dia)

Ele jogou e aprovou o duelo — *"ficou legal, é algo diferente na fase"* — e pediu três coisas.

| pedido dele | o que mudou |
|---|---|
| *"na fase de cruzar em X, eu quero o movimento full de nadar, ele parece estar flutuando ou à deriva"* | o caminho vira ONDA (9px, 1,3Hz) perpendicular ao rumo; o corpo INCLINA para o rumo com a onda (suavizado); a cauda passa de 10 para 14fps; e a cambalhota **não para mais** — só freia a 35% |
| *"o X precisa cruzar e sair da visão da tela, voltar em outro ponto (causar susto)"* — e, na escolha, *"sempre de dentro da parede"* | a 1ª passagem sai pela esquerda; ele some por 0,8–1,4s (sorteado); **bolhas sobem da parede de A por 0,5s**; ele irrompe dali num x sorteado entre 280 e 340, cruza o corredor e MERGULHA na parede oposta |
| *"as rajadas são lentas e fáceis de desviar, pode alternar em velocidade: rajadas lentas e leque rápido, rajadas rápidas e leque lento"* | o duelo alterna estilo E velocidade, flip a flip: **rajada 115 → leque 200 → rajada 210 → leque 105** |

- ⚠️ **A rotação livre substitui a regra "só de 90 em 90" nas passagens.** A deriva era pior que o
  serrilhado, e o kamikaze já gira livre no jogo. O aviso continua em ±90°.
- ⚠️ **As bolhas são o telégrafo da volta**, e não enfeite: um bicho que fere surgindo do nada é
  punir o que o jogador não teve como ver. Na volta, o corpo só fere com o alfa ≥ 0,5.
- O leque do X continua a 110px/s e continua saindo na metade direita (a cambalhota da 1ª passagem
  começa em x=310; a da 2ª, a 20% do caminho de parede a parede, com o piso de x=280).

### 9.1 O 2º teste jogado (11/09): o aviso também sai da tela

*"O nado ficou bom"*, e um último pedido antes do push: *"ele vai nadar de A-B e quando chegar em B
sair da tela"*.

- A espera parada de 1,5s em B **morreu**. O aviso continua na mesma direção, passa por B e sai pela
  borda (de cima ou de baixo, conforme o sorteio), acelerando — em ~2,4s.
- Ele fica 0,8s fora da tela, e a 1ª passagem do X **entra de fora da tela, pela direita, na altura
  de B**: B continua marcando de que lado o ataque vem.

---

## 10. FORA DESTA SPEC

- **A câmara A continua sem motivo próprio.** Ela é a entrada que ensina a voar entre chão e teto; o
  que dá identidade a ela fica para outra conversa.
- **As 4 faixas continuam dele e sem aprovação**, e o M2 (a arte da câmara A) continua na fila.
- **Os números** (vida, piso, velocidades, tempos) são chute calibrado até o teste jogado.
