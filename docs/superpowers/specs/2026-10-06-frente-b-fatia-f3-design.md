# FRENTE B — a FATIA F3: Caçador de Vácuo + Tentáculo do casco (spec, 06/10/2026)

> Filha da spec-mãe `specs/2026-10-05-frente-b-elites-design.md` (§4 deixava a F3 "só no verbo"). Fechada com o
> Henrique por brainstorming em 06/10. Vale a regra nova: **o elite pressiona, mas não pune** — a fase já tem
> inimigos, obstáculos, sondas e kamikazes (memória `elites-pressionam-sem-punir`). Todos os números são o PONTO DE
> PARTIDA e moram em `src/data/numerosElites.ts`.

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

## 3. Tentáculo do casco (vida 14, 350 pontos)

### 3.1 O ciclo — uma aparição = um ciclo (decisão dele: A)

| Estado | Tempo | O que acontece |
|---|---|---|
| AVISO 1 | 0,8s | uma RACHADURA brilha no casco SOB A NAVE (presa ao casco: rola com ele) |
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
| Caçador — corpo de perfil, virado à esquerda | ~32px | à mão + PixelLab |
| ↳ o dissolver (surgir/sumir) | — | à mão (pontilhado em pixel) + animação PixelLab |
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
