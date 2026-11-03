# 31/10: the body + the 1st head's colour (round 2 of the skill animations)

His two points: (1) the motion must be in the BODY too, not only the heads; (2) the 1st head's colour changes per clip.
The sheet is `corpo-cor.html`, waiting for his answers.

## Findings
- (2) The cause is the OPEN MOUTH, not the plates. The generator painted each mouth at random: red, purple, pink, orange
  (`cabeca-antes-agora.png`). ~99% of the pixels already use the 52 approved colours, so locking the palette fixes nothing.
  What fixes it: state the colour in the prompt ("the left head's mouth glows cyan-blue, the middle green, the right orange").
- (1) Asking for body motion works: the coils' silhouette changes 6–20% (before: 0–2%).
- Grey fill: the generator paints #86877f patches (>80 px) into the coil's hole → `ferramentas/hab2-limpa.mjs`.
- Some clips DARKEN the plates (coils at 66–87%) → rejected (`hab2-luz.mjs`). Correcting it in post was tried and
  REJECTED (the outlines turned grey, seams between the bands).
- The beam always ended with the mouth open → a closing clip generated from its last frame (`fechaK`); the hold is
  stretched by ping-pong over the trembling frames.

## The chosen clips (cleaned, in `cru2/`)
| skill | clip | body | notes |
|---|---|---|---|
| normal shots | `tirosK` = tiroAk + tiroCk + tiroBk | 6–9% | 0 jumps |
| bouncing spit | `quicK` | 14% | the strike frame (8) is a jump |
| rain | `chuvaM2` | 15% | the strike frame (9) is a jump; ends identical to the approved |
| beam | `raioKF` = raioK + ping-pong 14..10..15 + fechaK 1..7 | 10% | 0 jumps |

Mocks: `maquete2-*.webm` (the mock script now has `boca.<cor>=x,y`, `passo`, `inclina`, `carga` and the `tiros` mode;
the beam leaves the MOUTH and swings down to the hull — the mannequin waits under her jaw, a proposal for him).

## Open questions on the sheet
1. Are the four animations right (body + colour)?
2. Do the generator's streaks (now in each head's colour) stay, or are they cleaned?
3. The beam's dodge: the safe spot under her jaw (proposal), or decide it on the beam's visual sheet?
