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
index.html   — Game layout, menus (start/win/lose), canvas, HUD
style.css    — All styling (responsive, uses vw/vh/%)
script.js    — All game logic (single DOMContentLoaded listener)
images/      — turret.webp, wireframe.png
sounds/      — lasers.m4a (laser sound, currently commented out)
README.md    — Dev notes and code walkthrough
```

## Architecture (script.js)
Everything lives inside one `DOMContentLoaded` listener. Key pieces:

- **Enemy system**: Two parallel arrays `xCoords[]` / `yCoords[]` track enemy positions. Enemies are spawned by pushing random coords at intervals (`difficulty` ms). Rendered via `spawnNewEnemy()`.
- **Enemy movement**: `moveEnemy()` runs every 20ms. Uses `Math.atan2` to calculate angle toward center, then updates each coord via `splice`. Speed controlled by `perFrameDistance`.
- **Player**: `Player` class instance (`playerTurret`) centered on canvas, renders `turret.webp`.
- **Shooting**: `mousedown` fires `fireAction()`. Hit detection checks if click coords fall within ±8px of any enemy coord. Hits move enemy coords to `30000` (off-screen removal workaround).
- **Game loop**: `setInterval(gameLoop, 30)` — clears canvas, renders player/barrel/target, spawns enemies, checks hit/win/lose conditions.
- **Difficulty scaling**: `diffFn()` increases `perFrameDistance` at score milestones (500, 1000, 1500, 2500, 3000, 4000+).
- **Win condition**: score >= 3000 and health > 0.
- **Lose condition**: health <= 1 and lives === 0 (player starts with 3 lives, loses 5% health per enemy hit).

## Known Issues / Notes
- Laser sound (`laserSound.play()`) is commented out in `fireAction` — browser autoplay policy.
- `lives` initializes to `2` in variable declaration but resets to `3` in `defaults()` — the start value is effectively overridden when the game begins.
- Enemies are "removed" by setting their coords to `30000` (off-canvas) rather than spliced out — they continue to exist in the arrays.
- `this.setInterval` calls at module scope (lines 79, 107) run on page load before the game starts.
- Typo in win screen: "Congrationlations" (index.html line 19).

## Deployment
```bash
git add .
git commit -m "your message"
git push
# GitHub Pages auto-deploys from main — live in ~1 minute
```
