# START — FATIA 7 · A MOLDURA: ONDE A PRÓXIMA SESSÃO PEGA

**🟢 O DESIGN ESTÁ FECHADO E APROVADO POR ELE (08/09/2026).**
**🟢 O M1 — O MOTOR — IMPLEMENTADO, VERIFICADO E JOGADO (09–10/09/2026).**
**🟢 O M1.5 — O DUTO E AS PORTAS — IMPLEMENTADO, VERIFICADO E JOGADO (10–11/09/2026).**
**🟢 O GOLFINHO — O MINI-CHEFÃO DA CÂMARA B — DESENHADO E APROVADO (11/09/2026).**
Branch `feat/fase4-visual`.

> ### 🆕 11/09 — o veredicto do M1.5 e a frente nova
>
> **O M1.5 foi APROVADO jogando:** *"o duto com as portas ficou muito legal"* e *"a sequência de
> moldura se fechando no duto e abrindo no boss ficou como pedi"*. A mordida, o HP das portas
> (6/8/10), os 38s de duto e o fio **ficam como estão**.
>
> **A pergunta dele que abriu a frente nova:** *"quero que tenha um porquê de mudar o fundo"*. A
> troca de t=40 não tinha motivo nenhum. A resposta é **o golfinho biomecânico** — um mini-chefão
> com aviso, um X de ataque e um duelo em arena, que entra ANTES do M2.
> **Spec:** `docs/superpowers/specs/2026-09-11-fatia7-golfinho-miniboss-design.md`.
> **Plano:** `docs/superpowers/plans/2026-09-11-fatia7-golfinho.md` — implementado em 11/09.
>
> **🟠 O GOLFINHO FOI JOGADO (11/09) — o duelo aprovado, o X e as rajadas ajustados.** *"O duelo
> ficou legal, é algo diferente na fase."* O X nadava como boia e não saía da tela; as rajadas eram
> lentas. Agora: nado com onda e inclinação, volta de dentro da parede com bolhas de aviso, e o
> duelo alternando rajada lenta → leque rápido → rajada rápida → leque lento (spec §9).
> **🟢 O AJUSTE FOI JOGADO (11/09):** *"o nado ficou bom"*. Último pedido, aplicado antes do push: o
> aviso passa por B e **sai da tela**, e o X entra de fora dela pela direita, na altura de B (spec
> §9.1). Knobs: `ONDA_AMPLITUDE` (9), `ONDA_HZ` (1,3), `GIRO_FREIO` (0,35), `INTERVALO_MIN/MAX`
> (0,8–1,4), `EMERGIR_DUR` (0,5), `DUELO_SEQUENCIA`, `AVISO_DUR` (2,4), `ESPERA_DUR` (0,8).
>
> Para jogar: `npm run dev` →
> `http://localhost:5173/` → tecla **`L`** → ~40s de fase. O que olhar:
> 1. **O aviso lê como aviso?** Ele nada de uma parede à outra na coluna x=320 e espera 1,5s em B.
> 2. **O X é justo?** A cambalhota freia em x=280 e o leque sai de lá. Knobs: `Golfinho.VEL_X`
>    (190), `X_CAMBALHOTA` (280), `LEQUE_ABERTURA` (13°), `VEL_LEQUE` (110).
> 3. **O duelo dura quanto?** Knobs: `Golfinho.HP` (50) e `PISO` (25). Rajada: `VEL_RAJADA` (130).
> 4. **A fase ficou longa?** O roteiro continua com 113s; o tempo real cresce o que o duelo durar.
> 5. **O primeiro plano some na arena e volta depois** — se a volta incomodar, é um evento só.
>
> ⚠️ **As sondas que atravessam t=40–50 precisam matar o golfinho** (`s.matarGolfinho()`), senão
> o relógio fica preso em 49,5. A `probe-f4-visual` e a `probe-f4-moldura` já fazem isso.
>
> As seções abaixo ficam como registro do M1/M1.5.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md`. O M1.5 está de pé — o duto
> com parede colada, as três portas e a fase de 113s — e eu já joguei. Meu veredicto: <DIGA AQUI>.
> Toque o M2 — a câmara A."**

---

## 👀 O QUE VER PRIMEIRO NA PRÓXIMA SESSÃO, NESTA ORDEM

1. **A fase agora tem 113 segundos** (era 86). O duto passou de 11s para 38s. Se ele achar a fase
   longa demais, o corte é nas ondas entre as portas, **nunca nas portas** — elas são o motivo de o
   duto existir.
2. **A parede do duto COLA no corredor.** A banda aberta é exatamente `vão + 8 + 8` (medido: 100px
   para vão 84). Antes eram 127px, com a parede do teto em 16,6px de média. Se ele disser que o
   duto voltou a ficar largo, é este bloco que quebrou — a sonda tem assert para ele.
3. **As três portas** (t=72, 82, 94 · HP 6, 8, 10 · vãos 84, 76, 68). Arte provisória, com núcleo
   aceso. A pergunta é se o HP está calibrado: a PULSE entrega 7 de dano/s e a porta chega em ~3,5s.
4. **O fundo do chefão NÃO está ampliado** — foi medido de três formas (§5 da spec do duto). O que
   cresceu foi a abertura: 108px → 184px de pintura visível. Se ainda incomodar, o número é a
   espessura do chefão (hoje 16), não a pintura.
5. **O primeiro plano some ao entrar no duto.** A viga tinha 84px opacos contra um canal de 100px.

---

## ⏭️ A PRÓXIMA AÇÃO, EM UMA FRASE

**ELE JOGA O M1.5.** As três sondas estão verdes e a linha de base sobreviveu, mas quatro perguntas
só o controle na mão responde:

1. **A parede do duto está justa ou está roubando?** Ela MORDE de t=68 a t=106, com 3px de perdão no
   raspão e 1400ms de i-frames. O knob é `Moldura.MORDIDA`.
2. **O HP das portas está certo?** 6, 8, 10. Se ele passar por todas sem esforço, sobe; se perder
   vida em todas, desce. O knob é o `hp` de cada evento `porta` no `STAGE_4`.
3. **38 segundos de duto é demais?** O knob é o espaçamento entre as portas.
4. **O fio avisa a tempo?** Ele acende no mesmo instante em que a parede passa a cobrar. Se avisar
   tarde demais, o conserto é o roteiro **acender antes de morder** — não mexer na mordida.

⚠️ **Continua valendo: não gere arte nenhuma antes disso.** A geometria ainda é barata de desfazer;
depois do M3, com 8 peças de arte em cima dela, não é.

---

## 🆕 O QUE MUDOU EM 10/09 — o ajuste do teste jogado

Veredicto dele sobre o M1: *"as bordas ficaram boas"*, *"gostei da sua adição do hitbox na margem,
ficou mais desafiador jogar"*. **A curva contínua NÃO estragou a dificuldade — `PASSO_MAX` fica em
14.** O que ele pediu por cima disso:

| pedido dele | o que foi feito |
|---|---|
| *"que elas sejam como bordas mesmo, margeando a fase"* | espessura **16 até t=55**, e o aperto do miolo passa a vir só do VÃO |
| *"só ficando mais para dentro na fase do duto"* | 32 (t=55) → 44 (t=63,5) → **54 no duto** |
| *"e abrindo no boss final"* | **16 em t=79**: a rampa de 8px/s abre em 4,75s e o chefão luta numa arena emoldurada |
| *"o desafio extra de sair do duto com vida"* | a parede **MORDE** de t=68 a t=79 |
| *"alguns se repetem em outros tamanhos"* | costela 3→2 camadas, escalas separadas, viga de primeiro plano a 1.6–1.9 |
| *"coração pequeno jogado no ar"* | o `orgao` deixou de flutuar e foi **ancorado no chão**, escala 0.9–1.3 |

**A spec:** `docs/superpowers/specs/2026-09-10-fatia7-moldura-borda-letal-design.md`.

### ⚠️ AS DUAS LEIS QUE ESTE AJUSTE PAGOU PARA APRENDER

**1. O ROTEIRO TEM DE ESTAR EM ORDEM CRESCENTE DE `t`.** `StageDirector.update` caminha com um
cursor monotônico: um evento fora de ordem dispara no `t` do VIZINHO ANTERIOR, não no dele. O
`{ t: 55, moldura 32 }` foi inserido depois de um `{ t: 58, wave }` e a parede só engrossava em
t=58. ⚠️ **A sonda passou verde** — ela amostrava em t=60 e a rampa de 2s terminava justo a tempo.
Quem pegou foi uma **captura de tela em t=58**. Agora há um guard no construtor do `StageDirector`
que lança na carga da fase, e ele vale para as quatro fases.

**2. `setTint` NÃO SERVE DE TELÉGRAFO NUMA FASE ESCURA.** Tint no Phaser é multiplicativo, e a
faixa é quase preta na banda que importa: medido, o delta de luminância entre inerte e letal deu
**−1,5**. Não era defeito da arte provisória — o rumo da fase é *luz só onde há energia*, então a
arte final também será escura. A saída foi luz ADITIVA por cima: um fio de 2px na superfície,
`0xffb478`, medido em **+16,2 de luminância e +37,1 no pico**. ⚠️ **Quem quiser anunciar qualquer
coisa nesta fase: desenhe luz, não multiplique cor.**

**E a regra que resume as duas, de novo: ABRA A IMAGEM.** As duas foram pegas por captura, nenhuma
por assert.

### ⚠️ E AS DUAS DA 2ª RODADA (o duto)

**3. A TRAVA DOS 8px NÃO ERA UM PISO DA PAREDE, ERA UM TETO DELA.** O `max`/`min` contra a
espessura só sabe AFASTAR a superfície do corredor. Medido: o roteiro pedia 54 e a parede do teto
saía com **16,6px de média**, com **127px de banda aberta para um corredor de 84**. Os 43px
sobrando não eram nem corredor nem parede — e era isso, não a espessura ser pequena, que fazia o
duto ler como "passagem estreita". ⚠️ **No duto quem manda na parede é o CORREDOR, não a espessura.**

**4. UM DIFF ENTRE DOIS QUADROS DE UM JOGO QUE ROLA MEDE O TEMPO PASSANDO, NÃO O QUE SE PEDIU.** Ao
investigar se as nebulosas apareciam, pausei `physics.world` e o diff deu **71%**. O parallax rola
pelo `update` da CENA, não pela física: com `scene.pause()` o número é **0,00%**. Eu quase reportei
um defeito que não existia. ⚠️ **Pausar a física não pausa o mundo.**

---

## 📖 O QUE ACONTECEU NESTA SESSÃO, EM ORDEM

1. **A sessão abriu para instalar a "lamina larga"** (Task 4 do Bloco A). 12 gerações, e a régua
   provou que nenhuma servia: alargar a base alarga a textura, a hitbox vai junto e a ponta
   continua fina. A melhor delas matava **46px no vazio**.
2. **Ele parou tudo:** *"sinto que são assets jogados na cena"*, e pediu impacto de shmup AAA na
   última fase.
3. **Brainstorm.** Ele apontou quatro coisas: qualidade dos assets, **posicionamento sem nexo**,
   estilo, e vontade de tentar cenário "vivo". Escolheu composição **mista** (momentos autorados +
   miolo com gramática).
4. **Achei a causa raiz no código** — não é impressão, é `GameScene.ts:859`: cada par de colunas
   sorteia um `vaoY` NOVO, então duas colunas seguidas não têm relação nenhuma.
5. **Ele propôs a moldura:** *"talvez colocar uma moldura em volta, como se fossem paredes?"*
6. **Pesquisa de montagem de cenário** (Metal Slug, composição, legibilidade de shmup) → as
   fontes estão na spec, seção 3.
7. **Mock procedural** em 4 faixas sobre a `bg-a`. Veredicto dele: *"o 2 ficou muito bom, trouxe
   preenchimento. E a número 4 é exatamente o que eu pretendo na hora do duto."*
8. **Spec escrita, revisada e commitada** (`15794c0`).
9. **Divisão de trabalho decidida por ele:** as 4 faixas são dele; as 10 restantes, minhas.
10. **Ele gerou as 4 faixas no PixelLab** — e a régua reprovou as 64 candidatas por ferramenta
    errada. Regerei as 4 como imagem cheia: passaram na estrutura, falharam no valor.
11. **A lei do valor virou número** e foi corrigida na spec (`f40c90a`).

---

## ✅ O DESIGN, EM CINCO LINHAS

- O chão e o teto viram uma **faixa contínua** desenhada, rolando com o mundo.
- O obstáculo deixa de ser prop sorteado e vira **a parede avançando** — uma **mesa de topo chato**.
- ⚠️ **A faixa é DECORAÇÃO, sem colisão.** Quem colide é a mesa, com a mesma `alturaPx` de hoje.
  Por isso a linha de base `[110,110,110]` sobrevive e **nenhuma física nova entra**.
- A **espessura** da faixa cresce ao longo da fase (16 → cheia): as paredes fecham em você.
- Cada uma das **quatro câmaras** tem seu jogo de peças, trocado pelo evento `cenario` que já
  existe (t=40 / 68 / 82).

**A spec inteira:** `docs/superpowers/specs/2026-09-08-fatia7-moldura-fase4-design.md`.

---

## 🔴 AS DUAS DECISÕES ABERTAS — ELE PRECISA RESPONDER

### 1. A REPETIÇÃO DA FAIXA

384 ÷ 128 = **3 cópias idênticas na tela ao mesmo tempo**, e o olho pega. A `B` e a `C` são as
piores (o motivo lê como papel de parede). No jogo a repetição vira temporal, mas o mesmo desenho
volta a cada **1,5s**.

| saída | custo |
|---|---|
| **duas variantes por câmara**, alternadas | dobra a arte dele; mata a repetição |
| **uma variante mais neutra** — menos motivo, mais textura | repete igual, mas não se denuncia |

### 2. QUEM PINTA AS FAIXAS, DE FATO

Ele quis as 4 faixas para si. As quatro geradas estão no disco, com valor corrigido, prontas para
ele pintar por cima — **mas nenhuma foi aprovada por ele ainda**.

---

## 🗂️ A DIVISÃO DAS 14 PEÇAS — decidida por ele em 08/09

**Critério:** não é difícil × fácil. É **o que uma máquina consegue acertar**. Máquina acerta
restrição mecânica (topo chato, 6 quadros, silhueta); não acerta mão.

**DELE — 4 peças:** `f4FaixaA` (128×64), `f4FaixaB` (128×64), `f4FaixaC` (128×80),
`f4FaixaD` (128×64). São a moldura inteira, ficam 100% do tempo na tela e têm de ser da mesma mão
dos quatro fundos.

**MINHAS — 10 peças:** `f4MesaA1/A2/B1/B2` (a régua reprova sozinha o que mentir na hitbox),
`f4VivoA/B/C` (32×32 a 48×48, animadas), `f4PortaC` + destruída, `f4Veu1/Veu2`.

---

## ⚠️ AS LEIS QUE ESTA SESSÃO DESCOBRIU OU CORRIGIU

| lei | onde doeu |
|---|---|
| ⚠️ **"Bem grande" tem de ser largo NA PONTA, não na base** — a hitbox é retângulo de altura cheia com 60% da largura da TEXTURA, e é na ponta que o jogador passa | a lamina alargada: 103px de textura, 10px de desenho no topo, **46px de morte invisível** |
| ⚠️ **Mais contraste ≠ mais claro.** A média da faixa fica em **1,3×** a da pintura; quem sobe é o contraste INTERNO | as 4 faixas nasceram de **1,55× a 4,06×** mais claras que os próprios fundos |
| ⚠️ **`create_1_direction_object` é a ferramenta ERRADA para parede** — ela recorta um objeto do fundo, e parede precisa do oposto. Parede é **imagem cheia** (`no_background: false`) | das 64 candidatas geradas por ele, **nenhuma** encostava nas três bordas |
| ⚠️ **Objeto custa ~25 gerações; imagem cheia custa 1** — porque objeto devolve 16 candidatas | 99 gerações nas 4 dele contra 4 nas 4 minhas |
| ⚠️ **O gerador puxa para o AZUL-FRIO** com "dark sci-fi / alien hull" no prompt, e azul na F4 é corpo estranho | as 6 primeiras laminas; o prompt precisa de `bone white / rust orange / NO blue` |
| **"Sem nexo" era um fato do código, não uma impressão** | `GameScene.ts:859` — `vaoY` sorteado por par |

---

## 🧰 O FERRAMENTAL NOVO — tudo versionado em `scripts/_f4/`

| script | o que responde |
|---|---|
| `_medir-colunas.mjs` | **de uma MESA:** onde esta arte mata sem desenhar? Imprime sempre os 3 props de hoje como referência |
| `_medir-faixas.mjs` | **de uma FAIXA:** sangra nas três bordas? topo reto? quanto a emenda aparece? |
| `_valor-faixa.mjs` | reaplica o acerto de valor de uma faixa contra a pintura da câmara |
| `_folha-faixas.mjs` | as 4 faixas no enquadramento real, cru contra corrigido |
| `_mock-moldura.mjs` | o mock procedural que ele aprovou — **e a fonte da arte provisória do M1** |
| `_folha-lamina.mjs` | a folha mista (da Task 4 morta; a geometria dela ainda serve) |

⚠️ **`scripts/_f4/*.png` é IGNORADO pelo git** (`.gitignore:40`). Os PNG existem **só neste
disco** — um `git clean` apaga e não há de onde restaurar. Os `.mjs` estão versionados.

**Os arquivos que importam no disco:**
`_faixa-{A,B,C,D}.png` (cru) e **`_faixa-{A,B,C,D}-v.png` (valor corrigido — é daqui que vale
pintar por cima)**. Mais `_folha-faixas.png`, `_mock-moldura.png`, `_folha-lamina.png` e o
material morto da Task 4 (`_col-1..10`, `_lam-A..K`).

---

## 🧹 UMA LIMPEZA PENDENTE NO PIXELLAB

Os 4 objetos que ele gerou continuam em `review:awaiting-selection` — eles seguram slot e
poluem a listagem. Se ele confirmar que não quer nenhuma das 64 candidatas,
`dismiss_review(object_id=...)` em cada um:

| câmara | object_id |
|---|---|
| A | `be88daa1-175e-4e5e-b794-557d762c6c7f` |
| B | `0884adc1-2a87-42e6-947f-ecc476ddac9c` |
| C | `b9771d81-d557-4679-825c-eb3cbb2fadf3` |
| D | `0dcb4148-4bd4-4779-8d57-c0bca6fa723e` |

---

## O QUE VEM DEPOIS, NA ORDEM

```
M1 — O MOTOR              ✅ PRONTO, VERIFICADO E JOGADO (09–10/09)
  a faixa contínua, a curva do vão, a mesa, a trava dos 8px — com arte provisória.
  Plano: docs/superpowers/plans/2026-09-09-fatia7-m1-motor-moldura.md
  └ RESPONDIDA: a curva contínua NÃO estragou a dificuldade. PASSO_MAX fica em 14.
M1.5 — O AJUSTE           ✅ PRONTO, VERIFICADO E JOGADO (10–11/09) — aprovado como está
  1ª rodada: a borda de margem, a parede que morde, o fio aceso, o cenário desempilhado.
  2ª rodada: a parede COLA no corredor, as 3 PORTAS, a fase vai a 113s.
  Specs: .../2026-09-10-fatia7-moldura-borda-letal-design.md  (1ª, parcialmente superada)
         .../2026-09-10-fatia7-duto-portas-design.md          (2ª, a que vale)
O GOLFINHO — CÂMARA B     🟠 ◄ PEGUE AQUI · spec aprovada (11/09), plano e implementação na sequência
  aviso A→B, o X com cambalhota e leque, o duelo com flip e rajada, a fase segura em t=49,5.
  Spec: .../2026-09-11-fatia7-golfinho-miniboss-design.md
M2 — A CÂMARA A           ⬜ as 4 peças da doca engolida
M3 — A CÂMARA B           ⬜ a garganta
M4 — A CÂMARA C           ⬜ a faixa grossa, o esfíncter, e as 3 PORTAS (o resto do Bloco C)
M5 — A CÂMARA D           ⬜ a faixa da arena
BLOCO B — O CHEFÃO        ⬜ INALTERADO pela moldura, e ainda de pé
```

### 🟢 O M1 FOI JOGADO E APROVADO (10/09) — esta seção fica como registro

O código está completo e verificado (build limpo · `probe-f4-moldura` 19/19 · `probe-stage4` 22/22
com `vaos:[110,110,110]` · `probe-f4-visual` 17/17 · a régua da mesa honesta). **Nada disso responde
a pergunta do M1.** Ela é do controle na mão:

> **A curva contínua estragou a dificuldade?** O vão parou de saltar, e saltar era parte do desafio.

Para jogar: `npm run dev` → `http://localhost:5173/` → tecla **`L`** (vai direto para a Fase 4).
Se ficou monótono, o knob é **um só**: `Moldura.PASSO_MAX` (hoje 14). Se ficou injusto, o mesmo
número para baixo. As outras quatro coisas para olhar estão na Task 6 do plano do M1.

⚠️ **A arte é provisória e feia de propósito**, com dois defeitos já conhecidos que **não são do
motor**: a mesa lê mais CLARA que a parede (inverte a leitura de plano) e a faixa fica escura
demais nos trechos grossos. Os dois são distribuição de valor da peça, e a arte do M2 resolve.
**Julgue a geometria e o ritmo; a beleza não está em jogo aqui.**

### ⚠️ AS DUAS LEIS QUE O M1 PAGOU CARO PARA APRENDER — valem para o M2–M5

**1. Toda peça de arte precisa de assert de CHAVE DE TEXTURA e de DIMENSÃO.** Medir a posição não
prova que a peça certa está na tela. A mesa nasceu com a textura de ERRO do Phaser (a chave foi
registrada como `f4Mesa` enquanto o `PropKind` se chamava `mesa`), a hitbox virou 32×32 em vez de
96×112 — o obstáculo praticamente deixou de existir — e **as quatro sondas passaram**. A linha de
base `[110,110,110]` é cega para isso *por construção*: o vão é calculado a partir do mesmo número
que posiciona a peça, então os termos se cancelam. ⚠️ **A chave da arte de um prop É o nome do
`PropKind`** (`pickVariant(scene, kind)`), e é assim que `mesa2`/`mesa3` entram de graça no M2.

**2. Toda mudança em código COMPARTILHADO exige olhar as fases que não são a sua.** A faixa da F4
estava sendo desenhada nas Fases **1, 2 e 3** — uma tira opaca e acesa no rodapé de três fases já
mergeadas e aprovadas jogando. É a mesma fronteira que o `TerrainSystem.updateTurret` já cravou
como regra, atravessada na direção contrária. **Nenhuma sonda pegaria**: as quatro cobrem a F4.

**E a regra que resume as duas: ABRA A IMAGEM.** Três dos cinco achados sérios desta etapa só
apareceram porque alguém olhou uma captura, não porque um assert ficou vermelho.

### 📌 EM ABERTO PARA O M2, decidir ANTES de gerar arte

- **Como a arte troca por câmara.** O M1 entregou **um** `PropKind` só (`mesa`), e o plano diz que
  M2–M5 trocam só a TEXTURA. Mas a spec de 08/09 nomeia as peças como `f4MesaA1/A2/B1/B2`. Com um
  kind só, trocar por câmara exige decidir: `setTexture` no spawn conforme a câmara, ou kinds
  separados? ⚠️ Seja qual for, ela esbarra na **lei 1** acima.
- **O atalho de dev `G`** (pula pro chefão numa partida ao vivo) descarta os eventos entre o
  instante atual e o `bossTime` — apertar `G` em t=10 luta com parede de 16px em vez de 54. O
  modo treino já foi consertado; o `G` não. ⚠️ A `probe-stage4` **usa o `G`**, então a luta que
  ela testa não é a luta final real.
- **O relevo da faixa é CORTADO, não deslocado** (`Math.min` em `Moldura.gerar`). A partir de
  espessura 44 ele começa a ser aparado, e em 54 (t≈68 até o fim) é exatamente **0**: a parede
  vira régua reta justamente no clímax. Não é defeito — mas é a explicação se o duto parecer
  "morto" no teste jogado.

⚠️ **O Bloco B não foi tocado** e continua com tudo o que estava pronto: a arte nova do guardião
em `assets/raw/anim-guardiao-novo/`, a idle aprovada, a morte que precisa ser composta no motor, e
o aviso de que `G_CORE_OFF_X/Y` e `G_MUZZLE_X/Y` **têm que ser remedidos** porque a arte nova é
256×256 contra 256×227. Detalhe no START antigo, seção "O QUE JÁ ESTÁ NA MÃO PARA O BLOCO B".

---

## ⚰️ O QUE MORREU NESTA SESSÃO

- **A Task 4** (as colunas novas). As 10 candidatas de 07/09 e as 12 de 08/09 ficam no disco como
  estudo. **Nenhuma é instalada.**
- **O `sorteiaKind`** (`GameScene.ts:869`) e **o `vaoY` sorteado** (`GameScene.ts:859`) — morrem
  no M1.
- **O Bloco C perdeu as paredes contínuas** para a fase inteira; ficou só com as 3 portas.

---

## 📌 A LINHA DE BASE — não perca este número

```
corredores {"chao":3,"teto":3,"vaos":[110,110,110]}
```

`node scripts/probe-stage4.mjs`. Depois do M1 tem de devolver **exatamente** isto. Se mudar, a
mesa nova está comendo o vão — **o erro é da ARTE, não do roteiro**.

⚠️ **A sonda NÃO pega a mudança de dificuldade na horizontal nem a curva contínua.** Ela cobre o
vão, não a espessura nem o ritmo. Isso só o controle na mão julga — e é por isso que o M1 termina
com ele jogando.

---

## O REPOSITÓRIO

Branch **`feat/fase4-visual`**, em dia com o `origin`. `main` está em `f417c0e` com a Fatia 6
mergeada. `origin` = github.com/HenriqueCrosio/AlienWorld-Remastered-V2.
⚠️ O remoto **`legacy`** é o repositório ANTIGO — **nunca empurre para ele**.
⚠️ **Commits são de autoria SÓ do Henrique** — sem `Co-Authored-By`, sem "Generated with".

Os commits desta sessão:

| commit | o que |
|---|---|
| `603f538` | (da sessão anterior) o julgamento das dez colunas |
| `15794c0` | a spec da moldura + as réguas + o mock |
| `f40c90a` | a lei do valor virando número + a régua da faixa |

**PixelLab:** **4.679** de 5.000, ciclo virando em 2026-10-04. Consumo do dia: 115 (99 nos 4
objetos dele, 16 nas gerações minhas). ⚠️ Confira o saldo no arranque antes de gastar.
