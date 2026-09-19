# Fatia 7 · B3 — A 2ª forma do chefão final vira O PREDADOR

**Data:** 16/09/2026 · **Branch:** `feat/fase4-visual` · **Substitui:** a seção B3 de
`2026-09-06-fatia7-fase4-design.md` (o diagnóstico de lá segue valendo; este documento é a resposta).

**Aprovação:** ele aprovou as seções 1 e 2 uma a uma e mandou seguir sem esperar a revisão escrita:
*"pode implementar e fazer, corrigimos depois"*. As seções 3 e 4 são as respostas que ele deu durante
o brainstorm, costuradas por mim. O que está aqui como **knob** é ponto de partida para ajustar
jogando, não decisão fechada.

---

## 0. O que muda, em uma frase

O guardião morre, **o predador sai de dentro dele** numa explosão sangrenta, urra para a câmera,
salta girando para encarar a nave, e a luta passa a cobrar **mobilidade e leitura**: ele investe,
arremessa lava, ronda pelo chão e pelo teto, some pela direita e, no último terço, **caça no breu**.

O diagnóstico da spec de 06/09, respondido item a item:

| diagnóstico (forma 2 = coração) | resposta (forma 2 = predador) |
|---|---|
| o clímax **encolhe 25%** | surge em **0,7** (~180px, a altura da arena) — maior que o guardião na chegada |
| a mesma **família de silhueta** | bípede, vertical, garras-lâmina; nada de massa redonda |
| paleta que lê como **outro inimigo** | o vermelho-sangue e a casca do guardião nos ombros: é o que estava dentro |
| **o verbo não muda** | o alvo está sempre aberto e se MOVE; dano dobrado na recuperação; breu |

## 1. A arte

- **Escolhida:** a candidata **B · predador** (`76945935-56fe-43da-a498-7284a2823022`), 256×256.
- **A vista S é a régua do estilo.** As rotações de 8 direções (`94aa9cf3…`) saíram lisas e
  cartunescas (*"menos horrendos"*) — medido: mais contraste em faixas limpas. Edições com a S de
  referência e por texto melhoraram pouco. **Descartadas para a luta.**
- **A pose da luta sai da própria S por animação:** o giro v3 (`giro-S-para-W`, grupo `c336b20e…`)
  herda o traço da S. Parou em **três quartos virado para a esquerda** — e isso é bom: o peito
  aceso fica de frente para a nave. **O quadro 8 é a pose da luta.**
- **O giro clareia quadro a quadro** (lum 46 → 61). Corrigido com curva gama para a lum do quadro 0
  (`scripts/_f4/_giro-brilho.mjs` → `assets/raw/furia-predador-giro/corrigido/`).
- **Teto:** pose própria (pedido dele), editada a partir do quadro 8 espelhado —
  `assets/raw/furia-predador-teto/pose.png`. ⚠️ a cabeça ficou pouco legível; corrigir depois.

### As animações (todas v3, 8 quadros, 256², a partir de PNG local via `scripts/_f4/_pl.mjs`)

| clipe | parte de | uso |
|---|---|---|
| `urro` | S (quadro 0 do giro) | o surgimento |
| `giro` | já existe (corrigido) | o salto do surgimento |
| `idle` | quadro 8 | parado no chão, rosnando |
| `slash` | quadro 8 | investida + golpe |
| `lava` | quadro 8 | arremesso no chão |
| `teto-lava` | pose do teto | arremesso pendurado |
| `morte` | quadro 8 | a morte final |

**A lei de sempre: arte entra asset por asset.** Sem uma folha, o motor usa o quadro estático da
pose correspondente (e tint/flash no lugar do movimento) — a luta funciona inteira sem nenhum clipe.

## 2. O surgimento (seção 1 — aprovada)

Tempo desde a vida do guardião zerar:

| t | o que acontece |
|---|---|
| 0 → 1000ms | *(existe)* a morte composta do guardião |
| 1000ms | *(existe)* `guardiaoDestruido` + `explodeBig`. **Novo:** a **explosão sangrenta** no motor (jorro vermelho-escuro, gotas com gravidade, flash vermelho, tranco forte) **+ SANGUE NA TELA** (manchas presas à câmera, por cima de tudo) |
| 1000 → 1500ms | a carcaça apaga sob a nuvem de sangue |
| 1500ms | o predador está lá: **escala 0,7, de frente (S)**, onde o guardião estava |
| ~1500 → 2700ms | **o urro** — tranco de câmera no pico |
| ~2700 → 3500ms | **o salto com giro**: o motor faz o arco, toca o `giro`, e a escala vai de **0,7 → 0,47** no mesmo arco; ele pousa no chão já na pose da luta |
| ~3000ms | o sangue da tela já escorreu e apagou |
| ~3500ms | **a arma destrava** — a luta começa |

**Regras da janela:** a **arma do jogador fica travada** (trava própria, que não é a do calor —
o painel não mostra superaquecimento); a **nave voa livre**; o predador **não toma dano e o corpo
dele não machuca** (ele nasce ocupando a altura da arena); **nenhuma bala inimiga**.

## 3. A luta (seção 2 — aprovada)

**Vida:** 180 (a mesma da forma 2 de hoje; a barra única não muda).

| fase | vida | repertório |
|---|---|---|
| **1** | 100% → 66% | no **chão**, metade direita · investida+slash · lava em arco |
| **2** | 66% → 33% | **ronda**: salta entre âncoras de chão e teto, e **sai pela direita** para reentrar em outro ponto |
| **3** | 33% → 0 | **o breu** (seção 4) · o repertório da fase 2 · a lava estoura em estilhaços |

**O alvo — a mistura (c):** o **peito aceso** é a hitbox (medida na arte, nunca a olho), **sempre
vulnerável**. Na **recuperação** depois de cada ataque o dano **dobra**. A casca dos ombros absorve
a bala (o pacto do domo do guardião); o resto do corpo deixa a bala seguir até o peito.

**Investida + slash:**
1. **carga** — o core **pulsa devagar e acelera** até o bote (~1,5s; o mesmo telégrafo do breu, ensinado às claras);
2. **bote** — salto rápido na altura em que a nave estava **no fim da carga** (mirada no passado: quem sai da linha escapa);
3. **slash** — a garra é perigosa por ~200ms ao chegar;
4. **recuperação** — ~1s parado, dano dobrado; depois volta para uma âncora.

**Lava:**
- **telégrafo** — ergue a garra ~0,5s; **arremesso** — 1 a 3 bolas em arco com gravidade, calculadas para cair onde a nave está; **recuperação** ~0,6s com dano dobrado.
- **fases 1 e 2:** a bola some ao bater na borda. **Fase 3:** ao bater na borda, **estoura em estilhaços**.
- pendurado no teto, arremessa com a garra livre (a pose do teto).

**A ronda (fases 2 e 3):**
- **âncoras só no chão e no teto**, todas nos **60% da direita** — a esquerda é da nave. A linha de apoio é a **borda desenhada**, medida (a de colisão, y=10/206, fica dentro da faixa).
- **a borda direita é SAÍDA, não âncora** (medido no mock: não há parede ali, a pose girada vira um bolo de garras). Ele salta para fora; 1–2s depois **reentra por outro ponto**, com aviso antes (o core acende por um instante no ponto de entrada).
- **o salto entre âncoras machuca por contato** — o salto é o próprio telégrafo.

**O que sai:** os drones e as paredes de corredor do coração. A luta é só você e ele.

## 4. O breu (fase 3)

- **A arena apaga:** uma camada preta por cima do fundo, da borda e do predador.
- **O jogador vê a nave inteira**, com um **halo bem justo em volta** que **não ilumina nada** além dela.
- **O predador só é visto pela luz do próprio core:** o core **pisca lentamente**; no pico do pulso, a
  luz dele revela o corpo em volta (uma cópia do sprite, escura e avermelhada, com alpha preso ao pulso).
- **Brilham por cima do breu:** o core, os tiros da nave, a lava e os estilhaços dela.
- **O telégrafo da investida é o core CARREGANDO** (a ideia dele): pulsa devagar e vai acelerando até o
  bote — dá tempo de desviar. **Piso de balanceamento:** a carga nunca fica abaixo do tempo de sair da linha.
- **A entrada no breu é um beat:** ele urra (o clipe do surgimento serve), e as luzes apagam em ~600ms.

## 5. Técnica

### Onde mora
- **`src/entities/BossNucleo.ts`** fica com o **guardião** e a **troca** (a morte composta, a explosão
  sangrenta, o sangue na tela). A forma 2 sai inteira dele.
- **`src/entities/Predador.ts`** (novo) é a forma 2: surgimento, máquina de estados da luta, lava,
  âncoras, breu. O `BossNucleo` delega a ele depois da troca — ele continua sendo o `StageBoss` da
  cena (`sprite`, `targets`, `damage`, `isDead`), então a `GameScene` não aprende nada novo exceto:
- **`StageBoss.armaTravada?: boolean`** — a cena passa `firing && !boss.armaTravada` para a arma.
- **O breu** mora no `Predador` (é da luta, não da fase): um retângulo preto preso à câmera numa
  profundidade entre o mundo e a nave; a nave sobe acima dele só enquanto o breu existe.

### Os estados do predador
`surgindo` → `chao` ⇄ {`carga` → `bote` → `slash` → `recupera`} ⇄ {`telegrafoLava` → `arremesso` → `recupera`}
→ (fase ≥2) `salto` entre âncoras · `teto` · `saida` → `fora` → `reentrada` → (fase 3) `breu` sobreposto → `morto`.

### A lava
Projéteis do pool `enemyBullets` (o dano na nave já está ligado), com a **gravidade integrada pelo
predador** (lista própria de bolas vivas: `vy += g·dt`) — não se liga gravidade no pool, que é
compartilhado. A mira é balística: tempo de voo fixo por arremesso, velocidade inicial resolvida para
cair no ponto da nave. Borda: bola some (fases 1–2) ou vira 5–6 estilhaços radiais (fase 3).

### Sondas
- **`probe-stage4`** troca os asserts do coração (`aberto`, "FECHADO segura / ABERTO fere", paredes)
  pelos do predador: a troca revela o predador; a arma trava no surgimento e destrava; a bala real
  fere o peito; o dano dobra na recuperação; a fase 3 liga o breu; matar entrega a cutscene final.
- Captura de verificação: `scripts/_f4/_ver-predador.mjs` (molde: `_ver-guardiao.mjs`).

### Knobs (todos `static readonly` no `Predador`)
escala do surgimento/luta (0,7/0,47) · durações do surgimento · carga (1,5s) e piso · duração do slash
(200ms) · recuperações (1s/0,6s) · multiplicador de dano (2) · gravidade e tempo de voo da lava ·
nº de estilhaços · tempo fora da tela (1–2s) · alpha do breu · raio do halo · período do pulso do core.

## 6. Critério de aceite

Ele joga a luta. **A 2ª forma parece o fim do jogo?** E, especificamente: dá para desviar da
investida no breu lendo só o core?

---

## 7. Revisões depois dos testes jogados (16/09) — o que mudou desta spec

Esta seção **manda sobre as anteriores** onde elas divergem. O registro fino (falas dele, candidatas, lições) está na
⏸️ do START.

**1º teste** — *"gostei de como ficou a luta, a mecânica ficou interessante. Mas as animações deixaram a desejar."*
- **Ferramenta:** as animações passaram do v3 para o **PixMiniMax** (venceu todos os gestos grandes; 2 gerações/clipe em 256²).
- **Pulo do surgimento:** clipe S→luta com quadro final fixo; agacha, torce no ar, pousa. O motor só voa entre o impulso e o pouso.
- **Morte:** clipe que desaba e fica estendido + o sangue compartilhado (`src/entities/sangue.ts`) + estouros.
- **Lava (§3):** deixou de ser o glóbulo tingido — bola desenhada com cor de lava, luz ADD e rastro de brasas, **acima do breu**.
- **Breu (§4):** `BREU_ALPHA` 0,96 → **1**; o halo da nave menor.
- **Troca (§2):** a fumaça do estouro grande passa para TRÁS do predador quando ele surge.

**2º teste** — aprovou o surgimento/giro, o breu, a lava (*"principalmente quando ricocheteia"*), a morte e a fumaça.
- **O idle (§3) ANDA no lugar**, e pendurado ele BALANÇA — *"a fase está em movimento e no idle parece que está deslizando"*.
  **Regra nova: nenhuma pose parada em cena longa**; a arena rola.
- **A investida (§3) mudou de mecânica:** no fim da carga ele **cai de quatro**; o bote é um **galope PELO CHÃO** (não
  mais na diagonal até a nave); na chegada, o **slash inclinado com dois golpes** e um **SALTO até a altura em que a nave
  estava no fim da carga**, voltando ao chão. A mirada continua "no passado".
- **O teto (§3):** não é mais a pose espelhada. Ele **pula e agarra o teto com UMA garra** (o clipe inteiro no voo), fica
  **pendurado por um braço**, balança, e arremessa com o braço livre; desce com o clipe de agarrar ao contrário; entre
  âncoras do teto vai balançando. Entre âncoras do chão para a esquerda ele galopa; para a direita salta recuando.
- **A morte (§3):** fora do chão, **o corpo despenca até a borda** (*"não pode flutuar caído"*).
- **Técnica (§5): o quadro virtual.** Galopar e pendurar não cabem no 256² na escala da luta: esses clipes nasceram da
  pose de luta REDUZIDA no quadro (0,85 chão / 0,75 teto) e cada clipe tem um fator em `Predador.QUADRO` — desenhado em
  `escala / f`, origem `(0,5 ; 1 − f/2)`; miolo/pés/garra em px virtuais; hitbox em px do clipe. A sonda lê a escala
  lógica. O rastro do corte desenhado no motor saiu (os clipes trazem o arco).

**A rodada 3 (o que o 2º teste pediu) NÃO foi jogada até 17/09** — o critério de aceite (§6) segue aberto.

---

## 8. Revisões de 17/09 — o 3º e o 4º testes jogados (esta seção prevalece sobre a §7 onde as duas divergirem)

**A rodada 3 foi jogada e APROVADA inteira** (andar no lugar, cair de quatro, galopar, slash com salto, agarrar o
teto, pendurar, descer, ir de âncora em âncora). Ficaram dois defeitos e um pedido novo, resolvidos nas rodadas 4 e 5.

### 8.1 O arremesso pendurado usa a garra LIVRE (rodada 4) — e é SEMPRE A MESMA GARRA (rodada 6) ✅
*"ele está agarrando com a mesma garra que ele joga a lava"*. O `teto-lava2` soltava o teto para arremessar. O
`teto-lava-b` (rodada 4) resolveu o teto — a garra erguida fica cravada do começo ao fim —, mas **criou outro**: o
braço que enrolava passava ATRÁS do tronco e sumia, e o gerador trocava de membro no meio do gesto. Ele pegou
jogando, em 18/09: *"quando o predador joga a lava, a animação confunde as garras, começa com a de trás e acaba com
a da frente"*.

**A arte final é o `teto-lava-f`** (`assets/raw/furia-predador-anim5/`, rodada 6): a garra da FRENTE **colhe a bola
no core aceso** e a solta, visível nos 17 quadros, sem nunca cruzar para trás do corpo. **Jogado e APROVADO em
19/09:** *"essa animação nova do predador tirando a lava do core ficou ótima e in-game melhor ainda"*.

- **A lei que fica:** num corpo de dois braços iguais, dizer QUAL braço age não basta — o pedido tem de proibir a
  passagem por trás (*"stays in front of the torso and fully visible in every frame"*). Encenação segura o que a
  instrução não segura. E julgue clipe em 256² cheio (`scripts/_f4/_zoom-clipe.mjs`): na folha de meia escala a
  troca de garra passa batida.
- **A mão foi remedida:** o `f` solta na altura do PEITO, não lá embaixo como o `b`. O offset do teto em
  `Predador.arremessar` foi de −104,+43 para **−115,+7** virtuais. O telégrafo fica em **0,68s** (a bola deixa a
  mão entre os quadros 10 e 11, como antes). ⚠️ Trocar o clipe OBRIGA a remedir a mão.
- Reserva guardada: `teto-lava-e` (o upper de baixo para cima) — `TETO_LAVA=… node scripts/_f4/_instalar-predador.mjs`.
  Descartadas: `teto-lava-c` (vira jato) e `teto-lava-d` (clareia demais, contra o dark sci-fi).

### 8.2 A VOLTA É UM ATAQUE — o rasgo com metal incandescente (rodada 4, skill NOVA)
Pedido dele: *"antes a saída e a reentrada tinham mais efeito visual e não de mecânica"*. A reentrada deixou de ser
só uma volta à âncora. Agora, **sempre pelo chão**:

1. **Aviso** — o core pisca na borda direita, na altura do chão (`AVISO` 0,5s);
2. **Entrada** — ele **galopa** da borda até o meio da arena (`RASGO_X` 192), com o core no ritmo da carga;
3. **Rasgo** — para e **crava as garras no chão**, erguendo um arco em brasa de baixo para cima (clipe `upper-b`:
   as garras ficam no piso dos quadros 4 a 11 — essa é a janela de fuga — e o arco sobe no 12, `RASGO_SOLTA` 0,7);
4. **O metal** — lascas incandescentes (`metalBrasa`, desenhadas no motor, distintas da bola de lava) saem **do
   chão** em arco, com a gravidade da lava, miradas onde a nave estava quando ele parou. `METAL_N` por fase
   [·, 3, 4, 5], `METAL_VOO` 0,95, `METAL_ABRE` 30. **Não estilhaçam** — o estilhaço continua sendo da lava no breu;
5. **Recuperação** — `RECUP_RASGO` 0,9s com o dano dobrado, como nos outros ataques.

Jogado e aprovado: *"o aviso avisa e ficou ótimo"* · *"dá tempo de desviar"* · *"o metal derretido ficou ótimo e
ficou diferente da lava"*.

### 8.3 O FIM DA MORTE — o corpo fica, o piso cede e a lava o engole (rodada 5)
O defeito medido: a cena destruía o chefão 1,2s depois do golpe final, exatamente quando o clipe da morte terminava
estendido, e a cutscene entrava 1,4s depois — *"ele sumiu e depois a cutscene abriu"*. Duas correções:

- **O corpo fica.** `BossNucleo.destroy` deixa o último quadro no chão como imagem solta, e a cena passou a esperar
  `StageBoss.pausaFinalMs` (`CORPO_FICA_MS` 4200) antes da vitória.
- **O fim, em quatro tempos** (`src/entities/fimDoPredador.ts`), pedido dele: o corpo no chão, o **piso rachando e
  estourando**, a **lava subindo até a altura de onde era o chão** e o **corpo afundando** nela até sumir. A poça
  cobre a faixa inteira — é o que responde à queixa de *"o chão continua passando embaixo"* de um corpo imóvel.

⚠️ **A 1ª versão foi reprovada na hora**: *"ficou gerado e sem custos… preciso de uma lava mais condizente com o
cenário, uma rachadura mais real"*. Ela desenhava tudo com `Graphics` em tempo de jogo. **A lei que fica para todo
efeito de cenário deste projeto:** assar em PIXEL, na resolução nativa, com a paleta amostrada do vizinho
(`scripts/_f4/_assar-fim-f4.mjs` — rachadura em 6 estágios que corre com a rolagem, poça Voronoi de crosta com
costuras acesas e dither Bayer, lascas de placa). O código de cena toca a arte assada e nada mais.

**O critério de aceite (§6) segue aberto só no 8.3** — a rodada 5b não foi jogada até o fim de 17/09.

---

## 9. Revisões de 19/09 — o 5º teste jogado (esta seção prevalece sobre a §8 onde as duas divergirem)

**O FIM DA MORTE foi jogado e APROVADO** em cinco dos sete itens: o corpo no chão (*"me lembra o corpo do Demon no
Tibia, uma baita referência de boss"*), o rasgo (*"ficou mais bem acabado"*), as lascas (*"ajudam a criar mais caos
no cenário"*), a crosta (*"melhorou muito desde a primeira versão"*) e o fecho. Sobraram dois pedidos, feitos na
rodada 7.

### 9.1 A poça cobre o chão INTEIRO, e o corpo afunda por dentro dela
*"ela pode tomar mais alguns pixels para cima, para cobrir todo o chão, só verificar se o corpo afunda atrás da
camada de lava e não na frente… afundar na frente dá impressão de estar caindo para outro local"*.

**Não era ordem de camada** — medido em jogo, o corpo sempre esteve em depth 0 contra os 6 da poça. Era geometria: a
faixa do chão tem 26px e a poça assada tem **36**, então parar na linha do chão jogava 10px da arte fora e deixava a
crista ABAIXO do corpo (36,7px de altura na escala da luta). A lava nunca chegava nele.

- `SOBE_ACIMA_PX` **10**: a crista sobe até y=180, usando a arte inteira. Isso também é o F7 (*"se levantar um pouco
  mais a lava dá a impressão que é melhor sair dali logo"*);
- `AFUNDA_PX` 30 → **36**: o topo visível do corpo vai de 155 a 180 e termina **coberto**;
- `corpo.setDepth(min(depth, DEPTH_LAVA − 0,5))` — a garantia fica local, e não herdada do sprite do chefão.

### 9.2 A lava DO CHÃO passa a sair do core (rodada 7)
*"acho que vale gerar uma nova animação com ele tirando do core"*. O clipe velho (`anim/lava`, v3 da 1ª passada) era
um arremesso genérico por cima do ombro, sem relação com o peito aceso — destoava do `teto-lava-f` aprovado. A arte
nova é o **`lava-core-c`** (`assets/raw/furia-predador-anim6/`): o core **abre em brasa** nos quadros 7–9, a garra da
frente colhe a bola ali e a empurra para a esquerda, sempre à frente do tronco (a lei da §8.1).

⚠️ **`TELEG_LAVA` e `TELEG_LAVA_TETO` são SEGUNDOS, não fração do clipe.** Cada um tem de cair no quadro em que a
bola larga a garra daquela arte; trocar o clipe sem refazer a conta põe a bola nascendo no vazio. No `lava-core-c` a
bola aparece no quadro **13 de 17** (76%), então `LAVA_MS` **700** (era 1000, cravado no código) com `TELEG_LAVA`
**0,53s** — o aviso fica igual ao de antes, que ele aprovou. Esticar para 1000ms daria 0,76s de aviso: mais fácil de
desviar, e isso é decisão de luta, não de arte. A mão do chão: **−70,−40 → −83,+5** virtuais
(`scripts/_f4/_medir-mao.mjs`).

### 9.3 O bloco C, fechado
O urro *"ficou ótimo"* · a emenda vertical da pintura do núcleo **fica como está** (*"nem consegui perceber, é muita
informação para reparar"*) · `nucleo.png` e `nucleo-beat-sheet.png` **não são apagados**: ficam *"como scrap ou
substitutos caso precisemos futuramente"*.

### 9.4 ✅ JOGADA E APROVADA (19/09) — o B3 está fechado
*"está ótimo"* (o corpo afundando) · *"ficou bom assim"* (a poça mais alta) · *"a bola sai da mão e a lava sai do
core dele"* · *"ficou bom"* (o aviso). A arena do golfinho, no mesmo teste: *"a dificuldade está bem balanceada e
punitiva se errar a batalha"* — fica como está.

**Um defeito pego e consertado na hora:** *"existe um artefato (bola de lava) da própria animação que vai para
baixo no movimento"*. A bola PINTADA seguia na garra nos quadros 14–16 e descia com o braço, então havia duas bolas
na tela depois do lançamento. O clipe passou a ser cortado no 14 (`LAVA_QUADROS`, 15 quadros) e `LAVA_MS` 700 →
**580**, o que põe o telégrafo de volta em **0,5s** caindo no quadro 13 — a soltura. Sobra um quadro de
acompanhamento e a pintada nunca desce.

---

## 10. ⚠️ FORA DESTA SPEC — a luta do GUARDIÃO (aberta em 19/09)

O mesmo teste que fechou o B3 abriu um problema no B1, que é de LUTA e não de arte: *"a luta com o guardião está a
mais fácil de todas… a investida é impossível de desviar… tirando ela, os 3 tiros são muito fáceis"*. Medido em
jogo (`scripts/_f4/_medir-guardiao-luta.mjs`): na investida o corpo é **147×133px** num vão jogável de **160px**
(y 30..190), o que deixa 27px de folga — ~20px depois de descontar a nave, divididos entre em cima e embaixo — e
ainda por cima a investida é mirada na altura dela, com deriva de até 70px/s durante a travessia. Os glóbulos do
leque andam a **100px/s** contra os **110px/s** da nave: projétil mais lento que quem desvia.

**Nada foi mexido.** Isto é comportamento, não arte: precisa de brainstorming e decisão dele antes de qualquer
código, e sai numa spec própria.
