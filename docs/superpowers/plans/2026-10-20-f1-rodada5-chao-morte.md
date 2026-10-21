# F1 · Rodada 5 — o chão das pinturas dele e a morte maior do chefão

> Feita em 20/10, depois do retorno dele às rodadas 1–4 (spec `specs/2026-10-20-f1-cenario-design.md` §7.4). Folha:
> `folhas/2026-10-20/f1-cenario/rodada5.html`. Nada commitado.

## As decisões dele (20/10)

- Eu gero e acabo as faixas do chão; a cordilheira sai (o chão de trás faz o papel dela).
- Ele pintou as duas camadas: `assets/raw/Valle Industrial Devastado sob Céu Transparente.png` e
  `assets/raw/Paisagem Montanhosa Sombria com Brasas.png` (1768×890, no quadro da pintura da cidadela).
- A ordem A: o Vale atrás, a Paisagem na frente dele, as duas ATRÁS das estruturas (na frente, uma delas esconderia
  quase todo prédio: elas sobem até y 136–183), e na frente das estruturas uma faixa baixa de entulho.

## O que foi feito

1. **As faixas** — `scripts/_g/_camadas-chao-f1.mjs` → `public/sprites/f1/chao-{vale,paisagem,frente,perto}.png` +
   `chao.json`:
   - o xadrez PINTADO do céu da Paisagem recortado (inundação a partir do topo pelos pixels claros, alfa parcial na
     borda, a cor da borda trocada pela do vizinho opaco — sem halo claro);
   - as duas reduzidas como a pintura (429×216, lanczos3, pré-multiplicado), alfa binário; a fumaça semitransparente do
     Vale SAI (pontilhada em 1 px virava xadrez) e volta animada;
   - emendadas por *quilting*: 48 px de sobreposição e um corte de menor diferença por linha (programação dinâmica,
     ±1 px por linha; o salto de silhueta custa 3000) → ladrilhos de 381 px, junta invisível (a folha mostra);
   - **o entulho da frente:** o contorno é a crista da Paisagem espelhada e achatada pelo relevo LOCAL (o inchaço numa
     média móvel ±22 px + os dentes acima dela, cada um normalizado pelo próprio percentil 95), 13 px no mínimo; o
     miolo é o pé do Vale (escondido atrás da Paisagem, não se repete na tela), escurecido ×0,55, com 1 px de aresta.
     `cobreDe` (o topo mais baixo, 203) vai para o `chao.json`;
   - **o primeiro plano (`perto`):** o entulho espelhado, 10 px mais baixo, ×0,5.
2. **As brasas e a fumaça** — `scripts/_g/_luzes-chao-f1.mjs` (as regras de luz do menu, `scripts/_cenario/luzes.mjs`):
   8 brasas no Vale e 12 na Paisagem tiradas por difusão, em três terços por faixa (`chao-<nome>-brasa-<g>.png`); os
   dois fogos maiores do Vale listados em `chao.json` → `vale.fogos`. **Rodar depois do `_camadas-chao-f1.mjs`.**
3. **No jogo** — `src/f1/chaoF1.ts` (`montarChao`): as quatro faixas (`CHAO_F1`: Vale 0,3/−88, Paisagem 0,5/−86,
   frente 1,15/−0,2, perto 1,5/60), os terços das brasas por cima (alfa = `brasaApagada(t, g)`, `ritmosF1.ts`), a
   fumaça da invasão (`f1-fumaca`) presa aos fogos do Vale, a queda em parallax na saída (`cair`, 2,5 s, Quad.easeIn:
   40/60/90/110 px). O `perto` lê o alfa do primeiro plano (`Parallax.primeiroPlanoAlfa`, interpolado por
   `setForegroundDimmed`/`setForegroundElite`). No `Parallax.buildSurface` saíram a cordilheira, o ladrilho, a aresta,
   a faixa tingida e o pico de gelo tingido do primeiro plano.
4. **O plantio** — `TerrainSystem.plantarNaSuperficie(PLANTIO_F1)` (chamado pelo `GameScene` na F1): o pé entre y 204
   e 213, salto mínimo de 4, a profundidade pelo pé (a regra e o sorteio do casco da F3, agora parametrizados).
5. **A morte** — `scripts/_g/_morte-chefe-f1.mjs` → `explosao-chefe-g.png` (250 px, 48 quadros em grade de 8),
   `explosao-chefe-m.png` (84 px), `estilhacos-chefe.png` (12 pedaços cortados de `boss-air.png`, borda rasgada em
   brasa), `fumaca-chefe.png` (30×104), `fogo-chefe.png` (três línguas), `morte.json`. `src/f1/morteChefeF1.ts`:
   `cadeiaDaMorte` (12 estouros em 1,26 s, a Torre aderna 9°, afunda 24 px, treme) e `estouroDaMorte` (o estouro aos
   1,3 s, `abaloGrande` 1,8, 16 estilhaços movidos à mão no `update` da cena — fora do Arcade, que o hitstop pausa —, o
   incêndio preso ao entulho aos 150 ms). Sem as peças, fica a morte da rodada 4.

## Desvios e lições

1. **O limiar de escuro para o contorno do entulho** deu blocos de parede reta (a falha da cordilheira de novo). O
   contorno passou a ser a crista dele, achatada.
2. **O relevo normalizado pelo todo** achatou o entulho (as torres das pontas do Vale dominavam a escala): relevo local.
3. **As rochas recortadas dos picos da Paisagem** para o primeiro plano saíram cones e sinos lisos, e o miolo da pintura
   lia como paisagem em miniatura, não rocha perto. Virou a faixa `perto` (contínua, baixa: só os tocos sobem).
4. **O fogo da morte** escalado do fogo da invasão saiu em triângulos regulares: três línguas tortas.
5. **O incêndio aos 700 ms** nascia num chão já caindo (a saída começa no estouro) e a fumaça virava uma barra escura
   contra o céu do zero-G: 150 ms.
6. **A `TileSprite` do Phaser 3.90** guarda a textura de origem em `displayTexture` (`texture.key` é uma chave gerada).
7. **Uma filmagem morreu no quadro 856** porque editei as FOLHAS (`rodada5.html`, `index.html`) no meio dela: o Vite
   recarrega a página por qualquer `.html` do projeto, inclusive em `docs/`. Durante uma filmagem, não editar nem `src`
   nem as folhas.

## Conferências

`tsc` limpo; `npm run build`; `node scripts/test-f1-ritmos.mjs` (as camadas, o plantio contra o `cobreDe`, as brasas),
`test-f1-invasao`, `test-menu-ritmos`, `test-atmosfera-perfis`; `node scripts/_g/_probe-f1.mjs` (as quatro faixas, o
plantio de 12 peças, as brasas, a fumaça, o primeiro plano apagando no chefão, a queda em parallax); `probe-menu`,
`probe-roster-f1`, `probe-stage1-visual` e `probe-stage4` (a campanha de ponta a ponta) — TUDO OK.

## 5b — os ajustes do retorno dele (20/10)

Ele aprovou a rodada e apontou dois pontos:

1. **"Algumas camadas estão com um cinza claro muito forte entre camadas escuras… não respeita a cadência de tons."**
   Medido na tela (`scripts/_g/_cadencia-chao.mjs`, cada plano só onde nenhum outro o cobre): a pintura 17/42 (mediana
   / p90), o Vale 24/75, a Paisagem 31/51 — os planos mais perto, mais claros que o de trás. No assado
   (`_camadas-chao-f1.mjs` §6, `CADENCIA`): cada pintura re-tonalizada com L' = a·L^γ ajustada à parte VISÍVEL
   (o Vale onde a Paisagem não cobre; a Paisagem acima de y 200), o matiz mantido, as luzes quentes protegidas; as
   arestas do entulho e do primeiro plano baixadas. Agora 17/42 → 14/31 → 12/23 → 7/17 → 5/14, e a medição virou
   checagem (reprova se um plano ficar mais claro que o de trás).
2. **"A fumaça esbarra numa parede"** na explosão da morte. Causa: na cena final a nuvem passa da borda da tela; do
   quadro 10 ao 42 a folha sai cortada reta à direita (e o jogo espelha metade das vezes). `scripts/_g/_explosao-fonte.mjs`
   (a fonte comum das explosões da Torre): a nuvem se desfaz nos últimos 70 px antes do corte, com ruído em duas oitavas,
   entrando entre os quadros 7 e 10 (a bola de fogo nasce em x 230–289 e não é tocada); a caixa é medida depois, e
   `centro` (onde a bola nasce, 0,646 × 0,693 do quadro) vira a origem do sprite (`estourar` espelha junto). Vale para a
   morte, a cadeia e a poeira da decolagem (`_chefe-f1.mjs`, as plumas saíram idênticas).

✅ **Aprovada por ele em 20/10, depois do 5b:** "Agora sim, ficou perfeito".

## O que vem

- As estruturas refeitas escuras (a rodada 3 de novo): as pinturas dele como referência de estilo, sem contorno, o
  brilho dentro da faixa da pintura, luz só onde há energia. A pergunta aberta: o desenho das peças segue as cúpulas da
  cena final ou o gótico das torres do Vale e da cidadela?
- A limpeza do fim do bloco: as cordilheiras (`public/sprites/f1-cordilheira*.png`) e o ladrilho recolorido para
  `assets/raw/*-original.png` quando ele aprovar.
