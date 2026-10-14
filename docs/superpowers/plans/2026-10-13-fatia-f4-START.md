# START — FRENTE B, fatia F4: a Larva e o Tubo NO JOGO, à espera do teste dele (depois de 13/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `docs/superpowers/plans/2026-10-13-fatia-f4-START.md`.
> A Larva e o Tubo estão no jogo — eu testei no sandbox e na F4, e isto é o que achei: …"*

## 1. 📍 O PONTO MARCADO

- **A F4 tem arte, gestos e código.** Ele escolheu nas folhas e nos GIFs encenados e ficou com **as duas variações de
  cada elite** (Larva A e D, Tubo C e D); o plano `plans/2026-10-13-frente-b-fatia-f4.md` (9 tarefas) foi executado
  no mesmo dia. A spec ganhou o **§8** com as decisões de 13/10.
- **Ele ainda NÃO viu em jogo.** Esperam por ele os 4 GIFs (`folhas/2026-10-13/elites/f4/jogo-larva-camara-a.gif`,
  `jogo-larva-duto.gif`, `jogo-tubo-camara-a.gif`, `jogo-tubos-aperto.gif`), o sandbox (`?sandbox`, fase 4: `larva`,
  `tubo`, `mosca`) e a F4 inteira.
- **Nada commitado.** Commit só quando ele pedir, só no nome dele; push só quando pedir; nunca para `legacy`. As
  mensagens estão prontas no fim de cada tarefa do plano. Os `concept art*.png` da raiz não entram.

### Para retomar

1. `npm run dev` → **http://localhost:5173** (o jogo) e **http://localhost:5173/?sandbox** (o sandbox; fase 4, com
   `larva`, `tubo` e `mosca` na lista de inimigos). É o único servidor do projeto.
2. Mostrar (ou reabrir) os 4 GIFs em jogo e ouvir o que ele achou — as perguntas estão no §3.
3. **O que está na árvore sem commit** (13/10, `feat/cartas-preview`, em cima de `df7e873`):
   - código: `src/elitesRegras.ts`, `src/data/numerosElites.ts`, `src/entities/elites/{tipos,Larva,Buraco,Pupa,Tubo}.ts`,
     `src/systems/{EnemySystem,Moldura,PadroesDeTiro,StageDirector}.ts`, `src/Parallax.ts`,
     `src/scenes/{BootScene,GameScene}.ts`, `src/sandbox/config.ts`;
   - arte: 201 PNGs `public/sprites/elite-{larva,tubo,buraco,pupa,mosca}-*` + `public/sprites/tiros/elite-anel.png`;
   - scripts: `scripts/test-elites-regras.mjs`, `scripts/probe-elites-f4.mjs`,
     `scripts/_elites/{_gerar,_fundos,_folha,_base,_gif,_mao,_instalar}-f4.mjs` e `_gif-f4-jogo.mjs`;
   - docs: `docs/HANDOFF.md`, a spec da fatia (§8), a nota na spec-mãe, o plano e os dois START (12 e 13/10), e
     `docs/superpowers/folhas/2026-10-13/`.
   ⚠️ Os 4 `jogo-*.gif` pesam de 31 a 44 MB cada (~146 MB): perguntar a ele se entram no commit, se ficam de fora ou
   se são regravados menores (zoom 1 ou menos segundos no `_gif-f4-jogo.mjs`).

## 2. O que está no jogo

| Peça | Onde | O que faz |
|---|---|---|
| **Larva Mecânica** (12 de vida, 350) | `src/entities/elites/Larva.ts` | um buraco abre (0,5s, o aviso) → ela sai → põe 2 pupas → tranco → (3 paradas, em ziguezague, dentro do vão) → perfura → mergulha. Saiu viva: sem pontos |
| O buraco | `Buraco.ts` | quadros assados, vida própria; fecha e deixa a cicatriz (~1s); anda com a pintura; na frente do cenário de fundo |
| **Pupa** (1 de vida, 20) e **mosca** (1 de vida, 30) | `Pupa.ts` | a pupa voa 50px, para, pulsa e eclode em 2s; atirada, some sem estouro. A mosca persegue mais lenta que o kamikaze e, se erra, sai da tela |
| **Tubo Pulsante** (10 de vida, 300) | `Tubo.ts` | espera fora da tela um lugar entre duas mesas → rola preso à parede (chão ou teto) → incha 0,6s → pulsa um meio-anel (7 tiros, depois 6 defasados) |
| O roteiro | `StageDirector.ts` (`STAGE_4`) | Tubo t=10 · Larva t=21 · Tubos t=57,5 (chão) e 60,5 (teto) · Larvas t=75 e t=97,5 — cada um no lugar de uma onda |
| As variações | `varianteDe` | alternam pela ordem de nascimento: Larva A, D, A; Tubo C, D, C |

Regras puras em `src/elitesRegras.ts`, números em `src/data/numerosElites.ts` (`larva`, `buraco`, `pupa`, `mosca`,
`tubo`). Arte: `node scripts/_elites/_instalar-f4.mjs` (gestos crus + as peças à mão de `_mao-f4.mjs`).

## 3. As perguntas que só ele responde jogando — e o knob de cada uma

| A pergunta | Os knobs (`numerosElites.ts`, salvo indicação) |
|---|---|
| O anel do Tubo é tiro demais no meio da fase? (ele: *"vamos ter que testar"*) | `tubo.tirosN` (7), `tubo.pulsos` (2), `tubo.velTiro` (70), `tubo.pulsoX` ([310, 190]) |
| O tiro rente à parede fica para trás do Tubo (70 px/s contra os 84 da parede) — incomoda? | `tubo.velTiro` acima de 84, ou o anel sem os dois tiros rentes (`tuboAngulos`) |
| 2 pupas × 3 paradas = 6 moscas é muito? | `larva.pupasPorParada`, `larva.paradas`, `pupa.eclodeS` (2,0), `mosca.perseguicao` (110), `mosca.velMax` (120) |
| Os dois sozinhos na 1ª câmara leem bem? As 6 entradas estão nos lugares certos? | os `t` do `STAGE_4` (a tabela da Task 8 do plano) |
| O buraco na frente do cenário convence? (uma costela pode deslizar por trás dele) | `DEPTH` em `Buraco.ts` (−0,7; colado na pintura era −95,9 e o cenário o tapava no duto) |
| O tranco de 0,35s é rápido demais para o gesto se ler? | `larva.trancoS` |
| As peças à mão (buraco, cicatriz, pupa, mosca, tiro do anel) | são RASCUNHO: `scripts/_elites/_mao-f4.mjs` → `_instalar-f4.mjs` |

## 4. Como se confere (com `npm run dev` rodando)

- `node scripts/test-elites-regras.mjs` → `TUDO OK`
- `node scripts/probe-elites-f4.mjs` → 25 linhas `OK` (lê os pontos em `s.score`: o `totalScore()` soma 10/s de relógio)
- `node scripts/probe-elites.mjs`, `probe-elites-f3.mjs`, `probe-stage4.mjs`, `probe-f4-esfincter.mjs` → verdes
- ⚠️ `probe-f4-moldura.mjs` e `probe-f4-golfinho.mjs` **já quebravam antes da F4** (`…reading 'props'`,
  `s.spawnGolfinho is not a function`): chamam API que mudou. Não são régua até alguém consertá-las.
- GIF em jogo: `node scripts/_elites/_gif-f4-jogo.mjs <out.gif> <larva|tubo|tubos> <t> [segundos] [zoom]`

## 5. Anotado — para depois

- Fechar a F4: ele aprova a arte e o comportamento, e a F4 passa no jogo dele. Depois: a frente C (a calibragem).
- Ele ainda joga a F3 inteira (a lula no ato 1; o ato 2 sem elite), sem pressa.
- O clipe `idle` da Larva (gerado, não usado); os takes não escolhidos estão em `folhas/2026-10-13/elites/f4/anim/`.
- O tranco do Tiro Pesado não desloca a pupa nem o Tubo (a posição deles sai da origem e da parede).
