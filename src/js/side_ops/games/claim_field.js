"use strict";

/**
 * Claim Field — drift/thrust physics, static numbered asteroids, one correct answer.
 * Correct capture uses Side Ops iron claw (Hold E near answer) — not Stampede's
 * Hold Q / special. Space fires at pursuing aliens (one hit each). Wrong rocks
 * bounce the ship — no hull loss.
 */

import { clamp, makeQuestion } from "../util/math_questions.js";

const BEST_KEY = "sideOps.claimField.best";

const ASTEROID_SRCS = [
  "images/asteroids/asteroid1.png",
  "images/asteroids/asteroid2.png",
  "images/asteroids/asteroid3.png",
  "images/asteroids/asteroid4.png",
  "images/asteroids/asteroid6.png"
];

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

const ALIEN_SRC = "images/aliens/alien_ET.png";
const CLAW_OPEN_SRC = "images/bullets/claw_open.png";
const CLAW_CLOSED_SRC = "images/bullets/claw_closed.png";

function loadImage(src){
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  return img;
}

function distSq(ax, ay, bx, by){
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function wrap(v, max){
  let x = v;
  while(x < 0) x += max;
  while(x >= max) x -= max;
  return x;
}

function hypo(ax, ay, bx, by){
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function mountGame(container, config, api){
  const opsEnabled = new Set(config.ops || ["add","sub","mul","div"]);
  const includeSquares = !!config.squares;
  const includeRoots = !!config.roots;
  const sqStart = clamp(parseInt(config.sStart, 10) || 1, 1, 60);
  const sqEndRaw = clamp(parseInt(config.sEnd, 10) || 12, 1, 60);
  const sStart = Math.min(sqStart, sqEndRaw);
  const sEnd = Math.max(sqStart, sqEndRaw);
  const stoneCount = clamp(parseInt(config.stones, 10) || 10, 4, 16);
  const initialLives = clamp(parseInt(config.lives, 10) || 3, 1, 9);
  const alienSpawnMs = clamp(parseInt(config.alienSpawnMs, 10) || 3200, 1200, 12000);
  const maxAliens = clamp(parseInt(config.maxAliens, 10) || 5, 1, 12);
  const alienSpeed = clamp(parseInt(config.alienSpeed, 10) || 28, 8, 200);

  const shipId = config.ship || "classic";
  const shipMeta = SHIP_CATALOG.find((s) => s.value === shipId) || SHIP_CATALOG[0];
  const shipImg = loadImage(shipMeta.icon);
  const asteroidImgs = ASTEROID_SRCS.map(loadImage);
  const alienImg = loadImage(ALIEN_SRC);
  const clawOpenImg = loadImage(CLAW_OPEN_SRC);
  const clawClosedImg = loadImage(CLAW_CLOSED_SRC);

  const best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;

  api.hud.setChips([
    { id: "score", label: "Score", value: "0", variant: "accent" },
    { id: "lives", label: "Lives", value: String(initialLives), variant: "warn" },
    { id: "streak", label: "Streak", value: "0", variant: "good" },
    { id: "best", label: "Best", value: String(best) },
    { spacer: true }
  ]);

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
  const W = canvas.width;
  const H = canvas.height;

  const footer = document.createElement("div");
  footer.style.cssText = "margin-top:12px; text-align:center; color: var(--muted); font-size:12px; letter-spacing:2px; text-transform:uppercase;";
  footer.textContent =
    "\u2190 \u2192 rotate \u2022 \u2191 thrust \u2022 Space shoot \u2022 Hold E Side Ops claw \u2022 Wrong rocks bump-only \u2022 Esc/P pause";

  container.appendChild(footer);

  const SHIP_R = 20;
  const AST_R = 38;
  const THRUST = 520;
  const TURN_SPEED = 3.1;
  const FRICTION_POW = 0.988;
  const MAX_SPEED = 340;
  const WRONG_KNOCK = 190;
  const CLAW_HOLD_SEC = 0.35;
  const CLAW_RANGE = 185;
  const CLAW_EXTEND_SPEED = 720;
  const CLAW_RETRACT_SPEED = 220;
  const BULLET_SPEED = 640;
  const FIRE_COOLDOWN_MS = 260;
  const MARGIN_OFF = 80;
  let nextAlienSpawn = 0;

  const state = {
    phase: "idle",
    paused: false,
    destroyed: false,
    lastTime: 0,
    rafId: 0,

    ship: {
      x: W / 2,
      y: H / 2,
      heading: 0,
      vx: 0,
      vy: 0
    },

    asteroids: [],
    answer: 0,
    question: null,

    aliens: [],

    score: 0,
    streak: 0,
    lives: initialLives,
    best,

    keys: {},
    stunUntil: 0,
    bounceCooldownUntil: 0,

    clawActive: false,
    clawPhase: "",
    clawReach: 0,
    clawTarget: /** @type{null | { x:number,y:number,value:number,astIdx:number,rot:number,rotSpeed:number,grabbedByClaw?:boolean,clawResolved?:boolean }}*/ (null),
    clawHold: 0,
    clawOpenTimer: 0,
    clawShake: 0,
    clawPromptAlpha: 0,

    bullets: [],
    sparks: [],

    lastFireMs: 0,
    invulnerableUntil: 0
  };

  function getCorrectRock(){
    for(let i = 0; i < state.asteroids.length; i++){
      const a = state.asteroids[i];
      if(a.value === state.answer && !a.clawResolved) return a;
    }
    return null;
  }

  function spawnExplosion(xx, yy){
    for(let i = 0; i < 20; i++){
      const ang = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 160;
      state.sparks.push({
        x: xx, y: yy,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        ttl: 0.42 + Math.random() * 0.2,
        color: Math.random() > 0.45 ? "#ff79c6" : "#ffb86b"
      });
    }
    for(let i = 0; i < 8; i++){
      state.sparks.push({
        x: xx, y: yy,
        vx: (Math.random() - 0.5) * 420,
        vy: (Math.random() - 0.5) * 420,
        ttl: 0.18,
        color: "#ffffff"
      });
    }
  }

  function tryFireBullet(){
    if(state.phase !== "running" || state.paused) return;
    const nowMs = performance.now();
    if(state.clawActive) return;
    if(nowMs - state.lastFireMs < FIRE_COOLDOWN_MS) return;
    state.lastFireMs = nowMs;
    const bx = state.ship.x + Math.sin(state.ship.heading) * (SHIP_R + 10);
    const by = state.ship.y - Math.cos(state.ship.heading) * (SHIP_R + 10);
    state.bullets.push({
      x: bx, y: by,
      vx: Math.sin(state.ship.heading) * BULLET_SPEED,
      vy: -Math.cos(state.ship.heading) * BULLET_SPEED,
      born: nowMs,
      maxMs: 720
    });
    api.sfx.click();
  }

  function advanceCorrectRound(nowMs){
    state.score += 60 + state.streak * 15;
    state.streak++;
    api.sfx.success();
    api.hud.flashStat("streak");

    state.question = makeQuestion(opsEnabled, includeSquares, includeRoots, sStart, sEnd);
    state.answer = state.question.answer;
    qBar.textContent = state.question.text;

    layAsteroids(state.answer);
    state.ship.vx *= 0.55;
    state.ship.vy *= 0.55;
    if(state.aliens.length > 2) state.aliens.splice(0, state.aliens.length - 2);

    state.bounceCooldownUntil = nowMs + 350;
    resetClaw();
    syncHud();
  }

  function bounceWrongRock(a, nowMs){
    if(nowMs < state.bounceCooldownUntil) return;
    const dx = state.ship.x - a.x;
    const dy = state.ship.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / d;
    const ny = dy / d;
    state.ship.vx += nx * WRONG_KNOCK;
    state.ship.vy += ny * WRONG_KNOCK;
    state.bounceCooldownUntil = nowMs + 420;
    state.stunUntil = nowMs + 160;
    api.sfx.tick();
  }

  function resetClaw(){
    state.clawActive = false;
    state.clawPhase = "";
    state.clawReach = 0;
    state.clawTarget = null;
    state.clawHold = 0;
    state.clawOpenTimer = 0;
    state.clawShake = 0;
    state.clawPromptAlpha = 0;
  }

  function getClawTargetInRange(){
    const t = getCorrectRock();
    if(!t || t.grabbedByClaw || t.clawResolved) return null;
    const dist = hypo(state.ship.x, state.ship.y, t.x, t.y);
    if(dist > CLAW_RANGE) return null;
    return { asteroid: t, dist };
  }

  function startClawGrab(target){
    if(!target || state.clawActive || target.clawResolved) return;
    state.clawActive = true;
    state.clawPhase = "extend";
    state.clawReach = 0;
    state.clawTarget = target;
    state.clawOpenTimer = 0;
    state.clawShake = 0;
    state.clawHold = 0;
    target.grabbedByClaw = true;
  }

  function completeClawGrab(target, nowMs){
    if(target) target.clawResolved = true;
    resetClaw();
    advanceCorrectRound(nowMs);
    spawnExplosion(state.ship.x, state.ship.y);
    api.hud.flashStat("score");
  }

  function updateClaw(dtSec, nowMs){
    if(state.phase !== "running" || state.paused) return;

    const candidate = getClawTargetInRange();

    if(!state.clawActive){
      if(candidate){
        state.clawPromptAlpha = Math.min(1, state.clawPromptAlpha + dtSec * 3.2);
        if(state.keys.KeyE){
          state.clawHold += dtSec;
          if(state.clawHold >= CLAW_HOLD_SEC){ startClawGrab(candidate.asteroid); }
        } else state.clawHold = 0;
      } else {
        state.clawPromptAlpha = Math.max(0, state.clawPromptAlpha - dtSec * 4);
        state.clawHold = 0;
      }
      return;
    }

    const target = state.clawTarget;
    if(!target || target.clawResolved){
      resetClaw();
      return;
    }

    const shipX = state.ship.x;
    const shipY = state.ship.y - 5;
    const dx = target.x - shipX;
    const dy = target.y - shipY;
    const dist = Math.max(1, Math.hypot(dx, dy));

    if(state.clawPhase === "extend"){
      state.clawReach = Math.min(dist, state.clawReach + CLAW_EXTEND_SPEED * dtSec);
      if(state.clawReach >= dist - 8){
        state.clawPhase = "open";
        state.clawOpenTimer = 0.12;
        api.sfx.tick();
      }
    } else if(state.clawPhase === "open"){
      state.clawReach = dist + 6;
      state.clawOpenTimer -= dtSec;
      if(state.clawOpenTimer <= 0){
        state.clawPhase = "retract";
      }
    } else if(state.clawPhase === "retract"){
      const tdx = shipX - target.x;
      const tdy = shipY - target.y;
      const tdist = Math.max(1, Math.hypot(tdx, tdy));
      const step = Math.min(tdist, CLAW_RETRACT_SPEED * dtSec);
      const nx = tdx / tdist;
      const ny = tdy / tdist;
      target.x += nx * step;
      target.y += ny * step;
      state.clawReach = tdist;
      state.clawShake = Math.min(1.35, state.clawShake + dtSec * 3);
      if(state.clawShake > 0){
        const jig = state.clawShake * 2.2;
        target.x += (Math.random() - 0.5) * jig;
        target.y += (Math.random() - 0.5) * jig;
      }
      if(tdist <= 18){
        completeClawGrab(target, nowMs);
      }
    }
  }

  function updateBullets(dtSec, nowMs){
    for(let bi = state.bullets.length - 1; bi >= 0; bi--){
      const b = state.bullets[bi];
      b.x += b.vx * dtSec;
      b.y += b.vy * dtSec;
      if(nowMs - b.born > b.maxMs
        || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50){
        state.bullets.splice(bi, 1);
        continue;
      }
      let hit = false;
      for(let ai = state.aliens.length - 1; ai >= 0; ai--){
        const al = state.aliens[ai];
        if(distSq(al.x, al.y, b.x, b.y) <= 28 * 28){
          spawnExplosion(al.x, al.y);
          api.sfx.success();
          state.aliens.splice(ai, 1);
          hit = true;
          break;
        }
      }
      if(hit) state.bullets.splice(bi, 1);
    }
  }

  function updateSparks(dtSec){
    for(let i = state.sparks.length - 1; i >= 0; i--){
      const s = state.sparks[i];
      s.ttl -= dtSec;
      s.x += s.vx * dtSec;
      s.y += s.vy * dtSec;
      s.vx *= Math.pow(0.9, dtSec * 60);
      s.vy *= Math.pow(0.9, dtSec * 60);
      if(s.ttl <= 0) state.sparks.splice(i, 1);
    }
  }

  function syncHud(){
    api.hud.setStat("score", String(state.score));
    api.hud.setStat("lives", String(state.lives), "warn");
    api.hud.setStat("streak", String(state.streak), "good");
    api.hud.setStat("best", String(state.best));
  }

  function physicsStep(dtSec){
    const now = performance.now();
    const stun = now < state.stunUntil;

    let turn = 0;
    if(state.keys.ArrowLeft || state.keys.KeyA){ turn -= 1; }
    if(state.keys.ArrowRight || state.keys.KeyD){ turn += 1; }
    if(!stun && turn !== 0){
      state.ship.heading += turn * TURN_SPEED * dtSec;
    }

    if(!stun && (state.keys.ArrowUp || state.keys.KeyW)){
      state.ship.vx += Math.sin(state.ship.heading) * THRUST * dtSec;
      state.ship.vy += -Math.cos(state.ship.heading) * THRUST * dtSec;
    }

    const sp = Math.sqrt(state.ship.vx * state.ship.vx + state.ship.vy * state.ship.vy);
    if(sp > MAX_SPEED){
      const k = MAX_SPEED / sp;
      state.ship.vx *= k;
      state.ship.vy *= k;
    }

    const fr = Math.pow(FRICTION_POW, dtSec * 60);
    state.ship.vx *= fr;
    state.ship.vy *= fr;

    state.ship.x += state.ship.vx * dtSec;
    state.ship.y += state.ship.vy * dtSec;
    state.ship.x = wrap(state.ship.x, W);
    state.ship.y = wrap(state.ship.y, H);

    for(let i = 0; i < state.asteroids.length; i++){
      state.asteroids[i].rot += state.asteroids[i].rotSpeed * dtSec;
    }

    for(let i = 0; i < state.aliens.length; i++){
      const al = state.aliens[i];
      const dx = state.ship.x - al.x;
      const dy = state.ship.y - al.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      al.x += (dx / d) * alienSpeed * dtSec;
      al.y += (dy / d) * alienSpeed * dtSec;
      al.x = wrap(al.x, W);
      al.y = wrap(al.y, H);
    }

    updateBullets(dtSec, now);
    updateSparks(dtSec);
    updateClaw(dtSec, now);
  }

  function trySpawnAlien(ts){
    if(state.aliens.length >= maxAliens) return;
    if(ts < nextAlienSpawn) return;
    nextAlienSpawn = ts + alienSpawnMs + Math.random() * 900;

    const edge = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;
    if(edge === 0){       x = Math.random() * W; y = -MARGIN_OFF; }
    else if(edge === 1){  x = W + MARGIN_OFF; y = Math.random() * H; }
    else if(edge === 2){  x = Math.random() * W; y = H + MARGIN_OFF; }
    else {                x = -MARGIN_OFF; y = Math.random() * H; }

    state.aliens.push({ x, y });
  }

  function buildDecoys(ans, need){
    const set = new Set([ans]);
    let guard = 0;
    while(set.size < need && guard++ < 500){
      let v;
      const roll = Math.random();
      if(roll < 0.45){
        const delta = Math.floor(Math.random() * 18) + 1;
        v = ans + (Math.random() > 0.5 ? delta : -delta);
      } else if(roll < 0.72){
        v = ans + Math.floor(Math.random() * 7) - 3;
      } else {
        v = Math.floor(Math.random() * 120);
      }
      if(v !== ans && v >= 0 && v <= 9999) set.add(v);
    }
    const arr = Array.from(set).slice(0, need);
    while(arr.length < need){
      const extra = ans + Math.floor(Math.random() * 50) + 1;
      if(!arr.includes(extra)) arr.push(extra);
    }
    for(let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function layAsteroids(ans){
    const values = buildDecoys(ans, stoneCount);
    const placed = [];
    const padding = AST_R + SHIP_R + 24;
    const cx0 = state.ship.x;
    const cy0 = state.ship.y;

    values.forEach((val, idx) => {
      let tries = 0;
      let x = 0;
      let y = 0;
      let ok = false;
      while(!ok && tries++ < 300){
        x = AST_R + Math.random() * (W - 2 * AST_R);
        y = AST_R + Math.random() * (H - 2 * AST_R);
        ok = distSq(x, y, cx0, cy0) >= padding * padding;
        for(let i = 0; ok && i < placed.length; i++){
          if(distSq(x, y, placed[i].x, placed[i].y) < (AST_R * 2.1) ** 2){ ok = false; }
        }
      }
      placed.push({
        x, y,
        value: val,
        astIdx: idx % asteroidImgs.length,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.35
      });
    });
    state.asteroids = placed;
  }

  function beginRound(resetScore){
    if(resetScore){
      state.score = 0;
      state.streak = 0;
      state.lives = initialLives;
    }
    state.phase = "running";
    state.paused = false;
    state.lastTime = performance.now();
    state.ship.x = W / 2;
    state.ship.y = H / 2;
    state.ship.heading = 0;
    state.ship.vx = 0;
    state.ship.vy = 0;
    state.aliens = [];
    state.bullets = [];
    state.sparks = [];
    resetClaw();
    state.bounceCooldownUntil = 0;
    state.invulnerableUntil = 0;
    state.lastFireMs = 0;
    nextAlienSpawn = performance.now() + 800;
    state.question = makeQuestion(opsEnabled, includeSquares, includeRoots, sStart, sEnd);
    state.answer = state.question.answer;
    qBar.textContent = state.question.text;
    layAsteroids(state.answer);
    state.bounceCooldownUntil = performance.now() + 400;
    syncHud();
  }

  function handleGameOver(reason){
    state.phase = "over";
    const newBest = state.score > state.best;
    if(newBest){
      state.best = state.score;
      try { localStorage.setItem(BEST_KEY, String(state.best)); } catch(e){}
    }
    api.sfx.error();
    setTimeout(() => {
      if(state.destroyed) return;
      api.exit({
        kicker: newBest ? "NEW BEST" : "RUN OVER",
        title: "Claim Field",
        rows: [
          { label: "Score", value: state.score },
          { label: "Streak", value: state.streak },
          { label: "Best", value: state.best },
          { label: "Reason", value: reason || "\u2014" }
        ]
      });
    }, 650);
  }

  function collideWorld(nowMs){
    if(state.clawActive) return;

    for(let i = 0; i < state.aliens.length; i++){
      const al = state.aliens[i];
      if(distSq(al.x, al.y, state.ship.x, state.ship.y) <= (SHIP_R + 26) ** 2){
        if(nowMs >= state.invulnerableUntil){
          state.lives--;
          state.streak = 0;
          state.invulnerableUntil = nowMs + 1350;
          api.sfx.error();
          api.hud.flashStat("lives");
          const dx = state.ship.x - al.x;
          const dy = state.ship.y - al.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          state.ship.vx += (dx / d) * 320;
          state.ship.vy += (dy / d) * 320;
          state.stunUntil = nowMs + 280;
          if(state.lives <= 0){ handleGameOver("Alien hull strike");}
          syncHud();
        }
        break;
      }
    }

    for(let i = 0; i < state.asteroids.length; i++){
      const a = state.asteroids[i];
      if(a.value === state.answer) continue;
      if(a.grabbedByClaw) continue;
      if(distSq(a.x, a.y, state.ship.x, state.ship.y) <= (AST_R + SHIP_R) ** 2){
        bounceWrongRock(a, nowMs);
        break;
      }
    }
  }

  function drawAsteroidTile(img, cx, cy, size, rot){
    if(!img || !img.complete || !img.naturalWidth){
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

  function drawShip(cx, cy, size){
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.ship.heading);
    if(!shipImg.complete || !shipImg.naturalWidth){
      ctx.fillStyle = "#22ffcc";
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(size * 0.4, size * 0.4);
      ctx.lineTo(-size * 0.4, size * 0.4);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.shadowColor = "rgba(0,229,255,.45)";
      ctx.shadowBlur = 18;
      ctx.drawImage(shipImg, -size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }

  function drawField(){
    const pSize = AST_R * 1.35;
    state.asteroids.forEach((p) => {
      const cx = p.x;
      const cy = p.y;
      const glow = ctx.createRadialGradient(cx, cy, pSize * 0.08, cx, cy, pSize * 0.72);
      glow.addColorStop(0, "rgba(0, 229, 255, .38)");
      glow.addColorStop(1, "rgba(0, 60, 120, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, pSize * 0.72, 0, Math.PI * 2);
      ctx.fill();

      drawAsteroidTile(asteroidImgs[p.astIdx] || asteroidImgs[0], cx, cy, pSize, p.rot);

      ctx.fillStyle = "rgba(6, 10, 22, .82)";
      ctx.beginPath();
      ctx.arc(cx, cy, AST_R * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,229,255,.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#e6fbff";
      ctx.font = "bold " + Math.floor(AST_R * 0.82) + "px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(p.value), cx, cy + 1);
    });
  }

  function drawSparks(){
    state.sparks.forEach((s) => {
      const a = Math.max(0, Math.min(1, s.ttl / 0.5));
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = s.color || "#ff79c6";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2 + (1 - a) * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawBullets(){
    state.bullets.forEach((b) => {
      ctx.save();
      ctx.fillStyle = "rgba(0,229,255,.92)";
      ctx.shadowColor = "rgba(0,229,255,.65)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawClaw(){
    if(!state.clawActive || !state.clawTarget) return;
    const target = state.clawTarget;
    const shipX = state.ship.x;
    const shipY = state.ship.y - 5;
    const dx = target.x - shipX;
    const dy = target.y - shipY;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const dirX = dx / dist;
    const dirY = dy / dist;
    const reach = Math.min(dist, Math.max(0, state.clawReach || 0));
    let endX = shipX + dirX * reach;
    let endY = shipY + dirY * reach;
    if(state.clawPhase === "retract" && state.clawShake){
      const wobble = state.clawShake * 1.6;
      endX += (Math.random() - 0.5) * wobble;
      endY += (Math.random() - 0.5) * wobble;
    }

    ctx.save();
    ctx.strokeStyle = "rgba(140,200,220,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shipX, shipY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    const imgObj = state.clawPhase === "open" ? clawOpenImg : clawClosedImg;
    if(imgObj.complete && imgObj.naturalWidth){
      const ang = Math.atan2(dirY, dirX) + Math.PI / 2;
      const natW = imgObj.naturalWidth || 64;
      const natH = imgObj.naturalHeight || 64;
      const size = Math.min(58, Math.max(natW, natH));
      const drawW = (natW / Math.max(1, Math.max(natW, natH))) * size;
      const drawH = (natH / Math.max(1, Math.max(natW, natH))) * size;
      ctx.translate(endX, endY);
      ctx.rotate(ang);
      ctx.drawImage(imgObj, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.fillStyle = "#9dd6ff";
      ctx.translate(endX, endY);
      ctx.fillRect(-10, -10, 20, 20);
    }
    ctx.restore();
  }

  function drawClawPrompt(){
    if(state.clawActive || state.phase !== "running") return;
    if(state.clawPromptAlpha <= 0.02) return;
    const candidate = getClawTargetInRange();
    if(!candidate) return;
    ctx.save();
    ctx.globalAlpha = state.clawPromptAlpha;
    ctx.fillStyle = "#e6fbff";
    ctx.font = "bold 15px Oxanium, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.shadowColor = "rgba(0,229,255,.6)";
    ctx.shadowBlur = 8;
    ctx.fillText("HOLD E \u2014 SIDE OPS CLAW", state.ship.x, state.ship.y - 58);
    ctx.restore();
  }

  function drawAliens(){
    const r = 30;
    state.aliens.forEach((al) => {
      if(alienImg.complete && alienImg.naturalWidth){
        ctx.save();
        ctx.translate(al.x, al.y);
        const ang = Math.atan2(state.ship.y - al.y, state.ship.x - al.x) + Math.PI / 2;
        ctx.rotate(ang);
        ctx.shadowColor = "rgba(255,77,166,.42)";
        ctx.shadowBlur = 14;
        ctx.drawImage(alienImg, -r, -r, r * 2, r * 2);
        ctx.restore();
      } else {
        ctx.fillStyle = "#ff79c6";
        ctx.beginPath();
        ctx.arc(al.x, al.y, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function draw(){
    ctx.clearRect(0, 0, W, H);
    drawField();
    drawClaw();
    drawAliens();
    drawBullets();
    drawShip(state.ship.x, state.ship.y, SHIP_R * 2.3);
    drawSparks();
    drawClawPrompt();

    if(state.phase === "idle"){
      ctx.fillStyle = "rgba(6,9,22,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#e5e7ff";
      ctx.font = "bold 34px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PRESS START", W / 2, H / 2 - 12);
      ctx.font = "16px Oxanium, sans-serif";
      ctx.fillStyle = "rgba(226,232,255,0.7)";
      ctx.fillText("Side Ops claw: hold E near the answer (Stampede uses Hold Q). SPACE shoots aliens. Wrong rocks bump-only.", W / 2, H / 2 + 20);
    } else if(state.phase === "over"){
      ctx.fillStyle = "rgba(6,9,22,0.72)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff4d6d";
      ctx.font = "bold 36px Oxanium, sans-serif";
      ctx.fillText("RUN OVER", W / 2, H / 2 - 6);
      ctx.font = "18px Oxanium, sans-serif";
      ctx.fillStyle = "rgba(226,232,255,0.8)";
      ctx.fillText("Score " + state.score + "   //   Best " + state.best, W / 2, H / 2 + 24);
    } else if(state.paused){
      ctx.fillStyle = "rgba(6,9,22,0.6)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#7df3ff";
      ctx.font = "bold 32px Oxanium, sans-serif";
      ctx.fillText("PAUSED", W / 2, H / 2);
    }

    const now = performance.now();
    if(now < state.stunUntil){
      ctx.fillStyle = "rgba(100,149,237,0.12)";
      ctx.fillRect(0, 0, W, H);
    }
    if(state.phase === "running" && now < state.invulnerableUntil){
      ctx.save();
      ctx.strokeStyle = "rgba(0,229,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(state.ship.x, state.ship.y, SHIP_R + 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function loop(ts){
    if(state.destroyed) return;
    state.rafId = requestAnimationFrame(loop);

    const delta = Math.min(ts - state.lastTime, 50);
    state.lastTime = ts;
    const dt = delta / 1000;

    if(state.phase === "running" && !state.paused){
      physicsStep(dt);
      trySpawnAlien(ts);
      collideWorld(ts);
    }

    draw();
  }

  function onKeyDown(e){
    if(state.phase === "over") return;

    state.keys[e.code] = true;

    if(e.code === "Space"){
      if(state.phase === "running"){
        tryFireBullet();
      }
      e.preventDefault();
      return;
    }

    if((e.code === "Enter" || e.code === "NumpadEnter") && state.phase === "idle"){
      beginRound(true);
      e.preventDefault();
      return;
    }

    const nav = ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"];
    if(nav.indexOf(e.code) >= 0) e.preventDefault();
  }

  function onKeyUp(e){
    state.keys[e.code] = false;
    const nav = ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"];
    if(nav.indexOf(e.code) >= 0) e.preventDefault();
  }

  canvas.addEventListener("click", () => {
    if(state.phase === "idle") beginRound(true);
  });

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  state.lastTime = performance.now();
  state.rafId = requestAnimationFrame(loop);

  return {
    teardown(){
      state.destroyed = true;
      if(state.rafId) cancelAnimationFrame(state.rafId);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
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
  id: "claim_field",
  title: "Claim Field",
  tagline: "Arcade \u2022 Drift & scan",
  blurb: "Drift toward the answer, hold E for the Side Ops iron claw (Stampede uses Hold Q / special). Space pops aliens. Wrong rocks only bump you.",
  brief: "Rotation + thrust, friction bleeds speed. Only the correct asteroid is collected via Side Ops iron claw when you hold E in range (Stampede iron claw is Hold Q / special — not used here). Wrong rocks knock you back. Aliens hunt the ship; Space fires one-shot kills with a burst. Esc / P pauses (Side Ops overlay).",
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
    { type: "number", id: "sEnd", label: "Square/root end n", default: 12, min: 1, max: 60 },
    { type: "number", id: "stones", label: "Asteroids in field", default: 10, min: 4, max: 16 },
    { type: "number", id: "lives", label: "Lives", default: 3, min: 1, max: 9 },
    { type: "number", id: "alienSpawnMs", label: "Alien spawn interval (ms)", default: 3200, min: 1200, max: 12000 },
    { type: "number", id: "maxAliens", label: "Max aliens", default: 5, min: 1, max: 12 },
    { type: "number", id: "alienSpeed", label: "Alien chase speed", default: 28, min: 8, max: 200 }
  ],
  mount(container, config, api){
    const cfg = {
      ship: config.ship || "classic",
      ops: config.ops,
      squares: config.squares === "1" || config.squares === 1 || config.squares === true,
      roots: config.roots === "1" || config.roots === 1 || config.roots === true,
      sStart: config.sStart,
      sEnd: config.sEnd,
      stones: config.stones,
      lives: config.lives,
      alienSpawnMs: config.alienSpawnMs,
      maxAliens: config.maxAliens,
      alienSpeed: config.alienSpeed
    };
    return mountGame(container, cfg, api);
  }
};
