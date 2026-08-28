# START — Fatia 5: FASE 3 ("O CASCO")

**🟡 FATIA EM ANDAMENTO.** Branch `feat/fase3-visual` @ `69da3e8`, **não mergeada**. `main`
continua em `ee4e2a0` (a Fatia 4).

O Henrique jogou a fase **três vezes** — 27/08 (duas) e 28/08. A terceira rodada de ajustes está
entregue e **já foi jogada**: ela deixou **um veredicto claro sobre o rabo**, que é por onde a
próxima sessão começa.

---

## 🔑 COMO RETOMAR (frase de arranque)

> **"Leia `docs/superpowers/plans/2026-08-25-fase3-visual-START.md`. A Fatia 5 está em andamento
> na branch `feat/fase3-visual`. Já joguei a última rodada e o veredicto está no topo do
> documento: o rabo ainda se desprende no fim, e o que eu quero é que ele ATRAVESSE — fixo na
> quina inferior direita, só a ponta da cauda mexendo, e no fim ele SAI da tela, como se o nado
> do Leviatã tivesse só passado na minha frente. Isso derruba a coreografia do toco: não tente
> salvá-la. Comece por me perguntar o que a saída deixa no lugar dela, porque hoje é o toco que
> chama o nascimento do casco. Sobe o `npm run dev`, eu entro com `[M]`."**

⚠️ **NÃO comece pelo fechamento** (revisão ampla, documentos, merge). Fechar antes do teste humano
é fechar sobre arte que ainda muda — esta fatia já reabriu três vezes por isso.

⚠️ **NÃO re-despache as tarefas antigas.** Estão commitadas (21 commits desde `ee4e2a0`).

---

## 🔴 O VEREDICTO DO 3º TESTE — leia antes de propor qualquer coisa

### 1. O RABO SE DESPRENDE. Ele tem que ATRAVESSAR.

Palavras dele, 28/08:

> *"O rabo continua com efeito de desprender no final da animação, quando muda para o casco. O
> rabo precisa ficar fixo no canto inferior direito da tela, e somente o final da cauda que mexe.
> Para ficar mais fácil, o que precisa ser feito é fazer com que a cauda saia da tela no final da
> animação, como se o nado do leviatã tivesse apenas passado na frente do jogador."*

**Três coisas nessa frase, e a terceira derruba a segunda rodada inteira de ajustes:**

1. **FIXO na quina inferior direita.** A pose de 28/08 (`y=158`, `x=374`, deitado, sangrando 66px
   pelo rodapé) foi na direção certa e **não é o que ele está reclamando** — não a desfaça sem
   motivo. O que ele quer é que o corpo não se MOVA de lá.
2. **Só a ponta da cauda mexe.** A batida (±6° em torno do pedúnculo) já é isso. O que quebra a
   leitura é o resto do movimento, não ela.
3. **No fim ele SAI DA TELA.** É a substituição do mergulho, não um ajuste dele.

⚠️ **O MERGULHO É O QUE LÊ COMO DESPRENDER, E ISSO ERA PREVISÍVEL EM RETROSPECTO.** A coreografia
atual é: gira −38° em torno do pedúnculo → o corpo inteiro roda e desce → segura → afunda em `y`
até 330 com `alpha` indo a 0. Um corpo rígido que gira e depois **desce e apaga** no lugar é
exatamente a descrição de uma peça que se soltou. Nenhuma quantidade de ajuste em `y` ou no atraso
conserta isso: **o vocabulário do movimento está errado**, não os números dele.

⚠️ **NÃO TENTE SALVAR O TOCO.** "O toco fica e o casco nasce dele" é uma ideia bonita que veio do
pedido do 1º teste (*"sai por baixo, deixando apenas o toco da cauda"*) e que **três testes depois
não passou**. O 3º pedido é o oposto: nada fica. O bicho passa.

### ⚠️ E ISSO ABRE UM BURACO QUE PRECISA DA DECISÃO DELE — PERGUNTE ANTES DE CODAR

**Hoje é o mergulho do rabo que chama o nascimento do casco** (`GameScene.raboDoLeviata` →
`onComplete: () => this.parallax.revealCasco(1, 1500)`), e isso é deliberado: o casco tem que
começar no instante exato em que a nadadeira limpa o rodapé, e esse instante é uma etapa de tween,
não uma linha do `STAGE_3` (amarrá-lo ao relógio faz os dois derivarem — está comentado no código).

Se o rabo **sai da tela**, esse gancho tem que ir para outro lugar, e as opções não são
equivalentes:

- **(a) O casco já está lá quando o rabo passa** — o rabo atravessa POR CIMA de um chão que já
  existe. É o que "só passou na minha frente" mais literalmente sugere, e é o mais simples. Mas
  mata a revelação: o casco deixa de ser a virada e vira cenário que apareceu sozinho.
- **(b) O casco nasce enquanto o rabo passa** — o `revealCasco` engatado na saída dele, não no
  fim. A virada sobrevive e o rabo continua sendo quem a causa.
- **(c) O casco nasce depois que ele sai** — o quadro fica vazio um instante e o chão sobe. É a
  leitura mais limpa de "ele passou, e o que estava atrás dele era o corpo".

**PERGUNTE QUAL.** Não escolha por ele: a Fase 3 se chama "O CASCO" e essa é a cena que dá nome à
fase. Vale também perguntar **por qual borda ele sai** — pela esquerda (continua a rota do jogador,
"ultrapassamos") ou por baixo (mergulha e some, mais perto do nado de baleia).

### 2. Os respiradouros: "falta algo" — TRÊS testes sem resposta

> *"Os respiradouros preciso ver o que vamos fazer, acho que eles são legais, mas ainda acho que
> falta algo neles."*

A hipótese da 2ª rodada (*eles eram peça fria num casco quente*) **caducou**: o casco não é mais
aquele — a arte inteira foi trocada em 28/08 e agora nasce no canon. Então a pergunta volta ao
zero, e é melhor assim.

⚠️ **PEÇA PARA ELE REJOGAR E DIZER SE O "FALTA ALGO" MUDOU DE TAMANHO** antes de propor sopro, luz
ou reação. As hipóteses seguem na mesa, se ele quiser escolher: (a) falta **respirarem** — um sopro
de vapor em pulso; (b) falta **luz** dentro; (c) falta **reagir** ao jogador; (d) falta
**variedade de tamanho**.

### 3. A faixa de casco de 66px — decisão da sessão, sem veredicto

A crista subiu de y=165 para **y=150** quando a arte nova entrou (os tiles são 116² e em 53 linhas
as costelas saíam decapitadas). **Ele não pediu isso.** Os props têm 57–62px e ainda coroam acima
da faixa, mas são 6% de tela a menos. Se ele reclamar de aperto, o botão é a altura do recorte em
`scripts/instalar-casco.mjs` (`ALTURA = 66`) — e mexer nela obriga a re-rodar
`node scripts/instalar-casco.mjs && node scripts/casco-frente.mjs`.

---

## O que testar, e como

`npm run dev` (porta 5173). No menu: **`M`** entra direto na Fase 3, `N` é o treino da serpente.

| t | O quê |
|---|---|
| 0–37s | Ato 1 dentro da nuvem — as águas-vivas atravessam em t=8 e t=16, **agora com CHOQUE** |
| 21s | A nuvem afina 25%… e o casco **não** aparece |
| 37,5s | Os hazards param — o quadro esvazia |
| **38s** | **O RABO** entra pela direita, agora **deitado na quina inferior direita** |
| 42s | A nuvem abre; o casco continua invisível |
| **46,5s** | 🔴 **O MERGULHO — é ele que lê como "desprender". É o que vai mudar.** |
| 48s | O casco sólido: **arte nova, sem tint** |
| 48,5s | Banner `O CASCO DO LEVIATÃ` |
| 53s | A aranha — **zona da CAUDA**: blindagem e couro |
| 63–78s | **zona do MEIO: a caixa torácica.** É aqui que a métrica do casco se vê |
| 84s+ | **zona da PROA**: dutos e maquinário |
| 88s | A serpente |

---

## O que a rodada de 28/08 entregou (commit `69da3e8`)

### 1. O casco: arte nova, tint fora, e composição por PERCURSO

Os seis tiles que ele gerou nascem na cor do rabo — o `tint 0x84c0ff` saiu inteiro. A régua nova é
`scripts/_medir-paleta.mjs` (a cor **modal** do material; a antiga media os 8% mais claros, que
nesta família é o OSSO):

| | cor modal | R−B |
|---|---|---|
| `ref-leviata-armored` | `#0c121a` / `#1f2932` | −14 / −19 |
| rabo | `#19222a` (39%) | −17 |
| casco **antigo** | `#32312b` (44%) | **+7** ← o intruso |
| casco **novo** | `#19222a` / `#2e3b44` | −17 / −22 |

E a **métrica que ele pediu**: `Parallax.familiaDoCasco()` escolhe a peça pela distância percorrida
sobre o bicho, não por sorteio — cauda → costela → duto. **Ainda não foi comentada por ele.**

### 2. O rabo: deitado na quina (aprovado por implicação), mergulho (REPROVADO)

A pose deitada resolveu o vazio de ~50px que havia entre a barriga dele e a borda de baixo. **Ele
não reclamou dela** — reclamou do que vem depois.

### 3. A água-viva: o choque

`Fx.estalo` (o arco de quem está viva, a cada 1,1–2,3s) e `Fx.choque` (a morte: 7 raios + anel +
fagulha fria, **sem a sheet de fogo**). **Não comentado no 3º teste** — vale perguntar.

---

## Regras que não se redescobrem (custaram sessão)

### O que os TRÊS testes jogados derrubaram

⚠️ **A "insinuação" do casco em t=21 foi REVERTIDA.** O `HANDOFF` pedia desde a Fatia 0, a sessão
de 26/08 implementou, e o Henrique reprovou jogando. **Não foi esquecida: foi construída, vista e
rejeitada.** Não reimplemente.

⚠️ **"Colossal tem teto" também morreu.** Sair do quadro deixou de ser defeito e virou o objetivo.

⚠️ **"O toco fica e o casco nasce dele" morreu no 3º teste.** Ver o topo deste documento.

### Medição

⚠️ **MEÇA A PALETA ANTES DE DISCUTIR COR** — e **confira o que a régua está medindo**. A régua dos
"8% mais claros" funcionou por duas rodadas e mentiu na terceira, quando a arte ganhou osso branco
e cobre. A cor de um material é a cor que ele REPETE.

⚠️ **TINT MULTIPLICATIVO SÓ ESCURECE**, e o preço aparece jogando: o casco tingido chegou ao canon
perdendo ~28% de luminância — cor certa, matéria morta. Arte na cor errada se REGERA; não se tinge.

⚠️ **MEDIR NO TAMANHO REAL DO JOGO.** O míssil descartado (`e77eebe8`) só se entregou assim.

⚠️ **O QUE ESTÁ NA TELA SE MEDE POR DIFERENÇA, NÃO A OLHO.** A quina inferior direita tem
`derelict` pálido do parallax passando o tempo todo, indistinguível do toco numa captura — esta
sessão quase calibrou a pose em cima de um destroço. `scripts/_f3/ver-toco.mjs` congela a cena,
fotografa com e sem o rabo, e pinta a diferença.

### Sondas

⚠️ **ASSERT DE MOVIMENTO QUE NÃO OLHA A DIREÇÃO NÃO MEDE MOVIMENTO.** Duas vezes nesta fatia: o
mergulho com o sinal invertido (`+38`) que `angulo > 20` aprovou, e a água-viva medida por
`vx > -40`, verdadeiro até num bicho parado. **Quem reprovou o primeiro foi a captura de tela.**

⚠️ **EFEITO DE 90ms SE MEDE POR CHAMADA, NÃO POR FOTO.** O estalo da água-viva é contado
envelopando `Fx.estalo`. É a lição do rodapé, num caso novo.

⚠️ **ASSERT DE EFEITO COBRA O QUE NÃO ACONTECEU TAMBÉM.** A morte da água-viva exige
`choque == 1` **E** `explode == 0` — só a primeira metade passaria numa implementação que chamasse
os dois, e a bola de fogo esconderia os arcos.

⚠️ **ASSERT QUE ENCOSTA NA MUDANÇA SE CONFERE, NÃO SE AFROUXA — e pode ficar mais EXIGENTE.** O do
sangramento do rabo inverteu de lado (topo DENTRO do quadro, 40px+ pelo rodapé): um rabo centrado
agora reprova, e um encolhido também. O teste é se a versão nova reprova MAIS do que a antiga.

⚠️ **SONDA DE TEMPO REAL SE RODA UMA POR VEZ.** Três browsers headless no mesmo Vite quebram a
`probe-stage3`.

⚠️ **SONDA QUE PODE TRAVAR EM SILÊNCIO NÃO É SONDA.** A primeira `ver-emenda.mjs` dormia
`(alvo − t) × 700ms`, o que assume tempo real — o headless não roda em tempo real, e o laço ficou
mudo por minutos. Polling de intervalo FIXO e teto de iterações.

### Código

⚠️ **O CULLING DO RÓSTER SÓ OLHA A BORDA ESQUERDA.** Quem atravessa na vertical precisa do culling
próprio. ⚠️ **Isto vai voltar quando o rabo sair pela borda** — se ele sair por baixo ou pela
esquerda, confira quem o destrói.

⚠️ **UM EIXO É FÍSICA, O OUTRO É ESCRITO À MÃO — E ELES NÃO PODEM SE MISTURAR.** A senóide escreve
posição, e escrever posição todo frame apaga a velocidade daquele eixo.

⚠️ **ARTE DE FUNDO NÃO PODE ADIANTAR O DADO DO JOGO.** `Phaser.Math.RND` é o mesmo fluxo que
`Phaser.Math.Between` consome no espaçamento das ondas. Cenário sorteia com `Math.random`.

⚠️ **DOIS CAMINHOS DE MORTE COM A MESMA CÓPIA DAS QUATRO LINHAS.** A bala e a BOMBA. Um efeito de
morte novo só num deles faria a água-viva pegar fogo quando morresse de bomba — e ninguém
descobriria a não ser jogando com a bomba na hora certa. Agora é `GameScene.matarInimigo()`.

### Arte gerada

⚠️ **MOVIMENTO QUE CABE NUMA FRASE DE GEOMETRIA NÃO VAI PARA OS QUADROS GERADOS.** O v3 leu *"bater
para cima e para baixo"* como **girar** e devolveu o rabo como hélice. Os raios do choque são
desenhados em código pelo mesmo motivo.

⚠️ **GLOW INTERNO, NUNCA EXTERNO, em sprite recortado justo.** O halo externo vaza da quad e é
ceifado nela: vira um retângulo aceso em volta do bicho.

⚠️ **A CAPTURA AMPLIADA DESMENTE O TAMANHO DO JOGO — TRÊS VEZES NESTA FATIA.** O glow-retângulo, o
míssil, e agora o arco do choque (que saía quase reto: ~3px de desvio numa criatura de 15px).

⚠️ **SULCO DE 1px NO MIOLO É TÃO RUIM QUANTO CONTORNO NA BORDA.** Num tile que repete, vira risco
atravessando o chão. O `casco-frente.mjs` agora reprova na fonte.

⚠️ **O `install-anim.mjs` grava `<nome>-{i}.png`.** A convenção do `BootScene` é `<coisa>-anim-{i}`.

⚠️ **NÃO GERE ARTE A PARTIR DA COISA EM QUE ELA SE APOIA** (a doca, repetida no lança-mísseis).

⚠️ **PARA TRAVAR O ÂNGULO, RECORTE O ÂNGULO DA PRÓPRIA REF.**

### As regras das sessões anteriores, ainda válidas

- ⚠️ **A/B visual sem congelar a cena não é A/B** (`scene.pause()`; e depois do pause busque a cena
  por chave, `getScene('Game')` — `getScenes(true)` volta vazio com tudo pausado).
- ⚠️ **Empate de profundidade renderiza certo por acidente.** Toda profundidade nova precisa ser
  distinta e comentada.
- **O `pickVariant` sorteia UNIFORME.** Proporção que importa vem da GEOMETRIA, não dele — e no
  casco, agora, do LUGAR (`familiaDoCasco`).
- ⚠️ **O `paint-bg.mjs` sempre esteve certo; ele vinha sendo CHAMADO errado.**

---

## Sondas e réguas

`probe-f3-visual.mjs` — **44 asserts**, tudo verde. Cobre a pintura em resolução real, a água-viva
(existe, pulsa, atravessa na vertical, quem desce vem de ponta-cabeça, limpa a tela antes do rabo,
**estala viva e morre em CHOQUE e não em fogo**), o casco INVISÍVEL no Ato 1 com a nuvem afinando
mesmo assim, o rabo (bate, arco curto, se segura na direita, colossal, **deitado na quina**, sem
corpo físico), o TOCO (gira para BAIXO, depth −76, o casco nascendo dele), **a composição
POSICIONAL do casco em três pontos** (sem costela na cauda, costela no meio, duto na proa), o
rodapé, as emendas, e os respiradouros.

`probe-stage3.mjs` — **o portão**: a fase de ponta a ponta, as 4 formas da serpente, o hangar.

**Réguas e olhos** (`scripts/`):
- `_medir-paleta.mjs` — a cor MODAL de uma arte. **Use antes de discutir cor.**
- `_medir-rabo.mjs` — perfil da arte por coluna, escala × tela, e quanto cada ângulo derruba a
  nadadeira. ⚠️ O ângulo do mergulho é NEGATIVO no código; a tabela mostra só o tamanho do giro.
- `instalar-casco.mjs` — recorta os seis tiles (114×66) e reprova borda preta e furo na faixa.
- `casco-frente.mjs` — a tira que esconde o pé dos props; reprova sulco de 1px.
- `_f3/ver-toco.mjs` — **a silhueta do rabo isolada por diferença.** Indispensável para a próxima
  rodada: é o único jeito de saber o que na quina é rabo e o que é destroço do fundo.
- `_f3/ver-emenda.mjs [de] [até] [passo]` — a transição quadro a quadro + zoom da quina.
- `_f3/ver-choque.mjs` — o estalo e a descarga, congelados e ampliados a 8×.
- `_f3/diag-emenda.mjs [t]` — que peças de casco estão na tela num instante, e colunas escuras.

Regressão da sessão de 28/08: `tsc` limpo · `npm run build` limpo · `probe-f3-visual` 44/44 ·
`probe-stage3` verde · `probe-chain` verde · `probe-cut2-visual` verde · `probe-doca` verde.

⚠️ **DOIS ASSERTS SÃO BARULHENTOS. RODE DE NOVO ANTES DE CONCLUIR — E NUNCA AFROUXE.**
- **O rodapé** (0,065–0,50 entre execuções, limiar 0,055): amostra pixel num instante da fase.
- **A contagem de lança-mísseis** (1 a 5 entre execuções, esperado ~4,2): `GetRandom` é uniforme
  sobre ~8 slots. Reprovou uma vez em 28/08 e passou na re-execução seguinte com 4.

---

## O que falta

1. 🔴 **O RABO QUE ATRAVESSA** — e a decisão dele sobre o que passa a chamar o nascimento do casco.
   **Pergunte antes de codar.** É o item 1 do topo deste documento.
2. 🔴 **OS RESPIRADOUROS** — três testes sem resposta. Peça o veredicto com o casco novo na tela.
3. ⚠️ **A faixa de 66px** — decisão da sessão, sem veredicto jogado.
4. **Os outros ajustes que saírem do teste.**
5. **A decisão sobre a `paintBgF2` / `paintBgZeroG`** (o mesmo erro de resolução, em fases
   mergeadas e revisadas). Uma linha por pintura: `node scripts/paint-bg.mjs <origem> <destino>
   384 216`, mais o `y` no `Parallax`.
6. ⚠️ **A REVISÃO AMPLA DA BRANCH** — a Task 3 nunca foi revisada, nem a sessão de 26/08, nem
   nenhuma das três rodadas de teste. **Tem que acontecer antes do merge.**
7. **Os documentos e o merge** (`--no-ff`, mensagem por arquivo).

**A próxima fatia depois desta é a 6 — Cutscene 3 (o hangar do Leviatã).**
