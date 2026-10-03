# START — retomada depois do catálogo de 24 e do sandbox (depois de 02/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `plans/2026-10-02-cartas-sandbox-retomada-START.md`. As
> 24 cartas estão jogáveis e o sandbox de dev existe na `feat/cartas-preview`; vamos mapear as teclas e depois
> seguir para a arte aprovada das peças (plano novo)."*

## 1. Onde está

- **Branch `feat/cartas-preview`**, empurrada para o `origin` (V2). **Não mergeada** — o fluxo dele é jogar antes.
- **Etapa 1.5 do 🧭** (cartas, linhagens, peças) — a **frente A** (o catálogo) está JOGÁVEL. Em 01–02/10:
  - **o catálogo de 24** (`src/data/catalogoCartas.ts`) e os **24 ícones aprovados** na mesa;
  - **a explosão única** (`ExplosaoDoJogador`) com a **arte aprovada** (A + B: a arte de cada carta, variando);
  - **Míssil** (mira travada, um alvo por míssil, inércia de interceptador), **Flare** (do JOGADOR, tecla L
    provisória, 8s), **Drone** (tiro próprio, desvia de LADO), a **build elétrica**, a **aura do Casco** (contorno da
    silhueta), **Bomba Extra**, **Dash** (duplo toque, 8s), a HUD contando as recargas ("DASH 5s");
  - **o SANDBOX DE DEV** (`?sandbox` ou X no menu): árvore WoW (7 pontos humana / 8 alien, LIVRE), ondas, fundo,
    teclas de dev e o painel de medidas (dano por fonte).
- Specs: `specs/2026-10-01-catalogo-cartas-design.md` · `specs/2026-10-02-sandbox-dev-design.md`.
  Plano executado: `plans/2026-10-02-catalogo-cartas.md` (os desvios dele estão no topo do plano).

## 2. Como testar

- `npm run dev` → **http://localhost:5173/?sandbox** — a montagem (clique +1, botão direito −1; atalhos FOGO,
  ELÉTRICA, EXPLOSÕES, CASCO). No jogo (⚠️ o MAPA DE TECLAS de 03/10): **Espaço** tiro · **Shift** bomba · **E** dash
  · **F** flare · **ESC** montagem — dev: **1** onda · **2** limpar · **3** invulnerável · **4** medidas · **5**
  chefão · **6** abre uma mesa. Perfil clássico: `?teclas=classico` (Z/X/C/F; `?teclas=padrao` volta).
- **A bomba (03/10)** é a DE QUEDA: cai na atmosfera, é arremessada no vácuo. A de pânico volta com
  `__game.scene.getScene('Game').bombaModo = 'panico'` (ou `BOMBA.modo` em `src/bombaRegras.ts`).
- Sem o sandbox: `6` abre uma mesa na fase; no console, `__game.scene.getScene('Game').cartas.aplicar('EFF_002')`.
- **Testes em node:** `test-catalogo-cartas` · `test-cartas-regras` · `test-sandbox-arvore` · `test-texto-encaixe` ·
  `test-molduras`.
- **Sondas:** `probe-cartas-novas` (26 casos, uma por mecânica) · `probe-sandbox` (13) · `probe-cartas` ·
  `probe-mesa-texto` (24 cartas, 3 janelas). Todas passaram em 02/10.
- **GIFs:** `node scripts/_gif-cartas.mjs <out.gif> <cenários> [s] [modos] [nave]` grava na velocidade REAL (o
  relógio do Phaser congelado e avançado à mão); `bash scripts/_gifs-das-cartas.sh` regrava os 20 da folha.
- **Folha de tudo:** `folhas/2026-10-02/skills/index.html` — as 24 cartas, um GIF por skill.

## 3. Decisões dele nesta rodada (02/10)

- Ícones: os 24 fechados (spec do catálogo §5.1d); EFF_003 = **FRAGMENTADO** (o Ç e o Ã encolhiam a mesa inteira).
- Explosões: **A + B** — a arte aprovada de cada carta + variação (espelho/giro 90°, ritmo ±15%, as grandes em 3
  estouros).
- Míssil ×2: um alvo para cada, o 2º sai 140ms depois; persegue com inércia e volta (amortecedor de lado — sem ele,
  ORBITAVA); explode no ar em 2,5s.
- Flare: **solto pelo jogador**, espera 8s — *"para não ficar muito roubado"*. O texto da carta não cita tecla.
- Drone: desvia **de lado** de quem vem em linha reta (para trás ele se afastava demais).
- Dash: **espera de 8s** (com 2,5s era invulnerabilidade de graça); 3 fantasmas.
- Teclas: *"ainda vamos mapear todas"* — L e o duplo toque são PROVISÓRIOS (memória `mapa-de-teclas-pendente`).
- Sandbox: 4 árvores por categoria (WoW clássico), pontos reais com chave LIVRE, ondas que repetem, linhagem + tier,
  as 4 ferramentas de dev — *"facilita o balanceamento futuro"*.

## 4. Próximos passos

1. **O mapa de teclas** (com ele): flare, dash, bomba, as de dev — e o controle (etapa 1.6).
2. **A arte aprovada das peças** (plano novo, a partir da §5 da spec do catálogo): drones (#26 e #60 animados),
   mísseis 16×5, tiros 6×1, estilhaço D, faísca #17 / eletrificado #29 / pulso #4, o flare animado, o estouro do
   casco. Mesmas chaves de textura das provisórias (`texturasProvisorias.ts`) — troca sem mexer em lógica.
3. **Frente B:** inimigos que atiram + ondas maiores (o sandbox já mede a pressão).
4. **Frente C:** calibragem — no sandbox, com o "copiar medidas" para comparar builds.

## 5. Lições desta rodada

- **GIF na velocidade real:** congelar o laço (`game.loop.sleep()`) e avançar à mão (`game.step`), foto a cada 3
  passos, 50ms por quadro (o atraso do GIF é em centésimos — 33ms vira 30 e acelera).
- **A instância da cena é REAPROVEITADA:** a sonda que espera `scene.getScene('Game').cartas` passa antes da cena nova
  montar — apague o campo antes de reabrir, e espere a velha sair (`!isActive`) antes do `start`.
- **Perseguição com aceleração e teto de velocidade ORBITA o alvo** (raio v²/a): amorteça a componente de lado.
- **HTML por cima do Phaser:** o foco num botão escondido engole as teclas do jogo (o Phaser escuta a janela) —
  `blur()` ao fechar, e só segurar teclas com a montagem visível.
- **Shell:** crase e `${}` dentro de `node -e "…"` viram comando do bash (memória `edicao-por-script-falha-crlf`);
  `\\d` dentro de string vira `d`. Arquivo aberto no visualizador do Windows não pode ser sobrescrito.
- **Medir antes de culpar:** "a nave alien some" era uma rocha do primeiro plano; "o raio não aparece" era
  amostragem de quadro — o diagnóstico com números resolveu os dois.
