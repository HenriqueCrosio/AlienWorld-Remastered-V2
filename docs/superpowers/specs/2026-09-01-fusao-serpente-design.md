# SPEC — A FUSÃO DA SERPENTE, repensada (2026-09-01) — ✅ IMPLEMENTADA

**Pedido do Henrique**, com liberdade total de execução:

> *"A lógica da batalha é que a serpente de 3 cabeças vai perdendo as cabeças e, quando a última
> é derrotada, a serpente gigante que é +- uma junção das três, surge. Mas hoje em dia, o modelo
> mais claro olha para a direção da tela e não para a nave. O novo modelo tem a animação que ela
> abre a boca enquanto olha para a nave, assim conseguimos fazer com que os projéteis e skills
> saiam de um lugar próprio, a boca. Quero que a transição da fusão seja repensada, algo mais
> explosivo misturado com bio mecânico."*

---

## O QUE A ANÁLISE APUROU (não re-descubra)

**A arte nova é a correção do que ele descreveu.** Comparadas lado a lado:

| | `serpente-fusao.png` (no jogo hoje) | objeto `eab6dbf3-…` (o novo) |
|---|---|---|
| valor | **CLARA** — azul/roxo, crânio ciano aceso | escura, blindada, banda laranja de energia |
| direção | encara a **CÂMERA** | crânio virado para **OESTE** = a nave |
| cânone | fora (a regra é casco escuro, luz só onde há energia) | dentro |

⚠️ **"OESTE" É "PARA A NAVE", e foi por não ter feito essa ligação que a sessão anterior
registrou as duas animações do objeto como "o mesmo gesto inútil".** Num sidescroller o jogador
está à ESQUERDA. Uma cabeça virada para oeste está encarando o jogador. A anotação antiga
("as duas são o mesmo gesto: virar a cabeça para oeste — então a nova precisa ser outra coisa")
media o gesto sem perguntar para onde ele apontava.

**A animação escolhida** é o grupo `2a9d7dc1` (9 quadros): *"arches its body and pivots its
skull-shaped head toward the west… the jaw remains slightly agape… metallic coils tighten"*.
Conferido quadro a quadro: a mandíbula fica **aberta o tempo todo**. Não é um evento de abrir a
boca — é um **loop de fúria encarando o jogador, com uma boca que existe como posição real.**
Serve como idle E como boca de tiro.

**A transição de hoje não é uma fusão.** 1500ms de 10 estouros ALEATÓRIOS varrendo o corpo
(raio 70 em volta do centro), troca de textura, e flash **rosa**. Lê como dano — e o rosa é
literalmente a cor de dano do jogo (`cameras.main.flash(300, 255, 120, 160)`).

**O material da fusão já está na luta e ninguém usou:** as três cabeças têm COR (ciano `#48e8f0`,
verde `#60f088`, laranja) e os `cotos` guardam onde cada uma morreu. A fusão fica literal se a
matéria das três voltar para dentro — sem inventar vocabulário novo.

---

## AS DECISÕES

1. **A arte nova SUBSTITUI a fusão azul.** Confirmado por ele.
2. **A boca muda de ONDE ela atira, não O QUE ela atira.** Escolha dele. O ciclo de fúria
   (`leque` de 7 → `rajada` de 4 → `investida` → silêncio) fica intacto; só o ponto de origem
   dos projéteis passa a ser a boca. **Mexe em origem, não em peso — a fase segue balanceada.**
3. **A transição dura ~2,5s.** Escolha dele entre 1,6s / 2,5s / 3,5s.
4. **Nenhum quadro intermediário de metamorfose é gerado.** O escurecimento no meio da cena
   resolve: atrás do preto não existe estado "meio transformado" — a mesma lição que matou o
   fade de 1500ms do casco nesta mesma fatia.

---

## A CENA, beat a beat

```
t=0,00   O ÚLTIMO CRÂNIO CAI
         A ondulação PARA. O corpo cede alguns px. NENHUM estouro.
         ~250ms de silêncio — o mesmo silêncio que já é o 4º passo do
         ciclo de fúria, então o vocabulário já existe na luta.

t=0,25   AS TRÊS CICATRIZES ACENDEM
         Cada `coto` acende na cor da cabeça que morreu ali (ciano,
         verde) mais a posição da laranja recém-morta. Contido, pequeno.

t=0,60   A CONVERGÊNCIA — o biomecânico
         Três fios de luz rastejam dos três pontos até um NÚCLEO no
         centro do corpo. Arcos elétricos (`Fx.estalo`) saltam entre as
         voltas, acelerando. O corpo APERTA: escala 0,55 → 0,50.
         O núcleo (arte gerada) nasce em 0 e cresce conforme os fios
         chegam; o tint do sprite caminha para a cor de quem já chegou.

t=1,50   A IMPLOSÃO
         Tudo colapsa no núcleo (`Fx.implodeBig`). A tela ESCURECE.
         Câmera parada. Um instante de quase-silêncio.

t=1,75   A DETONAÇÃO
         BRANCO, não rosa — rosa é dano, branco é nascimento.
         Anel de choque + tremor pesado. Atrás do branco a arte troca.

t=2,10   O SURGIMENTO
         O branco cai. Ela está lá, maior (escala 0,63) e escura, já com
         a cabeça virada para a nave e a boca aberta. Segura ~400ms
         antes de voltar a lutar.
```

**Os números ajustáveis** são dois: os **250ms de silêncio** da abertura e os **400ms de hold**
do surgimento. O resto é conta para trás a partir do total.

---

## O QUE É ARTE GERADA E O QUE É CÓDIGO

⚠️ **A DIVISÃO SEGUE A LIÇÃO QUE ESTA FATIA JÁ PAGOU: movimento que cabe numa frase de geometria
não vai para os quadros gerados.** O v3 do PixelLab leu *"bater para cima e para baixo"* como
**girar** e devolveu o rabo do Leviatã como hélice. Explosão que expande, anel que cresce, fio que
percorre um caminho — tudo isso é transformação geométrica e vive melhor em tween.

**Gerado (PixelLab):**
- A **arte + a animação da fusão** — instalar o objeto `eab6dbf3-…`, animação `2a9d7dc1`
  (9 quadros), por cima de `serpente-fusao.png` e `serpente-fusao-anim-{0..8}.png`.
  A chave `serpente-fusao-fury` e o registro do `BootScene` **não mudam**.
- O **NÚCLEO DA FUSÃO** — um nó de placas blindadas apertado em volta de um centro branco-quente.
  É a única coisa da cena que é TEXTURA e não movimento.

  ⚠️ **CORREÇÃO DA SPEC, feita na hora de escolher entre os 16 candidatos:** este parágrafo pedia
  o núcleo com **três costuras vazando ciano/verde/laranja**. Errado por dois motivos. Três cores
  em 52px viram lama; e, narrativamente, o núcleo é justamente **onde as três viram UMA** — três
  entram, uma sai. O escolhido é uma casca escura rachada com o miolo quente vazando por UMA cor
  só. As três cores vivem nos FIOS, que são código.

**Código (`Fx` e `BossSerpente`):**
- Os três fios (tweens de posição ao longo das espirais)
- Os arcos elétricos — `Fx.estalo`, que já existe (veio da água-viva)
- A implosão — `Fx.implodeBig`, que já existe
- O anel de choque — já existe dentro de `Fx.choque`
- O escurecimento, o branco, o tremor — câmera e um retângulo, como no casco

---

## O QUE PRECISA SER MEDIDO, NUNCA CHUTADO

⚠️ **Lição 13 do projeto: offset de arte se mede** (`scripts/find-cabecas.mjs`).

1. **A BOCA.** O ponto de onde os projéteis passam a nascer. Medir na arte nova instalada, como
   as cabeças das outras fases foram medidas. O valor atual de `FASES[3].cabeca`
   (`-30.8, -68.0`) é da arte ANTIGA e quase certamente não serve.
2. **A CABEÇA (alvo).** O `cabeca` da fase também é onde o jogador precisa acertar — a hitbox do
   alvo acompanha esse offset. Se a boca e o alvo não coincidirem na arte nova, são dois números
   diferentes e o código precisa saber disso.
3. **A PALETA**, antes de discutir cor: `_medir-paleta.mjs`. A arte nova é escura e a antiga era
   azul clara — qualquer tint herdado da anterior tem que ser reavaliado, não copiado.
4. **A ESCALA.** A arte nova é 256×256 contra 248×251 da antiga. `FASES[3].escala` é 0,63 e existe
   para a fusão ser ~15% maior que as outras formas. Conferir se o 0,63 ainda entrega isso, e
   ajustar pela caixa OPACA, não pelo quadro — a lição das cristas da Fase 1.

---

## RISCOS

⚠️ **A TRANSIÇÃO É UMA JANELA SEM JOGO.** 2,5s parado é caro num shmup. O boss já fica `imune`
durante a transição hoje (1,5s), então o custo cresce 1s. Mitigação: é um beat ÚNICO, no clímax
do chefão final da fase. Se ficar arrastado no teste jogado, o botão são os dois números
ajustáveis — nunca cortar a convergência, que é a parte que faz a cena ler como fusão.

⚠️ **OS PROJÉTEIS EM VOO DURANTE A TRANSIÇÃO.** A `die()` já limpa os tiros dela ao morrer, mas a
transição NÃO limpa. Um leque disparado antes do colapso continua voando durante a cena inteira e
pode matar o jogador enquanto ele assiste. Decidir explicitamente: ou limpar no início do
colapso, ou deixar (é justo — foram disparados com o jogo rodando). **Recomendação: limpar**, pela
mesma regra da Capitânia que a `die()` já aplica.

⚠️ **A ANIMAÇÃO NOVA PODE NÃO CASAR COM A ONDULAÇÃO.** A animação gerada já arqueia o corpo. Se a
ondulação em código somar por cima, o bicho balança duas vezes. Conferir em jogo e, se somar,
reduzir a `ONDULACAO` só na fase da fusão.

⚠️ **CAPTURA PARADA NÃO JULGA MOVIMENTO.** A cena é 2,5s de movimento. A verificação tem que ser
uma sonda que lê ESTADO ao longo do tempo (o que a `probe-f3-visual` já faz com o rabo), e o
veredicto final é dele, jogando. Uma tira de quadros não prova que a cena funciona.

---

## VERIFICAÇÃO

Sonda nova, `_f3/probe-fusao.mjs`, cobrindo o que a cena promete:

- a transição para a fusão dura ~2,5s e o boss fica IMUNE a ela inteira
- no início existe uma janela SEM estouro (o silêncio) — hoje o primeiro estouro sai em t=0
- o núcleo aparece, cresce e é DESTRUÍDO no fim (não deixado em alpha 0, a armadilha do
  retângulo preto do casco)
- a tela escurece e depois clareia, e o retângulo é destruído
- ao fim, a textura é a nova, a escala é 0,63, e a animação tocando é `serpente-fusao-fury`
- os projéteis dela em voo foram limpos no colapso
- **e a boca:** o projétil da fusão nasce no offset MEDIDO da boca, não no centro do sprite
