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
  '    <div class="card">\n' +
  '      <div class="cardHead">\n' +
  '        <div>\n' +
  '          <h2 class="title">Multiplayer</h2>\n' +
  '          <p class="subtitle">Dev workspace — lobby &amp; Supabase Realtime experiments.</p>\n' +
  "        </div>\n" +
  '        <button type="button" id="btnCloseMultiplayerDev" class="btn">Close</button>\n' +
  "      </div>\n" +
  '      <div class="cardBody">\n' +
  '        <p class="monoSmall" style="margin:0 0 12px;">This copy lives under <code>dev/public</code> (not committed). Re-sync after changing <code>public/</code>:</p>\n' +
  '        <pre style="margin:0;padding:10px 12px;border-radius:10px;background:rgba(0,0,0,.35);font-size:12px;overflow:auto;">npm run build\nnpm run dev:workspace</pre>\n' +
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
    if (btnMultiplayerDev && multiplayerDevOverlay) {
      btnMultiplayerDev.addEventListener("click", function(){
        playMenuBeep();
        multiplayerDevOverlay.classList.add("show");
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
