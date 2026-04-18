"use strict";

import { mountMemoryMatch } from "../engines/memory_match.js";

function gcd(a, b){
  a = Math.abs(a);
  b = Math.abs(b);
  while(b){
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

function decimalWithBarHTML(n, d){
  const g = gcd(n, d);
  n = n / g;
  d = d / g;
  let rem = n % d;
  if(rem === 0) return "0";
  let digits = "";
  const seen = {};
  let idx = 0;
  while(rem !== 0 && seen[rem] === undefined){
    seen[rem] = idx++;
    rem *= 10;
    digits += Math.floor(rem / d);
    rem %= d;
  }
  if(rem === 0){
    return "0." + digits;
  }
  const cut = seen[rem];
  const nonrep = digits.slice(0, cut);
  const rep = digits.slice(cut) || "0";
  return "0." + nonrep + "<span class=\"repeatOverline\">" + rep + "</span>";
}

function buildFractionPairs(A, B){
  const seen = new Set();
  const out = [];
  for(let d = A; d <= B; d++){
    for(let n = 1; n < d; n++){
      const g = gcd(n, d);
      const p = n / g;
      const q = d / g;
      const key = p + "/" + q;
      if(!seen.has(key)){
        seen.add(key);
        out.push({
          id: key,
          faceA: key,
          faceB: decimalWithBarHTML(p, q)
        });
      }
    }
  }
  return out;
}

export const descriptor = {
  id: "fraction_match",
  title: "Fraction Match",
  tagline: "Memory \u2022 Decimals",
  blurb: "Pair each reduced fraction with its decimal expansion. Watch for the repeating bar.",
  brief: "For denominators in [Start, End], match the unique reduced fractions against their decimal forms. Repeating digits are marked with an overline.",
  configSchema: [
    { type: "number", id: "start", label: "Start denominator", default: 2, min: 2, max: 12,
      hint: "Lowest denominator to pull pairs from." },
    { type: "number", id: "end", label: "End denominator", default: 6, min: 2, max: 12,
      hint: "Highest denominator. 12 generates a large deck." }
  ],
  mount(container, config, api){
    const lo = Math.max(2, Math.min(config.start, config.end));
    const hi = Math.min(12, Math.max(config.start, config.end));
    const pairs = buildFractionPairs(lo, hi);
    return mountMemoryMatch(container, {
      pairs: pairs,
      api: api,
      htmlFaces: true,
      pairLabel: "Fractions",
      accent: "accent"
    });
  }
};
