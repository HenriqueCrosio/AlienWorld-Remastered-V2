# A bomba de queda — cai na atmosfera, é arremessada no vácuo (03/10/2026)

> Etapa 1.5 do 🧭. Pedido dele ao testar a bomba no mapa de teclas novo: *"não existe nenhuma animação de bomba caindo
> e ela mais parece um míssil do que uma bomba... bomba se solta da nave para cair em algum lugar, na F1 temos bases,
> torres e artilharia, a bomba é para acertar solo"*. Brainstorming com ele em 03/10.

## 1. Hoje

A bomba é a "de pânico" do shmup: flash na tela, tremor, TODO tiro inimigo some, 12 de dano em todo inimigo, no
chefão e no golfinho, e 1s de invulnerável. Nada cai: a explosão nasce 14px à frente do nariz (por isso lê como
míssil) e outra no meio da tela. As construções de solo da F1 (`turret`, `base`, `silo`, `radar`, `building`) não
levam dano dela.

## 2. As decisões (dele, 03/10)

1. **A bomba de pânico FICA GUARDADA** atrás de uma chave — *"guarde o que temos... se ficar ruim a nova mecânica,
   voltamos à antiga"*. Com as cartas ela era *"mais facilidade para limpar wave"*.
2. **F1 (atmosfera): cai em PARÁBOLA**, herdando a velocidade e o deslocamento da nave; explode ao bater no SOLO.
3. **ZERO-G: sai da nave "como em 0G"**, seguindo a trajetória do lançamento, e explode num PAVIO de alguns
   segundos — *"explode no sentido que for jogada"*.
4. **Explode no CONTATO** (inimigo, construção, chefão) antes do solo ou do pavio.
5. A bomba do ZERO-G com função própria fica para depois.

## 3. O comportamento

| | Atmosfera (F1) | Vácuo (F2, F3, F4) |
|---|---|---|
| Saída | da barriga (`x`, `y + 6`), sem empurrão | à frente (`x + 10`, `y`), +120 px/s para a frente |
| Velocidade inicial | a da nave | a da nave + (120, 0) |
| Gravidade | 420 px/s² (a mesma do flap) | 0 |
| Freio do ar | o `vx` decai para −30 px/s (fica para trás aos poucos, como bomba de avião) | nenhum |
| Explode | no SOLO (`GROUND_Y`) ou no CONTATO | no PAVIO (1,5s) ou no CONTATO |

- **Quem decide é a ZONA, não a condução:** no LEGACY (flap sempre) a F2 é vácuo, e a bomba é arremessada.
- **A explosão:** raio **36px**, **12 de dano** a todos no raio — inimigos, construções destrutíveis (a rocha segue
  indestrutível), o chefão (qualquer alvo dele no raio, uma vez por explosão) e o golfinho vulnerável. A explosão
  grande do `Fx` no ponto + tremor curto. **Não** limpa os tiros inimigos, **não** dá invulnerável, **não** fere a nave.
- **A bomba gira** para alinhar o nariz com a velocidade (cai de bico na parábola).
- **Fica igual:** a tecla (Shift / X), o estoque de 3 por vida + a Bomba Extra, o `JustDown`/borda.
- Bomba que sai da tela antes de explodir some sem explodir.

## 4. A arquitetura

- **`src/bombaRegras.ts`** (puro, testável em node) — os números e a física:
  - `BOMBA = { modo: 'queda' | 'panico', raio, dano, gravidade, freioAlvo, freio, arremesso, pavioMs }`.
  - `lancamento(zona, vx, vy) → { vx, vy, gravidade, pavioMs: number | null }`.
  - `passo(estado, dt) → estado` (a integração: gravidade e freio no `vx`), para a sonda e o teste saberem onde a bomba
    está sem o Phaser.
- **`src/systems/Bombas.ts`** — as bombas no ar: cria o sprite, integra com o `passo`, confere o solo, o pavio e o
  CONTATO (retângulo do corpo contra inimigos, construções sólidas e alvos do chefão), e explode chamando o HOST.
  Conversa com a cena por uma interface `HostBombas` (como as cartas fazem com o `HostCartas`): `nave()`, `zona()`,
  `inimigos()`, `construcoes()`, `alvosDoChefe()`, `ferirInimigo(e, dano)`, `ferirConstrucao(p, dano)`,
  `ferirChefe(dano)`, `ferirGolfinho(x, y, raio, dano)`, `fx`, `medidas`.
- **`GameScene`**:
  - `useBomb()` gasta o estoque e escolhe pela chave: `'queda'` → `bombas.lancar()`; `'panico'` → `bombaDePanico()`
    (o código de hoje, inteiro, num método só).
  - o dano em construção sai do `bulletHitProp` para um `ferirConstrucao(prop, dano)` que o tiro e a bomba usam.
  - o dano da bomba em inimigo (o laço de hoje) vira `ferirInimigo(e, dano, fonte)`, usado pelas duas bombas.
- **Arte provisória** em código (8×4 px: casco escuro, faixa quente), na mesma linha das `texturasProvisorias` das
  cartas — a arte final troca a textura sem mexer em lógica.

## 5. A arte final (depois da mecânica aprovada)

Peça ≲8px: o gerador do PixelLab sai grande demais (memória `pecas-minusculas-em-pixel`) — desenho pixel a pixel no
`pixelart_workbench`, paleta do dark sci-fi (casco escuro, luz só onde há energia). A lista das peças vai para ele
ANTES de gerar: a bomba (1 quadro, gira no motor) e talvez uma faísca de pavio no vácuo.

## 6. Fora do escopo

- A bomba do ZERO-G com função própria.
- Recalibrar o estoque, o raio e o dano — é a calibragem, no sandbox.

## 7. Como verificar

- **Node:** `scripts/test-bomba-regras.mjs` — o lançamento por zona; na atmosfera a bomba desce e o `vx` tende a −30;
  no vácuo anda reta sem perder velocidade; o pavio só no vácuo.
- **Sonda nova `probe-bomba-queda`:** F1 — Shift solta, a bomba cai abaixo da nave, explode no solo e destrói uma
  torreta posta no raio; F2 — sai para a frente, reta, e explode no pavio (~1,5s); contato — um drone no caminho
  detona antes; o estoque cai 1 por bomba; `BOMBA.modo = 'panico'` (pela cena) traz a antiga de volta.
- **A `probe-bomba` antiga** roda no modo pânico (ela mede a limpeza dos tiros).
- **GIF na velocidade real** da queda na F1 e do arremesso no vácuo — ele avalia por GIF.
