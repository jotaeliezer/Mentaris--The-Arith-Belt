"use strict";

/**
 * Supabase PostgREST client for the `scores` table.
 * Configure at runtime (never commit keys):
 *   window.__MENTARIS_SUPABASE__ = { url, anonKey, table?: "scores" }
 * Or load public/supabase_config.js (copy from supabase_config.example.js; gitignored).
 */

var CONFIG_GLOBAL = "__MENTARIS_SUPABASE__";
var DEFAULT_TABLE = "scores";
var FETCH_TIMEOUT_MS = 12000;
var MAX_NAME_LEN = 40;
var MAX_STR_FIELD = 64;
var MAX_SCORE = 2000000000;

function readRuntimeConfig(){
  var g = typeof globalThis !== "undefined" ? globalThis : {};
  var cfg = g[CONFIG_GLOBAL];
  if(!cfg || typeof cfg !== "object") return null;
  var url = String(cfg.url || cfg.supabaseUrl || "").trim().replace(/\/+$/, "");
  var anonKey = String(cfg.anonKey || cfg.key || "").trim();
  var table = String(cfg.table || DEFAULT_TABLE).trim() || DEFAULT_TABLE;
  if(!url || !anonKey) return null;
  return { url: url, anonKey: anonKey, table: table };
}

export function isSupabaseScoresConfigured(){
  return !!readRuntimeConfig();
}

function clampScore(n){
  var x = Math.floor(Number(n));
  if(!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(MAX_SCORE, x));
}

function sanitizeField(s, maxLen){
  return String(s == null ? "" : s).trim().slice(0, maxLen);
}

function supabaseRestHeaders(cfg, extra){
  var h = Object.assign({
    apikey: cfg.anonKey,
    Authorization: "Bearer " + cfg.anonKey,
    Accept: "application/json",
    "Content-Type": "application/json"
  }, extra || {});
  return h;
}

async function readErrorBody(res){
  var text = "";
  try{
    text = await res.text();
  }catch(e){
    return res.statusText || "Request failed";
  }
  if(!text) return res.statusText || ("HTTP " + res.status);
  try{
    var j = JSON.parse(text);
    if(j && typeof j.message === "string") return j.message;
    if(Array.isArray(j) && j[0] && typeof j[0].message === "string") return j[0].message;
  }catch(e){
    // ignore
  }
  return text.slice(0, 200);
}

function fetchWithTimeout(url, options, timeoutMs){
  var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  var ms = timeoutMs || FETCH_TIMEOUT_MS;
  var t = setTimeout(function(){
    if(ctrl) try{ ctrl.abort(); }catch(e){}
  }, ms);
  var opts = Object.assign({}, options || {});
  if(ctrl) opts.signal = ctrl.signal;
  return fetch(url, opts).finally(function(){
    clearTimeout(t);
  });
}

/**
 * Insert one score row (anon key must be allowed by RLS).
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function submitScore(playerName, score, ship, difficulty, questionMode, operation){
  var cfg = readRuntimeConfig();
  if(!cfg) return { success: false, error: "Supabase is not configured (set window.__MENTARIS_SUPABASE__)" };

  var body = {
    player_name: sanitizeField(playerName, MAX_NAME_LEN),
    score: clampScore(score),
    ship: sanitizeField(ship, MAX_STR_FIELD),
    difficulty: sanitizeField(difficulty, MAX_STR_FIELD),
    question_mode: sanitizeField(questionMode, MAX_STR_FIELD),
    operation: sanitizeField(operation, MAX_STR_FIELD)
  };

  if(!body.player_name) return { success: false, error: "Player name is required" };

  var url = cfg.url + "/rest/v1/" + encodeURIComponent(cfg.table);
  try{
    var res = await fetchWithTimeout(url, {
      method: "POST",
      headers: supabaseRestHeaders(cfg, { Prefer: "return=minimal" }),
      body: JSON.stringify(body)
    }, FETCH_TIMEOUT_MS);

    if(res.ok) return { success: true, error: null };
    var err = await readErrorBody(res);
    return { success: false, error: err || "Insert failed" };
  }catch(e){
    var msg = e && e.name === "AbortError" ? "Request timed out" : String((e && e.message) || e || "Network error");
    return { success: false, error: msg };
  }
}

/**
 * Top scores by score descending.
 * @returns {Promise<{success: boolean, data: Array<Object>, error: string|null}>}
 */
export async function fetchLeaderboard(limit){
  var cfg = readRuntimeConfig();
  if(!cfg) return { success: false, data: [], error: "Supabase is not configured" };

  var lim = Math.max(1, Math.min(100, Math.floor(Number(limit)) || 10));
  var u = new URL(cfg.url + "/rest/v1/" + encodeURIComponent(cfg.table));
  u.searchParams.set("select", "id,created_at,player_name,score,ship,difficulty,question_mode,operation");
  u.searchParams.set("order", "score.desc");
  u.searchParams.set("limit", String(lim));

  try{
    var res = await fetchWithTimeout(u.toString(), {
      method: "GET",
      headers: supabaseRestHeaders(cfg)
    }, FETCH_TIMEOUT_MS);

    if(!res.ok){
      var err = await readErrorBody(res);
      return { success: false, data: [], error: err || "Fetch failed" };
    }
    var rows = await res.json();
    if(!Array.isArray(rows)) return { success: false, data: [], error: "Invalid response" };
    return { success: true, data: rows, error: null };
  }catch(e){
    var msg = e && e.name === "AbortError" ? "Request timed out" : String((e && e.message) || e || "Network error");
    return { success: false, data: [], error: msg };
  }
}
