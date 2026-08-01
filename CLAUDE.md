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
index.html   — Game layout, menus (start/win/lose), canvas, HUD, intro + deploy overlays
style.css    — All styling (responsive, uses vw/vh/%)
script.js    — All game logic (single DOMContentLoaded listener)
images/      — turret.webp, wireframe.png
sounds/      — lasers.m4a (legacy; unused — all audio is Web Audio API synth)
README.md    — Dev notes and code walkthrough
```

## Architecture (script.js)
Everything lives inside one `DOMContentLoaded` listener. Key pieces:

- **Enemy system**: `enemies[]` array of objects with `{ x, y, hp, maxHp, behavior, ... }`. Spawned by `spawnEnemy()` on an interval. Behaviors: `normal`, `zigzag` (pyramid), `zipper` (sphere), `tank` (shoots back). Removed via `Array.filter` when `hp <= 0`.
- **Enemy movement**: `moveEnemies()` runs every 20ms. Uses `Math.atan2` to head toward `(playerX, playerY)` (camera-follows-player world). Speed via `state.perFrameDistance`, capped at `ENEMY_MAX_SPEED = 0.76`.
- **Player**: `Player` class instance (`playerTurret`) drawn at screen center `(centerX, centerY)`. World scrolls around player via `playerX`/`playerY`. WASD or left touch joystick to move.
- **Shooting**: `mousedown`/touch fires `fireAction()` — ray-style bullets in `gatlingBullets[]` with `progress` interpolation. Hit detection via `rayHitsEnemy()` (point-to-segment distance). Tank enemies shoot back via `enemyBullets[]`.
- **Background**: parallax `stars[]` and drifting `nebulaClouds[]` drawn behind a faint dynamic grid (`renderGrid()`); the old noisy `pattern-02.png` tile was removed.
- **Game loop**: single `requestAnimationFrame` — `gameFrame()` drives fixed-timestep accumulators for move (20ms), logic/render (30ms), and spawn (level-scaled). `timeScale` slows the world briefly on big kills/multi-kills. A separate `deployFrame()` plays a short drop-in cinematic before the first level, and `deathFrame()` plays a cinematic death sequence.
- **Difficulty scaling**: `LEVELS[]` table (8 entries) — `killsToNext`, `spawnInterval`, `toughChance`, `eliteChance`. Beyond level 8, `getLevelDef()` extrapolates: HP scales up, spawn interval shrinks, speed capped.
- **Story / Cutscenes**: an opening prologue (`INTRO_PANELS[]`) plays before the main menu. Every 5 levels (5, 10, 15, 20, 25, 30), a comms-feed interstitial with typewriter text plays before the shop. `STORY_BEATS[]` array defines panels with speaker + text. Click SKIP to fast-forward typing, click NEXT/CONTINUE to advance panels. After the last panel, bonus credits are awarded and the shop opens. `isStoryLevel()` checks if a level triggers a cutscene.
- **Radio chatter**: in-level comms messages (`RADIO_LINES[]`) are triggered by milestones — first kill, first turret, low health, overheat, wave blast, streaks, mid-wave progress, and first encounter with each enemy type. A mysterious "Blockmaster" signal also foreshadows every 3rd level.
- **Cinematic transitions**: `showTitleCard()` announces each wave; `startExtraction()` runs a HOLDING PATTERN animation before the shop; `startDeathSequence()` adds a slow-motion CRT-glitch red fade before the lose screen; `applyChromaticSplit()` adds a brief RGB split on player damage.
- **Lose condition**: `health <= 0 && lives === 0`. Player starts with 3 lives; each death resets health to 100 and grants 120 frames invincibility.
- **Upgrades shop**: between levels, `populateUpgrades()` offers stat upgrades (UPGRADES[]), turret purchases (Gatling/Shotgun), and turret upgrades (TURRET_UPGRADES[]). Credits earned per kill + level completion bonus.
- **Wave blast**: `triggerWave()` (E key) — radial push + non-lethal HP damage to enemies in range, 12s cooldown.
- **Heat mechanic**: firing builds `state.heat`; at 100 the gun jams for `jamDuration` frames. `ventOverheat()` (R key) clears the jam if pressed during the VENT_ZONE window (0.38-0.62 of jam progress).
- **Audio**: Web Audio API synth — `playExplosionSound`, `playGatlingSound`, `playBulletHitSound`, `playShotgunSound`, `playRailgunSound`, `playBoundaryHitSound`, `playWaveReadySound`, `playWaveBlastSound`, `playEnemyHurtSound`, `playEnemyDeathSound`, `playUiSound`. `audioCtx` lazily created on first user gesture. Spatial stereo panning based on world position, per-weapon pitch variation, dynamic ambient drone, and a mute toggle with `localStorage` persistence.
- **Mobile**: dual-zone touch — left half = movement joystick, right half = trackpad-style aim. Portrait shows a rotate prompt.
- **Theme**: dark (default) / light toggle, persisted in localStorage. High score persisted in localStorage.

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
