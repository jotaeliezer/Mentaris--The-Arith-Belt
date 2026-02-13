"use strict";

import { clamp, rand, randi, factKey } from "./utils.js";
import { createState, createPlayer, normalizeRanges, applySettingsFromInputs } from "./game_settings.js";
import { playSfx, setDrone, setShipAdvance, setShipIdle, setSoundtrack, setSoundtrackStartIndex, unlockSfx } from "./audio.js";
import { createTourGuide } from "./tourguide.js";
import { createFx } from "../render/animations.js";
import { createBackground } from "../render/background.js";
import { createPhaserRenderer } from "../render/phaser_renderer.js";
import { aliens, alienBullets, alienConfig, resetAliens, setAlienUnlocked, spawnAlien, updateAliens, updateAlienBullets, drawAliens, drawAlienBullets, getAlienSpriteSrcFor } from "../entities/aliens.js";
import { computeSpawnInterval } from "./levels.js";
import { PowerupManager } from "../entities/powerups.js";

// ======= DOM
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d", { alpha: true });
var view = { w: 0, h: 0, hudH: 0 };
var gameShell = document.getElementById("gameShell");
var wrap = document.getElementById("wrap");
var isElectron = (typeof navigator !== "undefined" && /Electron/i.test(navigator.userAgent || ""));
var phaserRoot = document.getElementById("phaserRoot");
if(!phaserRoot && gameShell){
  phaserRoot = document.createElement("div");
  phaserRoot.id = "phaserRoot";
  gameShell.insertBefore(phaserRoot, canvas);
}

var phaserRenderer = null;
// Phaser renderer is now opt-in to avoid mid-session visual switches
// when it becomes ready on slower connections (e.g., GitHub Pages).
var usePhaserRenderer = false;
var sandboxMode = false;
var sandboxPanel = null;
try{
  var phaserParam = new URLSearchParams(location.search).get("phaser");
  if(phaserParam === "1" || phaserParam === "true") usePhaserRenderer = true;
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
var shipsCatalogList = document.getElementById("shipsCatalogList");
var sfxList = document.getElementById("sfxList");
var sfxCategoryButtons = overlayMenu ? overlayMenu.querySelectorAll("[data-sfx-category]") : [];
var activeSfxCategory = "all";
var settingsTabButtons = overlayMenu ? overlayMenu.querySelectorAll("[data-settings-tab]") : [];
var settingsPanels = overlayMenu ? overlayMenu.querySelectorAll("[data-settings-panel]") : [];
var toggleWideGameplay = document.getElementById("toggleWideGameplay");
var toggleMousepadAuto = document.getElementById("toggleMousepadAuto");
var toggleTouchControls = document.getElementById("toggleTouchControls");
var btnResume = document.getElementById("btnResume");
var btnShipCommands = document.getElementById("btnShipCommands");

var wideGameplayKey = "mentaris.gameplay.wide";
var mousepadAutoKey = "mentaris.mousepad.autostart";
var touchControlsKey = "mentaris.touch.controls.enabled";
var touchControlsDockHiddenKey = "mentaris.touch.controls.hidden";
var sandboxSectionsKey = "mentaris.sandbox.sections";
var mousepadAutoStart = false;
var touchControlsEnabled = false;
var touchControlsDockHidden = false;
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
  var shouldPlay = state.sound && !state.over && (state.running || countdownActive || introActive || missionBriefShowing);
  setDrone(state, shouldPlay);
  setSoundtrack(state, shouldPlay);
}

function getSecondarySlots(){
  if(!player.secondarySlots || player.secondarySlots.length !== 3){
    player.secondarySlots = [null, null, null];
  }
  return player.secondarySlots;
}

function getSecondarySlotsForPilot(pilot){
  if(!pilot.secondarySlots || pilot.secondarySlots.length !== 3){
    pilot.secondarySlots = [null, null, null];
  }
  return pilot.secondarySlots;
}

function hasSecondaryType(pilot, type){
  var slots = getSecondarySlotsForPilot(pilot);
  for(var i=0; i<slots.length; i++){
    var s = slots[i];
    if(s && s.type === type && s.count > 0) return true;
  }
  return false;
}

function hasAnySecondary(pilot){
  var slots = getSecondarySlotsForPilot(pilot);
  for(var i=0; i<slots.length; i++){
    var s = slots[i];
    if(s && s.type && s.count > 0) return true;
  }
  return false;
}

function countActiveSecondarySlots(pilot){
  var slots = getSecondarySlotsForPilot(pilot);
  var total = 0;
  for(var i=0; i<slots.length; i++){
    var s = slots[i];
    if(s && s.type && s.count > 0) total += 1;
  }
  return total;
}

function syncSelectedSecondary(){
  var slots = getSecondarySlots();
  var idx = clamp(player.secondarySlotIndex | 0, 0, slots.length - 1);
  player.secondarySlotIndex = idx;
  var slot = slots[idx];
  if(slot && slot.type && slot.count > 0){
    player.secondaryMode = slot.type;
    player.secondaryCharges = slot.count;
    return;
  }
  for(var i=0; i<slots.length; i++){
    var s = slots[i];
    if(s && s.type && s.count > 0){
      player.secondarySlotIndex = i;
      player.secondaryMode = s.type;
      player.secondaryCharges = s.count;
      return;
    }
  }
  player.secondaryMode = "none";
  player.secondaryCharges = 0;
}

function syncSelectedSecondaryForPilot(pilot){
  var slots = getSecondarySlotsForPilot(pilot);
  var idx = clamp(pilot.secondarySlotIndex | 0, 0, slots.length - 1);
  pilot.secondarySlotIndex = idx;
  var slot = slots[idx];
  if(slot && slot.type && slot.count > 0){
    pilot.secondaryMode = slot.type;
    pilot.secondaryCharges = slot.count;
    return;
  }
  for(var i=0; i<slots.length; i++){
    var s = slots[i];
    if(s && s.type && s.count > 0){
      pilot.secondarySlotIndex = i;
      pilot.secondaryMode = s.type;
      pilot.secondaryCharges = s.count;
      return;
    }
  }
  pilot.secondaryMode = "none";
  pilot.secondaryCharges = 0;
}

function getSecondaryInventoryEntries(){
  var slots = getSecondarySlots();
  var entries = [];
  for(var i=0; i<slots.length; i++){
    var slot = slots[i];
    entries.push({
      type: slot ? slot.type : null,
      count: slot ? slot.count : 0,
      slotIndex: i
    });
  }
  return entries;
}

function getSecondaryInventoryEntriesForPilot(pilot){
  var slots = getSecondarySlotsForPilot(pilot);
  var entries = [];
  for(var i=0; i<slots.length; i++){
    var slot = slots[i];
    entries.push({
      type: slot ? slot.type : null,
      count: slot ? slot.count : 0,
      slotIndex: i
    });
  }
  return entries;
}

function selectSecondaryByIndex(index){
  var slots = getSecondarySlots();
  var idx = clamp(index | 0, 0, slots.length - 1);
  player.secondarySlotIndex = idx;
  syncSelectedSecondary();
  if(tourGuide) tourGuide.notify("secondary_slot");
  var slot = slots[idx];
  if(slot && slot.type && slot.count > 0){
    showToast("SECONDARY -> " + slot.type.toUpperCase());
  }else{
    showToast("SECONDARY SLOT EMPTY");
  }
}

function selectSecondaryByIndexForPilot(pilot, index){
  var slots = getSecondarySlotsForPilot(pilot);
  var idx = clamp(index | 0, 0, slots.length - 1);
  pilot.secondarySlotIndex = idx;
  syncSelectedSecondaryForPilot(pilot);
  var slot = slots[idx];
  if(slot && slot.type && slot.count > 0){
    showToast("SECONDARY -> " + slot.type.toUpperCase());
  }else{
    showToast("SECONDARY SLOT EMPTY");
  }
}

function addSecondaryPowerup(type){
  if(!type) return;
  var slots = getSecondarySlots();
  var selectedIdx = clamp(player.secondarySlotIndex | 0, 0, slots.length - 1);
  var foundIdx = -1;
  var emptyIdx = -1;
  for(var i=0; i<slots.length; i++){
    var slot = slots[i];
    if(slot && slot.type === type){
      foundIdx = i;
      break;
    }
    if(slot == null && emptyIdx < 0){
      emptyIdx = i;
    }
  }
  if(foundIdx >= 0){
    slots[foundIdx].count += 1;
    if(type === "autofire"){
      player.secondarySlotIndex = foundIdx;
    }
  }else if(emptyIdx >= 0){
    slots[emptyIdx] = { type: type, count: 1 };
    if(player.secondaryMode === "none" || type === "autofire"){
      player.secondarySlotIndex = emptyIdx;
    }
  }else{
    // All slots full: replace the currently selected slot.
    slots[selectedIdx] = { type: type, count: 1 };
    if(type === "autofire"){
      player.secondarySlotIndex = selectedIdx;
    }
  }
  syncSelectedSecondary();
  if(tutorialActive && tutorialStepId === "secondary_slots" && tourGuide){
    if(countActiveSecondarySlots(player) >= 3){
      tourGuide.notify("secondary_slot");
    }
  }
}

function addSecondaryPowerupForPilot(pilot, type){
  if(!type) return;
  var slots = getSecondarySlotsForPilot(pilot);
  var selectedIdx = clamp(pilot.secondarySlotIndex | 0, 0, slots.length - 1);
  var foundIdx = -1;
  var emptyIdx = -1;
  for(var i=0; i<slots.length; i++){
    var slot = slots[i];
    if(slot && slot.type === type){
      foundIdx = i;
      break;
    }
    if(slot == null && emptyIdx < 0){
      emptyIdx = i;
    }
  }
  if(foundIdx >= 0){
    slots[foundIdx].count += 1;
    if(type === "autofire"){
      pilot.secondarySlotIndex = foundIdx;
    }
  }else if(emptyIdx >= 0){
    slots[emptyIdx] = { type: type, count: 1 };
    if(pilot.secondaryMode === "none" || type === "autofire"){
      pilot.secondarySlotIndex = emptyIdx;
    }
  }else{
    slots[selectedIdx] = { type: type, count: 1 };
    if(type === "autofire"){
      pilot.secondarySlotIndex = selectedIdx;
    }
  }
  syncSelectedSecondaryForPilot(pilot);
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

function setSplitGameplay(isSplit){
  var on = false;
  document.body.classList.toggle("splitGameplayMode", on);
  if(wrap) wrap.classList.toggle("splitGameplay", on);
  if(gameShell) gameShell.classList.toggle("splitGameplay", on);
  if(!!isSplit && isSandboxMultiplayer()){
    positionSandboxPilots();
  }
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
  if(tutorialActive && tutorialMovementPreference !== "mouse"){
    setMousepadActive(false);
    updateCursorVisibility();
    return;
  }
  if(mousepadAutoStart){
    setMousepadActive(true);
  }else{
    setMousepadActive(false);
  }
  updateCursorVisibility();
}

function isTouchCapableDevice(){
  try{
    if(window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
  }catch(e){}
  return ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
}

function saveTouchDockHiddenState(){
  try{ localStorage.setItem(touchControlsDockHiddenKey, touchControlsDockHidden ? "1" : "0"); }catch(e){}
}

function setTouchDockHidden(isHidden){
  touchControlsDockHidden = !!isHidden;
  document.body.classList.toggle("touchControlsDockHidden", touchControlsDockHidden);
  if(touchDockHideBtn){
    touchDockHideBtn.textContent = touchControlsDockHidden ? "Show" : "Hide";
  }
  saveTouchDockHiddenState();
  updateSandboxGamepadButton();
}

function updateSandboxGamepadButton(){
  if(!sandboxGamepadButton) return;
  sandboxGamepadButton.classList.remove("active");
  if(!touchControlsEnabled){
    sandboxGamepadButton.textContent = "Gamepad Off";
    return;
  }
  if(touchControlsDockHidden){
    sandboxGamepadButton.textContent = "Gamepad Hidden";
    return;
  }
  sandboxGamepadButton.textContent = "Gamepad On";
  sandboxGamepadButton.classList.add("active");
}

function cycleTouchControlsMode(){
  if(!touchControlsEnabled){
    setTouchControlsEnabled(true);
    setTouchDockHidden(false);
    showToast("GAMEPAD ON");
    return;
  }
  if(touchControlsDockHidden){
    setTouchControlsEnabled(false);
    setTouchDockHidden(false);
    showToast("GAMEPAD OFF");
    return;
  }
  setTouchDockHidden(true);
  resetTouchInputState();
  showToast("GAMEPAD HIDDEN");
}

function setTouchControlsEnabled(isOn){
  touchControlsEnabled = !!isOn;
  document.body.classList.toggle("touchControlsOn", touchControlsEnabled);
  if(toggleTouchControls) toggleTouchControls.checked = touchControlsEnabled;
  try{ localStorage.setItem(touchControlsKey, touchControlsEnabled ? "1" : "0"); }catch(e){}
  if(touchControlsEnabled && mousepadActive){
    setMousepadActive(false);
  }
  if(!touchControlsEnabled){
    setTouchDockHidden(false);
    resetTouchInputState();
  }
  if(touchControlsEnabled && touchControlsDockHidden){
    // Keep hidden state only for explicit user action.
    document.body.classList.add("touchControlsDockHidden");
  }
  updateSandboxGamepadButton();
}

function loadTouchControlsEnabled(){
  var stored = null;
  try{ stored = localStorage.getItem(touchControlsKey); }catch(e){}
  var hiddenStored = null;
  try{ hiddenStored = localStorage.getItem(touchControlsDockHiddenKey); }catch(e){}
  touchControlsDockHidden = hiddenStored === "1" || hiddenStored === "true";
  if(stored === "1" || stored === "true"){
    setTouchControlsEnabled(true);
    setTouchDockHidden(touchControlsDockHidden);
    return;
  }
  if(stored === "0" || stored === "false"){
    setTouchControlsEnabled(false);
    setTouchDockHidden(false);
    return;
  }
  setTouchControlsEnabled(isTouchCapableDevice());
  if(touchControlsEnabled){
    setTouchDockHidden(false);
  }
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
  questionMode: document.getElementById("questionMode"),
  stampedeMode: document.getElementById("stampedeMode"),
  shotType: document.getElementById("shotType")
};

// End screen
var endSubtitle = document.getElementById("endSubtitle");
var endTitle = document.getElementById("endTitle");
var endReason = document.getElementById("endReason");
var endOutcome = document.getElementById("endOutcome");
var endReasonLine = document.getElementById("endReasonLine");
var campaignBanner = document.getElementById("campaignBanner");
var campaignBannerTitle = document.getElementById("campaignBannerTitle");
var campaignBannerSubtitle = document.getElementById("campaignBannerSubtitle");
var campaignBannerMeta = document.getElementById("campaignBannerMeta");
var statsList = document.getElementById("statsList");
var statsListSecondary = document.getElementById("statsListSecondary");
var weakList = document.getElementById("weakList");
var accBar = document.getElementById("accBar");
var endGrade = document.getElementById("endGrade");
var breakdownCorrect = document.getElementById("breakdownCorrect");
var breakdownWrong = document.getElementById("breakdownWrong");
var breakdownMissed = document.getElementById("breakdownMissed");
var breakdownCorrectValue = document.getElementById("breakdownCorrectValue");
var breakdownWrongValue = document.getElementById("breakdownWrongValue");
var breakdownMissedValue = document.getElementById("breakdownMissedValue");
var endScoresPanel = document.getElementById("endScoresPanel");
var endScoresBody = document.getElementById("endScoresBody");
var endScoresTitle = document.getElementById("endScoresTitle");
var btnHighScoresToggle = document.getElementById("btnHighScoresToggle");
var endNameInput = document.getElementById("endNameInput");
var endSequence = document.querySelector(".endSequence");
var endScoreValue = document.getElementById("endScoreValue");
var endModeSummary = document.getElementById("endModeSummary");
var endScoreBlock = document.getElementById("endScoreBlock");
var endStatsWrap = document.getElementById("endStatsWrap");
var endNameBlock = document.getElementById("endNameBlock");
var endStageSummary = document.getElementById("endStageSummary");
var endStageEngagement = document.getElementById("endStageEngagement");
var endStageName = document.getElementById("endStageName");
var endStagePlacement = document.getElementById("endStagePlacement");
var endStageActions = document.getElementById("endStageActions");
var endPlacementTitle = document.getElementById("endPlacementTitle");
var endPlacementLine = document.getElementById("endPlacementLine");
var endMineralsCollected = document.getElementById("endMineralsCollected");
var endMineralsTotal = document.getElementById("endMineralsTotal");
var endSequenceTimers = [];
var endSequenceActive = false;
var endPhase = "";
var endPhaseTimeoutId = 0;
var endNameConfirmed = false;
var endMineralAnimId = 0;
var endMineralAnimStart = 0;
var endSequenceContext = null;
var endStageFadeTimer = 0;
var gameOverSfxTimer = 0;
var mineralsTotal = 0;
var END_PHASE_SUMMARY_MS = 4000;
var END_PHASE_ENGAGEMENT_MS = 4000;
var END_PHASE_PLACEMENT_MS = 4000;
var END_STAGE_FADE_MS = 220;

// ======= State / Entities
var state = createState();
var player = createPlayer();
player.spinManeuver = { active:false, phase:0, x0:0, y0:0, x1:0, y1:0, x2:0, y2:0 };
var pilot2 = null;
var pilot2Hud = null;
var pilotStats = { 1:null, 2:null };
var sandboxMultiplayer = { enabled:false, mode:"shared" };
var pilot2Mouse = { x:0, y:0, has:false };
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
var alienSwarmDigitBag = [];
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
var tutorialAlienDelayRemaining = 0;
var tutorialStepId = null;
var tutorialShootLocked = false;
var tutorialMineralsFreeze = false;
var tutorialMineralsTarget = 0;
var tutorialMineralsCollected = 0;
var tutorialMineralsComplete = false;
var tutorialMineralsPending = false;
var tutorialMineralsRemaining = 0;
var tutorialFreezeDimAlpha = 0;
var tutorialFreezeDimTarget = 0;
var tutorialSecondChanceBusy = false;
var mineralHudPulse = 0;
var tutorialPowerupBatchSpawned = false;
var tutorialExtraPowerupsSpawned = false;
var tutorialFreezeMousepadRestore = false;
var tutorialMovementPreference = null;
var tutorialPlatformChoiceResolved = false;
var tutorialPortalActive = false;
var tutorialPortalX = 0;
var tutorialPortalY = 0;
var tutorialPortalR = 46;
var tutorialPortalT = 0;
var tutorialPortalLock = false;
var tutorialPortalNotifyPending = false;
var tutorialHideQuestion = false;
var sandboxHideQuestion = false;
var sandboxAlienWaveDuration = 20;
var sandboxAlienWaveRequired = 2;
var sandboxAlienWavePrevHideAsteroids = null;
var sandboxAlienWaveButton = null;
var sandboxGamepadButton = null;
var sandboxSectionsState = {};
var tutorialPlatform = "desktop";
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
var tutorialHullRecoveryShown = false;
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
var mineralPopups = [];
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

function spawnGunSmoke(pilot){
  var p = pilot || player;
  var offset = Math.max(10, p.w * 0.22);
  var baseY = p.y - p.h * 0.55;
  for(var side=-1; side<=1; side+=2){
    var sx = p.x + offset * side;
    for(var i=0; i<2; i++){
      particles.push({
        x: sx + rand(-2, 2),
        y: baseY + rand(-2, 2),
        vx: rand(-20, 20),
        vy: rand(-90, -50),
        r: rand(2.2, 4.2),
        a: rand(0.12, 0.24),
        life: rand(0.24, 0.42),
        kind: "smoke",
        grow: rand(6, 12)
      });
    }
  }
  if(particles.length > 180) particles.splice(0, particles.length - 180);
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
var backgroundScrollSplit = 0;
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
  lock: { img: new Image(), ready: false, src: "images/powerups/powerup_targetlock.png" },
  scope: { img: new Image(), ready: false, src: "images/powerups/powerup_scope.png" },
  ammo: { img: new Image(), ready: false, src: "images/powerups/powerup_ammo.png" },
  machinegun: { img: new Image(), ready: false, src: "images/powerups/powerup_machinegun.png" },
  autofire: { img: new Image(), ready: false, src: "images/powerups/powerup_machinegun.png" }
};
Object.keys(powerupIcons).forEach(function(key){
  var icon = powerupIcons[key];
  icon.img.onload = function(){ icon.ready = true; };
  icon.img.src = icon.src;
});

var shotIcons = {
  missile: { img: new Image(), ready: false, src: "images/shots/shot_missile.png" },
  electric: { img: new Image(), ready: false, src: "images/shots/shot_electric.png" },
  fire: { img: new Image(), ready: false, src: "images/shots/shot_fire.png" },
  ice: { img: new Image(), ready: false, src: "images/shots/shot_ice.png" },
  laser: { img: new Image(), ready: false, src: "images/shots/shot_laser.png" },
  plasma: { img: new Image(), ready: false, src: "images/shots/shot_plasma.png" },
  pierce: { img: new Image(), ready: false, src: "images/shots/shot_bola.png" },
  rail: { img: new Image(), ready: false, src: "images/shots/shot_rail.png" }
};
Object.keys(shotIcons).forEach(function(key){
  var icon = shotIcons[key];
  icon.img.onload = function(){ icon.ready = true; };
  icon.img.src = icon.src;
});

var alienIconsByType = {
  scout: "images/aliens/alien_ET.png",
  alien_ET: "images/aliens/alien_ET.png",
  alien_brain: "images/aliens/alien_brain.png",
  alien_golem: "images/aliens/alien_golem.png",
  alien_galaga: "images/aliens/alien_galaga.png",
  alien_eye: "images/aliens/alien_eye.png",
  alien_saucer: "images/aliens/alien_saucer.png",
  alien_robot: "images/aliens/alien_robot.png",
  alien_spider: "images/aliens/alien_spider.png"
};

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

var shipSprites = {
  spire: { img: new Image(), ready: false, src: "images/ships/Verdant%20Spire.png" },
  am2: { img: new Image(), ready: false, src: "images/ships/AM3%20Scout.png" },
  fizard: { img: new Image(), ready: false, src: "images/ships/Aurora%20Dart.png" },
  mk7: { img: new Image(), ready: false, src: "images/ships/Crimson%20MK-7.png" },
  classic: { img: new Image(), ready: false, src: "images/ships/Scarlet%20Classic.png" },
  bu2x: { img: new Image(), ready: false, src: "images/ships/BU2X.png" },
  ember: { img: new Image(), ready: false, src: "images/ships/Ruby%20Strike.png" },
  azure: { img: new Image(), ready: false, src: "images/ships/Azure%20Lancer.png" },
  mantas: { img: new Image(), ready: false, src: "images/ships/Mantas%20-%20Arc%205.png" },
  cyan: { img: new Image(), ready: false, src: "images/ships/Cyan%20Vector%207.png" },
  veloz: { img: new Image(), ready: false, src: "images/ships/Veloz%20Mas.png" },
  verde9: { img: new Image(), ready: false, src: "images/ships/VER-DE-9.png" },
  whiteflame8: { img: new Image(), ready: false, src: "images/ships/White%20Flame%208.png" }
};
Object.keys(shipSprites).forEach(function(key){
  var sprite = shipSprites[key];
  sprite.img.onload = function(){ sprite.ready = true; };
  sprite.img.src = sprite.src;
});

var clawClosedImg = { img: new Image(), ready: false, src: "images/bullets/claw_closed.png" };
clawClosedImg.img.onload = function(){ clawClosedImg.ready = true; };
clawClosedImg.img.src = clawClosedImg.src;

var clawOpenImg = { img: new Image(), ready: false, src: "images/bullets/claw_open.png" };
clawOpenImg.img.onload = function(){ clawOpenImg.ready = true; };
clawOpenImg.img.src = clawOpenImg.src;

var mineralIconImg = { img: new Image(), ready: false, src: "images/asteroids/mineral.png" };
mineralIconImg.img.onload = function(){ mineralIconImg.ready = true; };
mineralIconImg.img.src = mineralIconImg.src;

var powerupCatalogSecondary = [
  { id: "repair", label: "Hull Repair", icon: powerupIcons.repair.src, desc: "Instant hull repair (+35%)." },
  { id: "time", label: "Time Dilation", icon: powerupIcons.time.src, desc: "Grants one Time Dilation charge (press X to slow time)." },
  { id: "magnet", label: "Magnet Sweep", icon: powerupIcons.magnet.src, desc: "Grants one Magnet Sweep charge (press X to pull the correct asteroid)." },
  { id: "emp", label: "EMP Burst", icon: powerupIcons.emp.src, desc: "Triggers immediately and cascades non-answer asteroids." },
  { id: "lock", label: "Target Lock", icon: powerupIcons.lock.src, desc: "Grants one Target Lock charge (press X to steer shots to the correct asteroid)." },
  { id: "autofire", label: "Auto-Fire", icon: powerupIcons.machinegun.src, desc: "Activates a rapid-fire magazine for the current shot type." },
  { id: "ammo", label: "Ammo Cache", icon: powerupIcons.ammo.src, desc: "Bonus ammo pickup for special weapon handling." },
  { id: "scope", label: "Scope", icon: powerupIcons.scope.src, desc: "Projects a laser guide to the nearest asteroid." }
];

var powerupCatalogDefense = [
  { id: "shield", label: "Shield", icon: powerupIcons.shield.src, desc: "Temporary shield for 10 seconds." },
  { id: "armor", label: "Armor", icon: powerupIcons.armor.src, desc: "Absorbs 5 hits before disarming." }
];

var powerupCatalogOffense = [
  { id: "missile", label: "Missile Shot", icon: shotIcons.missile ? shotIcons.missile.src : null, desc: "Type the correct answer to launch a seeking missile.", unlockType: "shot" },
  { id: "laser", label: "Laser Burst", icon: shotIcons.laser ? shotIcons.laser.src : null, desc: "High-speed laser shots for about 12 seconds.", unlockType: "shot", defaultUnlocked: true },
  { id: "fire", label: "Fireball", icon: shotIcons.fire ? shotIcons.fire.src : null, desc: "Fireball shots for about 12 seconds.", unlockType: "shot" },
  { id: "ice", label: "Ice Shards", icon: shotIcons.ice ? shotIcons.ice.src : null, desc: "Ice shots for about 12 seconds.", unlockType: "shot" },
  { id: "electric", label: "Electric Bolts", icon: shotIcons.electric ? shotIcons.electric.src : null, desc: "Electric bolts for about 12 seconds.", unlockType: "shot" },
  { id: "pierce", label: "Bola Shot", icon: shotIcons.pierce ? shotIcons.pierce.src : null, desc: "Piercing shots for about 12 seconds.", unlockType: "shot" },
  { id: "plasma", label: "Plasma Orb", icon: shotIcons.plasma ? shotIcons.plasma.src : null, desc: "Plasma shots for about 12 seconds.", unlockType: "shot" },
  { id: "rail", label: "Rail Beam", icon: shotIcons.rail ? shotIcons.rail.src : null, desc: "Rail beam shots for about 12 seconds.", unlockType: "shot" }
];

var shipCatalog = [
  { id: "classic", label: "Scarlet Classic", icon: "images/ships/Scarlet%20Classic.png", desc: "Retro heavy fighter with stable handling.", unlockType: "ship", defaultUnlocked: true },
  { id: "spire", label: "Verdant Spire", icon: "images/ships/Verdant%20Spire.png", desc: "Fast scout with flare support and single-center exhaust.", unlockType: "ship", defaultUnlocked: true },
  { id: "am2", label: "AM3 Scout", icon: "images/ships/AM3%20Scout.png", desc: "High mobility frame with teleport spin capability.", unlockType: "ship", defaultUnlocked: true },
  { id: "mk7", label: "Crimson MK-7", icon: "images/ships/Crimson%20MK-7.png", desc: "Balanced interceptor with broad wing profile.", unlockType: "ship" },
  { id: "fizard", label: "Aurora Dart", icon: "images/ships/Aurora%20Dart.png", desc: "Sleek dart frame tuned for precise movement.", unlockType: "ship" },
  { id: "bu2x", label: "BU2X", icon: "images/ships/BU2X.png", desc: "Experimental frame awaiting unlock clearance.", unlockType: "ship" },
  { id: "ember", label: "Ruby Strike", icon: "images/ships/Ruby%20Strike.png", desc: "Neon striker with aggressive profile.", unlockType: "ship" },
  { id: "azure", label: "Azure Lancer", icon: "images/ships/Azure%20Lancer.png", desc: "Aero spear frame with steady control.", unlockType: "ship" },
  { id: "mantas", label: "Mantas Arc-5", icon: "images/ships/Mantas%20-%20Arc%205.png", desc: "Advanced sweep-frame built for high-speed slalom.", unlockType: "ship" },
  { id: "cyan", label: "Cyan Vector 7", icon: "images/ships/Cyan%20Vector%207.png", desc: "High-precision vector craft with balanced handling.", unlockType: "ship" },
  { id: "veloz", label: "Veloz Mas", icon: "images/ships/Veloz%20Mas.png", desc: "Aggressive chase frame tuned for offensive runs.", unlockType: "ship" },
  { id: "verde9", label: "VER-DE-9", icon: "images/ships/VER-DE-9.png", desc: "Emerald vanguard frame with reinforced lanes and steady recoil control.", unlockType: "ship" },
  { id: "whiteflame8", label: "White Flame 8", icon: "images/ships/White%20Flame%208.png", desc: "Lumen spear chassis with a bright exhaust signature and clean lines.", unlockType: "ship" }
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
  { id: "electric_shot", label: "Electric Shot", desc: "Electric blaster.", when: "Electric shots.", badge: "SFX", src: "sfx/shots/electric_shot.mp3", category: "shots" },
  { id: "flame_shot", label: "Flame Shot", desc: "Fire blaster.", when: "Fire shots.", badge: "SFX", src: "sfx/shots/flame_shot.mp3", category: "shots" },
  { id: "shot_missile", label: "Missile Shot", desc: "Missile launch.", when: "Typing the correct answer with missile shot.", badge: "SFX", src: "sfx/shots/shot_missile.mp3", category: "shots" },
  { id: "shot_orb", label: "Plasma Orb", desc: "Plasma orb shot.", when: "Plasma shots.", badge: "SFX", src: "sfx/shots/shot_orb.mp3", category: "shots" },
  { id: "shot_railbeam", label: "Rail Beam", desc: "Rail beam shot.", when: "Rail shots.", badge: "SFX", src: "sfx/shots/shot_railbeam.mp3", category: "shots" },
  { id: "impact", label: "Impact", desc: "Collision hit.", when: "Ship hits and alien impacts.", badge: "SFX", src: "sfx/gameplay/impact.mp3", category: "gameplay" },
  { id: "impact_thud", label: "Impact Thud", desc: "Asteroid thud.", when: "Asteroid impacts and EMP cascade hits.", badge: "SFX", src: "sfx/gameplay/impact_thud.mp3", category: "gameplay" },
  { id: "correct", label: "Correct", desc: "Correct hit cue.", when: "Correct answer asteroid destroyed.", badge: "SFX", src: "sfx/gameplay/correct.mp3", category: "gameplay" },
  { id: "mineral_collected", label: "Mineral Collected", desc: "Mineral pickup.", when: "Collecting mineral drops.", badge: "SFX", src: "sfx/gameplay/mineral_collected.mp3", category: "gameplay" },
  { id: "ship_damage_alarm", label: "Ship Damage Alarm", desc: "Hull critical alarm.", when: "Ship is one hit from destruction.", badge: "SFX", src: "sfx/gameplay/ship_damage_alarm.mp3", category: "gameplay" },
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
  { id: "machine_gun_load", label: "Machine Gun Load", desc: "Spooling rounds.", when: "Auto-fire spin-up.", badge: "SFX", src: "sfx/shots/machine_gun_load.mp3", category: "shots" },
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

var catalogDetailOverlay = null;
var catalogDetailIcon = null;
var catalogDetailTitle = null;
var catalogDetailDesc = null;
var catalogDetailMeta = null;
var catalogDetailWhen = null;
var catalogDetailBadge = null;

function ensureCatalogDetailOverlay(){
  if(catalogDetailOverlay) return;
  catalogDetailOverlay = document.createElement("div");
  catalogDetailOverlay.id = "catalogDetailOverlay";
  catalogDetailOverlay.className = "overlay catalogDetailOverlay";
  catalogDetailOverlay.innerHTML = ""
    + "<div class=\"catalogDetailCard\">"
    + "  <button class=\"btn catalogDetailClose\" type=\"button\">Close</button>"
    + "  <div class=\"catalogDetailIcon\"></div>"
    + "  <div class=\"catalogDetailTitle\"></div>"
    + "  <div class=\"catalogDetailDesc\"></div>"
    + "  <div class=\"catalogDetailMeta\"></div>"
    + "  <div class=\"catalogDetailWhen\"></div>"
    + "  <div class=\"catalogDetailBadge\"></div>"
    + "</div>";
  catalogDetailOverlay.addEventListener("click", function(e){
    if(e.target === catalogDetailOverlay) closeCatalogDetail();
  });
  document.body.appendChild(catalogDetailOverlay);
  catalogDetailIcon = catalogDetailOverlay.querySelector(".catalogDetailIcon");
  catalogDetailTitle = catalogDetailOverlay.querySelector(".catalogDetailTitle");
  catalogDetailDesc = catalogDetailOverlay.querySelector(".catalogDetailDesc");
  catalogDetailMeta = catalogDetailOverlay.querySelector(".catalogDetailMeta");
  catalogDetailWhen = catalogDetailOverlay.querySelector(".catalogDetailWhen");
  catalogDetailBadge = catalogDetailOverlay.querySelector(".catalogDetailBadge");
  var closeBtn = catalogDetailOverlay.querySelector(".catalogDetailClose");
  if(closeBtn){
    closeBtn.addEventListener("click", closeCatalogDetail);
  }
}

function openCatalogDetail(item){
  if(!item) return;
  ensureCatalogDetailOverlay();
  catalogDetailIcon.innerHTML = "";
  if(item.icon){
    var img = document.createElement("img");
    img.src = item.icon;
    img.alt = item.label || "Catalog item";
    catalogDetailIcon.appendChild(img);
  }else if(item.badge){
    var badge = document.createElement("div");
    badge.className = "catalogMissing";
    badge.textContent = item.badge;
    catalogDetailIcon.appendChild(badge);
  }
  catalogDetailTitle.textContent = item.label || "Catalog Item";
  catalogDetailDesc.textContent = item.desc || "";
  catalogDetailMeta.textContent = item.src ? ("File: " + item.src) : "";
  catalogDetailWhen.textContent = item.when ? ("Plays: " + item.when) : "";
  catalogDetailBadge.textContent = item.badge ? String(item.badge) : "";
  catalogDetailOverlay.classList.add("show");
}

function closeCatalogDetail(){
  if(catalogDetailOverlay) catalogDetailOverlay.classList.remove("show");
}

function spawnMineralPickupFx(x, y){
  var beams = 7;
  var baseAngle = -Math.PI / 2;
  for(var i=0; i<beams; i++){
    var ang = baseAngle + (i / beams) * Math.PI * 2;
    var dirX = Math.cos(ang);
    var dirY = Math.sin(ang);
    spawnDirectedSparks(x, y, dirX, dirY, 0.20, 12, 220, 520, 0.10, 0.24, "mineral");
    spawnDirectedSparks(x, y, dirX, dirY, 0.18, 6, 180, 360, 0.10, 0.22, "spark_white");
  }
  spawnParticles(x, y, "mineral");
}

function spawnMineralValuePopup(x, y, amount){
  var value = Math.max(1, Number(amount) || 1);
  mineralPopups.push({
    x: x,
    y: y - 8,
    vy: -42,
    drift: rand(-12, 12),
    life: 0.8,
    alpha: 1,
    text: "+" + value
  });
  if(mineralPopups.length > 40){
    mineralPopups.splice(0, mineralPopups.length - 40);
  }
}

function updateMineralPopups(dt){
  for(var i=mineralPopups.length-1; i>=0; i--){
    var pop = mineralPopups[i];
    pop.life -= dt;
    if(pop.life <= 0){
      mineralPopups.splice(i,1);
      continue;
    }
    pop.y += pop.vy * dt;
    pop.x += pop.drift * dt;
    pop.alpha = Math.max(0, Math.min(1, pop.life / 0.8));
  }
}

function updateMineralHudPulse(dt){
  if(mineralHudPulse > 0){
    mineralHudPulse = Math.max(0, mineralHudPulse - dt * 2.6);
  }
}

function drawMineralPopups(){
  if(!mineralPopups.length) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 20px Oxanium, sans-serif";
  for(var i=0; i<mineralPopups.length; i++){
    var pop = mineralPopups[i];
    ctx.globalAlpha = pop.alpha;
    ctx.shadowColor = "rgba(120,220,255,.85)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(182,240,255,.98)";
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.restore();
}

function loadUnlockIds(key){
  try{
    var raw = localStorage.getItem(key);
    if(raw){
      var parsed = JSON.parse(raw);
      if(Array.isArray(parsed)) return parsed;
    }
  }catch(e){}
  return [];
}

function isCatalogItemLocked(item, unlockMap){
  if(!item || !item.unlockType) return false;
  if(item.defaultUnlocked) return false;
  var list = unlockMap[item.unlockType] || [];
  return list.indexOf(item.id) === -1;
}

function renderIconCatalogList(listEl, items, filter){
  if(!listEl) return;
  listEl.innerHTML = "";
  var list = items || [];
  var unlockMap = {
    ship: loadUnlockIds("mentaris.unlocks.ships"),
    shot: loadUnlockIds("mentaris.unlocks.shots")
  };
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
    var itemLocked = isCatalogItemLocked(item, unlockMap);
    var li = document.createElement("li");
    li.className = "catalogItem catalogIconOnly";
    if(itemLocked) li.classList.add("isLocked");
    li.setAttribute("role", "button");
    li.tabIndex = 0;

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

    (function(itemRef, liRef){
      liRef.addEventListener("click", function(){ openCatalogDetail(itemRef); });
      liRef.addEventListener("keydown", function(e){
        if(e.key === "Enter" || e.key === " "){
          e.preventDefault();
          openCatalogDetail(itemRef);
        }
      });
    })(item, li);

    li.appendChild(icon);
    if(itemLocked){
      var lockTag = document.createElement("div");
      lockTag.className = "catalogLockTag";
      lockTag.textContent = "LOCKED";
      li.appendChild(lockTag);
    }
    listEl.appendChild(li);
  }
}

function renderSfxCatalogList(listEl, items, filter){
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
    li.className = "catalogItem catalogSfxRow";

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
      missing.textContent = item.badge || "SFX";
      icon.appendChild(missing);
    }

    var text = document.createElement("div");
    text.className = "catalogText";
    var title = document.createElement("div");
    title.className = "catalogTitle";
    title.textContent = item.label || "Audio";
    if(item.badge){
      var tag = document.createElement("span");
      tag.className = "catalogTag";
      tag.textContent = String(item.badge);
      title.appendChild(tag);
    }
    text.appendChild(title);
    if(item.desc){
      var desc = document.createElement("div");
      desc.className = "catalogDesc";
      desc.textContent = item.desc;
      text.appendChild(desc);
    }
    if(item.when){
      var when = document.createElement("div");
      when.className = "catalogWhen";
      when.textContent = "Plays: " + item.when;
      text.appendChild(when);
    }
    if(item.src){
      var meta = document.createElement("div");
      meta.className = "catalogMeta";
      meta.textContent = "File: " + item.src;
      text.appendChild(meta);
    }

    var controls = document.createElement("div");
    controls.className = "catalogControls";
    var playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.className = "btn catalogControlBtn";
    playBtn.textContent = "\u25B6";
    playBtn.title = "Play";
    playBtn.setAttribute("aria-label", "Play");
    var stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.className = "btn catalogControlBtn";
    stopBtn.textContent = "\u25A0";
    stopBtn.title = "Stop";
    stopBtn.setAttribute("aria-label", "Stop");
    var duration = document.createElement("span");
    duration.className = "catalogDuration";
    duration.textContent = "--:--";
    controls.appendChild(playBtn);
    controls.appendChild(stopBtn);
    controls.appendChild(duration);

    (function(itemRef, durationEl){
      function ensurePlayer(){
        if(!itemRef.src) return null;
        if(!previewPlayers[itemRef.id]){
          var audio = new Audio();
          audio.preload = "metadata";
          audio.src = itemRef.src;
          previewPlayers[itemRef.id] = audio;
        }
        var audioRef = previewPlayers[itemRef.id];
        function syncDuration(){
          if(isFinite(audioRef.duration) && audioRef.duration > 0){
            durationEl.textContent = formatDuration(audioRef.duration);
          }
        }
        audioRef.addEventListener("loadedmetadata", syncDuration);
        audioRef.addEventListener("durationchange", syncDuration);
        try{ audioRef.load(); }catch(e){}
        syncDuration();
        return audioRef;
      }
      var preload = ensurePlayer();
      if(preload && isFinite(preload.duration) && preload.duration > 0){
        durationEl.textContent = formatDuration(preload.duration);
      }
      playBtn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        var audio = ensurePlayer();
        if(!audio) return;
        if(activePreview && activePreview !== itemRef.id && previewPlayers[activePreview]){
          stopPreviewAudio(previewPlayers[activePreview]);
        }
        audio.volume = getPreviewBaseVolume() * getPreviewItemVolume(itemRef.id);
        audio.currentTime = 0;
        audio.play().then(function(){
          activePreview = itemRef.id;
        }).catch(function(){});
      });
      stopBtn.addEventListener("click", function(e){
        e.preventDefault();
        e.stopPropagation();
        var audio = previewPlayers[itemRef.id];
        if(audio) stopPreviewAudio(audio);
        if(activePreview === itemRef.id) activePreview = null;
      });
    })(item, duration);

    li.appendChild(icon);
    li.appendChild(text);
    li.appendChild(controls);
    listEl.appendChild(li);
  }
}

var catalogFilterState = { active: "secondary" };

function initCatalogFilters(){
  var panel = document.querySelector('.settingsPanel[data-settings-panel="catalogs"]');
  if(!panel || panel.dataset.filtersReady === "1") return;
  var buttons = panel.querySelectorAll(".catalogFilterBtn");
  var sections = panel.querySelectorAll("[data-catalog-section]");
  if(!buttons.length || !sections.length) return;
  panel.dataset.filtersReady = "1";
  buttons.forEach(function(btn){
    btn.addEventListener("click", function(){
      setCatalogFilter(btn.getAttribute("data-catalog-filter"));
    });
  });
  setCatalogFilter(catalogFilterState.active || buttons[0].getAttribute("data-catalog-filter"));
}

function setCatalogFilter(filter){
  var panel = document.querySelector('.settingsPanel[data-settings-panel="catalogs"]');
  if(!panel) return;
  var buttons = panel.querySelectorAll(".catalogFilterBtn");
  var sections = panel.querySelectorAll("[data-catalog-section]");
  var active = filter || "all";
  catalogFilterState.active = active;
  buttons.forEach(function(btn){
    btn.classList.toggle("active", btn.getAttribute("data-catalog-filter") === active);
  });
  sections.forEach(function(section){
    var sectionKey = section.getAttribute("data-catalog-section");
    section.style.display = (active === "all" || sectionKey === active) ? "" : "none";
  });
}

function renderSettingsCatalogs(){
  stopAllPreviewAudio();
  previewPlayers = {};
  renderIconCatalogList(powerupsSecondaryList, powerupCatalogSecondary);
  renderIconCatalogList(powerupsDefenseList, powerupCatalogDefense);
  renderIconCatalogList(powerupsOffenseList, powerupCatalogOffense);
  renderIconCatalogList(shipsCatalogList, shipCatalog);
  renderSfxCatalogList(sfxList, sfxCatalog, function(item){
    if(!activeSfxCategory || activeSfxCategory === "all") return true;
    return item.category === activeSfxCategory;
  });
  initCatalogFilters();
}

var powerupManager = new PowerupManager(state, player);
renderSettingsCatalogs();

function configureAliensDifficulty(){
  if(sandboxMode && state.sandboxAlienWaveActive){
    alienConfig.enabled = true;
    alienConfig.maxOnScreen = 7;
    alienConfig.spawnCooldown = 1.2;
    return;
  }
  if(state.alienSwarm){
    alienConfig.enabled = true;
    alienConfig.maxOnScreen = 4;
    alienConfig.spawnCooldown = 5.5;
    return;
  }
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
  am2: { speed: 600, response: 17, dashDist: 130, dashCooldown: 1.9, shockwaveRadius: 160, shockwaveStrength: 520, shockwaveCooldown: 4.2, ability: "spin", accelUp: 7.2, accelDown: 9.0 },
  mk7: { ability: "downshock" },
  ember: { ability: "overflight" },
  azure: { ability: "overflight" },
  fizard: { ability: "phase" },
  bu2x: { ability: "knock3" },
  verde9: { ability: "knock3" },
  mantas: { ability: "shockwave" },
  cyan: { ability: "compass" },
  veloz: { ability: "compass" },
  whiteflame8: { ability: "frontclear" }
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
var keybindStorageKey = "mentaris.keybinds";
var keyBindings = {
  shoot: "space",
  secondary: "e",
  special: "q",
  dash: "shiftleft"
};
var keybindCapture = null;
var keybindButtons = Array.prototype.slice.call(document.querySelectorAll(".keyBindBtn"));
var reservedKeys = new Set(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"]);

function normalizeKeyEvent(e){
  var code = e.code || "";
  if(code === "Space") return "space";
  if(code === "ShiftLeft") return "shiftleft";
  if(code === "ShiftRight") return "shiftright";
  var k = (e.key || "").toLowerCase();
  if(k === " ") return "space";
  return k;
}

function displayKeyName(key){
  if(key === "space") return "SPACE";
  if(key === "shiftleft" || key === "shiftright") return "SHIFT";
  if(key === "escape") return "ESC";
  return String(key || "").toUpperCase();
}

function loadKeyBindings(){
  try{
    var raw = localStorage.getItem(keybindStorageKey);
    if(!raw) return;
    var parsed = JSON.parse(raw);
    if(parsed && typeof parsed === "object"){
      if(typeof parsed.shoot === "string") keyBindings.shoot = parsed.shoot.toLowerCase();
      if(typeof parsed.secondary === "string") keyBindings.secondary = parsed.secondary.toLowerCase();
      if(typeof parsed.special === "string") keyBindings.special = parsed.special.toLowerCase();
      if(typeof parsed.dash === "string") keyBindings.dash = parsed.dash.toLowerCase();
    }
  }catch(e){}
}

function saveKeyBindings(){
  try{ localStorage.setItem(keybindStorageKey, JSON.stringify(keyBindings)); }catch(e){}
}

function updateKeybindButtons(){
  if(!keybindButtons || !keybindButtons.length) return;
  keybindButtons.forEach(function(btn){
    var action = btn.getAttribute("data-bind");
    if(!action || !keyBindings[action]) return;
    btn.textContent = displayKeyName(keyBindings[action]);
    btn.classList.toggle("listening", keybindCapture === action);
  });
}

loadKeyBindings();
updateKeybindButtons();

function setKeyBinding(action, key){
  if(!action || !key) return;
  keyBindings[action] = key;
  saveKeyBindings();
  updateKeybindButtons();
}

function isTextInput(el){
  if(!el) return false;
  var tag = (el.tagName || "").toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

window.addEventListener("keydown", function(e){
  if(keybindCapture){
    e.preventDefault();
    var captureKey = normalizeKeyEvent(e);
    if(captureKey === "escape"){
      keybindCapture = null;
      updateKeybindButtons();
      return;
    }
    if(reservedKeys.has(captureKey)){
      showToast("KEY RESERVED FOR MOVEMENT");
      return;
    }
    setKeyBinding(keybindCapture, captureKey);
    keybindCapture = null;
    updateKeybindButtons();
    return;
  }
  if(isTextInput(document.activeElement)) return;
  var k = (e.key || "").toLowerCase();
  var code = e.code || "";
  var keyNorm = normalizeKeyEvent(e);
  var prevent = ["arrowleft","arrowright","arrowup","arrowdown","a","d","w","s","p","r","m","b","1","2","3","0"];
  if(keyBindings.shoot){
    prevent.push(keyBindings.shoot);
    if(keyBindings.shoot === "space") prevent.push(" ", "spacebar");
  }
  if(keyBindings.secondary) prevent.push(keyBindings.secondary);
  if(keyBindings.special) prevent.push(keyBindings.special);
  if(keyBindings.dash){
    prevent.push(keyBindings.dash);
    if(keyBindings.dash === "shiftleft" || keyBindings.dash === "shiftright") prevent.push("shift");
  }
  if(prevent.indexOf(k) !== -1 || prevent.indexOf(keyNorm) !== -1 || code === "Digit1" || code === "Digit2" || code === "Digit3" || code === "Numpad1" || code === "Numpad2" || code === "Numpad3") e.preventDefault();

  keys.add(keyNorm);
  if(!audioPrimed){
    unlockSfx(state);
    audioPrimed = true;
  }
  if(tutorialActive && tutorialMineralsFreeze){
    return;
  }
  if(k === "p") togglePause();
  if(k === "0") toggleScreenshot();
  if(k === "r") hardRestart();
  if(k === "m") openSettings();
  if(keyNorm === keyBindings.shoot && !e.repeat){
    if(tutorialActive && (tutorialShootLocked || tutorialMineralsFreeze)){
      return;
    }
    if((player.blasterMode || "single") === "missile"){
      openMissileInput();
    }else if(player.autoFireActive && player.autoFireAmmo > 0){
      // Auto-fire has a spin-up delay before firing.
    }else{
      fire();
    }
  }
  if((k === "w" || k === "arrowup") && !e.repeat && state.running && !state.paused && !state.over){
    playSfx(state, "ship_advance");
  }
  if(keyNorm === keyBindings.secondary){
    secondaryFire();
  }
  if(k === "1" || code === "Digit1" || code === "Numpad1") selectSecondaryByIndex(0);
  if(k === "2" || code === "Digit2" || code === "Numpad2") selectSecondaryByIndex(1);
  if(k === "3" || code === "Digit3" || code === "Numpad3") selectSecondaryByIndex(2);
  if(keyNorm === keyBindings.special){
    if(isStampedeMode()){
      player.clawHoldKey = true;
      player.clawHold = 0;
    }else{
      shockwave();
    }
  }
  if(k === "b"){
    if(isSandboxMultiplayer()){
      var p2 = ensurePilot2();
      setPilot2MouseControl(!p2.mouseControlEnabled, false);
    }else{
      if(tutorialActive && tutorialMovementPreference && tutorialMovementPreference !== "mouse"){
        if(mousepadActive) setMousepadActive(false);
        showToast("MOUSE PILOT NOT SELECTED");
        return;
      }
      if(!mousepadActive){
        setMousepadActive(true);
        showToast("MOUSEPAD: HYBRID");
      }else{
        setMousepadActive(false);
        showToast("MOUSEPAD OFF");
      }
    }
  }
  if(keyNorm === keyBindings.dash && !e.repeat) dash();
}, {passive:false});

window.addEventListener("keyup", function(e){
  if(isTextInput(document.activeElement)) return;
  var keyNorm = normalizeKeyEvent(e);
  keys.delete(keyNorm);
  if(keyNorm === keyBindings.special && isStampedeMode()){
    player.clawHoldKey = false;
    player.clawHold = 0;
  }
});

// Pointer controls
var pointerDown = false;
var lastPointerX = null;
var lastPointerY = null;
var pointerDragEnabled = false;
var virtualPad = document.getElementById("virtualPad");
var controlPad = document.getElementById("controlPad");
var padStatus = document.getElementById("padStatus");
var virtualKnob = document.getElementById("virtualKnob");
var padMode = document.getElementById("padMode");
var touchControlDock = document.getElementById("touchControlDock");
var touchDockHideBtn = document.getElementById("touchDockHideBtn");
var touchMovePad = document.getElementById("touchMovePad");
var touchMoveKnob = document.getElementById("touchMoveKnob");
var touchBtnFire = document.getElementById("touchBtnFire");
var touchBtnDash = document.getElementById("touchBtnDash");
var touchBtnSpecial = document.getElementById("touchBtnSpecial");
var touchBtnSecondary = document.getElementById("touchBtnSecondary");
var touchBtnSlot1 = document.getElementById("touchBtnSlot1");
var touchBtnSlot2 = document.getElementById("touchBtnSlot2");
var touchBtnSlot3 = document.getElementById("touchBtnSlot3");
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
var touchMoveAxes = { x: 0, y: 0 };
var touchMovePointerId = null;
var touchMoveCenter = { x: 0, y: 0, radius: 0 };
var touchMoveDeadzone = 0.22;
var touchMoveKnobDistance = 0.82;
var touchActionHeld = { fire: false, dash: false, special: false, secondary: false };
var touchActionPointers = {};
var touchButtonMap = {};
var asteroidFallSpeedScale = 0.94;
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
var missionBriefPausedByBrief = false;
var missionBriefWasRunning = false;
var missionBriefPausedBefore = false;

function resetMousepadPadSettings(){
  mousepadSensitivityPad = mousepadPadDefaults.sensitivityPad;
  mousepadSensitivityPadMode = mousepadPadDefaults.sensitivityPadMode;
  mousepadSensitivityFps = mousepadPadDefaults.sensitivityFps;
  mousepadDeadzonePad = mousepadPadDefaults.deadzone;
}

function isSandboxMultiplayer(){
  return !!(sandboxMode && state.sandboxTwoPilots);
}

function isSandboxSplitMode(){
  return isSandboxMultiplayer() && state.sandboxTwoPilotsMode === "split";
}

function clampPilotToLane(pilot, laneId){
  if(!pilot || !isSandboxSplitMode()) return;
  var lane = getLaneBounds(laneId);
  var minX = lane.minX + pilot.w / 2 + 2;
  var maxX = lane.maxX - pilot.w / 2 - 2;
  if(maxX < minX){
    var mid = (lane.minX + lane.maxX) / 2;
    minX = mid;
    maxX = mid;
  }
  pilot.x = clamp(pilot.x, minX, maxX);
}

function getLaneIdForX(x){
  var r = canvas.getBoundingClientRect();
  if(!isSandboxSplitMode()) return x < r.width * 0.5 ? 1 : 2;
  var lane1 = getLaneBounds(1);
  var lane2 = getLaneBounds(2);
  if(x <= lane1.maxX) return 1;
  if(x >= lane2.minX) return 2;
  return 0;
}

function resetPilotShotType(pilot){
  if(!pilot) return;
  pilot.blasterMode = "single";
  pilot.blasterHitsRemaining = 0;
  pilot.blasterTimer = 0;
}

function clearScopeOnHitForPilot(pilot){
  if(pilot && pilot.scopeTimer > 0){
    pilot.scopeTimer = 0;
  }
}

function registerShotTypeHitForPilot(pilot, amount, forceClear){
  if(!pilot) return;
  if(pilot.blasterMode === "single") return;
  if(forceClear){
    resetPilotShotType(pilot);
    return;
  }
  var hits = (typeof pilot.blasterHitsRemaining === "number") ? pilot.blasterHitsRemaining : 0;
  hits -= (amount || 1);
  pilot.blasterHitsRemaining = Math.max(0, hits);
  if(pilot.blasterHitsRemaining <= 0){
    resetPilotShotType(pilot);
  }
}

function cyclePilotPowerup(pilot, direction){
  if(!pilot) return;
  var slots = getSecondarySlotsForPilot(pilot);
  if(!slots.length) return;
  var idx = clamp(pilot.secondarySlotIndex | 0, 0, slots.length - 1);
  for(var i=0; i<slots.length; i++){
    idx = (idx + direction + slots.length) % slots.length;
    var slot = slots[idx];
    if(slot && slot.type && slot.count > 0){
      pilot.secondarySlotIndex = idx;
      syncSelectedSecondaryForPilot(pilot);
      showToast("SECONDARY -> " + slot.type.toUpperCase());
      return;
    }
  }
}

function updatePilot2Mouse(e){
  if(!isSandboxMultiplayer()) return;
  var p2 = ensurePilot2();
  if(!p2.mouseControlEnabled) return;
  var rect = canvas.getBoundingClientRect();
  var rawX = clamp(e.clientX - rect.left, 0, rect.width);
  if(isSandboxSplitMode()){
    var lane = getLaneBounds(2);
    rawX = clamp(rawX, lane.minX, lane.maxX);
  }
  pilot2Mouse.x = rawX;
  pilot2Mouse.y = clamp(e.clientY - rect.top, 0, rect.height);
  pilot2Mouse.has = true;
}

function positionSandboxPilots(){
  if(!isSandboxMultiplayer()) return;
  var r = canvas.getBoundingClientRect();
  var hudH = document.getElementById("hud").getBoundingClientRect().height;
  var topLimit = hudH + 14;
  var bottomLimit = r.height - 18;
  var y = clamp(r.height - 90, topLimit + player.h/2 + 6, bottomLimit - player.h/2);
  if(isSandboxSplitMode()){
    var lane1 = getLaneBounds(1);
    var lane2 = getLaneBounds(2);
    player.x = clamp((lane1.minX + lane1.maxX) * 0.5, lane1.minX + player.w/2 + 2, lane1.maxX - player.w/2 - 2);
    player.y = y;
    var p2Split = ensurePilot2();
    p2Split.x = clamp((lane2.minX + lane2.maxX) * 0.5, lane2.minX + p2Split.w/2 + 2, lane2.maxX - p2Split.w/2 - 2);
    p2Split.y = y;
    pilot2Mouse.x = p2Split.x;
    pilot2Mouse.y = p2Split.y;
    pilot2Mouse.has = true;
    return;
  }
  player.x = clamp(r.width * 0.25, player.w/2 + 10, r.width - player.w/2 - 10);
  player.y = y;
  var p2 = ensurePilot2();
  p2.x = clamp(r.width * 0.75, p2.w/2 + 10, r.width - p2.w/2 - 10);
  p2.y = y;
  pilot2Mouse.x = p2.x;
  pilot2Mouse.y = p2.y;
  pilot2Mouse.has = true;
}

function tickPilotTimers(pilot, dtReal){
  if(!pilot) return;
  pilot.lowHullPulse = Math.max(0, (pilot.lowHullPulse || 0) - dtReal);
  pilot.cooldown = Math.max(0, pilot.cooldown - dtReal);
  pilot.invuln = Math.max(0, pilot.invuln - dtReal);
  pilot.hitFlash = Math.max(0, pilot.hitFlash - dtReal * 3.6);
  pilot.shipShake = Math.max(0, (pilot.shipShake || 0) - dtReal * 3.2);
  if(pilot.teleportHide > 0){
    pilot.teleportHide = Math.max(0, pilot.teleportHide - dtReal);
  }
  if(pilot.teleportFx){
    pilot.teleportFx.t += dtReal;
    if(!pilot.teleportFx.reappearPlayed && pilot.teleportFx.t >= (pilot.teleportFx.hide || 0)){
      pilot.teleportFx.reappearPlayed = true;
      playSfx(state, "teleport_reappear");
    }
    var fxTotal = Math.max(pilot.teleportFx.ghostDur || 0, (pilot.teleportFx.hide || 0) + (pilot.teleportFx.zoomDur || 0));
    if(pilot.teleportFx.t >= fxTotal){
      pilot.teleportFx = null;
    }
  }
  pilot.recoil = Math.max(0, pilot.recoil - dtReal * 9);
  pilot.flash = Math.max(0, pilot.flash - dtReal * 12);
  applyEasyRegen(pilot, dtReal);
  if(pilot.secondaryCooldown > 0){
    pilot.secondaryCooldown = Math.max(0, pilot.secondaryCooldown - dtReal);
  }
  if(pilot.blasterMode !== "single" && !(pilot.blasterHitsRemaining > 0)){
    resetPilotShotType(pilot);
  }
  if(pilot.defenseMode === "armor"){
    if(!(pilot.armorBlocksRemaining > 0)){
      pilot.defenseMode = "none";
      pilot.defenseTimer = 0;
    }
  }else if(pilot.defenseTimer > 0){
    pilot.defenseTimer = Math.max(0, pilot.defenseTimer - dtReal);
    if(pilot.defenseTimer === 0) pilot.defenseMode = "none";
  }
  if(pilot.magnetTimer > 0){
    pilot.magnetTimer = Math.max(0, pilot.magnetTimer - dtReal);
  }
  if(pilot.lockTimer > 0){
    pilot.lockTimer = Math.max(0, pilot.lockTimer - dtReal);
    if(pilot.lockTimer === 0) pilot.lockTargetId = 0;
  }
}

function createPilotStats(){
  return {
    score: 0,
    correct: 0,
    wrong: 0,
    missed: 0,
    streak: 0,
    hits: 0,
    shots: 0,
    shotCounts: {},
    powerupsCollected: 0,
    powerupsMissed: 0,
    powerupsUsed: 0,
    powerupsCollectedByType: {},
    powerupsUsedByType: {},
    powerupsMissedByType: {}
  };
}

function ensurePilotStats(pilotId){
  if(!pilotStats[pilotId]) pilotStats[pilotId] = createPilotStats();
  return pilotStats[pilotId];
}

function resetPilotStats(pilotId){
  pilotStats[pilotId] = createPilotStats();
}

function recordPilotShot(pilotId, mode){
  var stats = ensurePilotStats(pilotId);
  stats.shots += 1;
  var key = String(mode || "single");
  stats.shotCounts[key] = (stats.shotCounts[key] || 0) + 1;
}

function recordPilotCorrect(pilotId){
  var stats = ensurePilotStats(pilotId);
  stats.correct += 1;
  stats.hits += 1;
  stats.streak += 1;
  var baseGain = 50 + Math.min(250, stats.streak * 10);
  var factor = Math.max(state.a, state.b);
  if(isDigitMode()) factor = state.b;
  if(isAdditionMode()){
    factor = clamp(Math.round(factor / 10), 2, 30);
  }else{
    factor = clamp(factor, 2, 12);
  }
  var weight = 1 + (factor / 12) * 0.6;
  stats.score += Math.round(baseGain * weight);
}

function recordPilotWrong(pilotId){
  var stats = ensurePilotStats(pilotId);
  stats.wrong += 1;
  stats.hits += 1;
  stats.streak = 0;
  stats.score = Math.max(0, stats.score - 60);
}

function recordPilotMissed(pilotId){
  var stats = ensurePilotStats(pilotId);
  stats.missed += 1;
  stats.streak = 0;
}

function clonePilotFromPlayer(src){
  var p = createPlayer();
  for(var key in src){
    if(!Object.prototype.hasOwnProperty.call(src, key)) continue;
    var val = src[key];
    if(val && typeof val === "object"){
      p[key] = Array.isArray(val) ? val.slice() : Object.assign({}, val);
    }else{
      p[key] = val;
    }
  }
  p.invuln = 0;
  p.hidden = false;
  p.mouseControlEnabled = true;
  p.secondarySlots = [null, null, null];
  p.secondaryInventory = {};
  p.secondaryMode = "none";
  p.secondaryCharges = 0;
  p.secondarySlotIndex = 0;
  p.secondaryCooldown = 0;
  p.autoFireActive = false;
  p.autoFireAmmo = 0;
  p.autoFireAmmoMax = 0;
  p.livesStart = Math.max(0, state.livesStart || state.lives || 0);
  p.lives = p.livesStart;
  p.dead = false;
  return p;
}

function ensurePilot2(){
  if(!pilot2){
    pilot2 = clonePilotFromPlayer(player);
  }
  return pilot2;
}

function setPilot2MouseControl(enabled, silent){
  var p2 = ensurePilot2();
  p2.mouseControlEnabled = !!enabled;
  if(p2.mouseControlEnabled){
    pilot2Mouse.has = true;
    pilot2Mouse.x = p2.x;
    pilot2Mouse.y = p2.y;
  }
  if(!silent){
    showToast(p2.mouseControlEnabled ? "PILOT 2 MOUSE ON" : "PILOT 2 MOUSE OFF");
  }
}

function pickAlternateShipType(primary){
  var order = ["classic","spire","am2","mk7","fizard","ember","azure","bu2x","mantas","cyan","veloz","verde9","whiteflame8"];
  var idx = order.indexOf(primary);
  if(idx < 0) idx = 0;
  for(var i=1; i<=order.length; i++){
    var next = order[(idx + i) % order.length];
    if(next && next !== primary) return next;
  }
  return primary || "mk7";
}

function setMissionBriefActive(active){
  missionBriefShowing = !!active;
  if(active){
    missionBriefWasRunning = !!(state.running && !state.over);
    missionBriefPausedBefore = !!state.paused;
    missionBriefPausedByBrief = missionBriefWasRunning && !missionBriefPausedBefore;
    if(missionBriefPausedByBrief){
      state.paused = true;
      syncTimerPause();
    }
    // Mission brief should suspend all live game activity.
    state.over = false;
    state.running = false;
    state.hideAsteroids = true;
    player.hidden = true;
    missionClearFx.active = false;
    gameOverFx.active = false;
    gameOverFx.shown = false;
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
    setSoundtrack(state, state.sound && !state.over && (state.running || countdownActive || introActive || missionBriefShowing));
  }else{
    state.hideAsteroids = false;
    player.hidden = false;
    if(missionBriefPausedByBrief){
      state.paused = missionBriefPausedBefore;
      syncTimerPause();
    }
    missionBriefPausedByBrief = false;
    missionBriefWasRunning = false;
  }
  updateCursorVisibility();
}

resetMousepadPadSettings();

window.addEventListener("unhandledrejection", function(evt){
  var reason = evt && evt.reason;
  if(!reason) return;
  var msg = String((reason && reason.message) || reason || "");
  if(reason.name === "AbortError" && /play\(\) request was interrupted/i.test(msg)){
    evt.preventDefault();
  }
});

function updateCursorVisibility(){
  if(tutorialActive && tutorialStepId === "platform_choice" && !tutorialPlatformChoiceResolved){
    document.body.style.cursor = "";
    return;
  }
  if(tutorialActive && tutorialStepId === "movement_preference"){
    document.body.style.cursor = "";
    return;
  }
  if(tutorialActive && tutorialMineralsFreeze){
    document.body.style.cursor = "";
    return;
  }
  if(missileInputActive){
    document.body.style.cursor = "";
    return;
  }
  if(sandboxMode){
    document.body.style.cursor = "";
    return;
  }
  if(mousepadActive) return;
  var hide = state.running && !state.paused && !screenshotMode && !missionBriefShowing;
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
bindTouchControls();

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

function isTouchInputAllowed(){
  if(!touchControlsEnabled) return false;
  if(touchControlsDockHidden) return false;
  if(!state.running || state.paused || state.over) return false;
  if(tutorialActive && tutorialMineralsFreeze) return false;
  if(missileInputActive || missionBriefShowing || countdownActive || introActive) return false;
  if(overlayMenu && overlayMenu.classList.contains("show")) return false;
  if(overlayEnd && overlayEnd.classList.contains("show")) return false;
  return true;
}

function setTouchButtonPressed(action, pressed){
  var btn = touchButtonMap[action];
  if(!btn) return;
  btn.classList.toggle("is-pressed", !!pressed);
}

function resetTouchMovePad(){
  touchMoveAxes.x = 0;
  touchMoveAxes.y = 0;
  touchMovePointerId = null;
  if(touchMoveKnob){
    touchMoveKnob.style.transform = "translate(-50%, -50%)";
  }
}

function resetTouchInputState(){
  resetTouchMovePad();
  touchActionHeld.fire = false;
  touchActionHeld.dash = false;
  touchActionHeld.special = false;
  touchActionHeld.secondary = false;
  touchActionPointers = {};
  setTouchButtonPressed("fire", false);
  setTouchButtonPressed("dash", false);
  setTouchButtonPressed("special", false);
  setTouchButtonPressed("secondary", false);
}

function updateTouchMoveFromPointer(e){
  if(!touchMovePad) return;
  var rect = touchMovePad.getBoundingClientRect();
  var cx = rect.left + rect.width / 2;
  var cy = rect.top + rect.height / 2;
  var maxR = Math.min(rect.width, rect.height) * 0.42;
  touchMoveCenter.x = cx;
  touchMoveCenter.y = cy;
  touchMoveCenter.radius = maxR;
  var rawDx = clamp(e.clientX - cx, -maxR, maxR);
  var rawDy = clamp(e.clientY - cy, -maxR, maxR);
  var rawDist = Math.hypot(rawDx, rawDy);
  if(maxR <= 0 || rawDist <= (maxR * touchMoveDeadzone)){
    touchMoveAxes.x = 0;
    touchMoveAxes.y = 0;
    if(touchMoveKnob){
      touchMoveKnob.style.transform = "translate(-50%, -50%)";
    }
    return;
  }
  var angle = Math.atan2(rawDy, rawDx);
  var step = Math.PI / 4;
  var snappedAngle = Math.round(angle / step) * step;
  touchMoveAxes.x = Math.cos(snappedAngle);
  touchMoveAxes.y = Math.sin(snappedAngle);
  var knobR = maxR * touchMoveKnobDistance;
  var dx = touchMoveAxes.x * knobR;
  var dy = touchMoveAxes.y * knobR;
  if(touchMoveKnob){
    touchMoveKnob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
  }
}

function onTouchActionPress(action){
  if(!isTouchInputAllowed()) return;
  if(action === "fire"){
    touchActionHeld.fire = true;
    setTouchButtonPressed("fire", true);
    var autoSpinControlled = player.autoFireActive && (player.autoFireAmmo > 0);
    if((!tutorialActive || !tutorialShootLocked) && !autoSpinControlled){
      fire();
    }
    return;
  }
  if(action === "dash"){
    touchActionHeld.dash = true;
    setTouchButtonPressed("dash", true);
    dash();
    return;
  }
  if(action === "special"){
    touchActionHeld.special = true;
    setTouchButtonPressed("special", true);
    shockwave();
    return;
  }
  if(action === "secondary"){
    touchActionHeld.secondary = true;
    setTouchButtonPressed("secondary", true);
    secondaryFire();
    return;
  }
  if(action === "slot1") selectSecondaryByIndex(0);
  if(action === "slot2") selectSecondaryByIndex(1);
  if(action === "slot3") selectSecondaryByIndex(2);
}

function onTouchActionRelease(action){
  if(action === "fire"){
    touchActionHeld.fire = false;
    setTouchButtonPressed("fire", false);
  }else if(action === "dash"){
    touchActionHeld.dash = false;
    setTouchButtonPressed("dash", false);
  }else if(action === "special"){
    touchActionHeld.special = false;
    setTouchButtonPressed("special", false);
  }else if(action === "secondary"){
    touchActionHeld.secondary = false;
    setTouchButtonPressed("secondary", false);
  }
}

function bindTouchControls(){
  touchButtonMap = {
    fire: touchBtnFire,
    dash: touchBtnDash,
    special: touchBtnSpecial,
    secondary: touchBtnSecondary
  };
  if(touchDockHideBtn){
    touchDockHideBtn.addEventListener("click", function(){
      playSfx(state, "menu_beep");
      if(!touchControlsEnabled){
        setTouchControlsEnabled(true);
        setTouchDockHidden(false);
      }else{
        setTouchDockHidden(!touchControlsDockHidden);
        if(touchControlsDockHidden){
          resetTouchInputState();
        }
      }
      updateSandboxGamepadButton();
    });
  }
  if(touchMovePad){
    touchMovePad.addEventListener("pointerdown", function(e){
      if(!touchControlsEnabled || !isTouchInputAllowed()) return;
      if(touchMovePointerId !== null && touchMovePointerId !== e.pointerId) return;
      touchMovePointerId = e.pointerId;
      touchMovePad.setPointerCapture(e.pointerId);
      updateTouchMoveFromPointer(e);
      e.preventDefault();
    });
    touchMovePad.addEventListener("pointermove", function(e){
      if(!touchControlsEnabled || touchMovePointerId !== e.pointerId) return;
      updateTouchMoveFromPointer(e);
      e.preventDefault();
    });
    function endMovePointer(e){
      if(touchMovePointerId !== e.pointerId) return;
      resetTouchMovePad();
    }
    touchMovePad.addEventListener("pointerup", endMovePointer);
    touchMovePad.addEventListener("pointercancel", endMovePointer);
  }
  var actionButtons = [touchBtnFire, touchBtnDash, touchBtnSpecial, touchBtnSecondary, touchBtnSlot1, touchBtnSlot2, touchBtnSlot3];
  actionButtons.forEach(function(btn){
    if(!btn) return;
    btn.addEventListener("pointerdown", function(e){
      if(!touchControlsEnabled || !isTouchInputAllowed()) return;
      var action = btn.getAttribute("data-touch-action");
      touchActionPointers[e.pointerId] = action;
      btn.setPointerCapture(e.pointerId);
      onTouchActionPress(action);
      e.preventDefault();
    });
    function endActionPointer(e){
      var action = touchActionPointers[e.pointerId];
      if(!action) return;
      delete touchActionPointers[e.pointerId];
      onTouchActionRelease(action);
    }
    btn.addEventListener("pointerup", endActionPointer);
    btn.addEventListener("pointercancel", endActionPointer);
  });
}

function updateTouchButtonStates(){
  if(!touchControlsEnabled) return;
  var blocked = !isTouchInputAllowed();
  if(touchBtnFire) touchBtnFire.classList.toggle("is-cooldown", blocked);
  if(touchBtnDash) touchBtnDash.classList.toggle("is-cooldown", blocked || player.cooldown > 0);
  if(touchBtnSpecial) touchBtnSpecial.classList.toggle("is-cooldown", blocked);
  if(touchBtnSecondary){
    var noSecondary = !player.secondaryMode || player.secondaryMode === "none" || player.secondaryCharges <= 0;
    touchBtnSecondary.classList.toggle("is-cooldown", blocked || player.secondaryCooldown > 0 || noSecondary);
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
  if(isSandboxMultiplayer()){
    var p2 = ensurePilot2();
    updatePilot2Mouse(e);
    if(e.button === 1){
      secondaryFireForPilot(p2, 2);
    }else{
      var slots = getSecondarySlotsForPilot(p2);
      var slot = slots[clamp(p2.secondarySlotIndex | 0, 0, slots.length - 1)];
      if(slot && slot.type && slot.count > 0 && p2.secondaryCooldown <= 0){
        secondaryFireForPilot(p2, 2);
      }else{
        fireForPilot(p2, 2);
      }
    }
    return;
  }
  if(tutorialActive && tutorialShootLocked){
    pointerDown = false;
    return;
  }
  if(tutorialActive && tutorialMineralsFreeze){
    pointerDown = false;
    return;
  }
  if(mousepadActive){
    fire();
    return;
  }
  pointerDown = true;
  lastPointerX = e.clientX;
  lastPointerY = e.clientY;
  fire();
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", function(e){
  if(isSandboxMultiplayer()){
    updatePilot2Mouse(e);
    return;
  }
  if(!pointerDown || !pointerDragEnabled) return;
  if(mousepadActive) return;
  if(tutorialActive && tutorialMineralsFreeze) return;
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
  if(isSandboxSplitMode()){
    clampPilotToLane(player, 1);
  }
  if(isSandboxSplitMode()){
    clampPilotToLane(player, 1);
  }
  if(isSandboxSplitMode()){
    clampPilotToLane(player, 1);
  }
  if(isSandboxMultiplayer()){
    var p2 = ensurePilot2();
    var p2Profile = getShipProfile(p2.shipType);
    p2.speed = p2Profile.speed;
    if(!p2.dead && p2.mouseControlEnabled && pilot2Mouse.has && state.running && !state.paused && !state.over){
      var laneP2 = isSandboxSplitMode() ? getLaneBounds(2) : { minX: p2.w/2 + 10, maxX: r.width - p2.w/2 - 10 };
      var minX2 = laneP2.minX + p2.w / 2 + 2;
      var maxX2 = laneP2.maxX - p2.w / 2 - 2;
      if(!isSandboxSplitMode()){
        minX2 = laneP2.minX;
        maxX2 = laneP2.maxX;
      }
      var targetX2 = clamp(pilot2Mouse.x, minX2, maxX2);
      var targetY2 = clamp(pilot2Mouse.y, topLimit + p2.h/2 + 6, bottomLimit - p2.h/2);
      var dx2 = targetX2 - p2.x;
      var dy2 = targetY2 - p2.y;
      var settle2 = 1 - Math.exp(-10 * dtReal);
      p2.x += dx2 * settle2;
      p2.y += dy2 * settle2;
      var velScale = 1 / Math.max(0.001, dtReal);
      var targetVX2 = dx2 * velScale * 0.2;
      var targetVY2 = dy2 * velScale * 0.2;
      p2.vx += (targetVX2 - p2.vx) * 0.3;
      p2.vy += (targetVY2 - p2.vy) * 0.3;
      p2.bankHold = clamp(p2.vx / (p2.speed || 1), -1, 1);
    }
    var p2Bounds = isSandboxSplitMode() ? getLaneBounds(2) : { minX: p2.w/2 + 10, maxX: r.width - p2.w/2 - 10 };
    p2.x = clamp(p2.x, p2Bounds.minX, p2Bounds.maxX);
    p2.y = clamp(p2.y, topLimit + p2.h/2 + 6, bottomLimit - p2.h/2);
    tickPilotTimers(p2, dtReal);
  }
});

canvas.addEventListener("pointerup", function(){
  if(isSandboxMultiplayer()) return;
  pointerDown = false;
  lastPointerX = null;
  lastPointerY = null;
});

canvas.addEventListener("wheel", function(e){
  if(!isSandboxMultiplayer()) return;
  e.preventDefault();
  var p2 = ensurePilot2();
  var dir = (e.deltaY || 0) > 0 ? 1 : -1;
  cyclePilotPowerup(p2, dir);
}, { passive: false });

window.addEventListener("mousemove", function(e){
  if(isSandboxMultiplayer()){
    updatePilot2Mouse(e);
  }
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
  if(tutorialActive && tutorialMineralsFreeze) return;
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
  if(isSandboxSplitMode()){
    clampPilotToLane(player, 1);
  }
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
  if(isSandboxMultiplayer()){
    positionSandboxPilots();
  }

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
  if(!state.questionReady) return "";
  if(state.questionMode === "rational_frac" || state.questionMode === "rational_dec"){
    return String(state.rationalQuestion || "?") + " = ?";
  }
  if(isDivisorsMode()){
    return String(state.divisorTarget || state.answer || "?");
  }
  if(state.questionMode === "square_shoot"){
    return String(state.a) + "\u00B2 = ?";
  }
  if(state.questionMode === "square_root"){
    var sq = state.squareValue || (state.a * state.a);
    return "\u221A" + String(sq) + " = ?";
  }
  if(isFactorMode()){
    if(isPartialSumsMode()){
      var known = (typeof state.partialSumKnown === "number") ? state.partialSumKnown : state.a;
      var missing = (typeof state.partialSumMissing === "number") ? state.partialSumMissing : state.b;
      var sum = (typeof state.partialSumTotal === "number") ? state.partialSumTotal : (known + missing);
      return known + " + ? = " + sum;
    }
    var product = (typeof state.factorProduct === "number") ? state.factorProduct : (state.a * state.b);
    return state.a + " x ? = " + product;
  }
  if(state.questionMode === "add_series3" || state.questionMode === "add_series4"){
    var terms = Array.isArray(state.seriesTerms) ? state.seriesTerms : [];
    if(terms.length < 3) return "?";
    return terms.join(" + ") + " = ?";
  }
  var op = isAdditionMode() ? "+" : "x";
  var left = state.a;
  var right = state.b;
  if(op === "x"){
    var lenA = String(Math.abs(left || 0)).length;
    var lenB = String(Math.abs(right || 0)).length;
    if(lenA < lenB){
      var tmp = left;
      left = right;
      right = tmp;
    }
  }
  return left + " " + op + " " + right + " = ?";
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
  if(livesText) livesText.textContent = String(state.lives);
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
  applyQuestionVisibility();
}

function setSandboxQuestionHidden(hidden){
  sandboxHideQuestion = hidden;
  applyQuestionVisibility();
}

function applyQuestionVisibility(){
  if(promptChip){
    promptChip.style.visibility = (tutorialHideQuestion || sandboxHideQuestion) ? "hidden" : "visible";
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

var campaignProfilesKey = "mentaris.campaign.profiles";
var campaignProfileSlots = ["profile1", "profile2", "profile3"];

function loadCampaignProfiles(){
  var profiles = null;
  try{
    var raw = localStorage.getItem(campaignProfilesKey);
    if(raw) profiles = JSON.parse(raw);
  }catch(e){
    profiles = null;
  }
  if(!Array.isArray(profiles) || !profiles.length){
    profiles = campaignProfileSlots.map(function(id){
      return { id: id, name: "" };
    });
  }
  return profiles;
}

function getActiveProfileName(){
  var pid = getActiveProfileId();
  var profiles = loadCampaignProfiles();
  for(var i=0; i<profiles.length; i++){
    var profile = profiles[i];
    if(profile && profile.id === pid && profile.name){
      return profile.name;
    }
  }
  return "Pilot";
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
  if(config.alienSwarm){
    params.set("alienSwarm", "1");
  }
  if(config.stampede){
    params.set("stampede", "1");
  }
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
  if(state.operation === "add") return true;
  return state.questionMode === "add_digits2"
    || state.questionMode === "add_digits3"
    || state.questionMode === "add_classic2"
    || state.questionMode === "add_classic3"
    || state.questionMode === "add_series3"
    || state.questionMode === "add_series4"
    || state.questionMode === "add_stampede2"
    || state.questionMode === "add_stampede3"
    || state.questionMode === "add_factor2"
    || state.questionMode === "add_factor3";
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

function loadMinerals(){
  try{
    var raw = localStorage.getItem("mentaris.minerals");
    var val = parseInt(raw || "0", 10);
    mineralsTotal = Number.isNaN(val) ? 0 : val;
  }catch(e){
    mineralsTotal = 0;
  }
}

function saveMinerals(){
  try{ localStorage.setItem("mentaris.minerals", String(mineralsTotal || 0)); }catch(e){}
}

function awardMinerals(amount){
  var amt = Math.max(0, Math.round(amount || 0));
  if(amt <= 0) return;
  mineralsTotal = (mineralsTotal || 0) + amt;
  state.mineralsEarned = (state.mineralsEarned || 0) + amt;
  saveMinerals();
  showToast("MINERALS +" + amt);
}

function updateLowHullAlarm(pilot, dmgHit){
  if(!pilot) return;
  var threshold = Math.max(0, dmgHit || 0);
  if(pilot.hull > threshold + 0.001){
    pilot.lowHullAlarmed = false;
    return;
  }
  if(pilot.hull > 0 && pilot.hull <= threshold){
    if(!pilot.lowHullAlarmed){
      pilot.lowHullAlarmed = true;
      pilot.lowHullPulse = Math.max(pilot.lowHullPulse || 0, 1.1);
      playSfx(state, "ship_damage_alarm");
    }
  }
}

function markDamage(pilot){
  if(!pilot) return;
  pilot.lastDamageAt = getElapsedSeconds();
}

function applyEasyRegen(pilot, dtReal){
  if(!pilot) return;
  if(pilot.hull >= 1) return;
  var diff = String(state.difficulty || "normal").toLowerCase();
  if(diff !== "easy") return;
  var elapsed = getElapsedSeconds();
  if(!pilot.lastDamageAt) pilot.lastDamageAt = elapsed;
  if(elapsed - pilot.lastDamageAt < 6) return;
  var regenRate = 0.12;
  pilot.hull = clamp(pilot.hull + regenRate * dtReal, 0, 1);
}

function getHighestDigit(value){
  if(value == null) return 0;
  var str = String(value);
  var maxDigit = 0;
  for(var i=0; i<str.length; i++){
    var code = str.charCodeAt(i);
    if(code >= 48 && code <= 57){
      var digit = code - 48;
      if(digit > maxDigit) maxDigit = digit;
    }
  }
  return maxDigit;
}

function spawnMineralBurst(x, y, count){
  var total = Math.max(0, Math.round(count || 0));
  if(total <= 0) return;
  var r = canvas.getBoundingClientRect();
  var spread = Math.min(40, 12 + total * 2.5);
  for(var i=0; i<total; i++){
    var angle = rand(0, Math.PI * 2);
    var dist = rand(0, spread);
    var vx = Math.cos(angle) * rand(8, 22);
    var vy = rand(40, 70);
    powerups.push({
      x: (typeof x === "number" ? x : rand(60, r.width - 60)) + Math.cos(angle) * dist,
      y: (typeof y === "number" ? y : rand(60, r.height - 60)) + Math.sin(angle) * dist,
      vx: vx,
      vy: vy,
      r: 12,
      rot: rand(0, Math.PI * 2),
      rotSpeed: rand(-1.2, 1.2),
      type: "mineral",
      group: "mineral",
      value: 1,
      popTimer: 0.55,
      popDuration: 0.55,
      popScale: 0.6
    });
  }
}

function isDigitMode(){
  return state.questionMode === "digits3"
    || state.questionMode === "digits2"
    || state.questionMode === "add_digits2"
    || state.questionMode === "add_digits3"
    || state.questionMode === "stampede2"
    || state.questionMode === "stampede3"
    || state.questionMode === "add_stampede2"
    || state.questionMode === "add_stampede3";
}

function isStampedeMode(){
  return !!state.stampedeMode || String(state.questionMode || "").indexOf("stampede") === 0 || String(state.questionMode || "").indexOf("add_stampede") === 0;
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

function findMissileTarget(){
  var asteroidTarget = findCorrectAsteroid();
  if(asteroidTarget) return { type: "asteroid", target: asteroidTarget };
  if(!aliens || !aliens.length) return null;
  var answerStr = getMissileAnswerString();
  if(!answerStr) return null;
  var answerNum = parseInt(answerStr, 10);
  for(var i=0; i<aliens.length; i++){
    var al = aliens[i];
    if(!al) continue;
    if(state.alienSwarm && al.swarmDigit != null){
      if(al.swarmDigit === answerNum) return { type: "alien", target: al };
      continue;
    }
    if(al.answer != null && String(al.answer) === answerStr){
      return { type: "alien", target: al };
    }
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

function getMissileBurstCount(answerStr, target){
  if(target && target.hitsRemaining != null){
    return Math.max(1, target.hitsRemaining);
  }
  if(!answerStr) return 0;
  if(isDigitMode()){
    var num = parseInt(answerStr, 10);
    if(!isFinite(num)) return 0;
    if(num <= 0) return 1;
    return num;
  }
  if(isRationalMode() && (state.questionMode === "rational_frac" || state.questionMode === "rational_dec")){
    var den = parseInt(state.b, 10);
    if(!isFinite(den) || den <= 0) return 1;
    return den;
  }
  if(state.questionMode === "classic" || state.questionMode === "classic2" || state.questionMode === "classic3"
    || state.questionMode === "add_classic2" || state.questionMode === "add_classic3"
    || state.questionMode === "add_series3" || state.questionMode === "add_series4"
    || state.questionMode === "stampede2" || state.questionMode === "stampede3"
    || state.questionMode === "add_stampede2" || state.questionMode === "add_stampede3"){
    var ansStr = String(Math.abs(parseInt(answerStr, 10) || 0));
    var maxDigit = 0;
    for(var di=0; di<ansStr.length; di++){
      var dval = ansStr.charCodeAt(di) - 48;
      if(dval > maxDigit) maxDigit = dval;
    }
    if(maxDigit <= 0) maxDigit = 1;
    return maxDigit;
  }
  return 1;
}

function launchMissile(target, opts){
  if(!target) return false;
  var dx = target.x - player.x;
  var dy = target.y - player.y;
  var dist = Math.max(1, Math.hypot(dx, dy));
  var speed = 560;
  var seed = (opts && typeof opts.seed === "number") ? opts.seed : Math.random() * 999;
  var delay = (opts && typeof opts.delay === "number") ? opts.delay : 0;
  var offsetX = (opts && typeof opts.offsetX === "number") ? opts.offsetX : 0;
  var offsetY = (opts && typeof opts.offsetY === "number") ? opts.offsetY : 0;
  var weaveAmp = (opts && typeof opts.weaveAmp === "number") ? opts.weaveAmp : rand(42, 96);
  var weaveFreq = (opts && typeof opts.weaveFreq === "number") ? opts.weaveFreq : rand(1.4, 2.4);
  var avoidRadius = (opts && typeof opts.avoidRadius === "number") ? opts.avoidRadius : rand(140, 190);
  var avoidStrength = (opts && typeof opts.avoidStrength === "number") ? opts.avoidStrength : rand(260, 360);
  var targetType = (opts && opts.targetType) ? opts.targetType : "asteroid";
  var targetId = targetType === "alien" ? (target.uid || target.id) : target.id;
  bullets.push({
    x: player.x + offsetX,
    y: player.y - 18 + offsetY,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    r: 5,
    kind: "missile",
    targetId: targetId,
    targetType: targetType,
    speed: speed,
    accelFrom: 560,
    accelTo: 650,
    accelDelay: 1.0,
    accelDuration: 1.1,
    accelT: 0,
    boosted: false,
    rot: 0,
    trail: [],
    seed: seed,
    age: 0,
    delay: delay,
    weaveAmp: weaveAmp,
    weaveFreq: weaveFreq,
    weavePhase: rand(0, Math.PI * 2),
    avoidRadius: avoidRadius,
    avoidStrength: avoidStrength
  });
  state.shots += 1;
  recordShotCount("missile");
  player.recoil = 1.35;
  player.flash = 1;
  if(tourGuide) tourGuide.notify("fire");
  return true;
}

function launchMissileBurst(target, count, targetType){
  if(!target) return false;
  var shots = Math.max(0, count | 0);
  if(shots <= 0) return false;
  playSfx(state, "shot_missile");
  var spread = Math.max(0, shots - 1);
  var baseOffset = 6;
  for(var i=0; i<shots; i++){
    var offsetX = (i - spread / 2) * baseOffset;
    var delay = i * 0.08;
    var weaveAmp = (shots > 1) ? rand(36, 86) : rand(24, 58);
    launchMissile(target, {
      seed: Math.random() * 999 + i * 17,
      delay: delay,
      offsetX: offsetX,
      weaveAmp: weaveAmp,
      weaveFreq: rand(1.6, 3.0),
      targetType: targetType
    });
  }
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
    var targetInfo = findMissileTarget();
    if(targetInfo && targetInfo.target && canMissileLock(targetInfo.target)){
    launchMissileBurst(targetInfo.target, getMissileBurstCount(answer, targetInfo.target), targetInfo.type);
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
  var targetInfo = findMissileTarget();
  if(targetInfo && targetInfo.target && canMissileLock(targetInfo.target)){
    launchMissileBurst(targetInfo.target, getMissileBurstCount(missileInputAnswer, targetInfo.target), targetInfo.type);
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
    || state.questionMode === "add_factor2"
    || state.questionMode === "add_factor3"
    || state.questionMode === "add_classic2"
    || state.questionMode === "add_classic3"
    || state.questionMode === "add_series3"
    || state.questionMode === "add_series4"
    || state.questionMode === "stampede2"
    || state.questionMode === "stampede3"
    || state.questionMode === "add_stampede2"
    || state.questionMode === "add_stampede3"
    || isSquareMode()
    || isRationalMode();
}

function isFactorMode(){
  return state.questionMode === "factor2"
    || state.questionMode === "factor3"
    || state.questionMode === "add_factor2"
    || state.questionMode === "add_factor3";
}

function isPartialSumsMode(){
  if(state.questionMode === "add_factor2" || state.questionMode === "add_factor3") return true;
  return state.operation === "add" && (state.questionMode === "factor2" || state.questionMode === "factor3");
}

function isDivisorsMode(){
  return state.questionMode === "divisors";
}

function buildDivisorAnswers(target){
  var n = Math.max(1, Math.floor(Math.abs(target || 0)));
  var list = [];
  for(var i=1; i<=n; i++){
    if(n % i === 0) list.push(i);
  }
  return list;
}

function getRemainingDivisors(){
  if(!state.divisorAnswers || !state.divisorAnswers.length) return [];
  if(!state.divisorHits) return state.divisorAnswers.slice();
  var out = [];
  for(var i=0; i<state.divisorAnswers.length; i++){
    var val = state.divisorAnswers[i];
    if(!state.divisorHits[val]) out.push(val);
  }
  return out;
}

function isDivisorLabel(label){
  if(!state.divisorAnswers || !state.divisorAnswers.length) return false;
  var val = Number(label);
  if(!Number.isFinite(val)) return false;
  for(var i=0; i<state.divisorAnswers.length; i++){
    if(state.divisorAnswers[i] === val) return true;
  }
  return false;
}

function markDivisorHit(label){
  var val = Number(label);
  if(!Number.isFinite(val)) return false;
  if(!state.divisorHits) state.divisorHits = {};
  if(state.divisorHits[val]) return false;
  state.divisorHits[val] = true;
  state.divisorRemaining = Math.max(0, (state.divisorRemaining || 0) - 1);
  return true;
}

function getCurrentCorrectTargetValue(){
  if(isDigitMode()) return state.correctDigit;
  if(isDivisorsMode()) return state.divisorTarget || state.answer;
  if(isPartialSumsMode()){
    if(typeof state.partialSumCorrectValue === "number") return state.partialSumCorrectValue;
    if(typeof state.partialSumMissing === "number") return state.partialSumMissing;
    if(typeof state.partialSumTotal === "number" && typeof state.partialSumKnown === "number"){
      return state.partialSumTotal - state.partialSumKnown;
    }
  }
  return state.answer;
}

function isClassicModeValue(mode){
  return mode === "classic"
    || mode === "classic2"
    || mode === "classic3"
    || mode === "factor2"
    || mode === "factor3"
    || mode === "add_factor2"
    || mode === "add_factor3"
    || mode === "add_classic2"
    || mode === "add_classic3"
    || mode === "add_series3"
    || mode === "add_series4"
    || mode === "stampede2"
    || mode === "stampede3"
    || mode === "add_stampede2"
    || mode === "add_stampede3"
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
  var isFactor = modeLabel.indexOf("factor") !== -1;
  var isStampede = modeLabel.indexOf("stampede") !== -1;
  var isSeries = modeLabel.indexOf("series") !== -1;
  var isDivisors = modeLabel === "divisors";
  if(!isStampede && state.stampedeMode) isStampede = true;
  var operation = isRational ? "Rationals" : (isSquare ? "Squares" : (isAdd ? "Addition" : "Multiplication"));
  var modeName = "Classic Answer";
  if(isRational){
    modeName = (modeLabel === "rational_dec") ? "Target Decimal" : "Target Fraction";
  }else if(isSquare){
    modeName = (modeLabel === "square_root") ? "Square Roots" : "Perfect Squares";
  }else if(isDivisors){
    modeName = "Divisors";
  }else if(isFactor){
    modeName = isAdd ? "Partial Sums" : "Factor Hunt";
  }else if(isSeries){
    modeName = "Series";
  }else if(isStampede){
    modeName = "Stampede";
  }else{
    modeName = (modeLabel.indexOf("digits") !== -1) ? "Digit Hunt" : "Classic Answer";
  }
  var subLabel = "";
  if(isRational){
    subLabel = (modeLabel === "rational_dec") ? "Decimal" : "Fraction";
  }else if(isSquare){
    subLabel = (modeLabel === "square_root") ? "Shoot Roots" : "Shoot Squares";
  }else if(isDivisors){
    subLabel = "";
  }else if(isSeries){
    subLabel = (modeLabel.indexOf("4") !== -1) ? "4 terms" : "3 terms";
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
  state.questionReady = false;
  state.redemptionUsed = false;
  state.partialSumKnown = null;
  state.partialSumMissing = null;
  state.partialSumCorrectValue = null;
  state.partialSumTotal = null;
  state.seriesTerms = null;
  state.divisorTarget = 0;
  state.divisorAnswers = null;
  state.divisorHits = null;
  state.divisorRemaining = 0;
  if(isSquareMode()){
    var base = randi(rr.a1, rr.a2);
    state.a = base;
    state.b = (state.questionMode === "square_root") ? 1 : base;
    state.squareValue = base * base;
    state.answer = (state.questionMode === "square_root") ? base : state.squareValue;
    state.questionReady = true;
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
    state.questionReady = true;
    state.waveId++;
    syncHud();
    prepareWave();
    return;
  }
  if(isFactorMode()){
    if(isPartialSumsMode()){
      var knownAddend = 0;
      var missingAddend = 0;
      if(state.questionMode === "add_factor2"){
        knownAddend = randi(10, 99);
        missingAddend = randi(10, 99);
      }else{
        knownAddend = randi(100, 999);
        missingAddend = randi(100, 999);
      }
      state.a = knownAddend;
      state.b = missingAddend;
      state.partialSumKnown = knownAddend;
      state.partialSumMissing = missingAddend;
      state.partialSumCorrectValue = missingAddend;
      state.partialSumTotal = state.partialSumKnown + state.partialSumMissing;
      state.answer = state.partialSumCorrectValue;
    }else{
      if(state.questionMode === "factor2"){
        state.a = randi(10, 99);
        state.b = randi(2, 9);
      }else{
        state.a = randi(100, 999);
        state.b = randi(2, 9);
      }
      state.factorProduct = state.a * state.b;
      state.answer = state.b;
    }
    state.questionReady = true;
    state.waveId++;
    syncHud();
    prepareWave();
    return;
  }
  if(isDivisorsMode()){
    var diff = String(state.difficulty || "normal").toLowerCase();
    var minTarget = (diff === "hard" || diff === "brutal") ? 51 : 2;
    var maxTarget = (diff === "hard" || diff === "brutal") ? 99 : 50;
    if(maxTarget < minTarget){
      var tmpRange = minTarget;
      minTarget = maxTarget;
      maxTarget = tmpRange;
    }
    var target = randi(minTarget, maxTarget);
    state.divisorTarget = target;
    state.divisorAnswers = buildDivisorAnswers(target);
    state.divisorHits = {};
    state.divisorRemaining = state.divisorAnswers.length;
    state.a = target;
    state.b = 1;
    state.answer = target;
    state.questionReady = true;
    state.waveId++;
    syncHud();
    prepareWave();
    return;
  }
  if(state.questionMode === "add_series3" || state.questionMode === "add_series4"){
    var termCount = state.questionMode === "add_series4" ? 4 : 3;
    var terms = [];
    var tMin = rr.a1;
    var tMax = rr.a2;
    for(var ti=0; ti<termCount; ti++){
      terms.push(randi(tMin, tMax));
    }
    state.seriesTerms = terms;
    state.a = terms[0];
    state.b = terms[1];
    state.answer = terms.reduce(function(sum, val){ return sum + val; }, 0);
    state.questionReady = true;
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
    if(state.questionMode === "add_classic2" || state.questionMode === "add_stampede2"){
      state.a = randi(10, 99);
      state.b = randi(10, 99);
    }else if(state.questionMode === "add_classic3" || state.questionMode === "add_stampede3"){
      state.a = randi(100, 999);
      state.b = randi(100, 999);
    }else if(state.questionMode === "classic2" || state.questionMode === "stampede2"){
      state.a = randi(10, 99);
      state.b = randi(2, 9);
    }else if(state.questionMode === "classic3" || state.questionMode === "stampede3"){
      state.a = randi(100, 999);
      state.b = randi(2, 9);
    }else{
      state.a = randi(rr.a1, rr.a2);
      state.b = randi(rr.b1, rr.b2);
    }
  }
  state.answer = isAdditionMode() ? (state.a + state.b) : (state.a * state.b);
  state.questionReady = true;
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
  if(state.alienSwarm){
    if(!state.alienSwarmDigitBag || !state.alienSwarmDigitBag.length){
      resetAlienSwarmPool();
    }
    var digit = state.alienSwarmDigitBag.pop();
    var correctDigit = (state.correctDigit != null) ? Number(state.correctDigit) : (Math.abs(state.answer || 0) % 10);
    return {
      question: a + " " + op + " " + b,
      answer: 1,
      digit: digit,
      correctDigit: correctDigit,
      poolId: state.alienSwarmPoolId || 1
    };
  }
  return { question: a + " " + op + " " + b, answer: answer };
}

function resetAlienSwarmPool(){
  state.alienSwarmPoolId = (state.alienSwarmPoolId || 0) + 1;
  state.alienSwarmDigitBag = [];
  for(var d=0; d<=9; d++){
    state.alienSwarmDigitBag.push(d);
  }
  for(var i=state.alienSwarmDigitBag.length - 1; i>0; i--){
    var j = randi(0, i);
    var tmp = state.alienSwarmDigitBag[i];
    state.alienSwarmDigitBag[i] = state.alienSwarmDigitBag[j];
    state.alienSwarmDigitBag[j] = tmp;
  }
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
  var target = Math.max(4, count || 0);
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

function buildDivisorDecoyPool(targetCount){
  var pool = [];
  var divisorSet = new Set();
  if(state.divisorAnswers && state.divisorAnswers.length){
    for(var i=0; i<state.divisorAnswers.length; i++){
      divisorSet.add(String(state.divisorAnswers[i]));
    }
  }
  var target = Math.max(4, targetCount || 0) * 2;
  var guard = 0;
  while(pool.length < target && guard < 240){
    var cand = randi(2, 99);
    var key = String(cand);
    if(divisorSet.has(key)){
      guard++;
      continue;
    }
    if(pool.indexOf(cand) !== -1){
      guard++;
      continue;
    }
    pool.push(cand);
    guard++;
  }
  if(!pool.length){
    var fallback = genDecoys(state.divisorTarget || 12, targetCount * 2);
    for(var fi=0; fi<fallback.length; fi++){
      var fKey = String(fallback[fi]);
      if(divisorSet.has(fKey)) continue;
      pool.push(fallback[fi]);
    }
  }
  return pool;
}

function prepareWave(){
  var diff = String(state.difficulty || "normal").toLowerCase();
  var decoyScale = 0.55;
  if(diff === "easy") decoyScale = 0.35;
  else if(diff === "normal") decoyScale = 0.45;
  else if(diff === "hard") decoyScale = 0.55;
  else if(diff === "brutal") decoyScale = 0.65;
  var decoyCount = Math.max(1, Math.round(state.decoys * 0.2 * decoyScale));
  if(isDivisorsMode()){
    state.waveDecoys = buildDivisorDecoyPool(decoyCount);
    state.waveDecoyBag = state.waveDecoys.slice();
    state.correctInPlay = false;
    state.correctAsteroidId = 0;
    state.correctDelayRemaining = 0;
    state.spawnTimer = 0;
    return;
  }
  if(isDigitMode()){
    if(state.correctDigit == null) state.correctDigit = pickCorrectDigit();
    state.waveDecoys = genDigitDecoys(state.correctDigit, decoyCount);
    state.waveDecoyBag = buildDigitDecoyBag();
  }else{
    state.waveDecoys = genDecoys(state.answer, decoyCount);
    state.waveDecoyBag = buildClassicDecoyBag(state.answer, Math.max(3, Math.round(decoyCount * 1.1 * decoyScale)));
  }
  state.correctInPlay = false;
  state.correctAsteroidId = 0;

  var minDecoysFirst = 1;
  var maxDecoysFirst = Math.min(4, 1 + decoyCount);
  state.correctDelayRemaining = randi(minDecoysFirst, maxDecoysFirst);
  state.spawnTimer = 0;
}

function pickSpawnX(w){
  return pickSpawnXInRange(48, w - 48);
}

function pickSpawnXInRange(minX, maxX){
  var lo = Math.min(minX, maxX);
  var hi = Math.max(minX, maxX);
  for(var tries=0; tries<10; tries++){
    var x = rand(lo, hi);
    var ok = true;
    for(var i=0;i<asteroids.length;i++){
      var a = asteroids[i];
      if(a.y < 180 && Math.abs(a.x - x) < 48){ ok = false; break; }
    }
    if(ok) return x;
  }
  return rand(lo, hi);
}

function getLaneBounds(laneId){
  var r = canvas.getBoundingClientRect();
  var w = r.width;
  var pad = 36;
  if(!isSandboxSplitMode() || !laneId){
    return { minX: pad, maxX: w - pad };
  }
  var gap = 56;
  var laneW = Math.max(160, (w - gap) / 2);
  var lane1Start = 0;
  var lane1End = laneW;
  var lane2Start = laneW + gap;
  var lane2End = w;
  if(laneId === 1){
    return { minX: lane1Start + pad, maxX: Math.max(lane1Start + pad + 40, lane1End - pad) };
  }
  if(laneId === 2){
    return { minX: Math.min(lane2Start + pad, lane2End - pad - 40), maxX: lane2End - pad };
  }
  return { minX: pad, maxX: w - pad };
}

function getDifficultySpeedFactor(){
  var diff = String(state.difficulty || "normal").toLowerCase();
  if(diff === "easy") return 0.38;
  if(diff === "normal") return 0.62;
  if(diff === "hard") return 0.9;
  if(diff === "brutal") return 1.05;
  return 0.62;
}

function spawnAsteroid(label, isCorrect, laneId){
  var r = canvas.getBoundingClientRect();
  var w = r.width;
  var h = r.height;
  var lane = getLaneBounds(laneId);
  var spawnX = pickSpawnXInRange(lane.minX, lane.maxX);
  if(isCorrect && typeof state.nextCorrectSpawnX === "number"){
    spawnX = state.nextCorrectSpawnX;
    state.nextCorrectSpawnX = null;
  }

  var spawnSideRoll = Math.random();
  var spawnSide = "top";
  var diff = String(state.difficulty || "normal").toLowerCase();
  var allowCorrectSide = isCorrect && (diff === "hard" || diff === "brutal");
  var sideChance = !isCorrect ? 0.44 : (allowCorrectSide ? 0.28 : 0);
  if(spawnSideRoll < sideChance * 0.5) spawnSide = "left";
  else if(spawnSideRoll < sideChance) spawnSide = "right";

  var levelFactor = getDifficultySpeedFactor();
  var baseVy = (100 + state.level * 14 * levelFactor) * asteroidFallSpeedScale;
  var speedScale = state.baseSpeed * (1 + state.ddSpeedBonus);
  if(isStampedeMode()){
    baseVy *= 1.45;
    speedScale *= 1.15;
  }

  var size = isCorrect ? rand(30, 38) : rand(26, 36);
  var id = ++state.asteroidId;
  var driftAmp = rand(8, 20);
  var driftRate = rand(0.6, 1.4);
  var driftPhase = rand(0, Math.PI * 2);

  var spawnY = -rand(26, 88);
  var baseVx = rand(-35, 35);
  if(spawnSide !== "top"){
    var sideYMax = Math.max(80, h * 0.35);
    spawnY = rand(0, sideYMax);
    if(spawnSide === "left"){
      spawnX = lane.minX - rand(20, 64);
      baseVx = rand(40, 90);
    }else if(spawnSide === "right"){
      spawnX = lane.maxX + rand(20, 64);
      baseVx = rand(-90, -40);
    }
  }

  var a = {
    id:id,
    x: spawnX,
    y: spawnY,
    vx: baseVx,
    vy: baseVy * speedScale * (isCorrect ? 1.03 : rand(0.94, 1.10)),
    baseVy: baseVy * speedScale,
    r: size,
    label: label,
    isCorrect: !!isCorrect,
    waveId: state.waveId,
    laneId: laneId || 0,
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
    spawnAt: getElapsedSeconds(),
    spawnSide: spawnSide,
    spawnFade: (spawnSide === "top") ? 1 : 0,
    spawnFadeDur: (spawnSide === "top") ? 0 : 0.4
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
  }else if(isRationalMode() && (state.questionMode === "rational_frac" || state.questionMode === "rational_dec") && isCorrect){
    var denHits = parseInt(state.b, 10);
    if(Number.isNaN(denHits) || denHits <= 1) denHits = 1;
    a.hitsRemaining = denHits;
    a.hitsTotal = denHits;
  }else if(isCorrect && (state.questionMode === "classic" || state.questionMode === "classic2" || state.questionMode === "classic3" || state.questionMode === "add_classic2" || state.questionMode === "add_classic3" || state.questionMode === "add_series3" || state.questionMode === "add_series4" || state.questionMode === "square_shoot" || state.questionMode === "square_root" || state.questionMode === "add_factor2" || state.questionMode === "add_factor3")){
    var ansStr = String(Math.abs(state.answer || 0));
    var maxDigit = 0;
    for(var di=0; di<ansStr.length; di++){
      var dval = ansStr.charCodeAt(di) - 48;
      if(dval > maxDigit) maxDigit = dval;
    }
    if(maxDigit <= 1) maxDigit = 1;
    a.hitsRemaining = maxDigit;
    a.hitsTotal = maxDigit;
  }

  asteroids.push(a);

  if(isCorrect){
    state.correctInPlay = true;
    state.correctAsteroidId = id;
  }
}

function spawnDecoyOnlyInLane(laneId){
  var activeLabels = new Set();
  for(var i=0; i<asteroids.length; i++){
    var a = asteroids[i];
    if(a.waveId === state.waveId && a.label != null){
      if(!laneId || a.laneId === laneId){
        activeLabels.add(String(a.label));
      }
    }
  }
  if(isDivisorsMode()){
    if(!state.waveDecoyBag || !state.waveDecoyBag.length){
      state.waveDecoyBag = buildDivisorDecoyPool(Math.max(2, Math.round(state.decoys * 0.35))).slice();
    }
    var dLabel = null;
    if(state.waveDecoyBag && state.waveDecoyBag.length){
      for(var dBi=state.waveDecoyBag.length - 1; dBi>=0; dBi--){
        var cand = state.waveDecoyBag[dBi];
        if(!activeLabels.has(String(cand))){
          dLabel = cand;
          state.waveDecoyBag.splice(dBi, 1);
          break;
        }
      }
      if(dLabel == null){
        dLabel = state.waveDecoyBag.pop();
      }
    }
    if(dLabel == null){
      var guard = 0;
      var divisorSet = new Set();
      if(state.divisorAnswers){
        for(var di=0; di<state.divisorAnswers.length; di++){
          divisorSet.add(String(state.divisorAnswers[di]));
        }
      }
      while(guard++ < 80){
        var fallback = randi(2, 99);
        if(divisorSet.has(String(fallback))) continue;
        if(activeLabels.has(String(fallback))) continue;
        dLabel = fallback;
        break;
      }
    }
    if(dLabel == null) dLabel = randi(2, 99);
    spawnAsteroid(dLabel, false, laneId);
    return;
  }
  var label = null;
  if(!state.waveDecoyBag || !state.waveDecoyBag.length){
    if(isDigitMode()){
      state.waveDecoyBag = buildDigitDecoyBag(activeLabels);
    }else{
      state.waveDecoyBag = buildClassicDecoyBag(getCurrentCorrectTargetValue(), Math.max(3, Math.round(state.decoys * 0.35 * 0.45)), activeLabels);
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
    var correctTarget = Number(getCurrentCorrectTargetValue()) || 0;
    var pool = (state.waveDecoys && state.waveDecoys.length) ? state.waveDecoys : [Math.max(0, correctTarget + randi(-10,10))];
    label = pool[randi(0, pool.length - 1)];
  }
  spawnAsteroid(label, false, laneId);
}

function spawnDecoyOnly(){
  return spawnDecoyOnlyInLane(0);
}

function hasCorrectInLane(laneId){
  for(var i=0; i<asteroids.length; i++){
    var a = asteroids[i];
    if(!a || !a.isCorrect) continue;
    if(a.waveId !== state.waveId) continue;
    if(laneId && a.laneId !== laneId) continue;
    return true;
  }
  return false;
}

function countDivisorInPlay(laneId){
  if(!state.divisorAnswers || !state.divisorAnswers.length) return 0;
  var divisorSet = new Set();
  for(var di=0; di<state.divisorAnswers.length; di++){
    divisorSet.add(String(state.divisorAnswers[di]));
  }
  var count = 0;
  for(var i=0; i<asteroids.length; i++){
    var a = asteroids[i];
    if(!a || a.waveId !== state.waveId || a.label == null) continue;
    if(laneId && a.laneId !== laneId) continue;
    if(divisorSet.has(String(a.label))) count++;
  }
  return count;
}

function spawnDivisorWaveLane(laneId){
  var remaining = getRemainingDivisors();
  if(!remaining.length){
    spawnDecoyOnlyInLane(laneId);
    return;
  }
  var correctInPlay = countDivisorInPlay(laneId);
  var maxCorrect = Math.min(2, remaining.length);
  if(correctInPlay < maxCorrect && Math.random() < 0.65){
    var label = remaining[randi(0, remaining.length - 1)];
    spawnAsteroid(label, true, laneId);
  }else{
    spawnDecoyOnlyInLane(laneId);
  }
}

function spawnOneFromWaveLane(laneId){
  if(!hasCorrectInLane(laneId)){
    var label = getCurrentCorrectTargetValue();
    spawnAsteroid(label, true, laneId);
  }else{
    spawnDecoyOnlyInLane(laneId);
  }
}

function spawnOneFromWave(){
  if(isDivisorsMode()){
    if(isSandboxSplitMode()){
      spawnDivisorWaveLane(1);
      spawnDivisorWaveLane(2);
    }else{
      spawnDivisorWaveLane(0);
    }
  }else if(isSandboxSplitMode()){
    spawnOneFromWaveLane(1);
    spawnOneFromWaveLane(2);
  }else if(!state.correctInPlay){
    if(state.correctDelayRemaining > 0){
      spawnDecoyOnly();
      state.correctDelayRemaining--;
    }else{
      var label = getCurrentCorrectTargetValue();
      spawnAsteroid(label, true);
    }
  }else{
    spawnDecoyOnly();
  }

  if(state.level >= 4){
    var diff = String(state.difficulty || "normal").toLowerCase();
    var extraChance = 0.28;
    if(diff === "easy") extraChance = 0.12;
    else if(diff === "normal") extraChance = 0.18;
    if(Math.random() < extraChance){
      var r = canvas.getBoundingClientRect();
      var w = r.width;
      var baseVy = (92 + state.level * 10) * getDifficultySpeedFactor() * asteroidFallSpeedScale;
      var speedScale = state.baseSpeed * (1 + state.ddSpeedBonus);
      var ambLane = isSandboxSplitMode() ? (Math.random() < 0.5 ? 1 : 2) : 0;
    var ambBounds = getLaneBounds(ambLane);
      asteroids.push({
      id: ++state.asteroidId,
      x: rand(ambBounds.minX, ambBounds.maxX),
      y: -rand(220, 520),
      vx: rand(-25, 25),
      vy: baseVy*speedScale*rand(0.75,1.0),
      baseVy: baseVy * speedScale,
      r: rand(14, 22),
      label: null,
      isCorrect:false,
      waveId: -1,
      laneId: ambLane,
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
  var stampedeActive = isStampedeMode();
  var allowOffense = !!sandboxMode;
  if(state.alienSwarm){
    if(lowHull && roll < 0.5){
      var sType = Math.random() < 0.7 ? "repair" : pickSecondaryType();
      return { type: sType, group: "secondary" };
    }
    if(roll < 0.75 && allowOffense){
      var offense = ["laser", "fire", "ice", "electric", "pierce", "plasma", "rail"];
      if(isMissileAllowed()) offense.unshift("missile");
      var oType = offense[Math.floor(Math.random() * offense.length)];
      return { type: oType, group: "offense" };
    }
    if(roll < 0.9){
      var dRoll = Math.random();
      var dType = dRoll < 0.55 ? "shield" : "armor";
      return { type: dType, group: "defense" };
    }
    var sType = pickSecondaryType();
    return { type: sType, group: "secondary" };
  }
  function pickSecondaryType(){
    var pool = ["time","time","emp","emp","magnet","lock","repair","autofire","scope"];
    if(stampedeActive){
      pool = ["emp","emp","autofire","autofire","time","magnet","lock","repair","scope","emp","autofire"];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if(stampedeActive){
    if(lowHull && roll < 0.6){
      var sType = Math.random() < 0.6 ? "repair" : pickSecondaryType();
      return { type: sType, group: "secondary" };
    }
    if(roll < 0.65 && allowOffense){
      var offense = ["laser", "fire", "ice", "electric", "pierce", "plasma", "rail"];
      if(isMissileAllowed()) offense.unshift("missile");
      var oType = offense[Math.floor(Math.random() * offense.length)];
      return { type: oType, group: "offense" };
    }
    if(roll < 0.85){
      var sType = pickSecondaryType();
      return { type: sType, group: "secondary" };
    }
    var dRoll = Math.random();
    var dType = dRoll < 0.55 ? "shield" : "armor";
    return { type: dType, group: "defense" };
  }
  if(lowHull && roll < 0.75){
    var sType = Math.random() < 0.7 ? "repair" : pickSecondaryType();
    return { type: sType, group: "secondary" };
  }
  if(roll < 0.45 && allowOffense){
    var offense = ["laser", "fire", "ice", "electric", "pierce", "plasma", "rail"];
    if(isMissileAllowed()) offense.unshift("missile");
    var oType = offense[Math.floor(Math.random() * offense.length)];
    return { type: oType, group: "offense" };
  }
  if(roll < 0.7){
    var dRoll = Math.random();
    var dType = dRoll < 0.55 ? "shield" : "armor";
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
  if(tutorialActive && p.group === "offense"){
    resetShotType();
    return;
  }
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
    else if(p.type === "pierce") showToast("OFFENSE -> BOLA");
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
  }else if(p.group === "defense" && p.type === "scope"){
    player.scopeTimer = 1;
    showToast("DEFENSE -> SCOPE ONLINE");
  }else if(p.group === "secondary"){
    if(p.type === "scope"){
      player.scopeTimer = 1;
      showToast("SECONDARY -> SCOPE ONLINE");
    }else if(p.type === "repair"){
      player.hull = clamp(player.hull + 0.35, 0, 1);
      spawnRing(player.x, player.y, 18);
      spawnParticles(player.x, player.y, "correct");
      showToast("HULL REPAIRED");
    }else{
      addSecondaryPowerup(p.type);
      if(p.type === "time") showToast("SECONDARY -> TIME DILATION (F)");
      else if(p.type === "magnet") showToast("SECONDARY -> MAGNET SWEEP (F)");
      else if(p.type === "emp") showToast("SECONDARY -> EMP BURST (F)");
      else if(p.type === "lock") showToast("SECONDARY -> TARGET LOCK (F)");
      else if(p.type === "autofire") showToast("SECONDARY -> AUTO-FIRE (F)");
    }
  }
}

function applyPowerupForPilot(pilot, pilotId, powerup){
  var p = powerup;
  if(tutorialActive && p.group === "offense" && pilotId === 1){
    pilot.blasterMode = "single";
    pilot.blasterHitsRemaining = 0;
    pilot.blasterTimer = 0;
    return;
  }
  if(p.group === "offense"){
    if(p.type === "missile" && !isMissileAllowed()){
      p.type = "laser";
    }
    pilot.blasterMode = p.type;
    pilot.blasterHitsRemaining = 2;
    pilot.blasterTimer = 0;
    if(p.type === "missile") showToast("OFFENSE -> MISSILE SHOT");
    else if(p.type === "laser") showToast("OFFENSE -> LASER BURST");
    else if(p.type === "fire") showToast("OFFENSE -> FIREBALL");
    else if(p.type === "ice") showToast("OFFENSE -> ICE SHARDS");
    else if(p.type === "electric") showToast("OFFENSE -> ELECTRIC BOLTS");
    else if(p.type === "pierce") showToast("OFFENSE -> BOLA");
    else if(p.type === "plasma") showToast("OFFENSE -> PLASMA ORB");
    else if(p.type === "rail") showToast("OFFENSE -> RAIL BEAM");
  }else if(p.group === "defense" && p.type === "shield"){
    pilot.defenseMode = "shield";
    pilot.defenseTimer = 10;
    showToast("DEFENSE -> SHIELD");
  }else if(p.group === "defense" && p.type === "armor"){
    pilot.defenseMode = "armor";
    pilot.defenseTimer = 0;
    pilot.armorBlocksRemaining = 5;
    showToast("DEFENSE -> ARMOR");
  }else if(p.group === "defense" && p.type === "scope"){
    pilot.scopeTimer = 1;
    showToast("DEFENSE -> SCOPE ONLINE");
  }else if(p.group === "secondary"){
    if(p.type === "scope"){
      pilot.scopeTimer = 1;
      showToast("SECONDARY -> SCOPE ONLINE");
    }else if(p.type === "repair"){
      pilot.hull = clamp(pilot.hull + 0.35, 0, 1);
      spawnRing(pilot.x, pilot.y, 18);
      spawnParticles(pilot.x, pilot.y, "correct");
      showToast("HULL REPAIRED");
    }else{
      addSecondaryPowerupForPilot(pilot, p.type);
      if(p.type === "time") showToast("SECONDARY -> TIME DILATION (F)");
      else if(p.type === "magnet") showToast("SECONDARY -> MAGNET SWEEP (F)");
      else if(p.type === "emp") showToast("SECONDARY -> EMP BURST (F)");
      else if(p.type === "lock") showToast("SECONDARY -> TARGET LOCK (F)");
      else if(p.type === "autofire") showToast("SECONDARY -> AUTO-FIRE (F)");
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
      ghostFade: false,
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

function applySelectedShotType(){
  if(tutorialActive){
    if(inputs.shotType) inputs.shotType.value = "single";
    resetShotType();
    return;
  }
  if(sandboxMode || !inputs.shotType) return;
  var selected = String(inputs.shotType.value || "single");
  if(selected !== "single" && selected !== "missile" && !shotIcons[selected]){
    selected = "single";
  }
  if(selected === "missile" && !isMissileAllowed()) selected = "single";
  player.blasterMode = selected;
  if(selected === "single"){
    player.blasterHitsRemaining = 0;
  }else{
    player.blasterHitsRemaining = 9999;
    player.blasterTimer = 0;
  }
}

function triggerTutorialRecovery(reason){
  if(!tutorialActive || !tourGuide || tutorialRecoveryActive || tutorialHullRecoveryShown) return false;
  tutorialRecoveryActive = true;
  tutorialHullRecoveryShown = true;
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
  if(tutorialActive){
    if(inputs.shotType) inputs.shotType.value = "single";
    resetShotType();
  }else if(!sandboxMode && inputs.shotType){
    var selectedShotType = String(inputs.shotType.value || "single");
    if(selectedShotType !== "single" && selectedShotType !== "missile" && !shotIcons[selectedShotType]){
      selectedShotType = "single";
    }
    if(selectedShotType === "missile" && !isMissileAllowed()) selectedShotType = "single";
    player.blasterMode = selectedShotType;
    if(selectedShotType === "single"){
      player.blasterHitsRemaining = 0;
    }else{
      player.blasterHitsRemaining = 9999;
      player.blasterTimer = 0;
    }
  }
  if(!state.sound) setDrone(state, false);
  setSoundtrack(state, state.sound && !state.over && (state.running || countdownActive || introActive || missionBriefShowing));
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

function stopTimerMark15Sfx(){
  if(state.timerMark15Clip){
    try{
      state.timerMark15Clip.pause();
      state.timerMark15Clip.currentTime = 0;
    }catch(e){}
    state.timerMark15Clip = null;
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
  stopTimerMark15Sfx();
}

function resetSession(){
  if(gameOverSfxTimer){
    clearTimeout(gameOverSfxTimer);
    gameOverSfxTimer = 0;
  }
  stopMissionClearedSfx();
  stopTimerMark15Sfx();
  closeMissileInput();
  if(countdownTimerId){
    clearInterval(countdownTimerId);
    countdownTimerId = 0;
  }
  if(launchHoldTimer){
    clearTimeout(launchHoldTimer);
    launchHoldTimer = 0;
  }
  if(state.sandboxAlienWaveActive){
    stopSandboxAlienWave();
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
  state.powerupsUsed = 0;
  state.powerupsCollectedByType = {};
  state.powerupsUsedByType = {};
  state.powerupsMissedByType = {};
  state.aliensShotByType = {};
  state.specialUses = 0;
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
  state.questionReady = false;
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
  state.shotCounts = {};
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
  state.alienSwarmPoolId = 0;
  state.alienSwarmDigitBag = [];

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
  player.secondarySlots = [null, null, null];
  player.secondarySlotIndex = 0;
  player.secondaryCooldown = 0;
  player.lockTimer = 0;
  player.lockTargetId = 0;
  player.defenseMode = "none";
  player.defenseTimer = 0;
  player.armorBlocksRemaining = 0;
  player.scopeTimer = 0;
  player.overflightTimer = 0;
  player.phaseTimer = 0;
  player.compassTimer = 0;
  player.magnetTimer = 0;
  player.autoFireActive = false;
  player.autoFireAmmo = 0;
  player.autoFireAmmoMax = 0;
  player.autoFireMode = "single";
  player.autoFireSpinning = false;
  player.autoFireSpinTimer = 0;
  player.autoFireSpinSfxPlayed = false;
  applySelectedShotType();

  player.hull = 1;
  player.lowHullAlarmed = false;
  player.lastDamageAt = 0;
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
  if(state.alienSwarm){
    setAlienUnlocked(true);
    state.spawnTimer = 9999;
    state.correctInPlay = false;
    state.correctAsteroidId = 0;
    resetAlienSwarmPool();
  }else{
    setAlienUnlocked(false);
  }
  syncHud();
  setDrone(state, true);
  if(tutorialActive && !state.soundtrackPrimed){
    setSoundtrackStartIndex(getSoundtrackStartIndex());
    setSoundtrack(state, true);
    state.soundtrackPrimed = true;
  }
  if(isSandboxMultiplayer()){
    ensurePilot2();
    pilot2.hull = 1;
    pilot2.lowHullAlarmed = false;
    pilot2.lastDamageAt = 0;
    pilot2.invuln = 0;
    pilot2.hitFlash = 0;
    pilot2.shipShake = 0;
    pilot2.dead = false;
    pilot2.hidden = false;
    pilot2.livesStart = Math.max(0, state.livesStart || state.lives || 0);
    pilot2.lives = pilot2.livesStart;
    resetPilotStats(1);
    resetPilotStats(2);
    positionSandboxPilots();
  }
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
  if(!state.soundtrackPrimed){
    setSoundtrackStartIndex(getSoundtrackStartIndex());
    setSoundtrack(state, true);
    state.soundtrackPrimed = true;
  }

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
    setSoundtrack(state, state.sound && !state.over && (state.running || countdownActive || introActive || missionBriefShowing));
    showToast("MISSION START");
  }, 600);

  return true;
}

function startIntroThenCountdown(){
  if(!countdownEl) return false;
  if(countdownEl.classList.contains("show") || introActive) return true;
  if(missionBriefShowing) return true;

  if(!tutorialActive && !missionBriefShowing && !missionBriefBypass && !sandboxMode){
    ensureMissionBrief();
    if(missionBriefOverlay){
      if(countdownEl) countdownEl.classList.remove("show");
      countdownActive = false;
      hideEndOverlay();
      missionBriefTitle.textContent = "";
      missionBriefBody.textContent = "";
      startMissionBriefTypewriter("OBJECTIVE", getMissionBriefText());
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
  loadTouchControlsEnabled();
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

var autoFireCooldowns = {
  single: 0.18,
  laser: 0.12,
  fire: 0.14,
  ice: 0.16,
  electric: 0.15,
  pierce: 0.24,
  plasma: 0.22,
  rail: 0.26
};

var autoFireAmmoMap = {
  single: 300,
  laser: 325,
  fire: 250,
  ice: 350,
  electric: 500,
  pierce: 100,
  plasma: 400,
  rail: 550
};

function getAutoFireCooldown(mode){
  var key = String(mode || "single");
  if(key === "missile") return null;
  if(Object.prototype.hasOwnProperty.call(autoFireCooldowns, key)) return autoFireCooldowns[key];
  return autoFireCooldowns.single;
}

function getAutoFireAmmo(mode){
  var key = String(mode || "single");
  if(Object.prototype.hasOwnProperty.call(autoFireAmmoMap, key)) return autoFireAmmoMap[key];
  return autoFireAmmoMap.single;
}

function recordShotCount(type){
  if(!state.shotCounts) state.shotCounts = {};
  var key = String(type || "single");
  state.shotCounts[key] = (state.shotCounts[key] || 0) + 1;
}

function recordShotCountForPilot(pilotId, type){
  recordShotCount(type);
  recordPilotShot(pilotId, type);
}

function cleanupAutoFireSlots(){
  var slots = getSecondarySlots();
  var changed = false;
  for(var i=0; i<slots.length; i++){
    var slot = slots[i];
    if(slot && slot.type === "autofire" && !(slot.count > 0) && !player.autoFireActive){
      slots[i] = null;
      changed = true;
    }
  }
  if(changed) syncSelectedSecondary();
}

function fireForPilot(pilot, pilotId, cooldownOverride){
  if(!state.running || state.paused || state.over) return;
  if(tutorialActive && tutorialMineralsFreeze) return false;
  if(pilotId === 1 && tutorialActive && tutorialShootLocked) return false;
  if(pilot.cooldown > 0) return;

  if(typeof cooldownOverride === "number" && isFinite(cooldownOverride)){
    pilot.cooldown = cooldownOverride;
  }else{
    pilot.cooldown = 0.16;
  }
  var mode = pilot.blasterMode || "single";
  if(mode === "missile"){
    return false;
  }
  state.shots++;
  recordShotCountForPilot(pilotId, mode);
  var bulletBase = { pilotId: pilotId, x: pilot.x, y: pilot.y - 24, vx: 0 };
  if(mode === "laser"){
    bullets.push(Object.assign({ vy: -980, r: 5.2, kind: "laser", len: 22, w: 3.6 }, bulletBase));
  }else if(mode === "fire"){
    bullets.push(Object.assign({ vy: -720, r: 6.2, kind: "fire" }, bulletBase));
  }else if(mode === "ice"){
    bullets.push(Object.assign({ vy: -880, r: 6.5, kind: "ice", y: pilot.y - 26 }, bulletBase));
  }else if(mode === "electric"){
    bullets.push(Object.assign({ vy: -920, r: 5.6, kind: "electric" }, bulletBase));
    state.lightningFlash = Math.max(state.lightningFlash || 0, 0.12);
  }else if(mode === "pierce"){
    bullets.push(Object.assign({ vy: -900, r: 3.8, kind: "pierce", speed: 900, rot: 0, spin: 6 }, bulletBase));
  }else if(mode === "plasma"){
    bullets.push(Object.assign({ vy: -1000, r: 7.6, kind: "plasma" }, bulletBase));
  }else if(mode === "rail"){
    bullets.push(Object.assign({ vy: -1260, r: 5.2, kind: "rail", len: 40, w: 4.2, y: pilot.y - 26 }, bulletBase));
  }else{
    bullets.push(Object.assign({ vy: -880, r: 4.0, kind: "single" }, bulletBase));
  }

  spawnGunSmoke(pilot);
  pilot.recoil = 1;
  pilot.flash = 1;
  var gunSfx = (mode === "laser") ? "gun2" : "gun1";
  if(mode === "ice") gunSfx = "ice_shot";
  if(mode === "electric") gunSfx = "electric_shot";
  if(mode === "fire") gunSfx = "flame_shot";
  if(mode === "plasma") gunSfx = "shot_orb";
  if(mode === "rail") gunSfx = "shot_railbeam";
  playSfx(state, gunSfx);
  if(tourGuide) tourGuide.notify("fire");
  return true;
}

function fire(cooldownOverride){
  return fireForPilot(player, 1, cooldownOverride);
}

function secondaryFireForPilot(pilot, pilotId){
  if(!state.running || state.paused || state.over) return;
  if(pilot.secondaryCooldown > 0) return;

  var slots = getSecondarySlotsForPilot(pilot);
  var idx = clamp(pilot.secondarySlotIndex | 0, 0, slots.length - 1);
  var slot = slots[idx];
  if(!slot || !slot.type || !(slot.count > 0)){
    syncSelectedSecondaryForPilot(pilot);
    slot = slots[pilot.secondarySlotIndex];
    if(!slot || !slot.type || !(slot.count > 0)) return;
  }
  var activeType = slot.type;
  if(activeType === "autofire" && !(slot.count > 0)){
    syncSelectedSecondaryForPilot(pilot);
    return;
  }
  if(activeType === "autofire"){
    if(pilot.autoFireActive){
      pilot.autoFireActive = false;
      pilot.autoFireAmmo = 0;
      pilot.autoFireAmmoMax = 0;
      pilot.autoFireMode = "single";
      pilot.autoFireSpinning = false;
      pilot.autoFireSpinTimer = 0;
      pilot.autoFireSpinSfxPlayed = false;
      pilot.secondaryCooldown = 0.35;
      showToast("SECONDARY -> AUTO-FIRE OFF");
      return;
    }
    if(pilot.blasterMode === "missile" && pilot.blasterHitsRemaining > 0){
      pilot.blasterMode = "single";
      pilot.blasterHitsRemaining = 0;
      pilot.blasterTimer = 0;
      pilot.secondaryCooldown = 0.35;
      showToast("SECONDARY -> MISSILE OFF");
      return;
    }
  }
  slot.count = Math.max(0, (slot.count || 0) - 1);
  pilot.secondaryCharges = slot.count;
  pilot.secondaryCooldown = 1.2;
  if(!isSandboxMultiplayer()){
    state.powerupsUsed = (state.powerupsUsed || 0) + 1;
    if(activeType){
      if(!state.powerupsUsedByType) state.powerupsUsedByType = {};
      state.powerupsUsedByType[activeType] = (state.powerupsUsedByType[activeType] || 0) + 1;
    }
  }
  if(pilotId){
    var stats = ensurePilotStats(pilotId);
    stats.powerupsUsed += 1;
    if(activeType){
      stats.powerupsUsedByType[activeType] = (stats.powerupsUsedByType[activeType] || 0) + 1;
    }
  }

  if(activeType === "repair"){
    pilot.hull = clamp(pilot.hull + 0.35, 0, 1);
    pilot.lowHullAlarmed = false;
    spawnRing(pilot.x, pilot.y, 18);
    spawnParticles(pilot.x, pilot.y, "correct");
    showToast("SECONDARY -> HULL REPAIR");
  }else if(activeType === "autofire"){
    var mode = pilot.blasterMode || "single";
    if(mode === "missile"){
      mode = "single";
    }
    var ammo = getAutoFireAmmo(mode);
    if(!pilot.autoFireActive){
      pilot.autoFireAmmo = 0;
      pilot.autoFireAmmoMax = 0;
    }
    pilot.autoFireActive = true;
    pilot.autoFireMode = mode;
    pilot.autoFireAmmo += ammo;
    pilot.autoFireAmmoMax += ammo;
    showToast("SECONDARY -> AUTO-FIRE ONLINE");
  }else if(activeType === "time"){
    startSlowMoWave();
    playSfx(state, "time_activate");
    showToast("SECONDARY -> TIME DILATION");
  }else if(activeType === "magnet"){
    pilot.magnetTimer = 6.0;
    showToast("SECONDARY -> MAGNET SWEEP");
  }else if(activeType === "emp"){
    state.empTimer = Math.max(state.empTimer, 2.0);
    startEmpWave();
    playSfx(state, "emp_activate");
    showToast("SECONDARY -> EMP BURST");
  }else if(activeType === "lock"){
    pilot.lockTimer = Math.max(pilot.lockTimer, 6.0);
    showToast("SECONDARY -> TARGET LOCK");
  }else if(activeType === "scope"){
    pilot.scopeTimer = 1;
    showToast("SECONDARY -> SCOPE ONLINE");
  }

  if(activeType === "autofire"){
    if(slot.count < 0) slot.count = 0;
    if(slot.count === 0 && !pilot.autoFireActive){
      slots[idx] = null;
    }
  }else if(slot.count <= 0){
    slots[idx] = null;
  }
  syncSelectedSecondaryForPilot(pilot);
  if(pilotId === 1 && tutorialActive && tutorialShootLocked){
    if(tutorialStepId !== "secondary_time" && tutorialStepId !== "secondary_emp" && tutorialStepId !== "secondary_magnet" && tutorialStepId !== "secondary_aid"){
      tutorialShootLocked = false;
      showToast("SHOOTING ONLINE");
    }
  }
  if(tourGuide){
    if(activeType === "time") tourGuide.notify("secondary_time");
    if(activeType === "emp") tourGuide.notify("secondary_emp");
    if(activeType === "magnet") tourGuide.notify("secondary_magnet");
    tourGuide.notify("secondary");
  }
}

function secondaryFire(){
  return secondaryFireForPilot(player, 1);
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
  if(isSandboxSplitMode()){
    var lane = getLaneBounds(1);
    endX = clamp(endX, lane.minX + player.w / 2 + 2, lane.maxX - player.w / 2 - 2);
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
  state.specialUses = (state.specialUses || 0) + 1;

  if(tutorialActive && tutorialStepId === "ability_clear" && tourGuide){
    tourGuide.notify("ability");
  }

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

  if(profile.ability === "overflight"){
    player.overflightTimer = Math.max(player.overflightTimer || 0, 6);
    player.invuln = Math.max(player.invuln || 0, 0.25);
    playSfx(state, "dash");
    showToast("OVERFLIGHT");
    if(tourGuide) tourGuide.notify("ability");
    return;
  }

  if(profile.ability === "phase"){
    player.phaseTimer = Math.max(player.phaseTimer || 0, 6);
    player.invuln = Math.max(player.invuln || 0, 0.4);
    playSfx(state, "teleport_disappear");
    showToast("INTANGIBLE");
    if(tourGuide) tourGuide.notify("ability");
    return;
  }

  if(profile.ability === "compass"){
    player.compassTimer = Math.max(player.compassTimer || 0, 6);
    playSfx(state, "dash");
    showToast("COMPASS ONLINE");
    if(tourGuide) tourGuide.notify("ability");
    return;
  }

  if(profile.ability === "knock3"){
    player.phaseTimer = Math.max(player.phaseTimer || 0, 0.9);
    player.invuln = Math.max(player.invuln || 0, 0.6);
    var knockRadius = 220;
    var knockTargets = [];
    for(var i=0; i<asteroids.length; i++){
      var a = asteroids[i];
      if(!a || a.ghost || a.noDamage || a.grabbedByClaw) continue;
      if(isSandboxSplitMode() && getLaneIdForX(a.x) !== 1) continue;
      var dx = a.x - player.x;
      var dy = a.y - (player.y - 6);
      var dist = Math.hypot(dx, dy);
      if(dist <= knockRadius){
        knockTargets.push({ a: a, d: dist, dx: dx, dy: dy });
      }
    }
    knockTargets.sort(function(p1, p2){ return p1.d - p2.d; });
    for(var k=0; k<Math.min(3, knockTargets.length); k++){
      var t = knockTargets[k];
      var ast = t.a;
      var distN = Math.max(1, t.d);
      var nx = t.dx / distN;
      var ny = t.dy / distN;
      markAsteroidEffect(ast, "fade", 0.9);
      ast.noDamage = true;
      ast.ghost = true;
      ast.ghostFade = true;
      ast.vx = (ast.vx || 0) + nx * 360;
      ast.vy = Math.max(ast.vy || 0, 420) + Math.abs(ny) * 320;
    }
    playSfx(state, "dash");
    showToast("KNOCKBACK");
    if(tourGuide) tourGuide.notify("ability");
    return;
  }

  if(profile.ability === "frontclear"){
    var cleared = 0;
    var stampedeActive = isStampedeMode();
    var targets = [];
    for(var f=0; f<asteroids.length; f++){
      var fa = asteroids[f];
      if(!fa || fa.ghost || fa.label === null || fa.grabbedByClaw) continue;
      if(isSandboxSplitMode() && getLaneIdForX(fa.x) !== 1) continue;
      if(fa.y < player.y - 10){
        targets.push(fa);
      }
    }
    for(var tIdx=0; tIdx<targets.length; tIdx++){
      var target = targets[tIdx];
      var idx = asteroids.indexOf(target);
      if(idx === -1) continue;
      var wasCorrect = target.isCorrect && target.waveId === state.waveId;
      if(isPartialSumsMode()){
        var expectedValue = Number(getCurrentCorrectTargetValue());
        var hitValue = Number(target.label);
        wasCorrect = Number.isFinite(expectedValue) && Number.isFinite(hitValue) && hitValue === expectedValue;
      }
      if(isDivisorsMode()){
        if(isDivisorLabel(target.label)){
          var divisorNew = markDivisorHit(target.label);
          if(divisorNew){
            handleDivisorCorrectHit(target);
            impactCorrect(target.x, target.y, target.r);
          }else{
            impactDebris(target.x, target.y);
          }
        }else{
          impactDebris(target.x, target.y);
        }
      }else if(wasCorrect){
        var wid = state.waveId;
        state.correctInPlay = false;
        state.correctAsteroidId = 0;
        retireWave(wid);
        if(stampedeActive){
          onStampedeCorrect(target);
        }else{
          onCorrectHit(target);
        }
        impactCorrect(target.x, target.y, target.r);
      }else{
        impactDebris(target.x, target.y);
      }
      asteroids.splice(idx, 1);
      cleared += 1;
    }
    if(cleared){
      kickShake(14, 0.12);
      triggerCameraFlash(0.12);
    }
    playSfx(state, "dash");
    showToast("CLEAR FRONT");
    if(tourGuide) tourGuide.notify("ability");
    return;
  }

  if(profile.ability === "downshock"){
    var downRadius = profile.shockwaveRadius || 160;
    var downStrength = profile.shockwaveStrength || 520;
    for(var di=0; di<asteroids.length; di++){
      var da = asteroids[di];
      if(da.ghost || da.label === null) continue;
      var dxD = da.x - player.x;
      var dyD = da.y - (player.y - 6);
      if(dyD <= 0) continue;
      var distD = Math.hypot(dxD, dyD);
      if(distD > downRadius) continue;
      var push = (1 - distD / downRadius) * downStrength;
      da.vy = (da.vy || 0) + push * 0.85;
    }
    kickShake(10, 0.1);
    playSfx(state, "dash");
    showToast("DOWNBURST");
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
  if(tutorialActive){
    if(player.hull <= 0){
      triggerTutorialRecovery(reason || "HULL CRITICAL");
    }else{
      syncHud();
      showToast(reason || "HULL CRITICAL");
    }
    return;
  }
  if(sandboxMode && state.sandboxInfiniteLives){
    syncHud();
    showToast(reason);
    return;
  }
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
  if(tutorialActive){
    if(player.hull <= 0){
      triggerTutorialRecovery(detail || "HULL CRITICAL");
    }else{
      syncHud();
      showToast(detail || "HULL CRITICAL");
    }
    return true;
  }
  if(sandboxMode && state.sandboxInfiniteLives){
    syncHud();
    return false;
  }
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

function getLetterRank(acc){
  if(acc >= 0.9) return "S";
  if(acc >= 0.8) return "A";
  if(acc >= 0.7) return "B";
  if(acc >= 0.6) return "D";
  return "E";
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
    highScoresByKey: {},
    allScores: []
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
    wrong: session.wrong || 0,
    missed: session.missed || 0,
    duration: session.duration || 0,
    accuracy: typeof session.accuracy === "number" ? session.accuracy : 0,
    rank: session.rank || getLetterRank(typeof session.accuracy === "number" ? session.accuracy : 0),
    level: session.level,
    mode: session.mode,
    difficulty: session.difficulty || "",
    timerMode: session.timerMode || "",
    timeLimitSec: session.timeLimitSec || 0,
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

  stats.allScores = stats.allScores || [];
  stats.allScores.push(entry);

  saveLifetimeStats(stats);
  return stats;
}

function renderHighScores(lifetime, modeKey, modeInfo){
  if(!endScoresBody) return;
  endScoresBody.innerHTML = "";
  if(endScoresTitle && modeInfo){
    endScoresTitle.textContent = "Scores - " + modeInfo.operation + " / " + modeInfo.modeLabel + " / " + modeInfo.submode;
  }
  var hs = [];
  if(lifetime && lifetime.highScoresByKey && modeKey && lifetime.highScoresByKey[modeKey]){
    hs = lifetime.highScoresByKey[modeKey];
  }else{
    hs = lifetime && lifetime.highScores ? lifetime.highScores : [];
  }
  if(!hs.length){
    var emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="7" style="color: var(--muted); padding:10px 8px;">No scores yet.</td>';
    endScoresBody.appendChild(emptyRow);
    return;
  }
  for(var h=0; h<hs.length; h++){
    var item = hs[h];
    var acc = typeof item.accuracy === "number" ? item.accuracy : 0;
    if(!acc && typeof item.correct === "number"){
      var denom = (item.correct || 0) + (item.wrong || 0) + (item.missed || 0);
      acc = denom > 0 ? (item.correct / denom) : 0;
    }
    var rank = item.rank || getLetterRank(acc);
    var tr = document.createElement("tr");
    var name = item.name || "—";
    var completed = item.date ? new Date(item.date).toLocaleString() : "—";
    tr.innerHTML = "<td>#" + (h+1) + "</td>" +
      "<td>" + name + "</td>" +
      "<td>" + (item.score || 0) + "</td>" +
      "<td>" + rank + "</td>" +
      "<td>" + (item.level || 0) + "</td>" +
      "<td>" + completed + "</td>";
    endScoresBody.appendChild(tr);
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
  if(stats.allScores && stats.allScores.length){
    for(var k=0;k<stats.allScores.length;k++){
      if(stats.allScores[k].id === state.lastSessionId){
        stats.allScores[k].name = trimmed;
        break;
      }
    }
  }
  saveLifetimeStats(stats);
  renderHighScores(stats, entryKey);
  try{ localStorage.setItem("mathsteroid.playerName", trimmed); }catch(e){}
  appendLeaderboardCsv({ name: trimmed, score: state.score });
}

function findSecondarySlotIndexByType(type){
  var slots = getSecondarySlots();
  for(var i=0; i<slots.length; i++){
    var slot = slots[i];
    if(slot && slot.type === type && slot.count > 0) return i;
  }
  return -1;
}

function selectTutorialSecondary(type){
  var idx = findSecondarySlotIndexByType(type);
  if(idx >= 0){
    selectSecondaryByIndex(idx);
    return true;
  }
  return false;
}

function getTutorialDecoyLabel(correctLabel){
  var answer = Number(correctLabel);
  if(Number.isNaN(answer)) answer = 0;
  for(var i=0; i<16; i++){
    var delta = randi(2, 14);
    if(Math.random() < 0.5) delta *= -1;
    var candidate = answer + delta;
    if(candidate === answer) continue;
    if(candidate < 0) candidate = Math.abs(candidate) + 2;
    return candidate;
  }
  return answer + 3;
}

function spawnTutorialAsteroidAt(label, isCorrect, x, y, vy){
  spawnAsteroid(label, !!isCorrect, 0);
  var a = asteroids.length ? asteroids[asteroids.length - 1] : null;
  if(!a) return null;
  a.x = x;
  a.y = y;
  a.vx = 0;
  a.vy = vy;
  a.baseVy = vy;
  a.spawnSide = "top";
  a.spawnFade = 1;
  a.spawnFadeDur = 0;
  a.warned = false;
  if(isCorrect){
    state.correctInPlay = true;
    state.correctAsteroidId = a.id;
  }
  return a;
}

function setupTutorialPowerupField(config){
  if(!tutorialActive) return;
  var cfg = config || {};
  var centerX = view.w * 0.5;
  var answerX = (typeof cfg.answerX === "number") ? cfg.answerX : centerX;
  var answerY = (typeof cfg.answerY === "number") ? cfg.answerY : (view.hudH + 150);
  var answerVy = (typeof cfg.answerVy === "number") ? cfg.answerVy : 72;
  var decoys = Math.max(0, cfg.decoys | 0);
  var addBlocker = !!cfg.blocker;

  asteroids.length = 0;
  state.correctInPlay = false;
  state.correctAsteroidId = 0;
  state.spawnTimer = Math.max(state.spawnTimer || 0, 1.4);
  tutorialSpawnUnlocked = false;

  var answerLabel = getCurrentCorrectTargetValue();
  spawnTutorialAsteroidAt(answerLabel, true, answerX, answerY, answerVy);

  if(addBlocker){
    var blockerY = Math.min(view.h - 180, answerY + 96);
    spawnTutorialAsteroidAt(getTutorialDecoyLabel(answerLabel), false, answerX, blockerY, answerVy * 0.92);
  }

  for(var i=0; i<decoys; i++){
    var offset = ((i % 2) ? 1 : -1) * (90 + i * 28);
    var x = clamp(answerX + offset, 56, view.w - 56);
    var y = answerY + 22 + i * 34;
    spawnTutorialAsteroidAt(getTutorialDecoyLabel(answerLabel), false, x, y, answerVy * (0.88 + Math.random() * 0.2));
  }
}

function beginTutorialMineralsFreeze(hitAst){
  if(!tutorialActive || tutorialStepId !== "correct" || !hitAst || hitAst.label == null) return;
  var mineralTarget = getHighestDigit(hitAst.label);
  tutorialMineralsFreeze = true;
  tutorialFreezeDimTarget = 1;
  tutorialFreezeMousepadRestore = !!mousepadActive;
  if(mousepadActive) setMousepadActive(false);
  tutorialMineralsTarget = mineralTarget;
  tutorialMineralsCollected = 0;
  tutorialMineralsComplete = mineralTarget <= 0;
  tutorialMineralsPending = tutorialMineralsComplete;
  tutorialMineralsRemaining = Math.max(0, mineralTarget);
  tutorialSpawnUnlocked = false;
  pointerDown = false;
  resetTouchInputState();
  asteroids.length = 0;
  state.correctInPlay = false;
  state.correctAsteroidId = 0;
  state.spawnTimer = Math.max(state.spawnTimer || 0, 1.6);
  updateCursorVisibility();
}

function isTutorialCorrectShotStep(){
  return tutorialActive && (tutorialStepId === "correct" || tutorialStepId === "correct_after_magnet" || tutorialStepId === "ability_shot");
}

function queueTutorialSecondChance(){
  if(!isTutorialCorrectShotStep() || tutorialSecondChanceBusy) return;
  tutorialSecondChanceBusy = true;
  tutorialSpawnUnlocked = false;
  state.correctInPlay = false;
  state.correctAsteroidId = 0;
  state.spawnTimer = Math.max(state.spawnTimer || 0, 1.5);
  asteroids.length = 0;
  showToast("SECOND CHANCE");
  var spawnRetryPool = function(){
    tutorialSecondChanceBusy = false;
    setupTutorialPowerupField({ decoys: 0, blocker: false, answerVy: 74 });
  };
  if(tourGuide){
    tourGuide.interject([
      {
        id: "tutorial_second_chance",
        title: "Second Chance",
        body: "Sometimes there are second chances. Take a breath and line up the correct asteroid.",
        autoAdvanceMs: 2200,
        showProgress: false
      }
    ], spawnRetryPool);
  }else{
    spawnRetryPool();
  }
}

function handleDivisorCorrectHit(hitAst){
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
  beginTutorialMineralsFreeze(hitAst);
  if(hitAst && hitAst.label != null){
    spawnMineralBurst(hitAst.x, hitAst.y, getHighestDigit(hitAst.label));
  }

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
  }

  syncHud();

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
      if(!spawned && state.divisorRemaining <= 0){
        if(waveHadWrongHit){
          cleanWaveStreak = 0;
        }else{
          cleanWaveStreak += 1;
        }
        waveHadWrongHit = false;
        if(cleanWaveStreak >= 3){
          if(maybeSpawnEventPowerup(1.0)){
            cleanWaveStreak = 0;
            spawned = true;
          }
        }
      }
    }
  }

  if(state.divisorRemaining <= 0){
    state.questionsCompleted++;
    if(shouldEndByQuestionLimit()){
      endGame("questions");
      return;
    }
    nextProblem();
  }
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
  beginTutorialMineralsFreeze(hitAst);
  if(hitAst && hitAst.label != null){
    spawnMineralBurst(hitAst.x, hitAst.y, getHighestDigit(hitAst.label));
  }

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
        if(sandboxMode && state.sandboxAlienWave && !state.sandboxAlienWaveActive){
          state.sandboxAlienWaveQueued = (state.sandboxAlienWaveQueued || 0) + 1;
          var remainingWave = Math.max(0, sandboxAlienWaveRequired - state.sandboxAlienWaveQueued);
          if(remainingWave <= 0){
            startSandboxAlienWave();
          }else{
            showToast("ALIEN WAVE IN " + remainingWave);
          }
        }
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

function onStampedeCorrect(hitAst){
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
  state.streak = 0;
  playSfx(state, "correct");
  if(tourGuide) tourGuide.notify("correct");
  beginTutorialMineralsFreeze(hitAst);
  syncHud();
  var completedQuestion = false;
  if(state.answerDigits && state.digitsLeft > 0){
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
}

function onWrongHit(){
  state.wrong++;
  state.hits++;
  state.streak = 0;
  waveHadWrongHit = true;
  state.score = Math.max(0, state.score - 60);
  playSfx(state, "wrong_asteroid");
  triggerCameraFlash(0.18);

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
  if(endPhaseTimeoutId){
    clearTimeout(endPhaseTimeoutId);
    endPhaseTimeoutId = 0;
  }
  if(endStageFadeTimer){
    clearTimeout(endStageFadeTimer);
    endStageFadeTimer = 0;
  }
  if(endMineralAnimId){
    cancelAnimationFrame(endMineralAnimId);
    endMineralAnimId = 0;
  }
}

function setEndStageVisible(stageId){
  var all = [
    endStageSummary,
    endStageEngagement,
    endStageName,
    endStagePlacement,
    endStageActions
  ];
  for(var i=0; i<all.length; i++){
    var el = all[i];
    if(!el) continue;
    el.classList.toggle("isActive", el.id === stageId);
  }
}

function transitionEndStage(stageId, onShown){
  if(!endSequence || !endSequence.classList.contains("reveal-sequence")){
    setEndStageVisible(stageId);
    if(typeof onShown === "function") onShown();
    return;
  }
  if(endStageFadeTimer){
    clearTimeout(endStageFadeTimer);
    endStageFadeTimer = 0;
  }
  endSequence.classList.add("phase-fade-out");
  endStageFadeTimer = setTimeout(function(){
    endStageFadeTimer = 0;
    setEndStageVisible(stageId);
    endSequence.classList.remove("phase-fade-out");
    if(typeof onShown === "function") onShown();
  }, END_STAGE_FADE_MS);
  endSequenceTimers.push(endStageFadeTimer);
}

function resetEndSequence(){
  clearEndSequenceTimers();
  endSequenceActive = false;
  endPhase = "";
  endNameConfirmed = false;
  endSequenceContext = null;
  setEndStageVisible("");
  if(endSequence){
    endSequence.classList.remove("reveal-sequence", "reveal-score", "reveal-stats", "reveal-name");
  }
  if(overlayEnd){
    overlayEnd.classList.remove("reveal-reason");
  }
}

function animateMineralsCount(target, durationMs, onDone){
  if(!endMineralsCollected){
    if(typeof onDone === "function") onDone();
    return;
  }
  if(endMineralAnimId){
    cancelAnimationFrame(endMineralAnimId);
    endMineralAnimId = 0;
  }
  var safeTarget = Math.max(0, Math.round(Number(target) || 0));
  var duration = Math.max(1, Number(durationMs) || 1200);
  endMineralAnimStart = performance.now();
  function tick(now){
    var t = Math.min(1, (now - endMineralAnimStart) / duration);
    var eased = 1 - Math.pow(1 - t, 2);
    var value = Math.round(safeTarget * eased);
    endMineralsCollected.textContent = String(value);
    if(t < 1){
      endMineralAnimId = requestAnimationFrame(tick);
      return;
    }
    endMineralAnimId = 0;
    if(typeof onDone === "function") onDone();
  }
  endMineralAnimId = requestAnimationFrame(tick);
}

function resolveEndPlacementText(){
  var ctx = endSequenceContext;
  if(!ctx || !ctx.lifetime || !ctx.modeInfo){
    return "Position unavailable for this run.";
  }
  var allScores = Array.isArray(ctx.lifetime.allScores) ? ctx.lifetime.allScores : [];
  var filtered = allScores.filter(function(entry){
    return entry && entry.modeKey === ctx.modeInfo.key;
  }).sort(function(a, b){
    var scoreA = Number(a && a.score) || 0;
    var scoreB = Number(b && b.score) || 0;
    if(scoreB !== scoreA) return scoreB - scoreA;
    var dateA = Date.parse((a && a.date) || 0) || 0;
    var dateB = Date.parse((b && b.date) || 0) || 0;
    return dateA - dateB;
  });
  var pos = -1;
  for(var i=0; i<filtered.length; i++){
    if(filtered[i] && filtered[i].id === state.lastSessionId){
      pos = i + 1;
      break;
    }
  }
  if(pos < 1){
    return "Score saved. Placement is updating.";
  }
  return "You placed #" + pos + " with " + (Number(state.score) || 0) + " points.";
}

function scheduleEndPhaseAdvance(delayMs){
  var safeDelay = Math.max(0, Number(delayMs) || 0);
  endPhaseTimeoutId = setTimeout(function(){
    endPhaseTimeoutId = 0;
    advanceEndSequencePhase();
  }, safeDelay);
  endSequenceTimers.push(endPhaseTimeoutId);
}

function showEndSummaryPhase(){
  endPhase = "summary";
  transitionEndStage("endStageSummary", function(){
    scheduleEndPhaseAdvance(END_PHASE_SUMMARY_MS);
  });
}

function showEndEngagementPhase(){
  endPhase = "engagement";
  transitionEndStage("endStageEngagement", function(){
    if(endMineralsCollected){
      endMineralsCollected.textContent = "0";
    }
    if(endMineralsTotal){
      endMineralsTotal.textContent = "TOTAL MINERALS: --";
    }
    animateMineralsCount(state.mineralsEarned || 0, 1400, function(){
      if(endMineralsTotal){
        endMineralsTotal.textContent = "TOTAL MINERALS: " + (Number(mineralsTotal) || 0);
      }
    });
    scheduleEndPhaseAdvance(END_PHASE_ENGAGEMENT_MS);
  });
}

function showEndNamePhase(){
  endPhase = "name";
  transitionEndStage("endStageName", function(){
    if(btnHighScoresToggle){
      btnHighScoresToggle.textContent = "CONTINUE";
    }
    if(endNameInput){
      endNameInput.focus();
      endNameInput.select();
    }
  });
}

function showEndPlacementPhase(){
  endPhase = "placement";
  transitionEndStage("endStagePlacement", function(){
    if(endPlacementTitle){
      endPlacementTitle.textContent = "PILOT POSITION";
    }
    if(endPlacementLine){
      endPlacementLine.textContent = resolveEndPlacementText();
    }
    scheduleEndPhaseAdvance(END_PHASE_PLACEMENT_MS);
  });
}

function showEndActionsPhase(){
  endPhase = "actions";
  transitionEndStage("endStageActions");
}

function advanceEndSequencePhase(){
  if(!endSequenceActive) return;
  if(endPhase === "summary"){
    showEndEngagementPhase();
    return;
  }
  if(endPhase === "engagement"){
    showEndNamePhase();
    return;
  }
  if(endPhase === "placement"){
    showEndActionsPhase();
  }
}

function handleEndNameConfirm(){
  if(!endSequenceActive || endPhase !== "name") return false;
  saveScoreName(endNameInput ? endNameInput.value : "");
  endNameConfirmed = true;
  playSfx(state, "menu_beep");
  showToast("NAME SAVED");
  showEndPlacementPhase();
  return true;
}

function startEndSequence(){
  if(!endSequence) return;
  clearEndSequenceTimers();
  endSequenceActive = true;
  endNameConfirmed = false;
  endPhase = "";
  setEndStageVisible("");
  void endSequence.offsetWidth;
  var reasonTimer = setTimeout(function(){
    overlayEnd.classList.add("reveal-reason");
  }, 180);
  endSequenceTimers.push(reasonTimer);
  var sequenceTimer = setTimeout(function(){
    endSequence.classList.add("reveal-sequence");
    showEndSummaryPhase();
  }, 120);
  endSequenceTimers.push(sequenceTimer);
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
  if(tutorialActive){
    triggerTutorialRecovery("HULL CRITICAL");
    return;
  }
  setDrone(state, false);
  setSoundtrack(state, false);
  state.soundtrackPrimed = false;
  stopTimerMark15Sfx();
  state.over = true;
  state.running = false;
  state.paused = false;
  introActive = false;
  countdownActive = false;
  missionBriefShowing = false;
  missionBriefBypass = true;
  if(countdownEl) countdownEl.classList.remove("show");
  if(missionBriefOverlay) missionBriefOverlay.classList.remove("show");
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
    duration: elapsed,
    accuracy: acc,
    rank: getLetterRank(acc),
    bestStreak: computeMaxStreak(),
    level: state.level,
    mode: state.questionMode || "classic",
    difficulty: state.difficulty || "",
    timerMode: state.timeLimitSec ? String(state.timeLimitSec) : "endless",
    timeLimitSec: state.timeLimitSec || 0,
    operation: modeInfo.operation,
    modeLabel: modeInfo.modeLabel,
    submode: modeInfo.submode,
    modeKey: modeInfo.key
  };
  var lifetime = updateLifetimeStats(session);
  state.lastSessionId = sessionId;
  var campaignResult = { active:false, success:false, failures:0, failed:false, hasNext:false, last:false, name:"", pilot:"", minerals:0 };
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
    var earned = Number(state.mineralsEarned || 0);
    if(!Number.isFinite(earned)) earned = 0;
    cState.mineralsEarned = Number.isFinite(cState.mineralsEarned) ? cState.mineralsEarned : 0;
    cState.mineralsEarned += earned;
    saveCampaignState(cState);
    campaignResult.active = true;
    campaignResult.success = reason !== "destroyed";
    campaignResult.failures = cState.failures || 0;
    campaignResult.failed = !!cState.failed;
    campaignResult.last = (campaignIndex + 1) >= ((cData.missions && cData.missions.length) || 0);
    campaignResult.hasNext = campaignResult.success && !campaignResult.failed && !campaignResult.last;
    campaignResult.name = (cData && cData.name) ? cData.name : "Campaign";
    campaignResult.pilot = getActiveProfileName();
    campaignResult.minerals = cState.mineralsEarned || 0;
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
  if(campaignBanner){
    var showBanner = campaignResult.active && campaignResult.success && campaignResult.last;
    campaignBanner.style.display = showBanner ? "flex" : "none";
    if(showBanner){
      var pilotName = campaignResult.pilot || "Pilot";
      var campaignName = campaignResult.name || "Campaign";
      if(campaignBannerTitle) campaignBannerTitle.textContent = "CONGRATULATIONS " + pilotName.toUpperCase();
      if(campaignBannerSubtitle) campaignBannerSubtitle.textContent = campaignName.toUpperCase() + " COMPLETE. NEXT CAMPAIGN UNLOCKED.";
      if(campaignBannerMeta) campaignBannerMeta.textContent = "MINERALS EARNED: " + (campaignResult.minerals || 0);
    }
  }

  var canRenderStats = !!(statsListSecondary || statsList);
  if(canRenderStats){
    if(statsList){
      statsList.innerHTML = "";
      statsList.style.display = "grid";
      statsList.style.gridTemplateColumns = "repeat(3, minmax(0,1fr))";
      statsList.style.gap = "10px";
    }
    if(statsListSecondary){
      statsListSecondary.innerHTML = "";
      statsListSecondary.style.display = "grid";
      statsListSecondary.style.gridTemplateColumns = "repeat(3, max-content)";
      statsListSecondary.style.justifyContent = "start";
      statsListSecondary.style.gap = "12px";
    }
  }

  function ensureEndStatsChartStyles(){
    if(document.getElementById("endStatsCharts")) return;
    var style = document.createElement("style");
    style.id = "endStatsCharts";
    style.textContent = ".endStatsSection{grid-column:1/-1;border:1px solid var(--line);border-radius:14px;padding:10px 12px;background:rgba(255,255,255,.04);}"+
      ".endStatsSection h4{margin:0 0 10px;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);}"+
      ".endStatsRow{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:10px;margin:8px 0;}"+
      ".endStatsIcon{width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,.06);display:grid;place-items:center;overflow:hidden;border:1px solid rgba(255,255,255,.12);}"+
      ".endStatsIcon img{width:20px;height:20px;object-fit:contain;}"+
      ".endStatsBar{height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;position:relative;}"+
      ".endStatsFill{height:100%;border-radius:999px;background:linear-gradient(90deg, rgba(0,229,255,.7), rgba(0,229,255,.35));}"+
      ".endStatsCount{font-size:12px;color:#e8ecff;min-width:38px;text-align:right;}"+
      ".endStatsStackRow{display:flex;flex-direction:column;gap:6px;}"+
      ".endStatsStack{display:flex;gap:18px 22px;align-items:center;flex-wrap:wrap;justify-content:flex-start;}"+
      ".endStatsStackItem{display:flex;align-items:center;gap:12px;}"+
      ".endStatsStackIcon{width:136px;height:136px;border-radius:16px;background:rgba(255,255,255,.06);display:grid;place-items:center;overflow:hidden;border:1px solid rgba(255,255,255,.12);}"+
      ".endStatsStackIcon img{width:120px;height:120px;object-fit:contain;}"+
      ".endStatsStackCount{font-size:14px;font-weight:600;color:#e8ecff;line-height:1;margin-left:0;text-align:left;}"+
      ".endStatsHidden{display:none;}";
    document.head.appendChild(style);
  }
  ensureEndStatsChartStyles();

  function addStatTile(label, value){
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
    row.innerHTML = '<span style="color: var(--muted);">' + label + '</span><b>' + value + '</b>';
    statsList.appendChild(row);
  }

  function addSection(title, list, extraClass){
    var section = document.createElement("div");
    section.className = "endStatsSection";
    if(extraClass) section.classList.add(extraClass);
    var h = document.createElement("h4");
    h.textContent = title;
    section.appendChild(h);
    (list || statsList).appendChild(section);
    return section;
  }

  function getShotIconSrc(type){
    if(type === "single" && bulletSingle && bulletSingle.src) return bulletSingle.src;
    if(shotIcons && shotIcons[type]) return shotIcons[type].src;
    if(type === "missile" && shotIcons && shotIcons.missile) return shotIcons.missile.src;
    return null;
  }

  function addIconBarRow(section, label, iconSrc, count, max){
    var row = document.createElement("div");
    row.className = "endStatsRow";
    var icon = document.createElement("div");
    icon.className = "endStatsIcon";
    if(iconSrc){
      var img = document.createElement("img");
      img.src = iconSrc;
      img.alt = label;
      icon.appendChild(img);
    }else{
      icon.textContent = "--";
    }
    var bar = document.createElement("div");
    bar.className = "endStatsBar";
    var fill = document.createElement("div");
    fill.className = "endStatsFill";
    var pct = max > 0 ? Math.min(100, (count / max) * 100) : 0;
    fill.style.width = pct.toFixed(1) + "%";
    bar.appendChild(fill);
    var countEl = document.createElement("div");
    countEl.className = "endStatsCount";
    countEl.textContent = String(count);
    row.appendChild(icon);
    var textWrap = document.createElement("div");
    textWrap.style.display = "grid";
    var labelEl = document.createElement("div");
    labelEl.textContent = label;
    labelEl.style.fontSize = "11px";
    labelEl.style.color = "var(--muted)";
    textWrap.appendChild(labelEl);
    textWrap.appendChild(bar);
    row.appendChild(textWrap);
    row.appendChild(countEl);
    section.appendChild(row);
  }

function addIconStackRow(section, label, entries){
  var list = Array.isArray(entries) ? entries.filter(function(entry){
    return entry && entry.src && entry.count > 0;
  }) : [];
  if(list.length === 0) return;
  var row = document.createElement("div");
  row.className = "endStatsStackRow";
  var labelEl = document.createElement("div");
  labelEl.textContent = label;
  labelEl.style.fontSize = "11px";
  labelEl.style.color = "var(--muted)";
  var stack = document.createElement("div");
  stack.className = "endStatsStack";
  for(var i=0; i<list.length; i++){
    var entry = list[i];
    var item = document.createElement("div");
    item.className = "endStatsStackItem";
    var icon = document.createElement("div");
    icon.className = "endStatsStackIcon";
    var img = document.createElement("img");
    img.src = entry.src;
    img.alt = label;
    icon.appendChild(img);
    var countEl = document.createElement("div");
    countEl.className = "endStatsStackCount";
    countEl.textContent = String(entry.count);
    item.appendChild(icon);
    item.appendChild(countEl);
    stack.appendChild(item);
  }
  row.appendChild(labelEl);
  row.appendChild(stack);
  section.appendChild(row);
}

  if(canRenderStats){
    var listTarget = statsListSecondary || statsList;
    var alienEntries = [];
    if(state.aliensShotByType){
      alienEntries = Object.keys(state.aliensShotByType)
        .map(function(key){
          var count = state.aliensShotByType[key] || 0;
          if(count <= 0) return null;
          var src = (alienIconsByType && alienIconsByType[key]) ? alienIconsByType[key] : key;
          if(!src) return null;
          return { src: src, count: count };
        })
        .filter(Boolean);
    }
    var alienSection = addSection("ALIENS SHOT", listTarget, "endStatsCompact");
    addIconStackRow(alienSection, "ALIENS SHOT", alienEntries);

    var powerupSection = addSection("POWERUPS", listTarget, "endStatsCompact");
    var collectedEntries = [];
    var collectedMap = state.powerupsCollectedByType || state.powerupsCollectedByTypeAlt || {};
    var activatableTypes = {
      time: true,
      magnet: true,
      emp: true,
      lock: true,
      autofire: true,
      scope: true
    };
    collectedEntries = Object.keys(collectedMap)
      .map(function(type){
        var count = collectedMap[type] || 0;
        if(count <= 0) return null;
        if(activatableTypes[type]) return null;
        var icon = powerupIcons[type];
        if(!icon && shotIcons && shotIcons[type]) icon = shotIcons[type];
        var src = icon ? icon.src : null;
        if(!src) return null;
        return { src: src, count: count };
      })
      .filter(Boolean);
    addIconStackRow(powerupSection, "COLLECTED", collectedEntries);

    var usedEntries = [];
    if(state.powerupsUsedByType){
      usedEntries = Object.keys(state.powerupsUsedByType)
        .map(function(type){
          var count = state.powerupsUsedByType[type] || 0;
          if(count <= 0) return null;
          var icon = powerupIcons[type];
          if(!icon && shotIcons && shotIcons[type]) icon = shotIcons[type];
          var src = icon ? icon.src : null;
          if(!src) return null;
          return { src: src, count: count };
        })
        .filter(Boolean);
    }
    addIconStackRow(powerupSection, "USED", usedEntries);

    var missedEntries = [];
    if(state.powerupsMissedByType){
      missedEntries = Object.keys(state.powerupsMissedByType)
        .map(function(type){
          var count = state.powerupsMissedByType[type] || 0;
          if(count <= 0) return null;
          var icon = powerupIcons[type];
          if(!icon && shotIcons && shotIcons[type]) icon = shotIcons[type];
          var src = icon ? icon.src : null;
          if(!src) return null;
          return { src: src, count: count };
        })
        .filter(Boolean);
    }
    addIconStackRow(powerupSection, "MISSED", missedEntries);

    var mineralCount = state.mineralsEarned || 0;
    if(mineralCount > 0){
      var mineralSection = addSection("MINERALS", listTarget);
      var mineralIcon = "images/asteroids/mineral.png";
      addIconStackRow(mineralSection, "COLLECTED", [{ src: mineralIcon, count: mineralCount }]);
    }

    var maneuverSection = addSection("MANEUVERS", listTarget, "endStatsCompact");
    var dashIcon = cooldownIcons && cooldownIcons.dash ? cooldownIcons.dash.src : null;
    var abilityKey = "shockwave";
    var profile = getShipProfile(player.shipType);
    if(profile && profile.ability === "flares") abilityKey = "flares";
    else if(profile && profile.ability === "spin") abilityKey = "teleport";
    var abilityIcon = cooldownIcons && cooldownIcons[abilityKey] ? cooldownIcons[abilityKey].src : null;
    addIconStackRow(maneuverSection, "DASHES", dashIcon ? [{ src: dashIcon, count: state.dashes || 0 }] : []);
    addIconStackRow(maneuverSection, "SPECIAL", abilityIcon ? [{ src: abilityIcon, count: state.specialUses || 0 }] : []);

    if(!statsListSecondary){
      // fallback already populated above
    }
  }

  if(accBar){
    accBar.style.width = String(Math.round(acc*100)) + "%";
  }

  var correctCount = state.correct || 0;
  var wrongCount = state.wrong || 0;
  var missedCount = state.missed || 0;
  var totalHits = correctCount + wrongCount + missedCount;
  var grade = getLetterRank(acc);
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

  if(weakList){
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
  }

  renderHighScores(lifetime, modeInfo.key, modeInfo);
  endSequenceContext = {
    lifetime: lifetime,
    modeInfo: modeInfo
  };

  if(endScoresPanel){
    endScoresPanel.classList.add("endStatsHidden");
  }
  if(btnHighScoresToggle){
    btnHighScoresToggle.textContent = "CONTINUE";
    btnHighScoresToggle.onclick = function(){
      handleEndNameConfirm();
    };
  }

  if(btnEndNext){
    btnEndNext.style.display = campaignResult.hasNext ? "inline-flex" : "none";
  }
  if(btnEndSettings){
    btnEndSettings.style.display = "none";
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
    missionClearFx.sfxPlayed = false;
    missionClearFx.sfxClip = null;
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

function getClawTargetInRange(){
  if(!isStampedeMode()) return null;
  var a = getCorrectAsteroidInPlay();
  if(!a || a.ghost || a.noDamage || a.grabbedByClaw) return null;
  var dx = a.x - player.x;
  var dy = a.y - (player.y - 6);
  var dist = Math.hypot(dx, dy);
  if(dist > 180) return null;
  return { asteroid: a, dx: dx, dy: dy, dist: dist };
}

function getClawTargetById(){
  if(!player.clawTargetId) return null;
  for(var i=0; i<asteroids.length; i++){
    if(asteroids[i].id === player.clawTargetId){
      return asteroids[i];
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
  if(tutorialFreezeDimAlpha !== tutorialFreezeDimTarget){
    var fadeStep = Math.max(0.01, dtReal * 4.5);
    if(tutorialFreezeDimAlpha < tutorialFreezeDimTarget){
      tutorialFreezeDimAlpha = Math.min(tutorialFreezeDimTarget, tutorialFreezeDimAlpha + fadeStep);
    }else{
      tutorialFreezeDimAlpha = Math.max(tutorialFreezeDimTarget, tutorialFreezeDimAlpha - fadeStep);
    }
  }
  bg.dt = dt;
  if(state.lightningFlash > 0){
    state.lightningFlash = Math.max(0, state.lightningFlash - dtReal);
  }
  if(state.cameraFlash > 0){
    state.cameraFlash = Math.max(0, state.cameraFlash - dtReal);
  }
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
  if(tutorialActive && tutorialMineralsFreeze){
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
    if(tutorialAlienDelayRemaining > 0){
      tutorialAlienDelayRemaining = Math.max(0, tutorialAlienDelayRemaining - dtReal);
    }
    if(tutorialAlienDelayRemaining <= 0){
      tutorialAlienUnlocked = true;
      alienConfig.enabled = true;
      alienConfig.maxOnScreen = Math.max(alienConfig.maxOnScreen || 0, 1);
      spawnAlien("scout", "2 / 2", 1, view);
    }
  }
  if(sandboxMode && state.sandboxAlienWaveActive){
    state.sandboxAlienWaveRemaining = Math.max(0, state.sandboxAlienWaveRemaining - dtReal);
    if(state.sandboxAlienWaveRemaining <= 0){
      stopSandboxAlienWave();
    }
  }
  var alienEnabled = alienConfig.enabled;
  if(tutorialActive && (!tutorialAlienUnlocked || tutorialAlienDelayRemaining > 0)){
    alienConfig.enabled = false;
  }
  var alienReport = updateAliens(dtSlow, state, player, view, getAlienQuestion, asteroids);
  if(tutorialActive && (!tutorialAlienUnlocked || tutorialAlienDelayRemaining > 0)){
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
      if(!tutorialActive){
        state.timerMark15Clip = playSfx(state, "sec_15_mark");
      }
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
  if(touchControlsEnabled){
    if(!isTouchInputAllowed()){
      resetTouchInputState();
    }else if(touchMoveAxes.x || touchMoveAxes.y){
      inputX = clamp(inputX + touchMoveAxes.x, -1, 1);
      inputY = clamp(inputY + touchMoveAxes.y, -1, 1);
    }
    updateTouchButtonStates();
  }
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
  if(touchControlsEnabled && inputY < -0.2){
    advanceIntent = true;
  }
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
  if(isSandboxSplitMode() && isSandboxMultiplayer() && pilot2){
    clampPilotToLane(pilot2, 2);
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
  updateClaw(dtReal);
  if(mousepadMode === "hybrid" && mousepadActive && !spinActive && Math.abs(inputX) < 0.05){
    player.bankHold = clamp(player.vx / (player.speed || 1), -1, 1);
  }

  player.cooldown = Math.max(0, player.cooldown - dtReal);
  if(player.autoFireActive && player.autoFireAmmo > 0){
    var shootHeld = (!tutorialActive || !tutorialShootLocked) && (keys.has(keyBindings.shoot) || pointerDown || touchActionHeld.fire);
    if(shootHeld){
      if(!player.autoFireSpinning){
        player.autoFireSpinning = true;
        player.autoFireSpinTimer = 0.8;
        player.autoFireSpinSfxPlayed = true;
        var spinClip = playSfx(state, "machine_gun_load");
        if(spinClip){
          player.autoFireSpinClip = spinClip;
          var dur = spinClip.duration;
          if(isFinite(dur) && dur > 0){
            player.autoFireSpinTimer = dur;
          }else{
            spinClip.addEventListener("loadedmetadata", function(){
              if(isFinite(spinClip.duration) && spinClip.duration > 0 && player.autoFireSpinning){
                player.autoFireSpinTimer = spinClip.duration;
              }
            }, { once: true });
          }
          spinClip.addEventListener("ended", function(){
            if(player.autoFireSpinning){
              player.autoFireSpinTimer = 0;
            }
          }, { once: true });
        }
      }
      if(player.autoFireSpinTimer > 0){
        player.autoFireSpinTimer = Math.max(0, player.autoFireSpinTimer - dtReal);
      }else{
        var desiredMode = player.blasterMode || "single";
        if(desiredMode === "missile") desiredMode = "single";
        player.autoFireMode = desiredMode;
        var autoCooldown = getAutoFireCooldown(desiredMode);
        if(autoCooldown != null){
          var prevMode = player.blasterMode;
          if(desiredMode && desiredMode !== "missile"){
            player.blasterMode = desiredMode;
          }
          var didShoot = fire(autoCooldown);
          player.blasterMode = prevMode;
          if(didShoot){
            player.autoFireAmmo = Math.max(0, (player.autoFireAmmo || 0) - 1);
            if(player.autoFireAmmo === 0){
              player.autoFireActive = false;
              player.autoFireAmmoMax = 0;
              cleanupAutoFireSlots();
            }
          }
        }
      }
    }else{
      player.autoFireSpinning = false;
      player.autoFireSpinTimer = 0;
      player.autoFireSpinSfxPlayed = false;
    }
  }

  player.invuln = Math.max(0, player.invuln - dtReal);
  player.hitFlash = Math.max(0, player.hitFlash - dtReal*3.6);
  player.shipShake = Math.max(0, (player.shipShake || 0) - dtReal * 3.2);
  state.collisionSlow = Math.max(0, (state.collisionSlow || 0) - dtReal);
  if(player.overflightTimer > 0){
    player.overflightTimer = Math.max(0, player.overflightTimer - dtReal);
  }
  if(player.phaseTimer > 0){
    player.phaseTimer = Math.max(0, player.phaseTimer - dtReal);
  }
  if(player.compassTimer > 0){
    player.compassTimer = Math.max(0, player.compassTimer - dtReal);
  }
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
  applyEasyRegen(player, dtReal);
  if(player.magnetTimer > 0){
    player.magnetTimer = Math.max(0, player.magnetTimer - dtReal);
  }
  if(state.sandboxNoScore){
    state.score = 0;
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

  if(keys.has(keyBindings.secondary) && !isStampedeMode()) secondaryFire();
  if(keys.has(keyBindings.special)) shockwave();
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
  if(!state.alienSwarm && !missionBriefShowing && (!tutorialActive || tutorialSpawnUnlocked) && (!sandboxMode || (state.sandboxSpawnAsteroids && !state.sandboxAlienWaveActive))){
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
      if(b.kind === "electric"){
        if(!b.beamInit){
          b.beamInit = true;
          b.beamStartX = b.x;
          b.beamStartY = b.y;
        b.beamDirX = 0;
        b.beamDirY = -1;
        b.vx = 0;
        b.vy = 0;
        b.life = Math.max(b.life || 0, 0.06);
        var dirX = b.beamDirX;
        var dirY = b.beamDirY;
        var best = null;
        for(var aiBeam=0; aiBeam<asteroids.length; aiBeam++){
          var ab = asteroids[aiBeam];
          if(!ab || ab.ghost) continue;
          if(ab.y >= b.beamStartY) continue;
          var dxB = ab.x - b.beamStartX;
          var dyB = ab.y - b.beamStartY;
          var proj = dxB * dirX + dyB * dirY;
          if(proj <= 0) continue;
          var distLine = Math.abs(dxB * -dirY + dyB * dirX);
          if(distLine > ab.r + 10) continue;
          if(!best || proj < best.proj){
            best = { asteroid: ab, proj: proj };
          }
        }
        if(best && best.asteroid){
          b.beamTargetId = best.asteroid.id;
          b.beamEndX = best.asteroid.x;
          b.beamEndY = best.asteroid.y;
          b.x = best.asteroid.x;
          b.y = best.asteroid.y;
        }else{
          var bestAlien = null;
          for(var alIdx=0; alIdx<aliens.length; alIdx++){
            var al = aliens[alIdx];
            if(!al) continue;
            if(al.y >= b.beamStartY) continue;
            var dxA = al.x - b.beamStartX;
            var dyA = al.y - b.beamStartY;
            var projA = dxA * dirX + dyA * dirY;
            if(projA <= 0) continue;
            var distLineA = Math.abs(dxA * -dirY + dyA * dirX);
            if(distLineA > al.r + 10) continue;
            if(!bestAlien || projA < bestAlien.proj){
              bestAlien = { alien: al, proj: projA };
            }
          }
          if(bestAlien && bestAlien.alien){
            b.beamEndX = bestAlien.alien.x;
            b.beamEndY = bestAlien.alien.y;
            b.x = bestAlien.alien.x;
            b.y = bestAlien.alien.y;
          }else{
            b.beamEndX = b.beamStartX;
            b.beamEndY = 0;
          }
        }
        if(b.beamEndX != null && b.beamEndY != null){
          pushAsteroidsByBeam(b.beamStartX, b.beamStartY, b.beamEndX, b.beamEndY);
        }
      }
      if(b.life != null){
        b.life -= dtReal;
        if(b.life <= 0){
          bullets.splice(bi,1);
          continue;
        }
      }
    }else if(b.kind === "missile"){
      var target = null;
      if(b.targetId){
        if(b.targetType === "alien"){
          for(var mi=0; mi<aliens.length; mi++){
            if(aliens[mi].uid === b.targetId || aliens[mi].id === b.targetId){
              target = aliens[mi];
              break;
            }
          }
        }else{
          for(var mi=0; mi<asteroids.length; mi++){
            if(asteroids[mi].id === b.targetId){
              target = asteroids[mi];
              break;
            }
          }
        }
      }
      if(b.delay > 0){
        b.delay = Math.max(0, b.delay - dtReal);
        b.x = player.x;
        b.y = player.y - 18;
        b.vx = 0;
        b.vy = 0;
        b.rot = -Math.PI / 2;
      }else{
        if(b.age == null) b.age = 0;
        b.age += dtReal;
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
          var dirX = mdx / mdist;
          var dirY = mdy / mdist;
          var avoidX = 0;
          var avoidY = 0;
          var avoidRadius = b.avoidRadius || 190;
          var avoidStrength = b.avoidStrength || 520;
          for(var aiAvoid=0; aiAvoid<asteroids.length; aiAvoid++){
            var av = asteroids[aiAvoid];
            if(!av || av.id === b.targetId || av.ghost) continue;
            var dxA = av.x - b.x;
            var dyA = av.y - b.y;
            var distA = Math.hypot(dxA, dyA);
            if(distA > 0 && distA < avoidRadius){
              var forward = (dxA * dirX + dyA * dirY) / distA;
              if(forward > -0.3){
                var strength = (1 - distA / avoidRadius) * avoidStrength;
                avoidX -= (dxA / distA) * strength;
                avoidY -= (dyA / distA) * strength;
              }
            }
          }
          for(var aiAvoid2=0; aiAvoid2<aliens.length; aiAvoid2++){
            var av2 = aliens[aiAvoid2];
            if(!av2) continue;
            if(b.targetType === "alien" && (av2.uid === b.targetId || av2.id === b.targetId)) continue;
            var dxB = av2.x - b.x;
            var dyB = av2.y - b.y;
            var distB = Math.hypot(dxB, dyB);
            if(distB > 0 && distB < avoidRadius){
              var forwardB = (dxB * dirX + dyB * dirY) / distB;
              if(forwardB > -0.3){
                var strengthB = (1 - distB / avoidRadius) * (avoidStrength * 0.8);
                avoidX -= (dxB / distB) * strengthB;
                avoidY -= (dyB / distB) * strengthB;
              }
            }
          }
          var perpX = -dirY;
          var perpY = dirX;
          var weave = (b.weaveAmp || 0) * Math.sin((b.weavePhase || 0) + b.age * (b.weaveFreq || 2.2));
          var vxT = dirX * mspd + perpX * weave + avoidX;
          var vyT = dirY * mspd + perpY * weave + avoidY;
          b.vx = (b.vx || 0) * 0.5 + vxT * 0.5;
          b.vy = (b.vy || 0) * 0.5 + vyT * 0.5;
        }
        b.rot = Math.atan2(b.vy || -1, b.vx || 0) + Math.PI / 2;
      }
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
  updateMineralPopups(dtReal);
  updateMineralHudPulse(dtReal);
  updateRings(dtReal);

  emitDamageSmoke(dtReal);

  for(var pi=powerups.length-1; pi>=0; pi--){
    var p = powerups[pi];
    if(tutorialActive && tutorialMineralsFreeze){
      if(p && p.type === "mineral"){
        continue;
      }
    }
    if(p.popTimer != null && p.popTimer > 0){
      p.popTimer = Math.max(0, p.popTimer - dtReal);
    }
    p.y += p.vy * dtReal;
    if(p.vx != null){
      p.x += p.vx * dtReal;
      if(p.x < 26){
        p.x = 26;
        p.vx = Math.abs(p.vx);
      }else if(p.x > r.width - 26){
        p.x = r.width - 26;
        p.vx = -Math.abs(p.vx);
      }
    }
    if(p.rotSpeed != null){
      p.rot += p.rotSpeed * dtReal;
    }
    var collectedBy = 0;
    var dxp = p.x - player.x;
    var dyp = p.y - player.y;
    if(Math.hypot(dxp, dyp) < p.r + 18){
      collectedBy = 1;
    }else if(isSandboxMultiplayer()){
      var p2 = ensurePilot2();
      var dxp2 = p.x - p2.x;
      var dyp2 = p.y - p2.y;
      if(Math.hypot(dxp2, dyp2) < p.r + 18){
        collectedBy = 2;
      }
    }
    if(collectedBy){
      if(isSandboxSplitMode()){
        var lane = getLaneIdForX(p.x);
        if((collectedBy === 1 && lane !== 1) || (collectedBy === 2 && lane !== 2)){
          collectedBy = 0;
        }
      }
    }
  if(collectedBy){
      if(p.type === "mineral"){
        var mineralValue = p.value || 1;
        awardMinerals(mineralValue);
        playSfx(state, "mineral_collected");
        mineralHudPulse = 1;
        if(tutorialActive && tutorialMineralsTarget > 0){
          tutorialMineralsCollected += 1;
          if(tutorialMineralsRemaining > 0){
            tutorialMineralsRemaining -= 1;
          }
          if(tutorialMineralsCollected >= tutorialMineralsTarget){
            tutorialMineralsComplete = true;
            tutorialMineralsPending = true;
          }
        }
        spawnMineralPickupFx(p.x, p.y);
        powerups.splice(pi,1);
        continue;
      }
      if(tutorialActive && tutorialStepId === "powerup"){
        showToast("USE E TO TRIGGER THE POWERUP WHEN ASTEROIDS DROP");
        tutorialSpawnUnlocked = false;
        state.spawnTimer = Math.max(state.spawnTimer || 0, 1.4);
        tutorialShootLocked = true;
      }
      if(!isSandboxMultiplayer()){
        state.powerupsCollected += 1;
        if(!state.powerupsCollectedByType) state.powerupsCollectedByType = {};
        state.powerupsCollectedByType[p.type] = (state.powerupsCollectedByType[p.type] || 0) + 1;
      }else{
        var pStats = ensurePilotStats(collectedBy);
        pStats.powerupsCollected += 1;
        if(p.type){
          pStats.powerupsCollectedByType[p.type] = (pStats.powerupsCollectedByType[p.type] || 0) + 1;
        }
      }
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
      var targetPilot = collectedBy === 2 ? ensurePilot2() : player;
      spawnPickupFx(targetPilot.x, targetPilot.y - 6);
      if(isSandboxMultiplayer()){
        applyPowerupForPilot(targetPilot, collectedBy, p);
      }else{
        applyPowerup(p);
      }
      if(tourGuide) tourGuide.notify("powerup");
      powerups.splice(pi,1);
      continue;
    }
    if(p.y - p.r > r.height + 40){
      if(p.type === "mineral"){
        if(tutorialActive && tutorialMineralsTarget > 0 && tutorialMineralsRemaining > 0){
          tutorialMineralsRemaining -= 1;
          if(tutorialMineralsRemaining <= 0){
            tutorialMineralsComplete = true;
            tutorialMineralsPending = true;
          }
        }
        powerups.splice(pi,1);
        continue;
      }
      if(!isSandboxMultiplayer()){
        state.powerupsMissed += 1;
        if(!state.powerupsMissedByType) state.powerupsMissedByType = {};
        state.powerupsMissedByType[p.type] = (state.powerupsMissedByType[p.type] || 0) + 1;
      }else{
        var missPilot = isSandboxSplitMode() ? getLaneIdForX(p.x) : 1;
        var missStats = ensurePilotStats(missPilot);
        missStats.powerupsMissed += 1;
        if(p.type){
          if(!missStats.powerupsMissedByType) missStats.powerupsMissedByType = {};
          missStats.powerupsMissedByType[p.type] = (missStats.powerupsMissedByType[p.type] || 0) + 1;
        }
      }
      if(tutorialActive && tutorialStepId === "powerup"){
        spawnPowerup(p.type, p.group);
      }
      powerups.splice(pi,1);
    }
  }

  if(tutorialActive && tutorialStepId === "minerals" && tourGuide){
    if(tutorialMineralsPending && (tutorialMineralsComplete || tutorialMineralsRemaining <= 0)){
      if(tourGuide.notify("minerals")){
        tutorialMineralsPending = false;
      }
    }
  }
  if(tutorialActive && tutorialStepId === "secondary_slots" && tourGuide){
    if(countActiveSecondarySlots(player) >= 3){
      tourGuide.notify("secondary_slot");
    }
  }

  var tNow = performance.now() * 0.001;
  for(var ai=asteroids.length-1; ai>=0; ai--){
    var a = asteroids[ai];
    if(a.spawnFade != null && a.spawnFade < 1){
      var fadeDur = a.spawnFadeDur || 0.35;
      a.spawnFade = Math.min(1, a.spawnFade + (dtReal / Math.max(0.12, fadeDur)));
    }
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
    var minBound = bound;
    var maxBound = r.width - bound;
    if(isSandboxSplitMode() && a.laneId){
      var laneBounds = getLaneBounds(a.laneId);
      minBound = laneBounds.minX + a.r;
      maxBound = laneBounds.maxX - a.r;
    }
    if(a.x < minBound){
      a.x = minBound;
      a.vx = Math.abs(a.vx) * 0.6;
    }else if(a.x > maxBound){
      a.x = maxBound;
      a.vx = -Math.abs(a.vx) * 0.6;
    }
    a.rot = (a.rot || 0) + (a.spin || 0) * dtAst;
    if(a.isCorrect && a.waveId === state.waveId && !a.warned && a.y > r.height * 0.75){
      a.warned = true;
      if(!tutorialActive) warningClip = playSfx(state, "warning");
    }

    if(!(isSandboxSplitMode() && (a.laneId || getLaneIdForX(a.x)) !== 1)){
      if(handleShipAsteroidCollision(a, player.x, player.y, false)){
        asteroids.splice(ai,1);
        if(state.over) return;
        continue;
      }
    }
    if(isSandboxMultiplayer()){
      var p2 = ensurePilot2();
      if(!(isSandboxSplitMode() && (a.laneId || getLaneIdForX(a.x)) !== 2)){
        if(handlePilotAsteroidCollision(a, p2, 2, p2.x, p2.y, false, false)){
          asteroids.splice(ai,1);
          if(state.over) return;
          continue;
        }
      }
    }

    if(a.y - a.r > r.height + 40){
      if(a.isCorrect && a.waveId === state.waveId){
        if(isTutorialCorrectShotStep()){
          if(a.hiddenPowerup){
            hiddenPowerupActive = false;
            answerHitsSincePowerup = 0;
          }
          if(state.correctAsteroidId === a.id){
            state.correctAsteroidId = 0;
            state.correctInPlay = false;
          }
          playSfx(state, "missed_answer");
          asteroids.splice(ai,1);
          queueTutorialSecondChance();
          continue;
        }
        if(isDivisorsMode()){
          if(isSandboxSplitMode()){
            var missPilotDiv = a.laneId || getLaneIdForX(a.x);
            recordPilotMissed(missPilotDiv);
          }else if(isSandboxMultiplayer()){
            recordPilotMissed(1);
            recordPilotMissed(2);
          }
          state.missed++;
          state.streak = 0;
          if(a.hiddenPowerup){
            hiddenPowerupActive = false;
            answerHitsSincePowerup = 0;
          }
          recordFactMiss(state.a, state.b);
          syncHud();
          playSfx(state, "missed_answer");
          loseLife("CORRECT ANSWER ESCAPED");
          asteroids.splice(ai,1);
          continue;
        }
        if(isSandboxSplitMode()){
          var missPilot = a.laneId || getLaneIdForX(a.x);
          recordPilotMissed(missPilot);
          if(a.hiddenPowerup){
            hiddenPowerupActive = false;
            answerHitsSincePowerup = 0;
          }
          a.isCorrect = false;
          a.waveId = -1;
          if(state.correctAsteroidId === a.id){
            state.correctAsteroidId = 0;
            state.correctInPlay = false;
          }
          asteroids.splice(ai,1);
          continue;
        }else if(isSandboxMultiplayer()){
          recordPilotMissed(1);
          recordPilotMissed(2);
        }
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
        if(isStampedeMode()){
          state.score = Math.max(0, state.score - 120);
          kickShake(24, 0.18);
          triggerCameraFlash(0.2);
        }
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
    }else if(reason === "stampede_wrong"){
      impactDebris(ast.x, ast.y);
      spawnParticles(ast.x, ast.y, "smoke");
      spawnParticles(ast.x, ast.y, "spark_white");
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
    if(a2.hit || a2.grabbedByClaw) continue;

    for(var bj=bullets.length-1; bj>=0; bj--){
      var bb = bullets[bj];
      if(bb.noHit) continue;
      var pilotId = bb.pilotId || 1;
      if(isSandboxSplitMode()){
        var laneId = a2.laneId || getLaneIdForX(a2.x);
        if(pilotId !== laneId){
          continue;
        }
      }
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
            if(kind === "electric"){
              bb.noHit = true;
              bb.noHitTimer = 0.08;
              bb.life = Math.max(bb.life || 0, 0.06);
              bb.beamEndX = a2.x;
              bb.beamEndY = a2.y;
            }else{
              bullets.splice(bj,1);
            }
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
              if(isSandboxSplitMode() && correctAst.laneId && correctAst.laneId !== pilotId){
                correctAst = null;
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

        var stampedeActive = isStampedeMode();
        if(hitAst.isCorrect && hitAst.hitsRemaining && hitAst.hitsRemaining > 1 && !(stampedeActive && hitAst.waveId === state.waveId)){
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
        if(isPartialSumsMode()){
          var expectedValue = Number(getCurrentCorrectTargetValue());
          var hitValue = Number(hitAst.label);
          wasCorrect = Number.isFinite(expectedValue) && Number.isFinite(hitValue) && hitValue === expectedValue;
        }
        var impactReason = "wrong";
        if(isDivisorsMode()){
          var divisorCorrect = isDivisorLabel(hitAst.label);
          var divisorNew = divisorCorrect && markDivisorHit(hitAst.label);
          if(isSandboxMultiplayer()){
            if(divisorCorrect && divisorNew){
              recordPilotCorrect(pilotId);
            }else if(!divisorCorrect && !stampedeActive){
              recordPilotWrong(pilotId);
            }
          }
          if(divisorCorrect){
            if(divisorNew){
              bestStreak = Math.max(bestStreak, state.streak + 1);
              handleDivisorCorrectHit(hitAst);
              stopHits = true;
            }else{
              playSfx(state, "impact_thud", 0.35);
            }
          }else if(!stampedeActive){
            recordFactMiss(state.a, state.b);
            onWrongHit();
          }else{
            state.score += 6;
            playSfx(state, "impact_thud", 0.4);
          }
          impactReason = divisorCorrect ? "correct" : (stampedeActive ? "stampede_wrong" : "wrong");
        }else{
          var stampedeRedemption = false;
          if(stampedeActive && wasCorrect){
            stampedeRedemption = true;
            state.correctInPlay = false;
            state.correctAsteroidId = 0;
            state.correctDelayRemaining = 0;
            wasCorrect = false;
            state.score = Math.max(0, state.score - 90);
            state.streak = 0;
            waveHadWrongHit = true;
            kickShake(22, 0.16);
            triggerCameraFlash(0.18);
            showToast("REDEMPTION");
          }
          if(isSandboxMultiplayer()){
            if(wasCorrect){
              recordPilotCorrect(pilotId);
            }else if(!stampedeActive){
              recordPilotWrong(pilotId);
            }
          }
          if(wasCorrect){
            var wid = state.waveId;
            state.correctInPlay = false;
            state.correctAsteroidId = 0;
            retireWave(wid);
            bestStreak = Math.max(bestStreak, state.streak + 1);
            onCorrectHit(hitAst);
            stopHits = true;
            clearedWaveId = wid;
          }else if(!stampedeActive){
            recordFactMiss(state.a, state.b);
            onWrongHit();
          }else{
            state.score += 6;
            playSfx(state, "impact_thud", 0.4);
          }
          impactReason = wasCorrect ? "correct" : (stampedeActive ? "stampede_wrong" : "wrong");
        }

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
        if(bb2.kind === "electric"){
          bb2.noHit = true;
          bb2.noHitTimer = 0.08;
          bb2.life = Math.max(bb2.life || 0, 0.06);
          bb2.beamEndX = al.x;
          bb2.beamEndY = al.y;
        }else{
          bullets.splice(bj2,1);
        }
      }
      if(state.alienSwarm){
        al.showDigitTimer = 0.55;
        al.hitFlashTimer = 0.3;
        al.hitFlashDur = 0.3;
      }
      al.hitShake = 0.75;
      al.stunTimer = Math.max(al.stunTimer || 0, 0.4);
      al.hitsTaken += 1;
        if(al.hitsTaken >= al.answer){
          if(state.alienSwarm && al.swarmDigit != null && al.swarmCorrectDigit != null && al.swarmDigit === al.swarmCorrectDigit){
            var poolId = al.poolId;
            var removed = 0;
            for(var sw=aliens.length-1; sw>=0; sw--){
              var swAlien = aliens[sw];
              if(swAlien.poolId === poolId){
                removed += 1;
                state.score += swAlien.score || al.score;
                impactDebris(swAlien.x, swAlien.y);
                if(!state.aliensShotByType) state.aliensShotByType = {};
                var swSrc = getAlienSpriteSrcFor(swAlien);
                if(swSrc){
                  state.aliensShotByType[swSrc] = (state.aliensShotByType[swSrc] || 0) + 1;
                }
                aliens.splice(sw, 1);
              }
            }
            state.aliensShot += removed;
            playSfx(state, "alien_kill", 0.65);
            if(tourGuide) tourGuide.notify("alien");
            showToast("ALIEN POOL CLEARED");
            maybeSpawnEventPowerup(0.40, al.x, al.y);
            resetAlienSwarmPool();
            break;
          }else{
            state.aliensShot += 1;
            if(!state.aliensShotByType) state.aliensShotByType = {};
            var alienSrc = getAlienSpriteSrcFor(al);
            if(alienSrc){
              state.aliensShotByType[alienSrc] = (state.aliensShotByType[alienSrc] || 0) + 1;
            }
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
  }

  for(var ac=aliens.length-1; ac>=0; ac--){
    var al2 = aliens[ac];
    var dxC = al2.x - player.x;
    var dyC = al2.y - (player.y - 4);
    if(dxC*dxC + dyC*dyC < (al2.r + 18) * (al2.r + 18)){
      if(player.phaseTimer > 0){
        alienBullets.splice(ab, 1);
        continue;
      }
      if(player.phaseTimer > 0){
        continue;
      }
      if(player.invuln <= 0){
        clearScopeOnHit();
        registerShotTypeHit(2, true);
        resetSurvivorTimer();
        state.alienCollisions += 1;
        kickShake(22, 0.18);
        triggerCameraFlash(0.18);
        state.collisionSlow = Math.max(state.collisionSlow || 0, 1.0);
        player.shipShake = Math.max(player.shipShake || 0, 1.0);
        var distC = Math.max(1, Math.hypot(dxC, dyC));
        var knockBackAlien = 0.75;
        player.vx = (-dxC / distC) * player.speed * knockBackAlien;
        player.vy = (-dyC / distC) * player.speed * knockBackAlien;
        var dmgHit = 0.45;
        if(player.defenseMode === "armor") dmgHit = dmgHit * 0.4;
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
          markDamage(player);
          state.streak = 0;
          if(player.hull <= 0 && tutorialActive){
            player.hull = Math.max(player.hull, 0.12);
            syncHud();
            if(!tutorialHullRecoveryShown){
              triggerTutorialRecovery("HULL CRITICAL");
            }else{
              player.invuln = Math.max(player.invuln, 1.2);
              showToast("HULL CRITICAL");
            }
            updateLowHullAlarm(player, dmgHit);
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
            updateLowHullAlarm(player, dmgHit);
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

  if(isSandboxMultiplayer()){
    var p2 = ensurePilot2();
    if(!p2.dead){
      for(var i2=0; i2<aliens.length; i2++){
        var alP2 = aliens[i2];
        if(!alP2 || alP2.dead || alP2.fadeOut) continue;
        if(isSandboxSplitMode()){
          var laneP2 = getLaneIdForX(alP2.x);
          if(laneP2 !== 2) continue;
        }
        var dxC2 = alP2.x - p2.x;
        var dyC2 = alP2.y - (p2.y - 8);
        if(dxC2*dxC2 + dyC2*dyC2 <= Math.pow(alP2.r + 18, 2)){
          if(p2.invuln <= 0){
            clearScopeOnHitForPilot(p2);
            registerShotTypeHitForPilot(p2, 1, false);
            resetSurvivorTimer();
            kickShake(18, 0.16);
            triggerCameraFlash(0.16);
            p2.shipShake = Math.max(p2.shipShake || 0, 0.34);
            var distC2 = Math.max(1, Math.hypot(dxC2, dyC2));
            var knockBackAlien2 = 0.75;
            p2.vx = (-dxC2 / distC2) * p2.speed * knockBackAlien2;
            p2.vy = (-dyC2 / distC2) * p2.speed * knockBackAlien2;
            var dmgHit2 = 0.45;
            if(p2.defenseMode === "armor") dmgHit2 = dmgHit2 * 0.4;
            if(p2.defenseMode === "shield"){
              impactDebris(p2.x, p2.y - 8);
              playSfx(state, "impact", 0.4);
              p2.hitFlash = 1;
              p2.invuln = 0.45;
              showToast("SHIELD BLOCK");
            }else if(p2.defenseMode === "armor"){
              impactShipHit(p2.x, p2.y - 10);
              playSfx(state, "impact_thud", 0.45);
              p2.hitFlash = 1;
              p2.invuln = 0.45;
              showToast("ARMOR ABSORB");
              consumeArmorBlockForPilot(p2);
            }else{
              impactShipHit(p2.x, p2.y - 10);
              playSfx(state, "crash", 0.6);
              p2.hitFlash = 1;
            p2.invuln = 0.55;
            p2.hull = clamp(p2.hull - dmgHit2, 0, 1);
            markDamage(p2);
            if(p2.hull <= 0){
              p2.hull = 0;
              p2.lives = Math.max(0, (p2.lives || 0) - 1);
              if(p2.lives <= 0){
                p2.dead = true;
                  p2.hidden = true;
                  showToast("PILOT DOWN");
                }else{
                  p2.hull = 1;
                  p2.lowHullAlarmed = false;
                  p2.invuln = Math.max(p2.invuln || 0, 0.6);
                  showToast("HULL CRITICAL");
                }
              }else{
                updateLowHullAlarm(p2, dmgHit2);
                playSfx(state, "ship_damaged");
                showToast("ALIEN COLLISION");
              }
            }
          }
          var distC2b = Math.max(1, Math.hypot(dxC2, dyC2));
          alP2.x += (dxC2 / distC2b) * 24;
          alP2.y += (dyC2 / distC2b) * 24;
          alP2.hitShake = Math.max(alP2.hitShake || 0, 0.75);
        }
      }
    }
  }

  for(var ab=alienBullets.length-1; ab>=0; ab--){
    var abul = alienBullets[ab];
    var dxp = abul.x - player.x;
    var dyp = abul.y - (player.y - 4);
    if(dxp*dxp + dyp*dyp < (abul.r + 16) * (abul.r + 16)){
      alienBullets.splice(ab, 1);
      if(player.invuln <= 0){
        clearScopeOnHit();
        registerShotTypeHit(1, false);
        resetSurvivorTimer();
        state.alienShotsHit += 1;
        kickShake(18, 0.16);
        triggerCameraFlash(0.16);
        state.collisionSlow = Math.max(state.collisionSlow || 0, 1.0);
        player.shipShake = Math.max(player.shipShake || 0, 1.0);
        var distP = Math.max(1, Math.hypot(dxp, dyp));
        var knockBackBullet = 0.5;
        player.vx = (-dxp / distP) * player.speed * knockBackBullet;
        player.vy = (-dyp / distP) * player.speed * knockBackBullet;
        var dmgHit = 0.35;
        if(player.defenseMode === "armor") dmgHit = dmgHit * 0.4;
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
          markDamage(player);
          state.streak = 0;
          if(player.hull <= 0 && tutorialActive){
            player.hull = Math.max(player.hull, 0.12);
            syncHud();
            if(!tutorialHullRecoveryShown){
              triggerTutorialRecovery("HULL CRITICAL");
            }else{
              player.invuln = Math.max(player.invuln, 1.2);
              showToast("HULL CRITICAL");
            }
            updateLowHullAlarm(player, dmgHit);
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
            updateLowHullAlarm(player, dmgHit);
            playSfx(state, "ship_damaged");
            showToast("HULL DAMAGED");
          }
        }
      }
    }

    if(isSandboxMultiplayer()){
      var p2b = ensurePilot2();
      if(p2b.dead) continue;
      if(isSandboxSplitMode()){
        var laneAb = getLaneIdForX(abul.x);
        if(laneAb !== 2) continue;
      }
      var dxp2 = abul.x - p2b.x;
      var dyp2 = abul.y - (p2b.y - 4);
      if(dxp2*dxp2 + dyp2*dyp2 < (abul.r + 16) * (abul.r + 16)){
        alienBullets.splice(ab, 1);
        if(p2b.invuln <= 0){
          clearScopeOnHitForPilot(p2b);
          registerShotTypeHitForPilot(p2b, 1, false);
          resetSurvivorTimer();
          kickShake(16, 0.14);
          triggerCameraFlash(0.14);
          p2b.shipShake = Math.max(p2b.shipShake || 0, 1.0);
          var distP2 = Math.max(1, Math.hypot(dxp2, dyp2));
          var knockBackBullet2 = 0.5;
          p2b.vx = (-dxp2 / distP2) * p2b.speed * knockBackBullet2;
          p2b.vy = (-dyp2 / distP2) * p2b.speed * knockBackBullet2;
          var dmgHit2 = 0.35;
          if(p2b.defenseMode === "armor") dmgHit2 = dmgHit2 * 0.4;
          if(p2b.defenseMode === "shield"){
            impactDebris(p2b.x, p2b.y - 8);
            playSfx(state, "impact", 0.35);
            p2b.hitFlash = 1;
            p2b.invuln = 0.35;
            showToast("SHIELD BLOCK");
          }else if(p2b.defenseMode === "armor"){
            impactShipHit(p2b.x, p2b.y - 10);
            playSfx(state, "impact_thud", 0.45);
            p2b.hitFlash = 1;
            p2b.invuln = 0.35;
            showToast("ARMOR ABSORB");
            consumeArmorBlockForPilot(p2b);
          }else{
            impactShipHit(p2b.x, p2b.y - 10);
            playSfx(state, "crash", 0.45);
            p2b.hitFlash = 1;
            p2b.invuln = 0.45;
            p2b.hull = clamp(p2b.hull - dmgHit2, 0, 1);
            markDamage(p2b);
            if(p2b.hull <= 0){
              p2b.hull = 0;
              p2b.lives = Math.max(0, (p2b.lives || 0) - 1);
              if(p2b.lives <= 0){
                p2b.dead = true;
                p2b.hidden = true;
                showToast("PILOT DOWN");
              }else{
                p2b.hull = 1;
                p2b.lowHullAlarmed = false;
                p2b.invuln = Math.max(p2b.invuln || 0, 0.6);
                showToast("HULL CRITICAL");
              }
            }else{
              updateLowHullAlarm(p2b, dmgHit2);
              playSfx(state, "ship_damaged");
              showToast("ALIEN HIT");
            }
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
    if(a.ghost || a.grabbedByClaw) continue;
    for(var j=i+1; j<asteroids.length; j++){
      var b = asteroids[j];
      if(b.ghost || b.grabbedByClaw) continue;
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
        missionClearFx.phase = "explode";
        missionClearFx.explodeTimer = 0.05;
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

  var revealAt = gameOverFx.reason === "time" ? 3.5 : 2.6;
  if(!gameOverFx.shown && gameOverFx.t > revealAt){
    showEndOverlay();
    gameOverFx.shown = true;
  }

  var endAt = gameOverFx.reason === "time" ? 6.2 : 5.0;
  if(gameOverFx.t > endAt){
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
  if(!phaserActive && !tutorialActive){
    var splitBg = isSandboxSplitMode();
    if(splitBg){
      var lane1 = getLaneBounds(1);
      var lane2 = getLaneBounds(2);
      var bgIdx1 = backgroundIndex;
      var bgIdx2 = backgroundIndex;
      var bgReady1 = backgroundSprites[bgIdx1] && backgroundReady[bgIdx1];
      var bgReady2 = backgroundSprites[bgIdx2] && backgroundReady[bgIdx2];
      var maxScroll1 = 0;
      var maxScroll2 = 0;
      if(!state.paused && !screenshotMode){
        if(bgReady1){
          var bgImg1 = backgroundSprites[bgIdx1];
          var baseScale1 = Math.max((lane1.maxX - lane1.minX) / bgImg1.width, h / bgImg1.height);
          var drawH1 = Math.ceil(bgImg1.height * (baseScale1 * backgroundScale)) + 4;
          maxScroll1 = Math.max(1, drawH1 - h);
        }
        if(bgReady2){
          var bgImg2 = backgroundSprites[bgIdx2];
          var baseScale2 = Math.max((lane2.maxX - lane2.minX) / bgImg2.width, h / bgImg2.height);
          var drawH2 = Math.ceil(bgImg2.height * (baseScale2 * backgroundScale)) + 4;
          maxScroll2 = Math.max(1, drawH2 - h);
        }
        var maxScroll = Math.max(maxScroll1, maxScroll2, 1);
        backgroundScroll = (backgroundScroll + 4.8 * (bg.dt || (1/60))) % maxScroll;
        backgroundScrollSplit = backgroundScroll;
      }
      function drawLaneBackground(lane, bgIdx, scrollOffset){
        if(backgroundSprites[bgIdx] && backgroundReady[bgIdx]){
          var bgImg = backgroundSprites[bgIdx];
          var laneW = lane.maxX - lane.minX;
          var baseScale = Math.max(laneW / bgImg.width, h / bgImg.height);
          var scale = baseScale * backgroundScale;
          var drawW = Math.ceil(bgImg.width * scale) + 4;
          var drawH = Math.ceil(bgImg.height * scale) + 4;
          var offX = Math.floor((lane.minX + lane.maxX - drawW) / 2);
          var offY = Math.floor((h - drawH) + scrollOffset + 160);
          ctx.save();
          ctx.beginPath();
          ctx.rect(lane.minX, 0, laneW, h);
          ctx.clip();
          ctx.globalAlpha = 0.55;
          ctx.drawImage(bgImg, offX, offY, drawW, drawH);
          ctx.restore();
        }else if(SHOW_STARS){
          ctx.save();
          ctx.beginPath();
          ctx.rect(lane.minX, 0, lane.maxX - lane.minX, h);
          ctx.clip();
          drawStars(w,h,true);
          ctx.restore();
        }
      }
      drawLaneBackground(lane1, bgIdx1, backgroundScroll);
      drawLaneBackground(lane2, bgIdx2, backgroundScrollSplit);
    }else if(backgroundSprites[backgroundIndex] && backgroundReady[backgroundIndex]){
      var bgImg = backgroundSprites[backgroundIndex];
      var baseScale = Math.max(w / bgImg.width, h / bgImg.height);
      var scale = baseScale * backgroundScale;
      var drawW = Math.ceil(bgImg.width * scale) + 4;
      var drawH = Math.ceil(bgImg.height * scale) + 4;
      var maxScroll = Math.max(1, drawH - h);
      if(!state.paused && !screenshotMode){
        backgroundScroll = (backgroundScroll + 4.8 * (bg.dt || (1/60))) % maxScroll;
      }
      var offX = Math.floor((w - drawW) / 2);
      var offY = Math.floor((h - drawH) + backgroundScroll + 160);
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bgImg, offX, offY, drawW, drawH);
      ctx.restore();
    }
  }else if(!phaserActive && tutorialActive && SHOW_STARS){
    drawStars(w,h,true, true);
  }

  if(state.paused && state.running){
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(0,0,w,h);
  }
  updateTimerHud();

  drawEmpWave();
  drawSlowMoWave();
  drawLightningFlash();
  drawCameraFlash();

  if(introActive && !state.over){
    return;
  }

  ctx.save();
  ctx.translate(cam.x || 0, cam.y || 0);

  drawTutorialPortal();
  if(!phaserActive){
    if(!state.hideAsteroids && !(sandboxMode && state.sandboxAlienWaveActive)){
      for(var i=0;i<asteroids.length;i++) drawAsteroid(asteroids[i]);
    }
    if(!state.hideAsteroids || (sandboxMode && state.sandboxAlienWaveActive)){
      drawAliens(ctx);
      drawAlienBullets(ctx);
    }
    if(!state.hideAsteroids){
      drawPowerups();
      drawBullets();
      drawScopeLaser();
      drawClaw();
    }
  }
  drawRings();
  drawParticles();
  drawMineralPopups();
  drawDashGhosts();
  drawTutorialDots();

  drawShip();
  if(isSandboxMultiplayer()){
    drawPilotShip(ensurePilot2());
  }
  drawClawPrompt();

  ctx.restore();

  if(tutorialActive && (tutorialMineralsFreeze || tutorialFreezeDimAlpha > 0.01)){
    ctx.save();
    var dimAlpha = 0.62 * clamp(tutorialFreezeDimAlpha, 0, 1);
    ctx.fillStyle = "rgba(0,0,0," + dimAlpha.toFixed(3) + ")";
    ctx.fillRect(0,0,w,h);
    ctx.translate(cam.x || 0, cam.y || 0);
    for(var pmi=0; pmi<powerups.length; pmi++){
      var pm = powerups[pmi];
      if(!pm || pm.type !== "mineral") continue;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = "rgba(110,220,255,.26)";
      ctx.beginPath();
      ctx.arc(pm.x, pm.y, pm.r * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(pm.x, pm.y);
      ctx.rotate(pm.rot || 0);
      drawPowerupIcon(pm, getPowerupColor(pm));
      ctx.restore();
    }
    ctx.restore();
  }

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
    var alphaIn3 = clamp((t3 - 0.25) / 0.55, 0, 1);
    var alphaOut3 = clamp(1 - (t3 - 2.35) / 0.9, 0, 1);
    var alpha3 = Math.min(alphaIn3, alphaOut3);
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
    var splitHud = isSandboxSplitMode();
    var lane1 = splitHud ? getLaneBounds(1) : null;
    var lane2 = splitHud ? getLaneBounds(2) : null;
    function drawQuestionAt(cx){
      ctx.fillText(qDisplay, cx, questionTop);
      if(qParsed.repeatStart >= 0 && qParsed.repeatLen > 0){
        var qWidth = ctx.measureText(qDisplay).width;
        var qLeft = cx - qWidth / 2;
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
        var qStart = cx - qW / 2;
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
    if(!(tutorialActive && tutorialHideQuestion) && !(sandboxMode && state.sandboxAlienWaveActive) && !missionBriefShowing){
      if(splitHud){
        var cx1 = (lane1.minX + lane1.maxX) / 2;
        var cx2 = (lane2.minX + lane2.maxX) / 2;
        drawQuestionAt(cx1);
        drawQuestionAt(cx2);
      }else{
        drawQuestionAt(w/2);
      }
    }
    ctx.restore();

    var barH = 10;
    var barGap = 8;
    var barY = view.hudH + 10;
    var strikeLimit = (typeof state.strikeLimit === "number") ? state.strikeLimit : null;
    if(strikeLimit === null || Number.isNaN(strikeLimit)){
      var diff = String(state.difficulty || "normal").toLowerCase();
      strikeLimit = diff === "easy" ? 25 : diff === "normal" ? 20 : diff === "hard" ? 15 : 10;
    }
    function drawHudBarsForPilot(barX, barW, hullRatio, livesLeft, livesStart, wrongCount, hpPulse){
      var hudBars = [];
      hudBars.push({
        label: "HP",
        ratio: clamp(hullRatio, 0, 1),
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
          if(b.label === "HP" && hpPulse > 0){
            var hpPulseWave = (Math.sin(performance.now() * 0.03) + 1) * 0.5;
            ctx.globalAlpha = 0.75 + 0.25 * hpPulseWave;
            ctx.shadowColor = "rgba(255,80,80,.75)";
            ctx.shadowBlur = 10 + 8 * hpPulseWave;
          }
          ctx.beginPath();
          ctx.roundRect(barX, bY, barW * b.ratio, barH, 8);
          ctx.fill();
          if(b.label === "HP" && hpPulse > 0){
            ctx.globalAlpha = 1;
          }
          ctx.shadowBlur = 0;
          ctx.fillStyle = labelColor;
          ctx.font = labelStyle;
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(b.label, barX - 8, bY + barH / 2);
          ctx.restore();
        }
      }

      var maxLives = Math.max(0, livesStart || 0);
      var strikeLabelY = null;
      if(maxLives > 0){
        var livesGap = 4;
        var lifeH = 6;
        var availableW = barW - livesGap * (maxLives - 1);
        var lifeW = Math.max(6, Math.floor(availableW / maxLives));
        if(lifeW > 18) lifeW = 18;
        var totalW = lifeW * maxLives + livesGap * (maxLives - 1);
        if(totalW > barW){
          lifeW = Math.max(5, Math.floor((barW - livesGap * (maxLives - 1)) / maxLives));
        }
        var lifeY = barY + hudBars.length * (barH + barGap) + 6;
        ctx.save();
        ctx.fillStyle = labelColor;
        ctx.font = labelStyle;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText("LIVES", barX - 8, lifeY + lifeH / 2);
        for(var li=0; li<maxLives; li++){
          var lx = barX + li * (lifeW + livesGap);
          var isActive = li < livesLeft;
          ctx.fillStyle = isActive ? "rgba(255,80,80,.9)" : "rgba(255,80,80,.2)";
          ctx.fillRect(lx, lifeY, lifeW, lifeH);
          ctx.strokeStyle = "rgba(255,120,120,.5)";
          ctx.lineWidth = 1;
          ctx.strokeRect(lx, lifeY, lifeW, lifeH);
        }
        ctx.restore();
        strikeLabelY = lifeY + lifeH + 10;
      }

      if(strikeLimit > 0){
        var strikesUsed = Math.max(0, Math.min(wrongCount || 0, strikeLimit));
        var strikesLeft = Math.max(0, strikeLimit - strikesUsed);
        var strikeGap = 4;
        var strikeH = 6;
        var strikeAvailW = barW - strikeGap * (strikeLimit - 1);
        var strikeW = Math.max(6, Math.floor(strikeAvailW / strikeLimit));
        if(strikeW > 18) strikeW = 18;
        var strikeTotalW = strikeW * strikeLimit + strikeGap * (strikeLimit - 1);
        if(strikeTotalW > barW){
          strikeW = Math.max(5, Math.floor((barW - strikeGap * (strikeLimit - 1)) / strikeLimit));
        }
        var strikeY = (strikeLabelY != null) ? strikeLabelY : (barY + hudBars.length * (barH + barGap) + 6);
        ctx.save();
        ctx.fillStyle = labelColor;
        ctx.font = labelStyle;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText("STRIKES", barX - 8, strikeY + strikeH / 2);
        for(var si=0; si<strikeLimit; si++){
          var sx = barX + si * (strikeW + strikeGap);
          var strikeActive = si < strikesLeft;
          ctx.fillStyle = strikeActive ? "rgba(255,210,90,.95)" : "rgba(255,210,90,.2)";
          ctx.fillRect(sx, strikeY, strikeW, strikeH);
          ctx.strokeStyle = "rgba(255,220,120,.55)";
          ctx.lineWidth = 1;
          ctx.strokeRect(sx, strikeY, strikeW, strikeH);
        }
        ctx.restore();
      }
    }
    if(splitHud){
      var laneW1 = lane1.maxX - lane1.minX;
      var laneW2 = lane2.maxX - lane2.minX;
      var barW1 = Math.min(240, laneW1 * 0.55);
      var barW2 = Math.min(240, laneW2 * 0.55);
      var barX1 = lane1.minX + 76;
      var barX2 = lane2.minX + 76;
      var p1Stats = ensurePilotStats(1);
      var p2Stats = ensurePilotStats(2);
      var p2Hud = ensurePilot2();
      drawHudBarsForPilot(barX1, barW1, player.hull, state.lives || 0, state.livesStart || 0, p1Stats.wrong || 0, player.lowHullPulse || 0);
      drawHudBarsForPilot(barX2, barW2, p2Hud.hull, p2Hud.lives || 0, p2Hud.livesStart || 0, p2Stats.wrong || 0, p2Hud.lowHullPulse || 0);
      var gapStart = lane1.maxX;
      var gapEnd = lane2.minX;
      if(gapEnd > gapStart){
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,.55)";
        ctx.fillRect(gapStart, view.hudH + 6, gapEnd - gapStart, h - view.hudH - 16);
        ctx.strokeStyle = "rgba(255,255,255,.12)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gapStart, view.hudH + 6);
        ctx.lineTo(gapStart, h - 10);
        ctx.moveTo(gapEnd, view.hudH + 6);
        ctx.lineTo(gapEnd, h - 10);
        ctx.stroke();
        ctx.restore();
      }
    }else{
      var barX = 96;
      var barW = Math.min(260, w * 0.35);
      drawHudBarsForPilot(barX, barW, player.hull, state.lives || 0, state.livesStart || 0, state.wrong || 0, player.lowHullPulse || 0);
    }

    var profile = getShipProfile(player.shipType);
    var dashLeft = Math.max(0, player.dashCooldown || 0);
    var shockLeft = Math.max(0, player.shockwaveCooldown || 0);
    var dashMax = profile.dashCooldown || 1.3;
    var shockMax = profile.shockwaveCooldown || 3.5;
    var dashFrac = clamp(1 - (dashLeft / dashMax), 0, 1);
    var shockFrac = clamp(1 - (shockLeft / shockMax), 0, 1);
    var radius = 30;
    var gap = 40;
    var rightMargin = 30;
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
    var mineralCount = state.mineralsEarned || 0;
    if(mineralIconImg.ready && (isStampedeMode() || mineralCount > 0)){
      var mSize = 62;
      var mX = leftX - radius * 2 - 120;
      var mY = cy - mSize / 2;
      var pulse = 1 + mineralHudPulse * 0.18;
      var centerX = mX + mSize / 2;
      var centerY = mY + mSize / 2;
      ctx.save();
      ctx.globalAlpha = (0.95 + mineralHudPulse * 0.2) * hudFade;
      ctx.translate(centerX, centerY);
      ctx.scale(pulse, pulse);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(mineralIconImg.img, mX, mY, mSize, mSize);
      ctx.fillStyle = "rgba(232,236,255,.95)";
      ctx.font = "700 18px Oxanium, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(String(mineralCount), mX + mSize + 8, mY + mSize / 2);
      ctx.restore();
    }

    if(isSandboxMultiplayer() && !isSandboxSplitMode()){
      var p2Hud = ensurePilot2();
      var barX2 = w - barW - 96;
      var barY2 = barY;
      var barH2 = barH;
      var barGap2 = barGap;
      var hudBars2 = [];
      var hullRatio2 = clamp(p2Hud.hull, 0, 1);
      hudBars2.push({
        label: "HP",
        ratio: hullRatio2,
        fill: "rgba(28,220,120,.9)",
        glow: "rgba(28,220,120,.35)"
      });
      if(hudBars2.length){
        for(var b2=0; b2<hudBars2.length; b2++){
          var bY2 = barY2 + b2 * (barH2 + barGap2);
          var bHud = hudBars2[b2];
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,.4)";
          ctx.strokeStyle = "rgba(255,255,255,.22)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(barX2, bY2, barW, barH2, 8);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = bHud.fill;
          ctx.shadowColor = bHud.glow;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(barX2, bY2, barW * bHud.ratio, barH2, 8);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = labelColor;
          ctx.font = labelStyle;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(bHud.label, barX2 + barW + 8, bY2 + barH2 / 2);
          ctx.restore();
        }
      }

      var maxLives2 = Math.max(0, p2Hud.livesStart || state.livesStart || 0);
      if(maxLives2 > 0){
        var livesLeft2 = Math.max(0, Math.min(p2Hud.lives || 0, maxLives2));
        var lifeGap2 = 4;
        var lifeH2 = 6;
        var availableW2 = barW - lifeGap2 * (maxLives2 - 1);
        var lifeW2 = Math.max(6, Math.floor(availableW2 / maxLives2));
        if(lifeW2 > 18) lifeW2 = 18;
        var totalW2 = lifeW2 * maxLives2 + lifeGap2 * (maxLives2 - 1);
        if(totalW2 > barW){
          lifeW2 = Math.max(5, Math.floor((barW - lifeGap2 * (maxLives2 - 1)) / maxLives2));
        }
        var lifeY2 = barY2 + hudBars2.length * (barH2 + barGap2) + 6;
        ctx.save();
        ctx.fillStyle = labelColor;
        ctx.font = labelStyle;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText("LIVES", barX2 + barW + 8, lifeY2 + lifeH2 / 2);
        for(var li2=0; li2<maxLives2; li2++){
          var lx2 = barX2 + li2 * (lifeW2 + lifeGap2);
          var isActive2 = li2 < livesLeft2;
          ctx.fillStyle = isActive2 ? "rgba(255,80,80,.9)" : "rgba(255,80,80,.2)";
          ctx.fillRect(lx2, lifeY2, lifeW2, lifeH2);
          ctx.strokeStyle = "rgba(255,120,120,.5)";
          ctx.lineWidth = 1;
          ctx.strokeRect(lx2, lifeY2, lifeW2, lifeH2);
        }
        ctx.restore();
      }
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
  var isEmptySecondary = group === "secondary" && (entry.empty || !type || type === "empty");
  if(isEmptySecondary){
    var rEmpty = size * 0.42;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "rgba(232,236,255,.35)";
    ctx.fillStyle = "rgba(232,236,255,.06)";
    ctx.lineWidth = Math.max(1.4, size * 0.08);
    if(ctx.setLineDash) ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, rEmpty, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if(ctx.setLineDash) ctx.setLineDash([]);
    ctx.restore();
    return;
  }
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
    if(type === "autofire"){
      ctx.lineWidth = 2.4;
      for(var af=0; af<3; af++){
        var y = -8 + af * 6;
        ctx.beginPath();
        ctx.moveTo(-7, y);
        ctx.lineTo(7, y + 2);
        ctx.stroke();
      }
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
    if(type === "autofire"){
      ctx.lineWidth = 2.4;
      for(var af=0; af<3; af++){
        var y = -8 + af * 6;
        ctx.beginPath();
        ctx.moveTo(-7, y);
        ctx.lineTo(7, y + 2);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
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
    var shotCharges = player.blasterHitsRemaining;
    if(shotCharges >= 9999) shotCharges = null;
    entries.push({ type: mode, group: "offense", charges: shotCharges });
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
  if(player.scopeTimer > 0){
    entries.push({
      type: "scope",
      group: "defense",
      charges: null
    });
  }
  var secondaryEntries = getSecondaryInventoryEntries();
  for(var s=0; s<secondaryEntries.length; s++){
    var entry = secondaryEntries[s];
    var hasType = !!entry.type && entry.count > 0;
    if(entry.type === "autofire" && player.autoFireActive){
      hasType = true;
    }
    entries.push({
      type: hasType ? entry.type : "empty",
      group: "secondary",
      charges: hasType ? entry.count : 0,
      slot: entry.slotIndex + 1,
      selected: entry.slotIndex === player.secondarySlotIndex,
      empty: !hasType
    });
  }
  if(!entries.length) return;

  var iconSize = Math.max(56, radius * 1.9);
  var pad = 12;
  var boxSize = iconSize + pad;
  var gap = 14;
  var rightMargin = 30;
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
    if(entry.type === "autofire" && player.autoFireAmmoMax > 0){
      var ammoRatio = clamp((player.autoFireAmmo || 0) / Math.max(1, player.autoFireAmmoMax || 1), 0, 1);
      var ringR = boxSize / 2 - 4;
      ctx.save();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "rgba(0,229,255,.65)";
      ctx.beginPath();
      ctx.arc(x + boxSize / 2, y + boxSize / 2, ringR, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * ammoRatio);
      ctx.stroke();
      ctx.restore();
    }
    if(entry.slot){
      ctx.fillStyle = "rgba(0,229,255,.9)";
      ctx.font = "700 11px Oxanium, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(String(entry.slot), x + 6, y + 5);
    }
    if(entry.type === "autofire" && player.autoFireActive){
      ctx.fillStyle = "rgba(232,236,255,.9)";
      ctx.font = "700 11px Oxanium, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(String(player.autoFireAmmo || 0), x + boxSize - 6, y + boxSize - 4);
    }else if(entry.charges != null && entry.charges > 1 && entry.charges < 9999){
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

function drawScopeLaser(){
  if(player.scopeTimer <= 0) return;
  if(state.hideAsteroids || player.hidden) return;
  var startX = player.x;
  var startY = player.y - player.h * 0.6;
  var endY = view.hudH + 8;
  var hitY = null;
  for(var i=0; i<asteroids.length; i++){
    var a = asteroids[i];
    if(!a || a.ambient) continue;
    if(a.y >= startY) continue;
    var dx = Math.abs(a.x - startX);
    var threshold = (a.r || 16) * 0.8;
    if(dx <= threshold){
      var candidate = a.y + (a.r || 16) * 0.75;
      if(hitY == null || candidate > hitY){
        hitY = candidate;
      }
    }
  }
  if(hitY != null) endY = Math.max(endY, Math.min(startY - 6, hitY));
  if(endY >= startY) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(255,60,60,.85)";
  ctx.lineWidth = 1.4;
  ctx.shadowColor = "rgba(255,80,80,.6)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(startX, endY);
  ctx.stroke();
  ctx.restore();
}

function pushAsteroidsByBeam(startX, startY, endX, endY){
  var dx = endX - startX;
  var dy = endY - startY;
  var len = Math.max(1, Math.hypot(dx, dy));
  var dirX = dx / len;
  var dirY = dy / len;
  var perpX = -dirY;
  var perpY = dirX;
  for(var i=0; i<asteroids.length; i++){
    var a = asteroids[i];
    if(!a || a.ghost) continue;
    if(a.y > startY) continue;
    var relX = a.x - startX;
    var relY = a.y - startY;
    var proj = relX * dirX + relY * dirY;
    if(proj < 0 || proj > len + (a.r || 0)) continue;
    var dist = Math.abs(relX * perpX + relY * perpY);
    if(dist > (a.r || 16) + 14) continue;
    var side = (relX * perpX + relY * perpY) >= 0 ? 1 : -1;
    a.vx = (a.vx || 0) + side * 36;
  }
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

function drawLightningFlash(){
  if(state.lightningFlash <= 0) return;
  var alpha = clamp(state.lightningFlash / 0.12, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(210,235,255," + (0.32 * alpha).toFixed(3) + ")";
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.restore();
}

function drawCameraFlash(){
  if(state.cameraFlash <= 0) return;
  var alpha = clamp(state.cameraFlash / 0.18, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "rgba(255,255,255," + (0.5 * alpha).toFixed(3) + ")";
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.restore();
}

function clearMissionBriefType(){
  for(var i=0; i<missionBriefTypeTimers.length; i++){
    clearTimeout(missionBriefTypeTimers[i]);
    clearInterval(missionBriefTypeTimers[i]);
  }
  missionBriefTypeTimers.length = 0;
  setMissionBriefCommanderTalking(false);
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
    var lastChar = txt.charAt(idx - 1);
    if(lastChar && lastChar.trim().length > 0){
      var phase = idx % 8;
      setMissionBriefCommanderTalking(phase < 4);
    }else{
      setMissionBriefCommanderTalking(false);
    }
    if(idx >= txt.length){
      clearInterval(timer);
      setMissionBriefCommanderTalking(false);
      if(typeof done === "function") done();
    }
  }, speedMs || 22);
  missionBriefTypeTimers.push(timer);
}

function startMissionBriefTypewriter(title, body){
  clearMissionBriefType();
  playMissionBriefTypeAudio();
  setMissionBriefCommanderTalking(false);
  typeMissionBriefText(missionBriefTitle, title, 26, function(){
    typeMissionBriefText(missionBriefBody, body, 18, function(){
      stopMissionBriefTypeAudio();
      setMissionBriefCommanderTalking(false);
    });
  });
}

function ensureMissionBrief(){
  if(missionBriefOverlay) return;
  if(document.getElementById("missionBriefStyles") == null){
    var style = document.createElement("style");
    style.id = "missionBriefStyles";
    style.textContent = "#missionBriefOverlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:18;background:rgba(6,10,20,.7);backdrop-filter:blur(4px);}#missionBriefOverlay.show{display:flex;}#missionBriefOverlay .missionBrief-wrap{display:flex;align-items:flex-end;gap:18px;}#missionBriefOverlay .missionBrief-avatarWrap{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:220px;}#missionBriefOverlay .missionBrief-avatar{width:230px;height:230px;object-fit:contain;filter:drop-shadow(0 12px 26px rgba(0,0,0,.45));}#missionBriefOverlay .missionBrief-avatarName{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:rgba(232,236,255,.85);}#missionBriefOverlay .missionBrief-card{background:rgba(8,12,24,.92);border:1px solid rgba(0,229,255,.3);border-radius:18px;padding:18px 20px;max-width:480px;width:min(480px,92%);box-shadow:0 18px 48px rgba(0,0,0,.5);font-family:\"Oxanium\",sans-serif;transform:scale(0.92);opacity:0;transition:transform .35s ease, opacity .35s ease;}#missionBriefOverlay.show .missionBrief-card{transform:scale(1);opacity:1;}#missionBriefOverlay .missionBrief-card.is-exiting{transform:scale(0.86);opacity:0;}#missionBriefOverlay h3{margin:0 0 10px;font-size:14px;letter-spacing:1.6px;text-transform:uppercase;color:#e8ecff;}#missionBriefOverlay p{margin:0 0 16px;font-size:13px;line-height:1.6;color:rgba(232,236,255,.8);white-space:pre-line;}#missionBriefOverlay .brief-actions{display:flex;justify-content:flex-end;}#missionBriefOverlay .brief-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);color:#e8ecff;border-radius:12px;padding:8px 12px;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;font-family:\"Oxanium\",sans-serif;}";
    document.head.appendChild(style);
  }
  missionBriefOverlay = document.createElement("div");
  missionBriefOverlay.id = "missionBriefOverlay";
  missionBriefOverlay.innerHTML = "<div class=\"missionBrief-wrap\"><div class=\"missionBrief-avatarWrap\"><img class=\"missionBrief-avatar\" alt=\"Commander\"/><div class=\"missionBrief-avatarName\">COMMANDER SOLVER</div></div><div class=\"missionBrief-card\"><h3></h3><p></p><div class=\"brief-actions\"><button class=\"brief-btn\" type=\"button\">UNDERSTOOD</button></div></div></div>";
  var shell = gameShell || document.body;
  shell.appendChild(missionBriefOverlay);
  missionBriefTitle = missionBriefOverlay.querySelector("h3");
  missionBriefBody = missionBriefOverlay.querySelector("p");
  missionBriefBtn = missionBriefOverlay.querySelector(".brief-btn");
  var briefAvatar = missionBriefOverlay.querySelector(".missionBrief-avatar");
  if(briefAvatar){
    briefAvatar.src = "images/characters/commander1.png";
    briefAvatar.dataset.closed = "images/characters/commander1.png";
    briefAvatar.dataset.open = "images/characters/commander2.png";
  }
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

function setMissionBriefCommanderTalking(isTalking){
  if(!missionBriefOverlay) return;
  var avatarEl = missionBriefOverlay.querySelector(".missionBrief-avatar");
  if(!avatarEl) return;
  var closed = avatarEl.dataset.closed || "images/characters/commander1.png";
  var open = avatarEl.dataset.open || "images/characters/commander2.png";
  avatarEl.src = isTalking ? open : closed;
}

function getMissionBriefObjectiveText(){
  var info = describeQuestionMode(state.questionMode || (inputs.questionMode ? inputs.questionMode.value : "classic"));
  var modeName = info.modeLabel || "Classic Answer";
  var op = info.operation || "Multiplication";
  var sub = info.submode ? (" (" + info.submode + ")") : "";
  var summary = op + " — " + modeName + sub + ".";
  var detail = "Shoot the correct answer asteroids before they escape. Avoid decoys and stay sharp.";
  var hitsRule = "";
  if(modeName.indexOf("Digit Hunt") !== -1){
    detail = "Shoot the digits in the correct order to complete the answer. Avoid decoys.";
    hitsRule = "Each digit asteroid takes hits equal to its digit, in order.";
  }else if(modeName.indexOf("Partial Sums") !== -1){
    detail = "Find the missing addend that completes the sum. Avoid decoys.";
    hitsRule = "Correct addend asteroids take hits equal to the largest digit in the answer.";
  }else if(modeName.indexOf("Series") !== -1){
    detail = "Solve the full series sum and shoot the correct answer. Avoid decoys.";
    hitsRule = "Correct answer asteroids take hits equal to the largest digit in the answer.";
  }else if(modeName.indexOf("Factor Hunt") !== -1){
    detail = "Find the missing factor that completes the product. Avoid decoys.";
    hitsRule = "Correct factor asteroids take 1 hit.";
  }else if(op == "Rationals"){
    detail = "Match the fraction/decimal shown. Avoid incorrect values.";
    if(String(state.questionMode) == "rational_frac"){
      hitsRule = "Correct fraction asteroids take hits equal to the denominator.";
    }else{
      hitsRule = "Correct decimal asteroids take 1 hit.";
    }
  }else if(op == "Squares"){
    detail = "Solve the square or root and shoot the correct asteroid.";
    hitsRule = "Correct square/root asteroids take hits equal to the largest digit in the answer.";
  }else if(String(state.questionMode).indexOf("classic") != -1 || String(state.questionMode).indexOf("series") != -1){
    hitsRule = "Correct answer asteroids take hits equal to the largest digit in the answer.";
  }
  var lines = [];
  lines.push("OBJECTIVE: " + summary);
  lines.push("• " + detail);
  if(hitsRule){
    lines.push("• " + hitsRule);
  }
  return lines.join("\n");
}

function getMissionBriefReadyText(){
  return "READY:\n• Confirm and launch.\n• Stay sharp, cadet.";
}

function getMissionBriefText(){
  return getMissionBriefObjectiveText() + "\n\n" + getMissionBriefReadyText();
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
  }else if(tutorialDotsRequiredMode === "touch"){
    if(!touchControlsEnabled || touchControlsDockHidden) return;
    if(Math.hypot(touchMoveAxes.x, touchMoveAxes.y) < 0.08) return;
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
  if(p.type === "mineral") return "rgba(255,221,0,.85)";
  if(p.group === "defense"){
    if(p.type === "scope") return "rgba(255,77,109,.7)";
    return p.type === "shield" ? "rgba(193,216,47,.7)" : "rgba(255,77,109,.7)";
  }
  if(p.group === "secondary"){
    return p.type === "repair" ? "rgba(0,229,255,.7)"
      : p.type === "time" ? "rgba(175,0,111,.7)"
      : p.type === "magnet" ? "rgba(255,221,0,.7)"
      : p.type === "emp" ? "rgba(175,0,111,.7)"
      : p.type === "autofire" ? "rgba(255,221,0,.85)"
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

  if(p.type === "mineral" && mineralIconImg.ready){
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    var size = Math.max(24, (p.r || 12) * 2.6);
    ctx.drawImage(mineralIconImg.img, -size / 2, -size / 2, size, size);
    ctx.restore();
    return;
  }

  var icon = powerupIcons[p.type];
  if(!icon && p.group === "offense"){
    icon = shotIcons[p.type];
  }
  if(icon && icon.ready){
    var iconSize = Math.max(64, p.r * 4.2);
    if(p.type === "plasma") iconSize *= 1.3;
    if(p.type === "electric") iconSize *= 1.25;
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
  if(p.group === "secondary" && p.type === "autofire"){
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 3.6;
    for(var af=0; af<3; af++){
      var y = -8 + af * 6;
      ctx.beginPath();
      ctx.moveTo(-7, y);
      ctx.lineTo(7, y + 2);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if(p.group === "offense"){
    if(p.type === "autofire"){
      ctx.lineWidth = 2.4;
      for(var af=0; af<3; af++){
        var y = -8 + af * 6;
        ctx.beginPath();
        ctx.moveTo(-7, y);
        ctx.lineTo(7, y + 2);
        ctx.stroke();
      }
      return;
    }
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
    function getBeamEndPoint(){
      if(b.beamEndX != null && b.beamEndY != null){
        return { x: b.beamEndX, y: b.beamEndY };
      }
      var dx = (typeof b.vx === "number") ? b.vx : 0;
      var dy = (typeof b.vy === "number") ? b.vy : -1;
      var mag = Math.max(0.001, Math.hypot(dx, dy));
      var dirX = dx / mag;
      var dirY = dy / mag;
      var endY = 0;
      var t = (endY - b.y) / Math.max(-0.001, dirY);
      var endX = b.x + dirX * t;
      return { x: endX, y: endY };
    }
    function drawBulletImage(asset, sizeMul, offsetY, rotation, flip){
      if(!asset || !asset.ready) return;
      var size = b.r * sizeMul;
      var iw = asset.img.naturalWidth || asset.img.width || size;
      var ih = asset.img.naturalHeight || asset.img.height || size;
      var scale = size / Math.max(1, Math.max(iw, ih));
      var drawW = iw * scale;
      var drawH = ih * scale;
      ctx.save();
      ctx.globalAlpha = 0.95;
      var spinFlip = !!flip;
      if(rotation || spinFlip){
        ctx.translate(b.x, b.y + (offsetY || 0));
        if(rotation) ctx.rotate(rotation);
        if(spinFlip) ctx.scale(-1, 1);
        ctx.drawImage(asset.img, -drawW / 2, -drawH / 2, drawW, drawH);
      }else{
        ctx.drawImage(asset.img, b.x - drawW / 2, b.y + (offsetY || 0) - drawH / 2, drawW, drawH);
      }
      ctx.restore();
    }
    function drawElectricBeam(b){
      var dx = (typeof b.beamDirX === "number") ? b.beamDirX : ((typeof b.vx === "number") ? b.vx : 0);
      var dy = (typeof b.beamDirY === "number") ? b.beamDirY : ((typeof b.vy === "number") ? b.vy : -1);
      var mag = Math.max(0.001, Math.hypot(dx, dy));
      var dirX = dx / mag;
      var dirY = dy / mag;
      var startX = (b.beamStartX != null) ? b.beamStartX : b.x;
      var startY = (b.beamStartY != null) ? b.beamStartY : b.y;
      var endPoint = getBeamEndPoint();
      var endX = endPoint.x;
      var endY = endPoint.y;
      var perpX = -dirY;
      var perpY = dirX;
      var now = performance.now() * 0.01;
      var seed = ((b.seed || b.id || 0) * 0.37) + now;
      var segments = 8;
      var pts = [];
      pts.push([startX, startY]);
      for(var iSeg=1; iSeg<segments; iSeg++){
        var t = iSeg / segments;
        var baseX = startX + (endX - startX) * t;
        var baseY = startY + (endY - startY) * t;
        var wobble = Math.sin(seed + t * 12.5) * Math.cos(seed * 1.1 + t * 9.8);
        var amp = 52 * (1 - Math.abs(0.5 - t) * 2);
        var jitter = (Math.sin(seed * 2.4 + iSeg * 3.1) * 1.0 + Math.cos(seed * 2.9 + iSeg * 2.2) * 0.85);
        var j = (wobble + jitter) * amp;
        pts.push([baseX + perpX * j, baseY + perpY * j]);
      }
      pts.push([endX, endY]);

      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(130,210,255,0.5)";
      ctx.lineWidth = 9.5;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for(var pi=1; pi<pts.length; pi++) ctx.lineTo(pts[pi][0], pts[pi][1]);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for(var pi2=1; pi2<pts.length; pi2++) ctx.lineTo(pts[pi2][0], pts[pi2][1]);
      ctx.stroke();
      ctx.restore();
    }
    var spinFlip = (((performance.now() + (b.id || 0) * 83) / 220) | 0) % 2 === 1;
    if(b.kind === "laser"){
      drawBulletImage(bulletLaserImg, 16, -(b.len || 18), 0, spinFlip);
      continue;
    }

    if(b.kind === "rail"){
      drawBulletImage(bulletRailImg, 16, -(b.len || 34), 0, spinFlip);
      continue;
    }

    if(b.kind === "fire"){
      drawBulletImage(bulletFireImg, 16, 0, 0, spinFlip);
      continue;
    }

    if(b.kind === "plasma"){
      drawBulletImage(bulletOrbImg, 12, 0, 0, spinFlip);
      continue;
    }

    if(b.kind === "ice"){
      drawBulletImage(bulletIceImg, 12, 0, 0, spinFlip);
      continue;
    }

    if(b.kind === "electric"){
      drawElectricBeam(b);
      continue;
    }

    if(b.kind === "pierce"){
      drawBulletImage(bulletBolaImg, 14, 0, b.rot || 0, spinFlip);
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
      drawBulletImage(bulletMissileImg, 14, 0, b.rot || 0, spinFlip);
      continue;
    }

    if(b.kind === "single" && bulletSingle.ready){
      drawBulletImage(bulletSingle, 14, 0, 0, spinFlip);
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
  if(a.spawnFade != null){
    fadeAlpha *= clamp(a.spawnFade, 0, 1);
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
    var ghostAlpha = a.ambient ? 0.95 : (a.ghostFade === false ? 0.95 : 0.2);
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

    ctx.fillStyle = a.ghost ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.12)";
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

  if(a.hitsTotal && a.hitsTotal > 1 && a.hitsRemaining != null && a.hitsRemaining < a.hitsTotal){
    var barH = Math.max(18, a.r * 1.6);
    var barW = 5;
    var barX = drawX + a.r + 8;
    var barY = drawY - barH / 2;
    var ratio = clamp(a.hitsRemaining / Math.max(1, a.hitsTotal), 0, 1);
    ctx.save();
    ctx.globalAlpha = fadeAlpha;
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "rgba(70,255,120,.9)";
    ctx.fillRect(barX, barY + barH * (1 - ratio), barW, barH * ratio);
    ctx.strokeStyle = "rgba(255,255,255,.2)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX - 0.5, barY - 0.5, barW + 1, barH + 1);
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
  var overScale = player.overflightTimer > 0 ? 1.18 : 1;
  renderShip(player.x + sx, player.y + sy, fadeAlpha, false, undefined, undefined, null, overScale);
  if(player.compassTimer > 0){
    drawCompassArrow();
  }
}

function drawPilotShip(pilot){
  if(!pilot || pilot.hidden) return;
  var prev = player;
  player = pilot;
  drawShip();
  player = prev;
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

function clearScopeOnHit(){
  if(player.scopeTimer > 0){
    player.scopeTimer = 0;
  }
}

function consumeArmorBlockForPilot(pilot){
  if(!pilot || pilot.defenseMode !== "armor") return;
  pilot.armorBlocksRemaining = Math.max(0, (pilot.armorBlocksRemaining || 0) - 1);
  if(pilot.armorBlocksRemaining <= 0){
    pilot.defenseMode = "none";
    pilot.defenseTimer = 0;
    showToast("ARMOR DEPLETED");
  }
}

function handlePilotAsteroidCollision(a, pilot, pilotId, hitX, hitY, force, noRemove){
  if(!pilot) return false;
  if(pilot.dead) return false;
  if(a.noDamage) return false;
  if(a.grabbedByClaw) return false;
  var dx = a.x - hitX;
  var dy = a.y - (hitY - 4);
  var dist = Math.hypot(dx, dy);
  if(dist >= a.r + 16) return false;

  if(!force && pilot.invuln > 0){
    return false;
  }

  if(isStampedeMode() && a.isCorrect && a.waveId === state.waveId){
    if(pilot.clawActive && pilot.clawTargetId === a.id){
      return false;
    }
  }

  if(force || pilot.invuln <= 0){
    clearScopeOnHitForPilot(pilot);
    registerShotTypeHitForPilot(pilot, 1, false);
    resetSurvivorTimer();
    if(!noRemove && a.isCorrect && a.waveId === state.waveId){
      state.correctInPlay = false;
      state.correctAsteroidId = 0;
    }

    kickShake(22, 0.18);
    triggerCameraFlash(0.18);
    a.shakeTimer = 0.2;
    a.shakeDur = 0.2;
    a.shakeAmp = 4.2;
    a.vx = (a.vx || 0) + (dx / Math.max(1, dist)) * 120;
    a.vy = (a.vy || 0) + (dy / Math.max(1, dist)) * 120;
    var knockBack = 0.7;
    pilot.vx = (-dx / Math.max(1, dist)) * pilot.speed * knockBack;
    pilot.vy = (-dy / Math.max(1, dist)) * pilot.speed * knockBack;
    var dmgHit = (a.ghost || a.label === null) ? 0.18 : 0.30;
    if(pilot.defenseMode === "armor") dmgHit = dmgHit * 0.4;

    if(pilot.defenseMode === "shield"){
      impactDebris(hitX, hitY - 8);
      playSfx(state, "impact", 0.35);
      pilot.hitFlash = 1;
      pilot.shipShake = Math.max(pilot.shipShake || 0, 1.0);
      pilot.invuln = 0.35;
      showToast("SHIELD BLOCK");
    }else if(pilot.defenseMode === "armor"){
      impactShipHit(hitX, hitY - 10);
      playSfx(state, "impact_thud", 0.45);
      pilot.hitFlash = 1;
      pilot.shipShake = Math.max(pilot.shipShake || 0, 1.0);
      pilot.invuln = 0.35;
      showToast("ARMOR ABSORB");
      consumeArmorBlockForPilot(pilot);
    }else{
      impactShipHit(hitX, hitY - 10);
      playSfx(state, "crash", 0.55);
      pilot.hitFlash = 1;
      pilot.shipShake = Math.max(pilot.shipShake || 0, 1.0);
      pilot.invuln = 0.45;

      pilot.hull = clamp(pilot.hull - dmgHit, 0, 1);
      markDamage(pilot);
      if(pilot.hull <= 0){
        pilot.hull = 0;
        pilot.lives = Math.max(0, (pilot.lives || 0) - 1);
        if(pilot.lives <= 0){
          pilot.dead = true;
          pilot.hidden = true;
          showToast("PILOT DOWN");
        }else{
          pilot.hull = 1;
          pilot.lowHullAlarmed = false;
          pilot.invuln = Math.max(pilot.invuln || 0, 0.6);
          showToast("HULL CRITICAL");
        }
        return true;
      }else{
        updateLowHullAlarm(pilot, dmgHit);
        playSfx(state, "ship_damaged");
        showToast("HULL DAMAGED");
      }
    }
  }

  return !noRemove;
}

function triggerCameraFlash(strength){
  var amt = (typeof strength === "number" && isFinite(strength)) ? strength : 0.18;
  state.cameraFlash = Math.max(state.cameraFlash || 0, amt);
}

function handleShipAsteroidCollision(a, hitX, hitY, force, noRemove){
  if(a.noDamage) return false;
  if(a.grabbedByClaw) return false;
  var dx = a.x - hitX;
  var dy = a.y - (hitY - 4);
  var dist = Math.hypot(dx, dy);
  if(dist >= a.r + 16) return false;

  if(!force && player.invuln > 0){
    return false;
  }
  if(player.phaseTimer > 0 || player.overflightTimer > 0){
    return false;
  }

  if(isStampedeMode() && a.isCorrect && a.waveId === state.waveId){
    if(player.clawActive && player.clawTargetId === a.id){
      return false;
    }
  }

  if(force || player.invuln <= 0){
    clearScopeOnHit();
    registerShotTypeHit(1, false);
    resetSurvivorTimer();
    if(!noRemove && a.isCorrect && a.waveId === state.waveId){
      state.correctInPlay = false;
      state.correctAsteroidId = 0;
    }

    kickShake(22, 0.18);
    triggerCameraFlash(0.18);
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
    if(player.defenseMode === "armor") dmgHit = dmgHit * 0.4;

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
      markDamage(player);
      state.streak = 0;
      if(consumeShipLife("OUT OF LIVES (ASTEROID COLLISION)")) return true;

      if(player.hull <= 0){
        if(tutorialActive){
          player.hull = Math.max(player.hull, 0.12);
          syncHud();
          updateLowHullAlarm(player, dmgHit);
          return triggerTutorialRecovery("HULL CRITICAL");
        }
        player.hull = 0;
        syncHud();
        state.endReasonDetail = "HULL DEPLETED (ASTEROID COLLISION)";
        endGame("destroyed");
        return true;
      }else{
        updateLowHullAlarm(player, dmgHit);
        playSfx(state, "ship_damaged");
        showToast("HULL DAMAGED");
      }
    }
  }

  return !noRemove;
}

function completeClawGrab(target){
  if(!target || target.clawResolved) return;
  target.clawResolved = true;
  var wid = state.waveId;
  state.correctInPlay = false;
  state.correctAsteroidId = 0;
  retireWave(wid);
  onStampedeCorrect(target);
  awardMinerals(3);
  impactCorrect(target.x, target.y, target.r);
  spawnParticles(target.x, target.y, "spark");
  spawnParticles(target.x, target.y, "spark_white");
  var idx = asteroids.indexOf(target);
  if(idx >= 0){
    asteroids.splice(idx, 1);
  }
}

function startClawGrab(target){
  if(!target || player.clawActive) return;
  if(target.clawResolved) return;
  player.clawActive = true;
  player.clawPhase = "extend";
  player.clawReach = 0;
  player.clawTargetId = target.id;
  player.clawOpenTimer = 0;
  player.clawShake = 0;
  player.clawHold = 0;
  target.grabbedByClaw = true;
  target.noDamage = true;
}

function updateClaw(dt){
  if(!isStampedeMode()){
    player.clawActive = false;
    player.clawHold = 0;
    player.clawHoldKey = false;
    player.clawPromptAlpha = Math.max(0, (player.clawPromptAlpha || 0) - dt * 4);
    return;
  }
  if(!state.running || state.paused || state.over || missionBriefShowing){
    player.clawHold = 0;
    player.clawPromptAlpha = Math.max(0, (player.clawPromptAlpha || 0) - dt * 4);
    return;
  }

  var candidate = getClawTargetInRange();
  if(!player.clawActive){
    if(candidate){
      player.clawPromptAlpha = Math.min(1, (player.clawPromptAlpha || 0) + dt * 3.5);
      if(player.clawHoldKey && keys.has("q")){
        player.clawHold = (player.clawHold || 0) + dt;
        if(player.clawHold >= (player.clawHoldRequired || 0.35)){
          startClawGrab(candidate.asteroid);
        }
      }else{
        player.clawHold = 0;
      }
    }else{
      player.clawPromptAlpha = Math.max(0, (player.clawPromptAlpha || 0) - dt * 4);
      player.clawHold = 0;
    }
    return;
  }

  var target = getClawTargetById();
  if(!target || target.ghost || target.clawResolved){
    player.clawActive = false;
    player.clawTargetId = 0;
    return;
  }

  var shipX = player.x;
  var shipY = player.y - 6;
  var dx = target.x - shipX;
  var dy = target.y - shipY;
  var dist = Math.max(1, Math.hypot(dx, dy));

  if(player.clawPhase === "extend"){
    var extendSpeed = 760;
    player.clawReach = Math.min(dist, player.clawReach + extendSpeed * dt);
    if(player.clawReach >= dist - 8){
      player.clawPhase = "open";
      player.clawOpenTimer = 0.12;
      impactDebris(target.x, target.y);
    }
  }else if(player.clawPhase === "open"){
    player.clawReach = dist + 6;
    player.clawOpenTimer -= dt;
    if(player.clawOpenTimer <= 0){
      player.clawPhase = "retract";
      target.grabbedByClaw = true;
      target.vx = 0;
      target.vy = 0;
      target.shakeTimer = 0.2;
      target.shakeDur = 0.2;
      target.shakeAmp = 3.4;
    }
  }else if(player.clawPhase === "retract"){
    var retractSpeed = 220;
    var tdx = shipX - target.x;
    var tdy = shipY - target.y;
    var tdist = Math.max(1, Math.hypot(tdx, tdy));
    var step = Math.min(tdist, retractSpeed * dt);
    var nx = tdx / tdist;
    var ny = tdy / tdist;
    target.x += nx * step;
    target.y += ny * step;
    player.clawReach = tdist;
    if(player.clawShake == null) player.clawShake = 0;
    player.clawShake = Math.min(1.2, (player.clawShake || 0) + dt * 3);
    if(player.clawShake > 0){
      var jiggle = player.clawShake * 2.2;
      target.x += (Math.random() - 0.5) * jiggle;
      target.y += (Math.random() - 0.5) * jiggle;
    }
    if(tdist <= 18){
      completeClawGrab(target);
      player.clawActive = false;
      player.clawTargetId = 0;
      player.clawPhase = "";
      player.clawReach = 0;
      player.clawShake = 0;
    }
  }
}

function drawClaw(){
  if(!player.clawActive) return;
  var target = getClawTargetById();
  if(!target) return;
  var shipX = player.x;
  var shipY = player.y - 6;
  var dx = target.x - shipX;
  var dy = target.y - shipY;
  var dist = Math.max(1, Math.hypot(dx, dy));
  var dirX = dx / dist;
  var dirY = dy / dist;
  var reach = Math.min(dist, Math.max(0, player.clawReach || 0));
  var endX = shipX + dirX * reach;
  var endY = shipY + dirY * reach;
  if(player.clawPhase === "retract" && player.clawShake){
    var wobble = player.clawShake * 1.6;
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

  var imgObj = (player.clawPhase === "open") ? clawOpenImg : clawClosedImg;
  if(imgObj && imgObj.ready){
    var ang = Math.atan2(dirY, dirX) + Math.PI / 2;
    var natW = imgObj.img.naturalWidth || imgObj.img.width || 64;
    var natH = imgObj.img.naturalHeight || imgObj.img.height || 64;
    var size = Math.min(64, Math.max(natW, natH));
    var drawW = (natW / Math.max(1, Math.max(natW, natH))) * size;
    var drawH = (natH / Math.max(1, Math.max(natW, natH))) * size;
    ctx.translate(endX, endY);
    ctx.rotate(ang);
    ctx.drawImage(imgObj.img, -drawW/2, -drawH/2, drawW, drawH);
  }
  ctx.restore();
}

function drawClawPrompt(){
  if(!isStampedeMode() || player.clawActive) return;
  if(!(player.clawPromptAlpha > 0)) return;
  var candidate = getClawTargetInRange();
  if(!candidate) return;
  ctx.save();
  ctx.globalAlpha = player.clawPromptAlpha;
  ctx.fillStyle = "rgba(232,236,255,0.9)";
  ctx.font = "600 12px Oxanium, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,229,255,.35)";
  ctx.shadowBlur = 6;
  ctx.fillText("HOLD X TO GRAB", player.x, player.y - 52);
  ctx.restore();
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
  var idleHover = speedMag < 0.05 && Math.abs(vxN) < 0.05 && Math.abs(vyN) < 0.05;
  var hoverBoost = idleHover ? 1.35 : 1;
  var t = performance.now();

  ctx.translate(x, y + bob);
  var scaleMap = {
    am2: 1.08,
    mk7: 0.98,
    fizard: 0.98,
    classic: 0.98,
    ember: 0.98,
    azure: 0.98,
    spire: 0.98,
    bu2x: 0.98,
    mantas: 0.98,
    cyan: 0.98,
    veloz: 0.98,
    verde9: 0.98,
    whiteflame8: 0.98
  };
  var scale = scaleMap[shipType] || 0.90;
  if(typeof scaleMul === "number") scale *= scaleMul;
  ctx.scale(scale, scale);

  if(!isFinite(x) || !isFinite(y)) { ctx.restore(); return; }
  var swayAmp = 0.008 + speedMag * 0.01;
  var sway = Math.sin(t * 0.004) * swayAmp;
  var shear = 0;
  ctx.rotate(turn);
  ctx.transform(1, 0, shear, 1, 0, 0);
  ctx.scale(squashX * (1 + sway) * (1 - backwardShrink * 0.4), (1 - sway * 0.6) * (1 + forwardStretch - backwardShrink));

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
  var thrusterWidth = 30;
  var thrusterRadius = 6.5;
  var thrusterSeparation = 12;
  if(shipType === "mk7"){
    // Match the Crimson MK-7 ship card geometry.
    wingLeft = [-16, 30, -34, 22, -44, -6, -36, -26, -22, -30, -12, 12];
    wingRight = [16, 30, 34, 22, 44, -6, 36, -26, 22, -30, 12, 12];
    bodyOuter = [0, -20, 16, -8, 18, 6, 14, 18, 6, 24, -6, 24, -14, 18, -18, 6, -16, -8];
    bodyInner = [0, -14, 7, -2, 9, 10, 0, 18, -9, 10, -7, -2];
    stripe1 = { x:0, y:0, w:0, h:0 };
    stripe2 = { x:0, y:0, w:0, h:0 };
    nose = [0, -24, 10, -16, -10, -16];
    gun = {
      xLeft: -20,
      xRight: 10,
      y: 0,
      w: 10,
      h: 16,
      barrelLeft: -18,
      barrelRight: 14,
      barrelY: -18,
      barrelW: 4.5,
      barrelH: 14,
      centerX: -3,
      centerY: -20,
      centerW: 6,
      centerH: 18
    };
    thrusterWidth = 18;
    thrusterRadius = 5.5;
    thrusterSeparation = 16;
  }
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
  var recoil = ghost ? 0 : (player.recoil || 0);
  var recoilShift = recoil * 7;
  var ghostBodyAlpha = (ghost && ghostStyle.thrustFocus) ? 0.35 : 1;
  var ghostFlameBoost = (ghost && ghostStyle.thrustFocus) ? 1.45 : 1;

  var shipSprite = shipSprites[shipType];
  var useShipSprite = !!(shipSprite && shipSprite.ready && shipSprite.img);

  ctx.save();
  ctx.globalAlpha *= ghostBodyAlpha;
  // Apply recoil to the whole ship, not just the guns.
  ctx.translate(0, recoilShift * 1.15);

  if(useShipSprite){
    var iw = shipSprite.img.naturalWidth || shipSprite.img.width || 1;
    var ih = shipSprite.img.naturalHeight || shipSprite.img.height || 1;
    var targetH = 120;
    var targetW = targetH * (iw / ih);
    var halfW = targetW / 2;
    var halfIW = iw / 2;
    var topY = -targetH / 2;
    var overlapPx = Math.max(2, Math.round(iw * 0.004));
    var destOverlap = overlapPx * (targetW / iw);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    try{ ctx.imageSmoothingQuality = "high"; }catch(e){}
    ctx.save();
    ctx.scale(leftScale, 1);
    ctx.drawImage(shipSprite.img, 0, 0, halfIW + overlapPx, ih, -halfW, topY, halfW + destOverlap, targetH);
    ctx.restore();
    ctx.save();
    ctx.scale(rightScale, 1);
    ctx.drawImage(shipSprite.img, halfIW - overlapPx, 0, halfIW + overlapPx, ih, -destOverlap, topY, halfW + destOverlap, targetH);
    ctx.restore();
    ctx.restore();
  }else{
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
  }
  ctx.restore();

  if(player.defenseMode === "armor" && !ghost){
    ctx.save();
    ctx.globalCompositeOperation = "destination-over";
    ctx.translate(0, recoilShift * 1.15);
    var drawArmorStroke = function(){
      if(useShipSprite){
        var iwArmor = shipSprite.img.naturalWidth || shipSprite.img.width || 1;
        var ihArmor = shipSprite.img.naturalHeight || shipSprite.img.height || 1;
        var targetHArmor = 120;
        var targetWArmor = targetHArmor * (iwArmor / ihArmor);
        var halfWArmor = targetWArmor / 2;
        var halfIWArmor = iwArmor / 2;
        var topYArmor = -targetHArmor / 2;
        var overlapPxArmor = Math.max(2, Math.round(iwArmor * 0.004));
        var destOverlapArmor = overlapPxArmor * (targetWArmor / iwArmor);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        try{ ctx.imageSmoothingQuality = "high"; }catch(e){}
        ctx.save();
        ctx.scale(leftScale, 1);
        ctx.drawImage(shipSprite.img, 0, 0, halfIWArmor + overlapPxArmor, ihArmor, -halfWArmor, topYArmor, halfWArmor + destOverlapArmor, targetHArmor);
        ctx.restore();
        ctx.save();
        ctx.scale(rightScale, 1);
        ctx.drawImage(shipSprite.img, halfIWArmor - overlapPxArmor, 0, halfIWArmor + overlapPxArmor, ihArmor, -destOverlapArmor, topYArmor, halfWArmor + destOverlapArmor, targetHArmor);
        ctx.restore();
        ctx.restore();
      }else{
        var drawPoly = function(points){
          ctx.beginPath();
          ctx.moveTo(points[0], points[1]);
          for(var pi=2; pi<points.length; pi+=2){
            ctx.lineTo(points[pi], points[pi+1]);
          }
          ctx.closePath();
          ctx.stroke();
        };
        drawPoly(wingLeft);
        drawPoly(wingRight);
        drawPoly(bodyOuter);
      }
    };
    // Thick white outline pass
    ctx.save();
    ctx.globalAlpha = Math.min(1, baseAlpha * 1.2);
    ctx.shadowBlur = 0;
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.lineWidth = 14;
    drawArmorStroke();
    ctx.restore();
    // Opaque bloom pass
    ctx.save();
    ctx.globalAlpha = Math.min(1, baseAlpha * 1.3);
    ctx.shadowColor = "rgba(245,255,255,1)";
    ctx.shadowBlur = 160;
    ctx.strokeStyle = "rgba(245,255,255,1)";
    ctx.lineWidth = 18;
    drawArmorStroke();
    ctx.restore();
    ctx.restore();
  }

  ctx.save();
  var drawThrusterCasing = true;
  if(useShipSprite) drawThrusterCasing = false;
  var thrusterOffsetX = 0;
  var thrusterOffsetY = 0;
  if(shipType === "classic"){
    thrusterOffsetY = -4;
  }else if(shipType === "mk7"){
    thrusterOffsetY = -2;
  }
  // Pull the thrusters and flames slightly closer to the hull.
  var thrusterBaseY = 20 + thrusterOffsetY;
  var thrScale = 0.85;
  var thrW = (typeof thrusterWidth === "number") ? thrusterWidth : 44;
  var thrR = (typeof thrusterRadius === "number") ? thrusterRadius : 6.5;
  thrW *= thrScale;
  thrR *= thrScale;
  var thrSep = (typeof thrusterSeparation === "number") ? thrusterSeparation : 12;
  if(drawThrusterCasing){
    ctx.fillStyle = colors.thruster || "rgba(18,22,32,.85)";
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1.4;
    if(ghost && ghostStyle.thrustFocus){
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 1.4);
    }
    if(isSpire){
      ctx.beginPath();
      ctx.rect(-14 * thrScale + thrusterOffsetX, thrusterBaseY, 28 * thrScale, 9 * thrScale);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(thrusterOffsetX, thrusterBaseY + 7 * thrScale, 8.5 * thrScale, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }else{
      ctx.save();
      ctx.translate(-10 + thrusterOffsetX, 0);
      ctx.scale(leftScale, 1);
      ctx.translate(10 - thrusterOffsetX, 0);
      var leftX = -thrSep - thrW / 2 + thrusterOffsetX;
      ctx.beginPath();
      ctx.rect(leftX, thrusterBaseY, thrW, 8 * thrScale);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-thrSep + thrusterOffsetX, thrusterBaseY + 6 * thrScale, thrR, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(10 + thrusterOffsetX, 0);
      ctx.scale(rightScale, 1);
      ctx.translate(-10 - thrusterOffsetX, 0);
      var rightX = thrSep - thrW / 2 + thrusterOffsetX;
      ctx.beginPath();
      ctx.rect(rightX, thrusterBaseY, thrW, 8 * thrScale);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(thrSep + thrusterOffsetX, thrusterBaseY + 6 * thrScale, thrR, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if(isAm2){
        ctx.beginPath();
        ctx.arc(thrusterOffsetX, thrusterBaseY + 8 * thrScale, 5.5 * thrScale, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }
  ctx.restore();

  var flash = ghost ? 0 : (player.flash || 0);
  if(flash > 0){
    ctx.save();
    ctx.globalAlpha = baseAlpha * Math.min(1, flash);
    ctx.strokeStyle = "rgba(242,240,230,0.95)";
    ctx.lineWidth = 2.4;
    ctx.shadowColor = "rgba(255,250,230,0.9)";
    ctx.shadowBlur = 12;
    var muzzleX = gun.centerX + gun.centerW / 2;
    var muzzleY = gun.barrelY - recoilShift - 14;
    var baseLen = 11 + flash * 9;
    var angleJitter = (Math.random() - 0.5) * 0.35;
    var mainAngle = -Math.PI / 2 + angleJitter;
    var arms = 6;
    ctx.beginPath();
    for(var s=0; s<arms; s++){
      var ang = mainAngle + (Math.PI * 2 / arms) * s + (Math.random() - 0.5) * 0.25;
      var len = baseLen * (0.7 + Math.random() * 0.7);
      var ox = Math.cos(ang) * len;
      var oy = Math.sin(ang) * len;
      ctx.moveTo(muzzleX - ox * 0.25, muzzleY - oy * 0.25);
      ctx.lineTo(muzzleX + ox, muzzleY + oy);
    }
    ctx.stroke();
    ctx.restore();
  }

  function colorWithAlpha(color, alpha){
    var a = clamp(alpha, 0, 1);
    var m = String(color || "").match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if(!m) return "rgba(120,220,255," + a + ")";
    return "rgba(" + m[1] + "," + m[2] + "," + m[3] + "," + a + ")";
  }

  if(!useShipSprite){
    var flameAlphaMul = 0.48 * hoverBoost;
    var bankForFlame = clamp(bank, -1, 1);
    var leftPlumeMul = clamp(1 + bankForFlame * 0.35, 0.68, 1.38);
    var rightPlumeMul = clamp(1 - bankForFlame * 0.35, 0.68, 1.38);
    var centerPlumeMul = 1 + Math.abs(bankForFlame) * 0.12;
    var forwardBoost = Math.max(0, -vyN);
    var flame = 12 + speedMag * 18 + (Math.sin(t*0.03) * 2.6) + forwardBoost * 16;
    flame *= ghostFlameBoost;
    flame *= hoverBoost;
    // Keep exhaust closer to the ship (and thus closer to the HUD area).
    var flameLengthScale = shipType === "mk7" ? 0.7 : 0.78;
    flame *= flameLengthScale;

    var bloom = 0.7 + speedMag * 0.75 + forwardBoost * 0.9 + (Math.sin(t * 0.02) * 0.12);
    bloom *= ghostFlameBoost;
    var flameWiggle = (Math.sin(t * 0.06) + Math.sin(t * 0.11 + 1.4)) * 0.6 * (0.6 + speedMag);
    var flameColor = colors.flame || "rgba(0,229,255,.35)";
    if(shipType === "spire") flameColor = "rgba(120,220,255,.9)";
    var flameWidthScale = 1.18 * (idleHover ? 1.15 : 1) * (1 + forwardBoost * 0.18);
    ctx.save();
    ctx.globalCompositeOperation = idleHover ? "lighter" : "source-over";
    ctx.translate(thrusterOffsetX, 0);
    ctx.scale(flameWidthScale, 1);
    ctx.translate(-thrusterOffsetX, 0);
    ctx.globalAlpha = baseAlpha * (0.98 + forwardBoost * 0.45) * flameAlphaMul;
    ctx.shadowColor = flameColor;
    ctx.shadowBlur = 28 + bloom * 18;
    var outerFlameGrad = ctx.createLinearGradient(0, thrusterBaseY - 1, 0, thrusterBaseY + flame * 1.28);
    outerFlameGrad.addColorStop(0.00, "rgba(0,0,0,0)");
    outerFlameGrad.addColorStop(0.18, colorWithAlpha(flameColor, 0.12));
    outerFlameGrad.addColorStop(0.62, colorWithAlpha(flameColor, 0.82));
    outerFlameGrad.addColorStop(1.00, colorWithAlpha(flameColor, 1.0));
    ctx.fillStyle = outerFlameGrad;
    ctx.beginPath();
    if(isSpire){
      ctx.moveTo(-6 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrusterOffsetX + flameWiggle, thrusterBaseY + flame * 1.1 * centerPlumeMul);
      ctx.lineTo(6 + thrusterOffsetX, thrusterBaseY);
    }else{
      ctx.moveTo(-thrSep - 6 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(-thrSep + thrusterOffsetX + flameWiggle, thrusterBaseY + flame * leftPlumeMul);
      ctx.lineTo(-thrSep + 6 + thrusterOffsetX, thrusterBaseY);
      ctx.moveTo(thrSep - 6 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrSep + thrusterOffsetX + flameWiggle, thrusterBaseY + flame * rightPlumeMul);
      ctx.lineTo(thrSep + 6 + thrusterOffsetX, thrusterBaseY);
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (0.32 + forwardBoost * 0.3) * flameAlphaMul;
    var midFlameGrad = ctx.createLinearGradient(0, thrusterBaseY - 1, 0, thrusterBaseY + flame * 1.22);
    midFlameGrad.addColorStop(0.00, "rgba(0,0,0,0)");
    midFlameGrad.addColorStop(0.24, "rgba(200,255,255,.18)");
    midFlameGrad.addColorStop(0.68, "rgba(200,255,255,.72)");
    midFlameGrad.addColorStop(1.00, "rgba(200,255,255,.98)");
    ctx.fillStyle = midFlameGrad;
    ctx.beginPath();
    if(isSpire){
      ctx.moveTo(-10 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrusterOffsetX + flameWiggle, thrusterBaseY + flame * 1.22 * centerPlumeMul);
      ctx.lineTo(10 + thrusterOffsetX, thrusterBaseY);
    }else{
      ctx.moveTo(-thrSep - 12 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(-thrSep + thrusterOffsetX + flameWiggle, thrusterBaseY + flame * 1.18 * leftPlumeMul);
      ctx.lineTo(-thrSep + 2 + thrusterOffsetX, thrusterBaseY);
      ctx.moveTo(thrSep - 2 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrSep + thrusterOffsetX + flameWiggle, thrusterBaseY + flame * 1.18 * rightPlumeMul);
      ctx.lineTo(thrSep + 12 + thrusterOffsetX, thrusterBaseY);
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = baseAlpha * 0.9 * flameAlphaMul;
    var innerFlameGrad = ctx.createLinearGradient(0, thrusterBaseY - 2, 0, thrusterBaseY + flame * 0.9);
    innerFlameGrad.addColorStop(0.00, "rgba(0,0,0,0)");
    innerFlameGrad.addColorStop(0.28, "rgba(220,255,255,.2)");
    innerFlameGrad.addColorStop(0.75, "rgba(220,255,255,.8)");
    innerFlameGrad.addColorStop(1.00, "rgba(220,255,255,.98)");
    ctx.fillStyle = innerFlameGrad;
    ctx.beginPath();
    if(isSpire){
      ctx.moveTo(-4 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrusterOffsetX + flameWiggle * 0.6, thrusterBaseY + flame * 0.8 * centerPlumeMul);
      ctx.lineTo(4 + thrusterOffsetX, thrusterBaseY);
    }else{
      ctx.moveTo(-thrSep - 3 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(-thrSep + thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY + flame * 0.7 * leftPlumeMul);
      ctx.lineTo(-thrSep + 3 + thrusterOffsetX, thrusterBaseY);
      ctx.moveTo(thrSep - 3 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrSep + thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY + flame * 0.7 * rightPlumeMul);
      ctx.lineTo(thrSep + 3 + thrusterOffsetX, thrusterBaseY);
    }
    ctx.closePath();
    ctx.fill();
    if(isAm2){
      ctx.globalAlpha = baseAlpha * 0.75 * flameAlphaMul;
      ctx.fillStyle = colors.flame || "rgba(120,220,255,.9)";
      ctx.beginPath();
      ctx.moveTo(-3 + thrusterOffsetX, thrusterBaseY - 2);
      ctx.lineTo(thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY - 2 + flame * 0.9 * centerPlumeMul);
      ctx.lineTo(3 + thrusterOffsetX, thrusterBaseY - 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }else if(useShipSprite){
    var flameAlphaMul = 0.48 * hoverBoost;
    var bankForFlame = clamp(bank, -1, 1);
    var leftPlumeMul = clamp(1 + bankForFlame * 0.35, 0.68, 1.38);
    var rightPlumeMul = clamp(1 - bankForFlame * 0.35, 0.68, 1.38);
    var centerPlumeMul = 1 + Math.abs(bankForFlame) * 0.12;
    var forwardBoost = Math.max(0, -vyN);
    var flame = 12 + speedMag * 18 + (Math.sin(t*0.03) * 2.6) + forwardBoost * 16;
    flame *= ghostFlameBoost;
    flame *= hoverBoost;
    var bloom = 0.7 + speedMag * 0.75 + forwardBoost * 0.9 + (Math.sin(t * 0.02) * 0.12);
    bloom *= ghostFlameBoost;
    var flameWiggle = (Math.sin(t * 0.06) + Math.sin(t * 0.11 + 1.4)) * 0.6 * (0.6 + speedMag);
    var flameProfiles = {
      spire: {
        flameColor: "rgba(120,220,255,.9)",
        flameCore: "rgba(190,255,255,.92)",
        baseYOffset: -1,
        nozzleOffsets: [0],
        nozzleWidth: 7.2,
        plumeLengthMul: 1.18,
        nozzleLengthScale: [1.22]
      },
      am2: {
        flameColor: "rgba(115,220,255,.9)",
        flameCore: "rgba(195,255,255,.92)",
        baseYOffset: -1,
        nozzleOffsets: [-14, 0, 14],
        nozzleWidth: 6.0,
        plumeLengthMul: 1.0,
        nozzleLengthScale: [0.72, 1.26, 0.72]
      },
      classic: {
        flameColor: "rgba(255,130,52,.92)",
        flameCore: "rgba(255,220,165,.92)",
        baseYOffset: 0,
        nozzleOffsets: [-13, 13],
        nozzleWidth: 6.8,
        plumeLengthMul: 1.08,
        nozzleLengthScale: [1.02, 1.02]
      },
      fizard: {
        flameColor: "rgba(255,130,52,.92)",
        flameCore: "rgba(255,220,165,.92)",
        baseYOffset: -1,
        nozzleOffsets: [-11, 11],
        nozzleWidth: 6.4,
        plumeLengthMul: 1.0,
        nozzleLengthScale: [0.96, 0.96]
      },
      mk7: {
        flameColor: "rgba(255,186,86,.9)",
        flameCore: "rgba(255,236,162,.92)",
        baseYOffset: -1,
        nozzleOffsets: [-10, 10],
        nozzleWidth: 6.3,
        plumeLengthMul: 0.98,
        nozzleLengthScale: [0.9, 0.9]
      },
      bu2x: {
        flameColor: "rgba(80,255,160,.92)",
        flameCore: "rgba(190,255,220,.95)",
        baseYOffset: -1,
        nozzleOffsets: [-12, 12],
        nozzleWidth: 6.6,
        plumeLengthMul: 1.05,
        nozzleLengthScale: [0.98, 0.98]
      },
      ember: {
        flameColor: "rgba(220,230,235,.92)",
        flameCore: "rgba(255,255,255,.98)",
        baseYOffset: -1,
        nozzleOffsets: [-12, 12],
        nozzleWidth: 6.6,
        plumeLengthMul: 1.02,
        nozzleLengthScale: [0.98, 0.98]
      },
      azure: {
        flameColor: "rgba(220,230,235,.92)",
        flameCore: "rgba(255,255,255,.98)",
        baseYOffset: -1,
        nozzleOffsets: [-12, 12],
        nozzleWidth: 6.6,
        plumeLengthMul: 1.02,
        nozzleLengthScale: [0.98, 0.98]
      },
      cyan: {
        flameColor: "rgba(255,130,52,.92)",
        flameCore: "rgba(255,220,165,.92)",
        baseYOffset: -1,
        nozzleOffsets: [-12, 12],
        nozzleWidth: 6.6,
        plumeLengthMul: 1.02,
        nozzleLengthScale: [0.98, 0.98]
      },
      veloz: {
        flameColor: "rgba(255,130,52,.92)",
        flameCore: "rgba(255,220,165,.92)",
        baseYOffset: -1,
        nozzleOffsets: [-12, 12],
        nozzleWidth: 6.6,
        plumeLengthMul: 1.02,
        nozzleLengthScale: [0.98, 0.98]
      },
      verde9: {
        flameColor: "rgba(80,255,160,.92)",
        flameCore: "rgba(190,255,220,.95)",
        baseYOffset: -1,
        nozzleOffsets: [-12, 12],
        nozzleWidth: 6.6,
        plumeLengthMul: 1.02,
        nozzleLengthScale: [0.98, 0.98]
      },
      mantas: {
        flameColor: "rgba(170,90,255,.92)",
        flameCore: "rgba(220,190,255,.96)",
        baseYOffset: -1,
        nozzleOffsets: [-12, 12],
        nozzleWidth: 6.6,
        plumeLengthMul: 1.02,
        nozzleLengthScale: [0.98, 0.98]
      },
      whiteflame8: {
        flameColor: "rgba(255,70,60,.95)",
        flameCore: "rgba(90,200,255,.95)",
        baseYOffset: -1,
        nozzleOffsets: [-12, 12],
        nozzleWidth: 6.6,
        plumeLengthMul: 1.02,
        nozzleLengthScale: [0.98, 0.98]
      }
    };
    var fp = flameProfiles[shipType] || {
      flameColor: "rgba(120,220,255,.9)",
      flameCore: "rgba(180,255,255,.9)",
      baseYOffset: 0,
      nozzleOffsets: [-12, 12],
      nozzleWidth: 6.5,
      plumeLengthMul: 1.02,
      nozzleLengthScale: null
    };
    var flameColor = fp.flameColor;
    var flameCore = fp.flameCore;
    var baseY = 20 + thrusterOffsetY + fp.baseYOffset;
    var nozzleOffsets = fp.nozzleOffsets;
    var plumeWidthScale = 1.18 * (idleHover ? 1.15 : 1) * (1 + forwardBoost * 0.18);
    var plumeLengthScale = 0.86 * (idleHover ? 1.15 : 1);
    var nozzleWidth = fp.nozzleWidth * plumeWidthScale;
    var plumeLengthMul = fp.plumeLengthMul * plumeLengthScale;
    var nozzleLengthScale = fp.nozzleLengthScale;

    var plumeLen = flame * plumeLengthMul;
    ctx.save();
    ctx.globalCompositeOperation = idleHover ? "lighter" : "source-over";
    ctx.globalAlpha = baseAlpha * (0.3 + bloom * 0.3) * flameAlphaMul;
    ctx.fillStyle = flameColor;
    ctx.shadowColor = flameColor;
    ctx.shadowBlur = 30 + bloom * 20;
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = baseAlpha * (0.98 + forwardBoost * 0.45) * flameAlphaMul;
    var plumeOuterGrad = ctx.createLinearGradient(0, baseY - 1, 0, baseY + plumeLen * 1.25);
    plumeOuterGrad.addColorStop(0.00, "rgba(0,0,0,0)");
    plumeOuterGrad.addColorStop(0.2, "rgba(170,245,255,.12)");
    plumeOuterGrad.addColorStop(0.65, colorWithAlpha(flameColor, 0.72));
    plumeOuterGrad.addColorStop(1.00, colorWithAlpha(flameColor, 0.95));
    ctx.fillStyle = plumeOuterGrad;
    ctx.beginPath();
    for(var ni=0; ni<nozzleOffsets.length; ni++){
      var ox = nozzleOffsets[ni];
      var lenScale = nozzleLengthScale ? (nozzleLengthScale[ni] || 1) : 1;
      if(ox < -1) lenScale *= leftPlumeMul;
      else if(ox > 1) lenScale *= rightPlumeMul;
      else lenScale *= centerPlumeMul;
      ctx.moveTo(ox - nozzleWidth + thrusterOffsetX, baseY);
      ctx.lineTo(ox + thrusterOffsetX + flameWiggle, baseY + plumeLen * lenScale);
      ctx.lineTo(ox + nozzleWidth + thrusterOffsetX, baseY);
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (0.6 + forwardBoost * 0.25) * flameAlphaMul;
    var plumeCoreGrad = ctx.createLinearGradient(0, baseY - 2, 0, baseY + plumeLen);
    plumeCoreGrad.addColorStop(0.00, "rgba(0,0,0,0)");
    plumeCoreGrad.addColorStop(0.28, "rgba(215,255,255,.22)");
    plumeCoreGrad.addColorStop(0.72, colorWithAlpha(flameCore, 0.76));
    plumeCoreGrad.addColorStop(1.00, colorWithAlpha(flameCore, 0.98));
    ctx.fillStyle = plumeCoreGrad;
    ctx.beginPath();
    for(var nj=0; nj<nozzleOffsets.length; nj++){
      var ox2 = nozzleOffsets[nj];
      var lenScale2 = nozzleLengthScale ? (nozzleLengthScale[nj] || 1) : 1;
      if(ox2 < -1) lenScale2 *= leftPlumeMul;
      else if(ox2 > 1) lenScale2 *= rightPlumeMul;
      else lenScale2 *= centerPlumeMul;
      ctx.moveTo(ox2 - nozzleWidth * 0.55 + thrusterOffsetX, baseY);
      ctx.lineTo(ox2 + thrusterOffsetX + flameWiggle * 0.6, baseY + plumeLen * 0.82 * lenScale2);
      ctx.lineTo(ox2 + nozzleWidth * 0.55 + thrusterOffsetX, baseY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

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
if(toggleTouchControls){
  toggleTouchControls.addEventListener("change", function(){
    playSfx(state, "menu_beep");
    setTouchControlsEnabled(toggleTouchControls.checked);
  });
}

function getCompassTarget(){
  if(state.correctAsteroidId){
    for(var i=0; i<asteroids.length; i++){
      var a = asteroids[i];
      if(a.id === state.correctAsteroidId) return a;
    }
  }
  for(var j=0; j<asteroids.length; j++){
    var a2 = asteroids[j];
    if(a2.isCorrect && a2.waveId === state.waveId) return a2;
  }
  return null;
}

function drawCompassArrow(){
  if(player.hidden) return;
  var target = getCompassTarget();
  if(!target) return;
  var dx = target.x - player.x;
  var dy = target.y - player.y;
  var ang = Math.atan2(dy, dx);
  var baseX = player.x;
  var baseY = player.y + 28;
  var len = 18;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.translate(baseX, baseY);
  ctx.rotate(ang);
  ctx.fillStyle = "rgba(0,229,255,.9)";
  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(-8, -6);
  ctx.lineTo(-8, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
if(keybindButtons && keybindButtons.length){
  keybindButtons.forEach(function(btn){
    btn.addEventListener("click", function(){
      var action = btn.getAttribute("data-bind");
      if(!action) return;
      keybindCapture = action;
      updateKeybindButtons();
      showToast("PRESS A KEY TO BIND");
    });
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
      if(!handleEndNameConfirm()){
        saveScoreName(endNameInput.value);
        showToast("NAME SAVED");
        playSfx(state, "menu_beep");
      }
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
  if(!select.options || !select.options.length) return false;
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
  if(config.operation != null){
    state.operation = String(config.operation);
  }else{
    var modeHint = String((config.questionMode != null ? config.questionMode : (inputs.questionMode ? inputs.questionMode.value : state.questionMode)) || "");
    if(modeHint.indexOf("add_") === 0) state.operation = "add";
    else if(modeHint.indexOf("square_") === 0) state.operation = "square";
    else if(modeHint.indexOf("rational_") === 0) state.operation = "rational";
    else state.operation = "mul";
  }
  if(state.operation === "add"){
    if(inputs.questionMode && inputs.questionMode.value === "factor2") inputs.questionMode.value = "add_factor2";
    if(inputs.questionMode && inputs.questionMode.value === "factor3") inputs.questionMode.value = "add_factor3";
    if(state.questionMode === "factor2") state.questionMode = "add_factor2";
    if(state.questionMode === "factor3") state.questionMode = "add_factor3";
  }else if(state.operation === "mul"){
    if(inputs.questionMode && inputs.questionMode.value === "add_factor2") inputs.questionMode.value = "factor2";
    if(inputs.questionMode && inputs.questionMode.value === "add_factor3") inputs.questionMode.value = "factor3";
    if(state.questionMode === "add_factor2") state.questionMode = "factor2";
    if(state.questionMode === "add_factor3") state.questionMode = "factor3";
  }
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
  if(config.shotType != null && inputs.shotType){
    inputs.shotType.value = String(config.shotType);
  }
  if(config.belt){
    setBackgroundBelt(config.belt);
  }
  if(config.alienSwarm != null){
    state.alienSwarm = (config.alienSwarm === true || config.alienSwarm === "1" || config.alienSwarm === 1);
  }else{
    state.alienSwarm = false;
  }
  if(config.stampede != null){
    state.stampedeMode = (config.stampede === true || config.stampede === "1" || config.stampede === 1);
    if(inputs.stampedeMode) inputs.stampedeMode.checked = !!state.stampedeMode;
  }else{
    state.stampedeMode = false;
    if(inputs.stampedeMode) inputs.stampedeMode.checked = false;
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
    operation: params.get("operation"),
    shotType: params.get("shotType"),
    ship: params.get("ship"),
    difficulty: params.get("difficulty"),
    belt: params.get("belt"),
    alienSwarm: params.get("alienSwarm"),
    stampede: params.get("stampede")
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

function syncSandboxAlienWaveButton(){
  if(!sandboxAlienWaveButton) return;
  sandboxAlienWaveButton.classList.toggle("active", !!(state.sandboxAlienWave || state.sandboxAlienWaveActive));
}

function startSandboxAlienWave(){
  state.sandboxAlienWave = true;
  state.sandboxAlienWaveActive = true;
  state.sandboxAlienWaveRemaining = sandboxAlienWaveDuration;
  state.sandboxAlienWaveQueued = 0;
  setSandboxQuestionHidden(true);
  asteroids.length = 0;
  resetAliens();
  setAlienUnlocked(true);
  configureAliensDifficulty();
  syncSandboxAlienWaveButton();
  showToast("ALIEN WAVE STARTED");
}

function queueSandboxAlienWave(){
  state.sandboxAlienWave = true;
  state.sandboxAlienWaveActive = false;
  state.sandboxAlienWaveRemaining = 0;
  state.sandboxAlienWaveQueued = 0;
  setSandboxQuestionHidden(false);
  syncSandboxAlienWaveButton();
  showToast("ALIEN WAVE QUEUED");
  showToast("ANSWER 2 QUESTIONS");
}

function stopSandboxAlienWave(){
  state.sandboxAlienWave = false;
  state.sandboxAlienWaveActive = false;
  state.sandboxAlienWaveRemaining = 0;
  state.sandboxAlienWaveQueued = 0;
  setSandboxQuestionHidden(false);
  resetAliens();
  configureAliensDifficulty();
  syncSandboxAlienWaveButton();
  showToast("ALIEN WAVE ENDED");
}

function toggleSandboxAlienWave(){
  if(state.sandboxAlienWaveActive || state.sandboxAlienWave){
    stopSandboxAlienWave();
  }else{
    queueSandboxAlienWave();
  }
}

function initSandboxPanel(){
  if(!document.body || sandboxPanel) return;
  try{
    var raw = localStorage.getItem(sandboxSectionsKey);
    if(raw){
      var parsed = JSON.parse(raw);
      if(parsed && typeof parsed === "object"){
        sandboxSectionsState = parsed;
      }
    }
  }catch(e){}
  var styleId = "sandboxPanelStyles";
  if(!document.getElementById(styleId)){
    var style = document.createElement("style");
    style.id = styleId;
    style.textContent = ".sandboxPanel{position:fixed;top:90px;left:16px;z-index:45;width:min(460px,calc(100vw - 32px));max-height:calc(100vh - 112px);overflow:auto;background:rgba(6,10,18,.88);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:12px 14px;box-shadow:0 24px 60px rgba(0,0,0,.45);}"+
      ".sandboxPanel .sandboxHeader{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}"+
      ".sandboxPanel h4{margin:0;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:rgba(232,236,255,.8);}"+
      ".sandboxPanel .sandboxToggle{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e8ecff;border-radius:10px;padding:4px 8px;font-size:10px;letter-spacing:.6px;text-transform:uppercase;cursor:pointer;}"+
      ".sandboxPanel.collapsed .sandboxBody{display:none;}"+
      ".sandboxPanel .sandboxSectionTools{display:flex;gap:8px;margin-bottom:8px;}"+
      ".sandboxPanel .sandboxSectionTools .sandboxToggle{flex:1;}"+
      ".sandboxPanel .sandboxGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}"+
      ".sandboxPanel .sandboxGroup{margin:0;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);border-radius:12px;padding:8px;}"+
      ".sandboxPanel .sandboxGroupHeader{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;}"+
      ".sandboxPanel .sandboxGroupTitle{font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:rgba(232,236,255,.78);}"+
      ".sandboxPanel .sandboxGroupToggle{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e8ecff;border-radius:8px;padding:2px 6px;font-size:10px;cursor:pointer;}"+
      ".sandboxPanel .sandboxGroup.collapsed .sandboxGroupBody{display:none;}"+
      ".sandboxPanel .sandboxButtons{display:flex;flex-wrap:wrap;gap:6px;}"+
      ".sandboxPanel .sandboxBtn{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e8ecff;border-radius:10px;padding:6px 8px;font-size:11px;letter-spacing:.6px;text-transform:uppercase;cursor:pointer;}"+
      ".sandboxPanel .sandboxBtn.active{border-color:rgba(0,229,255,.6);box-shadow:0 0 0 1px rgba(0,229,255,.25) inset;}"+
      ".sandboxPanel .sandboxBtn:hover{transform:translateY(-1px);border-color:rgba(0,229,255,.6);box-shadow:0 8px 18px rgba(0,0,0,.25);}"+
      ".sandboxPanel .sandboxNote{font-size:11px;color:rgba(232,236,255,.55);margin:6px 0 4px;}"+
      "@media (max-width: 960px){.sandboxPanel{top:78px;left:10px;width:min(420px,calc(100vw - 20px));max-height:calc(100vh - 96px);}.sandboxPanel .sandboxGrid{grid-template-columns:1fr;}}";
    document.head.appendChild(style);
  }

  sandboxPanel = document.createElement("div");
  sandboxPanel.className = "sandboxPanel";
  sandboxPanel.innerHTML = ""
    + "<div class='sandboxHeader'><h4>Sandbox</h4><button class='sandboxToggle' id='sandboxToggle' type='button'>Hide</button></div>"
    + "<div class='sandboxBody'>"
    + "<div class='sandboxSectionTools'><button class='sandboxToggle' id='sandboxExpandAll' type='button'>Expand All</button><button class='sandboxToggle' id='sandboxCollapseAll' type='button'>Collapse All</button></div>"
    + "<div class='sandboxGrid'>"
    + "<div class='sandboxGroup' data-section='session'><div class='sandboxGroupHeader'><div class='sandboxGroupTitle'>Session</div><button class='sandboxGroupToggle' data-section-toggle='session' type='button'>-</button></div><div class='sandboxGroupBody'><div class='sandboxButtons' id='sandboxActionsSession'></div></div></div>"
    + "<div class='sandboxGroup' data-section='multiplayer'><div class='sandboxGroupHeader'><div class='sandboxGroupTitle'>Multiplayer</div><button class='sandboxGroupToggle' data-section-toggle='multiplayer' type='button'>-</button></div><div class='sandboxGroupBody'><div class='sandboxButtons' id='sandboxMultiplayer'></div><div class='sandboxButtons' id='sandboxMultiplayerMode'></div></div></div>"
    + "<div class='sandboxGroup' data-section='operation'><div class='sandboxGroupHeader'><div class='sandboxGroupTitle'>Operation</div><button class='sandboxGroupToggle' data-section-toggle='operation' type='button'>-</button></div><div class='sandboxGroupBody'><div class='sandboxButtons' id='sandboxOperations'></div><div class='sandboxNote'>Modes: Multiplication</div><div class='sandboxButtons' id='sandboxModesMul'></div><div class='sandboxNote'>Modes: Addition</div><div class='sandboxButtons' id='sandboxModesAdd'></div><div class='sandboxNote'>Modes: Squares</div><div class='sandboxButtons' id='sandboxModesSquare'></div><div class='sandboxNote'>Modes: Rationals</div><div class='sandboxButtons' id='sandboxModesRational'></div></div></div>"
    + "<div class='sandboxGroup' data-section='loadout'><div class='sandboxGroupHeader'><div class='sandboxGroupTitle'>Loadout</div><button class='sandboxGroupToggle' data-section-toggle='loadout' type='button'>-</button></div><div class='sandboxGroupBody'><div class='sandboxNote'>Shot Types</div><div class='sandboxButtons' id='sandboxShots'></div><div class='sandboxNote'>Defense</div><div class='sandboxButtons' id='sandboxDefense'></div><div class='sandboxNote'>Secondary</div><div class='sandboxButtons' id='sandboxSecondary'></div></div></div>"
    + "<div class='sandboxGroup' data-section='cosmetics'><div class='sandboxGroupHeader'><div class='sandboxGroupTitle'>Cosmetics</div><button class='sandboxGroupToggle' data-section-toggle='cosmetics' type='button'>-</button></div><div class='sandboxGroupBody'><div class='sandboxNote'>Ships</div><div class='sandboxButtons' id='sandboxShips'></div><div class='sandboxNote'>Clusters</div><div class='sandboxButtons' id='sandboxBelts'></div></div></div>"
    + "<div class='sandboxGroup' data-section='experimental'><div class='sandboxGroupHeader'><div class='sandboxGroupTitle'>Experimental</div><button class='sandboxGroupToggle' data-section-toggle='experimental' type='button'>-</button></div><div class='sandboxGroupBody'><div class='sandboxButtons' id='sandboxActionsExperimental'></div></div></div>"
    + "</div>"
    + "</div>";
  document.body.appendChild(sandboxPanel);
  var sandboxToggleBtn = sandboxPanel.querySelector("#sandboxToggle");
  if(sandboxToggleBtn){
    sandboxToggleBtn.addEventListener("click", function(){
      sandboxPanel.classList.toggle("collapsed");
      var isCollapsed = sandboxPanel.classList.contains("collapsed");
      sandboxToggleBtn.textContent = isCollapsed ? "Show" : "Hide";
      playSfx(state, "menu_beep");
    });
  }
  function saveSandboxSectionsState(){
    try{ localStorage.setItem(sandboxSectionsKey, JSON.stringify(sandboxSectionsState)); }catch(e){}
  }
  function setSandboxSectionOpen(sectionId, isOpen){
    var group = sandboxPanel.querySelector(".sandboxGroup[data-section='" + sectionId + "']");
    if(!group) return;
    var open = !!isOpen;
    group.classList.toggle("collapsed", !open);
    var toggleBtn = group.querySelector("[data-section-toggle='" + sectionId + "']");
    if(toggleBtn) toggleBtn.textContent = open ? "-" : "+";
    sandboxSectionsState[sectionId] = open;
  }
  var sectionDefaults = {
    session: true,
    multiplayer: false,
    operation: true,
    loadout: true,
    cosmetics: false,
    experimental: false
  };
  Object.keys(sectionDefaults).forEach(function(sectionId){
    var open = (sandboxSectionsState[sectionId] != null) ? !!sandboxSectionsState[sectionId] : !!sectionDefaults[sectionId];
    setSandboxSectionOpen(sectionId, open);
    var sectionBtn = sandboxPanel.querySelector("[data-section-toggle='" + sectionId + "']");
    if(sectionBtn){
      sectionBtn.addEventListener("click", function(){
        playSfx(state, "menu_beep");
        var isOpen = !sandboxPanel.querySelector(".sandboxGroup[data-section='" + sectionId + "']").classList.contains("collapsed");
        setSandboxSectionOpen(sectionId, !isOpen);
        saveSandboxSectionsState();
      });
    }
  });
  var expandAllBtn = sandboxPanel.querySelector("#sandboxExpandAll");
  if(expandAllBtn){
    expandAllBtn.addEventListener("click", function(){
      playSfx(state, "menu_beep");
      Object.keys(sectionDefaults).forEach(function(sectionId){ setSandboxSectionOpen(sectionId, true); });
      saveSandboxSectionsState();
    });
  }
  var collapseAllBtn = sandboxPanel.querySelector("#sandboxCollapseAll");
  if(collapseAllBtn){
    collapseAllBtn.addEventListener("click", function(){
      playSfx(state, "menu_beep");
      Object.keys(sectionDefaults).forEach(function(sectionId){ setSandboxSectionOpen(sectionId, false); });
      saveSandboxSectionsState();
    });
  }
  saveSandboxSectionsState();

  function addButton(container, label, onClick){
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sandboxBtn";
    btn.textContent = label;
    btn.addEventListener("click", function(){
      playSfx(state, "menu_beep");
      onClick();
    });
    container.appendChild(btn);
    return btn;
  }

  function setSandboxShot(type){
    player.blasterMode = type;
    if(type === "single"){
      player.blasterHitsRemaining = 0;
    }else{
      player.blasterHitsRemaining = 9999;
      player.blasterTimer = 0;
    }
    showToast("SHOT -> " + type.toUpperCase());
  }

function setSandboxShip(type){
  player.shipType = String(type || "mk7");
  if(inputs.ship) inputs.ship.value = player.shipType;
  showToast("SHIP -> " + String(player.shipType).toUpperCase());
}

  function setSandboxBelt(key){
    setBackgroundBelt(key);
    showToast("CLUSTER -> " + String(key || "dusk").toUpperCase());
  }

  function updateSandboxToggle(btn, active){
    if(!btn) return;
    btn.classList.toggle("active", !!active);
  }
  function setSandboxButtonEnabled(btn, enabled){
    if(!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? "1" : "0.45";
    btn.style.pointerEvents = enabled ? "auto" : "none";
  }

  function spawnSandboxTarget(){
    if(!state.running || state.paused || state.over) return;
    state.waveId += 1;
    state.correctInPlay = false;
    state.correctAsteroidId = 0;
    spawnAsteroid(state.answer, true);
    showToast("TARGET SPAWNED");
  }

  var actionsContainer = sandboxPanel.querySelector("#sandboxActionsSession");
  var experimentalContainer = sandboxPanel.querySelector("#sandboxActionsExperimental");
  var multiplayerContainer = sandboxPanel.querySelector("#sandboxMultiplayer");
  var multiplayerModeContainer = sandboxPanel.querySelector("#sandboxMultiplayerMode");
  var btnSpawnTarget = null;
  var btnInfLives = null;
  var btnNoScore = null;
  var btnReset = null;
  var btnSpawnToggle = null;
  var btnStampede = null;
  var btnAlienWave = null;
  var btnGamepad = null;
  var btnTwoPilots = null;
  var btnSharedArena = null;
  var btnSplitArena = null;
  if(actionsContainer){
    btnSpawnTarget = addButton(actionsContainer, "Spawn Target", spawnSandboxTarget);
    btnInfLives = addButton(actionsContainer, "Infinite Lives", function(){
      state.sandboxInfiniteLives = !state.sandboxInfiniteLives;
      updateSandboxToggle(btnInfLives, state.sandboxInfiniteLives);
      showToast(state.sandboxInfiniteLives ? "INFINITE LIVES ON" : "INFINITE LIVES OFF");
    });
    btnNoScore = addButton(actionsContainer, "No Score", function(){
      state.sandboxNoScore = !state.sandboxNoScore;
      updateSandboxToggle(btnNoScore, state.sandboxNoScore);
      showToast(state.sandboxNoScore ? "SCORE LOCKED" : "SCORE ACTIVE");
    });
    btnSpawnToggle = addButton(actionsContainer, "Asteroids On", function(){
      state.sandboxSpawnAsteroids = !state.sandboxSpawnAsteroids;
      updateSandboxToggle(btnSpawnToggle, state.sandboxSpawnAsteroids);
      btnSpawnToggle.textContent = state.sandboxSpawnAsteroids ? "Asteroids On" : "Asteroids Off";
      showToast(state.sandboxSpawnAsteroids ? "ASTEROIDS ON" : "ASTEROIDS OFF");
    });
    btnStampede = addButton(actionsContainer, "Stampede", function(){
      state.stampedeMode = !state.stampedeMode;
      updateSandboxToggle(btnStampede, state.stampedeMode);
      showToast(state.stampedeMode ? "STAMPEDE ON" : "STAMPEDE OFF");
    });
    btnReset = addButton(actionsContainer, "Reset Run", function(){
      resetSession();
    });
  }
  if(experimentalContainer){
    btnAlienWave = addButton(experimentalContainer, "Alien Wave", function(){
      toggleSandboxAlienWave();
      updateSandboxToggle(btnAlienWave, !!(state.sandboxAlienWaveActive || state.sandboxAlienWave));
    });
    btnGamepad = addButton(experimentalContainer, "Gamepad Off", function(){
      cycleTouchControlsMode();
      updateSandboxGamepadButton();
    });
  }
  if(multiplayerContainer){
    btnTwoPilots = addButton(multiplayerContainer, "Two Pilots", function(){
      state.sandboxTwoPilots = !state.sandboxTwoPilots;
      if(state.sandboxMultiplayer){
        state.sandboxMultiplayer.enabled = state.sandboxTwoPilots;
      }
      sandboxMultiplayer.enabled = state.sandboxTwoPilots;
      if(state.sandboxTwoPilots){
        ensurePilot2();
        setPilot2MouseControl(true, true);
        pilot2.shipType = pickAlternateShipType(player.shipType);
        resetPilotStats(1);
        resetPilotStats(2);
        positionSandboxPilots();
      }
      updateSandboxToggle(btnTwoPilots, state.sandboxTwoPilots);
      setSandboxButtonEnabled(btnSharedArena, state.sandboxTwoPilots);
      setSandboxButtonEnabled(btnSplitArena, state.sandboxTwoPilots);
      showToast(state.sandboxTwoPilots ? "TWO PILOTS ON • PILOT 2 MOUSE ON" : "TWO PILOTS OFF");
    });
  }
  if(multiplayerModeContainer){
    btnSharedArena = addButton(multiplayerModeContainer, "Shared Arena", function(){
      if(!state.sandboxTwoPilots){
        state.sandboxTwoPilots = true;
        if(state.sandboxMultiplayer) state.sandboxMultiplayer.enabled = true;
        sandboxMultiplayer.enabled = true;
        ensurePilot2();
        setPilot2MouseControl(true, true);
        pilot2.shipType = pickAlternateShipType(player.shipType);
        resetPilotStats(1);
        resetPilotStats(2);
        positionSandboxPilots();
        updateSandboxToggle(btnTwoPilots, true);
      }
      state.sandboxTwoPilotsMode = "shared";
      if(state.sandboxMultiplayer) state.sandboxMultiplayer.mode = "shared";
      sandboxMultiplayer.mode = "shared";
      updateSandboxToggle(btnSharedArena, true);
      updateSandboxToggle(btnSplitArena, false);
      showToast("MODE -> SHARED ARENA");
    });
    btnSplitArena = addButton(multiplayerModeContainer, "Split Arena", function(){
      if(!state.sandboxTwoPilots){
        state.sandboxTwoPilots = true;
        if(state.sandboxMultiplayer) state.sandboxMultiplayer.enabled = true;
        sandboxMultiplayer.enabled = true;
        ensurePilot2();
        setPilot2MouseControl(true, true);
        pilot2.shipType = pickAlternateShipType(player.shipType);
        resetPilotStats(1);
        resetPilotStats(2);
        positionSandboxPilots();
        updateSandboxToggle(btnTwoPilots, true);
      }
      state.sandboxTwoPilotsMode = "split";
      if(state.sandboxMultiplayer) state.sandboxMultiplayer.mode = "split";
      sandboxMultiplayer.mode = "split";
      setSplitGameplay(isSandboxSplitMode());
      updateSandboxToggle(btnSplitArena, true);
      updateSandboxToggle(btnSharedArena, false);
      showToast("MODE -> SPLIT ARENA");
    });
  }

  function setSandboxQuestionMode(mode, operation){
    var modeLabel = String(mode || "");
    var info = describeQuestionMode(modeLabel);
    if(inputs.questionMode){
      var hasOption = false;
      var qmOptions = inputs.questionMode.options;
      if(qmOptions && qmOptions.length){
        for(var oi=0; oi<qmOptions.length; oi++){
          if(qmOptions[oi].value === modeLabel){
            hasOption = true;
            break;
          }
        }
      }
      if(!hasOption){
        var opt = document.createElement("option");
        opt.value = modeLabel;
        var label = info.operation + ": " + info.modeLabel;
        if(info.submode) label += " (" + info.submode + ")";
        opt.textContent = label.toUpperCase();
        inputs.questionMode.appendChild(opt);
      }
      inputs.questionMode.value = modeLabel;
    }
    state.questionMode = modeLabel;
    if(operation){
      state.operation = operation;
    }else{
      if(modeLabel.indexOf("add_") === 0) state.operation = "add";
      else if(modeLabel.indexOf("square_") === 0) state.operation = "square";
      else if(modeLabel.indexOf("rational_") === 0) state.operation = "rational";
      else state.operation = "mul";
    }
    applySettings();
    state.questionMode = modeLabel;
    resetSession();
    showToast("MODE -> " + info.operation.toUpperCase() + " / " + info.modeLabel.toUpperCase());
  }
  sandboxAlienWaveButton = btnAlienWave;
  sandboxGamepadButton = btnGamepad;

  function setSandboxOperation(op){
    var fallback = "classic";
    if(op === "add") fallback = "add_classic2";
    else if(op === "square") fallback = "square_shoot";
    else if(op === "rational") fallback = "rational_frac";
    setSandboxQuestionMode(fallback, op);
  }

  var opContainer = sandboxPanel.querySelector("#sandboxOperations");
  var modeMulContainer = sandboxPanel.querySelector("#sandboxModesMul");
  var modeAddContainer = sandboxPanel.querySelector("#sandboxModesAdd");
  var modeSquareContainer = sandboxPanel.querySelector("#sandboxModesSquare");
  var modeRationalContainer = sandboxPanel.querySelector("#sandboxModesRational");
  var opButtons = [];
  if(opContainer){
    [
      { id: "mul", label: "Multiplication" },
      { id: "add", label: "Addition" },
      { id: "square", label: "Squares" },
      { id: "rational", label: "Rationals" }
    ].forEach(function(info){
      var btn = addButton(opContainer, info.label, function(){
        setSandboxOperation(info.id);
        for(var i=0; i<opButtons.length; i++){
          updateSandboxToggle(opButtons[i].btn, opButtons[i].id === state.operation);
        }
      });
      opButtons.push({ id: info.id, btn: btn });
    });
  }

  function bindModeButtons(container, entries){
    if(!container) return [];
    var list = [];
    entries.forEach(function(entry){
      var btn = addButton(container, entry.label, function(){
        setSandboxQuestionMode(entry.mode, entry.operation);
        for(var i=0; i<list.length; i++){
          updateSandboxToggle(list[i].btn, list[i].mode === state.questionMode);
        }
      });
      list.push({ mode: entry.mode, btn: btn });
    });
    return list;
  }

  var modeButtons = []
    .concat(bindModeButtons(modeMulContainer, [
      { mode: "classic", label: "Classic 1x1", operation: "mul" },
      { mode: "classic2", label: "Classic 1x2", operation: "mul" },
      { mode: "classic3", label: "Classic 1x3", operation: "mul" },
      { mode: "digits2", label: "Digit Hunt 1x2", operation: "mul" },
      { mode: "digits3", label: "Digit Hunt 1x3", operation: "mul" },
      { mode: "factor2", label: "Factor Hunt 1x2", operation: "mul" },
      { mode: "factor3", label: "Factor Hunt 1x3", operation: "mul" },
      { mode: "stampede2", label: "Stampede 1x2", operation: "mul" },
      { mode: "stampede3", label: "Stampede 1x3", operation: "mul" },
      { mode: "divisors", label: "Divisors", operation: "mul" }
    ]))
    .concat(bindModeButtons(modeAddContainer, [
      { mode: "add_classic2", label: "Classic 1x2", operation: "add" },
      { mode: "add_classic3", label: "Classic 1x3", operation: "add" },
      { mode: "add_digits2", label: "Digit Hunt 1x2", operation: "add" },
      { mode: "add_digits3", label: "Digit Hunt 1x3", operation: "add" },
      { mode: "add_factor2", label: "Partial Sums 1x2", operation: "add" },
      { mode: "add_factor3", label: "Partial Sums 1x3", operation: "add" },
      { mode: "add_series3", label: "Series 3-term", operation: "add" },
      { mode: "add_series4", label: "Series 4-term", operation: "add" },
      { mode: "add_stampede2", label: "Stampede 1x2", operation: "add" },
      { mode: "add_stampede3", label: "Stampede 1x3", operation: "add" }
    ]))
    .concat(bindModeButtons(modeSquareContainer, [
      { mode: "square_shoot", label: "Perfect Squares", operation: "square" },
      { mode: "square_root", label: "Square Roots", operation: "square" }
    ]))
    .concat(bindModeButtons(modeRationalContainer, [
      { mode: "rational_frac", label: "Target Fraction", operation: "rational" },
      { mode: "rational_dec", label: "Target Decimal", operation: "rational" }
    ]));

  var shotContainer = sandboxPanel.querySelector("#sandboxShots");
  ["single","laser","fire","ice","electric","pierce","plasma","rail","missile"].forEach(function(type){
    addButton(shotContainer, type, function(){ setSandboxShot(type); });
  });

  var defContainer = sandboxPanel.querySelector("#sandboxDefense");
  addButton(defContainer, "shield", function(){ applyPowerup({ type: "shield", group: "defense" }); });
  addButton(defContainer, "armor", function(){ applyPowerup({ type: "armor", group: "defense" }); });

  var secContainer = sandboxPanel.querySelector("#sandboxSecondary");
  ["time","emp","magnet","lock","autofire","repair","scope"].forEach(function(type){
    addButton(secContainer, type, function(){ addSecondaryPowerup(type); showToast("SECONDARY + " + type.toUpperCase()); });
  });

  var shipContainer = sandboxPanel.querySelector("#sandboxShips");
  var shipButtons = [];
  [
    { id: "classic", label: "Classic" },
    { id: "spire", label: "Spire" },
    { id: "am2", label: "AM3" },
    { id: "mk7", label: "MK-7" },
    { id: "fizard", label: "Aurora" },
    { id: "ember", label: "Ruby" },
    { id: "azure", label: "Azure" },
    { id: "bu2x", label: "BU2X" },
    { id: "mantas", label: "Mantas" },
    { id: "cyan", label: "Cyan V7" },
    { id: "veloz", label: "Veloz" },
    { id: "verde9", label: "VER-DE-9" },
    { id: "whiteflame8", label: "White Flame 8" }
  ].forEach(function(info){
    var btn = addButton(shipContainer, info.label, function(){
      setSandboxShip(info.id);
      for(var i=0; i<shipButtons.length; i++){
        updateSandboxToggle(shipButtons[i].btn, shipButtons[i].id === player.shipType);
      }
    });
    shipButtons.push({ id: info.id, btn: btn });
  });

  var beltContainer = sandboxPanel.querySelector("#sandboxBelts");
  var beltButtons = [];
  [
    { id: "dusk", label: "Dusk" },
    { id: "ember", label: "Ember" },
    { id: "aurora", label: "Aurora" },
    { id: "rift", label: "Rift" },
    { id: "vega", label: "Vega" },
    { id: "void", label: "Void" }
  ].forEach(function(info){
    var btn = addButton(beltContainer, info.label, function(){
      setSandboxBelt(info.id);
      for(var i=0; i<beltButtons.length; i++){
        updateSandboxToggle(beltButtons[i].btn, beltButtons[i].id === beltKey);
      }
    });
    beltButtons.push({ id: info.id, btn: btn });
  });

  updateSandboxToggle(btnInfLives, state.sandboxInfiniteLives);
  updateSandboxToggle(btnNoScore, state.sandboxNoScore);
  updateSandboxToggle(btnSpawnToggle, state.sandboxSpawnAsteroids);
  updateSandboxToggle(btnAlienWave, !!(state.sandboxAlienWaveActive || state.sandboxAlienWave));
  updateSandboxGamepadButton();
  updateSandboxToggle(btnStampede, state.stampedeMode);
  updateSandboxToggle(btnTwoPilots, state.sandboxTwoPilots);
  updateSandboxToggle(btnSharedArena, state.sandboxTwoPilotsMode !== "split");
  updateSandboxToggle(btnSplitArena, state.sandboxTwoPilotsMode === "split");
  setSandboxButtonEnabled(btnSharedArena, state.sandboxTwoPilots);
  setSandboxButtonEnabled(btnSplitArena, state.sandboxTwoPilots);
  setSplitGameplay(isSandboxSplitMode());
  if(state.sandboxMultiplayer){
    state.sandboxMultiplayer.enabled = state.sandboxTwoPilots;
    state.sandboxMultiplayer.mode = state.sandboxTwoPilotsMode;
  }
  sandboxMultiplayer.enabled = state.sandboxTwoPilots;
  sandboxMultiplayer.mode = state.sandboxTwoPilotsMode;
  for(var ob=0; ob<opButtons.length; ob++){
    updateSandboxToggle(opButtons[ob].btn, opButtons[ob].id === state.operation);
  }
  for(var mb=0; mb<modeButtons.length; mb++){
    updateSandboxToggle(modeButtons[mb].btn, modeButtons[mb].mode === state.questionMode);
  }
  for(var sb=0; sb<shipButtons.length; sb++){
    updateSandboxToggle(shipButtons[sb].btn, shipButtons[sb].id === player.shipType);
  }
  for(var bb=0; bb<beltButtons.length; bb++){
    updateSandboxToggle(beltButtons[bb].btn, beltButtons[bb].id === beltKey);
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
  loadTouchControlsEnabled();
  loadMinerals();
  updateDecoyFunctionAvailability();
  primeFullscreen();

  var r = canvas.getBoundingClientRect();
  var centerY = view.hudH + (r.height - view.hudH) * 0.55;
  player.x = r.width / 2;
  player.y = centerY;

  syncHud();

  setTutorialQuestionHidden(false);
  tutorialPortalLock = false;
  tutorialPortalNotifyPending = false;

  var params = new URLSearchParams(location.search);
  sandboxMode = params.get("sandbox") === "1" || params.get("sandbox") === "true";
  state.sandbox = sandboxMode;
  state.sandboxSpawnAsteroids = true;
  state.sandboxAlienWave = false;
  state.sandboxAlienWaveActive = false;
  state.sandboxAlienWaveRemaining = 0;
  state.sandboxAlienWaveQueued = 0;
  setSandboxQuestionHidden(false);
  if(sandboxMode){
    initSandboxPanel();
  }
  tutorialActive = params.get("tutorial") === "1" || params.get("tutorial") === "true";
  if(tutorialActive){
    try{
      tutorialPowerupSpawned = false;
      tutorialAlienSpawned = false;
      tutorialSpawnUnlocked = false;
      tutorialPowerupUnlocked = false;
      tutorialAlienUnlocked = false;
      tutorialAlienDelayRemaining = 0;
      tutorialHullRecoveryShown = false;
      tutorialShootLocked = false;
      tutorialMineralsFreeze = false;
      tutorialFreezeDimAlpha = 0;
      tutorialFreezeDimTarget = 0;
      tutorialSecondChanceBusy = false;
      tutorialMineralsTarget = 0;
      tutorialMineralsCollected = 0;
      tutorialMineralsComplete = false;
      tutorialMineralsPending = false;
      tutorialMineralsRemaining = 0;
      tutorialPowerupBatchSpawned = false;
      tutorialExtraPowerupsSpawned = false;
      tutorialFreezeMousepadRestore = false;
      tutorialMovementPreference = null;
      tutorialPlatformChoiceResolved = false;
      tutorialPlatform = "desktop";
      tutorialPortalActive = false;
      tutorialPortalT = 0;
      tutorialPortalLock = false;
      tutorialPortalNotifyPending = false;
      setTutorialQuestionHidden(false);
      alienConfig.enabled = false;
      alienConfig.maxOnScreen = 0;
      if(inputs.ship) inputs.ship.value = "spire";
      if(inputs.shotType) inputs.shotType.value = "single";
      player.shipType = "spire";
      resetShotType();
      tourGuide = createTourGuide({
        gameShell: gameShell,
        state: state,
        player: player,
        onStep: function(stepId){
          tutorialStepId = stepId;
          if(stepId === "platform_choice"){
            tutorialPlatform = "desktop";
            tutorialMovementPreference = null;
            tutorialPlatformChoiceResolved = false;
            setTouchDockHidden(false);
            updateCursorVisibility();
          }else if(stepId === "move_arrows"){
            if(tutorialPlatform === "tablet"){
              tourGuide.jumpTo("tablet_move");
              return false;
            }
            startTutorialDots("arrows", "move_arrows");
          }else if(stepId === "move_wasd"){
            if(tutorialPlatform === "tablet"){
              tourGuide.jumpTo("fire_once");
              return false;
            }
            startTutorialDots("wasd", "move_wasd");
          }else if(stepId === "mousepad_hybrid"){
            if(tutorialPlatform === "tablet"){
              tourGuide.jumpTo("fire_once");
              return false;
            }
            startTutorialDots("hybrid", "mousepad_hybrid");
          }else if(stepId === "tablet_move"){
            if(tutorialPlatform !== "tablet"){
              tourGuide.jumpTo("fire_once");
              return false;
            }
            setTouchControlsEnabled(true);
            setTouchDockHidden(false);
            if(mousepadActive) setMousepadActive(false);
            startTutorialDots("touch", "move_touch");
          }else if(stepId === "movement_preference" && tutorialPlatform === "tablet"){
            tourGuide.jumpTo("fire_once");
            return false;
          }else if(tutorialDotsActive){
            stopTutorialDots();
          }
          if(stepId === "recovery_powerup"){
            tutorialRespawnActive = true;
            tutorialRespawnTargetY = view.hudH + (view.h - view.hudH) * 0.55;
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
          if(stepId === "minerals"){
            tutorialSpawnUnlocked = false;
            if(tutorialMineralsComplete || tutorialMineralsRemaining <= 0){
              tutorialMineralsPending = true;
            }
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
            tutorialSpawnUnlocked = false;
            asteroids.length = 0;
            state.correctInPlay = false;
            state.correctAsteroidId = 0;
            state.spawnTimer = 2.0;
            if(!(state.powerupsCollected > 0)){
              spawnPowerup("time", "secondary", player.x, -40, { pop: true, popScale: 0.9 });
            }
          }
          if(stepId === "secondary_slots"){
            tutorialSpawnUnlocked = false;
            asteroids.length = 0;
            state.correctInPlay = false;
            state.correctAsteroidId = 0;
            state.spawnTimer = 2.0;
            if(!tutorialExtraPowerupsSpawned){
              tutorialExtraPowerupsSpawned = true;
              if(!hasSecondaryType(player, "magnet")){
                spawnPowerup("magnet", "secondary", player.x - 70, -40, { pop: true, popScale: 0.9 });
              }
              if(!hasSecondaryType(player, "emp")){
                spawnPowerup("emp", "secondary", player.x + 70, -40, { pop: true, popScale: 0.9 });
              }
            }
          }
          if(stepId === "secondary_time"){
            tutorialShootLocked = true;
            selectTutorialSecondary("time");
            if(!tutorialPowerupBatchSpawned){
              tutorialPowerupBatchSpawned = true;
              setupTutorialPowerupField({ decoys: 6, answerY: view.hudH + 132, answerX: view.w * 0.62 });
            }
          }
          if(stepId === "secondary_emp"){
            tutorialShootLocked = true;
            selectTutorialSecondary("emp");
          }
          if(stepId === "secondary_magnet"){
            tutorialShootLocked = true;
            selectTutorialSecondary("magnet");
          }
          if(stepId === "correct_after_magnet"){
            tutorialShootLocked = false;
            tutorialSpawnUnlocked = false;
            state.spawnTimer = Math.max(state.spawnTimer || 0, 1.1);
            if(!state.correctInPlay){
              setupTutorialPowerupField({ decoys: 2, answerY: view.hudH + 142 });
            }
          }
          if(stepId === "ability_intro"){
            tutorialSpawnUnlocked = false;
          }
          if(stepId === "ability_clear"){
            tutorialShootLocked = false;
            setupTutorialPowerupField({ blocker: true, decoys: 3, answerY: view.hudH + 118, answerX: view.w * 0.52 });
          }
          if(stepId === "ability_shot"){
            tutorialSpawnUnlocked = false;
            state.spawnTimer = Math.max(state.spawnTimer || 0, 1.0);
            if(!state.correctInPlay){
              setupTutorialPowerupField({ decoys: 2, answerY: view.hudH + 128, answerX: view.w * 0.56 });
            }
          }
          if(stepId === "alien" && !tutorialAlienSpawned){
            tutorialAlienSpawned = true;
            tutorialAlienUnlocked = false;
            tutorialSpawnUnlocked = false;
            asteroids.length = 0;
            state.correctInPlay = false;
            state.correctAsteroidId = 0;
            state.spawnTimer = 2.0;
            tutorialAlienDelayRemaining = 2.2;
            alienConfig.enabled = true;
            alienConfig.maxOnScreen = Math.max(alienConfig.maxOnScreen || 0, 1);
          }
        },
        onConfirm: function(stepId){
          if(stepId === "minerals"){
            tutorialMineralsFreeze = false;
            tutorialFreezeDimTarget = 0;
            if(tutorialFreezeMousepadRestore && tutorialMovementPreference === "mouse"){
              setMousepadActive(true);
            }
            tutorialFreezeMousepadRestore = false;
            if(tutorialMineralsComplete || tutorialMineralsRemaining <= 0){
              tutorialMineralsPending = true;
            }
            updateCursorVisibility();
          }
        },
        onChoice: function(stepId, choice){
          if(stepId === "platform_choice"){
            var selectedPlatform = choice && choice.id ? String(choice.id) : "desktop";
            tutorialPlatform = selectedPlatform === "tablet" ? "tablet" : "desktop";
            tutorialPlatformChoiceResolved = true;
            if(tutorialPlatform === "tablet"){
              tutorialMovementPreference = "touch";
              setTouchControlsEnabled(true);
              setTouchDockHidden(false);
              if(mousepadActive) setMousepadActive(false);
            }else{
              tutorialMovementPreference = null;
              setTouchControlsEnabled(false);
              setTouchDockHidden(false);
              if(mousepadActive) setMousepadActive(false);
            }
            updateCursorVisibility();
            return;
          }
          if(stepId !== "movement_preference") return;
          tutorialMovementPreference = choice && choice.id ? String(choice.id) : "";
          if(tutorialMovementPreference === "mouse"){
            if(!mousepadActive) setMousepadActive(true);
          }else{
            if(mousepadActive) setMousepadActive(false);
          }
          updateCursorVisibility();
        },
        onComplete: function(){
          try{ localStorage.setItem("mentaris.tutorial.complete", "1"); }catch(e){}
          tutorialPortalActive = false;
          tutorialPortalLock = false;
          tutorialPortalNotifyPending = false;
          tutorialMineralsFreeze = false;
          tutorialFreezeDimTarget = 0;
          tutorialFreezeDimAlpha = 0;
      tutorialPowerupBatchSpawned = false;
      tutorialSecondChanceBusy = false;
      tutorialFreezeMousepadRestore = false;
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
      tutorialAlienDelayRemaining = 0;
      tutorialMineralsFreeze = false;
      tutorialFreezeDimTarget = 0;
      tutorialFreezeDimAlpha = 0;
      tutorialPowerupBatchSpawned = false;
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












