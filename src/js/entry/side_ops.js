"use strict";

import { start } from "../side_ops/shell.js";
import { mountFloatingAsteroidBg } from "../side_ops/fx/floating_bg.js";

function boot(){
  const root = document.getElementById("sideOpsRoot");
  if(!root){
    console.error("Side Ops root element not found");
    return;
  }
  mountFloatingAsteroidBg(14);
  start(root);
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
