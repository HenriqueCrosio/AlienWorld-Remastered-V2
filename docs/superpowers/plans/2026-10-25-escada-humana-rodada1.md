# A escada humana nova — rodada 1 (os concepts da T0 e da T1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Nesta rodada a execução é inline:** é trabalho de olho (abrir cada opção ampliada), não de subagente.

**Goal:** 3–4 opções de T0 e de T1 recortadas da laranja "a", numa folha, para ele escolher uma por tier — sem tocar o
jogo.

**Architecture:** uma ferramenta lê a "a" (48×32), aplica uma RECEITA por opção (apagar peças, fechar o contorno onde a
peça saía, retoques de pixel) e encolhe com `_encolher.mjs` até o alvo do tier. Outra monta a folha (ampliado + 1×, ao
lado da "a" e da escada de hoje). As receitas são dados, num arquivo só, para refazer qualquer opção.

**Tech Stack:** Node (ESM) + sharp; as ferramentas de `scripts/_naves/`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-25-escada-humana-conceito-design.md` (§2 é esta rodada).
- A base é `docs/superpowers/folhas/2026-10-22/naves/cru/conceito/gerado/laranja-48x32-21-00.png` (a "a"); ela NÃO muda.
- Alvos: T1 ~38×20, T0 ~33×15 (caixa de desenho). A T2 é a "a" inteira, 41×22.
- Nenhum pixel novo de cor inventada: retoque só copia cor que já existe na "a" (o contorno, os tons do casco).
- Nada em `src/` ou `public/`; nada plantado no jogo nesta rodada (o pedido dele).
- Cada opção é aberta ampliada antes de entrar na folha (`conferir-ampliado-antes-de-mostrar`).
- Sem commit: commit só quando ele pedir, só no nome dele.

---

### Task 1: a ferramenta do recorte

**Files:**
- Create: `scripts/_naves/_escada-recorte.mjs`
- Create: `scripts/_naves/escada-receitas.mjs`

**Interfaces:**
- Produces: `node scripts/_naves/_escada-recorte.mjs <outDir> [id...]` → `<outDir>/<id>.png` (quadro 48×32) e
  `<outDir>/<id>-cru.png` (antes de encolher). Sem `id`, faz todas.
- `escada-receitas.mjs` exporta `BASE` (caminho da "a") e `RECEITAS: { id, tier, nome, apagar: [x0,y0,x1,y1][],
  fechar: boolean, pixels: [x,y,[sx,sy]][], alvo: 'WxH' | null }[]`.

- [ ] **Step 1:** escrever as receitas (T1-a..d, T0-a..d) a partir do mapa da "a" (spec §2: aleta x5–9 y9–12; asa de
  cima x9–19 y5–12; asa de baixo x10–21 y19–26).
- [ ] **Step 2:** escrever a ferramenta: apagar os retângulos; `fechar` = todo pixel apagado vizinho (4 lados) de um
  pixel que ficou e não é contorno vira a cor do contorno da "a"; `pixels` copia a cor de `(sx,sy)` da "a"; salva o
  `-cru`; chama `_encolher.mjs` com o alvo.
- [ ] **Step 3:** rodar e conferir o log de cada uma (`41x22 -> WxH`).
  Run: `node scripts/_naves/_escada-recorte.mjs docs/superpowers/folhas/2026-10-25/escada/opcoes`
  Expected: 8 linhas `<id>.png: 41x22 -> ...`, sem erro.

### Task 2: olhar ampliado e retocar

- [ ] **Step 1:** ampliar cada opção (×16 com grade) e olhar: nariz, cabine, bocal, juntas, pixels soltos.
- [ ] **Step 2:** para cada defeito, um retoque em `pixels` (ou outro corte em `apagar`) na receita; rodar de novo.
- [ ] **Step 3:** contar pixels soltos (opaco sem vizinho opaco nos 4 lados): zero em todas.

### Task 3: a folha

**Files:**
- Create: `scripts/_naves/_montar-escada.mjs`
- Create: `docs/superpowers/folhas/2026-10-25/escada/escada.html`

- [ ] **Step 1:** a montagem: por tier, as opções ×8 numeradas; uma faixa com a escada de hoje (T0/T1/T2) e uma com
  cada combinação nova em 1× e ×3 sobre o fundo escuro do jogo; a "a" sempre ao lado.
- [ ] **Step 2:** a folha HTML (o padrão das folhas de 22/10: link para a `naves-conceito.html`, as medidas de cada
  opção, as perguntas no fim).
- [ ] **Step 3:** abrir em `http://localhost:5173/docs/superpowers/folhas/2026-10-25/escada/escada.html`, conferir que
  toda imagem carrega (200).

### Depois desta rodada

Ele escolhe uma T0 e uma T1. As rodadas 2 (o motor e a preta) e 3 (o jogo) ganham o plano delas com as escolhas dele.
