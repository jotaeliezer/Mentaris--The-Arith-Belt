"use strict";

import Phaser from "phaser";

var ASTEROID_KEYS = ["asteroid1","asteroid2","asteroid3","asteroid4","asteroid6"];
var ALIEN_KEYS = ["alien_ET","alien_brain","alien_golem","alien_galaga","alien_eye","alien_saucer","alien_robot","alien_spider"];
var POWERUP_KEYS = {
  repair: "powerup_hullrepair",
  time: "powerup_timedelay",
  magnet: "powerup_magnet",
  shield: "powerup_shield",
  armor: "powerup_armor",
  emp: "powerup_EMP",
  lock: "powerup_targetlock",
  scope: "powerup_scope",
  autofire: "powerup_machinegun"
};
var BULLET_KEYS = {
  single: "bullet_single",
  laser: "bullet_laser",
  fire: "bullet_fire1",
  ice: "bullet_ice",
  electric: "bullet_electric1",
  pierce: "bullet_bola",
  plasma: "bullet_orb",
  rail: "bullet_rail",
  missile: "bullet_missile"
};

function resolvePowerupTextureKey(p){
  if(!p || !p.type) return null;
  var pu = POWERUP_KEYS[p.type];
  if(pu) return pu;
  if(p.group === "offense"){
    return BULLET_KEYS[p.type] || null;
  }
  return null;
}

var BACKGROUND_KEYS = ["background8","background1","background2","background3","background7","background9","ets_surface"];

export function createPhaserRenderer(opts){
  var options = opts || {};
  var parent = options.parent;
  var getView = options.getView;
  var getState = options.getState;
  var getData = options.getData;
  var onReady = options.onReady;

  var ready = false;
  var active = false;
  var sceneRef = null;
  var gameRef = null;

  var backgroundSprite = null;
  var starfield = null;
  var worldGroup = null;
  var spritePool = {
    asteroids: new Map(),
    bullets: new Map(),
    powerups: new Map(),
    aliens: new Map(),
    alienBullets: new Map(),
    labels: new Map(),
    missileTrails: new Map()
  };

  function preload(){}

  function create(){
    sceneRef = this;
    worldGroup = this.add.container(0, 0);

    var g = this.add.graphics();
    g.fillStyle(0x050816, 1);
    g.fillRect(0, 0, 256, 256);
    g.fillStyle(0xffffff, 0.6);
    for(var i=0; i<120; i++){
      g.fillCircle(Math.random() * 256, Math.random() * 256, Math.random() * 1.6 + 0.4);
    }
    g.generateTexture("starfield", 256, 256);
    g.destroy();
    starfield = this.add.tileSprite(0, 0, 10, 10, "starfield").setOrigin(0,0).setAlpha(0.6);
    starfield.setVisible(false);
    var initialView = getView ? getView() : null;
    if(initialView && initialView.w && initialView.h){
      starfield.setSize(initialView.w, initialView.h);
    }

    var pending = 0;
    function resolveImagePath(srcKey){
      if(ASTEROID_KEYS.indexOf(srcKey) !== -1) return "images/asteroids/" + srcKey + ".png";
      if(ALIEN_KEYS.indexOf(srcKey) !== -1) return "images/aliens/" + srcKey + ".png";
      if(srcKey === "ets_surface") return "images/backgrounds/et's_surface.jpg";
      if(BACKGROUND_KEYS.indexOf(srcKey) !== -1) return "images/backgrounds/" + srcKey + ".png";
      if(srcKey.indexOf("powerup_") === 0) return "images/powerups/" + srcKey + ".png";
      if(srcKey.indexOf("shot_") === 0) return "images/shots/" + srcKey + ".png";
      if(srcKey.indexOf("bullet_") === 0) return "images/bullets/" + srcKey + ".png";
      return "images/" + srcKey + ".png";
    }

    function addTexture(key, srcKey){
      var textureKey = key;
      var src = resolveImagePath(srcKey);
      if(sceneRef.textures.exists(textureKey)) return;
      pending += 1;
      var img = new Image();
      img.onload = function(){
        if(!sceneRef.textures.exists(textureKey)){
          sceneRef.textures.addImage(textureKey, img);
        }
        pending -= 1;
        if(pending <= 0){
          ready = true;
          if(typeof onReady === "function") onReady();
        }
      };
      img.onerror = function(){
        pending -= 1;
        if(pending <= 0){
          ready = true;
          if(typeof onReady === "function") onReady();
        }
      };
      img.src = src;
    }

    ASTEROID_KEYS.forEach(function(key){ addTexture(key, key); });
    ALIEN_KEYS.forEach(function(key){ addTexture(key, key); });
    Object.keys(POWERUP_KEYS).forEach(function(k){ addTexture(POWERUP_KEYS[k], POWERUP_KEYS[k]); });
    Object.keys(BULLET_KEYS).forEach(function(k){ addTexture(BULLET_KEYS[k], BULLET_KEYS[k]); });
    for(var i=0; i<BACKGROUND_KEYS.length; i++){
      var key = BACKGROUND_KEYS[i];
      addTexture(key, key);
    }
    if(pending === 0){
      ready = true;
      if(typeof onReady === "function") onReady();
    }

    backgroundSprite = this.add.image(0, 0, "starfield").setOrigin(0.5, 0.5).setAlpha(0.55);
    backgroundSprite.setVisible(false);
  }

  function update(){
    if(!active || !ready) return;
    if(typeof getData === "function"){
      var data = getData();
      if(data) sync(data);
    }
  }

  function resize(w, h){
    if(!gameRef || !sceneRef) return;
    gameRef.scale.resize(w, h);
    if(starfield){
      starfield.setSize(w, h);
    }
  }

  function clearPool(map){
    map.forEach(function(entry){
      if(entry && entry.destroy) entry.destroy();
    });
    map.clear();
  }

  function destroy(){
    clearPool(spritePool.asteroids);
    clearPool(spritePool.bullets);
    clearPool(spritePool.powerups);
    clearPool(spritePool.aliens);
    clearPool(spritePool.alienBullets);
    clearPool(spritePool.labels);
    clearPool(spritePool.missileTrails);
    if(gameRef){
      gameRef.destroy(true);
      gameRef = null;
    }
  }

  function ensureSprite(map, id, createFn){
    var sprite = map.get(id);
    if(!sprite){
      sprite = createFn();
      map.set(id, sprite);
    }
    return sprite;
  }

  var starScroll = 0;

  function syncBackground(data){
    if(!sceneRef || !backgroundSprite) return;
    var view = data.view;
    if(!view) return;
    var w = view.w;
    var h = view.h;
    if(data.tutorialActive){
      if(starfield){
        starfield.setVisible(true);
        starScroll += 0.35;
        starfield.setTilePosition(0, starScroll);
      }
      backgroundSprite.setVisible(false);
      return;
    }
    // Always prefer the authored background images outside tutorial.
    if(starfield) starfield.setVisible(false);
    var idx = data.backgroundIndex || 0;
    var key = BACKGROUND_KEYS[(idx % BACKGROUND_KEYS.length + BACKGROUND_KEYS.length) % BACKGROUND_KEYS.length];
    if(sceneRef.textures.exists(key)){
      if(backgroundSprite.texture.key !== key){
        backgroundSprite.setTexture(key);
      }
      backgroundSprite.setVisible(true);
    }else{
      backgroundSprite.setVisible(false);
      return;
    }
    var scale = data.backgroundScale || 1;
    var tex = backgroundSprite.texture.getSourceImage();
    var scroll = data.backgroundScroll || 0;
    if(tex && tex.width){
      var baseScale = w / tex.width;
      var dispW = tex.width * baseScale * scale;
      var dispH = tex.height * baseScale * scale;
      backgroundSprite.setDisplaySize(dispW, dispH);
      backgroundSprite.setOrigin(0.5, 1);
      backgroundSprite.setPosition(w / 2, h + scroll);
    }else{
      backgroundSprite.setPosition(w / 2, h / 2 + scroll * 0.4);
    }
  }

  function syncAsteroids(data){
    if(data.hideAsteroids){
      spritePool.asteroids.forEach(function(sprite){
        if(sprite) sprite.setVisible(false);
      });
      spritePool.labels.forEach(function(label){
        if(label) label.setVisible(false);
      });
      return;
    }
    var asteroids = data.asteroids || [];
    var seen = new Set();
    for(var i=0; i<asteroids.length; i++){
      var a = asteroids[i];
      var keyIdx = (a.spriteIndex != null ? a.spriteIndex : (a.id % ASTEROID_KEYS.length)) % ASTEROID_KEYS.length;
      var texKey = ASTEROID_KEYS[keyIdx];
      if(!sceneRef.textures.exists(texKey)) continue;
      var sprite = ensureSprite(spritePool.asteroids, a.id, function(){
        return sceneRef.add.image(a.x, a.y, texKey).setOrigin(0.5, 0.5);
      });
      if(sprite.texture.key !== texKey) sprite.setTexture(texKey);
      sprite.setPosition(a.x, a.y);
      sprite.setRotation(a.rot || 0);
      var ghostAlpha = a.ambient ? 0.95 : 0.2;
      sprite.setAlpha(a.ghost ? ghostAlpha : 0.95);
      sprite.setVisible(true);
      var size = (a.r || 24) * 2;
      sprite.setDisplaySize(size, size);
      seen.add(a.id);

      var labelId = "l" + a.id;
      if(a.label !== null && a.label !== undefined && !a.ghost){
        var fontSize = Math.max(14, Math.min(22, (a.r || 24) * 0.7));
        var label = ensureSprite(spritePool.labels, labelId, function(){
          return sceneRef.add.text(a.x, a.y, String(a.label), {
            fontFamily: "Oxanium, sans-serif",
            fontSize: fontSize + "px",
            color: "#e8ecff",
            align: "center",
            stroke: "#000000",
            strokeThickness: 2,
            backgroundColor: "rgba(0,0,0,0.62)",
            padding: { x: 6, y: 3 }
          }).setOrigin(0.5, 0.5);
        });
        label.setText(String(a.label));
        label.setPosition(a.x, a.y + 1);
        label.setStyle({
          fontSize: fontSize + "px",
          stroke: "#000000",
          strokeThickness: 2,
          backgroundColor: "rgba(0,0,0,0.62)",
          padding: { x: 6, y: 3 }
        });
        label.setAlpha(0.96);
        label.setVisible(true);
      }else{
        var existing = spritePool.labels.get(labelId);
        if(existing) existing.setVisible(false);
      }
    }
    spritePool.asteroids.forEach(function(sprite, id){
      if(!seen.has(id)){
        sprite.destroy();
        spritePool.asteroids.delete(id);
        var label = spritePool.labels.get("l" + id);
        if(label){
          label.destroy();
          spritePool.labels.delete("l" + id);
        }
      }
    });
  }

  function syncBullets(data){
    if(data.hideAsteroids){
      spritePool.bullets.forEach(function(sprite){ if(sprite) sprite.setVisible(false); });
      spritePool.missileTrails.forEach(function(trail){ if(trail) trail.setVisible(false); });
      return;
    }
    var bullets = data.bullets || [];
    var seen = new Set();
    var seenTrails = new Set();
    for(var i=0; i<bullets.length; i++){
      var b = bullets[i];
      var key = BULLET_KEYS[b.kind] || BULLET_KEYS.single;
      var id = b.uid || (b.id != null ? b.id : ("b" + i + "_" + Math.round(b.x) + "_" + Math.round(b.y)));
      if(!sceneRef.textures.exists(key)) continue;
      var sprite = ensureSprite(spritePool.bullets, id, function(){
        return sceneRef.add.image(b.x, b.y, key).setOrigin(0.5, 0.5);
      });
      if(sprite.texture.key !== key) sprite.setTexture(key);
      sprite.setPosition(b.x, b.y);
      sprite.setRotation(b.rot || 0);
      var base = (b.r || 4);
      var size = base * (b.kind === "single" ? 4.0 : 5.2);
      if(b.kind === "rail") size = base * 5.6;
      if(b.kind === "missile") size = base * 5.0;
      var tex = sprite.texture && sprite.texture.getSourceImage ? sprite.texture.getSourceImage() : null;
      if(tex && tex.width && tex.height){
        var ratio = tex.width / tex.height;
        sprite.setDisplaySize(size * ratio, size);
      }else{
        sprite.setDisplaySize(size, size);
      }
      var fa = b.fireVisualAlpha;
      var bulletAlpha = 1;
      if(b.kind === "fire" && typeof fa === "number" && isFinite(fa)){
        bulletAlpha = Math.max(0, Math.min(1, fa)) * 0.98;
      }
      sprite.setAlpha(bulletAlpha);
      seen.add(id);

      if(b.kind === "missile"){
        var trail = spritePool.missileTrails.get(id);
        if(!trail){
          trail = sceneRef.add.graphics();
          spritePool.missileTrails.set(id, trail);
        }
        trail.clear();
        if(b.trail && b.trail.length > 1){
          for(var t=1; t<b.trail.length; t++){
            var p0 = b.trail[t - 1];
            var p1 = b.trail[t];
            var alpha = t / b.trail.length;
            var color = b.boosted ? 0xffd18a : 0x78dcff;
            var width = b.boosted ? 3 : 2;
            trail.lineStyle(width, color, (b.boosted ? 0.65 : 0.45) * alpha);
            trail.beginPath();
            trail.moveTo(p0.x, p0.y);
            trail.lineTo(p1.x, p1.y);
            trail.strokePath();
          }
        }
        seenTrails.add(id);
      }
    }
    spritePool.bullets.forEach(function(sprite, id){
      if(!seen.has(id)){
        sprite.destroy();
        spritePool.bullets.delete(id);
      }
    });
    spritePool.missileTrails.forEach(function(trail, id){
      if(!seenTrails.has(id)){
        trail.destroy();
        spritePool.missileTrails.delete(id);
      }
    });
  }

  function syncPowerups(data){
    var powerups = data.powerups || [];
    var seen = new Set();
    for(var i=0; i<powerups.length; i++){
      var p = powerups[i];
      var key = resolvePowerupTextureKey(p);
      if(!key) continue;
      var id = p.uid || ("p" + i + "_" + Math.round(p.x) + "_" + Math.round(p.y));
      if(!sceneRef.textures.exists(key)) continue;
      var sprite = ensureSprite(spritePool.powerups, id, function(){
        return sceneRef.add.image(p.x, p.y, key).setOrigin(0.5, 0.5);
      });
      if(sprite.texture.key !== key) sprite.setTexture(key);
      sprite.setPosition(p.x, p.y);
      sprite.setRotation(p.rot || 0);
      var size = (p.r || 16) * 2.4;
      sprite.setDisplaySize(size, size);
      seen.add(id);
    }
    spritePool.powerups.forEach(function(sprite, id){
      if(!seen.has(id)){
        sprite.destroy();
        spritePool.powerups.delete(id);
      }
    });
  }

  function syncAliens(data){
    if(data.hideAsteroids){
      spritePool.aliens.forEach(function(sprite){ if(sprite) sprite.setVisible(false); });
      return;
    }
    var aliens = data.aliens || [];
    var seen = new Set();
    for(var i=0; i<aliens.length; i++){
      var a = aliens[i];
      var idx = (a.uid || i) % ALIEN_KEYS.length;
      var key = ALIEN_KEYS[idx];
      var id = a.uid || ("a" + i + "_" + Math.round(a.x));
      if(!sceneRef.textures.exists(key)) continue;
      var sprite = ensureSprite(spritePool.aliens, id, function(){
        return sceneRef.add.image(a.x, a.y, key).setOrigin(0.5, 0.5);
      });
      if(sprite.texture.key !== key) sprite.setTexture(key);
      sprite.setPosition(a.x, a.y);
      var size = (a.r || 24) * 2.1;
      sprite.setDisplaySize(size, size);
      seen.add(id);
    }
    spritePool.aliens.forEach(function(sprite, id){
      if(!seen.has(id)){
        sprite.destroy();
        spritePool.aliens.delete(id);
      }
    });
  }

  function syncAlienBullets(data){
    if(data.hideAsteroids){
      spritePool.alienBullets.forEach(function(sprite){ if(sprite) sprite.setVisible(false); });
      return;
    }
    var bullets = data.alienBullets || [];
    var seen = new Set();
    for(var i=0; i<bullets.length; i++){
      var b = bullets[i];
      var id = b.uid || ("ab" + i + "_" + Math.round(b.x));
      var sprite = ensureSprite(spritePool.alienBullets, id, function(){
        return sceneRef.add.circle(b.x, b.y, b.r || 4, 0x00e5ff, 0.9);
      });
      sprite.setPosition(b.x, b.y);
      sprite.setRadius(b.r || 4);
      seen.add(id);
    }
    spritePool.alienBullets.forEach(function(sprite, id){
      if(!seen.has(id)){
        sprite.destroy();
        spritePool.alienBullets.delete(id);
      }
    });
  }

  function sync(data){
    if(!ready || !sceneRef) return;
    if(!data) return;
    syncBackground(data);
    syncAsteroids(data);
    syncBullets(data);
    syncPowerups(data);
    syncAliens(data);
    syncAlienBullets(data);
  }

  function setActive(flag){
    active = !!flag;
  }

  var view = getView ? getView() : { w: 900, h: 700 };
  gameRef = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: parent,
    width: view.w || 900,
    height: view.h || 700,
    transparent: true,
    antialias: true,
    scene: { preload: preload, create: create, update: update }
  });

  return {
    ready: function(){ return ready; },
    resize: resize,
    destroy: destroy,
    sync: sync,
    setActive: setActive
  };
}
