# START — a enguia colossal (S2): as GERAÇÕES no PixelLab — a cabeça em 8 direções, a girada e as animações

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A maquete e os anéis da enguia estão
> APROVADOS. A sessão abre nas gerações do PixelLab: primeiro as 8 direções da cabeça E3, depois o ajuste da girada
> (a virada de lado), depois as animações de cada momento."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem dele hoje: **a Serpente grande → o CENÁRIO da luta → H → I → J → F.**
>
> ➡️ **A etapa 3 tem START próprio: `plans/2026-11-07-enguia-animacoes-START.md`.** Este fica como o registro das
> etapas 1 e 2 (e da rodada 3, a fumaça do rombo enquanto ela fica erguida, aprovada).
>
> ✅ **07/11 (noite): AS ETAPAS 1 E 2 FECHARAM, commitadas e empurradas.** A girada do corpo + cabeça foi aprovada pelo
> caminho do DORSO desenhado (ver o fim da etapa 1 abaixo e a folha `folhas/2026-11-07/enguia-girada/girada.html`). **A
> próxima sessão abre na ETAPA 3** (as animações da cabeça), sozinha, a pedido dele. Atenção na etapa 3:
> - as animações saem da E3 de PERFIL (φ = 0); durante o rolar a maquete troca para as vistas (`vistasCabeca`), então um
>   gesto que aconteça numa virada precisa de uma decisão (a vista vence ou o gesto vence);
> - o dorso da cabeça (`dorso-cabeca.png`) tem brasas na linha do meio; ele tirou a espinha do CORPO porque não existia
>   no lado — se pedir o mesmo na cabeça, é a mesma conta.

## ▶️ ONDE ESTAMOS (fim de 07/11)

**Aprovado em 07/11, nesta ordem:**
1. **O plano** `plans/2026-11-07-serpente-grande-enguia.md` (Parte A = a maquete; Parte B = arte, efeitos, instalação).
   A Parte A e a seção **B1** (os anéis) registram cada rodada, com as falas dele.
2. **A maquete do movimento em blocos** (2 rodadas + ajuste dos canos). Ele: *"Boa, ficou ótimo assim."* Folha
   `folhas/2026-11-07/enguia-maquete/maquete.html`.
   - Um Eco por ciclo; o 1º aviso dos canos em 1,8 s; o arco da chegada; sem aviso pontilhado.
   - O posto pelo TRUQUE dele: o corpo sobe a borda direita e sai pelo canto de cima, e volta só a cabeça. O
     enrolamento de cima é elástico, para o corpo tampar a lateral e as 4 faixas terem cano mesmo depois das mordidas.
   - Os gêiseres só com o corpo inteiro no rombo; o rombo ABERTO no fim (a entrada da nave no Leviatã).
3. **Os anéis = a PELE CONTÍNUA** (6 rodadas). Ele: *"Boa, agora ficou muito bom."* Folha
   `folhas/2026-11-07/enguia-aneis/aneis.html`.
   - **O corpo:** a faixa da F1 endireitada e alongada pelas costelas, desde o pescoço (só o crânio é rígido). Ela é
     reacesa pelas normais do PixelLab.
   - **A cabeça:** gira por RotSprite (`amplia8`). O pedaço da pele sob o crânio fecha a fenda da junta sem aparecer.
   - **O rolar à vista** em todas as viradas: o corpo rola como um cilindro, lido pelo arco no meio da virada.
   - **As mordidas:** a cauda mordida fica rasgada; a mordida no crânio é uma ferida.
   - **Os gêiseres:** saem da rachadura R3, só para cima; o 1º fica em x 220.
   - **A raspada na entrada do rombo:** faíscas na linha onde a borda corta o corpo, mais fumaça grossa e longa, sem
     bordas acesas; a queda do mergulho entra ~12 px mais à direita.
   - **A morte com gore:** a cabeça explode (clarão, anéis de choque, o crânio em pedaços, gotas), e o pescoço
     decapitado bombeia fluido.

**O que ficou DE PROPÓSITO para esta sessão** (ele: *"sei que ainda vai ser ajustado para a fase de gerações, então
deixe para depois"*):
- **A virada da cabeça é seca e rápida:** a cabeça rígida troca de lado (espelha) de um quadro para o outro enquanto o
  corpo rola.
- **As costas no rolar esticam de novo, menos fluido que na rodada 4.** Ele: *"o rolar voltou, mas não voltou igual à
  qualidade que estava antes, as costas ficaram esticadas de novo"*. A regra do lado e o J = 40 são os da rodada 4.
  O que mudou desde então foi a curva da chegada (mais aberta, com `vIni` desacelerando) e o mergulho (restaurado da
  rodada 4). Comparar o vídeo da rodada 4 com o de hoje, quadro a quadro, ANTES de mexer.
- **O caminho que ele indicou para a cabeça:** *"no pixellab existe a expansão para 8 lados dos assets, você pode tentar
  fazer isso na cabeça da serpente, assim você terá posição para a cabeça virar de forma mais natural"*.

## A SEQUÊNCIA DESTA SESSÃO

### 1 · As 8 direções da cabeça E3 (PixelLab)
- **A base é a cabeça aprovada:** `folhas/2026-11-04/enguia-corpo/aprovada/cabeca-e3-pescoco.png` (96×64; só o crânio,
  x < 66, é rígido no jogo).
- **O objetivo:** as vistas intermediárias para a virada de lado. Ela vai de perfil (como desenhada), passa por ¾,
  pelo dorso ou de frente, e chega ao perfil espelhado, acompanhando o φ do corpo (0 → π). Também servem ao Eco (a
  cabeça seguindo a nave).
- **Ferramentas candidatas:** `create_8_direction_object` / rotação a partir da imagem. Ler as memórias antes:
  - [[rotacao-alisa-estilo-animar-da-original]]: a rotação 8-dir ALISA o dark sci-fi. Tirar a vista nova da ORIGINAL
    por animação v3 e corrigir o clarear.
  - [[pixellab-naves-saem-vista-de-cima]]: descartar as vistas de cima e as simétricas antes de mostrar.
  - [[partir-da-arte-aprovada]] e [[conferir-ampliado-antes-de-mostrar]].
- **A entrega é uma folha com as vistas ampliadas**, conferidas, para ele escolher ANTES de instalar
  ([[gerar-arte-direto-e-mostrar]]: 3–4 caminhos, sem brainstorming antes).
- **07/11 (noite) — FEITO, a folha `folhas/2026-11-07/enguia-cabeca-8dir/cabeca-8dir.html` espera ele:** 4 caminhos
  com a prévia em movimento (`_enguia-cabeca-8dir.mjs prepara|rola|previa`):
  - A = 8-dir com a cabeça DE PÉ (o giro vertical = o rolar; o dorso sai liso);
  - A+C′ = a ponte v3 (as 2 pontas fixas) + o dorso do A;
  - **B** = 8-dir deitada (vira para a CÂMERA; o mais fiel; a frente serve ao Eco) — o recomendado;
  - D = o rolar procedural da arte (borra nos ¾).
  - Descartados: v3 direto (quase parado) e a ponte até o D (4 olhos).
- **As costas (etapa 2), a causa achada:** a curva da chegada aberta na rodada 5 (sem a onda) põe o meio do rolar num
  trecho reto (o rumo vira 46° no rolar; na rodada 4, 87°). A proposta: `chegada=r4lenta` (a curva da rodada 4 + a
  desaceleração, `velPts` no `move`). As opções `chegada=r4|r4lenta` existem na maquete; o padrão ainda é o de hoje.
- **07/11 (noite, 2) — ele recusou as duas linhas** (com um print da r4lenta, o dorso circulado: *"fica esticada demais,
  parecendo que distorceu… era isso que eu queria mais leve, ou escondido"*; e da cabeça: *"tente gerar nova ou fazer
  algo… procedural… a girada corpo + cabeça bem natural"*). **A causa de verdade:** a faixa é só o LADO; as costas não
  existem desenhadas, então qualquer leitura estica. **A correção, instalada na maquete:** o DORSO gerado no PixelLab
  (corpo: `enguia-dorso/dorso-corpo.png`, o candidato `corpo/11-0` repetido no período de 19 px, os nós da espinha
  baixados ao vermelho das costelas; cabeça: `enguia-dorso/dorso-cabeca.png`, o `cabecaTexto/31-2`) e o cilindro com
  DUAS fontes (o lado nos flancos, o dorso nas costas, a parte do dorso crescendo com sin²φ — nada em repouso). A
  cabeça: 19 vistas de 10° (`arte.mjs` `vistasCabeca`), a E3 nos flancos + o dorso no topo (borda 0,7: os olhos vêm
  sempre da E3), as normais girando junto. Folha `folhas/2026-11-07/enguia-girada/girada.html` (substitui a
  `enguia-cabeca-8dir`). A curva da chegada ficou a de hoje.
- **✅ APROVADO (07/11, noite)** — ele: *"O restante eu aprovo"*, com 2 ajustes, feitos na rodada 2 da folha:
  - **a espinha saiu do dorso do corpo** (*"o dorso… se vê os espinhos… na girada isso aparece depois… ou retirar os
    espinhos"*): os nós não existem no lado; `_enguia-dorso-faixa.mjs` tira as linhas dos nós + as 2 cristas e junta as
    metades (as divisas em ponta no meio);
  - **a fenda no clarão dos canos** (2 px entre a mandíbula e o pescoço, já existia antes): a faixa sob o crânio desce
    em rampa só nas 5 colunas da junta (`arte.mjs`, `fundo(u)`); o Eco conferido, limpo.

### 2 · O ajuste da girada (a virada de lado)
- **Na maquete** (`scripts/_serpente/enguia/desenho.mjs`, `cabecaArte`): trocar o espelho instantâneo pelas vistas
  aprovadas, escolhidas pelo φ da cabeça (`R.rola(sH − Lc/2)`), para a cabeça girar junto com o rolar do corpo.
- **O rolar das costas:** comparar com a rodada 4 e corrigir o "esticado" (a leitura pelo arco em
  `corpoArte`/`pele`; a regra do lado em `roteiro.mjs`, `rolagem`).
- **A prova** é o vídeo da luta inteira, com o zoom das viradas: o arco da chegada (~4–6 s) e a curva do mergulho
  (~21 s). [[avaliar-skill-por-gif]].

### 3 · As animações da cabeça, uma por momento (PixMiniMax)
- **A boca (respondido 07/11):** ele quer *"o mais variado possível"*: a boca abre, fecha e entreabre conforme o
  momento, nunca fixa (a E3 é sempre de boca aberta; cada gesto escolhe o seu estado de boca).
- **A ordem dele (07/11):** as etapas 1 e 2 (8 direções + a girada instalada) fecham juntas com commit + push; a
  etapa 3 abre sozinha depois.
- **Os momentos** (spec §1.2 e o que a maquete mostrou com gestos em bloco):
  - nadar/olhar (o idle);
  - a preparação antes de partir (o recuo);
  - a carga dos canos (o tremor);
  - o Eco: seguir a nave (o giro) e o cuspe (o tranco);
  - a mordida no crânio (5%);
  - a presa na boca do rombo (tombando de lado);
  - a explosão (já procedural, só se ele pedir).
- **As regras** em [[pixminimax-animacao]]: o gesto NO LUGAR da arte escolhida; pedir o CORPO junto e dizer a cor de cada
  boca; intermediários com as duas pontas fixas; clipe que escurece = descarte; o conferidor `scripts/_serpente/_consistencia.mjs`.
- **A entrega:** folhas por gesto, cada uma com o gesto instalado na maquete e em vídeo, aprovada por vídeo.

### 4 · Depois (Parte B do plano, passos 3 e 4)
- **Os efeitos do corpo:** os mini estabilizadores/respiros soltando jato nas curvas e arrancadas (spec §1.3; hoje são
  pontinhos) e os efeitos do pixelfx (clonado em `Projetos folder/_referencias/pixelfx`: `fire/flamethrower`,
  `water/geyser`, `nature/poison-cloud`, `lightning/plasma-ball`, `explosions/plasma-explosion`, `spawn/disintegrate`).
  Rodar ou instalar algo de lá só com o ok dele ([[pixelfx-referencia-efeitos]]).
- **A instalação no jogo** (spec §7.4), com a maquete como oráculo.

## As ferramentas

- **A maquete:** `node scripts/_serpente/_enguia-maquete.mjs desvia <dir> corpo=pele fotos=1`. Opções:
  - `parado` (a outra sonda);
  - `corpo=blocos|aneis|pele`;
  - `luz=0` (sem a luz por normais);
  - `rolagem=aneis` (a virada anel por anel, só para comparar);
  - `de=` / `ate=` (filmar um trecho);
  - a saída é `<dir>/<nome>.mp4` + `.json` + fotos dos momentos.
- **As folhas:**
  - `node scripts/_serpente/_enguia-aneis-folha.mjs` (a dos anéis, em `folhas/2026-11-07/enguia-aneis/`);
  - `_enguia-maquete-folha.mjs` (a da maquete);
  - `_enguia-faixa.mjs` (a faixa do corpo).
- **Os testes:** `node scripts/test-enguia.mjs` (tudo ok em 07/11).
- **Os módulos:** `scripts/_serpente/enguia/`
  - `numeros.mjs` (todos os números);
  - `caminho.mjs`, `roteiro.mjs` (a coreografia, `vIni`, a regra do lado `rolagem`);
  - `corpo.mjs` (a pose, o tubo, as mordidas);
  - `arte.mjs` (a faixa, as normais, `amplia8`, a luz);
  - `desenho.mjs` (o quadro);
  - `canos.mjs`, `eco.mjs`, `geiseres.mjs` (`trilhaFissura`), `perigos.mjs`, `jogador.mjs`.
- **As normais do PixelLab:** `folhas/2026-11-07/enguia-aneis/` (`faixa-a/b-normal.png`, `cabeca-normal.png`).

## As leis que seguem valendo

- **Commit e push só quando ele pedir,** só no nome dele, nunca para `legacy`. Vídeos, GIFs e `cru/` ficam fora.
  ⚠️ **Os anéis (B1) e estes docs ainda NÃO foram commitados** (o último commit é `b9d3458`, a maquete). Perguntar no
  começo se ele quer commitar.
- **A conversa com ele em português;** código, comentários e prompts em inglês.
- **A arte:** conferida AMPLIADA antes de mostrar; a peça aprovada não se mexe, o teste é na pendente; ele julga por
  vídeo em velocidade real.
- **Edição por script corrompe** (CRLF; e PowerShell sem `-Encoding utf8` estraga os acentos): editar com Edit
  ([[edicao-por-script-falha-crlf]]).
- **O servidor** fica em `:5173` (`npm run dev`). As folhas abrem por ele.
