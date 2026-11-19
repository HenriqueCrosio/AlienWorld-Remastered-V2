# A NEBLINA E A CHUVA DO MENU DA NOITE — design (19/11/2026)

O pedido dele (18–19/11): uma neblina **volumétrica** que nasce dos traços vermelhos que ele riscou no print
(`docs/superpowers/folhas/2026-11-19/neblina/tracos-sobre-pintura.jpg`) e escorre no sentido das setas, deixando a
colônia "neblinosa" até as luzes âmbar refletirem no véu em círculos; e uma chuva **bem fina e delicada** noutra camada.
O motivo: esconder as bordas da pintura gerada por IA e dar causa visível ao som da tempestade de 6min16
(`amb.menu.tempestade`). Tudo POR CIMA do que já existe — a pintura, as luzes, a bruma, a tempestade e o tráfego
ficam como estão (`docs/CENARIO-VIVO.md` §0.1).

## 1. As decisões dele

- **O arco (A, com piso):** desde o primeiro quadro já há neblina — um PISO que cobre as bordas, sobretudo nos traços.
  Ela cresce com a chegada da chuva, fica densa no pico, continua pesada depois que a chuva passa (ar molhado) e, nos
  últimos ~2 min da faixa, abre devagar de volta ao piso (nunca a zero): a volta da faixa (6:16 → 0:00) não dá salto.
- **A chuva (A):** acompanha o som — nenhum pingo enquanto a chuva da faixa está longe, os primeiros por volta de 0:50,
  o mais visível em 1:00–2:10, rareando até 4:00 e sumindo. Sempre fina, mesmo no pico.
- **A técnica (A):** um shader de névoa (não quadros assados, não mais faixas deslizando).

## 2. A curva da faixa (medida em 19/11)

A mediana do chiado acima de 1,5 kHz, a cada 20 s: −55 dB até 0:40 · **−46 a −49 de 1:00 a 2:10** · −53 a −55 até
3:40 · −61 a −64 de 4:00 ao fim. Os números do arco (`NEBLINA.arco`, `CHUVA.arco`) são pontos-chave tirados daí; o
relógio é o do cenário módulo a duração da faixa (376,13 s) — o menu sempre começa do início dela.

## 3. A neblina (`src/menu/neblina.ts` + `scripts/_menu/_neblina-assar.mjs`)

Um `Phaser.GameObjects.Shader` do tamanho da tela, desenhado direto na câmera (o `setRenderToTexture` desligava as
texturas grandes da pintura: 19/11), na profundidade 2,5 (acima da cidade, das luzes e do tráfego; abaixo da bruma da
frente e do véu), sob a Atmosfera. Os mapas assados fora, em px de jogo ×2 (768×432), mais o ruído:

1. **A densidade** — os traços são EXEMPLOS (ele, 19/11: *"os traços vermelhos foram mais exemplos, mas pode se basear
   neles"*): a névoa ocupa os vales e as encostas da colônia em geral — um chão de vale que engrossa para baixo e sobe
   pelas encostas escuras —, com um reforço onde ele riscou (as polilinhas em `numerosMenu.ts`, transcritas do print);
   **19/11, ele: "em todo o frame do menu, exatamente para pegar os edificios grandes mais altos"** — o véu cobre o
   quadro inteiro: as estruturas (as torres altas também, onde a pintura mostra mais bordas) com `estruturas`, o céu com
   um véu mais leve (`ceu`), os vales e os traços por cima.
2. **O fluxo** — o campo de direções: a tangente de cada traço (o sentido da seta), interpolada pela distância, sobre
   uma deriva leve para a direita e morro abaixo.
3. **A luz** — as janelas âmbar de `dados.json` como manchas macias: onde a névoa passa por elas, o véu acende (o
   círculo de reflexo), mais forte quanto mais densa a névoa.

4. **O ruído** — `neblina-ruido.png`, 256×256, três fbm sem emenda (ladrilham). O shader AMOSTRA o ruído em vez de
   calculá-lo por pixel da tela (19/11: o calculado pesava e dava quiques).

O shader: o ruído com o domínio torcido (o rolar), levado pelo mapa de fluxo em duas fases que se cruzam devagar (22 s,
pesos em cosseno; a técnica dos mapas de fluxo da água: anda sem acumular distorção) e com o contraste renormalizado na
troca (a média de dois ruídos achata: sem isso o véu "respira" e salta a cada meia fase), em duas profundidades com escala e velocidade próprias. A
cobertura = densidade × (piso + crescimento × arco): ao crescer, ela avança a partir dos traços. A cor sai dos tons
médio-escuros da pintura (o frio da bruma de hoje); o aceso, do âmbar medido.

Na maquete foram duas versões: **lisa** (contínua) e **pontilhada** (Bayer 4×4 no pixel do jogo). A pontilhada virou um
xadrez pesado sobre a pintura HD e saiu; **a lisa entrou**.

**APROVADA em 19/11** (ele: *"o movimento ficou fluido e natural"*, *"a densidade do pico ficou exatamente como
imaginei, quero esse aspecto denso"*), com o trovão de §6; no projeto no mesmo dia (`src/menu/neblina.ts`, `chuva.ts`,
`tempoDaTempestade.ts`, os mapas em `public/sprites/menu/neblina/`, o teste `scripts/test-menu-neblina.mjs`).

## 4. A chuva (`src/menu/chuva.ts`)

Traços de 1 px da camada (¼ de px de jogo) de um pingo assado (`menu-pingo`), em dois planos: o de longe (profundidade
2,06, curto, lento, apagado) e o de perto (2,65, mais longo). Cada pingo é função do relógio (um sorteio fixo por
pingo: coluna, velocidade, fase), inclinado no sentido do vento da neblina. A quantidade acesa segue `CHUVA.arco`. O
brilho de cada pingo lê o mapa de luz (perto de uma janela ele pega o âmbar) e o clarão dos relâmpagos (`perigo` passa
a expor o brilho do instante): fora da luz, quase invisível — como a chuva de verdade à noite.

## 5. O que não muda / os limites

- No modo sem WebGL a neblina não monta (fica a bruma de hoje); a chuva monta.
- Movimento reduzido: sem chuva; a neblina anda na metade da velocidade.
- O amanhecer não ganha nada disso.
- Nenhum som novo: a chuva e a neblina são a imagem do som que já toca.

## 6. O ajuste do trovão (o mesmo pedido, 19/11)

O relâmpago COM raio visível: o trovão passa de 0–120 ms para **900–1150 ms** depois do clarão (`TROVAO.perto` em
`src/som/regrasAmbiente.ts`) — o raio ainda está longe. Os sem raio continuam em 1300–2400 ms.

## 7. O método

Cópia do projeto na porta 5174 (ele testa na 5173); maquete no jogo, filmada a passos, numa folha com vídeo das duas
versões em quatro instantes do arco (0:05 piso, 1:20 pico com chuva, 3:30 pesada sem chuva, 5:50 abrindo). Ele julga;
depois os arquivos voltam ao projeto num reload só.
