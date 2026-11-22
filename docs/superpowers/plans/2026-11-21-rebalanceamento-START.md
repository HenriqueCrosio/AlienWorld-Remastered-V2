# START — O REBALANCEAMENTO (as cartas, os inimigos, os chefões)

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. O rebalanceamento abriu em 21/11 com a análise
> das cartas (§1) e as decisões dele (§2). A ordem das frentes está na §3; a primeira é a FRENTE 0 (as lutas dos
> chefões, §4). A Capitânia FECHOU (aprovada e empurrada). O GUARDIÃO está sendo refeito (22/11, a spec da coleira):
> a sessão abre no START próprio dele, `plans/2026-11-22-guardiao-coleira-START.md`. Cada frente tem spec, plano e o
> veredito dele antes da próxima."**
> A simulação do draft: `node --experimental-transform-types scripts/_rebalance/sim-draft.mts`; a medição da Capitânia
> (o molde para medir os outros chefões): `node scripts/_rebalance/medir-capitania.mjs [--mata ms] [--variante X]`.

## ▶️ Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status` (limpo, fora os vídeos, os GIFs e as pastas `q/`). Lembrar o
   **Ctrl+Shift+R**. Só subir o que for usar (a 5174 só se ele for jogar enquanto eu edito).
2. Dizer a ele onde paramos: a Capitânia aprovada; o Guardião no START próprio (`plans/2026-11-22-guardiao-coleira-START.md`);
   depois, a Besta (§4.3).
3. Treinos de chefão no menu (dev): `C` a Capitânia, `K` a F4 (o Guardião, depois a Besta).

## 1. A análise das cartas (21/11) — o diagnóstico

Lido o catálogo (`src/data/catalogoCartas.ts`), os números (`src/data/numerosCartas.ts`), o sorteio (`src/cartas.ts`) e
a aplicação em jogo (`src/systems/CartasEmJogo.ts`, `systems/cartas/*`); simuladas 50.000 campanhas das 7 mesas
(`scripts/_rebalance/sim-draft.mts`: um jogador que escolhe ao acaso e um que escolhe sempre a mais forte). As contas
de dano supõem que todo tiro acerta (o chefão é alvo grande). **Ainda não medido em jogo** — a frente 1 mede.

**A régua de hoje:** a arma base = 4,5 tiros/s × 1 de dano = **4,5 de dano por segundo**. Drone, batedor, kamikaze e
sonda têm **2 de vida** (a mesma da F1 à F4). As mesas: o meio da F1 · a Torre (garante incomum) · o meio da F2 · a
Capitânia (garante rara) · a aranha (garante incomum) · a Serpente (garante rara, épica a peso 12) · o Guardião
(garante rara). Pesos: comum 50, incomum 32, rara 14, épica 4.

| Chefão | O multiplicador de dano: ao acaso (mediana) | Escolhendo a mais forte (mediana · máximo) |
|---|---|---|
| Torre | ×1,0 | ×2,0 · ×3 |
| Capitânia | ×1,2–1,3 | ×3,0 · ×6,9 |
| Serpente | ×2,0 | ×4,0 · ×9,1 |
| Núcleo | ×2,6 | ×6,0 · ×9,1 |

**O que funciona (manter):** uma ideia por carta, efeito que se vê; as mesas no ritmo da campanha (o silêncio antes do
chefão e a conquista depois); o checkpoint da mão na entrada da fase (ninguém ganha carta morrendo); a defesa dentro
das 3 vidas (as vidas zeram a cada fase, o que segura a bola de neve); as cartas ativas por tecla (Míssil, Flare,
Dash); o reset da alien (o certo contra o incerto); o sandbox e os números num endereço só.

**Os problemas, do mais grave ao menos grave:**
1. **A arma se multiplica:** número de tiros (×2/×3) × Cadência (1,15³ = ×1,52) × Pesado (×2) = **×9,1** com 5 das 7
   cartas. Contra inimigos de 2 de vida, qualquer uma já sobra (o Pesado sozinho mata tudo com 1 tiro).
2. **Os inimigos nunca subiram:** os mesmos 2 de vida da F1 à F4. O ganho real das cartas é "agora mata com 1 tiro".
3. **A raridade não acompanha a força:** o Duplo, a Cadência e o Casco são comuns e estão entre as mais fortes; o
   Drone, épico, dá 0,8 de dano/s e não atira em chefão; o Míssil (~0,4/s) e o Flare (~0,25/s) são fracos.
4. **As cadeias de 3 estão mortas:** a elétrica (Elétrico → Arco → Sobrecarga) fecha em 0,1–0,5% das campanhas; o fogo
   até o Em Cadeia, em 0–0,2%. Só 55% das campanhas veem uma épica (0,7 oferecida por campanha).
5. **Os efeitos não valem contra chefão** (explosão, fogo, choque e drone só atingem o grupo de inimigos; no chefão só a
   arma, o míssil e o flare): quem escolhe bem converge sempre para a mesma mão (Cadência, Casco 80%, Triplo 78%,
   Pesado 74%). O draft tem resposta certa.
6. **O controle cresce com o volume de fogo:** os 20% do Elétrico são sorteados POR PROJÉTIL e cada choque renova a trava
   de 0,4 s. Tempo travado num alvo: base ~33% · Triplo ~70% · Triplo + 3 Cadências ~84%. O Pesado empurra ~32 px/s
   (a canhoneira anda a 40): junto, o inimigo fica pregado na borda. Os ELITES também travam (só a aranha é imune) — a
   frente B se desarma. É a causa do "Elétrico + Pesado roubados" de 04/10.
7. **O Casco é comum e chega perto da imortalidade:** um golpe absorvido a cada 8 s (5,5 com a Recarga).
8. **A estrutura do draft:** o Triplo por cima do Duplo joga fora uma escolha (30% de quem escolhe bem); sem rerrolar nem
   pular; 2,4 das 7 mesas sem nenhuma carta forte; a distância entre uma campanha de sorte e uma de azar é enorme
   (no Núcleo, ×2,6 contra ×9).
9. **Cartas de enchimento:** Propulsores (+12%), Bomba Extra, Flare, Drone e o Perfurante (parte de 1 de dano e cai a
   0,3) quase não mudam o jogo.

## 2. As decisões dele (21/11)

1. **Os inimigos ganham vida ao longo da campanha.**
2. **Os efeitos contam contra chefão, com efeito REDUZIDO.**
3. **A distância entre a melhor mão e a mediana:** analisar melhor; a vontade dele é **mais mesas por campanha** e a
   **REROLAGEM** da mesa (tentar a sorte com outras cartas, como em muitos jogos de cartas).
4. **Extra — mais inimigos:** ele sempre achou as fases (da F2 em diante; a F1 é flap) com poucos inimigos. Os
   **BATEDORES em ENXAMES maiores**, tomando quase toda a altura da tela, de cima a baixo: o jogador tem de matá-los
   para abrir uma passagem.
5. **Extra — reestruturar cartas:** *"o drone visualmente é legal, mas totalmente inútil, principalmente se os inimigos
   ganharem mais vida"*. Ele precisa de outro PAPEL, não de número maior (ideias: interceptar tiros, marcar alvos, copiar
   os efeitos da nave com metade da força).

## 3. A ordem das frentes

A regra dele, do roadmap: *balancear contra coisa provisória é pagar duas vezes*. Primeiro o que não muda, depois o que
se ajusta em cima.

| # | Frente | O que decide |
|---|---|---|
| **0** | **As lutas dos chefões** (§4) | O que o chefão FAZ: densidade, justiça, espaço de fuga, o sentido de cada ataque. Não mexe na vida. |
| **1** | **Os alvos e a medição** | O tempo de cada chefão e de cada onda para uma mão MEDIANA; a simulação como ferramenta; três mãos de referência no sandbox (fraca, mediana, forte). |
| **2** | **A estrutura do draft** | Quantas mesas por campanha, a rerrolagem (e o que ela custa), o peso maior para a continuação de uma cadeia. Define QUANTAS cartas uma campanha dá — o tamanho total do poder. |
| **3** | **Os inimigos** | A escada de vida F1 → F4 e os enxames de batedores (a parede que se abre atirando) da F2 em diante. |
| **4** | **As cartas** | O empilhamento da arma (soma, teto, Duplo → Triplo numa linha só), a raridade pela força, o rendimento decrescente do Elétrico (imunidade depois da trava; nos elites só interrompe o tiro, ou desfaz o escudo da Sentinela — a ideia adiada de 05/10), os efeitos reduzidos no chefão e as cartas refeitas (o Drone primeiro; depois Míssil, Flare, Propulsores, Bomba Extra, Perfurante). |
| **5** | **A vida dos chefões e ele jogando tudo** | O tempo de cada chefão ajustado à mão mediana (a vida da enguia entra aqui) e a campanha inteira jogada. |

Os enxames vêm ANTES dos números das cartas porque mudam o valor delas: dão trabalho ao Triplo, ao Perfurante, às
explosões e ao arco; pressionam sem precisar de mais tiro inimigo (a linha de "pressionar sem punir"); e tiram o
sentido de uma mão só de dano num alvo. Fora daqui, depois: a saída da aranha do casco, o som guardado, os créditos que
repetem (o 🧭).

## 4. A frente 0 — as lutas dos chefões

**A pergunta dele (21/11):** ajustar os chefões antes ou depois do rebalanceamento? **A resposta: as duas coisas, em
tempos diferentes.**
- **O que o chefão FAZ** (a densidade da fúria, o sentido do ataque, o espaço de fuga) vem **ANTES**: não depende do
  poder das cartas (a fúria cheia de minas machuca igual com qualquer mão), e, deixada para depois, contamina todo teste
  do rebalanceamento — quem morre na fúria não sabe se a mão era fraca ou a fúria injusta. E os alvos da frente 1 (a
  duração da luta) precisam do ritmo final de cada luta.
- **Quanto o chefão DURA** (a vida) vem **DEPOIS**, na frente 5: depende das cartas, é o último botão.
- ⚠️ **Os inimigos que o chefão solta** (os kamikazes da Capitânia, os drones do Núcleo) são inimigos comuns: quando a
  frente 3 subir a vida deles, a fúria da Capitânia fica mais dura sozinha. Proposta: o que o chefão solta MANTÉM a
  vida própria (o chefão é uma peça fechada, ajustada aqui) — decidir na frente 3.

**O escopo (ele):** nenhuma luta muda de estrutura — só visual, cadência e estilo. Os três pontos:
1. **A CAPITÂNIA (F2): a fúria.** *"é tranquilo até o momento do enfurecer; após isso, o campo fica repleto de minas
   explodindo, kamikazes etc."* — a densidade da fúria (os kamikazes, o flak que estoura em anel, as rajadas), a medir.
   **✅ 21/11 — a opção A no `src/` (a escolha dele), falta ele jogar no `C`.** A causa, medida
   (`scripts/_rebalance/medir-capitania.mjs`; a nave parada, cada kamikaze apagado 1,5 s depois de nascer): o ciclo da
   fúria era de 3,4 s e a 3ª cápsula saía 3 s depois das outras — já no ciclo seguinte —, e os 8 estilhaços cruzavam a
   tela por 3–4 s: a barragem de um ciclo caía na onda do outro e o silêncio sumia (18,8 ameaças na tela em média, 33
   no pico; na luta inteira, 4,8 e 11). **A opção A:** o ciclo da fúria em 4,0 s, a 3ª cápsula 0,9 s depois (no mesmo
   ciclo), 6 estilhaços que se apagam em 1,2 s (um estouro local) → 13,8 e 22, e ~1,6 s por ciclo sem tiro novo. A
   opção B (alternar kamikazes e flak por ciclo) deu 14,0 e 23; a onda da fúria a 3 tiros por bateria quase não mudou
   nada (não vale tirar). `BossCapitania.FLAK_RETARDATARIA_MS`/`ESTILHACOS`/`ESTILHACO_VIDA_MS`; a vida do estilhaço
   tem a marca `estilhaco`, que o `EnemySystem.release` apaga (o slot reciclado não morre por engano).
   **Ele jogou (21/11):** *"Ainda fica difícil, mas já melhorou muito"* — e pediu a 3ª cápsula também MAIS LENTA
   (*"assim dá mais respiro"*): o voo dela passou de 1,1–1,35 s para 1,7–1,85 s (`FLAK_VOO_RETARDATARIA`; ~35% mais
   devagar). Ela estoura ~0,2 s depois de o ciclo seguinte começar, antes da onda (0,5 s). Medido: 13,1 ameaças em
   média, pico 21; os estilhaços 3,9 (pico 12, eram 18).
   **Depois (21/11), ele: *"o grande problema, na verdade, são os kamikazes do estágio 2"*.** Medido: o kamikaze não
   abatido volta a caçar para sempre (o comportamento global dele, que FICA — ele vetou o combustível e o teto de
   caçadores); com 3 por ciclo, quem não abate vive no teto de 5. **A escolha dele: na fúria sai UM kamikaze por ciclo**
   (eram 3; a luta inteira segue com 2). Abatendo cada um em 3 s: 1,0 caçando em média (eram 2,6). Quem nunca abate
   ainda chega aos 5, mas em ~20 s, não em ~7.
   **✅ APROVADA (21/11), ele jogando:** *"Agora ficou melhor. Já está menos punitivo, vai cobrar algumas tentativas, mas
   dentro da normalidade"*. A Capitânia FECHOU (a vida dela fica para a frente 5).
2. **O GUARDIÃO (F4, a 1ª forma do Núcleo): a investida.** *"quase sem sentido, igual a enguia antigamente tinha"*. A
   lição da enguia (memória `criatura-inteira-vistas-animacao`): reclamação de movimento se resolve no CORPO e no CAMINHO
   apoiado no mundo, nunca só nos números — a investida precisa de uma razão que se lê. Spec da luta:
   `specs/2026-09-19-fase4-luta-guardiao-design.md`.

   **▶️ A OBSERVAÇÃO (21/11) — ONDE A PRÓXIMA SESSÃO ABRE.** Lido no código (`src/entities/BossNucleo.ts`,
   `updateGuardiao`) e na spec de 19/09, cruzado com o registro da serpente.

   **✅ 22/11 — A RESPOSTA DELE E O CAMINHO.** Nem A nem B: a ideia dele — *"os cabos que o prendem cheguem num limite
   e trave o guardião de avançar mais, dando um tranco nele. Como se fosse um cachorro raivoso [...] travado por uma
   coleira"*, e no tranco ele lança algo sobre a nave. Jogando, ele foi além (*"o guardião é praticamente inútil, a
   única mecanica é a serra e os tiros em leque sempre no mesmo lugar"*; *"é o boss final, justo ter uma luta mais
   longa"*): **a luta MUDA DE ESTRUTURA, por decisão dele** — a coleira, o leque de lava com vão, a salva mirada, os
   cabos-serpente (66%), o aperto e o teto que sangra (33%). Spec `specs/2026-11-22-guardiao-coleira-design.md`, em 6
   passos. **O passo 1 (o recorte, a corda, o tranco A) APROVADO; o passo 2 (o leque e a salva mirada) no `src/`,
   esperando o veredito.** O estado e o que vem: `plans/2026-11-22-guardiao-coleira-START.md`. O que segue abaixo é o
   registro da observação de 21/11:
   - **O Guardião só tem duas animações:** a respiração (`guardiao-idle`) e a morte. A investida inteira é feita com
     isso: (1) a CARGA de 1,15 s (`TELEGRAFO_DUR`) — a respiração acelera até 5×, o casco esfria (escurece), o miolo
     acende, um anel de partículas fecha nele; aos 0,62 s a mira TRAVA (`TELEG_TRAVA`) e ele recua um pouco; (2) a
     INVESTIDA — a **imagem inteira desliza** para a esquerda a 300 px/s, reta, até x = 70, levando junto os tubos que
     saem do corpo; (3) a VOLTA — a imagem inteira **desliza de volta** a 150 px/s, reta, até a estação. Durante a
     travessia o corpo fecha (`corpoInteiro`: o tiro morre no casco) e ela termina atrás da nave. O papel dela na luta,
     desde 19/09: empurrar o jogador para as bordas, onde a salva de glóbulos cobra.
   - **É o mesmo defeito da serpente em 29/10** (*"o corpo todo se move para frente num movimento [...] sem nenhum tipo
     de movimento convincente"*; *"Ficou a mesma coisa, só mudou a base e a distância da investida"*): o desenho parado
     andando pela tela. Lá a lição foi o corpo e o caminho apoiado no mundo (e no fim a investida saiu da serpente — ela
     NÃO é proposta aqui: ele quer a luta como está). O Guardião tem um apoio natural: **ele é preso por TUBOS que sobem
     para fora do quadro** (`public/sprites/guardiao.png`), e hoje os tubos viajam com ele como se não estivessem presos
     a nada.
   - **A PERGUNTA PENDENTE A ELE** (a resposta decide o caminho): o que mais incomoda no *"quase sem sentido"*?
     **A — o MOVIMENTO** (a imagem deslizando para lá e para cá, sem corpo nem apoio, como a serpente antiga): conserto
     em visual e estilo — a mesma investida, no mesmo tempo e com o mesmo papel, mas o corpo e os tubos contando a
     história (por exemplo, preso pelos tubos e solto como um PÊNDULO, puxado de volta por eles). **B — o PROPÓSITO**
     (ela atravessa, não faz nada, só obriga a desviar): pede uma consequência quando ela chega — já mexe um pouco na
     luta. **C — os dois.** **A recomendação: começar pela A** (cabe no "só visual, cadência e estilo" e ataca o mesmo
     defeito da serpente). Depois da resposta: 2–3 caminhos medidos e mostrados em GIF em jogo (memória
     `avaliar-skill-por-gif`), antes de mexer na arte.
3. **A BESTA (F4, a 2ª forma: o Predador): o bote.** *"quando corre e ataca a nave, pensei em dar um pouco mais espaço
   para escape da nave"*. O bote galopa pelo chão até a nave (`Predador.BOTE_VEL` = 300). Spec:
   `specs/2026-09-16-fatia7-b3-predador-design.md`.

A Torre (F1) e a Serpente (F3) ficam como estão, salvo pedido dele.

## As leis de sempre

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs, `q/`,
  `cru/` fora. A ordem: o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês.
- Enquanto ele joga, não editar `src/` nem `.html` (a cópia na 5174).
- Número de carta: medir no sandbox (`?sandbox`, painel M) antes de opinar.
