"use strict";

import { clamp, rand, randi, factKey } from "./utils.js";
import { createState, createPlayer, normalizeRanges, applySettingsFromInputs } from "./game_settings.js";
import { playSfx, setDrone, setShipAdvance, setShipIdle, setSoundtrack, setSoundtrackStartIndex, unlockSfx } from "./audio.js";
import { createTourGuide } from "./tourguide.js";
import { createFx } from "../render/animations.js";
import { createBackground } from "../render/background.js";
import { createPhaserRenderer } from "../render/phaser_renderer.js";
import { aliens, alienBullets, alienConfig, resetAliens, spawnAlien, updateAliens, updateAlienBullets, drawAliens, drawAlienBullets } from "../entities/aliens.js";
import { computeSpawnInterval } from "./levels.js";
import { PowerupManager } from "../entities/powerups.js";

// ======= DOM
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d", { alpha: true });
var view = { w: 0, h: 0, hudH: 0 };
var gameShell = document.getElementById("gameShell");
var isElectron = (typeof navigator !== "undefined" && /Electron/i.test(navigator.userAgent || ""));
var phaserRoot = document.getElementById("phaserRoot");
if(!phaserRoot && gameShell){
  phaserRoot = document.createElement("div");
  phaserRoot.id = "phaserRoot";
  gameShell.insertBefore(phaserRoot, canvas);
}

var phaserRenderer = null;
var usePhaserRenderer = true;
try{
  var phaserParam = new URLSearchParams(location.search).get("phaser");
  if(phaserParam === "0" || phaserParam === "false") usePhaserRenderer = false;
}catch(e){}

if(typeof CanvasRenderingContext2D !== "undefined"){
  if(typeof ctx.roundRect !== "function"){
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
      if(!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h)) return this;
      var radius = (typeof r === "number" && isFinite(r)) ? r : 0;
      if(w < 0){ x += w; w = -w; }
      if(h < 0){ y += h; h = -h; }
      if(w === 0 || h === 0) return this;
      radius = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
      this.moveTo(x + radius, y);
      this.arcTo(x + w, y, x + w, y + h, radius);
      this.arcTo(x + w, y + h, x, y + h, radius);
      this.arcTo(x, y + h, x, y, radius);
      this.arcTo(x, y, x + w, y, radius);
      this.closePath();
      return this;
    };
  }
  if(typeof ctx.ellipse !== "function"){
    CanvasRenderingContext2D.prototype.ellipse = function(x, y, rx, ry, rotation, startAngle, endAngle, anticlockwise){
      if(!isFinite(x) || !isFinite(y) || !isFinite(rx) || !isFinite(ry)) return;
      if(rx === 0 || ry === 0) return;
      var useRx = Math.abs(rx);
      var useRy = Math.abs(ry);
      var rot = rotation || 0;
      this.save();
      this.translate(x, y);
      this.rotate(rot);
      this.scale(useRx, useRy);
      this.arc(0, 0, 1, startAngle, endAngle, !!anticlockwise);
      this.restore();
    };
  }
}

var promptText = document.getElementById("promptText");
var promptChip = document.getElementById("promptChip");
var scoreText  = document.getElementById("scoreText");
var streakText = document.getElementById("streakText");
var levelText  = document.getElementById("levelText");
var livesText  = document.getElementById("livesText");
var hullText   = document.getElementById("hullText");
var timerText  = document.getElementById("timerText");

var overlayMenu = document.getElementById("overlayMenu");
var overlayEnd  = document.getElementById("overlayEnd");
var overlayGameplay = document.getElementById("overlayGameplay");
var overlayPowerups = document.getElementById("overlayPowerups");
var overlaySfx = document.getElementById("overlaySfx");
var overlayControls = document.getElementById("overlayControls");
var missileOverlay = document.getElementById("missileOverlay");

var btnStart    = document.getElementById("btnStart");
var btnClose    = document.getElementById("btnClose");
var btnGameplay = document.getElementById("btnGameplay");
var btnPowerups = document.getElementById("btnPowerups");
var btnSfx = document.getElementById("btnSfx");
var sfxCatalogPanel = document.getElementById("sfxCatalogPanel");
var btnFullscreenToggle = document.getElementById("btnFullscreenToggle");
var btnPause    = document.getElementById("btnPause");
var btnSettings = document.getElementById("btnSettings");
var btnHome     = document.getElementById("btnHome");
var btnRestart  = document.getElementById("btnRestart");
var btnCloseGameplay = document.getElementById("btnCloseGameplay");
var btnBackGameplay = document.getElementById("btnBackGameplay");
var btnClosePowerups = document.getElementById("btnClosePowerups");
var btnBackPowerups = document.getElementById("btnBackPowerups");
var btnCloseSfx = document.getElementById("btnCloseSfx");
var btnBackSfx = document.getElementById("btnBackSfx");
var btnCloseControls = document.getElementById("btnCloseControls");
var btnMissileCancel = document.getElementById("btnMissileCancel");
var btnMissileConfirm = document.getElementById("btnMissileConfirm");
var missileInput = document.getElementById("missileInput");
var missileTimerEl = document.getElementById("missileTimer");
var missilePromptEl = document.getElementById("missilePrompt");
var missileSubtitleEl = document.getElementById("missileSubtitle");

var btnEndRestart  = document.getElementById("btnEndRestart");
var btnEndSettings = document.getElementById("btnEndSettings");
var btnEndNext = document.getElementById("btnEndNext");
var btnEndHome = document.getElementById("btnEndHome");

var toast = document.getElementById("toast");
var countdownEl = document.getElementById("countdown");
var missionBriefOverlay = null;
var missionBriefTitle = null;
var missionBriefBody = null;
var missionBriefBtn = null;
var missionBriefOnAccept = null;
var missionBriefShowing = false;
var missionBriefBypass = false;
var missionBriefAnimating = false;
var missionBriefTypeTimers = [];
var missionBriefTypeAudio = null;
var warningClip = null;
var missileInputActive = false;
var missileInputAnswer = "";
var missileInputDeadline = 0;
var missileInputPrevSlow = null;
var missileInputPrevMousepad = false;

var powerupsSecondaryList = document.getElementById("powerupsSecondaryList");
var powerupsDefenseList = document.getElementById("powerupsDefenseList");
var powerupsOffenseList = document.getElementById("powerupsOffenseList");
var sfxList = document.getElementById("sfxList");
var sfxCategoryButtons = overlayMenu ? overlayMenu.querySelectorAll("[data-sfx-category]") : [];
var activeSfxCategory = "all";
var settingsTabButtons = overlayMenu ? overlayMenu.querySelectorAll("[data-settings-tab]") : [];
var settingsPanels = overlayMenu ? overlayMenu.querySelectorAll("[data-settings-panel]") : [];
var toggleWideGameplay = document.getElementById("toggleWideGameplay");
var toggleMousepadAuto = document.getElementById("toggleMousepadAuto");
var btnResume = document.getElementById("btnResume");
var btnShipCommands = document.getElementById("btnShipCommands");

var wideGameplayKey = "mentaris.gameplay.wide";
var mousepadAutoKey = "mentaris.mousepad.autostart";
var mousepadAutoStart = false;
var pauseAllowed = false;
var secondaryTypeOrder = ["time", "magnet", "emp", "lock"];

function updateAudioFromInputs(){
  if(inputs.sound) state.sound = !!inputs.sound.checked;
  if(inputs.volume){
    var vol = parseFloat(inputs.volume.value);
    if(!Number.isNaN(vol)) state.volume = clamp(vol, 0, 1);
  }
  if(inputs.sfxVolume){
    var sfxVol = parseFloat(inputs.sfxVolume.value);
    if(!Number.isNaN(sfxVol)) state.sfxVolume = clamp(sfxVol, 0, 1);
  }
  if(inputs.musicVolume){
    var musicVol = parseFloat(inputs.musicVolume.value);
    if(!Number.isNaN(musicVol)) state.musicVolume = clamp(musicVol, 0, 1);
  }
  var shouldPlay = state.sound && state.running && !state.over;
  setDrone(state, shouldPlay);
  setSoundtrack(state, shouldPlay);
}

function getSecondaryInventory(){
  if(!player.secondaryInventory) player.secondaryInventory = {};
  return player.secondaryInventory;
}

function getSecondaryInventoryEntries(){
  var inv = getSecondaryInventory();
  var entries = [];
  for(var i=0; i<secondaryTypeOrder.length; i++){
    var type = secondaryTypeOrder[i];
    var count = inv[type] || 0;
    if(count > 0){
      entries.push({ type: type, count: count });
    }
  }
  return entries;
}

function setSelectedSecondary(type){
  var inv = getSecondaryInventory();
  if(!type || !inv[type]){
    player.secondaryMode = "none";
    player.secondaryCharges = 0;
    return;
  }
  player.secondaryMode = type;
  player.secondaryCharges = inv[type] || 0;
}

function selectSecondaryByIndex(index){
  var entries = getSecondaryInventoryEntries();
  if(index < 0 || index >= entries.length) return;
  setSelectedSecondary(entries[index].type);
  showToast("SECONDARY -> " + entries[index].type.toUpperCase());
}

function addSecondaryPowerup(type){
  if(!type) return;
  var inv = getSecondaryInventory();
  inv[type] = (inv[type] || 0) + 1;
  if(!player.secondaryMode || player.secondaryMode === "none"){
    player.secondaryMode = type;
  }
  if(player.secondaryMode === type){
    player.secondaryCharges = inv[type] || 0;
  }else if(!inv[player.secondaryMode]){
    setSelectedSecondary(type);
  }
}

function setSettingsTab(tabId){
  if(!settingsTabButtons || !settingsPanels) return;
  for(var i=0; i<settingsTabButtons.length; i++){
    var btn = settingsTabButtons[i];
    var isActive = btn.getAttribute("data-settings-tab") === tabId;
    btn.classList.toggle("active", isActive);
  }
  for(var j=0; j<settingsPanels.length; j++){
    var panel = settingsPanels[j];
    var show = panel.getAttribute("data-settings-panel") === tabId;
    panel.classList.toggle("active", show);
  }
  if(tabId === "catalogs" || tabId === "audio"){
    renderSettingsCatalogs();
  }
}

function setSfxCategory(category){
  activeSfxCategory = category || "all";
  if(sfxCategoryButtons && sfxCategoryButtons.length){
    sfxCategoryButtons.forEach(function(btn){
      var isActive = (btn.getAttribute("data-sfx-category") || "all") === activeSfxCategory;
      btn.classList.toggle("active", isActive);
    });
  }
  renderSettingsCatalogs();
}

function setWideGameplay(isWide){
  document.body.classList.toggle("wideGameplay", !!isWide);
  try{ localStorage.setItem(wideGameplayKey, isWide ? "1" : "0"); }catch(e){}
}

function loadWideGameplay(){
  var stored = null;
  try{ stored = localStorage.getItem(wideGameplayKey); }catch(e){}
  var isWide = stored === "1" || stored === "true";
  setWideGameplay(isWide);
  if(toggleWideGameplay) toggleWideGameplay.checked = isWide;
}

function setMousepadAutoStart(isOn){
  mousepadAutoStart = !!isOn;
  try{ localStorage.setItem(mousepadAutoKey, mousepadAutoStart ? "1" : "0"); }catch(e){}
}

function loadMousepadAutoStart(){
  var stored = null;
  try{ stored = localStorage.getItem(mousepadAutoKey); }catch(e){}
  mousepadAutoStart = stored === "1" || stored === "true";
  if(toggleMousepadAuto) toggleMousepadAuto.checked = mousepadAutoStart;
}

function applyMousepadAutoStart(){
  if(mousepadAutoStart){
    setMousepadActive(true);
  }else{
    setMousepadActive(false);
  }
  updateCursorVisibility();
}

function setFullscreenLabel(btn, isFull){
  if(!btn) return;
  btn.textContent = isFull ? "EXIT FULLSCREEN" : "FULLSCREEN";
}

async function getFullscreenState(){
  if(window.electronAPI && window.electronAPI.isFullscreen){
    try{ return await window.electronAPI.isFullscreen(); }catch(e){ return false; }
  }
  return !!document.fullscreenElement;
}

async function toggleFullscreen(){
  if(window.electronAPI && window.electronAPI.toggleFullscreen){
    try{
      var state = await window.electronAPI.toggleFullscreen();
      setFullscreenLabel(btnFullscreenToggle, state);
      return;
    }catch(e){}
  }
  if(document.fullscreenElement){
    try{ await document.exitFullscreen(); }catch(e){}
  }else{
    try{ await document.documentElement.requestFullscreen(); }catch(e){}
  }
  setFullscreenLabel(btnFullscreenToggle, !!document.fullscreenElement);
}

// Settings inputs
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

// End screen
var endSubtitle = document.getElementById("endSubtitle");
var endTitle = document.getElementById("endTitle");
var endReason = document.getElementById("endReason");
var endOutcome = document.getElementById("endOutcome");
var endReasonLine = document.getElementById("endReasonLine");
var statsList = document.getElementById("statsList");
var weakList = document.getElementById("weakList");
var accBar = document.getElementById("accBar");
var endGrade = document.getElementById("endGrade");
var breakdownCorrect = document.getElementById("breakdownCorrect");
var breakdownWrong = document.getElementById("breakdownWrong");
var breakdownMissed = document.getElementById("breakdownMissed");
var breakdownCorrectValue = document.getElementById("breakdownCorrectValue");
var breakdownWrongValue = document.getElementById("breakdownWrongValue");
var breakdownMissedValue = document.getElementById("breakdownMissedValue");
var highScoresEnd = document.getElementById("highScoresEnd");
var endNameInput = document.getElementById("endNameInput");
var endSequence = document.querySelector(".endSequence");
var endScoreValue = document.getElementById("endScoreValue");
var endModeSummary = document.getElementById("endModeSummary");
var endScoreBlock = document.getElementById("endScoreBlock");
var endStatsWrap = document.getElementById("endStatsWrap");
var endNameBlock = document.getElementById("endNameBlock");
var endSequenceTimers = [];
var gameOverSfxTimer = 0;

// ======= State / Entities
var state = createState();
var player = createPlayer();
player.spinManeuver = { active:false, phase:0, x0:0, y0:0, x1:0, y1:0, x2:0, y2:0 };
var bullets = [];
var asteroids = [];
var powerups = [];
var bestStreak = 0;
var gameOverFx = { active:false, t:0, reason:"", shown:false, x:0, y:0 };
var missionClearFx = { active:false, phase:"center", t:0, explodeTimer:0, exitSpeed:0, sfxPlayed:false, mode:"cleared", sfxClip:null };
var countdownActive = false;
var countdownTarget = { x:0, y:0 };
var countdownStartAt = 0;
var countdownDurationSec = 0;
var countdownTimerId = 0;
var launchHoldTimer = 0;
var dashGhosts = [];
var introActive = false;
var introTimer = 0;
var introHudHold = false;
var campaignActive = false;
var campaignIndex = -1;
var campaignData = null;
var campaignId = "";
var campaignProfileKey = "mentaris.campaign.profile.active";
var campaignActiveKeyBase = "mathsteroid.campaign.active.";
var campaignStateKeyBase = "mathsteroid.campaign.state.";
var campaignDataKeyBase = "mathsteroid.campaign.data.";
var campaignDefaultId = "sector_run";
var campaignMaxFailures = 3;
var campaignProfileId = "";

var tourGuide = null;
if(usePhaserRenderer && phaserRoot){
  phaserRenderer = createPhaserRenderer({
    parent: phaserRoot,
    getView: function(){ return view; },
    getState: function(){ return state; },
    getData: function(){
      return {
        view: view,
        state: state,
        tutorialActive: tutorialActive,
        backgroundIndex: backgroundIndex,
        backgroundScroll: backgroundScroll,
        backgroundScale: backgroundScale,
        hideAsteroids: state.hideAsteroids,
        asteroids: asteroids,
        bullets: bullets,
        powerups: powerups,
        aliens: aliens,
        alienBullets: alienBullets
      };
    },
    onReady: function(){
      if(phaserRenderer) phaserRenderer.setActive(true);
    }
  });
}
var tutorialActive = false;
var tutorialLastPos = { x:0, y:0 };
var tutorialPowerupSpawned = false;
var tutorialAlienSpawned = false;
var tutorialSpawnUnlocked = true;
var tutorialPowerupUnlocked = true;
var tutorialAlienUnlocked = true;
var tutorialStepId = null;
var tutorialPortalActive = false;
var tutorialPortalX = 0;
var tutorialPortalY = 0;
var tutorialPortalR = 46;
var tutorialPortalT = 0;
var tutorialPortalLock = false;
var tutorialPortalNotifyPending = false;
var tutorialHideQuestion = false;
var tutorialDots = [];
var tutorialDotsIndex = 0;
var tutorialDotsActive = false;
var tutorialDotsFade = 0;
var tutorialDotsFading = false;
var tutorialDotsRequiredMode = null;
var tutorialDotsEvent = null;
var tutorialDotsNotifyPending = false;
var tutorialRecoveryActive = false;
var tutorialRecoveryResumeStepId = null;
var tutorialRespawnActive = false;
var tutorialRespawnTargetY = 0;
var answerHitsSincePowerup = 0;
var hiddenPowerupActive = false;
var survivorTimer = 0;
var survivorRewardReady = false;
var cleanWaveStreak = 0;
var waveHadWrongHit = false;
var precisionWindowSec = 2.5;

// ======= Systems
var fx = createFx(ctx, state, player, null);
var particles = fx.particles;
var rings = fx.rings;
var cam = fx.cam;
var kickShake = fx.kickShake;
var updateCamera = fx.updateCamera;
var spawnRing = fx.spawnRing;
var spawnDirectedSparks = fx.spawnDirectedSparks;
var pickupFxTimerId = 0;

function spawnPickupFx(x, y){
  var beams = 6;
  var baseAngle = -Math.PI / 2;
  for(var i=0; i<beams; i++){
    var ang = baseAngle + (i / beams) * Math.PI * 2;
    var dirX = Math.cos(ang);
    var dirY = Math.sin(ang);
    spawnDirectedSparks(x, y, dirX, dirY, 0.18, 12, 260, 520, 0.12, 0.26, "spark");
    spawnDirectedSparks(x, y, dirX, dirY, 0.18, 7, 220, 420, 0.12, 0.22, "spark_white");
  }
  spawnParticles(x, y, "spark");
  spawnParticles(x, y, "spark_white");
  if(pickupFxTimerId) clearTimeout(pickupFxTimerId);
  pickupFxTimerId = setTimeout(function(){
    for(var j=0; j<beams; j++){
      var ang2 = baseAngle + (j / beams) * Math.PI * 2 + 0.2;
      var dx = Math.cos(ang2);
      var dy = Math.sin(ang2);
      spawnDirectedSparks(x, y, dx, dy, 0.2, 10, 220, 460, 0.11, 0.24, "spark");
      spawnDirectedSparks(x, y, dx, dy, 0.2, 6, 200, 380, 0.11, 0.22, "spark_white");
    }
    spawnParticles(x, y, "spark");
    spawnParticles(x, y, "spark_white");
    pickupFxTimerId = 0;
  }, 140);
}
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
var backgroundScale = 2.10;
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
  "images/backgrounds/background8.png",
  "images/backgrounds/background1.png",
  "images/backgrounds/background2.png",
  "images/backgrounds/background3.png",
  "images/backgrounds/background7.png",
  "images/backgrounds/background9.png"
];
for(var bi=0; bi<backgroundSources.length; bi++){
  var bgImg = new Image();
  (function(idx){
    bgImg.onload = function(){ backgroundReady[idx] = true; };
  })(bi);
  bgImg.src = backgroundSources[bi];
  backgroundSprites.push(bgImg);
  backgroundReady.push(false);
}

function setBackgroundBelt(key){
  var nextKey = String(key || "dusk");
  beltKey = nextKey;
  var idx = beltIndexMap[nextKey];
  if(typeof idx !== "number") idx = 0;
  backgroundIndex = idx;
  backgroundScroll = 0;
}
var asteroidSprites = [];
var asteroidSpriteReady = [];
var asteroidSpriteIds = [1, 2, 3, 4, 6];
for(var si=0; si<asteroidSpriteIds.length; si++){
  var img = new Image();
  (function(idx){
    img.onload = function(){ asteroidSpriteReady[idx] = true; };
  })(si);
  img.src = "images/asteroids/asteroid" + asteroidSpriteIds[si] + ".png";
  asteroidSprites.push(img);
  asteroidSpriteReady.push(false);
}

var cooldownIcons = {
  dash: { img: new Image(), ready: false, src: "images/ui/dash.png" },
  shockwave: { img: new Image(), ready: false, src: "images/ui/shockwave.png" },
  flares: { img: new Image(), ready: false, src: "images/ui/flares.png" },
  teleport: { img: new Image(), ready: false, src: "images/ui/teleport.png" }
};
Object.keys(cooldownIcons).forEach(function(key){
  var icon = cooldownIcons[key];
  icon.img.onload = function(){ icon.ready = true; };
  icon.img.src = icon.src;
});

var powerupIcons = {
  repair: { img: new Image(), ready: false, src: "images/powerups/powerup_hullrepair.png" },
  time: { img: new Image(), ready: false, src: "images/powerups/powerup_timedelay.png" },
  magnet: { img: new Image(), ready: false, src: "images/powerups/powerup_magnet.png" },
  shield: { img: new Image(), ready: false, src: "images/powerups/powerup_shield.png" },
  armor: { img: new Image(), ready: false, src: "images/powerups/powerup_armor.png" },
  emp: { img: new Image(), ready: false, src: "images/powerups/powerup_EMP.png" },
  lock: { img: new Image(), ready: false, src: "images/powerups/powerup_targetlock.png" }
};
Object.keys(powerupIcons).forEach(function(key){
  var icon = powerupIcons[key];
  icon.img.onload = function(){ icon.ready = true; };
  icon.img.src = icon.src;
});

var shotIcons = {
  missile: { img: new Image(), ready: false, src: "images/shots/shot_missile.png" },
  electric: { img: new Image(), ready: false, src: "images/shots/shot_electric.png" },
  fire: { img: new Image(), ready: false, src: "images/shots/shot_fre.png" },
  ice: { img: new Image(), ready: false, src: "images/shots/shot_ice.png" },
  laser: { img: new Image(), ready: false, src: "images/shots/shot_laser.png" },
  plasma: { img: new Image(), ready: false, src: "images/shots/shot_plasma.png" },
  pierce: { img: new Image(), ready: false, src: "images/shots/shot_lookup.png" },
  rail: { img: new Image(), ready: false, src: "images/shots/shot_rail.png" }
};
Object.keys(shotIcons).forEach(function(key){
  var icon = shotIcons[key];
  icon.img.onload = function(){ icon.ready = true; };
  icon.img.src = icon.src;
});

var bulletSingle = { img: new Image(), ready: false, src: "images/bullets/bullet_single.png" };
bulletSingle.img.onload = function(){ bulletSingle.ready = true; };
bulletSingle.img.src = bulletSingle.src;

var bulletLaserImg = { img: new Image(), ready: false, src: "images/bullets/bullet_laser.png" };
bulletLaserImg.img.onload = function(){ bulletLaserImg.ready = true; };
bulletLaserImg.img.src = bulletLaserImg.src;

var bulletFireImg = { img: new Image(), ready: false, src: "images/bullets/bullet_fire1.png" };
bulletFireImg.img.onload = function(){ bulletFireImg.ready = true; };
bulletFireImg.img.src = bulletFireImg.src;

var bulletIceImg = { img: new Image(), ready: false, src: "images/bullets/bullet_ice.png" };
bulletIceImg.img.onload = function(){ bulletIceImg.ready = true; };
bulletIceImg.img.src = bulletIceImg.src;

var bulletBoltImg = { img: new Image(), ready: false, src: "images/bullets/bullet_electric1.png" };
bulletBoltImg.img.onload = function(){ bulletBoltImg.ready = true; };
bulletBoltImg.img.src = bulletBoltImg.src;

var bulletOrbImg = { img: new Image(), ready: false, src: "images/bullets/bullet_orb.png" };
bulletOrbImg.img.onload = function(){ bulletOrbImg.ready = true; };
bulletOrbImg.img.src = bulletOrbImg.src;

var bulletBolaImg = { img: new Image(), ready: false, src: "images/bullets/bullet_bola.png" };
bulletBolaImg.img.onload = function(){ bulletBolaImg.ready = true; };
bulletBolaImg.img.src = bulletBolaImg.src;

var bulletRailImg = { img: new Image(), ready: false, src: "images/bullets/bullet_rail.png" };
bulletRailImg.img.onload = function(){ bulletRailImg.ready = true; };
bulletRailImg.img.src = bulletRailImg.src;

var bulletMissileImg = { img: new Image(), ready: false, src: "images/bullets/bullet_missile.png" };
bulletMissileImg.img.onload = function(){ bulletMissileImg.ready = true; };
bulletMissileImg.img.src = bulletMissileImg.src;

var powerupCatalogSecondary = [
  { id: "repair", label: "Hull Repair", icon: powerupIcons.repair.src, desc: "Instant hull repair (+35%)." },
  { id: "time", label: "Time Dilation", icon: powerupIcons.time.src, desc: "Grants one Time Dilation charge (press X to slow time)." },
  { id: "magnet", label: "Magnet Sweep", icon: powerupIcons.magnet.src, desc: "Grants one Magnet Sweep charge (press X to pull the correct asteroid)." },
  { id: "emp", label: "EMP Burst", icon: powerupIcons.emp.src, desc: "Triggers immediately and cascades non-answer asteroids." },
  { id: "lock", label: "Target Lock", icon: powerupIcons.lock.src, desc: "Grants one Target Lock charge (press X to steer shots to the correct asteroid)." }
];

var powerupCatalogDefense = [
  { id: "shield", label: "Shield", icon: powerupIcons.shield.src, desc: "Temporary shield for 10 seconds." },
  { id: "armor", label: "Armor", icon: powerupIcons.armor.src, desc: "Absorbs 5 hits before disarming." }
];

var powerupCatalogOffense = [
  { id: "missile", label: "Missile Shot", icon: shotIcons.missile ? shotIcons.missile.src : null, desc: "Type the correct answer to launch a seeking missile." },
  { id: "laser", label: "Laser Burst", icon: shotIcons.laser ? shotIcons.laser.src : null, desc: "High-speed laser shots for about 12 seconds." },
  { id: "fire", label: "Fireball", icon: shotIcons.fire ? shotIcons.fire.src : null, desc: "Fireball shots for about 12 seconds." },
  { id: "ice", label: "Ice Shards", icon: shotIcons.ice ? shotIcons.ice.src : null, desc: "Ice shots for about 12 seconds." },
  { id: "electric", label: "Electric Bolts", icon: shotIcons.electric ? shotIcons.electric.src : null, desc: "Electric bolts for about 12 seconds." },
  { id: "pierce", label: "Look Up Shot", icon: shotIcons.pierce ? shotIcons.pierce.src : null, desc: "Piercing shots for about 12 seconds." },
  { id: "plasma", label: "Plasma Orb", icon: shotIcons.plasma ? shotIcons.plasma.src : null, desc: "Plasma shots for about 12 seconds." },
  { id: "rail", label: "Rail Beam", icon: shotIcons.rail ? shotIcons.rail.src : null, desc: "Rail beam shots for about 12 seconds." }
];

var sfxCatalog = [
  { id: "menu_beep", label: "Menu Beep", desc: "UI blip.", when: "Menu and overlay buttons.", badge: "SFX", src: "sfx/ui/menu_beep.mp3", category: "menu" },
  { id: "session_start", label: "Session Start", desc: "Countdown cue.", when: "Countdown before a run.", badge: "SFX", src: "sfx/progress/session_start.mp3", category: "progress" },
  { id: "mission_cleared1", label: "Mission Cleared", desc: "Clear fanfare.", when: "After wave clear, before the end panel.", badge: "SFX", src: "sfx/progress/mission_cleared1.mp3", category: "progress" },
  { id: "game_over3", label: "Game Over", desc: "Fail sting.", when: "After ship destruction.", badge: "SFX", src: "sfx/progress/game_over3.mp3", category: "progress" },
  { id: "explosion", label: "Explosion", desc: "Ship explosion.", when: "Player destroyed.", badge: "SFX", src: "sfx/ship/explosion.mp3", category: "ship" },
  { id: "ship_drone", label: "Ship Drone", desc: "Engine drone loop.", when: "Active during runs.", badge: "SFX", src: "sfx/ship/ship_drone.mp3", category: "ship" },
  { id: "ship_idle", label: "Ship Idle", desc: "Idle thruster loop.", when: "Idle or moving left, right, down.", badge: "SFX", src: "sfx/ship/ship_idle.mp3", category: "ship" },
  { id: "ship_advance", label: "Ship Advance", desc: "Advance thruster loop.", when: "Moving upward.", badge: "SFX", src: "sfx/ship/ship_advance.mp3", category: "ship" },
  { id: "dash", label: "Dash", desc: "Dash whoosh.", when: "Dashing and intro kick.", badge: "SFX", src: "sfx/ship/dash.mp3", category: "ship" },
  { id: "gun1", label: "Gun 1", desc: "Primary blaster.", when: "Standard, missile, and fire shots.", badge: "SFX", src: "sfx/shots/gun1.mp3", category: "shots" },
  { id: "gun2", label: "Gun 2", desc: "Heavy blaster.", when: "Laser and rail shots.", badge: "SFX", src: "sfx/shots/gun2.mp3", category: "shots" },
  { id: "ice_shot", label: "Ice Shot", desc: "Ice blaster.", when: "Ice shots.", badge: "SFX", src: "sfx/shots/ice_shot.mp3", category: "shots" },
  { id: "bolt_shot", label: "Bolt Shot", desc: "Electric blaster.", when: "Electric shots.", badge: "SFX", src: "sfx/shots/bolt_shot.mp3", category: "shots" },
  { id: "shot_missile", label: "Missile Shot", desc: "Missile launch.", when: "Typing the correct answer with missile shot.", badge: "SFX", src: "sfx/shots/shot_missile.mp3", category: "shots" },
  { id: "shot_orb", label: "Plasma Orb", desc: "Plasma orb shot.", when: "Plasma shots.", badge: "SFX", src: "sfx/shots/shot_orb.mp3", category: "shots" },
  { id: "shot_railbeam", label: "Rail Beam", desc: "Rail beam shot.", when: "Rail shots.", badge: "SFX", src: "sfx/shots/shot_railbeam.mp3", category: "shots" },
  { id: "impact", label: "Impact", desc: "Collision hit.", when: "Ship hits and alien impacts.", badge: "SFX", src: "sfx/gameplay/impact.mp3", category: "gameplay" },
  { id: "impact_thud", label: "Impact Thud", desc: "Asteroid thud.", when: "Asteroid impacts and EMP cascade hits.", badge: "SFX", src: "sfx/gameplay/impact_thud.mp3", category: "gameplay" },
  { id: "correct", label: "Correct", desc: "Correct hit cue.", when: "Correct answer asteroid destroyed.", badge: "SFX", src: "sfx/gameplay/correct.mp3", category: "gameplay" },
  { id: "wrong_asteroid", label: "Wrong Asteroid", desc: "Wrong hit cue.", when: "Wrong answer asteroid hit.", badge: "SFX", src: "sfx/gameplay/wrong_asteroid.mp3", category: "gameplay" },
  { id: "missed_answer", label: "Missed Answer", desc: "Missed answer cue.", when: "Correct asteroid escapes.", badge: "SFX", src: "sfx/gameplay/missed_answer.mp3", category: "gameplay" },
  { id: "level_up2", label: "Level Up", desc: "Level up cue.", when: "Level increases.", badge: "SFX", src: "sfx/progress/level_up2.mp3", category: "progress" },
  { id: "alien_kill", label: "Alien Kill", desc: "Alien destroyed.", when: "Alien shot down.", badge: "SFX", src: "sfx/alien/alien_kill.mp3", category: "alien" },
  { id: "alien_shooting", label: "Alien Shooting", desc: "Alien firing.", when: "Alien fires.", badge: "SFX", src: "sfx/alien/alien_shooting.mp3", category: "alien" },
  { id: "ship_damaged", label: "Ship Damaged", desc: "Damage alert.", when: "Player takes damage.", badge: "SFX", src: "sfx/ship/ship_damaged.mp3", category: "ship" },
  { id: "warning", label: "Warning", desc: "Warning alarm.", when: "Correct answer near escape (not in tutorial).", badge: "SFX", src: "sfx/alerts/warning.mp3", category: "alerts" },
  { id: "shot_powerup", label: "Shot Pickup", desc: "Offense pickup.", when: "Collect shot type upgrades.", badge: "SFX", src: "sfx/powerups/shot_powerup.mp3", category: "powerups" },
  { id: "powerup_emerges", label: "Powerup Emerges", desc: "Hidden powerup reveal.", when: "Powerup emerges from a destroyed asteroid.", badge: "SFX", src: "sfx/powerups/powerup_emerges.mp3", category: "powerups" },
  { id: "emp_activate", label: "EMP Activate", desc: "EMP discharge.", when: "Activate EMP burst.", badge: "SFX", src: "sfx/powerups/EMP_activate.mp3", category: "powerups" },
  { id: "hull_repair_pickup", label: "Hull Repair Pickup", desc: "Repair pickup.", when: "Collect hull repair.", badge: "SFX", src: "sfx/powerups/hull_repair_pickup.mp3", category: "powerups" },
  { id: "armor_pickup", label: "Armor Pickup", desc: "Armor pickup.", when: "Collect armor powerup.", badge: "SFX", src: "sfx/powerups/armor_pickup.mp3", category: "powerups" },
  { id: "shield_pickup", label: "Shield Pickup", desc: "Shield pickup.", when: "Collect shield powerup.", badge: "SFX", src: "sfx/powerups/sheld_pickup.mp3", category: "powerups" },
  { id: "flares", label: "Flares", desc: "Verdant Spire flare burst.", when: "Press C (flares).", badge: "SFX", src: "sfx/ship/flares.mp3", category: "ship" },
  { id: "teleport_disappear", label: "Teleport Disappear", desc: "AM2 teleport vanish.", when: "Teleport start.", badge: "SFX", src: "sfx/ship/teleport_disappear.mp3", category: "ship" },
  { id: "teleport_reappear", label: "Teleport Reappear", desc: "AM2 teleport reappear.", when: "Teleport end.", badge: "SFX", src: "sfx/ship/teleport_reappear.mp3", category: "ship" },
  { id: "sec_15_mark", label: "15 Sec Mark", desc: "15 seconds remaining cue.", when: "Timer reaches 15s.", badge: "SFX", src: "sfx/progress/15_sec_mark.mp3", category: "progress" },
  { id: "time_activate", label: "Time Activate", desc: "Time dilation cue.", when: "Activate time dilation.", badge: "SFX", src: "sfx/powerups/time_activate.mp3", category: "powerups" },
  { id: "powerup_collected", label: "Powerup Collected", desc: "Pickup chime.", when: "Collect magnet, EMP, or target lock.", badge: "SFX", src: "sfx/powerups/powerup_collected.mp3", category: "powerups" },
  { id: "crash", label: "Crash", desc: "Hard collision.", when: "Ship collision impact.", badge: "SFX", src: "sfx/ship/crash.mp3", category: "ship" },
  { id: "soundtrack1", label: "Soundtrack 1", desc: "Ambient drive.", when: "Background music rotation.", badge: "MUSIC", src: "sfx/soundtracks/soundtrack1.mp3", category: "soundtracks" },
  { id: "soundtrack2_toohottosleep", label: "Soundtrack 2", desc: "Too Hot To Sleep.", when: "Background music rotation.", badge: "MUSIC", src: "sfx/soundtracks/soundtrack2_toohottosleep.mp3", category: "soundtracks" },
  { id: "soundtrack3", label: "Soundtrack 3", desc: "Synthwave drift.", when: "Background music rotation.", badge: "MUSIC", src: "sfx/soundtracks/soundtrack3.mp3", category: "soundtracks" },
  { id: "soundtrack4", label: "Soundtrack 4", desc: "Dark pulse.", when: "Background music rotation.", badge: "MUSIC", src: "sfx/soundtracks/soundtrack4.mp3", category: "soundtracks" },
  { id: "soundtrack5", label: "Soundtrack 5", desc: "Night run.", when: "Background music rotation.", badge: "MUSIC", src: "sfx/soundtracks/soundtrack5.mp3", category: "soundtracks" },
  { id: "soundtrack6", label: "Soundtrack 6", desc: "Orbit drift.", when: "Background music rotation.", badge: "MUSIC", src: "sfx/soundtracks/soundtrack6.mp3", category: "soundtracks" },
  { id: "soundtrack7", label: "Soundtrack 7", desc: "Rational flow.", when: "Background music rotation.", badge: "MUSIC", src: "sfx/soundtracks/soundtrack7.mp3", category: "soundtracks" },
  { id: "soundtrack8", label: "Soundtrack 8", desc: "Void runner.", when: "Background music rotation.", badge: "MUSIC", src: "sfx/soundtracks/soundtrack8.mp3", category: "soundtracks" }
];

var previewPlayers = {};
var activePreview = null;
var previewVolumeKey = "mentaris.preview.sfx.";

function formatDuration(sec){
  if(!isFinite(sec) || sec <= 0) return "--:--";
  var total = Math.round(sec);
  var m = Math.floor(total / 60);
  var s = total % 60;
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function getPreviewBaseVolume(){
  var master = (state && typeof state.volume === "number") ? state.volume : 1;
  var sfx = (state && typeof state.sfxVolume === "number") ? state.sfxVolume : 1;
  if(!isFinite(master)) master = 1;
  if(!isFinite(sfx)) sfx = 1;
  return Math.max(0, Math.min(1, master * sfx));
}

function getPreviewItemVolume(id){
  if(!id) return 1;
  try{
    var raw = localStorage.getItem(previewVolumeKey + id);
    if(raw != null){
      var val = parseFloat(raw);
      if(isFinite(val)) return clamp(val, 0, 1);
    }
  }catch(e){}
  return 1;
}

function setPreviewItemVolume(id, value){
  if(!id) return;
  var safe = clamp(value, 0, 1);
  try{ localStorage.setItem(previewVolumeKey + id, String(safe)); }catch(e){}
}

function stopPreviewAudio(audio){
  if(!audio) return;
  try{
    audio.pause();
    audio.currentTime = 0;
  }catch(e){}
}

function stopAllPreviewAudio(){
  for(var key in previewPlayers){
    if(Object.prototype.hasOwnProperty.call(previewPlayers, key)){
      stopPreviewAudio(previewPlayers[key]);
    }
  }
  activePreview = null;
}

function renderCatalogList(listEl, items, filter){
  if(!listEl) return;
  listEl.innerHTML = "";
  var list = items || [];
  if(filter){
    list = list.filter(filter);
  }
  if(!list.length){
    var empty = document.createElement("li");
    empty.className = "catalogEmpty";
    empty.textContent = "No audio in this category yet.";
    listEl.appendChild(empty);
    return;
  }
  for(var i=0; i<list.length; i++){
    var item = list[i];
    var li = document.createElement("li");
    li.className = "catalogItem";

    var icon = document.createElement("div");
    icon.className = "catalogIcon";
    if(item.icon){
      var img = document.createElement("img");
      img.src = item.icon;
      img.alt = item.label + " icon";
      icon.appendChild(img);
    }else{
      var missing = document.createElement("div");
      missing.className = "catalogMissing";
      missing.textContent = item.badge || "NO IMAGE";
      icon.appendChild(missing);
    }

    var text = document.createElement("div");
    text.className = "catalogText";
    var title = document.createElement("div");
    title.className = "catalogTitle";
    title.textContent = item.label;
    text.appendChild(title);

    if(item.desc){
      var desc = document.createElement("div");
      desc.className = "catalogDesc";
      desc.textContent = item.desc;
      text.appendChild(desc);
    }

    if(item.id && item.badge){
      var file = document.createElement("div");
      file.className = "catalogMeta";
      file.textContent = "File: " + item.src;
      text.appendChild(file);
    }

    if(item.when){
      var when = document.createElement("div");
      when.className = "catalogWhen";
      when.textContent = "Plays: " + item.when;
      text.appendChild(when);
    }

    if(item.src){
      var controls = document.createElement("div");
      controls.className = "catalogControls";
      var playBtn = document.createElement("button");
      playBtn.type = "button";
      playBtn.className = "btn catalogControlBtn";
      playBtn.innerHTML = "&#9654;";
      playBtn.setAttribute("aria-label", "Play");
      playBtn.title = "Play";
      var stopBtn = document.createElement("button");
      stopBtn.type = "button";
      stopBtn.className = "btn catalogControlBtn";
      stopBtn.innerHTML = "&#9632;";
      stopBtn.setAttribute("aria-label", "Stop");
      stopBtn.title = "Stop";
      var volume = document.createElement("input");
      volume.type = "range";
      volume.className = "catalogVolume";
      volume.min = "0";
      volume.max = "100";
      volume.step = "1";
      var initialVolume = getPreviewItemVolume(item.id);
      volume.value = String(Math.round(initialVolume * 100));
      var duration = document.createElement("div");
      duration.className = "catalogDuration";
      duration.textContent = "--:--";

      var audio = new Audio(item.src);
      audio.preload = "metadata";
      audio.volume = getPreviewBaseVolume() * initialVolume;
      previewPlayers[item.id] = audio;
      (function(audioRef, durationEl, playBtnEl, stopBtnEl, volumeEl, itemId){
        audioRef.addEventListener("loadedmetadata", function(){
          durationEl.textContent = formatDuration(audioRef.duration);
        });
        audioRef.addEventListener("ended", function(){
          if(activePreview === audioRef) activePreview = null;
        });
        playBtnEl.addEventListener("click", function(){
          if(activePreview && activePreview !== audioRef){
            stopPreviewAudio(activePreview);
          }
          activePreview = audioRef;
          try{
            var itemVol = getPreviewItemVolume(itemId);
            audioRef.volume = getPreviewBaseVolume() * itemVol;
            audioRef.currentTime = 0;
            audioRef.play().catch(function(){});
          }catch(e){}
        });
        stopBtnEl.addEventListener("click", function(){
          stopPreviewAudio(audioRef);
          if(activePreview === audioRef) activePreview = null;
        });
        volumeEl.addEventListener("input", function(){
          var val = parseFloat(volumeEl.value);
          var scaled = isFinite(val) ? (val / 100) : 1;
          setPreviewItemVolume(itemId, scaled);
          audioRef.volume = getPreviewBaseVolume() * getPreviewItemVolume(itemId);
        });
      })(audio, duration, playBtn, stopBtn, volume, item.id);
      try{ audio.load(); }catch(e){}

      controls.appendChild(playBtn);
      controls.appendChild(stopBtn);
      controls.appendChild(volume);
      controls.appendChild(duration);
      text.appendChild(controls);
    }

    li.appendChild(icon);
    li.appendChild(text);
    listEl.appendChild(li);
  }
}

function renderSettingsCatalogs(){
  stopAllPreviewAudio();
  previewPlayers = {};
  renderCatalogList(powerupsSecondaryList, powerupCatalogSecondary);
  renderCatalogList(powerupsDefenseList, powerupCatalogDefense);
  renderCatalogList(powerupsOffenseList, powerupCatalogOffense);
  renderCatalogList(sfxList, sfxCatalog, function(item){
    if(!activeSfxCategory || activeSfxCategory === "all") return true;
    return item.category === activeSfxCategory;
  });
}

var powerupManager = new PowerupManager(state, player);
renderSettingsCatalogs();

function configureAliensDifficulty(){
  var diff = String(state.difficulty || "normal").toLowerCase();
  if(diff === "easy"){
    alienConfig.enabled = false;
    alienConfig.maxOnScreen = 0;
    alienConfig.spawnCooldown = 9999;
  }else if(diff === "normal"){
    alienConfig.enabled = true;
    alienConfig.maxOnScreen = 1;
    alienConfig.spawnCooldown = 70;
  }else if(diff === "hard"){
    alienConfig.enabled = true;
    alienConfig.maxOnScreen = 1;
    alienConfig.spawnCooldown = 22;
  }else if(diff === "brutal"){
    alienConfig.enabled = true;
    alienConfig.maxOnScreen = 2;
    alienConfig.spawnCooldown = 18;
  }else{
    alienConfig.enabled = true;
    alienConfig.maxOnScreen = 1;
    alienConfig.spawnCooldown = 22;
  }
}

var shipProfiles = {
  classic: { speed: 440, response: 8, dashDist: 200, dashCooldown: 1.3, shockwaveRadius: 220, shockwaveStrength: 760, shockwaveCooldown: 3.5, ability: "shockwave", accelUp: 4.2, accelDown: 6.5 },
  spire: { speed: 520, response: 14, dashDist: 130, dashCooldown: 1.3, shockwaveRadius: 150, shockwaveStrength: 480, shockwaveCooldown: 3.5, ability: "flares", accelUp: 6.0, accelDown: 8.0 },
  am2: { speed: 600, response: 17, dashDist: 130, dashCooldown: 1.9, shockwaveRadius: 160, shockwaveStrength: 520, shockwaveCooldown: 4.2, ability: "spin", accelUp: 7.2, accelDown: 9.0 }
};

function getShipProfile(shipType){
  var base = { speed: 560, response: 14, dashDist: 130, dashCooldown: 1.3, shockwaveRadius: 160, shockwaveStrength: 520, shockwaveCooldown: 3.5, ability: "shockwave" };
  return shipProfiles[shipType] ? Object.assign({}, base, shipProfiles[shipType]) : base;
}

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
var screenshotMode = false;

function isTextInput(el){
  if(!el) return false;
  var tag = (el.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

window.addEventListener("keydown", function(e){
  if(isTextInput(document.activeElement)) return;
  var k = (e.key || "").toLowerCase();
  var prevent = ["arrowleft","arrowright","arrowup","arrowdown","a","d","w","s","p","r","m","z","e","x","q","c","b","1","2","3"," ","spacebar"];
  if(prevent.indexOf(k) !== -1) e.preventDefault();

  keys.add(k);
  if(!audioPrimed){
    unlockSfx(state);
    audioPrimed = true;
  }
  if(k === "p") togglePause();
  if(k === "0") toggleScreenshot();
  if(k === "r") hardRestart();
  if(k === "m") openSettings();
  if((k === "z" || k === "e") && !e.repeat) fire();
  if((k === "w" || k === "arrowup") && !e.repeat && state.running && !state.paused && !state.over){
    playSfx(state, "ship_advance");
  }
  if(k === "x" || k === "q"){
    if((player.blasterMode || "single") === "missile"){
      openMissileInput();
    }else{
      secondaryFire();
    }
  }
  if(k === "1") selectSecondaryByIndex(0);
  if(k === "2") selectSecondaryByIndex(1);
  if(k === "3") selectSecondaryByIndex(2);
  if(k === "c") shockwave();
  if(k === "b"){
    if(!mousepadActive){
      setMousepadActive(true);
      showToast("MOUSEPAD: HYBRID");
    }else{
      setMousepadActive(false);
      showToast("MOUSEPAD OFF");
    }
  }
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
var virtualPad = document.getElementById("virtualPad");
var controlPad = document.getElementById("controlPad");
var padStatus = document.getElementById("padStatus");
var virtualKnob = document.getElementById("virtualKnob");
var padMode = document.getElementById("padMode");
var mousepadActive = false;
var mousepadPaused = false;
var mousepadSensitivityPad = 0.3;
var mousepadSensitivityPadMode = 0.18;
var mousepadSensitivityFps = 20.0;
var virtualAxes = { x: 0, y: 0 };
var padCursor = { x: 0, y: 0 };
var mousepadMode = "hybrid";
var mouseImpulse = { x: 0, y: 0 };
var mousepadDeadzonePad = 0.18;
var mousepadPadSettingsBackup = {
  sensitivityPad: mousepadSensitivityPad,
  sensitivityPadMode: mousepadSensitivityPadMode,
  sensitivityFps: mousepadSensitivityFps,
  deadzone: mousepadDeadzonePad
};
var mousepadPadDefaults = {
  sensitivityPad: 0.3,
  sensitivityPadMode: 0.18,
  sensitivityFps: 20.0,
  deadzone: 0.18
};

function resetMousepadPadSettings(){
  mousepadSensitivityPad = mousepadPadDefaults.sensitivityPad;
  mousepadSensitivityPadMode = mousepadPadDefaults.sensitivityPadMode;
  mousepadSensitivityFps = mousepadPadDefaults.sensitivityFps;
  mousepadDeadzonePad = mousepadPadDefaults.deadzone;
}

function setMissionBriefActive(active){
  missionBriefShowing = !!active;
  state.hideAsteroids = !!active;
  player.hidden = !!active;
  if(active){
    bullets.length = 0;
    asteroids.length = 0;
    powerups.length = 0;
    aliens.length = 0;
    alienBullets.length = 0;
    state.spawnTimer = 0;
    state.correctInPlay = false;
    state.correctAsteroidId = 0;
    countdownActive = false;
    if(countdownEl) countdownEl.classList.remove("show");
  }
  updateCursorVisibility();
}

resetMousepadPadSettings();

function updateCursorVisibility(){
  if(missileInputActive){
    document.body.style.cursor = "";
    return;
  }
  if(mousepadActive) return;
  var hide = state.running && !state.paused && !screenshotMode;
  document.body.style.cursor = hide ? "none" : "";
}

function setMousepadActive(isOn){
  mousepadActive = !!isOn;
  if(controlPad) controlPad.classList.toggle("active", mousepadActive);
  if(padStatus) padStatus.textContent = mousepadActive ? "ACTIVE" : "OFF";
  if(!mousepadActive){
    virtualAxes.x = 0;
    virtualAxes.y = 0;
    padCursor.x = 0;
    padCursor.y = 0;
    if(virtualKnob){
      virtualKnob.style.transform = "translate(-50%, -50%)";
    }
    document.body.style.cursor = "";
    if(document.exitPointerLock) document.exitPointerLock();
  }else{
    padCursor.x = 0;
    padCursor.y = 0;
    updateVirtualFromCursor();
    document.body.style.cursor = "none";
    if((mousepadMode === "fps" || mousepadMode === "hybrid") && virtualPad && virtualPad.requestPointerLock){
      virtualPad.requestPointerLock();
    }
  }
}

if(controlPad){
  setMousepadActive(false);
}

if(inputs.questionMode){
  inputs.questionMode.addEventListener("change", updateDecoyFunctionAvailability);
}
if(inputs.volume){
  inputs.volume.addEventListener("input", updateAudioFromInputs);
}
if(inputs.sfxVolume){
  inputs.sfxVolume.addEventListener("input", updateAudioFromInputs);
}
if(inputs.musicVolume){
  inputs.musicVolume.addEventListener("input", updateAudioFromInputs);
}
if(inputs.sound){
  inputs.sound.addEventListener("change", updateAudioFromInputs);
}

function setMousepadMode(mode){
  mousepadMode = "hybrid";
  if(padMode){
    padMode.textContent = "HYBRID";
  }
  mouseImpulse.x = 0;
  mouseImpulse.y = 0;
  if(mousepadActive && virtualPad && virtualPad.requestPointerLock){
    virtualPad.requestPointerLock();
  }else if(document.exitPointerLock){
    document.exitPointerLock();
  }
}

if(virtualPad){
  virtualPad.addEventListener("pointerdown", function(e){
    if(!mousepadActive) return;
    var rect = virtualPad.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var maxR = Math.min(rect.width, rect.height) * 0.42;
    padCursor.x = clamp(e.clientX - cx, -maxR, maxR);
    padCursor.y = clamp(e.clientY - cy, -maxR, maxR);
    updateVirtualFromCursor();
  });
}

function updateVirtualFromCursor(){
  if(!virtualPad) return;
  var rect = virtualPad.getBoundingClientRect();
  var maxR = Math.min(rect.width, rect.height) * 0.42;
  var nx = maxR > 0 ? padCursor.x / maxR : 0;
  var ny = maxR > 0 ? padCursor.y / maxR : 0;
  virtualAxes.x = clamp(nx, -1, 1);
  virtualAxes.y = clamp(ny, -1, 1);
  if(virtualKnob){
    var cx = clamp(padCursor.x, -maxR, maxR);
    var cy = clamp(padCursor.y, -maxR, maxR);
    virtualKnob.style.transform = "translate(calc(-50% + " + cx + "px), calc(-50% + " + cy + "px))";
  }
}

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

window.addEventListener("mousemove", function(e){
  if(!mousepadActive) return;
  if(virtualPad && (mousepadMode === "pad" || mousepadMode === "hybrid")){
    var rect = virtualPad.getBoundingClientRect();
    var maxR = Math.min(rect.width, rect.height) * 0.42;
    var sens = mousepadMode === "hybrid" ? mousepadSensitivityPad * 2.4 : mousepadSensitivityPadMode;
    padCursor.x = clamp(padCursor.x + (e.movementX || 0) * sens, -maxR, maxR);
    padCursor.y = clamp(padCursor.y + (e.movementY || 0) * sens, -maxR, maxR);
    updateVirtualFromCursor();
    return;
  }
  if(mousepadMode === "fps"){
    return;
  }
  if(!state.running || state.paused || state.over) return;
  var dx = e.movementX || 0;
  var dy = e.movementY || 0;
  if(dx === 0 && dy === 0) return;

  var r = canvas.getBoundingClientRect();
  var hudH = document.getElementById("hud").getBoundingClientRect().height;
  var topLimit = hudH + 14;
  var bottomLimit = r.height - 18;

  player.x += dx * mousepadSensitivityPad;
  player.y += dy * mousepadSensitivityPad;
  player.x = clamp(player.x, player.w/2 + 10, r.width - player.w/2 - 10);
  player.y = clamp(player.y, topLimit + player.h/2 + 6, bottomLimit - player.h/2);
});

// ======= Layout
function resize(){
  var shell = document.getElementById("gameShell");
  var r = shell.getBoundingClientRect();

  var maxDpr = isElectron ? 1.0 : 1.25;
  var dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
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

  if(phaserRenderer && phaserRenderer.resize){
    phaserRenderer.resize(w, h);
  }
}

window.addEventListener("resize", resize);

// ======= UI
function getQuestionRawText(){
  if(state.over) return "?";
  if(state.questionMode === "rational_frac" || state.questionMode === "rational_dec"){
    return String(state.rationalQuestion || "?") + " = ?";
  }
  if(state.questionMode === "square_shoot"){
    return String(state.a) + "\u00B2 = ?";
  }
  if(state.questionMode === "square_root"){
    var sq = state.squareValue || (state.a * state.a);
    return "\u221A" + String(sq) + " = ?";
  }
  if(isFactorMode()){
    var product = (typeof state.factorProduct === "number") ? state.factorProduct : (state.a * state.b);
    return state.a + " x ? = " + product;
  }
  var op = isAdditionMode() ? "+" : "x";
  return state.a + " " + op + " " + state.b + " = ?";
}

function getQuestionText(){
  return parseRepeatingText(getQuestionRawText()).display;
}

function syncHud(){
  if(state.questionMode === "rational_frac" || state.questionMode === "rational_dec"){
    promptText.innerHTML = formatRepeatingMarkup(getQuestionRawText());
  }else{
    promptText.textContent = getQuestionText();
  }
  scoreText.textContent = String(state.score);
  streakText.textContent = String(state.streak);
  levelText.textContent = String(state.level);
  livesText.textContent = String(state.lives);
  if(hullText){
    hullText.textContent = Math.round(clamp(player.hull,0,1) * 100) + "%";
  }
  updateTimerHud();
  if(btnPause){
    btnPause.textContent = pauseAllowed ? (state.paused ? "RESUME (P)" : "PAUSE (P)") : "PAUSE DISABLED";
  }
}

function setTutorialQuestionHidden(hidden){
  tutorialHideQuestion = hidden;
  if(promptChip){
    promptChip.style.visibility = hidden ? "hidden" : "visible";
  }
}

function updateTimerHud(){
  if(!timerText) return;
  if(state.timeLimitSec > 0){
    var elapsed = getElapsedSeconds();
    var remaining = Math.max(0, state.timeLimitSec - elapsed);
    var mins = Math.floor(remaining / 60);
    var secs = Math.floor(remaining % 60);
    var mm = String(mins).padStart(2, "0");
    var ss = String(secs).padStart(2, "0");
    timerText.textContent = mm + ":" + ss;
  }else{
    timerText.textContent = "ENDLESS";
  }
}

function getElapsedSeconds(){
  var now = performance.now();
  var pausedTotal = state.pauseAccum || 0;
  if(state.pauseStart) pausedTotal += (now - state.pauseStart);
  return Math.max(0, (now - state.startTime - pausedTotal) / 1000);
}

function syncTimerPause(){
  if(state.paused || screenshotMode){
    if(!state.pauseStart) state.pauseStart = performance.now();
  }else if(state.pauseStart){
    state.pauseAccum += performance.now() - state.pauseStart;
    state.pauseStart = 0;
  }
}

var toastTimer = null;
var toastTypeTimer = null;
function inferToastTone(text){
  var lower = String(text || "").toLowerCase();
  var badWords = ["wrong", "missed", "escaped", "damaged", "collision", "crash", "error", "failed", "out of lives", "destroyed", "warning"];
  for(var i=0; i<badWords.length; i++){
    if(lower.indexOf(badWords[i]) !== -1) return "bad";
  }
  return "good";
}

function showToast(msg, tone){
  var text = String(msg || "");
  toast.textContent = "";
  toast.classList.remove("toast-good", "toast-bad");
  var appliedTone = tone || inferToastTone(text);
  if(appliedTone === "bad") toast.classList.add("toast-bad");
  else if(appliedTone === "good") toast.classList.add("toast-good");
  toast.classList.add("show");
  clearTimeout(toastTimer);
  if(toastTypeTimer){
    clearInterval(toastTypeTimer);
    toastTypeTimer = null;
  }
  var idx = 0;
  var typeMs = 28;
  toastTypeTimer = setInterval(function(){
    idx++;
    toast.textContent = text.slice(0, idx);
    if(idx >= text.length){
      clearInterval(toastTypeTimer);
      toastTypeTimer = null;
      toastTimer = setTimeout(function(){ toast.classList.remove("show"); }, 2000);
    }
  }, typeMs);
}

function getActiveProfileId(){
  if(campaignProfileId) return campaignProfileId;
  var stored = null;
  try{ stored = localStorage.getItem(campaignProfileKey); }catch(e){ stored = null; }
  campaignProfileId = stored || "profile1";
  return campaignProfileId;
}

function getCampaignActiveKey(){
  return campaignActiveKeyBase + getActiveProfileId();
}

function canMigrateLegacyCampaign(){
  var pid = getActiveProfileId();
  if(pid !== "profile1") return false;
  try{ return localStorage.getItem("mentaris.campaign.migrated." + pid) !== "1"; }catch(e){ return true; }
}

function markLegacyCampaignMigrated(){
  var pid = getActiveProfileId();
  try{ localStorage.setItem("mentaris.campaign.migrated." + pid, "1"); }catch(e){}
}

function getCampaignStateKey(id){
  return campaignStateKeyBase + getActiveProfileId() + "." + id;
}

function getCampaignDataKey(id){
  return campaignDataKeyBase + id;
}

function getStoredCampaignId(){
  try{ return localStorage.getItem(getCampaignActiveKey()) || ""; }catch(e){ return ""; }
}

function setStoredCampaignId(id){
  try{ localStorage.setItem(getCampaignActiveKey(), id); }catch(e){}
}

function loadCampaignState(){
  var targetId = campaignId || campaignDefaultId;
  var key = getCampaignStateKey(targetId);
  try{
    var raw = localStorage.getItem(key);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  var migrated = false;
  var legacyState = null;
  if(canMigrateLegacyCampaign()){
    try{
      var legacyKey = campaignStateKeyBase + targetId;
      var legacyRaw = localStorage.getItem(legacyKey);
      if(legacyRaw) legacyState = JSON.parse(legacyRaw);
    }catch(e){}
    if(!legacyState && targetId === campaignDefaultId){
      try{
        var legacy = localStorage.getItem("mathsteroid.campaign.state");
        if(legacy) legacyState = JSON.parse(legacy);
      }catch(e){}
    }
    if(legacyState){
      try{ localStorage.setItem(key, JSON.stringify(legacyState)); }catch(e){}
      migrated = true;
    }
  }
  if(migrated) markLegacyCampaignMigrated();
  return legacyState;
}

function saveCampaignState(state){
  var key = getCampaignStateKey(campaignId || campaignDefaultId);
  try{ localStorage.setItem(key, JSON.stringify(state)); }catch(e){}
}

function loadCampaignData(){
  if(campaignData) return campaignData;
  try{
    var key = getCampaignDataKey(campaignId || campaignDefaultId);
    var raw = localStorage.getItem(key);
    if(raw) campaignData = JSON.parse(raw);
  }catch(e){
    campaignData = null;
  }
  if(!campaignData && (campaignId || campaignDefaultId) === campaignDefaultId){
    try{
      var legacy = localStorage.getItem("mathsteroid.campaign.data");
      if(legacy) campaignData = JSON.parse(legacy);
    }catch(e){
      campaignData = null;
    }
  }
  return campaignData;
}

function buildMissionParams(config, idx){
  var params = new URLSearchParams({
    aMin: String(config.aMin),
    aMax: String(config.aMax),
    bMin: String(config.bMin),
    bMax: String(config.bMax),
    decoys: String(config.decoys),
    decoyFunction: String(config.decoyFunction || "units_bias"),
    speed: String(config.speed),
    lives: String(config.lives),
    difficulty: String(config.difficulty || "normal"),
    volume: String(config.volume || state.volume),
    sfxVolume: String(config.sfxVolume || state.sfxVolume),
    musicVolume: String(config.musicVolume || state.musicVolume),
    targetMode: config.targetMode || "off",
    timerMode: config.timerMode || "off",
    questionMode: config.questionMode || "digits3",
    sound: "1",
    ship: config.ship || player.shipType || "mk7",
    autoStart: "1",
    campaign: "1",
    campaignIndex: String(idx),
    campaignId: campaignId || campaignDefaultId
  });
  return params;
}

function startNextCampaignMission(nextIdx){
  var data = loadCampaignData();
  if(!data || !data.missions || !data.missions[nextIdx]) return false;
  var cfg = data.missions[nextIdx].config || {};
  var nextId = campaignId || campaignDefaultId;
  window.location.href = "home.html?campaignBrief=1&campaignIndex=" + nextIdx + "&campaignId=" + encodeURIComponent(nextId);
  return true;
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

function isSquareMode(){
  return state.questionMode === "square_shoot"
    || state.questionMode === "square_root";
}

function isRationalMode(){
  return state.questionMode === "rational_frac"
    || state.questionMode === "rational_dec";
}

function getSoundtrackStartIndex(){
  if(isSquareMode()) return 3;
  if(isRationalMode()) return 5;
  if(isAdditionMode()) return 4;
  return 0;
}

function setPauseAllowed(isAllowed){
  pauseAllowed = !!isAllowed;
  if(!btnPause) return;
  if(pauseAllowed){
    btnPause.style.pointerEvents = "";
    btnPause.style.opacity = "";
    btnPause.textContent = state.paused ? "RESUME (P)" : "PAUSE (P)";
  }else{
    btnPause.style.pointerEvents = "none";
    btnPause.style.opacity = "0.5";
    btnPause.textContent = "PAUSE DISABLED";
  }
}

function isDigitMode(){
  return state.questionMode === "digits3"
    || state.questionMode === "digits2"
    || state.questionMode === "add_digits2"
    || state.questionMode === "add_digits3";
}

function isMissileAllowed(){
  return !isSquareMode() && !isRationalMode();
}

function getMissileAnswerString(){
  var answer = null;
  if(isDigitMode()){
    if(state.correctDigit == null) return null;
    answer = String(state.correctDigit);
  }else{
    answer = String(state.answer || "");
  }
  if(!/^\d+$/.test(answer)) return null;
  return answer;
}

function findCorrectAsteroid(){
  if(state.correctAsteroidId){
    for(var i=0; i<asteroids.length; i++){
      if(asteroids[i].id === state.correctAsteroidId) return asteroids[i];
    }
  }
  for(var j=0; j<asteroids.length; j++){
    var a = asteroids[j];
    if(a.isCorrect && a.waveId === state.waveId) return a;
  }
  return null;
}

function canMissileLock(target){
  if(!target) return false;
  var dx = target.x - player.x;
  var dy = target.y - player.y;
  var forward = (dy < -20) && (Math.abs(dx) < player.w * 0.6);
  return !forward;
}

function launchMissile(target){
  if(!target) return false;
  var dx = target.x - player.x;
  var dy = target.y - player.y;
  var dist = Math.max(1, Math.hypot(dx, dy));
  var speed = 680;
  bullets.push({
    x: player.x,
    y: player.y - 18,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    r: 5,
    kind: "missile",
    targetId: target.id,
    speed: speed,
    accelFrom: 680,
    accelTo: 750,
    accelDelay: 1.0,
    accelDuration: 0.7,
    accelT: 0,
    boosted: false,
    rot: 0,
    trail: []
  });
  state.shots += 1;
  player.recoil = 1;
  player.flash = 1;
  playSfx(state, "shot_missile");
  if(tourGuide) tourGuide.notify("fire");
  return true;
}

function handleMissileInput(digit){
  if(!state.running || state.paused || state.over) return false;
  if((player.blasterMode || "single") !== "missile") return false;
  var answer = getMissileAnswerString();
  if(!answer) return false;

  var buffer = (state.missileBufferTimer > 0) ? state.missileBuffer : "";
  buffer += digit;
  if(answer.indexOf(buffer) !== 0){
    buffer = (answer.indexOf(digit) === 0) ? digit : "";
  }
  state.missileBuffer = buffer;
  state.missileBufferTimer = 1.2;

  if(buffer && buffer === answer){
    var target = findCorrectAsteroid();
    if(target && canMissileLock(target)){
      launchMissile(target);
    }
    state.missileBuffer = "";
    state.missileBufferTimer = 0;
  }
  return true;
}

function openMissileInput(){
  if(missileInputActive) return false;
  if(!missileOverlay || !missileInput) return false;
  if(!state.running || state.paused || state.over) return false;
  if((player.blasterMode || "single") !== "missile") return false;
  var answer = getMissileAnswerString();
  if(!answer) return false;
  missileInputActive = true;
  missileInputAnswer = answer;
  missileInputDeadline = performance.now() + 5000;
  missileInput.value = "";
  missileInput.maxLength = Math.max(1, answer.length);
  if(missilePromptEl){
    missilePromptEl.textContent = "Target Answer (" + answer.length + " digits)";
  }
  if(missileSubtitleEl){
    missileSubtitleEl.textContent = "Enter the asteroid answer within 5 seconds.";
  }
  if(missileTimerEl){
    missileTimerEl.textContent = "5.0s";
  }
  missileInputPrevSlow = {
    remaining: state.slowMoRemaining || 0,
    scale: state.slowMoScale || 0.42
  };
  state.slowMoRemaining = Math.max(state.slowMoRemaining || 0, 5.0);
  state.slowMoScale = 0.12;
  missileInputPrevMousepad = mousepadActive;
  if(mousepadActive) setMousepadActive(false);
  updateCursorVisibility();
  missileOverlay.classList.add("show");
  setTimeout(function(){
    try{ missileInput.focus(); missileInput.select(); }catch(e){}
  }, 50);
  return true;
}

function closeMissileInput(message){
  if(!missileInputActive) return;
  missileInputActive = false;
  missileInputAnswer = "";
  missileInputDeadline = 0;
  if(missileOverlay) missileOverlay.classList.remove("show");
  if(missileInputPrevSlow){
    state.slowMoRemaining = missileInputPrevSlow.remaining;
    state.slowMoScale = missileInputPrevSlow.scale || 0.42;
  }else{
    state.slowMoRemaining = 0;
    state.slowMoScale = 0.42;
  }
  missileInputPrevSlow = null;
  if(missileInputPrevMousepad) setMousepadActive(true);
  updateCursorVisibility();
  if(message) showToast(message);
}

function attemptMissileLaunch(){
  if(!missileInputActive) return false;
  var value = (missileInput ? missileInput.value : "").trim();
  if(!value) return false;
  if(!/^\d+$/.test(value)) return false;
  if(value !== missileInputAnswer) return false;
  var target = findCorrectAsteroid();
  if(target && canMissileLock(target)){
    launchMissile(target);
    closeMissileInput();
  }else{
    closeMissileInput("MISSILE NO LOCK");
  }
  return true;
}

function isClassicMode(){
  return state.questionMode === "classic"
    || state.questionMode === "classic2"
    || state.questionMode === "classic3"
    || state.questionMode === "factor2"
    || state.questionMode === "factor3"
    || state.questionMode === "add_classic2"
    || state.questionMode === "add_classic3"
    || isSquareMode()
    || isRationalMode();
}

function isFactorMode(){
  return state.questionMode === "factor2"
    || state.questionMode === "factor3";
}

function isClassicModeValue(mode){
  return mode === "classic"
    || mode === "classic2"
    || mode === "classic3"
    || mode === "factor2"
    || mode === "factor3"
    || mode === "add_classic2"
    || mode === "add_classic3"
    || mode === "square_shoot"
    || mode === "square_root"
    || mode === "rational_frac"
    || mode === "rational_dec";
}

function describeQuestionMode(mode){
  var modeLabel = String(mode || state.questionMode || "classic");
  var isAdd = modeLabel.indexOf("add_") === 0;
  var isSquare = modeLabel.indexOf("square_") === 0;
  var isRational = modeLabel.indexOf("rational_") === 0;
  var isFactor = modeLabel.indexOf("factor") === 0;
  var operation = isRational ? "Rationals" : (isSquare ? "Squares" : (isAdd ? "Addition" : "Multiplication"));
  var modeName = "Classic Answer";
  if(isRational){
    modeName = (modeLabel === "rational_dec") ? "Target Decimal" : "Target Fraction";
  }else if(isSquare){
    modeName = (modeLabel === "square_root") ? "Square Roots" : "Perfect Squares";
  }else if(isFactor){
    modeName = "Factor Hunt";
  }else{
    modeName = (modeLabel.indexOf("digits") !== -1) ? "Digit Hunt" : "Classic Answer";
  }
  var subLabel = "";
  if(isRational){
    subLabel = (modeLabel === "rational_dec") ? "Decimal" : "Fraction";
  }else if(isSquare){
    subLabel = (modeLabel === "square_root") ? "Shoot Roots" : "Shoot Squares";
  }else{
    var sub = (modeLabel.indexOf("3") !== -1) ? "3" : "2";
    subLabel = isAdd ? (sub + "x" + sub) : ("1x" + sub);
  }
  return {
    operation: operation,
    modeLabel: modeName,
    submode: subLabel,
    key: operation + "|" + modeName + "|" + subLabel
  };
}

function updateDecoyFunctionAvailability(){
  if(!inputs.decoyFunction) return;
  var mode = inputs.questionMode ? String(inputs.questionMode.value || "") : "";
  inputs.decoyFunction.disabled = !isClassicModeValue(mode);
}

function formatRepeatingDecimal(numer, denom){
  if(!denom) return "?";
  var sign = numer < 0 ? "-" : "";
  var n = Math.abs(numer);
  var d = Math.abs(denom);
  var intPart = Math.floor(n / d);
  var rem = n % d;
  if(rem === 0){
    return sign + String(intPart);
  }
  var digits = [];
  var seen = {};
  var repeatIndex = -1;
  var guard = 0;
  while(rem !== 0 && seen[rem] === undefined && guard++ < 30){
    seen[rem] = digits.length;
    rem *= 10;
    var digit = Math.floor(rem / d);
    digits.push(String(digit));
    rem = rem % d;
  }
  if(rem !== 0 && seen[rem] !== undefined){
    repeatIndex = seen[rem];
  }
  var nonRepeat = repeatIndex >= 0 ? digits.slice(0, repeatIndex).join("") : digits.join("");
  var repeat = repeatIndex >= 0 ? digits.slice(repeatIndex).join("") : "";
  if(repeat){
    return sign + String(intPart) + "." + nonRepeat + "~" + repeat + "~";
  }
  return sign + String(intPart) + "." + nonRepeat;
}

function parseRepeatingText(text){
  var raw = (text == null) ? "" : String(text);
  var start = raw.indexOf("~");
  if(start === -1) return { display: raw, repeatStart: -1, repeatLen: 0 };
  var end = raw.indexOf("~", start + 1);
  if(end === -1) return { display: raw.replace(/~/g, ""), repeatStart: -1, repeatLen: 0 };
  var display = raw.slice(0, start) + raw.slice(start + 1, end) + raw.slice(end + 1);
  var repeatStart = start;
  var repeatLen = end - start - 1;
  return { display: display, repeatStart: repeatStart, repeatLen: repeatLen };
}

function formatRepeatingMarkup(text){
  var parsed = parseRepeatingText(text);
  if(parsed.repeatStart < 0) return parsed.display;
  var before = parsed.display.slice(0, parsed.repeatStart);
  var repeat = parsed.display.slice(parsed.repeatStart, parsed.repeatStart + parsed.repeatLen);
  var after = parsed.display.slice(parsed.repeatStart + parsed.repeatLen);
  return before + "<span class=\"repeatOverline\">" + repeat + "</span>" + after;
}

function buildRationalPool(minDen, maxDen){
  var out = [];
  for(var d=minDen; d<=maxDen; d++){
    if(d <= 0) continue;
    var dec = formatRepeatingDecimal(1, d);
    out.push({ den: d, frac: "1/" + d, dec: dec });
  }
  return out;
}

function shouldEndByQuestionLimit(){
  return state.questionLimit > 0 && state.questionsCompleted >= state.questionLimit;
}

function nextProblem(){
  var rr = normalizeRangesFromInputs();
  state.redemptionUsed = false;
  if(isSquareMode()){
    var base = randi(rr.a1, rr.a2);
    state.a = base;
    state.b = (state.questionMode === "square_root") ? 1 : base;
    state.squareValue = base * base;
    state.answer = (state.questionMode === "square_root") ? base : state.squareValue;
    state.waveId++;
    syncHud();
    prepareWave();
    return;
  }
  if(isRationalMode()){
    var minDen = clamp(rr.a1, 2, 12);
    var maxDen = clamp(rr.a2, 2, 12);
    if(maxDen < minDen){
      var tmpDen = minDen;
      minDen = maxDen;
      maxDen = tmpDen;
    }
    var pool = buildRationalPool(minDen, maxDen);
    if(!pool.length) pool = buildRationalPool(2, 12);
    var entry = pool[randi(0, pool.length - 1)];
    state.a = 1;
    state.b = entry.den;
    state.rationalPool = pool;
    state.rationalQuestion = (state.questionMode === "rational_frac") ? entry.dec : entry.frac;
    state.answer = (state.questionMode === "rational_frac") ? entry.frac : entry.dec;
    state.waveId++;
    syncHud();
    prepareWave();
    return;
  }
  if(isFactorMode()){
    if(state.questionMode === "factor2"){
      state.a = randi(10, 99);
      state.b = randi(2, 9);
    }else{
      state.a = randi(100, 999);
      state.b = randi(2, 9);
    }
    state.factorProduct = state.a * state.b;
    state.answer = state.b;
    state.waveId++;
    syncHud();
    prepareWave();
    return;
  }
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

function getAlienQuestion(){
  var isAdd = isAdditionMode();
  var answer = randi(2, 15);
  var a;
  var b;
  var op;

  if(isAdd){
    // Use subtraction for alien when player is in addition mode.
    b = randi(1, 9);
    a = answer + b;
    op = "-";
  }else{
    // Use division for alien when player is in multiplication mode.
    b = randi(2, 9);
    a = answer * b;
    op = "/";
  }
  return { question: a + " " + op + " " + b, answer: answer };
}

function enforceUnitsDigit(value, correct){
  var target = Math.abs(correct) % 10;
  var base = Math.floor(Math.abs(value) / 10) * 10 + target;
  if(base === correct) base += 10;
  return base;
}

function shuffleDigitsKeepUnits(value){
  var s = String(Math.abs(value));
  if(s.length <= 1){
    return value + 10;
  }
  var last = s[s.length - 1];
  var head = s.slice(0, -1).split("");
  var tries = 0;
  var shuffled = head.slice();
  while(tries++ < 8){
    for(var i=shuffled.length - 1; i>0; i--){
      var j = randi(0, i);
      var tmp = shuffled[i];
      shuffled[i] = shuffled[j];
      shuffled[j] = tmp;
    }
    if(shuffled.join("") !== head.join("")) break;
  }
  return parseInt(shuffled.join("") + last, 10);
}

function baseAddDecoy(correct){
  var rollAdd = Math.random();
  if(rollAdd < 0.6){
    return correct + randi(-12, 12);
  }
  if(rollAdd < 0.88){
    var axAdd = state.a + (Math.random()<0.5 ? -1 : 1);
    var bxAdd = state.b + (Math.random()<0.5 ? -1 : 1);
    return (Math.random()<0.5 ? axAdd + state.b : state.a + bxAdd);
  }
  return correct + randi(-25, 25);
}

function baseMulDecoy(correct){
  var roll = Math.random();
  if(roll < 0.65){
    var delta = randi(1, 10) * (Math.random() < 0.5 ? -1 : 1);
    return correct + delta;
  }
  if(roll < 0.88){
    var ax = state.a + (Math.random()<0.5 ? -1 : 1);
    var bx = state.b + (Math.random()<0.5 ? -1 : 1);
    return (Math.random()<0.5 ? ax*state.b : state.a*bx);
  }
  return correct + randi(-25, 25);
}

function genRationalDecoys(correct, count){
  var pool = (state.rationalPool && state.rationalPool.length) ? state.rationalPool : buildRationalPool(2, 12);
  var useFraction = state.questionMode === "rational_frac";
  var out = new Set();
  var tries = 0;
  while(out.size < count && tries++ < 200){
    var entry = pool[randi(0, pool.length - 1)];
    var label = useFraction ? entry.frac : entry.dec;
    if(label === correct) continue;
    out.add(label);
  }
  if(out.size < count){
    for(var i=0; i<pool.length && out.size < count; i++){
      var label2 = useFraction ? pool[i].frac : pool[i].dec;
      if(label2 !== correct) out.add(label2);
    }
  }
  return Array.from(out);
}

function genClassicDecoys(correct, count){
  var out = new Set();
  var tries = 0;
  var limit = 240;
  var mode = (state.decoyFunction || "units_bias");
  var isAdd = isAdditionMode();
  var maxDelta = isAdd ? 60 : 40;

  while(out.size < count && tries++ < limit){
    var d;
    if(mode === "structured"){
      if(isAdd){
        var axAdd = state.a + (Math.random()<0.5 ? -1 : 1);
        var bxAdd = state.b + (Math.random()<0.5 ? -1 : 1);
        d = (Math.random()<0.5 ? axAdd + state.b : state.a + bxAdd);
      }else{
        var ax = state.a + (Math.random()<0.5 ? -1 : 1);
        var bx = state.b + (Math.random()<0.5 ? -1 : 1);
        d = (Math.random()<0.5 ? ax*state.b : state.a*bx);
      }
      d = enforceUnitsDigit(d, correct);
    }else if(mode === "digit_shuffle"){
      d = shuffleDigitsKeepUnits(correct);
    }else{
      d = isAdd ? baseAddDecoy(correct) : baseMulDecoy(correct);
      if(Math.random() < 0.8){
        d = enforceUnitsDigit(d, correct);
      }
    }

    if(d === correct) continue;
    if(d < 0) continue;
    if(Math.abs(d - correct) > maxDelta) continue;
    out.add(d);
  }

  while(out.size < count){
    var fallback = isAdd ? baseAddDecoy(correct) : baseMulDecoy(correct);
    if(mode !== "digit_shuffle") fallback = enforceUnitsDigit(fallback, correct);
    if(fallback !== correct && fallback >= 0) out.add(fallback);
  }
  return Array.from(out);
}

function genDecoys(correct, count){
  if(isRationalMode()){
    return genRationalDecoys(correct, count);
  }
  if(isClassicMode()){
    return genClassicDecoys(correct, count);
  }
  if(isAdditionMode()){
    var outAdd = new Set();
    var triesAdd = 0;
    while(outAdd.size < count && triesAdd++ < 200){
      var dAdd = baseAddDecoy(correct);
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
    var d = baseMulDecoy(correct);
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

function buildDigitDecoyBag(excludeSet){
  var pool = [];
  var exclude = excludeSet || new Set();
  for(var d=0; d<=9; d++){
    if(d === state.correctDigit) continue;
    if(exclude.has(String(d))) continue;
    pool.push(d);
  }
  for(var i=pool.length - 1; i>0; i--){
    var j = randi(0, i);
    var tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool;
}

function buildClassicDecoyBag(correct, count, excludeSet){
  var target = Math.max(6, count || 0);
  var exclude = excludeSet || new Set();
  var pool = [];
  var attempts = 0;
  while(pool.length < target && attempts++ < 6){
    var candidateCount = Math.max(target + attempts * 2, target);
    var candidates = genDecoys(correct, candidateCount);
    for(var i=0; i<candidates.length; i++){
      var label = candidates[i];
      var key = String(label);
      if(label === correct) continue;
      if(exclude.has(key)) continue;
      if(pool.indexOf(label) !== -1) continue;
      pool.push(label);
      if(pool.length >= target) break;
    }
  }
  if(!pool.length){
    var fallback = genDecoys(correct, target);
    for(var j=0; j<fallback.length; j++){
      var lab = fallback[j];
      var k = String(lab);
      if(lab === correct) continue;
      if(exclude.has(k)) continue;
      if(pool.indexOf(lab) !== -1) continue;
      pool.push(lab);
    }
  }
  for(var kIndex=pool.length - 1; kIndex>0; kIndex--){
    var jIndex = randi(0, kIndex);
    var tmp = pool[kIndex];
    pool[kIndex] = pool[jIndex];
    pool[jIndex] = tmp;
  }
  return pool;
}

function prepareWave(){
  var decoyCount = Math.max(1, Math.round(state.decoys * 0.3));
  if(isDigitMode()){
    if(state.correctDigit == null) state.correctDigit = pickCorrectDigit();
    state.waveDecoys = genDigitDecoys(state.correctDigit, decoyCount);
    state.waveDecoyBag = buildDigitDecoyBag();
  }else{
    state.waveDecoys = genDecoys(state.answer, decoyCount);
    state.waveDecoyBag = buildClassicDecoyBag(state.answer, Math.max(6, decoyCount * 2));
  }
  state.correctInPlay = false;
  state.correctAsteroidId = 0;

  var minDecoysFirst = 2;
  var maxDecoysFirst = Math.min(5, 2 + decoyCount);
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

function getDifficultySpeedFactor(){
  var diff = String(state.difficulty || "normal").toLowerCase();
  if(diff === "easy") return 0.38;
  if(diff === "normal") return 0.62;
  if(diff === "hard") return 0.9;
  if(diff === "brutal") return 1.05;
  return 0.62;
}

function spawnAsteroid(label, isCorrect){
  var r = canvas.getBoundingClientRect();
  var w = r.width;
  var spawnX = pickSpawnX(w);
  if(isCorrect && typeof state.nextCorrectSpawnX === "number"){
    spawnX = state.nextCorrectSpawnX;
    state.nextCorrectSpawnX = null;
  }

  var levelFactor = getDifficultySpeedFactor();
  var baseVy = 100 + state.level * 14 * levelFactor;
  var speedScale = state.baseSpeed * (1 + state.ddSpeedBonus);

  var size = isCorrect ? rand(30, 38) : rand(26, 36);
  var id = ++state.asteroidId;
  var driftAmp = rand(8, 20);
  var driftRate = rand(0.6, 1.4);
  var driftPhase = rand(0, Math.PI * 2);

  var a = {
    id:id,
    x: spawnX,
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
    driftPhase: driftPhase,
    spriteIndex: randi(0, asteroidSprites.length - 1),
    spawnAt: getElapsedSeconds()
  };
  if(isCorrect && !tutorialActive && !hiddenPowerupActive && answerHitsSincePowerup >= 7){
    var drop = choosePowerupDrop();
    if(drop){
      a.hiddenPowerup = drop;
      hiddenPowerupActive = true;
    }
  }
  if(isDigitMode() && isCorrect){
    var digitHits = parseInt(label, 10);
    if(Number.isNaN(digitHits) || digitHits <= 1) digitHits = 1;
    a.hitsRemaining = digitHits;
    a.hitsTotal = digitHits;
  }

  asteroids.push(a);

  if(isCorrect){
    state.correctInPlay = true;
    state.correctAsteroidId = id;
  }
}

function spawnDecoyOnly(){
  var activeLabels = new Set();
  for(var i=0; i<asteroids.length; i++){
    var a = asteroids[i];
    if(a.waveId === state.waveId && a.label != null){
      activeLabels.add(String(a.label));
    }
  }
  var label = null;
  if(!state.waveDecoyBag || !state.waveDecoyBag.length){
    if(isDigitMode()){
      state.waveDecoyBag = buildDigitDecoyBag(activeLabels);
    }else{
      state.waveDecoyBag = buildClassicDecoyBag(state.answer, Math.max(6, Math.round(state.decoys * 0.6)), activeLabels);
    }
  }
  if(state.waveDecoyBag && state.waveDecoyBag.length){
    for(var bi=state.waveDecoyBag.length - 1; bi>=0; bi--){
      var cand = state.waveDecoyBag[bi];
      if(!activeLabels.has(String(cand))){
        label = cand;
        state.waveDecoyBag.splice(bi, 1);
        break;
      }
    }
    if(label == null){
      label = state.waveDecoyBag.pop();
    }
  }
  if(label == null){
    var pool = (state.waveDecoys && state.waveDecoys.length) ? state.waveDecoys : [Math.max(0, state.answer + randi(-10,10))];
    label = pool[randi(0, pool.length - 1)];
  }
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
    var baseVy = (92 + state.level * 10) * getDifficultySpeedFactor();
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
      ambient:true,
      driftAmp: rand(6, 14),
      driftRate: rand(0.6, 1.5),
      driftPhase: rand(0, Math.PI * 2),
      spriteIndex: randi(0, asteroidSprites.length - 1)
    });
  }
}

function spawnPowerup(type, group, x, y, opts){
  var r = canvas.getBoundingClientRect();
  var spin = rand(0.45, 1.1);
  if(Math.random() < 0.5) spin *= -1;
  var spawnX = (typeof x === "number") ? x : rand(60, r.width - 60);
  var spawnY = (typeof y === "number") ? y : -30;
  var popDuration = (opts && opts.pop) ? (opts.popDuration || 0.55) : 0;
  powerups.push({
    x: spawnX,
    y: spawnY,
    vy: rand(90, 140),
    r: 16,
    rot: rand(0, Math.PI * 2),
    rotSpeed: spin,
    type: type,
    group: group,
    popTimer: popDuration,
    popDuration: popDuration,
    popScale: (opts && typeof opts.popScale === "number") ? opts.popScale : 0.7
  });
}

function choosePowerupDrop(){
  var roll = Math.random();
  var lowHull = player.hull < 0.3;
  function pickSecondaryType(){
    var pool = ["time","time","emp","emp","magnet","lock","repair"];
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if(lowHull && roll < 0.75){
    var sType = Math.random() < 0.7 ? "repair" : pickSecondaryType();
    return { type: sType, group: "secondary" };
  }
  if(roll < 0.45){
    var offense = ["laser", "fire", "ice", "electric", "pierce", "plasma", "rail"];
    if(isMissileAllowed()) offense.unshift("missile");
    var oType = offense[Math.floor(Math.random() * offense.length)];
    return { type: oType, group: "offense" };
  }
  if(roll < 0.7){
    var dType = Math.random() < 0.6 ? "shield" : "armor";
    return { type: dType, group: "defense" };
  }
  var sType = pickSecondaryType();
  return { type: sType, group: "secondary" };
}

function canSpawnEventPowerup(){
  if(tutorialActive) return false;
  if(hiddenPowerupActive) return false;
  return true;
}

function maybeSpawnEventPowerup(chance, x, y){
  if(!canSpawnEventPowerup()) return false;
  if(Math.random() > chance) return false;
  var drop = choosePowerupDrop();
  if(!drop) return false;
  spawnPowerup(drop.type, drop.group, x, y);
  return true;
}

function resetSurvivorTimer(){
  survivorTimer = 0;
  survivorRewardReady = false;
}

function maybeDropPowerup(){
  if(hiddenPowerupActive) return;
  if(Math.random() > 0.7) return;
  var drop = choosePowerupDrop();
  if(!drop) return;
  spawnPowerup(drop.type, drop.group);
}

function maybeSpawnAnswerPowerup(hitAst){
  if(!hitAst) return;
  if(hitAst.hiddenPowerup){
    playSfx(state, "powerup_emerges");
    spawnPowerup(hitAst.hiddenPowerup.type, hitAst.hiddenPowerup.group, hitAst.x, hitAst.y, { pop: true, popScale: 0.8 });
    hiddenPowerupActive = false;
    answerHitsSincePowerup = 0;
    return;
  }
}

function applyPowerup(p){
  if(p.group === "offense"){
    if(p.type === "missile" && !isMissileAllowed()){
      p.type = "laser";
    }
    player.blasterMode = p.type;
    player.blasterHitsRemaining = 2;
    player.blasterTimer = 0;
    if(p.type === "missile") showToast("OFFENSE -> MISSILE SHOT");
    else if(p.type === "laser") showToast("OFFENSE -> LASER BURST");
    else if(p.type === "fire") showToast("OFFENSE -> FIREBALL");
    else if(p.type === "ice") showToast("OFFENSE -> ICE SHARDS");
    else if(p.type === "electric") showToast("OFFENSE -> ELECTRIC BOLTS");
    else if(p.type === "pierce") showToast("OFFENSE -> LOOK UP SHOT");
    else if(p.type === "plasma") showToast("OFFENSE -> PLASMA ORB");
    else if(p.type === "rail") showToast("OFFENSE -> RAIL BEAM");
  }else if(p.group === "defense" && p.type === "shield"){
    player.defenseMode = "shield";
    player.defenseTimer = 10;
    showToast("DEFENSE -> SHIELD");
  }else if(p.group === "defense" && p.type === "armor"){
    player.defenseMode = "armor";
    player.defenseTimer = 0;
    player.armorBlocksRemaining = 5;
    showToast("DEFENSE -> ARMOR");
  }else if(p.group === "secondary"){
    if(p.type === "repair"){
      player.hull = clamp(player.hull + 0.35, 0, 1);
      spawnRing(player.x, player.y, 18);
      spawnParticles(player.x, player.y, "correct");
      showToast("HULL REPAIRED");
    }else{
      addSecondaryPowerup(p.type);
      if(p.type === "time") showToast("SECONDARY -> TIME DILATION (X/Q)");
      else if(p.type === "magnet") showToast("SECONDARY -> MAGNET SWEEP (X/Q)");
      else if(p.type === "emp") showToast("SECONDARY -> EMP BURST (X/Q)");
      else if(p.type === "lock") showToast("SECONDARY -> TARGET LOCK (X/Q)");
    }
  }
}

function spawnSplitAsteroids(a){
  var baseVy = a.baseVy != null ? a.baseVy : a.vy;
  for(var i=0;i<2;i++){
    var side = i === 0 ? -1 : 1;
    asteroids.push({
      id: ++state.asteroidId,
      x: a.x + side * a.r * 0.35,
      y: a.y + rand(-4, 4),
      vx: (a.vx || 0) + side * rand(24, 46),
      vy: (a.vy || 0) * rand(0.85, 1.05),
      baseVy: baseVy,
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

function markAsteroidEffect(a, effect, duration){
  a.hit = true;
  a.noDamage = true;
  a.effect = effect;
  a.effectTimer = duration;
  a.effectDuration = duration;
  a.burning = effect === "burn";
  a.frozen = effect === "freeze";
  a.ghost = true;
}

function fadeTutorialAsteroids(){
  tutorialSpawnUnlocked = false;
  for(var i=0; i<asteroids.length; i++){
    var a = asteroids[i];
    if(!a || a.noDamage) continue;
    markAsteroidEffect(a, "fade", 1.0);
  }
}

function resetShotType(){
  player.blasterMode = "single";
  player.blasterHitsRemaining = 0;
  player.blasterTimer = 0;
}

function triggerTutorialRecovery(reason){
  if(!tutorialActive || !tourGuide || tutorialRecoveryActive) return false;
  tutorialRecoveryActive = true;
  tutorialRecoveryResumeStepId = tutorialStepId || null;
  player.hidden = true;
  player.vx = 0;
  player.vy = 0;
  player.moveSpeed = 0;
  player.shipShake = Math.max(player.shipShake || 0, 1.0);
  playSfx(state, "explosion");
  var boomX = player.x;
  var boomY = player.y - 8;
  spawnRing(boomX, boomY, 20);
  spawnParticles(boomX, boomY, "spark");
  spawnParticles(boomX, boomY, "smoke");
  kickShake(20, 0.16);
  showToast(reason || "HULL CRITICAL");
  tourGuide.interject([
    { id: "recovery_warn", title: "Hull Warning", body: "Beware the green HP bar at the top left. Avoid crashing into asteroids and alien attacks.", autoAdvanceMs: 2600, showProgress: false },
    { id: "recovery_powerup", title: "Repair Protocol", body: "Shoot the answer for a chance at a powerup. Grab the wrench to repair hull.", autoAdvanceMs: 2600, showProgress: false }
  ], function(){
    tutorialRecoveryActive = false;
    if(tourGuide && tutorialRecoveryResumeStepId){
      tourGuide.jumpTo(tutorialRecoveryResumeStepId);
    }
  });
  return true;
}

function registerShotTypeHit(amount, forceClear){
  if(player.blasterMode === "single") return;
  if(forceClear){
    resetShotType();
    return;
  }
  var hits = (typeof player.blasterHitsRemaining === "number") ? player.blasterHitsRemaining : 0;
  hits -= (amount || 1);
  player.blasterHitsRemaining = Math.max(0, hits);
  if(player.blasterHitsRemaining <= 0){
    resetShotType();
  }
}

function startTutorialPortalExit(){
  if(player.fadeOutActive) return;
  tutorialPortalLock = true;
  tutorialPortalNotifyPending = true;
  player.fadeOutActive = true;
  player.fadeOutT = 0;
  player.fadeOutDur = 1.6;
  player.fadeAlpha = 1;
  player.hidden = false;
  setShipAdvance(state, false);
  setShipIdle(state, false);
}

function chainDestroy(origin, radius, maxTargets){
  var targets = [];
  for(var i=0;i<asteroids.length;i++){
    var a = asteroids[i];
    if(a === origin) continue;
    if(a.isCorrect && a.waveId === state.waveId) continue;
    var dx = a.x - origin.x;
    var dy = a.y - origin.y;
    var dist = Math.hypot(dx, dy);
    if(dist <= radius){
      targets.push({ a: a, d: dist });
    }
  }
  targets.sort(function(p1, p2){ return p1.d - p2.d; });
  if(maxTargets) targets = targets.slice(0, maxTargets);
  for(var j=0; j<targets.length; j++){
    var t = targets[j].a;
    var idx = asteroids.indexOf(t);
    if(idx >= 0){
      impactDebris(t.x, t.y);
      playSfx(state, "impact_thud", 0.35);
      asteroids.splice(idx, 1);
    }
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

function clearWaveAsteroids(wid){
  for(var i=asteroids.length-1; i>=0; i--){
    if(asteroids[i].waveId === wid){
      asteroids.splice(i, 1);
    }
  }
}

// ======= Core actions
function applySettings(){
  applySettingsFromInputs(state, inputs);
  configureAliensDifficulty();
  var diff = String(state.difficulty || "normal").toLowerCase();
  state.redemptionEnabled = (diff === "easy" || diff === "normal") && isDigitMode();
  updateDecoyFunctionAvailability();
  if(inputs.ship && inputs.ship.value){
    player.shipType = inputs.ship.value;
  }
  if(!state.sound) setDrone(state, false);
  setSoundtrack(state, state.sound && state.running && !state.over);
}

function stopMissionClearedSfx(){
  if(missionClearFx.sfxClip){
    try{
      missionClearFx.sfxClip.pause();
      missionClearFx.sfxClip.currentTime = 0;
    }catch(e){}
    missionClearFx.sfxClip = null;
  }
}

function beginRun(){
  state.running = true;
  state.paused = false;
  state.over = false;
  state.startTime = performance.now();
  state.pauseAccum = 0;
  state.pauseStart = 0;
  state.timerWarningPlayed = false;
  state.timerMark15Played = false;
}

function resetSession(){
  if(gameOverSfxTimer){
    clearTimeout(gameOverSfxTimer);
    gameOverSfxTimer = 0;
  }
  stopMissionClearedSfx();
  closeMissileInput();
  if(countdownTimerId){
    clearInterval(countdownTimerId);
    countdownTimerId = 0;
  }
  if(launchHoldTimer){
    clearTimeout(launchHoldTimer);
    launchHoldTimer = 0;
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
  missionClearFx.sfxClip = null;
  missionClearFx.mode = "cleared";
  countdownActive = false;
  cam.x = 0; cam.y = 0; cam.t = 0; cam.t0 = 0; cam.amp = 0;

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

  state.missesByFact = new Map();
  state.ddSpeedBonus = 0;

  state.spawnTimer = 0;
  state.waveDecoys = [];
  state.waveDecoyBag = null;
  state.correctInPlay = false;
  state.asteroidId = 0;
  state.correctAsteroidId = 0;
  state.correctDelayRemaining = 0;
  state.nextCorrectSpawnX = null;
  state.empTimer = 0;
  state.answerDigits = [];
  state.digitCounts = null;
  state.digitsLeft = 0;
  state.correctDigit = null;
  state.timerWarningPlayed = false;
  state.timerMark15Played = false;
  state.endReasonDetail = "";
  state.redemptionUsed = false;
  state.empCascade = null;
  state.empCascadeTimer = 0;
  state.empCascadeInterval = 0;
  state.missileBuffer = "";
  state.missileBufferTimer = 0;
  state.slowMoWaveActive = false;
  state.slowMoWaveY = 0;
  state.slowMoWaveSpeed = 420;
  state.slowMoWaveDelay = 0;
  state.empWaveActive = false;
  state.empWaveY = 0;
  state.empWaveSpeed = 720;
  state.empWavePhase = 0;
  state.hideAsteroids = false;
  state.flaresActive = false;
  state.flaresTimer = 0;
  state.flaresEmitTimer = 0;

  player.cooldown = 0;
  player.vx = 0;
  player.vy = 0;
  player.recoil = 0;
  player.flash = 0;
  player.gunSide = 1;
  player.bankHold = 0;
  if(player.spinManeuver) player.spinManeuver.active = false;
  player.blasterMode = "single";
  player.blasterHitsRemaining = 0;
  player.blasterTimer = 0;
  player.secondaryMode = "none";
  player.secondaryCharges = 0;
  player.secondaryInventory = {};
  player.secondaryCooldown = 0;
  player.lockTimer = 0;
  player.lockTargetId = 0;
  player.defenseMode = "none";
  player.defenseTimer = 0;
  player.armorBlocksRemaining = 0;
  player.magnetTimer = 0;

  player.hull = 1;
  player.invuln = 0;
  player.hitFlash = 0;
  player.shipShake = 0;
  player.teleportHide = 0;
  player.hidden = false;
  player.fadeAlpha = 1;
  player.fadeOutActive = false;
  player.fadeOutT = 0;
  player.fadeOutDur = 0;
  answerHitsSincePowerup = 0;
  hiddenPowerupActive = false;
  resetSurvivorTimer();
  cleanWaveStreak = 0;
  waveHadWrongHit = false;

  resetAliens();

  nextProblem();
  syncHud();
  setDrone(state, true);
  setSoundtrackStartIndex(getSoundtrackStartIndex());
  setSoundtrack(state, true);
  applyMousepadAutoStart();
}

function startIntroSequence(done){
  introActive = true;
  state.running = false;
  state.paused = false;
  player.hidden = true;
  updateCursorVisibility();
  if(introTimer) clearTimeout(introTimer);
  if(gameShell){
    gameShell.classList.remove("intro-drop");
    void gameShell.offsetWidth;
    gameShell.classList.add("intro-drop");
  }
  playSfx(state, "dash");
  introTimer = setTimeout(function(){
    introActive = false;
    if(typeof done === "function") done();
  }, 1400);
}

function startCountdown(skipReset){
  if(!countdownEl) return false;
  if(countdownEl.classList.contains("show")) return true;
  if(introActive) return false;
  if(tutorialActive){
    overlayMenu.classList.remove("show");
    hideEndOverlay();
    applySettings();
    state.running = false;
    state.paused = false;
    state.over = false;
    introHudHold = false;
    syncHud();
    if(gameOverSfxTimer){
      clearTimeout(gameOverSfxTimer);
      gameOverSfxTimer = 0;
    }
    if(countdownTimerId){
      clearInterval(countdownTimerId);
      countdownTimerId = 0;
    }
    if(launchHoldTimer){
      clearTimeout(launchHoldTimer);
      launchHoldTimer = 0;
    }
    resetSession();
    showToast("MISSION START");
    return true;
  }
  if(countdownTimerId){
    clearInterval(countdownTimerId);
    countdownTimerId = 0;
  }
  if(launchHoldTimer){
    clearTimeout(launchHoldTimer);
    launchHoldTimer = 0;
  }

  overlayMenu.classList.remove("show");
  hideEndOverlay();
  applySettings();
  state.running = false;
  state.paused = false;
  state.over = false;
  introHudHold = false;
  syncHud();
  if(gameOverSfxTimer){
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
  answerHitsSincePowerup = 0;
  hiddenPowerupActive = false;

  var steps = ["3","2","1","GO"];
  var i = 0;
  countdownStartAt = performance.now();
  countdownDurationSec = steps.length * 0.6;
  countdownEl.textContent = steps[i];
  countdownEl.classList.add("show");
  playSfx(state, "session_start");
  setSoundtrackStartIndex(getSoundtrackStartIndex());
  setSoundtrack(state, true);

  countdownTimerId = setInterval(function(){
    i++;
    if(i < steps.length){
      countdownEl.textContent = steps[i];
      return;
    }
    clearInterval(countdownTimerId);
    countdownTimerId = 0;
    countdownEl.classList.remove("show");
    countdownActive = false;
    if(skipReset){
      resetSession();
      beginRun();
    }else{
      resetSession();
    }
    showToast("MISSION START");
  }, 600);

  return true;
}

function startIntroThenCountdown(){
  if(!countdownEl) return false;
  if(countdownEl.classList.contains("show") || introActive) return true;

  if(!tutorialActive && !missionBriefShowing && !missionBriefBypass){
    ensureMissionBrief();
    if(missionBriefOverlay){
      if(countdownEl) countdownEl.classList.remove("show");
      countdownActive = false;
      hideEndOverlay();
      missionBriefTitle.textContent = "";
      missionBriefBody.textContent = "";
      startMissionBriefTypewriter("Ready Cadet?", getMissionBriefText());
      setMissionBriefActive(true);
      missionBriefOverlay.classList.add("show");
      missionBriefOnAccept = function(){
        startIntroThenCountdown();
      };
      return true;
    }
  }
  missionBriefBypass = false;

  overlayMenu.classList.remove("show");
  hideEndOverlay();
  applySettings();
  state.running = false;
  state.paused = false;
  state.over = false;
  introHudHold = true;
  syncHud();
  if(gameOverSfxTimer){
    clearTimeout(gameOverSfxTimer);
    gameOverSfxTimer = 0;
  }

  startIntroSequence(function(){
    if(launchHoldTimer){
      clearTimeout(launchHoldTimer);
      launchHoldTimer = 0;
    }
    launchHoldTimer = setTimeout(function(){
      launchHoldTimer = 0;
      startCountdown(true);
    }, 220);
  });
  return true;
}

function bumpContinueDifficulty(){
  var options = [];
  function addOption(label, apply){
    options.push({ label: label, apply: apply });
  }

  if(inputs.speed && inputs.speed.options && inputs.speed.options.length){
    var speedIndex = inputs.speed.selectedIndex;
    if(speedIndex >= 0 && speedIndex < inputs.speed.options.length - 1){
      addOption("SPEED", function(){ inputs.speed.selectedIndex = speedIndex + 1; });
    }
  }
  if(inputs.decoys && inputs.decoys.options && inputs.decoys.options.length){
    var decoyIndex = inputs.decoys.selectedIndex;
    if(decoyIndex >= 0 && decoyIndex < inputs.decoys.options.length - 1){
      addOption("DECOYS", function(){ inputs.decoys.selectedIndex = decoyIndex + 1; });
    }
  }
  if(inputs.lives && inputs.lives.options && inputs.lives.options.length){
    var livesIndex = inputs.lives.selectedIndex;
    if(livesIndex > 0){
      addOption("LIVES", function(){ inputs.lives.selectedIndex = livesIndex - 1; });
    }
  }
  if(inputs.strikes && inputs.strikes.options && inputs.strikes.options.length){
    var strikesIndex = inputs.strikes.selectedIndex;
    if(strikesIndex > 0){
      addOption("STRIKES", function(){ inputs.strikes.selectedIndex = strikesIndex - 1; });
    }
  }
  var diffOrder = ["easy", "normal", "hard", "brutal"];
  var curDiff = String(state.difficulty || "normal").toLowerCase();
  var diffIndex = diffOrder.indexOf(curDiff);
  if(diffIndex >= 0 && diffIndex < diffOrder.length - 1){
    addOption("DIFFICULTY", function(){ state.difficulty = diffOrder[diffIndex + 1]; });
  }

  if(!options.length) return "";
  var pick = options[Math.floor(Math.random() * options.length)];
  pick.apply();
  return pick.label || "";
}

function continueSession(){
  ensureLoop();
  stopMissionClearedSfx();
  var bumped = bumpContinueDifficulty();
  if(bumped){
    showToast("CONTINUE: +" + bumped);
  }
  startIntroThenCountdown();
}

function hardRestart(){
  ensureLoop();
  if(!startIntroThenCountdown()){
    hideEndOverlay();
    overlayMenu.classList.remove("show");
    applySettings();
    resetSession();
    showToast("MISSION RESTARTED");
  }
}

function openSettings(){
  state.paused = true;
  state.hideAsteroids = true;
  syncTimerPause();
  syncHud();
  if(overlayGameplay) overlayGameplay.classList.remove("show");
  if(overlayPowerups) overlayPowerups.classList.remove("show");
  if(overlaySfx) overlaySfx.classList.remove("show");
  if(overlayControls) overlayControls.classList.remove("show");
  overlayMenu.classList.add("show");
  setSettingsTab("audio");
  loadWideGameplay();
  loadMousepadAutoStart();
  renderSettingsCatalogs();
  if(sfxCatalogPanel) sfxCatalogPanel.classList.add("open");
}

function closeSettings(){
  overlayMenu.classList.remove("show");
  if(overlayGameplay) overlayGameplay.classList.remove("show");
  if(overlayPowerups) overlayPowerups.classList.remove("show");
  if(overlaySfx) overlaySfx.classList.remove("show");
  if(overlayControls) overlayControls.classList.remove("show");
  if(sfxCatalogPanel) sfxCatalogPanel.classList.remove("open");
  stopAllPreviewAudio();
  if(state.running && !state.over) state.paused = false;
  state.hideAsteroids = false;
  syncTimerPause();
  syncHud();
}

function togglePause(){
  if(screenshotMode) return;
  if(!pauseAllowed) return;
  if(!state.running || state.over) return;
  state.paused = !state.paused;
  syncTimerPause();
  updateCursorVisibility();
  if(state.paused){
    if(mousepadActive){
      mousepadPaused = true;
      setMousepadActive(false);
    }else{
      mousepadPaused = false;
    }
  }else if(mousepadPaused){
    setMousepadActive(true);
    mousepadPaused = false;
  }
  syncHud();
  showToast(state.paused ? "PAUSED" : "RESUMED");
}

function toggleScreenshot(){
  if(!state.running || state.over) return;
  screenshotMode = !screenshotMode;
  syncTimerPause();
  updateCursorVisibility();
  if(screenshotMode){
    if(mousepadActive){
      mousepadPaused = true;
      setMousepadActive(false);
    }else{
      mousepadPaused = false;
    }
  }else if(mousepadPaused){
    setMousepadActive(true);
    mousepadPaused = false;
  }
  showToast(screenshotMode ? "SCREENSHOT MODE" : "SCREENSHOT MODE OFF");
}

function fire(){
  if(!state.running || state.paused || state.over) return;
  if(player.cooldown > 0) return;

  player.cooldown = 0.16;
  var mode = player.blasterMode || "single";
  if(mode === "missile"){
    return;
  }
  state.shots++;
  if(mode === "laser"){
    bullets.push({ x: player.x, y: player.y - 24, vy: -980, r: 5.2, vx: 0, kind: "laser", len: 22, w: 3.6 });
  }else if(mode === "fire"){
    bullets.push({ x: player.x, y: player.y - 20, vy: -720, r: 6.2, vx: 0, kind: "fire" });
  }else if(mode === "ice"){
    bullets.push({ x: player.x, y: player.y - 26, vy: -880, r: 6.5, vx: 0, kind: "ice" });
  }else if(mode === "electric"){
    bullets.push({ x: player.x, y: player.y - 24, vy: -920, r: 5.6, vx: 0, kind: "electric" });
  }else if(mode === "pierce"){
    bullets.push({ x: player.x, y: player.y - 24, vy: -900, r: 3.8, vx: 0, kind: "pierce", speed: 900, rot: 0, spin: 6 });
  }else if(mode === "plasma"){
    bullets.push({ x: player.x, y: player.y - 24, vy: -1000, r: 7.6, vx: 0, kind: "plasma" });
  }else if(mode === "rail"){
    bullets.push({ x: player.x, y: player.y - 26, vy: -1260, r: 5.2, vx: 0, kind: "rail", len: 40, w: 4.2 });
  }else{
    bullets.push({ x: player.x, y: player.y - 24, vy: -880, r: 4.0, vx: 0, kind: "single" });
  }

  player.recoil = 1;
  player.flash = 1;
  var gunSfx = (mode === "laser") ? "gun2" : "gun1";
  if(mode === "ice") gunSfx = "ice_shot";
  if(mode === "electric") gunSfx = "bolt_shot";
  if(mode === "plasma") gunSfx = "shot_orb";
  if(mode === "rail") gunSfx = "shot_railbeam";
  playSfx(state, gunSfx);
  if(tourGuide) tourGuide.notify("fire");
}

function secondaryFire(){
  if(!state.running || state.paused || state.over) return;
  if(player.secondaryCooldown > 0) return;
  if(player.secondaryCharges <= 0) return;

  var inv = getSecondaryInventory();
  var activeType = player.secondaryMode;
  if(!activeType || activeType === "none" || !inv[activeType]) return;
  inv[activeType] -= 1;
  player.secondaryCharges = Math.max(0, inv[activeType] || 0);
  player.secondaryCooldown = 1.2;

  if(activeType === "repair"){
    player.hull = clamp(player.hull + 0.35, 0, 1);
    spawnRing(player.x, player.y, 18);
    spawnParticles(player.x, player.y, "correct");
    showToast("SECONDARY -> HULL REPAIR");
  }else if(activeType === "time"){
    startSlowMoWave();
    playSfx(state, "time_activate");
    showToast("SECONDARY -> TIME DILATION");
  }else if(activeType === "magnet"){
    player.magnetTimer = 6.0;
    showToast("SECONDARY -> MAGNET SWEEP");
  }else if(activeType === "emp"){
    state.empTimer = Math.max(state.empTimer, 2.0);
    startEmpWave();
    playSfx(state, "emp_activate");
    showToast("SECONDARY -> EMP BURST");
  }else if(activeType === "lock"){
    player.lockTimer = Math.max(player.lockTimer, 6.0);
    showToast("SECONDARY -> TARGET LOCK");
  }

  if(player.secondaryCharges <= 0){
    if(inv[activeType] <= 0) delete inv[activeType];
    var remaining = getSecondaryInventoryEntries();
    if(remaining.length){
      setSelectedSecondary(remaining[0].type);
    }else{
      player.secondaryMode = "none";
      player.secondaryCharges = 0;
    }
  }
  if(tourGuide) tourGuide.notify("secondary");
}

function startSlowMoWave(){
  state.slowMoRemaining = Math.max(state.slowMoRemaining || 0, 8.0);
  state.slowMoScale = 0.35;
  state.slowMoWaveDelay = 0.8;
  state.slowMoWaveActive = false;
  state.slowMoWaveY = view.h + 20;
  state.slowMoWaveSpeed = 420;
}

function startEmpWave(){
  state.empWaveActive = true;
  state.empWaveY = view.h + 30;
  state.empWaveSpeed = 720;
  state.empWavePhase = 0;
  var cascade = [];
  for(var i=0; i<asteroids.length; i++){
    var a = asteroids[i];
    if(!a || a.isCorrect) continue;
    if(a.label == null) continue;
    if(a.ambient || a.ghost) continue;
    cascade.push(a);
  }
  cascade.sort(function(a,b){ return (b.y || 0) - (a.y || 0); });
  state.empCascade = cascade.length ? cascade.slice() : null;
  state.empCascadeTimer = 0;
  state.empCascadeInterval = 1.0;
}

function emitFlareStream(){
  if(!state.flaresActive || !spawnDirectedSparks) return;
  var flareOffset = state.flaresOffset || 46;
  var flareY = player.y - 4;
  var leftX = player.x - flareOffset;
  var rightX = player.x + flareOffset;
  var bursts = 3;
  var burstParams = [];
  for(var i=0; i<bursts; i++){
    burstParams.push({
      spread: 0.18 + i * 0.08,
      speedMin: 260 + i * 40,
      speedMax: 520 + i * 60,
      count: 8 + i * 4
    });
  }
  function emitSide(x, dir){
    for(var i=0; i<burstParams.length; i++){
      var p = burstParams[i];
      spawnDirectedSparks(x, flareY, dir, 0, p.spread, p.count, p.speedMin, p.speedMax, 0.18, 0.32, "spark");
      spawnDirectedSparks(x, flareY, dir, 0, p.spread, Math.max(5, p.count - 4), p.speedMin * 0.75, p.speedMax * 0.85, 0.16, 0.3, "spark_white");
    }
  }
  emitSide(leftX, -1);
  emitSide(rightX, 1);
}

function applyFlaresToAsteroid(a, dtReal){
  if(!state.flaresActive) return;
  var flareOffset = state.flaresOffset || 46;
  var flareRadius = state.flaresRadius || 150;
  var flareStrength = state.flaresStrength || 480;
  var flareY = player.y;
  var band = 44;
  if(Math.abs(a.y - flareY) > band) return;

  var hit = false;
  var leftX = player.x - flareOffset;
  var dxL = a.x - leftX;
  var distL = Math.hypot(dxL, a.y - flareY);
  if(distL < flareRadius){
    var pushL = (1 - distL / flareRadius) * flareStrength;
    a.vx = (a.vx || 0) - pushL * dtReal;
    a.vy = (a.vy || 0) + ((a.y - flareY) / Math.max(1, distL)) * pushL * dtReal * 0.2;
    hit = true;
  }
  var rightX = player.x + flareOffset;
  var dxR = a.x - rightX;
  var distR = Math.hypot(dxR, a.y - flareY);
  if(distR < flareRadius){
    var pushR = (1 - distR / flareRadius) * flareStrength;
    a.vx = (a.vx || 0) + pushR * dtReal;
    a.vy = (a.vy || 0) + ((a.y - flareY) / Math.max(1, distR)) * pushR * dtReal * 0.2;
    hit = true;
  }

  if(a.flareSparkTimer == null) a.flareSparkTimer = 0;
  if(a.flareSparkTimer > 0){
    a.flareSparkTimer = Math.max(0, a.flareSparkTimer - dtReal);
  }
  if(hit && a.flareSparkTimer <= 0){
    spawnParticles(a.x, a.y, "spark");
    spawnParticles(a.x, a.y, "spark_white");
    if(spawnDirectedSparks){
      var ang = Math.random() * Math.PI * 2;
      spawnDirectedSparks(a.x, a.y, Math.cos(ang), Math.sin(ang), 1.2, 10, 220, 520, 0.14, 0.3, "spark");
      spawnDirectedSparks(a.x, a.y, Math.cos(ang + 1.3), Math.sin(ang + 1.3), 1.2, 6, 200, 420, 0.14, 0.28, "spark_white");
    }
    a.flareSparkTimer = 0.18;
  }
}

function dash(){
  if(!state.running || state.paused || state.over) return;
  var profile = getShipProfile(player.shipType);
  if(player.dashCooldown > 0) return;
  state.dashes += 1;
  player.dashCooldown = profile.dashCooldown || 1.3;
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
  if(segLen2 > 1){
    for(var i=0; i<asteroids.length; i++){
      var a = asteroids[i];
      if(a.noDamage) continue;
      var r = (a.r || 0) + (player.radius || 18) - 2;
      var fx = startX - a.x;
      var fy = startY - a.y;
      var A = segLen2;
      var B = 2 * (fx * segX + fy * segY);
      var C = fx * fx + fy * fy - r * r;
      var disc = B * B - 4 * A * C;
      if(disc < 0) continue;
      var t = (-B - Math.sqrt(disc)) / (2 * A);
      if(t >= 0 && t <= tHit){
        tHit = t;
        hitAsteroid = a;
        hitIndex = i;
      }
    }
  }
  if(tHit < 1){
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
  if(hitAsteroid){
    if(handleShipAsteroidCollision(hitAsteroid, hitX, hitY, true)){
      if(state.over) return;
    }
  }
  playSfx(state, "dash");
  showToast("DASH");
  if(tourGuide) tourGuide.notify("dash");
}

function shockwave(){
  if(!state.running || state.paused || state.over) return;
  var profile = getShipProfile(player.shipType);
  if(player.shockwaveCooldown > 0) return;
  player.shockwaveCooldown = profile.shockwaveCooldown || 3.5;

  if(profile.ability === "flares"){
    state.flaresActive = true;
    state.flaresTimer = 0.9;
    state.flaresEmitTimer = 0;
    state.flaresOffset = 46;
    state.flaresRadius = profile.shockwaveRadius || 150;
    state.flaresStrength = profile.shockwaveStrength || 480;
    kickShake(12, 0.1);
    playSfx(state, "flares");
    showToast("SIDE FLARES");
    if(tourGuide) tourGuide.notify("ability");
    return;
  }

  if(profile.ability === "spin"){
    var dirX = 0;
    var dirY = 0;
    if(keys.has("arrowleft") || keys.has("a")) dirX -= 1;
    if(keys.has("arrowright") || keys.has("d")) dirX += 1;
    if(keys.has("arrowup") || keys.has("w")) dirY -= 1;
    if(keys.has("arrowdown") || keys.has("s")) dirY += 1;
    if(dirX === 0 && dirY === 0){
      dirX = player.vx;
      dirY = player.vy;
    }
    var len = Math.hypot(dirX, dirY);
    if(len === 0){ dirX = 0; dirY = -1; len = 1; }
    dirX /= len; dirY /= len;
    var spireProfile = getShipProfile("spire");
    var dist = (spireProfile.dashDist || 130) * 1.35;
    var startX = player.x;
    var startY = player.y;
    var endX = clamp(player.x + dirX * dist, 40, view.w - 40);
    var endY = clamp(player.y + dirY * dist, view.hudH + 30, view.h - 60);
    spawnParticles(startX, startY, "smoke");
    spawnParticles(endX, endY, "spark");
    playSfx(state, "teleport_disappear");
    player.x = endX;
    player.y = endY;
    var teleportHit = findAsteroidCollisionAt(endX, endY);
    if(teleportHit){
      handleShipAsteroidCollision(teleportHit.asteroid, endX, endY, true, true);
      if(state.over) return;
    }
    player.teleportHide = 0.35;
    player.teleportFx = {
      startX: startX,
      startY: startY,
      endX: endX,
      endY: endY,
      t: 0,
      hide: 0.35,
      ghostDur: 0.28,
      zoomDur: 0.32,
      reappearPlayed: false,
      locked: true
    };
    player.invuln = Math.max(player.invuln, 0.6);
    kickShake(8, 0.08);
    showToast("TELEPORT");
    if(tourGuide) tourGuide.notify("ability");
    return;
  }

  var radius = profile.shockwaveRadius || 160;
  var strength = profile.shockwaveStrength || 520;
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
  if(player.shipType === "classic"){
    spawnRing(player.x, player.y - 10, 26);
  }
  kickShake(14, 0.12);
  playSfx(state, "dash");
  showToast("SHOCKWAVE");
  if(tourGuide) tourGuide.notify("ability");
}

function loseLife(reason){
  state.lives = Math.max(0, state.lives - 1);
  syncHud();
  showToast(reason);
  if(state.lives <= 0){
    state.endReasonDetail = reason ? ("OUT OF LIVES (" + reason + ")") : "OUT OF LIVES";
    endGame("destroyed");
  }
}

function consumeShipLife(detail){
  if(state.over) return true;
  state.lives = Math.max(0, state.lives - 1);
  syncHud();
  if(state.lives <= 0){
    state.endReasonDetail = detail || "OUT OF LIVES";
    endGame("destroyed");
    return true;
  }
  return false;
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

function csvEscape(value){
  var s = String(value == null ? "" : value);
  if(s.indexOf("\"") !== -1) s = s.replace(/"/g, "\"\"");
  if(s.indexOf(",") !== -1 || s.indexOf("\n") !== -1){
    s = "\"" + s + "\"";
  }
  return s;
}

function collectSessionSettings(){
  return {
    ship: (inputs.ship && inputs.ship.value) ? inputs.ship.value : (player.shipType || ""),
    difficulty: state.difficulty || "",
    mode: state.questionMode || "",
    question_mode: (inputs.questionMode && inputs.questionMode.value) ? inputs.questionMode.value : "",
    target_mode: (inputs.targetMode && inputs.targetMode.value) ? inputs.targetMode.value : "",
    strikes: (inputs.strikes && inputs.strikes.value) ? inputs.strikes.value : "",
    timer_mode: (inputs.timerMode && inputs.timerMode.value) ? inputs.timerMode.value : "",
    a_min: (inputs.aMin && inputs.aMin.value) ? inputs.aMin.value : "",
    a_max: (inputs.aMax && inputs.aMax.value) ? inputs.aMax.value : "",
    b_min: (inputs.bMin && inputs.bMin.value) ? inputs.bMin.value : "",
    b_max: (inputs.bMax && inputs.bMax.value) ? inputs.bMax.value : "",
    decoys: (inputs.decoys && inputs.decoys.value) ? inputs.decoys.value : "",
    speed: (inputs.speed && inputs.speed.value) ? inputs.speed.value : "",
    lives: (inputs.lives && inputs.lives.value) ? inputs.lives.value : "",
    sound: (inputs.sound && inputs.sound.value) ? inputs.sound.value : (state.sound ? "on" : "off"),
    volume: (inputs.volume && inputs.volume.value) ? inputs.volume.value : "",
    sfx_volume: (inputs.sfxVolume && inputs.sfxVolume.value) ? inputs.sfxVolume.value : "",
    music_volume: (inputs.musicVolume && inputs.musicVolume.value) ? inputs.musicVolume.value : ""
  };
}

function appendLeaderboardCsv(session){
  var settings = collectSessionSettings();
  var header = "timestamp,datetime,name,score,ship,difficulty,mode,question_mode,target_mode,strikes,timer_mode,a_min,a_max,b_min,b_max,decoys,speed,lives,sound,volume,sfx_volume,music_volume,shots_fired,answers_shot,questions_answered,asteroid_collisions,alien_collisions,alien_shots_hit,aliens_shot,aliens_escaped,session_seconds,dashes_used,powerups_collected,powerups_missed";
  var row = [
    Date.now(),
    new Date().toISOString(),
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
  try{ csv = localStorage.getItem("mathsteroid.leaderboardCSV") || ""; }catch(e){ csv = ""; }
  if(!csv){
    csv = header + "\n";
  }else if(csv.indexOf(header) !== 0){
    csv = header + "\n" + csv.replace(/^\s+/, "");
  }
  csv += row + "\n";
  try{ localStorage.setItem("mathsteroid.leaderboardCSV", csv); }catch(e){}

  // CSV stays in localStorage; no auto-download.
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
    highScores: [],
    highScoresByKey: {}
  };

  stats.sessions += 1;
  stats.totalScore += session.score;
  stats.totalCorrect += session.correct;
  stats.totalWrong += session.wrong;
  stats.totalMissed += session.missed;
  stats.bestScore = Math.max(stats.bestScore, session.score);
  stats.bestStreak = Math.max(stats.bestStreak, session.bestStreak);

  var modeInfo = describeQuestionMode(session.mode);
  var entry = {
    id: session.id || String(Date.now()),
    name: session.name || "",
    score: session.score,
    correct: session.correct,
    level: session.level,
    mode: session.mode,
    operation: session.operation || modeInfo.operation,
    modeLabel: session.modeLabel || modeInfo.modeLabel,
    submode: session.submode || modeInfo.submode,
    modeKey: session.modeKey || modeInfo.key,
    date: Date.now()
  };

  stats.highScores = stats.highScores || [];
  stats.highScores.push(entry);
  stats.highScores.sort(function(a,b){ return b.score - a.score; });
  stats.highScores = stats.highScores.slice(0, 5);

  stats.highScoresByKey = stats.highScoresByKey || {};
  var key = entry.modeKey || modeInfo.key;
  var list = stats.highScoresByKey[key] || [];
  list.push(entry);
  list.sort(function(a,b){ return b.score - a.score; });
  stats.highScoresByKey[key] = list.slice(0, 5);

  saveLifetimeStats(stats);
  return stats;
}

function renderHighScores(lifetime, modeKey){
  if(!highScoresEnd) return;
  highScoresEnd.innerHTML = "";
  var hs = [];
  if(lifetime && lifetime.highScoresByKey && modeKey && lifetime.highScoresByKey[modeKey]){
    hs = lifetime.highScoresByKey[modeKey];
  }else{
    hs = lifetime && lifetime.highScores ? lifetime.highScores : [];
  }
  if(!hs.length){
    var hsEmpty = document.createElement("li");
    hsEmpty.innerHTML = '<span style="color: var(--muted);">NO SCORES YET.</span><b class="pillGood">PLAY</b>';
    highScoresEnd.appendChild(hsEmpty);
    return;
  }
  for(var h=0; h<hs.length; h++){
    var item = hs[h];
    var name = item.name ? (" - " + item.name) : "";
    var liHs = document.createElement("li");
    liHs.innerHTML = "<span>#" + (h+1) + " - " + item.score + " pts" + name + "</span><b>Lv " + item.level + "</b>";
    highScoresEnd.appendChild(liHs);
  }
}

function saveScoreName(name){
  if(!state.lastSessionId) return;
  var trimmed = String(name || "").trim().slice(0, 18);
  if(!trimmed) return;
  var stats = loadLifetimeStats();
  if(!stats || !stats.highScores) return;
  var entryKey = "";
  for(var i=0;i<stats.highScores.length;i++){
    if(stats.highScores[i].id === state.lastSessionId){
      stats.highScores[i].name = trimmed;
      entryKey = stats.highScores[i].modeKey || "";
      break;
    }
  }
  if(entryKey && stats.highScoresByKey && stats.highScoresByKey[entryKey]){
    var list = stats.highScoresByKey[entryKey];
    for(var j=0;j<list.length;j++){
      if(list[j].id === state.lastSessionId){
        list[j].name = trimmed;
        break;
      }
    }
  }
  saveLifetimeStats(stats);
  renderHighScores(stats, entryKey);
  try{ localStorage.setItem("mathsteroid.playerName", trimmed); }catch(e){}
  appendLeaderboardCsv({ name: trimmed, score: state.score });
}

function onCorrectHit(hitAst){
  if(warningClip){
    try{
      warningClip.pause();
      warningClip.currentTime = 0;
    }catch(e){
      // ignore stop failures
    }
    warningClip = null;
  }
  var nearMiss = !!(hitAst && hitAst.warned);
  var precisionHit = false;
  if(hitAst && typeof hitAst.spawnAt === "number"){
    precisionHit = (getElapsedSeconds() - hitAst.spawnAt) <= precisionWindowSec;
  }
  state.correct++;
  state.hits++;
  state.streak++;
  playSfx(state, "correct");
  if(tourGuide) tourGuide.notify("correct");

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
    state.slowMoRemaining = Math.max(state.slowMoRemaining, 2.0);
    state.slowMoScale = 0.55;
    playSfx(state, "level_up2");
    showToast("LEVEL UP!");
  }else{
  }

  syncHud();
  var completedQuestion = false;
  if(isDigitMode()){
    state.digitsLeft = Math.max(0, state.digitsLeft - 1);
    if(state.digitsLeft > 0){
      state.waveId++;
      state.correctDigit = pickCorrectDigit();
      prepareWave();
    }else{
      state.questionsCompleted++;
      completedQuestion = true;
      if(shouldEndByQuestionLimit()){
        endGame("questions");
        return;
      }
      nextProblem();
    }
  }else{
    state.questionsCompleted++;
    completedQuestion = true;
    if(shouldEndByQuestionLimit()){
      endGame("questions");
      return;
    }
    nextProblem();
  }
  if(!tutorialActive){
    var spawned = false;
    if(hitAst && hitAst.hiddenPowerup){
      maybeSpawnAnswerPowerup(hitAst);
      spawned = true;
    }else{
      answerHitsSincePowerup += 1;
      if(nearMiss && hitAst){
        spawned = maybeSpawnEventPowerup(0.10, hitAst.x, hitAst.y);
      }
      if(!spawned && precisionHit && hitAst){
        spawned = maybeSpawnEventPowerup(0.30, hitAst.x, hitAst.y);
      }
      if(completedQuestion){
        if(waveHadWrongHit){
          cleanWaveStreak = 0;
        }else{
          cleanWaveStreak += 1;
        }
        waveHadWrongHit = false;
        if(!spawned && cleanWaveStreak >= 3){
          if(maybeSpawnEventPowerup(1.0)){
            cleanWaveStreak = 0;
            spawned = true;
          }
        }
      }
    }
  }
}

function onWrongHit(){
  state.wrong++;
  state.hits++;
  state.streak = 0;
  waveHadWrongHit = true;
  state.score = Math.max(0, state.score - 60);
  playSfx(state, "wrong_asteroid");

  state.ddSpeedBonus = clamp(state.ddSpeedBonus - 0.02, 0, 0.35);

  syncHud();
  showToast("WRONG TARGET");

  var limit = (typeof state.strikeLimit === "number") ? state.strikeLimit : null;
  if(limit === null || Number.isNaN(limit)){
    var diff = String(state.difficulty || "normal").toLowerCase();
    limit = diff === "easy" ? 8 : diff === "normal" ? 5 : diff === "hard" ? 3 : 0;
  }
  if(limit === 0 || state.wrong >= limit){
    state.endReasonDetail = "STRIKES EXCEEDED (WRONG TARGETS)";
    endGame("destroyed");
  }
}

function clearEndSequenceTimers(){
  for(var i=0;i<endSequenceTimers.length;i++){
    clearTimeout(endSequenceTimers[i]);
  }
  endSequenceTimers.length = 0;
}

function resetEndSequence(){
  if(!endSequence) return;
  endSequence.classList.remove("reveal-sequence", "reveal-score", "reveal-stats", "reveal-name");
  overlayEnd.classList.remove("reveal-reason");
}

function startEndSequence(){
  if(!endSequence) return;
  clearEndSequenceTimers();
  resetEndSequence();
  void endSequence.offsetWidth;
  endSequenceTimers.push(setTimeout(function(){
    overlayEnd.classList.add("reveal-reason");
  }, 180));
  endSequenceTimers.push(setTimeout(function(){
    endSequence.classList.add("reveal-sequence");
    if(endNameInput){
      endNameInput.focus();
      endNameInput.select();
    }
  }, 120));
}

function showEndOverlay(){
  overlayEnd.classList.add("show");
  startEndSequence();
}

function hideEndOverlay(){
  overlayEnd.classList.remove("show");
  resetEndSequence();
}

function endGame(reason){
  if(reason === void 0) reason = "destroyed";
  setDrone(state, false);
  setSoundtrack(state, false);
  state.over = true;
  state.running = false;
  state.paused = false;
  updateCursorVisibility();
  syncHud();
  if(mousepadActive){
    setMousepadActive(false);
  }

  var elapsed = getElapsedSeconds();
  var attempts = state.hits;
  var acc = attempts > 0 ? (state.correct / attempts) : 0;
  var rpm = elapsed > 0 ? (state.correct / elapsed) * 60 : 0;
  var storedName = "";
  try{ storedName = localStorage.getItem("mathsteroid.playerName") || ""; }catch(e){}
  var sessionId = String(Date.now()) + "_" + String(Math.floor(Math.random() * 1000000));
  var modeInfo = describeQuestionMode(state.questionMode || "classic");
  var session = {
    id: sessionId,
    name: storedName,
    score: state.score,
    correct: state.correct,
    wrong: state.wrong,
    missed: state.missed,
    bestStreak: computeMaxStreak(),
    level: state.level,
    mode: state.questionMode || "classic",
    operation: modeInfo.operation,
    modeLabel: modeInfo.modeLabel,
    submode: modeInfo.submode,
    modeKey: modeInfo.key
  };
  var lifetime = updateLifetimeStats(session);
  state.lastSessionId = sessionId;
  var campaignResult = { active:false, success:false, failures:0, failed:false, hasNext:false, last:false };
  if(campaignActive){
    var cState = loadCampaignState() || { index:0, failures:0, completed:[], active:true, failed:false };
    var cData = loadCampaignData() || { missions:[], maxFailures: campaignMaxFailures };
    if(cData.maxFailures) campaignMaxFailures = cData.maxFailures;
    if(reason === "destroyed"){
      cState.failures = (cState.failures || 0) + 1;
      if(cState.failures >= campaignMaxFailures){
        cState.failed = true;
        cState.active = false;
      }
    }else{
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
    campaignResult.last = (campaignIndex + 1) >= ((cData.missions && cData.missions.length) || 0);
    campaignResult.hasNext = campaignResult.success && !campaignResult.failed && !campaignResult.last;
  }

  var endReasonText = "";
  if(reason === "destroyed"){
    if(endTitle){
      endTitle.textContent = "MISSION FAILED";
      endTitle.classList.remove("titleCleared");
    }
    if(endReason){
      var base = state.endReasonDetail ? ("Reason: " + state.endReasonDetail) : "Reason: Out of lives";
      if(campaignResult.active){
        var failText = "Campaign failures: " + campaignResult.failures + "/" + campaignMaxFailures;
        endReasonText = base + " - " + failText;
      }else{
        endReasonText = base;
      }
      endReason.textContent = endReasonText;
    }
    endSubtitle.textContent = "OUT OF LIVES. YOU COMPLETED " + state.correct + " PROBLEMS IN " + Math.round(elapsed) + "s.";
  }else if(state.questionLimit > 0){
    if(endTitle){
      endTitle.textContent = campaignResult.active && campaignResult.last ? "CAMPAIGN COMPLETE" : "MISSION CLEARED";
      endTitle.classList.add("titleCleared");
    }
    if(endReason) endReason.textContent = "";
    endSubtitle.textContent = "MISSION COMPLETE. YOU ANSWERED " + state.questionsCompleted + " QUESTIONS IN " + Math.round(elapsed) + "s.";
  }else if(state.timeLimitSec){
    if(endTitle){
      endTitle.textContent = campaignResult.active && campaignResult.last ? "CAMPAIGN COMPLETE" : "TIME'S UP";
      endTitle.classList.remove("titleCleared");
    }
    if(endReason) endReason.textContent = "";
    endSubtitle.textContent = "TIME'S UP. YOU COMPLETED " + state.correct + " PROBLEMS IN " + Math.round(elapsed) + "s.";
  }else{
    if(endTitle){
      endTitle.textContent = "MISSION FAILED";
      endTitle.classList.remove("titleCleared");
    }
    if(endReason){
      var base = state.endReasonDetail ? ("Reason: " + state.endReasonDetail) : "Reason: Out of lives";
      if(campaignResult.active){
        var failText = "Campaign failures: " + campaignResult.failures + "/" + campaignMaxFailures;
        endReasonText = base + " - " + failText;
      }else{
        endReasonText = base;
      }
      endReason.textContent = endReasonText;
    }
    endSubtitle.textContent = "OUT OF LIVES. YOU COMPLETED " + state.correct + " PROBLEMS IN " + Math.round(elapsed) + "s.";
  }

  if(endOutcome) endOutcome.textContent = endTitle ? endTitle.textContent : "";
  if(endReasonLine) endReasonLine.textContent = endReasonText;
  if(endModeSummary){
    endModeSummary.textContent = "Operation: " + modeInfo.operation + " / Mode: " + modeInfo.modeLabel + " / Submode: " + modeInfo.submode;
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

  if(accBar){
    accBar.style.width = String(Math.round(acc*100)) + "%";
  }

  var correctCount = state.correct || 0;
  var wrongCount = state.wrong || 0;
  var missedCount = state.missed || 0;
  var totalHits = correctCount + wrongCount + missedCount;
  var grade = "E";
  if(acc >= 0.9){
    grade = "S";
  }else if(acc >= 0.8){
    grade = "A";
  }else if(acc >= 0.7){
    grade = "B";
  }else if(acc >= 0.6){
    grade = "D";
  }
  if(endGrade){
    endGrade.textContent = grade;
    endGrade.classList.remove("gradeS", "gradeA", "gradeB", "gradeC", "gradeD", "gradeE");
    endGrade.classList.add("grade" + grade);
  }
  if(breakdownCorrectValue) breakdownCorrectValue.textContent = String(correctCount);
  if(breakdownWrongValue) breakdownWrongValue.textContent = String(wrongCount);
  if(breakdownMissedValue) breakdownMissedValue.textContent = String(missedCount);
  var totalPercent = totalHits > 0 ? 100 : 0;
  var correctPct = totalHits > 0 ? (correctCount / totalHits) * 100 : 0;
  var wrongPct = totalHits > 0 ? (wrongCount / totalHits) * 100 : 0;
  var missedPct = totalHits > 0 ? (missedCount / totalHits) * 100 : 0;
  if(breakdownCorrect) breakdownCorrect.style.width = totalPercent ? (correctPct.toFixed(1) + "%") : "0%";
  if(breakdownWrong) breakdownWrong.style.width = totalPercent ? (wrongPct.toFixed(1) + "%") : "0%";
  if(breakdownMissed) breakdownMissed.style.width = totalPercent ? (missedPct.toFixed(1) + "%") : "0%";

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
      li.innerHTML = "<span>" + key + "</span><b class=\"pillWarn\">" + count + "x</b>";
      weakList.appendChild(li);
    }
  }

  renderHighScores(lifetime, modeInfo.key);

  if(btnEndNext){
    btnEndNext.style.display = campaignResult.hasNext ? "inline-flex" : "none";
  }
  if(btnEndSettings){
    btnEndSettings.style.display = (reason === "questions") ? "inline-flex" : "none";
  }

  if(endNameInput){
    endNameInput.value = storedName;
  }
  if(endScoreValue){
    endScoreValue.textContent = String(state.score);
  }
  resetEndSequence();

  if(reason === "destroyed"){
    player.hidden = true;
    playSfx(state, "explosion");
    if(gameOverSfxTimer){
      clearTimeout(gameOverSfxTimer);
    }
    gameOverSfxTimer = setTimeout(function(){
      playSfx(state, "game_over3");
      gameOverSfxTimer = 0;
    }, 1000);
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
  }else if(reason === "questions"){
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
  }else if(reason === "time"){
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
    missionClearFx.sfxClip = playSfx(state, "mission_cleared1");
    missionClearFx.sfxPlayed = true;
    missionClearFx.mode = "time";
    player.hidden = false;
    gameOverFx.active = false;
    gameOverFx.shown = false;
    hideEndOverlay();
  }else{
    showEndOverlay();
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

function getCorrectAsteroidInPlay(){
  if(!state.correctInPlay) return null;
  if(state.correctAsteroidId){
    for(var i=0; i<asteroids.length; i++){
      if(asteroids[i].id === state.correctAsteroidId){
        return asteroids[i];
      }
    }
  }
  for(var j=0; j<asteroids.length; j++){
    var a = asteroids[j];
    if(a.isCorrect && a.waveId === state.waveId){
      return a;
    }
  }
  return null;
}

function findNextLookUpTargetId(b, skipId){
  var bestId = 0;
  var bestDy = Infinity;
  var bestDist = Infinity;
  for(var i=0; i<asteroids.length; i++){
    var a = asteroids[i];
    if(!a || a.noDamage || a.ghost) continue;
    if(skipId && a.id === skipId) continue;
    var dy = b.y - a.y;
    if(dy <= 6) continue;
    var dx = a.x - b.x;
    var dist = Math.hypot(dx, dy);
    if(dy < bestDy || (Math.abs(dy - bestDy) < 6 && dist < bestDist)){
      bestDy = dy;
      bestDist = dist;
      bestId = a.id;
    }
  }
  return bestId;
}

function getLookAheadTarget(){
  var r = canvas.getBoundingClientRect();
  var targetX = pickSpawnX(r.width);
  state.nextCorrectSpawnX = targetX;
  return { x: targetX, y: -40 };
}

function steerLookUpShot(b){
  if(b.lookAheadTarget){
    var tgt = b.lookAheadTarget;
    var dxA = tgt.x - b.x;
    var dyA = tgt.y - b.y;
    var distA = Math.max(1, Math.hypot(dxA, dyA));
    var spdA = b.speed || Math.hypot(b.vx || 0, b.vy || 0) || 800;
    b.speed = spdA;
    b.vx = (dxA / distA) * spdA;
    b.vy = (dyA / distA) * spdA;
    return;
  }
  if(!b.lookUpTargetId){
    b.lookUp = false;
    return;
  }
  var target = null;
  for(var i=0; i<asteroids.length; i++){
    if(asteroids[i].id === b.lookUpTargetId){
      target = asteroids[i];
      break;
    }
  }
  if(!target){
    b.lookUp = false;
    b.lookUpTargetId = 0;
    return;
  }
  var dx = target.x - b.x;
  var dy = target.y - b.y;
  var dist = Math.max(1, Math.hypot(dx, dy));
  var speed = b.speed || Math.hypot(b.vx || 0, b.vy || 0) || 800;
  b.speed = speed;
  b.vx = (dx / dist) * speed;
  b.vy = (dy / dist) * speed;
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
    showToast("RUNTIME ERROR - CHECK CONSOLE");
  }

  requestAnimationFrame(tick);
}

function update(dt){
  var dtReal = dt;
  var dtSlow = dtReal;
  bg.dt = dt;
  if(usePhaserRenderer && !tutorialActive && backgroundSprites[backgroundIndex] && backgroundReady[backgroundIndex]){
    var bgImg = backgroundSprites[backgroundIndex];
    var baseScale = Math.max(view.w / bgImg.width, view.h / bgImg.height);
    var scale = baseScale * backgroundScale;
    var drawH = Math.ceil(bgImg.height * scale) + 4;
    var maxScroll = Math.max(1, drawH - view.h);
    if(!state.paused && !screenshotMode){
      backgroundScroll = (backgroundScroll + 3.0 * dtReal) % maxScroll;
    }
  }
  if(state.over){
    setShipIdle(state, false);
    setShipAdvance(state, false);
    updateGameOverFx(dtReal);
    return;
  }
  if(!state.running || state.paused || screenshotMode){
    if(countdownActive){
      var settle = 1 - Math.exp(-6 * dtReal);
      player.x += (countdownTarget.x - player.x) * settle;
      player.y += (countdownTarget.y - player.y) * settle;
    }
    if(missionBriefShowing){
      player.hidden = true;
      state.hideAsteroids = true;
    }
    setShipIdle(state, false);
    setShipAdvance(state, false);
    return;
  }

  if(state.slowMoRemaining > 0){
    state.slowMoRemaining = Math.max(0, state.slowMoRemaining - dtReal);
    if(state.slowMoWaveDelay > 0){
      state.slowMoWaveDelay = Math.max(0, state.slowMoWaveDelay - dtReal);
      if(state.slowMoWaveDelay === 0 && !state.slowMoWaveActive){
        state.slowMoWaveActive = true;
        state.slowMoWaveY = view.h - 10;
      }
    }
    if(state.slowMoWaveActive){
      state.slowMoWaveY -= (state.slowMoWaveSpeed || 260) * dtReal;
      if(state.slowMoWaveY <= -80){
        state.slowMoWaveActive = false;
      }
    }else{
      dtSlow = dtReal * (state.slowMoScale || 0.42);
    }
  }else if(state.slowMoWaveActive){
    state.slowMoWaveActive = false;
  }
  if(state.empWaveActive){
    state.empWaveY -= (state.empWaveSpeed || 600) * dtReal;
    state.empWavePhase = (state.empWavePhase || 0) + dtReal * 6;
    if(state.empWaveY <= -120){
      state.empWaveActive = false;
    }
  }

  updateCamera(dtReal);
  updateDashGhosts(dtReal);
  if(tutorialActive){
    tutorialPortalT += dtReal;
    if(tutorialPortalActive){
      var rectP = canvas.getBoundingClientRect();
      var hudHP = document.getElementById("hud").getBoundingClientRect().height;
      tutorialPortalX = rectP.width / 2;
      tutorialPortalY = hudHP + 70;
      var dxPortal = player.x - tutorialPortalX;
      var dyPortal = player.y - tutorialPortalY;
      if(!tutorialPortalLock && Math.hypot(dxPortal, dyPortal) <= tutorialPortalR * 0.7){
        startTutorialPortalExit();
      }
    }
  }
  if(tutorialActive && tutorialStepId === "alien" && state.aliensShot === 0 && aliens.length === 0){
    tutorialAlienUnlocked = true;
    alienConfig.enabled = true;
    alienConfig.maxOnScreen = Math.max(alienConfig.maxOnScreen || 0, 1);
    spawnAlien("scout", "2 / 2", 1, view);
  }
  var alienEnabled = alienConfig.enabled;
  if(tutorialActive && !tutorialAlienUnlocked){
    alienConfig.enabled = false;
  }
  var alienReport = updateAliens(dtSlow, state, player, view, getAlienQuestion, asteroids);
  if(tutorialActive && !tutorialAlienUnlocked){
    alienConfig.enabled = alienEnabled;
  }
  if(alienReport.escaped){
    state.aliensEscaped += alienReport.escaped;
    state.streak = 0;
    syncHud();
    showToast("ALIEN ESCAPED");
  }

  if(state.timeLimitSec > 0){
    var elapsed = getElapsedSeconds();
    var remaining = state.timeLimitSec - elapsed;
    if(remaining <= 15 && remaining > 0 && !state.timerMark15Played){
      state.timerMark15Played = true;
      if(!tutorialActive) playSfx(state, "sec_15_mark");
    }
    if(elapsed >= state.timeLimitSec){
      endGame("time");
      return;
    }
  }
  if(missileInputActive){
    var remainingMs = missileInputDeadline - performance.now();
    var remainingSec = Math.max(0, remainingMs / 1000);
    if(missileTimerEl){
      missileTimerEl.textContent = remainingSec.toFixed(1) + "s";
    }
    if(remainingSec <= 0){
      closeMissileInput("MISSILE WINDOW EXPIRED");
    }
  }
  if(!tutorialActive){
    survivorTimer += dtReal;
    if(survivorTimer >= 45){
      survivorRewardReady = true;
    }
    if(survivorRewardReady){
      if(maybeSpawnEventPowerup(1.0)){
        resetSurvivorTimer();
      }
    }
  }

  var profile = getShipProfile(player.shipType);
  player.speed = profile.speed;
  var spinActive = false;
  if(player.spinManeuver && player.spinManeuver.active){
    var spin = player.spinManeuver;
    var targetX = spin.phase === 0 ? spin.x1 : (spin.phase === 1 ? spin.x2 : spin.x0);
    var targetY = spin.phase === 0 ? spin.y1 : (spin.phase === 1 ? spin.y2 : spin.y0);
    var settle = 1 - Math.exp(-8 * dtReal);
    player.x += (targetX - player.x) * settle;
    player.y += (targetY - player.y) * settle;
    if(Math.hypot(targetX - player.x, targetY - player.y) < 2){
      spawnRing(player.x, player.y, 18);
      spawnParticles(player.x, player.y, "spark");
      spin.phase += 1;
      if(spin.phase > 2){
        spin.active = false;
      }
    }
    spinActive = true;
  }

  var left  = keys.has("a") || keys.has("arrowleft");
  var right = keys.has("d") || keys.has("arrowright");
  var up    = keys.has("w") || keys.has("arrowup");
  var down  = keys.has("s") || keys.has("arrowdown");
  var inputX = (right ? 1 : 0) - (left ? 1 : 0);
  var inputY = (down ? 1 : 0) - (up ? 1 : 0);
  if(mousepadActive && (virtualAxes.x || virtualAxes.y)){
    inputX = clamp(inputX + virtualAxes.x, -1, 1);
    inputY = clamp(inputY + virtualAxes.y, -1, 1);
  }
  if(mousepadActive && mousepadMode === "hybrid"){
    var decay = Math.exp(-8 * dtReal);
    padCursor.x *= decay;
    padCursor.y *= decay;
    updateVirtualFromCursor();
  }
  if(tutorialActive && tutorialPortalLock){
    inputX = 0;
    inputY = 0;
  }
  var advanceIntent = up && !down;
  if(mousepadActive && inputY < -0.2){
    advanceIntent = true;
  }
  if(tutorialActive && tutorialPortalLock){
    advanceIntent = false;
    setShipAdvance(state, false);
    setShipIdle(state, false);
  }else if(advanceIntent){
    setShipAdvance(state, true);
    setShipIdle(state, false);
  }else{
    setShipAdvance(state, false);
    setShipIdle(state, true);
  }

  if(mousepadMode === "hybrid" && mousepadActive && !spinActive){
    var bankLerp = 1 - Math.exp(-10 * dtReal);
    player.bankHold += (inputX - player.bankHold) * bankLerp;
  }else{
    var bankThreshold = 0.2;
    var bankDir = inputX > bankThreshold ? 1 : (inputX < -bankThreshold ? -1 : 0);
    if(spinActive) bankDir = 0;
    if(bankDir !== 0){
      var accel = (player.bankHold * bankDir < 0) ? 4.2 : 2.2;
      player.bankHold = clamp(player.bankHold + bankDir * dtReal * accel, -1, 1);
    }else if(player.bankHold !== 0){
      var decay = 3.2;
      var sign = (player.bankHold > 0) ? 1 : -1;
      player.bankHold -= sign * decay * dtReal;
      if(player.bankHold * sign < 0) player.bankHold = 0;
    }
  }

  var inputMag = Math.min(1, Math.hypot(inputX, inputY));
  var dirX = inputMag > 0 ? (inputX / inputMag) : 0;
  var dirY = inputMag > 0 ? (inputY / inputMag) : 0;
  var targetSpeed = spinActive ? 0 : (player.speed * inputMag);
  if(state.collisionSlow > 0) targetSpeed *= 0.18;
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

  if(spinActive){
    player.vx = 0;
    player.vy = 0;
  }else{
    player.x += player.vx * dtReal;
    player.y += player.vy * dtReal;
  }

  player.x = clamp(player.x, player.w/2 + 10, r.width - player.w/2 - 10);
  player.y = clamp(player.y, topLimit + player.h/2 + 6, bottomLimit - player.h/2);
  if(tutorialRespawnActive){
    var targetY = tutorialRespawnTargetY || (view.h - 58);
    var settleRespawn = 1 - Math.exp(-6 * dtReal);
    player.y += (targetY - player.y) * settleRespawn;
    player.vx = 0;
    player.vy = 0;
    if(Math.abs(player.y - targetY) < 2){
      player.y = targetY;
      tutorialRespawnActive = false;
    }
  }
  if(tourGuide && tutorialActive){
    var dxMove = player.x - tutorialLastPos.x;
    var dyMove = player.y - tutorialLastPos.y;
    var moveDist = Math.abs(dxMove) + Math.abs(dyMove);
    if(moveDist > 1.5){
      if(Math.abs(dxMove) >= Math.abs(dyMove)){
        if(dxMove > 1.5) tourGuide.notify("move_right");
        if(dxMove < -1.5) tourGuide.notify("move_left");
      }else{
        if(dyMove > 1.5) tourGuide.notify("move_down");
        if(dyMove < -1.5) tourGuide.notify("move_up");
      }
      tourGuide.notify("move");
      tutorialLastPos.x = player.x;
      tutorialLastPos.y = player.y;
    }
  }
  if(tutorialActive){
    updateTutorialDots(dtReal);
  }
  if(mousepadMode === "hybrid" && mousepadActive && !spinActive && Math.abs(inputX) < 0.05){
    player.bankHold = clamp(player.vx / (player.speed || 1), -1, 1);
  }

  player.cooldown = Math.max(0, player.cooldown - dtReal);

  player.invuln = Math.max(0, player.invuln - dtReal);
  player.hitFlash = Math.max(0, player.hitFlash - dtReal*3.6);
  player.shipShake = Math.max(0, (player.shipShake || 0) - dtReal * 3.2);
  state.collisionSlow = Math.max(0, (state.collisionSlow || 0) - dtReal);
  if(player.teleportHide > 0){
    player.teleportHide = Math.max(0, player.teleportHide - dtReal);
  }
  if(player.teleportFx){
    player.teleportFx.t += dtReal;
    if(!player.teleportFx.reappearPlayed && player.teleportFx.t >= (player.teleportFx.hide || 0)){
      player.teleportFx.reappearPlayed = true;
      playSfx(state, "teleport_reappear");
    }
    if(player.teleportFx.locked){
      player.x = player.teleportFx.endX;
      player.y = player.teleportFx.endY;
    }
    var fxTotal = Math.max(player.teleportFx.ghostDur || 0, (player.teleportFx.hide || 0) + (player.teleportFx.zoomDur || 0));
    if(player.teleportFx.t >= fxTotal){
      player.teleportFx = null;
    }
  }
  if(player.fadeOutActive){
    player.fadeOutT += dtReal;
    var fadeDur = Math.max(0.001, player.fadeOutDur || 0);
    var fadeP = clamp(player.fadeOutT / fadeDur, 0, 1);
    var fadeEase = 1 - Math.pow(1 - fadeP, 2.2);
    player.fadeAlpha = Math.max(0, 1 - fadeEase);
    if(fadeP >= 1){
      player.fadeOutActive = false;
      player.fadeAlpha = 0;
      player.hidden = true;
      if(tutorialPortalNotifyPending){
        tutorialPortalNotifyPending = false;
        if(tourGuide) tourGuide.notify("portal");
      }
    }
  }

  player.recoil = Math.max(0, player.recoil - dtReal * 9);
  player.flash  = Math.max(0, player.flash  - dtReal * 12);
  if(player.secondaryCooldown > 0){
    player.secondaryCooldown = Math.max(0, player.secondaryCooldown - dtReal);
  }
  if(player.blasterMode !== "single" && (!(player.blasterHitsRemaining > 0))){
    resetShotType();
  }
  if(player.defenseMode === "armor"){
    if(!(player.armorBlocksRemaining > 0)){
      player.defenseMode = "none";
      player.defenseTimer = 0;
    }
  }else if(player.defenseTimer > 0){
    player.defenseTimer = Math.max(0, player.defenseTimer - dtReal);
    if(player.defenseTimer === 0) player.defenseMode = "none";
  }
  if(player.magnetTimer > 0){
    player.magnetTimer = Math.max(0, player.magnetTimer - dtReal);
  }
  if(player.lockTimer > 0){
    player.lockTimer = Math.max(0, player.lockTimer - dtReal);
    if(player.lockTimer === 0) player.lockTargetId = 0;
  }
  if(state.empTimer > 0){
    state.empTimer = Math.max(0, state.empTimer - dtReal);
  }
  if(state.empCascade && state.empCascade.length){
    state.empCascadeTimer -= dtReal;
    if(state.empCascadeTimer <= 0){
      var removed = false;
      while(state.empCascade.length){
        var target = state.empCascade.shift();
        var hitIndex = -1;
        for(var ti=asteroids.length-1; ti>=0; ti--){
          if(asteroids[ti].id === target.id){
            hitIndex = ti;
            break;
          }
        }
        if(hitIndex >= 0){
          var hitAst = asteroids[hitIndex];
          impactDebris(hitAst.x, hitAst.y);
          spawnParticles(hitAst.x, hitAst.y, "spark");
          spawnParticles(hitAst.x, hitAst.y, "smoke");
          playSfx(state, "impact_thud", 0.4);
          asteroids.splice(hitIndex, 1);
          removed = true;
          break;
        }
      }
      if(removed){
        var nextInterval = state.empCascadeInterval > 0 ? state.empCascadeInterval : 1.0;
        state.empCascadeTimer = nextInterval;
        state.empCascadeInterval = Math.max(0.15, nextInterval * 0.7);
      }else{
        state.empCascade = null;
        state.empCascadeTimer = 0;
      }
    }
  }

  if(keys.has("x")) secondaryFire();
  if(keys.has("c")) shockwave();
  if(state.flaresActive){
    state.flaresTimer = Math.max(0, state.flaresTimer - dtReal);
    state.flaresEmitTimer = (state.flaresEmitTimer || 0) - dtReal;
    if(state.flaresEmitTimer <= 0){
      state.flaresEmitTimer = 0.06;
      emitFlareStream();
    }
    if(state.flaresTimer === 0){
      state.flaresActive = false;
    }
  }
  if(player.dashCooldown > 0){
    player.dashCooldown = Math.max(0, player.dashCooldown - dtReal);
  }
  if(player.shockwaveCooldown > 0){
    player.shockwaveCooldown = Math.max(0, player.shockwaveCooldown - dtReal);
  }
  if(state.missileBufferTimer > 0){
    state.missileBufferTimer = Math.max(0, state.missileBufferTimer - dtReal);
    if(state.missileBufferTimer === 0){
      state.missileBuffer = "";
    }
  }

  state.spawnTimer -= dtSlow;
  if(!missionBriefShowing && (!tutorialActive || tutorialSpawnUnlocked)){
    if(state.spawnTimer <= 0){
      spawnOneFromWave();
      if(state.level >= 7 && Math.random() < 0.18) spawnDecoyOnly();
      state.spawnTimer = computeSpawnInterval(state);
    }
  }

  for(var bi=bullets.length-1; bi>=0; bi--){
    var b = bullets[bi];
    if(b.noHitTimer > 0){
      b.noHitTimer = Math.max(0, b.noHitTimer - dtReal);
      if(b.noHitTimer === 0){
        b.noHit = false;
      }
    }
    if(b.kind === "missile"){
      var target = null;
      if(b.targetId){
        for(var mi=0; mi<asteroids.length; mi++){
          if(asteroids[mi].id === b.targetId){
            target = asteroids[mi];
            break;
          }
        }
      }
      if(b.accelT == null) b.accelT = 0;
      b.accelT += dtReal;
      if(typeof b.accelDelay === "number" && b.accelT >= b.accelDelay){
        var accelDur = b.accelDuration || 0.6;
        var accelP = clamp((b.accelT - b.accelDelay) / Math.max(0.01, accelDur), 0, 1);
        var accelEase = 1 - Math.pow(1 - accelP, 2);
        var accelFrom = (typeof b.accelFrom === "number") ? b.accelFrom : (b.speed || 680);
        var accelTo = (typeof b.accelTo === "number") ? b.accelTo : 750;
        b.speed = accelFrom + (accelTo - accelFrom) * accelEase;
        b.boosted = accelP > 0.05;
      }else{
        b.boosted = false;
      }
      if(target){
        var mdx = target.x - b.x;
        var mdy = target.y - b.y;
        var mdist = Math.max(1, Math.hypot(mdx, mdy));
        var mspd = b.speed || 700;
        var vxT = (mdx / mdist) * mspd;
        var vyT = (mdy / mdist) * mspd;
        var avoidX = 0;
        var avoidY = 0;
        var avoidRadius = 90;
        for(var aiAvoid=0; aiAvoid<asteroids.length; aiAvoid++){
          var av = asteroids[aiAvoid];
          if(!av || av.id === b.targetId || av.ghost) continue;
          var dxA = b.x - av.x;
          var dyA = b.y - av.y;
          var distA = Math.hypot(dxA, dyA);
          if(distA > 0 && distA < avoidRadius){
            var strength = (1 - distA / avoidRadius) * 260;
            avoidX += (dxA / distA) * strength;
            avoidY += (dyA / distA) * strength;
          }
        }
        b.vx = (b.vx || 0) * 0.68 + (vxT + avoidX) * 0.32;
        b.vy = (b.vy || 0) * 0.68 + (vyT + avoidY) * 0.32;
      }
      b.rot = Math.atan2(b.vy || -1, b.vx || 0) + Math.PI / 2;
    }else if(b.kind === "pierce" && b.lookUp){
      steerLookUpShot(b);
    }else if(player.lockTimer > 0 && state.correctAsteroidId){
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
        b.vx += (dxT / distT) * spd * 0.6 * dtReal;
        b.vy += (dyT / distT) * spd * 0.6 * dtReal;
      }
    }
    b.y += b.vy * dtReal;
    if(b.vx) b.x += b.vx * dtReal;
    if(b.kind === "pierce"){
      b.spin = (typeof b.spin === "number") ? b.spin : 6;
      b.rot = (b.rot || 0) + b.spin * dtReal;
    }
    if(b.kind === "missile"){
      if(!b.trail) b.trail = [];
      b.trail.push({ x: b.x, y: b.y });
      var maxTrail = b.boosted ? 22 : 14;
      if(b.trail.length > maxTrail) b.trail.shift();
      if(b.y < -40 || b.y > view.h + 40 || b.x < -40 || b.x > view.w + 40){
        bullets.splice(bi,1);
      }
    }else if(b.y < -20){
      bullets.splice(bi,1);
    }
  }

  updateAlienBullets(dtSlow, view);

  updateParticles(dtReal);
  updateRings(dtReal);

  emitDamageSmoke(dtReal);

  for(var pi=powerups.length-1; pi>=0; pi--){
    var p = powerups[pi];
    if(p.popTimer != null && p.popTimer > 0){
      p.popTimer = Math.max(0, p.popTimer - dtReal);
    }
    p.y += p.vy * dtReal;
    if(p.rotSpeed != null){
      p.rot += p.rotSpeed * dtReal;
    }
    var dxp = p.x - player.x;
    var dyp = p.y - player.y;
    if(Math.hypot(dxp, dyp) < p.r + 18){
      state.powerupsCollected += 1;
      if(p.group === "offense"){
        playSfx(state, "shot_powerup");
      }else if(p.type === "repair"){
        playSfx(state, "hull_repair_pickup");
      }else if(p.type === "armor"){
        playSfx(state, "armor_pickup");
      }else if(p.type === "shield"){
        playSfx(state, "shield_pickup");
      }else{
        playSfx(state, "powerup_collected");
      }
      spawnPickupFx(player.x, player.y - 6);
      applyPowerup(p);
      if(tourGuide) tourGuide.notify("powerup");
      powerups.splice(pi,1);
      continue;
    }
    if(p.y - p.r > r.height + 40){
      state.powerupsMissed += 1;
      if(tutorialActive && tutorialStepId === "powerup"){
        spawnPowerup(p.type, p.group);
      }
      powerups.splice(pi,1);
    }
  }

  var tNow = performance.now() * 0.001;
  for(var ai=asteroids.length-1; ai>=0; ai--){
    var a = asteroids[ai];
    applyFlaresToAsteroid(a, dtReal);
    if(a.shakeTimer != null && a.shakeTimer > 0){
      a.shakeTimer = Math.max(0, a.shakeTimer - dtSlow);
    }
    if(player.magnetTimer > 0 && a.isCorrect && a.waveId === state.waveId){
      var targetX = player.x;
      var targetY = Math.max(view.hudH + 90, player.y - 140);
      var dxmA = targetX - a.x;
      var dymA = targetY - a.y;
      var distA = Math.max(1, Math.hypot(dxmA, dymA));
      var pullA = clamp(240 / distA, 0, 4.5);
      a.x += (dxmA / distA) * pullA * dtReal * 140;
      a.y += (dymA / distA) * pullA * dtReal * 140;
      if(a.vx != null) a.vx *= (1 - Math.min(1, dtReal * 2.2));
      if(a.vy != null) a.vy *= (1 - Math.min(1, dtReal * 1.8));
    }
    if(a.effectTimer != null){
      a.effectTimer -= dtSlow;
      if(a.effectTimer <= 0){
        if(a.effect === "impact"){
          finalizeAsteroidImpact(a);
        }else if(a.effect === "burn"){
          if(a.effectReason){
            finalizeAsteroidImpact(a);
          }
          spawnParticles(a.x, a.y, "smoke");
          spawnParticles(a.x, a.y, "spark");
        }else if(a.effect === "freeze"){
          if(a.effectReason){
            finalizeAsteroidImpact(a);
          }
          spawnParticles(a.x, a.y, "spark");
        }
        asteroids.splice(ai,1);
        continue;
      }
    }
    var empScale = state.empTimer > 0 ? 0.35 : 1;
    var slowFactor = 1;
    if(state.slowMoRemaining > 0 && state.slowMoWaveActive){
      slowFactor = (a.y >= state.slowMoWaveY) ? (state.slowMoScale || 0.42) : 1;
    }
    var dtAst = dtSlow * slowFactor;
    a.y += a.vy * dtAst * empScale;
    a.x += a.vx * dtAst;
    if(a.baseVy != null){
      a.vy += (a.baseVy - a.vy) * Math.min(1, dtAst * 0.55);
    }
    if(a.driftAmp){
      a.vx += Math.sin(a.driftPhase + tNow * a.driftRate) * a.driftAmp * dtAst;
    }
    a.vx *= (1 - Math.min(1, dtAst * 0.35));
    var bound = a.r + 8;
    if(a.x < bound){
      a.x = bound;
      a.vx = Math.abs(a.vx) * 0.6;
    }else if(a.x > r.width - bound){
      a.x = r.width - bound;
      a.vx = -Math.abs(a.vx) * 0.6;
    }
    a.rot = (a.rot || 0) + (a.spin || 0) * dtAst;
    if(a.isCorrect && a.waveId === state.waveId && !a.warned && a.y > r.height * 0.75){
      a.warned = true;
      if(!tutorialActive) warningClip = playSfx(state, "warning");
    }

    if(handleShipAsteroidCollision(a, player.x, player.y, false)){
      asteroids.splice(ai,1);
      if(state.over) return;
      continue;
    }

    if(a.y - a.r > r.height + 40){
      if(a.isCorrect && a.waveId === state.waveId){
        state.missed++;
        state.correctInPlay = false;
        state.correctAsteroidId = 0;
        waveHadWrongHit = true;
        cleanWaveStreak = 0;
        if(a.hiddenPowerup){
          hiddenPowerupActive = false;
          answerHitsSincePowerup = 0;
        }
        recordFactMiss(state.a, state.b);
        state.streak = 0;
        state.ddSpeedBonus = clamp(state.ddSpeedBonus - 0.02, 0, 0.35);
        syncHud();
        playSfx(state, "missed_answer");
        loseLife("CORRECT ANSWER ESCAPED");
        retireWave(state.waveId);
        if(state.lives > 0){
          if(isDigitMode() && state.redemptionEnabled && !state.redemptionUsed){
            state.redemptionUsed = true;
            state.waveId++;
            prepareWave();
          }else{
            state.questionsCompleted++;
            if(shouldEndByQuestionLimit()){
              endGame("questions");
              return;
            }
            nextProblem();
          }
        }
      }
      asteroids.splice(ai,1);
    }
  }

  resolveAsteroidCollisions();

  function applyBulletImpactAsteroid(ast, bullet){
    if(!ast || ast.noDamage) return;
    var kind = bullet.kind || "single";
    var profile = {
      single:  { push: 0.7, spin: 0.04, slow: 0.9, shake: 2.6 },
      laser:   { push: 1.25, spin: 0.12, slow: 0.72, shake: 4.2 },
      rail:    { push: 1.35, spin: 0.13, slow: 0.68, shake: 4.4 },
      fire:    { push: 1.05, spin: 0.08, slow: 0.8, shake: 3.6 },
      ice:     { push: 0.95, spin: 0.06, slow: 0.62, shake: 3.4 },
      electric:{ push: 0.9, spin: 0.1, slow: 0.82, shake: 3.8 },
      plasma:  { push: 1.15, spin: 0.11, slow: 0.75, shake: 4.0 },
      missile: { push: 1.4, spin: 0.15, slow: 0.7, shake: 4.8 },
      pierce:  { push: 0.95, spin: 0.08, slow: 0.86, shake: 3.2 }
    }[kind] || { push: 0.9, spin: 0.08, slow: 0.85, shake: 3.0 };

    var bvx = (typeof bullet.vx === "number") ? bullet.vx : 0;
    var bvy = (typeof bullet.vy === "number") ? bullet.vy : -800;
    var speed = Math.hypot(bvx, bvy);
    var nx = speed ? (bvx / speed) : 0;
    var ny = speed ? (bvy / speed) : -1;
    var basePush = Math.min(200, 40 + (bullet.r || 4) * 14);
    var push = basePush * profile.push;
    ast.vx = (ast.vx || 0) + nx * push * 0.16;
    ast.vy = (ast.vy || 0) + ny * push * 0.16;
    ast.vx *= profile.slow;
    ast.vy *= profile.slow;
    ast.spin = (ast.spin || 0) + (nx * -profile.spin) + ((Math.random() - 0.5) * 0.03);
    ast.shakeTimer = 0.16;
    ast.shakeDur = 0.16;
    ast.shakeAmp = Math.max(ast.shakeAmp || 0, profile.shake);
  }

  function scheduleAsteroidImpactRemoval(ast, kind, reason, meta){
    if(!ast) return;
    var delays = {
      single: 0.08,
      laser: 0.14,
      rail: 0.16,
      fire: 0.12,
      ice: 0.14,
      electric: 0.12,
      plasma: 0.16,
      missile: 0.18,
      pierce: 0.1
    };
    var delay = delays[kind] || 0.1;
    ast.effect = "impact";
    ast.effectTimer = delay;
    ast.effectDuration = delay;
    ast.effectMeta = Object.assign({ kind: kind, reason: reason }, meta || {});
    ast.noDamage = true;
  }

  function finalizeAsteroidImpact(ast){
    if(!ast) return;
    var meta = ast.effectMeta || {};
    var reason = meta.reason || ast.effectReason;
    if(reason === "correct"){
      impactCorrect(ast.x, ast.y, ast.r);
    }else if(reason === "wrong"){
      impactWrong(ast.x, ast.y);
    }else{
      impactDebris(ast.x, ast.y);
    }
    if(meta.split){
      spawnSplitAsteroids(ast);
    }
    if(meta.chain){
      chainDestroy(ast, meta.chain.radius, meta.chain.maxTargets);
    }
    ast.effectMeta = null;
  }

  var stopHits = false;
  var clearedWaveId = null;
  for(var ai2=asteroids.length-1; ai2>=0; ai2--){
    var a2 = asteroids[ai2];
    if(a2.hit) continue;

    for(var bj=bullets.length-1; bj>=0; bj--){
      var bb = bullets[bj];
      if(bb.noHit) continue;
      var ddx = a2.x - bb.x;
      var ddy = a2.y - bb.y;
        if(ddx*ddx + ddy*ddy <= (a2.r + bb.r) * (a2.r + bb.r)){
          var kind = bb.kind || "single";
          var lookUpActivated = false;
          if(kind === "pierce"){
            bb.spin = (bb.spin || 6) + 2.5;
            if(!bb.lookUpUsed){
              bb.lookUpUsed = true;
              bb.lookUpTargetId = 0;
              bb.lookAheadTarget = getLookAheadTarget();
              bb.lookUp = true;
              lookUpActivated = true;
              bb.noHit = true;
              bb.noHitTimer = -1;
              steerLookUpShot(bb);
            }
          }else if(bb.pierce && bb.pierce > 0){
            bb.pierce -= 1;
          }else{
            bullets.splice(bj,1);
          }
        var hitAst = a2;
        var hitIndex = ai2;
        if(kind === "electric" || kind === "plasma" || kind === "rail"){
          if(state.correctInPlay){
            var correctAst = null;
            if(state.correctAsteroidId){
              for(var ci=0; ci<asteroids.length; ci++){
                if(asteroids[ci].id === state.correctAsteroidId){
                  correctAst = asteroids[ci];
                  break;
                }
              }
            }
            if(!correctAst){
              for(var ci2=0; ci2<asteroids.length; ci2++){
                var cand = asteroids[ci2];
                if(cand.isCorrect && cand.waveId === state.waveId){
                  correctAst = cand;
                  break;
                }
              }
            }
            if(correctAst && correctAst !== a2){
              var dxC = correctAst.x - bb.x;
              var dyC = correctAst.y - bb.y;
              var rC = correctAst.r + bb.r;
              if(dxC*dxC + dyC*dyC <= rC * rC){
                var foundIndex = asteroids.indexOf(correctAst);
                if(foundIndex >= 0){
                  hitAst = correctAst;
                  hitIndex = foundIndex;
                }
              }
            }
          }
        }
        applyBulletImpactAsteroid(hitAst, bb);
        hitAst.hit = true;

        if(hitAst.isCorrect && isDigitMode() && hitAst.hitsRemaining && hitAst.hitsRemaining > 1){
          var totalHits = hitAst.hitsTotal || hitAst.hitsRemaining;
          var doneHits = totalHits - hitAst.hitsRemaining + 1;
          hitAst.hitsRemaining -= 1;
          hitAst.hit = false;
          hitAst.shakeTimer = 0.18;
          hitAst.shakeDur = 0.18;
          hitAst.shakeAmp = 3.8;
          impactDebris(hitAst.x, hitAst.y);
          var thud = playSfx(state, "impact_thud", 0.35);
          if(thud){
            thud.playbackRate = 1 + Math.min(0.5, doneHits * 0.05);
          }
          if(kind === "pierce" && bb.lookUp && !lookUpActivated){
            bb.lookUp = false;
            bb.lookUpTargetId = 0;
          }
          break;
        }

        if(hitAst.ghost || hitAst.label === null){
          state.score += 2;
          playSfx(state, "impact_thud", 0.4);
          scheduleAsteroidImpactRemoval(hitAst, kind, "debris");
          break;
        }

        var wasCorrect = hitAst.isCorrect && hitAst.waveId === state.waveId;
        if(wasCorrect){
          var wid = state.waveId;
          state.correctInPlay = false;
          state.correctAsteroidId = 0;
          retireWave(wid);
          bestStreak = Math.max(bestStreak, state.streak + 1);
          onCorrectHit(hitAst);
          stopHits = true;
          clearedWaveId = wid;
        }else{
          recordFactMiss(state.a, state.b);
          onWrongHit();
        }

        var impactReason = wasCorrect ? "correct" : "wrong";

        if(kind === "fire"){
          markAsteroidEffect(hitAst, "burn", 1.6);
          hitAst.effectReason = impactReason;
          hitAst.noDamage = true;
        }else if(kind === "ice"){
          markAsteroidEffect(hitAst, "freeze", 1.1);
          hitAst.effectReason = impactReason;
          hitAst.noDamage = true;
        }else if(kind === "laser"){
          scheduleAsteroidImpactRemoval(hitAst, kind, impactReason, { split: true });
        }else if(kind === "electric"){
          scheduleAsteroidImpactRemoval(hitAst, kind, impactReason, { chain: { radius: 140, maxTargets: 3 } });
        }else if(kind === "plasma"){
          scheduleAsteroidImpactRemoval(hitAst, kind, impactReason, { chain: { radius: 180, maxTargets: 4 } });
        }else if(kind === "rail"){
          scheduleAsteroidImpactRemoval(hitAst, kind, impactReason, { chain: { radius: 160, maxTargets: 2 } });
        }else{
          scheduleAsteroidImpactRemoval(hitAst, kind, impactReason);
        }
        if(clearedWaveId !== null && isDigitMode()){
          clearWaveAsteroids(clearedWaveId);
          clearedWaveId = null;
        }
        if(kind === "pierce" && bb.lookUp && !lookUpActivated){
          bb.lookUp = false;
          bb.lookUpTargetId = 0;
        }
        break;
      }
    }
    if(stopHits) break;
  }

  for(var ai3=aliens.length-1; ai3>=0; ai3--){
    var al = aliens[ai3];
    for(var bj2=bullets.length-1; bj2>=0; bj2--){
      var bb2 = bullets[bj2];
      if(bb2.noHit) continue;
      var dxA = al.x - bb2.x;
      var dyA = al.y - bb2.y;
    if(dxA*dxA + dyA*dyA <= (al.r + bb2.r) * (al.r + bb2.r)){
      if(bb2.pierce && bb2.pierce > 0){
        bb2.pierce -= 1;
      }else{
        bullets.splice(bj2,1);
      }
      al.hitShake = 0.75;
      al.stunTimer = Math.max(al.stunTimer || 0, 0.4);
      al.hitsTaken += 1;
        if(al.hitsTaken >= al.answer){
          state.aliensShot += 1;
          state.score += al.score;
          impactDebris(al.x, al.y);
          playSfx(state, "alien_kill", 0.65);
          if(tourGuide) tourGuide.notify("alien");
          aliens.splice(ai3, 1);
          if(tutorialActive){
            alienConfig.enabled = false;
            alienConfig.maxOnScreen = 0;
          }
          showToast("ALIEN CLEARED");
          maybeSpawnEventPowerup(0.40, al.x, al.y);
          break;
        }
      }
    }
  }

  for(var ac=aliens.length-1; ac>=0; ac--){
    var al2 = aliens[ac];
    var dxC = al2.x - player.x;
    var dyC = al2.y - (player.y - 4);
    if(dxC*dxC + dyC*dyC < (al2.r + 18) * (al2.r + 18)){
      if(player.invuln <= 0){
        registerShotTypeHit(2, true);
        resetSurvivorTimer();
        state.alienCollisions += 1;
        kickShake(18, 0.16);
        state.collisionSlow = Math.max(state.collisionSlow || 0, 1.0);
        player.shipShake = Math.max(player.shipShake || 0, 1.0);
        var distC = Math.max(1, Math.hypot(dxC, dyC));
        var knockBackAlien = 0.75;
        player.vx = (-dxC / distC) * player.speed * knockBackAlien;
        player.vy = (-dyC / distC) * player.speed * knockBackAlien;
        var dmgHit = 0.45;
        if(player.defenseMode === "armor") dmgHit = 0;
        if(player.defenseMode === "shield"){
          impactDebris(player.x, player.y - 8);
          playSfx(state, "impact", 0.4);
          player.hitFlash = 1;
          player.shipShake = Math.max(player.shipShake || 0, 0.26);
          player.invuln = 0.45;
          state.streak = 0;
          syncHud();
          showToast("SHIELD BLOCK");
        }else if(player.defenseMode === "armor"){
          impactShipHit(player.x, player.y - 10);
          playSfx(state, "impact_thud", 0.45);
          player.hitFlash = 1;
          player.shipShake = Math.max(player.shipShake || 0, 0.34);
          player.invuln = 0.45;
          state.streak = 0;
          syncHud();
          showToast("ARMOR ABSORB");
          consumeArmorBlock();
        }else{
          impactShipHit(player.x, player.y - 10);
          playSfx(state, "crash", 0.6);
          player.hitFlash = 1;
          player.shipShake = Math.max(player.shipShake || 0, 0.34);
          player.invuln = 0.55;
          player.hull = clamp(player.hull - dmgHit, 0, 1);
          state.streak = 0;
          if(player.hull <= 0 && tutorialActive){
            player.hull = Math.max(player.hull, 0.12);
            syncHud();
            triggerTutorialRecovery("HULL CRITICAL");
            return;
          }
          if(consumeShipLife("OUT OF LIVES (ALIEN COLLISION)")) return;
          if(player.hull <= 0){
            player.hull = 0;
            syncHud();
            state.endReasonDetail = "HULL DEPLETED (ALIEN COLLISION)";
            endGame("destroyed");
            return;
          }else{
            playSfx(state, "ship_damaged");
            showToast("ALIEN COLLISION");
          }
        }
      }
      var distC = Math.max(1, Math.hypot(dxC, dyC));
      al2.x += (dxC / distC) * 24;
      al2.y += (dyC / distC) * 24;
      al2.hitShake = Math.max(al2.hitShake || 0, 0.75);
    }
  }

  for(var ab=alienBullets.length-1; ab>=0; ab--){
    var abul = alienBullets[ab];
    var dxp = abul.x - player.x;
    var dyp = abul.y - (player.y - 4);
    if(dxp*dxp + dyp*dyp < (abul.r + 16) * (abul.r + 16)){
      alienBullets.splice(ab, 1);
      if(player.invuln <= 0){
        registerShotTypeHit(1, false);
        resetSurvivorTimer();
        state.alienShotsHit += 1;
        kickShake(12, 0.12);
        state.collisionSlow = Math.max(state.collisionSlow || 0, 1.0);
        player.shipShake = Math.max(player.shipShake || 0, 1.0);
        var distP = Math.max(1, Math.hypot(dxp, dyp));
        var knockBackBullet = 0.5;
        player.vx = (-dxp / distP) * player.speed * knockBackBullet;
        player.vy = (-dyp / distP) * player.speed * knockBackBullet;
        var dmgHit = 0.35;
        if(player.defenseMode === "armor") dmgHit = 0;
        if(player.defenseMode === "shield"){
          impactDebris(player.x, player.y - 8);
          playSfx(state, "impact", 0.35);
          player.hitFlash = 1;
          player.shipShake = Math.max(player.shipShake || 0, 0.2);
          player.invuln = 0.35;
          state.streak = 0;
          syncHud();
          showToast("SHIELD BLOCK");
        }else if(player.defenseMode === "armor"){
          impactShipHit(player.x, player.y - 10);
          playSfx(state, "impact_thud", 0.45);
          player.hitFlash = 1;
          player.shipShake = Math.max(player.shipShake || 0, 0.28);
          player.invuln = 0.35;
          state.streak = 0;
          syncHud();
          showToast("ARMOR ABSORB");
          consumeArmorBlock();
        }else{
          impactShipHit(player.x, player.y - 10);
          playSfx(state, "crash", 0.45);
          player.hitFlash = 1;
          player.shipShake = Math.max(player.shipShake || 0, 0.28);
          player.invuln = 0.45;
          player.hull = clamp(player.hull - dmgHit, 0, 1);
          state.streak = 0;
          if(player.hull <= 0 && tutorialActive){
            player.hull = Math.max(player.hull, 0.12);
            syncHud();
            triggerTutorialRecovery("HULL CRITICAL");
            return;
          }
          if(consumeShipLife("OUT OF LIVES (ALIEN SHOT)")) return;
          if(player.hull <= 0){
            player.hull = 0;
            syncHud();
            state.endReasonDetail = "HULL DEPLETED (ALIEN SHOT)";
            endGame("destroyed");
            return;
          }else{
            playSfx(state, "ship_damaged");
            showToast("HULL DAMAGED");
          }
        }
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
  if(missionClearFx.active){
    missionClearFx.t += dt;
    updateCamera(dt);
    updateParticles(dt);
    updateRings(dt);

    if(missionClearFx.phase === "center"){
      var targetX = view.w * 0.5;
      var targetY = view.h * 0.52;
      var settle = 1 - Math.exp(-4.5 * dt);
      player.x += (targetX - player.x) * settle;
      player.y += (targetY - player.y) * settle;
      if(Math.hypot(targetX - player.x, targetY - player.y) < 2){
        if(missionClearFx.mode === "time"){
          missionClearFx.phase = "exit";
          missionClearFx.exitSpeed = 140;
        }else{
          missionClearFx.phase = "explode";
          missionClearFx.explodeTimer = 0.05;
        }
      }
    }else if(missionClearFx.phase === "explode"){
      missionClearFx.explodeTimer -= dt;
      if(missionClearFx.explodeTimer <= 0){
        if(asteroids.length > 0){
          var a = asteroids.pop();
          if(a){
            spawnRing(a.x, a.y, Math.max(18, a.r + 6));
            spawnParticles(a.x, a.y, "spark");
            spawnParticles(a.x, a.y, "smoke");
          }
          missionClearFx.explodeTimer = 0.12;
        }else{
          if(!missionClearFx.sfxPlayed){
            missionClearFx.sfxClip = playSfx(state, "mission_cleared1");
            missionClearFx.sfxPlayed = true;
          }
          missionClearFx.phase = "exit";
          missionClearFx.exitSpeed = 140;
        }
      }
    }else if(missionClearFx.phase === "exit"){
      missionClearFx.exitSpeed += 620 * dt;
      player.y -= missionClearFx.exitSpeed * dt;
      if(player.y + player.h < -40){
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

  if(!gameOverFx.active) return;
  gameOverFx.t += dt;
  updateCamera(dt);
  updateParticles(dt);
  updateRings(dt);

  if(!gameOverFx.shown && gameOverFx.t > 2.6){
    showEndOverlay();
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
  var phaserActive = !!(usePhaserRenderer && phaserRenderer && phaserRenderer.ready && phaserRenderer.ready());
  if(phaserActive && phaserRenderer.sync){
    phaserRenderer.sync({
      view: view,
      state: state,
      tutorialActive: tutorialActive,
      backgroundIndex: backgroundIndex,
      backgroundScroll: backgroundScroll,
      backgroundScale: backgroundScale,
      hideAsteroids: state.hideAsteroids,
      asteroids: asteroids,
      bullets: bullets,
      powerups: powerups,
      aliens: aliens,
      alienBullets: alienBullets
    });
  }

  ctx.clearRect(0,0,w,h);
  if(!phaserActive && !tutorialActive && backgroundSprites[backgroundIndex] && backgroundReady[backgroundIndex]){
    var bgImg = backgroundSprites[backgroundIndex];
    var baseScale = Math.max(w / bgImg.width, h / bgImg.height);
    var scale = baseScale * backgroundScale;
    var drawW = Math.ceil(bgImg.width * scale) + 4;
    var drawH = Math.ceil(bgImg.height * scale) + 4;
    var maxScroll = Math.max(1, drawH - h);
    if(!state.paused && !screenshotMode){
      backgroundScroll = (backgroundScroll + 3.0 * (bg.dt || (1/60))) % maxScroll;
    }
    var offX = Math.floor((w - drawW) / 2);
    var offY = Math.floor((h - drawH) + backgroundScroll + 160);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(bgImg, offX, offY, drawW, drawH);
    ctx.restore();
  }else if(!phaserActive && !tutorialActive && SHOW_STARS){
    drawStars(w,h);
  }

  if(state.paused && state.running){
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(0,0,w,h);
  }

  updateTimerHud();

  drawEmpWave();
  drawSlowMoWave();

  if(introActive){
    return;
  }

  ctx.save();
  ctx.translate(cam.x || 0, cam.y || 0);

  drawTutorialPortal();
  if(!phaserActive){
    if(!state.hideAsteroids){
      for(var i=0;i<asteroids.length;i++) drawAsteroid(asteroids[i]);
      drawAliens(ctx);
      drawPowerups();
      drawAlienBullets(ctx);
      drawBullets();
    }
  }
  drawRings();
  drawParticles();
  drawDashGhosts();
  drawTutorialDots();

  if(!state.hideAsteroids){
    drawShip();
  }

  ctx.restore();

  if(gameOverFx.active && gameOverFx.reason === "destroyed"){
    ctx.save();
    var t = gameOverFx.t;
    var alphaIn = clamp((t - 0.3) / 0.5, 0, 1);
    var alphaOut = clamp(1 - (t - 2.0) / 0.5, 0, 1);
    var alpha = Math.min(alphaIn, alphaOut);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(255,77,109,.92)";
    ctx.font = "700 " + Math.max(28, Math.min(64, w * 0.06)) + "px Oxanium, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(255,77,109,.35)";
    ctx.shadowBlur = 12;
    ctx.fillText("MISSION FAILED", w/2, h/2 - 12);
    ctx.restore();
  }

  if(gameOverFx.active && gameOverFx.reason === "cleared"){
    ctx.save();
    var t2 = gameOverFx.t;
    var alphaIn2 = clamp((t2 - 0.3) / 0.5, 0, 1);
    var alphaOut2 = clamp(1 - (t2 - 2.0) / 0.5, 0, 1);
    var alpha2 = Math.min(alphaIn2, alphaOut2);
    ctx.globalAlpha = alpha2;
    ctx.fillStyle = "rgba(0,229,255,.92)";
    ctx.font = "700 " + Math.max(28, Math.min(64, w * 0.06)) + "px Oxanium, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,229,255,.35)";
    ctx.shadowBlur = 12;
    ctx.fillText("MISSION CLEARED", w/2, h/2 - 12);
    ctx.restore();
  }

  if(gameOverFx.active && gameOverFx.reason === "time"){
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
    ctx.fillText("TIME'S UP", w/2, h/2 - 12);
    ctx.restore();
  }

  if(!state.over){
    if(introActive){
      return;
    }
    var hudFade = 1;
    if(countdownActive){
      var elapsedHud = Math.max(0, (performance.now() - countdownStartAt) / 1000);
      var durHud = countdownDurationSec || 2.4;
      hudFade = clamp(elapsedHud / durHud, 0, 1);
    }else if(introHudHold){
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
    var op = isAdditionMode() ? "+" : "x";
    var questionTop = view.hudH + 14;
    var qRaw = getQuestionRawText();
    var qParsed = parseRepeatingText(qRaw);
    var qDisplay = qParsed.display;
    if(!(tutorialActive && tutorialHideQuestion) && !missionBriefShowing){
      ctx.fillText(qDisplay, w/2, questionTop);
      if(qParsed.repeatStart >= 0 && qParsed.repeatLen > 0){
        var qWidth = ctx.measureText(qDisplay).width;
        var qLeft = w/2 - qWidth / 2;
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

      if(isDigitMode()){
        var aStr = String(state.a);
        var totalDigits = aStr.length;
        var progress = (state.answerDigits && state.answerDigits.length)
          ? (state.answerDigits.length - Math.max(0, state.digitsLeft))
          : 0;
        var digitIndex = Math.max(0, Math.min(totalDigits - 1, (totalDigits - 1) - progress));
        var qW = ctx.measureText(qDisplay).width;
        var qStart = w/2 - qW / 2;
        var prefixW = ctx.measureText(aStr.slice(0, digitIndex)).width;
        var digitW = ctx.measureText(aStr.charAt(digitIndex)).width || (size * 0.45);
        var arrowX = qStart + prefixW + digitW / 2;
        var arrowY = questionTop + size * 0.9;
        var arrowW = Math.max(8, size * 0.22);
        var arrowH = Math.max(6, size * 0.16);
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY + arrowH);
        ctx.lineTo(arrowX - arrowW / 2, arrowY);
        ctx.lineTo(arrowX + arrowW / 2, arrowY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    var barX = 96;
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
    if(state.timeLimitSec > 0){
      var elapsedProg = getElapsedSeconds();
      var remainingProg = Math.max(0, state.timeLimitSec - elapsedProg);
      var timeRatio = clamp(remainingProg / state.timeLimitSec, 0, 1);
      var fillColor = "rgba(0,169,255,.9)";
      var glowColor = "rgba(0,169,255,.35)";
      if(remainingProg <= 15){
        var pulse = 0.65 + 0.35 * Math.sin(performance.now() * 0.02);
        fillColor = "rgba(255,80,80," + (0.7 + 0.2 * pulse).toFixed(2) + ")";
        glowColor = "rgba(255,80,80," + (0.4 + 0.35 * pulse).toFixed(2) + ")";
      }else if(remainingProg <= 30){
        fillColor = "rgba(255,180,60,.92)";
        glowColor = "rgba(255,180,60,.35)";
      }
      hudBars.push({
        label: "TIMER",
        ratio: timeRatio,
        fill: fillColor,
        glow: glowColor
      });
    }
    var targetCount = state.questionLimit || 0;
    if(!targetCount && state.targetMode && state.targetMode.charAt(0) === "q"){
      var parsedTargets = parseInt(state.targetMode.slice(1), 10);
      if(!Number.isNaN(parsedTargets) && parsedTargets > 0) targetCount = parsedTargets;
    }
    if(targetCount > 0){
      hudBars.push({
        label: "PROGRESS",
        ratio: clamp(state.questionsCompleted / targetCount, 0, 1),
        fill: "rgba(210,210,210,.92)",
        glow: "rgba(255,255,255,.25)"
      });
    }
    if(hudBars.length){
      for(var bi=0; bi<hudBars.length; bi++){
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

    var maxLives = Math.max(0, state.livesStart || 0);
    if(maxLives > 0){
      var livesLeft = Math.max(0, Math.min(state.lives || 0, maxLives));
      var lifeGap = 4;
      var lifeH = 6;
      var availableW = barW - lifeGap * (maxLives - 1);
      var lifeW = Math.max(6, Math.floor(availableW / maxLives));
      if(lifeW > 18) lifeW = 18;
      var totalW = lifeW * maxLives + lifeGap * (maxLives - 1);
      if(totalW > barW){
        lifeW = Math.max(5, Math.floor((barW - lifeGap * (maxLives - 1)) / maxLives));
      }
      var lifeY = barY + hudBars.length * (barH + barGap) + 6;
      ctx.save();
      ctx.fillStyle = labelColor;
      ctx.font = labelStyle;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("LIVES", barX - 8, lifeY + lifeH / 2);
      for(var li=0; li<maxLives; li++){
        var lx = barX + li * (lifeW + lifeGap);
        var isActive = li < livesLeft;
        ctx.fillStyle = isActive ? "rgba(255,80,80,.9)" : "rgba(255,80,80,.2)";
        ctx.fillRect(lx, lifeY, lifeW, lifeH);
        ctx.strokeStyle = "rgba(255,120,120,.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(lx, lifeY, lifeW, lifeH);
      }
      ctx.restore();
    }

    var profile = getShipProfile(player.shipType);
    var dashLeft = Math.max(0, player.dashCooldown || 0);
    var shockLeft = Math.max(0, player.shockwaveCooldown || 0);
    var dashMax = profile.dashCooldown || 1.3;
    var shockMax = profile.shockwaveCooldown || 3.5;
    var dashFrac = clamp(1 - (dashLeft / dashMax), 0, 1);
    var shockFrac = clamp(1 - (shockLeft / shockMax), 0, 1);
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
    ctx.arc(leftX, cy, radius, -Math.PI/2, -Math.PI/2 + dashFrac * Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightX, cy, radius, -Math.PI/2, -Math.PI/2 + shockFrac * Math.PI * 2);
    ctx.stroke();

    var iconSize = radius * 1.45;
    var iconY = cy - iconSize / 2;
    var dashIcon = cooldownIcons.dash;
    if(dashIcon && dashIcon.ready){
      ctx.globalAlpha = 0.9 * hudFade;
      ctx.drawImage(dashIcon.img, leftX - iconSize / 2, iconY, iconSize, iconSize);
    }
    var abilityKey = "shockwave";
    if(profile.ability === "flares") abilityKey = "flares";
    else if(profile.ability === "spin") abilityKey = "teleport";
    var abilityIcon = cooldownIcons[abilityKey];
    if(abilityIcon && abilityIcon.ready){
      ctx.globalAlpha = 0.9 * hudFade;
      ctx.drawImage(abilityIcon.img, rightX - iconSize / 2, iconY, iconSize, iconSize);
    }
    if(player.secondaryMode === "time" && player.secondaryCharges > 0){
      var badgeSize = Math.max(16, radius * 0.9);
      var badgeX = (leftX + rightX) / 2;
      var badgeY = cy + radius + 16;
      drawTimeDilationBadge(badgeX, badgeY, badgeSize, 0.95 * hudFade);
      ctx.save();
      ctx.globalAlpha = 0.85 * hudFade;
      ctx.fillStyle = "rgba(232,236,255,.85)";
      ctx.font = "700 10px Oxanium, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("X", badgeX, badgeY + badgeSize * 0.55);
      ctx.restore();
    }
    drawActivePickupHud(hudFade, rightX, cy, radius, w);
    ctx.restore();
    ctx.restore();
  }

  if(state.paused && state.running){
    ctx.save();
    ctx.fillStyle = "rgba(232,236,255,.92)";
    ctx.font = "700 20px Oxanium, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", w/2, h/2 - 6);
    ctx.font = "600 14px Oxanium, sans-serif";
    ctx.fillStyle = "rgba(232,236,255,.72)";
    ctx.fillText("PRESS P TO RESUME", w/2, h/2 + 18);
    ctx.restore();
  }

  if(screenshotMode && state.running){
    ctx.save();
    ctx.fillStyle = "rgba(232,236,255,.55)";
    ctx.font = "600 12px Oxanium, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("SCREENSHOT MODE (0)", w - 12, h - 10);
    ctx.restore();
  }
}

function drawTimeDilationBadge(cx, cy, size, alpha){
  var r = size * 0.5;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(0,229,255,.2)";
  ctx.strokeStyle = "rgba(255,255,255,.8)";
  ctx.lineWidth = Math.max(1.4, size * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.9)";
  ctx.lineWidth = Math.max(1.2, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 0.45);
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.35, r * 0.18);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.2, size * 0.06), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHudPickupIcon(entry, cx, cy, size){
  var type = entry.type;
  var group = entry.group;
  var icon = group === "offense" ? shotIcons[type] : powerupIcons[type];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.4, size * 0.08);
  ctx.strokeStyle = "rgba(255,255,255,.85)";
  ctx.fillStyle = getPowerupColor({ type: type, group: group });
  if(icon && icon.ready){
    var iw = icon.img.naturalWidth || icon.img.width || size;
    var ih = icon.img.naturalHeight || icon.img.height || size;
    var scale = size / Math.max(1, Math.max(iw, ih));
    var drawW = iw * scale;
    var drawH = ih * scale;
    ctx.drawImage(icon.img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    return;
  }

  var base = 28;
  var scaleShape = size / base;
  ctx.scale(scaleShape, scaleShape);

  if(group === "secondary"){
    if(type === "repair"){
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 5);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if(type === "magnet"){
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(-8, 2);
      ctx.arc(0, 2, 8, Math.PI, 0, false);
      ctx.lineTo(8, -8);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(-11, -12, 6, 6);
      ctx.rect(5, -12, 6, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
    if(type === "time"){
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -6);
      ctx.moveTo(0, 0);
      ctx.lineTo(4, 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.beginPath();
      ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if(type === "emp"){
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(2, -2);
      ctx.lineTo(-2, 4);
      ctx.lineTo(6, 10);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if(type === "lock"){
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
      ctx.stroke();
      ctx.restore();
      return;
    }
  }

  if(group === "defense"){
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if(group === "offense"){
    if(type === "ice"){
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(6, 10);
      ctx.lineTo(-6, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
    if(type === "laser" || type === "rail"){
      ctx.beginPath();
      ctx.rect(-3, -14, 6, 28);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
    if(type === "missile"){
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(6, -2);
      ctx.lineTo(2, 12);
      ctx.lineTo(-2, 12);
      ctx.lineTo(-6, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }
    if(type === "fire"){
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
      ctx.restore();
      return;
    }
    if(type === "electric"){
      ctx.beginPath();
      ctx.moveTo(-6, -12);
      ctx.lineTo(2, -4);
      ctx.lineTo(-2, 2);
      ctx.lineTo(6, 12);
      ctx.stroke();
      ctx.restore();
      return;
    }
    if(type === "pierce"){
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 14);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
      return;
    }
    if(type === "plasma"){
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
      return;
    }
  }

  ctx.restore();
}

function drawActivePickupHud(hudFade, rightX, cy, radius, w){
  var entries = [];
  var mode = player.blasterMode || "single";
  if(mode !== "single" && player.blasterHitsRemaining > 0){
    entries.push({ type: mode, group: "offense", charges: player.blasterHitsRemaining });
  }
  if(player.defenseMode && player.defenseMode !== "none"){
    if(player.defenseMode === "armor" ? (player.armorBlocksRemaining > 0) : (player.defenseTimer > 0)){
      entries.push({
        type: player.defenseMode,
        group: "defense",
        charges: player.defenseMode === "armor" ? player.armorBlocksRemaining : null
      });
    }
  }
  var secondaryEntries = getSecondaryInventoryEntries();
  for(var s=0; s<secondaryEntries.length; s++){
    var entry = secondaryEntries[s];
    entries.push({
      type: entry.type,
      group: "secondary",
      charges: entry.count,
      slot: s + 1,
      selected: entry.type === player.secondaryMode
    });
  }
  if(!entries.length) return;

  var iconSize = Math.max(38, radius * 1.7);
  var pad = 10;
  var boxSize = iconSize + pad;
  var gap = 10;
  var rightMargin = 28;
  var x = w - rightMargin - boxSize;
  var startY = cy + radius + 34;
  if(player.secondaryMode === "time" && player.secondaryCharges > 0){
    startY = cy + radius + 52;
  }

  ctx.save();
  ctx.globalAlpha = hudFade;
  for(var i=0; i<entries.length; i++){
    var entry = entries[i];
    var y = startY + i * (boxSize + gap);
    ctx.save();
    ctx.fillStyle = "rgba(8,12,24,.72)";
    ctx.strokeStyle = entry.selected ? "rgba(0,229,255,.6)" : "rgba(255,255,255,.22)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(x, y, boxSize, boxSize, 10);
    ctx.fill();
    ctx.stroke();
    drawHudPickupIcon(entry, x + boxSize / 2, y + boxSize / 2, iconSize);
    if(entry.slot){
      ctx.fillStyle = "rgba(0,229,255,.9)";
      ctx.font = "700 11px Oxanium, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(String(entry.slot), x + 6, y + 5);
    }
    if(entry.charges != null && entry.charges > 1){
      ctx.fillStyle = "rgba(232,236,255,.9)";
      ctx.font = "700 11px Oxanium, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("x" + entry.charges, x + boxSize - 6, y + boxSize - 4);
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawTutorialPortal(){
  if(!tutorialActive || !tutorialPortalActive) return;
  var x = tutorialPortalX;
  var y = tutorialPortalY;
  var r = tutorialPortalR;
  var pulse = 1 + Math.sin(tutorialPortalT * 4.4) * 0.06;
  var ringR = r * pulse;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  var glow = ctx.createRadialGradient(x, y, ringR * 0.2, x, y, ringR * 1.8);
  glow.addColorStop(0, "rgba(0,229,255,.5)");
  glow.addColorStop(0.45, "rgba(0,229,255,.18)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, ringR * 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tutorialPortalT * 0.9);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = "rgba(0,229,255,.9)";
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = "rgba(255,255,255,.8)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, ringR * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  ctx.globalCompositeOperation = "source-over";
}

function drawSlowMoWave(){
  if(!state.slowMoWaveActive) return;
  var y = state.slowMoWaveY || (view.h + 40);
  var band = 160;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  var grad = ctx.createLinearGradient(0, y - band, 0, y + band);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.3, "rgba(200,200,210,.18)");
  grad.addColorStop(0.5, "rgba(220,220,230,.42)");
  grad.addColorStop(0.7, "rgba(200,200,210,.2)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, y - band, view.w, band * 2);
  ctx.strokeStyle = "rgba(220,220,230,.55)";
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(view.w, y);
  ctx.stroke();
  ctx.restore();
}

function clearMissionBriefType(){
  for(var i=0; i<missionBriefTypeTimers.length; i++){
    clearTimeout(missionBriefTypeTimers[i]);
    clearInterval(missionBriefTypeTimers[i]);
  }
  missionBriefTypeTimers.length = 0;
}

function playMissionBriefTypeAudio(){
  if(!missionBriefTypeAudio){
    missionBriefTypeAudio = new Audio("sfx/ui/tutorial_messages.mp3");
    missionBriefTypeAudio.loop = true;
    missionBriefTypeAudio.volume = 0.4;
  }
  if(missionBriefTypeAudio.paused){
    missionBriefTypeAudio.play().catch(function(){});
  }
}

function stopMissionBriefTypeAudio(){
  if(!missionBriefTypeAudio) return;
  if(!missionBriefTypeAudio.paused){
    missionBriefTypeAudio.pause();
    missionBriefTypeAudio.currentTime = 0;
  }
}

function typeMissionBriefText(el, text, speedMs, done){
  if(!el) return;
  var idx = 0;
  var txt = String(text || "");
  el.textContent = "";
  if(!txt.length){
    if(typeof done === "function") done();
    return;
  }
  var timer = setInterval(function(){
    idx++;
    el.textContent = txt.slice(0, idx);
    if(idx >= txt.length){
      clearInterval(timer);
      if(typeof done === "function") done();
    }
  }, speedMs || 22);
  missionBriefTypeTimers.push(timer);
}

function startMissionBriefTypewriter(title, body){
  clearMissionBriefType();
  playMissionBriefTypeAudio();
  typeMissionBriefText(missionBriefTitle, title, 26, function(){
    typeMissionBriefText(missionBriefBody, body, 18, function(){
      stopMissionBriefTypeAudio();
    });
  });
}

function ensureMissionBrief(){
  if(missionBriefOverlay) return;
  if(document.getElementById("missionBriefStyles") == null){
    var style = document.createElement("style");
    style.id = "missionBriefStyles";
    style.textContent = "#missionBriefOverlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:18;background:rgba(6,10,20,.7);backdrop-filter:blur(4px);}#missionBriefOverlay.show{display:flex;}#missionBriefOverlay .missionBrief-card{background:rgba(8,12,24,.92);border:1px solid rgba(0,229,255,.3);border-radius:18px;padding:18px 20px;max-width:480px;width:min(480px,92%);box-shadow:0 18px 48px rgba(0,0,0,.5);font-family:\"Oxanium\",sans-serif;transform:scale(1);opacity:1;transition:transform .35s ease, opacity .35s ease;}#missionBriefOverlay .missionBrief-card.is-exiting{transform:scale(0.86);opacity:0;}#missionBriefOverlay h3{margin:0 0 10px;font-size:14px;letter-spacing:1.6px;text-transform:uppercase;color:#e8ecff;}#missionBriefOverlay p{margin:0 0 16px;font-size:13px;line-height:1.6;color:rgba(232,236,255,.8);}#missionBriefOverlay .brief-actions{display:flex;justify-content:flex-end;}#missionBriefOverlay .brief-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);color:#e8ecff;border-radius:12px;padding:8px 12px;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;font-family:\"Oxanium\",sans-serif;}";
    document.head.appendChild(style);
  }
  missionBriefOverlay = document.createElement("div");
  missionBriefOverlay.id = "missionBriefOverlay";
  missionBriefOverlay.innerHTML = "<div class=\"missionBrief-card\"><h3></h3><p></p><div class=\"brief-actions\"><button class=\"brief-btn\" type=\"button\">UNDERSTOOD</button></div></div>";
  var shell = gameShell || document.body;
  shell.appendChild(missionBriefOverlay);
  missionBriefTitle = missionBriefOverlay.querySelector("h3");
  missionBriefBody = missionBriefOverlay.querySelector("p");
  missionBriefBtn = missionBriefOverlay.querySelector(".brief-btn");
  if(missionBriefBtn){
    missionBriefBtn.addEventListener("click", function(){
      if(missionBriefAnimating) return;
      missionBriefAnimating = true;
      var card = missionBriefOverlay.querySelector(".missionBrief-card");
      if(card) card.classList.add("is-exiting");
      clearMissionBriefType();
      stopMissionBriefTypeAudio();
      missionBriefBypass = true;
      setTimeout(function(){
        missionBriefOverlay.classList.remove("show");
        if(card) card.classList.remove("is-exiting");
        missionBriefAnimating = false;
        setMissionBriefActive(false);
        var cb = missionBriefOnAccept;
        missionBriefOnAccept = null;
        if(cb) cb();
      }, 320);
    });
  }
}

function getMissionBriefText(){
  var info = describeQuestionMode(state.questionMode || (inputs.questionMode ? inputs.questionMode.value : "classic"));
  var modeName = info.modeLabel || "Classic Answer";
  var op = info.operation || "Multiplication";
  var sub = info.submode ? (" (" + info.submode + ")") : "";
  var summary = op + " • " + modeName + sub + ".";
  var detail = "Shoot the correct answer asteroids before they escape. Avoid decoys and stay sharp.";
  if(modeName.indexOf("Digit Hunt") !== -1){
    detail = "Shoot the digits in the correct order to complete the answer. Avoid decoys.";
  }else if(modeName.indexOf("Factor Hunt") !== -1){
    detail = "Find the missing factor that completes the product. Avoid decoys.";
  }else if(op === "Rationals"){
    detail = "Match the fraction/decimal shown. Avoid incorrect values.";
  }else if(op === "Squares"){
    detail = "Solve the square or root and shoot the correct asteroid.";
  }
  return summary + " " + detail;
}

function drawEmpWave(){
  if(!state.empWaveActive) return;
  var y = state.empWaveY || (view.h + 40);
  var phase = state.empWavePhase || 0;
  var rings = 6;
  var ringSpacing = view.w / rings;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(190,220,245,.45)";
  ctx.lineWidth = 2.4;
  for(var i=0; i<rings; i++){
    var cx = ringSpacing * (i + 0.5);
    var offset = Math.sin(phase + i * 0.9) * 10;
    var radius = 46 + i * 12 + Math.sin(phase * 1.4 + i) * 6;
    var start = phase * 0.7 + i * 0.6;
    var end = start + Math.PI * 1.2;
    ctx.beginPath();
    ctx.arc(cx, y + offset, radius, start, end);
    ctx.stroke();
  }
  ctx.restore();
}

function buildTutorialDots(){
  var w = view.w;
  var h = view.h;
  var top = view.hudH + Math.max(80, h * 0.14);
  var bottom = h - Math.max(80, h * 0.14);
  var left = Math.max(70, w * 0.1);
  var right = w - left;
  var minSpacing = Math.max(140, Math.min(w, h) * 0.18);
  var safeRects = [];
  var canvasRect = canvas.getBoundingClientRect();
  var guideCard = document.querySelector("#tourGuide .tourGuide-card");
  if(guideCard){
    var cardRect = guideCard.getBoundingClientRect();
    var pad = 18;
    safeRects.push({
      x1: cardRect.left - canvasRect.left - pad,
      y1: cardRect.top - canvasRect.top - pad,
      x2: cardRect.right - canvasRect.left + pad,
      y2: cardRect.bottom - canvasRect.top + pad
    });
  }

  function insideSafe(x, y){
    for(var i=0; i<safeRects.length; i++){
      var s = safeRects[i];
      if(x >= s.x1 && x <= s.x2 && y >= s.y1 && y <= s.y2) return true;
    }
    return false;
  }

  function farEnough(x, y, dots){
    for(var i=0; i<dots.length; i++){
      var d = dots[i];
      if(Math.hypot(x - d.x, y - d.y) < minSpacing) return false;
    }
    return true;
  }

  var dots = [];
  var attempts = 0;
  while(dots.length < 4 && attempts < 300){
    attempts += 1;
    var x = rand(left, right);
    var y = rand(top, bottom);
    if(insideSafe(x, y)) continue;
    if(!farEnough(x, y, dots)) continue;
    dots.push({ x: x, y: y, n: dots.length + 1 });
  }
  if(dots.length < 4){
    var midX = (left + right) / 2;
    var midY = (top + bottom) / 2;
    var spreadX = (right - left) * 0.32;
    var spreadY = (bottom - top) * 0.26;
    dots = [
      { x: midX - spreadX, y: midY - spreadY, n: 1 },
      { x: midX + spreadX, y: midY - spreadY, n: 2 },
      { x: midX + spreadX, y: midY + spreadY, n: 3 },
      { x: midX - spreadX, y: midY + spreadY, n: 4 }
    ];
  }
  return dots;
}

function startTutorialDots(requiredMode, eventName){
  tutorialDots = buildTutorialDots();
  tutorialDotsIndex = 0;
  tutorialDotsActive = true;
  tutorialDotsFade = 1;
  tutorialDotsFading = false;
  tutorialDotsRequiredMode = requiredMode || "hybrid";
  tutorialDotsEvent = eventName || null;
  tutorialDotsNotifyPending = false;
}

function stopTutorialDots(){
  tutorialDotsActive = false;
  tutorialDotsFading = false;
  tutorialDotsFade = 0;
  tutorialDotsIndex = 0;
  tutorialDotsRequiredMode = null;
  tutorialDotsEvent = null;
  tutorialDotsNotifyPending = false;
}

function updateTutorialDots(dt){
  if(!tutorialDotsActive) return;
  if(tutorialDotsFading){
    tutorialDotsFade = Math.max(0, tutorialDotsFade - dt * 2.4);
    if(tutorialDotsFade <= 0){
      tutorialDotsActive = false;
      tutorialDotsFading = false;
      if(tutorialDotsNotifyPending && tourGuide && tutorialDotsEvent){
        tourGuide.notify(tutorialDotsEvent);
      }
      tutorialDotsNotifyPending = false;
      tutorialDotsEvent = null;
    }
    return;
  }
  if(tutorialDotsRequiredMode === "arrows"){
    if(!(keys.has("arrowup") || keys.has("arrowdown") || keys.has("arrowleft") || keys.has("arrowright"))) return;
  }else if(tutorialDotsRequiredMode === "wasd"){
    if(!(keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d"))) return;
  }else{
    if(!mousepadActive || mousepadMode !== tutorialDotsRequiredMode) return;
  }
  var target = tutorialDots[tutorialDotsIndex];
  if(!target) return;
  var dist = Math.hypot(player.x - target.x, player.y - target.y);
  if(dist <= 26){
    tutorialDotsIndex += 1;
    if(tutorialDotsIndex >= tutorialDots.length){
      tutorialDotsFading = true;
      tutorialDotsNotifyPending = true;
    }
  }
}

function drawTutorialDots(){
  if(!tutorialActive || !tutorialDotsActive || !tutorialDots.length) return;
  var alpha = clamp(tutorialDotsFade, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "700 12px Oxanium, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for(var i=0; i<tutorialDots.length; i++){
    var dot = tutorialDots[i];
    var active = i === tutorialDotsIndex;
    var radius = active ? 10 : 8;
    ctx.save();
    ctx.globalAlpha = alpha * (active ? 1 : 0.7);
    ctx.fillStyle = "rgba(8,12,24,.75)";
    ctx.strokeStyle = active ? "rgba(0,229,255,.9)" : "rgba(255,255,255,.65)";
    ctx.lineWidth = active ? 2.2 : 1.4;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = active ? "rgba(0,229,255,.95)" : "rgba(232,236,255,.85)";
    ctx.fillText(String(dot.n || (i + 1)), dot.x, dot.y + 0.5);
    ctx.restore();
  }
  ctx.restore();
}

function drawPowerups(){
  if(!powerups.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(var i=0;i<powerups.length;i++){
    var p = powerups[i];
    var color = getPowerupColor(p);
    var popScale = 1;
    var popAlpha = 1;
    if(p.popDuration && p.popTimer > 0){
      var t = 1 - (p.popTimer / Math.max(0.001, p.popDuration));
      var pulse = Math.sin(clamp(t, 0, 1) * Math.PI);
      popScale = 1 + (p.popScale || 0.6) * pulse;
      popAlpha = 0.75 + 0.25 * pulse;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot || 0);
    if(popScale !== 1) ctx.scale(popScale, popScale);
    ctx.globalAlpha = 0.9 * popAlpha;
    var glow = ctx.createRadialGradient(0,0,2,0,0,p.r + 10);
    glow.addColorStop(0, color.replace("0.7", "0.35"));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, p.r + 8, 0, Math.PI*2);
    ctx.fill();

    ctx.globalAlpha = 0.95 * popAlpha;
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
  if(p.type === "missile") return "rgba(255,221,0,.8)";
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

  var icon = powerupIcons[p.type];
  if(!icon && p.group === "offense"){
    icon = shotIcons[p.type];
  }
  if(icon && icon.ready){
    var iconSize = Math.max(64, p.r * 4.2);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    var iw = icon.img.naturalWidth || icon.img.width || iconSize;
    var ih = icon.img.naturalHeight || icon.img.height || iconSize;
    var scale = iconSize / Math.max(1, Math.max(iw, ih));
    var drawW = iw * scale;
    var drawH = ih * scale;
    ctx.drawImage(icon.img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    return;
  }

  if(p.group === "secondary" && (p.type === "repair" || p.type === "magnet" || p.type === "time")){
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    if(p.type === "repair"){
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 5);
      ctx.stroke();
    }else if(p.type === "magnet"){
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(-8, 2);
      ctx.arc(0, 2, 8, Math.PI, 0, false);
      ctx.lineTo(8, -8);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(-11, -12, 6, 6);
      ctx.rect(5, -12, 6, 6);
      ctx.fill();
      ctx.stroke();
    }else{
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,.9)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -6);
      ctx.moveTo(0, 0);
      ctx.lineTo(4, 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.beginPath();
      ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

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
    if(p.type === "missile"){
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(6, -2);
      ctx.lineTo(2, 12);
      ctx.lineTo(-2, 12);
      ctx.lineTo(-6, -2);
      ctx.closePath();
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
}

function drawBullets(){
  if(!bullets.length) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for(var i=0;i<bullets.length;i++){
    var b = bullets[i];
    function drawBulletImage(asset, sizeMul, offsetY, rotation){
      if(!asset || !asset.ready) return;
      var size = b.r * sizeMul;
      var iw = asset.img.naturalWidth || asset.img.width || size;
      var ih = asset.img.naturalHeight || asset.img.height || size;
      var scale = size / Math.max(1, Math.max(iw, ih));
      var drawW = iw * scale;
      var drawH = ih * scale;
      ctx.save();
      ctx.globalAlpha = 0.95;
      if(rotation){
        ctx.translate(b.x, b.y + (offsetY || 0));
        ctx.rotate(rotation);
        ctx.drawImage(asset.img, -drawW / 2, -drawH / 2, drawW, drawH);
      }else{
        ctx.drawImage(asset.img, b.x - drawW / 2, b.y + (offsetY || 0) - drawH / 2, drawW, drawH);
      }
      ctx.restore();
    }
    if(b.kind === "laser"){
      drawBulletImage(bulletLaserImg, 12, -(b.len || 18));
      continue;
    }

    if(b.kind === "rail"){
      drawBulletImage(bulletRailImg, 12, -(b.len || 34));
      continue;
    }

    if(b.kind === "fire"){
      drawBulletImage(bulletFireImg, 12, 0);
      continue;
    }

    if(b.kind === "plasma"){
      drawBulletImage(bulletOrbImg, 12, 0);
      continue;
    }

    if(b.kind === "ice"){
      drawBulletImage(bulletIceImg, 12, 0);
      continue;
    }

    if(b.kind === "electric"){
      drawBulletImage(bulletBoltImg, 18, 0);
      continue;
    }

    if(b.kind === "pierce"){
      drawBulletImage(bulletBolaImg, 12, 0, b.rot || 0);
      continue;
    }

    if(b.kind === "missile"){
      if(b.trail && b.trail.length > 1){
        ctx.save();
        ctx.lineWidth = b.boosted ? 3.2 : 2;
        ctx.strokeStyle = b.boosted ? "rgba(255,210,120,.65)" : "rgba(120,220,255,.45)";
        for(var t=1; t<b.trail.length; t++){
          var p0 = b.trail[t - 1];
          var p1 = b.trail[t];
          var alpha = t / b.trail.length;
          ctx.globalAlpha = alpha * (b.boosted ? 0.85 : 0.7);
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        ctx.restore();
      }
      drawBulletImage(bulletMissileImg, 12, 0, b.rot || 0);
      continue;
    }

    if(b.kind === "single" && bulletSingle.ready){
      drawBulletImage(bulletSingle, 12, 0);
      continue;
    }

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
  var drawX = a.x;
  var drawY = a.y;
  var fadeAlpha = 1;
  if(a.effect === "fade" && a.effectDuration){
    fadeAlpha = clamp(a.effectTimer / a.effectDuration, 0, 1);
  }
  if(a.shakeTimer != null && a.shakeTimer > 0){
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

  if(a.spriteIndex == null || a.spriteIndex < 0 || a.spriteIndex >= asteroidSprites.length){
    a.spriteIndex = randi(0, asteroidSprites.length - 1);
  }
  var sprite = asteroidSprites[a.spriteIndex];
  if(sprite && asteroidSpriteReady[a.spriteIndex]){
    ctx.save();
    var ghostAlpha = a.ambient ? 0.95 : 0.2;
    ctx.globalAlpha = (a.ghost ? ghostAlpha : 0.95) * fadeAlpha;
    ctx.drawImage(sprite, -a.r, -a.r, a.r * 2, a.r * 2);
    ctx.restore();
  }else{
    ctx.globalAlpha = fadeAlpha;
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

    ctx.globalAlpha = 0.85 * fadeAlpha;
    ctx.strokeStyle = "rgba(232,236,255,.14)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, a.r*0.96, -0.3, Math.PI*2 - 0.9);
    ctx.stroke();

    ctx.globalAlpha = 0.65 * fadeAlpha;
    ctx.fillStyle = "rgba(0,0,0,.22)";
    for(var c=0;c<3;c++){
      var cx = Math.sin(a.seed*3.1 + c*1.7) * a.r*0.42;
      var cy = Math.cos(a.seed*2.4 + c*2.1) * a.r*0.34;
      var cr = a.r*(0.10 + (c%3)*0.04);
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI*2);
      ctx.fill();
    }
  }

  if(a.burning){
    ctx.globalAlpha = 0.85 * fadeAlpha;
    ctx.fillStyle = "rgba(255,140,60,.55)";
    ctx.beginPath();
    ctx.arc(0, 0, a.r * 0.85, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,90,40,.8)";
    for(var f=0; f<3; f++){
      var fx = Math.sin(a.seed*4.2 + f*2.1) * a.r*0.4;
      var fy = -a.r*0.35 + f*4;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx - 6, fy + 12);
      ctx.lineTo(fx + 6, fy + 12);
      ctx.closePath();
      ctx.fill();
    }
  }

  if(a.frozen){
    ctx.globalAlpha = 0.75 * fadeAlpha;
    ctx.fillStyle = "rgba(120,220,255,.18)";
    ctx.beginPath();
    ctx.arc(0, 0, a.r * 0.88, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = "rgba(180,240,255,.6)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-a.r*0.4, -a.r*0.1);
    ctx.lineTo(a.r*0.2, a.r*0.25);
    ctx.lineTo(a.r*0.4, -a.r*0.3);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  if(ring){
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(drawX, drawY, a.r + 2, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  if(player.lockTimer > 0 && a.id === state.correctAsteroidId && a.waveId === state.waveId){
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.strokeStyle = "rgba(0,229,255,.65)";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(drawX, drawY, a.r + 8, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  if(a.label !== null){
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    var size = Math.max(14, Math.min(22, a.r*0.7));
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
    ctx.roundRect(drawX - boxW/2, drawY - boxH/2, boxW, boxH, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(232,236,255,.90)";
    ctx.fillText(text, drawX, drawY);
    if(parsed.repeatStart >= 0 && parsed.repeatLen > 0){
      var leftW = ctx.measureText(text.slice(0, parsed.repeatStart)).width;
      var repeatW = ctx.measureText(text.slice(parsed.repeatStart, parsed.repeatStart + parsed.repeatLen)).width;
      var lineY = drawY - size * 0.52;
      ctx.strokeStyle = "rgba(232,236,255,.85)";
      ctx.lineWidth = Math.max(1, size * 0.06);
      ctx.beginPath();
      ctx.moveTo(drawX - (ctx.measureText(text).width / 2) + leftW, lineY);
      ctx.lineTo(drawX - (ctx.measureText(text).width / 2) + leftW + repeatW, lineY);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawShip(){
  if(player.hidden) return;
  var fadeAlpha = (typeof player.fadeAlpha === "number") ? player.fadeAlpha : 1;
  if(player.teleportFx){
    var fx = player.teleportFx;
    var t = fx.t || 0;
    if(t < fx.ghostDur){
      var ghostIn = Math.min(0.08, fx.ghostDur * 0.4);
      var ghostAlpha = t <= ghostIn
        ? (t / Math.max(0.001, ghostIn)) * 0.55
        : 0.55 * (1 - (t - ghostIn) / Math.max(0.001, fx.ghostDur - ghostIn));
      ghostAlpha *= fadeAlpha;
      if(ghostAlpha > 0.01){
        renderShip(fx.startX, fx.startY, ghostAlpha, true, 0, 0);
      }
    }
    if(t >= fx.hide){
      var p = Math.min(1, (t - fx.hide) / Math.max(0.001, fx.zoomDur));
      var ease = 1 - Math.pow(1 - p, 2);
      var scaleMul = 0.2 + 0.8 * ease;
      var alpha = (0.35 + 0.65 * ease) * fadeAlpha;
      renderShip(fx.endX, fx.endY, alpha, false, 0, 0, null, scaleMul);
    }
    if(t < fx.hide + fx.zoomDur) return;
  }
  if(player.teleportHide > 0) return;
  var baseShake = player.shipShake ? player.shipShake * 4.5 : 0;
  var collisionShake = state.collisionSlow ? state.collisionSlow * 7.5 : 0;
  var shake = baseShake + collisionShake;
  var sx = shake ? Math.sin(performance.now() * 0.05) * shake : 0;
  var sy = shake ? Math.cos(performance.now() * 0.045) * shake : 0;
  renderShip(player.x + sx, player.y + sy, fadeAlpha, false);
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

function findAsteroidCollisionAt(x, y){
  for(var i=asteroids.length-1; i>=0; i--){
    var a = asteroids[i];
    if(a.noDamage) continue;
    var dx = a.x - x;
    var dy = a.y - (y - 4);
    if(Math.hypot(dx, dy) < a.r + 16){
      return { index: i, asteroid: a, dx: dx, dy: dy };
    }
  }
  return null;
}

function findDashAsteroidCollision(sx, sy, ex, ey){
  var vx = ex - sx;
  var vy = ey - sy;
  var len2 = vx * vx + vy * vy;
  var best = null;
  var bestT = 1.1;
  for(var i=asteroids.length-1; i>=0; i--){
    var a = asteroids[i];
    if(a.noDamage) continue;
    var t = 0;
    if(len2 > 0){
      t = ((a.x - sx) * vx + (a.y - sy) * vy) / len2;
      t = clamp(t, 0, 1);
    }
    var cx = sx + vx * t;
    var cy = sy + vy * t;
    var dx = a.x - cx;
    var dy = a.y - (cy - 4);
    var r = a.r + 16;
    if(dx * dx + dy * dy <= r * r){
      if(t < bestT){
        bestT = t;
        best = { index: i, asteroid: a, hitX: cx, hitY: cy };
      }
    }
  }
  return best;
}

function consumeArmorBlock(){
  if(player.defenseMode !== "armor") return;
  player.armorBlocksRemaining = Math.max(0, (player.armorBlocksRemaining || 0) - 1);
  if(player.armorBlocksRemaining <= 0){
    player.defenseMode = "none";
    player.defenseTimer = 0;
    showToast("ARMOR DEPLETED");
  }
}

function handleShipAsteroidCollision(a, hitX, hitY, force, noRemove){
  if(a.noDamage) return false;
  var dx = a.x - hitX;
  var dy = a.y - (hitY - 4);
  var dist = Math.hypot(dx, dy);
  if(dist >= a.r + 16) return false;

  if(!force && player.invuln > 0){
    return false;
  }

  if(force || player.invuln <= 0){
    registerShotTypeHit(1, false);
    resetSurvivorTimer();
    if(!noRemove && a.isCorrect && a.waveId === state.waveId){
      state.correctInPlay = false;
      state.correctAsteroidId = 0;
    }

    kickShake(18, 0.14);
    state.asteroidCollisions += 1;
    state.collisionSlow = Math.max(state.collisionSlow || 0, 1.0);
    a.shakeTimer = 0.2;
    a.shakeDur = 0.2;
    a.shakeAmp = 4.2;
    a.vx = (a.vx || 0) + (dx / Math.max(1, dist)) * 120;
    a.vy = (a.vy || 0) + (dy / Math.max(1, dist)) * 120;
    var knockBack = 0.7;
    player.vx = (-dx / Math.max(1, dist)) * player.speed * knockBack;
    player.vy = (-dy / Math.max(1, dist)) * player.speed * knockBack;
    var dmgHit = (a.ghost || a.label === null) ? 0.18 : 0.30;
    if(player.defenseMode === "armor") dmgHit = 0;

    if(player.defenseMode === "shield"){
      impactDebris(hitX, hitY - 8);
      playSfx(state, "impact", 0.35);
      player.hitFlash = 1;
      player.shipShake = Math.max(player.shipShake || 0, 1.0);
      player.invuln = 0.35;
      state.streak = 0;
      syncHud();
      showToast("SHIELD BLOCK");
    }else if(player.defenseMode === "armor"){
      impactShipHit(hitX, hitY - 10);
      playSfx(state, "impact_thud", 0.45);
      player.hitFlash = 1;
      player.shipShake = Math.max(player.shipShake || 0, 1.0);
      player.invuln = 0.35;
      state.streak = 0;
      syncHud();
      showToast("ARMOR ABSORB");
      consumeArmorBlock();
    }else{
      impactShipHit(hitX, hitY - 10);
      playSfx(state, "crash", 0.55);
      player.hitFlash = 1;
      player.shipShake = Math.max(player.shipShake || 0, 1.0);
      player.invuln = 0.45;

      player.hull = clamp(player.hull - dmgHit, 0, 1);
      state.streak = 0;
      if(consumeShipLife("OUT OF LIVES (ASTEROID COLLISION)")) return true;

      if(player.hull <= 0){
        if(tutorialActive){
          player.hull = Math.max(player.hull, 0.12);
          syncHud();
          return triggerTutorialRecovery("HULL CRITICAL");
        }
        player.hull = 0;
        syncHud();
        state.endReasonDetail = "HULL DEPLETED (ASTEROID COLLISION)";
        endGame("destroyed");
        return true;
      }else{
        playSfx(state, "ship_damaged");
        showToast("HULL DAMAGED");
      }
    }
  }

  return !noRemove;
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

function renderShip(x, y, alpha, ghost, overrideVX, overrideVY, ghostStyle, scaleMul){
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  var baseAlpha = ctx.globalAlpha;

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
  if(typeof scaleMul === "number") scale *= scaleMul;
  ctx.scale(scale, scale);

  if(!isFinite(x) || !isFinite(y)) { ctx.restore(); return; }
  var swayAmp = 0.008 + speedMag * 0.01;
  var sway = Math.sin(t * 0.004) * swayAmp;
  var shear = 0;
  ctx.rotate(turn);
  ctx.transform(1, 0, shear, 1, 0, 0);
  ctx.scale(squashX * (1 + sway) * (1 - backwardShrink * 0.4), (1 - sway * 0.6) * (1 + forwardStretch - backwardShrink));

  if(player.defenseMode === "armor" && !ghost){
    ctx.save();
    ctx.globalAlpha = baseAlpha * 0.65;
    ctx.shadowColor = "rgba(0,229,255,.95)";
    ctx.shadowBlur = 36;
    ctx.strokeStyle = "rgba(0,229,255,.6)";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 6, 38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = baseAlpha * 0.35;
    ctx.fillStyle = "rgba(0,229,255,.2)";
    ctx.beginPath();
    ctx.arc(0, 6, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if(player.defenseMode === "shield" && !ghost){
    ctx.save();
    var shieldY = -28;
    var arcR = 38;
    var arcStart = Math.PI * 1.08;
    var arcEnd = Math.PI * 1.92;
    ctx.globalAlpha = baseAlpha * 0.5;
    ctx.strokeStyle = "rgba(255,221,0,.35)";
    ctx.shadowColor = "rgba(255,221,0,.55)";
    ctx.shadowBlur = 18;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, shieldY, arcR + 2, arcStart, arcEnd);
    ctx.stroke();

    ctx.shadowBlur = 8;
    ctx.globalAlpha = baseAlpha * 0.9;
    ctx.strokeStyle = "rgba(150,190,60,.95)";
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, shieldY, arcR, arcStart, arcEnd);
    ctx.stroke();

    var cells = 6;
    var step = (arcEnd - arcStart) / cells;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = "rgba(150,190,60,.85)";
    for(var c=0; c<cells; c++){
      var ang = arcStart + step * (c + 0.5);
      var cx = Math.cos(ang) * (arcR + 1);
      var cy = shieldY + Math.sin(ang) * (arcR + 1);
      var rHex = 4.6;
      ctx.beginPath();
      for(var s=0; s<6; s++){
        var ha = Math.PI / 6 + s * (Math.PI / 3);
        var hx = cx + Math.cos(ha) * rHex;
        var hy = cy + Math.sin(ha) * rHex;
        if(s === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = baseAlpha * 0.9;
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
  ctx.shadowBlur = 12 * (1 - dmg*0.55);

  var wingLeft = [-16, -8, -50, 12, -56, 22, -50, 30, -22, 28, -8, 6];
  var wingRight = [16, -8, 50, 12, 56, 22, 50, 30, 22, 28, 8, 6];
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
    wingLeft = [-14, 2, -46, 18, -52, 32, -46, 36, -20, 30, -8, 10];
    wingRight = [14, 2, 46, 18, 52, 32, 46, 36, 20, 30, 8, 10];
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
    gun.barrelLeft = -36;
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
  gun.barrelY = gun.y - 18;
  if(shipType === "spire"){
    gun.barrelY -= 6;
  }else if(shipType === "am2"){
    gun.barrelY -= 5;
  }

  ghostStyle = ghostStyle || {};
  var leftScale = clamp(1 + bank * 0.5, 0.5, 1.5);
  var rightScale = clamp(1 - bank * 0.5, 0.5, 1.5);
  var ghostBodyAlpha = (ghost && ghostStyle.thrustFocus) ? 0.35 : 1;
  var ghostFlameBoost = (ghost && ghostStyle.thrustFocus) ? 1.45 : 1;

  ctx.save();
  ctx.globalAlpha *= ghostBodyAlpha;
  ctx.fillStyle = colors.wing;
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 2.0;

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

  // left wing shrinks on left input, right wing grows on left input
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
    ctx.lineWidth = 2.3;
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
  ctx.globalAlpha = baseAlpha * 0.9;
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

  var blink = (Math.sin(t * 0.006) + 1) / 2;
  ctx.save();
  ctx.globalAlpha = baseAlpha * (0.25 + blink * 0.55);
  ctx.fillStyle = colors.highlight || colors.accent;
  ctx.beginPath();
  ctx.arc(-24, 4, 2.2, 0, Math.PI*2);
  ctx.arc(24, 4, 2.2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  var isAm2 = shipType === "am2";
  var isSpire = shipType === "spire";
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
    ctx.globalAlpha = baseAlpha * clamp(dmg * 0.95, 0, 0.95);
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath();
    ctx.ellipse(-5, 6, 10 + dmg*10, 6 + dmg*7, -0.4, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, 2, 7 + dmg*7, 4 + dmg*5, 0.3, 0, Math.PI*2);
    ctx.fill();

    ctx.globalAlpha = baseAlpha * clamp(dmg * 0.65, 0, 0.7);
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
    ctx.globalAlpha = baseAlpha * clamp(player.hitFlash, 0, 1) * 0.55;
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
  var thrusterOffsetX = 0;
  var thrusterOffsetY = 0;
  if(shipType === "classic"){
    thrusterOffsetY = -4;
  }
  var thrusterBaseY = 22 + thrusterOffsetY;
  ctx.fillStyle = colors.thruster || "rgba(18,22,32,.85)";
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = 1.4;
  if(ghost && ghostStyle.thrustFocus){
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 1.4);
  }
  if(isSpire){
    ctx.beginPath();
    ctx.rect(-14 + thrusterOffsetX, thrusterBaseY, 28, 9);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(thrusterOffsetX, thrusterBaseY + 7, 8.5, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
  }else{
    ctx.save();
    ctx.translate(-10 + thrusterOffsetX, 0);
    ctx.scale(leftScale, 1);
    ctx.translate(10 - thrusterOffsetX, 0);
    ctx.beginPath();
    ctx.rect(-22 + thrusterOffsetX, thrusterBaseY, 22, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-12 + thrusterOffsetX, thrusterBaseY + 6, 6.5, 0, Math.PI*2);
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
    ctx.arc(12 + thrusterOffsetX, thrusterBaseY + 6, 6.5, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if(isAm2){
      ctx.beginPath();
      ctx.arc(thrusterOffsetX, thrusterBaseY + 8, 5.5, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();

  var flash = ghost ? 0 : (player.flash || 0);
  if(flash > 0){
    ctx.save();
    ctx.globalAlpha = baseAlpha * Math.min(1, flash);
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
  var flameWiggle = (Math.sin(t * 0.06) + Math.sin(t * 0.11 + 1.4)) * 0.6 * (0.6 + speedMag);
  ctx.save();
  ctx.globalAlpha = baseAlpha * (0.2 + bloom * 0.22);
  ctx.fillStyle = colors.flame || "rgba(0,229,255,.35)";
  ctx.shadowColor = colors.flame || "rgba(0,229,255,.4)";
  ctx.shadowBlur = 12 + bloom * 9;
  ctx.beginPath();
  if(isSpire){
    ctx.arc(thrusterOffsetX, thrusterBaseY + 7, 7 + bloom * 5, 0, Math.PI*2);
  }else{
    ctx.arc(-12 + thrusterOffsetX, thrusterBaseY + 6, 5 + bloom * 4, 0, Math.PI*2);
    ctx.arc(12 + thrusterOffsetX, thrusterBaseY + 6, 5 + bloom * 4, 0, Math.PI*2);
    if(isAm2){
      ctx.arc(thrusterOffsetX, thrusterBaseY + 8, 4.5 + bloom * 3.5, 0, Math.PI*2);
    }
  }
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = baseAlpha * (0.85 + forwardBoost * 0.35);
  ctx.fillStyle = colors.flame || "rgba(193,216,47,.16)";
  ctx.beginPath();
  if(isSpire){
    ctx.moveTo(-6 + thrusterOffsetX, thrusterBaseY);
    ctx.lineTo(thrusterOffsetX + flameWiggle, thrusterBaseY + flame * 1.1);
    ctx.lineTo(6 + thrusterOffsetX, thrusterBaseY);
  }else{
    ctx.moveTo(-18 + thrusterOffsetX, thrusterBaseY);
    ctx.lineTo(-12 + thrusterOffsetX + flameWiggle, thrusterBaseY + flame);
    ctx.lineTo(-6 + thrusterOffsetX, thrusterBaseY);
    ctx.moveTo(6 + thrusterOffsetX, thrusterBaseY);
    ctx.lineTo(12 + thrusterOffsetX + flameWiggle, thrusterBaseY + flame);
    ctx.lineTo(18 + thrusterOffsetX, thrusterBaseY);
  }
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = baseAlpha * (0.22 + forwardBoost * 0.25);
  ctx.fillStyle = "rgba(0,229,255,.16)";
  ctx.beginPath();
  if(isSpire){
    ctx.moveTo(-10 + thrusterOffsetX, thrusterBaseY);
    ctx.lineTo(thrusterOffsetX + flameWiggle, thrusterBaseY + flame*1.22);
    ctx.lineTo(10 + thrusterOffsetX, thrusterBaseY);
  }else{
    ctx.moveTo(-24 + thrusterOffsetX, thrusterBaseY);
    ctx.lineTo(-12 + thrusterOffsetX + flameWiggle, thrusterBaseY + flame*1.18);
    ctx.lineTo(thrusterOffsetX, thrusterBaseY);
    ctx.moveTo(thrusterOffsetX, thrusterBaseY);
    ctx.lineTo(12 + thrusterOffsetX + flameWiggle, thrusterBaseY + flame*1.18);
    ctx.lineTo(24 + thrusterOffsetX, thrusterBaseY);
  }
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = baseAlpha * 0.8;
  ctx.fillStyle = colors.flame || "rgba(0,229,255,.14)";
  ctx.beginPath();
  if(isSpire){
    ctx.moveTo(-4 + thrusterOffsetX, thrusterBaseY);
    ctx.lineTo(thrusterOffsetX + flameWiggle * 0.6, thrusterBaseY + flame*0.8);
    ctx.lineTo(4 + thrusterOffsetX, thrusterBaseY);
  }else{
    ctx.moveTo(-14 + thrusterOffsetX, thrusterBaseY);
    ctx.lineTo(-12 + thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY + flame*0.7);
    ctx.lineTo(-10 + thrusterOffsetX, thrusterBaseY);
    ctx.moveTo(10 + thrusterOffsetX, thrusterBaseY);
    ctx.lineTo(12 + thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY + flame*0.7);
    ctx.lineTo(14 + thrusterOffsetX, thrusterBaseY);
  }
  ctx.closePath();
  ctx.fill();
  if(isAm2){
    ctx.globalAlpha = baseAlpha * 0.75;
    ctx.fillStyle = colors.flame || "rgba(120,220,255,.9)";
    ctx.beginPath();
    ctx.moveTo(-3 + thrusterOffsetX, thrusterBaseY - 2);
    ctx.lineTo(thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY - 2 + flame*0.9);
    ctx.lineTo(3 + thrusterOffsetX, thrusterBaseY - 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  if(Math.abs(vxN) > 0.18 && !ghost){
    var sx = (vxN > 0) ? -30 : 30;
    ctx.save();
    ctx.globalAlpha = baseAlpha * 0.55;
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
  ctx.globalAlpha = baseAlpha * 0.7;
  ctx.fillStyle = "rgba(255,255,255,.10)";
  ctx.beginPath();
  ctx.arc(0, -20, 6, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = baseAlpha * 0.85;
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
if(btnStart){
  btnStart.addEventListener("click", function(){
    requestFullscreen();
    ensureLoop();
    applySettings();
    unlockSfx(state);
    playSfx(state, "menu_beep");
    if(!startIntroThenCountdown()){
      overlayMenu.classList.remove("show");
      hideEndOverlay();
      resetSession();
      showToast("MISSION START");
    }
  });
}

btnClose.addEventListener("click", function(){
  playSfx(state, "menu_beep");
  closeSettings();
});
setPauseAllowed(false);
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
if(btnPowerups && overlayPowerups){
  btnPowerups.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    overlayMenu.classList.remove("show");
    overlayPowerups.classList.add("show");
  });
}
if(btnSfx){
  btnSfx.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    if(sfxCatalogPanel){
      var willOpen = !sfxCatalogPanel.classList.contains("open");
      sfxCatalogPanel.classList.toggle("open", willOpen);
      if(willOpen){
        renderSettingsCatalogs();
        if(sfxList && typeof sfxList.scrollIntoView === "function"){
          sfxList.scrollIntoView({ block: "start", behavior: "smooth" });
        }
      }
    }else{
      openSettings();
      setSettingsTab("audio");
      if(sfxList && typeof sfxList.scrollIntoView === "function"){
        sfxList.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }
  });
}
if(sfxCategoryButtons && sfxCategoryButtons.length){
  sfxCategoryButtons.forEach(function(btn){
    btn.addEventListener("click", function(){
      playSfx(state, "menu_beep");
      var cat = btn.getAttribute("data-sfx-category") || "all";
      setSfxCategory(cat);
    });
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
  continueSession();
});
if(btnFullscreenToggle){
  btnFullscreenToggle.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    toggleFullscreen();
  });
  getFullscreenState().then(function(state){ setFullscreenLabel(btnFullscreenToggle, state); });
}
if(settingsTabButtons && settingsTabButtons.length){
  settingsTabButtons.forEach(function(btn){
    btn.addEventListener("click", function(){
      var tabId = btn.getAttribute("data-settings-tab") || "audio";
      playSfx(state, "menu_beep");
      setSettingsTab(tabId);
      if(tabId === "catalogs"){ renderSettingsCatalogs(); }
    });
  });
}
if(toggleWideGameplay){
  toggleWideGameplay.addEventListener("change", function(){
    playSfx(state, "menu_beep");
    setWideGameplay(toggleWideGameplay.checked);
  });
}
if(toggleMousepadAuto){
  toggleMousepadAuto.addEventListener("change", function(){
    playSfx(state, "menu_beep");
    setMousepadAutoStart(toggleMousepadAuto.checked);
  });
}
if(btnResume){
  btnResume.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    closeSettings();
  });
}
if(btnCloseControls && overlayControls){
  btnCloseControls.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    overlayControls.classList.remove("show");
    overlayMenu.classList.add("show");
  });
}
if(btnMissileCancel){
  btnMissileCancel.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    closeMissileInput();
  });
}
if(btnMissileConfirm){
  btnMissileConfirm.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    if(!attemptMissileLaunch()){
      if(missileInput && missileInput.value){
        showToast("CODE INVALID");
        missileInput.select();
      }
    }
  });
}
if(missileInput){
  missileInput.addEventListener("input", function(){
    if(!missileInputActive) return;
    var cleaned = (missileInput.value || "").replace(/\D+/g, "");
    if(cleaned !== missileInput.value) missileInput.value = cleaned;
    if(cleaned && cleaned.length >= missileInputAnswer.length){
      attemptMissileLaunch();
    }
  });
  missileInput.addEventListener("keydown", function(e){
    if(!missileInputActive) return;
    if(e.key === "Enter"){
      e.preventDefault();
      if(!attemptMissileLaunch()){
        if(missileInput.value){
          showToast("CODE INVALID");
          missileInput.select();
        }
      }
    }else if(e.key === "Escape"){
      e.preventDefault();
      closeMissileInput();
    }
  });
}
if(missileOverlay){
  missileOverlay.addEventListener("click", function(e){
    if(e.target === missileOverlay){
      playSfx(state, "menu_beep");
      closeMissileInput();
    }
  });
}
document.addEventListener("fullscreenchange", function(){
  setFullscreenLabel(btnFullscreenToggle, !!document.fullscreenElement);
});
if(btnEndNext){
  btnEndNext.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    var nextIdx = campaignIndex + 1;
    if(!startNextCampaignMission(nextIdx)){
      window.location.href = "home.html";
    }
  });
}
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
    hideEndOverlay();
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
if(overlayPowerups){
  overlayPowerups.addEventListener("click", function(e){
    if(e.target === overlayPowerups){
      playSfx(state, "menu_beep");
      overlayPowerups.classList.remove("show");
      overlayMenu.classList.add("show");
    }
  });
}
if(overlaySfx){
  overlaySfx.addEventListener("click", function(e){
    if(e.target === overlaySfx){
      playSfx(state, "menu_beep");
      overlaySfx.classList.remove("show");
      overlayMenu.classList.add("show");
      stopAllPreviewAudio();
    }
  });
}
if(overlayControls){
  overlayControls.addEventListener("click", function(e){
    if(e.target === overlayControls){
      playSfx(state, "menu_beep");
      overlayControls.classList.remove("show");
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
if(btnClosePowerups && overlayPowerups){
  btnClosePowerups.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    overlayPowerups.classList.remove("show");
    overlayMenu.classList.add("show");
  });
}
if(btnBackPowerups && overlayPowerups){
  btnBackPowerups.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    overlayPowerups.classList.remove("show");
    overlayMenu.classList.add("show");
  });
}
if(btnCloseSfx && overlaySfx){
  btnCloseSfx.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    overlaySfx.classList.remove("show");
    overlayMenu.classList.add("show");
    stopAllPreviewAudio();
  });
}
if(btnBackSfx && overlaySfx){
  btnBackSfx.addEventListener("click", function(){
    playSfx(state, "menu_beep");
    overlaySfx.classList.remove("show");
    overlayMenu.classList.add("show");
    stopAllPreviewAudio();
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

  assert(factKey(9,2) === "2x9", "factKey canonical order");

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

function selectHasValue(select, value){
  if(!select) return false;
  var target = String(value);
  for(var i=0; i<select.options.length; i++){
    if(select.options[i].value === target) return true;
  }
  return false;
}

function applyConfigToInputs(config){
  if(config.aMin != null) inputs.aMin.value = config.aMin;
  if(config.aMax != null) inputs.aMax.value = config.aMax;
  if(config.bMin != null) inputs.bMin.value = config.bMin;
  if(config.bMax != null) inputs.bMax.value = config.bMax;
  if(config.decoys != null) inputs.decoys.value = config.decoys;
  if(config.decoyFunction != null && inputs.decoyFunction) inputs.decoyFunction.value = config.decoyFunction;
  if(config.speed != null) inputs.speed.value = config.speed;
  if(config.lives != null) inputs.lives.value = config.lives;
  if(config.strikes != null && inputs.strikes) inputs.strikes.value = config.strikes;
  if(config.targetMode != null){
    if(inputs.targetMode) inputs.targetMode.value = config.targetMode;
    else state.targetMode = String(config.targetMode);
  }
  if(config.volume != null && inputs.volume) inputs.volume.value = config.volume;
  if(config.sfxVolume != null && inputs.sfxVolume) inputs.sfxVolume.value = config.sfxVolume;
  if(config.musicVolume != null && inputs.musicVolume) inputs.musicVolume.value = config.musicVolume;
  if(config.timerMode != null && inputs.timerMode){
    inputs.timerMode.value = config.timerMode;
    if(!selectHasValue(inputs.timerMode, config.timerMode)){
      state.timerModeOverride = String(config.timerMode);
    }else{
      state.timerModeOverride = null;
    }
  }else if(config.timerMode != null){
    state.timerModeOverride = String(config.timerMode);
  }
  if(config.questionMode != null && inputs.questionMode) inputs.questionMode.value = config.questionMode;
  if(config.sound != null && inputs.sound) inputs.sound.checked = !!config.sound;
  updateDecoyFunctionAvailability();
  if(config.difficulty != null) state.difficulty = String(config.difficulty);
  if(config.strikes != null){
    state.strikeLimit = parseInt(config.strikes, 10);
  }
  if(config.ship){
    if(inputs.ship) inputs.ship.value = String(config.ship);
    player.shipType = String(config.ship);
  }
  if(config.belt){
    setBackgroundBelt(config.belt);
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
  if(soundParam != null){
    cfg.sound = !(soundParam === "0" || soundParam === "false");
  }

  applyConfigToInputs(cfg);

  var campaignParam = params.get("campaign");
  if(campaignParam === "1" || campaignParam === "true"){
    var profileParam = params.get("campaignProfile");
    if(profileParam){
      campaignProfileId = profileParam;
      try{ localStorage.setItem(campaignProfileKey, profileParam); }catch(e){}
    }
    var campaignIdParam = params.get("campaignId");
    campaignId = campaignIdParam || getStoredCampaignId() || campaignDefaultId;
    setStoredCampaignId(campaignId);
    campaignData = null;
    campaignActive = true;
    campaignIndex = parseInt(params.get("campaignIndex"), 10);
    if(Number.isNaN(campaignIndex)) campaignIndex = 0;
    state.campaignActive = true;
    state.campaignIndex = campaignIndex;
    var data = loadCampaignData();
    if(data && data.maxFailures) campaignMaxFailures = data.maxFailures;
  }else{
    campaignActive = false;
    campaignIndex = -1;
    state.campaignActive = false;
    state.campaignIndex = -1;
  }
}

// ======= Boot
function boot(){
  resize();
  applyStoredConfig();
  applyQueryParams();
  applySettings();
  loadWideGameplay();
  loadMousepadAutoStart();
  updateDecoyFunctionAvailability();
  primeFullscreen();

  var r = canvas.getBoundingClientRect();
  player.x = r.width / 2;
  player.y = r.height - 58;

  syncHud();

  setTutorialQuestionHidden(false);
  tutorialPortalLock = false;
  tutorialPortalNotifyPending = false;

  var params = new URLSearchParams(location.search);
  tutorialActive = params.get("tutorial") === "1" || params.get("tutorial") === "true";
  if(tutorialActive){
    try{
      tutorialPowerupSpawned = false;
      tutorialAlienSpawned = false;
      tutorialSpawnUnlocked = false;
      tutorialPowerupUnlocked = false;
      tutorialAlienUnlocked = false;
      tutorialPortalActive = false;
      tutorialPortalT = 0;
      tutorialPortalLock = false;
      tutorialPortalNotifyPending = false;
      setTutorialQuestionHidden(false);
      alienConfig.enabled = false;
      alienConfig.maxOnScreen = 0;
      if(inputs.ship) inputs.ship.value = "spire";
      player.shipType = "spire";
      tourGuide = createTourGuide({
        gameShell: gameShell,
        state: state,
        player: player,
        onStep: function(stepId){
          tutorialStepId = stepId;
          if(stepId === "move_arrows"){
            startTutorialDots("arrows", "move_arrows");
          }else if(stepId === "move_wasd"){
            startTutorialDots("wasd", "move_wasd");
          }else if(stepId === "mousepad_hybrid"){
            startTutorialDots("hybrid", "mousepad_hybrid");
          }else if(tutorialDotsActive){
            stopTutorialDots();
          }
          if(stepId === "recovery_powerup"){
            tutorialRespawnActive = true;
            tutorialRespawnTargetY = view.h - 58;
            player.hidden = false;
            player.x = view.w / 2;
            player.y = view.h + 120;
            player.vx = 0;
            player.vy = 0;
            player.moveSpeed = 0;
            player.invuln = Math.max(player.invuln, 1.2);
            player.hull = Math.max(player.hull, 0.32);
            syncHud();
            spawnPowerup("repair", "secondary", player.x, player.y - 140);
          }
          if(stepId === "correct"){
            tutorialSpawnUnlocked = true;
          }
          if(stepId === "portal"){
            tutorialPortalActive = true;
            tutorialPortalLock = false;
            tutorialPortalNotifyPending = false;
            setTutorialQuestionHidden(true);
            fadeTutorialAsteroids();
          }
          if(stepId === "powerup" && !tutorialPowerupSpawned){
            tutorialPowerupSpawned = true;
            tutorialPowerupUnlocked = true;
            if(!(state.powerupsCollected > 0)){
              spawnPowerup("shield", "defense");
            }
          }
          if(stepId === "secondary_aid"){
            spawnPowerup("time", "secondary", player.x, player.y - 140);
          }
          if(stepId === "alien" && !tutorialAlienSpawned){
            tutorialAlienSpawned = true;
            tutorialAlienUnlocked = true;
            alienConfig.enabled = true;
            alienConfig.maxOnScreen = Math.max(alienConfig.maxOnScreen || 0, 1);
          }
        },
        onComplete: function(){
          try{ localStorage.setItem("mentaris.tutorial.complete", "1"); }catch(e){}
          tutorialPortalActive = false;
          tutorialPortalLock = false;
          tutorialPortalNotifyPending = false;
          setTutorialQuestionHidden(false);
          try{
            sessionStorage.setItem("asteroidConfig", JSON.stringify({
              ship: "spire",
              belt: "dusk",
              questionMode: "classic",
              timerMode: "90",
              targetMode: "off"
            }));
          }catch(e){}
          var params = new URLSearchParams({
            autoStart: "1",
            ship: "spire",
            belt: "dusk",
            questionMode: "classic",
            timerMode: "90",
            targetMode: "off"
          });
          window.location.href = "asteroid_blaster.html?" + params.toString();
        }
      });
      tutorialLastPos.x = player.x;
      tutorialLastPos.y = player.y;
      tourGuide.start();
    }catch(err){
      console.error(err);
      tutorialActive = false;
      tourGuide = null;
      tutorialSpawnUnlocked = true;
      tutorialPowerupUnlocked = true;
      tutorialAlienUnlocked = true;
      alienConfig.enabled = true;
      setTutorialQuestionHidden(false);
    }
  }
  var autoStart = params.get("autoStart") === "1" || params.get("autoStart") === "true";
  if(!autoStart && (params.has("aMin") || params.has("bMin") || params.has("questionMode") || params.has("ship"))){
    autoStart = true;
  }
  if(overlayMenu){
    overlayMenu.classList.remove("show");
    if(!tutorialActive && !autoStart){
      overlayMenu.classList.add("show");
    }
  }
  if(autoStart){
    ensureLoop();
    requestFullscreen();
    setTimeout(function(){
      startIntroThenCountdown();
    }, 250);
    setTimeout(function(){
      if(!state.running && !introActive && !countdownActive){
        startIntroThenCountdown();
      }
    }, 1200);
  }
  if(params.get("test") === "1") runSelfTests();

  requestAnimationFrame(tick);
}

boot();












