# START — BLOCO D: O LEVIATÃ NOVO, O MESMO BICHO EM TODA CENA (depois de 17/10/2026)

> ✅ **O BLOCO D FECHOU em 19/10 (commitado e empurrado).** Este arquivo é agora REGISTRO; a próxima sessão abre pelo
> 🧭 do `docs/HANDOFF.md`, no bloco E. (A frase de arranque antiga era: *"…Vamos continuar o bloco D pela rodada 4."*)

## ▶️ 19/10 — A RODADA 4 FOI AVALIADA; A RODADA 5 ESPERA POR ELE

Folha **http://localhost:5173/docs/superpowers/folhas/2026-10-19/leviata/rodada5.html** (registro no §6, passo 2f).
- ✅ **o nado do menu (PixMiniMax 92): APROVADO** (*"ficou muito bom, mas isso tudo vai ser revisto na fase de mexer no
  menu"*) — volta no bloco E;
- ✅ o jogo de câmeras do capítulo 5 e o corte para a colônia sendo atingida: aprovados por ele;
- ✅ **a rodada 5 APROVADA** (*"eu concordo com todas as suas escolhas, a animação e a explosão de chegada ficou muito
  boa"*): o capítulo 5 sem o corpo cravado (ele desaba, a explosão cobre tudo e a fumaça revela a carcaça DEITADA), a
  colônia de luzes **núcleo** e a dorsal **+4 rasgada** — tudo já no jogo (a carcaça 82 nos capítulos 5–7,
  `_gerar-sobrevoo.mjs instalar <fonte> scripts/_leviata/_carcaca-82-fora.json`);
- **o ajuste dele, feito:** *"quero que a explosão ocorra uns frames antes, antes mesmo do leviatã bater no solo"* → a
  explosão e as silhuetas nascem 70 ms ANTES do contato (`ANTES_MS`), o focinho ainda a ~35 px do chão; o encosto
  acontece dentro do fogo. Quadro a quadro em `folhas/2026-10-19/leviata/gif/cap5-estouro.png`. Falta ele ver.
- ✅ **a silhueta APROVADA (rodadas 6 e 7)**: o ARO (*"ao longe, é apenas uma sombra"*), o nado quase parado, menor e
  mais longe, NADA na F3; no jogo o **médio (40→60)** e o vislumbre do fim da F1 na frente da galáxia — ele: *"Ficou
  bom, a silhueta mostra que tem algo se aproximando/espreitando"*.
- ✅ **O BLOCO D FECHOU — COMMITADO E EMPURRADO em 19/10** a pedido dele (*"pode commitar e empurrar, deixe os PNGs
  fora"*) para `origin/feat/cartas-preview`: `cbe78ff` (código e arte), `bd8359b` (ferramentas e folhas) e o dos docs.
  O Leviatã novo está no menu, na silhueta (F1/F2), nos capítulos 4–7 da cena final. Como foi feito (autoria só dele,
  sem Co-Authored-By; nunca no `legacy`; nunca o `.env.pixellab`). ⚠️ O `git add` com exclusões (`:(exclude)…`) não
  adiciona NADA numa pasta ainda não rastreada aqui: as folhas entraram por `--pathspec-from-file` de um `find`:
  1. código e arte: `src/` (Parallax, BootScene, MenuScene, final/fora, queda, sobrevoo, janelasImpacto,
     Atmosfera), `public/sprites/` (f8-leviata*, f8-reentrada*, f8-sobrevoo*, leviathan-swim-sheet, f8-ejecao-sheet,
     f8-explosao-sheet, f8-impacto-colonia, f8-impacto-frente, f8-colonia-luzes, leviathan-longe-sheet) e os backups
     `assets/raw/*-original.*` (9);
  2. ferramentas e folhas SEM os GIFs: `scripts/_leviata/`, `scripts/_f8/_gerar-queda.mjs`, `_gerar-sobrevoo.mjs`,
     `_sobrevoo-lava-caixa.json`, `folhas/2026-10-18/` e `folhas/2026-10-19/` (os `.gif` e as tiras cruas ficam fora,
     para o backup, como antes);
  3. docs: este START, `docs/HANDOFF.md`, `plans/2026-10-15-polimento-START.md`.
  - Os dois PNGs da raiz que NÃO são deste bloco (`concept art Inimigos.png`, `concept art de Inimigos Sci‑Fi.png`)
    ficaram FORA, a pedido dele.
- **O próximo é o bloco E (o menu refeito)**; o nado aprovado do Leviatã volta a ser visto ali.

## (18/10) A RODADA 4 — o roteiro de então

**Nada da rodada 4 está decidido.** Ele pediu para marcar o ponto: a próxima sessão começa avaliando esta leva com ele.
O histórico completo das rodadas 1–4 está no §6.

**Para abrir:**
1. `npm run dev` → http://localhost:5173
2. Abra a folha **http://localhost:5173/docs/superpowers/folhas/2026-10-18/leviata/cenas/rodada4.html** com ele.
3. No jogo: a tecla **F** no menu abre a cena final (capítulo 5 = a queda nova); o menu já mostra o nado novo.

**O que espera a decisão dele (a rodada 4):**

| # | Peça | Estado | O que ele decide | Se aprovar |
|---|---|---|---|---|
| 1 | **Capítulo 5, a queda REFEITA** (plano largo espelhado → corte para o plano baixo → 2 quadros de impacto → cortina de ejeção do vácuo → corpo cravado → mergulho no escuro) | NO JOGO (`queda.ts`), não commitado | se a cena funciona; ajustes de ritmo, de tamanho da ejeção, do corpo cravado e do corte para o cap. 6 | fica; se reprovar, a versão de 24/09 está no git (`git show HEAD:src/scenes/final/queda.ts`) |
| 2 | **Carcaça 82 + a dorsal da base atrás das costelas** (`cenas/dorsal3/`) | candidatos (o cap. 6 do jogo ainda tem a carcaça ANTIGA) | rasgada (minha aposta) ou inteira, ou mais ajuste à mão | rodar a instalação de 24/09 (`scripts/_f8/_gerar-sobrevoo.mjs instalar`, a versão fria do cap. 7 e a folha da lava que apaga) sobre `dorsal3/dorsal-base-192-102-0.3-0.9-r{1,0}.png`, com backup em `assets/raw/`. ⚠️ A `instalar` tem a fonte FIXA (`SRC = 'scripts/_f8/_sobrevoo3-44.png'`): passar a aceitar a fonte por argumento, como já foi feito no `_gerar-queda.mjs corpo`. E conferir a caixa da lava (`scripts/_f8/_sobrevoo-lava-caixa.json` → `LAVA_X/Y` em `sobrevoo.ts`): a lava da 82 não tem a mesma caixa da antiga |
| 3 | **Menu, o nado PixMiniMax 92** com a luz da lua | NO JOGO (`leviathan-swim-sheet.png`, 16 × 176×80) | ele escolheu a 92 pela folha; falta ver no jogo | segue para a silhueta |

**O que já está aprovado e no jogo (não commitado):**
- capítulo 4: o Leviatã novo (edit-73 contida) e a nave saindo da ferida com metade do tamanho (`NAVE_ESCALA = 0.5`);
- capítulo 5: o corpo da reentrada (edição 83, sem a mancha na boca), que a cena nova também usa.

**Depois da rodada 4 (ainda do bloco D):**
- a **silhueta da F2 e da F3** (`leviathan.png`, 116×59, em `src/Parallax.ts`) a partir do desenho do menu (a gerada
  91·0), e decidir a leitura ao longe;
- a instalação da carcaça (item 2);
- as sondas (`probe-menu`, `probe-menu-intro`, `probe-stage1-visual`, `probe-stage2`, `probe-interlude4`) e os GIFs;
- o commit, **só quando ele pedir** (autoria só dele, sem Co-Authored-By; nunca no remoto `legacy`; nunca
  `.env.pixellab`). Os GIFs e as tiras cruas ficam fora do commit, como nas sessões anteriores.

**Arquivos mexidos e não commitados (para o commit, quando vier):**
- código: `src/scenes/BootScene.ts`, `MenuScene.ts`, `final/fora.ts`, `final/queda.ts`, `final/sobrevoo.ts`,
  `final/janelasImpacto.ts` (novo, gerado), `src/systems/atmosfera/Atmosfera.ts`;
- arte: `public/sprites/f8-leviata*.png`, `f8-reentrada*.png`, `leviathan-swim-sheet.png`, e as novas
  `f8-ejecao-sheet.png`, `f8-impacto-colonia.png`, `f8-impacto-frente.png`; os backups em
  `assets/raw/*-original.png` (5 arquivos);
- ferramentas: `scripts/_leviata/` (novo), `scripts/_f8/_gerar-queda.mjs`;
- docs: este START, `docs/HANDOFF.md`, `plans/2026-10-15-polimento-START.md`, e as folhas `folhas/2026-10-18/`.

**Falhas de sonda que JÁ existiam (não são do bloco D; anotadas para o bloco I):**
- `probe-interlude4`: 4 ✘ (o id da nave escolhida, o banner fora do tratamento, o título da vitória, o crédito do rodapé);
- `probe-menu`: 7 ✘ de texto (título, subtítulo, CTA, opções);
- `probe-menu-intro`: 1 ✘ (o emblema ao pular a abertura).
- Todas conferidas trocando a arte de volta para a antiga.

**As lições desta sessão, que valem já no começo:**
- Abra cada geração AMPLIADA antes de pôr na folha: anatomia, emenda, buracos. A dorsal na cabeça e a barbatana
  colada passaram por não olhar (memória `conferir-ampliado-antes-de-mostrar`).
- Uma peça de identidade entra recortada da base aprovada e escondida atrás do que está na frente, só onde há fundo.
- Os GIFs por `game.step` precisam do `Date.now` falso: os tweens do Phaser têm relógio próprio (memória
  `avaliar-skill-por-gif`). As ferramentas `scripts/_leviata/_gif-*.mjs` já fazem isso.

## 1. 📍 O PONTO MARCADO

- **17/10: o bloco C do polimento FECHOU** e foi commitado e empurrado para `origin/feat/cartas-preview` (`63ca5f0`
  código e arte, `f39747f` ferramentas e folhas sem GIFs, `f6dfc15` docs). Ele aprovou jogando:
  - na F4: o primeiro plano, o casco engolido e a deriva de ossos e coágulos;
  - escolheu as raízes D nas portas e a ponte nativa;
  - manteve o órgão e o maquinário antigos;
  - pôs o rabo da F3 em 45s;
  - aprovou os itens 10 e 16 do HUD.
  - O item 15 (drones encavalados) foi DESCARTADO: a fila unida é de propósito, por causa da carta de reação em cadeia.
  - Registro completo: o START `plans/2026-10-15-polimento-START.md`.
- **O roadmap agora é o D**, e depois E (menu) → F (frota e minerador da F2) → G (arte da F1) → H (efeitos de
  imersão) → I (itens 9, 11, 13, 14 que sobraram) → J (pós-processamento). Ordem e motivos no 🧭 do HANDOFF.

## 2. O QUE É O BLOCO D

O rabo colossal da F3 (bloco C, item 6) mudou o desenho do bicho. A nadadeira escolhida por ele é a da D, em leque, **de
tubarão**. O corpo é de placas de casco (B) com a lava (A). Ele avisou na hora: *"o formato da nadadeira D acaba puxando
para uma nadadeira de um tubarão e não de baleia, mas tudo bem, eu gosto. Só que o movimento muda"*. E também: *"se
formos trocar o corpo, precisamos refazer ela inteira"*. Hoje o resto do jogo ainda mostra o Leviatã de antes, com
nadadeira de baleia. **O bloco D faz o mesmo bicho aparecer em toda cena.**

**A fonte é a arte aprovada:** o rabo M2 instalado (`public/sprites/rabo-leviata-sheet.png`, 16 quadros de 368×248; a
folha `folhas/2026-10-16/rabo/`). Nada de desenho novo do zero: o corpo inteiro sai DELE (regra
*partir-da-arte-aprovada*).

## 3. ONDE O LEVIATÃ APARECE HOJE (inventário conferido no código em 17/10)

> ⚠️ **Estado em 18/10 (fim da sessão), sobre a tabela abaixo:**
> - **menu:** já é o NOVO, 16 × 176×80;
> - **cena final, capítulo 4:** já é o NOVO, `f8-leviata*`, 355×145, ferida em `LEV + (203, 77)`;
> - **capítulo 5:** o corpo novo (160×161), numa cena refeita;
> - **capítulo 6/7:** ainda é o ANTIGO;
> - **silhueta da F1/F2:** ainda é a ANTIGA.
>
> A tabela é o retrato de 17/10.

| Onde | Arte hoje | Código | Notas |
|---|---|---|---|
| **Menu** ("O DESPERTAR") | `leviathan-swim-sheet.png`, 17 quadros de 116×116 (o armored `e9f7e0dc`) | `MenuScene.ts`: `LEVI_*` (l. 39–48), anim `leviathan-swim` (l. 515), sprite (l. 191–211) | Atravessa o céu UMA vez e some atrás da lua. Escala 0,6 e tint `0x8c9bb6`. O bloco E vai refazer o menu (lua, fundo); o D só troca o BICHO |
| **Silhueta distante F1/F2** | `leviathan.png`, 116×59 | `src/Parallax.ts` l. 292 (depth −94, tint `0x2a3352`), `setApproach` l. 1658 (escala 0,5→1,15, alpha 0,45→0,8) | ⚠️ Hoje lê como uma NAVE, não como o bicho. Mesma perspectiva aérea das montanhas: longe = escuro |
| **Cena final** (a ferida) | `f8-leviata.png` + `f8-leviata-lava.png`, 359×131 (o biomecânico enfraquecido `f397793a`, recortado) | `src/scenes/final/fora.ts` l. 42–43; `FERIDA_X/Y = LEV_X + 206 / LEV_Y + 69` | ⚠️ A ferida por onde a nave entra é ANCORADA na arte: trocar o corpo obriga a remedir `FERIDA_X/Y`. A lava é uma camada que pulsa (recorte `scripts/_f8/_recortar-leviata.mjs`) |
| **F3, o rabo** | `rabo-leviata-sheet.png` (M2) | `GameScene.raboDoLeviata` | JÁ É O NOVO. É a fonte do resto |
| **F3, o casco** e **F4, o interior** | `cascoPlaca*`, bordas F4 | `Parallax`, `Moldura` | São o bicho por dentro e por fora. Não mudam neste bloco |
| **Cutscenes 1–3** | `paint-bg-cut1/2/3.png` | — | Conferido em 17/10: **nenhuma tem o Leviatã pintado** (cut1 espaço, cut2 a doca no cinturão, cut3 o hangar). Nada a trocar |
| No disco, sem uso | `leviathan-alive-sheet.png` (carregado na `BootScene` l. 514, nenhum uso), `leviathan-dying*.png`, `leviathan-split.png` | — | Não apagar sem ele (a regra do backup) |

## 4. AS LEIS QUE VALEM AQUI (memórias dele)

- **Criatura animada = gerar INTEIRA → vistas → animar no PixelLab.** Nunca partes coladas com movimento fingido em
  código.
- **Nadadeira de tubarão = escorço lateral, não rotação.** Animar o nado com a cauda girando lê errado e já virou
  hélice antes. O ciclo de ida e volta do rabo foi reprovado; não repropor.
- **DOIS Leviatãs canônicos:**
  - o ARMORED, vivo e forte: menu e silhuetas;
  - o BIOMECÂNICO ENFRAQUECIDO, caído: a cena final.
  - O final precisa da versão enfraquecida do desenho NOVO: o mesmo bicho, ferido e com a lava exposta.
- **Arte com direção clara:** 3–4 conceitos numa folha HTML, aprovação dele, depois GIF EM JOGO. Ele julga movimento
  por GIF.
- **Perfil, não vista de cima:** o PixelLab tende a gerar de cima. Use referência lateral e descarte as simétricas
  antes de mostrar.
- **Escala 1, assado no tamanho em que aparece.** Reduzir pode, aumentar nunca. Atenção à lição de 17/10
  (`redesenho-nativo-de-animacao`): redesenhar uma folha ANIMADA quadro a quadro engorda e "ferve". Animar a partir
  do quadro parado aprovado.
- **Dark sci-fi:** casco escuro, luz só onde há energia (a lava).
- **O PixelLab barra** "gore/flesh/blood": descreva a matéria, não o sinônimo. A rotação 8-dir alisa o estilo.
- **Backup:** o antigo vai para `assets/raw/*-original.png`. Pedido dele: *"não jogue fora o que temos"*.
- **Commit e push só quando ele pedir**, só no nome dele, sem Co-Authored-By, nunca para `legacy`, nunca o
  `.env.pixellab`.

## 5. A ORDEM PROPOSTA (validar com ele no começo da sessão)

1. **O corpo inteiro, de perfil, a partir da M2:** 3–4 conceitos numa folha, com as placas do casco, a lava nas
   costelas e a nadadeira de tubarão. A cabeça e a boca são a parte nova: mostrar variações dela. Ferramenta: o padrão
   do `_gerar-rabo.mjs` (`/generate-image-v2` com a arte aprovada de referência).
2. **A versão enfraquecida do conceito escolhido**, para o final: feridas, lava exposta e placas arrancadas, a partir
   do mesmo desenho (inpaint/edit, sem gerar outro bicho).
3. **O nado (menu):** animar o armored escolhido no PixelLab (PixMiniMax: 2 gerações por clipe, quadro com folga). O
   gesto é o escorço de tubarão. Corrigir o clarear para a paleta da arte e mostrar em GIF NO MENU.
4. **A silhueta distante F1/F2:** o armored reduzido (assado em pixel), com o tint de perspectiva. Conferir que lê
   como BICHO e não como nave, com antes e depois em jogo.
5. **A cena final:**
   - trocar `f8-leviata` e a camada de lava pela versão enfraquecida;
   - remedir `FERIDA_X/Y`;
   - rodar a `probe-interlude4`.
6. **Sondas a rodar:**
   - `probe-menu`, `probe-menu-intro`;
   - `probe-stage1-visual` e a `probe-stage2` (a silhueta);
   - `probe-interlude4`;
   - a `probe-stage3`, se a F3 for tocada.

**Perguntas para abrir a sessão — ✅ RESPONDIDAS por ele em 18/10:**
- O tamanho do bicho no menu → **mantém ~70px** (hoje 116² a 0,6). A arte nova nasce nesse tamanho final.
- A travessia atrás da lua → **fica até o bloco E**. O D só troca o bicho.
- A silhueta da F1/F2 → **o corpo inteiro ao longe**, e não só um pedaço que assoma.

## 6. 📒 O REGISTRO (18/10)

- **Passo 1 ✅ — o corpo APROVADO por ele:** a cabeça da `mandibula-31` no corpo do `tubarao-31`, **cabeça a 0,7,
  emenda 42** (ele primeiro colou "0,85 · emenda 42" por engano e corrigiu: *"havia selecionado o outro mas colei o
  nome errado. 0,7 · emenda 42"*). É a emenda mais limpa, com a cabeça proporcional ao corpo. Arquivo:
  `folhas/2026-10-18/leviata/aprovado/leviata-base.png` (363×160, olhando para a DIREITA). A reserva, se a mistura
  falhar adiante, é o `tubarao-32` (intacto em `cru/`).
  - Como saiu: 8 conceitos (4 cabeças × 2 sementes, `_gerar-corpo.mjs`, a M2 de referência e de estilo; folha
    `folhas/2026-10-18/leviata/`) → ele escolheu misturar → costura de erro mínimo (`_mesclar-cabeca.mjs`) + inpaint
    só na faixa da emenda, com a paleta dos dois conceitos (`_emenda-inpaint.mjs`; folha `leviata/mescla/`).
  - As prévias no jogo saem do jogo PAUSADO, com a textura do bicho trocada (`_capturar-corpo.mjs`): mesma
    profundidade, tint, alpha e camadas da frente. ⚠️ Os asteroides da frente da F2 são sorteados a cada rodada:
    compare candidatos sempre DENTRO da mesma rodada.
- **Achados das capturas (para os passos 3 e 4):**
  - **menu:** a 70px e com o tint `0x8c9bb6`, o casco quase preto SOME, e sobra só a lava. O de hoje aparece pelas
    costelas claras. A versão do menu precisa de borda de luz fria nas costas, ou de outro tint;
  - **silhueta, longe** (escala 0,5, alpha 0,45): invisível, a de hoje e as novas. Decidir no passo 4;
  - **silhueta, perto:** a nova lê como bicho (a de hoje lia como laje);
  - **a silhueta também aparece na F3** (`Parallax`, `mode 'nebulosa'`, escala 1,15, alpha 0,5): troca junto.
- **O inventário estava incompleto. Na cena final, o bicho antigo aparece em mais DOIS lugares** (conferido em 18/10):
  - **capítulo 5, a reentrada:** `f8-reentrada-escalas.png` (12 quadros de 170×161, `queda.ts` l. 70). É o corpo
    caindo em chamas, cada vez menor. Sai do enfraquecido novo;
  - **capítulos 6 e 7, a carcaça na lua:** pintada DENTRO do fundo `f8-sobrevoo-frio.png` (384×216), uma baleia com
    costelas brancas, com a lava numa folha à parte (`f8-sobrevoo-lava-sheet.png`, 246×96, `sobrevoo.ts` l. 49–50).
    Trocar o bicho ali é repintar a carcaça na pintura (inpaint da região) e refazer a folha da lava. Lei:
    *fundos-pintados-resolucao-nativa*.
- **Passo 2 — o enfraquecido do final:**
  - ❌ **1ª rodada, DESCARTADA por ele:** inpaint por regiões sobre a base de perfil (`_gerar-ferido.mjs`, folha
    `leviata/ferido/`). *"as imagens foram geradas de lado... a arte original é completamente diferente. O ângulo é
    diferente... A troca vai depender de chegar de forma igual ao que já tínhamos"* e *"o leviatã antigo tem um rombo
    no meio da carcaça, além de aspecto enfraquecido"*.
  - **A leitura certa do `f8-leviata`:**
    - três-quartos de cima e de frente: a cabeça à ESQUERDA vem para a câmera, e o corpo foge em profundidade para a
      direita até virar destroços (sem rabo);
    - o "bocão" é o ROMBO no meio da carcaça (abas de osso, vazando detritos);
    - as costelas expostas no dorso, vistas de cima;
    - a teia de lava pela pele toda, as cores apagadas.
    - Mesma lei para as outras cenas: reentrada (de cima e de trás, em diagonal), carcaça (três-quartos de cima,
      deitada), menu (quase perfil com a câmera um pouco acima).
  - ▶️ **2ª rodada** (`_final-angulo.mjs`, folha `leviata/angulo/`): a arte de HOJE é a base, e a nova entra só como
    referência de desenho. `edit` = `/edit-images-v2` `edit_with_reference`; `gera` = `/generate-image-v2` com as duas
    referências. ❌ Ele: *"gere novamente, ainda não ficou bom quanto a original"*.
  - ▶️ **3ª rodada** (`_final-conceito.mjs`, folha `leviata/angulo2/`):
    - a fonte passou a ser o CONCEITO aprovado inteiro (`folhas/2026-09-23/conceito-4-ferida-11-limpo.png`, 384×216,
      lava acesa), não o recorte;
    - o resultado passa pelo MESMO processo de hoje, `_recortar-novo.mjs` (recorte, lava separada, corpo frio,
      pontilhado). Conferido no conceito original: reproduz o `f8-leviata` e a lava de hoje sem nenhum pixel
      diferente;
    - 10 candidatos: `edit` 71–74 / `gera` 71–73 / `inpaint` 71–73 (só cabeça e pele, máscara com borda torta). As
      edições do conceito foram as que chegaram. A minha aposta era a edit-72.
    - ✅ **Ele escolheu a edit-73** (*"Edição 73 ficou boa"*) e perguntou se o filtro e o pós aliviam a luz exagerada
      da boca. Medido:
      - a Atmosfera `vacuo` NÃO alivia (névoa ≤30% uniforme; o halo SOMA laranja em volta do quente);
      - o J ainda não existe;
      - o que alivia é a camada de lava, que esmorece de 0,85 a 0,5 no capítulo.
      - A 73 tem 186 pixels de lava amarelos (verde >150), num amarelo-lima, contra 74 na de hoje. Proposta: conter
        só os 158 da cabeça para os laranjas da lava de hoje (`_conter-brilho.mjs`).
    - ✅ **Ele: *"pode seguir com a 73 contida"*. INSTALADA no capítulo 4 (18/10, NÃO commitado):**
      - `public/sprites/f8-leviata.png` = `angulo2/recorte/edit-73-0-corpo.png` (355×145, corpo frio);
      - `f8-leviata-lava.png` = `edit-73-0-contido-lava.png`;
      - os antigos em `assets/raw/f8-leviata*-original.png`; o quadro aprovado em `leviata/aprovado/f8-ferida-73.png`;
      - `fora.ts`: `LEV_X/Y` 12, 6 → 15, −2 (a caixa nova no quadro é 22, 33). A ferida é `LEV + (203, 77)`, o MESMO
        ponto da tela (218, 75): o rombo novo caiu no mesmo lugar do quadro;
      - `tsc` limpo. A `probe-interlude4` passa em tudo do capítulo 4 (nave saindo em 219, 75; 0 faltando). Ela tem
        4 ✘ que **já falhavam com a arte antiga** (conferido trocando de volta): a nave escolhida (`humana`), o banner
        fora do tratamento, o título da vitória e o crédito do rodapé. Não são deste bloco: anotar para o I;
      - GIF em velocidade real, novo e antigo: `angulo2/gif/jogo-cap4-{novo,antigo}.gif` (`_gif-final-cap4.mjs`).
- **Passo 2b ▶️ — as outras cenas, pelo mesmo método** (pedido dele: *"continue com a geração dos outros modelos
  para o restante das cenas... quando eu voltar analiso as gerações e escolhemos"*). `_editar-cena.mjs`: a arte
  aprovada de hoje de cada cena é editada, com a base como referência:
  - reentrada (conceito 5★);
  - carcaça (`f8-sobrevoo.png`; só a elipse da carcaça vem da edição);
  - menu (`ref-leviata-armored.png`, a 1× e a 2×).
  - A silhueta sai da escolha do menu. Folha `leviata/cenas/`.
  - **Gerado (18/10, esperando ele escolher):**
    - reentrada 81–84 (minha aposta: a 82; a 81 cresceu);
    - carcaça 81–84 (aposta: a 81; a ponta da dorsal achata no topo da elipse → alargar a região no escolhido);
    - menu 1×/2× 81–82 (aposta: a 1×-82; as 2× borram na redução).
    - Partir da arte de hoje RESOLVEU o menu "sumir": as novas mantêm as costelas claras do flanco.
    - Capturas: capítulo 6 no jogo (`_capturar-cap.mjs 6 f8SobrevooFrio f8SobrevooLava`), menu e F2
      (`_capturar-corpo.mjs`). A reentrada só em quadro: entra na cena depois do recorte e das 12 escalas.
  - **Depois da escolha:**
    - reentrada → `_gerar-queda.mjs corpo` (com a fonte nova) → as escalas;
    - carcaça → a `instalar` do `_gerar-sobrevoo.mjs` (frio + a folha da lava);
    - menu → o nado no PixMiniMax a partir do quadro escolhido (escorço de tubarão), a paleta corrigida, o GIF;
    - silhueta → o escolhido do menu assado a 133px, com a F3 junto.
- **Passo 2c ▶️ — rodada 2 (18/10), as escolhas dele aplicadas.** Folha `leviata/cenas/rodada2.html`.
  - **A nave menor no capítulo 4** (ele: *"diminua a nave na animação de ser expelida ... percepção de tamanho"*):
    `NAVE_ESCALA = 0.5` em `fora.ts`, fator único sobre o sprite de cada tier (de 0,075 a 0,5). GIFs por linhagem e
    tier em `leviata/naves/` (`_gif-cap4-naves.mjs`, que põe o tier no registry e abre a Interlude4 com a nave).
    ⚠️ As mantas alien, escuras, quase somem na metade; as humanas leem bem. Se ele aprovar o tamanho: assar as
    naves reduzidas fora do jogo, ou dar um fator maior só à alien.
  - ✅ **Reentrada = edição 83** (ele: *"melhor se assemelha ao corpo saudável"*; a 82 tinha duas dorsais).
    **INSTALADA:** `_gerar-queda.mjs corpo <fonte>` (a fonte agora é argumento) → `f8-reentrada.png` 160×161 (era
    170×161) → `escalas`. `BootScene` com `w: 160`. Os antigos em `assets/raw/f8-reentrada*-original.png`. A
    `probe-interlude4` passa nos capítulos 5, 6 e 7 (as mesmas 4 ✘ antigas). GIF: `cenas/gif/jogo-cap5-novo.gif`.
  - **Carcaça = 82, mas COM a dorsal** (ele: *"precisa aparecer, mesmo que torta ou rasgada (é identidade
    visual)"*). `_carcaca-dorsal.mjs`: inpaint numa cunha no dorso (x≈232–288, y≈66–114), o resto é a 82. Aposta:
    a **92** (inclinada, com um rasgo). As outras: a 98 e a 93. Descartadas: 91 e 97 (branco), curva 94–96 (ralas),
    edição inteira (crista de espinhos). Depois da escolha: a `instalar` do `_gerar-sobrevoo.mjs`.
  - **Menu: refeito a partir da BASE NOVA** (ele: *"nenhuma ficou boa ... você tem que se basear no novo leviatã
    ... Ele não herdou caracteristicas do antigo"*). `_menu-da-base.mjs <reducao|resize|gera>`: 11 versões. **Todas
    sumiam no menu** (o bicho novo é quase preto; o antigo aparecia pelas costelas pálidas). Resolvido com
    `_menu-luz.mjs`, a luz da lua assada: uma borda azul-aço nas arestas de cima, uma 2ª fileira suave, o casco ×1,45
    e as ilhas soltas (<8px) tiradas. 5 candidatos; aposta: a **gera-91-0 + luz**. ⚠️ O `/resize` quer o base64
    SEM o prefixo `data:`. ⚠️ A captura da F2 desta rodada pegou rochas na frente: a silhueta fica para depois da
    escolha do menu.
- **Passo 2d ▶️ — rodada 3 (18/10).** Folha `leviata/cenas/rodada3.html`.
  - ✅ **A nave menor no capítulo 4: APROVADA** (ele: *"Ficou ótimo, assim fica bem melhor"*). `NAVE_ESCALA = 0.5`.
  - ✅ **A mancha na boca da reentrada, CORRIGIDA no jogo.** Era um buraco transparente: abaixo de y=151 o recorte
    só aceitava pixel quente, e o miolo BRANCO da brasa e o casco escuro do focinho da 83 ficavam de fora.
    `_gerar-queda.mjs corpo` agora aceita também lum > 170 (a lua desta fonte vai até 125) e lum < 45 até y=156.
    Escalas e GIF refeitos.
  - **Carcaça: a dorsal da rodada 2 estava EM CIMA DA CABEÇA** (as guelras ficam em x≈260; a cunha era em
    240–288), e ele viu: *"a nadadeira na cabeça do leviatã? Parecendo que foi grudada? São erros de quem não abriu o
    arquivo"*. Refeita com `_carcaca-dorsal-base.mjs`: a DORSAL DA PRÓPRIA BASE (recortada, ×0,9, inclinada e
    rasgada), entrando atrás das costelas (x≈190–245, a posição anatômica), com os ossos na frente, a paleta da
    carcaça, a borda azul-aço no bordo de ataque e uma veia de lava. Aposta: rasgada (192, 102, 0.3, 0.9, r1).
  - ✅ **Menu = gerada 91·0 + luz (escolha dele).** O nado (`_menu-nado.mjs` + `_luz-lua.mjs`, a luz compartilhada):
    a onda (a arte deformada, 8–13% por quadro, loop exato; aposta) contra a PixMiniMax 92 (mais solta, mas ferve,
    13–31%). A 91 foi descartada (salto de 48%). Depois da escolha: a folha do menu, o GIF no menu de verdade, a silhueta.
  - **Pergunta dele: a queda na colônia é "pobre"; o que dá impacto?** As técnicas propostas estão na resposta do chat
    de 18/10, resumidas no 🧭 do HANDOFF. Nada implementado ainda.
- **Passo 2e ▶️ — rodada 4 (18/10).** Folha `leviata/cenas/rodada4.html`.
  - ✅ A reentrada sem a mancha: aprovada (*"agora saiu a mancha e ficou uma boa animação"*).
  - **Carcaça:** ele viu a dorsal colada (*"jogue a nadadeira para trás da costela, de forma manual retire o excesso
    e as falhas"*). `_carcaca-dorsal-base.mjs` agora só pinta a barbatana onde a 82 tem FUNDO (preenchimento a partir
    do topo por pixel azulado, lum ≥ 24, sem osso): o corpo inteiro fica na frente, e a borda segue a silhueta. Sem a
    veia de lava; ilhas < 12px voltam à pintura; a borda clara só tem céu do outro lado. Saída em `cenas/dorsal3/`.
    Esperando ele: rasgada (aposta) ou inteira. Depois: a `instalar` de 24/09.
  - ✅ **Menu INSTALADO: PixMiniMax 92** (ele: *"como silhueta ele mascara as imperfeições e deixa o movimento mais
    fluido"*). `_instalar-menu-nado.mjs`: `leviathan-swim-sheet.png` = 16 × 176×80 (a antiga em
    `assets/raw/leviathan-swim-sheet-original.png`); `BootScene` w/h e `MenuScene` end 15. `LEVI_SCALE` segue 0,6
    (~73px). A `probe-menu` (7 de texto) e a `probe-menu-intro` (o emblema ao pular) falham IGUAL com a folha antiga.
    GIF no menu de verdade: `cenas/nado/menu-jogo/` (`_gif-menu.mjs`). Falta: a silhueta da F2/F3.
  - **Capítulo 5 REFEITO, no jogo, para ele avaliar** (*"crie um demo ou a cena como você imaginou"*). `queda.ts`:
    - plano largo ESPELHADO (do alto à esquerda para a direita: casa com a deriva do cap. 4 e a cabeça da carcaça à
      direita no cap. 6), 3,4 s, com a luz no chão e as janelas tremendo;
    - corte para o PLANO BAIXO = o quadro do cap. 6 SEM a carcaça (`_colonia-sem-carcaca.mjs`, inpaint 11 →
      `f8-impacto-colonia.png`) + o chão da frente com borda irregular (`_impacto-camadas.mjs` → `f8-impacto-frente.png`
      e `src/scenes/final/janelasImpacto.ts`, gerado);
    - o corpo inteiro entra em 750 ms e crava o focinho em (258, 160); 2 quadros de impacto (`setTintFill`: preto no
      laranja-claro 70 ms, o inverso 50 ms); tremor 700 ms;
    - a CORTINA DE EJEÇÃO assada (`_ejecao.mjs` → `f8-ejecao-sheet.png`, 48 × 384×200, contato em 192,170, 18/s): cone
      3D de grãos balísticos (G 62), miolo em brasa esfriando, anel de choque quebrado, pedregulhos 2×2;
    - o corpo fica (afunda 6px, a brasa esfria por tint em 2,6 s), a cratera brilha, as 9 janelas apagam do impacto
      para fora (260 px/s), o fogo pega em 4 cúpulas; mergulho no escuro de 450 ms, e o `sobrevoo.ts` abre com `fadeIn`.
    - ⚠️ A `Atmosfera` lia todo fade da câmera como fade-out (o `fadeIn` acabava PRETO): corrigido (`direction`).
    - A `probe-interlude4` passa nos capítulos 5–7 e no fade final (as mesmas 4 ✘ antigas).
  - ⚠️ **Os GIFs por `game.step` erravam o tempo dos TWEENS**: o `TweenManager` do Phaser tem relógio próprio em
    `Date.now()`, então corria no ritmo das capturas. As 3 ferramentas `_gif-*.mjs` agora fazem `Date.now` seguir o
    relógio simulado. Os GIFs das naves foram refeitos.
- **⏸️ PARADA (18/10, fim da sessão).** Ele pediu para marcar aqui: **a próxima sessão começa na rodada 4, com nada
  dela decidido.** O roteiro está no bloco ▶️ COMEÇAR AQUI, no topo deste arquivo. Nada foi commitado.
- **Passo 2f ▶️ — rodada 5 (19/10).** Folha `folhas/2026-10-19/leviata/rodada5.html`. O que ele disse da rodada 4:
  - ✅ **menu:** *"o nado do menu ficou muito bom, mas isso tudo vai ser revisto na fase de mexer no menu"*;
  - **capítulo 5:** *"gostei do jogo de cameras e a troca para o frame da colonia sendo atingida"*, com duas notas:
    - *"a colonia é representada por um asset, só que uma colonia vista do espaço, normalmente, são pontos de luzes
      (igual o satelite capta das cidades a noite)"* → `_colonia-luzes.mjs <nucleo|anel|vale>`: as luzes em pixel de
      1 px no plano do chão (achatado 0,33, como as crateras), um halo pontilhado, 6 quadros (0 aceso, 1–5 a rede
      falhando). No jogo: `f8ColoniaLuzes` (160×48, ADD), no lugar do `f8ColoniaLonge` + 8 `puff` (que segue carregado, sem
      uso). A rede falha no fim da queda (k > 0,66), um quadro sorteado a cada 50–160 ms. A grade planejada foi
      descartada (achatada virava borrão). Prévias no jogo: `luzes/img/` (`_capturar-cap.mjs 5 f8ColoniaLuzes`);
    - *"não gostei do leviatã sendo fincado no solo, duro... se um animal colossal e bio mecanico cai, ele nao cai
      duro... usar um efeito de explosão + toda física de particulas ... para mudar depois para o quadro dele já
      caído?"* → `_explosao.mjs` (folha `f8-explosao-sheet.png`, 48 × 384×216, 18/s, contato em 258,160): a bola de
      fogo, a onda de poeira rasteira, a nuvem de detritos sobre o dorso, a saia na frente e a coluna; bolas em ordem
      de profundidade (a da frente inteira, redonda), sombra só embaixo/à direita, pontilhado de 2 px na borda, o
      desfazer por pontilhado. A v1–v6 estão em `explosao/` (v1 chapada, v3 emendas retas, v4 mosaico de pedra, v6
      granulada). `_explosao-conferir.mjs` mede a cobertura da carcaça: **80% a 0,42 s, 96% a 1,2 s**.
      `queda.ts`: depois dos 2 quadros de impacto, um clarão ADD (0,28 s); o corpo DESABA (gira −38° em volta do focinho
      em 430 ms, o rabo cai para a esquerda), um 2º tremor, e esmaece em 300 ms; o quadro do cap. 6 (frio + lava no
      estágio 0) aparece por baixo de 430 a 1080 ms; a ejeção foi para TRÁS da explosão (por cima liam como chiado).
      ⚠️ O Phaser espelha a imagem DENTRO da caixa dela: a origem do pivô é medida no quadro já espelhado (152, 151,5).
  - **dorsal:** *"pode descer mais alguns pixels, por causa do rasgo dela na ponta perto da cabeça, tenho a impressão
    que ele está descolado ou mal colocado"* → `folhas/2026-10-19/leviata/dorsal4/`: +2, +4, +6 px, rasgada e inteira
    (a rasgada e a inteira diferem em só 14 px). **Instalada a +4 rasgada** (aposta), porque o capítulo 5 agora termina
    na carcaça: `_gerar-sobrevoo.mjs instalar` recebe a fonte e um json com o que é da COLÔNIA dentro da elipse (as
    luzes do morro + caixas: o fogo da cúpula da direita e um entulho ferrugem). O miolo branco do olho (23 px, a cor
    do osso) passou a entrar na placa da lava (ilha clara < 40 px cercada de lava) e apaga com a última luz. Caixa da
    lava 221×98 em (98, 91) (`sobrevoo.ts` e `BootScene`). Antigos em `assets/raw/f8-sobrevoo*-original.png` (+ o json).
  - `probe-interlude4`: os capítulos 5–7 passam (a última luz apaga); as mesmas 4 ✘ antigas. GIFs:
    `gif/jogo-cap5-explosao.gif`, `gif/jogo-cap7-apaga.gif`.
  - ✅ **APROVADA por ele** (*"concordo com todas as suas escolhas, a animação e a explosão de chegada ficou muito
    boa"*): o núcleo, a dorsal +4 rasgada e o capítulo 5. Um ajuste: *"que a explosão ocorra uns frames antes, antes
    mesmo do leviatã bater no solo, para não ter impressão nenhuma que ele bateu reto e duro"* → `ANTES_MS = 70` em
    `queda.ts`: a explosão (agora criada no estouro, não depois das silhuetas) e os 2 quadros de impacto começam
    com o focinho a ~35 px do chão; o corpo segue descendo pelas silhuetas e encosta dentro do disco branco; o
    desabar começa 50 ms depois do encosto. A carcaça aparece com a fumaça a 85–96%. GIF refeito; quadros
    `gif/cap5-estouro.png`. A sonda igual (4 ✘ antigas).
- **Passo 2g ▶️ — rodada 6, a silhueta ao longe (19/10).** Folha `folhas/2026-10-19/leviata/rodada6.html`. Ele: *"pode
  seguir para a silhueta"*.
  - Onde ela aparece (`Parallax.leviathan`, `leviathan.png` 116×59, depth −94, tint `0x2a3352`): no fim da F1 (o modo
    `superficie`, (330, 60), 0,5, alpha → 0,55 na saída da atmosfera); na F2 (`setApproach`: escala 0,5→1,15, alpha
    0,45→0,8, x 304→250, y 72→84); na F3 (`nebulosa`, (310, 66), 1,15, alpha 0,5). Na Cutscene 3 ela se esconde.
  - `_silhueta.mjs`: os quadros CRUS do nado aprovado (`cenas/nado/gera-92`, sem a luz) → paleta da base → 133×60 (o
    quadro inteiro, nunca recortado: os 16 ficam registrados) → SÓ ENTÃO a distância é assada (o aro fica com 1 px). A
    lava é amostrada no centro do pixel de origem (o resize apagava as rachaduras; "qualquer lava" engordava em
    manchas). 4 tratamentos: `menu` (a luz do menu; o jogo com o tint e o alpha de hoje), `arolava` (casco 55% para a
    noite `(12,15,26)`, aro `(92,108,138)` nas bordas de cima, lava ×0,85), `aro` (chapado + aro), `lava` (chapado + lava).
  - `_capturar-silhueta.mjs`: o jogo pausado (V = F2, M = F3), a textura trocada pela folha de cada um (quadros
    acrescentados à mão), escala ×116/133, os novos sem tint e com alpha 0,75→1 (F3 0,85); GIFs 2×2 do nado a 6/s.
  - Leitura: na F3 todos leem; na F2 (fundo muito escuro) só os com o ARO desenham o tubarão, a lava sozinha vira
    brasa solta, e o "menu" some. Aposta: `arolava`.
  - ✅ **Ele escolheu o `aro`** e deu quatro notas: *"se o leviatã é colossal, dependendo do tamanho que ele aparece no
    fundo, vai parecer que ele é menor do que é. Então diminuir o tamanho ainda mais e jogar ele para mais longe nos
    layers é uma solução?"*; *"eu gosto muito do estilo do aro, pois ao longe, é apenas uma sombra..."*; *"o nado
    precisa quase ser imperceptível"*; *"descartaria a aparição na F3"* (o rabo vem aos 45s).
  - **Rodada 7, no jogo (19/10)** — folha `rodada7.html`. `LEVI_LONGE` em `src/Parallax.ts`:
    - `_silhueta.mjs longe` → `public/sprites/leviathan-longe-sheet.png` (`leviathanLonge`): o `aro` assado em CADA
      largura de 28 a 72 px (uma linha por largura, 16 quadros, células 72×33; quadro = (w − 28) × 16 + nado). O aro de
      1 px reduzido pela engine virava pontilhado. O `leviathan.png` antigo fica como reserva (sem a folha nova, volta
      tudo como era);
    - a silhueta virou `Sprite`, sem tint; o tamanho é a LINHA da folha (`larguraLeviata`), o nado a 3/s no `update`;
    - F2: profundidade −96,5 (à frente do planeta −97, atrás dos cascos −94, do cinturão −93 e das rochas −90), largura
      40→60, x 344→316, y 44→46, alpha 0,85→1. ⚠️ Duas correções do jogo: o casco era `(13,16,27)` — luminância ≈16, a
      do céu (10–30) — e sumia, sobrando o risco do aro: agora quase preto `(5,6,11)`; e na altura antiga (y 72–84) a
      faixa do cinturão o cobria inteiro: subiu para o céu aberto, no trecho mais claro (à direita, lum 21–32);
    - fim da F1: 34 px na frente da GALÁXIA da pintura do zero-G (349, 24), alpha 0,85 — o céu à direita é todo
      quase preto e ali só o aro lia;
    - F3: `setVisible(false)` (a nuvem o esconde; o rabo sai dela).
  - `_capturar-silhueta-longe.mjs`: fotos da F2 (hoje e 3 tamanhos, começo e fim), GIF da F2 e do fim da F1 em
    velocidade real (a nave intocável por `cartas.intocavel`, que não pisca). Os cascos da frota são sorteados: numa
    gravação um passou NA FRENTE dele (a régua de escala). A "régua" encenada (um casco movido à mão) foi descartada:
    o casco tem 158 px e o engolia. `probe-stage3` verde; `probe-stage2` e `probe-stage1-visual` (relatório/fotos) sem
    erro.
  - ✅ **APROVADA por ele:** *"Ficou bom, a silhueta mostra que tem algo se aproximando/espreitando"* — o médio e a
    galáxia ficam. **Com isto o bloco D está completo; falta só o commit, quando ele pedir** (plano no topo).
