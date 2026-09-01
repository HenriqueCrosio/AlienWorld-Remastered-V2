# START — Fatia 6: CUTSCENE 3 ("O HANGAR DO LEVIATÃ")

**🟡 SPEC E PLANO PRONTOS. NENHUMA LINHA DE CÓDIGO ESCRITA AINDA.** `main` limpa e com push
(`cdaefde`). Não há branch da fatia — ela ainda não começou.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-01-cutscene3-visual-START.md`. A Fatia 6 (Cutscene 3, o
> hangar do Leviatã) tem spec e plano aprovados e zero código. Sobe o `npm run dev` e executa o
> plano tarefa a tarefa, com checkpoint entre elas — eu quero ver a tira de quadros de cada uma
> antes de você seguir. Comece pela Task 1, a pintura."**

**Os dois documentos, nesta ordem:**
- `docs/superpowers/specs/2026-09-01-cutscene3-visual-design.md` — o QUÊ e o PORQUÊ
- `docs/superpowers/plans/2026-09-01-cutscene3-visual.md` — as 5 tarefas, passo a passo

---

## O QUE A FATIA FAZ

A cutscene **já existe e funciona** desde julho (`[P]` no menu): a nave cambaleia, cai, quica,
derrapa, a saída sela atrás dela e o painel de naves abre com o róster completo.
**Esta fatia não constrói a cena — ela dá a ela um LUGAR.**

| Task | | entrega |
|---|---|---|
| 1 | A pintura vazada e reduzida | as 5 janelas transparentes, 384×216 |
| 2 | A parede vira a pintura | convés **re-medido**, `hangar.png` intocado |
| 3 | A nadadeira peitoral | a remada atravessando as janelas |
| 4 | As carcaças da frota engolida | o 2º plano + a narrativa que só existe em comentário |
| 5 | O portão | a saída morre com uma FORMA, não com entulho |

---

## ⚠️ AS QUATRO COISAS QUE NÃO PODEM SER ESQUECIDAS

**1. O `public/sprites/hangar.png` NÃO SE TOCA.** Ele é a parede de fundo da **Fase 4**
(`Parallax` modo `interior`), e a Fase 4 é a **Fatia 7**. A pintura entra como asset NOVO
(`paintBgCut3`). A Task 2 tem um passo só para provar isso: `git status` limpo no arquivo mais
`probe-stage4` verde. É a mesma lei que o cooldown dos canhões já custou nesta campanha.

**2. TODO NÚMERO NOVO SE MEDE, E SE CONFERE MARCANDO NA ARTE.** O `DECK_ROW = 138` de hoje é do
azulejo antigo de 160px — herdá-lo repetiria o que a serpente acabou de cobrar (o offset da boca da
arte velha apontava para o lugar errado da nova). E marcar importa: nesta mesma sessão o primeiro
ponto de boca que eu cravei caiu **fora da silhueta**, e só apareceu porque o marcador foi
desenhado na arte antes de o número entrar no código.

**3. SÓ TEXTURA SE GERA; MOVIMENTO É TWEEN.** O v3 do PixelLab leu *"bater para cima e para baixo"*
como **girar** e devolveu o rabo do Leviatã como hélice. Gera-se a nadadeira; a remada é código.

**4. CADA TAREFA TERMINA OLHANDO A TIRA DE QUADROS.** Sonda que passa não prova que a cena está
boa — foi a revisão com o olho que pegou os quatro defeitos **desta cena** em julho, com a sonda
verde. `node scripts/_cut3/ver-cena.mjs`.

---

## AS DECISÕES JÁ TOMADAS — não reabra

| | |
|---|---|
| A arte de fundo | **pintura do Henrique**, já entregue e versionada |
| O lugar | *"visceral e biomecânica, para passar esse ar de interior, sendo que a fase 4 já é no interior do Leviatã"* |
| As janelas | mostram o **exterior** (a nebulosa), como hoje |
| A nadadeira | **uma remada só, atravessando**, da **DIREITA para a ESQUERDA** |
| As peças do PixelLab | as carcaças **e** o portão **e** a nadadeira (ele pediu as três) |
| A boca da fusão | fora de escopo — a Fatia 5 fechou |

⚠️ **A DIREÇÃO DA NADADEIRA FOI DERIVADA E CONFIRMADA, não assumida.** A Fase 3 cravou que o corpo
do Leviatã fica fora do quadro à direita e que ele *"nada no mesmo sentido da nave"*; num bicho que
nada para a direita, a **remada de força varre para trás**. Assumir uma direção sem perguntar foi o
que reprovou **quatro** versões do rabo.

---

## O ESTADO DA ARTE

```
assets/raw/paint-bg-cut3-original.png   ✅ 1672×940, versionada (cdaefde)
public/sprites/paint-bg-cut3.png        ⬜ Task 1 gera
public/sprites/nadadeira.png            ⬜ Task 3 gera no PixelLab
public/sprites/carcaca-{1,2,3}.png      ⬜ Task 4 gera no PixelLab
public/sprites/portao-hangar.png        ⬜ Task 5 gera no PixelLab
```

⚠️ **A PINTURA CHEGOU COM AS JANELAS MARCADAS, MAS NÃO VAZADAS** — 3 canais, sem alpha; o xadrez
está pintado como pixels cinza opacos. O key foi medido: janelas em luminância 73 / saturação 0,8
(100% de acerto), convés e faixa de perigo a 0% — mas **20,5% da parede cai na mesma faixa neutra**.
Por isso o vazamento é por **sementes**, nunca por limiar global: pixel de parede que por acaso casa
não está conectado a janela nenhuma. Apertar o limiar comeria a **borda** das janelas, que é onde a
nadadeira aparece recortada.

**Saldo PixelLab:** ~3.400 gerações. Três lotes previstos (nadadeira, carcaças, portão), ~20 cada.

---

## O QUE TESTAR, E COMO

`npm run dev` (porta 5173). No menu: **`P`** entra direto na Cutscene 3.

Outros atalhos: `M` Fase 3 · `N` treino da serpente · `L` Fase 4 · `V` Fase 2 · `B` treino F1.

**Sondas** (⚠️ **uma por vez** — três browsers headless no mesmo Vite quebram):
- `_cut3/probe-cut3-visual.mjs` — a sonda da fatia, criada na Task 2 e crescendo a cada tarefa
- `_cut3/ver-cena.mjs` — a tira de 16 quadros da cena inteira
- `probe-interlude3.mjs` — a sonda que já existia da cutscene
- `probe-stage4.mjs` — **a regressão da fronteira**: a Fase 4 tem que abrir igual
- `probe-stage3.mjs` · `probe-chain.mjs` — a campanha

**Ferramentas úteis:**
- `_folha-contato.mjs <object-id> <n> <zoom> <saída>` — a grade ampliada de um lote de review do
  PixelLab. Escolher candidato na miniatura é adivinhar.
- `_medir-paleta.mjs` — a cor MODAL de uma arte. **Use antes de discutir cor.**
- `install-sprite.mjs` · `install-anim.mjs` — instalam limpando xadrez e bordas opacas

---

## ONDE ISSO CAI NO ROADMAP

```
0–5  ✅ fechadas e mergeadas
6    🟡 Cutscene 3 — spec e plano prontos, código zero   ← VOCÊ ESTÁ AQUI
7    ⬜ Fase 4 — o interior (⚠️ mexe em GEOMETRIA, não só em pintura)
8    ⬜ Cutscene final + as duas baleias erradas que ainda estão na F3/F4
```

Depois das fatias, na ordem já fechada: **calibragem** → **balanceamento** (armas e naves, o
ENXAME que nunca foi jogado por humano) → **playtest humano de todas as fases** → placar
(Supabase) → deploy.

---

## O QUE SEGUE ANOTADO PARA AS FATIAS DONAS

- **Os dois projéteis da Capitânia (Fase 2)** — `BossCapitania.ts:578` usa `bolt2` × 0,9 tingido de
  laranja, mesma forma e quase a mesma escala do tiro comum. É o padrão que o Henrique já reprovou
  duas vezes (*"um tiro magenta igual, sem característica nenhuma"*).
- **`paint-bg-f1.png` ainda é 768×394** — a última pintura fora da resolução do jogo.
- **As duas baleias erradas** ainda dentro da F3/F4 — isso é literalmente a Fatia 8.

---

## O REPOSITÓRIO

`origin` = **github.com/HenriqueCrosio/AlienWorld-Remastered-V2**.
⚠️ O remoto **`legacy`** aponta para o repositório ANTIGO — **nunca empurre para ele**. Use
`git push origin main`.
