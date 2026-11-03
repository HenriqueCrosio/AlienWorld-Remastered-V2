# 31/10 (3): zero-g — the ball on jets and the missile rain

His note on `corpo-cor.html`: "o quique e a chuva não condizem com gravidade zero" (the F3 is vacuum: the HUD's ZERO-G,
the GDD's diegetic gravity). He wants these two fixed before giving feedback on the other skills.
- The rain → small missiles that come back down pushed by their engines (his idea).
- The bounce → "uma bola com propulsores, semelhantes aos usados no menu inicial... É possível?" (his idea).

The sheet is `gravidade-zero.html`, waiting for his answers.

## How it works (mock: `scripts/_serpente/_habilidades-maquete.mjs`)
- **The menu's rule** (`src/menu/abertura.ts`): the motion comes first; each nozzle fires with force max(0, −a·u)/G,
  where u is the direction its gas leaves in. Gas colours are the menu's (hot white → amber → cold vapour). In vacuum
  there is no drag and no wind, and the gas keeps the body's velocity.
- At native size, 1 px gas alone does not read as fire, so the flame is pixel-drawn at the nozzle (its length follows
  the force) and the particles are only the vapour and the sparks.
- **The ball** (`quicante jato=natural|altura|mira`):
  - It is spat as before; the nozzles light 0.12 s later (until then it flies straight).
  - In flight, the top nozzle pushes down with G = 420, the old mock's gravity, so the arc is the same parabola.
  - The hull is a real collision (restitution 0.8, sparks, squash).
  - `altura`: the bottom nozzles kick for 0.1 s to restore each head's height.
  - `mira`: `altura`, plus the side nozzles set the next landing under the ship, at take-off only.
- **The missiles** (`misseis`):
  - A salvo of 9 per head goes straight up and out with the engines off.
  - Each wave re-enters nose-down from rest just above the screen, accelerating at 160 px/s², so it is slow at the top.
  - They burst on the hull: a core, a ring in the head's colour, sparks.
  - There are 10 slots of 22 px, all in front of her; the old 12 slots dropped missiles on her.
- **The trail** (dotted, last 1.6 s) is for reading the arc in the mock only; `rastro=0` turns it off.

## Files
- `maquete3-quic-{gravidade,altura,natural,mira}.webm`
- `maquete3-misseis.webm`
- `quique-quadro-a-quadro.png`
- `misseis-estouro.png`
- `ferramentas/verifica-folha.mjs` (headless sheet check: images, videos, errors)

## His answers (31/10, after the sheet)
- **The missiles are approved:** "Os misseis ficaram bons, depois vemos o formato que eles farão".
- **The three ball versions are rejected:**
  - "os propulsores ficaram desenhados na bola, eu pensei em algo mais parecido com jatos de propulsao de estabilzadores
    mesmo. Algo mais natural, todos os exemplos ficaram muito irreais e duros de movimento."
  - Asked with options, he chose "a bola de verdade" (a smooth arc, it spins, loses height each bounce, discreet
    puffs) PLUS "instável, brigando" (it wobbles, the puffs fight to hold it on course).
  - The gas is cold and white, with no fire.
  - The release: "Uma delas precisa sair antes e mais alta, a segunda meia altura e depois da 1 e assim
    sucessivamente."
  - → Round 4: `quicante jato=vivo`.

## Round 4: the live ball (`bola-viva.html`, waiting for his answers)
Command: `quicante jato=vivo ordem=ciano,laranja,verde acoes=2,9,16 boca.ciano=26,84 boca.laranja=106,98
boca.verde=64,85` on the `tirosK` clip. The normal shots' clip spits the heads one at a time, so each ball leaves its
own open mouth. The quicante clip spits all three together, so the ball's own sequential animation comes later.
- **No drawn nozzles.** The cold white puffs leave the ball's skin: a white flash at the vent, then a short cone.
- **A real ball.** It follows a ballistic arc, loses height each bounce (restitution 0.85) and spins (a seam band
  across the disc; the hull's friction turns into spin). The squash rings like a spring.
- **Unstable.** A push and a twist drift (Ornstein–Uhlenbeck, 0.3 s memory, `instavel` scales them).
  - The ball chases its own ideal ballistic path, which restarts at each real bounce and keeps the intended sideways
    speed. Restarting from the real one let the drift add up until a ball almost stopped.
  - The owed push (G down + a spring, ω 8, damping 0.55) fires as one pulse once it is worth 60 px/s (sigma-delta,
    like real attitude thrusters), so the puffs fight, overshoot and settle.
  - The spin is braked by tangential puff pairs.
- **The release in steps.** The cyan ball leaves first and highest (112 px), the orange later at half, the green last
  at half again; the stagger is ~0.58 s, the clip's action frames.
- **Fixed:** a release could fire twice when a frame landed exactly on its time (now a once-flag).
- **Mocks:** `maquete4-bola-brigando.webm` (instavel 1), `maquete4-bola-calma.webm` (instavel 0.5),
  `bola-viva-quadros.png`.
- **Questions:**
  1. Is the motion natural now?
  2. Which intensity?
  3. Is the release right?

## The bounce is OUT (his call, after `bola-viva.html`)
- "O que eu pedi é dificil e eu reconheço, mesmo gostando muito da skill de quique, precisamos adimitir que será
  dificil."
- He gave each head an identity: **cyan = the beam, green = gas/poison, orange = the spark**.
- The new skill replacing the bounce, from his description:
  - the green releases gas around them and a little in front;
  - the orange sparks it;
  - plasma-shaped fires head for the ship and fragment;
  - the ship dodges as it can.
- He asked whether this is more plausible physically.
- My answer: yes, with four rules:
  1. the gas carries its own oxidizer (a premixed propellant), because nothing burns in vacuum otherwise;
  2. in vacuum it does not hang or rise, it spreads evenly and thins, so it is dense, and burnable, only near the
     mouths; that explains both the zone and why the spark comes quickly;
  3. zero-g fire is round, so "plasma-shaped" is literally right;
  4. the fireballs go straight, inheriting the breath's velocity plus the blast's push away from the spark point, and
     they cool and fade with distance; fragments open around the parent's line (momentum).
- Open decisions:
  - does the ship's shot ignite the gas too? Physics says it would;
  - the fragment pattern;
  - does the gas itself hurt?

## The gas + spark mock (`gas-faisca.html`, waiting for his answers)
His choices:
- **The ship's shot ignites the cloud too, and the blast returns onto her**, but only after some shots: a hit heats the
  REGION it hits and a small radius around it (not the whole cloud), and the hint is subtle.
- **INCENDIÁRIO** ignites at the first touch.
- **The sparks:** 2–3 per use.
- **The fragments:** a readable fan.
- **Only the fire hurts.**

Command: `gas <casco> <clip> <out> [contra=1 | carta=1]`. She idles: the green-breathing and orange-sparking clips
come after approval.

How the mock works:
- **The gas** is particles from the green mouth: 75% forward (at the ship, ±0.5 rad, 28–66 px/s), the rest all
  around. Each particle's weight falls with age, which is the thinning. The density is a 2-px grid summed over 3×3
  cells, drawn with an ordered dither.
- **The spark** flies to the cloud's ROOT, just behind the green mouth, and lights it there, so the blast pushes along
  the breath. Lit from the orange mouth itself, the fire went up-left.
- **The flame front** expands at 170 px/s and lights only the shell it crosses each frame.
  - **Bug found by measuring:** the whole disc kept lighting the fresh breath for 1.3 s, so the front of the cloud
    never refilled and the ship's shots never found gas.
- **The globes:**
  - 4 pockets, farthest-point spread over the cloud;
  - each is pushed away from the light point (85 px/s) plus the breath (20 px/s);
  - each splits at 0.55 s into 3 at ±24°, and they cool off by 1.9 s.
- **The sparks** come at 1.6 / 3.4 / 5.2 s, about 1.8 s apart, so the cloud refills and the three volleys match.
- **The ship's heat:**
  - each frame a round is in the gas, it heats a 3-cell radius by 0.5 × min(1, density/2);
  - the heat decays with τ 3 s (`tau`), and the cloud ignites at 3.5 (`ign`) where the gas is denser than 0.9;
  - result: lit at t=3.10, after the first volley and before the second spark.
  - The first try heated only on first contact and never ignited: the dense gas sits behind her cyan head (x≈286),
    where the shots stop at x 244.
- **The hint:** a sparse amber shimmer of its own where it is heated. Tinting only the gas's pixels hid it, because the
  front of the cloud is its thinnest part.
- **Her hit flash:** quick and light (0.32 towards warm white, fading in ~0.1 s). The first version washed her art beige.
- **Physics shown as is:** pockets on the ship's side of the light point are pushed TOWARDS the ship (both ways).
  This is a question for him.

## Open questions on the sheet (round 3)
1. Which way to pilot the ball (or a mix, e.g. hold the height first, aim when she is hurt)?
2. The fire colour: the menu's amber gas, or each head's colour?
3. Do the missiles stay like this (the flip off-screen, the slow entry as the warning)?

## His answer to `gas-faisca.html` (01/11)
- "O fogo vai sair em forma e comportamento de plasma, bolas maiores como se fossem geleias [...] e se desfazer ou
  desgrudar em pequenos pedaços. [...] quero o comportamento de algo viscoso, como se fosse liquido."
- "Quando a nave explode o gas com o tiro, precisa ficar claro que o jogador conseguiu quebrar isso.... talvez uma
  explosão apontando para a cara das serpentes?" This also answers the old question 3: the blast goes onto her, and
  nothing comes back at the ship.
- "o gas saindo da cabeça verde fica nítido, mas não existe nada saindo da cabeça laranja que mostre que é ela fazendo
  isso."
- He did not comment on the counter's timing or the heat hint, so they stay as they were.

## Round 6: the burning jelly (`geleia-plasma.html`, waiting for his answers)
Commands (same `C` as round 5): `gas $C out geleia=pinga|racha`, `gas $C out contra=1`, `gas $C out carta=1`; the
counter and the card use `pinga`. `png=<dir>` keeps the frames and `rastreia=<file.json>` logs the jelly positions
(the zoomed strips come from both).

**The jelly** is a soft body:
- its outline is a circle plus two wobble modes, l = 2 (the oval) and l = 3 (the trefoil);
- the modes ring like a liquid drop: ω_l² ∝ l(l−1)(l+2)/R³, f0 3.2 Hz at R 7, capped at 9 Hz;
- the damping grows as the drop shrinks (viscosity), so small drops ring faster and settle sooner;
- the burning skin boils: random pushes on the modes (Euler–Maruyama, σ 2.3);
- the launch squashes it along the push (l = 2, −0.3), so it leaves wobbling;
- its radius is 7.5–9.5 (it was 4.5), set by the pocket's density.

**How it comes apart.** A lobe is a push on l = 2 plus l = 3, so it is one lobe, not two. At the push's peak (a
quarter of its own period) a drop pinches off the tip. The drop and the rest are joined by a THREAD:
- the thread is a capsule in the field;
- its width is w0·(L0/L)^0.9, so it thins as it stretches;
- it snaps under 0.68 px and leaves a 1.1 px satellite drop in the gap (Rayleigh–Plateau);
- when it snaps, both ends spring back.

The two variants:
- `pinga` sheds a drop sideways (a little back, alternating sides) every 0.26–0.38 s. Each drop is 9–13% of the
  mass, and the main blob recoils (momentum).
- `racha`: at 0.38 s it stretches sideways (+0.5) and tears into two halves of 36% each, at ±34 px/s, which is the
  ±24° fan. The middle 20% stays on the line, joined to each half by a 2.2 px thread.

**Drawing.** Everything is ONE metaball field, so the necks and pinch-offs read:
- the kernel is (1 − s²)², with s = d / (1.42 r(θ)), and the threshold is 0.25;
- the layers come from the depth of the deepest body: near-white core above 0.62, orange body above 0.3, then red;
- there is a dark-red skin where the field is under 0.39, and a sparse glow under 0.25;
- the colours mix from hot to cool as it cools, and it shrinks to 85%;
- the bigger blobs get a hard white highlight up-left (the wet shine).

**Lifetime.** It cools and goes out in a puff of soot. A main blob lives 2.6 s; a drop lives 1.1–1.6 s.

**The hull.** A blob that reaches it splats there, viscous with no bounce: it flattens, burns for up to 0.9 s and
smokes.

**The orange's spark:**
- **The wind-up (0.6 s):** her mouth glows, growing (r 2→5) and pulsing, with a dithered halo on her snout, and
  crackles streak sparks out of the jaws.
- **The strike:** a flash, a jagged 2-px arc from her mouth to the cloud's root (a new zigzag each frame, 0.1 s), and
  22 streak sparks.

**The counter, the flashback:**
- Lit from the ship's side, the thin gas there only flashes, so no pockets fly at the ship.
- The front runs back to their mouths. When it reaches a face, the gas in front of that face (12 px) is thrown into it
  at 160 px/s, away from the light point: R 6.5 for the green, 5.5 for the others.
- On contact it STICKS (flattened across the hit, ringing a little) and burns for 0.9 s, its soot leaving from the
  rim; drawn over its middle, the soot read as a grey smudge.
- Each hit is a burst pointed into the face (R 26 green / 20, 0.46 s), with a thin shock ring and 18–26 streak
  sparks.
- Her reaction to each hit:
  - a hit flash;
  - a knock-back (a spring, ω 16, she and her mouths move together);
  - a 2-px screen shake;
  - soot;
  - and the green stops breathing.
- The counter lit at t = 2.97, during the orange's wind-up for the 2nd spark, so the player cuts that spark. The
  card lit at 0.97, before any wind-up. The hits come in sequence: cyan, then green 0.1 s later, then orange 0.3 s
  later.

**Files:**
- `maquete6-geleia-pinga.webm`, `maquete6-geleia-racha.webm`, `maquete6-contra.webm`, `maquete6-carta.webm`
- `geleia-pinga-quadros.png`, `geleia-racha-quadros.png`, `faisca-laranja.png`, `contra-na-cara.png`

**Questions:**
1. A or B, or a mix (B that then drips)?
2. Does the counter now read as broken?
3. Does the spark read as the orange's?

## His answer to geleia-plasma.html (01/11)

- "B que depois pinga, o resto ficou bom" — the counter and the spark are approved.
- "o Leque de plasma precisa dar espaço suficiente para a nave conseguir achar o melhor caminho sem tomar dano, vi nas
  gravações que alguns pingos pequenos ficam bem no espaço criado. Se a serpente é setada para fazer o ataque 3x,
  pensei em criar 3 padroes, um para cada tiro. Quem perceber, aprende a tecnica."
- "a pessoa que não tem o incendiar precisa carregar uma pequena barrinha que vai aparecer ao lado do boss [...] um
  termometro pequeno que sobe a temperatura, quando chegar, explode de volta na serpente. Por isso a propria serpente
  precisará ter um carregamento [...] a vermelha vai carregar alguns segundos [...] e atirar. Isso dá para o jogador
  ler o ataque [...] Caso tenha incendiar, a barrinha de termometro pega fogo e explode. O que acha?"
- "A cabeça verde que solta o gás precisa fazer com que o gás saia da boca ou do nariz como um vapor para baixo em
  forma de leque instável, hoje em dia ele está solto no rosto dela."
- Asked with options, he chose: the thermometer **resets at every spark** (not kept across them), and **the three
  dodges** as the patterns (not three fixed places on the screen).

## Round 7: the three dodges and the thermometer (01/11)

Sheet: `termometro-esquivas.html`. Script: `scripts/_serpente/_habilidades-maquete.mjs gas [contra=1 | carta=1]`
(the round-6 version is backed up in the session scratchpad; the `geleia=pinga|racha` branches are still there).

**The breath:**
- It leaves the front of the green's open jaws (the mouth point − (3, −1.5)) at ~50° under the horizontal, past the
  cyan's chin. At 36° the sway laid it across the cyan's face.
- The fan is ±0.22 rad, its width breathing ±0.06; its aim sways by two sines (±0.1 at 0.8 Hz, ±0.05 at 2.1 Hz); it
  comes in puffs (1.3 Hz); each wisp curls a little (±0.3 rad/s).
- The mouths follow the idle frame: measured offsets per frame (the green and the orange by the mouth, the cyan by
  its skull, since its jaw opens), up to ~4 px.
- On the hull it becomes a wall jet: it slows (0.45–0.8), lifts slowly, lingers 1.4–2.4 s more, so a low bank builds
  in front of her.
- The young wisps (< 0.5 s) are drawn one by one, so the stream reads leaving her jaws.

**The patterns (the orange's arc is the cause and the tell):** the arc strikes a pocket of the breath (20 px down its
axis) from behind, and the pocket's blast throws it away from the strike, at the ship.

| Spark | Tell | Jelly | Dodge |
|---|---|---|---|
| 1st, the fan | one arc | one blob R 9.5 at 88 px/s, aimed at the ship, torn ACROSS into three at 0.32 s | step out of the line |
| 2nd, the rails | a forked arc | two blobs R 7.5 at 80 px/s, aimed 30 px above and below the ship, torn ALONG into trains | hold still |
| 3rd, the file | three arcs, 0.4 s apart | three blobs R 7 at 104 px/s, each aimed where the ship is at its strike, flying whole until 0.85 s, then torn along | keep moving |

**"B que depois pinga":**
- After the tear, each piece drips only off its BACK: a lobe swells there, and the drop leaves 14–26 px/s slower than
  the piece, so it trails in the same lane.
- A drop is as hot as its piece and never outlives it.
- The satellite a thread leaves across a gap (the fan's tear) burns out in 0.2 s.

**Measured** against the ship's hitbox (21×9) and each piece's visible radius (with the wobble):
- the right dodges keep a minimum gap of 12.7 px over the whole run, with no touch;
- each wrong dodge gets hit: still on the fan's line, stepping 27 px in the rails, or stopping after any strike of the
  file.

**The thermometer:**
- **Where:** beside her, at x 370 (a 3-px glass, 40 tall, a 7-px bulb, a hot tick at the top). It fades in with the
  breath and out after the skill.
- **What fills it:** each shot that crosses the gas adds 1/12 × min(1, thickest density crossed / 1.2), counted when
  the shot reaches her body. The shot now dies at her real left edge, row by row; it used to die at x 244.
  - About 12 shots fill it, ~1.5 s of steady fire into the bank.
  - It cools 0.04/s.
- **Reset:** at each spark it drains in ~0.3 s with the glass darkening, and shots already in the air do not count
  for 0.5 s.
- **Full:** a white flash and a halo, then the flashback. The front runs up the breath into the green's mouth, and
  that blast splashes jelly onto the orange (+0.06 s) and the cyan (+0.13 s) at 210 px/s.
- **The card:** it shoots to the top, catches fire (flames over its top and sides) for 0.34 s, and bursts into 14
  shards with a small blast.
- **The orange's charge:** 2.5 s (it was 0.6 s), its pulse quickening.
- **Timing:** sparks at 3.6, 7.1 and 10.6 s.
- **The counter mock:**
  - the ship starts late and reaches 0.21: reset;
  - the fan's dodge takes it out of the gas, so it reaches 0.49: reset;
  - holding still through the rails, it keeps firing and fills at 9.77 s, before the 3rd spark.

**The consequence:** the gas the ship can reach is now LOW, in the bank on the hull, because the breath's upper part is
in front of her body and her body takes the shot first. Filling the thermometer means flying low. So:
- the 1st window is the easiest (nothing flying yet);
- the 2nd is hard (the fan's dodge leaves the gas);
- the 3rd fits the rails' dodge (holding still).

**Files:**
- `maquete7-esquivas.webm`, `maquete7-termometro.webm`, `maquete7-carta.webm`
- `mapa-leque.png`, `mapa-trilhos.png`, `mapa-fila.png`
- `geleia-b-pinga.png`, `vapor-verde.png`, `termometro-quadros.png`, `termometro-carta.png`

**Questions:**
1. Does the breath now read as leaving the green's mouth?
2. Does the orange's tell (one arc, a forked arc, three arcs) say which dodge is coming?
3. Is the thermometer's place and pace (~12 shots, 1.5 s) right? Is it OK that the gas lies low, so heating it means
   flying low?

## His answer to termometro-esquivas.html (01/11): APPROVED

"Eu gostei do resultado, da posição do gás, e o padrão da faísca para saber a esquiva ficou excepcional. O termômetro e
ritmo ficaram ótimos."

All three questions are answered yes: the breath from the mouth, the arcs as the tell, and the thermometer's place and
pace, with the low gas. The gas + spark skill is closed as a mechanic. Still to do: its own animations (the green
breathing out, the orange charging and sparking its three tells) and its installation in the game.

## Round 8: the cyan's beam, the signalled sweep (01/11)

Asked what comes next, he chose to close the beam first; asked how, he chose **the signalled sweep** (not "the aim
that locks", not "as it is"). Sheet: `raio-varredura.html`. Script: `_habilidades-maquete.mjs varredura <casco> <clip>
<out>` (no clip used; she idles, her mouths following the idle frame).

**The design:**
- The beam leaves the cyan's mouth and sweeps a SLICE of the screen, never all of it.
- A slice is given by where its lines meet the left edge (y), so it pivots on her mouth.
- The sweep is steady in that edge-y. Mixing the angles wrapped at the horizontal and swept the beam the wrong way, through her.
- Three casts per use, always in this order:

| Cast | From → to (left-edge y) | Charge | Sweep | Safe |
|---|---|---|---|---|
| top slice | −10 → 90 | 1.6 s | 0.9 s | under its stop line |
| bottom slice | 150 → 60 | 1.6 s | 0.9 s | over it |
| almost all | −10 → 141 | 2.0 s | 1.3 s | the wedge under her jaw, by the hull |

- Each cast holds 0.25 s at its stop line and thins out, then pauses 0.7 s.
- Where the beam meets the hull, it is cut there with sparks; none of the three slices reaches it today.

**The warning, while she charges:**
- the start line, dotted, brightening;
- the stop line, dashed, kept until the beam gets there;
- the slice between them, Bayer-dithered blue (density 0.08→0.2, alpha 0.36); once it fires, only the part still to come;
- three dots running from the start line to the stop line, which give the turn's direction;
- her mouth's glow growing and pulsing faster, and a white flare when it fires.
The first, fainter version did not read in 1.6 s.

**The beam (provisional):** 12 px, a white core, her blue, a dark edge, a pixel of tremor.

**Measured** against the hitbox (21×9) and the beam's half-width:
- the mannequin clears each cast by 19.1, 13.9 and 12.4 px;
- a ship staying mid-screen is hit in all three;
- each slice's safe place is hit by another slice.

**Physics:** in vacuum the beam is straight; it turns because her head turns. Her current clip only trembles in place,
so the beam's animation must turn the head with the sweep (the animation phase).

**Files:**
- `maquete8-varredura.webm`
- `raio-avisos.png`, `raio-boca.png`
- `mapa-raio-cima.png`, `mapa-raio-baixo.png`, `mapa-raio-quase.png`

**Questions:**
1. Does the warning read in time?
2. Is the pace right (1.6/1.6/2.0 s charge)?
3. Should the order be fixed (top, bottom, almost all) or vary?

## His answer to raio-varredura.html, and round 9: the eye and the salvo (01/11)

**His words:**
- "Gostei do estilo: o raio-x pode sair dos olhos da serpente, o raio sai da boca."
- On the 3rd beam he first said it could let the player go up as well as close. Then he replaced it: "No último raio vai
  acontecer uma salva de raios mais rápidos, a varredura vai ser mais rápida também [...] Em diferentes locais, vai
  durar mais segundos que o raio 3, mas vai ser divertido desviar de muitos seguidos."
- "O raio, consequentemente, vai cortar o cenário com menos largura" (thinner beams).
- Asked, he chose: the salvo's places are **drawn by lot every fight, under a rule** (not a fixed sequence).

Sheet: `raio-salva.html`. Script: `_habilidades-maquete.mjs varredura ... [semente=<n>]`.

**The eye:**
- The cyan's front eye is at its mouth + (−2.2, −12.9) screen px (art (−101, −81.5) from the art's centre).
- While she charges, the eye glints and two thin rays leave it to the slice's two lines, 40 px out from her mouth.
- The slice itself is drawn exactly where the beam passes: between its two extreme lines from the mouth, each widened
  by the beam's half-width.
- The first try pivoted the whole slice on the eye and widened it until it held the real beam near her head. At the
  screen's edge it opened by ~8× the eye-mouth gap, and the salvo's narrow slices became half the screen.
- Self-check each frame: every point of the beam's band lies inside the drawn slice. Result: 0 outside.

**The salvo (the 3rd cast):**
- **Beams:** six beams with half-width 3 (6 px, half the others). Each sweeps a narrow slice in 0.3 s, holds 0.06 s,
  and one fires every 0.7 s.
- **Warnings:** the next one's warning is up while the current beam fires. The first charge is 1.0 s; the whole salvo
  takes ~4.5 s.
- **The rule (`sorteiaSalva`, at the ship's column):**
  - each slice covers the ship's centre P with a band 26–38 px tall;
  - its near edge is 5–12 px from P, so the way out (edge + 4.5 + 8 px) is ≤ 24.5 px: 0.23 s at 110 px/s, inside the
    0.34 s between the last beam's end and this shot;
  - the way out stays on screen (30–143);
  - the side and the sweep's direction are drawn.
- **Measured** over 4 seeds (11, 3, 7, 23):
  - the mannequin always escapes, with no touch and a minimum gap of 3.6–5.4 px (the beam's slope across the 21-px
    hitbox, plus her idle);
  - a ship that stays put is hit in the salvo (13–18 frames).

**Files:**
- `maquete9-salva.webm`
- `raio-olho.png`, `raio-avisos2.png`, `raio-salva-quadros.png`
- `mapa-raio-cima2.png`, `mapa-raio-baixo2.png`

**Questions:**
1. Does the eye's X-ray read as her aiming with the eye and firing with the mouth?
2. Is the salvo's pace right (every 0.7 s, ways out ≤ 25 px)?
3. Is the thin beam (6 px) the width he imagined?

## His answer to raio-salva.html, and round 10: the straight focus and the sparks (01/11)

**His words:**
- "essa aberração de foco saiu em todos os raios. Isso é para compensar a falta de movimento da cabeça da serpente
  azul, isso não pode acontecer. O foco sai como um foco de verdade, não faz curva. Assim, a cabeça da serpente precisa
  mexer para cada ataque e varredura."
- "o desenho da varredura pode ser bem mais suave [...] um aviso sutil do caminho que o laser/raio vai fazer"
- "quero que adicione efeitos no raio, como se faiscas eletricas saissem ou em volta dele. O mesmo eu quero com o
  plasma. os efeitos nao machucam, só visual"

The eye's rays had bent to meet the slice's lines. The lesson is in memory: never bend an effect to hide a still body
part; the part moves, through animation.

Sheet: `raio-foco-faiscas.html`.

**The focus:**
- One thin STRAIGHT line from her eye to the path's far end (where the eye's line through that edge point leaves the
  screen).
- During the charge it runs from where the beam starts to where it stops: twice in a charge longer than 1.2 s, once in
  the salvo. Its alpha is 0.25–0.5, fading along its length.
- Gone: the dashed and dotted lines, the running dots and the bent rays.

**The path:** still exact (from the mouth, the beam's width included), now faint. Bayer density 0.04→0.09, alpha
0.22, colour [120, 150, 255].

**The sparks (visual only, on a second die `visual()`, so the physics' draws and every measure stay the same):**
- **The beam:**
  - 6 jagged arcs per frame on the thick beam and 3 on the thin one, off its edges, 4–15 px long, rebuilt every frame;
  - blue streak sparks thrown off its sides (up to 3 a frame).
- **The plasma:**
  - 1–2 arcs a frame on each blob of R ≥ 2.6 (60%), licking its skin with a white root and an amber tip;
  - an amber streak spark now and then, more often on the bigger blobs.

**Re-measured, identical:**
- the beam's gaps: 19.1, 13.9 and 5.4 px;
- the plasma's gap: 12.7 px;
- 0 beam points outside the drawn path.

**Files:**
- `maquete10-raio.webm`, `maquete10-plasma.webm`
- `raio-foco.png`, `raio-faiscas.png`, `plasma-faiscas.png`

**Questions:**
1. Are the focus and the path at the right strength? Is the path too faint for the fast salvo?
2. Is the amount of sparks right?
3. The head turning: make the cyan's animation now, before the other skills, or with all of them?

## 01/11 (6): the analysis he passed on → round 11, `raio-cabeca.html` (the head moves)

He pasted an outside analysis of the beam: the radar does not feel dangerous; no anticipation before the shot; the laser
reads as a line; no moment of impact or conclusion. His answers (AskUserQuestion):
- the threat lives IN THE HEAD: it follows the ship, a small pulse from the eye at each reading, the eye locks before
  firing; the path stays subtle (no cone, no screen interference — round 10 stands);
- the wind-up comes from INSIDE the existing 1.6 s warning (the measured gaps stay);
- the recovery is only a breather (~1.2 s, no beam, damage unchanged);
- the animation NOW, before the effects.

**The head (PixelLab, PixMiniMax, from the approved frame):**
- 4 sets in `cru3/cabeca-raio/` + `pontos.json` (eye and mouth per frame, measured):
  - `fechada` 19 frames: closed jaws, raised → lowered (cimaB reversed + approved + baixoA);
  - `aberta` 22: open jaws, raised → lowered (mcimaA reversed + abreB 8 + mbaixoA);
  - `abre` 9: approved → jaws open, drawn back (abreB);
  - `recupera` 13: open → snap shut, thrown back, body rocking → approved (recB, last frame pinned).
- The generator RAISES/LOWERS the head instead of turning it; the jaws gape ~100°, so every beam angle exits straight
  between them. The frame is picked by where the beam meets the left edge (−10 raised, 75 middle, 150 lowered).
- The raises came out in 3 frames (the generator front-loads the motion; pinning both ends of a 12-frame clip did the
  same and darkened the body to 84–92%, rejected). What worked: 4-frame in-betweens with BOTH ends pinned, between
  neighbours with a big step: each step became 3. Max change per frame now 4%, 0 jumps.
- The open mouths came out mint green mixed in the cyan; recoloured to the head's own light cyans (x < 80 only).
- Rejected: abreA (the head turned into another one, the body grew), the B seeds of the open aims (body at 91–92%).

**The mock (`varredura pose=<dir>`):** read 0.35 s (head follows the ship, eye pulses every 0.15 s) → rehearse 0.45 s
(the focus runs the path, the head follows; the eye locks: flash + steady glint) → wind-up 0.8 s (back to the middle,
`abre`, the mouth charging, up/down to the start) → fire (the head follows the beam) → recovery ~1.2 s. The salvo keeps
the jaws open between shots. Set changes always happen at the middle pose they share. The path is now the exact union
of the beam over the sweep with the mouth moving (`caminho`); the salvo's rule solves the band with the moving mouth
(`yLPara`), same draw.

**Measured:** gaps 20.4 / 12.5 / salvo 6.7–8.8 px (round 10: 19.1 / 13.9 / 5.4); 0 beam points outside the path; a
stationary ship is still hit.

**Files:** `maquete11-raio.webm`, `raio-fases.png`, `cabeca-olha.gif`, `cabeca-abre.gif`, `cabeca-mira.gif`,
`cabeca-recupera.gif`.

**Questions:**
1. Are the gestures right?
2. The rise before the top slice (~0.35 s): keep it fast, or slower (it takes time from the reading)?
3. The mouth's colour: her own light cyan instead of the mint green?
4. Next: the agreed effects (outer glow, energy front, hull impact, discharges and residue, energy into the mouth)?

## 01/11 (7): "Gostei dos gestos, pode seguir para os efeitos" → round 12, `raio-efeitos.html`

The gestures of round 11 are APPROVED (the fast rise and her own light cyan in the mouth stay). The agreed effects, all
visual (the `visual()` die), in `_habilidades-maquete.mjs` (`FX`, `efeitosPasso`, `varreTreme`, `quadro`'s `luzCab`):
- charge: sparks born on a ring around the mouth falling in faster and faster; a small flickering sphere growing there;
- her head's lights power up with the charge (only her light-cyan pixels, canvas x < 90, y < 140), full while firing,
  fading after;
- the beam in layers, drawn per pixel by distance: white core (≥ 0.75 px), electric blue to 0.7 of the half-width, an
  outer cyan glow to half-width + 4 (thin: + 2) whose opacity ripples outward. It replaced the dark edge;
- the FRONT: the beam runs out of the mouth in 0.09 s (salvo 0.05) with a bright bulb at its tip; only what is drawn
  hurts (the measures use it);
- the flash: a burst on the mouth (13 px; salvo 7) and a 2 px screen kick on the big beams. A ring of light running
  out was tried and removed (it read as a drawn circle, and in vacuum there is nothing for a pulse to light up);
- the hull: the bottom slice now STARTS ON the hull (de 150 → 172), so the beam cuts the plate first and rises. The cut
  heats the whole stretch between frames (the bite runs ~17 px a frame; heating only the hit point left a dotted line),
  white-hot → orange → red, cooling τ 1.4 s; sparks fly off straight; small metal bursts;
- after a shot: discharges off the jaws (they follow her head through the recoil; strong after a big beam and the
  salvo's last, short between salvo shots; first try too faint, made longer and τ 0.45 s), and the residue — vapour
  leaving the mouth along the last aim, straight, spreading and thinning, no rising.

**Measured:** gaps 20.4 / 12.5 / salvo ≥ 6.7 px (some salvo gaps grew, e.g. 6.8 → 10.2: the front arrives later); 0 beam
points outside the path. The approved gas mock re-run identical (12.7 px).

**Files:** `maquete12-raio.webm`, `raio-carga-disparo.png`, `raio-camadas.png`, `raio-casco.png`, `raio-depois.png`.

**Questions:** 1. the effects' strength (sphere, head lights, glow, flash, kick)? 2. the bottom slice starting on the
hull — keep? 3. next: the other heads' animations (green breathing the gas, orange charging and sparking), the same way?

## 02/11: "Ficou bom, pode seguir para a verde e a laranja" → round 13, `gas-cabecas.html`

Round 12 APPROVED (the effects, and the bottom slice starting on the hull). He then asked for the gestures AND the
effects together: *"faça junto os efeitos e visuais tambem, depois eu vejo numa folha só"*. His answers: the green
OPENS AND POURS (neck pumping with the puffs), the orange DRAWS BACK AND PECKS (the arc leaves its muzzle), ONE charge
gesture for the three patterns (the arc stays the tell; the file = three pecks), the counter: THE THREE FLINCH.

**PixelLab (PixMiniMax, 256², from the approved frame), in `cru3/cabeca-gas/` + `pontos.json` ({verde, laranja,
ciano} per frame, canvas px):**
- `abre` 12 (approved → green jaws wide, pointing down; ia01 in-between + V5). V1/V2 lowered her head in front of the
  cyan's neck (the gas would land ~30 px nearer the ship) → asked to stay high in place; V3 drew a flat mint "slime"
  for the mouth → asked for "a dark throat with a soft green glow deep inside; jaws and teeth clearly drawn" (V5);
- `sopra` 9 (B, the neck pumping): "breathes out" drew green jets (2 of 2) → "the neck pumps… nothing comes out of
  any mouth";
- `carga` 9 (B → C): "opens its jaws" turned the orange's cannon snout into a fanged maw in one frame (2 of 2) →
  "keeps its shape: its armored cylindrical snout with the round glowing muzzle stays closed; only its small lower jaw
  drops a little";
- `bote` 3 (C → half → peak): the long lunge crossed in front of the green's neck and passed the gas pocket it strikes
  from behind; a "short sharp peck" gave the peak in its 1st frame (its later frames painted sparks); an in-between
  C → peak gave the half;
- `fecha` 9 (B → approved, both ends pinned);
- `encolhe` 13 (B → approved): "a blast hits them" drew cartoon starbursts (2 of 2) → "all three heads flinch: they
  jerk back sharply and cower".
- Cleaning (`scratchpad/hab4/limpa2.mjs`): the grey fill (low-saturation regions > 30 px where the approved frame is
  see-through, plus the exact #86877f > 70 px anywhere — the body moves in `encolhe`), loose specks < 16 px, green drips
  on the cyan's side. Mouths: `bocas.mjs` (green = the gape's glowing blob, orange = the muzzle's blob, cyan = a tracked
  patch); two outliers set to the neighbours' mean.

**The mock (`gas pose=<dir>`):** `gasCabPasso` plays the sets on the skill's clock — abre ends as the breath starts;
the free windows pump the neck (out and back, fitted to start and end on B); each charge: carga 0.8 s, then C
trembling (its last frames back and forth); each strike: out to the peak just as the arc leaves, held 0.12 s, back;
after the last, the charge played back (0.5 s); then fecha and the idle again (its frame 0). Counter: at the ignition
the orange's charge plays back (20 fps), from the first face hit `encolhe` (1.2 s); the code spring knock is gone. A
mouth = the idle's hand-measured mouth + the frame's tracked shift from the approved frame. PRE on the 7th round's
frame grid (0.6 s + whole frames), so every event lands on the same frame. Without `pose=` the mock is the 7th round's,
pixel-identical in the three modes.

**Effects (`FXG`, the `visual()` die):** the green's own lights pulse with each puff (`quadro`'s `luzes`, k 0.7); the
orange's amber lights power up with the charge (k 0.8); small arcs crawl on its snout while charging; each peck: a 1 px
kick, smoke drifting off the muzzle along the strike (straight), discharges on the snout (strong on the last); closing:
a last breath leaks out.

**Measured:** dodge gaps 15.6 / 14.5 / 17.1 px (were 17.0 / 12.7 / 17.3), 0 touches — the open mouth breathes 4 px
left and 2 px lower than the idle's; counter: the thermometer fills at 9.63 s (was 9.77); head continuity ≤ 4% per
frame (counter/card 13%, the flinch's snap).

**Files:** `maquete13-padroes.webm`, `maquete13-contra.webm`, `maquete13-carta.webm`, `gas-verde.gif`,
`gas-laranja.gif`, `gas-encolhe.gif`, `gas-abre-sopro.png`, `gas-carga-bote.png`, `gas-fila.png`, `gas-contra.png`,
`gas-fecha.png`.

**Questions:** 1. the gestures? 2. the effects' strength? 3. the short peck — keep? 4. next: the projectiles' look, or
install the skills in the game?

## 02/11 (2): round 14 — the projectiles' look (`projeteis.html`, waiting for his answers)

His answer to `gas-cabecas.html`: "Ficou bom, pode seguir para os projéteis" (round 13 APPROVED: the gestures, the
effects, the short peck). The two projectiles still placeholders in the mock were the normal shots (a 3 px dot) and
the rain's missiles (a 7×2 strip); the plasma jelly, the beam and the gas are approved and untouched.

**Drawn by hand, not generated** (pieces ≲ 20 px: the PixelLab fills its 16² minimum and reads too big):
`scripts/_serpente/_projeteis-assar.mjs <out>` bakes text grids (plus a small procedural blob: an ellipse in pixel
centres, a 1 px near-black rim, colour rings around a core pushed forward; `rxTras` makes an egg) into
`projeteis/<grupo>-<id>/<cor>-<i>.png` + `meta.json`, and `vitrine-{tiro,missil}.png` (×10). Authored pointing right
and symmetric top to bottom (a heading to the left turns them upside down). The palette is the game's drop
(`BootScene.makeShotsChefes`): near-black rim + near-white core (luminance, not colour, carries the read — over her
body, the worst background), the cyan head's shot in a DEEP blue (the art's cyan is the player's shot colour).
- Shots: **A** today's game drop baked into pixels (the game draws it with vector ellipses); **B** one weapon per head —
  the cyan's electric needle (crackle ticks jumping off it), the green's venom glob (squash/stretch, a thread that snaps,
  drips left behind), the orange's ember (an egg, hotter ramp; smoke and sparks behind); **C** the classic round orb, a
  breathing halo (round: no ragged rotation); **D** the thin tracer ("–", his note on the drones' shots). B's needle and
  D are 5 px tall against today's 8 px box.
- Missiles (her plates sampled from the approved frame + a flame in the head's colour — two axes apart from the hull
  launcher's gunmetal/cold flame and the Leviathan's bone/amber): **A** ferrão (a spine, a lit channel to the tip),
  **B** casulo (a seed pod, its seam split and glowing), **C** torpedo (a lit band and nose), **C curto** (9 px, not 12).

**The mock:** `tiros proj=<dir> [rastreia=]` and `misseis forma=<dir>`; `sprite()` turns a sprite like Phaser's
`setRotation` with pixelArt + roundPixels on the 384×216 canvas (the corner snaps, each screen pixel samples nearest
through the inverse turn), so the jagged diagonals are the game's own. `chamaCor` (the flame in the head's colour,
glued to the turned sprite's tail by `caudaDe`), coloured exhaust particles, the shots' trails on the `visual()` die.
Without the options both modes are pixel-identical to before.

**A bug fixed:** the rain's waves fired on `t >= tw && t - 1/FPS < tw`; the cyan wave's 1.3 s lands exactly on a frame of
the 0.6 + k/30 grid and fell between two frames in floating point — the cyan wave NEVER came and the green came twice
(the approved round-3 video had it too). `cruza(tx)` with 1e-9 of slack: three waves. The mannequin through the three
gaps: its centre 42 px from the nearest missile. Missile frames before 1.43 s identical.

**Files:** `maquete14-tiros.webm` (A–D side by side), `maquete14-misseis.webm` (A, B, C, C curto), `proj-tiros-fila.png`
(each head's shot just out of the mouth and mid-flight, ×6, today's in the first row), `proj-misseis-fila.png` (rising,
falling, nearer, the burst, ×5), `projeteis/vitrine-tiro.png`, `projeteis/vitrine-missil.png`.

**Questions:** 1. shots A/B/C/D (or a mix)? (recommended B) 2. missiles ferrão/casulo/torpedo, 12 or 9 px? (recommended
C) 3. the flame in the head's colour — keep, or back to amber? 4. next: install the skills in the game?

**His answers (02/11):** shots **B** (one weapon per head); missile **B, the casulo** ("ficou agradável o visual
dela"); the flame stays in the head's colour; next: **install the skills in the game**. And: "no movimento de atirar,
a cabeça verde e a cabeça laranja soltam um efeito muito forte e grande, quero algo mais discreto, mantendo o movimento
das cabeças, que estão bons".
- That was the generator's PAINTED spit in `tirosK` (the orange's flame blast, burst rings and specks, frames 8–11; the
  green's jets, 15–17). `ferramentas/hab14-cuspe.mjs` → `cru2/tirosK-limpo/`: hand-set boxes per frame + a colour test;
  each hole is filled from the clean neighbour frame + shift (±3 px) that best matches its 3 px ring (frame 12 matches
  8/10/11 at 99–100% on her blue coils; the green's frames move 1–3 px, hence the search); loose specks < 8 px go.
  Inside the open mouth (past the line between the jaws' tips) the flame is not taken out but turned into the lit
  inside (frame 8, the mouth just opening: all of it, down to a dark throat). The cyan's frames and all others are
  copied untouched (he did not mention the cyan's spit — offered on the sheet).
- In its place, code-drawn and small (`claroesBoca`, the `visual()` die): a 3×3 flash for 0.03 s, then a 1 px glow
  0.07 s; the ember 2 sparks + a wisp of smoke, the venom 3 small drops. `clarao=0` turns it off.
- **My error fixed:** round 14's shot videos spawned the shots at the IDLE mouths (no `boca.<cor>`); the orange lunges
  to fire, 36 px off. Now `boca.ciano=26,84 boca.laranja=106,98 boca.verde=64,85` (the action frames' mouths, measured
  in round 4).
- Files: `maquete14b-cuspe.webm` (before | now), `maquete14b-tiros.webm`, `cuspe-laranja.png`, `cuspe-verde.png`; the
  sheet `projeteis.html` got the section on top.

## 02–03/11: installed in the game (plan `plans/2026-11-02-serpente-habilidades-instalacao.md`, Tasks 1–13)

Every mock above now runs in the real fight (`src/entities/serpente/`), committed on 03/11. How it was ported, and
what changed on the way:
- **The mock is the ORACLE.** Each skill is a line-by-line port of `_habilidades-maquete.mjs` to `update(dt)`; the pure
  module runs in Node with a fake facade (`scripts/_serpente/_oraculo.mjs`) and is compared frame by frame with the
  mock's `rastreia=` logs (`folhas/2026-11-02/serpente-instalacao/oraculo/`): the beam 470 frames at 0 px; the gas
  (patterns, counter, card) 0 difference in jelly, thermometer and head. A wrong seed is caught. Tests:
  `node scripts/test-serpente-hab.mjs`.
- **Probes in the game:** `node scripts/_serpente/_sonda-hab.mjs <mode>` (chuva, raio, gas, contra, carta, corpo,
  tiros, mapa-gestos; `--forma`, `--volta`, `--filmar`). Measured: the gas dodges in A 16.8 / 17.9 / 16.3 px, the
  wrong ones bitten; the beam's mannequin 0 bites, the still ship bitten in all 8 slices; the counter takes 15%.
- **The art fixes he asked for:** the painted spit out of the A's rain gesture; the orange's raw-flesh mouth in the
  B and C `erguer` turned to ember (`folhas/2026-11-02/serpente-instalacao/ferramentas/`).
- **The open mouth counts as head** in gesture frames (`ALEM_GESTO` 10 px past the mouth + the head's lights near it).
- **The B's own gas sequence:** RASTEIRA → CORTINA → FILA FUNDA. The hull is NOT a floor (his correction: the ship
  flies over the hull down to ~211 and hides under the crest), so the last one ends with two fans that CROSS the crest
  (`cruza`) and punish the hiding place. Right dodge 18.1 / 14.0 / 61.2 px; still, hugging the crest or hidden: bitten.
- **Still open (plan Tasks 14–15):** the form change in the middle of a skill and the frame-time budget, measured; the
  videos of everything on one sheet.
