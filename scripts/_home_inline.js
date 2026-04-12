
    function persistSessionConfig(key, data) {
      try { sessionStorage.setItem(key, JSON.stringify(data)); } catch (err) { console.warn("Persist failed", err); }
      try { localStorage.setItem(key, JSON.stringify(data)); } catch (err) { /* ignore */ }
    }
    function loadSessionConfig(key, fallback) {
      if (fallback === undefined) fallback = {};
      try {
        var raw = null;
        try { raw = sessionStorage.getItem(key); } catch (err) { raw = null; }
        if(!raw){
          try { raw = localStorage.getItem(key); } catch (err) { raw = null; }
        }
        return raw ? Object.assign({}, fallback, JSON.parse(raw)) : fallback;
      } catch (err) {
        console.warn("Load failed", err);
        return fallback;
      }
    }

    var defaults = {
      aMin: 2,
      aMax: 12,
      bMin: 2,
      bMax: 12,
      decoys: 3,
      decoyFunction: "units_bias",
      speed: 0.9,
      lives: 10,
      difficulty: "normal",
      volume: 0.65,
      sfxVolume: 0.85,
      musicVolume: 0.6,
      strikes: 5,
      targetMode: "q15",
      timerMode: "off",
      questionMode: "digits3",
      sound: true,
      ship: "spire",
      belt: "dusk",
    };

    var campaignActiveKey = "mathsteroid.campaign.active";
    var campaignStateKeyBase = "mathsteroid.campaign.state.";
    var campaignDataKeyBase = "mathsteroid.campaign.data.";
    var campaignDataVersion = 4;
    var campaignMaxFailuresDefault = 3;
    var campaignDefaultId = "sector_run";
    var campaignSets = [
      {
        id: "sector_run",
        name: "Sector Run",
        desc: "Starter training across six sectors.",
        maxFailures: 3,
        missions: [
          {
            id: "m1",
            title: "Sector 1: Calibration",
            desc: "Digit hunt warm-up.",
            config: { ship: "spire", questionMode: "digits2", difficulty: "easy", targetMode: "q7", timerMode: "off", decoys: 3, speed: 0.7, lives: 10, strikes: 6, aMin: 2, aMax: 9, bMin: 2, bMax: 9 }
          },
          {
            id: "m2",
            title: "Sector 2: Drift Line",
            desc: "Faster digit hunt.",
            config: { ship: "classic", questionMode: "add_digits3", difficulty: "normal", targetMode: "q10", timerMode: "off", decoys: 3, speed: 0.8, lives: 10, strikes: 5, aMin: 2, aMax: 12, bMin: 2, bMax: 9 }
          },
          {
            id: "m3",
            title: "Sector 3: Classic Sweep",
            desc: "Classic answers under time.",
            config: { ship: "am2", questionMode: "classic2", difficulty: "normal", targetMode: "off", timerMode: "60", decoys: 3, decoyFunction: "units_bias", speed: 0.85, lives: 10, strikes: 4, aMin: 2, aMax: 12, bMin: 2, bMax: 12 }
          },
          {
            id: "m4",
            title: "Sector 4: Signal Storm",
            desc: "Addition digit hunt.",
            config: { questionMode: "add_digits2", difficulty: "hard", targetMode: "q10", timerMode: "off", decoys: 4, speed: 0.9, lives: 10, strikes: 3, aMin: 10, aMax: 99, bMin: 10, bMax: 99 }
          },
          {
            id: "m5",
            title: "Sector 5: Deep Cluster",
            desc: "Square memorization.",
            config: { questionMode: "square_shoot", difficulty: "hard", targetMode: "off", timerMode: "90", decoys: 4, decoyFunction: "structured", speed: 1.0, lives: 5, strikes: 3, aMin: 2, aMax: 12, bMin: 2, bMax: 12 }
          },
          {
            id: "m6",
            title: "Sector 6: Root Relay",
            desc: "Square root precision.",
            config: { questionMode: "square_root", difficulty: "hard", targetMode: "off", timerMode: "90", decoys: 4, decoyFunction: "structured", speed: 1.0, lives: 5, strikes: 3, aMin: 2, aMax: 12, bMin: 2, bMax: 12 }
          }
        ]
      },
      {
        id: "rift_assault",
        name: "Rift Assault",
        desc: "Higher speeds, tighter margins.",
        maxFailures: 3,
        missions: [
          {
            id: "r1",
            title: "Rift 1: Vector Burn",
            desc: "Rapid digit hunt.",
            config: { ship: "spire", questionMode: "digits3", difficulty: "normal", targetMode: "q10", timerMode: "off", decoys: 4, speed: 0.9, lives: 10, strikes: 5, aMin: 2, aMax: 9, bMin: 2, bMax: 9 }
          },
          {
            id: "r2",
            title: "Rift 2: Split Signal",
            desc: "Dense addition fields.",
            config: { ship: "classic", questionMode: "add_digits3", difficulty: "hard", targetMode: "q12", timerMode: "off", decoys: 4, speed: 0.95, lives: 10, strikes: 4, aMin: 5, aMax: 15, bMin: 5, bMax: 15 }
          },
          {
            id: "r3",
            title: "Rift 3: Phase Lock",
            desc: "Classic answers under pressure.",
            config: { ship: "am2", questionMode: "classic3", difficulty: "hard", targetMode: "off", timerMode: "75", decoys: 4, decoyFunction: "units_bias", speed: 1.0, lives: 5, strikes: 3, aMin: 3, aMax: 12, bMin: 3, bMax: 12 }
          },
          {
            id: "r4",
            title: "Rift 4: Echo Surge",
            desc: "Addition classics at speed.",
            config: { questionMode: "add_classic2", difficulty: "hard", targetMode: "off", timerMode: "75", decoys: 4, decoyFunction: "units_bias", speed: 1.05, lives: 5, strikes: 3, aMin: 10, aMax: 99, bMin: 10, bMax: 99 }
          },
          {
            id: "r5",
            title: "Rift 5: Prism Array",
            desc: "Squares at high tempo.",
            config: { questionMode: "square_shoot", difficulty: "brutal", targetMode: "off", timerMode: "90", decoys: 5, decoyFunction: "structured", speed: 1.1, lives: 5, strikes: 2, aMin: 4, aMax: 15, bMin: 4, bMax: 15 }
          },
          {
            id: "r6",
            title: "Rift 6: Root Spiral",
            desc: "Roots with tight margins.",
            config: { questionMode: "square_root", difficulty: "brutal", targetMode: "off", timerMode: "90", decoys: 5, decoyFunction: "structured", speed: 1.1, lives: 5, strikes: 2, aMin: 4, aMax: 15, bMin: 4, bMax: 15 }
          }
        ]
      },
      {
        id: "void_run",
        name: "Void Run",
        desc: "Elite tempo with razor-thin margin.",
        maxFailures: 3,
        missions: [
          {
            id: "v1",
            title: "Void 1: Singularity Drift",
            desc: "High-speed digit hunt.",
            config: { ship: "spire", questionMode: "digits3", difficulty: "hard", targetMode: "q12", timerMode: "off", decoys: 5, speed: 1.1, lives: 5, strikes: 4, aMin: 3, aMax: 12, bMin: 3, bMax: 12 }
          },
          {
            id: "v2",
            title: "Void 2: Ion Wake",
            desc: "Addition under pressure.",
            config: { ship: "classic", questionMode: "add_digits3", difficulty: "brutal", targetMode: "q12", timerMode: "off", decoys: 5, speed: 1.15, lives: 5, strikes: 3, aMin: 8, aMax: 18, bMin: 8, bMax: 18 }
          },
          {
            id: "v3",
            title: "Void 3: Razor Current",
            desc: "Classic answers at max pace.",
            config: { ship: "am2", questionMode: "classic3", difficulty: "brutal", targetMode: "off", timerMode: "75", decoys: 5, decoyFunction: "units_bias", speed: 1.2, lives: 5, strikes: 2, aMin: 4, aMax: 15, bMin: 4, bMax: 15 }
          },
          {
            id: "v4",
            title: "Void 4: Nova Cipher",
            desc: "Addition classics at speed.",
            config: { questionMode: "add_classic3", difficulty: "brutal", targetMode: "off", timerMode: "75", decoys: 5, decoyFunction: "units_bias", speed: 1.2, lives: 5, strikes: 2, aMin: 20, aMax: 99, bMin: 20, bMax: 99 }
          },
          {
            id: "v5",
            title: "Void 5: Prism Collapse",
            desc: "Squares at extreme tempo.",
            config: { questionMode: "square_shoot", difficulty: "brutal", targetMode: "off", timerMode: "90", decoys: 6, decoyFunction: "structured", speed: 1.25, lives: 5, strikes: 2, aMin: 6, aMax: 20, bMin: 6, bMax: 20 }
          },
          {
            id: "v6",
            title: "Void 6: Root Singe",
            desc: "Roots with no slack.",
            config: { questionMode: "square_root", difficulty: "brutal", targetMode: "off", timerMode: "90", decoys: 6, decoyFunction: "structured", speed: 1.25, lives: 5, strikes: 1, aMin: 6, aMax: 20, bMin: 6, bMax: 20 }
          }
        ]
      }
    ];
    var activeCampaignId = null;

    function findCampaignSet(id){
      for(var i=0; i<campaignSets.length; i++){
        if(campaignSets[i].id === id) return campaignSets[i];
      }
      return null;
    }

    function getCampaignSet(id){
      return findCampaignSet(id) || campaignSets[0];
    }

    function getActiveCampaignId(){
      if(activeCampaignId) return activeCampaignId;
      var stored = null;
      try{ stored = localStorage.getItem(campaignActiveKey); }catch(e){}
      if(stored && findCampaignSet(stored)) activeCampaignId = stored;
      if(!activeCampaignId) activeCampaignId = campaignDefaultId;
      return activeCampaignId;
    }

    function setActiveCampaignId(id){
      activeCampaignId = id || campaignDefaultId;
      try{ localStorage.setItem(campaignActiveKey, activeCampaignId); }catch(e){}
    }

    function getCampaignStateKey(id){
      return campaignStateKeyBase + id;
    }

    function getCampaignDataKey(id){
      return campaignDataKeyBase + id;
    }

    function normalizeCampaignState(state, missionCount){
      var safe = (state && typeof state === "object") ? state : {};
      var completed = Array.isArray(safe.completed) ? safe.completed.slice(0, missionCount) : [];
      while(completed.length < missionCount) completed.push(false);
      var index = Number.isFinite(safe.index) ? safe.index : 0;
      index = Math.max(0, Math.min(index, missionCount));
      return {
        index: index,
        failures: safe.failures || 0,
        completed: completed,
        active: !!safe.active,
        failed: !!safe.failed
      };
    }

    function loadCampaignState(campaignId){
      var set = getCampaignSet(campaignId);
      var key = getCampaignStateKey(set.id);
      var state = null;
      try{
        var raw = localStorage.getItem(key);
        if(raw) state = JSON.parse(raw);
      }catch(e){}
      if(!state && set.id === campaignDefaultId){
        try{
          var legacy = localStorage.getItem("mathsteroid.campaign.state");
          if(legacy) state = JSON.parse(legacy);
        }catch(e){}
        if(state){
          try{ localStorage.setItem(key, JSON.stringify(state)); }catch(e){}
        }
      }
      return normalizeCampaignState(state, set.missions.length);
    }

    function saveCampaignState(state, campaignId){
      var key = getCampaignStateKey(campaignId || getActiveCampaignId());
      try{ localStorage.setItem(key, JSON.stringify(state)); }catch(e){}
    }

    function ensureCampaignData(){
      campaignSets.forEach(function(set){
        var key = getCampaignDataKey(set.id);
        try{
          var existing = null;
          var raw = localStorage.getItem(key);
          if(raw) existing = JSON.parse(raw);
          if(!existing || existing.version !== campaignDataVersion){
            localStorage.setItem(key, JSON.stringify({
              version: campaignDataVersion,
              id: set.id,
              name: set.name,
              missions: set.missions,
              maxFailures: set.maxFailures || campaignMaxFailuresDefault
            }));
          }
        }catch(e){}
      });
    }

    function resetCampaignState(campaignId){
      var set = getCampaignSet(campaignId);
      var fresh = {
        index: 0,
        failures: 0,
        completed: new Array(set.missions.length).fill(false),
        active: false,
        failed: false
      };
      saveCampaignState(fresh, set.id);
      return fresh;
    }

    function getActiveCampaign(){
      return getCampaignSet(getActiveCampaignId());
    }

    function getCampaignMaxFailures(){
      var set = getActiveCampaign();
      return set && set.maxFailures ? set.maxFailures : campaignMaxFailuresDefault;
    }

    var form = document.getElementById("homeMenu");
    var resetBtn = document.getElementById("btnReset");
    var saved = loadSessionConfig("asteroidConfig", defaults);
    ensureCampaignData();
    if(saved.timerMode && String(saved.timerMode).charAt(0) === "q"){
      saved.targetMode = saved.timerMode;
      saved.timerMode = "off";
    }

    if (form) {
      Object.keys(saved).forEach(function(key) {
        var value = saved[key];
        var field = form.elements.namedItem(key) || document.getElementById(key);
        if (!field) return;
        if (field.type === "checkbox") {
          field.checked = Boolean(value);
        } else {
          field.value = value;
        }
      });
    }
    var helpToggle = document.getElementById("helpToggle");
    var helpStorageKey = "mathsteroid.showHelp";
    function setHelpState(isOn){
      document.body.classList.toggle("showHelp", !!isOn);
      if(helpToggle) helpToggle.checked = !!isOn;
      try{ localStorage.setItem(helpStorageKey, isOn ? "1" : "0"); }catch(e){}
    }
    if(helpToggle){
      var storedHelp = "0";
      try{ storedHelp = localStorage.getItem(helpStorageKey) || "0"; }catch(e){}
      setHelpState(storedHelp === "1");
      helpToggle.addEventListener("change", function(){
        setHelpState(helpToggle.checked);
      });
    }

    var volumeInput = document.getElementById("volume");
    if(volumeInput){
      volumeInput.addEventListener("input", function(){
        if(window.homeDrone){
          try{ window.homeDrone.volume = 0.22 * getHomeVolume() * getHomeSfxVolume(); }catch(e){}
        }
      });
    }
    var sfxVolumeInput = document.getElementById("sfxVolume");
    if(sfxVolumeInput){
      sfxVolumeInput.addEventListener("input", function(){
        if(window.homeDrone){
          try{ window.homeDrone.volume = 0.22 * getHomeVolume() * getHomeSfxVolume(); }catch(e){}
        }
      });
    }


    var homePowerupCatalogSecondary = [
      { id: "repair", label: "Hull Repair", icon: "images/powerup_hullrepair.png", desc: "Instant hull repair (+35%)." },
      { id: "time", label: "Time Dilation", icon: "images/powerup_timedelay.png", desc: "Grants one Time Dilation charge (press X to slow time)." },
      { id: "magnet", label: "Magnet Sweep", icon: "images/powerup_magnet.png", desc: "Grants one Magnet Sweep charge (press X to pull the correct asteroid)." },
      { id: "emp", label: "EMP Burst", icon: "images/powerup_EMP.png", desc: "Triggers immediately and cascades non-answer asteroids." },
      { id: "lock", label: "Target Lock", icon: "images/powerup_targetlock.png", desc: "Grants one Target Lock charge (press X to steer shots to the correct asteroid)." }
    ];

    var homePowerupCatalogDefense = [
      { id: "shield", label: "Shield", icon: "images/powerup_shield.png", desc: "Blue bubble for ~10s real time: hits strip shield first before your hull takes damage." },
      { id: "armor", label: "Armor", icon: "images/powerup_armor.png", desc: "Absorbs 5 hits before disarming." }
    ];

    var homePowerupCatalogOffense = [
      { id: "dual", label: "Dual Blaster", icon: "images/shot_dualblasters.png", desc: "Two shots per tap—pre-launch pick lasts the mission; orange offense pickups use two knock charges (asteroid bump or alien bullet), then single shots." },
      { id: "laser", label: "Laser Burst", icon: "images/shot_laser.png", desc: "Pre-launch pick: unlimited rapid beams for the mission. Orange offense pickup: same style with two knock charges—each bump or alien bullet spends one, then single shots return." },
      { id: "fire", label: "Fireball", icon: "images/shot_fre.png", desc: "Pre-launch pick: unlimited fireballs for the mission. Orange offense pickup: two knock charges from bumps or alien shots, then revert to single." },
      { id: "ice", label: "Ice Shards", icon: "images/shot_ice.png", desc: "Pre-launch pick: unlimited ice shards for the mission. Orange offense pickup: two knock charges, then single shots." },
      { id: "electric", label: "Electric Bolts", icon: "images/shot_electric.png", desc: "Pre-launch pick: unlimited electric bolts for the mission. Orange offense pickup: two knock charges, then single shots." },
      { id: "pierce", label: "Look Up Shot", icon: "images/shot_lookup.png", desc: "Pre-launch pick: unlimited pierce shots for the mission. Orange offense pickup: two knock charges, then single shots." },
      { id: "plasma", label: "Plasma Orb", icon: "images/shot_plasma.png", desc: "Pre-launch pick: unlimited plasma orbs for the mission. Orange offense pickup: two knock charges, then single shots." },
      { id: "rail", label: "Rail Beam", icon: "images/shot_rail.png", desc: "Pre-launch pick: unlimited rail beams for the mission. Orange offense pickup: two knock charges, then single shots." }
    ];

    var homeSfxCatalog = [
      { id: "menu_beep", label: "Menu Beep", desc: "UI blip.", when: "Menu and overlay buttons.", badge: "SFX", src: "sfx/menu_beep.mp3" },
      { id: "session_start", label: "Session Start", desc: "Countdown cue.", when: "Countdown before a run.", badge: "SFX", src: "sfx/session_start.mp3" },
      { id: "mission_cleared1", label: "Mission Cleared", desc: "Clear fanfare.", when: "After wave clear, before the end panel.", badge: "SFX", src: "sfx/mission_cleared1.mp3" },
      { id: "game_over3", label: "Game Over", desc: "Fail sting.", when: "After ship destruction.", badge: "SFX", src: "sfx/game_over3.mp3" },
      { id: "explosion", label: "Explosion", desc: "Ship explosion.", when: "Player destroyed.", badge: "SFX", src: "sfx/explosion.mp3" },
      { id: "ship_drone", label: "Ship Drone", desc: "Engine drone loop.", when: "Active during runs.", badge: "SFX", src: "sfx/ship_drone.mp3" },
      { id: "ship_idle", label: "Ship Idle", desc: "Idle thruster loop.", when: "Idle or moving left, right, down.", badge: "SFX", src: "sfx/ship_idle.mp3" },
      { id: "ship_advance", label: "Ship Advance", desc: "Advance thruster loop.", when: "Moving upward.", badge: "SFX", src: "sfx/ship_advance.mp3" },
      { id: "dash", label: "Dash", desc: "Dash whoosh.", when: "Dashing and intro kick.", badge: "SFX", src: "sfx/dash.mp3" },
      { id: "gun1", label: "Gun 1", desc: "Primary blaster.", when: "Standard, dual, and fire shots.", badge: "SFX", src: "sfx/gun1.mp3" },
      { id: "gun2", label: "Gun 2", desc: "Heavy blaster.", when: "Laser and rail shots.", badge: "SFX", src: "sfx/gun2.mp3" },
      { id: "ice_shot", label: "Ice Shot", desc: "Ice blaster.", when: "Ice shots.", badge: "SFX", src: "sfx/ice_shot.mp3" },
      { id: "bolt_shot", label: "Bolt Shot", desc: "Electric blaster.", when: "Electric shots.", badge: "SFX", src: "sfx/bolt_shot.mp3" },
      { id: "impact", label: "Impact", desc: "Collision hit.", when: "Ship hits and alien impacts.", badge: "SFX", src: "sfx/impact.mp3" },
      { id: "impact_thud", label: "Impact Thud", desc: "Asteroid thud.", when: "Asteroid impacts and EMP cascade hits.", badge: "SFX", src: "sfx/impact_thud.mp3" },
      { id: "correct", label: "Correct", desc: "Correct hit cue.", when: "Correct answer asteroid destroyed.", badge: "SFX", src: "sfx/correct.mp3" },
      { id: "wrong_asteroid", label: "Wrong Asteroid", desc: "Wrong hit cue.", when: "Wrong answer asteroid hit.", badge: "SFX", src: "sfx/wrong_asteroid.mp3" },
      { id: "missed_answer", label: "Missed Answer", desc: "Missed answer cue.", when: "Correct asteroid escapes.", badge: "SFX", src: "sfx/missed_answer.mp3" },
      { id: "level_up2", label: "Level Up", desc: "Level up cue.", when: "Level increases.", badge: "SFX", src: "sfx/level_up2.mp3" },
      { id: "alien_kill", label: "Alien Kill", desc: "Alien destroyed.", when: "Alien shot down.", badge: "SFX", src: "sfx/alien_kill.mp3" },
      { id: "alien_shooting", label: "Alien Shooting", desc: "Alien firing.", when: "Alien fires.", badge: "SFX", src: "sfx/alien_shooting.mp3" },
      { id: "ship_damaged", label: "Ship Damaged", desc: "Damage alert.", when: "Player takes damage.", badge: "SFX", src: "sfx/ship_damaged.mp3" },
      { id: "warning", label: "Warning", desc: "Warning alarm.", when: "Correct answer near escape (not in tutorial).", badge: "SFX", src: "sfx/warning.mp3" },
      { id: "shot_powerup", label: "Shot Pickup", desc: "Offense pickup.", when: "Collect shot type upgrades.", badge: "SFX", src: "sfx/shot_powerup.mp3" },
      { id: "hull_repair_pickup", label: "Hull Repair Pickup", desc: "Repair pickup.", when: "Collect hull repair.", badge: "SFX", src: "sfx/hull_repair_pickup.mp3" },
      { id: "armor_pickup", label: "Armor Pickup", desc: "Armor pickup.", when: "Collect armor powerup.", badge: "SFX", src: "sfx/armor_pickup.mp3" },
      { id: "shield_pickup", label: "Shield Pickup", desc: "Shield pickup.", when: "Collect shield powerup.", badge: "SFX", src: "sfx/sheld_pickup.mp3" },
      { id: "time_activate", label: "Time Activate", desc: "Time dilation cue.", when: "Activate time dilation.", badge: "SFX", src: "sfx/time_activate.mp3" },
      { id: "powerup_collected", label: "Powerup Collected", desc: "Pickup chime.", when: "Collect magnet, EMP, or target lock.", badge: "SFX", src: "sfx/powerup_collected.mp3" },
      { id: "crash", label: "Crash", desc: "Hard collision.", when: "Ship collision impact.", badge: "SFX", src: "sfx/crash.mp3" }
    ];

    var homePreviewPlayers = {};
    var activeHomePreview = null;

    function formatDurationHome(sec){
      if(!isFinite(sec) || sec <= 0) return "--:--";
      var total = Math.round(sec);
      var m = Math.floor(total / 60);
      var s = total % 60;
      return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function getPreviewVolumeHome(){
      var master = volumeInput ? parseFloat(volumeInput.value) : (saved && saved.volume ? saved.volume : 1);
      var sfx = sfxVolumeInput ? parseFloat(sfxVolumeInput.value) : (saved && saved.sfxVolume ? saved.sfxVolume : 1);
      if(!isFinite(master)) master = 1;
      if(!isFinite(sfx)) sfx = 1;
      return Math.max(0, Math.min(1, master * sfx));
    }

    function stopPreviewAudioHome(audio){
      if(!audio) return;
      try{
        audio.pause();
        audio.currentTime = 0;
      }catch(e){}
    }

    function stopAllPreviewAudioHome(){
      for(var key in homePreviewPlayers){
        if(Object.prototype.hasOwnProperty.call(homePreviewPlayers, key)){
          stopPreviewAudioHome(homePreviewPlayers[key]);
        }
      }
      activeHomePreview = null;
    }

    function renderCatalogListHome(listEl, items){
      if(!listEl) return;
      listEl.innerHTML = "";
      for(var i=0; i<items.length; i++){
        var item = items[i];
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
          file.textContent = "File: sfx/" + item.id + ".mp3";
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
          playBtn.className = "btn btnTiny";
          playBtn.textContent = "PLAY";
          var stopBtn = document.createElement("button");
          stopBtn.type = "button";
          stopBtn.className = "btn btnTiny";
          stopBtn.textContent = "STOP";
          var duration = document.createElement("div");
          duration.className = "catalogDuration";
          duration.textContent = "--:--";

          var audio = new Audio(item.src);
          audio.preload = "metadata";
          audio.volume = getPreviewVolumeHome();
          homePreviewPlayers[item.id] = audio;
          (function(audioRef, durationEl, playBtnEl, stopBtnEl){
            audioRef.addEventListener("loadedmetadata", function(){
              durationEl.textContent = formatDurationHome(audioRef.duration);
            });
            audioRef.addEventListener("ended", function(){
              if(activeHomePreview === audioRef) activeHomePreview = null;
            });
            playBtnEl.addEventListener("click", function(){
              if(activeHomePreview && activeHomePreview !== audioRef){
                stopPreviewAudioHome(activeHomePreview);
              }
              activeHomePreview = audioRef;
              try{
                audioRef.volume = getPreviewVolumeHome();
                audioRef.currentTime = 0;
                audioRef.play().catch(function(){});
              }catch(e){}
            });
            stopBtnEl.addEventListener("click", function(){
              stopPreviewAudioHome(audioRef);
              if(activeHomePreview === audioRef) activeHomePreview = null;
            });
          })(audio, duration, playBtn, stopBtn);
          try{ audio.load(); }catch(e){}

          controls.appendChild(playBtn);
          controls.appendChild(stopBtn);
          controls.appendChild(duration);
          text.appendChild(controls);
        }

        li.appendChild(icon);
        li.appendChild(text);
        listEl.appendChild(li);
      }
    }

    function renderHomeCatalogs(){
      stopAllPreviewAudioHome();
      homePreviewPlayers = {};
      renderCatalogListHome(powerupsSecondaryListHome, homePowerupCatalogSecondary);
      renderCatalogListHome(powerupsDefenseListHome, homePowerupCatalogDefense);
      renderCatalogListHome(powerupsOffenseListHome, homePowerupCatalogOffense);
      renderCatalogListHome(sfxListHome, homeSfxCatalog);
    }

    var shipRadios = Array.prototype.slice.call(document.querySelectorAll('input[name="ship"]'));
    var shipOptions = Array.prototype.slice.call(document.querySelectorAll('.shipOption'));
    var shipTrack = document.getElementById("shipTrack");
    var shipGrid = document.getElementById("shipGrid");
    var launchSetupSpinner = document.getElementById("launchSetupSpinner");
    var shipDetailsName = document.getElementById("shipDetailsName");
    var shipDetailsStyle = document.getElementById("shipDetailsStyle");
    var shipDetailsBody = document.getElementById("shipDetailsBody");
    var shipStatHull = document.getElementById("shipStatHull");
    var shipStatWings = document.getElementById("shipStatWings");
    var shipStatGuns = document.getElementById("shipStatGuns");
    var shipStatThrusters = document.getElementById("shipStatThrusters");
    var shipStatSpecialCard = document.getElementById("shipStatSpecialCard");
    var shipLoadingStart = 0;
    var shipPanel = document.getElementById("shipPanel");
    var shipDetailsMap = {
      mk7: {
        name: "Crimson MK-7",
        style: "Synthwave Interceptor",
        body: "Balanced frame with broad wings, medium hull height, and dual midrange cannons.",
        flight: "Smooth",
        wings: "Wide",
        special: "Shockwave",
        thrusters: "Dual"
      },
      fizard: {
        name: "Aurora Dart",
        style: "Glacier Dart",
        body: "Compact spear hull with clipped wing tips and nimble pods for quick strikes.",
        flight: "Responsive",
        wings: "Compact",
        special: "Shockwave",
        thrusters: "Dual"
      },
      classic: {
        name: "Scarlet Classic",
        style: "Retro Heavy",
        body: "Thicker nose and tighter wings; built for stability and measured fire.",
        flight: "Heavy",
        wings: "Short",
        special: "Shockwave",
        thrusters: "Dual"
      },
      ember: {
        name: "Ruby Strike",
        style: "Neon Striker",
        body: "Aggressive wedge with broad armor lines and sharp forward profile.",
        flight: "Heavy",
        wings: "Wide",
        special: "Shockwave",
        thrusters: "Dual"
      },
      azure: {
        name: "Azure Lancer",
        style: "Aero Spear",
        body: "Elongated hull with swept wings and long barrel geometry.",
        flight: "Smooth",
        wings: "Swept",
        special: "Shockwave",
        thrusters: "Dual"
      },
      spire: {
        name: "Verdant Spire",
        style: "Prism Skimmer",
        body: "Tall, narrow core with compact wings and high-set accents.",
        flight: "Smooth",
        wings: "Compact",
        special: "Flares",
        thrusters: "Dual"
      },
      am2: {
        name: "AM2 Scout",
        style: "Arcade Relic",
        body: "Classic silhouette with a slim spine, flared wings, and triple thrusters.",
        flight: "Responsive",
        wings: "Flared",
        special: "Teleport",
        thrusters: "Triple"
      }
    };
    function updateShipCarousel(value){
      if(!shipTrack) return;
      var container = shipTrack.parentElement;
      if(!container) return;
      var index = shipOptions.findIndex(function(option){ return option.dataset.ship === value; });
      if(index < 0) index = 0;
      var styles = getComputedStyle(container);
      var cardW = parseFloat(styles.getPropertyValue("--ship-card")) || 180;
      var gap = parseFloat(styles.getPropertyValue("--ship-gap")) || 12;
      var total = cardW + gap;
      var center = (container.clientWidth - cardW) / 2;
      var offset = center - (index * total);
      shipTrack.style.transform = "translateX(" + offset + "px)";
    }

    function syncShipSelection(value){
      shipRadios.forEach(function(radio){ radio.checked = radio.value === value; });
      shipOptions.forEach(function(option){
        option.classList.toggle('selected', option.dataset.ship === value);
      });
      var details = shipDetailsMap[value] || shipDetailsMap.mk7;
      if(shipDetailsName) shipDetailsName.textContent = details.name;
      if(shipDetailsStyle) shipDetailsStyle.textContent = details.style;
      if(shipDetailsBody) shipDetailsBody.textContent = details.body;
      if(shipStatHull) shipStatHull.textContent = details.flight;
      if(shipStatWings) shipStatWings.textContent = details.wings;
      if(shipStatGuns) shipStatGuns.textContent = details.special;
      if(shipStatThrusters) shipStatThrusters.textContent = details.thrusters;
      updateShipCarousel(value);
    }
    function scheduleShipCarouselSync(){
      if(launchSetupSpinner) launchSetupSpinner.classList.add("isLoading");
      shipLoadingStart = performance.now();
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          var selected = (document.querySelector('input[name="ship"]:checked') || {}).value || "mk7";
          updateShipCarousel(selected);
          if(launchSetupSpinner){
            var minShowTitle = 220;
            var elapsedTitle = performance.now() - shipLoadingStart;
            var waitTitle = Math.max(0, minShowTitle - elapsedTitle);
            setTimeout(function(){ launchSetupSpinner.classList.remove("isLoading"); }, waitTitle);
          }
        });
      });
    }
    syncShipSelection(saved.ship || "spire");
    shipRadios.forEach(function(radio){
      radio.addEventListener('change', function(){
        if(radio.disabled) return;
        syncShipSelection(radio.value);
      });
    });
    shipOptions.forEach(function(option){
      option.addEventListener("click", function(){
        syncShipSelection(option.dataset.ship);
      });
    });
    if(shipStatSpecialCard){
      shipStatSpecialCard.addEventListener("mouseenter", function(){
        var selected = (document.querySelector('input[name="ship"]:checked') || {}).value || "mk7";
        if(window.triggerShipPreviewAbility) window.triggerShipPreviewAbility(selected);
      });
      shipStatSpecialCard.addEventListener("touchstart", function(){
        var selected = (document.querySelector('input[name="ship"]:checked') || {}).value || "mk7";
        if(window.triggerShipPreviewAbility) window.triggerShipPreviewAbility(selected);
      }, { passive: true });
    }
    window.addEventListener("resize", function(){
      var selected = (document.querySelector('input[name=\"ship\"]:checked') || {}).value || "mk7";
      updateShipCarousel(selected);
    });
    var startBtn = document.getElementById("btnStartGame");
    var btnLaunchHome = document.getElementById("btnLaunchHome");
    var btnCampaign = document.getElementById("btnCampaign");
    var btnTutorial = document.getElementById("btnTutorial");
    var funnelOverlay = document.getElementById("funnelOverlay");
    var menuWrap = document.getElementById("menuWrap");
    var controlsOverlay = document.getElementById("controlsOverlay");
    var leaderboardsOverlay = document.getElementById("leaderboardsOverlay");
    var settingsOverlay = document.getElementById("settingsOverlay");
    var settingsTabButtonsHome = settingsOverlay ? settingsOverlay.querySelectorAll("[data-settings-tab]") : [];
    var settingsPanelsHome = settingsOverlay ? settingsOverlay.querySelectorAll("[data-settings-panel]") : [];
    var toggleWideGameplayHome = document.getElementById("toggleWideGameplayHome");
    var toggleMousepadAutoHome = document.getElementById("toggleMousepadAutoHome");
    var wideGameplayKey = "mentaris.gameplay.wide";
    var mousepadAutoKey = "mentaris.mousepad.autostart";

    function setSettingsTabHome(tabId){
      if(!settingsTabButtonsHome || !settingsPanelsHome) return;
      for(var i=0; i<settingsTabButtonsHome.length; i++){
        var btn = settingsTabButtonsHome[i];
        var isActive = btn.getAttribute("data-settings-tab") === tabId;
        btn.classList.toggle("active", isActive);
      }
      for(var j=0; j<settingsPanelsHome.length; j++){
        var panel = settingsPanelsHome[j];
        var show = panel.getAttribute("data-settings-panel") === tabId;
        panel.classList.toggle("active", show);
      }
    }

    function loadSettingsTogglesHome(){
      try{
        var wideStored = localStorage.getItem(wideGameplayKey);
        if(toggleWideGameplayHome){
          toggleWideGameplayHome.checked = wideStored === "1" || wideStored === "true";
        }
      }catch(e){}
      try{
        var mouseStored = localStorage.getItem(mousepadAutoKey);
        if(toggleMousepadAutoHome){
          toggleMousepadAutoHome.checked = mouseStored === "1" || mouseStored === "true";
        }
      }catch(e){}
    }
    var briefingOverlay = document.getElementById("briefingOverlay");
    var campaignOverlay = document.getElementById("campaignOverlay");
    var btnCloseCampaign = document.getElementById("btnCloseCampaign");
    var btnCampaignStart = document.getElementById("btnCampaignStart");
    var btnCampaignReset = document.getElementById("btnCampaignReset");
    var btnCampaignContinue = document.getElementById("btnCampaignContinue");
    var campaignConfirmOverlay = document.getElementById("campaignConfirmOverlay");
    var btnCampaignConfirmStart = document.getElementById("btnCampaignConfirmStart");
    var btnCampaignConfirmCancel = document.getElementById("btnCampaignConfirmCancel");
    var btnCampaignConfirmContinue = document.getElementById("btnCampaignConfirmContinue");
    var btnCampaignBack = document.getElementById("btnCampaignBack");
    var campaignSelectView = document.getElementById("campaignSelectView");
    var campaignMissionsView = document.getElementById("campaignMissionsView");
    var campaignSetList = document.getElementById("campaignSetList");
    var campaignList = document.getElementById("campaignList");
    var campaignStatusText = document.getElementById("campaignStatusText");
    var campaignDetails = document.getElementById("campaignDetails");
    var btnControls = document.getElementById("btnControls");
    var btnHowToPlay = document.getElementById("btnHowToPlay");
    var btnLeaderboards = document.getElementById("btnLeaderboards");
    var btnCloseFunnel = document.getElementById("btnCloseFunnel");
    var btnCloseControls = document.getElementById("btnCloseControls");
    var btnCloseLeaderboards = document.getElementById("btnCloseLeaderboards");
    var btnSettingsHome = document.getElementById("btnSettingsHome");
    var btnCloseSettings = document.getElementById("btnCloseSettings");
    var btnCloseSettingsBottom = document.getElementById("btnCloseSettingsBottom");

    var btnPowerupsHome = document.getElementById("btnPowerupsHome");
    var btnSfxHome = document.getElementById("btnSfxHome");
    var powerupsOverlayHome = document.getElementById("powerupsOverlayHome");
    var sfxOverlayHome = document.getElementById("sfxOverlayHome");
    var btnClosePowerupsHome = document.getElementById("btnClosePowerupsHome");
    var btnBackPowerupsHome = document.getElementById("btnBackPowerupsHome");
    var btnCloseSfxHome = document.getElementById("btnCloseSfxHome");
    var btnBackSfxHome = document.getElementById("btnBackSfxHome");
    var powerupsSecondaryListHome = document.getElementById("powerupsSecondaryListHome");
    var powerupsDefenseListHome = document.getElementById("powerupsDefenseListHome");
    var powerupsOffenseListHome = document.getElementById("powerupsOffenseListHome");
    var sfxListHome = document.getElementById("sfxListHome");
    var btnFullscreenHome = document.getElementById("btnFullscreenHome");
    var btnLaunchGame = document.getElementById("btnLaunchGame");
    var btnStepBack = document.getElementById("btnStepBack");
    var btnStepNext = document.getElementById("btnStepNext");
    var btnSaveFunnel = document.getElementById("btnSaveFunnel");
    var stepperText = document.getElementById("stepperText");
    var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
    var stepIndex = 0;
    var pendingConfig = null;
    var pendingCampaign = null;
    var campaignShipSelect = false;
    var launchPending = false;
    var tutorialPending = false;
    var modeChoices = Array.prototype.slice.call(document.querySelectorAll("#modeChoices .choiceCard"));
    var operationChoices = Array.prototype.slice.call(document.querySelectorAll("#operationChoices .choiceCard"));
    var submodeChoices = Array.prototype.slice.call(document.querySelectorAll("#submodeChoices .choiceCard"));
    var difficultyChoices = Array.prototype.slice.call(document.querySelectorAll("#difficultyChoices .choiceCard"));
    var beltChoices = Array.prototype.slice.call(document.querySelectorAll("#beltChoices .choiceCard"));
    var beltInput = document.getElementById("belt");
    var questionModeInput = document.getElementById("questionMode");
    var decoyFunctionInput = document.getElementById("decoyFunction");

    var selectedMode = "digit";
    var selectedOperation = "mul";
    var selectedSubmode = "3";
    var selectedDifficulty = "normal";
    var selectedBelt = "dusk";

    if(saved.difficulty){
      selectedDifficulty = saved.difficulty;
      if(difficultyChoices && difficultyChoices.length){
        selectChoice(difficultyChoices, selectedDifficulty, "data-diff");
      }
    }
    if(saved.belt){
      selectedBelt = saved.belt;
      if(beltChoices && beltChoices.length){
        selectChoice(beltChoices, selectedBelt, "data-belt");
      }
      if(beltInput) beltInput.value = selectedBelt;
    }

    var difficultyPresets = {
      easy: { aMin: 1, aMax: 9, bMin: 1, bMax: 9, decoys: 2, speed: 0.5, lives: 20, strikes: 8 },
      normal: { aMin: 2, aMax: 12, bMin: 2, bMax: 12, decoys: 3, speed: 0.7, lives: 15, strikes: 5 },
      hard: { aMin: 4, aMax: 14, bMin: 4, bMax: 14, decoys: 4, speed: 0.85, lives: 5, strikes: 3 },
      brutal: { aMin: 6, aMax: 18, bMin: 6, bMax: 18, decoys: 5, speed: 1.0, lives: 5, strikes: 0 }
    };

    function selectChoice(list, value, attr){
      list.forEach(function(card){
        card.classList.toggle("selected", card.getAttribute(attr) === value);
      });
    }

    function setFromQuestionMode(mode){
      if(!mode) return;
      if(mode.indexOf("square_") === 0){
        selectedOperation = "square";
        selectedMode = "classic";
        selectedSubmode = (mode === "square_root") ? "3" : "2";
        return;
      }
      if(mode.indexOf("rational_") === 0){
        selectedOperation = "rational";
        selectedMode = "classic";
        selectedSubmode = (mode === "rational_dec") ? "3" : "2";
        return;
      }
      if(mode.indexOf("add_") === 0){
        selectedOperation = "add";
      }else{
        selectedOperation = "mul";
      }
      if(mode.indexOf("classic") !== -1){
        selectedMode = "classic";
      }else{
        selectedMode = "digit";
      }
      if(mode === "digits2" || mode === "add_digits2" || mode === "add_classic2" || mode === "classic2"){
        selectedSubmode = "2";
      }else if(mode === "digits3" || mode === "add_digits3" || mode === "add_classic3" || mode === "classic3"){
        selectedSubmode = "3";
      }
    }

    function updateDecoyFunctionAvailability(){
      if(!decoyFunctionInput || !questionModeInput) return;
      var mode = String(questionModeInput.value || "");
      var isClassic = (mode === "classic" || mode === "classic2" || mode === "classic3"
        || mode === "add_classic2" || mode === "add_classic3"
        || mode === "square_shoot" || mode === "square_root"
        || mode === "rational_frac" || mode === "rational_dec");
      decoyFunctionInput.disabled = !isClassic;
    }

    function computeQuestionMode(){
      if(selectedOperation === "rational"){
        return selectedSubmode === "3" ? "rational_dec" : "rational_frac";
      }
      if(selectedOperation === "square"){
        return selectedSubmode === "3" ? "square_root" : "square_shoot";
      }
      if(selectedOperation === "mul"){
        if(selectedMode === "classic") return selectedSubmode === "2" ? "classic2" : "classic3";
        return selectedSubmode === "2" ? "digits2" : "digits3";
      }
      if(selectedMode === "classic"){
        return selectedSubmode === "3" ? "add_classic3" : "add_classic2";
      }
      return selectedSubmode === "3" ? "add_digits3" : "add_digits2";
    }

    function updateSubmodeLabels(){
      if(!submodeChoices.length) return;
      submodeChoices.forEach(function(card){
        var sub = card.getAttribute("data-sub");
        var title = card.querySelector("h4");
        var desc = card.querySelector("p");
        if(selectedOperation === "rational"){
          if(title) title.textContent = (sub === "3") ? "Target Decimal" : "Target Fraction";
          if(desc) desc.textContent = (sub === "3")
            ? "Question shows a fraction. Shoot the decimal."
            : "Question shows a decimal. Shoot the fraction.";
          return;
        }
        if(selectedOperation === "square"){
          if(title) title.textContent = (sub === "3") ? "Shoot Roots" : "Shoot Squares";
          if(desc) desc.textContent = (sub === "3")
            ? "Question shows \u221An\u00B2. Shoot the root answer."
            : "Question shows n\u00B2. Shoot the square answer.";
          return;
        }
        if(selectedOperation === "add"){
          if(title) title.textContent = sub + " + " + sub;
          if(desc) desc.textContent = (sub === "3")
            ? "Three-digit plus three-digit problems."
            : "Two-digit plus two-digit problems.";
        }else{
          if(title) title.textContent = sub + " by 1";
          if(desc) desc.textContent = (sub === "3")
            ? "One-digit by three-digit problems."
            : "One-digit by two-digit problems.";
        }
      });
    }

    function syncModeUi(){
      if(selectedOperation === "square" || selectedOperation === "rational") selectedMode = "classic";
      var qm = computeQuestionMode();
      if(questionModeInput) questionModeInput.value = qm;
      selectChoice(modeChoices, selectedMode, "data-mode");
      selectChoice(operationChoices, selectedOperation, "data-op");
      selectChoice(submodeChoices, selectedSubmode, "data-sub");
      updateSubmodeLabels();
      updateDecoyFunctionAvailability();
      if(modeChoices.length){
        modeChoices.forEach(function(card){
          var isDigit = card.getAttribute("data-mode") === "digit";
          card.classList.toggle("disabled", (selectedOperation === "square" || selectedOperation === "rational") && isDigit);
        });
      }
    }

    function isLockedShipSelected(){
      var selected = (document.querySelector('input[name="ship"]:checked') || {}).value || "";
      var option = shipOptions.find(function(opt){ return opt.dataset.ship === selected; });
      return option && option.dataset.locked === "true";
    }

    function applyPreset(key){
      var preset = difficultyPresets[key];
      if(!preset) return;
      if(selectedOperation === "square"){
        var squareMap = { easy: 20, normal: 30, hard: 45, brutal: 60 };
        var maxBase = squareMap[key] || 30;
        form.aMin.value = 1;
        form.aMax.value = maxBase;
      }else{
        form.aMin.value = preset.aMin;
        form.aMax.value = preset.aMax;
        form.bMin.value = preset.bMin;
        form.bMax.value = preset.bMax;
      }
      form.decoys.value = preset.decoys;
      form.speed.value = String(preset.speed);
      form.lives.value = preset.lives;
      if(form.strikes) form.strikes.value = preset.strikes;
      selectedDifficulty = key;
      selectChoice(difficultyChoices, key, "data-diff");
    }

    function setBelt(key){
      selectedBelt = key || "dusk";
      if(beltInput) beltInput.value = selectedBelt;
      selectChoice(beltChoices, selectedBelt, "data-belt");
    }
    setFromQuestionMode(saved.questionMode || "digits3");
    setBelt(selectedBelt);
    syncModeUi();
    var btnBriefingSkip = document.getElementById("btnBriefingSkip");
    var briefingStatus = document.getElementById("briefingStatus");
    var briefingStatusText = document.getElementById("briefingStatusText");
    var briefingShipCard = document.getElementById("briefingShipCard");
    var briefingShip = document.getElementById("briefingShip");
    var briefingMode = document.getElementById("briefingMode");
    var briefingDifficulty = document.getElementById("briefingDifficulty");
    var briefingOperation = document.getElementById("briefingOperation");
    var briefingSubmode = document.getElementById("briefingSubmode");
    var briefingARange = document.getElementById("briefingARange");
    var briefingBRange = document.getElementById("briefingBRange");
    var briefingDecoys = document.getElementById("briefingDecoys");
    var briefingSpeed = document.getElementById("briefingSpeed");
    var briefingLives = document.getElementById("briefingLives");
    var briefingStrikes = document.getElementById("briefingStrikes");
    var briefingTargeted = document.getElementById("briefingTargeted");
    var briefingTimer = document.getElementById("briefingTimer");
    var briefingHintText = document.getElementById("briefingHintText");
    var briefingReady = false;
    var briefingTimerId = null;
    var briefingHintTimer = null;
    var briefingHintTypeTimer = null;
    var briefingHints = [
      "PRIORITY: LOCK ONTO THE CORRECT VALUE. DECOYS WILL BAIT YOU OFF TARGET.",
      "KEEP FORMATION. STRAY HITS WASTE TIME AND DRAIN SCORE.",
      "DASH TO EVADE INCOMING FIRE. SAVE THE BURST FOR TIGHT FORMATIONS.",
      "SECONDARY SYSTEMS ARE LIMITED. DEPLOY ONLY WHEN THE WINDOW IS CLEAR.",
      "MAINTAIN HULL INTEGRITY. AVOID UNNECESSARY COLLISIONS."
    ];
    var hintCycleMs = 5200;
    var hintTypeMs = 28;

    function shuffleArray(list){
      var arr = list.slice();
      for(var i=arr.length-1; i>0; i--){
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }

    function typeHint(text){
      if(!briefingHintText) return;
      if(briefingHintTypeTimer) clearInterval(briefingHintTypeTimer);
      briefingHintText.textContent = "";
      var i = 0;
      briefingHintTypeTimer = setInterval(function(){
        i++;
        briefingHintText.textContent = text.slice(0, i);
        if(i >= text.length){
          clearInterval(briefingHintTypeTimer);
          briefingHintTypeTimer = null;
        }
      }, hintTypeMs);
    }

    function startHintCycle(){
      if(!briefingHintText) return;
      if(briefingHintTimer) clearInterval(briefingHintTimer);
      if(briefingHintTypeTimer) clearInterval(briefingHintTypeTimer);
      var hintOrder = shuffleArray(briefingHints);
      var hintIndex = 0;
      typeHint(hintOrder[hintIndex]);
      briefingHintTimer = setInterval(function(){
        hintIndex += 1;
        if(hintIndex >= hintOrder.length){
          hintOrder = shuffleArray(briefingHints);
          hintIndex = 0;
        }
        typeHint(hintOrder[hintIndex]);
      }, hintCycleMs);
    }

    function setStep(idx){
      if(!steps.length) return;
      var hideModeStep = (selectedOperation === "square" || selectedOperation === "rational") && !campaignShipSelect;
      stepIndex = Math.max(0, Math.min(idx, steps.length - 1));
      if(hideModeStep && stepIndex === 1) stepIndex = 2;
      if(campaignShipSelect) stepIndex = 3;
      steps.forEach(function(step, i){
        if(i === 1) step.classList.toggle("hidden", hideModeStep);
        step.classList.toggle("active", i === stepIndex);
      });
      if(stepperText){
        var label = stepIndex === 0 ? "Operation"
          : stepIndex === 1 ? "Mode"
          : stepIndex === 2 ? "Sub Mode"
          : stepIndex === 3 ? "Ship"
          : stepIndex === 4 ? "Cluster"
          : "Difficulty";
        var totalSteps = hideModeStep ? (steps.length - 1) : steps.length;
        var displayIndex = hideModeStep && stepIndex > 1 ? stepIndex - 1 : stepIndex;
        stepperText.textContent = campaignShipSelect
          ? "Campaign Ship Select"
          : "Step " + (displayIndex + 1) + " of " + totalSteps + " - " + label;
      }
      var lastStepIndex = hideModeStep ? (steps.length - 1) : (steps.length - 1);
      if(btnStepBack) btnStepBack.style.visibility = (stepIndex === 0 || campaignShipSelect) ? "hidden" : "visible";
      if(btnStepNext) btnStepNext.style.display = (stepIndex === lastStepIndex || campaignShipSelect) ? "none" : "inline-flex";
      if(btnSaveFunnel) btnSaveFunnel.style.display = (stepIndex === lastStepIndex && !campaignShipSelect) ? "inline-flex" : "none";
      if(btnLaunchGame) btnLaunchGame.style.display = (stepIndex === lastStepIndex || campaignShipSelect) ? "inline-flex" : "none";
      if(stepIndex === 3){
        if(launchSetupSpinner) launchSetupSpinner.classList.add("isLoading");
        scheduleShipCarouselSync();
      }
    }

    function advanceFromChoice(){
      var hideModeStep = (selectedOperation === "square" || selectedOperation === "rational") && !campaignShipSelect;
      var lastStepIndex = hideModeStep ? (steps.length - 1) : (steps.length - 1);
      if(stepIndex >= lastStepIndex || campaignShipSelect) return;
      if((selectedOperation === "square" || selectedOperation === "rational") && stepIndex === 0){
        setStep(2);
        return;
      }
      setStep(stepIndex + 1);
    }

    function getHomeVolume(){
      var volEl = document.getElementById("volume");
      if(volEl){
        var v = parseFloat(volEl.value);
        if(!Number.isNaN(v)) return Math.max(0, Math.min(1, v));
      }
      return (saved && typeof saved.volume === "number") ? saved.volume : 0.65;
    }


    function getHomeSfxVolume(){
      var sfxEl = document.getElementById("sfxVolume");
      if(sfxEl){
        var v = parseFloat(sfxEl.value);
        if(!Number.isNaN(v)) return Math.max(0, Math.min(1, v));
      }
      return (saved && typeof saved.sfxVolume === "number") ? saved.sfxVolume : 0.85;
    }
    function getHomeMusicVolume(){
      var musicEl = document.getElementById("musicVolume");
      if(musicEl){
        var v = parseFloat(musicEl.value);
        if(!Number.isNaN(v)) return Math.max(0, Math.min(1, v));
      }
      return (saved && typeof saved.musicVolume === "number") ? saved.musicVolume : 0.6;
    }

    function playMenuBeep(){
      try{
        var beep = new Audio("sfx/menu_beep.mp3");
        beep.volume = 0.45 * getHomeVolume() * getHomeSfxVolume();
        beep.play().catch(function(){});
      }catch(e){
        // ignore audio failures
      }
    }

    var toastTimer = null;
    function showToast(msg){
      var toastEl = document.getElementById("toast");
      if(!toastEl) return;
      toastEl.textContent = msg;
      toastEl.classList.add("show", "toastAboveNext");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function(){
        toastEl.classList.remove("show", "toastAboveNext");
      }, 1500);
    }

    var tutorialKey = "mentaris.tutorial.complete";
    function hasCompletedTutorial(){
      try{ return localStorage.getItem(tutorialKey) === "1"; }catch(e){}
      return false;
    }

    if(menuWrap){
      var tutorialComplete = hasCompletedTutorial();
      if(tutorialComplete){
        document.body.classList.add("tutorialComplete");
        setTimeout(function(){ document.body.classList.add("showExtras"); }, 600);
      }else{
        document.body.classList.add("tutorialLocked");
        setTimeout(function(){ document.body.classList.add("showLaunch"); }, 600);
      }
    }
    if (btnHowToPlay && controlsOverlay) {
      btnHowToPlay.addEventListener("click", function(){
        playMenuBeep();
        if(settingsOverlay) settingsOverlay.classList.remove("show");
        controlsOverlay.classList.add("show");
      });
    }
    if (btnLeaderboards && leaderboardsOverlay) {
      btnLeaderboards.addEventListener("click", function(){
        playMenuBeep();
        renderHomeStats();
        leaderboardsOverlay.classList.add("show");
      });
    }
    if (btnSettingsHome && settingsOverlay) {
      btnSettingsHome.addEventListener("click", function(){
        playMenuBeep();
        settingsOverlay.classList.add("show");
        setSettingsTabHome("audio");
        renderHomeCatalogs();
        loadSettingsTogglesHome();
      });
    }
    if (btnPowerupsHome && powerupsOverlayHome) {
      btnPowerupsHome.addEventListener("click", function(){
        playMenuBeep();
        if(settingsOverlay) settingsOverlay.classList.remove("show");
        renderHomeCatalogs();
        powerupsOverlayHome.classList.add("show");
        powerupsOverlayHome.scrollTop = 0;
        window.scrollTo(0, 0);
      });
    }
    if (btnSfxHome && sfxOverlayHome) {
      btnSfxHome.addEventListener("click", function(){
        playMenuBeep();
        if(settingsOverlay) settingsOverlay.classList.remove("show");
        renderHomeCatalogs();
        sfxOverlayHome.classList.add("show");
        sfxOverlayHome.scrollTop = 0;
        window.scrollTo(0, 0);
      });
    }
    if (btnCampaign && campaignOverlay) {
      btnCampaign.addEventListener("click", function(){
        playMenuBeep();
        ensureCampaignData();
        renderCampaignSetList();
        renderCampaignList();
        updateCampaignStatus();
        showCampaignSelectView();
        campaignOverlay.classList.add("show");
        if(menuWrap) menuWrap.classList.add("hidden");
      });
    }
    if(btnLaunchHome){
      btnLaunchHome.addEventListener("click", function(){
        playMenuBeep();
        if(hasCompletedTutorial()){
          startGame();
        }else{
          startTutorial();
        }
      });
    }
    if(btnTutorial){
      btnTutorial.addEventListener("click", function(){
        playMenuBeep();
        startTutorial();
      });
    }
    if (startBtn && funnelOverlay) {
      startBtn.addEventListener("click", function(){
        playMenuBeep();
        campaignShipSelect = false;
        funnelOverlay.classList.add("show");
        setStep(0);
        if(menuWrap) menuWrap.classList.add("hidden");
        scheduleShipCarouselSync();
      });
    }
    if (btnCloseControls && controlsOverlay) {
      btnCloseControls.addEventListener("click", function(){
        playMenuBeep();
        controlsOverlay.classList.remove("show");
      });
    }
    if (btnCloseLeaderboards && leaderboardsOverlay) {
      btnCloseLeaderboards.addEventListener("click", function(){
        playMenuBeep();
        leaderboardsOverlay.classList.remove("show");
      });
    }
    if (btnCloseSettings && settingsOverlay) {
      btnCloseSettings.addEventListener("click", function(){
        playMenuBeep();
        settingsOverlay.classList.remove("show");
        stopAllPreviewAudioHome();
      });
    }
    if (btnCloseSettingsBottom && settingsOverlay) {
    if(settingsTabButtonsHome && settingsTabButtonsHome.length){
      settingsTabButtonsHome.forEach(function(btn){
        btn.addEventListener("click", function(){
          playMenuBeep();
          var tabId = btn.getAttribute("data-settings-tab") || "audio";
          setSettingsTabHome(tabId);
          if(tabId == "catalogs"){ renderHomeCatalogs(); }
        });
      });
    }
    if(toggleWideGameplayHome){
      toggleWideGameplayHome.addEventListener("change", function(){
        playMenuBeep();
        try{ localStorage.setItem(wideGameplayKey, toggleWideGameplayHome.checked ? "1" : "0"); }catch(e){}
      });
    }
    if(toggleMousepadAutoHome){
      toggleMousepadAutoHome.addEventListener("change", function(){
        playMenuBeep();
        try{ localStorage.setItem(mousepadAutoKey, toggleMousepadAutoHome.checked ? "1" : "0"); }catch(e){}
      });
    }
      btnCloseSettingsBottom.addEventListener("click", function(){
        playMenuBeep();
        settingsOverlay.classList.remove("show");
        stopAllPreviewAudioHome();
      });
    }
    if (btnClosePowerupsHome && powerupsOverlayHome) {
      btnClosePowerupsHome.addEventListener("click", function(){
        playMenuBeep();
        powerupsOverlayHome.classList.remove("show");
        if(settingsOverlay) settingsOverlay.classList.add("show");
        stopAllPreviewAudioHome();
      });
    }
    if (btnBackPowerupsHome && powerupsOverlayHome) {
      btnBackPowerupsHome.addEventListener("click", function(){
        playMenuBeep();
        powerupsOverlayHome.classList.remove("show");
        if(settingsOverlay) settingsOverlay.classList.add("show");
        stopAllPreviewAudioHome();
      });
    }
    if (btnCloseSfxHome && sfxOverlayHome) {
      btnCloseSfxHome.addEventListener("click", function(){
        playMenuBeep();
        sfxOverlayHome.classList.remove("show");
        if(settingsOverlay) settingsOverlay.classList.add("show");
        stopAllPreviewAudioHome();
      });
    }
    if (btnBackSfxHome && sfxOverlayHome) {
      btnBackSfxHome.addEventListener("click", function(){
        playMenuBeep();
        sfxOverlayHome.classList.remove("show");
        if(settingsOverlay) settingsOverlay.classList.add("show");
        stopAllPreviewAudioHome();
      });
    }

    function setFullscreenLabel(btn, isFull){
      if(!btn) return;
      btn.textContent = isFull ? "Exit Fullscreen" : "Enter Fullscreen";
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
          setFullscreenLabel(btnFullscreenHome, state);
          return;
        }catch(e){}
      }
      if(document.fullscreenElement){
        try{ await document.exitFullscreen(); }catch(e){}
      }else{
        try{ await document.documentElement.requestFullscreen(); }catch(e){}
      }
      setFullscreenLabel(btnFullscreenHome, !!document.fullscreenElement);
    }

    if(btnFullscreenHome){
      btnFullscreenHome.addEventListener("click", function(){
        playMenuBeep();
        toggleFullscreen();
      });
      getFullscreenState().then(function(state){ setFullscreenLabel(btnFullscreenHome, state); });
    }
    document.addEventListener("fullscreenchange", function(){
      setFullscreenLabel(btnFullscreenHome, !!document.fullscreenElement);
    });
    if (btnCloseCampaign && campaignOverlay) {
      btnCloseCampaign.addEventListener("click", function(){
        playMenuBeep();
        campaignOverlay.classList.remove("show");
        if(menuWrap) menuWrap.classList.remove("hidden");
      });
    }
    if (btnCampaignBack) {
      btnCampaignBack.addEventListener("click", function(){
        playMenuBeep();
        showCampaignSelectView();
      });
    }
    if (btnCloseFunnel && funnelOverlay) {
      btnCloseFunnel.addEventListener("click", function(){
        playMenuBeep();
        campaignShipSelect = false;
        pendingCampaign = null;
        pendingConfig = null;
        funnelOverlay.classList.remove("show");
        if(menuWrap) menuWrap.classList.remove("hidden");
      });
    }
    if (btnCampaignStart) {
      btnCampaignStart.addEventListener("click", function(){
        playMenuBeep();
        var activeId = getActiveCampaignId();
        var missions = getActiveCampaignMissions();
        var maxFailures = getCampaignMaxFailures();
        var state = loadCampaignState(activeId);
        if(state.failed || state.failures >= maxFailures) return;
        var hasProgress = (state.index || 0) > 0 || (state.completed || []).some(function(v){ return v; });
        if(hasProgress && campaignConfirmOverlay){
          campaignConfirmOverlay.classList.add("show");
          return;
        }
        var idx = state.index || 0;
        if(idx >= missions.length) return;
        startCampaignMission(idx, activeId);
        if(campaignOverlay) campaignOverlay.classList.remove("show");
        if(menuWrap) menuWrap.classList.remove("hidden");
      });
    }
    if (btnCampaignContinue) {
      btnCampaignContinue.addEventListener("click", function(){
        playMenuBeep();
        var activeId = getActiveCampaignId();
        var missions = getActiveCampaignMissions();
        var maxFailures = getCampaignMaxFailures();
        var state = loadCampaignState(activeId);
        if(state.failed || state.failures >= maxFailures) return;
        var idx = state.index || 0;
        if(idx >= missions.length) return;
        startCampaignMission(idx, activeId);
        if(campaignOverlay) campaignOverlay.classList.remove("show");
        if(menuWrap) menuWrap.classList.remove("hidden");
      });
    }
    if (btnCampaignReset) {
      btnCampaignReset.addEventListener("click", function(){
        playMenuBeep();
        resetCampaignState(getActiveCampaignId());
        ensureCampaignData();
        renderCampaignSetList();
        renderCampaignList();
        updateCampaignStatus();
      });
    }
    if (btnCampaignConfirmStart && campaignConfirmOverlay) {
      btnCampaignConfirmStart.addEventListener("click", function(){
        playMenuBeep();
        var activeId = getActiveCampaignId();
        resetCampaignState(activeId);
        ensureCampaignData();
        renderCampaignSetList();
        renderCampaignList();
        updateCampaignStatus();
        campaignConfirmOverlay.classList.remove("show");
        startCampaignMission(0, activeId);
        if(campaignOverlay) campaignOverlay.classList.remove("show");
        if(menuWrap) menuWrap.classList.remove("hidden");
      });
    }
    if (btnCampaignConfirmContinue && campaignConfirmOverlay) {
      btnCampaignConfirmContinue.addEventListener("click", function(){
        playMenuBeep();
        var activeId = getActiveCampaignId();
        var state = loadCampaignState(activeId);
        var idx = state.index || 0;
        campaignConfirmOverlay.classList.remove("show");
        startCampaignMission(idx, activeId);
        if(campaignOverlay) campaignOverlay.classList.remove("show");
        if(menuWrap) menuWrap.classList.remove("hidden");
      });
    }
    if (btnCampaignConfirmCancel && campaignConfirmOverlay) {
      btnCampaignConfirmCancel.addEventListener("click", function(){
        playMenuBeep();
        campaignConfirmOverlay.classList.remove("show");
      });
    }

    if (controlsOverlay) {
      controlsOverlay.addEventListener("click", function(e){
        if (e.target === controlsOverlay) controlsOverlay.classList.remove("show");
      });
    }
    if (leaderboardsOverlay) {
      leaderboardsOverlay.addEventListener("click", function(e){
        if (e.target === leaderboardsOverlay) leaderboardsOverlay.classList.remove("show");
      });
    }
    if (settingsOverlay) {
      settingsOverlay.addEventListener("click", function(e){
        if (e.target === settingsOverlay) settingsOverlay.classList.remove("show");
        if (e.target === settingsOverlay) stopAllPreviewAudioHome();
      });
    }
    if (powerupsOverlayHome) {
      powerupsOverlayHome.addEventListener("click", function(e){
        if (e.target === powerupsOverlayHome) {
          powerupsOverlayHome.classList.remove("show");
          if(settingsOverlay) settingsOverlay.classList.add("show");
          stopAllPreviewAudioHome();
        }
      });
    }
    if (sfxOverlayHome) {
      sfxOverlayHome.addEventListener("click", function(e){
        if (e.target === sfxOverlayHome) {
          sfxOverlayHome.classList.remove("show");
          if(settingsOverlay) settingsOverlay.classList.add("show");
          stopAllPreviewAudioHome();
        }
      });
    }
    if (campaignOverlay) {
      campaignOverlay.addEventListener("click", function(e){
        if (e.target === campaignOverlay){
          campaignOverlay.classList.remove("show");
          if(menuWrap) menuWrap.classList.remove("hidden");
        }
      });
    }
    if (campaignConfirmOverlay) {
      campaignConfirmOverlay.addEventListener("click", function(e){
        if (e.target === campaignConfirmOverlay) campaignConfirmOverlay.classList.remove("show");
      });
    }
    if (funnelOverlay) {
      funnelOverlay.addEventListener("click", function(e){
        if (e.target === funnelOverlay){
          campaignShipSelect = false;
          pendingCampaign = null;
          pendingConfig = null;
          funnelOverlay.classList.remove("show");
          if(menuWrap) menuWrap.classList.remove("hidden");
        }
      });
    }

    (function(){
      var params = new URLSearchParams(window.location.search || "");
      if(params.get("campaignPick") !== "1") return;
      var idx = parseInt(params.get("campaignIndex"), 10);
      if(Number.isNaN(idx)) return;
      var campaignId = params.get("campaignId") || getActiveCampaignId();
      setActiveCampaignId(campaignId);
      ensureCampaignData();
      var missions = getActiveCampaignMissions();
      var m = missions[idx];
      if(!m) return;
      var config = Object.assign({}, defaults, m.config);
      if(config.ship){
        pendingCampaign = { index: idx, id: campaignId };
        pendingConfig = config;
        showBriefing(config);
      }else{
        if(menuWrap) menuWrap.classList.add("hidden");
        openCampaignShipSelect(idx, config, campaignId);
      }
    })();

    (function(){
      var params = new URLSearchParams(window.location.search || "");
      if(params.get("campaignBrief") !== "1") return;
      var idx = parseInt(params.get("campaignIndex"), 10);
      if(Number.isNaN(idx)) return;
      var campaignId = params.get("campaignId") || getActiveCampaignId();
      setActiveCampaignId(campaignId);
      ensureCampaignData();
      startCampaignMission(idx, campaignId);
    })();

    if (btnStepBack) btnStepBack.addEventListener("click", function(){
      playMenuBeep();
      if((selectedOperation === "square" || selectedOperation === "rational") && stepIndex === 2){
        setStep(0);
      }else{
        setStep(stepIndex - 1);
      }
    });
    if (btnStepNext) btnStepNext.addEventListener("click", function(){
      playMenuBeep();
      if(stepIndex === 3 && isLockedShipSelected()){
        showToast("LEVEL TOO LOW. PILOT ONE OF THE AVAILABLE SHIPS.");
        return;
      }
      if(selectedOperation === "square" && stepIndex === 0){
        setStep(2);
      }else{
        setStep(stepIndex + 1);
      }
    });
    setStep(0);

    modeChoices.forEach(function(card){
      card.addEventListener("click", function(){
        playMenuBeep();
        if(card.classList.contains("disabled")) return;
        selectedMode = card.getAttribute("data-mode");
        syncModeUi();
        advanceFromChoice();
      });
    });

    operationChoices.forEach(function(card){
      card.addEventListener("click", function(){
        playMenuBeep();
        selectedOperation = card.getAttribute("data-op");
        syncModeUi();
        setStep(stepIndex);
        advanceFromChoice();
      });
    });

    submodeChoices.forEach(function(card){
      card.addEventListener("click", function(){
        playMenuBeep();
        selectedSubmode = card.getAttribute("data-sub");
        syncModeUi();
        advanceFromChoice();
      });
    });

    difficultyChoices.forEach(function(card){
      card.addEventListener("click", function(){
        playMenuBeep();
        applyPreset(card.getAttribute("data-diff"));
        advanceFromChoice();
      });
    });

    beltChoices.forEach(function(card){
      card.addEventListener("click", function(){
        if(card.dataset.locked === "true"){
          showToast("CLUSTER LOCKED");
          return;
        }
        playMenuBeep();
        setBelt(card.getAttribute("data-belt"));
        advanceFromChoice();
      });
    });

    function getSelectedShipValue(){
      var selectedShip = saved.ship || "spire";
      var selectedShipEl = document.querySelector('input[name="ship"]:checked');
      if(selectedShipEl) selectedShip = selectedShipEl.value;
      var selectedOption = shipOptions.find(function(option){ return option.dataset.ship === selectedShip; });
      if(selectedOption && selectedOption.dataset.locked === "true"){
        var fallback = shipOptions.find(function(option){ return option.dataset.locked !== "true"; });
        selectedShip = fallback ? fallback.dataset.ship : selectedShip;
      }
      return selectedShip;
    }

    function buildConfigFromForm(){
      if (!form) return Object.assign({}, defaults, saved);
      var data = new FormData(form);
      function getValue(name){
        var val = data.get(name);
        return val === null ? "" : val;
      }
      var selectedShip = getSelectedShipValue();
      return {
        aMin: Number(getValue("aMin")),
        aMax: Number(getValue("aMax")),
        bMin: Number(getValue("bMin")),
        bMax: Number(getValue("bMax")),
        decoys: Number(getValue("decoys")),
        speed: Number(getValue("speed")),
        lives: Number(getValue("lives")),
        strikes: Number(getValue("strikes")),
        difficulty: selectedDifficulty,
        volume: Number(getValue("volume")),
        sfxVolume: Number(getValue("sfxVolume")),
        musicVolume: Number(getValue("musicVolume")),
        targetMode: String(getValue("targetMode")),
        timerMode: String(getValue("timerMode")),
        questionMode: String(getValue("questionMode")),
        decoyFunction: String(getValue("decoyFunction") || "units_bias"),
        sound: true,
        ship: selectedShip,
        belt: String(getValue("belt") || selectedBelt || "dusk"),
      };
    }

    function describeWin(config){
      if(config.targetMode && String(config.targetMode).charAt(0) === "q"){
        return "Complete " + String(config.targetMode).slice(1) + " targets";
      }
      if(config.timerMode && config.timerMode !== "off"){
        return "Survive " + config.timerMode + "s";
      }
      return "Endless";
    }

    function getActiveCampaignMissions(){
      var campaign = getActiveCampaign();
      return (campaign && campaign.missions) ? campaign.missions : [];
    }

    function showCampaignSelectView(){
      if(campaignSelectView) campaignSelectView.classList.add("active");
      if(campaignMissionsView) campaignMissionsView.classList.remove("active");
    }

    function showCampaignMissionsView(){
      if(campaignSelectView) campaignSelectView.classList.remove("active");
      if(campaignMissionsView) campaignMissionsView.classList.add("active");
    }

    function renderCampaignSetList(){
      if(!campaignSetList) return;
      var activeId = getActiveCampaignId();
      campaignSetList.innerHTML = "";
      campaignSets.forEach(function(set){
        var li = document.createElement("li");
        var isActive = set.id === activeId;
        li.className = "campaignListItem campaignSetItem" + (isActive ? " selected" : "");
        li.setAttribute("data-campaign", set.id);
        li.innerHTML = ""
          + "<div class=\"campaignSetRow\">"
          + "<span class=\"campaignSetName\">" + set.name + "</span>"
          + "<span class=\"campaignStatus\">" + (isActive ? "ACTIVE" : "SELECT") + "</span>"
          + "</div>"
          + "<div class=\"campaignSetDesc\">" + set.desc + "</div>";
        li.addEventListener("click", function(){
          var id = this.getAttribute("data-campaign");
          if(!id) return;
          setActiveCampaignId(id);
          renderCampaignSetList();
          renderCampaignList();
          updateCampaignStatus();
          showCampaignMissionsView();
        });
        campaignSetList.appendChild(li);
      });
    }

    function renderCampaignDetails(index){
      if(!campaignDetails) return;
      var missions = getActiveCampaignMissions();
      var m = missions[index];
      if(!m){
        campaignDetails.textContent = "Select a mission to view its settings.";
        return;
      }
      var cfg = m.config || {};
      var modeMap = {
        digits3: "Digit Hunt 1x3",
        digits2: "Digit Hunt 1x2",
        classic: "Classic Answer",
        classic2: "Classic Answer 1x2",
        classic3: "Classic Answer 1x3",
        add_digits2: "Addition Digit Hunt 2x2",
        add_digits3: "Addition Digit Hunt 3x3",
        add_classic2: "Addition Classic 2x2",
        add_classic3: "Addition Classic 3x3",
        square_shoot: "Perfect Squares",
        square_root: "Square Roots",
        rational_frac: "Target Fraction",
        rational_dec: "Target Decimal"
      };
      var shipNameMap = {
        mk7: "Crimson MK-7",
        fizard: "Aurora Dart",
        classic: "Scarlet Classic",
        ember: "Ruby Strike",
        azure: "Azure Lancer",
        spire: "Verdant Spire",
        am2: "AM2 Scout"
      };
      var modeLabel = String(cfg.questionMode || "classic");
      var isAdd = modeLabel.indexOf("add_") === 0;
      var isSquare = modeLabel.indexOf("square_") === 0;
      var isRational = modeLabel.indexOf("rational_") === 0;
      var subLabel = "";
      if(isRational){
        subLabel = (modeLabel === "rational_dec") ? "Target Decimal" : "Target Fraction";
      }else if(isSquare){
        subLabel = (modeLabel === "square_root") ? "Shoot Roots" : "Shoot Squares";
      }else{
        var sub = (modeLabel.indexOf("3") !== -1) ? "3" : "2";
        subLabel = isAdd ? (sub + "x" + sub) : ("1x" + sub);
      }
      var detailsHtml = ""
        + "<div><b>Mission:</b> " + m.title + "</div>"
        + "<div><b>Operation:</b> " + (isRational ? "Rationals" : (isSquare ? "Squares" : (isAdd ? "Addition" : "Multiplication"))) + "</div>"
        + "<div><b>Mode:</b> " + (modeMap[modeLabel] || modeLabel.toUpperCase()) + "</div>"
        + "<div><b>Submode:</b> " + subLabel + "</div>"
        + "<div><b>Difficulty:</b> " + String(cfg.difficulty || "normal").toUpperCase() + "</div>"
        + "<div><b>Targets:</b> " + (cfg.targetMode === "off" ? "Endless" : String(cfg.targetMode)) + "</div>"
        + "<div><b>Timer:</b> " + (cfg.timerMode === "off" ? "Endless" : (cfg.timerMode + "s")) + "</div>"
        + "<div><b>Decoys:</b> " + String(cfg.decoys || 0) + "</div>"
        + "<div><b>Speed:</b> " + String(cfg.speed || 0) + "</div>"
        + "<div><b>Lives:</b> " + String(cfg.lives || 0) + "</div>"
        + "<div><b>Strikes:</b> " + String(cfg.strikes || 0) + "</div>"
        + "<div><b>Ship:</b> " + (cfg.ship ? (shipNameMap[cfg.ship] || cfg.ship.toUpperCase()) : "Player Choice") + "</div>";
      campaignDetails.innerHTML = detailsHtml;
    }

    function renderCampaignList(){
      if(!campaignList) return;
      campaignList.innerHTML = "";
      var missions = getActiveCampaignMissions();
      var state = loadCampaignState(getActiveCampaignId());
      for(var i=0; i<missions.length; i++){
        var m = missions[i];
        var li = document.createElement("li");
        var isDone = state.completed && state.completed[i];
        var isCurrent = i === (state.index || 0);
        var status = isDone ? "COMPLETED" : (isCurrent ? "CURRENT" : "LOCKED");
        var win = describeWin(m.config);
        li.className = "campaignListItem" + (isDone ? " completed" : "") + (isCurrent ? " current" : "");
        li.setAttribute("data-index", String(i));
        li.innerHTML = "<span>" + (i + 1) + ". " + m.title + " - " + win + "</span>"
          + "<span class=\"campaignStatus\">" + (isDone ? "\u2713" : "") + " " + status + "</span>";
        li.addEventListener("click", function(){
          var idx = parseInt(this.getAttribute("data-index"), 10);
          renderCampaignDetails(idx);
          var items = campaignList.querySelectorAll(".campaignListItem");
          for(var k=0; k<items.length; k++){
            items[k].classList.toggle("selected", items[k] === this);
          }
        });
        campaignList.appendChild(li);
      }
      var startIndex = (state.index || 0);
      renderCampaignDetails(startIndex);
      var items = campaignList.querySelectorAll(".campaignListItem");
      for(var k=0; k<items.length; k++){
        var idx = parseInt(items[k].getAttribute("data-index"), 10);
        items[k].classList.toggle("selected", idx === startIndex);
      }
    }

    function updateCampaignStatus(){
      if(!campaignStatusText) return;
      var campaign = getActiveCampaign();
      var missions = getActiveCampaignMissions();
      var maxFailures = getCampaignMaxFailures();
      var state = loadCampaignState(campaign.id);
      var hasProgress = (state.index || 0) > 0 || (state.completed || []).some(function(v){ return v; });
      if(state.failed || state.failures >= maxFailures){
        campaignStatusText.textContent = campaign.name + " failed. Reset to try again.";
        if(btnCampaignStart) btnCampaignStart.disabled = true;
        if(btnCampaignContinue) btnCampaignContinue.style.display = "none";
        return;
      }
      var idx = state.index || 0;
      var remaining = maxFailures - (state.failures || 0);
      if(idx >= missions.length){
        campaignStatusText.textContent = campaign.name + " complete. Great flying.";
        if(btnCampaignStart) btnCampaignStart.disabled = true;
        if(btnCampaignContinue) btnCampaignContinue.style.display = "none";
        return;
      }
      campaignStatusText.textContent = campaign.name + " - Mission " + (idx + 1) + " of " + missions.length + " - Failures left: " + remaining;
      if(btnCampaignStart) btnCampaignStart.disabled = false;
      if(btnCampaignContinue) btnCampaignContinue.style.display = hasProgress ? "inline-flex" : "none";
    }

    function openCampaignShipSelect(index, config, campaignId){
      pendingCampaign = { index: index, id: campaignId || getActiveCampaignId() };
      pendingConfig = config;
      campaignShipSelect = true;
      if(menuWrap) menuWrap.classList.add("hidden");
      if(funnelOverlay) funnelOverlay.classList.add("show");
      setStep(3);
      scheduleShipCarouselSync();
    }

    function startCampaignMission(index, campaignId){
      var activeId = campaignId || getActiveCampaignId();
      var missions = getCampaignSet(activeId).missions || [];
      var m = missions[index];
      if(!m) return;
      campaignShipSelect = false;
      var config = Object.assign({}, defaults, m.config);
      if(config.ship){
        pendingCampaign = { index: index, id: activeId };
        pendingConfig = config;
        showBriefing(config);
      }else{
        openCampaignShipSelect(index, config, activeId);
      }
    }

    function startTutorial(){
      if(tutorialPending) return;
      tutorialPending = true;
      document.body.classList.add("launching");
      try{
        var params = new URLSearchParams({
          tutorial: "1",
          autoStart: "1",
          aMin: "2",
          aMax: "6",
          bMin: "2",
          bMax: "6",
          decoys: "2",
          decoyFunction: "units_bias",
          speed: "0.55",
          lives: "10",
          difficulty: "easy",
          volume: String(getHomeVolume()),
          sfxVolume: String(getHomeSfxVolume()),
          musicVolume: String(getHomeMusicVolume()),
          targetMode: "off",
          timerMode: "off",
          questionMode: "classic",
          sound: "1",
          ship: "spire",
          belt: "dusk"
        });
        setTimeout(function(){
          window.location.href = "asteroid_blaster.html?" + params.toString();
        }, 700);
      }catch(err){
        console.error(err);
        tutorialPending = false;
        document.body.classList.remove("launching");
        showToast("Unable to launch tutorial");
      }
    }

    function startGame(){
      var config = buildConfigFromForm();
      if(campaignShipSelect && pendingCampaign && pendingConfig){
        config = Object.assign({}, pendingConfig, { ship: getSelectedShipValue() });
        pendingConfig = config;
      }else{
        persistSessionConfig("asteroidConfig", config);
        pendingConfig = config;
        pendingCampaign = null;
      }
      campaignShipSelect = false;
      showBriefing(config);
    }

    function showBriefing(config){
      document.body.classList.add("briefingOpen");
      if(menuWrap) menuWrap.classList.add("hidden");
      if(funnelOverlay) funnelOverlay.classList.remove("show");
      if(briefingOverlay) briefingOverlay.classList.add("show");
      if(window.homeDrone && !window.homeDrone.paused){
        try{ window.homeDrone.pause(); }catch(e){}
      }
      briefingReady = false;
      if(briefingStatus) briefingStatus.classList.remove("ready");
      if(briefingTimerId) clearTimeout(briefingTimerId);
      if(btnBriefingSkip){
        btnBriefingSkip.disabled = true;
        btnBriefingSkip.style.opacity = "0.6";
        btnBriefingSkip.style.pointerEvents = "none";
      }
      if(briefingStatusText) briefingStatusText.textContent = "Initializing launch sequence...";

      var shipKey = (config.ship || "mk7");
      var shipNameMap = {
        mk7: "Crimson MK-7",
        fizard: "Aurora Dart",
        classic: "Scarlet Classic",
        ember: "Ruby Strike",
        azure: "Azure Lancer",
        spire: "Verdant Spire",
        am2: "AM2 Scout"
      };
      if(briefingShip) briefingShip.textContent = "Ship: " + (shipNameMap[shipKey] || shipKey.toUpperCase());
      var modeLabel = String(config.questionMode || "classic");
      if(briefingMode){
        var modeMap = {
          digits3: "Digit Hunt 1x3",
          digits2: "Digit Hunt 1x2",
          classic: "Classic Answer",
          classic2: "Classic Answer 1x2",
          classic3: "Classic Answer 1x3",
          add_digits2: "Addition Digit Hunt 2x2",
          add_digits3: "Addition Digit Hunt 3x3",
          add_classic2: "Addition Classic 2x2",
          add_classic3: "Addition Classic 3x3",
          square_shoot: "Perfect Squares",
          square_root: "Square Roots",
          rational_frac: "Target Fraction",
          rational_dec: "Target Decimal"
        };
        briefingMode.textContent = "Mode: " + (modeMap[modeLabel] || modeLabel.toUpperCase());
      }
      if(briefingDifficulty){
        var diffLabel = String(config.difficulty || "normal");
        var diffMap = { easy: "Easy", normal: "Normal", hard: "Hard", brutal: "Brutal" };
        briefingDifficulty.textContent = "Difficulty: " + (diffMap[diffLabel] || diffLabel.toUpperCase());
      }
      if(briefingOperation || briefingSubmode){
        var isAdd = modeLabel.indexOf("add_") === 0;
        var isSquare = modeLabel.indexOf("square_") === 0;
        var isRational = modeLabel.indexOf("rational_") === 0;
        var sub = "2";
        if(modeLabel.indexOf("3") !== -1) sub = "3";
        else if(modeLabel.indexOf("2") !== -1) sub = "2";
        if(briefingOperation){
          if(isRational) briefingOperation.textContent = "Operation: Rationals";
          else if(isSquare) briefingOperation.textContent = "Operation: Squares";
          else briefingOperation.textContent = "Operation: " + (isAdd ? "Addition" : "Multiplication");
        }
        if(briefingSubmode){
          if(isRational){
            briefingSubmode.textContent = "Submode: " + (modeLabel === "rational_dec" ? "Target Decimal" : "Target Fraction");
          }else if(isSquare){
            briefingSubmode.textContent = "Submode: " + (modeLabel === "square_root" ? "Shoot Roots" : "Shoot Squares");
          }else{
            briefingSubmode.textContent = "Submode: " + (isAdd ? (sub + "x" + sub) : ("1x" + sub));
          }
        }
      }
      if(briefingARange) briefingARange.textContent = config.aMin + " - " + config.aMax;
      if(briefingBRange) briefingBRange.textContent = config.bMin + " - " + config.bMax;
      if(briefingDecoys) briefingDecoys.textContent = String(config.decoys);
      if(briefingSpeed) briefingSpeed.textContent = String(config.speed);
      if(briefingLives) briefingLives.textContent = String(config.lives);
      if(briefingStrikes) briefingStrikes.textContent = String(config.strikes);
      if(briefingTargeted){
        if(config.targetMode === "off"){
          briefingTargeted.textContent = "Endless";
        }else if(String(config.targetMode).charAt(0) === "q"){
          briefingTargeted.textContent = String(config.targetMode).slice(1) + " targets";
        }else{
          briefingTargeted.textContent = String(config.targetMode);
        }
      }
      if(briefingTimer){
        if(config.timerMode === "off"){
          briefingTimer.textContent = "Endless";
        }else{
          briefingTimer.textContent = config.timerMode + "s";
        }
      }

      startHintCycle();

      briefingTimerId = setTimeout(function(){
        briefingReady = true;
        if(btnBriefingSkip){
          btnBriefingSkip.disabled = false;
          btnBriefingSkip.style.opacity = "";
          btnBriefingSkip.style.pointerEvents = "";
        }
        if(briefingStatus) briefingStatus.classList.add("ready");
        if(briefingStatusText) briefingStatusText.textContent = "Launch ready.";
      }, 7000);
    }

    function proceedLaunch(){
      if(launchPending) return;
      launchPending = true;
      if(btnLaunchGame) btnLaunchGame.disabled = true;
      if(btnBriefingSkip) btnBriefingSkip.disabled = true;
      document.body.classList.add("launching");
      document.body.classList.remove("briefingOpen");
      if(briefingHintTimer) clearInterval(briefingHintTimer);
      if(briefingHintTypeTimer) clearInterval(briefingHintTypeTimer);
      var config = pendingConfig || buildConfigFromForm();
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
        volume: String(config.volume),
        sfxVolume: String(config.sfxVolume),
        musicVolume: String(config.musicVolume),
        targetMode: config.targetMode,
        timerMode: config.timerMode,
        questionMode: config.questionMode,
        sound: "1",
        ship: config.ship,
        belt: String(config.belt || "dusk"),
        autoStart: "1",
      });
      if(pendingCampaign){
        ensureCampaignData();
        var activeId = pendingCampaign.id || getActiveCampaignId();
        setActiveCampaignId(activeId);
        var state = loadCampaignState(activeId);
        state.active = true;
        state.failed = false;
        state.index = pendingCampaign.index;
        saveCampaignState(state, activeId);
        params.set("campaign", "1");
        params.set("campaignIndex", String(pendingCampaign.index));
        params.set("campaignId", activeId);
      }
      setTimeout(function(){
        window.location.href = "asteroid_blaster.html?" + params.toString();
      }, 1000);
    }

    if (btnLaunchGame) btnLaunchGame.addEventListener("click", function(){
      playMenuBeep();
      startGame();
    });
    if (btnBriefingSkip) btnBriefingSkip.addEventListener("click", function(){
      playMenuBeep();
      if(!briefingReady) return;
      proceedLaunch();
    });
    if (briefingOverlay) {
      briefingOverlay.addEventListener("click", function(e){
        if (e.target === briefingOverlay && briefingReady) proceedLaunch();
      });
    }

    if (form) {
      form.addEventListener("submit", function(evt){
        evt.preventDefault();
        var config = buildConfigFromForm();
        persistSessionConfig("asteroidConfig", config);
        if (funnelOverlay) funnelOverlay.classList.remove("show");
      });
    }

    if (resetBtn && form) {
      resetBtn.addEventListener("click", function(){
        persistSessionConfig("asteroidConfig", defaults);
        Object.keys(defaults).forEach(function(key){
          var value = defaults[key];
          var field = form.elements.namedItem(key) || document.getElementById(key);
          if (!field) return;
          if (field.type === "checkbox") {
            field.checked = Boolean(value);
          } else {
            field.value = value;
          }
        });
        syncShipSelection(defaults.ship);
      });
    }

    var leaderboardSelection = { operation: "", modeLabel: "", submode: "" };

    function describeLeaderboardMode(modeLabel){
      var modeStr = String(modeLabel || "classic");
      var isAdd = modeStr.indexOf("add_") === 0;
      var isSquare = modeStr.indexOf("square_") === 0;
      var isRational = modeStr.indexOf("rational_") === 0;
      var operation = isRational ? "Rationals" : (isSquare ? "Squares" : (isAdd ? "Addition" : "Multiplication"));
      var modeName = "Classic Answer";
      if(isRational){
        modeName = (modeStr == "rational_dec") ? "Target Decimal" : "Target Fraction";
      }else if(isSquare){
        modeName = (modeStr == "square_root") ? "Square Roots" : "Perfect Squares";
      }else{
        modeName = (modeStr.indexOf("digits") !== -1) ? "Digit Hunt" : "Classic Answer";
      }
      var subLabel = "";
      if(isRational){
        subLabel = (modeStr == "rational_dec") ? "Decimal" : "Fraction";
      }else if(isSquare){
        subLabel = (modeStr == "square_root") ? "Shoot Roots" : "Shoot Squares";
      }else{
        var sub = (modeStr.indexOf("3") !== -1) ? "3" : "2";
        subLabel = isAdd ? (sub + "x" + sub) : ("1x" + sub);
      }
      return {
        operation: operation,
        modeLabel: modeName,
        submode: subLabel,
        key: operation + "|" + modeName + "|" + subLabel
      };
    }

    function getLeaderboardCategory(item){
      if(item && item.operation && item.modeLabel && item.submode){
        return {
          operation: item.operation,
          modeLabel: item.modeLabel,
          submode: item.submode,
          key: item.modeKey || (item.operation + "|" + item.modeLabel + "|" + item.submode)
        };
      }
      return describeLeaderboardMode(item && item.mode ? item.mode : "");
    }


    function renderHomeStats(){
      var card = document.querySelector(".leaderboardsCard");
      var hsTopEl = document.getElementById("homeHighScoresTop");
      var hsRestEl = document.getElementById("homeHighScoresRest");
      var ltEl = document.getElementById("homeLifetimeStats");
      var detailPanel = document.getElementById("homeScoreDetail");
      var detailTitle = document.getElementById("homeScoreDetailTitle");
      var detailList = document.getElementById("homeScoreDetailList");
      var opSelect = document.getElementById("homeLeaderboardOperation");
      var modeSelect = document.getElementById("homeLeaderboardMode");
      var subSelect = document.getElementById("homeLeaderboardSubmode");
      if(!hsTopEl || !hsRestEl || !ltEl) return;
      hsTopEl.innerHTML = "";
      hsRestEl.innerHTML = "";
      ltEl.innerHTML = "";
      if(detailList) detailList.innerHTML = "";
      if(card) card.classList.remove("showDetail");
      var stats = null;
      try{
        var rawStats = localStorage.getItem("mathsteroid.stats");
        if(rawStats) stats = JSON.parse(rawStats);
      }catch(e){
        stats = null;
      }

      var categoryMap = {};
      if(stats && stats.highScoresByKey){
        var keys = Object.keys(stats.highScoresByKey);
        for(var k=0; k<keys.length; k++){
          var key = keys[k];
          var list = stats.highScoresByKey[key] || [];
          if(!list.length) continue;
          var info = getLeaderboardCategory(list[0]);
          categoryMap[key] = {
            key: key,
            operation: info.operation,
            modeLabel: info.modeLabel,
            submode: info.submode,
            scores: list.slice()
          };
        }
      }
      if(!Object.keys(categoryMap).length && stats && stats.highScores){
        for(var h=0; h<stats.highScores.length; h++){
          var item = stats.highScores[h];
          var info2 = getLeaderboardCategory(item);
          var key2 = info2.key;
          if(!categoryMap[key2]){
            categoryMap[key2] = {
              key: key2,
              operation: info2.operation,
              modeLabel: info2.modeLabel,
              submode: info2.submode,
              scores: []
            };
          }
          categoryMap[key2].scores.push(item);
        }
      }

      var categories = Object.keys(categoryMap).map(function(key){ return categoryMap[key]; });
      categories.sort(function(a,b){
        if(a.operation !== b.operation) return a.operation.localeCompare(b.operation);
        if(a.modeLabel !== b.modeLabel) return a.modeLabel.localeCompare(b.modeLabel);
        return a.submode.localeCompare(b.submode);
      });

      function setSelectOptions(select, options, selectedValue){
        if(!select) return;
        select.innerHTML = "";
        for(var i=0; i<options.length; i++){
          var opt = document.createElement("option");
          opt.value = options[i];
          opt.textContent = options[i];
          if(options[i] === selectedValue) opt.selected = true;
          select.appendChild(opt);
        }
      }

      if(opSelect && modeSelect && subSelect){
        if(!categories.length){
          setSelectOptions(opSelect, ["-"]);
          setSelectOptions(modeSelect, ["-"]);
          setSelectOptions(subSelect, ["-"]);
          opSelect.disabled = true;
          modeSelect.disabled = true;
          subSelect.disabled = true;
        }else{
          opSelect.disabled = false;
          modeSelect.disabled = false;
          subSelect.disabled = false;
          var ops = [];
          for(var o=0; o<categories.length; o++){
            if(ops.indexOf(categories[o].operation) === -1) ops.push(categories[o].operation);
          }
          if(ops.indexOf(leaderboardSelection.operation) === -1){
            leaderboardSelection.operation = ops[0];
            leaderboardSelection.modeLabel = "";
            leaderboardSelection.submode = "";
          }
          setSelectOptions(opSelect, ops, leaderboardSelection.operation);

          var modes = [];
          for(var m=0; m<categories.length; m++){
            if(categories[m].operation !== leaderboardSelection.operation) continue;
            if(modes.indexOf(categories[m].modeLabel) === -1) modes.push(categories[m].modeLabel);
          }
          if(modes.indexOf(leaderboardSelection.modeLabel) === -1){
            leaderboardSelection.modeLabel = modes[0];
            leaderboardSelection.submode = "";
          }
          setSelectOptions(modeSelect, modes, leaderboardSelection.modeLabel);

          var submodes = [];
          for(var s=0; s<categories.length; s++){
            if(categories[s].operation !== leaderboardSelection.operation) continue;
            if(categories[s].modeLabel !== leaderboardSelection.modeLabel) continue;
            if(submodes.indexOf(categories[s].submode) === -1) submodes.push(categories[s].submode);
          }
          if(submodes.indexOf(leaderboardSelection.submode) === -1){
            leaderboardSelection.submode = submodes[0];
          }
          setSelectOptions(subSelect, submodes, leaderboardSelection.submode);

          opSelect.onchange = function(){
            leaderboardSelection.operation = opSelect.value;
            leaderboardSelection.modeLabel = "";
            leaderboardSelection.submode = "";
            renderHomeStats();
          };
          modeSelect.onchange = function(){
            leaderboardSelection.modeLabel = modeSelect.value;
            leaderboardSelection.submode = "";
            renderHomeStats();
          };
          subSelect.onchange = function(){
            leaderboardSelection.submode = subSelect.value;
            renderHomeStats();
          };
        }
      }

      var activeCategory = null;
      if(categories.length){
        var activeKey = leaderboardSelection.operation + "|" + leaderboardSelection.modeLabel + "|" + leaderboardSelection.submode;
        activeCategory = categoryMap[activeKey];
        if(!activeCategory){
          activeCategory = categories[0];
          leaderboardSelection.operation = activeCategory.operation;
          leaderboardSelection.modeLabel = activeCategory.modeLabel;
          leaderboardSelection.submode = activeCategory.submode;
        }
      }

      var hs = activeCategory ? activeCategory.scores.slice() : [];
      hs.sort(function(a,b){ return b.score - a.score; });
      var top = hs.slice(0,5);
      var rest = hs.slice(5);

      function buildRow(item, rank){
        var row = document.createElement("li");
        var name = item.name ? ("  - " + item.name) : "";
        row.innerHTML = "<span>#" + rank + "  - " + item.score + " pts" + name + "</span><b>Lv " + item.level + "</b>";
        row.dataset.scoreId = item.id || "";
        row.style.cursor = "pointer";
        row.addEventListener("click", function(){
          if(!detailPanel || !detailList || !card) return;
          detailList.innerHTML = "";
          var date = item.date ? new Date(item.date) : null;
          var title = (item.name ? item.name + "  - " : "") + item.score + " pts";
          if(detailTitle) detailTitle.textContent = title;
          var info = getLeaderboardCategory(item);
          var rows = [
            ["SCORE", item.score],
            ["LEVEL", item.level],
            ["CORRECT", item.correct],
            ["OPERATION", info.operation || "-"],
            ["MODE", info.modeLabel || "-"],
            ["SUBMODE", info.submode || "-"],
            ["DATE", date ? date.toLocaleString() : "-"]
          ];
          for(var r=0;r<rows.length;r++){
            var li = document.createElement("li");
            li.innerHTML = "<span>" + rows[r][0] + "</span><b>" + rows[r][1] + "</b>";
            detailList.appendChild(li);
          }
          card.classList.add("showDetail");
        });
        return row;
      }

      if(!hs.length){
        var liEmpty = document.createElement("li");
        liEmpty.innerHTML = '<span>NO SCORES YET</span><b class="pillGood">PLAY</b>';
        hsTopEl.appendChild(liEmpty);
      }else{
        for(var i=0;i<top.length;i++){
          hsTopEl.appendChild(buildRow(top[i], i + 1));
        }
        if(!rest.length){
          var liRest = document.createElement("li");
          liRest.innerHTML = '<span>NO MORE SCORES</span><b class="pillGood">-</b>';
          hsRestEl.appendChild(liRest);
        }else{
          for(var j=0;j<rest.length;j++){
            hsRestEl.appendChild(buildRow(rest[j], j + 6));
          }
        }
      }

      if(!stats){
        var li1 = document.createElement("li");
        li1.innerHTML = "<span>BEST SCORE</span><b>0</b>";
        ltEl.appendChild(li1);
        var li2 = document.createElement("li");
        li2.innerHTML = "<span>SESSIONS</span><b>0</b>";
        ltEl.appendChild(li2);
      }else{
        var rows = [
          ["SESSIONS", stats.sessions],
          ["BEST SCORE", stats.bestScore],
          ["BEST STREAK", stats.bestStreak],
          ["TOTAL CORRECT", stats.totalCorrect]
        ];
        for(var r=0;r<rows.length;r++){
          var li3 = document.createElement("li");
          li3.innerHTML = "<span>" + rows[r][0] + "</span><b>" + rows[r][1] + "</b>";
          ltEl.appendChild(li3);
        }
      }
    }

    var btnScoreBack = document.getElementById("btnScoreBack");
    if(btnScoreBack){
      btnScoreBack.addEventListener("click", function(){
        var card = document.querySelector(".leaderboardsCard");
        if(card) card.classList.remove("showDetail");
      });
    }

    function playHomeDrone(){
      try{
        var drone = new Audio("sfx/ship_drone.mp3");
        drone.loop = true;
        drone.volume = 0.22 * getHomeVolume() * getHomeSfxVolume();
        window.homeDrone = drone;
        var startDrone = function(){
          drone.play().catch(function(){});
          window.removeEventListener("keydown", startDrone);
          window.removeEventListener("pointerdown", startDrone);
        };
        window.addEventListener("keydown", startDrone, { once: true });
        window.addEventListener("pointerdown", startDrone, { once: true });
      }catch(e){
        // ignore audio failures
      }
    }
    playHomeDrone();

  