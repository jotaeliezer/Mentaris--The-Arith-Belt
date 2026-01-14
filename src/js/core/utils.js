"use strict";

export function clamp(n, a, b){
  return Math.max(a, Math.min(b, n));
}

export function rand(a, b){
  return Math.random() * (b - a) + a;
}

export function randi(a, b){
  return Math.floor(rand(a, b + 1));
}

export function factKey(a, b){
  var x = Math.min(a, b);
  var y = Math.max(a, b);
  return String(x) + "×" + String(y);
}
