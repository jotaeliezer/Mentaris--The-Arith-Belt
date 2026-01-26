"use strict";

import { randi } from "../core/utils.js";
import { playSfx } from "../core/audio.js";

export var aliens = [];
export var alienBullets = [];

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
  }
};

var spawnTimer = alienConfig.spawnCooldown;
var alienId = 1;
var unlocked = false;
var alienSprites = [
  { src: "images/alien_ET.png", img: null },
  { src: "images/alien_brain.png", img: null },
  { src: "images/alien_golem.png", img: null },
  { src: "images/alien_galaga.png", img: null },
  { src: "images/alien_eye.png", img: null },
  { src: "images/alien_saucer.png", img: null },
  { src: "images/alien_robot.png", img: null },
  { src: "images/alien_spider.png", img: null }
];

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
  spawnTimer = alienConfig.spawnCooldown;
  alienId = 1;
  unlocked = false;
}

export function spawnAlien(typeId, question, answer, view){
  var t = alienTypes[typeId] || alienTypes.scout;
  var pad = 80;
  var x = randi(pad, Math.max(pad + 20, view.w - pad));
  var y = -40;
  var a = {
    uid: alienId++,
    id: t.id,
    name: t.name,
    hp: t.hp,
    speed: t.speed,
    score: t.score,
    behavior: t.behavior,
    r: t.radius,
    x: x,
    y: y,
    vx: 0,
    vy: t.speed * 0.4,
    t: 0,
    life: 0,
    question: question,
    answer: answer,
    hitsTaken: 0,
    fireCooldown: 1.4 + Math.random() * 1.2,
    strafeTimer: 0.3 + Math.random() * 0.6,
    strafeTarget: x
  };
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
    spawnAlien("scout", q.question, q.answer, view);
    spawnTimer = alienConfig.spawnCooldown;
  }

  for(var i=aliens.length-1; i>=0; i--){
    var a = aliens[i];
    a.t += dt;
    a.life += dt;
    if(a.y - a.r > view.h + 20){
      aliens.splice(i, 1);
      escaped++;
      continue;
    }
    if(a.hitShake > 0){
      a.hitShake = Math.max(0, a.hitShake - dt);
    }
    var diff = String((state && state.difficulty) || "normal").toLowerCase();
    var brutal = diff === "brutal";
    var erraticFactor = brutal ? 1 : 0.45;
    var motionScale = brutal ? 1 : 0.7;

    a.strafeTimer -= dt;
    if(a.strafeTimer <= 0){
      a.strafeTimer = (brutal ? 0.4 : 0.7) + Math.random() * (brutal ? 0.9 : 1.4);
      a.strafeTarget = randi(40, Math.max(80, view.w - 40));
    }
    var chase = (a.strafeTarget - a.x) * 0.8;
    var wobble = Math.sin(a.t * (brutal ? 2.1 : 1.2) + a.uid) * (120 * erraticFactor)
      + Math.sin(a.t * (brutal ? 4.2 : 2.4) + a.uid * 1.7) * (60 * erraticFactor);
    a.vx = (wobble + chase) * motionScale;
    a.vy = ((a.speed * 0.35) + Math.sin(a.t * (brutal ? 1.4 : 0.9) + a.uid) * (16 * erraticFactor)) * motionScale;
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

    if(a.x < a.r + 10) a.x = a.r + 10;
    if(a.x > view.w - a.r - 10) a.x = view.w - a.r - 10;

    if(a.fireCooldown > 0) a.fireCooldown -= dt;
    if(a.fireCooldown <= 0){
      if(a.x + a.r < 0 || a.x - a.r > view.w || a.y + a.r < 0 || a.y - a.r > view.h){
        a.fireCooldown = 0.2 + Math.random() * 0.3;
        continue;
      }
      var dx = player.x - a.x;
      var dy = player.y - a.y;
      var dist = Math.max(1, Math.hypot(dx, dy));
      var spd = 320;
      playSfx(state, "alien_shooting");
      alienBullets.push({
        x: a.x,
        y: a.y,
        vx: (dx / dist) * spd,
        vy: (dy / dist) * spd,
        r: 4,
        life: 2.8
      });
      a.fireCooldown = 1.6 + Math.random() * 1.2;
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

export function drawAliens(ctx){
  ensureAlienSprites();
  ctx.save();
  for(var i=0; i<aliens.length; i++){
    var a = aliens[i];
    var sprite = alienSprites[a.uid % alienSprites.length];
    var shake = a.hitShake ? a.hitShake * 18 : 0;
    var shakeX = shake ? (Math.sin((a.t || 0) * 80) + Math.cos((a.t || 0) * 54)) * 0.6 * shake : 0;
    var shakeY = shake ? (Math.cos((a.t || 0) * 92) + Math.sin((a.t || 0) * 66)) * 0.6 * shake : 0;
    var glow = ctx.createRadialGradient(a.x, a.y, a.r * 0.2, a.x, a.y, a.r * 1.5);
    glow.addColorStop(0, "rgba(80,255,220,.35)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(a.x + shakeX, a.y + shakeY, a.r * 1.35, 0, Math.PI*2);
    ctx.fill();
    var pulse = 1 + Math.sin((a.t || 0) * 3.2) * 0.08;
    var size = Math.max(20, Math.round(a.r * 1.85 * pulse));
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = "rgba(80,255,220,.9)";
    ctx.shadowBlur = 26;
    if(sprite && sprite.img && sprite.img.complete && sprite.img.naturalWidth){
      var iw = sprite.img.naturalWidth || sprite.img.width || size;
      var ih = sprite.img.naturalHeight || sprite.img.height || size;
      var scale = size / Math.max(1, Math.max(iw, ih));
      var drawW = iw * scale;
      var drawH = ih * scale;
      ctx.drawImage(sprite.img, a.x + shakeX - drawW / 2, a.y + shakeY - drawH / 2, drawW, drawH);
    }else{
      ctx.fillStyle = "rgba(80,255,220,.7)";
      ctx.beginPath();
      ctx.arc(a.x + shakeX, a.y + shakeY, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

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
    ctx.fillStyle = "rgba(255,77,109,.85)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

