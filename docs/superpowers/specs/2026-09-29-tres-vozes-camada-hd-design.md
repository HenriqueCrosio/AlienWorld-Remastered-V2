# Spec — As três vozes e a camada HD (29/09/2026)

> Estado: **APROVADA** com o Henrique em 29/09. É a **spec 1 de 2**: o código. A spec 2 (a arte nova da mesa
> compacta — molduras, ícones, a divisão dele × PixelLab) vem depois, e o código NÃO espera por ela.
> Protótipo que provou a ideia: commit `c233028` na `feat/cartas-preview` (`?ui3x=vozes`).
> Folhas da decisão: `docs/superpowers/folhas/2026-09-29/` (`fontes-pixel`, `mista-*`, `vozes-*`).

## 1. Por quê

O texto do jogo era a monospace do sistema espremida em 7–8px no canvas de 384×216: letra borrada, **M** que vira
**H**, **e** igual a **c**, acento que vira mancha. Duas causas, as duas medidas:

- **Fonte vetorial em grade de pixel.** O canvas do navegador sempre suaviza a borda da letra; em 7px, a borda meio
  acesa é metade da letra. O `setResolution(3)` antigo não ajudava — o texto voltava para a grade de 384×216 antes
  de ser ampliado.
- **Pouco pixel.** Em 384×216 a letra tem no máximo 5px de altura; minúscula não cabe, e a moldura das cartas só
  ganhava detalhe ficando enorme (o cartucho *"muito grande e estourado"*).

## 2. As decisões

### 2.1 A camada HD (resolução mista)

O mundo continua em 384×216 — a arte aprovada e a Atmosfera **não mudam**. Todo **texto** (e a mesa de cartas
inteira) passa para uma **camada HD**: um 2º canvas transparente, por cima do mundo, na resolução da TELA:
**384·s × 216·s**, com `s` = a escala inteira em que o jogo aparece (3 numa janela de 1152, 5 em 1080p).

- A razão camada:tela **tem que ser inteira**, ou o pixel sai irregular — por isso `s` segue a tela.
- O **pixel fino** da interface = o inteiro de pixels de tela mais perto de ⅔ do pixel do mundo (`round(2s/3)`).

### 2.2 As três vozes (ideia dele)

Cada fonte é uma **voz**; uma tela fala com **uma voz só**, nunca duas no mesmo bloco.

| Voz | O que comunica | Onde | Fonte |
|---|---|---|---|
| **JOGO** | a marca | menu, fim de fase, nave perdida | **Silkscreen** (pixel, nativo 8px, assada) |
| **NAVE** | o computador de bordo | a fase (HUD, alertas, a letra do pickup), as 4 cutscenes, a cutscene final | **Chivo Mono** bold |
| **PILOTO** | parar, ler, decidir (jogo pausado) | a mesa de cartas; o painel de escolha da Doca | **Chakra Petch** 600 (lisa) |

- **Silkscreen:** o W do título *"parece uma nave ou uma carinha alien"* (ele). Só maiúscula — frase curta.
- **Chivo Mono:** a Consolas de hoje era a que ele gostava, mas é da Microsoft (não pode ser distribuída). A JetBrains
  Mono foi aprovada e caiu no mesmo dia: as monos de programação **marcam o zero** e o placar ficava *"estranho"*.
  Das 18 monos livres medidas, só Azeret, B612 e Chivo têm o zero limpo; a Chivo é a de proporção mais perto.
- **Chakra Petch:** a leitura confortável fica **só** em tela pausada de decisão; fora dela, vira "cara de app".
- As três são **OFL**; as licenças vão junto (`public/fonts/OFL-*.txt`).

### 2.3 A mesa

- **Fica só o COMPACTO** (72×96): *"traz mais foco no conteúdo, deixa mais o background do jogo à vista"* (ele).
  O cartucho e a lista saem do código, e o atalho `L` de dev também.
- Arte atual como **provisória** até a spec 2.

### 2.4 O resto

- **O rótulo da HUD** "0G LIVRE" → **"ZERO-G LIVRE"** (com o zero limpo, "0G" lia "OG"). O "1G" da atmosfera fica.
- **Tremor e flash** da câmera ficam **só no mundo**: a HUD e os alertas ficam firmes (o padrão dos shmups).
- **Os fades de troca de cena valem para o texto** — ele escurece junto com o mundo.
- **Mouse** continua na mesa (passar por cima destaca, clicar escolhe).
- **Janela:** redimensionar ou entrar em tela cheia refaz a camada na nova escala.

## 3. A arquitetura (abordagem A: o texto transparente)

A porta única de texto continua sendo o `pixelText` (`src/ui.ts`). Os ~20 pontos de texto fora da mesa **não mudam
uma linha**: o objeto que o `pixelText` devolve é o próprio texto da camada, e `setText`, `setAlpha`, `setColor`,
`setPosition`, `destroy` e os tweens da cena do mundo funcionam sobre ele (só escrevem propriedades).

| Unidade | Arquivo | O que faz |
|---|---|---|
| **A camada** | `src/uiHD.ts` | cria o 2º canvas; mede `s` e o refaz no redimensionar; alinha o canvas ao do mundo; liga o mouse só enquanto uma tela de decisão DA CAMADA (a mesa) está aberta; guarda o mapa cena → voz |
| **A porta** | `src/ui.ts` | `pixelText` decide a voz (a da cena, ou `voz:` explícito) e cria o texto na **cena irmã** da cena que pediu; traduz o tamanho do mundo em pixel de tela, por voz (§4) |
| **As fontes** | `src/fonte.ts` | assa a Silkscreen em BitmapFont binarizada (com e sem contorno de 1px); carrega Chivo e Chakra Petch; tudo ANTES do jogo abrir |
| **A cena irmã** | `src/scenes/IrmaHDScene.ts` (nova) | uma instância por cena do mundo, com câmera em zoom `s`; nasce com a 1ª chamada de `pixelText` da cena; pausa, retoma e fecha com ela (eventos `pause`/`resume`/`shutdown` da cena do mundo); a cada quadro copia o escurecimento da câmera do mundo (o fade), e ignora tremor e flash |
| **As telas de decisão** | `src/scenes/CartasScene.ts` | a mesa inteira mora na camada (a ponte do protótipo: a cena do mundo fica viva e vazia, a da camada desenha e responde) |

- **Coordenadas:** a câmera da fase nunca se desloca (conferido: nenhum `setScroll`/`startFollow` de câmera), então
  a posição do texto no mundo é a posição na tela. A câmera da irmã tem zoom `s` a partir do canto.
- **Ordem de desenho:** o texto fica sempre por cima do mundo. Nenhum texto hoje precisa ficar atrás de arte.
- **O que sai:** o espelho das folhas (`EspelhoHDScene`), o `?ui3x=` e o `?fonte=` (as vozes viram o padrão), os
  layouts cartucho e lista, a sonda dos 3 layouts. O texto via fonte do sistema (`textoSistema`) fica SÓ como o
  último recurso da §5.
- **O painel da Doca** (`ShipPanel`) continua no mundo — molduras, mouse e teclado como hoje; só o TEXTO dele vai
  para a camada, na voz do piloto (`voz: 'piloto'` explícito, porque ele vive dentro de uma cutscene).

## 4. Os tamanhos

O código continua pedindo o tamanho em **pixel do mundo**, como hoje. Cada voz traduz:

| Voz | Regra |
|---|---|
| **JOGO** | tamanho ≥ 13 → 2× o pixel do mundo (títulos) · 8–12 → 1× (corpo do menu) · ≤ 7 → pixel fino (atalhos de dev). O pixel da fonte é sempre um número INTEIRO de pixels de tela. |
| **NAVE** | o tamanho de hoje, com o contorno grosso e a sombra de hoje, desenhados na resolução da tela |
| **PILOTO** | o tamanho de hoje (corpo < 9 fica 10% menor), contorno fino |

Todo texto guarda os próprios parâmetros (valor, tamanho, cor, alinhamento, contorno, voz), para se redesenhar
quando `s` muda.

## 5. Quando algo falha

- **A camada não nasce** (o navegador recusa o 2º contexto WebGL): o jogo não quebra — o texto volta para o mundo,
  na Silkscreen assada em 384×216. Nítido, sem as três vozes.
- **Uma fonte não carrega:** a voz dela cai para a Silkscreen assada; se a própria Silkscreen falhar, para o texto
  do sistema (o de hoje). Nenhuma falha de fonte impede o jogo de abrir.

## 6. A verificação

- **A sonda das vozes** fotografa as telas **reais** (sem espelho): menu, fase (HUD + alerta), cutscene, fim de fase
  e mesa, em duas escalas de janela (3× e 5×). Confere: zero erro, o texto está na camada, o texto some no fade de
  saída, a mesa responde ao mouse. As folhas ficam em `docs/superpowers/folhas/`.
- **Continuam passando:** as sondas das cartas (`probe-cartas`), das peças (`probe-pecas`) e dos tiers
  (`probe-tiers`). A dos layouts (`probe-layout-cartas`) sai.
- **`npm run build`** sem erro.
- **O teste final é dele, jogando** — e só então o merge na `feat/cartas-preview`.

## 7. Fora desta spec

- **A arte nova da mesa compacta** (molduras por raridade no pixel fino, ícones de uma cor legíveis num relance) —
  **spec 2**, com a lista de peças e a divisão dele × PixelLab ANTES de gerar.
- A arte da peça, o tier nas cutscenes do meio, o que a F4 dá — continuam na lista da etapa 1.5 (START de 28/09).
- A Atmosfera no menu — calibragem.
