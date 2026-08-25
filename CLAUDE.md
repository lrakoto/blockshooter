# BlockShooter — CLAUDE.md

## Project Overview
A browser-based point-and-click shooter game built with vanilla HTML, CSS, and JavaScript. No frameworks, no build tools, no dependencies. Open `index.html` in a browser to run locally.

## Live Site
Hosted on GitHub Pages: https://lrakoto.github.io/blockshooter/

## Repository
- GitHub: https://github.com/lrakoto/blockshooter
- Remote: `git@github.com:lrakoto/blockshooter.git` (SSH)
- Working branch: `main` — **pushes to main deploy directly to production**

## Setup (on any machine)
1. Ensure `gh` CLI is installed and authenticated: `gh auth login`
2. Clone: `gh repo clone lrakoto/blockshooter`
3. Open `index.html` in a browser — no server needed

## File Structure
```
index.html   — Game layout, menus (start/lose), canvas, HUD, intro + deploy overlays
style.css    — All styling (responsive, uses vw/vh/%)
script.js    — All game logic (single DOMContentLoaded listener)
images/      — cube.jpeg (menu art), wireframe.png (README header)
README.md    — Dev diary from the original prototype (see note at top)
```

## Architecture (script.js)
Everything lives inside one `DOMContentLoaded` listener. Key pieces:

- **Enemy system**: `enemies[]` array of objects with `{ x, y, hp, maxHp, behavior, ... }`. Spawned by `spawnEnemy()` on an accumulator (suppressed while a boss is alive). Behaviors: `normal`, `zigzag` (pyramid), `zipper` (sphere), `tank` (shoots back), and `boss` (the Blockmaster). Removed via bulk filter after `hitEnemy()` returns false.
- **The Blockmaster (boss)**: appears at level 30 and every 5 levels after. Orbits the player at ~250px, telegraphs, then fires radial bullet bursts. Big HP pool scaled by cycle, drops 500 credits + scaled score on kill, and pauses regular spawns while alive.
- **Enemy movement**: `moveEnemies()` runs every 20ms; `moveBoss()` handles the boss's two-phase logic (approach → strafe-orbit). Speed via `state.perFrameDistance`, capped at `ENEMY_MAX_SPEED = 0.76`.
- **Player**: `Player` class instance (`playerTurret`) drawn at screen center `(centerX, centerY)`. World scrolls around player via `playerX`/`playerY`. WASD or left touch joystick to move.
- **Shooting**: `mousedown`/touch fires `fireAction()` — ray-style bullets in `gatlingBullets[]` with `progress` interpolation. Hit detection via `rayHitsEnemy()` (point-to-segment). Tank + boss enemies shoot back via `enemyBullets[]` (capped at `ENEMY_BULLET_CAP = 200`).
- **Background**: parallax `stars[]` and drifting `nebulaClouds[]` behind a faint grid (`renderGrid()`). Nebula/star colors use cached `isLightTheme` flag.
- **Canvas**: scaled by `devicePixelRatio` (capped at 2) so it renders crisply on retina/HiDPI displays; each frame sets `ctx.setTransform(dpr,…)` before clearing. The energy-dome visual (`drawDomeStatic()`) is pre-rendered to an offscreen canvas and only re-rendered on resize/theme change.
- **Render orchestration**: one `renderWorld()` drives all world-space draw calls; `renderTouchOverlays()` draws mobile joystick/trackpad. `gameLoop()`, `deployLoop()`, `deathLoop()` use these shared helpers.
- **Game loop**: single `requestAnimationFrame` — `gameFrame()` drives fixed-timestep accumulators for move (20ms), logic/render (30ms), and spawn (level-scaled). `timeScale` slows the world briefly on kills (disabled under reduced-motion). `deployFrame()` / `deathFrame()` run the intro/outro cinematics.
- **Typewriter / cinematics**: all text typing (`startTypewriter`) and cinematic timers run through pause-aware `makePauseInterval`/`makePauseTimeout` wrappers, so ESC pause actually freezes mid-cutscene typing and radio chatter.
- **Difficulty scaling**: `LEVELS[]` table (8 entries) — beyond level 8, `getLevelDef()` extrapolates HP/spawn rate. HUD shows a `NEXT {kills}/{needed}` progress chip.
- **Story / Cutscenes**: `STORY_BEATS[]` at levels 5/10/15/20/25/30 — the L30 beat is the narrative handoff into boss encounters. `isStoryLevel()` gates cutscenes; `getStoryBeat()` picks the right beat.
- **Radio chatter**: `RADIO_LINES.command[]` + `RADIO_LINES.blockmaster[]`, plus `BOSS_RADIO_LINES[]` cycled per boss appearance. `trackWallClock()` freezes the auto-dismiss timer while paused.
- **Cinematic transitions**: `showTitleCard()`, `startExtraction()`, `startDeathSequence()`, `applyChromaticSplit()` — all gated by `screenFxEnabled` under reduced-motion.
- **Lose condition**: `health <= 0 && lives === 0`. 3 lives; each death grants 120 invincibility frames.
- **Upgrades shop**: built once per shop open via `buildShopDom()`; purchases call `refreshShop()` to update in place (no DOM rebuild). Turret-upgrade section is rebuilt only when it needs to appear/disappear.
- **Wave blast**: `triggerWave()` (E key) — radial push + non-lethal damage, 12s cooldown.
- **Heat mechanic**: `state.heat`; at 100 jams for `jamDuration` frames. `ventOverheat()` (R key) during `VENT_ZONE_LO`–`HI` (0.38–0.62).
- **Audio**: Web Audio API synth throughout (lazily created on first gesture). Spatial stereo panning per sound source, ambient drone scales with level, mute persisted via safe `storage` wrapper.
- **Safe storage**: all `localStorage` access goes through a try/catch `storage` helper (private-browsing safe). High-score parse guards against NaN.
- **Mobile**: dual-zone touch; pointer math uses viewport coords directly (canvas is `position:fixed` inset:0).
- **Theme**: dark (default) / light toggle, persisted. `isLightTheme` is cached in JS; canvas `data-theme` drives CSS.
- **Reduced motion**: `prefers-reduced-motion: reduce` gates screen shake, chromatic split, CRT glitch, hit-stop/slow-mo, and CSS animations (via `body.no-anim` class).

## Known Issues / Notes
- Game loop uses a single `requestAnimationFrame` with fixed-timestep accumulators (move 20ms, logic 30ms, spawn level-scaled). Old triple-`setInterval` approach replaced.
- `enemyBullets[]` capped at 200 to prevent unbounded growth.
- Win screen removed; replaced by story cutscenes every 5 levels with bonus credits.
- Start menu copy lists all upgrade types and mentions ESC to pause and WASD movement.
- Pause available via ESC (desktop) or tapping the pause overlay (mobile).
- Mute toggle and theme toggle both persist in `localStorage`.

## Deployment
```bash
git add .
git commit -m "your message"
git push
# GitHub Pages auto-deploys from main — live in ~1 minute
```
