"use strict";

var STORAGE_KEY = "mentaris.achievements";

export var ACHIEVEMENTS = [
  // Session-based
  { id: "first_session",     label: "First Launch",    desc: "Complete your first session." },
  { id: "streak_5",          label: "On a Roll",       desc: "Reach a 5-hit streak in a session." },
  { id: "streak_10",         label: "Hot Streak",      desc: "Reach a 10-hit streak in a session." },
  { id: "streak_25",         label: "Inferno",         desc: "Reach a 25-hit streak in a session." },
  { id: "no_misses",         label: "Clean Run",       desc: "Finish a session with zero missed answers." },
  { id: "perfect_acc",       label: "Perfect",         desc: "100% accuracy with 10 or more correct answers." },
  { id: "score_5k",          label: "Five Thousand",   desc: "Score 5,000 points in one session." },
  { id: "score_25k",         label: "High Commander",  desc: "Score 25,000 points in one session." },
  { id: "score_100k",        label: "Legend",          desc: "Score 100,000 points in one session." },
  { id: "level_10",          label: "Ace Pilot",       desc: "Reach level 10 in one session." },
  { id: "no_damage",         label: "Ghost Run",       desc: "Complete a session without losing a single HP." },
  // Lifetime
  { id: "ten_sessions",      label: "Veteran",         desc: "Play 10 sessions total." },
  { id: "fifty_sessions",    label: "Elite Pilot",     desc: "Play 50 sessions total." },
  { id: "three_ships",       label: "Fleet Commander", desc: "Play with 3 different ships." },
  // Combat
  { id: "alien_5",           label: "Alien Hunter",    desc: "Eliminate 5 aliens in one session." },
  { id: "alien_boss",        label: "Boss Slayer",     desc: "Eliminate an alien boss." },
  { id: "all_powerups",      label: "Full Arsenal",    desc: "Collect every power-up type in one session." },
  // Difficulty
  { id: "brutal_win",        label: "Brutal Pilot",    desc: "Complete a session on Brutal difficulty." },
  { id: "score_1k_brutal",   label: "Brutal Ace",      desc: "Score 1,000+ on Brutal difficulty." },
  // Campaign
  { id: "campaign_m1",       label: "First Sector",    desc: "Complete the first campaign mission." },
  { id: "campaign_complete", label: "Sector Champion", desc: "Complete all missions in a campaign." },
];

export function loadAchievements() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, unlocked: {}, shipsPlayed: [] };
    var p = JSON.parse(raw);
    if (!p || typeof p !== "object") return { version: 1, unlocked: {}, shipsPlayed: [] };
    if (!p.unlocked) p.unlocked = {};
    if (!Array.isArray(p.shipsPlayed)) p.shipsPlayed = [];
    return p;
  } catch(e) {
    return { version: 1, unlocked: {}, shipsPlayed: [] };
  }
}

function saveAchievements(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
}

export function checkAchievements(session, state, lifetime) {
  var data = loadAchievements();
  var now = Date.now();
  var newlyUnlocked = [];

  function unlock(id) {
    if (data.unlocked[id]) return;
    data.unlocked[id] = { unlockedAt: now };
    var def = ACHIEVEMENTS.find(function(a) { return a.id === id; });
    if (def) newlyUnlocked.push(def);
  }

  // Track ships played (for three_ships achievement)
  var ship = (state && state.ship) ? String(state.ship) : "";
  if (ship && data.shipsPlayed.indexOf(ship) === -1) {
    data.shipsPlayed.push(ship);
  }

  // Session-based
  unlock("first_session");

  var bestStreak = session.bestStreak || 0;
  if (bestStreak >= 5)  unlock("streak_5");
  if (bestStreak >= 10) unlock("streak_10");
  if (bestStreak >= 25) unlock("streak_25");

  var missed  = session.missed  || 0;
  var correct = session.correct || 0;
  var accuracy = (typeof session.accuracy === "number") ? session.accuracy : 0;
  if (missed === 0 && correct >= 5) unlock("no_misses");
  if (correct >= 10 && accuracy >= 1.0) unlock("perfect_acc");

  var score = session.score || 0;
  if (score >= 5000)   unlock("score_5k");
  if (score >= 25000)  unlock("score_25k");
  if (score >= 100000) unlock("score_100k");

  var level = (state && state.level) ? state.level : (session.level || 0);
  if (level >= 10) unlock("level_10");

  var livesStart = (state && typeof state.livesStart === "number") ? state.livesStart : -1;
  var livesEnd   = (state && typeof state.lives === "number")      ? state.lives     : -1;
  if (livesStart >= 0 && livesEnd >= 0 && (livesStart - livesEnd) === 0 && correct >= 5) {
    unlock("no_damage");
  }

  // Lifetime
  var totalSessions = (lifetime && lifetime.sessions) ? lifetime.sessions : 0;
  if (totalSessions >= 10) unlock("ten_sessions");
  if (totalSessions >= 50) unlock("fifty_sessions");
  if (data.shipsPlayed.length >= 3) unlock("three_ships");

  // Combat
  var totalAliens = 0;
  if (state && state.aliensShotByType) {
    Object.keys(state.aliensShotByType).forEach(function(k) {
      totalAliens += (state.aliensShotByType[k] || 0);
    });
  }
  if (totalAliens >= 5) unlock("alien_5");
  if (state && state.alienBossBonusAwarded) unlock("alien_boss");

  var powerupTypes = (state && state.powerupsUsedByType) ? Object.keys(state.powerupsUsedByType).length : 0;
  if (powerupTypes >= 7) unlock("all_powerups");

  // Difficulty
  var diff = (state && state.difficulty) ? state.difficulty : (session.difficulty || "");
  if (diff === "brutal" && correct > 0) unlock("brutal_win");
  if (diff === "brutal" && score >= 1000) unlock("score_1k_brutal");

  saveAchievements(data);
  return newlyUnlocked;
}

export function checkCampaignAchievements(missionIndex, isComplete) {
  var data = loadAchievements();
  var now = Date.now();
  var newlyUnlocked = [];

  function unlock(id) {
    if (data.unlocked[id]) return;
    data.unlocked[id] = { unlockedAt: now };
    var def = ACHIEVEMENTS.find(function(a) { return a.id === id; });
    if (def) newlyUnlocked.push(def);
  }

  if (missionIndex === 0) unlock("campaign_m1");
  if (isComplete) unlock("campaign_complete");

  saveAchievements(data);
  return newlyUnlocked;
}

// Used for mid-session streak toasts without writing the full check
export function unlockAndReturn(id) {
  var data = loadAchievements();
  if (data.unlocked[id]) return null;
  var def = ACHIEVEMENTS.find(function(a) { return a.id === id; });
  if (!def) return null;
  data.unlocked[id] = { unlockedAt: Date.now() };
  saveAchievements(data);
  return def;
}

export function isUnlocked(id) {
  return !!loadAchievements().unlocked[id];
}

export function getAllUnlocked() {
  var data = loadAchievements();
  return ACHIEVEMENTS.filter(function(a) { return !!data.unlocked[a.id]; });
}
