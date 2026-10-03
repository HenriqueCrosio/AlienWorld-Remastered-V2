# START — retomada depois do mapa de teclas, da bomba de queda e do 1º lote das peças (depois de 03/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `plans/2026-10-03-pecas-retomada-START.md`. Parei para
> avaliar a folha `folhas/2026-10-03/pecas/pecas-animadas-tamanhos.gif` (flare, faísca, eletrificado e queimando a
> 100/75/50%); vou dizer o tamanho de cada uma e seguimos instalando o 2º lote das peças."*

## 1. 📍 O PONTO MARCADO — ele avalia a folha

**Antes de qualquer código**, ele olha e escolhe o tamanho de cada peça animada:

- **Folha:** `docs/superpowers/folhas/2026-10-03/pecas/pecas-animadas-tamanhos.gif` (e o `.png` parado) — cada peça a
  100%, 75% e 50%, animada, sobre a F2 real (o inimigo drone; a nave para o flare).
- **A recomendação que ficou na mesa** (ele ainda não respondeu):

| Peça | Recomendado | Por quê |
|---|---|---|
| Flare aceso (loop PixMiniMax c95f2927) | **75%** (~12×14) | a 100% tem quase a altura da nave |
| Faísca do acerto #17 (6e0532c8) | **50%** (16×16) | a 100% engole o inimigo, e ela sai a cada acerto elétrico |
| Eletrificado #29 (ea51cd0a) | **75%** | o anel do tamanho do corpo do inimigo |
| Queimando #12 (6a04f01c) | **100%** (8×11) | já é pequeno; a 50% vira ponto |

- Os GIFs EM JOGO do 1º lote (já instalado) estão ao lado: `drones.gif`, `missil-humano.gif`, `missil-alien.gif`,
  `estilhaco.gif` — ele pode comentar também.

## 2. O 2º lote (depois da escolha dele)

1. **Reduzir** cada peça ao tamanho escolhido com `scripts/_folha-pecas-animadas.mjs` como molde (vizinho + alfa
   binário, recorte pela UNIÃO dos quadros) e montar as tiras em `public/sprites/cartas/pecas/` (molde:
   `scripts/_montar-pecas.mjs`).
2. **Flare:** a textura `carta-flare` vira a tira animada (hoje é a provisória 3×3) — `Lancadores.soltarFlare`.
3. **Faísca, eletrificado e queimando** hoje são TINT no inimigo (`Eletrico.ts`, `CartasEmJogo` `COR_QUEIMANDO`).
   Viram efeitos POR CIMA do inimigo, que o acompanham (a faísca no acerto, uma vez; o eletrificado e o queimando
   enquanto durar o estado). A spec §5.1b pede comparar o eletrificado do PixelLab **contra a versão em código** — GIF
   lado a lado.
4. **A explosão do míssil ALIEN** ainda é a laranja humana — §5.1c: *"a mesma, repintada na manta"*.
5. GIFs em jogo (`node scripts/_gif-cartas.mjs …`: cenários `eletrico`, `eletricotrava`, `flare`, `combustao`,
   `missil2` com nave `alienigena`) → ele aprova → commit.

Depois do 2º lote, o 🧭 segue: **frente B** (inimigos que atiram + ondas maiores) → **frente C** (calibragem no sandbox) →
o **menu de OPÇÕES** (controles + áudio, etapa 1.55) → o controle (1.6).

## 3. O que a sessão de 03/10 fez

- **O MAPA DE TECLAS** (spec/plano `2026-10-03-mapa-de-teclas`): as ações na mão esquerda, iguais para WASD ou setas —
  **Espaço** tiro · **Shift** bomba · **E** dash · **F** flare · **W/↑** flap. Perfil **clássico** `?teclas=classico`
  (Z/X/C/F), gravado em `localStorage['aw.teclas']` — o gancho do menu de controles. **Tiro da F1 manual** (*"se
  cravar o dedo no espaço tem o mesmo efeito do automático… caso fique impraticável a gente muda"*). Dev em **1–6**.
- **Três defeitos antigos do teclado**, achados pela `probe-teclas`: a mesa nunca via ← → / A D (o canvas do mundo
  bloqueava as teclas para o da camada HD); um toque rápido se perdia; o Phaser lia um evento duas vezes.
- **A BOMBA DE QUEDA** (spec/plano `2026-10-03-bomba-de-queda`): na atmosfera cai em parábola da barriga (sai um pouco
  para a frente) e explode no SOLO; no vácuo é arremessada RODANDO e explode no PAVIO (1,5s); nas duas, explode no
  CONTATO e fere no raio (36px, 12) — inclusive as construções da F1. **Nenhuma bomba dá invulnerável** (*"deixe isso
  para as cartas"*). A de pânico ficou guardada (`BOMBA.modo = 'panico'`). Arte: a **desenhada** pixel a pixel,
  **18×7** (`public/sprites/bomba.png`) — a gerada no PixelLab (`e0ca3929`) perdeu no aspecto.
- **O 1º LOTE DAS PEÇAS** (a §5 da spec do catálogo): mísseis 16×5 e tiros de drone 6×1 POR LINHAGEM
  (`texturaDaLinhagem` — a chave `-alien`), o estilhaço D e os drones animados (esfera #26 / água-viva #60, em
  vaivém). Mesmas chaves das provisórias: sem o PNG, a provisória volta.

## 4. Como testar

- `npm run dev` → **http://localhost:5173/** (`1` no menu = F1) e **http://localhost:5173/?sandbox**.
- No jogo: **Espaço** tiro · **Shift** bomba · **E** dash · **F** flare · **ESC** — dev: **1** onda · **2** limpar ·
  **3** invulnerável · **4** medidas · **5** chefão · **6** mesa. A bomba de pânico: `__game.scene.getScene('Game').bombaModo = 'panico'`.
- **Testes em node:** `test-controles` · `test-bomba-regras` · `test-cartas-regras` · `test-catalogo-cartas` ·
  `test-sandbox-arvore` · `test-texto-encaixe` · `test-molduras`.
- **Sondas:** `probe-teclas` · `probe-bomba-queda` · `probe-bomba` (a de pânico) · `probe-cartas-novas` ·
  `probe-sandbox` · `probe-cartas` · `probe-mesa-texto`. Todas passaram em 03/10.
- **GIFs:** `_gif-cartas.mjs` (as cartas) · `_gif-bomba.mjs` (a bomba nos dois mundos) · `_folha-pecas-animadas.mjs`
  (a folha de tamanhos).

## 5. Lições desta rodada

- **Dois jogos Phaser na mesma janela:** o que captura uma tecla dá `preventDefault`, e o outro IGNORA evento já
  bloqueado (`KeyboardManager`). Quem abre tela no canvas HD solta a captura do mundo (`disableGlobalCapture`).
- **O `JustDown` some no `keyup`** (o `onUp` apaga o `_justDown`): toque dentro de um quadro só se lê pelo evento
  `down` da tecla. E o Phaser **reprocessa a fila inteira** a cada evento novo (o filtro de duplicata olha só o
  anterior) — handler de tecla trata cada `KeyboardEvent` uma vez (`WeakSet`).
- **Ctrl+W fecha a aba e nenhuma página bloqueia** — nunca CTRL num mapa com WASD.
- **Sonda que mede uma ação mede-a NO MESMO quadro** (ex.: os i-frames da bomba): entre duas leituras o chefão atira.
- **A mesa do meio da fase abre ao pular para o chefão** (o 5 / o treino) e pausa o jogo — sonda que pula confirma
  a mesa (`probe-bomba`, `probe-chain`).
- **PixelLab Pro Flash:** a imagem de estilo tem de CABER na tela pedida (a nave 52×26 não cabe em 32×16).
- **Peça de ~20px: desenhar ganha de gerar** (a memória `pecas-minusculas-em-pixel` foi reforçada) — e mostrar 2–3
  TAMANHOS em cena: ele tende a querer menor que o primeiro chute.
- **No GIF a nave PISCA** (intocável): fundo para folha se escolhe num quadro em que ela aparece.
