# START — FATIA 7 · A FASE 4: ONDE A PRÓXIMA SESSÃO PEGA

**🟢 A MOLDURA — DESIGN FECHADO E APROVADO (08/09/2026).**
**🟢 O M1 — O MOTOR — IMPLEMENTADO, VERIFICADO E JOGADO (09–10/09/2026).**
**🟢 O M1.5 — O DUTO E AS PORTAS — JOGADO E APROVADO (11/09/2026).**
**🟢 O GOLFINHO — O MINI-CHEFÃO DA CÂMARA B — FECHADO, JOGADO TRÊS VEZES E APROVADO (11–12/09/2026).**
**🟢 A LEITURA DA ABERTURA — mesas menores, destroços nas bordas, o coração enterrado — JOGADA E APROVADA (12/09/2026).**
**🟢 O MOTIVO DA CÂMARA A — RESPONDIDO POR ELE EM 12/09: ela NÃO tem motivo especial. Ver "⏭️".**
**🟠 A ÁGUA DA ARENA E AS 5 PEÇAS NOVAS (12/09, 2ª rodada) — FEITAS SOZINHO A PEDIDO DELE, E NÃO JOGADAS.**
Branch `feat/fase4-visual`, **em dia com o `origin`**.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md`. Enquanto eu estava fora você
> alagou a arena do golfinho e instalou 5 peças tiradas das minhas 64 candidaturas. Eu joguei. Meu
> veredicto: <DIGA AQUI>. Depois disso, o M2 — o motivo da câmara A já está respondido, então é
> passe de ARTE: a repetição da faixa, quem pinta as 4 faixas, e como a arte troca por câmara."**

---

## 🌊 A ÁGUA DA ARENA E AS PEÇAS NOVAS (12/09, 2ª rodada) — FEITO, NÃO JOGADO

**🟠 Ele pediu as duas coisas e saiu:** *"quero que faça sozinho, pois não estarei aqui para
escolher respostas ou fazer o brainstorming com você"*. **Nada aqui foi jogado ainda.**

### 1 · A CÂMARA B ALAGA

Pedido: *"na arena do golfinho, quero que coloque um filtro que pareça estarmos dentro da água...
ao entrar na zona do golfinho, para casar com a transição da imagem de fundo, tenha um pequeno
efeito para encher de água a tela e assim escondemos a transição das imagens de fundo"*.

Tudo em `src/systems/Agua.ts`. Um ciclo de seis estados, e ele é decoração PURA — nenhum corpo
físico, nenhuma colisão, nenhum efeito no voo:

| estado | o que acontece | knob |
|---|---|---|
| **enchendo** | a água sobe do rodapé com a superfície acesa de 2px correndo à frente; os CANOS despejam | `ENCHE_DUR` 2,6 · `ALPHA_SUBINDO` 0,34 · `CANOS` 3 · `GOTAS` 30 |
| **assentando** | o véu cede o repuxo e os canos fecham | `ASSENTA_DUR` 0,9 |
| **submerso** | véu leve com respiração, 3 feixes de luz aditivos derivando, 22 bolhas subindo com oscilação | `ALPHA_SUBMERSO` 0,24 · `BOLHAS` 22 · `FEIXES` 3 |
| **esvaziando** | morto o golfinho, drena | `ESVAZIA_DUR` 0,8 |

**Quem manda:** `spawnGolfinho` chama `encher()`; `encerrarGolfinho` chama `esvaziar()` — ou
`limpar()` (sem animação) quando é o `G` pulando para o chefão, pela mesma lógica do `reacende`.

### ⚠️ E ELA FOI REFEITA NO MESMO DIA, DEPOIS DO TESTE JOGADO

Veredicto dele sobre a 1ª versão: *"a água e o efeito da água ficaram ótimos. Mas achei o encher da
tela muito repentino e forçado... do jeito que está agora o efeito de encher a tela de água
casa/atrapalha com a chegada (aviso) do golfinho."* **Dois eventos grandes disputando os mesmos
dois segundos, e um comia o outro.**

A receita foi dele, e eu fiz as duas que ele ofereceu ao mesmo tempo:

| o que ele disse | o que virou |
|---|---|
| *"enchendo até ficar completamente cheio na hora do golfinho, mesmo que comece a encher antes do encontro"* | o enchimento saiu do nascimento do golfinho e virou **evento de roteiro em t=36** — quatro segundos antes do bicho. `ENCHE_DUR` foi de 0,62 para **2,6**, e o easing de `Sine.Out` para `Sine.InOut` (com 2,6s a saída rápida lia como barra de carregamento) |
| *"tela preta por milissegundos e já aparecer cheia de água, transição feita do fundo"* | o **`surto` morreu** — o pico opaco de alpha 0,96 existia só para tapar a troca de pintura. Com a água cheia antes, quem esconde o corte volta a ser o mergulho no escuro que o `setPintura` sempre soube fazer, com os 600ms de sempre |

**A ordem agora é dramaturgia, não simultaneidade:** t=36 alaga → t=38,6 a água topa → t=38,8 a
câmara troca atrás do escurecimento → t=39,5 assenta → **t=40 o bicho chega numa câmara parada**.

⚠️ **É ISSO QUE A `probe-f4-agua` COBRA, e nenhum outro lugar cobra:** que a pintura troque com a
água JÁ CHEIA, que o golfinho nasça com ela CHEIA E ASSENTADA, e que o pico do véu nunca passe de
0,5 (se passar, o `surto` voltou por engano). Mexer no `agua` de t=36, no `cenario` de t=38,8 ou
no `ENCHE_DUR` sem mexer nos outros quebra a ordem e fica vermelho ali.

### 🚰 OS CANOS — a água ganhou FONTE

Pedido dele, ainda na mesma rodada: *"se quiser implementar canos soltando a água, como um asset
visual diferente. Assim fica mais plausível"* — e *"temos de sobra créditos no PixelLab para isso"*.

Nível que sobe sozinho é exatamente o que um cenário não pode fazer. O Leviatã engoliu uma doca, e
doca tem encanamento. **3 canos** despejam enquanto a água sobe, com jato, 30 gotas em queda com
gravidade e um respingo no ponto em que o jato fura a superfície. Cheia a câmara, eles fecham.

| detalhe | porquê |
|---|---|
| **objeto `bc28cdf2`, 16 candidaturas, 20 gerações** | 3 escolhidas (c-00, c-08, c-13), variantes do `pickVariant` |
| ⚠️ **nasceram DEITADOS e entram DE PÉ** | o prompt pediu vista lateral de cano de parede e o gerador deu a boca para a DIREITA — certo para parede vertical, errado para uma fase que só tem teto e chão. Giro de 90°, que **em pixel art é exato** (não reamostra, só troca os eixos): flange em cima, boca embaixo |
| ⚠️ **escurecidos no `_assar-cano.mjs`, ao contrário das peças de parallax** | cano não é camada de parallax — quem o desenha é a `Agua`, que não tem `tint` de camada. Alvo: 2,2× a pintura, a mesma banda da passarela |
| ⚠️ **depth −0,5, e não 69 como o véu** | o cano é MUNDO, logo à frente da faixa da moldura (−0,6). É isso que faz a água **passar na frente dele** conforme sobe, em vez de ele boiar por cima da própria enchente |
| **rolam com o mundo** (`worldSpeed` entra no `update`) | cano parado enquanto o corredor anda lê como marca d'água da interface |

### 2 · AS PEÇAS QUE SAÍRAM DAS 64 CANDIDATURAS DELE

Pedido: *"veja quais assets daqueles 64 que criei podem funcionar na fase, melhorando o visual e
imersão"*.

⚠️ **ELAS FORAM REPROVADAS COMO FAIXA E APROVADAS COMO PROP — a pergunta mudou, e por isso a régua
mudou.** Faixa precisa sangrar nas três bordas com topo reto; medido de novo, nenhuma das 64 tem (o
sangramento lateral varia de 0% a 100% da altura, sem regra). Mas `create_1_direction_object` faz
bem exatamente o que a faixa não queria: RECORTAR um objeto do fundo. **Como prop, o recorte é a
virtude.**

| peça | de onde | o que é | camada |
|---|---|---|---|
| **`f4Passarela`** ×3 | A-01, A-05, A-13 | convés industrial com guarda-corpo e **lâmpada âmbar**, com as veias do bicho subindo por baixo | chão, depth −78, tint `0x6d788f`, escala 0.8–1.05, gap 300–520 |
| **`f4Ganglio`** ×2 | B-05, B-12 | núcleos nervosos **ACESOS**, esfumados em elipse irregular | teto, depth −87, tint `0x9aa2b8`, escala 0.55–0.85, gap 420–760 |
| **`f4Cano`** ×3 | objeto `bc28cdf2` (novo, 20 gerações) | o cano de despejo que ENCHE a câmara | desenhado pela `Agua`, não pelo Parallax — ver "🚰 OS CANOS" |

**Onde elas aparecem, medido** (`_ver-pecas.mjs`, amostrando t=0 a t=36 — a câmara A inteira):

| peça | % do tempo na tela | quantas por vez |
|---|---|---|
| `f4Passarela` | **98%** | 1–2 |
| `f4Ganglio` | **87%** | 0–1 |

⚠️ **Elas estão na tela desde o primeiro segundo da fase**, não só perto do golfinho — o parallax
pré-enche as camadas na montagem. A passarela é praticamente contínua; o gânglio pisca com folga,
que é o que se quer de um ponto de luz raro.

**A passarela é o que faltava para a câmara A dizer o que ela é.** A fase abre na "doca engolida",
mas até aqui nada na tela dizia DOCA — costela, órgão e maquinário são todos do bicho, então o
lugar lia como víscera desde o primeiro segundo. Ela é a metade humana da frase.

⚠️ **E O VALOR NÃO FOI CORRIGIDO, DE PROPÓSITO.** Medido contra a pintura (16,4): a decoração que
já estava no jogo entra CRUA a 2,2×–4,6× e quem a empurra para o fundo é o TINT da camada (costela
4,59× com `0x4a3e48`). As escolhidas caem na mesma banda (A-01 a 2,20×, B-05 a 4,16×), então elas
obedecem ao sistema que já existe em vez de inventar um segundo.

**O que NÃO entrou, e por quê:** os objetos **C** (carne muscular vermelha) e **D** (fibras de
tendão, quase preto) são textura de QUADRO CHEIO sem silhueta nenhuma — 0,68 a 0,85 de
preenchimento, sem borda. Eles são exatamente o que são: material de FAIXA. ⚠️ **E faixa é peça
dele** (ver a divisão das 14 peças), então não toquei.

### ⚠️ AS LEIS DESTA RODADA

| lei | onde doeu |
|---|---|
| ⚠️ **DOIS EVENTOS GRANDES NÃO CABEM NOS MESMOS DOIS SEGUNDOS.** Cada um estava certo sozinho; juntos, um comia o outro | o enchimento e o aviso do golfinho. O conserto não foi enfraquecer nenhum dos dois — foi **afastá-los no tempo** |
| ⚠️ **EASING É FUNÇÃO DA DURAÇÃO, não do gosto.** `Sine.Out` estava certo em 0,62s e errado em 2,6s: a água disparava e depois rastejava, lendo como barra de carregamento | virou `Sine.InOut`, e é a entrada suave que tira o "repentino" que ele apontou |
| ⚠️ **RESOLVER O PROBLEMA CERTO APOSENTA CÓDIGO.** O `surto` era um pico opaco de 0,96 inventado para tapar a troca de pintura, com a janela medida a 0,45s | com o enchimento adiantado ele **perdeu a função e morreu inteiro**, e a troca voltou ao mergulho no escuro que o `setPintura` já fazia. A 1ª versão estava resolvendo um problema que a montagem não precisava ter |
| ⚠️ **EFEITO SEM FONTE NÃO CONVENCE, por melhor que esteja.** Ele aprovou a água e no mesmo fôlego pediu os canos | *"assim fica mais plausível"*. O que faltava não era qualidade do efeito, era CAUSA |
| ⚠️ **A ÁGUA ANDA COM `dt` CRU, NUNCA COM O RELÓGIO DA FASE.** A arena SEGURA o relógio em t=49,5 | amarrá-la ao `elapsed` congelaria a água no meio do surto — **com a tela opaca** — pelo duelo inteiro |
| ⚠️ **PEÇA DE CENÁRIO TEM DE DIZER O QUE A PINTURA NÃO DIZ.** O critério não é "combina com a câmara" — combinar demais é como se desenha papel de parede | a 1ª escolha para a câmara B foram os anéis de cartilagem (B-06, B-14). O mock contra a pintura matou: **a pintura da câmara B JÁ É uma caixa torácica.** A peça repetia o que já estava lá e só somava massa escura |
| ⚠️ **O TINT NÃO PODE APAGAR A LUZ DA PEÇA.** Tint de força de costela (0x4a3e48) mataria a lâmpada âmbar e a brasa do gânglio — que são o motivo de as duas existirem | as duas levam tint claro; quem as segura no fundo é o ALPHA e a raridade do `gap` |
| ⚠️ **A MESMA CANDIDATURA É REPROVADA OU APROVADA CONFORME A PERGUNTA.** "Não sangra nas bordas" reprova uma faixa e **descreve** um prop | as 64 estavam paradas em review desde 08/09 por uma régua que não era a delas |

### 👀 O QUE VER NO TESTE JOGADO

1. **O surto tapa mesmo?** Se pintar de azul demais, é `ALPHA_PICO`; se a pintura velha vazar, é
   `SURTO_SEGURA` para cima (e o `cenario` de 40,95 junto).
2. **O submerso deixa jogar?** O véu está em 0,24. Se atrapalhar a leitura do leque e da rajada, é
   `ALPHA_SUBMERSO` para baixo.
3. **As bolhas e os feixes** — 22 e 3. É o que vende "submerso"; se ler como sujeira, os dois números.
4. **A drenagem em 0,8s** casa com a volta da fase em t=50?
5. **A lâmpada âmbar da passarela** pode ser confundida com pickup? Ela é de fundo (depth −78), mas
   é a única coisa acesa nova ao alcance do olho.
6. **O corte lateral do corrimão** — a passarela é cortada nas laterais. Lê como "continua no
   escuro" ou lê como PNG cortado?

### AS FERRAMENTAS NOVAS

| script | o que responde |
|---|---|
| `_ver-agua.mjs` | o ciclo da água quadro a quadro, do enchimento à drenagem |
| `_baixar-cand.mjs` | baixa as 16 candidaturas de cada um dos 4 objetos dele |
| `_medir-cand.mjs` | **de uma candidatura:** tem silhueta? sangra? quão clara contra a pintura? |
| `_folha-cand.mjs` | as 64 em 4×, **sobre a pintura da câmara** — candidatura bonita em fundo claro é armadilha |
| `_assar-cand.mjs` | apara e esfuma as escolhidas em peças de jogo |
| `_mock-pecas.mjs` | a peça no enquadramento real **com o tint da camada aplicado** — foi ele que matou o anel |

---

## 🆕 O QUE A SESSÃO DE 12/09 FEZ

**Tudo nesta seção foi JOGADO e APROVADO por ele:** *"Joguei e ficou bom assim."*

1. **O GOLFINHO FECHOU.** O último ajuste (o aviso passando por B e saindo da tela) foi jogado:
   *"em relação ao golfinho, ficou muito bom. ele sai da tela como pedi, as skills dele estão
   ótimas."* ⚠️ **Ele não tem mais nada pendente** — os quatro itens de "o que ver no próximo teste"
   da sessão anterior estão respondidos ou vencidos. As bolhas provisórias **ficam como estão**.
2. **O MOTIVO DA CÂMARA A — RESPONDIDO, e a resposta é "não tem".** Palavras dele: *"A entrada é o
   início da fase como todas as outras, nada de especial, apenas atirar, desviar e não morrer. A
   interação do golfinho já traz essa novidade."* ⚠️ **Isto ENCERRA a §10 da spec do golfinho**, que
   deixava a pergunta em aberto de propósito. A câmara A não ganha habitante nem evento próprio.
3. **Três ajustes de LEITURA, todos pedidos com um print na mão.** Eles não mudam design nenhum —
   mudam o que dá para enxergar enquanto se joga.

### O que mudou no código

| pedido dele | o que foi feito | onde |
|---|---|---|
| *"diminua o tamanho das mesas no início da fase 4 — diminuir elas quer dizer aumentar o espaço de navegação da nave; deixe para as mesas crescerem a partir do golfinho"* | os três vãos antes do golfinho subiram **+16** (110→**126**, 96→**112**, 104→**120**), com o ritmo interno intacto. A maior mesa isolada da abertura cai de **62px para 46px**. De t=50 em diante, nada mudou | `STAGE_4` |
| *"alguns destroços estão atrapalhando muito a visão da fase"* + *"os destroços podem ser movidos para perto da borda, mas não no meio da fase"* | o destroço de primeiro plano saiu de `faixa: [30, 186]` para `faixas: [[6,28],[188,210]]` — duas bandas de borda, uma sorteada por sprite | `Parallax.buildInterior` |
| *"o coração com os cabos flutuando no ar, fica feio e dá aspecto de não polido"* + *"tentar deixar suas extremidades encostadas na parede de cima ou de baixo, para tapar aqueles cabos suspensos"* | o `orgao` passou de `baseY 236 / escala 0.9–1.3` para `baseY GROUND_Y / escala 1.62–1.85`: topo enterrado 11px na faixa do teto, base 16px atrás da do chão | `Parallax.buildInterior` |

**O campo novo no `ScatterLayer`: `faixas`** (plural). É uma LISTA de bandas, e o sprite sorteia
uma. ⚠️ A `faixa` velha não servia porque ela é um intervalo **contínuo** — e "perto de cima OU
perto de baixo" é exatamente o que um intervalo contínuo não sabe dizer sem passar pelo meio.

### Os números que são invariante, não gosto

- **O destroço de primeiro plano nunca toca o TERÇO CENTRAL (72–144).** Com meia-altura máxima de
  44px (46 × 1,9 ÷ 2), um centro em 28 põe a base em 72 e um centro em 188 põe o topo em 144.
- **O topo do coração fica sempre ENTERRADO** na faixa do teto (superfície em `TETO_Y + 16` = 26 na
  abertura). Em 1,62: `206 − 118 × 1,62 = 14,8`, 11px dentro. **Baixar de 1.62 devolve os cabos ao ar.**
- Os dois viraram assert na `probe-f4-visual`, amostrados em **24 quadros** — as duas camadas
  sorteiam altura A CADA sprite, então um quadro que passe não prova nada sobre o próximo.

### ⚠️ AS LEIS QUE ESTA SESSÃO PAGOU

| lei | onde doeu |
|---|---|
| ⚠️ **O VÃO É O ÚNICO KNOB DA MESA** — ela nasce da borda até a borda do vão, então +16 de vão é −16 de mesa somados chão e teto | não existe "tamanho da mesa" para mexer: quem pediu mesa menor pediu vão maior |
| ⚠️ **E O PREÇO DO VÃO MAIOR É A ONDULAÇÃO, e é aritmética:** o centro anda em `148 − gap` px | em 110 o corredor tinha 38px de sobe-e-desce; em 126 tem 22. Se a abertura ficar RETA demais, o knob é a `Moldura.MARGEM` (24) para baixo, **não** o vão de volta |
| ⚠️ **ANCORAR MAIS FUNDO ENGORDA A PEÇA.** A peça cresce para cima, então o topo é `base − altura × escala`: quanto mais fundo a base, MAIOR a escala para alcançar o teto — e escala é largura | a 1ª tentativa do coração manteve a base em 236, exigiu escala 1,85 e saiu com **263px de largura**, dois terços da tela. Subir a base para `GROUND_Y` deu a mesma cobertura em 1,62 e **196px** |
| ⚠️ **ENTERRA-SE A PONTA, NÃO SE APAGA O CABO.** A faixa da moldura é desenhada em depth −0,6 contra os −88 da decoração: tudo o que passa da superfície some atrás dela | os cabos fazem parte do `orgao.png` — não havia o que remover, só onde esconder |
| ⚠️ **ASSERT VERDE NÃO JULGA COMPOSIÇÃO — DE NOVO.** O coração de 263px passava em TODAS as sondas, invariantes novas incluídas | quem pegou foi a captura. É a quarta vez que esta lei cobra nesta fatia |
| **O que a conta NÃO resolve: os tubos LATERAIS do coração.** A arte é radial, e só sumiria de lado uma peça mais larga que a tela (escala ≥ 3,2 — uma parede, não uma peça) | cima e baixo é o que dava para enterrar, e é o que ele pediu |

### A ferramenta nova

`scripts/_f4/_ver-abertura.mjs` — captura t=7, t=20 e t=33 da abertura e imprime a caixa de cada
peça (topo, base, largura). ⚠️ **Foi ela que pegou o coração de 263px**, numa versão que passava em
todos os asserts. Uso: `npm run dev` noutro terminal, depois
`node scripts/_f4/_ver-abertura.mjs scripts/_f4/_abertura.png`.

---

## 📚 REGISTRO — O QUE A SESSÃO DE 11/09 FEZ, EM ORDEM

1. **O M1.5 foi APROVADO jogando:** *"o duto com as portas ficou muito legal"* e *"a sequência de
   moldura se fechando no duto e abrindo no boss ficou como pedi"*. A mordida, o HP das portas
   (6/8/10), os 38s de duto e o fio **ficam como estão**.
2. **A pergunta dele que abriu a frente nova:** *"quero que tenha um porquê de mudar o fundo"*.
   Medido: das três trocas de pintura, a de **t=40 não tinha motivo nenhum** (mesmos inimigos, mesmas
   minas, e um banner anunciando o duto 26s antes). E **nenhum inimigo da F4 morava no Leviatã**.
3. **A resposta foi o golfinho biomecânico** que ele já tinha criado no PixelLab
   (`f37ab55c-be70-49da-8ed5-3bd5e168da31`) — um mini-chefão com arena própria. Brainstorm em quatro
   partes, todas aprovadas por ele.
   **Spec:** `docs/superpowers/specs/2026-09-11-fatia7-golfinho-miniboss-design.md` (§9 e §9.1 são
   os dois ajustes jogados). **Plano:** `docs/superpowers/plans/2026-09-11-fatia7-golfinho.md`.
4. **A arte saiu da PixMiniMax** (10 gerações): nado `39d99a12`, flip + tiro `279cc362` (*"ficou
   perfeito"*), cambalhota v1 `3d081f67`. A v2 da cambalhota (`ff2a4a3b`, com um LASER) ficou de
   reserva, fora do jogo. A bala desenhada nas animações foi APAGADA por
   `scripts/_f4/_golfinho-sheets.mjs`; a bala do jogo é o tiro do flip, reduzido a 13×9.
5. **1º teste jogado:** *"O duelo ficou legal, é algo diferente na fase."* Mas o X *"parece estar
   flutuando ou à deriva"*, não saía da tela, e *"as rajadas são lentas e fáceis de desviar"*.
   Ajustado (spec §9).
6. **2º teste jogado:** *"o nado ficou bom"*. Último pedido antes do push: o aviso passa por B e sai
   da tela (spec §9.1). **Esse ajuste não foi jogado.**

---

## 🐬 O GOLFINHO COMO ESTÁ NO JOGO

Tudo em `src/entities/Golfinho.ts`. Evento no roteiro: `{ t: 40, type: 'miniboss', kind: 'golfinho', seguraEm: 49.5 }`.

| momento | o que acontece | knobs |
|---|---|---|
| **aviso** | nada de A até B em paredes OPOSTAS (sorteio por partida), passa por B e sai pela borda. Intocável, sem colisão | `AVISO_DUR` 2,4 · `ESPERA_DUR` 0,8 (fora da tela) |
| **X, 1ª passagem** | entra pela direita na altura de B, nada em ONDA com o corpo inclinado, cambalhota + leque de 3 sem parar, sai pela esquerda. Barra aparece; vida não desce de 25 | `VEL_X` 190 · `ONDA_AMPLITUDE` 9 · `ONDA_HZ` 1,3 · `GIRO_FREIO` 0,35 · `X_CAMBALHOTA` 310 |
| **X, a volta** | some por um tempo sorteado; **bolhas sobem da parede de A**; ele irrompe num x sorteado, cruza o corredor com cambalhota + leque e mergulha na parede oposta | `INTERVALO_MIN/MAX` 0,8–1,4 · `EMERGIR_DUR` 0,5 · `EMERGE_X_MIN/MAX` 280–340 |
| **duelo** | pela direita, de frente, até morrer: flip a flip, **rajada lenta → leque rápido → rajada rápida → leque lento** | `DUELO_SEQUENCIA` (115/200/210/105) · `HP` 50 · `PISO` 25 |
| **a arena** | o relógio da fase não passa de t=49,5 enquanto ele vive; nada nasce; o primeiro plano sai de cena e volta quando ele morre | `seguraEm` no `STAGE_4` |
| **a morte** | explosão grande, +500, sem hitstop; a fase segue com "A GARGANTA APERTA" em t=50 | `Golfinho.SCORE` |

Para jogar: `npm run dev` → `http://localhost:5173/` → tecla **`L`** → ~40s de fase.

---

## 📚 REGISTRO — O QUE SE PEDIA PARA OLHAR NO GOLFINHO (tudo respondido em 12/09)

Ele jogou e fechou: *"ficou muito bom. ele sai da tela como pedi, as skills dele estão ótimas."*

1. ~~O aviso saindo da tela~~ — **aprovado.** `AVISO_DUR` 2,4 e `ESPERA_DUR` 0,8 ficam.
2. ~~As bolhas provisórias~~ — **ficam como estão.** Não incomodaram; a sheet de bolha própria
   deixa de ser trabalho pendente.
3. ~~A volta quase vertical~~ — **aprovada.** `EMERGE_DESLOCA_X` fica em 120.
4. ~~Golfinho escuro sobre decoração escura~~ — **não foi levantado.** ⚠️ E a decoração mudou desde
   então (o destroço foi para as bordas), o que só ajuda esta leitura.
5. **O tempo da fase**: o roteiro tem 113s; o real cresce o que o duelo durar. Segue valendo.

---

## ⚠️ AS LEIS QUE A SESSÃO DE 11/09 PAGOU

| lei | onde doeu |
|---|---|
| ⚠️ **ABRA A IMAGEM, de novo.** Dois defeitos do golfinho só apareceram em captura, com a sonda verde | a viga do primeiro plano passando na frente do leque e da rajada; e a 1ª versão das bolhas, que não aparecia |
| ⚠️ **Pausa de arena é "não passa de", nunca "para quando o estado X começa"** | o X não tem duração exata; esperar o duelo deixaria o corredor de t=50 nascer dentro da arena |
| ⚠️ **Toda sonda que atravessa t=40–50 tem de matar o golfinho** (`s.matarGolfinho()`) | a `probe-f4-visual` e a `probe-f4-moldura` ficariam presas em 49,5 |
| ⚠️ **Um `rate: 0` congela o cronômetro do corredor no meio da contagem** | ao voltar em t=50, o primeiro par chega em t≈51,x; a sonda da mesa achou um par só em t=54 |
| ⚠️ **Animação interrompida não dispara `animationcomplete`** — estado que depende dele tem de ser zerado à mão | o `girando` preso deixaria o duelo sem nenhum flip |
| ⚠️ **Hitbox de sprite com quadro folgado é fixada à mão, com assert de dimensão** | o golfinho ocupa 42×30 de um quadro 80×80; a regra padrão mataria 38px de vazio |
| **PixMiniMax: 2 gerações por clipe em 80×80; o loop não fecha sozinho; "muzzle flash" vira bala** | ver a memória `pixminimax-animacao` |

---

## ⏭️ A PRÓXIMA AÇÃO: O M2 — A CÂMARA A

✅ **A PRIMEIRA PERGUNTA JÁ ESTÁ RESPONDIDA, e a resposta poupa trabalho.** Em 12/09, sobre o motivo
da câmara A: *"A entrada é o início da fase como todas as outras, nada de especial, apenas atirar,
desviar e não morrer. A interação do golfinho já traz essa novidade."*

⚠️ **NÃO PROPONHA HABITANTE, EVENTO NEM MECÂNICA PARA A CÂMARA A.** A pergunta do "porquê de mudar o
fundo" valia para a troca do MEIO da fase (t=40), que não tinha motivo nenhum — não para a abertura,
que é onde o jogador aprende a regra. Uma fase precisa de um lugar comum antes de ter um incomum.
Isto ENCERRA a §10 da spec do golfinho. **O M2 é passe de ARTE, e só.**

Restam as TRÊS decisões que já estavam abertas (seção "📌 EM ABERTO PARA O M2" abaixo), e é por elas
que a sessão começa: a **repetição da faixa**, **quem pinta as 4 faixas** (dele, ainda sem aprovação),
e **como a arte troca por câmara** (`setTexture` no spawn ou `PropKind` separados).

⚠️ **E a geometria da câmara A mudou em 12/09** — os vãos da abertura são 126/112/120, não
110/96/104. Quem for medir a peça de arte contra o corredor mede contra os números NOVOS.

**PixelLab:** **4.668** de 5.000 gerações, ciclo virando em 2026-10-04. ⚠️ Confira o saldo no arranque.

---

## 📚 REGISTRO DO M1.5 — O QUE SE PEDIA PARA OLHAR (jogado e aprovado em 11/09)

1. **A fase agora tem 113 segundos** (era 86). O duto passou de 11s para 38s. Se ele achar a fase
   longa demais, o corte é nas ondas entre as portas, **nunca nas portas** — elas são o motivo de o
   duto existir.
2. **A parede do duto COLA no corredor.** A banda aberta é exatamente `vão + 8 + 8` (medido: 100px
   para vão 84). Antes eram 127px, com a parede do teto em 16,6px de média. Se ele disser que o
   duto voltou a ficar largo, é este bloco que quebrou — a sonda tem assert para ele.
3. **As três portas** (t=72, 82, 94 · HP 6, 8, 10 · vãos 84, 76, 68). Arte provisória, com núcleo
   aceso. A pergunta é se o HP está calibrado: a PULSE entrega 7 de dano/s e a porta chega em ~3,5s.
4. **O fundo do chefão NÃO está ampliado** — foi medido de três formas (§5 da spec do duto). O que
   cresceu foi a abertura: 108px → 184px de pintura visível. Se ainda incomodar, o número é a
   espessura do chefão (hoje 16), não a pintura.
5. **O primeiro plano some ao entrar no duto.** A viga tinha 84px opacos contra um canal de 100px.

---

## 📚 REGISTRO DO M1.5 — AS PERGUNTAS DO TESTE (respondidas em 11/09: tudo fica como está)

**O M1.5 FOI JOGADO E APROVADO.** Na época as três sondas estavam verdes e a linha de base sobreviveu, mas quatro perguntas
só o controle na mão responde:

1. **A parede do duto está justa ou está roubando?** Ela MORDE de t=68 a t=106, com 3px de perdão no
   raspão e 1400ms de i-frames. O knob é `Moldura.MORDIDA`.
2. **O HP das portas está certo?** 6, 8, 10. Se ele passar por todas sem esforço, sobe; se perder
   vida em todas, desce. O knob é o `hp` de cada evento `porta` no `STAGE_4`.
3. **38 segundos de duto é demais?** O knob é o espaçamento entre as portas.
4. **O fio avisa a tempo?** Ele acende no mesmo instante em que a parede passa a cobrar. Se avisar
   tarde demais, o conserto é o roteiro **acender antes de morder** — não mexer na mordida.

⚠️ **Continua valendo: não gere arte nenhuma antes disso.** A geometria ainda é barata de desfazer;
depois do M3, com 8 peças de arte em cima dela, não é.

---

## 🆕 O QUE MUDOU EM 10/09 — o ajuste do teste jogado

Veredicto dele sobre o M1: *"as bordas ficaram boas"*, *"gostei da sua adição do hitbox na margem,
ficou mais desafiador jogar"*. **A curva contínua NÃO estragou a dificuldade — `PASSO_MAX` fica em
14.** O que ele pediu por cima disso:

| pedido dele | o que foi feito |
|---|---|
| *"que elas sejam como bordas mesmo, margeando a fase"* | espessura **16 até t=55**, e o aperto do miolo passa a vir só do VÃO |
| *"só ficando mais para dentro na fase do duto"* | 32 (t=55) → 44 (t=63,5) → **54 no duto** |
| *"e abrindo no boss final"* | **16 em t=79**: a rampa de 8px/s abre em 4,75s e o chefão luta numa arena emoldurada |
| *"o desafio extra de sair do duto com vida"* | a parede **MORDE** de t=68 a t=79 |
| *"alguns se repetem em outros tamanhos"* | costela 3→2 camadas, escalas separadas, viga de primeiro plano a 1.6–1.9 |
| *"coração pequeno jogado no ar"* | o `orgao` deixou de flutuar e foi **ancorado no chão**, escala 0.9–1.3 |

**A spec:** `docs/superpowers/specs/2026-09-10-fatia7-moldura-borda-letal-design.md`.

### ⚠️ AS DUAS LEIS QUE ESTE AJUSTE PAGOU PARA APRENDER

**1. O ROTEIRO TEM DE ESTAR EM ORDEM CRESCENTE DE `t`.** `StageDirector.update` caminha com um
cursor monotônico: um evento fora de ordem dispara no `t` do VIZINHO ANTERIOR, não no dele. O
`{ t: 55, moldura 32 }` foi inserido depois de um `{ t: 58, wave }` e a parede só engrossava em
t=58. ⚠️ **A sonda passou verde** — ela amostrava em t=60 e a rampa de 2s terminava justo a tempo.
Quem pegou foi uma **captura de tela em t=58**. Agora há um guard no construtor do `StageDirector`
que lança na carga da fase, e ele vale para as quatro fases.

**2. `setTint` NÃO SERVE DE TELÉGRAFO NUMA FASE ESCURA.** Tint no Phaser é multiplicativo, e a
faixa é quase preta na banda que importa: medido, o delta de luminância entre inerte e letal deu
**−1,5**. Não era defeito da arte provisória — o rumo da fase é *luz só onde há energia*, então a
arte final também será escura. A saída foi luz ADITIVA por cima: um fio de 2px na superfície,
`0xffb478`, medido em **+16,2 de luminância e +37,1 no pico**. ⚠️ **Quem quiser anunciar qualquer
coisa nesta fase: desenhe luz, não multiplique cor.**

**E a regra que resume as duas, de novo: ABRA A IMAGEM.** As duas foram pegas por captura, nenhuma
por assert.

### ⚠️ E AS DUAS DA 2ª RODADA (o duto)

**3. A TRAVA DOS 8px NÃO ERA UM PISO DA PAREDE, ERA UM TETO DELA.** O `max`/`min` contra a
espessura só sabe AFASTAR a superfície do corredor. Medido: o roteiro pedia 54 e a parede do teto
saía com **16,6px de média**, com **127px de banda aberta para um corredor de 84**. Os 43px
sobrando não eram nem corredor nem parede — e era isso, não a espessura ser pequena, que fazia o
duto ler como "passagem estreita". ⚠️ **No duto quem manda na parede é o CORREDOR, não a espessura.**

**4. UM DIFF ENTRE DOIS QUADROS DE UM JOGO QUE ROLA MEDE O TEMPO PASSANDO, NÃO O QUE SE PEDIU.** Ao
investigar se as nebulosas apareciam, pausei `physics.world` e o diff deu **71%**. O parallax rola
pelo `update` da CENA, não pela física: com `scene.pause()` o número é **0,00%**. Eu quase reportei
um defeito que não existia. ⚠️ **Pausar a física não pausa o mundo.**

---

## 📖 O QUE ACONTECEU NESTA SESSÃO, EM ORDEM

1. **A sessão abriu para instalar a "lamina larga"** (Task 4 do Bloco A). 12 gerações, e a régua
   provou que nenhuma servia: alargar a base alarga a textura, a hitbox vai junto e a ponta
   continua fina. A melhor delas matava **46px no vazio**.
2. **Ele parou tudo:** *"sinto que são assets jogados na cena"*, e pediu impacto de shmup AAA na
   última fase.
3. **Brainstorm.** Ele apontou quatro coisas: qualidade dos assets, **posicionamento sem nexo**,
   estilo, e vontade de tentar cenário "vivo". Escolheu composição **mista** (momentos autorados +
   miolo com gramática).
4. **Achei a causa raiz no código** — não é impressão, é `GameScene.ts:859`: cada par de colunas
   sorteia um `vaoY` NOVO, então duas colunas seguidas não têm relação nenhuma.
5. **Ele propôs a moldura:** *"talvez colocar uma moldura em volta, como se fossem paredes?"*
6. **Pesquisa de montagem de cenário** (Metal Slug, composição, legibilidade de shmup) → as
   fontes estão na spec, seção 3.
7. **Mock procedural** em 4 faixas sobre a `bg-a`. Veredicto dele: *"o 2 ficou muito bom, trouxe
   preenchimento. E a número 4 é exatamente o que eu pretendo na hora do duto."*
8. **Spec escrita, revisada e commitada** (`15794c0`).
9. **Divisão de trabalho decidida por ele:** as 4 faixas são dele; as 10 restantes, minhas.
10. **Ele gerou as 4 faixas no PixelLab** — e a régua reprovou as 64 candidatas por ferramenta
    errada. Regerei as 4 como imagem cheia: passaram na estrutura, falharam no valor.
11. **A lei do valor virou número** e foi corrigida na spec (`f40c90a`).

---

## ✅ O DESIGN, EM CINCO LINHAS

- O chão e o teto viram uma **faixa contínua** desenhada, rolando com o mundo.
- O obstáculo deixa de ser prop sorteado e vira **a parede avançando** — uma **mesa de topo chato**.
- ⚠️ **A faixa é DECORAÇÃO, sem colisão.** Quem colide é a mesa, com a mesma `alturaPx` de hoje.
  Por isso a linha de base `[110,110,110]` sobrevive e **nenhuma física nova entra**.
- A **espessura** da faixa cresce ao longo da fase (16 → cheia): as paredes fecham em você.
- Cada uma das **quatro câmaras** tem seu jogo de peças, trocado pelo evento `cenario` que já
  existe (t=40 / 68 / 82).

**A spec inteira:** `docs/superpowers/specs/2026-09-08-fatia7-moldura-fase4-design.md`.

---

## 🔴 AS DUAS DECISÕES ABERTAS — ELE PRECISA RESPONDER

### 1. A REPETIÇÃO DA FAIXA

384 ÷ 128 = **3 cópias idênticas na tela ao mesmo tempo**, e o olho pega. A `B` e a `C` são as
piores (o motivo lê como papel de parede). No jogo a repetição vira temporal, mas o mesmo desenho
volta a cada **1,5s**.

| saída | custo |
|---|---|
| **duas variantes por câmara**, alternadas | dobra a arte dele; mata a repetição |
| **uma variante mais neutra** — menos motivo, mais textura | repete igual, mas não se denuncia |

### 2. QUEM PINTA AS FAIXAS, DE FATO

Ele quis as 4 faixas para si. As quatro geradas estão no disco, com valor corrigido, prontas para
ele pintar por cima — **mas nenhuma foi aprovada por ele ainda**.

---

## 🗂️ A DIVISÃO DAS 14 PEÇAS — decidida por ele em 08/09

**Critério:** não é difícil × fácil. É **o que uma máquina consegue acertar**. Máquina acerta
restrição mecânica (topo chato, 6 quadros, silhueta); não acerta mão.

**DELE — 4 peças:** `f4FaixaA` (128×64), `f4FaixaB` (128×64), `f4FaixaC` (128×80),
`f4FaixaD` (128×64). São a moldura inteira, ficam 100% do tempo na tela e têm de ser da mesma mão
dos quatro fundos.

**MINHAS — 10 peças:** `f4MesaA1/A2/B1/B2` (a régua reprova sozinha o que mentir na hitbox),
`f4VivoA/B/C` (32×32 a 48×48, animadas), `f4PortaC` + destruída, `f4Veu1/Veu2`.

---

## ⚠️ AS LEIS QUE ESTA SESSÃO DESCOBRIU OU CORRIGIU

| lei | onde doeu |
|---|---|
| ⚠️ **"Bem grande" tem de ser largo NA PONTA, não na base** — a hitbox é retângulo de altura cheia com 60% da largura da TEXTURA, e é na ponta que o jogador passa | a lamina alargada: 103px de textura, 10px de desenho no topo, **46px de morte invisível** |
| ⚠️ **Mais contraste ≠ mais claro.** A média da faixa fica em **1,3×** a da pintura; quem sobe é o contraste INTERNO | as 4 faixas nasceram de **1,55× a 4,06×** mais claras que os próprios fundos |
| ⚠️ **`create_1_direction_object` é a ferramenta ERRADA para parede** — ela recorta um objeto do fundo, e parede precisa do oposto. Parede é **imagem cheia** (`no_background: false`) | das 64 candidatas geradas por ele, **nenhuma** encostava nas três bordas |
| ⚠️ **Objeto custa ~25 gerações; imagem cheia custa 1** — porque objeto devolve 16 candidatas | 99 gerações nas 4 dele contra 4 nas 4 minhas |
| ⚠️ **O gerador puxa para o AZUL-FRIO** com "dark sci-fi / alien hull" no prompt, e azul na F4 é corpo estranho | as 6 primeiras laminas; o prompt precisa de `bone white / rust orange / NO blue` |
| **"Sem nexo" era um fato do código, não uma impressão** | `GameScene.ts:859` — `vaoY` sorteado por par |

---

## 🧰 O FERRAMENTAL NOVO — tudo versionado em `scripts/_f4/`

| script | o que responde |
|---|---|
| `_medir-colunas.mjs` | **de uma MESA:** onde esta arte mata sem desenhar? Imprime sempre os 3 props de hoje como referência |
| `_medir-faixas.mjs` | **de uma FAIXA:** sangra nas três bordas? topo reto? quanto a emenda aparece? |
| `_valor-faixa.mjs` | reaplica o acerto de valor de uma faixa contra a pintura da câmara |
| `_folha-faixas.mjs` | as 4 faixas no enquadramento real, cru contra corrigido |
| `_mock-moldura.mjs` | o mock procedural que ele aprovou — **e a fonte da arte provisória do M1** |
| `_ver-abertura.mjs` | **da ABERTURA JOGANDO:** o que a decoração está tapando? Captura t=7/20/33 e imprime a caixa de cada peça. Foi ela que pegou o coração de 263px que passava em todos os asserts |
| `_folha-lamina.mjs` | a folha mista (da Task 4 morta; a geometria dela ainda serve) |

⚠️ **`scripts/_f4/*.png` é IGNORADO pelo git** (`.gitignore:40`). Os PNG existem **só neste
disco** — um `git clean` apaga e não há de onde restaurar. Os `.mjs` estão versionados.

**Os arquivos que importam no disco:**
`_faixa-{A,B,C,D}.png` (cru) e **`_faixa-{A,B,C,D}-v.png` (valor corrigido — é daqui que vale
pintar por cima)**. Mais `_folha-faixas.png`, `_mock-moldura.png`, `_folha-lamina.png` e o
material morto da Task 4 (`_col-1..10`, `_lam-A..K`).

---

## 🚫 A "LIMPEZA DO PIXELLAB" — NÃO EXISTE. NÃO PROPONHA DE NOVO.

⚠️ **ESTA SEÇÃO ERA UMA PROPOSTA DE LIMPEZA E VIROU O CONTRÁRIO EM 12/09.** Ela dizia que 4
objetos presos em `review:awaiting-selection` "seguram slot e poluem a listagem", e sugeria
`dismiss_review` nos quatro. Estava errada em três coisas, e as três foram conferidas na API:

1. **NÃO SÃO 4 OBJETOS EM REVIEW. SÃO 167**, de 906 no total. O doc só rastreava os 4 porque foram
   os únicos que uma sessão parou para julgar.
2. **OS OUTROS 163 NÃO SÃO ENTULHO — SÃO A BIBLIOTECA DELE.** Palavras dele: *"eu tinha criado
   vários assets novos para colocarmos na fase 4, como melhoria e enriquecimento de cenário... mas
   isso vamos ver após fechar as pendências de arte e gameplay."* ⚠️ **A fila de review é onde ele
   guarda o que ainda não instalou.** Um `dismiss_review` em massa apagaria trabalho dele, e é
   IRREVERSÍVEL — `dismiss_review` descarta o objeto e apaga todas as candidatas.
3. **DESCARTAR NÃO DEVOLVE GERAÇÃO NENHUMA.** As ~99 gastas nas 4 faixas foram embora em 08/09. O
   ganho da "limpeza" era zero; o risco, o trabalho dele.

**A decisão de 12/09: não se descarta nada, nem as 4 faixas.** Elas continuam reprovadas por
estrutura (ver a lei da ferramenta errada), mas guardar não custa e descartar não rende. Ficam:

⚠️ **E NA 2ª RODADA DE 12/09 ELAS DEIXARAM DE SER PESO MORTO.** Cinco peças do jogo saíram desses
mesmos quatro objetos — `f4Passarela` ×3 (do A) e `f4Ganglio` ×2 (do B). **A mesma candidatura é
reprovada ou aprovada conforme a pergunta:** "não sangra nas bordas" reprova uma FAIXA e *descreve*
um PROP. Mais um motivo para nunca descartar por arrumação.

| câmara | object_id (reprovadas por estrutura — GUARDADAS, não descartar) |
|---|---|
| A | `be88daa1-175e-4e5e-b794-557d762c6c7f` |
| B | `0884adc1-2a87-42e6-947f-ecc476ddac9c` |
| C | `b9771d81-d557-4679-825c-eb3cbb2fadf3` |
| D | `0dcb4148-4bd4-4779-8d57-c0bca6fa723e` |

### ⏳ E O QUE FICA NA FILA DE VERDADE: o enriquecimento de cenário da F4

Ele tem assets novos já gerados para **enriquecer o cenário da Fase 4**, e disse QUANDO olhar para
eles: *"após fechar as pendências de arte e gameplay"* — ou seja, **depois do M2–M5 e do Bloco B**,
não antes. ⚠️ **Não puxe esse material para dentro do M2.** O M2 tem quatro peças definidas e três
decisões abertas; misturar uma biblioteca de 163 candidaturas no meio disso é como a Fatia 7 já
morreu uma vez (a Task 4, as colunas novas).

---

## O QUE VEM DEPOIS, NA ORDEM

```
M1 — O MOTOR              ✅ PRONTO, VERIFICADO E JOGADO (09–10/09)
  a faixa contínua, a curva do vão, a mesa, a trava dos 8px — com arte provisória.
  Plano: docs/superpowers/plans/2026-09-09-fatia7-m1-motor-moldura.md
  └ RESPONDIDA: a curva contínua NÃO estragou a dificuldade. PASSO_MAX fica em 14.
M1.5 — O AJUSTE           ✅ PRONTO, VERIFICADO E JOGADO (10–11/09) — aprovado como está
  1ª rodada: a borda de margem, a parede que morde, o fio aceso, o cenário desempilhado.
  2ª rodada: a parede COLA no corredor, as 3 PORTAS, a fase vai a 113s.
  Specs: .../2026-09-10-fatia7-moldura-borda-letal-design.md  (1ª, parcialmente superada)
         .../2026-09-10-fatia7-duto-portas-design.md          (2ª, a que vale)
O GOLFINHO — CÂMARA B     ✅ FECHADO, JOGADO TRÊS VEZES E APROVADO (11–12/09)
  aviso que sai da tela, o X nadando com a volta de dentro da parede, o duelo alternando rajada e
  leque, a fase segura em t=49,5. Nada pendente.
  Spec: .../2026-09-11-fatia7-golfinho-miniboss-design.md · Plano: .../2026-09-11-fatia7-golfinho.md
A LEITURA DA ABERTURA     ✅ JOGADA E APROVADA (12/09)
  mesas menores (vãos 126/112/120), destroços nas bordas, o coração enterrando os próprios cabos.
  Sem spec: três ajustes de leitura pedidos com print na mão. Ver "O QUE A SESSÃO DE 12/09 FEZ".
A ÁGUA + AS 5 PEÇAS      🟠 FEITAS, NÃO JOGADAS (12/09, 2ª rodada)
  a câmara B alaga e o alagamento esconde a troca de pintura; f4Passarela ×3 e f4Ganglio ×2,
  tiradas das 64 candidaturas dele. Sondas verdes, build limpo — falta o controle na mão.
  Ver "🌊 A ÁGUA DA ARENA E AS PEÇAS NOVAS".
M2 — A CÂMARA A           ⬜ ◄ PEGUE AQUI · o MOTIVO já está respondido (não tem) — é passe de ARTE:
                             as 3 decisões abertas, depois as 4 peças da doca engolida
M3 — A CÂMARA B           ⬜ a garganta
M4 — A CÂMARA C           ⬜ a faixa grossa, o esfíncter, e as 3 PORTAS (o resto do Bloco C)
M5 — A CÂMARA D           ⬜ a faixa da arena
BLOCO B — O CHEFÃO        ⬜ INALTERADO pela moldura, e ainda de pé
```

### 🟢 O M1 FOI JOGADO E APROVADO (10/09) — esta seção fica como registro

O código está completo e verificado (build limpo · `probe-f4-moldura` 19/19 · `probe-stage4` 22/22
com `vaos:[110,110,110]` · `probe-f4-visual` 17/17 · a régua da mesa honesta). **Nada disso responde
a pergunta do M1.** Ela é do controle na mão:

> **A curva contínua estragou a dificuldade?** O vão parou de saltar, e saltar era parte do desafio.

Para jogar: `npm run dev` → `http://localhost:5173/` → tecla **`L`** (vai direto para a Fase 4).
Se ficou monótono, o knob é **um só**: `Moldura.PASSO_MAX` (hoje 14). Se ficou injusto, o mesmo
número para baixo. As outras quatro coisas para olhar estão na Task 6 do plano do M1.

⚠️ **A arte é provisória e feia de propósito**, com dois defeitos já conhecidos que **não são do
motor**: a mesa lê mais CLARA que a parede (inverte a leitura de plano) e a faixa fica escura
demais nos trechos grossos. Os dois são distribuição de valor da peça, e a arte do M2 resolve.
**Julgue a geometria e o ritmo; a beleza não está em jogo aqui.**

### ⚠️ AS DUAS LEIS QUE O M1 PAGOU CARO PARA APRENDER — valem para o M2–M5

**1. Toda peça de arte precisa de assert de CHAVE DE TEXTURA e de DIMENSÃO.** Medir a posição não
prova que a peça certa está na tela. A mesa nasceu com a textura de ERRO do Phaser (a chave foi
registrada como `f4Mesa` enquanto o `PropKind` se chamava `mesa`), a hitbox virou 32×32 em vez de
96×112 — o obstáculo praticamente deixou de existir — e **as quatro sondas passaram**. A linha de
base `[110,110,110]` é cega para isso *por construção*: o vão é calculado a partir do mesmo número
que posiciona a peça, então os termos se cancelam. ⚠️ **A chave da arte de um prop É o nome do
`PropKind`** (`pickVariant(scene, kind)`), e é assim que `mesa2`/`mesa3` entram de graça no M2.

**2. Toda mudança em código COMPARTILHADO exige olhar as fases que não são a sua.** A faixa da F4
estava sendo desenhada nas Fases **1, 2 e 3** — uma tira opaca e acesa no rodapé de três fases já
mergeadas e aprovadas jogando. É a mesma fronteira que o `TerrainSystem.updateTurret` já cravou
como regra, atravessada na direção contrária. **Nenhuma sonda pegaria**: as quatro cobrem a F4.

**E a regra que resume as duas: ABRA A IMAGEM.** Três dos cinco achados sérios desta etapa só
apareceram porque alguém olhou uma captura, não porque um assert ficou vermelho.

### 📌 EM ABERTO PARA O M2, decidir ANTES de gerar arte

- **Como a arte troca por câmara.** O M1 entregou **um** `PropKind` só (`mesa`), e o plano diz que
  M2–M5 trocam só a TEXTURA. Mas a spec de 08/09 nomeia as peças como `f4MesaA1/A2/B1/B2`. Com um
  kind só, trocar por câmara exige decidir: `setTexture` no spawn conforme a câmara, ou kinds
  separados? ⚠️ Seja qual for, ela esbarra na **lei 1** acima.
- **O atalho de dev `G`** (pula pro chefão numa partida ao vivo) descarta os eventos entre o
  instante atual e o `bossTime` — apertar `G` em t=10 luta com parede de 16px em vez de 54. O
  modo treino já foi consertado; o `G` não. ⚠️ A `probe-stage4` **usa o `G`**, então a luta que
  ela testa não é a luta final real.
- **O relevo da faixa é CORTADO, não deslocado** (`Math.min` em `Moldura.gerar`). A partir de
  espessura 44 ele começa a ser aparado, e em 54 (t≈68 até o fim) é exatamente **0**: a parede
  vira régua reta justamente no clímax. Não é defeito — mas é a explicação se o duto parecer
  "morto" no teste jogado.

⚠️ **O Bloco B não foi tocado** e continua com tudo o que estava pronto: a arte nova do guardião
em `assets/raw/anim-guardiao-novo/`, a idle aprovada, a morte que precisa ser composta no motor, e
o aviso de que `G_CORE_OFF_X/Y` e `G_MUZZLE_X/Y` **têm que ser remedidos** porque a arte nova é
256×256 contra 256×227. Detalhe no START antigo, seção "O QUE JÁ ESTÁ NA MÃO PARA O BLOCO B".

---

## ⚰️ O QUE MORREU NESTA SESSÃO

- **A Task 4** (as colunas novas). As 10 candidatas de 07/09 e as 12 de 08/09 ficam no disco como
  estudo. **Nenhuma é instalada.**
- **O `sorteiaKind`** (`GameScene.ts:869`) e **o `vaoY` sorteado** (`GameScene.ts:859`) — morrem
  no M1.
- **O Bloco C perdeu as paredes contínuas** para a fase inteira; ficou só com as 3 portas.

---

## 📌 A LINHA DE BASE — não perca este número

```
corredores {"chao":3,"teto":3,"vaos":[126,126,126]}
```

`node scripts/probe-stage4.mjs`. Tem de devolver **exatamente** isto. Se mudar, a mesa nova está
comendo o vão — **o erro é da ARTE, não do roteiro**.

⚠️ **ERA `[110,110,110]` ATÉ 11/09, E MUDOU DE PROPÓSITO EM 12/09** — ele, jogando: *"diminua o
tamanho das mesas no início da fase 4"*. A janela da sonda acompanhou (`[96,124]` → `[112,140]`).
A regra não mudou: **quando o ROTEIRO muda o vão, a linha de base acompanha; quando ela quebra
sozinha, a culpada é a arte.**

⚠️ **A sonda NÃO pega a mudança de dificuldade na horizontal nem a curva contínua.** Ela cobre o
vão, não a espessura nem o ritmo. Isso só o controle na mão julga — e é por isso que o M1 termina
com ele jogando.

---

## O REPOSITÓRIO

Branch **`feat/fase4-visual`**, em dia com o `origin`. `main` está em `f417c0e` com a Fatia 6
mergeada. `origin` = github.com/HenriqueCrosio/AlienWorld-Remastered-V2.
⚠️ O remoto **`legacy`** é o repositório ANTIGO — **nunca empurre para ele**.
⚠️ **Commits são de autoria SÓ do Henrique** — sem `Co-Authored-By`, sem "Generated with".

**A sessão de 12/09** fechou num commit só, `c4bbdc8` — *"a abertura abre: mesas menores,
destroços na borda, o coração enterrado"*. Ele carrega os três ajustes, os dois asserts novos da
`probe-f4-visual`, a janela nova da `probe-stage4` e a ferramenta `_ver-abertura.mjs`.

As sondas no fim da sessão, **todas verdes, uma por vez**: `probe-f4-visual` (20/20, com os dois
asserts de leitura), `probe-stage4` (com `vaos:[126,126,126]`), `probe-f4-moldura`,
`probe-f4-golfinho`. ⚠️ E as das outras fases (`probe-stage1-visual`, `probe-stage2`,
`probe-stage3`) porque `Parallax.emit` é código COMPARTILHADO — a lei 2 do M1.

Os commits da sessão de 11/09 (o golfinho), todos empurrados:

| commit | o que |
|---|---|
| `5ca12d0` | a spec do golfinho + o START apontando para ela |
| `f1fc711` | a arte: três folhas sem a bala desenhada, e a bala 13×9 |
| `9fe5080` | a entidade, o roteiro da câmara B e a arena segurando em t=49,5 |
| `b29c82a` | o primeiro plano sai de cena na arena (pego na captura) |
| `0d71780` | as sondas da moldura e do cenário atravessam a arena |
| `dc76c80` | o plano e o que ver no teste jogado |
| `c6be51b` | o 1º ajuste jogado: nado com onda, volta de dentro da parede, duelo alternando |
| `2801c6c` | o 2º ajuste jogado: o aviso passa por B e sai da tela |

As sondas da F4, verdes no fim daquela sessão: `probe-f4-golfinho` (a nova), `probe-f4-moldura`,
`probe-f4-visual`, `probe-stage4` (com `vaos:[110,110,110]` — hoje `[126,126,126]`) e `probe-stage3`
(a aranha segue sendo o `miniboss` sem `kind`). ⚠️ UMA POR VEZ.

**PixelLab:** **4.668** de 5.000, ciclo virando em 2026-10-04. Conferido no arranque de 12/09 — a
sessão não gastou nenhuma geração (os três ajustes são de código, não de arte). ⚠️ Confira o saldo
no arranque antes de gastar.
