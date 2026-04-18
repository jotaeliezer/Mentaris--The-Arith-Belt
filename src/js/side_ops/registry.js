"use strict";

import * as perfectMatch from "./games/perfect_match.js";
import * as rootMatch from "./games/root_match.js";
import * as fractionMatch from "./games/fraction_match.js";
import * as gridMaster from "./games/grid_master.js";
import * as neonSnake from "./games/neon_snake.js";

const GAMES = [
  perfectMatch.descriptor,
  rootMatch.descriptor,
  fractionMatch.descriptor,
  gridMaster.descriptor,
  neonSnake.descriptor
];

export function listGames(){ return GAMES.slice(); }

export function getGame(id){
  for(var i = 0; i < GAMES.length; i++){
    if(GAMES[i].id === id) return GAMES[i];
  }
  return null;
}
