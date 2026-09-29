# START — retomada depois das três vozes (depois de 29/09/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `plans/2026-09-29-vozes-retomada-START.md`. As três
> vozes e a mesa compacta estão na `feat/cartas-preview`; vou jogar para aprovar o texto, e depois seguimos para a
> spec 2 (a arte nova do compacto)."*

## 1. Onde está

- **Branch `feat/cartas-preview`**, empurrada para o `origin` (V2), último commit `be12b48`. **Não mergeada** — o
  fluxo dele é jogar antes.
- **Etapa 1.5 do 🧭** (cartas, linhagens, peças). Fechados em 29/09: o **layout da mesa = COMPACTO** e o **texto nas
  TRÊS VOZES** numa camada HD. Implementados e verificados por sonda; **falta ele jogar para aprovar**.
- Spec `specs/2026-09-29-tres-vozes-camada-hd-design.md` (spec 1 de 2) · plano `plans/2026-09-29-tres-vozes-camada-hd.md`.

## 2. Como testar

- `npm run dev` → http://localhost:5173/ (sem parâmetro — as vozes são o padrão; Ctrl+F5 se a aba já estava aberta).
- **Atalhos de dev (no jogo):** `C` abre uma mesa; `G` pula para o chefão. **No menu:** `V` F2 · `M` F3 · `L` F4 ·
  `O` Doca · `P` Hangar · `F` cutscene final. (O `L` de layout da mesa SAIU — só existe o compacto.)
- **Sondas:** `node scripts/probe-vozes.mjs <dir>` (as telas reais em 1152×648 e 1920×1080: texto na camada, mouse na
  mesa, fade, janela, a mesa por cima da fase) · `probe-cartas` · `probe-pecas` · `probe-tiers` ·
  `probe-atmosfera-fases` · `probe-stage4` (a campanha de ponta a ponta). Todas passaram em 29/09.
- **Folhas da decisão:** `docs/superpowers/folhas/2026-09-29/` — `vozes-final.png` (as telas reais), `vozes-telas`,
  `vozes-mesa`, `vozes-nave-zero-limpo*`, `mista-*`, `fontes-pixel`.

## 3. O que olhar jogando (a aprovação dele)

1. **As três vozes em cada tela:** JOGO = Silkscreen (menu, fim de fase) · NAVE = Chivo Mono (HUD, alertas,
   cutscenes) · PILOTO = Chakra Petch (a mesa, o painel da Doca).
2. **Os números:** o zero limpo da Chivo na HUD; o **4 da Silkscreen** no placar do fim de fase tem desenho peculiar
   ("48210") — ver se incomoda como o zero marcado da JetBrains incomodou.
3. **"ZERO-G LIVRE"** na HUD (era "0G").
4. **A mesa compacta** por cima da fase, com mouse e teclado; o **reset da alien na Doca** (4 mesas seguidas).
5. **Tela cheia / redimensionar:** o texto continua nítido.

## 4. Próximos passos (na ordem combinada)

1. **Ele joga e aprova o texto.** Ajustes, se vierem, na spec 1.
2. **Spec 2 — a arte nova do compacto:** molduras por raridade no pixel fino da camada HD + ícones de uma cor,
   legíveis num relance. **ANTES de gerar:** a lista de peças com tamanho e função, e a divisão dele × PixelLab
   (memória `divisao-de-arte-mao-vs-maquina`). As molduras do cartucho ficaram no disco (`sprites/cartas/carta-*.png`)
   como material — o compacto pode herdar o metal, os rebites e o visor.
3. **Etapa 1.6 — controle de Xbox e PS** (spec própria; ver o 🧭).
4. O resto da 1.5: arte da peça, tier certo nas cutscenes do meio, o que a F4 dá (EM ABERTO com ele).
5. Depois: calibragem e balanceamento.

## 5. Lições desta rodada

- **Fonte pixel se ASSA e se usa em múltiplo INTEIRO do nativo.** O canvas do navegador sempre suaviza a borda; a
  grade da fonte se lê do arquivo (unitsPerEm ÷ passo — `opentype.js`), não a olho: a Tiny5 foi testada em 12px
  achando que era o nativo, e o nativo era 8.
- **Medir antes de afirmar.** O zero "limpo" a olho estava errado em 3 de 6 fontes; a medida (tinta no miolo do
  glifo) acertou.
- **Olhar a foto, não só o número da sonda.** A HUD saindo por cima da mesa passou em todas as cobranças e só
  apareceu na imagem — a sonda agora cobra a ordem das cenas.
- **Dois jogos Phaser = dois laços.** `this.scene.stop()` enfileira; `game.scene.start()` roda na hora. Abrir cena
  na camada logo depois de fechar outra pede `queueOp('start', …)`.
- **Tamanho de texto nunca por `setScale`:** o menu anima a escala do título.
