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

## 5. Os pulsos de lava e a salva mirada (camada 1)

> ⚠️ **22/11, REESCRITA pela direção dele** (o leque com UM vão sorteado, a 1ª versão do passo 2, saiu): *"eu priorizo
> muito a perspectiva de bullet hell, ou seja, são formatos mais geométricos que induzem o jogador a ler o ataque, cobra
> quem demora ou não percebe o padrão. Já utilizamos isso em vários bosses e inimigos do jogo."* O leque sorteado era só
> reação: não havia forma a aprender nem preço para quem demora.

**Os pulsos alternados, no tranco:** a inércia arranca a lava do miolo em PULSOS de raios **retos** (sem gravidade: a
figura tem de ler), em ângulos **fixos** (`angulosPulso`, `padroes.ts`):
- O pulso **A** tem 7 raios a 10° um do outro; o **B** tem 8, deslocado meio passo — cai nos vãos do A. Por degrau:
  A, B (100–66%) · A, B, A (66–33%) · A, B, A (33–0%, na MESMA velocidade — 23/11, ele).
- O eixo da figura aponta para o **meio da borda esquerda** da arena (com o eixo horizontal e o miolo baixo, o alto da
  tela inteiro ficava seguro). A figura é sempre a mesma; só a altura muda, com a parada.
- **Ele SEGURA na parada** enquanto os pulsos saem (a escolha dele, entre SEGURA e RECUA no GIF lado a lado): a corda
  tensa e um mini-tranco a cada pulso (`MINI_TRANCO`), e só 0,15 s depois do último a volta elástica. Recuando, a fonte
  andava e os arcos deixavam de ser concêntricos (medido: a nave parada levava lava nas 2 investidas segurando, em 1 só
  recuando).
- **A velocidade dele, jogando:** 200 px/s e 0,3 s entre pulsos *"está bem rápido"*; com `?lavaVel=160&lavaEntre=0.4`,
  *"achei mais interessante as duas juntas"* → **160 px/s e 0,4 s, nos TRÊS degraus**. O último a 190 px/s · 0,32 s (a
  proporção de antes, decisão minha) saiu em 23/11 — ele: *"tem que manter igual aos outros, exatamente por conta da
  dificuldade da parede. Mesmo do jeito que está hoje, está difícil desviar"*. O aperto do fim vem das camadas 2 e 3, não
  da lava. Os dois parâmetros da URL ficam para calibrar.
- **A parede não protege** (ele: *"a nave pode ir até na linha da tela, ou seja, as lavas precisam passar a parede para
  punir quem tenta ficar embaixo ou em cima. Só que deixe efeitos que a lava bateu"*): na borda da arena a gota respinga
  (as brasas e o som do impacto) e SEGUE até sair da tela. A regra do casco da F3.
- **A geometria (medida):** na coluna da nave (x 40–80) o vão livre de um pulso é de ≥ 11 px (a nave tem 9 de altura);
  parado, na tela inteira até x ≈ 80, o maior fio seguro é de 7 px, nos cantos. Perto do Guardião os raios se fecham num
  muro. De x ≈ 90 em diante (colado nele) os 7 raios não alcançam os cantos de cima e de baixo da tela — um bolsão parado
  de 10 a 39 px na cara dele. **FICA (23/11, ele):** *"é muito arriscado ir para esse spot pequeno"* — nada de 9 raios.
- A arte: a bola de lava da Besta em escala menor, com a luz dela; a **brasa no vermelho do MIOLO** (ele: *"a brasa pode
  ser mais avermelhada, como o core dele"*; amostrada da arte: `#f85732`, `#e4270f`, `#ce1c0b`, `#8f150e`), com metade da
  densidade, para o rastro não borrar a figura. Na borda, só respingo (sem estilhaço que fira). Dano 1.

**A 1ª versão (registro):** 5/6/7 gotas em arco com `Predador.LAVA_G`, a 18 px na coluna x = 40, um vão de 26 px
livres sorteado e o leque centrado na altura da nave.

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
   22/11, a 1ª versão (plano `plans/2026-11-22-guardiao-coleira-passo2.md`): o leque em arco com UM vão sorteado,
   centrado na nave. **22/11, o veredito: REFEITO como bullet hell** (a §5 reescrita) — os PULSOS ALTERNADOS de raios
   retos e ângulos fixos (A 7, B 8 meio passo), ele SEGURA na parada (a escolha dele, SEGURA × RECUA no GIF), a
   velocidade dele jogando (160 px/s e 0,4 s), a brasa no vermelho do miolo, e a lava ATRAVESSA a parede (respinga e
   segue). A salva mirada ficou como estava. **23/11, as duas perguntas fechadas:** o bolsão colado nele FICA (*"é muito
   arriscado ir para esse spot pequeno"*), e o último degrau ficou IGUAL aos outros, 160 px/s · 0,4 s (*"exatamente por
   conta da dificuldade da parede. Mesmo do jeito que está hoje, está difícil desviar"*). **O passo 2 FECHOU.** Folha
   `folhas/2026-11-22/guardiao/` (rodadas 2 e 3).
3. Os cabos-serpente.
   **23/11, a rodada 1 no jogo** (plano `plans/2026-11-23-guardiao-coleira-passo3.md`): `entities/guardiao/serpente.ts`
   (puro: o trilho pela borda, as fases cresce → ensaio → trava 0,4 s → bote reto → recolhe → volta, um bote por vez) e
   `camadaSerpentes.ts` (a mesma corda, depth −0,39, o corpo a 75 % do tom, a cabeça e o trecho do bote claros, círculos
   no `perigos`); o rodízio por degrau (`proximaAcao`). Medido: a nave parada leva todos os botes (4 · 6), a que sai de lado
   na trava, 0. **Decisões minhas em aberto:** a cabeça é a ponta afilada da corda (os tentáculos de baixo saem pela borda
   do quadro: não há ponta pintada para recortar); estacionar 30 px à esquerda da nave (a 3ª, 80); os números (bote 400
   px/s até 190, 2 botes, ensaio 1,1/0,7 s); a 3ª pelo feixe de trás. Folha: rodada 4.
   **23/11, a correção dele (o desenho):** *"as serpentes saem do próprio guardião"* — a corrida pela borda SAIU. Cada uma
   sai do corpo num ARCO LARGO (a de cima: do alto do domo, sobe quase até o teto e desce; a de baixo: de baixo do corpo,
   desce quase até o chão e sobe) e a cabeça fica POSTADA À FRENTE DELE — medido no desenho: (183, 54) e (178, 128) — fixa,
   e o bote sai do posto (alcance 260 px: a metade esquerda inteira). Medido: parada leva todos (4 · 6), lendo 0. **Em
   aberto:** a cabeça, a 3ª serpente (fora do desenho dele: feixe de trás, posto (150, 90)), os números, o tom.
   **23/11, rodada 3 (ele: *"um pouco mais finas… os ataques quebram, formam ângulos retos… comportamento de serpente,
   mais natural e fluido"*):** 5 px (eram 7); o corpo é UMA CURVA SÓ — o arco e um pescoço em cúbica com a tangente
   contínua até a cabeça (a quina nascia na emenda pescoço → reta do bote); os arcos chegam ao posto na HORIZONTAL (o traço
   final do desenho dele); no ensaio ela se enrola para dentro do próprio corpo (S), o pescoço serpenteia, uma onda corre o
   corpo inteiro, a direção da cabeça vira sem estalo, e ao recolher o trecho do bote relaxa ondulando. A regra medida: o
   corpo nunca dobra mais de 40° a cada 4 px (`DOBRA_MAX`; `scripts/_guardiao/_dobra.mjs` mede por fase).
   **Rodada 4 (ele: *"gostei desse… a serpente de baixo sai do nada, quero ela… atrás do corpo"*):** a raiz de baixo caía
   num pixel transparente da arte (o vão entre os tentáculos); agora (84, 67) = (212, 195) do PNG, dentro da faixa de
   tentáculos opaca nos 9 quadros, no ponto que ele circulou. A prova: `scripts/_guardiao/_raiz-verde.mjs` (a camada das
   serpentes em verde, só na foto). Regra: **raiz de corda se confere na transparência da arte, quadro a quadro**.
   **Rodada 5 (ele: *"quero que ela saia de trás do guardião, como eu disse"*):** a faixa de tentáculos é opaca mas escura
   como o fundo — a corda ainda lia nascendo no vazio. O traço dele sobe até (332, 148) na tela = a BORDA DE BAIXO DA
   CARCAÇA (183, 185 do PNG). A raiz agora é (58, 40) = (186, 168), DENTRO da carcaça; a corda desce escondida e aparece
   saindo de baixo da borda, na vertical (`c1` = (330, 240)). Regra: **"sair de trás" = sair de trás de uma parte que LÊ
   como corpo**, não de qualquer pixel opaco. **As respostas dele:** a cabeça fica (a ponta afilada); o tom fica (75 %);
   a 3ª serpente SAIU — no último degrau as mesmas duas com mais botes (2 por serpente aos 66–33 %, 3 aos 33–0 %: o 3 é
   decisão minha, perguntada). Medido: parada leva 4 · 6, lendo 0; ~8,2 s e ~10,2 s de ação. Folha: rodada 5.
   **Rodada 6 (ele: *"depois que saem, os cabos ficam presos e o guardião continua se movendo menos — quero que os cabos
   acompanhem essa reduzida de movimento, mas continuem acompanhando o guardião"*; e o último degrau: *"duas serpentes, 2
   botes cada"*):** a raiz era calculada uma vez, na saída, e ficava pregada enquanto o corpo assentava na base. Agora as
   raízes vão com o corpo (`Serpente.desvio`: inteiro na raiz, some suave até o começo do pescoço; a cabeça no posto e o
   que fere não mudam), e ele segue a mesma onda do flutuar com o balanço REDUZIDO (`SERPENTE_BALANCO` 0,35: 16 → ~5 px),
   a amplitude descendo e voltando suave. 2 botes por serpente nos DOIS degraus (o 2º muda só o ensaio). Regra: **tudo
   que sai do corpo dele vai com o corpo** — nada calculado uma vez e pregado. Folha: rodada 6.
4. O aperto.
5. O teto que sangra.
6. Os sons novos (o tranco, a serpente, o aperto, o teto — primeiro com a biblioteca) e ele jogando a luta inteira.

Enquanto ele joga: a cópia na 5174 (memória `filmagem-vite-recarrega`).

## 11. Os testes e a medição

- **Regras (puros):** os pulsos: A e B fixos (o B no meio de cada vão do A), parado nenhum fio seguro > 7 px na tela
  inteira até x = 80, lendo um vão ≥ 11 px livres na coluna da nave (`test-guardiao-padroes.mjs`); em jogo, ele segura
  na parada, os pulsos concêntricos e retos, a lava atravessa as bordas e acerta a nave parada em 5 alturas, da linha de
  cima à de baixo (`test-guardiao-lava-jogo.mjs`); o anel do aperto
  nunca fecha abaixo de 50 px; as duas ondas do teto nunca se sobrepõem; o alcance da coleira é fixo; o rodízio por
  degrau.
- **Em jogo:** forçar a vida pelos três degraus e conferir a ordem das ações; a prova do recorte (os pixels fora da
  máscara).
- **A medição:** `scripts/_rebalance/medir-guardiao.mjs`, no molde do `medir-capitania.mjs` — as ameaças na tela (média,
  pico) e o tempo de janela de dano por camada.

## 12. Fora desta spec

A vida do Guardião (frente 5); a Besta (§4.3 do START, depois desta); acertar a cabeça da serpente (§6).
