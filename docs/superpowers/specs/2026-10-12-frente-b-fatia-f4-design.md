# FRENTE B — fatia F4: a LARVA MECÂNICA e o TUBO PULSANTE (12/10/2026)

> Brainstorming de 12/10 com o Henrique, sete perguntas, uma de cada vez. Spec-mãe:
> `2026-10-05-frente-b-elites-design.md` (os princípios do §1.1 e a arquitetura do §2 valem inteiros). Esta fatia
> detalha os dois elites da Fase 4 e troca o verbo dos dois em relação à tabela da spec-mãe (§1.2) — vale esta.
> Estado: **desenho aprovado por ele** em 12/10 (*"de acordo"*); **arte escolhida e implementação em 13/10** (plano
> `plans/2026-10-13-frente-b-fatia-f4.md`; as decisões desse dia estão no §8). **14/10: ele testou, e a rodada nova
> está no §9** (o Tubo de esporos, o buraco só em superfície, a pupa P1, a mosca desorganizada). Vale o §9.
> **14/10: a rodada nova (§9) foi implementada no mesmo dia** (plano `plans/2026-10-14-f4-rodada-esporos.md`). Um
> ajuste da execução: as colunas do buraco na borda começam em 280, não em 250 (o buraco anda com a superfície: aberto
> em 250, ela saía em x≈174 e mergulhava em x≈145). **Calibragem dele no mesmo dia, vendo os GIFs:** a lentidão
> passa a **60%** (*"punitiva"*: a nave a 40% do teto, no lugar dos 60%), e os esporos deixam o meio-leque do §9.3 —
> a soltura fica *"mais orgânica e desorganizada … e para cima, cobra destreza do jogador"* (um desenho dele: a nuvem
> espalhada acima da boca). Cada esporo sai num rumo sorteado num cone de ±60° para dentro do corredor, com
> velocidade, freada e atraso próprios; param de rente à boca a ~70px dela e sobem devagar. 6 em cada pulso. Os
> números estão em `numerosElites.ts` (`esporo`, `lentidao`); a regra é `esporosDoPulso`.

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

## 8. As decisões de 13/10 (a arte e a implementação)

**Dele, vendo as folhas e os GIFs encenados** (`folhas/2026-10-13/elites/f4/`):

- **As DUAS variações ficam, nos dois elites.** Tubo: *"ficaram ótimos, podemos deixar as duas variações"* — **C**
  (`tuboCraca-31-0`, coroa de dentes) e **D** (`tuboCraca-31-21`, craca dupla). Larva: *"Eu gostei dos dois, sem
  dúvidas ficaram ótimos. Então podemos usar a variação, como vamos fazer com o tubo"* — **A** (`larva-31-16`, do
  conceito) e **D** (`larvaBroca-31-6`, a broca).
- **A densidade do tiro do Tubo se decide jogando:** *"vamos ter que testar para saber se durante a fase não vai ser
  muita coisa"*. Knobs: `tubo.tirosN`, `tubo.pulsos`, `tubo.velTiro`.
- Os gestos (PixMiniMax, a partir da arte parada de cada variação) foram aprovados nos GIFs e entram **crus, só
  recortados** — sem encaixe de paleta: o inchar do Tubo e a brasa da broca acendem cores que a arte parada não tem.

**Do plano (o que a spec deixava em aberto):**

- **As variações alternam pela ordem de nascimento na fase:** a 1ª Larva é A, a 2ª D, a 3ª A; o 1º Tubo é C, o 2º D,
  o 3º C. As duas aparecem em toda partida, e o par do aperto nunca sai igual.
- **As 6 entradas** (§4), cada uma no lugar de uma onda: Tubo t=10 (batedores de t=9) · Larva t=21 (batedores de
  t=21) · Tubo no chão t=57,5 (drones de t=58) · Tubo no teto t=60,5 (kamikazes de t=64) · Larva t=75 (drones de
  t=74) · Larva t=97,5 (batedores de t=97). Banners em t=9 (`TUBO PULSANTE`) e t=20 (`LARVA MECÂNICA`).
- **O Tubo espera um lugar na parede**, fora da tela: entre duas mesas (94px cada; ele cabe no meio da batida do
  corredor) e a ≥22px da emenda de duas placas da borda (a parede tem degrau ali). Esperou 8s, nasce assim mesmo.
  Plantado, ele guarda a coordenada de MUNDO e anda na mesma grade de pixel das placas (`Moldura.telaDe`) — inclusive
  travado pelo elétrico (o gancho `noChao`). O `y` do roteiro só escolhe a parede: metade de cima = teto.
- **Os postos da Larva usam o VÃO do corredor** (entre as mesas), não as superfícies da borda; `postoDistY` = 20 (o
  duto mais fechado deixa 40px de faixa). Sem corpo enquanto é um ponto no buraco (os primeiros 0,18s do SAI e os
  últimos do MERGULHA).
- **O buraco fica na FRENTE do cenário de fundo** (`depth −0,7`: atrás da borda, das mesas e dos inimigos) e anda com
  a pintura (2% do mundo). ⚠️ A 1ª versão o punha colado na pintura e, no duto, uma peça do cenário tapava o buraco de
  chegada — que é o aviso. O preço: uma costela que passe por trás desliza sob ele. Tem vida própria (`Buraco.ts`).
- **A pupa morre só com a faísca do acerto** (sem o estouro comum); **a mosca não gira** (9×6 é pequeno demais) e para
  de perseguir quando passa da nave. As duas são "miúdos": dirigidas por um comportamento, mas não atenuam o primeiro
  plano.
- **O sandbox da F4 ganha a borda de 16px** (sem roteiro ela ficava com espessura 0). O clipe `idle` da Larva não é
  usado: no ciclo ela nunca fica parada sem fazer nada.
- **Rascunhos à mão, à espera dele:** o buraco, a cicatriz, a pupa, a mosca e o tiro do anel (`scripts/_elites/_mao-f4.mjs`).

**Visto nos GIFs em jogo, para ele julgar:** o tiro do anel que sai rente à parede para a ESQUERDA anda a 70 px/s e a
parede a 84 — ele fica para trás do próprio Tubo em vez de se afastar. Sai com `velTiro` acima de 84 ou tirando os
dois tiros rentes (o anel de 30° a 150°).

## 9. A rodada de 14/10 — o primeiro teste dele (Tubo de esporos, buraco em superfície, pupa P1, mosca desorganizada)

> Ele viu os 4 GIFs em jogo e testou no sandbox. Desenho decidido com ele em 14/10, um ponto de cada vez; **vale
> este §9 onde ele contradisser o §2, o §3 ou o §8**. Implementação: `plans/2026-10-14-f4-rodada-esporos.md` (ele:
> *"pode escrever a spec e o plano, implemente depois"*). As folhas do dia: `folhas/2026-10-14/f4/`.

### 9.1 O que ficou como está (aprovado por ele)

- **A Larva:** a mecânica, as pupas e as moscas, a quantidade (*"a quantidade está boa (isso depois podemos regular no
  balanceamento)"*), as duas variações e o buraco abrindo (*"a aparição da larva, a abertura do buraco está boa"*).
- **A arte à mão do buraco e da cicatriz:** *"ficaram boas"*. Deixam de ser rascunho. A pupa e o tiro do anel, não:
  ver o §9.2.
- **Os GIFs em jogo ficam guardados** (~146 MB). Ele: *"deixamos de exemplo de como trabalhamos de forma
  organizada"*. Eles não entram na produção. Vão para um repositório de backup no GitHub, **só no final de tudo**.

### 9.2 A arte nova

| Peça | A escolhida | De onde |
|---|---|---|
| **Pupa** | **P1, a crisálida em anéis** (7×12): cápsula afinada nas pontas, casca cinza-metal em gomos, e as faixas entre os gomos ACENDEM em vermelho conforme ela amadurece | à mão, `scripts/_elites/_mao-f4b.mjs` (`PUPAS['P1 crisálida em anéis']`) |
| **Esporo** | **G4, o tufo de grãos** (gerado, ~8×9 reduzido): grãos verde-amarelados soltos numa poeira | PixelLab, `folhas/2026-10-14/f4/cand/esporoNuvem-41-31.png` |

Ele: *"A P1 é muito boa, pode ser ela. E os esporos a gerada G4 ficou muito boa."* A cor do esporo é
**verde-amarelada de propósito**: vermelho é dano, e o esporo não fere. Ela também se lê no fundo vermelho da câmara A
e no azul da caixa torácica.

- **A pupa treme antes de eclodir** (pedido dele: *"dão um leve tremilique antes de eclodir"*). Nos últimos **0,6s**
  ela treme ±1px, e o tremor fica mais rápido. Ela não sai do lugar onde parou: o sprite (e a hitbox junto) oscila
  1px em volta dele, o que não muda nada no jogo. O pulso das faixas (`pupaQuadro`) continua igual.
- **O esporo PAIRA** (pedido dele: *"precisam ter um wiggle ou balanço mínimo para simular que estão pairando"*):
  oscila 1 a 2px, devagar (um ciclo de 1,2 a 2s), cada um com a própria fase e o próprio período, para a nuvem não
  balançar em bloco.

### 9.3 O Tubo vira o Tubo de ESPOROS

O Tubo deixa de atirar o meio-anel de tiros. Agora ele **solta esporos que deixam a nave LENTA**. Ele: *"Os tubos vão
soltar esporos, o efeito de passar nos esporos é lentidão... se desviar não pega, se relar nos esporos não toma dano na
vida, toma penalização por x segundos de velocidade."*

| | O ponto de partida (números calibráveis) |
|---|---|
| **O ciclo** | igual ao de hoje: rola com a parede → INCHA (0,6s, o aviso) → PULSA, **2 pulsos por passagem** |
| **O pulso** | **6 esporos** num leque para dentro do corredor (o meio-anel de hoje, `tuboAngulos`); o 2º pulso sai defasado meio passo, com 5 |
| **O voo** | saem a ~60 px/s, **freiam** em ~0,8s e então ANDAM COM O CENÁRIO (a velocidade da parede), pairando |
| **A vida** | ~**3s**, e somem ao longo dos últimos 0,5s |
| **O toque** | **sem dano**. A nave fica **40% mais lenta por 2,5s**. Outro toque RENOVA os 2,5s e não soma: o pior caso é sempre 40%. O esporo que tocou some com um sopro |
| **O tiro** | **atravessa** o esporo. Ele não se destrói: se contorna |
| **O sinal na nave** | alguns pontinhos verdes grudados nela enquanto dura. ⚠️ Sem `setTint` na nave: tint sobre arte escura repinta em vez de insinuar (`correcao-rumo-dark-sci-fi`) |

- **Por que andam com o cenário:** um esporo parado na TELA, enquanto a parede rola, lê como algo voando para a
  direita. Andando com o cenário, a nuvem vira uma ÁREA do corredor, que o jogador contorna como contorna uma mesa.
- **O esporo NÃO é tiro nem inimigo.** Fica num grupo próprio, fora do grupo dos tiros dos elites (que fere) e do dos
  inimigos (que as cartas miram e o tiro acerta). Assim ele nunca fere, a bomba não o apaga, o míssil não trava nele.
- **A lentidão mora no controle de voo:** um fator na velocidade máxima da nave (`FreeController`), aplicado e
  devolvido pela cena. **O Dash (a carta) NÃO é freado**: ele é a saída. ⚠️ Decisão minha, para ele confirmar jogando.
- **Saem do código:** o tiro do anel (`elite-anel.png`, `vestirAnel`), `tubo.velTiro` e a pergunta do §8 sobre o tiro
  rente à parede que ficava para trás do Tubo. O esporo anda com o cenário, então a pergunta deixa de existir.

### 9.4 O Tubo bem preso à borda

Ele: *"a maioria deles está com aspecto de descolado da borda"*. Nos quadros dos GIFs, a causa: o pé dele é RETO e
entra 2px numa borda que, em boa parte da fase, não parece chão firme. Na câmara A é uma faixa escura que some no
fundo, com a costela passando por trás. No aperto é a placa das costelas azuis, que parece uma janela.

- **Ele fica NA BORDA, e não em cima das mesas.** A opção das mesas foi descartada por ele: *"ficar na mesa faz com que
  o tubo em determinado estágio fique muito para 'dentro' da tela, deixando pouco espaço para desvios"*. Também não
  se proíbe a placa das costelas azuis: no aperto ela é toda a borda entre as mesas, e o Tubo ficaria sem onde nascer.
- **Um PÉ DE RAÍZES à mão:** 6 a 8px de cada lado, agarrado por cima da borda e descendo para dentro dela, como se
  tivesse crescido ali. Uma versão para a câmara A (`f4FaixaA`) e outra para as costelas azuis (`f4FaixaB`), na cor da
  placa onde ele está. O pé é um sprite à parte, colado ao Tubo, e espelha com ele no teto.
- **Afunda 5px** na borda (`tubo.afunda`: 2 → 5).
- **Continua valendo:** nasce entre duas mesas, longe da emenda de duas placas, no chão e no teto, nos lugares que
  forem sorteados ao longo da borda.

### 9.5 O buraco da Larva só em SUPERFÍCIE de verdade

Ele: *"o buraco só se abre em locais que fazem sentido (hoje ela pode nascer no meio da tela), das bordas ou texturas
aparentes. Nada de outros layers."* E depois: *"lembre-se que o verme tem que sair da borda, deixar que ele saia na
imagem de fundo é fazer a animação no layer do jogador, mas tendo como base o fundo que é o último layer."*

- **O buraco abre na face da BORDA** (chão ou teto) **ou na face de uma MESA**, sempre na metade direita. **Nunca na
  pintura do fundo, nem no duto**: lá ele abre na parede grossa da borda do duto. Ele escolheu *"borda e mesas"*.
- **Ele anda com a superfície onde abriu:** com a parede (a borda) ou com a mesa. Não anda mais com a pintura (os 2%
  do §8).
- **A profundidade:** na frente da superfície onde está, atrás dos inimigos. O `depth −0,7` do §8 (na frente do
  cenário de fundo) sai.
- **A chegada:** o buraco abre na superfície (0,5s, o aviso) → ela SAI dele → um **tranco até o 1º posto** dentro do
  vão → o ciclo de sempre (PÕE → TRANCO → …).
- **A saída:** depois da última parada, um **tranco até uma superfície próxima** (borda ou mesa) → PERFURA ali →
  MERGULHA. O buraco de saída abre nessa superfície.
- **A arte do buraco:** a de hoje foi assada com a paleta da parede do duto. Ela precisa ser conferida em cada
  superfície (câmara A, costelas azuis, mesas, duto). Onde a cor não casar, entram variações à mão. Na borda da câmara
  A a faixa visível mede ~26 a 30px (chão em y≈187 a 190), quase a altura do buraco (32×28): se não couber, uma
  versão mais baixa.

### 9.6 A mosca desorganizada

Ele: *"poderíamos deixar mais randômico a direção das moscas quando nascem, elas continuam em direção à nave como
está, mas voam de forma mais desorganizada"*.

- **Nasce numa direção SORTEADA** (qualquer rumo), em vez de já sair apontada para a nave.
- **Voa com um TREMOR LATERAL:** uma aceleração de lado a lado, perpendicular ao rumo, somada à perseguição. Cada
  mosca tem a própria fase e o próprio ritmo.
- **Continua igual:** a velocidade, a perseguição, a vida, e a regra de que, se passar da nave, ela segue reto e sai
  da tela.

### 9.7 Como se testa (o que muda no §7)

1. `test-elites-regras.mjs`: o tremor da pupa (zero antes dos últimos 0,6s, nunca passa de 1px), o balanço do esporo
   (limitado a 2px), o freio e a vida do esporo, a lentidão (renova sem somar), o leque dos 6 esporos, a escolha da
   superfície do buraco (nunca fora da borda ou de uma mesa) e o tremor da mosca.
2. `probe-elites-f4.mjs`: o esporo tocado deixa a nave lenta e não tira vida; o tiro atravessa o esporo; o buraco da
   Larva nasce sempre numa borda ou numa mesa (inclusive no duto); a Larva chega dando um tranco e sai por uma
   superfície; o Tubo segue a parede com o pé de raízes.
3. As sondas de sempre (`probe-elites`, `probe-elites-f3`, `probe-stage4`, `probe-f4-esfincter`) e o build.
4. GIFs em jogo (o Tubo na câmara A e no aperto, a Larva na câmara A e no duto). Ele avalia por GIF e depois joga.
