"use strict";

import { clamp } from "./utils.js";

export function createState(){
  return {
    running:false,
    paused:false,
    over:false,

    // settings
    aMin:2, aMax:12,
    bMin:2, bMax:12,
    decoys:3,
    baseSpeed:1,
    livesStart:10,
    timerMode:"off",
    targetMode:"off",
    questionLimit:0,
    strikeLimit:5,
    sound:true,
    volume:0.65,
    sfxVolume:0.85,
    musicVolume:0.6,
    questionMode:"digits3",
    decoyFunction:"units_bias",
    difficulty:"normal",

    // session
    score:0,
    streak:0,
    level:1,
    lives:10,
    correct:0,
    wrong:0,
    missed:0,
    shots:0,
    hits:0,
    startTime:0,
    pauseAccum:0,
    pauseStart:0,
    collisionSlow:0,
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
    waveDecoyBag: null,
    correctInPlay:false,
    asteroidId:0,
    correctAsteroidId:0,
    correctDelayRemaining:0,

    // arcade feel FX
    slowMoRemaining:0,
    slowMoScale:0.42,
    empTimer:0,
    empCascade:null,
    empCascadeTimer:0,
    empCascadeInterval:0,
    answerDigits:[],
    digitCounts:null,
    digitsLeft:0,
    correctDigit:null,
    squareValue:0,
    missileBuffer:"",
    missileBufferTimer:0,
    endReasonDetail:"",
    campaignActive:false,
    campaignIndex:-1,
    redemptionEnabled:false,
    redemptionUsed:false,
    timerWarningPlayed:false
  };
}

export function createPlayer(){
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
    blasterHitsRemaining: 0,
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
    hidden: false,
    fadeAlpha: 1,
    fadeOutActive: false,
    fadeOutT: 0,
    fadeOutDur: 0
  };
}

export function normalizeRanges(inputs){
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

export function applySettingsFromInputs(state, inputs){
  var rr = normalizeRanges(inputs);
  state.aMin = rr.a1; state.aMax = rr.a2;
  state.bMin = rr.b1; state.bMax = rr.b2;
  state.decoys = parseInt(inputs.decoys.value, 10);
  var baseSpeed = parseFloat(inputs.speed.value);
  if(Number.isNaN(baseSpeed)) baseSpeed = 0.9;
  state.baseSpeed = baseSpeed;
  state.livesStart = parseInt(inputs.lives.value, 10);
  state.timerMode = inputs.timerMode.value;
  if(inputs.targetMode) state.targetMode = inputs.targetMode.value;
  if(inputs.strikes) state.strikeLimit = parseInt(inputs.strikes.value, 10);
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
  if(inputs.decoyFunction) state.decoyFunction = inputs.decoyFunction.value || "units_bias";
  state.timeLimitSec = (state.timerMode === "off") ? 0 : parseInt(state.timerMode, 10);
  state.questionLimit = 0;
  if(state.targetMode && state.targetMode.charAt(0) === "q"){
    var qCount = parseInt(state.targetMode.slice(1), 10);
    if(!Number.isNaN(qCount) && qCount > 0){
      state.questionLimit = qCount;
    }
  }
}
