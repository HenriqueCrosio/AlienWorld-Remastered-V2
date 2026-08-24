# Fatia 4 — Cutscene 2 (Interlude2Scene): passe visual — Design

**Data:** 2026-08-24 · **Fatia:** 4 de 8 (mapa em `2026-07-21-menu-visual-design.md`)
**Escopo fechado com o Henrique:** passe da APRESENTAÇÃO — fundo pintado, doca nova, luzes em
código e o Arauto visível. A coreografia da destruição **fica como está**.

---

## Contexto

A cutscene 2 (`src/scenes/Interlude2Scene.ts`, 741 linhas) roda entre a Fase 2 e a Fase 3:
placar → aproximação → pouso na doca Kepler-9 → escolha de nave (róster de 7) → decolagem →
a doca morre → Fase 3. Atalho de dev `[O]` no menu; sonda `scripts/probe-doca.mjs`.

**O roteiro, os tempos e os textos funcionam e NÃO mudam.** A sonda está verde de ponta a ponta
(pousa na pista, o Arauto está no róster, entrega a Fase 3). Esta fatia é apresentação.

### O que a sonda e a medição encontraram (2026-08-24)

1. **A pintura do Henrique já existia e nunca foi instalada.**
   `assets/raw/paint-bg-cut2-original.png` (1254×1254, salva em 18/08). A cena ainda roda no
   parallax pixel `espaco` — a estética que a Fatia 2 aposentou na Cutscene 1. Não há chave
   `paintBgCut2` no `BootScene`.
2. **A doca é a coisa mais CLARA da tela.** `doca.png` (160×160, exibida ×1.5) é uma massa
   cinza-bege iluminada por inteiro num céu azul-profundo — o contrário da direção fechada
   (casco escuro, luz só onde há energia).
3. **A nave alienígena encalhada NÃO EXISTE na tela.** Ela está no comentário do arquivo e no
   róster do painel, e em lugar nenhum do desenho. A premissa que separa esta cutscene da Aurora
   — *é aqui que o jogador põe a mão na tecnologia do inimigo* — nunca foi desenhada.
4. **A doca nunca quebra.** No beat da morte ela fica intacta em `x=150` enquanto 12 explosões
   passam por cima dela.
5. **O painel de escolha tapa a cena inteira** durante a escolha.

---

## As cinco decisões do Henrique

| | Decisão |
|---|---|
| **Escopo** | Passe completo da APRESENTAÇÃO (não o mínimo da Fatia 2), com a destruição preservada |
| **Camadas** | A pintura é o CÉU; a arte nova do PixelLab é a DOCA |
| **O achado** | O Arauto que já existe, pousado na pista — custo de arte zero |
| **Âncora** | A doca é **plataforma SUSPENSA**, não chão |
| **Destruição** | **Mantém a coreografia de hoje** |

---

## Design

### 1. Arquitetura de camadas

| Camada | O quê | Por que ela existe |
|---|---|---|
| **Céu** | A pintura, 480×270, deriva lentíssima | Lugar, profundidade e escala |
| **Doca** | O convés recortado da arte nova, sprite SEPARADO | Precisa **deslizar** e **morrer** |
| **Luz** | As janelas âmbar, animadas em CÓDIGO | Nada escorrega; o ritmo é controlável |

⚠️ **A doca NÃO PODE ser assada no fundo**, e é isso que decide a arquitetura inteira. Duas razões
no código: ela **desliza** na aproximação (a sonda mede `x = 300 → 175 → 150`), e o beat da morte
é coreografado contra a geometria dela. Fundir as duas imagens numa só mata os dois beats.

### 2. O céu — `public/sprites/paint-bg-cut2.png`

- Original: `assets/raw/paint-bg-cut2-original.png` (1254×1254, quadrada).
- Tratamento **idêntico** ao `paint-bg-cut1`/`paint-bg-f2`: recorte 16:9 central + downscale para
  **480×270**. 1px de arte = 1px de jogo; o upscale nearest da engine dá o acabamento pixel.
  Sem quantização manual.
- Chave nova `paintBgCut2` no `BootScene`. Substitui o `new Parallax(this, 'espaco')`, entrando
  como camada mais distante, com o **starfield MANTIDO por cima** — são as estrelas em movimento
  que carregam a deriva. Deriva da pintura lentíssima (fator ~0.04, como nas outras).
- **Guarda:** sem o PNG, a cena mantém o parallax `espaco` de hoje (fallback = comportamento atual).

### 3. A doca — recortada da arte nova

Fonte: PixelLab object **`906bb897-cc25-47cb-b852-d7f343e03533`** (256×256, 1 direção; o conteúdo
opaco vive em `y 36..226`). É a pintura do Henrique convertida em pixel art pelo próprio PixelLab.

⚠️ **A arte chega ESMAGADA no preto e precisa ser corrigida antes de qualquer recorte.** Medido:
dos 44.438 pixels opacos, **44.167 (99,4%) estão abaixo de 0,1 de luminância**, e o pixel mais
claro da imagem inteira é 0,534. Não é escuridão de direção — é faixa tonal espremida.

Os quatro passos, em disco:

1. **Ganho linear ×2.2** — o valor MEDIDO em A/B de três tratamentos sobre a arte inteira, e o
   ponto de partida da implementação: ×2.2 traz a estrutura, o convés e as janelas de volta
   mantendo o âmbar como única luz. **×3.6 estoura** — o azul da nebulosa toma a cena e a regra
   "luz só onde há energia" morre. **`normalise()` é a ferramenta ERRADA** aqui: uns poucos pixels
   a 0,53 travam o alongamento e ela quase não move nada.
   ⚠️ Confirmar o número **no recorte final**: o ×2.2 foi medido na arte toda, e o recorte do
   convés tem distribuição tonal própria. Refazer o A/B se ele ficar claro ou escuro demais.
2. **Recortar o convés.** Na arte corrigida (256×190) a laje está em **`y 133..147`**, com largura
   útil em `x 26..227`. O recorte do teste — `left 14, top 127, 214×63` — pega a laje mais a
   estrutura que desce dela, e nele **a linha da pista cai em `y = 16`**.
   ⚠️ **A linha da pista é MEDIDA no recorte, nunca chutada.** Chutar a linha do convés da Aurora
   já fez a nave pousar 30px abaixo da tela, no vazio (HANDOFF, lição 13). Se o recorte mudar,
   remedir.
3. **Feather nas bordas** (`scripts/feather-doca.mjs`, que já existe e já era exigido pela doca
   antiga). O recorte é retangular e a costura vertical aparece contra a pintura —
   **borda reta é veneno**, a mesma armadilha das montanhas do parallax.
4. **Casar o tint com a pintura.** O ganho deixa a doca mais azul e mais clara que o entorno, e
   ela lê como colagem em cima da cena em vez de objeto dentro dela.

⚠️ **Escala INTEIRA.** A doca de hoje é exibida a **×1.5** — escala fracionária em pixel art, que
borra a grade (é o mesmo defeito que tirou o cargueiro de 1.9× na Fatia 3). A doca nova entra a
**×1** (o testado) ou ×2, nunca no meio. Se o tamanho em tela não fechar na escala inteira, o que
muda é o RECORTE, não a escala.

**Ela FLUTUA.** Os cabos deixam de ser enfeite e viram **estrutura**: são eles que explicam por
que a plataforma não cai. Isso obedece o vocabulário que a própria pintura estabelece — naquele
cinturão as plataformas são suspensas por guindastes e cabos, não fincadas em chão.

### 4. As luzes âmbar — em CÓDIGO, não no sprite

**Por que a animação do PixelLab falhou** (tentada pelo Henrique, descartada): o PixelLab anima o
**quadro inteiro**. Ele não tem como saber que só as janelas âmbar deviam piscar, então
re-renderiza a cena toda a cada quadro — e cada re-render escorrega. É a mesma "anima sem âncora"
que já obrigou o `centrar-anim.mjs` a existir. Num inimigo de 45px a deriva se corrige recentrando;
**num fundo ela é fatal**, porque o mundo inteiro nada junto.

O caminho da casa já está escrito: *idle sintetizado ganha de idle gerado* (`pulsar-brilho.mjs`),
tiros são código, explosões são partículas, estrelas são procedurais. Luz que pisca é da mesma
família.

- Achar os pontos quentes **por SATURAÇÃO, não por luminância** (lição já paga: o casco e as
  espinhas do cargueiro são claros mas NEUTROS, e um limiar de brilho os devolve junto).
  Medido nesta cena: 0,08% da tela na pintura, **0,19% na arte da doca**.
- Emitir uma camada aditiva sobre esses pontos, respirando em **fases diferentes** — um pulso em
  uníssono lê como a tela inteira piscando, não como uma estação viva.
- Custo de geração: zero. Ritmo: controlável. Deriva: nenhuma.

### 5. O achado — o Arauto na pista

`ship-arauto` (31×15, 9 quadros, já carregado) pousado na laje, **antes** de o jogador chegar.

Vestido em código para ler como *encalhado* e não *estacionado*: inclinado sobre a laje, tint
escuro, e um facho da doca varrendo o casco. Sem arte nova.

O laço narrativo fecha sozinho e de graça: o jogador pousa ao lado dele, vê o casco alienígena de
perto, escolhe ele no painel e **decola nele**.

### 6. A destruição — coreografia MANTIDA, coordenadas remedidas

Os 12 estouros subindo pela estrutura, os cabos arrebentando e as rochas saindo à deriva ficam
**exatamente como estão**. Nenhum tempo muda.

⚠️ **Mas as coordenadas não sobrevivem de graça.** Hoje a cadeia caminha de
`(GAME_WIDTH − 40, PAD_Y)` = `(344, 150)` até `(60, 90)`. A doca nova, na geometria testada, ocupa
`x 43..257`. Do jeito que está, **cerca de um terço da cadeia estoura no céu vazio, fora da doca**.
A coreografia não muda; os números dela são **remedidos contra os limites da doca nova**.
Medir, não chutar.

Segue valendo o que já está no código: as explosões nascem em `DEPTH_DOCA + 3`, **na frente** da
doca — sem isso elas nascem atrás da estação que deviam estar destruindo, e era metade do motivo
de o set-piece ler fraco.

### 7. O que sai de cena

A **cordilheira** (`plataforma: Phaser.GameObjects.Image[]`, documentada como *"a rocha em que a
doca está ENCRAVADA"*) é aposentada. Uma doca que flutua não está encravada em nada, e a pintura
já entrega toda a rocha de fundo que a cena precisa.

---

## Fora de escopo (decidido)

- **O painel de escolha tapar a cena inteira** durante a escolha — registrado como dívida.
- Qualquer mudança de **roteiro, tempos, textos ou entradas** (inclusive a ausência da tecla de
  pular, que é decisão de design documentada no código).
- **Re-coreografar** a destruição (o Henrique optou por manter).
- A **ferramenta de vídeo** para julgar beats em movimento. Vale a pena e está registrada como
  dívida de ferramenta — a sonda de hoje fotografa o frame do clarão e devolve uma tela laranja
  chapada, então ela não consegue julgar a explosão. É trabalho de ferramenta, não desta fatia.
- A arte do PixelLab como FUNDO (avaliada e descartada: mais chapada e mais azul que a pintura, e
  assá-la mataria o deslize e a morte da doca).

---

## Verificação

- `npm run build` (typecheck + vite) limpo.
- `scripts/probe-doca.mjs` verde: pousa NA PISTA, o Arauto está no róster, entrega a Fase 3.
- **Sonda nova** fotografando os quatro momentos com a arte nova (aproximação, pouso, painel,
  destruição), revisados a olho pelo Henrique.
- **Fallbacks conferidos:** a cena sobe sem `paint-bg-cut2.png` (cai no parallax `espaco`) e sem a
  doca nova (cai na `doca.png` atual).
- ✅ **`doca2` NÃO existe** (conferido em 2026-08-24: o `BootScene` registra só
  `doca: 'sprites/doca.png'`). O risco do `pickVariant` — que na Fatia 3 pegou o cargueiro
  (`enemyCarrier2`) e o drone, fazendo metade dos spawns nascer com a arte velha — **não se aplica
  aqui**. Reconferir só se alguém registrar uma variante.

## Critérios de sucesso

1. A cutscene lê como um **lugar** — um cinturão com profundidade, não um fundo de pedras avulsas.
2. A doca é **escura, com luz só onde há energia**, e deixa de ser a coisa mais clara da tela.
3. As janelas âmbar piscam e **nada escorrega**.
4. O jogador **VÊ** a nave alienígena antes de poder escolhê-la.
5. **Nenhum beat mudou de tempo.**

## Constraints

- Commits com autoria **só do Henrique** (sem `Co-Authored-By`).
- Arte aprovada pelo Henrique antes de entrar no jogo.
- Merge da fatia com `--no-ff` e mensagem `merge: <descrição>` (convenção da história).
  ⚠️ `git merge -F -` NÃO lê de stdin como o `git commit` — passar por arquivo.
