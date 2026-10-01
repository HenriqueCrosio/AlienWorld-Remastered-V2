# Spec — A arte nova da mesa compacta (30/09/2026)

> Estado: **desenho aprovado com o Henrique em 30/09** (a revisar no arquivo). É a **spec 2 de 2** da mesa: a spec 1
> (`2026-09-29-tres-vozes-camada-hd-design.md`) fez o código das vozes e da camada HD; esta faz a ARTE da carta e o
> TEXTO dentro dela. Branch `feat/cartas-preview`.
> Folhas da decisão: `docs/superpowers/folhas/2026-09-30/` — `icones-cor-opcoes`, `icones-cor-categoria`,
> `raridade-paletas`, `molduras-conceitos`, **`moldura-final`** (a aprovada) e `moldura-final-base.png` (a arte).

## 1. Por quê

A mesa compacta (fechada em 29/09) ficou com a arte provisória: um retângulo vetorial, faixas de cor chapada e os
colchetes de seleção em Graphics — *vetor lê como "gerado"*. E na primeira folha com moldura de verdade apareceu o
problema que esta spec existe para matar: **texto fora do quadro e fora do centro** (*"temos que fazer com que fique
profissional"* · *"algumas palavras não ficaram no meio do local onde estão — revise para não ter retrabalho"*). A
medida confirmou: com o tamanho de hoje, **11 dos 13 nomes e 9 dos 13 efeitos não cabem** nos encaixes da moldura
("CASCO REATIVO" mede 74px finos para um encaixe de 57).

## 2. As decisões (tomadas olhando folhas)

### 2.1 A raridade — a paleta P1, a convenção

| Raridade | Cor | |
|---|---|---|
| comum | cinza `0xa8b0bc` | |
| incomum | verde `0x4fc85a` | |
| rara | azul `0x3f7bff` | fundo de propósito: o ciano `0x3ee0f0` é da nave e da HUD |
| épica | roxo `0xa45cff` | |

A convenção de WoW/Borderlands/Destiny, a que o jogador já traz. O **laranja fica livre** para uma futura lendária.
Hoje era cinza/ciano/roxo/laranja (`COR_RARIDADE` em `src/cartas.ts` troca).

### 2.2 Os ícones — nas cores REAIS do objeto

O projétil é aço com ponta de bronze; o coração é vermelho; a chama é laranja. (Ele derrubou o "ícone de uma cor só"
depois de ver as folhas.) Paleta curta por ícone (3–4 materiais), contorno escuro, silhueta forte — lê num relance.
**A cor da raridade NÃO entra no ícone**: ela mora na moldura.

### 2.3 A moldura — M2 + o feixe do pé da M3

- A base é a **M2** (herdeira do cartucho: encaixe do nome no topo, visor contornado por um filete de energia,
  grelha, plaqueta embaixo, aba no pé). No vão da aba do pé entra o **feixe de energia da M3**, transplantado da
  própria M3 (pontas intactas, miolo encurtado) — nada redesenhado à mão.
- **A raridade mora na moldura, em três lugares:** o filete do visor, o feixe do pé e a palavra da raridade (na cor
  dela). As faixas de cor chapada saem.
- Arte: `folhas/2026-09-30/moldura-final-base.png` (105×141, o azul é a energia). As **4 variantes** saem dela por
  um script que troca só os pixels de energia (azul dominante) pela cor da raridade, mantendo o brilho de cada pixel —
  reprodutível, sem edição à mão por raridade.

### 2.4 A mesa no grid de PIXEL FINO (as 9 fatias saem)

- A carta tem o **tamanho nativo da moldura: 105×141 pixels finos**, e a mesa inteira (cartas, título, ajuda,
  realce) é desenhada nesse grid: a cena da mesa na camada HD usa câmera em **zoom = pixel fino**
  (`round(2s/3)`, spec 1 §2.1), e as coordenadas dela são em pixels finos.
- **Por que não as 9 fatias** (que a folha usou): esticar o miolo deforma o que ele tem de detalhe (a grelha, os
  encaixes) em pixels desiguais, e faz os encaixes mudarem de largura com a janela — o texto que cabe a 1152 pode
  não caber a 1920. No grid fino a carta é **idêntica em toda janela**: o que cabe numa cabe em todas.
- **Substitui** o "compacto 72×96" da spec 1 §2.3 (o tamanho em unidades do mundo): o compacto continua, agora
  medido em pixels finos.
- **O custo, aceito:** a carta muda um pouco de tamanho relativo entre janelas (≈10% menor em 1080p que em 1152),
  porque o pixel fino é inteiro.
- Sem a camada HD (fallback), a mesa roda no mundo com 1 pixel fino = 1 pixel do mundo — 3×105 e 141 cabem em
  384×216.

## 3. O TEXTO DENTRO DA CARTA — as regras (o coração desta spec)

### 3.1 Os encaixes são DADO, medidos da arte

Um módulo (`src/molduraCarta.ts`) guarda a geometria medida da `moldura-final-base.png`, em pixels da moldura
(origem no canto superior esquerdo, retângulos **internos**, sem a borda):

| Encaixe | x | y | l × a | O que mora nele |
|---|---|---|---|---|
| NOME | 24 | 4 | 57 × 11 | o nome, uma linha |
| VISOR | 13 | 20 | 78 × 67 | o "requer…" (topo), o ícone (meio), a raridade (pé) |
| PLAQUETA | 18 | 105 | 70 × 21 | o efeito, 1–2 linhas (medida corrigida em 01/10 pelo `test-molduras`: era 68) |

(Os números são os medidos em 30/09; o plano os confirma por código contra o PNG antes de usar — um teste lê a
arte e cobra que cada retângulo é miolo escuro cercado de borda.) **Nenhum texto tem coordenada digitada**: todo
texto se posiciona pelo centro do seu encaixe (ou da sua faixa dentro do visor).

### 3.2 As regras

1. **Centralização ÓTICA:** o texto se centra pela tinta das MAIÚSCULAS (altura de versal), não pela caixa da linha
   — a caixa inclui o espaço de acento e descendente e empurra a palavra para fora do meio. O deslocamento sai da
   métrica da fonte (medida uma vez), não de ajuste no olho.
2. **Folga mínima de 2px finos** entre a tinta e a borda interna do encaixe, nos quatro lados.
3. **Tudo em MAIÚSCULAS** dentro da carta (inclusive o "REQUER…", que hoje é minúsculo).
4. **NOME:** uma linha; **um tamanho só para as 13 cartas**, o maior em que o nome mais longo ("CASCO REATIVO") cabe
   com a folga (pela medida de 30/09, ≈7,5px finos). Nenhum nome é renomeado para caber.
5. **EFEITO:** uma ou duas linhas, quebradas em **palavra inteira** (nunca no meio), o bloco centrado vertical e
   horizontalmente na plaqueta; um tamanho só para as 13. Se um efeito não couber em duas linhas no tamanho
   escolhido, o texto `curto` dele é reescrito (e registrado aqui) — o tamanho não encolhe por carta.
6. **REQUER:** dentro do visor, no topo, em tom apagado (`metalMid`), tamanho menor que o nome. Sai de fora da
   carta.
7. **RARIDADE:** a palavra no pé do visor, na cor da raridade.
8. **ÍCONE:** centrado no espaço do visor que sobra entre o "requer" (ou o topo) e a raridade; a caixa do ícone
   nunca encosta em texto (folga de 2px finos).
9. O tamanho de cada voz é um número INTEIRO de pixels finos quando a fonte for pixel; a Chakra Petch (vetorial)
   pode ter tamanho fracionário, mas a POSIÇÃO de cada texto cai em pixel fino inteiro.

### 3.3 O critério de pronto (palavra dele)

> *"Só termine quando constatar e visualizar que não tem mais isso em todas."*

O trabalho só termina quando os DOIS forem verdade:

1. **A sonda `scripts/probe-mesa-texto.mjs` passa:** ela monta as **13 cartas** (com as variantes de "requer") nas
   janelas **1152×648, 1920×1080 e 2560×1440**, e para CADA texto de CADA carta mede a **tinta** (pixels acesos, não
   a caixa do objeto) e cobra:
   - a tinta inteira dentro do encaixe, com **≥2px finos** de folga nos quatro lados;
   - o centro da tinta a **≤1px fino** do centro do encaixe (ou da faixa), nos DOIS eixos;
   - nenhum texto sobre outro, nenhum texto sobre o ícone.
2. **A folha `folhas/<data>/mesa-13-cartas.png`** (as 13 cartas, em 1152 e 1920, ampliadas sem suavizar) foi
   **olhada por mim, carta por carta**, antes de dizer que acabou — e mandada para ele. A sonda sozinha não basta
   (lição de 29/09: *olhar a foto, não só o número da sonda*).

## 4. As peças e quem faz

| # | Peça | Tamanho | Quem faz | Estado |
|---|---|---|---|---|
| 1 | Moldura final, 4 raridades | 105×141 finos | máquina (transplante M2+M3, recolor por script) | ✅ conceito aprovado |
| 2 | **13 ícones** nas cores reais | ≈40×40 finos | PixelLab gera a base (os ícones atuais como referência de forma), eu limpo a silhueta e a paleta; **ele pega os que quiser fazer à mão** | ⬜ folha de candidatos ANTES de instalar |
| 3 | Realce da carta em foco (4 cantos) | cantos ≈8×8 finos | máquina (pixel, não Graphics) | ⬜ |
| 4 | `COR_RARIDADE` → P1 | — | código | ⬜ |

- O ícone do **CASCO** (hoje uma lua crescente fina) é refeito do zero — não lê como casco.
- Os ícones seguem a regra da casa: mostrar a folha (crua + na carta, na escala real) e ele aprovar antes de instalar.

## 5. Fora desta spec

- O painel de escolha de nave da Doca (outra tela); a arte da peça (o losango dourado); os ícones de botão do
  controle (etapa 1.6); a linha de ajuda do rodapé continua texto.
- A 2ª leva de cartas e a lendária (o laranja fica reservado).

## 6. Testes

- `probe-mesa-texto` (§3.3) — nova.
- `probe-vozes`, `probe-cartas`, `probe-pecas`, `probe-tiers`, `probe-stage4` continuam passando (a mesa é a mesma
  cena; o reset da alien encadeia mesas).
- A geometria dos encaixes é cobrada contra o PNG (§3.1).
