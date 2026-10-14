# START — FRENTE B, fatia F4: a rodada de 14/10 NO JOGO, à espera do teste dele (depois de 14/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `docs/superpowers/plans/2026-10-14-f4-rodada-START.md`.
> A rodada dos esporos está no jogo — eu testei, e isto é o que achei: …"*

## 1. 📍 O PONTO MARCADO

- **A rodada de 14/10 está no jogo.** Ele testou a F4 de 13/10 e pediu a rodada nova (a spec F4 §9); o plano
  `plans/2026-10-14-f4-rodada-esporos.md` (9 tarefas) foi escrito e executado no mesmo dia. Os desvios da execução estão
  no topo do plano.
- **Ele viu os GIFs e calibrou (14/10, mesma sessão):** a lentidão em 60% (*"punitiva"*) e a soltura dos esporos
  orgânica, desorganizada e para cima (um desenho dele: a nuvem espalhada acima da boca). Aplicado; os GIFs do Tubo
  com a nuvem nova são `folhas/2026-10-14/f4/jogo-tubo-camara-a-nuvem.gif` e `jogo-tubos-aperto-nuvem.gif` (os sem
  `-nuvem` mostram o arco antigo). Os da Larva (`jogo-larva-camara-a.gif`, `jogo-larva-duto.gif`) seguem valendo.
  Falta ele jogar: o sandbox (`?sandbox`, fase 4: `larva`, `tubo`, `mosca`) e a F4 inteira.
- **Decisão minha, para ele confirmar jogando:** a lentidão NÃO freia o Dash (é a saída), e durante o Dash o esporo
  não pega.
- **COMMITADO E EMPURRADO em 14/10** (ele: *"Está bom assim, pode commitar e dar push"*), em 3 commits sobre `df7e873`
  em `feat/cartas-preview` → `origin`: `31b8fac` (o código e os sprites), `1f8fbfa` (o pipeline de arte e as folhas),
  `e697868` (os docs). Ficaram FORA, no disco: os `jogo-*.gif` de 13 e 14/10 (~200 MB, para o repositório de backup,
  no final) e os `concept art*.png` da raiz. Commit só quando ele pedir, só no nome dele; nunca para `legacy`.

### Para retomar

1. `npm run dev` → **http://localhost:5173** (o jogo) e **http://localhost:5173/?sandbox** (fase 4).
2. Mostrar os 4 GIFs e ouvir o que ele achou — as perguntas estão no §3.
3. **O que esta rodada mexeu** (commitado em 14/10; a lista do de 13/10 está no START de 13/10):
   - código: `src/elitesRegras.ts`, `src/data/numerosElites.ts`, `src/entities/elites/{Esporos (novo),tipos,Larva,Buraco,Pupa,Tubo}.ts`,
     `src/systems/{EnemySystem,Moldura,CartasEmJogo}.ts`, `src/systems/cartas/Dash.ts`, `src/scenes/{BootScene,GameScene}.ts`;
   - arte: `public/sprites/elite-pupa-{0,1}.png` (a P1), `elite-esporo.png` (o G4), `elite-esporo-grao.png`,
     `elite-tubo-pe-{a,b}.png`; saiu `public/sprites/tiros/elite-anel.png` (nunca commitado; cópia no scratchpad da sessão);
   - scripts: `scripts/test-elites-regras.mjs`, `scripts/probe-elites-f4.mjs`,
     `scripts/_elites/{_mao-f4b,_folha-f4b,_instalar-f4b (novo),_instalar-f4,_gerar-f4}.mjs`;
   - docs: `docs/HANDOFF.md`, `docs/GDD.md` (§4, o modo competitivo), a spec F4 (§9), o plano e este START, e
     `docs/superpowers/folhas/2026-10-14/` (candidatas, triagem, as 4 folhas e os 4 GIFs).

## 2. O que mudou no jogo

| Peça | Onde | O que faz agora |
|---|---|---|
| **Tubo de esporos** | `Tubo.ts`, `Esporos.ts`, `esporosDoPulso` | incha → pulsa uma **NUVEM de 6 esporos** (nos dois pulsos; calibragem dele de 14/10, o desenho: *"mais orgânica e desorganizada … e para cima"*): cada um num rumo sorteado dentro de um cone de ±60° para dentro do corredor, com velocidade (30–105 px/s) e freada (0,7–1,3s) próprias, e o sopro se espalha por 0,3s. Param de rente à boca a ~70px dela, depois andam com a parede pairando e **subindo devagar** (5 px/s); somem nos últimos 0,5s dos 3,5s. **Não fere**; o tiro o atravessa |
| **A lentidão** | `GameScene.tocarEsporo`, `CartasEmJogo.tick` | encostar num esporo: a nave voa a **40% do teto por 2,5s** (60% mais lenta — *"punitiva"*, calibragem dele de 14/10); outro toque renova (não soma). Três grãos verdes giram na nave enquanto dura (nunca `setTint`). O Dash avança livre dela |
| **O pé de raízes** | `Tubo.ts` (`pe`), arte em `_mao-f4b.mjs` → `peDoTubo` | o Tubo afunda **5px** e ganha um pé à mão (52×11) na frente dele: a gola cobre o pé reto e as raízes descem para dentro da borda, com a cor da placa (um para as costelas azuis, um para o resto) |
| **O buraco da Larva** | `GameScene.lugaresDeBuraco`, `Buraco.ts` | só abre na face da **borda** (chão e teto, colunas 280–360 sem mesa na frente) ou de uma **mesa** da metade direita. Nunca na pintura. Anda com a superfície |
| **A Larva** | `Larva.ts` | sai do buraco → **tranco até o 1º posto** → 3 paradas (as de antes) → **tranco até a superfície mais perto** → perfura e mergulha ali. ~5,4s à vista |
| **A pupa P1** | `Pupa.ts` | a crisálida em anéis (7×12); **treme ±1px** nos últimos 0,6s, cada vez mais rápido |
| **A mosca** | `Pupa.ts` | nasce num **rumo sorteado** e persegue com um **tremor lateral**, cada uma no seu ritmo |
| Correção de quebra | `CartasEmJogo.tick` | com os Propulsores, o teto deles prendia o Dash já no 2º quadro; agora o Dash manda no teto enquanto avança |

## 3. As perguntas que só ele responde jogando — e o knob de cada uma

| A pergunta | Os knobs (`numerosElites.ts`) |
|---|---|
| A lentidão pesa o certo? (60% por 2,5s) | `lentidao.velocidade` (0,4), `lentidao.duracaoS` (2,5) |
| A nuvem é densa demais, alta demais, ou fica tempo demais no ar? | `tubo.esporosN` (6), `tubo.pulsos` (2), `esporo.coneGraus` (60), `esporo.vel` ([30, 105]), `esporo.freiaS` ([0,7; 1,3]), `esporo.soproS` (0,3), `esporo.sobe` (5), `esporo.vidaS` (3,5) |
| O balanço lê como "pairando"? | `esporo.balancoPx` (1,5), `esporo.balancoS` ([1,2; 2,0]) |
| O Dash livre da lentidão está certo? (a decisão minha) | `CartasEmJogo.tick` (`!this.dash.avancando`) e `GameScene.tocarEsporo` (`intocavel`) |
| O tremor da pupa avisa a tempo? | `pupa.tremeS` (0,6), `pupa.tremePassoS` ([0,1; 0,03]) |
| As moscas estão desorganizadas o bastante (ou demais)? | `mosca.tremorAcel` (160), `mosca.tremorHz` ([1,5; 3]), `mosca.velInicial` (40) |
| O buraco abre nos lugares certos? | `buraco.colunas` ([280, 300, 320, 340, 360]), `buraco.naBordaPx` (14), `buraco.naMesaPx` (18), `buraco.folgaMesa` (16) |
| O pé de raízes prende o Tubo? | a arte: `peDoTubo` em `scripts/_elites/_mao-f4b.mjs` (as `seed` em `_instalar-f4b.mjs`); `tubo.afunda` (5) |

## 4. A conferência do buraco em cada superfície (§9.5 — ele decide as variações)

Olhado nos quadros dos GIFs de 14/10 (nenhuma variação feita — a decisão é dele):
- **Duto (a parede grossa):** o buraco abre na parede do teto e ela sai dali; no fim, mergulha na parede do chão. A cor
  CASA — o buraco foi desenhado com a paleta dessa parede. É o *"saiu das entranhas"* que ele pediu.
- **Câmara A (a placa de metal azul-esverdeada):** o buraco abre na borda do chão e ela mergulha no chão, como deve.
  Mas a cor NÃO casa de todo: é uma ferida de carne vermelha numa placa de metal, e o buraco (32×28) ocupa a faixa
  inteira e desce até a tira vermelha de baixo. Pode ler como "rasgou o metal" — ou pedir uma variação com a paleta
  da placa. **A pergunta é dele.**
- **Costelas azuis e mesas:** não apareceram nos GIFs de Larva (ela foi gravada na câmara A e no duto). O código já
  oferece as mesas da metade direita como lugar; ver no sandbox ou na fase.

## 5. Como se confere (com `npm run dev` rodando)

- `node scripts/test-elites-regras.mjs` → `TUDO OK`
- `node scripts/probe-elites-f4.mjs` → `TUDO OK` (32 linhas: o esporo não fere e deixa lenta, renova sem somar, passa;
  o tiro atravessa; o leque de 6 e 5; o pé; o buraco sempre na borda e andando com ela; o ciclo com os dois trancos)
- `node scripts/probe-elites.mjs`, `probe-elites-f3.mjs`, `probe-stage4.mjs`, `probe-f4-esfincter.mjs`,
  `probe-cartas-novas.mjs`, `probe-teclas.mjs` → verdes; `npm run build` → sem erro
- ⚠️ `probe-f4-moldura.mjs` e `probe-f4-golfinho.mjs` já quebravam antes da F4 — não são régua.
- GIF em jogo: `node scripts/_elites/_gif-f4-jogo.mjs <out.gif> <larva|tubo|tubos> <t> [segundos] [zoom]` (zoom 1 = ~8 MB)
- Arte: `node scripts/_elites/_instalar-f4b.mjs` (a pupa, o esporo, o grão, os pés)

## 6. Anotado — para depois

- Fechar a F4: ele aprova a rodada e a F4 passa no jogo dele. Depois: a frente C (a calibragem).
- Ele ainda joga a F3 inteira, sem pressa.
- O modo competitivo por níveis está no GDD §4 — não abrir antes da hora.
- O repositório de backup no GitHub (os GIFs e as folhas) — só no final de tudo.
