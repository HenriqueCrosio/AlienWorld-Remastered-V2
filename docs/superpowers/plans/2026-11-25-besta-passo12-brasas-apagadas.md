# A Besta refeita — passo 12: as brasas apagadas do coração parado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** um caminho definido no campo do coração parado (fase 3). Ele jogou: *"na hora da chuva de lava com o coração
parado, mesmo com ele parado, os caminhos são apertados demais ou inexistentes, precisa haver um caminho definido para
passar, pode até ser sorteado... Os projéteis de lava queimam, certo? Mas nessa salva de lava, alguns vão se apagar, assim
o jogador consegue passar nos que tiverem apagados sem tomar dano, fugindo da situação"*.

**O que a foto do congelamento mostrou** (25/11, as caixas desenhadas): os vãos físicos existem (15 lascas de 9×6, ~27 px
entre colunas, a nave tem 21×9). Para o olho, quem fecha a passagem são os rastros de fogo e fumaça congelados. E nada diz
onde vai ser seguro quando o tempo voltar.

**A regra nova:** no aperto, uma ROTA de lascas se apaga: viram metal escuro e frio, sem dano, sem luz, sem rastro. As
acesas seguem queimando. A rota liga o lado da nave ao bolso na frente dela, entre o campo e o corpo: quem atravessa
pelas apagadas solta a pilha de tiros no core à queima-roupa.

**Architecture:** o módulo puro `src/entities/besta/coracao.ts` ganha o campo mais denso e as rotas (uma lista de
células apagadas por figura, sorteada entre poucas fixas), com a prova de que a rota é contínua e larga para a nave, em
Node. O `Predador` apaga as lascas da rota no `congelar()`: textura `metalApagado`, corpo desligado, sem luz nem brasas.
Na retomada as apagadas se desfazem em cinza. As acesas retomam o voo como hoje.

**Tech Stack:** TypeScript, Phaser 3.90, Vite; testes puros com `node --experimental-transform-types`; em jogo com
Playwright.

## Global Constraints

- O pedido dele (acima): um caminho definido, podendo ser sorteado; as lavas apagadas não ferem.
- Memória `ataque-bullet-hell-geometrico`: o sorteio é ENTRE rotas fixas, nunca peça a peça.
- Memória `correcao-rumo-dark-sci-fi`: luz só onde há energia — a apagada é escura de verdade, a acesa é a única que brilha.
- O que fica do passo 8: o congelamento, a pilha de tiros, a bomba que limpa o campo, a trava da fase 3.
- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`); GIFs fora do git.

## As decisões MINHAS deste passo (marcar na folha e perguntar)

1. **O campo mais denso:** de 15 para ~30 lascas (5 linhas × 6 colunas), para as acesas virarem parede de verdade e a
   rota apagada ser a saída clara.
2. **As rotas:** quatro fixas, sorteadas: a diagonal que desce, a que sobe, o degrau pelo meio e o zigue-zague. Cada uma
   apaga ~7 lascas encadeadas, do lado da nave até o bolso. Um teste prova que, sem as apagadas, a nave (21×9) passa com
   folga ≥ 8 px de cada lado.
3. **O tempo:** atravessar o campo pela rota é ~180 px, ~1,7 s a 110 px/s. O congelamento sobe de 2,0 s para **2,5 s**.
4. **O apagar:** no aperto as da rota piscam e escurecem em ~0,2 s, com um chiado de lava apagando. O som entra numa
   folha depois; até lá, o estilhaço da lava baixinho.
5. **Na retomada:** as apagadas se desfazem em cinza (não voltam a voar); as acesas seguem como hoje.

## Task 1: as regras puras — `coracao.ts` (o campo, as rotas), `scripts/test-besta-coracao.mjs`

- [ ] O teste primeiro: o campo de 30; cada rota é contínua (vizinhas no máximo uma célula de distância), começa na
  borda da esquerda do campo e termina no bolso; com as da rota apagadas, a nave passa com ≥ 8 px de folga; as acesas
  fecham todo o resto (nenhum outro caminho do lado da nave ao bolso).
- [ ] `CORACAO` ganha `ROTAS` e `PARADO_S = 2.5`; `campo()` diz quais lascas se apagam.
- [ ] `node --experimental-transform-types scripts/test-besta-coracao.mjs` → "tudo certo".

## Task 2: no motor — `Predador.ts` (`congelar()` apaga a rota; a textura `metalApagado`; a cinza na retomada)

- [ ] A apagada: o corpo desligado, a luz destruída, fora das brasas; `limparCampo` (a bomba) segue limpando tudo.
- [ ] `npx tsc --noEmit -p .` limpo; os testes puros passam.

## Task 3: no jogo — `scripts/_f4/_besta-coracao.mjs` (o teste), `_besta-coracao-filme.mjs`, a folha `besta-bio/passo12.html`

- [ ] A nave que segue a rota de cada figura até o bolso leva 0 toques, no congelamento e depois da retomada; a parada
  no lado da nave leva o dano; nenhuma apagada tem corpo; nenhum erro no console.
- [ ] A folha: as quatro rotas sobre a arena de verdade, a foto do congelamento com as caixas, o GIF da nave passando
  pelas apagadas; as decisões acima para ele marcar.
