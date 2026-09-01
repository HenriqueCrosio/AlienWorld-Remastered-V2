# SPEC — Fatia 6: CUTSCENE 3, o hangar do Leviatã (2026-09-01)

A sexta fatia do passe visual. A cutscene **já existe e funciona** desde 2026-07-19 (`[P]` no
menu): a nave cambaleia, cai, quica, derrapa, a saída sela atrás dela e o painel de naves abre com
o róster completo. **Esta fatia não constrói a cena — ela dá a ela um lugar.**

---

## O DIAGNÓSTICO (capturado, não suposto)

`scripts/_cut3/ver-cena.mjs` fotografa a cena inteira em 16 quadros. O que ela mostra:

⚠️ **A PAREDE É UM AZULEJO DE 160px REPETIDO.** Dá para contar o mesmo arco/janela/pilar quatro
vezes atravessando a tela. É a classe de defeito que os props do casco já custaram uma rodada
(*"ainda estão com sensação de colados"* → eram uma fila de adesivos), agora numa parede inteira.

⚠️ **NÃO HÁ SEGUNDO PLANO.** A parede é um plano só, o convés é outro. Um hangar dentro de uma
criatura de quilômetros lê como corredor plano.

⚠️ **A FAIXA DE BAIXO REPETE IGUAL** — a mesma fileira de engradados com luz vermelha, quatro
vezes.

⚠️ **AS CARCAÇAS DA FROTA ENGOLIDA SÓ EXISTEM EM COMENTÁRIO.** O `HANDOFF` promete desde julho que
*"o hangar guarda carcaças da frota engolida — a Frota Morta da F2, vista por dentro"*, e que o
painel existe porque *"você não compra uma nave, você SALVA uma nave irmã do cemitério"*. No convés
há três borrões cinzas genéricos.

**O que funciona e NÃO se toca:** a coreografia da queda (cambalear → cair → quicar → derrapar com
fagulhas), o `selarBoca()` fechando só a metade esquerda (o lugar sobrevive, a ENTRADA morre), e o
`ShipPanel` com o `ROSTER_FINAL`.

---

## AS DECISÕES

1. **A arte de fundo é uma PINTURA DO HENRIQUE**, como em todas as fatias anteriores. Ele já a
   fez: visceral e biomecânica, *"para passar esse ar de interior, sendo que a fase 4 já é no
   interior do Leviatã"*.
2. **As janelas continuam mostrando o EXTERIOR** (a nebulosa), e ganham a nadadeira (abaixo).
3. **Três peças de PixelLab:** as carcaças, o portão que sela, e a nadadeira peitoral.
4. **A pintura NÃO substitui o `hangar.png`.** Ver a fronteira abaixo.

---

## ⚠️ A FRONTEIRA QUE ESTA FATIA NÃO ATRAVESSA

**A pintura entra como um asset NOVO (`paintBgCut3` / `paint-bg-cut3.png`). O `hangar.png` fica
INTOCADO.**

O `hangar.png` não pertence só à cutscene: o `Parallax` em modo `interior` o usa como a **parede de
fundo da Fase 4**. Trocar aquele arquivo faria esta fatia mudar a Fase 4 sem ninguém pedir — e a
Fase 4 é a **Fatia 7**, não esta.

É a mesma regra que o cooldown dos canhões já custou nesta campanha, escrita como lei do projeto:
**conserto (ou arte) em código compartilhado não atravessa a fronteira de uma fase fechada sem
alguém rejogar aquela fase.**

---

## A PINTURA

⚠️ **O ORIGINAL EM ALTA TEM QUE SER GUARDADO, e isso não é zelo — é a lição mais recente da
campanha.** A pintura da Fase 2 foi refeita do original de 1672×941 e ficou ótima em 384×216; a do
Zero-G não tinha original guardado, a redução saiu do próprio 480×270, e o Henrique **reprovou** —
um passo de reamostragem a mais em cima de arte já pequena custa DETALHE.

```
assets/raw/paint-bg-cut3-original.png      ← o arquivo dele, resolução original, versionado
public/sprites/paint-bg-cut3.png           ← 384×216, gerado por scripts/paint-bg.mjs
```

**A pintura já resolve três coisas de graça:**

- **As cinco janelas já vêm MARCADAS** (duas à esquerda, o óvalo central, duas à direita).

  ⚠️ **MAS MARCADAS NÃO É VAZADAS, E ISSO SE MEDIU.** O PNG chegou com **3 canais, sem alpha**: o
  xadrez das janelas está PINTADO como pixels cinza opacos. É exatamente a armadilha que os
  instaladores do projeto já documentam (lições 16–17: *"o gerador DESENHA o xadrez de
  transparência dentro do PNG"*) — desta vez vinda da exportação, não do gerador.

  **O key é limpo, com uma ressalva medida:**

  | região | luminância | saturação | bate como "cinza de xadrez" |
  |---|---|---|---|
  | janelas | 73 | 0,8 | **100%** |
  | convés | 44 | 13,2 | 0% |
  | faixa de perigo | 24 | 22,5 | 0% |
  | banda de baixo | 5 | 1,5 | 0% |
  | parede / vísceras | 25 | 5,0 | ⚠️ **20,5%** |

  O convés e a faixa estão a salvo — a saturação deles denuncia. Mas **20% da parede cai na mesma
  faixa neutra**, então um key global por cor abriria buracos nas vísceras.

  ⚠️ **A SOLUÇÃO É PREENCHIMENTO A PARTIR DE SEMENTES, NÃO LIMIAR MAIS APERTADO.** Uma semente
  dentro de cada uma das cinco janelas, alastrando só por pixels que casam: pixel de parede que
  por acaso casa não está CONECTADO a janela nenhuma e não vaza. Apertar o limiar até a parede
  sobreviver quebraria a borda das janelas — e borda de janela é onde a nadadeira vai aparecer.
- **O convés já está pintado**, com a faixa de perigo amarela e preta.
- **A repetição morre**: é um quadro largo e assimétrico, não um azulejo.

⚠️ **O CONVÉS PASSA A SER MEDIDO NA PINTURA.** Hoje o `DECK_ROW = 138` e a cor do piso são números
do `hangar.png` (medidos com `find-pad.mjs`), e o piso é um retângulo desenhado por trás. Com a
pintura entregando o convés, os dois têm que ser **re-medidos contra ela** — a linha onde a nave
toca, quica e para. Medir, nunca herdar: é a lição 13 do projeto, e ela acabou de cobrar de novo na
serpente (o offset da boca da arte antiga apontava para o lugar errado da nova).

---

## A NADADEIRA PEITORAL — a ideia do Henrique, e a peça mais forte da fatia

> *"Quero adicionar um efeito… que é a barbatana peitoral ou lateral. Ela vai passar lentamente
> entre as janelas, mostrando que o Leviatã bate suas nadadeiras no seu nadar espacial."*

**Por que ela é forte:** membro colossal atravessando o quadro é a frase mais eficaz que esta
campanha tem — foi o rabo que fez a virada do casco funcionar depois de quatro tentativas
reprovadas. E aqui ela diz, sem banner nenhum: *você está DENTRO de uma coisa viva que está
nadando.*

**Como ela funciona, e por que sai quase de graça:** a nadadeira vive numa profundidade **entre a
nebulosa e a pintura**. Como as janelas são as únicas aberturas da pintura, ela **só aparece por
elas** — o quadro da janela a recorta sozinho. Nenhuma máscara, nenhum shader, e o recorte é
exatamente o que vende que ela está do lado de fora.

**O gesto, escolhido por ele:** **uma remada só, atravessando.** Ela entra por uma borda, varre a
faixa das janelas e sai pela outra. Não é loop.

**A direção: DIREITA → ESQUERDA**, e ela foi derivada e CONFIRMADA em vez de assumida. A Fase 3 já
cravou que o corpo do Leviatã fica fora do quadro à direita e que ele *"nada no mesmo sentido da
nave"*; num bicho que nada para a direita, a **remada de força varre para trás**.

⚠️ **O MOVIMENTO É TWEEN, NUNCA ANIMAÇÃO GERADA.** O v3 do PixelLab leu *"bater para cima e para
baixo"* como **girar** e devolveu o rabo como hélice, nesta mesma campanha. O que se gera é a
NADADEIRA (textura); o bater é código.

⚠️ **E ELA É UMA LINHA SÓ: O `x`.** Sem `y`, sem `angle`, sem `alpha`. Cada eixo extra que entrou
nas tentativas do rabo foi lido como o corpo se deformando ou se soltando. Se o gesto precisar de
vida, ela vem de uma batida SUAVE na ponta (o mesmo pedúnculo do rabo), nunca do corpo inteiro.

---

## AS CARCAÇAS DA FROTA ENGOLIDA

3 ou 4 destroços de nave no convés, **meio digeridos**, com a carne do Leviatã já crescendo por
cima. Silhuetas da **Frota Morta da Fase 2** (canhoneira, cargueiro, batedor) para o jogador
reconhecer o que está vendo.

Elas entregam quatro coisas de uma vez: o segundo plano que a pintura não tem, a narrativa que hoje
só existe em comentário, o **sentido do painel de naves** (você escolhe entre irmãs porque as irmãs
mortas estão ali), e silhueta conhecida.

⚠️ **O PLANTIO USA A RÉGUA QUE A FASE 3 ACABOU DE PAGAR** (`TerrainSystem.PLANTIO` /
`sortearPlantio`): pé sorteado dentro de uma faixa, **salto mínimo garantido por construção** entre
vizinhos (recusa, nunca distribuição — sorteio uniforme dá dois iguais em seguida e a fila volta),
sombra de contato elíptica ancorando a base, e profundidade acompanhando o plantio para quem está
à frente desenhar por cima.

⚠️ **ELAS SÃO CENÁRIO, NÃO OBSTÁCULO.** Sem corpo físico, sem colisão. A nave derrapa até `x=258`,
que é um vão escolhido a dedo na revisão de 2026-07-19 justamente para ela não parar dentro do
monte de metal e sumir. **O plantio das carcaças não pode reocupar esse vão** — é o mesmo defeito
que aquela revisão já consertou uma vez.

---

## O PORTÃO QUE SELA A SAÍDA

Hoje o `selarBoca()` mura a metade esquerda com entulho escuro genérico, de baixo para cima, na
frente das janelas. Vira uma **comporta de carne e metal** — um esfíncter blindado que FECHA.

É a 1ª cutscene da campanha em que a ponte queimada é a **saída**, e o beat merece uma peça em vez
de um monte de pedra. O entulho pode continuar caindo em volta dela; o que muda é ter uma FORMA
fechando.

---

## O QUE É GERADO E O QUE É CÓDIGO

| | |
|---|---|
| **Pintura (Henrique)** | o hangar inteiro: paredes, janelas vazadas, convés, faixa de baixo |
| **PixelLab** | as carcaças · o portão · a nadadeira |
| **Código** | a remada (tween), o plantio, a sombra de contato, o parallax pelas janelas, a queda |

A divisão segue a regra que a fatia anterior fechou: **o que cabe numa frase de geometria vive em
tween; textura é o que código não faz.**

---

## VERIFICAÇÃO

Sonda nova `_cut3/probe-cut3-visual.mjs`, mais a `probe-interlude3.mjs` que já existe:

- a pintura está na tela em **384×216 em `y=0`** (1px de arte = 1px de jogo)
- o `hangar.png` **NÃO** foi tocado: a Fase 4 abre com a mesma parede de antes (regressão explícita)
- a nadadeira **atravessa da direita para a esquerda** (`x2 < x1`, medido em dois instantes), sem
  mexer em `y`, `angle` nem `alpha` — o assert que o rabo ensinou a escrever
- a nadadeira está **atrás da pintura**: depth entre a nebulosa e ela
- as carcaças **não estão todas no mesmo `y`**, nenhum vizinho repete altura, cada uma tem sombra
- **nenhuma carcaça no vão de parada da nave** (`x≈258`)
- o portão fecha a metade esquerda e a cicatriz **permanece** no fim da cena
- a nave ainda toca, quica e para onde tocava antes (a queda não regrediu)

⚠️ **E A REVISÃO COM O OLHO, que nesta cena já pegou o que sonda nenhuma pegou** (2026-07-19: a
nave parava dentro do monte de carcaças e sumia no metal cinza; a fumaça era tímida; o colapso não
deixava cicatriz). Tira de quadros ao longo da cena inteira, e o veredicto final é dele, jogando.

---

## RISCOS

⚠️ **O BLOQUEIO ATUAL: a pintura ainda não está no repositório.** Ela veio como anexo da conversa,
e não há como gravar um anexo em disco. O Henrique salva em
`assets/raw/paint-bg-cut3-original.png`, na resolução ORIGINAL, e a fatia destrava.

⚠️ **TRÊS LOTES DE GERAÇÃO NUMA FATIA SÓ** (carcaças, portão, nadadeira) — cada um com sua rodada
de seleção. Se o saldo ou o tempo apertarem, a ordem de corte é: o **portão** primeiro (o entulho
atual funciona), as **carcaças** depois. **A nadadeira não se corta** — é ela que carrega a ideia
da cena.

⚠️ **A NADADEIRA PODE NÃO CABER NAS JANELAS.** Se ela for fina demais, passa despercebida; se for
grande demais, vira uma mancha atravessando. A largura se resolve MEDINDO a faixa das janelas na
pintura instalada, e o primeiro corte se julga com a tira de quadros — nunca com uma captura
parada, que não julga movimento.
