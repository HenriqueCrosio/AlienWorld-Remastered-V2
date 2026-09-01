# START — Fatia 5: FASE 3 ("O CASCO") — ✅ FECHADA, SEM PENDÊNCIAS

**🟢 A FATIA ESTÁ MERGEADA EM `main` (`a28dd07`, `--no-ff`), COM PUSH.** Fechada em 2026-08-31.

O Henrique jogou a fase **cinco vezes** (27, 28, 29 e 30/08) e julgou os 5 pontos que tinham
entrado sem ele ver (31/08). A revisão ampla aconteceu e achou dois defeitos, os dois
consertados antes do merge. **O histórico completo, os veredictos e as lições estão em
`docs/HANDOFF.md`, na seção "A FATIA 5 — a Fase 3, FECHADA E MERGEADA".**

---

## ✅ A FATIA 5 ESTÁ 100% FECHADA

Nada em aberto. O último item — **a fusão da serpente** — fechou em 2026-09-01 (`4848820`) e foi
aprovado por ele vendo a cena: *"ficou muito bom"*. Spec em
`docs/superpowers/specs/2026-09-01-fusao-serpente-design.md`; as lições estão em `docs/HANDOFF.md`,
seção "A FUSÃO DA SERPENTE".

⚠️ **A seção "O QUE FALTA" abaixo está OBSOLETA e ficou como histórico** — o item 1 dela dizia
que as duas animações do objeto eram "o mesmo gesto inútil, virar a cabeça para oeste".
**Oeste é para a NAVE**: num sidescroller o jogador está à esquerda, e era a animação certa o
tempo todo.

---

## ➡️ A PRÓXIMA COISA É A FATIA 6 — Cutscene 3 (a queda no hangar do Leviatã)

Ela **não tem spec nem plano**: começa pelo BRAINSTORMING.

> **Frase de arranque:** *"Vamos abrir a Fatia 6 do passe visual — a Cutscene 3, a queda no
> hangar do Leviatã. Começa pelo brainstorming. Sobe o `npm run dev`."*

---

## 🔑 AS REGRAS DE PROCESSO DESTA FATIA (continuam valendo)

⚠️ **A ORDEM É: ANALISAR → DISCUTIR → PERGUNTAR → EXECUTAR.** É diretriz explícita dele, dada
depois de a coreografia do rabo falhar quatro vezes. **Desenhe a cena em palavras e espere a
confirmação antes de escrever a primeira linha.** Não converta a frase dele em geometria cedo:
foi assim que quatro rodadas se perderam.

⚠️ **NÃO re-despache as tarefas antigas.** A fatia inteira está mergeada em `main` (`a28dd07`).

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

### 2, 3 e 4 — ✅ FECHADAS EM 2026-08-31

- **O veredicto da Fase 1** veio: *"a cadeia de montanhas ficou boa"*, e ele ofereceu melhorar a
  arte — o que foi feito (três cristas novas geradas como conjunto, `66898a2`). A altura que ele
  aprovou foi preservada: o que aparece na tela é a **caixa opaca × escala**, e a média das três
  foi de 84,0px para 83,3px. A munição própria da torre também foi julgada: *"está simples, mas
  está melhor que compartilhar a mesma da torre do casco"*.
- **A revisão ampla** aconteceu: zero Critical, dois achados consertados antes do merge
  (`8d95fd2`) — o tween órfão do glow da água-viva e um comentário que errava a conta do depth.
- **O merge** está feito (`a28dd07`, `--no-ff`) e com push.

⚠️ **E ELE ACHOU UM DEFEITO NOVO JOGANDO:** a fase aérea do chefão da Fase 1 atirava o **mesmo
míssil do canhão do casco**. Consertado em `66898a2` (arte própria, `missilColonia`) — foi a
QUARTA vez na campanha que duas coisas diferentes dividiam um projétil só.

Tudo isso está detalhado em `docs/HANDOFF.md`, seção "O FECHAMENTO (2026-08-31)".

---

## ✅ O QUE ESTÁ APROVADO — não reabra

| | veredicto dele |
|---|---|
| O rabo que é puxado para a direita + o escurecimento | *"agora ficou interessante"* / *"dá a entender que o jogador chegou no casco, isso é o importante"* |
| Os respiradouros, depois do plantio em profundidade | *"estão ok"* |
| Os projéteis novos da aranha e da serpente | *"estão bons"* |
| A faixa de casco de 66px | *"está boa, para esse estágio da fase ficou perfeito"* |
| O casco novo, a métrica das zonas, o choque da água-viva | aprovados no 4º teste |
| A pintura da **Fase 2** em 384×216 | ✅ mantida |
| A pintura do **Zero-G** em 384×216 | 🔴 **REPROVADA e REVERTIDA** para 480×270 em `y=−27` (`bc19bf9`) — a conta da resolução estava certa, mas sem original de alta resolução a redução custava DETALHE |

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

- `_f3/probe-tween-agua-viva.mjs` — **NOVA (31/08)**: conta os tweens tocando contra as
  águas-vivas VIVAS. É a guarda do tween órfão do glow — sem ela o vazamento volta calado.
- `_f1/probe-missil-colonia.mjs` — **NOVA (31/08)**: o chefão da Fase 1 atira a arte DELE, e a
  caixa continua 16×7 em px de MUNDO apesar de a escala da arte ter caído de 0,9 para 0,6.
  ⚠️ `body.width` do Arcade JÁ vem em px de mundo — não multiplique pela escala (a 1ª versão
  desta sonda fez isso e reprovou código certo).
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
- `instalar-cordilheira.mjs` — **NOVO**: instala as três cristas da F1 recortando pela caixa
  OPACA, e imprime a altura nova contra a antiga (é ela que diz se o `scale` precisa mexer).
- `_folha-contato.mjs <object-id> <n> <zoom> <saída>` — **NOVO**: monta a grade ampliada de um
  pacote de review do PixelLab. Escolher candidato na miniatura é adivinhar.
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
