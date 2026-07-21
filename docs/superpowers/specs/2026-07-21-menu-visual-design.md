# Design — Passe visual do Menu inicial ("O DESPERTAR")

**Data:** 2026-07-21
**Fatia:** 0 de 9 (Menu) do passe visual da campanha — ver mapa de fatias abaixo.
**Arquivo-alvo principal:** `src/scenes/MenuScene.ts` (+ `BootScene.ts` para carga de assets).

---

## Contexto e objetivo

O menu atual já é competente (key art com fade-in, estrelas cintilando, título com pulso,
CTA pulsante, 3 modos de condução, fallback sem arte). Mas é **estático** — um quadro parado
com texto pousado — e sofre de **três problemas** que o Henrique marcou:

1. **Falta vida/movimento** — a cena não respira.
2. **Tipografia/layout** — a "cara" da UI pode ser mais marcante.
3. **Falta identidade de abertura** — não há um "momento AAA" que faça sentir o peso do jogo.

Além disso, há uma **inconsistência de personagem**: o Leviatã da key art do menu (tubarão
esguio) e o do jogo/cutscene (jubarte roliça) são bichos diferentes — **ambos errados**. Um
agente trocou os assets no PixelLab. O **Leviatã canônico** é o objeto biomecânico com as
rachaduras de lava/costelas incandescentes:

- PixelLab object id: `f397793a-0e59-49e2-9853-848b674b3fd7`
- Nome: *"colossal biomechanical space leviathan, side view"*
- 1 direção, 116×116px, tags `leviathan-dying`
- Hoje só possui **1 animação: a de MORTE** (9 frames — lava pulsa, explosões na espinha,
  o casco estremece ao morrer).

Este asset é **compartilhado** com o boss e a cutscene final; melhorá-lo aqui rende nas
fatias 7 e 8.

### Meta desta fatia

Transformar o menu em **"O DESPERTAR"**: uma **entrada cinemática curta** (o teu #2) que
**assenta num diorama vivo** (o teu #1), com o **Leviatã canônico** como cara do jogo, o
horizonte lunar respirando em parallax, e a tipografia/CTA repaginados.

### Fora de escopo (por enquanto)

- Render maior/mais detalhado do Leviatã para o hero shot (o "teste C") — **cortado**.
- Repensar o cenário para espaço aberto / aproximação de planeta — **descartado**; fica o
  horizonte lunar + lua morta (amarra na colônia de Kepler).
- Corrigir o Leviatã errado *dentro do jogo/cutscene* (fatias 7/8) — esta fatia só toca o
  menu, mas deixa o asset canônico "vivo" pronto para reuso.

---

## Direção aprovada: "O DESPERTAR"

Entrada cinemática (~3–4 s, **pulável com qualquer tecla**) que resolve num diorama em loop.

### Beats da abertura

| t (s) | Evento |
|-------|--------|
| 0.0 | Preto → starfield acorda com deriva lenta; brilho de nebulosa surge ao fundo |
| 0.6 | Lua morta e bandas de montanha resolvem da escuridão (fade + leve subida) |
| 1.2 | O Leviatã desliza entrando pelo lado, imenso, as rachaduras de lava pulsando |
| 2.2 | Ele paira e entra em **loop de idle** (respiração da lava + ondulação da cauda) |
| 2.4 | "ALIEN WORLD" materializa com baque sutil (leve shockwave/scanline); "REMASTERED" embaixo |
| 2.8 | CTA + conduções surgem no terço de baixo |

**Qualquer tecla durante a cinemática pula direto para o menu montado** (estado final, sem
animação de entrada — as teclas de ação continuam valendo normalmente depois).

### Diorama em loop (estado de repouso)

- Leviatã: idle vivo (lava pulsando em ritmo cardíaco + ondulação lenta).
- Starfield: deriva + cintilação (reaproveita `Starfield`/`twinkleStars`).
- Partículas em engine: brasas/esporos subindo devagar; névoa baixa sutil.
- Nave-jogador de rastro azul: passagem lenta ocasional ao longe.
- Título: brilho sutil pulsando; CTA: pulso mais marcado (ensina o que fazer).

---

## Arquitetura de camadas (fundo → frente)

Depths em Phaser (crescente = mais à frente):

| Depth | Camada | Origem |
|-------|--------|--------|
| 0 | Céu base + brilho de nebulosa | placa de fundo (asset A) |
| 1 | Starfield (deriva + cintilação) | engine (`Starfield`) |
| 2 | Lua morta | dentro da placa A (depth 0); vira sprite separado só se o teste de parallax pedir |
| 3–5 | Bandas de montanha (parallax) | placa A composta em bandas OU sprites `mtnfar`/`mtnmid` |
| 6 | Névoa baixa | engine (partículas) |
| 10 | **Leviatã** (idle animado) | asset B |
| 12 | Brasas/esporos | engine (partículas) |
| 14 | Nave-jogador (passagem) | sprite `ship` existente |
| 20 | UI: título, sub, CTA, conduções | `pixelText` |
| 30 | Hints de DEV | `pixelText`, só em `import.meta.env.DEV` |

> **Nota de composição:** a key art atual (`menu-keyart.png`) tem a baleia errada **pintada
> dentro** dela. Por isso a placa A precisa vir **sem criatura** — só assim o Leviatã canônico
> pode ser composto por cima como sprite animado independente e a cena pode ganhar parallax.

---

## Assets a criar no PixelLab

### A — Placa de fundo do menu (sem criatura)
- **Conteúdo:** horizonte lunar desolado + lua morta grande no céu + céu estrelado com brisa
  de nebulosa. **Nenhuma criatura.**
- **Composição:** pensada em bandas de profundidade (céu / lua / montanhas distantes /
  montanhas próximas) para habilitar parallax. Se sair como placa única, o parallax fica só
  no starfield + partículas + Leviatã (degradação aceitável).
- **Resolução:** 384×216 (resolução nativa do jogo).
- **Style ref:** a paleta e o tratamento da key art atual (para não destoar do resto).

### B — Animação "Leviatã VIVO / idle"
- **Base:** objeto canônico `f397793a-0e59-49e2-9853-848b674b3fd7` (`animate_object`).
- **Descrição do movimento:** as rachaduras de lava pulsam num ritmo lento e cardíaco; a
  cauda e o corpo ondulam de leve, como quem paira vivo e ameaçador. **Sem** explosões, **sem**
  o casco estremecendo (isso é a animação de morte — esta é a de estar VIVO).
- **Frames:** 6–9, loop perfeito (primeiro ≈ último para não "pular").
- **Reuso:** vira o idle do boss vivo nas fatias futuras.

Ambos entram no pipeline de assets existente: baixados para `public/sprites/`, registrados em
`BootScene.ts` (mapa de texturas/sheets), com as constantes de geometria/escala no padrão já
usado (ver `leviathanWhaleDyingSheet` como referência de sheet quadrada + centro visual).

---

## Tipografia / layout

- Mantém a família de pixel-text (`pixelText` / `COLORS`).
- **Título** maior, com contorno pesado + brilho gelo (`playerGlow`), pousado no céu livre.
- **"REMASTERED"** espaçado como assinatura, em `player`.
- **CTA** ("ENTER · COMEÇAR") isolado e pulsante — o elemento que mais chama.
- **Conduções**: bloco limpo de 3 linhas no rodapé, cor da opção carregando título+descrição
  (`playerBright` / `hot` / `player`), como já está — só reposicionado sobre a placa nova.
- **Legibilidade por contorno/sombra**, sem faixa translúcida grossa cobrindo a arte (a faixa
  atual de alpha 0.45 pode virar um degradê bem mais fino ou sombra de texto, a calibrar em teste).

---

## Fallback e acessibilidade

- **Fallback sem arte** (placa A ausente): mantém o caminho atual — parallax da fase rolando
  atrás de um véu escuro. O jogo **nunca** abre em tela preta por PNG faltando. Cada asset novo
  é checado com `this.textures.exists(...)` antes de usar.
- **`prefers-reduced-motion`**: pula a cinemática de entrada (vai direto ao estado montado) e
  amansa/desliga as partículas e a nave em passagem. Menu 100% legível e utilizável.
- **Pular a cinemática**: qualquer tecla durante a abertura salta ao menu montado.

---

## Fluxo de controle (MenuScene)

```
create():
  resetVariantCache()
  monta camadas de fundo (placa A ou fallback)
  if reduced-motion OU asset faltando: monta estado FINAL direto
  else: dispara timeline da cinemática (beats acima)
  Music.play(this, 'stage1')   // atravessa a transição sem corte, como hoje
  bindKeys()                   // + "qualquer tecla pula a cinemática"

update(dt):
  starfield.update / parallax.update (deriva)
  partículas / passagem da nave (quando ativas)
```

As teclas de ação (ENTER/SPACE/1-3 e os atalhos de DEV) permanecem **idênticas** às atuais —
esta fatia é puramente visual e não muda navegação nem modos de condução.

---

## Verificação (padrão de sondas do projeto)

Seguindo o padrão `probe-*.png` + asserts já usado no repo:

- **`probe-menu.png`** (reaproveita o nome atual): screenshot do **estado final montado** do
  menu com a placa A + Leviatã idle + UICapturado num frame estável.
- **`probe-menu-intro.png`** (novo): um frame no meio da cinemática (ex.: Leviatã entrando)
  para conferir a coreografia.
- **Asserts**: presença das texturas (`menuKeyart`/placa A, sheet do Leviatã vivo), posição do
  título/CTA, e caminho de fallback (sem a placa A → layout antigo intacto).
- **Checagem manual**: rodar `npm run dev`, abrir o menu, ver a entrada, apertar tecla para
  pular, e conferir `prefers-reduced-motion` (via DevTools) pulando a cinemática.

---

## Mapa das fatias (contexto — não faz parte desta implementação)

| # | Fatia | Engloba |
|---|-------|---------|
| **0** | **Menu inicial** ← esta fatia | Key art, título, CTA, modos de condução |
| 1 | Fase 1 | Cenário/parallax, inimigos, chefão 1 |
| 2 | Cutscene 1 (Interlude) | "a gravidade decide" / pouso |
| 3 | Fase 2 | Cinturão, cargueiro, kamikaze, capitânia |
| 4 | Cutscene 2 (Interlude2) | Doca no cinturão + explosão |
| 5 | Fase 3 | Nebulosa → casco → serpente/fusão |
| 6 | Cutscene 3 (Interlude3) | Hangar do Leviatã |
| 7 | Fase 4 | Interior orgânico, corredores, guardião, núcleo |
| 8 | Cutscene final (Interlude4) | O Afastamento |

O **Leviatã canônico** (vivo, criado nesta fatia) é reusado nas fatias 5–8.

---

## Critérios de sucesso

1. Ao abrir, o jogo toca uma abertura curta que resolve num menu **vivo** (não um quadro parado).
2. O **Leviatã canônico** (biomecânico, lava incandescente) é a cara do menu — consistente com
   o que será o boss/cutscene.
3. Título/CTA/conduções têm hierarquia clara e legibilidade sem matar a arte.
4. Fallback sem arte e `prefers-reduced-motion` funcionam; nada quebra sem os PNGs.
5. Navegação e modos de condução **inalterados**.
