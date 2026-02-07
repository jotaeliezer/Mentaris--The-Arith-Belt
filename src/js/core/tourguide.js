"use strict";

export function createTourGuide(options){
  var opts = options || {};
  var gameShell = opts.gameShell || document.body;
  var onComplete = typeof opts.onComplete === "function" ? opts.onComplete : function(){};
  var onSkip = typeof opts.onSkip === "function" ? opts.onSkip : onComplete;
  var onStep = typeof opts.onStep === "function" ? opts.onStep : null;
  var steps = [
    { id: "intro", title: "Welcome aboard, pilot", body: "Welcome to the Arith Belt. Let's begin your training.", autoAdvanceMs: 2000, showProgress: false },
    { id: "move_arrows", title: "Step 1: Flight Controls (Arrows)", body: "Use the Up, Down, Left, and Right arrow keys to guide the ship through dots 1-4 in order.", event: "move_arrows", hideDuringAction: true, actionPauseMs: 700, praiseTitle: "Formation clean, cadet.", praiseBody: "Arrow control confirmed. Smooth tracking." },
    { id: "move_wasd", title: "Step 2: Flight Controls (WASD)", body: "Now use W, A, S, and D to guide the ship through the same dots again.", event: "move_wasd", hideDuringAction: true, actionPauseMs: 700, praiseTitle: "WASD verified.", praiseBody: "Sharp handling. You fly like you mean it." },
    { id: "fire_once", title: "Step 3: Fire Once", body: "Tap Z or E (or click) to fire a single shot.", event: "fire", count: 1 },
    { id: "fire_again", title: "Step 4: Fire Again", body: "Tap Z or E again to fire another shot.", event: "fire", count: 1 },
    { id: "correct", title: "Step 5: Correct Hit", body: "Hit the asteroid with the correct answer.", event: "correct" },
    { id: "powerup", title: "Step 6: Powerup", body: "Collect the glowing powerup drop.", event: "powerup" },
    { id: "dash", title: "Step 7: Dash", body: "Press Space to dash through danger.", event: "dash" },
    { id: "ability", title: "Step 8: Ability", body: "Press C to use your ship ability.", event: "ability" },
    { id: "secondary_aid", title: "Step 9: Aid Weapon", body: "Use X or Q to trigger your aid weapon (Time Dilation).", event: "secondary" },
    { id: "secondary_slots", title: "Step 10: Aid Slots", body: "You have 3 aid slots on the top-right. Press 1, 2, or 3 (or numpad 1-3) to select a slot.", event: "secondary_slot", count: 1 },
    { id: "alien", title: "Step 11: Alien Contact", body: "Shoot down the alien target.", event: "alien" },
    { id: "mousepad_hybrid", title: "Step 12: Mousepad", body: "Press B to enable mousepad. Fly to dots 1-4 in order.", event: "mousepad_hybrid", hideDuringAction: true, actionPauseMs: 700 },
    { id: "portal", title: "Final Step: Portal", body: "Cadet, fly up into the portal. Mission starts on contact.", event: "portal" }
  ];
  var progressTotal = 0;
  for(var s=0; s<steps.length; s++){
    if(steps[s].showProgress === false) continue;
    progressTotal += 1;
  }
  var progressIndex = 0;
  for(var s2=0; s2<steps.length; s2++){
    if(steps[s2].showProgress === false) continue;
    progressIndex += 1;
    steps[s2].progressIndex = progressIndex;
    steps[s2].progressTotal = progressTotal;
  }
  var active = false;
  var stepIndex = 0;
  var completedSteps = {};
  var stepProgress = 0;
  var stepAccepting = false;
  var interjectSteps = null;
  var interjectIndex = 0;
  var interjectActive = false;
  var interjectOnDone = null;
  var overlay = null;
  var cardEl = null;
  var titleEl = null;
  var bodyEl = null;
  var progressEl = null;
  var skipBtn = null;
  var launchBtn = null;
  var finishTimer = null;
  var transitionTimer = null;
  var advanceTimer = null;
  var hideTimer = null;
  var typeTimers = [];
  var typeAudio = null;
  var stepRevealAt = 0;
  var minStepMs = 2000;
  var titleTypeMs = 20;
  var bodyTypeMs = 30;
  var praiseDelayMs = 2000;

  function ensureStyles(){
    if(document.getElementById("tourGuideStyles")) return;
    var style = document.createElement("style");
    style.id = "tourGuideStyles";
    style.textContent = "#tourGuide{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:0 18px 28px;pointer-events:none;z-index:20;opacity:0;transition:opacity .4s ease;font-family:\"Oxanium\",sans-serif;}#tourGuide.show{opacity:1;}#tourGuide .tourGuide-wrap{display:flex;align-items:flex-end;gap:18px;}#tourGuide .tourGuide-avatarWrap{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:220px;}#tourGuide .tourGuide-avatar{width:230px;height:230px;object-fit:contain;filter:drop-shadow(0 12px 26px rgba(0,0,0,.45));}#tourGuide .tourGuide-avatarName{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:rgba(232,236,255,.85);}#tourGuide .tourGuide-card{pointer-events:auto;background:rgba(8,12,24,.88);border:1px solid rgba(0,229,255,.35);border-radius:18px;padding:18px 20px;max-width:520px;width:min(520px,92%);box-shadow:0 18px 48px rgba(0,0,0,.5);font-family:\"Oxanium\",sans-serif;opacity:0;transform:translateY(12px);transition:opacity .45s ease, transform .45s ease;}#tourGuide.show .tourGuide-card{opacity:1;transform:translateY(0);}#tourGuide .tourGuide-card.is-fading{opacity:0;transform:translateY(8px);}#tourGuide .tourGuide-title{font-size:14px;letter-spacing:1.4px;text-transform:uppercase;color:#e8ecff;margin:0 0 8px;min-height:18px;}#tourGuide .tourGuide-body{font-size:13px;color:rgba(232,236,255,.82);line-height:1.6;margin:0 0 10px;min-height:32px;}#tourGuide .tourGuide-progress{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:rgba(232,236,255,.6);}#tourGuide .tourGuide-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:12px;}#tourGuide .tourGuide-skip{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);color:#e8ecff;border-radius:12px;padding:6px 10px;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;font-family:\"Oxanium\",sans-serif;}";
    document.head.appendChild(style);
  }

  function mount(){
    if(overlay) return;
    overlay = document.createElement("div");
    overlay.id = "tourGuide";
    overlay.innerHTML = "<div class=\"tourGuide-wrap\"><div class=\"tourGuide-avatarWrap\"><img class=\"tourGuide-avatar\" alt=\"Commander\"/><div class=\"tourGuide-avatarName\">COMMANDER SOLVER</div></div><div class=\"tourGuide-card\"><div class=\"tourGuide-title\"></div><div class=\"tourGuide-body\"></div><div class=\"tourGuide-progress\"></div><div class=\"tourGuide-actions\"><button class=\"tourGuide-skip\" type=\"button\">Skip Tutorial</button></div></div></div>";
    gameShell.appendChild(overlay);
    cardEl = overlay.querySelector(".tourGuide-card");
    titleEl = overlay.querySelector(".tourGuide-title");
    bodyEl = overlay.querySelector(".tourGuide-body");
    progressEl = overlay.querySelector(".tourGuide-progress");
    skipBtn = overlay.querySelector(".tourGuide-skip");
    var avatarEl = overlay.querySelector(".tourGuide-avatar");
    if(avatarEl){
      avatarEl.src = "images/characters/commander1.png";
      avatarEl.dataset.closed = "images/characters/commander1.png";
      avatarEl.dataset.open = "images/characters/commander2.png";
    }
    if(skipBtn){
      skipBtn.addEventListener("click", function(){
        finish(true);
      });
    }
  }

  function clearTypeTimers(){
    for(var i=0; i<typeTimers.length; i++){
      clearTimeout(typeTimers[i]);
      clearInterval(typeTimers[i]);
    }
    typeTimers.length = 0;
    stopTypeAudio();
    setCommanderTalking(false);
  }

  function setCommanderTalking(isTalking){
    if(!overlay) return;
    var avatarEl = overlay.querySelector(".tourGuide-avatar");
    if(!avatarEl) return;
    var closed = avatarEl.dataset.closed || "images/characters/commander1.png";
    var open = avatarEl.dataset.open || "images/characters/commander2.png";
    avatarEl.src = isTalking ? open : closed;
  }

  function showOverlay(){
    if(!overlay) return;
    if(hideTimer) clearTimeout(hideTimer);
    overlay.style.display = "flex";
    overlay.classList.add("show");
    if(cardEl) cardEl.classList.remove("is-fading");
    setCommanderTalking(false);
  }

  function hideOverlay(){
    if(!overlay) return;
    overlay.classList.remove("show");
    if(cardEl) cardEl.classList.add("is-fading");
    stopTypeAudio();
    setCommanderTalking(false);
  }

  function startTypeAudio(){
    try{
      if(!typeAudio){
        typeAudio = new Audio("sfx/ui/tutorial_messages.mp3");
        typeAudio.loop = true;
        typeAudio.volume = 0.4;
      }
      if(typeAudio.paused) typeAudio.play().catch(function(){});
    }catch(e){}
  }

  function stopTypeAudio(){
    if(!typeAudio) return;
    try{
      typeAudio.pause();
      typeAudio.currentTime = 0;
    }catch(e){}
  }

  function typeText(el, text, speed, done){
    if(!el){
      if(done) done();
      return;
    }
    var safeSpeed = Math.max(12, speed || 22);
    var i = 0;
    el.textContent = "";
    if(!text){
      if(done) done();
      return;
    }
    startTypeAudio();
    var timer = setInterval(function(){
      i += 1;
      el.textContent = text.slice(0, i);
      var lastChar = text.charAt(i - 1);
      if(lastChar && lastChar.trim().length > 0){
        var phase = i % 8;
        setCommanderTalking(phase < 4);
      }else{
        setCommanderTalking(false);
      }
      if(i >= text.length){
        clearInterval(timer);
        stopTypeAudio();
        setCommanderTalking(false);
        if(done) done();
      }
    }, safeSpeed);
    typeTimers.push(timer);
  }

  function scheduleNext(delay){
    if(advanceTimer) return;
    advanceTimer = setTimeout(function(){
      advanceTimer = null;
      next();
    }, Math.max(0, delay || 0));
  }

  function handleStepCompletion(step){
    if(!step || completedSteps[step.id]) return;
    completedSteps[step.id] = true;
    stepAccepting = false;
    var elapsed = Date.now() - stepRevealAt;
    var delay = Math.max(0, minStepMs - elapsed);
    var pause = step.hideDuringAction ? (step.actionPauseMs || 260) : 0;
    var showDelay = Math.max(delay, pause);
    if(step.hideDuringAction){
      clearTypeTimers();
      hideOverlay();
    }
    if(step.praiseTitle || step.praiseBody){
      showPraise(step, showDelay);
    }else{
      scheduleNext(showDelay);
    }
  }

  function showPraise(step, delay){
    if(transitionTimer) clearTimeout(transitionTimer);
    clearTypeTimers();
    showOverlay();
    transitionTimer = setTimeout(function(){
      var title = step.praiseTitle || "Well done, cadet.";
      var body = step.praiseBody || "Movement confirmed.";
      if(progressEl){
        if(step.showProgress === false){
          progressEl.textContent = "";
        }else{
          var pi = step.progressIndex || (stepIndex + 1);
          progressEl.textContent = "Step " + pi + " complete";
        }
      }
      typeText(titleEl, title, titleTypeMs, function(){
        typeText(bodyEl, body, bodyTypeMs);
      });
      scheduleNext((step.praiseDelay || praiseDelayMs) + delay);
    }, Math.max(0, delay || 0));
  }

  function showStep(index, immediate){
    if(!active || !overlay) return;
    var step = steps[index];
    if(!step){
      complete();
      return;
    }
    renderStep(step, immediate, index + 1, steps.length, false);
  }

  function renderStep(step, immediate, index, total, hideProgress){
    if(onStep) onStep(step.id, step);
    stepProgress = 0;
    stepAccepting = false;
    if(advanceTimer){
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
    clearTypeTimers();
    if(transitionTimer) clearTimeout(transitionTimer);
    showOverlay();
    if(cardEl && !immediate){
      cardEl.classList.add("is-fading");
    }
    var delay = immediate ? 0 : 260;
    transitionTimer = setTimeout(function(){
      if(cardEl) cardEl.classList.remove("is-fading");
      stepRevealAt = Date.now();
      if(progressEl){
        if(hideProgress || step.showProgress === false){
          progressEl.textContent = "";
        }else{
          var pi = step.progressIndex || index;
          var pt = step.progressTotal || total;
          progressEl.textContent = "Step " + pi + " of " + pt;
        }
      }
      typeText(titleEl, step.title, titleTypeMs, function(){
        typeText(bodyEl, step.body, bodyTypeMs, function(){
          stepAccepting = !step.autoAdvanceMs;
          if(step.autoAdvanceMs){
            scheduleNext(step.autoAdvanceMs);
          }
        });
      });
    }, delay);
  }

  function next(){
    if(interjectActive && interjectSteps && interjectSteps.length){
      interjectIndex += 1;
      if(interjectIndex >= interjectSteps.length){
        interjectActive = false;
        interjectSteps = null;
        interjectIndex = 0;
        var done = interjectOnDone;
        interjectOnDone = null;
        if(done) done();
        return;
      }
      renderStep(interjectSteps[interjectIndex], false, interjectIndex + 1, interjectSteps.length, true);
      return;
    }
    stepIndex += 1;
    showStep(stepIndex, false);
  }

  function complete(){
    if(finishTimer) clearTimeout(finishTimer);
    if(advanceTimer){
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
    clearTypeTimers();
    if(transitionTimer) clearTimeout(transitionTimer);
    if(cardEl) cardEl.classList.add("is-fading");
    transitionTimer = setTimeout(function(){
      finish(false);
    }, 260);
  }

  function finish(skipped){
    if(finishTimer) clearTimeout(finishTimer);
    stop();
    if(skipped){
      onSkip();
    }else{
      onComplete();
    }
  }

  function start(){
    if(active) return;
    active = true;
    ensureStyles();
    mount();
    if(hideTimer) clearTimeout(hideTimer);
    overlay.style.display = "flex";
    overlay.classList.remove("show");
    stepIndex = 0;
    interjectActive = false;
    interjectSteps = null;
    interjectIndex = 0;
    interjectOnDone = null;
    if(skipBtn) skipBtn.style.display = "inline-flex";
    requestAnimationFrame(function(){
      if(!overlay) return;
      overlay.classList.add("show");
      showStep(stepIndex, true);
    });
  }

  function stop(){
    active = false;
    clearTypeTimers();
    if(advanceTimer) clearTimeout(advanceTimer);
    if(transitionTimer) clearTimeout(transitionTimer);
    if(overlay){
      overlay.classList.remove("show");
      hideTimer = setTimeout(function(){
        if(overlay) overlay.style.display = "none";
      }, 320);
    }
  }

  function notify(eventName){
    if(!active || !eventName) return;
    if(!stepAccepting) return;
    var step = interjectActive ? (interjectSteps ? interjectSteps[interjectIndex] : null) : steps[stepIndex];
    if(step && step.event === eventName){
      stepProgress += 1;
      var required = step.count || 1;
      if(stepProgress >= required){
        handleStepCompletion(step);
      }
    }
  }

  function jumpTo(stepId){
    if(!active || !stepId) return;
    var idx = -1;
    for(var i=0; i<steps.length; i++){
      if(steps[i].id === stepId){ idx = i; break; }
    }
    if(idx >= 0){
      stepIndex = idx;
      renderStep(steps[stepIndex], true, stepIndex + 1, steps.length, false);
    }
  }

  function interject(sequence, onDone){
    if(!active || !sequence || !sequence.length) return;
    interjectSteps = sequence.slice();
    interjectIndex = 0;
    interjectActive = true;
    interjectOnDone = typeof onDone === "function" ? onDone : null;
    renderStep(interjectSteps[0], true, 1, interjectSteps.length, true);
  }

  return {
    start: start,
    stop: stop,
    notify: notify,
    jumpTo: jumpTo,
    interject: interject
  };
}
