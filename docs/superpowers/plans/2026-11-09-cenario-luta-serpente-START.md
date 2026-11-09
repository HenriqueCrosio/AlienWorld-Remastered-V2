# START — o CENÁRIO da luta da Serpente (a arena da F3)

> ✅ **FECHADO (08–09/11).** Virou o "cenário do casco e da arena": spec `specs/2026-11-08-cenario-casco-arena-design.md`,
> 4 rodadas, commitado em `6fe3825`/`d3eaf30`. ⚠️ O fato 1 abaixo estava errado: os "blocos azuis" eram os asteroides
> distantes (−90) e a nebulosa do espaço (−98), não as `nebula3`; o fato 4 (o tranco) num navegador de verdade é de
> 23–54 ms e vem da irrupção dela, não da cópia do casco. O próximo é o H: `plans/2026-11-09-bloco-h-START.md`.

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A Serpente grande (a enguia colossal) está
> fechada e commitada. A sessão abre no CENÁRIO da luta da Serpente: começar pelas perguntas a ele
> (superpowers:brainstorming), antes de gerar qualquer arte."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem dele: **a Serpente grande ✅ → o CENÁRIO da luta → H → I → J → F.**

## ▶️ ONDE ESTAMOS (08/11)

- **A luta está pronta e aprovada.** As 3 cabeças (A, B, C, 02–03/11) e a enguia colossal (08/11, *"aprovo da forma que
  está"*) estão no jogo; a vida dela foi para o rebalanceamento (`docs/MAPA_TECNICO_BALANCEAMENTO.md`, apêndice 8).
- **O pedido dele, de onde este item nasceu** (28/10, ao refazer a luta): *"o cenário do boss não condiz com a fase"*.
  O S1b já respondeu parte disso (ela sai de um ROMBO rasgado no próprio casco do Leviatã, e o casco é vivo). Em 03/11,
  depois da luta: *"ele quer o CENÁRIO da arena melhorado"* (o 📍 de 03/11 no HANDOFF).
- **O que a arena é hoje** (fotos no jogo, 08/11: `folhas/2026-11-08/enguia-jogo/arena-hoje-{eco,canos,sob}.png`):
  - o céu da nebulosa: o `Starfield` + as nuvens `nebula3` em duas camadas (`Parallax.ts` ~1110–1160: a de trás a
    `factor` 0,05, profundidade −96, só quando não há a pintura; a de −89, `factor` 0,16, alfa 0,65);
  - a faixa do casco do Leviatã (as peças da proa, o rombo inserido por `Parallax.inserirNoCasco`), parada desde a
    chegada dela (o mundo freia, `BossSerpente.mundo`), e o casco vivo por cima (`cascoVivo.ts`, −74,5: a lombada, a
    fissura, o rasgo, o anel do rombo);
  - o lábio do rombo (35) na frente das roscas dela;
  - a Atmosfera da F3 (o tratamento da cena) por cima de tudo.

## Fatos já medidos, para a conversa (não decidir sem ele)

1. **As nuvens da arena são PNGs pequenos AMPLIADOS.** `nebula3.png` 124×93, `nebula3-2` 118×107, `nebula3-3` 90×115,
   desenhados a `scale` 1,0–3,0. Nas fotos são os blocos azul-escuros de pixels grandes atrás dela. Isso fere a lei
   [[fundos-pintados-resolucao-nativa]] (assado em 384×216, escala 1; reduzir pode, AUMENTAR nunca).
2. **A camada de brilho dos destroços escurece as nuvens semitransparentes** (anotado em 03/11, sem pedido dele, guardado
   para este item).
3. **A pintura da nebulosa existe para o Ato 1** (`nebulaPainting`, −96) e SAI quando a nuvem abre (t ≈ 42): a arena
   (t = 88) fica com as nuvens soltas do item 1.
4. **Um tranco antigo:** quando o mundo para na chegada dela, o `cascoVivo.copiar()` (um `getImageData` da faixa) leva
   ~0,6–0,8 s na sonda (GPU por software). Medir num navegador de verdade; se aparecer, resolver junto com o cenário.
5. **A luta ocupa a tela inteira:** a enguia passa pelo céu todo (o arco da chegada no alto, o posto na borda direita, o
   mergulho pelo meio, o Eco erguida a ~y 30), e os gêiseres sobem da fissura até ~y 70. Qualquer peça nova de cenário
   não pode competir com a leitura dela nem dos avisos: o fogo dos canos cobre faixas inteiras, a faixa livre fica
   branco-azulada e o aviso vermelho.

## As perguntas de abertura (brainstorming, uma de cada vez)

1. **O que "não condiz com a fase" ainda incomoda,** olhando as fotos de hoje? O céu, o casco, a luz, a escala?
2. **Onde ela luta:** sobre o casco do Leviatã, dentro da nebulosa (o nome da F3 é "NEBULOSA DE KEPLER · APROXIMAÇÃO
   FINAL")? A arena deve mostrar o Leviatã maior (a silhueta distante, [[silhueta-distante-colossal]])? O planeta?
3. **Uma pintura dele** (como a F1 e o menu, [[cenario-vivo-tecnica]]) ou peças nossas assadas em 384×216?
4. **O que fica vivo:** o casco já respira (a lombada, a fissura); o céu também (nuvens à deriva, relâmpagos na
   nebulosa, a Atmosfera com perfil próprio da arena, [[tratamento-de-imagem-obrigatorio]])?
5. **A transição para a arena:** hoje a nuvem abre em t ≈ 42 e o casco desacelera até parar com o rombo no posto. A
   arena muda a partir de quando?

## As leis deste item

- **Arte:**
  - [[gerar-arte-direto-e-mostrar]]: com direção clara, 3–4 conceitos numa folha;
  - [[conferir-ampliado-antes-de-mostrar]];
  - [[correcao-rumo-dark-sci-fi]]: casco escuro, luz só onde há energia;
  - [[arena-chefao-so-fundo]]: luta de chefão é só pintura (+ a borda na F4), zero peça de cenário;
  - [[camada-de-tras-diminui]], [[chao-em-camadas-pe-escondido]];
  - o fundo pintado é assado em 384×216, escala 1.
- **A luta não muda:** a maquete da enguia é o oráculo, e nada do cenário mexe nos tempos, nos perigos nem nas lonas
  dela. Ela desenha nas profundidades 36 (`cima`), 0,95 (`luz`) e 0,9 (`baixo`); o casco vivo fica em −74,5 e o lábio
  em 35.
- **A nave fica na profundidade 1,** sob ela e sob o lábio (como na S1b).
- **O jogo:** a sonda da luta é `scripts/_serpente/_sonda-enguia.mjs` (`--filmar`, `--perfil <quadro>`); o atalho
  `?serpente=fusao` abre a luta direto (a fusão já na chegada).
- **Commit e push só quando ele pedir,** só no nome dele (sem Co-Authored-By), nunca para `legacy`. Vídeos, GIFs e
  `cru/` ficam fora.
- **A conversa com ele em português;** código, comentários e prompts em inglês. Editar só com Edit/Write.
