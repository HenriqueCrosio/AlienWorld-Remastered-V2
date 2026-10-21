# F1 · Rodada 4 — o chefão, as explosões e a subida · plano e execução

> Executada em 20/10 com ele fora (*"avance com as fases e vá montando as folhas"*). Spec:
> `specs/2026-10-20-f1-cenario-design.md` §7. Folha: `folhas/2026-10-20/f1-cenario/rodada4.html`. Nada commitado.
> (A rodada 3, as peças do chão, é de CONCEITOS: a instalação espera a escolha dele; esta rodada não depende dela.)

**Goal:** a Torre de Defesa ganha as plumas dos propulsores, a poeira da queda do Leviatã quando se arranca do chão e a
explosão da queda no lugar da fumaça em bolinhas (o item 9 na F1); na subida para o zero-G a nave fica a 45°, bico
para cima.

## O que entrou

| Arquivo | O quê |
|---|---|
| `scripts/_g/_chefe-f1.mjs` | assa as plumas em TRÊS tamanhos (14×34, 20×46, 26×58 — um por bocal; pixel art não se amplia), 6 quadros cada: branca na boca → âmbar → vermelha, borda irregular linha a linha, línguas de fogo de 1 px e vapor frio em rolos no fim; e a explosão da queda do Leviatã reduzida a 150×90 (24 quadros) |
| `src/f1/chefeF1.ts` | `montarPlumas(scene, sprite)` (as plumas presas aos 3 bocais acesos da arte no ar, medidos em 20/10: (60,166) inclinado 18°, (87,175), (127,176); o quarto fica escondido) e `explosaoDaQueda(scene, x, yBase, depth)` |
| `src/entities/Boss.ts` | as plumas nascem com a arte do ar (`swapToAirArt`), fortes na decolagem, respirando no voo, seguindo o sprite até a morte; a poeira da queda nasce atrás da base no começo da decolagem (`blowUpBase`) |
| `src/scenes/GameScene.ts` | na F1, o estouro final da morte é a explosão da queda + `fx.abaloGrande` (o mesmo tremor, fagulhas e flash do `explodeBig`); as outras fases seguem com a sheet de sempre até o bloco I. A SUBIDA: `SUBIDA_ANGULO = −45`, `SUBIDA_ENTRA_MS = 400`, travada do `breakAtmosphere` à vitória; o controle continua na mão dele |
| `src/systems/Fx.ts` | `abaloGrande(x, y, escala)`: o peso do `explodeBig` sem a sheet |
| `src/scenes/BootScene.ts` | as plumas, a explosão do chefe e o `chefe.json` |
| `scripts/_g/_filmar-chefe-f1.mjs` | filma a luta num relógio a passos: o treino, metade da vida (a decolagem), 5 s de voo, a morte e a subida |

## Desvios e achados

1. **A pluma foi refeita duas vezes:** o 1º desenho era um triângulo de lados retos (lia como cone desenhado); depois
   ficou estreita demais para o bocal grande (12 px contra ~27 na tela) — viraram três tamanhos.
2. **O flash magenta da decolagem ficou como estava:** no vídeo ele não apaga a cadeia de estouros. A regra dos
   flashes de tela cheia segue para o J.
3. **No treino, a mesa de cartas do meio da fase abre logo de cara e pausa o jogo** (a mesa vive na camada HD). A
   filmagem escolhe a primeira carta por código. Por isso a sonda velha `probe-chefao-arte.mjs` (sem esse passo) para
   antes do chefão — é do protótipo das cartas, não desta rodada.

## Verificação

- `npx tsc --noEmit` limpo; `scripts/_g/_probe-f1.mjs` TUDO OK (com as checagens da invasão);
  `test-f1-ritmos`, `test-f1-invasao`, `test-menu-ritmos`, `test-atmosfera-perfis` OK; `probe-menu` OK;
  `probe-stage4` (a F4 de ponta a ponta) OK.
- A luta filmada: `node scripts/_g/_filmar-chefe-f1.mjs docs/superpowers/folhas/2026-10-20/f1-cenario/rodada4`.

## Espera por ele

O tamanho e a força das plumas; o tamanho e a duração da explosão da morte; o ângulo e a entrada da subida.
