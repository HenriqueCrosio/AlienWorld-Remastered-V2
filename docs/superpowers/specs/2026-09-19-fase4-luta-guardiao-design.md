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
escória"*. Já é o padrão de `_instalar-serra.mjs`. ⏳ **Ele ainda não viu a escória em jogo** — é o item E1 do
teste curto da 🚦 no START.

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
