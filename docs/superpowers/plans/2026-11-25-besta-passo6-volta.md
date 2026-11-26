# A Besta refeita — passo 6: a volta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** na fase 2, a volta deixa de ser "sai pela direita e volta galopando". Numa corrida só, ela dá a volta na sala
pela borda real: o chão para a esquerda → a quina de baixo à esquerda → sobe a parede da esquerda → a quina de cima à
esquerda → atravessa o teto por troca de mão → a quina de cima à direita → desce a parede da direita → solta da parede,
pousa galopando e rasga o chão. Nas três quinas (BE, CE, CD) ela para e ataca para dentro da sala (spec
`specs/2026-11-24-besta-refeita-design.md` §4.2).

**Architecture:** um módulo PURO (`src/entities/besta/volta.ts`) monta a rota como uma lista de trechos: o clipe, o
tempo, a posição de entrada e de saída, o espelho, o sentido, a borda e se o core está exposto. As medidas vêm das junções
da arte, medidas no pixel. Ele é testado em Node. O `Predador` percorre os trechos um a um, com o mesmo motor de tween de
hoje. A escalada é assada no `besta_folhas.py` girando o rastejar 90°, e a parede da direita é o espelho. A tabela por
quadro ganha o lado do rabo por quadro, e o `Predador` passa a ler a tabela espelhada.

**Tech Stack:** TypeScript, Phaser 3.90, Vite; Python/PIL para a folha; testes puros com
`node --experimental-transform-types`; em jogo com Playwright.

## Global Constraints

- A spec (§4.2): **a borda real** — o chão, o teto e as paredes nas bordas da tela; ela nunca solta do mundo. **Nas três
  quinas** (baixo-esquerda, cima-esquerda, cima-direita) ela para ~0,5 s e ataca para dentro da sala (o ataque de canto,
  que fere quadro a quadro). **Na parede da esquerda ela é intocável**; no teto e na parede da direita leva tiro, com o
  core exposto. A borda onde ela está fere ao toque. Duração, ponto de partida ~6 s.
- O que o passo 3 já decidiu (`passo3b.html`): a escalada é o rastejar girado 90° e a parede da direita é o espelho; a
  quina de cima à direita é a `quina-parede-teto` espelhada e tocada ao contrário.
- A regra de setembro: o PixelLab faz o corpo, o código só leva por um caminho apoiado no mundo; nada desliza.
- O rabo é só visual (as caixas não o contam).
- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`); GIFs fora do git.

## As medidas da arte (conferidas no pixel, 25/11)

- **A pose na parede (QW)**, último quadro da `quina-chao-parede` e primeiro do `canto` e do fim do `parede-agarra`, é
  o **rastejar girado 90° para a direita e deslocado (4, 56) px** (bate em 99,8 % dos pixels). As garras encostam em
  x=4 do quadro.
- **O primeiro quadro da `quina-parede-teto` é a QW 66 px acima.** O último é a `teto1`, com a garra em y=3.
- **A garra da `teto1`** fica em x 69–97 do quadro; espelhada, em 158–186.
- **O primeiro quadro do `parede-descola` é a QW espelhada** (garras em x=251).

## As decisões MINHAS deste passo (marcar na folha e perguntar)

1. **A chegada:** a descida pela direita termina no `parede-descola` (já desenhado da QW espelhada para o voo, virada
   para a esquerda). O motor leva o voo até o chão, ela pousa galopando e rasga no meio da arena (`RASGO_X`), como o
   rasgo de hoje. A `quina-chao-parede` espelhada e ao contrário deixaria ela de costas para a nave, e não há clipe de
   virar de quatro.
2. **A virada no teto:** a quina da direita começa na `teto1` espelhada. Ao chegar no canto ela troca de lado, um corte
   de um quadro. Ela chega com 6 trocas de mão (na mão 1), e o motor corrige os 38 px que faltam até a parede durante a
   quina.
3. **Descer a parede da direita** é a escalada espelhada tocada ao contrário: ela desce de cabeça para cima, como o passo 3
   previu.
4. **Intocável na esquerda:** o core fica desligado da chegada à parede da esquerda até o fim da quina de cima à
   esquerda. Liga quando ela pendura no teto.
5. **O corpo fere em toda a volta** (o corpo inteiro, sem o rabo). No canto, as garras ferem quadro a quadro.
6. **Os tempos:** a primeira conta dá ~10 s, contra os ~6 s da spec. Os números ficam em botões, e a folha mostra a
   conta trecho a trecho.

## Task 1: a escalada e o rabo na tabela

**Files:** Modify `scripts/_f4/besta_folhas.py`; Generated `public/sprites/besta/escalada.png`,
`src/entities/besta/quadros.ts`.

- [ ] O clipe `escalada`: os 32 quadros do `rastejar2L-a` girados 90° para a direita.
- [ ] O rabo por quadro: `direita` (hoje); `baixo` nos quadros mais altos que largos dos clipes de parede (escalada,
  quinas, descola, agarra) e no `canto` inteiro. Com `baixo`, o corte do rabo é abaixo do tronco: no canto o braço que
  ataca a sala fica na caixa.
- [ ] Conferir no `besta_conferir.py`: a escalada, a QW, o canto no meio do golpe.

## Task 2: a rota pura

**Files:** Create `src/entities/besta/volta.ts`, `scripts/test-besta-volta.mjs`.

**Interfaces:**
- Produces: `VOLTA` (os tempos e as medidas), `type Borda = 'chao' | 'paredeE' | 'teto' | 'paredeD'`,
  `interface Trecho { nome: string; clipe: string; ms: number; de: {x,y}; ate: {x,y}; espelho: boolean; reverso: boolean;
  quadros?: number[]; borda: Borda; exposta: boolean; canto?: 'BE' | 'CE' | 'CD' }`, `rotaDaVolta(x0: number): Trecho[]`.
- [ ] O teste: ela começa no chão onde está e termina no chão em `RASGO_X`; cada trecho começa onde o anterior acabou;
  as garras ficam sempre na borda do trecho; a ordem é chão → paredeE → teto → paredeD → chão; os três cantos BE, CE e
  CD, nessa ordem; exposta só no teto e na parede da direita; as trocas do teto alternam a e b e terminam na mão 1; e
  imprime a duração total.

## Task 3: no Predador

**Files:** Modify `src/entities/Predador.ts`.

- [ ] Ler a tabela espelhada: com `flipX`, o core em `−(x−128)` e a caixa em `256 − x − w`.
- [ ] As anims novas: `besta-rastejar` (o laço), `besta-escalada`, `besta-quina-chao-parede`, `besta-quina-parede-teto`,
  `besta-canto`, `besta-parede-descola`.
- [ ] `volta()`: percorre `rotaDaVolta`. Cada trecho toca o clipe (espelhado e ao contrário quando pede), leva o sprite
  de `de` a `ate`, liga ou desliga o core, e o canto segura o primeiro quadro antes do golpe. No fim vem o `rasgar()` de
  hoje, e o 'volta' é marcado como visto. Pendurada, ela solta antes.
- [ ] A ordem: o `'volta'` chama `volta()` (sai o `sair` pela direita).
- [ ] `npx tsc --noEmit` limpo.

## Task 4: no jogo, filmado

**Files:** Create `scripts/_f4/_besta-volta.mjs`; Modify `scripts/_f4/_ver-besta-nova.mjs` (a cena `volta`).

- [ ] O teste em jogo: a volta inteira sem erro; ela nunca sai da tela; com o anel do core desligado ela não leva dano na
  parede da esquerda (o tiro direto no core); ela leva no teto e na parede da direita; a nave parada no canto de baixo à
  esquerda leva o golpe do canto; a trava da fase 2 abre no fim.
- [ ] O GIF na velocidade real, as caixas desenhadas, e a folha `besta-bio/passo6.html`.
- [ ] A §10 da spec e a memória.
