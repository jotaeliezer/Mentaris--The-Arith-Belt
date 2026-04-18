"use strict";

import { mountMemoryMatch } from "../engines/memory_match.js";

function buildPairs(start, end){
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const pairs = [];
  for(let n = lo; n <= hi; n++){
    pairs.push({
      id: n,
      faceA: n + "\u00B2",
      faceB: String(n * n)
    });
  }
  return pairs;
}

export const descriptor = {
  id: "perfect_match",
  title: "Perfect Match",
  tagline: "Memory \u2022 Squares",
  blurb: "Match each n\u00b2 tile with its numeric square. Clear the board as fast as you can.",
  brief: "Flip two cards per move. A match is a square notation (n\u00b2) paired with its value (n\u00d7n). Timer starts on your first flip.",
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
