# A ENGUIA COLOSSAL (S2) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, com pausas — o caminho que
> funcionou na de 3 cabeças). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** levar a spec `specs/2026-11-03-serpente-grande-enguia-design.md` ao jogo, começando pela MAQUETE DO MOVIMENTO
EM BLOCOS (§7.1), que ele aprova por vídeo antes de qualquer arte nova, efeito ou instalação.

**Architecture:** a maquete é uma ferramenta Node fora do jogo (o molde da `_habilidades-maquete.mjs`): compõe cada
quadro em 384×216 sobre a foto da arena e manda os quadros crus ao ffmpeg (×3, vizinho mais próximo). Por baixo dela,
módulos PUROS (o caminho, o roteiro, o corpo, os canos, o Eco, os gêiseres, os perigos, os jogadores de sonda), testados
num script `ok()` como os de sempre. Esses módulos viram o ORÁCULO do porte para o jogo (Parte B), do mesmo jeito que a
maquete das habilidades virou `_oraculo.mjs`.

**Tech Stack:** Node 24 (ESM `.mjs`), `sharp`, `ffmpeg` (libx264), Playwright só nas sondas do jogo (Parte B).

## Global Constraints

- Tela 384×216, a crista do casco em y 151, o rombo centrado em x ~290 (o buraco do lábio vai de x 245 a 332). O lábio
  (`public/sprites/serpente-rombo-labio.png`, origem (0,5; 1) em x 300, y 216) fica NA FRENTE do que está na toca.
- A nave: 110 px/s (`FreeController.SPEED`), caixa de 21×9 (`GameScene.HITBOX_NAVE`), o tiro básico (PULSE) 7/s a 300 px/s.
- A arte aprovada é a MEDIDA: cabeça + pescoço 84 px (do focinho, x 12, ao pescoço, x 95, em `cabeca-e3-pescoco.png`);
  o corpo com 40–56 px de altura afinando até a cauda (o perfil de alturas da `enguia-f1.png`, x ≥ 96); ~18 anéis de
  26 px (os do meio se repetem).
- As faixas dos canos: 4 de 54 px (0–54, 54–108, 108–162, 162–216); a salva de 3 com aviso 1,6 / 1,1 / 0,7 s, frente
  0,15 s, queima 0,6 s, 0,4 s entre as salvas; a faixa livre nunca é a da nave (1ª: qualquer outra; 2ª: até 2 faixas
  da nave; 3ª: a vizinha).
- O Eco: leitura ~2 s, ~5 sementes, detonação na ordem do caminho a cada 0,25 s, raio 15; o ponto mais novo com ≥ 0,4 s;
  cada semente à vista ≥ 0,6 s; duas rodadas.
- Os gêiseres: um a cada ~60 px do caminho, aviso 0,45 s, coluna 0,5 s, ~16 px de largura, do pé da tela até y ~70,
  atravessando a crista; 6–8 entre a ida e a volta, os da volta ENTRE os da ida.
- O ciclo ~27 s; as mordidas a 22% e 13% (3 anéis da cauda; se a cauda estiver fora da tela, ESPERA ela aparecer) e a
  5% (o crânio, que abre a reta final); a morte só no rombo.
- Física do vácuo: nada cai nem quica; o jato é reto (`fisica-do-lugar-nos-ataques`). O casco não é chão.
- Durante uma filmagem do jogo: NÃO editar `src/` nem `.html` (o Vite recarrega). A maquete não toca no jogo.
- Commit e push SÓ quando ele pedir, só no nome dele, nunca para `legacy`; vídeos e quadros crus fora do git.
- A conversa com ele em português; código, comentários e prompts em inglês.

---

## O mapa dos arquivos (Parte A — a maquete)

| arquivo | o que faz |
|---|---|
| `scripts/_serpente/enguia/numeros.mjs` | TODOS os números da maquete num lugar (tela, nave, corpo, velocidades, canos, Eco, gêiseres, mordidas) |
| `scripts/_serpente/enguia/caminho.mjs` | puro: a polilinha amostrada a 1 px (Catmull-Rom), o comprimento de arco, `ponto(s)`, `rumo(s)`, a onda lateral |
| `scripts/_serpente/enguia/roteiro.mjs` | puro: a coreografia inteira (chegada, os 5 caminhos × ciclos, a reta final, a morte) → o caminho global + a linha do tempo de trechos; `estado(t)` |
| `scripts/_serpente/enguia/corpo.mjs` | puro: a pose em t — a cabeça (pescoço, focinho, ângulo, espelho), os anéis (centro, raio, toca), os círculos da cabeça; as mordidas |
| `scripts/_serpente/enguia/canos.mjs` | a salva: o sorteio da faixa livre com a regra, os tempos, o que fere |
| `scripts/_serpente/enguia/eco.mjs` | o rastro da nave, as sementes, a ordem das detonações, as garantias de justiça |
| `scripts/_serpente/enguia/geiseres.mjs` | puro: os pontos da ida e da volta a partir do caminho sob o casco; os tempos de cada um |
| `scripts/_serpente/enguia/perigos.mjs` | as formas que ferem em t (círculos e retângulos) e a folga com sinal até a caixa da nave |
| `scripts/_serpente/enguia/jogador.mjs` | as sondas: `parado` (fixo em (70, 100)) e `desvia` (planeja 1 s à frente contra os perigos) |
| `scripts/_serpente/enguia/medidas.mjs` | lê a arte aprovada: a silhueta da cabeça, o olho, a boca, o perfil de alturas do corpo |
| `scripts/_serpente/enguia/desenho.mjs` | o quadro: a foto, os anéis cinzas, a cabeça simples (a silhueta da E3 chapada), o lábio, os efeitos, a nave, os tiros |
| `scripts/_serpente/_enguia-maquete.mjs` | o laço: simula, mede, filma (mp4), grava o JSON das medidas e as fotos-chave |
| `scripts/_serpente/_enguia-maquete-folha.mjs` | a folha `folhas/2026-11-07/enguia-maquete/maquete.html` a partir dos JSONs |
| `scripts/test-enguia.mjs` | os testes dos módulos puros (`ok()` como os outros `test-*.mjs`) |

A foto da arena: `folhas/2026-10-29/serpente-casco/cru/arena-semnave.png` (a mesma das maquetes de 29/10 a 02/11).

## As decisões de desenho da maquete (o que a spec não fixou — PROPOSTAS para ele aprovar no vídeo)

- **O aviso das passagens** (a spec diz "passagens avisadas" sem dizer como): 0,8 s antes de toda passagem que parte
  do repouso, uma linha pontilhada fraca na cor do olho dela marca os próximos ~160 px do caminho da cabeça.
- **A chegada:** do rombo ela sobe, faz um arco largo pelo alto da arena até a esquerda, desce e sai pela borda de
  baixo enquanto a cauda ainda sai do rombo (o tamanho dela à vista), e volta subindo pela borda direita até o posto.
- **As velocidades de partida:** passagem 190 px/s, chegada 160, subida/descida no rombo 200, sob o casco 110 (a
  lombada), fora da tela 320. Rampas de 0,4 s nas pontas que partem ou chegam ao repouso.
- **A ondulação:** o caminho das passagens ganha uma onda lateral (6 px, 140 px de comprimento) — o corpo desliza pelo
  "tubo" como uma enguia; nas pausas, uma respiração de 2 px correndo pelos anéis.
- **A cabeça no Eco** gira até ±30° seguindo a nave (o gesto do PixelLab virá depois).
- **A morte:** ela recua pelo próprio caminho para dentro do rombo, a cabeça trava na boca, se desfaz nos próprios
  pixels, e o rombo se fecha com placas do casco vindo das bordas.
- **A vida é roteirizada** na maquete (22% no fim do ciclo 1, 13% no ciclo 2, 5% nos canos do ciclo 3): a maquete mede
  quantos tiros acertam em cada trecho, que é o dado para calibrar a vida real depois.

---

## PARTE A — A MAQUETE EM BLOCOS (esta sessão)

### Task A1: os números, o caminho e o roteiro

**Files:**
- Create: `scripts/_serpente/enguia/numeros.mjs`, `scripts/_serpente/enguia/caminho.mjs`, `scripts/_serpente/enguia/roteiro.mjs`
- Test: `scripts/test-enguia.mjs`

**Interfaces:**
- Produces: `N` (os números); `amostra(pontos, {onda})` → `{ xs, ys, L, ponto(s), rumo(s) }` (amostras a 1 px; `s`
  fora de [0, L] prende nas pontas); `montaRoteiro(N)` → `{ caminho, trechos: [{nome, cap, tipo:'move'|'pausa', t0, t1, s0, s1, hab?, aviso?}], estado(t) → {s, trecho, tl}, T }`.

- [ ] **Step 1: os testes** (em `scripts/test-enguia.mjs`):
  - `amostra`: dois pontos a 100 px dão `L` ≈ 100 e `ponto(50)` no meio; amostras consecutivas a ≤ 1,05 px;
  - o roteiro: os trechos são contíguos (`t1` de um = `t0` do seguinte), `s` contínuo (|Δs| ≤ vel_max·dt+1 a 120 Hz), nas
    pausas `s` não muda;
  - o posto dos canos põe a cabeça em ~(340, 30) (o centro entre pescoço e focinho a ≤ 12 px) e o corpo descendo a borda
    direita (os anéis 2–6 com x entre 350 e 384);
  - erguida: o focinho com y ≤ 40 e os anéis dentro do buraco (x 245–332) abaixo de y 150;
  - o ciclo (do início do posto ao início do posto seguinte) entre 24 e 32 s.
- [ ] **Step 2:** `node scripts/test-enguia.mjs` → FALHA (os módulos não existem).
- [ ] **Step 3:** os três módulos. O caminho é UMA polilinha global (os trechos se concatenam); a velocidade de cada
  trecho é um trapézio (rampa de 0,4 s só nas pontas de repouso), então `s(t)` é analítico e o futuro é consultável (os
  jogadores de sonda precisam disso). Um prólogo escondido sob o rombo, do comprimento do corpo, deixa o corpo inteiro
  dentro da toca no começo.
- [ ] **Step 4:** `node scripts/test-enguia.mjs` → tudo `ok`.

### Task A2: o corpo e as medidas da arte

**Files:**
- Create: `scripts/_serpente/enguia/medidas.mjs`, `scripts/_serpente/enguia/corpo.mjs`
- Test: `scripts/test-enguia.mjs` (seção nova)

**Interfaces:**
- Consumes: `montaRoteiro`, `amostra`.
- Produces: `await medidas()` → `{ cabeca: {w, h, mascara, pescoco:{x,y}, focinho:{x,y}, olho:{x,y}, boca:{x,y}}, perfil(u) → altura, circulosCabeca: [{u, r}] }`;
  `pose(rot, med, t, extras)` → `{ cabeca:{pescoco, focinho, ang, espelho, circulos:[{x,y,r}]}, aneis:[{k,x,y,r,toca}], nAneis }`.

- [ ] **Step 1: os testes:** os anéis a 26 px de arco um do outro; o raio do anel 0 ≈ metade da altura do pescoço na arte
  (±2 px); o último anel ≤ 7 px; `toca` só com o centro em x 245–332 e y > 150; depois da 1ª mordida há 3 anéis a menos.
- [ ] **Step 2:** rodar → FALHA.
- [ ] **Step 3:** os módulos. O perfil do corpo mapeia o arco do corpo (18 × 26 px) no da arte (288 px): os primeiros
  80 px e os últimos 150 px iguais aos da arte, o meio esticado. A cabeça é uma corda rígida do pescoço ao focinho
  (84 px), espelhada quando o rumo aponta para a direita. Os círculos da cabeça (para o toque) saem da silhueta da arte:
  4 ao longo do eixo, com o raio da meia-altura naquela coluna.
- [ ] **Step 4:** rodar → `ok`.

### Task A3: as habilidades (canos, Eco, gêiseres) e os perigos

**Files:**
- Create: `scripts/_serpente/enguia/canos.mjs`, `eco.mjs`, `geiseres.mjs`, `perigos.mjs`
- Test: `scripts/test-enguia.mjs` (seção nova)

**Interfaces:**
- Produces:
  - `faixaDe(y)`, `sorteiaLivre(n, faixaNave, rnd)` (a regra), `class Salva { constructor(t0, N, rnd); inicia(faixaNave)… estado(t) → {fase:'aviso'|'fogo'|'brasa'|'fim', i, livre, frente, carga} }`;
  - `class Eco { grava(t, x, y); cospe(t, boca); estado(t) → {sementes:[{x,y,tCrava,tDetona}], explosoes:[{x,y,r}]}; justica() }`;
  - `geiseres(rot)` → `[{x, tAviso, tColuna, tFim}]`;
  - `perigos(mundo, t)` → `[{tipo:'corpo'|'cabeca'|'fogo'|'geiser'|'eco', id, forma:{c:{x,y,r}}|{r:{x0,y0,x1,y1}}}]`;
    `folga(nave, forma)` (px, negativa = dentro).
- [ ] **Step 1: os testes:**
  - a regra da faixa livre em 10.000 sorteios: nunca a da nave; na 2ª até 2 faixas; na 3ª a vizinha;
  - o tempo para chegar à faixa livre (centro a centro, a 110 px/s) é sempre ≤ o aviso daquela salva;
  - o Eco: com a nave parada, as 5 sementes caem a ≤ 3 px dela; andando em linha reta, espaçadas no arco; o ponto mais
    novo com ≥ 0,4 s; toda semente cravada ≥ 0,6 s antes de detonar; a ordem das detonações é a do caminho;
  - os gêiseres: entre 6 e 8; os da volta ENTRE os da ida; nenhum a menos de 25 px de outro ativo ao mesmo tempo;
  - `folga` de um retângulo 21×9 a um círculo e a um retângulo, com os casos de dentro e de fora.
- [ ] **Step 2:** rodar → FALHA. **Step 3:** os módulos. **Step 4:** rodar → `ok`.

### Task A4: o desenho, os jogadores e o laço (o vídeo)

**Files:**
- Create: `scripts/_serpente/enguia/desenho.mjs`, `scripts/_serpente/enguia/jogador.mjs`, `scripts/_serpente/_enguia-maquete.mjs`

**Interfaces:**
- `node scripts/_serpente/_enguia-maquete.mjs <parado|desvia> <saida-dir> [ate=<s>] [fotos=1]` → `<saida-dir>/<jogador>.mp4`,
  `<jogador>.json` (os capítulos, os toques por tipo com o tempo e o trecho, a folga mínima por evento, os tiros por
  trecho e na cabeça, a duração do ciclo) e, com `fotos=1`, PNGs ×3 dos momentos-chave.

- [ ] **Step 1:** o desenho: a foto da arena; os anéis da toca, o lábio por cima, os outros anéis (da cauda para a
  cabeça), a cabeça (a silhueta da E3 chapada em cinza, o olho azul, a brasa da boca), os efeitos assados em pixel
  (os avisos das faixas, o fogo com frente e brasa, o rastro e as sementes, a lombada e os gêiseres, o vapor, os
  jatos dos respiros nas curvas, o aviso pontilhado das passagens, os destroços das mordidas e da morte, o rombo se
  fechando), a nave (o recorte da foto `arena.png`) e os tiros.
- [ ] **Step 2:** os jogadores: `parado` em (70, 100); `desvia` escolhe, a cada quadro, entre 16 rumos + ficar, o que dá
  a maior folga nos próximos 1,0 s (amostras de 0,1 s) contra os perigos conhecidos, puxado para a meta (a faixa livre no
  aviso dos canos; um círculo lento de 30 px em volta de (70, 100) na leitura do Eco; (70, 100) no resto). Os dois
  atiram o PULSE (7/s, 300 px/s) e o tiro morre no primeiro anel/cabeça à vista.
- [ ] **Step 3:** o laço a 30 quadros/s, os quadros crus pelo stdin do ffmpeg (`-vf scale=iw*3:ih*3:flags=neighbor`,
  libx264 crf 16).
- [ ] **Step 4:** rodar `desvia` com `ate=40`, abrir as fotos AMPLIADAS e conferir: a cabeça no posto, o corpo na borda,
  o lábio cobrindo a toca, as faixas legíveis, nenhum anel "descolado" nas curvas (`conferir-ampliado-antes-de-mostrar`).
- [ ] **Step 5:** a luta inteira, as duas sondas. A meta: **`desvia` = 0 toques; `parado` pego pelos canos, pelo Eco
  e por pelo menos um gêiser.** Se `desvia` levar um toque, a correção é no DESENHO da luta (o caminho, o tempo, o
  aviso) quando o golpe for injusto, ou no jogador de sonda quando a esquiva existir e ele não a achou — e a folha diz
  qual foi.

### Task A5: a folha e a revisão com ele

**Files:**
- Create: `scripts/_serpente/_enguia-maquete-folha.mjs`, `docs/superpowers/folhas/2026-11-07/enguia-maquete/maquete.html`

- [ ] **Step 1:** a folha: os dois vídeos (desvia grande, parado ao lado), os capítulos clicáveis (pulam o vídeo), o
  capítulo atual escrito embaixo enquanto toca, a tabela das medidas (toques, folgas, tiros por trecho, o ciclo), as
  fotos-chave, e a lista das PROPOSTAS da maquete (a seção acima) para ele aprovar ou mudar.
- [ ] **Step 2:** abrir no Chrome pelo Vite (`http://localhost:5173/docs/superpowers/folhas/2026-11-07/enguia-maquete/maquete.html`).
- [ ] **Step 3:** ele julga em velocidade real. Cada pedido dele → uma rodada nova (a folha ganha a seção da rodada).
- [ ] **Step 4:** aprovada → atualizar o START, o 🧭 e a memória do roadmap; commit quando ele pedir.

---

## A execução da Parte A (07/11) — o que mudou do plano

- **Feita, A1–A5**, inline. `node scripts/test-enguia.mjs` → tudo ok. A folha:
  `folhas/2026-11-07/enguia-maquete/maquete.html` (os vídeos e as fotos em `cru/`, fora do git). **Espera ele.**
- **As velocidades:** a passagem subiu de 190 para 230 px/s e a lombada de 110 para 140 (o ciclo passava de 40 s);
  entrou `vel.escondido` 1500 px/s para a volta por baixo do rombo, entre o mergulho e a subida, quando nada dela está
  na tela. O ciclo mediu **36,8 s** (a spec estimou ~27): é a decisão 1 da folha (recomendado: uma rodada de Eco).
- **O posto dos canos:** a cabeça fica inclinada ~25° (cabeça de 84 px no canto + o corpo descendo a borda direita não
  cabem com ela reta); o centro dela mediu (337, 39).
- **A toca:** um anel está "no rombo" (atrás do lábio) com o centro em x 245–332 e y > 120 (não 150: as placas
  erguidas do lábio chegam a y ~118); a cabeça vai para trás do lábio quando o PESCOÇO está no rombo.
- **A sonda `desvia`** precisou de duas correções, as duas na sonda, não na luta: (1) os planos viraram "ir d segundos e
  parar" (só com corridas de 1 s ela ficava presa no anel de sementes do Eco); (2) amostrar quadro a quadro nos
  primeiros 0,4 s (de 0,1 em 0,1 s ela atravessava uma explosão de 0,2 s entre duas amostras).
- **Achado para ele:** o pior caso da 1ª salva (3 faixas) pede 1,47 s de um aviso de 1,6 s — sobra 0,13 s (decisão 2
  da folha; recomendado: o 1º aviso em 1,8 s).

## A rodada 2 da maquete (07/11, as respostas dele)

- **Aprovados:** um Eco por ciclo (*"pode ser um ciclo do Eco"*); o 1º aviso dos canos em 1,8 s (*"pode ser ajustado
  para menos, caso precise"*); o arco da chegada (*"Gostei e acho que precisa deixar"*).
- **Saiu:** o aviso pontilhado. No lugar, gestos por momento (blocos; os de verdade são PixMiniMax na Parte B): a
  cabeça recua antes de partir (`prepara`, 0,6 s); o rombo treme, solta poeira e mostra o brilho do olho antes de ela
  sair dele (`R.sinais`); no Eco o tranco do cuspe; nos canos a cabeça treme na carga.
- **O posto = o truque dele:** o corpo sobe a borda direita inteira e sai pelo canto de cima; fora da tela se enrola
  (raio ≥ ~15 px, nunca dobra) e volta só com o pescoço e a cabeça pendurados perto do canto. 20 anéis (o topo da spec)
  para o corpo ainda cobrir a borda.
- **Os gêiseres só com o corpo INTEIRO no rombo** (*"o corpo inteiro precisa sumir no rombo, para depois rolar a
  animação dela embaixo do casco"*): `afunda` desce até o rabo sumir; teste em `test-enguia.mjs`. A lombada e a fissura
  são as do `cascoVivo.ts` (a R3 aprovada): as colunas do casco sobem, a fissura de duas linhas abre atrás e cura a
  partir do rombo em 2,5 s, os gêiseres acendem a fissura.
- **Mais fluido** (*"como se fosse uma serpente se esgueirando"*): o corpo é um TUBO (amostras a 2 px numa máscara, as
  juntas onde dois anéis se encontram), o S do caminho 14 px / 200 px, uma onda de 4,5 px correndo pelo corpo sempre,
  empurrões em cosseno de 0,6 s, raio mínimo de curva à vista ≥ 15 px (teste). O toque usa o mesmo tubo (a cada 10 px).
- **O rombo fica aberto** (*"será a entrada da nave no leviatã"*): a cabeça se desfaz, o resto afunda, o buraco fica.
- **Medido:** desvia 0 toques; o ciclo 35,6 s (o Eco único tirou ~5 s; o afundar inteiro e os 20 anéis devolveram ~3);
  as velocidades ficam para ele sentir jogando.
- **Ideia dele para os efeitos:** o repositório `patch-gg/pixelfx` (MIT, efeitos em pixel por código, paleta própria),
  CLONADO com o ok dele em `Projetos folder/_referencias/pixelfx` (0.3.0, fora do repo do jogo; nada instalado nem
  rodado). Ele: *"pode adicionar os efeitos do pixelfx quando for colocar o modelo da serpente mesmo"* → entram na
  Parte B (passo 3, os efeitos), não na maquete. Candidatos: `fire/flamethrower`, `fire/fire-breath`, `water/geyser`,
  `nature/poison-cloud`, `lightning/plasma-ball`, `explosions/plasma-explosion`, `spawn/disintegrate`.
- **Rodada 2, ajuste (a resposta dele: *"Ficou muito mais natural e fluido"*):** nos canos o corpo tem que TAMPAR a
  lateral direita inteira (o fogo sai dos canos dela), e depois das mordidas a faixa de baixo ficava sem cano. Resolvido
  com o enrolamento ELÁSTICO: a coluna reta em x 372 (sem a onda do nado, que a tirava da borda; a onda que corre pelo
  corpo segue), o arco por cima da tela com as pernas resolvidas por bisseção para o corpo que sobra (`resolvePosto`:
  a ponta grossa — ou o toco — a y ≥ 236). 20 → 17 → 14 anéis. Teste: em cada posto, a cada 0,5 s, toda linha y 10–215
  tem corpo de x ≤ 360 à borda e as 4 faixas têm cano. A onda do nado agora some nas duas pontas de todo trecho.

**✅ A MAQUETE ESTÁ APROVADA (07/11)** — ele: *"Boa, ficou ótimo assim."* Os módulos de `scripts/_serpente/enguia/` e
os números de `numeros.mjs` são agora a fonte (o oráculo) da Parte B.

## B1 · os anéis (07/11, feito; a folha espera ele)

- **A faixa do corpo** (`scripts/_serpente/enguia/arte.mjs`, `_enguia-faixa.mjs`): a F1 endireitada pela linha do meio
  e alongada CORTANDO NAS COSTELAS — 15 pedaços de 18 px (2 costelas) do trecho de grossura constante, alternados entre
  4 começos que emendam bem (x 211/217/224/233); 519 px (meta 520). Conferida ampliada: as juntas não aparecem.
- **As normais** (PixelLab `create_normal_map` lite): a cabeça E3 e a faixa em duas metades de 300 px sobrepostas 80 px
  (o limite é 512; a ponta cortada de cada metade ganha uma borda falsa — emendadas no meio da sobreposição). 0,5 geração.
  A luz da pintura ajustada por mínimos quadrados e o realce do rabo (`realce`, ganho 1,2); o que brilha sozinho fica.
- **A virada de lado** decidida PELO CAMINHO (`R.rola`): troca o lado com o rumo além de ±0,55 (a onda do nado inclina
  até ~0,44 e não pode virar ela) e corre pelo corpo em ±40 px. A cabeça vira com o meio da sua corda. 17 viradas na luta.
- **Os dois jeitos** no vídeo (`_enguia-maquete.mjs ... corpo=aneis|pele [luz=0] [de=]`): A anéis rígidos (fatias de
  26 px giradas inteiras, 4 px de sobreposição, viram anel a anel) × B pele contínua (a faixa dobrada no caminho; a
  virada como cilindro rolando, amostrando dentro da silhueta da coluna). Folha
  `folhas/2026-11-07/enguia-aneis/aneis.html` (`_enguia-aneis-folha.mjs`). Recomendado: B, com a virada anel a anel da A.
- **Rodada 2 dos anéis** (ele: *"A Pele contínua está muito boa, movimento natural, fluido"* + 4 prints circulados:
  *"falhas bem visíveis e feias no modelo. Precisa ser algo mais natural"*; e a cauda *"rasgado e dilacerado"*):
  - **a pele (B) ESCOLHIDA**; o modo `aneis` fica no código, fora da folha;
  - **a cabeça girada quebrava** (o vizinho mais próximo parte as linhas finas): agora RotSprite — `amplia8` (Scale2x ×3,
    um mapa de ÍNDICES dos pixels-fonte: cor e normal do mesmo pixel, nenhuma cor inventada) e amostragem no 8× (cabeça e
    pele); teste em `test-enguia.mjs`;
  - **a junta cabeça/corpo**: só o CRÂNIO é rígido (x < 66, corda 54 px no caminho); o pescoço x 66–95 virou o começo da
    pele (u −30…0) e dobra com ela; as normais do pescoço vêm do mapa da cabeça;
  - **a cabeça presa** tomba ~55° de lado sobre a borda (para o lado da cara: nunca de ponta-cabeça);
  - **o toco rasgado**: o corte por linha (senos + fiapos sorteados), a borda de carne escura com brasas, a pele
    machucada atrás.
- **Rodada 3 dos anéis** (4 prints dele + 2 pedidos no meio):
  - **a fenda crânio/pescoço**: SOBREPOSIÇÃO — a faixa começa em x 56 (10 px sob o crânio, `FAIXA_X0`, índice
    `PESCOCO` = 40), o crânio desenhado até x 72 (`SOBRE` 6); a corda do crânio continua 54 (`JUNTA` 30);
  - **a fenda no topo do pescoço (erguida)** era a VIRADA à vista: a regra do lado agora lê o caminho DE TRÁS PARA
    FRENTE — um trecho sem rumo decidido (reto, subindo/descendo) mostra o lado da PRÓXIMA curva decidida, e a virada
    cai onde o caminho vira, fora da tela; limite ±0,66 (o afundar depois do Eco inclina até 0,62); o afundar perdeu a
    onda do nado; 12 viradas, só 2 à vista (o arco e a curva do mergulho);
  - **a raspada**: a borda do corpo NA TOCA que toca o lábio enquanto ela se move solta faíscas na direção do movimento
    e acende pontos de brasa no lábio (`calor`, esfria em ~0,5 s);
  - **os gêiseres saem da fissura**: a ruptura na linha R3 (a fenda aberta, verde, os lábios erguidos), a coluna sobe
    da fissura e escorre mais estreita até o pé; o perigo segue de y 70 ao pé;
  - **a morte com gore** (pedido dele): clarão, 2 anéis de choque, o crânio em pedaços inteiros (células 5×5 dos
    próprios pixels, escurecendo, brasas na borda), brasas, névoa de carne e gotas; o pescoço decapitado rasgado na
    frente BOMBEIA o fluido em pulsos (0,34 s, enfraquecendo em ~2 s); as rampas do jogo (`RAMPA_FLUIDO`/`RAMPA_CARNE`);
    gotas esticadas no voo com brilho laranja; nada cai (arrasto); `desfaz` 1,8 s;
  - **a virada anel por anel** (pedido dele, para comparar com o cilindro): `rolagem=aneis`; a folha mostra o mesmo
    trecho do mergulho nos dois jeitos.
- **Rodada 4 dos anéis** (ele: *"Se no cilindro você conseguir deixar essas placas menos esticadas… Acho que fica
  perfeito"* → o CILINDRO fica, sem as placas esticadas):
  - **o cilindro sem esticar**: no meio da virada a textura é lida pelo COMPRIMENTO DE ARCO ao redor do cilindro (a
    projeção tinha derivada zero no centro da face = estiramento infinito), misturada pela projeção com peso sin²(φ):
    nas pontas da virada é a arte como foi desenhada;
  - **a borda raspada INCANDESCENTE** (*"fique incandescente a borda onde foi raspada, depois volta ao normal"*):
    `bordaLabio` (os pixels do lábio que encostam no buraco, não o corte da textura); qualquer trecho do corpo na zona
    do rombo cuja borda toque nela aquece um raio de 4 px (acumula, +0,6), esfria a 0,4^dt (~2 s); a rampa branco →
    amarelo → laranja → vermelho-escuro → o metal; 1 px de calor vaza para dentro do lábio;
  - **o gêiser melhor**: o veneno sobe na textura (~170 px/s), bordas em ondas subindo, bolhas, a NUVEM no topo; a
    ruptura cospe gotas, a coluna solta gotas dos lados, vapor maior (0,9 s); a rampa `VENENO`;
  - **o 1º gêiser longe do rombo** (*"o primeiro ficou muito perto do rombo"*): início x 220 (era 250), passo 55, a
    lombada até x 20 → 7 gêiseres (ida 220/165/110/55, volta 82,5/137,5/192,5).
- **Rodada 5 dos anéis** (8 prints dele):
  - **a girada da chegada "rápida e seca"** + **o "movimento estranho nas giradas"** eram o mesmo: a virada de lado À
    VISTA (a cabeça rígida troca de lado num quadro; o corpo rola em leque). A regra do lado agora põe cada virada no
    PRIMEIRO PONTO ESCONDIDO do trecho sem rumo entre dois rumos decididos de lados diferentes (abaixo de y 230, acima
    de −14, fora das laterais); só se o trecho todo estiver à vista ela cai no meio. A queda do mergulho ficou íngreme
    (rumo < 0,66) para ela entrar no rombo sem virar. Resultado: NENHUMA virada à vista. J 32;
  - **a curva do arco**: começa antes, mais aberta, e ela DESACELERA (`vIni`: a velocidade varia linear no trecho, sem
    tranco) 160 → 100 na curva e 100 → 160 na descida; a cabeça gira em ~1,2 s;
  - **o gêiser só para cima** (sem o reflexo); o perigo vai do alto à rachadura (a linha da fissura agora é uma só,
    `trilhaFissura` em `geiseres.mjs`, para o desenho e o toque);
  - **a mordida do crânio** vira FERIDA opaca (borda rasgada, carne escura, brasas) — antes era furo e deixava ver a pele
    sob o crânio;
  - **a raspada = SOLDA** (ele recusou a borda fina: *"quero algo que mostre que uma estrutura de metal gigante friccionou
    contra a borda, causando faísca, pedaços voando, efeito de solda"*, e o corpo "clipa" a borda): só na faixa de 6 px em
    volta da borda do buraco (`pertoBorda`), onde a faixa da borda do corpo (r−3…r+1) cruza o metal; calor (0,42^dt) +
    marca de queimado (0,78^dt); padrão vivo de metal derretido; no contato: clarão POR CIMA do corpo, faíscas em risco
    na direção do movimento, gotas fundidas, lascas da placa, fumaça.
- **Rodada 6 dos anéis** (ele: o gêiser *"ficou ótimo, gostei da posição deles"*):
  - **o rolar de volta, à vista, em todas as viradas** (*"estava muito natural, com o movimento de uma serpente
    mesmo"*): a regra da rodada 4 (o trecho sem rumo mostra o lado da próxima curva decidida, ±0,66, J 40) e o mergulho
    da rodada 4. O estalo da cabeça trocando de lado → na etapa do PixelLab, com as vistas 8-dir da E3 (o pedido dele);
  - **a textura atrás do crânio** (o Eco final, a cabeça girando para a nave): o pedaço da faixa sob o crânio (x 56–65)
    ficou só com a faixa do meio (±10 linhas);
  - **a raspada sem bordas acesas** (*"em todos os lados ela fica voando"*): saíram a solda e o clarão parado; mais
    faíscas (3 por contato, até 28 contatos/quadro) e mais fumaça.
- **Rodada 6, ajuste da entrada no rombo** (ele: o clipe ainda aparecia; o rolar e a cabeça ficam para as gerações; *"a
  textura atrás do crânio ficou boa e sumiu"*): a queda do mergulho ~12 px à direita (até x 294); o contato agora é a
  LINHA onde a borda do buraco corta o corpo (`bordaLabio` só contra o furo de verdade — dentro do anel, abaixo de y 128,
  não o topo da textura nem as frestas entre as placas; faixa ≤ 3 px dentro da silhueta); as faíscas voam para LONGE do
  buraco (as que desciam junto com ela cobriam o corpo de "purpurina"); fumaça grossa e longa (2–3,2 s) faz o grosso do
  esconder; cada ponto segue fumegando por ~1,2 s depois (`raspado`).
- **✅ OS ANÉIS ESTÃO APROVADOS (07/11)** — ele: *"Boa, agora ficou muito bom."* A virada seca da cabeça e as costas
  esticando no rolar ficam para as gerações do PixelLab (as 8 direções da cabeça E3, pedido dele). O próximo:
  `plans/2026-11-07-enguia-geracoes-START.md`.

### B1½ · A girada do corpo + cabeça (07/11, noite) — ✅ APROVADA

O registro completo está no START `plans/2026-11-07-enguia-geracoes-START.md` (etapas 1 e 2).
- **Rodada 1:** a folha `enguia-cabeca-8dir` com 4 caminhos para a cabeça, e a causa das costas achada na curva.
  - Os caminhos: 8-dir de pé, 8-dir deitada, a ponte v3 e o rolar procedural.
  - A curva: a chegada aberta da rodada 5 punha o meio do rolar num trecho reto; a proposta foi a `r4lenta`.
  - Ele recusou as duas: o dorso ainda esticava, e a cabeça devia ser gerada de novo ou procedural.
- **Rodada 2 (`enguia-girada`):** a causa de verdade — a faixa é só o LADO, e as costas não existiam desenhadas.
  - O dorso gerado no PixelLab (`/generate-image-v2`, a arte aprovada de estilo), do corpo e da cabeça.
  - O cilindro com duas fontes: o lado nos flancos, o dorso nas costas, o dorso crescendo com sin²φ (nada em repouso).
  - A cabeça em 19 vistas de 10°, as normais girando junto.
  - Ele: *"O restante eu aprovo"*, com 2 ajustes: tirar a espinha do dorso do corpo e fechar a fenda pescoço × mandíbula
    no clarão. Feitos, commitados e empurrados.
- **Os arquivos:**
  - `enguia-dorso/dorso-corpo.png` (montado por `_enguia-dorso-faixa.mjs`);
  - `enguia-dorso/dorso-cabeca.png`;
  - `arte.mjs` `carregaDorso` / `vistasCabeca`;
  - `desenho.mjs` (a pele com `dw`, a cabeça por vista).
- `ENGUIA_DORSO=0` / `ENGUIA_VISTAS=0` voltam ao jeito antigo, para comparar.
- **Rodada 3 (pedido dele):** a fumaça do rombo enquanto ela fica erguida (o Eco), aprovada.
  - Parada (`vel ≤ 30` no `erguida`), o cruzamento com a borda alimenta os pontos que fumegam, a metade das faíscas,
    mais a fumaça grossa da raspada.
  - Sem a rajada do atrito; quando ela sai, volta a raspada de sempre.
  - Só o sorteio dos efeitos muda; a luta e a sonda são as mesmas.
- **O próximo:** a etapa 3, `plans/2026-11-07-enguia-animacoes-START.md`.

### B2 · As animações da cabeça (07/11, noite) — ✅ APROVADAS

A folha `folhas/2026-11-07/enguia-gestos/gestos.html` tem cada rodada; o START `plans/2026-11-07-enguia-animacoes-START.md`
tinha o pedido.
- **Os 6 gestos**, todos de perfil (medido: nenhum cai numa virada), PixMiniMax a partir da E3, a boca variando:
  - o Eco: fecha lendo, estala no cuspe;
  - os canos: abre na carga, bate no fogo;
  - a preparação: o sibilo;
  - o nadar: a respiração;
  - a mordida no crânio: o grito;
  - a presa: a agonia.
  - E, a pedido dele, a boca fecha no meio dos mergulhos em direção ao rombo.
- **Os arquivos:**
  - as pastas `enguia-gestos/<gesto>/` (q00…, `normais.png` de uma chamada `create_normal_map`, `original/`);
  - `enguia/gestos.mjs` (o tempo de cada gesto, puro);
  - `desenho.mjs` (`s.gesto` no `cabecaArte`, as vistas por quadro, o `selaJunta`);
  - a maquete (`gestos=0`, `vaos=1`, `em=`).
- **Os consertos dele no caminho:**
  - o degrau no topo da cabeça → os quadros recolados pela nuca (`_enguia-gesto-junta.mjs`);
  - os vãos na junta em todas as gerações → o `selaJunta` no desenho (de ~4.000 px para ~70 px perto da junta).
- **O próximo:** os passos 3 e 4 abaixo, START `plans/2026-11-07-enguia-parte-b-START.md`.

## PARTE B — depois da maquete aprovada (o detalhe sai da maquete; um plano novo por parte)

> **07/11:** os passos 1 (os anéis, B1) e 2 (os gestos, B2) estão FEITOS e aprovados. Falta do 3 em diante.
> **08/11:** o passo 3 (os efeitos) FEITO e aprovado na maquete: os respiros com jato (`enguia/respiros.mjs`) e 5
> efeitos do pixelfx copiados e adaptados (`enguia/efeitos.mjs`, `enguia/pixelfx/`); folha
> `folhas/2026-11-08/enguia-respiros/respiros.html`. O passo 4 abre pelo START `plans/2026-11-08-enguia-instalacao-START.md`.

Os números e os caminhos aprovados na maquete são a fonte. Cada parte abre o seu plano curto quando chegar a vez:

1. **Os anéis recortados + normais** (spec §1.3, §7.2): da `enguia-f1.png`, um anel por faixa de 26 px de arco (os do
   meio repetidos), o mapa de normais de cada um (`jogo-de-luz-por-normais`), o anel com canos (fechado/aberto), a cauda,
   o toco. Folha antes de instalar.
2. **Os gestos da cabeça no PixelLab** (§1.2): nadar/olhar, girar seguindo a nave, abrir a boca e cuspir, a carga dos
   canos, a mordida no crânio, a morte presa no rombo — PixMiniMax com o corpo junto e as cores ditas; a pergunta aberta:
   a boca fecha nas passagens? Folha antes de instalar.
3. **Os efeitos** (§7.3) assados em pixel na camada de pixels (`camadaPixels.ts`), partindo dos da maquete.
4. **A instalação** (§7.4): um módulo por habilidade em `src/entities/serpente/` (`enguia.ts` com o caminho/corpo,
   `canos.ts`, `eco.ts`, `geiseres.ts`), os números em `numerosEnguia.ts` (os de `scripts/_serpente/enguia/numeros.mjs`),
   a forma `fusao` trocada pela enguia (`BossSerpente.ts`), as mordidas novas (`serpenteFusao.ts` → as do §6.2), a reta
   final e a morte no rombo; o porte conferido contra os módulos puros da maquete (o oráculo); as sondas
   `_sonda-hab.mjs`/`_sonda-luta.mjs` com a enguia; `npx tsc --noEmit`, `node scripts/test-serpente.mjs`,
   `node scripts/test-serpente-hab.mjs`, `node scripts/test-enguia.mjs`.
5. **Ele joga** e calibra a vida (o alvo: 2–3 voltas, ~60–80 s).
