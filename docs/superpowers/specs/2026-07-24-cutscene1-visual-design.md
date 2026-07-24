# Fatia 2 — Cutscene 1 (InterludeScene): passe visual — Design

**Data:** 2026-07-24 · **Fatia:** 2 de 8 (mapa em `2026-07-21-menu-visual-design.md`)
**Escopo fechado com o Henrique:** MÍNIMO — fundo pintado novo + Aurora nítida. Nada além.

## Contexto

A cutscene 1 (`src/scenes/InterludeScene.ts`) roda entre a Fase 1 e a Fase 2: placar → piloto
automático → aproximação → pouso na capitânia Aurora → escolha de nave → implosão → decolagem.
O **roteiro, os tempos e os textos já funcionam e NÃO mudam** — esta fatia é só apresentação.

Estado atual (screenshots `probe-cut-*.png`):

- O fundo usa o parallax `espaco` (o mesmo da Fase 2 pixel): funcional, mas é a estética antiga.
- **A Aurora é o problema nº 1**: arte de 120×49 (`carrier.png`) esticada ×3.2 — um borrão cinza
  com densidade de pixel diferente de tudo (nave e asteroides são nítidos). A protagonista
  emocional da cena é o elemento mais fraco da tela.

## Objetivo

1. **Fundo:** a pintura do Henrique (espaço aberto: lua embaixo à esquerda, campo de asteroides
   adensando à direita, galáxia espiral) vira o céu da cutscene.
2. **Aurora:** casco novo em pixel art nítido (escala inteira), mantendo o conceito que já
   funciona — "o convés é o horizonte".

## Design

### 1. Fundo pintado (`public/sprites/paint-bg-cut1.png`)

- Original: `assets/raw/paint-bg-cut1-original.png` (1694×928, fornecido pelo Henrique).
- Tratamento IGUAL ao da Fase 1 (`paint-bg-f1.png`, commit `b98cce3`): **reduzir para a
  resolução interna** (crop leve de proporção 1.825→1.778 antes do downscale). 1 px da arte =
  1 px do jogo; o upscale nearest da engine dá o acabamento pixel. Sem quantização manual.
  **Alvo 480×270** (não 2 telas): a tela mostra a composição INTEIRA (lua embaixo à esquerda,
  galáxia em cima) com folga de 96px horizontais para a deriva (~40px usados na cena de <40s);
  em 768×432 só a metade de cima da pintura apareceria e a lua ficaria fora da tela.
- Na `InterludeScene`, a pintura **substitui** o `new Parallax(this, 'espaco')`: entra como
  camada mais distante, com o **starfield mantido por cima** (as estrelas em movimento carregam
  a sensação de deriva). Deriva da pintura lentíssima (fator ~0.04, como na F1) — a cena dura
  <40s, nunca repete nem esgota as 2 telas.
- Narrativa do céu: planeta (F1) → borda do cinturão (cutscene; a lua é o mundo que ficou, o
  cinturão à direita é para onde a nave decola) → dentro do cinturão (F2).
- **Nota transitória:** até a fatia 3 instalar a pintura da F2
  (`assets/raw/paint-bg-f2-original.png`, já salvo), o corte cutscene→F2 diverge (pintura →
  cinturão pixel antigo). Esperado; não é regressão desta fatia.
- Guarda: sem o PNG, a cena mantém o parallax `espaco` atual (fallback = comportamento de hoje).

### 2. Aurora nova (PixelLab, ~192×80, exibida ×2)

- **Conceito preservado:** a Aurora não é um sprite que cabe na tela — ela é o CHÃO. Convés
  plano na linha do horizonte, superestrutura (torres/antenas) subindo dele, casco preenchendo
  a base da tela.
- Arte ~192 de largura × ~80 de altura, exibida em **escala ×2 inteira** → 384px = a largura
  exata da tela, sem borrão de escala fracionária.
- **Direção:** militar-humana (cinza-azulado, luzes quentes de janela/pista), em contraste
  deliberado com a facção biomec roxa/magenta dos inimigos. Vista lateral.
- **Pipeline da leva 2** (lições em `2026-07-22-fase1-inimigos-chefao-START.md`): `style_images`
  com ref lateral de OUTRO asset (nunca o `carrier.png` atual — ref do próprio vira máquina de
  cópia); a MAIOR ref define o tamanho de saída. **Candidatos aprovados pelo Henrique antes de
  instalar.**
- Chave nova (ex.: `carrierBig`) com guarda de textura; sem o PNG, a cena cai no `carrier`
  antigo ×3.2 (comportamento de hoje).

### 3. Código — só geometria (zero roteiro)

Em `InterludeScene.ts`, recalibrar MEDINDO no PNG novo (nunca chutar — lição das bocas de
canhão): `ART_H`, `DECK_ROW` (linha do convés na arte), `SCALE` (3.2→2), o `deckRim` (manter a
aresta de luz, re-medida: x0/largura do vão opaco do casco na linha do convés; remover só se a
arte nova já trouxer a própria aresta iluminada) e a folga do `subida` (o casco continua
entrando por baixo). Beats, delays, textos e âncoras de explosão em `DECK_Y` intactos.

## Fora de escopo (decidido)

- Frota ao fundo, encenação extra do pouso (luzes de pista, poeira), placar/tipografia novos.
- Qualquer mudança de roteiro/tempos/entradas (inclusive a ausência da tecla de pular, que é
  decisão de design documentada no código).
- O fundo da Fase 2 (fatia 3) e o `paint-bg-f1.png` da Fase 1 (fica como está).

## Verificação

- `npm run build` (typecheck + vite) limpo.
- Sonda nova `scripts/probe-cut1-visual.mjs`: entra na Interlude direto e fotografa 4 momentos —
  aproximação, pouso, painel de escolha, implosão. Screenshots revisados a olho pelo Henrique.
- Fallbacks: cena sobe SEM `paint-bg-cut1.png` e SEM a arte nova da Aurora (cai no visual atual).

## Critérios de sucesso

1. A Aurora lê como uma nave capital NÍTIDA — pixels na mesma densidade da nave do jogador
   (escala inteira), convés claro onde a nave pousa.
2. O céu da cutscene é a pintura do Henrique, com a lua e o cinturão legíveis, e o starfield
   dando movimento.
3. Nenhum beat mudou: mesmos tempos, mesmos textos, escolha de nave intacta.
4. Build limpo + sonda verde + aprovação a olho.

## Constraints

- Commits com autoria só do Henrique (sem Co-Authored-By).
- Arte aprovada pelo Henrique antes de entrar no jogo (Aurora: candidatos PixelLab).
- **Ao fechar a fatia: commit + push** (pedido do Henrique em 2026-07-24; inclui os commits de
  fatias anteriores que estão só locais).
