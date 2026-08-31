# START — Fatia 5: FASE 3 ("O CASCO")

**🟢 O CONTEÚDO DA FATIA ESTÁ FECHADO E APROVADO JOGANDO.** Branch `feat/fase3-visual`,
**não mergeada**. `main` continua em `ee4e2a0` (a Fatia 4).

O Henrique jogou a fase **cinco vezes** (27, 28, 29 e 30/08). Na última rodada ele aprovou tudo
que estava aberto. O que sobrou não é arte da Fase 3: é **uma animação nova da serpente final**,
**um veredicto pendente da Fase 1**, e o **fechamento da branch**.

---

## 🔑 COMO RETOMAR (frase de arranque)

> **"Leia `docs/superpowers/plans/2026-08-25-fase3-visual-START.md`. A Fatia 5 está com o
> conteúdo aprovado na branch `feat/fase3-visual`. Duas coisas antes do merge. A primeira: a
> serpente da FUSÃO (a gigante que vem depois da de 3 cabeças) tem arte nova no PixelLab
> — objeto `eab6dbf3-3c51-403d-a70e-c167458a83b7` — e eu quero mais uma animação nela. Me
> pergunte QUAL antes de gerar, e me diga se a arte nova entra no lugar da fusão azul que está
> no jogo hoje. A segunda: eu ainda não joguei a Fase 1 depois de você devolver a cadeia de
> montanhas do meio — preciso te dar esse veredicto. Depois disso é a revisão ampla da branch e
> o merge. Sobe o `npm run dev`."**

⚠️ **A ORDEM É: ANALISAR → DISCUTIR → PERGUNTAR → EXECUTAR.** É diretriz explícita dele, dada
depois de a coreografia do rabo falhar quatro vezes. **Desenhe a cena em palavras e espere a
confirmação antes de escrever a primeira linha.** Não converta a frase dele em geometria cedo:
foi assim que quatro rodadas se perderam.

⚠️ **NÃO re-despache as tarefas antigas.** Estão commitadas (28 commits desde `ee4e2a0`).

---

## 🔴 O QUE FALTA — nesta ordem

### 1. A ANIMAÇÃO NOVA DA SERPENTE DA FUSÃO — pergunte antes de gerar

Ele mandou o objeto do PixelLab: **`eab6dbf3-3c51-403d-a70e-c167458a83b7`**
(*"colossal armored alien serpent"*, 1 direção, 256×256, grupo `b7188518-…`).

**O que já foi apurado nesta sessão** (não re-descubra):

- É a **forma da FUSÃO** — o `serpenteFusao` do jogo, a última das quatro formas
  (base 3 cabeças → 2c → 1c → **fusão**). Confirmado comparando a silhueta com
  `public/sprites/serpente-fusao.png`: mesma criatura, mesma pose enrolada, cabeça de crânio.
- **A arte do objeto é MAIS ESCURA e mais blindada que a que está no jogo** (a do jogo é
  azul/ciano). ⚠️ **Pergunte se a arte nova entra no lugar da atual** — ele disse *"a serpente
  gigante tem nova arte e animação"*, e não ficou claro se isso já foi instalado ou se é o que
  ele quer instalar.
- O objeto já tem **duas** animações, e as duas são **o mesmo gesto**: virar/inclinar a cabeça
  para oeste (9 quadros cada). Então a animação nova precisa ser outra coisa.
- **A hipótese mais forte, e é para PERGUNTAR, não escolher:** o ciclo de fúria da fusão
  (`BossSerpente`, `case 3`) tem quatro passos — `leque` de 7 → `rajada` de 4 →
  **`comecarInvestida`** → silêncio. A **investida é um bote**, e hoje ela avança tocando o
  mesmo loop parado (`serpente-fusao-fury`). É o único verbo da luta sem gesto próprio.
- Alternativas a pôr na mesa: a MORTE (o colapso final), o DANO (o recuo ao levar tiro).

⚠️ **`animate_object` com `mode: 'v3'`** (o padrão) — o `pro` custa 20–40 gerações por direção e
o v3 costuma sair melhor. Objeto de 1 direção: **não passe `directions`**.

⚠️ **MOVIMENTO QUE CABE NUMA FRASE DE GEOMETRIA NÃO VAI PARA OS QUADROS GERADOS.** O v3 já leu
*"bater para cima e para baixo"* como **girar** e devolveu o rabo como hélice, nesta mesma fatia.
Se o gesto for descritível como uma rotação em torno de um ponto, ele vive melhor em tween.

⚠️ **O `install-anim.mjs` grava `<nome>-{i}.png`**; a convenção do `BootScene` é
`<coisa>-anim-{i}`. E as animações da serpente estão registradas em `BootScene` como
`serpenteFusaoAnim` (9 quadros, `frameRate` 10).

### 2. O VEREDICTO DA FASE 1 — ele ainda não jogou

A **cadeia de montanhas do meio voltou** (commit `048f8a6`), depois de ele topar com a falta dela
jogando por acaso. Voltou **pela metade e de propósito**: as duas `mtnMid` (enterradas em
`GROUND_Y + 2` e `+ 4`) mais a haze entre elas; a `mtnFar` continua fora, porque a base dela
nascia VISÍVEL em `GROUND_Y − 4` e era a única que podia causar o deslize do solo.

⚠️ **PERGUNTE SE A ALTURA FICOU CERTA.** Os `scale` são os originais, mas ele nunca as viu junto
com o fundo pintado atual — elas ocupam o terço de baixo e podem estar mais dominantes do que ele
lembra. Se estiverem, o botão é o `scale` das duas camadas em `Parallax.buildSurface()`.

Também não comentado: a **munição própria da torre da Fase 1** (`shotTorre`, um traçante frio),
que substituiu o foguete que ela dividia com o lança-mísseis do casco.

### 3. A REVISÃO AMPLA DA BRANCH — nunca aconteceu, em nenhuma das cinco rodadas

**Tem que vir antes do merge.** É a última coisa antes do fechamento.

### 4. O MERGE (`--no-ff`, mensagem por arquivo) e os documentos.

---

## ✅ O QUE ESTÁ APROVADO — não reabra

| | veredicto dele |
|---|---|
| O rabo que é puxado para a direita + o escurecimento | *"agora ficou interessante"* / *"dá a entender que o jogador chegou no casco, isso é o importante"* |
| Os respiradouros, depois do plantio em profundidade | *"estão ok"* |
| Os projéteis novos da aranha e da serpente | *"estão bons"* |
| A faixa de casco de 66px | *"está boa, para esse estágio da fase ficou perfeito"* |
| O casco novo, a métrica das zonas, o choque da água-viva | aprovados no 4º teste |
| As pinturas da Fase 2 e do Zero-G em 384×216 | pedido dele, entregue |

---

## ⛔ O QUE JÁ FOI CONSTRUÍDO, VISTO E REJEITADO — não reimplemente

- ⚠️ **A "insinuação" do casco em t=21.** Pedida pelo HANDOFF desde a Fatia 0, implementada,
  jogada e reprovada.
- ⚠️ **O MERGULHO do rabo** (gira −38°, desce, apaga o alpha). Duas versões, duas reprovações:
  *"efeito de desprender"*.
- ⚠️ **O TOCO que fica e o casco que nasce dele.** Sobreviveu a duas rodadas, morreu na terceira.
- ⚠️ **A TRAVESSIA para a ESQUERDA.** *"Como se o rabo tivesse se partido."* O corpo do bicho
  está fora do quadro à DIREITA — sair pela esquerda é o rabo se afastando do próprio corpo.
- ⚠️ **O FADE de 1500ms do casco.** Substituído pelo escurecimento, que dissolve o problema
  inteiro: atrás do preto não existe "meio transparente".
- ⚠️ **"Colossal tem teto".** Sair do quadro deixou de ser defeito e virou o objetivo.

---

## A CENA DA VIRADA, como ela é hoje (t=38 → 49)

```
38,0 → 40,5   a nadadeira entra pela direita e DESACELERA até parar (easeOut)
40,5 → 45,8   HOLD na quina inferior direita. Só a ponta bate (±6° no pedúnculo)
45,8 → 47,6   SAÍDA: x 374 → 740, easeIn. Uma linha só — sem y, sem angle, sem alpha
47,6 → 47,95  a tela ESCURECE (retângulo preto, depth 90 — abaixo do banner/HUD)
47,95         no escuro: revealCasco(1, 60) + banner "O CASCO DO LEVIATÃ"
48,0          os props entram sobre um casco JÁ SÓLIDO (âncora do STAGE_3, não mexer)
48,37 → 48,72 a tela CLAREIA e o chão já está lá
```

Os dois únicos números ajustáveis: **1800ms** da saída e **420ms** de preto cheio. O resto é conta
para trás a partir do `t=48` dos props.

---

## O que testar, e como

`npm run dev` (porta 5173). No menu: **`M`** Fase 3 · **`N`** treino da serpente · **`V`** Fase 2 ·
**`B`** treino da Fase 1.

| t | O quê |
|---|---|
| 0–37s | Ato 1 dentro da nuvem — águas-vivas em t=8 e t=16, com CHOQUE |
| 38–49s | **A VIRADA** (tabela acima) |
| 53s | A aranha — zona da CAUDA. **Munição de cobre** |
| 63–78s | zona do MEIO: a caixa torácica |
| 84s+ | zona da PROA: dutos e maquinário |
| 88s | A serpente — base → 2c → 1c → **fusão**. **Gota de veneno** |

---

## Sondas e réguas

- `probe-f3-visual.mjs` — a fatia inteira. Cobre a água-viva, o casco invisível no Ato 1, o rabo
  (bate, arco curto, deitado na quina, **puxado para a DIREITA**, pose congelada, sem fade), o
  **escurecimento** (preto cheio, casco em 1 atrás dele, nome legível sobre o preto, retângulo
  DESTRUÍDO no fim), o **plantio** dos props, e a **munição da aranha**.
- `probe-stage3.mjs` — **o portão**: a fase de ponta a ponta, as 4 formas da serpente, o hangar,
  e o **cuspe da serpente**.
- `_f3/probe-canhao.mjs` — **prende a nave em 4 posições** e cobra que todo lança-mísseis atire e
  que nenhum míssil seja comido pelo próprio canhão.
- `probe-chain.mjs` · `probe-stage1-visual.mjs` · `probe-stage2.mjs` — as outras fases.

**Réguas e olhos** (`scripts/`):
- `_medir-paleta.mjs` — a cor MODAL de uma arte. **Use antes de discutir cor.**
- `_medir-rabo.mjs` · `instalar-casco.mjs` · `casco-frente.mjs` · `paint-bg.mjs`
- `_f3/ver-emenda.mjs [de] [até] [passo]` — a transição quadro a quadro.
- `_f3/ver-plantio.mjs` — A/B dos três plantios de prop, cena congelada.
- `_f3/ver-tiros.mjs` — os projéteis dos chefes em voo, ampliados.
- `_f3/ver-toco.mjs` · `_f3/ver-choque.mjs` · `_f3/diag-emenda.mjs`
- `_f3/diag-canhao.mjs` · `_f3/diag-missil.mjs` — a janela de tiro e a vida de cada míssil.

⚠️ **TRÊS ASSERTS SÃO BARULHENTOS. RODE DE NOVO ANTES DE CONCLUIR — E NUNCA AFROUXE.**
- **O rodapé** (0,065–0,50 entre execuções, limiar 0,055).
- **A contagem de lança-mísseis** (varia de 2 a 6; esperado ~4,2).
- **O risco de emenda na faixa** — reprova ~1 em 4. Medido no código de `HEAD` sem o plantio: o
  ruído já existia, não veio das sombras novas.

⚠️ **SONDA DE TEMPO REAL SE RODA UMA POR VEZ.** Três browsers headless no mesmo Vite quebram.

---

## Regras que não se redescobrem

Todas as lições desta fatia estão em `docs/HANDOFF.md`, na seção **"O 4º E O 5º TESTES JOGADOS"**.
As quatro que mais custaram:

1. **Um assert só protege a decisão que ele codifica** — e pode ficar VERDE em cima do defeito.
2. **Captura parada não julga movimento**, e apresentá-la como confirmação é pior que não ter.
3. **Conserto em código compartilhado não atravessa a fronteira de uma fase fechada** sem alguém
   rejogar aquela fase.
4. **Remoção em bloco leva inocente junto** — cinco camadas removidas por uma justificativa que
   só valia para uma delas.

---

**A próxima fatia depois desta é a 6 — Cutscene 3 (o hangar do Leviatã).**
