# Local dev workspace (`dev/`)

The **`dev/`** directory is **gitignored**. It holds a full copy of **`public/`** (full game: `home.html`, `asteroid_blaster.html`, `side_ops.html`, bundles, images) with extra menu items (e.g. **Multiplayer · dev**) so you can experiment without changing tracked `public/home.html` or deploying to Vercel.

## Fast path: one double-click (Windows)

After you have run **`npm run dev:workspace`** at least once (or any command that creates `dev/public`):

1. Double-click **`dev/Start_Dev_Game.bat`** (copied from [`scripts/Start_Dev_Game.bat`](scripts/Start_Dev_Game.bat) on each sync).

   It will:

   - Run **`npm run build`** (with **`SYNC_DEV_WORKSPACE=1`** so `dev/public` stays in sync after the build).
   - Start the static server on **port 4173** serving **`dev/public`** (entire game).
   - Open **home**, **asteroid_blaster** (with `autoStart=1` so the session actually runs), and **side_ops** in the browser.
   - Start **`npm run watch`** in another window; every time esbuild rebuilds, **`dev/public`** is refreshed automatically so you can reload to see JS changes.

Or run the same script from the repo: **`scripts\Start_Dev_Game.bat`**.

## Manual path

1. `npm run build`
2. `npm run dev:workspace`
3. `npm run dev:serve` → open **http://localhost:4173/home.html**

## Competitive (Pilot Alpha + Pilot Beta)

- Open **http://localhost:4173/competitive.html** (or from home: **Multiplayer** → **Competitive** → **Open competitive (two full arenas)**).
- Two iframes = two **full** single-player–style sessions. **Pilot Alpha** (left): normal keyboard/mouse. **Pilot Beta** (right): **Numpad 8 = up, 4 = left, 5 = down, 6 = right** (click the right pane so it has focus).

## Supabase

If `dev/public/supabase_config.js` is missing, the sync copies from `supabase_config.example.js`. Copy your real URL + anon key from `public/supabase_config.js` if you use one locally.

## Notes

- **Entry flow (same as GitHub / production):** use **`/home.html`** and **Launch** (or tutorial). That navigates to `asteroid_blaster.html?...` with **`autoStart=1`** and the chosen config. Opening **`/asteroid_blaster.html` with no query string** is intentionally a **settings / pause** state: the ship appears, no wave starts, until you use **Resume** or load with `autoStart=1` (as the batch file’s second tab now does for a quick smoke test).
- **`SYNC_DEV_WORKSPACE=1`** is set by the batch file and by `npm run watch` when using the dev launcher; it runs [`scripts/init_dev_workspace.js`](scripts/init_dev_workspace.js) after each bundle rebuild so **`dev/public`** matches **`public/`** plus the patched `home.html`.
- Edits to **`src/js`** go through watch → `public/*.bundle.js` → auto-sync → **`dev/public`**. Reload the browser (hard refresh if needed).
- Edits to **`public/*.html`** (except the dev-only patch) need a manual **`npm run dev:workspace`** or trigger a rebuild that copies assets—`init_dev_workspace` always re-copies all of `public/` over `dev/public`.
- If the patch step fails, update the markers in **`scripts/init_dev_workspace.js`**.

## Build error: "user-mapped section open" (Windows)

`esbuild` cannot overwrite `public/asteroid_blaster.bundle.js` while another program has it open.

1. Close the **Mentaris dev server** window (`npx serve`).
2. Close the **Mentaris watch** window (`npm run watch`).
3. Close **browser tabs** on `http://localhost:4173` (or use a private window so nothing holds the file).
4. In Task Manager, end any leftover **node.exe** for this project if needed.
5. Run **`npm run build`** (or the batch file) again.

If it still fails, close Cursor/VS Code temporarily or exclude the repo from real-time antivirus scanning of `public/*.js`.
