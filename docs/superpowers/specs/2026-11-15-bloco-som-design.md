# Bloco SOM — os efeitos sonoros do jogo (design)

> 15/11/2026. Decisões dele por brainstorming, uma pergunta por vez. O roadmap mudou nesta sessão: **o som entra AGORA,
> antes do F e do rebalanceamento** (*"vamos aproveitar que maioria está definida para introduzir som [...] o som é um
> tópico inteiro, então podemos finalizar ele sem perigo do restante"*). **A trilha é dele; os efeitos são meus.**

## 0. Onde estamos (conferido no código em 15/11)

- **Nenhum efeito sonoro existe.** Só `src/systems/Music.ts`, com duas faixas (`stage1`, `boss`, carregadas no
  `BootScene`), transição cruzada, `fator` (o volume do jogador) e `abafar` (a pausa).
- **O volume EFEITOS já existe** nas CONFIGURAÇÕES (`preferencias.ts`: `volume.efeitos`; `aplicarPreferencias.ts`:
  `volumeEfeitos()`), mas nada o lê.
- O navegador só libera áudio depois da primeira interação; o `Music.play` já espera o destravamento.

## 1. As decisões dele

1. **O caráter: cinematográfico e pesado predomina** (a trilha dele é orquestra + metal, dark sci-fi, atmosférica),
   **com toques retrô** onde ajudam a LER o jogo: a interface, os avisos, os coletáveis. O som se encaixa no visual que
   JÁ existe — nenhuma arte nova nasce deste bloco.
2. **A liberdade do jogador:** jogar com trilha + efeitos, só a trilha, ou só os efeitos — e quem tirar a trilha ainda
   tem atmosfera. Por isso o **ambiente dos cenários entra neste bloco**, do lado dos efeitos, como a última folha.
3. **Os controles não mudam:** GERAL abaixa tudo; MÚSICA é só a trilha; **EFEITOS é a ação + o ambiente**. Sem controle
   novo.
4. **O ajuste automático (invisível):** o ambiente e o motor da nave ficam baixos por baixo da trilha e sobem quando a
   MÚSICA está em 0 (ver §3.3).
5. **Aprovação por FOLHA DE SONS para tudo:** nada entra no jogo sem ele ouvir e escolher numa folha, grupo a grupo, com
   2–3 versões por som. Depois, a conferência jogando.
6. **As 8 folhas, nesta ordem:** 1 a nave · 2 as explosões · 3 os inimigos comuns e os perigos · 4 os elites · 5 os
   chefões · 6 a interface · 7 as cutscenes · 8 o ambiente.
7. **As três naves soam diferentes** — X-AELO, TERMINUS e CHARYBDIS, cada uma com o seu tiro, o seu motor e a sua
   morte. A X-AELO e a TERMINUS têm a mesma arma (`baseHumana`); só o timbre muda, os números não.
8. **O motor da nave é contínuo pelo ajuste automático:** quase some sob a trilha, aparece sem ela.
9. **Os sons EXCLUSIVOS de momento** (pedido dele, a lista fica aberta a outros):
   - **o estrondo sônico na abertura da F1** — o jato quebrando a barreira do som quando a fase começa;
   - **os trovões no menu da noite**, presos aos relâmpagos que já existem (§5).
10. **A acústica pelo lugar:** *"tudo que é na atmosfera tem aquele som mais abafado"*; no espaço, **o som de cabine**
    (seco); e **a distância decide** — o que está ao fundo, no vácuo, fica quase mudo (§4).

## 2. As fontes e a licença

| Fonte | Para quê | Licença |
|---|---|---|
| **PixelLab `create_sound_effect`** (a assinatura dele, Tier 2) | os sons de identidade e os específicos (a lula cuspindo tinta, o casco rangendo, o estrondo sônico) | gerado na conta dele |
| **Kenney** (Sci-Fi, Impact, Interface…) | base e camadas | CC0 |
| **Freesound** (filtro CC0) | sons específicos (rugido, metal, água) | só CC0 |
| **Sonniss GDC** | camadas de estúdio (explosão, metal, vento) | conferir os termos do ano NA PÁGINA da licença antes de usar um arquivo |
| **sfxr / ZzFX** | os toques retrô da interface e dos avisos | o ARQUIVO gerado entra; o código do jsfxr não entra no jogo |

- Orçamento PixelLab conferido em 15/11: **3.985 gerações**, renovação em 04/12. Estimativa do bloco: 600–800 (1 geração
  por som de até 1,6 s, 2 até 3,2 s, 4 a 6 s; o ambiente em laço é o caro).
- **Nada sem licença conferida.** Cada arquivo do jogo tem uma linha em `docs/SONS.md`: o nome no catálogo, a fonte, o
  autor, a licença, o link e o que foi feito nele (camadas, corte, tom).
- Os originais baixados/gerados ficam em `assets/raw/sons/<grupo>/` (fora do `public/`); o tratado vai para
  `public/sfx/`.

## 3. A estrutura no jogo

### 3.1 O tocador único — `src/som/Som.ts`

Todo efeito passa por ele; nenhuma cena chama `scene.sound` para efeito (a trilha segue no `Music`).

- **Um motor próprio em Web Audio**, sobre o `AudioContext` do Phaser (`scene.sound.context`) e os `AudioBuffer` que o
  loader do Phaser já decodifica (`cache.audio`). O caminho de cada voz: `BufferSource → ganho da voz → pan → barramento
  da camada → acústica do lugar → ganho de saída → destino`. Motivo: a acústica (§4) é um filtro no barramento, e a
  trilha NÃO passa por ela (a trilha não é som do mundo); o `playbackRate` dá a variação de tom; o teto de vozes é nosso.
- `Som.tocar(nome, { x?, forca? })`: `x` (posição na tela) vira o pan estéreo, suave (±0,4); `forca` (0–1) escala o
  volume onde o evento tem intensidade (o trovão, a explosão maior).
- **Variação a cada disparo:** tom ±3–5% e volume ±10% (o valor por som no catálogo), para o tiro repetido não soar
  metralhado.
- **Teto de vozes por som** (ex.: o tiro 4, a explosão comum 6, o chefão 2) e **um disparo por som por quadro**.
- **Prioridade sob o teto geral (24 vozes):** o jogador e os chefões passam à frente do inimigo comum; a voz mais velha
  e mais baixa sai primeiro.
- **Laços** (o motor, o ambiente): `Som.laco(nome)` devolve um controle (`volume`, `parar(ms)`), com entrada e saída
  suaves.
- **A pausa** abafa os efeitos como abafa a música (o mesmo `abafar`); **na NAVE PERDIDA** os efeitos se calam e só o
  ambiente segue, baixo.
- **Sem Web Audio** (navegador antigo, Phaser caído no HTML5 Audio): o tocador fica mudo, sem erro. Antes do
  destravamento, `tocar` descarta (um tiro atrasado é pior que nenhum) e `laco` espera.

### 3.2 O catálogo — `src/som/catalogoSons.ts`

Dado puro, sem Phaser (o molde do `catalogoCartas`), testável no Node. Cada som:

```ts
{ nome: 'nave.xaelo.tiro', arquivo: 'nave/xaelo-tiro', camada: 'acao' | 'ambiente' | 'motor' | 'interface',
  volume: 0.6, vozes: 4, variacao: { tom: 0.04, vol: 0.1 }, prioridade: 'jogador' | 'chefe' | 'inimigo' | 'cena',
  plano?: 'perto' | 'fundo', laco?: boolean }
```

- **Os nomes** são `grupo.dono.acao` (`nave.charybdis.morte`, `explosao.carne`, `elite.lula.tinta`, `ui.carta.escolher`,
  `momento.f1.estrondo`). As cenas chamam o NOME, nunca o arquivo.
- **As cartas de arma usam o tiro da nave** (o TIRO DUPLO são dois tiros da nave em uso); o míssil, o drone, a bomba, o
  flare e os efeitos (incendiário, elétrico…) são sons próprios e iguais nas três naves.
- **A interface** (`camada: 'interface'`) não passa pela acústica do lugar (é a tela, não o mundo).

### 3.3 Os volumes e o ajuste automático — `src/som/mixagem.ts` (puro)

| Camada | Volume do jogador | Ajuste automático |
|---|---|---|
| a trilha (dele, `Music`) | GERAL × MÚSICA | — |
| ação, interface | GERAL × EFEITOS | — |
| ambiente, motor | GERAL × EFEITOS | × `presenca(musica)` |

`presenca(m)` (m = MÚSICA de 0 a 1): **1 com a música em 0**, caindo até **~0,35 com a música cheia** (a curva e os
números finos se calibram de ouvido na folha 8). O volume muda na hora quando o jogador mexe nas CONFIGURAÇÕES (o evento
que o `Music.atualizarVolume` já ouve).

### 3.4 Os arquivos

- `public/sfx/<grupo>/<nome>.ogg` + `.m4a` de reserva (o Safari não toca OGG); o Phaser escolhe pelo navegador.
- **O tratamento, um script só:** `scripts/_som/_som-tratar.mjs` (ffmpeg, já instalado): corta o silêncio, nivela a
  sonoridade por camada (alvo em LUFS por camada, não por arquivo), fade de 5 ms nas pontas (sem estalo), mono para os
  curtos (o pan é nosso), estéreo para o ambiente; laço com emenda conferida.
- **Carregar:** os sons da interface e do menu no `BootScene` (junto da trilha); os de cada fase podem ir no mesmo boot
  enquanto o peso total couber (meta: < 6 MB no total; medir na folha 1 e decidir).

## 4. A acústica pelo lugar — `src/som/acustica.ts`

O par sonoro da Atmosfera visual (GDD pilar 5: nada vai cru). Um PERFIL por lugar, aplicado no barramento do mundo
(ação + ambiente + motor; a interface e a trilha ficam fora). A troca de lugar dentro da cena (a câmara B da F4, a
caverna da F1) cruza os perfis em ~1 s.

| Perfil | Cenas | Como soa (o ponto de partida; o ouvido dele calibra) |
|---|---|---|
| **atmosfera** | o menu da noite e o do amanhecer, o hangar da escolha, a F1, as cenas em céu de planeta | **abafado:** passa-baixa suave (~5–7 kHz), cauda de ar longa (reverberação aberta), o grave encorpado; o trovão rola |
| **caverna** (dentro da atmosfera) | a caverna da F1 | o abafado + o eco de pedra (reverberação curta e densa) |
| **espaço — cabine** | a F2 (o cinturão), a F3 (o casco), as cenas no vácuo | **seco:** sem cauda, um pouco metálico (realce médio-agudo leve), o grave chega pelo casco |
| **interior** | a F4 | úmido, eco de câmara fechada, médios moles |
| **água** | a câmara B da F4 | muito abafado (passa-baixa ~800 Hz), só o grave passa |

**A distância decide (o "B" dele, no espaço):** os sons com `plano: 'fundo'` — a batalha das frotas ao fundo da F3, as
explosões distantes, o Leviatã em silhueta, os golfinhos e a enguia escura ao fundo, o rabo colossal quando passa longe
— no perfil de espaço viram **só um grave surdo e curto, sentido pelo casco** (passa-baixa ~150 Hz, volume baixo) ou
nada. Perto da nave, tudo é cabine. É a lei da imagem (a camada de trás diminui, escurece, anda devagar) no ouvido: o
jogador sente o vácuo pela DIFERENÇA entre o tiroteio perto e a guerra muda lá atrás. Na atmosfera, o fundo só fica mais
baixo e mais abafado (o ar leva o som).

Implementação: filtros nativos do Web Audio (`BiquadFilterNode`, `ConvolverNode` com respostas de impulso CURTAS geradas
em código — ruído com decaimento —, sem arquivo de IR). Cada perfil é dado puro em `acustica.ts`, testável.

## 5. Os sons exclusivos de momento

- **`momento.f1.estrondo` — a barreira do som.** Na abertura da F1 (o jato já em voo na atmosfera): o estrondo duplo do
  boom sônico + o rasgo do ar, perfil atmosfera. A hora exata (o 1º quadro da fase ou o instante em que o jato acelera)
  se acerta no GIF da folha 1.
- **`momento.menu.trovao` — os trovões do menu da noite.** Presos aos relâmpagos de `src/menu/perigo.ts` (o 1º com hora
  marcada, os outros a cada 6–12 s; a janela quieta da abertura e o movimento reduzido continuam sem relâmpago, logo sem
  trovão):
  - o trovão chega **depois** da luz (0,3–1,5 s, sorteado com a mesma semente), como no mundo;
  - **com raio desenhado** (`comRaio`): perto, seco no estalo e longo no rolar; **só o clarão**: distante, só o rolar;
  - o pan segue o foco do relâmpago (`foco` → x);
  - 3–4 trovões diferentes no catálogo, sorteados, para não repetir;
  - "reduzir clarões" acalma também o trovão (mais distante, sem estalo).
  - ⚠️ Não toca na tela de carregamento: o navegador só libera o som depois da 1ª tecla; no menu ele começa na primeira
    interação, como a trilha.
- **A lista fica aberta:** cada folha tem uma seção "momentos" para os exclusivos daquele grupo que ele pedir.

## 6. As folhas de sons (a parte 2)

Uma página por grupo em `docs/superpowers/folhas/<dia>/sons/<n>-<grupo>/folha.html` (o molde das folhas de arte).

- **Cada linha = um som:** o nome do catálogo, o que é e onde toca no jogo (com a foto da cena quando ajuda), e as
  **2–3 versões lado a lado**, cada uma com a fonte e a licença.
- **Ouvir como no jogo:** um seletor de **lugar** (atmosfera / caverna / cabine / interior / água / fundo no espaço)
  que passa a versão pelo MESMO `acustica.ts` do jogo, e um botão **"repetir ×8"** com a variação de tom e volume (o
  tiro e a explosão se julgam repetidos, não sozinhos).
- **Ouvir junto:** um botão que toca a trilha dele (a que existir) por baixo, para julgar a mistura.
- **Escolher:** cada linha tem a escolha (A / B / C / "nenhuma — refazer" + uma nota); o rodapé gera um texto curto
  (`1A 2C 3refazer: mais grave…`) para ele colar na conversa. A escolha não se grava em lugar nenhum além disso.
- **Antes de mostrar:** cada versão é ouvida/medida por mim (pico, sonoridade, silêncio no começo, estalo nas pontas) —
  o par do "conferir ampliado antes de mostrar".
- Depois da escolha: entra no jogo, e o **GIF/vídeo com som** em jogo mostra o grupo no lugar certo (a gravação do
  navegador automático precisa capturar o áudio; se não capturar, ele confere jogando).

### O que cada folha cobre

1. **A nave** — por nave (X-AELO, TERMINUS, CHARYBDIS): o tiro base, o motor (laço), ser atingida, a vida perdida, a
   morte (ruptura / estilhaços / desintegração). Comuns: o míssil (lançar, travar), o drone auxiliar, a bomba, o dash, o
   impulso da F1, o casco (absorver, quebrar, voltar), o flare. Momento: **o estrondo sônico da F1**.
2. **As explosões** — os 9 tipos de `tipoExplosao.ts` (perigo, metal, chefeFim, luz, biomec, carne, rocha, carta,
   implosão) + os efeitos das cartas (incendiar, queimando, combustão, choque, arco em cadeia, sobrecarga) + o acerto do
   tiro em metal / carne / rocha.
3. **Os inimigos comuns e os perigos** — drone, batedor, canhoneira, kamikaze, cargueiro, aranha, água-viva (o tiro, o
   aviso, a morte quando não for a explosão do material); as minas, os asteroides, os destroços, as portas da F4, o
   esfíncter.
4. **Os elites** — o drone de mineração e a sentinela (F2), a lula (F3: a tinta, os gestos, a fuga), a larva (as pupas,
   as moscas, o buraco) e o tubo de esporos (F4).
5. **Os chefões** — o da F1, a Capitânia, a Serpente (as cabeças, a enguia), o Guardião, o Predador: os ataques, os
   avisos (o telegrafar), a dor, a morte.
6. **A interface** — o menu (mover, confirmar, voltar), a pausa, as configurações (o remapear, a troca anunciada), a
   mesa de cartas (aparecer, navegar, escolher, a raridade), as estrelas e o 1-UP, a NAVE PERDIDA, o resultado. Os
   toques retrô moram aqui.
7. **As cutscenes** — Aurora, Doca, Hangar, O Afastamento e a cena do hangar da escolha (as decolagens, as chegadas, os
   impactos de cada capítulo).
8. **O ambiente** — a tempestade do menu da noite (**os trovões**), o amanhecer, o hangar, a F1 e a caverna, o
   cinturão, o casco, o interior orgânico, a água. Laços longos, presos ao ajuste automático. É aqui que a mistura com
   a trilha dele se calibra.
   **+ 17/11, o pedido dele — os SONS DE CADA FASE** (*"barulhos, efeitos, em cada fase. Não precisa ser muita coisa por
   fase, mas sons e efeitos que ajudem a dar a imersão que pretendemos"*): além do laço de fundo, 2–4 EFEITOS DE
   AMBIENTE por fase, pontuais, presos ao que a tela já mostra (o cenário vivo, o roteiro) — nunca um som sem causa
   visível (a física do lugar). Ponto de partida a conferir no código: a F1 (a INVASÃO do horizonte, `src/f1/invasao.ts`:
   as naves descendo das nuvens, a artilharia da defesa, as explosões ao longe; o vento; o trovão; a caverna gotejando),
   a F2 (o cinturão pelo casco: as rochas se chocando ao longe, o rangido da cabine), a F3 em DOIS lugares (ele, 17/11:
   *"ela não é só o casco, ela se inicia dentro da nebulosa"*) — o Ato 1, a NEBULOSA (o gás denso, a estática, a carga
   elétrica, o que vive nela), e o Ato 2, o CASCO do Leviatã (o casco gemendo, o metal sob tensão, o canto dele ao
   longe), cada um com o seu fundo e os seus efeitos, a troca presa à virada dos atos —, a F4 (a criatura viva: a respiração, o coração, os borbulhos; a água abafada).
   **OS FLYBYS DELE** (`assets/raw/sons/dele/flybys/`, feitos por ele): em alguns momentos da F1 (as naves da invasão
   passando) e na mini cutscene da SAÍDA DA ATMOSFERA (o fim da F1, `morteChefeF1.ts`, antes da cutscene 1) — esta
   última é da folha 7 (as cutscenes), as da F1 são desta.

## 7. Os testes

- `scripts/test-som.mjs` (Node, puro): o catálogo (nomes únicos, cada som com arquivo existente em `public/sfx/` e linha
  em `docs/SONS.md`, camada e prioridade válidas); a `presenca` (1 com música 0, o piso com música cheia, monótona); o
  teto de vozes e o "um por quadro" (a regra, sem áudio); os perfis de acústica (cada cena tem um; `fundo` no espaço
  cai abaixo do corte).
- `scripts/test-som-jogo.mjs` (navegador automático): o tocador nasce com o contexto; antes da 1ª tecla nada toca;
  numa F2 de 10 s o número de vozes nunca passa do teto; a pausa abafa e a NAVE PERDIDA cala a ação; EFEITOS em 0 = zero
  ganho; a troca de perfil da F4 (câmara B) acontece. O Chromium automático tem Web Audio; o teste mede os NÓS e os
  ganhos, não o ouvido.
- Os testes do M seguem passando (`test-pausa`, `test-pausa-jogo`, `test-controle-jogo`, `test-derrota-jogo`,
  `test-carregamento`) e o build.
- Testes novos terminam com `process.exitCode`.

## 8. Fora deste bloco

- **A trilha** (é dele). O bloco só garante que as faixas que ele entregar entram pelo `Music` (o tipo `Track` cresce
  com elas) e que a folha 8 se calibra contra elas.
- Som posicional "de verdade" (3D), mixagem dinâmica por intensidade do combate, vozes/falas.
- Os sons de telas de dev (`?sandbox`, as teclas de treino do menu) — herdam os do jogo, sem som próprio.

## 9. A ordem de execução

1. **A fundação** (sem som audível ainda): `Som.ts`, `catalogoSons.ts`, `mixagem.ts`, `acustica.ts`, `docs/SONS.md`,
   `_som-tratar.mjs`, o molde da folha, `test-som.mjs`.
2. **Folha 1 (a nave)** → ele escolhe → entra no jogo → ele confere jogando → `test-som-jogo.mjs` nasce aqui.
3. Folhas 2 a 8, uma por vez, cada uma: gerar/buscar → conferir → folha → escolha dele → jogo → conferência.
4. O fechamento: o peso total, a ficha `SONS.md` completa, o 🧭.

## 10. O que mudou na execução (15–16/11, as folhas 1 e 2 fechadas)

O que o jogo tem hoje e esta spec não previa — vale sobre as seções acima onde as contradiz.

### 10.1 A composição (ele: *"se os sons ficam isolados, fica estranho e desconfortável de ouvir"*)

- **O LASTRO** (`mixagem.ts`: `LASTRO`, `energiaDepois`, `ganhoDoLastro`; `Som.alimentarLastro`): um ronco grave em
  laço (`explosao.lastro`, a metalGrande C dele esticada 4× e só o grave) que cada explosão ENCHE (`lastro` no
  `DefSom`, × a `forca`) e que esvazia com τ = 1,4 s. A cadeia rola por cima dele; uma explosão solta mal o levanta.
- **No vácuo cada explosão sai a 60%** (`acustica.ts`: `EXPLOSAO_NO_VACUO`, `forcaNoLugar`); o lastro carrega.
- **Momento roteirizado se compõe NA CENA:** a cadeia da Aurora (cutscene 1) toca os estouros sem som próprio e, no
  lugar, a sequência de `explosao.metalGrande` baixa e sobreposta, com o fechamento grande no fim.
- **NENHUM SOM ATRAVESSA A TROCA DE CENA** (o defeito que ele achou: o fechamento da Aurora entrava na F2):
  `Som.trocarDeCena(lugar)` é a 1ª linha do `create` de toda cena — encerra as vozes em 250 ms, drena o lastro, e só
  então o lugar novo (a trilha não, ela é dele). **A única exceção é `ponte: true`: o estrondo da F1**, que começa no véu
  do hangar e *"quando chegar na fase, já estar acabando"*.
- **A abertura da F1:** o estrondo sozinho, a música do hangar abaixando sob ele, o motor entrando depois (`ESTRONDO` na
  `GameScene`; pelo hangar o estrondo já vem tocando e a F1 só espera o rabo).

### 10.2 O que repete muito é macio, e medido antes de mostrar

- **Os motores:** metade do nível e passa-baixa de 1,1 kHz (`passaBaixa` no `DefSom`) — *"precisa estar ali, mas não
  brigar com nada"*.
- **O enxame tem categoria própria** (`somDaExplosao.ts`: `DO_ENXAME`, `somDaMorte`): o `drone` (25 ondas desde a F1)
  com `acerto.drone` e `explosao.drone` ("matéria quebrando"); a morte dele cala os estouros em pixel (`mudo` no
  `Destrocos.morrer`).
- **A medida antes da folha:** a sonoridade (LUFS), o agudo acima de 5–6 kHz contra o corpo, o pico, o silêncio no
  começo; `_folha-montar` descarta sozinho a geração que não passa de −30 dB (o PixelLab entregou 4 mudas).
- **Recusado DUAS vezes sem nota:** não se gera a 3ª rodada às cegas — pergunta-se a DIREÇÃO (matéria / explosão seca /
  elétrico físico / retrô / mudo). O "macio" não era o que ele queria para o drone nem para o elétrico.

### 10.3 A TERMINUS é uma arma rotativa (a ideia dele, a partir do A-10)

- A referência dele (`C:/Users/Henrique/Music/myinstants.mp3`) só foi MEDIDA (licença desconhecida): o zumbido de 8 ms
  (~125 disparos/s), a energia abaixo de 600 Hz.
- `WeaponSystem.somRotativo`: ao APERTAR, o arranque do M2 (o tiro I a 12/s) + o laço; ao SOLTAR, a parada e, 80 ms
  depois, a CHEGADA do A1 (o zumbido do A-10, o som que viajou mais devagar) — o PICO na atmosfera, a rajada pelo casco
  no espaço; do tamanho da rajada até 12 disparos (`chegadaDaRajada`), com teto (*"várias vezes o jogador vai cravar o
  dedo no gatilho"*). No vácuo o M2 a 1,8 kHz (`passaBaixaNoVacuo`). A pausa e a morte calam sem chegada.
- As partes: `scripts/_som/_sintetizar-minigun.mjs` (arranque / laço / parada a partir de um grão) e
  `_compor-terminus.mjs` (as chegadas).

### 10.4 Os campos novos do `DefSom`

`passaBaixa`, `passaBaixaNoVacuo`, `lastro`, `ponte`. E `Som.tocar({ fracao })` (toca só uma parte, com saída suave),
`Som.laco(nome, inicial)`, `Som.tocando(nome)`, `Som.lugarAgora()`, `Som.picoDaAcao` (os testes medem o SINAL).

### 10.5 A armadilha do Chrome

`setTargetAtTime` num barramento SEM sinal congela (o Chrome só calcula essa curva enquanto passa som) — o 1º tiro depois
da NAVE PERDIDA saía cheio. Todo ganho e filtro usa rampa linear (`rumo` no `Som.ts`, `rampa` no `acustica.ts`).

### 10.6 Para depois (propostas a ele)

- **O passe de mixagem** (16/11, a pergunta dele *"o que estúdios fazem para trazer o conjunto sonoro"*): a compressão de
  cola no barramento do mundo, um espaço comum (hoje a cabine está quase seca, 6%), o abaixar dinâmico nos eventos
  grandes. As camadas e a presença da nave entram aos poucos; o ambiente é a folha 8.
- ~~**O peso no git:** os originais em WAV deram ~30 MB em duas folhas — converter para FLAC antes da próxima.~~ Feito
  em 16/11 (ver §10.7).

### 10.7 As folhas 3, 4, 5a e 5b (16/11) — o que ficou de regra

- **Os originais são FLAC** (`scripts/_som/_original.mjs`: `original()` acha o `.flac` de um caminho `.wav`,
  `guardarComoFlac()` converte e PROVA amostra a amostra antes de apagar). O `_folha-montar` grava FLAC sozinho.
- **Um som por SALVA, não por bala** (o leque da aranha, a minigun da sentinela, as cabeças da Serpente pelo clarão da
  boca). E o tocador segura UM som igual por quadro: o que nasce junto (as 3 salvas das cabeças) se escalona de leve
  (66 ms) para ser ouvido como vários.
- **O aviso tem a duração do piscar do jogo** (a canhoneira 0,45 s, a torre 0,4 s, o pavio da sensora 0,7 s, a mira da
  lula 0,6 s, a carga do raio 0,75 s, a da laranja 2,5 s…): as versões C sintetizadas medem o tempo no código.
- **O RICOCHETE É DA NAVE** (a ideia dele): o tiro do jogador no que é DURO e não morre (o pico, a nave caída, a costela,
  o maquinário, as mesas, o destroço da F2/F3 — nunca a carne da F4) toca `nave.<nave>.ricochete*`, sorteado entre as
  variações, no máximo um a cada 110 ms (`GameScene.ricochetear`). A TERMINUS e a X-AELO usam os arquivos DELE (grupo
  `dele`, crédito "feito por ele").
- **Laço por entidade** (a broca do drone, a roda da sentinela, o sopro do gás): nasce no gesto, para no `destroy` e na
  troca de gesto; **o enxame é UM laço** que sobe com o número de moscas; **o raspar da enguia** cresce com os contatos.
- **Os chefões no vácuo são contidos** (`CHEFE_NO_VACUO` no `acustica.ts`, aplicado no `Som.voz`): na cabine, todo som de
  `prioridade: 'chefe'` passa por um passa-baixa de 2,2 kHz, desce a 70 % e manda 8 % a uma sala fechada curta. A sala
  forte (35 %) deixava o chefão MAIS ALTO no vácuo — medir com `Som.picoDaAcao` antes de mostrar.
- **Uma explosão gravada "de céu aberto" não vira vácuo por filtro:** a cauda está no arquivo. Um momento que precisa
  soar no espaço ganha um som PRÓPRIO tratado (o `momento.aurora.fim`: o grave, o pente oco, a cauda cortada, um golpe
  sub-grave).
- **As habilidades da Serpente rodam no Node** (os oráculos): o som entra por métodos OPCIONAIS da fachada
  (`CorpoSerpente.som?` / `somLaco?`); **a enguia roda num worker**: o motor manda `vivos` (tipo, id, x dos perigos) e
  `raspa`, a cena (`EnguiaEmJogo.soar`) toca quando um id aparece e quando o `hab` muda. Os oráculos seguem verdes.
- **As ferramentas:** o `_som-instalar` lê versões de várias letras (`BF1`, `D2`) e credita `dele` e `mistura`; o
  `_folha-montar` copia TODAS as versões para cada folha — as folhas de rodada se enxugam antes do commit (só o que o
  `dados.json` mostra).
- **Se ele não ouve nada do novo, a aba está velha** (o Vite perde a ligação numa sessão longa): Ctrl+Shift+R, e
  `__som.diagnostico().carregados` mostra quantos sons a aba carregou.

### 10.8 A regulagem dos chefões, o limitador e a folha 5c (17/11) — o que ficou de regra

- **Medir antes de mexer: `scripts/_som/_medir-chefes.mjs`** toca cada som de chefão SOZINHO no lugar dele (a Torre na
  atmosfera, F2/F3 na cabine, a F4 no `interior`), pela cadeia real, e mede o pico e uma sonoridade curta (K aproximado,
  os 400 ms mais altos) contra referências que ele aprovou (o tiro da X-AELO −15, a explosão grande −10). `--comparar`
  mede os sons da cabine também no ar; `--sugerir` dá o `ganhoNoVacuo` de cada um. Re-medir depois de trocar um take.
- **Laço de AÇÃO não é motor.** O `_folha-montar` tratava todo `laco: true` como motor (−24 LUFS) e os laços dos chefões
  saíam 9–14 dB abaixo do resto. O take diz `"camada": "acao"`; um já instalado se re-nivela com
  `_som-renivelar.mjs <grupo> <nome>…` (do original, pelo pico, e marca o take no `_origem.json`).
- **Os chefões no vácuo, contidos mas ouvidos** (ele: *"melhore e deixe perceptível os sons, mas eles não podem perder o
  efeito do espaço"*). O ESPAÇO não muda — o mesmo corte de 2,2 kHz e a mesma sala fechada; muda o NÍVEL: uma faixa de
  PRESENÇA abaixo do corte (1,4 kHz +2 dB), o volume 0,85, e um `ganhoNoVacuo` POR SOM (a tabela `NO_VACUO` do catálogo,
  medida) que deixa cada um ~1,5 dB abaixo do mesmo som no ar — contido, nunca mais alto. Uma presença global forte
  (+4 dB) deixava os graves MAIS ALTOS no vácuo: a correção é por som. (Os filtros não se empilhavam: o código usa o
  menor corte; o agudo perdia 7–9 dB pelo 2,2 kHz sozinho.)
- **`Laco.volume()` respeita a voz:** o ganho de um laço que muda de volume é a `base` da voz (o volume, a variação, a
  contenção, o fundo) × v — antes era `def.volume × v` e a contenção caía no primeiro fade.
- **O LIMITADOR DE SEGURANÇA** (`LIMITADOR` no `mixagem.ts`, no fim da saída dos efeitos, antes do destino do Phaser; a
  trilha não passa): −3 dB, razão 20, ataque 2 ms. O Chrome soma um ganho automático (≈0,6 × o que ele tiraria de um
  sinal cheio): `MAKEUP_DO_LIMITADOR` o desfaz, e abaixo do limiar a saída é IDÊNTICA (medido: −12,04 → −12,04). A pilha
  dos mais altos (o rompimento, o fim do chefão, 3 metais grandes) entrava a +7,7 dB e sai a ~−1. `Som.picoDaSaida`
  mede depois dele. É SEGURANÇA, não cola: a compressão de cola, o abaixar dinâmico e o grave do "chassi" são o passe
  de mixagem (§10.6), depois da 5c.
- **Uma versão, dois nomes:** `nome: ID > outro.nome` no `_escolhas.txt` instala o take com outro nome (o golpe do
  Predador: a A quando ACERTA a nave, a B quando erra; o pulso do breu: as duas sorteadas; o urro: a F na chegada, a E
  na fase 2, a D na saída e as duas AO FUNDO no caminho até o núcleo).
- **O golpe que acerta:** começa como o que erra; se a nave é atingida no meio do corte (`ship.getData('golpeEm')`), o
  `Som.calar` tira o que erra e toca o que acerta, no instante do golpe.
- **O chefão antes do encontro** (ele: *"podem até entrar antes mesmo do encontro, para mostrar que o jogador se
  aproxima de algo infernal"*): o evento de roteiro `urro` (`StageDirector`) toca um som de `plano: 'fundo'` com uma
  `forca` que cresce perto do núcleo (F4: 64 s, 88,5 s, 107 s). ⚠️ O roteiro tem de estar em ORDEM de tempo — fora de
  ordem a fase não abre.
- **Míssil no espaço não apita:** o apito é ar. A onda da chuva antiga era um tom deslizando 4,7 oitavas até 4,5 kHz
  (medido); a nova queima abaixo de 410 Hz. Medir o tom que desliza (quadro a quadro) antes de mostrar um "míssil".
- **A folha julga o chefão como o jogo:** `"chefe": true` no som da folha aplica a contenção do vácuo quando o lugar é a
  cabine.
- **A F4 é o `interior`:** a sala (30 %, 1,4 s) e o realce em 300 Hz incham os graves — os avisos ficam ~−10 LUFS, o
  que repete ~−11/−12, e o agudo puro (o estilhaço da lava) precisa de volume cheio porque o interior corta em 4,5 kHz.
- **Um laço sintetizado no ritmo do jogo** (o galope C, 620 ms) se faz EXATAMENTE periódico e com N ciclos + 0,5 s: o
  tratamento do laço cruza os primeiros 0,5 s com o fim, e assim a emenda cai no mesmo passo.

### 10.9 As folhas 6 (a interface) e 7 (as cutscenes) (17/11) — o que ficou de regra

- **A interface é a TELA, não o mundo:** `camada: 'interface'`, `prioridade: 'interface'`, fora da acústica do lugar
  (soa igual na F1 e no espaço) — e um toque de interface ATRAVESSA a troca de cena (`Voz.tela`: o COMEÇAR que abre o
  hangar, o voltar que reabre o menu têm de terminar). A regra "nada atravessa a troca de cena" é do MUNDO; os laços de
  interface (o contador) param.
- **Três caminhos por som de interface:** Kenney (A), PixelLab (B), o TOQUE RETRÔ sintetizado (C,
  `_sintetizar-folha6.mjs`: triângulo/quadrada por um passa-baixa — retrô, mas escuro; melodias nossas). Ele escolheu a
  C em quase todos os avisos e estados.
- **A navegação é uma só** (`ui.mover` / `ui.confirmar` / `ui.voltar` / `ui.ajustar` / `ui.aba` / `ui.negar`) em todas
  as listas; **a pausa é uma regra pura** (`src/pausa/somDaPausa.ts`, o antes × o depois de `passo`, testada no Node);
  o fim da captura do remapear é da cena (aceita / a TROCA anunciada / recusada). Onde a escolha não muda (a ponta da
  seta do hangar), silêncio.
- **O nível da interface** se mede no FIM da cadeia (`_medir-chefes.mjs --interface`, depois do limitador): a trilha dele
  toca ≈ −20 LUFS (o arquivo −13,5 × `Music.VOLUME` 0,45); o confirmar ~−16, a pausa e o negar ABAIXO dele, as estrelas
  acima da trilha. Clique curto (< 100 ms) se lê pelo pico, não pelos 400 ms.
- **O que tem tempo de tela tem regra pura:** `sonsDoResultado` (o contador liga com os pontos, desliga quando eles
  assentam, a medalha no número final, o recorde 0,3 s depois; o movimento reduzido: sem contador).
- **Um som que é DA NAVE na cutscene** (a saída da atmosfera, a descida, o toque, a partida, o sobrevoo) é
  `<nome>.<nave>` (`daNaveNaCena`, `naveDoSom`): as escolhas dele por nave — os flybys DELE na X-AELO e na TERMINUS, a
  Manta com os próprios. A saída da Manta está instalada e guardada (ela só aparece na Doca).
- **Em sequência** (*"A e B na sequência ficaram bons"*): `<nome>` e `<nome>2`, pelo `Som.emSequencia` (a segunda entra
  no fim da primeira, 0,3 s de sobra, no relógio da cena). ⚠️ Se a cena acaba antes (a Doca: 4,4 s), as duas se
  SOBREPÕEM presas a momentos da tela — nunca atravessam a troca de cena.
- **O flyby é ESTÉREO:** o tratamento faz mono por padrão; o take diz `"estereo": true` (o `_folha-montar` passa) — e um
  take mono de passagem ganha a versão que cruza da esquerda para a direita (`AP`/`BP`).
- **A acústica anda com a câmera:** a subida da F1 abre para a cabine (`Som.lugar('cabine', 3500)` em
  `breakAtmosphere`); a cutscene final vai do `interior` ao vácuo e à `atmosfera` da superfície; nas cutscenes 1–3 a nave
  voa com o PRÓPRIO motor (para no pouso; no Leviatã morre na queda).
- **Um take esparso** (estalos, quase sem corpo) não sobe só no volume — comprime e normaliza pela sonoridade (a lava B:
  −33 → −12 LUFS no jogo).
