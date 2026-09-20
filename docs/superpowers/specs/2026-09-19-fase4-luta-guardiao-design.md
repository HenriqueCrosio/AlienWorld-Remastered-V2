# A LUTA DO GUARDIÃO — design (19/09/2026)

**Fatia 7 · Fase 4 · Bloco B · B1.** A ARTE do guardião já foi jogada e aprovada em 15/09 (*"o novo modelo
ficou melhor que o outro"*) e a respiração em 19/09 (*"está boa"*). **Esta spec não toca na arte dele.** Ela
trata só da LUTA, aberta pelo teste jogado de 19/09.

---

## 0. O que muda, em uma frase

O guardião ganha uma skill nova — uma **SERRA lançada num cabo**, que crava nas bordas e é onde ele fica
exposto —, a salva de glóbulos passa a **cobrir as bordas** (que é para onde a investida empurra o jogador), e
a luta escala em três degraus de vida. **A investida não muda.**

---

## 1. O diagnóstico medido

O pedido veio do teste jogado de 19/09:

> *"nós vamos ter que repensar a luta com o guardião, está a mais fácil de todas, o guardião está bem fraco em
> questão de ataque. E o ataque de investida dele está desbalanceado, pois é impossível desviar desse ataque.
> Ou seja, tirando a investida impossível de desviar, os 3 tiros dele são muito fáceis."*

Medido em jogo com `scripts/_f4/_medir-guardiao-luta.mjs`:

| o que | medida |
|---|---|
| o corpo na investida (`corpoInteiro`, 210×190 na escala 0,7) | **147×133px na tela** |
| o vão jogável da arena (y 30..190) | **160px** |
| a folga | **27px**, menos os 6,3px do corpo da nave → **~20px**, divididos entre em cima e embaixo |
| os glóbulos do leque | **100 px/s** — a nave anda a **110 px/s** (`FreeController.SPEED`) |
| o ciclo | `flutua` 6s (3 leques) → `telegrafo` 0,55s → `investe` ~0,76s → `volta` ~1,5s ≈ **8,8s** |

**O que o número diz, e que o teste confirmou.** Ele voltou a jogar e descobriu que **dá** para desviar:
*"testei ficar bem nos cantos e, de alguma forma, eu não tomei o dano"*. É exatamente a folga de ~20px
medida. Então o problema não é "impossível de desviar" — é que a investida **não tem resposta de movimento, só
uma de estacionamento**: ou você está parado na borda e ela nunca acerta, ou está no meio e ela sempre acerta.
Nos dois casos ela deixa de ser um ataque. É a mesma doença dos 3 tiros fáceis, com o sinal trocado.

Some-se a isso que **durante a investida o corpo fecha** (`corpoInteiro`), então a bala morre no casco: a
investida não tem contrajogo nenhum. E os 6s de `flutua` são o oposto — risco zero e tiro livre no miolo.

**A conclusão que orienta o desenho todo:** a dificuldade tem de vir da **tensão entre os ataques**, não de
cada um ficar mais rápido. É por isso que a salva passa a cobrir as bordas: o canto que salva da investida
deixa de ser de graça.

---

## 2. O que NÃO muda — a investida

**A investida fica exatamente como está hoje:** horizontal, telegrafada por 0,55s de piscada, corpo fechado
durante a travessia, `INVESTIDA_CADA` 6s, velocidade −300 com deriva vertical até ±70.

Chegamos a desenhar uma investida **em X** (duas travessias diagonais avisadas por um fio de laser, com a
hitbox encolhida para o aríete) e ela foi **cortada** depois que o teste mostrou que a investida atual já tem
saída: *"o X fora, na verdade, dá espaço para a skill que já existe… ela seria a skill em X, só que já temos
implementada"*. A investida ocupa aquele papel na luta — empurrar o jogador para as bordas — e não precisa ser
construída de novo.

⚠️ **Por que a diagonal foi descartada, para não voltar por engano:** uma travessia que vai de y=30 a y=190
varre o vão INTEIRO, então com o casco de 133px não sobraria canto nenhum, e a nave (110px/s) não tem como
sair pelos lados de alguém que atravessa a 300px/s. A diagonal só funcionaria com a hitbox encolhida para
~40px — o que é mais peça para construir do que a investida horizontal que já funciona.

---

## 3. A SERRA — a skill nova

O desenho é dele, em 19/09:

> *"Aciona uma serra grande que ricocheteia nas paredes até sair do cenário, não segue o jogador, o jogador
> precisa esquivar… a serra vai subir na diagonal até bater na borda de cima, vai ter um efeito de cravar na
> borda, ela vai fazer um movimento de tentar girar travada 2x e depois vai descer na diagonal até a borda de
> baixo, fazer o mesmo movimento 1x agora e subir na diagonal, até sair da fase."*

E, depois: *"a serra vai ser lançada com um cabo parecido com os que prendem o guardião"*.

### 3.1 A coreografia

```
        y=30  ───────────●X1──────────────────
                        ↗   ↘
                      ↗       ↘
        sai ←───────↗           ↘
                                  ↘
        y=190 ────────●X2───────────●(G) conjura
```

1. **CONJURA** — ele segura o cabo e um **fio fino marca a primeira diagonal** até a borda de cima. É o aviso.
2. **VOO 1** — a serra sobe na diagonal, presa ao cabo, até a borda de cima.
3. **CRAVADA 1 (X1)** — crava na borda e **tenta girar travada 2×**. 🎯 **Janela de dano.**
4. **VOO 2** — desce na diagonal até a borda de baixo.
5. **CRAVADA 2 (X2)** — crava e **tenta girar travada 1×**. 🎯 **Janela de dano.**
6. **SAÍDA** — sobe na diagonal e sai da fase pela esquerda. O cabo vai junto.

### 3.2 As regras

- **Não persegue.** O caminho é física burra depois da conjuração.
- **O ângulo da primeira diagonal é SORTEADO dentro de uma faixa** a cada conjuração — varia sem perseguir, e
  o canto seguro muda de lugar. ⚠️ O sorteio só é justo por causa do fio de aviso: sem ele, acertar viraria
  sorte em vez de leitura. **O aviso e o sorteio andam juntos; tirar um obriga a rever o outro.**
- **A bala ATRAVESSA a serra.** Ela fere quem encostar e ignora o tiro. É o que mantém as janelas de dano
  limpas: com a serra presa na borda, a linha de tiro para o guardião fica livre.
- **Ela não pode ser destruída.** É obstáculo, não alvo.
- **O CABO é só visual**: numa camada ATRÁS da nave e mais escuro, para não disputar leitura com a bala. A
  nave atravessa ele sem tomar dano.

### 3.3 Por que a cravada é a janela de dano

A nave atira para a **direita** (`WeaponSystem`, ângulos em torno de 0°), e o guardião só é acertável quando
está à direita dela e parado o bastante. A investida não serve: ele passa e termina ATRÁS da nave, de onde é
impossível acertá-lo — como ele apontou, *"o boss cruzando a fase rápido, o jogador não vai ter tanto tempo
para atirar"*.

A cravada resolve isso e ganha a justificativa ficcional de graça: **enquanto a serra está presa, ele está
segurando o cabo** — ancorado, à direita, com o miolo de lava exposto. O beat de arte, o beat de mecânica e o
motivo ficcional são a mesma coisa.

---

## 4. A SALVA — desenho novo e trabalho novo

Pedido dele: *"os tiros podem continuar em salvas entre as skills, mas precisamos mudar o desenho dos
projéteis"*.

- **O desenho do projétil muda** (hoje é `bolt3` com tint laranja). A direção de arte entra na §6.
- **O comportamento muda também**, e é aqui que a luta ganha tensão: **a salva passa a cobrir as BORDAS**,
  exatamente onde a investida empurra o jogador. Continuam sendo 3 glóbulos; mudam os ângulos.
- **A velocidade tem de passar dos 110px/s da nave.** Projétil mais lento que quem desvia não é ameaça —
  hoje dá para simplesmente andar para longe dele.

---

## 5. A ESCALA — três degraus de vida

Mesma gramática do predador (66% e 33%), escolhida por consistência. **Nada de novo aparece nos degraus: o que
muda é o ritmo.** Os três ataques existem desde 100% — a serra precisa estar lá desde o começo, porque é dela
que sai o dano.

| degrau | o que aperta |
|---|---|
| **100–66%** | o ciclo base: salva → serra → salva → investida |
| **66–33%** | o intervalo entre skills encurta; a salva ganha um glóbulo |
| **33–0%** | o intervalo encurta de novo; a salva ganha outro; **a serra fica mais tempo na arena — uma cravada a mais antes de sair**, que é mais perigo e mais janela de dano ao mesmo tempo |

**HP:** fica em **90**, decisão dele (*"deixa o HP em 90 por enquanto"*). Com a serra entrando, o mesmo HP vai
durar mais tempo de relógio — é um número para ele olhar jogando, não para chutar agora.

---

## 6. A ARTE A PRODUZIR

⚠️ **Antes de gerar qualquer coisa, a lista vai para ele escolher o que faz à mão** — é a regra da divisão de
arte deste projeto. Nada de geração em lote sem essa passagem.

**A serra.** Direção dele: *"as lâminas da cor do metal da fase (escuro) com um core parecido com lava"*. Isso
é a lei do dark sci-fi da fase: casco escuro, luz só onde há energia. Peças previstas:

| peça | o que é |
|---|---|
| `serra` — girando no voo | o ciclo em laço, lâminas escuras, core aceso |
| `serra` — cravada girando travada | o giro que não vai, o beat que ele pediu (2× em cima, 1× embaixo) |
| faíscas da cravada | efeito de cena — ⚠️ **assado em pixel na resolução nativa**, com a paleta do vizinho, nunca `Graphics` em tempo de jogo |
| o cabo | pode ser desenhado no motor (é uma curva escura), mas segue a mesma lei: se ler como "gerado", assar |

**O projétil da salva.** Direção ainda **em aberto** — ele pediu desenho novo, mas não disse no quê. Resolver
com 3–4 conceitos distintos na mesa, não com perguntas antes.

---

## 7. Técnica

### Onde mora

`BossNucleo.ts` tem 446 linhas e já carrega as duas formas do chefão. **A serra sai em arquivo próprio**,
`src/entities/SerraGuardiao.ts`, como `fimDoPredador.ts` fez com o fim da morte: uma linha do tempo fechada,
que recebe a cena e a posição de conjuração e se resolve sozinha. O `BossNucleo` só a conjura e pergunta se
ela está cravada (para abrir o miolo).

### Os estados

O `switch` de `updateGuardiao` ganha `conjura` (o fio de aviso) e `serra` (ele segura o cabo enquanto a serra
corre o caminho). `flutua`, `telegrafo`, `investe` e `volta` ficam como estão.

### Os knobs

Todos `static readonly` no topo, como no resto do projeto. Previstos: a faixa do ângulo sorteado, a duração da
conjuração/aviso, a velocidade da serra, a duração de cada cravada, o número de giros travados, o intervalo
entre skills por degrau, os ângulos e a velocidade da salva.

### Sondas

`probe-stage4` tem de continuar passando de ponta a ponta. A sonda `_f4/_medir-guardiao-luta.mjs` ganha as
medidas da serra (a altura que ela ocupa no vão, a folga que sobra, a duração de cada janela de dano) — é ela
que prova que a luta é justa, em número, antes de ele jogar.

---

## 8. ✅ Critério de aceite — CUMPRIDO NA PRIMEIRA (19/09)

Ele jogou e aprovou os cinco pontos:

1. *"o ângulo fica bom de perceber, mas com uma certa dificuldade saudável"*;
2. *"dão tempo"* (as cravadas, com `GIRO_MS` 520);
3. *"o canto: é preciso de uma mecânica de atrair a investida para um lado e descer ou subir no canto na hora
   certa. A salva dificulta de forma saudável"* — **é exatamente a tensão que esta spec buscava**: o canto
   deixou de ser um estacionamento e virou uma jogada de tempo;
4. *"fica boa de lutar, os degraus sobem sim"*;
5. *"está num tamanho ótimo"* (a serra, `ESCALA` 0,46 e `VEL` 150).

**A única troca pedida:** o glóbulo passou da `2b-lasca` para a **`2d-escoria`** — *"quero o glóbulo seja a
escória"*. Já é o padrão de `_instalar-serra.mjs`. ✅ **Jogada e aprovada em 20/09:** *"a escória ficou boa"*.

---

## 9. O que ficou FORA, e por quê

| ideia | por que saiu |
|---|---|
| a investida em **X** (2 travessias diagonais, laser, hitbox no aríete) | a investida atual já tem saída — *"não vamos precisar criar a skill que citei de investir na diagonal"* |
| o **cabo ferindo** | cortaria a arena em dois com uma diagonal móvel; muito fácil de virar injusto |
| a serra **barrando a bala** | fecharia a janela de dano que é o coração da luta |
| a serra **destrutível** | mais coisa para afinar (vida dela, recompensa, o que acontece com o cabo) sem responder nenhuma das duas queixas |
| **miolo exposto durante a investida** | a nave atira para a direita: ele termina atrás dela e não há o que acertar |
| serra e investida **ao mesmo tempo** no fim | duas ameaças de caminho fixo podem fechar o vão juntas |


---

## 10. 20/09 — O TELÉGRAFO DA INVESTIDA E O RASTRO DO GLÓBULO

**✅ TUDO NESTA SEÇÃO FOI JOGADO E APROVADO EM 20/09:** *"joguei e ficou bom"*. O rastro, o aviso novo e a trava
da mira ficam como estão, e **com eles a luta do chefão da Fase 4 fecha**. ⚠️ Se um dia a luta parecer lenta, o
caminho é adiantar a TRAVA (`TELEG_TRAVA` 0,62 → 0,5: mantém a janela e encurta a espera), nunca encurtar a
duração — encurtar desfaz a mecânica de atrair a investida e desviar.

O teste de 20/09 aprovou a escória e a altura do metal e fechou o B2, e deixou dois pedidos que são os dois de
LEITURA — nenhum de mecânica. A luta desenhada na seção 0–9 **não muda**: mesmos ataques, mesma escala, mesmos
degraus.

### 10.1 O aviso da investida

> *"antes da investida, o aviso que é a aceleração do core do guardião precisa estar mais distinta, informar mais
> ao jogador que vai haver uma investida"*

**O diagnóstico não é de duração, é de VOCABULÁRIO.** O telégrafo piscava o sprite inteiro entre `0xffd0d0` e
`0xff6060`; o flash de dano pisca o sprite inteiro em `0xffb090`. São a mesma frase dita com um sinônimo: o
guardião pisca de rosa, e o jogador lê *"acertei nele"*. Nenhuma duração conserta uma frase ambígua.

**O desenho novo separa por TEMPERATURA e por LUGAR.** Dano: o casco ESQUENTA por 60ms. Aviso: o casco ESFRIA
(`CASCO_FRIO` 0x7a8290, que também diz *fechado* — a partir dali a bala morre no casco, porque o `corpoInteiro`
já entrou) e quem acende é o MIOLO, em três camadas que sobem juntas ao longo de `TELEGRAFO_DUR`:

| camada | o que faz | knob |
|---|---|---|
| a **respiração acelera** | `sprite.anims.timeScale` 1× → 5×. É literalmente o que ele pediu, e é a única camada que sobrevive sem partícula nenhuma: se a sheet sumir, o aviso degrada em vez de desaparecer | `TELEG_RESPIRO` |
| o **anel de carga** fecha no miolo | partículas ADD nascendo num anel que encolhe de 26px para 4px, com o sopro acelerando de 55ms para 16ms; na metade final saem DUAS por batida, em lados opostos, senão é cacho e não anel | `CARGA_R0/R1`, `CARGA_MS0/MS1` |
| o **estalo** | no instante do disparo o `glow` solta uma coroa de 14 — a carga SOLTANDO | — |

⚠️ **E a carga ENCOLHE, ao contrário do `glow` do `flutua`, que cresce e se espalha.** É o que impede o aviso de
se confundir com a respiração de repouso: um é matéria sendo puxada para dentro, o outro é o bicho respirando.

⚠️ **`TELEGRAFO_DUR` 0,55 → 0,7s, e isso é janela de desvio, não só leitura.** Uma rampa de 1× a 5× precisa de
~0,7s para o olho perceber que subiu. Se ele achar o desvio fácil demais, 0,55 devolve a janela antiga sem
desfazer a linguagem nova.

⚠️ **Um bug de ordem consertado junto:** o `clearTint` atrasado do dano (60ms) apagava o tint frio quando um
golpe caía no último quadro antes do aviso. Agora ele repõe o `CASCO_FRIO` se o estado for `telegrafo`.

### 10.2 O rastro do glóbulo

> *"a escória ficou boa, mas pode gerar um efeito de rastro do projétil, como fumaça ou algo incandescente"*

Um sopro por quadro na CAUDA de cada glóbulo (6px atrás pela rotação, para não engolir a própria silhueta), com
UM emissor de cada família para todos eles — nunca um por bala. Quem tem rastro é decidido pela TEXTURA
(`globuloGuardiao`), não por uma lista de referências: o pool de balas é compartilhado com os inimigos comuns e
uma lista envelheceria mal. Cada bala carrega o próprio relógio, senão o rastro engrossaria junto com a salva.

**Duas medidas mandaram no resultado, e as duas derrubaram a primeira versão:**

1. **fumaça FRIA some.** A primeira tentativa usou a crosta da escória (0x24343c/0x1c292d, blend NORMAL — as
   cores mais claras do próprio PNG) e a captura não mostrou absolutamente nada: a pintura da arena é vermelho
   escuro de luminância parecida. A lei do dark sci-fi é *luz só onde há energia*, e o glóbulo **é** energia — a
   saída não é clarear o rastro, é fazê-lo QUENTE. A fumaça virou ADD de tom BAIXO (0x4a2e22/0x3a241c): soma um
   véu de calor, não um clarão;
2. **espaçamento é o que faz rastro ser rastro.** Com um sopro a cada 2 quadros a brasa nascia a cada ~7px e a
   foto mostrava uma fileira de pontos (só 3 vivas por glóbulo). Um sopro por quadro põe a brasa a cada ~2,5px e
   mantém ~25 vivas: aí o rastro tem corpo e afina para trás sozinho, pela escala e pelo alpha.

**Comprimento:** ~40px a 150px/s. É comprimento de MUNIÇÃO — cometa é assinatura de chefão, e o glóbulo não é o
chefão.

### 10.3 O B2, fechado sem código

> *"a posição do guardião está ótima, pois os cabos 'fixam' no topo e se ficarem mais baixos ou fora da posição,
> mostra o corte do sprite"*

A razão importa mais que o veredito: o alto-direita não é preferência, é **onde os cabos encontram a borda de
cima** — e é a borda que esconde o corte do sprite de 256². Descer o guardião expõe o corte. Os tentáculos
batendo no teto, que estavam na lista como defeito, são o acabamento.

### 10.4 A respiração em ondas

> *"o core pode chegar a se apagar, mostrando um movimento de respiração em ondas, normal"*

Os quadros 6–8 da `guardiao-idle`, em que a área acesa do miolo cai de ~1.560px para 120–307px, **são o desenho**.
Deixa de ser item de julgamento.

### 10.5 A CARGA E A TRAVA DA INVESTIDA (o 7º teste, 20/09)

> *"o timing da investida está muito curto, preciso que aumente o tempo de carga para a investida, assim o
> jogador consegue usar a mecânica que citei: esperar até o último segundo de carregamento para travar o boss
> numa direção e ter tempo de desviar para os cantos"*

A mecânica é a da seção 2 e do G3 do teste de 19/09 — *"é preciso de uma mecânica de atrair a investida para um
lado e descer ou subir no canto na hora certa"*. **Ela não existia.** A mira era tomada no instante do arranque
(`setVelocity` lia `target.y` no mesmo quadro em que a investida saía), então não havia momento nenhum em que o
guardião estivesse comprometido e ainda parado: esticar a carga só daria mais tempo de esperar pela mesma
armadilha. *Atrair* pressupõe uma trava, e a trava não existia.

**O telégrafo passou a ter dois tempos** (`TELEGRAFO_DUR` 0,7 → **1,15s**, `TELEG_TRAVA` **0,62**):

| tempo | o que acontece |
|---|---|
| 0 → 62% · 0,71s | CARREGA e ainda lê a nave: o anel fecha de 26px a 4px, a respiração sobe de 1× a 5× |
| a TRAVA · 62% | a mira CRAVA em `vyTravado`. **Três sinais no mesmo quadro**: o corpo RECUA (`RECUO_VEL` 45 por `RECUO_MS` 0,18s — ele puxa para trás antes de saltar), o core estala (coroa de 10) e a câmera treme |
| 62% → 100% · 0,45s | a JANELA DE FUGA. A carga para de fechar e SEGURA; a respiração fica cravada em 5× |

⚠️ **A virada tem de ser VISÍVEL, senão a jogada não existe:** ele precisa saber quando parou de valer a pena
ficar no lugar. Por isso a trava não é só um campo mudando de valor — é um recuo no corpo, um estalo no core e
uma carga que muda de comportamento.

**Medido** (`scripts/_f4/_medir-investida.mjs`): **450ms de janela + 760ms de travessia = 1210ms** de desvio,
contra 760ms. A 110px/s são **133px** contra 83px, num vão de 160px com um corpo de 133px — a diferença entre
*dá se for perfeito* e uma mecânica.

⚠️ **O discriminador da sonda:** a nave espera em y=170 (vy +70), a sonda aguarda a trava e TELEPORTA a nave para
y=40 (que daria vy −70), e o arranque tem de sair com **+70**. Mira travada é comportamento; comportamento se
prova com um discriminador, não com uma foto.

⚠️ **Isto mexe na DIFICULDADE**, não só na leitura: cada investida ganhou 0,45s de tempo seguro. Se a luta ficar
lenta, o caminho é **adiantar a trava** (0,62 → 0,5 mantém a janela e encurta a espera), nunca encurtar a
duração — encurtar desfaz a mecânica.

⚠️ **E uma medida de arte no caminho:** mantendo o ritmo da carga (16ms, dois sopros por batida) no raio mínimo,
chegavam 30 partículas empilhadas no mesmo pixel e o ADD saturava em BRANCO no miolo. Branco não existe nesta
arte. Depois da trava é um sopro a 26ms (`CARGA_MS_TRAVA`) com o raio abrindo de leve: 7–9 vivas.

### 10.6 Ferramentas

`scripts/_f4/_ver-aviso.mjs` — o rastro e o aviso numa folha só, cada foto rotulada pelo estado do JOGO: o `k` da
carga, o `timeScale` da respiração, a `MIRA TRAVADA` e as partículas VIVAS de cada emissor. ⚠️ Contar partículas
é o que separa *"o rastro não aparece na foto"* de *"o rastro não foi emitido"* — e `emitter.alive` é a LISTA de
partículas, não o número; quem dá o número é `getAliveParticleCount()`. ⚠️ A duração sai da CLASSE
(`b.constructor.TELEGRAFO_DUR`), nunca cravada no script: ela já mudou três vezes (0,55 → 0,7 → 1,15) e um rótulo
com o número velho mente sobre a porcentagem da carga.

`scripts/_f4/_medir-investida.mjs` — a sonda da trava e da janela (ver 10.5). ⚠️ O laço da fuga roda DENTRO da
página, num `requestAnimationFrame`: mover a nave a partir do Playwright custaria um round-trip de 100–300ms por
passo, e a janela inteira tem 450ms.
