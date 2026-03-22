# Mentaris: The Arith Belt

A synthwave math arcade space shooter. Solve arithmetic problems by blasting the asteroid labeled with the correct answer before the decoys close in.

---

## How to Play

You are a pilot navigating the Arith Belt. Each round presents a math problem in the HUD — your job is to identify the asteroid carrying the correct answer and shoot it before time runs out or the field overwhelms you.

**The loop:**
1. A math problem appears at the top center of the screen (e.g. `6 × 7 = ?`)
2. Asteroids spawn, each labeled with a number — one is correct, the rest are decoys
3. Fly to the correct asteroid and shoot it
4. Score points, build your streak, and advance levels
5. Wrong hits and misses cost lives — run out and it's mission over

**Ship controls:**

| Action | Keys |
|---|---|
| Move | `W A S D` or Arrow Keys |
| Fire | `Space` or Left Click |
| Secondary ability | `E` |
| Special ability | `Q` |
| Dash | `Shift` |
| Pause | `P` |
| Restart | `R` |
| Menu | `M` |

**Power-ups** drop from cleared asteroids and aliens. Secondaries (Time Dilation, EMP, Magnet, Target Lock) are activated with `E`. Defense and offense upgrades apply automatically. Each ship has a unique special ability on `Q`.

**Scoring:** Correct hits score points scaled by level and streak multiplier. Consecutive correct hits build your streak — breaking it resets the multiplier. Letter ranks (S → E) are awarded at mission end based on accuracy.

---

## Math Modes

The game covers a wide range of arithmetic topics selectable from the mission briefing:

- Multiplication & division (classic, digit hunt, stampede, factor hunt)
- Addition (classic, digit hunt, series, stampede, partial sums)
- Perfect squares and square roots
- Rational numbers (fractions and decimals)
- Divisors

Difficulty scales dynamically — asteroid spawn intervals tighten as your level and streak increase. Presets range from Easy to Brutal.

---

## Building

**Requirements:** Node.js 18+

```bash
npm install
```

**Development — rebuild on save:**
```bash
npm run watch
```

**One-time build:**
```bash
npm run build
```

The build step uses [esbuild](https://esbuild.github.io/) to bundle `src/js/core/game.js` and its imports into `public/asteroid_blaster.bundle.js`.

**Publish to docs (GitHub Pages):**
```bash
npm run docs
```

Copies `public/` into `docs/` and rewrites absolute asset paths to relative ones so the site works on GitHub Pages without a custom domain.

**Run as desktop app (Electron):**
```bash
npm run electron
```

**Package Windows installer:**
```bash
npm run dist
```

Outputs an NSIS installer to `dist/`.

---

## Project Structure

```
src/js/
  core/
    game.js            # Main game loop, HUD, state, collision
    game_settings.js   # State initialization, input parsing
    audio.js           # Web Audio API, SFX bank, soundtrack
    levels.js          # Difficulty scaling
    tourguide.js       # 21-step interactive tutorial
    utils.js           # Shared helpers
  entities/
    aliens.js          # Enemy waves, bosses, campaigns
    powerups.js        # Power-up definitions and mechanics
  render/
    background.js      # Procedural starfield, nebulae, planets
    animations.js      # Particles, camera shake, EMP cascades, rings
    phaser_renderer.js # Optional Phaser 3 renderer (in development)

public/                # Web-ready assets (served directly or via Electron)
  home.html            # Main menu, mission briefing, settings
  asteroid_blaster.html  # Game canvas and HUD
  asteroid_blaster.css   # All styles and animations
  asteroid_blaster.bundle.js  # Built output (do not edit directly)
  images/              # Sprites: ships, asteroids, aliens, power-ups, UI
  sfx/                 # Audio: sound effects and soundtracks (MP3)

docs/                  # GitHub Pages mirror of public/ (auto-generated)
electron/              # Desktop app entry point and preload script
scripts/
  build.js             # esbuild config
  publish_docs.js      # Copies public/ → docs/, fixes paths
```

## Runtime Flow

1. `home.html` collects settings and shows the mission briefing
2. Launch redirects to `asteroid_blaster.html` with query params
3. The game bootstraps settings, runs intro → countdown → gameplay

---

## Deployment

The `docs/` folder is deployed automatically to GitHub Pages via GitHub Actions on push to `main` or `math-game1`. The workflow installs dependencies, runs `npm run build`, runs `npm run docs`, and uploads the artifact.

The game is also configured for [Vercel](https://vercel.com) deployment via `vercel.json`.

---

## Tech Stack

- **Language:** Vanilla JavaScript (ES6 modules)
- **Renderer:** HTML5 Canvas 2D API
- **Build:** esbuild
- **Audio:** Web Audio API + HTML5 `<audio>`
- **Font:** [Oxanium](https://fonts.google.com/specimen/Oxanium) (Google Fonts)
- **Desktop:** Electron
- **Optional renderer:** Phaser 3 (planned migration)
