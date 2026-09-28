# Spec — Cartas, linhagens e peças (27–28/09/2026)

> Estado: **PROTÓTIPO JOGÁVEL** na branch `feat/cartas-preview`. As decisões abaixo foram fechadas com o Henrique
> durante a construção do protótipo; o que ainda está em aberto está marcado **EM ABERTO**. Fonte do sistema de
> cartas: `sistema_de_cartas_skills_shoot_em_up_v2.md` (raiz do repo, documento dele).

## 1. Por quê

O róster de 8 naves (uma arma base cada) tinha perdido o sentido e multiplicava o balanceamento. Antes da
calibragem, o Henrique trocou o eixo: **menos naves, poder vindo de cartas, evolução visual como conquista.**

## 2. As naves — duas linhagens

| | Humana | Alien (a manta) |
|---|---|---|
| Onde entra | F1 (nave inicial) | **Só na Doca** (base do asteroide, depois da F2), largada lá |
| Tiers | T0 (asa única) → T1 (o jato) → T2 (a 13) → T3 (a 14) | T1 → T2 (chifres + nadadeira dupla) |
| Animação | motor (só a chama) | nado (batida curta da nadadeira; a T2 herda o movimento da T1) |

- A nave **não dá poder**: a arma base é a mesma nas duas (tiro simples; `baseHumana`/`baseAlien`), e o poder vem das
  cartas.
- **A escolha é única, na Doca.** A partir dali o jogador segue com ela até o fim, ou até a derrota (o retry da fase
  mantém a nave; jogo novo recomeça na humana).
- **Trocar para a alien = o "incerto":** devolve a mão inteira e refaz em mesas aleatórias — as N cartas que tinha +
  a da conquista + 1 extra. Ficar na humana = o "certo": só a carta da conquista.
- **Padrão técnico:** todo quadro de nave tem 44×26 com o desenho centrado (o T0 humano animado tem 52×26, margem
  simétrica, por causa da chama). **Hitbox FIXA de 21×9** no código (a do jato, com que F1/F2 foram validadas) — a
  evolução visual não mexe na dificuldade.
- Arte: `public/sprites/naves/`. Aprovadas em `docs/superpowers/folhas/2026-09-27/naves-tiers-v3.png` e
  `…/2026-09-28/*.gif`.

## 3. As peças — as "moedas-estrela"

- **3 por fase, nas F1, F2 e F3.** Em ~25/50/75% do caminho até o chefão, um inimigo na tela vira **portador**
  (faíscas douradas); destruído, solta a **peça**, que flutua e precisa ser **tocada**. Portador que foge ou peça que
  sai da tela = perdida. Sem inimigo disponível no ponto, a peça aparece flutuando sozinha (as 3 chances existem sempre).
- **Coleção completa** = a nave **evolui um tier** na conquista + **1-UP só na fase seguinte** (não acumula; o retry
  daquela fase mantém). **Incompleta** = a nave fica no tier; a carta da conquista vem sempre.
- As cápsulas de **HMG/Shotgun deixaram de cair** — a peça é o drop do jogo.
- HUD: `PEÇAS n/3`.
- **EM ABERTO:** a F4 (não há tier depois dela) — hoje não tem peças; a arte da peça (hoje um losango dourado
  desenhado em código).

## 4. As cartas

- **Mesa = 3 cartas, escolhe 1.** A fase pausa por baixo (cena sobreposta).
- **Onde abrem (≈7 por jogada):** silêncio pré-chefão da F1 e da F2; morte da aranha (F3); morte do golfinho/guardião
  (F4); e a **mesa da conquista** nas 3 cutscenes (Aurora ≥1 Incomum; Doca ≥1 Rara; Hangar ≥1 Rara, pode Épica).
- **1ª leva: 13 cartas** (`src/cartas.ts`) — arma (Duplo, Triplo, Cadência, Perfurante, Pesado), efeito (Explosivo,
  Incendiário, Combustão), defesa (Casco, Recarga, Vida Extra, Casco Reativo), movimento (Propulsores, fora da F1).
- **Defesa dentro das 3 vidas** (sem barra de escudo): o **Casco** absorve 1 golpe e recarrega; o estado aparece na
  HUD (`CASCO`) e a nave pisca ciano ao recarregar — **nada desenhado em volta da nave** (a elipse lia como "feixe").
- As cartas duram a jogada; o checkpoint é a **entrada** de cada fase (retry devolve as cartas com que se entrou).
- **2ª leva (depois do playtest):** Quádruplo, Cadência Máxima, Concentrado, Crítico, Dash, Explosão Maior,
  Fragmentação, Fogo Intenso, Reação em Cadeia.
- **EM ABERTO — o layout da mesa.** Feedback de 28/09: o cartucho (112×160) ficou *"muito grande e estourado"*.
  Três layouts implementados para comparar (tecla `L` em dev): `cartucho`, **`compacto`** (ref. Deep Rock Galactic:
  Survivor) e **`lista`** (ref. 20 Minutes Till Dawn). Folha: `folhas/2026-09-28/mockups-cartas.png`; referências em
  `folhas/2026-09-28/referencias-cartas/`. Achado transversal: a fonte do jogo é a monospace do sistema escalada —
  **uma fonte pixel (bitmap) deixaria qualquer layout nítido.**

## 5. Fora deste passo

Calibragem e balanceamento dos números (bases 4.5 tiros/s, cartas, peças) — vêm depois, com o sistema fechado.
