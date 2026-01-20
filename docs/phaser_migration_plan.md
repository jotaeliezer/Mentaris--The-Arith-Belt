# Phaser Migration Plan (Asteroid Blaster)

Last updated: 2026-01-19
Status: Planning

Decisions locked
- Physics: Phaser Arcade Physics
- UI: Phaser native (Graphics/Text)
- Assets: keep existing art/audio for first pass

How to use this plan
- Mark completed items with [x]
- Update "Last updated" and "Status" when you change this file
- Add short notes in Progress log

Estimates (single developer, full-time, parity target, no new features)
- Phase 0: 0.5-1 day
- Phase 1: 0.5-1 day
- Phase 2: 0.5-1 day
- Phase 3: 3-6 days
- Phase 4: 2-4 days
- Phase 5: 3-6 days
- Phase 6: 1-2 days
- Phase 7: 1-2 days
- Phase 8: 2-4 days
- Phase 9: 0.5-1 day
- Total: ~14-28 days (2-4 weeks)

Phase 0 - Audit and Scene Map
- [ ] Map current flow and screens from public/asteroid_blaster.html and public/asteroid_blaster.css
- [ ] Inventory core logic modules in src/js/core and src/js/entities
- [ ] List assets in public/images and public/sfx and mark unused or missing
- [ ] Define target Phaser scenes: Boot, Preload, MainMenu, Settings, Gameplay, Pause, GameOver, Hud
- [ ] Decide baseline resolution and scale mode for UI layout
- [ ] Exit criteria: documented scene map, asset list, and resolution decision

Phase 1 - Phaser Foundation
- [ ] Add Phaser dependency and new entry point (src/js/phaser/main.js)
- [ ] Update build pipeline to bundle new entry point to public/asteroid_blaster.bundle.js
- [ ] Replace HTML body with Phaser host container and font preload
- [ ] Configure Phaser game: arcade physics, scale manager, background color, pixel ratio
- [ ] Create shared state store mirroring createState and createPlayer
- [ ] Exit criteria: app boots to a blank Phaser scene

Phase 2 - Asset Pipeline
- [ ] Create asset manifest (image and audio keys)
- [ ] Build Boot or Preload scene with progress feedback
- [ ] Validate asset load for all images and sfx
- [ ] Normalize asset keys and document mapping from old names
- [ ] Exit criteria: all assets load once with no errors

Phase 3 - Gameplay Port
- [ ] Create GameplayScene with update loop using Phaser time delta
- [ ] Port player ship to Arcade Physics sprite
- [ ] Port asteroids, aliens, bullets into Arcade Physics groups
- [ ] Implement spawn timers and difficulty pacing
- [ ] Implement collisions and overlap callbacks for damage, scoring, pickups
- [ ] Port input handling: keyboard, mouse, and touch
- [ ] Exit criteria: playable core loop with movement, shooting, and hits

Phase 4 - Rendering and FX
- [ ] Port background starfield to Phaser Graphics or RenderTexture
- [ ] Port particles and rings using Phaser particles and Graphics
- [ ] Add camera shake and screen flash effects
- [ ] Match color grading and blend modes to current look
- [ ] Exit criteria: visual parity for core gameplay

Phase 5 - UI and Menus
- [ ] Build reusable UI components (button, toggle, slider)
- [ ] Create HudScene and bind to state updates
- [ ] Create MainMenu, Settings, Pause, and GameOver scenes
- [ ] Implement scene transitions with tweens
- [ ] Port settings logic from DOM inputs to Phaser UI
- [ ] Exit criteria: all menus work without HTML overlays

Phase 6 - Audio Migration
- [ ] Replace Audio usage with Phaser Sound Manager
- [ ] Implement master, sfx, and music volume controls
- [ ] Port soundtrack sequencing and loop logic
- [ ] Ensure user-gesture unlock flow still works
- [ ] Exit criteria: audio parity with current build

Phase 7 - Input and Platform Features
- [ ] Map fullscreen and Electron hooks to Phaser scale manager
- [ ] Recreate mousepad and hybrid input modes
- [ ] Confirm gamepad support plan (optional)
- [ ] Exit criteria: input parity across desktop and Electron

Phase 8 - Parity and Tuning
- [ ] Match spawn rates, speeds, and hitboxes to current build
- [ ] Verify scoring, streaks, and win/lose conditions
- [ ] Validate timer modes and level progression
- [ ] Fix regressions from physics or timing changes
- [ ] Exit criteria: gameplay parity acceptance

Phase 9 - Cleanup and Consolidation
- [ ] Remove unused DOM UI and CSS
- [ ] Remove or archive old canvas loop code
- [ ] Update docs and build notes
- [ ] Exit criteria: Phaser is the single source of gameplay and UI

Progress log
- 2026-01-19: added estimates
