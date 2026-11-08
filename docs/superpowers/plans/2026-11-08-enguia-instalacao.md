# A enguia colossal no jogo (S2, Parte B passo 4) — plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou
> `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixas (`- [ ]`).
>
> A spec: `specs/2026-11-03-serpente-grande-enguia-design.md` (§7.4 é a instalação). O plano mãe:
> `plans/2026-11-07-serpente-grande-enguia.md` (a Parte B). O START: `plans/2026-11-08-enguia-instalacao-START.md`.
> A maquete aprovada (`scripts/_serpente/_enguia-maquete.mjs` + `scripts/_serpente/enguia/`) é o ORÁCULO do porte.

> **O ESTADO (08/11, fim): FEITO, APROVADO por ele jogando (*"aprovo da forma que está"*) e COMMITADO.**
> - **As tarefas:** as 1–12 foram feitas na mesma sessão. As caixas `- [ ]` abaixo não foram marcadas: o estado é esta
>   nota.
> - **O desvio do plano:** a Tarefa 9 mediu o porte idêntico acima do orçamento, e a escolha dele foi o worker (decisão
>   13).
> - **A Tarefa 7:** ganhou a terceira lona, a da luz somada.
> - **O passo 5 (a vida):** foi para o rebalanceamento (`docs/MAPA_TECNICO_BALANCEAMENTO.md`, apêndice 8).
> - **As decisões de gosto:** a taxa 30, a reta final até o posto e o Eco final repetido ficaram como estão.

**Objetivo:** trocar a forma `fusao` da luta da Serpente pela enguia colossal aprovada em maquete. Entram no jogo:
- o caminho, o roteiro e o corpo (a pele no cilindro, o dorso, as normais, as vistas do rolar);
- as 6 animações da cabeça e o `selaJunta`;
- os canos, o Eco e os gêiseres;
- os respiros e os 5 efeitos do pixelfx;
- as mordidas, a reta final e a morte no rombo.

O que aparece no jogo tem de ser o que ele aprovou na maquete, provado quadro a quadro.

**Arquitetura:**
- Cada arquivo da maquete vira um arquivo `.ts` em `src/entities/serpente/enguia/`, com o mesmo nome e a mesma lógica,
  tipado.
- Os módulos puros rodam no Node 24 (a remoção de tipos do Node) e são comparados com os `.mjs` da maquete: mesmas
  entradas, mesmas saídas.
- O desenho escreve num "alvo" abstrato:
  - `AlvoQuadro` repete o `put` da maquete sobre a foto da arena; o teste compara o md5 de cada quadro com o da maquete;
  - `AlvoLonas` reparte cada pixel entre duas lonas do jogo pela regra da S1b: o que cai sobre um pixel sólido dela (ou
    do lábio) vai para a lona de cima; o resto, para a de baixo, sob a nave.
- A arte é calculada no carregamento, a partir dos PNG aprovados, pelo MESMO código da maquete. O mapa 8× do RotSprite
  é calculado na hora, sem guardar a imagem inteira: guardá-lo custaria 376 MB, medido.
- O `BossSerpente` fica com a vida, a barra, o contrato `StageBoss` e a cena da fusão; a luta da enguia mora em
  `LutaEnguia`.

**Pilha:** Phaser 3.90 + TypeScript (Vite). Node 24 roda `.ts` direto (`node scripts/test-*.mjs`). As sondas usam
Playwright contra o `npm run dev` (porta 5173). `sharp` só nos scripts de Node.

## Restrições globais

Todas valem para todas as tarefas.

**Git:**
- **Nada de commit nem push sem o pedido dele.** Ele commita quando pedir, com autoria só dele e sem `Co-Authored-By`.
  Os passos de commit da skill viram "relatar os arquivos mudados".
- Nunca empurrar para o remoto `legacy`.
- Vídeos, GIFs, pastas `cru/` e `.env.pixellab` ficam fora do commit.

**Sondas e filmagens:** durante uma sonda ou filmagem, não editar `src/` nem `.html`: o Vite recarrega e a sonda morre.
O servidor fica em `:5173`. Se ele morrer, perguntar antes de reiniciar.

**Edição:** só com Edit/Write. `sed`, `node -e` e PowerShell sem `-Encoding utf8` corrompem os arquivos aqui (CRLF,
`${}`, acentos).

**Idioma:** a conversa com ele em pt-br; código, comentários e prompts em inglês; folhas e registros em pt-br.

**A maquete não é editada.** Ela é o oráculo: os testes a importam e comparam.

**A peça aprovada não se mexe:** a prova é o md5 de cada quadro, igual ao da maquete (`md5=1`).

**Os módulos puros** (os que o Node roda):
- nada de `enum`, `namespace` nem propriedade de parâmetro no construtor;
- os tipos entram com `import type`;
- os imports com a extensão `.ts`, como o resto de `src/entities/serpente/`.

**Leis do jogo:**
- **Física do vácuo:** no vácuo nada cai nem cede ao peso ([[fisica-do-lugar-nos-ataques]]).
- **Efeitos em pixel:** efeito se assa em pixel na resolução nativa.
- **A nave:** o jogo segue com a nave na profundidade 1, sob ela e sob o lábio, como na S1b.
- **Desempenho:** p95 ≤ 4 ms por quadro para a enguia inteira (a lógica + o desenho + o envio das lonas), spec §8.

## As regras de tradução (valem em todo porte)

- **T1. Literal.** A lógica é a da maquete, linha a linha:
  - os números, a ordem das contas e a ordem das chamadas aos dados (`rnd`, `sorte`, `rndG`, as `rng` dos efeitos);
  - um sorteio que a maquete faz e descarta continua sendo feito. Exemplo: o `nasceVapor` vazio da maquete 377–378,
    cujos argumentos sorteiam: a chamada continua e o sorteio também.
- **T2. As quantidades por quadro** (a maquete roda a 30 quadros/s, o jogo a ~60). Usar `porQuadro`/`chance` de
  `../numerosHab.ts`:
  - `rnd() < p` por quadro vira `rnd() < chance(p, dt)`;
  - uma contagem por quadro `n` vira `Math.round(n * porQuadro(dt))` (ou `floor(n * k + rnd())` onde a maquete já usa
    `floor`);
  - um teto por quadro (`contato.slice(0, 36)`) vira `Math.ceil(36 * porQuadro(dt))`.

  A `dt = 1/30` o porte é a maquete, bit a bit. O que a maquete já escreve com `dt` (`1 − 3·dt`, `min(1, dt·rapido)`,
  `Math.abs(t − tx) < dt/2`, `tm % 0.34 < dt`) fica como está.
- **T3. O tempo.** Tudo usa o tempo ABSOLUTO da luta da enguia (`t`, em s, 0 = o começo da pausa `fusao`), como a
  maquete. `LutaEnguia` guarda o `t` e soma `dt`.
- **T4. Os tipos.** Interfaces pequenas em `enguia/tipos.ts`. `any` é proibido. Cor é `readonly number[]` nas
  interfaces e escalares (r, g, b) no caminho quente do desenho (T6).
- **T5. O que NÃO entra:**
  - os modos de comparação da maquete: `corpo=blocos|aneis`, `rolagem=aneis`, `luz=0`, `respiros=0`, `pixelfx=0`,
    `gestos=0`, `girada=0`, `chegada=r4*`;
  - a cabeça cinza (`cabeca()` sem arte), o `tubo()` cinza, os ramos `!s.pfx` do fogo e das sementes;
  - a sonda `vaos`, as fotos, o vídeo;
  - o jogador de sonda (`jogador.mjs`): os testes o importam da maquete.
- **T6. O caminho quente do desenho** (só na Tarefa 9): a maquete aloca `[r, g, b]` a cada pixel. Na Tarefa 9 o porte
  troca por escalares e pula o que cai fora da tela. A regra é que o md5 de cada quadro continue igual.

## As decisões (com a recomendação; as de gosto vão a ele na mensagem)

1. **O pixelfx no TypeScript.** O `tsconfig` não tem `allowJs`. Os `.js` vão COPIADOS (não movidos: a maquete os
   importa) para `src/entities/serpente/enguia/pixelfx/`, com a licença. Ao lado vão `.d.ts` mínimos, só do que o
   `efeitos.ts` usa.

   Isso porque o TS resolve `./x.js` para `./x.d.ts`, o Vite serve o `.js`, o Node também, e o código de fora fica
   intacto. Os outros caminhos perdem:
   - portar para `.ts` mexe em 2.646 linhas de outro autor;
   - `allowJs` liga a checagem de JS no projeto inteiro.
2. **A arte no carregamento, não assada em arquivos.** O que se mediu:
   - `carregaArte` (138 ms) + `carregaGestos` (762 ms) em Node;
   - os PNG não têm nenhum pixel de alfa parcial e são sRGB sem perfil, então o canvas do navegador lê os mesmos bytes
     que o `sharp` (o pixel transparente vira 0,0,0,0 nos dois: a maquete nunca lê a cor de um pixel transparente, e o
     teste confere).

   Por isso o jogo carrega os PNG aprovados e roda o código da maquete.
3. **O mapa 8× calculado na hora** (`Ampliado`):
   - guarda os dois primeiros Scale2x (4×) de cada imagem, num `Int32Array`;
   - calcula o terceiro só no ponto pedido, a regra do Scale2x num pixel.

   O resultado é idêntico ao `amplia8` (teste exaustivo). A memória cai de 376 MB para ~16 KB × 16 por imagem. Os 4× das
   imagens da cabeça entram num cache de no máximo 64, e cada um é calculado em ~0,3 ms quando aparece.
4. **As lonas** (`AlvoLonas`): duas telas 384×216 (`cima` 36, `baixo` 0,9, os `HAB.profundidade` da S1b).
   - Um pixel dela (corpo, cabeça) ou do lábio é SÓLIDO e vai para `cima`.
   - Um efeito sobre um pixel sólido vai para `cima`, misturado exatamente como na maquete (o `sobre` sobre opaco é o
     `put`).
   - Um efeito sobre o vazio vai para `baixo`, sob a nave.
   - A ordem da maquete se mantém. O que ela pinta depois cobre o que pintou antes, inclusive a faixa de aviso sob o
     corpo dela.
5. **O pixelfx no vazio:** sobre o sólido, a composição é a da maquete (a cor + a luz somada). Sobre o vazio, vale o
   `composite` do próprio pixelfx sobre transparência: a luz vira cor com alfa, o que lê como soma sobre fundo escuro, e
   a arena é escura.

   Se a comparação lado a lado mostrar diferença, entra uma terceira lona aditiva (o `aditivoPuro` do `BossSerpente`).
   **Ver no vídeo.**
6. **O casco:** a lombada, a fissura e o tremor do rombo antes de ela sair já existem no jogo (`cascoVivo.ts`), com as
   mesmas fórmulas da maquete (conferido: `desloca`, o `fundo` 46, a fissura de 2 linhas, a cura de 2,5 s a partir da
   origem). No jogo a enguia os comanda pelo `cascoVivo` (`lombada`, `fissuras`).

   No `AlvoQuadro`, o desenho repete o da maquete (para o md5). O aviso verde dos gêiseres na fissura é da enguia, nos
   dois.
7. **O roteiro VIVO.** A maquete monta a luta inteira de uma vez, com as mordidas em horas marcadas. No jogo, a vida
   manda. O caminho é montado em blocos, cada um terminando numa pausa:

   | Bloco | Conteúdo | Quando é montado |
   |---|---|---|
   | C0 | a chegada + o posto 1 + a pausa dos canos | na hora da fusão |
   | C1 | o mergulho + a erguida + a pausa do Eco | no fim dos canos |
   | C2 | o afunda, o sob o casco e a volta até a `volta-borda` | no fim do Eco |
   | C3 | o posto seguinte + a pausa dos canos | no começo da `volta-borda` |

   O C3 só é montado ali porque a espiral do posto depende de quantos anéis ela ainda tem.

   A rolagem e os sinais são recalculados por bloco, de modo que, montados na ordem da maquete, os blocos dão EXATAMENTE
   o roteiro da maquete (teste).
8. **A vida e a reta final** (spec §6.2–6.4; os números de hoje: vida 120, `golpeMax` 1/3, `cabecaVale` 1,5):
   - **as mordidas:** a 22% e a 13%, a cauda (espera 2 dos 3 anéis à vista, a regra da maquete); a 5%, o crânio e a
     reta final;
   - **a vida no rombo:** fora da pausa do Eco com a reta final ligada, a vida não passa de 1. Na pausa do Eco com a
     reta final ligada, a vida chega a 0 e a morte começa (corta o Eco, as sementes somem, a regra da Capitânia);
   - **o caminho até o rombo** a partir dos 5%:
     - nos canos: o fogo apaga (`corte`) e ela mergulha;
     - no mergulho e na erguida: segue;
     - **na volta ao posto ou sob o casco (DECISÃO, de gosto):** ela termina o caminho até o posto e mergulha SEM os
       canos. A spec pedia meia-volta; uma meia-volta de um ponto qualquer pede geometria nova, que a maquete não
       provou;
   - **depois do último Eco:** se ela ainda vive, repete o Eco final até morrer.
9. **A fusão:**
   - a cena de hoje fica: ela afunda, o silêncio, os fios e os halos das três luzes;
   - o tempo 0 da enguia é o começo das luzes;
   - a implosão do pixelfx (aprovada) entra no lugar do `fusaoNucleo` e do `fx.implodeBig`;
   - a convergência passa a 0,8 s (a maquete);
   - o `detonar` (o cascalho, o pó, o choque, o clarão branco) cai no estalo da implosão (1,02 s), sem `vestirFase`;
   - a enguia sai do rombo aos 1,6 s (a pausa `fusao` da maquete).
10. **O dano começa no arco da chegada** (spec §6.1: tudo o que está desenhado e à vista leva dano). Na pausa `fusao` e
    na morte ela é imune.
11. **O contato** é o da maquete (`perigos`): os círculos do tubo a cada 10 px e os da cabeça, o fogo, os gêiseres e
    as explosões do Eco, medidos contra a caixa da nave pelo `morde` (sem corpo de arcade). **O tiro do jogador** é
    pelo desenho: o pixel que ela pintou neste quadro (corpo → 1×, cabeça → 1,5×, coberto pelo lábio → `casco`).
12. **A morte encenada:** o `StageBoss` ganha `morteAcabou?: boolean`. A enguia toca a própria morte (os 6,3 s da
    maquete) e, quando acaba, a cena fecha sem a cadeia de explosões nem o estouro final.

13. **(08/11, medido na Tarefa 9 — a escolha dele: o worker)** o porte idêntico custa 11 ms de mediana e 24 ms no p95
    por quadro no Node:
    - a fumaça grossa da raspada (até 5.400 partículas) responde por ~12 ms nos picos;
    - o fogo dos canos, por até 18 ms;
    - a pele, por 4–6 ms.

    O orçamento é 4 ms. A enguia (a `LutaEnguia` + o `quadro`) roda num **Web Worker**, e a linha principal só manda a
    nave, o tempo e os eventos da vida, recebe as lonas, a máscara do acerto e os perigos, e os envia ao Phaser. A
    taxa é ajustável:
    - `30` fixo: o ritmo do vídeo aprovado;
    - `auto`: 60 quando o quadro cabe, 30 nos picos.

    O toque e o tiro usam o desenho do último quadro pronto. Ele escolhe a taxa pelo vídeo lado a lado no jogo (Tarefa 11).

## Os arquivos

| Arquivo | O quê | De onde |
|---|---|---|
| `public/sprites/enguia/*.png` (novos, cópias) | a F1, a E3, as normais, os dorsos, os 63 quadros dos gestos + 6 `normais.png` | `folhas/2026-11-04/…/aprovada/`, `folhas/2026-11-07/enguia-{aneis,dorso,gestos}/` |
| `src/entities/serpente/enguia/arquivos.ts` | a lista dos PNG (chave → caminho) e as contagens dos gestos | novo |
| `…/enguia/tipos.ts` | `Img`, `Trecho`, `Estado`, `Roteiro`, `Med`, `Arte`, `Quadro`, `Pose` | novo |
| `…/enguia/numeros.ts` | `N`, `LCG`, as constantes da faixa (`ALTURA`, `CENTRO`, `PERIODO`, `CRANIO_X`, `FAIXA_X0`, `PESCOCO`, `JUNTA`, `SOBRE`) | `numeros.mjs` + `arte.mjs` 1–29 |
| `…/enguia/caminho.ts` | `Caminho`, `reamostra` | `caminho.mjs` |
| `…/enguia/canos.ts` | `faixaDe`, `sorteiaLivre`, `Canos`, `bocasDosCanos` | `canos.mjs` |
| `…/enguia/eco.ts` | `Trilha`, `espacaNoArco`, `Eco` | `eco.mjs` |
| `…/enguia/geiseres.ts` | `trilhaFissura`, `pontosGeiser`, `geiseresDoTrecho`, `lombada`, `fissuras` | `geiseres.mjs` |
| `…/enguia/perigos.ts` | `folga`, `perigos` | `perigos.mjs` |
| `…/enguia/corpo.ts` | `naToca`, `cabecaParaTela`, `telaParaCabeca`, `pose`, `poseCabeca`, `nAneisEm`, `tresDaCaudaVisiveis` | `corpo.mjs` |
| `…/enguia/roteiro.ts` | `duracaoEco`, `duracaoCanos`, `corteCanos`, `alcanceNoPosto`, `RoteiroVivo` | `roteiro.mjs` |
| `…/enguia/ampliado.ts` | `Ampliado` (o 8× na hora) | `arte.mjs` `amplia8`/`fonte8` |
| `…/enguia/medidas.ts` | `medidas(N, img)` | `medidas.mjs` |
| `…/enguia/arte.ts` | `faixaCorpo`, `carregaArte`, `vistasCabeca`, `carregaDorso`, `ajustaLuz`, `brilha`, `realce` | `arte.mjs` |
| `…/enguia/gestos.ts` | `carregaGestos`, `ECO`/`CANOS`/… e os `quadro*`/`chute*` | `gestos.mjs` |
| `…/enguia/respiros.ts` | `RAMPAS`, `estalosEntre`, `Respiros` | `respiros.mjs` |
| `…/enguia/pixelfx/**` (cópia + `.d.ts`) | o motor, MIT | `scripts/_serpente/enguia/pixelfx/` |
| `…/enguia/efeitos.ts` | `Camada`, `fogoCanos`, `semente`, `bolaDeFogo`, `implosaoFx`, `vaporFx` | `efeitos.mjs` |
| `…/enguia/alvos.ts` | `Alvo` (interface), `AlvoQuadro`, `AlvoLonas` | novo |
| `…/enguia/desenho.ts` | `preparaDesenho`, `quadro`, `pixelsDaCabeca`, `bocaNaTela`, `olhoNaTela`, `VENENO` | `desenho.mjs` |
| `…/enguia/luta.ts` | `LutaEnguia`: o laço da maquete 172–480 (sem a sonda), os eventos (`pedeMordida`, `mata`) | `_enguia-maquete.mjs` |
| `…/enguia/vida.ts` | `VidaEnguia`: os limiares, o piso de 1, quando pode morrer | novo |
| `…/enguia/fonte.ts` | `rgbaDaTextura` (navegador) e `normaliza` (o alfa 0 vira 0,0,0,0) | novo |
| `…/enguia/camadaEnguia.ts` | as duas lonas no Phaser (`CanvasTexture`) | novo, no molde do `camadaPixels.ts` |
| `…/enguia/emJogo.ts` | `EnguiaEmJogo`: a cola com o Phaser (o casco, o acerto, o `morde`, o desenho, o cache da arte) | novo |
| `src/entities/BossSerpente.ts` (muda) | a fase 4 vira a enguia; a fusão inicia a `LutaEnguia`; o dano e a vida da enguia | |
| `src/entities/Boss.ts` (muda) | `StageBoss.morteAcabou?` | |
| `src/scenes/GameScene.ts` (muda) | `killBoss` sem cadeia quando `morteAcabou`; o laço chama `killBoss` quando ela pede | |
| `src/scenes/BootScene.ts` (muda) | carrega `public/sprites/enguia/` | |
| `src/entities/serpente/atalho.ts` (muda) | `?serpente=fusao` abre a fusão já na chegada; `&vida=<pct>`, `&roteiro=maquete` | |
| `scripts/test-enguia-porte.mjs` (novo) | os oráculos dos módulos (uma seção por tarefa) | |
| `scripts/_serpente/_enguia-porte.mjs` (novo) | a luta inteira pelo porte, com o jogador da maquete: o JSON e o md5 de cada quadro | |
| `scripts/_serpente/_enguia-desempenho.mjs` (novo) | o tempo por quadro da enguia no Node (p50/p95 por capítulo) | |
| `scripts/_serpente/_sonda-enguia.mjs` (novo) | a sonda no jogo: o filme, o tempo por quadro, os toques | |

---

### Tarefa 1: Os PNG aprovados no jogo

**Arquivos:**
- Criar: `scripts/_serpente/_enguia-assets.mjs`, `src/entities/serpente/enguia/arquivos.ts`
- Mudar: `src/scenes/BootScene.ts` (a lista de imagens soltas, junto de `serpenteFusao`, linha ~639)
- Teste: o próprio script confere os md5 (origem = cópia)

**Interfaces:**
- Produz: `ARQUIVOS: Record<string, string>` (chave Phaser → caminho em `sprites/`), `GESTOS_N = { eco: 12, canos: 17,
  prepara: 9, nadar: 12, dor: 4, agonia: 9 }`, `chaveGesto(pasta, k)` e `chaveNormaisGesto(pasta)`.

- [ ] **Passo 1:** escrever `_enguia-assets.mjs`. Ele copia (`fs.copyFileSync`) e confere o md5 de origem e de destino:
  - de `docs/superpowers/folhas/2026-11-04/enguia-corpo/aprovada/`: `enguia-f1.png`, `cabeca-e3-pescoco.png`;
  - de `docs/superpowers/folhas/2026-11-07/enguia-aneis/`: `faixa-a-normal.png`, `faixa-b-normal.png`,
    `cabeca-normal.png`;
  - de `docs/superpowers/folhas/2026-11-07/enguia-dorso/`: `dorso-corpo.png`, `dorso-cabeca.png`;
  - de `docs/superpowers/folhas/2026-11-07/enguia-gestos/<pasta>/`: os `qNN.png` e o `normais.png`, nunca os de
    `original/`.

  O destino é `public/sprites/enguia/` (os gestos em `public/sprites/enguia/gestos/<pasta>/`). Ele imprime
  `copiados N, md5 iguais N`.
- [ ] **Passo 2:** rodar `node scripts/_serpente/_enguia-assets.mjs`. Esperado: `copiados 76, md5 iguais 76`.
- [ ] **Passo 3:** escrever o `arquivos.ts`:

```ts
/** THE EEL'S APPROVED ART in `public/sprites/enguia/` (copied by `_enguia-assets.mjs`), as Phaser keys → paths. */
export const GESTOS_N = { eco: 12, canos: 17, prepara: 9, nadar: 12, dor: 4, agonia: 9 } as const;
export type PastaGesto = keyof typeof GESTOS_N;
export const chaveGesto = (p: PastaGesto, k: number): string => `enguiaG_${p}_${k}`;
export const chaveNormaisGesto = (p: PastaGesto): string => `enguiaGN_${p}`;
export const ARQUIVOS: Record<string, string> = (() => {
  const a: Record<string, string> = {
    enguiaF1: 'sprites/enguia/enguia-f1.png',
    enguiaCabeca: 'sprites/enguia/cabeca-e3-pescoco.png',
    enguiaFaixaNA: 'sprites/enguia/faixa-a-normal.png',
    enguiaFaixaNB: 'sprites/enguia/faixa-b-normal.png',
    enguiaCabecaN: 'sprites/enguia/cabeca-normal.png',
    enguiaDorso: 'sprites/enguia/dorso-corpo.png',
    enguiaDorsoCabeca: 'sprites/enguia/dorso-cabeca.png',
  };
  for (const p of Object.keys(GESTOS_N) as PastaGesto[]) {
    for (let k = 0; k < GESTOS_N[p]; k++) a[chaveGesto(p, k)] = `sprites/enguia/gestos/${p}/q${String(k).padStart(2, '0')}.png`;
    a[chaveNormaisGesto(p)] = `sprites/enguia/gestos/${p}/normais.png`;
  }
  return a;
})();
```

- [ ] **Passo 4:** no `BootScene`, espalhar `...ARQUIVOS` no mesmo objeto de imagens soltas onde está
  `serpenteFusao: 'sprites/serpente-fusao.png'` (mesmo formato chave → caminho). Rodar `npx tsc --noEmit`. Esperado:
  sem erros.
- [ ] **Passo 5:** relatar os arquivos mudados.

### Tarefa 2: O pixelfx no src e os efeitos

**Arquivos:**
- Criar: a cópia de `scripts/_serpente/enguia/pixelfx/` inteira (com `LICENSE`, `NOTICE.md`, `ORIGEM.txt`) em
  `src/entities/serpente/enguia/pixelfx/`
- Criar: `src/entities/serpente/enguia/pixelfx/core/index.d.ts`, `pixelfx/fx/fire/_lib.d.ts`,
  `pixelfx/fx/explosions/implosion.d.ts`, `pixelfx/fx/nature/poison-cloud.d.ts`, `src/entities/serpente/enguia/efeitos.ts`
- Teste: `scripts/test-enguia-porte.mjs` (seção "efeitos")

**Interfaces:**
- Produz: `class Camada { f: Quadro; pintor(): Pintor; compoe(alvo: Alvo): void }`, onde `compoe` é definida na
  Tarefa 7. Nesta tarefa ela tem a forma da maquete, `compoe(out: Uint8Array | Uint8ClampedArray)`, e ganha
  `compoeEm(alvo)` na Tarefa 7.
- Produz: `fogoCanos(p, t, o)`, `semente(p, t, o)`, `bolaDeFogo(p, age, o)`, `implosaoFx(x, y): Fx`,
  `vaporFx(x, y, semente): Fx`, `VENENO_HEX`.

- [ ] **Passo 1:** copiar a pasta com `cp -r` (os bytes iguais; conferir com `diff -r`). O `NOTICE.md` da cópia ganha
  uma linha em inglês dizendo que é a mesma cópia da maquete, levada para o jogo.
- [ ] **Passo 2:** escrever os `.d.ts` só com o que o `efeitos.ts` importa:
  - `core/index.d.ts`: `createFrame`, `clearFrame`, `painterFor`, `composite`, `createFx`, `fit`, `hex`, `mix`,
    `WHITE`, `TAU`, `rng`, `loopNoise`, `clamp`, `noise2`;
  - `fire/_lib.d.ts`: `pnoise`, `hotFirst`, `firePuff`, `spark`, `smokePuff`;
  - `implosion.d.ts` e `poison-cloud.d.ts`: `export const meta: object; export function create(o: object): object;`
    (o `createFx` só os repassa).

  Os tipos: `Frame { w; h; ox; oy; color: Uint32Array; light: Uint32Array }`; `Painter` com os métodos usados (`place`,
  `px`, `circle`, `disc`, `glow`, `line`); `Fx { update(dt): void; draw(f: Frame, layer?: string): void; stop(): void;
  done(): boolean }`; `Rng { next(): number; range(a, b): number; sign(): number }`; cor = `number`.
- [ ] **Passo 3:** portar o `efeitos.mjs` para `efeitos.ts` (T1, T4). Os imports apontam para `./pixelfx/...js` (o TS
  acha o `.d.ts`).
- [ ] **Passo 4 (o teste):** a seção "efeitos" de `test-enguia-porte.mjs`. Para cada efeito:
  - pintar com a maquete e com o porte, num `createFrame(384, 216)` cada;
  - comparar `color` e `light` byte a byte;
  - os casos:
    - `fogoCanos` com `t` 0,1 / 0,4 / 0,7 e `frente` 0,3 / 1, `fim` 1 / 0,4;
    - `semente` com `k` 1 / 0,4;
    - `bolaDeFogo` com `age` 0,05 / 0,3 / 0,9;
    - `implosaoFx` e `vaporFx` rodados 40 passos de 1/30 com `draw` a cada 5.

  O teste começa assim (o padrão de todas as seções):

```js
import { pathToFileURL } from 'node:url';
let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };
const iguais = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const M = (p) => import(pathToFileURL(`scripts/_serpente/enguia/${p}`).href);
const P = (p) => import(pathToFileURL(`src/entities/serpente/enguia/${p}`).href);
const secoes = process.argv.slice(2); // (`node scripts/test-enguia-porte.mjs efeitos` runs one section)
const roda = (nome) => !secoes.length || secoes.includes(nome);
if (roda('efeitos')) {
  const em = await M('efeitos.mjs'), ep = await P('efeitos.ts');
  const fx = await M('pixelfx/core/index.js');
  for (const [t, frente, fim] of [[0.1, 0.3, 1], [0.4, 1, 1], [0.7, 1, 0.4]]) {
    const a = fx.createFrame(384, 216), b = fx.createFrame(384, 216), o = { x: 352, y: 27, meia: 26, alcance: 358, frente, fim, semente: 7 };
    em.fogoCanos(fx.painterFor(a), t, o); ep.fogoCanos(fx.painterFor(b), t, o);
    ok(iguais(a.color, b.color) && iguais(a.light, b.light), `fogoCanos t=${t} frente=${frente} fim=${fim}`);
  }
  // … semente, bolaDeFogo, implosaoFx, vaporFx in the same shape
}
// (every later task appends its section here)
console.log(falhas ? `${falhas} FALHA(S)` : 'tudo ok');
process.exit(falhas ? 1 : 0);
```

  ⚠️ O porte importa o pixelfx do `src/` e a maquete o dela: são dois módulos com o mesmo código. Os `Frame` são
  objetos simples, e o `painterFor` de qualquer um dos dois serve.
- [ ] **Passo 5:** rodar `node scripts/test-enguia-porte.mjs efeitos` (esperado: todos `ok`) e `npx tsc --noEmit`
  (esperado: sem erros).
- [ ] **Passo 6:** relatar os arquivos.

### Tarefa 3: O movimento puro (os números, o caminho, os canos, o Eco, os gêiseres, os perigos)

**Arquivos:**
- Criar: `src/entities/serpente/enguia/tipos.ts`, `numeros.ts`, `caminho.ts`, `canos.ts`, `eco.ts`, `geiseres.ts`,
  `perigos.ts`
- Teste: `scripts/test-enguia-porte.mjs` (seção "movimento")

**Interfaces** (produz; as de `tipos.ts`, usadas por todas as tarefas seguintes):

```ts
export interface Ponto { x: number; y: number }
export interface Img { data: Uint8Array | Uint8ClampedArray; w: number; h: number }
export interface Trecho {
  nome: string; cap: string; tipo: 'pausa' | 'move'; t0: number; t1: number; s0: number; s1: number;
  pos?: (tl: number) => number; recua?: boolean;
  hab?: 'fusao' | 'canos' | 'eco' | 'presa' | 'desfaz' | 'resto' | 'fim';
  ciclo?: number; final?: boolean; corte?: number | null; prepara?: boolean; emerge?: boolean; sob?: 'ida' | 'volta';
}
export interface Estado { s: number; trecho: Trecho; tl: number }
export interface Sinal { t0: number; t1: number; x: number }
/** what pose/perigos/respiros read of the choreography (the mock's montaRoteiro object and the port's RoteiroVivo) */
export interface Roteiro {
  caminho: { L: number; ponto(s: number): Ponto; rumo(s: number, d?: number): Ponto };
  trechos: Trecho[]; estado(t: number): Estado; rola(s: number): number; sinais: Sinal[]; T: number;
}
export interface Mordida { pct: number; tPedido: number; t: number; de?: number; ate?: number; cranio?: boolean }
export interface Geiser { x: number; ciclo?: number; via: 'ida' | 'volta'; tAviso: number; tColuna: number; tFim: number; tVapor: number }
// (and, filled in by Tasks 4–8: `Med`, `Arte`, `Vistas`, `QuadroGesto`, `Gestos`, `Pose`, `EstadoDesenho`)
```

- `numeros.ts`: `N` (o objeto da maquete `as const` não: tipado como `typeof` o literal), `LCG`, e as constantes da
  faixa.
- `caminho.ts`: `class Caminho { xs: number[]; ys: number[]; dir: [number, number] | null; L; fim(); junta(pontos,
  opc): [number, number]; ponto(s); rumo(s, d) }`, e `reamostra`.
- `canos.ts`, `eco.ts`: as classes e as funções da maquete, com os mesmos nomes e campos.
- `geiseres.ts`:
  - `trilhaFissura`, `pontosGeiser`, `lombada`, `fissuras`, iguais à maquete;
  - `geiseres(R, N)` vira `geiseresDoTrecho(R, N, tr)` (os de UM trecho `sob`, para o roteiro vivo), mais
    `geiseres(R, N)`, que junta os de todos (o teste usa).
- `perigos.ts`: `folga` e `perigos(M, t, P?)`, com `M: { R: Roteiro; N; med: Med; mord: Mordida[]; canos: Canos[];
  ecos: Eco[]; geis: Geiser[]; giro?: (t: number) => number }`. (`pose` vem da Tarefa 5; até lá, `perigos` recebe o
  `P` pronto e o teste passa o `P` da maquete.)

- [ ] **Passo 1:** portar cada `.mjs` (T1, T4). ⚠️ O `trilhaFissura` guarda um `memo` de módulo; o porte também.
- [ ] **Passo 2 (o teste):** a seção "movimento". Mesmas entradas, mesmas saídas:
  - **`Caminho`:** os pontos da chegada (a `ARCO_R4` da maquete e as pernas do `montaRoteiro`) juntados nos dois, com
    e sem `onda`; os `xs`/`ys` iguais (`===`) e o `ponto`/`rumo` iguais em 500 `s` sorteados;
  - **`sorteiaLivre`:** todas as combinações (n 0–2 × faixa 0–3) com 50 sorteios do mesmo `LCG(9)`;
  - **`Canos`:** `estado(t)` e `brasas(t)` iguais a cada 1/60 s de 0 a 12 s, com `atualiza` pela mesma nave (y
    oscilando), com e sem `corte`;
  - **`Eco`:** `atualiza` com a mesma `Trilha` (uma nave em círculo) e `estado`/`justica` iguais a cada 1/60 s, normal
    e final;
  - **`trilhaFissura` e `pontosGeiser`** iguais;
  - **`folga`:** 2.000 casos sorteados (círculo e retângulo) iguais.
- [ ] **Passo 3:** rodar `node scripts/test-enguia-porte.mjs movimento`. Esperado: tudo `ok`. `npx tsc --noEmit`.
- [ ] **Passo 4:** relatar os arquivos.

### Tarefa 4: A arte no carregamento (as medidas, a faixa, as normais, as vistas, os gestos, o 8× na hora)

**Arquivos:**
- Criar: `src/entities/serpente/enguia/ampliado.ts`, `medidas.ts`, `arte.ts`, `gestos.ts`, `fonte.ts`
- Teste: `scripts/test-enguia-porte.mjs` (seção "arte")

**Interfaces:**
- `fonte.ts`:
  - `normaliza(img: Img): Img` zera o RGB de todo pixel de alfa 0;
  - `rgbaDaTextura(scene: Phaser.Scene, chave: string): Img` desenha a fonte num canvas, `getImageData`, `normaliza`
    (`willReadFrequently`, `colorSpace: 'srgb'`);
  - `type Leitor = (nome: string) => Img` (os nomes são as chaves de `ARQUIVOS`).
- `ampliado.ts`:

```ts
/**
 * THE ROTSPRITE MAP WITHOUT THE 8× IMAGE: the mock's `amplia8` (Scale2x three times; the index of the source pixel each
 * 8× pixel copies) costs 64 Int32 per pixel — 376 MB for the eel's art. This keeps the 4× (two passes) and applies the
 * third pass only at the asked point: the same rule on the same neighbours, so `fonte(ax, ay)` = the mock's
 * `fonte8(amplia8(...), ax, ay)` for every position (the test checks every 8× pixel).
 */
export class Ampliado {
  readonly w: number; readonly h: number; // (the 8× size, as the mock's map reports it)
  private readonly idx4: Int32Array; private readonly w4: number; private readonly h4: number;
  constructor(private readonly rgba: ArrayLike<number>, w: number, h: number) { /* passes 1–2 of amplia8, verbatim */ }
  /** the mock's `fonte8`: the source pixel under an art position (float art px), −1 transparent */
  fonte(ax: number, ay: number): number {
    const X = Math.floor(ax * 8), Y = Math.floor(ay * 8);
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return -1;
    const x = X >> 1, y = Y >> 1, at = (xx: number, yy: number): number =>
      this.idx4[Math.min(this.h4 - 1, Math.max(0, yy)) * this.w4 + Math.min(this.w4 - 1, Math.max(0, xx))];
    const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    if (this.igual(C, B) || this.igual(A, D)) return P;
    const q = (Y & 1) * 2 + (X & 1); // e0 e1 / e2 e3
    if (q === 0) return this.igual(C, A) ? A : P;
    if (q === 1) return this.igual(A, B) ? B : P;
    if (q === 2) return this.igual(D, C) ? C : P;
    return this.igual(B, D) ? D : P;
  }
  private igual(a: number, b: number): boolean { /* the mock's `igual`, on `rgba` */ }
}
```

  (O `if (!igual(C, B) && !igual(A, D))` da maquete virou a forma negada; o teste exaustivo prova.)
- `medidas.ts`: `medidas(N, cabeca: Img, f1: Img): Med`, as contas da maquete sem o `sharp`.
- `arte.ts`:
  - `faixaCorpo(N, f1: Img)`, `carregaDorso(w, img: Img | null)`, `vistasCabeca(data, W, H, nC, dorsoCabeca: Img | null)`
    e `carregaArte(N, ler: Leitor): Arte`, onde cada `amplia8` vira `new Ampliado(...)`;
  - `brilha`, `realce`, `ajustaLuz` iguais;
  - `process.env.ENGUIA_*` sai (o padrão de cada um fica).
- `gestos.ts`: `carregaGestos(ler: Leitor, vistas: typeof vistasCabeca)`, que devolve `Record<PastaGesto, QuadroGesto[]>`
  (`QuadroGesto { k; data; w; h; oy; n: Float32Array; m8: Ampliado; boca: Ponto | null; vistas?: Vistas }`), mais as
  funções de tempo e as constantes (`ECO`, `CANOS`, `PREPARA`, `NADAR`, `MERGULHOS`, `MERGULHO`, `MORDIDA`, `PRESA`,
  `quadroEco`, `quadroCanos`, `quadroPrepara`, `quadroNadar`, `quadroMergulho`, `quadroMordida`, `chuteMordida`,
  `quadroPresa`, `chuteCanos`) literais.
- O cache dos 4×: o `Ampliado` de cada quadro de gesto e de cada vista é criado PREGUIÇOSO (getter `m8` que cria na
  primeira leitura). Um LRU de 64 em `gestos.ts` solta os mais velhos.

- [ ] **Passo 1:** portar (T1, T4).
- [ ] **Passo 2 (o teste):** a seção "arte". O leitor de Node lê `public/sprites/enguia/` com `sharp` e `normaliza`.
  Comparar com a maquete (que lê `docs/`):
  - **`Ampliado` vs `amplia8`, exaustivo:** para a E3, a faixa, o `eco/q06` e o `canos/q08`, em TODOS os pixels 8×,
    `fonte(X/8 + 1/16, Y/8 + 1/16) === idx[Y·w + X]`; mais 20.000 posições fracionárias sorteadas por imagem;
  - **`medidas`:** os campos numéricos iguais; `perfil`, `raio`, `raioU` iguais em todo `u` de −30 a 560;
  - **`carregaArte`:**
    - `faixa.data`/`topo`/`base`/`cols` iguais;
    - `nFaixa` igual (Float32, `===`), `luzFaixa`/`luzCabeca` iguais;
    - as 19 `vistas`: `data`, `n`, `n0` iguais;
    - `dorso`: `topo`, `meio`, `meia` iguais;
  - **`carregaGestos`:** cada quadro com `data`, `n` e `boca` iguais; as vistas de `eco[1..6]` iguais;
  - **as funções de tempo:** iguais num roteiro e em `Canos`/`Eco` da maquete, a cada 1/60 s.
- [ ] **Passo 3:** rodar `node scripts/test-enguia-porte.mjs arte`. Esperado: tudo `ok`. Anotar o tempo de
  `carregaArte` + `carregaGestos` do porte (o alvo: ≤ 1,5 s no Node).
- [ ] **Passo 4:** `npx tsc --noEmit`. Relatar os arquivos.

### Tarefa 5: O corpo e o roteiro vivo

**Arquivos:**
- Criar: `src/entities/serpente/enguia/corpo.ts`, `roteiro.ts`
- Teste: `scripts/test-enguia-porte.mjs` (seção "roteiro")

**Interfaces:**
- `corpo.ts`:
  - `naToca`, `cabecaParaTela`, `telaParaCabeca`, `nAneisEm`, `pose(R, N, med, t, { giro, treme, mord })` literais;
  - `poseCabeca(R, N, med, t, opc)` devolve só `{ e, cabeca }`, com as MESMAS contas da cabeça de `pose` (para as
    olhadas adiante: os estalos, o `podeRespirar`, a vista nos mergulhos);
  - `tresDaCaudaVisiveis(R, N, t, nAneis): boolean`: a regra de espera da maquete (`corpo.mjs` 20–29), 2 dos 3 anéis da
    ponta à vista e fora da toca.
- `roteiro.ts`: `duracaoEco`, `duracaoCanos`, `corteCanos`, `alcanceNoPosto` literais, mais:

```ts
export interface OpcoesVivo {
  /** the rings the post's coil is sized for, when C3 is built (the game: rings now − 3 × pending tail bites) */
  aneisNoPosto: (ciclo: number) => number;
}
/**
 * THE LIVE CHOREOGRAPHY: the mock's `montaRoteiro` cut into blocks that each end on a pause, appended as the fight
 * gets there — so the life, not a script, decides when she goes to her den. Appended in the mock's order, the blocks
 * give its path, its legs, its roll and its tells exactly (the test).
 *   chegada()            C0: the fusion pause, the arc, out by the bottom edge, the post (cycle 1), the pipes' pause
 *   mergulhoErguida(c, final)  C1: the draw-back, the dive, the hidden U-turn, the draw-back, the rise, the Echo's pause
 *   sobVolta(c)          C2: the draw-back, the sink, under the hull out and back, up hidden, the way back, the edge
 *   posto(c)             C3: the post (cycle c) and the pipes' pause
 *   ecoFinal()           another final Echo's pause where she stands (she is still alive after the last one)
 *   morte()              the death: back down her path, stuck, undone, the rest sinks, the end
 *   corta(t)             ends the running pause at t (the pipes cut at 5 %, the Echo cut by the death)
 */
export class RoteiroVivo implements Roteiro {
  readonly caminho: Caminho; readonly trechos: Trecho[] = []; readonly sinais: Sinal[] = []; T = 0;
  constructor(N: typeof NUM, med: Med, opc: OpcoesVivo);
  estado(t: number): Estado;   // the mock's binary search, on the blocks built so far
  rola(s: number): number;     // the mock's `rola`, on the incremental roll
  chegada(): void; mergulhoErguida(c: number, final: boolean): void; sobVolta(c: number): void; posto(c: number): void;
  ecoFinal(): void; morte(): void; corta(t: number): void;
  /** the leg/pause running at t is the last one built (the fight must build the next block) */
  noFim(t: number): boolean;
}
```

- A ROLAGEM incremental: guarda `lado: Uint8Array` e `rolagem: Float32Array` (que crescem). Depois de cada `junta`:
  - refaz `lado` de trás para frente, do novo `L` até o novo `s0`, com `m` começando em 0 (como a maquete no fim do
    caminho), e segue para trás no trecho velho enquanto o `|rumo.x| ≤ 0,66` (o trecho indeciso que pegava o lado do
    próximo decidido);
  - refaz a `rolagem` (a janela de ±40) de `(primeiro mudado − 41)` até `L`.
- OS SINAIS: a varredura da maquete (`roteiro.mjs` 229–239) feita só nos trechos novos com `emerge`.
- O `corta(t)`: o trecho em curso é uma pausa; `t1 = t`, `T = t`, e o próximo bloco começa em `t`.

- [ ] **Passo 1:** portar `corpo.mjs` (T1) e escrever `poseCabeca` copiando as linhas da cabeça de `pose`.
- [ ] **Passo 2:** escrever o `RoteiroVivo`. Os blocos são os pedaços de `montaRoteiro` (`roteiro.mjs` 150–216), com
  as mesmas chamadas `move`/`pausa`/`prepara`/`recua`, na mesma ordem.
- [ ] **Passo 3 (o teste):** a seção "roteiro".
  - **(a) A composição da maquete:** `chegada(); for c in 1..2: mergulhoErguida(c,false), sobVolta(c), posto(c+1);
    mergulhoErguida(3, true)`, com o `corta` dos canos do ciclo 3 em `t0 + corteCanos + 0,3`, e depois `morte()`, com
    `aneisNoPosto = (c) => 20 − 3·min(c − 1, 2)` (o da maquete). Comparar com `montaRoteiro(N, med)`:
    - `caminho.xs`/`ys` iguais (`===`);
    - cada trecho com `nome`, `t0`, `t1`, `s0`, `s1` iguais (até 1e-9);
    - `rola(q)` igual em todo `q` inteiro;
    - os `sinais` iguais;
    - `estado(t)` igual a cada 1/240 s de 0 a `T`.

    ⚠️ Os blocos são montados quando a luta chega a eles: o teste chama cada um no `t` em que o anterior acaba.
  - **(b) `pose` e `poseCabeca`:** iguais à maquete em 300 `t` da luta (todos os campos; o `tubo` inteiro).
  - **(c) O corte:** um roteiro com `corta` nos canos do ciclo 1 em 3,0 s depois do começo. O `mergulhoErguida` seguinte
    começa em `t0 + 3,0` e o caminho é o mesmo do ciclo 1 sem corte (só os tempos andam).
  - **(d) O Eco final repetido e a morte cortando o Eco** no meio: os trechos encadeados sem buraco nem sobreposição
    (`t1` de um = `t0` do próximo).
  - **(e) `tresDaCaudaVisiveis`:** dá a mesma hora de mordida que a `mordidas()` da maquete para a 22% e a 13%.
- [ ] **Passo 4:** rodar `node scripts/test-enguia-porte.mjs roteiro`. Esperado: tudo `ok`. `npx tsc --noEmit`.
- [ ] **Passo 5:** relatar os arquivos.

### Tarefa 6: Os respiros

**Arquivos:**
- Criar: `src/entities/serpente/enguia/respiros.ts`
- Teste: seção "respiros"

**Interfaces:**
- `estalosEntre(R, N, med, mord, t0, t1): { t0; t1 }[]`: o `estalosDaCabeca` da maquete, na faixa [t0, t1), com
  `poseCabeca`. O laço de 1/30 começa em `t0` alinhado à grade `k/30`, como a maquete.
- `class Respiros`:
  - `constructor(R, N, med, { girada = true })`;
  - `juntaEstalos(lista)`, que o roteiro vivo chama a cada bloco novo com os estalos do bloco;
  - `passo(t, dt, P, nAneis)`, `luz(u)`, `envelope(j)`, `desenha(alvo)`.
- O que muda em relação à maquete:
  - `mord` sai do construtor: os estalos vêm de fora e o `nAneis` vem no `passo`;
  - as chances e as contagens por quadro seguem a T2.

- [ ] **Passo 1:** portar (T1, T2, T4).
- [ ] **Passo 2 (o teste):** a seção "respiros".
  - **Os estalos:** `estalosEntre` sobre o roteiro da maquete, bloco a bloco (os mesmos limites da Tarefa 5), juntados,
    iguais a `estalosDaCabeca` da maquete. ⚠️ Um estalo que cruza o limite de dois blocos: as duas metades se juntam
    pela regra `t − a.t1 < 0,2`. O teste prova que juntar os blocos dá a lista inteira; se não der, o `estalosEntre`
    varre 0,3 s além do fim do bloco e o `juntaEstalos` funde.
  - **O passo:** com o roteiro e as mordidas da maquete, rodar `Respiros` da maquete e do porte lado a lado por toda a
    luta (dt 1/30, a mesma `pose`). Os `jatos`, `gas` e `fluxo` iguais (todos os campos) a cada quadro, e o `luz(u)`
    igual em u = −30…560.
  - **O desenho:** a cada 30 quadros, `desenha(put)` gravando as chamadas `(x, y, c, a)` nos dois; as listas iguais.
- [ ] **Passo 3:** rodar `node scripts/test-enguia-porte.mjs respiros`. Esperado: tudo `ok`.
- [ ] **Passo 4:** relatar os arquivos.

### Tarefa 7: O desenho e os dois alvos

**Arquivos:**
- Criar: `src/entities/serpente/enguia/alvos.ts`, `desenho.ts`
- Mudar: `efeitos.ts` (o `Camada.compoeEm(alvo)`)
- Teste: seção "desenho"

**Interfaces:**

```ts
/** where the eel's frame is drawn: the mock's opaque frame (the oracle) or the game's two canvases */
export interface Alvo {
  readonly W: number; readonly H: number;
  /** the mock's blend at (x, y) rounded; `solido` marks a pixel of hers (skin, skull, the seal's fill) */
  put(x: number, y: number, r: number, g: number, b: number, a: number, solido: boolean): void;
  /** the breach lip's pixel i (opaque) — the mock restores the arena photo there */
  labio(i: number): void;
  /** the colour now at pixel i (for the seal's darker-neighbour pick and the pixelfx composite over her) */
  cor(i: number): number; // 0xRRGGBB
  /** is pixel i solid (hers or the lip's) this frame */
  solido(i: number): boolean;
  /** the pixelfx frame laid over (colour + additive light): exact over a solid pixel, over-transparency elsewhere */
  compoeFx(f: { color: Uint32Array; light: Uint32Array }): void;
  /** a new frame */
  limpa(): void;
}
export class AlvoQuadro implements Alvo { constructor(fundo: Uint8Array); readonly out: Uint8Array; /* … */ }
export class AlvoLonas implements Alvo { readonly cima: Uint8ClampedArray; readonly baixo: Uint8ClampedArray; readonly mascara: Uint8Array; /* 1 corpo, 2 cabeça, 3 coberto pelo lábio */ /* … */ }
```

- **`AlvoQuadro`:** `out` começa como cópia do `fundo` (a foto da arena). O `put` é o da maquete
  (`desenho.mjs` 264–269), com `a >= 1` substituindo. O `labio(i)` copia o `fundo`. O `compoeFx` é o `Camada.compoe`
  da maquete com `bg = out`. **É a maquete, bit a bit.**
- **`AlvoLonas`:**
  - `put` com `solido` ou sobre um pixel já sólido (`marca[i]`) vai para `cima` com a mistura da maquete. Sobre opaco é
    a mesma conta e o mesmo `Math.round`; um `put` sólido marca `marca[i] = 1` e escreve `cima` opaco.
  - O resto vai para `baixo`, pelo `sobre` de `pixels.ts`.
  - `labio(i)` escreve a cor da textura do lábio, opaca, em `cima`, e marca.
  - `compoeFx`: nos pixels sólidos, a conta da maquete com `bg = cima[i]`; nos outros, a do `composite(f, …, null)`
    (sobre transparência) misturada em `baixo` pelo `sobre`.
  - `limpa` zera só a caixa suja do quadro anterior.
  - A `mascara` (para o acerto do tiro) é escrita pelo desenho: corpo fora da toca 1, cabeça 2. Um pixel dela coberto
    pelo lábio fica 3 (o lábio pinta por cima do que estava na toca).
- **`desenho.ts`:** o `quadro(D, s)` da maquete vira `quadro(D, s, alvo)`:
  - toda escrita passa pelo `alvo.put` (o `putB` com `solido = true`);
  - o `bicho` vira `alvo.solido`;
  - o restauro do lábio, `alvo.labio(i)` dentro da caixa do lábio (o mesmo resultado; a maquete varre W·H);
  - o `out[j*4]` lido no `selaJunta`, `alvo.cor(j)`;
  - o `s.pfx.camada.compoe(out)`, `alvo.compoeFx(camada.f)`;
  - a seção 1 (a lombada, a fissura, o tremor do rombo) só roda com `s.cascoProprio` (o `AlvoQuadro` liga; o jogo usa
    o `cascoVivo`, decisão 6). O aviso verde dos gêiseres (desenho.mjs 360–369) roda sempre;
  - o passo 8 (a nave e os tiros da maquete) NÃO entra no `quadro`: o teste o desenha depois, no `AlvoQuadro`.
- **`preparaDesenho(N, med, { fundo, labio })`:** sem `sharp`. O `fundo` (a foto) é opcional: o jogo não tem. O lábio
  é o `Img` da textura `serpenteRomboLabio`, posto em `N.rombo.labio`.

- [ ] **Passo 1:** escrever `alvos.ts` e portar `desenho.mjs` (T1, T4, T5).
- [ ] **Passo 2 (o teste):** a seção "desenho".
  - Montar, com os módulos da maquete, o `s` de 40 instantes da luta (os `momentos` da maquete 100–131, mais 20 sorteados):
    - a `pose` com o `gesto` e o `giro` que a maquete escolheria (reproduzidos com as funções de tempo, `giro` 0);
    - os canos, o Eco, os gêiseres, a lombada, as fissuras, os sinais;
    - `particulas: []`, `respiros: null`, `pfx` com uma `Camada` nova e `vivos: []`.
  - Desenhar com a maquete (`quadro(D, s)`) e com o porte num `AlvoQuadro` sobre a mesma foto (`s.cascoProprio = true`).
    O md5 é igual em todos.
  - **O `AlvoLonas`:** para os mesmos 40, compor `baixo` sobre a foto (o `sobre`) e depois `cima` sobre o resultado.
    Esperado:
    - todo pixel a no máximo 1 de diferença por canal;
    - os pixels sólidos idênticos;
    - a `mascara` = os pixels onde o porte desenhou corpo ou cabeça.
  - Contar, nos dois, quantos pixels diferem (deve ser só nas misturas sobre o vazio).
- [ ] **Passo 3:** rodar `node scripts/test-enguia-porte.mjs desenho`. Esperado: tudo `ok`.
- [ ] **Passo 4:** `npx tsc --noEmit`. Relatar os arquivos.

### Tarefa 8: A luta inteira (`LutaEnguia`) e o oráculo da luta

**Arquivos:**
- Criar: `src/entities/serpente/enguia/luta.ts`, `vida.ts`, `scripts/_serpente/_enguia-porte.mjs`
- Teste: o `_enguia-porte.mjs` contra uma rodada nova da maquete (`desvia` com `md5=1`)

**Interfaces:**

```ts
export interface EventosRoteiro {
  /** `maquete`: the mock's script (the oracle, `?roteiro=maquete`) — the bites asked at its times; the life ignored */
  modo: 'vida' | 'maquete';
}
export class LutaEnguia {
  t = 0;
  readonly R: RoteiroVivo; readonly mord: Mordida[]; readonly canos: Canos[]; readonly ecos: Eco[]; readonly geis: Geiser[];
  constructor(arte: Arte, gestos: Gestos, med: Med, opc: { sementes: { rnd: number; sorte: number }; modo: 'vida' | 'maquete' });
  /** the mock 172–301: the blocks, the skills, the head's gesture and turn, the Echo, the scrape, the tell */
  antes(dt: number): void;
  /** the ship this frame (the Echo's trail; the mock 304) */
  grava(x: number, y: number): void;
  /** what hurts the ship now (the mock 308–321): any clearance < 0 */
  fere(caixa: { x0: number; y0: number; x1: number; y1: number }): boolean;
  /** the mock's hit spark (the oracle's shots only — the game has its own) */
  faisca(x: number, y: number): void;
  /** the mock 337–459: the breathers, the bites, the skull, the geysers' looks, the death, the fusion, the particles */
  depois(dt: number): void;
  /** the frame's state for `quadro` (the mock 462–480) */
  cena(): EstadoDesenho;
  /** a bite asked (22 / 13 → the tail when it shows; 5 → the skull and the final stretch), at time `t` (default now) */
  pedeMordida(pct: 22 | 13 | 5, t?: number): void;
  /** the life reached 0 in the den: the death starts at `t` (default now) */
  mata(t?: number): void;
  /** where she stands, for the game (the den or not, the Echo's pause with the final stretch on, dead or done) */
  get noRombo(): boolean; get podeMorrer(): boolean; get morrendo(): boolean; get acabou(): boolean; get imune(): boolean;
  /** the Echo's pause, the pipes' pause … (the boss bar's heart, the debug) */
  get trecho(): Trecho;
}
```

- **A montagem dos blocos**, no `antes`: quando `R.noFim(t)` e o trecho em curso acaba neste passo, a luta monta o
  próximo:

  | Fim de | Monta |
  |---|---|
  | canos | `mergulhoErguida(c, final)` |
  | eco (sem reta final) | `sobVolta(c)` |
  | eco (com reta final, vivo) | `ecoFinal()` |
  | começo da `volta-borda` | `posto(c + 1)`, ou, com a reta final ligada, `posto(c + 1)` + `mergulhoErguida(c + 1, true)` sem a pausa dos canos (decisão 8) |

  Os estalos de cada bloco novo vão para os `Respiros`, e os gêiseres de cada trecho `sob` para `geis`.
- **`pedeMordida(5)`:**
  - nos canos, chama `R.corta(t + 0,3)` e marca o `corte` do `Canos` (`rel` agora);
  - liga a reta final e marca o crânio (`cranio.t = t`, o gesto e o tranco da maquete).
- **`mata`:** só vale na pausa do Eco com a reta final. Chama `R.corta(t)` e `R.morte()` e solta as sementes.
- **`vida.ts`:**

```ts
/**
 * THE EEL'S LIFE RULES (spec §6.2–6.4): the bites at 22 / 13 / 5 % of HER life, the floor of 1 everywhere but the Echo's
 * pause of the final stretch, and the death at 0 there. Pure: the boss feeds the hits, the fight answers where she is.
 */
export class VidaEnguia {
  constructor(readonly max: number);
  hp: number;
  /** a hit; returns the bites it crossed and whether she died */
  fere(dano: number, ondeEsta: { podeMorrer: boolean; imune: boolean }): { mordidas: (22 | 13 | 5)[]; morreu: boolean };
}
```

- **`_enguia-porte.mjs <desvia|parado> <dir>`:** o laço da maquete (`_enguia-maquete.mjs` 172–496) trocado pelo porte:
  - a cada passo de 1/30: `luta.antes(dt)`, o `Jogador` da maquete (`jog.passo(t, dt, M)`, com
    `M = { R: luta.R, N, med, mord: luta.mord, canos: luta.canos, ecos: luta.ecos, geis: luta.geis, giro }`),
    `luta.grava(jog.x, jog.y)`, os tiros da maquete 305 e 323–334 (com `luta.faisca` no acerto),
    `luta.fere(caixa da nave)`, `luta.depois(dt)`;
  - o quadro: `quadro(D, luta.cena(), alvoQuadro)` + a nave e os tiros da maquete 589–590;
  - os eventos no tempo da maquete (o modo `maquete`):
    - a 22% em `volta(1).t0`;
    - a 13% em `mergulho(2).t0 + 1,0`;
    - a 5% em `canos(3).t0 + corteCanos`;
    - `mata` no fim do Eco final.
  - Grava o JSON da maquete (os mesmos campos, 500–520) e o `md5.txt`.
- [ ] **Passo 1:** escrever `vida.ts` e um teste curto (seção "vida"):
  - os limiares disparam uma vez cada, na ordem;
  - o piso 1 fora do rombo;
  - o 0 na pausa do Eco final;
  - a bomba de 12 que cruza dois limiares dá as duas mordidas.
- [ ] **Passo 2:** escrever `luta.ts` (T1, T2, T3). O laço da maquete, na ordem, partido em `antes`/`grava`/`fere`/
  `faisca`/`depois` nos pontos onde a sonda entra. Os dados: `rnd = LCG(sementes.rnd)` (os canos),
  `sorte = LCG(sementes.sorte)` (a aparência); no oráculo, 20261107 e 5.
- [ ] **Passo 3:** escrever o `_enguia-porte.mjs`.
- [ ] **Passo 4 (a prova):**
  - rodar a maquete: `node scripts/_serpente/_enguia-maquete.mjs desvia <dir-m> corpo=pele md5=1`;
  - rodar o porte: `node scripts/_serpente/_enguia-porte.mjs desvia <dir-p>`;
  - esperado:
    - o JSON igual campo a campo (os capítulos, os toques 0, os acertos 404 corpo / 48 cabeça, as margens dos canos, a
      justiça do Eco, as mordidas, os gêiseres, os anéis);
    - o `md5.txt` igual linha a linha (os ~3.300 quadros).
  - O primeiro quadro diferente, se houver, é o ponto de partida da depuração (`superpowers:systematic-debugging`).
- [ ] **Passo 5:** o mesmo para `parado`.
- [ ] **Passo 6:** `npx tsc --noEmit`, `node scripts/test-enguia-porte.mjs`. Relatar os arquivos.

### Tarefa 9: O desempenho (com o md5 intacto)

**Arquivos:**
- Criar: `scripts/_serpente/_enguia-desempenho.mjs`
- Mudar: `desenho.ts`, `alvos.ts`, `luta.ts`, `respiros.ts` (só o caminho quente)

- [ ] **Passo 1:** escrever o `_enguia-desempenho.mjs`. Ele roda a luta pelo porte num `AlvoLonas`, a 60 quadros/s
  (dt 1/60, o jogador `desvia` da maquete), e mede por quadro o `antes` + `depois` + `quadro`. Imprime p50/p95/máx por
  capítulo e no total.
- [ ] **Passo 2:** medir a linha de base. Esperado, pelos 5,6–10,9 ms do `quadro` da maquete no Node: acima de 4 ms.
- [ ] **Passo 3:** otimizar, uma mudança por vez, rodando o `_enguia-porte.mjs desvia` depois de cada uma (o md5 tem
  de seguir igual):
  1. **pular o que cai fora da tela:** no corpo, a amostra do tubo cujo disco (±40) está fora; na cabeça, o laço de
     ±70 recortado à tela;
  2. **sem alocação:** o `put` com escalares (já na interface), o `pinta` sem arrays, a `D.mascara` reaproveitada, o
     `[r, g, b]` dos efeitos em constantes;
  3. **o `podeRespirar` e a vista dos mergulhos com `poseCabeca`;**
  4. **o `realce` com as constantes do ajuste fora do laço,** e o `brilha` uma vez por pixel de fonte (um `Uint8Array`
     pré-calculado por imagem).
- [ ] **Passo 4:** medir de novo.
  - **Se o p95 ≤ 3 ms** no Node (a folga para o envio das lonas, ~0,5–1 ms): seguir.
  - **Senão, PARAR e levar a ele**, com vídeo das duas opções:
    - (a) a enguia redesenhada a 30 Hz (o jogo a 60);
    - (b) a pele com metade das subamostras (muda pixels, a medir quantos).
- [ ] **Passo 5:** relatar os números e os arquivos.

### Tarefa 10: A enguia no jogo

**Arquivos:**
- Criar: `src/entities/serpente/enguia/camadaEnguia.ts`, `emJogo.ts`
- Mudar: `src/entities/BossSerpente.ts`, `src/entities/Boss.ts`, `src/scenes/GameScene.ts`,
  `src/entities/serpente/atalho.ts`

**Interfaces:**
- `CamadaEnguia`: duas `CanvasTexture` (`enguiaCima` a `HAB.profundidade.cima`, `enguiaBaixo` a
  `HAB.profundidade.baixo`). Os métodos: `envia(alvo: AlvoLonas)` (o `putImageData` só da caixa suja, o `refresh`),
  `esconde()`, `destroy()`.
- `EnguiaEmJogo`:
  - `static async prepara(scene): Promise<EnguiaEmJogo>` lê as texturas (`rgbaDaTextura`), roda `medidas`,
    `carregaArte` e `carregaGestos` em fatias (um `await` de quadro entre cada uma, para não travar o jogo);
  - os métodos `comeca(modo)`, `update(dt, nave: Ponto)`, `acerto(x0, y0, x1, y1): 'cabeca' | 'corpo' | 'casco' | null`
    (pela `mascara`), `morde(esq, dir, topo, base): boolean` (pelo `luta.fere`) e `destroy()`, mais os getters `cabeca`
    (o centro do crânio, para a hitbox e a bomba), `acabou`, `imune` e `podeMorrer`;
  - a cada `update`, comanda o `cascoVivo`:
    - a `lombada` da enguia, `{ x, amp: 4, larg: 9 }`, ou o tremor do rombo, `{ x: g.x, amp: 2.2·k·(0.6 + 0.4·sin 38t),
      larg: 34 }`;
    - a fissura: um `Fissura` empurrado no `sob-ida`, com o `de` seguindo a cabeça e a `cura` 0 no fim do `sob-volta`.
- `StageBoss.morteAcabou?: boolean`: na `GameScene`, `update` chama `killBoss()` quando `boss.morteAcabou` e
  `!boss.isDead`. No `killBoss`, com `boss.morteAcabou`, pula a cadeia e o estouro: `boss.destroy()`, `this.boss = null`
  e a vitória depois de `pausaFinalMs`.
- `BossSerpente`:
  - **o preparo:** `EnguiaEmJogo.prepara` começa no construtor (assíncrono). A fusão espera estar pronto.
  - **`acenderLuzes`:** com a enguia, convergência de 0,8 s, sem o `fusaoNucleo`; começa `this.enguia.comeca(...)`.
  - **`colapsar`:** com a enguia em `t ≥ 1,02`, chama o `detonar` sem `vestirFase`/`surgindo` e com `colapso = false`.
    A implosão é desenhada pela enguia; o `fx.implodeBig` sai.
  - **`update`:** com a enguia viva, `this.enguia.update(dt, nave)` no lugar do `mover`/`atacar`/`fumegar`. O
    `sprite` fica escondido, com `checkCollision.none`; a `cabeca` (o alvo da bomba) vai para o crânio.
  - **`acertoNoCorpo`** e **`morde`** passam para a enguia.
  - **`damage`:**
    - pela `VidaEnguia` (com o `golpeMax`);
    - as mordidas devolvidas viram `luta.pedeMordida`;
    - `morreu` vira `luta.mata()`;
    - nunca devolve `true` (a cena chama o `killBoss` pelo `morteAcabou`).
  - **`destrocos`:** devolve `undefined` na fase da enguia (o motor de destroços não morde um sprite escondido).
  - **`morteAcabou`:** o `acabou` da enguia.
- `atalho.ts`: `?serpente=fusao` faz a fusão já no fim da subida (`fusao()` da forma A). `&vida=<pct>` começa a vida
  da enguia nessa porcentagem, para ver a reta final logo. `&roteiro=maquete` usa os eventos e as sementes da maquete
  (o lado a lado).

- [ ] **Passo 1:** `CamadaEnguia` e `EnguiaEmJogo`.
- [ ] **Passo 2:** `Boss.ts`, `GameScene.ts`, `BossSerpente.ts`, `atalho.ts`.
- [ ] **Passo 3:** `npx tsc --noEmit`. Rodar `node scripts/test-serpente.mjs`, `node scripts/test-serpente-hab.mjs`,
  `node scripts/test-enguia.mjs`, `node scripts/test-morte.mjs` e `node scripts/test-enguia-porte.mjs`. Esperado:
  todos ok.
- [ ] **Passo 4:** abrir `http://localhost:5173/?serpente=fusao` com o Playwright (um script de scratchpad):
  - nenhum `pageerror`;
  - uma foto aos 3 s depois da fusão (o arco) e uma no posto (os canos);
  - conferir as fotos AMPLIADAS antes de mostrar.
- [ ] **Passo 5:** relatar os arquivos.

### Tarefa 11: A sonda no jogo, o desempenho no navegador e o lado a lado

**Arquivos:**
- Criar: `scripts/_serpente/_sonda-enguia.mjs` (no molde do `_sonda-luta.mjs`: o relógio fixo, o `Math.random` fixo,
  a nave intocável que conta os toques, `--filmar`)

- [ ] **Passo 1:** escrever a sonda. Ela abre `?serpente=fusao&roteiro=maquete`, estaciona a nave em (70, 100) (o
  `parado` da maquete) atirando a cada 1/7 s, e a cada passo de 1/60 lê:
  - o tempo da enguia (`performance.now` em volta do `update` da `EnguiaEmJogo`, envio das lonas incluído);
  - os toques, os acertos, o capítulo.

  Com `--filmar <dir>`, uma foto a cada 2 passos. Grava `<out>.json` com p50/p95/máx por capítulo.
- [ ] **Passo 2:** rodar a sonda na luta inteira. **Não editar `src/` durante a sonda.** Esperado: p95 ≤ 4 ms. Se
  passar, voltar à Tarefa 9, passo 4.
- [ ] **Passo 3:** o vídeo lado a lado. A maquete `parado` (o vídeo dela) e o filme da sonda, recortados nos mesmos
  instantes com ffmpeg:
  - a chegada;
  - os canos;
  - o mergulho com o rolar;
  - o Eco;
  - os gêiseres;
  - a volta;
  - uma mordida da cauda;
  - o crânio;
  - a morte.

  Conferir AMPLIADO antes de mostrar: a pele, a junta, a luz, o fogo sobre o vazio (a decisão 5).
- [ ] **Passo 4:** uma folha `docs/superpowers/folhas/2026-11-0X/enguia-jogo/jogo.html` com os trechos lado a lado, os
  números do desempenho e as decisões abertas. Mostrar a ele.

### Tarefa 12: Os registros

- [ ] **Passo 1:** o 🧭 do `docs/HANDOFF.md`:
  - o passo 4 fechado (ou o que ficou);
  - o próximo: o passo 5, ele joga e calibra a vida;
  - a frase de arranque nova.
- [ ] **Passo 2:** o START do passo 5 (`plans/2026-11-0X-enguia-calibragem-START.md`) e a memória
  (`roadmap-blocos-d-a-j`, uma linha).
- [ ] **Passo 3:** relatar os arquivos. Commit e push só quando ele pedir.

---

## Revisão do plano contra a spec e o START

- **§7.4** (um módulo por habilidade, os números num arquivo, o oráculo, as sondas, o atalho): Tarefas 3–11. Os módulos
  espelham os arquivos da maquete (`canos.ts`, `eco.ts`, `geiseres.ts`…), em `enguia/` em vez de soltos em `serpente/`,
  para o oráculo ser um para um.
- **O inventário do START:**
  - os números (T3); o caminho e o corpo (T3, T5); os gestos (T4); os respiros (T6); o pixelfx (T2); o desenho (T7);
  - a arte (T1, T4: carregada dos PNG, não assada, a decisão 2);
  - o `selaJunta`, as vistas do rolar por quadro, os quadros recolados (só os `qNN.png`, nunca o `original/`), a
    fumaça da girada só na chegada e o `luzCorpo`: todos no porte literal, provados pelo md5 (T7, T8).
- **As decisões do START:**
  - o pixelfx em TS: a decisão 1;
  - a camada de pixels: as decisões 4 e 5;
  - o corpo por pixel: as Tarefas 7 e 9;
  - o desempenho: as Tarefas 9 e 11;
  - os dados com as sementes da maquete: a Tarefa 8 e o `roteiro=maquete`.
- **§6.2–6.4:** a decisão 8, a Tarefa 8 (`vida.ts`, `pedeMordida`, `mata`) e a Tarefa 10.
- **§2.1** (a fusão até a implosão): a decisão 9, Tarefa 10.
- **Os testes de sempre:** Tarefa 10, passo 3.
