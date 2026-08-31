# Fatia 5 — Fase 3 (O CASCO): passe visual — Design

**Data:** 2026-08-25 · **Fatia:** 5 de 8 (mapa em `2026-07-21-menu-visual-design.md`)
**Branch:** `feat/fase3-visual`

---

## Contexto

`STAGES[3]` — "O CASCO" — roda entre a Cutscene 2 e a Cutscene 3. Dois atos, ~88s:

| | | |
|---|---|---|
| **Ato 1** | 0 → 42s | Dentro da nebulosa de Kepler. Asteroides, drones, batedores, minas em cachos na névoa, cargueiro. |
| **A virada** | t=42 | `nebula density 0` — a nuvem abre e o casco do Leviatã aparece por baixo. |
| **Ato 2** | 42 → 88s | O casco é a superfície: torres, radares e silos SOBRE ele. Aranha (t=53), serpente (t=88). |

**A fase está mecanicamente VERDE de ponta a ponta.** `probe-stage3.mjs` cobre as 4 formas da
serpente, as hitboxes medidas por cor, o coto fumegando e a entrega do hangar. Esta fatia é
**apresentação**, como as anteriores.

### O diagnóstico — os dois atos têm defeitos OPOSTOS

**Ato 1 — claro e cheio demais.** A nuvem procedural (`nebula3` em três camadas) é dourada e é a
coisa mais clara da tela; os inimigos são escuros. Isso inverte dois pilares do GDD: *"leitura clara
no escuro: cenário escuro e dessaturado, inimigos brilham"* e *"luz só onde há energia"*. Numa fase
que põe **minas em cachos dentro da névoa**, não ver a mina não é problema estético: é morte.

**Ato 2 — escuro e vazio demais.** Quando a nuvem abre, sobra uma tela quase vazia com uma **faixa
fina no rodapé** (~15% da altura). E essa faixa **não é arte de casco**: são sprites `derelict` — o
destroço genérico da Fase 2 — tingidos de `0x2f3a55` e enfileirados.

A fase se chama "O CASCO". A promessa do GDD é *"ele virou o chão"* — o Leviatã que era um ponto no
horizonte agora sendo a superfície sob você. O que está na tela é uma tira escura.

### Dois beats que os documentos pedem e o código não faz

1. **O `HANDOFF` diz que "na METADE do tempo, o Leviatã começa a aparecer → Ato 2".** Hoje o casco
   fica em alpha 0 até t=42 e simplesmente aparece. Não há aproximação.
2. **O casco deveria ANUNCIAR o interior.** A Fase 4 é costelas, órgãos e maquinário, e entre as
   duas há uma cutscene em que a nave é engolida. Se o casco for placa de metal genérica, a Fase 4
   chega como surpresa desconexa.

---

## As decisões do Henrique

| | Decisão |
|---|---|
| **Escopo** | Os DOIS atos. A nebulosa primeiro (entrega rápida e visível; é metade do tempo de tela). |
| **Véus** | **Ficam**, com alpha menor. Sem eles o Ato 1 vira "espaço com fundo bonito". |
| **Ordem no Ato 1** | Substituir **UMA** camada de nuvem primeiro. Só ir para as duas se não ficar bom. |
| **O casco** | As **7 artes novas** que ele gerou no PixelLab, usadas como família. |

---

## Design

### 1. Ato 1 — a nebulosa pintada

- Original: `assets/raw/paint-bg-f3-original.png` (**1625×968**, proporção 1.68).
- ⚠️ **Recorte central custa só 5,6% da altura** (54px de 968) — MEDIDO. Diferente da pintura da
  Cutscene 2, que era quadrada e perdia 44%. **Não há alargamento aqui**: o `paint-bg.mjs` normal
  serve, e `scripts/alargar-16x9.mjs` NÃO deve ser usado.
- Saída: `public/sprites/paint-bg-f3.png`, 480×270. Chave `paintBgF3` no `BootScene`, com guarda.

**Ela substitui UMA camada, não duas.** A camada mais profunda de `nebula3` (depth −96, alpha 0.85,
escala 1.8–3.0) sai; a do meio (depth −89, alpha 0.65) **fica por cima da pintura**. O A/B com as
duas substituídas é montado e mostrado ao Henrique antes de qualquer decisão de ir além.

⚠️ **A pintura tem que entrar no mecanismo do `setNebulaDensity`, não ao lado dele.** Esse é o mesmo
fade que abre a nuvem em t=42 e revela o casco. Uma pintura pendurada fora dele continuaria de pé
depois que a fase saísse da nuvem — e o Ato 2 teria nebulosa no céu.

**Os véus ficam.** A camada `primeiroPlano` (depth 60, alpha 0.38) é a assinatura de estar DENTRO
da nuvem. O alpha novo sai de **A/B com um inimigo escuro na tela**, não do olho isolado — o
critério é o inimigo ler, não a névoa ser bonita.

### 2. O casco começa a aparecer no Ato 1

O beat que falta. A camada do casco já tem o alpha atrelado a `1 − nebulaDim`, então **antecipar a
aparição é mexer na curva, não gerar arte**.

**Quando:** a partir da METADE do Ato 1 — por volta de **t≈21s** — que é o que o `HANDOFF` pede
(*"na metade do tempo, o Leviatã começa a aparecer"*). Antes disso, nada.

**Quanto:** uma insinuação, não uma revelação. O casco sobe até um alpha **baixo** (ponto de
partida: ~0.25) e fica lá até o evento de t=42, quando ele completa. O critério não é "dá para ver
o casco", é "dá para sentir que há algo por baixo" — se o jogador conseguir LER a estrutura antes
dos 42s, a virada perde o efeito e o número está alto demais.

Nenhum evento do roteiro muda: a curva é do `Parallax`, não do `StageDirector`.

### 3. Ato 2 — o casco de verdade

**As sete artes** (PixelLab, 72×72, geradas pelo Henrique em 2026-08-25). Luminância média medida
entre **0,142 e 0,176** — a família inteira já nasce escura, sem precisar de tint para obedecer
"casco escuro".

| # | Object id | O que é | Papel |
|---|---|---|---|
| 1 | `dbf118cb-b432-4985-8d4f-9cdf501fa745` | Placa com veios alaranjados acesos | pontuação |
| 2 | `52fc70f1-85d0-4cf0-afc6-62afdc885e6c` | Escamas densas sobrepostas | trecho "vivo" |
| 3 | `9ef2a6ad-09d4-4937-9d61-46483537aea7` | Placas com rebites e uma luz azul | maquinário |
| 4 | `4b783ba1-76f0-4831-88ff-b4ec949a5314` | Escamas com garras pálidas embaixo | pontuação (ver ⚠️) |
| 5 | `6ab04e22-7a73-486c-a137-49475c9c098f` | Carapaça lisa | **silêncio** |
| 6 | `49296b98-4d97-4ec0-83ce-5688152c46a8` | Cilindro mecânico e engrenagens | maquinário |
| 7 | `acc4cb05-c7c3-4096-b27a-945cab932ede` | Carapaça lisa | **silêncio** |

⚠️ **AS DUAS LISAS SÃO A MAIORIA DA FAIXA, e isso é contraintuitivo.** Um casco em que cada metro
tem uma engrenagem lê como brinquedo. São os trechos vazios que fazem os trechos com maquinário
significarem alguma coisa — mesma lógica do SILÊNCIO no ciclo da Capitânia. As outras cinco entram
como pontuação.

⚠️ **A nº 4 é a única com o problema do pálido** (garras claras) que derrubou as levas anteriores.
Ela entra, mas é a primeira a sair se em jogo ela puxar o olho.

**Mecanismo: sprites ESPALHADOS COM SOBREPOSIÇÃO, não TileSprite.** As artes ainda mostram emenda
vertical quando ladrilhadas — conferido. A regra da casa para isso já existe e é a das montanhas do
parallax: *"gap MENOR que a largura; sobrepostos, a emenda some"*. É o mecanismo que a camada do
casco já usa hoje, então **a arquitetura não muda — só a arte**.

**Altura:** a faixa cresce dos ~15% de hoje para **~72px** (as artes são 72×72, e 72 de 216 é
exatamente um terço). Ela cresce **só para cima** a partir do rodapé: o GDD pede "corredor amplo,
**teto aberto**", e o céu continua livre.

**Os props sobre o casco ficam** (`wreck`, `turret`, `radar`, `silo` nos eventos `terrain`) — são
eles que dão escala à superfície.

### 4. A luz quente entre segmentos — em código

⚠️ **ISTO É CONDICIONAL, e só entra se a revisão a olho pedir.** A arte nº 1 já traz veios
alaranjados e a nº 3 uma luz azul; pode ser que a faixa já respire sozinha. **Instalar as artes
primeiro, olhar, e só então decidir** — acrescentar luz que a cena não pediu é como esta campanha
chegou a uma doca que era a coisa mais clara da tela.

Se pedir, o método é o **já provado** das 31 lâmpadas da doca (Fatia 4): achar os pontos quentes
**por saturação, não por luminância** (metal e pedra leem claros mas NEUTROS), e emitir
`colonyLight` aditivo com fases diferentes por ponto — pulso em uníssono lê como a tela piscando.

⚠️ Contenção é requisito. Na dúvida, mais fraco.

---

## O que NÃO muda

- **A serpente e as 4 formas.** Vistas nesta sessão e aprovadas — arte forte, as formas trocam de
  verdade conforme as cabeças morrem.
- **A aranha.** Lê bem.
- **O roteiro inteiro:** tempos, ondas, banners, a virada em t=42, o mini-boss em t=53, o chefão em
  t=88.
- Hitboxes e balanceamento.

## Fora de escopo

- A serpente, a aranha, o roteiro, o balanceamento.
- **A dívida das baleias erradas.** ⚠️ **CONFERIDO nesta sessão: ela NÃO é desta fatia.**
  `leviathanWhale`, `leviathanWhaleDying` e `leviathanWhaleSplit` são usados **somente** na
  `Interlude4Scene` (a cutscene final). A memória do projeto diz "corrigir nas fatias 7/8" — está
  errada: a dívida é **só da Fatia 8**. Corrigir esse registro.
- As levas de casco rejeitadas: as 4 de 64×64 (`17792309`, `77ab8017`, `7d8b038d`, `07b168d0`) e as
  3 de 72×72 (`84c1fd8d`, `c6f9a7db`, `2fc06f6f`), mais 3 geradas pelo Claude (`39ef6701`,
  `2d425fcc`, `b01ea506`). Todas com costelas pálidas dominando ou fundo opaco. Ficam como reserva.

## Verificação

- `npm run build` (typecheck + vite) limpo.
- `scripts/probe-stage3.mjs` verde de ponta a ponta — **o portão**: as 4 formas da serpente, as
  hitboxes e a entrega do hangar.
- **Sonda nova da fatia**, com asserts: a pintura está na cena e no depth certo; os véus existem com
  o alpha novo; o casco usa as artes novas; a faixa tem a altura pretendida; o casco já é visível
  antes de t=42.
- **Fallbacks conferidos:** a fase sobe sem `paint-bg-f3.png` (cai na nuvem procedural) e sem as
  artes de casco (cai no `derelict` de hoje).
- **A revisão a olho do Henrique nos dois atos**, com inimigo na tela — o critério do Ato 1 é a
  leitura, não a beleza.

## Critérios de sucesso

1. No Ato 1, **o inimigo lê** contra a nebulosa — inclusive a mina na névoa.
2. O Ato 1 continua parecendo que a nave está DENTRO de uma nuvem, não na frente de um quadro.
3. O casco **se anuncia** antes de a nuvem abrir.
4. No Ato 2, o casco lê como **a superfície de uma coisa viva e blindada** — e o vocabulário dele
   (costela, placa, maquinário enxertado) prepara a Fase 4.
5. O casco **não é a coisa mais clara da tela**.
6. Nenhum tempo, onda ou hitbox mudou.

## Constraints

- Commits com autoria **só do Henrique** (sem `Co-Authored-By`).
- **Escala INTEIRA** em pixel art. ×1 ou ×2, nunca fracionária.
- **Medir, nunca chutar:** toda altura, alpha e limiar sai de medição ou de A/B, não do olho.
- **Toda arte nova com guarda de textura** e fallback para o comportamento de hoje.
- **Sonda ASSERTA, não imprime.**
- Merge da fatia com `--no-ff`, mensagem por arquivo (`git merge -F -` não lê de stdin).
