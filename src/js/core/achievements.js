"use strict";

var STORAGE_KEY = "mentaris.achievements";

export var ACHIEVEMENTS = [
  // Session-based
  { id: "first_session",     label: "First Launch",      desc: "Complete your first session." },
  { id: "streak_5",          label: "On a Roll",         desc: "Reach a 5-hit streak in a session." },
  { id: "streak_10",         label: "Hot Streak",        desc: "Reach a 10-hit streak in a session." },
  { id: "streak_25",         label: "Inferno",           desc: "Reach a 25-hit streak in a session." },
  { id: "streak_50",         label: "Unstoppable",       desc: "Reach a 50-hit streak in a session." },
  { id: "no_misses",         label: "Clean Run",         desc: "Finish a session with zero missed answers." },
  { id: "perfect_acc",       label: "Perfect",           desc: "100% accuracy with 10 or more correct answers." },
  { id: "score_1k",          label: "First Thousand",    desc: "Score 1,000 points in one session." },
  { id: "score_5k",          label: "Five Thousand",     desc: "Score 5,000 points in one session." },
  { id: "score_25k",         label: "High Commander",    desc: "Score 25,000 points in one session." },
  { id: "score_50k",         label: "Space Admiral",     desc: "Score 50,000 points in one session." },
  { id: "score_100k",        label: "Legend",            desc: "Score 100,000 points in one session." },
  { id: "level_5",           label: "Squadron Leader",   desc: "Reach level 5 in one session." },
  { id: "level_10",          label: "Ace Pilot",         desc: "Reach level 10 in one session." },
  { id: "level_20",          label: "Elite Commander",   desc: "Reach level 20 in one session." },
  { id: "no_damage",         label: "Ghost Run",         desc: "Complete a session without losing a single HP." },
  { id: "no_damage_hard",    label: "Phantom",           desc: "Complete a Hard or Brutal session without losing HP." },
  { id: "speed_5",           label: "Quick Draw",        desc: "Answer 5 questions correctly in under 3 seconds each." },
  // Lifetime
  { id: "five_sessions",     label: "Getting Started",   desc: "Play 5 sessions total." },
  { id: "ten_sessions",      label: "Veteran",           desc: "Play 10 sessions total." },
  { id: "twenty_five_sessions", label: "Dedicated",      desc: "Play 25 sessions total." },
  { id: "fifty_sessions",    label: "Elite Pilot",       desc: "Play 50 sessions total." },
  { id: "hundred_sessions",  label: "Legend Pilot",      desc: "Play 100 sessions total." },
  { id: "three_ships",       label: "Fleet Commander",   desc: "Play with 3 different ships." },
  { id: "five_ships",        label: "Admiral",           desc: "Play with 5 different ships." },
  // Combat
  { id: "alien_5",           label: "Alien Hunter",      desc: "Eliminate 5 aliens in one session." },
  { id: "alien_20",          label: "Exterminator",      desc: "Eliminate 20 aliens in one session." },
  { id: "alien_50",          label: "Annihilator",       desc: "Eliminate 50 aliens across all sessions." },
  { id: "alien_boss",        label: "Boss Slayer",       desc: "Eliminate an alien boss." },
  { id: "alien_boss_3",      label: "Boss Hunter",       desc: "Eliminate 3 alien bosses total." },
  { id: "all_powerups",      label: "Full Arsenal",      desc: "Collect every power-up type in one session." },
  { id: "powerup_10",        label: "Power Hungry",      desc: "Collect 10 power-ups in one session." },
  // Difficulty
  { id: "brutal_win",        label: "Brutal Pilot",      desc: "Complete a session on Brutal difficulty." },
  { id: "score_1k_brutal",   label: "Brutal Ace",        desc: "Score 1,000+ on Brutal difficulty." },
  { id: "score_10k_brutal",  label: "Brutal Legend",     desc: "Score 10,000+ on Brutal difficulty." },
  { id: "hard_win",          label: "Hard-Boiled",       desc: "Complete a session on Hard difficulty." },
  // Campaign
  { id: "campaign_m1",         label: "First Sector",       desc: "Complete the first campaign mission." },
  { id: "campaign_complete",   label: "Sector Champion",    desc: "Complete all missions in a campaign." },
  { id: "campaign_no_fail",    label: "Flawless Campaign",  desc: "Complete a campaign without failing any mission." },
  // Unlockable ships
  { id: "ship_mk7",            label: "Crimson MK-7",       desc: "Unlock the Crimson MK-7." },
  { id: "ship_fizard",         label: "Aurora Dart",        desc: "Unlock the Aurora Dart." },
  { id: "ship_ember",          label: "Ruby Strike",        desc: "Unlock the Ruby Strike." },
  { id: "ship_azure",          label: "Azure Lancer",       desc: "Unlock the Azure Lancer." },
  { id: "ship_bu2x",           label: "BU2X",               desc: "Unlock the BU2X." },
  { id: "ship_mantas",         label: "Mantas Arc-5",       desc: "Unlock the Mantas Arc-5." },
  { id: "ship_cyan",           label: "Cyan Vector 7",      desc: "Unlock the Cyan Vector 7." },
  { id: "ship_veloz",          label: "Veloz Mas",          desc: "Unlock the Veloz Mas." },
  { id: "ship_verde9",         label: "Ver-De-9",           desc: "Unlock the Ver-De-9." },
  { id: "ship_whiteflame8",    label: "White Flame 8",      desc: "Unlock the White Flame 8." },
  { id: "ship_datsawze",       label: "D.A.T. Sawze",       desc: "Unlock D.A.T. Sawze." },
  { id: "ship_apextiburoniv",  label: "Apex Tiburon IV",    desc: "Unlock the Apex Tiburon IV." },
  { id: "unlock_3_ships",      label: "Hangar Growing",     desc: "Unlock 3 ships." },
  { id: "unlock_all_ships",    label: "Full Fleet",         desc: "Unlock all ships." },
  // Unlockable asteroid clusters
  { id: "belt_aurora",         label: "Void Run",           desc: "Unlock the Void Run Cluster." },
  { id: "belt_rift",           label: "Nebula Siege",       desc: "Unlock the Nebula Siege Cluster." },
  { id: "belt_vega",           label: "Apex Frontier",      desc: "Unlock the Apex Frontier Cluster." },
  { id: "belt_void",           label: "Apex Frontier Plus", desc: "Unlock the Apex Frontier Plus Cluster." },
  { id: "belt_surface",        label: "ET Surface",         desc: "Unlock the ET Surface Cluster." },
  { id: "unlock_all_belts",    label: "Belt Master",        desc: "Unlock all asteroid clusters." },
  // Unlockable shot types
  { id: "shot_fire",           label: "Fire Blaster",       desc: "Unlock the Fire shot type." },
  { id: "shot_ice",            label: "Ice Blaster",        desc: "Unlock the Ice shot type." },
  { id: "shot_electric",       label: "Electric Blaster",   desc: "Unlock the Electric shot type." },
  { id: "shot_pierce",         label: "Bola Blaster",       desc: "Unlock the Bola pierce shot type." },
  { id: "shot_plasma",         label: "Plasma Blaster",     desc: "Unlock the Plasma shot type." },
  { id: "shot_rail",           label: "Rail Blaster",       desc: "Unlock the Rail shot type." },
  { id: "shot_missile",        label: "Missile Commander",  desc: "Unlock the Missile shot type." },
  { id: "unlock_all_shots",    label: "Weapons Master",     desc: "Unlock all shot types." },
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
  if (bestStreak >= 50) unlock("streak_50");

  var missed  = session.missed  || 0;
  var correct = session.correct || 0;
  var accuracy = (typeof session.accuracy === "number") ? session.accuracy : 0;
  if (missed === 0 && correct >= 5) unlock("no_misses");
  if (correct >= 10 && accuracy >= 1.0) unlock("perfect_acc");

  var score = session.score || 0;
  if (score >= 1000)   unlock("score_1k");
  if (score >= 5000)   unlock("score_5k");
  if (score >= 25000)  unlock("score_25k");
  if (score >= 50000)  unlock("score_50k");
  if (score >= 100000) unlock("score_100k");

  var level = (state && state.level) ? state.level : (session.level || 0);
  if (level >= 5)  unlock("level_5");
  if (level >= 10) unlock("level_10");
  if (level >= 20) unlock("level_20");

  var livesStart = (state && typeof state.livesStart === "number") ? state.livesStart : -1;
  var livesEnd   = (state && typeof state.lives === "number")      ? state.lives     : -1;
  if (livesStart >= 0 && livesEnd >= 0 && (livesStart - livesEnd) === 0 && correct >= 5) {
    unlock("no_damage");
  }

  // Difficulty
  var diff = (state && state.difficulty) ? state.difficulty : (session.difficulty || "");
  if (livesStart >= 0 && livesEnd >= 0 && (livesStart - livesEnd) === 0 && correct >= 5 &&
      (diff === "hard" || diff === "brutal")) {
    unlock("no_damage_hard");
  }

  // Quick answers (fast_answer count tracked as session.fastAnswers)
  var fastAnswers = session.fastAnswers || 0;
  if (fastAnswers >= 5) unlock("speed_5");

  // Lifetime
  var totalSessions = (lifetime && lifetime.sessions) ? lifetime.sessions : 0;
  if (totalSessions >= 5)   unlock("five_sessions");
  if (totalSessions >= 10)  unlock("ten_sessions");
  if (totalSessions >= 25)  unlock("twenty_five_sessions");
  if (totalSessions >= 50)  unlock("fifty_sessions");
  if (totalSessions >= 100) unlock("hundred_sessions");
  if (data.shipsPlayed.length >= 3) unlock("three_ships");
  if (data.shipsPlayed.length >= 5) unlock("five_ships");

  // Combat
  var totalAliens = 0;
  if (state && state.aliensShotByType) {
    Object.keys(state.aliensShotByType).forEach(function(k) {
      totalAliens += (state.aliensShotByType[k] || 0);
    });
  }
  if (totalAliens >= 5)  unlock("alien_5");
  if (totalAliens >= 20) unlock("alien_20");

  // Lifetime alien kills (tracked in lifetime stats)
  var lifetimeAliens = (lifetime && lifetime.totalAliens) ? lifetime.totalAliens : 0;
  if (lifetimeAliens >= 50) unlock("alien_50");

  if (state && state.alienBossBonusAwarded) unlock("alien_boss");

  // Lifetime boss kills
  var lifetimeBossKills = (lifetime && lifetime.bossKills) ? lifetime.bossKills : 0;
  if (lifetimeBossKills >= 3) unlock("alien_boss_3");

  var powerupTypes = (state && state.powerupsUsedByType) ? Object.keys(state.powerupsUsedByType).length : 0;
  if (powerupTypes >= 7) unlock("all_powerups");

  var powerupsTotal = 0;
  if (state && state.powerupsUsedByType) {
    Object.keys(state.powerupsUsedByType).forEach(function(k) {
      powerupsTotal += (state.powerupsUsedByType[k] || 0);
    });
  }
  if (powerupsTotal >= 10) unlock("powerup_10");

  // Difficulty
  if (diff === "brutal" && correct > 0) unlock("brutal_win");
  if (diff === "brutal" && score >= 1000)  unlock("score_1k_brutal");
  if (diff === "brutal" && score >= 10000) unlock("score_10k_brutal");
  if (diff === "hard"   && correct > 0) unlock("hard_win");

  saveAchievements(data);
  return newlyUnlocked;
}

export function checkCampaignAchievements(missionIndex, isComplete, noFailRun) {
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
  if (isComplete && noFailRun) unlock("campaign_no_fail");

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
