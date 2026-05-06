"use strict";

import { clamp, makeQuestion } from "../util/math_questions.js";

/**
 * Neon Snake — math-themed "snake", re-imagined as a Mentaris ship chasing
 * numbered asteroids. Eating the correct answer grows the tail (a chain of
 * asteroids following the ship). Wrong answer or self-bite ends the run.
 * Ships come from the Mentaris unlock catalog so only ships the player has
 * actually unlocked appear in the picker.
 */

const BEST_KEY = "sideOps.neonSnake.best";

// Asteroid art pool (mirrors public/images/asteroids/*.png)
const ASTEROID_SRCS = [
  "images/asteroids/asteroid1.png",
  "images/asteroids/asteroid2.png",
  "images/asteroids/asteroid3.png",
  "images/asteroids/asteroid4.png",
  "images/asteroids/asteroid6.png"
];

// Ship catalog mirrors public/home.html homeShipCatalog. Kept here so the
// Side Ops bundle doesn't need to parse the main HTML to know what ships
// exist or what their icons are.
const SHIP_CATALOG = [
  { value: "classic",        label: "Scarlet Classic",   icon: "images/ships/Scarlet%20Classic.png",   defaultUnlocked: true },
  { value: "spire",          label: "Verdant Spire",     icon: "images/ships/Verdant%20Spire.png",     defaultUnlocked: true },
  { value: "am2",            label: "AM3 Scout",         icon: "images/ships/AM3%20Scout.png",         defaultUnlocked: true },
  { value: "mk7",            label: "Crimson MK-7",      icon: "images/ships/Crimson%20MK-7.png" },
  { value: "fizard",         label: "Aurora Dart",       icon: "images/ships/Aurora%20Dart.png" },
  { value: "ember",          label: "Ruby Strike",       icon: "images/ships/Ruby%20Strike.png" },
  { value: "azure",          label: "Azure Lancer",      icon: "images/ships/Azure%20Lancer.png" },
  { value: "bu2x",           label: "BU2X",              icon: "images/ships/BU2X.png" },
  { value: "mantas",         label: "Mantas Arc-5",      icon: "images/ships/Mantas%20-%20Arc%205.png" },
  { value: "cyan",           label: "Cyan Vector 7",     icon: "images/ships/Cyan%20Vector%207.png" },
  { value: "veloz",          label: "Veloz Mas",         icon: "images/ships/Veloz%20Mas.png" },
  { value: "verde9",         label: "VER-DE-9",          icon: "images/ships/VER-DE-9.png" },
  { value: "whiteflame8",    label: "White Flame 8",     icon: "images/ships/White%20Flame%208.png" },
  { value: "datsawze",       label: "D.A.T. Sawze",      icon: "images/ships/D.A.T.%20Sawze.png" },
  { value: "apextiburoniv",  label: "Apex Tiburon IV",   icon: "images/ships/Apex%20Tiburon%20IV.png" }
];

function loadImage(src){
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img;
}

// Direction → rotation (radians). Ship art points up; head renders rotated.
function dirRotation(dir){
  if(dir.x === 1 && dir.y === 0)  return Math.PI / 2;
  if(dir.x === -1 && dir.y === 0) return -Math.PI / 2;
  if(dir.x === 0 && dir.y === 1)  return Math.PI;
  return 0;
}

const POWERUP_SPAWN_EVERY = 5;
const POWERUP_EXPIRE_MS = 10000;
const POWERUP_COLORS = {
  freeze:    "#38bdf8",
  slow:      "#a78bfa",
  shield:    "#fbbf24",
  scoreBomb: "#f43f5e",
  shrink:    "#34d399"
};
const POWERUP_WEIGHTED = [
  "freeze","slow","shield","scoreBomb","shrink",
  "freeze","slow","shrink"
];

function mount(container, config, api){
  const opsEnabled = new Set(config.ops || ["add","sub","mul","div"]);
  const includeSquares = !!config.squares;
  const includeRoots = !!config.roots;
  const sqStart = clamp(parseInt(config.sStart, 10) || 1, 1, 60);
  const sqEndRaw = clamp(parseInt(config.sEnd, 10) || 12, 1, 60);
  const sStart = Math.min(sqStart, sqEndRaw);
  const sEnd = Math.max(sqStart, sqEndRaw);

  const shipId = config.ship || "classic";
  const shipMeta = SHIP_CATALOG.find((s) => s.value === shipId) || SHIP_CATALOG[0];
  const shipImg = loadImage(shipMeta.icon);
  const asteroidImgs = ASTEROID_SRCS.map(loadImage);

  const best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;

  api.hud.setChips([
    { id: "score", label: "Score", value: "0", variant: "accent" },
    { id: "streak", label: "Streak", value: "0", variant: "good" },
    { id: "best", label: "Best", value: String(best) },
    { id: "shield", label: "Shield", value: "--", variant: "warn" },
    { spacer: true }
  ]);

  // ---------------------------------------------------------------------
  // Layout / canvas
  // ---------------------------------------------------------------------
  container.innerHTML = "";

  const qBar = document.createElement("div");
  qBar.style.cssText = [
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:12px 20px",
    "margin-bottom:12px",
    "border:1px solid var(--ui-border-accent)",
    "border-radius:var(--ui-radius-tile)",
    "background: var(--ui-surface-tile)",
    "font-size: clamp(20px, 3.5vw, 36px)",
    "font-weight:700",
    "letter-spacing:2px",
    "color: var(--ui-text-bright)",
    "text-shadow: 0 0 16px rgba(0,229,255,.25)"
  ].join(";");
  qBar.textContent = "Press Start";
  container.appendChild(qBar);

  const canvasWrap = document.createElement("div");
  canvasWrap.style.cssText = "position:relative; width:100%;";
  container.appendChild(canvasWrap);

  const canvas = document.createElement("canvas");
  canvas.width = 1120;
  canvas.height = 700;
  canvas.style.cssText = [
    "display:block",
    "width:100%",
    "height:auto",
    "background: linear-gradient(160deg, rgba(8,14,28,.95), rgba(6,8,20,.98))",
    "border:1px solid var(--ui-border-accent)",
    "border-radius:var(--ui-radius-tile)",
    "box-shadow: var(--ui-shadow-meta), inset 0 0 40px rgba(0,229,255,.08)"
  ].join(";");
  canvasWrap.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  const cellSize = 28;
  const cols = Math.floor(canvas.width / cellSize);
  const rows = Math.floor(canvas.height / cellSize);

  const footer = document.createElement("div");
  footer.style.cssText = "margin-top:12px; text-align:center; color: var(--muted); font-size:12px; letter-spacing:2px; text-transform:uppercase;";
  footer.textContent = "Arrow keys or WASD \u2022 Space to pause \u2022 Collect the correct asteroid";
  container.appendChild(footer);

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------
  const state = {
    snake: [],
    tailArts: [],
    pellets: [],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    question: null,
    score: 0,
    streak: 0,
    best: best,
    phase: "idle", // idle | running | over
    paused: false,
    lastTime: 0,
    acc: 0,
    powerups: [],
    correctSince: 0,
    active: {
      freeze: { on: false, expires: 0 },
      slow: { on: false, expires: 0 },
      shield: { on: false },
      scoreBomb: { on: false }
    },
    rafId: null,
    destroyed: false,
    flashOpacity: 0,
    toast: null,
    pendingTailArt: null,
    bodyRotFrame: 0
  };

  function randomAsteroidIdx(){
    return Math.floor(Math.random() * asteroidImgs.length);
  }

  function randomCell(){
    return { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
  }
  function cellOccupied(p){
    for(const s of state.snake) if(s.x === p.x && s.y === p.y) return true;
    for(const s of state.pellets) if(s.x === p.x && s.y === p.y) return true;
    for(const s of state.powerups) if(s.x === p.x && s.y === p.y) return true;
    return false;
  }
  function safeCell(){
    let tries = 0;
    let spot = randomCell();
    while(cellOccupied(spot) && tries++ < 200) spot = randomCell();
    return spot;
  }

  function spawnPellets(answer){
    state.pellets = [];
    const decoys = new Set();
    while(decoys.size < 2){
      const delta = Math.floor(Math.random() * 9) + 2;
      const sign = Math.random() > 0.5 ? 1 : -1;
      const val = Math.max(0, answer + delta * sign);
      if(val !== answer) decoys.add(val);
    }
    const vals = [answer, ...decoys];
    // Shuffle so the correct answer isn't always first visually (it isn't since
    // we place at random cells anyway, but shuffling prevents any positional bias).
    for(let i = vals.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [vals[i], vals[j]] = [vals[j], vals[i]];
    }
    vals.forEach((val) => {
      const spot = safeCell();
      state.pellets.push({
        x: spot.x,
        y: spot.y,
        value: val,
        correct: val === answer,
        astIdx: randomAsteroidIdx(),
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02
      });
    });
  }

  function spawnPowerup(ts){
    const kind = POWERUP_WEIGHTED[Math.floor(Math.random() * POWERUP_WEIGHTED.length)];
    if((kind === "freeze" || kind === "slow") && state.active[kind] && state.active[kind].on) return;
    const spot = safeCell();
    state.powerups.push({ x: spot.x, y: spot.y, kind: kind, spawnedAt: ts });
  }

  function showToast(msg){
    state.toast = { msg: msg, expires: performance.now() + 1400 };
  }

  function applyPowerup(kind, ts){
    switch(kind){
      case "freeze":
        state.active.freeze = { on: true, expires: ts + 5000 };
        showToast("FREEZE \u2014 5s");
        break;
      case "slow":
        state.active.slow = { on: true, expires: ts + 8000 };
        showToast("SLOW \u2014 8s");
        break;
      case "shield":
        state.active.shield.on = true;
        showToast("SHIELD ONLINE");
        break;
      case "scoreBomb":
        state.active.scoreBomb.on = true;
        showToast("NEXT HIT \u00d73");
        break;
      case "shrink":
        state.snake.splice(Math.max(1, state.snake.length - 3));
        showToast("TAIL TRIMMED");
        break;
    }
    syncHud();
  }

  function tickPowerupTimers(ts){
    for(let i = state.powerups.length - 1; i >= 0; i--){
      if(ts - state.powerups[i].spawnedAt > POWERUP_EXPIRE_MS) state.powerups.splice(i, 1);
    }
    if(state.active.freeze.on && ts > state.active.freeze.expires){
      state.active.freeze.on = false;
      if(state.phase === "running"){
        state.question = makeQuestion(opsEnabled, includeSquares, includeRoots, sStart, sEnd);
        spawnPellets(state.question.answer);
      }
    }
    if(state.active.slow.on && ts > state.active.slow.expires){
      state.active.slow.on = false;
    }
  }

  function resetSnake(){
    state.snake = [];
    state.tailArts = [];
    const sx = Math.floor(cols / 2);
    const sy = Math.floor(rows / 2);
    for(let i = 0; i < 5; i++) state.snake.push({ x: sx - i, y: sy });
    for(let i = 0; i < 4; i++){
      state.tailArts.push({
        idx: randomAsteroidIdx(),
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02
      });
    }
    state.dir = { x: 1, y: 0 };
    state.nextDir = { x: 1, y: 0 };
    state.pendingTailArt = null;
  }

  function beginRound(){
    state.score = 0;
    state.streak = 0;
    state.paused = false;
    state.phase = "running";
    state.lastTime = performance.now();
    state.acc = 0;
    state.powerups = [];
    state.correctSince = 0;
    state.active = {
      freeze: { on: false, expires: 0 },
      slow: { on: false, expires: 0 },
      shield: { on: false },
      scoreBomb: { on: false }
    };
    state.flashOpacity = 0;
    resetSnake();
    state.question = makeQuestion(opsEnabled, includeSquares, includeRoots, sStart, sEnd);
    spawnPellets(state.question.answer);
    qBar.textContent = state.question.text;
    syncHud();
  }

  function handleGameOver(reason){
    state.phase = "over";
    const newBest = state.score > state.best;
    if(newBest){
      state.best = state.score;
      try { localStorage.setItem(BEST_KEY, String(state.best)); } catch(e){}
    }
    state.flashOpacity = 0.55;
    api.sfx.error();
    setTimeout(() => {
      if(state.destroyed) return;
      api.exit({
        kicker: newBest ? "NEW BEST" : "RUN OVER",
        title: "Collections",
        rows: [
          { label: "Score", value: state.score },
          { label: "Streak", value: state.streak },
          { label: "Best", value: state.best },
          { label: "Reason", value: reason || "\u2014" }
        ]
      });
    }, 600);
  }

  function stepInterval(){
    const base = Math.max(80, 160 - state.streak * 3);
    return state.active.slow.on ? Math.min(400, base * 2) : base;
  }

  function syncHud(){
    api.hud.setStat("score", String(state.score));
    api.hud.setStat("streak", String(state.streak), "good");
    api.hud.setStat("best", String(state.best));
    api.hud.setStat("shield", state.active.shield.on ? "ON" : "--", state.active.shield.on ? "warn" : undefined);
  }

  function advance(ts){
    if(state.phase !== "running") return;
    state.dir = state.nextDir;
    const head = state.snake[0];
    const next = {
      x: (head.x + state.dir.x + cols) % cols,
      y: (head.y + state.dir.y + rows) % rows
    };
    for(const p of state.snake){
      if(p.x === next.x && p.y === next.y){
        if(state.active.shield.on){
          state.active.shield.on = false;
          showToast("SHIELD ABSORBED");
          state.flashOpacity = 0.25;
          syncHud();
          return;
        }
        handleGameOver("Self-collision");
        return;
      }
    }
    const pelletIdx = state.pellets.findIndex((p) => p.x === next.x && p.y === next.y);
    const pellet = pelletIdx >= 0 ? state.pellets[pelletIdx] : null;
    const pwIdx = state.powerups.findIndex((p) => p.x === next.x && p.y === next.y);
    const powerup = pwIdx >= 0 ? state.powerups[pwIdx] : null;

    state.snake.unshift(next);
    // Every step, a new body segment appears right behind the head.
    // If we just ate a correct pellet we use that pellet's asteroid art,
    // otherwise we roll a random one.
    const newArt = state.pendingTailArt || {
      idx: randomAsteroidIdx(),
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02
    };
    state.tailArts.unshift(newArt);
    state.pendingTailArt = null;

    let grew = false;

    if(pellet){
      state.pellets.splice(pelletIdx, 1);
      if(pellet.correct){
        const mult = state.active.scoreBomb.on ? 3 : 1;
        if(state.active.scoreBomb.on){
          state.active.scoreBomb.on = false;
          showToast("SCORE BOMB \u00d73");
        }
        state.score += (10 + state.streak * 2) * mult;
        state.streak += 1;
        api.sfx.success();
        // Seed the next frame's new body art with the eaten pellet so it
        // visually "attaches" to the tail on the next advance.
        state.pendingTailArt = {
          idx: pellet.astIdx,
          rot: pellet.rot,
          rotSpeed: pellet.rotSpeed
        };
        // Swap the freshly-unshifted segment art with the pellet art now so
        // the effect is immediate (the pellet we just consumed sits right
        // behind the ship this frame).
        state.tailArts[0] = {
          idx: pellet.astIdx,
          rot: pellet.rot,
          rotSpeed: pellet.rotSpeed
        };
        state.pendingTailArt = null;
        grew = true;
        if(!state.active.freeze.on){
          state.question = makeQuestion(opsEnabled, includeSquares, includeRoots, sStart, sEnd);
          spawnPellets(state.question.answer);
          qBar.textContent = state.question.text;
        }
        state.correctSince++;
        if(state.correctSince >= POWERUP_SPAWN_EVERY){
          spawnPowerup(ts);
          state.correctSince = 0;
        }
      } else {
        if(state.active.shield.on){
          state.active.shield.on = false;
          showToast("SHIELD ABSORBED");
          state.flashOpacity = 0.25;
          state.snake.pop();
          state.tailArts.pop();
          syncHud();
          return;
        }
        handleGameOver("Wrong answer");
        return;
      }
    } else if(powerup){
      state.powerups.splice(pwIdx, 1);
      applyPowerup(powerup.kind, ts);
    }

    if(!grew){
      state.snake.pop();
      state.tailArts.pop();
    }
    syncHud();
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------
  function drawGrid(){
    ctx.strokeStyle = "rgba(0, 210, 255, .06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x = 0; x <= cols; x++){
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, rows * cellSize);
    }
    for(let y = 0; y <= rows; y++){
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(cols * cellSize, y * cellSize);
    }
    ctx.stroke();
  }

  function drawAsteroidTile(img, cx, cy, size, rot){
    if(!img || !img.complete || !img.naturalWidth){
      // Fallback: small rocky circle.
      ctx.fillStyle = "rgba(120,120,140,.85)";
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot || 0);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawShip(cx, cy, size, rot){
    if(!shipImg.complete || !shipImg.naturalWidth){
      // Fallback triangle while ship loads.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.fillStyle = "#22ffcc";
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(size * 0.4, size * 0.4);
      ctx.lineTo(-size * 0.4, size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.shadowColor = "rgba(0,229,255,.45)";
    ctx.shadowBlur = 18;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.drawImage(shipImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawSnake(){
    const bodySize = cellSize * 1.05;
    // Draw tail first so head sits on top.
    for(let i = state.snake.length - 1; i >= 1; i--){
      const seg = state.snake[i];
      const art = state.tailArts[i - 1];
      const cx = seg.x * cellSize + cellSize / 2;
      const cy = seg.y * cellSize + cellSize / 2;
      if(art){
        art.rot += art.rotSpeed || 0;
        drawAsteroidTile(asteroidImgs[art.idx] || asteroidImgs[0], cx, cy, bodySize, art.rot);
      } else {
        drawAsteroidTile(asteroidImgs[0], cx, cy, bodySize, 0);
      }
    }
    if(state.snake.length){
      const head = state.snake[0];
      const cx = head.x * cellSize + cellSize / 2;
      const cy = head.y * cellSize + cellSize / 2;
      drawShip(cx, cy, cellSize * 1.5, dirRotation(state.dir));
    }
  }

  function drawPellets(){
    const pSize = cellSize * 1.1;
    state.pellets.forEach((p) => {
      const cx = p.x * cellSize + cellSize / 2;
      const cy = p.y * cellSize + cellSize / 2;
      p.rot += p.rotSpeed || 0;
      // Glow behind asteroid to make it pop.
      const glow = ctx.createRadialGradient(cx, cy, pSize * 0.1, cx, cy, pSize * 0.7);
      glow.addColorStop(0, "rgba(0, 229, 255, .35)");
      glow.addColorStop(1, "rgba(0, 60, 120, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, pSize * 0.7, 0, Math.PI * 2);
      ctx.fill();
      drawAsteroidTile(asteroidImgs[p.astIdx] || asteroidImgs[0], cx, cy, pSize, p.rot);
      // Number overlay — dark disc behind number for legibility.
      ctx.fillStyle = "rgba(6, 10, 22, .82)";
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,229,255,.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#e6fbff";
      ctx.font = "bold " + Math.max(14, Math.floor(cellSize * 0.6)) + "px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(p.value), cx, cy);
    });
  }

  function drawPowerups(){
    state.powerups.forEach((pw) => {
      const cx = pw.x * cellSize + cellSize / 2;
      const cy = pw.y * cellSize + cellSize / 2;
      const r = cellSize * 0.5;
      ctx.fillStyle = POWERUP_COLORS[pw.kind] || "#fff";
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#050814";
      ctx.font = "bold " + Math.floor(cellSize * 0.55) + "px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const glyph = pw.kind === "freeze" ? "F"
        : pw.kind === "slow" ? "S"
        : pw.kind === "shield" ? "D"
        : pw.kind === "scoreBomb" ? "\u00d7"
        : "-";
      ctx.fillText(glyph, cx, cy);
    });
  }

  function drawOverlay(){
    if(state.flashOpacity > 0){
      ctx.fillStyle = "rgba(255,77,109," + state.flashOpacity + ")";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      state.flashOpacity = Math.max(0, state.flashOpacity - 0.03);
    }
    if(state.toast){
      const now = performance.now();
      if(now < state.toast.expires){
        const remain = state.toast.expires - now;
        ctx.globalAlpha = Math.min(1, remain / 400);
        ctx.fillStyle = "rgba(8,14,28,.85)";
        const text = state.toast.msg;
        ctx.font = "bold 22px Oxanium, sans-serif";
        const w = ctx.measureText(text).width + 40;
        const x = canvas.width / 2 - w / 2;
        const y = 24;
        ctx.fillRect(x, y, w, 44);
        ctx.fillStyle = "#7df3ff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, canvas.width / 2, y + 22);
        ctx.globalAlpha = 1;
      } else {
        state.toast = null;
      }
    }
    if(state.phase === "idle"){
      ctx.fillStyle = "rgba(6,9,22,0.55)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#e5e7ff";
      ctx.font = "bold 34px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PRESS START", canvas.width / 2, canvas.height / 2 - 12);
      ctx.font = "16px Oxanium, sans-serif";
      ctx.fillStyle = "rgba(226,232,255,0.7)";
      ctx.fillText("Collect the correct asteroid. Wrap the edges.", canvas.width / 2, canvas.height / 2 + 20);
    } else if(state.phase === "over"){
      ctx.fillStyle = "rgba(6,9,22,0.72)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ff4d6d";
      ctx.font = "bold 36px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("RUN OVER", canvas.width / 2, canvas.height / 2 - 6);
      ctx.font = "18px Oxanium, sans-serif";
      ctx.fillStyle = "rgba(226,232,255,0.8)";
      ctx.fillText("Score " + state.score + "   //   Best " + state.best, canvas.width / 2, canvas.height / 2 + 24);
    } else if(state.paused){
      ctx.fillStyle = "rgba(6,9,22,0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#7df3ff";
      ctx.font = "bold 32px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
    }
  }

  function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawPowerups();
    drawPellets();
    drawSnake();
    drawOverlay();
  }

  function loop(ts){
    if(state.destroyed) return;
    state.rafId = requestAnimationFrame(loop);
    const delta = Math.min(ts - state.lastTime, 50);
    state.lastTime = ts;
    if(state.phase !== "running" || state.paused){
      if(state.paused) state.acc = 0;
      draw();
      return;
    }
    tickPowerupTimers(ts);
    state.acc += delta;
    const interval = stepInterval();
    while(state.acc >= interval){
      advance(ts);
      state.acc -= interval;
    }
    draw();
  }

  // ---------------------------------------------------------------------
  // Input
  // ---------------------------------------------------------------------
  const KEY_DIR = {
    "ArrowUp":    { x: 0, y: -1 },
    "ArrowDown":  { x: 0, y: 1 },
    "ArrowLeft":  { x: -1, y: 0 },
    "ArrowRight": { x: 1, y: 0 },
    "w": { x: 0, y: -1 },
    "s": { x: 0, y: 1 },
    "a": { x: -1, y: 0 },
    "d": { x: 1, y: 0 },
    "W": { x: 0, y: -1 },
    "S": { x: 0, y: 1 },
    "A": { x: -1, y: 0 },
    "D": { x: 1, y: 0 }
  };

  function onKey(e){
    if(state.destroyed) return;
    if(e.key === " " || e.code === "Space"){
      if(state.phase === "idle"){ start(); e.preventDefault(); return; }
      if(state.phase === "running"){
        state.paused = !state.paused;
        if(!state.paused) state.lastTime = performance.now();
        e.preventDefault();
      }
      return;
    }
    if(e.key === "Enter" && state.phase === "idle"){
      start();
      e.preventDefault();
      return;
    }
    const dir = KEY_DIR[e.key];
    if(!dir) return;
    const cur = state.dir;
    if(cur.x === -dir.x && cur.y === -dir.y) return;
    state.nextDir = dir;
    e.preventDefault();
  }

  function start(){
    if(state.rafId) cancelAnimationFrame(state.rafId);
    beginRound();
    qBar.textContent = state.question.text;
    state.rafId = requestAnimationFrame(loop);
  }

  document.addEventListener("keydown", onKey);

  // Start button prompt (overlay) — click canvas to begin
  canvas.addEventListener("click", () => {
    if(state.phase === "idle") start();
  });

  // Initial draw for idle state
  state.rafId = requestAnimationFrame(loop);

  return {
    teardown(){
      state.destroyed = true;
      if(state.rafId) cancelAnimationFrame(state.rafId);
      document.removeEventListener("keydown", onKey);
    },
    onPause(){
      state.paused = true;
    },
    onResume(){
      if(state.phase !== "running") return;
      state.paused = false;
      state.lastTime = performance.now();
    }
  };
}

export const descriptor = {
  id: "neon_snake",
  title: "Collections",
  tagline: "Arcade \u2022 Ship vs Asteroids",
  blurb: "Pilot your ship, collect the correct asteroid, and grow the tail. Wrong answers or self-bites end the run.",
  brief: "Three numbered asteroids drift each round \u2014 only one matches the answer. Collected asteroids chain to the ship's tail. Speed scales with streak. Powerups occasionally drop (freeze, slow, shield, score bomb, shrink).",
  configSchema: [
    {
      type: "ship", id: "ship", label: "Ship", default: "classic",
      options: SHIP_CATALOG,
      hint: "Only unlocked ships are selectable. Unlock more in the main game."
    },
    {
      type: "toggles", id: "ops", label: "Operations",
      default: ["add","sub","mul","div"],
      options: [
        { value: "add", label: "+" },
        { value: "sub", label: "\u2212" },
        { value: "mul", label: "\u00d7" },
        { value: "div", label: "\u00f7" }
      ],
      min: 1
    },
    {
      type: "select", id: "squares", label: "Squares", default: "0", valueType: "string",
      options: [
        { value: "0", label: "Off" },
        { value: "1", label: "On (n\u00b2 = ?)" }
      ]
    },
    {
      type: "select", id: "roots", label: "Roots", default: "0", valueType: "string",
      options: [
        { value: "0", label: "Off" },
        { value: "1", label: "On (\u221A(n\u00b2) = ?)" }
      ]
    },
    { type: "number", id: "sStart", label: "Square/root start n", default: 1, min: 1, max: 60 },
    { type: "number", id: "sEnd", label: "Square/root end n", default: 12, min: 1, max: 60 }
  ],
  mount(container, config, api){
    const cfg = {
      ship: config.ship || "classic",
      ops: config.ops,
      squares: config.squares === "1" || config.squares === 1 || config.squares === true,
      roots: config.roots === "1" || config.roots === 1 || config.roots === true,
      sStart: config.sStart,
      sEnd: config.sEnd
    };
    return mount(container, cfg, api);
  }
};
