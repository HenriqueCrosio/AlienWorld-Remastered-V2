# O GUARDIÃO PRESO — a coleira, o leque de lava, os cabos-serpente e o próprio Leviatã

> 22/11. Aprovado por ele seção a seção (brainstorming). A frente 0 do rebalanceamento (o START
> `plans/2026-11-21-rebalanceamento-START.md`, §4.2). A luta de origem: `specs/2026-09-19-fase4-luta-guardiao-design.md`.
> ⚠️ **Muda a estrutura da luta, por decisão dele** — o escopo "só visual, cadência e estilo" da frente 0 valia para a
> Capitânia; no Guardião ele jogou e viu: *"o guardião é praticamente inútil, a única mecanica é a serra e os tiros em
> leque sempre no mesmo lugar"*. E: *"é o boss final, justo ter uma luta mais longa"*.

## 1. Por quê

- **A investida** (*"quase sem sentido, igual a enguia antigamente tinha"*): a imagem inteira desliza para a esquerda a
  300 px/s até x = 70 e volta reta a 150 px/s. Os tubos que prendem o Guardião — pintados no desenho, subindo para a
  borda de cima — viajam com ele como se não estivessem presos a nada. É o defeito da serpente de 29/10: o desenho parado
  andando pela tela.
- **A salva** sai sempre centrada em 180° (`leque()`: `180 - abre/2 + i/(n-1)*abre`), sem mirar: o mesmo lugar sempre.
- **Só a serra** tem mecânica e janela de dano.

## 2. A ideia dele

*"os cabos que o prendem cheguem num limite e trave o guardião de avançar mais, dando um tranco nele. Como se fosse um
cachorro raivoso que vai atacar e é travado por uma coleira presa"* — e, no tranco, ele lança algo sobre a nave. Mais:
*"uma surpresa do arsenal, já que está dentro de um ser biomecanico e guarda seu core"* — três ações novas (o aperto, o
teto que sangra, os cabos-serpente, este o desenho dele: saem DO GUARDIÃO, não do teto).

## 3. As decisões (as escolhas dele)

| Pergunta | Escolha |
|---|---|
| Até onde a coleira deixa ir | **o meio da arena** — a mordida para antes da nave à esquerda; a ameaça é o lançado |
| O que sai no tranco | **a lava do miolo**, por inércia, em arco com a gravidade da F4 |
| Como os cabos contam a história | **os cabos no motor** (recortados do desenho, desenhados em jogo como corda presa ao teto) — *"com a mesma cor e textura dos cabos que retiramos do desenho. Assim, podemos esticar e adicionar os efeitos que quisermos neles"* |
| O padrão da lava | **leque com vão** — *"seguir a lógica dos nossos chefões → desenhar um padrão para o jogador desviar"* |
| As ações novas | **o aperto + o teto que sangra + os cabos-serpente** |
| Como se distribuem | **uma camada por degrau** — quebra a regra de 19/09 ("nada novo nos degraus"), decisão dele |

## 4. A coreografia da investida presa (camada 1)

1. **A carga** — 1,15 s, como hoje (`TELEGRAFO_DUR`): a respiração acelera, o casco esfria, o anel fecha. Na trava
   (`TELEG_TRAVA` = 0,62) o corpo recua e os cabos da coleira **recolhem frouxos com ele** (o cachorro tomando impulso).
2. **A investida** — a 300 px/s, na altura mirada na trava (como hoje). Os cabos vão das curvas frouxas a diagonais.
   **O alcance é o comprimento dos cabos**: um raio fixo do ponto preso no teto acima da estação; o focinho para por
   volta de **um terço da tela** (o número exato sai da maquete; a nave à esquerda dele escapa da mordida).
3. **O tranco** — os cabos esticam num quadro; o corpo para seco, passa 3–4 px e é puxado de volta; uma onda de vibração
   sobe pelos cabos até o teto; a câmera dá um solavanco curto; **sai o leque de lava** (§5).
4. **A volta** — os cabos o recolhem: rápido no começo e assentando no fim (um elástico, não mais a reta de 150 px/s).
   Chega na estação com os cabos frouxos.

**Não muda:** o corpo fechado na investida (`corpoInteiro`: o tiro morre no casco), as pausas por degrau (4,2 · 3,4 ·
2,6 s). **Muda de propósito:** a investida não termina mais atrás da nave — termina no meio; quem empurra é a lava.

## 5. O leque de lava e a salva mirada (camada 1)

**O leque, no tranco:** 5 gotas grossas saem do miolo em leque (do alto para baixo, apontando para a esquerda), no
quadro em que os cabos esticam. Caem em arco com `Predador.LAVA_G` (260) e cruzam a metade esquerda em ~1 s.
- **Um VÃO** por leque: o espaço de uma gota tirada, ~30 px de corredor, **sorteado** a cada investida.
- Nos degraus: 6 gotas (66–33%), 7 (33–0%); o vão segue um só, o leque mais denso em volta.
- A arte: a bola de lava da Besta em escala menor, com o rastro quente dos glóbulos; na borda, o estilhaço de lava que
  já existe. Dano 1.

**A salva mirada:** a mesma abertura (96°), o mesmo número por degrau (3, 4, 5), a mesma cadência (1,8 s); o **centro
aponta para a nave** no disparo. Com número par (o 4) o vão do meio cairia em cima da nave: aí o centro ganha um desvio
sorteado de meio passo, para não virar ponto seguro.

## 6. Os cabos-serpente (camada 2, de 66% em diante)

- **De onde:** as de cima saem do **feixe de cabos do alto das costas** e contornam pela borda de cima; as de baixo saem
  dos **tentáculos de baixo** (os que pingam, que ficam pintados — a serpente nasce da ponta deles) rente à borda de
  baixo. O material: a mesma corda da coleira (§9); a ponta, a ponta pintada do tentáculo recortada do desenho.
- **O caminho:** o cabo cresce do corpo e corre pela borda como cobra na parede, ondulando, até ficar à frente da nave
  (o desenho dele: curvas largas por cima e por baixo, as cabeças vindo da esquerda).
- **O ensaio:** a cabeça se ergue, balança e finta uma ou duas vezes, de olho na nave.
- **O bote:** a cabeça para de balançar e **enrijece ~0,4 s** (a trava — a linguagem da investida), dispara **reta até
  onde a nave estava na trava**, recolhe e volta pelo mesmo caminho para dentro do corpo.
- **Machuca:** só a cabeça e o trecho esticado do bote. O corpo encostado na borda não — numa camada atrás da nave e
  mais escuro, como o cabo da serra.
- **Quantas:** 66–33% duas (uma de cima, uma de baixo), botes alternados (uma ataca enquanto a outra ensaia); 33–0%
  três, ensaio mais curto.
- **Fora, para depois:** acertar a cabeça para fazê-la recuar (a primeira coisa a pôr se faltar ação na maquete).

## 7. O próprio Leviatã (camada 3, de 33% em diante)

Nas duas, a causa visível é a COLEIRA: ele "opera" o hospedeiro pelos cabos do teto.

**O aperto (peristalse):**
- O aviso: um puxão forte — os cabos esticam para cima, o corpo se firma, a borda inteira estremece ~0,6 s.
- A onda: uma **constrição corre da direita para a esquerda** — as bordas de cima e de baixo incham para dentro no mesmo
  ponto, fechando o corredor até um **vão de ~50 px** (nunca menos), que passa pela tela em ~2,5 s. A nave atravessa o
  anel pelo vão, ou fica à frente dele.
- A técnica: cada COLUNA de pixels da faixa pintada desloca um número INTEIRO de pixels num perfil de onda — nada se
  estica nem se redesenha; o pixel segue nítido.
- O contato **empurra, não tira vida**; durante a onda **não sai a salva** — o vão é o desafio inteiro.

**O teto que sangra:**
- O aviso: ele bombeia pelos cabos — um pulso aceso sobe até o teto e se espalha pela borda; **4–6 pontos** da borda de
  cima (sobre os 2/3 da esquerda) incham e acendem ~0,8 s.
- A queda: cada ponto solta uma **coluna reta** de gotas grossas (gravidade, sem arco — nada empurra para o lado). **Duas
  ondas alternadas**: a 2ª, 0,7 s depois, cai nos vãos da 1ª. Na borda de baixo, respingo.
- O material: **o sangue quente do hospedeiro** — vermelho mais escuro e viscoso que a lava do miolo; a gota estica
  antes de soltar (não se confunde com o leque laranja, em arco, que sai dele). Dano 1.

## 8. O rodízio e a janela de dano

| Vida | Ordem (a salva mirada segue no `flutua` entre elas) |
|---|---|
| 100–66% | investida presa (+ leque) → serra → … |
| 66–33% | investida → serra → serpentes → … |
| 33–0% | investida → serpentes → aperto → serra → teto que sangra → … |

**A janela de dano:** toda ação em que ele fica na estação operando os cabos **abre o miolo** — a serra (hoje), as
serpentes, o aperto, o teto. A investida segue fechada. **A vida** (90) não muda aqui: vai para a frente 5 com a medição
(§11) — se ele morrer antes da camada 3, é número para lá.

## 9. A arte: o recorte e a corda

- **O recorte:** os cabos da coleira (o feixe do alto) saem das quatro artes, cortados na RAIZ junto ao casco: o
  `guardiao.png`, os 9 quadros da `guardiao-idle-sheet`, os 9 da `guardiao-morte-sheet`, o `guardiao-destruido`. **Só
  se apaga** — nada redesenhado. Depois, a prova pixel a pixel: fora da máscara, idênticas. Os originais vão para
  `assets/raw/guardiao-com-cabos/`.
- **A corda:** a SEÇÃO do cabo pintado amostrada da arte — o contorno escuro, o corpo, a borda acesa, e os anéis que se
  repetem ao longo do comprimento. Desenhada em jogo **na resolução da tela, pixel a pixel**, seguindo a curva, com essas
  cores e esse padrão: nunca linha vetorial (`Graphics`) nem imagem esticada. Por baixo, cada cabo é uma corrente de nós
  com comprimento máximo — o limite é o tranco, e dá de graça o frouxo, a vibração e o recolher. As serpentes: a mesma
  corda, a cabeça puxando e o corpo seguindo o caminho dela.
- **Na morte:** os cabos da coleira ARREBENTAM no golpe final, chicoteiam e se recolhem para o teto.
- O tratamento de imagem (a Atmosfera da F4) vale para a corda como para o resto da cena.

## 10. A ordem do trabalho (cada passo: GIF em jogo, velocidade real, o veredito dele)

1. O recorte + a corda + a investida presa com o tranco (a base de tudo) — 2–3 variações do tranco (mais seco, mais
   elástico, mais vibração).
   **22/11, veredito: o tranco A (seco)**, o padrão (`TRANCOS.A`). Duas correções vindas dele: (a) na ENTRADA a corda presa
   no máximo chegava reta e deitada na raiz, e a ponta cortada saía do toco → o máximo só segura na investida, a folga é
   em px (a da estação) e o cabo sai do toco pelo eixo dele (`Corda.saida`, 5 px); (b) os CABOS DE TRÁS (os que a arte
   arrasta para a direita) acabavam na borda do quadro e, na parada, ficavam presos em nada → cada ponta da coluna x=255
   vira corda até o hospedeiro (fora da tela à direita, ou o teto), com a raiz seguindo o quadro da respiração
   (`RAIZES_TRAS`, de `_amostrar-cabo.mjs`). Folha: `folhas/2026-11-22/guardiao/`.
2. O leque de lava + a salva mirada.
   **22/11, feito, ESPERANDO O VEREDITO** (plano `plans/2026-11-22-guardiao-coleira-passo2.md`; `lavaGuardiao.ts`,
   `padroes.ts`). Fixado na implementação: as gotas a 18 px na coluna x = 40 (8 px livres; a nave tem 9), o vão com
   26 px livres, nunca na ponta; T = 1 s até a coluna; **o leque centra na altura da nave** no tranco; o arco de cima
   nunca toca o teto (o leque desce); **na borda só respingo** (sem estilhaço que fira). Os dois "centra na nave" e
   "respingo" são decisões minhas, a confirmar com ele.
3. Os cabos-serpente.
4. O aperto.
5. O teto que sangra.
6. Os sons novos (o tranco, a serpente, o aperto, o teto — primeiro com a biblioteca) e ele jogando a luta inteira.

Enquanto ele joga: a cópia na 5174 (memória `filmagem-vite-recarrega`).

## 11. Os testes e a medição

- **Regras (puros):** o leque sempre deixa um vão ≥ a altura da nave + folga, em qualquer sorteio; o anel do aperto
  nunca fecha abaixo de 50 px; as duas ondas do teto nunca se sobrepõem; o alcance da coleira é fixo; o rodízio por
  degrau.
- **Em jogo:** forçar a vida pelos três degraus e conferir a ordem das ações; a prova do recorte (os pixels fora da
  máscara).
- **A medição:** `scripts/_rebalance/medir-guardiao.mjs`, no molde do `medir-capitania.mjs` — as ameaças na tela (média,
  pico) e o tempo de janela de dano por camada.

## 12. Fora desta spec

A vida do Guardião (frente 5); a Besta (§4.3 do START, depois desta); acertar a cabeça da serpente (§6).
