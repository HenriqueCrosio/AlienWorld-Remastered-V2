# START — FATIA 7: A FASE 4, O INTERIOR

**⬜ NÃO COMEÇOU.** A Fatia 6 fechou em 2026-09-05 e esta é a próxima frente do passe visual.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-05-fatia7-fase4-START.md`. A Fatia 6 fechou e a 7 é a
> Fase 4, o interior do Leviatã. Vamos brainstormar antes de qualquer coisa — quero decidir o que
> a fase vira antes de você escrever spec."**

⚠️ **NÃO PULE PARA O SPEC.** As duas fatias anteriores mostraram que o custo alto está em decidir
errado, não em implementar: a Cutscene 3 levou duas voltas e cinco rodadas de ajuste porque o
enquadramento, a cor e a coreografia foram decididos por mim e reprovados por ele jogando. O
brainstorming é o passo que economiza as rodadas.

---

## ⚠️ ESTA FATIA É DIFERENTE DAS SEIS ANTERIORES

As fatias 0–6 mexeram em **PINTURA**: trocar o que se vê sem tocar em como o jogo funciona. A
Fatia 7 mexe em **GEOMETRIA** — a Fase 4 tem teto, paredes que nascem durante a luta, e um chefão
em duas formas. Mudar arte aqui pode mudar **onde o jogador colide**.

⚠️ **E ELA PODE TOCAR O `hangar.png`** — o arquivo que seis fatias protegeram como fronteira. Ele é
a parede de fundo da Fase 4 (`Parallax` modo `interior`, `src/Parallax.ts:300`) e também aparece na
cutscene final (`Interlude4Scene.ts:253`). **Se ele mudar, as duas mudam juntas.** Isso não é mais
proibido — é a Fatia 7 —, mas é a coisa que precisa ser DECIDIDA, não descoberta.

Antes de mexer nele, rode `node scripts/probe-stage4.mjs` e guarde o resultado: é a linha de base.

---

## O QUE JÁ EXISTE, E ONDE

| peça | onde |
|---|---|
| O parallax do interior | `src/Parallax.ts` → `buildInterior()` (modo `'interior'`), ancorado no TETO com `flipY` |
| O roteiro da fase | `src/systems/StageDirector.ts` → `STAGE_4` (linha ~342) |
| O chefão: o GUARDIÃO e o NÚCLEO | `src/entities/BossNucleo.ts`, sheets `guardiaoIdleSheet` e `nucleoBeatSheet` |
| A cutscene final | `src/scenes/Interlude4Scene.ts` (usa `hangar` e o Leviatã-baleia) |
| A sonda de ponta a ponta | `scripts/probe-stage4.mjs` — atravessa a fase, mata o núcleo e chega ao GameOver |

---

## ⚠️ AS DUAS BALEIAS ERRADAS AINDA ESTÃO NO JOGO

Vem do HANDOFF desde julho: *"as baleias erradas ainda estão DENTRO do jogo/cutscene (Fase 3/4) —
corrigir nas fatias 7/8"*. O Leviatã canônico é o objeto biomecânico com a lava das costelas
(`f397793a-0e59-49e2-9853-848b674b3fd7`); a Fase 3 e a cutscene final ainda usam duas versões
erradas que um agente trocou. **Isso é escopo desta fatia ou da 8** — decida no brainstorming.

---

## AS LEIS QUE VALEM AQUI (custaram sessões inteiras)

| lei | onde ela foi paga |
|---|---|
| **1px de arte = 1px de jogo.** Tamanho e cor se assam no ARQUIVO, nunca em `setScale`/`setTint`. | `docs/ASSETS.md`, 02/09 e 03/09 |
| ⚠️ **E ela cedeu UMA vez, em 05/09**, para a garganta ocupar a coluna direita. Foi decisão do Henrique com o custo medido na mesa (zoom 6× da grade). **Não ceda de novo sem perguntar.** | `Interlude3Scene.GARGANTA_*` |
| **Largura ÍMPAR + `roundPixels: true` = âncora no canto, nunca no centro.** Pelo centro o x cairia em `X,5` e o arredondamento deixa uma coluna de artefato. | `Interlude3Scene.GARGANTA_X` |
| **Arte que o Henrique fez não se corrige sem perguntar.** O pipeline pode LIMPAR (xadrez, bordas) e RECORTAR; mudar tamanho ou cor, **pergunte**. | `docs/ASSETS.md`, 05/09 |
| **A faixa de matiz se confere contra o `COLORS`, não contra a memória.** `player` = 188°, `enemy` = 337°, `hot` = 31°. | `docs/ASSETS.md`, 05/09 |
| **Um assert de "aconteceu" não prova "foi visto".** Para beat curto, meça a duração na tela e conte quem desenha por cima. | `scripts/_cut3/_diag-morte.mjs` |
| **A sonda espera por ESTADO, nunca por relógio.** Espera cega quebra quando um assert novo gasta tempo. | `probe-cut3-visual`, 05/09 |
| **Nome de asset novo se confere ANTES de escrever no disco.** `grep` no `ART`; o typecheck avisa tarde demais. | `docs/ASSETS.md`, 04/09 |
| **Sondas de tempo real: UMA POR VEZ.** Três browsers headless no mesmo Vite quebram. | — |
| **Os PNGs de bancada não são versionados** (já estão no `.gitignore`); os SCRIPTS, sim. | `.gitignore`, 05/09 |

---

## COMO O HENRIQUE JULGA — o que a Fatia 6 ensinou

1. **Ele julga JOGANDO, não olhando screenshot.** Três defeitos passaram por sondas verdes e só
   caíram quando ele rodou a cena.
2. **Quando ele reprova, pergunte se é ARTE ou ESCOPO.** A nadadeira foi refeita duas vezes antes
   de ele dizer que ela simplesmente não valia a rodada.
3. **Mostre o custo antes de pedir a decisão.** As escolhas que funcionaram (a 3ª carcaça, o
   tamanho da garganta, a cor) vieram todas de um mock medido com as opções lado a lado.
4. **Se a cor parecer errada no navegador dele, é CACHE.** O Vite serve `public/` sem hash no nome:
   `Ctrl+Shift+R`, ou `node scripts/_cut3/_ver-agora.mjs` para um quadro de browser limpo.

---

## O ORÇAMENTO DO PIXELLAB

Em 2026-09-05: **~4.890 de 5.000**, ciclo virando em **2026-10-04**. As sobras não acumulam.
Orçamento não é restrição — o gargalo são as rodadas de julgamento, não as gerações.

---

## ONDE ISSO CAI NO ROADMAP

```
0–6  ✅ fechadas   (a 6 aprovada no teste jogado em 2026-09-05)
7    ⬜ Fase 4 — o interior (⚠️ mexe em GEOMETRIA, e pode tocar o hangar.png)  ← VOCÊ ESTÁ AQUI
8    ⬜ Cutscene final + as duas baleias erradas que ainda estão na F3/F4
```

Depois das fatias, na ordem já fechada: **calibragem** → **balanceamento** → **playtest humano de
todas as fases** → placar (Supabase) → deploy.

---

## O REPOSITÓRIO

`origin` = **github.com/HenriqueCrosio/AlienWorld-Remastered-V2**.
⚠️ O remoto **`legacy`** aponta para o repositório ANTIGO — **nunca empurre para ele**.

⚠️ **Commits são de autoria SÓ do Henrique** — sem `Co-Authored-By`, sem "Generated with".
