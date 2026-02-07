"use strict";

import { clamp } from "./utils.js";

export function computeSpawnInterval(state){
  var base = 0.82;
  var isStampede = state && (state.stampedeMode || String(state.questionMode || "").indexOf("stampede") !== -1);
  var levelFactor = 1;
  var diff = String(state.difficulty || "normal").toLowerCase();
  if(diff === "easy") levelFactor = 0.45;
  else if(diff === "normal") levelFactor = 0.7;
  else if(diff === "brutal") levelFactor = 1.25;
  if(isStampede){
    base = 0.58;
    levelFactor *= 1.15;
  }
  var levelBoost = Math.min(0.22 * levelFactor, (state.level - 1) * 0.025 * levelFactor);
  var streakBoost = Math.min(0.12, state.ddSpeedBonus * 0.55);
  var interval = base - levelBoost - streakBoost;
  return clamp(interval, isStampede ? 0.28 : 0.42, isStampede ? 0.75 : 0.95);
}

export var LEVEL_NOTES = [
  {level:1, note:"Baseline speed and generous spacing."},
  {level:3, note:"More debris starts spawning."},
  {level:5, note:"Spawn cadence tightens; bonus decoys appear."},
  {level:8, note:"High streaks will noticeably amp speed."}
];
