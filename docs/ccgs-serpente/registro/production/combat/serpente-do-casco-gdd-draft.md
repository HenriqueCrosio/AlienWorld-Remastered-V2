---
status: DRAFT — Fase 1 (Design) do /team-combat
feature: Serpente do Casco — redesenho completo do chefão da Fase 3
author: game-designer (CCGS)
date: 2026-10-30
tier: minimal (GDD opcional; seções: Summary, Overview, Detailed Design, Formulas, Edge Cases, Dependencies, Acceptance Criteria)
estado-dos-numeros: MODELADOS, não medidos. Não há dados em assets/data/ nem GDD de alvos para o /balance-check
  ler — veredito de balanceamento = NOT ASSESSED — NO DATA. Todo número abaixo é ponto de partida para a sonda.
backup: docs/ccgs-serpente/backup-2026-10-30/ (a forma atual continua restaurável)
---

# Serpente do Casco — redesenho completo (rascunho de design)

## Summary

**Proposta em uma frase:** a Serpente deixa de ser um desenho que *fica* no casco e passa a ser uma criatura que
*caça por baixo dele* — e que, a cada cabeça perdida, se solta mais da âncora, até rasgar o próprio rombo e voar livre.

- **A ideia que fica (pilar):** uma cabeça vulnerável por vez (ciano → verde → laranja → o crânio da fusão).
- **O movimento NÃO é o desenho deslizando.** Três portadores, e só eles: (1) o **mundo reage** (a lombada que corre
  sob as placas, a rachadura, o buraco que se abre), (2) o **clipe** (PixelLab, cortado na linha do chão, sobe e desce
  de um buraco REAL), (3) o **caminho** em código (só a trajetória). A única criatura que atravessa o ar é a fusão, e
  só com um clipe de voo por baixo.
- **Escada de soltura** (a visão dele, "ela se desgarra da forma imóvel", aplicada à luta toda):

| Forma | Vida | Nome de trabalho | Como se move | Verbo que cobra |
| --- | --- | --- | --- | --- |
| A (3 cabeças, ciano) | 50 | A Moradora | mora no rombo, caça por tocas próximas | Bote travado + Chuva tripla |
| B (2 cabeças, verde) | 50 | A Caçadora | sem casa: salta de toca em toca (metrônomo) | Leque no compasso + Pinça + Chuva de 2 |
| C (1 cabeça, laranja) | 30 | A Fugitiva | "toninha": cadeia de 3 emersões em arco | Rajada mirada + Cadeia convergente |
| Fusão (crânio) | 80 | A Desgarrada | rasga o rombo e VOA livre | Investida em faixa + Leque + Rajada |

- **Duração-alvo proposta (a confirmar com ele): ~85 s** do nascimento ao último golpe, para um jogador que desvia e
  atira (hoje: 42 s). O HP total continua 210; o que alonga a luta é a **razão de exposição** (a cabeça só é alcançável
  ~50% do tempo), não mais vida.
- **Dificuldade:** "difícil pela leitura, um pouco de reflexo" vira uma REGRA numérica (o Orçamento de Leitura, §0.5):
  nenhuma ameaça sem aviso de ≥ 0,59 s; reflexo só se ganha lendo o padrão anterior.
- **Custo de arte honesto (combinação recomendada):** **4 clipes PixelLab novos** (emergência B, emergência C, subida
  da fusão, voo da fusão) + 1 opcional (investida da fusão) + 1 instalação do que já existe (emergência A = a E2 crua de
  29/10) + 1 imagem parada (rombo em ruínas). ~12–16 gerações.

---

## Overview

**O que é.** Chefão da Fase 3 de um shmup lateral (Phaser 3, 384×216). A nave voa livre a 110 px/s sobre o casco
dorsal do Leviatã e atira sempre para a DIREITA; o mundo para na chegada do chefão e a luta acontece numa arena
parada. A Serpente vive *dentro* do casco: ela se anuncia pela lombada que corre sob as placas, irrompe por buracos
reais, e se desfaz cabeça por cabeça (a gramática Metal Slug/Iron Nokana que ele pediu).

**Tom (INTENT UNKNOWN — proposto, a confirmar).** Um arco emocional em quatro tempos: **Pavor** (A: tem algo
embaixo de você e você aprende a lê-lo) → **Caça** (B: o compasso aperta, ela te cerca) → **Frenesi** (C: curta, rápida,
reflexo) → **Duelo** (fusão: o teto some, a criatura está no ar contra você). Dente de serra: cada forma abre com 1,0–1,5 s
de respiro e um único verbo novo isolado, e fecha no pico.

**MDA (do alvo para trás).**
- *Aesthetics:* Challenge (primário: ler e reagir), Sensation (o casco que estoura), Fantasy (derrubar um colosso que
  está debaixo dos seus pés), Discovery (aprender a gramática da lombada).
- *Dynamics:* o jogador ESPERA o aviso (poeira → âmbar → branco), sai da coluna/faixa, e CONTRA-ATACA na janela, que
  tem "dente" (§0.6) para nunca ser tiro grátis; em B/C ele PERSEGUE a cabeça que muda de lugar (mira vertical).
- *Mechanics:* máquina de estados por forma, vocabulário comum de 6 verbos, orçamento de leitura, razão de exposição.

**SDT.** Competence: o aviso é legível e a punição é proporcional ao erro (parado = punido, leitor = ≤ 1 acerto por
forma). Autonomy: tocar na janela agora ou esperar a próxima; escolher o lado do desvio; onde ficar em relação às
tocas. Relatedness: não se aplica além do vínculo narrativo (a criatura cobra a campanha inteira).

**O que do backup fica (candidatos, não exigências):** o estouro do casco na chegada (reformulado: a subida passa a
ser o clipe E2); a chuva tripla (A; reformulada em B); o erguer (vira a pose de "boca aberta" dentro dos clipes de
emergência); um tiro de cor por cabeça (azul/verde/âmbar); as veias que batem; o círculo de acerto no crânio desenhado;
a morte nos próprios pixels (mordidas). **O que sai:** o corte escuro (`LUTA.escuro`, a "sombra" reprovada), o repouso
de 3 alturas como atividade principal, a cura automática das tocas em B/C, a fusão presa ao rombo.

---

## Decisões para o Henrique

> Três bifurcações. Eu projetei o resto do documento assumindo as **recomendações** (marcadas); cada trecho que mudaria
> está etiquetado ⟦F1⟧, ⟦F2⟧ ou ⟦F3⟧.

### Fork 1 — O modelo de movimento das formas de cabeças (A, B, C)

| Opção | O que é | Prós | Contras | Clipes novos |
| --- | --- | --- | --- | --- |
| **1-A Subterrânea** (recomendada) | O corpo viaja **por baixo do casco** (lombada, rachadura, poeira = o mundo reage) e a criatura irrompe em buracos reais, em x diferentes, subindo com um clipe cortado na linha do chão. Em C vira uma cadeia de emersões em arco ("toninha"). | Cumpre a regra dele (nada desliza; nada é escondido por sombra). Reaproveita o que ele aprovou (estouro, chuva, erguer, E2). Todo o deslocamento horizontal é o MUNDO, grátis em arte. A leitura é natural: "o que corre sob o chão me caça". | Ela fica invisível ~40–50% do tempo (risco de "caça-toupeira"; mitigado: a lombada é o personagem enquanto ela está oculta). Se a emergência for fraca, repete o "ficou fraco" da S1b. Variação visual só vem do ritmo e da geometria, não de poses. | **2** (emergência B, C) + instalar a E2 (A) |
| **1-B Ancorada com gestos** | O corpo fica no rombo; a mobilidade vem de clipes de pescoço (bote para a esquerda, pêndulo, chicote) com o círculo de acerto seguindo a cabeça quadro a quadro (já existe em `gestoSerpente.ts`). | Sem mundo novo; código simples; a cabeça "se mexe" de verdade. | O quadro do clipe é 256² e a arte já o preenche: a cabeça só alcança ~±22 px de tela além do idle — vira *gesto*, não *deslocamento*. A criatura continua parada num ponto = o "engessada" de 28/10. Muitos clipes, alto risco de perder identidade. | **5–6** |
| **1-C Pescoço em cadeia (procedural)** | Pescoço de segmentos recortados da arte aprovada seguindo uma cabeça que caça por um caminho; a cabeça alcança qualquer ponto. | Mobilidade verdadeira, 0 clipes PixelLab. | Viola a regra dele ("nunca partes coladas + movimento fingido em código", 09/10). Alto risco de ler como "gerado". Exigiria uma exceção explícita e um protótipo de 3 s por GIF antes de qualquer coisa. | **0** (mas 3 recortes de cabeça + 1 tile de pescoço) |

**Recomendo 1-A.** Ela é a única que honra TODAS as regras dele ao mesmo tempo e cresce do que já existe. O risco real
é a qualidade da emergência; por isso o clipe de A (a E2, já gerada) vai primeiro na folha de conceitos.

### Fork 2 — A estrutura de formas

| Opção | O que é | Prós | Contras | Clipes (somando ao Fork 1) |
| --- | --- | --- | --- | --- |
| **2-A Quatro formas, escada de soltura** (recomendada) | A (50) → B (50) → C (30) → Fusão (80). Cada forma ocupa um degrau de liberdade (casa → sem casa → cadeia → voo) e cobra um verbo da campanha. C é a forma curta e frenética. | Cada forma tem identidade distinta; o dente de serra de dificuldade é natural; a "junção das 3" fica literal; a fusão chega como clímax de uma escada, não como "mais uma de uma cabeça". | 4 conjuntos de números para calibrar; B e C se parecem na mecânica-base (mitigado: eixo e geometria diferentes). | B, C emergências |
| 2-B Três atos | A (60) → B (60) → Fusão (90). C é cortada; a laranja é absorvida pela fusão. | −1 clipe, −1 forma para calibrar, luta mais enxuta. | Perde o degrau "frenesi" e o verbo da Capitânia; a "junção das 3" fica frouxa. | só B |
| 2-C Manter 50/50/50/60 | Mesma estrutura de hoje com o movimento novo. | Menor mudança de dados. | C e fusão são ambas "uma cabeça" e a fusão perde HP justamente quando deve ser o clímax. | B, C |

**Recomendo 2-A.** Se ele achar 4 formas demais, 2-B é o corte limpo (remove C inteira, §6).

### Fork 3 — Quão solta é a fusão

| Opção | O que é | Prós | Contras | Clipes |
| --- | --- | --- | --- | --- |
| **3-A Voo livre imediato** (recomendada) | A fusão rasga o rombo (o rombo vira ruína, ela nunca volta) e voa em caminho livre o resto da luta; o corpo se move por um clipe de voo em loop. | Realiza literalmente a frase dele ("se desgarra da forma imóvel… mais móvel, esse é o desafio"). Muda o EIXO da ameaça (colunas verticais → faixas horizontais): o desafio é novo, não mais do mesmo. | O maior risco de arte da luta (voo de uma criatura enrolada, 156 px). Precisa de clipe de subida + voo. | **2** (subida, voo) + 1 opcional (investida) |
| 3-B Solta no meio | Fusão começa presa ao rombo, caça por tocas e solta-se aos 50% de vida. | O "desgarrar" vira um segundo clímax no meio da fusão. | A primeira metade da forma final é a forma "imóvel" de novo (contradiz "todas mais móveis"); +1 clipe de emergência da fusão. | 3 (+1 opcional) |
| 3-C Presa, porém mais móvel | A fusão fica no casco, caça por tocas mais rápidas; nunca voa. | Mínimo risco de arte. | Não entrega a visão dele. | 1 |

**Recomendo 3-A**, com plano B documentado: se o voo não aprovar em 4 gerações, a fusão cai para **3-C** (a máquina
de estados da §8 já separa "o que ela faz" de "como se move").

**Combinação recomendada (1-A, 2-A, 3-A):** 4 clipes novos + 1 opcional.

---

## Detailed Design

### 0. Regras de projeto (valem para tudo; cada uma tem teste na seção de aceitação)

**0.1 Nada desliza como desenho rígido.** O deslocamento de qualquer parte da criatura é carregado por (a) o mundo
(lombada/rachadura/buraco/poeira), (b) um clipe PixelLab, ou (c) um caminho em código *com um clipe tocando por baixo*.
Em código fica apenas a trajetória. Nenhuma forma de cabeças atravessa o ar; só a fusão, e só com o clipe de voo.

**0.2 Nada cobre parte dela com sobreposição escura.** Ela some descendo por um buraco real (sob a tela, no rombo; ou
sob a linha do chão, num clipe já cortado). O `LUTA.escuro` e o recorte por `aplicarCorte` deixam de ser usados nas
tocas, porque o clipe de emergência já nasce cortado e o lábio da toca (feito pelo casco vivo) cobre a linha.

**0.3 A esquerda é da nave.** (a) A trava nunca fica à esquerda de `bordaX = 80` (hoje 60): sobra ≥ 49 px à esquerda
da coluna para o desvio. (b) Tocas **não travadas** só nascem à DIREITA da nave e a ≥ 70 px dela. (c) As correntes de
emersões de C convergem **da direita para a nave**. (d) A fusão nunca vai à esquerda de x = 60 (`x_fim ≥ 60`) e sua faixa
só ameaça o y travado: a nave que desvia na vertical não é seguida. (e) A chuva cobre x 14–278, mas o vão sempre tem 87 px livres.

**0.4 A linguagem de cores do perigo (3 estados, sempre os mesmos, em toda forma):**
- *poeira cinza sozinha* = a lombada viaja, **inofensiva** (inclui a ronda da chegada);
- *brilho âmbar na rachadura* = uma toca NÃO travada está se abrindo ali (letal naquele x, mas **não é você**);
- *ponta BRANCA que para (e faíscas brancas)* = **coluna/faixa travada em você, letal**. O branco nunca aparece em
  nada inofensivo. (Na fusão: a faixa branca da investida.)

**0.5 Orçamento de Leitura.** Para toda ameaça que pode atingir a nave: `T_cue ≥ T_cue_min`, onde `T_cue` é o tempo da
primeira pista inequívoca até o contato mais cedo, e `T_cue_min = t_react + t_clear(d)` (§Formulas): **0,59 s** para
coluna, **0,56 s** para faixa. Exceção: a 2ª+ ameaça de um padrão que o jogador acabou de ver pode ter até **0,6 ×
T_cue_min** (≈ 0,34 s): é o "um pouco de reflexo", e só vale depois de LER o primeiro. No máximo 1 em 3 ameaças de B, C
e F tem `T_cue < 0,80 s`; A é toda ≥ 0,85 s.

**0.6 Janela com dente.** Toda janela de exposição contém exatamente **um** contra-ataque telegrafado a ~60% dela
(A: 3 tiros mirados; B: leque de 5; C: rajada de 3), com a boca acendendo ≥ 0,40 s antes. A janela nunca é tiro grátis,
nem para quem acampa à esquerda.

**0.7 Uma novidade por vez (scaffold).** O primeiro ciclo de cada forma apresenta UM verbo isolado, com respiro de
1,0–1,5 s antes dele; só no segundo ciclo os verbos se combinam.

**0.8 Mutuamente exclusivos.** A máquina nunca tem dois telégrafos letais ao mesmo tempo (bote, chuva, leque, faixa).
Tiros de fundo só existem quando nenhum telégrafo está aberto.

### 1. A arena

- **Geometria.** Tela 384×216. Faixa do casco: y ≥ 150 (crista em 151). A nave voa acima e sobre a faixa (sem colisão
  com o chão). O mundo está **parado** durante a luta toda (`mundo = 0`, como hoje).
- **O rombo (lar).** Centro x = 300, meia-largura 72, abre com o estouro da chegada. Ela aparece INTEIRA nele, com o
  lábio na frente das roscas (regra dele: o corpo só é cortado quando ela sai de uma toca, nunca no rombo).
- **Tocas** (buracos temporários abertos por ela no casco; geometria e cura no casco vivo, `cascoVivo.ts`):

| Forma | Meia-largura | Profundidade | Vida útil | Máx. abertas |
| --- | --- | --- | --- | --- |
| A | 54 (108 px, as três gargantas) | 40 | cura em 2,5 s depois que ela some | 2 |
| B | 38 (76 px, duas gargantas) | 40 | **persistem** até o fim da forma (cicatrizes) | 4 |
| C | 22 (44 px, uma garganta) | 40 | persistem até o fim da forma | 5 (a mais velha fecha em 1,5 s) |

  Duas tocas a < 60 px viram **uma** (reaproveita a mais antiga; sem rachadura nova). Uma toca aberta é um buraco
  desenhado (borda partida, interior escuro de dentro do Leviatã): a arena vai ficando **perfurada** (a luta "se
  despedaça", Metal Slug).
- **Zonas.** Zona da nave: x < 200 (o jogador "mora" aqui). Zona dela: formas de cabeças, x ≥ 130 (tocas) e rombo; fusão:
  cabeça em x ∈ [207, 292] na patrulha. Nenhuma ameaça letal existe em x < 60.
- **Tocas de salto (B/C) — sítios.** Candidatos: x ∈ {190, 240, 300 (rombo)} + o x travado. A escolha é a mais distante
  da nave que cumpra §0.3(b), alternando entre os que não repetem o anterior.

### 2. A chegada (mantida como candidata, reformulada)

Roteiro do estágio inalterado (banner 91 s, chefão 95 s; defesas do casco 80–85 s). Sequência:

| t (s, desde o nascimento) | Evento | Portador do movimento |
| --- | --- | --- |
| 0 – ~3,0 | A faixa do casco entra INTEIRA; o mundo freia (28 px/s²; distância de freada v²/56 = 126 px) até parar com o rombo em x = 300 | mundo |
| ~3,0 – 4,2 | **Ronda (nova, opcional):** o casco treme (1,2 s, como hoje) e uma lombada de poeira **cinza** corre por baixo do casco de x = 300 até x ≈ 150 e volta (2 × 150 px a 300 px/s = 1,0 s), sem ponta branca e sem ferir: ensina a gramática "o que corre sob o chão é ela" antes da primeira ameaça | mundo |
| ~4,2 | O casco estoura de dentro para fora (motor de destroços, como já aprovado) + tremor de câmera | destroços |
| ~4,2 – 5,8 | Ela sobe pelo rombo com o **clipe E2** (já gerado; sobe, ondula, ergue e abre as bocas), terminando na pose "erguida" | clipe |
| 5,8 | A luta começa; o dano só vale daqui (como hoje, `entering` falso) | — |

Se ele reprovar a ronda, ela sai sem impacto (nada depende dela).

### 3. Vocabulário de verbos (comum às formas de cabeças)

Cada verbo é uma sequência de estados com tempos e um tipo de aviso. Valores iniciais por forma na tabela do verbo.

**V1 — Bote travado (caça).** Hoje existe; muda em números e na dança de cores.
`MERGULHO` (desce ao buraco a 380 px/s) → `CORRE` (lombada até o x-alvo a `v_corre` = 300 px/s, poeira cinza) →
`SEGUE` (acompanha o x da nave a `v_segue` = 160 px/s por `T_segue`; a poeira engrossa) → `TRAVA` (ponta BRANCA que para,
faíscas brancas, `T_trava`) → `BOTE` (o casco estoura no x travado, o cascalho voa por trás dela; ela sobe a 700 px/s
com o clipe de emergência até a altura da nave) → `JANELA` (exposta, boca aberta, + dente) → `AFUNDA` (reverso do
clipe, 380 px/s).
Altura do bote: a cabeça fica na altura da nave (limitada: nunca acima do posto alto, nunca abaixo de crista − 6 px).
Corpo letal: coluna do crânio até o pé da tela, raio 16,5 px; na JANELA só a cabeça (o pescoço não fere).

| | T_segue | T_trava | Janela | Dente |
| --- | --- | --- | --- | --- |
| A | 0,40 | **0,60** | 1,7 s | 3 tiros azuis mirados ±14° a 140 px/s, boca acende em +0,5 s, sai em +0,9 s |
| B | 0,40 | **0,50** | 1,2 s | leque 5, 48°, 155 px/s; acende +0,3, sai +0,7 |
| C | 0,25 | **0,40** | 0,5 s (0,9 s no último salto da cadeia) | rajada âmbar de 3 a 175 px/s, tiros espaçados 0,12 s, cada um re-mira |

**V2 — Salto de toca (hop; B e C).** `AFUNDA` → `CORRE` (lombada até o sítio, ≥ 70 px da nave) → `RACHA` (brilho **âmbar**
na rachadura que se abre naquele x por `T_racha`: 0,35 s em B, 0,40 s em C) → `BOTE` → `JANELA` + dente → `AFUNDA`. Não é
travado em você: é pressão posicional (a cabeça muda de lugar e você a persegue com a mira). É letal na coluna do sítio.

**V3 — Chuva (A: 3 ondas; B: 2 ondas).** Mantida (ele gostou). `SOBE` (ao posto alto, 320 px/s) → `AVISO` (as bocas
vivas acendem, cada uma na sua cor; **0,7 s**, a 1ª vez do jogo 1,0 s) → `CUSPE` (cada cabeça viva cospe 3 gotas para
o alto a 320 px/s, ±0,18 rad; 0,45 s) → `ONDAS` (uma por cabeça viva, a cada **0,55 s**, gotas a 24 px de passo de x = 14 a
x = 278, **vão de 3 gotas** num lugar sorteado, queda a 100 px/s). O vão **anda ≤ `deriva` vagas por onda**:
A = 1 (corredor a 43,6 px/s = 40% da velocidade da nave), B = 2 (87,3 px/s = 79%: o "reflexo" de B). Folga lateral do
corredor: (vão+1)·24 − 9 = 87 px livres; a nave tem 21 → 33 px de cada lado. B só: depois do `CUSPE` ela AFUNDA em 0,3 s
(as ondas seguem caindo); em A ela segura o posto alto até o fim das ondas. 9 gotas/onda → A: 27 + 9 do cuspe; B: 18 + 6.

**V4 — Leque no compasso (B, fusão).** Boca acende (0,40 s) e sai um leque de `n` tiros em `α` graus em direção à nave, a
`v`. B: n = 5, α = 48°, 155 px/s. Fusão: n = 7 (n = 9 depois da 1ª fúria), α = 64° (72°), 170 px/s. Regra de distância
mínima do leque (§Formulas F8): D ≥ 30 px e o tempo de saída da cunha cabe no aviso.

**V5 — Rajada mirada (C, fusão).** Boca acende 0,40 s; `n` tiros espaçados 0,12 s, **cada um re-mira** na nave
(quem fica parado come todos). C: n = 3, 175 px/s. Fusão: n = 4, 190 px/s.

**V6 — Investida em faixa (só a fusão, §8).**

### 4. Forma A — "A Moradora" (3 cabeças; vulnerável: ciano, tiro AZUL; 50 PV)

**Papel.** Ensinar a gramática. Ela tem casa (o rombo) e a caça é lenta e legível. Tom: pavor paciente.
**Portadores do movimento.** Mundo (lombada, rachadura, tocas) + clipe (E2: emergência com o erguer; o idle de 9 quadros no
rombo) + caminho vertical (3 postos na toca-casa: baixo/médio/alto = y do sprite 142/126/110, troca a cada 0,8–1,2 s; hoje
2,2–3,2 s, que era o "engessada").

**Roteiro (laço de 2 compassos, ≈ 10,3 s cada):**

| # | Estado | Duração | Exposta? | Aviso | Observação |
| --- | --- | --- | --- | --- | --- |
| 1 | `REPOUSO` no rombo (inteira, lábio na frente) + tiro esparso a cada 0,8 s revezando ciano→verde→laranja, mirado ±0,35 rad, 140 px/s, saindo da boca com o erguer de 0,25 s | 1,6 s | Sim | gesto do erguer | no 1º ciclo: 1,6 s de respiro isolado |
| 2 | **V1 Bote travado** (alvo = x da nave, ≥ 80) | MERGULHO 0,42 + CORRE ≈ 0,45 + SEGUE 0,40 + TRAVA 0,60 = 1,87 | Não | poeira → branco | `T_cue` = 1,00 s (≥ 0,85) |
| 3 | `BOTE` 0,30 (+0,15 exposta) + `JANELA` 1,7 + `AFUNDA` 0,35 | 2,35 | 1,95 s | dente em +0,9 s | clipe E2 cortado na linha do chão |
| 4 | `VOLTA`: lombada de volta ao rombo a 300 px/s + sobe no rombo (clipe) até o posto baixo | ≈ 1,35 | 0,3 s | — | toca A cura em 2,5 s |
| 5 | **V3 Chuva de 3 ondas** (1ª do jogo com aviso de 1,0 s) | SOBE 0,35 + AVISO 0,7 + CUSPE 0,45 + ONDAS 1,65 | efetiva ≈ 1,4 s | bocas acendem | ele já aprovou |

Ciclo total ≈ 10,3 s; exposição efetiva ≈ 5,25 s → **ρ_A ≈ 0,52**. **No 1º laço o passo 5 (chuva) só entra após o 2º
bote** (uma novidade por vez).

**Aperto com o dano** (`aperto = 1 − PV_forma/50`): `T_trava` 0,60 → 0,55; `REPOUSO` 1,6 → 1,0 s; cada laço encurta ≈ 12%.
**Ela nunca ataca com dois telégrafos** (§0.8). Os outros dois crânios e os pescoços absorvem tiro com faísca.

**Saída da forma (o ciano morre):** §7.

### 5. Forma B — "A Caçadora" (2 cabeças; vulnerável: verde, tiro VERDE; 50 PV)

**Papel.** O metrônomo da Torre, agora no chão: o tempo é uma batida e a posição muda a cada batida. Tom: caça.
**Portadores.** Mundo (lombada curta entre tocas persistentes: o casco fica cada vez mais perfurado) + clipe (emergência B,
NOVO; reverso = afundar) — **sem casa**: depois da transição ela nunca mais volta ao rombo para repousar.
**O compasso:** uma batida a cada `T_b = lerp(2,8; 2,0; aperto)` s (cada batida = um salto de toca). Roteiro: **barra de 3
batidas**:

| Batida | O que faz | Janela útil |
| --- | --- | --- |
| 1 — **Pinça** | V1 travado (sítio = x da nave ≥ 80; `T_trava` 0,50) + dente = leque 5 | `T_b − 1,0 s` (1,8 → 1,0 s) |
| 2 — **Salto** | V2 (sítio à direita, ≥ 70 px da nave; `T_racha` 0,35) + dente = leque 5 | idem |
| 3 — **Chuva de 2** | V3 com B (2 ondas: verde e laranja, `deriva` 2) | a cabeça verde exposta no AVISO + CUSPE (1,15 s) |

Uma batida ≈ [afunda 0,30 + corre ≈ 0,35 + racha/segue+trava 0,35–0,90 + bote] + janela. Barra ≈ 9,2 s no começo da forma,
≈ 7 s no fim; ρ_B ≈ 0,50 (0,61 no início, 0,45 no fim). O **compasso é a leitura** (Tower echo): os jogadores sentem 1-2-3,
e o aperto o acelera.
**Reflexo de B:** a Chuva de 2 com corredor a 79% da velocidade da nave; e o `T_cue` da Pinça (0,90 s) é o mais curto
das ameaças de A/B isoladas.
**Persistência:** as tocas B ficam; o rombo e as tocas de A que ainda estejam abertas permanecem. O casco perfurado é o
"dano acumulado visível" da arena.

### 6. Forma C — "A Fugitiva" (1 cabeça; vulnerável: laranja, tiro ÂMBAR; 30 PV)

**Papel.** Frenesi curto: a criatura fere-se e *corre*. Reflexo aprendido lendo A e B. Tom: pânico predatório.
**Portadores.** Mundo (lombada curta, tocas de 44 px persistentes) + clipe (emergência C, NOVO) + o encadeamento de
emersões em arco (a "toninha" ao longo do casco: emerge, mergulha, emerge 45 px adiante).
**Roteiro (laço ≈ 5,3 s):**

| Passo | Estado | Duração | Exposta? | Aviso |
| --- | --- | --- | --- | --- |
| 1 | **Cadeia convergente:** 3 saltos V2 em sítios x₁ = x_nave+90, x₂ = x_nave+45 (valores no início da cadeia; ≤ 320) e x₃ = **x da nave no instante da trava** (`T_segue` 0,25 + `T_trava` 0,40). Cada emersão dispara a rajada de 3 (dente) | 3 × 1,30 s (janela 0,5; afunda 0,25; corre 0,15; racha âmbar 0,40) | 3 × 0,5 s | âmbar, âmbar, **branco** |
| 2 | Última janela alongada | +0,4 s (0,9 s no total) | 0,4 s | — |
| 3 | **Pausa com leque:** fica no último buraco; boca acende em +0,1, leque 4 a 40°, 150 px/s em +0,5 | 1,0 s | 1,0 s | boca acende |

Exposição por laço ≈ 2,9 s de 5,3 → ρ bruta ≈ 0,55; com p_acerto ≈ 0,8 (a cabeça muda de lugar a cada 1,3 s) a **ρ efetiva é ≈ 0,45**.
`T_cue` do salto 3 (a ameaça travada): sentir os dois saltos anteriores + 0,25 + 0,40; é a única ameaça de C com
`T_cue ≈ 0,65–0,8 s` (reflexo ganho lendo a convergência).
**Aperto:** `T_hop` 1,30 → 1,15 s. Sem chuva (uma cabeça só); a rajada mirada é a cobrança da Capitânia.
⟦F2⟧ Em 2-B esta forma inteira some; em 2-C ela mantém 50 PV.

### 7. Transições (A→B, B→C, C→Fusão)

Hoje: cadeia de explosões 0,55 s com imunidade e a arte troca de uma vez. Novo, **a troca de arte nunca é vista**:

1. **Morre a cabeça viva** → cadeia de estouros 0,55 s (imune; o coto fumega; as mordidas dos destroços continuam).
2. O corpo se contrai e **desce pelo buraco** em que está (rombo ou toca; 0,45 s) — o sprite sai por baixo da tela/linha;
   **a arte da próxima forma entra enquanto está invisível** (não há sobreposição).
3. A lombada **ferida** corre: poeira **cinza** com um fio de líquido escuro/âmbar, 0,8 s, até o primeiro sítio.
   Nada letal: o jogador ganha o respiro do dente de serra.
4. Emerge **como a forma nova** com o clipe dela. 1,0–1,5 s de respiro antes do 1º ataque (§0.7).
5. A→B: emerge no sítio mais próximo à direita; B→C: idem, mais perto da nave; C→Fusão: §8.

Duração (morte → 1º ataque da próxima): ≈ 2,6 s (A→B, B→C). O 0,55 s de imunidade segue valendo; ela também não pode
ser ferida enquanto oculta (`corpo = nada`, como hoje).

### 8. A Fusão — "A Desgarrada" (80 PV, círculo de acerto 18,9 px, vulnerável: o crânio)

**Papel.** O clímax: ela deixa de caçar por baixo e **vem pelo ar**; o eixo da ameaça vira vertical → horizontal (a nave
desvia para CIMA/BAIXO, não para os lados). Tom: duelo.

**8.1 O rasgo (C→Fusão, ~5,5 s):** (1) C morre (§7, passos 1–2, mas **a lombada que corre é a das TRÊS luzes** — ciano, verde
e âmbar — três lombadas coloridas que convergem para o rombo em 1,2 s, mundo reagindo; candidata, ele já aprovou "as luzes
convergem"); (2) o rombo **incha** (placas sobem 1,0 s, silêncio visual 0,4 s); (3) **o rasgo:** o lábio e a borda do rombo
estouram para fora nos próprios pixels (motor de destroços já existente, `arena.estourar`), tremor de câmera 0,5 s, a
imagem da faixa trocada pela **ruína do rombo** (imagem nova); (4) a fusão **sobe** com o clipe `fusao-subida` (cortado
na linha do chão no início; termina LIVRE, sem a parte de baixo cortada), 1,6 s; (5) pausa 0,6 s com o rugido (tremor leve)
e a luta da fusão começa. O rombo nunca mais é usado: a fusão não volta ao casco.

**8.2 Locomoção (portador = clipe de voo em loop + caminho em código).**
- **Patrulha (sempre ligada fora das investidas):** a cabeça segue uma Lissajous (§F9): centro (245, 78), amplitudes
  A_x = 38 px, A_y = 22 px, períodos 5,6 s e 3,7 s (razão ≈ 2:3). Velocidade máxima da cabeça ≈ 50 px/s em x, 37 px/s em
  y: **bem abaixo da nave (110)** — dá para acompanhar. Faixa de y da cabeça: [56, 100] (nunca abaixo de 130, nunca
  acima de 36).
- O sprite acompanha: centro = cabeça + (32,8; 47,6) (o crânio fica a −52,−75,6 px de arte do centro; ×0,63). A bobina
  desce até o casco e **passa por cima dele** (é a mesma camada da nave).
- Corpo letal: **só a cabeça (círculo 18,9) + 36 px de pescoço**. A bobina não fere e não colide com tiros (os tiros
  passam por ela; a cabeça, voltada para a esquerda, é a primeira a ser encontrada).
- **Corpo que se mexe:** o clipe `fusao-voo` (loop de 9 quadros: a cauda/bobina ondula, a cabeça balança).

**8.3 O ciclo (laço ≈ 7,2 s, repete):**

| Passo | Estado | Duração | Exposta? | Aviso |
| --- | --- | --- | --- | --- |
| 1 | **Patrulha + Rajada** (V5, n = 4, 190 px/s) — boca acende 0,40 s em +1,0; 4 tiros re-mirados | 2,0 s | Sim | boca acende |
| 2 | **Investida em faixa** (V6, abaixo) | ≈ 3,3 s | cabeça sim, durante todo o laço exceto a imunidade de transição | olhos + faixa branca |
| 3 | **Leque** (V4, n = 7, α = 64°) — boca acende 0,40 s, leque em +0,6 | 1,6 s | Sim | boca acende |
| — | silêncio entre verbos | incluído (0,6–0,8 s) | — | — |

**V6 — Investida em faixa (a "grande novidade" de A→F):**
1. `MIRA` 0,55 s: a cabeça vai ao ponto de partida (x = 292) com `y = y da nave` (acompanhando-a a ≤ 140 px/s); **os olhos
   brilham, crescendo** (o brilho âmbar já existe no crânio; sem estrela).
2. `TRAVA` 0,45 s: o y congela (`y_faixa`); a **faixa branca** aparece (fileira de partículas-pixel brancas assadas na
   resolução nativa, de x = 292 até `x_fim`; **não é Graphics vetorial**); a bobina se contrai (primeiros quadros do clipe
   de investida, se existir; senão, o voo acelera 1,8× por 0,45 s).
3. `LANÇA` ≈ 0,5–0,6 s: a cabeça (voltada para o oeste) corre pela faixa a `v_lança` = 380 px/s (rampa 0,12 s), até
   `x_fim = clamp(x_nave − 12, 60, 220)`. Letal: cabeça + 36 px de pescoço, meia-altura 18,9 px.
4. `SEGURA` 0,35 s em `x_fim`: **a recompensa** — a cabeça está parada no y da faixa: quem desviou e reencostou o y
   atira (a fusão é exposta).
5. `VOLTA` ≈ 1,3 s a 150 px/s ao centro da patrulha (suavizado).
- `T_cue` (nave em x = 120): 0,45 (trava) + 0,51 (viagem) = **0,96 s** (≥ 0,56); com a mira, ≈ 1,5 s.
- Desvio: ≥ 27,4 px vertical em `t_clear` = 0,31 s. A faixa **só ameaça quem estiver no y travado**; ficar muito à
  esquerda não ajuda (x_fim acompanha a nave).

**8.4 Fúrias (degraus de comportamento):**
- **Fúria 1 (≤ 66% de 80 PV = 53 PV):** patrulha ×1,25 de velocidade; leque n = 9, α = 72°; `T_trava` da faixa 0,45 → 0,42.
- **Fúria 2 (≤ 33% = 27 PV):** a Investida vira **dupla**: durante o `SEGURA` (0,45 s), uma 2ª faixa **branca** trava no y
  atual da nave e ela volta *letal* por ela (v 260 px/s) em vez de voltar à patrulha. `T_cue` da 2ª = 0,45 s: o único caso
  < 0,56 s (permitido por §0.5: 2ª de um padrão que o jogador acabou de ler).
- As **mordidas** (a 22%, 13% e 5% da vida TOTAL: pescoço, queixo, crânio) continuam: a fusão se despedaça durante a luta.

**8.5 A morte.** Ruptura nos próprios pixels (já existe); em voo, o caminho congela e o corpo cai 40 px lentamente durante a
ruptura (só trajetória; sem clipe). `pausaFinalMs` pode subir para ~1800 ms para o corpo ser lido (opcional; sinalizado em
Dependencies). Segue a Interlude3 (inalterada).

### 9. Marcação e alcance da cabeça viva (a pergunta "aberta" dele)

- **Marcação (mantém):** veias que batem como coração: 1,0 Hz calma → 2,5 Hz em alerta (trava/bote/janela/aviso da chuva);
  tiro da cor dela (azul/verde/âmbar); o acerto solta 2–4 pixels de carne. Os clipes novos (B, C) ganham quadros de veias e
  sombra assados por script (como os atuais). A fusão não tem veias: seu marcador é o **brilho dos olhos** (âmbar) e o coto fumegante.
- **Alcance (regra única, geométrica):** só o círculo do crânio, com a cabeça **≥ 6 px acima da crista**, recebe dano
  (`acimaDaCrista`); fora disso (oculta, pescoço, outras cabeças) o tiro **é absorvido com faísca** ("invulnerável é
  telégrafo, não parede": as peças que absorvem são pequenas e se movem). A fusão: só o crânio (18,9 px); o pescoço
  absorve; a bobina é transparente a tiros.
- **A cabeça viva lidera a emergência:** nos clipes B e C ela é a que sobe primeiro e mais alto (a arte precisa garantir isso;
  nas E1–E4 de A a ciano e a verde sobem juntas — checar na folha de conceitos).

### 10. Ritmo geral

| Fase | Duração (DPS_ref 5,5, jogador que desvia e atira) | Exposição ρ |
| --- | --- | --- |
| Chegada | ~5,8 s (sem dano) | — |
| A | 17,5 s | 0,52 |
| trans. A→B | 2,6 s | — |
| B | 18,2 s | 0,50 |
| trans. B→C | 2,6 s | — |
| C | 12,1 s | 0,45 |
| trans. C→F | ~5,5 s | — |
| Fusão | 20,8 s | 0,70 |
| **Total** | **≈ 85 s** (faixa-alvo 72–100 s) | |

---

## Formulas

**Variáveis:** `v_s` = 110 px/s (nave); `a_s` = 900 px/s²; caixa da nave 21×9 (meias 10,5 × 4,5);
`r_h` = 16,5 px (formas) / 18,9 px (fusão) (raio do círculo do crânio); `m` = 4 px (margem); `t_react` = 0,25 s
(reação humana de projeto).

**F1 — Tempo para limpar uma distância d** (aceleração até `v_s`, depois constante):
`t_a = v_s/a_s = 0,122 s`; `d_a = v_s²/(2·a_s) = 6,72 px`; `t_clear(d) = t_a + (d − d_a)/v_s` para d > d_a.

**F2 — Distância de desvio:** coluna `d_col = r_h + 10,5 + m = 31,0 px` (fusão: 33,4); faixa `d_faixa = r_h(F) + 4,5 + m = 27,4 px`.
Então `t_clear(31,0) = 0,122 + 24,28/110 = 0,343 s`; `t_clear(27,4) = 0,122 + 20,68/110 = 0,310 s`.

**F3 — Orçamento de Leitura:** `T_cue_min = t_react + t_clear(d)`: coluna **0,593 s**, faixa **0,560 s**. Reflexo permitido
(2ª+ de padrão visto): `T_cue ≥ 0,6·T_cue_min` ≈ 0,356 s (coluna) / 0,336 s (faixa).
`T_cue` do bote = `T_segue + T_trava` (A: 1,00; B: 0,90; C: 0,65 +). `T_cue` da faixa = `T_trava + t_viagem`, com
`t_viagem = 0,12 + (D − 23)/380` e `D = 292 − x_nave`.

**F4 — Espaço de desvio à esquerda:** `sobra_esq = bordaX − d_col − x_min_nave`; com `bordaX = 80`, `d_col = 31`,
`x_min_nave ≈ 10,5` → **38,5 px de folga** além do necessário (alvo ≥ 40 px do centro: 80 − 31 = 49 ≥ 40 ✓).
Vertical da faixa: para qualquer y da nave a distância ao centro da tela garante ≥ 27,4 px em pelo menos um sentido ✓.

**F5 — Tempo da lombada:** `t_corre = |x_origem − x_alvo| / v_corre` (v_corre = 300 px/s; sítio mais distante da nave:
|300 − 80| = 220 px → 0,73 s). `t_segue`: ponta anda a `v_segue` = 160 px/s (> 110: correr não ajuda).

**F6 — Corredor da chuva:** `v_req = deriva · passo / entreOndas` = A: 1·24/0,55 = **43,6 px/s**; B: 2·24/0,55 = **87,3 px/s**
(≤ 110 ✓). Largura livre = `(vão+1)·passo − larg_gota` = 4·24 − 9 = **87 px**; folga por lado 33 px (nave de 21).
Vagas: `⌊(278 − 14)/24⌋ + 1 = 12`; onda = 12 − 3 = 9 gotas; `max_vao_inicio = 12 − 3 − 1 = 8`.

**F7 — Duração de uma forma:** `T_forma = PV_forma / (DPS_ref · ρ_eff)`, com `DPS_ref = 5,5 PV/s` (laser base 4,5 a 7/s do
Pulse; **a medir**), `ρ_eff = ρ_bruta · p_acerto`. **Os ρ citados nas formas e nas tabelas (0,52 / 0,50 / 0,45 / 0,70) já são
ρ_eff** (incluem a parte da janela em que o jogador está desviando em vez de mirando). A: 50/(5,5·0,52) = 17,5 s; B: 18,2 s; C: 30/(5,5·0,45) = 12,1 s; F: 80/(5,5·0,70) = 20,8 s.
Total = 68,6 + transições 10,7 + chegada ~5,8 ≈ **85 s**. Sensibilidade: DPS_ref 4,5 → ≈ 101 s; 9,0 → ≈ 57 s.

**F8 — Leque de perto:** cunha de meia-altura `h(D) = D·tan(α/2)`; distância de saída `d_leque(D) = h(D) + 9 + m`. Condição:
`t_react + t_clear(d_leque) ≤ T_aviso + D/v_tiro`. B (D = 50, α = 48°, v = 155): h = 22,3; d = 35,3; t = 0,382; 0,25 + 0,382 = 0,632 ≤ 0,40 + 0,32 = 0,72 ✓ (folga
0,09 s). Mínimo seguro D = 30 px (0,59 ≤ 0,59, no limite) — por isso a cabeça nunca fica a < 31 px da nave na janela.
Espaçamento entre tiros em D: `D·α_rad/(n−1)`: fusão n = 7, 64°, D = 150 → 27,9 px (≥ 20 para a nave de 9 de altura + tiro).

**F9 — Patrulha da fusão:** `x(t) = 245 + 38·sin(2π t / 5,6)`, `y(t) = 78 + 22·sin(2π t / 3,7 + φ)`, `φ` sorteada por luta.
`v_max,x = 38·2π/5,6 = 42,6 px/s`; `v_max,y = 22·2π/3,7 = 37,4 px/s`; ×1,25 na Fúria 1.

**F10 — Aperto (curvas):** `aperto = 1 − PV_forma/PV_max` (0→1). A: `T_trava = lerp(0,60; 0,55; aperto)`, `REPOUSO = lerp(1,6; 1,0; aperto)`. B: `T_b = lerp(2,8; 2,0; aperto)`.
C: `T_hop = lerp(1,30; 1,15; aperto)`.

**F11 — Balas simultâneas (pico):** chuva A = 3 ondas·9 + 9 do cuspe = 36; B = 18 + 6 = 24; leque F n = 9 + rajada 4 (exclusivos) ≤ 13; o pool compartilhado é de 128 → folga > 85 ✓.

---

## Tuning Knobs (todos em `numerosSerpente.ts`; nada fixo em outro lugar)

| Knob | Padrão | Faixa | Categoria | Razão |
| --- | --- | --- | --- | --- |
| `LUTA.investida.bordaX` | **80** (era 60) | 70–100 | gate | espaço à esquerda ≥ 40 px (F4) |
| `T_trava` A / B / C | 0,60 / 0,50 / 0,40 | 0,35–0,75 | feel | leitura → reflexo (F3) |
| `T_segue` A / B / C | 0,40 / 0,40 / 0,25 | 0,2–0,6 | feel | pista de seguimento |
| `v_corre`, `v_segue` | 300, 160 | 220–380; 120–200 | feel | lombada legível a 384×216 |
| `v_bote` | 700 | 500–900 | feel | peso do estouro |
| `janela` A / B / C | 1,7 / 1,2 / 0,5 (0,9) | ±40% | curve | razão de exposição ρ |
| `dente` (momento, tipo) | ver §3 | — | feel | janela nunca grátis |
| `T_b` (B) | 2,8 → 2,0 | 1,6–3,4 | curve | metrônomo |
| `T_hop` (C), `T_racha` | 1,30 → 1,15; 0,40 | 1,0–1,6; 0,3–0,5 | curve/feel | frenesi |
| chuva: `aviso`, `entreOndas`, `vao`, `deriva`, `vel` | 0,7; 0,55; 3; A1/B2; 100 | ver F6 | feel | fair-play do vão |
| PV A / B / C / F | 50 / 50 / 30 / 80 (= 210) | ±30% | curve | duração (F7) |
| `ρ` alvo por forma | 0,52 / 0,50 / 0,45 / 0,70 | ±0,08 | curve | duração |
| Fusão: centro, A_x, A_y, períodos | (245,78), 38, 22, 5,6/3,7 | ±25% | feel | trackability |
| Fusão: `v_lança`, `T_trava_faixa`, `T_mira` | 380, 0,45, 0,55 | 280–450; 0,36–0,6 | feel | reflexo da fusão |
| Fúrias | 66% / 33% | 70–60%; 40–25% | gate | rampa final |
| Respiro pós-dano da nave | 0,8 s (+ ao próximo bote/faixa depois de a nave levar acerto) | 0–1,5 | gate | evita morte em cadeia |
| `T_cue_min` (verificado por teste) | 0,59 / 0,56 | — | gate | invariante (§0.5) |

---

## Edge Cases

| Situação | Tratamento |
| --- | --- |
| Nave acampada em x < 49 (fora de toda coluna travada) | O bote trava em x = 80 e a janela tem **dente** (3 tiros mirados; leque de perto), a chuva cobre x ≥ 14; a faixa da fusão acompanha o x da nave. Ninguém tem janela de graça. |
| Nave sobre a faixa do casco (y > 150) quando a coluna trava | A coluna vai até o pé da tela; o desvio é horizontal (31 px). Sem exceção. |
| Nave acima da altura máxima da cabeça (y < 60) | A cabeça sobe só até o posto alto; o jogador desce para atirar. A chuva (que cobre o alto) pune quem fica lá. |
| Dano que mata a cabeça no meio de um bote/salto | `recolher()`: a cadeia 0,55 s toca, ela desce onde está; a lombada ferida corre ao 1º sítio. |
| Cabeça morre durante a `TRAVA` ou o `RACHA` | A trava/rachadura cai (sem bote), a toca cura em 1,5 s. |
| Bomba ou míssil acertam quando ela está **oculta** | Sem dano (`corpo = nada`); a nave perde o tiro. |
| Bomba/míssil acertam na janela e matam uma forma de uma vez | **Sinalização:** dano de bomba/míssil é compartilhado e não medido; regra de projeto: PV da forma ≥ 3× o dano de um acerto de bomba; se violada, imunidade de 0,55 s resolve o resto. Ver Dependencies. |
| A nave leva dano e tem 1,4 s de invulnerabilidade | O próximo telégrafo letal só começa 0,8 s depois do acerto (respiro pós-dano); nunca encurta o aviso. |
| Duas tocas a < 60 px | Fundem em uma (a mais velha é reutilizada; sem rachadura nova). |
| Sítio de salto cairia a < 70 px da nave | Sorteia o próximo mais distante; se nenhum cumpre, usa o rombo. |
| Nave à direita de todos os sítios (x > 250) | O salto usa o rombo ou o sítio mais à direita; a regra "da direita da nave" é relaxada para ≥ 70 px **à esquerda** só se a nave estiver em x > 270. |
| Cadeia de C com a nave se movendo | x₁, x₂ fixos no início; x₃ é a nave na trava. A convergência é um padrão, e a nave rápida só muda o x₃. |
| Fusão em voo com a nave no teto/chão | A faixa trava no y da nave (até y = 16 / 200); a margem vertical é ≥ 27,4 px em algum sentido (F4). |
| Fusão sai da tela à direita (bobina) | Clipe aceito (≤ 22 px da bobina fora da tela no pior ponto da patrulha); a cabeça nunca sai. |
| Fusão morre durante a faixa | Congela o caminho, ruptura nos próprios pixels, o corpo cai 40 px; a faixa e o rastro somem em 0,2 s. |
| Jogador morre no meio da luta | O estado do chefão **não reinicia** (comportamento atual de vidas); só se reseta o respiro pós-dano. Se ele quiser reiniciar o chefão ao perder uma vida, é mudança de sistema compartilhado. |
| Cartas de tiro/escudo/dash/tempo (`intocavel`, `absorver`, `Dash`) | Todas as ameaças usam o mesmo `damageShip()`: a invulnerabilidade delas vale; nada neste desenho assume que não existam. |
| Pool de balas lotado (128) | O pico projetado é ≤ 40 (F11); se `get()` retornar nulo, a chuva perde a gota (vão maior, não menor) — nunca o vão fecha. |
| **Estratégia degenerada: ficar sempre em y de cima** | A chuva (A e B) e o leque/faixa da fusão cobrem o alto; a cabeça sobe no máximo ao posto alto, e o dente pune a janela; sem zona segura permanente. |
| **Estratégia degenerada: ficar à direita do bote** | Os sítios de salto só nascem à direita da nave; ficar à direita expõe à cadeia de C e ao x₁/x₂; a regra de relaxamento acima cobre o caso extremo. |
| **Estratégia degenerada: atirar só nas janelas e fugir** | É a estratégia esperada: ρ ≈ 0,5 foi calculada para ela; o "dente" e as chuvas impedem a imunidade total. |

---

## Dependencies

### A. Do que o redesenho depende (e o que fornece)

- **Entrega:** `BossSerpente.ts`, `numerosSerpente.ts`, `cascoVivo.ts` (tocas persistentes, lábios, cura), `gestoSerpente.ts`
  (dados dos clipes novos: origem, cabeça por quadro, bocas), `serpenteFusao.ts` (mordidas em voo), scripts em `scripts/_serpente/`.
- **Exige de quem chama:** o contrato `StageBoss` como está (`targets`, `destrocos`, `mundo`, `perigos` opcional,
  `pausaFinalMs` opcional) e o mundo **parado** do rombo em diante.

### B. SINALIZAÇÕES para a sessão principal (sistemas compartilhados — não editei nada)

1. **`BootScene.ts` — carregar/registrar** os assets novos: texturas/anims `serpenteEmergeB*`, `serpenteEmergeC*`, `serpenteFusaoSubida*`,
   `serpenteFusaoVoo*`, (`serpenteFusaoInvest*`), `serpenteRomboRuina`, veias/sombra dos clipes novos. Chaves novas; **nenhuma renomeada ou reaproveitada** do que outros usam.
2. **`Parallax.ts`:** a troca da textura da faixa do rombo para a ruína acontece **dentro do objeto que o chefão já recebe** (`rombo`: `setTexture`,
   como já se faz na chegada); só pedir à principal para **confirmar** que `inserirNoCasco`/`pecasDoCasco` não recriam a faixa com a textura antiga.
3. **`GameScene.ts` — overlap nave×boss:** continua `overlap(ship, boss.sprite)` e `overlap(ship, boss.perigos)`. O corpo letal por estado (coluna/cabeça/pescoço) é
   formado **dentro** do `BossSerpente` (`aplicarCorpo`), sem tocar a cena. **Confirmar** que um corpo estreito (cabeça + 36 px de pescoço) na fusão
   também **absorve tiro** só nele (a bobina sem colisão).
4. **`EnemySystem`:** pool de balas de inimigos (128, compartilhado); pico do desenho ≤ 40 (F11). Sem mudança; **conferir** que nenhuma chamada de
   outros sistemas lota o pool na Fase 3 durante o chefão.
5. **Dano de bomba/míssil/cartas (sistemas compartilhados):** o PV por forma assume `dano de um acerto ≤ PV_forma/3`. **Medir** o dano de bomba e míssil
   na F3 antes de calibrar; se estourar, a imunidade de 0,55 s das transições não basta.
6. **Motor de destroços (`Destrocos`):** o desenho usa **apenas a API que já usa** (`arena.estourar`, mordidas, ruptura). Qualquer necessidade nova de material
   (poeira de ruína do rombo) é pedido separado.
7. **`pausaFinalMs`** (opcional) para ~1800 ms na morte da fusão em voo. Campo existente do `StageBoss`; só usar com o OK da principal.
8. **A velocidade do mundo** continua 0 depois do rombo (a luta é em arena parada). Se a principal quiser um mundo que rola, é outro desenho.
9. **Nada** muda em: nave, cartas, HUD (a barra de 160 px mostra os 210), roteiro do estágio (banner 91 s, chefão 95 s, defesas do casco 80–85 s), outros chefões, Interlude3.

### C. Lista de arte (clipes PixelLab, ~2–4 gerações cada; a peça PENDENTE é a que se testa, nunca a aprovada)

Antes de instalar qualquer coisa: **folha com 3–4 conceitos por clipe**, cada geração conferida AMPLIADA, e filme por GIF (regra dele).

| # | Clipe / peça | Forma | Tipo | Quadros | Notas e risco | Plano B |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `emerge-A` | A | **instalar a E2 crua de 29/10** (cru/E2) | 17 | já existe; precisa da pose final "erguida" + 1 quadro de espiada; assar veias/sombra | gerar de novo 1× se o loop de pose não fechar |
| 2 | `emerge-B` | B | **NOVO** (PixelLab, da arte aprovada B) | 17 | subida cortada na linha do chão; termina em pose de boca aberta; **a verde sobe primeiro e mais alto** | reaproveitar `erguer-B` (já tem cabeça por quadro) com a toca B por baixo |
| 3 | `emerge-C` | C | **NOVO** | 17 | idem; o pescoço da laranja é estreito (44 px de toca) | reaproveitar `erguer-C` |
| 4 | `fusao-subida` | Fusão | **NOVO** | ≈ 19 | começa cortado (no rombo), termina **livre** (sem corte): a transição mais difícil | fusão cai para a opção 3-C (presa, só caça) |
| 5 | `fusao-voo` | Fusão | **NOVO** (loop) | 9 | a cauda/bobina ondula, a cabeça balança; **loop não fecha** → tocar ida-e-volta | playback do idle da fusão acelerado + a cauda parada: não aprovo |
| 6 | `fusao-investida` | Fusão | **OPCIONAL** | 9–12 | esticar o corpo na direção da lança; segura o último quadro | voo acelerado 1,8× (já previsto) |
| 7 | `rombo-ruina` | arena | imagem parada, a partir da arte aprovada (recorte/inpaint) | 1 | borda do rombo rasgada; sem peça de cenário nova | reaproveitar `serpenteRombo` + estourar o lábio |
| 8 | veias/sombra dos clipes 1–4 | — | script de assar por quadro (não é geração) | — | o mesmo pipeline do erguer | — |

**Contagem honesta:** novos = **4** (2, 3, 4, 5) + **1 opcional** (6) + 1 instalação (1) + 1 imagem (7) ≈ 12–16 gerações
(+ 2–4 se o opcional entrar). Fork 1-B somaria 5–6 clipes; 2-B tira o 3; 3-B soma 1.

---

## Acceptance Criteria

### Funcionais (teste puro de Node, sem Phaser: `scripts/test-serpente.mjs` ampliado)
1. **F1–F4:** os `T_cue` calculados de `numerosSerpente.ts` (por forma e por verbo) são ≥ `T_cue_min` (0,59 / 0,56), exceto as ameaças marcadas "2ª de padrão" (≥ 0,6×).
2. **Sobra à esquerda:** `bordaX − d_col ≥ 40 px` (80 − 31 = 49).
3. **Vão da chuva:** largura livre ≥ 87 px; `v_req` ≤ 100% de `v_s` (B = 79%); corredor sempre existe (nenhuma onda sem vão).
4. **Exclusão mútua:** nenhum teste de sequência produz dois telégrafos letais simultâneos.
5. **Dano:** oculta = 0 dano; a cabeça só recebe dano com o crânio ≥ 6 px acima da crista; o corpo/outras cabeças/pescoço absorvem com faísca.
6. **Soma de PV** = 210; ordem das mortes ciano → verde → laranja → fusão; a troca de arte só ocorre com `corpo = nada`.
7. **Nada de sobreposição escura:** nenhum objeto de "corte escuro" criado nas tocas (varrer o grafo de cena em um quadro da emergência).
8. **Pool:** pico de balas ≤ 40 em todo o laço.

### Sondas em jogo (`_sonda-luta.mjs`; 20 execuções por perfil; DPS_ref 5,5 PV/s)
| Perfil | O que faz | Critério |
| --- | --- | --- |
| **P0 parado** | nave em (110, 110), atira sempre | contatos totais **≥ 8** e ≥ 2 por forma; com 3 vidas ele **morre antes de a luta acabar em ≥ 90% das execuções** |
| **P1 leitor** | reage a cada pista com latência 0,25 ± 0,05 s, vai ao lado seguro mais próximo a 110 px/s, realinha o y com a cabeça e atira | contatos totais **2–5 (mediana ≈ 3), P95 ≤ 7**; ≥ 1 acerto por forma é aceitável; > 2 por forma = recalibrar |
| **P2 desvia** | perfeito (0 s de latência), conhece o roteiro | contatos totais **≤ 1** |

### Duração e ritmo
9. **Duração total** (nascimento → último golpe) de P2 com DPS_ref 5,5: **72–100 s**; por forma: A 14–22, B 14–22, C 9–15, F 16–26 s.
10. **Razão de exposição BRUTA** (tempo com o crânio ≥ 6 px acima da crista ÷ tempo da forma, medida pela sonda): A 0,55–0,65, B 0,50–0,60 (0,61 no início, 0,45 no fim), C 0,50–0,60, F ≥ 0,85 (sempre exposta fora das transições). A ρ_eff do projeto (F7) é conferida indiretamente pela duração (item 9).
11. **Razão estática (STR)** — fração do tempo em que o centroide da silhueta se move < 6 px **e** só o idle toca: **≤ 0,25 por forma**. (A linha de base do backup deve ser medida pela mesma sonda; a estimativa de projeto é 0,6–0,7, não medida.)
12. **Mobilidade por forma** (realocações da cabeça ≥ 40 px por 10 s): A ≥ 2,5; B ≥ 3,5; C ≥ 6; F: velocidade média da cabeça fora das faixas ≥ 25 px/s.

### Experienciais (playtest por GIF/filme em velocidade real, regra dele)
13. **Ele vê "movimento": cada forma tem uma pista visual de que o corpo vai a outro lugar antes da emersão** (lombada/poeira/rachadura). Nenhum quadro mostra o desenho inteiro deslizando.
14. **Leitura de cores:** em um quadro parado a 1× (384×216) da trava, a ponta branca ocupa ≥ 3 px de largura × 24 px de altura de pixels claros e há ≥ 6 partículas de poeira; a âmbar é distinguível da branca (contraste de matiz) — validar em captura real, não na folha ampliada.
15. **A fusão "se desgarra":** o evento do rasgo é lido como clímax (a pergunta ao playtest: "ela é outra criatura?"). O voo não é lido como "sprite deslizando" por 5 de 5 testadores.
16. **Dificuldade percebida:** "difícil pela leitura, um pouco de reflexo": P1 relata que 80% das mortes foram "não li o aviso a tempo" e ≤ 20% foram "não deu tempo de reagir".
17. **Respiro:** cada forma tem ≥ 1,0 s de nada letal depois da transição.

---

## Pontos em aberto (sinalizações para ele e para a sessão principal)

1. **Duração (INTENT UNKNOWN):** proposta ≈ 85 s (hoje 42 s). Se ele quer ~60 s, subir ρ para ≈ 0,65 e/ou PV 180–190; o HP e a razão de exposição são os dois botões.
2. **Tom (INTENT UNKNOWN):** Pavor → Caça → Frenesi → Duelo. A confirmar.
3. **`DPS_ref` não medido** (laser base 4,5/s; Pulse 7/s; cartas mudam): toda a duração depende dele; a sonda `_sonda-luta.mjs` precisa de um perfil por carga de armas.
4. **Escala entre chefões:** ele disse que os chefões ainda não foram escalados entre si; esta luta fica sensivelmente mais longa e mais exigente que a Torre e a Capitânia.
5. **Riscos de arte:** os clipes 4 e 5 (subida e voo da fusão) são o maior risco da luta; a fusão tem o plano B 3-C documentado; "loop não fecha" e "perde identidade" são conhecidos do PixelLab.
6. **O `balance-check` não gerou relatório**: não há dados em `assets/data/` nem alvos num GDD para ele julgar; os números acima são **modelados**, não medidos (NOT ASSESSED — NO DATA). Rodar depois da primeira sonda.
7. **Sons:** fora do escopo, respeitado.
