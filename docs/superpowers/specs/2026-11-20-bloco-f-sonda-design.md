# Bloco F — a SONDA: o inimigo novo da F2 (no lugar do dardo) e da F3 (ao lado dos batedores)

> 20/11. Aprovado por ele seção a seção (brainstorming). O START do bloco: `plans/2026-11-15-bloco-f-START.md`.
> A rocha do minerador (o outro item do F) fica FORA desta spec — spec curta própria, depois desta.

## 1. Por quê

O "batedor da frota" das anotações do F é o **dardo**: a pele do `batedor` na F2 (`enemyScoutCinturao`, 115×34 em
escala 0,28 = ~32×10 px na tela, hitbox ~19×6). Ele: *"os dardos são dificeis de acertar, ao começar a atirar e
desviar, ficará mais dificil"*. Ele gerou no PixelLab os dois substitutos — e eles NÃO são alternativas: um é o da F2,
o outro o da F3 (as tags dele):

- **"Batedor F2"** — `a606e9d2-b3eb-4833-8fba-1297772a5802`: casulo ESCURO, espinhos, olho vermelho (a linha dark
  sci-fi do cinturão). 32×32, conteúdo 26×25.
- **"Batedor F3"** — `3f3bd97d-cd0f-4f5c-b937-ef69bdfb6664`: casulo de FERRUGEM/bronze com patinhas (o bronze e o osso
  do casco da F3). 32×32, conteúdo 26×29.

Conferidos ampliados em 20/11: os dois de PERFIL (o olho à esquerda, para a nave), um quadro parado cada.

**Os batedores continuam** (ele: *"todos os batedores de todas as fases continuam, os que saem são os dardos"*): o
batedor roxo da F1 e da F3 não muda. Na F2 ele só existia como dardo — lá, as ondas viram de sondas.

## 2. O que ela é (seção 1 aprovada)

- **Um inimigo novo, `sonda`**, com o cérebro próprio em `src/entities/sonda/` — pelo gancho `miudo` do `EnemySystem`
  (um `ComportamentoElite` que NÃO é elite: não atenua o primeiro plano, como a pupa e a mosca da Larva). A **pele por
  fase**: a escura na F2, a de ferrugem na F3.
- **Tamanho:** a arte dele em escala 1 (~26×25 na tela); a hitbox na regra do jogo (60% × 55%), ~16×14 — a altura (o
  que conta para o tiro horizontal) mais que dobra a do dardo.
- **F2:** as 6 ondas de dardos (t 9, 24, 33, 48, 58, 84) viram ondas de sondas, com **3 por onda** (eram 4–6), na fila
  COLADA de hoje (a fila junta é de propósito: a carta de reação em cadeia).
- **F3:** ondas PRÓPRIAS da sonda de ferrugem, onde os batedores roxos não voam: **3 ondas de 3**, os lugares medidos
  na fase (o que está na tela a cada segundo do roteiro da F3) no plano.
- **O batedor sai da F2** (só existia como dardo): a pele `batedor` do `STAGE_2_SKIN` sai do código; os PNGs ficam.
- **Vida 2** (como o batedor), **60 pontos** (o batedor 40: ela atira).

## 3. O comportamento — o mesmo nas duas peles (seção 2 aprovada)

- **O voo:** a onda entra pela direita, a fila segue o caminho da LÍDER (colada). Dois caminhos, sorteados por onda:
  - **o mergulho:** entra alta (ou baixa) e faz a curva até a altura em que a nave estava quando a onda entrou;
  - **o corte em diagonal:** atravessa inclinada, de um canto ao outro.
  A curva é desenhada no espaço (sem senóide). Ela **passa pela nave e sai pela esquerda** se não for abatida.
- **O tiro (pressionar sem punir):** cada sonda atira **no máximo UMA vez** por passagem, depois de entrar inteira; o
  aviso de 0,45 s da canhoneira antes (o piscar + `inimigo.aviso`); o projétil é a BOLA de núcleo branco da canhoneira
  da F2 (não some no fundo escuro). Numa onda de 3, **só 1 ou 2 atiram** (sorteio): vão > tiro.
- **A esquiva:** quando a nave fica ALINHADA com ela (na mesma altura e à frente), um passo rápido de lado (para cima ou
  para baixo) e volta ao caminho. Reage a quem MIRA, não aos tiros na tela; **uma vez por sonda**, com **~0,25 s de
  demora** — quem mira e atira na hora ainda acerta.
- **As cartas** funcionam sem código novo (o grupo dos inimigos): o míssil trava, o elétrico prende parada no ar, a
  reação em cadeia passa pela fila.
- **Os números** (velocidade, curva, a demora da esquiva, a chance de tiro) num arquivo de REGRAS puro, testável e
  calibrável no `?sandbox`. Ele julga por GIF em jogo, na velocidade real.

## 4. A arte e as animações (seção 3 aprovada)

- **A base é a arte DELE**, sem redesenho: o 1º quadro e a âncora de cada clipe.
- **Os clipes** (PixelLab, a partir dos dois objetos dele):
  | Sonda | Clipe | O que mexe |
  |---|---|---|
  | escura (F2) | voo (laço) | o olho pulsando, o casco vibrando de leve |
  | escura (F2) | inclinar para cima / para baixo | o corpo virando um pouco na curva |
  | ferrugem (F3) | voo (laço) | **as patinhas mexendo** (o pedido dele), o olho pulsando |
  | ferrugem (F3) | inclinar para cima / para baixo | o corpo virando, as patas acompanhando |
- **As regras da memória:** 2 gerações por clipe, quadro com folga; a COR de cada parte dita no pedido; clipe que
  escurece ou deforma = descartado; os de inclinar com AS DUAS PONTAS fixas (a arte parada → a inclinada, 4
  intermediários); cada geração ABERTA AMPLIADA antes da folha; nada descartado da fila de review (a biblioteca dele).
- **A folha:** os clipes rodando na velocidade do jogo, lado a lado, no fundo de cada fase; ele escolhe um por clipe.
- **Se os de inclinar deformarem a arte**, a saída é o corpo RETO (só o caminho curva).
- **Sem arte nova:** o tiro (a bola), o aviso (o piscar), a MORTE pela destruição por pixel (`docs/DESTROCOS.md`, classe
  comum) — a escura como METAL; a de ferrugem, metal ou carne pelo que a arte mostra (decidido na folha).

## 5. Som, testes, a ordem (seção 4 aprovada)

- **O som** reaproveita o aprovado: o aviso `inimigo.aviso`, o tiro `inimigo.tiro`, a morte pela explosão do material
  (com o lastro). Um sopro curto e baixo na ESQUIVA só se ele sentir falta jogando; nada novo na saída.
- **Os testes:** um puro das regras (o caminho sai sempre pela esquerda; o tiro no máximo uma vez; a esquiva com demora,
  uma vez); um em jogo (as ondas da F2 e da F3 nascem sondas; o tiro com aviso; a esquiva; a saída; o míssil trava; o
  elétrico prende; a F1 e o batedor intocados); a sonda no `?sandbox`.
- **A ordem:** (1) a folha dos clipes — enquanto ele escolhe, (2) o código com a arte parada dele como quadro (é a peça
  dele, não um provisório); (3) os clipes escolhidos no jogo; (4) o GIF em jogo das duas fases, painéis lado a lado; ele
  joga.

## 6. As leis que pesam aqui

- Elite e inimigo **pressionam sem punir**: vão > tiro.
- A fila colada é de propósito (a reação em cadeia).
- Reclamação de movimento se resolve no corpo e no caminho — nada de movimento fingido.
- A peça dele é a base; teste na pendente, nunca na aprovada.
- Durante a filmagem ou enquanto ele joga: não editar `src/` nem `.html` (a cópia na 5174).

## 7. A rodada 2 (20/11, pela folha e o GIF — ele desenhou sobre o print)

As escolhas da folha: o voo **escuro A** e **ferrugem A** (a B tinha patas mais abertas; ele ficou com a A); os clipes
de inclinar (as duas pontas fixas) entraram na 1ª geração. Os pedidos dele sobre o GIF:

1. **O tiro menor:** *"os tiros ficaram muito grandes para esse tipo de inimigo, eles podem ter o mesmo formato do tiro
   grande, mas [...] numa escala bem menor"* — a mesma bola, de ~14 px para ~5 px na tela, a hitbox junto.
2. **Atira logo e mais de uma vez:** *"eles chegam muito perto da nave para atirar, eu quero que seja aquele tipo de
   inimigo que apareceu e já atira uma vez"* — o 1º tiro ao entrar inteira (aviso de 0,3 s), depois um a cada ~1,2 s
   enquanto está à frente da nave, até 3 por sonda; 1 ou 2 de cada onda de 3 atiram (o resto da §3 vale).
3. **A DISPERSÃO**, um 3º caminho (*"podem vir em enxames [...] mas também podem ter um comportamento de dispersão"*):
   a onda entra em fila e abre em leque — cada uma curva para o seu lado (cima, reto, baixo, sorteado: duas podem ir
   para o mesmo) e sai pela esquerda. Os três caminhos sorteados por onda.
4. **O tiro dela é DESTRUTÍVEL:** acertado pelo tiro da nave, estoura numa pequena **onda de choque vermelha** (um anel
   que abre e some, assado em pixel na resolução do jogo). Só os tiros da sonda.
5. **A morte nova da ferrugem** (*"crispy parecido com os outros, mas uma nova seria bem-vindo"*): um material novo,
   `ferrugem`, na destruição por pixel (`docs/DESTROCOS.md`) — variantes filmadas com a nave atirando, ao lado da morte
   de metal de hoje, para ele escolher. A escura segue METAL.

**Feito e escolhido (20/11):** os cinco pontos no jogo (o tiro em `escala` 0,3; a cadência `xPrimeiro`/`intervaloS`/`max`;
a dispersão `ladosDaDispersao`/`caminhoDoMembro`; o estouro `GameScene.tiroAcertaTiro` + `Fx.estouroDoTiro`, o anel
assado em pixel e o som `acerto.drone`; o material `ferrugem` no motor dos destroços). **A morte da ferrugem: a F1,
crocante** (ele escolheu a F2 e corrigiu em seguida: *"a F1, desculpa"*) — `DESTROCOS.ferrugem.variante`. Filmes: `folhas/2026-11-20/sonda/`
(`sonda-em-jogo-r2.gif`, `morte/morte-sonda.webm`).
