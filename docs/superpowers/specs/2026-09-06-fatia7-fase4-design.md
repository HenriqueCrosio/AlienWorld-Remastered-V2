# FATIA 7 — A FASE 4, O INTERIOR DO LEVIATÃ

**Spec de design.** Brainstorming em 2026-09-06 com o Henrique, decisão por decisão. Ele partiu
da frase que ele mesmo deixou no START: *"quero decidir o que a fase vira antes de você escrever
spec"*.

---

## 1. O QUE ESTA FATIA É

As fatias 0–6 mexeram em **pintura**. Esta mexe em **lugar e geometria**.

O diagnóstico que abriu a fatia foi dele: *"a fase 4 inteira como um todo deixa a desejar,
principalmente o cenário dela (...) não parece estar dentro de uma baleia"*. E o pedido que estava
guardado desde o começo do desenvolvimento: *"quero que o jogador tenha que enfrentar pequenos
desafios (...) a minha ideia é ter um momento em que o jogador terá que passar por partes mais
estreitas, como corredores mesmo"*.

**A linha de base, medida antes de decidir qualquer coisa** (`scripts/_f4/shot-estado.mjs`, os
quatro momentos do roteiro capturados com a nave viva):

1. O fundo é o `hangar.png` repetido, **com janelas mostrando o espaço** — você acabou de ser
   engolido por uma garganta e a primeira coisa que vê é uma parede de hangar com vista para a
   nebulosa. O lugar mente sobre o que é.
2. O corredor não lê como corredor. As colunas são `costela`/`orgao`/`maquinario` — assets de
   CENÁRIO — esticados até a altura sorteada e girados 6 a 13 graus. No aperto (vão 76) não dá
   para achar a passagem de relance, e o verbo da fase inteira é precisão de voo.
3. A nave some no fundo ocupado.

---

## 2. O QUE A FASE VIRA

Uma **jornada anatômica** que termina num duto:

```
 0s ─────────── 40s ──────────── 68s ─────── 82s ── 86s
│  CÂMARA 1     │   CÂMARA 2      │  O DUTO   │      │ NÚCLEO
│  o hangar     │   a caixa        │  3 portas │ sil. │ o chefão
│  engolido     │   torácica       │  o aperto │      │
   combate aberto + estreitamento   pilotagem    você sai
   pelo caminho (como hoje)         PURA         do duto nele
```

**Por que assim:** as câmaras entregam o "pequenos desafios no decorrer da fase" e o duto entrega
"um momento de corredor mesmo". O duto cai onde o roteiro **já fazia silêncio** antes do chefão
(`STAGE_4`: `t=79` zera os corredores, `t=82` anuncia, `t=86` entra o chefão) — não inventamos um
buraco, ocupamos um que existe.

⚠️ **Um duto só, no fim** — decisão dele, revisando a proposta de vários. O contraste é o que faz
o aperto cobrar: se tudo é tubo, o aperto é só mais tubo.

---

## 3. OS QUATRO FUNDOS — E A LEI QUE ELES OBEDECEM

Arte dele, entregue em `assets/raw/paint-bg-f4-original-{1..4}.png`, 1672×941, **e a numeração
dele já é a ordem de uso**.

| | vira | por que ali | L média | claros | vermelho |
|---|---|---|---|---|---|
| **1** | câmara 1 — o hangar engolido | é a única com **passarelas industriais soldadas na carne**: CONTINUA o hangar da cutscene 3 em vez de contradizê-lo | 15,7 | 0,1% | 0,8% |
| **2** | câmara 2 — a caixa torácica | azul frio contra o vermelho da 1. **É a troca de paleta que faz "estou indo fundo" ser lido** — duas câmaras vermelhas seguidas leriam como o mesmo lugar | 37,4 | 3,7% | 0,5% |
| **3** | o duto | a mais escura das quatro, e é literalmente um túnel se fechando. É onde a leitura mais importa e é o fundo que menos compete | **11,7** | 0,2% | 0,9% |
| **4** | a câmara do núcleo | simétrica, o coração no centro (medido: **186,113**) | 13,1 | 0,3% | 2,3% |

(L média = luminância 0–255; "claros" = fração de pixels com L>90; "vermelho" = fração na faixa
que disputa com os tiros inimigos, `enemyBright 0xe8306b`. Medidor:
`scripts/_f4/_reduzir-fundos.mjs`.)

**Já são dark sci-fi** — luz só onde há energia. O risco de o fundo comer a nave, que era a 3ª
queixa da linha de base, cai muito com estes: a redução de 4,35× dissolve os pontos acesos em
textura.

### ⚠️ A LEI DA RESOLUÇÃO — ele cravou nesta sessão, e disse que se perde toda sessão nova

> **O fundo pintado entra assado em 384×216 e é desenhado em escala 1. REDUZIR pode; AUMENTAR,
> NUNCA.**

O motivo é próprio, não é só a lei geral de assets: **é a grade de pixel casando com a da tela que
dá o aspecto de PROFUNDIDADE.** Pintura espremida ou esticada em runtime perde a grade, briga com
o resto (que é pixel perfeito) e o fundo achata.

**Receita:** um passo só de `lanczos3`, do arquivo ORIGINAL do gerador direto para 384×216 —
reamostrar duas vezes custa detalhe (a lição do Zero-G, em `scripts/reduzir-sprite.mjs`).
Precedentes já instalados nesse tamanho exato: `paint-bg-f2.png`, `paint-bg-f3.png`,
`paint-bg-cut3.png`.

Se uma pintura ficar pequena para o enquadramento, a saída é **gerar de novo maior**, nunca
esticar a que existe.

### O `hangar.png` — a fronteira que seis fatias protegeram

**Ele NÃO é tocado.** Os quatro fundos assumem a Fase 4 e ele simplesmente **deixa de ser usado
no modo `interior`** (`Parallax.buildInterior`). O arquivo continua 160×160, byte por byte, e a
cutscene final (`Interlude4Scene.ts:253`) segue usando o mesmo.

A fronteira sobrevive por deixar de ser necessária, não por ser defendida.

---

## 4. OS TRÊS BLOCOS, E ELE JOGA ENTRE ELES

A fatia é grande demais para um mergulho só — a Fatia 6 levou duas voltas com escopo menor. Ela
sai partida em três, **na ordem de execução**, e cada um termina jogável:

```
BLOCO A — O LUGAR        os 4 fundos, a troca, o hangar sai, as colunas
     ↓                   risco de hitbox: ZERO
  ▶ ELE JOGA
     ↓
BLOCO B — O CHEFÃO       a arte nova do guardião, a posição no alto-direita,
     ↓                   e o BRAINSTORM da 2ª forma (com a arena já na tela)
  ▶ ELE JOGA
     ↓
BLOCO C — O DUTO         paredes contínuas + as 3 portas
     ↓                   risco de hitbox: aqui
  ▶ ELE JOGA → a fatia fecha
```

---

## 5. BLOCO A — O LUGAR

**Risco de hitbox: ZERO.** A fase joga exatamente como hoje, com outra cara. **Ele joga o A antes
de uma linha do B ser escrita.**

### A1. Os quatro fundos e a troca entre eles

Cada fundo entra como par de cópias lado a lado com `origin(0,0)` e `bgFactor` próprio — a receita
que o `paintBgF2`/`paintBgF3` já usam (`Parallax.update`, o wrap em `bg.x <= -bg.width`).

A troca é **dirigida pelo roteiro**, não por um relógio interno do Parallax: um tipo de evento
novo no `StageEvent` (`cenario`, com a chave da textura), consumido pela `GameScene` como todos os
outros. O `STAGE_4` continua sendo a fonte única da forma da fase.

**A transição:** crossfade curto com um mergulho no escuro (~600ms), que lê como passar por um
estreitamento. ⚠️ **A duração exata é para ser julgada JOGANDO, não cravada aqui** — é o tipo de
número que a Fatia 6 provou que só o olho dele fecha.

No Bloco A os quatro se distribuem pelas batidas que o roteiro já tem. No Bloco C a entrada do
`bg3` se realinha para coincidir com o duto.

### A2. O hangar sai do interior

A camada `hangar` de `buildInterior()` é removida. As camadas orgânicas (costelas de fundo,
órgãos à deriva, maquinário do teto) **ficam** — elas dão paralaxe verdadeira, que uma pintura
sozinha não dá. O que muda é que agora elas se movem contra um fundo que já é o bicho.

⚠️ **Rebaixar as camadas intermediárias:** com uma pintura opaca e detalhada atrás, os tints
escuros de hoje podem virar sopa. Medir e ajustar — a régua é a mesma perspectiva aérea que o
projeto já usa.

### A3. As colunas novas

Hoje: três assets de cenário esticados e girados. Vira: assets **desenhados como coluna** — base
cortada reta, ponta definida, silhueta que diz onde a coluna termina e onde o vão começa.

⚠️ **E o objeto jogável fica mais claro que o cenário, sempre.** O código já tenta isso (as
costelas do corredor nascem sem tint, claras, contra as de cenário escuras) e não é suficiente
hoje. Com a pintura atrás, a separação tem que ser medida, não presumida.

**O evento `corredor` continua exatamente como é** — pares chão+teto, um por batida, com o vão
sorteado e a curva 110 → 96 → 76 → 84 que o `STAGE_4` já cravou. **Só a ARTE das colunas muda.**
Isso é o que mantém o risco de hitbox do Bloco A em zero: nenhum número do roteiro é tocado, e o
`alturaPx` continua sendo quem manda no tamanho. As minas e sensores (`hazard`) também ficam
intactos.

### Critério de aceite do Bloco A

Ele joga a Fase 4 inteira e responde a duas perguntas: **parece estar dentro do bicho?** e **dá
para achar o vão de relance?** Nada de screenshot — a Fatia 6 teve três defeitos que passaram por
sonda verde e só caíram quando ele rodou a cena.

---

## 6. BLOCO B — O CHEFÃO FINAL

**Ele só começa depois de ele JOGAR o Bloco A** — a câmara do núcleo precisa estar real na tela
antes de a gente desenhar o chefão que vive nela. Desenhar o chefão longe da arena é o erro que
custou as duas voltas da Fatia 6.

### B1. A 1ª forma — o guardião ganha a arte nova dele

Arte dele, no PixelLab: objeto `9436240c-c69c-49a6-a75f-5eb8e57850d6`, **256×256**, casco blindado
com a massa viva exposta e tendões. Substitui o `guardiao.png` atual (256×227). Vêm com ela duas
animações de 9 quadros: uma **idle** (a massa esquenta até um branco-amarelo e volta a apagar — um
batimento de verdade, aprovada) e uma explosão nova, gerada nesta sessão.

⚠️ **A arte nova é 256×256 contra 256×227 — a massa vermelha MUDA DE LUGAR.** `G_CORE_OFF_X` e
`G_CORE_OFF_Y` (hoje +27/+31) **têm que ser remedidos** com `find-pad`, e o `G_MUZZLE_X/Y` junto.
É a lei que o próprio `BootScene` escreve sobre esta arte: *"trocar a arte OBRIGA a remedir"*.

⚠️ **E um achado na idle, para ele julgar jogando:** nos quadros 6–8 o miolo apaga quase por
completo. Esse miolo **é o alvo** — a massa vermelha é a hitbox que leva dano. Um alvo que some
metade do ciclo é o tipo de coisa que só incomoda com o controle na mão.

**A explosão que foi reprovada, e por quê** — vale registrar para não repetir o prompt: a primeira
(`The creature explodes`) falhou porque **a silhueta nunca muda**. O casco é idêntico nos 9
quadros; o que "explode" são espículas de luz saindo do miolo por dentro de uma carcaça intacta, e
ela **termina inteira**, quase igual ao quadro escuro da idle. Morte que acaba com o cadáver
intacto lê como "desligou", não como "morreu". O prompt novo nomeia a **quebra da silhueta**
(pedaços saindo do corpo, o casco progressivamente rasgado, o fim como carcaça oca com destroços).

### B2. A posição — o chefão nasce no alto-direita

**A ficção, decidida por ele:** o coração pintado da `bg4` **é o núcleo**; o chefão é a
**extensão** dele.

Hoje ele estaciona em `G_STATION_X = 298`, `G_BASE_Y = 104` — já está no quarto direito, e o que
muda é a altura. O guardião é 179×159 na tela; centrado no alto ele fica **cortado pela borda de
cima**, que é como um braço vindo de fora do quadro deve ler. A massa vermelha continua
alcançável.

⚠️ **O Y exato se decide com ele vendo na cena**, com as opções lado a lado — foi assim que o
tamanho da garganta fechou na Fatia 6, e foi o único método que não custou rodada.

**Sem ligação explícita entre o coração pintado e o chefão** — decisão dele. Sem cabo, sem pulso
sincronizado, sem estado morto da pintura. A `bg4` entra como cenário.

> Ressalva registrada uma vez, e ele decidiu com ela na mesa: é o terreno onde o portão da
> cutscene 3 caiu (*"asset sem causa visível lê como colagem"*). O que diminui o risco aqui é que
> o coração pintado **não é um asset colado sobre a pintura — ele É a pintura**.

### B3. A 2ª forma — ela vai ser REPENSADA, e o brainstorm é próprio

Pedido dele: *"a segunda fase do boss precisa ser repensada, para ter algo mais impactante para o
final do jogo"*.

**Este bloco tem um brainstorm agendado, e isso é decisão, não buraco no spec.** O gatilho é ele
jogar o Bloco A. O que está fechado aqui é o **diagnóstico**, medido na tela hoje:

| | forma 1 (guardião) | forma 2 (coração) |
|---|---|---|
| na tela | 179×159 | 146×146 |
| área | 100% | **75%** |

1. **O clímax da campanha ENCOLHE 25%.**
2. **É a mesma família de silhueta** — massa arredondada no quarto direito com um miolo vermelho.
   O jogador acabou de matar exatamente isso.
3. **A paleta verde-oliva lê como "outro inimigo"**, não como "o coração de dentro do que você
   rachou" — e não conversa com o coração pintado da `bg4`, que é vermelho profundo.
4. **O verbo não muda.** Nas duas formas é *espere a janela, atire no ponto vermelho à direita*. A
   2ª fase de um chefão final devia cobrar outra coisa, não a mesma coisa com outro sprite.

Linha de base capturada em `scripts/_f4/shot-boss2.mjs` (as três telas: forma 1, forma 2 fechada,
forma 2 aberta).

⚠️ **Armadilha da sonda, encontrada ao capturar:** `forma === 'guardiao'` já é verdade enquanto
ele ainda VOA para dentro da tela, e `damage()` nesse estado é ignorado em silêncio. Espere por
`!boss.entering`, nunca pela forma.

### Critério de aceite do Bloco B

Ele joga a luta. **A 2ª forma parece o fim do jogo?**

---

## 7. BLOCO C — O DUTO

**Aqui mora a hitbox.**

### C1. As paredes contínuas

| t | o que acontece | vão |
|---|---|---|
| ~67 | REJEIÇÃO TOTAL encurta e as ondas **somem** | — |
| 68 | as paredes viram contínuas | 96 |
| ~70 | **porta 1** — chega com vão largo e sem pressão: ela **ensina** | 96 |
| ~74 | **porta 2** — o duto já apertou | 76 |
| ~79 | **porta 3** — o selo do núcleo | 60 |
| 82 | silêncio; o duto abre na câmara do chefão | — |
| 86 | o núcleo | — |

**Como a parede contínua nasce:** um segmento por batida, **encostado no anterior** — o intervalo
é `largura do segmento ÷ 84px/s` (`SCROLL_SPEED`). Reusa o `TerrainSystem` inteiro: mesma hitbox,
mesma colisão, mesma limpeza. **Nenhuma física nova**, que é onde bug de colisão mora.

A altura de cada segmento deriva do vão, como o `spawnCorredores` já faz — nunca sorteada
separada para cima e para baixo, porque alturas independentes somam parede impassável.

Banda jogável: `TETO_Y = 10` a `GROUND_Y = 206`.

### C2. As portas

**Comporta biomecânica com núcleo aceso.** Anteparo escuro encravado na carne, nervuras, e um
ponto ACESO no meio. O núcleo aceso resolve duas coisas de uma vez: diz "sou destrutível" e diz
"mire aqui". Ao morrer, a luz apaga antes da peça quebrar.

**Ela tapa o vão inteiro. Não tem como passar sem destruir.**

| porta | vão | HP |
|---|---|---|
| 1 | 96 | 6 |
| 2 | 76 | 8 |
| 3 | 60 | 10 |

⚠️ **Os HP são chute calibrado até o playtest**, com a mesma etiqueta dos outros números da fase
(vãos, `INVESTIDA_CADA`, `ABERTO_DUR`). A conta que os sustenta:

- a porta nasce fora da tela à direita e chega em quem voa à esquerda em **~3,5s**;
- a **PULSE** — a arma base, o pior caso — entrega 7 tiros/s × dano 1 = **7 de dano/s**;
- com reação humana isso é ~17 de dano na janela. HP 10 pede 1,5s de fogo sustentado.

**A infraestrutura já existe.** Os props do terreno já têm HP (`building` 8, `silo` 6, `base` 16;
`costela`/`orgao`/`maquinario` são `Infinity`) e o `overlap(weapons.bullets, terrain.props)` está
de pé desde a Fase 1. Uma porta é **um `PropKind` novo com HP finito**, não um sistema novo.

⚠️ **A ESPIRAL, e ela é uma decisão, não um bug:** colidir custa 1 vida + 1,4s de
invulnerabilidade. Quem não abre a porta é empurrado contra a borda esquerda e leva um dano a
cada 1,4s até morrer — e a porta seguinte chega 4s depois. **"Atirar ou morrer" é literal.** Está
escrito aqui para ele julgar jogando, não para descobrir jogando.

### Critério de aceite do Bloco C

Ele joga o duto. As perguntas: **a porta diz "atire em mim" antes de você bater nela?** e **o vão
de 60 é apertado ou é roubo?**

---

## 8. OS ASSETS NOVOS

Os fundos são dele e já estão entregues. Do PixelLab saem quatro peças:

| asset | o que é | de quem | bloco |
|---|---|---|---|
| `paintBgF4a..d` | os quatro fundos, reduzidos para 384×216 | **dele**, entregues | A |
| `colunaA`, `colunaB` | as colunas das câmaras, desenhadas COMO coluna | PixelLab | A |
| `guardiao` (nova) + idle | o casco blindado com a massa exposta, 256×256, 9 quadros | **dele**, entregue | B |
| `guardiao-morte` | a explosão que QUEBRA a silhueta (a 1ª foi reprovada) | PixelLab | B |
| a 2ª forma | **a definir no brainstorm do Bloco B** | a decidir | B |
| `dutoParede` | o segmento de parede do duto, encaixável (o teto sai por `flipY`) | PixelLab | C |
| `porta` | a comporta biomecânica com núcleo aceso + o estado destruído | PixelLab | C |

Orçamento PixelLab em 2026-09-06: ~4.890 de 5.000, ciclo virando em 2026-10-04. **O gargalo não é
orçamento — são as rodadas de julgamento.**

---

## 9. ⚠️ AS TRAVAS DE GEOMETRIA

É onde esta fatia pode quebrar o jogo, e o aviso é do próprio START: instalar arte recortada mais
justa no lugar da atual **encolhe o vão sem uma linha do roteiro mudar**.

1. **Medir os vãos ANTES e DEPOIS de cada troca de arte** — como a regressão da Task 6 fez com as
   hitboxes. Número medido, não presumido.
2. **O teto de HP da porta se confere contra a PULSE**, não contra a arma que o playtest tiver na
   mão.
3. **O espaçamento mínimo entre portas é DERIVADO** da janela de 3,5s, nunca cravado à mão.
4. **`probe-stage4` roda antes de tudo e vira a linha de base.** Rodada em 2026-09-06: verde de
   ponta a ponta.

---

## 10. DECISÕES MARCADAS, PARA NÃO VIRAREM CONSERTO DE CARONA

⚠️ **O chefão é desenhado com `setScale`.** `G_ESCALA = 0.7` (guardião, 256×227 → 179×159) e
`C_ESCALA = 1.2` (coração, 122×122 → 146×146). Arte espremida **e ampliada** em runtime —
exatamente o que a lei da resolução proíbe. É de julho, anterior à lei.

Como esta fatia mexe na câmara do chefão, dá para assar os dois no arquivo. **Mas isso move a
hitbox de um chefão já balanceado e testado**, então fica como decisão explícita para ele, não
como limpeza silenciosa.

---

## 11. COMO SE VERIFICA

- `probe-stage4` — a fase de ponta a ponta, o teto matando, a cutscene final. **Linha de base.**
- Uma sonda nova da fatia: os quatro fundos entram na ordem certa, o `hangar` NÃO aparece no modo
  `interior`, os vãos medidos batem com o roteiro, a porta morre com o dano da PULSE dentro da
  janela.
- `npm run build` limpo.
- ⚠️ **Sondas de tempo real: UMA POR VEZ.** Três browsers headless no mesmo Vite quebram.
- ⚠️ **Um assert de "aconteceu" não prova "foi visto".** Para beat curto, medir a duração na tela
  e contar quem desenha por cima.

---

## 12. O QUE FICOU DE FORA, DE PROPÓSITO

- **As duas baleias erradas** que ainda estão na F3 e na cutscene final — vão para a Fatia 8.
- **A cutscene final** — Fatia 8.
- **Ondas dentro do duto** — o terreno é o inimigo lá.
- **Cabo ligando o chefão ao coração pintado** — decidido contra.
- **Calibragem** dos números novos — vai junto com a calibragem geral do passe visual, depois das
  fatias.
