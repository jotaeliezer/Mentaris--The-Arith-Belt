# Local dev workspace (`dev/`)

The **`dev/`** directory is **gitignored**. It holds a full copy of **`public/`** (full game: `home.html`, `asteroid_blaster.html`, `side_ops.html`, bundles, images) with extra menu items (e.g. **Multiplayer · dev**) so you can experiment without changing tracked `public/home.html` or deploying to Vercel.

## Fast path: one double-click (Windows)

After you have run **`npm run dev:workspace`** at least once (or any command that creates `dev/public`):

1. Double-click **`dev/Start_Dev_Game.bat`** (copied from [`scripts/Start_Dev_Game.bat`](scripts/Start_Dev_Game.bat) on each sync).

   It will:

   - Run **`npm run build`** (with **`SYNC_DEV_WORKSPACE=1`** so `dev/public` stays in sync after the build).
   - Start the static server on **port 4173** serving **`dev/public`** (entire game).
   - Open **home**, **asteroid_blaster**, and **side_ops** in the browser.
   - Start **`npm run watch`** in another window; every time esbuild rebuilds, **`dev/public`** is refreshed automatically so you can reload to see JS changes.

Or run the same script from the repo: **`scripts\Start_Dev_Game.bat`**.

## Manual path

1. `npm run build`
2. `npm run dev:workspace`
3. `npm run dev:serve` → open **http://localhost:4173/home.html**

## Supabase

If `dev/public/supabase_config.js` is missing, the sync copies from `supabase_config.example.js`. Copy your real URL + anon key from `public/supabase_config.js` if you use one locally.

## Notes

- **`SYNC_DEV_WORKSPACE=1`** is set by the batch file and by `npm run watch` when using the dev launcher; it runs [`scripts/init_dev_workspace.js`](scripts/init_dev_workspace.js) after each bundle rebuild so **`dev/public`** matches **`public/`** plus the patched `home.html`.
- Edits to **`src/js`** go through watch → `public/*.bundle.js` → auto-sync → **`dev/public`**. Reload the browser (hard refresh if needed).
- Edits to **`public/*.html`** (except the dev-only patch) need a manual **`npm run dev:workspace`** or trigger a rebuild that copies assets—`init_dev_workspace` always re-copies all of `public/` over `dev/public`.
- If the patch step fails, update the markers in **`scripts/init_dev_workspace.js`**.
