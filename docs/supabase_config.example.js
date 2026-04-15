/**
 * Optional local config (not committed).
 * 1. Copy this file to `supabase_config.js` in the same folder (see repo .gitignore).
 * 2. Paste your Supabase anon (publishable) key from Project Settings → API.
 * 3. home.html already loads `supabase_config.js` before `mentaris_supabase.bundle.js`.
 *    On Vercel, `npm run build` runs scripts/write_supabase_config.js from
 *    MENTARIS_SUPABASE_URL + MENTARIS_SUPABASE_ANON_KEY (NEXT_PUBLIC_* fallbacks).
 *
 * Supabase SQL (run in SQL editor):
 * - Ensure table `scores` columns match: id, created_at, player_name, score, ship, difficulty, question_mode, operation
 * - RLS: allow public read for leaderboard, e.g. CREATE POLICY "scores_read" ON public.scores FOR SELECT USING (true);
 * - RLS: allow anon insert for scores, e.g. CREATE POLICY "scores_insert" ON public.scores FOR INSERT WITH CHECK (true);
 *   (Tighten WITH CHECK for production, e.g. score between 0 and 50000000, length(player_name) < 50.)
 */
window.__MENTARIS_SUPABASE__ = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
  table: "scores"
};
