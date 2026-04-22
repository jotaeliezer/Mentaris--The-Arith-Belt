#!/usr/bin/env node
/* eslint-disable no-console */
const esbuild = require("esbuild");
const path = require("path");
const { execFileSync } = require("child_process");

const watch = process.argv.includes("--watch");
const syncDev = process.env.SYNC_DEV_WORKSPACE === "1";

var devSyncTimer = null;
function scheduleDevWorkspaceSync(){
  if(!syncDev) return;
  if(devSyncTimer) clearTimeout(devSyncTimer);
  devSyncTimer = setTimeout(function(){
    try{
      execFileSync(process.execPath, [path.join(__dirname, "init_dev_workspace.js")], {
        stdio: "inherit",
        cwd: path.join(__dirname, "..")
      });
    }catch(e){
      console.error("dev workspace sync failed:", e && e.message);
    }
  }, 400);
}

const devWorkspacePlugin = {
  name: "dev-workspace-sync",
  setup: function(build){
    build.onEnd(function(result){
      if(result.errors && result.errors.length) return;
      scheduleDevWorkspaceSync();
    });
  }
};

const base = {
  bundle: true,
  sourcemap: true,
  minify: false,
  target: "es2017",
  format: "iife",
  plugins: syncDev ? [devWorkspacePlugin] : []
};

const targets = [
  Object.assign({ entryPoints: ["src/js/core/game.js"], outfile: "public/asteroid_blaster.bundle.js" }, base),
  Object.assign({ entryPoints: ["src/js/entry/mentaris_supabase.js"], outfile: "public/mentaris_supabase.bundle.js" }, base),
  Object.assign({ entryPoints: ["src/js/entry/side_ops.js"], outfile: "public/side_ops.bundle.js" }, base)
];

async function runBuild(){
  for(var i = 0; i < targets.length; i++){
    await esbuild.build(targets[i]);
  }
}

if(watch){
  Promise.all(targets.map(function(t){
    return esbuild.context(t);
  })).then(function(ctxs){
    return Promise.all(ctxs.map(function(c){ return c.watch(); }));
  }).then(function(){
    console.log("Watching for changes (game + supabase)...");
    if(syncDev) console.log("SYNC_DEV_WORKSPACE=1: dev/public will refresh after each bundle rebuild.");
  }).catch(function(err){
    console.error(err);
    process.exit(1);
  });
}else{
  runBuild().catch(function(err){
    console.error(err);
    process.exit(1);
  });
}
