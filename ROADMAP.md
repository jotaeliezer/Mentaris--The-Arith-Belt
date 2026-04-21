# Roadmap: Mentaris — The Arith Belt

## Current state (April 2026)

**Shipped / in the live build**
- Core arcade: ships, backgrounds, question modes, operations, power-ups, aliens, Phaser renderer option
- **Galactic leaderboard** — Supabase-backed scores (POST on session end, GET top runs); home menu Leaderboards with filters, **sortable columns**, default **Galactic (cloud)** vs optional **This device**; configured via `supabase_config.js` / Vercel env at build time
- **Campaign** — mission chain, progress in `localStorage`, Commander Solver presentation, horizontal mission map with drag-scroll and auto-center, re-deploy cleared missions (no minerals), per-mission **best score** persistence (including replays)
- **Home & menus** — ship intro fixes, decoy asteroid retire animation (label fade + shrink / drift), home button styling, single-mission vs home menu styling separation
- **Rare power-ups** — dedicated art and lower drop rate (speed boost, invincibility, push away)
- Sandbox / master-code flow (per earlier milestones); local split-screen still sandbox-oriented

**Still local-only**
- Side Ops mode assets exist; **no cloud leaderboard for Side Ops yet**
- No online multiplayer; controls are fixed presets (no full **customize controls** UI beyond existing settings)

---

## Completed (reference)

| Area | Notes |
|------|--------|
| Cloud leaderboard + RLS | Anon key + `scores` table; client reads/writes via REST |
| Campaign progression & UI | Map, re-deploy, best scores, minerals rules |
| Leaderboard UX | Default to galactic; sortable table headers |
| Mission report polish | Borderless panels / pills on post-session engagement stats |

---

## Tier 1 — Polish & quick wins

### 1.1 Bug fixes & small UI
- [ ] HP bar pulsing carry-over between sessions → remove `hud-danger` class on game reset
- [ ] Objective overlay text too long → shorten to 2-line bullets
- [ ] Mission briefing Launch button resizing with hint text → fix layout

### 1.2 Mission briefing
- [ ] "OBJECTIVE:" chip population where still blank
- [x] Personal best chip near mode stepper (where implemented)

### 1.3 Sandbox / dev
- [ ] Optional `?dev=1` extra gate for web builds
- [ ] Surface local co-op as a first-class **CO-OP** menu path before retiring sandbox-only entry

### 1.4 HUD & in-game
- [x] Wide HUD, background zoom, engagement layout, operation colors, accuracy chip, streak toast
- [ ] Optional vignette / scanline overlay on canvas

### 1.5 Content
- [ ] More background pairs (e.g. Ice Belt, Lava Trench, Deep Void) — target ~10 environments
- [ ] More ships with portraits + config — target ~20; 1–2 with unique passives

---

## Tier 2 — Content & features (weeks)

### 2.1 Campaign depth
- [x] Core campaign map, missions, unlocks, Commander flow *(ongoing narrative/balance)*
- [ ] More mission variety, rewards (cosmetics, trails), stronger narrative beats

### 2.2 Aliens
- [ ] Distinct behaviors (sniper, rusher, shielder, bomber) wired to sprites

### 2.3 Achievements
- [ ] localStorage achievements, toasts, gallery, cosmetic gates

### 2.4 Question modes
- [ ] Mixed operations, speed rounds, boss-only streaks

### 2.5 Ship traits
- [ ] Passives on ship cards + balance pass

### 2.6 Side Ops
- [ ] **Side Ops cloud leaderboard** — extend Supabase schema or table (mode id, score, pilot) and mirror main menu patterns (filters + sort)
- [ ] Parity for “Galactic vs this device” where applicable

---

## Tier 3 — Backend & social (multi-week)

### 3.1 Galactic leaderboard — **done (iterate)**
- [x] Supabase `scores` + client submit/fetch
- [ ] Optional: server-side validation edge function, rate limits, anti-cheat heuristics

### 3.2 Admin dashboard
- [ ] Password-gated page: volume, modes, ships, score distribution

### 3.3 Multiplayer (**new roadmap focus**)
- [ ] **Online multiplayer** — start with **co-op** (shared arena or split objectives); room codes or short join ids
- [ ] Stack: WebSockets (Node/`ws`) or Supabase Realtime; sync authoritative game state or input replication
- [ ] Milestone: lobby + ready + launch; then latency-hardening
- [ ] Competitive PvP only after co-op is stable (latency / fairness)

### 3.4 Accounts (after leaderboard bedded in)
- [ ] Supabase Auth (email / OAuth), cross-device stats, profile screen

### 3.5 Controls (**new**)
- [ ] **Customize controls** — remapping UI for keyboard/gamepad/touch; persist per profile; show conflicts and defaults

---

## Suggested sequence

| Phase | Focus |
|-------|--------|
| Now | Side Ops leaderboard sketch + control remap spec; small briefing/HUD bugs |
| Next | Side Ops Supabase + home UI; admin dashboard if needed for ops |
| Then | Multiplayer prototype (co-op lobby + one mission) |
| Later | Auth, competitive modes, deep alien AI |

---

## What not to build (yet)

- Native mobile app before touch/control pass
- Full competitive ranked PvP before co-op multiplayer proof-of-concept
- Heavy anti-cheat before basic rate limits and sanity checks
