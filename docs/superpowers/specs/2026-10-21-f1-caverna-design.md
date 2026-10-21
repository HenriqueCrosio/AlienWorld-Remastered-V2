# F1 · a passagem pela caverna — design

> 21/10/2026. A ideia é dele ("acrescentar uma passagem da F1 por uma caverna… colocar mais emoção na fase 1"), as quatro
> imagens são dele, e cada decisão abaixo foi tomada com ele na conversa, sobre a maquete
> `folhas/2026-10-21/caverna/index.html` (`scripts/_g/_caverna-maquete.mjs`, `_caverna-portal-maquete.mjs`).
> **Revisto no mesmo dia (a FAIXA DE ROCHA, §3):** ele viu a rodada 1 e recusou toda transição que abre a montanha — o
> desfazer e as três testadas depois (`folhas/…/caverna/transicoes.html`: cortina, olhos no escuro, íris): "sem a
> parede sumir ou pular… sem esmaecer, corte". A faixa passou primeiro ATRÁS da nave (`folhas/…/faixa.html`); ele
> aprovou o ponto ("passagem livre") e pôs a Parede dele NA FRENTE da nave, sólida, com a nave pela aura, cobrindo a
> tela inteira por um instante (o print com o "Aqui" e o "obs.") → **a rocha da frente** (`folhas/…/frente.html`).

## 1. O que é

Um trecho NOVO da F1, de ~16 s, que **soma** tempo à fase ("ela não vai ocupar um local já existente"): a rocha da
montanha passa na frente da nave e esconde a troca, a nave atravessa o SALÃO da caverna, e outra rocha devolve o lado
de fora.

## 2. As imagens dele (1768×890 cada, no quadro da pintura; reduzidas a 429×216 como todas)

| imagem | o céu | o papel |
|---|---|---|
| `Parede de Caverna Vulcânica Sombria.png` | xadrez pintado | a **FAIXA DE ROCHA**: a montanha com a boca à esquerda, o lado direito recortado pela boca espelhada |
| `Caverna Subterrânea de Luzes Misteriosas.png` | — (opaca) | o **FUNDO** do salão |
| `Teto de Caverna Sombrio com Estalactites.png` | xadrez pintado | o **TETO** do salão |
| `Moldura de Caverna com Brilho de Brasas.png` | xadrez pintado | o **CHÃO** do salão (a parte aberta dela) |

O xadrez é recortado por script (`scripts/_g/_xadrez.mjs`: a inundação só por pixels NEUTROS — uma brasa nunca vira
céu), a borda descontaminada.

## 3. A sequência — a rocha da frente (as escolhas dele)

```
fora )██████████( salão ……… 12 s ……… salão )██████████( fora
     NA FRENTE da nave, 2,5× o mundo        a mesma, espelhada
```

- **A FAIXA** é o portal dele como está — a boca à esquerda (medida por inundação a partir da borda esquerda; por ela se
  vê o lado de fora) e a borda ")" (14 px de rocha ao longo da boca, a arte dele) — com o lado direito **recortado pela
  boca espelhada**: a borda "(" e, depois dela, o salão. Só a borda "(" e 4 px vêm do espelho (uma costura de menor erro
  que acompanha o contorno); a rocha do meio é a dele, sem espelhar (um meio espelhado vira uma "borboleta" simétrica),
  estendida com pedaços da rocha pura dele costurados.
- **Ela passa NA FRENTE da nave** (acima do primeiro plano do chão), **sólida**, **2,5× mais rápida que o mundo** — uma
  camada perto da câmera: a nave fica ~2 s atrás dela. A nave aparece pela **AURA**: a rocha continua pintada POR CIMA
  da nave, só mais transparente em volta dela — 50% até 2 px da silhueta (cada quadro do jato), 75% num anel de mais
  3 px, dois degraus sem degradê; o resto fica sólido ("isso esconde a transição e fica com uma cara mais
  profissional"). ⚠️ A primeira versão era um BURACO na rocha (100% transparente): ele viu que a nave parecia passar NA
  FRENTE — "o jogador precisa entender que ele está passando por trás da rocha".
- **Ela cobre a tela INTEIRA por um instante** (o "obs." dele): o lado de fora sai pela esquerda antes de o salão entrar
  pela direita — nunca os dois juntos. Por isso ~380 px de rocha na linha do meio (a faixa tem 709 px).
- **A troca de cena** fica no MEIO da rocha (o contorno é simétrico: a mesma coluna em toda linha). Nada abre, some,
  pula ou esmaece.
- **O SALÃO** tem **12 s** à vista ("mantenha os 12 s dentro da caverna"): o fundo, o teto e o chão.
- **A SAÍDA** é a mesma rocha espelhada: o salão sai pela esquerda antes de o lado de fora entrar pela direita.
- ⚠️ **Nenhum inimigo na tela quando a rocha cobre** (ficaria escondido, atirando): as ondas perto dela foram mudadas de
  hora (§6) e a sonda confere quadro a quadro.

Descartadas: a parede inteira como corte (B), a garganta escura (A), o arco, a janela, a parede escura (na maquete); o
desfazer da rodada 1 e o buraco da saída; a cortina de rocha, os olhos no escuro e a íris (o teste das transições).

## 4. Onde o fundo do salão aparece (a máscara)

O fundo, o teto e o chão do salão têm uma **GeometryMask** (um Graphics escondido, redesenhado a cada quadro): o salão
vai do meio da rocha da entrada ao meio da rocha da saída (retas — escondidas atrás da rocha). A mesma máscara,
invertida, esconde no salão as camadas do exterior que ficam NA FRENTE do fundo: o entulho da frente e o primeiro plano.
As duas rochas têm uma **BitmapMask invertida** da aura (uma imagem fora da lista de exibição que copia a nave): a
rocha fica a (1 − alfa da aura), então o alfa parcial da textura da aura é a transparência parcial da rocha.

## 5. As profundidades

| camada | depth |
|---|---|
| o exterior (pintura, Vale, Paisagem, aglomerados, névoa rasteira) | −94,6 … −84 (como hoje) |
| o fundo do salão (mascarado) | −83 |
| os obstáculos da caverna e as estruturas do exterior | −0,5 … −0,52 (como hoje) |
| o teto e o chão do salão (mascarados) | −0,3 (na frente dos obstáculos: escondem a base deles) |
| o entulho da frente do exterior (máscara inversa) | −0,2 (como hoje) |
| a nave e os inimigos | 0 … 1 |
| o primeiro plano do exterior (máscara inversa) | 60 |
| **as duas rochas** (na frente de tudo, abaixo do HUD) | 61 |

## 6. O corredor perigoso — só no salão

- **O teto e o chão machucam** pela mesma lei da borda da F4 (`Moldura.morde`): uma MEDIÇÃO, sem corpo físico, contra o
  contorno de baixo do teto e o de cima do chão na coluna da nave (os contornos medidos nas faixas, que andam com o
  mundo); tocar = `damageShip`. **Só no salão À VISTA** (ele): atrás da rocha nada morde.
- **SEM obstáculos no salão** (ele, 21/10: "as bordas (cima e baixo) já dão dano. E os obstáculos que você adicionou
  estão flutuando. Pode retirá-los"). A rodada 2 plantou 6 rochas (estalactites e pontas de chão, a rocha da F1 sem a
  borda escura, base escondida atrás do teto/chão, vão ≥ 56) — no jogo elas liam soltas na frente da pintura, e o perigo
  do salão já é o teto e o chão. Tudo saiu (código, arte, números); a folha `folhas/…/caverna/rochas.html` fica como
  registro. A sonda confere que nenhuma peça do terreno aparece no salão.
- **Os inimigos:** só drones, em três ondas pequenas (44,5, 46,5 e 48,5 s — o drone leva ~6,5 s para atravessar, e a
  última tem que sair antes da rocha da saída). Antes da caverna, a canhoneira foi dos 35 para os 31,5 s e os batedores
  dos 39 para os 36 s (atravessariam a tela atrás da rocha da entrada). As estruturas do exterior param de nascer aos 37 s.

## 6b. O salão vivo (ele: "aplique os efeitos de iluminação, brumas, névoa etc no cenário interior")

O cenário vivo (`docs/CENARIO-VIVO.md`) sobre as três pinturas do salão, preso à máscara dele, função do relógio e do
mundo (`src/f1/salaoVivo.ts`, números em `SALAO_F1`, luzes medidas por `scripts/_g/_luzes-caverna-f1.mjs`):

- **As brasas** do fundo, do teto e do chão tiradas da pintura por difusão (a regra do menu) e tremulando por terços,
  como as do chão de fora (`brasaApagada`).
- **A bruma** em três faixas de velocidades diferentes: sobre o salão, na névoa pintada do chão, e NA FRENTE do chão.
- **Os fachos frios** descendo da ABERTURA (medida: o 1% mais claro dos pixels frios da metade de cima — a água e a
  névoa clara de baixo também são frias), no ângulo do facho pintado, respirando; o **halo frio** da abertura.
- **Os halos âmbar** respirando nas seis brasas mais fortes (medidas).
- **A poeira**: grãos de 1 px descendo devagar dentro do facho, acendendo e apagando.
- Por cima, a **Atmosfera** com o perfil de caverna (§7).

## 7. O tempo

- A caverna entra aos **40 s** (a rocha nasce na borda direita). Com a nave em x 70 (o mundo a ~83 px/s, a rocha a
  ~207): a nave fica atrás da rocha de ~42,2 a ~44,2 s (a tela inteira coberta ~43,2), o salão à vista de ~44,2 a
  ~56,2 s, atrás da rocha da saída até ~58,2 s, e a rocha da saída deixa a tela ~59,2 s.
- Tudo no `STAGE_1` depois dela anda **+16 s** (`CAVERNA_F1.empurra`): o exterior volta a plantar aos 57 s, logo depois de
  o lado de fora reaparecer à direita da rocha da saída (o `test-f1-caverna` confere); o fogo cruzado aos 63, o silêncio
  aos 79, o chefão aos **84 s**. ⚠️ A **mesa de cartas do meio** (`MESA_NO_TEMPO` em `CartasEmJogo`) anda junto
  (63 + 16 = 79, o silêncio) — na rodada 1 ela tinha ficado nos 63 e caía no meio do fogo cruzado.
- **O relógio da invasão PAUSA** de troca a troca (~14 s): o horizonte recebe `elapsed − tempoNaCaverna`. ⚠️ Ele não
  pode pausar os 16 s inteiros: fora da caverna as naves e os traçantes da pintura congelariam À VISTA.
- **O tratamento de imagem** troca para o perfil de caverna quando a troca da entrada passa pela nave e volta na da
  saída (`pinturaNaTela`); a troca de tom leva 1,5 s — escondida atrás da rocha.

## 8. Onde mora

- `src/f1/cavernaF1.ts`: as duas rochas, a aura, o salão, a máscara, os contornos, a `morde`, o estado pela nave; os
  números em `numerosF1.ts` (`CAVERNA_F1`), a geometria em `ritmosF1.ts` (`posicoesCaverna`, `regiaoCaverna`,
  `salaoVisivel`, `derivaCaverna`). O `Parallax` recebe a nave inteira (`setNave(ship)`), não só o x/y.
- `scripts/_g/_caverna-f1.mjs`: o recorte, a faixa (a boca, a borda espelhada, a costura), o teto e o chão sem emenda,
  o `caverna.json`.
- O `StageDirector` tem o evento `caverna`; o `GameScene` liga a mordida, a pausa do relógio e o tom.
- Testes: `scripts/test-f1-caverna.mjs` (a geometria e o tempo), `scripts/_g/_probe-caverna-f1.mjs` (no jogo).

## 9. As rodadas

1. **O portal e o corredor no jogo** (o desfazer, o buraco da saída). Filmado; ele recusou a abertura.
   1b. **A faixa de rocha** atrás da nave: a passagem sem transição nenhuma. Filmado; ele aprovou o ponto.
   1c. **A rocha da frente**: a faixa na frente da nave, com a aura (a rocha semitransparente por cima), cobrindo a
   tela. Filmado; ele aprovou ("perfeito").
   1d. **O salão vivo** (§6b): as brasas, a bruma, os fachos, os halos e a poeira. Filmado.
2. **O perigo:** as estalactites e as pontas de rocha (`folhas/…/caverna/rochas.html`) — RECUSADAS e retiradas (§6):
   as bordas já mordem e as rochas liam flutuando.
3. Ele joga.

Commit só quando ele pedir, só no nome dele, sem os vídeos.
