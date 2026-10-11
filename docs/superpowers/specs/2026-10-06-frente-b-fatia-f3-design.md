# FRENTE B — a FATIA F3: Caçador de Vácuo + Tentáculo do casco (spec, 06/10/2026)

> Filha da spec-mãe `specs/2026-10-05-frente-b-elites-design.md` (§4 deixava a F3 "só no verbo"). Fechada com o
> Henrique por brainstorming em 06/10. Vale a regra nova: **o elite pressiona, mas não pune** — a fase já tem
> inimigos, obstáculos, sondas e kamikazes (memória `elites-pressionam-sem-punir`). Todos os números são o PONTO DE
> PARTIDA e moram em `src/data/numerosElites.ts`.
>
> **EMENDA de 07/10 (brainstorming com ele):** nenhuma arte da folha de 06/10 ficou. O Caçador virou uma **LULA** (Pro
> nº 15, 85%) que solta **TINTA** a cada sumiço (§2.3); o Tentáculo ganhou a **regra do casco** (§3.3) e a arte dele
> volta para uma leva nova. As seções tocadas estão marcadas *(07/10)*.

## 1. Os dois, em uma linha

| Ato | Elite | O verbo |
|---|---|---|
| 1 · nebulosa | **Caçador de Vácuo** | some de verdade → ressurge à frente → a mira segue e TRAVA → 3 tiros na linha travada → some (3×) |
| 2 · casco | **Tentáculo do casco** | rachadura sob a nave → MORDE onde a nave estava → mergulha por trás do casco → brota longe → MEIA-LUA de tiros → afunda |

Conceitos dele: Caçador = folha dos biomas nº 10 (*"entra e sai do campo de visão; ataca com rajadas de alta
precisão"*); Tentáculo = folha dark space nº 03 (*"emergente do casco; rajadas, projéteis e investidas"*). Cópias em
`folhas/2026-10-05/elites/conceitos/`.

## 2. Caçador de Vácuo (vida 10, 300 pontos)

### 2.1 O ciclo — 3 ressurgimentos, depois vai embora

| Estado | Tempo | O que acontece | Fere? |
|---|---|---|---|
| ESCONDIDO | 1,2s | invisível e SEM CORPO (o tiro atravessa); escolhe o próximo posto | não |
| SURGE | 0,3s | materializa no posto | sim |
| MIRA | 0,6s | linha fina da boca até a nave, SEGUINDO a nave | sim |
| TRAVA | 0,3s | a linha para e pisca forte — o aviso final | sim |
| RAJADA | ~0,25s | 3 tiros rápidos (~200px/s) em fila, NA LINHA TRAVADA | sim |
| SOME | 0,4s | dissolve; volta a ESCONDIDO | sim, até sumir |

- **Decisão dele (A):** escondido ele some DE VERDADE — nem visível, nem atingível. A janela de acertar é a própria
  ameaça (~1,8s por ressurgimento, ~5,5s no total: com a base, ~4 de dano/s, quem mira bem o mata em 2).
- **Decisão dele (A):** a mira SEGUE e TRAVA; desviar = sair da linha depois da trava. O tiro pode ser rápido porque
  a linha avisou.
- **Decisão dele (A):** os postos só na METADE DIREITA, sorteados, longe da altura do anterior (a regra da
  sentinela, `escolherPosto`). Nunca atrás da nave.
- Morto na MIRA ou na TRAVA, **não atira**. Depois do 3º SOME, vai embora (não volta).

### 2.2 A trava do rabo

O ato 1 exige o quadro VAZIO quando o rabo entra (t=37,5–38, comentário do `STAGE_3`). Se um Caçador estiver vivo no
evento `rabo`, ele SOME de vez (sem pontos). Regra, não horário: o roteiro pode mudar.

### 2.3 A lula e a tinta *(07/10)*

- **A arte:** a lula nº 15 do Pro (`folhas/2026-10-07/elites/cand/cacadorLula-21-15.png`), reduzida a **85%
  (41×41)** com a paleta original (`_tratar.mjs reduzir`), sem o pixel claro entre os tentáculos. Fica na diagonal
  (carapaça para cima-esquerda); as agulhas saem da base dos tentáculos, junto do olho. Escolha dele entre 10 (folha
  `folha-cacador-2.png`) e o tamanho na `folha-cacador-3.png`.
- **O ciclo do §2.1 NÃO muda.** SURGE e SOME são em PONTILHADO (dither ordenado: camuflagem de lula).
- **A TINTA, em todo SOME** (decisão dele: A — *"a tinta precisa ser algo criado mesmo, com fade, no local que ela
  joga"*):
  - 1º e 2º sumiço = o **SOPRO**: uma mancha só do tamanho dela, que a tampa enquanto ela some (cresce 0,15s, segura
    até 0,5s, esvai até 0,9s);
  - 3º sumiço (a saída de vez) = a **CORTINA**: a nuvem grande (cresce 0,35s, segura até 1,2s, esvai até 1,9s);
  - parada NO LUGAR onde foi solta; não fere, não bloqueia tiro;
  - **camada:** por cima do cenário e dos inimigos, **por baixo de todo tiro e da nave** — esconde a leitura, nunca um
    tiro (regra `elites-pressionam-sem-punir`).
- **A técnica:** À MÃO — mancha em pixel (borda com ruído, 3 tons + aro roxo, redemoinho), esvaindo em pontilhado;
  **assada em quadros** (spritesheet gerado pelo script do teste, `_tinta-f3.mjs`), nunca desenhada ao vivo. A versão
  vetorial (círculos do Graphics) fica registrada como plano B. O teste que ele aprovou: `tinta-lula.gif`.
- O sumiço forçado do §2.2 (o rabo) usa o SOPRO.

## 3. Tentáculo do casco (vida 14, 350 pontos)

### 3.1 O ciclo — uma aparição = um ciclo (decisão dele: A)

| Estado | Tempo | O que acontece |
|---|---|---|
| AVISO 1 | 0,8s | uma RACHADURA brilha no casco e chega SOB A NAVE (presa ao casco: rola com ele — §3.3) |
| BOTE | ~0,7s | sai da rachadura e MORDE o ponto onde a nave estava no fim do aviso (não persegue) |
| MERGULHO | ~0,9s | o arco passa do ponto e cai POR TRÁS da borda do casco — some atrás do Leviatã |
| PAUSA | 0,6s | escondido |
| AVISO 2 | 0,8s | outra rachadura, LONGE da nave (≥ ~140px à frente) |
| ERGUE | 0,4s | sai até meia altura e fica de pé |
| MEIA-LUA | — | um arco de **6 tiros** para cima, abrindo da boca (~140°, de cima-esquerda a cima-direita) |
| AFUNDA | 0,8s + 0,6s | segura, afunda de vez e vai embora |

- O desenho é DELE (*"a primeira aparição vai ser embaixo do jogador, saindo pelo casco e tentando morder; se o
  jogador desviar, cai para o lado de fora do casco; depois volta mais longe para atirar"*).
- **O tiro (decisão dele: B):** a MEIA-LUA para cima — cobre área, não é mirada.
- **O bote** vai até a altura da nave, com teto em y≈40. O casco ocupa y 150–216 (a crista em 150).

### 3.2 O corpo e o dano

- **Só a CABEÇA fere** e é ferida; o corpo em gomos ABSORVE o tiro (sem dano) e machuca no contato — a regra que ele
  deu à Serpente chefão (*"invulnerável é telégrafo, não parede"*). Atravessar a coluna da mordida sem dano leria
  errado.
- **O corpo é uma CORRENTE DE GOMOS em código** (a cabeça + N gomos seguindo o caminho dela, como um verme): é o que
  deixa fazer o arco, o mergulho por trás do casco e brotar em qualquer altura sem uma pose desenhada por posição.
- **Distinto da Serpente chefão:** ela é um corpo grande, parado e pintado; ele é fino, ágil e em gomos, no vermelho
  do Leviatã do conceito 03 (não as cabeças coloridas dela).

### 3.3 A regra do casco *(07/10)*

A pergunta dele: *"se a fase corre, o chão também corre, como ele vai surgir do casco sem ser arrastado?"* — o casco
anda a `SCROLL_SPEED` (84 px/s, × a frenagem); em 0,8s de aviso a rachadura já andou 67px. O "arrastado" é uma parte
presa à tela e outra presa ao chão AO MESMO TEMPO. A regra:

- **O que toca o casco anda com o casco** (a velocidade real do chão naquele quadro); **o que está solto anda na
  tela**. Nunca os dois juntos, exceto o instante de passar pelo buraco.
- **AVISO 1:** a rachadura nasce À FRENTE da nave, em `x_nave + v_casco × 0,8`, para chegar SOB ela no fim do aviso.
- **BOTE:** o verme sai INTEIRO do buraco — enquanto os gomos passam, a raiz é o buraco (anda com o casco); quando o
  último gomo sai, a corrente é livre na tela. A mordida (no ponto da nave no fim do aviso) e o MERGULHO por trás da
  borda são na tela.
- **AVISO 2 → ERGUE → MEIA-LUA → AFUNDA:** uma **torre enraizada** que rola com o casco, rígida. Brota perto da borda
  direita (x≈350) e anda ~250px em ~3s na direção da nave. A regra "≥140px à frente da nave" do §3.1 vale para onde a
  rachadura NASCE. Os tiros, depois de saírem, são livres na tela.
- **A arte do Tentáculo volta a uma leva nova** (nenhuma de 06/10 ficou); o comportamento se implementa com a arte à
  mão de 06/10 como provisória.

### 3.4 A SENTINELA DO CASCO *(10/10; no jogo desde 11/10 — em teste, ainda não aprovada)*

Entre 08 e 10/10 o Tentáculo virou a **SERPENTE 63-3** (Pro, a criatura inteira, escolhida por ele) e passou por
rodopio, giro, esticada e "bote que se torce" — todos abandonados (a serpente animada em trajetória deixava de ser a
63-3). A direção dele em 10/10: *"uma skill mais simples, que mostre o corpo dela inteiro — uma animação mais simples
é mais fácil de ficar boa"*. Se ele aprovar, **substitui o §3.1 e o §3.2** (a corrente de gomos e a meia-lua saem):

| Fase | O que acontece |
|---|---|
| SOBE | ela sobe de trás da crista do casco até ficar **metade escondida** (~58% da altura à mostra) — *"parece que ela está surgindo da lateral do casco"* |
| BALANÇA | o idle no lugar (yoyo) — a janela para atirar nela |
| ESPINHOS | o corpo acende (vermelho ESCURECIDO, a pedido dele) e saem **2 trios de espinhos retos**, em fileiras paralelas, um de cada lado da linha da mira, o 2º 0,33s depois do 1º — *(11/10, ele: "tire o conjunto do meio e faça ter um atraso entre os outros, assim abre-se uma lacuna para o player passar no meio")*: a nave parada fica no vão |
| BALANÇA | curta |
| BOTE | recua, dá o golpe com a boca aberta **na direção da nave** e volta à pose — *"gostei da animação do ataque, a esticada de corpo está boa"* |
| AFUNDA | desce de volta atrás da crista; reaparece em outro ponto |

- **A arte:** a 63-3 EXATA; todo gesto é PixMiniMax animado dela mesma, no lugar, e volta a ela (idle, espinhos,
  bote; 2 takes de cada; a referência é o take 2 dos três). A criatura inteira **inclinada no sentido horário**
  (cabeça para cima) em volta do ponto onde a crista a corta, para o bote apontar para a nave — RotSprite no código;
  em avaliação **15° ou 25°** (a 25° a boca chega na altura da nave).
- **Decidido por ele em 11/10:** o giro é **25°**; **o bote FERE** (só a boca, e só enquanto a cabeça está lançada — o
  recuo é o aviso); os espinhos em 2 trios com o vão no meio; *"monte a sequência dela inteira, qualquer coisa
  ajustamos depois"*.
- **NO JOGO desde 11/10** (ele testa no sandbox; ainda não aprovada): o posto `tentaculo` (`Tentaculo.ts`; a corrente de
  gomos, a rachadura e a meia-lua saíram). Os 51 quadros entram ASSADOS já girados e escurecidos
  (`scripts/_elites/_instalar-sentinela.mjs` → `src/data/tentaculoQuadros.ts`: pivô, hitbox por quadro, a boca do bote).
  **Ela fica ATRÁS das placas do casco (depth −76):** a beirada real da placa (que varia 0–2px por coluna) é quem a
  corta — o corte reto em y=150 do demo deixava uma fresta de céu entre ela e o casco (o defeito que ele apontou).
  Sobe a 90px à frente da nave (a boca alcança 87px). Um ciclo por aparição (~5,9s).
- **Em aberto:** o tamanho (1:1 ≈ 100px de altura); o vermelho e o quanto do corpo fica à mostra; o NOME (a F2 já tem
  a Sentinela Orbital); a leitura dela sobre fundo escuro (o corpo é quase preto); e **a regra do casco (§3.3)** — ela
  fica PARADA na tela, como nos GIFs: com a sequência inteira (~5,9s) o casco andaria ~500px, e o bote aconteceria fora
  da tela. Rolar com o casco exige encurtar o ciclo.
- Demo: `scripts/_elites/_sentinela-demo.mjs`; GIFs em `folhas/2026-10-10/elites/sentinela/`. Em jogo:
  `folhas/2026-10-11/elites/gif-serpente-casco.gif` (`_gif.mjs … tentaculo`); sonda `probe-elites-f3 tentaculo`.

## 4. O roteiro da F3

| t | O quê | Ajuste no que existe |
|---|---|---|
| 11 | Caçador **sozinho** (até ~20), com as minas na névoa | sai a onda de 6 drones de t=16 (ele ocupa o lugar) |
| 27,5 | Caçador **cobrado**, no pico com o cargueiro (29); acaba ~36,7 | — |
| `rabo` | Caçador vivo some de vez (§2.2) | — |
| 63,5 | Tentáculo **sozinho**, logo depois do respiro da aranha; até ~69,5 | sai a onda de batedores de t=64; os kamikazes de 67 → 69,5 |
| 75 | Tentáculo **cobrado**, no pico final; acaba ~81 (antes do silêncio de 82) | — |

## 5. A arte — DUAS criações de cada peça (pedido dele)

Cada peça sai em duas versões — **à mão** (pixel a pixel) e **no PixelLab** — e ele escolhe na folha EM JOGO. No
PixelLab, explorar além do caminho de sempre (*"fique à vontade para testar"*): `create_object_pro_flash`,
`create_image_pro`, `image_to_pixelart` a partir do recorte do conceito dele, `edit_image_pro_flash`,
`pixelart_workbench`. As lições valem: nave do PixelLab sai vista de CIMA (referência LATERAL e descartar as
simétricas antes de mostrar); peça que encosta na borda sai cortada (pedir margem); reduzir com a paleta original.

| Peça | Tamanho-alvo | Versões |
|---|---|---|
| Caçador — corpo de perfil, virado à esquerda | ~~~32px~~ **41×41: a lula 15** *(07/10)* | ✔ PixelLab Pro |
| ↳ o dissolver (surgir/sumir) | — | à mão (pontilhado em pixel, em código) |
| ↳ a tinta: SOPRO e CORTINA *(07/10)* | ~40 / ~70px | à mão, assada em quadros (§2.3) |
| Tentáculo — cabeça (a boca de dentes em anel) | ~20px | à mão + PixelLab |
| ↳ o gomo do corpo | ~10–12px | à mão + PixelLab |
| A rachadura do casco (o aviso) | ~16px | à mão |
| A linha da mira; o tiro do Caçador; os tiros da meia-lua | ≤8px | à mão (como os da sentinela) |

**As folhas:** o Caçador na pintura da NEBULOSA (com os véus) e o Tentáculo sobre o CASCO, ao lado da nave e em escala
real, as duas versões lado a lado. Dentro de cada elite: arte parada aprovada (define tamanho e hitbox) →
comportamento → animações → GIF em jogo.

## 6. A arquitetura

A mesma da F2 (spec-mãe §2): regras puras em `src/elitesRegras.ts` (`cacadorAvanca`, `tentaculoAvanca`, o posto longe
da nave), números em `numerosElites.ts`, `ComportamentoElite` em `src/entities/elites/` (`Cacador.ts`,
`Tentaculo.ts`), todo dano pelo caminho único `GameScene.ferirInimigo`, tiros por `PadroesDeTiro` (com
`vestirArte`). Novidades:
- **ESCONDIDO sem corpo:** o Caçador desliga o corpo do Arcade (o tiro atravessa) e fica invisível.
- **Os gomos do Tentáculo:** visuais que seguem a cabeça, com hitbox própria que ABSORVE tiro (sem dano) e fere a nave
  no contato. A cabeça é o inimigo do `EnemySystem`.
- **Por trás do casco:** o mergulho passa a profundidade do Tentáculo para TRÁS da tira da frente do casco.
- O evento `rabo` avisa os elites vivos (a trava do §2.2).

## 7. Como se testa

1. **`test-elites-regras`** (node): os estados e tempos dos dois; o Caçador não atira se morto na mira; os postos à
   direita e longe da altura anterior; a rachadura do AVISO 2 longe da nave.
2. **`probe-elites`** (jogo real): o Caçador intocável escondido; a rajada na linha travada; nada vivo quando o rabo
   chega; o bote vai aonde a nave estava; o corpo do Tentáculo absorve e só a cabeça fere; a meia-lua com 6 tiros.
   E as sondas antigas seguem passando.
3. **GIFs em jogo** para ele julgar cada elite; depois ele joga o sandbox e a F3 inteira.

**A fatia F3 fecha quando** os testes passam, ele aprova a arte e o comportamento dos dois e a F3 passa no jogo dele.
