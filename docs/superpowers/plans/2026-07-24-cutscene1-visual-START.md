# START — Fatia 2: CUTSCENE 1 (fundo pintado + Aurora nítida)

**Documento de retomada.** Criado 2026-07-24 com spec e plano prontos e commitados; a execução
ainda NÃO começou (nenhum código/asset tocado).

---

## 🔑 COMO RETOMAR (invocação)

Na próxima sessão, diga algo como:

> **"Leia `docs/superpowers/plans/2026-07-24-cutscene1-visual-START.md` e execute o plano da
> cutscene 1 a partir da Task 0."**

---

## Estado atual (2026-07-24)

- **Fatias 0 e 1 FECHADAS e mergeadas no `main`** (fatia 1 mergeada nesta data; branch
  `feat/fase1-cenario` apagado). ⚠️ O `main` local está VÁRIOS commits à frente de
  `origin/main` — o push acontece no FIM desta fatia (pedido do Henrique).
- **Spec:** `docs/superpowers/specs/2026-07-24-cutscene1-visual-design.md` (aprovado).
- **Plano:** `docs/superpowers/plans/2026-07-24-cutscene1-visual.md` (Tasks 0–3, commitado).
- **Insumos JÁ NO DISCO** (salvos pelo Henrique):
  - `assets/raw/paint-bg-cut1-original.png` (1694×928) — o céu da cutscene (lua embaixo à
    esquerda + cinturão à direita + galáxia). Alvo: 480×270.
  - `assets/raw/paint-bg-f2-original.png` — o fundo da FASE 2, guardado para a fatia 3 (colônia
    de mineração no cinturão). NÃO usar nesta fatia; commitar junto (Task 1 Step 6).
- Execução escolhida: **inline** (executing-plans), pelos 2 gates de aprovação do Henrique.

## O plano em uma linha por task

0. Branch `feat/cutscene1-visual` a partir do `main`.
1. **Fundo:** `scripts/paint-bg.mjs` (novo, reusável na fatia 3) → `paint-bg-cut1.png` 480×270 →
   chave `paintBgCut1` no BootScene → na InterludeScene a pintura (depth **−110**, ATRÁS do
   starfield −100) substitui o `Parallax('espaco')`, que vira fallback. Deriva `x -= 26*0.04*dt`.
2. **Aurora:** ref = `ship-cinza.png` ampliado a 192 de largura (`scripts/_ref-aurora.png`;
   NUNCA usar o `carrier.png` atual como ref — máquina de cópia) → `gerar.mjs "<prompt do
   plano>" 192 sidescroller` → **candidatos aprovados pelo Henrique** → `install-sprite.mjs
   <id> - carrier-big` → `medir-conves.mjs` acha DECK_ROW (o salto de largura) e o vão do rim →
   geometria `this.cfg` por textura (×2 novo / ×3.2 fallback antigo). **Screenshot do pouso
   aprovado pelo Henrique.**
3. Regressão (`probe-interlude.mjs` completo + `probe-stage1-visual.mjs`) → merge no `main` →
   **`git push origin main`** (fecha a fatia e publica tudo).

## ⚠️ Fatos que custaram a descobrir (não redescobrir)

- **A sonda da cena JÁ EXISTE:** `scripts/probe-interlude.mjs` (gera os `probe-cut-*.png` e
  valida róster/troca de textura/queda na F2). Não criar sonda nova.
- **Tratamento do fundo = o da F1** (commit `b98cce3`): downscale para a resolução interna
  (1 px arte = 1 px jogo), SEM quantização — o upscale nearest da engine faz o resto. O alvo é
  **480×270** e não 2 telas: em 768×432 a lua sairia da tela (só a metade de cima apareceria).
- **Starfield desenha em depth −100** (`src/Starfield.ts:27`). A pintura vai em **−110** para
  as estrelas em movimento ficarem POR CIMA (são elas que dão a deriva).
- **Geometria do convés é MEDIDA, não chutada** (`InterludeScene.ts:60-73` conta a lição): a
  linha do convés = 1º salto grande de largura opaca. `medir-conves.mjs` (código no plano)
  imprime linha a linha e marca o `◀ SALTO`.
- **Roteiro/tempos/textos INTACTOS** — inclusive SEM tecla de pular (decisão documentada no
  código; o ESPAÇO martelado comia a cena).
- **Commits só com autoria do Henrique** (sem Co-Authored-By).

## Dívidas da fatia 1 (anotadas, não bloqueiam; ver o START da leva 2)

Batedor sem silhueta de dardo · chamas dos propulsores do chefão retangulares · conferir a
duração do flash magenta da decolagem. Podem virar itens de uma passada de polish futura.
