"use strict";

import { clamp, rand } from "../core/utils.js";

export function createBackground(ctx){
  var bg = {
    stars: [],
    streaks: [],
    planets: [],
    seed: Math.random() * 1000,
    lastW: 0,
    lastH: 0,
    nebula: null,
    dt: 1/60
  };

  function buildStarfield(w, h){
    bg.stars.length = 0;
    bg.streaks.length = 0;
    bg.planets.length = 0;
    bg.lastW = w;
    bg.lastH = h;

    var area = w * h;
    var n1 = Math.floor(clamp(area / 32000, 28, 70));
    var n2 = Math.floor(clamp(area / 24000, 40, 90));
    var n3 = Math.floor(clamp(area / 19000, 50, 120));

    function addLayer(n, speed, sizeMin, sizeMax, alphaMin, alphaMax, tintChance){
      for(var i=0;i<n;i++){
        var tint = (Math.random() < tintChance)
            ? (Math.random() < 0.50 ? "cyan" : (Math.random() < 0.75 ? "mag" : "amber"))
            : "white";
        var col = (tint === "cyan") ? "rgb(0,229,255)"
                : (tint === "mag") ? "rgb(175,0,111)"
                : (tint === "amber") ? "rgb(255,221,0)"
                : "rgb(232,236,255)";

        bg.stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          sp: speed,
          r: rand(sizeMin, sizeMax),
          a: rand(alphaMin, alphaMax),
          tw: rand(0.6, 1.9),
          ph: rand(0, Math.PI*2),
          tint: tint,
          col: col
        });
      }
    }

    addLayer(n1, 8, 0.7, 1.4, 0.34, 0.75, 0.18);
    addLayer(n2, 14, 0.7, 1.6, 0.26, 0.60, 0.12);
    addLayer(n3, 22, 0.6, 2.0, 0.18, 0.46, 0.08);

    var planetCount = Math.max(1, Math.min(3, Math.floor(area / 260000)));
    var palettes = [
      ["#59c8ff", "#1463b0", "rgba(0,229,255,.35)"],
      ["#ff8bd8", "#7b1e62", "rgba(175,0,111,.35)"],
      ["#f6d065", "#a86c19", "rgba(255,221,0,.28)"],
      ["#9be37a", "#1f6b3f", "rgba(193,216,47,.25)"]
    ];
    for(var p=0;p<planetCount;p++){
      var palette = palettes[p % palettes.length];
      var edge = Math.random() < 0.5;
      var margin = 120;
      var x = edge
        ? (Math.random() < 0.5 ? rand(margin * 0.6, margin * 1.4) : rand(w - margin * 1.4, w - margin * 0.6))
        : rand(margin, w - margin);
      var y = rand(margin * 0.6, h * 0.9);
      bg.planets.push({
        x: x,
        y: y,
        r: rand(24, 62),
        sp: rand(2.5, 6.5),
        c1: palette[0],
        c2: palette[1],
        glow: palette[2],
        ring: Math.random() < 0.55,
        ringTilt: rand(-0.5, 0.5),
        ringW: rand(1.25, 1.7)
      });
    }
  }

  function maybeSpawnStreak(w, h){
    if(bg.streaks.length >= 2) return;
    if(Math.random() > 0.006) return;
    bg.streaks.push({
      x: rand(40, w - 40),
      y: rand(-h*0.2, h*0.4),
      vy: rand(420, 700),
      len: rand(120, 220),
      life: rand(0.35, 0.55),
      t: 0,
      hue: (Math.random() < 0.5) ? "cyan" : "mag"
    });
  }

  function drawStars(w,h,noPlanets){
    if(!bg.stars.length || bg.lastW !== w || bg.lastH !== h) buildStarfield(w,h);

    var t = performance.now() * 0.001;
    var dt = bg.dt || (1/60);

    if(bg.nebula && bg.nebula.length){
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.38;
      for(var ni=0; ni<bg.nebula.length; ni++){
        ctx.fillStyle = bg.nebula[ni];
        ctx.fillRect(0,0,w,h);
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    if(!noPlanets){
      for(var pi=0; pi<bg.planets.length; pi++){
        var pl = bg.planets[pi];
        var py = (pl.y + t * pl.sp) % (h + pl.r * 2) - pl.r;
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = pl.glow;
        ctx.beginPath();
        ctx.arc(pl.x, py, pl.r * 1.12, 0, Math.PI*2);
        ctx.fill();
        var grad = ctx.createRadialGradient(pl.x - pl.r*0.3, py - pl.r*0.3, pl.r*0.2, pl.x, py, pl.r);
        grad.addColorStop(0, pl.c1);
        grad.addColorStop(1, pl.c2);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pl.x, py, pl.r, 0, Math.PI*2);
        ctx.fill();
        if(pl.ring){
          ctx.strokeStyle = "rgba(232,236,255,.35)";
          ctx.lineWidth = Math.max(2, pl.r * 0.08);
          ctx.beginPath();
          ctx.ellipse(pl.x, py, pl.r * pl.ringW, pl.r * 0.35, pl.ringTilt, 0, Math.PI*2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    for(var i=0;i<bg.stars.length;i++){
      var s = bg.stars[i];
      var yy = (s.y + (t * s.sp) + i*0.9) % h;
      var tw = 0.68 + 0.32 * Math.sin(t * s.tw + s.ph);
      var a = s.a * tw;
      if(s.tint === "amber") a *= 0.85;

      ctx.globalAlpha = a;
      ctx.fillStyle = s.col;

      if((i % 31) === 0 && tw > 0.92){
        var rr = s.r + 0.9;
        var xx = s.x;
        ctx.fillRect(xx - rr*1.2, yy, rr*2.4, 1);
        ctx.fillRect(xx, yy - rr*1.2, 1, rr*2.4);
      }

      ctx.fillRect(s.x, yy, s.r, s.r);
    }

    maybeSpawnStreak(w,h);
    for(var j=bg.streaks.length-1; j>=0; j--){
      var st = bg.streaks[j];
      st.t += dt;
      st.y += st.vy * dt;
      st.life -= dt;

      var fade = clamp(st.life / 0.55, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.50 * fade;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = (st.hue === "mag") ? "rgba(175,0,111,1)" : "rgba(0,229,255,1)";
      ctx.beginPath();
      ctx.moveTo(st.x, st.y);
      ctx.lineTo(st.x + 22, st.y - st.len);
      ctx.stroke();
      ctx.restore();

      if(st.life <= 0 || st.y - st.len > h + 50) bg.streaks.splice(j,1);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  return {
    bg:bg,
    buildStarfield:buildStarfield,
    maybeSpawnStreak:maybeSpawnStreak,
    drawStars:drawStars
  };
}
