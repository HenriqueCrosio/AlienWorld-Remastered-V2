# F1 · Rodada 2 — a invasão ao longo da fase · plano e execução

> Executada em 20/10 com ele fora (*"avance com as fases e vá montando as folhas, assim que eu chegar verifico tudo"*).
> Por isso este documento junta o plano e o registro do que foi feito. Spec: `specs/2026-10-20-f1-cenario-design.md` §5.
> Folha: `folhas/2026-10-20/f1-cenario/rodada2.html`. Nada commitado.

**Goal:** a colônia cai na frente do jogador, pela LUZ, presa ao relógio da fase: as janelas apagam de fora para
dentro, o magenta acende onde o âmbar morreu, a defesa (holofotes e artilharia) luta e cai, naves invasoras descem, as
explosões ao longe (a folha da queda do Leviatã, reduzida) deixam fogo e fumaça, e a ponta da cidadela fica magenta
logo antes do chefão.

**Architecture:** as peças são assadas em pixel por `scripts/_g/_invasao-f1.mjs` (em `public/sprites/f1/`); o tempo de
tudo é função pura do relógio em `src/f1/ritmosF1.ts` (testado no Node por `scripts/test-f1-invasao.mjs`); os números
num endereço só (`INVASAO` em `src/f1/numerosF1.ts`); os objetos em `src/f1/invasao.ts`, montados pelo horizonte
(`src/f1/horizonte.ts`), que agora também apaga as janelas pela agenda e leva tudo à saída por um multiplicador.

## O que entrou

| Arquivo | O quê |
|---|---|
| `scripts/_g/_invasao-f1.mjs` | assa as naves invasoras (a canhoneira e o cargueiro da própria fase, reduzidos a 14 e 18 px, escurecidos, com um pixel de olho magenta), a explosão (a `f8-explosao-sheet.png` recortada e reduzida a 34×20, 24 quadros), a fumaça (8 quadros, 12×44), o fogo (6 quadros, 5×7), o traçante (5×1) e o flak (5 quadros, 7×7) |
| `src/f1/numerosF1.ts` | `PROF` com as profundidades da invasão; `INVASAO` com o centro, as janelas, o magenta, o topo, os holofotes, as armas, as rajadas, as naves, as explosões e o rastro |
| `src/f1/ritmosF1.ts` | `agendaDasLuzes`, `luzMorta`, `alfaMagenta`, `holofoteAceso`, `anguloDefesa`, `rajadasDaArma`, `tracantesEm`, `flakEm`, `posNave`, `lugaresDasExplosoes`, `explosaoEm`, `rastroEm` |
| `src/f1/invasao.ts` | os objetos da invasão e o `atualizar(t, dx, saida)` |
| `src/f1/horizonte.ts` | as 249 janelas apagando pela agenda (com a falha), os faróis morrendo com a região, o farol da ponta da cidadela morrendo aos 55 s (ali acende o magenta), a invasão, e o multiplicador `saida` |
| `src/Parallax.ts` | a saída leva o `horizonte.saida` a 0 num tween (as peças da invasão escrevem o próprio alfa a cada quadro) |
| `src/scenes/BootScene.ts` | as texturas e o `invasao.json` |
| `scripts/test-f1-invasao.mjs` | o relógio da invasão, 40+ checagens |
| `scripts/_g/_ver-f1.mjs` | o horizonte parado em qualquer instante, no jogo de verdade |

## O tempo (ver `INVASAO`)

| Tempo | O horizonte |
|---|---|
| 0–12 s | a colônia inteira acesa, os faróis piscando; os 3 holofotes varrendo as nuvens; rajadas de traçantes subindo de 3 pontos |
| 13 s | a 1ª nave invasora desce das nuvens (5 no total, a última aos 41 s), e some na névoa ao pousar |
| 14 s | a 1ª explosão ao longe (10 no total, a cada 4,5–5,5 s, até 59,5 s), com o clarão nas nuvens; cada uma deixa um fogo e, 1,4 s depois, uma coluna de fumaça |
| 16–58 s | as janelas apagam de fora para dentro (a cidadela por último), cada uma com a falha de 0,4 s antes; 1 a cada 4 ganha um magenta pulsando 1–4 s depois |
| 26 · 36 · 44 s | os holofotes apagam (com a falha); as armas param aos 27, 41 e 45 s |
| 55 s | a ponta da cidadela fica magenta |
| 63 s em diante | nada novo: o fogo, a fumaça e o magenta, quietos |

## Desvios da spec

1. **Sem a máscara das colinas.** As naves iam passar POR TRÁS das montanhas. O cume das colinas contra as nuvens,
   achado coluna a coluna a 1×, pulou entre pontos soltos: nesta pintura as nuvens e as colinas diferem por poucos
   níveis. As naves agora SOMEM NA NÉVOA ao pousar (o alfa cai nos últimos 35% da descida), o que lê como pousar lá
   longe. Se ele quiser a passagem por trás, a máscara precisa ser recortada à mão (como a do menu).
2. **A fumaça foi refeita duas vezes:** rala demais (lia como chiado), depois maciça demais (lia como pilar); ficou
   em três tons pela densidade, com o pontilhado só na franja, afinando no terço de cima.
3. **A última explosão foi para 59,5 s** (o teste pegou 3,5 s entre as duas últimas; a regra é um evento forte por vez,
   ≥ 4 s).

## Verificação

- `node scripts/test-f1-invasao.mjs` — TUDO OK; `node scripts/test-f1-ritmos.mjs` — TUDO OK.
- `npx tsc --noEmit` — limpo.
- Instantes no jogo: `node scripts/_g/_ver-f1.mjs <out> 5,14.3,20,30,42,56,66 --limpo`.

## Espera por ele

A folha `rodada2.html`: os vídeos (o cenário limpo, a fase com o jogo, a saída), os instantes, as peças e as decisões
(a quantidade de magenta, a força dos holofotes, se as naves somem na névoa ou se ele recorta as colinas à mão).
