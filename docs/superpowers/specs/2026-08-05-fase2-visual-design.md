# Design — Passe visual da Fase 2 ("Frota Morta")

**Data:** 2026-08-05
**Fatia:** 3 de 9 (Fase 2) do passe visual da campanha — mapa em
`docs/superpowers/specs/2026-07-21-menu-visual-design.md`.
**Arquivos-alvo:** `src/Parallax.ts` (fundo), `src/scenes/BootScene.ts` (carga de arte),
`src/systems/EnemySystem.ts` (defs dos inimigos).

---

## Contexto

A Fase 2 já é jogável e balanceada (aprovada pelo Henrique em playtest, HANDOFF.md) — este passe
é **só arte**, igual às fatias anteriores. Levantamento do estado atual:

- **O chefão Canhoneira-Capitânia JÁ TEM arte real** (`capitania.png` + animações `capitania-idle`
  e `capitania-fire`, instaladas há semanas — PixelLab objeto `c1207020`). `BootScene.makeCapitania()`
  é só o guard-fallback procedural padrão (mesmo papel de `makeAsteroid`/`makeMine`), não a arte em
  uso. **Nada a fazer aqui** — eu tinha lido isso errado na exploração inicial; o Henrique corrigiu.
- **Drone, batedor e canhoneira** são reaproveitados da Fase 1 (mesmo `EnemyKind`, arte biomec
  roxo/magenta já pronta da Fatia 1).
- **Kamikaze e cargueiro** são exclusivos da Fase 2 e ainda usam sprites de 14/jul — pequenos,
  crus, sem relação com a linguagem visual do resto do jogo.
- **O fundo** usa `Parallax('espaco')`: nebulosa procedural + planeta partido + a lua que ENCOLHE
  (1.25→0.45) + o Leviatã que CRESCE (0.5→1.15) — o mecanismo `setApproach()` que conta a
  aproximação da campanha (GDD §7). Existe a pintura do Henrique (`assets/raw/paint-bg-f2-original.png`,
  1672×941, uma colônia de mineração espalhada por blocos de asteroide com guindastes) guardada
  desde a Fatia 2 especificamente para esta fatia.

## Decisões aprovadas

1. **Facção nova para o cinturão**, ancorada na Capitânia já existente (casco cinza-azulado frio,
   acentos magenta/vermelho quentes nas janelas e bocas de canhão — different da paleta orgânica
   roxa da Fase 1). Ela vira a `style_images` de referência para os quatro redesenhos abaixo (nunca
   o sprite antigo de cada inimigo — vira máquina de cópia, lição da Fatia 1 leva 2).
2. **Redesenhar batedor, canhoneira, kamikaze e cargueiro** nessa facção nova. **O drone continua
   biomec roxo** (reaproveitado da Fase 1) — variedade proposital: "o lixo alienígena que seguiu a
   nave" ao lado da frota nova do cinturão.
   - ⚠️ Isso significa que **canhoneira e batedor mudam de arte duas vezes na campanha**: biomec
     roxo na Fase 1, facção do cinturão na Fase 2. É o mesmo `EnemyKind`/comportamento com uma
     textura por fase — like a mina sensora não muda, isso é só troca de textura condicionada à
     fase atual (ver "Como a arte muda por fase" abaixo).
   - **Comportamento e balanceamento INALTERADOS** — só arte; hitbox preservada via `scale` se o
     tamanho novo diferir.
3. **Fundo: a pintura ENTRA, não SUBSTITUI.** Ao contrário da cutscene 1 (onde a pintura trocou o
   `Parallax('espaco')` inteiro), aqui a lua-encolhendo/Leviatã-crescendo é mecânica de narrativa
   ativa que não pode desaparecer. A pintura vira uma **camada nova, a mais distante de todas**
   (atrás até da nebulosa procedural), coexistindo com nebulosa + planeta partido + lua + Leviatã +
   as faixas de cinturão/destroços que já existem em `buildSpace()`. Mesmo mecanismo genérico que já
   existe para `paintBgF1` (`Parallax.paintedBg[]`, tiling automático, factor 0.04 em `update()`) —
   **zero código novo no `update()`**, só popular o array dentro de `buildSpace()`.

## Como a arte muda por fase (canhoneira e batedor)

O `EnemySystem` hoje lê uma textura FIXA por `EnemyKind` (`DEFS.canhoneira.texture = 'enemyGunship'`).
Duas opções:

- **(A) Chave nova por fase** (`enemyGunshipCinturao`, `enemyScoutCinturao`) e o `EnemySystem`
  escolhe a textura pela `stage` atual no momento de spawnar — mesmo princípio de guarda por
  `textures.exists`, só que também condicionado à fase.
- **(B) Duas defs (`EnemyKind`) diferentes** (`canhoneira` vs `canhoneiraCinturao`) e o
  `StageDirector`/`STAGE_2` referencia a variante nova nos eventos `wave`.

**Recomendo (A):** o comportamento é idêntico entre as duas aparições (mesma hitbox, cadência,
padrão de tiro) — só a pele muda. Duplicar o `EnemyKind` (B) duplicaria também manutenção futura
(qualquer ajuste de comportamento teria que ser feito 2x). (A) mantém uma fonte de verdade para o
comportamento e resolve só a textura por contexto.

## Os quatro inimigos redesenhados

Mesma gramática de silhueta-por-função já estabelecida (`EnemySystem.ts:30-53`) — só a pele muda:

| Inimigo | Comportamento (fixo) | Silhueta (mantém) |
|---|---|---|
| **batedor** (F2) | rápido, senóide | dardo magro e afilado |
| **canhoneira** (F2) | para e mira | casco pesado, canhão saliente |
| **kamikaze** | acelera na direção do jogador | espeto na proa |
| **cargueiro** | fábrica lenta, cospe drones | barriga com hangar aberto |

Facção nova: casco cinza-azulado frio (a cor da Capitânia), acentos magenta/vermelho quentes nas
janelas/bocas de canhão — o mesmo princípio de "cor reforça, forma primeiro" da Fatia 1, só que
com outra paleta. Vista lateral, mesmo pipeline de sempre (`gerar.mjs` + candidatos aprovados +
`install-sprite.mjs`/`install-anim.mjs`).

## O fundo pintado

- Original: `assets/raw/paint-bg-f2-original.png` (1672×941, proporção 1.777 — quase idêntica à
  proporção do jogo, 384/216 = 1.778). O corte será mínimo.
- Segue o padrão do `paintBgF1` (fase de duração parecida, ~78s), não o da cutscene 1 (cena curta):
  **canvas largo (~2 telas)**, já que a proporção original permite downscale quase direto sem
  perder composição. Dimensão exata decidida na hora (script `paint-bg.mjs`, já reusável).
- Entra em `buildSpace()` (não em `buildSurface()`), no MESMO mecanismo genérico de
  `this.paintedBg[]` que `paintBgF1` já usa — populado com guarda de textura
  (`textures.exists('paintBgF2')`), tiling e scroll automáticos via `update()` (nenhuma mudança
  necessária lá).
- **Depth: atrás de tudo** (nebulosa procedural está em −98) — proponho **−99**, entre o "vazio"
  do canvas e a nebulosa, para a pintura ler como o fundo mais distante sem tapar nenhuma camada
  existente. (Cutscene 1 usou −110, atrás do Starfield −100, porque lá a pintura SUBSTITUÍA o céu
  inteiro; aqui ela é só mais uma camada — não precisa ficar atrás do Starfield, só atrás das
  camadas procedurais do vácuo.)
- Guarda de textura: sem `paintBgF2.png`, a Fase 2 continua exatamente como está hoje (nebulosa +
  planeta partido, sem a pintura) — nenhuma regressão possível.

## Fora de escopo

- **A Canhoneira-Capitânia** — arte já pronta, nada a mexer (nem balanceamento, que está fechado).
- **Novos comportamentos** dos quatro inimigos redesenhados — só arte.
- **A mina sensora / sensor-mine** — já é um ícone simples e funcional (não é uma nave), não pede
  reskin nesta fatia.
- **Os destroços (`destroco`)** — arte já existe e é aceitável; fora do pedido do Henrique.
- Ajustar `setApproach()`/os números de escala da lua e do Leviatã — mecanismo já fechado e
  aprovado, esta fatia não mexe nele.

## Verificação

- `npm run build` (typecheck + vite) limpo.
- `scripts/probe-stage2.mjs` (já existe, cobre cinturão + inimigos + Capitânia) — regressão
  completa, sem erro de página.
- Revisão visual a olho: os 4 sprites redesenhados lado a lado (mesmo princípio do
  `probe-roster-f1.mjs` da Fatia 1 — "dá para distinguir num relance"), e o fundo pintado em jogo
  (a pintura não deve tapar nem competir visualmente com a lua/Leviatã/nebulosa).
- Guarda de textura em toda arte nova — sem os PNGs, a Fase 2 funciona exatamente como hoje.
- Hitbox e balanceamento dos 4 inimigos inalterados (checagem visual das dimensões, como na
  Fatia 1).

## Critérios de sucesso

1. Kamikaze e cargueiro deixam de parecer sprites de outro jogo — casam com a Capitânia (mesma
   facção: cinza-azulado frio + magenta/vermelho quente).
2. Canhoneira e batedor trocam de pele coerentemente entre Fase 1 (roxo biomec) e Fase 2 (cinturão),
   sem duplicar o `EnemyKind` nem o comportamento.
3. O drone continua roxo — a variedade proposital de "duas facções na mesma fase" fica legível.
4. O fundo pintado entra como camada nova sem apagar a lua-encolhendo/Leviatã-crescendo — a
   aproximação da campanha continua contada pelo mesmo mecanismo.
5. Nada quebra sem os PNGs; comportamento e balanceamento inalterados; `probe-stage2` verde.
