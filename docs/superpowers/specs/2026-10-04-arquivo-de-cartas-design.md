# O ARQUIVO DE CARTAS — a wiki das skills dentro do jogo (04/10/2026)

> Etapa 1.5 do 🧭 (cartas). Brainstorming com ele em 04/10. Pedido dele: *"montasse uma folha ou algumas, com a skills e
> o efeito, como fez no gif. Isso pode ser usado depois para o jogador conhecer e entender as skills, como o lol faz ao
> mostrar as skills dos heroes"* — *"como um wiki do jogo"*. Branch `feat/cartas-preview`.

## 1. O que é

Uma tela no jogo, aberta pelo MENU PRINCIPAL, com as 24 cartas do catálogo: o jogador escolhe uma e vê a ficha dela —
ícone, nome, raridade, categoria, quantas cópias, o texto para o jogador, os números, a tecla (nas ativas) e um
**clipe em loop** da carta em jogo. É o manual que ele estuda antes de jogar, para chegar na mesa sabendo o que
escolher.

As decisões dele (04/10):

| Pergunta | Escolha |
|---|---|
| Onde vive | **dentro do jogo** (não página web) |
| O efeito | **clipe gravado, em loop** (como o vídeo de skill do LoL) — não simulação ao vivo, não imagem parada |
| Quais cartas | **todas abertas desde o início** (sem descoberta, sem save) |
| A ficha leva | **os números**, **a tecla**, **cópias e categoria** — sem a parte de sinergias |
| De onde abre | **só do menu principal** (não da pausa, não da mesa) |
| Layout | **grade + ficha lado a lado** (uma tela só) |

## 2. A porta no menu

Hoje o menu é só `ENTER · COMEÇAR`. Ele vira uma LISTA curta:

```
▸ COMEÇAR
  ARQUIVO DE CARTAS
```

- ↑↓ ou W/S move o cursor; Enter ou Espaço confirma. O cursor começa em COMEÇAR — quem só aperta Enter joga como hoje.
- `1`–`3` e todos os atalhos de dev do menu continuam iguais.
- A lista é o lugar do futuro **OPÇÕES** (etapa 1.55, controles + áudio): ele entra como 3º item, sem refazer nada.

## 3. A tela

Uma cena nova (`ArquivoScene`) no mundo 384×216, com a irmã HD para o texto (a mesma arquitetura das outras cenas).

```
┌─ ARQUIVO DE CARTAS ─────────────────────────────┐
│ ARMAMENTO          │ ┌──────────────────────────┐ │
│ [■][■][■][■]        │ │   o clipe em loop        │ │
│ [■][■][▣]           │ │   (a carta em jogo)      │ │
│ EFEITO             │ └──────────────────────────┘ │
│ [■][■][■][■][■]     │ [ícone] MÍSSIL GUIADO        │
│ [■][■][■][■][■]     │ INCOMUM · ARMAMENTO · máx. 2 │
│ DEFESA             │ texto para o jogador,        │
│ [■][■][■][■][■]     │ duas ou três linhas          │
│ MOVIMENTO          │ recarga 8s · dano 2 · tecla Q│
│ [■][■]             │                              │
└── ←↑↓→ escolher · ESC voltar ───────────────────┘
```

- **Fundo:** a pintura do menu, escurecida, pela Atmosfera (pilar 5: nenhuma imagem crua).
- **A grade (esquerda):** os ícones por categoria, na ordem do catálogo, com o título do grupo. A selecionada ganha o
  realce da mesa (`realce-canto`) na cor da raridade. As setas (e WASD) andam pela grade como numa tabela: ←→ na
  linha, ↑↓ entre linhas (atravessando os grupos); nas bordas, para.
- **O clipe (direita, em cima):** em pixel nativo, sem esticar; troca na hora em que a seleção muda.
- **A ficha (direita, embaixo):** nas TRÊS VOZES — o título da tela na do JOGO (Silkscreen), nome e texto na do
  PILOTO (Chakra Petch, como a mesa), números e tecla na da NAVE (Chivo Mono).
  - `NOME` · `RARIDADE · CATEGORIA · máx. N`;
  - a **descrição** (§4.1), até 3 linhas;
  - a **linha de números** (§4.2);
  - a **tecla**, só nas cartas ATIVAS — Míssil, Flare, Dash — lida do perfil ativo (`Q`/`V`, `F`, `E`/`C`).
- **Rodapé:** `←↑↓→ escolher · ESC voltar`. ESC (ou Backspace) volta ao menu, com o cursor em ARQUIVO.
- **Sem movimento para mostrar** — Recarga (DEF_002), Vida Extra (DEF_003), Bomba Extra (DEF_005) e Propulsores
  (MOV_001): a caixa do clipe mostra o **ícone grande**, centrado.

## 4. Os dados

### 4.1 A descrição

`CartaDef` ganha `descricao: string` — o texto para o JOGADOR, 2–3 linhas, mais explicativo que o `curto` da mesa
("DANO x2"). Sem números (eles vêm da §4.2, que acompanha a calibragem). Eu escrevo as 24; **ele revisa numa folha
antes de entrar no jogo**.

### 4.2 Os números — um endereço só

Hoje os números provisórios moram espalhados em quem aplica a carta (`Eletrico`, `Lancadores`, `ExplosaoDoJogador`,
`CartasEmJogo`, `Dash`, `cartas.ts#montarArma`…). Eles passam para UM módulo puro, **`src/data/numerosCartas.ts`**
(sem Phaser): os sistemas importam de lá, e a ficha também. É troca de ENDEREÇO, não de valor — o jogo não muda.
Ganho junto: a calibragem (frente C) passa a mexer num lugar só.

Uma função `numerosDaCarta(id): string` monta a linha da ficha a partir do módulo — ex. Míssil `recarga 8s (×2: 5s) ·
dano 2`, Elétrico `20% por acerto · trava 0,4s`. Quem não tem número (o Perfurante) não tem linha.

### 4.3 Os clipes

Da mesma máquina dos GIFs (`scripts/_gif-cartas.mjs`: relógio à mão, sorte fixa, alvos postos), num modo novo
**`clipe`**: um cenário por carta, **2,5s a 20 qps em pixel nativo**, saindo como FOLHA DE QUADROS PNG
(`public/sprites/cartas/clipes/<ID>.png`, em grade, com a medida do quadro num `clipes.json`). Um comando regrava
todos (ou um) depois de mudar arte ou número.

- **Carrega sob demanda:** o clipe da carta só é carregado quando ela é selecionada (as 20 folhas somam alguns MB; o
  boot não paga por isso). Enquanto carrega, a caixa mostra o ícone grande.
- **A emenda do loop:** um escurecer rápido (~0,1s) entre o fim e o começo — sem o pulo seco.

## 5. Quando algo falta

- **Sem o clipe** (não gerado ou falhou): o ícone grande, como nas 4 sem movimento.
- **Sem o ícone:** a categoria em texto (como a mesa).
- **Carta nova** entra na grade sozinha (a grade lê o catálogo); sem `descricao`, o teste do catálogo acusa.

## 6. Testes

- **`test-catalogo-cartas`:** toda carta tem `descricao`, e ela cabe na ficha (até 3 linhas na largura da ficha).
- **`test-numeros-cartas`** (novo, node): a linha de cada carta sai dos valores do módulo (ex.: a recarga do míssil
  no módulo = a que a ficha diz).
- **Sonda `probe-arquivo`** (nova): o menu abre o arquivo pela lista; as setas percorrem as 24 e a ficha troca;
  nenhum texto vaza do encaixe (o método da `probe-mesa-texto`); o clipe carrega e toca; ESC volta ao menu; o
  COMEÇAR continua começando o jogo.
- **As sondas de hoje** (`probe-cartas-novas`, `probe-sandbox`, `probe-teclas`, `probe-cartas`, `probe-bomba-queda`) e
  os testes rodam depois da troca de endereço dos números — provam que o jogo não mudou.

## 7. A ordem

1. O módulo de números (troca de endereço) + `test-numeros-cartas`.
2. As 24 descrições → **folha para ele revisar** → instaladas no catálogo.
3. A lista do menu e a `ArquivoScene` (grade + ficha), ainda sem clipe.
4. Os clipes: o modo `clipe` e as 20 folhas de quadros; a ficha toca o clipe.
5. A folha final (prints da tela + GIF navegando) → ele aprova → commit.

## 8. Fora desta spec

Abrir pela pausa ou pela mesa; sinergias ("combina com"); descoberta/coleção; o menu de OPÇÕES (1.55, só ganha o
lugar na lista); página web.
