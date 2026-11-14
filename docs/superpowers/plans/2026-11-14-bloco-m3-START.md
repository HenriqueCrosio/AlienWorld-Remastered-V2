# START — bloco M3: a tela de fim de fase e de morte

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. Em 14/11 fecharam o bloco J (enxuto: a medição
> dos perfis, nenhum mudou), o M1 (a pausa e as CONFIGURAÇÕES) e o M2 (os controles de Xbox e PlayStation, o remapear,
> as dicas pelo aparelho), aprovados, commitados e empurrados. A sessão abre no M3, a tela de fim de fase e de morte no
> padrão da tela final: uma pergunta por vez (superpowers:brainstorming), antes de desenhar."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem: … → J ✅ → **M** (M1 ✅ · M2 ✅ · **M3** · M4 o carregamento e o favicon) →
> F; depois o rebalanceamento e só então o som.

## ▶️ ONDE ESTAMOS (14/11, fim da sessão)

- Branch `feat/cartas-preview`, empurrada para `origin` (nunca `legacy`). Os commits do dia: o M1 (`0544f13`,
  `7bf86c4`, `49c7bed`) e o M2 (`0959477`, `7e2ce93`, `f247c99`, `d3e38ee`). Fora do git só os vídeos e os `q/`.
- **O bloco M é a MOLDURA do jogo** — a resposta à pergunta dele de 14/11: *"o que falta para dar cara de jogo lançado
  [...] ao aspecto de polimento de um jogo terminado?"*. Pouco estava no shader (o J fechou sem mudar perfil nenhum); o
  que denunciava protótipo eram as bordas: a pausa, as configurações, o controle, a tela de fim de fase, o carregamento.
- **O que a sessão de 14/11 fechou** (o detalhe no 🧭):
  - **O J**, enxuto: a medição das 11 pinturas (`scripts/_j/`, folha `folhas/2026-11-14/perfis/perfis.html`).
  - **O M1 — a pausa e as CONFIGURAÇÕES.** O `ESC` pausa (fases, cutscenes, mesa, hangar; sozinha quando a janela
    perde o foco); a janela PEQUENA da pausa e a GRANDE das configurações, no desenho da janela do placar
    (`src/ui/janela.ts`); abas ÁUDIO · CONTROLES · VÍDEO · JOGO; as preferências num objeto só, versionado
    (`src/preferencias.ts`). Spec `specs/2026-11-14-bloco-m1-pausa-configuracoes-design.md`.
  - **O M2 — os controles.** Xbox e PlayStation pela Gamepad API (`src/entrada/`): perfis MODERNO e ARCADE, o remapear
    por ação com troca anunciada, as dicas pelo último aparelho usado, o aviso de conectado/desconectado, a vibração
    (onde o navegador a oferece: o Chrome não vibra controle de PS, e ele aceitou), os três símbolos de aparelho no
    menu e na pausa. Spec `specs/2026-11-14-bloco-m2-controles-design.md`.
- **Pendente dele, sem pressa:** o controle de Xbox DE VERDADE (ele só tem o DualSense, que aprovou); zerar a F4 com a
  tela final nova; os clarões não filmados (a virada da Torre da F1, a fusão da Serpente, o núcleo da F4, o Casco, a
  atmosfera, a bomba de pânico); jogar a F3 e a F4 inteiras.
- **Guardado para depois (pedidos dele):** a zona morta ajustável e um 2º controle; a conta do usuário sincronizando
  as preferências (junto do placar online); os ícones de botão fora das CONFIGURAÇÕES.
- **Para o REBALANCEAMENTO (anotado antes):** as cartas fortes demais, a vida da enguia, a saída da aranha do casco.

## ▶️ O M3: o que existe hoje

A `GameOverScene` (`src/scenes/GameOverScene.ts`, ~130 linhas) é TEXTO SOLTO sobre o fundo escuro: o título ("FASE N
COMPLETA" + um gancho, ou "NAVE PERDIDA" + "a fase N continua esperando"), SCORE, RECORDE, a medalha em texto, "★ NOVO
RECORDE ★" e a dica da tecla. É o maior contraste de acabamento do jogo: a tela final ganhou a janela, a medalha em
pixel e os pontos contando, e esta ficou no visual de protótipo.

O que pesa na decisão (conferir no código antes de perguntar):

- **Quem chega a esta tela.** `scene.start('GameOver')` sai de cinco lugares: a morte na fase (`GameScene.ts` ~3113),
  a vitória de uma fase SEM cutscene (~2493), e as cutscenes 2, 3 e 4 em caminhos de treino. Na campanha normal toda
  fase vencida vai para a CUTSCENE dela, e a F4 para o resultado no menu do amanhecer — ou seja, **a tela que o jogador
  vê de verdade é a NAVE PERDIDA**; a "FASE COMPLETA" aparece no treino do chefão. Confirmar lendo `victory()`.
- **O que já está pronto para reusar:** a janela (`src/ui/janela.ts#texturaJanela`), a medalha em pixel e os pontos
  contando (`src/menu/painelResultado.ts`, `src/menu/resultado.ts#pontosMostrados`), o placar e as faixas de medalha
  (`src/placar.ts`), as dicas pelo aparelho (`src/entrada/dicas.ts`: a tela já usa `dicaViva` e `controleNoMenu`).
- **O retry:** a tecla de tiro (ou o botão de confirmar) recomeça a FASE do placar de entrada; `ESC`/voltar vai ao
  menu. A pausa do M1 já tem REINICIAR A FASE com o mesmo payload.
- **O fundo:** hoje é o fundo liso do jogo. A regra do projeto (GDD pilar 5) é que nenhuma imagem vai crua para a tela;
  a morte da nave tem a sua encenação própria (`docs/DESTROCOS.md`, `src/systems/morte/`), que termina ANTES desta tela.

## As perguntas a ele (uma por vez)

1. **O que a tela da NAVE PERDIDA deve passar?** Um placar sóbrio de "tente de novo" (rápido, o jogador quer voltar à
   fase), ou um momento com peso (a nave destruída, o Leviatã seguindo)?
2. **O fundo:** o último quadro da fase escurecido (a morte aconteceu ALI), uma pintura própria, ou o fundo liso com a
   janela?
3. **A janela:** a mesma do placar final (pontos contando, recorde, medalha em pixel), ou uma versão menor e mais
   rápida para a morte (ele vai vê-la muitas vezes)?
4. **As opções:** só "tentar de novo" e "menu" como hoje, ou as linhas da pausa (TENTAR DE NOVO · CONFIGURAÇÕES · SAIR)?
5. **A "FASE COMPLETA" do treino:** entra no mesmo desenho, ou fica como está por ser tela de treino?
6. Depois: 2–3 conceitos lado a lado, em foto no jogo, para ele escolher.

## Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e conferir `git status` (limpo, fora os vídeos e os `q/`).
2. Ler `GameOverScene.ts` e o `victory()`/a morte na `GameScene` para confirmar quem chega à tela.
3. Fazer a pergunta 1 e seguir uma por vez; só então a folha de conceitos, a spec e o plano.

## As ferramentas que servem

- Ver a tela sem jogar: no navegador, a partir do menu,
  `__game.scene.getScene('Menu').scene.start('GameOver', { score: 4820, handling: 'diegetico', victory: false, stage: 2, ship: 'humana', baseScore: 0 })`
  (pela cena do menu: o `start` do gerenciador deixaria o menu rodando por baixo).
- Fotos no jogo com teclado e com controle SIMULADO: `scripts/_m/_pausa-fotos.mjs` e `scripts/_m/_controle-fotos.mjs`
  são os moldes (o controle simulado troca `navigator.getGamepads` na página; os toques esperam 2 quadros).
- A folha a partir das fotos: `scripts/_m/_pausa-folha.mjs` é o molde.
- A prova de "idêntico" de uma textura (a janela do placar): `scripts/_m/_resultado-foto.mjs`.
- Os testes do M: `test-preferencias`, `test-mapas`, `test-pausa`, `test-pausa-jogo`, `test-controle-jogo` (os dois
  últimos no navegador, contra o `npm run dev`).

## As leis que seguem valendo

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs, os
  quadros soltos (`q/`) e o `cru/` fora. A ordem: o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês.
- Editar com Edit/Write. Um script de edição vai num ARQUIVO (Write) e deve FALHAR quando o trecho não é achado. ⚠️
  Dois heredocs no mesmo comando do Bash falharam aqui duas vezes ("unexpected EOF"): um por comando, ou Write.
- ⚠️ O Vite não viu duas reescritas INTEIRAS de arquivo (o navegador recebia a versão velha): depois de reescrever um
  arquivo de `src/` por Write, conferir o que o servidor serve (`curl localhost:5173/src/…`) e dar um `touch` se preciso.
- Durante uma filmagem não editar `src/` nem `.html` do projeto (o Vite recarrega).
- Testes novos terminam com `process.exitCode`. O navegador automático roda devagar: um toque simulado espera QUADROS
  do jogo, não milissegundos fixos.
- A tela final aprovada (a janela do placar, a assinatura, o menu do amanhecer) não muda: qualquer peça extraída dela
  prova o idêntico antes e depois.
