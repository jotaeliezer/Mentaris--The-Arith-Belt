# Mentaris: The Arith Belt — styles, theme, and CSS for Mentaris: Prisms of Assembly

This note is the visual system of the current game, Mentaris: The Arith Belt, so Mentaris: Prisms of Assembly can reuse the same fonts, glow, panels, and menu chrome. It was read from `math-game1` at `89d2b1a`. The game code was not changed.

Companion file: `mentaris_for_prisms_of_assembly.md` (sounds, images, animations, powerups, mission menu flow).

## 1. Where the theme lives

Three places paint the UI. They are meant to match, and they mostly do, with a few hardcoded colors that sit beside the named tokens.

| Source | What it owns |
| --- | --- |
| `public/asteroid_blaster.css` | Shared tokens, body, scanlines, shell, chips, buttons, overlays, cards, logo, panels, inputs, scrollbars, end-of-run grades, toasts, level-up banner, settings tabs, leaderboard grade rows. About 3096 lines. Cache query on the game and home pages is `?v=2026-01-27-1`. |
| `public/home.html` inline `<style>` (lines 12–3034) | Home menu, mission funnel, briefing, belt cards, ship and shot carousels, campaign map, purchase card, achievements, and the `body.homeMenuPage` borderless override. `public/index.html` carries the same block. |
| `src/js/core/hud_theme.js` | Canvas HUD colors and Oxanium font strings. `getMissionBriefInjectedCss()` and `getSandboxPanelInjectedCss()` inject briefing and sandbox chrome at runtime. The tutorial card CSS is injected from the game bundle (`#tourGuide`). |

Pages that load the shared sheet:

- `public/home.html` and `public/index.html`
- `public/asteroid_blaster.html` (the run)
- `public/side_ops.html` (same font and sheet; its own cache query is `?v=2026-04-17-sideops-1`, plus its own inline rules). Side Ops is a separate page. This note covers the shared look it inherits, not its minigame layout.

`docs/` is a published copy of `public/`. Style changes belong in `public/` first.

## 2. Font

One family: **Oxanium** (Google Fonts), weights **400, 600, 700**.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@400;600;700&display=swap" rel="stylesheet">
```

Body stack: `"Oxanium", sans-serif`.

Use it everywhere a label is drawn, including canvas `ctx.font` and any CSS injected from JavaScript. Do not introduce a second display face.

| Role | Spec |
| --- | --- |
| Body / buttons / inputs | inherit Oxanium, 13px, letter-spacing `.2px` |
| HUD chip | 13px |
| Prompt chip | 15px, letter-spacing `.35px` |
| Overlay title `.title` | 18px, uppercase, letter-spacing `.7px` |
| Panel heading `.panel h3` | 13px, uppercase, letter-spacing `.5px` |
| Home wordmark `.menuTitleMain` | weight 700, `clamp(48px, 8vw, 104px)`, letter-spacing `6px`, uppercase |
| Home subtitle `.menuTitleSub` | `clamp(18px, 2.8vw, 32px)`, letter-spacing `3px`, uppercase |
| Eyebrow / badge | 11px, uppercase, letter-spacing `2px` |
| Stepper | 11px, uppercase, letter-spacing `2px` |
| Countdown | weight 900, `clamp(48px, 12vw, 140px)`, letter-spacing `8px` |
| Level-up | weight 900, `clamp(36px, 8vw, 88px)`, letter-spacing `8px`, uppercase |
| Logo main `.gameLogo__main` | weight 900, 34px, letter-spacing `2.6px`, uppercase |
| Logo eyebrow `.gameLogo__top` | 11px, letter-spacing `2.2px` |
| Logo tag `.gameLogo__tag` | 12px, letter-spacing `2.1px` |
| Settings access field | exception: `ui-monospace, "Cascadia Mono", Consolas, monospace`, 12px |

Canvas strings in `hudTheme`:

| Key | Value |
| --- | --- |
| `fontLabel` | `600 11px Oxanium, sans-serif` |
| `fontLabelSm` | `600 10px Oxanium, sans-serif` |
| `fontTitleSm` | `700 14px Oxanium, sans-serif` |
| `fontHudTitle` | `700 20px Oxanium, sans-serif` |
| `fontHudSub` | `600 14px Oxanium, sans-serif` |
| `fontTiny` | `600 12px Oxanium, sans-serif` |

The on-screen question uses weight 700 and `hudQuestionFontSize(w)`: `max(28, min(64, width * 0.06))` pixels.

Type habits that should stay:

- Section titles, buttons, badges, and meta keys are **uppercase**.
- Tracking gets wider as the text gets smaller. Eyebrows sit around `1.6px`–`2.6px`. Big titles sit around `4px`–`8px`.
- Body copy stays near the default tracking. Do not letter-space paragraphs.
- Bright text is `#e8ecff` or `#f2fbff`. Muted copy uses `--muted` or `--ui-text-label`.

## 3. Color

The palette is a night field (`#060816`) with three signal colors: **cyan** (selection, HUD, travel), **magenta** (`#af006f`, atmosphere and logo), and **gold** (`#ffdd00`, warnings, score pops, locks). Lime `#c1d82f` is success. Rose `#ff4d6d` is failure.

### 3.1 Named tokens in `:root` (`asteroid_blaster.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#060816` | Page base |
| `--panel` | `rgba(8, 12, 24, .58)` | Chips, docks |
| `--panel2` | `rgba(8, 12, 24, .72)` | Buttons |
| `--line` | `rgba(255,255,255,.12)` | Hairline borders |
| `--text` | `#e8ecff` | Primary text |
| `--muted` | `rgba(232,236,255,.72)` | Secondary text |
| `--good` | `#c1d82f` | `.pillGood` |
| `--warn` | `#ffdd00` | `.pillWarn`, score flash |
| `--bad` | `#ff4d6d` | `.pillBad` |
| `--mag` | `#af006f` | Magenta accent |
| `--radius` | `18px` | Playfield shell |
| `--shadow` | `0 18px 60px rgba(0,0,0,.55)` | Shell and docks |
| `--solo-shell-width` | `960px` | Solo playfield |
| `--split-shell-gap` | `56px` | Split layout gap |
| `--ui-accent-cyan` | `rgba(0, 215, 255, .92)` | Named cyan |
| `--ui-accent-cyan-soft` | `rgba(110, 228, 255, .94)` | Soft cyan |
| `--ui-border-accent` | `rgba(0, 210, 255, .26)` | Card and panel border |
| `--ui-border-accent-strong` | `rgba(0, 210, 255, .35)` | Stronger accent border |
| `--ui-glow` | `rgba(0, 195, 255, .2)` | Menu-row button glow |
| `--ui-surface-deep` | `rgba(8, 12, 24, .82)` | Deep surface |
| `--ui-surface-tile` | `rgba(8, 12, 24, .55)` | Tile |
| `--ui-surface-tile-dim` | `rgba(8, 12, 24, .5)` | Dim tile, menu card head |
| `--ui-surface-inset` | `rgba(0, 0, 0, .35)` | Inset fields |
| `--ui-text-bright` | `#f2fbff` | Brightest text |
| `--ui-text-label` | `rgba(232, 236, 255, .45)` | Quiet labels |
| `--ui-text-label-strong` | `rgba(232, 236, 255, .88)` | Strong labels |
| `--ui-eyebrow-warn` | `rgba(255, 221, 120, .95)` | Briefing eyebrow |
| `--ui-radius-card` | `26px` | Cards, briefing |
| `--ui-radius-panel` | `28px` | Menu card, hero |
| `--ui-radius-tile` | `14px` | Panels |
| `--ui-radius-control` | `16px` | Controls, briefing hero |
| `--ui-radius-pill` | `12px` | Buttons |
| `--ui-shadow-card` | `0 30px 80px rgba(0,0,0,.6)` | Cards |
| `--ui-shadow-meta` | `0 8px 24px rgba(0,0,0,.25)` | Panels |
| `--ui-inset-fine` | `inset 0 0 0 1px rgba(255,255,255,.03)` | Card inner line |
| `--ui-inset-tile` | `inset 0 0 0 1px rgba(255,255,255,.06)` | Tile inner line |
| `--ui-inset-tile-soft` | `inset 0 0 0 1px rgba(255,255,255,.05)` | Chip inner line |
| `--ui-inset-meta` | `inset 0 0 0 1px rgba(255,255,255,.07)` | Panel inner line |
| `--ui-gradient-card` | `linear-gradient(160deg, rgba(12,16,32,.95), rgba(6,8,20,.9))` | Cards and hero |
| `--ui-gradient-meta` | `linear-gradient(165deg, rgba(0,229,255,.06), rgba(6,10,20,.5))` | Panels |
| `--ui-gradient-hero` | `linear-gradient(135deg, rgba(0,229,255,.12), rgba(8,14,28,.75) 55%, rgba(0,0,0,.35))` | Briefing objective |
| `--ui-overlay-scrim` | `radial-gradient(1200px 620px at 50% 40%, rgba(0,229,255,.16), rgba(6,8,22,.98))` | Menu and briefing scrim |
| `--ui-overlay-scrim-flat` | `rgba(6, 9, 16, .96)` | Flat scrim |
| `--ui-sweep-shine` | `linear-gradient(105deg, transparent 32%, rgba(95,225,255,.055) 48%, transparent 64%)` | Slow shine |

Scrollbar tokens (second `:root` block):

| Token | Value |
| --- | --- |
| `--sb-track` | `rgba(6,10,22,.97)` |
| `--sb-border-v` | `rgba(0,229,255,.22)` |
| `--sb-border-h` | `rgba(255,221,0,.22)` |

### 3.2 The cyan that is actually painted

The named token is `rgba(0, 215, 255, .92)`. Most glows, selected borders, and the canvas HUD use **`rgba(0, 229, 255, …)`** instead. New UI should follow the painted accent (`0, 229, 255`) for glows and selection, and keep `--ui-border-accent` (`0, 210, 255` at low alpha) for resting borders. Do not invent a fourth cyan.

### 3.3 Operation colors

Prompt chip borders (`#promptChip`):

| Class | Border |
| --- | --- |
| `.op-mul` | `rgba(0,229,255,.4)` cyan |
| `.op-add` | `rgba(28,220,120,.4)` green |
| `.op-square` | `rgba(255,210,60,.4)` gold |
| `.op-rational` | `rgba(180,100,255,.4)` purple |

Reuse these four when an operation needs a color. Do not reassign them.

### 3.4 Status colors used outside the tokens

| Meaning | Color |
| --- | --- |
| Continue / confirm / buy | green family `rgba(80,220,120,…)` and `rgba(120,255,170,…)` |
| Back / danger button | `rgba(255,80,80,…)` / `rgba(255,120,120,…)` |
| Locked catalog tag | `rgba(120,25,30,.68)` fill, `#ffd3d3` text |
| Ship lock tag | gold text `rgba(255,221,0,.8)` on `rgba(0,0,0,.4)` |
| HP / lives (canvas) | `rgba(255,80,80,…)` and HP bar `rgba(28,220,120,.9)` |
| Timer bar | `rgba(0,169,255,.9)`, warning `rgba(255,180,60,.92)` |
| Strikes | `rgba(255,210,90,…)` |
| Achievement gold | `rgba(255,215,0,…)` |
| Correct / wrong / missed bars | `rgba(53,242,176)`, `rgba(255,107,107)`, `rgba(255,196,92)` |
| Select `option` background | `#0b1220` |

## 4. Page atmosphere

`body` background, stacked back to front:

1. `--bg`
2. gold radial, `1100px 900px` at `82% 24%`, `rgba(255,221,0,.10)`
3. lime radial, `900px 600px` at `12% 18%`, `rgba(193,216,47,.12)`
4. magenta radial, `1200px 800px` at `50% -10%`, `rgba(175,0,111,.18)`

`body::before` is a fixed scanline overlay: a repeating 6px gradient (1px white at 5% alpha, then clear), opacity `.14`, `mix-blend-mode: overlay`, `pointer-events: none`.

Home adds a second `body::before` that fades to `#04060d` over 0.8s while `body.launching` is set. The run page does not use that fade.

Home also has `.starDrift`: four faint white radials, opacity `.18`, drifting 18px / 24px over 24s. Floating ship images (`.shipFloat`) use drop-shadow `0 0 14px rgba(0,229,255,.18)` and three animations driven by inline custom properties: `--sx --sy --sz --dur --spin --dx --dy --rotTarget --peakOpacity --d1 --d2 --d3`. Drift, spin, and fade run together. `prefers-reduced-motion: reduce` stops them and leaves opacity `.12`.

`body.briefingOpen` and `body.campaignOpen` hide `.menuWrap`, `.starDrift`, `.shipFloaters`, and `.siteFooter`.

## 5. Shape, panels, cards, glow

Depth comes from a dark gradient, a cyan hairline or a soft shadow, and a very thin white inset. Corners are large. Nothing is a hard rectangle.

| Piece | Radius | Fill | Edge / glow |
| --- | --- | --- | --- |
| `#gameShell` | `--radius` 18px | white gradient 5% → 2% | `--line`, `--shadow`. Width `min(960px, 100%)`. `.wideGameplay` widens it to 1120px. |
| `.card` | `--ui-radius-card` 26px | `--ui-gradient-card` | `--ui-border-accent`, `--ui-shadow-card` plus `--ui-inset-fine`. Width `min(840px, 100%)`. |
| `#overlayMenu .card` | `--ui-radius-panel` 28px | same card gradient | width `min(1080px, 100%)`, extra `backdrop-filter: blur(10px)` |
| `.heroPanel` | 28px | card gradient | same border and shadow, padding `28px 32px`, blur 10px |
| `.panel` | `--ui-radius-tile` 14px | `--ui-gradient-meta` | accent border, `--ui-inset-meta` and `--ui-shadow-meta`, padding 14px |
| `.chip` | pill `999px` | `--panel` | `--line` plus `--ui-inset-tile-soft` |
| `.btn` | `--ui-radius-pill` 12px | `--panel2` | `--line`. Home menu buttons use 14px, and the home-page override bumps primary and secondary to 16px. |
| `.kbd`, list rows, inputs | 10–12px | white at about 5–6% | `--line` |
| Touch dock | 18px | `--panel` | `--line`, `--shadow` |
| Move pad | 16px | cyan radial into black | `rgba(0,229,255,.26)` border |

Glow recipe, used on hover and selection:

```css
box-shadow: 0 14px 32px rgba(0,0,0,.45), 0 0 18px rgba(0,229,255,.18);
border-color: rgba(0,229,255,.45);
transform: translateY(-4px);
```

Selected state is a tighter ring plus lift:

```css
border-color: rgba(0,229,255,.6);
box-shadow: 0 0 0 1px rgba(0,229,255,.25), 0 12px 36px rgba(0,0,0,.45);
```

Menu overlay card extras:

- `::before` — cyan bloom, `radial-gradient(circle at 50% 45%, rgba(0,229,255,.18), transparent 70%)`, top 65% of the card, opacity `.7`. `.heroPanel::before` is the same bloom.
- `::after` — vertical pinstripes, `repeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 1px, transparent 18px)`, opacity `.5`.

`.synthHead` (in-run logo header) adds a blurred magenta/cyan orb and a perspective horizon grid (`perspective(420px) rotateX(58deg)`, cyan verticals and magenta horizontals).

`.gameLogo__main` is a clipped tri-color gradient, left to right: magenta `rgba(175,0,111,.95)`, cyan `rgba(0,229,255,.95)`, gold `rgba(255,221,0,.95)`. `glowPulse` runs 2.4s, ease-in-out, infinite, breathing the cyan and magenta drop-shadows.

`.title.titleCleared` turns cyan `rgba(0,229,255,.9)` with `text-shadow: 0 0 18px rgba(0,229,255,.45)`.

## 6. Overlays

`.overlay` fills the shell, centers a card, padding 18px, `z-index: 10`, black at 55%, `backdrop-filter: blur(7px)`. Hidden with opacity 0 and `visibility: hidden`. `.show` fades in over `.25s`.

| Overlay | Difference |
| --- | --- |
| `#overlayMenu` | scrim is `--ui-overlay-scrim`, `z-index: 30` |
| `.funnelOverlay` | background `--bg`, no blur. Card `min(1200px, 96%)` at `scale(1.06)` from the top center. |
| `.briefingOverlay` | `--ui-overlay-scrim`, no blur. Difficulty classes recolor `--briefing-border`, `--briefing-glow`, `--briefing-accent`. |
| `#missileOverlay` | vertical fade from nearly clear to `rgba(3,6,14,.82)`, `z-index: 28`. Card `min(560px, 94%)`. |
| `#missionBriefOverlay` (injected) | `rgba(6,10,20,.72)`, blur 4px, `z-index: 18` |
| `.countdown` | black 35%, no card |
| Leaderboard loading veil | `rgba(4,6,14,.72)` |

`body.launching` fades the visible overlay and `#menuWrap` out over 0.6s. The card lifts 12px and scales to 0.98.

## 7. Buttons

Shared `.btn`:

- Fill `--panel2`, border `--line`, text `--text`, radius 12px, padding `8px 12px`, 13px.
- Hover: white fill at 14%, lift `translateY(-2px)`, shadow `0 12px 26px rgba(0,0,0,.35)`.
- Active: `translateY(1px)`.
- `::after` is a white sweep, `linear-gradient(120deg, transparent 30%, rgba(255,255,255,.35) 50%, transparent 70%)`, played as `buttonSweep 0.9s ease-out` on hover.

`#overlayMenu .row .btn` lifts higher (`-4px`) and adds `0 0 18px var(--ui-glow)`.

Home `.menuButtons .btn`:

- 14px, padding `12px 16px`, radius 14px, uppercase, letter-spacing `1.2px`.
- Hover lift `-5px` (then `-6px` once Launch or the extras are shown), cyan glow `0 0 18px` to `0 0 22px rgba(0,229,255,.16–.22)`.
- `.primary` (Launch): `linear-gradient(90deg, rgba(0,229,255,.35), rgba(0,229,255,.15))`, border `rgba(0,229,255,.55)`, width `min(360px, 100%)`, 15px, padding `14px 16px`. Its sweep loops forever at `2.6s`.
- `.secondaryLabel`: white fill 6%, stacked label plus a 10px caption at letter-spacing `1px` and 60% text.
- `.btn::before` on the home sheet is a 1px white ring with `0 0 16px rgba(0,229,255,.22)`, opacity 0 until hover. The home-page override turns this off.

`buttonSweep` keyframes live only in the home `<style>`:

```css
@keyframes buttonSweep{
  0%, 55%{ transform: translateX(-140%); opacity:0; }
  70%{ opacity:1; }
  100%{ transform: translateX(140%); opacity:0; }
}
```

`asteroid_blaster.css` and Side Ops call `buttonSweep`, but the keyframes are not in the shared sheet. A new page that wants the sweep has to include these keyframes.

`menuBtnThrusterGlow` (1.85s, infinite, home menu hover only) is the thruster: cyan light above the button, flares to the left and right, a smaller pool below, plus the black drop shadow. It is the signature hover of the home menu. Do not put it on every control.

Action colors:

| Class | Look |
| --- | --- |
| `.btn-continue`, `.btnConfirm` | green border and tinted green fill |
| `.btn-back` | rose border and rose fill |
| `.buyButton` | pill, uppercase, letter-spacing `0.18em`, green. Belt buy buttons are stronger (`rgba(80,220,120,.5)`). Disabled drops to a grey-green at opacity `.6`. |
| `.settingsTabBtn.active` | border `rgba(0,229,255,.5)`, fill `rgba(0,229,255,.12)`, shadow `0 14px 30px rgba(0,0,0,.35)` |
| `.sandboxBtn.active` | border `rgba(0,229,255,.55)`, inset ring `rgba(0,229,255,.22)` |

Home menu reveal:

- `.btnLaunch` stays invisible until `body.showLaunch`.
- `.menuExtra` stays invisible until `body.showExtras`.
- `body.tutorialLocked` hides extras.
- `body.tutorialComplete` hides Launch and shows extras immediately.

Focus on the home page is `outline: 2px solid rgba(0,229,255,.5); outline-offset: 2px`.

## 8. Home menu

`body` has classes `homeMenuPage showLaunch`. `.menuWrap` centers a `.menuShell` at `min(1120px, 100%)`. The title block is `.menuLeft.heroPanel`.

Wordmark:

```html
<h1 class="menuTitle">
  <span class="menuTitleMain">MENTARIS</span>
  <span class="menuTitleSub">The Arith Belt</span>
</h1>
```

`.menuTitle` is white, letter-spacing `4px`, `clamp(40px, 7vw, 96px)`, text-shadow `0 6px 20px rgba(0,0,0,.45)`, centered. `.menuTitleMain` plays `titlePulse` 1.8s (fade, rise, slight overscale). `.menuTitleSub` is `rgba(255,255,255,.88)` and plays `titleSub` 1.4s after a 0.35s delay.

`.menuButtons` is a centered column, gap 10px. Buttons: Launch, Campaign, Single Mission, Side Ops, Tutorial, Achievements, Leaderboards, Settings, Exit. Campaign and Single Mission use `.secondaryLabel` with a `<small>` caption.

`.menuBadge` is the small uppercase pill used as an eyebrow: accent border, dim tile fill, letter-spacing `2px`, 11px. On the home page the border is removed.

`.stepper` marks funnel progress. `.step` is hidden until `.active`, then `stepIn` (8px rise, 0.25s).

## 9. Home page override (`body.homeMenuPage`)

The home page strips stroke frames. Depth comes from fills and soft black elevation. This block uses `!important` and wins over the shared borders.

- Hero, cards, panels: `border: none`, shadow `0 22px 52px rgba(0,0,0,.42)`.
- Buttons: no border, shadow `0 10px 26px rgba(0,0,0,.32)`. The `::before` ring is `display: none`.
- Primary Launch keeps a cyan border and the top cyan backlight listed in section 7.
- Secondary menu buttons keep a softer top cyan pool.
- Most `.choiceCard`s go borderless and shadowless. Selected is a flat cyan wash `rgba(0,229,255,.14)`.
- `#operationChoices` is the exception: white 6% fill, shadow `0 10px 24px rgba(0,0,0,.34)`, hover lift and cyan glow, selected state uses the same cyan gradient as Launch.
- Belt cards, buy pills, ship cards, shot cards, inputs, and the campaign scroller lose their borders.
- A selected ship card keeps `0 14px 36px rgba(0,0,0,.45)`.
- A selected shot card becomes `rgba(0,229,255,.12)` with `0 12px 30px rgba(0,0,0,.38)`.
- Campaign discs keep an inset shadow and a cyan outer glow. Completed discs use the same treatment under the home override (the green border from the base rule is cleared).
- Leaderboard grade-row inset shadows are cleared. Sortable headers color toward `#7ee8ff` (`--accent` if set).

In-run overlays do not get this borderless pass. New in-run panels should keep the cyan hairline. New home-menu surfaces should follow the borderless pass.

## 10. Choice cards and the belt grid

`.choiceGrid` is `repeat(auto-fit, minmax(180px, 1fr))`, gap 12px. Used for operation, mode, submode, and difficulty.

`.choiceCard`: radius 16px, border `--line`, fill `rgba(0,0,0,.28)`, padding `12px 14px`. Hover lifts 4px with the glow recipe. Active settles to `-1px`. Selected uses the ring in section 5 and lifts 2px. `.disabled` is opacity 0.45 and ignores pointers.

Headings inside a card: 13px, uppercase, letter-spacing `.8px`. Body: 12px, `--muted`, line-height 1.4.

Belt cards (`.beltChoice`) are the same card with `background-size: cover`. A `::before` darkens them, `linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.65))`. Text gets `text-shadow: 0 2px 10px rgba(0,0,0,.6)`.

`#beltChoices` is a **grid, not a carousel**: 7 columns, `minmax(138px, 1fr)`, gap 10px. Each card `min-height: 210px`. Titles 11px, letter-spacing `1.2px`. Under 760px the grid becomes 3 columns.

Locked belt: opacity 0.5, `grayscale(0.45)`, no lift, cursor `not-allowed`. `.beltLockTag` is a pill, 10px, uppercase, letter-spacing `1px`, fill `rgba(8,12,24,.75)`. On a locked belt card it sits near the bottom (`bottom: 62px`) with a cyan-tinted border.

`.costTag` is bold Oxanium plus a 13px `images/asteroids/mineral.png` icon, `drop-shadow(0 0 4px rgba(0,229,255,.35))`.

`.shipMineralChip` is the green mineral pill: fill `rgba(28,220,120,.1)`, border `rgba(28,220,120,.35)`, radius 20px.

## 11. Carousels

Two horizontal carousels share one pattern: a clipping window, a flex track, drag via `.is-dragging`, and a fixed card width.

### 11.1 Ship carousel

| Piece | Rule |
| --- | --- |
| `.shipChooser` | grid `minmax(720px, 1fr) 300px`, gap 24px. One column under 760px. |
| `.shipColumn`, `.shipGrid` | `--ship-card: 200px`, `--ship-gap: 12px`. Grid min-width 720px, min-height 240px, `overflow: hidden`. |
| `.shipTrack` | flex, gap `--ship-gap`, `transform` transition 220ms. |
| Drag | `cursor: grab`, `touch-action: pan-y`, `user-select: none`. Dragging sets `cursor: grabbing`. |
| `.shipOption` | `flex: 0 0 200px`, opacity 0.7, `scale(0.95)`, 220ms. |
| `.shipOption.selected` | opacity 1, `scale(1.12)`. |
| `.shipCard` | radius 16px, fill `rgba(0,0,0,.35)`, border `--line`, min-height 170px, image centered. |
| Selected card | border `rgba(0,229,255,.6)`, ring plus `0 12px 36px rgba(0,0,0,.45)`, `translateY(-3px)`. Home override drops the border and keeps the shadow. |
| Locked option | opacity 0.35, cursor `not-allowed`. Card `grayscale(0.85) brightness(0.75)` plus a `rgba(5,8,16,.55)` veil. |
| `.shipLockTag` | gold pill, 10px, letter-spacing `1.6px`, uppercase. |
| `.shipDetails` | side panel, radius 18px, fill `rgba(8,12,22,.7)`, min-height 240px. Name 18px tracking `0.08em`. Style line 12px uppercase tracking `0.2em` in `rgba(180,210,255,.8)`. Stat tiles radius 12px on `rgba(5,8,16,.65)`. |

### 11.2 Shot carousel

`.shotTypeCarousel` copies the ship window: `--shot-card: var(--ship-card, 200px)`, `--shot-gap: 12px`, `overflow: hidden`, same grab cursor.

`.shotTypeTrack` transitions transform over **0.35s** (slower than the ship track’s 220ms).

`.shotTypeOption`: column, width 200px, min-height 170px, radius 16px, fill `rgba(0,0,0,.35)`, padding `12px 12px 46px`. Image max-width 62%, max-height 110px, `drop-shadow(0 0 16px rgba(0,229,255,.25))`. Label is absolute at the bottom, 11px, letter-spacing `1.6px`, uppercase, weight 600. Hover border `rgba(0,229,255,.45)` and `translateY(-2px)`. Selected border `rgba(0,229,255,.8)` and ring `0 0 0 1px rgba(0,229,255,.35)`. Locked option opacity 0.55; the icon gets `grayscale(0.6) contrast(0.9)`.

`.shotTypeInlineCarousel` min-width is 720px, and 0 under 760px.

### 11.3 Campaign map scroller

This is a horizontal drag scroller, not a snapping card track.

`.campaignMapWrap`: radius 16px, `overflow-x: auto`, `cursor: grab`, `touch-action: pan-x`, min-height 220px, base `#070b18`. The star field is a long stack of 1px radial-gradients plus `linear-gradient(165deg, rgba(10,18,38,.35), rgba(5,10,24,.62))`. Scrollbar thumb is a cyan gradient, height 10px. Dragging sets `cursor: grabbing` and disables pointer events on nodes.

`.campaignMapList--horizontal`: flex row, nowrap, gap `8px 32px`, padding `24px 28px 32px`, min-height 300px, `width: max-content`. Each `li` is 158px.

Node:

| Piece | Size / color |
| --- | --- |
| `.campaignMapNodeBody` | 88×88 (76×76 under 760px) |
| `.campaignMapNodeDiscInner` | 76×76 circle, 2px border `rgba(0,229,255,.45)`, inset shadow. Image 64×64. |
| `.campaignMapNodeGlow` | radial cyan, inset -6px, opacity .85 |
| Number | 10px, letter-spacing `1.6px`, `rgba(0,229,255,.75)`, uppercase |
| Title | 11px, weight 700, `#e8ecff` |
| Boss line | 9px, gold `rgba(255,221,0,.88)`, uppercase |
| Current node | `scale(1.06)` on the horizontal list (the orbit layout uses `scale(1.16)`) |
| Hover | `translateY(-8px) scale(1.04)` and `drop-shadow(0 14px 26px rgba(0,229,255,.38))` |
| Selected | `drop-shadow(0 0 18px rgba(0,229,255,.5))` |
| Locked | opacity 0.5, `grayscale(0.35)`, no hover lift |
| Completed disc | green border `rgba(90,235,120,.82)` and green glow. Win label same green, 10px, uppercase. |
| Armor ring | 2px cyan `rgba(0,229,255,.58)`, stacked outer and inner glow |
| Commander cue | 9px, weight 800, cream `rgba(255,244,210,.96)`, cyan text-shadow, `campaignCommanderBob` 2.75s (6px) |

`.campaignMapStars` and `.campaignMapRoutes` exist and are `display: none`. The visible stars are the wrap’s own background.

## 12. Briefing card

`.briefingCard`: width `min(920px, 94vw)`, radius `--ui-radius-card`, fill `--ui-gradient-card`, padding `20px 22px 18px`. The border is cleared in the home sheet. A `::after` shine uses the same gradient as `--ui-sweep-shine` and runs `briefingSweep` **7.5s**. The objective hero runs the same sweep at **6s**.

```css
@keyframes briefingSweep{
  0%, 70%{ transform: translateX(-42%); opacity:0; }
  74%, 90%{ opacity:1; }
  100%{ transform: translateX(42%); opacity:0; }
}
```

`briefingReadyPulse` is defined (card shadow plus `0 0 26px var(--briefing-glow)`) but `.briefingOverlay.ready .briefingCard` sets `animation: none`.

Difficulty recolor:

| Class | Accent |
| --- | --- |
| `.briefing-easy` | green `rgba(120,255,170,.92)`, glow `rgba(80,225,150,.2)` |
| `.briefing-normal` | `--ui-accent-cyan-soft` |
| `.briefing-hard` | gold `rgba(255,196,120,.94)`, glow `rgba(255,145,76,.2)` |

Objective hero: radius `--ui-radius-control`, fill `--ui-gradient-hero`. Eyebrow 9px, letter-spacing `2.6px`, `--ui-eyebrow-warn`. Objective text weight 800, `clamp(17px, 2.4vw, 22px)`, `#f2fbff`, cyan text-shadow.

Meta values use `var(--briefing-accent)`. Asset labels are small uppercase tracking labels. The launch spinner is a 26px ring, 2px border, top edge `rgba(0,229,255,.85)`, `spin` 0.9s linear infinite.

In-run mission brief (injected, not the home briefing): card `rgba(8,12,24,.92)`, border `rgba(0,210,255,.28)`, radius 18px, max-width 480px, shadow `0 18px 48px rgba(0,0,0,.5)`. It scales from 0.92 to 1 over 0.35s. Title 14px, letter-spacing `1.6px`, uppercase. Body 13px, line-height 1.6. Avatar 230px with a black drop-shadow. Name 11px, letter-spacing `1.6px`, uppercase.

Tutorial `#tourGuide` matches that card: fill `rgba(8,12,24,.88)`, border `rgba(0,229,255,.35)`, radius 18px, width 520px, rises 12px. Choice chips are cyan tint `rgba(0,229,255,.14)`. Confirm is green. Skip is white at 8%.

## 13. HUD, prompts, and in-run motion

Intro (`.intro-drop`): the canvas plays `bgDrop` 0.7s (drops in from -40px with a slight overshoot). Chips and HUD buttons play `hudDrop` 0.6s, staggered from 0.55s to 1.63s.

`.score-pop`: `scorePop` 0.38s, scale to 1.35, color `#ffdd00`, gold drop-shadow.

`.prompt-pulse`: `promptPulse` 0.55s. The chip flashes gold, scale 1.14, ring `0 0 0 5px rgba(255,210,40,.45)`.

`#hud.hud-danger`: `hudDanger` 1s infinite. At 50% a rose ring `0 0 0 2px rgba(255,50,70,.5)` and a rose glow.

Countdown text-shadow is cyan plus magenta plus a black drop, the same trio as the logo.

`#levelUpBanner`: `levelUpBannerAnim` 1.2s. Scale 0.72 → 1.1 → 1, hold, then fade while drifting up 10px. Text is white with three cyan glows.

`#toast`: right side, radius 14px, black 55%, 16px. `.toast-good` green border and green-black fill. `.toast-bad` rose. `.toast-alert` is 42px gold and flashes with `toastAlertFlash` (opacity and scale, 0.22s, infinite alternate).

`.achievementToast`: fixed bottom-right, `z-index: 9100`, fill `rgba(8,12,24,.94)`, gold border `rgba(255,215,0,.38)`, radius 14px, slides in from `translateX(130%)` over 0.4s with `cubic-bezier(.22,1,.36,1)`. Badge 9px, letter-spacing `2.5px`, gold. Home has a matching inline toast in script (gold border, same radius, same font).

End grade (`.endGrade`, 48px, weight 700, letter-spacing `3px`) reveals with `gradeReveal` 0.55s after a 0.4s delay (scale, rotate, blur).

| Grade | Color | Glow |
| --- | --- | --- |
| S | `#fff7c2` | gold `rgba(255,214,79,…)` |
| A | `#c7fff0` | mint `rgba(53,242,176,…)` |
| B | `#bfe0ff` | blue `rgba(88,173,255,…)` |
| C | `#ffe2a8` | amber `rgba(255,196,92,…)` |
| D | `#ffd0a1` | orange `rgba(255,154,92,…)` |
| E | `#ffb2b2` | rose `rgba(255,107,107,…)` |

Leaderboard rows use a different grade palette (S icy blue, A gold, B steel, C bronze, D copper, E red). S and A hover runs `lbRankRibbon` 0.45s, a white sheen moving across the row. `.endScoreRowPop` uses `endScorePopGlow` 0.7s (scale 1.03, cyan bloom).

Engagement tiles enter with `engageTileIn` 0.26s (10px rise, scale 0.97). Tile tints: collected cyan, used gold, missed rose, maneuver purple `rgba(170,100,255,…)`.

`.meter` is a 10px pill. The fill is lime to gold, `linear-gradient(90deg, rgba(193,216,47,.85), rgba(255,221,0,.85))`.

End-of-run panels inside `#overlayEnd .endSequence` drop their borders and sit on `rgba(6,10,20,.55)` or `.45`. That is a local cleanup, not the home-page override.

## 14. Canvas HUD (`hudTheme`)

Keep canvas paint aligned with the CSS tokens. Surfaces are `rgba(8,12,24,0.72–0.78)`. Text is `rgba(232,236,255,…)`. Accent is `rgba(0,229,255,0.92)`. Glow is `rgba(0,229,255,0.35)`.

| Key | Value | Role |
| --- | --- | --- |
| `missionFail` / `missionFailGlow` | `rgba(255,77,109,.92)` / `.35` | matches `--bad` |
| `timeUpGold` / `timeUpGlow` | `rgba(255,221,0,.92)` / `.35` | matches `--warn` |
| `barHpFill` | `rgba(28,220,120,.9)` | hull |
| `livesActive` | `rgba(255,80,80,.9)` | lives |
| `strikeActive` | `rgba(255,210,90,.95)` | strikes |
| `timerBarFill` | `rgba(0,169,255,.9)` | timer |
| `pauseOverlay` | `rgba(0,0,0,.35)` | pause dim |
| `radiusPanel` / `radiusTile` / `radiusPill` | 8 / 10 / 3 | canvas corners are tighter than CSS cards |

Sandbox panel (injected): fixed, top 90px, left 16px, width `min(460px, 100vw - 32px)`, radius 16px, fill `rgba(8,12,24,.9)`, border `rgba(0,210,255,.22)`, shadow `0 24px 60px rgba(0,0,0,.5)`. Group titles 11px, letter-spacing `1.1px`, uppercase. Active button uses the cyan ring from section 7.

## 15. Forms, catalogs, grades, achievements

Inputs and selects: full width, radius 12px, border `--line`, fill white 6%, 13px, inherit the font. `select option` background `#0b1220`.

Settings body is a 200px tab column plus a panel column, gap 16px. Tab buttons are uppercase, letter-spacing `.8px`.

Catalog grid: `repeat(auto-fit, minmax(260px, 1fr))`, gap 16px, tiles min-height 260px. Hover lifts 2px, border `rgba(0,229,255,.35)`. Focus ring `0 0 0 2px rgba(0,229,255,.2)`. Locked tiles veil with `rgba(5,8,16,.48)`.

`.gradeGrid`: `repeat(auto-fill, minmax(88px, 1fr))`. `.gradeCard` radius 10px, white 4% fill. Selected border `rgba(0,229,255,.55)` and fill `rgba(0,229,255,.09)`. Label 15px weight 700.

`.achievementsGrid`: `repeat(auto-fill, minmax(210px, 1fr))`, max-height 60vh. Card radius 12px. Unlocked: gold border `rgba(255,215,0,.35)` and gold wash. Locked: opacity 0.38.

Range inputs use `accent-color: rgba(0,229,255,.85)`.

## 16. Scrollbars

Vertical thumb: cyan gradient `rgba(0,229,255,.55)` → `rgba(0,130,175,.42)`, width 11px, radius 6px, 2px dark border, inset white glow. Hover brightens.

Horizontal thumb: gold to magenta, `rgba(255,221,0,.5)` → `rgba(175,0,111,.4)`, height 10px. Hover goes pale gold to brighter magenta.

Firefox: `scrollbar-width: thin; scrollbar-color: rgba(0,229,255,.55) var(--sb-track)` on `html`, `body`, `#wrap`, `#gameShell`, overlay cards, panels, textareas, and selects.

The campaign map scroller overrides this locally with a cyan thumb. Keep vertical scroll cyan and horizontal scroll gold-to-magenta unless the surface is the campaign map.

## 17. Rules for new UI

1. Load Oxanium 400/600/700 and set the body to `"Oxanium", sans-serif`. Canvas text uses the `hudTheme` font strings or `700 <size>px Oxanium, sans-serif`.
2. Start from the `:root` tokens. Selection and glow use `rgba(0,229,255,…)`. Resting borders use `--ui-border-accent` or `--line`.
3. One radius ladder: 28 panel, 26 card, 18 shell and briefs, 16 control and choice card, 14 tile and toast, 12 button and field, 999px chips.
4. A new panel is `--ui-gradient-card` or `--ui-gradient-meta`, an accent or white hairline, `--ui-shadow-card` or `--ui-shadow-meta`, and a 1px white inset. On the home menu, drop the border and keep the soft black shadow.
5. Hover lifts 2–6px and adds a cyan glow. Selected state is a cyan border or cyan wash, never a second accent color.
6. Locked things desaturate (`grayscale` about 0.35–0.85), drop opacity, and do not lift.
7. Sweeps are slow and faint (`buttonSweep` on buttons, `briefingSweep` 6–7.5s on briefing). The thruster glow stays on home menu buttons.
8. Carousels are a hidden overflow window plus a translating flex track. Ship and shot cards are 200px with a 12px gap. The campaign map is a horizontal scroll of 158px nodes, not that card track. Belt choices stay a grid.
9. Operation colors stay mul cyan, add green, square gold, rational purple.
10. Grades S–E keep the end-screen glow colors. Do not reuse the leaderboard row colors for the big grade.
11. If a control animates `buttonSweep`, include the keyframes. They are not in `asteroid_blaster.css` today.
12. Uppercase plus wide tracking for labels. Sentence case for explanations.
