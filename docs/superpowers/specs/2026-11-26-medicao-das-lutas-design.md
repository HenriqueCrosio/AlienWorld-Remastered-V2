# A MEDIÇÃO DAS LUTAS — o registro, o canhão e o piloto

> 26/11. A frente 0 do rebalanceamento fecha medindo; a tabela que sai daqui é o ponto de partida da frente 1 (os
> alvos). START do rebalanceamento: `plans/2026-11-21-rebalanceamento-START.md`.

## 1. Por quê

Ele: *"precisamos focar seriamente no rebalance, começando pela medição das lutas"*. E: *"para ser algo mais
automatizado, o robô precisa avaliar primeiro. Depois eu vou entrar para sentir as mudanças"*.

Hoje só a Capitânia foi medida (`scripts/_rebalance/medir-capitania.mjs`), e só a DENSIDADE dela. Ninguém mediu quanto
uma luta dura nem quanto ela machuca. A régua de 21/11 é conta de papel (a arma base a 4,5 de dano por segundo, todo
tiro acertando). O Guardião (800 de vida) e a Besta (180) foram refeitos quase do zero em 22–26/11 e nunca foram
medidos: a revisão da Capitânia começou por ela estar *"apelona na fase de rage"*, e eles pedem a mesma revisão.

## 2. As decisões (as escolhas dele)

| Pergunta | A escolha |
|---|---|
| De onde vêm os números | **Os robôs primeiro**; ele joga depois, para sentir as mudanças |
| Que robô | **Os dois:** o canhão (o tempo mínimo) e o piloto (como uma pessoa boa) |
| O escopo | **A:** todos os chefões. A Capitânia primeiro (a régua), depois o Guardião e a Besta (o relatório e os ajustes), depois a Torre e a Serpente com a enguia |

Fora deste escopo: as ondas das fases (a frente 1 as mede), as metas de tempo (a frente 1 as decide), as mãos de
referência (a frente 1 as calibra; aqui valem as de hoje, `src/dev/maos.ts`), e o K sem cartas.

## 3. O registro da luta

Um módulo de DEV (`src/dev/registro/`), fora do build do jogador. Liga com `?registro` na URL (e os robôs o ligam).
Reaproveita a `Medidas` do sandbox (`src/systems/Medidas.ts`: o dano EFETIVO por fonte, já chamado pela cena) e soma:

- **As fases:** o `StageBoss.devFaseAtual` lido a cada quadro; cada troca fecha um trecho com o tempo dele.
- **A luta:** do chefão vulnerável (fim da entrada) até a morte dele.
- **Os tiros:** disparados (contados no `WeaponSystem`) e os que acertaram o chefão (`bulletHitBoss`, o corpo
  desenhado, os `targets`); a fração de acerto.
- **Os golpes na nave:** cada chamada do `damageShip` que passou (o casco das cartas conta à parte), com a CAUSA (cada
  ponto de chamada da cena diz a sua: `tiro`, `corpo`, `morde`, `perigo`, `inimigo`, `borda`, `chao`…), a fase, o
  ataque do chefão naquele momento (`StageBoss.devAtaque`, opcional: o estado do chefão; ausente = a fase) e onde a nave
  estava.
- **A densidade**, amostrada a cada 100 ms: as ameaças na tela (os tiros inimigos, os `perigos` do chefão, os inimigos
  soltos) e a **área negada** (a fração do campo de jogo a menos de 12 px de uma ameaça, a mesma régua do
  `medir-capitania`), por fase, em média e no pico; e o **respiro**, o maior intervalo sem ameaça nova.

Saída: `window.__registro.resumo()` (um JSON por luta) e, quando ele jogar, o mesmo resumo no console e numa tecla que
baixa o JSON. Nada aparece na tela do jogo.

## 4. Os robôs

Os dois são scripts Playwright (`scripts/_rebalance/robo/`) sobre o jogo rodando, entrando por
`?fase=<1ª fase do chefão>&mao=<mão>&registro`. Movem a nave pela posição do sprite, no máximo à velocidade dela
(`body.maxVelocity`, 110 px/s sem Propulsores), nunca por `body.reset`; atiram segurando a tecla de tiro de verdade.
Usam a bomba como uma pessoa usaria só se o relatório pedir (de início, não usam).

### 4.1 O canhão

A nave não toma dano (`invulnerableUntil`). Fica a uma distância fixa à esquerda do ponto fraco do momento, alinhada
com ele, e atira sem parar. O ponto fraco é o que o chefão expõe: os `targets` vivos, o `core`, ou o ponto mais à
esquerda do desenho que leva dano (`acertoNoCorpo`, `tocaDesenho`). Mede o **tempo mínimo** de cada fase com cada mão:
o teto do que a mão consegue.

### 4.2 O piloto

A nave toma dano de verdade. A cada quadro ele:
1. **Enxerga com atraso:** decide sobre o mundo como estava há `REACAO` ms (um buffer das ameaças: posição, caixa,
   velocidade). O valor sai da régua (§5); o ponto de partida é 250 ms.
2. **Prevê** cada ameaça em linha reta pela velocidade dela por 0,5 s (o que curva, a lava com peso, os teleguiados, o
   atraso cobre). As ameaças sem corpo entram pela função do chefão: o corpo pelo desenho (`tocaDesenho`), o que morde
   (`morde`), as bordas da fase (`moldura`, `cavernaMorde`).
3. **Escolhe** entre as posições que alcança em 0,5 s (uma grade em volta da nave) a que fica mais longe de toda
   ameaça prevista, com um peso para ficar alinhada com o ponto fraco e um peso para não ir atrás do chefão (a lei
   `nada-atras-da-nave`: a nave só atira para a frente).
4. **Atira** quando o ponto fraco está na linha dele.

As vidas: ele perde vida de verdade. Se a nave morre, a luta não acaba: o registro conta a morte, a vida volta e ele
segue até o chefão morrer (o objetivo é medir a luta inteira, não a sorte de uma partida).

O piloto que nasceu do coração parado (`scripts/_f4/_besta-coracao-humano.mjs`: reação de 0,8 s, caminho planejado nas
caixas de verdade) é a base da percepção; a diferença é que aquele lia um ataque, e este lê qualquer um.

## 5. A régua: a Capitânia

Antes de confiar no piloto, ele luta a Capitânia DE HOJE com a mão mediana. A régua é o veredito dele, depois dos
ajustes de 21/11: *"ainda fica difícil, mas já melhorou muito"* e *"vai cobrar algumas tentativas, mas dentro da
normalidade"*. A meta: **o piloto perde 1 a 2 vidas por luta, a maioria na fúria.** Nenhuma = a reação sobe; morre
sempre = desce. Feito isso, a `REACAO` trava e vale para todas as lutas. O canhão não precisa de régua (não desvia).

## 6. As rodadas e o relatório

Cada chefão × as três mãos (`nenhuma`, `mediana`, `forte`) × os dois robôs × 3 vezes (os sorteios das lutas). Uma
cópia do jogo na porta 5174 (memória `filmagem-vite-recarrega`: ele pode jogar na 5173 enquanto os robôs rodam), 4
navegadores em paralelo.

O relatório é uma folha (`folhas/<data>/medicao/`):
- a tabela por chefão e mão: o tempo de cada fase e da luta (canhão e piloto, a média e a faixa das 3), a fração de
  acerto, as vidas perdidas por fase e por ataque, a densidade e o respiro por fase;
- fotos dos golpes do piloto (o quadro do golpe e um meio segundo antes);
- as **marcas**: um ataque em que o piloto apanha em quase toda luta; uma fase em que o piloto leva ≥ 3× o tempo do
  canhão (luta de esquiva, a olhar); uma fase sem respiro (o maior intervalo sem ameaça nova < 1 s); uma mão em que uma
  fase passa em menos de 2 s (a fase some).

O robô aponta; **ele decide.** Toda mudança de luta que sair do relatório segue a regra de sempre: plano, folha, a
aprovação dele.

## 7. A ordem

1. O registro (§3) e o canhão (§4.1), conferidos na Capitânia.
2. O piloto (§4.2), ajustado na régua (§5).
3. O Guardião e a Besta: as rodadas, o relatório, e os ajustes que ele aprovar, um a um.
4. A Torre e a Serpente com a enguia: as rodadas, para fechar a tabela.

## 8. Os testes

- **O registro:** um teste em jogo que arma uma luta curta conhecida (a Besta com a vida baixa, golpes forçados) e
  confere as fases, os golpes com a causa certa, os tiros e o dano contra o que foi forçado.
- **O canhão:** mata cada chefão com cada mão sem travar (nenhuma luta fica sem fim: um teto de tempo por luta, e a luta
  que bate no teto é marcada, não somada).
- **O piloto:** no coração parado da Besta (o caso com o piloto antigo) chega ao bolso sem dano; parado (sem decidir),
  apanha — a prova de que ele enxerga.
- Nenhuma mudança no jogo do jogador: o `npm run build` não leva `src/dev/registro/` (como o resto de `src/dev/`).

## 9. Registro

- **26/11, a spec.** As três escolhas dele (os robôs primeiro, os dois, o escopo A). Ele: *"pode escrever a spec e já
  iniciar"*.
- **26/11, o passo 1 feito** (plano `plans/2026-11-26-medicao-passo1-registro-canhao.md`). O registro (`src/dev/registro/`,
  `?registro`; fora do build, conferido no `dist/`), a causa de cada golpe no `damageShip`, o `devAtaque` na Capitânia e
  no Núcleo; os testes `test-registro-contas.mjs` (puro) e `test-registro-jogo.mjs`. O canhão
  (`scripts/_rebalance/robo/canhao.mjs`) na Capitânia (vida 150):

  | Mão | Fase 1 | A fúria | A luta | Acerto | Ameaças na fúria (méd/pico) |
  |---|---|---|---|---|---|
  | nenhuma | 20,2 s | 21,2 s | 41,4 s | 84 % | 12,7 / 20 |
  | mediana | 7,2 s | 7,5 s | 14,7 s | 93 % | 10,5 / 17 |
  | forte | 1,9 s | 1,9 s | 3,8 s | 92 % | 8,8 / 14 |

  A densidade da fúria bate com a medição de 21/11 (13,1 de média com a nave parada): o registro mede o mesmo. Com a
  forte, a fúria dura menos de 2 s: é a frente 5 (a vida) e a 4 (as cartas), não a luta.
- **26/11, o passo 2: o piloto** (plano `plans/2026-11-26-medicao-passo2-piloto.md`, `scripts/_rebalance/robo/piloto.mjs`,
  o juntador `juntar.mjs`). A sanidade: parado (enxerga, não se move), a Capitânia com a mediana dá 35 golpes e 9
  mortes (30 de kamikaze); o piloto, 1–2. **A régua** (3 lutas por valor, mão mediana):

  | Reação | Vidas por luta | Onde |
  |---|---|---|
  | 250 ms | 0,7 (0–1) | a fúria |
  | **400 ms** | **2,0 (2–2)** | **a fúria** (estilhaços e kamikazes) |
  | 550 ms | 2,7 (2–4) | a fúria |

  ~~A reação trava em 400 ms.~~ **Refeito no mesmo dia**, depois da 1ª luta da F4 (o piloto perdia 9 vidas em 34 s de
  Guardião com a mão forte): a velocidade das ameaças passou a ser MEDIDA quadro a quadro (o bote e o golpe da Besta, a
  investida do Guardião andam por tween: velocidade física 0) e o piloto fica no FUNDO (x ≤ 90, como um jogador bom:
  o tiro mirado demora mais a chegar). O Guardião forte caiu para 1 vida. A régua de novo: 400 ms = 0,7 vida; **550 ms =
  1,0 (1–1), na fúria**; 700 ms = 2,3 (com mortes). **A reação trava em 550 ms.**
  Limites conhecidos: o piloto enxerga no escuro da Besta como no claro (uma pessoa não); e ele NÃO LÊ AVISOS (o
  agachar antes do golpe, a carga antes do bote): só desvia do que já se move.
- **26/11, o 1º achado da F4: o core da Besta quase não leva tiro.** O canhão (que não desvia) levou na fase 1 dela
  131 s com a mediana e 404 s sem cartas, com 2–4 % de acerto. Contado tiro a tiro (`_ver-besta1-tiros.mjs`, 40 s): no
  chão, na carga, no bote, no agachar e na RECUPERAÇÃO (a janela de dano ×2), 0 acertos e ~300 tiros absorvidos; só
  passam na sede (16) e no golpe (2). A causa: o acerto pelo desenho (25/11) faz o corpo DESENHADO na frente do core
  segurar o tiro (`bulletAbsorvedByBoss`), e o tiro só é do core a menos de 13 px do centro dele — o braço e o peito
  de lado ficam mais à frente. Decisão dele (a pergunta do relatório).
- **26/11, as decisões dele** sobre os achados:
  1. **O core da Besta: a A** (*"contando que fique justo e não mate ele rápido demais"*): o tiro na linha do core ACESO
     atravessa o desenho dela até o core (`StageBoss.naLinhaDoAlvo`, `Predador.naLinhaDoCore`, no processo do
     `overlap` do corpo na `GameScene`); fora dessa linha o desenho segue cobrindo. Os testes da sede, dos olhos e do
     golpe passam. Medido (1 luta por mão): a Besta inteira no canhão caiu de 501 / 219 / 119 s para **72 / 62 / 38 s**
     (nenhuma / mediana / forte) — ela não some: as travas seguram a vida até cada assinatura aparecer, e com ou sem
     cartas ela dura ~1 min (o Guardião: 197 / 84 / 34 s).
  2. **O piloto lê os avisos** (*"com certeza"*): `StageBoss.devAvisos(nave)` — a Besta (a faixa do galope na carga e
     no bote, a do golpe na altura tomada, do agachar ao golpe), o Guardião (a faixa da investida no telégrafo, a linha
     do bote de cada serpente na trava). Vistos com a mesma reação. Os golpes do corpo dela no piloto caíram de 18 para
     1–3 por luta.
  3. **O escuro fica como está** (o piloto enxerga no breu; marcado no relatório).
  4. **A régua: a linha mais fácil fica** (ele: *"o rage da capitânia ainda está bem difícil... desviar de estilhaço
     de flak, projéteis, kamikaze"*), e ele perguntou se não seria melhor um robô mais difícil para dados mais
     verdadeiros → **dois pilotos**: o **experiente** (550 ms, 1 vida na Capitânia) e o **comum** (700 ms, 2,3 vidas e
     mortes na fúria: o "bem difícil" dele). O relatório mostra a faixa entre os dois.
  - E: *"espere um pouco e commitamos depois"*.
- **26/11, o 2º achado (para a frente 5):** a F4 acerta o piloto experiente ~4 vezes por minuto, com ou sem cartas
  (sem cartas: 22 golpes em 303 s, 7 mortes; mediana: 11 em 160 s, o casco segurou 10). Sem cartas a luta dura 5 min:
  game over garantido.
- **26/11, a 1ª tabela** (`folhas/2026-11-26/medicao/folha.html`, gerada por `scripts/_rebalance/robo/folha.mjs`; o
  juntador `juntar.mjs`). Os robôs passaram a rodar numa CÓPIA do jogo (porta 5174, scripts congelados): um lote
  morreu porque a edição da Serpente recarregou o Vite no meio das lutas. **A F4 completa** (3 lutas × 3 mãos × 3
  robôs): com a mediana, o experiente perde 2,3 vidas e morre 0,7 vez por luta (o comum, 4,3 e 1,0) — a luta final
  mata o jogador bom em 2 de 3 lutas; a Besta concentra os golpes (a lava e o corpo); sem cartas são 5 min, 24 vidas.
  A Capitânia só tem 1 luta por mão, e a Torre e a Serpente não rodaram: o Claude Code encerrou os servidores e o
  lote por falta de memória na máquina (3 navegadores em paralelo + os dois Vite). A seguir, com 2 em paralelo.
- **Pronto para a Torre e a Serpente** (ainda sem rodar): o piloto no FLAP (55 px/s de lado, sobe 150, cai 220) e o
  aviso da varredura do raio (`Raio.devAvisos`, `BossSerpente.devAvisos`); as fotos dos golpes (`piloto.mjs --fotos`).
- **26/11, a folha-base do rebalanceamento** (`folhas/2026-11-26/medicao/folha.html` + `dados.json`; ele: *"monte a
  folha que vai servir como base de todos os dados para o rebalance"*). 108 lutas, 27 por chefão, um robô por vez
  numa cópia na 5174. No caminho: a contagem de tiros passou para a arma (`WeaponSystem.disparos`: na Torre a bala
  voltava à reserva no mesmo quadro e o acerto saía 1267 %); o fim da luta quando o chefão some (a enguia); e um erro
  meu no piloto (o tempo diagonal do flap aplicado ao voo livre) obrigou a refazer a Capitânia e a Serpente. A régua
  conferida em 10 lutas: experiente 550 ms = 1,8 vida na Capitânia mediana. O resumo (vidas do experiente, mediana):
  Torre 0 · Capitânia 1,7 · Serpente 1,0 · Guardião e Besta 2,3 (0,7 morte); sem cartas, impossível da Capitânia em
  diante; com a forte, a Torre e a Capitânia somem (4–5 s); a enguia tem piso de ~29 s.
- **27/11, fechado.** Ele: *"atualizar os docs, start, riscar o que já foi feito... commita e pusha tudo e iniciamos a
  próxima fase numa nova sessão"*. A próxima: a frente 1, os alvos (`plans/2026-11-27-rebalanceamento-frente1-START.md`).

