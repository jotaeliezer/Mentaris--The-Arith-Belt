"use strict";

function clamp(n, a, b){
  return Math.max(a, Math.min(b, n));
}

function rand(a, b){
  return Math.random() * (b - a) + a;
}

function randi(a, b){
  return Math.floor(rand(a, b + 1));
}

function factKey(a, b){
  var x = Math.min(a, b);
  var y = Math.max(a, b);
  return String(x) + "×" + String(y);
}

"use strict";

var audioCtx = null;
var sfxBank = null;
var droneLoop = null;
var sfxUnlocked = false;
var soundtrackList = null;
var soundtrackIndex = 0;
var soundtrackClip = null;
var soundtrackActive = false;
var soundtrackState = null;

function initSfx(){
  if(sfxBank) return;
  sfxBank = {
    bolt_shot: new Audio("sfx/bolt_shot.mp3"),
    camer_ice_shot: new Audio("sfx/camer_ice_shot.mp3"),
    correct: new Audio("sfx/correct.mp3"),
    crash: new Audio("sfx/crash.mp3"),
    dash: new Audio("sfx/dash.mp3"),
    explosion: new Audio("sfx/explosion.mp3"),
    gun1: new Audio("sfx/gun1.mp3"),
    gun2: new Audio("sfx/gun2.mp3"),
    impact: new Audio("sfx/impact.mp3"),
    impact_thud: new Audio("sfx/impact_thud.mp3"),
    ice_shot: new Audio("sfx/ice_shot.mp3"),
    menu_beep: new Audio("sfx/menu_beep.mp3"),
    missed_answer: new Audio("sfx/missed_answer.mp3"),
    session_start: new Audio("sfx/session_start.mp3"),
    ship_damaged: new Audio("sfx/ship_damaged.mp3"),
    ship_drone: new Audio("sfx/ship_drone.mp3"),
    warning: new Audio("sfx/warning.mp3"),
    wrong_asteroid: new Audio("sfx/wrong_asteroid.mp3")
  };
  sfxBank.bolt_shot.volume = 0.4;
  sfxBank.camer_ice_shot.volume = 0.4;
  sfxBank.correct.volume = 0.5;
  sfxBank.crash.volume = 0.6;
  sfxBank.dash.volume = 0.55;
  sfxBank.explosion.volume = 0.6;
  sfxBank.gun1.volume = 0.35;
  sfxBank.gun2.volume = 0.38;
  sfxBank.impact.volume = 0.45;
  sfxBank.impact_thud.volume = 0.5;
  sfxBank.ice_shot.volume = 0.4;
  sfxBank.menu_beep.volume = 0.45;
  sfxBank.missed_answer.volume = 0.5;
  sfxBank.session_start.volume = 0.6;
  sfxBank.ship_damaged.volume = 0.5;
  sfxBank.ship_drone.volume = 0.22;
  sfxBank.warning.volume = 0.5;
  sfxBank.wrong_asteroid.volume = 0.5;
}

function initSoundtracks(){
  if(soundtrackList) return;
  soundtrackList = [
    new Audio("sfx/soundtrack1.mp3"),
    new Audio("sfx/soundtrack2_toohottosleep.mp3"),
    new Audio("sfx/soundtrack3.mp3")
  ];
  for(var i=0;i<soundtrackList.length;i++){
    soundtrackList[i].volume = 0.22;
    soundtrackList[i].loop = false;
  }
}

function playSoundtrackAt(idx){
  if(!soundtrackActive || !soundtrackState || !soundtrackState.sound) return;
  initSoundtracks();
  if(!soundtrackList || !soundtrackList.length) return;
  var clip = soundtrackList[idx % soundtrackList.length];
  soundtrackClip = clip;
  soundtrackIndex = idx % soundtrackList.length;
  var master = (soundtrackState && typeof soundtrackState.volume === "number") ? soundtrackState.volume : 1;
  var musicMaster = (soundtrackState && typeof soundtrackState.musicVolume === "number") ? soundtrackState.musicVolume : 1;
  clip.volume = Math.max(0, Math.min(1, 0.22 * master * musicMaster));
  try{
    clip.currentTime = 0;
    clip.onended = function(){
      if(!soundtrackActive) return;
      playSoundtrackAt(soundtrackIndex + 1);
    };
    clip.play().catch(function(){});
  }catch(e){
    // ignore audio failures
  }
}

function playSfx(state, name, vol){
  if(!state.sound) return;
  try{
    initSfx();
    var base = sfxBank[name];
    if(!base) return;
    var clip = base.cloneNode();
    var master = (state && typeof state.volume === "number") ? state.volume : 1;
    var sfxMaster = (state && typeof state.sfxVolume === "number") ? state.sfxVolume : 1;
    var baseVol = (vol != null) ? vol : base.volume;
    clip.volume = Math.max(0, Math.min(1, baseVol * master * sfxMaster));
    clip.play();
    return clip;
  }catch(e){
    // ignore audio failures
  }
  return null;
}

function unlockSfx(state){
  if(sfxUnlocked) return;
  if(!state.sound) return;
  try{
    initSfx();
    var clip = sfxBank.gun1.cloneNode();
    clip.volume = 0;
    var p = clip.play();
    if(p && p.then) p.then(function(){ clip.pause(); }).catch(function(){});
    setTimeout(function(){ try{ clip.pause(); }catch(e){} }, 80);
    if(audioCtx && audioCtx.state === "suspended"){
      audioCtx.resume().catch(function(){});
    }
    sfxUnlocked = true;
  }catch(e){
    // ignore audio failures
  }
}

function setDrone(state, on){
  if(!state.sound){
    if(droneLoop) droneLoop.pause();
    return;
  }
  try{
    initSfx();
    if(!droneLoop){
      droneLoop = sfxBank.ship_drone.cloneNode();
      droneLoop.loop = true;
    }
    var master = (state && typeof state.volume === "number") ? state.volume : 1;
    var sfxMaster = (state && typeof state.sfxVolume === "number") ? state.sfxVolume : 1;
    droneLoop.volume = Math.max(0, Math.min(1, sfxBank.ship_drone.volume * master * sfxMaster));
    if(on){
      if(droneLoop.paused) droneLoop.play();
    }else{
      droneLoop.pause();
    }
  }catch(e){
    // ignore audio failures
  }
}

function setSoundtrack(state, on){
  soundtrackState = state;
  soundtrackActive = !!on && !!state.sound;
  if(!soundtrackActive){
    if(soundtrackClip){
      try{ soundtrackClip.pause(); }catch(e){}
    }
    return;
  }
  playSoundtrackAt(soundtrackIndex || 0);
}

"use strict";


function createFx(ctx, state, player, beepFn){
  var particles = [];
  var rings = [];
  var cam = { x:0, y:0, t:0, t0:0, amp:0 };

  function kickShake(amp, dur){
    cam.amp = Math.max(cam.amp, amp);
    cam.t0 = Math.max(cam.t0, dur);
    cam.t  = Math.max(cam.t, dur);
  }

  function updateCamera(dtReal){
    if(cam.t > 0){
      cam.t = Math.max(0, cam.t - dtReal);
      var f = cam.t0 > 0 ? (cam.t / cam.t0) : 0;
      cam.x = (Math.random()*2 - 1) * cam.amp * f;
      cam.y = (Math.random()*2 - 1) * cam.amp * f;
    }else{
      cam.x = 0; cam.y = 0; cam.amp = 0; cam.t0 = 0;
    }
  }

  function spawnRing(x,y, baseR){
    rings.push({ x:x, y:y, r: baseR + 6, dr: 520, a: 1 });
    if(rings.length > 14) rings.splice(0, rings.length - 14);
  }

  function updateRings(dt){
    for(var i=rings.length-1; i>=0; i--){
      var rr = rings[i];
      rr.r += rr.dr * dt;
      rr.a -= dt * 3.2;
      if(rr.a <= 0) rings.splice(i,1);
    }
  }

  function drawRings(){
    if(!rings.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for(var i=0;i<rings.length;i++){
      var rr = rings[i];
      ctx.globalAlpha = Math.max(0, rr.a);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,229,255,.65)";
      ctx.beginPath();
      ctx.arc(rr.x, rr.y, rr.r, 0, Math.PI*2);
      ctx.stroke();

      ctx.globalAlpha = Math.max(0, rr.a) * 0.55;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,221,0,.55)";
      ctx.beginPath();
      ctx.arc(rr.x, rr.y, rr.r * 0.78, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function spawnParticles(x,y, kind){
    var n = (kind === "correct") ? 36
          : (kind === "wrong") ? 22
          : (kind === "spark") ? 26
          : (kind === "smoke") ? 8
          : 12;

    var sp = (kind === "correct") ? 520
           : (kind === "wrong") ? 420
           : (kind === "spark") ? 780
           : (kind === "smoke") ? 90
           : 320;

    for(var i=0;i<n;i++){
      var ang = Math.random() * Math.PI*2;
      var v = rand(sp*0.35, sp);

      if(kind === "smoke"){
        particles.push({
          x:x + rand(-10,10), y:y + rand(-6,6),
          vx: rand(-40,40),
          vy: rand(70,140),
          r: rand(4.0, 8.5),
          a: rand(0.18, 0.38),
          life: rand(0.9, 1.6),
          kind: "smoke",
          grow: rand(10, 22)
        });
        continue;
      }

      particles.push({
        x:x, y:y,
        vx: Math.cos(ang)*v,
        vy: Math.sin(ang)*v,
        r: rand(1.2, (kind === "correct") ? 3.0 : (kind === "spark" ? 2.2 : 2.4)),
        a: rand(0.55, 0.95),
        life: (kind === "correct") ? rand(0.22, 0.38)
             : (kind === "spark") ? rand(0.10, 0.22)
             : rand(0.18, 0.32),
        kind: kind,
        spin: rand(-6,6)
      });
    }

    if(particles.length > 180) particles.splice(0, particles.length - 180);
  }

  function updateParticles(dt){
    for(var i=particles.length-1; i>=0; i--){
      var p = particles[i];
      p.life -= dt;
      if(p.life <= 0){ particles.splice(i,1); continue; }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if(p.kind === "smoke"){
        p.r += (p.grow || 14) * dt;
        p.vx *= (1 - dt*1.2);
        p.vy *= (1 - dt*0.6);
        p.a  *= (1 - dt*1.1);
      }else{
        p.vx *= (1 - dt*2.8);
        p.vy *= (1 - dt*2.8);
        p.a  *= (1 - dt*3.6);
      }
    }
  }

  function drawParticles(){
    if(!particles.length) return;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for(var i=0;i<particles.length;i++){
      var p = particles[i];
      if(p.kind !== "smoke") continue;
      ctx.globalAlpha = Math.max(0, p.a);
      ctx.fillStyle = "rgba(180,190,220,.35)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();

      ctx.globalAlpha = Math.max(0, p.a) * 0.55;
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.beginPath();
      ctx.arc(p.x + 1.2, p.y + 1.0, Math.max(1, p.r*0.55), 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for(var j=0;j<particles.length;j++){
      var q = particles[j];
      if(q.kind === "smoke") continue;
      ctx.globalAlpha = Math.max(0, q.a);

      if(q.kind === "correct") ctx.fillStyle = "rgba(0,229,255,.9)";
      else if(q.kind === "wrong") ctx.fillStyle = "rgba(255,77,109,.9)";
      else if(q.kind === "spark") ctx.fillStyle = "rgba(255,221,0,.90)";
      else ctx.fillStyle = "rgba(232,236,255,.7)";

      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function impactCorrect(x,y,r){
    state.slowMoRemaining = 0.10;
    state.slowMoScale = 0.42;
    kickShake(7.5, 0.10);
    spawnRing(x,y,r);
    spawnParticles(x,y,"correct");
  }

  function impactWrong(x,y){
    kickShake(4.0, 0.08);
    spawnParticles(x,y,"wrong");
  }

  function impactDebris(x,y){
    kickShake(2.0, 0.06);
    spawnParticles(x,y,"debris");
  }

  function impactShipHit(x,y){
    state.slowMoRemaining = 0.0;
    kickShake(28.0, 0.16);
    spawnParticles(x,y,"spark");
    spawnParticles(x,y,"smoke");
    if(beepFn) beepFn(120, 95, "sawtooth", 0.035);
  }

  function emitDamageSmoke(dt){
    var dmg = 1 - player.hull;
    if(dmg <= 0.02) return;
    if(player.invuln > 0) return;

    var speedMag = Math.min(1, Math.hypot(player.vx, player.vy) / (player.speed || 1));
    var rate = (0.6 + speedMag*0.8) * dmg;

    var p = clamp(rate * dt * 6.0, 0, 0.55);
    if(Math.random() < p){
      spawnParticles(player.x + rand(-6,6), player.y + 14 + rand(-2,2), "smoke");
    }
  }

  return {
    particles:particles,
    rings:rings,
    cam:cam,
    kickShake:kickShake,
    updateCamera:updateCamera,
    spawnRing:spawnRing,
    updateRings:updateRings,
    drawRings:drawRings,
    spawnParticles:spawnParticles,
    updateParticles:updateParticles,
    drawParticles:drawParticles,
    impactCorrect:impactCorrect,
    impactWrong:impactWrong,
    impactDebris:impactDebris,
    impactShipHit:impactShipHit,
    emitDamageSmoke:emitDamageSmoke
  };
}

"use strict";


function createBackground(ctx){
  var bg = {
    stars: [],
    streaks: [],
    seed: Math.random() * 1000,
    lastW: 0,
    lastH: 0,
    nebula: null,
    dt: 1/60
  };

  function buildStarfield(w, h){
    bg.stars.length = 0;
    bg.streaks.length = 0;
    bg.lastW = w;
    bg.lastH = h;

    var area = w * h;
    var n1 = Math.floor(clamp(area / 32000, 28, 70));
    var n2 = Math.floor(clamp(area / 24000, 40, 90));
    var n3 = Math.floor(clamp(area / 19000, 50, 120));

    function addLayer(n, speed, sizeMin, sizeMax, alphaMin, alphaMax, tintChance){
      for(var i=0;i<n;i++){
        var tint = (Math.random() < tintChance)
            ? (Math.random() < 0.50 ? "cyan" : (Math.random() < 0.75 ? "mag" : "amber"))
            : "white";
        var col = (tint === "cyan") ? "rgb(0,229,255)"
                : (tint === "mag") ? "rgb(175,0,111)"
                : (tint === "amber") ? "rgb(255,221,0)"
                : "rgb(232,236,255)";

        bg.stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          sp: speed,
          r: rand(sizeMin, sizeMax),
          a: rand(alphaMin, alphaMax),
          tw: rand(0.6, 1.9),
          ph: rand(0, Math.PI*2),
          tint: tint,
          col: col
        });
      }
    }

    addLayer(n1, 16, 0.6, 1.2, 0.20, 0.50, 0.12);
    addLayer(n2, 30, 0.6, 1.5, 0.14, 0.38, 0.08);
    addLayer(n3, 52, 0.5, 1.8, 0.08, 0.26, 0.05);
  }

  function maybeSpawnStreak(w, h){
    if(bg.streaks.length >= 2) return;
    if(Math.random() > 0.006) return;
    bg.streaks.push({
      x: rand(40, w - 40),
      y: rand(-h*0.2, h*0.4),
      vy: rand(420, 700),
      len: rand(120, 220),
      life: rand(0.35, 0.55),
      t: 0,
      hue: (Math.random() < 0.5) ? "cyan" : "mag"
    });
  }

  function drawStars(w,h){
    if(!bg.stars.length || bg.lastW !== w || bg.lastH !== h) buildStarfield(w,h);

    var t = performance.now() * 0.001;
    var dt = bg.dt || (1/60);

    if(bg.nebula && bg.nebula.length){
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.30;
      for(var ni=0; ni<bg.nebula.length; ni++){
        ctx.fillStyle = bg.nebula[ni];
        ctx.fillRect(0,0,w,h);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for(var i=0;i<bg.stars.length;i++){
      var s = bg.stars[i];
      var yy = (s.y + (t * s.sp) + i*0.9) % h;
      var tw = 0.68 + 0.32 * Math.sin(t * s.tw + s.ph);
      var a = s.a * tw;
      if(s.tint === "amber") a *= 0.85;

      ctx.globalAlpha = a;
      ctx.fillStyle = s.col;

      if((i % 31) === 0 && tw > 0.92){
        var rr = s.r + 0.9;
        var xx = s.x;
        ctx.fillRect(xx - rr*1.2, yy, rr*2.4, 1);
        ctx.fillRect(xx, yy - rr*1.2, 1, rr*2.4);
      }

      ctx.fillRect(s.x, yy, s.r, s.r);
    }

    maybeSpawnStreak(w,h);
    for(var j=bg.streaks.length-1; j>=0; j--){
      var st = bg.streaks[j];
      st.t += dt;
      st.y += st.vy * dt;
      st.life -= dt;

      var fade = clamp(st.life / 0.55, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.50 * fade;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = (st.hue === "mag") ? "rgba(175,0,111,1)" : "rgba(0,229,255,1)";
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(st.x + 22, st.y - st.len);
      ctx.stroke();
      ctx.restore();

      if(st.life <= 0 || st.y - st.len > h + 50) bg.streaks.splice(j,1);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  return {
    bg:bg,
    buildStarfield:buildStarfield,
    maybeSpawnStreak:maybeSpawnStreak,
    drawStars:drawStars
  };
}

"use strict";


function computeSpawnInterval(state){
  var base = 0.62;
  var levelBoost = Math.min(0.30, (state.level - 1) * 0.035);
  var streakBoost = Math.min(0.18, state.ddSpeedBonus * 0.70);
  var interval = base - levelBoost - streakBoost;
  return clamp(interval, 0.28, 0.78);
}

var LEVEL_NOTES = [
  {level:1, note:"Baseline speed and generous spacing."},
  {level:3, note:"More debris starts spawning."},
  {level:5, note:"Spawn cadence tightens; bonus decoys appear."},
  {level:8, note:"High streaks will noticeably amp speed."}
];

"use strict";

// Lightweight manager stub so powerups can evolve without touching core loop.
var POWERUPS = [
  {
    id:"slowmo",
    label:"Time Dilation",
    desc:"Brief slow-mo after a correct hit.",
    apply:function(state){
      state.slowMoRemaining = Math.max(state.slowMoRemaining, 0.10);
      state.slowMoScale = 0.42;
    }
  },
  {
    id:"hull-boost",
    label:"Hull Nanites",
    desc:"Small hull repair after a long streak.",
    apply:function(state, player){
      player.hull = Math.min(1, player.hull + 0.12);
    }
  }
];

function PowerupManager(state, player){
  this.state = state;
  this.player = player;
  this.queue = [];
}

PowerupManager.prototype.grant = function(id){
  var p = POWERUPS.find(function(pp){ return pp.id === id; });
  if(p) this.queue.push(p);
};

PowerupManager.prototype.flush = function(){
  while(this.queue.length){
    var p = this.queue.shift();
    p.apply(this.state, this.player);
  }
};

PowerupManager.prototype.update = function(){
  this.flush();
};

"use strict";


function createState(){
  return {
    running:false,
    paused:false,
    over:false,

    // settings
    aMin:2, aMax:12,
    bMin:2, bMax:12,
    decoys:3,
    baseSpeed:1,
    livesStart:3,
    timerMode:"off",
    questionLimit:0,
    sound:true,
    volume:0.65,
    sfxVolume:0.85,
    musicVolume:0.6,
    questionMode:"digits3",

    // session
    score:0,
    streak:0,
    level:1,
    lives:3,
    correct:0,
    wrong:0,
    missed:0,
    shots:0,
    hits:0,
    startTime:0,
    timeLimitSec:0,
    questionsCompleted:0,

    // current problem
    a:0, b:0,
    answer:0,
    waveId:0,

    // weak facts
    missesByFact: new Map(),

    // dynamic difficulty
    ddSpeedBonus:0,

    // continuous spawn
    spawnTimer:0,
    waveDecoys:[],
    correctInPlay:false,
    asteroidId:0,
    correctAsteroidId:0,
    correctDelayRemaining:0,

    // arcade feel FX
    slowMoRemaining:0,
    slowMoScale:0.42,
    empTimer:0,
    answerDigits:[],
    digitCounts:null,
    digitsLeft:0,
    correctDigit:null
  };
}

function createPlayer(){
  return {
    x: 0,
    y: 0,
    w: 58,
    h: 24,
    radius: 18,
    vx: 0,
    vy: 0,
    speed: 560,
    cooldown: 0,
    recoil: 0,
    flash: 0,
    gunSide: 1,
    shipType: "mk7",
    blasterMode: "single",
    blasterTimer: 0,
    secondaryMode: "none",
    secondaryCharges: 0,
    secondaryCooldown: 0,
    lockTimer: 0,
    lockTargetId: 0,
    defenseMode: "none",
    defenseTimer: 0,
    magnetTimer: 0,
    dashCooldown: 0,
    shockwaveCooldown: 0,
    bankHold: 0,
    hull: 1,
    invuln: 0,
    hitFlash: 0,
    hidden: false
  };
}

function normalizeRanges(inputs){
  var a1 = parseInt(inputs.aMin.value, 10);
  var a2 = parseInt(inputs.aMax.value, 10);
  var b1 = parseInt(inputs.bMin.value, 10);
  var b2 = parseInt(inputs.bMax.value, 10);
  if(Number.isNaN(a1)) a1 = 0;
  if(Number.isNaN(a2)) a2 = 12;
  if(Number.isNaN(b1)) b1 = 0;
  if(Number.isNaN(b2)) b2 = 12;

  if(a1 > a2){ var t = a1; a1 = a2; a2 = t; }
  if(b1 > b2){ var t2 = b1; b1 = b2; b2 = t2; }

  a1 = clamp(a1, 0, 99);
  a2 = clamp(a2, 0, 99);
  b1 = clamp(b1, 0, 99);
  b2 = clamp(b2, 0, 99);

  inputs.aMin.value = a1; inputs.aMax.value = a2;
  inputs.bMin.value = b1; inputs.bMax.value = b2;

  return {a1:a1,a2:a2,b1:b1,b2:b2};
}

function applySettingsFromInputs(state, inputs){
  var rr = normalizeRanges(inputs);
  state.aMin = rr.a1; state.aMax = rr.a2;
  state.bMin = rr.b1; state.bMax = rr.b2;
  state.decoys = parseInt(inputs.decoys.value, 10);
  state.baseSpeed = parseFloat(inputs.speed.value);
  state.livesStart = parseInt(inputs.lives.value, 10);
  state.timerMode = inputs.timerMode.value;
  state.sound = inputs.sound ? !!inputs.sound.checked : true;
  if(inputs.volume){
    var vol = parseFloat(inputs.volume.value);
    if(Number.isNaN(vol)) vol = 0.65;
    state.volume = clamp(vol, 0, 1);
  }
  if(inputs.sfxVolume){
    var sfxVol = parseFloat(inputs.sfxVolume.value);
    if(Number.isNaN(sfxVol)) sfxVol = 0.85;
    state.sfxVolume = clamp(sfxVol, 0, 1);
  }
  if(inputs.musicVolume){
    var musicVol = parseFloat(inputs.musicVolume.value);
    if(Number.isNaN(musicVol)) musicVol = 0.6;
    state.musicVolume = clamp(musicVol, 0, 1);
  }
  if(inputs.questionMode) state.questionMode = inputs.questionMode.value || "digits3";
  state.timeLimitSec = (state.timerMode === "off") ? 0 : parseInt(state.timerMode, 10);
  state.questionLimit = 0;
  if(state.timerMode && state.timerMode.charAt(0) === "q"){
    var qCount = parseInt(state.timerMode.slice(1), 10);
    if(!Number.isNaN(qCount) && qCount > 0){
      state.questionLimit = qCount;
      state.timeLimitSec = 0;
    }
  }
}

"use strict";


// ======= DOM
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d", { alpha: true });
var view = { w: 0, h: 0, hudH: 0 };

var promptText = document.getElementById("promptText");
var scoreText  = document.getElementById("scoreText");
var streakText = document.getElementById("streakText");
var levelText  = document.getElementById("levelText");
var livesText  = document.getElementById("livesText");
var hullText   = document.getElementById("hullText");

var overlayMenu = document.getElementById("overlayMenu");
var overlayEnd  = document.getElementById("overlayEnd");
var overlayGameplay = document.getElementById("overlayGameplay");

var btnStart    = document.getElementById("btnStart");
var btnClose    = document.getElementById("btnClose");
var btnGameplay = document.getElementById("btnGameplay");
var btnPause    = document.getElementById("btnPause");
var btnSettings = document.getElementById("btnSettings");
var btnHome     = document.getElementById("btnHome");
var btnRestart  = document.getElementById("btnRestart");
var btnCloseGameplay = document.getElementById("btnCloseGameplay");
var btnBackGameplay = document.getElementById("btnBackGameplay");

var btnEndRestart  = document.getElementById("btnEndRestart");
var btnEndSettings = document.getElementById("btnEndSettings");
var btnEndHome = document.getElementById("btnEndHome");

var toast = document.getElementById("toast");
var countdownEl = document.getElementById("countdown");
var warningClip = null;

// Settings inputs
var inputs = {
  aMin: document.getElementById("aMin"),
  aMax: document.getElementById("aMax"),
  bMin: document.getElementById("bMin"),
  bMax: document.getElementById("bMax"),
  decoys: document.getElementById("decoys"),
  speed: document.getElementById("speed"),
  lives: document.getElementById("lives"),
  volume: document.getElementById("volume"),
  sfxVolume: document.getElementById("sfxVolume"),
  musicVolume: document.getElementById("musicVolume"),
  ship: document.getElementById("ship"),
  timerMode: document.getElementById("timerMode"),
  sound: document.getElementById("sound"),
  questionMode: document.getElementById("questionMode")
};

// End screen
var endSubtitle = document.getElementById("endSubtitle");
var statsList = document.getElementById("statsList");
var weakList = document.getElementById("weakList");
var accBar = document.getElementById("accBar");
var highScoresEnd = document.getElementById("highScoresEnd");
var endNameInput = document.getElementById("endNameInput");

// ======= State / Entities
var state = createState();
var player = createPlayer();
var bullets = [];
var asteroids = [];
var powerups = [];
var bestStreak = 0;
var gameOverFx = { active:false, t:0, reason:"", shown:false, x:0, y:0 };
var dashGhosts = [];

// ======= Systems
var fx = createFx(ctx, state, player, null);
var particles = fx.particles;
var rings = fx.rings;
var cam = fx.cam;
var kickShake = fx.kickShake;
var updateCamera = fx.updateCamera;
var spawnRing = fx.spawnRing;
var updateRings = fx.updateRings;
var drawRings = fx.drawRings;
var spawnParticles = fx.spawnParticles;
var updateParticles = fx.updateParticles;
var drawParticles = fx.drawParticles;
var impactCorrect = fx.impactCorrect;
var impactWrong = fx.impactWrong;
var impactDebris = fx.impactDebris;
var impactShipHit = fx.impactShipHit;
var emitDamageSmoke = fx.emitDamageSmoke;

var bgCtl = createBackground(ctx);
var bg = bgCtl.bg;
var buildStarfield = bgCtl.buildStarfield;
var drawStars = bgCtl.drawStars;
var SHOW_STARS = true;

var powerupManager = new PowerupManager(state, player);

function requestFullscreen(){
  try{
    var el = document.documentElement;
    if(!document.fullscreenElement && el && el.requestFullscreen){
      el.requestFullscreen().catch(function(){});
    }
  }catch(e){
    // ignore fullscreen errors
  }
}

function primeFullscreen(){
  if(document.fullscreenElement) return;
  var fired = false;
  function tryFs(){
    if(fired) return;
    fired = true;
    requestFullscreen();
  }
  window.addEventListener("pointerdown", tryFs, { once: true });
  window.addEventListener("keydown", tryFs, { once: true });
}

// ======= Controls
var keys = new Set();
var audioPrimed = false;

function isTextInput(el){
  if(!el) return false;
  var tag = (el.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

window.addEventListener("keydown", function(e){
  if(isTextInput(document.activeElement)) return;
  var k = (e.key || "").toLowerCase();
  var prevent = ["arrowleft","arrowright","arrowup","arrowdown","a","d","w","s","p","r","m","z","x","c"," ","spacebar"];
  if(prevent.indexOf(k) !== -1) e.preventDefault();

  keys.add(k);
  if(!audioPrimed){
    unlockSfx(state);
    audioPrimed = true;
  }
  if(k === "p") togglePause();
  if(k === "r") hardRestart();
  if(k === "m") openSettings();
  if(k === "z") fire();
  if(k === "x") secondaryFire();
  if(k === "c") shockwave();
  if(k === " " || k === "spacebar") dash();
}, {passive:false});

window.addEventListener("keyup", function(e){
  if(isTextInput(document.activeElement)) return;
  keys.delete((e.key || "").toLowerCase());
});

// Pointer controls
var pointerDown = false;
var lastPointerX = null;
var lastPointerY = null;

canvas.addEventListener("pointerdown", function(e){
  pointerDown = true;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  fire();
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", function(e){
  if(!pointerDown) return;
  var dx = e.clientX - lastPointerX;
  var dy = e.clientY - lastPointerY;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;

  var r = canvas.getBoundingClientRect();
  var hudH = document.getElementById("hud").getBoundingClientRect().height;
  var topLimit = hudH + 14;
  var bottomLimit = r.height - 18;

  player.x += dx * 1.15;
  player.y += dy * 1.15;
  player.x = clamp(player.x, player.w/2 + 10, r.width - player.w/2 - 10);
  player.y = clamp(player.y, topLimit + player.h/2 + 6, bottomLimit - player.h/2);
});

canvas.addEventListener("pointerup", function(){
  pointerDown = false;
  lastPointerX = null;
  lastPointerY = null;
});

// ======= Layout
function resize(){
  var shell = document.getElementById("gameShell");
  var r = shell.getBoundingClientRect();

  var dpr = Math.min(1.25, window.devicePixelRatio || 1);
  canvas.width = Math.floor(r.width * dpr);
  canvas.height = Math.floor(r.height * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);

  var w = r.width;
  var h = r.height;
  view.w = w;
  view.h = h;
  view.hudH = document.getElementById("hud").getBoundingClientRect().height;

  player.x = clamp(player.x || w/2, player.w/2 + 10, w - player.w/2 - 10);
  player.y = clamp(player.y || (h - 58), 80, h - 58);

  buildStarfield(w, h);

  bg.nebula = [];
  var g1 = ctx.createRadialGradient(w*0.22, h*0.18, 20, w*0.22, h*0.18, Math.max(w,h)*0.55);
  g1.addColorStop(0, "rgba(175,0,111,.22)");
  g1.addColorStop(1, "rgba(0,0,0,0)");
  bg.nebula.push(g1);

  var g2 = ctx.createRadialGradient(w*0.78, h*0.24, 20, w*0.78, h*0.24, Math.max(w,h)*0.60);
  g2.addColorStop(0, "rgba(0,229,255,.18)");
  g2.addColorStop(1, "rgba(0,0,0,0)");
  bg.nebula.push(g2);

  var g3 = ctx.createRadialGradient(w*0.55, h*0.62, 20, w*0.55, h*0.62, Math.max(w,h)*0.55);
  g3.addColorStop(0, "rgba(255,221,0,.10)");
  g3.addColorStop(1, "rgba(0,0,0,0)");
  bg.nebula.push(g3);
}

window.addEventListener("resize", resize);

// ======= UI
function syncHud(){
  var op = isAdditionMode() ? "+" : "×";
  promptText.textContent = state.over ? "—" : (state.a + " " + op + " " + state.b + " = ?");
  scoreText.textContent = String(state.score);
  streakText.textContent = String(state.streak);
  levelText.textContent = String(state.level);
  livesText.textContent = String(state.lives);
  if(hullText){
    hullText.textContent = Math.round(clamp(player.hull,0,1) * 100) + "%";
  }
  btnPause.textContent = state.paused ? "RESUME (P)" : "PAUSE (P)";
}

var toastTimer = null;
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ toast.classList.remove("show"); }, 850);
}

// ======= Problem / Decoys
function normalizeRangesFromInputs(){
  return normalizeRanges(inputs);
}

function isAdditionMode(){
  return state.questionMode === "add_digits2"
    || state.questionMode === "add_digits3"
    || state.questionMode === "add_classic2"
    || state.questionMode === "add_classic3";
}

function isDigitMode(){
  return state.questionMode === "digits3"
    || state.questionMode === "digits2"
    || state.questionMode === "add_digits2"
    || state.questionMode === "add_digits3";
}

function shouldEndByQuestionLimit(){
  return state.questionLimit > 0 && state.questionsCompleted >= state.questionLimit;
}

function nextProblem(){
  var rr = normalizeRangesFromInputs();
  if(isDigitMode()){
    if(state.questionMode === "digits2"){
      state.a = randi(10, 99);
      state.b = randi(2, 9);
    }else if(state.questionMode === "digits3"){
      state.a = randi(100, 999);
      state.b = randi(2, 9);
    }else if(state.questionMode === "add_digits2"){
      state.a = randi(10, 99);
      state.b = randi(10, 99);
    }else{
      state.a = randi(100, 999);
      state.b = randi(100, 999);
    }
  }else{
    if(state.questionMode === "add_classic2"){
      state.a = randi(10, 99);
      state.b = randi(10, 99);
    }else if(state.questionMode === "add_classic3"){
      state.a = randi(100, 999);
      state.b = randi(100, 999);
    }else if(state.questionMode === "classic2"){
      state.a = randi(10, 99);
      state.b = randi(2, 9);
    }else if(state.questionMode === "classic3"){
      state.a = randi(100, 999);
      state.b = randi(2, 9);
    }else{
      state.a = randi(rr.a1, rr.a2);
      state.b = randi(rr.b1, rr.b2);
    }
  }
  state.answer = isAdditionMode() ? (state.a + state.b) : (state.a * state.b);
  if(isDigitMode()){
    var ansStr = String(state.answer);
    state.answerDigits = ansStr.split("");
    state.digitsLeft = state.answerDigits.length;
    state.correctDigit = Number(state.answerDigits[state.digitsLeft - 1]);
  }
  state.waveId++;
  syncHud();
  prepareWave();
}

function genDecoys(correct, count){
  if(isAdditionMode()){
    var outAdd = new Set();
    var triesAdd = 0;
    while(outAdd.size < count && triesAdd++ < 200){
      var dAdd;
      var rollAdd = Math.random();
      if(rollAdd < 0.6){
        dAdd = correct + randi(-12, 12);
      }else if(rollAdd < 0.88){
        var axAdd = state.a + (Math.random()<0.5 ? -1 : 1);
        var bxAdd = state.b + (Math.random()<0.5 ? -1 : 1);
        dAdd = (Math.random()<0.5 ? axAdd + state.b : state.a + bxAdd);
      }else{
        dAdd = correct + randi(-25, 25);
      }
      if(dAdd === correct) continue;
      if(dAdd < 0) continue;
      if(Math.abs(dAdd - correct) > 60) continue;
      outAdd.add(dAdd);
    }
    while(outAdd.size < count){
      var ddAdd = Math.max(0, correct + randi(-15, 15));
      if(ddAdd !== correct) outAdd.add(ddAdd);
    }
    return Array.from(outAdd);
  }
  var out = new Set();
  var maxTries = 200;
  var tries = 0;
  while(out.size < count && tries++ < maxTries){
    var d;
    var roll = Math.random();

    if(roll < 0.65){
      var delta = randi(1, 10) * (Math.random() < 0.5 ? -1 : 1);
      d = correct + delta;
    }else if(roll < 0.88){
      var ax = state.a + (Math.random()<0.5 ? -1 : 1);
      var bx = state.b + (Math.random()<0.5 ? -1 : 1);
      d = (Math.random()<0.5 ? ax*state.b : state.a*bx);
    }else{
      d = correct + randi(-25, 25);
    }

    if(d === correct) continue;
    if(d < 0) continue;
    if(Math.abs(d - correct) > 40) continue;
    out.add(d);
  }

  while(out.size < count){
    var dd = Math.max(0, correct + randi(-12, 12));
    if(dd !== correct) out.add(dd);
  }
  return Array.from(out);
}

function pickCorrectDigit(){
  if(!state.answerDigits || state.digitsLeft <= 0) return null;
  return Number(state.answerDigits[state.digitsLeft - 1]);
}

function genDigitDecoys(correctDigit, count){
  var out = new Set();
  var tries = 0;
  while(out.size < count && tries++ < 120){
    var d = randi(0, 9);
    if(d === correctDigit) continue;
    out.add(d);
  }
  while(out.size < count){
    var dd = (correctDigit + randi(1,9)) % 10;
    if(dd !== correctDigit) out.add(dd);
  }
  return Array.from(out);
}

function prepareWave(){
  if(isDigitMode()){
    if(state.correctDigit == null) state.correctDigit = pickCorrectDigit();
    state.waveDecoys = genDigitDecoys(state.correctDigit, state.decoys);
  }else{
    state.waveDecoys = genDecoys(state.answer, state.decoys);
  }
  state.correctInPlay = false;
  state.correctAsteroidId = 0;

  var minDecoysFirst = 2;
  var maxDecoysFirst = Math.min(5, 2 + state.decoys);
  state.correctDelayRemaining = randi(minDecoysFirst, maxDecoysFirst);
  state.spawnTimer = 0;
}

function pickSpawnX(w){
  for(var tries=0; tries<10; tries++){
    var x = rand(48, w - 48);
    var ok = true;
    for(var i=0;i<asteroids.length;i++){
      var a = asteroids[i];
      if(a.y < 180 && Math.abs(a.x - x) < 48){ ok = false; break; }
    }
    if(ok) return x;
  }
  return rand(48, w - 48);
}

function spawnAsteroid(label, isCorrect){
  var r = canvas.getBoundingClientRect();
  var w = r.width;

  var baseVy = 120 + state.level * 18;
  var speedScale = state.baseSpeed * (1 + state.ddSpeedBonus);

  var size = isCorrect ? rand(30, 38) : rand(26, 36);
  var id = ++state.asteroidId;
  var driftAmp = rand(8, 20);
  var driftRate = rand(0.6, 1.4);
  var driftPhase = rand(0, Math.PI * 2);

  var a = {
    id:id,
    x: pickSpawnX(w),
    y: -rand(26, 88),
    vx: rand(-35, 35),
    vy: baseVy * speedScale * (isCorrect ? 1.03 : rand(0.94, 1.10)),
    baseVy: baseVy * speedScale,
    r: size,
    label: label,
    isCorrect: !!isCorrect,
    waveId: state.waveId,
    spin: rand(-2.6, 2.6),
    rot: rand(0, Math.PI*2),
    seed: Math.random()*1000,
    hit:false,
    warned:false,
    ghost:false,
    driftAmp: driftAmp,
    driftRate: driftRate,
    driftPhase: driftPhase
  };

  asteroids.push(a);

  if(isCorrect){
    state.correctInPlay = true;
    state.correctAsteroidId = id;
  }
}

function spawnDecoyOnly(){
  var pool = (state.waveDecoys && state.waveDecoys.length) ? state.waveDecoys : [Math.max(0, state.answer + randi(-10,10))];
  var label = pool[randi(0, pool.length - 1)];
  spawnAsteroid(label, false);
}

function spawnOneFromWave(){
  if(!state.correctInPlay){
    if(state.correctDelayRemaining > 0){
      spawnDecoyOnly();
      state.correctDelayRemaining--;
    }else{
      var label = isDigitMode() ? state.correctDigit : state.answer;
      spawnAsteroid(label, true);
    }
  }else{
    spawnDecoyOnly();
  }

  if(state.level >= 4 && Math.random() < 0.28){
    var r = canvas.getBoundingClientRect();
    var w = r.width;
    var baseVy = 110 + state.level * 14;
    var speedScale = state.baseSpeed * (1 + state.ddSpeedBonus);
    asteroids.push({
      id: ++state.asteroidId,
      x: rand(40, w-40),
      y: -rand(220, 520),
      vx: rand(-25, 25),
      vy: baseVy*speedScale*rand(0.75,1.0),
      baseVy: baseVy * speedScale,
      r: rand(14, 22),
      label: null,
      isCorrect:false,
      waveId: -1,
      spin: rand(-3.2, 3.2),
      rot: rand(0, Math.PI*2),
      seed: Math.random()*1000,
      hit:false,
      ghost:true,
      driftAmp: rand(6, 14),
      driftRate: rand(0.6, 1.5),
      driftPhase: rand(0, Math.PI * 2)
    });
  }
}

function spawnPowerup(type, group){
  var r = canvas.getBoundingClientRect();
  powerups.push({
    x: rand(60, r.width - 60),
    y: -30,
    vy: rand(90, 140),
    r: 16,
    type: type,
    group: group
  });
}

function maybeDropPowerup(){
  if(Math.random() > 0.45) return;
  var roll = Math.random();
  if(roll < 0.45){
    var offense = ["dual", "laser", "fire", "ice", "electric", "pierce", "plasma", "rail"];
    var oType = offense[Math.floor(Math.random() * offense.length)];
    spawnPowerup(oType, "offense");
  }else if(roll < 0.7){
    var dType = Math.random() < 0.6 ? "shield" : "armor";
    spawnPowerup(dType, "defense");
  }else{
    var secondary = ["repair", "time", "magnet", "emp", "lock"];
    var sType = secondary[Math.floor(Math.random() * secondary.length)];
    spawnPowerup(sType, "secondary");
  }
}

function applyPowerup(p){
  if(p.group === "offense"){
    player.blasterMode = p.type;
    player.blasterTimer = 12;
    if(p.type === "dual") showToast("OFFENSE → DUAL BLASTER");
    else if(p.type === "laser") showToast("OFFENSE → LASER BURST");
    else if(p.type === "fire") showToast("OFFENSE → FIREBALL");
    else if(p.type === "ice") showToast("OFFENSE → ICE SHARDS");
    else if(p.type === "electric") showToast("OFFENSE → ELECTRIC BOLTS");
    else if(p.type === "pierce") showToast("OFFENSE → PIERCING SHOTS");
    else if(p.type === "plasma") showToast("OFFENSE → PLASMA ORB");
    else if(p.type === "rail") showToast("OFFENSE → RAIL BEAM");
  }else if(p.group === "defense" && p.type === "shield"){
    player.defenseMode = "shield";
    player.defenseTimer = 10;
    showToast("DEFENSE → SHIELD");
  }else if(p.group === "defense" && p.type === "armor"){
    player.defenseMode = "armor";
    player.defenseTimer = 12;
    showToast("DEFENSE → ARMOR");
  }else if(p.group === "secondary"){
    player.secondaryMode = p.type;
    player.secondaryCharges = 1;
    if(p.type === "repair") showToast("SECONDARY → REPAIR PULSE (X)");
    else if(p.type === "time") showToast("SECONDARY → TIME DILATION (X)");
    else if(p.type === "magnet") showToast("SECONDARY → MAGNET SWEEP (X)");
    else if(p.type === "emp") showToast("SECONDARY → EMP BURST (X)");
    else if(p.type === "lock") showToast("SECONDARY → TARGET LOCK (X)");
  }
}

function retireWave(wid){
  for(var i=0;i<asteroids.length;i++){
    var a = asteroids[i];
    if(a.waveId === wid){
      a.waveId = -1;
      a.isCorrect = false;
    }
  }
}

// ======= Core actions
function applySettings(){
  applySettingsFromInputs(state, inputs);
  if(inputs.ship && inputs.ship.value){
    player.shipType = inputs.ship.value;
  }
  if(!state.sound) setDrone(state, false);
  setSoundtrack(state, state.sound && state.running && !state.over);
}

function resetSession(){
  bullets.length = 0;
  asteroids.length = 0;
  powerups.length = 0;
  particles.length = 0;
  rings.length = 0;
  dashGhosts.length = 0;
  gameOverFx.active = false;
  gameOverFx.t = 0;
  gameOverFx.shown = false;
  gameOverFx.reason = "";
  gameOverFx.x = 0;
  gameOverFx.y = 0;
  cam.x = 0; cam.y = 0; cam.t = 0; cam.t0 = 0; cam.amp = 0;

  state.running = true;
  state.paused = false;
  state.over = false;

  state.score = 0;
  state.streak = 0;
  state.level = 1;
  state.lives = state.livesStart;

  state.correct = 0;
  state.wrong = 0;
  state.missed = 0;
  state.shots = 0;
  state.hits = 0;
  state.questionsCompleted = 0;
  state.startTime = performance.now();

  state.missesByFact = new Map();
  state.ddSpeedBonus = 0;

  state.spawnTimer = 0;
  state.waveDecoys = [];
  state.correctInPlay = false;
  state.asteroidId = 0;
  state.correctAsteroidId = 0;
  state.correctDelayRemaining = 0;
  state.empTimer = 0;
  state.answerDigits = [];
  state.digitCounts = null;
  state.digitsLeft = 0;
  state.correctDigit = null;

  player.cooldown = 0;
  player.vx = 0;
  player.vy = 0;
  player.recoil = 0;
  player.flash = 0;
  player.gunSide = 1;
  player.bankHold = 0;
  player.blasterMode = "single";
  player.blasterTimer = 0;
  player.secondaryMode = "none";
  player.secondaryCharges = 0;
  player.secondaryCooldown = 0;
  player.lockTimer = 0;
  player.lockTargetId = 0;
  player.defenseMode = "none";
  player.defenseTimer = 0;
  player.magnetTimer = 0;

  player.hull = 1;
  player.invuln = 0;
  player.hitFlash = 0;
  player.hidden = false;

  nextProblem();
  syncHud();
  setDrone(state, true);
  setSoundtrack(state, true);
}

function startCountdown(){
  if(!countdownEl) return false;
  if(countdownEl.classList.contains("show")) return true;

  overlayMenu.classList.remove("show");
  overlayEnd.classList.remove("show");
  applySettings();
  state.running = false;
  state.paused = false;
  state.over = false;
  syncHud();

  var steps = ["3","2","1","GO"];
  var i = 0;
  countdownEl.textContent = steps[i];
  countdownEl.classList.add("show");
  playSfx(state, "session_start");

  var timer = setInterval(function(){
    i++;
    if(i < steps.length){
      countdownEl.textContent = steps[i];
      return;
    }
    clearInterval(timer);
    countdownEl.classList.remove("show");
    resetSession();
    showToast("MISSION START");
  }, 600);

  return true;
}

function hardRestart(){
  ensureLoop();
  if(!startCountdown()){
    overlayEnd.classList.remove("show");
    overlayMenu.classList.remove("show");
    applySettings();
    resetSession();
    showToast("MISSION RESTARTED");
  }
}

function openSettings(){
  state.paused = true;
  syncHud();
  overlayMenu.classList.add("show");
}

function closeSettings(){
  overlayMenu.classList.remove("show");
  if(state.running && !state.over) state.paused = false;
  syncHud();
}

function togglePause(){
  if(!state.running || state.over) return;
  state.paused = !state.paused;
  syncHud();
  showToast(state.paused ? "PAUSED" : "RESUMED");
}

function fire(){
  if(!state.running || state.paused || state.over) return;
  if(player.cooldown > 0) return;

  state.shots++;
  player.cooldown = 0.16;
  var mode = player.blasterMode || "single";
  if(mode === "dual"){
    bullets.push({ x: player.x - 16, y: player.y - 22, vy: -860, r: 3.2, vx: 0, kind: "dual" });
    bullets.push({ x: player.x + 16, y: player.y - 22, vy: -860, r: 3.2, vx: 0, kind: "dual" });
  }else if(mode === "laser"){
    bullets.push({ x: player.x, y: player.y - 24, vy: -980, r: 5.2, vx: 0, kind: "laser", len: 22, w: 3.6 });
  }else if(mode === "fire"){
    bullets.push({ x: player.x, y: player.y - 20, vy: -720, r: 6.2, vx: 0, kind: "fire" });
  }else if(mode === "ice"){
    bullets.push({ x: player.x, y: player.y - 26, vy: -880, r: 6.5, vx: 0, kind: "ice" });
  }else if(mode === "electric"){
    bullets.push({ x: player.x, y: player.y - 24, vy: -920, r: 4.2, vx: 0, kind: "electric" });
  }else if(mode === "pierce"){
    bullets.push({ x: player.x, y: player.y - 24, vy: -900, r: 3.8, vx: 0, kind: "pierce", pierce: 2 });
  }else if(mode === "plasma"){
    bullets.push({ x: player.x, y: player.y - 24, vy: -700, r: 7.6, vx: 0, kind: "plasma" });
  }else if(mode === "rail"){
    bullets.push({ x: player.x, y: player.y - 26, vy: -1200, r: 5.2, vx: 0, kind: "rail", len: 40, w: 4.2 });
  }else{
    bullets.push({ x: player.x, y: player.y - 24, vy: -880, r: 3.4, vx: 0, kind: "single" });
  }

  player.recoil = 1;
  player.flash = 1;
  var gunSfx = (mode === "laser" || mode === "rail") ? "gun2" : "gun1";
  if(mode === "ice") gunSfx = "ice_shot";
  if(mode === "electric") gunSfx = "bolt_shot";
  playSfx(state, gunSfx);
}

function secondaryFire(){
  if(!state.running || state.paused || state.over) return;
  if(player.secondaryCooldown > 0) return;
  if(player.secondaryCharges <= 0) return;

  player.secondaryCharges--;
  player.secondaryCooldown = 1.2;

  if(player.secondaryMode === "repair"){
    player.hull = clamp(player.hull + 0.35, 0, 1);
    spawnRing(player.x, player.y, 18);
    spawnParticles(player.x, player.y, "correct");
    showToast("SECONDARY → HULL REPAIR");
  }else if(player.secondaryMode === "time"){
    state.slowMoRemaining = Math.max(state.slowMoRemaining, 1.4);
    state.slowMoScale = 0.35;
    showToast("SECONDARY → TIME DILATION");
  }else if(player.secondaryMode === "magnet"){
    player.magnetTimer = 6.0;
    showToast("SECONDARY → MAGNET SWEEP");
  }else if(player.secondaryMode === "emp"){
    state.empTimer = Math.max(state.empTimer, 2.0);
    spawnRing(player.x, player.y, 24);
    showToast("SECONDARY → EMP BURST");
  }else if(player.secondaryMode === "lock"){
    player.lockTimer = Math.max(player.lockTimer, 6.0);
    showToast("SECONDARY → TARGET LOCK");
  }

  if(player.secondaryCharges <= 0){
    player.secondaryMode = "none";
  }
}

function dash(){
  if(!state.running || state.paused || state.over) return;
  if(player.dashCooldown > 0) return;
  player.dashCooldown = 1.3;
  player.invuln = Math.max(player.invuln, 0.6);
  var startX = player.x;
  var startY = player.y;
  var dx = 0;
  var dy = 0;
  if(keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if(keys.has("arrowright") || keys.has("d")) dx += 1;
  if(keys.has("arrowup") || keys.has("w")) dy -= 1;
  if(keys.has("arrowdown") || keys.has("s")) dy += 1;
  if(dx === 0 && dy === 0){
    dx = player.vx;
    dy = player.vy;
  }
  var len = Math.hypot(dx, dy);
  if(len === 0){
    dx = 0; dy = -1; len = 1;
  }
  dx /= len;
  dy /= len;
  var dashDist = 130;
  player.x = clamp(player.x + dx * dashDist, 40, view.w - 40);
  player.y = clamp(player.y + dy * dashDist, 80, view.h - 58);
  kickShake(12, 0.1);
  spawnDashGhosts(startX, startY, player.x, player.y, dx, dy);
  playSfx(state, "dash");
  showToast("DASH");
}

function shockwave(){
  if(!state.running || state.paused || state.over) return;
  if(player.shockwaveCooldown > 0) return;
  player.shockwaveCooldown = 3.5;

  var radius = 160;
  var strength = 520;
  for(var i=0;i<asteroids.length;i++){
    var a = asteroids[i];
    if(a.ghost || a.label === null) continue;
    var dx = a.x - player.x;
    var dy = a.y - player.y;
    var dist = Math.hypot(dx, dy);
    if(dist > radius) continue;
    var push = (1 - dist / radius) * strength;
    a.vx = (a.vx || 0) + (dx / dist) * push;
    a.vy = (a.vy || 0) + (dy / dist) * push * 0.6;
  }
  spawnRing(player.x, player.y - 10, 26);
  kickShake(14, 0.12);
  playSfx(state, "dash");
  showToast("SHOCKWAVE");
}

function loseLife(reason){
  state.lives = Math.max(0, state.lives - 1);
  syncHud();
  showToast(reason);
  if(state.lives <= 0) endGame("destroyed");
}

function recordFactMiss(a,b){
  var key = factKey(a,b);
  var prev = state.missesByFact.get(key) || 0;
  state.missesByFact.set(key, prev + 1);
}

function computeMaxStreak(){ return bestStreak; }

function loadLifetimeStats(){
  try{
    var raw = localStorage.getItem("mathsteroid.stats");
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(e){
    return null;
  }
}

function saveLifetimeStats(stats){
  try{
    localStorage.setItem("mathsteroid.stats", JSON.stringify(stats));
  }catch(e){
    // ignore storage errors
  }
}

function updateLifetimeStats(session){
  var stats = loadLifetimeStats() || {
    sessions: 0,
    totalScore: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalMissed: 0,
    bestScore: 0,
    bestStreak: 0,
    highScores: []
  };

  stats.sessions += 1;
  stats.totalScore += session.score;
  stats.totalCorrect += session.correct;
  stats.totalWrong += session.wrong;
  stats.totalMissed += session.missed;
  stats.bestScore = Math.max(stats.bestScore, session.score);
  stats.bestStreak = Math.max(stats.bestStreak, session.bestStreak);

  stats.highScores = stats.highScores || [];
  stats.highScores.push({
    id: session.id || String(Date.now()),
    name: session.name || "",
    score: session.score,
    correct: session.correct,
    level: session.level,
    mode: session.mode,
    date: Date.now()
  });
  stats.highScores.sort(function(a,b){ return b.score - a.score; });
  stats.highScores = stats.highScores.slice(0, 5);

  saveLifetimeStats(stats);
  return stats;
}

function renderHighScores(lifetime){
  if(!highScoresEnd) return;
  highScoresEnd.innerHTML = "";
  var hs = lifetime && lifetime.highScores ? lifetime.highScores : [];
  if(!hs.length){
    var hsEmpty = document.createElement("li");
    hsEmpty.innerHTML = '<span style="color: var(--muted);">NO SCORES YET.</span><b class="pillGood">PLAY</b>';
    highScoresEnd.appendChild(hsEmpty);
    return;
  }
  for(var h=0; h<hs.length; h++){
    var item = hs[h];
    var name = item.name ? (" • " + item.name) : "";
    var liHs = document.createElement("li");
    liHs.innerHTML = "<span>#" + (h+1) + " • " + item.score + " pts" + name + "</span><b>Lv " + item.level + "</b>";
    highScoresEnd.appendChild(liHs);
  }
}

function saveScoreName(name){
  if(!state.lastSessionId) return;
  var trimmed = String(name || "").trim().slice(0, 18);
  if(!trimmed) return;
  var stats = loadLifetimeStats();
  if(!stats || !stats.highScores) return;
  for(var i=0;i<stats.highScores.length;i++){
    if(stats.highScores[i].id === state.lastSessionId){
      stats.highScores[i].name = trimmed;
      break;
    }
  }
  saveLifetimeStats(stats);
  renderHighScores(stats);
  try{ localStorage.setItem("mathsteroid.playerName", trimmed); }catch(e){}
}

function onCorrectHit(label){
  if(warningClip){
    try{
      warningClip.pause();
      warningClip.currentTime = 0;
    }catch(e){
      // ignore stop failures
    }
    warningClip = null;
  }
  state.correct++;
  state.hits++;
  state.streak++;
  playSfx(state, "correct");

  var baseGain = 50 + Math.min(250, state.streak*10);
  var factor = Math.max(state.a, state.b);
  if(isDigitMode()){
    factor = state.b;
  }
  if(isAdditionMode()){
    factor = clamp(Math.round(factor / 10), 2, 30);
  }else{
    factor = clamp(factor, 2, 12);
  }
  var weight = 1 + (factor / 12) * 0.6;
  var gain = Math.round(baseGain * weight);
  state.score += gain;

  state.ddSpeedBonus = clamp(state.ddSpeedBonus + 0.015, 0, 0.35);

  var praise = ["GOOD JOB", "NICE HIT", "CLEAN SHOT", "PERFECT", "ON TARGET"];
  var streakPraise = ["STREAK x5!", "HOT STREAK!", "ON FIRE!", "LASER FOCUS!"];
  if(state.streak > 0 && state.streak % 5 === 0){
    showToast(streakPraise[Math.floor(Math.random() * streakPraise.length)]);
  }else{
    showToast(praise[Math.floor(Math.random() * praise.length)]);
  }

  if(state.correct % 5 === 0){
    state.level++;
  }else{
  }

  syncHud();
  if(isDigitMode()){
    state.digitsLeft = Math.max(0, state.digitsLeft - 1);
    if(state.digitsLeft > 0){
      state.waveId++;
      state.correctDigit = pickCorrectDigit();
      prepareWave();
    }else{
      state.questionsCompleted++;
      if(shouldEndByQuestionLimit()){
        endGame("questions");
        return;
      }
      nextProblem();
    }
  }else{
    state.questionsCompleted++;
    if(shouldEndByQuestionLimit()){
      endGame("questions");
      return;
    }
    nextProblem();
  }
  maybeDropPowerup();
}

function onWrongHit(){
  state.wrong++;
  state.hits++;
  state.streak = 0;
  state.score = Math.max(0, state.score - 60);
  playSfx(state, "wrong_asteroid");

  state.ddSpeedBonus = clamp(state.ddSpeedBonus - 0.02, 0, 0.35);

  syncHud();
  showToast("WRONG TARGET");
}

function endGame(reason){
  if(reason === void 0) reason = "destroyed";
  setDrone(state, false);
  setSoundtrack(state, false);
  state.over = true;
  state.running = false;
  state.paused = false;
  syncHud();

  var elapsed = (performance.now() - state.startTime) / 1000;
  var attempts = state.hits;
  var acc = attempts > 0 ? (state.correct / attempts) : 0;
  var rpm = elapsed > 0 ? (state.correct / elapsed) * 60 : 0;
  var storedName = "";
  try{ storedName = localStorage.getItem("mathsteroid.playerName") || ""; }catch(e){}
  var sessionId = String(Date.now()) + "_" + String(Math.floor(Math.random() * 1000000));
  var session = {
    id: sessionId,
    name: storedName,
    score: state.score,
    correct: state.correct,
    wrong: state.wrong,
    missed: state.missed,
    bestStreak: computeMaxStreak(),
    level: state.level,
    mode: state.questionMode || "classic"
  };
  var lifetime = updateLifetimeStats(session);
  state.lastSessionId = sessionId;

  if(state.questionLimit > 0){
    endSubtitle.textContent = "MISSION COMPLETE. YOU ANSWERED " + state.questionsCompleted + " QUESTIONS IN " + Math.round(elapsed) + "s.";
  }else if(state.timeLimitSec){
    endSubtitle.textContent = "TIME UP. YOU COMPLETED " + state.correct + " PROBLEMS IN " + Math.round(elapsed) + "s.";
  }else{
    endSubtitle.textContent = "OUT OF LIVES. YOU COMPLETED " + state.correct + " PROBLEMS IN " + Math.round(elapsed) + "s.";
  }

  statsList.innerHTML = "";
  var stats = [
    ["SCORE", state.score],
    ["CORRECT", state.correct],
    ["WRONG SHOTS", state.wrong],
    ["MISSED (PASSED)", state.missed],
    ["ACCURACY", String(Math.round(acc*100)) + "%"],
    ["CORRECT PER MIN", rpm.toFixed(1)],
    ["MAX STREAK", computeMaxStreak()],
    ["LEVEL REACHED", state.level]
  ];

  for(var i=0;i<stats.length;i++){
    var k = stats[i][0];
    var v = stats[i][1];
    var row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "10px";
    row.style.padding = "9px 10px";
    row.style.border = "1px solid var(--line)";
    row.style.borderRadius = "12px";
    row.style.background = "rgba(255,255,255,.05)";
    row.style.fontSize = "12px";
    row.innerHTML = '<span style="color: var(--muted);">' + k + '</span><b>' + v + '</b>';
    statsList.appendChild(row);
  }

  accBar.style.width = String(Math.round(acc*100)) + "%";

  weakList.innerHTML = "";
  var misses = Array.from(state.missesByFact.entries())
    .sort(function(a,b){ return b[1] - a[1]; })
    .slice(0, 8);

  if(misses.length === 0){
    var li0 = document.createElement("li");
    li0.innerHTML = '<span style="color: var(--muted);">NO MISSED FACTS RECORDED.</span><b class="pillGood">CLEAN RUN</b>';
    weakList.appendChild(li0);
  }else{
    for(var j=0;j<misses.length;j++){
      var key = misses[j][0];
      var count = misses[j][1];
      var li = document.createElement("li");
      li.innerHTML = "<span>" + key + "</span><b class=\"pillWarn\">" + count + "×</b>";
      weakList.appendChild(li);
    }
  }

  renderHighScores(lifetime);

  if(endNameInput){
    endNameInput.value = storedName;
  }

  if(reason === "destroyed"){
    player.hidden = true;
    playSfx(state, "explosion");
    gameOverFx.active = true;
    gameOverFx.t = 0;
    gameOverFx.reason = "destroyed";
    gameOverFx.shown = false;
    gameOverFx.x = player.x;
    gameOverFx.y = player.y - 8;
    spawnRing(gameOverFx.x, gameOverFx.y, 20);
    spawnParticles(gameOverFx.x, gameOverFx.y, "spark");
    spawnParticles(gameOverFx.x, gameOverFx.y, "smoke");
    kickShake(22, 0.18);
    overlayEnd.classList.remove("show");
  }else{
    overlayEnd.classList.add("show");
  }
}

// ======= Main loop
var lastT = performance.now();
var lastFrameAt = lastT;
var frameAcc = 0;
var frameStep = 1/120;

function ensureLoop(){
  if(performance.now() - lastFrameAt > 220){
    lastT = performance.now();
    requestAnimationFrame(tick);
  }
}

function tick(t){
  lastFrameAt = t;
  var dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  frameAcc += dt;

  try{
    if(frameAcc >= frameStep){
      while(frameAcc >= frameStep){
        update(frameStep);
        frameAcc -= frameStep;
      }
      draw();
    }
  }catch(err){
    console.error(err);
    showToast("RUNTIME ERROR — CHECK CONSOLE");
  }

  requestAnimationFrame(tick);
}

function update(dt){
  var dtReal = dt;
  bg.dt = dt;
  if(state.over){
    updateGameOverFx(dtReal);
    return;
  }
  if(!state.running || state.paused) return;

  if(state.slowMoRemaining > 0){
    state.slowMoRemaining = Math.max(0, state.slowMoRemaining - dtReal);
    dt = dt * (state.slowMoScale || 0.42);
  }

  updateCamera(dtReal);
  updateDashGhosts(dtReal);

  if(state.timeLimitSec > 0){
    var elapsed = (performance.now() - state.startTime) / 1000;
    if(elapsed >= state.timeLimitSec){
      endGame("time");
      return;
    }
  }

  var left  = keys.has("a") || keys.has("arrowleft");
  var right = keys.has("d") || keys.has("arrowright");
  var up    = keys.has("w") || keys.has("arrowup");
  var down  = keys.has("s") || keys.has("arrowdown");

  var bankDir = (right && !left) ? 1 : (left && !right) ? -1 : 0;
  if(bankDir !== 0){
    var accel = (player.bankHold * bankDir < 0) ? 4.2 : 2.2;
    player.bankHold = clamp(player.bankHold + bankDir * dt * accel, -1, 1);
  }else if(player.bankHold !== 0){
    var decay = 3.2;
    var sign = (player.bankHold > 0) ? 1 : -1;
    player.bankHold -= sign * decay * dt;
    if(player.bankHold * sign < 0) player.bankHold = 0;
  }

  var desiredVX = 0;
  var desiredVY = 0;
  if(left)  desiredVX -= player.speed;
  if(right) desiredVX += player.speed;
  if(up)    desiredVY -= player.speed;
  if(down)  desiredVY += player.speed;

  if(desiredVX !== 0 && desiredVY !== 0){
    desiredVX *= 0.70710678;
    desiredVY *= 0.70710678;
  }

  var response = 14;
  var alpha = 1 - Math.exp(-response * dt);
  player.vx += (desiredVX - player.vx) * alpha;
  player.vy += (desiredVY - player.vy) * alpha;

  var r = canvas.getBoundingClientRect();
  var hudH = document.getElementById("hud").getBoundingClientRect().height;
  var topLimit = hudH + 14;
  var bottomLimit = r.height - 18;

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = clamp(player.x, player.w/2 + 10, r.width - player.w/2 - 10);
  player.y = clamp(player.y, topLimit + player.h/2 + 6, bottomLimit - player.h/2);

  player.cooldown = Math.max(0, player.cooldown - dt);

  player.invuln = Math.max(0, player.invuln - dt);
  player.hitFlash = Math.max(0, player.hitFlash - dt*3.6);

  player.recoil = Math.max(0, player.recoil - dt * 9);
  player.flash  = Math.max(0, player.flash  - dt * 12);
  if(player.secondaryCooldown > 0){
    player.secondaryCooldown = Math.max(0, player.secondaryCooldown - dt);
  }
  if(player.blasterTimer > 0){
    player.blasterTimer = Math.max(0, player.blasterTimer - dt);
    if(player.blasterTimer === 0) player.blasterMode = "single";
  }
  if(player.defenseTimer > 0){
    player.defenseTimer = Math.max(0, player.defenseTimer - dt);
    if(player.defenseTimer === 0) player.defenseMode = "none";
  }
  if(player.magnetTimer > 0){
    player.magnetTimer = Math.max(0, player.magnetTimer - dt);
  }
  if(player.lockTimer > 0){
    player.lockTimer = Math.max(0, player.lockTimer - dt);
    if(player.lockTimer === 0) player.lockTargetId = 0;
  }
  if(state.empTimer > 0){
    state.empTimer = Math.max(0, state.empTimer - dt);
  }

  if(keys.has("z")) fire();
  if(keys.has("x")) secondaryFire();
  if(keys.has("c")) shockwave();
  if(player.dashCooldown > 0){
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  }
  if(player.shockwaveCooldown > 0){
    player.shockwaveCooldown = Math.max(0, player.shockwaveCooldown - dt);
  }

  state.spawnTimer -= dt;
  if(state.spawnTimer <= 0){
    spawnOneFromWave();
    if(state.level >= 5 && Math.random() < 0.35) spawnDecoyOnly();
    state.spawnTimer = computeSpawnInterval(state);
  }

  for(var bi=bullets.length-1; bi>=0; bi--){
    var b = bullets[bi];
    if(player.lockTimer > 0 && state.correctAsteroidId){
      var target = null;
      for(var ti=0; ti<asteroids.length; ti++){
        if(asteroids[ti].id === state.correctAsteroidId){
          target = asteroids[ti];
          break;
        }
      }
      if(target){
        var dxT = target.x - b.x;
        var dyT = target.y - b.y;
        var distT = Math.max(1, Math.hypot(dxT, dyT));
        var spd = Math.max(200, Math.hypot(b.vx || 0, b.vy || 0));
        b.vx += (dxT / distT) * spd * 0.6 * dt;
        b.vy += (dyT / distT) * spd * 0.6 * dt;
      }
    }
    b.y += b.vy * dt;
    if(b.vx) b.x += b.vx * dt;
    if(b.y < -20) bullets.splice(bi,1);
  }

  updateParticles(dt);
  updateRings(dt);

  emitDamageSmoke(dt);

  for(var pi=powerups.length-1; pi>=0; pi--){
    var p = powerups[pi];
    if(player.magnetTimer > 0){
      var dxm = player.x - p.x;
      var dym = (player.y - 20) - p.y;
      var dist = Math.max(1, Math.hypot(dxm, dym));
      var pull = clamp(320 / dist, 0, 6);
      p.x += (dxm / dist) * pull * dt * 120;
      p.y += (dym / dist) * pull * dt * 120;
    }
    p.y += p.vy * dt;
    var dxp = p.x - player.x;
    var dyp = p.y - player.y;
    if(Math.hypot(dxp, dyp) < p.r + 18){
      applyPowerup(p);
      powerups.splice(pi,1);
      continue;
    }
    if(p.y - p.r > r.height + 40) powerups.splice(pi,1);
  }

  var tNow = performance.now() * 0.001;
  for(var ai=asteroids.length-1; ai>=0; ai--){
    var a = asteroids[ai];
    var empScale = state.empTimer > 0 ? 0.35 : 1;
    a.y += a.vy * dt * empScale;
    a.x += a.vx * dt;
    if(a.baseVy != null){
      a.vy += (a.baseVy - a.vy) * Math.min(1, dt * 0.55);
    }
    if(a.driftAmp){
      a.vx += Math.sin(a.driftPhase + tNow * a.driftRate) * a.driftAmp * dt;
    }
    a.vx *= (1 - Math.min(1, dt * 0.35));
    var bound = a.r + 8;
    if(a.x < bound){
      a.x = bound;
      a.vx = Math.abs(a.vx) * 0.6;
    }else if(a.x > r.width - bound){
      a.x = r.width - bound;
      a.vx = -Math.abs(a.vx) * 0.6;
    }
    a.rot = (a.rot || 0) + (a.spin || 0) * dt;
    if(a.isCorrect && a.waveId === state.waveId && !a.warned && a.y > r.height * 0.75){
      a.warned = true;
      warningClip = playSfx(state, "warning");
    }

    var dx = a.x - player.x;
    var dy = a.y - (player.y - 4);
    var dist = Math.hypot(dx,dy);
        if(dist < a.r + 16){
          if(player.invuln <= 0){
            if(a.isCorrect && a.waveId === state.waveId){
              state.correctInPlay = false;
              state.correctAsteroidId = 0;
            }

            kickShake(18, 0.14);
            var dmgHit = (a.ghost || a.label === null) ? 0.18 : 0.30;
            if(player.defenseMode === "armor") dmgHit *= 0.6;

            if(player.defenseMode === "shield"){
              impactDebris(player.x, player.y - 8);
              playSfx(state, "impact", 0.35);
              player.hitFlash = 1;
              player.invuln = 0.35;
              state.streak = 0;
              syncHud();
              showToast("SHIELD BLOCK");
            }else{
              impactShipHit(player.x, player.y - 10);
              playSfx(state, "crash", 0.55);
              player.hitFlash = 1;
              player.invuln = 0.45;

              player.hull = clamp(player.hull - dmgHit, 0, 1);
              state.streak = 0;
              syncHud();

              if(player.hull <= 0){
                player.hull = 0;
                syncHud();
                endGame("destroyed");
                return;
              }else{
                playSfx(state, "ship_damaged");
                showToast("HULL DAMAGED");
              }
            }
          }

          asteroids.splice(ai,1);
          continue;
        }

    if(a.y - a.r > r.height + 40){
  if(a.isCorrect && a.waveId === state.waveId){
        state.missed++;
        state.correctInPlay = false;
        state.correctAsteroidId = 0;
        recordFactMiss(state.a, state.b);
        state.streak = 0;
        state.ddSpeedBonus = clamp(state.ddSpeedBonus - 0.02, 0, 0.35);
        syncHud();
        playSfx(state, "missed_answer");
        loseLife("CORRECT ANSWER ESCAPED");
        retireWave(state.waveId);
        if(state.lives > 0){
          state.questionsCompleted++;
          if(shouldEndByQuestionLimit()){
            endGame("questions");
            return;
          }
          nextProblem();
        }
      }
      asteroids.splice(ai,1);
    }
  }

  resolveAsteroidCollisions();

  for(var ai2=asteroids.length-1; ai2>=0; ai2--){
    var a2 = asteroids[ai2];
    if(a2.hit) continue;

    for(var bj=bullets.length-1; bj>=0; bj--){
      var bb = bullets[bj];
      var ddx = a2.x - bb.x;
      var ddy = a2.y - bb.y;
      if(ddx*ddx + ddy*ddy <= (a2.r + bb.r) * (a2.r + bb.r)){
        if(bb.pierce && bb.pierce > 0){
          bb.pierce -= 1;
        }else{
          bullets.splice(bj,1);
        }
        a2.hit = true;

        if(a2.ghost || a2.label === null){
          state.score += 2;
          impactDebris(a2.x, a2.y);
          playSfx(state, "impact_thud", 0.4);
          asteroids.splice(ai2,1);
          break;
        }

        if(a2.isCorrect && a2.waveId === state.waveId){
          var wid = state.waveId;
          state.correctInPlay = false;
          state.correctAsteroidId = 0;

          impactCorrect(a2.x, a2.y, a2.r);

          asteroids.splice(ai2,1);
          retireWave(wid);
          bestStreak = Math.max(bestStreak, state.streak + 1);
          onCorrectHit(a2.label);
        }else{
          recordFactMiss(state.a, state.b);
          impactWrong(a2.x, a2.y);
          onWrongHit();
          asteroids.splice(ai2,1);
        }
        break;
      }
    }
  }

  powerupManager.update();
}

function resolveAsteroidCollisions(){
  if(asteroids.length < 2) return;
  for(var i=0; i<asteroids.length; i++){
    var a = asteroids[i];
    if(a.ghost) continue;
    for(var j=i+1; j<asteroids.length; j++){
      var b = asteroids[j];
      if(b.ghost) continue;
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var dist = Math.hypot(dx, dy);
      var minDist = a.r + b.r + 2;
      if(dist <= 0 || dist >= minDist) continue;
      var nx = dx / dist;
      var ny = dy / dist;
      var overlap = minDist - dist;
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      var rvx = (b.vx || 0) - (a.vx || 0);
      var rvy = (b.vy || 0) - (a.vy || 0);
      var relVel = rvx * nx + rvy * ny;
      if(relVel < 0){
        var m1 = a.r * a.r;
        var m2 = b.r * b.r;
        var impulse = -(0.85) * relVel / ((1 / m1) + (1 / m2));
        var ix = impulse * nx;
        var iy = impulse * ny;
        a.vx = (a.vx || 0) - ix / m1;
        a.vy = (a.vy || 0) - iy / m1;
        b.vx = (b.vx || 0) + ix / m2;
        b.vy = (b.vy || 0) + iy / m2;
      }
    }
  }
}

function updateGameOverFx(dt){
  if(!gameOverFx.active) return;
  gameOverFx.t += dt;
  updateCamera(dt);
  updateParticles(dt);
  updateRings(dt);

  if(!gameOverFx.shown && gameOverFx.t > 2.8){
    overlayEnd.classList.add("show");
    gameOverFx.shown = true;
  }

  if(gameOverFx.t > 5.0){
    gameOverFx.active = false;
  }
}

// ======= Drawing
function draw(){
  var w = view.w;
  var h = view.h;

  ctx.clearRect(0,0,w,h);
  if(SHOW_STARS) drawStars(w,h);

  if(state.paused && state.running){
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(0,0,w,h);
  }

  ctx.save();
  ctx.translate(cam.x || 0, cam.y || 0);

  for(var i=0;i<asteroids.length;i++) drawAsteroid(asteroids[i]);
  drawPowerups();
  drawRings();
  drawParticles();
  drawBullets();
  drawDashGhosts();

  drawShip();

  ctx.restore();

  if(gameOverFx.active && gameOverFx.reason === "destroyed"){
    ctx.save();
    var t = gameOverFx.t;
    var alpha = clamp((t - 0.6) / 1.4, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255,77,109,.92)";
    ctx.font = "900 " + Math.max(28, Math.min(64, w * 0.06)) + "px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(255,77,109,.35)";
    ctx.shadowBlur = 12;
    ctx.fillText("SHIP DESTROYED", w/2, h/2 - 12);
    ctx.restore();
  }

  if(!state.over){
    ctx.save();
    var size = Math.max(28, Math.min(64, w * 0.06));
    ctx.fillStyle = "rgba(232,236,255,.95)";
    ctx.font = "900 " + size + "px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0,229,255,.35)";
    ctx.shadowBlur = 8;
    var op = isAdditionMode() ? "+" : "×";
    ctx.fillText(state.a + " " + op + " " + state.b + " = ?", w/2, view.hudH + 18);
    ctx.restore();

    var hullRatio = clamp(player.hull, 0, 1);
    var barW = Math.min(260, w * 0.36);
    var barH = 10;
    var barX = w / 2 - barW / 2;
    var barY = view.hudH + 18 + size + 10;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.strokeStyle = "rgba(255,255,255,.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(28,220,120,.9)";
    ctx.shadowColor = "rgba(28,220,120,.35)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hullRatio, barH, 8);
    ctx.fill();
    ctx.restore();
  }

  if(state.paused && state.running){
    ctx.save();
    ctx.fillStyle = "rgba(232,236,255,.92)";
    ctx.font = "700 20px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", w/2, h/2 - 6);
    ctx.font = "14px Orbitron, sans-serif";
    ctx.fillStyle = "rgba(232,236,255,.72)";
    ctx.fillText("PRESS P TO RESUME", w/2, h/2 + 18);
    ctx.restore();
  }
}

function drawPowerups(){
  if(!powerups.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(var i=0;i<powerups.length;i++){
    var p = powerups[i];
    var color = getPowerupColor(p);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = 0.9;
    var glow = ctx.createRadialGradient(0,0,2,0,0,p.r + 10);
    glow.addColorStop(0, color.replace("0.7", "0.35"));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 8, 0, Math.PI*2);
    ctx.fill();

    ctx.globalAlpha = 0.95;
    drawPowerupIcon(p, color);
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function getPowerupColor(p){
  if(p.group === "defense"){
    return p.type === "shield" ? "rgba(193,216,47,.7)" : "rgba(255,77,109,.7)";
  }
  if(p.group === "secondary"){
    return p.type === "repair" ? "rgba(0,229,255,.7)"
      : p.type === "time" ? "rgba(175,0,111,.7)"
      : p.type === "magnet" ? "rgba(255,221,0,.7)"
      : p.type === "emp" ? "rgba(175,0,111,.7)"
      : "rgba(193,216,47,.7)";
  }
  if(p.type === "dual") return "rgba(0,229,255,.7)";
  if(p.type === "laser") return "rgba(0,229,255,.7)";
  if(p.type === "fire") return "rgba(255,77,109,.7)";
  if(p.type === "ice") return "rgba(180,220,255,.8)";
  if(p.type === "electric") return "rgba(255,221,0,.8)";
  if(p.type === "pierce") return "rgba(175,0,111,.7)";
  if(p.type === "plasma") return "rgba(193,216,47,.7)";
  if(p.type === "rail") return "rgba(0,229,255,.7)";
  return "rgba(255,221,0,.7)";
}

function drawPowerupIcon(p, color){
  ctx.strokeStyle = "rgba(255,255,255,.7)";
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if(p.group === "offense"){
    if(p.type === "ice"){
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(6, 10);
      ctx.lineTo(-6, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    if(p.type === "laser" || p.type === "rail"){
      ctx.beginPath();
      ctx.rect(-3, -14, 6, 28);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if(p.type === "dual"){
      ctx.beginPath();
      ctx.rect(-10, -10, 6, 20);
      ctx.rect(4, -10, 6, 20);
      ctx.fill();
      ctx.stroke();
      return;
    }
    if(p.type === "fire"){
      ctx.beginPath();
      ctx.arc(0, 2, 9, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(6, -2);
      ctx.lineTo(-6, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }
    if(p.type === "electric"){
      ctx.beginPath();
      ctx.moveTo(-6, -12);
      ctx.lineTo(2, -4);
      ctx.lineTo(-2, 2);
      ctx.lineTo(6, 12);
      ctx.stroke();
      return;
    }
    if(p.type === "pierce"){
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.stroke();
      return;
    }
    if(p.type === "plasma"){
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI*2);
      ctx.fill();
      return;
    }
  }

  if(p.group === "defense"){
    if(p.type === "shield"){
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, -4);
      ctx.lineTo(6, 12);
      ctx.lineTo(-6, 12);
      ctx.lineTo(-10, -4);
      ctx.closePath();
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, -6);
    ctx.lineTo(10, 6);
    ctx.lineTo(0, 12);
    ctx.lineTo(-10, 6);
    ctx.lineTo(-10, -6);
    ctx.closePath();
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI*2);
  ctx.fill();
}

function drawBullets(){
  if(!bullets.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(var i=0;i<bullets.length;i++){
    var b = bullets[i];
    function drawTrail(color, len, width, alpha){
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(b.x - width, b.y);
      ctx.lineTo(b.x, b.y + len);
      ctx.lineTo(b.x + width, b.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if(b.kind === "laser"){
      drawTrail("rgba(0,229,255,.75)", (b.len || 18) * 1.1, (b.w || 3) + 6, 0.6);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "rgba(0,229,255,.9)";
      ctx.lineWidth = b.w || 3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x, b.y - (b.len || 18));
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(255,255,255,.7)";
      ctx.lineWidth = (b.w || 3) + 2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x, b.y - (b.len || 18));
      ctx.stroke();
      continue;
    }

    if(b.kind === "rail"){
      drawTrail("rgba(0,229,255,.7)", (b.len || 34) * 0.95, (b.w || 4) + 7, 0.55);
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = "rgba(0,229,255,.95)";
      ctx.lineWidth = b.w || 4;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x, b.y - (b.len || 34));
      ctx.stroke();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = "rgba(255,255,255,.7)";
      ctx.lineWidth = (b.w || 4) + 3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x, b.y - (b.len || 34));
      ctx.stroke();
      continue;
    }

    if(b.kind === "fire"){
      drawTrail("rgba(255,77,109,.75)", b.r * 7.5, b.r * 1.6, 0.6);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(255,77,109,.95)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = "rgba(255,221,0,.75)";
      ctx.beginPath();
      ctx.arc(b.x - 1, b.y + 1, b.r * 0.55, 0, Math.PI*2);
      ctx.fill();
      continue;
    }

    if(b.kind === "plasma"){
      drawTrail("rgba(0,229,255,.7)", b.r * 7, b.r * 1.6, 0.55);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(193,216,47,.9)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "rgba(0,229,255,.65)";
      ctx.beginPath();
      ctx.arc(b.x - 1, b.y + 1, b.r * 0.6, 0, Math.PI*2);
      ctx.fill();
      continue;
    }

    if(b.kind === "ice"){
      drawTrail("rgba(190,230,255,.8)", b.r * 8, b.r * 1.4, 0.6);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(190,230,255,.95)";
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - b.r * 2.3);
      ctx.lineTo(b.x - b.r * 0.65, b.y + b.r * 1.6);
      ctx.lineTo(b.x + b.r * 0.65, b.y + b.r * 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "rgba(255,255,255,.65)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - b.r * 1.9);
      ctx.lineTo(b.x, b.y + b.r * 1.2);
      ctx.stroke();
      continue;
    }

    if(b.kind === "electric"){
      drawTrail("rgba(0,229,255,.75)", 28, 4, 0.55);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "rgba(0,229,255,.95)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(b.x - 2, b.y + 10);
      ctx.lineTo(b.x + 3, b.y + 4);
      ctx.lineTo(b.x - 3, b.y - 2);
      ctx.lineTo(b.x + 2, b.y - 12);
      ctx.stroke();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = "rgba(0,229,255,.4)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(b.x - 2, b.y + 10);
      ctx.lineTo(b.x + 3, b.y + 4);
      ctx.lineTo(b.x - 3, b.y - 2);
      ctx.lineTo(b.x + 2, b.y - 12);
      ctx.stroke();
      continue;
    }

    if(b.kind === "pierce"){
      drawTrail("rgba(175,0,111,.8)", b.r * 6.5, 4.2, 0.55);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "rgba(175,0,111,.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI*2);
      ctx.stroke();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(255,221,0,.7)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.7, 0, Math.PI*2);
      ctx.fill();
      continue;
    }

    drawTrail("rgba(255,221,0,.85)", b.r * 6.5, 4, 0.6);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,221,0,.95)";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawAsteroid(a){
  var ring = (!a.ghost && a.waveId === state.waveId && a.label !== null);
  var rot = a.rot || 0;

  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(rot);

  ctx.beginPath();
  var points = 10;
  var wob = 0.22;
  for(var i=0;i<=points;i++){
    var ang = (i/points) * Math.PI*2;
    var rr = a.r * (1 - wob/2 + Math.sin(i*2.1 + a.seed) * wob);
    var px = Math.cos(ang) * rr;
    var py = Math.sin(ang) * rr;
    if(i===0) ctx.moveTo(px,py);
    else ctx.lineTo(px,py);
  }
  ctx.closePath();

  ctx.fillStyle = a.ghost ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.12)";
  ctx.fill();

  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = "rgba(232,236,255,.14)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, a.r*0.96, -0.3, Math.PI*2 - 0.9);
  ctx.stroke();

  ctx.globalAlpha = 0.65;
  ctx.fillStyle = "rgba(0,0,0,.22)";
  for(var c=0;c<3;c++){
    var cx = Math.sin(a.seed*3.1 + c*1.7) * a.r*0.42;
    var cy = Math.cos(a.seed*2.4 + c*2.1) * a.r*0.34;
    var cr = a.r*(0.10 + (c%3)*0.04);
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  if(ring){
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r + 2, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  if(player.lockTimer > 0 && a.id === state.correctAsteroidId && a.waveId === state.waveId){
    ctx.save();
    ctx.strokeStyle = "rgba(0,229,255,.65)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.r + 8, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  if(a.label !== null){
    ctx.save();
    ctx.fillStyle = "rgba(232,236,255,.90)";
    var size = Math.max(14, Math.min(22, a.r*0.7));
    ctx.font = "700 " + size + "px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(a.label), a.x, a.y);
    ctx.restore();
  }
}

function drawShip(){
  if(player.hidden) return;
  renderShip(player.x, player.y, 1, false);
}

function drawDashGhosts(){
  if(!dashGhosts.length) return;
  for(var i=0;i<dashGhosts.length;i++){
    var g = dashGhosts[i];
    renderShip(g.x, g.y, g.a, true, g.vx, g.vy, { thrustFocus: g.thrustFocus });
  }
}

function spawnDashGhosts(sx, sy, ex, ey, dirX, dirY){
  var count = 5;
  var baseAlpha = 0.7;
  var thrustFocus = dirY < -0.2;
  for(var i=1;i<=count;i++){
    var t = i / (count + 1);
    dashGhosts.push({
      x: sx + (ex - sx) * t,
      y: sy + (ey - sy) * t,
      vx: dirX * player.speed,
      vy: dirY * player.speed,
      life: 0.32,
      max: 0.32,
      a: baseAlpha * (1 - t) + 0.08,
      thrustFocus: thrustFocus
    });
  }
  if(dashGhosts.length > 24) dashGhosts.splice(0, dashGhosts.length - 24);
}

function updateDashGhosts(dt){
  for(var i=dashGhosts.length-1; i>=0; i--){
    var g = dashGhosts[i];
    g.life -= dt;
    if(g.life <= 0){
      dashGhosts.splice(i,1);
      continue;
    }
    g.a = Math.max(0, (g.life / g.max)) * 0.8;
  }
}

function renderShip(x, y, alpha, ghost, overrideVX, overrideVY, ghostStyle){
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  var dmg = 1 - clamp(player.hull, 0, 1);

  var useVX = (typeof overrideVX === "number") ? overrideVX : player.vx;
  var useVY = (typeof overrideVY === "number") ? overrideVY : player.vy;
  var vxN = clamp(useVX / player.speed, -1, 1);
  var vyN = clamp(useVY / player.speed, -1, 1);

  var bank = (typeof player.bankHold === "number") ? player.bankHold : vxN;
  var turn = bank * 0.03;
  var tilt = 0;
  var squashX = 1 - Math.abs(bank) * 0.06;
  var bob = Math.sin(performance.now()*0.01) * 0.7;

  var speedMag = Math.min(1, Math.hypot(useVX, useVY) / (player.speed || 1));
  var t = performance.now();

  ctx.translate(x, y + bob);
  var scaleMap = {
    am2: 0.9,
    mk7: 0.82,
    fizard: 0.82,
    classic: 0.82,
    ember: 0.82,
    azure: 0.82,
    spire: 0.82
  };
  var scale = scaleMap[shipType] || 0.82;
  ctx.scale(scale, scale);

  if(!isFinite(x) || !isFinite(y)) { ctx.restore(); return; }
  var swayAmp = 0.008 + speedMag * 0.01;
  var sway = Math.sin(t * 0.004) * swayAmp;
  var shear = 0;
  ctx.rotate(turn);
  ctx.transform(1, 0, shear, 1, 0, 0);
  ctx.scale(squashX * (1 + sway), 1 - sway * 0.6);

  if(player.defenseMode === "armor" && !ghost){
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.shadowColor = "rgba(220,230,245,.85)";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "rgba(220,230,245,.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 3, 32, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  if(player.defenseMode === "shield" && !ghost){
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "rgba(0,229,255,.75)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, -26, 30, Math.PI*1.15, Math.PI*1.85);
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "rgba(0,229,255,.35)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, -26, 30, Math.PI*1.15, Math.PI*1.85);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(0, 3, 30, 0, Math.PI*2);
  ctx.fillStyle = "rgba(0,229,255,.06)";
  ctx.fill();
  ctx.restore();

  ctx.save();
  var shipType = player.shipType || "mk7";
  var palettes = {
    mk7: {
      body: "rgba(30,200,140,.95)",
      wing: "rgba(12,140,120,.95)",
      accent: "rgba(255,230,120,.95)",
      highlight: "rgba(255,80,200,.9)",
      canopy: "rgba(40,255,210,.85)",
      canopyStroke: "rgba(20,210,190,.9)",
      thruster: "rgba(18,22,32,.85)",
      flame: "rgba(255,190,80,.8)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(220,255,245,.35)",
      glow: "rgba(80,255,200,.35)"
    },
    fizard: {
      body: "rgba(90,180,255,.95)",
      wing: "rgba(45,120,220,.92)",
      accent: "rgba(255,190,100,.95)",
      highlight: "rgba(120,255,220,.9)",
      canopy: "rgba(120,240,255,.9)",
      canopyStroke: "rgba(60,200,220,.9)",
      thruster: "rgba(18,22,32,.85)",
      flame: "rgba(255,200,120,.85)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(210,235,255,.35)",
      glow: "rgba(120,200,255,.35)"
    },
    classic: {
      body: "rgba(255,180,60,.95)",
      wing: "rgba(200,120,40,.92)",
      accent: "rgba(255,80,200,.9)",
      highlight: "rgba(255,230,120,.9)",
      canopy: "rgba(90,240,230,.85)",
      canopyStroke: "rgba(50,200,190,.85)",
      thruster: "rgba(22,18,28,.85)",
      flame: "rgba(255,140,90,.85)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(255,235,200,.35)",
      glow: "rgba(255,150,80,.35)"
    },
    ember: {
      body: "rgba(255,80,190,.96)",
      wing: "rgba(160,40,130,.95)",
      accent: "rgba(255,230,90,.95)",
      highlight: "rgba(60,255,230,.85)",
      canopy: "rgba(120,255,230,.85)",
      canopyStroke: "rgba(60,220,200,.9)",
      thruster: "rgba(22,18,28,.85)",
      flame: "rgba(255,200,90,.85)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(255,230,250,.35)",
      glow: "rgba(255,120,210,.35)"
    },
    azure: {
      body: "rgba(70,180,255,.95)",
      wing: "rgba(30,130,200,.92)",
      accent: "rgba(255,240,120,.95)",
      highlight: "rgba(90,255,230,.9)",
      canopy: "rgba(255,160,70,.9)",
      canopyStroke: "rgba(220,120,60,.9)",
      thruster: "rgba(22,26,36,.85)",
      flame: "rgba(255,190,90,.85)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(210,245,255,.35)",
      glow: "rgba(120,200,255,.35)"
    },
    spire: {
      body: "rgba(120,90,255,.95)",
      wing: "rgba(80,60,220,.92)",
      accent: "rgba(255,230,90,.95)",
      highlight: "rgba(255,80,200,.9)",
      canopy: "rgba(90,255,240,.85)",
      canopyStroke: "rgba(60,220,210,.9)",
      thruster: "rgba(22,18,32,.85)",
      flame: "rgba(255,180,110,.85)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(230,220,255,.35)",
      glow: "rgba(150,120,255,.35)"
    },
    am2: {
      body: "rgba(235,190,210,.95)",
      wing: "rgba(190,130,170,.92)",
      accent: "rgba(255,110,130,.95)",
      highlight: "rgba(120,90,255,.9)",
      canopy: "rgba(180,90,200,.9)",
      canopyStroke: "rgba(150,70,180,.9)",
      thruster: "rgba(20,24,36,.85)",
      flame: "rgba(120,220,255,.9)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(255,235,245,.35)",
      glow: "rgba(200,150,190,.35)"
    }
  };
  var colors = palettes[shipType] || palettes.mk7;
  ctx.shadowColor = colors.glow;
  ctx.shadowBlur = 12 * (1 - dmg*0.55);

  var wingLeft = [-16, -8, -58, 12, -64, 22, -58, 30, -24, 28, -8, 6];
  var wingRight = [16, -8, 58, 12, 64, 22, 58, 30, 24, 28, 8, 6];
  var bodyOuter = [0, -34, 18, -10, 26, 6, 22, 22, 14, 34, -14, 34, -22, 22, -26, 6, -18, -10];
  var bodyInner = [0, -24, 10, -2, 12, 20, 0, 30, -12, 20, -10, -2];
  var stripe1 = { x:-26, y:-2, w:52, h:4 };
  var stripe2 = { x:-20, y:-12, w:40, h:3 };
  var nose = [0, -38, 10, -18, -10, -18];
  var gun = {
    xLeft: -42,
    xRight: 32,
    y: 2,
    w: 10,
    h: 16,
    barrelLeft: -40,
    barrelRight: 36,
    barrelY: -24,
    barrelW: 3,
    barrelH: 14,
    centerX: -3,
    centerY: -24,
    centerW: 6,
    centerH: 18
  };
  var useAzure = shipType === "azure";
  if(useAzure){
    wingLeft = [-14, 2, -52, 18, -58, 32, -52, 36, -22, 30, -8, 10];
    wingRight = [14, 2, 52, 18, 58, 32, 52, 36, 22, 30, 8, 10];
    bodyOuter = [0, -32, 14, -6, 20, 12, 18, 24, 12, 34, -12, 34, -18, 24, -20, 12, -14, -6];
    bodyInner = [0, -22, 8, -2, 10, 20, 0, 30, -10, 20, -8, -2];
    stripe1 = { x:-22, y:-2, w:44, h:4 };
    stripe2 = { x:-16, y:-12, w:32, h:3 };
    nose = [0, -34, 9, -18, -9, -18];
    gun = {
      xLeft: -46,
      xRight: 36,
      y: 6,
      w: 10,
      h: 18,
      barrelLeft: -42,
      barrelRight: 40,
      barrelY: -28,
      barrelW: 3,
      barrelH: 20,
      centerX: -3,
      centerY: -28,
      centerW: 6,
      centerH: 20
    };
  }else if(shipType === "fizard"){
    wingLeft = [-12, -10, -40, 6, -46, 14, -40, 20, -18, 18, -6, 6];
    wingRight = [12, -10, 40, 6, 46, 14, 40, 20, 18, 18, 6, 6];
    bodyOuter = [0, -38, 14, -12, 20, 4, 18, 18, 10, 32, -10, 32, -18, 18, -20, 4, -14, -12];
    bodyInner = [0, -26, 8, -6, 10, 18, 0, 28, -10, 18, -8, -6];
    stripe1 = { x:-20, y:-2, w:40, h:4 };
    stripe2 = { x:-14, y:-12, w:28, h:3 };
    nose = [0, -40, 8, -22, -8, -22];
    gun = {
      xLeft: -34,
      xRight: 24,
      y: -2,
      w: 9,
      h: 14,
      barrelLeft: -32,
      barrelRight: 28,
      barrelY: -22,
      barrelW: 3,
      barrelH: 12,
      centerX: -3,
      centerY: -24,
      centerW: 6,
      centerH: 16
    };
  }else if(shipType === "classic"){
    wingLeft = [-14, -8, -40, 8, -46, 18, -40, 26, -22, 24, -8, 6];
    wingRight = [14, -8, 40, 8, 46, 18, 40, 26, 22, 24, 8, 6];
  }else if(shipType === "spire"){
    wingLeft = [-9, 4, -40, 18, -44, 30, -40, 34, -14, 26, -6, 12];
    wingRight = [9, 4, 40, 18, 44, 30, 40, 34, 14, 26, 6, 12];
    bodyOuter = [0, -40, 12, -10, 20, 10, 18, 24, 8, 36, -8, 36, -18, 24, -20, 10, -12, -10];
    bodyInner = [0, -26, 6, -4, 8, 18, 0, 30, -8, 18, -6, -4];
    stripe1 = { x:-20, y:-2, w:40, h:4 };
    stripe2 = { x:-16, y:-10, w:32, h:3 };
    nose = [0, -34, 12, -22, -12, -22];
    gun = {
      xLeft: -34,
      xRight: 22,
      y: 8,
      w: 10,
      h: 18,
      barrelLeft: -30,
      barrelRight: 26,
      barrelY: -28,
      barrelW: 3,
      barrelH: 22,
      centerX: -3,
      centerY: -28,
      centerW: 6,
      centerH: 22
    };
  }else if(shipType === "am2"){
    wingLeft = [-8, -6, -30, 2, -38, 12, -30, 18, -8, 18, -4, 6];
    wingRight = [8, -6, 30, 2, 38, 12, 30, 18, 8, 18, 4, 6];
    bodyOuter = [0, -38, 10, -8, 18, 12, 16, 26, 8, 36, -8, 36, -16, 26, -18, 12, -10, -8];
    bodyInner = [0, -28, 6, -4, 10, 20, 0, 30, -10, 20, -6, -4];
    stripe1 = { x:-12, y:-2, w:24, h:6 };
    stripe2 = { x:-10, y:-10, w:20, h:4 };
    nose = [0, -36, 8, -18, -8, -18];
    gun = {
      xLeft: -16,
      xRight: 6,
      y: 10,
      w: 8,
      h: 14,
      barrelLeft: -14,
      barrelRight: 10,
      barrelY: -24,
      barrelW: 2.5,
      barrelH: 14,
      centerX: -2,
      centerY: -24,
      centerW: 4,
      centerH: 16
    };
  }

  ctx.fillStyle = colors.wing;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 2;

  function drawWing(points){
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for(var wi=2; wi<points.length; wi+=2){
      ctx.lineTo(points[wi], points[wi+1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ghostStyle = ghostStyle || {};
  var leftScale = clamp(1 + bank * 0.5, 0.5, 1.5);
  var rightScale = clamp(1 - bank * 0.5, 0.5, 1.5);
  var ghostBodyAlpha = (ghost && ghostStyle.thrustFocus) ? 0.35 : 1;
  var ghostFlameBoost = (ghost && ghostStyle.thrustFocus) ? 1.45 : 1;

  ctx.save();
  ctx.globalAlpha *= ghostBodyAlpha;
  ctx.save();
  ctx.translate(-10, 0);
  ctx.scale(leftScale, 1);
  ctx.translate(10, 0);
  drawWing(wingLeft);
  ctx.restore();

  ctx.save();
  ctx.translate(10, 0);
  ctx.scale(rightScale, 1);
  ctx.translate(-10, 0);
  drawWing(wingRight);
  ctx.restore();

  function drawHull(){
    ctx.fillStyle = colors.body;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(bodyOuter[0], bodyOuter[1]);
    for(var bi=2; bi<bodyOuter.length; bi+=2){
      ctx.lineTo(bodyOuter[bi], bodyOuter[bi+1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bodyInner[0], bodyInner[1]);
    for(var bj=2; bj<bodyInner.length; bj+=2){
      ctx.lineTo(bodyInner[bj], bodyInner[bj+1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(-200, -200, 200, 400);
  ctx.clip();
  ctx.translate(-10, 0);
  ctx.scale(leftScale, 1);
  ctx.translate(10, 0);
  drawHull();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -200, 200, 400);
  ctx.clip();
  ctx.translate(10, 0);
  ctx.scale(rightScale, 1);
  ctx.translate(-10, 0);
  drawHull();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = colors.highlight || colors.accent;
  ctx.fillRect(stripe1.x, stripe1.y, stripe1.w, stripe1.h);
  ctx.fillRect(stripe2.x, stripe2.y, stripe2.w, stripe2.h);
  ctx.beginPath();
  ctx.moveTo(nose[0], nose[1]);
  ctx.lineTo(nose[2], nose[3]);
  ctx.lineTo(nose[4], nose[5]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  function drawCanopy(){
    ctx.fillStyle = colors.canopy;
    ctx.strokeStyle = colors.canopyStroke;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, -12);
    ctx.quadraticCurveTo(0, -20, 8, -12);
    ctx.lineTo(10, 8);
    ctx.quadraticCurveTo(0, 16, -10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(-200, -200, 200, 400);
  ctx.clip();
  ctx.translate(-8, 0);
  ctx.scale(leftScale, 1);
  ctx.translate(8, 0);
  drawCanopy();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, -200, 200, 400);
  ctx.clip();
  ctx.translate(8, 0);
  ctx.scale(rightScale, 1);
  ctx.translate(-8, 0);
  drawCanopy();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = colors.icon || colors.accent;
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.lineTo(6, 16);
  ctx.lineTo(0, 26);
  ctx.lineTo(-6, 16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  var blink = (Math.sin(t * 0.006) + 1) / 2;
  ctx.save();
  ctx.globalAlpha = 0.25 + blink * 0.55;
  ctx.fillStyle = colors.highlight || colors.accent;
  ctx.beginPath();
  ctx.arc(-24, 4, 2.2, 0, Math.PI*2);
  ctx.arc(24, 4, 2.2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  var isAm2 = shipType === "am2";
  if(isAm2){
    ctx.save();
    ctx.fillStyle = colors.highlight || colors.accent;
    ctx.fillRect(-3, -6, 6, 26);
    ctx.fillRect(-8, -12, 16, 4);
    ctx.beginPath();
    ctx.moveTo(-18, 14);
    ctx.lineTo(-34, 22);
    ctx.lineTo(-16, 24);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, 14);
    ctx.lineTo(34, 22);
    ctx.lineTo(16, 24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if(dmg > 0.02){
    ctx.save();
    ctx.globalAlpha = clamp(dmg * 0.95, 0, 0.95);
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath();
    ctx.ellipse(-5, 6, 10 + dmg*10, 6 + dmg*7, -0.4, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, 2, 7 + dmg*7, 4 + dmg*5, 0.3, 0, Math.PI*2);
    ctx.fill();

    ctx.globalAlpha = clamp(dmg * 0.65, 0, 0.7);
    ctx.strokeStyle = "rgba(232,236,255,.22)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.lineTo(-8, 2);
    ctx.lineTo(-4, 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, -4);
    ctx.lineTo(9, 4);
    ctx.lineTo(6, 12);
    ctx.stroke();
    ctx.restore();
  }

  if(player.hitFlash > 0 && !ghost){
    ctx.save();
    ctx.globalAlpha = clamp(player.hitFlash, 0, 1) * 0.55;
    ctx.strokeStyle = "rgba(255,77,109,.9)";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(16, -6);
    ctx.lineTo(13, 16);
    ctx.lineTo(0, 24);
    ctx.lineTo(-13, 16);
    ctx.lineTo(-16, -6);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  ctx.shadowBlur = 0;

  var recoil = ghost ? 0 : (player.recoil || 0);
  var recoilShift = recoil * 4;

  ctx.fillStyle = colors.accent;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1.6;

  var inset = 3;
  function drawSideGun(xLeft, barrelX){
    ctx.beginPath();
    ctx.moveTo(xLeft, gun.y);
    ctx.lineTo(xLeft + gun.w, gun.y);
    ctx.lineTo(xLeft + gun.w - inset, gun.y + gun.h);
    ctx.lineTo(xLeft + inset, gun.y + gun.h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(barrelX, gun.barrelY - recoilShift, gun.barrelW, gun.barrelH);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(barrelX, gun.barrelY - recoilShift);
    ctx.lineTo(barrelX + gun.barrelW, gun.barrelY - recoilShift);
    ctx.lineTo(barrelX + gun.barrelW/2, gun.barrelY - recoilShift - 6);
    ctx.closePath();
    ctx.fill();
    if(isAm2){
      ctx.beginPath();
      ctx.rect(barrelX - 4, gun.barrelY - recoilShift + 6, 3, gun.barrelH - 8);
      ctx.rect(barrelX + gun.barrelW + 1, gun.barrelY - recoilShift + 6, 3, gun.barrelH - 8);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(-10, 0);
  ctx.scale(leftScale, 1);
  ctx.translate(10, 0);
  drawSideGun(gun.xLeft, gun.barrelLeft);
  ctx.restore();

  ctx.save();
  ctx.translate(10, 0);
  ctx.scale(rightScale, 1);
  ctx.translate(-10, 0);
  drawSideGun(gun.xRight, gun.barrelRight);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(gun.centerX, gun.centerY - recoilShift);
  ctx.lineTo(gun.centerX + gun.centerW, gun.centerY - recoilShift);
  ctx.lineTo(gun.centerX + gun.centerW - inset, gun.centerY - recoilShift + gun.centerH);
  ctx.lineTo(gun.centerX + inset, gun.centerY - recoilShift + gun.centerH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  ctx.save();
  ctx.fillStyle = colors.thruster || "rgba(18,22,32,.85)";
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1.4;
  if(ghost && ghostStyle.thrustFocus){
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 1.4);
  }
  ctx.save();
  ctx.translate(-10, 0);
  ctx.scale(leftScale, 1);
  ctx.translate(10, 0);
  ctx.beginPath();
  ctx.rect(-22, 22, 22, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-12, 28, 6.5, 0, Math.PI*2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(10, 0);
  ctx.scale(rightScale, 1);
  ctx.translate(-10, 0);
  ctx.beginPath();
  ctx.rect(0, 22, 22, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(12, 28, 6.5, 0, Math.PI*2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if(isAm2){
    ctx.beginPath();
    ctx.arc(0, 30, 5.5, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  var flash = ghost ? 0 : (player.flash || 0);
  if(flash > 0){
    ctx.save();
    ctx.globalAlpha = Math.min(1, flash);
    ctx.fillStyle = colors.accent;
    ctx.beginPath();
    ctx.moveTo(-4, -26 - recoilShift);
    ctx.lineTo(0, -38 - recoilShift - flash*6);
    ctx.lineTo(4, -26 - recoilShift);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  var forwardBoost = Math.max(0, -vyN);
  var flame = 12 + speedMag * 18 + (Math.sin(t*0.03) * 2.6) + forwardBoost * 22;
  flame *= ghostFlameBoost;

  var bloom = 0.35 + speedMag * 0.5 + forwardBoost * 0.6 + (Math.sin(t * 0.02) * 0.08);
  bloom *= ghostFlameBoost;
  ctx.save();
  ctx.globalAlpha = 0.2 + bloom * 0.22;
  ctx.fillStyle = colors.flame || "rgba(0,229,255,.35)";
  ctx.shadowColor = colors.flame || "rgba(0,229,255,.4)";
  ctx.shadowBlur = 12 + bloom * 9;
  ctx.beginPath();
  ctx.arc(-12, 28, 5 + bloom * 4, 0, Math.PI*2);
  ctx.arc(12, 28, 5 + bloom * 4, 0, Math.PI*2);
  if(isAm2){
    ctx.arc(0, 30, 4.5 + bloom * 3.5, 0, Math.PI*2);
  }
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.85 + forwardBoost * 0.35;
  ctx.fillStyle = colors.flame || "rgba(193,216,47,.16)";
  ctx.beginPath();
  ctx.moveTo(-18, 22);
  ctx.lineTo(-12, 22 + flame);
  ctx.lineTo(-6, 22);
  ctx.moveTo(6, 22);
  ctx.lineTo(12, 22 + flame);
  ctx.lineTo(18, 22);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.22 + forwardBoost * 0.25;
  ctx.fillStyle = "rgba(0,229,255,.16)";
  ctx.beginPath();
  ctx.moveTo(-24, 22);
  ctx.lineTo(-12, 22 + flame*1.18);
  ctx.lineTo(0, 22);
  ctx.moveTo(0, 22);
  ctx.lineTo(12, 22 + flame*1.18);
  ctx.lineTo(24, 22);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = colors.flame || "rgba(0,229,255,.14)";
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.lineTo(-12, 22 + flame*0.7);
  ctx.lineTo(-10, 22);
  ctx.moveTo(10, 22);
  ctx.lineTo(12, 22 + flame*0.7);
  ctx.lineTo(14, 22);
  ctx.closePath();
  ctx.fill();
  if(isAm2){
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = colors.flame || "rgba(120,220,255,.9)";
    ctx.beginPath();
    ctx.moveTo(-3, 20);
    ctx.lineTo(0, 20 + flame*0.9);
    ctx.lineTo(3, 20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  if(Math.abs(vxN) > 0.18 && !ghost){
    var sx = (vxN > 0) ? -30 : 30;
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(175,0,111,.14)";
    ctx.beginPath();
    ctx.moveTo(sx, 6);
    ctx.lineTo(sx + (vxN > 0 ? -10 : 10), 10);
    ctx.lineTo(sx, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.beginPath();
  ctx.arc(0, -20, 6, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(0, 18);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  ctx.restore();
}

// ======= Buttons
btnStart.addEventListener("click", function(){
  requestFullscreen();
  ensureLoop();
  applySettings();
  unlockSfx(state);
  playSfx(state, "menu_beep");
  if(!startCountdown()){
    overlayMenu.classList.remove("show");
    overlayEnd.classList.remove("show");
    resetSession();
    showToast("MISSION START");
  }
});

btnClose.addEventListener("click", function(){
  playSfx(state, "menu_beep");
  closeSettings();
});
btnPause.addEventListener("click", function(){ togglePause(); });
btnSettings.addEventListener("click", function(){
  playSfx(state, "menu_beep");
  openSettings();
});
if(btnGameplay && overlayGameplay){
  btnGameplay.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    overlayMenu.classList.remove("show");
    overlayGameplay.classList.add("show");
  });
}
if(btnHome){
  btnHome.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    window.location.href = "home.html";
  });
}
btnRestart.addEventListener("click", function(){ hardRestart(); });
btnEndRestart.addEventListener("click", function(){ hardRestart(); });

btnEndSettings.addEventListener("click", function(){
  playSfx(state, "menu_beep");
  overlayEnd.classList.remove("show");
  openSettings();
});
if(btnEndHome){
  btnEndHome.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    window.location.href = "home.html";
  });
}

overlayMenu.addEventListener("click", function(e){
  if(e.target === overlayMenu){
    playSfx(state, "menu_beep");
    closeSettings();
  }
});

overlayEnd.addEventListener("click", function(e){
  if(e.target === overlayEnd){
    playSfx(state, "menu_beep");
    overlayEnd.classList.remove("show");
  }
});

if(overlayGameplay){
  overlayGameplay.addEventListener("click", function(e){
    if(e.target === overlayGameplay){
      playSfx(state, "menu_beep");
      overlayGameplay.classList.remove("show");
      overlayMenu.classList.add("show");
    }
  });
}

if(btnCloseGameplay && overlayGameplay){
  btnCloseGameplay.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    overlayGameplay.classList.remove("show");
    overlayMenu.classList.add("show");
  });
}
if(btnBackGameplay && overlayGameplay){
  btnBackGameplay.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    overlayGameplay.classList.remove("show");
    overlayMenu.classList.add("show");
  });
}

if(endNameInput){
  endNameInput.addEventListener("keydown", function(e){
    if(e.key === "Enter"){
      e.preventDefault();
      saveScoreName(endNameInput.value);
      showToast("NAME SAVED");
      playSfx(state, "menu_beep");
    }
  });
  endNameInput.addEventListener("blur", function(){
    saveScoreName(endNameInput.value);
  });
}

// ======= Self-tests (run with ?test=1)
function assert(cond, msg){
  if(!cond) throw new Error("TEST FAIL: " + msg);
}

function runSelfTests(){
  particles.length = 0;
  spawnParticles(10,10,"smoke");
  assert(particles.length > 0, "spawnParticles smoke works");
  particles.length = 0;
  spawnParticles(10,10,"spark");
  assert(particles.length > 0, "spawnParticles spark works");

  player.hull = 1;
  player.hull = clamp(player.hull - 5, 0, 1);
  assert(player.hull === 0, "hull clamp lower bound");
  player.hull = clamp(3, 0, 1);
  assert(player.hull === 1, "hull clamp upper bound");

  assert(factKey(9,2) === "2×9", "factKey canonical order");

  var savedA = state.a, savedB = state.b;
  state.a = 7; state.b = 8;
  var d = genDecoys(56, 5);
  assert(d.length === 5, "genDecoys returns requested count");
  assert(d.indexOf(56) === -1, "genDecoys does not include correct");

  state.level = 1; state.ddSpeedBonus = 0;
  var si = computeSpawnInterval(state);
  assert(si >= 0.28 && si <= 0.78, "computeSpawnInterval in bounds at base");
  state.level = 999; state.ddSpeedBonus = 999;
  si = computeSpawnInterval(state);
  assert(si >= 0.28 && si <= 0.78, "computeSpawnInterval clamped at extremes");

  asteroids.length = 0;
  asteroids.push({waveId:10,isCorrect:true,label:54,ghost:false});
  retireWave(10);
  assert(asteroids.length === 1, "retireWave does not remove asteroids");
  assert(asteroids[0].waveId === -1 && asteroids[0].isCorrect === false, "retireWave clears target status");
  assert(asteroids[0].label === 54, "retireWave keeps label for continuity");

  state.a = savedA; state.b = savedB;
  console.log("SELF TESTS: PASS");
}

function applyConfigToInputs(config){
  if(config.aMin != null) inputs.aMin.value = config.aMin;
  if(config.aMax != null) inputs.aMax.value = config.aMax;
  if(config.bMin != null) inputs.bMin.value = config.bMin;
  if(config.bMax != null) inputs.bMax.value = config.bMax;
  if(config.decoys != null) inputs.decoys.value = config.decoys;
  if(config.speed != null) inputs.speed.value = config.speed;
  if(config.lives != null) inputs.lives.value = config.lives;
  if(config.volume != null && inputs.volume) inputs.volume.value = config.volume;
  if(config.sfxVolume != null && inputs.sfxVolume) inputs.sfxVolume.value = config.sfxVolume;
  if(config.musicVolume != null && inputs.musicVolume) inputs.musicVolume.value = config.musicVolume;
  if(config.timerMode != null) inputs.timerMode.value = config.timerMode;
  if(config.questionMode != null && inputs.questionMode) inputs.questionMode.value = config.questionMode;
  if(config.sound != null && inputs.sound) inputs.sound.checked = !!config.sound;
  if(config.ship){
    if(inputs.ship) inputs.ship.value = String(config.ship);
    player.shipType = String(config.ship);
  }
}

function applyStoredConfig(){
  try{
    var raw = null;
    try { raw = sessionStorage.getItem("asteroidConfig"); } catch(e){ raw = null; }
    if(!raw){
      try { raw = localStorage.getItem("asteroidConfig"); } catch(e){ raw = null; }
    }
    if(!raw) return;
    var parsed = JSON.parse(raw);
    applyConfigToInputs(parsed);
  }catch(e){
    // ignore storage errors
  }
}

function applyQueryParams(){
  var params = new URLSearchParams(location.search);
  if(!params || !params.toString()) return;

  var cfg = {
    aMin: params.get("aMin"),
    aMax: params.get("aMax"),
    bMin: params.get("bMin"),
    bMax: params.get("bMax"),
    decoys: params.get("decoys"),
    speed: params.get("speed"),
    lives: params.get("lives"),
    volume: params.get("volume"),
    sfxVolume: params.get("sfxVolume"),
    musicVolume: params.get("musicVolume"),
    timerMode: params.get("timerMode"),
    questionMode: params.get("questionMode"),
    ship: params.get("ship")
  };

  var soundParam = params.get("sound");
  if(soundParam != null){
    cfg.sound = !(soundParam === "0" || soundParam === "false");
  }

  applyConfigToInputs(cfg);
}

// ======= Boot
function boot(){
  resize();
  applyStoredConfig();
  applyQueryParams();
  applySettings();
  primeFullscreen();

  var r = canvas.getBoundingClientRect();
  player.x = r.width / 2;
  player.y = r.height - 58;

  syncHud();

  var params = new URLSearchParams(location.search);
  var autoStart = params.get("autoStart") === "1" || params.get("autoStart") === "true";
  if(!autoStart && (params.has("aMin") || params.has("bMin") || params.has("questionMode") || params.has("ship"))){
    autoStart = true;
  }
  if(autoStart){
    ensureLoop();
    requestFullscreen();
    startCountdown();
  }
  if(params.get("test") === "1") runSelfTests();

  requestAnimationFrame(tick);
}

boot();
