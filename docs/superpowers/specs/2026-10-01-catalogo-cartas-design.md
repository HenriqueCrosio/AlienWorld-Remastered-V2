# Spec — O catálogo de cartas: 24 cartas que cabem no jogo (01/10/2026)

> Estado: **desenho aprovado em 01/10; ícones em 02/10; as 24 JOGÁVEIS em 02/10** (plano
> `plans/2026-10-02-catalogo-cartas.md`; folha `folhas/2026-10-02/skills/index.html`, um GIF por carta). A explosão já é
> a arte aprovada; **a arte das peças entrou toda em 03–04/10** (1º lote §5.1c, 2º lote §5.1e) e o **míssil virou tecla**
> (§4.3, 04/10). É a **frente A** da ordem combinada
> (A = catálogo → B = inimigos novos que atiram + ondas maiores → C = calibragem). Branch `feat/cartas-preview`.
> Fonte: `sistema_de_cartas_skills_shoot_em_up_v2.md` (o documento dele, 25 cartas) e as 13 do protótipo de 27/09.
> Folhas: `docs/superpowers/folhas/2026-10-01/pecas-novas-conceitos.png` (1ª rodada) e a 2ª rodada (drones pequenos,
> míssil médio, flare animado) — §5.

## 1. Por quê

O protótipo tinha 13 cartas, recortadas do documento dele sem olhar o jogo. O Henrique (01/10): *"existem cartas que
não vão de encontro com o jogo"* e, com o ganho que elas dão, *"as fases vão ser passeios no parque"*. O alvo: **até
25, fechado em 24**, cada uma revisada contra o que o jogo É:

- **o voo livre para seco** (`FreeController`, drag alto, sem inércia) — carta de "acelerar/frear melhor" não muda nada;
- **a bomba já existe** (3 por vida, limpa todo tiro inimigo e fere a tela inteira — `GameScene`);
- **inimigos comuns têm 2 de vida** (drone, batedor) — dano bruto vira "mata tudo num tiro";
- **quase nada atira** (só a canhoneira, 6 vezes na campanha, e as torres) — defesa forte vira invulnerabilidade
  (a frente B ataca isso).

E a regra 2 do documento dele: **o efeito precisa ser percebido** — carta de número invisível sai.

## 2. O que saiu (9 do documento + 1 proposta)

| Carta | Por que saiu |
|---|---|
| WPN_003 Tiro Quádruplo | em 384×216, 4 tiros cobrem quase a tela — o "passeio no parque" |
| WPN_005 Cadência Máxima | repete a Cadência 3× |
| WPN_006 Tiro Concentrado | "menos tiros, mais dano" briga com Duplo/Triplo; o Pesado já é o papel |
| EFF_005 Fogo Intenso | "queimado sofre mais dano" — número invisível |
| EFF_008 Crítico · EFF_009 Crítico Pesado | efeito invisível (regra 2) |
| MOV_002 Controle de Voo | o voo livre já para seco |
| MOV_004 Dash Rápido | o Dash é UM só (decisão dele) |
| (proposta) Ímã | *"faz o jogador perder outras cartas por visual"* (ele) — conveniência ocupando escolha |

## 3. As 24 cartas

(21 fechadas primeiro; a **build elétrica** — 3 cartas — entrou no mesmo dia, pedido dele: *"no GDD original de cartas
eu tinha idealizado uma build elétrica"*.)

Números são **provisórios** (vão para a calibragem, frente C). `máx` = quantas vezes pode ser pega. Nenhum nome passa
de 14 letras (a letra da mesa é uma só para todas — spec `2026-09-30-mesa-compacta-arte-design.md` §3.2).

### 🔫 Armamento (7)

| ID | Nome | Raridade | Efeito | Requer | Máx |
|---|---|---|---|---|---|
| WPN_001 | TIRO DUPLO | comum | 2 projéteis | — | 1 |
| WPN_002 | TIRO TRIPLO | incomum | 3 em leque (substitui o Duplo) | — | 1 |
| WPN_004 | CADÊNCIA | comum | +15% de cadência | — | 3 |
| WPN_007 | PERFURANTE | incomum | o tiro atravessa inimigos | — | 1 |
| WPN_008 | TIRO PESADO | rara | dano ×2, tiro mais lento **+ o TRANCO (04/10)**: cada acerto joga o inimigo ~8px para trás (no máx. 1 a cada 0,25s por inimigo; a aranha recua metade; chefão não recua) — *"o eletrificado pausa o movimento e o tiro pesado dá uma jogada para trás"*. GIF `folhas/2026-10-04/pecas/tiro-pesado-tranco.gif`. ⚠️ **Elétrico + Pesado juntos = "muito roubado"** → rebalanceamento | — | 1 |
| WPN_009 🆕 | MÍSSIL GUIADO | incomum | ~~a cada ~3s~~ **na tecla Q, com recarga (04/10, §4.3)**: um míssil persegue o inimigo mais próximo e **explode ao acertar** | — | 2 |
| WPN_010 🆕 | DRONE AUXILIAR | épica | um drone discreto acompanha a nave e dá um **tiro próprio: fraco, guiado ao inimigo mais próximo, cadência baixa** — NÃO copia Duplo/Triplo/Cadência da nave | — | 1 |

### 💥 Efeito (10)

| ID | Nome | Raridade | Efeito | Requer | Máx |
|---|---|---|---|---|---|
| EFF_001 | EXPLOSIVO | incomum | o tiro explode ao acertar | — | 1 |
| EFF_002 🆕 | EXPLOSÃO MAIOR | rara | toda explosão fica maior | Explosivo | 1 |
| EFF_003 🆕 | FRAGMENTADO | rara | toda explosão solta 4–6 estilhaços em leque | Explosivo | 1 |
| EFF_004 | INCENDIÁRIO | incomum | chance de incendiar | — | 1 |
| EFF_006 | COMBUSTÃO | épica | o inimigo queimado explode ao morrer | Incendiário | 1 |
| EFF_007 🆕 | EM CADEIA | épica | toda explosão incendeia quem está no raio | Incendiário + Combustão | 1 |
| EFF_010 🆕 | FLARE | incomum | **o jogador solta** um flare para trás (tecla, espera de ~8s, "FLARE" na HUD — 02/10: *"para não ficar muito roubado"*); ele **explode no inimigo que tocar** — e, se ninguém tocar, **explode sozinho depois de ~3s** (armadilha para quem persegue, bomba de retaguarda para quem escapou). A tecla (L) é provisória: o mapa de teclas ainda vai ser feito | — | 1 |
| EFF_011 🆕 | ELÉTRICO | incomum | chance de o tiro **eletrificar**: o inimigo leva um choque e **trava por um instante** (não anda, não atira) | — | 1 |
| EFF_012 🆕 | ARCO EM CADEIA | rara | o choque **salta** do eletrificado para até 3 inimigos próximos | Elétrico | 1 |
| EFF_013 🆕 | SOBRECARGA | épica | o eletrificado que morre **descarrega um pulso** em todos ao redor | Arco em Cadeia | 1 |

### 🛡️ Defesa (5)

| ID | Nome | Raridade | Efeito | Requer | Máx |
|---|---|---|---|---|---|
| DEF_001 | CASCO | comum | absorve 1 golpe e recarrega | — | 1 |
| DEF_002 | RECARGA | incomum | o casco volta mais rápido | Casco | **1** (era 2) |
| DEF_003 | VIDA EXTRA | rara | +1 vida | — | 1 |
| DEF_004 | CASCO REATIVO | rara | o casco partido explode | Casco | 1 |
| DEF_005 🆕 | BOMBA EXTRA | comum | +1 bomba por vida | — | 2 |

### ⚡ Movimento (2)

| ID | Nome | Raridade | Efeito | Requer | Máx |
|---|---|---|---|---|---|
| MOV_001 | PROPULSORES | comum | +12% de velocidade (fora da F1) | — | 2 |
| MOV_003 🆕 | DASH | rara | **dois toques** numa direção: um avanço curto para lá, **invulnerável**, com **espera** (fora da F1) | — | 1 |

**Distribuição:** 5 comuns · 8 incomuns · 7 raras · 4 épicas = 24. Quatro cadeias: **fogo** (Incendiário → Combustão →
Em Cadeia), **elétrica** (Elétrico → Arco em Cadeia → Sobrecarga), **explosões** (Explosivo → Explosão Maior /
Fragmentado), **casco** (Casco → Recarga / Casco Reativo).

**O fogo mata em área; o elétrico CONTROLA.** O "trava por um instante" é a resposta direta aos atiradores novos da
frente B (eletrificou, não atira) — as builds pedem jogos diferentes, não só números diferentes.

## 4. As regras novas

### 4.1 A explosão é UM sistema

Hoje cada carta explode do seu jeito (`CartasEmJogo`). Passa a haver **uma função de explosão** do jogo do jogador:
o tiro Explosivo, a Combustão, o Casco Reativo, o Flare e o Míssil Guiado chamam a mesma. Nela se penduram:
- **Explosão Maior** → multiplica o raio;
- **Fragmentado** → solta os estilhaços;
- **Em Cadeia** → incendeia quem está no raio.

Assim as cadeias se cruzam (o Míssil com Fragmentado; o Flare com Em Cadeia) sem carta nova. **Os estilhaços não
fazem explosão nova** (sem recursão infinita); **Em Cadeia incendeia, não explode** — quem explode é a Combustão
quando o queimado morre.

### 4.1b A build elétrica

- **Eletrificado** é um ESTADO do inimigo (como o queimado): dura ~0,4s, trava movimento e tiro, e mostra o efeito de
  eletrificado. Chefões e minichefes **não travam** (só levam o dano) — travar chefão quebra a luta.
- **Arco em Cadeia:** ao eletrificar, o choque salta para até 3 inimigos próximos (raio ~50px), um por vez, sem voltar
  a quem já levou. **Quem leva o arco é eletrificado, mas não solta arco novo** (sem recursão).
- **Sobrecarga:** o eletrificado que morre solta um pulso (raio ~30px) que FERE quem está perto; o pulso **não
  eletrifica** (sem reação infinita).
- **O raio é desenhado em pixel na resolução do jogo** (384×216): zigue-zague quebrado entre os dois pontos, na paleta
  do choque (ciano/branco), 2–3 quadros — não sprite esticada (esticar pixel art deforma) e não linha vetorial
  (memória `efeito-de-cena-assado-em-pixel`). O PixelLab entra na **faísca do acerto**, no **inimigo eletrificado** e
  no **pulso da Sobrecarga**.

### 4.2 O Dash

| | Valor (provisório) |
|---|---|
| Comando | **dois toques** na mesma direção (W/A/S/D ou setas), até ~0,22s entre eles; vale só se a tecla foi **solta e apertada de novo**; só existe para quem tem a carta |
| Direção | a dos dois toques (as 4 direções) |
| Movimento | ~40px do mundo em ~0,15s |
| Invulnerável | durante o dash (~0,2s) — escapar de tiro, míssil, enxame, dano certo |
| Espera | **8s** (02/10, ele: *"precisa ter um cooldown que justifique a raridade e o uso"* — com 2,5s era invulnerabilidade de graça); **"DASH"** na HUD quando pronto e **"DASH 5s"** contando enquanto recarrega (o Flare, também de 8s, faz igual) |
| Fases | fora da F1 (voo por impulso) |
| Visual | **imagens-fantasma** da própria sprite (3 cópias que somem) — vale para as 6 naves sem arte nova |
| Controle (etapa 1.6) | um botão (o duplo toque no analógico não é confiável) — decidido na spec do controle |

⚠️ Dash invulnerável + Casco podem voltar a facilitar: **a espera do dash é o número que segura isso** na calibragem.

### 4.3 O Drone e o Míssil não se repetem

| | Drone Auxiliar | Míssil Guiado |
|---|---|---|
| Tiro | leve, guiado, constante, cadência baixa | forte, raro (~3s) |
| Papel | conforto: limpa quem você não está mirando | dano em área: **explode** e entra na cadeia das explosões |

**O míssil (02/10, pedido dele):** a mira **trava no disparo** — com a carta ×2, o 1º persegue o inimigo mais próximo
e o 2º o segundo mais próximo, e o 2º sai ~140ms depois (antes os dois iam no mesmo e o que sobrava "pulava" para
outro, lendo como reação em cadeia). Se o alvo morrer antes, pega o livre mais próximo. Persegue como o
**interceptador**: acelera com inércia — erra, faz a curva e volta — com travas: velocidade máxima, o movimento de lado
amortecido (sem isso ele ORBITAVA o alvo) e vida de ~2,5s, no fim da qual **explode no ar**. GIF:
`folhas/2026-10-02/gif/missil-mira-e-inercia.gif`.

**O míssil (04/10, pedidos dele — substitui a cadência acima):**
- **É DO JOGADOR:** a ação MÍSSIL (**Q**; clássico **V**), com recarga — ×1 = **8s**, ×2 = **5s** (a calibragem mexe).
  O automático (a cada 3s; com ×2, um a cada 1,5s) era *"apelão demais — imagina quantas vezes ele vai soltar durante
  uma fase inteira"*. A HUD conta: "MÍSSIL" pronto / "MÍSSIL 7s". Sem inimigo na tela, o Q não solta nem gasta.
- **A SAÍDA:** *"ele sai para baixo como se tivesse se estabilizando e depois segue rápido em direção ao inimigo que ele
  travou"* — solto da barriga com o motor apagado, cai ~0,3s freando enquanto o nariz gira para o alvo, e na ignição
  parte a 130px/s (máx. 180). A vida (2,5s) conta da ignição.
- **Perdeu o alvo e não há outro:** explode no ar em 0,4s (rápido como sai agora, esperar a vida inteira o levaria
  para fora da tela, e ele sumiria sem estourar).
- GIF: `folhas/2026-10-04/pecas/missil-saida.gif` (humana e alien).

O drone é **um por linhagem**: humano = esfera pequena (estilo astromecânico, redondo); alien = água-viva pequena nas
cores da manta. Discreto, segue a nave com atraso curto. O **tiro do drone** é próprio, pequeno, na cor da linhagem.
O **míssil** também é por linhagem: humano = o #46; alien = um desenho próprio, orgânico, nas cores da manta.

### 4.3b A aura do Casco (volta, de outro jeito)

Em 28/09 o desenho em volta da nave saiu: era uma **elipse** de 30px que, nas naves de 44px, sumia atrás do casco e
lia como "feixe de luz". Agora volta como **contorno de 1px que segue a SILHUETA da própria nave** (tirado do alfa de
cada sprite, em cada tier), ciano, pulsando devagar — sem forma própria para "virar feixe", e serve às 6 naves sem
arte nova. Ao quebrar, o contorno estoura (efeito do PixelLab) e some até a recarga. O **"CASCO" continua na HUD**
(*"o escudo precisa estar no painel da nave, mas o jogador precisa saber que tem só de olhar a aura"* — ele).

### 4.4 O resto

- **Recarga** passa a máx. 1 (com 2 chegava a 3,5s — quase invulnerável).
- **Bomba Extra** soma às 3 bombas de cada vida.
- O **requisito** aparece na carta como "REQUER …" dentro do visor (a mesa nova já faz).
- Os IDs novos não reaproveitam os das cartas cortadas.

## 5. A arte (PixelLab, folha antes de instalar)

### 5.1 O que ele já escolheu (01/10, folha `pecas-novas-rodada2.png`)

| Peça | Escolha | Falta |
|---|---|---|
| Drone humano | **esfera #9** (job 2de6c6a0) — *"ficou muito bom"* | **menor em relação à nave** |
| Drone alien | **água-viva #60** (job bd1197f4) | **um pouco menor** em relação à nave |
| Míssil humano | **#46** (job 7f990d98, desenrolado) | — |
| Míssil alien | — | **desenho próprio**, orgânico, nas cores da manta (*"puxa muito para a nave humana"*) |
| Flare aceso | **o loop da PixMiniMax** (job c95f2927) — *"ficou ótimo"* | — |
| Flare explodindo | quadros 1–4 do job d95b0189 | entra na fila das explosões para comparar |
| Dash | **imagens-fantasma** — *"ótimo"* | código |

### 5.1b O que ele escolheu nas rodadas 3 e 4 (01/10, `pecas-novas-rodada3.png` e `-rodada4.png`, GIFs em `gif/`)

| Peça | Escolha | Nota |
|---|---|---|
| Drone humano | esfera **menor #26** (job 70d7c6f9) + a animação (622e8130) | *"ficou bom desse tamanho"* |
| Drone alien | água-viva **#60** + a animação (2832d22a) | a versão de 9px falhou (virou mancha) |
| Tiro do drone | **humano A** e **alien A** — à mão, 6×1px, fino como "–" | |
| Estilhaço | **D** — à mão (3×3) | peça minúscula não vai ao gerador |
| Míssil | humano #46 e **alien B** (o #46 repintado, mantém o aço) | ⚠️ *grande demais* ao lado da nave → **redesenhar à mão em ~16×5px**, mesma forma |
| Combustão | **#11** + a animação (a730d9eb) | as com fumaça "poluídas" |
| Sobrecarga | **#4** + a animação (eecbb4a7) | |
| Queimando | **#12** + a animação (6a04f01c) | |
| Faísca do acerto | **#17** + a animação (6e0532c8) | e a eletricidade **percorrendo o corpo** em código, pela silhueta |
| Eletrificado | **#29** + a animação (ea51cd0a) | ver em jogo contra a versão em código |
| Casco (aura, quebra, Reativo) | **código** — sutil, nunca tampa a nave | o escudo partido do PixelLab vira candidato ao ícone |
| Explosão das skills | **em aberto** — as de plasma geradas leem como arma de energia, não como projétil explosivo | proposta: a explosão segue a linhagem (humana = chama + pouca fumaça; alien = estouro de energia) |

### 5.1c A explosão de impacto, por linhagem (rodadas 5 e 6 — FECHADO)

A física dele: *"com a velocidade do tiro em direção ao inimigo, ao pegar no inimigo a tendência é que a fumaça e a
explosão sejam projetadas para um lado"* — o impacto é **DIRECIONAL** (o leque segue o movimento do tiro). Os tiros
retos vão quase sempre para a direita; quando o tiro tem ângulo, a explosão vira junto (0/90/180/270° exatos por
espelho/rotação; diagonais com desenho próprio se precisar).

| Uso | Humana (explosivo real: fogo + pouca fumaça) | Alien (energia: plasma, sem fogo) |
|---|---|---|
| Explosivo / impacto pequeno | **direcional #3 a 75%** (`rodada6/dir-peq-3-0.75.png`) | **cone próprio #15 a 75%** (`rodada6/energia-dir-15-0.75.png`) |
| Explosão Maior / impacto grande | **direcional #15 a 75%** (`rodada6/dir-grande-15-0.75.png`) | **cone próprio #15** (`rodada6/energia-dir-15.png`) — pixel não se amplia |
| Míssil (chega de qualquer ângulo) | **redonda #53** (`rodada5/redonda-grande-53.png`) — dispensa as 8 direções | a mesma, repintada na manta |
| Míssil (o projétil) | **16×5 à mão** (`rodada5/missil-humano-pequeno.png`) | **16×5 alien B** (`rodada5/missil-alien-pequeno.png`) |

As reduções a 75% são da PRÓPRIA arte aprovada (`scripts/_reduzir.mjs`, vizinho mais próximo + alfa binário) — o
redesenho menor do PixelLab perdeu o desenho. Animações: PixMiniMax, 8 quadros cada (jobs af68126f, 9fd83af2,
22ed0c71, 4ef19a0b).

**Em jogo (02/10, escolha dele: "A + B"):** a explosão das cartas usa ESTA arte (B) com variação por cima (A) —
espelho/giro de 90° ao acaso, ritmo ±15%, e Combustão/Casco Reativo em 3 estouros defasados. Combustão = o fogo #11;
míssil, flare e Casco Reativo = a redonda #53 (só os 4 primeiros quadros: o gerador desenhou o míssil nos outros). A
explosão do flare (d95b0189) fica de fora — mostra a lata em todos os quadros. Comparação em
`folhas/2026-10-02/gif/comparacao-*.gif`; código em `ExplosaoDoJogador` (`arte`).

**Os tiros:** o da NAVE é o que já existe (humana `tracerRound` 8×1; alien `shotPulse` 11×6); o do DRONE é menor
(6×1, à mão) — *"os das naves têm que ser ligeiramente maiores que os do drone"*.

**O drone desvia** (pedido dele): segue a nave; todo inimigo e todo tiro a ~24px o empurra para longe; passou de ~60px
da nave, a repulsão desliga e ele volta. **Sem vida** (não morre) — o desvio é charme.

### 5.1e O 2º lote das peças (04/10 — FECHADO)

Os tamanhos escolhidos na folha `folhas/2026-10-03/pecas/pecas-animadas-tamanhos.gif`, e os efeitos julgados em jogo
(`folhas/2026-10-04/pecas/`, com as comparações ANTES × NOVO × AS DUAS):

| Peça | Escolha | Em jogo |
|---|---|---|
| Flare aceso | **75%** (12×14) | a lata em pé, animada (vaivém); caixa 5×10 — *"ficou boa a lata acesa"* |
| Faísca do acerto #17 | escolhida a 50%, **SAIU** | na comparação ele preferiu o **raio em código** atravessando o corpo (`Fx.estalo`) — *"fica muito bem acabado"* |
| Eletrificado #29 | **75%** (16×17) | **raio + anel, nessa ordem:** o raio estala no corpo durante a trava (~0,4s, redesenhado a cada 80ms), e DEPOIS o anel acende 0,4s — *"agora sim ficou ótimo"* |
| Queimando #12 | **75%** (6×8) | a chama por cima, **sem tint** (o "NOVO") |
| Explosão do míssil alien | a redonda #53 **repintada na manta** (fumaça → casco, fogo → energia) | aprovada nas duas naves |

Os estados por cima moram em `EstadosNoInimigo`; o tint de antes só volta se o PNG faltar. Tiras de
`scripts/_montar-pecas.mjs`; a repintura em `scripts/instalar-explosoes-cartas.mjs`.

### 5.1d Os 24 ícones (02/10 — FECHADO)

Todos em `folhas/2026-10-01/pecas-novas/icones-finais/<ID>.png` (40×40, o Dash 39×17), conferidos dentro da carta
real em `icones-24-finais.png`. A mesa centra cada um pela tinta, então a margem do PNG não importa.

| Carta | Origem | | Carta | Origem |
|---|---|---|---|---|
| Tiro Duplo | #0 | | Em Cadeia | gerado do Arco #41 em fogo, #4 (desenrolado) |
| Tiro Triplo | #0 | | Flare | #3 |
| Cadência | #60 | | Elétrico | #0 |
| Perfurante | #3 | | Arco em Cadeia | #41 |
| Tiro Pesado | #13 | | Sobrecarga | #10 |
| Míssil Guiado | #17 | | Casco | #0 |
| Drone | #36 | | Recarga | o Casco menor com o anel centrado, #2 |
| Explosivo | #2 | | Vida Extra | #0 |
| Explosão Maior | #2 | | Casco Reativo | o Casco #0 + a redonda #53 com fumaça e estilhaços (código) |
| Fragmentado | #22 | | Bomba Extra | a #24 com o "+" no canto superior direito (código) |
| Incendiário | refeito, #21 | | Propulsores | #0 |
| Combustão | o kamikaze do jogo em chamas, #12 | | Dash | »»» em pixel (código) |

O nome **FRAGMENTADO** substitui FRAGMENTAÇÃO: o Ç e o Ã encolhiam a letra das 24 cartas (6,25 → 5,25px) e
derrubavam o "REQUER…" abaixo do mínimo.

### 5.2 A fila (roda agora; folha antes de instalar)

1. **Drones menores** (o #9 e o #60 como referência, canvas menor) e o **míssil alien**.
2. **Explosões por skill** (1º quadro no PixelLab, depois animação): a pequena (tiro Explosivo e Míssil), a grande
   (Explosão Maior), a de fogo (Combustão), a **onda de choque** (Casco Reativo); e o **estilhaço** (Fragmentado).
3. **Estados e efeitos**: inimigo **queimando**, **faísca** do acerto elétrico, inimigo **eletrificado**, **pulso** da
   Sobrecarga, **Casco quebrando** (o contorno estoura).
4. **Tiros dos drones** (pequenos, guiados; laranja humano, ciano alien).
5. **Os 24 ícones** (nas cores reais do objeto) — a Task 4 da mesa roda com estes IDs. ✅ fechados (§5.1d).

Sem arte nova (código, pixel na resolução do jogo): o **raio** do Arco em Cadeia, a **aura do Casco** (contorno da
silhueta), o **dash** (imagens-fantasma).

Regra: partir da arte aprovada; folha crua + em cena na escala real; ele escolhe antes de instalar.

## 6. Ordem de construção

1. O catálogo no código (`src/cartas.ts`: entram 11, saem nenhuma das 13, Recarga máx. 1) + o **sistema único de
   explosão** + o **estado eletrificado**.
2. As mecânicas novas com **arte provisória** (formas simples) — ele joga e sente: Míssil, Drone, Flare, Fragmentado,
   Em Cadeia, Explosão Maior, Bomba Extra, Dash, Elétrico, Arco em Cadeia, Sobrecarga, a aura do Casco.
3. A arte aprovada entra no lugar da provisória; os 24 ícones (Task 4 da mesa).

## 7. Fora desta spec

- Os inimigos novos que atiram e as ondas maiores (**frente B**) e todos os números (**frente C**).
- O botão do Dash no controle (etapa 1.6).

## 8. Testes

- `probe-cartas` e `probe-mesa-texto` continuam passando — a mesa agora com **24** cartas (o tamanho único da letra é
  recalculado com os nomes novos; nenhum passa de 14 letras).
- Uma sonda nova por mecânica (`probe-cartas-novas`): cada carta aplicada faz o que diz (o míssil persegue e explode; o
  flare explode sozinho; o dash atravessa um tiro sem dano; o Fragmentado solta estilhaços; a Bomba Extra soma; o
  eletrificado não atira enquanto trava; o arco salta para no máximo 3 e não recursa; o pulso da Sobrecarga não
  eletrifica; chefão não trava; a aura aparece com o Casco pronto e some quando ele quebra).
