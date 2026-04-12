# Roadmap: Mentaris — The Arith Belt

## Current State (as of March 2026)
- 13 ships, 6 backgrounds, 24 question modes, 4 operations, 10 power-ups, 8 alien sprites
- Local-only leaderboard (CSV, never synced), no server, no analytics
- Sandbox mode (URL-param only, hidden from main UI)
- Local split-screen multiplayer (sandbox only, not surfaced to players)
- No campaign, no progression beyond session score/streak

---

## Tier 1 — Polish & Quick Wins (days each)

### 1.1 Bug Fixes
- [ ] HP bar pulsing carry-over between sessions → remove `hud-danger` class on game reset
- [ ] Objective overlay text too long → shorten to 2-line bullets
- [ ] Mission briefing Launch button resizing with hint text → fix layout

### 1.2 Mission Briefing UI Overhaul
- [ ] Fix "LAUNCH MISSION" button — fixed height, never wraps regardless of hint length
- [ ] Commander hint box: fixed height + overflow ellipsis, no layout impact
- [ ] "OBJECTIVE:" chip at top currently shows blank — populate it
- [x] Personal best chip near the mode stepper

### 1.3 Remove / Retire Sandbox
- [x] Sandbox always on menu; master code prompt on launch (code revealed once when all campaigns cleared); Settings → Access for optional verify
- [ ] Move sandbox to hidden `?dev=1` URL param — optional extra gate for web builds
- [ ] Extract local co-op toggle to a proper "CO-OP" option on the main menu before removing sandbox

### 1.4 HUD & In-Game Polish
- [x] Wide mode HUD spans correctly
- [x] Background zoom fixed to width-fit
- [x] Engagement page whitespace reduced
- [x] Operation color coding on prompt chip
- [x] Live accuracy tracker chip in HUD
- [ ] Add subtle vignette/scanline overlay on canvas for synthwave feel
- [x] Streak milestone toast

### 1.5 More Backgrounds
- [ ] Add new background pairs (normal + `b` variant) in `public/images/backgrounds/`
- [ ] Suggested themes: Ice Belt, Lava Trench, Deep Void, Cyber Grid
- [ ] Target: 10 total environments (currently 6)

### 1.6 More Ships
- [ ] Each ship needs: portrait PNG, game sprite PNG, config entry
- [ ] Target: 20 ships (currently 13)
- [ ] Add 1–2 ships with unique passive traits (wider spread, faster reload, bonus armor)

---

## Tier 2 — Content Depth (weeks each)

### 2.1 Campaign / Mission Progression
- [ ] Structured mission chain: 10–15 missions with fixed settings and narrative briefings
- [ ] Each mission unlocks the next (saved in localStorage)
- [ ] Commander dialogue per mission (text-only, uses existing portrait)
- [ ] Mission rewards: unlock ships, backgrounds, or cosmetic trails
- [ ] Campaign map screen (node graph or linear path)

### 2.2 Alien Behavior Diversity
- [ ] All aliens are currently "scout" type — add distinct behaviors:
  - **Sniper** — long range, slow, high HP
  - **Rusher** — fast, low HP, dives straight at ship
  - **Shielder** — absorbs 1 player shot, then vulnerable
  - **Bomber** — drops area-denial blasts
- [ ] Wire alien type to sprite so specific sprites always behave a certain way

### 2.3 Achievements / Badges
- [ ] 20–30 achievements stored in localStorage (e.g. "10 streak", "no misses", "collect all power-ups")
- [ ] Achievement toast on unlock (short animated banner)
- [ ] Achievement gallery in home screen or end-game screen
- [ ] Achievements can gate cosmetic unlocks (ship skins, trails)

### 2.4 More Question Modes
- [ ] **Mixed operations** — randomly cycles mul/add each question
- [ ] **Speed round** — timer per question (5s max), score multiplier per ms remaining
- [ ] **Boss only mode** — skip waves, boss encounters back-to-back

### 2.5 Ship Traits / Loadout
- [ ] Each ship gets a passive trait shown on its card in mission briefing
  - Hull Bonus, Speed Bonus, Wider Shot, Starting Armor, etc.
- [ ] Light balancing pass so no ship is dominant

---

## Tier 3 — Backend & Social (multi-week, requires server)

### 3.1 Online Leaderboard
- **Stack:** Supabase (free tier) — Postgres + REST API, no server to maintain
- **Data:** POST score on session end (name, score, mode, operation, difficulty, timestamp, ship)
- **Read:** GET top-N scores, filtered by mode/operation
- **UI:** "GALACTIC RANKS" screen accessible from home
- **Privacy:** name only, no account required
- **Effort:** ~3–5 days

### 3.2 Admin Dashboard (owner only)
- **Stack:** Separate HTML page, password-gated
- **Data source:** Same Supabase table as leaderboard
- **Shows:** Sessions per day, most played modes/ships, score distribution, top players
- **Effort:** ~1 week

### 3.3 Lobby Multiplayer (Online Co-op)
- **Stack:** WebSocket server (Node.js + ws) or Supabase Realtime
- **Mode:** Co-op only (2 pilots, shared or split arena)
- **Flow:** Player 1 creates room → 4-digit code → Player 2 joins → host launches → synced session
- **Recommendation:** Build 3.1 first — proves backend before committing to real-time infra
- **Effort:** 4–8 weeks

### 3.4 Player Accounts (post-3.1)
- Email or Google login via Supabase Auth
- Persistent stats across devices
- Profile page from home screen

---

## Suggested Sequence

| Phase | Items | Goal |
|---|---|---|
| Now | 1.1 bugs, 1.2 briefing UI | Solid public-facing release |
| Next 2 weeks | 1.4–1.6 polish, backgrounds, ships | More content, more replayability |
| Month 2 | 2.1 campaign, 2.3 achievements | Depth + return visits |
| Month 3 | 3.1 leaderboard, 3.2 dashboard | Backend foundation |
| Month 4+ | 2.2 alien types, 3.3 multiplayer | Major features |

---

## What NOT to Build (yet)
- Mobile app — canvas rendering needs touch redesign first
- Account system before leaderboard — over-engineered without data to justify it
- Competitive multiplayer — lag compensation is hard; co-op first
