# SPEC — Cutscene 3, 2ª volta: A GARGANTA

**Data:** 2026-09-03 · **Branch:** `feat/cutscene3-visual` (ponta `0bd2353`) · **Fatia 6**

Este spec nasce do **veredicto do teste jogado de 2026-09-03**. A Fatia 6 já estava implementada
e com sonda verde; o Henrique jogou a cena inteira e reprovou dois dos cinco blocos. O que segue
não é uma fatia nova — é a segunda volta da mesma, com dois pedaços descartados e três nascendo.

---

## 1. O VEREDICTO QUE ORIGINOU ESTE SPEC

| bloco | veredicto |
|---|---|
| 1 · A cena inteira | ✅ **Aprovado.** *"O mais escuro passa a sensação exata de dark sci-fi."* |
| 2 · A nadadeira | ❌ **Reprovada.** Arte errada **e** movimento errado |
| 3 · As carcaças | ✅ **Aprovadas.** *"Combinou com o conjunto"* |
| 4 · O portão | ❌ **Descartado.** *"Totalmente sem nexo, sem contexto"* |
| 5 · A fronteira (Fase 4) | — não testada nesta rodada |

Os quatro pontos que esperavam julgamento (carcaça do meio, luminância da 3ª carcaça, `DECK_Y`,
costuras do portão) **ficam todos como estão**: os blocos 1 e 3 passaram inteiros, e o portão,
dono do 4º ponto, saiu da cena.

### Por que a nadadeira falhou — as duas causas, separadas

**Causa 1, a arte.** Foi gerada sem referência. Posta lado a lado com o `rabo-leviata.png`
(canônico, aprovado depois de quatro reprovações), ela não compartilha **um único traço**: o rabo
é placa escura segmentada com costura de energia; a nadadeira que entrou é **asa de morcego**,
com membrana e dedos ósseos.

**Causa 2, o movimento — e essa é de código, não de arte.** Ela **atravessava a tela** da direita
para a esquerda, como um asteroide. Nadadeira presa num corpo não viaja: ela **pivota** em torno
de um ombro. Daí a leitura de *"objeto perdido no espaço"*.

⚠️ **A referência certa existe e é canônica:** o **`leviathan-swim-sheet` quadro 0** — o Leviatã
do key art do Menu — já tem a peitoral desenhada **lisa, escura, ardósia, sem membrana e sem
dedos**. É o corpo que o jogo usa, e é a instrução literal do Henrique: *"baseada no corpo do
leviatã usado, cor escura e nadadeira lisa"*.

### Por que o portão falhou

*"Apenas surge um asset sem relação nenhuma com a arte, direção do jogo, e as pedras caem sobre
ele."* Duas falhas de uma vez: **sem moldura** (colado sobre parede pintada) e **sem causa** (o
entulho caía porque um banner dizia que estava caindo).

---

## 2. AS MEDIÇÕES QUE SUSTENTAM ESTE SPEC

Nada aqui foi decidido no olho. Os números abaixo saíram da arte instalada.

### Os cinco buracos da pintura (alpha ≤ 8, `paint-bg-cut3.png` 384×216)

| buraco | x | largura | y | altura |
|---|---|---|---|---|
| #1 | 10..48 | 39 | 46..124 | 79 |
| #2 | 63..95 | 33 | 47..124 | 78 |
| **#3 (central)** | **134..249** | **116** | **44..132** | **89** |
| #4 | 288..321 | 34 | 45..124 | 80 |
| #5 | 336..376 | 41 | 46..124 | 79 |

### O desenho do Henrique, medido nos traços vermelhos

Convertido para coordenadas de jogo (escala 4,370 × 4,250 px/jogo):

- **A forma fechada:** borda esquerda constante em **x ≈ 350–355**, de **y ≈ 8 a 199**, saindo pela
  borda direita. Uma coluna de **altura inteira** colada na direita.
- **As quatro setas:** pontas em x ≈ 325–332, nas alturas **y ≈ 34, 88, 141, 180** — teto, janela,
  convés, chão. Ele está apontando a faixa inteira, de cima a baixo.

### Luminância — a família do quadro

| | média | pico |
|---|---|---|
| a pintura do hangar | **13,1** | só **31 pixels** da tela passam de 110 (**0,05%**) |
| a criatura, como veio do PixelLab | 31,8 | **207** |
| a criatura, corrigida | **30,6** | **132** |

A **média** dela já estava na família das carcaças (31/29/41). O defeito era o **pico** — 207 num
quadro cujo teto prático é ~110 — mais o casco **teal**, que é a cor do JOGADOR (`player`
`0x17a6bd`). O miolo rosa **fica**: é `enemyBright` (`0xe8306b`), paleta de inimigo, e está certo.

### As 17 lâmpadas pintadas na arte

Achadas por cor (R domina, luminância > 38), com posição, tamanho e **cor própria**:

```
L1  x 88 y145  10x2  #962e24     L10 x159 y 37   5x3  #93421c
L2  x 45 y 19   9x2  #7f4020     L11 x106 y 47   3x4  #8a3a17
L3  x297 y145   8x2  #953025     L12 x 31 y147   3x4  #aa5540
L4  x339 y 19   8x2  #84431f     L13 x246 y185   5x2  #a7573e
L5  x 30 y184   7x2  #994631     L14 x278 y 47   2x4  #9d4d23
L6  x354 y184   7x2  #9e4831     L15 x239 y146   3x3  #99461e
L7  x353 y147   4x4  #984232     L16 x145 y146   2x3  #a04c20
L8  x138 y185   4x4  #9c4736     L17 x298 y156   5x3  #651b18
L9  x225 y 37   6x3  #914221
```

A pintura é espelhada: L1↔L3, L2↔L4, L5↔L6, L7↔L12, L8↔L13, L9↔L10, L11↔L14. As 17 somam
**186 pixels** — é literalmente toda a energia elétrica do quadro.

⚠️ **As luzes já estão PINTADAS.** "Fazer piscar" não é arte nova: é medir e pôr brilho aditivo
em cima das posições medidas.

---

## 3. O QUE ENTRA — a garganta

### 3.1 A criatura

Objeto PixelLab `15f111fd-62c2-4689-9a33-93c931b5b796` (*"Epic dark sci-fi pixel art boss"*),
8 direções, face **`south`** — a boca frontal com o miolo em espiral.

**Regeração em canvas maior.** A face recortada tem **131×131** nativos, e o enquadramento
aprovado pede **191** de altura. Esticar 1,46× quebra a grade de pixel — é o **erro nº 4 da
fatia passada** (`setScale()` contra a lei "1px de arte = 1px de jogo"). A saída verificada:
`create_1_direction_object` aceita `size` até 256 e imagem de estilo até 256×256, e **quando há
imagem de estilo, é ela que determina o tamanho da saída**. Então a face `south` sobe para 191×191
e entra como **imagem de estilo** — o modelo **redesenha** naquela resolução em vez de esticar.
É upscale por redesenho, o único que não quebra a grade.

**Paleta, assada no ARQUIVO** (não `setTint` — a lei vale para cor como vale para tamanho):

1. casco **teal** (matiz 140°–215°) gira para a **ferrugem** do hangar (~18°), saturação × 0,55,
   luminosidade × 0,80;
2. miolo **rosa/magenta** (matiz ≥ 280° ou ≤ 15°) mantém o matiz, saturação × 0,92;
3. **compressão de realce**: acima de L=90 a curva achata em 0,36 — teto vira ~132.

Resultado medido: **média 30,6, pico 132**. A média quase não se move (31,8 → 30,6): sai o grito,
fica o corpo.

**Geometria na cena:**

| | |
|---|---|
| textura | `gargantaCut3` |
| tamanho | **191×191**, nativo, zero reamostragem |
| centro x | **330** |
| topo y | **8** · base y **199** (altura inteira, como desenhado) |
| depth | **acima da pintura (70), abaixo da nave (80)** |

Com centro em 330 e 191 de largura, ela cobre de x=235 a x=426 — ou seja, **oclui por inteiro as
janelas #4 (288..321) e #5 (336..376)**. Isso é correto: ela não está embutida na parede,
ela está **dentro do hangar, na frente da parede**. Objeto ocluindo parede é render, não colagem —
e é por aí que ela escapa do defeito que matou o portão.

⚠️ **Ela existe desde o primeiro quadro.** Respira enquanto a nave cai, derrapa e enquanto o painel
de escolha está aberto. Ela **não surge** — foi essa a queixa exata contra o portão.

**Animações (PixelLab, `animate_object` v3, direção `south`):**

| anim | descrição | quando |
|---|---|---|
| `garganta-idle` | a boca contraindo devagar, o miolo pulsando | a cena inteira, em loop |
| `garganta-morte` | a boca se contorcendo e apagando | no beat final |

⚠️ **Armadilha do recorte:** os quadros voltam no canvas cheio. Recortar quadro a quadro faz a
animação **tremer**. Todos os quadros têm que ser cortados pela **MESMA caixa**, derivada da união
dos alphas — não pelo `trim` individual de cada um.

### 3.2 O beat final — cinco tempos

| t | o que acontece |
|---|---|
| 0 | Escolhida a nave, ela sobe do convés e vira para a direita, encarando a garganta |
| +600ms | **Dispara** — míssil próprio, atravessando até a boca |
| +1000ms | **Impacto.** A criatura entra em `garganta-morte`; flash, shake, e a cadeia nasce **nela** |
| +1200ms | A cadeia corre **de x≈330 para x≈8** — 10 estouros, direita → esquerda |
| +2000ms | A nave voa para dentro da boca **encolhendo** (escala → 0,15, alpha → 0) e some no miolo |

⚠️ **O míssil não pode ser o `bolt2` tingido.** É o padrão que o Henrique já reprovou duas vezes
(*"um tiro magenta igual, sem característica nenhuma"* — o mesmo defeito anotado em
`BossCapitania.ts:578`). Projétil próprio, com forma própria.

**O ganho narrativo:** o banner `A ENTRADA ESTÁ COLAPSANDO` deixa de ser a **causa** do entulho e
vira **legenda do que você viu acontecer**. A corrente fica causal: você atira → ela explode → a
explosão dela derruba o teto correndo para a esquerda. O portão falhou por não ter causa; a
garganta é a causa.

**A saída fica literal:** a nave não escapa pela borda — ela vai **mais para dentro**, que é a
história desta cutscene, e a Fase 4 (o interior) começa exatamente onde ela sumiu.

### 3.3 Os destroços biomecânicos

Saem `asteroid` / `asteroid2` / `asteroid3` com tint `0x39415c`.

Entram **4 peças novas** do PixelLab, na descrição do Henrique: *restos de fuselagem com traços
biomecânicos, ossos envoltos de tecnologia e carne* — o padrão que já existe nas artes. Geradas
com `create_1_direction_object` em `size` 64, que devolve **16 candidatas numa chamada só**
(`item_descriptions` dá descrição por peça), e passadas pela **mesma correção de paleta** da
criatura: média ~30, pico ≤ 132.

**As 9 posições fixas NÃO mudam** — elas foram medidas, e a sonda fotografa a cena: posição
sorteada quebra a reprodutibilidade. O que muda é a **ordem de queda**: hoje cai da esquerda para
a direita; passa a cair **acompanhando a onda**, da direita para a esquerda, cada peça entrando
logo depois do estouro que passa por ela.

O entulho continua murando as janelas **#1 e #2** — a entrada, por onde a nave chegou. É a parede
que a Fase 4 pressupõe.

### 3.4 A nadadeira refeita

**A arte.** `create_1_direction_object`, `view: sidescroller`, **imagem de estilo recortada do
`leviathan-swim-sheet` quadro 0**. A descrição pede explicitamente o que a versão reprovada tinha:
**sem membrana, sem dedos ósseos** — lisa, escura, ardósia. Tamanho ~120px, para preencher a
janela central (116×89). Em `size ≤ 170` o PixelLab devolve **4 candidatas de uma vez**: a escolha
é olhando, não no escuro.

**O movimento — o conserto de verdade, e é código.** Ela para de viajar:

- Origem no **encaixe do ombro**; o ponto de pivô fica **fora do quadro, embaixo e à direita** — o
  corpo do Leviatã, que a Fase 3 cravou estar lá.
- Arco **lento**: ~7s de ida, ~9s de volta, com pausa no extremo. Não é travessia, é **remada**.
- Continua **atrás da pintura** (depth < 70): só existe pelo que as janelas deixam ver. As janelas
  que sobram são **#1, #2 e a central #3** — a #4 e a #5 ficam atrás da criatura.
- **Repete em ciclo longo.** Vira vida de fundo, não evento que se perde piscando.

### 3.5 As luzes e as faíscas — 100% código, zero arte

**As luzes.** Um brilho aditivo por lâmpada, nas **17 posições medidas**, cada um tingido com a
**cor medida daquela lâmpada** — nada muda de cor, só de intensidade.

- **14 respiram**: alpha em senoide entre ~0,15 e ~0,55, fase **derivada do índice**.
- **3 falham**: piscada irregular de mau contato, com apagão curto. Quais 3 é escolha fixa por
  índice, gravada no código — não sorteio.
- **No colapso, todas viram alarme**: pulso rápido em uníssono, tint empurrado para o `enemy`.
- As lâmpadas que caem atrás da criatura ficam em depth abaixo dela e somem sozinhas.

**As faíscas.** Emissores curtos em 3 junções da parede: 3–6 partículas laranja a cada 2–4s, vida
curta, gravidade para baixo.

⚠️ **Fase e semente são DERIVADAS, nunca sorteadas.** A sonda compara quadros; qualquer aleatório
por quadro a quebra. Fase por índice, emissor com semente fixa, e o assert evita as caixas dos
emissores.

---

## 4. O QUE SAI DA ÁRVORE

- `public/sprites/portao-hangar.png`
- a entrada `portaoHangar` no `BootScene`
- o bloco do portão em `Interlude3Scene.selarBoca()`
- `public/sprites/nadadeira.png` — **substituído**, não removido

---

## 5. A SONDA

`scripts/_cut3/probe-cut3-visual.mjs` (hoje 16 asserts, um deles do portão):

- **cai** o assert do portão;
- **entram**: a criatura presente **desde o primeiro quadro** na caixa medida; a família de
  luminância dela (média ~30, **pico ≤ 132**); a cadeia começando **à direita**; a nave sumindo
  **dentro da boca** (escala e alpha finais); os 4 destroços novos nas 9 posições.

`probe-interlude3` **não muda** — o assert de `DECK_Y` (171 / 164 = 171−7) continua válido.

`probe-stage4` continua sendo **a fronteira**: `hangar.png` intocado, 160×160, `usamHangar: 0`.

⚠️ **Sondas de tempo real: UMA POR VEZ.** Três browsers headless no mesmo Vite quebram.

⚠️ **`probe-f3-visual` tem ruído documentado** (contagem de lança-mísseis por sorteio). A faixa
real medida até hoje é **2 a 8** — o HANDOFF registrava "2 a 6" e a sessão de 2026-09-02 tirou 8.
**Não afrouxe: rode de novo.**

---

## 6. ORÇAMENTO

Saldo em 2026-09-03: **3.314 gerações**, e ⚠️ **elas zeram em 2026-09-04** (virada de ciclo). O
que não for gasto hoje evapora — então gerar generoso hoje é de graça, e refazer um lote fora do
modelo não custa nada.

| item | chamada | ~gerações |
|---|---|---|
| criatura regerada em 191px | `create_1_direction_object` + estilo | 20–40 |
| idle da criatura | `animate_object` v3, 1 direção | ~20 |
| morte da criatura | `animate_object` v3, 1 direção | ~20 |
| nadadeira (4 candidatas) | `create_1_direction_object` + estilo | 20–40 |
| 4 destroços (16 candidatas de uma vez) | `create_1_direction_object` size 64 | 20–40 |

**Teto ~160 de 3.314.** A folga é o ponto: ela compra as refeitas.

---

## 7. AS DECISÕES FECHADAS — não reabrir

| | |
|---|---|
| O enquadramento da criatura | **C — inteira na direita**, altura inteira, boca legível |
| Onde ela mora | **dentro do hangar, na frente da parede** — não embutida nela |
| O final | **a nave entra na boca e some**; não sai pela borda |
| As animações | **idle + morte** (a terceira, "a boca engolindo", ficou fora) |
| A nadadeira | **refazer** com o `leviathan-swim-sheet` como referência: **lisa e escura** |
| O movimento dela | **pivô**, nunca travessia |
| O portão | **descartado** |
| Os 4 pontos que esperavam veredicto | **ficam como estão** |
| A arte de fundo | intocada — a pintura do Henrique, versionada em `cdaefde` |

⚠️ **A FRONTEIRA CONTINUA VALENDO.** `public/sprites/hangar.png` é a parede da **Fase 4**
(`Parallax` modo `interior`), que é a **Fatia 7**. Ele **não pode ser tocado**.
