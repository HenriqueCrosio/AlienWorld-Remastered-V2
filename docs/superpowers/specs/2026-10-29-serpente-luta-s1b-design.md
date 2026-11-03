# S1b — a luta da Serpente: ela vive no casco — design

> 29/10/2026, no retorno dele à S1 (nada commitado). Ele:
> *"Eu ainda estou achando as serpentes muito engessadas. Por exemplo, na serpente de 3 cabeças ela vai e volta na
> investida... só que o corpo todo se move para frente num movimento que antes, com a plataforma, justificava mais do que
> ela voar pelo casco sem nenhum tipo de movimento convincente. Como eu imagino a batalha: O jogador chega na arena da
> serpente, o casco explode e o buraco se abre.... ela surge do buraco, a base da serpente de 3 cabeças fica encaixada no
> buraco, a investida vai: ou precisar criar uma animação melhor para ela ou fazer com que ela "rasgue o casco" até o
> jogador, mesmo que o efeito do rasgo se regenere depois. Ai chega a serpente maior, quando a serpente de 3 cabeças
> morre, o interessante é ela voltar para o buraco e depois a serpente maior surge dele. A serpente maior, decidimos que
> ela se desgarra da forma imóvel e se torna mais móvel, esse é o desafio dessa nova batalha."*
> E: *"Antes as serpentes investiam mediante a plataforma de baixo, agora ela desliza de forma incoerente pelo casco.
> Ficou a mesma coisa, só mudou a base e a distância da investida."*
>
> A escolha dele (29/10): **a investida por baixo do casco.** Ela mergulha no rombo, uma rachadura corre pelo casco até
> ficar embaixo da nave, ela rompe o casco ali e sobe em bote; a esquiva vira para o lado; ela fica erguida ao lado da
> nave (a janela), afunda, volta por baixo, e os rasgos se fecham.
>
> **Na folha de conceitos (29/10, 2ª rodada), as escolhas dele:**
> - **o gesto:** o **erguer**;
> - **a rachadura:** a **R3**, a lombada e a fissura escura;
> - **a cabeça laranja:** *"pode ter uma mandíbula também"*;
> - **O CORTE:** *"o melhor é sair apenas a parte de cima de onde fiz o corte vermelho. Por que quando sai todo o corpo,
>   encontramos o mesmo problema que aviso desde o inicio, o corpo ainda está imóvel na parte de baixo"*. As roscas
>   NUNCA saem do casco, nem no rombo nem no rasgo; só pescoços e cabeças (§2).
>
> A S1b SUBSTITUI o movimento da S1 (a investida que desliza, os postos que andam de lado). O resto da S1 fica (§7).
> O roadmap: o item **S** do 🧭 do `docs/HANDOFF.md`, agora S1b → S2 → S3.

> **IMPLEMENTADA em 29/10, sem commit.** O que mudou na implementação (o estouro do bote, a cadência, o círculo no
> crânio, os tiros do pool, a morte cortada) está nos "Desvios" do plano `plans/2026-10-29-serpente-luta-s1b.md`. A
> folha: `folhas/2026-10-29/serpente-casco/luta.html`.

## 0. O que estava errado na S1

- **O movimento era o mesmo de antes.** Todo deslocamento dela era o DESENHO INTEIRO transladando: os postos (±10 px de
  lado e até 32 de altura) e a investida (o sprite atravessando a tela no ar, a 420 px/s, e voltando). A S1 mudou onde
  ela fica, até onde vai, a trava branca e a janela, e deixou o corpo para a S3. Sem a plataforma de antes, nada no
  mundo explica o deslize.
- **A regra (a mesma de [[criatura-inteira-vistas-animacao]]):** o código faz o CAMINHO; o corpo se move por animação do
  PixelLab, no lugar, a partir da arte aprovada; e o mundo REAGE ao caminho (o casco rasga, as placas sobem, o pó sai).
  **Nenhum quadro desta luta mostra o desenho dela deslizando pelo ar.**

## 1. A chegada: o casco explode e o buraco se abre

1. O mundo freia como na S1, com a peça do rombo no posto (x 300). Mas a peça chega **inteira**: a mesma faixa dos três
   painéis da proa sem o rasgo (`serpente-rombo-inteiro.png`, a base do `_rombo-base.mjs`).
2. **O aviso (~1,2 s):** o casco treme no ponto do rombo. As placas sobem e descem 1–2 px, como na lombada do §3, solta
   poeira da crista, e a câmera dá dois ou três tremores curtos.
3. **A explosão:** os pixels da região do rasgo voam nos próprios pixels (o motor de destroços, material do casco), e a
   peça troca para o rombo A por baixo da nuvem. O lábio entra junto.
4. Ela sobe pelo rombo atravessando os destroços, como na S1, até o posto médio.

O treino `[N]` faz o mesmo.

## 2. Em repouso: a base encaixada no rombo

- **O CORTE (a regra dele):** a linha do corte é `corte` px de arte abaixo do centro do sprite, a base dos pescoços,
  medida na maquete: 20 px de arte, ~11 de tela. Ela nunca sobe acima da crista. O que fica abaixo da crista é escondido
  pela FRENTE do casco, os pixels da própria faixa coluna a coluna, desenhados por cima dela; dentro de um buraco, some
  no escuro. O posto erguido é o corte na crista, e os outros afundam mais.
- **x fixo em 300.** Os três postos só mudam a ALTURA (afundada, média, erguida), e o x de 292/310 sai. Sobe para
  atacar e afunda para se recuperar, como na S1.
- **A subida e a descida de posto** têm a frenagem que já têm, sem o deslize de lado.
- Os padrões de tiro de cada forma ficam como estão (§7).

## 3. A investida por baixo do casco (em toda forma)

A cada `cada` segundos da forma:

1. **O mergulho (~0,35 s).** Ela afunda inteira no rombo, rápido, e solta pó e cascalho do lábio. Escondida, ela não leva
   tiro (o alvo some) e não fere.
2. **A rachadura (~0,8 s).** Uma frente corre pela faixa do casco, do rombo até o x da nave, a até `rachadura` 300 px/s,
   indo atrás do x da nave. Na frente, as placas SOBEM sobre ela (a lombada: o casco é empurrado de baixo), com pó na
   crista. Atrás, fica a fissura. O visual sai dos conceitos (§5).
3. **Segue e trava.** Embaixo da nave, a frente acompanha o x dela a 160 px/s (mais rápido que os 110 da nave: correr não
   adianta) por `segue` 0,4 s. Aí ela **TRAVA**: a ponta da rachadura fica BRANCA, a mesma linguagem da trava da S1, e
   para por `trava` 0,55 s. É o tempo de sair da coluna.
4. **O bote (~0,2 s).** Ela rompe o casco no x travado:
   - a faixa explode ali nos próprios pixels, e abre um rasgo do tamanho das roscas dela;
   - ela sobe a ~700 px/s até a cabeça viva ficar na altura da nave (travada junto com o x). O limite é O CORTE na
     crista, então a cabeça viva não passa de y ~105 no erguer. A luta acontece na metade de baixo; o leque cobre o alto;
   - **a animação do bote** toca (§5);
   - **o que fere:** a coluna da cabeça viva, x da cabeça ± o raio dela (16,5 px), da cabeça até o pé da tela. É o
     caminho do bote.
5. **A janela (~1,1 s).** Ela fica erguida no rasgo, com a cabeça viva ao lado da nave, e as veias disparam. Só a CABEÇA
   fere, se encostar (o círculo dela). A nave que desviou para a ESQUERDA fica na frente da cabeça (ela atira para a
   direita): é a janela. Quem desviou para a direita perdeu a janela.
6. **A volta.** Ela afunda no rasgo (~0,3 s), e a lombada corre de volta por baixo da faixa até o rombo (~300 px/s). Ela
   sobe no rombo para o posto baixo e se recupera (`recupera` 1,2 s).
7. **A cura (~2,5 s).** O rasgo e a fissura se fecham: os pixels do casco voltam das bordas para dentro, com um aro mais
   escuro (tecido novo) que assenta. O casco é do Leviatã, e ele regenera.

**Os casos:**

| Caso | O que acontece |
| --- | --- |
| A nave está sobre o rombo (x ≥ 300 − 72 + 10) | Não há rachadura: ela trava e dá o bote do próprio rombo. |
| A nave está na borda esquerda | O x travado não passa de `bordaX` 24, e a esquiva é para a direita, sem janela. É o preço de colar na borda. |
| A nave está acima do alcance (y < ~60) | O bote vai até o alcance. Lá em cima a nave não leva o bote, mas também não acerta a cabeça; o leque cobre o alto. |

**Por forma:**

| Forma | A variação |
| --- | --- |
| **A** (3 cabeças) | Simples. |
| **B** (2 cabeças) | Dupla. Depois de uma janela curta (0,5 s) ela afunda, e a rachadura sai DO RASGO de novo, mais curta, atrás da nave. |
| **C** (1 cabeça) | Na janela ela cospe a rajada de perto (a da S1). |
| **Fusão** (até a S2) | A mesma investida, com os números mais rápidos. A S2 a solta do casco. |

## 3b. A chuva tripla (o ataque em conjunto) e as cores dos tiros

Ele (29/10): *"a serpente de tres cabeças precisa ter uma skill que ataque em conjunto, além disso. Cada cabeça atira de
uma cor, a cabeça azul, verde e ambar têm tiros com as suas cores."* A escolha dele: **a chuva tripla**.

- **As cores:** cada cabeça cospe a gota na SUA cor:
  - a ciano cospe **azul**, um azul fundo, porque o ciano da arte é quase o `playerBright` da nave e leria como tiro do jogador;
  - a verde cospe a gota verde de hoje;
  - a laranja cospe **âmbar**.

  Cada tiro sai da BOCA da cabeça que atira (as bocas medidas no `gestoSerpente.ts`).
- **A chuva tripla:**
  1. **O aviso:** no rombo, ela sobe ao posto erguido e faz o ERGUER (o mesmo gesto do bote). As bocas acendem, cada uma na sua cor.
  2. **O cuspe:** na pose segurada, cada cabeça viva cospe para o ALTO (as gotas sobem e saem da tela).
  3. **A chuva:** ~0,45 s depois, cai uma onda por cabeça, uma depois da outra (0,35 s entre elas), cada uma na cor da
     sua cabeça:
     - gotas espaçadas pela tela;
     - em cada onda, um vão de duas gotas num lugar sorteado;
     - a ~110 px/s.
  
  Cobre o alto que o bote não alcança: a luta fica perigosa em cima (a chuva) e embaixo (o bote).
- **Quem faz:** a de 3 cabeças (a forma A), com três ondas, a cada ~7 s, alternando com o bote. A de 2 cabeças (B)
  faz com duas ondas, a cada ~9 s. A de 1 cabeça não tem conjunto (sobra uma cabeça só).
- **O círculo de acerto no crânio:** os offsets da S1 (de julho, pelo centro da COR da cabeça) caíam no pescoço da ciano
  e da verde, ~25–35 px de arte abaixo do crânio, e o círculo não tocava a cabeça desenhada. Os novos foram medidos na
  grade: a ciano em (−84, −78), a verde em (1, −91,5) e a laranja em (63, −64,5).

## 4. A morte da de 3 cabeças e a chegada da maior

Hoje a fusão acontece no lugar, atrás de um véu preto. Agora:

1. A última cabeça da C morre na cadeia de estouros de hoje.
2. **Ela cede e AFUNDA no rombo** (~1,5 s, devagar, sem bote).
3. **O silêncio (~0,4 s):** o rombo fica escuro e quieto.
4. **A fusão por baixo:** as três luzes (ciano, verde e laranja: as cores das cabeças, o vocabulário da fusão de hoje)
   brilham pelas frestas do lábio e convergem para o centro do rombo. Um clarão implode dentro do buraco.
5. **A detonação:** o lábio do rombo estoura nos próprios pixels (o rombo alarga), e a maior irrompe dele de boca aberta.
   Até a S2 ela usa a arte de hoje da fusão.

Sem véu preto: o casco esconde a troca. Os tiros em voo somem no começo, como hoje.

## 5. A arte (conceitos antes de instalar)

- **O gesto (PixMiniMax): o ERGUER, escolhido.** O quadro aprovado é o 1º quadro, num quadro de 256² com folga em cima
  e à esquerda; o gesto é no lugar, com 16 quadros. As cabeças sobem nos pescoços, se abrem e escancaram as bocas, e
  seguram (a janela). A B e a C saem com o mesmo pedido. O clipe toca na subida e na janela, e volta ao idle. O círculo
  do acerto e as veias seguem a cabeça viva quadro a quadro, com as posições medidas nos quadros do gesto.
- **A rachadura, a lombada, o rasgo e a cura.** Assados em pixel a partir do PRÓPRIO casco ([[efeito-de-cena-assado-em-pixel]]):
  - a lombada desloca colunas da faixa;
  - a fissura sai na paleta do casco;
  - o rasgo é a faixa voando nos próprios pixels (o motor de destroços);
  - a cura são os pixels voltando.

  Três ou quatro visuais na folha, montados no jogo.

## 6. Os números (ponto de partida, em `numerosSerpente.ts`)

| | Valor |
| --- | --- |
| `mergulho` | 0,35 s |
| `rachadura` | 300 px/s, atrás do x da nave |
| `segue` | 0,4 s, a 160 px/s |
| `trava` | 0,55 s, a ponta branca |
| `bote` | 700 px/s; a cabeça viva na altura da nave, com a base no rasgo (cabeça ≥ y ~60) |
| `colunaMeia` | o raio da cabeça (16,5 px; 18,9 na fusão) |
| `janela` | 1,1 s (B: 0,5 s antes da segunda) |
| `afunda` | 0,3 s |
| `volta` | 300 px/s por baixo |
| `cura` | 2,5 s |
| `bordaX` | 24 |
| `cada` | A 4,0 / B 5,0 / C 5,5 s (os da S1) |

Eles fecham no filme, com ele olhando.

## 7. O que fica da S1, e o que sai

- **Fica:**
  - o rombo A e o casco da arena;
  - a frenagem do mundo;
  - o treino com o casco;
  - as veias acesas e o acerto que sangra;
  - o círculo do tamanho da cabeça;
  - o branco da trava;
  - os padrões de tiro de cada forma;
  - a rajada da C.
- **Sai:**
  - a investida que desliza (`indo`, `janela`, `voltando`, `mirandoVolta` como estão);
  - o x dos postos;
  - `bordaCabeca`, `janelaCabeca`, `recuoJanela`, `recuoDupla`, `abaixoCabeca` e a faixa que fere da S1.

## 8. As provas e a folha

- **`scripts/test-serpente.mjs`:** as contas novas, puras:
  - o x travado e os limites dele;
  - a altura do bote e o alcance;
  - a coluna;
  - o rombo-ou-rachadura.
- **`scripts/_serpente/_sonda-luta.mjs`, com dois jogadores de sonda:**
  - **o parado** fica na altura da cabeça viva atirando, e deve levar o bote em toda investida;
  - **o que desvia** sai para a ESQUERDA na trava (para a direita se estiver na borda), e não deve levar nenhum.

  Mais o tempo de luta, comparado à S1.
- **Os filmes:** a chegada (o casco explodindo), a investida por baixo (A, B, C), a morte da de 3 cabeças e a
  maior surgindo.
- **A folha:** `docs/superpowers/folhas/2026-10-29/serpente-casco/`.
- As sondas de sempre: `_sonda-serpente-fusao`, `_sonda-chefes`, `probe-stage3`, `test-morte`, `tsc`.

## 9. Fora da S1b

- **S2:** a maior com a arte nova, solta do casco. Ela se desgarra do rombo e é móvel; esse é o desafio da segunda
  luta.
- **S3:** os outros gestos (o recuo no aviso e o cuspe antes do leque).
