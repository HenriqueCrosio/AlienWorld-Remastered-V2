# Bloco I, etapa 1 — as explosões do jogo inteiro (spec)

> 09/11. O bloco I do 🧭 (os itens que sobraram da análise de polimento de 14/10, `folhas/2026-10-14/polimento/`).
> Aprovada por ele em conversa: *"pode escrever e seguir para os conceitos"*. ✅ Implementada e aprovada em 09/11
> (*"Boa, eu gostei"*), com a cutscene 1 sem as implosões (§4b: a implosão da Aurora virou uma explosão grande).

## 0. O bloco I em três etapas

Dos itens do I, o **10** (rótulos do HUD) e o **16** (setas das dicas) já foram feitos e aprovados em 17/10, e o **15**
(drones encavalados) saiu de vez — ele, de novo em 09/11: *"isso faz parte do estilo do jogo. Eles andam em enxames"*.
Sobram quatro, em três etapas, nesta ordem:

1. **As explosões (itens 9 e 14)** — esta spec.
2. **Os flashes de tela cheia (item 13)**: os ~22 `cameras.main.flash` (10 nas cutscenes, ~12 no jogo) viram clarão local
   (a luz aditiva do pixelfx em volta da fonte) ou pela vinheta, mais fracos e com teto por segundo
   (fotossensibilidade). Depois desta, porque a explosão grande carrega um flash. Spec própria.
3. **A tela final (item 11)**: "O LEVIATÃ CAIU" como título de campanha, a pintura do Leviatã caído escurecida e viva
   atrás (estrelas cadentes, brasas — referência `weather/shooting-stars`, `god-rays`), pontos, medalha e recorde com
   hierarquia, nas três vozes. Spec própria.

## 1. O problema (medido)

Os itens 9 (*a fumaça da morte dos chefões são bolinhas*) e 14 (*a explosão chapada da cutscene 1*) têm a MESMA causa:
as folhas de explosão do jogo (`public/sprites/explosion-sheet.png` 64², `explosion-big-sheet.png` 128²,
`explosion-small-sheet.png` 32², 13/13/9 quadros), usadas por TODO estouro via `src/systems/Fx.ts` (`explode`,
`explodeBig`, `implodeBig`, `sheetExplosion`): inimigos, chefões, a bomba, as cutscenes. Os quadros do meio são anéis
vermelhos lisos e concêntricos; os do fim, fumaça de bolinhas pretas de miolo marrom — traço de desenho animado, contra
a pintura e o dark sci-fi. E o jogo as AMPLIA: `explode` desenha a pequena a até 1,375× e a média a até 1,2×, contra a
regra de nunca ampliar (`fundos-pintados-resolucao-nativa`).

## 2. A decisão dele

Trocar **todas** (a pequena, a média, a grande e a implosão), no jogo inteiro: um estilo só.

## 3. O desenho

1. **O motor do pixelfx vira do jogo todo.** Hoje ele vive dentro da enguia (`src/entities/serpente/enguia/pixelfx/`,
   patch-gg/pixelfx, MIT, as receitas da Sprite Fusion de Hugo Duprez). Passa para `src/fx/pixelfx/` (com LICENSE,
   NOTICE e ORIGEM) e a enguia importa de lá. A enguia está aprovada: o oráculo `scripts/test-enguia-porte.mjs` prova
   que ela segue idêntica (o md5 dos quadros).
2. **Assadas, não ao vivo.** Um script desenha cada explosão com as peças do pixelfx (`firePuff`, `smokePuff`, `spark`,
   `ember`, a luz) como uma função pura idade → desenho — o modelo da bola de fogo da cabeça da enguia
   (`efeitos.ts` `bolaDeFogo`) — e grava folhas no formato de hoje. O jogo não muda de API (as mesmas chaves e
   animações no `Fx`), não custa desempenho com dezenas de estouros, e cada folha sai no MAIOR tamanho em que aparece
   (o `Fx` passa a só reduzir). **Duas camadas por folha:** a cor (opaca, pontilhada) e a luz (aditiva, tocada por cima
   com `blendMode ADD`), como a luz da enguia.
3. **Duas físicas, pela zona da cena.** O pixelfx faz explosão de chão (gravidade 950 px/s², fumaça que sobe, pedra que
   cai). **Atmosfera (a F1):** a fumaça sobe e se desfaz. **Vácuo (F2, F3, F4 e as cutscenes no espaço):** nada sobe
   nem cai — a bola se expande, os estilhaços saem retos e giram na inércia, a fumaça abre em esfera até sumir
   (`fisica-do-lugar-nos-ataques`).
4. **A cor.** Luz só onde há energia: o núcleo branco-quente → âmbar → vermelho → fumaça escura, em pixel de contorno
   irregular — nada de anel liso nem bolinha. Nada em vermelho de aviso puro nem branco-azulado. O tom de cada fase
   segue vindo da Atmosfera (toda cena passa por ela).
5. **A implosão** (a morte da Aurora na cutscene 1) deixa de ser a grande tocada ao contrário: ganha a sua, partindo do
   `implosion` do pixelfx (o que a fusão da enguia já usa) na rampa de fogo.

## 4. Os conceitos (antes de instalar)

Uma folha (`folhas/2026-11-09/explosoes/`) com 3–4 caminhos, cada um na grande, na média e na pequena, em velocidade
real, ao lado da de hoje, sobre a pintura do jogo (a F2) e numa cena (a morte de um chefão da F1/F2, a cadeia da
cutscene 1). Ele escolhe; só então o plano e a instalação.

## 4b. A escolha dele (09/11) e a distribuição

Ele, na folha `folhas/2026-11-09/explosoes/explosoes.html`: *"eu gostei de todos, portanto vamos usar todos. misturando
alguns quando for conveniente"*; e à distribuição abaixo: *"Boa, pode seguir"*. A duração fica a dos conceitos.

Quem decide é o **material** que o jogo já dá a cada corpo (`src/systems/morte/numerosDestrocos.ts`: `SEPARACAO`,
`CHEFOES`, `PECAS` — metal, luz, biomec, carne, rocha — e a classe), não uma lista nova:

| quem | material | a explosão |
|---|---|---|
| drones, batedores, kamikazes, cargueiro, canhoneira, torres, elites de metal | metal | **D** (estilhaços); as grandes com o fogo do **A** |
| minas, sensores, destroços (estouram de verdade) | metal, peça | **A** |
| chefões de metal (Torre, Capitânia) e a aranha | metal, chefe/mini | a cadeia **A + D**, o último estouro **C** (a nuvem que fica: o item 9) |
| água-viva | luz | **B** |
| lula, Larva, Guardião, golfinho, Serpente | biomec | o clarão do **B** e a fumaça do **C** |
| pupas, moscas, Tubo, Predador, portas e esfíncter da F4 | carne | **C** de matéria (escura avermelhada, sem fogo) |
| asteroides, rochas mineráveis | rocha | **D** em pedra (lascas e poeira cinza, quase sem fogo) |
| a bomba do jogador | — | **A** grande |
| as explosões das cartas | — | **B** |
| a morte da nave | — | **D** (a morte própria de cada nave segue por cima) |
| cutscenes 1 e 2 (Aurora, doca) | metal | **A + D**, a grande fechando em **C**; a implosão da Aurora = o `implosion` |
| cutscene 3 (a garganta) | carne | **C** de matéria |

A **F1** (atmosfera, a fumaça sobe) só tem metal e rocha: a versão de atmosfera existe só para A, C e D. Quem chama o
`Fx` sem dizer o material cai no **A**.

## 5. O teste

`scripts/test-explosoes.mjs`: o número de quadros e o tamanho de cada folha (e da camada de luz), alpha 0/255 na cor,
nenhuma cor proibida, a física (no vácuo nenhuma partícula com aceleração vertical), o `Fx` nunca ampliando, e a enguia
idêntica pelo oráculo dela.

## 6. Fora desta etapa

Os flashes (a etapa 2), a tela final (a etapa 3), as mortes por pixel (`docs/DESTROCOS.md`, que seguem como estão: a
explosão nova toca por cima delas como a de hoje).
