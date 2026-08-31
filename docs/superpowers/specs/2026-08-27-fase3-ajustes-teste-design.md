# SPEC — Fase 3: os ajustes do primeiro teste jogado

**Data:** 2026-08-27 · **Branch:** `feat/fase3-visual` (Fatia 5, em andamento) · **Base:** `88ab4fb`

O Henrique jogou a Fase 3 pela primeira vez com as cinco mudanças da sessão de 26/08 no ar.
Veredicto por parte:

| Parte | Veredicto |
|---|---|
| Ato 1 (pintura, névoa, cenário) | ✅ **"bem imersivo, muito bem montado"** — não tocar |
| Lança-mísseis e projéteis | ✅ **"OK"** — não tocar |
| O rabo do Leviatã | ⚠️ pequeno demais; tem que sair do quadro |
| A transição rabo → casco | ⚠️ o casco aparece cedo, com gradiente estranho |
| Os respiradouros | ⚠️ seguidos e demais |
| — | ➕ quer um inimigo novo no Ato 1 |

Esta spec cobre as quatro mudanças. **Nada fora desta lista muda.**

---

## 1. O rabo colossal

### O problema

Escala 2,4 não lê como "não cabe no quadro". A sessão de 26/08 travou aí por uma regra que ela
mesma escreveu — *"2,4 é o maior tamanho em que o ARCO INTEIRO da batida ainda cabe na tela"* —
e a regra existia porque **sair do quadro era tratado como defeito**.

⚠️ **O HENRIQUE DERRUBOU ESSA REGRA.** Sair do quadro é agora o objetivo declarado: *"talvez
fazer com que ele saia do frame da tela, para dar a impressão de colossal"*. Sem o teto, a escala
sobe.

### A mudança

| | antes | depois |
|---|---|---|
| escala | 2,4 → 257×175 | **3,4 → 364×248** |
| sangra do quadro | nada | **~20px em cima, ~12px embaixo, ~13px à direita** |
| arco da batida | ±8° | **±6°** |
| varredura da ponta | ~66px | **~70px** |

A arte é 107×73. Com origem `(0.92, 0.5)` em `x=368`, a 3,4 o sprite ocupa de x≈33 a x≈397 e de
y≈−20 a y≈228 (tela 384×216).

⚠️ **O ÂNGULO CAI PARA O MOVIMENTO NÃO MUDAR.** A ponta da nadadeira passa a ficar a ~335px do
pedúnculo em vez de 236 — a mesma alavanca ficou mais longa. ±8° em 3,4 varreria 93px e a batida
viraria outra coisa; ±6° varre ~70px, que é praticamente a varredura de hoje (~66px). **Reduzir o
ângulo aqui é o que PRESERVA a batida, não o que a enfraquece.** A assimetria (sobe em 1,5s
`easeInOut`, desce em 0,55s `easeIn`) fica intacta — foi aprovada.

### Risco aceito, e o degrau abaixo

A 3,4 a nadadeira alcança x≈33: ela atravessa a tela inteira por trás do jogador, e o fundo do
quadro vira todo rabo por ~7s. **É o efeito pedido**, e na névoa deve funcionar. Se na medição em
resolução real ficar opressivo, **3,0 é o degrau abaixo** — mesma coreografia, mesmo `±6°`.

⚠️ **MEDIR EM RESOLUÇÃO REAL ANTES DE TRAVAR.** É a lição que o míssil descartado (`e77eebe8`)
comprou nesta mesma fatia: no tamanho do jogo ele era uma lasca de 20×18 quase vazia, coisa que
nenhuma inspeção ampliada mostrou.

---

## 2. A virada: o toco vira a costura

### O problema, em duas metades

**(a) O casco chega cedo e chega errado.** Em `t=21` o roteiro manda `nebula density 0.75` para
"insinuar" o Leviatã. Mas o alpha do casco é `1 − nebulaDim` (`Parallax.ts:1275`) — os dois estão
amarrados por dentro. Afinar a nuvem em 25% **obriga** o casco a subir a 0.25, e o que se vê é o
que o Henrique chamou de *"gradiente de transparência estranho"*: uma estrutura meio apagada
pairando 20 segundos antes de ter motivo.

**(b) A emenda é um corte.** O rabo afunda e o casco já está lá. A frase não se completa.

### O que ele pediu, nas palavras dele

> *"O movimento entra na tela e depois sai por baixo, deixando apenas o toco da cauda... Pois a
> transição de rabo para inicio do casco precisa ser suave, assim, quando a cauda abaixa para a
> parte de baixo da tela, o casco se inicia... o casco só vai aparecer quando a cauda sumir da
> tela."*

A arte do rabo é fluke à esquerda e **pedúnculo grosso à direita** — o "toco" já existe nela,
sangrando pela borda direita. Ele é o corpo do bicho. **O corpo do bicho é o casco.**

### A coreografia

```
t=37,5   os hazards zeram — o quadro esvazia (era t=40)
t=38,0   o rabo entra pela direita e desacelera         casco alpha 0
t=38–45  bate a nadadeira (assimétrica, como já está)   casco alpha 0
t=42,0   a nuvem abre: planeta e estrelas voltam        casco alpha 0   ← só o rabo no quadro
t=45,0   começa a descer
t=46,5   a nadadeira limpa o rodapé — SÓ O TOCO na quina de baixo-direita
t=46,5   ▶ o casco COMEÇA A NASCER, do toco para a esquerda
t=49,0   o casco tomou o rodapé; o toco afunda por trás dele e some
```

⚠️ **O RABO ANDA PARA TRÁS NO TEMPO: 40,5 → 38,0.** A coreografia nova precisa de ~2,5s a mais de
pista. Puxar o rabo é mais barato do que empurrar o Ato 2 inteiro — **props (`t=46`), aranha
(`t=53`), canhoneira (`t=71`) e serpente (`t=88`) ficam exatamente onde estão.**

O `hazard rate 0` anda junto (`t=40` → `t=37,5`), porque ele **não é do Ato 2: é a preparação do
rabo.** Esvaziar o quadro é o que faz a chegada pesar, e ele tem que acontecer antes dela. Fora
esses dois, nenhum evento do `STAGE_3` muda de horário.

⚠️ **A DESCIDA GANHA DUAS FASES, E O TOCO É A SEGUNDA.** Hoje é um tween só (`y: 300, x: 268`) que
leva a peça inteira embora. Agora: primeiro a nadadeira sai pelo rodapé e o sprite **para** com o
toco na quina; o casco nasce; só então o toco desce o resto. A profundidade do toco continua
`−76` (atrás da faixa do casco) — é o que faz ele afundar *por baixo* do chão novo em vez de
escorregar na frente dele.

### O conserto do acoplamento

⚠️ **SEPARAR O ALPHA DO CASCO DE `nebulaDim`.** Hoje `applyAlpha` faz `if (layer.casco) a *= 1 −
this.nebulaDim` (`Parallax.ts:1275`), e `setNebulaDensity` repete a conta à mão para a faixa da
frente (`Parallax.ts:1305`). Passa a existir um `cascoReveal` (0..1) próprio, dirigido
explicitamente por um método novo — e o casco e a faixa da frente seguem **ele**, não a nuvem.

Consequência desejada: `t=21` continua afinando a nuvem em 25% (é atmosfera, e o Henrique aprovou
o Ato 1 como está), **e o casco fica em 0 até o toco chamá-lo**.

⚠️ **A INSINUAÇÃO DE `t=21` DEIXA DE EXISTIR COMO REVELAÇÃO DO CASCO.** Isso contradiz de
propósito a nota da sessão de 26/08 e o pedido antigo do `HANDOFF` (*"na metade do tempo o Leviatã
começa a aparecer"*). **O teste jogado vence o documento**: a insinuação foi implementada, foi
vista, e foi reprovada. Registrar a reversão no `HANDOFF` faz parte do trabalho.

---

## 3. Os respiradouros

### O problema, com a conta

`rate` **é intervalo em segundos**, não taxa (`GameScene.ts:681` — `this.propTimer = this.propRate`).

Hoje: `rate: 1.6` com mistura `['respiradouro','lancaMisseis','respiradouro','respiradouro']`.
Um prop a cada 1,6s, 75% respiradouro → **um respiradouro a cada ~2,1s**. As janelas de prop do
Ato 2 somam ~27s (`t=46→54` e `t=63→82`), o que dá **~12,7 respiradouros na fase**.

Uma baleia tem *um* espiráculo. Doze lê como tileset, não como anatomia — é exatamente a quebra
que o Henrique sentiu: *"não podem aparecer em sequencia e muitas vezes, eles têm que se bemmm
espaçados, aparecer poucas vezes."*

### A mudança, e por que ela não mexe no balanceamento

| | antes | depois |
|---|---|---|
| intervalo (`rate`) | 1,6s | **3,2s** |
| mistura | 3 respiradouro : 1 lança | **1 : 1** |
| **lança-mísseis no ato** | **~4,2** | **~4,2** ← intocado |
| respiradouros no ato | ~12,7 | **~2,8** (ver abaixo) |

⚠️ **A CADÊNCIA CAI PELA METADE E A MISTURA DOBRA A FAVOR DO LANÇA — OS DOIS SE CANCELAM
EXATAMENTE NA CONTA DE QUEM ATIRA.** `27 / 1,6 × 0,25 = 4,2` e `27 / 3,2 × 0,50 = 4,2`. O volume
de tiro do Ato 2 está congelado até o playtest por decisão do Henrique, e continua congelado.

### O trinco do espaçamento

⚠️ **SORTEIO NÃO GARANTE ESPAÇAMENTO.** `GetRandom` é uniforme (`GameScene.ts:682`) e pode dar dois
respiradouros seguidos por acaso — o pedido "não em sequência" não sobrevive a um dado. É a mesma
lição já anotada para o `pickVariant`: *proporção que importa vem da GEOMETRIA, não do sorteio.*

Então: **o respiradouro ganha uma carência de 5s, contada a partir do último respiradouro que
NASCEU** (não do último slot, nem do último prop de qualquer tipo). Um sorteio que caia dentro
dela vira **vaga vazia** — nenhum prop nasce naquele slot. Casco liso é precisamente o que "bem
espaçado" significa.

O relógio da carência **zera junto com a fase** e não atravessa o respiro do meio do ato (`t=54`
→ `t=63`, onde `rate` é 0): nove segundos de silêncio já são mais que a carência inteira, então o
primeiro prop depois do respiro nunca nasce bloqueado.

⚠️ **A VAGA VAZIA NÃO PODE VIRAR LANÇA-MÍSSEIS.** Substituir manteria a densidade e dobraria os
atiradores. O slot morre; é isso que preserva a conta acima.

### A conta honesta do resultado

A carência **multiplica** com o intervalo, não soma. Com slots a cada 3,2s, sorteio 50% e carência
de 5s: o slot seguinte a um respiradouro está sempre bloqueado, e cada slot depois tem 50% de
chance. Espaçamento **mínimo 6,4s**, **médio ~9,6s** → **~2,8 respiradouros no ato**.

⚠️ **É MENOS DO QUE OS ~4,2 QUE A CONVERSA ESTIMOU DE PRIMEIRA** — aquela estimativa ignorava o
efeito da carência. ~3 espiráculos ao longo de 27s é anatomia honesta e atende "poucas vezes",
mas **é o número mais provável de precisar de ajuste no olho**. O botão é a carência: 5s → 3s
sobe para ~4; 5s → 8s desce para ~2. **Mexer na carência, nunca na mistura** — a mistura é o que
segura o balanceamento.

---

## 4. A água-viva elétrica

Objeto do Henrique: `3b886d72-e956-4c9d-a235-a46384ed6043` (PixelLab, 48×48, 8 direções, sem
animação). Água-viva azul luminosa, tentáculos longos.

**Ela cabe.** O Ato 1 é uma nuvem densa onde a visibilidade é curta de propósito; o azul aceso
dela é a única coisa que atravessaria aquela névoa. E ela resolve um buraco de ritmo: **o Ato 1 é
todo rápido** — drone (70), batedor (95), kamikaze (45 + homing), cargueiro, mais asteroide/mina/
sensor. Não há nada lento lá dentro. A água-viva é a primeira coisa que **fica**.

### O comportamento: deriva-lanterna

Novo `EnemyKind: 'aguaViva'` (camelCase, como o `PropKind: 'lancaMisseis'`).

| campo | valor | por quê |
|---|---|---|
| `speed` | 28 | 2,5× mais lenta que o drone. Atravessa a tela em ~13,7s |
| `wave` | 34 | senóide larga e lenta — deriva, não voo |
| `fireRate` | **0** | não atira. Nenhum projétil novo, nenhum volume de tiro novo |
| `homing` | **0** | não caça |
| `hp` | 10 | ver abaixo |
| `tint` | `0xffffff` | branco: a arte já é acesa, multiplicar cor por cima apagaria o desenho |
| `scale` | a medir | ver abaixo |

⚠️ **`hp 10` É DELIBERADAMENTE GORDO, E É O NÚMERO MAIS FRÁGIL DESTA SPEC.** A escala do jogo é
drone/batedor/kamikaze 2, canhoneira 6. Dez é 5× um drone. A intenção é que ela **atrapalhe e não
morra de raspão** — obstáculo vivo, não alvo. Mas é o primeiro candidato a ajuste no playtest.

⚠️ **A ESCALA SE MEDE NO TAMANHO REAL DO JOGO.** A arte é 48×48 contra os ~31×28 do kamikaze; a
1,0 ela seria a maior tropa comum do jogo. Medir e escolher, como o `_moldurar.mjs` fez com o
kamikaze e o cargueiro.

### Onde ela entra no roteiro

Duas ondas curtas, dentro da nuvem:

```
{ t:  8, type: 'wave', kind: 'aguaViva', count: 3, spacing: 1.6, y: 100 }
{ t: 19, type: 'wave', kind: 'aguaViva', count: 4, spacing: 1.4, y:  75 }
```

⚠️ **O ÚLTIMO SPAWN TEM QUE LIMPAR A TELA ANTES DE `t=38`.** A 28px/s ela leva ~13,7s para
atravessar, e o quadro **precisa estar vazio quando o rabo entra** — o vazio é o que faz a chegada
pesar, e é por isso que `t=40` (agora `t=37,5`) zera os hazards. A onda de `t=19` põe o último no
ar em `t=23,2`, que limpa em `t≈36,9`. **Não empurrar essas ondas para depois de `t=24,3`.**

As ondas caem em cima das ondas rápidas existentes (batedor em `t=9`, drone em `t=16`) de
propósito: **lento e rápido no mesmo quadro é o contraste que justifica ela existir.** Sozinha
numa janela vazia ela vira só um asteroide bonito.

### A divisão de trabalho da animação

⚠️ **QUADROS GERADOS SÓ PARA O QUE CÓDIGO NÃO FAZ.**

| o quê | onde | por quê |
|---|---|---|
| o sino contraindo, os tentáculos arrastando | **quadros PixelLab (v3)** | deformação orgânica; nenhum tween faz isso |
| o pulso elétrico (brilho subindo e descendo) | **código** | é "acende e apaga": um tween, e não tem como sair errado |

⚠️ **ESTA REGRA JÁ FOI COMPRADA NESTA MESMA FATIA.** O v3 leu *"bater para cima e para baixo"*
como **girar** e devolveu o rabo do Leviatã virando hélice — a animação inteira foi descartada.
Pedir *"pulsa com eletricidade"* devolveria uma hélice azul. **Movimento que cabe numa frase de
geometria não vai para os quadros gerados.**

Direção a animar: **`west`** (ela deriva para a esquerda, na direção do jogador). Uma direção só —
as outras sete não são usadas por um shmup de rolagem lateral.

---

## O que NÃO muda

- A pintura de fundo do Ato 1, a névoa e os véus — **aprovados jogando**
- O lança-mísseis, as 4 bocas e o míssil `d77055b6` — **aprovados jogando**
- A faixa da frente que planta os props, o piso do casco, as emendas — **aprovados jogando**
- A batida assimétrica do rabo (1,5s sobe / 0,55s desce) — **aprovada jogando**
- Qualquer número de balanceamento fora da tabela do `hp` da água-viva
- A `paintBgF2` e a `paintBgZeroG` — seguem com o erro de resolução, seguem sem decisão

---

## Verificação

A `probe-f3-visual.mjs` tem 26 asserts e **encosta em tudo o que esta spec toca** — o rabo, o
casco, os props. ⚠️ **Sonda existente que encosta na mudança se CONFERE, não se afrouxa.** Os
asserts do rabo ("é colossal", "o arco cabe na tela") vão reprovar por desenho: o critério mudou,
então **o assert muda junto, medindo o critério novo** (sangra do quadro), não afrouxa.

Asserts novos:

1. **O rabo sangra** — em `t≈39`, o sprite tem borda acima de `y=0` e abaixo de `y=216`
2. **O casco é invisível antes do toco** — em `t=30` e `t=44`, alpha do casco = 0
3. **O casco existe depois** — em `t=50`, alpha do casco = 1
4. **O toco segura** — entre `t=46,5` e `t=49` o rabo ainda está em cena, só na quina
5. **Respiradouros espaçados** — nenhum par com menos de 6,4s entre eles ao longo do Ato 2
6. **Os atiradores não mudaram** — contagem de `lancaMisseis` no ato dentro de ±1 do que é hoje
7. **A água-viva limpa a tela** — nenhuma viva em `t=38`
8. **A água-viva não atira** — `fireRate` 0, e nenhum projétil dela em cena

⚠️ **ASSERT QUE AMOSTRA UMA LINHA SÓ NÃO MEDE O QUE DIZ MEDIR** (a lição do rodapé e das emendas,
paga nesta fatia). Os asserts 5 e 6 são contagens ao longo do tempo, não uma amostra.

Regressão obrigatória: `tsc` · `npm run build` · `probe-f3-visual` · `probe-stage3` (⚠️ **sonda de
tempo real se roda uma por vez** — três browsers headless no mesmo Vite a quebram) · `probe-chain`
· `probe-cut2-visual` · `probe-doca`.

---

## Pendências que esta spec não fecha

1. **A revisão ampla da branch** — a Task 3 nunca foi revisada, nem a sessão de 26/08, nem esta.
   **Tem que acontecer antes do merge.**
2. **A decisão sobre `paintBgF2` / `paintBgZeroG`** — mesmo erro de resolução, em fases mergeadas.
3. **A luz quente entre segmentos do casco** — condicional, só se o Henrique pedir. Se pedir,
   **é tarefa própria**: medir sete artes, escolher limiares, calibrar.
