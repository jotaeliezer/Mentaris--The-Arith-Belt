
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
      speed: 0.9,
      lives: 3,
      timerMode: "off",
      questionMode: "digits3",
      sound: true,
      ship: "mk7",
    };

    var form = document.getElementById("homeMenu");
    var resetBtn = document.getElementById("btnReset");
    var saved = loadSessionConfig("asteroidConfig", defaults);

    Object.keys(saved).forEach(function(key) {
      var value = saved[key];
      var field = form.elements.namedItem(key);
      if (!field) return;
      if (field.type === "checkbox") {
        field.checked = Boolean(value);
      } else {
        field.value = value;
      }
    });
    var shipRadios = Array.prototype.slice.call(document.querySelectorAll('input[name="ship"]'));
    var shipOptions = Array.prototype.slice.call(document.querySelectorAll('.shipOption'));
    function syncShipSelection(value){
      shipRadios.forEach(function(radio){ radio.checked = radio.value === value; });
      shipOptions.forEach(function(option){
        option.classList.toggle('selected', option.dataset.ship === value);
      });
    }
    syncShipSelection(saved.ship || "mk7");
    shipRadios.forEach(function(radio){
      radio.addEventListener('change', function(){ syncShipSelection(radio.value); });
    });
    selectMode(saved.questionMode || "digits3");


    var startBtn = document.getElementById("btnStartGame");
    var funnelOverlay = document.getElementById("funnelOverlay");
    var menuWrap = document.getElementById("menuWrap");
    var controlsOverlay = document.getElementById("controlsOverlay");
    var leaderboardsOverlay = document.getElementById("leaderboardsOverlay");
    var briefingOverlay = document.getElementById("briefingOverlay");
    var btnControls = document.getElementById("btnControls");
    var btnLeaderboards = document.getElementById("btnLeaderboards");
    var btnCloseFunnel = document.getElementById("btnCloseFunnel");
    var btnCloseControls = document.getElementById("btnCloseControls");
    var btnCloseLeaderboards = document.getElementById("btnCloseLeaderboards");
    var btnLaunchGame = document.getElementById("btnLaunchGame");
    var btnStepBack = document.getElementById("btnStepBack");
    var btnStepNext = document.getElementById("btnStepNext");
    var btnSaveFunnel = document.getElementById("btnSaveFunnel");
    var stepperText = document.getElementById("stepperText");
    var steps = Array.prototype.slice.call(document.querySelectorAll(".step"));
    var stepIndex = 0;
    var pendingConfig = null;
    var modeChoices = Array.prototype.slice.call(document.querySelectorAll("#modeChoices .choiceCard"));
    var difficultyChoices = Array.prototype.slice.call(document.querySelectorAll("#difficultyChoices .choiceCard"));
    var questionModeInput = document.getElementById("questionMode");

    var difficultyPresets = {
      easy: { aMin: 1, aMax: 9, bMin: 1, bMax: 9, decoys: 2, speed: 0.7, lives: 4 },
      normal: { aMin: 2, aMax: 12, bMin: 2, bMax: 12, decoys: 3, speed: 0.9, lives: 3 },
      hard: { aMin: 4, aMax: 14, bMin: 4, bMax: 14, decoys: 4, speed: 1.05, lives: 2 },
      brutal: { aMin: 6, aMax: 18, bMin: 6, bMax: 18, decoys: 5, speed: 1.2, lives: 2 }
    };

    function selectChoice(list, value, attr){
      list.forEach(function(card){
        card.classList.toggle("selected", card.getAttribute(attr) === value);
      });
    }

    function selectMode(mode){
      if(questionModeInput) questionModeInput.value = mode;
      selectChoice(modeChoices, mode, "data-mode");
    }

    function applyPreset(key){
      var preset = difficultyPresets[key];
      if(!preset) return;
      form.aMin.value = preset.aMin;
      form.aMax.value = preset.aMax;
      form.bMin.value = preset.bMin;
      form.bMax.value = preset.bMax;
      form.decoys.value = preset.decoys;
      form.speed.value = String(preset.speed);
      form.lives.value = preset.lives;
      selectChoice(difficultyChoices, key, "data-diff");
    }
    var btnBriefingSkip = document.getElementById("btnBriefingSkip");
    var briefingShip = document.getElementById("briefingShip");
    var briefingMode = document.getElementById("briefingMode");
    var briefingARange = document.getElementById("briefingARange");
    var briefingBRange = document.getElementById("briefingBRange");
    var briefingDecoys = document.getElementById("briefingDecoys");
    var briefingSpeed = document.getElementById("briefingSpeed");
    var briefingLives = document.getElementById("briefingLives");
    var briefingTimer = document.getElementById("briefingTimer");

    function setStep(idx){
      if(!steps.length) return;
      stepIndex = Math.max(0, Math.min(idx, steps.length - 1));
      steps.forEach(function(step, i){
        step.classList.toggle("active", i === stepIndex);
      });
      if(stepperText){
        var label = stepIndex === 0 ? "Mode" : stepIndex === 1 ? "Ship" : "Options";
        stepperText.textContent = "Step " + (stepIndex + 1) + " of " + steps.length + " • " + label;
      }
      if(btnStepBack) btnStepBack.style.visibility = stepIndex === 0 ? "hidden" : "visible";
      if(btnStepNext) btnStepNext.style.display = stepIndex === steps.length - 1 ? "none" : "inline-flex";
      if(btnSaveFunnel) btnSaveFunnel.style.display = stepIndex === steps.length - 1 ? "inline-flex" : "none";
      if(btnLaunchGame) btnLaunchGame.style.display = stepIndex === steps.length - 1 ? "inline-flex" : "none";
    }

    function playMenuBeep(){
      try{
      var beep = new Audio("sfx/ui/menu_beep.mp3");
        beep.volume = 0.45;
        beep.play().catch(function(){});
      }catch(e){
        // ignore audio failures
      }
    }

    if (btnControls && controlsOverlay) {
      btnControls.addEventListener("click", function(){
        playMenuBeep();
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
    if (startBtn && funnelOverlay) {
      startBtn.addEventListener("click", function(){
        playMenuBeep();
        funnelOverlay.classList.add("show");
        setStep(0);
        if(menuWrap) menuWrap.classList.add("hidden");
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
    if (btnCloseFunnel && funnelOverlay) {
      btnCloseFunnel.addEventListener("click", function(){
        playMenuBeep();
        funnelOverlay.classList.remove("show");
        if(menuWrap) menuWrap.classList.remove("hidden");
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
    if (funnelOverlay) {
      funnelOverlay.addEventListener("click", function(e){
        if (e.target === funnelOverlay){
          funnelOverlay.classList.remove("show");
          if(menuWrap) menuWrap.classList.remove("hidden");
        }
      });
    }

    if (btnStepBack) btnStepBack.addEventListener("click", function(){
      playMenuBeep();
      setStep(stepIndex - 1);
    });
    if (btnStepNext) btnStepNext.addEventListener("click", function(){
      playMenuBeep();
      setStep(stepIndex + 1);
    });
    setStep(0);

    modeChoices.forEach(function(card){
      card.addEventListener("click", function(){
        playMenuBeep();
        selectMode(card.getAttribute("data-mode"));
      });
    });

    difficultyChoices.forEach(function(card){
      card.addEventListener("click", function(){
        playMenuBeep();
        applyPreset(card.getAttribute("data-diff"));
      });
    });

    function buildConfigFromForm(){
      var data = new FormData(form);
      function getValue(name){
        var val = data.get(name);
        return val === null ? "" : val;
      }
      var selectedShip = saved.ship || "mk7";
      var selectedShipEl = document.querySelector('input[name="ship"]:checked');
      if(selectedShipEl) selectedShip = selectedShipEl.value;
      return {
        aMin: Number(getValue("aMin")),
        aMax: Number(getValue("aMax")),
        bMin: Number(getValue("bMin")),
        bMax: Number(getValue("bMax")),
        decoys: Number(getValue("decoys")),
        speed: Number(getValue("speed")),
        lives: Number(getValue("lives")),
        timerMode: String(getValue("timerMode")),
        questionMode: String(getValue("questionMode")),
        sound: true,
        ship: selectedShip,
      };
    }

    function startGame(){
      var config = buildConfigFromForm();
      persistSessionConfig("asteroidConfig", config);
      pendingConfig = config;
      showBriefing(config);
    }

    function showBriefing(config){
      if(menuWrap) menuWrap.classList.add("hidden");
      if(funnelOverlay) funnelOverlay.classList.remove("show");
      if(briefingOverlay) briefingOverlay.classList.add("show");

      var shipLabel = (config.ship || "mk7").toUpperCase();
      if(briefingShip) briefingShip.textContent = "Ship: " + shipLabel;
      if(briefingMode) briefingMode.textContent = "Mode: " + String(config.questionMode || "classic").toUpperCase();
      if(briefingARange) briefingARange.textContent = config.aMin + "–" + config.aMax;
      if(briefingBRange) briefingBRange.textContent = config.bMin + "–" + config.bMax;
      if(briefingDecoys) briefingDecoys.textContent = String(config.decoys);
      if(briefingSpeed) briefingSpeed.textContent = String(config.speed);
      if(briefingLives) briefingLives.textContent = String(config.lives);
      if(briefingTimer) briefingTimer.textContent = config.timerMode === "off" ? "Endless" : (config.timerMode + "s");
    }

    function proceedLaunch(){
      var config = pendingConfig || buildConfigFromForm();
      var params = new URLSearchParams({
        aMin: String(config.aMin),
        aMax: String(config.aMax),
        bMin: String(config.bMin),
        bMax: String(config.bMax),
        decoys: String(config.decoys),
        speed: String(config.speed),
        lives: String(config.lives),
        timerMode: config.timerMode,
        questionMode: config.questionMode,
        sound: "1",
        ship: config.ship,
        autoStart: "1",
      });
      window.location.href = "asteroid_blaster.html?" + params.toString();
    }

    if (btnLaunchGame) btnLaunchGame.addEventListener("click", function(){
      playMenuBeep();
      startGame();
    });
    if (btnBriefingSkip) btnBriefingSkip.addEventListener("click", function(){
      playMenuBeep();
      proceedLaunch();
    });
    if (briefingOverlay) {
      briefingOverlay.addEventListener("click", function(e){
        if (e.target === briefingOverlay) proceedLaunch();
      });
    }

    form.addEventListener("submit", function(evt){
      evt.preventDefault();
      var config = buildConfigFromForm();
      persistSessionConfig("asteroidConfig", config);
      if (funnelOverlay) funnelOverlay.classList.remove("show");
    });

    resetBtn.addEventListener("click", function(){
      persistSessionConfig("asteroidConfig", defaults);
      Object.keys(defaults).forEach(function(key){
        var value = defaults[key];
        var field = form.elements.namedItem(key);
        if (!field) return;
        if (field.type === "checkbox") {
          field.checked = Boolean(value);
        } else {
          field.value = value;
        }
      });
      syncShipSelection(defaults.ship);

    });

    function renderHomeStats(){
      var hsEl = document.getElementById("homeHighScores");
      var ltEl = document.getElementById("homeLifetimeStats");
      if(!hsEl || !ltEl) return;
      hsEl.innerHTML = "";
      ltEl.innerHTML = "";
      var stats = null;
      try{
        var raw = localStorage.getItem("mathsteroid.stats");
        if(raw) stats = JSON.parse(raw);
      }catch(e){
        stats = null;
      }

      var hs = stats && stats.highScores ? stats.highScores : [];
      if(!hs.length){
        var li = document.createElement("li");
        li.innerHTML = "<span>NO SCORES YET</span><b class=\"pillGood\">PLAY</b>";
        hsEl.appendChild(li);
      }else{
        for(var i=0;i<hs.length;i++){
          var item = hs[i];
          var row = document.createElement("li");
          row.innerHTML = "<span>#" + (i+1) + " • " + item.score + " pts</span><b>Lv " + item.level + "</b>";
          hsEl.appendChild(row);
        }
      }

      if(!stats){
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

    function playHomeDrone(){
      try{
      var drone = new Audio("sfx/ship/ship_drone.mp3");
        drone.loop = true;
        drone.volume = 0.22;
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

  
