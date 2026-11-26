# A BESTA REFEITA — a sede, a volta, os olhos no escuro e o coração que para

> 24/11. Aprovado por ele parte a parte (brainstorming). Fecha a frente 0 do rebalanceamento (o START
> `plans/2026-11-21-rebalanceamento-START.md`, §4.2), depois do Guardião (`specs/2026-11-22-guardiao-coleira-design.md`).
> A luta de origem: `specs/2026-09-16-fatia7-b3-predador-design.md`. As folhas do dia:
> `folhas/2026-11-24/besta-analise/` (o que existe hoje, medido no jogo) e `folhas/2026-11-24/besta-desenho/` (este
> desenho em diagramas). O código de hoje: `src/entities/Predador.ts` (a Besta) e `src/entities/BossNucleo.ts` (a troca).

## 1. Por quê

Ele jogou e viu o golpe (o salto + os dois cortes) passar pela nave no canto de cima à esquerda: *"a besta cola e pula e a
garra passa pela nave. Isso precisa ser revisto, pode ser que travar a besta antes inutilize a skill dela"*. A análise
(folha `besta-analise`) mediu isso e achou mais:

- **§1 o golpe:** o corpo do golpe é um retângulo fixo do tronco (`corpoInteiro()`), e o salto é limitado (`golpear()`:
  `Clamp(alvoY − MIOLO.luta.y·escala, 70, chão)`). O topo do corpo para em y = 23. **A nave no canto: 0 dano**; **a nave
  que sobe durante a corrida: 0 dano**; a nave no meio: 21 quadros de toque.
- **§2 o galope:** o core e a luz ficam na altura da pose em pé, sobre o ombro.
- **§3 a lava do teto:** o clipe pinta a própria bola (quadros 10–16) e o motor lança outra: duas bolas.
- **§4 a ronda:** para a direita (e a saída) é a pose parada `predadorLuta` com um pulinho em seno; de teto a teto, o
  balanço deslizando; a descida é a agarrada AO CONTRÁRIO.
- **§5 o rasgo:** a onda de fogo pintada (quadros 12–16) não fere.
- **§6 o breu:** no galope e no golpe o core volta ao pulso lento (base 0) — o ataque mais perigoso passa no escuro.
- **§7 o visual:** 12% dos pixels dela passam de meia luz (o Guardião 1%, a Serpente 5%, a Capitânia 0,3%) — o osso e o
  vermelho acesos contra a regra do dark sci-fi; desenhada a ~0,55 (o Guardião a 0,70), as garras finas se partem.
- **A luta:** dois verbos sorteados 50/50 (`escolherAtaque`), tudo mirado na nave, sem trava, 180 de vida (~15 s com
  uma mão mediana) — o breu, o melhor dela, mal aparece. Fizemos a apresentação de chefão final e a luta de
  mini-chefão.

## 2. As decisões (as escolhas dele)

| Pergunta | Escolha |
|---|---|
| Como consertar | **C** — os defeitos + a ronda com animação nova + ordem fixa + trava por fase + vida nova |
| A ambição | **B** — refinar e escalar: uma assinatura por fase, o breu é o ápice |
| O tipo do bicho | **fica** demônio de carne e osso, nada biomecânico — *"a besta está presa por um motivo"* |
| O tema | perto da **(c)**, como tempero: ela era a energia que movia o Guardião; a luz é dela |
| A duração | **≈ a do Guardião**; uma trava por fase; o breu é a fase mais longa (≈ 30/30/40% do tempo) |
| As assinaturas | **mecânicas que o jogo ainda não tem** — *"Eu preciso de mecanicas e padrões novos"* |
| O visual | escurecer o osso e o vermelho (acesos só o core, a lava, a boca); as garras pensadas para o tamanho de jogo |

**O que o jogo já usa (fica de fora):** leque com vão (Torre, Guardião — que até usa `Predador.LAVA_G`), anel
(aranha, flak), espiral e faixa segura (a enguia), coluna do teto (Guardião, casulos), feixe varrendo (Serpente), bote
mirado no passado (quase todos), parede que aperta, lacaios, o eco do próprio caminho, lentidão (esporos), escuridão.
**O que ninguém usa (onde entra):** absorver e devolver os tiros do jogador (a sede); a sala que muda de forma com ela
pela borda (a volta); isca com regra de leitura (os olhos no escuro); mexer no tempo (o coração para). *(25/11: "atacar
por trás" saiu — ele: "acho injusto a besta subir na parede da esquerda, pois a nave não vira o nariz para trás".)*

## 3. A estrutura

Três fases pela vida, cada uma com a **ordem fixa** de ataques (sai o sorteio) e uma **trava**: a vida não passa do
limite da fase enquanto a assinatura não tiver aparecido — o tiro a mais bate no osso (faísca, sem vida), como os
degraus do Guardião. A janela de dano em dobro da recuperação fica.

| Fase | Vida | Ordem (↻ repete) | Trava |
|---|---|---|---|
| 1 — o chão | 100–66% | lava → golpe → **sede** → golpe ↻ | uma sede com devolução |
| 2 — a volta | 66–33% | golpe → lava → **a volta** (termina no rasgo) ↻ | uma volta inteira |
| 3 — o breu | 33–0% | **olhos no escuro** → golpe → lava → **olhos no escuro** → **coração para** ↻ | não morre antes do coração parar |

- **A lava** (todas as fases) deixa de ser mirada: ela **arremessa 3 bolas em arco** (a gravidade da F4) que caem em
  **pontos fixos do chão**, alternando entre duas figuras (ponto de partida: x = 60/130/200 e 95/165/235). Cada uma
  respinga uma coluna para cima e deixa uma poça curta (~0,8 s). Do teto, o mesmo arremesso de cima. A lava domina o
  chão e empurra a nave para cima — onde o golpe pega.
- **O golpe** segue mirado no passado (a altura no fim da carga). Ganha a garra que fere quadro a quadro, o salto
  livre até o teto e uma linha de parada fixa longe da parede (ponto de partida x ≥ 90 para o centro dela). **O canto
  deixa de ser abrigo; foge-se trocando de altura na corrida.**
- **No breu** o core fica no nível de aviso em todo estado de ataque.
- **O surgimento, o urro e a morte** (o piso cede, a lava engole) ficam como estão.
- **A vida** sai da medição no rebalanceamento (a tecla 8, §7). Até lá, um valor provisório que dê ≈ a duração do
  Guardião com a mão mediana.

## 4. As assinaturas

Os números são o ponto de partida; a medida certa sai dos testes, como no Guardião.

### 4.1 A sede (fase 1)

- Plantada numa âncora do chão, o peito abre e o core acende **um anel** (o clipe "a sede: abrir"). Enquanto o anel
  está aberto (ponto de partida 2,0 s), **todo tiro do jogador que entra no anel some nele** — sem dano — e o core vai
  tomando a cor da arma.
- Cada tiro bebido guarda **a linha por onde chegou** (a origem e a direção). No tranco (o clipe "a sede: devolver"),
  ela **devolve cada um pela mesma linha, ao contrário**, na ordem em que entraram, em ~0,6 s. Quem atirou parado recebe
  uma parede naquela altura; o espalhamento volta em leque. A figura é o jogador que desenha.
- **O teto:** no máximo 24 devolvidos (agrupados por linha: tiros da mesma linha a < 4 px viram um). O resto se apaga
  no core. Os projéteis de carta (o explosivo, o elétrico) voltam como tiro comum dela.
- **Ler:** o anel aceso, os tiros sumindo. **Desviar:** parar de atirar com o anel aberto, ou atirar e sair da altura.
- O míssil teleguiado é bebido como tiro (volta reto). A bomba limpa a devolução como limpa qualquer tiro inimigo.

### 4.2 A volta (fase 2)

*(25/11, reescrita pela escolha dele, a "A": a 1ª versão dava a volta inteira e subia a parede da esquerda, atrás da
nave. Ele achou injusto, porque a nave não atira para trás.)*

- **A meia volta pela frente**, numa corrida só: **o teto** (o agarrar de hoje, depois a troca de mão para a direita até
  a âncora do canto) → **a quina** de cima à direita → **a parede da direita** (descendo) → **a quina** de baixo → solta
  da parede, pousa galopando → **o rasgo** no meio (o piso rasgado e o metal em arco de hoje).
- O caminho é a borda real: o teto em `TETO_Y`, a parede na borda da tela. Ela **nunca passa da metade da sala** e
  nunca vai para trás da nave.
- **Nos dois cantos da direita** (cima e baixo) ela para ~0,5 s e **ataca para dentro da sala** (o clipe "ataque de
  canto"): o golpe curto de garra em diagonal, que fere quadro a quadro. Sempre os mesmos cantos.
- **O core fica exposto a volta inteira.**
- A borda onde ela está fere ao toque (o corpo); o meio da sala é o abrigo, que muda de forma conforme ela anda.
- Já pendurada, ela anda pelo teto até o canto em vez de soltar.
- Duração ~5,4 s até o rasgo.

### 4.3 Os olhos no escuro (fase 3)

*(25/11, ajustada pela escolha dele, a "A": nada por trás da nave. A 1ª versão tinha uma luz na borda esquerda e
"começa pela esquerda — a parede de trás não é abrigo".)*

- Ela sai da tela (o salto para trás pela borda direita) e **acendem três luzes, só na frente da nave**: na parede da
  direita e no teto, em posições de uma tabela fixa (três figuras que se alternam).
- **A regra:** ela é a luz que **pulsa junto com o coração**. Nos olhos o coração acelera para 0,8 s, o batimento se
  ouve e a luz verdadeira acende nele (quem joga sem som lê pela luz). As outras duas são **brasas de lava** que ela
  deixou: pulsam fora do ritmo, apagadas no batimento, e no fim estouram no lugar em faíscas, sem projétil.
- Depois de dois batimentos (~1,6 s), a verdadeira salta **pela posição da nave no último batimento**, a ~380 px/s, com
  o corpo inteiro ferindo e o core aceso:
  - **da parede:** solta da parede e atravessa a sala em linha reta, saindo pela borda da esquerda sem parar. Depois
    volta pela direita, com o aviso na borda e o galope até a âncora;
  - **do teto:** os olhos correm pelo teto até a coluna da nave, ela ainda no escuro, e ela cai reta.
- A verdadeira alterna parede e teto. Foge-se trocando de altura (parede) ou de coluna (teto) depois do batimento.

### 4.4 O coração para (fase 3, o clímax)

- Ela finca no chão e **arremessa um campo** de estilhaços e lava em arco (a gravidade da F4), numa figura fixa —
  ponto de partida: 18 estilhaços em 3 arcos de alturas diferentes, que cobrem a sala da direita para a esquerda (sem
  leque com vão: o desafio é o mapa congelado, não a brecha). Então crava as garras no próprio core (o clipe "o coração para") e **o coração para**: o
  batimento cessa e tudo o que voa **congela no ar** — os projéteis dela **e os do jogador**. Só a nave se move.
- A sala escura fica iluminada só pelas brasas paradas: um mapa. O jogador atravessa o campo até um lugar seguro; os
  seus tiros disparados no congelamento **param na frente da nave e se acumulam**.
- Depois de ~1,5 s o coração volta a bater: **tudo retoma junto** — o campo dela segue as trajetórias e a rajada
  acumulada do jogador sai de uma vez (o maior golpe da luta para quem leu o mapa).
- O míssil teleguiado congela como os tiros. **A bomba** no congelamento limpa o campo dela e **gasta** a rajada
  acumulada do jogador junto.
- Ela fica vulnerável durante o congelamento (o core aceso).

## 5. O movimento e as animações

A regra de setembro continua: **o PixelLab faz o movimento do corpo; o código só a leva por um caminho apoiado no
mundo.** Nada desliza.

**Ficam:** o surgimento (`pulo`), o urro, o andar parado, a lava, o golpe (`slash`), o galope (`corrida`), cair de
quatro, a agarrada, o balanço e a lava do teto, o rasgo, a morte.

**Novos:**

| Clipe | Para quê | Ferramenta |
|---|---|---|
| Salto para trás | voltar para a direita depois do golpe; a saída dos olhos no escuro; acaba o deslizar | esqueleto (o 1º teste) |
| Escalada | subir a parede da esquerda e descer a da direita | esqueleto |
| Troca de mão no teto | atravessar o teto na volta (substitui o balanço deslizando) | esqueleto |
| Quinas (chão→parede, parede→teto) | as viradas da volta | PixMiniMax, pose final presa |
| Ataque de canto | o golpe para dentro da sala, saindo da quina | PixMiniMax |
| A sede: abrir / devolver | o peito abre e bebe; o tranco que solta tudo de volta | PixMiniMax |
| Salto de parede a parede | o borda a borda, corpo esticado, garras à frente | esqueleto |
| O coração para | crava as garras no próprio core, aperta, solta | PixMiniMax |

- **O esqueleto** (`animate_with_skeleton_v3`, beta) redesenha cada quadro da mesma referência com a pose dada: a
  identidade fica e a pose é a nossa. Esqueleto sob medida para ela (`estimate_custom_skeleton`), vista lateral. Dá a
  posição de cada ponta de garra em todo quadro — a hitbox sai daí.
- **O PixMiniMax** (`animate_image_pixminimax`, hoje até 40 quadros, `last_frame` para prender a pose final) fica com os
  gestos grandes, que ganhou em setembro.
- **A escalada** é gerada como rastejar na horizontal e girada 90° fora do jogo (giro de 90° em pixel é exato). A
  parede da direita = o mesmo clipe espelhado.
- **As lições de setembro valem:** nunca prender `last_frame` = primeiro quadro num ciclo (o laço se acha dentro do clipe,
  `scripts/_f4/_achar-loop.mjs`); mudança de postura ganha o seu clipe de transição; o quadro virtual (0,85/0,75) para
  pose que não cabe em 256²; o braço "stays in front of the torso and fully visible in every frame"; julgar em 256²
  cheio (`_zoom-clipe.mjs`); o v3 clareia quadro a quadro (`_giro-brilho.mjs`); efeito de cena assado em pixel; nada
  pintado no clipe que o motor também lança.
- **A ordem:** (1) o teste do esqueleto com o salto para trás, 2 candidatas — se não segurar o desenho dela em 256², os
  quatro clipes de esqueleto vão para o PixMiniMax; (2) cada clipe julgado ampliado antes da folha; (3) **a
  recoloração** no fim: um mapa de cor só, aplicado a todos os clipes (velhos e novos) — osso e vermelho mais escuros,
  acesos só o core, a lava, a boca; (4) **as garras**: testar como a redução ao tamanho de jogo (~0,55) preserva a
  linha antes de aplicar em tudo.
- **O custo:** ~9 clipes × 2–4 candidatas ≈ 120 gerações (saldo 2.537 até 04/12).

## 6. Os consertos

| Defeito (§ da análise) | Conserto |
|---|---|
| A garra passa pela nave (§1) | uma hitbox por quadro para cada garra nos `perigos` (medida na arte nos clipes velhos; do esqueleto nos novos); o corpo fere só onde há massa; o salto livre até o teto; a linha de parada fixa. Prova: a nave no canto e a que sobe na corrida **levam o golpe** |
| O core nas costas no galope (§2) | uma tabela da posição do core por quadro em cada clipe; a luz e a caixa do core seguem o peito |
| Duas bolas na lava do teto (§3) | cortar o clipe antes da bola pintada (como o do chão, no 14); se quebrar o laço, apagar a bola por máscara e provar que o resto ficou idêntico |
| A ronda desliza (§4) | some com o §5 (salto para trás, escalada, troca de mão) |
| A onda do rasgo não fere (§5) | o que está pintado fere: a onda ganha hitbox que segue a faixa pintada no chão |
| O golpe invisível no breu (§6) | em todo estado de ataque o core no nível de aviso |
| Parada, só o ombro é sólido | o corpo segura bala no tronco e na cabeça; braços e pernas vazados; as garras ferem quando atacam |
| Clara / garras pontilhadas (§7) | a recoloração e o teste da redução (§5) |

## 7. As teclas de dev

Hoje: o **5** pula para o chefão, o **6** abre uma mesa de cartas. Novas, só em `import.meta.env.DEV`, nunca CTRL:

- **7 — a próxima fase do chefão.** No Guardião, o próximo degrau (pela trava, sem o one-shot); depois a Besta fase 1,
  2 e 3. Para em cada uma com a vida no topo da fase e a trava da fase anterior dada como cumprida. Vale para todo
  chefão que tem fase (cada um diz as suas).
- **8 — escolher a mão.** Abre uma lista de mãos prontas (sem cartas, mediana, forte, a última montada no `?sandbox`);
  a escolhida vira a mão de entrada da fase e **a fase reinicia no mesmo ponto da luta** (o treino + a fase do chefão em
  que estava) — a vida extra, o casco, o drone e a arma nascem da mão, como numa entrada de fase de verdade. A mediana e
  a forte são PROVISÓRIAS: a frente 1 do rebalanceamento calibra as três mãos de referência.
- **As fases de cada chefão:** `torre1/2`, `capitania1/2`, `serpenteA/B/C` e `enguia` (a cena da fusão é transição — ela
  sempre termina na enguia, que começa cheia; o atalho dela, `?serpente=fusao&vida=`, a começa mais baixa),
  `guardiao1/2/3`, `besta1/2/3`. As transições têm nome mas não são alvo: `troca` (o Guardião virando a Besta), `fusao`.
- **Na URL**, os mesmos dois: `?fase=<chefão><n>&mao=<nome>` (ex.: `?fase=besta3&mao=mediana`), para os scripts de
  medição do rebalanceamento entrarem direto.

## 8. Os testes

- **Puros:** a geometria de cada figura (os pontos da lava, a devolução na mesma linha e o teto, o caminho da volta e
  as quinas, a tabela das luzes e o ritmo, o campo do coração), a ordem fixa e as travas.
- **No jogo, filmados com os corpos desenhados** (o arnês de `_ver-slash-hitbox.mjs` / `_ver-besta-movimentos.mjs`):
  o golpe pega no canto e na nave que sobe; o core aceso em todo ataque no breu; a sede com a HMG respeita o teto; a
  volta nunca sai da borda; o congelamento para os dois lados e retoma junto.
- **Ele jogando** cada passo (GIF em jogo para cada mecânica, como sempre).

## 9. Os passos

1. As teclas de dev 7 e 8 (servem a todo o resto e ao rebalanceamento).
2. Os consertos de código (§6): as garras, o core por quadro, o breu aceso, a onda do rasgo, a bola do teto.
3. A estrutura: a ordem fixa, as travas, a lava em pontos fixos, a linha de parada do golpe.
4. O teste do esqueleto com o salto para trás (decide a ferramenta dos outros clipes).
5. A sede.
6. A volta (escalada, troca de mão, quinas, ataque de canto, o rasgo no fim).
7. Os olhos no escuro.
8. O coração para.
9. A recoloração e as garras.
10. Os sons novos e ele jogando a luta inteira; a vida sai da medição no rebalanceamento.
11. (25/11, ele jogando) A parede lenta da fase 2, no lugar dos dois golpes de canto (`besta/parede.ts`).
12. (25/11, ele jogando) As brasas apagadas do coração parado: a rota apagada no campo (`besta/coracao.ts`).

Cada passo: plano próprio, folha, a aprovação dele, e só então o próximo.

## 10. Registro

- **24/11, o brainstorming.** A análise (folha `besta-analise`, §1–§7) → *"Vamos de C, por que toca exatamente o que eu
  disse. O ultimo boss precisa ser bem construido, exatamente por que encerra o game"*. A ambição B. O tipo do bicho:
  *"sobre o tipo demonio de carne e osso, deixe. Foi isso que pensei ao criá-la, a besta está presa por um motivo"*. O
  motivo: *"Não precisa levar tão a sério o fato dele estar preso, mas seria mais perto da 'c'"*. A duração B.
- **As assinaturas, 1ª versão (registro, saiu):** a descarga em anéis com brecha, o feixe do teto, a espiral do apagão
  — e depois a grade de cruzes e a lava em arremesso. Saíram porque o Guardião já usa o leque com vão e o anel do
  aperto, e por ele: *"Eu preciso de mecanicas e padrões novos"*. O inventário do que o jogo usa (§2) veio daí.
- **As perguntas abertas, respondidas por ele (todas a proposta):** a volta leva tiro no teto e na parede da direita, não
  na da esquerda (a); a bomba no coração parado limpa o campo dela e gasta a rajada acumulada (a); o míssil segue a regra
  dos tiros — bebido na sede, congela no coração (a); sem som, a luz verdadeira acende e apaga no batimento (a).
- **24/11 à noite, a troca de desenho (decisão DELE).** Os clipes novos da carne falharam lado a lado com os do jogo:
  ela vira outro bicho de frente e se vira de lado. Ele trouxe um conceito biomecânico e escolheu a **E-7-1** (a linha B,
  armadura grafite com o core aceso, com o rabo) porque *"por ter um estilo mais limpo, pode ser que seja mais fácil
  animá-la"*. A linha "O tipo do bicho" do §2 ficou para trás nesse ponto; a mecânica da spec não muda. A arte se refaz
  em 4 passos, com folha e aprovação em cada um (`folhas/2026-11-24/besta-bio/`): (1) a base, 105 px de tela; (2) as
  poses por família: de lado = E-7-1, de frente = frente-v3, de quatro = quatro-2, pendurada = teto-1 e teto-2 (a mão
  livre de cada uma tira a lava, e a troca teto-1↔teto-2 é o andar pendurado); (3) os clipes; (4) o motor.
- **25/11, o passo 3 fechou** (`besta-bio/passo3.html` e `passo3b.html`, ~214 gerações no PixMiniMax). Todos os clipes
  do §5 estão escolhidos, e a tabela fica na passo3b. Lições que ficam:
  - pedir só o que o corpo faz, porque palavra de efeito vira efeito pintado;
  - efeito que ele já aprovou é recortado do clipe de hoje: o arco do rasgo, pela cor, em `ferramentas/arco_de_hoje.py`;
  - laço que não fecha se resolve com "a volta", presa no primeiro quadro;
  - gesto grande que vira o peito para a tela se monta em trechos de 8 quadros presos em quadros de perfil, como o
    rasgo (crava → sobe até acima da cabeça → desce);
  - o rasgo é DE PERFIL, saindo do galope: *"ele vai vir galopando e depois crava as garras e joga o metal quente na
    nave"*;
  - o andar fica a 1400 ms por ciclo;
  - o salto de parede a parede = descola + o voo levado pelo motor + agarra.

  Vai para o passo 4:
  - cortar a bola pintada das lavas na soltura;
  - o tempo de cada clipe;
  - as folhas de sprite em 0,70;
  - as hitboxes;
  - o arco do rasgo atrás da cabeça e o metal do motor saindo da boca do arco;
  - as quinas espelhadas e ao contrário para a parede da direita.
- **25/11, com ele fora** (*"pode começar o passo 4, no localhost principal mesmo… avance mais etapas… corrigimos tudo e
  verificamos quando eu voltar"*), a verificar com ele em `besta-bio/passo4.html`:
  - **O passo 4 da arte, no motor:**
    - as folhas novas em `public/sprites/besta/`;
    - a tabela por quadro em `src/entities/besta/quadros.ts`, gerada por `scripts/_f4/besta_folhas.py`, com o core, o
      tronco (o corpo parado) e o corpo de ataque com as garras e sem o rabo;
    - a escala 0,70 e o surgimento a 1,0 (a 1,2 saía da tela);
    - o teto andando por troca de mão, com as âncoras a 1,5 ciclo uma da outra, o que dá as duas mãos e as duas
      lavas.
  - **Os consertos do §6 que dependiam da arte:**
    - a garra e o core por quadro;
    - a bola do teto cortada;
    - o salto do golpe até o teto;
    - a parada em x=90;
    - o breu no nível de aviso.
  - **O passo 3 da estrutura (§3):**
    - a ordem fixa, que pula as assinaturas que ainda não existem;
    - a trava da fase 2 (uma volta inteira);
    - a lava em pontos fixos, com a coluna e a poça.

  Nada commitado. O próximo é o passo 5, a sede: plano e aprovação dele antes.
- **25/11, a garra no teto (ele: *"a garra está agarrando o vazio… quero que ela agarre o metal de cima"*).** Pendurada,
  a ponta da garra fica em y=19, dentro da faixa de metal do teto (y≈14–28), e não mais em y=30. Um só número
  (`GARRA_CRAVA`) move as duas poses e todos os clipes do teto, porque todos têm a garra na mesma linha do quadro.
- **25/11, o passo 5, a sede (ele: *"pode começar o passo 5, a sede"*).** Plano em `plans/2026-11-25-besta-passo5-sede.md`,
  folha em `besta-bio/passo5.html`. O que entrou:
  - as regras puras em `besta/sede.ts`, testadas: a linha ao contrário, a ordem, os 0,6 s, o agrupamento e o teto 24;
  - o estado `sede` no Predador: virar de frente → abrir → anel 2,0 s → fechar → tranco → virar → recuperar;
  - o anel assado em pixel, na cor do que bebe;
  - o `beber`, consultado antes de todo acerto no chefão e a cada quadro;
  - a trava da fase 1 (66,1 % até uma sede), que puxa a sede como próxima jogada;
  - nos quadros da sede, o corpo é a coluna do tronco (§6: braços vazados), e o core da tabela foi corrigido em três quadros.

  Ficam para a decisão dele (as 8 da folha):
  - o agrupamento ao longo da linha, que mantém a parede da HMG;
  - os 240 px/s da volta;
  - a gota de lava como tiro devolvido;
  - a sede contada no tranco mesmo sem nada bebido;
  - a bomba de queda, que não limpa tiro, também não limpa a devolução.

  Nada commitado.
- **25/11, as respostas dele na sede.**
  - O 1 e o 2 estão ok.
  - O 3: a gota ficou um pouco menor, de 8 para 6 px.
  - O 4 fica: a trava conta a sede mesmo sem nada bebido, *"para não ficar preso na porcentagem e também jogador que
    perceber a mecânica parar de atirar"*.
  - O 5 fica assim: a bomba de queda não limpa a devolução.
  - A ideia dele: a devolução na forma do tiro (único, Duplo, Triplo), *"nada que dificulta de forma punitiva, pode ser
    até visualmente apenas"*. A gota devolvida tem uma, duas ou três contas; o acerto segue 6 px. As duas linhas do Duplo
    voltam como uma linha de pares.
- **25/11, o passo 6, a volta (ele: *"boa, segue para a 6"*).** Plano em `plans/2026-11-25-besta-passo6-volta.md`, folha
  em `besta-bio/passo6.html`. O que entrou:
  - a rota pura em `besta/volta.ts`, testada: 18 trechos pela borda real, os cantos BE → CE → CD, o core desligado na
    esquerda, 6 trocas no teto;
  - a escalada é o rastejar2L-a girado 90° (a pose da parede das quinas é exatamente ele, deslocado (4, 56) px);
  - a tabela por quadro com o lado do rabo e lida espelhada;
  - a volta no Predador, que termina no rasgo de hoje e abre a trava da fase 2. O `sair` pela direita saiu.

  Ficam para a decisão dele (as 6 da folha):
  - a chegada pelo salto da parede (descola-a) em vez da quina ao contrário, que a deixaria de costas;
  - a virada de um quadro no teto;
  - a descida de cabeça para cima;
  - os 9,2 s até o rasgo, contra os ~6 s da spec.

  Nada commitado.
- **25/11, a volta refeita (ele: *"acho injusto a besta subir na parede da esquerda, pois a nave não vira o nariz para
  trás"*; escolheu a "A", *"pode fazer e depois seguir para a 7"*).** A meia volta pela frente (§4.2 reescrita):
  - o teto, por 2 trocas até a âncora do canto, depois a parede da direita e o rasgo;
  - os cantos de cima e de baixo à direita;
  - o core exposto a volta inteira;
  - ~5,4 s até o rasgo, em 10 trechos;
  - já pendurada, ela anda até o canto (só trocas inteiras, até a mão 1).

  Saíram a parede da esquerda, os cantos da esquerda e o "atacar por trás" do §2. Nada commitado.
- **25/11, o passo 7, os olhos no escuro (ele escolheu a "A": *"A, pode fazer"*).** Plano em
  `plans/2026-11-25-besta-passo7-olhos.md`, folha em `besta-bio/passo7.html`. O que entrou:
  - as regras puras em `besta/olhos.ts`, testadas: as figuras, os ritmos, as batidas, os saltos;
  - o estado `olhos` no Predador: a saída pela direita, as luzes com os olhos assados em pixel, o coração a 0,8 s que
    marca a nave a cada batimento, o salto da parede (descola + voo reto, sai pela esquerda) e o do teto (os olhos
    correm até a coluna e o mergulho é o soltar, quadros 4 → 0 do agarrar);
  - a volta pela direita (o aviso + o galope até a âncora; o `reentrar` refeito).

  Ficam para a decisão dele as 6 da folha, entre elas as brasas só de faísca e os olhos em dobro até o coração existir.
  Nada commitado.
- **25/11, o passo 8, o coração para (ele: *"pode seguir para a 8, depois ajustamos a 7 se for preciso"*).** Plano em
  `plans/2026-11-25-besta-passo8-coracao.md`, folha em `besta-bio/passo8.html`. O que entrou:
  - as regras puras em `besta/coracao.ts`, testadas: 18 estilhaços em 3 arcos que chegam à figura no aperto, todos
    seguindo para a esquerda, e o bolso de ~50 px perto dela;
  - o estado `coracao` no Predador: o arremesso (o clipe da lava), o virar, o coracao-a dividido (o aperto, o parado
    por 1,5 s, a solta com o estouro); as lavas dela, as brasas e as luzes param; o core aceso e firme;
  - o contrato `StageBoss.congelado()` / `limparCampo()`. A GameScene congela os tiros do jogador e monta a pilha na
    frente da nave, que a acompanha e sai de uma vez. A arma suspende a perseguição e o alcance. A bomba no
    congelamento limpa o campo e gasta a pilha;
  - a trava da fase 3 (1 de vida até o coração parar).

  A ordem da fase 3 agora roda inteira: olhos → golpe → lava → olhos → coração ↻. Todas as assinaturas da spec existem.
  Ficam para a decisão dele as 6 da folha. Nada commitado. Faltam o passo 9 (a recoloração e as garras) e o 10 (os sons
  e ele jogando a luta inteira).
- **25/11, o coração ajustado (ele: *"pode aplicar o 1 e o 2"*).** O congelamento passou a 2,0 s. O campo tem 15
  estilhaços (3 arcos de 5) a 36 px, e cada um fere pelo miolo de 9×6 px: sobram 27 px de vão para a nave de 21 px, que
  atravessa qualquer arco. No aperto cada estilhaço vai exatamente ao seu lugar da figura. Filmado: o caminho pelo vão
  e pelo corredor até o bolso não encosta em nada.
- **25/11, os passos 9 e 10 (ele: *"após terminar estes ajustes, faça-os. Monte uma folha para o 9 e a folha dos sons
  para o passo 10"*).**
  - **O passo 9, a cor e as garras** (`besta-bio/passo9.html`). Na E-7-1, a redução a 0,70 pelo vizinho mais próximo
    segura a linha das garras, e nada pontilha; pré-reduzir mudaria o motor por quase nada. A cor tem três candidatas:
    A (hoje), B (osso e vermelho mais escuros) e C (B mais o grafite mais escuro e o core mais quente), todas sobre a
    arena real no tamanho do jogo. Eu recomendo B. Aplicar é `COR = 'B'` no `besta_folhas.py`. Com `COR = 'A'` a saída
    é idêntica à de hoje, conferido no md5. Nada aplicado.
  - **O passo 10, os sons** (`folhas/2026-11-25/sons/18-besta/folha.html`, aberta pelo Vite). São 11 sons novos, com
    A/B do PixelLab, C sintetizada no tempo do jogo e R da biblioteca. As ideias dele:
    - a risada quando ela some e na entrada do breu;
    - os murmúrios em laço o breu inteiro;
    - a trilha abafada quase toda: `Music.escuro(k)`, um passa-baixa de 20 kHz a 320 Hz com o nível a 40 %. No breu fica
      a 0,85 e com o coração parado a 1, e na morte abre de novo.

    Os novos: os olhos que acendem e o salto; a sede (abrir, gole, tranco); as garras no metal da meia volta; o coração
    (o aperto, o parado, a volta). A biblioteca da Besta antiga fica no resto. As escolhas instaladas são PROVISÓRIAS
    (as minhas, em `assets/raw/sons/besta/_escolhas.txt`) até ele escolher na folha. Testado em jogo:
    `scripts/_f4/_besta-sons.mjs`. Nada commitado.
- **25/11, as escolhas dele na folha de sons 18.** Instalado:
  - o acender dos olhos A, o salto B, o peito abre A, o gole C, o tranco R (o arremesso da lava), as garras A e o
    aperto A;
  - as combinações que ele pediu: os murmúrios A+B num laço só (*"as duas casam bem juntas"*), o coração parado A+C e
    a volta B seguida do R (o batimento do breu).

  A risada foi refeita *"mais gutural e sinistra"*: A2 e B2 geradas, C sendo a A mais grave e áspera. A folha 18b mostra
  as três e as combinações. No jogo vai a A2, provisória. Sobre a pintura (passo 9), ele: *"ficaram ótimas"*. Falta
  dizer qual cor aplicar.
- **25/11, a folha 18b.** Ele escolheu a risada C (a A trabalhada: mais grave, áspera, com eco) e confirmou as
  combinações AB, AC e BR. Tudo instalado. Os sons da Besta estão todos escolhidos; os volumes ainda são o primeiro
  chute e serão medidos na luta.
- **25/11, a cor B aplicada (ele: *"pode aplicar a B e instalar tudo"*).** `COR = 'B'` no `besta_folhas.py`: as 32
  folhas foram geradas de novo com o osso 28 % e o vermelho 32 % mais escuros, e o core, a lava e o brilho em volta
  intactos. O gerador passou a medir o quadro ORIGINAL e só pintar a folha, então a tabela por quadro ficou idêntica.
  Todos os testes da Besta passam (puros e em jogo). Os passos 1–10 estão no código. Falta ele jogar a luta inteira e
  medirmos os volumes na luta. Nada commitado.
- **25/11 à noite, ele jogou a luta inteira e pediu ajustes (todos feitos e aprovados depois).** O acerto pelo DESENHO
  (`besta/mascara.ts`, `tocaDesenho`: a caixa é só a fase larga; os tiros "pegavam no ar"). O golpe com agachamento de
  0,5 s (a altura é tomada ali). A viagem entre âncoras não fere: passar por trás dela para escapar é mecânica DELE. A
  lava alterna pontos fixos e mirada sem respingo. Traçantes em todos os tiros, acima do breu. O escuro como "sentidos
  aguçados" (a trilha −28 dB e abafada, o coração +7, os sussurros +9, a risada +3; `_medir-besta-escuro.mjs`). Os
  sussurros da folha 18c: a G no breu, a F junto nos olhos, a E na saída do breu na morte. A luz verdadeira leva meio
  dano. E os passos novos: **11, a parede lenta** (do meio da parede, laje de 5 colunas com o corredor-tubo) e **12, as
  brasas apagadas** (30 lascas, a rota apagada entre 4 figuras). Folha `besta-bio/passo11.html`.
- **26/11, a 2ª rodada** (ele: *"pare de supor por px... visualize por etapas, screenshots, ou jogue mesmo"*). Folha
  `besta-bio/passo11b.html`, tudo visto no jogo rodando:
  - **O respingo infinito era o pool reusado:** a bola que cai solta o projétil e o respingo pega o mesmo na hora; a
    ficha velha seguia viva e respingava em cadeia (122 impactos para 5 arremessos), e o pool de 128 enchia a ponto de a
    laje perder colunas. Corrigido com um número por ficha (`lavas[].id` + `lavaId` no sprite): 18 impactos em 60 s.
  - **A câmera lenta da parede:** a trilha desacelera como fita até 60 % (`Music.lento`, tom e velocidade juntos) e volta
    quando ela solta a parede.
  - **O batimento inaudível:** 95–98 % do take abaixo de 80 Hz. O `besta.coracao.batida` (o take 5c dele saturado, com
    harmônicos de 120 a 1400 Hz) fica 8–9 dB acima do resto num alto-falante de notebook. Ele ouviu e aprovou.
  - **Os olhos:** 6 batidas de 1,25 s (~7,4 s), aviso de 0,8 s, o vermelho SÓ no pico dela (as brasas acendem amarelo, o
    repouso é o mesmo âmbar), os sussurros e a trilha fecham durante os olhos.
  - **O coração parado:** 4,5 s com 3 batidas de contagem; o campo só fere a partir do congelamento; a lasca perto da
    nave apaga junto; a rota apaga em varredura, em cinza-frio; os rastros somem. Testado com um "jogador" que reage em
    0,8 s (`_besta-coracao-humano.mjs`): 0 dano em 6 partidas.
  - Ele, jogando: *"agora sim chegamos num nível ótimo de gameplay"*.
- **26/11, a 3ª rodada** (folha `besta-bio/passo11c.html`). Os sussurros do breu +2 dB (*"pouca coisa"*). **O urro de
  morte** (`predador.morte`) existia, mas os 5 estouros de carne, o laço dos sussurros e a saída cobriam o começo dele
  (0–2 dB, `_medir-besta-morte.mjs`): os estouros foram para 0,35, o laço cala no golpe, a E entra em 0,9 s e a trilha só
  abre em 1,9 s (+7 a +16 dB). **As brasas falsas estouram com tiro** (a ideia dele, a escolha B: só visual, *"o
  castigo é o tempo perdido"*): 3 tiros na caixa da verdadeira (26×24), pisca e faísca a cada acerto, o estouro solta
  faíscas que caem e apagam na borda do chão (`brasaNoTiro`, pelo `beber`; `_besta-olhos-brasa.mjs`). Na figura 2 as
  brasas ficam atrás dela, na linha dela, e o tiro acha ela primeiro: fica assim. Ele: *"Boa, ficou ótimo"*. **A BESTA
  FECHOU** (a vida dela fica para a frente 5 do rebalanceamento). A tela de placar no fim do `?fase=` é a do treino; a
  campanha segue terminando no menu do amanhecer.
