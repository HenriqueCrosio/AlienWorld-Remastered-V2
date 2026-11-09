# As explosões antigas (backup)

09/11, bloco I, etapa 1. As três folhas de explosão que o jogo usou até aqui (o PixelLab de julho): a pequena (32², 9
quadros), a média (64², 13) e a grande (128², 13; tocada ao contrário era a implosão da Aurora). Os quadros do meio eram
anéis vermelhos lisos e os do fim, fumaça de bolinhas: os itens 9 e 14 da análise de polimento de 14/10.

Saíram do jogo quando as explosões novas entraram (`scripts/_i/explosoes/receitas.mjs`, assadas em
`public/sprites/explosoes/`), e ficam aqui a pedido dele: *"Os efeitos e explosoes antigos você pode deixar numa pasta
backup"*. Nada no jogo as carrega. Para voltar uma delas: o caminho antigo era `public/sprites/<nome>.png`, registrada no
`SHEETS` do `BootScene` (`explosionSheet`, `explosionBigSheet`, `explosionSmallSheet`).
