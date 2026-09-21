# O Esfíncter da Soleira — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pôr a GARGANTA (a criatura da cutscene do hangar) na costura entre o duto e o núcleo como a última comporta destrutível da Fase 4 — com um cano de gás vazando, um estouro em cone e gore entrando no núcleo.

**Architecture:** Um `PropKind` novo (`garganta`) ancorado pelo centro do vão, como a porta. Uma zona de gás em duas fases (vazando → densa) que arma a ignição; o primeiro tiro a tocar a zona densa dispara tudo. Os três efeitos (pluma, cone, gore) são **arte assada em pixel na resolução nativa** por scripts, nunca `Graphics` em tempo de jogo. O chefão atrasa de `t=113` para `t=118` porque a criatura tem 167px e o corredor só abre para isso em t≈110.

**Tech Stack:** TypeScript · Phaser 3.90 · Vite 6 · sharp (assar arte) · Playwright (sondas)

## Global Constraints

- **Efeito de cenário se ASSA EM PIXEL na resolução nativa, com a paleta do vizinho.** `Graphics` vetorial em tempo de jogo lê como "gerado" e foi reprovado na hora (`fimDoPredador`, 17/09). O código de cena só toca arte assada.
- **Reduzir pode; AMPLIAR nunca** — a lei da resolução, 06/09.
- **Nenhuma geração no PixelLab nesta peça.** A criatura, as duas animações e o cano já existem no disco.
- **Não tocar em `garganta-idle` / `garganta-morte` / `gargantaCut3`** — a `Interlude3Scene` (cutscene 3) está mergeada e aprovada e usa as três. O prop registra uma chave NOVA para a mesma imagem.
- **A chave da arte de um prop É o nome do `PropKind`** (`pickVariant(scene, kind)`).
- **Prop de origem `(0.5, 0.5)`: o estouro sai do CENTRO**, nunca de `y − displayHeight/2`.
- **A mordida sai pelo `inerte`, NUNCA pelo `body.enable`** — prop é movido por velocidade; desligar o corpo congela o destroço no ar.
- **Todo assert de "não aconteceu nada" exige o DISCRIMINADOR do lado** — o par que prova que o teste sabe falhar.
- **Toda peça de arte precisa de assert de CHAVE DE TEXTURA e de DIMENSÃO.**
- Ciclo de teste do projeto: `npm run typecheck` · `node scripts/probe-*.mjs` (exige `npm run dev` noutro terminal, **uma sonda por vez**) · captura `scripts/_f4/_ver-*.mjs`.
- Commits: autoria só do Henrique, **sem `Co-Authored-By`**. Remoto é o `origin` (V2); nunca o `legacy`.

---

## Estrutura de arquivos

| arquivo | responsabilidade |
|---|---|
| `scripts/_f4/_assar-gas.mjs` | **criar** — assa `f4-gas-sheet.png`: a pluma em N quadros, da fina à densa |
| `scripts/_f4/_assar-cone.mjs` | **criar** — assa `f4-cone-sheet.png`: o estouro em cone disparando para a direita |
| `scripts/_f4/_assar-gore.mjs` | **criar** — assa `f4-gore-sheet.png` RECORTANDO os pixels de `garganta.png` |
| `src/scenes/BootScene.ts` | **modificar** — registra a textura `garganta` (chave nova, mesma imagem), as 3 folhas assadas e as anims delas |
| `src/systems/TerrainSystem.ts` | **modificar** — o `PropKind` `garganta` + entrada em `PROPS` |
| `src/entities/esfincter.ts` | **criar** — a cena da soleira: a zona de gás, a ignição, o cone, o gore. Uma unidade com estado próprio, fora da `GameScene` que já é grande |
| `src/scenes/GameScene.ts` | **modificar** — `spawnGarganta`, o overlap bala×gás, a morte, e o caso do roteiro |
| `src/systems/StageDirector.ts` | **modificar** — os eventos da soleira e o chefão em `t=118` |
| `scripts/probe-f4-esfincter.mjs` | **criar** — a sonda, com os pares discriminadores |
| `scripts/_f4/_ver-esfincter.mjs` | **criar** — a captura da cena inteira, da chegada ao gore |

---

### Task 1: A pluma de gás, assada

**Files:**
- Create: `scripts/_f4/_assar-gas.mjs`
- Produces: `public/sprites/f4-gas-sheet.png` — 8 quadros de 128×176

**Interfaces:**
- Consumes: nada (primeira tarefa)
- Produces: a folha `f4-gas-sheet.png`, 8 quadros lado a lado, cada um 128×176. Quadro 0 = mais fino, quadro 7 = mais denso.

- [ ] **Step 1: Escrever o assador**

A pluma sai de um cano no TETO e desce ocupando a faixa. A paleta vem do risco âmbar do `f4-cano2.png` — o gás é a pressão que vazou dele —, **dessaturada e escura**: gás não é energia, e a lei do dark sci-fi é luz só onde há energia. Ele fica quase invisível no quadro 0 e ainda assim discreto no 7; quem tem de brilhar é o estouro, depois.

```js
// A PLUMA DE GÁS da soleira do núcleo, assada em PIXEL na resolução nativa.
//
// ⚠️ ASSADA, NUNCA `Graphics`: a lei mais cara da Fatia 7 (o 1º fim do predador foi reprovado na
// hora — *"ficou gerado e sem custos"*).
//
// ⚠️ E ELA É ESCURA DE PROPÓSITO. Gás não é energia, e a regra do dark sci-fi é luz só onde há
// energia. A cor sai do risco âmbar do `f4-cano2` (a pressão que vazou dele), dessaturada. O que
// brilha nesta cena é o ESTOURO — se a pluma competir com ele, o clímax vira mais do mesmo.
//
//   node scripts/_f4/_assar-gas.mjs
import sharp from 'sharp';

const W = 128, H = 176, N = 8;
const SAIDA = 'public/sprites/f4-gas-sheet.png';

// A paleta, medida no risco âmbar do cano e puxada para baixo.
const BASE = [122, 96, 44];

// Ruído estável: a mesma pluma toda vez que o script roda. Um gás sorteado a cada assadura
// mudaria de forma entre builds e ninguém saberia por quê.
let semente = 0x9e3779b9;
const rnd = () => {
  semente ^= semente << 13; semente ^= semente >>> 17; semente ^= semente << 5;
  return ((semente >>> 0) % 100000) / 100000;
};

const quadros = [];
for (let f = 0; f < N; f++) {
  // A densidade sobe com o quadro: 0 é um fio saindo do cano, 7 é a faixa tomada.
  const densidade = 0.10 + (f / (N - 1)) * 0.52;
  const buf = Buffer.alloc(W * H * 4, 0);
  for (let y = 0; y < H; y++) {
    // A pluma desce do teto: quem está perto de y=0 é denso desde o começo, o resto enche depois.
    const descida = Math.min(1, (f / (N - 1)) * 1.6 + 0.15);
    const alcance = descida * H;
    if (y > alcance) continue;
    // Afina nas pontas para a nuvem não ter borda reta — borda reta lê como retângulo.
    const perto = Math.min(1, (alcance - y) / 40);
    for (let x = 0; x < W; x++) {
      const beira = Math.min(1, Math.min(x, W - 1 - x) / 24);
      const p = densidade * perto * beira;
      if (rnd() > p) continue;
      const i = (y * W + x) * 4;
      // Dither de 2 valores: o pixel art da fase não tem gradiente contínuo em lugar nenhum.
      const claro = rnd() > 0.72;
      const k = claro ? 1.35 : 0.8;
      buf[i] = Math.min(255, BASE[0] * k);
      buf[i + 1] = Math.min(255, BASE[1] * k);
      buf[i + 2] = Math.min(255, BASE[2] * k);
      buf[i + 3] = claro ? 150 : 96;
    }
  }
  quadros.push(await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
}

await sharp({ create: { width: W * N, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(quadros.map((input, i) => ({ input, left: i * W, top: 0 })))
  .png()
  .toFile(SAIDA);
console.log(`${SAIDA}  ${N} quadros de ${W}x${H}`);
```

- [ ] **Step 2: Rodar e conferir as dimensões**

```bash
node scripts/_f4/_assar-gas.mjs
node -e "require('sharp')('public/sprites/f4-gas-sheet.png').metadata().then(m=>console.log(m.width+'x'+m.height))"
```

Esperado: `f4-gas-sheet.png  8 quadros de 128x176` e depois `1024x176`.

- [ ] **Step 3: ABRIR A IMAGEM**

```bash
node -e "const s=require('sharp');s('public/sprites/f4-gas-sheet.png').resize({width:1024,kernel:'nearest'}).flatten({background:{r:26,g:12,b:12}}).toFile('scripts/_f4/_gas-check.png').then(()=>console.log('ok'))"
```

Depois **olhe o arquivo**. Três dos cinco achados sérios do M1 só apareceram porque alguém olhou uma captura. O quadro 0 tem de ser quase nada; o 7, uma névoa que dá para ver através.

- [ ] **Step 4: Commit**

```bash
git add scripts/_f4/_assar-gas.mjs public/sprites/f4-gas-sheet.png
git commit -m "feat(f4): a pluma de gás da soleira, assada em pixel — escura, porque quem brilha é o estouro"
```

---

### Task 2: O cone do estouro, assado

**Files:**
- Create: `scripts/_f4/_assar-cone.mjs`
- Produces: `public/sprites/f4-cone-sheet.png` — 10 quadros de 256×176

**Interfaces:**
- Consumes: nada
- Produces: a folha `f4-cone-sheet.png`, 10 quadros de 256×176. O cone nasce estreito à ESQUERDA (onde a criatura está) e se abre para a DIREITA (para dentro do núcleo).

- [ ] **Step 1: Escrever o assador**

```js
// O CONE DO ESTOURO da garganta, assado em PIXEL na resolução nativa.
//
// ⚠️ ELE DISPARA PARA A DIREITA, e isso é regra de JOGO, não de estilo: o cone projeta para DENTRO
// do núcleo, longe da nave. Um estouro que se abrisse para trás mataria o jogador pelo próprio
// acerto — e a peça foi desenhada como fácil.
//
// ⚠️ ASSADO, NUNCA `Graphics`. A lei mais cara da Fatia 7.
//
//   node scripts/_f4/_assar-cone.mjs
import sharp from 'sharp';

const W = 256, H = 176, N = 10;
const SAIDA = 'public/sprites/f4-cone-sheet.png';

// Três paradas, e a ordem é a de fogo morrendo (os mesmos expoentes do `_assar-porta-nucleo`):
// o branco-quente dura pouco, o âmbar sustenta, o vermelho-escuro sobra.
const PARADAS = [
  [255, 236, 190],
  [255, 154, 52],
  [138, 32, 18],
];

let semente = 0x85ebca6b;
const rnd = () => {
  semente ^= semente << 13; semente ^= semente >>> 17; semente ^= semente << 5;
  return ((semente >>> 0) % 100000) / 100000;
};

const cor = (t) => {
  const s = Math.min(0.999, Math.max(0, t)) * (PARADAS.length - 1);
  const i = Math.floor(s), f = s - i;
  const a = PARADAS[i], b = PARADAS[Math.min(PARADAS.length - 1, i + 1)];
  return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * f));
};

const quadros = [];
for (let q = 0; q < N; q++) {
  const t = q / (N - 1);
  // O alcance cresce rápido e para; o brilho cai o tempo todo. É assim que fogo morre.
  const alcance = W * Math.min(1, Math.pow(t, 0.45) * 1.15);
  const forca = Math.pow(1 - t, 1.3);
  const buf = Buffer.alloc(W * H * 4, 0);
  for (let x = 0; x < alcance; x++) {
    const d = x / W;
    // A boca do cone: estreita na origem, aberta na ponta.
    const meia = 10 + d * 78;
    for (let dy = -meia; dy <= meia; dy++) {
      const y = Math.round(H / 2 + dy);
      if (y < 0 || y >= H) continue;
      const borda = 1 - Math.abs(dy) / meia;
      // Dentro do cone o miolo é mais quente que a borda; a frente é mais quente que a cauda.
      const calor = forca * borda * (0.45 + 0.55 * (1 - Math.abs(d - t * 0.8) * 2.2));
      if (calor <= 0.04 || rnd() > calor * 1.5) continue;
      const [r, g, b] = cor(1 - calor);
      const i = (y * W + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
      buf[i + 3] = Math.min(255, Math.round(calor * 320));
    }
  }
  quadros.push(await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
}

await sharp({ create: { width: W * N, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(quadros.map((input, i) => ({ input, left: i * W, top: 0 })))
  .png()
  .toFile(SAIDA);
console.log(`${SAIDA}  ${N} quadros de ${W}x${H}`);
```

- [ ] **Step 2: Rodar e conferir**

```bash
node scripts/_f4/_assar-cone.mjs
node -e "require('sharp')('public/sprites/f4-cone-sheet.png').metadata().then(m=>console.log(m.width+'x'+m.height))"
```

Esperado: `2560x176`.

- [ ] **Step 3: ABRIR A IMAGEM** — o cone tem de ABRIR para a direita e ESCURECER com o tempo, nunca clarear no fim.

```bash
node -e "const s=require('sharp');s('public/sprites/f4-cone-sheet.png').resize({width:1280,kernel:'nearest'}).flatten({background:{r:10,g:12,b:26}}).toFile('scripts/_f4/_cone-check.png').then(()=>console.log('ok'))"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/_f4/_assar-cone.mjs public/sprites/f4-cone-sheet.png
git commit -m "feat(f4): o cone do estouro, assado — ele abre para o núcleo, longe da nave, e morre como fogo morre"
```

---

### Task 3: O gore, recortado dos pixels dela

**Files:**
- Create: `scripts/_f4/_assar-gore.mjs`
- Reads: `public/sprites/garganta.png`
- Produces: `public/sprites/f4-gore-sheet.png` — 8 pedaços de 24×24

**Interfaces:**
- Consumes: `public/sprites/garganta.png` (97×171)
- Produces: `f4-gore-sheet.png`, 8 quadros de 24×24 lado a lado (192×24). Cada quadro é UM pedaço opaco recortado de uma região diferente da criatura.

- [ ] **Step 1: Escrever o assador**

```js
// O GORE DA GARGANTA — os pedaços que entram no núcleo, RECORTADOS DOS PIXELS DELA.
//
// ⚠️ RECORTAR NÃO É ECONOMIA, É A GARANTIA DE PALETA. É o mesmo princípio do
// `_assar-porta-nucleo.mjs`, onde o pico do pulso É o estático: a peça é a fonte da própria luz,
// então não existe como o destroço destoar da criatura de que ele saiu. Gerar pedaços novos
// traria outra paleta e faria o magenta brigar consigo mesmo.
//
//   node scripts/_f4/_assar-gore.mjs
import sharp from 'sharp';

const FONTE = 'public/sprites/garganta.png';
const SAIDA = 'public/sprites/f4-gore-sheet.png';
const LADO = 24, N = 8;

const { data, info } = await sharp(FONTE).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

// Os oito recortes, espalhados pelo corpo de propósito: dois do anel de dentes (o que o jogador
// reconhece), dois da goela acesa, quatro do casco escuro. Um gore só de miolo aceso lê como
// faísca; um gore só de casco lê como pedra.
const PONTOS = [
  [26, 60], [62, 60],   // o anel de dentes
  [40, 82], [54, 92],   // a goela
  [18, 28], [70, 34],   // o casco de cima
  [22, 132], [66, 140], // o casco de baixo
];

let semente = 0xc2b2ae35;
const rnd = () => {
  semente ^= semente << 13; semente ^= semente >>> 17; semente ^= semente << 5;
  return ((semente >>> 0) % 100000) / 100000;
};

const quadros = [];
for (const [cx, cy] of PONTOS) {
  const buf = Buffer.alloc(LADO * LADO * 4, 0);
  // Uma silhueta irregular dentro do quadrado: um pedaço arrancado não é um quadrado.
  const raio = 7 + rnd() * 3;
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const dx = x - LADO / 2, dy = y - LADO / 2;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > raio * (0.62 + rnd() * 0.5)) continue;
      const sx = cx - LADO / 2 + x, sy = cy - LADO / 2 + y;
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const si = (sy * W + sx) * 4;
      if (data[si + 3] < 40) continue;
      const i = (y * LADO + x) * 4;
      buf[i] = data[si]; buf[i + 1] = data[si + 1]; buf[i + 2] = data[si + 2]; buf[i + 3] = 255;
    }
  }
  quadros.push(await sharp(buf, { raw: { width: LADO, height: LADO, channels: 4 } }).png().toBuffer());
}

await sharp({ create: { width: LADO * N, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(quadros.map((input, i) => ({ input, left: i * LADO, top: 0 })))
  .png()
  .toFile(SAIDA);
console.log(`${SAIDA}  ${N} pedaços de ${LADO}x${LADO}`);
```

- [ ] **Step 2: Rodar, conferir dimensão E que nenhum pedaço saiu vazio**

```bash
node scripts/_f4/_assar-gore.mjs
node -e "
const s=require('sharp');
(async()=>{
const {data,info}=await s('public/sprites/f4-gore-sheet.png').raw().ensureAlpha().toBuffer({resolveWithObject:true});
console.log(info.width+'x'+info.height);
for(let q=0;q<8;q++){let n=0;
 for(let y=0;y<24;y++)for(let x=0;x<24;x++){const i=(y*info.width+(q*24+x))*4;if(data[i+3]>40)n++;}
 console.log('pedaço',q,n,'px',n<40?'← VAZIO, o ponto caiu fora do corpo':'');}
})()"
```

Esperado: `192x24` e **nenhum** pedaço marcado como vazio. Um recorte que cai no transparente vira um destroço invisível — o tipo de defeito que passa em toda sonda e só aparece jogando.

- [ ] **Step 3: Commit**

```bash
git add scripts/_f4/_assar-gore.mjs public/sprites/f4-gore-sheet.png
git commit -m "feat(f4): o gore da garganta, recortado dos pixels dela — a paleta sai de graça"
```

---

### Task 4: Registrar arte e animações na BootScene

**Files:**
- Modify: `src/scenes/BootScene.ts`

**Interfaces:**
- Consumes: `f4-gas-sheet.png`, `f4-cone-sheet.png`, `f4-gore-sheet.png`, `garganta.png`
- Produces: as chaves de textura `garganta`, `f4GasSheet`, `f4ConeSheet`, `f4GoreSheet`; as anims `f4-gas` (loop) e `f4-cone` (uma vez).

- [ ] **Step 1: Registrar a textura `garganta`**

Na tabela de imagens simples, ao lado de `gargantaCut3`:

```ts
  // ⚠️ A MESMA IMAGEM SOB DUAS CHAVES, e não é descuido. A chave da arte de um prop É o nome do
  // `PropKind` (`pickVariant(scene, kind)`), então o esfíncter da Fase 4 precisa dela como
  // `garganta`. A `gargantaCut3` fica intocada: a cutscene 3 está MERGEADA E APROVADA, e trocar a
  // chave dela de carona seria atravessar a fronteira que o M1 pagou caro para aprender (a faixa
  // da F4 apareceu nas Fases 1, 2 e 3 sem nenhuma sonda pegar).
  garganta: 'sprites/garganta.png',
```

- [ ] **Step 2: Registrar as três folhas assadas**

Na tabela de spritesheets, junto das outras peças assadas da F4:

```ts
  // A SOLEIRA DO NÚCLEO (21/09, o esfíncter): as três assadas em PIXEL na resolução nativa por
  // `_assar-gas.mjs`, `_assar-cone.mjs` e `_assar-gore.mjs`. Ver `src/entities/esfincter.ts`.
  f4GasSheet: { path: 'sprites/f4-gas-sheet.png', w: 128, h: 176 },
  f4ConeSheet: { path: 'sprites/f4-cone-sheet.png', w: 256, h: 176 },
  f4GoreSheet: { path: 'sprites/f4-gore-sheet.png', w: 24, h: 24 },
```

- [ ] **Step 3: Registrar as duas anims**

Na tabela de anims de folha, junto de `porta-nucleo`:

```ts
  // O GÁS a 8: devagar o bastante para o jogador ver ENGROSSAR. É a única parte da cena que pede
  // paciência dele, e acelerar aqui mataria a antecipação, que é a peça inteira.
  { key: 'f4-gas', sheet: 'f4GasSheet', frames: 8, frameRate: 8 },
  // O CONE a 14, UMA vez. Rápido: é o pagamento, não a espera.
  { key: 'f4-cone', sheet: 'f4ConeSheet', frames: 10, frameRate: 14, loop: false },
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/BootScene.ts
git commit -m "feat(f4): a garganta ganha chave de prop, e as três assadas entram no Boot"
```

---

### Task 5: O `PropKind` garganta

**Files:**
- Modify: `src/systems/TerrainSystem.ts`

**Interfaces:**
- Consumes: a textura `garganta` e a anim `garganta-idle` (Task 4)
- Produces: `PropKind` aceita `'garganta'`; `terrain.spawn('garganta', { centroVao, hp })` cria a peça ancorada pelo centro, em `DEPTH_NA_PAREDE`, tocando `garganta-idle`.

- [ ] **Step 1: Acrescentar o kind ao union**

Logo depois de `'porta'`:

```ts
  /**
   * O ESFÍNCTER da soleira do núcleo (Fase 4, M4): a GARGANTA — a mesma criatura que engole a
   * nave na cutscene do hangar, agora segurando a entrada do núcleo.
   *
   * ⚠️ É O SEGUNDO PROP ANCORADO PELO CENTRO DO VÃO, depois da porta, e pelo mesmo motivo: uma
   * comporta presa a uma das bordas deixaria passagem pela outra.
   *
   * ⚠️ E ELA MORRE COM UM TIRO SÓ — mas não por ser fraca. Quem mata é a NUVEM DE GÁS (ver
   * `src/entities/esfincter.ts`): o `hp` aqui é `Infinity` porque bala nenhuma fere a criatura
   * diretamente. A peça foi desenhada como fácil e espetacular, não como uma corrida de dano — é
   * o contrário da progressão 6/8/10 das portas, de propósito.
   */
  | 'garganta';
```

- [ ] **Step 2: Acrescentar à tabela `PROPS`**

```ts
  // ⚠️ `hp: Infinity` É A REGRA DA PEÇA, não um descuido. A garganta não cai na bala: ela cai na
  // ignição do gás. Sem isto o jogador a mataria a tiro antes de a nuvem engrossar, e a cena
  // inteira — a espera, o gás, o estouro — nunca aconteceria.
  garganta: { hp: Infinity, score: 400, shoots: false, anim: 'garganta-idle' },
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Esperado: sem erros. Se `PROPS` reclamar de chave faltando, é o `Record<PropKind, PropDef>` fazendo o trabalho dele.

- [ ] **Step 4: Commit**

```bash
git add src/systems/TerrainSystem.ts
git commit -m "feat(f4): o PropKind da garganta — indestrutível à bala, porque quem mata é o gás"
```

---

### Task 6: A cena da soleira (`esfincter.ts`)

**Files:**
- Create: `src/entities/esfincter.ts`

**Interfaces:**
- Consumes: `f4-gas` / `f4-cone` / `f4GoreSheet` (Task 4), o prop `garganta` (Task 5)
- Produces:
  - `export class Esfincter` com:
    - `constructor(scene: Phaser.Scene, fx: Fx)`
    - `armar(criatura: Phaser.Physics.Arcade.Sprite): void` — planta a nuvem acompanhando a criatura
    - `get zona(): Phaser.GameObjects.Zone | undefined`
    - `get denso(): boolean`
    - `acender(): boolean` — dispara tudo; devolve `false` se ainda não estava denso
    - `update(dt: number): void`
    - `get ativa(): boolean`

- [ ] **Step 1: Escrever a unidade**

⚠️ Ela mora fora da `GameScene` de propósito: a cena já é grande, e a soleira tem estado próprio (fase da nuvem, relógio, a criatura que ela acompanha). Arquivo focado = edição confiável.

```ts
import Phaser from 'phaser';
import type { Fx } from '../systems/Fx';

/**
 * A SOLEIRA DO NÚCLEO — a cena do esfíncter, em três tempos: o gás VAZA, o gás fica DENSO, e o
 * primeiro tiro ACENDE.
 *
 * ⚠️ A NUVEM ENGROSSA ANTES DE ACENDER, E ISSO NÃO É ENFEITE. Num shmup o dedo já está no
 * gatilho. Se qualquer tiro acendesse no instante em que a criatura aparece, ela morreria em
 * ~0,2s e o jogador não veria nada — nem a criatura, nem o gás, nem o motivo. O acúmulo é o que
 * transforma o tiro numa espera em que ele SABE o que vem, e a antecipação é a peça inteira.
 *
 * ⚠️ O CONE DISPARA PARA A DIREITA, para dentro do núcleo. É regra de JOGO: um estouro que se
 * abrisse para trás mataria o jogador pelo próprio acerto, e a peça foi desenhada como fácil.
 *
 * ⚠️ TUDO AQUI É ARTE ASSADA. Nenhum `Graphics`, nenhum retângulo em tempo de jogo — a lei mais
 * cara da Fatia 7, e a razão de o 1º fim do predador ter sido reprovado na hora.
 */
export class Esfincter {
  /** Quanto tempo a nuvem leva para ficar densa. É o knob da pergunta 1 do teste jogado. */
  static readonly VAZANDO_MS = 1500;

  /** Quantos pedaços de gore partem para dentro do núcleo. */
  private static readonly PEDACOS = 14;

  private nuvem?: Phaser.GameObjects.Sprite;
  private zonaGas?: Phaser.GameObjects.Zone;
  private criatura?: Phaser.Physics.Arcade.Sprite;
  private relogio = 0;
  private acesa = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Fx,
  ) {}

  get zona(): Phaser.GameObjects.Zone | undefined {
    return this.acesa ? undefined : this.zonaGas;
  }

  get denso(): boolean {
    return !this.acesa && this.relogio >= Esfincter.VAZANDO_MS;
  }

  get ativa(): boolean {
    return this.criatura !== undefined;
  }

  /** Planta a nuvem em cima da criatura. A partir daqui o relógio corre. */
  armar(criatura: Phaser.Physics.Arcade.Sprite): void {
    this.criatura = criatura;
    this.relogio = 0;
    this.acesa = false;

    // Depth −0,45: À FRENTE da criatura (que mora em DEPTH_NA_PAREDE, −0,65) e atrás da nave (0).
    // O gás tem de passar por cima dela, senão não lê como gás no ar — lê como mancha na parede.
    this.nuvem = this.scene.add
      .sprite(criatura.x, criatura.y, 'f4GasSheet')
      .setDepth(-0.45)
      .setName('f4Gas');
    if (this.scene.anims.exists('f4-gas')) this.nuvem.play('f4-gas');

    this.zonaGas = this.scene.add.zone(criatura.x, criatura.y, 128, 176);
    this.scene.physics.world.enable(this.zonaGas);
    const corpo = this.zonaGas.body as Phaser.Physics.Arcade.Body;
    corpo.setAllowGravity(false);
    corpo.moves = false;
  }

  update(): void {
    if (!this.criatura) return;

    // A criatura morreu ou saiu de cena sem acender: recolhe tudo.
    if (!this.criatura.active) {
      this.limpar();
      return;
    }

    this.relogio += this.scene.game.loop.delta;

    // A nuvem ANDA COM A CRIATURA. Ela é movida por velocidade como todo prop, então a nuvem e a
    // zona seguem a posição dela a cada quadro em vez de ganharem velocidade própria — duas
    // velocidades separadas divergem, e uma nuvem que descola da peça denuncia o truque.
    const { x, y } = this.criatura;
    this.nuvem?.setPosition(x, y);
    this.zonaGas?.setPosition(x, y);
    const corpo = this.zonaGas?.body as Phaser.Physics.Arcade.Body | undefined;
    corpo?.reset(x, y);
  }

  /**
   * A IGNIÇÃO. Devolve `false` se a nuvem ainda está só vazando — e é esse `false` que faz o
   * jogador esperar em vez de matar a cena no primeiro quadro.
   */
  acender(): boolean {
    if (!this.denso || !this.criatura) return false;
    this.acesa = true;

    const { x, y } = this.criatura;

    // 1 · a nuvem VIRA o clarão: ela some no mesmo quadro em que o cone entra. Gás que continua
    // vazando depois de pegar fogo é gás que não pegou fogo.
    this.nuvem?.destroy();
    this.nuvem = undefined;
    this.zonaGas?.destroy();
    this.zonaGas = undefined;

    // 2 · o CONE, com a origem na criatura e abrindo para a DIREITA. `setOrigin(0, 0.5)`: a
    // esquerda da arte é a boca do cone.
    const cone = this.scene.add
      .sprite(x, y, 'f4ConeSheet')
      .setOrigin(0, 0.5)
      .setDepth(-0.4)
      .setName('f4Cone');
    if (this.scene.anims.exists('f4-cone')) {
      cone.play('f4-cone');
      cone.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => cone.destroy());
    } else {
      cone.destroy();
    }

    // 3 · o GORE — pedaços dela cuspidos para dentro do núcleo.
    this.cuspirGore(x, y);

    return true;
  }

  /**
   * OS PEDAÇOS. Todos vão para a DIREITA, com espalhamento vertical — é o cone que os empurra, e
   * um destroço que voltasse para a nave contaria a história errada.
   */
  private cuspirGore(x: number, y: number): void {
    for (let i = 0; i < Esfincter.PEDACOS; i++) {
      const p = this.scene.add
        .sprite(x, y, 'f4GoreSheet', i % 8)
        .setDepth(-0.42)
        .setName('f4Gore');
      const vx = 150 + Math.random() * 260;
      const vy = (Math.random() - 0.5) * 190;
      this.scene.tweens.add({
        targets: p,
        x: x + vx * 1.6,
        y: y + vy * 1.6,
        angle: (Math.random() - 0.5) * 540,
        alpha: { from: 1, to: 0 },
        duration: 1100 + Math.random() * 700,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
    this.fx.explode(x, y, 2.2);
  }

  limpar(): void {
    this.nuvem?.destroy();
    this.nuvem = undefined;
    this.zonaGas?.destroy();
    this.zonaGas = undefined;
    this.criatura = undefined;
    this.acesa = false;
    this.relogio = 0;
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Esperado: sem erros. Se `Fx` não exportar o tipo, importe o que `GameScene` já importa.

- [ ] **Step 3: Commit**

```bash
git add src/entities/esfincter.ts
git commit -m "feat(f4): a cena da soleira — o gás vaza, engrossa, e o primeiro tiro acende"
```

---

### Task 7: Ligar na GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `Esfincter` (Task 6), o prop `garganta` (Task 5)
- Produces: `spawnGarganta()`, o overlap bala×zona, `matarGarganta()`, e o caso `'garganta'` do roteiro.

- [ ] **Step 1: O campo e o spawn**

Junto de `spawnPorta`:

```ts
  /**
   * O ESFÍNCTER DA SOLEIRA: a garganta que segura a entrada do núcleo.
   *
   * ⚠️ NASCE PELA MESMA CURVA E NO MESMO x QUE A PORTA (`GAME_WIDTH + 30`), pelo mesmo motivo:
   * perguntar a curva em outro ponto faria a peça nascer numa altura que não é a do corredor onde
   * ela vai chegar.
   *
   * ⚠️ E ELA CHEGA COM A COSTURA, não antes. A criatura tem 167px e o corredor só abre para isso
   * em t≈110 (medido em `scripts/_f4/_ver-soleira.mjs`) — é a arte mandando na fase pela terceira
   * vez nesta fatia, e é por isso que o chefão atrasou para t=118.
   */
  private spawnGarganta(): void {
    if (!this.textures.exists('garganta')) return;
    this.terrain.spawn('garganta', { centroVao: this.moldura.vaoEm(GAME_WIDTH + 30) });
    const criatura = this.terrain.props
      .getChildren()
      .find((o) => (o as Phaser.Physics.Arcade.Sprite).getData('kind') === 'garganta') as
      | Phaser.Physics.Arcade.Sprite
      | undefined;
    if (criatura) this.esfincter.armar(criatura);
  }
```

Declare o campo junto dos outros sistemas: `private esfincter!: Esfincter;` e construa no `create`, depois do `fx`: `this.esfincter = new Esfincter(this, this.fx);`

- [ ] **Step 2: O overlap bala × gás, e a morte**

```ts
  /**
   * A MORTE DA GARGANTA — disparada pela IGNIÇÃO DO GÁS, nunca por dano acumulado.
   *
   * ⚠️ A CRIATURA VIRA `inerte` AQUI, na ignição, e NÃO no fim da animação. O jogador atirou e
   * ganhou; fazê-lo esperar os 2,2s do `garganta-morte` para poder passar seria cobrar duas
   * vezes. É a mesma razão do `delayedCall` da porta — o ponto é agora, o espetáculo é depois.
   *
   * ⚠️ E É O `inerte` QUE TIRA A MORDIDA, NUNCA O `body.enable`. Prop é movido por velocidade, e
   * desligar o corpo CONGELA a carcaça no ar enquanto a parede rola por baixo. Foi o defeito que
   * a porta expôs em 20/09, e esta peça nasce sabendo dele.
   *
   * ⚠️ O `hp` JÁ ERA `Infinity` (ver o `PropKind`), então não há o que zerar — o que muda é o
   * `inerte`, que os três overlaps de prop consultam pelo `TerrainSystem.solido`.
   */
  private matarGarganta(): void {
    const criatura = this.terrain.props
      .getChildren()
      .find((o) => (o as Phaser.Physics.Arcade.Sprite).getData('kind') === 'garganta') as
      | Phaser.Physics.Arcade.Sprite
      | undefined;
    if (!criatura || !criatura.active) return;

    if (!this.esfincter.acender()) return; // a nuvem ainda está só vazando

    criatura.setData('inerte', true);
    this.score += criatura.getData('score') as number;
    criatura.anims.stop();
    if (this.anims.exists('garganta-morte')) criatura.play('garganta-morte');
  }
```

E, no `create`, junto dos outros overlaps — o gatilho é a BALA tocando a zona:

```ts
    // ⚠️ OVERLAP CONTRA A ZONA, não teste de distância: a nuvem tem 128×176 e o que importa é o
    // tiro ATRAVESSAR o gás, não passar perto do centro dele.
    this.physics.add.overlap(this.weapons.bullets, this.esfincterZonaProxy, () => this.matarGarganta());
```

⚠️ Se `esfincter.zona` só existe depois do `armar`, registre o overlap **dentro** do `spawnGarganta`, guardando o `Collider` para destruir no `matarGarganta`. Prefira esse caminho: ele evita um proxy vazio vivendo a fase inteira.

- [ ] **Step 3: O `update` e o caso do roteiro**

No `update` da cena, junto dos outros sistemas: `this.esfincter.update();`

No `switch` dos eventos do roteiro, junto de `case 'porta'`:

```ts
      case 'garganta':
        this.spawnGarganta();
        break;
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat(f4): a garganta entra em cena — o tiro no gás acende, e a passagem abre na ignição"
```

---

### Task 8: O roteiro da soleira

**Files:**
- Modify: `src/systems/StageDirector.ts:619-673`

**Interfaces:**
- Consumes: o caso `'garganta'` (Task 7)
- Produces: o tipo `StageEvent` aceita `{ t, type: 'garganta' }`; a Fase 4 termina em t=118.

- [ ] **Step 1: O tipo do evento**

Junto de `| { t: number; type: 'porta'; hp: number }`:

```ts
  | { t: number; type: 'garganta' }
```

- [ ] **Step 2: O banner de t=88 para de mentir**

```ts
  // ⚠️ ERA 'ESFÍNCTER FINAL', E APONTAVA PARA A COISA ERRADA desde antes das portas existirem. O
  // esfíncter de verdade é a garganta da soleira (t≈110); o que chega em t=94 é a terceira
  // comporta. Os banners desta campanha ANUNCIAM o que vem, e este anunciava outra peça.
  { t: 88, type: 'banner', text: 'A ÚLTIMA COMPORTA' },
```

- [ ] **Step 3: A soleira**

Depois do `{ t: 109, type: 'banner', text: 'ALERTA · O NÚCLEO' }`:

```ts
  // ─── A SOLEIRA: O ESFÍNCTER. A última coisa entre o jogador e o núcleo. ───
  //
  // ⚠️ ELA CHEGA EM t=110 PORQUE A ARTE MANDA. A criatura tem 167px de conteúdo e o corredor só
  // abre para isso quando a parede recua: em t=106,5 sobrariam 51px enterrados, em t=108,5 ainda
  // 19, e só em t=110 ela cabe com folga (medido pelo motor em `scripts/_f4/_ver-soleira.mjs`).
  // É a TERCEIRA vez nesta fatia que arte com linha forte impõe geometria à fase.
  //
  // ⚠️ E ELA NASCE NA COSTURA de propósito: a boca é magenta, o duto é vermelho e o núcleo é AZUL.
  // Contra a parede do duto ela sumiria; contra o núcleo ela RECORTA. É o mesmo princípio que fez
  // a fenda vertical da porta funcionar contra as veias horizontais.
  { t: 109.5, type: 'banner', text: 'ESFÍNCTER' },
  { t: 110, type: 'garganta' },

  // ⚠️ O CHEFÃO ERA t=113, E ATRASOU POR CAUSA DELA (21/09). A cena da soleira — chegar, respirar,
  // o gás engrossar, o tiro, o estouro e o gore — não cabe em 3s. `t` é um número solto aqui: a
  // música do chefão nasce no `spawnBoss`, então ela espera junto, e a cena acontece no SILÊNCIO,
  // que é o que o silêncio serve para fazer em todas as fases.
  { t: 118, type: 'boss' },
```

E **remova** a linha `{ t: 113, type: 'boss' },`.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/systems/StageDirector.ts
git commit -m "feat(f4): a soleira entra no roteiro — o esfíncter em t=110, e o chefão espera até 118"
```

---

### Task 9: A sonda, com os pares discriminadores

**Files:**
- Create: `scripts/probe-f4-esfincter.mjs`

**Interfaces:**
- Consumes: tudo acima
- Produces: uma sonda que sai com código ≠ 0 se qualquer assert falhar.

- [ ] **Step 1: Escrever a sonda**

⚠️ **Cada "não aconteceu nada" leva o par que prova que o teste sabe falhar.** O assert *"a nave atravessa a lasca sem dano"* passou sozinho (50 → 50) e quase foi dado como prova; com o discriminador ele começou a FALHAR (50 → 49), porque a nave parada no meio do duto leva de onda, de bala e de parede.

```js
// A SONDA DO ESFÍNCTER (Fatia 7 · M4, a última peça).
//
// O que só se vê rodando: se a criatura nasce com a arte DELA (e não a textura de erro), se ela
// tapa o vão, se o gás VAZANDO não acende e o DENSO acende, e se a passagem fica aberta depois.
//
// ⚠️ Exige `npm run dev` rodando. UMA sonda por vez.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(1200);

const blindar = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
});
const salta = (t) => page.evaluate((t) => {
  const s = window.__game.scene.getScenes(true)[0];
  s.elapsed = t; s.director.skipTo(t); s.aplicaCorredorEMoldura(t);
}, t);
const ate = (t) => page.waitForFunction(
  (a) => window.__game.scene.getScenes(true)[0].elapsed >= a, t, { timeout: 120000, polling: 16 });
const ler = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const p = s.terrain.props.getChildren().find((o) => o.active && o.getData('kind') === 'garganta');
  if (!p) return null;
  const faixa = s.children.list.find((o) => o.name === 'f4FaixaC' || o.name === 'faixaChao');
  return {
    tex: p.texture.key,
    anim: p.anims?.currentAnim?.key ?? null,
    escala: p.scaleX,
    dims: `${p.width}x${p.height}`,
    hp: p.getData('hp'),
    inerte: p.getData('inerte') === true,
    depth: p.depth,
    faixaDepth: faixa?.depth ?? null,
    y: Math.round(p.y),
    alturaTela: Math.round(p.displayHeight),
    denso: s.esfincter?.denso === true,
    temNuvem: s.children.list.some((o) => o.name === 'f4Gas'),
  };
});

await blindar();
await salta(105);
await ate(110.6);
await blindar();

const viva = await ler();
console.log('garganta ', JSON.stringify(viva));
ok(viva !== null, 'a garganta nasce na soleira');

if (viva) {
  // ⚠️ DUAS CHAVES VÁLIDAS: ela RESPIRA (`garganta-idle`), e um sprite tocando animação reporta a
  // textura do QUADRO, não a da peça parada. É a mesma frouxidão medida da porta.
  ok(
    viva.tex === 'garganta' || viva.tex.startsWith('gargantaIdleAnim'),
    `a garganta não usa a textura de erro — carrega a arte dela (${viva.tex})`,
  );
  ok(viva.anim === 'garganta-idle', `ela RESPIRA (anim=${viva.anim})`);
  ok(viva.escala === 1, `entra em escala 1, nunca esticada (${viva.escala})`);
  ok(viva.dims === '97x171', `as dimensões batem com a arte — 97×171 (${viva.dims})`);
  ok(!Number.isFinite(viva.hp), `bala não a fere: hp infinito (${viva.hp})`);
  ok(
    viva.faixaDepth !== null && viva.depth < viva.faixaDepth,
    `⭐ as pontas dela ficam ATRÁS da borda (peça ${viva.depth} < faixa ${viva.faixaDepth})`,
  );
  ok(viva.temNuvem, 'a nuvem de gás está plantada em cima dela');
}

// ─── O PAR 1: tiro na nuvem VAZANDO não acende · tiro na DENSA acende ───
const vazando = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { denso: s.esfincter?.denso === true, acendeu: s.esfincter?.acender() === true };
});
ok(!vazando.denso && !vazando.acendeu, 'tiro na nuvem VAZANDO não acende — a espera existe');

await page.waitForFunction(
  () => window.__game.scene.getScenes(true)[0].esfincter?.denso === true,
  null, { timeout: 20000, polling: 50 },
);
ok(true, '⭐ o DISCRIMINADOR: a nuvem chega a DENSA (senão o assert acima passaria sozinho)');

const acendeu = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.matarGarganta();
  const p = s.terrain.props.getChildren().find((o) => o.getData('kind') === 'garganta');
  return { inerte: p?.getData('inerte') === true, anim: p?.anims?.currentAnim?.key ?? null };
});
ok(acendeu.inerte, 'a ignição abre a passagem NA HORA — a criatura vira inerte');
ok(acendeu.anim === 'garganta-morte', `ela toca a morte (anim=${acendeu.anim})`);

// ─── O PAR 2: a nave atravessa a carcaça · a criatura VIVA cobraria ───
// (o discriminador é a leitura de `hp` infinito + `inerte` falso acima, medida ANTES da ignição)
const depois = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return { solido: s.terrain.solido?.(s.terrain.props.getChildren().find((o) => o.getData('kind') === 'garganta')) };
});
ok(depois.solido === false, 'a carcaça não é mais sólida — a nave passa por dentro');

await browser.close();
console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Rodar a sonda**

```bash
node scripts/probe-f4-esfincter.mjs
```

Esperado: `TUDO OK`. Se `s.esfincter` for `undefined`, o campo não está público na `GameScene` — a sonda lê o estado do motor, então ele precisa estar alcançável (como `s.moldura` e `s.terrain` já são).

- [ ] **Step 3: Rodar as sondas que a peça pode ter quebrado**

⚠️ **Toda mudança em código COMPARTILHADO exige olhar as fases que não são a sua** — a faixa da F4 foi parar nas Fases 1, 2 e 3 e nenhuma sonda pegou. `PropKind` e `BootScene` são compartilhados.

```bash
node scripts/probe-stage4.mjs
node scripts/probe-f4-moldura.mjs
node scripts/probe-f4-visual.mjs
node scripts/probe-interlude3.mjs
```

Esperado: todas passam. A `probe-interlude3` é a que prova que a cutscene do hangar continua intacta.

- [ ] **Step 4: Commit**

```bash
git add scripts/probe-f4-esfincter.mjs
git commit -m "test(f4): a sonda do esfíncter — cada 'nada aconteceu' com o discriminador do lado"
```

---

### Task 10: A captura, e ABRIR A IMAGEM

**Files:**
- Create: `scripts/_f4/_ver-esfincter.mjs`

- [ ] **Step 1: Escrever a captura**

Modele em `scripts/_f4/_ver-soleira.mjs` (já existe). Oito fotos: a chegada, o gás fino, o gás denso, a ignição, o cone em três tempos, e a passagem aberta. Monte a folha de contato em 2 colunas, como as outras.

- [ ] **Step 2: Rodar e OLHAR**

```bash
node scripts/_f4/_ver-esfincter.mjs
```

Depois **abra `scripts/_f4/_folha-esfincter.png`**. As perguntas da §8 da spec se respondem aqui, antes de ele jogar:

- a criatura RECORTA contra o azul do núcleo, ou some?
- o gás lê como gás, ou como mancha?
- o cone abre para a DIREITA e ESCURECE, ou clareia no fim?
- os pedaços parecem bicho, ou estilhaço genérico?

- [ ] **Step 3: Commit**

```bash
git add scripts/_f4/_ver-esfincter.mjs scripts/_f4/_folha-esfincter.png
git commit -m "test(f4): a captura da soleira — a cena inteira, da chegada ao gore"
```

---

### Task 11: Os documentos

**Files:**
- Modify: `docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md`
- Modify: `docs/HANDOFF.md`

- [ ] **Step 1: O START**

A tabela "O estado das três peças do M4": o esfíncter sai de `⬜ a construir` e vira `🟡 construído — à espera do teste jogado`. A 🚦 passa a apontar para o teste. A seção `🧭 COMO ABRIR O ESFÍNCTER` vira registro do que foi feito.

- [ ] **Step 2: O HANDOFF**

O bloco da Fatia 7: o M4 fecha as três peças; o que resta da fatia é o teste jogado do esfíncter, rejogar a fase inteira e o merge `--no-ff` em `main`.

- [ ] **Step 3: Commit e empurrar**

```bash
git add docs/
git commit -m "docs(f4): o esfíncter está construído — a Fatia 7 tem as três peças do M4 e espera o teste jogado"
git push origin feat/fase4-visual
```

⚠️ `origin` é o **V2**. Nunca o `legacy`.

---

## Auto-revisão

**Cobertura da spec:** §2 (a peça reusada) → Tasks 4–5 · §3 (a cena e a regra do gás) → Tasks 6–7 · §4 (as peças assadas) → Tasks 1–3 · §5.1 (o prop e os dois defeitos da porta) → Tasks 5, 7 · §5.2 (a zona em duas fases) → Task 6 · §5.3 (a morte em dois tempos) → Task 7 · §5.4 (o roteiro) → Task 8 · §6 (a geometria) → comentários das Tasks 7–8 · §7 (sondas e discriminador) → Task 9 · §8 (as perguntas do teste) → Task 10.

**Sem placeholders:** todo passo que muda código traz o código.

**Consistência de tipos:** `Esfincter.armar/acender/denso/zona/update/limpar` — os nomes usados nas Tasks 7 e 9 são os definidos na Task 6. As chaves `garganta` / `f4GasSheet` / `f4ConeSheet` / `f4GoreSheet` e as anims `f4-gas` / `f4-cone` são as registradas na Task 4.

**Risco conhecido, e o passo que o pega:** o overlap bala×zona precisa ser registrado DEPOIS do `armar` (a zona não existe antes). A Task 7 Step 2 diz isso explicitamente e manda guardar o `Collider`.
