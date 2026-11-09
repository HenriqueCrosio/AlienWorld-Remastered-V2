# O cenário do casco — RODADA 4: a virada e a instalação (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** fechar o cenário do casco: o preto da virada de ~2,5 s sem dano às cegas, o Ato 2 +2 s, o desempenho e o
tranco antigo medidos num navegador de verdade, e a chave `?cenario=novo` fora — o cenário novo vira o padrão da F3
sem quebrar nada do que já existe. Spec `specs/2026-11-08-cenario-casco-arena-design.md` §1 e §8.

**Architecture:** a chave sai da URL, mas o `Parallax` continua com o cenário novo DESLIGADO por padrão: quem o liga é a
`GameScene`, só na F3 (o modo `nebulosa` do roteiro). A `Interlude3Scene` também monta um `Parallax('nebulosa')` e
NÃO pode mudar (a pintura dela apaga e rola como hoje). O preto vira 500/1500/500 ms; no preto cheio os tiros inimigos
somem; a nave fica sem dano do início do escurecer ao fim do clarear (sem piscar: é um "sem dano até", não a
invulnerabilidade que pisca); todo evento do `STAGE_3` de t=55 em diante anda +2 s.

## Global Constraints

- Só visual + o relógio +2 s (aceito por ele). Inimigos, aranha, cabeças e enguia não mudam.
- `test-enguia-porte`, `test-serpente`, `test-f3-*`, `test-atmosfera-perfis` passam; `npm run build` passa.
- Commit só quando ele pedir.

## Tasks

1. **O desempenho e o tranco num navegador de verdade (Chrome, GPU real):** a luta da enguia (`?serpente=fusao`) e as 3
   cabeças (`?serpente=A`), com e sem `&cenario=novo`: o custo de cada passo do jogo (p50/p95/máx) e os quadros > 20 ms;
   o tranco da chegada dela (o `cascoVivo.copiar()`). Se o tranco aparecer num navegador de verdade, resolver.
2. **A virada:** o preto 500/1500/500 ms; os tiros inimigos somem no preto cheio; `semDanoAte` cobre do escurecer ao
   clarear; o `STAGE_3` +2 s de t=55 em diante (a Serpente 95 → 97, o `ceu` 89 → 91). A sonda da virada: 0 danos e 0
   inimigos na tela entre o escurecer e o clarear.
3. **A chave sai:** a `GameScene` liga o cenário novo quando a fase é a nebulosa; os `&casco=0` / `&batalha=0` ficam como
   chaves de dev para comparação. Conferir: a `Interlude3Scene` igual (foto antes × depois), a F3 inteira na corrida
   real (fotos do Ato 1, da virada, do Ato 2 e da arena), o treino e o atalho, as outras fases sem mudança.
4. **Os registros:** a folha final, o 🧭, a memória.
