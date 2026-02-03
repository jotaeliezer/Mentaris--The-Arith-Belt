"use strict";

var audioCtx = null;
var sfxBank = null;
var droneLoop = null;
var shipIdleLoop = null;
var shipAdvanceLoop = null;
var sfxUnlocked = false;
var soundtrackList = null;
var soundtrackIndex = 0;
var soundtrackClip = null;
var soundtrackActive = false;
var soundtrackState = null;

function initSfx(){
  if(sfxBank) return;
  sfxBank = {
    alien_kill: new Audio("sfx/alien/alien_kill.mp3"),
    alien_shooting: new Audio("sfx/alien/alien_shooting.mp3"),
    electric_shot: new Audio("sfx/shots/electric_shot.mp3"),
    flame_shot: new Audio("sfx/shots/flame_shot.mp3"),
    machine_gun_load: new Audio("sfx/shots/machine_gun_load.mp3"),
    camer_ice_shot: new Audio("sfx/shots/camer_ice_shot.mp3"),
    correct: new Audio("sfx/gameplay/correct.mp3"),
    crash: new Audio("sfx/ship/crash.mp3"),
    dash: new Audio("sfx/ship/dash.mp3"),
    armor_pickup: new Audio("sfx/powerups/armor_pickup.mp3"),
    hull_repair_pickup: new Audio("sfx/powerups/hull_repair_pickup.mp3"),
    shield_pickup: new Audio("sfx/powerups/sheld_pickup.mp3"),
    shot_powerup: new Audio("sfx/powerups/shot_powerup.mp3"),
    powerup_emerges: new Audio("sfx/powerups/powerup_emerges.mp3"),
    emp_activate: new Audio("sfx/powerups/EMP_activate.mp3"),
    shot_missile: new Audio("sfx/shots/shot_missile.mp3"),
    shot_orb: new Audio("sfx/shots/shot_orb.mp3"),
    shot_railbeam: new Audio("sfx/shots/shot_railbeam.mp3"),
    flares: new Audio("sfx/ship/flares.mp3"),
    teleport_disappear: new Audio("sfx/ship/teleport_disappear.mp3"),
    teleport_reappear: new Audio("sfx/ship/teleport_reappear.mp3"),
    sec_15_mark: new Audio("sfx/progress/15_sec_mark.mp3"),
    time_activate: new Audio("sfx/powerups/time_activate.mp3"),
    explosion: new Audio("sfx/ship/explosion.mp3"),
    gun1: new Audio("sfx/shots/gun1.mp3"),
    gun2: new Audio("sfx/shots/gun2.mp3"),
    impact: new Audio("sfx/gameplay/impact.mp3"),
    impact_thud: new Audio("sfx/gameplay/impact_thud.mp3"),
    ice_shot: new Audio("sfx/shots/ice_shot.mp3"),
    level_up2: new Audio("sfx/progress/level_up2.mp3"),
    mission_cleared1: new Audio("sfx/progress/mission_cleared1.mp3"),
    menu_beep: new Audio("sfx/ui/menu_beep.mp3"),
    missed_answer: new Audio("sfx/gameplay/missed_answer.mp3"),
    session_start: new Audio("sfx/progress/session_start.mp3"),
    powerup_collected: new Audio("sfx/powerups/powerup_collected.mp3"),
    ship_advance: new Audio("sfx/ship/ship_advance.mp3"),
    ship_damaged: new Audio("sfx/ship/ship_damaged.mp3"),
    ship_drone: new Audio("sfx/ship/ship_drone.mp3"),
    ship_idle: new Audio("sfx/ship/ship_idle.mp3"),
    game_over3: new Audio("sfx/progress/game_over3.mp3"),
    warning: new Audio("sfx/alerts/warning.mp3"),
    wrong_asteroid: new Audio("sfx/gameplay/wrong_asteroid.mp3")
  };
  sfxBank.alien_kill.volume = 0.5;
  sfxBank.alien_shooting.volume = 0.45;
  sfxBank.electric_shot.volume = 0.4;
  sfxBank.flame_shot.volume = 0.4;
  sfxBank.machine_gun_load.volume = 0.55;
  sfxBank.camer_ice_shot.volume = 0.4;
  sfxBank.correct.volume = 0.5;
  sfxBank.crash.volume = 0.6;
  sfxBank.dash.volume = 0.55;
  sfxBank.armor_pickup.volume = 0.55;
  sfxBank.hull_repair_pickup.volume = 0.55;
  sfxBank.shield_pickup.volume = 0.55;
  sfxBank.shot_powerup.volume = 0.55;
  sfxBank.powerup_emerges.volume = 0.55;
  sfxBank.emp_activate.volume = 0.6;
  sfxBank.shot_missile.volume = 0.4;
  sfxBank.shot_orb.volume = 0.4;
  sfxBank.shot_railbeam.volume = 0.4;
  sfxBank.flares.volume = 0.5;
  sfxBank.teleport_disappear.volume = 0.5;
  sfxBank.teleport_reappear.volume = 0.5;
  sfxBank.sec_15_mark.volume = 0.6;
  sfxBank.time_activate.volume = 0.55;
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
  sfxBank.powerup_collected.volume = 0.55;
  sfxBank.ship_advance.volume = 0.25;
  sfxBank.ship_damaged.volume = 0.5;
  sfxBank.ship_drone.volume = 0.22;
  sfxBank.ship_idle.volume = 0.18;
  sfxBank.game_over3.volume = 0.7;
  sfxBank.warning.volume = 0.5;
  sfxBank.wrong_asteroid.volume = 0.5;
}

function initSoundtracks(){
  if(soundtrackList) return;
  soundtrackList = [
    new Audio("sfx/soundtracks/soundtrack1.mp3"),
    new Audio("sfx/soundtracks/soundtrack2_toohottosleep.mp3"),
    new Audio("sfx/soundtracks/soundtrack3.mp3"),
    new Audio("sfx/soundtracks/soundtrack4.mp3"),
    new Audio("sfx/soundtracks/soundtrack5.mp3"),
    new Audio("sfx/soundtracks/soundtrack6.mp3"),
    new Audio("sfx/soundtracks/soundtrack7.mp3"),
    new Audio("sfx/soundtracks/soundtrack8.mp3")
  ];
  for(var i=0;i<soundtrackList.length;i++){
    soundtrackList[i].volume = 0.22;
    soundtrackList[i].loop = false;
  }
}

export function setSoundtrackStartIndex(idx, force){
  initSoundtracks();
  if(!soundtrackList || !soundtrackList.length) return;
  var len = soundtrackList.length;
  var nextIndex = (typeof idx === "number") ? idx : 0;
  nextIndex = ((nextIndex % len) + len) % len;
  if(!force && soundtrackClip && !soundtrackClip.paused){
    return;
  }
  soundtrackIndex = nextIndex;
  if(soundtrackClip){
    try{ soundtrackClip.pause(); }catch(e){}
  }
  soundtrackClip = null;
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
    clip.loop = false;
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

export function setShipIdle(state, on){
  if(!state.sound){
    if(shipIdleLoop) shipIdleLoop.pause();
    return;
  }
  if(!sfxUnlocked){
    if(shipIdleLoop) shipIdleLoop.pause();
    return;
  }
  try{
    initSfx();
    if(!shipIdleLoop){
      shipIdleLoop = sfxBank.ship_idle.cloneNode();
      shipIdleLoop.loop = true;
    }
    var master = (state && typeof state.volume === "number") ? state.volume : 1;
    var sfxMaster = (state && typeof state.sfxVolume === "number") ? state.sfxVolume : 1;
    shipIdleLoop.volume = Math.max(0, Math.min(1, sfxBank.ship_idle.volume * master * sfxMaster));
    if(on){
      if(shipIdleLoop.paused) shipIdleLoop.play();
    }else{
      shipIdleLoop.pause();
    }
  }catch(e){
    // ignore audio failures
  }
}

export function setShipAdvance(state, on){
  if(!state.sound){
    if(shipAdvanceLoop) shipAdvanceLoop.pause();
    return;
  }
  if(!sfxUnlocked){
    if(shipAdvanceLoop) shipAdvanceLoop.pause();
    return;
  }
  try{
    initSfx();
    if(!shipAdvanceLoop){
      shipAdvanceLoop = sfxBank.ship_advance.cloneNode();
      shipAdvanceLoop.loop = true;
    }
    var master = (state && typeof state.volume === "number") ? state.volume : 1;
    var sfxMaster = (state && typeof state.sfxVolume === "number") ? state.sfxVolume : 1;
    shipAdvanceLoop.volume = Math.max(0, Math.min(1, sfxBank.ship_advance.volume * master * sfxMaster));
    if(on){
      if(shipAdvanceLoop.paused) shipAdvanceLoop.play();
    }else{
      shipAdvanceLoop.pause();
    }
  }catch(e){
    // ignore audio failures
  }
}

export function setSoundtrack(state, on){
  soundtrackState = state;
  var shouldPlay = !!on && !!state.sound;
  soundtrackActive = shouldPlay;
  if(!shouldPlay){
    if(soundtrackClip){
      try{ soundtrackClip.pause(); }catch(e){}
    }
    return;
  }
  initSoundtracks();
  if(soundtrackClip){
    var master = (soundtrackState && typeof soundtrackState.volume === "number") ? soundtrackState.volume : 1;
    var musicMaster = (soundtrackState && typeof soundtrackState.musicVolume === "number") ? soundtrackState.musicVolume : 1;
    soundtrackClip.volume = Math.max(0, Math.min(1, 0.22 * master * musicMaster));
    if(!soundtrackClip.paused) return;
    try{
      soundtrackClip.onended = function(){
        if(!soundtrackActive) return;
        playSoundtrackAt(soundtrackIndex + 1);
      };
      soundtrackClip.play().catch(function(){});
      return;
    }catch(e){
      // ignore audio failures
    }
  }
  playSoundtrackAt(soundtrackIndex || 0);
}
