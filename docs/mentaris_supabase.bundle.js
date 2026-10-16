"use strict";
(() => {
  // src/js/core/pilot_names.js
  var PILOT_ADJECTIVES = [
    "Amber",
    "Arctic",
    "Aurora",
    "Azure",
    "Bold",
    "Brave",
    "Breezy",
    "Bright",
    "Brisk",
    "Calm",
    "Clever",
    "Coral",
    "Cosmic",
    "Cozy",
    "Crystal",
    "Daring",
    "Eager",
    "Emerald",
    "Fuzzy",
    "Gentle",
    "Glowing",
    "Golden",
    "Happy",
    "Jolly",
    "Keen",
    "Kind",
    "Lucky",
    "Lunar",
    "Merry",
    "Mighty",
    "Mellow",
    "Neon",
    "Nimble",
    "Noble",
    "Nova",
    "Plucky",
    "Polar",
    "Prism",
    "Quiet",
    "Radiant",
    "Rapid",
    "Ruby",
    "Silver",
    "Solar",
    "Spark",
    "Spry",
    "Steady",
    "Stellar",
    "Sunny",
    "Swift",
    "Tropic",
    "Turbo",
    "Velvet",
    "Violet",
    "Vivid",
    "Wispy"
  ];
  var PILOT_NOUNS = [
    "Badger",
    "Beacon",
    "Breeze",
    "Capsule",
    "Cedar",
    "Cloud",
    "Clover",
    "Comet",
    "Compass",
    "Cosmos",
    "Dolphin",
    "Drift",
    "Echo",
    "Falcon",
    "Fox",
    "Galaxy",
    "Glider",
    "Harbor",
    "Horizon",
    "Koala",
    "Lantern",
    "Lynx",
    "Maple",
    "Marble",
    "Meadow",
    "Meteor",
    "Nebula",
    "Orbit",
    "Otter",
    "Panda",
    "Pebble",
    "Photon",
    "Planet",
    "Puffin",
    "Pulsar",
    "Quasar",
    "Ranger",
    "River",
    "Robin",
    "Rocket",
    "Satellite",
    "Scout",
    "Shuttle",
    "Sparrow",
    "Star",
    "Turtle",
    "Voyager",
    "Willow"
  ];
  var ADJECTIVE_SET = /* @__PURE__ */ Object.create(null);
  var NOUN_SET = /* @__PURE__ */ Object.create(null);
  for (ai = 0; ai < PILOT_ADJECTIVES.length; ai++)
    ADJECTIVE_SET[PILOT_ADJECTIVES[ai]] = true;
  var ai;
  for (ni = 0; ni < PILOT_NOUNS.length; ni++)
    NOUN_SET[PILOT_NOUNS[ni]] = true;
  var ni;
  function pad2(n) {
    var s = String(n);
    return s.length < 2 ? "0" + s : s;
  }
  function pick(list, random) {
    return list[Math.floor(random() * list.length)];
  }
  function generatePilotName(rng) {
    var random = typeof rng === "function" ? rng : Math.random;
    return pick(PILOT_ADJECTIVES, random) + " " + pick(PILOT_NOUNS, random) + " " + pad2(Math.floor(random() * 100));
  }
  function rerollPilotName(current, rng) {
    var next = generatePilotName(rng);
    var guard = 0;
    while (next === current && guard < 12) {
      next = generatePilotName(rng);
      guard++;
    }
    return next;
  }
  function isGeneratedPilotName(name) {
    var parts = String(name == null ? "" : name).trim().split(" ");
    if (parts.length !== 3)
      return false;
    if (!ADJECTIVE_SET[parts[0]] || !NOUN_SET[parts[1]])
      return false;
    return /^[0-9]{2}$/.test(parts[2]);
  }

  // src/js/core/supabase_scores.js
  var CONFIG_GLOBAL = "__MENTARIS_SUPABASE__";
  var DEFAULT_TABLE = "scores";
  var FETCH_TIMEOUT_MS = 12e3;
  var MAX_NAME_LEN = 40;
  var MAX_STR_FIELD = 64;
  var MAX_SCORE = 2e9;
  function readRuntimeConfig() {
    var g = typeof globalThis !== "undefined" ? globalThis : {};
    var cfg = g[CONFIG_GLOBAL];
    if (!cfg || typeof cfg !== "object")
      return null;
    var url = String(cfg.url || cfg.supabaseUrl || "").trim().replace(/\/+$/, "");
    var anonKey = String(cfg.anonKey || cfg.key || "").trim();
    var table = String(cfg.table || DEFAULT_TABLE).trim() || DEFAULT_TABLE;
    if (!url || !anonKey)
      return null;
    return { url, anonKey, table };
  }
  function isSupabaseScoresConfigured() {
    return !!readRuntimeConfig();
  }
  function clampScore(n) {
    var x = Math.floor(Number(n));
    if (!Number.isFinite(x))
      return 0;
    return Math.max(0, Math.min(MAX_SCORE, x));
  }
  function sanitizeField(s, maxLen) {
    return String(s == null ? "" : s).trim().slice(0, maxLen);
  }
  function supabaseRestHeaders(cfg, extra) {
    var h = Object.assign({
      apikey: cfg.anonKey,
      Authorization: "Bearer " + cfg.anonKey,
      Accept: "application/json",
      "Content-Type": "application/json"
    }, extra || {});
    return h;
  }
  async function readErrorBody(res) {
    var text = "";
    try {
      text = await res.text();
    } catch (e) {
      return res.statusText || "Request failed";
    }
    if (!text)
      return res.statusText || "HTTP " + res.status;
    try {
      var j = JSON.parse(text);
      if (j && typeof j.message === "string")
        return j.message;
      if (Array.isArray(j) && j[0] && typeof j[0].message === "string")
        return j[0].message;
    } catch (e) {
    }
    return text.slice(0, 200);
  }
  function fetchWithTimeout(url, options, timeoutMs) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var ms = timeoutMs || FETCH_TIMEOUT_MS;
    var t = setTimeout(function() {
      if (ctrl)
        try {
          ctrl.abort();
        } catch (e) {
        }
    }, ms);
    var opts = Object.assign({}, options || {});
    if (ctrl)
      opts.signal = ctrl.signal;
    return fetch(url, opts).finally(function() {
      clearTimeout(t);
    });
  }
  async function submitScore(playerName, score, questionMode) {
    var cfg = readRuntimeConfig();
    if (!cfg)
      return { success: false, error: "Supabase is not configured (set window.__MENTARIS_SUPABASE__)" };
    var body = {
      player_name: sanitizeField(playerName, MAX_NAME_LEN),
      score: clampScore(score),
      question_mode: sanitizeField(questionMode, MAX_STR_FIELD)
    };
    if (!isGeneratedPilotName(body.player_name)) {
      return { success: false, error: "Pilot name must be a generated callsign" };
    }
    if (!body.question_mode)
      body.question_mode = "classic";
    var url = cfg.url + "/rest/v1/" + encodeURIComponent(cfg.table);
    try {
      var res = await fetchWithTimeout(url, {
        method: "POST",
        headers: supabaseRestHeaders(cfg, { Prefer: "return=minimal" }),
        body: JSON.stringify(body)
      }, FETCH_TIMEOUT_MS);
      if (res.ok)
        return { success: true, error: null };
      var err = await readErrorBody(res);
      return { success: false, error: err || "Insert failed" };
    } catch (e) {
      var msg = e && e.name === "AbortError" ? "Request timed out" : String(e && e.message || e || "Network error");
      return { success: false, error: msg };
    }
  }
  async function fetchLeaderboard(limit) {
    var cfg = readRuntimeConfig();
    if (!cfg)
      return { success: false, data: [], error: "Supabase is not configured" };
    var lim = Math.max(1, Math.min(100, Math.floor(Number(limit)) || 10));
    var u = new URL(cfg.url + "/rest/v1/" + encodeURIComponent(cfg.table));
    u.searchParams.set("select", "id,created_at,player_name,score,ship,difficulty,question_mode,operation");
    u.searchParams.set("order", "score.desc");
    u.searchParams.set("limit", String(lim));
    try {
      var res = await fetchWithTimeout(u.toString(), {
        method: "GET",
        headers: supabaseRestHeaders(cfg)
      }, FETCH_TIMEOUT_MS);
      if (!res.ok) {
        var err = await readErrorBody(res);
        return { success: false, data: [], error: err || "Fetch failed" };
      }
      var rows = await res.json();
      if (!Array.isArray(rows))
        return { success: false, data: [], error: "Invalid response" };
      return { success: true, data: rows, error: null };
    } catch (e) {
      var msg = e && e.name === "AbortError" ? "Request timed out" : String(e && e.message || e || "Network error");
      return { success: false, data: [], error: msg };
    }
  }

  // src/js/entry/mentaris_supabase.js
  if (typeof globalThis !== "undefined") {
    globalThis.MentarisSupabaseScores = {
      submitScore,
      fetchLeaderboard,
      isSupabaseScoresConfigured
    };
    globalThis.MentarisPilotNames = {
      generatePilotName,
      rerollPilotName,
      isGeneratedPilotName
    };
  }
})();
//# sourceMappingURL=mentaris_supabase.bundle.js.map
