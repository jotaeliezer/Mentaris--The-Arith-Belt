"use strict";

/** @param {number} v @param {number} a @param {number} b */
export function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

/**
 * @param {Set<string>} opsEnabled
 * @param {boolean} includeSquares
 * @param {boolean} includeRoots
 * @param {number} sqStart
 * @param {number} sqEnd
 * @returns {{ text: string, answer: number }}
 */
export function makeQuestion(opsEnabled, includeSquares, includeRoots, sqStart, sqEnd){
  const kinds = [];
  if(opsEnabled.has("add")) kinds.push("add");
  if(opsEnabled.has("sub")) kinds.push("sub");
  if(opsEnabled.has("mul")) kinds.push("mul");
  if(opsEnabled.has("div")) kinds.push("div");
  if(includeSquares) kinds.push("square");
  if(includeRoots)   kinds.push("root");
  if(!kinds.length) kinds.push("add");
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  if(kind === "square"){
    const n = sqStart + Math.floor(Math.random() * (sqEnd - sqStart + 1));
    return { text: n + "\u00B2 = ?", answer: n * n };
  }
  if(kind === "root"){
    const n = sqStart + Math.floor(Math.random() * (sqEnd - sqStart + 1));
    return { text: "\u221A" + (n * n) + " = ?", answer: n };
  }
  let a = Math.floor(Math.random() * 11) + 2;
  let b = Math.floor(Math.random() * 11) + 2;
  if(kind === "sub"){
    if(a < b){ const t = a; a = b; b = t; }
    return { text: a + " \u2212 " + b + " = ?", answer: a - b };
  }
  if(kind === "mul"){
    a = Math.floor(Math.random() * 9) + 3;
    b = Math.floor(Math.random() * 6) + 2;
    return { text: a + " \u00d7 " + b + " = ?", answer: a * b };
  }
  if(kind === "div"){
    const divisor = Math.floor(Math.random() * 9) + 2;
    const quotient = Math.floor(Math.random() * 9) + 2;
    return { text: (divisor * quotient) + " \u00f7 " + divisor + " = ?", answer: quotient };
  }
  return { text: a + " + " + b + " = ?", answer: a + b };
}
