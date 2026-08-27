# START — Fatia 5: FASE 3 ("O CASCO")

**🟡 FATIA EM ANDAMENTO.** Branch `feat/fase3-visual` @ `d5faadc`, **não mergeada**. `main`
continua em `ee4e2a0` (a Fatia 4).

O Henrique jogou a fase **duas vezes** em 27/08 e deu veredicto por parte nas duas. A segunda
rodada de ajustes está entregue e **não foi jogada**.

---

## 🔑 COMO RETOMAR (frase de arranque)

> **"Leia `docs/superpowers/plans/2026-08-25-fase3-visual-START.md`. A Fatia 5 está em andamento
> na branch `feat/fase3-visual`. Duas mudanças esperam o meu teste: a água-viva atravessando na
> vertical e o casco esfriado para o canon. E tem uma coisa PARADA esperando por mim — o
> alinhamento do toco com o casco, que precisa da imagem com as minhas linhas vermelhas. Sobe o
> `npm run dev`, eu entro com `[M]`."**

⚠️ **NÃO comece pelo fechamento** (revisão ampla, documentos, merge). Fechar antes do teste humano
é fechar sobre arte que ainda muda — esta fatia já reabriu duas vezes por isso.

⚠️ **NÃO re-despache as tarefas antigas.** Estão commitadas (19 commits desde `ee4e2a0`).

---

## 🔴 O QUE ESTÁ BLOQUEADO — leia antes de propor qualquer coisa

### 1. O alinhamento do toco com o casco — FALTA UMA IMAGEM

O Henrique pediu, no segundo teste: *"o rabo fica quebrado por causa do final do desenho e depois
já entra o casco... precisamos fazer um casco com a mesma cor do rabo. E alinha o rabo para que o
toco fique ajustado ao começo do casco. Veja na segunda imagem em anexo que fiz as linhas
vermelhas que podem 'casar' com o casco."*

**A COR foi resolvida** (ver abaixo). **O ALINHAMENTO não**: a segunda imagem, com as linhas
vermelhas, **nunca chegou na sessão** — só o screenshot do jogo veio.

⚠️ **NÃO CHUTE ONDE AS LINHAS PASSAM. PEÇA A IMAGEM.** O que a captura mostra é que a cor casou
mas a FORMA não: o rabo termina numa aresta diagonal dura e o casco é uma faixa horizontal. São o
mesmo material agora, em geometrias que não se encontram. Onde exatamente o toco deve encostar é
informação que só está no desenho dele. Esta fatia já perdeu uma rodada por implementar um giro
com o sinal invertido que o assert aprovou — adivinhar geometria aqui sai caro.

Captura do problema: `scripts/_f3/emenda-zoom.png` (a emenda ampliada, depois do casco esfriado).

### 2. Os respiradouros: "falta algo" — nunca respondido

O Henrique disse: *"os respiradouros preciso ver o que vamos fazer, acho que eles são legais, mas
ainda acho que falta algo neles."* A pergunta sobre O QUE falta ficou sem resposta.

⚠️ **MAS A MEDIÇÃO DE COR DEU UMA HIPÓTESE NOVA, E ELA É BOA.** O respiradouro sempre foi `#24323b`
— **exatamente a cor canônica** — pousado num casco `#423f38`, quente. Ele era uma peça fria num
chão quente: nunca pertenceu ao material. **O casco esfriou depois desse comentário.** Antes de
propor sopro, luz ou reação, **peça para ele rejogar e dizer se o "falta algo" mudou de tamanho.**

As hipóteses levantadas, se ele quiser escolher: (a) falta **respirarem** — um sopro de vapor em
pulso; (b) falta **luz** dentro; (c) falta **reagir** ao jogador; (d) falta **variedade de
tamanho**.

---

## O que testar, e como

`npm run dev` (porta 5173). No menu: **`M`** entra direto na Fase 3, `N` é o treino da serpente.

| t | O quê |
|---|---|
| 0–37s | Ato 1 dentro da nuvem — **as águas-vivas ATRAVESSAM em t=8 e t=16** |
| 21s | A nuvem afina 25%… e o casco **não** aparece |
| 37,5s | Os hazards param — o quadro esvazia |
| **38s** | **O RABO** entra pela direita, colossal, sangrando do quadro |
| 42s | A nuvem abre; o casco continua invisível |
| **46,5s** | A nadadeira sai pelo rodapé. Só o TOCO fica — e o casco nasce dele |
| 48s | O casco sólido, agora **frio** |
| 48,5s | Banner `O CASCO DO LEVIATÃ` |
| 53s / 88s | A aranha / a serpente |

---

## As DUAS mudanças que esperam o seu olho

### 1. A água-viva atravessa (era deriva horizontal)

Reprovado no 2º teste: *"não gostei do movimento delas e da orientação... quero que elas subam ou
desçam e SAIAM da tela também, como se estivessem de passagem."*

Agora ela **cruza a rota do jogador**: entra por baixo e sobe, ou entra **de ponta-cabeça** por
cima e desce, e some pela borda oposta. ~7,8s no quadro (264px a 34px/s) — tempo para atirar ou
desviar, que era o pedido.

- **O ritmo está bom?** `speed` (34) é a travessia e `wave` (26) é a gingada lateral.
- **A deriva lateral (−16px/s) é suficiente?** Ela existe para a subida não virar trilho.
- **`hp 10` continua sendo o número mais frágil** (5× um drone). Se virar pedágio, é o `hp` que
  desce — não a velocidade.

### 2. O casco esfriou para o canon

O casco era **a única peça quente da fase inteira**:

| | realce | R−B |
|---|---|---|
| modelo original (`assets/raw/ref-leviata-armored.png`) | `#24323b` | −23 |
| rabo | `#24323b` | −23 |
| respiradouro | `#24323b` | −23 |
| lança-mísseis | `#3c445c` | −32 |
| **casco** | `#423f38` | **+10** ← o único |

Tint `0x84c0ff` (calculado, não escolhido a olho) entrega `#222f38` — o canônico a menos de 3 por
canal. A faixa da frente foi junto, no mesmo frio a 75% de brilho.

- **A cor casou com o rabo?** É a pergunta.
- **O casco ficou escuro demais?** O tint só escurece, e ele derrubou a luminância ~28%.
- **Costuras escuras**, por decisão sua — a luz quente das juntas é licença do rabo, onde há
  articulação viva. Casco é blindagem morta.

---

## Regras que não se redescobrem (custaram sessão)

### O que os DOIS testes jogados derrubaram

⚠️ **A "insinuação" do casco em t=21 foi REVERTIDA.** O `HANDOFF` pedia desde a Fatia 0 (*"na
metade do tempo o Leviatã começa a aparecer"*), a sessão de 26/08 implementou, e o Henrique
reprovou jogando. **Ela não foi esquecida: foi construída, vista e rejeitada.** Não reimplemente.

⚠️ **"Colossal tem teto" também morreu.** Sair do quadro deixou de ser defeito e virou o objetivo.

### Medição

⚠️ **MEÇA A PALETA ANTES DE DISCUTIR COR.** O relato era "o rabo e o casco têm cores diferentes";
a medição mostrou que o casco era o único quente contra o rabo, os props E o modelo original — e
que os props já estavam no tom canônico exato. A conversa mudou de "qual dos dois cede" para "há
uma peça fora do canon". **Tint multiplicativo só escurece**, então normalize pelo canal maior.

⚠️ **MEDIR NO TAMANHO REAL DO JOGO.** O míssil descartado (`e77eebe8`) só se entregou assim.

### Sondas

⚠️ **ASSERT DE MOVIMENTO QUE NÃO OLHA A DIREÇÃO NÃO MEDE MOVIMENTO.** Duas vezes nesta fatia: o
mergulho saiu com o sinal invertido (`+38`) mandando a nadadeira pelo TOPO, e `angulo > 20` passou
verde; e a água-viva era medida por `vx > -40`, que é verdadeiro até num bicho parado. **Quem
reprovou o primeiro foi a captura de tela.** Toda sonda visual desta fatia tira foto por isso.

⚠️ **ASSERT QUE AMOSTRA UMA LINHA SÓ NÃO MEDE O QUE DIZ MEDIR.** E o gêmeo: **contar sprites vivos
não conta nascimentos** — props reciclam, então a sonda dos respiradouros envelopa `terrain.spawn`.

⚠️ **SONDA EXISTENTE QUE ENCOSTA NA MUDANÇA SE CONFERE, NÃO SE AFROUXA.** Nesta fatia dois asserts
mudaram de critério (o do casco e o do "colossal") e um mudou de HORA (o do Ato 2 amostrava em
t=47, no meio da revelação, e reprovava um casco correto mas inacabado). Nenhum afrouxou.

⚠️ **SONDA DE TEMPO REAL SE RODA UMA POR VEZ.** Três browsers headless no mesmo Vite quebram a
`probe-stage3`.

### Código

⚠️ **O CULLING DO RÓSTER SÓ OLHA A BORDA ESQUERDA.** Nada no jogo saía por cima ou por baixo até a
água-viva. Quem atravessa na vertical precisa do culling próprio, senão vive para sempre fora da
tela — contado por toda sonda e todo overlap.

⚠️ **UM EIXO É FÍSICA, O OUTRO É ESCRITO À MÃO — E ELES NÃO PODEM SE MISTURAR.** A senóide escreve
a posição, e escrever posição todo frame apaga a velocidade daquele eixo. No róster, física no x e
senóide no y; na travessia vertical, o espelho exato.

### Arte gerada

⚠️ **MOVIMENTO QUE CABE NUMA FRASE DE GEOMETRIA NÃO VAI PARA OS QUADROS GERADOS.** O v3 leu *"bater
para cima e para baixo"* como **girar** e devolveu o rabo como hélice. Na água-viva a divisão foi
feita a tempo (quadros para o sino deformando, código para o pulso) e ela voltou certa de primeira.

⚠️ **GLOW INTERNO, NUNCA EXTERNO, em sprite recortado justo.** O halo externo vaza da quad e é
ceifado nela: vira um retângulo aceso em volta do bicho.

⚠️ **O `install-anim.mjs` grava `<nome>-{i}.png`.** A convenção do `BootScene` é `<coisa>-anim-{i}`
— chame o script com o nome já terminado em `-anim`, ou os quadros existem e a animação nunca toca.

⚠️ **NÃO GERE ARTE A PARTIR DA COISA EM QUE ELA SE APOIA** (a lição da doca, repetida no
lança-mísseis: 16 candidatas voltaram sendo a baleia com um canhão nas costas).

⚠️ **PARA TRAVAR O ÂNGULO, RECORTE O ÂNGULO DA PRÓPRIA REF.**

### As regras das sessões anteriores, ainda válidas

- ⚠️ **A/B visual sem congelar a cena não é A/B** (`scene.pause()` + `cameras.main.resetFX()`; e
  depois do pause busque a cena por chave, `getScene('Game')`).
- ⚠️ **Empate de profundidade renderiza certo por acidente.** Toda profundidade nova precisa ser
  distinta e comentada.
- **O `pickVariant` sorteia UNIFORME.** Proporção que importa vem da GEOMETRIA, não dele — e
  ESPAÇAMENTO, muito menos: quem garante é a carência no spawn.
- ⚠️ **O `paint-bg.mjs` sempre esteve certo; ele vinha sendo CHAMADO errado.** Um script correto
  invocado errado é mais difícil de achar do que um script errado.

---

## Sondas e réguas

`probe-f3-visual.mjs` — **38 asserts**, tudo verde. Cobre a pintura em resolução real, a água-viva
(existe, pulsa, atravessa na vertical, quem desce vem de ponta-cabeça, limpa a tela antes do
rabo), o casco INVISÍVEL no Ato 1 com a nuvem afinando mesmo assim, o rabo (bate, arco curto, se
segura na direita, colossal, sangra do quadro, sem corpo físico), o TOCO (gira para BAIXO, depth
−76, o casco nascendo dele), o casco inteiro no Ato 2, o rodapé, as emendas, e os respiradouros
(poucos, espaçados, sem mexer nos atiradores).

`probe-stage3.mjs` — **o portão**: a fase de ponta a ponta, as 4 formas da serpente, o hangar.

`scripts/_medir-rabo.mjs` — a régua do rabo: perfil da arte por coluna, o que cada escala faz na
tela, e quanto cada ângulo de mergulho derruba a nadadeira. ⚠️ **O ângulo do mergulho é NEGATIVO
no código**; a tabela mostra só o tamanho do giro.

Regressão desta sessão: `tsc` limpo · `npm run build` limpo · `probe-f3-visual` 38/38 ·
`probe-stage3` verde · `probe-chain` verde · `probe-cut2-visual` verde · `probe-doca` verde.

⚠️ **O assert do rodapé é BARULHENTO** (0,065–0,50 entre execuções, contra um limiar de 0,055).
Ele amostra pixel num instante da fase, e o instante varia. Não afrouxe o limiar: se ele reprovar,
rode de novo antes de concluir qualquer coisa. Vale trocá-lo por uma média de várias amostras
quando alguém encostar nele.

---

## O que falta

1. 🔴 **O ALINHAMENTO DO TOCO** — bloqueado na imagem com as linhas vermelhas. Peça.
2. 🔴 **OS RESPIRADOUROS** — bloqueado na resposta dele, e vale rejogar antes com o casco frio.
3. **Os outros ajustes que saírem do teste.**
4. **A decisão sobre a `paintBgF2` / `paintBgZeroG`** (o mesmo erro de resolução, em fases
   mergeadas e revisadas). Uma linha por pintura: `node scripts/paint-bg.mjs <origem> <destino>
   384 216`, mais o `y` no `Parallax`.
5. ⚠️ **A REVISÃO AMPLA DA BRANCH** — a Task 3 nunca foi revisada, nem a sessão de 26/08, nem
   nenhuma das duas rodadas de 27/08. **Tem que acontecer antes do merge.**
6. **Os documentos e o merge** (`--no-ff`, mensagem por arquivo).

**A próxima fatia depois desta é a 6 — Cutscene 3 (o hangar do Leviatã).**
