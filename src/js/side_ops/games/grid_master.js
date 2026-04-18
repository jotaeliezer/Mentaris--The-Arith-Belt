"use strict";

/**
 * Grid Master — seeded add/mul drill. Port of
 * C:\Users\Jos\Documents\ATMC\games\grid_master\ (React version).
 * Implements row x column coverage: every row is paired with every column,
 * column-major order. Timer counts down; session ends on timeout or when
 * all items are answered.
 */

// ---------------------------------------------------------------------------
// Seeded RNG — ported verbatim from src/lib/core.ts
// ---------------------------------------------------------------------------
function xmur3(str){
  let h = 1779033703 ^ str.length;
  for(let i = 0; i < str.length; i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function hash(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  };
}

function sfc32(a, b, c, d){
  return function rng(){
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function rngFromSeed(seed){
  const h = xmur3(String(seed));
  return sfc32(h(), h(), h(), h());
}

function shuffleInPlace(arr, rng){
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
  }
  return arr;
}

// ---------------------------------------------------------------------------
// Number sequence generator — ported from AddPage.tsx/MulPage.tsx
// ---------------------------------------------------------------------------
function genDigitsSeq(rng, n, digits){
  const L = [];
  const d = digits;
  const digs = [];
  for(let i = 0; i < d; i++){
    if(i === 0){
      digs.push(d > 1 ? 1 + Math.floor(rng() * 9) : Math.floor(rng() * 10));
    } else {
      digs.push(Math.floor(rng() * 10));
    }
  }
  for(let i = 0; i < n; i++){
    let v = 0;
    for(let k = 0; k < digs.length; k++) v = v * 10 + digs[k];
    L.push(v);
    digs[d - 1] = (digs[d - 1] + 3) % 10;
    digs[0] = (digs[0] + 3) % 10;
    if(d > 1 && digs[0] === 0) digs[0] = (digs[0] + 3) % 10 || 1;
    for(let j = 1; j < d - 1; j++){
      if(Math.random() < 0.3) digs[j] = Math.floor(rng() * 10);
    }
  }
  return L;
}

function sizesFor(maxItems){
  if(maxItems === 40) return { ACOUNT: 8, BCOUNT: 5 };
  return { ACOUNT: 10, BCOUNT: 8 };
}

// ---------------------------------------------------------------------------
// Session builders
// ---------------------------------------------------------------------------
function buildAddSession(seed, digitA, digitB, maxItems){
  const rng = rngFromSeed(seed);
  const { ACOUNT, BCOUNT } = sizesFor(maxItems);
  const AsBase = genDigitsSeq(rng, 10, digitA).slice(0, ACOUNT);
  const Bs = genDigitsSeq(rng, 10, digitB).slice(0, BCOUNT);

  const idxs = [];
  for(let i = 0; i < ACOUNT; i++) idxs.push(i);
  shuffleInPlace(idxs, rng);
  const negCount = Math.floor(ACOUNT / 2);
  const negSet = new Set(idxs.slice(0, negCount));
  const As = AsBase.map((v, i) => negSet.has(i) ? -v : v);

  const items = [];
  for(let ci = 0; ci < Bs.length; ci++){
    for(let ri = 0; ri < As.length; ri++){
      items.push({ ri, ci, A: As[ri], B: Bs[ci], answer: As[ri] + Bs[ci] });
    }
  }
  return { seed, As, Bs, items };
}

function buildMulSession(seed, digitA, digitB, maxItems){
  const rng = rngFromSeed(seed);
  const { ACOUNT, BCOUNT } = sizesFor(maxItems);
  const As = genDigitsSeq(rng, 10, digitA).slice(0, ACOUNT);
  const bs = genDigitsSeq(rng, 10, digitB).slice(0, BCOUNT);

  const items = [];
  for(let ci = 0; ci < bs.length; ci++){
    for(let ri = 0; ri < As.length; ri++){
      items.push({ ri, ci, A: As[ri], B: bs[ci], answer: As[ri] * bs[ci] });
    }
  }
  return { seed, As, Bs: bs, items };
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------
function fmtTime(ms){
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
}

function formatOperand(n){
  return n < 0 ? "(" + n + ")" : String(n);
}

function mount(container, config, api){
  const mode = config.mode === "add" ? "add" : "mul";
  const maxItems = config.items === 40 ? 40 : 80;
  const minutes = [3, 5, 10].indexOf(config.minutes) >= 0 ? config.minutes : 10;
  const digitA = Math.max(1, Math.min(3, config.digitA || 3));
  const digitB = Math.max(1, Math.min(3, config.digitB || (mode === "mul" ? 1 : 3)));
  const seed = String(Math.floor(Math.random() * 2147483647));

  const session = mode === "add"
    ? buildAddSession(seed, digitA, digitB, maxItems)
    : buildMulSession(seed, digitA, digitB, maxItems);

  const state = {
    idx: 0,
    log: [],
    itemStart: 0,
    deadline: performance.now() + minutes * 60 * 1000,
    ended: false,
    destroyed: false
  };

  api.hud.setChips([
    { id: "progress", label: "Progress", value: "0 / " + maxItems, variant: "accent" },
    { id: "correct", label: "Correct", value: "0" },
    { id: "streak", label: "Streak", value: "0", variant: "good" },
    { id: "time", label: "Time", value: fmtTime(minutes * 60 * 1000), variant: "warn" },
    { spacer: true }
  ]);

  // DOM
  container.innerHTML = "";

  const seedBadge = document.createElement("div");
  seedBadge.style.cssText = "font-size:10px; letter-spacing:2px; text-transform:uppercase; color: var(--ui-text-label); margin-bottom:12px;";
  seedBadge.textContent = "MODE: " + mode.toUpperCase() + " \u2022 SEED: " + seed + " \u2022 " + (mode === "add" ? digitA + "d + " + digitB + "d" : digitA + "d \u00d7 " + digitB + "d");
  container.appendChild(seedBadge);

  const promptEl = document.createElement("div");
  promptEl.className = "gridMasterPrompt";
  promptEl.style.cssText = [
    "font-size: clamp(32px, 6vw, 64px)",
    "font-weight:700",
    "letter-spacing:2px",
    "text-align:center",
    "color: var(--ui-text-bright)",
    "text-shadow: 0 0 18px rgba(0,229,255,.25)",
    "padding:24px 12px",
    "transition: color .2s ease, text-shadow .2s ease"
  ].join(";");
  container.appendChild(promptEl);

  // Direction toggle row (LTR / RTL)
  const dirRow = document.createElement("div");
  dirRow.style.cssText = "display:flex; gap:6px; justify-content:center; align-items:center; margin-bottom:10px;";
  container.appendChild(dirRow);

  const dirLabel = document.createElement("span");
  dirLabel.textContent = "Entry";
  dirLabel.style.cssText = "font-size:10px; letter-spacing:2px; text-transform:uppercase; color: var(--ui-text-label); margin-right:4px;";
  dirRow.appendChild(dirLabel);

  function makeSeg(id, text, title){
    const b = document.createElement("button");
    b.className = "btn sideOpsToggle";
    b.type = "button";
    b.id = id;
    b.textContent = text;
    b.title = title;
    b.style.cssText = "padding:6px 12px; font-size:11px; letter-spacing:1.5px; min-width:64px;";
    return b;
  }
  const segLR = makeSeg("gmSegLR", "L\u2192R", "Type left-to-right");
  const segRL = makeSeg("gmSegRL", "R\u2192L", "Type right-to-left");
  dirRow.appendChild(segLR);
  dirRow.appendChild(segRL);

  const inputWrap = document.createElement("div");
  inputWrap.style.cssText = "display:flex; gap:10px; justify-content:center; align-items:center; flex-wrap:wrap;";
  container.appendChild(inputWrap);

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.readOnly = true;
  input.style.cssText = [
    "font: inherit",
    "font-size:28px",
    "font-weight:700",
    "letter-spacing:2px",
    "text-align:center",
    "padding:12px 18px",
    "width:min(260px, 70vw)",
    "background: rgba(0,0,0,.35)",
    "color: var(--ui-text-bright)",
    "border:1px solid var(--ui-border-accent-strong)",
    "border-radius:12px",
    "outline:none",
    "caret-color: transparent"
  ].join(";");
  input.tabIndex = 0;
  inputWrap.appendChild(input);

  const submitBtn = document.createElement("button");
  submitBtn.className = "btn";
  submitBtn.type = "button";
  submitBtn.textContent = "Submit";
  submitBtn.style.cssText = "border-color: var(--ui-border-accent-strong); background: rgba(0,229,255,.14); color: var(--ui-accent-cyan-soft); min-width:110px;";
  inputWrap.appendChild(submitBtn);

  if(mode === "add"){
    const neg = document.createElement("button");
    neg.className = "btn";
    neg.type = "button";
    neg.textContent = "\u00B1";
    neg.title = "Toggle sign";
    neg.addEventListener("click", () => {
      if(!input.value){ input.value = "-"; }
      else if(input.value.charAt(0) === "-"){ input.value = input.value.slice(1); }
      else { input.value = "-" + input.value; }
      input.focus();
    });
    inputWrap.appendChild(neg);
  }

  let entryRTL = (config.direction || "rtl") === "rtl";
  function setDir(rtl){
    entryRTL = rtl;
    segLR.classList.toggle("on", !rtl);
    segRL.classList.toggle("on", rtl);
    segLR.style.background = !rtl ? "rgba(0,229,255,.18)" : "";
    segRL.style.background =  rtl ? "rgba(0,229,255,.18)" : "";
    input.focus();
  }
  segLR.addEventListener("click", () => setDir(false));
  segRL.addEventListener("click", () => setDir(true));
  setDir(entryRTL);

  const feedback = document.createElement("div");
  feedback.style.cssText = "min-height:20px; margin-top:14px; text-align:center; letter-spacing:2px; text-transform:uppercase; font-size:12px;";
  container.appendChild(feedback);

  let correctCount = 0;
  let currentStreak = 0;
  let bestStreak = 0;

  function currentItem(){ return session.items[state.idx]; }

  function renderPrompt(){
    const it = currentItem();
    if(!it) return;
    if(mode === "add"){
      promptEl.textContent = formatOperand(it.A) + "  +  " + formatOperand(it.B) + "  =  ?";
    } else {
      promptEl.textContent = it.A + "  \u00d7  " + it.B + "  =  ?";
    }
    promptEl.classList.remove("correct", "wrong");
    void promptEl.offsetWidth;
    promptEl.style.animation = "none";
    void promptEl.offsetWidth;
    promptEl.style.animation = "";
    input.value = "";
    input.focus();
    state.itemStart = performance.now();
  }

  function flashFeedback(ok){
    feedback.textContent = ok ? "CORRECT" : "MISS";
    feedback.style.color = ok ? "var(--good)" : "var(--bad)";
    promptEl.classList.remove("correct", "wrong");
    void promptEl.offsetWidth;
    promptEl.classList.add(ok ? "correct" : "wrong");
    setTimeout(() => {
      if(state.destroyed) return;
      feedback.textContent = "";
      promptEl.classList.remove("correct", "wrong");
    }, 360);
  }

  function submitAnswer(){
    if(state.ended || state.destroyed) return;
    const it = currentItem();
    if(!it) return;
    const raw = input.value.trim();
    const parsed = parseInt(raw, 10);
    const userFinal = raw === "" || isNaN(parsed) ? null : parsed;
    const correct = userFinal != null && userFinal === it.answer;
    const latency = performance.now() - state.itemStart;
    state.log.push({
      ri: it.ri, ci: it.ci, A: it.A, B: it.B,
      answer: it.answer, userFinal: userFinal, correct: correct, latencyMs: latency
    });
    if(correct){
      correctCount++;
      currentStreak++;
      if(currentStreak > bestStreak) bestStreak = currentStreak;
      api.sfx.success();
    } else {
      currentStreak = 0;
      api.sfx.error();
    }
    flashFeedback(correct);
    api.hud.setStat("correct", String(correctCount));
    api.hud.setStat("streak", String(currentStreak), "good");
    if(correct && api.hud.flashStat){
      api.hud.flashStat("correct");
      if(currentStreak >= 3) api.hud.flashStat("streak");
    }
    state.idx++;
    api.hud.setStat("progress", state.idx + " / " + maxItems);
    if(state.idx >= maxItems){
      endSession("complete");
    } else {
      renderPrompt();
    }
  }

  function endSession(reason){
    if(state.ended) return;
    state.ended = true;
    stopTicker();
    const attempted = state.log.length;
    const acc = attempted ? Math.round((100 * correctCount) / attempted) : 0;
    const avgLatency = attempted
      ? Math.round(state.log.reduce((s, x) => s + x.latencyMs, 0) / attempted)
      : 0;
    const kicker = reason === "timeup"
      ? "TIME UP"
      : (reason === "ended" ? "ENDED EARLY" : "GRID CLEAR");
    api.exit({
      kicker: kicker,
      title: mode === "add" ? "Addition Drill" : "Multiplication Drill",
      rows: [
        { label: "Attempted", value: attempted + " / " + maxItems },
        { label: "Correct", value: correctCount + " (" + acc + "%)" },
        { label: "Best Streak", value: bestStreak },
        { label: "Avg Time", value: (avgLatency / 1000).toFixed(2) + "s" }
      ]
    });
  }

  function tick(){
    const remain = state.deadline - performance.now();
    api.hud.setStat("time", fmtTime(remain));
    if(remain <= 0){
      endSession("timeup");
    }
  }
  let tickHandle = setInterval(tick, 250);
  function stopTicker(){
    if(tickHandle){ clearInterval(tickHandle); tickHandle = null; }
  }

  submitBtn.addEventListener("click", submitAnswer);

  function handleKeyDown(e){
    if(state.ended || state.destroyed) return;
    if(input.disabled) return;
    const tgt = e.target;
    if(tgt && tgt !== input && tgt !== document.body && typeof tgt.tagName === "string"){
      const tag = tgt.tagName.toLowerCase();
      if(tag === "input" || tag === "textarea" || tag === "select") return;
    }
    if(e.ctrlKey || e.metaKey || e.altKey) return;
    if(e.key === "Enter"){ e.preventDefault(); submitAnswer(); return; }
    if(e.key === "Backspace"){
      e.preventDefault();
      let v = input.value;
      if(!v) return;
      if(entryRTL){
        // Remove the leftmost typed digit (newest), keep sign if present
        if(v.charAt(0) === "-"){
          v = "-" + v.slice(2);
        } else {
          v = v.slice(1);
        }
      } else {
        v = v.slice(0, -1);
      }
      input.value = v;
      return;
    }
    if(/^[0-9]$/.test(e.key)){
      e.preventDefault();
      let v = input.value;
      if(entryRTL){
        if(v.charAt(0) === "-") v = "-" + e.key + v.slice(1);
        else v = e.key + v;
      } else {
        v = v + e.key;
      }
      input.value = v;
      return;
    }
  }
  document.addEventListener("keydown", handleKeyDown);
  input.addEventListener("focus", () => { /* visual only */ });

  const endEarly = document.createElement("button");
  endEarly.className = "btn";
  endEarly.type = "button";
  endEarly.textContent = "End Now";
  endEarly.style.cssText = "margin-top:18px; border-color: rgba(255,77,109,.35);";
  endEarly.addEventListener("click", () => endSession("ended"));
  const endRow = document.createElement("div");
  endRow.style.cssText = "display:flex; justify-content:center;";
  endRow.appendChild(endEarly);
  container.appendChild(endRow);

  renderPrompt();

  let pauseRemainder = 0;
  return {
    teardown(){
      state.destroyed = true;
      stopTicker();
      document.removeEventListener("keydown", handleKeyDown);
    },
    onPause(){
      pauseRemainder = state.deadline - performance.now();
      stopTicker();
      input.disabled = true;
    },
    onResume(){
      if(state.ended || state.destroyed) return;
      state.deadline = performance.now() + Math.max(0, pauseRemainder);
      tickHandle = setInterval(tick, 250);
      input.disabled = false;
      input.focus();
    }
  };
}

export const descriptor = {
  id: "grid_master",
  title: "Grid Master",
  tagline: "Drill \u2022 Add / Mul",
  blurb: "Every row paired with every column. Timed mental-math sprint with per-question latency tracking.",
  brief: "Pick mode, grid size, digit widths, and duration. Questions proceed column-by-column through the generated grid. Enter submits.",
  configSchema: [
    {
      type: "select", id: "mode", label: "Mode", default: "mul", valueType: "string",
      options: [
        { value: "mul", label: "Multiplication" },
        { value: "add", label: "Addition" }
      ]
    },
    {
      type: "select", id: "items", label: "Grid Size", default: 40, valueType: "number",
      options: [
        { value: 40, label: "40 (8 \u00d7 5)" },
        { value: 80, label: "80 (10 \u00d7 8)" }
      ],
      hint: "Total questions."
    },
    {
      type: "select", id: "minutes", label: "Time", default: 5, valueType: "number",
      options: [
        { value: 3, label: "3 min" },
        { value: 5, label: "5 min" },
        { value: 10, label: "10 min" }
      ]
    },
    {
      type: "number", id: "digitA", label: "Row digits", default: 3, min: 1, max: 3,
      hint: "Width of row values."
    },
    {
      type: "number", id: "digitB", label: "Col digits", default: 1, min: 1, max: 3,
      hint: "Width of column values."
    },
    {
      type: "select", id: "direction", label: "Entry direction", default: "rtl", valueType: "string",
      options: [
        { value: "rtl", label: "R \u2192 L (right-to-left)" },
        { value: "ltr", label: "L \u2192 R (left-to-right)" }
      ],
      hint: "Live toggle is available during play."
    }
  ],
  mount: mount
};
