"use strict";

import * as perfectMatch from "./games/perfect_match.js";
import * as rootMatch from "./games/root_match.js";
import * as fractionMatch from "./games/fraction_match.js";
import * as gridMaster from "./games/grid_master.js";
import * as neonSnake from "./games/neon_snake.js";
import * as claimField from "./games/claim_field.js";

/**
 * Side Ops is organized into hub panels:
 *   1. Memory Belts  — Perfect / Root / Fraction Match (sub-hub).
 *   2. Grid Master   — mental math sprint.
 *   3. Collections   — ship vs drifting numbered asteroids (snake-like).
 *   4. Claim Field   — drift/thrust physics, static asteroid field,
 *                       aliens pursue the ship.
 *
 * Categories are groups or singles; descriptors keep stable ids for
 * localStorage (e.g. sideOps.neonSnake.best, sideOps.claimField.best).
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
  },
  {
    id: "claim_field_panel",
    title: claimField.descriptor.title,
    tagline: claimField.descriptor.tagline,
    blurb: claimField.descriptor.blurb,
    game: claimField.descriptor
  }
];

const ALL_GAMES = [
  perfectMatch.descriptor,
  rootMatch.descriptor,
  fractionMatch.descriptor,
  gridMaster.descriptor,
  neonSnake.descriptor,
  claimField.descriptor
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
