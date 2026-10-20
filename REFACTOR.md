# Mentaris — The Arith Belt: Phaser 3 rebuild

Planning document only. The prototype on `math-game1` stays as it is.

## 1. Goal

Rebuild **Mentaris — The Arith Belt** from the ground up as a clean Phaser 3 game. The current code is the specification and the reference for rules, feel, art, and audio. Read it to match what the prototype already does. Write new modules. The existing files are not a codebase to reuse directly.

What that prototype is today:

- A canvas arcade loop. `src/js/core/game.js` owns state, input, questions, waves, collisions, scoring, the campaign, and most of the HUD. `public/home.html` is the mission briefing. `public/asteroid_blaster.html` hosts the canvas.
- An optional Phaser mirror. `src/js/render/phaser_renderer.js` (`?phaser=1`) is one scene with sprite pools. Textures load ad hoc. The canvas loop still runs the simulation.
- Thin modules around that loop. `src/js/core/game_settings.js` builds the big state and player objects. `src/js/core/levels.js` sets the spawn interval. `src/js/entities/aliens.js` keeps module-level arrays (`aliens`, `alienBullets`, `alienMines`). `src/js/entities/powerups.js` is a stub; the live power-up rules sit in `game.js`. `src/js/core/audio.js` plays an HTML audio bank and a soundtrack.
- A REST leaderboard. `src/js/core/supabase_scores.js` posts and reads a `scores` table with the anon key on `window.__MENTARIS_SUPABASE__`. There is no Realtime session.
- Local two-pilot play. `public/competitive.html` embeds two full copies of the single-player game (Pilot Alpha on the usual keys, Pilot Beta on the numpad). Side Ops is a separate bundle (`src/js/side_ops/`, `public/side_ops.html`).

The rebuild implements those behaviours again with Phaser scenes, game objects, and small systems.

## 2. Foundation

Follow current Phaser 3 practice.

- **Scenes.** `Boot` (scale, font, registry), `Preload` (manifest and progress), `Menu` (briefing and mode select), `Game` (simulation), `HUD` (a scene run in parallel with `Game`), and `Results`. Pause is an overlay scene. Side Ops are further scenes opened from the menu.
- **Game objects.** `Ship`, `Asteroid`, `Bullet`, `Alien`, `Powerup`, and `Mineral` as classes, held in groups and recycled from pools. Arcade Physics covers overlap and motion. The prototype does those checks by hand inside the canvas loop.
- **Config.** One game config module: renderer, Arcade Physics, a scale mode that fits the belt viewport, Oxanium, and a single parent container. Session options (mode, difficulty, ship, timer, limits) live in the Phaser registry and are passed into `Game` when a run starts.
- **Assets.** Load images and audio once in `Preload` from a manifest. Reuse the files under `public/images` and `public/sfx`. The optional renderer’s keys are the naming reference: `asteroid1`–`asteroid4` and `asteroid6`, `alien_*`, `powerup_*`, `rare_*`, `bullet_*`, and the background set.
- **Events.** Scene and game events (`problem:ready`, `score:changed`, `lives:changed`, `powerup:gained`, `session:over`) update the HUD and the results screen. Entity lists stay inside the system that owns them.
- **Modules.** `scenes/`, `objects/`, `systems/` (problems, waves, scoring, aliens, power-ups, audio, settings), and `net/` (lobby and race). One responsibility per file.
- **Build.** A Vite app of ES modules, the layout the Phaser 3 project template uses. The prototype’s esbuild IIFE bundles (`public/asteroid_blaster.bundle.js`, `mentaris_supabase.bundle.js`, `side_ops.bundle.js`) and the `docs/` Pages copy remain that app’s publish path.
- **Time and input.** Movement and spawns use the scene `delta`. Keyboard and pointer go through Phaser’s input plugin. Default binds match the prototype: move with WASD or arrows, fire with Space or click, secondary on `E`, special on `Q`, dash on Shift, pause `P`, restart `R`, menu `M`. Saved rebinds (`mentaris.keybinds`) stay a settings feature.

### Behaviours to carry over

- **Problems.** The HUD shows one prompt. Modes from the briefing: multiplication and division (classic, digit hunt, stampede, factor hunt); addition (classic, digit hunt, series of 3 or 4, stampede, partial sums); perfect squares and square roots; rationals as fractions or decimals; divisors, where several correct factors clear the wave. Decoys follow the selected decoy function. Presets are Easy, Normal, Hard, and Brutal.
- **Waves.** Each problem is a wave. Decoys spawn first; the correct asteroid waits until a few decoys are in play (`prepareWave`). The spawn interval in `levels.js` starts near 0.82s (0.58s in stampede) and tightens with level and streak, floored around 0.42s (0.28s in stampede). A missed or compromised correct target retires that wave. Every fifth correct answer raises the level and plays a short slow-motion beat.
- **Power-ups.** Drops come from cleared asteroids and aliens. Secondaries are Time Dilation, Magnet Sweep, EMP Burst, Target Lock, and Auto-Fire. Defense and offense apply on pickup: shield, armor, scope, hull repair, and shot types (laser, fire, ice, electric, pierce, plasma, rail, missile). Rare drops are speed boost, invincibility, and push away. Clean waves, near-misses, and fast hits raise the drop chance. Each ship keeps its `Q` ability (shockwave, flares, spin, downshock, overflight, phase, knock-three, compass, front clear) and the handling numbers in `shipProfiles`.
- **Aliens.** Types are scout, sniper, rusher, bomber, and shielder, plus boss patterns, mines, and aimed shots. Play includes ambient spawns, endless waves (about four aliens every four correct answers), and a finale boss. Campaign missions pin a sprite identity. Prototype alien scores sit around 900–1200, with a separate boss bonus.
- **Scoring.** A correct hit adds `50 + min(250, streak × 10)`, weighted by operand size. Addition uses a smaller factor. The streak resets on a wrong hit or a miss. Lives start at 10. Accuracy at the end maps to S (≥ 90%), A (≥ 80%), B (≥ 70%), D (≥ 60%), or E. A mineral burst uses the lowest digit of the label. The results screen records score, ship, difficulty, question mode, and operation — the same fields `submitScore` posts today.
- **Side Ops.** A separate hub with on-device bests: Memory Belts (Perfect Match, Root Match, Fraction Match), Grid Master, Collections, and Claim Field. They share the math-question helpers and the ship list, and they keep their own rules.
- **Audio.** The SFX bank (guns, alien hits, alarms, pickups, UI, the 15-second mark) and the soundtrack, with separate SFX and music volumes. Playback starts after a user gesture.
- **Settings.** Ranges, decoy count, difficulty, timer, question limit, strike limit, target mode, volumes, wide HUD, touch dock, and mousepad autostart. Campaign progress, per-mission bests, and the 21-step tour (`tourguide.js`) belong to the same product and follow once the core loop is solid.

## 3. Multiplayer

Online play uses **Supabase Realtime**, the same approach as **Mentaris: Prisms of Assembly**.

- The host creates a lobby and receives a short join code they can send to another player.
- The guest enters that code and joins the same Realtime channel. Presence is the lobby roster.
- Both pilots ready up. Each then runs a full local arena under the single-player rules. Competitive mode is a **live score race**: clients broadcast compact snapshots (callsign, score, streak, level, lives, accuracy, finished) and each HUD shows the other pilot’s numbers as they change.
- Ship motion, bullets, and asteroid positions stay on the local machine. The channel carries lobby membership and the race readout. That matches today’s competitive page, where each iframe is already a full independent session, and moves the second session onto another person’s device.
- A finished race can still write a leaderboard row with the fields the prototype already stores (`score`, `ship`, `difficulty`, `question_mode`, `operation`), keyed by callsign. The client uses the anon key and row-level security, the same trust model as `supabase_scores.js`.

**Child privacy.** Pilots are generated callsigns only. The lobby, the race, and any saved score store that callsign and the run fields. The product collects no personal data and ships no trackers, analytics SDKs, or ad pixels. Device storage may keep settings and the last callsign. The prototype’s typed name (`mathsteroid.playerName`, posted as `player_name`) becomes that generated callsign.

## 4. Deployment

The site at [mentaris-the-arith-belt.vercel.app](https://mentaris-the-arith-belt.vercel.app) is this repo’s Vercel project. `vercel.json` runs `npm run build` and publishes `docs/`. That site will be taken down after the year.

The rebuilt game launches on a new URL and domain, still to be chosen. Host it as its own project so removing the old site leaves the new one in place. GitHub Pages from `docs/` stays the prototype’s publish path until that cutover.

## 5. Phased order and open questions

### Order of work

1. **Shell.** Vite app, Phaser config, Boot, Preload, Menu, empty Game and HUD, asset manifest.
2. **Core run.** Ship, problems, waves, hits, scoring, lives, results.
3. **Loadout and threats.** Power-ups, ship specials, aliens and bosses, audio, settings.
4. **Surrounding modes.** Campaign, the 21-step tour, Side Ops, on-device bests.
5. **Live race.** Realtime lobby, join codes, generated callsigns, score broadcast.
6. **Launch.** New host and domain. Leave `mentaris-the-arith-belt.vercel.app` up until it is taken down after the year.

### Open questions

- The new domain, and which host serves it.
- Join-code length, character set, and what happens when the host leaves.
- Whether a race shares one problem seed so both pilots see the same questions.
- Whether a race is two pilots only, or the lobby can grow later.
- How far to check a client-reported score before it is public. The prototype inserts the number the client sends.
- Which extras are required for a first public build: campaign, Side Ops, achievements, Electron, and touch controls.
- Whether the new game uses a fresh Supabase project or extends the current `scores` setup with Realtime.
