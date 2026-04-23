"use strict";

/**
 * Copies public/ -> dev/public/ (gitignored) and patches home.html with a
 * Multiplayer menu entry + stub overlay for local testing without touching
 * the tracked public/home.html.
 *
 * Re-run after: npm run build, or whenever you change assets under public/.
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const srcPublic = path.join(root, "public");
const devRoot = path.join(root, "dev");
const destPublic = path.join(devRoot, "public");

const BTN_MARKER =
  '          <button id="btnLeaderboards" class="btn secondaryLabel menuExtra" type="button">Leaderboards <small>Top runs</small></button>';

const OVERLAY_ANCHOR = '  </div>\n\n  <div id="briefingOverlay"';

const OVERLAY_BLOCK =
  '  </div>\n\n' +
  '  <div id="multiplayerDevOverlay" class="overlay">\n' +
  '    <style>\n' +
  '      #multiplayerDevOverlay .multiplayerModeBtn.is-active{ box-shadow: 0 0 0 2px rgba(255,255,255,.45) inset; }\n' +
  '      #multiplayerDevOverlay .multiplayerModeBtn:not(.is-active){ opacity: 0.84; }\n' +
  '    </style>\n' +
  '    <div class="card" style="max-width: min(640px, 96vw);">\n' +
  '      <div class="cardHead">\n' +
  '        <div>\n' +
  '          <h2 class="title">Multiplayer</h2>\n' +
  '          <p class="subtitle">Dev workspace — pick a mode; lobby &amp; Supabase wiring comes next.</p>\n' +
  "        </div>\n" +
  '        <button type="button" id="btnCloseMultiplayerDev" class="btn">Close</button>\n' +
  "      </div>\n" +
  '      <div class="cardBody">\n' +
  '        <p class="monoSmall" style="margin:0 0 4px;letter-spacing:0.08em;text-transform:uppercase;font-size:11px;color:var(--muted);">Mode</p>\n' +
  '        <div class="multiplayerModeRow" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:4px;">\n' +
  '          <button type="button" id="btnMultiplayerModeCompetitive" class="btn multiplayerModeBtn" aria-pressed="false" style="min-height:88px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-color:rgba(255,120,100,.5);background:rgba(255,80,60,.12);border-radius:14px;">\n' +
  '            <span style="font-size:16px;letter-spacing:0.06em;">Competitive</span>\n' +
  '            <small style="font-weight:600;opacity:0.88;line-height:1.3;text-align:center;">Head-to-head · compare runs &amp; scores</small>\n' +
  "          </button>\n" +
  '          <button type="button" id="btnMultiplayerModeCoop" class="btn multiplayerModeBtn" aria-pressed="false" style="min-height:88px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-color:rgba(0,229,255,.45);background:rgba(0,229,255,.1);border-radius:14px;">\n' +
  '            <span style="font-size:16px;letter-spacing:0.06em;">Co-op</span>\n' +
  '            <small style="font-weight:600;opacity:0.88;line-height:1.3;text-align:center;">Shared arena · same session</small>\n' +
  "          </button>\n" +
  "        </div>\n" +
  '        <p class="monoSmall" id="multiplayerModeStatus" style="margin:12px 0 0;text-align:center;min-height:1.2em;">Choose Competitive or Co-op to continue later.</p>\n' +
  '        <div id="competitiveLocalActions" style="display:none;">\n' +
  '          <p class="monoSmall" style="margin:10px 0 6px;">Competitive: two iframes, each a full game — <b>Pilot Alpha</b> (left) and <b>Pilot Beta</b> (right, Numpad 8/4/5/6 to move). Opens in a new tab.</p>\n' +
  '          <button type="button" id="btnOpenCompetitiveArenas" class="btn" style="width:100%;max-width:420px;border-color:rgba(255,120,100,.5);background:rgba(255,80,60,.1);">Open competitive (two full arenas)</button>\n' +
  "        </div>\n" +
  '        <p class="monoSmall" style="margin:14px 0 0;padding-top:12px;border-top:1px solid rgba(255,255,255,.08);color:var(--muted);">Local copy: <code>dev/public</code> — re-sync: <code>npm run dev:workspace</code> or build with <code>SYNC_DEV_WORKSPACE=1</code>.</p>\n' +
  "      </div>\n" +
  "    </div>\n" +
  "  </div>\n\n" +
  '  <div id="briefingOverlay"';

const JS_ANCHOR = `    if (btnLeaderboards && leaderboardsOverlay) {
      btnLeaderboards.addEventListener("click", function(){
        playMenuBeep();
        renderHomeStats();
        leaderboardsOverlay.classList.add("show");
      });
    }`;

const JS_PATCH =
  JS_ANCHOR +
  `
    var btnMultiplayerDev = document.getElementById("btnMultiplayerDev");
    var multiplayerDevOverlay = document.getElementById("multiplayerDevOverlay");
    var btnCloseMultiplayerDev = document.getElementById("btnCloseMultiplayerDev");
    var btnMultiplayerModeCompetitive = document.getElementById("btnMultiplayerModeCompetitive");
    var btnMultiplayerModeCoop = document.getElementById("btnMultiplayerModeCoop");
    var multiplayerModeStatus = document.getElementById("multiplayerModeStatus");
    var competitiveLocalActions = document.getElementById("competitiveLocalActions");
    var btnOpenCompetitiveArenas = document.getElementById("btnOpenCompetitiveArenas");
    function getStoredMultiplayerMode(){
      try{ return sessionStorage.getItem("mentaris.devMultiplayerMode") || ""; }catch(e){ return ""; }
    }
    function setMultiplayerModeUI(isCoop){
      if (multiplayerModeStatus) {
        multiplayerModeStatus.textContent = isCoop
          ? "Selected: Co-op — one shared run (lobby + sync to follow)."
          : "Selected: Competitive — parallel runs, compare on the board (lobby to follow).";
      }
      try{ sessionStorage.setItem("mentaris.devMultiplayerMode", isCoop ? "coop" : "competitive"); }catch(e){}
      if (btnMultiplayerModeCompetitive) {
        btnMultiplayerModeCompetitive.setAttribute("aria-pressed", isCoop ? "false" : "true");
        btnMultiplayerModeCompetitive.classList.toggle("is-active", !isCoop);
      }
      if (btnMultiplayerModeCoop) {
        btnMultiplayerModeCoop.setAttribute("aria-pressed", isCoop ? "true" : "false");
        btnMultiplayerModeCoop.classList.toggle("is-active", isCoop);
      }
      if (competitiveLocalActions) competitiveLocalActions.style.display = isCoop ? "none" : "block";
    }
    function syncMultiplayerModeFromStorage(){
      var m = getStoredMultiplayerMode();
      if (m === "coop") setMultiplayerModeUI(true);
      else if (m === "competitive") setMultiplayerModeUI(false);
    }
    if (btnMultiplayerDev && multiplayerDevOverlay) {
      btnMultiplayerDev.addEventListener("click", function(){
        playMenuBeep();
        multiplayerDevOverlay.classList.add("show");
        syncMultiplayerModeFromStorage();
      });
    }
    if (btnCloseMultiplayerDev && multiplayerDevOverlay) {
      btnCloseMultiplayerDev.addEventListener("click", function(){
        playMenuBeep();
        multiplayerDevOverlay.classList.remove("show");
      });
    }
    if (multiplayerDevOverlay) {
      multiplayerDevOverlay.addEventListener("click", function(e){
        if (e.target === multiplayerDevOverlay) multiplayerDevOverlay.classList.remove("show");
      });
    }
    if (btnMultiplayerModeCompetitive) {
      btnMultiplayerModeCompetitive.addEventListener("click", function(){
        playMenuBeep();
        setMultiplayerModeUI(false);
      });
    }
    if (btnMultiplayerModeCoop) {
      btnMultiplayerModeCoop.addEventListener("click", function(){
        playMenuBeep();
        setMultiplayerModeUI(true);
      });
    }
    if (btnOpenCompetitiveArenas) {
      btnOpenCompetitiveArenas.addEventListener("click", function(){
        playMenuBeep();
        try { window.open("competitive.html", "_blank", "noopener"); } catch (err) { window.location.href = "competitive.html"; }
      });
    }`;

function main() {
  if (!fs.existsSync(srcPublic)) {
    console.error("init_dev_workspace: missing public/");
    process.exit(1);
  }

  fs.rmSync(destPublic, { recursive: true, force: true });
  fs.mkdirSync(devRoot, { recursive: true });
  fs.cpSync(srcPublic, destPublic, { recursive: true });

  const homePath = path.join(destPublic, "home.html");
  if (!fs.existsSync(homePath)) {
    console.error("init_dev_workspace: dev/public/home.html missing after copy");
    process.exit(1);
  }

  let html = fs.readFileSync(homePath, "utf8");
  html = html.replace(/\r\n/g, "\n");

  if (!html.includes(BTN_MARKER)) {
    console.error(
      "init_dev_workspace: home.html changed; update BTN_MARKER in scripts/init_dev_workspace.js"
    );
    process.exit(1);
  }
  html = html.replace(
    BTN_MARKER,
    BTN_MARKER +
      '\n          <button id="btnMultiplayerDev" class="btn secondaryLabel menuExtra" type="button">Multiplayer <small>Lobby · dev</small></button>'
  );

  if (!html.includes(OVERLAY_ANCHOR)) {
    console.error(
      "init_dev_workspace: could not find briefing overlay anchor; update OVERLAY_ANCHOR in scripts/init_dev_workspace.js"
    );
    process.exit(1);
  }
  html = html.replace(OVERLAY_ANCHOR, OVERLAY_BLOCK);

  if (!html.includes(JS_ANCHOR)) {
    console.error(
      "init_dev_workspace: could not find leaderboards click handler; update JS_ANCHOR in scripts/init_dev_workspace.js"
    );
    process.exit(1);
  }
  html = html.replace(JS_ANCHOR, JS_PATCH);

  fs.writeFileSync(homePath, html, "utf8");

  const cfg = path.join(destPublic, "supabase_config.js");
  if (!fs.existsSync(cfg)) {
    const ex = path.join(destPublic, "supabase_config.example.js");
    if (fs.existsSync(ex)) {
      fs.copyFileSync(ex, cfg);
      console.warn(
        "init_dev_workspace: copied supabase_config.example.js -> dev/public/supabase_config.js (add real keys)."
      );
    }
  }

  try {
    const launcherSrc = path.join(__dirname, "Start_Dev_Game.bat");
    const launcherDest = path.join(devRoot, "Start_Dev_Game.bat");
    if (fs.existsSync(launcherSrc)) {
      fs.copyFileSync(launcherSrc, launcherDest);
    }
  } catch (e) {
    console.warn("init_dev_workspace: could not copy Start_Dev_Game.bat to dev/", e && e.message);
  }

  console.log("dev/public ready.");
  console.log("  Serve:  npm run dev:serve");
  console.log("  Or:     npx --yes serve dev/public -l 4173");
  console.log("  Or:     double-click dev\\Start_Dev_Game.bat (after at least one sync)");
}

main();
