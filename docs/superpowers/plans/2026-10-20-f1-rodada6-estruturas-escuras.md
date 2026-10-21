# F1 · Rodada 6 — as estruturas refeitas no escuro (conceitos; a instalação espera a escolha dele)

> 20/10. Folha: `folhas/2026-10-20/f1-cenario/rodada6.html`. Nada instalado, nada commitado.

## As decisões dele

- O retorno à rodada 3: "as gerações estão muito claras, nem parece um dark sci-fi… o meu dark sci-fi é mais puxado pra
  obscuro"; e tudo no chão parecia colado (o chão foi resolvido na rodada 5).
- O desenho (20/10): **misturar** — as cúpulas habitacionais da colônia (a cena final) na base, com torres e pináculos
  góticos (as pinturas dele) crescendo delas.

## O que foi feito

1. **O gerador** `scripts/_g/_gerar-pecas-escuras-f1.mjs` (PixelLab `/generate-image-v2`): o ESTILO é o recorte da
   cidadela da pintura dele (`pintura.png` 108×90 a partir de (258, 36)) com TODAS as opções de estilo (paleta, contorno =
   nenhum, detalhe, sombra); as cúpulas da cena final ficam só como referência de FORMA nas peças de cúpula. O prompt
   pede o escuro da pintura e nenhum contorno. ~85 gerações (módulo, bunker, tanque, antena, torre, pilar e destroço com
   uma semente cada; a cúpula grande com duas).
2. **A medição** `scripts/_g/_medir-pecas.mjs`: o brilho do casco (mediana/p90, sem a luz âmbar e o magenta) e quanto da
   borda é contorno preto. Rodada 3: contorno 83–94%; agora 1–11%.
3. **O tom** `scripts/_g/_tonalizar-pecas.mjs` (a curva da cadência do chão): por padrão SÓ ESCURECE, até mediana 30 /
   p90 56; os obstáculos (pilar, destroço) vão a 26/50 podendo clarear. O teste no jogo: no tom da pintura (18) as peças
   afundavam no chão e deixavam de ler como alvo; cruas (42) saltavam um degrau.
4. **A plantação no jogo de verdade** `scripts/_g/_plantar-pecas-f1.mjs`: a F1 pausada, inimigos e props escondidos,
   cada candidata carregada como textura e posta como o jogo põe um prop (origem no pé, pé na faixa de plantio,
   profundidade pelo pé) — o entulho da frente cobre o pé e o tratamento de imagem vale. As escolhidas em
   `rodada6/escolhas.json`; os painéis em `rodada6/paineis.json`.

## A escolha dele (21/10) e a instalação

**As escolhas:** prédio gótico 11-1, 11-2, 11-4, 11-14; bunker 11-0, 11-1, 11-3, 11-6, 11-15; tanque 11-0, 11-1, 11-4,
11-13, 11-6; antena 11-1, 11-2, 11-6, 11-10; a cúpula grande todas menos a 23-2; a torre 11-1, 11-10, 11-14, 11-22; os
destroços e os pilares "variados entre as gerações" (eu escolhi: destroços 0, 4, 5, 9, 10, 13 — sem os de ponto âmbar;
pilares 0, 4, 9, 13 e os altos 0, 1, 3, 8 — sem os de ponto âmbar). O tom: o meio-termo (ele não mexeu). A lista em
`rodada6/instalar.json`.

**"A escala dos assets no cenário está grande, podem diminuir"** (21/10): as caixas de cada tipo × 0,75 (a torre × 0,85,
menor que isso o olho deixa de ler). Os pilares MANTÊM as alturas 34–76 (são o corredor do flap: diminuí-los é mexer na
dificuldade, bloco F). A comparação 100/75/60 no jogo: `rodada6/plantadas/escala-*.png`.

**A instalação** (`scripts/_g/_instalar-pecas-f1.mjs` → `public/sprites/f1/pecas/*.png` + `src/f1/pecasF1.dados.ts`,
GERADO): cada escolhida recortada e reduzida para caber na caixa (nunca ampliada); as luzes assadas em 12 quadros (as
janelas âmbar por grupo, cada grupo com a sua sequência; o magenta pulsando; a luz vermelha da antena piscando), tocadas
como `<chave>-luz` a 5 fps com fase aleatória (`src/f1/pecasF1.ts`, `registrarPecasF1` no `BootScene`); a boca da torre
medida em cada variante (a ponta do cano) em `texture.customData.boca` → `bocaArte` no `TerrainSystem.fireAt`; o pilar
em 5 alturas (34, 44, 55 das escolhas de 64 px; 65, 76 das altas), 4 formas cada — o `setScale(1, 0,55–1,25)` saiu. O
`TerrainSystem.spawn` cria no quadro 0 (sem isso a área de colisão sairia da tira inteira). As antigas seguem no disco
(sem registro no `BootScene`) até a limpeza do fim do bloco.

**Os tamanhos, contra os antigos** (a área de colisão é 0,6 × largura × altura do quadro, então diminui junto — anotar
para o bloco F): prédio 46–48 × 44–48 (antes 64 × 55–64); tanque 35–37 × 48 (63 × 61); antena 15–21 × 43 (64 × 57 —
agora é uma agulha); cúpula grande 96 × 68–86 (127 × 109); torre 27 × 21–22 (32 × 30); destroço 39–44 × 20–26
(57–58 × 34); pilar 26–48 × 34–76 (antes 40–54 de largura em qualquer altura: o pilar baixo agora é mais estreito).

**Os AGLOMERADOS** (a ideia dele, 21/10: "pode criar novos tipos de edifícios ou aglomerados"): trechos do perímetro da
colônia numa peça só, gerados a 192×96 (`aglomerado` no gerador; o PixelLab devolve um por chamada nesse tamanho),
reduzidos a 60%, no tom da Paisagem (11/24, a cadência) com as luzes acesas (`scripts/_g/_aglomerados-f1.mjs` →
`public/sprites/f1-aglomerado*.png`), numa camada de DECORAÇÃO entre a Paisagem e as estruturas
(`AGLOMERADOS_F1`: 0,72 do mundo, depth −85, atrás da névoa rasteira, o pé atrás do entulho). A jogabilidade não muda.

**Conferências:** `tsc`; `test-f1-ritmos` (os aglomerados entre os planos certos); `_probe-f1` (as peças no quadro 0,
dentro da caixa, com o corpo do quadro, a luz tocando, a boca na arte, o pilar em alturas assadas de 34 a 76).

## O que vem (depois da escolha dele)

Instalar no MESMO quadro de cada peça de hoje (a área de colisão sai do quadro), a antiga para
`assets/raw/*-original.png`; as luzes por script (janelas âmbar, magenta pulsando, a varredura da antena) no lugar de
`building-lights`, `base-lights`, `radar-scan`, `turret-idle`; os pilares em 4 alturas assadas no lugar do
`setScale(1, 0,55–1,25)`; medir de novo a boca da torre (`BOCAS.turret`); a sonda; a fase filmada.
