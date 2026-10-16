"use strict";

/**
 * Kid-safe generated leaderboard callsigns.
 * Shape: Adjective + space + Noun + space + 2-digit number, e.g. "Nova Falcon 42".
 * Words are single title-case tokens (letters only) so they stay easy to check in SQL.
 * Keep this list in sync with supabase/scores_pilot_names.sql.
 */

var PILOT_ADJECTIVES = [
  "Amber", "Arctic", "Aurora", "Azure", "Bold", "Brave", "Breezy", "Bright",
  "Brisk", "Calm", "Clever", "Coral", "Cosmic", "Cozy", "Crystal", "Daring",
  "Eager", "Emerald", "Fuzzy", "Gentle", "Glowing", "Golden", "Happy", "Jolly",
  "Keen", "Kind", "Lucky", "Lunar", "Merry", "Mighty", "Mellow", "Neon",
  "Nimble", "Noble", "Nova", "Plucky", "Polar", "Prism", "Quiet", "Radiant",
  "Rapid", "Ruby", "Silver", "Solar", "Spark", "Spry", "Steady", "Stellar",
  "Sunny", "Swift", "Tropic", "Turbo", "Velvet", "Violet", "Vivid", "Wispy"
];

var PILOT_NOUNS = [
  "Badger", "Beacon", "Breeze", "Capsule", "Cedar", "Cloud", "Clover", "Comet",
  "Compass", "Cosmos", "Dolphin", "Drift", "Echo", "Falcon", "Fox", "Galaxy",
  "Glider", "Harbor", "Horizon", "Koala", "Lantern", "Lynx", "Maple", "Marble",
  "Meadow", "Meteor", "Nebula", "Orbit", "Otter", "Panda", "Pebble", "Photon",
  "Planet", "Puffin", "Pulsar", "Quasar", "Ranger", "River", "Robin", "Rocket",
  "Satellite", "Scout", "Shuttle", "Sparrow", "Star", "Turtle", "Voyager", "Willow"
];

var ADJECTIVE_SET = Object.create(null);
var NOUN_SET = Object.create(null);
for(var ai = 0; ai < PILOT_ADJECTIVES.length; ai++) ADJECTIVE_SET[PILOT_ADJECTIVES[ai]] = true;
for(var ni = 0; ni < PILOT_NOUNS.length; ni++) NOUN_SET[PILOT_NOUNS[ni]] = true;

function pad2(n){
  var s = String(n);
  return s.length < 2 ? ("0" + s) : s;
}

function pick(list, random){
  return list[Math.floor(random() * list.length)];
}

export function generatePilotName(rng){
  var random = typeof rng === "function" ? rng : Math.random;
  return pick(PILOT_ADJECTIVES, random) + " " + pick(PILOT_NOUNS, random) + " " + pad2(Math.floor(random() * 100));
}

export function rerollPilotName(current, rng){
  var next = generatePilotName(rng);
  var guard = 0;
  while(next === current && guard < 12){
    next = generatePilotName(rng);
    guard++;
  }
  return next;
}

export function isGeneratedPilotName(name){
  var parts = String(name == null ? "" : name).trim().split(" ");
  if(parts.length !== 3) return false;
  if(!ADJECTIVE_SET[parts[0]] || !NOUN_SET[parts[1]]) return false;
  return /^[0-9]{2}$/.test(parts[2]);
}

export { PILOT_ADJECTIVES, PILOT_NOUNS };
