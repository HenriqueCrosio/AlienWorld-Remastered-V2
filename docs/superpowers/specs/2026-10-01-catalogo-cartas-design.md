# Spec — O catálogo de cartas: 21 cartas que cabem no jogo (01/10/2026)

> Estado: **desenho aprovado com o Henrique em 01/10** (a revisar no arquivo). É a **frente A** da ordem combinada
> (A = catálogo → B = inimigos novos que atiram + ondas maiores → C = calibragem). Branch `feat/cartas-preview`.
> Fonte: `sistema_de_cartas_skills_shoot_em_up_v2.md` (o documento dele, 25 cartas) e as 13 do protótipo de 27/09.
> Folhas: `docs/superpowers/folhas/2026-10-01/pecas-novas-conceitos.png` (1ª rodada) e a 2ª rodada (drones pequenos,
> míssil médio, flare animado) — §5.

## 1. Por quê

O protótipo tinha 13 cartas, recortadas do documento dele sem olhar o jogo. O Henrique (01/10): *"existem cartas que
não vão de encontro com o jogo"* e, com o ganho que elas dão, *"as fases vão ser passeios no parque"*. O alvo: **até
25, fechado em 21**, cada uma revisada contra o que o jogo É:

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

## 3. As 21 cartas

Números são **provisórios** (vão para a calibragem, frente C). `máx` = quantas vezes pode ser pega. Nenhum nome passa
de 14 letras (a letra da mesa é uma só para todas — spec `2026-09-30-mesa-compacta-arte-design.md` §3.2).

### 🔫 Armamento (7)

| ID | Nome | Raridade | Efeito | Requer | Máx |
|---|---|---|---|---|---|
| WPN_001 | TIRO DUPLO | comum | 2 projéteis | — | 1 |
| WPN_002 | TIRO TRIPLO | incomum | 3 em leque (substitui o Duplo) | — | 1 |
| WPN_004 | CADÊNCIA | comum | +15% de cadência | — | 3 |
| WPN_007 | PERFURANTE | incomum | o tiro atravessa inimigos | — | 1 |
| WPN_008 | TIRO PESADO | rara | dano ×2, tiro mais lento | — | 1 |
| WPN_009 🆕 | MÍSSIL GUIADO | incomum | a cada ~3s um míssil persegue o inimigo mais próximo e **explode ao acertar** | — | 2 |
| WPN_010 🆕 | DRONE AUXILIAR | épica | um drone discreto acompanha a nave e dá um **tiro próprio: fraco, guiado ao inimigo mais próximo, cadência baixa** — NÃO copia Duplo/Triplo/Cadência da nave | — | 1 |

### 💥 Efeito (7)

| ID | Nome | Raridade | Efeito | Requer | Máx |
|---|---|---|---|---|---|
| EFF_001 | EXPLOSIVO | incomum | o tiro explode ao acertar | — | 1 |
| EFF_002 🆕 | EXPLOSÃO MAIOR | rara | toda explosão fica maior | Explosivo | 1 |
| EFF_003 🆕 | FRAGMENTAÇÃO | rara | toda explosão solta 4–6 estilhaços em leque | Explosivo | 1 |
| EFF_004 | INCENDIÁRIO | incomum | chance de incendiar | — | 1 |
| EFF_006 | COMBUSTÃO | épica | o inimigo queimado explode ao morrer | Incendiário | 1 |
| EFF_007 🆕 | EM CADEIA | épica | toda explosão incendeia quem está no raio | Incendiário + Combustão | 1 |
| EFF_010 🆕 | FLARE | incomum | a cada ~4s solta um flare para trás; ele **explode no inimigo que tocar** — e, se ninguém tocar, **explode sozinho depois de ~3s** (armadilha para quem persegue, bomba de retaguarda para quem escapou) | — | 1 |

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

**Distribuição:** 5 comuns · 7 incomuns · 6 raras · 3 épicas. Três cadeias: **fogo** (Incendiário → Combustão → Em
Cadeia), **explosões** (Explosivo → Explosão Maior / Fragmentação), **casco** (Casco → Recarga / Casco Reativo).

## 4. As regras novas

### 4.1 A explosão é UM sistema

Hoje cada carta explode do seu jeito (`CartasEmJogo`). Passa a haver **uma função de explosão** do jogo do jogador:
o tiro Explosivo, a Combustão, o Casco Reativo, o Flare e o Míssil Guiado chamam a mesma. Nela se penduram:
- **Explosão Maior** → multiplica o raio;
- **Fragmentação** → solta os estilhaços;
- **Em Cadeia** → incendeia quem está no raio.

Assim as cadeias se cruzam (o Míssil com Fragmentação; o Flare com Em Cadeia) sem carta nova. **Os estilhaços não
fazem explosão nova** (sem recursão infinita); **Em Cadeia incendeia, não explode** — quem explode é a Combustão
quando o queimado morre.

### 4.2 O Dash

| | Valor (provisório) |
|---|---|
| Comando | **dois toques** na mesma direção (W/A/S/D ou setas), até ~0,22s entre eles; vale só se a tecla foi **solta e apertada de novo**; só existe para quem tem a carta |
| Direção | a dos dois toques (as 4 direções) |
| Movimento | ~40px do mundo em ~0,15s |
| Invulnerável | durante o dash (~0,2s) — escapar de tiro, míssil, enxame, dano certo |
| Espera | ~2,5s; **"DASH"** aceso na HUD quando pronto (como o "CASCO") |
| Fases | fora da F1 (voo por impulso) |
| Visual | **imagens-fantasma** da própria sprite (3 cópias que somem) — vale para as 6 naves sem arte nova |
| Controle (etapa 1.6) | um botão (o duplo toque no analógico não é confiável) — decidido na spec do controle |

⚠️ Dash invulnerável + Casco podem voltar a facilitar: **a espera do dash é o número que segura isso** na calibragem.

### 4.3 O Drone e o Míssil não se repetem

| | Drone Auxiliar | Míssil Guiado |
|---|---|---|
| Tiro | leve, guiado, constante, cadência baixa | forte, raro (~3s) |
| Papel | conforto: limpa quem você não está mirando | dano em área: **explode** e entra na cadeia das explosões |

O drone é **um por linhagem**: humano = esfera pequena (estilo astromecânico, redondo); alien = água-viva pequena nas
cores da manta. Discreto, segue a nave com atraso curto.

### 4.4 O resto

- **Recarga** passa a máx. 1 (com 2 chegava a 3,5s — quase invulnerável).
- **Bomba Extra** soma às 3 bombas de cada vida.
- O **requisito** aparece na carta como "REQUER …" dentro do visor (a mesa nova já faz).
- Os IDs novos não reaproveitam os das cartas cortadas.

## 5. A arte (PixelLab, folha antes de instalar)

| Peça | Direção (dele) | Estado |
|---|---|---|
| Drone humano | esfera pequena, estilo astromecânico, redonda; discreto | 2ª rodada (16×16) |
| Drone alien | água-viva pequena nas cores da manta | 2ª rodada (16×16) |
| Míssil do jogador | tamanho entre o #36 e o #19 da 1ª rodada — reconhecível | 2ª rodada |
| Flare | estilo do #22, com **animação própria** (luz e faíscas saindo) | animação do #22 |
| Dash | **imagens-fantasma**, sem arte | código |
| Estilhaço | pequeno, do material da explosão | depois |
| 21 ícones | nas cores reais do objeto (spec da mesa §2.2) | depois do catálogo — a Task 4 da mesa roda com estes IDs |

Regra: partir da arte aprovada; folha crua + em cena na escala real; ele escolhe antes de instalar.

## 6. Ordem de construção

1. O catálogo no código (`src/cartas.ts`: entram 8, saem nenhuma das 13, Recarga máx. 1) + o **sistema único de
   explosão**.
2. As mecânicas novas com **arte provisória** (formas simples) — ele joga e sente: Míssil, Drone, Flare, Fragmentação,
   Em Cadeia, Explosão Maior, Bomba Extra, Dash.
3. A arte aprovada entra no lugar da provisória; os 21 ícones (Task 4 da mesa).

## 7. Fora desta spec

- Os inimigos novos que atiram e as ondas maiores (**frente B**) e todos os números (**frente C**).
- O botão do Dash no controle (etapa 1.6).

## 8. Testes

- `probe-cartas` e `probe-mesa-texto` continuam passando — a mesa agora com **21** cartas (o tamanho único da letra é
  recalculado com os nomes novos; nenhum passa de 14 letras).
- Uma sonda nova por mecânica (`probe-cartas-novas`): cada carta aplicada faz o que diz (o míssil persegue e explode; o
  flare explode sozinho; o dash atravessa um tiro sem dano; a Fragmentação solta estilhaços; a Bomba Extra soma).
