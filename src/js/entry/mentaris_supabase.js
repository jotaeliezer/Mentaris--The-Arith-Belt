"use strict";

import {
  submitScore,
  fetchLeaderboard,
  isSupabaseScoresConfigured
} from "../core/supabase_scores.js";

if(typeof globalThis !== "undefined"){
  globalThis.MentarisSupabaseScores = {
    submitScore: submitScore,
    fetchLeaderboard: fetchLeaderboard,
    isSupabaseScoresConfigured: isSupabaseScoresConfigured
  };
}
