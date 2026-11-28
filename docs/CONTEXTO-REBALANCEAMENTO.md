# CONTEXTO — o rebalanceamento (leia ANTES de propor qualquer coisa)

> Criado em 27/11 a pedido dele, depois de uma sessão em que propus coisas sem ler o histórico: *"Esse projeto tem meses,
> não horas"*; *"Não suponha nada, não invente nada, não seja meu puxa saco. Seja analítico"*. A porta de entrada da
> próxima sessão é o START `superpowers/plans/2026-11-27-rebalanceamento-etapas-START.md`; este arquivo é o mapa.

## 1. As leis de trabalho (a lição de 27/11)

1. **Antes de propor sobre um tema, ler o histórico inteiro dele:** o documento de ORIGEM dele (as cartas:
   `sistema_de_cartas_skills_shoot_em_up_v2.md` na raiz; o jogo: `docs/GDD.md`), as specs, os STARTs, as memórias e as
   transcrições (`~/.claude/projects/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/*.jsonl`; a do
   rebalanceamento de 21/11 é a `9b2bd212…`). Conferir o código de hoje.
2. **Análise minha não é decisão dele.** Toda afirmação com a fonte: medido / código / conta de papel / decisão dele.
   Número sem medida é marcado como meu. Nunca inventar alvos.
3. **Medir antes de mostrar, e conferir a medida contra outra independente.** Em 27/11 mostrei números errados porque
   `body.reset` deixa a caixa Arcade no canto do quadro até o próximo passo da física (use `updateFromGameObject()`), e o
   Arcade ARREDONDA a metade de um corpo circular (`halfWidth`).
4. **Rodar o barato antes de aplicar** (testes, `scripts/_rebalance/sim-draft.mts` em segundos) para ver efeito colateral.
5. **Ir de leve, uma mudança por vez.** Ele: *"O que temos hoje já é bom, não estou fazendo rebalanceamento porque está
   quebrado"*. Nada de medição grande sem ele pedir.
6. **O que ele aprovou não se mexe sem mostrar o registro e perguntar** (as lutas dos chefões, os corredores da F4).
7. As de sempre: commits só no nome dele, SEM Co-Authored-By; nunca empurrar para o `legacy`; não editar `src`/`.html`
   enquanto ele joga; conversa em pt-br, código e raciocínio em inglês.

## 2. A ordem do rebalanceamento (dele, 27/11)

1. ✅ **As cartas** (27/11): a raridade por IMPORTÂNCIA (6 comuns · 9 incomuns · 5 raras · 4 épicas; o Tiro Pesado é a
   épica sem requisito), o Casco com no máx. 3 golpes por fase, o Triplo exige o Duplo, o Elétrico 1,2 s imune depois da
   trava, o Drone incomum.
2. ✅ **As hitboxes** (27/11, ele aprovou jogando: *"Ficou bom assim"*): a nave colide pelo DESENHO do casco, 2 px de perdão,
   contra o desenho de inimigos, tiros, destroços e terreno; a borda da F4 e a caverna mordem o casco. **As lutas de chefão
   ficam como estavam** (`GameScene.emLuta`), **menos a Torre**, que ele pediu com os 2 px (o círculo do cometa foi para
   cima da bola).
3. ⏭️ **Popular as fases:** mais inimigos (enxames de batedores da F2 em diante, ocupando a altura da tela) e mais vida
   para os inimigos comuns. Em aberto: o que o chefão solta sobe de vida junto?
4. **O draft e os números das cartas:** mesas por fase, a rerrolagem, a quantidade; o número do Drone (a cadência), o
   1,2 s do Elétrico, o peso das cadeias — medidos no sandbox (`?sandbox`, painel M).
5. **A passada geral dele pelas fases** (a vida dos chefões só se precisar: a enguia dura ~33 s, o alvo da spec era 60–80).

## 3. Onde está cada coisa

| O quê | Onde |
|---|---|
| A ordem, o feito, o que vem | `superpowers/plans/2026-11-27-rebalanceamento-etapas-START.md` |
| A análise das cartas (21/11) e as decisões dele daquele dia | `superpowers/plans/2026-11-21-rebalanceamento-START.md` §1–§3 |
| A hitbox: o plano e o registro inteiro | `superpowers/plans/2026-11-27-hitbox-pelo-desenho.md` |
| A folha da hitbox (as naves, as opções, as medidas) | `superpowers/folhas/2026-11-27/hitbox/folha.html` |
| A medição das lutas (o "antes" dos chefões, 108 lutas) | `superpowers/folhas/2026-11-26/medicao/` · spec `specs/2026-11-26-medicao-das-lutas-design.md` |
| O código da colisão | `src/systems/colisao/` · `GameScene.colisoesPeloDesenho` / `emLuta` / `naveMorde` |
| Os números das cartas | `src/data/numerosCartas.ts` · o catálogo `src/data/catalogoCartas.ts` |
| As leis dos inimigos | memórias `elites-pressionam-sem-punir`, `inimigos-unidos-de-proposito`, `ataque-bullet-hell-geometrico`, `nada-atras-da-nave` |

## 4. Os testes desta frente (rodar com `npm run dev` no ar)

Puros: `test-catalogo-cartas`, `test-numeros-cartas`, `test-sandbox-arvore`, `test-cartas-regras`,
`node --experimental-transform-types scripts/test-mascara-pixel.mjs`, `test-dev-atalhos` (idem).
Em jogo (um navegador por vez): `test-casco-teto-jogo`, `test-cartas-saidas-jogo`, `test-colisao-desenho-jogo`,
`test-colisao-cenario-jogo`, `test-casco-morde-jogo`, `test-torre-cometa-jogo`.
⚠️ `test-guardiao-lava-jogo` falha em (60, 60) **desde antes** (conferido no commit `b16b2d34`): não é regressão.
