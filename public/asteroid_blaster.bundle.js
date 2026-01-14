"use strict";
(() => {
  // src/js/core/utils.js
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  function rand(a, b) {
    return Math.random() * (b - a) + a;
  }
  function randi(a, b) {
    return Math.floor(rand(a, b + 1));
  }
  function factKey(a, b) {
    var x = Math.min(a, b);
    var y = Math.max(a, b);
    return String(x) + "\xD7" + String(y);
  }

  // src/js/core/game_settings.js
  function createState() {
    return {
      running: false,
      paused: false,
      over: false,
      // settings
      aMin: 2,
      aMax: 12,
      bMin: 2,
      bMax: 12,
      decoys: 3,
      baseSpeed: 1,
      livesStart: 3,
      timerMode: "off",
      targetMode: "off",
      questionLimit: 0,
      strikeLimit: 5,
      sound: true,
      volume: 0.65,
      sfxVolume: 0.85,
      musicVolume: 0.6,
      questionMode: "digits3",
      decoyFunction: "units_bias",
      difficulty: "normal",
      // session
      score: 0,
      streak: 0,
      level: 1,
      lives: 3,
      correct: 0,
      wrong: 0,
      missed: 0,
      shots: 0,
      hits: 0,
      startTime: 0,
      pauseAccum: 0,
      pauseStart: 0,
      collisionSlow: 0,
      timeLimitSec: 0,
      questionsCompleted: 0,
      // current problem
      a: 0,
      b: 0,
      answer: 0,
      waveId: 0,
      // weak facts
      missesByFact: /* @__PURE__ */ new Map(),
      // dynamic difficulty
      ddSpeedBonus: 0,
      // continuous spawn
      spawnTimer: 0,
      waveDecoys: [],
      waveDecoyBag: null,
      correctInPlay: false,
      asteroidId: 0,
      correctAsteroidId: 0,
      correctDelayRemaining: 0,
      // arcade feel FX
      slowMoRemaining: 0,
      slowMoScale: 0.42,
      empTimer: 0,
      answerDigits: [],
      digitCounts: null,
      digitsLeft: 0,
      correctDigit: null,
      squareValue: 0,
      endReasonDetail: "",
      campaignActive: false,
      campaignIndex: -1,
      redemptionEnabled: false,
      redemptionUsed: false,
      timerWarningPlayed: false
    };
  }
  function createPlayer() {
    return {
      x: 0,
      y: 0,
      w: 58,
      h: 24,
      radius: 18,
      vx: 0,
      vy: 0,
      speed: 560,
      moveSpeed: 0,
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
      shipShake: 0,
      teleportHide: 0,
      teleportFx: null,
      hidden: false
    };
  }
  function normalizeRanges(inputs2) {
    var a1 = parseInt(inputs2.aMin.value, 10);
    var a2 = parseInt(inputs2.aMax.value, 10);
    var b1 = parseInt(inputs2.bMin.value, 10);
    var b2 = parseInt(inputs2.bMax.value, 10);
    if (Number.isNaN(a1))
      a1 = 0;
    if (Number.isNaN(a2))
      a2 = 12;
    if (Number.isNaN(b1))
      b1 = 0;
    if (Number.isNaN(b2))
      b2 = 12;
    if (a1 > a2) {
      var t = a1;
      a1 = a2;
      a2 = t;
    }
    if (b1 > b2) {
      var t2 = b1;
      b1 = b2;
      b2 = t2;
    }
    a1 = clamp(a1, 0, 99);
    a2 = clamp(a2, 0, 99);
    b1 = clamp(b1, 0, 99);
    b2 = clamp(b2, 0, 99);
    inputs2.aMin.value = a1;
    inputs2.aMax.value = a2;
    inputs2.bMin.value = b1;
    inputs2.bMax.value = b2;
    return { a1, a2, b1, b2 };
  }
  function applySettingsFromInputs(state2, inputs2) {
    var rr = normalizeRanges(inputs2);
    state2.aMin = rr.a1;
    state2.aMax = rr.a2;
    state2.bMin = rr.b1;
    state2.bMax = rr.b2;
    state2.decoys = parseInt(inputs2.decoys.value, 10);
    var baseSpeed = parseFloat(inputs2.speed.value);
    if (Number.isNaN(baseSpeed))
      baseSpeed = 0.9;
    state2.baseSpeed = baseSpeed;
    state2.livesStart = parseInt(inputs2.lives.value, 10);
    state2.timerMode = inputs2.timerMode.value;
    if (inputs2.targetMode)
      state2.targetMode = inputs2.targetMode.value;
    if (inputs2.strikes)
      state2.strikeLimit = parseInt(inputs2.strikes.value, 10);
    state2.sound = inputs2.sound ? !!inputs2.sound.checked : true;
    if (inputs2.volume) {
      var vol = parseFloat(inputs2.volume.value);
      if (Number.isNaN(vol))
        vol = 0.65;
      state2.volume = clamp(vol, 0, 1);
    }
    if (inputs2.sfxVolume) {
      var sfxVol = parseFloat(inputs2.sfxVolume.value);
      if (Number.isNaN(sfxVol))
        sfxVol = 0.85;
      state2.sfxVolume = clamp(sfxVol, 0, 1);
    }
    if (inputs2.musicVolume) {
      var musicVol = parseFloat(inputs2.musicVolume.value);
      if (Number.isNaN(musicVol))
        musicVol = 0.6;
      state2.musicVolume = clamp(musicVol, 0, 1);
    }
    if (inputs2.questionMode)
      state2.questionMode = inputs2.questionMode.value || "digits3";
    if (inputs2.decoyFunction)
      state2.decoyFunction = inputs2.decoyFunction.value || "units_bias";
    state2.timeLimitSec = state2.timerMode === "off" ? 0 : parseInt(state2.timerMode, 10);
    state2.questionLimit = 0;
    if (state2.targetMode && state2.targetMode.charAt(0) === "q") {
      var qCount = parseInt(state2.targetMode.slice(1), 10);
      if (!Number.isNaN(qCount) && qCount > 0) {
        state2.questionLimit = qCount;
      }
    }
  }

  // src/js/core/audio.js
  var audioCtx = null;
  var sfxBank = null;
  var droneLoop = null;
  var sfxUnlocked = false;
  var soundtrackList = null;
  var soundtrackIndex = 0;
  var soundtrackClip = null;
  var soundtrackActive = false;
  var soundtrackState = null;
  function initSfx() {
    if (sfxBank)
      return;
    sfxBank = {
      alien_kill: new Audio("sfx/alien_kill.mp3"),
      alien_shooting: new Audio("sfx/alien_shooting.mp3"),
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
      level_up2: new Audio("sfx/level_up2.mp3"),
      mission_cleared1: new Audio("sfx/mission_cleared1.mp3"),
      menu_beep: new Audio("sfx/menu_beep.mp3"),
      missed_answer: new Audio("sfx/missed_answer.mp3"),
      session_start: new Audio("sfx/session_start.mp3"),
      ship_damaged: new Audio("sfx/ship_damaged.mp3"),
      ship_drone: new Audio("sfx/ship_drone.mp3"),
      game_over3: new Audio("sfx/game_over3.mp3"),
      warning: new Audio("sfx/warning.mp3"),
      wrong_asteroid: new Audio("sfx/wrong_asteroid.mp3")
    };
    sfxBank.alien_kill.volume = 0.5;
    sfxBank.alien_shooting.volume = 0.45;
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
    sfxBank.level_up2.volume = 0.55;
    sfxBank.mission_cleared1.volume = 0.7;
    sfxBank.menu_beep.volume = 0.45;
    sfxBank.missed_answer.volume = 0.5;
    sfxBank.session_start.volume = 0.6;
    sfxBank.ship_damaged.volume = 0.5;
    sfxBank.ship_drone.volume = 0.22;
    sfxBank.game_over3.volume = 0.7;
    sfxBank.warning.volume = 0.5;
    sfxBank.wrong_asteroid.volume = 0.5;
  }
  function initSoundtracks() {
    if (soundtrackList)
      return;
    soundtrackList = [
      new Audio("sfx/soundtrack1.mp3"),
      new Audio("sfx/soundtrack2_toohottosleep.mp3"),
      new Audio("sfx/soundtrack3.mp3")
    ];
    for (var i = 0; i < soundtrackList.length; i++) {
      soundtrackList[i].volume = 0.22;
      soundtrackList[i].loop = false;
    }
  }
  function playSoundtrackAt(idx) {
    if (!soundtrackActive || !soundtrackState || !soundtrackState.sound)
      return;
    initSoundtracks();
    if (!soundtrackList || !soundtrackList.length)
      return;
    var clip = soundtrackList[idx % soundtrackList.length];
    soundtrackClip = clip;
    soundtrackIndex = idx % soundtrackList.length;
    var master = soundtrackState && typeof soundtrackState.volume === "number" ? soundtrackState.volume : 1;
    var musicMaster = soundtrackState && typeof soundtrackState.musicVolume === "number" ? soundtrackState.musicVolume : 1;
    clip.volume = Math.max(0, Math.min(1, 0.22 * master * musicMaster));
    try {
      clip.currentTime = 0;
      clip.onended = function() {
        if (!soundtrackActive)
          return;
        playSoundtrackAt(soundtrackIndex + 1);
      };
      clip.play().catch(function() {
      });
    } catch (e) {
    }
  }
  function playSfx(state2, name, vol) {
    if (!state2.sound)
      return;
    try {
      initSfx();
      var base = sfxBank[name];
      if (!base)
        return;
      var clip = base.cloneNode();
      var master = state2 && typeof state2.volume === "number" ? state2.volume : 1;
      var sfxMaster = state2 && typeof state2.sfxVolume === "number" ? state2.sfxVolume : 1;
      var baseVol = vol != null ? vol : base.volume;
      clip.volume = Math.max(0, Math.min(1, baseVol * master * sfxMaster));
      clip.play();
      return clip;
    } catch (e) {
    }
    return null;
  }
  function unlockSfx(state2) {
    if (sfxUnlocked)
      return;
    if (!state2.sound)
      return;
    try {
      initSfx();
      var clip = sfxBank.gun1.cloneNode();
      clip.volume = 0;
      var p = clip.play();
      if (p && p.then)
        p.then(function() {
          clip.pause();
        }).catch(function() {
        });
      setTimeout(function() {
        try {
          clip.pause();
        } catch (e) {
        }
      }, 80);
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(function() {
        });
      }
      sfxUnlocked = true;
    } catch (e) {
    }
  }
  function setDrone(state2, on) {
    if (!state2.sound) {
      if (droneLoop)
        droneLoop.pause();
      return;
    }
    try {
      initSfx();
      if (!droneLoop) {
        droneLoop = sfxBank.ship_drone.cloneNode();
        droneLoop.loop = true;
      }
      var master = state2 && typeof state2.volume === "number" ? state2.volume : 1;
      var sfxMaster = state2 && typeof state2.sfxVolume === "number" ? state2.sfxVolume : 1;
      droneLoop.volume = Math.max(0, Math.min(1, sfxBank.ship_drone.volume * master * sfxMaster));
      if (on) {
        if (droneLoop.paused)
          droneLoop.play();
      } else {
        droneLoop.pause();
      }
    } catch (e) {
    }
  }
  function setSoundtrack(state2, on) {
    soundtrackState = state2;
    soundtrackActive = !!on && !!state2.sound;
    if (!soundtrackActive) {
      if (soundtrackClip) {
        try {
          soundtrackClip.pause();
        } catch (e) {
        }
      }
      return;
    }
    playSoundtrackAt(soundtrackIndex || 0);
  }

  // src/js/render/animations.js
  function createFx(ctx2, state2, player2, beepFn) {
    var particles2 = [];
    var rings2 = [];
    var cam2 = { x: 0, y: 0, t: 0, t0: 0, amp: 0 };
    function kickShake2(amp, dur) {
      cam2.amp = Math.max(cam2.amp, amp);
      cam2.t0 = Math.max(cam2.t0, dur);
      cam2.t = Math.max(cam2.t, dur);
    }
    function updateCamera2(dtReal) {
      if (cam2.t > 0) {
        cam2.t = Math.max(0, cam2.t - dtReal);
        var f = cam2.t0 > 0 ? cam2.t / cam2.t0 : 0;
        cam2.x = (Math.random() * 2 - 1) * cam2.amp * f;
        cam2.y = (Math.random() * 2 - 1) * cam2.amp * f;
      } else {
        cam2.x = 0;
        cam2.y = 0;
        cam2.amp = 0;
        cam2.t0 = 0;
      }
    }
    function spawnRing2(x, y, baseR) {
      rings2.push({ x, y, r: baseR + 6, dr: 520, a: 1 });
      if (rings2.length > 14)
        rings2.splice(0, rings2.length - 14);
    }
    function updateRings2(dt) {
      for (var i = rings2.length - 1; i >= 0; i--) {
        var rr = rings2[i];
        rr.r += rr.dr * dt;
        rr.a -= dt * 3.2;
        if (rr.a <= 0)
          rings2.splice(i, 1);
      }
    }
    function drawRings2() {
      if (!rings2.length)
        return;
      ctx2.save();
      ctx2.globalCompositeOperation = "lighter";
      for (var i = 0; i < rings2.length; i++) {
        var rr = rings2[i];
        ctx2.globalAlpha = Math.max(0, rr.a);
        ctx2.lineWidth = 3;
        ctx2.strokeStyle = "rgba(0,229,255,.65)";
        ctx2.beginPath();
        ctx2.arc(rr.x, rr.y, rr.r, 0, Math.PI * 2);
        ctx2.stroke();
        ctx2.globalAlpha = Math.max(0, rr.a) * 0.55;
        ctx2.lineWidth = 1.5;
        ctx2.strokeStyle = "rgba(255,221,0,.55)";
        ctx2.beginPath();
        ctx2.arc(rr.x, rr.y, rr.r * 0.78, 0, Math.PI * 2);
        ctx2.stroke();
      }
      ctx2.restore();
      ctx2.globalAlpha = 1;
      ctx2.globalCompositeOperation = "source-over";
    }
    function spawnParticles2(x, y, kind) {
      var n = kind === "correct" ? 36 : kind === "wrong" ? 22 : kind === "spark" ? 26 : kind === "smoke" ? 8 : 12;
      var sp = kind === "correct" ? 520 : kind === "wrong" ? 420 : kind === "spark" ? 780 : kind === "smoke" ? 90 : 320;
      for (var i = 0; i < n; i++) {
        var ang = Math.random() * Math.PI * 2;
        var v = rand(sp * 0.35, sp);
        if (kind === "smoke") {
          particles2.push({
            x: x + rand(-10, 10),
            y: y + rand(-6, 6),
            vx: rand(-40, 40),
            vy: rand(70, 140),
            r: rand(4, 8.5),
            a: rand(0.18, 0.38),
            life: rand(0.9, 1.6),
            kind: "smoke",
            grow: rand(10, 22)
          });
          continue;
        }
        particles2.push({
          x,
          y,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v,
          r: rand(1.2, kind === "correct" ? 3 : kind === "spark" ? 2.2 : 2.4),
          a: rand(0.55, 0.95),
          life: kind === "correct" ? rand(0.22, 0.38) : kind === "spark" ? rand(0.1, 0.22) : rand(0.18, 0.32),
          kind,
          spin: rand(-6, 6)
        });
      }
      if (particles2.length > 180)
        particles2.splice(0, particles2.length - 180);
    }
    function spawnDirectedSparks2(x, y, dirX, dirY, spread, count, speedMin, speedMax, lifeMin, lifeMax) {
      var baseAng = Math.atan2(dirY, dirX);
      var n = count || 14;
      var spMin = speedMin || 220;
      var spMax = speedMax || 520;
      var lMin = lifeMin || 0.12;
      var lMax = lifeMax || 0.26;
      for (var i = 0; i < n; i++) {
        var ang = baseAng + rand(-spread, spread);
        var v = rand(spMin, spMax);
        particles2.push({
          x,
          y,
          vx: Math.cos(ang) * v,
          vy: Math.sin(ang) * v,
          r: rand(1, 2.4),
          a: rand(0.6, 0.95),
          life: rand(lMin, lMax),
          kind: "spark",
          spin: rand(-6, 6)
        });
      }
      if (particles2.length > 180)
        particles2.splice(0, particles2.length - 180);
    }
    function updateParticles2(dt) {
      for (var i = particles2.length - 1; i >= 0; i--) {
        var p = particles2[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles2.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === "smoke") {
          p.r += (p.grow || 14) * dt;
          p.vx *= 1 - dt * 1.2;
          p.vy *= 1 - dt * 0.6;
          p.a *= 1 - dt * 1.1;
        } else {
          p.vx *= 1 - dt * 2.8;
          p.vy *= 1 - dt * 2.8;
          p.a *= 1 - dt * 3.6;
        }
      }
    }
    function drawParticles2() {
      if (!particles2.length)
        return;
      ctx2.save();
      ctx2.globalCompositeOperation = "source-over";
      for (var i = 0; i < particles2.length; i++) {
        var p = particles2[i];
        if (p.kind !== "smoke")
          continue;
        ctx2.globalAlpha = Math.max(0, p.a);
        ctx2.fillStyle = "rgba(180,190,220,.35)";
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.globalAlpha = Math.max(0, p.a) * 0.55;
        ctx2.fillStyle = "rgba(0,0,0,.22)";
        ctx2.beginPath();
        ctx2.arc(p.x + 1.2, p.y + 1, Math.max(1, p.r * 0.55), 0, Math.PI * 2);
        ctx2.fill();
      }
      ctx2.restore();
      ctx2.save();
      ctx2.globalCompositeOperation = "lighter";
      for (var j = 0; j < particles2.length; j++) {
        var q = particles2[j];
        if (q.kind === "smoke")
          continue;
        ctx2.globalAlpha = Math.max(0, q.a);
        if (q.kind === "correct")
          ctx2.fillStyle = "rgba(0,229,255,.9)";
        else if (q.kind === "wrong")
          ctx2.fillStyle = "rgba(255,77,109,.9)";
        else if (q.kind === "spark")
          ctx2.fillStyle = "rgba(255,221,0,.90)";
        else
          ctx2.fillStyle = "rgba(232,236,255,.7)";
        ctx2.beginPath();
        ctx2.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx2.fill();
      }
      ctx2.restore();
      ctx2.globalAlpha = 1;
      ctx2.globalCompositeOperation = "source-over";
    }
    function impactCorrect2(x, y, r) {
      state2.slowMoRemaining = 0.1;
      state2.slowMoScale = 0.42;
      kickShake2(7.5, 0.1);
      spawnRing2(x, y, r);
      spawnParticles2(x, y, "correct");
    }
    function impactWrong2(x, y) {
      kickShake2(4, 0.08);
      spawnParticles2(x, y, "wrong");
    }
    function impactDebris2(x, y) {
      kickShake2(2, 0.06);
      spawnParticles2(x, y, "debris");
    }
    function impactShipHit2(x, y) {
      state2.slowMoRemaining = 0;
      kickShake2(28, 0.16);
      spawnParticles2(x, y, "spark");
      spawnParticles2(x, y, "smoke");
      if (beepFn)
        beepFn(120, 95, "sawtooth", 0.035);
    }
    function emitDamageSmoke2(dt) {
      var dmg = 1 - player2.hull;
      if (dmg <= 0.02)
        return;
      if (player2.invuln > 0)
        return;
      var speedMag = Math.min(1, Math.hypot(player2.vx, player2.vy) / (player2.speed || 1));
      var rate = (0.6 + speedMag * 0.8) * dmg;
      var p = clamp(rate * dt * 6, 0, 0.55);
      if (Math.random() < p) {
        spawnParticles2(player2.x + rand(-6, 6), player2.y + 14 + rand(-2, 2), "smoke");
      }
    }
    return {
      particles: particles2,
      rings: rings2,
      cam: cam2,
      kickShake: kickShake2,
      updateCamera: updateCamera2,
      spawnRing: spawnRing2,
      updateRings: updateRings2,
      drawRings: drawRings2,
      spawnParticles: spawnParticles2,
      spawnDirectedSparks: spawnDirectedSparks2,
      updateParticles: updateParticles2,
      drawParticles: drawParticles2,
      impactCorrect: impactCorrect2,
      impactWrong: impactWrong2,
      impactDebris: impactDebris2,
      impactShipHit: impactShipHit2,
      emitDamageSmoke: emitDamageSmoke2
    };
  }

  // src/js/render/background.js
  function createBackground(ctx2) {
    var bg2 = {
      stars: [],
      streaks: [],
      planets: [],
      seed: Math.random() * 1e3,
      lastW: 0,
      lastH: 0,
      nebula: null,
      dt: 1 / 60
    };
    function buildStarfield2(w, h) {
      bg2.stars.length = 0;
      bg2.streaks.length = 0;
      bg2.planets.length = 0;
      bg2.lastW = w;
      bg2.lastH = h;
      var area = w * h;
      var n1 = Math.floor(clamp(area / 32e3, 28, 70));
      var n2 = Math.floor(clamp(area / 24e3, 40, 90));
      var n3 = Math.floor(clamp(area / 19e3, 50, 120));
      function addLayer(n, speed, sizeMin, sizeMax, alphaMin, alphaMax, tintChance) {
        for (var i = 0; i < n; i++) {
          var tint = Math.random() < tintChance ? Math.random() < 0.5 ? "cyan" : Math.random() < 0.75 ? "mag" : "amber" : "white";
          var col = tint === "cyan" ? "rgb(0,229,255)" : tint === "mag" ? "rgb(175,0,111)" : tint === "amber" ? "rgb(255,221,0)" : "rgb(232,236,255)";
          bg2.stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            sp: speed,
            r: rand(sizeMin, sizeMax),
            a: rand(alphaMin, alphaMax),
            tw: rand(0.6, 1.9),
            ph: rand(0, Math.PI * 2),
            tint,
            col
          });
        }
      }
      addLayer(n1, 8, 0.7, 1.4, 0.34, 0.75, 0.18);
      addLayer(n2, 14, 0.7, 1.6, 0.26, 0.6, 0.12);
      addLayer(n3, 22, 0.6, 2, 0.18, 0.46, 0.08);
      var planetCount = Math.max(1, Math.min(3, Math.floor(area / 26e4)));
      var palettes = [
        ["#59c8ff", "#1463b0", "rgba(0,229,255,.35)"],
        ["#ff8bd8", "#7b1e62", "rgba(175,0,111,.35)"],
        ["#f6d065", "#a86c19", "rgba(255,221,0,.28)"],
        ["#9be37a", "#1f6b3f", "rgba(193,216,47,.25)"]
      ];
      for (var p = 0; p < planetCount; p++) {
        var palette = palettes[p % palettes.length];
        var edge = Math.random() < 0.5;
        var margin = 120;
        var x = edge ? Math.random() < 0.5 ? rand(margin * 0.6, margin * 1.4) : rand(w - margin * 1.4, w - margin * 0.6) : rand(margin, w - margin);
        var y = rand(margin * 0.6, h * 0.9);
        bg2.planets.push({
          x,
          y,
          r: rand(24, 62),
          sp: rand(2.5, 6.5),
          c1: palette[0],
          c2: palette[1],
          glow: palette[2],
          ring: Math.random() < 0.55,
          ringTilt: rand(-0.5, 0.5),
          ringW: rand(1.25, 1.7)
        });
      }
    }
    function maybeSpawnStreak(w, h) {
      if (bg2.streaks.length >= 2)
        return;
      if (Math.random() > 6e-3)
        return;
      bg2.streaks.push({
        x: rand(40, w - 40),
        y: rand(-h * 0.2, h * 0.4),
        vy: rand(420, 700),
        len: rand(120, 220),
        life: rand(0.35, 0.55),
        t: 0,
        hue: Math.random() < 0.5 ? "cyan" : "mag"
      });
    }
    function drawStars2(w, h) {
      if (!bg2.stars.length || bg2.lastW !== w || bg2.lastH !== h)
        buildStarfield2(w, h);
      var t = performance.now() * 1e-3;
      var dt = bg2.dt || 1 / 60;
      if (bg2.nebula && bg2.nebula.length) {
        ctx2.save();
        ctx2.globalCompositeOperation = "lighter";
        ctx2.globalAlpha = 0.38;
        for (var ni = 0; ni < bg2.nebula.length; ni++) {
          ctx2.fillStyle = bg2.nebula[ni];
          ctx2.fillRect(0, 0, w, h);
        }
        ctx2.restore();
      }
      ctx2.save();
      ctx2.globalCompositeOperation = "screen";
      for (var pi = 0; pi < bg2.planets.length; pi++) {
        var pl = bg2.planets[pi];
        var py = (pl.y + t * pl.sp) % (h + pl.r * 2) - pl.r;
        ctx2.save();
        ctx2.globalAlpha = 0.75;
        ctx2.fillStyle = pl.glow;
        ctx2.beginPath();
        ctx2.arc(pl.x, py, pl.r * 1.12, 0, Math.PI * 2);
        ctx2.fill();
        var grad = ctx2.createRadialGradient(pl.x - pl.r * 0.3, py - pl.r * 0.3, pl.r * 0.2, pl.x, py, pl.r);
        grad.addColorStop(0, pl.c1);
        grad.addColorStop(1, pl.c2);
        ctx2.fillStyle = grad;
        ctx2.beginPath();
        ctx2.arc(pl.x, py, pl.r, 0, Math.PI * 2);
        ctx2.fill();
        if (pl.ring) {
          ctx2.strokeStyle = "rgba(232,236,255,.35)";
          ctx2.lineWidth = Math.max(2, pl.r * 0.08);
          ctx2.beginPath();
          ctx2.ellipse(pl.x, py, pl.r * pl.ringW, pl.r * 0.35, pl.ringTilt, 0, Math.PI * 2);
          ctx2.stroke();
        }
        ctx2.restore();
      }
      for (var i = 0; i < bg2.stars.length; i++) {
        var s = bg2.stars[i];
        var yy = (s.y + t * s.sp + i * 0.9) % h;
        var tw = 0.68 + 0.32 * Math.sin(t * s.tw + s.ph);
        var a = s.a * tw;
        if (s.tint === "amber")
          a *= 0.85;
        ctx2.globalAlpha = a;
        ctx2.fillStyle = s.col;
        if (i % 31 === 0 && tw > 0.92) {
          var rr = s.r + 0.9;
          var xx = s.x;
          ctx2.fillRect(xx - rr * 1.2, yy, rr * 2.4, 1);
          ctx2.fillRect(xx, yy - rr * 1.2, 1, rr * 2.4);
        }
        ctx2.fillRect(s.x, yy, s.r, s.r);
      }
      maybeSpawnStreak(w, h);
      for (var j = bg2.streaks.length - 1; j >= 0; j--) {
        var st = bg2.streaks[j];
        st.t += dt;
        st.y += st.vy * dt;
        st.life -= dt;
        var fade = clamp(st.life / 0.55, 0, 1);
        ctx2.save();
        ctx2.globalAlpha = 0.5 * fade;
        ctx2.lineWidth = 2;
        ctx2.lineCap = "round";
        ctx2.strokeStyle = st.hue === "mag" ? "rgba(175,0,111,1)" : "rgba(0,229,255,1)";
        ctx2.beginPath();
        ctx2.moveTo(st.x, st.y);
        ctx2.lineTo(st.x + 22, st.y - st.len);
        ctx2.stroke();
        ctx2.restore();
        if (st.life <= 0 || st.y - st.len > h + 50)
          bg2.streaks.splice(j, 1);
      }
      ctx2.restore();
      ctx2.globalAlpha = 1;
    }
    return {
      bg: bg2,
      buildStarfield: buildStarfield2,
      maybeSpawnStreak,
      drawStars: drawStars2
    };
  }

  // src/js/entities/aliens.js
  var aliens = [];
  var alienBullets = [];
  var alienConfig = {
    enabled: true,
    spawnCooldown: 22,
    maxOnScreen: 1,
    escapeSeconds: 120
  };
  var alienTypes = {
    scout: {
      id: "scout",
      name: "Scout",
      hp: 1,
      speed: 120,
      score: 900,
      radius: 24,
      behavior: "strafe"
    }
  };
  var spawnTimer = alienConfig.spawnCooldown;
  var alienId = 1;
  var unlocked = false;
  function resetAliens() {
    aliens.length = 0;
    alienBullets.length = 0;
    spawnTimer = alienConfig.spawnCooldown;
    alienId = 1;
    unlocked = false;
  }
  function spawnAlien(typeId, question, answer, view2) {
    var t = alienTypes[typeId] || alienTypes.scout;
    var pad = 80;
    var x = randi(pad, Math.max(pad + 20, view2.w - pad));
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
      x,
      y,
      vx: 0,
      vy: t.speed,
      t: 0,
      life: 0,
      question,
      answer,
      hitsTaken: 0,
      fireCooldown: 1.4 + Math.random() * 1.2
    };
    aliens.push(a);
    return a;
  }
  function updateAliens(dt, state2, player2, view2, questionFn, asteroids2) {
    var escaped = 0;
    if (!alienConfig.enabled)
      return { escaped };
    if (!unlocked && state2.questionsCompleted >= 3) {
      unlocked = true;
      spawnTimer = 0;
    }
    spawnTimer -= dt;
    if (unlocked && spawnTimer <= 0 && aliens.length < alienConfig.maxOnScreen) {
      var q = questionFn();
      spawnAlien("scout", q.question, q.answer, view2);
      spawnTimer = alienConfig.spawnCooldown;
    }
    for (var i = aliens.length - 1; i >= 0; i--) {
      var a = aliens[i];
      a.t += dt;
      a.life += dt;
      if (a.y - a.r > view2.h + 20) {
        aliens.splice(i, 1);
        escaped++;
        continue;
      }
      if (a.hitShake > 0) {
        a.hitShake = Math.max(0, a.hitShake - dt);
      }
      a.vx = Math.sin(a.t * 1.1 + a.uid) * 40;
      if (asteroids2 && asteroids2.length) {
        var pushX = 0;
        var pushY = 0;
        for (var k = 0; k < asteroids2.length; k++) {
          var s = asteroids2[k];
          if (!s || s.ghost)
            continue;
          var dxA = a.x - s.x;
          var dyA = a.y - s.y;
          var distA = Math.hypot(dxA, dyA);
          var minD = (a.r || 24) + (s.r || 18) + 14;
          if (distA > 0 && distA < minD) {
            var strength = (minD - distA) / minD;
            pushX += dxA / distA * strength * 110;
            pushY += dyA / distA * strength * 110;
          }
        }
        a.vx += pushX;
        a.vy += pushY * 0.6;
      }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.x < a.r + 10)
        a.x = a.r + 10;
      if (a.x > view2.w - a.r - 10)
        a.x = view2.w - a.r - 10;
      if (a.fireCooldown > 0)
        a.fireCooldown -= dt;
      if (a.fireCooldown <= 0) {
        if (a.x + a.r < 0 || a.x - a.r > view2.w || a.y + a.r < 0 || a.y - a.r > view2.h) {
          a.fireCooldown = 0.2 + Math.random() * 0.3;
          continue;
        }
        var dx = player2.x - a.x;
        var dy = player2.y - a.y;
        var dist = Math.max(1, Math.hypot(dx, dy));
        var spd = 320;
        playSfx(state2, "alien_shooting");
        alienBullets.push({
          x: a.x,
          y: a.y,
          vx: dx / dist * spd,
          vy: dy / dist * spd,
          r: 4,
          life: 2.8
        });
        a.fireCooldown = 1.6 + Math.random() * 1.2;
      }
      if (a.life >= alienConfig.escapeSeconds) {
        aliens.splice(i, 1);
        escaped += 1;
      }
    }
    return { escaped };
  }
  function updateAlienBullets(dt, view2) {
    for (var i = alienBullets.length - 1; i >= 0; i--) {
      var b = alienBullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.y < -40 || b.y > view2.h + 40 || b.x < -40 || b.x > view2.w + 40) {
        alienBullets.splice(i, 1);
      }
    }
  }
  function drawAliens(ctx2) {
    var glyphs = ["\u{1F47D}", "\u{1F47E}", "\u{1F6F8}", "\u{1F9E0}", "\u{1F608}", "\u{1F441}\uFE0F"];
    ctx2.save();
    for (var i = 0; i < aliens.length; i++) {
      var a = aliens[i];
      var glyph = glyphs[a.uid % glyphs.length];
      var shake = a.hitShake ? a.hitShake * 9 : 0;
      var shakeX = shake ? Math.sin((a.t || 0) * 50) * shake : 0;
      var shakeY = shake ? Math.cos((a.t || 0) * 46) * shake : 0;
      var glow = ctx2.createRadialGradient(a.x, a.y, a.r * 0.2, a.x, a.y, a.r * 1.5);
      glow.addColorStop(0, "rgba(80,255,220,.35)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx2.globalAlpha = 0.9;
      ctx2.fillStyle = glow;
      ctx2.beginPath();
      ctx2.arc(a.x + shakeX, a.y + shakeY, a.r * 1.35, 0, Math.PI * 2);
      ctx2.fill();
      var pulse = 1 + Math.sin((a.t || 0) * 3.2) * 0.08;
      var size = Math.max(20, Math.round(a.r * 1.85 * pulse));
      ctx2.save();
      ctx2.globalAlpha = 0.9;
      ctx2.shadowColor = "rgba(80,255,220,.9)";
      ctx2.shadowBlur = 26;
      ctx2.font = size + "px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      ctx2.fillText(glyph, a.x + shakeX, a.y + shakeY);
      ctx2.restore();
      ctx2.globalAlpha = 0.8;
      ctx2.fillStyle = "rgba(255,255,255,.95)";
      ctx2.font = "700 14px Orbitron, sans-serif";
      ctx2.textAlign = "center";
      ctx2.textBaseline = "middle";
      ctx2.fillText(String(a.question), a.x, a.y - a.r - 14);
    }
    ctx2.restore();
  }
  function drawAlienBullets(ctx2) {
    if (!alienBullets.length)
      return;
    ctx2.save();
    ctx2.globalCompositeOperation = "lighter";
    for (var i = 0; i < alienBullets.length; i++) {
      var b = alienBullets[i];
      ctx2.globalAlpha = 0.9;
      ctx2.fillStyle = "rgba(255,77,109,.85)";
      ctx2.beginPath();
      ctx2.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx2.fill();
    }
    ctx2.restore();
  }

  // src/js/core/levels.js
  function computeSpawnInterval(state2) {
    var base = 0.82;
    var levelFactor = 1;
    var diff = String(state2.difficulty || "normal").toLowerCase();
    if (diff === "easy")
      levelFactor = 0.45;
    else if (diff === "normal")
      levelFactor = 0.7;
    else if (diff === "brutal")
      levelFactor = 1.25;
    var levelBoost = Math.min(0.22 * levelFactor, (state2.level - 1) * 0.025 * levelFactor);
    var streakBoost = Math.min(0.12, state2.ddSpeedBonus * 0.55);
    var interval = base - levelBoost - streakBoost;
    return clamp(interval, 0.42, 0.95);
  }

  // src/js/entities/powerups.js
  var POWERUPS = [
    {
      id: "slowmo",
      label: "Time Dilation",
      desc: "Brief slow-mo after a correct hit.",
      apply: function(state2) {
        state2.slowMoRemaining = Math.max(state2.slowMoRemaining, 0.1);
        state2.slowMoScale = 0.42;
      }
    },
    {
      id: "hull-boost",
      label: "Hull Nanites",
      desc: "Small hull repair after a long streak.",
      apply: function(state2, player2) {
        player2.hull = Math.min(1, player2.hull + 0.12);
      }
    }
  ];
  function PowerupManager(state2, player2) {
    this.state = state2;
    this.player = player2;
    this.queue = [];
  }
  PowerupManager.prototype.grant = function(id) {
    var p = POWERUPS.find(function(pp) {
      return pp.id === id;
    });
    if (p)
      this.queue.push(p);
  };
  PowerupManager.prototype.flush = function() {
    while (this.queue.length) {
      var p = this.queue.shift();
      p.apply(this.state, this.player);
    }
  };
  PowerupManager.prototype.update = function() {
    this.flush();
  };

  // src/js/core/game.js
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d", { alpha: true });
  var view = { w: 0, h: 0, hudH: 0 };
  var gameShell = document.getElementById("gameShell");
  var isElectron = typeof navigator !== "undefined" && /Electron/i.test(navigator.userAgent || "");
  var promptText = document.getElementById("promptText");
  var scoreText = document.getElementById("scoreText");
  var streakText = document.getElementById("streakText");
  var levelText = document.getElementById("levelText");
  var livesText = document.getElementById("livesText");
  var hullText = document.getElementById("hullText");
  var timerText = document.getElementById("timerText");
  var overlayMenu = document.getElementById("overlayMenu");
  var overlayEnd = document.getElementById("overlayEnd");
  var overlayGameplay = document.getElementById("overlayGameplay");
  var btnStart = document.getElementById("btnStart");
  var btnClose = document.getElementById("btnClose");
  var btnGameplay = document.getElementById("btnGameplay");
  var btnFullscreenToggle = document.getElementById("btnFullscreenToggle");
  var btnPause = document.getElementById("btnPause");
  var btnSettings = document.getElementById("btnSettings");
  var btnHome = document.getElementById("btnHome");
  var btnRestart = document.getElementById("btnRestart");
  var btnCloseGameplay = document.getElementById("btnCloseGameplay");
  var btnBackGameplay = document.getElementById("btnBackGameplay");
  var btnEndRestart = document.getElementById("btnEndRestart");
  var btnEndSettings = document.getElementById("btnEndSettings");
  var btnEndNext = document.getElementById("btnEndNext");
  var btnEndHome = document.getElementById("btnEndHome");
  var toast = document.getElementById("toast");
  var countdownEl = document.getElementById("countdown");
  var warningClip = null;
  function setFullscreenLabel(btn, isFull) {
    if (!btn)
      return;
    btn.textContent = isFull ? "EXIT FULLSCREEN" : "FULLSCREEN";
  }
  async function getFullscreenState() {
    if (window.electronAPI && window.electronAPI.isFullscreen) {
      try {
        return await window.electronAPI.isFullscreen();
      } catch (e) {
        return false;
      }
    }
    return !!document.fullscreenElement;
  }
  async function toggleFullscreen() {
    if (window.electronAPI && window.electronAPI.toggleFullscreen) {
      try {
        var state2 = await window.electronAPI.toggleFullscreen();
        setFullscreenLabel(btnFullscreenToggle, state2);
        return;
      } catch (e) {
      }
    }
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (e) {
      }
    } else {
      try {
        await document.documentElement.requestFullscreen();
      } catch (e) {
      }
    }
    setFullscreenLabel(btnFullscreenToggle, !!document.fullscreenElement);
  }
  var inputs = {
    aMin: document.getElementById("aMin"),
    aMax: document.getElementById("aMax"),
    bMin: document.getElementById("bMin"),
    bMax: document.getElementById("bMax"),
    decoys: document.getElementById("decoys"),
    decoyFunction: document.getElementById("decoyFunction"),
    speed: document.getElementById("speed"),
    lives: document.getElementById("lives"),
    volume: document.getElementById("volume"),
    sfxVolume: document.getElementById("sfxVolume"),
    musicVolume: document.getElementById("musicVolume"),
    ship: document.getElementById("ship"),
    targetMode: document.getElementById("targetMode"),
    timerMode: document.getElementById("timerMode"),
    strikes: document.getElementById("strikes"),
    sound: document.getElementById("sound"),
    questionMode: document.getElementById("questionMode")
  };
  var endSubtitle = document.getElementById("endSubtitle");
  var endTitle = document.getElementById("endTitle");
  var endReason = document.getElementById("endReason");
  var endOutcome = document.getElementById("endOutcome");
  var endReasonLine = document.getElementById("endReasonLine");
  var statsList = document.getElementById("statsList");
  var weakList = document.getElementById("weakList");
  var accBar = document.getElementById("accBar");
  var highScoresEnd = document.getElementById("highScoresEnd");
  var endNameInput = document.getElementById("endNameInput");
  var endSequence = document.querySelector(".endSequence");
  var endScoreValue = document.getElementById("endScoreValue");
  var endScoreBlock = document.getElementById("endScoreBlock");
  var endStatsWrap = document.getElementById("endStatsWrap");
  var endNameBlock = document.getElementById("endNameBlock");
  var endSequenceTimers = [];
  var gameOverSfxTimer = 0;
  var state = createState();
  var player = createPlayer();
  player.spinManeuver = { active: false, phase: 0, x0: 0, y0: 0, x1: 0, y1: 0, x2: 0, y2: 0 };
  var bullets = [];
  var asteroids = [];
  var powerups = [];
  var bestStreak = 0;
  var gameOverFx = { active: false, t: 0, reason: "", shown: false, x: 0, y: 0 };
  var missionClearFx = { active: false, phase: "center", t: 0, explodeTimer: 0, exitSpeed: 0, sfxPlayed: false, mode: "cleared" };
  var countdownActive = false;
  var countdownTarget = { x: 0, y: 0 };
  var countdownStartAt = 0;
  var countdownDurationSec = 0;
  var dashGhosts = [];
  var introActive = false;
  var introTimer = 0;
  var introHudHold = false;
  var campaignActive = false;
  var campaignIndex = -1;
  var campaignData = null;
  var campaignId = "";
  var campaignActiveKey = "mathsteroid.campaign.active";
  var campaignStateKeyBase = "mathsteroid.campaign.state.";
  var campaignDataKeyBase = "mathsteroid.campaign.data.";
  var campaignDefaultId = "sector_run";
  var campaignMaxFailures = 3;
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
  var spawnDirectedSparks = fx.spawnDirectedSparks;
  var bgCtl = createBackground(ctx);
  var bg = bgCtl.bg;
  var buildStarfield = bgCtl.buildStarfield;
  var drawStars = bgCtl.drawStars;
  var SHOW_STARS = true;
  var backgroundSprites = [];
  var backgroundReady = [];
  var backgroundIndex = 0;
  var backgroundScroll = 0;
  var backgroundScale = 2.1;
  var beltKey = "dusk";
  var beltIndexMap = {
    dusk: 0,
    ember: 1,
    aurora: 2,
    rift: 3,
    vega: 4,
    void: 5
  };
  var backgroundSources = [
    "images/background8.png",
    "images/background1.png",
    "images/background2.png",
    "images/background3.png",
    "images/background7.png",
    "images/background9.png"
  ];
  for (bi = 0; bi < backgroundSources.length; bi++) {
    bgImg = new Image();
    (function(idx) {
      bgImg.onload = function() {
        backgroundReady[idx] = true;
      };
    })(bi);
    bgImg.src = backgroundSources[bi];
    backgroundSprites.push(bgImg);
    backgroundReady.push(false);
  }
  var bgImg;
  var bi;
  function setBackgroundBelt(key) {
    var nextKey = String(key || "dusk");
    beltKey = nextKey;
    var idx = beltIndexMap[nextKey];
    if (typeof idx !== "number")
      idx = 0;
    backgroundIndex = idx;
    backgroundScroll = 0;
  }
  var asteroidSprites = [];
  var asteroidSpriteReady = [];
  var asteroidSpriteIds = [1, 2, 3, 4, 6];
  for (si = 0; si < asteroidSpriteIds.length; si++) {
    img = new Image();
    (function(idx) {
      img.onload = function() {
        asteroidSpriteReady[idx] = true;
      };
    })(si);
    img.src = "images/asteroid" + asteroidSpriteIds[si] + ".png";
    asteroidSprites.push(img);
    asteroidSpriteReady.push(false);
  }
  var img;
  var si;
  var cooldownIcons = {
    dash: { img: new Image(), ready: false, src: "images/dash.png" },
    shockwave: { img: new Image(), ready: false, src: "images/shockwave.png" },
    flares: { img: new Image(), ready: false, src: "images/flares.png" },
    teleport: { img: new Image(), ready: false, src: "images/teleport.png" }
  };
  Object.keys(cooldownIcons).forEach(function(key) {
    var icon = cooldownIcons[key];
    icon.img.onload = function() {
      icon.ready = true;
    };
    icon.img.src = icon.src;
  });
  var powerupManager = new PowerupManager(state, player);
  function configureAliensDifficulty() {
    var diff = String(state.difficulty || "normal").toLowerCase();
    if (diff === "easy") {
      alienConfig.enabled = false;
      alienConfig.maxOnScreen = 0;
      alienConfig.spawnCooldown = 9999;
    } else if (diff === "normal") {
      alienConfig.enabled = true;
      alienConfig.maxOnScreen = 1;
      alienConfig.spawnCooldown = 30;
    } else if (diff === "hard") {
      alienConfig.enabled = true;
      alienConfig.maxOnScreen = 1;
      alienConfig.spawnCooldown = 22;
    } else if (diff === "brutal") {
      alienConfig.enabled = true;
      alienConfig.maxOnScreen = 2;
      alienConfig.spawnCooldown = 18;
    } else {
      alienConfig.enabled = true;
      alienConfig.maxOnScreen = 1;
      alienConfig.spawnCooldown = 22;
    }
  }
  var shipProfiles = {
    classic: { speed: 440, response: 8, dashDist: 200, dashCooldown: 1.3, shockwaveRadius: 220, shockwaveStrength: 760, shockwaveCooldown: 3.5, ability: "shockwave", accelUp: 4.2, accelDown: 6.5 },
    spire: { speed: 560, response: 14, dashDist: 130, dashCooldown: 1.3, shockwaveRadius: 150, shockwaveStrength: 480, shockwaveCooldown: 3.5, ability: "flares", accelUp: 6, accelDown: 8 },
    am2: { speed: 660, response: 17, dashDist: 130, dashCooldown: 1.9, shockwaveRadius: 160, shockwaveStrength: 520, shockwaveCooldown: 4.2, ability: "spin", accelUp: 7.2, accelDown: 9 }
  };
  function getShipProfile(shipType) {
    var base = { speed: 560, response: 14, dashDist: 130, dashCooldown: 1.3, shockwaveRadius: 160, shockwaveStrength: 520, shockwaveCooldown: 3.5, ability: "shockwave" };
    return shipProfiles[shipType] ? Object.assign({}, base, shipProfiles[shipType]) : base;
  }
  function requestFullscreen() {
    try {
      var el = document.documentElement;
      if (!document.fullscreenElement && el && el.requestFullscreen) {
        el.requestFullscreen().catch(function() {
        });
      }
    } catch (e) {
    }
  }
  function primeFullscreen() {
    if (document.fullscreenElement)
      return;
    var fired = false;
    function tryFs() {
      if (fired)
        return;
      fired = true;
      requestFullscreen();
    }
    window.addEventListener("pointerdown", tryFs, { once: true });
    window.addEventListener("keydown", tryFs, { once: true });
  }
  var keys = /* @__PURE__ */ new Set();
  var audioPrimed = false;
  var screenshotMode = false;
  function isTextInput(el) {
    if (!el)
      return false;
    var tag = (el.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
  }
  window.addEventListener("keydown", function(e) {
    if (isTextInput(document.activeElement))
      return;
    var k = (e.key || "").toLowerCase();
    var prevent = ["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s", "p", "r", "m", "z", "x", "c", "b", " ", "spacebar"];
    if (prevent.indexOf(k) !== -1)
      e.preventDefault();
    keys.add(k);
    if (!audioPrimed) {
      unlockSfx(state);
      audioPrimed = true;
    }
    if (k === "p")
      togglePause();
    if (k === "0")
      toggleScreenshot();
    if (k === "r")
      hardRestart();
    if (k === "m")
      openSettings();
    if (k === "z")
      fire();
    if (k === "x")
      secondaryFire();
    if (k === "c")
      shockwave();
    if (k === "b") {
      if (!mousepadActive) {
        setMousepadActive(true);
        showToast("MOUSEPAD: " + mousepadMode.toUpperCase());
      } else if (mousepadMode === "hybrid") {
        setMousepadMode("pad");
        showToast("MOUSEPAD: PAD");
      } else {
        setMousepadActive(false);
        showToast("MOUSEPAD OFF");
        setMousepadMode("hybrid");
      }
    }
    if (k === " " || k === "spacebar")
      dash();
  }, { passive: false });
  window.addEventListener("keyup", function(e) {
    if (isTextInput(document.activeElement))
      return;
    keys.delete((e.key || "").toLowerCase());
  });
  var pointerDown = false;
  var lastPointerX = null;
  var lastPointerY = null;
  var virtualPad = document.getElementById("virtualPad");
  var controlPad = document.getElementById("controlPad");
  var padStatus = document.getElementById("padStatus");
  var virtualKnob = document.getElementById("virtualKnob");
  var padMode = document.getElementById("padMode");
  var mousepadActive = false;
  var mousepadPaused = false;
  var mousepadSensitivityPad = 0.3;
  var mousepadSensitivityPadMode = 0.18;
  var virtualAxes = { x: 0, y: 0 };
  var padCursor = { x: 0, y: 0 };
  var mousepadMode = "hybrid";
  var mouseImpulse = { x: 0, y: 0 };
  var mousepadDeadzonePad = 0.18;
  function updateCursorVisibility() {
    if (mousepadActive)
      return;
    var hide = state.running && !state.paused && !screenshotMode;
    document.body.style.cursor = hide ? "none" : "";
  }
  function setMousepadActive(isOn) {
    mousepadActive = !!isOn;
    if (controlPad)
      controlPad.classList.toggle("active", mousepadActive);
    if (padStatus)
      padStatus.textContent = mousepadActive ? "ACTIVE" : "OFF";
    if (!mousepadActive) {
      virtualAxes.x = 0;
      virtualAxes.y = 0;
      padCursor.x = 0;
      padCursor.y = 0;
      if (virtualKnob) {
        virtualKnob.style.transform = "translate(-50%, -50%)";
      }
      document.body.style.cursor = "";
      if (document.exitPointerLock)
        document.exitPointerLock();
    } else {
      padCursor.x = 0;
      padCursor.y = 0;
      updateVirtualFromCursor();
      document.body.style.cursor = "none";
      if ((mousepadMode === "fps" || mousepadMode === "hybrid") && virtualPad && virtualPad.requestPointerLock) {
        virtualPad.requestPointerLock();
      }
    }
  }
  if (controlPad) {
    setMousepadActive(false);
  }
  if (inputs.questionMode) {
    inputs.questionMode.addEventListener("change", updateDecoyFunctionAvailability);
  }
  function setMousepadMode(mode) {
    if (mode === "pad") {
      mousepadMode = "pad";
    } else {
      mousepadMode = "hybrid";
    }
    if (padMode) {
      padMode.textContent = mousepadMode === "hybrid" ? "HYBRID" : "PAD";
    }
    mouseImpulse.x = 0;
    mouseImpulse.y = 0;
    if (mousepadActive && mousepadMode === "hybrid" && virtualPad && virtualPad.requestPointerLock) {
      virtualPad.requestPointerLock();
    } else if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }
  if (virtualPad) {
    virtualPad.addEventListener("pointerdown", function(e) {
      if (!mousepadActive)
        return;
      var rect = virtualPad.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var maxR = Math.min(rect.width, rect.height) * 0.42;
      padCursor.x = clamp(e.clientX - cx, -maxR, maxR);
      padCursor.y = clamp(e.clientY - cy, -maxR, maxR);
      updateVirtualFromCursor();
    });
  }
  function updateVirtualFromCursor() {
    if (!virtualPad)
      return;
    var rect = virtualPad.getBoundingClientRect();
    var maxR = Math.min(rect.width, rect.height) * 0.42;
    var nx = maxR > 0 ? padCursor.x / maxR : 0;
    var ny = maxR > 0 ? padCursor.y / maxR : 0;
    virtualAxes.x = clamp(nx, -1, 1);
    virtualAxes.y = clamp(ny, -1, 1);
    if (virtualKnob) {
      var cx = clamp(padCursor.x, -maxR, maxR);
      var cy = clamp(padCursor.y, -maxR, maxR);
      virtualKnob.style.transform = "translate(calc(-50% + " + cx + "px), calc(-50% + " + cy + "px))";
    }
  }
  canvas.addEventListener("pointerdown", function(e) {
    pointerDown = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    fire();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function(e) {
    if (!pointerDown)
      return;
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
    player.x = clamp(player.x, player.w / 2 + 10, r.width - player.w / 2 - 10);
    player.y = clamp(player.y, topLimit + player.h / 2 + 6, bottomLimit - player.h / 2);
  });
  canvas.addEventListener("pointerup", function() {
    pointerDown = false;
    lastPointerX = null;
    lastPointerY = null;
  });
  window.addEventListener("mousemove", function(e) {
    if (!mousepadActive)
      return;
    if (virtualPad && (mousepadMode === "pad" || mousepadMode === "hybrid")) {
      var rect = virtualPad.getBoundingClientRect();
      var maxR = Math.min(rect.width, rect.height) * 0.42;
      var sens = mousepadMode === "hybrid" ? mousepadSensitivityPad * 2.4 : mousepadSensitivityPadMode;
      padCursor.x = clamp(padCursor.x + (e.movementX || 0) * sens, -maxR, maxR);
      padCursor.y = clamp(padCursor.y + (e.movementY || 0) * sens, -maxR, maxR);
      updateVirtualFromCursor();
      return;
    }
    if (mousepadMode === "fps") {
      return;
    }
    if (!state.running || state.paused || state.over)
      return;
    var dx = e.movementX || 0;
    var dy = e.movementY || 0;
    if (dx === 0 && dy === 0)
      return;
    var r = canvas.getBoundingClientRect();
    var hudH = document.getElementById("hud").getBoundingClientRect().height;
    var topLimit = hudH + 14;
    var bottomLimit = r.height - 18;
    player.x += dx * mousepadSensitivityPad;
    player.y += dy * mousepadSensitivityPad;
    player.x = clamp(player.x, player.w / 2 + 10, r.width - player.w / 2 - 10);
    player.y = clamp(player.y, topLimit + player.h / 2 + 6, bottomLimit - player.h / 2);
  });
  function resize() {
    var shell = document.getElementById("gameShell");
    var r = shell.getBoundingClientRect();
    var maxDpr = isElectron ? 1 : 1.25;
    var dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
    canvas.width = Math.floor(r.width * dpr);
    canvas.height = Math.floor(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var w = r.width;
    var h = r.height;
    view.w = w;
    view.h = h;
    view.hudH = document.getElementById("hud").getBoundingClientRect().height;
    player.x = clamp(player.x || w / 2, player.w / 2 + 10, w - player.w / 2 - 10);
    player.y = clamp(player.y || h - 58, 80, h - 58);
    buildStarfield(w, h);
    bg.nebula = [];
    var g1 = ctx.createRadialGradient(w * 0.22, h * 0.18, 20, w * 0.22, h * 0.18, Math.max(w, h) * 0.55);
    g1.addColorStop(0, "rgba(175,0,111,.22)");
    g1.addColorStop(1, "rgba(0,0,0,0)");
    bg.nebula.push(g1);
    var g2 = ctx.createRadialGradient(w * 0.78, h * 0.24, 20, w * 0.78, h * 0.24, Math.max(w, h) * 0.6);
    g2.addColorStop(0, "rgba(0,229,255,.18)");
    g2.addColorStop(1, "rgba(0,0,0,0)");
    bg.nebula.push(g2);
    var g3 = ctx.createRadialGradient(w * 0.55, h * 0.62, 20, w * 0.55, h * 0.62, Math.max(w, h) * 0.55);
    g3.addColorStop(0, "rgba(255,221,0,.10)");
    g3.addColorStop(1, "rgba(0,0,0,0)");
    bg.nebula.push(g3);
  }
  window.addEventListener("resize", resize);
  function getQuestionRawText() {
    if (state.over)
      return "?";
    if (state.questionMode === "rational_frac" || state.questionMode === "rational_dec") {
      return String(state.rationalQuestion || "?") + " = ?";
    }
    if (state.questionMode === "square_shoot") {
      return String(state.a) + "\xB2 = ?";
    }
    if (state.questionMode === "square_root") {
      var sq = state.squareValue || state.a * state.a;
      return "\u221A" + String(sq) + " = ?";
    }
    var op = isAdditionMode() ? "+" : "x";
    return state.a + " " + op + " " + state.b + " = ?";
  }
  function getQuestionText() {
    return parseRepeatingText(getQuestionRawText()).display;
  }
  function syncHud() {
    if (state.questionMode === "rational_frac" || state.questionMode === "rational_dec") {
      promptText.innerHTML = formatRepeatingMarkup(getQuestionRawText());
    } else {
      promptText.textContent = getQuestionText();
    }
    scoreText.textContent = String(state.score);
    streakText.textContent = String(state.streak);
    levelText.textContent = String(state.level);
    livesText.textContent = String(state.lives);
    if (hullText) {
      hullText.textContent = Math.round(clamp(player.hull, 0, 1) * 100) + "%";
    }
    updateTimerHud();
    btnPause.textContent = state.paused ? "RESUME (P)" : "PAUSE (P)";
  }
  function updateTimerHud() {
    if (!timerText)
      return;
    if (state.timeLimitSec > 0) {
      var elapsed = getElapsedSeconds();
      var remaining = Math.max(0, state.timeLimitSec - elapsed);
      var mins = Math.floor(remaining / 60);
      var secs = Math.floor(remaining % 60);
      var mm = String(mins).padStart(2, "0");
      var ss = String(secs).padStart(2, "0");
      timerText.textContent = mm + ":" + ss;
    } else {
      timerText.textContent = "ENDLESS";
    }
  }
  function getElapsedSeconds() {
    var now = performance.now();
    var pausedTotal = state.pauseAccum || 0;
    if (state.pauseStart)
      pausedTotal += now - state.pauseStart;
    return Math.max(0, (now - state.startTime - pausedTotal) / 1e3);
  }
  function syncTimerPause() {
    if (state.paused || screenshotMode) {
      if (!state.pauseStart)
        state.pauseStart = performance.now();
    } else if (state.pauseStart) {
      state.pauseAccum += performance.now() - state.pauseStart;
      state.pauseStart = 0;
    }
  }
  var toastTimer = null;
  var toastTypeTimer = null;
  function showToast(msg) {
    var text = String(msg || "");
    toast.textContent = "";
    toast.classList.add("show");
    clearTimeout(toastTimer);
    if (toastTypeTimer) {
      clearInterval(toastTypeTimer);
      toastTypeTimer = null;
    }
    var idx = 0;
    var typeMs = 28;
    toastTypeTimer = setInterval(function() {
      idx++;
      toast.textContent = text.slice(0, idx);
      if (idx >= text.length) {
        clearInterval(toastTypeTimer);
        toastTypeTimer = null;
        toastTimer = setTimeout(function() {
          toast.classList.remove("show");
        }, 850);
      }
    }, typeMs);
  }
  function getCampaignStateKey(id) {
    return campaignStateKeyBase + id;
  }
  function getCampaignDataKey(id) {
    return campaignDataKeyBase + id;
  }
  function getStoredCampaignId() {
    try {
      return localStorage.getItem(campaignActiveKey) || "";
    } catch (e) {
      return "";
    }
  }
  function setStoredCampaignId(id) {
    try {
      localStorage.setItem(campaignActiveKey, id);
    } catch (e) {
    }
  }
  function loadCampaignState() {
    var key = getCampaignStateKey(campaignId || campaignDefaultId);
    try {
      var raw = localStorage.getItem(key);
      if (raw)
        return JSON.parse(raw);
    } catch (e) {
    }
    if ((campaignId || campaignDefaultId) === campaignDefaultId) {
      try {
        var legacy = localStorage.getItem("mathsteroid.campaign.state");
        if (legacy)
          return JSON.parse(legacy);
      } catch (e) {
      }
    }
    return null;
  }
  function saveCampaignState(state2) {
    var key = getCampaignStateKey(campaignId || campaignDefaultId);
    try {
      localStorage.setItem(key, JSON.stringify(state2));
    } catch (e) {
    }
  }
  function loadCampaignData() {
    if (campaignData)
      return campaignData;
    try {
      var key = getCampaignDataKey(campaignId || campaignDefaultId);
      var raw = localStorage.getItem(key);
      if (raw)
        campaignData = JSON.parse(raw);
    } catch (e) {
      campaignData = null;
    }
    if (!campaignData && (campaignId || campaignDefaultId) === campaignDefaultId) {
      try {
        var legacy = localStorage.getItem("mathsteroid.campaign.data");
        if (legacy)
          campaignData = JSON.parse(legacy);
      } catch (e) {
        campaignData = null;
      }
    }
    return campaignData;
  }
  function startNextCampaignMission(nextIdx) {
    var data = loadCampaignData();
    if (!data || !data.missions || !data.missions[nextIdx])
      return false;
    var cfg = data.missions[nextIdx].config || {};
    var nextId = campaignId || campaignDefaultId;
    window.location.href = "home.html?campaignBrief=1&campaignIndex=" + nextIdx + "&campaignId=" + encodeURIComponent(nextId);
    return true;
  }
  function normalizeRangesFromInputs() {
    return normalizeRanges(inputs);
  }
  function isAdditionMode() {
    return state.questionMode === "add_digits2" || state.questionMode === "add_digits3" || state.questionMode === "add_classic2" || state.questionMode === "add_classic3";
  }
  function isSquareMode() {
    return state.questionMode === "square_shoot" || state.questionMode === "square_root";
  }
  function isRationalMode() {
    return state.questionMode === "rational_frac" || state.questionMode === "rational_dec";
  }
  function isDigitMode() {
    return state.questionMode === "digits3" || state.questionMode === "digits2" || state.questionMode === "add_digits2" || state.questionMode === "add_digits3";
  }
  function isClassicMode() {
    return state.questionMode === "classic" || state.questionMode === "classic2" || state.questionMode === "classic3" || state.questionMode === "add_classic2" || state.questionMode === "add_classic3" || isSquareMode() || isRationalMode();
  }
  function isClassicModeValue(mode) {
    return mode === "classic" || mode === "classic2" || mode === "classic3" || mode === "add_classic2" || mode === "add_classic3" || mode === "square_shoot" || mode === "square_root" || mode === "rational_frac" || mode === "rational_dec";
  }
  function updateDecoyFunctionAvailability() {
    if (!inputs.decoyFunction)
      return;
    var mode = inputs.questionMode ? String(inputs.questionMode.value || "") : "";
    inputs.decoyFunction.disabled = !isClassicModeValue(mode);
  }
  function formatRepeatingDecimal(numer, denom) {
    if (!denom)
      return "?";
    var sign = numer < 0 ? "-" : "";
    var n = Math.abs(numer);
    var d = Math.abs(denom);
    var intPart = Math.floor(n / d);
    var rem = n % d;
    if (rem === 0) {
      return sign + String(intPart);
    }
    var digits = [];
    var seen = {};
    var repeatIndex = -1;
    var guard = 0;
    while (rem !== 0 && seen[rem] === void 0 && guard++ < 30) {
      seen[rem] = digits.length;
      rem *= 10;
      var digit = Math.floor(rem / d);
      digits.push(String(digit));
      rem = rem % d;
    }
    if (rem !== 0 && seen[rem] !== void 0) {
      repeatIndex = seen[rem];
    }
    var nonRepeat = repeatIndex >= 0 ? digits.slice(0, repeatIndex).join("") : digits.join("");
    var repeat = repeatIndex >= 0 ? digits.slice(repeatIndex).join("") : "";
    if (repeat) {
      return sign + String(intPart) + "." + nonRepeat + "~" + repeat + "~";
    }
    return sign + String(intPart) + "." + nonRepeat;
  }
  function parseRepeatingText(text) {
    var raw = text == null ? "" : String(text);
    var start = raw.indexOf("~");
    if (start === -1)
      return { display: raw, repeatStart: -1, repeatLen: 0 };
    var end = raw.indexOf("~", start + 1);
    if (end === -1)
      return { display: raw.replace(/~/g, ""), repeatStart: -1, repeatLen: 0 };
    var display = raw.slice(0, start) + raw.slice(start + 1, end) + raw.slice(end + 1);
    var repeatStart = start;
    var repeatLen = end - start - 1;
    return { display, repeatStart, repeatLen };
  }
  function formatRepeatingMarkup(text) {
    var parsed = parseRepeatingText(text);
    if (parsed.repeatStart < 0)
      return parsed.display;
    var before = parsed.display.slice(0, parsed.repeatStart);
    var repeat = parsed.display.slice(parsed.repeatStart, parsed.repeatStart + parsed.repeatLen);
    var after = parsed.display.slice(parsed.repeatStart + parsed.repeatLen);
    return before + '<span class="repeatOverline">' + repeat + "</span>" + after;
  }
  function buildRationalPool(minDen, maxDen) {
    var out = [];
    for (var d = minDen; d <= maxDen; d++) {
      if (d <= 0)
        continue;
      var dec = formatRepeatingDecimal(1, d);
      out.push({ den: d, frac: "1/" + d, dec });
    }
    return out;
  }
  function shouldEndByQuestionLimit() {
    return state.questionLimit > 0 && state.questionsCompleted >= state.questionLimit;
  }
  function nextProblem() {
    var rr = normalizeRangesFromInputs();
    state.redemptionUsed = false;
    if (isSquareMode()) {
      var base = randi(rr.a1, rr.a2);
      state.a = base;
      state.b = state.questionMode === "square_root" ? 1 : base;
      state.squareValue = base * base;
      state.answer = state.questionMode === "square_root" ? base : state.squareValue;
      state.waveId++;
      syncHud();
      prepareWave();
      return;
    }
    if (isRationalMode()) {
      var minDen = clamp(rr.a1, 2, 12);
      var maxDen = clamp(rr.a2, 2, 12);
      if (maxDen < minDen) {
        var tmpDen = minDen;
        minDen = maxDen;
        maxDen = tmpDen;
      }
      var pool = buildRationalPool(minDen, maxDen);
      if (!pool.length)
        pool = buildRationalPool(2, 12);
      var entry = pool[randi(0, pool.length - 1)];
      state.a = 1;
      state.b = entry.den;
      state.rationalPool = pool;
      state.rationalQuestion = state.questionMode === "rational_frac" ? entry.dec : entry.frac;
      state.answer = state.questionMode === "rational_frac" ? entry.frac : entry.dec;
      state.waveId++;
      syncHud();
      prepareWave();
      return;
    }
    if (isDigitMode()) {
      if (state.questionMode === "digits2") {
        state.a = randi(10, 99);
        state.b = randi(2, 9);
      } else if (state.questionMode === "digits3") {
        state.a = randi(100, 999);
        state.b = randi(2, 9);
      } else if (state.questionMode === "add_digits2") {
        state.a = randi(10, 99);
        state.b = randi(10, 99);
      } else {
        state.a = randi(100, 999);
        state.b = randi(100, 999);
      }
    } else {
      if (state.questionMode === "add_classic2") {
        state.a = randi(10, 99);
        state.b = randi(10, 99);
      } else if (state.questionMode === "add_classic3") {
        state.a = randi(100, 999);
        state.b = randi(100, 999);
      } else if (state.questionMode === "classic2") {
        state.a = randi(10, 99);
        state.b = randi(2, 9);
      } else if (state.questionMode === "classic3") {
        state.a = randi(100, 999);
        state.b = randi(2, 9);
      } else {
        state.a = randi(rr.a1, rr.a2);
        state.b = randi(rr.b1, rr.b2);
      }
    }
    state.answer = isAdditionMode() ? state.a + state.b : state.a * state.b;
    if (isDigitMode()) {
      var ansStr = String(state.answer);
      state.answerDigits = ansStr.split("");
      state.digitsLeft = state.answerDigits.length;
      state.correctDigit = Number(state.answerDigits[state.digitsLeft - 1]);
    }
    state.waveId++;
    syncHud();
    prepareWave();
  }
  function getAlienQuestion() {
    var isAdd = isAdditionMode();
    var answer = randi(2, 15);
    var a;
    var b;
    var op;
    if (isAdd) {
      b = randi(1, 9);
      a = answer + b;
      op = "\u2212";
    } else {
      b = randi(2, 9);
      a = answer * b;
      op = "\xF7";
    }
    return { question: a + " " + op + " " + b, answer };
  }
  function enforceUnitsDigit(value, correct) {
    var target = Math.abs(correct) % 10;
    var base = Math.floor(Math.abs(value) / 10) * 10 + target;
    if (base === correct)
      base += 10;
    return base;
  }
  function shuffleDigitsKeepUnits(value) {
    var s = String(Math.abs(value));
    if (s.length <= 1) {
      return value + 10;
    }
    var last = s[s.length - 1];
    var head = s.slice(0, -1).split("");
    var tries = 0;
    var shuffled = head.slice();
    while (tries++ < 8) {
      for (var i = shuffled.length - 1; i > 0; i--) {
        var j = randi(0, i);
        var tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
      }
      if (shuffled.join("") !== head.join(""))
        break;
    }
    return parseInt(shuffled.join("") + last, 10);
  }
  function baseAddDecoy(correct) {
    var rollAdd = Math.random();
    if (rollAdd < 0.6) {
      return correct + randi(-12, 12);
    }
    if (rollAdd < 0.88) {
      var axAdd = state.a + (Math.random() < 0.5 ? -1 : 1);
      var bxAdd = state.b + (Math.random() < 0.5 ? -1 : 1);
      return Math.random() < 0.5 ? axAdd + state.b : state.a + bxAdd;
    }
    return correct + randi(-25, 25);
  }
  function baseMulDecoy(correct) {
    var roll = Math.random();
    if (roll < 0.65) {
      var delta = randi(1, 10) * (Math.random() < 0.5 ? -1 : 1);
      return correct + delta;
    }
    if (roll < 0.88) {
      var ax = state.a + (Math.random() < 0.5 ? -1 : 1);
      var bx = state.b + (Math.random() < 0.5 ? -1 : 1);
      return Math.random() < 0.5 ? ax * state.b : state.a * bx;
    }
    return correct + randi(-25, 25);
  }
  function genRationalDecoys(correct, count) {
    var pool = state.rationalPool && state.rationalPool.length ? state.rationalPool : buildRationalPool(2, 12);
    var useFraction = state.questionMode === "rational_frac";
    var out = /* @__PURE__ */ new Set();
    var tries = 0;
    while (out.size < count && tries++ < 200) {
      var entry = pool[randi(0, pool.length - 1)];
      var label = useFraction ? entry.frac : entry.dec;
      if (label === correct)
        continue;
      out.add(label);
    }
    if (out.size < count) {
      for (var i = 0; i < pool.length && out.size < count; i++) {
        var label2 = useFraction ? pool[i].frac : pool[i].dec;
        if (label2 !== correct)
          out.add(label2);
      }
    }
    return Array.from(out);
  }
  function genClassicDecoys(correct, count) {
    var out = /* @__PURE__ */ new Set();
    var tries = 0;
    var limit = 240;
    var mode = state.decoyFunction || "units_bias";
    var isAdd = isAdditionMode();
    var maxDelta = isAdd ? 60 : 40;
    while (out.size < count && tries++ < limit) {
      var d;
      if (mode === "structured") {
        if (isAdd) {
          var axAdd = state.a + (Math.random() < 0.5 ? -1 : 1);
          var bxAdd = state.b + (Math.random() < 0.5 ? -1 : 1);
          d = Math.random() < 0.5 ? axAdd + state.b : state.a + bxAdd;
        } else {
          var ax = state.a + (Math.random() < 0.5 ? -1 : 1);
          var bx = state.b + (Math.random() < 0.5 ? -1 : 1);
          d = Math.random() < 0.5 ? ax * state.b : state.a * bx;
        }
        d = enforceUnitsDigit(d, correct);
      } else if (mode === "digit_shuffle") {
        d = shuffleDigitsKeepUnits(correct);
      } else {
        d = isAdd ? baseAddDecoy(correct) : baseMulDecoy(correct);
        if (Math.random() < 0.8) {
          d = enforceUnitsDigit(d, correct);
        }
      }
      if (d === correct)
        continue;
      if (d < 0)
        continue;
      if (Math.abs(d - correct) > maxDelta)
        continue;
      out.add(d);
    }
    while (out.size < count) {
      var fallback = isAdd ? baseAddDecoy(correct) : baseMulDecoy(correct);
      if (mode !== "digit_shuffle")
        fallback = enforceUnitsDigit(fallback, correct);
      if (fallback !== correct && fallback >= 0)
        out.add(fallback);
    }
    return Array.from(out);
  }
  function genDecoys(correct, count) {
    if (isRationalMode()) {
      return genRationalDecoys(correct, count);
    }
    if (isClassicMode()) {
      return genClassicDecoys(correct, count);
    }
    if (isAdditionMode()) {
      var outAdd = /* @__PURE__ */ new Set();
      var triesAdd = 0;
      while (outAdd.size < count && triesAdd++ < 200) {
        var dAdd = baseAddDecoy(correct);
        if (dAdd === correct)
          continue;
        if (dAdd < 0)
          continue;
        if (Math.abs(dAdd - correct) > 60)
          continue;
        outAdd.add(dAdd);
      }
      while (outAdd.size < count) {
        var ddAdd = Math.max(0, correct + randi(-15, 15));
        if (ddAdd !== correct)
          outAdd.add(ddAdd);
      }
      return Array.from(outAdd);
    }
    var out = /* @__PURE__ */ new Set();
    var maxTries = 200;
    var tries = 0;
    while (out.size < count && tries++ < maxTries) {
      var d = baseMulDecoy(correct);
      if (d === correct)
        continue;
      if (d < 0)
        continue;
      if (Math.abs(d - correct) > 40)
        continue;
      out.add(d);
    }
    while (out.size < count) {
      var dd = Math.max(0, correct + randi(-12, 12));
      if (dd !== correct)
        out.add(dd);
    }
    return Array.from(out);
  }
  function pickCorrectDigit() {
    if (!state.answerDigits || state.digitsLeft <= 0)
      return null;
    return Number(state.answerDigits[state.digitsLeft - 1]);
  }
  function genDigitDecoys(correctDigit, count) {
    var out = /* @__PURE__ */ new Set();
    var tries = 0;
    while (out.size < count && tries++ < 120) {
      var d = randi(0, 9);
      if (d === correctDigit)
        continue;
      out.add(d);
    }
    while (out.size < count) {
      var dd = (correctDigit + randi(1, 9)) % 10;
      if (dd !== correctDigit)
        out.add(dd);
    }
    return Array.from(out);
  }
  function buildDigitDecoyBag() {
    var diff = String(state.difficulty || "normal").toLowerCase();
    var pool;
    var repeats = 2;
    if (diff === "easy") {
      pool = state.waveDecoys;
    } else if (diff === "normal") {
      pool = [];
      for (var d = 0; d <= 9; d++) {
        if (d !== state.correctDigit)
          pool.push(d);
      }
      for (var i = pool.length - 1; i > 0; i--) {
        var j = randi(0, i);
        var tmp = pool[i];
        pool[i] = pool[j];
        pool[j] = tmp;
      }
      pool = pool.slice(0, 6);
      repeats = 1;
    } else {
      pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    }
    var bag = [];
    for (var i = 0; i < pool.length; i++) {
      var d = pool[i];
      if (d === state.correctDigit)
        continue;
      for (var r = 0; r < repeats; r++)
        bag.push(d);
    }
    for (var s = bag.length - 1; s > 0; s--) {
      var j = randi(0, s);
      var tmp = bag[s];
      bag[s] = bag[j];
      bag[j] = tmp;
    }
    return bag;
  }
  function prepareWave() {
    var decoyCount = Math.max(1, Math.round(state.decoys * 0.3));
    if (isDigitMode()) {
      if (state.correctDigit == null)
        state.correctDigit = pickCorrectDigit();
      state.waveDecoys = genDigitDecoys(state.correctDigit, decoyCount);
      state.waveDecoyBag = buildDigitDecoyBag();
    } else {
      state.waveDecoys = genDecoys(state.answer, decoyCount);
      state.waveDecoyBag = null;
    }
    state.correctInPlay = false;
    state.correctAsteroidId = 0;
    var minDecoysFirst = 2;
    var maxDecoysFirst = Math.min(5, 2 + decoyCount);
    state.correctDelayRemaining = randi(minDecoysFirst, maxDecoysFirst);
    state.spawnTimer = 0;
  }
  function pickSpawnX(w) {
    for (var tries = 0; tries < 10; tries++) {
      var x = rand(48, w - 48);
      var ok = true;
      for (var i = 0; i < asteroids.length; i++) {
        var a = asteroids[i];
        if (a.y < 180 && Math.abs(a.x - x) < 48) {
          ok = false;
          break;
        }
      }
      if (ok)
        return x;
    }
    return rand(48, w - 48);
  }
  function spawnAsteroid(label, isCorrect) {
    var r = canvas.getBoundingClientRect();
    var w = r.width;
    var levelFactor = 1;
    var diff = String(state.difficulty || "normal").toLowerCase();
    if (diff === "easy")
      levelFactor = 0.45;
    else if (diff === "normal")
      levelFactor = 0.7;
    else if (diff === "brutal")
      levelFactor = 1.25;
    var baseVy = 100 + state.level * 14 * levelFactor;
    var speedScale = state.baseSpeed * (1 + state.ddSpeedBonus);
    var size = isCorrect ? rand(30, 38) : rand(26, 36);
    var id = ++state.asteroidId;
    var driftAmp = rand(8, 20);
    var driftRate = rand(0.6, 1.4);
    var driftPhase = rand(0, Math.PI * 2);
    var a = {
      id,
      x: pickSpawnX(w),
      y: -rand(26, 88),
      vx: rand(-35, 35),
      vy: baseVy * speedScale * (isCorrect ? 1.03 : rand(0.94, 1.1)),
      baseVy: baseVy * speedScale,
      r: size,
      label,
      isCorrect: !!isCorrect,
      waveId: state.waveId,
      spin: rand(-2.6, 2.6),
      rot: rand(0, Math.PI * 2),
      seed: Math.random() * 1e3,
      hit: false,
      warned: false,
      ghost: false,
      driftAmp,
      driftRate,
      driftPhase,
      spriteIndex: randi(0, asteroidSprites.length - 1)
    };
    if (isDigitMode() && isCorrect) {
      var digitHits = parseInt(label, 10);
      if (Number.isNaN(digitHits) || digitHits <= 1)
        digitHits = 1;
      a.hitsRemaining = digitHits;
      a.hitsTotal = digitHits;
    }
    asteroids.push(a);
    if (isCorrect) {
      state.correctInPlay = true;
      state.correctAsteroidId = id;
    }
  }
  function spawnDecoyOnly() {
    var pool = state.waveDecoys && state.waveDecoys.length ? state.waveDecoys : [Math.max(0, state.answer + randi(-10, 10))];
    var label = pool[randi(0, pool.length - 1)];
    if (isDigitMode()) {
      if (!state.waveDecoyBag || !state.waveDecoyBag.length) {
        state.waveDecoyBag = buildDigitDecoyBag();
      }
      if (state.waveDecoyBag.length) {
        label = state.waveDecoyBag.pop();
      }
    }
    spawnAsteroid(label, false);
  }
  function spawnOneFromWave() {
    if (!state.correctInPlay) {
      if (state.correctDelayRemaining > 0) {
        spawnDecoyOnly();
        state.correctDelayRemaining--;
      } else {
        var label = isDigitMode() ? state.correctDigit : state.answer;
        spawnAsteroid(label, true);
      }
    } else {
      spawnDecoyOnly();
    }
    if (state.level >= 4 && Math.random() < 0.28) {
      var r = canvas.getBoundingClientRect();
      var w = r.width;
      var baseVy = 92 + state.level * 10;
      var speedScale = state.baseSpeed * (1 + state.ddSpeedBonus);
      asteroids.push({
        id: ++state.asteroidId,
        x: rand(40, w - 40),
        y: -rand(220, 520),
        vx: rand(-25, 25),
        vy: baseVy * speedScale * rand(0.75, 1),
        baseVy: baseVy * speedScale,
        r: rand(14, 22),
        label: null,
        isCorrect: false,
        waveId: -1,
        spin: rand(-3.2, 3.2),
        rot: rand(0, Math.PI * 2),
        seed: Math.random() * 1e3,
        hit: false,
        ghost: true,
        driftAmp: rand(6, 14),
        driftRate: rand(0.6, 1.5),
        driftPhase: rand(0, Math.PI * 2),
        spriteIndex: randi(0, asteroidSprites.length - 1)
      });
    }
  }
  function spawnPowerup(type, group) {
    var r = canvas.getBoundingClientRect();
    var spin = rand(0.45, 1.1);
    if (Math.random() < 0.5)
      spin *= -1;
    powerups.push({
      x: rand(60, r.width - 60),
      y: -30,
      vy: rand(90, 140),
      r: 16,
      rot: rand(0, Math.PI * 2),
      rotSpeed: spin,
      type,
      group
    });
  }
  function maybeDropPowerup() {
    if (Math.random() > 0.7)
      return;
    var roll = Math.random();
    var lowHull = player.hull < 0.3;
    if (lowHull && roll < 0.75) {
      var secondary = ["time", "magnet", "emp", "lock"];
      var sType = Math.random() < 0.7 ? "repair" : secondary[Math.floor(Math.random() * secondary.length)];
      spawnPowerup(sType, "secondary");
      return;
    }
    if (roll < 0.45) {
      var offense = ["dual", "laser", "fire", "ice", "electric", "pierce", "plasma", "rail"];
      var oType = offense[Math.floor(Math.random() * offense.length)];
      spawnPowerup(oType, "offense");
    } else if (roll < 0.7) {
      var dType = Math.random() < 0.6 ? "shield" : "armor";
      spawnPowerup(dType, "defense");
    } else {
      var secondary = ["repair", "time", "magnet", "emp", "lock"];
      var sType = secondary[Math.floor(Math.random() * secondary.length)];
      spawnPowerup(sType, "secondary");
    }
  }
  function applyPowerup(p) {
    if (p.group === "offense") {
      player.blasterMode = p.type;
      player.blasterTimer = 12;
      if (p.type === "dual")
        showToast("OFFENSE \u2192 DUAL BLASTER");
      else if (p.type === "laser")
        showToast("OFFENSE \u2192 LASER BURST");
      else if (p.type === "fire")
        showToast("OFFENSE \u2192 FIREBALL");
      else if (p.type === "ice")
        showToast("OFFENSE \u2192 ICE SHARDS");
      else if (p.type === "electric")
        showToast("OFFENSE \u2192 ELECTRIC BOLTS");
      else if (p.type === "pierce")
        showToast("OFFENSE \u2192 LOOK UP SHOT");
      else if (p.type === "plasma")
        showToast("OFFENSE \u2192 PLASMA ORB");
      else if (p.type === "rail")
        showToast("OFFENSE \u2192 RAIL BEAM");
    } else if (p.group === "defense" && p.type === "shield") {
      player.defenseMode = "shield";
      player.defenseTimer = 10;
      showToast("DEFENSE \u2192 SHIELD");
    } else if (p.group === "defense" && p.type === "armor") {
      player.defenseMode = "armor";
      player.defenseTimer = 12;
      showToast("DEFENSE \u2192 ARMOR");
    } else if (p.group === "secondary") {
      if (p.type === "repair") {
        player.hull = clamp(player.hull + 0.35, 0, 1);
        spawnRing(player.x, player.y, 18);
        spawnParticles(player.x, player.y, "correct");
        showToast("HULL REPAIRED");
      } else if (p.type === "emp") {
        state.empTimer = Math.max(state.empTimer, 2);
        spawnRing(player.x, player.y, 24);
        showToast("SECONDARY \u2192 EMP BURST");
        for (var ai = asteroids.length - 1; ai >= 0; ai--) {
          var a = asteroids[ai];
          if (!a.isCorrect || a.waveId !== state.waveId) {
            spawnParticles(a.x, a.y, "spark");
            spawnParticles(a.x, a.y, "smoke");
            asteroids.splice(ai, 1);
          }
        }
      } else {
        player.secondaryMode = p.type;
        player.secondaryCharges = 1;
        if (p.type === "time")
          showToast("SECONDARY \u2192 TIME DILATION (X)");
        else if (p.type === "magnet")
          showToast("SECONDARY \u2192 MAGNET SWEEP (X)");
        else if (p.type === "emp")
          showToast("SECONDARY \u2192 EMP BURST (X)");
        else if (p.type === "lock")
          showToast("SECONDARY \u2192 TARGET LOCK (X)");
      }
    }
  }
  function spawnSplitAsteroids(a) {
    var baseVy = a.baseVy != null ? a.baseVy : a.vy;
    for (var i = 0; i < 2; i++) {
      var side = i === 0 ? -1 : 1;
      asteroids.push({
        id: ++state.asteroidId,
        x: a.x + side * a.r * 0.35,
        y: a.y + rand(-4, 4),
        vx: (a.vx || 0) + side * rand(24, 46),
        vy: (a.vy || 0) * rand(0.85, 1.05),
        baseVy,
        r: Math.max(12, a.r * 0.55),
        label: null,
        isCorrect: false,
        waveId: -1,
        spin: rand(-3.4, 3.4),
        rot: rand(0, Math.PI * 2),
        seed: Math.random() * 1e3,
        hit: false,
        warned: false,
        ghost: true,
        driftAmp: rand(6, 12),
        driftRate: rand(0.6, 1.3),
        driftPhase: rand(0, Math.PI * 2),
        spriteIndex: randi(0, asteroidSprites.length - 1)
      });
    }
  }
  function markAsteroidEffect(a, effect, duration) {
    a.hit = true;
    a.noDamage = true;
    a.effect = effect;
    a.effectTimer = duration;
    a.burning = effect === "burn";
    a.frozen = effect === "freeze";
    a.ghost = true;
  }
  function chainDestroy(origin, radius, maxTargets) {
    var targets = [];
    for (var i = 0; i < asteroids.length; i++) {
      var a = asteroids[i];
      if (a === origin)
        continue;
      if (a.isCorrect && a.waveId === state.waveId)
        continue;
      var dx = a.x - origin.x;
      var dy = a.y - origin.y;
      var dist = Math.hypot(dx, dy);
      if (dist <= radius) {
        targets.push({ a, d: dist });
      }
    }
    targets.sort(function(p1, p2) {
      return p1.d - p2.d;
    });
    if (maxTargets)
      targets = targets.slice(0, maxTargets);
    for (var j = 0; j < targets.length; j++) {
      var t = targets[j].a;
      var idx = asteroids.indexOf(t);
      if (idx >= 0) {
        impactDebris(t.x, t.y);
        playSfx(state, "impact_thud", 0.35);
        asteroids.splice(idx, 1);
      }
    }
  }
  function retireWave(wid) {
    for (var i = 0; i < asteroids.length; i++) {
      var a = asteroids[i];
      if (a.waveId === wid) {
        a.waveId = -1;
        a.isCorrect = false;
      }
    }
  }
  function clearWaveAsteroids(wid) {
    for (var i = asteroids.length - 1; i >= 0; i--) {
      if (asteroids[i].waveId === wid) {
        asteroids.splice(i, 1);
      }
    }
  }
  function applySettings() {
    applySettingsFromInputs(state, inputs);
    configureAliensDifficulty();
    var diff = String(state.difficulty || "normal").toLowerCase();
    state.redemptionEnabled = (diff === "easy" || diff === "normal") && isDigitMode();
    updateDecoyFunctionAvailability();
    if (inputs.ship && inputs.ship.value) {
      player.shipType = inputs.ship.value;
    }
    if (!state.sound)
      setDrone(state, false);
    setSoundtrack(state, state.sound && state.running && !state.over);
  }
  function beginRun() {
    state.running = true;
    state.paused = false;
    state.over = false;
    state.startTime = performance.now();
    state.pauseAccum = 0;
    state.pauseStart = 0;
    state.timerWarningPlayed = false;
  }
  function resetSession() {
    if (gameOverSfxTimer) {
      clearTimeout(gameOverSfxTimer);
      gameOverSfxTimer = 0;
    }
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
    missionClearFx.active = false;
    missionClearFx.phase = "center";
    missionClearFx.t = 0;
    missionClearFx.explodeTimer = 0;
    missionClearFx.exitSpeed = 0;
    missionClearFx.sfxPlayed = false;
    missionClearFx.mode = "cleared";
    countdownActive = false;
    cam.x = 0;
    cam.y = 0;
    cam.t = 0;
    cam.t0 = 0;
    cam.amp = 0;
    beginRun();
    updateCursorVisibility();
    state.score = 0;
    state.streak = 0;
    state.level = 1;
    state.lives = state.livesStart;
    state.correct = 0;
    state.wrong = 0;
    state.missed = 0;
    state.shots = 0;
    state.hits = 0;
    state.dashes = 0;
    state.powerupsCollected = 0;
    state.powerupsMissed = 0;
    state.asteroidCollisions = 0;
    state.alienCollisions = 0;
    state.alienShotsHit = 0;
    state.aliensShot = 0;
    state.aliensEscaped = 0;
    state.questionsCompleted = 0;
    state.collisionSlow = 0;
    backgroundIndex = beltIndexMap[beltKey] != null ? beltIndexMap[beltKey] : 0;
    backgroundScroll = 0;
    state.missesByFact = /* @__PURE__ */ new Map();
    state.ddSpeedBonus = 0;
    state.spawnTimer = 0;
    state.waveDecoys = [];
    state.waveDecoyBag = null;
    state.correctInPlay = false;
    state.asteroidId = 0;
    state.correctAsteroidId = 0;
    state.correctDelayRemaining = 0;
    state.empTimer = 0;
    state.answerDigits = [];
    state.digitCounts = null;
    state.digitsLeft = 0;
    state.correctDigit = null;
    state.timerWarningPlayed = false;
    state.endReasonDetail = "";
    state.redemptionUsed = false;
    player.cooldown = 0;
    player.vx = 0;
    player.vy = 0;
    player.recoil = 0;
    player.flash = 0;
    player.gunSide = 1;
    player.bankHold = 0;
    if (player.spinManeuver)
      player.spinManeuver.active = false;
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
    player.shipShake = 0;
    player.teleportHide = 0;
    player.hidden = false;
    resetAliens();
    nextProblem();
    syncHud();
    setDrone(state, true);
    setSoundtrack(state, true);
  }
  function startIntroSequence(done) {
    introActive = true;
    state.running = false;
    state.paused = false;
    player.hidden = true;
    updateCursorVisibility();
    if (introTimer)
      clearTimeout(introTimer);
    if (gameShell) {
      gameShell.classList.remove("intro-drop");
      void gameShell.offsetWidth;
      gameShell.classList.add("intro-drop");
    }
    playSfx(state, "dash");
    introTimer = setTimeout(function() {
      introActive = false;
      if (typeof done === "function")
        done();
    }, 1400);
  }
  function startCountdown(skipReset) {
    if (!countdownEl)
      return false;
    if (countdownEl.classList.contains("show"))
      return true;
    overlayMenu.classList.remove("show");
    hideEndOverlay();
    applySettings();
    state.running = false;
    state.paused = false;
    state.over = false;
    introHudHold = false;
    syncHud();
    if (gameOverSfxTimer) {
      clearTimeout(gameOverSfxTimer);
      gameOverSfxTimer = 0;
    }
    countdownActive = true;
    var r = canvas.getBoundingClientRect();
    countdownTarget.x = r.width / 2;
    countdownTarget.y = r.height - 58;
    player.x = countdownTarget.x;
    player.y = r.height + 120;
    bullets.length = 0;
    asteroids.length = 0;
    powerups.length = 0;
    particles.length = 0;
    rings.length = 0;
    dashGhosts.length = 0;
    alienBullets.length = 0;
    aliens.length = 0;
    gameOverFx.active = false;
    missionClearFx.active = false;
    missionClearFx.sfxPlayed = false;
    player.vx = 0;
    player.vy = 0;
    player.moveSpeed = 0;
    player.hidden = false;
    var steps = ["3", "2", "1", "GO"];
    var i = 0;
    countdownStartAt = performance.now();
    countdownDurationSec = steps.length * 0.6;
    countdownEl.textContent = steps[i];
    countdownEl.classList.add("show");
    playSfx(state, "session_start");
    setSoundtrack(state, true);
    var timer = setInterval(function() {
      i++;
      if (i < steps.length) {
        countdownEl.textContent = steps[i];
        return;
      }
      clearInterval(timer);
      countdownEl.classList.remove("show");
      countdownActive = false;
      if (skipReset) {
        resetSession();
        beginRun();
      } else {
        resetSession();
      }
      showToast("MISSION START");
    }, 600);
    return true;
  }
  function startIntroThenCountdown() {
    if (!countdownEl)
      return false;
    if (countdownEl.classList.contains("show") || introActive)
      return true;
    overlayMenu.classList.remove("show");
    hideEndOverlay();
    applySettings();
    state.running = false;
    state.paused = false;
    state.over = false;
    introHudHold = true;
    syncHud();
    if (gameOverSfxTimer) {
      clearTimeout(gameOverSfxTimer);
      gameOverSfxTimer = 0;
    }
    startIntroSequence(function() {
      setTimeout(function() {
        startCountdown(true);
      }, 1050);
    });
    return true;
  }
  function hardRestart() {
    ensureLoop();
    if (!startIntroThenCountdown()) {
      hideEndOverlay();
      overlayMenu.classList.remove("show");
      applySettings();
      resetSession();
      showToast("MISSION RESTARTED");
    }
  }
  function openSettings() {
    state.paused = true;
    syncTimerPause();
    syncHud();
    overlayMenu.classList.add("show");
  }
  function closeSettings() {
    overlayMenu.classList.remove("show");
    if (state.running && !state.over)
      state.paused = false;
    syncTimerPause();
    syncHud();
  }
  function togglePause() {
    if (screenshotMode)
      return;
    if (!state.running || state.over)
      return;
    state.paused = !state.paused;
    syncTimerPause();
    updateCursorVisibility();
    if (state.paused) {
      if (mousepadActive) {
        mousepadPaused = true;
        setMousepadActive(false);
      } else {
        mousepadPaused = false;
      }
    } else if (mousepadPaused) {
      setMousepadActive(true);
      mousepadPaused = false;
    }
    syncHud();
    showToast(state.paused ? "PAUSED" : "RESUMED");
  }
  function toggleScreenshot() {
    if (!state.running || state.over)
      return;
    screenshotMode = !screenshotMode;
    syncTimerPause();
    updateCursorVisibility();
    if (screenshotMode) {
      if (mousepadActive) {
        mousepadPaused = true;
        setMousepadActive(false);
      } else {
        mousepadPaused = false;
      }
    } else if (mousepadPaused) {
      setMousepadActive(true);
      mousepadPaused = false;
    }
    showToast(screenshotMode ? "SCREENSHOT MODE" : "SCREENSHOT MODE OFF");
  }
  function fire() {
    if (!state.running || state.paused || state.over)
      return;
    if (player.cooldown > 0)
      return;
    state.shots++;
    player.cooldown = 0.16;
    var mode = player.blasterMode || "single";
    if (mode === "dual") {
      bullets.push({ x: player.x - 16, y: player.y - 22, vy: -860, r: 3.2, vx: 0, kind: "dual" });
      bullets.push({ x: player.x + 16, y: player.y - 22, vy: -860, r: 3.2, vx: 0, kind: "dual" });
    } else if (mode === "laser") {
      bullets.push({ x: player.x, y: player.y - 24, vy: -980, r: 5.2, vx: 0, kind: "laser", len: 22, w: 3.6 });
    } else if (mode === "fire") {
      bullets.push({ x: player.x, y: player.y - 20, vy: -720, r: 6.2, vx: 0, kind: "fire" });
    } else if (mode === "ice") {
      bullets.push({ x: player.x, y: player.y - 26, vy: -880, r: 6.5, vx: 0, kind: "ice" });
    } else if (mode === "electric") {
      bullets.push({ x: player.x, y: player.y - 24, vy: -920, r: 4.2, vx: 0, kind: "electric" });
    } else if (mode === "pierce") {
      bullets.push({ x: player.x, y: player.y - 24, vy: -900, r: 3.8, vx: 0, kind: "pierce", speed: 900 });
    } else if (mode === "plasma") {
      bullets.push({ x: player.x, y: player.y - 24, vy: -700, r: 7.6, vx: 0, kind: "plasma" });
    } else if (mode === "rail") {
      bullets.push({ x: player.x, y: player.y - 26, vy: -1200, r: 5.2, vx: 0, kind: "rail", len: 40, w: 4.2 });
    } else {
      bullets.push({ x: player.x, y: player.y - 24, vy: -880, r: 4, vx: 0, kind: "single" });
    }
    player.recoil = 1;
    player.flash = 1;
    var gunSfx = mode === "laser" || mode === "rail" ? "gun2" : "gun1";
    if (mode === "ice")
      gunSfx = "ice_shot";
    if (mode === "electric")
      gunSfx = "bolt_shot";
    playSfx(state, gunSfx);
  }
  function secondaryFire() {
    if (!state.running || state.paused || state.over)
      return;
    if (player.secondaryCooldown > 0)
      return;
    if (player.secondaryCharges <= 0)
      return;
    player.secondaryCharges--;
    player.secondaryCooldown = 1.2;
    if (player.secondaryMode === "repair") {
      player.hull = clamp(player.hull + 0.35, 0, 1);
      spawnRing(player.x, player.y, 18);
      spawnParticles(player.x, player.y, "correct");
      showToast("SECONDARY \u2192 HULL REPAIR");
    } else if (player.secondaryMode === "time") {
      state.slowMoRemaining = Math.max(state.slowMoRemaining, 5);
      state.slowMoScale = 0.35;
      showToast("SECONDARY \u2192 TIME DILATION");
    } else if (player.secondaryMode === "magnet") {
      player.magnetTimer = 6;
      showToast("SECONDARY \u2192 MAGNET SWEEP");
    } else if (player.secondaryMode === "emp") {
      state.empTimer = Math.max(state.empTimer, 2);
      spawnRing(player.x, player.y, 24);
      showToast("SECONDARY \u2192 EMP BURST");
    } else if (player.secondaryMode === "lock") {
      player.lockTimer = Math.max(player.lockTimer, 6);
      showToast("SECONDARY \u2192 TARGET LOCK");
    }
    if (player.secondaryCharges <= 0) {
      player.secondaryMode = "none";
    }
  }
  function dash() {
    if (!state.running || state.paused || state.over)
      return;
    var profile = getShipProfile(player.shipType);
    if (player.dashCooldown > 0)
      return;
    state.dashes += 1;
    player.dashCooldown = profile.dashCooldown || 1.3;
    player.invuln = Math.max(player.invuln, 0.6);
    var startX = player.x;
    var startY = player.y;
    var dx = 0;
    var dy = 0;
    if (keys.has("arrowleft") || keys.has("a"))
      dx -= 1;
    if (keys.has("arrowright") || keys.has("d"))
      dx += 1;
    if (keys.has("arrowup") || keys.has("w"))
      dy -= 1;
    if (keys.has("arrowdown") || keys.has("s"))
      dy += 1;
    if (dx === 0 && dy === 0) {
      dx = player.vx;
      dy = player.vy;
    }
    var len = Math.hypot(dx, dy);
    if (len === 0) {
      dx = 0;
      dy = -1;
      len = 1;
    }
    dx /= len;
    dy /= len;
    var dashDist = profile.dashDist || 130;
    var endX = player.x + dx * dashDist;
    var endY = player.y + dy * dashDist;
    var tHit = 1;
    var hitAsteroid = null;
    var hitIndex = -1;
    var hitX = endX;
    var hitY = endY;
    var segX = endX - startX;
    var segY = endY - startY;
    var segLen2 = segX * segX + segY * segY;
    if (segLen2 > 1) {
      for (var i = 0; i < asteroids.length; i++) {
        var a = asteroids[i];
        if (a.noDamage)
          continue;
        var r = (a.r || 0) + (player.radius || 18) - 2;
        var fx2 = startX - a.x;
        var fy = startY - a.y;
        var A = segLen2;
        var B = 2 * (fx2 * segX + fy * segY);
        var C = fx2 * fx2 + fy * fy - r * r;
        var disc = B * B - 4 * A * C;
        if (disc < 0)
          continue;
        var t = (-B - Math.sqrt(disc)) / (2 * A);
        if (t >= 0 && t <= tHit) {
          tHit = t;
          hitAsteroid = a;
          hitIndex = i;
        }
      }
    }
    if (tHit < 1) {
      hitX = startX + segX * tHit;
      hitY = startY + segY * tHit;
      var stopT = Math.max(0, tHit - 0.04);
      endX = startX + segX * stopT;
      endY = startY + segY * stopT;
    }
    player.x = clamp(endX, 40, view.w - 40);
    player.y = clamp(endY, 80, view.h - 58);
    kickShake(12, 0.1);
    spawnDashGhosts(startX, startY, player.x, player.y, dx, dy);
    if (hitAsteroid) {
      if (handleShipAsteroidCollision(hitAsteroid, hitX, hitY, true)) {
        if (state.over)
          return;
      }
    }
    playSfx(state, "dash");
    showToast("DASH");
  }
  function shockwave() {
    if (!state.running || state.paused || state.over)
      return;
    var profile = getShipProfile(player.shipType);
    if (player.shockwaveCooldown > 0)
      return;
    player.shockwaveCooldown = profile.shockwaveCooldown || 3.5;
    if (profile.ability === "flares") {
      var flareOffset = 46;
      var flareRadius = profile.shockwaveRadius || 150;
      var flareStrength = profile.shockwaveStrength || 480;
      var leftX = player.x - flareOffset;
      var rightX = player.x + flareOffset;
      for (var f = 0; f < asteroids.length; f++) {
        var af = asteroids[f];
        if (af.ghost || af.label === null)
          continue;
        var dxL = af.x - leftX;
        var dyL = af.y - player.y;
        var distL = Math.hypot(dxL, dyL);
        if (distL < flareRadius) {
          var pushL = (1 - distL / flareRadius) * flareStrength;
          af.vx = (af.vx || 0) - pushL;
          af.vy = (af.vy || 0) + dyL / Math.max(1, distL) * pushL * 0.2;
        }
        var dxR = af.x - rightX;
        var dyR = af.y - player.y;
        var distR = Math.hypot(dxR, dyR);
        if (distR < flareRadius) {
          var pushR = (1 - distR / flareRadius) * flareStrength;
          af.vx = (af.vx || 0) + pushR;
          af.vy = (af.vy || 0) + dyR / Math.max(1, distR) * pushR * 0.2;
        }
      }
      spawnParticles(leftX, player.y - 4, "spark");
      spawnParticles(rightX, player.y - 4, "spark");
      if (spawnDirectedSparks) {
        spawnDirectedSparks(leftX, player.y - 4, -1, 0, 0.4, 18, 240, 560, 0.12, 0.24);
        spawnDirectedSparks(rightX, player.y - 4, 1, 0, 0.4, 18, 240, 560, 0.12, 0.24);
      }
      kickShake(12, 0.1);
      playSfx(state, "dash");
      showToast("SIDE FLARES");
      return;
    }
    if (profile.ability === "spin") {
      var dirX = 0;
      var dirY = 0;
      if (keys.has("arrowleft") || keys.has("a"))
        dirX -= 1;
      if (keys.has("arrowright") || keys.has("d"))
        dirX += 1;
      if (keys.has("arrowup") || keys.has("w"))
        dirY -= 1;
      if (keys.has("arrowdown") || keys.has("s"))
        dirY += 1;
      if (dirX === 0 && dirY === 0) {
        dirX = player.vx;
        dirY = player.vy;
      }
      var len = Math.hypot(dirX, dirY);
      if (len === 0) {
        dirX = 0;
        dirY = -1;
        len = 1;
      }
      dirX /= len;
      dirY /= len;
      var spireProfile = getShipProfile("spire");
      var dist = (spireProfile.dashDist || 130) * 1.35;
      var startX = player.x;
      var startY = player.y;
      var endX = clamp(player.x + dirX * dist, 40, view.w - 40);
      var endY = clamp(player.y + dirY * dist, view.hudH + 30, view.h - 60);
      spawnParticles(startX, startY, "smoke");
      spawnParticles(endX, endY, "spark");
      player.x = endX;
      player.y = endY;
      var teleportHit = findAsteroidCollisionAt(endX, endY);
      if (teleportHit) {
        if (handleShipAsteroidCollision(teleportHit.asteroid, endX, endY, true)) {
          if (state.over)
            return;
        }
      }
      player.teleportHide = 0.2;
      player.teleportFx = {
        startX,
        startY,
        endX,
        endY,
        t: 0,
        hide: 0.2,
        ghostDur: 0.2,
        zoomDur: 0.24
      };
      player.invuln = Math.max(player.invuln, 0.6);
      kickShake(8, 0.08);
      playSfx(state, "dash");
      showToast("TELEPORT");
      return;
    }
    var radius = profile.shockwaveRadius || 160;
    var strength = profile.shockwaveStrength || 520;
    for (var i = 0; i < asteroids.length; i++) {
      var a = asteroids[i];
      if (a.ghost || a.label === null)
        continue;
      var dx = a.x - player.x;
      var dy = a.y - player.y;
      var dist = Math.hypot(dx, dy);
      if (dist > radius)
        continue;
      var push = (1 - dist / radius) * strength;
      a.vx = (a.vx || 0) + dx / dist * push;
      a.vy = (a.vy || 0) + dy / dist * push * 0.6;
    }
    if (player.shipType === "classic") {
      spawnRing(player.x, player.y - 10, 26);
    }
    kickShake(14, 0.12);
    playSfx(state, "dash");
    showToast("SHOCKWAVE");
  }
  function loseLife(reason) {
    state.lives = Math.max(0, state.lives - 1);
    syncHud();
    showToast(reason);
    if (state.lives <= 0) {
      state.endReasonDetail = reason ? "OUT OF LIVES (" + reason + ")" : "OUT OF LIVES";
      endGame("destroyed");
    }
  }
  function recordFactMiss(a, b) {
    var key = factKey(a, b);
    var prev = state.missesByFact.get(key) || 0;
    state.missesByFact.set(key, prev + 1);
  }
  function computeMaxStreak() {
    return bestStreak;
  }
  function loadLifetimeStats() {
    try {
      var raw = localStorage.getItem("mathsteroid.stats");
      if (!raw)
        return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function saveLifetimeStats(stats) {
    try {
      localStorage.setItem("mathsteroid.stats", JSON.stringify(stats));
    } catch (e) {
    }
  }
  function csvEscape(value) {
    var s = String(value == null ? "" : value);
    if (s.indexOf('"') !== -1)
      s = s.replace(/"/g, '""');
    if (s.indexOf(",") !== -1 || s.indexOf("\n") !== -1) {
      s = '"' + s + '"';
    }
    return s;
  }
  function collectSessionSettings() {
    return {
      ship: inputs.ship && inputs.ship.value ? inputs.ship.value : player.shipType || "",
      difficulty: state.difficulty || "",
      mode: state.questionMode || "",
      question_mode: inputs.questionMode && inputs.questionMode.value ? inputs.questionMode.value : "",
      target_mode: inputs.targetMode && inputs.targetMode.value ? inputs.targetMode.value : "",
      strikes: inputs.strikes && inputs.strikes.value ? inputs.strikes.value : "",
      timer_mode: inputs.timerMode && inputs.timerMode.value ? inputs.timerMode.value : "",
      a_min: inputs.aMin && inputs.aMin.value ? inputs.aMin.value : "",
      a_max: inputs.aMax && inputs.aMax.value ? inputs.aMax.value : "",
      b_min: inputs.bMin && inputs.bMin.value ? inputs.bMin.value : "",
      b_max: inputs.bMax && inputs.bMax.value ? inputs.bMax.value : "",
      decoys: inputs.decoys && inputs.decoys.value ? inputs.decoys.value : "",
      speed: inputs.speed && inputs.speed.value ? inputs.speed.value : "",
      lives: inputs.lives && inputs.lives.value ? inputs.lives.value : "",
      sound: inputs.sound && inputs.sound.value ? inputs.sound.value : state.sound ? "on" : "off",
      volume: inputs.volume && inputs.volume.value ? inputs.volume.value : "",
      sfx_volume: inputs.sfxVolume && inputs.sfxVolume.value ? inputs.sfxVolume.value : "",
      music_volume: inputs.musicVolume && inputs.musicVolume.value ? inputs.musicVolume.value : ""
    };
  }
  function appendLeaderboardCsv(session) {
    var settings = collectSessionSettings();
    var header = "timestamp,datetime,name,score,ship,difficulty,mode,question_mode,target_mode,strikes,timer_mode,a_min,a_max,b_min,b_max,decoys,speed,lives,sound,volume,sfx_volume,music_volume,shots_fired,answers_shot,questions_answered,asteroid_collisions,alien_collisions,alien_shots_hit,aliens_shot,aliens_escaped,session_seconds,dashes_used,powerups_collected,powerups_missed";
    var row = [
      Date.now(),
      (/* @__PURE__ */ new Date()).toISOString(),
      session.name || "",
      session.score || 0,
      settings.ship,
      settings.difficulty,
      settings.mode,
      settings.question_mode,
      settings.target_mode,
      settings.strikes,
      settings.timer_mode,
      settings.a_min,
      settings.a_max,
      settings.b_min,
      settings.b_max,
      settings.decoys,
      settings.speed,
      settings.lives,
      settings.sound,
      settings.volume,
      settings.sfx_volume,
      settings.music_volume,
      state.shots || 0,
      state.correct || 0,
      state.questionsCompleted || 0,
      state.asteroidCollisions || 0,
      state.alienCollisions || 0,
      state.alienShotsHit || 0,
      state.aliensShot || 0,
      state.aliensEscaped || 0,
      Math.max(0, Math.round(getElapsedSeconds())),
      state.dashes || 0,
      state.powerupsCollected || 0,
      state.powerupsMissed || 0
    ].map(csvEscape).join(",");
    var csv = "";
    try {
      csv = localStorage.getItem("mathsteroid.leaderboardCSV") || "";
    } catch (e) {
      csv = "";
    }
    if (!csv) {
      csv = header + "\n";
    } else if (csv.indexOf(header) !== 0) {
      csv = header + "\n" + csv.replace(/^\s+/, "");
    }
    csv += row + "\n";
    try {
      localStorage.setItem("mathsteroid.leaderboardCSV", csv);
    } catch (e) {
    }
  }
  function updateLifetimeStats(session) {
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
    stats.highScores.sort(function(a, b) {
      return b.score - a.score;
    });
    stats.highScores = stats.highScores.slice(0, 5);
    saveLifetimeStats(stats);
    return stats;
  }
  function renderHighScores(lifetime) {
    if (!highScoresEnd)
      return;
    highScoresEnd.innerHTML = "";
    var hs = lifetime && lifetime.highScores ? lifetime.highScores : [];
    if (!hs.length) {
      var hsEmpty = document.createElement("li");
      hsEmpty.innerHTML = '<span style="color: var(--muted);">NO SCORES YET.</span><b class="pillGood">PLAY</b>';
      highScoresEnd.appendChild(hsEmpty);
      return;
    }
    for (var h = 0; h < hs.length; h++) {
      var item = hs[h];
      var name = item.name ? " \u2022 " + item.name : "";
      var liHs = document.createElement("li");
      liHs.innerHTML = "<span>#" + (h + 1) + " \u2022 " + item.score + " pts" + name + "</span><b>Lv " + item.level + "</b>";
      highScoresEnd.appendChild(liHs);
    }
  }
  function saveScoreName(name) {
    if (!state.lastSessionId)
      return;
    var trimmed = String(name || "").trim().slice(0, 18);
    if (!trimmed)
      return;
    var stats = loadLifetimeStats();
    if (!stats || !stats.highScores)
      return;
    for (var i = 0; i < stats.highScores.length; i++) {
      if (stats.highScores[i].id === state.lastSessionId) {
        stats.highScores[i].name = trimmed;
        break;
      }
    }
    saveLifetimeStats(stats);
    renderHighScores(stats);
    try {
      localStorage.setItem("mathsteroid.playerName", trimmed);
    } catch (e) {
    }
    appendLeaderboardCsv({ name: trimmed, score: state.score });
  }
  function onCorrectHit(label) {
    if (warningClip) {
      try {
        warningClip.pause();
        warningClip.currentTime = 0;
      } catch (e) {
      }
      warningClip = null;
    }
    state.correct++;
    state.hits++;
    state.streak++;
    playSfx(state, "correct");
    var baseGain = 50 + Math.min(250, state.streak * 10);
    var factor = Math.max(state.a, state.b);
    if (isDigitMode()) {
      factor = state.b;
    }
    if (isAdditionMode()) {
      factor = clamp(Math.round(factor / 10), 2, 30);
    } else {
      factor = clamp(factor, 2, 12);
    }
    var weight = 1 + factor / 12 * 0.6;
    var gain = Math.round(baseGain * weight);
    state.score += gain;
    state.ddSpeedBonus = clamp(state.ddSpeedBonus + 0.015, 0, 0.35);
    var praise = ["GOOD JOB", "NICE HIT", "CLEAN SHOT", "PERFECT", "ON TARGET"];
    var streakPraise = ["STREAK x5!", "HOT STREAK!", "ON FIRE!", "LASER FOCUS!"];
    if (state.streak > 0 && state.streak % 5 === 0) {
      showToast(streakPraise[Math.floor(Math.random() * streakPraise.length)]);
    } else {
      showToast(praise[Math.floor(Math.random() * praise.length)]);
    }
    if (state.correct % 5 === 0) {
      state.level++;
      state.slowMoRemaining = Math.max(state.slowMoRemaining, 2);
      state.slowMoScale = 0.55;
      playSfx(state, "level_up2");
      showToast("LEVEL UP!");
    } else {
    }
    syncHud();
    if (isDigitMode()) {
      state.digitsLeft = Math.max(0, state.digitsLeft - 1);
      if (state.digitsLeft > 0) {
        state.waveId++;
        state.correctDigit = pickCorrectDigit();
        prepareWave();
      } else {
        state.questionsCompleted++;
        if (shouldEndByQuestionLimit()) {
          endGame("questions");
          return;
        }
        nextProblem();
      }
    } else {
      state.questionsCompleted++;
      if (shouldEndByQuestionLimit()) {
        endGame("questions");
        return;
      }
      nextProblem();
    }
    maybeDropPowerup();
  }
  function onWrongHit() {
    state.wrong++;
    state.hits++;
    state.streak = 0;
    state.score = Math.max(0, state.score - 60);
    playSfx(state, "wrong_asteroid");
    state.ddSpeedBonus = clamp(state.ddSpeedBonus - 0.02, 0, 0.35);
    syncHud();
    showToast("WRONG TARGET");
    var limit = typeof state.strikeLimit === "number" ? state.strikeLimit : null;
    if (limit === null || Number.isNaN(limit)) {
      var diff = String(state.difficulty || "normal").toLowerCase();
      limit = diff === "easy" ? 8 : diff === "normal" ? 5 : diff === "hard" ? 3 : 0;
    }
    if (limit === 0 || state.wrong >= limit) {
      state.endReasonDetail = "STRIKES EXCEEDED (WRONG TARGETS)";
      endGame("destroyed");
    }
  }
  function clearEndSequenceTimers() {
    for (var i = 0; i < endSequenceTimers.length; i++) {
      clearTimeout(endSequenceTimers[i]);
    }
    endSequenceTimers.length = 0;
  }
  function resetEndSequence() {
    if (!endSequence)
      return;
    endSequence.classList.remove("reveal-sequence", "reveal-score", "reveal-stats", "reveal-name");
    overlayEnd.classList.remove("reveal-reason");
  }
  function startEndSequence() {
    if (!endSequence)
      return;
    clearEndSequenceTimers();
    resetEndSequence();
    void endSequence.offsetWidth;
    endSequenceTimers.push(setTimeout(function() {
      overlayEnd.classList.add("reveal-reason");
    }, 180));
    endSequenceTimers.push(setTimeout(function() {
      endSequence.classList.add("reveal-sequence");
      if (endNameInput) {
        endNameInput.focus();
        endNameInput.select();
      }
    }, 120));
  }
  function showEndOverlay() {
    overlayEnd.classList.add("show");
    startEndSequence();
  }
  function hideEndOverlay() {
    overlayEnd.classList.remove("show");
    resetEndSequence();
  }
  function endGame(reason) {
    if (reason === void 0)
      reason = "destroyed";
    setDrone(state, false);
    setSoundtrack(state, false);
    state.over = true;
    state.running = false;
    state.paused = false;
    updateCursorVisibility();
    syncHud();
    if (mousepadActive) {
      setMousepadActive(false);
    }
    var elapsed = getElapsedSeconds();
    var attempts = state.hits;
    var acc = attempts > 0 ? state.correct / attempts : 0;
    var rpm = elapsed > 0 ? state.correct / elapsed * 60 : 0;
    var storedName = "";
    try {
      storedName = localStorage.getItem("mathsteroid.playerName") || "";
    } catch (e) {
    }
    var sessionId = String(Date.now()) + "_" + String(Math.floor(Math.random() * 1e6));
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
    var campaignResult = { active: false, success: false, failures: 0, failed: false, hasNext: false, last: false };
    if (campaignActive) {
      var cState = loadCampaignState() || { index: 0, failures: 0, completed: [], active: true, failed: false };
      var cData = loadCampaignData() || { missions: [], maxFailures: campaignMaxFailures };
      if (cData.maxFailures)
        campaignMaxFailures = cData.maxFailures;
      if (reason === "destroyed") {
        cState.failures = (cState.failures || 0) + 1;
        if (cState.failures >= campaignMaxFailures) {
          cState.failed = true;
          cState.active = false;
        }
      } else {
        cState.completed = cState.completed || [];
        cState.completed[campaignIndex] = true;
        cState.index = Math.max(cState.index || 0, campaignIndex + 1);
        cState.active = true;
        cState.failed = false;
      }
      saveCampaignState(cState);
      campaignResult.active = true;
      campaignResult.success = reason !== "destroyed";
      campaignResult.failures = cState.failures || 0;
      campaignResult.failed = !!cState.failed;
      campaignResult.last = campaignIndex + 1 >= (cData.missions && cData.missions.length || 0);
      campaignResult.hasNext = campaignResult.success && !campaignResult.failed && !campaignResult.last;
    }
    var endReasonText = "";
    if (reason === "destroyed") {
      if (endTitle) {
        endTitle.textContent = "MISSION FAILED";
        endTitle.classList.remove("titleCleared");
      }
      if (endReason) {
        var base = state.endReasonDetail ? "Reason: " + state.endReasonDetail : "Reason: Out of lives";
        if (campaignResult.active) {
          var failText = "Campaign failures: " + campaignResult.failures + "/" + campaignMaxFailures;
          endReasonText = base + " - " + failText;
        } else {
          endReasonText = base;
        }
        endReason.textContent = endReasonText;
      }
      endSubtitle.textContent = "OUT OF LIVES. YOU COMPLETED " + state.correct + " PROBLEMS IN " + Math.round(elapsed) + "s.";
    } else if (state.questionLimit > 0) {
      if (endTitle) {
        endTitle.textContent = campaignResult.active && campaignResult.last ? "CAMPAIGN COMPLETE" : "MISSION CLEARED";
        endTitle.classList.add("titleCleared");
      }
      if (endReason)
        endReason.textContent = "";
      endSubtitle.textContent = "MISSION COMPLETE. YOU ANSWERED " + state.questionsCompleted + " QUESTIONS IN " + Math.round(elapsed) + "s.";
    } else if (state.timeLimitSec) {
      if (endTitle) {
        endTitle.textContent = campaignResult.active && campaignResult.last ? "CAMPAIGN COMPLETE" : "TIME'S UP";
        endTitle.classList.remove("titleCleared");
      }
      if (endReason)
        endReason.textContent = "";
      endSubtitle.textContent = "TIME'S UP. YOU COMPLETED " + state.correct + " PROBLEMS IN " + Math.round(elapsed) + "s.";
    } else {
      if (endTitle) {
        endTitle.textContent = "MISSION FAILED";
        endTitle.classList.remove("titleCleared");
      }
      if (endReason) {
        var base = state.endReasonDetail ? "Reason: " + state.endReasonDetail : "Reason: Out of lives";
        if (campaignResult.active) {
          var failText = "Campaign failures: " + campaignResult.failures + "/" + campaignMaxFailures;
          endReasonText = base + " - " + failText;
        } else {
          endReasonText = base;
        }
        endReason.textContent = endReasonText;
      }
      endSubtitle.textContent = "OUT OF LIVES. YOU COMPLETED " + state.correct + " PROBLEMS IN " + Math.round(elapsed) + "s.";
    }
    if (endOutcome)
      endOutcome.textContent = endTitle ? endTitle.textContent : "";
    if (endReasonLine)
      endReasonLine.textContent = endReasonText;
    statsList.innerHTML = "";
    var stats = [
      ["SCORE", state.score],
      ["CORRECT", state.correct],
      ["WRONG SHOTS", state.wrong],
      ["MISSED (PASSED)", state.missed],
      ["ACCURACY", String(Math.round(acc * 100)) + "%"],
      ["CORRECT PER MIN", rpm.toFixed(1)],
      ["MAX STREAK", computeMaxStreak()],
      ["LEVEL REACHED", state.level],
      ["SHOTS FIRED", state.shots],
      ["ASTEROID COLLISIONS", state.asteroidCollisions || 0],
      ["ALIEN COLLISIONS", state.alienCollisions || 0],
      ["ALIEN SHOTS HIT", state.alienShotsHit || 0],
      ["ALIENS SHOT", state.aliensShot || 0],
      ["ALIENS ESCAPED", state.aliensEscaped || 0],
      ["DASHES USED", state.dashes || 0],
      ["POWERUPS COLLECTED", state.powerupsCollected || 0],
      ["POWERUPS MISSED", state.powerupsMissed || 0]
    ];
    for (var i = 0; i < stats.length; i++) {
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
      row.innerHTML = '<span style="color: var(--muted);">' + k + "</span><b>" + v + "</b>";
      statsList.appendChild(row);
    }
    accBar.style.width = String(Math.round(acc * 100)) + "%";
    weakList.innerHTML = "";
    var misses = Array.from(state.missesByFact.entries()).sort(function(a, b) {
      return b[1] - a[1];
    }).slice(0, 8);
    if (misses.length === 0) {
      var li0 = document.createElement("li");
      li0.innerHTML = '<span style="color: var(--muted);">NO MISSED FACTS RECORDED.</span><b class="pillGood">CLEAN RUN</b>';
      weakList.appendChild(li0);
    } else {
      for (var j = 0; j < misses.length; j++) {
        var key = misses[j][0];
        var count = misses[j][1];
        var li = document.createElement("li");
        li.innerHTML = "<span>" + key + '</span><b class="pillWarn">' + count + "\xD7</b>";
        weakList.appendChild(li);
      }
    }
    renderHighScores(lifetime);
    if (btnEndNext) {
      btnEndNext.style.display = campaignResult.hasNext ? "inline-flex" : "none";
    }
    if (endNameInput) {
      endNameInput.value = storedName;
    }
    if (endScoreValue) {
      endScoreValue.textContent = String(state.score);
    }
    resetEndSequence();
    if (reason === "destroyed") {
      player.hidden = true;
      playSfx(state, "explosion");
      if (gameOverSfxTimer) {
        clearTimeout(gameOverSfxTimer);
      }
      gameOverSfxTimer = setTimeout(function() {
        playSfx(state, "game_over3");
        gameOverSfxTimer = 0;
      }, 1e3);
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
      hideEndOverlay();
    } else if (reason === "questions") {
      bullets.length = 0;
      alienBullets.length = 0;
      aliens.length = 0;
      player.vx = 0;
      player.vy = 0;
      player.bankHold = 0;
      missionClearFx.active = true;
      missionClearFx.phase = "center";
      missionClearFx.t = 0;
      missionClearFx.explodeTimer = 0;
      missionClearFx.exitSpeed = 0;
      missionClearFx.sfxPlayed = false;
      missionClearFx.mode = "cleared";
      player.hidden = false;
      gameOverFx.active = false;
      gameOverFx.shown = false;
      hideEndOverlay();
    } else if (reason === "time") {
      bullets.length = 0;
      alienBullets.length = 0;
      aliens.length = 0;
      player.vx = 0;
      player.vy = 0;
      player.bankHold = 0;
      missionClearFx.active = true;
      missionClearFx.phase = "center";
      missionClearFx.t = 0;
      missionClearFx.explodeTimer = 0;
      missionClearFx.exitSpeed = 0;
      missionClearFx.sfxPlayed = false;
      missionClearFx.mode = "time";
      player.hidden = false;
      gameOverFx.active = false;
      gameOverFx.shown = false;
      hideEndOverlay();
    } else {
      showEndOverlay();
    }
  }
  var lastT = performance.now();
  var lastFrameAt = lastT;
  var frameAcc = 0;
  var frameStep = 1 / 120;
  function ensureLoop() {
    if (performance.now() - lastFrameAt > 220) {
      lastT = performance.now();
      requestAnimationFrame(tick);
    }
  }
  function getCorrectAsteroidInPlay() {
    if (!state.correctInPlay)
      return null;
    if (state.correctAsteroidId) {
      for (var i = 0; i < asteroids.length; i++) {
        if (asteroids[i].id === state.correctAsteroidId) {
          return asteroids[i];
        }
      }
    }
    for (var j = 0; j < asteroids.length; j++) {
      var a = asteroids[j];
      if (a.isCorrect && a.waveId === state.waveId) {
        return a;
      }
    }
    return null;
  }
  function steerLookUpShot(b) {
    var target = getCorrectAsteroidInPlay();
    if (!target)
      return;
    var dx = target.x - b.x;
    var dy = target.y - b.y;
    var dist = Math.max(1, Math.hypot(dx, dy));
    var speed = b.speed || Math.hypot(b.vx || 0, b.vy || 0) || 800;
    b.speed = speed;
    b.vx = dx / dist * speed;
    b.vy = dy / dist * speed;
  }
  function tick(t) {
    lastFrameAt = t;
    var dt = Math.min(0.05, (t - lastT) / 1e3);
    lastT = t;
    frameAcc += dt;
    try {
      if (frameAcc >= frameStep) {
        while (frameAcc >= frameStep) {
          update(frameStep);
          frameAcc -= frameStep;
        }
        draw();
      }
    } catch (err) {
      console.error(err);
      showToast("RUNTIME ERROR \u2014 CHECK CONSOLE");
    }
    requestAnimationFrame(tick);
  }
  function update(dt) {
    var dtReal = dt;
    var dtSlow = dtReal;
    bg.dt = dt;
    if (state.over) {
      updateGameOverFx(dtReal);
      return;
    }
    if (!state.running || state.paused || screenshotMode) {
      if (countdownActive) {
        var settle = 1 - Math.exp(-6 * dtReal);
        player.x += (countdownTarget.x - player.x) * settle;
        player.y += (countdownTarget.y - player.y) * settle;
      }
      return;
    }
    if (state.slowMoRemaining > 0) {
      state.slowMoRemaining = Math.max(0, state.slowMoRemaining - dtReal);
      dtSlow = dtReal * (state.slowMoScale || 0.42);
    }
    updateCamera(dtReal);
    updateDashGhosts(dtReal);
    var alienReport = updateAliens(dtSlow, state, player, view, getAlienQuestion, asteroids);
    if (alienReport.escaped) {
      state.aliensEscaped += alienReport.escaped;
      state.streak = 0;
      syncHud();
      showToast("ALIEN ESCAPED");
    }
    if (state.timeLimitSec > 0) {
      var elapsed = getElapsedSeconds();
      var remaining = state.timeLimitSec - elapsed;
      if (remaining <= 4 && !state.timerWarningPlayed) {
        state.timerWarningPlayed = true;
        playSfx(state, "warning");
      }
      if (elapsed >= state.timeLimitSec) {
        endGame("time");
        return;
      }
    }
    var profile = getShipProfile(player.shipType);
    player.speed = profile.speed;
    var spinActive = false;
    if (player.spinManeuver && player.spinManeuver.active) {
      var spin = player.spinManeuver;
      var targetX = spin.phase === 0 ? spin.x1 : spin.phase === 1 ? spin.x2 : spin.x0;
      var targetY = spin.phase === 0 ? spin.y1 : spin.phase === 1 ? spin.y2 : spin.y0;
      var settle = 1 - Math.exp(-8 * dtReal);
      player.x += (targetX - player.x) * settle;
      player.y += (targetY - player.y) * settle;
      if (Math.hypot(targetX - player.x, targetY - player.y) < 2) {
        spawnRing(player.x, player.y, 18);
        spawnParticles(player.x, player.y, "spark");
        spin.phase += 1;
        if (spin.phase > 2) {
          spin.active = false;
        }
      }
      spinActive = true;
    }
    var left = keys.has("a") || keys.has("arrowleft");
    var right = keys.has("d") || keys.has("arrowright");
    var up = keys.has("w") || keys.has("arrowup");
    var down = keys.has("s") || keys.has("arrowdown");
    var inputX = (right ? 1 : 0) - (left ? 1 : 0);
    var inputY = (down ? 1 : 0) - (up ? 1 : 0);
    if (mousepadActive) {
      if (mousepadMode === "pad" && (virtualAxes.x || virtualAxes.y)) {
        var ax = virtualAxes.x;
        var ay = virtualAxes.y;
        var mag = Math.hypot(ax, ay);
        if (mag < mousepadDeadzonePad) {
          ax = 0;
          ay = 0;
        } else if (mag > 0) {
          var scaled = (mag - mousepadDeadzonePad) / (1 - mousepadDeadzonePad);
          ax = ax / mag * scaled;
          ay = ay / mag * scaled;
        }
        inputX = clamp(inputX + ax, -1, 1);
        inputY = clamp(inputY + ay, -1, 1);
      } else if (mousepadMode === "hybrid" && (virtualAxes.x || virtualAxes.y)) {
        inputX = clamp(inputX + virtualAxes.x, -1, 1);
        inputY = clamp(inputY + virtualAxes.y, -1, 1);
      }
    }
    if (mousepadActive && mousepadMode === "hybrid") {
      var decay = Math.exp(-8 * dtReal);
      padCursor.x *= decay;
      padCursor.y *= decay;
      updateVirtualFromCursor();
    }
    if (mousepadMode === "hybrid" && mousepadActive && !spinActive) {
      var bankLerp = 1 - Math.exp(-10 * dtReal);
      player.bankHold += (inputX - player.bankHold) * bankLerp;
    } else {
      var bankThreshold = 0.2;
      var bankDir = inputX > bankThreshold ? 1 : inputX < -bankThreshold ? -1 : 0;
      if (spinActive)
        bankDir = 0;
      if (bankDir !== 0) {
        var accel = player.bankHold * bankDir < 0 ? 4.2 : 2.2;
        player.bankHold = clamp(player.bankHold + bankDir * dtReal * accel, -1, 1);
      } else if (player.bankHold !== 0) {
        var decay = 3.2;
        var sign = player.bankHold > 0 ? 1 : -1;
        player.bankHold -= sign * decay * dtReal;
        if (player.bankHold * sign < 0)
          player.bankHold = 0;
      }
    }
    var inputMag = Math.min(1, Math.hypot(inputX, inputY));
    var dirX = inputMag > 0 ? inputX / inputMag : 0;
    var dirY = inputMag > 0 ? inputY / inputMag : 0;
    var targetSpeed = spinActive ? 0 : player.speed * inputMag;
    if (state.collisionSlow > 0)
      targetSpeed *= 0.18;
    var accelUp = profile.accelUp || 6;
    var accelDown = profile.accelDown || 9;
    var accelRate = targetSpeed > player.moveSpeed ? accelUp : accelDown;
    var accel = 1 - Math.exp(-accelRate * dtReal);
    player.moveSpeed += (targetSpeed - player.moveSpeed) * accel;
    var desiredVX = dirX * player.moveSpeed;
    var desiredVY = dirY * player.moveSpeed;
    var response = profile.response || 14;
    var alpha = 1 - Math.exp(-response * dtReal);
    player.vx += (desiredVX - player.vx) * alpha;
    player.vy += (desiredVY - player.vy) * alpha;
    var r = canvas.getBoundingClientRect();
    var hudH = document.getElementById("hud").getBoundingClientRect().height;
    var topLimit = hudH + 14;
    var bottomLimit = r.height - 18;
    if (spinActive) {
      player.vx = 0;
      player.vy = 0;
    } else {
      player.x += player.vx * dtReal;
      player.y += player.vy * dtReal;
    }
    player.x = clamp(player.x, player.w / 2 + 10, r.width - player.w / 2 - 10);
    player.y = clamp(player.y, topLimit + player.h / 2 + 6, bottomLimit - player.h / 2);
    if (mousepadMode === "hybrid" && mousepadActive && !spinActive && Math.abs(inputX) < 0.05) {
      player.bankHold = clamp(player.vx / (player.speed || 1), -1, 1);
    }
    player.cooldown = Math.max(0, player.cooldown - dtReal);
    player.invuln = Math.max(0, player.invuln - dtReal);
    player.hitFlash = Math.max(0, player.hitFlash - dtReal * 3.6);
    player.shipShake = Math.max(0, (player.shipShake || 0) - dtReal * 3.2);
    state.collisionSlow = Math.max(0, (state.collisionSlow || 0) - dtReal);
    if (player.teleportHide > 0) {
      player.teleportHide = Math.max(0, player.teleportHide - dtReal);
    }
    if (player.teleportFx) {
      player.teleportFx.t += dtReal;
      var fxTotal = Math.max(player.teleportFx.ghostDur || 0, (player.teleportFx.hide || 0) + (player.teleportFx.zoomDur || 0));
      if (player.teleportFx.t >= fxTotal) {
        player.teleportFx = null;
      }
    }
    player.recoil = Math.max(0, player.recoil - dtReal * 9);
    player.flash = Math.max(0, player.flash - dtReal * 12);
    if (player.secondaryCooldown > 0) {
      player.secondaryCooldown = Math.max(0, player.secondaryCooldown - dtReal);
    }
    if (player.blasterTimer > 0) {
      player.blasterTimer = Math.max(0, player.blasterTimer - dtReal);
      if (player.blasterTimer === 0)
        player.blasterMode = "single";
    }
    if (player.defenseTimer > 0) {
      player.defenseTimer = Math.max(0, player.defenseTimer - dtReal);
      if (player.defenseTimer === 0)
        player.defenseMode = "none";
    }
    if (player.magnetTimer > 0) {
      player.magnetTimer = Math.max(0, player.magnetTimer - dtReal);
    }
    if (player.lockTimer > 0) {
      player.lockTimer = Math.max(0, player.lockTimer - dtReal);
      if (player.lockTimer === 0)
        player.lockTargetId = 0;
    }
    if (state.empTimer > 0) {
      state.empTimer = Math.max(0, state.empTimer - dtReal);
    }
    if (keys.has("z"))
      fire();
    if (keys.has("x"))
      secondaryFire();
    if (keys.has("c"))
      shockwave();
    if (player.dashCooldown > 0) {
      player.dashCooldown = Math.max(0, player.dashCooldown - dtReal);
    }
    if (player.shockwaveCooldown > 0) {
      player.shockwaveCooldown = Math.max(0, player.shockwaveCooldown - dtReal);
    }
    state.spawnTimer -= dtSlow;
    if (state.spawnTimer <= 0) {
      spawnOneFromWave();
      if (state.level >= 7 && Math.random() < 0.18)
        spawnDecoyOnly();
      state.spawnTimer = computeSpawnInterval(state);
    }
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      if (b.kind === "pierce" && b.lookUp) {
        steerLookUpShot(b);
      } else if (player.lockTimer > 0 && state.correctAsteroidId) {
        var target = null;
        for (var ti = 0; ti < asteroids.length; ti++) {
          if (asteroids[ti].id === state.correctAsteroidId) {
            target = asteroids[ti];
            break;
          }
        }
        if (target) {
          var dxT = target.x - b.x;
          var dyT = target.y - b.y;
          var distT = Math.max(1, Math.hypot(dxT, dyT));
          var spd = Math.max(200, Math.hypot(b.vx || 0, b.vy || 0));
          b.vx += dxT / distT * spd * 0.6 * dtReal;
          b.vy += dyT / distT * spd * 0.6 * dtReal;
        }
      }
      b.y += b.vy * dtReal;
      if (b.vx)
        b.x += b.vx * dtReal;
      if (b.y < -20)
        bullets.splice(bi, 1);
    }
    updateAlienBullets(dtSlow, view);
    updateParticles(dtReal);
    updateRings(dtReal);
    emitDamageSmoke(dtReal);
    for (var pi = powerups.length - 1; pi >= 0; pi--) {
      var p = powerups[pi];
      p.y += p.vy * dtReal;
      if (p.rotSpeed != null) {
        p.rot += p.rotSpeed * dtReal;
      }
      var dxp = p.x - player.x;
      var dyp = p.y - player.y;
      if (Math.hypot(dxp, dyp) < p.r + 18) {
        state.powerupsCollected += 1;
        applyPowerup(p);
        powerups.splice(pi, 1);
        continue;
      }
      if (p.y - p.r > r.height + 40) {
        state.powerupsMissed += 1;
        powerups.splice(pi, 1);
      }
    }
    var tNow = performance.now() * 1e-3;
    for (var ai = asteroids.length - 1; ai >= 0; ai--) {
      var a = asteroids[ai];
      if (a.shakeTimer != null && a.shakeTimer > 0) {
        a.shakeTimer = Math.max(0, a.shakeTimer - dtSlow);
      }
      if (player.magnetTimer > 0 && a.isCorrect && a.waveId === state.waveId) {
        var targetX = player.x;
        var targetY = Math.max(view.hudH + 90, player.y - 140);
        var dxmA = targetX - a.x;
        var dymA = targetY - a.y;
        var distA = Math.max(1, Math.hypot(dxmA, dymA));
        var pullA = clamp(240 / distA, 0, 4.5);
        a.x += dxmA / distA * pullA * dtReal * 140;
        a.y += dymA / distA * pullA * dtReal * 140;
        if (a.vx != null)
          a.vx *= 1 - Math.min(1, dtReal * 2.2);
        if (a.vy != null)
          a.vy *= 1 - Math.min(1, dtReal * 1.8);
      }
      if (a.effectTimer != null) {
        a.effectTimer -= dtSlow;
        if (a.effectTimer <= 0) {
          if (a.effect === "burn") {
            spawnParticles(a.x, a.y, "smoke");
            spawnParticles(a.x, a.y, "spark");
          } else if (a.effect === "freeze") {
            spawnParticles(a.x, a.y, "spark");
          }
          asteroids.splice(ai, 1);
          continue;
        }
      }
      var empScale = state.empTimer > 0 ? 0.35 : 1;
      a.y += a.vy * dtSlow * empScale;
      a.x += a.vx * dtSlow;
      if (a.baseVy != null) {
        a.vy += (a.baseVy - a.vy) * Math.min(1, dtSlow * 0.55);
      }
      if (a.driftAmp) {
        a.vx += Math.sin(a.driftPhase + tNow * a.driftRate) * a.driftAmp * dtSlow;
      }
      a.vx *= 1 - Math.min(1, dtSlow * 0.35);
      var bound = a.r + 8;
      if (a.x < bound) {
        a.x = bound;
        a.vx = Math.abs(a.vx) * 0.6;
      } else if (a.x > r.width - bound) {
        a.x = r.width - bound;
        a.vx = -Math.abs(a.vx) * 0.6;
      }
      a.rot = (a.rot || 0) + (a.spin || 0) * dtSlow;
      if (a.isCorrect && a.waveId === state.waveId && !a.warned && a.y > r.height * 0.75) {
        a.warned = true;
        warningClip = playSfx(state, "warning");
      }
      if (handleShipAsteroidCollision(a, player.x, player.y, false)) {
        asteroids.splice(ai, 1);
        if (state.over)
          return;
        continue;
      }
      if (a.y - a.r > r.height + 40) {
        if (a.isCorrect && a.waveId === state.waveId) {
          state.missed++;
          state.correctInPlay = false;
          state.correctAsteroidId = 0;
          player.blasterMode = "single";
          player.blasterTimer = 0;
          recordFactMiss(state.a, state.b);
          state.streak = 0;
          state.ddSpeedBonus = clamp(state.ddSpeedBonus - 0.02, 0, 0.35);
          syncHud();
          playSfx(state, "missed_answer");
          loseLife("CORRECT ANSWER ESCAPED");
          retireWave(state.waveId);
          if (state.lives > 0) {
            if (isDigitMode() && state.redemptionEnabled && !state.redemptionUsed) {
              state.redemptionUsed = true;
              state.waveId++;
              prepareWave();
            } else {
              state.questionsCompleted++;
              if (shouldEndByQuestionLimit()) {
                endGame("questions");
                return;
              }
              nextProblem();
            }
          }
        }
        asteroids.splice(ai, 1);
      }
    }
    resolveAsteroidCollisions();
    var stopHits = false;
    var clearedWaveId = null;
    for (var ai2 = asteroids.length - 1; ai2 >= 0; ai2--) {
      var a2 = asteroids[ai2];
      if (a2.hit)
        continue;
      for (var bj = bullets.length - 1; bj >= 0; bj--) {
        var bb = bullets[bj];
        if (bb.noHit)
          continue;
        var ddx = a2.x - bb.x;
        var ddy = a2.y - bb.y;
        if (ddx * ddx + ddy * ddy <= (a2.r + bb.r) * (a2.r + bb.r)) {
          var kind = bb.kind || "single";
          if (kind === "pierce") {
            if (!bb.lookUp) {
              bb.lookUp = true;
              bb.noHit = true;
              steerLookUpShot(bb);
            }
          } else if (bb.pierce && bb.pierce > 0) {
            bb.pierce -= 1;
          } else {
            bullets.splice(bj, 1);
          }
          var hitAst = a2;
          var hitIndex = ai2;
          if (kind === "electric" || kind === "plasma" || kind === "rail") {
            if (state.correctInPlay) {
              var correctAst = null;
              if (state.correctAsteroidId) {
                for (var ci = 0; ci < asteroids.length; ci++) {
                  if (asteroids[ci].id === state.correctAsteroidId) {
                    correctAst = asteroids[ci];
                    break;
                  }
                }
              }
              if (!correctAst) {
                for (var ci2 = 0; ci2 < asteroids.length; ci2++) {
                  var cand = asteroids[ci2];
                  if (cand.isCorrect && cand.waveId === state.waveId) {
                    correctAst = cand;
                    break;
                  }
                }
              }
              if (correctAst && correctAst !== a2) {
                var dxC = correctAst.x - bb.x;
                var dyC = correctAst.y - bb.y;
                var rC = correctAst.r + bb.r;
                if (dxC * dxC + dyC * dyC <= rC * rC) {
                  var foundIndex = asteroids.indexOf(correctAst);
                  if (foundIndex >= 0) {
                    hitAst = correctAst;
                    hitIndex = foundIndex;
                  }
                }
              }
            }
          }
          hitAst.hit = true;
          if (hitAst.isCorrect && isDigitMode() && hitAst.hitsRemaining && hitAst.hitsRemaining > 1) {
            var totalHits = hitAst.hitsTotal || hitAst.hitsRemaining;
            var doneHits = totalHits - hitAst.hitsRemaining + 1;
            hitAst.hitsRemaining -= 1;
            hitAst.hit = false;
            hitAst.shakeTimer = 0.18;
            hitAst.shakeDur = 0.18;
            hitAst.shakeAmp = 3.8;
            impactDebris(hitAst.x, hitAst.y);
            var thud = playSfx(state, "impact_thud", 0.35);
            if (thud) {
              thud.playbackRate = 1 + Math.min(0.5, doneHits * 0.05);
            }
            break;
          }
          if (hitAst.ghost || hitAst.label === null) {
            state.score += 2;
            impactDebris(hitAst.x, hitAst.y);
            playSfx(state, "impact_thud", 0.4);
            asteroids.splice(hitIndex, 1);
            break;
          }
          if (hitAst.isCorrect && hitAst.waveId === state.waveId) {
            var wid = state.waveId;
            state.correctInPlay = false;
            state.correctAsteroidId = 0;
            impactCorrect(hitAst.x, hitAst.y, hitAst.r);
            retireWave(wid);
            bestStreak = Math.max(bestStreak, state.streak + 1);
            onCorrectHit(hitAst.label);
            stopHits = true;
            clearedWaveId = wid;
          } else {
            recordFactMiss(state.a, state.b);
            impactWrong(hitAst.x, hitAst.y);
            onWrongHit();
          }
          if (kind === "laser") {
            spawnSplitAsteroids(hitAst);
            asteroids.splice(hitIndex, 1);
          } else if (kind === "fire") {
            markAsteroidEffect(hitAst, "burn", 1.6);
          } else if (kind === "ice") {
            markAsteroidEffect(hitAst, "freeze", 1.1);
          } else if (kind === "electric") {
            asteroids.splice(hitIndex, 1);
            chainDestroy(hitAst, 140, 3);
          } else if (kind === "plasma") {
            asteroids.splice(hitIndex, 1);
            chainDestroy(hitAst, 180, 4);
          } else if (kind === "rail") {
            asteroids.splice(hitIndex, 1);
            chainDestroy(hitAst, 160, 2);
          } else {
            asteroids.splice(hitIndex, 1);
          }
          if (clearedWaveId !== null && isDigitMode()) {
            clearWaveAsteroids(clearedWaveId);
            clearedWaveId = null;
          }
          break;
        }
      }
      if (stopHits)
        break;
    }
    for (var ai3 = aliens.length - 1; ai3 >= 0; ai3--) {
      var al = aliens[ai3];
      for (var bj2 = bullets.length - 1; bj2 >= 0; bj2--) {
        var bb2 = bullets[bj2];
        if (bb2.noHit)
          continue;
        var dxA = al.x - bb2.x;
        var dyA = al.y - bb2.y;
        if (dxA * dxA + dyA * dyA <= (al.r + bb2.r) * (al.r + bb2.r)) {
          if (bb2.pierce && bb2.pierce > 0) {
            bb2.pierce -= 1;
          } else {
            bullets.splice(bj2, 1);
          }
          al.hitShake = 0.35;
          al.hitsTaken += 1;
          if (al.hitsTaken >= al.answer) {
            state.aliensShot += 1;
            state.score += al.score;
            impactDebris(al.x, al.y);
            playSfx(state, "alien_kill", 0.65);
            aliens.splice(ai3, 1);
            showToast("ALIEN CLEARED");
            break;
          }
        }
      }
    }
    for (var ac = aliens.length - 1; ac >= 0; ac--) {
      var al2 = aliens[ac];
      var dxC = al2.x - player.x;
      var dyC = al2.y - (player.y - 4);
      if (dxC * dxC + dyC * dyC < (al2.r + 18) * (al2.r + 18)) {
        if (player.invuln <= 0) {
          state.alienCollisions += 1;
          kickShake(18, 0.16);
          state.collisionSlow = Math.max(state.collisionSlow || 0, 1);
          player.shipShake = Math.max(player.shipShake || 0, 1);
          var distC = Math.max(1, Math.hypot(dxC, dyC));
          var knockBackAlien = 0.75;
          player.vx = -dxC / distC * player.speed * knockBackAlien;
          player.vy = -dyC / distC * player.speed * knockBackAlien;
          var dmgHit = 0.45;
          if (player.defenseMode === "armor")
            dmgHit *= 0.6;
          if (player.defenseMode === "shield") {
            impactDebris(player.x, player.y - 8);
            playSfx(state, "impact", 0.4);
            player.hitFlash = 1;
            player.shipShake = Math.max(player.shipShake || 0, 0.26);
            player.invuln = 0.45;
            state.streak = 0;
            syncHud();
            showToast("SHIELD BLOCK");
          } else {
            impactShipHit(player.x, player.y - 10);
            playSfx(state, "crash", 0.6);
            player.hitFlash = 1;
            player.shipShake = Math.max(player.shipShake || 0, 0.34);
            player.invuln = 0.55;
            player.hull = clamp(player.hull - dmgHit, 0, 1);
            state.streak = 0;
            syncHud();
            if (player.hull <= 0) {
              player.hull = 0;
              syncHud();
              state.endReasonDetail = "HULL DEPLETED (ALIEN COLLISION)";
              endGame("destroyed");
              return;
            } else {
              playSfx(state, "ship_damaged");
              showToast("ALIEN COLLISION");
            }
          }
        }
        var distC = Math.max(1, Math.hypot(dxC, dyC));
        al2.x += dxC / distC * 24;
        al2.y += dyC / distC * 24;
        al2.hitShake = Math.max(al2.hitShake || 0, 0.4);
      }
    }
    for (var ab = alienBullets.length - 1; ab >= 0; ab--) {
      var abul = alienBullets[ab];
      var dxp = abul.x - player.x;
      var dyp = abul.y - (player.y - 4);
      if (dxp * dxp + dyp * dyp < (abul.r + 16) * (abul.r + 16)) {
        alienBullets.splice(ab, 1);
        if (player.invuln <= 0) {
          state.alienShotsHit += 1;
          kickShake(12, 0.12);
          state.collisionSlow = Math.max(state.collisionSlow || 0, 1);
          player.shipShake = Math.max(player.shipShake || 0, 1);
          var distP = Math.max(1, Math.hypot(dxp, dyp));
          var knockBackBullet = 0.5;
          player.vx = -dxp / distP * player.speed * knockBackBullet;
          player.vy = -dyp / distP * player.speed * knockBackBullet;
          var dmgHit = 0.35;
          if (player.defenseMode === "armor")
            dmgHit *= 0.6;
          if (player.defenseMode === "shield") {
            impactDebris(player.x, player.y - 8);
            playSfx(state, "impact", 0.35);
            player.hitFlash = 1;
            player.shipShake = Math.max(player.shipShake || 0, 0.2);
            player.invuln = 0.35;
            state.streak = 0;
            syncHud();
            showToast("SHIELD BLOCK");
          } else {
            impactShipHit(player.x, player.y - 10);
            playSfx(state, "crash", 0.45);
            player.hitFlash = 1;
            player.shipShake = Math.max(player.shipShake || 0, 0.28);
            player.invuln = 0.45;
            player.hull = clamp(player.hull - dmgHit, 0, 1);
            state.streak = 0;
            syncHud();
            if (player.hull <= 0) {
              player.hull = 0;
              syncHud();
              state.endReasonDetail = "HULL DEPLETED (ALIEN SHOT)";
              endGame("destroyed");
              return;
            } else {
              playSfx(state, "ship_damaged");
              showToast("HULL DAMAGED");
            }
          }
        }
      }
    }
    powerupManager.update();
  }
  function resolveAsteroidCollisions() {
    if (asteroids.length < 2)
      return;
    for (var i = 0; i < asteroids.length; i++) {
      var a = asteroids[i];
      if (a.ghost)
        continue;
      for (var j = i + 1; j < asteroids.length; j++) {
        var b = asteroids[j];
        if (b.ghost)
          continue;
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var dist = Math.hypot(dx, dy);
        var minDist = a.r + b.r + 2;
        if (dist <= 0 || dist >= minDist)
          continue;
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
        if (relVel < 0) {
          var m1 = a.r * a.r;
          var m2 = b.r * b.r;
          var impulse = -0.85 * relVel / (1 / m1 + 1 / m2);
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
  function updateGameOverFx(dt) {
    if (missionClearFx.active) {
      missionClearFx.t += dt;
      updateCamera(dt);
      updateParticles(dt);
      updateRings(dt);
      if (missionClearFx.phase === "center") {
        var targetX = view.w * 0.5;
        var targetY = view.h * 0.52;
        var settle = 1 - Math.exp(-4.5 * dt);
        player.x += (targetX - player.x) * settle;
        player.y += (targetY - player.y) * settle;
        if (Math.hypot(targetX - player.x, targetY - player.y) < 2) {
          if (missionClearFx.mode === "time") {
            missionClearFx.phase = "exit";
            missionClearFx.exitSpeed = 140;
          } else {
            missionClearFx.phase = "explode";
            missionClearFx.explodeTimer = 0.05;
          }
        }
      } else if (missionClearFx.phase === "explode") {
        missionClearFx.explodeTimer -= dt;
        if (missionClearFx.explodeTimer <= 0) {
          if (asteroids.length > 0) {
            var a = asteroids.pop();
            if (a) {
              spawnRing(a.x, a.y, Math.max(18, a.r + 6));
              spawnParticles(a.x, a.y, "spark");
              spawnParticles(a.x, a.y, "smoke");
            }
            missionClearFx.explodeTimer = 0.12;
          } else {
            if (!missionClearFx.sfxPlayed) {
              playSfx(state, "mission_cleared1");
              missionClearFx.sfxPlayed = true;
            }
            missionClearFx.phase = "exit";
            missionClearFx.exitSpeed = 140;
          }
        }
      } else if (missionClearFx.phase === "exit") {
        missionClearFx.exitSpeed += 620 * dt;
        player.y -= missionClearFx.exitSpeed * dt;
        if (player.y + player.h < -40) {
          player.hidden = true;
          missionClearFx.active = false;
          gameOverFx.active = true;
          gameOverFx.t = 0;
          gameOverFx.reason = missionClearFx.mode === "time" ? "time" : "cleared";
          gameOverFx.shown = false;
        }
      }
      return;
    }
    if (!gameOverFx.active)
      return;
    gameOverFx.t += dt;
    updateCamera(dt);
    updateParticles(dt);
    updateRings(dt);
    if (!gameOverFx.shown && gameOverFx.t > 2.6) {
      showEndOverlay();
      gameOverFx.shown = true;
    }
    if (gameOverFx.t > 5) {
      gameOverFx.active = false;
    }
  }
  function draw() {
    var w = view.w;
    var h = view.h;
    ctx.clearRect(0, 0, w, h);
    if (backgroundSprites[backgroundIndex] && backgroundReady[backgroundIndex]) {
      var bgImg = backgroundSprites[backgroundIndex];
      var baseScale = Math.max(w / bgImg.width, h / bgImg.height);
      var scale = baseScale * backgroundScale;
      var drawW = Math.ceil(bgImg.width * scale) + 4;
      var drawH = Math.ceil(bgImg.height * scale) + 4;
      var maxScroll = Math.max(1, drawH - h);
      if (!state.paused && !screenshotMode) {
        backgroundScroll = (backgroundScroll + 3 * (bg.dt || 1 / 60)) % maxScroll;
      }
      var offX = Math.floor((w - drawW) / 2);
      var offY = Math.floor(h - drawH + backgroundScroll + 160);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bgImg, offX, offY, drawW, drawH);
      ctx.restore();
    } else if (SHOW_STARS) {
      drawStars(w, h);
    }
    if (state.paused && state.running) {
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.fillRect(0, 0, w, h);
    }
    updateTimerHud();
    if (introActive) {
      return;
    }
    ctx.save();
    ctx.translate(cam.x || 0, cam.y || 0);
    for (var i = 0; i < asteroids.length; i++)
      drawAsteroid(asteroids[i]);
    drawAliens(ctx);
    drawPowerups();
    drawRings();
    drawParticles();
    drawAlienBullets(ctx);
    drawBullets();
    drawDashGhosts();
    drawShip();
    ctx.restore();
    if (gameOverFx.active && gameOverFx.reason === "destroyed") {
      ctx.save();
      var t = gameOverFx.t;
      var alphaIn = clamp((t - 0.3) / 0.5, 0, 1);
      var alphaOut = clamp(1 - (t - 2) / 0.5, 0, 1);
      var alpha = Math.min(alphaIn, alphaOut);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(255,77,109,.92)";
      ctx.font = "700 " + Math.max(28, Math.min(64, w * 0.06)) + "px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255,77,109,.35)";
      ctx.shadowBlur = 12;
      ctx.fillText("MISSION FAILED", w / 2, h / 2 - 12);
      ctx.restore();
    }
    if (gameOverFx.active && gameOverFx.reason === "cleared") {
      ctx.save();
      var t2 = gameOverFx.t;
      var alphaIn2 = clamp((t2 - 0.3) / 0.5, 0, 1);
      var alphaOut2 = clamp(1 - (t2 - 2) / 0.5, 0, 1);
      var alpha2 = Math.min(alphaIn2, alphaOut2);
      ctx.globalAlpha = alpha2;
      ctx.fillStyle = "rgba(0,229,255,.92)";
      ctx.font = "700 " + Math.max(28, Math.min(64, w * 0.06)) + "px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,229,255,.35)";
      ctx.shadowBlur = 12;
      ctx.fillText("MISSION CLEARED", w / 2, h / 2 - 12);
      ctx.restore();
    }
    if (gameOverFx.active && gameOverFx.reason === "time") {
      ctx.save();
      var t3 = gameOverFx.t;
      var alpha3 = clamp((t3 - 0.6) / 1.4, 0, 1);
      ctx.globalAlpha = alpha3;
      ctx.fillStyle = "rgba(255,221,0,.92)";
      ctx.font = "700 " + Math.max(28, Math.min(64, w * 0.06)) + "px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(255,221,0,.35)";
      ctx.shadowBlur = 12;
      ctx.fillText("TIME'S UP", w / 2, h / 2 - 12);
      ctx.restore();
    }
    if (!state.over) {
      if (introActive) {
        return;
      }
      var hudFade = 1;
      if (countdownActive) {
        var elapsedHud = Math.max(0, (performance.now() - countdownStartAt) / 1e3);
        var durHud = countdownDurationSec || 2.4;
        hudFade = clamp(elapsedHud / durHud, 0, 1);
      } else if (introHudHold) {
        hudFade = 0;
      }
      ctx.save();
      ctx.globalAlpha = hudFade;
      ctx.save();
      var size = Math.max(28, Math.min(64, w * 0.06));
      ctx.fillStyle = "rgba(232,236,255,.95)";
      ctx.font = "700 " + size + "px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(0,229,255,.35)";
      ctx.shadowBlur = 8;
      var labelStyle = "600 11px Oxanium, sans-serif";
      var labelColor = "rgba(232,236,255,.75)";
      var op = isAdditionMode() ? "+" : "\xD7";
      var questionTop = view.hudH + 14;
      var qRaw = getQuestionRawText();
      var qParsed = parseRepeatingText(qRaw);
      var qDisplay = qParsed.display;
      ctx.fillText(qDisplay, w / 2, questionTop);
      if (qParsed.repeatStart >= 0 && qParsed.repeatLen > 0) {
        var qWidth = ctx.measureText(qDisplay).width;
        var qLeft = w / 2 - qWidth / 2;
        var leftW = ctx.measureText(qDisplay.slice(0, qParsed.repeatStart)).width;
        var repeatW = ctx.measureText(qDisplay.slice(qParsed.repeatStart, qParsed.repeatStart + qParsed.repeatLen)).width;
        var lineY = questionTop - size * 0.08;
        ctx.strokeStyle = "rgba(232,236,255,.85)";
        ctx.lineWidth = Math.max(1, size * 0.06);
        ctx.beginPath();
        ctx.moveTo(qLeft + leftW, lineY);
        ctx.lineTo(qLeft + leftW + repeatW, lineY);
        ctx.stroke();
      }
      ctx.restore();
      var barX = 120;
      var barY = view.hudH + 10;
      var barW = Math.min(260, w * 0.35);
      var barH = 10;
      var barGap = 8;
      var hudBars = [];
      var hullRatio = clamp(player.hull, 0, 1);
      hudBars.push({
        label: "HP",
        ratio: hullRatio,
        fill: "rgba(28,220,120,.9)",
        glow: "rgba(28,220,120,.35)"
      });
      if (state.timeLimitSec > 0) {
        var elapsedProg = getElapsedSeconds();
        hudBars.push({
          label: "TIME",
          ratio: clamp(elapsedProg / state.timeLimitSec, 0, 1),
          fill: "rgba(0,169,255,.9)",
          glow: "rgba(0,169,255,.35)"
        });
      }
      var targetCount = state.questionLimit || 0;
      if (!targetCount && state.targetMode && state.targetMode.charAt(0) === "q") {
        var parsedTargets = parseInt(state.targetMode.slice(1), 10);
        if (!Number.isNaN(parsedTargets) && parsedTargets > 0)
          targetCount = parsedTargets;
      }
      if (targetCount > 0) {
        hudBars.push({
          label: "ASTEROIDS SHOT",
          ratio: clamp(state.questionsCompleted / targetCount, 0, 1),
          fill: "rgba(210,210,210,.92)",
          glow: "rgba(255,255,255,.25)"
        });
      }
      if (hudBars.length) {
        for (var bi = 0; bi < hudBars.length; bi++) {
          var bY = barY + bi * (barH + barGap);
          var b = hudBars[bi];
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,.4)";
          ctx.strokeStyle = "rgba(255,255,255,.22)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(barX, bY, barW, barH, 8);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = b.fill;
          ctx.shadowColor = b.glow;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(barX, bY, barW * b.ratio, barH, 8);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = labelColor;
          ctx.font = labelStyle;
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(b.label, barX - 8, bY + barH / 2);
          ctx.restore();
        }
      }
      var profile = getShipProfile(player.shipType);
      var dashLeft = Math.max(0, player.dashCooldown || 0);
      var shockLeft = Math.max(0, player.shockwaveCooldown || 0);
      var dashMax = profile.dashCooldown || 1.3;
      var shockMax = profile.shockwaveCooldown || 3.5;
      var dashFrac = clamp(1 - dashLeft / dashMax, 0, 1);
      var shockFrac = clamp(1 - shockLeft / shockMax, 0, 1);
      var radius = 20;
      var gap = 30;
      var rightMargin = 24;
      var rightX = w - rightMargin - radius;
      var leftX = rightX - (radius * 2 + gap);
      var cy = view.hudH + radius + 8;
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,.2)";
      ctx.beginPath();
      ctx.arc(leftX, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rightX, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(0,229,255,.75)";
      ctx.beginPath();
      ctx.arc(leftX, cy, radius, -Math.PI / 2, -Math.PI / 2 + dashFrac * Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rightX, cy, radius, -Math.PI / 2, -Math.PI / 2 + shockFrac * Math.PI * 2);
      ctx.stroke();
      var iconSize = radius * 1.45;
      var iconY = cy - iconSize / 2;
      var dashIcon = cooldownIcons.dash;
      if (dashIcon && dashIcon.ready) {
        ctx.globalAlpha = 0.9 * hudFade;
        ctx.drawImage(dashIcon.img, leftX - iconSize / 2, iconY, iconSize, iconSize);
      }
      var abilityKey = "shockwave";
      if (profile.ability === "flares")
        abilityKey = "flares";
      else if (profile.ability === "spin")
        abilityKey = "teleport";
      var abilityIcon = cooldownIcons[abilityKey];
      if (abilityIcon && abilityIcon.ready) {
        ctx.globalAlpha = 0.9 * hudFade;
        ctx.drawImage(abilityIcon.img, rightX - iconSize / 2, iconY, iconSize, iconSize);
      }
      ctx.restore();
      ctx.restore();
    }
    if (state.paused && state.running) {
      ctx.save();
      ctx.fillStyle = "rgba(232,236,255,.92)";
      ctx.font = "700 20px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PAUSED", w / 2, h / 2 - 6);
      ctx.font = "600 14px Oxanium, sans-serif";
      ctx.fillStyle = "rgba(232,236,255,.72)";
      ctx.fillText("PRESS P TO RESUME", w / 2, h / 2 + 18);
      ctx.restore();
    }
    if (screenshotMode && state.running) {
      ctx.save();
      ctx.fillStyle = "rgba(232,236,255,.55)";
      ctx.font = "600 12px Oxanium, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("SCREENSHOT MODE (0)", w - 12, h - 10);
      ctx.restore();
    }
  }
  function drawPowerups() {
    if (!powerups.length)
      return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < powerups.length; i++) {
      var p = powerups[i];
      var color = getPowerupColor(p);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.globalAlpha = 0.9;
      var glow = ctx.createRadialGradient(0, 0, 2, 0, 0, p.r + 10);
      glow.addColorStop(0, color.replace("0.7", "0.35"));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, p.r + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.95;
      drawPowerupIcon(p, color);
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  function getPowerupColor(p) {
    if (p.group === "defense") {
      return p.type === "shield" ? "rgba(193,216,47,.7)" : "rgba(255,77,109,.7)";
    }
    if (p.group === "secondary") {
      return p.type === "repair" ? "rgba(0,229,255,.7)" : p.type === "time" ? "rgba(175,0,111,.7)" : p.type === "magnet" ? "rgba(255,221,0,.7)" : p.type === "emp" ? "rgba(175,0,111,.7)" : "rgba(193,216,47,.7)";
    }
    if (p.type === "dual")
      return "rgba(0,229,255,.7)";
    if (p.type === "laser")
      return "rgba(0,229,255,.7)";
    if (p.type === "fire")
      return "rgba(255,77,109,.7)";
    if (p.type === "ice")
      return "rgba(180,220,255,.8)";
    if (p.type === "electric")
      return "rgba(255,221,0,.8)";
    if (p.type === "pierce")
      return "rgba(175,0,111,.7)";
    if (p.type === "plasma")
      return "rgba(193,216,47,.7)";
    if (p.type === "rail")
      return "rgba(0,229,255,.7)";
    return "rgba(255,221,0,.7)";
  }
  function drawPowerupIcon(p, color) {
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (p.group === "secondary" && (p.type === "repair" || p.type === "magnet" || p.type === "time")) {
      var emoji = p.type === "repair" ? "\u{1F6E0}\uFE0F" : p.type === "magnet" ? "\u{1F9F2}" : "\u23F1\uFE0F";
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      var emojiSize = p.type === "time" ? 30 : 26;
      ctx.font = emojiSize + "px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, 0, 0);
      ctx.restore();
      return;
    }
    if (p.group === "offense") {
      if (p.type === "ice") {
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(6, 10);
        ctx.lineTo(-6, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        return;
      }
      if (p.type === "laser" || p.type === "rail") {
        ctx.beginPath();
        ctx.rect(-3, -14, 6, 28);
        ctx.fill();
        ctx.stroke();
        return;
      }
      if (p.type === "dual") {
        ctx.beginPath();
        ctx.rect(-10, -10, 6, 20);
        ctx.rect(4, -10, 6, 20);
        ctx.fill();
        ctx.stroke();
        return;
      }
      if (p.type === "fire") {
        ctx.beginPath();
        ctx.arc(0, 2, 9, 0, Math.PI * 2);
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
      if (p.type === "electric") {
        ctx.beginPath();
        ctx.moveTo(-6, -12);
        ctx.lineTo(2, -4);
        ctx.lineTo(-2, 2);
        ctx.lineTo(6, 12);
        ctx.stroke();
        return;
      }
      if (p.type === "pierce") {
        ctx.beginPath();
        ctx.moveTo(0, -14);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 14);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.stroke();
        return;
      }
      if (p.type === "plasma") {
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
    }
    if (p.group === "defense") {
      if (p.type === "shield") {
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
    if (p.group === "secondary") {
      if (p.type === "repair") {
        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-6, 6);
        ctx.lineTo(4, -4);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(6, -6, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.rect(-10, 2, 6, 8);
        ctx.fill();
        ctx.stroke();
        return;
      }
      if (p.type === "magnet") {
        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(-8, 6);
        ctx.arc(0, 6, 8, Math.PI, 0, false);
        ctx.lineTo(8, -8);
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.rect(-10, -12, 4, 5);
        ctx.rect(6, -12, 4, 5);
        ctx.fill();
        ctx.stroke();
        return;
      }
    }
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  function drawBullets() {
    if (!bullets.length)
      return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < bullets.length; i++) {
      let drawTrail = function(color, len, width, alpha) {
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
      };
      var b = bullets[i];
      if (b.kind === "laser") {
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
      if (b.kind === "rail") {
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
      if (b.kind === "fire") {
        drawTrail("rgba(255,77,109,.75)", b.r * 7.5, b.r * 1.6, 0.6);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "rgba(255,77,109,.95)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = "rgba(255,221,0,.75)";
        ctx.beginPath();
        ctx.arc(b.x - 1, b.y + 1, b.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (b.kind === "plasma") {
        drawTrail("rgba(0,229,255,.7)", b.r * 7, b.r * 1.6, 0.55);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "rgba(193,216,47,.9)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "rgba(0,229,255,.65)";
        ctx.beginPath();
        ctx.arc(b.x - 1, b.y + 1, b.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (b.kind === "ice") {
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
      if (b.kind === "electric") {
        drawTrail("rgba(255,221,0,.75)", 28, 4, 0.55);
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "rgba(255,221,0,.95)";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(b.x - 2, b.y + 10);
        ctx.lineTo(b.x + 3, b.y + 4);
        ctx.lineTo(b.x - 3, b.y - 2);
        ctx.lineTo(b.x + 2, b.y - 12);
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "rgba(255,221,0,.45)";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(b.x - 2, b.y + 10);
        ctx.lineTo(b.x + 3, b.y + 4);
        ctx.lineTo(b.x - 3, b.y - 2);
        ctx.lineTo(b.x + 2, b.y - 12);
        ctx.stroke();
        continue;
      }
      if (b.kind === "pierce") {
        drawTrail("rgba(175,0,111,.8)", b.r * 6.5, 4.2, 0.55);
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "rgba(175,0,111,.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "rgba(255,221,0,.7)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      drawTrail("rgba(255,221,0,.85)", b.r * 6.5, 4, 0.6);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(255,221,0,.95)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  function drawAsteroid(a) {
    var ring = !a.ghost && a.waveId === state.waveId && a.label !== null;
    var rot = a.rot || 0;
    var drawX = a.x;
    var drawY = a.y;
    if (a.shakeTimer != null && a.shakeTimer > 0) {
      var shakeDur = a.shakeDur || 0.18;
      var shakeT = Math.max(0, a.shakeTimer / shakeDur);
      var shakeAmp = (a.shakeAmp || 3) * shakeT;
      var now = performance.now();
      drawX += Math.sin(now * 0.08 + a.id) * shakeAmp;
      drawY += Math.cos(now * 0.09 + a.id * 1.7) * shakeAmp;
    }
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(rot);
    if (a.spriteIndex == null || a.spriteIndex < 0 || a.spriteIndex >= asteroidSprites.length) {
      a.spriteIndex = randi(0, asteroidSprites.length - 1);
    }
    var sprite = asteroidSprites[a.spriteIndex];
    if (sprite && asteroidSpriteReady[a.spriteIndex]) {
      ctx.save();
      ctx.globalAlpha = a.ghost ? 0.2 : 0.95;
      ctx.drawImage(sprite, -a.r, -a.r, a.r * 2, a.r * 2);
      ctx.restore();
    } else {
      ctx.beginPath();
      var points = 10;
      var wob = 0.22;
      for (var i = 0; i <= points; i++) {
        var ang = i / points * Math.PI * 2;
        var rr = a.r * (1 - wob / 2 + Math.sin(i * 2.1 + a.seed) * wob);
        var px = Math.cos(ang) * rr;
        var py = Math.sin(ang) * rr;
        if (i === 0)
          ctx.moveTo(px, py);
        else
          ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = a.ghost ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.12)";
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "rgba(232,236,255,.14)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, a.r * 0.96, -0.3, Math.PI * 2 - 0.9);
      ctx.stroke();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = "rgba(0,0,0,.22)";
      for (var c = 0; c < 3; c++) {
        var cx = Math.sin(a.seed * 3.1 + c * 1.7) * a.r * 0.42;
        var cy = Math.cos(a.seed * 2.4 + c * 2.1) * a.r * 0.34;
        var cr = a.r * (0.1 + c % 3 * 0.04);
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (a.burning) {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(255,140,60,.55)";
      ctx.beginPath();
      ctx.arc(0, 0, a.r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,90,40,.8)";
      for (var f = 0; f < 3; f++) {
        var fx2 = Math.sin(a.seed * 4.2 + f * 2.1) * a.r * 0.4;
        var fy = -a.r * 0.35 + f * 4;
        ctx.beginPath();
        ctx.moveTo(fx2, fy);
        ctx.lineTo(fx2 - 6, fy + 12);
        ctx.lineTo(fx2 + 6, fy + 12);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (a.frozen) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = "rgba(120,220,255,.18)";
      ctx.beginPath();
      ctx.arc(0, 0, a.r * 0.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,240,255,.6)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-a.r * 0.4, -a.r * 0.1);
      ctx.lineTo(a.r * 0.2, a.r * 0.25);
      ctx.lineTo(a.r * 0.4, -a.r * 0.3);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (ring) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,.18)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drawX, drawY, a.r + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (player.lockTimer > 0 && a.id === state.correctAsteroidId && a.waveId === state.waveId) {
      ctx.save();
      ctx.strokeStyle = "rgba(0,229,255,.65)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(drawX, drawY, a.r + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (a.label !== null) {
      ctx.save();
      var size = Math.max(14, Math.min(22, a.r * 0.7));
      ctx.font = "700 " + size + "px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var parsed = parseRepeatingText(a.label);
      var text = parsed.display;
      var pad = Math.max(6, size * 0.55);
      var boxW = ctx.measureText(text).width + pad;
      var boxH = size * 1.05;
      ctx.fillStyle = "rgba(0,0,0,.6)";
      ctx.beginPath();
      ctx.roundRect(drawX - boxW / 2, drawY - boxH / 2, boxW, boxH, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(232,236,255,.90)";
      ctx.fillText(text, drawX, drawY);
      if (parsed.repeatStart >= 0 && parsed.repeatLen > 0) {
        var leftW = ctx.measureText(text.slice(0, parsed.repeatStart)).width;
        var repeatW = ctx.measureText(text.slice(parsed.repeatStart, parsed.repeatStart + parsed.repeatLen)).width;
        var lineY = drawY - size * 0.52;
        ctx.strokeStyle = "rgba(232,236,255,.85)";
        ctx.lineWidth = Math.max(1, size * 0.06);
        ctx.beginPath();
        ctx.moveTo(drawX - ctx.measureText(text).width / 2 + leftW, lineY);
        ctx.lineTo(drawX - ctx.measureText(text).width / 2 + leftW + repeatW, lineY);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawShip() {
    if (player.hidden)
      return;
    if (player.teleportFx) {
      var fx2 = player.teleportFx;
      var t = fx2.t || 0;
      if (t < fx2.ghostDur) {
        var ghostIn = Math.min(0.08, fx2.ghostDur * 0.4);
        var ghostAlpha = t <= ghostIn ? t / Math.max(1e-3, ghostIn) * 0.55 : 0.55 * (1 - (t - ghostIn) / Math.max(1e-3, fx2.ghostDur - ghostIn));
        if (ghostAlpha > 0.01) {
          renderShip(fx2.startX, fx2.startY, ghostAlpha, true, 0, 0);
        }
      }
      if (t >= fx2.hide) {
        var p = Math.min(1, (t - fx2.hide) / Math.max(1e-3, fx2.zoomDur));
        var ease = 1 - Math.pow(1 - p, 2);
        var scaleMul = 0.2 + 0.8 * ease;
        var alpha = 0.35 + 0.65 * ease;
        renderShip(fx2.endX, fx2.endY, alpha, false, 0, 0, null, scaleMul);
      }
      if (t < fx2.hide + fx2.zoomDur)
        return;
    }
    if (player.teleportHide > 0)
      return;
    var baseShake = player.shipShake ? player.shipShake * 4.5 : 0;
    var collisionShake = state.collisionSlow ? state.collisionSlow * 7.5 : 0;
    var shake = baseShake + collisionShake;
    var sx = shake ? Math.sin(performance.now() * 0.05) * shake : 0;
    var sy = shake ? Math.cos(performance.now() * 0.045) * shake : 0;
    renderShip(player.x + sx, player.y + sy, 1, false);
  }
  function drawDashGhosts() {
    if (!dashGhosts.length)
      return;
    for (var i = 0; i < dashGhosts.length; i++) {
      var g = dashGhosts[i];
      renderShip(g.x, g.y, g.a, true, g.vx, g.vy, { thrustFocus: g.thrustFocus });
    }
  }
  function spawnDashGhosts(sx, sy, ex, ey, dirX, dirY) {
    var count = 5;
    var baseAlpha = 0.7;
    var thrustFocus = dirY < -0.2;
    for (var i = 1; i <= count; i++) {
      var t = i / (count + 1);
      dashGhosts.push({
        x: sx + (ex - sx) * t,
        y: sy + (ey - sy) * t,
        vx: dirX * player.speed,
        vy: dirY * player.speed,
        life: 0.32,
        max: 0.32,
        a: baseAlpha * (1 - t) + 0.08,
        thrustFocus
      });
    }
    if (dashGhosts.length > 24)
      dashGhosts.splice(0, dashGhosts.length - 24);
  }
  function findAsteroidCollisionAt(x, y) {
    for (var i = asteroids.length - 1; i >= 0; i--) {
      var a = asteroids[i];
      if (a.noDamage)
        continue;
      var dx = a.x - x;
      var dy = a.y - (y - 4);
      if (Math.hypot(dx, dy) < a.r + 16) {
        return { index: i, asteroid: a, dx, dy };
      }
    }
    return null;
  }
  function handleShipAsteroidCollision(a, hitX, hitY, force) {
    if (a.noDamage)
      return false;
    var dx = a.x - hitX;
    var dy = a.y - (hitY - 4);
    var dist = Math.hypot(dx, dy);
    if (dist >= a.r + 16)
      return false;
    if (force || player.invuln <= 0) {
      player.blasterMode = "single";
      player.blasterTimer = 0;
      if (a.isCorrect && a.waveId === state.waveId) {
        state.correctInPlay = false;
        state.correctAsteroidId = 0;
      }
      kickShake(18, 0.14);
      state.asteroidCollisions += 1;
      state.collisionSlow = Math.max(state.collisionSlow || 0, 1);
      var knockBack = 0.7;
      player.vx = -dx / Math.max(1, dist) * player.speed * knockBack;
      player.vy = -dy / Math.max(1, dist) * player.speed * knockBack;
      var dmgHit = a.ghost || a.label === null ? 0.18 : 0.3;
      if (player.defenseMode === "armor")
        dmgHit = 0;
      if (player.defenseMode === "shield") {
        impactDebris(hitX, hitY - 8);
        playSfx(state, "impact", 0.35);
        player.hitFlash = 1;
        player.shipShake = Math.max(player.shipShake || 0, 1);
        player.invuln = 0.35;
        state.streak = 0;
        syncHud();
        showToast("SHIELD BLOCK");
      } else if (player.defenseMode === "armor") {
        impactShipHit(hitX, hitY - 10);
        playSfx(state, "impact_thud", 0.45);
        player.hitFlash = 1;
        player.shipShake = Math.max(player.shipShake || 0, 1);
        player.invuln = 0.35;
        state.streak = 0;
        syncHud();
        showToast("ARMOR ABSORB");
      } else {
        impactShipHit(hitX, hitY - 10);
        playSfx(state, "crash", 0.55);
        player.hitFlash = 1;
        player.shipShake = Math.max(player.shipShake || 0, 1);
        player.invuln = 0.45;
        player.hull = clamp(player.hull - dmgHit, 0, 1);
        state.streak = 0;
        syncHud();
        if (player.hull <= 0) {
          player.hull = 0;
          syncHud();
          state.endReasonDetail = "HULL DEPLETED (ASTEROID COLLISION)";
          endGame("destroyed");
          return true;
        } else {
          playSfx(state, "ship_damaged");
          showToast("HULL DAMAGED");
        }
      }
    }
    return true;
  }
  function updateDashGhosts(dt) {
    for (var i = dashGhosts.length - 1; i >= 0; i--) {
      var g = dashGhosts[i];
      g.life -= dt;
      if (g.life <= 0) {
        dashGhosts.splice(i, 1);
        continue;
      }
      g.a = Math.max(0, g.life / g.max) * 0.8;
    }
  }
  function renderShip(x, y, alpha, ghost, overrideVX, overrideVY, ghostStyle, scaleMul) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    var dmg = 1 - clamp(player.hull, 0, 1);
    var useVX = typeof overrideVX === "number" ? overrideVX : player.vx;
    var useVY = typeof overrideVY === "number" ? overrideVY : player.vy;
    var vxN = clamp(useVX / player.speed, -1, 1);
    var vyN = clamp(useVY / player.speed, -1, 1);
    var bank = typeof player.bankHold === "number" ? player.bankHold : vxN;
    var turn = bank * 0.03;
    var tilt = 0;
    var squashX = 1 - Math.abs(bank) * 0.06;
    var bob = Math.sin(performance.now() * 0.01) * 0.7;
    var forwardStretch = Math.max(0, -vyN) * 0.06;
    var backwardShrink = Math.max(0, vyN) * 0.08;
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
    var scale = scaleMap[shipType] || 0.74;
    if (typeof scaleMul === "number")
      scale *= scaleMul;
    ctx.scale(scale, scale);
    if (!isFinite(x) || !isFinite(y)) {
      ctx.restore();
      return;
    }
    var swayAmp = 8e-3 + speedMag * 0.01;
    var sway = Math.sin(t * 4e-3) * swayAmp;
    var shear = 0;
    ctx.rotate(turn);
    ctx.transform(1, 0, shear, 1, 0, 0);
    ctx.scale(squashX * (1 + sway) * (1 - backwardShrink * 0.4), (1 - sway * 0.6) * (1 + forwardStretch - backwardShrink));
    if (player.defenseMode === "armor" && !ghost) {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.shadowColor = "rgba(180,220,255,.95)";
      ctx.shadowBlur = 22;
      ctx.strokeStyle = "rgba(180,220,255,.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.lineTo(30, -8);
      ctx.lineTo(36, 20);
      ctx.lineTo(22, 52);
      ctx.lineTo(0, 64);
      ctx.lineTo(-22, 52);
      ctx.lineTo(-36, 20);
      ctx.lineTo(-30, -8);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "rgba(120,200,255,.25)";
      ctx.fill();
      ctx.restore();
    }
    if (player.defenseMode === "shield" && !ghost) {
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = "rgba(0,229,255,.75)";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, -26, 30, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "rgba(0,229,255,.35)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, -26, 30, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, 3, 30, 0, Math.PI * 2);
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
        canopyStroke: "rgba(8,10,14,.7)",
        thruster: "rgba(18,22,32,.85)",
        flame: "rgba(255,190,80,.8)",
        icon: "rgba(255,255,255,.9)",
        outline: "rgba(8,10,14,.8)",
        glow: "rgba(80,255,200,.35)"
      },
      fizard: {
        body: "rgba(90,180,255,.95)",
        wing: "rgba(45,120,220,.92)",
        accent: "rgba(255,190,100,.95)",
        highlight: "rgba(120,255,220,.9)",
        canopy: "rgba(120,240,255,.9)",
        canopyStroke: "rgba(8,10,14,.7)",
        thruster: "rgba(18,22,32,.85)",
        flame: "rgba(255,200,120,.85)",
        icon: "rgba(255,255,255,.9)",
        outline: "rgba(8,10,14,.8)",
        glow: "rgba(120,200,255,.35)"
      },
      classic: {
        body: "rgba(255,180,60,.95)",
        wing: "rgba(200,120,40,.92)",
        accent: "rgba(255,80,200,.9)",
        highlight: "rgba(255,230,120,.9)",
        canopy: "rgba(90,240,230,.85)",
        canopyStroke: "rgba(8,10,14,.7)",
        thruster: "rgba(22,18,28,.85)",
        flame: "rgba(255,140,90,.85)",
        icon: "rgba(255,255,255,.9)",
        outline: "rgba(8,10,14,.8)",
        glow: "rgba(255,150,80,.35)"
      },
      ember: {
        body: "rgba(255,80,190,.96)",
        wing: "rgba(160,40,130,.95)",
        accent: "rgba(255,230,90,.95)",
        highlight: "rgba(60,255,230,.85)",
        canopy: "rgba(120,255,230,.85)",
        canopyStroke: "rgba(8,10,14,.7)",
        thruster: "rgba(22,18,28,.85)",
        flame: "rgba(255,200,90,.85)",
        icon: "rgba(255,255,255,.9)",
        outline: "rgba(8,10,14,.8)",
        glow: "rgba(255,120,210,.35)"
      },
      azure: {
        body: "rgba(70,180,255,.95)",
        wing: "rgba(30,130,200,.92)",
        accent: "rgba(255,240,120,.95)",
        highlight: "rgba(90,255,230,.9)",
        canopy: "rgba(255,160,70,.9)",
        canopyStroke: "rgba(8,10,14,.7)",
        thruster: "rgba(22,26,36,.85)",
        flame: "rgba(255,190,90,.85)",
        icon: "rgba(255,255,255,.9)",
        outline: "rgba(8,10,14,.8)",
        glow: "rgba(120,200,255,.35)"
      },
      spire: {
        body: "rgba(120,90,255,.95)",
        wing: "rgba(80,60,220,.92)",
        accent: "rgba(255,230,90,.95)",
        highlight: "rgba(255,80,200,.9)",
        canopy: "rgba(90,255,240,.85)",
        canopyStroke: "rgba(8,10,14,.7)",
        thruster: "rgba(22,18,32,.85)",
        flame: "rgba(255,180,110,.85)",
        icon: "rgba(255,255,255,.9)",
        outline: "rgba(8,10,14,.8)",
        glow: "rgba(150,120,255,.35)"
      },
      am2: {
        body: "rgba(235,190,210,.95)",
        wing: "rgba(190,130,170,.92)",
        accent: "rgba(255,110,130,.95)",
        highlight: "rgba(120,90,255,.9)",
        canopy: "rgba(180,90,200,.9)",
        canopyStroke: "rgba(8,10,14,.7)",
        thruster: "rgba(20,24,36,.85)",
        flame: "rgba(120,220,255,.9)",
        icon: "rgba(255,255,255,.9)",
        outline: "rgba(8,10,14,.8)",
        glow: "rgba(200,150,190,.35)"
      }
    };
    var colors = palettes[shipType] || palettes.mk7;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12 * (1 - dmg * 0.55);
    var wingLeft = [-16, -8, -50, 12, -56, 22, -50, 30, -22, 28, -8, 6];
    var wingRight = [16, -8, 50, 12, 56, 22, 50, 30, 22, 28, 8, 6];
    var bodyOuter = [0, -34, 18, -10, 26, 6, 22, 22, 14, 34, -14, 34, -22, 22, -26, 6, -18, -10];
    var bodyInner = [0, -24, 10, -2, 12, 20, 0, 30, -12, 20, -10, -2];
    var stripe1 = { x: -26, y: -2, w: 52, h: 4 };
    var stripe2 = { x: -20, y: -12, w: 40, h: 3 };
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
    if (useAzure) {
      wingLeft = [-14, 2, -46, 18, -52, 32, -46, 36, -20, 30, -8, 10];
      wingRight = [14, 2, 46, 18, 52, 32, 46, 36, 20, 30, 8, 10];
      bodyOuter = [0, -32, 14, -6, 20, 12, 18, 24, 12, 34, -12, 34, -18, 24, -20, 12, -14, -6];
      bodyInner = [0, -22, 8, -2, 10, 20, 0, 30, -10, 20, -8, -2];
      stripe1 = { x: -22, y: -2, w: 44, h: 4 };
      stripe2 = { x: -16, y: -12, w: 32, h: 3 };
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
    } else if (shipType === "fizard") {
      wingLeft = [-12, -10, -40, 6, -46, 14, -40, 20, -18, 18, -6, 6];
      wingRight = [12, -10, 40, 6, 46, 14, 40, 20, 18, 18, 6, 6];
      bodyOuter = [0, -38, 14, -12, 20, 4, 18, 18, 10, 32, -10, 32, -18, 18, -20, 4, -14, -12];
      bodyInner = [0, -26, 8, -6, 10, 18, 0, 28, -10, 18, -8, -6];
      stripe1 = { x: -20, y: -2, w: 40, h: 4 };
      stripe2 = { x: -14, y: -12, w: 28, h: 3 };
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
    } else if (shipType === "classic") {
      wingLeft = [-14, -8, -40, 8, -46, 18, -40, 26, -22, 24, -8, 6];
      wingRight = [14, -8, 40, 8, 46, 18, 40, 26, 22, 24, 8, 6];
      gun.barrelLeft = -36;
    } else if (shipType === "spire") {
      wingLeft = [-9, 4, -40, 18, -44, 30, -40, 34, -14, 26, -6, 12];
      wingRight = [9, 4, 40, 18, 44, 30, 40, 34, 14, 26, 6, 12];
      bodyOuter = [0, -40, 12, -10, 20, 10, 18, 24, 8, 36, -8, 36, -18, 24, -20, 10, -12, -10];
      bodyInner = [0, -26, 6, -4, 8, 18, 0, 30, -8, 18, -6, -4];
      stripe1 = { x: -20, y: -2, w: 40, h: 4 };
      stripe2 = { x: -16, y: -10, w: 32, h: 3 };
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
    } else if (shipType === "am2") {
      wingLeft = [-8, -6, -30, 2, -38, 12, -30, 18, -8, 18, -4, 6];
      wingRight = [8, -6, 30, 2, 38, 12, 30, 18, 8, 18, 4, 6];
      bodyOuter = [0, -38, 10, -8, 18, 12, 16, 26, 8, 36, -8, 36, -16, 26, -18, 12, -10, -8];
      bodyInner = [0, -28, 6, -4, 10, 20, 0, 30, -10, 20, -6, -4];
      stripe1 = { x: -12, y: -2, w: 24, h: 6 };
      stripe2 = { x: -10, y: -10, w: 20, h: 4 };
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
    gun.barrelY = gun.y - 18;
    if (shipType === "spire") {
      gun.barrelY -= 6;
    } else if (shipType === "am2") {
      gun.barrelY -= 5;
    }
    ghostStyle = ghostStyle || {};
    var leftScale = clamp(1 + bank * 0.5, 0.5, 1.5);
    var rightScale = clamp(1 - bank * 0.5, 0.5, 1.5);
    var ghostBodyAlpha = ghost && ghostStyle.thrustFocus ? 0.35 : 1;
    var ghostFlameBoost = ghost && ghostStyle.thrustFocus ? 1.45 : 1;
    ctx.save();
    ctx.globalAlpha *= ghostBodyAlpha;
    ctx.fillStyle = colors.wing;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 2;
    function drawWing(points) {
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (var wi = 2; wi < points.length; wi += 2) {
        ctx.lineTo(points[wi], points[wi + 1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
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
    function drawHull() {
      ctx.fillStyle = colors.body;
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(bodyOuter[0], bodyOuter[1]);
      for (var bi = 2; bi < bodyOuter.length; bi += 2) {
        ctx.lineTo(bodyOuter[bi], bodyOuter[bi + 1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bodyInner[0], bodyInner[1]);
      for (var bj = 2; bj < bodyInner.length; bj += 2) {
        ctx.lineTo(bodyInner[bj], bodyInner[bj + 1]);
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
    function drawCanopy() {
      ctx.fillStyle = colors.canopy;
      ctx.strokeStyle = colors.canopyStroke;
      ctx.lineWidth = 1.7;
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
    var blink = (Math.sin(t * 6e-3) + 1) / 2;
    ctx.save();
    ctx.globalAlpha = 0.25 + blink * 0.55;
    ctx.fillStyle = colors.highlight || colors.accent;
    ctx.beginPath();
    ctx.arc(-24, 4, 2.2, 0, Math.PI * 2);
    ctx.arc(24, 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    var isAm2 = shipType === "am2";
    var isSpire = shipType === "spire";
    if (isAm2) {
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
    if (dmg > 0.02) {
      ctx.save();
      ctx.globalAlpha = clamp(dmg * 0.95, 0, 0.95);
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.beginPath();
      ctx.ellipse(-5, 6, 10 + dmg * 10, 6 + dmg * 7, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(6, 2, 7 + dmg * 7, 4 + dmg * 5, 0.3, 0, Math.PI * 2);
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
    if (player.hitFlash > 0 && !ghost) {
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
    var recoil = ghost ? 0 : player.recoil || 0;
    var recoilShift = recoil * 4;
    ctx.fillStyle = colors.accent;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1.6;
    var inset = 3;
    function drawSideGun(xLeft, barrelX) {
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
      ctx.lineTo(barrelX + gun.barrelW / 2, gun.barrelY - recoilShift - 6);
      ctx.closePath();
      ctx.fill();
      if (isAm2) {
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
    var thrusterOffsetX = 0;
    var thrusterOffsetY = 0;
    if (shipType === "classic") {
      thrusterOffsetY = -4;
    }
    var thrusterBaseY = 22 + thrusterOffsetY;
    ctx.fillStyle = colors.thruster || "rgba(18,22,32,.85)";
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1.4;
    if (ghost && ghostStyle.thrustFocus) {
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 1.4);
    }
    if (isSpire) {
      ctx.beginPath();
      ctx.rect(-14 + thrusterOffsetX, thrusterBaseY, 28, 9);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(thrusterOffsetX, thrusterBaseY + 7, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(-10 + thrusterOffsetX, 0);
      ctx.scale(leftScale, 1);
      ctx.translate(10 - thrusterOffsetX, 0);
      ctx.beginPath();
      ctx.rect(-22 + thrusterOffsetX, thrusterBaseY, 22, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-12 + thrusterOffsetX, thrusterBaseY + 6, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(10 + thrusterOffsetX, 0);
      ctx.scale(rightScale, 1);
      ctx.translate(-10 - thrusterOffsetX, 0);
      ctx.beginPath();
      ctx.rect(thrusterOffsetX, thrusterBaseY, 22, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(12 + thrusterOffsetX, thrusterBaseY + 6, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (isAm2) {
        ctx.beginPath();
        ctx.arc(thrusterOffsetX, thrusterBaseY + 8, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
    var flash = ghost ? 0 : player.flash || 0;
    if (flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, flash);
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(-4, -26 - recoilShift);
      ctx.lineTo(0, -38 - recoilShift - flash * 6);
      ctx.lineTo(4, -26 - recoilShift);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    var forwardBoost = Math.max(0, -vyN);
    var flame = 12 + speedMag * 18 + Math.sin(t * 0.03) * 2.6 + forwardBoost * 22;
    flame *= ghostFlameBoost;
    var bloom = 0.35 + speedMag * 0.5 + forwardBoost * 0.6 + Math.sin(t * 0.02) * 0.08;
    bloom *= ghostFlameBoost;
    var flameWiggle = (Math.sin(t * 0.06) + Math.sin(t * 0.11 + 1.4)) * 0.6 * (0.6 + speedMag);
    ctx.save();
    ctx.globalAlpha = 0.2 + bloom * 0.22;
    ctx.fillStyle = colors.flame || "rgba(0,229,255,.35)";
    ctx.shadowColor = colors.flame || "rgba(0,229,255,.4)";
    ctx.shadowBlur = 12 + bloom * 9;
    ctx.beginPath();
    if (isSpire) {
      ctx.arc(thrusterOffsetX, thrusterBaseY + 7, 7 + bloom * 5, 0, Math.PI * 2);
    } else {
      ctx.arc(-12 + thrusterOffsetX, thrusterBaseY + 6, 5 + bloom * 4, 0, Math.PI * 2);
      ctx.arc(12 + thrusterOffsetX, thrusterBaseY + 6, 5 + bloom * 4, 0, Math.PI * 2);
      if (isAm2) {
        ctx.arc(thrusterOffsetX, thrusterBaseY + 8, 4.5 + bloom * 3.5, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.85 + forwardBoost * 0.35;
    ctx.fillStyle = colors.flame || "rgba(193,216,47,.16)";
    ctx.beginPath();
    if (isSpire) {
      ctx.moveTo(-6 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrusterOffsetX + flameWiggle, thrusterBaseY + flame * 1.1);
      ctx.lineTo(6 + thrusterOffsetX, thrusterBaseY);
    } else {
      ctx.moveTo(-18 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(-12 + thrusterOffsetX + flameWiggle, thrusterBaseY + flame);
      ctx.lineTo(-6 + thrusterOffsetX, thrusterBaseY);
      ctx.moveTo(6 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(12 + thrusterOffsetX + flameWiggle, thrusterBaseY + flame);
      ctx.lineTo(18 + thrusterOffsetX, thrusterBaseY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.22 + forwardBoost * 0.25;
    ctx.fillStyle = "rgba(0,229,255,.16)";
    ctx.beginPath();
    if (isSpire) {
      ctx.moveTo(-10 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrusterOffsetX + flameWiggle, thrusterBaseY + flame * 1.22);
      ctx.lineTo(10 + thrusterOffsetX, thrusterBaseY);
    } else {
      ctx.moveTo(-24 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(-12 + thrusterOffsetX + flameWiggle, thrusterBaseY + flame * 1.18);
      ctx.lineTo(thrusterOffsetX, thrusterBaseY);
      ctx.moveTo(thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(12 + thrusterOffsetX + flameWiggle, thrusterBaseY + flame * 1.18);
      ctx.lineTo(24 + thrusterOffsetX, thrusterBaseY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = colors.flame || "rgba(0,229,255,.14)";
    ctx.beginPath();
    if (isSpire) {
      ctx.moveTo(-4 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrusterOffsetX + flameWiggle * 0.6, thrusterBaseY + flame * 0.8);
      ctx.lineTo(4 + thrusterOffsetX, thrusterBaseY);
    } else {
      ctx.moveTo(-14 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(-12 + thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY + flame * 0.7);
      ctx.lineTo(-10 + thrusterOffsetX, thrusterBaseY);
      ctx.moveTo(10 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(12 + thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY + flame * 0.7);
      ctx.lineTo(14 + thrusterOffsetX, thrusterBaseY);
    }
    ctx.closePath();
    ctx.fill();
    if (isAm2) {
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = colors.flame || "rgba(120,220,255,.9)";
      ctx.beginPath();
      ctx.moveTo(-3 + thrusterOffsetX, thrusterBaseY - 2);
      ctx.lineTo(thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY - 2 + flame * 0.9);
      ctx.lineTo(3 + thrusterOffsetX, thrusterBaseY - 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    if (Math.abs(vxN) > 0.18 && !ghost) {
      var sx = vxN > 0 ? -30 : 30;
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
    ctx.arc(0, -20, 6, 0, Math.PI * 2);
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
  btnStart.addEventListener("click", function() {
    requestFullscreen();
    ensureLoop();
    applySettings();
    unlockSfx(state);
    playSfx(state, "menu_beep");
    if (!startIntroThenCountdown()) {
      overlayMenu.classList.remove("show");
      hideEndOverlay();
      resetSession();
      showToast("MISSION START");
    }
  });
  btnClose.addEventListener("click", function() {
    playSfx(state, "menu_beep");
    closeSettings();
  });
  btnPause.addEventListener("click", function() {
    togglePause();
  });
  btnSettings.addEventListener("click", function() {
    playSfx(state, "menu_beep");
    openSettings();
  });
  if (btnGameplay && overlayGameplay) {
    btnGameplay.addEventListener("click", function() {
      playSfx(state, "menu_beep");
      overlayMenu.classList.remove("show");
      overlayGameplay.classList.add("show");
    });
  }
  if (btnHome) {
    btnHome.addEventListener("click", function() {
      playSfx(state, "menu_beep");
      window.location.href = "home.html";
    });
  }
  btnRestart.addEventListener("click", function() {
    hardRestart();
  });
  btnEndRestart.addEventListener("click", function() {
    hardRestart();
  });
  btnEndSettings.addEventListener("click", function() {
    playSfx(state, "menu_beep");
    hideEndOverlay();
    openSettings();
  });
  if (btnFullscreenToggle) {
    btnFullscreenToggle.addEventListener("click", function() {
      playSfx(state, "menu_beep");
      toggleFullscreen();
    });
    getFullscreenState().then(function(state2) {
      setFullscreenLabel(btnFullscreenToggle, state2);
    });
  }
  document.addEventListener("fullscreenchange", function() {
    setFullscreenLabel(btnFullscreenToggle, !!document.fullscreenElement);
  });
  if (btnEndNext) {
    btnEndNext.addEventListener("click", function() {
      playSfx(state, "menu_beep");
      var nextIdx = campaignIndex + 1;
      if (!startNextCampaignMission(nextIdx)) {
        window.location.href = "home.html";
      }
    });
  }
  if (btnEndHome) {
    btnEndHome.addEventListener("click", function() {
      playSfx(state, "menu_beep");
      window.location.href = "home.html";
    });
  }
  overlayMenu.addEventListener("click", function(e) {
    if (e.target === overlayMenu) {
      playSfx(state, "menu_beep");
      closeSettings();
    }
  });
  overlayEnd.addEventListener("click", function(e) {
    if (e.target === overlayEnd) {
      playSfx(state, "menu_beep");
      hideEndOverlay();
    }
  });
  if (overlayGameplay) {
    overlayGameplay.addEventListener("click", function(e) {
      if (e.target === overlayGameplay) {
        playSfx(state, "menu_beep");
        overlayGameplay.classList.remove("show");
        overlayMenu.classList.add("show");
      }
    });
  }
  if (btnCloseGameplay && overlayGameplay) {
    btnCloseGameplay.addEventListener("click", function() {
      playSfx(state, "menu_beep");
      overlayGameplay.classList.remove("show");
      overlayMenu.classList.add("show");
    });
  }
  if (btnBackGameplay && overlayGameplay) {
    btnBackGameplay.addEventListener("click", function() {
      playSfx(state, "menu_beep");
      overlayGameplay.classList.remove("show");
      overlayMenu.classList.add("show");
    });
  }
  if (endNameInput) {
    endNameInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        saveScoreName(endNameInput.value);
        showToast("NAME SAVED");
        playSfx(state, "menu_beep");
      }
    });
    endNameInput.addEventListener("blur", function() {
      saveScoreName(endNameInput.value);
    });
  }
  function assert(cond, msg) {
    if (!cond)
      throw new Error("TEST FAIL: " + msg);
  }
  function runSelfTests() {
    particles.length = 0;
    spawnParticles(10, 10, "smoke");
    assert(particles.length > 0, "spawnParticles smoke works");
    particles.length = 0;
    spawnParticles(10, 10, "spark");
    assert(particles.length > 0, "spawnParticles spark works");
    player.hull = 1;
    player.hull = clamp(player.hull - 5, 0, 1);
    assert(player.hull === 0, "hull clamp lower bound");
    player.hull = clamp(3, 0, 1);
    assert(player.hull === 1, "hull clamp upper bound");
    assert(factKey(9, 2) === "2\xD79", "factKey canonical order");
    var savedA = state.a, savedB = state.b;
    state.a = 7;
    state.b = 8;
    var d = genDecoys(56, 5);
    assert(d.length === 5, "genDecoys returns requested count");
    assert(d.indexOf(56) === -1, "genDecoys does not include correct");
    state.level = 1;
    state.ddSpeedBonus = 0;
    var si = computeSpawnInterval(state);
    assert(si >= 0.28 && si <= 0.78, "computeSpawnInterval in bounds at base");
    state.level = 999;
    state.ddSpeedBonus = 999;
    si = computeSpawnInterval(state);
    assert(si >= 0.28 && si <= 0.78, "computeSpawnInterval clamped at extremes");
    asteroids.length = 0;
    asteroids.push({ waveId: 10, isCorrect: true, label: 54, ghost: false });
    retireWave(10);
    assert(asteroids.length === 1, "retireWave does not remove asteroids");
    assert(asteroids[0].waveId === -1 && asteroids[0].isCorrect === false, "retireWave clears target status");
    assert(asteroids[0].label === 54, "retireWave keeps label for continuity");
    state.a = savedA;
    state.b = savedB;
    console.log("SELF TESTS: PASS");
  }
  function applyConfigToInputs(config) {
    if (config.aMin != null)
      inputs.aMin.value = config.aMin;
    if (config.aMax != null)
      inputs.aMax.value = config.aMax;
    if (config.bMin != null)
      inputs.bMin.value = config.bMin;
    if (config.bMax != null)
      inputs.bMax.value = config.bMax;
    if (config.decoys != null)
      inputs.decoys.value = config.decoys;
    if (config.decoyFunction != null && inputs.decoyFunction)
      inputs.decoyFunction.value = config.decoyFunction;
    if (config.speed != null)
      inputs.speed.value = config.speed;
    if (config.lives != null)
      inputs.lives.value = config.lives;
    if (config.strikes != null && inputs.strikes)
      inputs.strikes.value = config.strikes;
    if (config.targetMode != null) {
      if (inputs.targetMode)
        inputs.targetMode.value = config.targetMode;
      else
        state.targetMode = String(config.targetMode);
    }
    if (config.volume != null && inputs.volume)
      inputs.volume.value = config.volume;
    if (config.sfxVolume != null && inputs.sfxVolume)
      inputs.sfxVolume.value = config.sfxVolume;
    if (config.musicVolume != null && inputs.musicVolume)
      inputs.musicVolume.value = config.musicVolume;
    if (config.timerMode != null)
      inputs.timerMode.value = config.timerMode;
    if (config.questionMode != null && inputs.questionMode)
      inputs.questionMode.value = config.questionMode;
    if (config.sound != null && inputs.sound)
      inputs.sound.checked = !!config.sound;
    updateDecoyFunctionAvailability();
    if (config.difficulty != null)
      state.difficulty = String(config.difficulty);
    if (config.strikes != null) {
      state.strikeLimit = parseInt(config.strikes, 10);
    }
    if (config.ship) {
      if (inputs.ship)
        inputs.ship.value = String(config.ship);
      player.shipType = String(config.ship);
    }
    if (config.belt) {
      setBackgroundBelt(config.belt);
    }
  }
  function applyStoredConfig() {
    try {
      var raw = null;
      try {
        raw = sessionStorage.getItem("asteroidConfig");
      } catch (e) {
        raw = null;
      }
      if (!raw) {
        try {
          raw = localStorage.getItem("asteroidConfig");
        } catch (e) {
          raw = null;
        }
      }
      if (!raw)
        return;
      var parsed = JSON.parse(raw);
      applyConfigToInputs(parsed);
    } catch (e) {
    }
  }
  function applyQueryParams() {
    var params = new URLSearchParams(location.search);
    if (!params || !params.toString())
      return;
    var cfg = {
      aMin: params.get("aMin"),
      aMax: params.get("aMax"),
      bMin: params.get("bMin"),
      bMax: params.get("bMax"),
      decoys: params.get("decoys"),
      decoyFunction: params.get("decoyFunction"),
      speed: params.get("speed"),
      lives: params.get("lives"),
      strikes: params.get("strikes"),
      volume: params.get("volume"),
      sfxVolume: params.get("sfxVolume"),
      musicVolume: params.get("musicVolume"),
      targetMode: params.get("targetMode"),
      timerMode: params.get("timerMode"),
      questionMode: params.get("questionMode"),
      ship: params.get("ship"),
      difficulty: params.get("difficulty"),
      belt: params.get("belt")
    };
    var soundParam = params.get("sound");
    if (soundParam != null) {
      cfg.sound = !(soundParam === "0" || soundParam === "false");
    }
    applyConfigToInputs(cfg);
    var campaignParam = params.get("campaign");
    if (campaignParam === "1" || campaignParam === "true") {
      var campaignIdParam = params.get("campaignId");
      campaignId = campaignIdParam || getStoredCampaignId() || campaignDefaultId;
      setStoredCampaignId(campaignId);
      campaignData = null;
      campaignActive = true;
      campaignIndex = parseInt(params.get("campaignIndex"), 10);
      if (Number.isNaN(campaignIndex))
        campaignIndex = 0;
      state.campaignActive = true;
      state.campaignIndex = campaignIndex;
      var data = loadCampaignData();
      if (data && data.maxFailures)
        campaignMaxFailures = data.maxFailures;
    } else {
      campaignActive = false;
      campaignIndex = -1;
      state.campaignActive = false;
      state.campaignIndex = -1;
    }
  }
  function boot() {
    resize();
    applyStoredConfig();
    applyQueryParams();
    applySettings();
    updateDecoyFunctionAvailability();
    primeFullscreen();
    var r = canvas.getBoundingClientRect();
    player.x = r.width / 2;
    player.y = r.height - 58;
    syncHud();
    var params = new URLSearchParams(location.search);
    var autoStart = params.get("autoStart") === "1" || params.get("autoStart") === "true";
    if (!autoStart && (params.has("aMin") || params.has("bMin") || params.has("questionMode") || params.has("ship"))) {
      autoStart = true;
    }
    if (autoStart) {
      ensureLoop();
      requestFullscreen();
      setTimeout(function() {
        startIntroThenCountdown();
      }, 250);
    }
    if (params.get("test") === "1")
      runSelfTests();
    requestAnimationFrame(tick);
  }
  boot();
})();
//# sourceMappingURL=asteroid_blaster.bundle.js.map
