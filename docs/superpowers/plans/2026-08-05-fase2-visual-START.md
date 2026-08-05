# START — Fatia 3: FASE 2 ("Frota Morta")

**Documento de retomada.** Criado 2026-08-05 com o spec pronto, aprovado e commitado; o plano de
implementação ainda NÃO foi escrito (nenhum código/asset tocado nesta fatia).

---

## 🔑 COMO RETOMAR (frase de arranque)

Na próxima sessão, diga:

> **"Leia `docs/superpowers/plans/2026-08-05-fase2-visual-START.md` e continue a Fatia 3 (Fase 2)
> a partir da escrita do plano de implementação."**

Isso é o suficiente — este doc tem todo o contexto.

---

## Estado atual (2026-08-05)

- **Fatias 0, 1 e 2 FECHADAS**, `main` == `origin/main`, tudo pushado.
- **Spec pronto e aprovado:** `docs/superpowers/specs/2026-08-05-fase2-visual-design.md`.
- **Plano:** ainda não escrito. Próximo passo é invocar `superpowers:writing-plans` a partir do
  spec, seguindo o fluxo de sempre (brainstorm→spec→**plano**→impl).

## Decisões já fechadas no spec (não redescobrir)

- **A Canhoneira-Capitânia NÃO ENTRA nesta fatia — já tem arte real** (`capitania.png` +
  `capitania-idle`/`capitania-fire`, instalada há semanas). `BootScene.makeCapitania()` é só o
  guard-fallback procedural padrão, não a arte em uso — não confundir os dois de novo.
- **Facção nova do cinturão**, ancorada na paleta da própria Capitânia (cinza-azulado frio +
  acentos magenta/vermelho quentes) — ela vira a `style_images` de referência (nunca o sprite
  antigo de cada inimigo).
- **Redesenhar batedor, canhoneira, kamikaze e cargueiro.** O **drone continua roxo biomec** da
  Fase 1 (reaproveitado de propósito — variedade: duas facções na mesma fase).
- ⚠️ **Canhoneira e batedor trocam de TEXTURA por fase** (mesmo `EnemyKind`/comportamento: roxo
  biomec na Fase 1, facção do cinturão na Fase 2) — **opção (A)** do spec: chave de textura
  condicionada à `stage` atual no spawn, **não duplicar o `EnemyKind`** (duplicaria manutenção de
  comportamento também).
- **Fundo:** `assets/raw/paint-bg-f2-original.png` (1672×941, já quase na proporção do jogo) ENTRA
  como camada NOVA em `buildSpace()` — **NÃO substitui** `Parallax('espaco')` como a cutscene 1
  fez. Motivo: `espaco` carrega a lua que ENCOLHE e o Leviatã que CRESCE (a mecânica de
  aproximação da campanha, GDD §7) — substituir apagaria isso. Reusa o mecanismo genérico
  `this.paintedBg[]` que `paintBgF1` já usa (tiling + scroll automáticos em `update()`, zero
  código novo lá). Depth proposto: **−99** (atrás da nebulosa procedural em −98, na frente de
  nada — não precisa ficar atrás do Starfield como a cutscene, que substituía o céu inteiro).
  Canvas largo (~2 telas), como `paintBgF1` (fase de duração parecida, ~78s) — não como a
  cutscene curta.
- **Ordem de execução escolhida com o Henrique:** fundo pintado primeiro, depois os 4 inimigos.
- **Fora de escopo:** mina sensora, destroços, `setApproach()`/escala da lua-Leviatã — todos já
  prontos/fechados, esta fatia não mexe.

## Próximo passo

Invocar `superpowers:writing-plans` com
`docs/superpowers/specs/2026-08-05-fase2-visual-design.md` pra gerar o plano de implementação
(Tasks numeradas, como as fatias anteriores) e então executar.
