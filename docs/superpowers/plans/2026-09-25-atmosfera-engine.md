# A Atmosfera — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um motor reutilizável de névoa, halo, poeira, correção de cor, vinheta e grão para as cutscenes, aplicado primeiro na cutscene final (`Interlude4Scene`) com a curva dramática aprovada.

**Architecture:** Um `PostFXPipeline` do Phaser (GLSL, na resolução nativa 384×216, névoa e halo quantizados em Bayer 4×4) posto na câmera principal; um controlador `Atmosfera` que cria uma câmera "limpa" para o texto, um emissor de poeira de 1 px e interpola perfis nomeados; os perfis são dados puros em `perfis.ts`. Cada capítulo só escolhe o perfil.

**Tech Stack:** Phaser 3.90 (WebGL PostFXPipeline), TypeScript 5.7, Vite 6, Playwright (sondas), Node 24 (roda `.ts` direto por type stripping — usado no teste dos perfis).

**Spec:** `docs/superpowers/specs/2026-09-25-atmosfera-engine-design.md`

## Global Constraints

- Piso: `nevoa.densidade >= 0.6` em TODO perfil da cutscene final (pedido dele: *"nao tire completamente a densidade"*).
- `densidade = 1` e `grao = 1` reproduzem EXATAMENTE a prévia aprovada (`scripts/_f8/_preview-atmos-mov.mjs`): névoa até `0.42`, grão de amplitude `9/255`, halo `70/255`.
- Névoa e halo SEMPRE quantizados com Bayer 4×4; nada de degradê liso nesses dois termos.
- Texto (`depth >= DEPTH.TEXTO`) fica fora do tratamento; a nave fica DENTRO.
- Sem WebGL: a Atmosfera vira no-op (`estado().ativo === false`) e a cena roda como hoje.
- Commits de autoria SÓ do Henrique: **sem** `Co-Authored-By` e sem "Generated with Claude Code" (regra do projeto; sobrepõe o padrão do harness). Nunca empurrar para o remoto `legacy`.
- Editar código com a ferramenta Edit, NUNCA com `sed`/`node -e` (CRLF e `${}` falham em silêncio neste repo).
- As sondas rodam com o dev server no ar: `npm run dev` noutro terminal (porta 5173).

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| Create `src/systems/atmosfera/perfis.ts` | O tipo `PerfilAtmosfera`, os perfis nomeados (`PERFIS`), `PISO_DENSIDADE`, `interpolarPerfil`. Só dados e matemática; sem import de runtime (roda no Node) |
| Create `src/systems/atmosfera/AtmosferaPipeline.ts` | O shader e a passagem de uniforms. Não conhece cena nem capítulo |
| Create `src/systems/atmosfera/Atmosfera.ts` | O controlador: registra a pipeline, câmera limpa, poeira, perfis/transição, fade, estado para a sonda, limpeza |
| Create `scripts/test-atmosfera-perfis.mjs` | Teste de Node dos perfis (piso, interpolação) |
| Modify `src/scenes/final/tipos.ts` | `CenaFinal` ganha `atm: Atmosfera` |
| Modify `src/scenes/Interlude4Scene.ts` | Cria a Atmosfera, `update`, fade pelas duas câmeras |
| Modify `src/scenes/final/dentro.ts`, `fora.ts`, `queda.ts`, `sobrevoo.ts` | Cada capítulo escolhe o seu perfil |
| Modify `scripts/probe-interlude4.mjs` | Asserts da Atmosfera por capítulo |

---

### Task 1: Os perfis e a interpolação

**Files:**
- Create: `src/systems/atmosfera/perfis.ts`
- Test: `scripts/test-atmosfera-perfis.mjs`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `type Cor = readonly [number, number, number]` (0–255)
  - `interface PerfilAtmosfera { nome: string; nevoa: { densidade: number; cor: Cor; altura: number; velTras: readonly [number, number]; velFrente: readonly [number, number]; evolucao: number }; halo: { forca: number; limiar: number; cor: Cor }; grade: number; gradeQuente: number; vinheta: number; grao: number; poeira: { quantidade: number; cor: Cor; deriva: readonly [number, number]; espalhar: number } }`
  - `const PERFIS: { viscera, visceraSuccao, vacuo, vacuoQueda, superficie, apagando }` (todos `PerfilAtmosfera`)
  - `const PISO_DENSIDADE = 0.6`
  - `function interpolarPerfil(de: PerfilAtmosfera, para: PerfilAtmosfera, k: number): PerfilAtmosfera` — interpola todo número (e cada componente de cor/vetor); `nome` e `poeira` vêm de `para`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-atmosfera-perfis.mjs`:

```js
// O teste dos perfis da Atmosfera — roda direto no Node 24 (type stripping lê o .ts).
//   node scripts/test-atmosfera-perfis.mjs
import { PERFIS, PISO_DENSIDADE, interpolarPerfil } from '../src/systems/atmosfera/perfis.ts';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

const nomes = ['viscera', 'visceraSuccao', 'vacuo', 'vacuoQueda', 'superficie', 'apagando'];
ok(nomes.every((n) => PERFIS[n]?.nome === n), `os seis perfis existem com o próprio nome (${Object.keys(PERFIS).join(',')})`);
ok(PISO_DENSIDADE === 0.6, `o piso é 0,6 (${PISO_DENSIDADE})`);
for (const n of nomes) {
  ok(PERFIS[n].nevoa.densidade >= PISO_DENSIDADE, `${n}: densidade ${PERFIS[n].nevoa.densidade} >= piso`);
}
// a forma da curva: dentro > superfície > espaço
ok(PERFIS.viscera.nevoa.densidade > PERFIS.superficie.nevoa.densidade, 'dentro é mais denso que a superfície');
ok(PERFIS.superficie.nevoa.densidade > PERFIS.vacuo.nevoa.densidade, 'a superfície é mais densa que o espaço');
ok(PERFIS.apagando.gradeQuente === 0, 'no apagar, o âmbar sai (gradeQuente 0)');

const meio = interpolarPerfil(PERFIS.superficie, PERFIS.apagando, 0.5);
ok(meio.nome === 'apagando', `a interpolação já leva o nome do destino (${meio.nome})`);
ok(Math.abs(meio.nevoa.densidade - (PERFIS.superficie.nevoa.densidade + PERFIS.apagando.nevoa.densidade) / 2) < 1e-9, `densidade no meio (${meio.nevoa.densidade})`);
ok(Math.abs(meio.gradeQuente - 0.5) < 1e-9, `gradeQuente no meio (${meio.gradeQuente})`);
ok(meio.nevoa.cor.length === 3 && meio.nevoa.velTras.length === 2, 'cores e vetores interpolam componente a componente');
const fim = interpolarPerfil(PERFIS.superficie, PERFIS.apagando, 1);
ok(JSON.stringify(fim) === JSON.stringify(PERFIS.apagando), 'k = 1 é o destino exato');
const ini = interpolarPerfil(PERFIS.superficie, PERFIS.apagando, 0);
ok(ini.nevoa.densidade === PERFIS.superficie.nevoa.densidade, 'k = 0 começa na origem');

console.log(falhas === 0 ? '\n✔ PERFIS DA ATMOSFERA' : `\n✘ ${falhas} asserts falharam`);
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-atmosfera-perfis.mjs`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `src/systems/atmosfera/perfis.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/systems/atmosfera/perfis.ts` (⚠️ só sintaxe apagável: `interface`, `type`, `as const`; nenhum `enum`, nenhum import de runtime — o Node o lê direto):

```ts
/**
 * OS PERFIS DA ATMOSFERA — só números (spec 2026-09-25-atmosfera-engine-design.md §3.3 e §4).
 *
 * `densidade = 1` e `grao = 1` são EXATAMENTE a prévia C aprovada (`scripts/_f8/_preview-atmos-mov.mjs`): névoa até
 * 0.42 de mistura, grão de amplitude 9/255, halo 70/255 (`forca 0.27`). As cores de névoa e de luz foram amostradas
 * da arte de cada ambiente com a mesma conta da prévia (névoa = média dos tons médio-escuros ×1,5 + toque frio;
 * luz = média do que é quente e aceso).
 *
 * ⚠️ O PISO (25/09, ele): *"quero que todos os capitulos sejam densos, pois o momento é pesado. Pode variar na curva
 * dramatica, mas nao tire completamente a densidade"* — nenhum perfil da cutscene final abaixo de `PISO_DENSIDADE`.
 */

/** Cor em 0–255. */
export type Cor = readonly [number, number, number];
type Vetor = readonly [number, number];

export interface PerfilAtmosfera {
  nome: string;
  nevoa: {
    /** 0–1: o quanto da névoa aparece (1 = a prévia). */
    densidade: number;
    cor: Cor;
    /** Expoente do gradiente vertical: < 1 cobre a tela, > 2 fica rente ao chão. */
    altura: number;
    /** px/s na tela, da camada de trás (larga, lenta) e da da frente (fina, rápida). */
    velTras: Vetor;
    velFrente: Vetor;
    /** O quanto a névoa muda de FORMA por segundo (não só desliza). */
    evolucao: number;
  };
  halo: {
    /** 0.27 = a prévia. Respira ±20% num ciclo de 2,4s. */
    forca: number;
    /** 0–1: o vermelho mínimo para contar como "quente e aceso" (0.59 = 150/255, a prévia). */
    limiar: number;
    cor: Cor;
  };
  /** 0–1: a correção de cor (sombra → petróleo, luz → âmbar). */
  grade: number;
  /** 0–1: só a parte âmbar da correção (o capítulo 7 a esfria). */
  gradeQuente: number;
  /** 0–1: quanto a borda escurece. */
  vinheta: number;
  /** 1 = o grão da prévia (amplitude 9/255). */
  grao: number;
  poeira: {
    /** Quantas partículas de 1 px vivas na tela. */
    quantidade: number;
    cor: Cor;
    /** px/s médio. */
    deriva: Vetor;
    /** ± px/s em volta da deriva. */
    espalhar: number;
  };
}

export const PISO_DENSIDADE = 0.6;

/** Dentro do corpo (caps 1–2): sufocante, a névoa cobre a tela, fuligem e brasa no ar. */
const viscera: PerfilAtmosfera = {
  nome: 'viscera',
  nevoa: { densidade: 1, cor: [96, 61, 83], altura: 0.8, velTras: [-6, -1], velFrente: [-14, 0], evolucao: 0.03 },
  halo: { forca: 0.27, limiar: 0.59, cor: [188, 65, 47] },
  grade: 1,
  gradeQuente: 1,
  vinheta: 0.6,
  grao: 1,
  poeira: { quantidade: 140, cor: [150, 70, 50], deriva: [-3, -2], espalhar: 4 },
};

export const PERFIS = {
  viscera,
  /** A descompressão (cap 3): o ar arrancado para a direita, rumo ao rasgo (`RASGO_X` 204). */
  visceraSuccao: {
    ...viscera,
    nome: 'visceraSuccao',
    nevoa: { ...viscera.nevoa, velTras: [40, 0], velFrente: [70, 0] },
    poeira: { quantidade: 160, cor: [150, 70, 50], deriva: [60, 0], espalhar: 20 },
  },
  /** A ferida (cap 4): o vácuo frio, violeta; o halo pega a lava da ferida. */
  vacuo: {
    nome: 'vacuo',
    nevoa: { densidade: 0.75, cor: [75, 73, 133], altura: 1.6, velTras: [-4, 0], velFrente: [-9, 1], evolucao: 0.02 },
    halo: { forca: 0.3, limiar: 0.59, cor: [229, 96, 33] },
    grade: 1,
    gradeQuente: 1,
    vinheta: 0.5,
    grao: 0.85,
    poeira: { quantidade: 110, cor: [120, 118, 190], deriva: [2, -1], espalhar: 2 },
  },
  /** A queda (cap 5): o do 4, mais frio; o rastro de fogo acende o halo. */
  vacuoQueda: {
    nome: 'vacuoQueda',
    nevoa: { densidade: 0.7, cor: [72, 71, 115], altura: 1.6, velTras: [-4, 0], velFrente: [-9, 1], evolucao: 0.02 },
    halo: { forca: 0.3, limiar: 0.59, cor: [229, 96, 33] },
    grade: 1,
    gradeQuente: 1,
    vinheta: 0.5,
    grao: 0.85,
    poeira: { quantidade: 110, cor: [115, 114, 175], deriva: [-2, -3], espalhar: 2 },
  },
  /** O sobrevoo (cap 6): névoa baixa, rente ao chão; cinza caindo devagar. */
  superficie: {
    nome: 'superficie',
    nevoa: { densidade: 0.9, cor: [69, 86, 110], altura: 2.2, velTras: [-5, 0], velFrente: [-12, 0], evolucao: 0.03 },
    halo: { forca: 0.27, limiar: 0.59, cor: [200, 83, 36] },
    grade: 1,
    gradeQuente: 1,
    vinheta: 0.55,
    grao: 0.9,
    poeira: { quantidade: 130, cor: [110, 120, 135], deriva: [-3, 6], espalhar: 3 },
  },
  /** A luz se apaga (cap 7): o âmbar sai, a vinheta fecha; o halo apaga sozinho com a lava (é lido da imagem). */
  apagando: {
    nome: 'apagando',
    nevoa: { densidade: 0.8, cor: [69, 86, 110], altura: 2.2, velTras: [-5, 0], velFrente: [-12, 0], evolucao: 0.03 },
    halo: { forca: 0.27, limiar: 0.59, cor: [200, 83, 36] },
    grade: 1,
    gradeQuente: 0,
    vinheta: 0.7,
    grao: 1,
    poeira: { quantidade: 130, cor: [110, 120, 135], deriva: [-3, 6], espalhar: 3 },
  },
} as const satisfies Record<string, PerfilAtmosfera>;

const lerp = (a: number, b: number, k: number): number => (k >= 1 ? b : a + (b - a) * k);
const lerpV = <T extends readonly number[]>(a: T, b: T, k: number): T => a.map((v, i) => lerp(v, b[i], k)) as unknown as T;

/** O perfil entre `de` e `para` em `k` (0–1). `nome` e `poeira` já são os do destino (a poeira só troca no corte). */
export function interpolarPerfil(de: PerfilAtmosfera, para: PerfilAtmosfera, k: number): PerfilAtmosfera {
  return {
    nome: para.nome,
    nevoa: {
      densidade: lerp(de.nevoa.densidade, para.nevoa.densidade, k),
      cor: lerpV(de.nevoa.cor, para.nevoa.cor, k),
      altura: lerp(de.nevoa.altura, para.nevoa.altura, k),
      velTras: lerpV(de.nevoa.velTras, para.nevoa.velTras, k),
      velFrente: lerpV(de.nevoa.velFrente, para.nevoa.velFrente, k),
      evolucao: lerp(de.nevoa.evolucao, para.nevoa.evolucao, k),
    },
    halo: {
      forca: lerp(de.halo.forca, para.halo.forca, k),
      limiar: lerp(de.halo.limiar, para.halo.limiar, k),
      cor: lerpV(de.halo.cor, para.halo.cor, k),
    },
    grade: lerp(de.grade, para.grade, k),
    gradeQuente: lerp(de.gradeQuente, para.gradeQuente, k),
    vinheta: lerp(de.vinheta, para.vinheta, k),
    grao: lerp(de.grao, para.grao, k),
    poeira: para.poeira,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-atmosfera-perfis.mjs`
Expected: todas as linhas `✔` e `✔ PERFIS DA ATMOSFERA` (exit 0). Se o Node reclamar de sintaxe TS, confira que `perfis.ts` não usa `enum`/`namespace`/parameter properties.

Run: `npx tsc --noEmit`
Expected: sem saída (exit 0).

- [ ] **Step 5: Commit**

```bash
git add src/systems/atmosfera/perfis.ts scripts/test-atmosfera-perfis.mjs
git commit -m "feat(atmosfera): os perfis e a interpolação — a curva da cutscene final com piso 0,6"
```

---

### Task 2: O shader e o controlador, ligados na regente

**Files:**
- Create: `src/systems/atmosfera/AtmosferaPipeline.ts`
- Create: `src/systems/atmosfera/Atmosfera.ts`
- Modify: `src/scenes/final/tipos.ts` (interface `CenaFinal`)
- Modify: `src/scenes/Interlude4Scene.ts` (create, update, fade)
- Modify: `src/scenes/final/dentro.ts` (perfil do cap 1)
- Modify: `scripts/probe-interlude4.mjs` (estado + asserts do cap 1)

**Interfaces:**
- Consumes (Task 1): `PerfilAtmosfera`, `interpolarPerfil` de `./perfis`; `PERFIS.viscera`.
- Produces:
  - `export const CHAVE_ATMOSFERA = 'Atmosfera'`
  - `export class AtmosferaPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline` com campos públicos `perfil: PerfilAtmosfera | null` e `tempo: number`
  - `export interface OpcoesAtmosfera { limiteLimpo: number; profundidadePoeira: number }`
  - `export interface EstadoAtmosfera { ativo: boolean; perfil: string | null; densidade: number; grao: number; gradeQuente: number; limpos: number }`
  - `export class Atmosfera { constructor(scene: Phaser.Scene, opcoes: OpcoesAtmosfera); perfil(p: PerfilAtmosfera, ms?: number): void; update(dt: number): void; fadeOut(ms: number): void; estado(): EstadoAtmosfera }`
  - `CenaFinal.atm: Atmosfera`
  - na sonda: `estado().atm` = `EstadoAtmosfera`

- [ ] **Step 1: Write the failing probe asserts**

In `scripts/probe-interlude4.mjs`, inside the `estado` evaluate, add the `atm` field right after `baleias: [...]`:

```js
      baleias: ['leviathanWhale', 'leviathanWhaleDying', 'leviathanWhaleDyingSheet', 'leviathanWhaleSplit'].filter((k) => tex.exists(k)),
      // A ATMOSFERA (spec 2026-09-25): o perfil do capítulo e os números que a sonda cobra.
      atm: s.atm?.estado() ?? null,
```

Right after the line `ok(c1b.faltando === 0, ...)` (capítulo 1), add:

```js
ok(c1b.atm?.ativo === true, `a Atmosfera está ligada (ativo=${c1b.atm?.ativo})`);
ok(c1b.atm?.perfil === 'viscera', `dentro do corpo, o perfil é a víscera (${c1b.atm?.perfil})`);
ok((c1b.atm?.densidade ?? 0) >= 0.6, `a névoa é densa (${c1b.atm?.densidade})`);
```

- [ ] **Step 2: Run the probe to verify it fails**

Run (dev server no ar): `node scripts/probe-interlude4.mjs`
Expected: `✘ a Atmosfera está ligada (ativo=undefined)` e os dois seguintes `✘`; exit 1.

- [ ] **Step 3: Write the shader**

Create `src/systems/atmosfera/AtmosferaPipeline.ts`:

```ts
import Phaser from 'phaser';
import type { PerfilAtmosfera } from './perfis';

/**
 * O SHADER DA ATMOSFERA (spec 2026-09-25-atmosfera-engine-design.md §3.1) — a transcrição da prévia C aprovada
 * (`scripts/_f8/_preview-atmos-mov.mjs`) para GLSL. Roda na câmera principal, na resolução NATIVA (384×216: o
 * `Scale.FIT` só amplia o canvas), então cada termo age num pixel do jogo.
 *
 * ⚠️ A LIÇÃO DE 17/09 (`efeito-de-cena-assado-em-pixel`): degradê liso lê como "gerado". Por isso a NÉVOA e o HALO
 * saem quantizados em Bayer 4×4 — como a prévia. Só a correção de cor, a vinheta e o grão são contínuos (a C).
 *
 * Não conhece cena nem capítulo: lê `perfil` e `tempo`, que o controlador (`Atmosfera`) escreve a cada quadro.
 */
export const CHAVE_ATMOSFERA = 'Atmosfera';

const FRAG = `
#define SHADER_NAME ATMOSFERA_FS
precision highp float;

uniform sampler2D uMainSampler;
uniform vec2 uResolucao;
uniform float uTempo;
uniform float uQuadroGrao;
uniform float uDensidade;
uniform vec3 uCorNevoa;
uniform float uAltura;
uniform vec2 uVelTras;
uniform vec2 uVelFrente;
uniform float uEvolucao;
uniform float uForcaHalo;
uniform float uLimiarHalo;
uniform vec3 uCorHalo;
uniform float uGrade;
uniform float uGradeQuente;
uniform float uVinheta;
uniform float uGrao;

varying vec2 outTexCoord;

// Bayer 4x4 em [0,1) — o mesmo papel da matriz da prévia.
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a) + 1.0 / 32.0; }

// hash sem seno (Hoskins): estável em qualquer GPU.
float hash(vec2 p, float s) {
  vec3 p3 = fract(vec3(p.xyx + s * vec3(113.5, 271.9, 57.3)) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float ruido(vec2 p, float s) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i, s);
  float b = hash(i + vec2(1.0, 0.0), s);
  float c = hash(i + vec2(0.0, 1.0), s);
  float d = hash(i + vec2(1.0, 1.0), s);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p, float s) {
  return 0.55 * ruido(p, s) + 0.3 * ruido(p * 2.1, s + 1.0) + 0.15 * ruido(p * 4.3, s + 2.0);
}

void main() {
  vec2 px = floor(outTexCoord * uResolucao);
  // y de TELA (0 = topo): a textura do framebuffer vem com y de baixo para cima.
  vec2 tela = vec2(px.x, uResolucao.y - 1.0 - px.y);
  vec3 cor = texture2D(uMainSampler, (px + 0.5) / uResolucao).rgb;
  vec3 original = cor;
  float d = bayer4(px);

  // 1 · NÉVOA — duas camadas; a velocidade é a da TELA (a amostra anda ao contrário).
  float baixo = pow(tela.y / uResolucao.y, uAltura);
  float f1 = fbm((tela - uVelTras * uTempo) / vec2(70.0, 26.0) + vec2(3.0, uTempo * uEvolucao), 3.0);
  float f2 = fbm((tela - uVelFrente * uTempo) / vec2(45.0, 18.0) + vec2(9.0, 0.0), 5.0);
  float f = clamp(((f1 * 0.6 + f2 * 0.4) - 0.35) * 1.6 * (0.35 + baixo), 0.0, 1.0);
  cor = mix(cor, uCorNevoa, floor(f * 3.0 + d) / 3.0 * 0.42 * uDensidade);

  // 2 · HALO — o que é quente e aceso, amostrado 7x7 com passo 2 na imagem ORIGINAL; respira em 2,4s.
  float soma = 0.0;
  for (int j = -3; j <= 3; j++) {
    for (int i = -3; i <= 3; i++) {
      vec3 s = texture2D(uMainSampler, (px + 0.5 + vec2(float(i), float(j)) * 2.0) / uResolucao).rgb;
      soma += step(uLimiarHalo, s.r) * step(s.g * 1.3, s.r);
    }
  }
  float v = floor(min(1.0, soma / 49.0 * 2.4) * 4.0 + d - 0.5) / 4.0;
  float respira = 0.8 + 0.2 * sin(uTempo * 6.2831853 / 2.4);
  cor += uCorHalo * max(v, 0.0) * uForcaHalo * respira;

  // 3 · CORREÇÃO DE COR — sombra para o petróleo, luz para o âmbar.
  float l = dot(clamp(cor, 0.0, 1.0), vec3(0.299, 0.587, 0.114));
  float sombra = 1.0 - l;
  float q = l * uGradeQuente;
  cor += uGrade * vec3(-6.0 * sombra + 10.0 * q, 3.0 * sombra + 3.0 * q, 8.0 * sombra - 8.0 * q) / 255.0;

  // 4 · VINHETA
  vec2 c = (tela - uResolucao * 0.5) / (uResolucao * 0.5);
  float vin = clamp((length(vec2(c.x, c.y * 0.9)) - 0.55) / 0.6, 0.0, 1.0);
  cor *= 1.0 - vin * uVinheta;

  // 5 · GRÃO — gaussiano aproximado, monocromático, semente trocada a 12 fps.
  float g = hash(px, uQuadroGrao) + hash(px + 17.0, uQuadroGrao + 0.3) + hash(px + 43.0, uQuadroGrao + 0.7) - 1.5;
  cor += g * uGrao * 9.0 / 255.0;

  gl_FragColor = vec4(clamp(cor, 0.0, 1.0), 1.0);
}
`;

export class AtmosferaPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  /** Escrito pelo controlador a cada quadro. `null` = passa a imagem sem tratamento. */
  perfil: PerfilAtmosfera | null = null;
  /** Segundos desde que a Atmosfera nasceu. */
  tempo = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: CHAVE_ATMOSFERA, fragShader: FRAG });
  }

  override onPreRender(): void {
    const p = this.perfil;
    this.set2f('uResolucao', this.renderer.width, this.renderer.height);
    this.set1f('uTempo', this.tempo);
    this.set1f('uQuadroGrao', Math.floor(this.tempo * 12));
    if (!p) {
      this.set1f('uDensidade', 0);
      this.set1f('uForcaHalo', 0);
      this.set1f('uGrade', 0);
      this.set1f('uVinheta', 0);
      this.set1f('uGrao', 0);
      return;
    }
    const [nr, ng, nb] = p.nevoa.cor;
    const [hr, hg, hb] = p.halo.cor;
    this.set1f('uDensidade', p.nevoa.densidade);
    this.set3f('uCorNevoa', nr / 255, ng / 255, nb / 255);
    this.set1f('uAltura', p.nevoa.altura);
    this.set2f('uVelTras', p.nevoa.velTras[0], p.nevoa.velTras[1]);
    this.set2f('uVelFrente', p.nevoa.velFrente[0], p.nevoa.velFrente[1]);
    this.set1f('uEvolucao', p.nevoa.evolucao);
    this.set1f('uForcaHalo', p.halo.forca);
    this.set1f('uLimiarHalo', p.halo.limiar);
    this.set3f('uCorHalo', hr / 255, hg / 255, hb / 255);
    this.set1f('uGrade', p.grade);
    this.set1f('uGradeQuente', p.gradeQuente);
    this.set1f('uVinheta', p.vinheta);
    this.set1f('uGrao', p.grao);
  }
}
```

- [ ] **Step 4: Write the controller**

Create `src/systems/atmosfera/Atmosfera.ts`:

```ts
import Phaser from 'phaser';
import { AtmosferaPipeline, CHAVE_ATMOSFERA } from './AtmosferaPipeline';
import { interpolarPerfil, type PerfilAtmosfera } from './perfis';

/**
 * A ATMOSFERA — o motor de névoa, luz e grão das cutscenes (spec 2026-09-25-atmosfera-engine-design.md §3.2).
 *
 *   const atm = new Atmosfera(scene, { limiteLimpo: DEPTH.TEXTO, profundidadePoeira: DEPTH.NAVE - 1 });
 *   atm.perfil(PERFIS.viscera);           // corte: troca seca
 *   atm.perfil(PERFIS.apagando, 4600);    // transição
 *   atm.update(dt);                       // no update da cena
 *   atm.fadeOut(ms);                      // o fade das DUAS câmeras
 *
 * A CÂMERA LIMPA: o que tem `depth >= limiteLimpo` (texto, painéis) é desenhado por uma segunda câmera, sem o shader;
 * a principal o ignora. A triagem é por profundidade, a cada quadro — os capítulos não precisam avisar nada.
 * A nave fica DENTRO do tratamento (na prévia ela assentou no ar da cena; limpa, pareceria colada).
 *
 * SEM WEBGL (renderer Canvas): nada é criado e todo método vira no-op; a cena roda como antes.
 */
export interface OpcoesAtmosfera {
  /** Daqui para cima, o objeto fica fora do tratamento. */
  limiteLimpo: number;
  /** A profundidade da poeira (abaixo da nave). */
  profundidadePoeira: number;
}

/** O que a sonda lê. */
export interface EstadoAtmosfera {
  ativo: boolean;
  perfil: string | null;
  densidade: number;
  grao: number;
  gradeQuente: number;
  /** Quantos objetos a câmera limpa está desenhando agora. */
  limpos: number;
}

const TEX_PX = 'atmPx';
/** Quanto vive cada grão de poeira (ms). */
const VIDA_POEIRA = 6000;

export class Atmosfera {
  private readonly ativo: boolean;
  private pipeline: AtmosferaPipeline | null = null;
  private limpa: Phaser.Cameras.Scene2D.Camera | null = null;
  private poeira: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private de: PerfilAtmosfera | null = null;
  private para: PerfilAtmosfera | null = null;
  private atual: PerfilAtmosfera | null = null;
  private transMs = 0;
  private transDecorrido = 0;
  private tempo = 0;
  private limpos = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opcoes: OpcoesAtmosfera,
  ) {
    this.ativo = scene.renderer.type === Phaser.WEBGL;
    if (!this.ativo) return;

    const renderer = scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    if (!renderer.pipelines.postPipelineClasses.has(CHAVE_ATMOSFERA)) {
      renderer.pipelines.addPostPipeline(CHAVE_ATMOSFERA, AtmosferaPipeline);
    }
    const cam = scene.cameras.main;
    cam.setPostPipeline(CHAVE_ATMOSFERA);
    this.pipeline = cam.getPostPipeline(CHAVE_ATMOSFERA) as AtmosferaPipeline;
    this.limpa = scene.cameras.add(0, 0, cam.width, cam.height, false, 'limpa');

    if (!scene.textures.exists(TEX_PX)) {
      const t = scene.textures.createCanvas(TEX_PX, 1, 1);
      if (t) {
        t.context.fillStyle = '#ffffff';
        t.context.fillRect(0, 0, 1, 1);
        t.refresh();
      }
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
  }

  /** Troca o perfil: `ms = 0` é o corte seco; `ms > 0` interpola todos os números. */
  perfil(p: PerfilAtmosfera, ms = 0): void {
    if (!this.ativo) return;
    if (ms <= 0 || !this.atual) {
      this.de = null;
      this.para = p;
      this.atual = p;
      this.transMs = 0;
      this.montarPoeira(p);
    } else {
      this.de = this.atual;
      this.para = p;
      this.transMs = ms;
      this.transDecorrido = 0;
    }
    if (this.pipeline) this.pipeline.perfil = this.atual;
  }

  update(dt: number): void {
    if (!this.ativo || !this.pipeline) return;
    this.tempo += dt;
    if (this.de && this.para && this.transMs > 0) {
      this.transDecorrido += dt * 1000;
      const k = Math.min(1, this.transDecorrido / this.transMs);
      this.atual = interpolarPerfil(this.de, this.para, k);
      if (k >= 1) {
        this.de = null;
        this.transMs = 0;
      }
    }
    this.pipeline.perfil = this.atual;
    this.pipeline.tempo = this.tempo;
    this.triar();
  }

  /** O fade para o preto nas DUAS câmeras (o texto some junto). */
  fadeOut(ms: number): void {
    this.scene.cameras.main.fadeOut(ms, 0, 0, 0);
    this.limpa?.fadeOut(ms, 0, 0, 0);
  }

  estado(): EstadoAtmosfera {
    const p = this.atual;
    return {
      ativo: this.ativo,
      perfil: p?.nome ?? null,
      densidade: p ? +p.nevoa.densidade.toFixed(3) : 0,
      grao: p ? +p.grao.toFixed(3) : 0,
      gradeQuente: p ? +p.gradeQuente.toFixed(3) : 0,
      limpos: this.limpos,
    };
  }

  /** Cada objeto vai para UMA câmera: a limpa (texto) ou a principal (o resto, com o shader). */
  private triar(): void {
    const main = this.scene.cameras.main;
    const limpa = this.limpa;
    if (!limpa) return;
    let n = 0;
    for (const o of this.scene.children.list) {
      const obj = o as Phaser.GameObjects.GameObject & { depth: number };
      if (obj.depth >= this.opcoes.limiteLimpo) {
        obj.cameraFilter = main.id;
        n++;
      } else {
        obj.cameraFilter = limpa.id;
      }
    }
    this.limpos = n;
  }

  /** A poeira do perfil: grãos de 1 px com a própria deriva e cintilar, já espalhados pela tela. */
  private montarPoeira(p: PerfilAtmosfera): void {
    this.poeira?.destroy();
    const { width: W, height: H } = this.scene.scale;
    const [r, g, b] = p.poeira.cor;
    const { deriva, espalhar, quantidade } = p.poeira;
    this.poeira = this.scene.add
      .particles(0, 0, TEX_PX, {
        x: { min: 0, max: W },
        y: { min: 0, max: H },
        lifespan: VIDA_POEIRA,
        speedX: { min: deriva[0] - espalhar, max: deriva[0] + espalhar },
        speedY: { min: deriva[1] - espalhar, max: deriva[1] + espalhar },
        alpha: { values: [0, 0.6, 0.45, 0.6, 0], interpolation: 'linear' },
        tint: (r << 16) | (g << 8) | b,
        frequency: VIDA_POEIRA / quantidade,
      })
      .setDepth(this.opcoes.profundidadePoeira);
    this.poeira.fastForward(VIDA_POEIRA);
  }

  private destruir(): void {
    this.poeira?.destroy();
    this.poeira = null;
    this.scene.cameras.main.removePostPipeline(CHAVE_ATMOSFERA);
    if (this.limpa) this.scene.cameras.remove(this.limpa);
    this.limpa = null;
    this.pipeline = null;
  }
}
```

- [ ] **Step 5: Wire into `CenaFinal` and the regente**

In `src/scenes/final/tipos.ts`, add the import after `import type { Fx } ...`:

```ts
import type { Atmosfera } from '../../systems/atmosfera/Atmosfera';
```

and add to `interface CenaFinal`, after `estado: EstadoFinal;`:

```ts
  /** O tratamento atmosférico (névoa, halo, grão): cada capítulo escolhe o próprio perfil. */
  atm: Atmosfera;
```

In `src/scenes/Interlude4Scene.ts`:
- add the import after `import { Fx } from '../systems/Fx';`:

```ts
import { Atmosfera } from '../systems/atmosfera/Atmosfera';
```

- add the field after `private fx!: Fx;`:

```ts
  /** Lido pela sonda (`atm.estado()`). */
  private atm!: Atmosfera;
```

- in `create`, replace `this.fx = new Fx(this);` with:

```ts
    this.fx = new Fx(this);
    // A ATMOSFERA (spec 2026-09-25): o texto fica limpo; a poeira mora logo abaixo da nave.
    this.atm = new Atmosfera(this, { limiteLimpo: DEPTH.TEXTO, profundidadePoeira: DEPTH.NAVE - 1 });
```

- replace `this.cena = { scene: this, fx: this.fx, nave: this.ship, estado: this.estado };` with:

```ts
    this.cena = { scene: this, fx: this.fx, nave: this.ship, estado: this.estado, atm: this.atm };
```

- replace `if (!this.done) this.cameras.main.fadeOut(T.FIM - T.FADE, 0, 0, 0);` with:

```ts
      if (!this.done) this.atm.fadeOut(T.FIM - T.FADE);
```

- replace the body of `update`:

```ts
  override update(_time: number, delta: number): void {
    this.capitulo?.update?.(delta / 1000);
    this.atm.update(delta / 1000);
  }
```

In `src/scenes/final/dentro.ts`:
- add the import: `import { PERFIS } from '../../systems/atmosfera/perfis';`
- right after `estado.capitulo = 1;` (line ~43) add:

```ts
  c.atm.perfil(PERFIS.viscera);
```

(If `c` is destructured under another name in `montarDentro`, use the `CenaFinal` parameter's name — the function signature is `montarDentro(c: CenaFinal, fundo)`.)

- [ ] **Step 6: Typecheck and run the probe**

Run: `npx tsc --noEmit`
Expected: exit 0. If `alpha: { values, interpolation }` or `fastForward` fail to typecheck in Phaser 3.90's types, check `node_modules/phaser/types/phaser.d.ts` for `EmitterOpInterpolationConfig` / `fastForward` and adapt to the typed form — do not cast to `any`.

Run: `node scripts/probe-interlude4.mjs`
Expected: the three new capítulo-1 asserts `✔`, everything else still `✔`, `✔ CUTSCENE FINAL DE PONTA A PONTA`.

- [ ] **Step 7: Verify the image is right-side up**

Run: `node scripts/_f8/_ver-final.mjs 600,1000 scripts/_f8/_folha-atm-t2.png` and Read the PNG.
Expected: névoa mais densa EMBAIXO (o perfil víscera cobre a tela, mas o gradiente cresce para baixo), halo quente em volta do núcleo, grão visível, vinheta nas bordas. If the fog is denser at the TOP, the framebuffer is not flipped in this path: change `vec2 tela = vec2(px.x, uResolucao.y - 1.0 - px.y);` to `vec2 tela = px;` and re-check.

- [ ] **Step 8: Commit**

```bash
git add src/systems/atmosfera/AtmosferaPipeline.ts src/systems/atmosfera/Atmosfera.ts src/scenes/final/tipos.ts src/scenes/Interlude4Scene.ts src/scenes/final/dentro.ts scripts/probe-interlude4.mjs
git commit -m "feat(atmosfera): o shader e o controlador — névoa, halo, cor, vinheta e grão na câmara D"
```

---

### Task 3: A curva nos sete capítulos

**Files:**
- Modify: `src/scenes/final/dentro.ts` (descompressão)
- Modify: `src/scenes/final/fora.ts`, `src/scenes/final/queda.ts`, `src/scenes/final/sobrevoo.ts`
- Modify: `scripts/probe-interlude4.mjs`

**Interfaces:**
- Consumes: `CenaFinal.atm.perfil(p, ms?)` (Task 2), `PERFIS.*` (Task 1), `T` de `./tempos`.
- Produces: nada novo — cada capítulo com o perfil da spec §4.

- [ ] **Step 1: Write the failing probe asserts**

In `scripts/probe-interlude4.mjs` add, each right after the chapter's `faltando` assert:

After `ok(c2.faltando === 0, ...)`:
```js
ok(c2.atm?.perfil === 'viscera' && c2.atm.densidade >= 0.6, `o estouro segue na víscera (${c2.atm?.perfil}, ${c2.atm?.densidade})`);
```

After `ok(c3b.faltando === 0, ...)`:
```js
ok(c3b.atm?.perfil === 'visceraSuccao', `na descompressão, a névoa é arrancada para o rasgo (${c3b.atm?.perfil})`);
```

After `ok(c4b.faltando === 0, ...)`:
```js
ok(c4b.atm?.perfil === 'vacuo' && c4b.atm.densidade >= 0.6, `fora, o vácuo — denso mesmo assim (${c4b.atm?.perfil}, ${c4b.atm?.densidade})`);
```

After `ok(c5.faltando === 0, ...)`:
```js
ok(c5.atm?.perfil === 'vacuoQueda' && c5.atm.densidade >= 0.6, `na queda, o vácuo mais frio (${c5.atm?.perfil}, ${c5.atm?.densidade})`);
```

After `ok(c6b.faltando === 0, ...)`:
```js
ok(c6b.atm?.perfil === 'superficie' && c6b.atm.densidade >= 0.6, `na superfície, névoa baixa (${c6b.atm?.perfil}, ${c6b.atm?.densidade})`);
const bannerLimpo = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const main = s.cameras.main;
  const limpa = s.cameras.getCamera('limpa');
  const textos = s.children.list.filter((o) => o.depth >= 100);
  return { n: textos.length, ok: !!limpa && textos.length > 0 && textos.every((o) => (o.cameraFilter & main.id) !== 0 && (o.cameraFilter & limpa.id) === 0) };
});
ok(bannerLimpo.ok, `o banner fica FORA do tratamento, na câmera limpa (${bannerLimpo.n} texto[s])`);
```

After `ok(c7.capitulo === 7, ...)`, replace nothing — add:
```js
ok(c7.atm?.perfil === 'apagando', `no apagar, o perfil é o apagando (${c7.atm?.perfil})`);
```

After `ok(c7b.lavaCarcaca === 0, ...)`:
```js
ok((c7b.atm?.gradeQuente ?? 1) < 0.5 && c7b.atm.densidade >= 0.6, `o âmbar esfriou e a névoa NÃO sumiu (gradeQuente=${c7b.atm?.gradeQuente}, densidade=${c7b.atm?.densidade})`);
```

- [ ] **Step 2: Run the probe to verify it fails**

Run: `node scripts/probe-interlude4.mjs`
Expected: `✘` em cap 3 (`viscera` em vez de `visceraSuccao`), cap 4, cap 5, cap 6 e cap 7 (o perfil fica `viscera` a cena toda); o banner já deve passar (a triagem é da Task 2). Exit 1.

- [ ] **Step 3: Set each chapter's profile**

`src/scenes/final/dentro.ts` — inside the `scene.time.delayedCall(T.DESCOMPRESSAO, () => {` callback, right after `estado.capitulo = 3;`:
```ts
      c.atm.perfil(PERFIS.visceraSuccao);
```

`src/scenes/final/fora.ts` — add `import { PERFIS } from '../../systems/atmosfera/perfis';` and, right after `estado.capitulo = 4;`:
```ts
  c.atm.perfil(PERFIS.vacuo);
```

`src/scenes/final/queda.ts` — add `import { PERFIS } from '../../systems/atmosfera/perfis';` and, right after `estado.capitulo = 5;`:
```ts
  c.atm.perfil(PERFIS.vacuoQueda);
```

`src/scenes/final/sobrevoo.ts` — add `import { PERFIS } from '../../systems/atmosfera/perfis';`; right after `estado.capitulo = 6;`:
```ts
  c.atm.perfil(PERFIS.superficie);
```
and inside the `apagar` callback, right after `estado.capitulo = 7;`:
```ts
    // A névoa esfria junto com a lava — mas NÃO some (o piso dele): 4,6s até o fade.
    c.atm.perfil(PERFIS.apagando, T.FADE - T.APAGA);
```

- [ ] **Step 4: Run all checks**

Run: `npx tsc --noEmit` → exit 0.
Run: `node scripts/test-atmosfera-perfis.mjs` → `✔ PERFIS DA ATMOSFERA`.
Run: `node scripts/probe-interlude4.mjs` → todos `✔`, `✔ CUTSCENE FINAL DE PONTA A PONTA`.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/final/dentro.ts src/scenes/final/fora.ts src/scenes/final/queda.ts src/scenes/final/sobrevoo.ts scripts/probe-interlude4.mjs
git commit -m "feat(atmosfera): a curva dramática nos sete capítulos — densa do começo ao fim, o âmbar esfria no apagar"
```

---

### Task 4: A folha, o olho dele e o registro

**Files:**
- Create: `docs/superpowers/folhas/2026-09-25/atmos-real-capitulos.png` (gerada)
- Modify: `docs/superpowers/plans/2026-09-25-fatia8-retomada-START.md`, `docs/HANDOFF.md` (🧭)

**Interfaces:**
- Consumes: a cena com a Atmosfera (Tasks 2–3).
- Produces: a folha de comparação e o registro da retomada.

- [ ] **Step 1: Generate the real sheet**

Run: `node scripts/_f8/_ver-final.mjs 400,1800,4300,8800,16800,24800,36800,39500 docs/superpowers/folhas/2026-09-25/atmos-real-capitulos.png`
Expected: `folha: docs/superpowers/folhas/2026-09-25/atmos-real-capitulos.png`.

- [ ] **Step 2: Compare with the approved preview**

Read `atmos-real-capitulos.png` and `atmos-abc.png` (coluna C). Checklist, one by one:
- névoa em degraus de dither (não lisa), mais densa embaixo, em TODOS os capítulos;
- halo em volta da lava e do rastro da queda; nada de brilho nas costelas nem no casco;
- o banner do sobrevoo nítido, sem grão;
- no quadro de 39,5s, a lava quase apagada e a névoa AINDA presente.
If a term reads stronger/weaker than the preview, adjust ONLY numbers in `perfis.ts` (never the shader) and re-run Step 1.

- [ ] **Step 3: Show him and wait for the verdict**

Open the sheet for him (`start "" docs/superpowers/folhas/2026-09-25/atmos-real-capitulos.png`) and ask him to watch live (`F` no menu, `http://localhost:5173/`). Calibrations he asks for go into `perfis.ts`; re-run `node scripts/test-atmosfera-perfis.mjs` and `node scripts/probe-interlude4.mjs` after each change.

- [ ] **Step 4: Update the resume docs**

In `docs/superpowers/plans/2026-09-25-fatia8-retomada-START.md`, add under "🎬 A CENA COMO ESTÁ" a paragraph:

```markdown
**A ATMOSFERA (25/09):** a cena inteira passa pelo motor `src/systems/atmosfera/` (spec
`specs/2026-09-25-atmosfera-engine-design.md`): névoa em dither, halo lido da imagem, correção de cor, vinheta e grão,
com a curva dramática por capítulo (`viscera` → `visceraSuccao` → `vacuo` → `vacuoQueda` → `superficie` →
`apagando`) e piso de densidade 0,6. Calibrar = mexer em `perfis.ts`. Teste: `node scripts/test-atmosfera-perfis.mjs`.
```

In `docs/HANDOFF.md`, in the 🧭 section "**7 · As dívidas registradas pelas fatias**" table, add a row:

```markdown
| Fatia 8 (Atmosfera) | aplicar a Atmosfera nas cutscenes 1, 2 e 3 (o motor está pronto: perfis novos + 4 linhas por cena) |
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/folhas/2026-09-25/atmos-real-capitulos.png docs/superpowers/plans/2026-09-25-fatia8-retomada-START.md docs/HANDOFF.md src/systems/atmosfera/perfis.ts
git commit -m "docs(f8): a Atmosfera na cena — a folha real, o registro e a dívida das outras cutscenes"
```
