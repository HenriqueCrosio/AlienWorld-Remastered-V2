# Bloco M1 — a pausa e as CONFIGURAÇÕES (design)

> 14/11. Aprovado em conversa, uma pergunta por vez. O bloco M é a MOLDURA do jogo, o que dá *"cara de jogo lançado"*
> (ele). Ordem fechada: **M1** a pausa e as CONFIGURAÇÕES → **M2** os controles (o suporte a Xbox/PS, o reconhecimento
> do aparelho ativo com o aviso, o remapear de teclado e de controle) → **M3** a tela de fim de fase e de morte no
> padrão da tela final → **M4** o carregamento e o favicon. O M absorve as etapas 1.55 e 1.6 do roadmap. Esta spec é só
> o M1.

## 1. O problema

Não existe pausa: o `ESC` no meio da fase chama `scene.start('Menu')` (`GameScene.ts`) e a partida se perde. Não existe
tela de configurações: o volume é um número fixo (`Music.VOLUME` 0,45), o perfil de teclas só troca por `?teclas=`, o
"reduzir clarões" e a escolha do menu (noite ou amanhecer) têm o gancho pronto e nenhuma tela.

## 2. As decisões dele

1. A pausa tem **só o essencial**, mais CONFIGURAÇÕES: CONTINUAR · REINICIAR A FASE · CONFIGURAÇÕES · SAIR PARA O MENU.
2. As CONFIGURAÇÕES entram **completas no que já funciona**: master, música e efeitos; os dois perfis de teclas; tela
   cheia; reduzir clarões; o menu da noite ou do amanhecer. O remapear e o controle são o M2.
3. **Uma janela sobre o jogo parado**, no desenho da janela do placar da tela final. São dois tamanhos: a PEQUENA da
   pausa e a GRANDE das CONFIGURAÇÕES (*"ao abrir configurações, talvez ela tenha que ser maior"*).
4. As CONFIGURAÇÕES em **abas**: ÁUDIO · CONTROLES · VÍDEO · JOGO.
5. A pausa funciona **nas fases e nas cutscenes**; na mesa de cartas e no hangar também, sem REINICIAR.
6. As preferências são gravadas no navegador, com **a ponta pronta para o perfil do usuário**: *"ele poderá entrar em
   qualquer navegador ou mobiles (futuramente) e jogar com suas preferências"*.

## 3. O que o jogador vê

### 3.1 A pausa

O `ESC` congela a cena, escurece o que está atrás, baixa a música e abre a janela pequena no centro.

| Onde | As linhas |
|---|---|
| Fase (inclui as lutas de chefão) | CONTINUAR · REINICIAR A FASE · CONFIGURAÇÕES · SAIR PARA O MENU |
| Cutscene (as 4) | CONTINUAR · PULAR A CENA · CONFIGURAÇÕES · SAIR PARA O MENU |
| Mesa de cartas, hangar da escolha | CONTINUAR · CONFIGURAÇÕES · SAIR PARA O MENU |

- `ESC` de novo, ou CONTINUAR, fecha: a cena segue do mesmo quadro.
- ↑↓ movem o cursor; a tecla de confirmar é a do menu (Enter e a tecla de tiro do perfil).
- **A pausa automática:** a janela perder o foco ou a aba ser trocada (`blur`, `visibilitychange`) abre a pausa, nas
  mesmas cenas. Voltar o foco NÃO fecha sozinho: o jogador fecha.
- **As confirmações:** REINICIAR A FASE e SAIR PARA O MENU trocam o conteúdo da janela por "TEM CERTEZA?" com NÃO e
  SIM, o cursor no NÃO. PULAR A CENA não pede confirmação.
- **REINICIAR A FASE** = recomeçar depois de perder a nave: a mesma fase do começo, com as cartas do `cartasCheckpoint`
  dela, as vidas e os pontos como numa nova tentativa.
- **PULAR A CENA** nunca custa uma carta: nas cutscenes 1–3, antes da escolha ele leva direto à MESA de cartas da
  cena; depois da escolha, à fase seguinte. Na cutscene final, ao resultado. (As cutscenes não têm TECLA de pular, de
  propósito — o Espaço comia a cena; pular pela janela da pausa é um gesto deliberado e não tem esse defeito.)
- No **sandbox** o `ESC` segue voltando à montagem (não há pausa lá). No **Arquivo de Cartas**, no menu e nas telas de
  resultado o `ESC` segue como hoje.

### 3.2 As CONFIGURAÇÕES

A janela cresce para a grande (quase a tela), com as abas no topo. ←→ com o cursor na faixa das abas, ou Q/E de
qualquer lugar, trocam de aba; ↑↓ andam nas linhas; ←→ numa linha mudam o valor; `ESC` volta (à pausa pequena, ou ao
menu principal).

| Aba | Linha | Valores | Padrão |
|---|---|---|---|
| ÁUDIO | VOLUME GERAL | 0–10 | 10 |
| ÁUDIO | MÚSICA | 0–10 | 10 (= os 0,45 de hoje) |
| ÁUDIO | EFEITOS | 0–10 | 10 (gravado; vale quando o som entrar) |
| CONTROLES | TECLAS | PADRÃO · CLÁSSICO, com o mapa do perfil à vista (ação → tecla) | o de `perfilAtivo()` |
| VÍDEO | TELA CHEIA | LIGADA · DESLIGADA | desligada |
| VÍDEO | REDUZIR CLARÕES | LIGADO · DESLIGADO (ligado = `CLARAO.forca` 0,5) | desligado |
| JOGO | MENU | NOITE · AMANHECER — a aba só existe para quem zerou (`zerou()`) | amanhecer |

- Toda mudança vale e é gravada NA HORA; não há botão de salvar nem de cancelar.
- A música responde ao volume enquanto o cursor anda (a faixa segue tocando baixa atrás da pausa).
- A troca do perfil de teclas vale ao fechar a pausa (o `InputReader` relê o mapa).
- A TELA CHEIA não é uma preferência gravada (o navegador só a concede por gesto): a linha mostra e muda o estado atual.

### 3.3 O menu principal

A lista ganha CONFIGURAÇÕES (COMEÇAR · CONDUÇÃO · ARQUIVO DE CARTAS · CONFIGURAÇÕES). Ela abre a mesma janela grande
sobre a pintura viva (noite ou amanhecer), que segue animada atrás (a cena do menu NÃO é pausada; só o teclado dela
é desligado enquanto a janela está aberta). Sem a camada HD o Arquivo some da lista, como hoje, e CONFIGURAÇÕES fica.

## 4. Como é feito

### 4.1 As preferências (`src/preferencias.ts`, puro)

Um módulo sem Phaser: o tipo `Preferencias`, os padrões, os limites, `ler(guarda)`, `gravar(guarda, p)` e
`mudar(guarda, campo, valor)`. A guarda é a interface `Guarda` que o jogo já usa (`placar.ts`, `qualMenu.ts`:
`getItem`/`setItem`), com `guardaDoNavegador()`.

- **A ponta para o perfil do usuário:** as preferências vivem num OBJETO SÓ, versionado
  (`{ v: 1, volume: { geral, musica, efeitos }, teclas, reduzirClaroes, menu }`), serializado numa chave
  (`alienworld:preferencias`). Sincronizar com uma conta depois = trocar a guarda por uma que também manda esse objeto
  ao servidor; nenhuma tela muda. Fica FORA do M1: o login, o servidor e a fusão entre aparelhos.
- **As chaves que já existem** (`aw.teclas`, `alienworld:menu`) são lidas uma vez como valor inicial quando o objeto
  ainda não existe, e seguem sendo gravadas junto, para o código de hoje (`perfilAtivo`, `menuAtivo`) não mudar de
  comportamento. `alienworld:zerou`, a condução e o recorde NÃO são preferências: ficam onde estão.
- Um valor inválido ou um JSON quebrado caem no padrão do campo, sem erro.

### 4.2 Aplicar as preferências (`src/aplicarPreferencias.ts`)

A ponte entre o objeto e o jogo, chamada no boot e a cada mudança:

- **Volume:** `Music` deixa de usar o número fixo: o alvo de toda faixa é `0,45 × geral × música` (0–1 cada). Uma
  mudança ajusta a faixa que está tocando sem reiniciá-la. O de efeitos fica exposto (`volumeEfeitos()`) para o som.
- **Clarões:** `CLARAO` é `as const`; a força passa a ser lida por uma função (`forcaDosClaroes()`) no ponto onde o
  `claraoDe` multiplica o pico, em vez de escrever na constante.
- **Teclas e menu:** pelas funções que já existem (`CHAVE_STORAGE`, `escolherMenu`).

### 4.3 A cena da pausa (`src/scenes/PausaScene.ts` + `src/pausa/`)

Uma cena do Phaser que roda POR CIMA da cena pausada (`scene.pause(alvo)` + `scene.launch('Pausa', { alvo, linhas })`).

- `src/pausa/numerosPausa.ts` (puro): as linhas por tipo de cena, o tamanho das duas janelas, as abas e as linhas de
  cada uma, e a máquina de estados (pequena → confirmação → grande/aba) como funções puras de (estado, tecla) → estado.
- `src/pausa/abrirPausa.ts`: `ligarPausa(scene, tipo)` — o que cada cena chama no `create`. Registra o `ESC` e a pausa
  automática, e dá à cena o que fazer em cada linha (reiniciar, pular, sair).
- **O que para:** a cena alvo inteira (`scene.pause`: o relógio, a física, os tweens, as animações) e a irmã HD dela.
  A Atmosfera fica no último quadro. Na mesa de cartas, a `Game` já está pausada por baixo; pausa-se a `Cartas`.
- **O escurecimento:** um véu preto a ~55% sobre o mundo, na cena da pausa (não mexe no perfil da Atmosfera).
- **A música:** desce para ~40% do alvo enquanto a pausa está aberta e volta ao fechar.
- **O texto:** na camada HD (`uiHD`), na voz `piloto` (Chakra Petch — *"o piloto decidindo, jogo pausado"*), com a
  reserva sem a camada HD (`?semhd`) legível, como no resto do jogo.
- **Movimento reduzido:** o crescer e o encolher da janela viram troca seca.
- **O cuidado com o hitstop:** a `GameScene` já pausa física, tweens e anims por conta própria nos hitstops. A pausa
  usa `scene.pause`, que é outra camada; ao fechar, o hitstop em curso segue de onde estava.

### 4.4 A janela (`src/ui/janela.ts`)

O desenho da janela do placar (`src/menu/painelResultado.ts`) é extraído para uma função que serve aos dois: a moldura
num tamanho qualquer. O `painelResultado` passa a chamá-la, e a tela final aprovada tem de sair IDÊNTICA (prova por
foto, pixel a pixel, antes e depois).

### 4.5 O que muda nas cenas

- `GameScene`: o `keydown-ESC` deixa de ir ao menu (fora do sandbox) e chama a pausa; ganha `reiniciarFase()`.
- `InterludeScene`, `Interlude2/3/4Scene`, `CartasScene`, `HangarScene`: `ligarPausa` no `create`. Onde o `ESC` já
  faz outra coisa (`CartasScene`, `HangarScene`), a pausa só abre quando esse uso não está ativo; o plano lista cada caso.
- `MenuScene` + `numerosMenu.ts`: a linha CONFIGURAÇÕES.
- `main.ts`: a `PausaScene` na lista de cenas (e a irmã HD dela).

## 5. Como se confere

- `scripts/test-preferencias.mjs`: padrões, limites, JSON quebrado, a leitura inicial das chaves antigas, a guarda de
  memória.
- `scripts/test-pausa.mjs`: a máquina de estados (cada tecla em cada estado), as linhas por tipo de cena, a aba JOGO só
  para quem zerou.
- `scripts/test-pausa-jogo.mjs` (no navegador): em cada tipo de cena, o `ESC` abre e fecha; REINICIAR, PULAR e SAIR
  levam aonde devem; a pausa automática abre com `blur`.
- **A pausa não muda a partida:** a mesma fase, no relógio em passos e com a sorte fixa, com e sem uma pausa de 5 s no
  meio, chega ao mesmo estado (relógio, inimigos, posição dos tiros).
- **A tela final idêntica** depois da extração da janela.
- **A folha** (`folhas/2026-11-14/pausa/`): a janela pequena e cada aba, sobre uma fase clara (F4 B), uma escura (F1),
  uma cutscene e o menu; e a reserva sem a camada HD. Ele aprova o visual na folha antes de jogar.
- Build e todos os testes de hoje seguem passando.

## 6. Fora do M1

O remapear tecla por tecla, o controle de Xbox/PS e o aviso do aparelho ativo (M2); a tela de fim de fase e de morte
(M3); o carregamento e o favicon (M4); os efeitos sonoros (depois do balanceamento); a conta do usuário e a
sincronização das preferências (junto do placar online, etapa 5); CRT/scanlines.
