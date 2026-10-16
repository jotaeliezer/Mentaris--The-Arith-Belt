"use strict";

import {
  submitScore,
  fetchLeaderboard,
  isSupabaseScoresConfigured
} from "../core/supabase_scores.js";
import {
  generatePilotName,
  rerollPilotName,
  isGeneratedPilotName
} from "../core/pilot_names.js";

if(typeof globalThis !== "undefined"){
  globalThis.MentarisSupabaseScores = {
    submitScore: submitScore,
    fetchLeaderboard: fetchLeaderboard,
    isSupabaseScoresConfigured: isSupabaseScoresConfigured
  };
  globalThis.MentarisPilotNames = {
    generatePilotName: generatePilotName,
    rerollPilotName: rerollPilotName,
    isGeneratedPilotName: isGeneratedPilotName
  };
}
