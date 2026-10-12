# FRENTE B — fatia F4: a LARVA MECÂNICA e o TUBO PULSANTE (12/10/2026)

> Brainstorming de 12/10 com o Henrique, sete perguntas, uma de cada vez. Spec-mãe:
> `2026-10-05-frente-b-elites-design.md` (os princípios do §1.1 e a arquitetura do §2 valem inteiros). Esta fatia
> detalha os dois elites da Fase 4 e troca o verbo dos dois em relação à tabela da spec-mãe (§1.2) — vale esta.
> Estado: **desenho aprovado por ele** (*"de acordo"*); nenhuma arte gerada, nenhum código escrito.

## 1. Os dois, em uma linha

| Elite | O verbo |
|---|---|
| **Larva Mecânica** | abre um buraco no fundo e sai dele → para e PÕE PUPAS → tranco em ziguezague → (3×) → perfura e mergulha no buraco |
| **Tubo Pulsante** | preso à parede, rola com ela → INCHA → PULSA um meio-anel de tiros com vãos → (2×) |

Conceitos dele, na folha dos biomas ("Interior do Leviatã"): Larva = nº 14 (*"se move em padrões imprevisíveis; ataca
com rajadas e explosões de proximidade"*); Tubo = nº 12 (*"estrutura viva do leviatã; libera ondas de energia e pode
se abrir para novos inimigos"*). Recorte da Larva: `folhas/2026-10-12/elites/f4/conceito-larva.png`.

**O que mudou da spec-mãe, e por quê:**

- **As cápsulas da Larva viraram PUPAS** (ideia dele: *"as cápsulas são na verdade pupas, se o jogador explodir, corta
  o ciclo… se deixar elas viram moscas e voam em direção da nave"*). A F4 já tem duas minas (a comum e a sensora, que
  estoura por proximidade com 8 estilhaços); uma terceira coisa que explode perto da nave seria repetição.
- **A Larva não atira mais** — o tiro dela são as pupas. Por isso **o Tubo virou o atirador da fase**: só o pulso em
  anel, sem soltar inimigos. As moscas são só da Larva.
- **A Larva chega e sai por um BURACO** que ela mesma abre no fundo (pedido dele: *"quero que a saída dela seja ela
  entrando num buraco ou algo assim"*; a chegada pelo buraco ele confirmou).

## 2. Larva Mecânica (vida 12, 350 pontos)

### 2.1 O ciclo — uma aparição = 3 paradas

| Estado | Tempo | O que acontece | Fere / é ferida? |
|---|---|---|---|
| BURACO ABRE | 0,5s | um buraco se abre no fundo, num posto da metade direita, dentro do vão; ela ainda não está lá | não |
| SAI | 0,4s | emerge do buraco, crescendo até o tamanho dela | sim |
| PÕE | 0,9s | parada; solta 2 pupas na direção da nave (§2.2) | sim |
| TRANCO | 0,35s | arranca para o posto seguinte | sim |
| PERFURA | 0,5s | na última parada, gira e abre o buraco atrás dela | sim |
| MERGULHA | 0,4s | entra encolhendo; o buraco fecha e deixa uma cicatriz que some em ~1s | não, depois de entrar |

A sequência: BURACO ABRE → SAI → PÕE → TRANCO → PÕE → TRANCO → PÕE → PERFURA → MERGULHA. Cerca de 4,7s à vista.
Saiu viva: **sem pontos** (como a lula). Morta em qualquer estado: o ciclo acaba; as pupas já postas seguem o destino
delas.

- **Os postos:** x na metade direita (ponto de partida: 230–340), y DENTRO DO VÃO do corredor naquele x
  (`Moldura.superficieTetoEm`/`superficieChaoEm`, com margem), e cada posto longe da altura do anterior — o
  ziguezague (decisão dele: A, sem cruzar para o lado da nave). Ela nunca atravessa mesa nem parede.
- **Ela não rola com o cenário** (voa). O buraco e a cicatriz acompanham o FUNDO pintado enquanto existem.
- **O tranco não é ataque:** é reposicionamento. O perigo é o campo de pupas, não o corpo (regra
  `elites-pressionam-sem-punir`). O corpo fere no contato como qualquer inimigo.
- **Onde ela NÃO entra:** a caixa torácica (a câmara B, t=38,8 a t=68: o golfinho e o aperto). Decisão dele.

### 2.2 A pupa e a mosca

- **A pupa** (1 de vida, 20 pontos): sai da Larva num leque curto na direção da nave, voa ~50px e PARA no ar. Pulsa
  cada vez mais rápido e **eclode em 2,0s**. **Um tiro a mata e corta o ciclo** — some sem explodir. Ela **não
  explode por proximidade** (decisão dele: A — uma regra por peça: a pupa é o aviso, a mosca é a ameaça). Encostar
  nela fere, como em qualquer inimigo.
- **A mosca** (1 de vida, 30 pontos): nasce da pupa e voa em curva na direção da nave, **mais lenta que o kamikaze**
  (o kamikaze: velocidade 45, perseguição 150; a mosca parte de perseguição ~110). Fere no contato e morre com
  qualquer tiro. Passou da nave sem acertar: segue e sai da tela.
- **A conta do pior caso:** 2 pupas × 3 paradas = 6 moscas por aparição, se o jogador ignorar tudo. É o knob
  principal (`pupasPorParada`).

## 3. Tubo Pulsante (vida 10, 300 pontos)

- **Preso à superfície da parede** (chão ou teto; no teto, espelhado na vertical). Entra pela direita **rolando com
  ela a 84 px/s** e sai pela esquerda: cerca de 4,6s na tela. Nasce numa placa SEM mesa.
- **INCHA (0,6s — o aviso) → PULSA:** um **meio-anel de 7 tiros lentos** (ponto de partida: 70 px/s) que se abre a
  partir dele, para dentro do corredor. **2 pulsos por passagem**; o segundo sai DEFASADO meio passo, para a faixa
  segura mudar de lugar.
- **Os vãos:** 7 tiros em 180° = um a cada 30°. A 60px dele o vão entre dois tiros mede ~31px; a hitbox da nave tem
  21×9. Passa com folga — o anel pressiona, não fecha (`elites-pressionam-sem-punir`: vão > tiro).
- **Leva tiro o tempo todo.** Morto enquanto incha, não pulsa. Encostar nele fere.
- Decisão dele: B — só o pulso. Ele NÃO se abre nem solta moscas.

## 4. O roteiro da F4

| Trecho | O que entra | Observação |
|---|---|---|
| 1ª câmara (até t=36) | 1 Tubo, cedo e SOZINHO (vão de 126) → depois 1 Larva, SOZINHA | a 1ª vez de cada um com espaço para ler o verbo (spec-mãe §1.1.3) |
| Caixa torácica — o aperto (t=50 a 68) | 2 Tubos: um no chão, um no teto | depois do golfinho; a parede ainda não mata — errar o vão do anel custa um tiro, não a nave |
| Duto (t=68 a 106) | 2 Larvas: uma entre a 1ª e a 2ª porta, outra no pico final | o trecho mais apertado da campanha; a Larva é quem dá ao jogador algo para atirar além das portas |

- **Cada entrada toma o lugar de uma onda comum** — a fase não incha. Os `t` exatos saem no plano, medidos contra as
  portas (t=72, 82, 94), a arena do golfinho (t=40 a 49,5: nada entra) e o silêncio antes do núcleo (t=106).
- Nenhum dos dois segura o relógio.

## 5. A arte

Tudo dark sci-fi, com o material do bioma: **tecido vermelho no interior** (spec-mãe §1.1.5). De PERFIL, virado para
a esquerda.

| Peça | Tamanho-alvo | Como |
|---|---|---|
| **Larva** — COMPACTA: a cabeça e 3–4 gomos enrolados, a cauda em broca | ~40px | PixelLab, do conceito nº 14; 3–4 candidatas numa folha |
| ↳ os gestos: pairar, pôr, tranco (encolhe e estica), sair, perfurar e mergulhar | — | PixMiniMax a partir da escolhida, gesto NO LUGAR (como a lula) |
| **Tubo** — fechado e inchado | ~36×28px | PixelLab, do conceito nº 12; 3–4 candidatos |
| ↳ os gestos: incha, pulsa | — | PixMiniMax |
| O buraco — abre, fecha, cicatriz | ~24px | à mão, em pixel, assado em quadros |
| A pupa (pulsa, eclode) e a mosca (bate asa) | ~8–10px | à mão, em pixel (`pecas-minusculas-em-pixel`) |
| O tiro do anel | ~5px | à mão, da família dos tiros dos outros elites |

⚠️ **O aviso da serpente.** O conceito da Larva é um corpo LONGO e segmentado — a mesma família da serpente do casco,
cancelada em 12/10 por ter virado porte de minichefe. Ela é desenhada CURTA (cabe em ~40px) e o tranco é um gesto no
lugar; nada de corpo comprido se arrastando pela tela, nada de partes coladas
(`criatura-inteira-vistas-animacao`).

**As folhas** (o primeiro passo da próxima sessão): as candidatas de cada um EM JOGO — sobre a pintura da câmara A e
do duto, ao lado da nave e em escala real, o Tubo encostado na borda de verdade. Ele escolhe; a arte parada aprovada
define tamanho e hitbox; só então comportamento → gestos → GIF em jogo.

## 6. A arquitetura

- **Quatro tipos novos no `EnemySystem`** — `larva` e `tubo` (elites, com
  `ComportamentoElite` em `src/entities/elites/Larva.ts` e `Tubo.ts`), `pupa` e `mosca` (inimigos pequenos; a pupa
  tem um relógio, a mosca reusa a perseguição do kamikaze). Por morarem no grupo dos inimigos, **todas as cartas
  funcionam sem código novo** (o míssil trava na pupa, o elétrico prende a mosca…).
- **Regras puras** em `src/elitesRegras.ts` (o avanço dos estados da Larva, a escolha do posto dentro do vão, os
  ângulos do meio-anel e a defasagem, a pupa que eclode); **números** em `src/data/numerosElites.ts`.
- **O Tubo preso à parede** precisa de um gancho por quadro para seguir a superfície e a velocidade do chão. Essa
  infra existiu para a serpente (`velChao`, `noChao`) e saiu com ela em 12/10 — está em `git show 8cbc679:src/entities/elites/tipos.ts`
  e `8cbc679:src/systems/EnemySystem.ts`. Volta só o que o Tubo usar.
- **O buraco** é um sprite de quadros assados, criado pela Larva (como a tinta da lula), atrás dos inimigos.
- **Os gestos** seguem o padrão da lula: o quadro sai do relógio do estado (`cacadorQuadro`), sem animação do Phaser.
- **Sandbox:** `larva`, `tubo` e (para calibrar) `mosca` entram na lista de inimigos. ⚠️ A conferir no plano: o
  sandbox na F4 monta a borda? O Tubo precisa de parede para existir.

## 7. Como se testa

1. `scripts/test-elites-regras.mjs` — as regras puras dos dois (estados, postos dentro do vão, vãos do anel maiores
   que a nave, a defasagem do 2º pulso, a pupa: tiro corta, tempo eclode).
2. `scripts/probe-elites-f4.mjs` — em jogo, vigiando o ciclo de DENTRO da página (a lição da sonda da lula): a Larva
   nasce do buraco, nunca sai do vão, põe 2 pupas por parada, mergulha; a pupa atirada não vira mosca; o Tubo segue a
   parede, pulsa 2 vezes, morto inchando não pulsa.
3. `scripts/probe-stage4*.mjs` — a F4 de ponta a ponta segue passando (portas, golfinho, esfíncter, chefão).
4. **GIFs em jogo** de cada um, na velocidade real.
5. **Ele joga:** o sandbox (cada um sozinho e juntos), depois a F4 inteira.

**A fatia F4 fecha quando** os testes e as sondas passam, ele aprova a arte e o comportamento dos dois, e a F4 passa
no jogo dele. Depois: a frente C (a calibragem das cartas).
