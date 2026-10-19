# BLOCO E — o menu refeito: a colônia de Kepler à noite (19/10/2026)

> Brainstorming de 19/10 com o Henrique, em nove rodadas de maquete, todas no próprio jogo (o rig
> `scripts/_menu/_maquete2.mjs`, sem tocar no `src/`). As folhas estão em `docs/superpowers/folhas/2026-10-19/menu/`
> (`abertura.html`, `pintura.html`, `rodada2.html` … `rodada9.html`). Estado: **desenho aprovado por ele** em 19/10
> (*"Ficaram perfeitos. Conseguimos chegar num nível excelente de arte e visual. O menu ficou a melhor arte até agora"*).
> Este documento junta as decisões das nove rodadas; os números saem do rig, que é a referência viva de cada efeito.

## 1. O menu, em uma linha

A colônia de Kepler à noite, o "antes" da história: a pintura dele na resolução dela, viva (janelas, faróis, cachoeira,
tráfego, a nave pairando), sob o tratamento das fases, com perigo no ar (uma tempestade chegando, holofotes antiaéreos
varrendo o céu) e o Leviatã cruzando ao longe. O título é um letreiro de neon que desce como uma nave freando nos
retrofoguetes e acende por último; os olhos do alien no W acendem no fim.

### 1.1 As leis desta tela

- **A pintura na resolução dela.** É uma exceção aprovada à lei do 384×216 (memória
  `fundos-pintados-resolucao-nativa`): *"mesmo que fuja do estilo do jogo, por ser o menu inicial"*. A pintura não é
  gerada de novo em tamanho maior; em telas acima de 1582 px de largura o navegador a amplia um pouco (21% em Full HD), e
  ele testou e aprovou no PC dele.
- **O tratamento só no cenário.** Névoa, grão, volumetria e brilho valem para a pintura e o que vive nela; **o texto, o
  letreiro e os jatos ficam por cima de tudo, nítidos, fora do tratamento** (*"aplique apenas no cenário, deixe as
  letras e palavras por cima de tudo, elas precisam ficar nítidas"*).
- **Nenhum detalhe estranho** (*"mesmo que sejam pequenos detalhes, não fiquem estranhos"*): luz não atravessa parede,
  luz que apaga não deixa buraco nem borrão, luzes de uma mesma torre piscam juntas. A auditoria
  `scripts/_menu/_auditar-luzes.mjs` confere cada luz que pisca, acesa e apagada.
- **Hierarquia do movimento.** Um evento por vez; o que é constante é lento e fraco; o que é forte (o raio) é raro e
  curto. Nenhum relâmpago durante a entrada do letreiro.

## 2. A pintura e as camadas

Fontes (`assets/raw/`): `menu_inicial_transparente.png` (a cidade, com o céu da direita recortado para o Leviatã) e
`Cidade-Fortaleza sob a Lua Colossal (1).png` (o céu atrás da janela). O recorte é 16:9 na altura inteira:
`{ left: 186, top: 0, width: 1582, height: 890 }`.

`scripts/_menu/_camadas.mjs <saída> <k>` assa as camadas numa densidade `k` (1 = 384×216; 4 = 1536×864), reduzindo do
original uma vez só:

| Arquivo | O que é |
|---|---|
| `ceu.png` | o céu que aparece pela janela recortada (as agulhas-fantasma da versão fria limpas) |
| `cidade.png` | a cidade recortada (alfa apertado por smoothstep 0,25→0,6), **sem a nave** (remendada com as nuvens de 130 px à direita) |
| `nave.png` | a nave pairando, recortada; posição em `dados.json` (76,2; 57,8 px de jogo) |
| `apagadas.png` | o estado APAGADO de cada luz que pisca: só os pixels que mudam, o resto transparente (§3.2) |
| `cachoeira.png` | a cachoeira em 8 quadros lado a lado (caixa 332, 134, 15×26 px de jogo) |
| `dados.json` | os grupos de luz (`janela` / `farol`, com caixa e área), a nave, a cachoeira |

O Leviatã do menu é o nado de tubarão aprovado no bloco D (`leviathan-swim-sheet.png`, 16×176×80), reduzido por
`scripts/_menu/_leviata-menor.mjs` para **96 px** de largura na tela de 1536 (fator 0,545), escurecido no tamanho
cheio com o mapa de lava preservado, e com o **aro frio** ("arolava") que lhe devolve a forma contra o céu.

**Para o jogo:** as camadas assadas em `k = 4` e em `k = 1` (§7.4) vão para `public/sprites/menu/`, mais o Leviatã de
96 px e as máscaras da tempestade (§4.3), também assadas fora do jogo.

## 3. A cena viva

Tudo é função do relógio `t` (segundos desde que a cena abriu), sem tweens: o mesmo instante sempre dá o mesmo quadro.
Coordenadas em **pixels de jogo** (384×216). A profundidade, de trás para a frente:

| Prof. | Peça |
|---|---|
| 0 | o céu |
| 0,5 | 9 estrelas, só na janela aberta, onde o céu é escuro (brilho suave de 1,6 px, cintilando) |
| 1 | o Leviatã |
| 1,5 | a bruma de longe, na janela (o Leviatã passa por dentro dela) |
| 2 | a cidade |
| 2,01 | as peças de luz apagada (debaixo da névoa, como a cidade) |
| 2,02 | a cachoeira |
| 2,03 – 2,04 | a tempestade: clarões, nuvem rolando, raios (§4.3) |
| 2,05 | a bruma de trás (3 faixas) |
| 2,07 | os fachos frios |
| 2,08 | os halos e os fachos âmbar das luzes fortes |
| 2,09 | os feixes antiaéreos (§4.1) |
| 2,3 – 2,31 | o tráfego; as lâmpadas dos holofotes |
| 2,39 – 2,5 | o holofote e os propulsores da nave; a nave; as luzes dela |
| 2,6 | a bruma da frente (2 faixas) |
| 2,62 | o clarão do relâmpago na cena inteira |

Por cima, **a Atmosfera** (perfil `menu`, §5) na câmera desta cena. Acima dela, em outra cena e fora do tratamento: o
letreiro, os jatos e o texto (§6).

### 3.1 O Leviatã — a travessia em loop

O Leviatã nada de (200, 30) a (404, 42), em **45 s**, no nado de 6 quadros/s. Quando o menu abre, a travessia já está
**3 s adiantada**: o bicho sai da nuvem por volta dos 2 s, nos segundos de espera, antes do letreiro. **Em loop**: sai
pela direita (~40 s), o céu fica vazio por **6 s** e ele volta a sair da nuvem (*"melhor que ter um corte preto e
iniciar de novo"*). Ele passa por trás das agulhas e na frente do planeta.

### 3.2 As luzes que piscam

- **24 janelas**, sorteadas entre os grupos `janela` pequenos (≤ 6 px² de jogo). Cada uma apaga de tempos em tempos:
  ciclo de 4–11 s, fora por 0,4–2,6 s; 35% delas com uma falha antes de apagar (piscam a 12 Hz por meio segundo).
- **24 luzes de farol** (os grupos `farol`), num ciclo de 2,3 s: 1,4 s acesas e 0,9 s apagadas. **As de uma mesma
  torre piscam juntas** (≤ 3 px de lado e ≤ 14 px de altura entre si), como luz de sinalização.
- **Apagar é tirar a luz da pintura**, não escurecer. O lugar da luz é preenchido por difusão a partir dos pixels
  vizinhos que não mudam: atrás de uma janela fica a parede, atrás de um farol, o céu. Junto sai a franja quente da
  luz (K px) e, num farol, o halo vermelho (3K px; só vermelho de verdade, `r > 1,5 g` e `r > 1,3 b`). A peça
  apagada tem só os pixels que mudam, recortada na caixa da luz mais uma margem (1 px de jogo na janela, 3 no farol).
- **O que é farol** (as regras que custaram as rodadas 8 e 9):
  - vermelho PURO (`r ≥ 130`, `g < 0,36 r`, `b < 0,4 r`), pequeno (≤ 4 px²);
  - contra o escuro: no anel de 2K–3K px em volta, no máximo 5,5% de pixels acesos e quentes (`lum > 55` e
    `r > b + 20`). Os faróis de verdade medem ≤ 4%; os pontos da escada de lava, 7–20%, e ficam **fixos**;
  - um ponto vermelho **cercado** de âmbar (¼ da caixa de raio K) é parte da janela (a porta acesa da rodada 9);
  - a luz de baixo de uma torre, mesmo alaranjada (`r ≥ 120`, `g < 0,5 r`, `b < 0,45 r`), entra como farol se está
    alinhada a um, contra o escuro, e sem luz acesa nos lados (não é lâmpada de deque).

  Os núcleos branco-quentes (`lum ≥ 150`, `r ≥ b`) colados numa luz são parte dela.
- **A cachoeira**: 8 quadros a 10 quadros/s, em loop.

### 3.3 O tráfego nas pontes

Luzes embaçadas, como de quem vê de longe (*"luzes mais distorcidas ou embaçadas"*): um brilho macio de 3,2 px, 1,5×
mais largo que alto, tremendo no ar (alfa 0,6 + 0,25·sen(5,3t) + 0,1·sen(13,1t)). Cor `0xffc88a` (70%) ou `0xfff0d0`,
3–9 px/s para um lado ou outro.

**Cada luz anda só pelo trecho visível do deque**, na fileira das lâmpadas, e some aos poucos nos últimos 2,5 px de
cada ponta, como quem entra num portão (*"luzes furam paredes"*):

| Ponte | De → até (px de jogo) | Luzes |
|---|---|---|
| a de cima, à esquerda | (70; 120,5) → (145; 122,3) | 1 + ⌊comprimento/28⌋, mais 1 em metade das pontes |
| a de baixo, à esquerda | (58; 166) → (112; 166) | idem |
| a do meio (a do círculo dele) | (127; 157,6) → (157; 157,6) | idem |
| a de baixo, à direita | (277; 182,6) → (342; 182,6) | idem |
| a passarela da cachoeira | (332; 130,6) → (346; 130,6) | idem (1 ou 2) |

### 3.4 A nave

**Parada onde ele pintou** (o sobe-e-desce escondia a nave desenhada); só as luzes vivem. A fileira da barriga
(`[5,7] [11,7] [16,7] [18,7] [21,7] [24,7]`, relativo ao recorte) corre a 7 Hz, com uma acesa (1,0) e as outras a
0,35. As de baixo (`[7,8] [9,9] [17,10]`) respiram, e o farol do topo (`[17,3]`) pisca 0,25 s a cada 1,6 s. O
holofote e os propulsores estão no §4.2.

### 3.5 O volume (o tratamento das fases e da cutscene 2)

- **A bruma em camadas** (a do `Parallax` das fases), redesenhada nesta densidade com a mesma receita e a mesma
  semente (`BootScene.makeFogBand`, `0x5eed`). Escala da textura `1 − i·0,095`; anda para a esquerda a `vel` px/s:

  | Faixa | y | h | tint | pico | vel | |
  |---|---|---|---|---|---|---|
  | longe (na janela) | 34 | 72 | `0x3a4658` | 0,30 | 1,2 | atrás da cidade |
  | 1 | 108 | 70 | `0x2c3647` | 0,42 | 1,5 | atrás |
  | 2 | 126 | 70 | `0x323d50` | 0,38 | 3 | atrás |
  | 3 | 144 | 72 | `0x384558` | 0,34 | 5 | atrás |
  | 4 | 158 | 76 | `0x262f3e` | 0,30 | 8 | na frente |
  | 5 | 172 | 80 | `0x1d2531` | 0,24 | 12 | na frente |

- **Os fachos frios** (os `godRay` das fases), tint `0xc8d6ff`, aditivos, respirando
  (pico·(0,7 + 0,3·sen(0,45t + 1,7i))) e derivando devagar: `(300, 72, ×2,0, 0,18, −32°)`,
  `(210, 122, ×2,4, 0,15, −30°)` e `(330, 150, ×1,6, 0,13, −34°)`.
- **A volumetria da cutscene 2:** um halo grande e macio (26–38 px, `0xffb066`, base 0,22–0,32, respirando em
  1,8–3,2 s) nas 5 luzes mais fortes longe das bordas; um facho âmbar raro (`0xffcf9a`, alfa 0,05–0,09) nas 2 mais
  fortes.

## 4. O perigo

*"Precisamos deixar uma impressão de perigo."*

### 4.1 Os holofotes antiaéreos

Três, em estruturas que existem na pintura; nenhum atravessa uma torre no caminho. Feixe em cone macio (largura de
10 px no fim, alfa 0,14, `0xd8e4ff`, aditivo) com a lâmpada na base (brilho de 2,6 px, alfa 0,8). Cada um procura no
seu ritmo: ângulo = `base + amp·sen(2πt/per + fase) + 0,25·amp·sen(2πt/(0,37·per) + 2·fase)` (−90° = para cima).

| Onde | Origem | base | amp | per | fase | comprimento |
|---|---|---|---|---|---|---|
| o topo da cúpula | (26, 80) | −98° | 16° | 21 s | 0 | 120 |
| o terraço à direita da torre alta | (52, 96) | −80° | 13° | 17 s | 3,1 | 130 |
| o terraço da direita da cidadela | (300, 82) | −84° | 14° | 25 s | 1,3 | 110 |

O da cidadela sobe pela janela de céu e às vezes se apaga logo abaixo do Leviatã, sem iluminá-lo (aprovado:
*"não ilumina ele diretamente"*).

### 4.2 A nave vasculhando a colônia

- **Holofote na quilha** (`[14,5; 11,2]` do recorte): cone de 75 px, 22 de largura no fim, alfa 0,16, varrendo o
  vale. Ângulo `92° + 26°·sen(2πt/15) + 6°·sen(2πt/6,3 + 1)`. Lâmpada de 2 px, alfa 0,7.
- **Dois propulsores frios** (`[8; 9,6]` e `[19; 9,3]`): um brilho de 2,4 px (`0x9cc2ff`, alfa 0,5·f) e uma exaustão
  curta (cone 7×3, alfa 0,16·f), com `f = 0,75 + 0,15·sen(31t + 2i) + 0,1·sen(57t + 5i)`.

### 4.3 A tempestade chegando

Na massa de nuvem que ele marcou (o canto de cima à esquerda, até a borda da cidadela), num polígono em px de jogo:
`[2,10] [15,2] [75,1] [201,6] [226,12] [239,33] [259,48] [264,65] [254,80] [226,100] [196,110] [176,105] [131,103]
[95,110] [83,116] [58,114] [38,105] [15,90] [4,75] [1,38]`, com borda suave de 10 px.

- **Clarões por dentro das nuvens.** Cada pixel acende pela própria claridade (`smoothstep(14, 70, lum)`, nunca os
  quentes `r > b + 20`), com queda radial a partir de um de três focos: `(60, 35, r 85)`, `(150, 28, r 95)` e
  `(215, 55, r 70)`. As silhuetas da frente (a torre, a cúpula, a nave) ficam escuras: contraluz. Tint `0xc8d0ff`,
  aditivo, força 0,65.
- **Cada relâmpago tem três golpes:** `[0 s, 1,0, 0,06 s]`, `[0,11 s, 0,5, 0,05 s]` e `[0,22 s, 0,9, 0,08 s]`, cada
  um decaindo em 0,09 s. São três clarões em 0,3 s, dentro do limite de três por segundo para quem é sensível a luz
  piscando.
- **Raios bifurcados em alguns relâmpagos** (*"alguns ficam sem raio para dar aquele ar de distância"*): uma linha
  quebrada com um galho, desenhada macia e depois nítida, só enquanto um golpe está aceso. Ela é recortada por
  `smoothstep(4, 11, lum)`, então passa por trás das silhuetas. Os três traçados: `(36,16)→(104,44)`,
  `(142,10)→(196,38)` e `(206,26)→(168,70)`.
- **A cena inteira pega um pouco** de cada clarão (`0x8890b0`, aditivo, 0,05).
- **A nuvem pesada rolando:** a bruma escura (`0x05070c`, alfa 0,8, escala ×2,2/×2,4) anda devagar só sobre as nuvens
  dessa massa. A máscara é a do céu da região, sem silhueta nem prédio aceso e só acima dos telhados (some entre
  y 58 e 80), para não escurecer a cúpula e a torre.
- **No menu:** um relâmpago a cada 6–12 s, sorteado (o foco também), com raio em cerca de metade deles. O primeiro
  é fixo, aos **2,4 s, com raio**, antes do letreiro. **Nenhum relâmpago entre a entrada do letreiro e os olhos
  acenderem** (3,0–10,5 s da abertura).
- **As máscaras são assadas fora do jogo** (no maquete elas nasciam na página, alguns segundos e ~37 MB de textura):
  os clarões em meia resolução, recortados na caixa da região; os raios recortados na caixa de cada um; a máscara da
  nuvem rolando em meia resolução.

## 5. O tratamento: a Atmosfera `menu`

Perfil novo em `perfis.ts`, com as cores tiradas da pintura:

```ts
nevoa: { densidade: 0.75, cor: [42, 52, 67], altura: 2.2, velTras: [-3, 0], velFrente: [-8, 0], evolucao: 0.02 },
halo: { forca: 0.3, limiar: 0.59, cor: [182, 120, 70] },
grade: 1, gradeQuente: 1, vinheta: 0.55, grao: 0.6,
poeira: { quantidade: 50, cor: [67, 83, 107], deriva: [-4, -1], espalhar: 2 },
```

**A Atmosfera ganha uma escala** (`uEscala`, padrão 1). O shader mede em pixels de tela (as células da névoa 70×26 e
45×18, os 7×7 toques do halo a 2 px), então numa tela 4× tudo encolhia e o tratamento quase sumia. Com
`uEscala = s`, a névoa mede `tela / uEscala` e o halo pisa `2 · uEscala`: o mesmo tamanho na tela que nas fases. O
dither e o grão ficam no pixel fino. A poeira deriva `× s`, com partícula de `s/2` px. As outras cenas seguem em 1.

## 6. A abertura e o letreiro

### 6.1 A linha do tempo

| t | O quê |
|---|---|
| 0 – 1,2 s | O véu preto sai (por cima do cenário, debaixo do texto). |
| ~2 s | O Leviatã sai da nuvem. |
| 2,4 s | O primeiro relâmpago, com raio. |
| 3,0 s | O letreiro entra pelo alto, **apagado e sem sinal dos olhos**, já freando. |
| 3,0 – 6,8 s | **A descida controlada**: os retrofoguetes queimam o caminho todo; os laterais corrigem a deriva. |
| 6,8 – 7,6 s | Passa 2,5 px do ponto; um sopro de baixo o devolve, um de cima o segura; firma. |
| 7,2 s | A lista desce em formação. |
| ~8,6 s | A lista pousa: **o menu aceita teclas**. |
| 8,8 s | O neon pega letra por letra; depois o REMASTERED. |
| ~10,4 s | **Por último, os olhos do W.** |

**Pular:** qualquer tecla antes de a lista pousar leva direto ao menu pousado (o letreiro aceso com os olhos, a lista no
lugar, sem jatos). **Movimento reduzido** (`prefers-reduced-motion`): o menu já abre pousado e **sem relâmpagos**. A
cena ambiente continua, porque é lenta.

### 6.2 O letreiro como nave — a queda

O título e o REMASTERED descem como uma peça só. *"Os estabilizadores de foguetes que soltam os propulsores para
estabilizar ou fazer manobras"*; *"o letreiro precisa cair mais lentamente, como se ele estivesse sendo controlado"*.

- **Vertical:** de `y −30` até o ponto `y 58` (o centro do letreiro; ~27% da altura, abaixo do caminho do Leviatã e
  longe da borda). Durante a **queima de 3,8 s**: `y = −30 + Dq·(1 − (1 − u)^2,4)`, `u = τ/3,8`,
  `Dq = 58 + 2,5 + 30`. Ele entra a ~57 px/s e freia forte e constante, aliviando só no fim. Para **2,5 px além** do
  ponto e volta numa mola (período 0,9 s, amortecimento 0,55). Antes de entrar, anda em linha reta na velocidade da
  queima, para a posição e a velocidade não terem salto.
- **Lateral:** chega 6 px para o lado, e uma mola (período 1,4 s, amortecimento 0,35) o corrige a descida inteira.
- **Posições no pixel da tela** (¼ de px de jogo em s = 4): as letras ficam nítidas enquanto andam.
- **O REMASTERED** vai 13 px abaixo do centro do letreiro, em texto Silkscreen 8, como hoje. Apagado é `0x2f3c50`;
  aceso é `0x17a6bd`.

### 6.3 Os jatos

Cada bocal dispara quando a aceleração do letreiro pede o empurrão dele, então a física comanda os jatos:
`força = min(1,4, max(0, −a·u) / ref)`, em que `u` é a direção do gás.

| Bocais (relativos ao centro do letreiro) | Direção do gás | Peso |
|---|---|---|
| **sob o 2º E, o A, o 3º E e o último E do REMASTERED**: dx −34,1 / −13,6 / +14,9 / +33,9, dy 16,5 | para baixo | 0,8 cada |
| sobre o título: (±48, −7) | para cima | 0,5 |
| à esquerda: (−62, 0) e (−50, 13) | para a esquerda | 0,3 / 0,22 |
| à direita: (62, 0) e (50, 13) | para a direita | 0,3 / 0,22 |

- `ref = 60 px/s²`. Durante a queima, os bocais verticais usam `60·(2,2/3,8)²`: a queima mais longa e suave mantém
  **a mesma pluma** que ele aprovou na rodada 7 (*"a queima já ficou como eu queria"*). Os laterais e o ajuste final
  ficam em 60.
- **Emissão:** 420 partículas/s × força × peso, numa grade fixa de 60 Hz, com o acaso tirado de um hash de
  (instante, bocal, partícula). É função pura do tempo.
- **A partícula:** vive 0,18–0,42 s, sai a 90–150 px/s num cone de 0,32 rad e freia no ar (constante de 0,13 s).
  Herda 60% da velocidade do letreiro (a pluma estica no freio) e o vapor deriva com o ar da noite (−3, −2 px/s).
  É branca-quente (`0xfff3dc`, 0,75 px) até 0,05 s, âmbar (`0xffb860`, 1 px) até 0,13 s, e depois vapor frio
  (`0x9eacc2`, crescendo até 2 px, alfa `0,6·(1 − f)^1,5`). São quadradinhos nítidos na camada do texto.

### 6.4 A lista e o acender

- **A lista** desce em formação aos 7,2 s, com as linhas a 0,08 s uma da outra (nunca se cruzam no ar): 14 px de
  queda numa mola (período 0,95 s, amortecimento 0,5), aparecendo em 0,45 s.
- **O acender:** letra por letra a cada 0,07 s, cada uma acesa (0–0,04 s), apagada (0,04–0,09 s) e acesa de vez — a
  falha das janelas da cidade. O REMASTERED vem 0,1 s depois, a 0,025 s por letra. **Os olhos acendem 0,45 s
  depois do REMASTERED**, com a mesma falha.
- **No repouso:** o letreiro respira (alfa 1 → 0,82, período 5,2 s); o item do cursor pisca (1 → 0,4, período
  2,2 s); os outros ficam a 0,7.

### 6.5 O letreiro: o neon

A base B da rodada 7, *"a neon que acende, da forma que usou no gif"*. Vem das letras exatas da Silkscreen do jogo,
então a grafia é certa e o W continua sendo a cabeça do alien. A mesma fonte assada que o texto usa (8 px,
binarizada).

- **A grade:** cada pixel da fonte vira P×P pixels do letreiro, e cada pixel do letreiro ocupa 2 px de tela. Em
  s = 4, P = 4: 244×32 (488×64 na tela, o tamanho do título de hoje). **Gerado na hora para a escala da tela**
  (P = s), então fica nítido em qualquer tela, como o texto.
- **Os tubos:** vidro correndo pelo contorno de cada letra: borda `0x28c8e8`, núcleo `0xd6fcff`. Os ocos pequenos
  (os degraus do N) são preenchidos pelo tubo; os grandes (≥ 40·(P/4)² px: a cara do W) ficam escuros, com um
  brilho por dentro. Aceso, o brilho vaza no ar em 3 px (alfa 120, 64, 28 de `0x28c8e8`).
- **Apagado:** vidro cinza (`0x3e4858` / `0x64728a`), com um fundo escuro nos ocos e um contorno escuro fino. **Sem os
  olhos.**
- **Os olhos:** dois pontos no rosto do W (colunas 2 e 4, linha 3 da letra), meio pixel de fonte cada, vermelho
  `0xff3a2a`, com um pixel quente `0xffc8b4` e um anel vermelho fraco em volta.
- **O acender por letra** usa as faixas de coluna de cada letra (com a divisa no meio do vão, para o brilho ir junto
  com a sua letra).
- As outras três bases (o casco, a placa vazada e o ciano lapidado) ficam em `folhas/.../rodada7/bases/`, como
  registro.

## 7. O menu pousado

### 7.1 O lugar das coisas (px de jogo, centralizado em x 192)

| Peça | y |
|---|---|
| o letreiro (centro) | 58 |
| REMASTERED | 71 |
| a lista | 178 / 188 / 198 |
| a descrição da condução | 208 |

O meio da pintura fica livre. As linhas de atalho de desenvolvimento (`[B] chefão …`) seguem só no modo de
desenvolvimento, no alto.

### 7.2 A lista e a condução numa linha

*"Deixando mais limpo o cenário"*: o bloco de quatro linhas de condução virou **uma linha da lista**.

- **Os itens:** `COMEÇAR`, `CONDUÇÃO: DIEGÉTICA | LEGACY | LIVRE` e `ARQUIVO DE CARTAS` (este só com a camada HD,
  como hoje). O item do cursor ganha `> … <`, a cor `0xb5f7ff` e o piscar.
- **As teclas:**
  - ↑↓ (e W S) movem o cursor;
  - ←→ (e A D) na linha da condução trocam o valor;
  - Enter ou Espaço: em COMEÇAR, começa com a condução escolhida; na condução, avança o valor; no ARQUIVO, abre o
    Arquivo;
  - **1, 2 e 3 continuam como atalho** (começam direto em diegética, legacy e livre), só não ficam escritos na tela.
- **A descrição** aparece **só com o cursor na condução**, em Silkscreen 7, na cor do valor:
  - DIEGÉTICA: `a gravidade decide · recomendado`, em `0x3ee0f0`;
  - LEGACY: `flap sempre · score ×1.25`, em `0xff8c1a`;
  - LIVRE: `voo livre sempre · acessível`, em `0x17a6bd`.
- **A condução escolhida fica lembrada** entre sessões (`localStorage`, com try/catch; sem ele, DIEGÉTICA). É uma
  decisão minha, a confirmar: sem isso, quem joga em Legacy teria de trocar a cada vez.

## 8. A arquitetura

### 8.1 Onde mora

**O cenário mora numa cena própria da camada HD**, `MenuCenaHD`, posta **atrás** da cena irmã do texto. A câmera
dela tem zoom `s`, como as irmãs, então tudo se escreve em px de jogo. A pintura (assada em k = 4) entra com escala
¼ e **filtro LINEAR**: a camada HD é `pixelArt: true`, e a pintura é a única coisa que se amplia (21% em Full HD). Em
s = 4 ela cai 1:1. O Leviatã de 96 px vai junto. A Atmosfera fica na câmera desta cena.

O letreiro, os jatos e o texto ficam na cena irmã, por cima e fora do tratamento.

**O `MenuScene`** (no mundo) perde o diorama antigo (as nebulosas, a lua, as montanhas, o Leviatã de 0,6, o
emblema, as estrelas). Ele fica com o que é dele: abrir e fechar a `MenuCenaHD`, o relógio da abertura, a lista, as
teclas, pular, o repouso e o movimento reduzido. O canvas do mundo fica preto debaixo da camada.

**Mudança de escala** (a janela muda, `EVENTO_ESCALA`): a câmera da `MenuCenaHD` segue o `s` novo (como as irmãs), a
Atmosfera troca o `uEscala`, e o letreiro é gerado de novo para o `s` novo.

### 8.2 As peças (uma responsabilidade cada)

| Arquivo | O que faz |
|---|---|
| `src/menu/numerosMenu.ts` | todos os números deste documento, num lugar só (como `numerosElites.ts`) |
| `src/menu/abertura.ts` | funções puras do tempo: a posição, a velocidade e a aceleração do letreiro, a emissão dos jatos, a lista, o estado do acender, a descrição; sem Phaser |
| `src/menu/letreiro.ts` | gera o neon (apagado / aceso / com olhos) para uma escala `s`, a partir da fonte assada; devolve texturas e as faixas de cada letra |
| `src/menu/MenuCenaHD.ts` | a cena do cenário na camada HD: carrega as camadas, monta as peças, chama o `update(t)` de cada uma |
| `src/menu/vida.ts` | as estrelas, as janelas e os faróis que piscam, a cachoeira, o tráfego, a nave e as luzes dela |
| `src/menu/volume.ts` | a bruma em faixas, os fachos frios, os halos e os fachos âmbar |
| `src/menu/perigo.ts` | os holofotes, o holofote e os propulsores da nave, a tempestade |
| `src/menu/leviata.ts` | a travessia em loop |
| `src/menu/jatos.ts` | o pool de partículas dos jatos na cena irmã, desenhado a partir de `abertura.ts` |
| `src/systems/atmosfera/*` | o `uEscala` no shader e a opção `escala` na Atmosfera; o perfil `menu` |
| `src/uiHD.ts` | um ajudante para pôr uma cena de fundo na camada, atrás das irmãs |

### 8.3 Sem a camada HD

Se a camada HD não nascer (hoje o jogo segue com o texto no mundo), as mesmas peças rodam no próprio `MenuScene`, na
densidade 1, com as camadas assadas em k = 1. O título vira o texto Silkscreen, que acende por cor (o marcador de
lugar da rodada 6); não há neon. A Atmosfera fica em escala 1. É a versão "resolução do jogo" das rodadas 2–3.

### 8.4 Os arquivos de arte

- **Entram em `public/sprites/menu/`:** as camadas em k = 4 e k = 1 (§2), o Leviatã de 96 px e as máscaras da
  tempestade (§4.3).
- **Viram backup em `assets/raw/*-original.png`** (*"não jogue fora o que temos"*): as peças só do menu antigo, que é
  a lua (`menu-moon.png`) e o emblema (`menu-logo-sheet.png`). Elas saem do `BootScene`.
- **Deixa de ser carregado no jogo:** o nado de 176×80 (`leviathan-swim-sheet.png`). Ele vira a fonte do de 96 px.
- O que outras cenas usam (as montanhas do `Parallax`) fica onde está.

## 9. Como verificar

- **`scripts/probe-menu.mjs`** (sonda nova, com o relógio a passos, como as outras):
  1. a `MenuCenaHD` está ativa e atrás da irmã;
  2. em t = 2,5 / 4 / 5,5 / 7 / 9 / 11 s, o letreiro está na curva do §6.2, os jatos aparecem só na descida, e a lista
     e o acender estão nos tempos do §6.1;
  3. pular em t = 1 s leva ao menu pousado;
  4. ↑↓ movem, ←→ trocam a condução e a descrição, Enter em COMEÇAR abre o jogo com a condução escolhida, e 1/2/3
     começam direto;
  5. com movimento reduzido, o menu abre pousado e sem clarão;
  6. de 1536 para 1920 de largura, s vai de 4 para 5, e as camadas, a Atmosfera e o letreiro acompanham;
  7. nenhum erro no console.

  Gera uma folha de quadros para eu olhar ampliado antes de mostrar a ele.
- **`scripts/_menu/_auditar-luzes.mjs`** sempre que as camadas forem assadas de novo: cada luz que pisca, acesa e
  apagada, recortada como o menu recorta.
- `npm run typecheck` e `npm run build`.
- **Ele joga e olha**, de preferência na tela cheia do PC dele.

## 10. Fora deste bloco

- Sons: o trovão, o zumbido dos holofotes e a música do menu não foram discutidos.
- A cena final (bloco D) não muda, embora seja a mesma colônia.
- O emblema do bloco I (item 9) foi substituído pelo letreiro de neon.

## 11. As ferramentas e as folhas

`scripts/_menu/`:
- `_capturar-menu.mjs`: o menu antigo;
- `_maquete.mjs`: a rodada 1;
- `_maquete2.mjs`: as rodadas 2–9; os modos `jogo`, `par`, `hd` e `abertura`, com `FOTOS="…"` para quadros extras;
- `_camadas.mjs`, `_leviata-menor.mjs`, `_glifos.mjs`, `_letreiro.mjs`, `_auditar-luzes.mjs`;
- `_webm.mjs`: o vídeo. O ffmpeg do Playwright só lê JPEG por image2pipe, de arquivo.

As folhas `docs/superpowers/folhas/2026-10-19/menu/rodada{2..9}.html` guardam cada decisão com vídeo.
