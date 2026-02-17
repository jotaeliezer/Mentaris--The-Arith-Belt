"use strict";

(function(){
  var palettes = {
    mk7: {
      body: "rgba(30,200,140,.95)",
      wing: "rgba(12,140,120,.95)",
      accent: "rgba(255,230,120,.95)",
      highlight: "rgba(255,80,200,.9)",
      canopy: "rgba(40,255,210,.85)",
      canopyStroke: "rgba(8,10,14,.7)",
      thruster: "rgba(18,22,32,.85)",
      flame: "rgba(255,190,80,.8)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(8,10,14,.8)",
      glow: "rgba(80,255,200,.35)"
    },
    fizard: {
      body: "rgba(90,180,255,.95)",
      wing: "rgba(45,120,220,.92)",
      accent: "rgba(255,190,100,.95)",
      highlight: "rgba(120,255,220,.9)",
      canopy: "rgba(120,240,255,.9)",
      canopyStroke: "rgba(8,10,14,.7)",
      thruster: "rgba(18,22,32,.85)",
      flame: "rgba(255,200,120,.85)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(8,10,14,.8)",
      glow: "rgba(120,200,255,.35)"
    },
    classic: {
      body: "rgba(255,180,60,.95)",
      wing: "rgba(200,120,40,.92)",
      accent: "rgba(255,80,200,.9)",
      highlight: "rgba(255,230,120,.9)",
      canopy: "rgba(90,240,230,.85)",
      canopyStroke: "rgba(8,10,14,.7)",
      thruster: "rgba(22,18,28,.85)",
      flame: "rgba(255,140,90,.85)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(8,10,14,.8)",
      glow: "rgba(255,150,80,.35)"
    },
    ember: {
      body: "rgba(255,80,190,.96)",
      wing: "rgba(160,40,130,.95)",
      accent: "rgba(255,230,90,.95)",
      highlight: "rgba(60,255,230,.85)",
      canopy: "rgba(120,255,230,.85)",
      canopyStroke: "rgba(8,10,14,.7)",
      thruster: "rgba(22,18,28,.85)",
      flame: "rgba(255,200,90,.85)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(8,10,14,.8)",
      glow: "rgba(255,120,210,.35)"
    },
    azure: {
      body: "rgba(70,180,255,.95)",
      wing: "rgba(30,130,200,.92)",
      accent: "rgba(255,240,120,.95)",
      highlight: "rgba(90,255,230,.9)",
      canopy: "rgba(255,160,70,.9)",
      canopyStroke: "rgba(8,10,14,.7)",
      thruster: "rgba(22,26,36,.85)",
      flame: "rgba(255,190,90,.85)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(8,10,14,.8)",
      glow: "rgba(120,200,255,.35)"
    },
    spire: {
      body: "rgba(120,90,255,.95)",
      wing: "rgba(80,60,220,.92)",
      accent: "rgba(255,230,90,.95)",
      highlight: "rgba(255,80,200,.9)",
      canopy: "rgba(90,255,240,.85)",
      canopyStroke: "rgba(8,10,14,.7)",
      thruster: "rgba(22,18,32,.85)",
      flame: "rgba(255,180,110,.85)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(8,10,14,.8)",
      glow: "rgba(150,120,255,.35)"
    },
    am2: {
      body: "rgba(235,190,210,.95)",
      wing: "rgba(190,130,170,.92)",
      accent: "rgba(255,110,130,.95)",
      highlight: "rgba(120,90,255,.9)",
      canopy: "rgba(180,90,200,.9)",
      canopyStroke: "rgba(8,10,14,.7)",
      thruster: "rgba(20,24,36,.85)",
      flame: "rgba(120,220,255,.9)",
      icon: "rgba(255,255,255,.9)",
      outline: "rgba(8,10,14,.8)",
      glow: "rgba(200,150,190,.35)"
    }
  };

  var scaleMap = {
    am2: 0.9,
    mk7: 0.92,
    fizard: 0.82,
    classic: 0.82,
    ember: 0.82,
    azure: 0.82,
    spire: 0.82
  };

  function clamp(n, a, b){
    return Math.max(a, Math.min(b, n));
  }

  function rand(a, b){
    return Math.random() * (b - a) + a;
  }

  function spawnPreviewRing(rings, x, y, baseR){
    rings.push({ x:x, y:y, r: baseR + 6, dr: 520, a: 1 });
    if(rings.length > 10) rings.splice(0, rings.length - 10);
  }

  function updatePreviewRings(rings, dt){
    for(var i=rings.length-1; i>=0; i--){
      var rr = rings[i];
      rr.r += rr.dr * dt;
      rr.a -= dt * 3.2;
      if(rr.a <= 0) rings.splice(i,1);
    }
  }

  function drawPreviewRings(ctx, rings){
    if(!rings.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for(var i=0;i<rings.length;i++){
      var rr = rings[i];
      ctx.globalAlpha = Math.max(0, rr.a);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,229,255,.65)";
      ctx.beginPath();
      ctx.arc(rr.x, rr.y, rr.r, 0, Math.PI*2);
      ctx.stroke();

      ctx.globalAlpha = Math.max(0, rr.a) * 0.55;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(255,221,0,.55)";
      ctx.beginPath();
      ctx.arc(rr.x, rr.y, rr.r * 0.78, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function spawnPreviewParticles(particles, x, y, kind){
    var n = (kind === "spark") ? 26 : 8;
    var sp = (kind === "spark") ? 780 : 90;
    for(var i=0;i<n;i++){
      var ang = Math.random() * Math.PI*2;
      var v = rand(sp*0.35, sp);
      if(kind === "smoke"){
        particles.push({
          x:x + rand(-10,10), y:y + rand(-6,6),
          vx: rand(-40,40),
          vy: rand(70,140),
          r: rand(4.0, 8.5),
          a: rand(0.18, 0.38),
          life: rand(0.9, 1.6),
          kind: "smoke",
          grow: rand(10, 22)
        });
        continue;
      }
      particles.push({
        x:x, y:y,
        vx: Math.cos(ang)*v,
        vy: Math.sin(ang)*v,
        r: rand(1.2, 2.4),
        a: rand(0.55, 0.95),
        life: rand(0.10, 0.22),
        kind: "spark",
        spin: rand(-6,6)
      });
    }
    if(particles.length > 120) particles.splice(0, particles.length - 120);
  }

  function spawnPreviewDirectedSparks(particles, x, y, dirX, dirY, spread, count, speedMin, speedMax, lifeMin, lifeMax){
    var baseAng = Math.atan2(dirY, dirX);
    var n = count || 14;
    var spMin = speedMin || 220;
    var spMax = speedMax || 520;
    var lMin = lifeMin || 0.12;
    var lMax = lifeMax || 0.26;
    for(var i=0;i<n;i++){
      var ang = baseAng + rand(-spread, spread);
      var v = rand(spMin, spMax);
      particles.push({
        x:x, y:y,
        vx: Math.cos(ang)*v,
        vy: Math.sin(ang)*v,
        r: rand(1.0, 2.4),
        a: rand(0.6, 0.95),
        life: rand(lMin, lMax),
        kind: "spark",
        spin: rand(-6,6)
      });
    }
    if(particles.length > 120) particles.splice(0, particles.length - 120);
  }

  function updatePreviewParticles(particles, dt){
    for(var i=particles.length-1; i>=0; i--){
      var p = particles[i];
      p.life -= dt;
      if(p.life <= 0){ particles.splice(i,1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if(p.kind === "smoke"){
        p.r += (p.grow || 14) * dt;
        p.vx *= (1 - dt*1.2);
        p.vy *= (1 - dt*0.6);
        p.a  *= (1 - dt*1.1);
      }else{
        p.vx *= (1 - dt*2.8);
        p.vy *= (1 - dt*2.8);
        p.a  *= (1 - dt*3.6);
      }
    }
  }

  function drawPreviewParticles(ctx, particles){
    if(!particles.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for(var i=0;i<particles.length;i++){
      var p = particles[i];
      if(p.kind !== "smoke") continue;
      ctx.globalAlpha = Math.max(0, p.a);
      ctx.fillStyle = "rgba(180,190,220,.35)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();

      ctx.globalAlpha = Math.max(0, p.a) * 0.55;
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.beginPath();
      ctx.arc(p.x + 1.2, p.y + 1.0, Math.max(1, p.r*0.55), 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for(var j=0;j<particles.length;j++){
      var q = particles[j];
      if(q.kind === "smoke") continue;
      ctx.globalAlpha = Math.max(0, q.a);
      ctx.fillStyle = "rgba(255,221,0,.90)";
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function getGeometry(shipType){
    var wingLeft = [-16, -8, -58, 12, -64, 22, -58, 30, -24, 28, -8, 6];
    var wingRight = [16, -8, 58, 12, 64, 22, 58, 30, 24, 28, 8, 6];
    var bodyOuter = [0, -34, 18, -10, 26, 6, 22, 22, 14, 34, -14, 34, -22, 22, -26, 6, -18, -10];
    var bodyInner = [0, -24, 10, -2, 12, 20, 0, 30, -12, 20, -10, -2];
    var stripe1 = { x:-26, y:-2, w:52, h:4 };
    var stripe2 = { x:-20, y:-12, w:40, h:3 };
    var nose = [0, -38, 10, -18, -10, -18];
    var thrusterWidth = 44;
    var thrusterRadius = 6.5;
    var gun = {
      xLeft: -42,
      xRight: 32,
      y: 2,
      w: 10,
      h: 16,
      barrelLeft: -40,
      barrelRight: 36,
      barrelY: -24,
      barrelW: 3,
      barrelH: 14,
      centerX: -3,
      centerY: -24,
      centerW: 6,
      centerH: 18
    };

    if(shipType === "mk7"){
      wingLeft = [-16, 30, -34, 22, -44, -6, -36, -26, -22, -30, -12, 12];
      wingRight = [16, 30, 34, 22, 44, -6, 36, -26, 22, -30, 12, 12];
      bodyOuter = [0, -20, 16, -8, 18, 6, 14, 18, 6, 24, -6, 24, -14, 18, -18, 6, -16, -8];
      bodyInner = [0, -14, 7, -2, 9, 10, 0, 18, -9, 10, -7, -2];
      gun = {
        xLeft: -20,
        xRight: 10,
        y: 0,
        w: 10,
        h: 16,
        barrelLeft: -18,
        barrelRight: 14,
        barrelY: -18,
        barrelW: 4.5,
        barrelH: 14,
        centerX: -3,
        centerY: -20,
        centerW: 6,
        centerH: 18
      };
      stripe1 = { x:0, y:0, w:0, h:0 };
      stripe2 = { x:0, y:0, w:0, h:0 };
      nose = [0, -24, 10, -16, -10, -16];
      thrusterWidth = 12;
      thrusterRadius = 5.5;
    }

    if(shipType === "azure"){
      wingLeft = [-14, 2, -52, 18, -58, 32, -52, 36, -22, 30, -8, 10];
      wingRight = [14, 2, 52, 18, 58, 32, 52, 36, 22, 30, 8, 10];
      bodyOuter = [0, -32, 14, -6, 20, 12, 18, 24, 12, 34, -12, 34, -18, 24, -20, 12, -14, -6];
      bodyInner = [0, -22, 8, -2, 10, 20, 0, 30, -10, 20, -8, -2];
      stripe1 = { x:-22, y:-2, w:44, h:4 };
      stripe2 = { x:-16, y:-12, w:32, h:3 };
      nose = [0, -34, 9, -18, -9, -18];
      gun = {
        xLeft: -46,
        xRight: 36,
        y: 6,
        w: 10,
        h: 18,
        barrelLeft: -42,
        barrelRight: 40,
        barrelY: -28,
        barrelW: 3,
        barrelH: 20,
        centerX: -3,
        centerY: -28,
        centerW: 6,
        centerH: 20
      };
    }else if(shipType === "fizard"){
      wingLeft = [-12, -10, -40, 6, -46, 14, -40, 20, -18, 18, -6, 6];
      wingRight = [12, -10, 40, 6, 46, 14, 40, 20, 18, 18, 6, 6];
      bodyOuter = [0, -38, 14, -12, 20, 4, 18, 18, 10, 32, -10, 32, -18, 18, -20, 4, -14, -12];
      bodyInner = [0, -26, 8, -6, 10, 18, 0, 28, -10, 18, -8, -6];
      stripe1 = { x:-20, y:-2, w:40, h:4 };
      stripe2 = { x:-14, y:-12, w:28, h:3 };
      nose = [0, 0, 0, 0, 0, 0];
      gun = {
        xLeft: -30,
        xRight: 20,
        y: -2,
        w: 11,
        h: 14,
        barrelLeft: -30,
        barrelRight: 26,
        barrelY: -22,
        barrelW: 4.5,
        barrelH: 12,
        centerX: -3,
        centerY: -24,
        centerW: 6,
        centerH: 16
      };
      bodyOuter = [0, -38, 14, -12, 20, 4, 18, 18, 10, 32, -10, 32, -18, 18, -20, 4, -14, -12];
      bodyInner = [0, -26, 8, -6, 10, 18, 0, 28, -10, 18, -8, -6];
    }else if(shipType === "classic"){
      wingLeft = [-14, -8, -40, 8, -46, 18, -40, 26, -22, 24, -8, 6];
      wingRight = [14, -8, 40, 8, 46, 18, 40, 26, 22, 24, 8, 6];
    }else if(shipType === "spire"){
      wingLeft = [-9, 4, -40, 18, -44, 30, -40, 34, -14, 26, -6, 12];
      wingRight = [9, 4, 40, 18, 44, 30, 40, 34, 14, 26, 6, 12];
      bodyOuter = [0, -40, 12, -10, 20, 10, 18, 24, 8, 36, -8, 36, -18, 24, -20, 10, -12, -10];
      bodyInner = [0, -26, 6, -4, 8, 18, 0, 30, -8, 18, -6, -4];
      stripe1 = { x:-20, y:-2, w:40, h:4 };
      stripe2 = { x:-16, y:-10, w:32, h:3 };
      nose = [0, -34, 12, -22, -12, -22];
      gun = {
        xLeft: -34,
        xRight: 22,
        y: 8,
        w: 10,
        h: 18,
        barrelLeft: -30,
        barrelRight: 26,
        barrelY: -28,
        barrelW: 3,
        barrelH: 22,
        centerX: -3,
        centerY: -28,
        centerW: 6,
        centerH: 22
      };
    }else if(shipType === "am2"){
      wingLeft = [-8, -6, -30, 2, -38, 12, -30, 18, -8, 18, -4, 6];
      wingRight = [8, -6, 30, 2, 38, 12, 30, 18, 8, 18, 4, 6];
      bodyOuter = [0, -38, 10, -8, 18, 12, 16, 26, 8, 36, -8, 36, -16, 26, -18, 12, -10, -8];
      bodyInner = [0, -28, 6, -4, 10, 20, 0, 30, -10, 20, -6, -4];
      stripe1 = { x:-12, y:-2, w:24, h:6 };
      stripe2 = { x:-10, y:-10, w:20, h:4 };
      nose = [0, -36, 8, -18, -8, -18];
      gun = {
        xLeft: -16,
        xRight: 6,
        y: 10,
        w: 8,
        h: 14,
        barrelLeft: -14,
        barrelRight: 10,
        barrelY: -24,
        barrelW: 2.5,
        barrelH: 14,
        centerX: -2,
        centerY: -24,
        centerW: 4,
        centerH: 16
      };
    }

    return {
      wingLeft: wingLeft,
      wingRight: wingRight,
      bodyOuter: bodyOuter,
      bodyInner: bodyInner,
      stripe1: stripe1,
      stripe2: stripe2,
      nose: nose,
      gun: gun,
      thrusterWidth: thrusterWidth,
      thrusterRadius: thrusterRadius
    };
  }

  function drawWing(ctx, points){
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for(var i=2; i<points.length; i+=2){
      ctx.lineTo(points[i], points[i+1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function renderShipPreview(ctx, ship, x, y, alpha, ghost, overrideVX, overrideVY, ghostStyle){
    var shipType = ship.shipType || "mk7";
    if(shipType !== "classic" && shipType !== "spire" && shipType !== "am2"){
      return renderShipPreviewLegacy(ctx, ship, x, y, alpha, ghost, overrideVX, overrideVY, ghostStyle);
    }
    return renderShipPreviewMatched(ctx, ship, x, y, alpha, ghost, overrideVX, overrideVY, ghostStyle);
  }

  function renderShipPreviewLegacy(ctx, ship, x, y, alpha, ghost, overrideVX, overrideVY, ghostStyle){
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    var dmg = 1 - clamp(ship.hull || 1, 0, 1);

    var useVX = (typeof overrideVX === "number") ? overrideVX : (ship.vx || 0);
    var useVY = (typeof overrideVY === "number") ? overrideVY : (ship.vy || 0);
    var vxN = clamp(useVX / (ship.speed || 1), -1, 1);
    var vyN = clamp(useVY / (ship.speed || 1), -1, 1);

    var bank = (typeof ship.bankHold === "number") ? ship.bankHold : vxN;
    var turn = bank * 0.03;
    var squashX = 1 - Math.abs(bank) * 0.06;
    var bob = Math.sin(performance.now()*0.01) * 0.7;
    var forwardStretch = Math.max(0, -vyN) * 0.06;
    var backwardShrink = Math.max(0, vyN) * 0.08;

    var speedMag = Math.min(1, Math.hypot(useVX, useVY) / (ship.speed || 1));
    var t = performance.now();

    ctx.translate(x, y + bob);
    var scale = scaleMap[shipType] || 0.74;
    var previewScale = 2.4;
    ctx.scale(scale * previewScale, scale * previewScale);

    if(!isFinite(x) || !isFinite(y)) { ctx.restore(); return; }
    var swayAmp = 0.008 + speedMag * 0.01;
    var sway = Math.sin(t * 0.004) * swayAmp;
    var shear = 0;
    ctx.rotate(turn);
    ctx.transform(1, 0, shear, 1, 0, 0);
    ctx.scale(squashX * (1 + sway) * (1 - backwardShrink * 0.4), (1 - sway * 0.6) * (1 + forwardStretch - backwardShrink));

    if(ship.defenseMode === "armor" && !ghost){
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.shadowColor = "rgba(180,220,255,.95)";
      ctx.shadowBlur = 22;
      ctx.strokeStyle = "rgba(180,220,255,.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -48);
      ctx.lineTo(30, -8);
      ctx.lineTo(36, 20);
      ctx.lineTo(22, 52);
      ctx.lineTo(0, 64);
      ctx.lineTo(-22, 52);
      ctx.lineTo(-36, 20);
      ctx.lineTo(-30, -8);
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "rgba(120,200,255,.25)";
      ctx.fill();
      ctx.restore();
    }

    if(ship.defenseMode === "shield" && !ghost){
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = "rgba(0,229,255,.75)";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, -26, 30, Math.PI*1.15, Math.PI*1.85);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "rgba(0,229,255,.35)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, -26, 30, Math.PI*1.15, Math.PI*1.85);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(0, 3, 30, 0, Math.PI*2);
    ctx.fillStyle = "rgba(0,229,255,.06)";
    ctx.fill();
    ctx.restore();

    ctx.save();
    var shipType = ship.shipType || "mk7";
    var colors = palettes[shipType] || palettes.mk7;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12 * (1 - dmg*0.55);

    var wingLeft = [-16, -8, -50, 12, -56, 22, -50, 30, -22, 28, -8, 6];
    var wingRight = [16, -8, 50, 12, 56, 22, 50, 30, 22, 28, 8, 6];
    var bodyOuter = [0, -34, 18, -10, 26, 6, 22, 22, 14, 34, -14, 34, -22, 22, -26, 6, -18, -10];
    var bodyInner = [0, -24, 10, -2, 12, 20, 0, 30, -12, 20, -10, -2];
    var stripe1 = { x:-26, y:-2, w:52, h:4 };
    var stripe2 = { x:-20, y:-12, w:40, h:3 };
    var nose = [0, -38, 10, -18, -10, -18];
    var gun = {
      xLeft: -42,
      xRight: 32,
      y: 2,
      w: 10,
      h: 16,
      barrelLeft: -40,
      barrelRight: 36,
      barrelY: -24,
      barrelW: 3,
      barrelH: 14,
      centerX: -3,
      centerY: -24,
      centerW: 6,
      centerH: 18
    };
    var mk7Custom = shipType === "mk7";
    var thrusterWidth = 44;
    var thrusterRadius = 6.5;
    if(mk7Custom){
      wingLeft = [-16, 30, -34, 22, -44, -6, -36, -26, -22, -30, -12, 12];
      wingRight = [16, 30, 34, 22, 44, -6, 36, -26, 22, -30, 12, 12];
      bodyOuter = [0, -20, 16, -8, 18, 6, 14, 18, 6, 24, -6, 24, -14, 18, -18, 6, -16, -8];
      bodyInner = [0, -14, 7, -2, 9, 10, 0, 18, -9, 10, -7, -2];
      stripe1 = { x:0, y:0, w:0, h:0 };
      stripe2 = { x:0, y:0, w:0, h:0 };
      nose = [0, -24, 10, -16, -10, -16];
      gun = {
        xLeft: -20,
        xRight: 10,
        y: 0,
        w: 10,
        h: 16,
        barrelLeft: -18,
        barrelRight: 14,
        barrelY: -18,
        barrelW: 4.5,
        barrelH: 14,
        centerX: -3,
        centerY: -20,
        centerW: 6,
        centerH: 18
      };
      thrusterWidth = 18;
      thrusterRadius = 5.5;
    }
    var useAzure = shipType === "azure";
    if(useAzure){
      wingLeft = [-14, 2, -46, 18, -52, 32, -46, 36, -20, 30, -8, 10];
      wingRight = [14, 2, 46, 18, 52, 32, 46, 36, 20, 30, 8, 10];
      bodyOuter = [0, -32, 14, -6, 20, 12, 18, 24, 12, 34, -12, 34, -18, 24, -20, 12, -14, -6];
      bodyInner = [0, -22, 8, -2, 10, 20, 0, 30, -10, 20, -8, -2];
      stripe1 = { x:-22, y:-2, w:44, h:4 };
      stripe2 = { x:-16, y:-12, w:32, h:3 };
      nose = [0, -34, 9, -18, -9, -18];
      gun = {
        xLeft: -46,
        xRight: 36,
        y: 6,
        w: 10,
        h: 18,
        barrelLeft: -42,
        barrelRight: 40,
        barrelY: -28,
        barrelW: 3,
        barrelH: 20,
        centerX: -3,
        centerY: -28,
        centerW: 6,
        centerH: 20
      };
    }else if(shipType === "fizard"){
      wingLeft = [-12, -10, -40, 6, -46, 14, -40, 20, -18, 18, -6, 6];
      wingRight = [12, -10, 40, 6, 46, 14, 40, 20, 18, 18, 6, 6];
      bodyOuter = [0, -38, 14, -12, 20, 4, 18, 18, 10, 32, -10, 32, -18, 18, -20, 4, -14, -12];
      bodyInner = [0, -26, 8, -6, 10, 18, 0, 28, -10, 18, -8, -6];
      stripe1 = { x:-20, y:-2, w:40, h:4 };
      stripe2 = { x:-14, y:-12, w:28, h:3 };
      nose = [0, -40, 8, -22, -8, -22];
      gun = {
        xLeft: -34,
        xRight: 24,
        y: -2,
        w: 9,
        h: 14,
        barrelLeft: -32,
        barrelRight: 28,
        barrelY: -22,
        barrelW: 3,
        barrelH: 12,
        centerX: -3,
        centerY: -24,
        centerW: 6,
        centerH: 16
      };
    }else if(shipType === "classic"){
      wingLeft = [-14, -8, -40, 8, -46, 18, -40, 26, -22, 24, -8, 6];
      wingRight = [14, -8, 40, 8, 46, 18, 40, 26, 22, 24, 8, 6];
    }else if(shipType === "spire"){
      wingLeft = [-9, 4, -40, 18, -44, 30, -40, 34, -14, 26, -6, 12];
      wingRight = [9, 4, 40, 18, 44, 30, 40, 34, 14, 26, 6, 12];
      bodyOuter = [0, -40, 12, -10, 20, 10, 18, 24, 8, 36, -8, 36, -18, 24, -20, 10, -12, -10];
      bodyInner = [0, -26, 6, -4, 8, 18, 0, 30, -8, 18, -6, -4];
      stripe1 = { x:-20, y:-2, w:40, h:4 };
      stripe2 = { x:-16, y:-10, w:32, h:3 };
      nose = [0, -34, 12, -22, -12, -22];
      gun = {
        xLeft: -34,
        xRight: 22,
        y: 8,
        w: 10,
        h: 18,
        barrelLeft: -30,
        barrelRight: 26,
        barrelY: -28,
        barrelW: 3,
        barrelH: 22,
        centerX: -3,
        centerY: -28,
        centerW: 6,
        centerH: 22
      };
    }else if(shipType === "am2"){
      wingLeft = [-8, -6, -30, 2, -38, 12, -30, 18, -8, 18, -4, 6];
      wingRight = [8, -6, 30, 2, 38, 12, 30, 18, 8, 18, 4, 6];
      bodyOuter = [0, -38, 10, -8, 18, 12, 16, 26, 8, 36, -8, 36, -16, 26, -18, 12, -10, -8];
      bodyInner = [0, -28, 6, -4, 10, 20, 0, 30, -10, 20, -6, -4];
      stripe1 = { x:-12, y:-2, w:24, h:6 };
      stripe2 = { x:-10, y:-10, w:20, h:4 };
      nose = [0, -36, 8, -18, -8, -18];
      gun = {
        xLeft: -16,
        xRight: 6,
        y: 10,
        w: 8,
        h: 14,
        barrelLeft: -14,
        barrelRight: 10,
        barrelY: -24,
        barrelW: 2.5,
        barrelH: 14,
        centerX: -2,
        centerY: -24,
        centerW: 4,
        centerH: 16
      };
    }
    gun.barrelY = gun.y - 10;

    ghostStyle = ghostStyle || {};
    var leftScale = clamp(1 + bank * 0.5, 0.5, 1.5);
    var rightScale = clamp(1 - bank * 0.5, 0.5, 1.5);
    var ghostBodyAlpha = (ghost && ghostStyle.thrustFocus) ? 0.35 : 1;
    var ghostFlameBoost = (ghost && ghostStyle.thrustFocus) ? 1.45 : 1;

    ctx.save();
    ctx.globalAlpha *= ghostBodyAlpha;
    ctx.fillStyle = colors.wing;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 2.0;

    function drawWing(points){
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for(var wi=2; wi<points.length; wi+=2){
        ctx.lineTo(points[wi], points[wi+1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(-10, 0);
    ctx.scale(leftScale, 1);
    ctx.translate(10, 0);
    drawWing(wingLeft);
    ctx.restore();

    ctx.save();
    ctx.translate(10, 0);
    ctx.scale(rightScale, 1);
    ctx.translate(-10, 0);
    drawWing(wingRight);
    ctx.restore();

    if(mk7Custom){
      ctx.save();
      ctx.strokeStyle = colors.highlight || colors.accent;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(-26, 6);
      ctx.lineTo(-10, -8);
      ctx.moveTo(-30, 14);
      ctx.lineTo(-12, 0);
      ctx.moveTo(26, 6);
      ctx.lineTo(10, -8);
      ctx.moveTo(30, 14);
      ctx.lineTo(12, 0);
      ctx.stroke();
      ctx.restore();
    }

    function drawHull(){
      ctx.fillStyle = colors.body;
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(bodyOuter[0], bodyOuter[1]);
      for(var bi=2; bi<bodyOuter.length; bi+=2){
        ctx.lineTo(bodyOuter[bi], bodyOuter[bi+1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bodyInner[0], bodyInner[1]);
      for(var bj=2; bj<bodyInner.length; bj+=2){
        ctx.lineTo(bodyInner[bj], bodyInner[bj+1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -200, 200, 400);
    ctx.clip();
    ctx.translate(-10, 0);
    ctx.scale(leftScale, 1);
    ctx.translate(10, 0);
    drawHull();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -200, 200, 400);
    ctx.clip();
    ctx.translate(10, 0);
    ctx.scale(rightScale, 1);
    ctx.translate(-10, 0);
    drawHull();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = colors.highlight || colors.accent;
    ctx.fillRect(stripe1.x, stripe1.y, stripe1.w, stripe1.h);
    ctx.fillRect(stripe2.x, stripe2.y, stripe2.w, stripe2.h);
    ctx.beginPath();
    ctx.moveTo(nose[0], nose[1]);
    ctx.lineTo(nose[2], nose[3]);
    ctx.lineTo(nose[4], nose[5]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    function drawCanopy(){
      ctx.fillStyle = colors.canopy;
      ctx.strokeStyle = colors.canopyStroke;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.quadraticCurveTo(0, -20, 8, -12);
      ctx.lineTo(10, 8);
      ctx.quadraticCurveTo(0, 16, -10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -200, 200, 400);
    ctx.clip();
    ctx.translate(-8, 0);
    ctx.scale(leftScale, 1);
    ctx.translate(8, 0);
    drawCanopy();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -200, 200, 400);
    ctx.clip();
    ctx.translate(8, 0);
    ctx.scale(rightScale, 1);
    ctx.translate(-8, 0);
    drawCanopy();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = colors.icon || colors.accent;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(6, 16);
    ctx.lineTo(0, 26);
    ctx.lineTo(-6, 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    var blink = (Math.sin(t * 0.006) + 1) / 2;
    ctx.save();
    ctx.globalAlpha = 0.25 + blink * 0.55;
    ctx.fillStyle = colors.highlight || colors.accent;
    ctx.beginPath();
    ctx.arc(-24, 4, 2.2, 0, Math.PI*2);
    ctx.arc(24, 4, 2.2, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    var isAm2 = shipType === "am2";
    var isSpire = shipType === "spire";
    if(isAm2){
      ctx.save();
      ctx.fillStyle = colors.highlight || colors.accent;
      ctx.fillRect(-3, -6, 6, 26);
      ctx.fillRect(-8, -12, 16, 4);
      ctx.beginPath();
      ctx.moveTo(-18, 14);
      ctx.lineTo(-34, 22);
      ctx.lineTo(-16, 24);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18, 14);
      ctx.lineTo(34, 22);
      ctx.lineTo(16, 24);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if(dmg > 0.02){
      ctx.save();
      ctx.globalAlpha = clamp(dmg * 0.95, 0, 0.95);
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.beginPath();
      ctx.ellipse(-5, 6, 10 + dmg*10, 6 + dmg*7, -0.4, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(6, 2, 7 + dmg*7, 4 + dmg*5, 0.3, 0, Math.PI*2);
      ctx.fill();

      ctx.globalAlpha = clamp(dmg * 0.65, 0, 0.7);
      ctx.strokeStyle = "rgba(232,236,255,.22)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(-8, 2);
      ctx.lineTo(-4, 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, -4);
      ctx.lineTo(9, 4);
      ctx.lineTo(6, 12);
      ctx.stroke();
      ctx.restore();
    }

    if((ship.hitFlash || 0) > 0 && !ghost){
      ctx.save();
      ctx.globalAlpha = clamp(ship.hitFlash, 0, 1) * 0.55;
      ctx.strokeStyle = "rgba(255,77,109,.9)";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(16, -6);
      ctx.lineTo(13, 16);
      ctx.lineTo(0, 24);
      ctx.lineTo(-13, 16);
      ctx.lineTo(-16, -6);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 0;

    var recoil = ghost ? 0 : (ship.recoil || 0);
    var recoilShift = recoil * 4;

    ctx.fillStyle = colors.accent;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1.6;

    var inset = 3;
    function drawSideGun(xLeft, barrelX){
      ctx.beginPath();
      ctx.moveTo(xLeft, gun.y);
      ctx.lineTo(xLeft + gun.w, gun.y);
      ctx.lineTo(xLeft + gun.w - inset, gun.y + gun.h);
      ctx.lineTo(xLeft + inset, gun.y + gun.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(barrelX, gun.barrelY - recoilShift, gun.barrelW, gun.barrelH);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(barrelX, gun.barrelY - recoilShift);
      ctx.lineTo(barrelX + gun.barrelW, gun.barrelY - recoilShift);
      ctx.lineTo(barrelX + gun.barrelW/2, gun.barrelY - recoilShift - 6);
      ctx.closePath();
      ctx.fill();
      if(isAm2){
        ctx.beginPath();
        ctx.rect(barrelX - 4, gun.barrelY - recoilShift + 6, 3, gun.barrelH - 8);
        ctx.rect(barrelX + gun.barrelW + 1, gun.barrelY - recoilShift + 6, 3, gun.barrelH - 8);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(-10, 0);
    ctx.scale(leftScale, 1);
    ctx.translate(10, 0);
    drawSideGun(gun.xLeft, gun.barrelLeft);
    ctx.restore();

    ctx.save();
    ctx.translate(10, 0);
    ctx.scale(rightScale, 1);
    ctx.translate(-10, 0);
    drawSideGun(gun.xRight, gun.barrelRight);
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(gun.centerX, gun.centerY - recoilShift);
    ctx.lineTo(gun.centerX + gun.centerW, gun.centerY - recoilShift);
    ctx.lineTo(gun.centerX + gun.centerW - inset, gun.centerY - recoilShift + gun.centerH);
    ctx.lineTo(gun.centerX + inset, gun.centerY - recoilShift + gun.centerH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = colors.thruster || "rgba(18,22,32,.85)";
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1.4;
    if(ghost && ghostStyle.thrustFocus){
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 1.4);
    }
    if(isSpire){
      ctx.beginPath();
      ctx.rect(-14, 22, 28, 9);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 29, 8.5, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }else{
      var thrW = (typeof thrusterWidth === "number") ? thrusterWidth : 44;
      var thrR = (typeof thrusterRadius === "number") ? thrusterRadius : 6.5;
      ctx.save();
      ctx.translate(-10, 0);
      ctx.scale(leftScale, 1);
      ctx.translate(10, 0);
      ctx.beginPath();
      ctx.rect(-thrW / 2, 22, thrW / 2, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-thrW * 0.27, 28, thrR, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(10, 0);
      ctx.scale(rightScale, 1);
      ctx.translate(-10, 0);
      ctx.beginPath();
      ctx.rect(0, 22, thrW / 2, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(thrW * 0.27, 28, thrR, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if(isAm2){
        ctx.beginPath();
        ctx.arc(0, 30, 5.5, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();

    var flash = ghost ? 0 : (ship.flash || 0);
    if(flash > 0){
      ctx.save();
      ctx.globalAlpha = Math.min(1, flash);
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(-4, -26 - recoilShift);
      ctx.lineTo(0, -38 - recoilShift - flash*6);
      ctx.lineTo(4, -26 - recoilShift);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    var forwardBoost = Math.max(0, -vyN);
    var flame = 12 + speedMag * 18 + (Math.sin(t*0.03) * 2.6) + forwardBoost * 22;
    flame *= ghostFlameBoost;
    var dualFlameSpread = shipType === "classic" ? 9.5 : 12;
    var dualFlameOuter = dualFlameSpread + 6;
    var dualFlameWide = dualFlameSpread * 2;
    var dualFlameInnerA = dualFlameSpread - 2;
    var dualFlameInnerB = dualFlameSpread - 0.5;
    var dualFlameInnerC = dualFlameSpread + 2;

    var bloom = 0.35 + speedMag * 0.5 + forwardBoost * 0.6 + (Math.sin(t * 0.02) * 0.08);
    bloom *= ghostFlameBoost;
    var flameWiggle = (Math.sin(t * 0.06) + Math.sin(t * 0.11 + 1.4)) * 0.6 * (0.6 + speedMag);
    ctx.save();
    ctx.globalAlpha = 0.2 + bloom * 0.22;
    ctx.fillStyle = colors.flame || "rgba(0,229,255,.35)";
    ctx.shadowColor = colors.flame || "rgba(0,229,255,.4)";
    ctx.shadowBlur = 12 + bloom * 9;
    ctx.beginPath();
    if(isSpire){
      ctx.arc(0, 29, 7 + bloom * 5, 0, Math.PI*2);
    }else{
      ctx.arc(-12, 28, 5 + bloom * 4, 0, Math.PI*2);
      ctx.arc(12, 28, 5 + bloom * 4, 0, Math.PI*2);
      if(isAm2){
        ctx.arc(0, 30, 4.5 + bloom * 3.5, 0, Math.PI*2);
      }
    }
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.85 + forwardBoost * 0.35;
    ctx.fillStyle = colors.flame || "rgba(193,216,47,.16)";
    ctx.beginPath();
    if(isSpire){
      ctx.moveTo(-6, 22);
      ctx.lineTo(flameWiggle, 22 + flame * 1.1);
      ctx.lineTo(6, 22);
    }else{
      ctx.moveTo(-18, 22);
      ctx.lineTo(-12 + flameWiggle, 22 + flame);
      ctx.lineTo(-6, 22);
      ctx.moveTo(6, 22);
      ctx.lineTo(12 + flameWiggle, 22 + flame);
      ctx.lineTo(18, 22);
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.22 + forwardBoost * 0.25;
    ctx.fillStyle = "rgba(0,229,255,.16)";
    ctx.beginPath();
    if(isSpire){
      ctx.moveTo(-10, 22);
      ctx.lineTo(flameWiggle, 22 + flame*1.22);
      ctx.lineTo(10, 22);
    }else{
      ctx.moveTo(-24, 22);
      ctx.lineTo(-12 + flameWiggle, 22 + flame*1.18);
      ctx.lineTo(0, 22);
      ctx.moveTo(0, 22);
      ctx.lineTo(12 + flameWiggle, 22 + flame*1.18);
      ctx.lineTo(24, 22);
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.8;
    ctx.fillStyle = colors.flame || "rgba(0,229,255,.14)";
    ctx.beginPath();
    if(isSpire){
      ctx.moveTo(-4, 22);
      ctx.lineTo(flameWiggle * 0.6, 22 + flame*0.8);
      ctx.lineTo(4, 22);
    }else{
      ctx.moveTo(-14, 22);
      ctx.lineTo(-12 + flameWiggle * 0.5, 22 + flame*0.7);
      ctx.lineTo(-10, 22);
      ctx.moveTo(10, 22);
      ctx.lineTo(12 + flameWiggle * 0.5, 22 + flame*0.7);
      ctx.lineTo(14, 22);
    }
    ctx.closePath();
    ctx.fill();
    if(isAm2){
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = colors.flame || "rgba(120,220,255,.9)";
      ctx.beginPath();
      ctx.moveTo(-3, 20);
      ctx.lineTo(flameWiggle * 0.5, 20 + flame*0.9);
      ctx.lineTo(3, 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    if(Math.abs(vxN) > 0.18 && !ghost){
      var sx = (vxN > 0) ? -30 : 30;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "rgba(175,0,111,.14)";
      ctx.beginPath();
      ctx.moveTo(sx, 6);
      ctx.lineTo(sx + (vxN > 0 ? -10 : 10), 10);
      ctx.lineTo(sx, 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "rgba(255,255,255,.10)";
    ctx.beginPath();
    ctx.arc(0, -20, 6, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
    ctx.restore();
  }

function renderShipPreviewMatched(ctx, ship, x, y, alpha, ghost, overrideVX, overrideVY, ghostStyle){
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    var baseAlpha = ctx.globalAlpha;
    var shipType = ship.shipType || "mk7";

    var dmg = 1 - clamp(ship.hull || 1, 0, 1);

    var useVX = (typeof overrideVX === "number") ? overrideVX : (ship.vx || 0);
    var useVY = (typeof overrideVY === "number") ? overrideVY : (ship.vy || 0);
    var vxN = clamp(useVX / (ship.speed || 1), -1, 1);
    var vyN = clamp(useVY / (ship.speed || 1), -1, 1);

    var bank = (typeof ship.bankHold === "number") ? ship.bankHold : vxN;
    var turn = bank * 0.03;
    var squashX = 1 - Math.abs(bank) * 0.06;
    var bob = Math.sin(performance.now()*0.01) * 0.7;
    var forwardStretch = Math.max(0, -vyN) * 0.06;
    var backwardShrink = Math.max(0, vyN) * 0.08;

    var speedMag = Math.min(1, Math.hypot(useVX, useVY) / (ship.speed || 1));
    var t = performance.now();

    ctx.translate(x, y + bob);
    var scale = scaleMap[shipType] || 0.74;
    var previewScale = 2.4;
    ctx.scale(scale * previewScale, scale * previewScale);

    if(!isFinite(x) || !isFinite(y)) { ctx.restore(); return; }
    var swayAmp = 0.008 + speedMag * 0.01;
    var sway = Math.sin(t * 0.004) * swayAmp;
    var shear = 0;
    ctx.rotate(turn);
    ctx.transform(1, 0, shear, 1, 0, 0);
    ctx.scale(squashX * (1 + sway) * (1 - backwardShrink * 0.4), (1 - sway * 0.6) * (1 + forwardStretch - backwardShrink));

    if(ship.defenseMode === "armor" && !ghost){
      ctx.save();
      ctx.globalAlpha = baseAlpha * 0.65;
      ctx.shadowColor = "rgba(0,229,255,.95)";
      ctx.shadowBlur = 36;
      ctx.strokeStyle = "rgba(0,229,255,.6)";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 6, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = baseAlpha * 0.35;
      ctx.fillStyle = "rgba(0,229,255,.2)";
      ctx.beginPath();
      ctx.arc(0, 6, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if(ship.defenseMode === "shield" && !ghost){
      ctx.save();
      var shieldY = -28;
      var arcR = 38;
      var arcStart = Math.PI * 1.08;
      var arcEnd = Math.PI * 1.92;
      ctx.globalAlpha = baseAlpha * 0.5;
      ctx.strokeStyle = "rgba(255,221,0,.35)";
      ctx.shadowColor = "rgba(255,221,0,.55)";
      ctx.shadowBlur = 18;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(0, shieldY, arcR + 2, arcStart, arcEnd);
      ctx.stroke();

      ctx.shadowBlur = 8;
      ctx.globalAlpha = baseAlpha * 0.9;
      ctx.strokeStyle = "rgba(150,190,60,.95)";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(0, shieldY, arcR, arcStart, arcEnd);
      ctx.stroke();

      var cells = 6;
      var step = (arcEnd - arcStart) / cells;
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = "rgba(150,190,60,.85)";
      for(var c=0; c<cells; c++){
        var ang = arcStart + step * (c + 0.5);
        var cx = Math.cos(ang) * (arcR + 1);
        var cy = shieldY + Math.sin(ang) * (arcR + 1);
        var rHex = 4.6;
        ctx.beginPath();
        for(var s=0; s<6; s++){
          var ha = Math.PI / 6 + s * (Math.PI / 3);
          var hx = cx + Math.cos(ha) * rHex;
          var hy = cy + Math.sin(ha) * rHex;
          if(s === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = baseAlpha * 0.9;
    ctx.beginPath();
    ctx.arc(0, 3, 30, 0, Math.PI*2);
    ctx.fillStyle = "rgba(0,229,255,.06)";
    ctx.fill();
    ctx.restore();

    ctx.save();
    var colors = palettes[shipType] || palettes.mk7;
    ctx.shadowColor = colors.glow;
    ctx.shadowBlur = 12 * (1 - dmg*0.55);

    var wingLeft = [-16, -8, -50, 12, -56, 22, -50, 30, -22, 28, -8, 6];
    var wingRight = [16, -8, 50, 12, 56, 22, 50, 30, 22, 28, 8, 6];
    var bodyOuter = [0, -34, 18, -10, 26, 6, 22, 22, 14, 34, -14, 34, -22, 22, -26, 6, -18, -10];
    var bodyInner = [0, -24, 10, -2, 12, 20, 0, 30, -12, 20, -10, -2];
    var stripe1 = { x:-26, y:-2, w:52, h:4 };
    var stripe2 = { x:-20, y:-12, w:40, h:3 };
    var nose = [0, -38, 10, -18, -10, -18];
    var gun = {
      xLeft: -42,
      xRight: 32,
      y: 2,
      w: 10,
      h: 16,
      barrelLeft: -40,
      barrelRight: 36,
      barrelY: -24,
      barrelW: 3,
      barrelH: 14,
      centerX: -3,
      centerY: -24,
      centerW: 6,
      centerH: 18
    };
    var useAzure = shipType === "azure";
    if(useAzure){
      wingLeft = [-14, 2, -46, 18, -52, 32, -46, 36, -20, 30, -8, 10];
      wingRight = [14, 2, 46, 18, 52, 32, 46, 36, 20, 30, 8, 10];
      bodyOuter = [0, -32, 14, -6, 20, 12, 18, 24, 12, 34, -12, 34, -18, 24, -20, 12, -14, -6];
      bodyInner = [0, -22, 8, -2, 10, 20, 0, 30, -10, 20, -8, -2];
      stripe1 = { x:-22, y:-2, w:44, h:4 };
      stripe2 = { x:-16, y:-12, w:32, h:3 };
      nose = [0, -34, 9, -18, -9, -18];
      gun = {
        xLeft: -46,
        xRight: 36,
        y: 6,
        w: 10,
        h: 18,
        barrelLeft: -42,
        barrelRight: 40,
        barrelY: -28,
        barrelW: 3,
        barrelH: 20,
        centerX: -3,
        centerY: -28,
        centerW: 6,
        centerH: 20
      };
    }else if(shipType === "fizard"){
      wingLeft = [-12, -10, -40, 6, -46, 14, -40, 20, -18, 18, -6, 6];
      wingRight = [12, -10, 40, 6, 46, 14, 40, 20, 18, 18, 6, 6];
      bodyOuter = [0, -38, 14, -12, 20, 4, 18, 18, 10, 32, -10, 32, -18, 18, -20, 4, -14, -12];
      bodyInner = [0, -26, 8, -6, 10, 18, 0, 28, -10, 18, -8, -6];
      stripe1 = { x:-20, y:-2, w:40, h:4 };
      stripe2 = { x:-14, y:-12, w:28, h:3 };
      nose = [0, -40, 8, -22, -8, -22];
      gun = {
        xLeft: -34,
        xRight: 24,
        y: -2,
        w: 9,
        h: 14,
        barrelLeft: -32,
        barrelRight: 28,
        barrelY: -22,
        barrelW: 3,
        barrelH: 12,
        centerX: -3,
        centerY: -24,
        centerW: 6,
        centerH: 16
      };
    }else if(shipType === "classic"){
      wingLeft = [-14, -8, -40, 8, -46, 18, -40, 26, -22, 24, -8, 6];
      wingRight = [14, -8, 40, 8, 46, 18, 40, 26, 22, 24, 8, 6];
      gun.barrelLeft = -36;
    }else if(shipType === "spire"){
      wingLeft = [-9, 4, -40, 18, -44, 30, -40, 34, -14, 26, -6, 12];
      wingRight = [9, 4, 40, 18, 44, 30, 40, 34, 14, 26, 6, 12];
      bodyOuter = [0, -40, 12, -10, 20, 10, 18, 24, 8, 36, -8, 36, -18, 24, -20, 10, -12, -10];
      bodyInner = [0, -26, 6, -4, 8, 18, 0, 30, -8, 18, -6, -4];
      stripe1 = { x:-20, y:-2, w:40, h:4 };
      stripe2 = { x:-16, y:-10, w:32, h:3 };
      nose = [0, -34, 12, -22, -12, -22];
      gun = {
        xLeft: -34,
        xRight: 22,
        y: 8,
        w: 10,
        h: 18,
        barrelLeft: -30,
        barrelRight: 26,
        barrelY: -28,
        barrelW: 3,
        barrelH: 22,
        centerX: -3,
        centerY: -28,
        centerW: 6,
        centerH: 22
      };
    }else if(shipType === "am2"){
      wingLeft = [-8, -6, -30, 2, -38, 12, -30, 18, -8, 18, -4, 6];
      wingRight = [8, -6, 30, 2, 38, 12, 30, 18, 8, 18, 4, 6];
      bodyOuter = [0, -38, 10, -8, 18, 12, 16, 26, 8, 36, -8, 36, -16, 26, -18, 12, -10, -8];
      bodyInner = [0, -28, 6, -4, 10, 20, 0, 30, -10, 20, -6, -4];
      stripe1 = { x:-12, y:-2, w:24, h:6 };
      stripe2 = { x:-10, y:-10, w:20, h:4 };
      nose = [0, -36, 8, -18, -8, -18];
      gun = {
        xLeft: -16,
        xRight: 6,
        y: 10,
        w: 8,
        h: 14,
        barrelLeft: -14,
        barrelRight: 10,
        barrelY: -24,
        barrelW: 2.5,
        barrelH: 14,
        centerX: -2,
        centerY: -24,
        centerW: 4,
        centerH: 16
      };
    }
    gun.barrelY = gun.y - 18;
    if(shipType === "spire"){
      gun.barrelY -= 6;
    }else if(shipType === "am2"){
      gun.barrelY -= 5;
    }

    ghostStyle = ghostStyle || {};
    var leftScale = clamp(1 + bank * 0.5, 0.5, 1.5);
    var rightScale = clamp(1 - bank * 0.5, 0.5, 1.5);
    var ghostBodyAlpha = (ghost && ghostStyle.thrustFocus) ? 0.35 : 1;
    var ghostFlameBoost = (ghost && ghostStyle.thrustFocus) ? 1.45 : 1;

    ctx.save();
    ctx.globalAlpha *= ghostBodyAlpha;
    ctx.fillStyle = colors.wing;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 2.0;

    function drawWing(points){
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for(var wi=2; wi<points.length; wi+=2){
        ctx.lineTo(points[wi], points[wi+1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(-10, 0);
    ctx.scale(leftScale, 1);
    ctx.translate(10, 0);
    drawWing(wingLeft);
    ctx.restore();

    ctx.save();
    ctx.translate(10, 0);
    ctx.scale(rightScale, 1);
    ctx.translate(-10, 0);
    drawWing(wingRight);
    ctx.restore();

    function drawHull(){
      ctx.fillStyle = colors.body;
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(bodyOuter[0], bodyOuter[1]);
      for(var bi=2; bi<bodyOuter.length; bi+=2){
        ctx.lineTo(bodyOuter[bi], bodyOuter[bi+1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(bodyInner[0], bodyInner[1]);
      for(var bj=2; bj<bodyInner.length; bj+=2){
        ctx.lineTo(bodyInner[bj], bodyInner[bj+1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -200, 200, 400);
    ctx.clip();
    ctx.translate(-10, 0);
    ctx.scale(leftScale, 1);
    ctx.translate(10, 0);
    drawHull();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -200, 200, 400);
    ctx.clip();
    ctx.translate(10, 0);
    ctx.scale(rightScale, 1);
    ctx.translate(-10, 0);
    drawHull();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = baseAlpha * 0.9;
    ctx.fillStyle = colors.highlight || colors.accent;
    ctx.fillRect(stripe1.x, stripe1.y, stripe1.w, stripe1.h);
    ctx.fillRect(stripe2.x, stripe2.y, stripe2.w, stripe2.h);
    ctx.beginPath();
    ctx.moveTo(nose[0], nose[1]);
    ctx.lineTo(nose[2], nose[3]);
    ctx.lineTo(nose[4], nose[5]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    function drawCanopy(){
      ctx.fillStyle = colors.canopy;
      ctx.strokeStyle = colors.canopyStroke;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.quadraticCurveTo(0, -20, 8, -12);
      ctx.lineTo(10, 8);
      ctx.quadraticCurveTo(0, 16, -10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(-200, -200, 200, 400);
    ctx.clip();
    ctx.translate(-8, 0);
    ctx.scale(leftScale, 1);
    ctx.translate(8, 0);
    drawCanopy();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -200, 200, 400);
    ctx.clip();
    ctx.translate(8, 0);
    ctx.scale(rightScale, 1);
    ctx.translate(-8, 0);
    drawCanopy();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = colors.icon || colors.accent;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(6, 16);
    ctx.lineTo(0, 26);
    ctx.lineTo(-6, 16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    var blink = (Math.sin(t * 0.006) + 1) / 2;
    ctx.save();
    ctx.globalAlpha = baseAlpha * (0.25 + blink * 0.55);
    ctx.fillStyle = colors.highlight || colors.accent;
    ctx.beginPath();
    ctx.arc(-24, 4, 2.2, 0, Math.PI*2);
    ctx.arc(24, 4, 2.2, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    var isAm2 = shipType === "am2";
    var isSpire = shipType === "spire";
    if(isAm2){
      ctx.save();
      ctx.fillStyle = colors.highlight || colors.accent;
      ctx.fillRect(-3, -6, 6, 26);
      ctx.fillRect(-8, -12, 16, 4);
      ctx.beginPath();
      ctx.moveTo(-18, 14);
      ctx.lineTo(-34, 22);
      ctx.lineTo(-16, 24);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(18, 14);
      ctx.lineTo(34, 22);
      ctx.lineTo(16, 24);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if(dmg > 0.02){
      ctx.save();
      ctx.globalAlpha = baseAlpha * clamp(dmg * 0.95, 0, 0.95);
      ctx.fillStyle = "rgba(0,0,0,.22)";
      ctx.beginPath();
      ctx.ellipse(-5, 6, 10 + dmg*10, 6 + dmg*7, -0.4, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(6, 2, 7 + dmg*7, 4 + dmg*5, 0.3, 0, Math.PI*2);
      ctx.fill();

      ctx.globalAlpha = baseAlpha * clamp(dmg * 0.65, 0, 0.7);
      ctx.strokeStyle = "rgba(232,236,255,.22)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(-8, 2);
      ctx.lineTo(-4, 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(3, -4);
      ctx.lineTo(9, 4);
      ctx.lineTo(6, 12);
      ctx.stroke();
      ctx.restore();
    }

    if((ship.hitFlash || 0) > 0 && !ghost){
      ctx.save();
      ctx.globalAlpha = baseAlpha * clamp(ship.hitFlash, 0, 1) * 0.55;
      ctx.strokeStyle = "rgba(255,77,109,.9)";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(16, -6);
      ctx.lineTo(13, 16);
      ctx.lineTo(0, 24);
      ctx.lineTo(-13, 16);
      ctx.lineTo(-16, -6);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 0;

    var recoil = ghost ? 0 : (ship.recoil || 0);
    var recoilShift = recoil * 4;

    ctx.fillStyle = colors.accent;
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1.6;

    var inset = 3;
    function drawSideGun(xLeft, barrelX){
      ctx.beginPath();
      ctx.moveTo(xLeft, gun.y);
      ctx.lineTo(xLeft + gun.w, gun.y);
      ctx.lineTo(xLeft + gun.w - inset, gun.y + gun.h);
      ctx.lineTo(xLeft + inset, gun.y + gun.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(barrelX, gun.barrelY - recoilShift, gun.barrelW, gun.barrelH);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(barrelX, gun.barrelY - recoilShift);
      ctx.lineTo(barrelX + gun.barrelW, gun.barrelY - recoilShift);
      ctx.lineTo(barrelX + gun.barrelW/2, gun.barrelY - recoilShift - 6);
      ctx.closePath();
      ctx.fill();
      if(isAm2){
        ctx.beginPath();
        ctx.rect(barrelX - 4, gun.barrelY - recoilShift + 6, 3, gun.barrelH - 8);
        ctx.rect(barrelX + gun.barrelW + 1, gun.barrelY - recoilShift + 6, 3, gun.barrelH - 8);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(-10, 0);
    ctx.scale(leftScale, 1);
    ctx.translate(10, 0);
    drawSideGun(gun.xLeft, gun.barrelLeft);
    ctx.restore();

    ctx.save();
    ctx.translate(10, 0);
    ctx.scale(rightScale, 1);
    ctx.translate(-10, 0);
    drawSideGun(gun.xRight, gun.barrelRight);
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(gun.centerX, gun.centerY - recoilShift);
    ctx.lineTo(gun.centerX + gun.centerW, gun.centerY - recoilShift);
    ctx.lineTo(gun.centerX + gun.centerW - inset, gun.centerY - recoilShift + gun.centerH);
    ctx.lineTo(gun.centerX + inset, gun.centerY - recoilShift + gun.centerH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    var thrusterOffsetX = 0;
    var thrusterOffsetY = 0;
    if(shipType === "classic"){
      thrusterOffsetY = -4;
    }
    var thrusterBaseY = 22 + thrusterOffsetY;
    ctx.fillStyle = colors.thruster || "rgba(18,22,32,.85)";
    ctx.strokeStyle = colors.outline;
    ctx.lineWidth = 1.4;
    if(ghost && ghostStyle.thrustFocus){
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 1.4);
    }
    if(isSpire){
      ctx.beginPath();
      ctx.rect(-14 + thrusterOffsetX, thrusterBaseY, 28, 9);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(thrusterOffsetX, thrusterBaseY + 7, 8.5, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
    }else{
      var thrW = (typeof thrusterWidth === "number") ? thrusterWidth : 44;
      var thrR = (typeof thrusterRadius === "number") ? thrusterRadius : 6.5;
      ctx.save();
      ctx.translate(-10 + thrusterOffsetX, 0);
      ctx.scale(leftScale, 1);
      ctx.translate(10 - thrusterOffsetX, 0);
      ctx.beginPath();
      ctx.rect(-thrW / 2 + thrusterOffsetX, thrusterBaseY, thrW / 2, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-thrW * 0.27 + thrusterOffsetX, thrusterBaseY + 6, thrR, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(10 + thrusterOffsetX, 0);
      ctx.scale(rightScale, 1);
      ctx.translate(-10 - thrusterOffsetX, 0);
      ctx.beginPath();
      ctx.rect(thrusterOffsetX, thrusterBaseY, thrW / 2, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(thrW * 0.27 + thrusterOffsetX, thrusterBaseY + 6, thrR, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if(isAm2){
        ctx.beginPath();
        ctx.arc(thrusterOffsetX, thrusterBaseY + 8, 5.5, 0, Math.PI*2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();

    var flash = ghost ? 0 : (ship.flash || 0);
    if(flash > 0){
      ctx.save();
      ctx.globalAlpha = baseAlpha * Math.min(1, flash);
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(-4, -26 - recoilShift);
      ctx.lineTo(0, -38 - recoilShift - flash*6);
      ctx.lineTo(4, -26 - recoilShift);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    var forwardBoost = Math.max(0, -vyN);
    var flame = 12 + speedMag * 18 + (Math.sin(t*0.03) * 2.6) + forwardBoost * 22;
    flame *= ghostFlameBoost;

    var bloom = 0.35 + speedMag * 0.5 + forwardBoost * 0.6 + (Math.sin(t * 0.02) * 0.08);
    bloom *= ghostFlameBoost;
    var flameWiggle = (Math.sin(t * 0.06) + Math.sin(t * 0.11 + 1.4)) * 0.6 * (0.6 + speedMag);
    ctx.save();
    ctx.globalAlpha = baseAlpha * (0.2 + bloom * 0.22);
    ctx.fillStyle = colors.flame || "rgba(0,229,255,.35)";
    ctx.shadowColor = colors.flame || "rgba(0,229,255,.4)";
    ctx.shadowBlur = 12 + bloom * 9;
    ctx.beginPath();
    if(isSpire){
      ctx.arc(thrusterOffsetX, thrusterBaseY + 7, 7 + bloom * 5, 0, Math.PI*2);
    }else{
      ctx.arc(-dualFlameSpread + thrusterOffsetX, thrusterBaseY + 6, 5 + bloom * 4, 0, Math.PI*2);
      ctx.arc(dualFlameSpread + thrusterOffsetX, thrusterBaseY + 6, 5 + bloom * 4, 0, Math.PI*2);
      if(isAm2){
        ctx.arc(thrusterOffsetX, thrusterBaseY + 8, 4.5 + bloom * 3.5, 0, Math.PI*2);
      }
    }
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = baseAlpha * (0.85 + forwardBoost * 0.35);
    ctx.fillStyle = colors.flame || "rgba(193,216,47,.16)";
    ctx.beginPath();
    if(isSpire){
      ctx.moveTo(-6 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrusterOffsetX + flameWiggle, thrusterBaseY + flame * 1.1);
      ctx.lineTo(6 + thrusterOffsetX, thrusterBaseY);
    }else{
      ctx.moveTo(-dualFlameOuter + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(-dualFlameSpread + thrusterOffsetX + flameWiggle, thrusterBaseY + flame);
      ctx.lineTo(-dualFlameInnerA + thrusterOffsetX, thrusterBaseY);
      ctx.moveTo(dualFlameInnerA + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(dualFlameSpread + thrusterOffsetX + flameWiggle, thrusterBaseY + flame);
      ctx.lineTo(dualFlameOuter + thrusterOffsetX, thrusterBaseY);
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = baseAlpha * (0.22 + forwardBoost * 0.25);
    ctx.fillStyle = "rgba(0,229,255,.16)";
    ctx.beginPath();
    if(isSpire){
      ctx.moveTo(-10 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrusterOffsetX + flameWiggle, thrusterBaseY + flame*1.22);
      ctx.lineTo(10 + thrusterOffsetX, thrusterBaseY);
    }else{
      ctx.moveTo(-dualFlameWide + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(-dualFlameSpread + thrusterOffsetX + flameWiggle, thrusterBaseY + flame*1.18);
      ctx.lineTo(thrusterOffsetX, thrusterBaseY);
      ctx.moveTo(thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(dualFlameSpread + thrusterOffsetX + flameWiggle, thrusterBaseY + flame*1.18);
      ctx.lineTo(dualFlameWide + thrusterOffsetX, thrusterBaseY);
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = baseAlpha * 0.8;
    ctx.fillStyle = colors.flame || "rgba(0,229,255,.14)";
    ctx.beginPath();
    if(isSpire){
      ctx.moveTo(-4 + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(thrusterOffsetX + flameWiggle * 0.6, thrusterBaseY + flame*0.8);
      ctx.lineTo(4 + thrusterOffsetX, thrusterBaseY);
    }else{
      ctx.moveTo(-dualFlameInnerC + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(-dualFlameSpread + thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY + flame*0.7);
      ctx.lineTo(-dualFlameInnerB + thrusterOffsetX, thrusterBaseY);
      ctx.moveTo(dualFlameInnerB + thrusterOffsetX, thrusterBaseY);
      ctx.lineTo(dualFlameSpread + thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY + flame*0.7);
      ctx.lineTo(dualFlameInnerC + thrusterOffsetX, thrusterBaseY);
    }
    ctx.closePath();
    ctx.fill();
    if(isAm2){
      ctx.globalAlpha = baseAlpha * 0.75;
      ctx.fillStyle = colors.flame || "rgba(120,220,255,.9)";
      ctx.beginPath();
      ctx.moveTo(-3 + thrusterOffsetX, thrusterBaseY - 2);
      ctx.lineTo(thrusterOffsetX + flameWiggle * 0.5, thrusterBaseY - 2 + flame*0.9);
      ctx.lineTo(3 + thrusterOffsetX, thrusterBaseY - 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    if(Math.abs(vxN) > 0.18 && !ghost){
      var sx = (vxN > 0) ? -30 : 30;
      ctx.save();
      ctx.globalAlpha = baseAlpha * 0.55;
      ctx.fillStyle = "rgba(175,0,111,.14)";
      ctx.beginPath();
      ctx.moveTo(sx, 6);
      ctx.lineTo(sx + (vxN > 0 ? -10 : 10), 10);
      ctx.lineTo(sx, 14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = baseAlpha * 0.7;
    ctx.fillStyle = "rgba(255,255,255,.10)";
    ctx.beginPath();
    ctx.arc(0, -20, 6, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = baseAlpha * 0.85;
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
    ctx.restore();
  }

  function drawShipPreview(canvas, ship, t, rings, particles, alpha){
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0,0,w,h);
    if(rings) drawPreviewRings(ctx, rings);
    if(particles) drawPreviewParticles(ctx, particles);
    renderShipPreview(ctx, ship, w/2, h/2 + 8, alpha == null ? 1 : alpha, false, ship.vx, ship.vy, {});
  }

  function drawImageShipPreviewFx(item, now){
    var img = item.img;
    if(!img) return;
    var t = (now / 1000) + item.phase;
    var bob = Math.sin(t * 2.4) * 2.4;
    img.style.transform = "translateY(" + bob.toFixed(2) + "px)";
  }

  function easeInOut(p){
    return 0.5 - Math.cos(Math.PI * p) / 2;
  }

  function getPreviewAnim(tSec){
    var seq = [1.2, 1.1, 0.9, 0.7, 1.0];
    var total = seq[0] + seq[1] + seq[2] + seq[3] + seq[4];
    var t = tSec % total;
    var stage = 0;
    while(stage < seq.length && t > seq[stage]){
      t -= seq[stage];
      stage++;
    }
    var p = seq[stage] ? (t / seq[stage]) : 0;
    return {
      stage: stage,
      p: p,
      thrust: stage === 1 ? easeInOut(p) : 0,
      back: stage === 3 ? easeInOut(p) : 0,
      ability: 0
    };
  }

  function abilityTypeForShip(shipType){
    if(shipType === "spire") return "flares";
    if(shipType === "am2") return "teleport";
    return "shockwave";
  }

  function initShipPreviews(){
    var cards = Array.prototype.slice.call(document.querySelectorAll(".shipCard"));
    var animated = [];
    var imageAnimated = [];
    var animateShips = { classic: true, spire: true, am2: true };
    var speedMap = { classic: 480, spire: 560, am2: 660 };
    cards.forEach(function(card){
      var option = card.closest(".shipOption");
      if(!option) return;
      var shipType = option.getAttribute("data-ship") || "mk7";
      var imagePreview = card.querySelector(".shipImagePreview");
      if(imagePreview){
        var oldProcedural = card.querySelector(".shipCanvas");
        if(oldProcedural){
          oldProcedural.remove();
        }
        var svgFallback = card.querySelector(".shipSvg");
        if(svgFallback){
          svgFallback.style.display = "none";
        }
        imagePreview.style.position = "relative";
        imagePreview.style.zIndex = "2";
        imageAnimated.push({
          card: card,
          img: imagePreview,
          shipType: shipType,
          phase: Math.random() * Math.PI * 2
        });
        return;
      }
      var svg = card.querySelector(".shipSvg");
      var canvas = document.createElement("canvas");
      canvas.className = "shipCanvas";
      canvas.width = 220;
      canvas.height = 200;
      if(svg){
        svg.replaceWith(canvas);
      }else{
        card.insertBefore(canvas, card.firstChild);
      }
      var previewShip = {
        shipType: shipType,
        hull: 1,
        speed: speedMap[shipType] || 560,
        vx: 0,
        vy: 0,
        bankHold: 0,
        recoil: 0,
        flash: 0,
        hitFlash: 0,
        defenseMode: "none"
      };
      if(animateShips[shipType]){
        animated.push({
          canvas: canvas,
          ship: previewShip,
          rings: [],
          particles: [],
          abilityActive: false,
          abilityType: abilityTypeForShip(shipType),
          abilityStart: 0,
          abilityUntil: 0,
          teleportHideUntil: 0
        });
      }else{
        drawShipPreview(canvas, previewShip, performance.now(), null, null);
      }
    });

    if(animated.length || imageAnimated.length){
      var lastAt = performance.now();
      var loop = function(){
        var now = performance.now();
        var dt = Math.min(0.05, (now - lastAt) / 1000);
        lastAt = now;
        var tSec = now / 1000;
        for(var i=0; i<animated.length; i++){
          var item = animated[i];
          var anim = getPreviewAnim(tSec);
          item.ship.vx = 0;
          item.ship.vy = (-item.ship.speed * anim.thrust * 0.7) + (item.ship.speed * (anim.back || 0) * 0.4);
          item.ship.recoil = 0;
          item.ship.flash = 0;
          item.abilityActive = false;
          var abilityStrength = 0;
          if(item.abilityUntil && now < item.abilityUntil){
            var dur = Math.max(0.1, (item.abilityUntil - item.abilityStart) / 1000);
            var p = Math.min(1, (now - item.abilityStart) / (dur * 1000));
            abilityStrength = Math.sin(Math.PI * p);
            item.abilityActive = abilityStrength > 0.02;
          }
          var alpha = 1;
          if(item.teleportHideUntil && now < item.teleportHideUntil){
            alpha = 0;
          }
          updatePreviewRings(item.rings, dt);
          updatePreviewParticles(item.particles, dt);
          drawShipPreview(item.canvas, item.ship, now, item.rings, item.particles, alpha);
        }
        for(var j = 0; j < imageAnimated.length; j++){
          drawImageShipPreviewFx(imageAnimated[j], now);
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    window.triggerShipPreviewAbility = function(shipType){
      if(!shipType) return;
      for(var i=0; i<animated.length; i++){
        var item = animated[i];
        if(item.ship.shipType !== shipType) continue;
        var now = performance.now();
        item.abilityStart = now;
        item.abilityUntil = now + 900;
        item.rings.length = 0;
        item.particles.length = 0;
        var scale = (scaleMap[item.ship.shipType] || 0.74) * 2.4;
        var centerX = item.canvas.width / 2;
        var centerY = item.canvas.height / 2 + 8;
        if(item.abilityType === "shockwave"){
          spawnPreviewRing(item.rings, centerX, centerY - 10 * scale, 26 * scale);
        }else if(item.abilityType === "flares"){
          var flareOffset = 46 * scale;
          var leftX = centerX - flareOffset;
          var rightX = centerX + flareOffset;
          spawnPreviewParticles(item.particles, leftX, centerY - 4 * scale, "spark");
          spawnPreviewParticles(item.particles, rightX, centerY - 4 * scale, "spark");
          spawnPreviewDirectedSparks(item.particles, leftX, centerY - 4 * scale, -1, 0, 0.4, 18, 240 * scale, 560 * scale, 0.12, 0.24);
          spawnPreviewDirectedSparks(item.particles, rightX, centerY - 4 * scale, 1, 0, 0.4, 18, 240 * scale, 560 * scale, 0.12, 0.24);
        }else if(item.abilityType === "teleport"){
          var endY = centerY - 60 * scale;
          spawnPreviewParticles(item.particles, centerX, centerY, "smoke");
          spawnPreviewParticles(item.particles, centerX, endY, "spark");
          item.teleportHideUntil = now + 120;
        }
        break;
      }
    };
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initShipPreviews);
  }else{
    initShipPreviews();
  }
})();
