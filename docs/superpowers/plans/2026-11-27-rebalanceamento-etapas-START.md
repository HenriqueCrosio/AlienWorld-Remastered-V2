# START — O REBALANCEAMENTO, A ORDEM NOVA (27/11)

> A frase de arranque: **"Leia o `docs/CONTEXTO-REBALANCEAMENTO.md`, o 🧭 do `docs/HANDOFF.md` e este START. As etapas
> 1 (as cartas) e 2 (as hitboxes) do rebalanceamento estão FEITAS, aprovadas e commitadas (27/11). A próxima é a 3:
> popular as fases (enxames de batedores da F2 em diante) e mais vida para os inimigos comuns."**
> Substitui o `plans/2026-11-27-rebalanceamento-frente1-START.md` (as frentes 1–5 de 21/11 e os "alvos"), que fica como
> registro. A análise das cartas de 21/11 e as decisões dele daquele dia continuam em
> `plans/2026-11-21-rebalanceamento-START.md` (§1, §2). A folha-base de 26/11 (`folhas/2026-11-26/medicao/`) é a medida
> do "ANTES"; os golpes por minuto dela deixam de valer quando a hitbox mudar.

## ⚠️ Antes de propor qualquer coisa (a lição de 27/11)

Ler o histórico INTEIRO do tema: o documento de origem dele (cartas: `sistema_de_cartas_skills_shoot_em_up_v2.md` na
raiz; o jogo: `docs/GDD.md`), as specs, os STARTs, as memórias, e o código de hoje. Análise ou plano escrito por mim não
é decisão dele; número sem medida é marcado como meu. As conversas antigas estão nas transcrições
(`~/.claude/projects/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/*.jsonl`; a de 21/11 é a
`9b2bd212…`). Memória `ler-historico-antes-de-propor`.

## A ordem (dele, 27/11)

| # | Etapa | Estado |
|---|---|---|
| 0 | Registrar a ordem (este START, o 🧭) | ✅ 27/11 |
| 1 | **As cartas:** a raridade, mudar ou tirar | ✅ 27/11, testado e commitado (§1) |
| 2 | **As hitboxes:** a da NAVE primeiro (*"às vezes relam e não tomam dano, ou não relam e tomam dano"*), depois inimigos, destroços, peças das fases | ✅ 27/11, **aprovado jogando** (*"Ficou bom assim"*) e commitado — a colisão pelo DESENHO fora das lutas, 2 px de perdão; os chefões como estão, menos a Torre (plano `plans/2026-11-27-hitbox-pelo-desenho.md`) |
| 3 | **Popular as fases:** mais inimigos (os enxames de batedores da F2 em diante) e mais vida para os inimigos comuns | ⏭️ **a próxima** (§3) — começar lendo o histórico dos enxames (21/11) e as leis dos inimigos |
| 4 | **O draft e os números das cartas:** mesas por fase, a rerrolagem, a quantidade; o número do Drone, do Elétrico, o peso das cadeias | ⬜ (§4) |
| 5 | **A passada geral dele pelas fases** (a vida dos chefões só se precisar) | ⬜ |

Depois: o commit do rebalanceamento → a calibragem do visual → o playtest de todas as fases → o placar → o deploy.
A hitbox antes de popular as fases foi recomendação minha (com mais inimigos e a colisão errada, não se sabe se a fase
está difícil pelos inimigos ou pela caixa); ele respondeu "ok" à lista.

## 1. As cartas — feito em 27/11 (commitado)

**As decisões dele:**
- **A raridade por IMPORTÂNCIA** (o §8 do documento dele: comum = melhoria básica, incomum = muda o comportamento do
  tiro, rara = forte ou combina, épica = transforma a build). *"Não quero que seja tão difícil assim tirar uma épica, a
  épica mostra a importância da carta. Não é um item colecionável"*. A troca de raridade já tinha sido combinada em
  21/11 (o plano de ataque, *"Perfeito"*) e deixada para agora.
- **O Casco:** *"com 3 ou 2 regens fica justo"* → o teto de 3 por fase.
- **O Drone: incomum** e ganha cadência (o número na etapa 4). Muda a decisão de 21/11 ("outro papel").
- **Mudar:** as duas saídas da análise de 21/11, *"Sim"*.

**O que entrou no código:**

| | O quê | Onde |
|---|---|---|
| Raridade | comum: Duplo, Cadência, Propulsores, Bomba Extra, Míssil, Flare · incomum: Triplo, Perfurante, Explosivo, Incendiário, Elétrico, Recarga, Casco, Vida Extra, Drone · rara: Explosão Maior, Fragmentado, Arco, Casco Reativo, Dash · **épica: Tiro Pesado** (a sem requisito), Combustão, Em Cadeia, Sobrecarga = 6·9·5·4 | `src/data/catalogoCartas.ts` |
| O Casco | absorve no máx. **3 golpes por fase** (`NUMEROS.casco.porFase`); a HUD mostra `CASCO 3/2/1`; a ficha "até 3 por fase" | `CartasEmJogo.ts`, `GameScene.ts` (HUD), `numerosCartas.ts` |
| TIRO MÚLTIPLO | o Triplo **exige o Duplo** (`requer`); Duplo + Triplo = 3 tiros; o `excluiSe` do Duplo saiu (contradizia) | `catalogoCartas.ts` |
| O Elétrico | depois da trava, o mesmo inimigo fica **1,2 s imune** (`NUMEROS.eletrico.imuneMs`), nem tiro nem arco; o arco pula o imune | `cartas/Eletrico.ts`, `EnemySystem.ts` (zera no nascimento) |
| A mão forte de dev | ganhou o Duplo (a arma é a mesma) | `src/dev/maos.ts` |

**A simulação do draft** (`sim-draft.mts`, 50.000 campanhas): veem ≥ 1 épica 74,8% (ao acaso) / 65,3% (a mais forte) —
antes 55%; o Triplo na mão no fim cai de 36% / 77% para 8% / 42%; o Núcleo de quem escolhe a mais forte, ×4,56 → ×3,45.
⚠️ A métrica "Triplo por cima do Duplo (pick gasto)" da simulação não vale mais: ela conta como desperdício o caminho
certo (Duplo → Triplo).

**Os testes:** `test-catalogo-cartas`, `test-numeros-cartas`, `test-sandbox-arvore`, `test-cartas-regras`,
`test-dev-atalhos`, o typecheck; em jogo, os novos `test-casco-teto-jogo` e `test-cartas-saidas-jogo`, e
`probe-cartas-novas` e `probe-cartas` — todos passando em 27/11.

**Fica para depois:** o número do Drone (a cadência), a medida do 1,2 s do Elétrico, o peso das cadeias (etapa 4); o
Elétrico nos ELITES — (a) só interrompe o tiro, ou (b) desfaz o escudo da Sentinela, a ideia de 05/10 — na passada dele.

## 2. As hitboxes — FEITO e APROVADO em 27/11 (commitado; o registro inteiro no plano `plans/2026-11-27-hitbox-pelo-desenho.md`)

**O que entrou:** `src/systems/colisao/` (a máscara pura + a parte do Phaser) e `GameScene.colisoesPeloDesenho`: fora das
lutas, a nave colide pelo CASCO (sem o fogo do motor, 2 px de perdão — ele jogou `?perdao=2`: *"Achei justo, está bem mais
preciso"*) contra o DESENHO dos inimigos, dos tiros, dos destroços (com a rotação) e do terreno; a borda da F4 e a caverna
mordem o casco em faixas (`cascoMorde`). **Durante uma luta de chefão ou do golfinho (`emLuta`), tudo como antes** (ele:
*"manter os chefões como estão… aplicar apenas onde a dificuldade vai ser de destreza"*) — **menos a TORRE (F1)**, que ele
pediu com os 2 px depois de jogar: o círculo do cometa foi para cima da bola (estava 3,8 px atrás) e fere o casco. Testes `test-mascara-pixel`,
`test-colisao-desenho-jogo`, `test-colisao-cenario-jogo`, `test-casco-morde-jogo`. ⚠️ `test-guardiao-lava-jogo` falha em
(60, 60) — JÁ falhava no código do commit `b16b2d34` (conferido com `git stash`), não é desta etapa.

### O registro de antes

**O que se sabe (lido no código e nos docs em 27/11):**
- **A nave: 21×9, fixa e centrada** (`GameScene.HITBOX_NAVE`, `setSize` no `create`). Nasceu em 27/09 como *"a do jato,
  com que F1/F2 foram validadas"*, fixa de propósito para a arte não mudar a dificuldade. As naves foram redesenhadas
  depois (23–25/10: menores, a Terminus, a X-Aelo, as pinturas) e ninguém conferiu a caixa contra o desenho novo. A
  queixa dele de 27/11 é o primeiro registro do problema. O GDD §3 previa *"hitbox mais generosa"* no flap — não existe
  no código.
- **Os inimigos:** 60% × 55% do quadro (`EnemySystem.ts`, no `spawn`). O batedor fino tem "avaliar a hitbox" anotado em
  19/10 e 15/11, nunca feito.
- **Os destroços/asteroides:** 70% × 70% (`DebrisSystem.ts`); as peças do terreno: 60% da largura × a altura inteira
  (`TerrainSystem.ts`); a caixa do Arcade NÃO gira (os asteroides giram até ±40°/s).
- **Os chefões** já acertam pelo desenho (a Besta pela máscara) ou por círculo (a cabeça da Serpente, 16,5 px).

**O caminho proposto:** a nave primeiro — cada nave e pintura de hoje com a caixa 21×9 desenhada por cima, ampliada, numa
folha; onde a caixa sobra (encosta e não toma dano) ou falta (toma sem encostar) → a correção dele.

## 3. Popular as fases (o que já está decidido)

- Os inimigos ganham vida ao longo da campanha (21/11); os batedores em **enxames que tomam a altura da tela**, da F2 em
  diante, para o jogador abrir a passagem atirando (21/11); *"desde o começo eu acho que existem poucos inimigos"*.
- As leis: a fila colada é de propósito (a reação em cadeia); pressionar sem punir (vão > tiro); o comportamento global
  do inimigo fica, muda a dose; o elite no fluxo; a F3 só com a lula.
- Em aberto: o que o chefão solta (os kamikazes da Capitânia, os drones do Núcleo) sobe de vida junto ou não.

## 4. O draft e os números (o que já está decidido)

- Mais mesas por campanha e a **rerrolagem** (21/11). O seu documento: 6–10 cartas por campanha (hoje no máx. 7 na
  humana, 8 na alien).
- Os efeitos contam contra chefão, **reduzidos** (21/11). As cadeias com peso maior para a continuação (a análise de
  21/11, ×3 por exemplo).
- A regra registrada: *"Número de carta: medir no sandbox antes de opinar"* (`?sandbox`, painel M).
- Os anotados: a recarga do Míssil (8 s / 5 s, o ×2 pode virar 2 cargas); a espera do Dash segura o Dash + Casco.

## As leis de sempre

- Commits só no nome dele, SEM Co-Authored-By; nunca empurrar para o `legacy`; só commitar/empurrar quando ele pedir.
- Não editar `src` nem `.html` enquanto ele joga ou filma. Conversa em pt-br; código, prompts e raciocínio em inglês.
- Cada passo: plano, folha e a aprovação dele. O robô aponta, ele decide.
