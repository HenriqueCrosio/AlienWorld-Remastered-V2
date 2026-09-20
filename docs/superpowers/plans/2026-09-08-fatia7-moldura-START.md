# START — FATIA 7 · A FASE 4: ONDE A PRÓXIMA SESSÃO PEGA

**🟢 A MOLDURA — DESIGN FECHADO E APROVADO (08/09/2026).**
**🟢 O M1 — O MOTOR — IMPLEMENTADO, VERIFICADO E JOGADO (09–10/09/2026).**
**🟢 O M1.5 — O DUTO E AS PORTAS — JOGADO E APROVADO (11/09/2026).**
**🟢 O GOLFINHO — O MINI-CHEFÃO DA CÂMARA B — FECHADO, JOGADO TRÊS VEZES E APROVADO (11–12/09/2026).**
**🟢 A LEITURA DA ABERTURA, A ÁGUA, OS CANOS, OS GÂNGLIOS E A MESA — JOGADOS E APROVADOS (12/09).**
**🟢 AS PONTES COM TORRES DE AMARRAÇÃO — JOGADAS E APROVADAS (13/09):** *"ficaram boas e terminaram
com o problema do início das passarelas flutuando."*
**🟢 O M2 — AS BORDAS — REJOGADO E APROVADO (14/09):** *"Câmara A está muito boa… agora está clean e
uniforme. O duto ficou muito bem construído."* Câmara D: *"o metal escuro com luzes vermelhas trouxe
uma boa combinação"*.
**🟢 O CORAÇÃO E O MAQUINÁRIO RESPIRAM — APROVADOS (14/09):** *"Está muito bom a animação das peças."*
**🟢 AS COLUNAS (coração e maquinário verticais), O PILAR NAS COSTURAS, O FIM DO DUTO E A MARÉ DO GOLFINHO — JOGADOS EM 14/09:**
*"os maquinários casaram bem com a fase e estarem em diferentes layers deu uma profundidade maior"* ·
*"o pilar na junta ficou bom"* · *"o restante ficou bom"*.
**🟢 A ENTRADA DO NÚCLEO PELA EMENDA (fundo C → D) — JOGADA E APROVADA (15/09):** *"todas as questões
melhoraram muito"* · *"a transição suave e em fade ainda é perceptível, mas não tem aquele impacto seco
mais. Foi uma saída barata e eficaz"*.
**🟢 A PINTURA DO NÚCLEO — FICA COMO ESTÁ (15/09):** *"a pintura está boa assim, deixe como está"*. Nem
outpaint nem regeração.
**🟢 O CONTORNO DA BORDA B — JOGADO E APROVADO (15/09):** *"o contorno está bom, melhorou o vazio que
antes aparentava ter"*. ⚠️ **A e D NÃO levam contorno**, decisão dele: *"elas têm o metal que dá o
acabamento de forma gratuita"*. O pedido: *"na borda logo após ou
durante o golfinho… uma fina camada que contorne a borda, igual tem no duto, mas mais discreta e preta…
pode ser um marrom escuro"*. `Moldura.CONTORNO` (0x22160f, alpha 0,9, 2px), POR FORA da superfície
(a 1ª linha da arte B é a barra acesa das costelas), com degrau na quina da placa mais alta; no duto o
fio toma o lugar. Só `f4FaixaB` (`CONTORNO_BASES`). Os retângulos trocam de nome com o traço
(`contornoChao`…) para a sonda do fio não ler contorno como parede acesa. Captura: `_f4/_ver-contorno.mjs`.
Sondas 15/09: `probe-f4-moldura` ✔ · `probe-f4-visual` ✔ · `probe-f4-golfinho` ✔.

**🟢 BLOCO B · B1 — O GUARDIÃO NOVO — JOGADO E APROVADO (15/09):** *"o novo modelo ficou melhor que o
outro"*. A ordem para fechar a Fatia 7, decidida por ele: **obrigatório primeiro** — B1 ✅ → **B3 (a
2ª forma: o PREDADOR, rodada 5b — o fim da morte — à espera do teste jogado; ver 🚦)** → B2 (a posição) → M4 (portas, borda C, esfíncter). Os cortes da tabela amarela
(M3, `f4Vivo`, `f4Veu`) foram **riscados em 19/09** — ver "🧭 O MAPA PARA FECHAR A FATIA 7".
- **Arte:** a DELE (PixelLab `9436240c`), montada sem geração por `_f4/_instalar-guardiao.mjs` —
  `guardiao.png`, `guardiao-idle-sheet.png`, `guardiao-morte-sheet.png` e `guardiao-destruido.png`,
  todos no MESMO quadro de 256². Os crus seguem em `assets/raw/anim-guardiao-novo/`.
- **Remedido** (`_f4/_medir-guardiao.mjs`): alvo `G_CORE_OFF` +27,+31 → **+24,+13**; o corpo do
  alvo 54×48. ⚠️ O antigo +31 já estava errado DURANTE a respiração (estático 256×227 contra sheet
  256² alinhada no topo: ~10px de tela abaixo do miolo). O bico `G_MUZZLE` −100,−20 → **−94,+44**:
  o antigo era a olho e caía no vazio acima da cabeça; o leque agora sai do bico, ~45px mais baixo.
- **A morte, composta no motor (escolha dele):** `guardiao-morte` (1000ms) + 6 `fx.explode` subindo
  pelo casco + `guardiaoDestruido` com `explodeBig` no fim; o coração surge em 1500ms (era 1300) e a
  carcaça some, como antes (*ele não quis adiantar o B3*). `BossNucleo` passou a receber o `Fx`.
- ⚠️ **Não julgado explicitamente:** nos quadros 6–8 da respiração o miolo (o ALVO) quase apaga —
  área acesa de ~1.560px cai para 120–307px. Ele aprovou o modelo sem apontar isso; se voltar, é
  julgamento dele.
- ⚠️ **Leitura enganosa pega nesta sessão:** `core.body.x/y` lido fora do passo da física sai meio
  corpo para baixo/direita (o `body.reset` grava o canto sem offset). Na colisão está centrado —
  medido no `worldstep`: `body.center` = `core.x/y`. A captura `_f4/_ver-guardiao.mjs` desenha pelo centro.
- Sondas: `probe-stage4` ✔ (bala real fere a massa, troca, coração, cutscene final) · typecheck ✔.

**🟢 BLOCO B · B3 — O PREDADOR: FECHADO (16–19/09).** Sete rodadas, seis testes jogados. A última — o fim da morte
com a poça cobrindo o chão e a lava do chão tirada do core — foi aprovada em 19/09. **🔴 Mas o teste de 19/09 abriu
um item NOVO e grande: a luta do GUARDIÃO precisa ser repensada** (a investida é impossível de desviar, os 3 tiros
são fáceis demais) — ver o bloco 🔴 na 🚦. O registro do B3 abaixo fica como histórico.

**🟢 20/09 — O E1 E O E2 PASSARAM, E O B2 FECHOU SEM CÓDIGO.** *"A escória ficou boa"* · *"ficou ótimo!"* (o
metal do rasgo) · *"a posição do guardião está ótima, pois os cabos 'fixam' no topo e se ficarem mais baixos ou
fora da posição, mostra o corte do sprite"*. A respiração em ondas (o miolo que chega a apagar) foi declarada
NORMAL. Saíram três coisas novas dos testes do mesmo dia — o RASTRO do glóbulo, o AVISO da investida e a TRAVA da mira
com a carga de 1,15s —, e as três foram **jogadas e aprovadas em 20/09**: *"joguei e ficou bom"*.

**🟢 A LUTA DO CHEFÃO DA FASE 4 ESTÁ FECHADA (20/09).** B1 ✅ · B2 ✅ · B3 ✅. **Falta UMA peça na Fatia 7 inteira:
o M4** — as 3 portas com arte final, a borda C grossa e o esfíncter. Ver a 🚦: ele começa por uma decisão dele,
parada desde 12/09.

**🟠 O REGISTRO DO B3 (16–17/09). CINCO RODADAS, QUATRO TESTES JOGADOS. Aprovados: a
mecânica, o surgimento/giro, o breu, a lava, a fumaça da troca, o andar no lugar, a investida de quatro com o
slash saltado, o teto por uma garra, o arremesso com a garra livre e a VOLTA QUE ATACA (o rasgo do chão + o metal
incandescente). FALTA JOGAR: a rodada 5b — o FIM DA MORTE** (o piso racha, estoura, a lava sobe e o corpo afunda),
refeita em arte assada em pixel depois de ele reprovar a 1ª versão. A rodada 6 (18–19/09) — o arremesso do teto
refeito, porque a garra trocava no meio do gesto — **já foi jogada e APROVADA**: *"ficou ótima e in-game melhor
ainda"*. Ver 🚦 e ⏸️ logo abaixo.

Branch `feat/fase4-visual`, **em dia com o `origin` (V2) em `2b8bfff`** — tudo o que está descrito aqui está
commitado e empurrado. O remoto é o **V2**; NUNCA o `legacy`.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md`, começando pela seção 🚦. A luta do chefão
> está FECHADA: em 20/09 joguei e aprovei o rastro do glóbulo, o aviso novo da investida e a trava da mira. O B1,
> o B2 e o B3 estão todos fechados. Falta UMA peça para a Fatia 7 inteira: o M4 — as 3 portas com arte final, a
> borda C grossa e o esfíncter. Vamos ao M4."**

⚠️ **O M4 é construção, não ajuste — e começa por uma decisão dele que está parada desde 12/09** (a borda C é
128×80 e três coisas no código presumem 64). Ver a 🚦 logo abaixo: **brainstorming antes de qualquer código.**

---

## 🚦 O QUE FAZER PRIMEIRO NA PRÓXIMA SESSÃO

### 🎯 O M4 — A CÂMARA C. A ÚLTIMA PEÇA DA FATIA 7

**A luta do chefão está fechada.** O T1, o T2 e o T3 foram jogados e aprovados em 20/09 (*"joguei e ficou bom"*):
o rastro do glóbulo, o aviso novo da investida e a trava da mira com a carga de 1,15s. **Nada mais pende no
B1/B2/B3.** O que sobra da Fatia 7 é o M4 — e ele é CONSTRUÇÃO, não ajuste.

**⚠️ ANTES DE QUALQUER CÓDIGO: uma decisão dele, parada desde 12/09.** A arte da borda C está aprovada
(`scripts/_f4/_faixa-C-v.png`, *"as do duto e do núcleo ficaram ótimas"*) e é **128×80** — a "faixa grossa" do
duto. Três coisas no código presumem **64**:

- `Moldura.ESPESSURA_MAX` = 54, calibrado para a peça de 64px sempre alcançar a borda;
- a **saia**, ancorada em `superficie ± 64`;
- o assert de dimensão da sonda (`128x64`).

**A pergunta:** a `Moldura` aprende a faixa de 128×80 (o trabalho do M4), ou corta-se a C para 64 e entrega-se
hoje, jogando fora a faixa grossa? **É decisão dele, e é um brainstorming — não uma escolha para eu tomar
sozinho.**

**As três peças do M4, depois da decisão:**

| peça | o que é | estado |
|---|---|---|
| **as 3 PORTAS** | hoje são `f4-porta-prov.png`, arte provisória | falta a arte final |
| **a BORDA C** | 128×80, arte dele aprovada e parada desde 12/09 | presa na decisão acima |
| **o ESFÍNCTER** | `f4VivoC`, animado | a construir |

**Depois do M4:** rejogar a fase inteira, atualizar o `docs/HANDOFF.md` e fechar a fatia com merge `--no-ff` de
`feat/fase4-visual` em `main`.

---

### 🧭 COMO ABRIR O M4 — a ordem, e o que ler antes

⚠️ **Nada de código na primeira hora.** O fluxo desta fatia é o de sempre — **brainstorming → spec → plano →
implementação → teste jogado dele → merge** —, e o M4 é a peça que mais depende de decisão dele. A sessão abre
pelo brainstorming da borda C (a tabela acima), não por um editor aberto.

**O que ler, na ordem:**

1. esta 🚦 (a decisão da borda C e as três peças);
2. **`## ⛏️ O QUE FALTA CONSTRUIR — a câmara C`**, mais abaixo neste arquivo — é onde estão os três números que
   presumem 64 e o veredito dele sobre a arte;
3. **`## ⛏️ O DEGRAU DO DUTO — o que saiu e o que NÃO sai`** — a `Moldura` já levou uma rodada de "faixa que
   muda de espessura", e as leis de lá valem aqui;
4. a spec de origem: `docs/superpowers/specs/2026-09-08-fatia7-moldura-fase4-design.md`.

**O que já existe e não se refaz:**

| coisa | onde |
|---|---|
| a arte da borda C, aprovada em 12/09 | `scripts/_f4/_faixa-C-v.png` (128×80) |
| as portas provisórias | `f4-porta-prov.png` |
| o motor da faixa, com `setFaixa` e a troca pelo evento `cenario` | `src/systems/Moldura.ts` |
| as sondas que têm de continuar verdes | `probe-f4-moldura`, `probe-f4-visual`, `probe-stage4`, `probe-f4-golfinho` |

⚠️ **A sonda da moldura tem um assert de dimensão cravado em `128x64`** (`scripts/probe-f4-moldura.mjs:181`) —
se a decisão for ensinar a faixa grossa à `Moldura`, ele muda junto, e é ele que avisa se alguém instalar a peça
errada.

**As três leis desta fatia que mais pesam no M4:**

- **fundo pintado é assado em 384×216 e escala 1** — reduzir pode, AUMENTAR nunca;
- **efeito de cenário se assa em pixel na resolução nativa**, com a paleta do vizinho; `Graphics` em tempo de
  jogo lê como "gerado" (a lei que a rodada 5b do predador pagou);
- **a arena do chefão é só pintura** — nenhuma peça de cenário entra lá.

---

### ✅ 20/09 — o 8º teste jogado: o rastro, o aviso e a trava PASSARAM

*"Joguei e ficou bom."* Os três itens do teste curto fecham de uma vez, e com eles **a luta do chefão da Fase 4**:

| # | o que era | veredicto |
|---|---|---|
| **T1** | o RASTRO do glóbulo (brasa que esfria + véu quente de fumaça) | ✅ fica como está |
| **T2** | o AVISO da investida (o casco esfria, a respiração vai a 5×, o anel fecha no miolo) | ✅ fica como está |
| **T3** | a CARGA de 1,15s e a TRAVA da mira aos 62%, com 450ms de janela de fuga | ✅ fica como está |

**Os knobs ficam onde estão** — `RASTRO_MS` 0,016 · `RASTRO_BRASA` 0,8 · `TELEG_RESPIRO` 5 · `CARGA_R0/R1` 26→4 ·
`TELEGRAFO_DUR` 1,15 · `TELEG_TRAVA` 0,62 · `RECUO_VEL` 45. ⚠️ Se um dia a luta parecer lenta, o caminho é
**adiantar a trava** (0,62 → 0,5: mantém a janela e encurta a espera), **nunca** encurtar a duração — encurtar
desfaz a mecânica de atrair a investida e desviar.

---

### ✅ 20/09 — o 7º teste: a carga da investida cresce, e a MIRA passa a TRAVAR (JOGADA E APROVADA)

> *"o timing da investida está muito curto, preciso que aumente o tempo de carga para a investida, assim o
> jogador consegue usar a mecânica que citei: esperar até o último segundo de carregamento para travar o boss
> numa direção e ter tempo de desviar para os cantos"*

**⚠️ E ALONGAR A CARGA SOZINHO NÃO ENTREGAVA A MECÂNICA.** A mira era tomada no INSTANTE DO ARRANQUE — o guardião
lia a altura da nave no mesmo quadro em que saía. Então *atrair a investida para um lado e depois desviar* não
existia como jogada: não havia instante nenhum em que ele estivesse comprometido e ainda parado, e mais carga só
daria mais tempo de esperar pela mesma armadilha. A jogada que ele descreve **pressupõe uma trava**, e a trava
não existia.

O telégrafo passou a ter **dois tempos**:

| tempo | o que acontece |
|---|---|
| 0 → 62% (0,71s) | ele CARREGA e **ainda lê a nave**: o anel fecha de 26px para 4px e a respiração sobe de 1× a 5× |
| a TRAVA (62%) | a mira CRAVA (`vyTravado`). Três sinais no mesmo quadro, porque a virada precisa ser vista — senão ele não sabe quando parou de valer a pena ficar parado: **o corpo RECUA** (puxa para trás antes de saltar), o core **estala** (coroa de 10) e a câmera treme |
| 62% → 100% (0,45s) | a **janela de fuga**. A carga para de fechar e SEGURA, a respiração fica cravada em 5× — ele já decidiu, e o corpo diz isso |

**Medido** (`scripts/_f4/_medir-investida.mjs`, escrita para isto): **450ms de janela + 760ms de travessia =
1210ms** de desvio, contra os 760ms de antes. A 110px/s do `FreeController` são **133px** de deslocamento contra
83px, num vão de 160px com um corpo de 133px.

⚠️ **A sonda não confia na aparência.** Ela põe a nave em y=170 (que dá vy **+70**), espera a trava, TELEPORTA a
nave para y=40 (que daria vy **−70**) e confere que o arranque saiu com **+70**: o guardião mergulha onde a nave
*estava*, não onde ela está. Mira travada é comportamento, e comportamento se prova com um discriminador, não com
uma foto bonita.

⚠️ **E uma medida de arte no caminho:** segurando o ritmo da carga (16ms, dois sopros por batida) no raio mínimo,
chegavam **30 partículas** empilhadas no mesmo pixel e o ADD **saturava em BRANCO** no miolo — e branco não
existe nesta arte. Depois da trava é UM sopro a 26ms com o raio abrindo de leve: assenta em 7–9 vivas, brasa
acesa e segura.

Folha atualizada: `folhas/2026-09-20/aviso-e-rastro.png` (27 fotos — agora com a linha `MIRA TRAVADA (vy …)` nos
rótulos, que é onde se vê a virada). Sondas: `probe-stage4` ✔ · `probe-f4-visual` ✔ · `probe-f4-moldura` ✔ ·
`probe-f4-golfinho` ✔ · `_provar-serra` ✔ · `_medir-investida` ✔ · typecheck ✔ · build ✔.

---

### ✅ 20/09 — o 6º teste jogado: o E1 e o E2 passaram, o B2 fechou, e saíram DUAS coisas novas

**Aprovado, jogado:** E1 *"a escória ficou boa"* · E2 *"ficou ótimo!"* (o `METAL_VOO` 1,5 fica) · e o **B2 fechou
sem código**: *"a posição do guardião está ótima, pois os cabos 'fixam' no topo e se ficarem mais baixos ou fora
da posição, mostra o corte do sprite"*. ⚠️ **Registre a razão, não só o veredito** — o alto-direita não é
preferência: é onde os cabos encontram a borda de cima, e é ela que esconde o corte do sprite de 256². Descer o
guardião expõe o corte. O item do roadmap **morre aqui**.

**E a respiração está resolvida também:** *"o core pode chegar a se apagar, mostrando um movimento de respiração
em ondas, normal"*. Os quadros 6–8 em que o miolo quase apaga (área acesa de ~1.560px caindo para 120–307px)
**são o desenho, não um defeito** — deixa de ser item de julgamento.

| o que ele pediu | o que mudou (20/09) |
|---|---|
| E1 *"pode gerar um efeito de rastro do projétil, como fumaça ou algo incandescente"* | **o rastro do glóbulo** (`BossNucleo.rastroGlobulos`): um sopro por quadro na CAUDA de cada glóbulo — brasa em ADD nas cores dos veios de lava do próprio PNG (0xfc9a04/0xf46b02/0xec3c05) + fumaça em ADD de tom baixo (0x4a2e22/0x3a241c). Medido: 25 partículas vivas por glóbulo, ~40px de esteira a 150px/s |
| *"o aviso, que é a aceleração do core do guardião, precisa estar mais distinta, informar mais ao jogador que vai haver uma investida"* | **o telégrafo trocou de vocabulário.** Ver o bloco ⚠️ abaixo: ele piscava o corpo inteiro em ROSA — a mesma gramática do flash de dano. Agora o casco esfria (`CASCO_FRIO`), a respiração acelera 1× → 5× (`sprite.anims.timeScale`) e um anel de carga fecha no miolo, de 26px a 4px, soltando dois sopros por batida na metade final (14 partículas vivas no pico, medido). No estalo, o `glow` solta uma coroa de 14 |

**⚠️ A LEI QUE SAI DAQUI — um telégrafo não pode falar a língua do dano.** O aviso antigo não era curto: era
*indistinguível*. Ele piscava `0xffd0d0`/`0xff6060` no sprite inteiro, e o flash de dano pisca `0xffb090` no
sprite inteiro. O jogador via o guardião piscar e lia *"acertei nele"*. A separação que ficou é de TEMPERATURA e
de LUGAR: dano = o casco esquenta por 60ms; aviso = o casco ESFRIA e quem acende é o miolo. ⚠️ E o `clearTint`
atrasado do dano passou a respeitar o telégrafo — um golpe no último quadro antes do aviso limpava o casco no
meio da carga.

**⚠️ E uma medida que derrubou a primeira tentativa do rastro:** a fumaça saiu primeiro na **crosta fria** da
escória (0x24343c/0x1c292d, blend NORMAL — as cores mais claras do próprio PNG) e **sumiu por completo** na
captura. A pintura da arena é vermelho escuro de luminância parecida; cinza-azulado a 50% em cima dela não tem
contraste nenhum. A lei do dark sci-fi diz *luz só onde há energia* — e o glóbulo **é** energia: a saída não era
clarear o rastro, era fazê-lo QUENTE e curto. Segunda medida: com um sopro a cada 2 quadros a brasa nascia a cada
~7px e a foto mostrava uma FILEIRA DE PONTOS; um sopro POR QUADRO (~2,5px) é o que faz o rastro ter corpo.

Ferramenta nova: **`scripts/_f4/_ver-aviso.mjs`** — as duas coisas numa folha só, e cada foto carrega o estado do
JOGO (o `k` da carga, o `timeScale` da respiração e as partículas VIVAS de cada emissor). ⚠️ Contar partículas é
o que separa *"o rastro não aparece na foto"* de *"o rastro não foi emitido"* — e `emitter.alive` é a LISTA, não
o número: quem dá o número é `getAliveParticleCount()`. Folha: `folhas/2026-09-20/aviso-e-rastro.png` (18 fotos).
Sondas: `probe-stage4` ✔ · `probe-f4-visual` ✔ · `probe-f4-moldura` ✔ · `probe-f4-golfinho` ✔ · `_provar-serra` ✔
· typecheck ✔ · build ✔.

---

### 📜 O registro das rodadas — tudo abaixo já foi jogado e aprovado

### 🆕 17/09 — o 3º teste jogado (a rodada 3) e a RODADA 4 (jogada e APROVADA — ver a rodada 5 abaixo)
**Aprovado na rodada 3:** A1 o andar (*"não parece mais deslizar"*) · A2 dá tempo de sair · A3 *"parece uma investida de
verdade"* · A4 difícil, mas justo (*"a nave precisa colar no teto para fugir, mas dá"*) · A6 o tamanho pendurado não
fecha a arena · A7 a lava sai natural · A8 lê como soltar e cair · A9 funciona (um clipe de "garra em garra" seria
bônus, não pedido) · B nada regrediu; os estilhaços no breu são difíceis, **e fica assim** (*"boa camada de
dificuldade"*: longe, a parábola passa para trás da nave e não estilhaça). **C não foi respondido.**

| o que ele viu | o que mudou (rodada 4) |
|---|---|
| A5 *"está agarrando com a mesma garra que ele joga a lava"* | arremesso pendurado novo, **`teto-lava-b`**: a garra de cima segura o teto do começo ao fim, o braço livre arremessa. A boca da lava no teto foi remedida (−104,+43 virtuais) e `TELEG_LAVA_TETO` 0,65 → 0,68 |
| A10 *"a animação dele morto não apareceu, ele sumiu e depois a cutscene abriu"* | **a causa (medida):** o clipe tocava inteiro, mas a cena DESTRÓI o chefão 1,2s depois do golpe, bem quando ele fica estendido, e a vitória vinha 1,4s depois. Agora o `BossNucleo.destroy` deixa o **corpo** (o último quadro) no chão, e a cena espera `CORPO_FICA_MS` 3200 (`StageBoss.pausaFinalMs`) antes da cutscene |
| *"na reentrada… vem correndo, para no meio da tela e dá um slash de baixo para cima, como se tacasse metal incandescente na nave"* | **a VOLTA QUE ATACA (skill nova):** aviso na borda direita → galope até `RASGO_X` (o meio) → **`rasgo`** (`upper-b`: crava as garras no chão nos quadros 4–11 e ergue um arco em brasa no 12) → **metal incandescente** (lasca desenhada no motor, `metalBrasa`) sai do chão em arco com a gravidade da lava, mirado onde a nave estava quando ele parou; não estilhaça → recuperação (dano dobrado). A volta agora é SEMPRE pelo chão |

**Os knobs novos (`Predador.ts`):** `RASGO_X` 192, `RASGO_MS` 1100, `RASGO_SOLTA` 0,7, `RECUP_RASGO` 0,9, `METAL_N` [·,3,4,5]
por fase, `METAL_VOO` 0,95, `METAL_ABRE` 30 · `BossNucleo.CORPO_FICA_MS` 3200.
**Candidatas** (`assets/raw/furia-predador-anim4/`, folha `folhas/2026-09-17/r4-candidatas.png`): `teto-lava-a` (FALHOU:
soltou o teto de novo), `upper-a` (de quatro, o arco sobe para trás — guardada; trocar: `RASGO=… node _instalar-predador.mjs`).
**PixelLab rodada 4:** 8 gerações, todas PixMiniMax. Captura: `folhas/2026-09-17/predador-em-jogo-r4.png` (31 fotos: a
volta, o rasgo, o metal no ar e o corpo que fica +3s). Sondas: `probe-stage4` ✔ · typecheck ✔ · build ✔.

### 🆕 17/09 — o 4º teste jogado: a rodada 4 PASSOU, e a rodada 5 fecha a morte

**Aprovado, jogado:** R1 o aviso *"avisa e ficou ótimo"* · R2 *"a animação ficou excelente e dá tempo de desviar"* ·
R3 *"o metal derretido ficou ótimo e ficou diferente da lava"* · R4 *"agora dá a entender que ele joga com a outra
garra"*. **Os knobs do rasgo e do arremesso estão fechados.**

| o que ele viu | o que mudou (rodada 5) |
|---|---|
| R5 *"o corpo fica imóvel e o chão continua passando embaixo… o piso racha e explode, a lava sobe até a altura de onde era o chão, e o corpo some na lava, como se estivesse afundando"* | **`src/entities/fimDoPredador.ts`** (novo, tudo desenhado no motor): 1. as GRETAS abrem sob o corpo e acendem, com o chão tremendo (`RACHA_MS` 560, depois de `ESPERA_MS` 550 de corpo no chão) · 2. o ESTOURO: 5 explosões na linha do chão + 60 brasas · 3. a LAVA SOBE e para em `Predador.CHAO_APOIO` (`SOBE_MS` 900), com a crista ondulando em dois senos e 6 luzes ADD · 4. o CORPO AFUNDA por dentro dela (`AFUNDA_MS` 1100, `AFUNDA_PX` 30) e some. A poça FICA ondulando até a cutscene — **é ela que mata a queixa: cobre a faixa de ponta a ponta, então o chão que rolava embaixo do corpo deixa de existir** |

**⚠️ A 1ª tentativa da rodada 5 FOI REPROVADA na hora** (*"ficou gerado e sem custos… preciso de uma lava mais
condizente com o cenário, uma rachadura mais real"*): ela montava tudo com `Graphics` em tempo de jogo — traço
antisserrilhado e faixa de cor chapada, que não pertencem a um jogo de pixel. **A lei que fica:** efeito de cenário
se ASSA em pixel na resolução nativa, com a paleta do vizinho, e o código de cena só toca a arte assada.

**A rodada 5b — a arte assada** (`scripts/_f4/_assar-fim-f4.mjs`, zero geração, roda em 2s):
- a paleta sai da PRÓPRIA faixa do chão (`f4-faixa-d.png`, 42 cores: azuis quase pretos + frisos vermelhos), com
  três degraus quentes a mais. Medido: **~19% da poça acende**, o resto é crosta fria (a lei do dark sci-fi);
- `f4-racha-sheet.png` (6 estágios × 384×30): o metal RASGANDO — vão preto que abre, lábio claro (a placa
  levantando), sombra embaixo, calor no fundo da fenda e dentes de chapa. **Corre para a esquerda com o cenário**
  (`SCROLL_SPEED`) — chapa parada enquanto o chão rola era metade do "gerado";
- `f4-lava-sheet.png` (8 quadros × 384×36): a poça é um VORONOI de placas de crosta com as costuras acesas, cada
  degrau costurado com **dither Bayer 2×2** (sem ele o magma vira mancha de balde), rim escuro na beira da placa e
  crista acesa só onde a costura chega à superfície. Emenda fechada em x, e a crosta escorre no sentido da fase;
- `f4-destroco.png` (4 lascas de 12×10): voam girando no estouro e caem de volta na fenda.
Folha da arte: `folhas/2026-09-17/r5-fim-assado.png`. Em jogo: `predador-em-jogo-r5.png` (35 fotos).

**Os tempos:** `CORPO_FICA_MS` 3200 → **4200** (espera + racha + sobe + afunda ≈ 3,1s, e sobra folga). ⚠️ O
`probe-stage4` esperava 4500ms pela cutscene e passou a esperar **6500** — o número vive no probe, não no jogo.
Sondas: `probe-stage4` ✔ · typecheck ✔ · build ✔. Captura: `folhas/2026-09-17/predador-em-jogo-r4.png` (35 fotos, os
9 últimos quadros são a morte de 0,5s a 4,6s).

**O roteiro do próximo teste (R5):** as gretas dão o aviso do que vem? · o estouro do piso tem peso? · a lava sobe
rápido ou devagar demais (`SOBE_MS`)? · o corpo afunda fundo o bastante (`AFUNDA_PX` 30)? · a poça parada até a
cutscene cansa (`CORPO_FICA_MS` 4200)? · e o C da rodada 3 (📜 **tudo respondido em 19/09** — ver o bloco de 19/09
acima: o urro ficou, a emenda da pintura fica como está, o `nucleo.png` fica como scrap e a lava do chão foi refeita).

---

### 📜 Registro: como se chegava no chefão para os testes do B3
`npm run dev` → http://localhost:5173 → `L` (Fase 4) → `G` (pula para a arena do chefão). Mate o GUARDIÃO para
ver a troca. As fases do predador vêm pela vida (66% e 33%): jogue a luta inteira **até matá-lo** — o que falta
julgar é justamente o que vem DEPOIS do golpe final, e dura 4,2s até a cutscene.

### ✅ 19/09 — A LUTA DO GUARDIÃO FOI REDESENHADA E IMPLEMENTADA (jogada e aprovada na primeira)

Spec própria: **`docs/superpowers/specs/2026-09-19-fase4-luta-guardiao-design.md`** — o desenho saiu de um
brainstorming com ele, decisão por decisão. O resumo:

- **a investida NÃO muda.** Ele descobriu jogando que ela já tem saída (*"testei ficar bem nos cantos e, de
  alguma forma, eu não tomei o dano"* — é a folga de ~20px medida), então a investida em X que tínhamos
  desenhado foi **cortada**: *"não vamos precisar criar a skill que citei de investir na diagonal"*;
- **a SERRA** (`src/entities/SerraGuardiao.ts`, arquivo próprio): conjurada num **cabo** como os que prendem o
  guardião, com um **fio de aviso** marcando a primeira diagonal (sorteada entre 24° e 48°), sobe e **crava** na
  borda de cima girando travada 2×, desce e crava embaixo 1×, sobe e sai. **A bala ATRAVESSA** (ela vive em
  `BossNucleo.perigos`, contra o qual ninguém registra as balas do jogador) e o **cabo é só visual**;
- **a CRAVADA é a janela de dano**, e paga: `DANO_CRAVADA` **×2**. A razão é medida — a nave atira para a
  DIREITA, então só serve para ela um guardião parado e à direita; na investida ele termina ATRÁS dela;
- **a salva cobre as BORDAS** (`SALVA_ABRE` 96°) e passou de 100 para **150 px/s** — acima dos 110 px/s da nave,
  senão não é ameaça. Isso é o que torna caro o canto em que a investida te põe: os dois ataques passam a se
  contradizer, que é de onde vem a dificuldade;
- **escala em 3 degraus** por vida (66% / 33%), como o predador: a pausa entre skills cai (4,2 → 3,4 → 2,6s), a
  salva ganha um glóbulo (3 → 4 → 5) e no último degrau a serra dá **uma cravada a mais**. HP fica em **90**.

**A arte:** a serra saiu de 4 candidatas (`folhas/2026-09-19/serra-candidatas.png`) — a **`a-disco`** é a única
que lê como serra nos ~44px que tem na tela e respeita a lei do dark sci-fi. Dois clipes (giro no voo, travada),
instalados por `scripts/_f4/_instalar-serra.mjs`. ⚠️ **Nada de `setRotation`**: girar em tempo de jogo reamostra
o pixel e alisa o traço; o giro é ARTE. O glóbulo novo ainda está **em candidatura** (`glob2-*`, 32×16 deitadas
para a esquerda — as primeiras saíram redondas e o glóbulo de hoje é 12×5).

**Duas coisas consertadas já na captura:** o cabo saiu com o tom ESCURO dos cabos dele (0x282018) e sumiu contra
a pintura — passou para o tom aceso medido no PNG (0x604838); e a âncora saía por cima, o que fazia a primeira
diagonal virar um toco de 47px — passou para baixo do centro (`G_CABO_Y` −46 → **+20**).

Sondas: `probe-stage4` ✔ · typecheck ✔ · build ✔ · **`_f4/_provar-serra.mjs` ✔** (a serra FERE por contato —
a captura mostra a coreografia, mas não prova colisão; esta põe a nave no caminho e conta as vidas).
Capturas: `folhas/2026-09-19/serra-em-jogo.png` (14 fotos, rotuladas pelo estado do jogo).

**✅ JOGADA E APROVADA NA PRIMEIRA (19/09):** G1 *"o ângulo fica bom de perceber, mas com uma certa dificuldade
saudável"* · G2 *"dão tempo"* · G3 *"o canto: é preciso de uma mecânica de atrair a investida para um lado e
descer ou subir no canto na hora certa. A salva dificulta de forma saudável"* — **é exatamente a tensão que o
desenho buscava**: o canto deixou de ser um estacionamento e virou uma jogada de tempo · G4 *"fica boa de lutar,
os degraus sobem sim"* · G5 *"está num tamanho ótimo"*.

**A única troca pedida:** o glóbulo passou da `2b-lasca` para a **`2d-escoria`** (*"quero o glóbulo seja a
escória"*) — crosta escura com veios de lava. Já é o padrão do instalador.

---

### ✅ 19/09 — a RODADA 8: o metal do rasgo sobe quase o dobro

*"Na skill onde ele avança e crava as garras, jogando estilhaço de metal em lava para cima, quero que seja mais
alto, para forçar a nave a desviar mais, hoje em dia está muito baixo, pode subir o dobro ou menos um pouco."*

**A causa, medida** (`scripts/_f4/_medir-metal.mjs`, escrita para isto): não existe knob de altura — a velocidade
das lascas é RESOLVIDA para cair onde a nave estava, então quem manda na altura é o TEMPO DE VOO. Com
`METAL_VOO` 0,95 o ápice caía **exatamente na altura da nave** (92px acima do chão, com a nave em y=110): o arco
nunca passava por cima dela, e era por isso que parecia raso.

⚠️ **O dobro literal não cabe na arena:** do chão (186) ao teto (30) há **156px**, e o dobro seriam 184.
`METAL_VOO` **0,95 → 1,5** põe a lasca mais alta em **152px** (y=34), **1,65×** — o teto da arena, que é o
*"menos um pouco"* dele. O leque inteiro passou a cobrir y 34/56/76/92 contra os 94/101/111/118 de antes.
Medidas com a nave presa em y=110, para as duas leituras serem comparáveis. Captura: `folhas/2026-09-19/predador-r8.png`.

---

### ✅ 18–19/09 — a RODADA 6: o arremesso do teto refeito (JOGADA E APROVADA)

Antes de qualquer outra coisa nesta sessão ele apontou: *"quando o predador joga a lava, a animação confunde as
garras, começa com a de trás e acaba com a da frente"*. **Confirmado na folha quadro a quadro**
(`folhas/2026-09-18/r6-teto-lava-b-a-troca.png`): nos quadros 6–8 do `teto-lava-b` o braço que enrola passa ATRÁS
do tronco e some; quando a lava sai (10–13) quem aparece estendido é o braço da frente. O gerador troca a
identidade do membro no meio do gesto.

**A lei que sai disto:** num bicho com dois braços iguais, o gerador perde o fio quando o membro sai de vista. O
pedido tem de proibir a passagem por trás — *"stays in front of the torso and fully visible in every frame"* — e
não só dizer qual braço trabalha. Encenação resolve o que a instrução não segura.

**4 candidatas, PixMiniMax, 16 quadros, 8 gerações** (`assets/raw/furia-predador-anim5/`, folha
`folhas/2026-09-18/r6-candidatas.png`) — todas com o braço de cima travado no teto:
- `teto-lava-c` (recolhe no peito e chicoteia) — **vira jato**: sai um feixe que lê como cuspe, não como arremesso;
- `teto-lava-d` (arco por cima) — **clareia demais**: o braço vira chicote de fogo amarelo-branco, contra o dark sci-fi;
- `teto-lava-e` (upper, de baixo para cima) — a identidade da garra se segura, mas **9 quadros mortos** antes do golpe. **É a reserva** (`TETO_LAVA=assets/raw/furia-predador-anim5/teto-lava-e node scripts/_f4/_instalar-predador.mjs`);
- ✅ **`teto-lava-f` — a INSTALADA**: a garra da FRENTE colhe a bola no core aceso e a solta, visível nos 17 quadros,
  sem nunca cruzar para trás. Fica escura, na paleta do bicho.

⚠️ **A mão foi REMEDIDA:** o `f` solta na altura do PEITO, não lá embaixo como o `b`. Em `Predador.arremessar`, o
offset do teto passou de **−104,+43** para **−115,+7** virtuais (a bola no quadro 11 está em clipe 47,159; com
`TELEG_LAVA_TETO` 0,68 de 17 quadros a soltura cai no quadro 11,6). O knob do telegrafo **não mudou**.
Ferramenta nova: `scripts/_f4/_zoom-clipe.mjs` (um clipe em 256² cheio — foi na folha de meia escala que a troca de
garra passou batida) e `scripts/_f4/_ver-teto-lava.mjs` (o gesto em jogo, rotulado pelo QUADRO do clipe, não por ms:
cada screenshot custa 100–300ms e contar ms mente). Prova: `folhas/2026-09-18/teto-lava-em-jogo.png` (12 fotos,
q1→q17; a lava nasce entre q10 e q12). Sondas: `probe-stage4` ✔ · typecheck ✔ · build ✔.

**✅ JOGADO E APROVADO EM 19/09:** *"essa animação nova do predador tirando a lava do core ficou ótima e in-game
melhor ainda"*. **O R6 está fechado** — a garra não troca mais, e a bola sai da mão. O knob do telégrafo fica em 0,68.

---

### 🆕 19/09 — o 5º teste jogado: o FIM DA MORTE passou, e a RODADA 7 fecha os dois pedidos

**Aprovado, jogado:** F1 *"o corpo no chão ficou ótimo, me lembra o corpo do Demon no Tibia, uma baita referência de
boss"* · F2 *"essa nova geração deixou mais bem acabado e ficou ótimo"* · F3 *"as lascas ajudam a criar mais caos no
cenário"* · F5 *"as novas gerações de placas, costuras melhorou muito desde a primeira versão"* · F7 *"fecha bem"*.
**Bloco C:** o urro *"ficou ótimo"* (C2 fechado) · a emenda vertical da pintura *"nem consegui perceber, é muita
informação para reparar"* — **fica como está** (C3 fechado) · `nucleo.png`/`nucleo-beat-sheet.png` ficam no disco
*"como scrap ou substitutos caso precisemos futuramente"* — **não apagar** (C4 fechado).

| o que ele viu | o que mudou (rodada 7) |
|---|---|
| F4/F6 *"ela pode tomar mais alguns pixels para cima, para cobrir todo o chão, só verificar se o corpo afunda atrás da camada de lava e não na frente"* · *"afundar na frente dá impressão de estar caindo para outro local"* | **não era ordem de camada** — o corpo sempre esteve em depth 0 contra os 6 da poça (medido em jogo, `_f4/_ver-fim.mjs` despeja a ordem das camadas). Era GEOMETRIA: a faixa do chão tem 26px (216 − 190) e a poça ASSADA tem **36**, então parando na linha do chão 10px da arte eram jogados fora **e a crista ficava abaixo do corpo**, que tem 36,7px de altura na escala da luta. Agora `SOBE_ACIMA_PX` 10 leva a crista para y=180 — a arte inteira, 10px acima do chão — e `AFUNDA_PX` 30 → **36**. Medido: o topo visível do corpo vai de 155 a 180 e a sonda fecha em **CORPO COBERTO**. De quebra atende o F7 (*"se levantar um pouco mais a lava dá a impressão que é melhor sair dali logo"*). Garantia local: `corpo.setDepth(min(depth, DEPTH_LAVA − 0,5))`, para o dia em que alguém levantar a camada do predador |
| C1 *"acho que vale gerar uma nova animação com ele tirando do core"* (a lava do chão) | **`lava-core-c`** (`assets/raw/furia-predador-anim6/`, 4 candidatas, 8 gerações): o core do peito **abre em brasa** (quadros 7–9), a garra da frente colhe a bola ali e a empurra para a esquerda. O clipe velho (`anim/lava`, v3 da 1ª passada, 9 quadros) era um arremesso genérico por cima do ombro, sem relação nenhuma com o peito aceso |

**⚠️ O achado que vale para sempre: `TELEG_LAVA` e `TELEG_LAVA_TETO` são SEGUNDOS, não fração do clipe**
(`mudar(estado, dur)` grava `estadoT`). Cada um tem de cair no quadro em que a bola larga a garra DAQUELA arte —
trocar o clipe sem refazer a conta põe a bola nascendo no vazio. No `lava-core-c` a bola aparece no quadro **13 de
17** (76%), então o clipe passou a durar `LAVA_MS` **700** (era 1000, cravado no código) com `TELEG_LAVA` 0,5 →
**0,53s**: o aviso fica igual ao que ele já aprovou. Esticar para os 1000ms antigos daria 0,76s de aviso — mais
fácil de desviar, e isso é decisão de luta, não de arte. A mão do chão foi remedida: **−70,−40 → −83,+5** virtuais.

**Candidatas guardadas** (`folhas/2026-09-19/r7-lava-candidatas.png`): `lava-core-a` (overhand — a garra some e
brota outra no fim), `lava-core-b` (por baixo — gesto pequeno, a bola fica boiando), `lava-core-d` (o core racha e a
lava CAI no pé — lê como vazamento, não como arremesso; a abertura do peito é bonita e fica de ideia). Trocar:
`LAVA=assets/raw/furia-predador-anim6/lava-core-a node scripts/_f4/_instalar-predador.mjs`.

Ferramentas novas: `_f4/_medir-mao.mjs` (onde a bola deixa a garra, em px virtuais, por clipe) · `_f4/_ver-fim.mjs`
(o fim da morte em jogo com a ordem das camadas e a geometria, pelo relógio do JOGO) · `_f4/_ver-arremesso.mjs`
(`ONDE=chao|teto`). Provas: `folhas/2026-09-19/fim-em-jogo.png` · `r7-lava-chao-em-jogo.png` · `r7-lava-core-c.png`.
Sondas: `probe-stage4` ✔ · typecheck ✔ · build ✔.

**✅ A RODADA 7 FOI JOGADA E APROVADA (19/09):** S1 *"está ótimo"* · S2 *"ficou bom assim"* · S3 *"a bola sai da mão
e a lava sai do core dele"* · S4 *"ficou bom"*. **O B3 está fechado.**

**Um defeito pego no S3, e consertado na hora:** *"existe um artefato (bola de lava) da própria animação que vai
para baixo no movimento. Mas não atrapalha muito"*. A bola PINTADA continua na garra nos quadros 14–16 do
`lava-core-c` e desce com o braço — então, depois que o motor lançava a de verdade, havia DUAS na tela. O clipe
passou a ser CORTADO no quadro 14 (`LAVA_QUADROS`, 15 quadros), com `LAVA_MS` 700 → **580** para o telégrafo cair
exatamente no 13, onde a bola deixa a garra: `TELEG_LAVA` volta a **0,5s**, o número que ele já tinha aprovado.
Sobra um só quadro de acompanhamento (~39ms) e a pintada nunca chega a descer.

**✅ E a arena do golfinho (o item 🔵 de fechamento) também foi jogada e aprovada:** *"a dificuldade está bem
balanceada e punitiva se errar a batalha. Está ótimo assim"*. O `corredor` de t=38,5 com `rate 2.6` **fica como
está**.

### 📜 Registro: 19/09 — O ACHADO QUE ABRIU O REDESENHO DA LUTA (já resolvido, ver acima)

Ele aprovou a RESPIRAÇÃO do guardião (*"está boa"*, o miolo que quase apaga não atrapalha) e, no mesmo fôlego,
abriu um problema maior, que é de LUTA e não de arte:

> *"nós vamos ter que repensar a luta com o guardião, está a mais fácil de todas, o guardião está bem fraco em
> questão de ataque. E o ataque de investida dele está desbalanceado, pois é impossível desviar desse ataque. Ou
> seja, tirando a investida impossível de desviar, os 3 tiros dele são muito fáceis."*

**Medido em jogo** (`scripts/_f4/_medir-guardiao-luta.mjs`), e os números explicam as DUAS queixas de uma vez:

| o que | medida | o que significa |
|---|---|---|
| o corpo na INVESTIDA (`corpoInteiro`, 210×190 na escala 0,7) | **147×133px na tela** | ocupa 133 dos **160px** do vão jogável (y 30..190) |
| a folga | **27px**, menos os 6,3px do corpo da nave | **~20px de escapatória**, divididos entre em cima e embaixo — ~10px de cada lado |
| a mira | `setVelocity(-300, clamp((alvo.y − y)·1,2, ±70))` | vai na altura da nave E ainda deriva até 70px/s na direção dela durante a travessia |
| os glóbulos do leque | **100 px/s**, 3 a cada 1,8s | a nave anda a **110 px/s** (`FreeController.SPEED`): ela é mais rápida que o tiro |

**Não é gosto, é geometria:** um corpo que cobre 83% do vão, mirado em você, não tem desvio; e um projétil mais
lento que a nave não é ameaça. ⚠️ **Nada disso foi mexido** — repensar a luta é decisão dele, e é comportamento,
não arte. O lugar disso é um brainstorming antes de qualquer código.

---

### 📜 Registro: o roteiro do teste do FIM DA MORTE (rodada 5b) — TODO RESPONDIDO em 19/09

| # | olhar | a pergunta |
|---|---|---|
| F1 | **o corpo no chão**, 0,55s antes de o piso ceder (`ESPERA_MS`) | *dá tempo de ver que ele morreu, ou já vem atropelado?* |
| F2 | **as gretas** abrindo em 6 estágios sob o corpo, correndo com o chão (`RACHA_MS` 900) | *lê como CHAPA RASGANDO? avisa o que vem?* |
| F3 | **o estouro** — 5 explosões na linha do chão, brasas e as lascas de placa girando | *tem peso? as lascas ajudam ou poluem?* |
| F4 | **a lava subindo** até a linha de onde era o chão (`SOBE_MS` 900) | *a velocidade está boa? a poça É DO CENÁRIO (a paleta é a da faixa do chão) ou ainda parece colada por cima?* |
| F5 | **a crosta** — placas escuras com as costuras acesas, escorrendo para a esquerda | *o movimento resolve o *"o chão continua passando embaixo"*?* |
| F6 | **o corpo afundando** (`AFUNDA_MS` 1100, `AFUNDA_PX` 30), esfriando até o breu | *afunda fundo o bastante? some na hora certa?* |
| F7 | **a espera até a cutscene** (`CORPO_FICA_MS` 4200) | *o silêncio com a poça ondulando fecha bem, ou cansa?* |

**Se algo não convencer, o ajuste é no ASSADOR** (`scripts/_f4/_assar-fim-f4.mjs` — tamanho das placas
`SEMENTES`, espessura da costura `LIMIAR_COSTURA`/`LIMIAR_BOCA`, largura do vão da fenda `abertura`, a paleta `P`),
e depois `node scripts/_f4/_assar-fim-f4.mjs`. **Não** volte a desenhar isso com `Graphics`.

**📜 O bloco C, FECHADO em 19/09:** a lava do chão foi refeita (`lava-core-c`, tirada do core) · o urro *"ficou
ótimo"* e continua o clipe v3 · a emenda vertical da pintura fica como está (*"nem consegui perceber"*) ·
`nucleo.png`/`nucleo-beat-sheet.png` ficam no disco *"como scrap ou substitutos"* — não apagar.

---

### 📜 Registro: o roteiro da rodada 3 (16/09) — TODO RESPONDIDO em 17/09

**A. O que a rodada 3 mudou:**
| # | olhar | a pergunta |
|---|---|---|
| A1 | **o idle no chão** — ele ANDA no lugar (`andar-c`) | *ainda parece deslizando com a fase em movimento?* |
| A2 | **a carga** — anda, o core acelera, e no fim ele **cai de quatro** | *a queda de quatro lê como aviso? dá tempo de sair da linha?* |
| A3 | **o bote** — **galopa pelo chão** como gorila/urso | *lê como corrida? a velocidade (`BOTE_VEL` 300) está boa?* |
| A4 | **o slash** — se inclina, **dois golpes** torcendo, com arcos de fogo, e **SALTA até a altura da nave** | ⚠️ *mudança de JOGO, não só de arte:* antes o bote ia na diagonal até a nave; agora ele corre no chão e o salto é do golpe. *Ficou justo? Nave no alto ainda é atingida do jeito que ele quer?* |
| A5 | **subir no teto** — pula esticando uma garra e **agarra** | *natural? (o clipe inteiro toca no voo, 850ms)* |
| A6 | **pendurado por uma garra** — balança (`teto-balanco`) | *lê como preso por uma garra? ⚠️ pendurado ele fica COMPRIDO (da borda de cima até ~40px do chão) — fecha demais a arena?* |
| A7 | **o arremesso pendurado** — o braço livre joga a lava (`teto-lava2`) | *a lava sai da mão no momento certo? (`TELEG_LAVA_TETO` 0,65s)* |
| A8 | **descer do teto** — o mesmo clipe de agarrar, ao CONTRÁRIO | *lê como soltar e cair, ou como "rebobinar"?* |
| A9 | **andar de uma âncora do teto para outra** — vai balançando | *serve, ou precisa de um clipe de "garra em garra"?* |
| A10 | **a morte fora do chão** — mate-o PENDURADO ou no meio do salto | *o corpo cai e fica na borda do chão?* |

**B. O que já foi aprovado — conferir que NÃO regrediu** (a rodada 3 reescreveu o `Predador` com o "quadro virtual"):
o surgimento (explosão sangrenta, sangue na tela, fumaça atrás dele, urro, o pulo com giro para a esquerda) · o breu
(preto total, só o core revela, halo justo na nave) · a lava (cor de lava, brilho no breu, ricochete em estilhaços) ·
a morte no chão (desaba e fica estendido) · a saída pela direita e o aviso da reentrada.

**C. Pontos nunca perguntados que ele pode querer julgar:**
- a **lava do chão** ainda é o clipe v3 da 1ª passada (em pé, quase parado 1s — pode "deslizar" como o idle deslizava);
- o **urro** também é v3 da 1ª passada (ele aprovou a transição, não o clipe isolado);
- a **emenda vertical da pintura** do núcleo que passa pela arena (anterior ao predador);
- `nucleo.png` / `nucleo-beat-sheet.png` seguem no disco sem uso — apagar é decisão dele.

### 🔧 Onde mexer, por tipo de pedido (vale para qualquer rodada)
- **Efeito de cenário (lava, rachadura)** → mexa no **assador** e rode de novo; o código de cena não desenha nada.
- **Ajuste de número da luta** → a tabela de knobs da ⏸️ ("O que ajustar"). Rode `node scripts/probe-stage4.mjs` depois.
- **Clipe que não serve** → primeiro veja se a perdedora guardada resolve (`assets/raw/furia-predador-anim3/` e
  `anim4/`, folhas `r3-*.png` e `r4-candidatas.png`): trocar é apontar o `_instalar-predador.mjs` e reinstalar,
  **zero geração** — e conferir o fator em `Predador.QUADRO` (a base de onde o clipe foi gerado).
- **Clipe novo** → PixMiniMax via `scripts/_f4/_pl.mjs mini`, com as lições da rodada 3 (sem quadro final fixo;
  ache o laço com `_achar-loop.mjs`; transição de postura antes do ciclo; base reduzida se o gesto não cabe).
- **Prova para ele** → `node scripts/_f4/_ver-predador.mjs <saida.png>` (35 fotos: a luta inteira, a volta com o
  rasgo e a morte de 0,5s a 4,6s).

### 📜 Registro: a fila obrigatória dele depois do B3 — HOJE TODA FECHADA
~~**B2** (a posição do guardião no alto-direita, cortado pela borda)~~ **✅ FECHADO EM 20/09 SEM CÓDIGO** — a
posição já estava certa, e a razão é geométrica: os cabos encontram a borda de cima, e é ela que esconde o corte
do sprite de 256². → **M4** (as 3 portas com arte final, a borda C
grossa, o esfíncter). Os cortes da tabela amarela (M3, `f4Vivo`, `f4Veu`) foram todos
**riscados em 19/09** — ver "🧭 O MAPA PARA FECHAR A FATIA 7" no fim deste arquivo. Fechar a fatia = merge `--no-ff` de `feat/fase4-visual` em `main`.

---

## 📜 O PREDADOR, DA RODADA 1 À 8 — O REGISTRO COMPLETO (fechado em 19/09)

**Os arquivos da rodada 5b:** `src/entities/fimDoPredador.ts` (a linha do tempo, só toca arte assada) ·
`scripts/_f4/_assar-fim-f4.mjs` (assa `f4-racha-sheet`, `f4-lava-sheet`, `f4-destroco`) · `BossNucleo.destroy`
(deixa o corpo e chama o fim) · `StageBoss.pausaFinalMs` + `BossNucleo.CORPO_FICA_MS` 4200 (a espera da cena) ·
`BootScene` (as 3 folhas novas). **Da rodada 4:** `Predador.reentrar/rasgar/lancarMetal`, o tipo `metal` da lava
e a textura `metalBrasa`.

### O registro das rodadas 1 a 3 (16/09)

### 🎮 O 2º TESTE JOGADO (16/09) e a rodada 3
**Aprovado:** *"a fase do escuro ficou bem mais imersiva, a lava está ótima, principalmente quando ricocheteia"* ·
*"a morte ficou bem melhor"* · *"a fumaça trouxe mais detalhe e cobertura para a troca"* · *"a transição do urro para o
idle olhando para a nave ficou bem melhor com o giro, ficou realmente ótimo"* · *"a investida com slash ficou boa"*.

| o que ele viu | o que mudou (rodada 3) |
|---|---|
| *"o idle do monstro é idle, a fase está em movimento e no idle parece que está deslizando"* | parado no chão ele **ANDA no lugar** (`andar-c`, laço 4..12); pendurado ele **BALANÇA** (`teto-balanco`, laço 5..15) |
| *"queria ele se inclinando e mexendo mais no slash… correndo como um gorila ou urso"* | fim da carga: **cai de quatro** (`quatro-b`); bote: **galope** no chão (`corrida-c`, laço 1..15); chegada: o **slash inclinado com dois golpes** (`slash-a`) com **SALTO** até a altura da nave e volta ao chão |
| *"a animação da parede é praticamente o predador de cabeça pra baixo, perdeu a animação de estar preso por uma garra"* | chão→teto: **pula e AGARRA o teto com uma garra** (`teto-a`, o clipe no voo); pendurado por um braço; teto→chão: o mesmo clipe ao **contrário**; arremesso com o braço livre (`teto-lava2`) |
| *"o corpo não pode flutuar caído. Precisa cair na borda"* | morto fora do chão, ele **despenca até a linha dos pés** (`QUEDA_MS` 420) enquanto desaba |
| (morreu a morte da rodada 2 no chão, no teto e no salto — medido na captura: cai e fica estendido na borda) | |

**A mudança de estrutura: O QUADRO VIRTUAL.** Galopando ou pendurado ele não cabe no 256² na escala da luta, então esses
clipes foram gerados da pose de luta REDUZIDA dentro do quadro (0,85 chão, 0,75 teto, presa pela base) e cada clipe
tem um fator em `Predador.QUADRO` — desenhado em `escala / f` com a origem em `(0,5 ; 1 − f/2)`. ⚠️ Trocar a arte de
um clipe por outra gerada de outra base OBRIGA a trocar o fator ali. A sonda passou a ler a escala LÓGICA (`predador.escala`).

**As lições de geração da rodada 3:**
- **Fixar o último quadro = o primeiro para fechar o ciclo TRAVA o PixMiniMax** (os 4 andares/corridas saíram parados).
  O que funcionou: gerar SEM quadro final e achar o laço dentro do clipe — `scripts/_f4/_achar-loop.mjs` (mede o fecho
  contra o passo médio; razão < 1 = costura invisível).
- **O gerador não muda de postura dentro de um ciclo** (em pé → de quatro): gere a TRANSIÇÃO primeiro (`quatro-b`) e o
  ciclo a partir do último quadro dela.
- **Base reduzida dá espaço ao gesto**: pendurar e galopar só couberam com a pose a 0,75/0,85.
- **Perdedoras em `assets/raw/furia-predador-anim3/`**: `andar-a/b/d` (paradas / fundo azul no d), `corrida-a/b/d`,
  `slash-b`, `teto-b`, `quatro-a`, `ronda-a/b` (a marcha de quatro — fraca de movimento; guardada).
- **Hitbox ainda a olho:** a casca e o corpo inteiro do pendurado (`CASCA_TETO`/`INTEIRO_TETO`); de quatro, o corpo inteiro.

**PixelLab rodada 3:** 36 gerações (4.252 → **4.216**), todas PixMiniMax. Folhas das candidatas: `r3-chao.png`,
`r3-slash-teto.png`, `r3b.png`, `r3c.png`. Captura: `predador-em-jogo-r3.png` (25 fotos, a morte no teto caindo).

### 🎮 O 1º TESTE JOGADO (16/09) e a rodada 2
*"Eu gostei de como ficou a luta, a mecânica ficou interessante. Mas as animações deixaram a desejar."*

| o que ele viu | o que mudou (rodada 2) |
|---|---|
| *"o pulo e a girada para WEST precisa ser ajustada para ficar mais natural"* (o jogo de tamanhos ficou bom) | clipe novo **PixMiniMax S→luta com quadro final fixo**: agacha, TORCE o corpo no ar, pousa de três quartos. O motor só sobe entre o impulso e o pouso (`PULO_QUADROS`, `PULO_IMPULSO` 0,36, `PULO_POUSO` 0,92, `PULO_ALTURA` 30) |
| *"ele dá o dash, mas não vejo movimento da garra"* | **slash em três tempos**: clipe PixMiniMax partido no quadro 8 — a garra SOBE na carga, fica erguida no bote, DESCE em arco vermelho na chegada (`SLASH_PREP`, `SLASH_PREP_MS` 700, `SLASH_MS` 480). O rastro do motor (`rastroDoCorte`) ficou desligado: o clipe já traz o arco |
| *"na parede ficou boa, mas muito deformado, quase irreconhecível"* | o teto é a **pose de LUTA ESPELHADA** (não mais a editada) + clipe PixMiniMax do arremesso a partir dela. Miolo remedido: −23,+2 |
| *"a animação da morte não é nada, é quase um idle"* | clipe **PixMiniMax**: grita, cambaleia, DESABA e fica estendido — + o sangue do mesmo organismo (`sangue.ts`, agora compartilhado) + 5 estouros pelo corpo |
| *"a lava tem que ter cor de lava"* | bola desenhada no motor (núcleo branco-amarelo → laranja → vermelho), **luz ADD tremulando** e **rastro de brasas** (`lancarLava`) |
| *"a lava eu não consegui ver no escuro… lava é fogo, brilha"* | a lava, a luz e as brasas ficam ACIMA do breu |
| *"a fase pode escurecer mais, ficando uma tensão no ar"* | `BREU_ALPHA` 0,96 → **1** (a pintura e a borda somem de vez); o halo da nave um pouco menor |
| (visto na captura) a fumaça preta do estouro sobre a barriga dele | a fumaça passa para trás do predador quando ele surge |

**A lição da ferramenta:** o **PixMiniMax** ganhou TODOS os confrontos contra o v3 nos gestos grandes (o v3 gira
no lugar / quase não se mexe) e custa **2 gerações por clipe em 256²**. Candidatas lado a lado:
`folhas/2026-09-16/r2-pulo.png`, `r2-slash-teto.png`, `r2-morte.png`. As perdedoras seguem em
`assets/raw/furia-predador-anim2/` (`*-v3`, e `morte-v3b` com o quadro final `morte-fim.png`) — trocar é só
apontar o `_instalar-predador.mjs` (`PULO=… MORTE=…` no ambiente) e reinstalar.

**Ainda do v3 (ele não reclamou):** o urro, o idle e a lava do chão.
**PixelLab rodada 2:** 49 gerações (4.301 → **4.252**).

### A 1ª passada (antes do teste)

**Spec:** `docs/superpowers/specs/2026-09-16-fatia7-b3-predador-design.md` (substitui a B3 da spec de
06/09). **Plano:** `docs/superpowers/plans/2026-09-16-fatia7-b3-predador.md`. **Código:**
`src/entities/Predador.ts` (a forma 2 inteira) e `BossNucleo.ts` (o guardião e a troca).

### As decisões dele, na ordem do brainstorm
- **A candidata B (predador)**, e a luta que ELE desenhou: mobilidade + furtividade; investida+slash,
  lava, e o stealth stage no breu.
- **Paredes (c):** chão E teto E lateral — mas **a lateral caiu no mock** (não há parede à direita; a pose
  girada vira bolo de garras). Virou **SAÍDA**: ele salta para fora e reentra noutro ponto, com aviso. O
  teto ganhou **pose e animação próprias** (pedido dele).
- **Ataques por vida (a):** fase 1 no chão · fase 2 a ronda · fase 3 o breu.
- **O alvo (c), a mistura:** o peito sempre vulnerável; **dano dobra na recuperação**.
- **O breu:** a nave visível com **halo justo que não ilumina nada**; **só o core revela o predador**.
  A carga da investida é **o core pulsando devagar e acelerando** (ideia dele — *"assim dá tempo do
  jogador esquivar"*).
- **Lava:** arco com gravidade nas fases 1–2; **estoura em estilhaços na borda no breu**.
- **Surgimento:** **arma travada** (a nave voa livre); **0,7 → 0,47 no pulo**; **explosão no motor
  primeiro** + **sangue na tela** (*"fica imersivo e dá mais desvio para a transição"*).

### A arte — o que aprendemos gerando
- **As rotações de 8 direções ALISAM o estilo** (*"mais liso e mais cartunesco… menos horrendos"*). Edição
  com a S de referência pegou a pose da referência (a SW virou frontal); edição por texto quase não mudou.
  Medido: não é brilho médio, é CONTRASTE (faixas limpas vs. meios-tons barrentos).
- **A saída: tirar a pose da própria S por ANIMAÇÃO.** O giro v3 herda o traço. Parou em três quartos —
  e isso é melhor para a luta (o peito encara a nave). O giro clareava (lum 46→61): corrigido por gama.
- **Via REST a partir de PNG local:** `scripts/_f4/_pl.mjs edit|anim` (o MCP pede base64 inline, que trunca).
- **A morte gerada quase não se mexe** (o mesmo limite da do guardião): a do predador é o clipe + a cadeia
  do `killBoss` por cima. Se ler como "desligou", compor como a do guardião.
- **PixelLab 16/09 (1ª passada):** **100** gerações — 4.401 no arranque, **4.301** no fim (8 rotações, 3 edições de estilo, 1 pose do teto, 7 clipes v3). Ciclo vira em 2026-10-04.

### O que ajustar quando ele jogar — os knobs (todos `static readonly` no topo de `src/entities/Predador.ts`)
| o que | knob |
|---|---|
| a duração do surgimento e o pulo com giro (aprovados) | `URRO_MS` 1200, `SALTO_SURGE_MS` 1000, `PULO_QUADROS`, `PULO_IMPULSO`/`PULO_POUSO`, `PULO_ALTURA` 30, `ESCALA_SURGE` 0,7 / `ESCALA_LUTA` 0,47 |
| o andar no lugar (A1) | `ANDAR_QUADROS` (laço 4..12 do `andar-c`), `ANDAR_MS` 900 — mais rápido = passos mais curtos contra a rolagem |
| a carga e a queda de quatro (A2) | `CARGA` por fase [1,5 · 1,3 · 1,6], `CARGA_MIN` 0,9, `QUATRO_MS` 380 |
| o galope (A3) | `BOTE_VEL` 300, `CORRIDA_QUADROS` (1..15), `CORRIDA_MS` 620 |
| o slash com salto (A4) | `SLASH_QUADROS` (2..16 do `slash-a`), `SLASH_MS` 900, `SLASH_SALTO_ATE` 0,45 (a fração em que ele chega no alto); o alvo do salto é a altura da nave no FIM da carga, preso entre y=70 e o chão |
| subir, pendurar, descer, balançar (A5–A9) | `SALTO_TETO_MS` 850, `BALANCO_QUADROS` (5..15), `BALANCO_MS` 1300, `TETO_LAVA_MS` 1100, `TELEG_LAVA_TETO` 0,68, `ANCORAS` (x do teto 322/262) |
| o arremesso do teto (rodada 6, ✅ aprovada) | a arte é o `teto-lava-f` (reserva: `teto-lava-e`, por `TETO_LAVA=`); a MÃO que solta é o offset do teto em `Predador.arremessar` (−115,+7 virtuais) — ⚠️ trocar o clipe OBRIGA a remedir a mão |
| a queda do corpo morto (A10) | `QUEDA_MS` 420 |
| a punição da recuperação | `RECUP_SLASH` 1,0, `RECUP_LAVA` 0,6, `DANO_RECUP` 2 |
| a lava do chão (rodada 7, ✅ aprovada) | `LAVA_G` 260, `LAVA_VOO` 1,1, `ESTILHACOS` 6 · `LAVA_QUADROS` (0..14, corta a bola pintada que descia), `LAVA_MS` 580 e `TELEG_LAVA` **0,5s** (SEGUNDOS, não fração) · a arte é o `lava-core-c` (trocar por `LAVA=`) · a MÃO é o offset do chão em `Predador.arremessar` (−83,+5) — ⚠️ trocar o clipe OBRIGA a remedir a mão e o telégrafo |
| a LUTA DO GUARDIÃO (a repensar, 19/09) | `INVESTIDA_CADA` 6, `TELEGRAFO_DUR` 0,55, a velocidade −300 e a deriva ±70 em `telegrafo`→`investe`, `corpoInteiro` 210×190, o `leque(3, …)` a 100px/s a cada 1,8s — ⚠️ **nada decidido**, ver o bloco 🔴 na 🚦 |
| o ritmo entre ataques | `PAUSA` por fase |
| a saída e a VOLTA QUE ATACA (rodada 4 ✅; a altura do metal, rodada 8) | `FORA_MIN/MAX` 1–2s, `AVISO` 0,5, as chances em `depoisDoAtaque` (25% sai, 50% troca de âncora) · `RASGO_X` 192, `RASGO_MS` 1100, `RASGO_SOLTA` 0,7, `RECUP_RASGO` 0,9, `METAL_N` [·,3,4,5], **`METAL_VOO` 1,5** (é ELE que manda na ALTURA do arco — não há knob de altura; medir com `_f4/_medir-metal.mjs`), `METAL_ABRE` 30 |
| o FIM DA MORTE (rodadas 5b ✅ e 7, a julgar) | em `fimDoPredador.ts`: `ESPERA_MS` 550, `RACHA_MS` 900, `ESTOURO_MS` 380, `SOBE_MS` 900, `AFUNDA_MS` 1100, **`SOBE_ACIMA_PX` 10** (o quanto a crista passa da linha do chão), **`AFUNDA_PX` 36**, `LAVA_QUADRO_MS` 110 · em `BossNucleo`: `CORPO_FICA_MS` 4200 · **a APARÊNCIA fica no assador**, não aqui |
| o breu (aprovado) | `BREU_ALPHA` 1, `PULSO_BREU` 2,4, o alpha da cópia revelada em `atualizarBreu` (0,62) |
| as linhas de apoio | `CHAO_APOIO` 190, `TETO_APOIO` 30 (a ponta da garra pendurada) — a olho na borda desenhada |
| as hitboxes | `CASCA`/`INTEIRO` (virtuais, medidas só no miolo), `CASCA_TETO`/`INTEIRO_TETO` (px do clipe de 0,75) — ⚠️ **a olho**, só o MIOLO é medido |
| o fator de cada clipe | `Predador.QUADRO` — ⚠️ obrigatório conferir ao trocar a arte de um clipe |

### ✅ Pontos vistos na captura — TODOS decididos (19–20/09)
- A **emenda vertical da pintura** do núcleo passa pela arena (x≈270 na foto do aviso): *"nem consegui perceber,
  é muita informação para reparar"* → **fica como está**.
- O coração saiu inteiro: `nucleo.png`/`nucleo-beat-sheet.png` seguem no disco, sem uso. *"Mantém por enquanto"*
  (20/09) → **não apagar**, e não é trabalho pendente.

### Sondas (a última rodada: 16/09, depois da rodada 3)
`probe-stage4` ✔ (a troca revela o predador, a arma trava e destrava, 0,7→0,47, a bala real fere o peito,
o dano dobra na recuperação, a fase 3 liga o breu, matar entrega a cutscene final) · typecheck ✔ · build ✔.
A sonda lê a escala LÓGICA (`predador.escala`), não a desenhada (que é `escala / f`). Captura: `node scripts/_f4/_ver-predador.mjs [saida]` → a rodada 3 está em `docs/superpowers/folhas/2026-09-16/predador-em-jogo-r3.png` (25 fotos); as anteriores, `predador-em-jogo.png` (1ª passada) e `-r2.png`.

---

### 📜 Histórico: a rodada 1 da "fúria" (15/09) — de onde saiu a escolha

#### A rodada 1 — 4 conceitos, `create_object_pro_flash` 256×256, 9 gerações cada (36)

Referência de estilo: o guardião (`9436240c`). Tudo guardado em **`assets/raw/furia-candidatas/`** (os 4
PNG + `candidatas.json` com object_id e prompt de cada uma). Folha: **`docs/superpowers/folhas/2026-09-15/furia-candidatas.png`**
(linha de cima crua em escala 1; linha de baixo sobre `paint-bg-f4-d` a 0,7 no lugar do guardião).
Remontar: `node scripts/_f4/_folha-furia.mjs <saida.png> rotulo=object_id …`.

| | object_id | conceito | leitura |
|---|---|---|---|
| **A · serpente** | `0cea374e-0514-48cf-a0f6-5c45946a9b77` | larva esfolada em S, costelas, mandíbula em 4 ganchos | silhueta mais diferente do guardião; os dentes brancos são o valor mais claro da folha |
| **B · predador** | `76945935-56fe-43da-a498-7284a2823022` | besta sem pele, garras-lâmina, peito rasgado aceso, casca nos ombros | **a recomendada**: fúria, alvo natural no peito, carrega a casca, vertical contra a bola; ocupa a altura da arena |
| **C · boca** | `355c6301-96cc-43e3-8b03-24dd6c76e8be` | tentáculos em volta de bocarra vertical, cacho de olhos | alvo mais óbvio (a garganta), mas silhueta REDONDA — o defeito medido no coração |
| **D · louva** | `c0457daf-2a87-4420-bc31-45b4899e23ae` | louva-a-deus de carne, lâminas, asas rasgadas | a mais vil, e a mais vermelha/saturada — a que mais foge do dark sci-fi |

⚠️ **Dois desvios do gerador:** (1) *"Side view, facing LEFT"* foi IGNORADO — B, C e D vieram de FRENTE
(num shmup encarar o jogador funciona, mas o guardião é de perfil); (2) os restos de casca quase não
vieram — só a B. Se ele pedir outra rodada, **mude o pedido em vez de repetir** (ver a memória
`gerador-ignora-limite-de-cor`): referência de imagem da escolhida via `create_object_state`, ou
descrever a pose pelo que a vista mostra (*"we see its left flank, head at the left edge"*).

**PixelLab em 15/09:** 4.437 no arranque, **4.401** no fim — **36** gerações, só as 4 candidatas (o
guardião entrou com os quadros que ele já tinha baixado). Ciclo vira em 2026-10-04.


---

## ✅ AS DUAS DECISÕES GUARDADAS — FECHADAS EM 15/09 (a emenda aprovada, a pintura fica)

1. **A entrada do núcleo pela emenda** (4ª rodada). Ele reprovou o mergulho no escuro (*"de novo, está
   muito seca"*); a resposta instalada é a cortina de borda macia seguindo o pilar. **Aprovada jogando em 15/09.**
   Knobs: `Parallax.ENTRADA_RAMPA` (112px, a largura da borda macia) e a duração do `limpaCenario`
   (1400ms) no `runEvent` do `cenario`. Reverter é tirar `entrada: 'emenda'` da linha de t=109.
2. **A pintura do núcleo "ampliada".** **Medido: não está** (captura e arquivo batem na mesma escala;
   384×216 em escala 1; é a de MAIS detalhe das quatro). O que lê como ampliado é o enquadramento da
   arte. Caminhos oferecidos, **escolha dele** (fundo pintado é peça dele): **(a)** desampliar o
   original — estender o quadro por outpaint e reduzir para 384×216, que a lei permite; **(b)** ele
   gerar de novo com enquadramento mais aberto.

E uma nota que ele mesmo deixou para depois: *"se precisarmos espaçar mais [as colunas] é um detalhe
que no balanceamento geral podemos fazer depois"* — o knob é o `gap` das camadas `orgao` e `maquinario`.

---

## 🎯 O QUE MUDOU EM 14/09 — o registro, rodada a rodada

| # | o que | o que foi feito | o knob se ele reprovar |
|---|---|---|---|
| 1 | **Os tubos laterais** do coração e do maquinário | 1ª rodada (dissolver as pontas) **reprovada**: *"os tubos ainda aparecem sim"*. 2ª rodada (14/09): as duas peças **regeradas verticais**, tubos só em cima e embaixo. O coração virou COLUNA do chão ao teto (escala 1,45–1,6, as duas pontas enterradas); na 3ª rodada o maquinário virou coluna também (ver a seção da 3ª rodada). **Aprovadas jogando.** Objetos `7d5df865` e `a4f7f9e0`, animados e assados contra o quadro estático. ⚠️ A 1ª tentativa de regerar (`8b39566b`, `ab212ce2`, com a peça radial de referência) copiou a forma com os tubos — as 8 seguem na fila | a escala do `orgao` no `Parallax` (⚠️ piso 1,41, abaixo disso o cabo de cima fica no ar); o maquinário usa só os quadros 0–5 (6–8 estouravam); o `gap` das duas camadas é o espaçamento |
| 2 | **As costuras entre bordas** (*"por que não colocar um pilar menor na frente dessa costura"*) | a borda mora na PLACA e a câmara nova entra pela direita. **E a costura ganhou um PILAR** (a ideia dele): a primeira placa da câmara nova carrega uma `junta` — uma mesa a 0,8 de escala, decoração sem corpo, plantada na emenda em cima e embaixo. A→B usa a mesa do mar, B→D a de aço (campo `junta` no `cenario`) | `JUNTA_ESCALA` e `JUNTA_SOBRA` na `Moldura`; a arte é o `junta` do evento |
| 2b | **O fim do duto** (*"estranha e sem acabamento… transição repentina"*) | duas causas, as duas saíram: (1) a SAIA sumia no quadro de t=106 com a parede colada ainda na tela — agora ela acende por GEOMETRIA, onde a peça não alcança a borda; (2) o tint do duto descoloria a parede inteira no mesmo quadro — agora ele é da placa e acende/apaga em degradê de 3 placas, entrando pela direita. Na 3ª rodada o fio e a mordida também viraram da placa, e o duto passou a durar até t=109 | `LETAL_PLACAS` na `Moldura` |
| 3 | **O núcleo só com fundo e borda** (*"retire os maquinários do fundo do núcleo"*) | `soFundo` no `cenario` de t=109: TODAS as camadas de peças apagam (1400ms desde a entrada pela emenda da 4ª rodada; eram os 300ms do mergulho). Vale também no `G` e no treino | a duração em `GameScene.runEvent` (`fadeMs/2`). ⚠️ Ele disse *"todas as fases de BOSS"* — F1–F3 **não foram auditadas** contra isso |
| 4 | **A maré da câmara do golfinho** | t=36: as mesas de aço **DESMORONAM** (2ª rodada, *"elas somem apenas, poderia dar um efeito de desmoronar"*): tranco, poeira na linha da borda, queda de 1,3s · câmara cheia: nasce a **mesa do mar** (`mesaMar`/`mesaMar2`), sempre emergindo da parede · morte do golfinho: as do mar **explodem e afundam** · 1,4s depois o aço volta, os 3 primeiros pares emergindo | `MARE_ESPERA` e `MARE_PARES_EMERGINDO` na `GameScene`; as durações no `TerrainSystem` (`desmoronar` 380+1300ms, `afundar` 1100ms, `emergir` 900ms). **Aprovada jogando** |
| 5 | ⚠️ **A arena do golfinho agora TEM corredor** | o `corredor` de t=38,5 foi de `rate: 0` para `rate: 2.6, gap: 120` — sem isso não haveria mesa do mar para explodir na morte. **É uma mudança de dificuldade do duelo**, e só o controle na mão julga | o `rate` dessa linha para cima; `rate: 0` devolve a arena vazia (e tira as mesas do mar junto) |
| 6 | **A arte das mesas do mar** | 2 objetos PixelLab com as mesas instaladas de referência: `5eff6d47…` (contêineres, escolhida a [1], coral ciano) e `84f4a25c…` (anteparo, escolhida a [0], anêmonas e costela). As outras 6 seguem na fila de review. 94px de largura, a mesma pegada das de aço | trocar a candidata em `ESCOLHIDAS` de `_assar-mesa-mar.mjs` e reassar — zero geração |

### A pergunta que eu interpretei sem confirmar

*"As novas mesas vão submergir"* foi lido como **elas emergem da parede já debaixo d'água** (sobem no
lugar). Se ele quis outra coisa (elas afundando ao longo do duelo, por exemplo), é o `emergir` que muda.

### ⚠️ AS LEIS NOVAS DE 14/09

- **Arena de chefão é só fundo (+ borda na F4).** Ver `Parallax.limpaCenario` — só alpha; a camada
  segue emitindo porque o `emit` gasta `Phaser.Math.Between`, o fluxo de dado do jogo.
- **A borda mora na placa.** `Moldura.setFaixa` ao vivo só reescreve placas que ainda não entraram na
  tela; `imediato` (o salto) reescreve todas.
- **O salto para o duto mostrava a borda da doca** — `aplicaCorredorEMoldura` repunha a borda do último
  `cenario` (`f4FaixaC`, que não existe). Agora varre a última borda cuja arte EXISTE.
- **Esconder atrás da borda não esconde:** a borda B tem frestas semitransparentes. A mesa que entra na
  parede apaga o alpha junto com o deslize.
- **Mesa em movimento é inerte** (`TerrainSystem.solido`, nos três `overlap` de prop): não mata, não
  para tiro, não cobre bala até chegar.
- **O assert da arena do golfinho mudou de lei, não afrouxou:** era "não nasce mesa", agora é "só nasce
  a mesa do mar, e nenhuma mina".

**Sondas em 14/09, uma por vez:** `probe-f4-moldura` 56 ✔ · `probe-f4-atalho-g` 6 ✔ · `probe-stage4` 24 ✔
(`vaos:[126,126,126]`) · `probe-f4-visual` 20 ✔ · `probe-f4-golfinho` 47 ✔ · `probe-f4-agua` 28 ✔.

⚠️ **Dois asserts da `probe-f4-moldura` mudaram de lei na 2ª rodada, não afrouxaram:** a saia "acesa nas 8 dentro do duto" virou "acesa exatamente onde a peça não alcança a borda, nos dois lados"; o tint letal é cobrado na placa mais à DIREITA (a rampa acende de lá). ⚠️ **E o "degrau nunca salta mais que 14px" é INTERMITENTE, e o defeito é da sonda:** ela amostra a curva a cada 200ms e, com o swiftshader lento, duas placas passam entre leituras (medido 24 = dois degraus). Passou em 2 de 3 rodadas seguidas.

### 🔁 A 3ª RODADA (14/09) — o 2º teste jogado dele

*"gostei dos novos assets de maquinário, ficaram melhores na vertical"* · *"o pilar na junta ficou bom na entrada da câmara D"* · *"os pilares novos [mesa do mar] ficaram bons"*. Três consertos:

| o que ele viu | o que era, MEDIDO | o que mudou |
|---|---|---|
| *"só aparece um deles"* (o coração) | **ele estava certo no que importa, errado no número:** em 100s de fase, amostrando a cada 0,5s, o maquinário esteve na tela em 100% das amostras e o coração em 86%. Mas o maquinário entrava como uma peça de 93px em y=−18, meio escondida atrás da borda do teto — não lia como a peça nova | o maquinário virou COLUNA como o coração (folha de 96×128, origem no teto em y=10, escala 1,45–1,6) e o `gap` subiu para 520–860, para as duas colunas se revezarem em vez de virarem grade |
| *"um pouco antes [da câmara D] a linha do duto não existe e o sprite da borda é diferente de todo o duto"* | o duto acabava em t=106 e a borda D só chegava em ~110: as placas de B entre as duas perdiam o fio e o tint | o **duto dura até t=109** (a linha `duto:false` desceu para uma linha ANTES do `cenario` do núcleo) e **fio e mordida viraram da PLACA**, como o tint: `letal > 0` desenha o fio E morde. A placa D nasce fria; a fronteira é o pilar. O pilar subiu para depth −0,54, na frente do fio |
| o anteparo do mar *"fica cortado e não aparece a parte mais chamativa"* | a mesa é enterrada pela borda do vão: na tela só aparecem os ~50px de CIMA da textura, e no anteparo isso era laje lisa | `_assar-mesa-mar.mjs` corta 30 linhas do topo dele (94×82): a janela visível passa a ser as anêmonas e a costela |

### 🔁 A 4ª RODADA (14/09) — o 3º teste jogado dele

*"os maquinários casaram bem com a fase e estarem em diferentes layers deu uma profundidade maior"* · a borda C→D *"resolvida"* · o espaçamento das colunas fica para o balanceamento geral.

| o que ele viu | o que era | o que mudou / o que falta |
|---|---|---|
| *"a transição de fundos, de novo, está muito seca"* (duto → núcleo) | o `setPintura` mergulhava no escuro em 600ms, a última coisa da câmara que ainda trocava "no quadro" | **a pintura entra PELA EMENDA** (`entrada: 'emenda'` no `cenario` de t=109 → `Parallax.setPinturaPelaEmenda`): uma cortina com borda macia de 112px segue a `Moldura.xDaEmenda()`, então à esquerda do pilar ainda é o duto e à direita já é o núcleo. Completa em t≈114,5. As peças de cenário se dissolvem em 1,4s |
| *"a imagem de fundo do núcleo está ampliada ou aumentada"* | **MEDIDO: não está.** A captura em t=118 reduzida a 384×216 bate com o `paint-bg-f4-d.png` na mesma escala; o arquivo é 384×216 em escala 1, do mesmo original de 1672×941 das outras três, e é o que tem MAIS detalhe (gradiente médio 5,47 contra 3,73–4,70). O que lê como ampliado é o ENQUADRAMENTO da arte: a massa do núcleo ocupa um terço do quadro e as bordas cortam o chão e o teto dela | ⚠️ **ABERTO, e é decisão dele** (fundo pintado é peça dele): (a) *desampliar* o original — estender o quadro por outpaint e reduzir para 384×216, que a lei permite; ou (b) ele gerar de novo com enquadramento mais aberto. Nada foi mexido |

⚠️ **Mais dois asserts reescritos:** a `probe-f4-visual` cobra o núcleo em t=116 (não 110), porque a pintura agora se completa quando a emenda atravessa; a saia da `probe-f4-moldura` deixou de exigir "pelo menos uma acesa" — numa rodada o sorteio do corredor não precisou de nenhuma, e nenhuma estava errada.

⚠️ **Bug pego na 2ª rodada:** o `emit` do `Parallax` sorteava o quadro inicial em `0..8` cravado; com a folha de 6 quadros do maquinário, a cena caía às vezes com *"reading 'duration'"*. Agora sorteia até o último quadro real.

**PixelLab em 14/09:** 4.533 no arranque, **4.437** no fim — **96** gerações: mesas do mar 40, a tentativa radial das peças 40, as colunas (Pro Flash) 12, as duas animações 4.

---

## 🆕 O QUE A SESSÃO DE 13/09 FEZ

### 1 · O M2 — AS BORDAS ENTRARAM

**A escolha dele, na 1ª rodada:** câmara A as duas candidatas escurecidas (A-0 e A-2), câmara B a
B-1, tratamento padrão nas três. A câmara D entrou junto, já estava aprovada.

**E ele jogou e revisou:** *"preciso que mantenha só um tipo de pintura, quero a pintura que tem o
músculo apenas e não o músculo com ossos… unifique as câmaras com sua única arte, não tenha duas."*

⚠️ **A DECISÃO DAS DUAS IRMÃS MORREU NO TESTE JOGADO, E O MOTIVO VALE PARA O M3–M5.** Duas variantes
por câmara eram a resposta à repetição (384 ÷ 128 = 3 cópias idênticas na tela). Elas mataram a
repetição e criaram coisa pior: **não liam como variedade da mesma parede, liam como duas paredes
emendadas.** A repetição é um defeito que o olho perdoa; a emenda não. A convenção do `pickVariant`
continua de pé — desfazer isto é copiar um PNG e escrever uma linha no `ART`.

| câmara | arte instalada | estado |
|---|---|---|
| **A · a doca engolida** | `f4FaixaA` ← `_faixa2/A-0-v.png` | 🟠 instalada, por julgar |
| **B · a garganta** | `f4FaixaB` ← `_faixa2/B-1-v.png` | 🟠 instalada, e ver a frase sem resposta acima |
| **C · o duto** | — herda a borda de B | 🟠 arte aprovada, instalação é M4 |
| **D · o núcleo** | `f4FaixaD` ← `_faixa-D-v.png` | 🟠 instalada, por julgar |

### 2 · A `Moldura` APRENDEU A TROCAR DE FAIXA

Ela criava os 8 segmentos com a chave cravada no construtor e não existia caminho para o evento
`cenario` mexer neles. Agora:

- **`Moldura.setFaixa(base)`** troca a textura dos oito e a saia junto. Recebe a BASE, nunca a
  chave final: cada segmento resorteia pelo `pickVariant`.
- **A borda viaja no evento `cenario`**, junto com a pintura (`faixa?: string` no `StageEvent`), e
  não num evento próprio. Borda e fundo são o mesmo lugar visto de dois ângulos; separá-los cria a
  chance de discordarem — a garganta emoldurada pela doca.
- **A câmara A não tem evento**, porque é onde a fase começa: `Moldura.FAIXA_INICIAL` já nasce com
  ela. Quem escrever um `cenario` novo antes de t=38,8 tem de lembrar da borda junto.
- **A guarda da chave inexistente** é o caminho da câmara C: o roteiro pede `f4FaixaC`, não acha, e
  a borda anterior FICA. Sem ela os 8 segmentos cairiam na textura de erro (32×32).

⚠️ **E ISSO ABRIU UM BURACO QUE JÁ EXISTIA.** O `aplicaCorredorEMoldura` repõe à mão o estado que o
`skipTo` descarta, e a **PINTURA nunca esteve na lista**: apertar `G` levava a câmara A — a doca —
para dentro da arena do chefão, que o roteiro pinta de câmara D em t=109. Mesma família do defeito
que o `G` pagou em 12/09, um andar acima. As duas voltam na mesma linha agora, porque repor só a
borda seria pior que não repor nenhuma.

### 3 · O CORAÇÃO E O MAQUINÁRIO RESPIRAM

Pedido dele: *"o coração gigante que faz parte do cenário precisa ganhar uma animação para ficar
mais interessante"*. Os dois links que ele mandou **são** os sprites do jogo: `orgao.png` é o
objeto `e754b9b9`, `maquinario.png` é o `89edcdd0`.

| peça | ritmo | por quê |
|---|---|---|
| **o coração** (chão, `f4-orgao-bate`) | 7 quadros/s + yoyo, ~2,3s | o mesmo `frameRate` do `nucleo-beat` do chefão: cenário e núcleo são o mesmo bicho |
| **o maquinário** (teto, `f4-maquinario-brasa`) | 5 quadros/s + yoyo, ~3,2s | o chão é carne e o teto é máquina. No mesmo compasso o teto viraria víscera junto |

⚠️ **O QUADRO INICIAL É SORTEADO POR SPRITE.** Três corações em uníssono leem como uma máquina, não
como órgãos — a mesma lei do `pickVariant`.

⚠️ **A LEI NOVA, E ELA CUSTOU TRÊS RODADAS DE GERAÇÃO: O GERADOR NÃO OBEDECE LIMITE DE COR.** Duas
rodadas pediram *"nunca branco, nunca pálido"* com todas as letras e as duas voltaram com o núcleo
estourado — o modelo tem um viés forte de **pulsar = clarear**. O que virou foi **mudar o pedido**,
não repetir: a 3ª rodada do coração pede uma animação que só ESCURECE (*"nothing ever gets brighter
than frame one"*) e aí não há o que estourar. Saiu de primeira, com o p99 constante nos 9 quadros.

⚠️ **E O QUE SOBRA SE IMPÕE NO DISCO** (`scripts/_f4/_assar-anim.mjs`), onde é determinístico. A
âncora não é um número escolhido: é o SPRITE ESTÁTICO já aprovado jogando, e o quadro 0 das duas
animações saiu idêntico a ele (média 42,5 nos dois). Três knobs, e os três nasceram de um defeito
medido — o **joelho** (o teto do p99, com fator, porque no coração os pixels mais claros são o
LATÃO da gaiola e não a carne), o **retint** (mede por MATIZ `b/r`, não por saturação: o estouro do
gerador não vira cinza, vira creme, e creme tem saturação suficiente para escapar de um filtro de
saturação) e a **força** (mistura cada quadro de volta no quadro 0; no coração 0,55).

### 4 · O TESTE JOGADO DELE, E OS QUATRO CONSERTOS

**⚠️ O DEFEITO 1 ERA DE CÓDIGO, NÃO DE ARTE, e ele diagnosticou pela tela:** *"os corações estão na
primeira camada do parallax, aumente eles como fez com as imagens estáticas e coloque-os na mesma
camada de antes."*

O `Parallax.emit` escrevia `anima ? add.sprite(...) : add.image(...).setOrigin()…` e **a cadeia
inteira de setters grudava no ramo FALSO**: a peça animada nascia sem depth (0 — na frente do
jogo), sem escala (1 em vez de 1,62–1,85), sem tint e sem origem. Precedência de operador.
Medido depois do conserto: coração em depth −88, escala 1,77, tint `0x5a4048`, 216px de largura.

⚠️ **É A LEI DA CAPTURA OUTRA VEZ, e desta vez contra MIM:** eu tinha *verificado* que as animações
tocavam (as duas em quadros diferentes, sorteio funcionando) e não olhei ONDE elas estavam. A
verificação certa, feita agora, compara os valores contra os do estático.

**O DEFEITO 2 — a tira chapada no rodapé:** *"tem uma parte cinza que não tem nada"*, com o print
circulado. Era o ENCHIMENTO. No duto a parede COLA no corredor e passa dos 54px do `ESPESSURA_MAX`
(medido: 73px de espessura efetiva), a peça de 64px não alcança, e o resto era um retângulo de cor
lisa de 19px atravessando a tela. Havia até um `corDoFundo` MEDINDO a última linha da peça para
acertar essa cor — engenharia correta para o problema errado.

⚠️ **A LEI QUE SAI DAÍ: COR CERTA NÃO SALVA SUPERFÍCIE VAZIA.** Agora é a **saia**: a própria peça
continuada em ESPELHO a partir da linha onde ela acaba. Sem esticar, sem crop — 64px próprios, o
que sobra sai da tela.

**O DEFEITO 3 — a emenda com degrau:** *"existe um degrau onde as continuações dos assets se
encaixam, causando um gap reto na colagem"*. Ver a seção ⛏️ abaixo — são duas causas e só uma sai.

**O DEFEITO 4 — as duas irmãs da câmara A.** Ver a seção 1.

---

## ⛏️ O DEGRAU DO DUTO — o que saiu e o que NÃO sai

**FORA DO DUTO ERA RUÍDO GRATUITO, e saiu.** O relevo sorteava `Math.random() * 10` por placa, então
vizinhas caíam a até 10px uma da outra — e como cada segmento é um retângulo CHATO de 128px, essa
diferença vira um corte vertical na emenda. Agora é uma **onda contínua** da posição no mundo
(`Moldura.relevoEm`): mesma amplitude de 10px ao longo da fase, degrau entre vizinhas de ~2,7px por
construção. Medido na abertura: **`[1, 1, −1]`**, contra `[0, −7, 8]` antes.

**DENTRO DO DUTO O DEGRAU É LOAD-BEARING E NÃO SAI.** Ali a parede é colada no corredor
(`vaoY + meio + FOLGA`) e o corredor anda até `PASSO_MAX` = 14 por placa. Medido: `[11, 9, −4]`.

⚠️ **E SUAVIZAR O DESENHO SEM SUAVIZAR O QUE MORDE É PROIBIDO** — daria parede invisível ou morte
invisível, e a `probe-f4-moldura` cobra que os dois sejam a MESMA linha ("a superfície que MORDE é
a mesma que DESENHA"). Suavizar os dois junto significa tornar `superficieChaoEm` contínua dentro
da placa, o que reabre a trava dos 8px e a linha de base inteira. **Não faça isso sem ele pedir.**

**O que dava para consertar era a LEITURA, e foi o que se fez.** O fio horizontal de 128px
denunciava a emenda: duas linhas acesas em alturas diferentes, com um vazio entre elas, leem como
dois pedaços mal colados. Agora um pedaço **vertical** liga as duas pontas (`Moldura.ligaDegrau`) e
o mesmo degrau lê como saliência da parede. ⚠️ **E não é só enfeite:** o fio é o telégrafo da parede
que MATA, então o vazio era borda letal sem aviso, bem na emenda onde o jogador raspa.

⚠️ **SE ELE AINDA ACHAR O DUTO SERRILHADO**, as saídas em ordem de custo são: (1) baixar o
`PASSO_MAX` só no trecho do duto — mexe em dificuldade já validada no M1; (2) meia-placa no
DESENHO e na MORDIDA juntos — dobra os segmentos e reabre a trava; (3) aceitar. Nenhuma é barata.

---

## ⛏️ O QUE FALTA CONSTRUIR — a câmara C

⚠️ **A ARTE DA CÂMARA C ESTÁ APROVADA E PARADA.** `scripts/_f4/_faixa-C-v.png`, veredicto dele em
12/09: *"as do duto e do núcleo ficaram ótimas."* Ela é **128×80** — a "faixa grossa" do duto — e
três coisas presumem 64:

- `Moldura.ESPESSURA_MAX` = 54, calibrado para a peça de 64px sempre alcançar a borda;
- a **saia**, que é ancorada em `superficie ± 64`;
- o assert de dimensão da sonda (`128x64`).

Instalar C é construir isso, e é o M4. **A decisão dele:** esperar o M4, ou cortar C para 64 agora
e entregar hoje (jogando fora a faixa grossa)?

---

## 🌊 A ÁGUA DA ARENA E AS PEÇAS NOVAS (12/09, rodadas 2 e 3) — JOGADO E APROVADO

**✅ TUDO NESTA SEÇÃO FOI JOGADO E APROVADO.** Ele pediu para ser feito sozinho (*"não estarei aqui
para escolher respostas ou fazer o brainstorming com você"*), jogou em três rodadas e fechou:

| rodada | veredicto dele |
|---|---|
| **água + 5 peças** | *"a água e o efeito da água ficaram ótimos"* — com dois ajustes pedidos, os das rodadas abaixo |
| **enchimento adiantado + canos** | *"perfeito para a água, o cano e a batalha com o golfinho ficou muito mais divertida!"* |
| **a ponte** | *"ficou bom, podemos encerrar esses ajustes"* |

⚠️ **A ÁGUA MELHOROU O JOGO, NÃO SÓ A TELA** — e isso não estava no pedido. O que ele escreveu foi
um efeito visual para esconder a troca de pintura; o que ele relatou depois de jogar foi que **o
duelo ficou mais divertido**. A arena passou a ser um LUGAR (uma câmara alagada) em vez de um
trecho de corredor onde um bicho aparece, e a leitura do lugar mudou como o combate se sente. Vale
lembrar disso no M2–M5: cenário não é só o que se vê.

### 1 · A CÂMARA B ALAGA

Pedido: *"na arena do golfinho, quero que coloque um filtro que pareça estarmos dentro da água...
ao entrar na zona do golfinho, para casar com a transição da imagem de fundo, tenha um pequeno
efeito para encher de água a tela e assim escondemos a transição das imagens de fundo"*.

Tudo em `src/systems/Agua.ts`. Um ciclo de seis estados, e ele é decoração PURA — nenhum corpo
físico, nenhuma colisão, nenhum efeito no voo:

| estado | o que acontece | knob |
|---|---|---|
| **enchendo** | a água sobe do rodapé com a superfície acesa de 2px correndo à frente; os CANOS despejam | `ENCHE_DUR` 2,6 · `ALPHA_SUBINDO` 0,34 · `CANOS` 3 · `GOTAS` 30 |
| **assentando** | o véu cede o repuxo e os canos fecham | `ASSENTA_DUR` 0,9 |
| **submerso** | véu leve com respiração, 3 feixes de luz aditivos derivando, 22 bolhas subindo com oscilação | `ALPHA_SUBMERSO` 0,24 · `BOLHAS` 22 · `FEIXES` 3 |
| **esvaziando** | morto o golfinho, drena | `ESVAZIA_DUR` 0,8 |

**Quem manda:** `spawnGolfinho` chama `encher()`; `encerrarGolfinho` chama `esvaziar()` — ou
`limpar()` (sem animação) quando é o `G` pulando para o chefão, pela mesma lógica do `reacende`.

### ⚠️ E ELA FOI REFEITA NO MESMO DIA, DEPOIS DO TESTE JOGADO

Veredicto dele sobre a 1ª versão: *"a água e o efeito da água ficaram ótimos. Mas achei o encher da
tela muito repentino e forçado... do jeito que está agora o efeito de encher a tela de água
casa/atrapalha com a chegada (aviso) do golfinho."* **Dois eventos grandes disputando os mesmos
dois segundos, e um comia o outro.**

A receita foi dele, e eu fiz as duas que ele ofereceu ao mesmo tempo:

| o que ele disse | o que virou |
|---|---|
| *"enchendo até ficar completamente cheio na hora do golfinho, mesmo que comece a encher antes do encontro"* | o enchimento saiu do nascimento do golfinho e virou **evento de roteiro em t=36** — quatro segundos antes do bicho. `ENCHE_DUR` foi de 0,62 para **2,6**, e o easing de `Sine.Out` para `Sine.InOut` (com 2,6s a saída rápida lia como barra de carregamento) |
| *"tela preta por milissegundos e já aparecer cheia de água, transição feita do fundo"* | o **`surto` morreu** — o pico opaco de alpha 0,96 existia só para tapar a troca de pintura. Com a água cheia antes, quem esconde o corte volta a ser o mergulho no escuro que o `setPintura` sempre soube fazer, com os 600ms de sempre |

**A ordem agora é dramaturgia, não simultaneidade:** t=36 alaga → t=38,6 a água topa → t=38,8 a
câmara troca atrás do escurecimento → t=39,5 assenta → **t=40 o bicho chega numa câmara parada**.

⚠️ **É ISSO QUE A `probe-f4-agua` COBRA, e nenhum outro lugar cobra:** que a pintura troque com a
água JÁ CHEIA, que o golfinho nasça com ela CHEIA E ASSENTADA, e que o pico do véu nunca passe de
0,5 (se passar, o `surto` voltou por engano). Mexer no `agua` de t=36, no `cenario` de t=38,8 ou
no `ENCHE_DUR` sem mexer nos outros quebra a ordem e fica vermelho ali.

### 🚰 OS CANOS — a água ganhou FONTE

Pedido dele, ainda na mesma rodada: *"se quiser implementar canos soltando a água, como um asset
visual diferente. Assim fica mais plausível"* — e *"temos de sobra créditos no PixelLab para isso"*.

Nível que sobe sozinho é exatamente o que um cenário não pode fazer. O Leviatã engoliu uma doca, e
doca tem encanamento. **3 canos** despejam enquanto a água sobe, com jato, 30 gotas em queda com
gravidade e um respingo no ponto em que o jato fura a superfície. Cheia a câmara, eles fecham.

| detalhe | porquê |
|---|---|
| **objeto `bc28cdf2`, 16 candidaturas, 20 gerações** | 3 escolhidas (c-00, c-08, c-13), variantes do `pickVariant` |
| ⚠️ **nasceram DEITADOS e entram DE PÉ** | o prompt pediu vista lateral de cano de parede e o gerador deu a boca para a DIREITA — certo para parede vertical, errado para uma fase que só tem teto e chão. Giro de 90°, que **em pixel art é exato** (não reamostra, só troca os eixos): flange em cima, boca embaixo |
| ⚠️ **escurecidos no `_assar-cano.mjs`, ao contrário das peças de parallax** | cano não é camada de parallax — quem o desenha é a `Agua`, que não tem `tint` de camada. Alvo: 2,2× a pintura, a mesma banda da passarela |
| ⚠️ **depth −0,5, e não 69 como o véu** | o cano é MUNDO, logo à frente da faixa da moldura (−0,6). É isso que faz a água **passar na frente dele** conforme sobe, em vez de ele boiar por cima da própria enchente |
| **rolam com o mundo** (`worldSpeed` entra no `update`) | cano parado enquanto o corredor anda lê como marca d'água da interface |

### 2 · AS PEÇAS QUE SAÍRAM DAS 64 CANDIDATURAS DELE

Pedido: *"veja quais assets daqueles 64 que criei podem funcionar na fase, melhorando o visual e
imersão"*.

⚠️ **ELAS FORAM REPROVADAS COMO FAIXA E APROVADAS COMO PROP — a pergunta mudou, e por isso a régua
mudou.** Faixa precisa sangrar nas três bordas com topo reto; medido de novo, nenhuma das 64 tem (o
sangramento lateral varia de 0% a 100% da altura, sem regra). Mas `create_1_direction_object` faz
bem exatamente o que a faixa não queria: RECORTAR um objeto do fundo. **Como prop, o recorte é a
virtude.**

| peça | de onde | o que é | camada |
|---|---|---|---|
| **`f4Ponte`** ×3 | A-01, A-05, A-13 + vão procedural | dois pilares de convés industrial com guarda-corpo e **lâmpada âmbar**, tomados pelas veias, e um VÃO suspenso entre eles | chão, depth −78, tint `0x6d788f`, escala **1.45–1.7**, gap 520–900 |
| **`f4Ganglio`** ×2 | B-05, B-12 | núcleos nervosos **ACESOS**, esfumados em elipse irregular | teto, depth −87, tint `0x9aa2b8`, escala 0.55–0.85, gap 420–760 |
| **`f4Cano`** ×3 | objeto `bc28cdf2` (novo, 20 gerações) | o cano de despejo que ENCHE a câmara | desenhado pela `Agua`, não pelo Parallax — ver "🚰 OS CANOS" |

### 🌉 A PONTE — a 3ª rodada de 12/09 (✅ JOGADA E APROVADA em 13/09)

A passarela entrou como UM pilar, ele jogou, e o diagnóstico foi dele: *"sobre o asset da ponte, eu
achei, é que ele está pequeno e as mesas e bordas tampam ele. O que pensei: hoje nós temos o que
seria o INÍCIO de uma ponte ou passarela, podemos criar uma continuação desse jeito: Ponte atual
___(continuação)___ Ponte atual invertida... podemos criar de forma procedural mesmo para prolongar
a ponte e termos algo mais rico no mid parallax."*

⚠️ **ELE ESTAVA CERTO SOBRE A CAUSA, E A CAUSA NÃO ERA ESCALA.** A peça de 71px não era pequena por
acidente — ela é a PONTA de uma ponte, e ponta sozinha não lê como ponte por maior que fique. Duas
coisas mudaram:

1. **A peça triplicou de largura**: 71 → **178–198px** (`_assar-ponte.mjs`), montada como
   PILAR + VÃO + PILAR ESPELHADO. Espelhar e não repetir — dois pilares apontando para o
   mesmo lado leem como a peça colada duas vezes.
2. **A escala subiu de 0.8–1.05 para 1.45–1.7, e o número é uma CONTA:** o convés mora nas linhas
   15–31 de uma peça de ~60, ou seja de 28 a 44px acima da base. Com a base em 222, o topo do
   convés cai em `222 − 44·escala`; a mesa mais alta da abertura tem 46px e o topo dela fica em
   ~160. **Abaixo de escala 1,41 a mesa tapa a ponte** — que é exatamente o que ele viu. Em 1,45 o
   guarda-corpo sai em y≈136, bem acima do terreno.

⚠️ **O VÃO É DESENHADO COLUNA A COLUNA, NÃO É UMA FATIA REPETIDA.** Repetir 18px de arte pintada
denuncia a costura a cada 18px — a mesma doença de "papel de parede" da spec de 08/09. O vão nasce
de duas colunas do próprio original: uma de VÃO esticada para preencher, e uma de MONTANTE
carimbada a cada 18px. Sem emenda por construção, com a paleta e o sombreado verticais de graça.

⚠️ **E A COLUNA DO VÃO É ESCOLHIDA, NÃO CRAVADA.** A 1ª versão fixou x=13 à mão e essa coluna
atravessa a LÂMPADA ÂMBAR: o vão saiu com a lâmpada esticada de ponta a ponta, quebrada em três
pedaços pelos montantes. Três lâmpadas em fila leem como padrão, e a lâmpada é o que deve marcar o
PILAR. Agora o forno procura uma coluna com o convés cheio, o guarda-corpo vazio e **nenhum pixel
quente**.

**Onde as peças aparecem, medido** (`_ver-pecas.mjs`, amostrando t=0 a t=36 — a câmara A inteira):

| peça | % do tempo na tela | quantas por vez |
|---|---|---|
| `f4Ponte` | **84%** | 0–1 |
| `f4Ganglio` | **88%** | 0–1 |

⚠️ **Elas estão na tela desde o primeiro segundo da fase**, não só perto do golfinho — o parallax
pré-enche as camadas na montagem. A passarela é praticamente contínua; o gânglio pisca com folga,
que é o que se quer de um ponto de luz raro.

**A passarela é o que faltava para a câmara A dizer o que ela é.** A fase abre na "doca engolida",
mas até aqui nada na tela dizia DOCA — costela, órgão e maquinário são todos do bicho, então o
lugar lia como víscera desde o primeiro segundo. Ela é a metade humana da frase.

⚠️ **E O VALOR NÃO FOI CORRIGIDO, DE PROPÓSITO.** Medido contra a pintura (16,4): a decoração que
já estava no jogo entra CRUA a 2,2×–4,6× e quem a empurra para o fundo é o TINT da camada (costela
4,59× com `0x4a3e48`). As escolhidas caem na mesma banda (A-01 a 2,20×, B-05 a 4,16×), então elas
obedecem ao sistema que já existe em vez de inventar um segundo.

**O que NÃO entrou, e por quê:** os objetos **C** (carne muscular vermelha) e **D** (fibras de
tendão, quase preto) são textura de QUADRO CHEIO sem silhueta nenhuma — 0,68 a 0,85 de
preenchimento, sem borda. Eles são exatamente o que são: material de FAIXA. ⚠️ **E faixa é peça
dele** (ver a divisão das 14 peças), então não toquei.

### ⚠️ AS LEIS DESTA RODADA

| lei | onde doeu |
|---|---|
| ⚠️ **DOIS EVENTOS GRANDES NÃO CABEM NOS MESMOS DOIS SEGUNDOS.** Cada um estava certo sozinho; juntos, um comia o outro | o enchimento e o aviso do golfinho. O conserto não foi enfraquecer nenhum dos dois — foi **afastá-los no tempo** |
| ⚠️ **EASING É FUNÇÃO DA DURAÇÃO, não do gosto.** `Sine.Out` estava certo em 0,62s e errado em 2,6s: a água disparava e depois rastejava, lendo como barra de carregamento | virou `Sine.InOut`, e é a entrada suave que tira o "repentino" que ele apontou |
| ⚠️ **RESOLVER O PROBLEMA CERTO APOSENTA CÓDIGO.** O `surto` era um pico opaco de 0,96 inventado para tapar a troca de pintura, com a janela medida a 0,45s | com o enchimento adiantado ele **perdeu a função e morreu inteiro**, e a troca voltou ao mergulho no escuro que o `setPintura` já fazia. A 1ª versão estava resolvendo um problema que a montagem não precisava ter |
| ⚠️ **EFEITO SEM FONTE NÃO CONVENCE, por melhor que esteja.** Ele aprovou a água e no mesmo fôlego pediu os canos | *"assim fica mais plausível"*. O que faltava não era qualidade do efeito, era CAUSA |
| ⚠️ **A ÁGUA ANDA COM `dt` CRU, NUNCA COM O RELÓGIO DA FASE.** A arena SEGURA o relógio em t=49,5 | amarrá-la ao `elapsed` congelaria a água no meio do surto — **com a tela opaca** — pelo duelo inteiro |
| ⚠️ **PEÇA DE CENÁRIO TEM DE DIZER O QUE A PINTURA NÃO DIZ.** O critério não é "combina com a câmara" — combinar demais é como se desenha papel de parede | a 1ª escolha para a câmara B foram os anéis de cartilagem (B-06, B-14). O mock contra a pintura matou: **a pintura da câmara B JÁ É uma caixa torácica.** A peça repetia o que já estava lá e só somava massa escura |
| ⚠️ **O TINT NÃO PODE APAGAR A LUZ DA PEÇA.** Tint de força de costela (0x4a3e48) mataria a lâmpada âmbar e a brasa do gânglio — que são o motivo de as duas existirem | as duas levam tint claro; quem as segura no fundo é o ALPHA e a raridade do `gap` |
| ⚠️ **A MESMA CANDIDATURA É REPROVADA OU APROVADA CONFORME A PERGUNTA.** "Não sangra nas bordas" reprova uma faixa e **descreve** um prop | as 64 estavam paradas em review desde 08/09 por uma régua que não era a delas |

### 📚 REGISTRO — O QUE SE PEDIA PARA OLHAR (tudo respondido em 12/09)

Os seis itens foram jogados. Os dois que ele reprovou viraram as rodadas 2 e 3; os outros quatro
**ficam como estão** e deixam de ser trabalho pendente.

| item | veredicto |
|---|---|
| ~~O surto tapa?~~ | **a pergunta morreu com o surto.** Ele foi reprovado inteiro — *"muito repentino e forçado"* — e o enchimento passou a ser adiantado |
| O submerso deixa jogar? | ✅ **sim.** `ALPHA_SUBMERSO` fica em 0,24 |
| As bolhas e os feixes | ✅ **ficam.** 22 e 3, e não foram questionados |
| A drenagem em 0,8s | ✅ **casa** com a volta da fase em t=50 |
| A lâmpada âmbar lê como pickup? | ✅ **não.** Ela continua sendo a única luz da peça, e é o motivo de o tint ser claro |
| ~~O corte lateral do corrimão~~ | **reprovado por outro motivo:** *"está pequeno e as mesas e bordas tampam ele"*. O corte deixou de existir quando a passarela virou PONTE — ele agora é o encontro de dois pilares com o vão, não um PNG cortado |

### AS FERRAMENTAS NOVAS

| script | o que responde |
|---|---|
| `_ver-agua.mjs` | o ciclo da água quadro a quadro, do enchimento à drenagem |
| `_baixar-cand.mjs` | baixa as 16 candidaturas de cada um dos 4 objetos dele |
| `_medir-cand.mjs` | **de uma candidatura:** tem silhueta? sangra? quão clara contra a pintura? |
| `_folha-cand.mjs` | as 64 em 4×, **sobre a pintura da câmara** — candidatura bonita em fundo claro é armadilha |
| `_assar-cand.mjs` | apara e esfuma as escolhidas em peças de jogo |
| `_mock-pecas.mjs` | a peça no enquadramento real **com o tint da camada aplicado** — foi ele que matou o anel |

---

## 🆕 O QUE A SESSÃO DE 12/09 FEZ

**Tudo nesta seção foi JOGADO e APROVADO por ele:** *"Joguei e ficou bom assim."*

1. **O GOLFINHO FECHOU.** O último ajuste (o aviso passando por B e saindo da tela) foi jogado:
   *"em relação ao golfinho, ficou muito bom. ele sai da tela como pedi, as skills dele estão
   ótimas."* ⚠️ **Ele não tem mais nada pendente** — os quatro itens de "o que ver no próximo teste"
   da sessão anterior estão respondidos ou vencidos. As bolhas provisórias **ficam como estão**.
2. **O MOTIVO DA CÂMARA A — RESPONDIDO, e a resposta é "não tem".** Palavras dele: *"A entrada é o
   início da fase como todas as outras, nada de especial, apenas atirar, desviar e não morrer. A
   interação do golfinho já traz essa novidade."* ⚠️ **Isto ENCERRA a §10 da spec do golfinho**, que
   deixava a pergunta em aberto de propósito. A câmara A não ganha habitante nem evento próprio.
3. **Três ajustes de LEITURA, todos pedidos com um print na mão.** Eles não mudam design nenhum —
   mudam o que dá para enxergar enquanto se joga.

### O que mudou no código

| pedido dele | o que foi feito | onde |
|---|---|---|
| *"diminua o tamanho das mesas no início da fase 4 — diminuir elas quer dizer aumentar o espaço de navegação da nave; deixe para as mesas crescerem a partir do golfinho"* | os três vãos antes do golfinho subiram **+16** (110→**126**, 96→**112**, 104→**120**), com o ritmo interno intacto. A maior mesa isolada da abertura cai de **62px para 46px**. De t=50 em diante, nada mudou | `STAGE_4` |
| *"alguns destroços estão atrapalhando muito a visão da fase"* + *"os destroços podem ser movidos para perto da borda, mas não no meio da fase"* | o destroço de primeiro plano saiu de `faixa: [30, 186]` para `faixas: [[6,28],[188,210]]` — duas bandas de borda, uma sorteada por sprite | `Parallax.buildInterior` |
| *"o coração com os cabos flutuando no ar, fica feio e dá aspecto de não polido"* + *"tentar deixar suas extremidades encostadas na parede de cima ou de baixo, para tapar aqueles cabos suspensos"* | o `orgao` passou de `baseY 236 / escala 0.9–1.3` para `baseY GROUND_Y / escala 1.62–1.85`: topo enterrado 11px na faixa do teto, base 16px atrás da do chão | `Parallax.buildInterior` |

**O campo novo no `ScatterLayer`: `faixas`** (plural). É uma LISTA de bandas, e o sprite sorteia
uma. ⚠️ A `faixa` velha não servia porque ela é um intervalo **contínuo** — e "perto de cima OU
perto de baixo" é exatamente o que um intervalo contínuo não sabe dizer sem passar pelo meio.

### Os números que são invariante, não gosto

- **O destroço de primeiro plano nunca toca o TERÇO CENTRAL (72–144).** Com meia-altura máxima de
  44px (46 × 1,9 ÷ 2), um centro em 28 põe a base em 72 e um centro em 188 põe o topo em 144.
- **O topo do coração fica sempre ENTERRADO** na faixa do teto (superfície em `TETO_Y + 16` = 26 na
  abertura). Em 1,62: `206 − 118 × 1,62 = 14,8`, 11px dentro. **Baixar de 1.62 devolve os cabos ao ar.**
- Os dois viraram assert na `probe-f4-visual`, amostrados em **24 quadros** — as duas camadas
  sorteiam altura A CADA sprite, então um quadro que passe não prova nada sobre o próximo.

### ⚠️ AS LEIS QUE ESTA SESSÃO PAGOU

| lei | onde doeu |
|---|---|
| ⚠️ **O VÃO É O ÚNICO KNOB DA MESA** — ela nasce da borda até a borda do vão, então +16 de vão é −16 de mesa somados chão e teto | não existe "tamanho da mesa" para mexer: quem pediu mesa menor pediu vão maior |
| ⚠️ **E O PREÇO DO VÃO MAIOR É A ONDULAÇÃO, e é aritmética:** o centro anda em `148 − gap` px | em 110 o corredor tinha 38px de sobe-e-desce; em 126 tem 22. Se a abertura ficar RETA demais, o knob é a `Moldura.MARGEM` (24) para baixo, **não** o vão de volta |
| ⚠️ **ANCORAR MAIS FUNDO ENGORDA A PEÇA.** A peça cresce para cima, então o topo é `base − altura × escala`: quanto mais fundo a base, MAIOR a escala para alcançar o teto — e escala é largura | a 1ª tentativa do coração manteve a base em 236, exigiu escala 1,85 e saiu com **263px de largura**, dois terços da tela. Subir a base para `GROUND_Y` deu a mesma cobertura em 1,62 e **196px** |
| ⚠️ **ENTERRA-SE A PONTA, NÃO SE APAGA O CABO.** A faixa da moldura é desenhada em depth −0,6 contra os −88 da decoração: tudo o que passa da superfície some atrás dela | os cabos fazem parte do `orgao.png` — não havia o que remover, só onde esconder |
| ⚠️ **ASSERT VERDE NÃO JULGA COMPOSIÇÃO — DE NOVO.** O coração de 263px passava em TODAS as sondas, invariantes novas incluídas | quem pegou foi a captura. É a quarta vez que esta lei cobra nesta fatia |
| **O que a conta NÃO resolve: os tubos LATERAIS do coração.** A arte é radial, e só sumiria de lado uma peça mais larga que a tela (escala ≥ 3,2 — uma parede, não uma peça) | cima e baixo é o que dava para enterrar, e é o que ele pediu |

### A ferramenta nova

`scripts/_f4/_ver-abertura.mjs` — captura t=7, t=20 e t=33 da abertura e imprime a caixa de cada
peça (topo, base, largura). ⚠️ **Foi ela que pegou o coração de 263px**, numa versão que passava em
todos os asserts. Uso: `npm run dev` noutro terminal, depois
`node scripts/_f4/_ver-abertura.mjs scripts/_f4/_abertura.png`.

---

## 📚 REGISTRO — O QUE A SESSÃO DE 11/09 FEZ, EM ORDEM

1. **O M1.5 foi APROVADO jogando:** *"o duto com as portas ficou muito legal"* e *"a sequência de
   moldura se fechando no duto e abrindo no boss ficou como pedi"*. A mordida, o HP das portas
   (6/8/10), os 38s de duto e o fio **ficam como estão**.
2. **A pergunta dele que abriu a frente nova:** *"quero que tenha um porquê de mudar o fundo"*.
   Medido: das três trocas de pintura, a de **t=40 não tinha motivo nenhum** (mesmos inimigos, mesmas
   minas, e um banner anunciando o duto 26s antes). E **nenhum inimigo da F4 morava no Leviatã**.
3. **A resposta foi o golfinho biomecânico** que ele já tinha criado no PixelLab
   (`f37ab55c-be70-49da-8ed5-3bd5e168da31`) — um mini-chefão com arena própria. Brainstorm em quatro
   partes, todas aprovadas por ele.
   **Spec:** `docs/superpowers/specs/2026-09-11-fatia7-golfinho-miniboss-design.md` (§9 e §9.1 são
   os dois ajustes jogados). **Plano:** `docs/superpowers/plans/2026-09-11-fatia7-golfinho.md`.
4. **A arte saiu da PixMiniMax** (10 gerações): nado `39d99a12`, flip + tiro `279cc362` (*"ficou
   perfeito"*), cambalhota v1 `3d081f67`. A v2 da cambalhota (`ff2a4a3b`, com um LASER) ficou de
   reserva, fora do jogo. A bala desenhada nas animações foi APAGADA por
   `scripts/_f4/_golfinho-sheets.mjs`; a bala do jogo é o tiro do flip, reduzido a 13×9.
5. **1º teste jogado:** *"O duelo ficou legal, é algo diferente na fase."* Mas o X *"parece estar
   flutuando ou à deriva"*, não saía da tela, e *"as rajadas são lentas e fáceis de desviar"*.
   Ajustado (spec §9).
6. **2º teste jogado:** *"o nado ficou bom"*. Último pedido antes do push: o aviso passa por B e sai
   da tela (spec §9.1). **Esse ajuste não foi jogado.**

---

## 🐬 O GOLFINHO COMO ESTÁ NO JOGO

Tudo em `src/entities/Golfinho.ts`. Evento no roteiro: `{ t: 40, type: 'miniboss', kind: 'golfinho', seguraEm: 49.5 }`.

| momento | o que acontece | knobs |
|---|---|---|
| **aviso** | nada de A até B em paredes OPOSTAS (sorteio por partida), passa por B e sai pela borda. Intocável, sem colisão | `AVISO_DUR` 2,4 · `ESPERA_DUR` 0,8 (fora da tela) |
| **X, 1ª passagem** | entra pela direita na altura de B, nada em ONDA com o corpo inclinado, cambalhota + leque de 3 sem parar, sai pela esquerda. Barra aparece; vida não desce de 25 | `VEL_X` 190 · `ONDA_AMPLITUDE` 9 · `ONDA_HZ` 1,3 · `GIRO_FREIO` 0,35 · `X_CAMBALHOTA` 310 |
| **X, a volta** | some por um tempo sorteado; **bolhas sobem da parede de A**; ele irrompe num x sorteado, cruza o corredor com cambalhota + leque e mergulha na parede oposta | `INTERVALO_MIN/MAX` 0,8–1,4 · `EMERGIR_DUR` 0,5 · `EMERGE_X_MIN/MAX` 280–340 |
| **duelo** | pela direita, de frente, até morrer: flip a flip, **rajada lenta → leque rápido → rajada rápida → leque lento** | `DUELO_SEQUENCIA` (115/200/210/105) · `HP` 50 · `PISO` 25 |
| **a arena** | o relógio da fase não passa de t=49,5 enquanto ele vive; nada nasce; o primeiro plano sai de cena e volta quando ele morre | `seguraEm` no `STAGE_4` |
| **a morte** | explosão grande, +500, sem hitstop; a fase segue com "A GARGANTA APERTA" em t=50 | `Golfinho.SCORE` |

Para jogar: `npm run dev` → `http://localhost:5173/` → tecla **`L`** → ~40s de fase.

---

## 📚 REGISTRO — O QUE SE PEDIA PARA OLHAR NO GOLFINHO (tudo respondido em 12/09)

Ele jogou e fechou: *"ficou muito bom. ele sai da tela como pedi, as skills dele estão ótimas."*

1. ~~O aviso saindo da tela~~ — **aprovado.** `AVISO_DUR` 2,4 e `ESPERA_DUR` 0,8 ficam.
2. ~~As bolhas provisórias~~ — **ficam como estão.** Não incomodaram; a sheet de bolha própria
   deixa de ser trabalho pendente.
3. ~~A volta quase vertical~~ — **aprovada.** `EMERGE_DESLOCA_X` fica em 120.
4. ~~Golfinho escuro sobre decoração escura~~ — **não foi levantado.** ⚠️ E a decoração mudou desde
   então (o destroço foi para as bordas), o que só ajuda esta leitura.
5. **O tempo da fase**: o roteiro tem 113s; o real cresce o que o duelo durar. Segue valendo.

---

## ⚠️ AS LEIS QUE A SESSÃO DE 11/09 PAGOU

| lei | onde doeu |
|---|---|
| ⚠️ **ABRA A IMAGEM, de novo.** Dois defeitos do golfinho só apareceram em captura, com a sonda verde | a viga do primeiro plano passando na frente do leque e da rajada; e a 1ª versão das bolhas, que não aparecia |
| ⚠️ **Pausa de arena é "não passa de", nunca "para quando o estado X começa"** | o X não tem duração exata; esperar o duelo deixaria o corredor de t=50 nascer dentro da arena |
| ⚠️ **Toda sonda que atravessa t=40–50 tem de matar o golfinho** (`s.matarGolfinho()`) | a `probe-f4-visual` e a `probe-f4-moldura` ficariam presas em 49,5 |
| ⚠️ **Um `rate: 0` congela o cronômetro do corredor no meio da contagem** | ao voltar em t=50, o primeiro par chega em t≈51,x; a sonda da mesa achou um par só em t=54 |
| ⚠️ **Animação interrompida não dispara `animationcomplete`** — estado que depende dele tem de ser zerado à mão | o `girando` preso deixaria o duelo sem nenhum flip |
| ⚠️ **Hitbox de sprite com quadro folgado é fixada à mão, com assert de dimensão** | o golfinho ocupa 42×30 de um quadro 80×80; a regra padrão mataria 38px de vazio |
| **PixMiniMax: 2 gerações por clipe em 80×80; o loop não fecha sozinho; "muzzle flash" vira bala** | ver a memória `pixminimax-animacao` |

---

## ⏭️ A PRÓXIMA AÇÃO — ver a seção 🎯 no topo

⚠️ **ESTA SEÇÃO FICOU PARA TRÁS EM 12/09 e vale como registro do porquê, não como plano.** O M2
andou duas vezes desde então: a MESA em 12/09 e as BORDAS em 13/09, as duas instaladas. O que fazer
a seguir está na seção **🎯 O QUE ESPERA O OLHO DELE**, no topo do arquivo.

## 📚 REGISTRO — COMO O M2 FOI ABERTO: A CÂMARA A

✅ **A PRIMEIRA PERGUNTA JÁ ESTÁ RESPONDIDA, e a resposta poupa trabalho.** Em 12/09, sobre o motivo
da câmara A: *"A entrada é o início da fase como todas as outras, nada de especial, apenas atirar,
desviar e não morrer. A interação do golfinho já traz essa novidade."*

⚠️ **NÃO PROPONHA HABITANTE, EVENTO NEM MECÂNICA PARA A CÂMARA A.** A pergunta do "porquê de mudar o
fundo" valia para a troca do MEIO da fase (t=40), que não tinha motivo nenhum — não para a abertura,
que é onde o jogador aprende a regra. Uma fase precisa de um lugar comum antes de ter um incomum.
Isto ENCERRA a §10 da spec do golfinho. **O M2 é passe de ARTE, e só.**

Restam as TRÊS decisões que já estavam abertas (seção "📌 EM ABERTO PARA O M2" abaixo), e é por elas
que a sessão começa: a **repetição da faixa**, **quem pinta as 4 faixas** (dele, ainda sem aprovação),
e **como a arte troca por câmara** (`setTexture` no spawn ou `PropKind` separados).

⚠️ **E a geometria da câmara A mudou em 12/09** — os vãos da abertura são 126/112/120, não
110/96/104. Quem for medir a peça de arte contra o corredor mede contra os números NOVOS.

**PixelLab:** **4.668** de 5.000 gerações, ciclo virando em 2026-10-04. ⚠️ Confira o saldo no arranque.

---

## 📚 REGISTRO DO M1.5 — O QUE SE PEDIA PARA OLHAR (jogado e aprovado em 11/09)

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

## 📚 REGISTRO DO M1.5 — AS PERGUNTAS DO TESTE (respondidas em 11/09: tudo fica como está)

**O M1.5 FOI JOGADO E APROVADO.** Na época as três sondas estavam verdes e a linha de base sobreviveu, mas quatro perguntas
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

## ✅ AS DUAS DECISÕES DESTA SEÇÃO ESTÃO FECHADAS — fica como registro

⚠️ **AS DUAS MORRERAM, E A PRIMEIRA MORREU JOGANDO.** *Quem pinta as faixas* fechou em 12/09 (são
as candidaturas dele, e filtrar é meu). *A repetição da faixa* fechou em 13/09, e não do jeito que
esta seção previa: as duas variantes por câmara foram instaladas, ele jogou e **reprovou** —
*"unifique as câmaras com sua única arte, não tenha duas"*.

⚠️ **A LEI QUE SAI DAÍ, e ela vale para o M3–M5:** as duas irmãs mataram a repetição e trouxeram
coisa pior — não leram como variedade da mesma parede, leram como **duas paredes emendadas**. A
repetição é um defeito que o olho perdoa; a emenda não. **Uma arte por câmara.**

### ✅ RESPONDIDO EM 12/09 — O CRITÉRIO DE ESCOLHA DAS FAIXAS

Duas coisas ficaram decididas, e as duas encolhem o M2:

**1. Ele NÃO vai pintar as faixas à mão.** *"eu criei os assets no PixelLab e isso era o combinado
de trocar quando desse"*. As 64 candidaturas SÃO a entrega dele. O trabalho de filtrar e instalar é
meu, e a regra de saída é dele: *"precisamos filtrar as melhores e ver se fica bom, caso não fique,
mantemos a que está agora"* — ou seja, **a provisória é um destino aceitável**, não um fracasso.

**2. O critério de escolha não é qualidade abstrata, é IDENTIDADE DE CÂMARA.** Palavras dele:
*"eu só preciso que cada segmento, irmãs ou diferentes, tenham a identidade visual daquela câmara
(sempre combinando com o fundo)"*.

⚠️ **ISSO MUDA A RÉGUA, e é a lei que vale para as 4 faixas e para as peças do M3–M5:** a pergunta
deixa de ser *"esta candidatura é bonita?"* e passa a ser **"esta candidatura pertence a ESTA
câmara?"** — medida contra a pintura dela, não contra as outras três nem contra o gosto. Duas
variantes irmãs ou duas bem diferentes, tanto faz: o que não pode é uma peça da câmara B que
caberia igualmente bem na C.

⚠️ **E ISSO RESOLVE A REPETIÇÃO DE GRAÇA.** A seção abaixo dizia que duas variantes por câmara
"dobram a arte dele" — não dobram mais: são 16 candidaturas por lote, e escolher DUAS custa o mesmo
que escolher uma. A pergunta que restava (*uma variante neutra ou duas alternadas?*) morre: são
duas, porque agora é grátis.

### 1. A REPETIÇÃO DA FAIXA — (o texto abaixo é o registro de como a pergunta nasceu)

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
| `_ver-abertura.mjs` | **da ABERTURA JOGANDO:** o que a decoração está tapando? Captura t=7/20/33 e imprime a caixa de cada peça. Foi ela que pegou o coração de 263px que passava em todos os asserts |
| `_folha-lamina.mjs` | a folha mista (da Task 4 morta; a geometria dela ainda serve) |
| **`_ver-bordas.mjs`** (13/09) | **as 4 CÂMARAS JOGANDO:** salta para t=7/45/74/111, imprime as texturas de faixa e a espessura de cada uma, e monta a folha. É o que responde a pergunta dele — *esta borda pertence a ESTA câmara?* |
| **`_assar-anim.mjs`** (13/09) | **de uma ANIMAÇÃO de cenário:** prende o estouro do gerador contra o sprite estático aprovado e monta a folha de sprites. Três knobs: `pico` (a média), `teto` (o p99, com fator, porque nem sempre o pixel mais claro é a parte que acende) e `forca` (a amplitude inteira) |
| **`_folha-anim.mjs`** (13/09) | **de uma ANIMAÇÃO, a régua:** quanto cada quadro mexeu contra o quadro 0, e quanto disso foi SILHUETA. ⚠️ Cuidado com a leitura dela — ver a lei da caixa delimitadora abaixo |
| **`_ver-respiro.mjs`** (13/09) | **as peças RESPIRANDO no jogo:** congela o mundo e fotografa a MESMA peça em quatro momentos da batida. Sem congelar, a peça sai da tela entre um quadro e o outro e a folha compara peças diferentes |

⚠️ **A LEI QUE A `_folha-anim.mjs` QUASE FEZ EU PAGAR ERRADO:** ela acusou 5–9% de "silhueta
mexendo" no coração e eu quase descartei a animação por isso. A medição certa é a **CAIXA
DELIMITADORA por quadro** — e ela não anda (0px no maquinário, 2px no coração). O que a primeira
régua somava era a carne mudando de forma DENTRO da gaiola, que É a batida. Importa porque a peça é
ancorada na borda: balançar denunciaria a âncora, mudar de forma por dentro não.

⚠️ **`scripts/_f4/*.png` é IGNORADO pelo git** (`.gitignore:40`). Os PNG existem **só neste
disco** — um `git clean` apaga e não há de onde restaurar. Os `.mjs` estão versionados.

**Os arquivos que importam no disco:**
`_faixa-{A,B,C,D}.png` (cru) e **`_faixa-{A,B,C,D}-v.png` (valor corrigido)**, mais os **8
candidatos da decisão de 13/09 em `scripts/_f4/_faixa2/`** (`A-0..3`, `B-0..3`, com os `-v` dos
finalistas). Mais `_folha-faixas.png`, `_mock-moldura.png`, `_folha-lamina.png` e o material morto
da Task 4 (`_col-1..10`, `_lam-A..K`).

⚠️ **A ARTE QUE ENTROU NO JOGO NÃO CORRE ESSE RISCO** — ela mora em `public/sprites/` e está
versionada: `f4-faixa-{a,b,d}.png`, `orgao-anim.png`, `maquinario-anim.png`. E os quadros crus das
duas animações estão em `assets/raw/anim-orgao/` e `assets/raw/anim-maquinario/`, também
versionados, então reassar com outros knobs não custa geração nenhuma.

**Os job ids do PixelLab, se os candidatos de `_f4/` sumirem:**

| lote | job id |
|---|---|
| câmara A (4 candidatas) | `2409a4ca-4a01-4b29-9188-67732aa80a2c` |
| câmara B (4 candidatas) | `ccc85cf9-15eb-40a3-93a0-2ff2667ccc76` |
| animação do coração (a boa, "só escurece") | objeto `e754b9b9-8338-408c-b56e-ca24661036ae`, grupo `14dbafcb-83d1-4626-8701-2d36776dcb9b` |
| animação do maquinário (a boa) | objeto `89edcdd0-9d7d-4ce8-8721-029e20fc3267`, grupo `7eeceed5-7c59-47e1-b869-7b44982ccd8a` |

---

## 🚫 A "LIMPEZA DO PIXELLAB" — NÃO EXISTE. NÃO PROPONHA DE NOVO.

⚠️ **ESTA SEÇÃO ERA UMA PROPOSTA DE LIMPEZA E VIROU O CONTRÁRIO EM 12/09.** Ela dizia que 4
objetos presos em `review:awaiting-selection` "seguram slot e poluem a listagem", e sugeria
`dismiss_review` nos quatro. Estava errada em três coisas, e as três foram conferidas na API:

1. **NÃO SÃO 4 OBJETOS EM REVIEW. SÃO 167**, de 906 no total. O doc só rastreava os 4 porque foram
   os únicos que uma sessão parou para julgar.
2. **OS OUTROS 163 NÃO SÃO ENTULHO — SÃO A BIBLIOTECA DELE.** Palavras dele: *"eu tinha criado
   vários assets novos para colocarmos na fase 4, como melhoria e enriquecimento de cenário... mas
   isso vamos ver após fechar as pendências de arte e gameplay."* ⚠️ **A fila de review é onde ele
   guarda o que ainda não instalou.** Um `dismiss_review` em massa apagaria trabalho dele, e é
   IRREVERSÍVEL — `dismiss_review` descarta o objeto e apaga todas as candidatas.
3. **DESCARTAR NÃO DEVOLVE GERAÇÃO NENHUMA.** As ~99 gastas nas 4 faixas foram embora em 08/09. O
   ganho da "limpeza" era zero; o risco, o trabalho dele.

**A decisão de 12/09: não se descarta nada, nem as 4 faixas.** Elas continuam reprovadas por
estrutura (ver a lei da ferramenta errada), mas guardar não custa e descartar não rende. Ficam:

⚠️ **E NA 2ª RODADA DE 12/09 ELAS DEIXARAM DE SER PESO MORTO.** Cinco peças do jogo saíram desses
mesmos quatro objetos — `f4Passarela` ×3 (do A) e `f4Ganglio` ×2 (do B). **A mesma candidatura é
reprovada ou aprovada conforme a pergunta:** "não sangra nas bordas" reprova uma FAIXA e *descreve*
um PROP. Mais um motivo para nunca descartar por arrumação.

| câmara | object_id (reprovadas por estrutura — GUARDADAS, não descartar) |
|---|---|
| A | `be88daa1-175e-4e5e-b794-557d762c6c7f` |
| B | `0884adc1-2a87-42e6-947f-ecc476ddac9c` |
| C | `b9771d81-d557-4679-825c-eb3cbb2fadf3` |
| D | `0dcb4148-4bd4-4779-8d57-c0bca6fa723e` |

### ⏳ E O QUE FICA NA FILA DE VERDADE: o enriquecimento de cenário da F4

Ele tem assets novos já gerados para **enriquecer o cenário da Fase 4**, e disse QUANDO olhar para
eles: *"após fechar as pendências de arte e gameplay"* — ou seja, **depois do M2–M5 e do Bloco B**,
não antes. ⚠️ **Não puxe esse material para dentro do M2.** O M2 tem quatro peças definidas e três
decisões abertas; misturar uma biblioteca de 163 candidaturas no meio disso é como a Fatia 7 já
morreu uma vez (a Task 4, as colunas novas).

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
O GOLFINHO — CÂMARA B     ✅ FECHADO, JOGADO TRÊS VEZES E APROVADO (11–12/09)
  aviso que sai da tela, o X nadando com a volta de dentro da parede, o duelo alternando rajada e
  leque, a fase segura em t=49,5. Nada pendente.
  Spec: .../2026-09-11-fatia7-golfinho-miniboss-design.md · Plano: .../2026-09-11-fatia7-golfinho.md
A LEITURA DA ABERTURA     ✅ JOGADA E APROVADA (12/09)
  mesas menores (vãos 126/112/120), destroços nas bordas, o coração enterrando os próprios cabos.
  Sem spec: três ajustes de leitura pedidos com print na mão. Ver "O QUE A SESSÃO DE 12/09 FEZ".
A ÁGUA + OS CANOS + AS PEÇAS + A PONTE   ✅ JOGADOS E APROVADOS (12/09, rodadas 2 e 3)
  a câmara B alaga em t=36 com 3 canos despejando, e a troca de pintura cai atrás do escuro;
  f4Ponte ×3 (pilar + vão procedural + pilar espelhado), f4Ganglio ×2, f4Cano ×3.
  *"o cano e a batalha com o golfinho ficou muito mais divertida"*, *"podemos encerrar esses
  ajustes"*. Ver "🌊 A ÁGUA DA ARENA E AS PEÇAS NOVAS".
A PONTE COM TORRES       ✅ JOGADA E APROVADA (13/09)
  [torre][pilar][vão][pilar espelhado][torre espelhada]. *"ficaram boas e terminaram com o
  problema do início das passarelas flutuando."* Nada pendente.
M2 — AS BORDAS            ✅ REJOGADAS E APROVADAS (14/09) · o contorno da B aprovado em 15/09
  A, B e D entraram com UMA arte cada (ele reprovou as duas irmãs jogando). A `Moldura` ganhou
  `setFaixa`, a borda viaja no evento `cenario`, e o `aplicaCorredorEMoldura` passou a repor a
  pintura junto — buraco que já existia e levava a doca para a arena do chefão.
  Depois do teste dele: a saia no lugar do enchimento chapado, o relevo contínuo, e o fio
  vertical ligando o degrau. Ver a seção 🎯 no topo.
  └ A MESA, que era parte do M2, está instalada e aprovada (aço engolido, 3 variantes).
  └ ⚠️ A CÂMARA C NÃO ENTROU: a arte está aprovada mas é 128×80, e instalá-la é o M4.
O CENÁRIO RESPIRA         ✅ APROVADO (14/09), e as colunas verticais junto
  o coração (chão, 7 q/s) e o maquinário (teto, 5 q/s), quadro inicial sorteado por peça.
  Assados por `_assar-anim.mjs` contra o sprite estático aprovado.
A EMENDA C→D + A PINTURA  ✅ APROVADAS (15/09) — a pintura do núcleo fica como está
BLOCO B · B1 — GUARDIÃO   ✅ APROVADO (15/09) — arte nova dele + morte composta no motor
BLOCO B · B3 — 2ª FORMA   ✅ O PREDADOR, fechado em 19/09 (7 rodadas, 6 testes jogados)
BLOCO B · B1 — A LUTA     ✅ a serra, a salva que cobre as bordas, a escala em 3 degraus (19/09), e a
                             LEITURA fechada em 20/09: o rastro do glóbulo, o aviso que deixou de
                             falar a língua do dano, e a trava da mira com 450ms de janela de fuga.
BLOCO B · B2 — A POSIÇÃO  ✅ FECHADO EM 20/09, SEM CÓDIGO: a posição de hoje é a certa. "os cabos
                             'fixam' no topo e se ficarem mais baixos ou fora da posição, mostra o
                             corte do sprite" — os tentáculos no teto são o acabamento, não o defeito.
M4 — A CÂMARA C           ⬜ ◄ PEGUE AQUI · A ÚLTIMA PEÇA. as 3 PORTAS com arte final (hoje
                             `f4-porta-prov.png`), a borda C grossa
                             (128×80, arte dele aprovada; a `Moldura` foi feita para 64 de altura) e o
                             esfíncter animado (`f4VivoC`)
M5 — A CÂMARA D           ✅ absorvido pelo M2 (`f4FaixaD` instalada e aprovada)
```

## 🧭 O MAPA PARA FECHAR A FATIA 7 (15/09)

**🔴 Obrigatório, na ordem dele:** ~~B3~~ ✅ (19/09) → ~~B2~~ ✅ (20/09, sem código) → ~~a leitura da luta~~ ✅
(20/09) → **M4 (portas, borda C, esfíncter) — a ÚLTIMA peça da fatia.**

**✅ CORTADAS — RESPONDIDO EM 19/09: *"risca as 3 primeiras"*.** A tabela amarela fecha inteira; nenhuma destas
três peças será construída, e a Fatia 7 não depende mais delas.

| peça da spec de 08/09 | o que era | o que ficou no lugar |
|---|---|---|
| **M3** — `f4MesaB1/B2` (a garganta) | duas mesas de carne fechando a passagem da câmara B | ✂️ cortada — mesas de aço, mesas do mar, gânglios, canos e o golfinho já enchem a câmara |
| **`f4VivoA/B`** (lâmpada, glândula) | duas peças "vivas" soltas pela fase | ✂️ cortada — o coração e o maquinário que respiram (aprovados em 14/09) já pagaram o "vivo" |
| **`f4Veu1/2`** (primeiro plano orgânico) | teias de carne passando NA FRENTE da nave | ✂️ cortada — nunca existiu, e atrapalharia ver a bala |

**🔵 Fechamento:** rejogar a dificuldade da arena do golfinho (`corredor` de t=38,5 com `rate 2.6`) ·
atualizar o HANDOFF · merge `--no-ff` na `main`. **Fora da fatia:** auditar as arenas de chefão das F1–F3
contra "só fundo" (→ Fatia 8 ou calibragem) · espaçar as colunas (→ balanceamento).

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

- ✅ **A MESA — ESTRUTURA DECIDIDA E ARTE INSTALADA (12/09).** A pergunta dele foi *"podemos
  decidir qual será sua estrutura: biomecânica? aço? outro tipo?"*, e a resposta foi **aço
  ENGOLIDO** — silhueta industrial com a carne do bicho tomando conta, a mesma língua da `f4Ponte`
  e do `f4Cano`. Três razões, e a primeira manda:
  1. **Legibilidade.** A mesa é a única coisa da fase que mata por ser TERRENO — todo o resto é
     fundo (tingido, depth negativo) ou inimigo (se move, atira). É a única peça da F4 que nasce
     **sem tint**. Biomecânica seria a mesma matéria da faixa, das costelas e da parede de onde ela
     cresce: camuflagem — o defeito que a provisória já tinha documentado.
  2. **Topo chato é geometria, não estilo.** A hitbox é 60% da largura da TEXTURA em altura cheia,
     então o desenho tem de alcançá-la lá em cima. Aço tem topo chato de graça; carne afunila, que
     foi como a lâmina morreu em 08/09 (46px de morte invisível).
  3. **Ficção já aprovada por ele**: a fase passa a ter uma frase só — *isto era uma doca, e o
     bicho está digerindo*.

  **Instaladas:** `mesa` / `mesa2` / `mesa3` (contêineres com hera leve, contêineres com as veias
  trepando, anteparo rachado). Dois objetos novos no PixelLab, 40 gerações, 8 candidaturas, 3
  escolhidas. ⚠️ **`f4-mesa-prov.png` fica no disco:** a regra de saída é dele — *"caso não fique
  bom, mantemos a que está agora"* — e voltar atrás é trocar uma linha da `BootScene`.

  ⚠️ **E A PERGUNTA DE "ARTE POR CÂMARA" NÃO PRECISOU SER RESPONDIDA.** Ela pressupunha que cada
  câmara teria a SUA mesa; na prática as três variantes entram pelo `pickVariant` em toda a fase,
  e a identidade de lugar é carregada pela FAIXA e pela pintura, que já são por câmara. Um
  `PropKind` por câmara continua possível se o M3–M5 pedir, mas deixou de ser pré-requisito.
- ✅ **O atalho de dev `G` — CONSERTADO em 12/09.** Ele agora chama `aplicaCorredorEMoldura`,
  como o modo treino já fazia desde 10/09. ⚠️ **E o defeito era pior do que estava escrito aqui:**
  a descrição dizia "luta com parede de 16px em vez de 54", mas o erro real era o oposto e mais
  grave — apertar `G` **dentro do duto** levava a parede do duto para dentro da arena, com
  espessura 54 e `duto: true`. Ou seja, **o chefão final era lutado num corredor cujas paredes
  matam.** ⚠️ E a `probe-stage4` nunca pegou isso por coincidência: ela aperta `G` por volta de
  t≈10, onde a espessura já é 16 e `duto` já é false — exatamente o estado da arena. Sonda nova:
  `probe-f4-atalho-g`, que salta de t=72 (dentro do duto) e cobra a arena real.
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
corredores {"chao":3,"teto":3,"vaos":[126,126,126]}
```

`node scripts/probe-stage4.mjs`. Tem de devolver **exatamente** isto. Se mudar, a mesa nova está
comendo o vão — **o erro é da ARTE, não do roteiro**.

⚠️ **ERA `[110,110,110]` ATÉ 11/09, E MUDOU DE PROPÓSITO EM 12/09** — ele, jogando: *"diminua o
tamanho das mesas no início da fase 4"*. A janela da sonda acompanhou (`[96,124]` → `[112,140]`).
A regra não mudou: **quando o ROTEIRO muda o vão, a linha de base acompanha; quando ela quebra
sozinha, a culpada é a arte.**

⚠️ **A sonda NÃO pega a mudança de dificuldade na horizontal nem a curva contínua.** Ela cobre o
vão, não a espessura nem o ritmo. Isso só o controle na mão julga — e é por isso que o M1 termina
com ele jogando.

---

## O REPOSITÓRIO

Branch **`feat/fase4-visual`**, em dia com o `origin`. `main` está em `f417c0e` com a Fatia 6
mergeada. `origin` = github.com/HenriqueCrosio/AlienWorld-Remastered-V2.
⚠️ O remoto **`legacy`** é o repositório ANTIGO — **nunca empurre para ele**.
⚠️ **Commits são de autoria SÓ do Henrique** — sem `Co-Authored-By`, sem "Generated with".

**A sessão de 13/09** fechou em três commits, todos empurrados:

| commit | o que |
|---|---|
| `8e29f63` | as bordas das câmaras entram, e a moldura aprende a trocar de faixa (`setFaixa`, o `faixa` no evento `cenario`, a pintura reposta no `aplicaCorredorEMoldura`) |
| `8fa81a3` | o coração e o maquinário respiram — as sheets, o `_assar-anim.mjs` e o `anim` na `ScatterLayer` |
| `7bb2fd2` | o teste jogado dele: a camada dos corações, uma arte por câmara, a saia no lugar da tira chapada, o relevo contínuo e o fio do degrau |

⚠️ **AS SONDAS DA SESSÃO DE 13/09, TODAS VERDES E UMA POR VEZ:** `probe-f4-moldura` (com cinco
asserts novos — a FAMÍLIA da faixa em vez de uma chave cravada, os 8 segmentos da MESMA câmara, a
saia emendada no PIXEL, a saia como ARTE e não cor lisa, e o degrau ENCOSTANDO nos dois fios),
`probe-stage4` (`vaos:[126,126,126]`, exato), `probe-f4-visual`, `probe-f4-atalho-g`,
`probe-f4-golfinho` e `probe-stage3`.

**A sessão de 12/09** fechou num commit só, `c4bbdc8` — *"a abertura abre: mesas menores,
destroços na borda, o coração enterrado"*. Ele carrega os três ajustes, os dois asserts novos da
`probe-f4-visual`, a janela nova da `probe-stage4` e a ferramenta `_ver-abertura.mjs`.

As sondas no fim da sessão, **todas verdes, uma por vez**: `probe-f4-visual` (20/20, com os dois
asserts de leitura), `probe-stage4` (com `vaos:[126,126,126]`), `probe-f4-moldura`,
`probe-f4-golfinho`. ⚠️ E as das outras fases (`probe-stage1-visual`, `probe-stage2`,
`probe-stage3`) porque `Parallax.emit` é código COMPARTILHADO — a lei 2 do M1.

Os commits da sessão de 11/09 (o golfinho), todos empurrados:

| commit | o que |
|---|---|
| `5ca12d0` | a spec do golfinho + o START apontando para ela |
| `f1fc711` | a arte: três folhas sem a bala desenhada, e a bala 13×9 |
| `9fe5080` | a entidade, o roteiro da câmara B e a arena segurando em t=49,5 |
| `b29c82a` | o primeiro plano sai de cena na arena (pego na captura) |
| `0d71780` | as sondas da moldura e do cenário atravessam a arena |
| `dc76c80` | o plano e o que ver no teste jogado |
| `c6be51b` | o 1º ajuste jogado: nado com onda, volta de dentro da parede, duelo alternando |
| `2801c6c` | o 2º ajuste jogado: o aviso passa por B e sai da tela |

As sondas da F4, verdes no fim daquela sessão: `probe-f4-golfinho` (a nova), `probe-f4-moldura`,
`probe-f4-visual`, `probe-stage4` (com `vaos:[110,110,110]` — hoje `[126,126,126]`) e `probe-stage3`
(a aranha segue sendo o `miniboss` sem `kind`). ⚠️ UMA POR VEZ.

**PixelLab:** o arranque de 12/09 conferiu **4.668** de 5.000, ciclo virando em 2026-10-04. A
sessão gastou **125** ao longo do dia:

| o quê | gerações |
|---|---|
| o cano de despejo (16 candidaturas) | 20 |
| a mesa · contêineres (4) | 20 |
| a mesa · anteparos (4) | 20 |
| as torres da ponte (16) | 25 |
| a borda da câmara B (4, imagem cheia com 3 referências) | 20 |
| a borda da câmara A (4, idem) | 20 |

⚠️ **A LIÇÃO DE CUSTO, medida de novo:** objeto de 48–80px devolve 16 candidaturas por 20–25
gerações; `create_image_pro` a 128×64 devolve 4 por 20. Candidatura é barata; o caro é o tempo de
julgar. ⚠️ Confira o saldo no arranque antes de gastar.

**PixelLab em 13/09: 4.533 de 5.000**, ciclo virando em 2026-10-04. A sessão de 13/09 gastou **10**
— cinco chamadas de `animate_object`, 2 cada. As bordas não custaram nada: a arte já estava em
disco desde 12/09.

⚠️ **E A LIÇÃO DE CUSTO NOVA É DE PROMPT, NÃO DE PREÇO: repetir um pedido que o gerador ignorou é
gastar geração para receber o mesmo número.** Duas rodadas pediram "nunca branco" com todas as
letras e as duas voltaram estouradas. Quem virou o jogo foi a 3ª, que pediu OUTRA COISA — uma
animação que só escurece. Se a segunda tentativa sair igual à primeira, **mude o pedido ou mude de
ferramenta**; a terceira idêntica é dinheiro no lixo.
