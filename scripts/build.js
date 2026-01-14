#!/usr/bin/env node
/* eslint-disable no-console */
const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

const config = {
  entryPoints: ["src/js/core/game.js"],
  bundle: true,
  sourcemap: true,
  minify: false,
  outfile: "public/asteroid_blaster.bundle.js",
  target: "es2017",
  format: "iife"
};

if(watch){
  esbuild.context(config).then((ctx) => ctx.watch()).then(() => {
    console.log("Watching for changes...");
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  esbuild.build(config).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
