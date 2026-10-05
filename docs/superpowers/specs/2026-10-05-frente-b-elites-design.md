# FRENTE B — os ELITES por fase + ondas maiores (spec-mãe, 05/10/2026)

> Brainstorming de 05/10 com o Henrique, a partir das duas folhas de conceito dele (na raiz do repositório:
> `concept art Inimigos.png` — três biomas — e `concept art de Inimigos Sci‑Fi.png` — "Dark Space"; cópias em
> `folhas/2026-10-05/elites/conceitos/`). Etapa 1.5 do 🧭,
> ordem dele de 01/10: A = catálogo ✅ → **B = inimigos que atiram + ondas maiores** → C = calibragem.
> Esta é a spec-MÃE: o elenco, os princípios e o desenho de cada elite. Cada fase vira uma FATIA com plano próprio;
> a primeira é a **F2** (§3), e é a única desenhada em detalhe aqui.

## 1. O problema e a resposta

- As cartas deixam as fases fáceis — *"as fases vão ser passeios no parque"*. Hoje só atiram a `canhoneira` (6
  aparições na campanha) e as torres do terreno; F2, F3 e F4 dividem os MESMOS 5 inimigos de onda (drone, batedor,
  kamikaze, canhoneira, cargueiro).
- **A resposta: MAIS INIMIGOS ATIRANDO CONTRA O JOGADOR**, com um vocabulário próprio por fase, tirado do bioma.

### 1.1 Os princípios (fechados com ele)

1. **F1 não ganha elite.** É a fase do flap — criatura complexa ali não rende. Ela ganha **ondas maiores** (mais
   levas, mais densas) com o elenco atual, sempre passando no teste do flap.
2. **F2, F3 e F4 ganham DOIS ELITES cada** (*"2 por fase é ótimo e não pesa muito"*). Na F3, um por ato.
3. **ELITE ≠ MINI-CHEFE.** A complexidade é a do Golfinho (máquina de estados, ataques que se alternam), mas é um
   **mob elite NO FLUXO**: aparece 2–3 vezes por fase, a 1ª SOZINHO e com espaço para ler o verbo, as seguintes
   misturado às ondas. **Nunca segura o relógio** — a fase pode ficar MAIS LONGA, mas não para. Palavras dele: *"se
   colocamos no estilo arena do golfinho, o que eu procuro, que são mais inimigos atirando contra, é quebrado"*.
4. **Vida entre a canhoneira (6) e o Golfinho (50)**; sem barra de chefe.
5. **Arte:** parte do conceito DELE, redesenhada de **PERFIL** (vista lateral própria, nunca rotação); a SILHUETA
   anuncia o verbo (GDD §6); dark sci-fi (casco escuro, luz só na energia); o MATERIAL é o do bioma — mineral laranja
   na F2, plasma roxo na nebulosa, tecido vermelho no interior.

### 1.2 O elenco

| Fase | Elite | O verbo |
|---|---|---|
| F2 | **Drone de Mineração** | minera num asteroide → acorda → vem de encontro atirando → autodestruição |
| F2 | **Sentinela Orbital** (à la droideka) | rola como roda → abre com escudo → atira → fecha e rola |
| F3 nebulosa | **Caçador de Vácuo** | some nos véus → ressurge → mira avisada → rajada de precisão |
| F3 casco | **Tentáculo do casco** | brota do chão sob a nave → rajada ou investida → volta |
| F4 | **Larva Mecânica** | arranca → para → leque → larga cápsulas que estouram por proximidade |
| F4 | **Tubo Pulsante** | vive na parede (chão/teto) → pulsa em anel → se abre e solta inimigos |

**Fora, e por quê:**
- **Carrapato** (F4): para colar na nave (44×26, hitbox 21×9) ficaria com ~10px e perderia a definição. Trocado
  pela Larva.
- **Serpente de Nébula**: RESERVA. A F3 termina na Serpente chefão; se entrar um dia, é como CRIA dela (o vermóide
  que solta minidrones, perto do fim da nebulosa, anunciando o chefão).
- **Touro Asteroide**: o material dele (cristal laranja) vira o ASTEROIDE MINERÁVEL do drone.
- Manta (bate com a linhagem alien do jogador), Jelly Void (= `aguaViva`), Worm (= Serpente), Guardião / Guardião de
  Núcleo (= nome do chefão da F4), Dreadnought (porte de chefão), Tentáculo de Defesa (repete o da F3), Vespa,
  Fragmento Vivo, Tormenta de Plasma, Drone de Nébula: fora desta frente. Algumas das folhas já serviram de
  referência para chefões e mini-chefes.

## 2. A arquitetura (vale para os seis)

1. **Cada elite é um `EnemyKind` do `EnemySystem`** — mora no mesmo grupo dos inimigos, e por isso TODAS as cartas
   funcionam sem código novo (míssil trava nele, elétrico, queimando, tranco, perfurante, aura, placar, sandbox).
   A máquina de estados mora em **`src/entities/elites/<nome>.ts`**, atrás de uma interface pequena —
   *iniciar · atualizar · bloqueia o tiro? · ao morrer*. O `EnemySystem` DELEGA (nada de um `if kind ===` novo por
   elite, como o da aranha).
2. **UM lugar para ferir inimigo.** Hoje o dano é descontado em três (tiro na `GameScene`, bomba na `GameScene`,
   cartas no `CartasEmJogo`). Os três passam a chamar uma função única do `EnemySystem`, que pergunta ao elite se ele
   BLOQUEIA (pela direção de onde o golpe veio). Sem isso, o escudo segura o tiro e deixa o míssil passar.
3. **Os padrões de tiro num módulo comum** — mirado, rajada de N, leque, anel — sobre a piscina de tiros inimigos que
   já existe. O anel de 6 da aranha passa a usá-lo.
4. **As regras de estado são PURAS** (`src/elitesRegras.ts`, como `bombaRegras.ts`): quando acordar, quando
   explodir, se o golpe é bloqueado, quando ir embora — testáveis em node.
5. **Os números num endereço só: `src/data/numerosElites.ts`** (como `numerosCartas.ts`). Todos são CHUTE até a
   calibragem no sandbox.
6. **O sandbox** solta os elites pela montagem das ondas, como qualquer tipo.
7. **O ELÉTRICO trava o RELÓGIO do estado também**, não só o movimento (um drone travado no pisca não explode
   enquanto a trava dura). Regra PROVISÓRIA — ver §5.

## 3. A FATIA F2 (a primeira)

A F2 hoje: ~78s — asteroides → drone/batedor → destroços → mina sensora (22s) → kamikaze (34s) → cargueiro (47s) →
ENXAME (55s) → Capitânia (75s).

### 3.1 O asteroide minerável

Uma rocha nova do `DebrisSystem` (herda colisão, tiro e bomba), **maior** que a comum, com **veios de cristal
laranja** (o material do Touro Asteroide da folha) e o ENCAIXE onde o drone trabalha. Deriva no fluxo como as outras
e aguenta mais tiros. **Quebrá-la com o drone em cima o acorda na hora.**

### 3.2 Drone de Mineração (vida ~10)

1. **MINERANDO** — grudado na rocha, broca girando, faíscas laranja. Não ataca. É a janela de MATAR ANTES (a lição
   da mina sensora: quem atira primeiro não sofre).
2. **ALERTA (~0,4s)** — acorda quando a nave chega perto, quando leva tiro ou quando a rocha quebra. Recolhe a broca,
   o olho acende, vira para a nave. É o telégrafo.
3. **ATAQUE** — solta da rocha e **vem de encontro atirando** (o tiro simples e a rajada da folha). Mais lento que o
   kamikaze: ele atira enquanto vem.
4. **AUTODESTRUIÇÃO** — perto da nave, ou depois de uns segundos atacando, o núcleo **pisca ~0,6s** e explode em raio,
   com estilhaços em anel. ⚠️ **Morto DURANTE o pisca, morre SEM explodir** — matar tem de ser melhor que deixar
   (a regra da mina sensora, GDD §6).

> **05/10 (2):** o ALERTA ganhou o **olho acendendo** (laranja → amarelo → núcleo quase branco, pintado pixel a pixel
> por cima da lâmpada), e o olho fica aceso no voo. **Sugestão dele para depois:** o tiro do drone virar **CRISTAIS
> da cor que ele minera** (o laranja do geodo) — anotado, não feito.

### 3.3 Sentinela Orbital (vida ~18)

1. **ROLANDO** — entra pela direita como RODA girando, rápida, até um POSTO na metade direita da tela.
2. **ABRIR (~0,5s)** — desdobra e ergue um **escudo em ARCO virado para a frente**.
3. **FOGO (~2,5s)** — rajadas miradas e, de vez em quando, o disparo em área da folha. **O escudo bloqueia o que vem
   de frente**; para feri-la aqui é preciso flanquear (por cima/por baixo) ou esperar.
4. **FECHAR (~0,5s)** — recolhe, **sem escudo**: a janela. Rola para outro posto.
5. **2–3 ciclos e vai embora rolando** — elite de fluxo não estaciona.

> **05/10 (2), depois do 1º GIF — o que ele pediu:** (a) **sem pernas** — *"ter pernas no zero absoluto ficou
> slopado"* —, com **propulsores** e mais **robusta** (arte refeita); (b) **mais uma janela vulnerável** — *"onde ele
> faz mais alguma coisa e pode tomar dano"*: a **SOBRECARGA**, entre o FOGO e o FECHAR (~1,6s): o escudo CAI e ela gira
> o canhão cuspindo uma ESPIRAL de dois braços; toma dano de qualquer lado. O ciclo virou
> rolando → abrir → fogo (escudo) → **sobrecarga (aberta)** → fechar (aberta) → rola.

> **05/10 (3) — A LUTA FINAL (ele: *"está soltando muita coisa… como o golfinho, dois tipos de tiros"*):** o FOGO
> ALTERNA, a cada 0,6s, a **bola PESADA** do canhão de cima (a `bulletOrb` da canhoneira do cinturão, lenta — 60 px/s —
> e mirada: sair da linha) e o **LEQUE leve** da minigun (3 tiros a 120 px/s em 24°: achar o vão); o anel saiu. A
> SOBRECARGA virou a **minigun VARRENDO** 70° de cima para baixo (um tiro a cada 0,15s — uma cortina com buracos), o
> canhão de cima quieto. ~14 tiros por ciclo (eram ~50).

### 3.4 O roteiro da F2 (de ~78s para ~97s)

- **Drone de Mineração:** apresentado **~10s**, sozinho, no campo de asteroides da abertura; cobrado **~40s** com os
  kamikazes; e no ENXAME.
- **Sentinela Orbital:** apresentada **~50s**, sozinha, depois do cargueiro; cobrada no ENXAME, **no lugar de uma das
  duas canhoneiras**.
- Os tempos exatos saem do plano e do jogo dele; a regra é a 1ª aparição SOZINHA e o resto do roteiro empurrado.

### 3.5 As ondas maiores da F1

Mais levas e mais densas, só com o elenco atual (drone, batedor, canhoneira, torres), passando no teste do flap
(GDD §7). A dificuldade da F1 já tinha voltado para a calibragem quando o tiro virou manual (03/10) — ele calibra
jogando.

### 3.6 A arte da fatia

O caminho: o conceito dele recortado como referência de ESTILO + uma nave lateral aprovada como referência de ÂNGULO
→ **3–4 conceitos distintos**, descartando antes de mostrar todo candidato que não seja perfil → a folha **crua e em
jogo** (na pintura da F2, escala real, ao lado da nave) → ele escolhe. Dentro de cada elite: **arte parada aprovada
(define tamanho e hitbox) → comportamento → animações → GIF em jogo** para ele julgar.

| Peça | Tamanho-alvo | Quem faz |
|---|---|---|
| Drone de Mineração — corpo de perfil, virado para a esquerda | ~30px | PixelLab |
| ↳ minerando (broca), alerta (recolhe a broca), voo de ataque | — | PixelLab (PixMiniMax / v3) |
| ↳ o pisca da autodestruição | — | código (o núcleo da arte piscando) |
| **Asteroide minerável** — veios laranja + o encaixe | ~40px | **PixelLab, com o CONCEITO DELE como referência** (decisão de 05/10) |
| Faíscas da broca, lascas da rocha | ≤8px | à mão, pixel a pixel |
| Sentinela — forma de RODA | ~24px | PixelLab; o rolar é GIRO EM CÓDIGO (como o kamikaze) |
| Sentinela — forma ABERTA | ~34×30 | PixelLab |
| ↳ abrir/fechar (a transição) e o disparo | — | PixelLab (PixMiniMax; a transição primeiro) |
| Escudo em arco (3–4 quadros pulsando) e a faísca de bloqueio | ~36px · ≤8px | à mão, pixel a pixel (vetor lê "gerado") |

**Reaproveitado, sem arte nova:** o tiro inimigo atual; a explosão única aprovada; os estilhaços da mina sensora (o
anel da autodestruição). Arte nova só se ele pedir depois de ver em jogo.

**A ARTE ESCOLHIDA (05/10, folhas em `folhas/2026-10-05/elites/`):** drone **C** (reduzido a 70% com a paleta
original) trabalhando DENTRO da cratera (o rabisco dele); a rocha **1** inteira (80×78, regerada do D — a A encostava
no quadro e saía cortada) com a pedra escurecida; a sentinela **S2 com PROPULSORES** (as pernas da A no zero absoluto
*"ficou slopado"*) + a roda **R3**; o escudo à mão. Animações PixMiniMax: minerar, alerta (+ o olho acendendo, pixel a
pixel), voo, abrir/fechar, pairar, disparo, sobrecarga.

### 3.7 Como se testa

1. **`test-elites-regras`** (node): drone morto no pisca não explode; tiro de frente na Sentinela aberta é bloqueado e
   o de cima não; travado, o relógio não anda; a Sentinela vai embora depois dos ciclos.
2. **`probe-elites`** (jogo real, sandbox): os estados na ordem; o escudo bloqueando tiro E míssil; a rocha quebrada
   acordando o drone. E as sondas antigas seguem passando — elas pegam a arrumação do dano único: `probe-cartas`,
   `probe-cartas-novas`, `probe-bomba-queda`, `probe-sandbox`.
3. **GIFs em jogo** para ele julgar cada elite em velocidade real.
4. **Ele joga:** o sandbox (cada elite sozinho e misturado), depois a F1 e a F2 inteiras.

**A fatia F2 fecha quando** os testes e as sondas passam, ele aprova a arte e o comportamento dos dois, e a F1 (ondas
maiores) e a F2 (com os elites) passam no jogo dele.

## 4. As fatias seguintes (só o verbo; cada uma ganha o seu detalhe ao começar)

- **F3** — Caçador de Vácuo (nebulosa: usa os véus que escondem o que vem; a mira avisada antes da rajada) e
  Tentáculo do casco (ato 2: brota do chão sob a nave; castiga quem voa rente ao casco, que é o que as torres
  empurram o jogador a fazer).
- **F4** — Larva Mecânica (arranca / para / leque; as cápsulas pelo caminho castigam o CAMINHO no corredor fechado,
  como a mina sensora no aberto) e Tubo Pulsante (na moldura, chão ou teto; pulsa em anel; se abre e solta inimigos).

## 5. Anotado para o REBALANCEAMENTO (frente C)

- **O ELÉTRICO DESFAZER O ESCUDO da Sentinela** — proposto e ADIADO por ele (*"deixe o elétrico sem desfazer o escudo
  ainda; deixe marcado, mas para rebalanceamento"*).
- O elétrico travar o RELÓGIO do estado dos elites (§2.7) é regra provisória.
- O tranco do tiro pesado nos elites (a aranha recua metade; o elite segue o inimigo comum até se ver em jogo).
- Os de antes: elétrico + tiro pesado juntos = "muito roubados"; a recarga do míssil (8s / 5s; o ×2 pode virar 2
  cargas). Os números das cartas em `src/data/numerosCartas.ts`; os dos elites em `src/data/numerosElites.ts`.
