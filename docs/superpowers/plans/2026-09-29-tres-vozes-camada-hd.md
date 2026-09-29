# As três vozes e a camada HD — plano de implementação

> Spec: `docs/superpowers/specs/2026-09-29-tres-vozes-camada-hd-design.md` (spec 1 de 2, aprovada em 29/09).
> Executado inline na mesma sessão, a pedido dele (*"implemente agora e executa já"*). Branch `feat/cartas-preview`.

**Objetivo:** todo texto do jogo nítido, numa camada HD por cima do mundo, falando com três vozes; a mesa só no compacto.

**Arquitetura:** o `pixelText` continua a porta única. Numa cena do mundo, o texto nasce numa CENA IRMÃ da camada HD
(um 2º jogo Phaser, transparente, 384·s × 216·s) e o objeto devolvido é o próprio texto de lá — o código das cenas não
muda. A irmã copia o fade da câmera do mundo e ignora tremor/flash. A mesa inteira mora na camada.

**Stack:** Phaser 3.90, TypeScript, Vite; sondas Playwright (`scripts/probe-*.mjs`).

## Restrições globais

- Mundo em 384×216 e Atmosfera INTOCADOS. `s` inteiro = `round(largura exibida × dpr / 384)`, mínimo 1.
- Pixel fino = `max(1, round(2s/3))`. Pixel de fonte pixel SEMPRE um inteiro de pixels de tela.
- NUNCA usar `setScale` para dar tamanho ao texto: o código do jogo anima a escala (o baque do título 1,14→1, o
  `setScale(1)` do aviso). O tamanho vai no tamanho da FONTE; a escala do objeto fica 1.
- Vozes: `Menu`/`GameOver` = jogo · `Game`/`Interlude*` = nave · `Cartas` = piloto · `ShipPanel` = piloto explícito.
- Silkscreen (nativo 8) · Chivo Mono 700 · Chakra Petch 600 — `public/fonts/` com as OFL.
- Commits com autoria SÓ do Henrique, sem `Co-Authored-By`.

---

### Task 1: as fontes carregam antes do jogo, sem parâmetro de URL

**Arquivos:** modificar `src/fonte.ts`, `src/main.ts`.

**Produz:** `carregarFontes(): Promise<void>` · `fontesOk(): { jogo: boolean; nave: boolean; piloto: boolean }` ·
`FAMILIA = { nave: 'fonte-nave', piloto: 'fonte-piloto' }` · `NATIVO_PIXEL = 8` · `BMF` · `registrarFonte(scene)`.

- Silkscreen: `FontFace` + assar (código do protótipo); falha → `jogo: false`.
- Chivo e Chakra: `FontFace` cada; falha de uma não derruba as outras (`Promise.allSettled`).
- `main.ts`: `await carregarFontes()` antes do `new Phaser.Game`.

**Verificação:** `npx tsc --noEmit` limpo.

### Task 2: a camada HD sempre ligada, com cena irmã, fade, janela e mouse

**Arquivos:** reescrever `src/uiHD.ts`; criar `src/scenes/IrmaHDScene.ts`; `src/main.ts` chama
`criarCamadaHD(game, [CartasScene])` sempre.

**Produz:**
- `jogoHD(): Phaser.Game | null` (null = a camada falhou → fallback) · `ehHD(scene)` · `escalaHD()` · `pixelFino()`
- `type Voz = 'jogo' | 'nave' | 'piloto'` · `vozDaCena(scene): Voz`
- `irmaDe(scene): Phaser.Scene | null` — a irmã da cena do mundo (cria na 1ª chamada; remove no `shutdown` da cena)
- `registrarTextoHD(obj, restyle: (s) => void)` — o texto se redesenha quando `s` muda; sai do registro no `destroy`
- `mouseHD(ligado: boolean)` — `pointer-events` do canvas da camada
- `prepararCameraHD(scene)` — zoom `s` a partir do canto

- **Irmã:** `hd.scene.add('irma:<key>:<n>', IrmaHDScene, true, { mundo })`; `update()` →
  `camera.setAlpha(1 − escuro)`, `escuro = fade.isRunning || fade.isComplete ? fade.alpha : 0` da câmera PRINCIPAL do
  mundo. Tremor e flash não são copiados.
- **Janela:** no `resize` do mundo e da janela (via `requestAnimationFrame`), recalcula `s`; se mudou:
  `hd.scale.resize(384·s, 216·s)`, zoom de todas as câmeras da camada, `restyle(s)` de todos os textos registrados,
  realinha o CSS e chama `hd.scale.refresh()` (o mouse depende dos limites certos).
- **Falha:** `new Phaser.Game` num `try`; se lançar ou o renderer não for WebGL → `jogoHD() === null`.

**Verificação:** `npx tsc --noEmit` limpo.

### Task 3: o `pixelText` fala pelas vozes

**Arquivos:** modificar `src/ui.ts`.

**Consome:** tudo das Tasks 1 e 2. **Produz:** `TextOpts.voz?: Voz` (a assinatura do `pixelText` não muda).

- Destino: cena da camada → nela · cena do mundo com camada → na irmã · sem camada → no mundo (Silkscreen assada,
  1× ou 2× para ≥13) · sem Silkscreen → texto do sistema (o de hoje).
- Voz efetiva: pedida → se a fonte dela falhou, `jogo` → se a Silkscreen falhou, sistema.
- **JOGO:** `bitmapText` com tamanho de fonte `8·k/s` (unidades do mundo), `k = 2s` (≥13), `s` (8–12), pixel fino (≤7).
- **NAVE:** `text` família `fonte-nave`, `fontSize: size`, contorno `stroke` + sombra `(0,1,2)` como hoje, `setResolution(s)`.
- **PILOTO:** `text` família `fonte-piloto`, `fontSize: size ≥ 9 ? size : 0.9·size`, contorno 1.4, `setResolution(s)`.
- Ponte da BitmapText: `setColor` (guarda a cor), `setAlign`, `setResolution`/`setStroke`/`setShadow` inertes.
- Cada texto HD chama `registrarTextoHD` com o seu `restyle`.
- Sai o espelho (`__px`, `EspelhoHDScene`).

**Verificação:** `npx tsc --noEmit`; abrir o jogo — menu, fase, cutscene com texto nítido.

### Task 4: a mesa só no compacto; os ajustes de conteúdo

**Arquivos:** `src/scenes/CartasScene.ts`, `src/scenes/GameScene.ts`, `src/ui/ShipPanel.ts`.

- `CartasScene`: saem `montarCartucho`, `montarLista`, `preencherPainel`, o `layout`, o `f`, `CART`/`LISTA`; fica o
  compacto. Com camada: a ponte (cena do mundo viva e vazia); na camada: `prepararCameraHD` + `mouseHD(true)`, e
  `mouseHD(false)` no `shutdown`.
- `GameScene`: sai o atalho `L` de layout; `'0G'` → `'ZERO-G'` (o `'1G'` fica).
- `ShipPanel`: os 5 `pixelText` ganham `voz: 'piloto'`.

**Verificação:** `npx tsc --noEmit`; `node scripts/probe-cartas.mjs`.

### Task 5: as sondas

**Arquivos:** reescrever `scripts/probe-vozes.mjs`; ajustar `scripts/probe-pecas.mjs` (a HUD pelo campo `hud`);
apagar `scripts/probe-layout-cartas.mjs`, `scripts/probe-mista.mjs`, `scripts/folha-mista.mjs`,
`src/scenes/EspelhoHDScene.ts`.

- `probe-vozes`: janelas 1152×648 (s=3) e 1920×1080 (s=5). Menu, fase (HUD + alerta), cutscene (letreiro), fim de
  fase, mesa. Cobra: zero erro; `s` certo; texto nas cenas da camada (irmãs com filhos); nenhum texto no mundo;
  fade de saída → alpha da câmera da irmã cai para ~0; mouse sobre a 3ª carta → cursor 2; redimensionar 1152→1920 →
  `s` 3→5 sem erro. Fotos → folha `folhas/2026-09-29/vozes-final.png`.

**Verificação:** `probe-vozes`, `probe-cartas`, `probe-pecas`, `probe-tiers`, `probe-atmosfera-fases` passam;
`npm run build` limpo.

### Task 6: registro

- 🧭 do `docs/HANDOFF.md` e o START de 28/09: o item da fonte pixel e o do layout ✅; a spec 2 (arte do compacto) é
  o próximo.
- Commit por tarefa (autoria dele).
