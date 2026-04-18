#!/usr/bin/env node
/* eslint-disable no-console */
const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

const base = {
  bundle: true,
  sourcemap: true,
  minify: false,
  target: "es2017",
  format: "iife"
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
