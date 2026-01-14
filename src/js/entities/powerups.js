"use strict";

// Lightweight manager stub so powerups can evolve without touching core loop.
export var POWERUPS = [
  {
    id:"slowmo",
    label:"Time Dilation",
    desc:"Brief slow-mo after a correct hit.",
    apply:function(state){
      state.slowMoRemaining = Math.max(state.slowMoRemaining, 0.10);
      state.slowMoScale = 0.42;
    }
  },
  {
    id:"hull-boost",
    label:"Hull Nanites",
    desc:"Small hull repair after a long streak.",
    apply:function(state, player){
      player.hull = Math.min(1, player.hull + 0.12);
    }
  }
];

export function PowerupManager(state, player){
  this.state = state;
  this.player = player;
  this.queue = [];
}

PowerupManager.prototype.grant = function(id){
  var p = POWERUPS.find(function(pp){ return pp.id === id; });
  if(p) this.queue.push(p);
};

PowerupManager.prototype.flush = function(){
  while(this.queue.length){
    var p = this.queue.shift();
    p.apply(this.state, this.player);
  }
};

PowerupManager.prototype.update = function(){
  this.flush();
};
