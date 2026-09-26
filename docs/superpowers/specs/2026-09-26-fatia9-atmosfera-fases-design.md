# FATIA 9 — A ATMOSFERA NAS FASES E CHEFÕES

**Data:** 2026-09-26 · **Branch:** `feat/atmosfera-fases` · **Estado:** aprovado (*"desenha a spec e implemente"*)
**Motor:** `src/systems/atmosfera/` (spec `2026-09-25-atmosfera-engine-design.md`) · **GDD:** pilar 5

## 1. O pedido

> *"pensei em utilizar o filtro um tom abaixo (talvez 15% a 25% menos) nas proprias fases e chefoes, isso vai trazer
> um acabamento e polimento mais profissional"* · *"se encerrarmos o passe visual agora, isso vai ter que entrar em
> outra parte do roadmap que não é o visual"*

## 2. As decisões (folha `folhas/2026-09-26/atmos-fases-15-25.png`, 16 quadros reais de combate)

| Pergunta | Escolha dele |
|---|---|
| A intensidade | **C — uma por fase:** −15% nas densas (F3, F4), −25% nas abertas (F1, zero-G, F2) |
| O chefão | **A — o mesmo perfil da fase** (a leitura manda no momento de mais tiro) |
| Como o tom acompanha a fase | **1 — segue a PINTURA na tela** (o `Parallax` sabe qual é; a troca faz a transição) |

## 3. A arquitetura

- **`GameScene`** cria `new Atmosfera(this, { limiteLimpo: 99, profundidadePoeira: -0.5 })` e chama `atm.update(dt)`
  depois do hitstop (o freeze-frame congela a névoa junto). A cada quadro pergunta ao `Parallax` a pintura na tela;
  se mudou, `atm.perfil(PERFIL_DA_PINTURA[chave], ms)` — `ms = 0` na largada, `1500` nas trocas.
- **`Parallax.pinturaNaTela(): ChavePintura`** — a pintura dominante: `superficie` → `paintBgF1` (ou `paintBgZeroG`
  depois do `breakAtmosphere`); `espaco` → `paintBgF2`; `nebulosa` → `paintBgF3`; `interior` → `pinturaAtual`
  (A–D; `paintBgF4a` antes da primeira troca).
- **`perfis.ts`** ganha os 8 perfis de fase e `PERFIL_DA_PINTURA: Record<ChavePintura, PerfilAtmosfera>`.
- **Limpos (profundidade ≥ 99):** a faixa e o texto da HUD, o banner de ato, as barras de vida dos 5 chefões.
  A nave, os inimigos, os tiros e o cenário recebem o tratamento.
- **Sem WebGL:** no-op, como nas cutscenes.

## 4. Os perfis

A **base** é o nível médio das cutscenes: névoa 0,8 · grão 0,7 · halo 0,27 · vinheta 0,55 · cor 1. O **fator** da fase
multiplica névoa, grão, halo, vinheta e cor (−15% = ×0,85; −25% = ×0,75). A névoa é **baixa** (`altura` 2 — rente
ao chão, céu mais limpo) e deriva para a esquerda com o mundo. A poeira é rala e passa rápido (sensação de avanço).
Cores amostradas de cada pintura com a conta de sempre; o halo das fases abertas usa o laranja dos tiros e
explosões, porque as pinturas quase não têm quente.

| Chave | Fator | Névoa (cor) | Halo (cor) |
|---|---|---|---|
| `paintBgF1` | ×0,75 | [45, 64, 83] | [230, 110, 40] |
| `paintBgZeroG` | ×0,75 | [75, 73, 134] | [230, 110, 40] |
| `paintBgF2` | ×0,75 | [52, 68, 107] | [230, 110, 40] |
| `paintBgF3` | ×0,85 | [74, 76, 113] | [220, 120, 60] |
| `paintBgF4a` | ×0,85 | [69, 59, 83] | [187, 85, 61] |
| `paintBgF4b` | ×0,85 | [48, 92, 142] | [184, 84, 71] |
| `paintBgF4c` | ×0,85 | [70, 68, 101] | [186, 74, 59] |
| `paintBgF4d` | ×0,85 | [96, 61, 83] | [188, 65, 47] |

⚠️ **O piso de 0,6 é da cutscene final**, não das fases: aqui a névoa fica entre 0,6 (×0,75) e 0,68 (×0,85), por
construção, acima dele.

## 5. Os consertos no motor

- **O flash quente** (revisão final da Fatia 8): o flash da câmera é desenhado ANTES do shader, e um flash laranja
  faz a tela inteira passar no teste de "quente" — o halo acendia tudo. O shader ganha `uFlash` (0–1) e o halo é
  multiplicado por `1 − uFlash`; o controlador lê `cameras.main.flashEffect` (`isRunning` → `alpha`, público e
  tipado, que o Phaser já faz cair de 1 a 0 ao longo do flash).
- **A HUD para de tremer** com a câmera (ela vai para a câmera limpa). Aceito por ele.

## 6. Os testes

- `test-atmosfera-perfis.mjs`: os 8 perfis de fase existem; `PERFIL_DA_PINTURA` cobre as 8 chaves; densidade ≥ 0,6;
  as densas (F3, F4) mais fortes que as abertas.
- As sondas das fases (`probe-stage1-visual`, `probe-stage2`, `probe-stage3`, `probe-stage4`) cobram `atm.ativo` e o
  perfil da pintura na tela; a da F4 cobra a troca A → B → C → D. `probe-stage4` e `probe-interlude4` seguem verdes.
- A folha real (os mesmos 16 momentos, com o shader de verdade) contra a prévia.
- **Ele joga cada fase** antes do merge.

## 7. Fora do escopo

O menu (entra na calibragem). Perfis por chefão (decisão A). Mudar a arte das fases.
