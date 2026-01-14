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

export function beep(state, freq, ms, type, vol){
  if(freq === void 0) freq = 440;
  if(ms === void 0) ms = 60;
  if(type === void 0) type = "sine";
  if(vol === void 0) vol = 0.04;
  if(!state.sound) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    setTimeout(function(){ o.stop(); }, ms);
  }catch(e){
    // no-op fallback when AudioContext is unavailable
  }
}

export function playSfx(state, name, vol){
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

export function unlockSfx(state){
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

export function setDrone(state, on){
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

export function setSoundtrack(state, on){
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
