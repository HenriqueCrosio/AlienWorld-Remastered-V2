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
