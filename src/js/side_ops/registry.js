"use strict";

import * as perfectMatch from "./games/perfect_match.js";
import * as rootMatch from "./games/root_match.js";
import * as fractionMatch from "./games/fraction_match.js";
import * as gridMaster from "./games/grid_master.js";
import * as neonSnake from "./games/neon_snake.js";

/**
 * Side Ops is organized into three "panels" on the hub:
 *   1. Memory Belts  — a group of card-matching drills (Perfect / Root /
 *      Fraction Match). Tapping the panel opens a sub-hub with the variants.
 *   2. Grid Master   — single-game panel (mental-math sprint).
 *   3. Collections   — single-game panel (ship vs asteroids; formerly Neon
 *      Snake).
 *
 * Each category entry is either:
 *   - a group:  { id, title, tagline, blurb, games: [descriptor, ...] }
 *   - a single: { id, title, tagline, blurb, game: descriptor }
 *
 * Individual game descriptors retain their original ids so per-game
 * localStorage keys (like sideOps.neonSnake.best) keep working across the
 * rename.
 */

const CATEGORIES = [
  {
    id: "memory_belts",
    title: "Memory Belts",
    tagline: "Memory \u2022 Matching drills",
    blurb: "Card-matching belts for squares, roots, and decimals. Flip, match, clear.",
    games: [
      perfectMatch.descriptor,
      rootMatch.descriptor,
      fractionMatch.descriptor
    ]
  },
  {
    id: "grid_master_panel",
    title: gridMaster.descriptor.title,
    tagline: gridMaster.descriptor.tagline,
    blurb: gridMaster.descriptor.blurb,
    game: gridMaster.descriptor
  },
  {
    id: "collections_panel",
    title: neonSnake.descriptor.title,
    tagline: neonSnake.descriptor.tagline,
    blurb: neonSnake.descriptor.blurb,
    game: neonSnake.descriptor
  }
];

const ALL_GAMES = [
  perfectMatch.descriptor,
  rootMatch.descriptor,
  fractionMatch.descriptor,
  gridMaster.descriptor,
  neonSnake.descriptor
];

export function listCategories(){ return CATEGORIES.slice(); }

export function getCategory(id){
  for(var i = 0; i < CATEGORIES.length; i++){
    if(CATEGORIES[i].id === id) return CATEGORIES[i];
  }
  return null;
}

export function listGames(){ return ALL_GAMES.slice(); }

export function getGame(id){
  for(var i = 0; i < ALL_GAMES.length; i++){
    if(ALL_GAMES[i].id === id) return ALL_GAMES[i];
  }
  return null;
}
