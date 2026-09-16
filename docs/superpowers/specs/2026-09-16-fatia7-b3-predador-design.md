# Fatia 7 · B3 — A 2ª forma do chefão final vira O PREDADOR

**Data:** 16/09/2026 · **Branch:** `feat/fase4-visual` · **Substitui:** a seção B3 de
`2026-09-06-fatia7-fase4-design.md` (o diagnóstico de lá segue valendo; este documento é a resposta).

**Aprovação:** ele aprovou as seções 1 e 2 uma a uma e mandou seguir sem esperar a revisão escrita:
*"pode implementar e fazer, corrigimos depois"*. As seções 3 e 4 são as respostas que ele deu durante
o brainstorm, costuradas por mim. O que está aqui como **knob** é ponto de partida para ajustar
jogando, não decisão fechada.

---

## 0. O que muda, em uma frase

O guardião morre, **o predador sai de dentro dele** numa explosão sangrenta, urra para a câmera,
salta girando para encarar a nave, e a luta passa a cobrar **mobilidade e leitura**: ele investe,
arremessa lava, ronda pelo chão e pelo teto, some pela direita e, no último terço, **caça no breu**.

O diagnóstico da spec de 06/09, respondido item a item:

| diagnóstico (forma 2 = coração) | resposta (forma 2 = predador) |
|---|---|
| o clímax **encolhe 25%** | surge em **0,7** (~180px, a altura da arena) — maior que o guardião na chegada |
| a mesma **família de silhueta** | bípede, vertical, garras-lâmina; nada de massa redonda |
| paleta que lê como **outro inimigo** | o vermelho-sangue e a casca do guardião nos ombros: é o que estava dentro |
| **o verbo não muda** | o alvo está sempre aberto e se MOVE; dano dobrado na recuperação; breu |

## 1. A arte

- **Escolhida:** a candidata **B · predador** (`76945935-56fe-43da-a498-7284a2823022`), 256×256.
- **A vista S é a régua do estilo.** As rotações de 8 direções (`94aa9cf3…`) saíram lisas e
  cartunescas (*"menos horrendos"*) — medido: mais contraste em faixas limpas. Edições com a S de
  referência e por texto melhoraram pouco. **Descartadas para a luta.**
- **A pose da luta sai da própria S por animação:** o giro v3 (`giro-S-para-W`, grupo `c336b20e…`)
  herda o traço da S. Parou em **três quartos virado para a esquerda** — e isso é bom: o peito
  aceso fica de frente para a nave. **O quadro 8 é a pose da luta.**
- **O giro clareia quadro a quadro** (lum 46 → 61). Corrigido com curva gama para a lum do quadro 0
  (`scripts/_f4/_giro-brilho.mjs` → `assets/raw/furia-predador-giro/corrigido/`).
- **Teto:** pose própria (pedido dele), editada a partir do quadro 8 espelhado —
  `assets/raw/furia-predador-teto/pose.png`. ⚠️ a cabeça ficou pouco legível; corrigir depois.

### As animações (todas v3, 8 quadros, 256², a partir de PNG local via `scripts/_f4/_pl.mjs`)

| clipe | parte de | uso |
|---|---|---|
| `urro` | S (quadro 0 do giro) | o surgimento |
| `giro` | já existe (corrigido) | o salto do surgimento |
| `idle` | quadro 8 | parado no chão, rosnando |
| `slash` | quadro 8 | investida + golpe |
| `lava` | quadro 8 | arremesso no chão |
| `teto-lava` | pose do teto | arremesso pendurado |
| `morte` | quadro 8 | a morte final |

**A lei de sempre: arte entra asset por asset.** Sem uma folha, o motor usa o quadro estático da
pose correspondente (e tint/flash no lugar do movimento) — a luta funciona inteira sem nenhum clipe.

## 2. O surgimento (seção 1 — aprovada)

Tempo desde a vida do guardião zerar:

| t | o que acontece |
|---|---|
| 0 → 1000ms | *(existe)* a morte composta do guardião |
| 1000ms | *(existe)* `guardiaoDestruido` + `explodeBig`. **Novo:** a **explosão sangrenta** no motor (jorro vermelho-escuro, gotas com gravidade, flash vermelho, tranco forte) **+ SANGUE NA TELA** (manchas presas à câmera, por cima de tudo) |
| 1000 → 1500ms | a carcaça apaga sob a nuvem de sangue |
| 1500ms | o predador está lá: **escala 0,7, de frente (S)**, onde o guardião estava |
| ~1500 → 2700ms | **o urro** — tranco de câmera no pico |
| ~2700 → 3500ms | **o salto com giro**: o motor faz o arco, toca o `giro`, e a escala vai de **0,7 → 0,47** no mesmo arco; ele pousa no chão já na pose da luta |
| ~3000ms | o sangue da tela já escorreu e apagou |
| ~3500ms | **a arma destrava** — a luta começa |

**Regras da janela:** a **arma do jogador fica travada** (trava própria, que não é a do calor —
o painel não mostra superaquecimento); a **nave voa livre**; o predador **não toma dano e o corpo
dele não machuca** (ele nasce ocupando a altura da arena); **nenhuma bala inimiga**.

## 3. A luta (seção 2 — aprovada)

**Vida:** 180 (a mesma da forma 2 de hoje; a barra única não muda).

| fase | vida | repertório |
|---|---|---|
| **1** | 100% → 66% | no **chão**, metade direita · investida+slash · lava em arco |
| **2** | 66% → 33% | **ronda**: salta entre âncoras de chão e teto, e **sai pela direita** para reentrar em outro ponto |
| **3** | 33% → 0 | **o breu** (seção 4) · o repertório da fase 2 · a lava estoura em estilhaços |

**O alvo — a mistura (c):** o **peito aceso** é a hitbox (medida na arte, nunca a olho), **sempre
vulnerável**. Na **recuperação** depois de cada ataque o dano **dobra**. A casca dos ombros absorve
a bala (o pacto do domo do guardião); o resto do corpo deixa a bala seguir até o peito.

**Investida + slash:**
1. **carga** — o core **pulsa devagar e acelera** até o bote (~1,5s; o mesmo telégrafo do breu, ensinado às claras);
2. **bote** — salto rápido na altura em que a nave estava **no fim da carga** (mirada no passado: quem sai da linha escapa);
3. **slash** — a garra é perigosa por ~200ms ao chegar;
4. **recuperação** — ~1s parado, dano dobrado; depois volta para uma âncora.

**Lava:**
- **telégrafo** — ergue a garra ~0,5s; **arremesso** — 1 a 3 bolas em arco com gravidade, calculadas para cair onde a nave está; **recuperação** ~0,6s com dano dobrado.
- **fases 1 e 2:** a bola some ao bater na borda. **Fase 3:** ao bater na borda, **estoura em estilhaços**.
- pendurado no teto, arremessa com a garra livre (a pose do teto).

**A ronda (fases 2 e 3):**
- **âncoras só no chão e no teto**, todas nos **60% da direita** — a esquerda é da nave. A linha de apoio é a **borda desenhada**, medida (a de colisão, y=10/206, fica dentro da faixa).
- **a borda direita é SAÍDA, não âncora** (medido no mock: não há parede ali, a pose girada vira um bolo de garras). Ele salta para fora; 1–2s depois **reentra por outro ponto**, com aviso antes (o core acende por um instante no ponto de entrada).
- **o salto entre âncoras machuca por contato** — o salto é o próprio telégrafo.

**O que sai:** os drones e as paredes de corredor do coração. A luta é só você e ele.

## 4. O breu (fase 3)

- **A arena apaga:** uma camada preta por cima do fundo, da borda e do predador.
- **O jogador vê a nave inteira**, com um **halo bem justo em volta** que **não ilumina nada** além dela.
- **O predador só é visto pela luz do próprio core:** o core **pisca lentamente**; no pico do pulso, a
  luz dele revela o corpo em volta (uma cópia do sprite, escura e avermelhada, com alpha preso ao pulso).
- **Brilham por cima do breu:** o core, os tiros da nave, a lava e os estilhaços dela.
- **O telégrafo da investida é o core CARREGANDO** (a ideia dele): pulsa devagar e vai acelerando até o
  bote — dá tempo de desviar. **Piso de balanceamento:** a carga nunca fica abaixo do tempo de sair da linha.
- **A entrada no breu é um beat:** ele urra (o clipe do surgimento serve), e as luzes apagam em ~600ms.

## 5. Técnica

### Onde mora
- **`src/entities/BossNucleo.ts`** fica com o **guardião** e a **troca** (a morte composta, a explosão
  sangrenta, o sangue na tela). A forma 2 sai inteira dele.
- **`src/entities/Predador.ts`** (novo) é a forma 2: surgimento, máquina de estados da luta, lava,
  âncoras, breu. O `BossNucleo` delega a ele depois da troca — ele continua sendo o `StageBoss` da
  cena (`sprite`, `targets`, `damage`, `isDead`), então a `GameScene` não aprende nada novo exceto:
- **`StageBoss.armaTravada?: boolean`** — a cena passa `firing && !boss.armaTravada` para a arma.
- **O breu** mora no `Predador` (é da luta, não da fase): um retângulo preto preso à câmera numa
  profundidade entre o mundo e a nave; a nave sobe acima dele só enquanto o breu existe.

### Os estados do predador
`surgindo` → `chao` ⇄ {`carga` → `bote` → `slash` → `recupera`} ⇄ {`telegrafoLava` → `arremesso` → `recupera`}
→ (fase ≥2) `salto` entre âncoras · `teto` · `saida` → `fora` → `reentrada` → (fase 3) `breu` sobreposto → `morto`.

### A lava
Projéteis do pool `enemyBullets` (o dano na nave já está ligado), com a **gravidade integrada pelo
predador** (lista própria de bolas vivas: `vy += g·dt`) — não se liga gravidade no pool, que é
compartilhado. A mira é balística: tempo de voo fixo por arremesso, velocidade inicial resolvida para
cair no ponto da nave. Borda: bola some (fases 1–2) ou vira 5–6 estilhaços radiais (fase 3).

### Sondas
- **`probe-stage4`** troca os asserts do coração (`aberto`, "FECHADO segura / ABERTO fere", paredes)
  pelos do predador: a troca revela o predador; a arma trava no surgimento e destrava; a bala real
  fere o peito; o dano dobra na recuperação; a fase 3 liga o breu; matar entrega a cutscene final.
- Captura de verificação: `scripts/_f4/_ver-predador.mjs` (molde: `_ver-guardiao.mjs`).

### Knobs (todos `static readonly` no `Predador`)
escala do surgimento/luta (0,7/0,47) · durações do surgimento · carga (1,5s) e piso · duração do slash
(200ms) · recuperações (1s/0,6s) · multiplicador de dano (2) · gravidade e tempo de voo da lava ·
nº de estilhaços · tempo fora da tela (1–2s) · alpha do breu · raio do halo · período do pulso do core.

## 6. Critério de aceite

Ele joga a luta. **A 2ª forma parece o fim do jogo?** E, especificamente: dá para desviar da
investida no breu lendo só o core?
