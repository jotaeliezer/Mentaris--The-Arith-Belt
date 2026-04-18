"use strict";

import { mountMemoryMatch } from "../engines/memory_match.js";

function buildPairs(start, end){
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const pairs = [];
  for(let n = lo; n <= hi; n++){
    pairs.push({
      id: n,
      faceA: "\u221A" + (n * n),
      faceB: String(n)
    });
  }
  return pairs;
}

export const descriptor = {
  id: "root_match",
  title: "Root Match",
  tagline: "Memory \u2022 Square Roots",
  blurb: "Match each radical \u221A(n\u00b2) with its integer root. Inverse of Perfect Match.",
  brief: "Flip two cards per move. A match is a radical (\u221A of a square) paired with its positive root. Timer starts on your first flip.",
  configSchema: [
    { type: "number", id: "start", label: "Start n", default: 1, min: 1, max: 60,
      hint: "Lowest root in the deck." },
    { type: "number", id: "end", label: "End n", default: 12, min: 1, max: 60,
      hint: "Highest root. Up to 60." }
  ],
  mount(container, config, api){
    const pairs = buildPairs(config.start, config.end);
    return mountMemoryMatch(container, {
      pairs: pairs,
      api: api,
      htmlFaces: false,
      pairLabel: "Pairs",
      accent: "accent"
    });
  }
};
