# START — bloco I, etapa 2: os flashes de tela cheia (item 13)

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A etapa 1 do bloco I (as explosões) está
> aprovada, commitada e empurrada. A sessão abre na etapa 2, os flashes de tela cheia: começar pelas perguntas a ele
> (superpowers:brainstorming), uma por vez, antes de mexer em qualquer flash."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem: … → H (falta o ok da enguia escura) → **I** (1 ✅ explosões → **2 flashes**
> → 3 tela final) → J → F.

## ▶️ ONDE ESTAMOS (09/11)

- Branch `feat/cartas-preview`, empurrada para `origin` (nunca `legacy`).
- **Etapa 1 (os itens 9 e 14) fechada:** as explosões do jogo inteiro são as quatro receitas aprovadas (A fogo e fumaça
  · B plasma · C fumaça densa · D estilhaços), misturadas pelo MATERIAL de quem explode, assadas em pixel. Spec
  `specs/2026-11-09-bloco-i-explosoes-design.md`, plano `plans/2026-11-09-bloco-i-explosoes.md`, folhas
  `folhas/2026-11-09/explosoes/` (`explosoes.html` os conceitos, `jogo.html` no jogo). Ele: *"Boa, eu gostei"*; a
  cutscene 1 ajustada (maior, sem as implosões, a explosão grande e a Aurora afundando). As antigas em
  `assets/raw/backup-explosoes/`.
- **Pendente dele, sem pressa:** o ok à enguia escura e mais rápida do bloco H (`folhas/2026-11-09/silhuetas/silhuetas-r2.html`,
  o topo); jogar a F3 inteira com o cenário novo.

## ▶️ A ETAPA 2: o que a análise de 14/10 disse (item 13)

*"Flashes de tela cheia nas cutscenes · decisão sua. Amarelo, ciano e laranja cobrindo a tela inteira por um instante.
Funcionam como golpe, mas são fortes; vale baixar a intensidade ou fazer o flash pela vinheta, e pensar em
fotossensibilidade. Combina com a decisão do pós-processamento (bloom)."* (`folhas/2026-10-14/polimento/`, img 12.)

A spec da etapa 1 (§0) já desenhou o rumo, a confirmar com ele: os flashes viram **clarão local** (a luz aditiva em volta
da fonte, como a camada de luz das explosões novas) ou **pela vinheta**, mais fracos e com **teto por segundo**
(fotossensibilidade: nada de mais de ~3 clarões fortes por segundo).

## O inventário (21 `cameras.main.flash`, medido em 09/11)

| onde | ms, cor | o que é |
|---|---|---|
| `src/systems/Fx.ts:141` | 120, laranja | o `explodeBig` (toda explosão grande: chefões, bomba, cutscenes) |
| `src/systems/Fx.ts:152` | 120, laranja | o `abaloGrande` (a morte da Torre da F1) |
| `src/entities/Boss.ts:750` | 160, magenta | a virada da Torre da F1 (a decolagem) |
| `src/entities/BossCapitania.ts:275` | 180, magenta | a Capitânia entrando em fúria |
| `src/entities/BossSerpente.ts:1325` | 220, branco | a fusão da Serpente (*"branco é nascimento"*) |
| `src/entities/sangue.ts:40` | 260, vermelho escuro | a explosão sangrenta (o núcleo da F4) |
| `src/scenes/GameScene.ts:2417` | 400, branco-azulado | a nave rompendo a atmosfera (fim da F1) |
| `src/scenes/GameScene.ts:2911` | 220, creme | a bomba de pânico |
| `src/scenes/GameScene.ts:3088` | 90, rosa | a perda de casco (golpe na nave) |
| `src/systems/CartasEmJogo.ts:304` | 70, ciano | o Casco (a carta) absorvendo um golpe |
| `src/systems/morte/MorteDaNave.ts:573` | `MORTE.clarao` | o clarão da morte da nave |
| `src/scenes/InterludeScene.ts:297` | 160, âmbar | cutscene 1, a largada |
| `src/scenes/InterludeScene.ts:448` | 200, ciano | cutscene 1, a nave armada |
| `src/scenes/InterludeScene.ts:500` | 500, creme | cutscene 1, a explosão final da Aurora |
| `src/scenes/Interlude2Scene.ts:622` | 160, âmbar | cutscene 2, a largada |
| `src/scenes/Interlude2Scene.ts:780` | 200, ciano | cutscene 2, a nave armada |
| `src/scenes/Interlude2Scene.ts:887` | 800, laranja | cutscene 2, a doca explodindo |
| `src/scenes/Interlude3Scene.ts:650` | 160, vermelho | cutscene 3, a largada |
| `src/scenes/Interlude3Scene.ts:821` | 200, ciano | cutscene 3, a nave armada |
| `src/scenes/Interlude3Scene.ts:870` | 700, laranja | cutscene 3, o clarão final (a boca selada) |
| `src/scenes/Interlude3Scene.ts:916` | 140, laranja | cutscene 3, o impacto na garganta |

(Os véus pretos de tela cheia — `Predador.ts:1058`, `cenarioHangar.ts:100`, `GameScene.ts:1595` — são transições, não
flashes: ficam fora.)

## As perguntas a ele (uma por vez)

1. **O alcance:** só as cutscenes (o que a análise apontou) ou também os ~11 do jogo (chefões, bomba, golpe, morte)?
   ✅ **RESPONDIDA em 10/11:** *"Pode ser as 11 do jogo, sua recomendação"* → o alcance é o JOGO INTEIRO (os 21). A
   próxima pergunta a fazer é a 2 (a forma). ⚠️ A etapa 2 ficou em espera: antes dela entrou o refazer das chaminés e
   das torres de mísseis do casco da F3 (ver o 🧭).
2. **A forma:** o clarão LOCAL (luz em volta da fonte, a tela não muda de cor), a VINHETA (as bordas acendem, o meio
   fica legível), ou o flash de hoje mais fraco e mais curto? Talvez um por família (golpe na nave ≠ explosão ≠ largada).
3. **Os que são linguagem:** o ciano "nave armada" e o branco "nascimento" da Serpente são sinais, não impacto — ficam?
4. **A fotossensibilidade:** um teto global (quantos por segundo, que intensidade) e, mais tarde, uma opção no menu de
   OPÇÕES (a etapa 1.55 do roadmap)?
5. Depois: conceitos lado a lado numa folha (a cutscene 1 e a bomba são os melhores testes), em vídeo.

## As ferramentas que servem

- Filmar uma fase com explosões: `scripts/_i/_explosoes-jogo.mjs` (`--fase N --real --quadros --matar 0.4`,
  `--chefe T` faz `spawnBoss` e `killBoss`; o `skipTo` do roteiro descarta o evento do chefão).
- Filmar uma cutscene: `scripts/_i/_cutscene-filmar.mjs` (`--cena Interlude|Interlude2|Interlude3`; escolhe a 1ª carta
  pela `onEscolha` da mesa e esconde a camada HD — os textos somem no filme).
- A luz aditiva: o `Fx.explosao` toca a folha `-luz` em `blendMode ADD` por cima da cor; o pixelfx (`src/fx/pixelfx/`)
  tem `glow`/`glowRing` e o buffer `light`.
- A Atmosfera (`src/systems/atmosfera/`) já tem vinheta por perfil: o caminho natural de um flash "pela vinheta".

## As leis que seguem valendo

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs, os
  quadros soltos (`q/`) e o `cru/` fora. A ordem: o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês. Editar com Edit/Write (sed/node -e falham em silêncio
  com CRLF e `${}`, e acentos graves dentro de `node -e "…"` no bash são executados pelo shell — escrever o script num
  arquivo).
- Durante uma filmagem não editar `src/` nem `.html` do projeto (o Vite recarrega).
- Testes novos terminam com `process.exitCode`, não `process.exit` (no Windows o `exit` com o sharp aberto aborta).
