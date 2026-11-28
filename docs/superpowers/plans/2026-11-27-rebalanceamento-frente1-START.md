# START — O REBALANCEAMENTO, FRENTE 1: OS ALVOS

> ⚠️ **SUBSTITUÍDO em 27/11** pelo `plans/2026-11-27-rebalanceamento-etapas-START.md`. Ele simplificou: sem "alvos" nem
> medição nova; a ordem agora é cartas → hitboxes → popular as fases → o draft → a passada dele. A §0 (a tabela da
> folha-base e os 6 achados) e a §3 (as ferramentas e as leis dos robôs) seguem valendo como registro.

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A frente 0 do rebalanceamento (as lutas dos
> chefões) FECHOU em 26/11: a Capitânia, o Guardião na coleira, a Besta refeita e a MEDIÇÃO das lutas — dois robôs
> (o canhão e o piloto) mediram os 4 chefões com 3 mãos, e a folha-base está em `folhas/2026-11-26/medicao/folha.html`
> (+ `dados.json`). Agora é a FRENTE 1: decidir os ALVOS — quanto cada chefão deve durar e quanto pode custar — a
> partir da folha. Uma pergunta por vez, a recomendação primeiro."**
> Contexto maior: `plans/2026-11-21-rebalanceamento-START.md` (a análise das cartas §1, as decisões dele §2, a ordem
> das frentes §3). A medição: `specs/2026-11-26-medicao-das-lutas-design.md` (§9 = o registro inteiro).

## ▶️ Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status` (limpo, fora os vídeos, os GIFs, as pastas `q/` e as sobras de
   folhas antigas que nunca entraram). Lembrar o **Ctrl+Shift+R**.
2. Abrir com ele a folha-base: http://localhost:5173/docs/superpowers/folhas/2026-11-26/medicao/folha.html
3. Fazer a 1ª pergunta da §2 (a mão de referência POR CHEFÃO), com a recomendação.

## 0. Onde paramos (27/11)

**Feito de 24 a 26/11, tudo commitado e empurrado:**
- ~~A Besta refeita~~ ✅ (spec `specs/2026-11-24-besta-refeita-design.md`, 12 passos; as 3 rodadas dele jogando; as
  brasas falsas que estouram, o urro de morte, os sussurros; e o core atingível pela linha dele, a opção A, saída da
  medição).
- ~~A medição das lutas~~ ✅ (spec `specs/2026-11-26-medicao-das-lutas-design.md`): o registro `?registro`
  (`src/dev/registro/`), o canhão e o piloto (`scripts/_rebalance/robo/`), a régua na Capitânia, 108 lutas.
- ~~A medição do Guardião (`medir-guardiao.mjs`)~~ ✅ coberta pela medição de todos os chefões.
- ⏸️ O K sem cartas: em pausa (ele: só ajuda o desenvolvimento; o `?fase=guardiao1&mao=mediana` já cobre).

**A folha-base, o resumo** (vidas perdidas por luta; o experiente = piloto de 550 ms, a régua; o comum = 700 ms):

| Chefão | Mão | Canhão: o tempo | Experiente: vidas / mortes | Comum: vidas / mortes |
|---|---|---|---|---|
| Torre | sem cartas | 36 s | 0,7 / 0 | 0,7 / 0,3 |
| Torre | mediana | 15 s | 0 / 0 | 0 / 0 |
| Torre | forte | 5 s | 0 / 0 | 0 / 0 |
| Capitânia | sem cartas | 40 s | 15,7 / 5 | 16,7 / 5,3 |
| Capitânia | mediana | 15 s | 1,7 / 0,3 | 1,7 / 0 |
| Capitânia | forte | 4 s | 0 / 0 | 0 / 0 |
| Serpente | sem cartas | 93 s | 6 / 2 | 7,7 / 2 |
| Serpente | mediana | 54 s | 1,0 / 0 | 1,3 / 0 |
| Serpente | forte | 38 s | 0 / 0 | 0 / 0 |
| Guardião e Besta | sem cartas | 271 s | 24,3 / 7,7 | 31,7 / 10 |
| Guardião e Besta | mediana | 148 s | 2,3 / 0,7 | 4,3 / 1,0 |
| Guardião e Besta | forte | 71 s | 1,3 / 0 | 2,3 / 0,3 |

**Os achados que esperam a decisão dele** (o robô aponta, ele decide):
1. Sem cartas, nenhum chefão depois da Torre se vence (frente 2: quantas cartas a campanha garante).
2. Com a mediana, a curva sobe e desce: 0 → 1,7 → 1,0 → 2,3 (+0,7 morte). A Serpente sai mais fácil que a Capitânia.
3. Com a forte, a Torre e a Capitânia somem (4–5 s; a fúria nem acontece) — frente 4 (as cartas) e 5 (a vida).
4. A luta final mata o jogador bom em 2 de 3 lutas com a mediana (a lava e o corpo da Besta, os pulsos e a serra do
   Guardião).
5. A enguia tem um piso de ~29 s com qualquer mão; quase todos os golpes da Serpente vêm dela.
6. Ele (26/11): a fúria da Capitânia *"ainda está bem difícil... desviar de estilhaço de flak, projéteis, kamikaze"*.

## 1. ⚠️ O que a folha AINDA NÃO diz

A "mão mediana" é a MESMA nos 4 chefões (7 cartas). Numa campanha de verdade o jogador chega à Torre com ~1 carta e
ao Núcleo com ~6–7 (as mesas: o meio da F1, a Torre, o meio da F2, a Capitânia, a aranha, a Serpente, o Guardião). A
linha "mediana" da Torre e da Capitânia é, portanto, generosa demais. **A 1ª tarefa da frente 1 é a mão de
referência DE CADA CHEFÃO**: o que um jogador típico tem na mão ao chegar a ele, tirado da simulação do draft
(`scripts/_rebalance/sim-draft.mts`, 50.000 campanhas; ao acaso e escolhendo a mais forte) — e rodar os robôs de novo
com essas mãos.

## 2. A frente 1 — as perguntas, nesta ordem (uma por vez)

1. **A mão de referência por chefão** (a §1): a mediana do sorteio ao acaso, a do "escolhe a mais forte", ou as duas
   (o piso e o teto)? Recomendação: as duas, por chefão — a faixa que um jogador real ocupa.
2. **O alvo de TEMPO** de cada chefão com a mão de referência (o canhão dá o mínimo, o experiente o real). Ex.: a Torre
   30–40 s, a Capitânia 45–60 s, a Serpente 60–80 s, a luta final 2–3 min — os números são dele.
3. **O alvo de CUSTO**: quantas vidas o experiente e o comum podem perder em cada um (a curva F1 → F4), e se o
   comum pode morrer na luta final.
4. **O que fazer com cada achado da §0** — depois dos alvos, a tabela diz o que está fora e quanto; cada mudança de
   luta segue a regra: plano, folha, a aprovação dele.

Depois da frente 1: a 2 (o draft), a 3 (os inimigos), a 4 (as cartas), a 5 (a vida dos chefões e ele jogando tudo).

## 3. As ferramentas

| O quê | Como |
|---|---|
| O registro da luta (dev) | `?registro` na URL; `window.__registro.resumo()` |
| Entrar direto numa luta | `?fase=torre1 · capitania1 · serpenteA · guardiao1 &mao=nenhuma · mediana · forte` (ou a do sandbox) |
| O canhão | `node scripts/_rebalance/robo/canhao.mjs --porta 5174 --chefe torre\|capitania\|serpente\|guardiao --mao … --saida x.json` |
| O piloto | `… piloto.mjs --porta 5174 --chefe … --mao … [--reacao 550\|700] [--fotos dir] --saida x.json` |
| Juntar | `node scripts/_rebalance/robo/juntar.mjs <dir…>` |
| A folha | `node scripts/_rebalance/robo/folha.mjs --saida … --chefe "Nome=dir" … --fotos "Nome=dir" --notas notas.html` |
| O sorteio do draft | `node --experimental-transform-types scripts/_rebalance/sim-draft.mts` |

**As leis dos robôs** (aprendidas a custo, memória `medicao-lutas-robos`):
- Rodar numa CÓPIA do jogo na porta 5174 (`src`, `index.html`, `tsconfig.json`, `vite.config.ts`, `package.json`
  copiados; `public` e `node_modules` por junção; os scripts dos robôs copiados para dentro dela, CONGELADOS). Editar
  `src/` recarrega o Vite e mata as lutas em curso.
- **Um robô por vez:** cada um ocupa 2–2,6 GB de RAM (Chrome sem placa, SwiftShader); a máquina tem 15,5 GB e o resto
  já usa ~8. Três de uma vez esgotaram a memória e o Claude Code encerrou os servidores.
- O TaskStop não mata o `xargs` nem os filhos no Windows: matar `xargs.exe`, os `node … robo/…` e os
  `chrome-headless-shell` à mão. Lotes com `[ -f saida.json ] || …` para retomar sem refazer.
- 3 lutas por combinação no mínimo: a mesma luta varia muito (a Capitânia mediana deu de 1 a 3 vidas).
- Os limites conhecidos do piloto: enxerga no breu (decisão dele); não prevê o corpo da enguia nem as bordas que
  mordem (só vê onde estão); o flap simplificado; só a luta do chefão, sem a fase antes.

## As leis de sempre

- Commits só no nome dele, SEM Co-Authored-By; nunca empurrar para o `legacy`; só commitar/empurrar quando ele pedir.
- GIFs, vídeos, `q/` e `cru/` fora do git; folhas só com o que mostram (PNG grande vira JPEG).
- Não editar `src` nem `.html` enquanto ele joga ou filma.
- Conversa em pt-br; código, prompts e raciocínio em inglês.
- Cada passo: plano, folha e a aprovação dele. O robô aponta, ele decide.
