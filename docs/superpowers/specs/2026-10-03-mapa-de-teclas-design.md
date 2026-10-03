# O mapa de teclas — enxuto, por AÇÕES, pronto para o controle (03/10/2026)

> Etapa 1.5 do 🧭 (cartas) → base da 1.6 (controle de Xbox/PS) e do futuro menu de OPÇÕES (controles, áudio).
> Brainstorming com ele em 03/10. Substitui as teclas PROVISÓRIAS de 02/10 (memória `mapa-de-teclas-pendente`).

## 1. O problema

- O mesmo botão mudava de função por fase: o **Espaço** fazia o flap na F1 e atirava no ZERO-G.
- Entradas duplicadas: o tiro em J + Espaço + clique; o flap em Espaço + W + ↑ + clique.
- **J / K / L** para tiro, bomba e flare: *"muito contra intuitivo, não lembro de jogar um jogo que atire nessas
  teclas"*.
- O **Dash no duplo toque** dispara sem querer em quem corrige a posição rápido — e no analógico nem existe.
- Cada carta ativa lia o teclado por conta própria (`Dash.ts`, `Lancadores.ts`), por fora do `src/input.ts`.

## 2. As decisões (dele, 03/10)

1. **O tiro automático da F1 SAI.** O flap e o tiro passam a ser dois botões em todas as fases — cada tecla faz UMA
   coisa no jogo inteiro. ⚠️ Efeitos aceitos: a F1 fica mais exigente (a dificuldade "fechada" de 14/07 volta para a
   calibragem), e o modo LEGACY (flap sempre, score ×1,25) passa a ter tiro manual em todas as fases.
2. **As ações moram na MÃO ESQUERDA** e valem igual para os dois jeitos de mover: WASD (estilo FPS) **ou** setas
   (old school). Os dois layouts mudam só o movimento.
3. **Espaço = tiro**, em todas as fases (*"é melhor ficar no espaço"*).
4. **Shift = bomba** (os dois lados). O Ctrl foi descartado: **Ctrl+W fecha a aba e nenhuma página consegue
   bloquear** — no WASD, segurar W e apertar a bomba fechava o jogo.
5. **E = Dash** (o par E/F é o clássico de habilidade no PC). **F = Flare** (*"em jogos de naves o flare é F"*).
6. **O perfil CLÁSSICO (Z/X)** existe como escolha: *"deixar uma escolha para quem quer ter o prazer de jogar x/z"*.
   O jogo FORNECE os dois perfis; o jogador escolhe (e depois remapeia) no **menu de controles**, que vem numa spec
   própria junto com o áudio.
7. **O clique do mouse sai do jogo** (fica nos menus e na mesa).
8. **As teclas de dev vão para os números 1–6** — o X e o C do sandbox colidiam com o perfil clássico.

## 3. O mapa

### 3.1 Perfil PADRÃO

| Ação | Teclado | Controle (Xbox / PS) — etapa 1.6 |
|---|---|---|
| Mover | WASD **ou** setas | analógico esq. / D-pad |
| **Flap** (só nas fases de flap) | W **ou** ↑ | A / ✕ |
| **Tiro** (segurar) | **Espaço** | RT / R2 · X / □ |
| **Bomba** | **Shift** (esq. ou dir.) | B / ○ |
| **Dash** | **E** | RB / R1 |
| **Flare** | **F** | LB / L1 |
| Pausa / voltar | ESC | Start / Options |

### 3.2 Perfil CLÁSSICO

O movimento e o flap são os mesmos (WASD ou setas; W / ↑). Mudam as ações:

| Ação | Teclado |
|---|---|
| Tiro | **Z** |
| Bomba | **X** |
| Dash | **C** |
| Flare | **F** |

### 3.3 Fora do jogo

- **Mesa de cartas:** ← → / A D escolhem · **Enter**, **1–3** e a tecla de TIRO do perfil confirmam · ESC sai (só
  onde já saía) · o mouse continua. O J sai.
- **Game over:** a tecla de TIRO do perfil repete (era "ESPAÇO repete") · ESC menu.
- **Menu:** sem mudança (Enter/Espaço/1–3; os atalhos de dev do menu continuam onde estão — moram em outra cena).

### 3.4 Dev (só `npm run dev`, dentro do jogo)

| Tecla | Hoje | O quê |
|---|---|---|
| **1** | N | onda agora (sandbox) |
| **2** | X | limpar a tela (sandbox) |
| **3** | I | invulnerável (sandbox) |
| **4** | M | painel de medidas (sandbox) |
| **5** | G | pular para o chefão |
| **6** | C | abrir uma mesa |

O antigo 1–4 do jogo (equipar PULSE/HMG/SHOTGUN/ENXAME) **sai**: as naves não dão mais arma desde a etapa 1.5.

## 4. A arquitetura — uma camada de AÇÕES

O jogo nunca pergunta "o J desceu?"; pergunta "o jogador pediu TIRO?". É o desenho das engines (Input Mapping
Contexts no Unreal, Action Maps no Unity, Action Sets no Steam Input) — e o `src/input.ts` já nasceu para isso
(*"as conduções recebem intenção, nunca teclas"*).

### 4.1 `src/controles.ts` (novo, SEM Phaser — testável em node)

- `type Acao = 'cima' | 'baixo' | 'esquerda' | 'direita' | 'flap' | 'tiro' | 'bomba' | 'dash' | 'flare'`.
- `PERFIS: Record<'padrao' | 'classico', Record<Acao, string[]>>` — cada ação aponta para **nomes de tecla do
  Phaser** (`'W'`, `'UP'`, `'SPACE'`, `'SHIFT'`, `'E'`, `'F'`, `'Z'`, `'X'`, `'C'`). O Phaser não separa Shift
  esquerdo do direito, e isso é o que queremos.
- `perfilAtivo(): 'padrao' | 'classico'` — lê `localStorage['aw.teclas']`; o parâmetro `?teclas=classico` (ou
  `padrao`) na URL GRAVA a escolha. Leitura e escrita em `try/catch` (sem storage = padrão). **É o gancho do menu
  de controles:** o menu só vai escrever aqui.
- `mapaAtivo(): Record<Acao, string[]>` — o perfil escolhido.

### 4.2 `InputReader` (`src/input.ts`) passa a ler o MAPA

- Cria um `Key` do Phaser para cada tecla que aparece no mapa ativo.
- **Lê o `JustDown` de cada tecla UMA VEZ por quadro** e deriva as bordas das ações a partir disso. Hoje o `JustDown`
  é consumido por quem chega primeiro — foi por isso que o Dash teve de escutar o evento por fora. Com um leitor só,
  um toque que desce e sobe dentro do mesmo quadro continua contando (o `_justDown` do Phaser nasce no evento).
- `InputState` ganha `dashPressed` e `flarePressed` (bordas). `flapPressed` = borda de `flap` (W / ↑), **sem Espaço e
  sem ponteiro**. `firing` = `tiro` segurado, **sem ponteiro**. `bombPressed` = borda de `bomba`.

### 4.3 Quem consome

- **`FlightController`:** o campo `autoFire` SAI (as duas conduções têm gatilho manual); a `GameScene` passa só
  `input.firing` para a arma.
- **`CartasEmJogo.tick`** recebe o `InputState` e o repassa: o **Dash** lê `dashPressed`, o **Flare** lê
  `flarePressed`. Os dois deixam de escutar o teclado.
- **O Dash** avança na direção do movimento SEGURADO (as 8 direções, normalizadas); sem direção, **para a frente**
  (direita). A espera de 8s, a distância, a invulnerabilidade e os fantasmas não mudam. O `DuploToque` sai do
  `cartasRegras.ts` (e o teste dele).
- **A mesa (`CartasScene`)** e o **game over** confirmam pela tecla de tiro do perfil — e **ignoram a repetição
  automática** (`event.repeat`). ⚠️ Sem isso, quem segura o Espaço atirando quando a mesa abre ESCOLHE a carta do
  cursor sem ver (a repetição do sistema chega como `keydown`); o mesmo vale para morrer segurando o tiro e o game
  over reiniciar sozinho.

### 4.4 O controle (etapa 1.6) — o que esta spec PREPARA, e não faz

A coluna "Controle" da §3.1 é o alvo. Na 1.6, o `InputReader` soma o `scene.input.gamepad` no MESMO `InputState`
(OU lógico com o teclado) — nenhum consumidor muda. Os botões na tela (Ⓐ/✕) e a vibração ficam na spec da 1.6.

## 5. Textos que mudam

- A linha de ajuda do sandbox (`src/sandbox/montagem.ts`): as teclas novas do jogo e as de dev.
- O game over: "ESPAÇO repete…" passa a nomear a tecla de tiro do perfil (ESPAÇO no padrão, Z no clássico).
- O texto das cartas continua SEM tecla (o Flare diz "SOLTA ARMADILHA").

## 6. Fora do escopo

- O **menu de OPÇÕES** (controles com remapeamento, áudio) — spec própria. Esta deixa o gancho (`aw.teclas`).
- O **gamepad** de verdade — etapa 1.6.
- Recalibrar a F1 com o tiro manual — vai para a calibragem (frente C), medida no sandbox.

## 7. Como verificar

- **Node:** `scripts/test-controles.mjs` (novo) — os dois perfis cobrem as 9 ações; nenhuma tecla repetida entre
  ações de um perfil (fora `cima`/`flap`, que dividem W/↑ de propósito); o storage inválido cai no padrão; o
  `?teclas=` grava.
- **Sondas:** as que apertavam J / K / L / G / C dentro do jogo passam a apertar Espaço / Shift / F / 5 / 6
  (`probe-cartas-novas`, `probe-sandbox`, `probe-cartas`, `probe-bomba`, `probe-stage4`, `probe-f4-atalho-g` e as
  demais que a varredura do plano achar). Todas passando.
- **Sonda nova `probe-teclas`:** na F1 o Espaço atira e NÃO faz flap; W faz flap; Shift solta bomba; E faz o dash
  (com a carta, fora da F1); F solta o flare; segurar Espaço com a mesa abrindo NÃO escolhe carta; `?teclas=classico`
  troca para Z/X/C.
- **Ele joga** a F1 (o tiro manual) e o sandbox (Dash no E, Flare no F) — é o teste que fecha.
