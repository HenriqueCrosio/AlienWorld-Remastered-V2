# SPEC — FATIA 8 · A CUTSCENE FINAL: "O AFASTAMENTO", REFEITA (2026-09-23)

**A última fatia do passe visual.** Depois dela vem a CALIBRAGEM (etapa 2 do 🧭 do `docs/HANDOFF.md`).
Porta de entrada: `docs/superpowers/plans/2026-09-23-fatia8-cutscene-final-START.md`. Branch:
`feat/cutscene-final-visual`.

As folhas de conceito desta spec estão em `docs/superpowers/folhas/2026-09-23/`.

---

## 1 · POR QUE A CENA É REFEITA INTEIRA

O veredito dele, depois de assistir à cena de julho em 23/09:

> *"ela se divide em duas, basicamente, pois temos a nave saindo pelo hangar de entrada (o que já é
> fora do nosso contexto atual) pois a fase 4 dá uma sensação de adentrar mais fundo no leviatã,
> tornando inviável a saída no mesmo hangar que antes estava destruido (cutscene 3). Depois aparece a
> nave se distanciando da baleia com ela rachando no meio, a aparição sem noção da lua (ela vem
> crescendo e aparecendo, não é normal isso acontecer) os meteoros gerados caindo nela etc. Meu
> veredicto: Precisamos remodelar ela inteira."*

Os três defeitos, com o nome de cada um:
1. **A saída mente sobre a geografia.** A Fase 4 é uma descida para dentro do bicho. Sair pelo
   hangar de entrada, que já estava destruído na Cutscene 3, desfaz essa descida.
2. **A lua cresce sem causa física.** Astro não cresce na tela sem a câmera se mover até ele.
3. **Os meteoros não têm peso nem origem.** Pedaços genéricos caindo não são o corpo de ninguém.

E um defeito de fundo: a cena usa as **baleias erradas** (`leviathanWhale*`), a última dívida do
Leviatã canônico, e ela é só desta cena.

---

## 2 · O QUE FICA DE JULHO, E O QUE MUDA DE TOM

**Fica (decisões de 20/07, reafirmadas em 23/09):**
- **Vitória AMARGA.** A colônia já estava morta antes da decolagem. A campanha foi vingança.
- **Sem painel e sem tecla de pular.** O jogador chega martelando o ESPAÇO.
- **Crédito mínimo:** `UM JOGO DE HENRIQUE CROSIO` no `GameOver`, só com `victory && stage === 4`.
- **O voo para a ESQUERDA** como sinal de volta. Agora ele mora no sobrevoo (§3, capítulo 6).

**Muda de tom (pedido dele em 23/09):** a vitória amarga tem de ser *"mais visceral e obscena, do
ponto de vista técnico e visual"*. O bicho não "racha ao meio" de longe: ele se abre em volta da
nave, jorra no vácuo, cai sobre a colônia e apodrece em cima dela.

---

## 3 · O ROTEIRO — SETE CAPÍTULOS, CERCA DE 47 s

Escolhas dele, em ordem:
- a saída é a **MESCLA** das variantes A (*ele se abre*) e C (*ela é cuspida*) — folha
  `storyboard-saida-A-C-mescla.png`;
- o plano de fora é o **A4**, não o M4 (*"o 4 da A ficou muito bom, melhor que o 4 da mescla"*);
- o fim é **B terminando em A** (o corpo cai na colônia, e a luz dele se apaga), **mais o sobrevoo**
  pedido por ele (*"a nave sobrevoando a colônia toda destruída e o leviatã caído também"*);
- o sobrevoo **espelha a Fase 1** (a mesma colônia, em ruínas, com a nave voltando para a esquerda);
- a cena **emenda na luta sem corte**: continuidade total na câmara D.

| # | Capítulo | Tempo | O que acontece | Conceito |
|---|---|---|---|---|
| 1 | **CONVULSÃO** | 0 – 5 s | Abre **na câmara D do jogo**: a mesma pintura, a mesma borda, a poça onde o predador afundou e a nave onde o jogador parou. Tremor crescente, rachaduras de lava se espalhando pela pintura, fluido escorrendo do teto, a poça agitada. A nave treme; o jogador já não a controla. | — (é a câmara D real) |
| 2 | **O RASGO** | 5 – 9,5 s | A parede da direita da câmara D rasga: membranas esticam e arrebentam, as costelas se abrem, aparece o vácuo com estrelas, e a lava corre pelas bordas. **A música morre no instante do rasgo.** | `conceito-2-rasgo-22.png` |
| 3 | **DESCOMPRESSÃO** | 9,5 – 13,5 s | O vácuo puxa tudo para o rasgo: fluido, gotas de lava, tendões, lascas de osso, todos em rastros apontados para o buraco. A nave é **arrancada** e sai girando. Corte seco quando ela cruza o buraco, **sem clarão**. | `conceito-3-descomp-11.png` |
| 4 | **A FERIDA** | 13,5 – 21 s | Plano aberto de fora: o **biomecânico** inteiro, com o flanco aberto soltando uma nuvem no vácuo. A nave sai rolando, estabiliza e se afasta. A **lua do menu** aparece pequena e **parada** no fundo. | `conceito-4-ferida-11.png` |
| 5 | **A QUEDA** | 21 – 29 s | **Outro plano, por corte:** a câmera está junto do corpo, perto da lua. O corpo sem força entra de cabeça na atmosfera, com o casco em brasa, pedaços se soltando e um rastro de fumaça. Some atrás do horizonte. O impacto é contido: brilho baixo, sem lavar a tela. | `conceito-5-queda-11.png` |
| 6 | **O SOBREVOO** | 29 – 41 s | Superfície: **o espelho da Fase 1**, com o mesmo céu, as mesmas montanhas e a mesma colônia, agora em ruínas. A nave passa em rasante **para a esquerda**, ao longo da **carcaça** atravessada sobre a colônia. Banner `KEPLER · A COLÔNIA MORTA`. | `conceito-6-sobrevoo-22.png` |
| 7 | **A LUZ SE APAGA** | 41 – 47 s | A nave sai pela esquerda, e a câmera para sobre a carcaça. A lava das rachaduras esfria **placa por placa** até o breu. Na última luz vem o fade para o preto e o `GameOver` com o crédito. | — |

**O som:** a música da luta atravessa os capítulos 1 e 2 e **morre no rasgo**. Dali até o fim há
silêncio, com no máximo o baque do impacto no capítulo 5.

**A lua segue uma regra física:** ela aparece no capítulo 4 no tamanho em que fica e **não muda de
escala dentro de um plano**. Quando está grande, no capítulo 5, é porque houve um CORTE para outro
plano, com a câmera junto do corpo. Nunca por zoom.

**Em aberto, para decidir no teste assistido:** um corte de cerca de 1,5 s no M4 (o flanco jorrando
em close) entre os capítulos 3 e 4. Não entra na primeira versão.

---

## 4 · AS PEÇAS

**Reusado:** `paint-bg-f4-d` com a borda da Fase 4 (`Moldura`, faixa D); a poça do fim do
predador (`f4-lava-sheet`, `fimDoPredador.ts`); a nave escolhida (`SHIPS[naveId]`); `menu-moon`
(PixelLab `77acaa1d`); `paint-bg-f1` (céu e montanhas); o campo de estrelas.

**Gerado pela máquina.** O Henrique entra só se um fundo não passar no olho dele, usando o conceito
como base (*"caso os fundos precisem da minha criação, eu posso fazer"*):

| # | Peça | Tamanho | Receita | Critério |
|---|---|---|---|---|
| P1 | Rachaduras da convulsão sobre a câmara D | camada de 384×216, 6 a 8 estágios | assada em pixel com a paleta da câmara D, a receita de `scripts/_f4/_assar-fim-f4.mjs` | lê como a PINTURA rachando, não como um traço por cima |
| P2 | O rasgo da parede | cerca de 130×216, 6 a 8 quadros | PixMiniMax interpolando o recorte intacto da câmara D até o recorte do conceito 2★ (`inpaint-v3` sobre a câmara real, máscara em `folhas/2026-09-23/mask-rasgo.png`) | o último quadro casa pixel a pixel com a pintura em volta |
| P3 | A descompressão | partículas assadas: rastros, gotas, tendões, lascas | conceito 3★ como estado final da parede | direção inequívoca para o buraco |
| P4 | O Leviatã ferido, visto de fora | cerca de 220 a 256 px | um estado novo do objeto biomecânico `f397793a` (flanco aberto) + um clipe de deriva | é o biomecânico: costelas, lava nas rachaduras, **sem dentes** |
| P5 | A nuvem que vaza da ferida | clipe de cerca de 96 px | PixMiniMax | contínua, sem "loop que fecha" visível |
| P6 | A reentrada | sprite + clipe do rastro + fundo com a lua de perto em 384×216 | a partir do conceito 5★ | ⚠️ **polimento:** a borda em brasa é hoje o ponto mais claro da cena, e deve ser amansada |
| P7 | O sobrevoo | camadas com rolagem: longe (da F1), meio (ruínas + carcaça), frente (entulho) | a partir do conceito 6★ | ⚠️ **polimento:** a carcaça tem de estar **partida, afundada no terreno, com cratera**. No conceito ela está inteira e limpa demais para quem caiu de órbita |
| P8 | A lava se apagando na carcaça | camada, cerca de 8 estágios | assada: as placas esfriam uma a uma | a última luz é uma placa só, e depois o preto |

**Sai do jogo:** `leviathanWhale`, `leviathanWhaleDying`, `leviathanWhaleDyingSheet`,
`leviathanWhaleSplit` (as chaves no `BootScene`, os PNGs em `public/sprites/leviathan-whale*` e a
animação `leviathan-dying` montada no `Fx.ts` a partir da sheet da baleia; hoje há 18 referências,
em `BootScene`, `Fx` e `Interlude4Scene`); nesta cena, o uso de `hangar.png`, do `selarBoca`, da lua do
parallax, dos meteoros e da partição em duas metades.
⚠️ Antes de apagar qualquer arquivo, confirmar por `grep` que só esta cena o usa.

---

## 5 · A TÉCNICA

**A costura com a luta.** O `GameScene` já entrega à interlude `stage`, `stageDone`, `handling`,
`score`, `ship`, `practice` e `baseScore`. Passa a entregar também **`naveX`, `naveY`**. A altura
da poça não precisa viajar: ela é constante (`Predador.CHAO_APOIO`, a mesma que o `BossNucleo`
passa ao `afundarNaLava`, mais o `SOBE_ACIMA_PX` de `fimDoPredador.ts`, que passa a ser exportado).
A `Interlude4` abre com a
mesma pintura, a mesma borda (`Moldura` com `desenha = true`, faixa D, `imediato`) e a mesma lava,
e a nave no lugar onde estava. O único sinal da troca é o HUD saindo. Pelo menu (`F`), os valores
padrão reproduzem o fim típico da luta.

**O código.** A `Interlude4Scene` (869 linhas hoje) vira uma **regente**: a linha do tempo, com
todos os tempos no topo em constantes nomeadas, e o estado exposto para a sonda. Cada capítulo
passa a morar num arquivo próprio em `src/scenes/final/`:
- `dentro.ts`: capítulos 1 a 3 (convulsão, rasgo, descompressão);
- `fora.ts`: capítulo 4 (a ferida);
- `queda.ts`: capítulo 5;
- `sobrevoo.ts`: capítulos 6 e 7.

Cada arquivo exporta uma função que recebe a cena e devolve o que a regente precisa (duração, estado
para a sonda). Um capítulo se ajusta sem abrir os outros.

**As regras das fatias 0 a 7 que valem aqui:**
- dark sci-fi, com luz **só onde há energia** (lava, reentrada, motor);
- nenhum `flash` ou `explodeBig` que lave a tela; `setTint` não repinta a arte escura;
- efeito de cena **assado em pixel** na resolução nativa, com a paleta do vizinho, e nunca `Graphics`
  vetorial em tempo de jogo;
- fundo pintado em 384×216, escala 1; reduzir pode, **aumentar nunca**;
- o efeito novo espera o velho sair (lição do sangue do esfíncter);
- PixelLab: vocabulário de gore é barrado, então descreva a MATÉRIA; o PixMiniMax clareia, então
  cada clipe passa por correção de paleta; a fila de review é a biblioteca dele, e nada se descarta
  em massa.

---

## 6 · OS TESTES

- **`scripts/probe-interlude4.mjs` reescrita.** Um assert e um screenshot por capítulo. Confere:
  - nenhuma textura `leviathanWhale*` é carregada nem usada;
  - no capítulo 1, a textura de fundo é a `paint-bg-f4-d` e a nave está no `naveX/naveY` recebido;
  - a lua tem a **mesma escala** do começo ao fim do capítulo 4;
  - a música para no capítulo 2;
  - no sobrevoo, a nave anda para a **esquerda**;
  - no fim do capítulo 7, a camada de lava da carcaça tem alfa 0;
  - a cena termina no `GameOver` com `victory` e `stage === 4`.
- **`scripts/probe-stage4.mjs`** segue verde, atravessando a luta, a costura, a cena e o crédito.
- **Folha por relógio de parede** (o molde `scripts/_f4/_ver-lenta.mjs`) para o rasgo e a
  descompressão, porque beat de explosão só se julga em movimento.
- `npm run build` verde.
- **O teste que fecha a fatia:** ele assiste, de preferência chegando pela morte do predador
  (`L` → Fase 4).

---

## 7 · FECHAMENTO

Teste assistido aprovado → sondas verdes → o 🧭 do `docs/HANDOFF.md` marca a etapa 1 como ✅ e
aponta para a CALIBRAGEM → a dívida das baleias sai da tabela → merge `--no-ff` de
`feat/cutscene-final-visual` em `main`. **Ao fechar a 8, o passe visual acaba.**

---

## 8 · O QUE MUDOU NA EXECUÇÃO (24–25/09)

Cada mudança veio dele, assistindo a cada capítulo. O estado real está em
`docs/superpowers/plans/2026-09-25-fatia8-retomada-START.md`.

| Onde | A spec dizia | Ficou | Por quê |
|---|---|---|---|
| Linha do tempo | ~47s; capítulo 1 com 5s | **~42s; capítulo 1 com 1,5s** | *"o rasgo na estrutura tem que vir logo depois"* |
| Capítulo 1 | rachaduras assadas (P1) | **o núcleo pulsando** — a pintura animada pela v3 | *"essas rachaduras lembram teias"* |
| Capítulo 2 | o rasgo interpolado (P2) | **corte seco** para o rasgado + as bordas se mexendo; o topo **fecha por dentro** | a interpolação longa gera manchas; o recorte reto no topo foi reprovado |
| Capítulo 3 | a nave sai girando | a nave é puxada, **encolhe e some pela fenda** | ela ficava derivando na boca do buraco |
| Placar | — (herdado da cena velha) | **saiu da cutscene** | cobria o núcleo, o único instante de reconhecer o lugar |
| Capítulo 4 | um estado novo gerado do biomecânico (P4) + a nuvem em clipe (P5) | o Leviatã **recortado do conceito 4★**, **imóvel e abatido**; o céu é o **zero-G espelhado** (a lua perto, embaixo) | a geração nova saía fora do modelo; a ferida animada por região quebrava na emenda |
| Capítulo 5 | o corpo some atrás do horizonte | ele **encolhe caindo** (12 tamanhos assados) e **bate NA colônia, à vista**; atrás da lua, o **abismo da Cutscene 1** | *"o leviatã é grande, mas não do tamanho de uma lua"* · *"o jogador veja ela colidindo com a lua e consequentemente a colonia"* |
| Capítulo 6 | rolagem em camadas (P7) | **plano fixo e largo** sobre o conceito 6★ com o corpo **rasgado no meio** (entranhas biomecânicas) | a pintura é de um quadro só; a cratera das duas primeiras rodadas foi reprovada |
| Capítulo 7 | P8 assado sobre a carcaça do P7 | igual, sobre a carcaça do capítulo 6 | — |
| Sonda | um assert por capítulo | + **`faltando === 0`** em todo capítulo | ela contava quadros de uma folha que nem carregava |

**Fechado em 26/09 (ele, depois de assistir):** os capítulos 5, 6 e 7 **aprovados**; **sem o corte do M4** (o
capítulo 4 já mostra o jorro, e o corte seco 3→4 fica); o pulso é a **seed 3** — a 17 e o `?pulso=17` saíram do jogo.
Depois da cena pronta, ela ganhou a Atmosfera (spec `2026-09-25-atmosfera-engine-design.md`).
