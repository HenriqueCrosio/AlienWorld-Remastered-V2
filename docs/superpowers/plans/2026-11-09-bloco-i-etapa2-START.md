# START — bloco I, etapa 2: os flashes de tela cheia (item 13)

> ✅ **FECHADO em 13/11** (os clarões instalados e aprovados; e a etapa 3, a tela final, também). O registro fica
> abaixo; a porta da próxima sessão é `plans/2026-11-13-bloco-j-START.md`.

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. O bloco H fechou (a enguia escura aprovada), a
> etapa 1 do bloco I (as explosões) e o lança-mísseis do casco da F3 estão aprovados, commitados e empurrados. A sessão
> abre na etapa 2 do bloco I, os flashes de tela cheia: o alcance já está decidido (o jogo inteiro, os 21); retomar na
> pergunta 2 (a forma), uma pergunta por vez (superpowers:brainstorming), antes de mexer em qualquer flash."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem: … → H ✅ → **I** (1 ✅ explosões → o desvio ✅ o lança-mísseis do casco →
> **2 flashes** → 3 tela final) → J → F.

## ▶️ ONDE ESTAMOS (10/11, atualizado no fim da sessão)

- Branch `feat/cartas-preview`, empurrada para `origin` (nunca `legacy`); a árvore igual ao remoto (fora do git só os
  vídeos e os `q/` das filmagens).
- **O que a sessão de 10/11 fechou** (detalhe no 🧭): o ok à enguia escura (o H fechou de vez); as chaminés do casco da
  F3 FORA do jogo e o lança-mísseis refeito (o berço de costelas, 3 variantes, o pé abaixo da borda da tela, o míssil
  de aço e bronze com chama e rastro, as 4 bocas por variante) — `97afc59`, `d39047a`, `1353da1`. Ele jogou a F3 com o
  cenário novo e gostou (*"gostei dela no geral"*).
- **A etapa 2 ainda não começou no código:** nenhum flash foi tocado. Só a pergunta 1 está respondida.
- **Etapa 1 (os itens 9 e 14) fechada:** as explosões do jogo inteiro são as quatro receitas aprovadas (A fogo e fumaça
  · B plasma · C fumaça densa · D estilhaços), misturadas pelo MATERIAL de quem explode, assadas em pixel. Spec
  `specs/2026-11-09-bloco-i-explosoes-design.md`, plano `plans/2026-11-09-bloco-i-explosoes.md`, folhas
  `folhas/2026-11-09/explosoes/` (`explosoes.html` os conceitos, `jogo.html` no jogo). Ele: *"Boa, eu gostei"*; a
  cutscene 1 ajustada (maior, sem as implosões, a explosão grande e a Aurora afundando). As antigas em
  `assets/raw/backup-explosoes/`.
- **Pendente dele:** nada. (Para o REBALANCEAMENTO, anotado em 10/11: a aranha do casco nunca sai sozinha e sobra até
  na luta da Serpente — dar-lhe uma saída; ele: *"podemos deixar assim"* por ora.)

## ▶️ A ETAPA 2: o que a análise de 14/10 disse (item 13)

*"Flashes de tela cheia nas cutscenes · decisão sua. Amarelo, ciano e laranja cobrindo a tela inteira por um instante.
Funcionam como golpe, mas são fortes; vale baixar a intensidade ou fazer o flash pela vinheta, e pensar em
fotossensibilidade. Combina com a decisão do pós-processamento (bloom)."* (`folhas/2026-10-14/polimento/`, img 12.)

A spec da etapa 1 (§0) já desenhou o rumo, a confirmar com ele: os flashes viram **clarão local** (a luz aditiva em volta
da fonte, como a camada de luz das explosões novas) ou **pela vinheta**, mais fracos e com **teto por segundo**
(fotossensibilidade: nada de mais de ~3 clarões fortes por segundo).

## O inventário (21 `cameras.main.flash`; as linhas conferidas de novo em 10/11, depois das edições do dia)

Reconferir antes de editar: `grep -rn "cameras.main.flash" src` (dá 22: a 22ª é um comentário em `Atmosfera.ts:165`).

| onde | ms, cor | o que é |
|---|---|---|
| `src/systems/Fx.ts:141` | 120, laranja | o `explodeBig` (toda explosão grande: chefões, bomba, cutscenes) |
| `src/systems/Fx.ts:152` | 120, laranja | o `abaloGrande` (a morte da Torre da F1) |
| `src/entities/Boss.ts:750` | 160, magenta | a virada da Torre da F1 (a decolagem) |
| `src/entities/BossCapitania.ts:275` | 180, magenta | a Capitânia entrando em fúria |
| `src/entities/BossSerpente.ts:1325` | 220, branco | a fusão da Serpente (*"branco é nascimento"*) |
| `src/entities/sangue.ts:40` | 260, vermelho escuro | a explosão sangrenta (o núcleo da F4) |
| `src/scenes/GameScene.ts:2388` | 400, branco-azulado | a nave rompendo a atmosfera (fim da F1) |
| `src/scenes/GameScene.ts:2882` | 220, creme | a bomba de pânico |
| `src/scenes/GameScene.ts:3059` | 90, rosa | a perda de casco (golpe na nave) |
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
   ✅ **RESPONDIDA em 10/11:** *"Pode ser as 11 do jogo, sua recomendação"* → o alcance é o JOGO INTEIRO (os 21).
   (O desvio que segurou a etapa — o lança-mísseis do casco — já fechou.)
> **13/11 — AS PERGUNTAS 2, 3 E 4 RESPONDIDAS, A FOLHA DE CONCEITOS (a 5) FEITA, ESPERA ELE.**
> - **2 (a forma):** *"Uma forma por família, como na tabela"* → impacto = clarão LOCAL · golpe na nave = VINHETA ·
>   largada (+ a nave rompendo a atmosfera) = tela cheia fraca e curta.
> - **3 (os sinais):** a cor de hoje, em clarão local NO EMISSOR (a nave, o chefão, o ponto da fusão); a vinheta fica
>   só do golpe (o magenta das viradas é vizinho do rosa da perda de casco). Ele: *"Boa, pode seguir com isso"*.
> - **4 (a fotossensibilidade):** teto global em código (3 clarões por segundo, o seguinte sai atenuado), teto de
>   intensidade na tela cheia (~28%), a opção de menu só na etapa 1.55.
> - **5 (a folha):** `folhas/2026-11-13/flashes/flashes.html` — hoje × o conceito em vídeo e em tiras (a cutscene 1, o
>   golpe na F2, a bomba e a fúria da Capitânia). O jogo NÃO mudou: `scripts/_i/_flashes-conceitos.mjs` troca o
>   `Camera.flash` só no navegador (a família pela assinatura ms,r,g,b; a fonte = o último estouro de partículas) e
>   `_flashes-folha.mjs` monta o lado a lado e as tiras. Depois do ok dele: a spec e o plano.

> **13/11 (2) — A ETAPA 2 INSTALADA, ESPERA ELE JOGAR.** Ele aprovou a folha (*"Boa, aprovado"*), lembrou das outras
> cutscenes (a 2 e a 3 filmadas e postas na folha; a FINAL achada fora do inventário) e decidiu: na queda do Leviatã o
> clarão de tela cheia vira clarão local no focinho e os quadros de impacto ficam; o clarão final da cutscene 3 (sem
> fonte na tela) = véu fraco. *"Pode seguir com plano e implementação."*
> - **Spec** `specs/2026-11-13-bloco-i-flashes-design.md` · **plano** `plans/2026-11-13-bloco-i-flashes.md` (Tasks 1–5 feitas).
> - **No jogo:** `src/systems/clarao/` (`claraoRegras.ts` puro, `texturasClarao.ts`, `Clarao.ts` → `claraoDe(scene)` com
>   `impacto`/`climax`/`sinal`/`golpe`/`largada`/`conta`); as 21 chamadas trocadas + `final/queda.ts`; o `uFlash` saiu da
>   Atmosfera (e a seção do flash quente da `probe-atmosfera-fases`). NENHUM `cameras.main.flash` em `src/`.
> - **Testes:** `scripts/test-claroes.mjs` (o teto, o raio, o disco, a vinheta, a quantização, e falha se um flash de
>   câmera voltar ao `src/`); build e os 29 testes ok.
> - **A prova:** folha `folhas/2026-11-13/flashes/instalado.html` (conceito × jogo; `_flashes-instalado.mjs`). Golpe,
>   bomba, fúria e a cadeia da cutscene 2 idênticos ao conceito; as cutscenes 1 e 3 variam de uma filmagem para outra.
>   NÃO filmados: a Torre da F1, a fusão da Serpente, o núcleo da F4, o Casco, a atmosfera, a bomba de pânico.
> - **Nada commitado.** O próximo: o ok dele jogando → a etapa 3 do bloco I (a tela final, o item 11).

2. ✅ **a forma (respondida acima):** o clarão LOCAL (luz em volta da fonte, a tela não muda de cor), a VINHETA (as bordas acendem, o meio
   fica legível), ou o flash de hoje mais fraco e mais curto? Talvez um por família (golpe na nave ≠ explosão ≠ largada).
3. **Os que são linguagem:** o ciano "nave armada" e o branco "nascimento" da Serpente são sinais, não impacto — ficam?
4. **A fotossensibilidade:** um teto global (quantos por segundo, que intensidade) e, mais tarde, uma opção no menu de
   OPÇÕES (a etapa 1.55 do roadmap)?
5. Depois: conceitos lado a lado numa folha (a cutscene 1 e a bomba são os melhores testes), em vídeo.

**Uma sugestão para a pergunta 2** (minha, a confirmar com ele): as 21 se agrupam em 4 famílias, e a forma pode ser
uma por família em vez de uma para todas — **impacto** (as explosões grandes do `Fx`, a doca, a Aurora, o núcleo, a
bomba: o clarão LOCAL, que a etapa 1 já deu a toda explosão com a folha `-luz`), **golpe na nave** (a perda de casco, o
Casco absorvendo, a morte: a VINHETA, as bordas acendem e o meio fica legível), **sinal** (o ciano "nave armada", o
branco da fusão da Serpente, o magenta das viradas de chefão: a pergunta 3) e **largada** (as três cutscenes).

## Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e conferir `git status` (deve estar limpo, fora os vídeos e os `q/`).
2. Fazer a pergunta 2, depois a 3 e a 4, uma por vez.
3. Só então a folha de conceitos em vídeo (a pergunta 5), a spec e o plano; nenhum flash muda antes disso.

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
