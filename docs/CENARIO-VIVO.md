# O CENÁRIO VIVO — a técnica do menu (bloco E, 19–20/10/2026)

Como uma pintura parada vira um lugar vivo, tratado e com perigo no ar, sem que nenhum detalhe fique estranho. Foi
feito para o menu (spec `docs/superpowers/specs/2026-10-19-menu-refeito-design.md`, plano
`docs/superpowers/plans/2026-10-19-menu-refeito.md`), e vale para qualquer cenário pintado: um menu novo, o fundo de
uma fase, uma cutscene. O código está em `src/menu/`; as ferramentas, em `scripts/_menu/`; os números aprovados, em
`src/menu/numerosMenu.ts`.

## 0. O método (antes de qualquer código)

1. **A pintura é dele.** Ela entra inteira; o que muda é o que vive POR CIMA dela. Nada de redesenhar a pintura.
2. **Maquete no jogo, nunca no vácuo.** Cada rodada roda no próprio jogo, com o texto de verdade, filmada num relógio
   a passos (`scripts/_menu/_maquete2.mjs`, `_webm.mjs`) e mostrada numa folha HTML com vídeo. Ele julga olhando.
3. **Tudo é função do relógio.** Nenhum tween: o mesmo instante dá sempre o mesmo quadro (`ritmos.ts`, `abertura.ts`).
   Isso permite filmar, sondar (`irPara(t)`) e testar no Node (`scripts/test-menu-*.mjs`).
4. **Um efeito de cada vez, e conferido ampliado.** Recorte ×3 de cada região antes de mostrar. Ele acha o que você
   não olhou: buraco escuro, luz atravessando parede, farol em descompasso.

## 1. As camadas (`scripts/_menu/_camadas.mjs`)

A pintura vira camadas numa densidade `k` (pixels de camada por pixel de jogo): 4 para a camada HD, 1 para 384×216.
Reduza do ORIGINAL uma vez só (lanczos3).

| Camada | Como |
|---|---|
| **céu** | a pintura de fundo, só onde a da frente é transparente (a "janela" que ele recorta para algo aparecer e sumir). Limpe o que vaza (as agulhas-fantasma). |
| **cidade** | a pintura da frente, com o alfa apertado (`smoothstep 0,25→0,6`): a borda semitransparente deixava o rabo do Leviatã aparecer através da ponta de uma torre. |
| **o que se move** | recorte com máscara (a nave) e remende o buraco com a textura vizinha (as nuvens 130 px ao lado). Se o recorte não se mexe, deixe-o PARADO no lugar pintado: o sobe-e-desce mostrava a nave desenhada por baixo. |
| **apagadas** | o estado apagado de cada luz que pisca (§2). |
| **água** | os pixels claros dentro de uma caixa, em N quadros com listras que descem 1 px por quadro (o loop fecha sozinho). |

O que passa por trás (o Leviatã) fica ENTRE o céu e a cidade: aparece só na janela. As profundidades do menu:
céu 0 · estrelas 0,5 · Leviatã 1 · véu do espaço 1,45 e 1,55 (22/10) · bruma da janela 1,5 · cidade 2 · luzes apagadas 2,01 · água 2,02 · clarões e nuvem
2,03–2,04 · bruma de trás 2,05 · fachos 2,07–2,09 · tráfego 2,3 · nave 2,4 · bruma da frente 2,6 · véu 50.

## 2. As luzes

**Detectar.** Janela = quente (`r ≥ 105`, `r > b + 45`, `r > 1,12 g`) mais os núcleos branco-quentes encostados. Farol =
vermelho PURO (`r ≥ 130`, `g < 0,36 r`, `b < 0,4 r`), pequeno (≤ 4 px²) e contra o escuro. As armadilhas que custaram
rodadas:

- laranja saturado NÃO é farol (eram fachadas inteiras piscando como quadrados escuros);
- vermelho cercado de âmbar (`g ≥ 0,42 r`, em ¼ ou mais da caixa de raio K) é parte da janela: uma porta acesa virava um
  borrão quando "o farol" apagava;
- vermelho dentro de luz (mais de 5,5% de pixels quentes no anel de 2K–3K px; a escada de lava mede 7–20%, os faróis
  reais ≤ 4%) é luz fixa;
- a luz de baixo de uma torre, mesmo alaranjada, é do farol (pisca com ele), se não está numa fileira acesa (deque).

**Apagar é tirar a luz da pintura.** Nunca escureça o pixel (vira um buraco preto com franja laranja). Preencha a luz
e a franja quente dela (K px; no farol, o halo vermelho de 3K, só o que é vermelho: `r > 1,5 g` e `r > 1,3 b`) por
DIFUSÃO a partir dos vizinhos que não mudam: atrás da janela fica a parede, atrás do farol o céu. A peça apagada tem só
os pixels que mudam (o resto transparente) e fica DEBAIXO da névoa (a peça opaca por cima da bruma deixava um retângulo
limpo). No jogo, cada luz é a camada `apagadas` recortada (`setCrop`) na caixa dela + a margem, visível só quando apagada.

**O farol apaga perdendo o vermelho** (22/10, `apagarFarolPelaTinta`): a difusão trocava o halo pelo céu e levava junto
o que a luz tingia (o mastro rosado, a quina do topo): *"a torre some"*. O pixel avermelhado mais claro que o céu de trás
(uma estrutura) fica, sem o vermelho; o halo sobre o céu volta a ser céu; o âmbar e o bege não mudam. Uma correção num
cenário aprovado é PONTUAL (`CORRECOES` em `_camadas.mjs`): mudar a regra geral muda quais luzes piscam.

**Piscar.** Janelas: 24, sorteadas entre as pequenas (≤ 6 px²), cada uma no seu ciclo (4–11 s, fora 0,4–2,6 s), 35%
com uma falha a 12 Hz antes de apagar. Faróis: 1,4 s acesos a cada 2,3 s; **os da mesma torre juntos** (≤ 3 px de lado,
≤ 14 de altura: `torres()` em `ritmos.ts`, uma união de conjuntos).

**Auditar.** `scripts/_menu/_auditar-luzes.mjs` mostra cada luz que pisca, acesa e apagada, recortada como o jogo
recorta. Rode sempre que assar de novo.

## 3. A vida (`src/menu/vida.ts`, `leviata.ts`)

- **Tráfego**: luz EMBAÇADA (o brilho macio, 1,5× mais largo que alto, tremendo no ar), andando só no trecho VISÍVEL de
  cada deque (meça na pintura com régua), sumindo nos últimos 2,5 px de cada ponta. Linha que passa da ponta = luz
  atravessando parede.
- **Luzes de uma máquina**: posições relativas ao recorte; uma fileira que corre, umas que respiram, um farol.
- **Estrelas**: só onde a frente é transparente e o céu é escuro.
- **Um bicho ao longe**: pequeno (96 px de camada = 24 px de jogo), lento (45 s de travessia), atrás das camadas de
  frente, com um aro frio; em loop com uma pausa de 6 s de céu vazio (nada de corte preto).

## 4. O volume (`src/menu/volume.ts`: o tratamento das fases, além da Atmosfera)

- **Bruma em faixas** (a textura das fases, redesenhada na densidade): velocidades diferentes vendem o volume; as mais
  rápidas passam NA FRENTE das luzes; uma faixa na janela fica atrás da cidade e na frente do bicho.
- **Fachos frios** atravessando a névoa, vindos da fonte de luz da pintura (o planeta).
- **Volumetria**: um halo grande e macio respirando nas luzes mais fortes; um facho âmbar raro.
- **A Atmosfera** por cima de tudo isso, com perfil tirado da pintura (névoa = tons médio-escuros ×1,5 + toque frio;
  halo = média do âmbar aceso; o perfil `menu` em `src/systems/atmosfera/perfis.ts`). Numa tela em `s×`, `uEscala = s`
  (a névoa e o halo medem em pixels do jogo), e a poeira nasce na área do jogo, com metade do tamanho.

## 5. O perigo (`src/menu/perigo.ts`)

- **Holofotes**: cone macio aditivo (`menu-cone`), a lâmpada na base, em estruturas que existem; ângulo = varredura +
  vagueada mais lenta, cada um no seu relógio; nenhum atravessa uma torre (escolha a base e a faixa de ângulos para
  isso).
- **Tempestade**: o clarão acende cada pixel de nuvem pela PRÓPRIA claridade (as silhuetas da frente ficam escuras:
  contraluz), com queda a partir de um foco; três golpes por relâmpago (nunca mais de 3 clarões/s); raio bifurcado em
  metade deles (o resto, "ar de distância"), recortado pela máscara do céu; a nuvem pesada rolando só sobre as nuvens
  (BitmapMask, só no WebGL) e acima dos telhados. As máscaras são assadas fora (`_tempestade.mjs`): clarões e nuvem em
  meia resolução, recortados nas caixas; o primeiro relâmpago tem hora marcada (2,4 s), os outros a cada 6–12 s.
- **Hierarquia**: um evento por vez; o constante é lento e fraco; o forte é raro e curto; nada compete com o momento
  principal (nenhum relâmpago durante a entrada do letreiro, nem com movimento reduzido).

## 6. O texto por cima

O texto, o título e os jatos moram na camada HD, fora do tratamento, nítidos (posições no pixel da tela: 1/s). Um
título que é objeto (o letreiro de neon) se gera das letras exatas da fonte do jogo (`glifosDaFonte` em `src/fonte.ts`
→ `letreiroPixels.ts`, conferido pixel a pixel contra o gabarito em `scripts/fixtures/menu/`), na escala da tela; acende
letra por letra com a mesma falha das janelas da cidade.

## 7. Movimento de objeto com física (a nave-letreiro, `src/menu/abertura.ts`)

Defina a trajetória (a queima: `y = 1 − (1 − u)^2,4` em 3,8 s, uma mola no fim; outra mola de lado) e derive a
ACELERAÇÃO. Cada bocal dispara com força proporcional à aceleração contra ele: a física comanda os jatos. Partícula:
branca → âmbar → vapor frio que cresce, freia no ar e herda parte da velocidade. Queima mais longa e suave: escale a
referência para manter a mesma pluma (aqui, `(2,2 / 3,8)²`). As partículas também são função do tempo (uma grade de
emissão a 60 Hz e um hash por partícula), então a sonda vê as mesmas em qualquer instante.

## 8. Onde mora (a arquitetura do menu)

- **`MenuCenaHD`** (`src/menu/MenuCenaHD.ts`): uma cena na camada HD, posta ATRÁS de todas (`cenaDeFundoHD` em
  `uiHD.ts`); a câmera no zoom `s` da camada, então tudo se escreve em px de jogo; a pintura k4 entra com escala ¼ e
  filtro LINEAR (a camada é `pixelArt`: sem isso, a pintura ampliada vira blocos).
- **`Cenario`** (`src/menu/cenario.ts`): monta o céu, a cidade e as peças (`leviata`, `vida`, `volume`, `perigo`); cada
  peça recebe o contexto e devolve `atualizar(t)`.
- **`MenuScene`**: o relógio da abertura e o texto (na irmã da camada). Escreve o `estado` que o cenário lê (o véu, a
  janela quieta da tempestade).
- **Sem a camada HD** (`?semhd` em dev): o mesmo `Cenario` roda no próprio `MenuScene` em k1 (384×216).

## 9. As armadilhas da implementação

- **O `roundPixels` arredonda a POSIÇÃO em px de JOGO** (Phaser 3.90, `floor` antes do zoom da câmera): na camada HD um
  objeto que anda devagar vai aos saltos de `s` px de tela (5 em 1920) — o Leviatã "descia degraus" (22/10). A posição
  fica inteira e a fração vai pela origem de desenho (`setDisplayOrigin`, que não é arredondada): ver `leviata.ts`. As
  `TileSprite` não sofrem disso (o `tilePosition` anda a textura).
- **Dentro do `create()`, `sys.isActive()` é falso** (o estado é CREATING). Para "a cena ainda existe?", use
  `sys.settings.status < Phaser.Scenes.SHUTDOWN`.
- **`scene.remove` só emite `DESTROY`**, não `SHUTDOWN`: quem segura pipeline solta no `DESTROY` (`Atmosfera.liberar`).
- **Nas sondas, nada de `import('/src/x.ts')` de módulo com estado**: depois de um HMR o Vite serve o módulo com `?t=`,
  e o import nu cria uma SEGUNDA instância, que não enxerga a camada viva. Importe pela URL que a página carregou
  (`performance.getEntriesByType('resource')`) ou fale direto com `window.__gameHD.scene`. Módulos puros (números,
  funções do tempo) podem ser importados à vontade.
- **`browser.newPage()` do Playwright abre um contexto novo**: para testar o que fica no `localStorage`, abra as páginas
  de um `browser.newContext()` só.
- **Relógio a passos**: `game.loop.sleep()` nos dois jogos e `game.step(agora, dt)` em 1/30 s. O carregamento de uma
  cena (imagens) é assíncrono e não anda com os passos: troca de cena se testa em tempo real.

## 10. Para um cenário novo (um menu, o fundo de uma fase)

1. Peça a pintura com a janela recortada onde algo vai aparecer.
2. `_camadas.mjs <saída> <k>` (ajuste o recorte, a caixa do que se move, a caixa da água) e `_tempestade.mjs <saída>`
   se houver tempestade.
3. `_auditar-luzes.mjs` e corrija as regras de luz se algo apagar estranho.
4. Meça na pintura (com régua: `_pontes.png`, `_esq.png` nas folhas de 19/10) as pontes, as bases dos holofotes, a
   região da tempestade.
5. Os números num `numeros*.ts`; as peças (`vida`, `volume`, `perigo`) aceitam o contexto e devolvem `atualizar(t)`.
6. Maquete, filme, folha, ele olha. Só depois, o jogo. No jogo: `_ver-cenario.mjs <out.png> <segundos>` mostra o
   cenário em qualquer instante; `_filmar-menu.mjs` filma.
7. Numa fase (384×216, k = 1), as mesmas peças rodam no mundo, abaixo das camadas de jogo; o tratamento já é o da
   fase.
