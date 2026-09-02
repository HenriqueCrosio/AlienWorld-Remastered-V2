# START — Fatia 6: CUTSCENE 3 ("O HANGAR DO LEVIATÃ")

**🟠 AS 5 TAREFAS ESTÃO IMPLEMENTADAS. FALTA O TESTE JOGADO.** Branch `feat/cutscene3-visual`,
7 commits, ponta em `06dbe68` (+ `a57aa7f` de docs). **Não mergeada e não empurrada** — `main`
segue em `392eedf`.

> ⚠️ **ESTE DOCUMENTO MUDOU DE MÃO EM 2026-09-02.** Ele era o mapa de quem ia IMPLEMENTAR a
> fatia. Agora é o mapa de quem vai TESTÁ-LA. A implementação está feita e as sondas estão
> verdes — o que falta não é código, é o olho do Henrique.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-01-cutscene3-visual-START.md`. A Fatia 6 (Cutscene 3, o
> hangar do Leviatã) está IMPLEMENTADA na branch `feat/cutscene3-visual`, com sonda verde e sem
> merge. Sobe o `npm run dev` e me guia pelo teste jogado: eu abro com `P`, jogo a cena inteira
> incluindo escolher a nave, e te dou o veredicto. Tenha em mãos os quatro pontos que esperam
> julgamento e a lista de verificação — eles estão neste documento."**

---

## O QUE MUDOU NA CENA

A cutscene já existia e funcionava desde julho. **Esta fatia não construiu a cena — deu a ela um
LUGAR.**

| Task | commit | o que entrou |
|---|---|---|
| 1 | `3f2cd3a` | a pintura vazada por sementes, 384×216, cinco janelas em alpha 0 |
| 2 | `2fe0d8c` | a parede virou a pintura; convés **re-medido** (`DECK_Y` 150 → **171**) |
| — | `23c804b` | a sonda antiga corrigida para o convés novo |
| 3 | `f616bc1` | a nadadeira peitoral, uma remada da direita para a esquerda |
| 4 | `ad0496d` | as três carcaças da frota engolida + `scripts/reduzir-sprite.mjs` |
| 5 | `06dbe68` | o portão que sela a boca antes do entulho |

15 arquivos, +501/−70. **60 gerações do PixelLab** (3 lotes de 20); saldo em **3.314**.

---

## COMO TESTAR

```bash
npm run dev          # porta 5173
```

No menu: **`P`** entra direto na Cutscene 3.

⚠️ **JOGUE ATÉ O FIM, INCLUINDO ESCOLHER A NAVE.** O colapso — e portanto o portão — **só dispara
depois da escolha**. Uma passada que só assiste não vê metade da fatia.

Outros atalhos: `M` Fase 3 · `N` treino da serpente · `L` Fase 4 · `V` Fase 2 · `B` treino F1.

---

## ✅ A LISTA DE VERIFICAÇÃO

### 1. A cena inteira
- [ ] A repetição sumiu? (era o mesmo arco/janela/pilar quatro vezes na tela)
- [ ] Não ficou **escura demais**? A pintura é bem mais escura que o azulejo, e agora a nave e o
      banner carregam quase toda a luz do quadro
- [ ] A nave **toca e para** no convés — nem flutuando, nem enterrada

### 2. A nadadeira — o beat da fatia
- [ ] Aparece **recortada pelas janelas**, nunca por cima da parede
- [ ] A travessia leva 6s. Lenta demais? Rápida demais?
- [ ] Ela é bem mais **clara** que a pintura: aparece bem contra a nebulosa, mas é a segunda coisa
      mais clara da tela. Passou do ponto?
- [ ] A direção (direita → esquerda) casa com o que você imaginou?

### 3. As carcaças
- [ ] Leem como **naves**, ou como entulho?
- [ ] Tamanho: 41×25, 47×24, 39×28, contra 30×22 da sua nave. Pequenas demais para "naves de
      guerra engolidas"?
- [ ] A nave continua **legível onde ela para** (x≈258) — foi o defeito que a revisão de
      2026-07-19 consertou nesta mesma cena

### 4. O portão
- [ ] Lê como uma **forma fechando**, e não como um portal?
- [ ] O entulho cai **por cima** dele e cobre boa parte da forma no fim. Você vê a comporta fechar
      e depois ela vira pedra. É isso que você queria, ou o portão devia continuar visível?

### 5. A fronteira
- [ ] Jogue a **Fase 4** (`L`): a parede dela tem que estar idêntica

---

## ⚖️ OS QUATRO PONTOS QUE ESPERAM O SEU VEREDICTO

**1. A carcaça do meio não lê como nave.** É o "cargueiro partido ao meio" e, no tamanho de tela,
vira dois blocos cinza. As outras duas leem bem. Trocar custa mais um lote (~20 gerações, ~8min).

**2. A terceira carcaça está fora da família de luminância.** 31 / 29 / **41** — o critério era a
família apertada das cristas da Fase 1 (33/34/35). Ela é a mais legível das três, o que pode ser
bom ou pode ser ela puxando o olho. Corrigível por tint medido, sem tocar na arte.

**3. `DECK_Y = 171` põe a nave no lábio da frente do convés.** É o topo da faixa de perigo, como o
plano mandava, e foi medido e conferido marcando na arte. Mas o plano do piso continua atrás dela
— se você preferir a nave mais "dentro" do convés, o número desce e é uma linha só.

**4. As costuras laranja do portão brilham forte.** A luminância média dele (27) está na família de
tudo, mas as costuras são pontos quentes num quadro escuro.

---

## AS IMAGENS PARA OLHAR, NESTA ORDEM

| arquivo | o quê |
|---|---|
| `scripts/_cut3/cena-hoje.png` | a tira de 16 quadros da cena inteira |
| `scripts/_cut3/det-nadadeira.png` | a remada recortada pelas janelas, 3× |
| `scripts/_cut3/det-conves.png` | as três carcaças e a nave no convés, 3× |
| `scripts/_cut3/colapso.png` | os 6 quadros do portão fechando, 2× |
| `scripts/_cut3/_marca-janelas.png` | a pintura vazada sobre magenta (magenta = buraco) |
| `scripts/_cut3/conves-zoom.png` | a linha de `DECK_Y` medida sobre a faixa de perigo, 6× |

⚠️ Esses PNGs de trabalho **não estão versionados** (o `_cut3/` é bancada). Regerá-los é barato:
`ver-cena.mjs`, `_ver-detalhe.mjs`, `_ver-colapso.mjs`.

---

## O QUE O PLANO ERROU — e como ficou resolvido

Sete pontos. Nenhum foi contornado no olho; todos foram medidos.

| # | o que | como ficou |
|---|---|---|
| 1 | o limiar de amarelo da Task 2 **não achava a faixa de perigo** — a pintura é mais escura do que ele supunha | o limiar passou a ser DERIVADO do pixel mais quente da própria arte |
| 2 | o retângulo de amostra `PAREDE` acusava 15,3% de vazamento — **ele próprio invadia a janela 2** | 5 patches de parede real (0,0%) + teste forte: zero transparência fora das 5 janelas |
| 3 | o plano **não previa escala** para as carcaças — 128px nativos tapavam as janelas, matando a nadadeira | escala derivada do teto medido (29px de folga ÷ 77px = 0,376 → **0,36**) |
| 4 | e previa `setScale()`, contra a lei de **1px de arte = 1px de jogo** | `scripts/reduzir-sprite.mjs` assa o tamanho no arquivo e relimiariza a franja do lanczos |
| 5 | o assert do portão nunca ficaria verde: o colapso **só dispara depois da escolha da nave** | a sonda passou a JOGAR a cena, esperando o **estado** (painel aberto), não o relógio |
| 6 | e ela lia o alpha no meio do fade de 260ms (pegou 0,32) | espera o tween fechar antes de julgar |
| 7 | a `probe-interlude3` cobrava `y≈143`, o convés do azulejo | **corrigida para 164 = 171−7**, tolerância de 4px intacta — corrigida, não afrouxada |

---

## O QUE ESTÁ VERDE

`_cut3/probe-cut3-visual.mjs` (16 asserts) · `probe-interlude3` · `probe-stage3` · `probe-stage4` ·
`probe-stage2` · `probe-stage1-visual` · `npm run typecheck` · `npm run build`

⚠️ **Sondas de tempo real: UMA POR VEZ** — três browsers headless no mesmo Vite quebram.

⚠️ **`probe-f3-visual` reprovou uma vez e passou nas duas seguintes.** O assert dos atiradores é o
ruído JÁ DOCUMENTADO neste HANDOFF (contagem de lança-mísseis por sorteio). Nesta sessão ele deu
**8, 4 e 3** — o 8 estica a faixa que o doc registrava como 2 a 6. **Não afrouxe: rode de novo.**

---

## ⚠️ A FRONTEIRA — conferida por quatro caminhos, e ela continua valendo

O `public/sprites/hangar.png` **não foi tocado** e não pode ser: ele é a parede de fundo da
**Fase 4** (`Parallax` modo `interior`), que é a **Fatia 7**. A pintura entrou como asset NOVO
(`paintBgCut3`).

Provas em cada rodada: `hangar.png` ainda **160×160** · `git status` limpo nele ·
`usamHangar: 0` na sonda da fatia · `probe-stage4` verde de ponta a ponta.

---

## AS DECISÕES JÁ TOMADAS — não reabra

| | |
|---|---|
| A arte de fundo | **pintura do Henrique**, versionada em `cdaefde` |
| O lugar | *"visceral e biomecânica, para passar esse ar de interior"* |
| As janelas | mostram o **exterior** (a nebulosa) |
| A nadadeira | **uma remada só, atravessando**, da **DIREITA para a ESQUERDA** |
| As peças do PixelLab | as carcaças **e** o portão **e** a nadadeira |
| A boca da fusão | fora de escopo — a Fatia 5 fechou |

⚠️ **A DIREÇÃO DA NADADEIRA FOI DERIVADA E CONFIRMADA, não assumida.** A Fase 3 cravou que o corpo
do Leviatã fica fora do quadro à direita e que ele *"nada no mesmo sentido da nave"*; num bicho que
nada para a direita, a **remada de força varre para trás**. Assumir uma direção sem perguntar foi o
que reprovou **quatro** versões do rabo.

---

## DEPOIS DO SEU VEREDICTO

- **Se aprovar:** `superpowers:finishing-a-development-branch` → merge `--no-ff` em `main` + push
  em `origin` (⚠️ **nunca** no remoto `legacy`, que é o repositório ANTIGO), e o roadmap anda para
  a **Fatia 7**.
- **Se reprovar algum ponto:** os quatro pontos acima são todos de correção barata — três são de
  uma linha ou de um tint medido, e só a troca da carcaça do meio pede um lote novo do PixelLab.

---

## ONDE ISSO CAI NO ROADMAP

```
0–5  ✅ fechadas e mergeadas
6    🟠 Cutscene 3 — IMPLEMENTADA, aguardando teste jogado   ← VOCÊ ESTÁ AQUI
7    ⬜ Fase 4 — o interior (⚠️ mexe em GEOMETRIA, não só em pintura)
8    ⬜ Cutscene final + as duas baleias erradas que ainda estão na F3/F4
```

Depois das fatias, na ordem já fechada: **calibragem** → **balanceamento** (armas e naves, o
ENXAME que nunca foi jogado por humano) → **playtest humano de todas as fases** → placar
(Supabase) → deploy.

---

## O QUE SEGUE ANOTADO PARA AS FATIAS DONAS

- **Os dois projéteis da Capitânia (Fase 2)** — `BossCapitania.ts:578` usa `bolt2` × 0,9 tingido de
  laranja, mesma forma e quase a mesma escala do tiro comum. O padrão que o Henrique já reprovou
  duas vezes (*"um tiro magenta igual, sem característica nenhuma"*).
- **`paint-bg-f1.png` ainda é 768×394** — a última pintura fora da resolução do jogo.
- **As duas baleias erradas** ainda dentro da F3/F4 — isso é literalmente a Fatia 8.

---

## O REPOSITÓRIO

`origin` = **github.com/HenriqueCrosio/AlienWorld-Remastered-V2**.
⚠️ O remoto **`legacy`** aponta para o repositório ANTIGO — **nunca empurre para ele**. Use
`git push origin feat/cutscene3-visual` (a branch ainda não subiu).
