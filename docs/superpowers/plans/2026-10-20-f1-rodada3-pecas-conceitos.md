# F1 · Rodada 3 — as peças do chão · conceitos (a instalação espera a escolha dele)

> Executada em 20/10 com ele fora. Spec: `specs/2026-10-20-f1-cenario-design.md` §6. Folha:
> `folhas/2026-10-20/f1-cenario/rodada3.html`. Nada instalado, nada commitado.

## O que foi feito

- **Gerador:** `scripts/_g/_gerar-pecas-f1.mjs` — PixelLab `/generate-image-v2` (Pro), a receita dos elites: o recorte
  das cúpulas da cena final (`f8-sobrevoo.png`, 115×60 a partir de (25, 140)) como ESTILO de todas e como ASSUNTO das
  peças de cúpula; o recorte da torre de treliça (28×55 a partir de (22, 95)) como assunto da antena. Vista lateral,
  dark sci-fi, "tomada" pelo crescimento violeta-escuro com bolsas MAGENTA (a regra de leitura: magenta = invasor =
  quebra).
- **Candidatos** (`folhas/.../rodada3/cru/<peça>/`): módulo de cúpula 16, bunker 16, silo 16, antena 16, cúpula grande 8
  (duas sementes), torre invasora 50 (duas sementes), pilar 16, destroço 16. **~100 gerações** (o ciclo tinha 2.487;
  renova em 4/11).
- **A folha:** `scripts/_g/_folha-r3.mjs` planta 4 escolhidos por peça (`rodada3/escolhas.json`) no TAMANHO DE JOGO
  (aparados; reduzidos quando a caixa do jogo é menor — a torre de 48 para 32×30, nunca ampliados) sobre um fundo
  limpo do jogo (`_ver-f1.mjs --limpo --sem-pecas`), com a faixa de solo da frente redesenhada por cima do pé. Os
  contatos de todos os candidatos: `scripts/_g/_contato.mjs`.

## O que falta depois da escolha dele (o plano da instalação)

1. Instalar cada escolhida no MESMO quadro da arte de hoje (a área de colisão sai do quadro: `width × 0,6 × height`),
   a antiga para `assets/raw/*-original.png`.
2. **Os pilares:** gerar as formas escolhidas mais ALTAS (a faixa do jogo vai de 34 a 76 px; os conceitos saíram com
   ~47) e assar 4 alturas; o `TerrainSystem.spawn` passa a sortear a altura assada mais próxima no lugar do
   `setScale(1, 0,55–1,25)`.
3. **A torre:** medir de novo a boca do cano (`BOCAS.turret`) na arte nova.
4. **As luzes por script** sobre a arte parada: as janelas âmbar piscando, o magenta pulsando, a varredura da antena —
   substituindo `building-lights`, `base-lights`, `radar-scan`, `turret-idle`.
5. **O primeiro plano** (`spire` em silhueta, depth 60) sai das peças escolhidas (rocha, antena quebrada, cúpula
   partida).
6. A sonda: os quadros iguais aos de hoje; a faixa de alturas dos pilares igual; a boca da torre dentro da arte.
7. GIF em jogo e a folha.
