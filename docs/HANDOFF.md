# HANDOFF — estado do projeto (2026-07-18)

Documento de retomada. **Leia isto primeiro**, depois `GDD.md` → `TECH.md` → `ASSETS.md`.

---

## ⏭️ ONDE PARAMOS — e o que fazer primeiro amanhã

**Jogável hoje, do começo ao fim:** Fase 1 → cutscene da Aurora → Fase 2 → **cutscene da Doca
Kepler-9** → tela de vitória (a Fase 3 ainda não existe).

**A FASE 3 ESTÁ CONSTRUÍDA E JÁ PASSOU PELO 1º PLAYTEST** (2026-07-18) — a campanha joga
F1 → Aurora → F2 → Doca → **F3 (nebulosa → casco+aranha → SERPENTE em 4 formas → vitória)**.
O Henrique jogou, apontou 3 problemas, e TODOS foram corrigidos na mesma sessão (ver o bloco
da sessão, abaixo — o mais importante era ESTRUTURAL: a ordem das cabeças). **AO RETOMAR:
o Henrique vai trazer o feedback do playtest PÓS-correções** — espere ajustes de balanceamento
fino (densidade da nebulosa/véus: `alpha`/`gap` no `buildNebula`; cadências da serpente:
`cdPrincipal` por fase em `BossSerpente.atacar`; pulo/HP da aranha: `updateAranha` e DEFS no
EnemySystem). Cenário da F3 já foi APROVADO por ele ("bem montado"). Depois do fino: a
**FASE 4 — O Interior** (o flap volta). Atalhos: `[M]` = F3 inteira, `[N]` = treino da serpente.

### 🆕 Sessão 2026-07-18 (parte 2) — FASE 3 + correções do 1º playtest dela

- **A ORDEM DAS CABEÇAS É AZUL → VERDE → LARANJA, E ISSO É ESTRUTURAL.** No 1º playtest a
  vulnerável era a laranja (fundo direito): o jogador chega pela ESQUERDA, o corpo ABSORVE
  tiro, e a bala morria no casco antes de alcançá-la — chefão invencível, campanha travada.
  Correção tripla: (1) estados REGERADOS na ordem nova (`serpente-2c` = sem a ciano,
  `serpente-1c` = só a laranja erguida — os PNGs antigos foram substituídos, mesmas chaves);
  (2) o corpo-absorvedor agora cobre SÓ AS ROSCAS (metade de baixo — `ajustarCorpo()`), com a
  faixa das cabeças de corredor livre; (3) `probe-stage3` ganhou o teste que faltava:
  **alcançabilidade por BALA REAL em cada fase** (a 1ª sonda dava dano via `boss.damage()` e
  por isso não pegou o bug — armadilha 19 em versão nova: sonda que pula a balística não
  testa a luta). Verbos por cor mantidos: ciano=investida, verde=leque, laranja=rajada.
- **A serpente EMERGE do Leviatã** (pedido do playtest): mais central (STATION_X 252), mais
  baixa (BASE_Y 124, ondulação 14), com a BRECHA — 3 placas `derelict` escuras na frente da
  base dela (depth 35, viajam junto) escondendo a parte de baixo do corpo.
- **A aranha PULA** (pedido do playtest): ciclo andar/atirar + a cada ~7s telegrafa (agacha
  piscando), SALTA num arco mirado no lado do jogador (anim `aranha-jump`, mesma caixa do
  walk — sem salto de sprite) e aterrissa com ANEL radial de 6 tiros + shake. O leque de 3 e
  o anel são o combo dela.
- F3 completa da sessão: modo `nebulosa` (3 camadas + véus, `setNebulaDensity` — sair da
  nuvem e revelar a banda `casco` são o MESMO fade), `STAGE_3` em dois atos, aranha como
  `EnemyKind` roteirizado (`miniboss`), contrato `StageBoss.targets[]`, `BossSerpente` com
  4 fases de anatomia (50+50+50+60), cotos fumegando, cadeias de explosão, convulsão →
  FUSÃO 15% maior. `[M]`/`[N]` no menu dev. `find-cabecas.mjs` mede as cabeças por COR.

### Sessão 2026-07-17/18 (parte 1) — RÓSTER v2, 7 ARMAS, EFEITOS e PASSE VISUAL

A maior sessão do projeto. Tudo validado por sonda e aprovado em partes pelo Henrique ao longo
do caminho; commit único no fim.

- **RÓSTER v2 (src/ships.ts).** SETE naves novas, todas de PERFIL (arte PixelLab instalada +
  animação de propulsão cada): o **JATO** (X-wing 40px, 38×22 em jogo) é a nave INICIAL da
  campanha (`DEFAULT_SHIP`); a Aurora libera **verde/creme/cinza** (`ROSTER_AURORA`, 4 com o
  jato); a Doca soma **branca/alien2/Arauto** (`ROSTER_DOCA`, 7); a **canhoes** (4 canos) está
  em `ROSTER_FINAL` e SÓ entra quando a fase final existir. As 3 naves antigas viraram legado
  (defs mantidos, fora dos rósters). A **cinza (FANTASMA)** usa a arte ORIGINAL da 1ª nave
  (anim de 7 quadros — o `FRAMES` dela é 7, não 9). O ShipPanel ganhou fileira ADAPTATIVA
  (passo encolhe p/ caber 7 slots) e a barra de DANO subiu o teto para 5 (o obus).
- **7 ARMAS-BASE novas (WeaponSystem).** tracer (DUPLO CADENCIADO do jato: 2 canos paralelos,
  munição TRAÇANTE vermelha/laranja `tracerRound` 8×1 desenhada no Boot — spec do Henrique),
  obus (dano 5 lento), agulha (6/s fina), salva (rajada 3×dano 2 + pausa 0.8s — dano 2 porque
  a 1 a média caía p/ 3.1 dps), perfurante (ATRAVESSA inimigos, 1 hit por inimigo por
  projétil, morre em rocha), bateria (4 canos ±2°), lamina (onda TEAL alta). Extensões
  opcionais no `WeaponDef`: `muzzles`/`burst`/`pierce`/`bulletScaleY`/`tint` +
  `stretchX`/`glow`/`muzzleFlash` (peso visual, hitbox compensada). Hitbox de bala tem PISO de
  3px (o traçante de 1px de arte atravessava sem tocar). **`scripts/probe-armas.mjs`** mede
  as 7 em jogo (13 asserts) — ela já pegou a si mesma coletando pickup no meio da medição.
- **EFEITOS.** Cometa da Torre girado no vetor de voo (arte aponta +40°; corpo virou CÍRCULO
  r=4.5 na bola, não na cauda); traçante da Capitânia com ADD+trilha+flash; **torres de solo
  atiram MÍSSEIS** (chave `missile`, arte PixelLab 30×11 a escala 0.8, hitbox e velocidade
  FECHADAS compensadas); tiro de drone com glow; estilhaços de mina/flak com ADD; **Enxame com
  trail teal** (a curva finalmente é visível); Lança esticada 1.8× (dano 3 aparece); obus pulsa.
- **FLAK EM DOIS TEMPOS** (pedido do Henrique): a salva da fúria lança **2 cápsulas + a 3ª
  após 3s** (`lancarCapsulas`), com guarda contra chefão morto. `probe-flak.mjs` conta no
  lugar certo agora.
- **CUTSCENES.** A nave que CHEGA em cada cutscene é a REAL (o jato na Aurora; a escolhida na
  Doca). O `deckRim` da Aurora cobre SÓ o vão opaco do convés (arte x=19..102 — media 384px e
  flutuava sobre a lua: a "linha estranha"). A doca ganhou PLATAFORMA de rocha na base da cena
  + feather do topo esquerdo (passe 4 do `feather-doca.mjs`).
- **PARALLAX / passe visual.** Primeiro plano de `0x05070f` → `0x121a2e` (era mancha preta);
  camadas aceitam `tints[]` por sprite (nebulosa azul/violeta/petróleo; cinturão com
  ferrugem); **tráfego distante** da colônia na F1 (silhuetas de batedor, faixa alta, fator
  0.08); `setForegroundDimmed()` apaga o primeiro plano nas lutas de chefão (fica nas fases —
  é dificuldade; nos chefões tapava a leitura). Camadas novas de fundo: **skyline da colônia**
  (F1) e **casco morto** (F2) + **cometa raro** (ver ART/Parallax).
- **CHÃO DA F1** (pedido final da sessão): o "trilho" de rebites virou **rocha rachada** —
  `ground-tile.png` novo é `[arte | arte espelhada]` (128×48, emenda invisível por espelho;
  só ~10px aparecem: GROUND_Y = 216−10, então a banda escolhida da arte é a de rachaduras
  densas e o tile vai SEM tint). Camada de **entulho** no solo (asteroid pequeno, factor 1.0,
  tint do chão) quebra a repetição. E a fumaça dos mísseis das torres trocou `spark` (quadrado
  2×2 — aparecia como CAIXAS na boca do cano) pela partícula **`puff`** redonda do Boot.
- **SONDAS.** `probe-interlude.mjs` estava APODRECIDA (lia campos extintos e nunca confirmava
  a escolha — não media nada) → modernizada com asserts reais. `probe-doca` escolhe o Arauto na
  tecla **7**. Fase 1 abre com TRAÇANTE no HUD.
- **PixelLab:** lições novas **16 e 17** no `assets/raw/prompts.json` — a vista lateral
  FUNCIONA com `view: sidescroller`, e a REFERÊNCIA dita câmera E tamanho (a maior style_image
  define o tamanho da saída; p/ 32px a referência tem que ter 32px).

### O que mudou na sessão anterior (2026-07-15)

Correção de um mal-entendido da sessão anterior + acabamento da cutscene da Doca:

- **A arte da DOCA foi TROCADA.** O agente havia instalado o objeto errado (`d3f448af`); o Henrique
  tinha escolhido o **`2de00dd3`** (o outpost LARGO e denso). Agora é esse. A **pista foi
  remedida** — nesta arte ela não "salta para o vazio", está EMBUTIDA no centro-direita, e só se
  acha pela COR (as marcações são VERMELHAS): `PAD_ROW=90`, `PAD_X0=94`, `PAD_X1=144`, arte 160×160,
  `SCALE=1.5`. Ferramenta nova: `node scripts/find-pad.mjs doca 80`.
- **BORDA RETA esfumada.** A arte nova é densa e a rocha vai até as bordas do quadro → parada contra
  o vazio, os cortes retos liam como "caixa de PNG". `node scripts/feather-doca.mjs` esfuma SÓ a
  rocha nas bordas (nunca as estruturas nem a pista). ⚠️ **É obrigatório rodar depois de reinstalar
  a doca.**
- **PLANETA EXPLODINDO no fundo** (`33a331de` → `planet-shattered.png`): o Henrique pediu asteroides
  ao fundo da cutscene. É o mundo partido com o núcleo em lava — a causa do cinturão, vista de
  perto. Entra na `Interlude2Scene` (depth −85, `setFlipX`, tint escuro), no céu à direita.
- Verificado com `node scripts/probe-doca.mjs`: pousa NA PISTA (x=209,y=144), róster com o Arauto,
  cabos arrebentam, textura da nave troca certo. `npm run typecheck` limpo.
- **PixelLab: nada gerado** (só instalei objetos que já existiam). Saldo intacto **~$5.43**.

**A Fase 2 foi jogada e APROVADA pelo Henrique** depois do rebalanceamento: *"a fase 2 tomou outra
dimensão, tanto visual quanto de dificuldade; as minas de aproximação casaram com a progressão; o
chefão ficou ótimo"*. O flak da Capitânia também foi confirmado em jogo. **Não mexa nesses números
sem um motivo novo.**

### O PRÓXIMO PASSO É A FASE 3 — e a ordem já está decidida

1. **A NEBULOSA primeiro** (o Henrique pediu o impacto visual antes de tudo): a fase abre *dentro*
   de uma nebulosa. É o que tira o jogo do tom monótono que ele arrasta desde a Fase 1.
2. **Regerar a ARANHA de lado** (ela veio de frente e com moldura pintada no PNG) — usando a atual
   como `style_images`.
3. **Fazer os ATAQUES da serpente** (o idle dela já está pronto e bom).
4. Montar `STAGES[3]` com os **dois atos** e ligar a `Interlude2Scene` nela.

Tudo isso está detalhado em **"A FASE 3 — O CASCO"**, mais abaixo. **Leia aquela seção antes de
gerar qualquer arte** — ela explica por que a serpente é o chefão e a aranha é o mini-boss, e a
razão não é estética, é física (a aranha ANDA, e precisa de chão).

⚠️ **`STAGES[3]` NÃO EXISTE.** Enquanto não existir, a `Interlude2Scene` termina a campanha na tela
de vitória. Se ela chamar a `GameScene` com `stage: 3` antes da hora, a rede de segurança
`STAGES[x] ?? STAGES[1]` despeja o jogador na **Fase 1** — sem aviso, depois de ele ter vencido a 2.

**Saldo PixelLab: ~$0.91** (2026-07-18, fim da sessão da F3 — as gerações da assinatura
ACABARAM: tudo sai do crédito, inclusive animações a ~$0.09 cada. A arte da F3 está completa;
o que resta de saldo é para AJUSTES do playtest e o começo da F4. Orce antes de gerar).

---

## O que é o projeto

Remaster de *Alien World v2* (Unity, 2024). **O projeto Unity original está PERDIDO** — sobrou só
o build compilado em `AlienWorld_v2/`. Portanto isto é um **rebuild**, não um port.

**Stack:** TypeScript + Phaser 3 + Vite. `npm run dev` → http://localhost:5173

---

## ROADMAP

| # | O quê | Estado |
|---|---|---|
| 1 | **Fase 1 — A Decolagem** | ✅ jogável, arte e música finais |
| 2 | **Interlude** (pouso + escolha de nave) | ✅ jogável, arte final |
| 3 | **Fase 2 — Frota Morta** | ✅ jogável, arte final |
| 4 | **BALANCEAMENTO por humano** | 🔶 **1ª rodada aplicada — ver abaixo** |
| 5 | Menu inicial com a moldura nova | ⬜ |
| 6 | Animações dos sprites da Fase 2 | ✅ |
| 6b | **2ª cutscene** (Doca Kepler-9) + **nave ALIENÍGENA** | ✅ jogável (`[O]` no menu) |
| 6c | **RÓSTER v2** (7 naves de perfil + 7 armas-base) | ✅ (2026-07-18) |
| 6d | **Efeitos de projétil + passe visual** das Fases 1-2 | ✅ (2026-07-18) |
| 7 | **Fase 3 — O Casco** | ✅ **construída (2026-07-18) — pendente playtest humano** |
| 8 | **Fase 4 — O Interior** (o flap VOLTA) | ⬜ |
| 9 | Score acumulado entre fases | ⬜ |
| 10 | Modo Sobrevivência (Legacy) | ⬜ |
| 11 | Deploy (itch.io, build estático) | ⬜ |
| 12 | Mobile/touch | ⬜ (decisão: desktop primeiro) |

### 🔶 1ª RODADA DE BALANCEAMENTO — o que mudou, e por quê

Veio do **primeiro playtest humano da Fase 2** (Henrique). O diagnóstico dele, e a resposta:

| O que ele achou | O que foi feito |
|---|---|
| A Fase 1 está difícil, mas passável | **Não mexi.** "Difícil mas passável" é o alvo — mexer nisso é estragar o que funciona. |
| O chefão da Fase 1 é fácil **com a mini-gun** | A HMG ganhou **cano giratório + superaquecimento** (abaixo). A Torre subiu só de 130 → **150** de vida. |
| A Fase 2 ficou **mais fácil** que a Fase 1 | Entrou a **MINA SENSORA** — o perigo que faltava. E o roteiro ficou mais denso. |
| O flak da Capitânia | Refeito: ela **arremessa uma cápsula num ponto sorteado**, e é o **estouro** que cospe os estilhaços. |
| Os destroços do cemitério têm **base de chão** | Arte nova: casco **rasgado à deriva** (`destroco`), não a nave caída da Fase 1. |
| O parallax do fundo é **igual ao da Fase 1** | Fundo novo: **faixa do cinturão** + **planeta partido** (a causa do lugar). |

### ✅ VALIDADO EM JOGO (playtest do Henrique, 2026-07-14)

*"A Fase 2 tomou outra dimensão, tanto visual quanto de dificuldade. As minas de aproximação
casaram muito bem com a progressão de dificuldade esperada. O chefão da Fase 2 ficou ótimo."*
O flak novo (cápsula → estilhaços) também foi confirmado em jogo.

**Estes números estão FECHADOS até haver um motivo novo.** Não os mexa "para melhorar".

O que **ainda** é chute calibrado no olho: a vida da Capitânia (150), a do cargueiro (24), o dano 3
da Lança e o alcance 110 do Dispersor. E o **ENXAME** (a arma alienígena, nova) **nunca foi jogado
por um humano** — a curva de 150°/s é a trava dele, e é exatamente o tipo de número que só se
descobre errado jogando.

### O flak é conteúdo de FIM DE LUTA — e isso é uma escolha, não um bug

O Henrique relatou que a barragem "nunca aparecia". Ela aparece: o flak só existe na **fúria
(<50% de vida)**, e ele ainda não tinha levado a luta até lá. Uma sonda confirmou o mecanismo na
luta real (5 salvas, 15 cápsulas, 12 estouros, nenhuma perdida).

Mas isso expõe uma consequência: **quem morre na 1ª metade da luta nunca vê um padrão inteiro da
Capitânia.** Se um dia isso incomodar, o ajuste é **subir o limiar da fúria** (50% → ~60%) —
**nunca** antecipar o flak para a fase inteira: dois padrões competindo por atenção desde o
primeiro segundo não é difícil, é **ilegível**.

### A MINI-GUN: giro e calor (`src/systems/WeaponSystem.ts`)

**O problema nunca foi o dano dela — foi ela não COBRAR nada.** 18 tiros/s, de graça, no frame em
que o dedo desce. Não havia decisão: havia um botão de vencer. Baixar o dano só a transformaria
numa Pulse pior, e aí ninguém a pegaria.

Agora ela cobra duas coisas: o cano **GIRA** (custo de abrir fogo) e ele **ESQUENTA** (custo de
manter). O DPS de pico continua brutal — ele só não é mais grátis nem eterno.

⚠️ **O `cool` (dissipação do calor) É A TRAVA DO EXPLOIT, e o número foi MEDIDO.** A defesa óbvia
contra superaquecer é metralhar em toques curtos. Com `cool: 0.28`, a sonda mostrou que
tamborilar o gatilho (0.4s liga / 0.4s desliga) subia o calor só **+0.026 por ciclo** — a munição
acabava antes de a arma travar, e **o nerf existia no papel e não existia em jogo**. A 0.15 o
mesmo tamborilar acumula ~+0.08 e trava em ~10s.

**A promessa da arma é uma só: tamborilar ADIA o travamento, nunca o evita.** Quem mexer nesses
números **roda `node scripts/probe-hmg.mjs`** — ele faz exatamente o que o jogador faria para
trapacear, e diz se o furo voltou. *Não dá para verificar isso lendo o código:* o calor sobe por
TIRO e cai por SEGUNDO, e quem decide o resultado é a razão entre as duas taxas no ritmo real.

No **FLAP o gatilho é automático** — lá ela entra girando e esquenta sozinha. É uma arma que se
GASTA, e é assim que tem que ser.

### A MINA SENSORA: a peça que faltava na Fase 2 (`src/systems/DebrisSystem.ts`)

A Fase 2 era mais fácil que a Fase 1 por um motivo **estrutural**: o espaço dela é ABERTO. Sem
chão, o corredor não aperta, e todo perigo dela **vem até você** (drone, kamikaze, cargueiro) —
coisas que se resolvem apontando para a frente e atirando.

Faltava um perigo que **punisse o CAMINHO**. A mina sensora não persegue nem atira: ela fica
parada e cobra pedágio do espaço em volta. Ao passar perto ela ACORDA, pisca 0.7s e **estilhaça em
leque**.

- **A resposta certa é atirar ANTES.** O pavio é curto de propósito: é tempo de MATAR a mina, não
  de fugir dela. Um pavio longo daria a saída errada (recuar) e ela viraria mais um estorvo a
  contornar — que é o que a fase já tem demais.
- **Ela NÃO estilhaça quando é abatida.** Se atirar nela também cuspisse o leque, atirar e não
  atirar dariam no mesmo, e a única decisão que a peça oferece deixaria de existir.
- Os estilhaços são **tiros inimigos de verdade** (saem do pool do `EnemySystem`): eles morrem na
  rocha pelo mesmo overlap, então **um destroço entre você e a mina te protege** — de graça.

### O FLAK DA CAPITÂNIA: a cápsula vai a um PONTO, não numa direção

A 1ª versão cuspia 4 granadas num leque fixo a partir da proa, e isso tinha um defeito fatal para
um ataque de área: **era um padrão decorável**. Sempre os mesmos ângulos → depois de dois ciclos o
jogador sabia de cor onde ficavam os corredores vazios, e "desviar do futuro" virava "lembrar do
passado".

Agora ela **escolhe um ponto da tela e ARREMESSA a cápsula até lá** — a velocidade é calculada a
partir do destino (`(alvo − boca) / tempo`), e não o contrário. O ponto é sorteado a cada tiro, com
um **viés parcial** para a metade em que o jogador está: pontos puramente aleatórios cairiam no
vazio quase sempre e o jogador aprenderia a ignorar a barragem inteira. **Viés, nunca mira** — uma
cápsula que persegue não se desvia, ela se sofre.

A cápsula **não fere ninguém**: ela é o telégrafo viajando. Quem mata é o **anel de estilhaços que
nasce onde ela estoura** — e o anel é rodado por um ângulo sorteado, senão os buracos dele também
seriam decoráveis.

---

## Estado atual: FASES 1 e 2 + as DUAS cutscenes, encadeadas

**Fase 1 — A DECOLAGEM** (~75s). Rasante na lua → colônia → torres de solo → fogo cruzado →
**TORRE DE DEFESA** → atmosfera rompe → zero-G.

**Fase 2 — FROTA MORTA** (~78s). O vácuo: cinturão de asteroides e os destroços da sua própria
frota. Voo **LIVRE** do começo ao fim — o jogador herda a zero-G que acabou de ganhar.
Asteroides → destroços → **minas sensoras** → kamikazes → cargueiro → enxame → **CANHONEIRA-CAPITÂNIA**.

A campanha **encadeia sozinha**, sem passar pela tela de fim:

```
matar a Torre → atmosfera rompe → o jogador VOA na zero-G (controle NA MÃO dele)
              → placar da fase
              → CUTSCENE 1 — assistida, SEM tecla de pular:
                  "PILOTO AUTOMÁTICO · ENGATADO"  ← explica o controle travado
                  a nave voa sozinha → POUSA no convés da AURORA
                  ESCOLHA DE NAVE (3 naves humanas)  ← o único input da cena
                  a Aurora IMPLODE → a nave decola → FASE 2

matar a Capitânia
              → placar da fase
              → CUTSCENE 2 — a DOCA KEPLER-9 (mineração encravada na rocha):
                  a doca entra grande, cabos segurando asteroides
                  a nave POUSA NA PISTA
                  ESCOLHA DE NAVE (4 — entra o ARAUTO, a nave ALIENÍGENA)
                  a doca EXPLODE, os cabos arrebentam → FASE 3 ⛔ (ainda não existe)
```

**Cada cutscene queima a ponte por onde o jogador veio.** A Aurora implode e vira o cinturão da
Fase 2 (a Frota Morta é o cadáver da sua própria frota). A Doca cai depois que você tira dela a
única coisa que importava — a nave alienígena. É o mesmo verbo, com causas diferentes: a Aurora
cai por dano de batalha; a Doca cai porque você já pegou o que foi buscar.

**O fundo conta a história** (GDD §7): na Fase 2 a Lua de Kepler **encolhe** (1.25 → 0.45) e o
Leviatã **cresce** (0.5 → 1.15). É `Parallax.setApproach()`, alimentado com `elapsed / bossTime`.
Vender ESCALA é o mais difícil em pixel art, e estes dois sprites fazem isso sozinhos.

### Decisões de design fechadas (NÃO reabrir)

1. **A condução é DIEGÉTICA.** Não é opção de menu, é física do lugar: atmosfera tem gravidade →
   **FLAP**; vácuo não tem → **LIVRE**. O jogador não escolhe o flap, a gravidade o impõe.
   O menu pergunta *quem decide*: `diegetico` (padrão), `flap` (Legacy, ×1.25) ou `free`.
2. **A campanha é uma aproximação:** superfície da lua → espaço → casco do Leviatã → interior dele.
3. **A zero-G é a RECOMPENSA por matar o chefão**, não um evento no meio da fase.
   ⚠️ **A cutscene NÃO a atropela:** o jogador voa na zero-G com o controle na mão, e só DEPOIS a
   interlude assume o manche. A cutscene **continua** o voo — a nave nunca para no ar.
4. **Tiro automático no Flap** (`FlightController.autoFire`). Não dá para atirar e flapear ao mesmo
   tempo; o sabor Metal Slug vem da variedade de armas e do volume de inimigos, não do gatilho.
5. **Armas modelo Metal Slug:** base infinita + especiais com munição limitada; perde ao morrer.

---

## Atalhos de DEV (só em `import.meta.env.DEV`)

| Tecla | Onde | O quê |
|---|---|---|
| `B` | menu | treino do chefão da FASE 1 (pula os 68s de fase) |
| `C` | menu | treino da **CANHONEIRA-CAPITÂNIA** |
| `N` | menu | treino da **SERPENTE** (as 4 formas + fúria) |
| `V` | menu | entra direto na **FASE 2** |
| `M` | menu | entra direto na **FASE 3** (nebulosa → casco → serpente) |
| `I` | menu | entra direto na **CUTSCENE 1** (Aurora: pouso + escolha de nave) |
| `O` | menu | entra direto na **CUTSCENE 2** (Doca Kepler-9 + a nave ALIENÍGENA) |
| `G` | jogo | pula da fase atual direto para o chefão dela |
| `1` `2` `3` | jogo | equipa Pulse / HMG / Shotgun |
| `4` | jogo | equipa o **ENXAME** (a arma alienígena) — é a que mais precisa de playtest |

⚠️ **São CORTA-CAMINHOS. Remover quando o balanceamento fechar.**

**O treino (`B`) SEGUE a campanha ao vencer.** Antes ele caía na tela de fim — e como é o único
jeito rápido de chegar ao chefão, **a cutscene ficava inalcançável**. Vencer segue a campanha;
**morrer** continua repetindo a luta.

---

## ⚠️ FERRAMENTA MAIS IMPORTANTE: o probe

```bash
npm run probe                    # Fase 1: joga, devolve estado + screenshot
node scripts/probe-armas.mjs     # as 7 ARMAS-BASE do róster v2: cadência real + assinatura de cada uma
node scripts/probe-stage2.mjs    # Fase 2: cinturão, inimigos novos, Capitânia
node scripts/probe-stage3.mjs    # FASE 3 inteira: nebulosa → casco+aranha → as 4 FORMAS da serpente → vitória
node scripts/find-cabecas.mjs    # os offsets das CABEÇAS da serpente, por COR (a fonte dos números do boss)
node scripts/probe-capitania.mjs # o chefão da Fase 2 nas DUAS fases (salva rolante / flak)
node scripts/probe-interlude.mjs # a cutscene: placar → pouso → escolha → implosão → Fase 2
node scripts/probe-chain.mjs     # a CORRENTE: Fase 1 → atmosfera rompe → zero-G → Interlude
node scripts/probe-menu.mjs      # screenshot do menu
node scripts/probe-hmg.mjs       # a MINI-GUN: giro, calor e o exploit do tamborilar
node scripts/probe-mina.mjs      # a MINA SENSORA: passar perto dói / atirar nela é seguro
node scripts/probe-flak.mjs      # o FLAK na luta REAL: nasceu / estourou / foi absorvido?
node scripts/probe-fundo.mjs     # o que EXATAMENTE está desenhado no fundo, e onde
node scripts/probe-doca.mjs      # a 2ª cutscene: pousa NA PISTA? o Arauto está no róster?
node scripts/find-pad.mjs doca 80  # acha a PISTA na doca pela COR (marcações vermelhas)
node scripts/feather-doca.mjs      # esfuma as bordas cortadas da doca (rode DEPOIS do install)
node scripts/sheet.mjs <id> <saida.png> <índices...>   # amplia candidatos do PixelLab
```

Ele expõe o jogo em `window.__game` (só em dev). **Use o probe antes de teorizar** — os bugs
sérios do projeto foram todos achados por ele, e nenhum teria sido achado lendo código.

### ⚠️ A LIÇÃO MAIS CARA: a sonda NÃO é um jogador

A cutscene **não tem tecla de pular**, e isso é de propósito. A primeira versão tinha
`[ESPAÇO] pular` — e o ESPAÇO **comeu a cutscene inteira** na primeira vez que um humano jogou.

O ESPAÇO é a tecla mais martelada do jogo e é usada **sem parar nesta transição**: na Fase 1
(flap) é o impulso; depois que a atmosfera rompe (voo livre) vira o **gatilho**. O jogador chega
na interlude com o dedo no espaço, a cena é pulada no primeiro frame, e ele cai na Fase 2 sem
ver nada.

**Duas tentativas de conserto FALHARAM:** um *delay* de 1s (ele continua martelando depois de 1s)
e exigir um `keyup` (quem flapa **tecla e solta** dez vezes por segundo). O erro não era a trava —
era **existir a tecla**.

**A moral:** eu tinha documentado este risco *para a sonda* e **não liguei ao jogador humano**,
que faz a mesma coisa. Uma sonda que "passa" não prova que a cena é jogável, só que ela roda.
**Quando uma cena depende de INPUT, pergunte o que o jogador está apertando no frame em que ela
abre.**

### A sonda não sabe jogar

No flap, parar de flapar é cair e morrer — a sonda morria, o `ESPAÇO` reiniciava pela tela de fim,
e o teste virava um teste do GameOver. Em `probe-chain.mjs` toda espera é feita **flapando** e as
vidas são forçadas para cima: testa-se a TRANSIÇÃO, não a habilidade de quem está no controle.
Lembre que **a morte devolve a arma base** — uma sonda que bate nos picos volta para a PULSE.

E no MENU, `1` `2` `3` **iniciam a partida** (diegético/flap/free) — `ESPAÇO` ali não faz nada.

---

## Como uma FASE é montada (leia antes de fazer a Fase 3)

A `GameScene` **não conhece fase nenhuma**: ela recebe uma `StageDef` e a executa. Acrescentar uma
fase é acrescentar uma entrada em `STAGES` (`src/systems/StageDirector.ts`) — não há
`if (fase === 2)` na cena.

```ts
STAGES[2] = { id, name, script: STAGE_2, zone: 'vacuo', music, next: null, interlude: null }
```

- **`zone`** decide a condução no modo diegético (`atmosfera` → flap, `vacuo` → livre).
- **Obstáculos são DOIS sistemas, porque são duas físicas:**
  - `TerrainSystem` — ancorado no chão (origem na base, `y = GROUND_Y`). Evento `terrain`.
  - `DebrisSystem` — **flutua**: nasce em qualquer altura, gira e deriva. Evento `hazard`.
  Os dois existem sempre; o roteiro decide qual é alimentado. Grupo vazio não custa frame.
- **`Parallax`** tem dois modos: `superficie` (montanhas + solo + picos na frente) e `espaco`
  (sem chão; pedra à deriva nas duas camadas, lua e Leviatã).
- **O chefão é da fase.** Ambos cumprem `StageBoss` (`src/entities/Boss.ts`) — é tudo o que a cena
  precisa saber.
- **`interlude`** é a cena que roda ENTRE esta fase e a próxima. É o encaixe da cutscene: nem a
  fase que sai nem a que entra sabem que ela existe.

### O verbo muda entre as fases

Na superfície o obstáculo se **DESVIA** (o `spire` é indestrutível). No vácuo ele se **ABATE**
(o `asteroid` morre; o `destroco` não). É o que diferencia as fases sem inventar mecânica nova.

### O cenário é COBERTURA — nos dois lugares

Tiro inimigo morre na rocha. Na Fase 1 é o relevo; na Fase 2 o destroço é a **única** cobertura
que existe. Sem isto, várias torres somadas viram uma parede de balas impossível de desviar.
Há uma **carência de 16px**: o projétil só é absorvido depois de andar — senão uma torre colada
numa rocha tem o tiro destruído no frame em que ele nasce ("às vezes o tiro não sai").

---

## A CANHONEIRA-CAPITÂNIA (chefão da Fase 2) — leia antes de mexer

**Ela não ensina nada novo: ela COBRA o que a fase ensinou.** Os kamikazes que perseguiram o
jogador a fase inteira **saem de dentro dela** — ela é o hangar deles. O inimigo ganha procedência,
e o faseamento vira preparação para a luta.

**O ritmo é a identidade.** A Torre da Fase 1 é um METRÔNOMO (um leque a cada 1.9s, sempre igual).
Copiar essa gramática daria dois chefões com o mesmo verbo, só que um maior. A Capitânia é um
NAVIO: **salva e silêncio**.

| | Ciclo | O que faz |
|---|---|---|
| **inteira** (100–50%) | 4.2s | larga 2 kamikazes → **salva rolante** (proa→ventral→ponte, rajadas de 3) → **2.8s de silêncio** |
| **fúria** (<50%) | 3.4s | larga 3 → onda apertada → **BARRAGEM DE FLAK** → rajada mirada → 1.3s |

- **O SILÊNCIO NÃO É GENEROSIDADE, É ESTRUTURA.** É nele que o jogador caça os interceptadores.
  Sem pausa, largar kamikazes no meio de fogo contínuo é ruído injusto e a mecânica morre.
  **Se for reequilibrar, encurte a pausa — nunca a elimine.**
- **O flak só existe na fúria**, de propósito. Ele pergunta "onde você VAI estar" (a granada
  estoura num ponto); a onda pergunta "de que lado do casco você está". Dois padrões competindo
  por atenção desde o primeiro segundo não é difícil, é **ilegível**. Ele entra quando o jogador
  já sabe ler a onda.
- **O projétil é metade da identidade de um chefão.** Ela atira **traçantes magenta** (`bolt2`),
  não a bola de fogo `comet-burn` — essa é a assinatura da Torre.
- **Teto de 5 kamikazes** (`MAX_KAMIKAZES`). Sem ele o acúmulo mata o jogador, não a luta.
- Ao morrer ela **apaga as granadas no ar**: uma barragem que estoura depois do chefão morto mata
  o jogador na tela de vitória.

---

## A 2ª CUTSCENE — a DOCA KEPLER-9 (e a nave alienígena)

Entre a Fase 2 e a Fase 3. Atalho de dev: **`[O]`** no menu. Sonda: `node scripts/probe-doca.mjs`.

**A 1ª interlude era uma PERDA** (a sua frota implode). **Esta é um ACHADO:** uma mina encravada
na rocha, viva, com pistas acesas — e um **caça alienígena encalhado na doca**. É a primeira vez
que o jogador põe a mão na tecnologia do inimigo, e é o arco de quem vai caçar o Leviatã. A doca
explodir depois não repete a Aurora: *a Aurora caiu por dano de batalha; esta some porque você
tirou dela a única coisa que importava.* A campanha é uma queima de pontes.

- **A doca é o CHÃO** — o mesmo truque da Aurora. E a **linha da pista é MEDIDA** no PNG. A arte
  ATUAL (`2de00dd3`, 160×160, a que o Henrique escolheu) é densa e a pista está EMBUTIDA no
  centro-direita — não dá para achá-la pelo perfil de opacos como na arte antiga; acha-se pela COR
  (marcações VERMELHAS): `PAD_ROW = 90`, `PAD_X0 = 94`, `PAD_X1 = 144`. **Remedir se a arte trocar:**
  `node scripts/find-pad.mjs doca 80`.
- ⚠️ **A doca precisa do FEATHER** (`node scripts/feather-doca.mjs`) depois de instalada. A arte vai
  até as bordas do quadro; parada contra o vazio, o corte reto lê como caixa de PNG ("borda reta é
  veneno"). O feather esfuma só a rocha nas bordas. **Rode-o toda vez que reinstalar a doca.**
- **O planeta explodindo** (`planet-shattered`, `33a331de`) é o grande fundo dramático da cena
  (depth −85, no céu à direita). É a causa do cinturão, vista de perto.
- **Os cabos são DESENHADOS, não sprites.** Um cabo liga duas coisas que se mexem (a doca desliza,
  a rocha balança): um PNG esticado entre elas seria uma barra rígida. Eles têm **barriga**
  (catenária), 3px de corpo e 1px de luz — reta perfeita lê como viga, não como cabo.
- ⚠️ **A doca fica ACIMA do primeiro plano do parallax (depth 60).** Numa fase, aquelas pedras
  quase pretas na frente da nave vendem profundidade; numa cutscene elas **tapam a pista**, que é
  a única coisa que a cena existe para mostrar (a sonda pegou duas cobrindo metade da plataforma).

### ⚠️ A ANIMAÇÃO SOBRESCREVE A TEXTURA — e isso escondia um bug nas DUAS cutscenes

Ao confirmar a nave, o `setTexture()` durava até o próximo quadro de `ship-thrust`, e o Phaser
repunha `shipAnim*` por cima. **O jogador escolhia o Arauto, lia "ARMADA", e decolava no
Interceptor.** A escolha *funcionava* (a nave certa ia para a fase) — só a **imagem mentia**, e
mentia exatamente no beat que existe para mostrar o que ele acabou de armar. Bug silencioso, vivo
desde a 1ª interlude; ninguém pega isso a olho num sprite de 30px que decola em 1,7s. Achado pela
sonda, que compara a textura DEPOIS da escolha. **Pare a animação antes de trocar a textura.**

## A NAVE ALIENÍGENA — o ARAUTO (arma `enxame`)

⚠️ **Mira automática é a mecânica mais perigosa de um shmup**: se o tiro sempre acerta, MIRAR
deixa de ser habilidade — e mirar é metade do que o jogador faz. Uma arma que nunca erra não é uma
escolha, é um modo fácil disfarçado.

**A trava é a CURVA, e ela é lenta de propósito** (`HomingDef.turn = 150°/s`). O projétil não
persegue: ele **corrige**.

| | as outras 3 armas | o ENXAME |
|---|---|---|
| alvo GRANDE e LENTO (cargueiro, mina, chefão) | fácil | **impossível de errar** |
| alvo PEQUENO e RÁPIDO (batedor, kamikaze) | difícil | **quase sempre erra** |

É o eixo invertido — por isso ela é um **sidegrade**, e não um upgrade. Somada ao dano 1 e à
cadência 4, ela é péssima para limpar enxame (o que a Fase 2 mais cobra) e ótima para derreter
casco enquanto você desvia: a mão fica livre.

Ela persegue **inimigo e chefão, nunca rocha** (`GameScene.homingTargets`) — um teleguiado que se
joga no primeiro asteroide da frente seria uma arma que se sabota sozinha.

**O róster cresce com a campanha** (`src/ships.ts`): a Fase 1 é sempre o JATO, a Aurora oferece
4 naves, a Doca oferece 7 (róster v2). O Arauto não existe no hangar humano porque ele não teria
de onde ter vindo.

## A FASE 3 — O CASCO (✅ CONSTRUÍDA em 2026-07-18; pendente: playtest humano)

`STAGES[3]` existe: dois atos (`STAGE_3`), modo `nebulosa` no Parallax (com `setNebulaDensity`
— sair da nuvem e revelar a banda do `casco` são o MESMO fade), a ARANHA como `EnemyKind`
roteirizado (`miniboss`, 50 HP, estaciona no casco e cospe leques de 3), e a **BossSerpente**
(`src/entities/BossSerpente.ts`): contrato `StageBoss.targets[]` (multi-parte), 4 fases de
ANATOMIA (laranja/rajada → ciano/investida → verde/metrônomo → FUSÃO com os 3 verbos),
50+50+50+60 de HP, corpo que ABSORVE tiro (só a cabeça que BRILHA fere), cotos fumegando
('puff'), morte de cabeça em cadeia de explosões e CONVULSÃO pré-fusão (a referência Metal
Slug do Henrique). Os offsets das cabeças são MEDIDOS por cor (`find-cabecas.mjs`).
⚠️ No TREINO o `skipTo` pula o evento de saída da nebulosa — o `spawnBoss` re-garante o céu
limpo (`setNebulaDensity(0)`); se mexer ali, confira as duas rotas.

O projeto original, decidido com o Henrique:

1. **Impacto visual primeiro.** A fase abre DENTRO de uma nebulosa (sair do tom monótono das duas
   primeiras). Referências dele: nebulosa quente/dourada e azul-profunda, com a sensação de estar
   *voando dentro dela*.
2. **Dois atos.** Ato 1 = a nebulosa. Na METADE do tempo, o **Leviatã começa a aparecer** → Ato 2.
3. **Os chefões — DESIGN FECHADO com o Henrique (2026-07-18), arte JÁ GERADA:**
   - 🐍 **SERPENTE de 3 cabeças** (`b5943a3c`, 256px) = **CHEFÃO**, e a luta é por **ANATOMIA**:
     cada fase tem UMA cabeça vulnerável (as outras absorvem tiro sem dano — invulnerável é
     telégrafo). Ordem fixa ESQUERDA→DIREITA (estrutural — ver bloco da sessão), com TROCA DE
     ARTE a cada cabeça morta:
     1. **CIANO** (crânio, esquerda — a alcançável) — padrão: INVESTIDA telegrafada. Morre →
        estado **`41adfd52`** (sem a ciano, coto faiscando).
     2. **VERDE** (centro) — leque em metrônomo acelerando. Morre → **`260d8727`**
        (só a laranja erguida, dois cotos).
     3. **LARANJA** (visor, direita) — rajada mirada. Morre → convulsão →
     4. **FUSÃO** (`efdb21d0`, cabeça ÚNICA gigante com as feições das três, corpo mais grosso,
        exibir ~1.15×): a FÚRIA — os três verbos em ciclo denso com silêncio curto. Pedido
        literal do Henrique: "depois da terceira, surge um boss maior com uma cabeça só, que é a
        junção das 3". HP sugerido pela auditoria: ~50/cabeça + ~60 na fusão (teto ~210).
     As cabeças são ZONAS medidas no PNG sobre UM sprite (lição 13: medir, não chutar); exige o
     contrato StageBoss multi-parte (targets[]), o risco ALTO que a auditoria apontou.
     Idles prontos: base (2 anims 9f legadas), 2-cabeças e 1-cabeça (idle 8f cada), fusão (fury
     8f). **Ataques por CÓDIGO** (movimento + projéteis) — economia deliberada de saldo.
   - 🕷️ **ARANHA mecânica** = **MINI-BOSS do Ato 2**, REGERADA DE LADO (`e5a4f2fd`, 128px, domo
     escuro, olho vermelho, vapor; reserva `35d99174`) com anim de ANDAR (8f). Ela anda no casco
     do Leviatã (~50 HP, abertura do Ato 2, 8-10s de respiro depois dela).
   - 🌌 **NEBULOSA**: 3 variantes instaladas (`nebula3`, `nebula3-2`, `nebula3-3` — núcleo
     dourado em azul-profundo, a referência do Henrique).

## A INTERLUDE

### A Aurora não é um sprite — ela é o CHÃO

Uma nave capital que **cabe** na tela parece um brinquedo. A Aurora entra por BAIXO, em escala
×3.2 (= 384px = a largura exata da tela), e o **convés dela vira o horizonte**: as torres sobem
acima da linha, o casco desce para fora da tela. A nave arqueia e pousa numa SUPERFÍCIE — pousar
num convés é mirar num alvo, não acertar um buraco.

É o mesmo truque de escala da campanha inteira: o Leviatã cresce até virar o chão da Fase 3.

⚠️ **A linha do convés é MEDIDA, não chutada** (`DECK_ROW = 15` de 49 — onde a largura do casco
salta de 38px para 84px). Ancorada pelo centro, a linha caía 30px ABAIXO da tela e a nave pousava
no vazio. **Recalcular se a arte trocar.** Uma **aresta de luz** de 1px marca o convés — sem ela,
casco escuro contra espaço escuro viram uma massa só (é o `groundRim` do solo da Fase 1).

### O painel de escolha — um terminal de hangar

Layout do Henrique: **nome + ficha à esquerda, o MODELO grande num VISOR ÂMBAR à direita, os slots
embaixo.** O visor é a peça central — sem ele a nave era um ícone de 30px perdido numa linha, e
**a silhueta É a informação** (o nariz de lança, o delta largo anunciam como a nave atira). Âmbar
de propósito: é a cor de um CRT técnico, e não compete com o ciano do jogador nem com o magenta do
inimigo.

- **As barras da ficha são RETÂNGULOS, não texto.** A 1ª versão usava `█████░░` com glifos Unicode:
  a fonte monospace do jogo não os tem, e saíram **caixas vazias**.
- **A ficha sai da `WeaponDef`** — ela é a FONTE. Números escritos à mão fariam a UI mentir no dia
  em que alguém rebalanceasse uma arma, e mentir sobre a única coisa que o jogador tem para decidir
  é o pior bug possível num menu de escolha.
- **O preview usa escala INTEIRA** (×3). Fracionária caberia com folga — e borraria a grade de
  pixel, que é a única coisa que o visor existe para mostrar.

### A escolha de nave — a nave É a arma

**⚠️ RÓSTER v2 (2026-07-18):** a tabela abaixo é a do róster ATUAL — as 3 naves antigas
(Interceptor/Lança/Dispersor) viraram LEGADO (defs mantidos em `SHIPS`, fora dos rósters). A
única coisa que muda entre naves continua sendo a arma BASE (`src/ships.ts`): sem atributo de
casco, vida ou velocidade — num run'n'gun a arma é a personagem, e um eixo só já é uma escolha.

| Nave | Arma base | O trade-off |
|---|---|---|
| JATO DE ATAQUE (inicial) | `tracer` | traçante duplo: DPS 8 no casco, 4 no alvo pequeno |
| BOMBARDEIRA (verde) | `obus` | dano 5 lento — derrete o que não desvia, erra o que anda |
| CORSÁRIA (creme) | `agulha` | 6/s quase-instantânea — nunca chega tarde, rala no casco |
| FANTASMA (cinza) | `salva` | rajada 3×2 + pausa 0.8s — dano adiantado, a pausa expõe |
| PERFURADORA (branca) | `perfurante` | atravessa a fila inteira — fraca no um-a-um |
| BATERIA (canhoes, fase final) | `bateria` | 4 canos que abrem com a distância |
| ESPECTRO (alien2) | `lamina` | onda teal ALTA — perdoa a mira, DPS baixo |
| ARAUTO (alien) | `enxame` | teleguiado de curva lenta (inalterado) |

⚠️ **São SIDEGRADES, não upgrades.** Se uma nave for simplesmente melhor, a escolha vira a resposta
certa e o menu é inútil. O `range: 110` do Dispersor **não é sabor, é a trava de balanceamento**:
3 projéteis somados num chefão à distância dariam DPS de boss melter — foi o bug da shotgun, e a
correção foi a mesma (alcance curto).

⚠️ A arma da nave é a arma **BASE** (infinita e fraca). Volta-se para ela com
`WeaponSystem.equipBase()` — **nunca** `equip('pulse')`: devolver o jogador à Pulse apagaria a
escolha dele justamente quando ela mais importa. A escolha **viaja junto** na troca de fase
(`ship` no `scene.start`).

---

## Armadilhas já pagas (NÃO repita)

### Phaser

1. **`overlap(grupo, sprite)` INVERTE os argumentos do callback.** O Phaser roteia para
   spriteVsGroup e o primeiro parâmetro vira o SPRITE. Escrito ao contrário, `bulletHitBoss`
   recebia o boss e o devolvia ao pool de projéteis — o chefão sumia. **Sprite PRIMEIRO.**
2. **Nunca mova um corpo Arcade por TWEEN de posição.** O corpo sobrescreve a posição no mesmo
   frame. Mova por **velocidade**.
3. **`body.reset(x, y)`, nunca `updateFromGameObject()`** depois de trocar a origem. O segundo
   reposiciona o corpo mas não a posição-anterior, e o Arcade lê a diferença como *movimento* —
   era isso que fazia picos, torres e prédios **flutuarem**.
4. **`setTint`, NUNCA `setTintFill`** para flash de dano. `tintFill` pinta o sprite de branco
   sólido e apaga a arte — a torre virava um **quadrado branco**.
5. **Um emissor de partículas por objeto, criado no construtor.** `scene.add.particles()` a cada
   tiro vaza memória (já cometido duas vezes).
6. **`getChildren()` devolve o array VIVO.** O cargueiro ACRESCENTA ao grupo (cospe drones) e o
   culling REMOVE dele, os dois no meio do `for`. Percorrer o array vivo enquanto ele muda de
   tamanho **pula elementos**. Itere sobre um snapshot: `[...grupo.getChildren()]`.

### Campanha

7. **Nada que seja "da fase" pode ser `static`.** `StageDirector.bossTime` era um getter estático
   que lia `STAGE_1` direto. Com uma fase só, acertava por acidente; com duas, o treino da Fase 2
   saltaria para o relógio do chefão da **Fase 1**. Hoje é de instância.
8. **Placeholder gerado tem que passar pela guarda `!textures.exists(key)`.** `makeAsteroid()` era
   chamado incondicionalmente (quando ninguém usava o asteroide). Assim que a Fase 2 passou a usá-lo
   — e com arte do PixelLab a caminho — ele colidiria com o PNG carregado. Todo placeholder de algo
   que um dia terá arte entra no mapa `fallback`.

### Balanceamento e sondas

19. **⚠️ UMA SONDA QUE PASSA PODE ESTAR MEDINDO OUTRA COISA.** A 1ª sonda da mina sensora segurava
    o `D` até a nave BATER na mina, via a vida cair e cantava vitória: *"estilhaçou e acertou"*.
    Ela tinha provado que **bater numa mina dói** — o que nunca esteve em dúvida — e não tinha
    testado o leque, que era a coisa toda. O log denunciou: a vida caía no instante em que a mina
    ACORDAVA, **antes de existir um único estilhaço**.
    **Ao medir dano, elimine as OUTRAS fontes de dano** — hoje a sonda entra no raio e PARA fora do
    alcance do casco, e aborta o teste se encostar.

20. **Número de balanceamento é MEDIDO, não escolhido.** O `cool` da HMG (dissipação do calor)
    parecia razoável a 0.28/s. A sonda mostrou que, tamborilando o gatilho, o calor subia
    **+0.026 por ciclo**: a munição acabava antes de a arma travar, e **o nerf existia no papel e
    não existia em jogo**. O calor sobe por TIRO e cai por SEGUNDO — quem decide o resultado é a
    razão entre as duas taxas no ritmo real, e isso **não se enxerga lendo o código**.
    Mexeu na HMG? `node scripts/probe-hmg.mjs`.

21. **E o teste tem que rodar TEMPO SUFICIENTE.** A mesma sonda, com 12 ciclos, parava **um ciclo
    antes** do travamento e gritava "exploit aberto" com o exploit já fechado. Um teste que erra
    por chegar cedo demais é pior que teste nenhum: ele manda consertar o que não está quebrado.

22. **⚠️ UMA SONDA QUE NÃO ALCANÇA A CONDIÇÃO SEMPRE "CONFIRMA" O BUG.** O Henrique relatou que a
    barragem de flak nunca aparecia. A 1ª `probe-flak.mjs` batia no chefão por 3s fixos, parava em
    **68% de vida** e ia medir o flak numa luta que **nunca tinha entrado em fúria** — e o flak só
    existe abaixo de 50%. Ela reportou zero cápsulas e teria mandado caçar um bug inexistente.
    (A causa real era a mesma: ele ainda não tinha levado a luta até a fúria. **O flak funciona** —
    5 salvas, 15 cápsulas, 12 estouros, nenhuma absorvida.)
    **Toda sonda de estado condicional AFIRMA que chegou no estado, e ABORTA se não chegou.**
    `probe-flak.mjs` e `probe-mina.mjs` fazem isso hoje.

    **Consequência de design que ficou exposta:** o flak é conteúdo de **fim de luta**. Quem morre
    na 1ª metade **nunca vê um padrão inteiro da Capitânia**. Se um dia isso incomodar, o ajuste é
    subir o limiar da fúria (50% → ~60%) — **não** mexer no flak nem antecipá-lo para a fase
    inteira (dois padrões competindo desde o 1º segundo não é difícil, é ilegível).

### PixelLab

9. **⚠️ PARE DE PEDIR PERFIL LATERAL PARA NAVES — o jogo não usa, e nunca usou.**

   A `ship.png` do jogador foi gerada com `STRICT SIDE VIEW PROFILE` e **não é um perfil**: é uma
   nave **vista de cima**, rodada para o nariz apontar à direita (asas simétricas para cima e para
   baixo). O prompt nunca foi obedecido — e ninguém notou, porque a 30×16px ela **lê perfeitamente**
   num shmup horizontal. É a convenção do Vic Viper (Gradius).

   **O modelo obedece** nariz-à-direita, cor, motor aceso e silhueta. **Ele NÃO obedece o eixo da
   CÂMERA.** Provado em 3 lotes (~$0.36): o prompt minimalista deu 12/12 vista de cima; o prompt
   curto ancorado acertou nariz, cor e motor — e mesmo assim **rotacionou uma planta**.

   **Por que o prior vence:** (1) pixel art de nave vem de shmup VERTICAL (Raiden, 1942, Xevious) —
   top-down é o que "sprite de nave" *significa* para o modelo; (2) nave não tem "cima" canônico
   como pessoa ou casa; (3) **o perfil é DEGENERADO** — asas, barbatanas e motores duplos (as
   features que provam que aquilo é uma nave) somem de perfil, e o modelo volta para a vista onde o
   objeto é legível; (4) simetria bilateral é um atrator barato, perfil é assimétrico.

   **Adjetivo não vence prior.** Peça a planform (100% de acerto) e ancore só o que importa:
   nariz à direita, motor aceso à esquerda, silhueta legível.

10. **`style_images` é a alavanca mais forte — e por isso a mais perigosa.** Passar a `ship.png`
    como referência produz uma FAMÍLIA coerente (mesma linguagem, orientação e motor) — foi o que
    fez o roster de naves funcionar. Mas ela copia a referência **fielmente, inclusive os defeitos**:
    foi assim que pedi "perfil", passei uma referência top-down e recebi top-down.
    **Escolha a referência olhando-a AMPLIADA** (`node scripts/sheet.mjs`), nunca de memória.

11. **`create_ui_asset` PINTA TEXTO NA ARTE.** A 1ª tentativa devolveu um menu completo e bonito —
    com `VYPER-7 INTERCEPTOR` e botões `CONTROLS/SETTINGS/QUIT` **embutidos no PNG**. Isso não é UI:
    não muda, não acompanha o conteúdo, e briga com o texto desenhado por cima. A 2ª veio limpa mas
    com **dois slots pintados**, e nós temos **três** naves.
    **O que funciona:** pedir só a **MOLDURA OCA** (um `piece` único, miolo vazio) e desenhar o
    conteúdo em código. Peça no **tamanho exato da tela** (384×216) — assim é desenhada 1:1 e não
    precisa ser reescalada.

12. **NÃO gerar arte de jogo no Higgsfield.** Ele produz imagem com *estética* de pixel art, não
    pixel art de verdade: bordas suavizadas, milhares de cores, sem grade. O jogo roda a 384×216 com
    `pixelArt: true` — reduzir uma imagem grande mata a grade, e ela denuncia que veio de outro
    lugar. Higgsfield serve para o que está **fora** do canvas: capa, itch.io, trailer.

13. **Offsets de arte se MEDEM no PNG, nunca se chutam.** Vale para bocas de canhão (chefões) e para
    a linha do convés (Aurora). Chutar custou dois bugs: tiros nascendo no meio da torre, e a nave
    pousando no vazio 30px abaixo da tela.

14. **O gerador às vezes desenha DUAS artes empilhadas no MESMO quadro.** A Aurora veio com dois
    navios separados por 10 linhas vazias. `install-sprite.mjs --banda alta|baixa` corta na faixa
    vazia do **meio** — cuidado: a MAIOR faixa vazia é quase sempre a sobra do canvas embaixo, e
    cortar por ela decepa a nave. A faixa válida tem arte **dos dois lados**.

15. **Os PNGs vêm num canvas quadrado com transparência de sobra.** `mtn-far` era 128×128 mas a arte
    ocupava 128×**39**. Todo sprite ancorado passa por recorte.

16. **Colunas de borda 100% opacas** viram um **risco vertical** na tela. Cheque a coluna 0 e a W-1.
    **Voltam a cada instalação nova** — os quadros vêm do gerador, não do disco já corrigido.

17. **Às vezes o gerador DESENHA o xadrez de transparência dentro do PNG** (quadrados cinza opacos).

    → As lições 14–17 já estão TODAS resolvidas dentro de `scripts/install-sprite.mjs`.

18. **Animações do mesmo objeto precisam da MESMA caixa de recorte.** Recortar cada animação pela
    sua própria caixa faz o sprite **saltar** ao trocar de animação. `scripts/install-anim.mjs` usa
    a caixa união.

23. **A LIMPEZA VEM ANTES DA CAIXA UNIÃO.** Os quadros de animação saem do mesmo gerador que os
    estáticos e trazem as mesmas sujeiras (xadrez desenhado, bordas opacas) — mas só o
    `install-sprite.mjs` limpava. E aqui é **pior**: uma borda opaca está em TODOS os quadros,
    então ela entra na **caixa união** e infla o recorte do sprite **inteiro**, dando uma margem
    morta que nenhuma inspeção de um quadro só explica. Hoje o `install-anim.mjs` limpa **cada
    quadro antes** de medir a união. Na instalação desta sessão ele achou 20px de xadrez só na mina.

24. **A COR TEM DONO.** A 1ª mina sensora foi pedida com *"glowing cyan scanner eye"* e voltou
    linda — com um olho **CIANO**, que é a cor do **JOGADOR**. Um perigo pintado com a cor do
    aliado **mente sobre o que ele é**, e num shmup a cor é lida antes da forma. E **não dá para
    consertar com `setTint`**: o tint MULTIPLICA, então uma lente ciana tingida de magenta vira
    **preta**. Foi regerada. **Ao pedir um objeto com luz, DIGA A COR** — e confira contra a paleta
    (docs/ASSETS.md) antes de instalar.

25. **A folha de contato mentia sobre a silhueta.** O `sheet.mjs` dimensionava todas as células
    pela caixa do **primeiro** candidato, mas cada candidato volta com um tamanho próprio — os
    maiores **vazavam para a célula vizinha**. A folha existe para julgar a SILHUETA, e era
    justamente sobre ela que estava mentindo. Hoje a célula é a caixa do MAIOR, e cada candidato
    entra centrado.

26. **⚠️ A ANIMAÇÃO SOBRESCREVE A TEXTURA.** `setTexture()` num sprite que está tocando uma animação
    dura até o próximo quadro — o Phaser repõe o quadro da anim por cima, e a troca some. Foi assim
    que **as DUAS cutscenes mentiram durante meses**: o jogador escolhia a Lança (ou o Arauto), lia
    "ARMADA", e decolava no Interceptor. A escolha *funcionava* (a nave certa ia para a fase); só a
    **imagem** estava errada, e justamente no beat que existe para mostrar o que ele armou.
    **Pare a animação (`anims.stop()`) ANTES de trocar a textura.** É a mesma briga das variantes
    de arte (`src/art.ts`): animação e textura disputam o mesmo campo, e quem escreve por último
    ganha.

27. **A REFERÊNCIA VISUAL DO HENRIQUE ENTRA COMO `style_images` — e funciona melhor que o prompt.**
    A Doca Kepler-9 foi gerada a partir de uma **foto de referência dele** (um render 3D, nem pixel
    art era) e saiu muito melhor do que o prompt sozinho: o modelo copiou a **paleta e a luz** (a
    rocha escura, as lâmpadas laranja, as marcações vermelhas na pista) e desenhou pixel art de
    verdade em cima. E a referência pode ser **comprimida a sério** (JPEG, 160px de lado, 4KB) —
    ela transfere **estilo, não detalhe**. **Sempre que ele mandar uma referência, use-a.**
---

## Convenções do código

- **Variantes:** `spire`, `spire2`, `spire3` — `src/art.ts` (`pickVariant`) descobre e sorteia
  sozinho. Acrescentar variante = copiar PNG + registrar no `ART` do `BootScene`. **A animação só
  toca na variante BASE** (numa variante ela substituiria a textura e a variedade sumiria).
- **Animações:** cada quadro é um PNG solto (`boss-anim-0.png`, …). A contagem é **declarada** em
  `FRAMES`, no `BootScene` — ao instalar uma animação nova, **atualize o número ali**.
- **Arte entra asset por asset:** faltou o PNG → cai no placeholder desenhado em runtime. O jogo
  nunca quebra no meio da produção.
  ⚠️ **Todo placeholder passa pela guarda `!textures.exists(key)`** — `generateTexture` grava por
  CHAVE, então um placeholder gerado incondicionalmente **sobrescreve o PNG recém-carregado**. A
  arte entra no disco, o jogo a carrega, e a tela continua mostrando o desenho velho. Já quase
  custou a arte do Leviatã.
- **Texto:** tudo por `pixelText()` (`src/ui.ts`), com contorno preto. Contorno dá legibilidade
  sobre parallax — **mas não salva cor apagada** (use `metalLight`, não `metalMid`).
- **O painel de escolha de nave é UM SÓ** (`src/ui/ShipPanel.ts`), usado pelas duas cutscenes. Ele
  recebe QUAIS naves mostrar (`ROSTER_AURORA` = 3 · `ROSTER_DOCA` = 4). **Nunca duplique o
  painel:** duas fichas técnicas divergem no dia em que alguém rebalancear uma arma, e uma delas
  passa a mentir sobre a única informação que o jogador usa para decidir.
- **A ficha do painel sai da `WeaponDef`** — ela é a FONTE. Número escrito à mão na UI é um bug
  esperando a próxima mudança de balanceamento.

---

## Parallax

`nebula` (3% da velocidade) · `planet` (6%) · `mtnFar` (12%) · `mtnMid` (35%) · solo (100%) ·
**primeiro plano a 150%, NA FRENTE da nave** — é ele que mais vende profundidade.

- Montanhas são **sprites espalhados**, não TileSprite (tile mostra a emenda).
- **Gap MENOR que a largura**: a arte encosta na borda do canvas, então cada sprite termina numa
  parede vertical reta. Espaçados, esse corte fica exposto contra o céu. Sobrepostos, some.
- **Alpha 1 nas montanhas**; a profundidade vem do TINT. Com alpha < 1, duas sobrepostas somam o
  escuro e aparece uma banda vertical.
- Na superfície o primeiro plano usa **`spire`, não `mtnMid`**: em silhueta preta a montanha vira
  um retângulo chapado; o pico é o que ainda tem FORMA reduzido a uma cor só.
- No vácuo (`espaco`) o primeiro plano é **pedra à deriva** — um pico subindo do nada, no espaço,
  denunciaria que a camada é a mesma da Fase 1 com outra cor.
- Ao romper a atmosfera **só o terreno cai**. Nebulosa e planeta ficam — eles são o espaço.

### O fundo da Fase 2 tem que dizer CINTURÃO

Ele não dizia. A Fase 2 herdava o céu da Fase 1 **inteiro** (a mesma nebulosa, o mesmo planeta
anelado **intacto**) e só punha pedras na frente. O jogador saía da lua, atravessava uma cutscene,
e caía num lugar cujo horizonte era **idêntico** ao que ele acabara de deixar — o fundo **desmentia
a viagem**. (Queixa do Henrique, e ele estava certo.)

A correção não é "mais rochas":

- **`belt`** — uma **FAIXA** densa de escombros atravessando o céu. É assim que um cinturão se
  parece **visto de dentro**: uma banda, não pedras avulsas. A camada tem `faixa: [70, 150]` (ela
  se prende à altura do meio) e **NÃO gira** — uma faixa rodada em ângulo aleatório vira cascalho
  picado, e a banda, que é a coisa toda, some.
- **`planetBroken`** — o planeta **partido**, rachado até o núcleo. Ele responde **de onde veio**
  o cinturão: o mundo se quebrou, e a poeira dele é o cemitério em que você voa. O fundo passa a
  ter uma **causa**.
- **`leviathan`** leva **TINT escuro**. Sem ele, o placeholder (preenchido com `bgMid`, que é mais
  CLARO que o vazio do espaço) aparecia como uma **laje azul-clara de bordas retas** cortando o
  céu: um objeto "distante" desenhado mais claro que o fundo lê como uma **parede na frente**.
  Mesma perspectiva aérea das montanhas — **o que está longe é ESCURO**.

⚠️ **Sprite de parallax com BORDA RETA é veneno.** Dois dos quatro candidatos da faixa vieram com o
cascalho cortado num quadrado; numa camada de sprites espalhados, essa borda vira o **risco
vertical** contra o céu (a mesma armadilha das montanhas). Escolha os de **borda irregular**.

---

## Música

`public/audio/stage1.mp3` (Neon Void) e `boss.mp3` (Void Walker). `src/systems/Music.ts` faz
**transição cruzada**. A faixa da fase toca **desde o menu e atravessa a troca de cena sem
reiniciar**. A do chefão entra **antes** de ele aparecer — a música é o primeiro aviso.
Navegadores bloqueiam áudio até a primeira interação; o Phaser destrava sozinho.

---

## PixelLab

- MCP configurado no escopo deste projeto em `~/.claude.json` (a chave **não** está no repositório).
- **Saldo: ~$0.91** (2026-07-18, pós-Fase 3 — assinatura esgotada, tudo em crédito agora).
  `create_1_direction_object` custa ~$0.09 e devolve
  **64 candidatos** num sprite de 32px (16 em 64px, **4 em 128px**). `create_ui_asset` custa ~$0.11.
- **`animate_object` (modo `v3`) é BARATO** — ~1 geração (~$0.005) por animação. As 7 animações da
  Fase 2 custaram junto menos que **um** sprite. Não economize em animação: economize em lote.
- **Todo prompt e cada escolha estão em `assets/raw/prompts.json`** — leia as `_licao_*` antes de
  gerar qualquer coisa.
- **Instalar sprite estático:**
  `node scripts/install-sprite.mjs <object-id> <frame|-> <nome> [--flip] [--banda alta|baixa]`
  Faz o recorte, remove o xadrez e as colunas de borda opacas. Use `-` como frame para um objeto já
  promovido (`select_object_frames`), que guarda o quadro em `unknown.png`.
- **Instalar animação:** `node scripts/install-anim.mjs <nome> <url-base> <n> [png-estático]`
  Limpa **cada quadro** e só então mede a **caixa união** (a ordem importa — ver armadilha 23). A
  URL-base sai do `get_object`: `.../animations/<anim-id>/unknown`.
- **Julgue os candidatos AMPLIADOS:** `node scripts/sheet.mjs <id> <saida.png> <índices...>`.
  A 32px a silhueta é um borrão — foi assim que uma leva inteira quase entrou em vista de cima.
- **⚠️ Objeto em `review` não anima.** `animate_object` exige um objeto `completed`: promova o
  quadro escolhido com `select_object_frames` primeiro (foi por isso que a Capitânia passou a
  campanha inteira sem animação — ela tinha ficado em review).
