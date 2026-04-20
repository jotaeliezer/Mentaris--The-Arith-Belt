"use strict";

/**
 * Side Ops shell — renders the hub menu, per-game config screen, play stage,
 * HUD, pause overlay, and results overlay. Each game is mounted via its
 * `mount(container, config, api)` function and returns a teardown function.
 */

import { listCategories, getCategory, getGame } from "./registry.js";

// ---------------------------------------------------------------------------
// Tiny WebAudio helper — synthwave beeps. Best-effort; never throws.
// ---------------------------------------------------------------------------
const audioCtx = (function(){
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    return new AC();
  } catch(e){ return null; }
})();

function beep(freq, duration, type, gain){
  if(!audioCtx) return;
  try {
    if(audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain || 0.08, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch(e){ /* ignore */ }
}

const SFX = {
  click:   () => beep(520, 0.05, "square", 0.05),
  select:  () => beep(660, 0.08, "triangle", 0.06),
  success: () => { beep(660, 0.08, "sine", 0.08); setTimeout(()=>beep(880, 0.12, "sine", 0.08), 70); },
  error:   () => beep(180, 0.18, "sawtooth", 0.06),
  win:     () => {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => setTimeout(() => beep(f, 0.18, "triangle", 0.08), i * 110));
  },
  tick:    () => beep(380, 0.03, "square", 0.03)
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function el(tag, attrs, children){
  const node = document.createElement(tag);
  if(attrs){
    for(const k in attrs){
      if(k === "class") node.className = attrs[k];
      else if(k === "style") node.setAttribute("style", attrs[k]);
      else if(k === "dataset"){
        for(const dk in attrs[k]) node.dataset[dk] = attrs[k][dk];
      }
      else if(k.startsWith("on") && typeof attrs[k] === "function"){
        node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      }
      else if(k === "html") node.innerHTML = attrs[k];
      else if(attrs[k] != null) node.setAttribute(k, attrs[k]);
    }
  }
  if(children){
    for(const c of children){
      if(c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
  }
  return node;
}

function clear(node){
  while(node.firstChild) node.removeChild(node.firstChild);
}

function formatTime(ms){
  if(ms == null || !isFinite(ms)) return "0:00";
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return mm + ":" + (ss < 10 ? "0" : "") + ss;
}

// ---------------------------------------------------------------------------
// Shell state
// ---------------------------------------------------------------------------
let rootEl = null;
let crumbEl = null;
let hudBar = null;
let hudChips = {};
let gameContainer = null;
let pauseOverlay = null;
let resultsOverlay = null;

let activeGameId = null;
let activeGame = null;
let activeConfig = null;
let activeTeardown = null;
let activeOnPause = null;
let activeOnResume = null;
let hudTimer = null;
let hudTimerStart = 0;
let hudTimerBase = 0;
let hudTimerRunning = false;
let isPaused = false;

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------
export function start(root){
  rootEl = root;
  crumbEl = document.getElementById("sideOpsCrumb");
  document.addEventListener("keydown", onGlobalKey);
  showHub();
}

function setCrumb(text){
  if(crumbEl) crumbEl.textContent = text || "";
}

function onGlobalKey(e){
  if(!activeGameId) return;
  if(e.key === "Escape" || e.key === "p" || e.key === "P"){
    if(resultsOverlay && resultsOverlay.classList.contains("show")) return;
    togglePause();
    e.preventDefault();
  }
}

// ---------------------------------------------------------------------------
// Hub view (top-level panels)
// ---------------------------------------------------------------------------
function showHub(){
  teardownActive();
  clear(rootEl);
  setCrumb("Pick a mission");

  const cats = listCategories();
  const grid = el("div", { class: "sideOpsHubGrid" });

  cats.forEach((cat) => {
    const isGroup = Array.isArray(cat.games);
    const extra = isGroup
      ? el("span", { class: "sideOpsTileBadge" }, [cat.games.length + " variants"])
      : null;
    const tile = el("button", {
      class: "sideOpsTile",
      type: "button",
      onclick: () => {
        SFX.select();
        if(isGroup) showGroup(cat.id);
        else showConfig(cat.game.id);
      }
    }, [
      el("span", { class: "tag" }, [cat.tagline || "Mini Game"]),
      el("h3", { class: "name" }, [cat.title]),
      el("p", { class: "blurb" }, [cat.blurb || ""]),
      extra
    ]);
    grid.appendChild(tile);
  });

  const wrap = el("div", { class: "sideOpsHub" }, [
    el("div", { class: "sideOpsConfigHeader", style: "margin-bottom:14px;" }, [
      el("span", { class: "kicker" }, ["SIDE OPS // MINI GAMES"]),
      el("h2", {}, ["Pick an operation"]),
      el("p", {}, ["Short, focused math drills. Each panel has its own mechanic. Timer and stats report back after every run."])
    ]),
    grid
  ]);

  rootEl.appendChild(wrap);
}

// ---------------------------------------------------------------------------
// Group sub-hub (e.g. Memory Belts -> pick a matching variant)
// ---------------------------------------------------------------------------
function showGroup(catId){
  const cat = getCategory(catId);
  if(!cat || !Array.isArray(cat.games)){ showHub(); return; }
  teardownActive();
  clear(rootEl);
  setCrumb(cat.title + " \u2014 pick a belt");

  const grid = el("div", { class: "sideOpsHubGrid" });
  cat.games.forEach((g) => {
    const tile = el("button", {
      class: "sideOpsTile",
      type: "button",
      onclick: () => { SFX.select(); showConfig(g.id); }
    }, [
      el("span", { class: "tag" }, [g.tagline || "Mini Game"]),
      el("h3", { class: "name" }, [g.title]),
      el("p", { class: "blurb" }, [g.blurb || ""])
    ]);
    grid.appendChild(tile);
  });

  const back = el("button", {
    class: "btn",
    type: "button",
    onclick: () => { SFX.click(); showHub(); }
  }, ["Back"]);

  const wrap = el("div", { class: "sideOpsHub" }, [
    el("div", { class: "sideOpsConfigHeader", style: "margin-bottom:14px;" }, [
      el("span", { class: "kicker" }, ["SIDE OPS // " + cat.title.toUpperCase()]),
      el("h2", {}, [cat.title]),
      el("p", {}, [cat.blurb || ""])
    ]),
    grid,
    el("div", { class: "sideOpsActions", style: "margin-top:16px; justify-content:flex-start;" }, [back])
  ]);

  rootEl.appendChild(wrap);
}

// ---------------------------------------------------------------------------
// Config view
// ---------------------------------------------------------------------------
function findParentGroup(gameId){
  const cats = listCategories();
  for(let i = 0; i < cats.length; i++){
    const c = cats[i];
    if(Array.isArray(c.games) && c.games.some((g) => g.id === gameId)) return c;
  }
  return null;
}

function showConfig(gameId){
  const game = getGame(gameId);
  if(!game){ showHub(); return; }
  clear(rootEl);
  setCrumb(game.title + " — briefing");

  const schema = game.configSchema || [];
  const values = {};
  schema.forEach((f) => { values[f.id] = f.default; });

  const fieldsEl = el("div", { class: "sideOpsFields" });

  schema.forEach((field) => {
    fieldsEl.appendChild(renderField(field, values, () => {}));
  });

  const launch = el("button", {
    class: "btn primary",
    type: "button",
    onclick: () => {
      SFX.success();
      const errs = validateConfig(schema, values);
      if(errs.length){ showToastInline(fieldsEl.parentElement, errs.join(" \u2022 ")); return; }
      showPlay(game, Object.assign({}, values));
    }
  }, ["Launch"]);
  const parentGroup = findParentGroup(gameId);
  const back = el("button", {
    class: "btn",
    type: "button",
    onclick: () => {
      SFX.click();
      if(parentGroup) showGroup(parentGroup.id);
      else showHub();
    }
  }, ["Back"]);

  const wrap = el("div", { class: "sideOpsConfig" }, [
    el("div", { class: "sideOpsConfigHeader" }, [
      el("span", { class: "kicker" }, [game.tagline || "Side Op"]),
      el("h2", {}, [game.title]),
      el("p", {}, [game.brief || game.blurb || ""])
    ]),
    fieldsEl,
    el("div", { class: "sideOpsActions" }, [back, launch])
  ]);

  rootEl.appendChild(wrap);
}

function renderField(field, values, onChange){
  const id = "cfg_" + field.id;
  const wrap = el("div", { class: "sideOpsField" });
  wrap.appendChild(el("label", { for: id }, [field.label]));

  if(field.type === "number" || field.type === "range"){
    const input = el("input", {
      type: "number",
      id: id,
      min: field.min,
      max: field.max,
      step: field.step || 1,
      value: field.default
    });
    input.addEventListener("input", () => {
      let v = parseInt(input.value, 10);
      if(isNaN(v)) v = field.default;
      values[field.id] = v;
      onChange();
    });
    wrap.appendChild(input);
  } else if(field.type === "select"){
    const sel = el("select", { id: id });
    (field.options || []).forEach((opt) => {
      const o = el("option", { value: opt.value }, [opt.label]);
      if(opt.value === field.default) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      const raw = sel.value;
      values[field.id] = field.valueType === "number" ? parseInt(raw, 10) : raw;
      onChange();
    });
    wrap.appendChild(sel);
  } else if(field.type === "toggles"){
    const row = el("div", { class: "sideOpsToggleRow" });
    const current = new Set(field.default || []);
    values[field.id] = Array.from(current);
    (field.options || []).forEach((opt) => {
      const b = el("button", {
        type: "button",
        class: "sideOpsToggle" + (current.has(opt.value) ? " on" : ""),
        onclick: () => {
          if(current.has(opt.value)){
            if(current.size <= (field.min || 1)) return;
            current.delete(opt.value);
            b.classList.remove("on");
          } else {
            current.add(opt.value);
            b.classList.add("on");
          }
          values[field.id] = Array.from(current);
          onChange();
        }
      }, [opt.label]);
      row.appendChild(b);
    });
    wrap.appendChild(row);
  } else if(field.type === "text"){
    const input = el("input", {
      type: "text",
      id: id,
      value: field.default || ""
    });
    input.addEventListener("input", () => {
      values[field.id] = input.value;
      onChange();
    });
    wrap.appendChild(input);
  } else if(field.type === "ship"){
    const options = (field.options || []);
    const unlockMap = {};
    try{
      const raw = localStorage.getItem("mentaris.unlocks.ships");
      if(raw){
        const arr = JSON.parse(raw);
        if(Array.isArray(arr)) arr.forEach((id) => { unlockMap[id] = true; });
      }
    }catch(e){}
    const available = options.filter((o) => o.defaultUnlocked || unlockMap[o.value]);
    const initial = (field.default && available.some((o) => o.value === field.default))
      ? field.default
      : (available[0] && available[0].value);
    values[field.id] = initial;

    const grid = el("div", { class: "shipPicker" });
    options.forEach((opt) => {
      const locked = !(opt.defaultUnlocked || unlockMap[opt.value]);
      const card = el("button", {
        type: "button",
        class: "shipPickCard" + (opt.value === initial ? " selected" : "") + (locked ? " locked" : ""),
        "data-ship-id": opt.value,
        title: locked ? "Locked — unlock in main game" : opt.label,
        onclick: () => {
          if(locked) return;
          values[field.id] = opt.value;
          grid.querySelectorAll(".shipPickCard").forEach((n) => n.classList.remove("selected"));
          card.classList.add("selected");
          onChange();
        }
      });
      const img = el("img", { class: "shipThumb", src: opt.icon, alt: opt.label });
      img.loading = "lazy";
      img.decoding = "async";
      card.appendChild(img);
      card.appendChild(el("span", { class: "shipName" }, [opt.label]));
      if(locked) card.appendChild(el("span", { class: "lockIcon" }, ["Locked"]));
      grid.appendChild(card);
    });
    wrap.appendChild(grid);
  }

  if(field.hint) wrap.appendChild(el("div", { class: "hint" }, [field.hint]));
  return wrap;
}

function validateConfig(schema, values){
  const errs = [];
  schema.forEach((f) => {
    if(f.type === "number" || f.type === "range"){
      const v = values[f.id];
      if(typeof v !== "number" || isNaN(v)){ errs.push(f.label + " required"); return; }
      if(f.min != null && v < f.min) errs.push(f.label + " must be \u2265 " + f.min);
      if(f.max != null && v > f.max) errs.push(f.label + " must be \u2264 " + f.max);
    }
  });
  if(typeof schema.validate === "function"){
    const more = schema.validate(values) || [];
    more.forEach((m) => errs.push(m));
  }
  return errs;
}

function showToastInline(parent, msg){
  const t = el("div", {
    style: "margin-top:8px; color: var(--bad); font-size:12px; letter-spacing:1px; text-transform:uppercase;"
  }, [msg]);
  parent.parentElement.insertBefore(t, parent.nextSibling);
  setTimeout(() => { if(t.parentNode) t.parentNode.removeChild(t); }, 2400);
}

// ---------------------------------------------------------------------------
// Play view
// ---------------------------------------------------------------------------
function showPlay(game, config){
  teardownActive();
  clear(rootEl);
  activeGameId = game.id;
  activeGame = game;
  activeConfig = config;
  setCrumb(game.title + " — live");

  hudBar = el("div", { class: "sideOpsHudBar", hidden: "" });
  hudChips = {};
  gameContainer = el("div", { class: "sideOpsGame" });
  pauseOverlay = buildPauseOverlay();
  resultsOverlay = buildResultsOverlay();

  const wrap = el("div", { style: "position:relative;" }, [
    hudBar,
    gameContainer,
    pauseOverlay,
    resultsOverlay
  ]);

  rootEl.appendChild(wrap);

  const api = {
    hud: {
      setChips: setHudChips,
      setStat: setHudStat,
      flashStat: flashHudStat,
      startTimer: startHudTimer,
      stopTimer: stopHudTimer,
      setTime: setHudTime,
      countdownFrom: startHudCountdown,
      hide: () => { hudBar.setAttribute("hidden", ""); },
      show: () => { hudBar.removeAttribute("hidden"); }
    },
    sfx: SFX,
    exit: (stats) => showResults(stats || {}),
    back: () => exitToHub()
  };

  try {
    const result = game.mount(gameContainer, config, api);
    if(typeof result === "function"){
      activeTeardown = result;
    } else if(result && typeof result === "object"){
      activeTeardown = typeof result.teardown === "function" ? result.teardown : null;
      activeOnPause = typeof result.onPause === "function" ? result.onPause : null;
      activeOnResume = typeof result.onResume === "function" ? result.onResume : null;
    } else {
      activeTeardown = null;
    }
  } catch(e){
    console.error("Failed to mount side-op game", game.id, e);
    clear(gameContainer);
    gameContainer.appendChild(el("div", { class: "sideOpsMsg" }, [
      "Failed to start this op. Check the console for details."
    ]));
  }
}

function exitToHub(){
  const parent = activeGameId ? findParentGroup(activeGameId) : null;
  teardownActive();
  if(parent) showGroup(parent.id);
  else showHub();
}

function teardownActive(){
  if(activeTeardown){
    try { activeTeardown(); } catch(e){ console.warn(e); }
  }
  stopHudTimer();
  activeGameId = null;
  activeGame = null;
  activeConfig = null;
  activeTeardown = null;
  activeOnPause = null;
  activeOnResume = null;
  hudBar = null;
  hudChips = {};
  gameContainer = null;
  pauseOverlay = null;
  resultsOverlay = null;
  isPaused = false;
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
function setHudChips(defs){
  clear(hudBar);
  hudChips = {};
  (defs || []).forEach((d) => {
    if(d.spacer){
      hudBar.appendChild(el("div", { class: "sideOpsHudSpacer" }));
      return;
    }
    const chip = el("div", { class: "sideOpsHudChip" + (d.variant ? " " + d.variant : "") }, [
      el("span", { class: "label" }, [d.label]),
      el("span", { class: "value" }, [d.value != null ? String(d.value) : ""])
    ]);
    if(d.id) hudChips[d.id] = chip;
    hudBar.appendChild(chip);
  });

  const backBtn = el("button", {
    class: "btn",
    type: "button",
    onclick: () => { SFX.click(); exitToHub(); }
  }, ["Back"]);
  hudBar.appendChild(backBtn);
  hudBar.removeAttribute("hidden");
}

function setHudStat(id, value, variant){
  const chip = hudChips[id];
  if(!chip) return;
  const v = chip.querySelector(".value");
  if(v) v.textContent = value != null ? String(value) : "";
  if(variant){
    chip.classList.remove("accent","warn","bad","good");
    chip.classList.add(variant);
  }
}

function flashHudStat(id){
  const chip = hudChips[id];
  if(!chip) return;
  chip.classList.remove("justMatched");
  // Force reflow so the animation restarts on repeated flashes.
  void chip.offsetWidth;
  chip.classList.add("justMatched");
  setTimeout(() => chip.classList.remove("justMatched"), 420);
}

function setHudTime(ms){
  setHudStat("time", formatTime(ms));
}

function startHudTimer(){
  stopHudTimer();
  hudTimerBase = 0;
  hudTimerStart = performance.now();
  hudTimerRunning = true;
  setHudTime(0);
  hudTimer = setInterval(() => {
    if(!hudTimerRunning) return;
    const now = performance.now();
    setHudTime(hudTimerBase + (now - hudTimerStart));
  }, 250);
}

function stopHudTimer(){
  if(hudTimer){ clearInterval(hudTimer); hudTimer = null; }
  hudTimerRunning = false;
}

function pauseHudTimer(){
  if(!hudTimerRunning) return;
  hudTimerBase += performance.now() - hudTimerStart;
  hudTimerRunning = false;
}

function resumeHudTimer(){
  if(hudTimerRunning) return;
  hudTimerStart = performance.now();
  hudTimerRunning = true;
}

function startHudCountdown(totalMs, onDone){
  stopHudTimer();
  const start = performance.now();
  const tick = () => {
    const elapsed = performance.now() - start;
    const remain = Math.max(0, totalMs - elapsed);
    setHudTime(remain);
    if(remain <= 0){
      stopHudTimer();
      if(typeof onDone === "function") onDone();
      return;
    }
  };
  tick();
  hudTimer = setInterval(tick, 250);
  hudTimerRunning = true;
}

// ---------------------------------------------------------------------------
// Pause overlay
// ---------------------------------------------------------------------------
function buildPauseOverlay(){
  const resumeBtn = el("button", {
    class: "btn primary",
    type: "button",
    onclick: () => togglePause()
  }, ["Resume"]);
  const quitBtn = el("button", {
    class: "btn",
    type: "button",
    onclick: () => exitToHub()
  }, ["Quit Op"]);
  return el("div", { class: "sideOpsPause" }, [
    el("div", { class: "sideOpsPauseCard" }, [
      el("h3", {}, ["Paused"]),
      el("div", { style: "color:var(--muted); font-size:12px; letter-spacing:1px;" }, ["Press P or Esc to resume"]),
      el("div", { class: "row" }, [resumeBtn, quitBtn])
    ])
  ]);
}

function togglePause(){
  if(!activeGameId || !pauseOverlay) return;
  isPaused = !isPaused;
  if(isPaused){
    pauseOverlay.classList.add("show");
    pauseHudTimer();
    if(activeOnPause) try { activeOnPause(); } catch(e){ /* noop */ }
  } else {
    pauseOverlay.classList.remove("show");
    resumeHudTimer();
    if(activeOnResume) try { activeOnResume(); } catch(e){ /* noop */ }
  }
}

// ---------------------------------------------------------------------------
// Results overlay
// ---------------------------------------------------------------------------
function buildResultsOverlay(){
  return el("div", { class: "sideOpsResults" }, [
    el("div", { class: "sideOpsResultsCard" }, [
      el("div", { class: "kicker", id: "sideOpsResKicker" }, ["MISSION COMPLETE"]),
      el("h2", { id: "sideOpsResTitle" }, ["Nice run"]),
      el("div", { class: "sideOpsResultsStats", id: "sideOpsResStats" }),
      el("div", { class: "row" }, [
        el("button", {
          class: "btn",
          type: "button",
          onclick: () => { SFX.click(); exitToHub(); }
        }, ["Side Ops"]),
        el("button", {
          class: "btn primary",
          type: "button",
          onclick: () => {
            SFX.select();
            const g = activeGame;
            const cfg = Object.assign({}, activeConfig);
            if(g) showPlay(g, cfg);
          }
        }, ["Play Again"])
      ])
    ])
  ]);
}

function showResults(stats){
  if(!resultsOverlay) return;
  stopHudTimer();
  SFX.win();
  const statsHost = resultsOverlay.querySelector("#sideOpsResStats");
  const title = resultsOverlay.querySelector("#sideOpsResTitle");
  const kicker = resultsOverlay.querySelector("#sideOpsResKicker");
  if(kicker) kicker.textContent = stats.kicker || "MISSION COMPLETE";
  if(title) title.textContent = stats.title || (activeGame ? activeGame.title : "Nice run");
  clear(statsHost);
  const rows = stats.rows || [];
  rows.forEach((r) => {
    statsHost.appendChild(el("div", { class: "sideOpsResultsStat" }, [
      el("div", { class: "label" }, [r.label]),
      el("div", { class: "value" }, [String(r.value)])
    ]));
  });
  resultsOverlay.classList.add("show");
}
