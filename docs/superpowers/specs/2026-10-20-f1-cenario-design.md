# BLOCO G — a Fase 1 refeita: o perímetro da colônia caindo (20/10/2026)

> Desenho aprovado por ele em 20/10, em quatro partes, mais duas adições no fim (a explosão da cena final e a nave a
> 45° na subida). A porta de entrada é esta spec; o roadmap vivo é o 🧭 do `docs/HANDOFF.md`.
> Folhas da conversa: `docs/superpowers/folhas/2026-10-20/f1-cenario/hoje.html` (a fase como estava) e `pintura.html`
> (a pintura nova reduzida).

## 1. Por que

A F1 foi a primeira fase feita, meses atrás, e destoa de tudo o que veio depois. Ele: *"Ela distoa demais, entendo que
ela foi a primeira fase a ser desenvolvida há meses atrás, normal que seja mais simples e sem os novos conhecimentos"*.
O que a separa das outras fases e do menu, medido no jogo:

- **O fundo é código, não pintura.** A pintura antiga (`paint-bg-f1`, 768×394) fica quase toda coberta por um céu em
  degradê, montanhas de pixel (`mtnMid`) pintadas de um azul só pelo `tint`, um horizonte de prédios (`skyline`) e
  pontos ciano desenhados pelo código (`colonyLight`).
- **A luz não conta nada.** Nenhuma janela acesa, nenhum foco quente; a peça mais clara da cena é um pilar de rocha
  azul-gelo, fora da paleta.
- **As peças são de famílias diferentes.** Cada construção veio de uma geração, com estilo e escala próprios (o silo
  com faixa amarela, a torre de treliça clara, a base redonda sobre uma laje cinza reta). O pilar é ESTICADO na
  altura (`setScale(1, 0,55–1,25)`), o que quebra o 1 px de arte = 1 px de jogo.
- **Não há vida** (só pontos à deriva e um cometa raro) e **a profundidade é fraca** (a mesma arte em duas faixas).

## 2. As decisões dele (20/10)

| # | Decisão | As palavras dele |
|---|---|---|
| 1 | **O visual primeiro, a jogabilidade depois.** Nova ordem dos blocos: G → H → I → J → F. | *"vamos tratar tudo que é visual primeiro. Depois jogabilidade… prefiro alternar a F com a G"* |
| 2 | **A referência é a do menu (B)**, como QUALIDADE e TÉCNICA, não como lugar. | *"a F1 nao vai se passar no mesmo cenário do menu, será como se a nave estivesse rondando a colonia ou em outro lugar"* |
| 3 | **O lugar: o perímetro da colônia de cúpulas** — a mesma que a cena final mostra em ruínas (capítulo 6, `f8-sobrevoo.png`). | *"A, no perímetro da colônia de cúpulas"* |
| 4 | **O estado: a colônia caindo, tomada pelos invasores.** | *"A F1 inicia com a nave do jogador tentando conter o avanço da invasão, mas o cenário já está tomado por torres, inimigos, destruição."* |
| 5 | **UMA pintura só**, como nas outras fases; a mudança ao longo da fase vem da luz e dos efeitos, nunca de artes novas. | *"se o cenário avançar com o roteiro, vamos ter que criar 5 artes e com perigo de distoar"* |
| 6 | **A divisão:** a pintura é dele; a cordilheira, as peças, os efeitos e o chefão são meus. | *"Combinado"* |
| 7 | **A pintura:** `assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png` (1768×890), *"uma imagem que mostra a colônia distante"*. Aprovada como está. | — |
| 8 | **O fundo é a pintura INTEIRA**, reduzida à altura da tela — nunca um recorte ampliado. | *"todos os fundos das fases são no tamanho original da pintura, exatamente para dar o aspecto de grandeza e profundidade"* |
| 9 | **A explosão da queda do Leviatã** (cena final) vira fonte das explosões do jogo. | *"a explosão, poeira etc da explosão da cutscene final quando leviatã cai. Isso pode servir de complemento para as explosões do jogo"* |
| 10 | **Na subida para o zero-G, a nave travada a 45°, bico para cima.** | *"quero que você trave a nave num angulo de 45 graus… como se ele tivesse o bico apontado para cima"* |

## 3. As leis que valem aqui

- **Dark sci-fi:** casco escuro, contraste baixo, luz só onde há energia (memória `correcao-rumo-dark-sci-fi`).
- **A pintura entra inteira, em escala 1,** reduzida do original num passo só (lanczos3); reduzir pode, ampliar nunca
  (`fundos-pintados-resolucao-nativa`). O que vive POR CIMA dela é o que muda (`docs/CENARIO-VIVO.md` §0).
- **Efeito de cenário se assa em pixel,** na paleta da pintura; `Graphics` vetorial lê como gerado
  (`efeito-de-cena-assado-em-pixel`). Peça ≲ 8 px se desenha em pixel (`pecas-minusculas-em-pixel`).
- **O que vai para trás diminui, escurece e anda mais devagar** (`camada-de-tras-diminui`).
- **O que se prende ao chão tem pé desenhado** que o agarre (`superficie-da-camada-do-jogo`).
- **Arena de chefão: só a pintura,** zero peça de cenário (`arena-chefao-so-fundo`).
- **A dificuldade da F1 está FECHADA:** vida, pontos, áreas de colisão e o roteiro não mudam neste bloco.
- **Arte nova:** 3–4 conceitos numa folha, no jogo e no tamanho real; ele escolhe; conferir cada geração ampliada
  antes de mostrar; GIF em jogo no fim. O que sai vai para `assets/raw/*-original.png`.

## 4. Parte 1 — as camadas, do fundo para a frente

| # | Camada | O que é |
|---|---|---|
| 1 | **A pintura, inteira** | 429×216 (a 1768×890 reduzida à altura 216), em escala 1. A sobra de 45 px vira a deriva da fase inteira — lentíssima, como o que está muito longe. **Separada em céu e montanhas** por uma máscara na linha das montanhas (eu faço, ele confere), para as naves invasoras e a fumaça passarem por trás das montanhas. Presos à pintura: as janelas que apagam, os faróis que piscam, a cachoeira e o rio correndo (as técnicas do menu, §2 e §1 do `CENARIO-VIVO.md`). |
| 2 | **A invasão** | Entre o céu e as montanhas, e por cima delas (§5). |
| 3 | **A bruma em faixas** | A das fases, separando os planos, na cor da névoa da pintura. |
| 4 | **A cordilheira** | Duas faixas novas que se repetem sem emenda, **tiradas das montanhas da frente da própria pintura** (recorte e extensão, a mesma mão), sem `tint` de código. A de trás menor, mais escura e mais lenta (35% do mundo); a da frente a 60%. A base das duas enterrada abaixo da linha do solo (a lição do deslize de 30/08). |
| 5 | **O chão** | O `groundTile` novo, na paleta da pintura (rocha escura com neve), a faixa de solo da frente (`groundFront`) e a névoa rasteira na cor da névoa da pintura. A aresta de luz do chão (`groundRim`) se reavalia contra o chão novo. |
| 6 | **As peças do chão** | A família nova (§6). |
| 7 | **O primeiro plano** | Silhuetas escuras e rápidas (1,5× o mundo) na frente da nave, como hoje, desenhadas da família nova: rocha, antena quebrada, cúpula partida. Mesma regra de hoje: baixas, pontuais, apagadas na luta de chefão. |

**Saem:** o céu em degradê, a `paint-bg-f1` antiga, o `skyline`, as `colonyLight`, o `cometSky`, o tráfego feito com o
`enemyScout` escurecido, as duas faixas de `mtnMid` e o entulho de `asteroid`.

**Ficam como estão:** a saída da atmosfera (a pintura do zero-G, a bruma, os fachos), a lua e o vislumbre do Leviatã.

**O tratamento:** o perfil da Atmosfera da F1 (`PERFIS_FASE.faseF1`) recalculado da pintura nova (névoa = os tons
médio-escuros dela; halo = a média do âmbar aceso). O perfil `superficie` é da cena final e não muda.

## 5. Parte 2 — a invasão ao longo da fase

Tudo sobre a pintura, preso ao **relógio da fase**, e só visual: sem corpo, sem dano, fora de todo grupo de colisão.

| Tempo | O roteiro (`STAGE_1`) | O horizonte |
|---|---|---|
| **0–12 s** | rocha e drones | A colônia inteira acesa, os faróis piscando. A defesa ainda luta: 2–3 holofotes varrendo as nuvens, rajadas curtas de traçantes âmbar subindo da cidadela. |
| **12–23 s** | a colônia aparece | As primeiras naves invasoras descem das nuvens, por trás das montanhas. A primeira explosão ao longe acende as nuvens POR BAIXO (o clarão da tempestade do menu, vindo de baixo). Os primeiros incêndios nas bordas. |
| **23–47 s** | "DEFESAS DE SOLO ATIVAS" | As janelas apagam POR REGIÃO, de fora para dentro, com a falha antes de apagar. Onde o âmbar morre, acende o magenta. Os holofotes apagam um por vez; a fumaça sobe; os traçantes rareiam. |
| **47–63 s** | "FOGO CRUZADO" | Só a cidadela ainda tem âmbar. Ela cai por último: o topo fica magenta — o aviso de que a defesa foi tomada, antes de "ALERTA · TORRE DE DEFESA". |
| **63 s em diante** | o silêncio e a luta | Nada novo: o fogo, a fumaça e o magenta, quietos, para não competir com o chefão. |

**As regras (as do menu):**
- **Um evento forte por vez.** Explosão é rara e curta (no máximo uma a cada 4–6 s); o constante (fogo, fumaça) é
  lento e fraco.
- **Nada se confunde com o jogo.** O magenta do fundo fica mais apagado que os olhos dos inimigos e sempre debaixo da
  névoa; os traçantes sobem lá longe.
- **Tudo é função do tempo.** O mesmo segundo dá sempre o mesmo quadro (para filmar, sondar e testar no Node). Quem
  entra direto no chefão (o treino `B`, os atalhos de dev) vê o estado final (63 s). No sandbox, o horizonte segue o
  relógio da montagem.

**A arte dos efeitos (minha, assada em pixel na paleta da pintura):** os traçantes e os estouros no céu; a explosão ao
longe (a folha da cena final reduzida, §7.2); o fogo e a fumaça; as luzes magenta; as naves invasoras — as mesmas
inimigas da fase, reduzidas e escurecidas, só com o olho aceso.

**Muda no bloco H:** o item da F1 ("mísseis caindo nas camadas de trás") fica coberto aqui; os meteoros saem (não
combinam com uma noite de invasão).

## 6. Parte 3 — as peças do chão

**A regra de leitura:** o que tem magenta é do invasor, quebra e dá pontos; o que não tem é cenário e só se desvia.
Atirar num prédio da própria colônia passa a ter sentido: você destrói o que o invasor plantou nele.

**A jogabilidade não muda:** cada peça mantém a vida, os pontos e o QUADRO de hoje — a área de colisão sai do quadro
(`body.setSize(width × 0,6, height)` no `TerrainSystem.spawn`), então quadro igual = colisão igual.

| Hoje | Vida / pontos | Quadro | Vira |
|---|---|---|---|
| `spire` (pilar) | indestrutível | 40×61, 54×55, 54×58; esticado 0,55–1,25 na altura | **rocha escura com neve, a das montanhas da pintura.** No lugar do esticão, 3 formas assadas em 4 alturas que cobrem a MESMA faixa (o corredor do flap não muda); o sorteio passa a escolher a altura assada mais próxima. |
| `wreck` (destroço) | indestrutível | 58×34 | **destroço da colônia:** cúpula partida, antena caída. Sem magenta. |
| `building` (prédio) | 8 / 60 | 64×64 | **módulo de cúpula, tomado:** janelas âmbar quase todas mortas, um crescimento magenta preso nele. |
| `silo` | 6 / 90 | 63×64 | **tanque da colônia, tomado.** |
| `radar` | 4 / 120 | 64×57 | **antena de treliça da colônia** (as torres da cena final), tomada, ainda girando. |
| `base` | 16 / 250 | 127×128 | **a cúpula grande do perímetro, tomada** — o coração da colônia aos 41 s. |
| `turret` (atira) | 5 / 150 | 32×30 | **torre invasora cravada no chão:** biomecânica, olho magenta. A boca (`BOCAS.turret`) medida de novo na arte nova. |

- **Pé no chão:** toda peça tem um pé desenhado (entulho, rocha, a raiz da torre invasora); a faixa de solo da frente
  continua cobrindo o corte. Acaba a laje cinza reta da base.
- **As luzes das peças:** a arte é gerada parada; as janelas piscando, o magenta pulsando e a varredura do radar são
  feitos por script sobre a própria arte (como as luzes do menu), não pelo gerador — o desenho não muda de quadro
  para quadro. Substituem as animações `building-lights`, `base-lights`, `radar-scan` e `turret-idle`.
- **Como gero:** referência de DESENHO = as cúpulas e as treliças da cena final (`f8-sobrevoo.png`, a mesma colônia);
  referência de PALETA = a pintura. Vista LATERAL (o jogo é perfil; descartar o que vier de cima ou simétrico). Por
  peça, 3–4 conceitos numa folha, já na pintura e no tamanho real → ele escolhe → variações → luzes → GIF.

## 7. Parte 4 — o chefão, as explosões e a saída

### 7.1 O chefão (a Torre de Defesa)
- **A arte de agosto fica** (as duas formas que ele refez). Ela já é a torre da colônia tomada: base de fortaleza
  gótica, corpo biomecânico, olho magenta — casa com a cidadela da pintura.
- **A pluma dos propulsores:** a dívida das "colunas chapadas" é de julho, de antes da troca; na arte de hoje os
  quatro bocais só brilham. Entra uma pluma assada em pixel em cada bocal (branco → âmbar → vapor frio, como os jatos
  do letreiro do menu), forte na decolagem e respirando no voo.
- **O flash magenta da decolagem** (160 ms, tela inteira): mostrado no GIF; só muda se apagar a cadeia de estouros. A
  regra dos flashes de tela cheia segue para o J, com o item 13.
- **A arena:** só a pintura, com a colônia tomada e quieta. A base de pedra da torre é conferida contra o chão novo;
  se destoar, muda só a cor da pedra.

### 7.2 A explosão da cena final como fonte
A folha da queda do Leviatã (`f8-explosao-sheet.png`, 48 quadros de 384×216: a bola de fogo, a onda de poeira
rasteira e a coluna; `src/scenes/final/queda.ts`) vira a fonte das explosões da F1, sempre REDUZIDA (assada menor,
nunca ampliada):
- as **explosões ao longe** na colônia (§5), pequenas e escurecidas pela distância;
- a **poeira rasteira** quando a torre se arranca do chão na decolagem (`blowUpBase`);
- a **morte do chefão** (o estouro final e a fumaça, no lugar das bolinhas — o item 9 na F1);
- a destruição da **base** (a cúpula grande), com a poeira rente ao chão.

No bloco I, a mesma fonte serve ao item 9 na F2 (a fumaça do chefão) e ao item 14 (a explosão chapada da cutscene 1).

### 7.3 A subida para o zero-G
- **A nave travada a 45°, bico para cima,** durante os 6,5 s entre `breakAtmosphere()` e `victory()`: entra no ângulo
  suave (~0,4 s, sem pulo) e fica. Hoje o ângulo segue a velocidade vertical (`setAngle(clamp(vy × 0,06, ±25))` no
  `GameScene`); na subida, ele é fixo.
- **O controle continua na mão dele** (a decisão fechada nº 3: o zero-G é a recompensa com o controle na mão). O tiro
  sai reto, como já sai quando a nave inclina.
- **A coreografia da saída** (`Parallax.playAtmosphereExit`) aprende a apagar as camadas novas (a pintura, a
  cordilheira, os efeitos) como já apaga as de hoje. A pintura do zero-G, a bruma, os fachos e o Leviatã não mudam.

## 7.4 Rodada 5 — o chão das pinturas dele e a morte maior (20/10, depois do retorno dele)

**O retorno dele às rodadas 1–4:** a pintura viva e a bruma aprovadas; a invasão "perfeita"; o chefão aprovado. Mas a
cordilheira "parece mal colada", o chão e tudo que pisa nele "parece colado, sem profundidade nem técnica", "slopado
desde o início", e as peças da rodada 3 "claras demais, nem parece dark sci-fi". Pediu o chão como "uma parallax
simples com um layer na frente e outro atrás", com as estruturas entre as camadas, e a morte do chefão "maior e mais
violenta".

**O diagnóstico, medido** (brilho mediano): a rocha da pintura atrás das peças 11; as estruturas de hoje 37–70 (o pico
de gelo com pontas em 173); o chão de ladrilho 41, liso; todos os pés no mesmo y (206) — a "tira de adesivos" da F3.

**As decisões dele:** eu faço e acabo as faixas; a cordilheira sai; o chão sai das DUAS PINTURAS que ele fez para isso
("Valle Industrial Devastado sob Céu Transparente" e "Paisagem Montanhosa Sombria com Brasas", 1768×890 cada, no
quadro da pintura) na ordem A: **o Vale atrás, a Paisagem na frente dele, as duas atrás das estruturas**, e na frente
uma faixa baixa de entulho tirada do pé das pinturas.

**O que entrou** (`src/f1/chaoF1.ts`, `CHAO_F1`/`PLANTIO_F1` em `numerosF1.ts`): as faixas sem emenda (a pintura
inteira reduzida, emendada por *quilting*), o plantio das estruturas na faixa y 204–213 (a regra do casco), o entulho
da frente a 1,15 do mundo, o primeiro plano novo (o entulho espelhado, a 1,5, na frente da nave), as brasas das pinturas
tremulando por terços, a fumaça dos fogos do Vale e a queda em parallax na saída. A morte da Torre
(`src/f1/morteChefeF1.ts`): a cadeia com a explosão da queda em 84 px e a Torre adernando, o estouro em 250 px com os
48 quadros, os estilhaços cortados da própria arte, o incêndio no entulho.

**O que vem:** as estruturas refeitas escuras, sem contorno, com as pinturas dele como referência de estilo (a rodada
3 refeita).

## 8. Onde mora

- **`src/f1/`** (novo, no molde de `src/menu/`): o horizonte da F1 (a pintura em camadas, as luzes, a invasão, a
  defesa), cada peça recebendo o contexto e devolvendo `atualizar(t)`; os números em `src/f1/numerosF1.ts`. As peças
  genéricas do menu (`ritmos.ts`, `texturas.ts`, `perigo.ts`, `acaso.ts`) são reaproveitadas, não copiadas.
- **`Parallax.buildSurface`** monta o horizonte e as camadas novas e passa o relógio da fase; o `Parallax` não ganha a
  lógica da invasão (ele já tem 2.210 linhas).
- **As ferramentas** em `scripts/_g/` (as camadas, a máscara, a auditoria das luzes, as folhas, a filmagem), no molde
  de `scripts/_menu/`.

## 9. As rodadas e as conferências

Cada rodada: montada no jogo, filmada em velocidade real, mostrada numa folha; ele aprova antes da próxima.

1. **A pintura e as camadas:** a máscara do céu, a cordilheira tirada da pintura, o chão, a bruma, com a fase rodando.
2. **A invasão:** a fase inteira filmada (~70 s).
3. **As peças:** conceitos por peça → escolha → variações → luzes → GIF em jogo.
4. **O chefão, as explosões e a saída:** a pluma, a arena, a poeira, a morte, a nave a 45° e a transição.
5. **Ele joga a F1 inteira.**

**Conferências automáticas:**
- teste no Node das funções do relógio do horizonte (o mesmo `t` dá o mesmo estado; o estado final em 63 s);
- uma sonda que confere que os quadros (logo, as áreas de colisão) das peças e a faixa de alturas dos pilares são as
  de hoje, e que a boca da torre nova está dentro da arte;
- a auditoria das luzes (acesa × apagada, recortada como o jogo recorta) a cada vez que a pintura for assada;
- as sondas da F1 que existem (`probe-stage1-visual`, `probe-roster-f1`) e as de ponta a ponta (`probe-stage4`);
- o fps medido com a fase cheia (a Atmosfera já custa caro na F1).

Commit só quando ele pedir, só no nome dele, sem os GIFs e vídeos.

## 10. Fora deste bloco

- A jogabilidade (o bloco F, agora o último).
- A F2 e a cutscene 1 com a explosão nova (bloco I, itens 9 e 14).
- A regra dos flashes de tela cheia (bloco J, com o item 13).
- O menu e a cena final (o sobrevoo continua sendo a mesma colônia, agora coerente com a F1).

## 11. Riscos

- **As luzes da pintura têm 1 px:** a detecção do menu (feita em k4) precisa ser reafinada para k1, e o "apagar sem
  buraco" é mais delicado num pixel só. A auditoria responde isso na rodada 1.
- **A máscara do céu** numa pintura sem recorte (a do menu veio recortada por ele): se a automática falhar na névoa
  entre as montanhas, ele recorta à mão.
- **O PixelLab tende a gerar de cima ou simétrico:** descartar antes de mostrar.
- **O custo da fase:** a invasão soma camadas por cima da Atmosfera; medir em cada rodada.
