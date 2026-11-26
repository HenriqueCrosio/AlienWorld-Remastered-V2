# A Besta refeita — passo 5: a sede — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** na fase 1 (100–66 %), a Besta planta no chão, vira de frente, abre o peito e o core acende um anel. Por 2,0 s
todo tiro do jogador que entra no anel some nele, sem dano, e o core toma a cor da arma. No tranco ela devolve cada tiro
pela mesma linha, ao contrário, na ordem em que entraram, em ~0,6 s. A fase 1 fica travada em 66 % até uma sede com
devolução (spec `specs/2026-11-24-besta-refeita-design.md` §3 e §4.1).

**Architecture:** um módulo PURO (`src/entities/besta/sede.ts`) com as regras da devolução: a linha, a ordem, o tempo
comprimido, o agrupamento por linha e o teto de 24. Ele é testado em Node. O `Predador` ganha o estado `sede`, com a
sequência dos clipes, o anel, o beber e o tranco. O `BossNucleo` repassa `beber(bala)`. A `GameScene` consulta o beber
antes de qualquer acerto no chefão (os overlaps rodam ANTES do `update` da cena) e também a cada quadro, para os tiros
que entram no anel sem tocar o corpo.

**Tech Stack:** TypeScript, Phaser 3.90 (Arcade), Vite; testes puros com `node --experimental-transform-types`; em jogo
e o filme com Playwright.

## Global Constraints

- A spec (§4.1): plantada numa âncora do chão; o anel aberto **2,0 s**; o tiro que entra no anel **some, sem dano**; o
  core toma **a cor da arma**; cada tiro guarda **a linha por onde chegou**; no tranco volta **pela mesma linha, ao
  contrário, na ordem em que entraram, em ~0,6 s**; **no máximo 24** devolvidos, **agrupados por linha (< 4 px viram
  um)**, o resto se apaga no core; projétil de carta volta como tiro comum dela; o míssil é bebido como tiro e volta
  reto; a bomba limpa a devolução como qualquer tiro inimigo.
- A trava (§3): a fase 1 não passa de 66 % antes de **uma sede com devolução**.
- Os clipes são os que ele escolheu: **sede-abre3-a** e **sede-devolve-b** (com o clarão). Os dois são DE FRENTE, então
  ela vira (o `vira` ao contrário) antes de abrir e volta ao perfil depois.
- Os sons novos são do passo 10: aqui só reaproveito os existentes.
- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`); GIFs fora do git.

## As decisões MINHAS deste passo (marcar na folha e perguntar)

1. **O agrupamento.** Li o "< 4 px viram um" ao longo de cada linha. Dois devolvidos na mesma linha (mesma direção,
   a < 4 px de lado) que sairiam a < 4 px um do outro viram um. Assim a HMG parada ainda devolve **uma parede**, um trem
   de tiros naquela altura. Se cada linha virasse um tiro só, ela devolveria um tiro.
2. **O teto de 24.** Quando sobra mais de 24, fica um subconjunto espaçado por igual, que guarda o primeiro e o último
   de cada linha.
3. **A velocidade da volta:** 240 px/s, igual para toda arma. Devolvido na velocidade do tiro dele (até 500), não dá
   para sair da altura.
4. **O tiro devolvido** é a gota de lava dela (reta, sem gravidade), com a luz na cor da arma bebida.
5. **O anel:** raio 18 px, 2 px de espessura, assado em pixel e aditivo. Abre em 150 ms e fecha junto com o peito.
6. **A trava conta a sede no tranco**, mesmo sem nada bebido. Senão quem não atira nela ficava travado para sempre.
7. **Os tempos:** vira 450 ms, abrir 400 ms (quadros 0–5), aberta 2,0 s (quadros 5–12 indo e voltando), fechar 250 ms
   (13–16), devolver 1100 ms (o tranco no quadro 4), vira 450 ms e a recuperação de 0,6 s com o dano em dobro.

## Task 1: as regras puras da devolução

**Files:** Create `src/entities/besta/sede.ts`, `scripts/test-besta-sede.mjs`.

**Interfaces:**
- Produces: `SEDE` (`ABERTA_S 2.0`, `DEVOLVE_S 0.6`, `TETO 24`, `JUNTA_PX 4`, `V 240`, `RAIO 18`);
  `interface Bebido { x: number; y: number; dx: number; dy: number; t: number; cor: number }`;
  `interface Devolvido { x: number; y: number; vx: number; vy: number; t: number; cor: number }`;
  `devolucao(bebidos: Bebido[]): Devolvido[]`, ordenado por `t`.

- [ ] O teste: a linha volta ao contrário; a ordem de entrada se mantém; o tempo comprimido vai de 0 a 0,6 s; a HMG
  parada (36 tiros a 18/s na mesma linha) vira uma parede (todos na mesma altura, ≤ 24, a ≥ 4 px um do outro); o
  dispersor (3 linhas em leque) volta como 3 linhas; duas linhas paralelas a 3 px viram uma e a 5 px ficam duas; o teto
  de 24 guarda o primeiro e o último; um tiro só volta em t = 0; a lista vazia não devolve nada.
- [ ] O módulo, até o teste passar.

## Task 2: a sede no Predador

**Files:** Modify `src/entities/Predador.ts`, `src/entities/BossNucleo.ts`, `src/scenes/GameScene.ts`,
`scripts/_f4/besta_folhas.py` (se a tabela do core tiver pulos nos quadros da sede).

- [ ] Conferir o core da tabela nos quadros da sede (`besta_conferir.py`). Nos quadros 15–16 do abrir e 11 do
  devolver ele pula: interpolar os vizinhos no `besta_folhas.py` e gerar de novo.
- [ ] O estado `sede`, as anims `besta-sede-abre`, `besta-sede-aberta` (5–12 em vai e volta, em laço),
  `besta-sede-fecha`, `besta-sede-devolve` e `besta-desvira` (o `vira` ao contrário). A sequência: pendurada, solta antes
  (como o golpe); vira de frente → abre → anel aberto 2,0 s → fecha → devolve (o tranco solta `devolucao`, agendada no
  tempo de cada um) → vira de perfil → `recupera` 0,6 s → `depoisDoAtaque`.
- [ ] O anel: a textura `sedeAnel` (círculo de pixels, raio 18, 2 px), aditiva, presa ao core. Ela cresce ao abrir, pulsa
  e some ao fechar.
- [ ] `beber(bala)`: com o anel aberto, uma bala a ≤ `RAIO` do core vira `Bebido` (a posição, a direção da velocidade, o
  tempo, a cor); devolve `true`. A cor sai do tint da bala, ou do `glowKind` (quente 0xffa040, ciano 0x5ee8ff, sem halo
  0x5ef2d8). O core (a luz) vai do laranja até a cor média do que bebeu, cheio a partir de 10 tiros. Cada gole acende
  uma faísca curta no anel.
- [ ] O tranco: cada `Devolvido` sai como `lancarLava(x, y, vx, vy, 'gota')` no seu `t`, com a luz tingida. O tremor da
  câmera; o som `predador.lava.arremesso` provisório.
- [ ] A ordem e a trava: `'sede'` entra em `ASSINATURAS_PRONTAS`; o piso da fase 1 = `HP × 0,661` enquanto `'sede'` não
  foi vista; com a trava, a próxima jogada é a sede; o tranco marca `vistas.add('sede')`; `devProximaFase` da fase 1 marca
  também.
- [ ] `BossNucleo.beber(b)` repassa ao predador. `GameScene`: `bulletHitBoss` e `bulletAbsorvedByBoss` começam por
  `if (this.boss.beber?.(bullet)) { this.weapons.release(bullet); return; }`. No `update`, cada bala ativa passa pelo
  `beber` (`beberTiros`).
- [ ] `npx tsc --noEmit` limpo.

## Task 3: no jogo, filmado

**Files:** Create `scripts/_f4/_besta-sede.mjs`; Modify `scripts/_f4/_ver-besta-nova.mjs` (a cena `sede`).

- [ ] O teste em jogo (`?fase=besta1&mao=nenhuma`, a nave invulnerável e parada, atirando): com a base, a HMG e o
  dispersor. Conferir: a vida não muda com o anel aberto; os bebidos somem; os devolvidos ≤ 24; os da base e da HMG
  voltam na altura da nave; o dispersor volta em leque; a bomba no meio da devolução limpa tudo. A trava: um `damage(100)`
  com a vida cheia para em 66,1 %, e a próxima é a sede; depois do tranco o tiro passa. E nenhum erro no console.
- [ ] Os GIFs na velocidade real (`_gif-jogo.py`) e a folha `besta-bio/passo5.html`, com as decisões acima para ele.
- [ ] A §10 da spec e a memória.
