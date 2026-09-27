-- Leaderboard name cleanup for public.scores
--
-- DO NOT run the UPDATE or DELETE sections against the live database until you
-- have reviewed the SELECT results and taken a backup. Nothing in the app
-- executes this file. The commented sections are options for a human to run
-- by hand in the Supabase SQL editor (or psql) after review.
--
-- Table shape this script expects (see public/supabase_config.example.js):
--   id, created_at, player_name, score, ship, difficulty, question_mode, operation
-- New scores insert only player_name, score, and question_mode. created_at should
-- keep a database default of now() so the client does not send a timestamp.
-- ship, difficulty, and operation may still exist for older rows. Reads still
-- select those columns. If an insert fails because one of them is NOT NULL
-- and has no default, make that column nullable (see the optional notes at
-- the bottom). Do that in a separate reviewed migration. This file does not
-- alter columns.
--
-- A generated callsign matches the in-game list in src/js/core/pilot_names.js:
--   Adjective + space + Noun + space + two digits, e.g. Nova Falcon 42
-- Word lists below are copied from that file (56 adjectives, 48 nouns).
-- If you change the lists, update both files together.
--
-- How to use
-- 1. Open the Supabase SQL editor for the project. Prefer a read-only role for step 2.
-- 2. Run ONLY the "Review" statement. It lists rows whose player_name is not a
--    generated callsign from the curated lists (typed names, blanks, and nulls).
-- 3. Decide with the project owner:
--      (b) replace those names with new generated callsigns, or
--      (c) delete those rows.
-- 4. Uncomment exactly one of those statements, run it, then run the Review
--    statement again. It should return zero rows.
-- 5. Leave the other option commented. Do not run both.

-- ---------------------------------------------------------------------------
-- (a) Review existing free-typed names. Safe to run. Does not change data.
-- ---------------------------------------------------------------------------

WITH lists AS (
  SELECT
    ARRAY['Amber', 'Arctic', 'Aurora', 'Azure', 'Bold', 'Brave', 'Breezy', 'Bright', 'Brisk', 'Calm', 'Clever', 'Coral', 'Cosmic', 'Cozy', 'Crystal', 'Daring', 'Eager', 'Emerald', 'Fuzzy', 'Gentle', 'Glowing', 'Golden', 'Happy', 'Jolly', 'Keen', 'Kind', 'Lucky', 'Lunar', 'Merry', 'Mighty', 'Mellow', 'Neon', 'Nimble', 'Noble', 'Nova', 'Plucky', 'Polar', 'Prism', 'Quiet', 'Radiant', 'Rapid', 'Ruby', 'Silver', 'Solar', 'Spark', 'Spry', 'Steady', 'Stellar', 'Sunny', 'Swift', 'Tropic', 'Turbo', 'Velvet', 'Violet', 'Vivid', 'Wispy']::text[] AS adjectives,
    ARRAY['Badger', 'Beacon', 'Breeze', 'Capsule', 'Cedar', 'Cloud', 'Clover', 'Comet', 'Compass', 'Cosmos', 'Dolphin', 'Drift', 'Echo', 'Falcon', 'Fox', 'Galaxy', 'Glider', 'Harbor', 'Horizon', 'Koala', 'Lantern', 'Lynx', 'Maple', 'Marble', 'Meadow', 'Meteor', 'Nebula', 'Orbit', 'Otter', 'Panda', 'Pebble', 'Photon', 'Planet', 'Puffin', 'Pulsar', 'Quasar', 'Ranger', 'River', 'Robin', 'Rocket', 'Satellite', 'Scout', 'Shuttle', 'Sparrow', 'Star', 'Turtle', 'Voyager', 'Willow']::text[] AS nouns
)
SELECT
  s.id,
  s.created_at,
  s.player_name,
  s.score,
  s.question_mode,
  s.operation,
  s.difficulty
FROM public.scores AS s
CROSS JOIN lists
WHERE s.player_name IS NULL
   OR s.player_name <> btrim(s.player_name)
   OR split_part(s.player_name, ' ', 1) <> ALL (lists.adjectives)
   OR split_part(s.player_name, ' ', 2) <> ALL (lists.nouns)
   OR split_part(s.player_name, ' ', 3) !~ '^[0-9]{2}$'
   OR split_part(s.player_name, ' ', 4) <> ''
ORDER BY s.created_at DESC NULLS LAST, s.id;

-- ---------------------------------------------------------------------------
-- (b) OPTION: replace free-typed names with generated callsigns.
--     Uncomment this whole statement to run it. Each row gets its own name.
-- ---------------------------------------------------------------------------

-- WITH lists AS (
--   SELECT
--     ARRAY['Amber', 'Arctic', 'Aurora', 'Azure', 'Bold', 'Brave', 'Breezy', 'Bright', 'Brisk', 'Calm', 'Clever', 'Coral', 'Cosmic', 'Cozy', 'Crystal', 'Daring', 'Eager', 'Emerald', 'Fuzzy', 'Gentle', 'Glowing', 'Golden', 'Happy', 'Jolly', 'Keen', 'Kind', 'Lucky', 'Lunar', 'Merry', 'Mighty', 'Mellow', 'Neon', 'Nimble', 'Noble', 'Nova', 'Plucky', 'Polar', 'Prism', 'Quiet', 'Radiant', 'Rapid', 'Ruby', 'Silver', 'Solar', 'Spark', 'Spry', 'Steady', 'Stellar', 'Sunny', 'Swift', 'Tropic', 'Turbo', 'Velvet', 'Violet', 'Vivid', 'Wispy']::text[] AS adjectives,
--     ARRAY['Badger', 'Beacon', 'Breeze', 'Capsule', 'Cedar', 'Cloud', 'Clover', 'Comet', 'Compass', 'Cosmos', 'Dolphin', 'Drift', 'Echo', 'Falcon', 'Fox', 'Galaxy', 'Glider', 'Harbor', 'Horizon', 'Koala', 'Lantern', 'Lynx', 'Maple', 'Marble', 'Meadow', 'Meteor', 'Nebula', 'Orbit', 'Otter', 'Panda', 'Pebble', 'Photon', 'Planet', 'Puffin', 'Pulsar', 'Quasar', 'Ranger', 'River', 'Robin', 'Rocket', 'Satellite', 'Scout', 'Shuttle', 'Sparrow', 'Star', 'Turtle', 'Voyager', 'Willow']::text[] AS nouns
-- ),
-- replacements AS (
--   SELECT
--     s.id,
--     lists.adjectives[1 + floor(random() * cardinality(lists.adjectives))::int]
--       || ' ' ||
--     lists.nouns[1 + floor(random() * cardinality(lists.nouns))::int]
--       || ' ' ||
--     lpad((floor(random() * 100))::int::text, 2, '0') AS player_name
--   FROM public.scores AS s
--   CROSS JOIN lists
--   WHERE s.player_name IS NULL
--      OR s.player_name <> btrim(s.player_name)
--      OR split_part(s.player_name, ' ', 1) <> ALL (lists.adjectives)
--      OR split_part(s.player_name, ' ', 2) <> ALL (lists.nouns)
--      OR split_part(s.player_name, ' ', 3) !~ '^[0-9]{2}$'
--      OR split_part(s.player_name, ' ', 4) <> ''
-- )
-- UPDATE public.scores AS s
-- SET player_name = replacements.player_name
-- FROM replacements
-- WHERE s.id = replacements.id;

-- ---------------------------------------------------------------------------
-- (c) OPTION: delete rows that still have free-typed names.
--     Uncomment this whole statement to run it. This removes the rows.
--     Do not run this in the same pass as option (b).
-- ---------------------------------------------------------------------------

-- WITH lists AS (
--   SELECT
--     ARRAY['Amber', 'Arctic', 'Aurora', 'Azure', 'Bold', 'Brave', 'Breezy', 'Bright', 'Brisk', 'Calm', 'Clever', 'Coral', 'Cosmic', 'Cozy', 'Crystal', 'Daring', 'Eager', 'Emerald', 'Fuzzy', 'Gentle', 'Glowing', 'Golden', 'Happy', 'Jolly', 'Keen', 'Kind', 'Lucky', 'Lunar', 'Merry', 'Mighty', 'Mellow', 'Neon', 'Nimble', 'Noble', 'Nova', 'Plucky', 'Polar', 'Prism', 'Quiet', 'Radiant', 'Rapid', 'Ruby', 'Silver', 'Solar', 'Spark', 'Spry', 'Steady', 'Stellar', 'Sunny', 'Swift', 'Tropic', 'Turbo', 'Velvet', 'Violet', 'Vivid', 'Wispy']::text[] AS adjectives,
--     ARRAY['Badger', 'Beacon', 'Breeze', 'Capsule', 'Cedar', 'Cloud', 'Clover', 'Comet', 'Compass', 'Cosmos', 'Dolphin', 'Drift', 'Echo', 'Falcon', 'Fox', 'Galaxy', 'Glider', 'Harbor', 'Horizon', 'Koala', 'Lantern', 'Lynx', 'Maple', 'Marble', 'Meadow', 'Meteor', 'Nebula', 'Orbit', 'Otter', 'Panda', 'Pebble', 'Photon', 'Planet', 'Puffin', 'Pulsar', 'Quasar', 'Ranger', 'River', 'Robin', 'Rocket', 'Satellite', 'Scout', 'Shuttle', 'Sparrow', 'Star', 'Turtle', 'Voyager', 'Willow']::text[] AS nouns
-- )
-- DELETE FROM public.scores AS s
-- USING lists
-- WHERE s.player_name IS NULL
--    OR s.player_name <> btrim(s.player_name)
--    OR split_part(s.player_name, ' ', 1) <> ALL (lists.adjectives)
--    OR split_part(s.player_name, ' ', 2) <> ALL (lists.nouns)
--    OR split_part(s.player_name, ' ', 3) !~ '^[0-9]{2}$'
--    OR split_part(s.player_name, ' ', 4) <> '';

-- ---------------------------------------------------------------------------
-- Optional follow-ups (still manual; not run by this file)
-- ---------------------------------------------------------------------------
-- If new inserts fail because older columns are NOT NULL without defaults:
--   ALTER TABLE public.scores ALTER COLUMN ship DROP NOT NULL;
--   ALTER TABLE public.scores ALTER COLUMN difficulty DROP NOT NULL;
--   ALTER TABLE public.scores ALTER COLUMN operation DROP NOT NULL;
--   ALTER TABLE public.scores ALTER COLUMN created_at SET DEFAULT now();
--
-- After free-typed rows are gone, you can add a CHECK so the API cannot
-- store a name outside the generated pattern. Build it from the same lists
-- before enabling it, and confirm the Review query returns zero rows first.
-- A pattern-only check is not enough, because a typed name could look like
-- "Nova Falcon 42" without being drawn from these lists. Prefer the Review
-- predicate above (list membership) if you add a constraint.
