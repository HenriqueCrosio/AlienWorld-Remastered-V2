# START — a enguia colossal (S2): a etapa 3, as ANIMAÇÕES da cabeça, uma por momento

> ✅ **FEITA E APROVADA em 07/11** (os 6 gestos + a boca fechada nos mergulhos, commitados). O registro está na folha
> `folhas/2026-11-07/enguia-gestos/gestos.html` e no 📍 do 🧭. **O próximo é o START
> `plans/2026-11-07-enguia-parte-b-START.md`** (a Parte B: os efeitos do corpo e a instalação no jogo).

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A maquete, os anéis, a girada e a fumaça do
> rombo estão APROVADOS e commitados. A sessão abre nas animações da cabeça (PixMiniMax), uma por momento, com a boca
> variando o máximo possível."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem dele hoje: **a Serpente grande → o CENÁRIO da luta → H → I → J → F.**
> O START anterior (`plans/2026-11-07-enguia-geracoes-START.md`) tem o registro das etapas 1 e 2.

## ▶️ ONDE ESTAMOS (fim de 07/11)

Tudo abaixo está APROVADO, commitado e empurrado (o último commit é o desta preparação):
1. **A maquete do movimento** (`folhas/2026-11-07/enguia-maquete/maquete.html`): a luta inteira, os tempos, as sondas.
2. **Os anéis = a pele contínua** (`folhas/2026-11-07/enguia-aneis/aneis.html`): a faixa da F1 dobrada pelo caminho,
   as normais, o rolar à vista, as mordidas, o rombo, os gêiseres, a morte com gore.
3. **A girada = o dorso desenhado** (`folhas/2026-11-07/enguia-girada/girada.html`, rodadas 1–3):
   - **O dorso:** gerado no PixelLab, do corpo (sem a espinha, a pedido dele) e da cabeça. O cilindro tem duas fontes,
     o lado nos flancos e o dorso nas costas; o dorso cresce com o rolar, e em repouso a arte aprovada fica intacta.
   - **A cabeça:** rola junto, em 19 vistas de 10° (a E3 nos flancos + o dorso no topo, as normais girando).
   - **A fenda pescoço × mandíbula** fechada.
   - **A fumaça do rombo (rodada 3):** enquanto ela fica erguida no rombo (o Eco), o cruzamento com a borda solta
     fumaça grossa e algumas faíscas, sem parar. Ele: *"aprovado"*.
   - **A regra que ficou** ([[enguia-rolar-a-vista]]): o que aparece no rolar tem de existir na arte do lado.

## A ETAPA 3 — as animações da cabeça

### A boca (a resposta dele, 07/11)
Ele quer *"o mais variado possível"*. A boca abre, fecha e entreabre conforme o momento, nunca fixa. A E3 aprovada é
sempre de boca aberta, então cada gesto escolhe o seu estado de boca e a folha diz qual.

### Os momentos, e onde cada um já existe na maquete (como gesto em bloco, por código)
Cada animação substitui um gesto procedural que já está no `_enguia-maquete.mjs` (o `alvoGiro`, o `tranco`, o
`treme`), no mesmo trecho e no mesmo tempo. A coreografia não muda.

| Momento | Onde na maquete hoje | O gesto em bloco de hoje |
|---|---|---|
| **nadar / olhar** (o idle) | todo trecho em movimento | nenhum: a cabeça é rígida |
| **a preparação** (o recuo antes de partir) | `tr.prepara` (antes do mergulho, do sob, do erguida) | `alvoGiro = acima · N.prepara.giro` |
| **a carga dos canos** (o tremor) | `tr.hab === 'canos'`, fase `aviso` | `treme` de ±1 px |
| **o Eco: seguir a nave** (o giro) | `tr.hab === 'eco'` | `alvoGiro` para a nave (`N.eco.giro`) |
| **o Eco: o cuspe** (o tranco) | `r.cospe` de cada rodada do Eco | `tranco` de 0,22 rad em 0,35 s, o clarão na boca |
| **a mordida no crânio** (5%) | `cranio.t` (`corpo.mjs`, `mordidas`) | a ferida (`MORDIDA_CRANIO`), sem gesto |
| **a presa no rombo** (tombando de lado) | `tr.hab === 'presa'` / `'desfaz'` | `alvoGiro` 0,95 rad + `treme` |
| **a explosão** | `desfaz` | já procedural; só se ele pedir |

### O que decidir/medir no começo (a técnica)
- **A animação sai da E3 de PERFIL (φ = 0).** Durante o rolar, a maquete troca para as vistas (`vistasCabeca`).
  - Ver em que φ cada gesto acontece: medir com `R.rola` nos trechos da tabela, como no `viradas.mjs` do scratchpad
    (o Eco e os canos são de perfil; a preparação pode cair numa virada).
  - Gesto em plena virada pede uma decisão dele: a vista vence (o gesto espera) ou o gesto vence (a vista espera).
- **A luz.** Hoje a E3 é reacesa pelas normais (`folhas/2026-11-07/enguia-aneis/cabeca-normal.png`). Um quadro animado
  precisa de normais próprias, ou de usar as da E3 quando o gesto quase não deforma. Medir no começo e escolher por
  gesto; o recurso é o `create_normal_map` do PixelLab, por quadro.
- **O enquadramento.** A arte é 96×64 com o pescoço; só o crânio (x < 66 + 6) é rígido e desenhado pela cabeça. O
  quadro animado tem de manter a junta no lugar (x 66), senão a pele do pescoço descola. Medir a junta em cada quadro e
  recolar o quadro por ela.
- **O dorso da cabeça** (`enguia-dorso/dorso-cabeca.png`) tem brasas na linha do meio. Ele tirou a espinha do CORPO
  porque não existia no lado; se pedir o mesmo na cabeça, é a mesma conta (`_enguia-dorso-faixa.mjs` tem o método).

### As regras do PixMiniMax ([[pixminimax-animacao]])
- O gesto fica NO LUGAR da arte escolhida (a E3 como 1º quadro). Tudo que translada ou reconstrói vira "outro bicho".
- Pedir o CORPO junto (o pescoço inteiro no quadro) e dizer a cor de cada boca e luz: a boca laranja, o olho ciano, os
  respiros verdes. A boca aberta inventa cor.
- O gerador faz o movimento no começo: intermediários de 4 quadros com as duas pontas fixas.
- Verbo de efeito ("cospe", "dispara") vira efeito pintado. Diga *"nothing comes out of any mouth"* e a forma a manter;
  o cuspe pintado se limpa e vira clarão discreto (o clarão da maquete já existe).
- Clipe que escurece = descarte. O conferidor de cor é `scripts/_serpente/_consistencia.mjs`; a forma (boca, olho),
  pelo olho ampliado.
- 2 gerações por clipe; dê folga ao quadro (96×64 dentro de um quadro maior).
- Rotas REST locais: `scripts/_f4/_pl.mjs mini|anim <primeiro.png> <dir> <quadros> "<ação>" [ultimo.png]`.

### A entrega
- Uma folha por gesto (ou por par de gestos parecidos), com o gesto instalado na maquete e em vídeo, na velocidade real.
- Ele aprova por vídeo ([[avaliar-skill-por-gif]]). Conferir ampliado antes de mostrar
  ([[conferir-ampliado-antes-de-mostrar]]).
- A ordem sugerida: o **Eco** (seguir + cuspir; é o que mais aparece e o que mais pede boca) → os **canos** → a
  **preparação** → o **idle** → a **mordida** → a **presa**.

## Depois (Parte B do plano, passos 3 e 4)
- **Os efeitos do corpo:**
  - os mini estabilizadores/respiros soltando jato nas curvas e arrancadas (spec §1.3; hoje são pontinhos);
  - os efeitos do pixelfx (clonado em `Projetos folder/_referencias/pixelfx`), só com o ok dele ([[pixelfx-referencia-efeitos]]).
- **A instalação no jogo** (spec §7.4), com a maquete como oráculo.

## As ferramentas
- **A maquete:** `node scripts/_serpente/_enguia-maquete.mjs desvia <dir> corpo=pele fotos=1`.
  - Opções: `parado`, `luz=0`, `de=` / `ate=` (um trecho), `chegada=r4|r4lenta` (só para comparar).
  - `ENGUIA_DORSO=0` / `ENGUIA_VISTAS=0` voltam ao rolar antigo, para comparar.
  - A saída: `<dir>/<nome>.mp4` + `.json` + as fotos dos momentos. A luta inteira leva ~70 s para filmar.
- **Os testes:** `node scripts/test-enguia.mjs` (tudo ok em 07/11).
- **Os módulos** (`scripts/_serpente/enguia/`):
  - `arte.mjs`: a faixa, as normais, `amplia8`, `carregaDorso`, `vistasCabeca`, `realce`;
  - `desenho.mjs`: `corpoArte` (a pele, `dw` = o dorso), `cabecaArte` (a vista pelo φ);
  - `corpo.mjs`: a pose (`cabeca.fi`, `giro`, `treme`);
  - `roteiro.mjs`: a coreografia, a regra do lado `rolagem`, `velPts`.
- **Os dorsos:**
  - gerar: `_enguia-dorso-gerar.mjs corpo|cabeca|cabecaTexto <seed>`;
  - a faixa do corpo: `_enguia-dorso-faixa.mjs`.
- **As tiras ampliadas:** `node scripts/_serpente/_tira.cjs <saida.png> <a.png> <b.png> …`.

## As leis que seguem valendo
- **Commit e push só quando ele pedir,** só no nome dele (sem Co-Authored-By), nunca para `legacy`. Vídeos, GIFs e
  `cru/` ficam fora.
- **A conversa com ele em português;** código, comentários e prompts em inglês.
- **A arte:**
  - conferida AMPLIADA antes de mostrar;
  - a peça aprovada não se mexe, o teste é na pendente;
  - ele julga por vídeo em velocidade real;
  - defeito apontado em peça aprovada se corrige só ali, e se prova que o resto ficou igual.
- **Edição por script corrompe** (CRLF; PowerShell sem `-Encoding utf8` estraga os acentos): editar com Edit
  ([[edicao-por-script-falha-crlf]]).
- **O servidor** fica em `:5173` (`npm run dev`). As folhas abrem por ele.
