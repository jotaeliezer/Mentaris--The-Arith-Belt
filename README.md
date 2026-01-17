# Asteroid Blaster
Mentaris: The Arith Belt is a vanilla JS, canvas-based math shooter. The menu/briefing UI is HTML/CSS, and gameplay runs from a single JS bundle built with esbuild.

## Project layout
- `public/home.html`: main menu + mission briefing UI. Builds launch config and query params.
- `public/asteroid_blaster.html`: gameplay canvas + HUD; loads the game bundle.
- `public/asteroid_blaster.bundle.js`: built output from `src/js/core/game.js`.
- `src/js/core/game.js`: main loop, state, input, spawning, collisions, HUD, and flow transitions.
- `src/js/core/audio.js`: sound effects + soundtrack control.
- `src/js/core/game_settings.js`: default settings and input bindings.
- `src/js/core/tourguide.js`: tutorial overlay and step logic.
- `src/js/entities/`: enemy + powerup behaviors.
- `src/js/render/`: background and animation helpers.
- `scripts/build.js`: esbuild bundler entry.
- `electron/`: desktop packaging.

## Runtime flow
1) `home.html` collects settings and shows the mission briefing.
2) Launch redirects to `asteroid_blaster.html` with query params.
3) The game bootstraps settings, runs intro → countdown → gameplay.

## Build
Run `npm run build` (or `node scripts/build.js`) to regenerate `public/asteroid_blaster.bundle.js`.
