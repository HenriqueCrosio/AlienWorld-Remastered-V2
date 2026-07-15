# Plano técnico

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Engine | **Phaser 3** (Arcade Physics) | 2D web maduro, `pixelArt: true` + `roundPixels` nativos, WebGL com fallback canvas. Bundle final ~1-2 MB. |
| Linguagem | **TypeScript** (strict) | O jogo é data-driven (armas, inimigos, waves em JSON). Tipos evitam que um typo em `weapons.json` vire bug de runtime. |
| Build | **Vite** | HMR instantâneo, build estático. |
| Áudio | Phaser Sound (Web Audio) | Já vem. Sem dependência extra. |
| Persistência | `localStorage` | Sucessor direto do `PlayerPrefs` do v2. |
| Deploy | **itch.io** + Vercel/GitHub Pages | Estático, sem servidor, sem custo. |
| Assets | **PixelLab** → atlas | Ver `ASSETS.md`. |

**Rejeitado — Unity WebGL:** bundle de 20-40 MB, loading longo, performance ruim em mobile.
Como o código-fonte original está perdido, não há nada para portar — a inércia que justificaria
continuar na Unity não existe.

## Resolução e escala

- **Resolução base: 384 × 216** (16:9). Escala por inteiro: ×5 = 1920×1080 exato.
- `Phaser.Scale.FIT` + `pixelArt: true` + `roundPixels: true`. Nunca escalar por valor fracionário.
- Câmera com `setZoom` inteiro. Nada de sprites em posições sub-pixel — quebra a arte.

## Arquitetura

```
src/
  main.ts                 # config do Phaser, registro de cenas
  scenes/
    BootScene.ts          # carrega atlas + JSONs
    MenuScene.ts          # menu, escolha de CONDUÇÃO, seleção de modo
    GameScene.ts          # a partida (campanha ou sobrevivência)
    HudScene.ts           # overlay: vidas, arma, munição, score, bombas
    GameOverScene.ts      # medalhas (bronze/prata/ouro), recorde
  flight/
    FlightController.ts   # interface: update(input, ship)
    FlapController.ts     # gravidade + impulso  ← física herdada do v2
    FreeController.ts     # 8 direções, sem gravidade
  systems/
    WeaponSystem.ts       # dispara a arma equipada, gasta munição, volta pra base
    SpawnSystem.ts        # lê waves da fase e instancia inimigos no tempo certo
    DifficultySystem.ts   # curva por lerp (só no modo Sobrevivência)
    PickupSystem.ts       # drops de arma
    FxSystem.ts           # explosões, screen shake, hitstop, flash
  entities/
    Ship.ts  Enemy.ts  Bullet.ts  Boss.ts  Pickup.ts  Asteroid.ts
  data/
    weapons.json  enemies.json  stages/stage1.json ...
```

### A abstração central: `FlightController`

```ts
interface FlightController {
  readonly id: 'flap' | 'free';
  update(ship: Ship, input: InputState, dt: number): void;
}
```

`GameScene` instancia o controller escolhido no menu e nunca mais pergunta qual é. Inimigos,
armas, waves e bosses **não sabem** qual condução está ativa. O único lugar que consulta o `id`
é o balanceamento (multiplicador de score, raio da hitbox).

`FlapController` reproduz a física do v2: gravidade constante, impulso no input, leitura do input
desacoplada do passo de física (o v2 fazia flag no `Update` e força no `FixedUpdate` — em Phaser,
o equivalente é ler o input no `update` e aplicar velocidade com `dt` fixo).

### Data-driven

Armas, inimigos e waves vivem em JSON, não em código. Balancear o jogo não pode exigir recompilar
nem editar `.ts`. Uma wave é:

```json
{ "t": 4.5, "type": "batedor", "count": 3, "spacing": 0.4, "y": 120, "pattern": "sine" }
```

## Object pooling

Projéteis, inimigos e partículas são reciclados em pools desde o começo — não é otimização
prematura, é arquitetura. Num shmup, instanciar/destruir a cada frame trava o GC do navegador.
(O v2 já fazia o equivalente ao se autodestruir fora da tela; aqui a gente recicla em vez de destruir.)

## Milestones

| # | Entrega | Critério de "pronto" |
|---|---|---|
| **M0** | Setup: Vite + TS + Phaser, canvas pixel-perfect, deploy vazio no itch | Uma nave placeholder aparece na tela na resolução certa, e o link público abre. |
| **M1** | Voo: as duas conduções, com arte placeholder | Dá pra alternar Flap/Livre no menu e sentir a diferença. **É aqui que se descobre se a ideia é boa.** |
| **M2** | Combate: tiro, pool de balas, inimigos, dano, morte, explosões | Dá pra matar e morrer. Com juice (shake, hitstop, flash). |
| **M3** | **Vertical slice:** Fase 1 inteira + boss + armas + HUD + game over | Um jogo curto, completo e jogável de ponta a ponta, nas duas conduções. |
| **M4** | Pipeline PixelLab + arte final da Fase 1 | A Fase 1 deixa de ter placeholder. Define o padrão visual de tudo. |
| **M5** | Fases 2, 3 e 4 + seus bosses | Campanha completa. |
| **M6** | Modo Sobrevivência (Legacy) + medalhas + recorde | O v2 preservado, com a arte nova. |
| **M7** | Polimento: áudio, menu, opções, touch/mobile, release | Publicado no itch.io. |

**M3 é o marco que importa.** Antes dele, nada de fase 2, nada de arte final, nada de áudio.
Um vertical slice jogável responde a pergunta que nenhum documento responde: *o jogo é divertido?*

## Riscos

1. **A condução Flap pode não funcionar num run'n'gun.** Mirar e atirar enquanto luta contra a gravidade pode ser miserável em vez de desafiador. *Mitigação:* M1 existe justamente para testar isso cedo, com placeholder. Se não funcionar, o Flap recua para o modo Sobrevivência apenas — e o plano sobrevive.
2. **Consistência visual do PixelLab.** Geradores tendem a variar estilo entre chamadas. *Mitigação:* paleta travada e prompt base fixo (ver `ASSETS.md`); revisão manual no Aseprite é esperada, não é falha.
3. **Level design que precisa funcionar nas duas conduções.** *Mitigação:* corredor apertado só entra depois de testado no Flap.
