# START — Fatia 6: CUTSCENE 3, 2ª VOLTA ("A GARGANTA")

**🟠 A 1ª VOLTA FOI JOGADA E JULGADA. A 2ª ESTÁ ESPECIFICADA E NÃO COMEÇOU.** Branch
`feat/cutscene3-visual`, 8 commits, ponta em `0bd2353`. **Não mergeada e não empurrada** — `main`
segue em `392eedf`.

> ⚠️ **ESTE DOCUMENTO MUDOU DE MÃO PELA SEGUNDA VEZ, EM 2026-09-03.** Ele nasceu mapa de quem ia
> IMPLEMENTAR a fatia; em 02/09 virou mapa de quem ia TESTÁ-LA; agora, com o veredicto na mão,
> volta a ser mapa de quem IMPLEMENTA — só que a 2ª volta, não a 1ª.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-01-cutscene3-visual-START.md`. A Fatia 6 foi testada em
> 2026-09-03: três blocos passaram, dois foram reprovados, e a 2ª volta já tem spec fechado em
> `docs/superpowers/specs/2026-09-03-cutscene3-garganta-design.md`. Escreve o plano de
> implementação e executa: a garganta, os destroços biomecânicos, a nadadeira com pivô, e as
> luzes por código. As medições todas já estão no spec — não remeça nada, e não decida nada no
> olho."**

---

## O VEREDICTO — o que passou e o que caiu

| bloco | veredicto |
|---|---|
| 1 · A cena inteira | ✅ *"O cenário está ótimo, o mais escuro passa a sensação exata de dark sci-fi."* |
| 2 · A nadadeira | ❌ **"Ficou péssima."** |
| 3 · As carcaças | ✅ *"Bem criado e combinou com o conjunto."* |
| 4 · O portão | ❌ **Descartado.** *"Totalmente sem nexo, sem contexto."* |

**Os quatro pontos que esperavam julgamento ficam TODOS como estão.** Os blocos 1 e 3 passaram
inteiros; o portão, dono do 4º ponto, saiu da cena. **Não reabra `DECK_Y`, nem a carcaça do meio,
nem a luminância da 3ª carcaça.**

---

## O QUE FAZER, NA ORDEM

O spec tem os detalhes e todos os números. Isto aqui é só a ordem e os pontos de tropeço.

### 1. A criatura — regerar em 191px e assar a paleta

Objeto PixelLab **`15f111fd-62c2-4689-9a33-93c931b5b796`**, face **`south`**.

- A face recortada tem **131×131**. O enquadramento aprovado pede **191**. ⚠️ **Não use
  `setScale()` nem redimensione com filtro** — é o erro nº 4 da 1ª volta. O caminho **verificado**:
  `create_1_direction_object` com a face `south` subida para 191×191 como **`style_images`** —
  quando há imagem de estilo, é ela que determina o tamanho da saída, e o modelo **redesenha**
  naquela resolução em vez de esticar.
- Depois: **`node scripts/_cut3/_paleta-familia.mjs <entrada> <saida>`**. Ele já está aferido nessa
  peça: **31,8/207 → 30,6/132**.

### 2. As duas animações da criatura

`animate_object` modo **v3**, direção **`south`**: `garganta-idle` (respirando, roda a cena
inteira) e `garganta-morte` (no beat final).

⚠️ **A armadilha do recorte:** os quadros voltam no canvas cheio. Recortar quadro a quadro faz a
animação **tremer**. Corte todos pela **MESMA caixa**, derivada da união dos alphas.

### 3. A cena — geometria, beat final, cadeia invertida

| | |
|---|---|
| textura | `gargantaCut3`, **191×191 nativo** |
| centro x | **330** (cobre x 235..426 — oclui as janelas #4 e #5 por inteiro) |
| topo y | **8** · base y **199** |
| depth | acima da pintura (70), abaixo da nave (80) |

⚠️ **Ela existe desde o primeiro quadro.** Respira durante a queda, a derrapagem e o painel de
escolha. **Não pode "surgir"** — foi essa a queixa exata contra o portão.

O beat final, cinco tempos: a nave sobe e encara → **atira** (+600ms) → **impacto**, a criatura
morre e a cadeia nasce NELA (+1000ms) → a cadeia corre **de x≈330 para x≈8** (+1200ms) → a nave
**entra na boca encolhendo** (escala → 0,15, alpha → 0) e some (+2000ms).

⚠️ **O míssil NÃO pode ser o `bolt2` tingido.** É o padrão que o Henrique já reprovou duas vezes
(*"um tiro magenta igual, sem característica nenhuma"*) — o mesmo defeito anotado em
`BossCapitania.ts:578`. Projétil próprio, forma própria.

### 4. Os destroços biomecânicos

4 peças novas (`create_1_direction_object`, `size` 64 → **16 candidatas numa chamada só**,
`item_descriptions` dá descrição por peça), passadas pelo **mesmo `_paleta-familia.mjs`**.

⚠️ **As 9 posições fixas NÃO mudam** — foram medidas, e a sonda fotografa a cena. O que inverte é
a **ordem de queda**: cada peça entra logo depois do estouro que passa por ela, direita → esquerda.

### 5. A nadadeira — arte com referência, movimento com pivô

⚠️ **A referência é o `leviathan-swim-sheet` QUADRO 0** — o Leviatã do key art do Menu, que já tem
a peitoral desenhada **lisa, escura, ardósia, sem membrana e sem dedos**. A instrução literal do
Henrique: *"baseada no corpo do leviatã usado, cor escura e nadadeira lisa"*. Gerar Leviatã sem
passar esse quadro como estilo é repetir o erro de 02/09.

⚠️ **O movimento errado era SEPARADO do erro de arte, e é código.** Ela atravessava a tela como um
asteroide. Nadadeira presa num corpo **pivota**: origem no encaixe do ombro, pivô **fora do quadro,
embaixo e à direita**, arco de ~7s de ida e ~9s de volta, com pausa no extremo, **em ciclo longo**.
Continua **atrás da pintura** (depth < 70) — só existe pelo que as janelas deixam ver, e as que
sobram são a **#1, a #2 e a central #3**.

### 6. As luzes e as faíscas — 100% código

⚠️ **AS LUZES JÁ ESTÃO PINTADAS NA ARTE.** Rode **`node scripts/_cut3/_medir-lampadas.mjs`**: ele
devolve as **17 posições, tamanhos e cores próprias**, e imprime o array pronto para colar no
`Interlude3Scene`. As 17 somam **186 pixels** — é toda a energia elétrica do quadro.

14 respiram (senoide, alpha ~0,15–0,55), 3 falham (mau contato, apagão curto), e **no colapso todas
viram alarme** em uníssono com tint puxado para o `enemy`.

⚠️ **Fase e semente são DERIVADAS do índice, nunca sorteadas.** A sonda compara quadros; qualquer
aleatório por quadro a quebra. Vale igual para os 3 emissores de faísca.

### 7. Limpeza

Saem `public/sprites/portao-hangar.png`, a entrada `portaoHangar` no `BootScene`, e o bloco do
portão em `Interlude3Scene.selarBoca()`. `nadadeira.png` é **substituído**.

---

## A SONDA

`scripts/_cut3/probe-cut3-visual.mjs` (hoje 16 asserts, um deles do portão):

- **cai** o assert do portão;
- **entram**: a criatura presente **desde o primeiro quadro** na caixa medida; a família de
  luminância dela (média ~30, **pico ≤ 132**); a cadeia começando **à direita**; a nave sumindo
  **dentro da boca**; os 4 destroços novos nas 9 posições.

`probe-interlude3` **não muda** — `DECK_Y` 171 / 164 continua valendo.

⚠️ **Sondas de tempo real: UMA POR VEZ.** Três browsers headless no mesmo Vite quebram.

⚠️ **`probe-f3-visual` tem ruído documentado** (contagem de lança-mísseis por sorteio). A faixa
real medida até hoje é **2 a 8**. **Não afrouxe: rode de novo.**

---

## ⚠️ A FRONTEIRA — continua valendo, e agora vale para a Fatia 7

`public/sprites/hangar.png` é a parede de fundo da **Fase 4** (`Parallax` modo `interior`), que é a
**Fatia 7**. **Não pode ser tocado.** Provas a cada rodada: 160×160 · `git status` limpo nele ·
`usamHangar: 0` na sonda da fatia · `probe-stage4` verde.

---

## 💡 A LIÇÃO QUE O PORTÃO COMPROU — leia antes de pôr QUALQUER asset novo sobre a pintura

O portão falhou por **duas** coisas somadas, e as duas são gerais:

1. **Sem moldura** — colado sobre parede pintada. Um asset novo precisa **de um buraco que o
   emoldure**, ou de estar declaradamente **NA FRENTE da parede, ocluindo-a**. A garganta escapa
   pelo segundo caminho: ela não finge ser parede, ela é um corpo dentro do hangar.
2. **Sem causa** — o entulho caía porque um banner dizia que estava caindo. A garganta conserta
   isso de graça: você atira nela, ela explode, e a explosão dela derruba o teto. O banner
   `A ENTRADA ESTÁ COLAPSANDO` vira **legenda do que você viu**, não a causa.

---

## O ORÇAMENTO DO PIXELLAB

Em 2026-09-03 o saldo estava em **3.314 de 5.000**, com virada de ciclo em **2026-09-04**. As
sobras **não acumulam**, mas o ciclo **reabastece para 5.000** — então, implementando hoje ou
depois, **orçamento não é restrição**: o teto estimado da 2ª volta inteira é **~160 gerações**.

| item | chamada | ~gerações |
|---|---|---|
| criatura regerada em 191px | `create_1_direction_object` + estilo | 20–40 |
| idle da criatura | `animate_object` v3, 1 direção | ~20 |
| morte da criatura | `animate_object` v3, 1 direção | ~20 |
| nadadeira (4 candidatas) | `create_1_direction_object` + estilo | 20–40 |
| 4 destroços (16 candidatas de uma vez) | `create_1_direction_object` size 64 | 20–40 |

A folga é o ponto: ela compra as refeitas dos lotes que saírem fora do modelo.

---

## A BANCADA

⚠️ Os PNGs de conferência em `scripts/_cut3/` **não são versionados** — são bancada. Os scripts,
sim:

| script | o que faz |
|---|---|
| `_medir-lampadas.mjs` | acha as 17 lâmpadas pintadas e imprime o array pronto |
| `_paleta-familia.mjs` | assa a correção de paleta **no arquivo** e reporta média/pico |
| `ver-cena.mjs` · `_ver-detalhe.mjs` · `_ver-colapso.mjs` | regeram as tiras de conferência |
| `reduzir-sprite.mjs` | assa o TAMANHO no arquivo (a lei 1px de arte = 1px de jogo) |

---

## ONDE ISSO CAI NO ROADMAP

```
0–5  ✅ fechadas e mergeadas
6    🟠 Cutscene 3 — 1ª volta testada, 2ª volta ESPECIFICADA e não iniciada   ← VOCÊ ESTÁ AQUI
7    ⬜ Fase 4 — o interior (⚠️ mexe em GEOMETRIA, não só em pintura)
8    ⬜ Cutscene final + as duas baleias erradas que ainda estão na F3/F4
```

Depois das fatias, na ordem já fechada: **calibragem** → **balanceamento** → **playtest humano de
todas as fases** → placar (Supabase) → deploy.

---

## O REPOSITÓRIO

`origin` = **github.com/HenriqueCrosio/AlienWorld-Remastered-V2**.
⚠️ O remoto **`legacy`** aponta para o repositório ANTIGO — **nunca empurre para ele**.
