# START — o bloco H (os efeitos de imersão por fase)

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. O cenário do casco e da arena da F3 está fechado,
> commitado e empurrado. A sessão abre no bloco H: começar pelas perguntas a ele (superpowers:brainstorming), uma fase por
> vez, antes de gerar qualquer arte."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem: a Serpente grande ✅ → o cenário do casco ✅ → **H** → I → J → F.
> (O START antigo do H, `plans/2026-10-21-bloco-h-START.md`, fica como registro: o §0 dele — o retorno jogando de 28/10 —
> foi cumprido.)

## ▶️ ONDE ESTAMOS (09/11)

- **Branch `feat/cartas-preview`, empurrada para `origin`** (nunca `legacy`). Os commits do cenário do casco (09/11):
  `6fe3825` (o jogo), `d3eaf30` (as ferramentas, os testes e as folhas, sem os vídeos) e o dos docs.
- **O cenário do casco e da arena da F3 está instalado** (spec `specs/2026-11-08-cenario-casco-arena-design.md`, as 4
  rodadas em `plans/2026-11-08-cenario-casco-*.md` e `2026-11-09-cenario-casco-rodada4.md`, as folhas em
  `folhas/2026-11-08/cenario-casco/`). Do preto da virada em diante: a pintura do Ato 1 escurecida e parada, as nuvens à
  deriva, o casco vivo (pulso no cobre, vapor, faíscas no rombo), a batalha ao fundo (clarões e frotas variadas nos
  momentos calmos), o preto de ~2,5 s sem dano às cegas e o Ato 2 +2 s (a Serpente em 97 s).
- **Pendente dele, sem pressa:** jogar a F3 inteira com o cenário novo (o que ele achar volta como ajuste fino, com a
  regra de corrigir só aquilo).

## ▶️ COMEÇAR AQUI: as perguntas do H (uma fase por vez)

O H do 🧭 (só visual: sem corpo, sem dano, fora de todo grupo de colisão):

- **F1** — mísseis caindo do céu nas camadas de trás, e meteoros. ⚠️ O bloco G já pôs na F1 a invasão inteira (a
  artilharia em traçantes, os holofotes, as naves descendo, as explosões ao longe — `src/f1/invasao.ts`). **Perguntar o
  que ainda falta.** Nada no salão da caverna (~42–58 s), onde a aranha já mora.
- **F2** — a silhueta do Leviatã novo ao fundo. ⚠️ O bloco D já pôs a silhueta distante (`LEVI_LONGE` no `Parallax`),
  aprovada. **Perguntar** se o item está cumprido ou se ele quer mais presença.
- **F3** — a criatura como silhueta entre as nebulosas (o elite 63-3 segue cancelado). ⚠️ **Agora o Ato 2 e a arena já
  têm vida ao fundo** (a batalha da rodada 3: clarões e frotas). O que sobra para o H é o **Ato 1, dentro da nuvem** (até o
  rabo, em 45 s; a bruma densa, a lula, as minas na névoa — a visibilidade curta é o tema mecânico do ato, nada pode
  escondê-lo mais). **Perguntar** qual criatura, quando, e se ela deve conversar com a batalha (os mesmos bichos das
  silhuetas `src/f3/silhuetasF3.ts`?).
- **F4** — o golfinho como silhueta em algumas câmaras. **Perguntar quais.**
- Ele está aberto a mais ideias: perguntar se tem alguma.

Uma fase por rodada, cada uma no jogo, filmada, com a folha HTML e o vídeo; ele julga olhando.

## As regras que valem aqui

- **Imersão é só visual** e nunca compete com a leitura do jogo (inimigos, tiros, avisos).
- **Silhueta colossal ao fundo:** pequena, atrás das camadas grandes, quase parada, sombra + aro frio de 1 px, mais escura
  que o fundo MEDIDO no jogo. Não aparecer onde a história não deixa.
- **Pequeno, escuro e lento** na camada de trás ([[camada-de-tras-diminui]]); silhueta de ≲14 px se desenha em pixel
  (o PixelLab gera grande demais).
- **Efeito de cenário se assa em pixel** na resolução nativa, com a paleta do vizinho; nada de Graphics vetorial; o
  pontilhado Bayer puro lê como tabuleiro de xadrez — quebrar com ruído.
- **Fundo pintado em 384×216, escala 1**: reduzir pode, ampliar nunca (o cenário do casco achou camadas antigas
  AMPLIADAS — asteroides, nebulosa do espaço — e as apagou só na F3; nas outras fases elas seguem lá: vale perguntar).
- **No vácuo nada cai nem sobe por peso.** Nada em vermelho de aviso nem branco-azulado (a faixa livre da Serpente).
- **Toda cena passa pela Atmosfera** com perfil próprio.

## As ferramentas que servem (as do cenário do casco somadas às de antes)

- **Uma camada de pixels por cima do mundo, pura e testável** (o modelo do casco): a lógica num `.ts` puro que desenha num
  `Uint8ClampedArray` (`src/f3/efeitosCasco.ts`, `src/f3/batalhaFundo.ts`) e uma casca Phaser com `CanvasTexture`
  redesenhada a 30 Hz (`src/f3/camadaCasco.ts`, `camadaBatalha.ts`). Lições: a camada segue a faixa entre dois desenhos
  (senão treme); não subir a textura enquanto ela está vazia; ler os pixels das texturas uma vez, atrás de um corte.
- **As ferramentas de pixel:** `src/f3/pixel.ts` (`BAYER`, `ruido`, `pintor`).
- **Um momento calmo do chefão:** o `StageBoss.momentoCalmo` (só leitura) — o modelo para "só passa quando a luta deixa".
- **Filmar e fotografar uma fase a passos:** `scripts/_cenario/_f3-casco-filmar.mjs` (`--real` a fase do zero, ou o atalho
  da URL; `--fotos`, `--video --de --ate`) e `scripts/_g/_filmar-f1.mjs` para a F1. A sorte fixa precisa do `Date.now`
  fixo no `addInitScript` (o Phaser semeia o RND com ele); mesmo assim as peças sorteadas variam entre rodadas.
- **Medir o desempenho no Chrome de verdade** (claude-in-chrome): a janela fica atrás e o rAF cai a ~1,5/s, então avançar
  o jogo à mão (`loop.sleep` + `game.step`), ≤ 1.200 passos por chamada; o retorno não pode conter o `location.search`.
- **As de antes:** o cenário vivo (`src/f1/salaoVivo.ts`, `src/f1/invasao.ts`, `docs/CENARIO-VIVO.md`), as luzes de uma
  pintura (`scripts/_cenario/luzes.mjs`), mostrar uma peça no jogo sem tocar em `src/` (`scripts/_g/_aranha-maquete.mjs`).
- **As armadilhas:** durante uma filmagem NÃO editar `src/` nem `.html` do projeto (o Vite recarrega — aconteceu de novo
  em 08/11 e a filmagem foi refeita); uma página por fase; o `director.skipTo` descarta eventos; a nave intocável pisca
  (a sonda usa `damageShip` vazio); a mesa de cartas pausa a fase.

## As leis que seguem valendo

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs e `cru/`
  fora. A ordem: o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`), os docs.
- A conversa com ele em português; código, prompts e raciocínio em inglês. Editar com Edit/Write (sed/node -e falham em
  silêncio com CRLF e `${}`; PowerShell sem `-Encoding utf8` corrompe acentos).
- Arte: 3–4 conceitos numa folha antes de instalar; conferir ampliado antes de mostrar; avaliar por vídeo em velocidade
  real; uma peça aprovada que ele aponta se corrige só naquilo.
