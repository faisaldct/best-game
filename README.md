[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/faisaldct/best-game/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/faisaldct/best-game/reward.svg)](https://make.fun/bounty/best-game-01)

# Emberward

A dark-gothic arena survival shooter. You are the Warden, and your lantern is
the light, the fuel and the weapon all at once. Shadows close in across 10
waves. Embers feed the lantern. The Dreadlord waits on wave 10. Keep the light
alive, slay the Dreadlord, and the dawn breaks.

An entry for make.fun's [best-game-01](https://make.fun/bounty/best-game-01)
("Make the best game"). Original idea, art, sound and names, made in code.

## How to play

- **WASD / arrows** — move
- **Mouse** — aim
- **Click / Space** — fire light bolts (hold to keep firing)
- **P / Esc** — pause, **R** — restart, **M** — mute

Kill shadows to score. They drop **embers** (+lantern fuel), **hearts** (+1 HP)
and **prisms** (three-way shot for 8 seconds). The lantern burns whether you
move or not: if its fuel reaches zero, the dark takes you. Clear a wave for a
bonus, then the next wave comes harder. Survive to wave 10 and kill the
Dreadlord to win.

## The shadows

| Shadow | Behaviour |
| --- | --- |
| Crawler | Slow, shambles straight at you. 1 HP. |
| Wraith | Fast, weaves side to side. 2 HP. |
| Spitter | Keeps its distance and fires shadow orbs. 2 HP. |
| The Dreadlord | Wave 10. 36 HP, radial orb bursts, summons crawlers. |

## Run it

No build step, no network. Serve `game/` with any static server and open
`index.html` in desktop Chrome:

```sh
node serve.ts
# game/ is on http://localhost:8080
```

Screenshots are deterministic renders of the game's own code:
`?shot=start|play|boss|victory&seed=1` stages each scene (a seeded autopilot
plays the real rules forward) and sets `window.__shotReady` when painted.

## Files

- `game/index.html` — the page, canvas only
- `game/src/main.js` — boot, the fixed-step loop, the five screens
- `game/src/world.js` — the simulation: Warden, shadows, waves, fuel, score
- `game/src/render.js` — the dark, the lantern glow, the HUD, the screens
- `game/src/shots.js` — deterministic screenshot scenes and the autopilot
- `game/src/config.js` — every tuning number and colour
- `game/src/random.js` — the seeded generator
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised WebAudio sounds and the ambient drone
- `game/src/particles.js` — the spark, ember and wisp pool
- `main.ts` — hands the game in (copies `game/` + `screenshots/`, writes the dossier)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
