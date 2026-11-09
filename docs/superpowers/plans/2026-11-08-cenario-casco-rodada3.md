# O cenário do casco — RODADA 3: a batalha ao fundo (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ao fundo da nebulosa, longe, os restos da frota caindo: clarões de explosões distantes sempre (raros), e — só
nos momentos calmos da luta final — passagens de 1–3 naves humanas em silhueta perseguidas por criaturas, trocando
tiros, uma delas abatida. Spec `specs/2026-11-08-cenario-casco-arena-design.md` §4 e §6.

**Architecture:** a mesma receita da rodada 2: uma lógica PURA (`src/f3/batalhaFundo.ts`, testável no Node) que simula e
desenha num buffer RGBA, e uma camada Phaser (`src/f3/camadaBatalha.ts`, `CanvasTexture` 384×128 de y=8, `depth −93`:
atrás das nuvens à deriva −92/−91, na frente da pintura −96, sem empate com −93,5). As silhuetas são desenhadas em pixel
([[pecas-minusculas-em-pixel]]): mapas de caracteres em `src/f3/silhuetasF3.ts`, 4 opções de nave humana e 4 de criatura
para ele escolher numa folha de conceitos (ele verifica depois; o jogo começa com a opção A de cada). Os momentos calmos
vêm de um getter só de LEITURA no `BossSerpente` (`momentoCalmo`), sem mudar nada da luta.

**Tech Stack:** Phaser 3.90, TypeScript (Node 24 lê `.ts`), sharp, Playwright, ffmpeg.

## Global Constraints

- **Só visual**; a luta não muda (o getter só lê). `test-enguia-porte` passa.
- **Pequeno, escuro e lento** ([[camada-de-tras-diminui]]): silhuetas de 7–14 px, quase pretas, com um fio da luz da
  nebulosa em cima; as nuvens à deriva passam na frente.
- **Cores:** nada em vermelho de aviso nem branco-azulado; os tiros humanos âmbar, os das criaturas verde-água escuro.
- **No vácuo nada cai:** a nave abatida perde o empuxo, segue na inércia girando e explode.
- **Regimes:** no casco (Ato 2) só clarões raros (1 a cada 6–10 s); na arena clarões raros + passagens só quando
  `momentoCalmo` (a enguia: mergulho, mergulho-cauda, volta-escondida, afunda; as 3 cabeças: a pausa entre as habilidades,
  fora da entrada); nunca duas passagens a menos de 8 s.

## Tasks

### Task 1: As silhuetas e a folha de conceitos
- `src/f3/silhuetasF3.ts`: `SILHUETAS_HUMANAS` e `SILHUETAS_CRIATURAS` (A–D, mapas de caracteres: `#` corpo, `^` o fio de luz
  em cima, `o` o motor/olho que acende), `carimbo(mapa)` → pixels; `ESCOLHA = { humana: 'A', criatura: 'A' }`.
- `scripts/_cenario/_f3-silhuetas-folha.mjs`: as 8 opções a 1× e a 6× sobre um recorte do céu da arena → `cru/r3-silhuetas.png`.
- Teste em `scripts/test-f3-batalha.mjs`: todo mapa retangular, 7–14 px de largura, ≥ 70% de pixels escuros.

### Task 2: A batalha (puro)
- `src/f3/batalhaFundo.ts`: `BatalhaFundo { regime(r, ms); passo(dt, calmo); desenhar(out) }` — os clarões (núcleo,
  bolsão pontilhado, brilho fraco em volta), as passagens (formação, seno leve, tiros de 3 px, a abatida: clarão, giro na
  inércia com rastro de fumaça, explosão), as regras de regime e de janela.
- Testes: no regime casco nenhuma passagem nasce; na arena só nasce com `calmo`; nunca duas em menos de 8 s; nenhuma
  silhueta acelera para baixo depois de abatida (só inércia); as cores fora do proibido.

### Task 3: A camada e a ligação
- `src/f3/camadaBatalha.ts` (a `CanvasTexture`, 30 Hz); `Parallax` cria junto com o céu do casco e repassa o regime;
  `BossSerpente.momentoCalmo` (getter); a `GameScene` passa `boss?.momentoCalmo` ao `Parallax` a cada quadro.
- `npx tsc --noEmit` e os testes.

### Task 4: A folha da rodada 3
- A folha `batalha.html`: os conceitos (ele escolhe depois) e os vídeos ANTES × DEPOIS: o Ato 2 (clarões), as 3 cabeças e
  a enguia (as passagens nas janelas calmas), `&batalha=0` para o ANTES.
