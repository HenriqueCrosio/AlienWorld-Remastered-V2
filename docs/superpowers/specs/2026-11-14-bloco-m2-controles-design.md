# Bloco M2 — os controles (design)

> 14/11. Aprovado em conversa, uma pergunta por vez. A 2ª peça do bloco M (a moldura do jogo): o M1 (a pausa e as
> CONFIGURAÇÕES) fechou no mesmo dia. O M2 absorve as etapas 1.55 (o remapear) e 1.6 (o controle) do roadmap.

## 1. O problema

O jogo não lê controle nenhum. O teclado tem dois perfis fixos (`src/controles.ts`), sem tecla por tecla. Cada tela
escuta as suas próprias teclas (`kb.on('keydown-…')` em sete cenas), e as dicas na tela são sempre de teclado.

## 2. As decisões dele

1. **Dois perfis de fábrica no controle** (MODERNO e ARCADE), como o teclado já tem (PADRÃO e CLÁSSICO), mais o
   remapear livre.
2. **As dicas da tela acompanham o último aparelho usado**; teclado e controle valem juntos, sem escolher nada; um
   aviso curto quando o controle conecta ou desconecta.
3. **O remapear é por AÇÃO** (tiro, bomba, dash, flare, míssil), em duas colunas (teclado, controle); a tecla que já
   era de outra ação TROCA de lugar com ela.
4. **O movimento é FIXO** (*"quero que seja fixo o movimento"*): WASD e setas; analógico esquerdo e direcional.
5. **As teclas de menu são fixas:** *"sempre serão ESC para teclado e controles usam os padrões da fábrica"*.
6. **A vibração entra** (*"se não for [complexo] pode entrar agora"*). A zona morta ajustável e o 2º controle ficam
   para depois.

## 3. O que o jogador vê

### 3.1 O controle

Xbox e PlayStation pela API do navegador (o mapeamento "standard"), sem instalar nada. Um controle só: o primeiro
conectado que tiver o mapeamento standard.

| | Xbox | PlayStation | índice |
|---|---|---|---|
| face de baixo | A | ✕ | 0 |
| face da direita | B | ○ | 1 |
| face da esquerda | X | ▢ | 2 |
| face de cima | Y | △ | 3 |
| ombros | LB · RB | L1 · R1 | 4 · 5 |
| gatilhos | LT · RT | L2 · R2 | 6 · 7 |
| início | START (☰) | OPTIONS | 9 |
| direcional | ↑ ↓ ← → | idem | 12–15 |

**Na nave:** analógico esquerdo (zona morta fixa de 0,3) ou direcional = mover. Na Fase 1 (o flap) o impulso sai no
botão de face de baixo, além da borda de "para cima" do direcional e do analógico.

| Ação | MODERNO | ARCADE |
|---|---|---|
| Tiro | RT | A |
| Míssil | LT | RB |
| Dash | A | B |
| Bomba | X | X |
| Flare | B | Y |

No perfil ARCADE o flap da Fase 1 divide o botão A com o tiro (na F1 o tiro é manual, e os dois juntos são o gesto
do arcade); no MODERNO, com o dash (que não existe na F1 sem a carta).

**Nos menus (fixo):** direcional ou analógico andam (com repetição ao segurar), A confirma, B volta, LB/RB trocam de
aba, START pausa. No teclado: setas/WASD, Enter e a tecla de tiro confirmam, `ESC` volta e pausa, Q/E trocam de aba.

### 3.2 O aparelho ativo

- O jogo guarda o **último aparelho usado** (uma tecla, um botão, ou o analógico passando da zona morta). Começa em
  teclado.
- **Toda dica de tecla na tela segue esse aparelho**: o placar ("ESPAÇO continua" ↔ "A continua"), o hangar, a mesa, a
  pausa, as configurações, a tela de fim de fase, o menu.
- **Os símbolos seguem a família do controle**, reconhecida pelo nome que o navegador dá ao aparelho (`id` com
  "playstation", "dualshock", "dualsense", "054c" → PlayStation; o resto → Xbox). Escritos em texto: `A B X Y LB RB LT
  RT START` e `✕ ○ ▢ △ L1 R1 L2 R2 OPTIONS` — onde a fonte não tiver o símbolo, `X O [] /\`.
- **O aviso:** "CONTROLE CONECTADO" / "CONTROLE DESCONECTADO" no canto de cima à direita, 2 s, na camada do texto.
- **O controle cai no meio de uma fase ou cutscene:** a pausa abre sozinha (como quando a janela perde o foco).

### 3.3 A aba CONTROLES

```
 TECLADO     < PADRÃO >            CONTROLE    < MODERNO >
 ─────────────────────────────────────────────────────────
              TECLADO                CONTROLE
 TIRO         ESPAÇO                 RT
 BOMBA        SHIFT                  X
 DASH         E                      A
 FLARE        F                      B
 MÍSSIL       Q                      LT
 VIBRAÇÃO                            < LIGADA >
 RESTAURAR O PADRÃO
 mover: W A S D ou setas · analógico ou direcional (fixo)
```

- As linhas de perfil trocam entre os de fábrica; com um mapa mexido aparece **PERSONALIZADO** (e ←→ sai dele para um
  de fábrica, perdendo o mapa mexido só daquele aparelho).
- Nas cinco ações, ←→ escolhem a coluna e **confirmar** abre "APERTE A NOVA TECLA" (ou "O NOVO BOTÃO"); `ESC` ou START
  cancelam. A captura aceita UMA tecla por ação.
- **A troca:** se a tecla escolhida já é de outra ação do mesmo aparelho, as duas trocam.
- **Proibidas** (a captura as ignora e avisa "essa tecla é do jogo"): no teclado, W A S D, as setas, `ESC` e Enter; no
  controle, START, o direcional e os cliques dos analógicos. Q e E ficam permitidas: são teclas de ação no perfil
  padrão e só trocam de aba dentro da janela das configurações.
- A coluna CONTROLE sem controle conectado mostra o mapa em cinza e a nota "nenhum controle conectado"; confirmar
  nela não abre a captura.
- **VIBRAÇÃO:** ligada/desligada (padrão ligada).
- **RESTAURAR O PADRÃO:** confirma antes ("TEM CERTEZA?"); volta os dois aparelhos a PADRÃO e MODERNO.

### 3.4 A vibração

Só onde o navegador a oferece (`vibrationActuator.playEffect('dual-rumble')`: Chrome, Edge, Opera); nos outros o
controle joga sem vibrar. Três momentos, só quando o último aparelho usado é o controle:

| Momento | Duração | Fraca / forte |
|---|---|---|
| A nave atingida | 180 ms | 0,6 / 0,8 |
| A bomba | 260 ms | 0,5 / 1,0 |
| A morte de um chefão | 600 ms | 0,8 / 1,0 |

Em pausa nada vibra, e abrir a pausa corta a vibração em curso.

## 4. Como é feito

### 4.1 As regras (`src/entrada/mapas.ts`, puro)

- `ACOES_REMAPEAVEIS = ['tiro', 'bomba', 'dash', 'flare', 'missil']`.
- Teclado: `PERFIS_TECLADO` (os de `controles.ts`, que passa a reexportar daqui), `PROIBIDAS_TECLADO`.
- Controle: os índices standard, `PERFIS_CONTROLE` (moderno, arcade), `PROIBIDOS_CONTROLE`, `familiaDe(id)`,
  `rotuloDoBotao(indice, familia)`.
- `trocar(mapa, acao, nova)` → o mapa novo com a troca; `perfilDe(mapa)` → o nome do perfil de fábrica igual, ou
  `'personalizado'`.

### 4.2 As preferências (v2)

`Preferencias` ganha `mapaTeclado`, `mapaControle` (os personalizados, `null` quando o perfil é de fábrica),
`controle: 'moderno' | 'arcade' | 'personalizado'`, `teclas` passa a aceitar `'personalizado'`, e `vibracao: boolean`.
`v: 2`; um objeto `v: 1` é lido e completado com os padrões. A chave antiga `aw.teclas` segue espelhada só com os
perfis de fábrica (o personalizado a deixa como estava).

### 4.3 O leitor (`src/entrada/controle.ts`)

Um leitor único por página: a cada quadro do jogo do mundo lê `navigator.getGamepads()`, escolhe o controle, e guarda
os botões apertados, as bordas (desceu neste quadro) e o analógico. Emite em `game.events`: `aparelho` (o último
aparelho usado mudou), `controle-conectado`, `controle-desconectado`. Expõe `aparelhoAtivo()`, `familia()`,
`segura(indice)`, `desceu(indice)`, `eixo()`.

### 4.4 A nave (`src/input.ts`)

O `InputReader` soma o controle no MESMO `InputState`: as direções pelo analógico/direcional, as ações pelo mapa do
controle, as bordas pelas bordas do leitor. As conduções e as cartas não mudam.

### 4.5 Os menus (`src/entrada/menu.ts`)

`ligarMenu(scene, { cima, baixo, esquerda, direita, ok, voltar, abaAnt, abaProx })`: registra as teclas fixas do
teclado e consulta o leitor do controle no `update` da cena, com repetição ao segurar uma direção (400 ms, depois a
cada 110 ms) e "só toque novo" no confirmar e no voltar. As sete telas (Menu, Hangar, Cartas, Pausa, GameOver, Arquivo,
ShipPanel) passam a usá-lo no lugar dos seus `kb.on` de navegação; os atalhos de dev de cada uma ficam como estão.
START abre a pausa pelo `ligarPausa` (que passa a ouvir o controle).

### 4.6 As dicas (`src/entrada/dicas.ts`)

`dica(acao)` → o rótulo no aparelho ativo (`'ESPAÇO'` ou `'RT'`), e `dicaMenu('ok' | 'voltar' | 'aba' | 'pausa')`.
Cada tela que escreve uma dica a reescreve no evento `aparelho`.

### 4.7 A vibração (`src/entrada/vibrar.ts`)

`vibrar('golpe' | 'bomba' | 'chefao')`: confere a preferência, o aparelho ativo e o suporte; chamado de `damageShip`,
da bomba e do `killBoss`.

## 5. Como se confere

- `scripts/test-mapas.mjs`: os perfis, a troca (com e sem conflito), as proibidas, a família, os rótulos, `perfilDe`.
- `scripts/test-preferencias.mjs`: a leitura de um objeto v1; os campos novos; o espelho de `aw.teclas`.
- `scripts/test-controle-jogo.mjs` (no navegador, com um controle SIMULADO — `navigator.getGamepads` trocado na
  página): a nave anda e atira pelo controle; START pausa; a pausa e as configurações navegam; o remapear de teclado e
  de controle (com troca); a dica muda com o aparelho; conectar e desconectar (o aviso, a pausa sozinha).
- Os testes do M1 e os de hoje seguem passando (as telas mudaram de mãos).
- A folha (`folhas/2026-11-14/controles/`): a aba CONTROLES (teclado, Xbox, PlayStation, a captura), as dicas nos dois
  aparelhos, o aviso.
- **Com um controle de verdade só ele confere** (Xbox e PlayStation): os botões no lugar certo, a vibração, os
  símbolos.

## 6. Fora do M2

A zona morta ajustável; mais de um controle; remapear o movimento e as teclas de menu; ícones desenhados dos botões
(as dicas são texto); toque/mobile.
