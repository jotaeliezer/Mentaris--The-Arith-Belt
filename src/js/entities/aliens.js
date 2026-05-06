"use strict";

import { randi, clamp } from "../core/utils.js";
import { playSfx } from "../core/audio.js";

export var aliens = [];
export var alienBullets = [];
export var alienMines = [];

export var alienConfig = {
  enabled: true,
  spawnCooldown: 22,
  maxOnScreen: 1,
  escapeSeconds: 160
};

export var alienTypes = {
  scout: {
    id: "scout",
    name: "Scout",
    hp: 1,
    speed: 90,
    score: 900,
    radius: 24,
    behavior: "strafe"
  },
  sniper: {
    id: "sniper",
    name: "Sniper",
    hp: 1,
    speed: 48,
    score: 1100,
    radius: 22,
    behavior: "sniper"
  },
  rusher: {
    id: "rusher",
    name: "Rusher",
    hp: 1,
    speed: 220,
    score: 950,
    radius: 22,
    behavior: "rusher"
  },
  bomber: {
    id: "bomber",
    name: "Bomber",
    hp: 2,
    speed: 72,
    score: 1200,
    radius: 26,
    behavior: "bomber"
  },
  shielder: {
    id: "shielder",
    name: "Shielder",
    hp: 2,
    speed: 55,
    score: 1100,
    radius: 26,
    behavior: "shielder"
  }
};

var spawnTimer = alienConfig.spawnCooldown;
var alienId = 1;
var unlocked = false;
var bossFireMode = 0;
var forcedAlienSpriteKey = "";
var alienSprites = [
  { key: "et", src: "images/aliens/alien_ET.png", img: null },
  { key: "brain", src: "images/aliens/alien_brain.png", img: null },
  { key: "golem", src: "images/aliens/alien_golem.png", img: null },
  { key: "galaga", src: "images/aliens/alien_galaga.png", img: null },
  { key: "eye", src: "images/aliens/alien_eye.png", img: null },
  { key: "saucer", src: "images/aliens/alien_saucer.png", img: null },
  { key: "robot", src: "images/aliens/alien_robot.png", img: null },
  { key: "spider", src: "images/aliens/alien_spider.png", img: null }
];

function normalizeAlienSpriteKey(key){
  if(key == null) return "";
  return String(key).trim().toLowerCase();
}

function getAlienSpriteIndexByKey(key){
  var normalized = normalizeAlienSpriteKey(key);
  if(!normalized) return -1;
  for(var i=0; i<alienSprites.length; i++){
    if(alienSprites[i].key === normalized) return i;
  }
  return -1;
}

export function setAlienSessionSpriteKey(key){
  var idx = getAlienSpriteIndexByKey(key);
  forcedAlienSpriteKey = idx >= 0 ? alienSprites[idx].key : "";
}

function ensureAlienSprites(){
  if(alienSprites[0].img) return;
  for(var i=0; i<alienSprites.length; i++){
    var img = new Image();
    img.src = alienSprites[i].src;
    alienSprites[i].img = img;
  }
}

export function resetAliens(){
  aliens.length = 0;
  alienBullets.length = 0;
  alienMines.length = 0;
  spawnTimer = alienConfig.spawnCooldown;
  alienId = 1;
  unlocked = false;
}

export function setAlienUnlocked(value){
  unlocked = !!value;
  if(unlocked){
    spawnTimer = 0;
  }
}

function spawnAlienBullet(x, y, vx, vy, radius, life, extra){
  var ex = extra || {};
  alienBullets.push({
    x: x,
    y: y,
    vx: vx,
    vy: vy,
    r: radius || 4,
    life: life || 2.8,
    kind: ex.kind || "bolt",
    dmg: typeof ex.dmg === "number" ? ex.dmg : null
  });
}

function fireBossSpread(a, player){
  var dx = player.x - a.x;
  var dy = player.y - a.y;
  var baseAngle = Math.atan2(dy, dx);
  var speed = 350;
  var offsets = [-0.22, 0, 0.22];
  for(var i=0; i<offsets.length; i++){
    var ang = baseAngle + offsets[i];
    spawnAlienBullet(a.x, a.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 5, 3.0);
  }
}

function fireBossBurst(a, player){
  var dx = player.x - a.x;
  var dy = player.y - a.y;
  var dist = Math.max(1, Math.hypot(dx, dy));
  var speed = 390;
  var jitter = (Math.random() * 0.16) - 0.08;
  var ang = Math.atan2(dy, dx) + jitter;
  spawnAlienBullet(a.x, a.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 5, 3.1);
}

function fireBossRing(a){
  var n = 8;
  var speed = 300;
  for(var ri = 0; ri < n; ri++){
    var ang = (ri / n) * Math.PI * 2 + (a.t || 0) * 0.4;
    spawnAlienBullet(a.x, a.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 4, 2.6);
  }
}

function fireBossFan(a, player){
  var dx = player.x - a.x;
  var dy = player.y - a.y;
  var base = Math.atan2(dy, dx);
  var speed = 360;
  var spread = 0.35;
  for(var fi = -2; fi <= 2; fi++){
    var ang = base + fi * spread * 0.5;
    spawnAlienBullet(a.x, a.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 4, 2.9);
  }
}

function fireSniperShot(a, player){
  var dx = player.x - a.x;
  var dy = player.y - a.y;
  var dist = Math.max(1, Math.hypot(dx, dy));
  var speed = 720;
  spawnAlienBullet(a.x, a.y, (dx / dist) * speed, (dy / dist) * speed, 5, 4.2, { kind: "sniper", dmg: 0.48 });
}

export function spawnAlienMine(x, y, vy){
  alienMines.push({
    x: x,
    y: y,
    vy: typeof vy === "number" ? vy : 88 + Math.random() * 40,
    r: 11,
    age: 0,
    fuse: 5
  });
}

export function updateAlienMines(dt, view){
  var blasts = [];
  for(var mi = alienMines.length - 1; mi >= 0; mi--){
    var m = alienMines[mi];
    m.age += dt;
    m.y += m.vy * dt;
    if(m.age >= m.fuse){
      blasts.push({ x: m.x, y: m.y, r: 88 });
      alienMines.splice(mi, 1);
      continue;
    }
    if(m.y - m.r > view.h + 80 || m.y + m.r < -100){
      alienMines.splice(mi, 1);
    }
  }
  return blasts;
}

export function drawAlienMines(ctx){
  if(!alienMines.length) return;
  ctx.save();
  for(var i = 0; i < alienMines.length; i++){
    var m = alienMines[i];
    var pulse = 0.75 + 0.25 * Math.sin((m.age || 0) * 10);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(255,60,90," + (0.5 + (m.age / m.fuse) * 0.45) + ")";
    ctx.fillStyle = "rgba(255,40,70," + (0.35 * pulse) + ")";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y - m.r * pulse);
    ctx.lineTo(m.x + m.r * pulse, m.y);
    ctx.lineTo(m.x, m.y + m.r * pulse);
    ctx.lineTo(m.x - m.r * pulse, m.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function spawnAlien(typeId, question, answer, view, opts){
  var t = alienTypes[typeId] || alienTypes.scout;
  var options = opts || {};
  var pad = 80;
  var x = randi(pad, Math.max(pad + 20, view.w - pad));
  var y = -60;
  if(typeof options.x === "number" && Number.isFinite(options.x)) x = options.x;
  if(typeof options.y === "number" && Number.isFinite(options.y)) y = options.y;
  var hp = (typeof options.hp === "number" && Number.isFinite(options.hp)) ? Math.max(1, Math.round(options.hp)) : t.hp;
  var radius = (typeof options.radius === "number" && Number.isFinite(options.radius)) ? Math.max(14, options.radius) : t.radius;
  var speed = (typeof options.speed === "number" && Number.isFinite(options.speed)) ? Math.max(20, options.speed) : t.speed;
  var score = (typeof options.score === "number" && Number.isFinite(options.score)) ? Math.max(0, Math.round(options.score)) : t.score;
  var answerHits = (typeof answer === "number" && Number.isFinite(answer)) ? Math.max(1, Math.round(answer)) : (t.hp || 1);
  if(options.isBoss){
    answerHits = hp;
  }else{
    hp = answerHits;
  }
  var ingressEnabled = (options.forceIngress === true) || !options.isBoss;
  var ingressDur = (typeof options.ingressDur === "number" && Number.isFinite(options.ingressDur)) ? Math.max(0.12, options.ingressDur) : 0.34;
  var ingressTargetY = (typeof options.ingressTargetY === "number" && Number.isFinite(options.ingressTargetY))
    ? options.ingressTargetY
    : (view.hudH + Math.min(Math.max(70, view.h * 0.14), 115));
  var behForSpawn = options.behavior || t.behavior;
  if(behForSpawn === "sniper" && !options.isBoss){
    ingressTargetY = view.hudH + 52;
    x = randi(Math.floor(view.w * 0.18), Math.max(Math.floor(view.w * 0.18) + 30, Math.floor(view.w * 0.82)));
    y = -55;
    ingressDur = Math.max(ingressDur, 0.52);
  }
  var a = {
    uid: alienId++,
    id: options.id || t.id,
    name: options.name || t.name,
    hp: hp,
    maxHits: answerHits,
    speed: speed,
    score: score,
    behavior: options.behavior || t.behavior,
    r: radius,
    x: x,
    y: y,
    vx: 0,
    vy: speed * 0.4,
    t: 0,
    life: 0,
    question: question,
    answer: answer,
    hitsTaken: 0,
    hitsRequired: answerHits,
    fireCooldown: 1.4 + Math.random() * 1.2,
    strafeTimer: 0.3 + Math.random() * 0.6,
    strafeTarget: x,
    flipState: false,
    isBoss: !!options.isBoss,
    fireMode: options.fireMode || "normal",
    burstShots: 0,
    spriteIndex: -1,
    ingressTimer: ingressEnabled ? ingressDur : 0,
    ingressDur: ingressDur,
    ingressStartY: y,
    ingressTargetY: ingressTargetY,
    noEscape: behForSpawn === "sniper" || behForSpawn === "rusher" || !!options.isBoss,
    shieldActive: behForSpawn === "shielder" && !options.isBoss,
    _shieldBreakFlash: 0,
    sniperCharge: 0,
    bomberDropT: 0,
    bossPatternIdx: 0
  };
  var spriteKey = normalizeAlienSpriteKey(options.spriteKey || forcedAlienSpriteKey);
  var spriteIndex = getAlienSpriteIndexByKey(spriteKey);
  if(spriteIndex >= 0){
    a.spriteIndex = spriteIndex;
  }
  if(!options.isBoss && a.spriteIndex < 0){
    if(typeId === "sniper") a.spriteIndex = 3;
    else if(typeId === "rusher") a.spriteIndex = 7;
    else if(typeId === "bomber") a.spriteIndex = 5;
    else if(typeId === "shielder") a.spriteIndex = (Math.random() < 0.5) ? 2 : 6; // golem or robot
  }
  if(a.isBoss){
    a.fireCooldown = 0.95;
    a.strafeTimer = 0.45;
    a.bossPatternIdx = 0;
  }
  aliens.push(a);
  return a;
}

export function updateAliens(dt, state, player, view, questionFn, asteroids){
  var escaped = 0;
  if(!alienConfig.enabled) return { escaped: escaped };

  if(!unlocked && state.questionsCompleted >= 3){
    unlocked = true;
    spawnTimer = 0;
  }

  spawnTimer -= dt;
  if(unlocked && spawnTimer <= 0 && aliens.length < alienConfig.maxOnScreen){
    var q = questionFn();
    var typePick = "scout";
    if(!(state && state.alienSwarm)){
      var rPick = Math.random();
      if(rPick < 0.2) typePick = "sniper";
      else if(rPick < 0.38) typePick = "rusher";
      else if(rPick < 0.54) typePick = "bomber";
      else if(rPick < 0.68) typePick = "shielder";
    }
    var spawned = spawnAlien(typePick, q.question, q.answer, view);
    if(state && state.alienSwarm && spawned){
      spawned.swarmDigit = (q && q.digit != null) ? q.digit : randi(0, 9);
      spawned.swarmCorrectDigit = (q && q.correctDigit != null) ? q.correctDigit : null;
      spawned.poolId = (q && q.poolId != null) ? q.poolId : 1;
      spawned.answer = 1;
    }
    spawnTimer = alienConfig.spawnCooldown;
  }

  for(var i=aliens.length-1; i>=0; i--){
    var a = aliens[i];
    a.t += dt;
    a.life += dt;
    if(a.dying){
      a.dyingT = (a.dyingT || 0) + dt;
      if(a.dyingT >= (a.dyingDur || 2.8)){
        aliens.splice(i, 1);
      }
      continue;
    }
    if(a.retreating){
      a.fireCooldown = 99;
      a.vx = (a.retreatDrift || 0) + Math.sin((a.t || 0) * 2.2 + a.uid) * 12;
      a.vy = -Math.max(52, a.retreatSpeed || 82);
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if(a.x < a.r + 10) a.x = a.r + 10;
      if(a.x > view.w - a.r - 10) a.x = view.w - a.r - 10;
      if(a.y + a.r < -60){
        aliens.splice(i, 1);
      }
      continue;
    }
    if(a.escapeSequence){
      a.escapeTimer = (a.escapeTimer || 0) + dt;
      if(a.escapePhase === "loop"){
        var loopT = Math.min(1, a.escapeTimer / (a.escapeLoopDuration || 1.1));
        var angle = (a.escapeAngle || 0) + dt * 10.5;
        a.escapeAngle = angle;
        var radius = a.escapeRadius || 18;
        a.x = a.escapeCenterX + Math.cos(angle) * radius;
        a.y = a.escapeCenterY + Math.sin(angle) * radius;
        if(loopT >= 1){
          a.escapePhase = "hold";
          a.escapeTimer = 0;
        }
      }else if(a.escapePhase === "hold"){
        if(a.escapeTimer >= (a.escapeHoldDuration || 0.35)){
          a.escapePhase = "exit";
          a.escapeTimer = 0;
          a.vx = (a.escapeExitVx != null) ? a.escapeExitVx : (Math.random() < 0.5 ? -30 : 30);
          a.vy = (a.escapeExitVy != null) ? a.escapeExitVy : 85;
        }
      }else if(a.escapePhase === "exit"){
        a.x += (a.vx || 0) * dt;
        a.y += (a.vy || 0) * dt;
      }
      if(a.y - a.r > view.h + 40 || a.x + a.r < -60 || a.x - a.r > view.w + 60){
        aliens.splice(i, 1);
        escaped++;
        continue;
      }
      a.fireCooldown = Math.max(a.fireCooldown, 2.0);
      continue;
    }
    if(a.y - a.r > view.h + 20){
      aliens.splice(i, 1);
      escaped++;
      continue;
    }
    if(a.hitShake > 0){
      a.hitShake = Math.max(0, a.hitShake - dt);
    }
    if(a.hitFlashTimer > 0){
      a.hitFlashTimer = Math.max(0, a.hitFlashTimer - dt);
    }
    if(a.showDigitTimer > 0){
      a.showDigitTimer = Math.max(0, a.showDigitTimer - dt);
    }
    if(a.flipTimer > 0){
      a.flipTimer = Math.max(0, a.flipTimer - dt);
    }
    if(a.ingressTimer > 0){
      a.ingressTimer = Math.max(0, a.ingressTimer - dt);
      var ingressDur = Math.max(0.001, a.ingressDur || 0.34);
      var ingressP = 1 - (a.ingressTimer / ingressDur);
      ingressP = Math.max(0, Math.min(1, ingressP));
      var easedIngress = 1 - Math.pow(1 - ingressP, 3);
      a.vx = 0;
      a.vy = (a.ingressTargetY - a.ingressStartY) / ingressDur;
      a.y = a.ingressStartY + (a.ingressTargetY - a.ingressStartY) * easedIngress;
      a.fireCooldown = Math.max(a.fireCooldown, 0.55);
      if(a.ingressTimer <= 0){
        a.y = a.ingressTargetY;
      }
      continue;
    }

    var behavior = a.behavior || "strafe";
    if(behavior === "sniper"){
      var topY = a.ingressTargetY != null ? a.ingressTargetY : (view.hudH + 52);
      a.y += (topY - a.y) * Math.min(1, dt * 2.4);
      a.strafeTimer -= dt;
      if(a.strafeTimer <= 0){
        a.strafeTimer = 0.8 + Math.random() * 0.9;
        a.strafeTarget = randi(50, Math.max(90, view.w - 50));
      }
      a.x += (a.strafeTarget - a.x) * dt * 0.55;
      a.sniperCharge = (a.sniperCharge || 0) + dt;
      if(a.sniperCharge >= 3){
        a.sniperCharge = 0;
        if(player && !(a.x + a.r < 0 || a.x - a.r > view.w)){
          playSfx(state, "alien_shooting", 0.95);
          fireSniperShot(a, player);
        }
      }
      if(a.x < a.r + 10) a.x = a.r + 10;
      if(a.x > view.w - a.r - 10) a.x = view.w - a.r - 10;
      if(a.life >= alienConfig.escapeSeconds){
        aliens.splice(i, 1);
        escaped += 1;
      }
      continue;
    }
    if(behavior === "rusher"){
      if(player){
        var rdx = player.x - a.x;
        var rdy = player.y - a.y;
        var rd = Math.max(1, Math.hypot(rdx, rdy));
        var ch = (a.speed || 200) * 1.05;
        a.vx = (rdx / rd) * ch;
        a.vy = (rdy / rd) * ch * 0.92;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if(a.x < a.r + 10) a.x = a.r + 10;
      if(a.x > view.w - a.r - 10) a.x = view.w - a.r - 10;
      if(a.y < view.hudH + a.r) a.y = view.hudH + a.r + 2;
      if(a.life >= alienConfig.escapeSeconds){
        aliens.splice(i, 1);
        escaped += 1;
      }
      continue;
    }
    if(behavior === "bomber"){
      var diffB = String((state && state.difficulty) || "normal").toLowerCase();
      var brutalB = diffB === "brutal";
      var errB = brutalB ? 1 : 0.2;
      a.strafeTimer -= dt;
      if(a.strafeTimer <= 0){
        a.strafeTimer = 0.6 + Math.random() * 0.9;
        a.strafeTarget = randi(40, Math.max(80, view.w - 40));
      }
      var chaseB = (a.strafeTarget - a.x) * 0.55;
      var wobB = Math.sin(a.t * 1.2 + a.uid) * (55 * errB);
      a.vx = (wobB + chaseB) * (brutalB ? 1 : 0.65);
      a.vy = (a.speed * 0.32) * (brutalB ? 1 : 0.72);
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.bomberDropT = (a.bomberDropT || 0) + dt;
      if(a.bomberDropT >= 1.35){
        a.bomberDropT = 0;
        spawnAlienMine(a.x, a.y + a.r + 6, 72 + Math.random() * 35);
      }
      if(a.x < a.r + 10) a.x = a.r + 10;
      if(a.x > view.w - a.r - 10) a.x = view.w - a.r - 10;
      if(a.life >= alienConfig.escapeSeconds){
        aliens.splice(i, 1);
        escaped += 1;
      }
      continue;
    }
    if(behavior === "shielder"){
      // Slower scout-like strafe
      a.strafeTimer -= dt;
      if(a.strafeTimer <= 0){
        a.strafeTimer = 0.9 + Math.random() * 1.4;
        a.strafeTarget = randi(50, Math.max(90, view.w - 50));
      }
      var chaseS = (a.strafeTarget - a.x) * 0.55;
      var wobS = Math.sin(a.t * 0.8 + a.uid) * 28;
      a.vx = (chaseS + wobS) * 0.52;
      a.vy = (a.speed * 0.28) + Math.sin(a.t * 0.6 + a.uid) * 5;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if(a.x < a.r + 10) a.x = a.r + 10;
      if(a.x > view.w - a.r - 10) a.x = view.w - a.r - 10;
      // Escape sequence at 70% screen height (inherits scout logic)
      if(!a.escapeActive && a.y >= view.h * 0.7){
        a.escapeActive = true;
        a.escapeSequence = true;
        a.escapePhase = "loop";
        a.escapeTimer = 0;
        a.escapeLoopDuration = 1.1;
        a.escapeHoldDuration = 0.35;
        a.escapeRadius = 22;
        a.escapeAngle = 0;
        a.escapeCenterX = a.x;
        a.escapeCenterY = a.y;
        a.escapeExitVy = 85;
        a.escapeExitVx = (Math.random() < 0.5 ? -30 : 30);
      }
      // Decay shield break flash
      if(a._shieldBreakFlash > 0){
        a._shieldBreakFlash = Math.max(0, a._shieldBreakFlash - dt);
      }
      // Fire only when shield is down
      if(!a.shieldActive){
        if(a.fireCooldown > 0) a.fireCooldown -= dt;
        if(a.fireCooldown <= 0 && player){
          if(!(a.x + a.r < 0 || a.x - a.r > view.w)){
            var dxSh = player.x - a.x;
            var dySh = player.y - a.y;
            var dSh = Math.max(1, Math.hypot(dxSh, dySh));
            playSfx(state, "alien_shooting");
            spawnAlienBullet(a.x, a.y, (dxSh / dSh) * 300, (dySh / dSh) * 300, 4, 2.8);
          }
          a.fireCooldown = 2.0 + Math.random() * 1.2;
        }
      }
      if(a.life >= alienConfig.escapeSeconds){
        aliens.splice(i, 1);
        escaped += 1;
      }
      continue;
    }

    var diff = String((state && state.difficulty) || "normal").toLowerCase();
    var brutal = diff === "brutal";
    // Keep brutal highly erratic, but calm down the default movement.
    var erraticFactor = brutal ? 1 : 0.22;
    var motionScale = brutal ? 1 : 0.56;

    a.strafeTimer -= dt;
    if(a.strafeTimer <= 0){
      a.strafeTimer = (brutal ? 0.4 : 0.7) + Math.random() * (brutal ? 0.9 : 1.4);
      a.strafeTarget = randi(40, Math.max(80, view.w - 40));
    }
    var chase = (a.strafeTarget - a.x) * 0.8;
    var wobble = Math.sin(a.t * (brutal ? 2.1 : 1.1) + a.uid) * (95 * erraticFactor)
      + Math.sin(a.t * (brutal ? 4.2 : 2.2) + a.uid * 1.7) * (40 * erraticFactor);
    var prevVx = a.prevVx || 0;
    a.vx = (wobble + chase) * motionScale;
    a.vy = ((a.speed * 0.34) + Math.sin(a.t * (brutal ? 1.4 : 0.85) + a.uid) * (10 * erraticFactor)) * motionScale;
    if((prevVx <= -4 && a.vx >= 4) || (prevVx >= 4 && a.vx <= -4)){
      a.flipTimer = 0.25;
      a.flipState = !a.flipState;
    }
    a.prevVx = a.vx;
    if(a.stunTimer > 0){
      a.stunTimer = Math.max(0, a.stunTimer - dt);
      a.vx *= 0.15;
      a.vy *= 0.15;
      a.fireCooldown = Math.max(a.fireCooldown, 0.35);
    }
    if(asteroids && asteroids.length){
      var pushX = 0;
      var pushY = 0;
      for(var k=0; k<asteroids.length; k++){
        var s = asteroids[k];
        if(!s || s.ghost) continue;
        var dxA = a.x - s.x;
        var dyA = a.y - s.y;
        var distA = Math.hypot(dxA, dyA);
        var minD = (a.r || 24) + (s.r || 18) + 14;
        if(distA > 0 && distA < minD){
          var strength = (minD - distA) / minD;
          pushX += (dxA / distA) * strength * 110;
          pushY += (dyA / distA) * strength * 110;
        }
      }
      a.vx += pushX;
      a.vy += pushY * 0.6;
    }
    a.x += a.vx * dt;
    a.y += a.vy * dt;

    if(!a.noEscape && !a.escapeActive && a.y >= view.h * 0.7){
      a.escapeActive = true;
      a.escapeBoost = 0;
      a.escapeSequence = true;
      a.escapePhase = "loop";
      a.escapeTimer = 0;
      a.escapeLoopDuration = 1.1;
      a.escapeHoldDuration = 0.35;
      a.escapeRadius = 22;
      a.escapeAngle = 0;
      a.escapeCenterX = a.x;
      a.escapeCenterY = a.y;
      a.escapeExitVy = 85;
      a.escapeExitVx = (Math.random() < 0.5 ? -30 : 30);
    }
    if(a.escapeActive && !a.escapeSequence){
      a.escapeBoost = Math.min(1, (a.escapeBoost || 0) + dt * 2.6);
      a.vx *= 0.25;
      a.vy = Math.max(a.vy, a.speed * (1.2 + 1.2 * a.escapeBoost));
      a.fireCooldown = Math.max(a.fireCooldown, 2.0);
    }

    if(a.x < a.r + 10) a.x = a.r + 10;
    if(a.x > view.w - a.r - 10) a.x = view.w - a.r - 10;

    if(a.fireCooldown > 0) a.fireCooldown -= dt;
    if(a.fireCooldown <= 0){
      if(a.x + a.r < 0 || a.x - a.r > view.w || a.y + a.r < 0 || a.y - a.r > view.h){
        a.fireCooldown = 0.2 + Math.random() * 0.3;
        continue;
      }
      if(a.isBoss){
        if(state && state.alienBossSpawnLock){
          state.alienBossSpawnLock = false;
        }
        playSfx(state, "alien_shooting", 0.8);
        if(a.burstShots > 0){
          fireBossBurst(a, player);
          a.burstShots -= 1;
          a.fireCooldown = 0.22;
        }else{
          a.bossPatternIdx = ((a.bossPatternIdx | 0) + 1) % 6;
          var pat = a.bossPatternIdx;
          if(pat === 0){
            fireBossSpread(a, player);
            a.fireCooldown = 1.05;
          }else if(pat === 1){
            fireBossRing(a);
            a.fireCooldown = 1.25;
          }else if(pat === 2){
            fireBossFan(a, player);
            a.fireCooldown = 0.95;
          }else if(pat === 3){
            fireBossBurst(a, player);
            a.burstShots = 2;
            a.fireCooldown = 0.22;
          }else if(pat === 4){
            var spiralN = 5;
            for(var si = 0; si < spiralN; si++){
              var sang = (a.t || 0) * 1.6 + (si / spiralN) * Math.PI * 2;
              var sspd = 280 + si * 28;
              spawnAlienBullet(a.x, a.y, Math.cos(sang) * sspd, Math.sin(sang) * sspd, 4, 2.7);
            }
            a.fireCooldown = 1.1;
          }else{
            fireBossSpread(a, player);
            fireBossBurst(a, player);
            a.fireCooldown = 1.35;
          }
        }
      }else{
        var dx = player.x - a.x;
        var dy = player.y - a.y;
        var dist = Math.max(1, Math.hypot(dx, dy));
        var spd = 320;
        playSfx(state, "alien_shooting");
        spawnAlienBullet(a.x, a.y, (dx / dist) * spd, (dy / dist) * spd, 4, 2.8);
        a.fireCooldown = 1.6 + Math.random() * 1.2;
      }
    }

    if(a.life >= alienConfig.escapeSeconds){
      aliens.splice(i, 1);
      escaped += 1;
    }
  }

  return { escaped: escaped };
}

export function updateAlienBullets(dt, view){
  for(var i=alienBullets.length-1; i>=0; i--){
    var b = alienBullets[i];
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if(b.life <= 0 || b.y < -40 || b.y > view.h + 40 || b.x < -40 || b.x > view.w + 40){
      alienBullets.splice(i, 1);
    }
  }
}

export function drawAliens(ctx, player){
  ensureAlienSprites();
  ctx.save();
  for(var i=0; i<aliens.length; i++){
    var a = aliens[i];
    var spriteIndex = (typeof a.spriteIndex === "number" && a.spriteIndex >= 0 && a.spriteIndex < alienSprites.length)
      ? a.spriteIndex
      : (a.uid % alienSprites.length);
    var sprite = alienSprites[spriteIndex];
    var shake = a.hitShake ? a.hitShake * 18 : 0;
    var shakeX = shake ? (Math.sin((a.t || 0) * 80) + Math.cos((a.t || 0) * 54)) * 0.6 * shake : 0;
    var shakeY = shake ? (Math.cos((a.t || 0) * 92) + Math.sin((a.t || 0) * 66)) * 0.6 * shake : 0;
    if((a.behavior || "") === "sniper" && player && !a.dying && (a.sniperCharge || 0) > 0.05){
      var aimAlpha = Math.min(0.85, (a.sniperCharge || 0) / 3 * 0.95);
      ctx.save();
      ctx.strokeStyle = "rgba(255,40,60," + (0.25 + aimAlpha * 0.55) + ")";
      ctx.lineWidth = 2 + aimAlpha * 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(a.x + shakeX, a.y + shakeY);
      ctx.lineTo(player.x, player.y - 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    var glow = ctx.createRadialGradient(a.x, a.y, a.r * 0.2, a.x, a.y, a.r * (a.isBoss ? 1.95 : 1.5));
    glow.addColorStop(0, a.isBoss ? "rgba(170,240,255,.44)" : "rgba(80,255,220,.35)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    var flashAlpha = 1;
    if(a.dying){
      var dyingProgress = Math.min(1, (a.dyingT || 0) / (a.dyingDur || 2.8));
      var blinkFreq = 1.5 + dyingProgress * 14;
      var blinkVal = 0.5 + 0.5 * Math.sin((a.dyingT || 0) * blinkFreq * Math.PI * 2);
      if(dyingProgress > 0.82){
        blinkVal *= 1 - ((dyingProgress - 0.82) / 0.18);
      }
      flashAlpha = Math.max(0, blinkVal);
    }else if(a.hitFlashTimer > 0){
      var dur = a.hitFlashDur || 0.3;
      var phase = 1 - clamp(a.hitFlashTimer / Math.max(0.001, dur), 0, 1);
      var pulse = Math.sin(phase * Math.PI * 4);
      flashAlpha = pulse > 0 ? 1.2 : 0.55;
    }
    ctx.globalAlpha = 0.9 * flashAlpha;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(a.x + shakeX, a.y + shakeY, a.r * (a.isBoss ? 1.55 : 1.35), 0, Math.PI*2);
    ctx.fill();
    var pulse = 1 + Math.sin((a.t || 0) * 3.2) * 0.08;
    var size = Math.max(20, Math.round(a.r * 1.85 * pulse));
    ctx.save();
    ctx.globalAlpha = 0.9 * flashAlpha;
    ctx.shadowColor = a.isBoss ? "rgba(200,245,255,.95)" : "rgba(80,255,220,.9)";
    ctx.shadowBlur = a.isBoss ? 38 : 26;
    if(sprite && sprite.img && sprite.img.complete && sprite.img.naturalWidth){
      var iw = sprite.img.naturalWidth || sprite.img.width || size;
      var ih = sprite.img.naturalHeight || sprite.img.height || size;
      var scale = size / Math.max(1, Math.max(iw, ih));
      var drawW = iw * scale;
      var drawH = ih * scale;
      var spinFlip = !!a.flipState;
      if(spinFlip){
        ctx.save();
        ctx.translate(a.x + shakeX, a.y + shakeY);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite.img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
      }else{
        ctx.drawImage(sprite.img, a.x + shakeX - drawW / 2, a.y + shakeY - drawH / 2, drawW, drawH);
      }
    }else{
      ctx.fillStyle = "rgba(80,255,220,.7)";
      ctx.beginPath();
      ctx.arc(a.x + shakeX, a.y + shakeY, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    var totalHits = (typeof a.maxHits === "number" && Number.isFinite(a.maxHits)) ? Math.max(1, a.maxHits)
      : ((typeof a.answer === "number" && Number.isFinite(a.answer)) ? Math.max(1, Math.round(a.answer)) : 1);
    var remainingHits = Math.max(0, totalHits - (a.hitsTaken || 0));
    var ratio = clamp(remainingHits / Math.max(1, totalHits), 0, 1);
    var barH = Math.max(18, a.r * 1.7);
    var barW = a.isBoss ? 7 : 5;
    var barX = a.x + shakeX + a.r + 8;
    var barY = a.y + shakeY - barH / 2;
    ctx.save();
    ctx.globalAlpha = 0.85 * flashAlpha;
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "rgba(70,255,120,.9)";
    ctx.fillRect(barX, barY + barH * (1 - ratio), barW, barH * ratio);
    ctx.strokeStyle = "rgba(255,255,255,.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);
    ctx.restore();

    // Shield ring (shielder type)
    if(a.shieldActive && !a.dying){
      ctx.save();
      ctx.globalAlpha = (0.45 + 0.15 * Math.sin((a.t || 0) * 3.5)) * flashAlpha;
      ctx.strokeStyle = "rgba(120,200,255,.9)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(100,180,255,.7)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(a.x + shakeX, a.y + shakeY, a.r * 1.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Shield break flash ring
    if((a._shieldBreakFlash || 0) > 0 && !a.dying){
      var sfProgress = 1 - (a._shieldBreakFlash / 0.35);
      var sfAlpha = Math.max(0, 0.9 - sfProgress * 0.9);
      var sfRadius = a.r * (1.65 + sfProgress * 0.9);
      ctx.save();
      ctx.globalAlpha = sfAlpha;
      ctx.strokeStyle = "rgba(180,230,255,1)";
      ctx.lineWidth = 3 - sfProgress * 2;
      ctx.beginPath();
      ctx.arc(a.x + shakeX, a.y + shakeY, sfRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if(a.showDigitTimer > 0 && a.swarmDigit != null){
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(232,236,255,.95)";
      ctx.font = "700 18px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(a.swarmDigit), a.x + shakeX, a.y + shakeY);
      ctx.restore();
    }

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.font = "700 14px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(a.question), a.x, a.y - a.r - 14);
  }
  ctx.restore();
}

export function drawAlienBullets(ctx){
  if(!alienBullets.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(var i=0; i<alienBullets.length; i++){
    var b = alienBullets[i];
    ctx.globalAlpha = 0.9;
    if(b.kind === "sniper"){
      var ang = Math.atan2(b.vy, b.vx);
      var len = Math.max(18, Math.hypot(b.vx, b.vy) * 0.045);
      ctx.strokeStyle = "rgba(255,50,70,.95)";
      ctx.lineWidth = Math.max(3, b.r * 0.55);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x - Math.cos(ang) * len, b.y - Math.sin(ang) * len);
      ctx.lineTo(b.x + Math.cos(ang) * len * 1.2, b.y + Math.sin(ang) * len * 1.2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,200,210,.9)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, Math.max(2, b.r * 0.35), 0, Math.PI * 2);
      ctx.fill();
    }else{
      ctx.fillStyle = "rgba(255,77,109,.85)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function getAlienSpriteSrcFor(alien){
  if(!alien) return null;
  var spriteIndex = (typeof alien.spriteIndex === "number" && alien.spriteIndex >= 0 && alien.spriteIndex < alienSprites.length)
    ? alien.spriteIndex
    : (alien.uid % alienSprites.length);
  var sprite = alienSprites[spriteIndex];
  return sprite ? sprite.src : null;
}

