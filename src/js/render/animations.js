"use strict";

import { clamp, rand } from "../core/utils.js";

export function createFx(ctx, state, player, beepFn){
  var particles = [];
  var rings = [];
  var cam = { x:0, y:0, t:0, t0:0, amp:0 };

  function kickShake(amp, dur){
    cam.amp = Math.max(cam.amp, amp);
    cam.t0 = Math.max(cam.t0, dur);
    cam.t  = Math.max(cam.t, dur);
  }

  function updateCamera(dtReal){
    if(cam.t > 0){
      cam.t = Math.max(0, cam.t - dtReal);
      var f = cam.t0 > 0 ? (cam.t / cam.t0) : 0;
      cam.x = (Math.random()*2 - 1) * cam.amp * f;
      cam.y = (Math.random()*2 - 1) * cam.amp * f;
    }else{
      cam.x = 0; cam.y = 0; cam.amp = 0; cam.t0 = 0;
    }
  }

  function spawnRing(x,y, baseR){
    rings.push({ x:x, y:y, r: baseR + 6, dr: 520, a: 1 });
    if(rings.length > 14) rings.splice(0, rings.length - 14);
  }

  function updateRings(dt){
    for(var i=rings.length-1; i>=0; i--){
      var rr = rings[i];
      rr.r += rr.dr * dt;
      rr.a -= dt * 3.2;
      if(rr.a <= 0) rings.splice(i,1);
    }
  }

  function drawRings(){
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

  function spawnParticles(x,y, kind){
    var n = (kind === "correct") ? 36
          : (kind === "wrong") ? 22
          : (kind === "mineral") ? 24
          : (kind === "spark") ? 26
          : (kind === "smoke") ? 8
          : 12;

    var sp = (kind === "correct") ? 520
           : (kind === "wrong") ? 420
           : (kind === "mineral") ? 640
           : (kind === "spark") ? 780
           : (kind === "smoke") ? 90
           : 320;

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
        r: rand(1.2, (kind === "correct") ? 3.0 : (kind === "spark" ? 2.2 : (kind === "mineral" ? 2.6 : 2.4))),
        a: rand(0.55, 0.95),
        life: (kind === "correct") ? rand(0.22, 0.38)
             : (kind === "mineral") ? rand(0.12, 0.26)
             : (kind === "spark") ? rand(0.10, 0.22)
             : rand(0.18, 0.32),
        kind: kind,
        spin: rand(-6,6)
      });
    }

    if(particles.length > 180) particles.splice(0, particles.length - 180);
  }

  function spawnDirectedSparks(x, y, dirX, dirY, spread, count, speedMin, speedMax, lifeMin, lifeMax, kind){
    var baseAng = Math.atan2(dirY, dirX);
    var n = count || 14;
    var spMin = speedMin || 220;
    var spMax = speedMax || 520;
    var lMin = lifeMin || 0.12;
    var lMax = lifeMax || 0.26;
    var useKind = kind || "spark";
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
        kind: useKind,
        spin: rand(-6,6)
      });
    }
    if(particles.length > 180) particles.splice(0, particles.length - 180);
  }

  function updateParticles(dt){
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

  function drawParticles(){
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

      if(q.kind === "correct") ctx.fillStyle = "rgba(0,229,255,.9)";
      else if(q.kind === "wrong") ctx.fillStyle = "rgba(255,77,109,.9)";
      else if(q.kind === "mineral") ctx.fillStyle = "rgba(130,225,255,.95)";
      else if(q.kind === "spark") ctx.fillStyle = "rgba(255,221,0,.90)";
      else if(q.kind === "spark_white") ctx.fillStyle = "rgba(255,255,255,.95)";
      else ctx.fillStyle = "rgba(232,236,255,.7)";

      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function impactCorrect(x,y,r){
    state.slowMoRemaining = 0.10;
    state.slowMoScale = 0.42;
    kickShake(7.5, 0.10);
    spawnRing(x,y,r);
    spawnParticles(x,y,"correct");
  }

  function impactWrong(x,y){
    kickShake(4.0, 0.08);
    spawnParticles(x,y,"wrong");
  }

  function impactDebris(x,y){
    kickShake(2.0, 0.06);
    spawnParticles(x,y,"debris");
  }

  function impactShipHit(x,y){
    state.slowMoRemaining = 0.0;
    kickShake(28.0, 0.16);
    spawnParticles(x,y,"spark");
    spawnParticles(x,y,"smoke");
    if(beepFn) beepFn(120, 95, "sawtooth", 0.035);
  }

  function emitDamageSmoke(dt){
    var dmg = 1 - player.hull;
    if(dmg <= 0.02) return;
    if(player.invuln > 0) return;

    var speedMag = Math.min(1, Math.hypot(player.vx, player.vy) / (player.speed || 1));
    var rate = (0.6 + speedMag*0.8) * dmg;

    var p = clamp(rate * dt * 6.0, 0, 0.55);
    if(Math.random() < p){
      spawnParticles(player.x + rand(-6,6), player.y + 14 + rand(-2,2), "smoke");
    }
  }

  return {
    particles:particles,
    rings:rings,
    cam:cam,
    kickShake:kickShake,
    updateCamera:updateCamera,
    spawnRing:spawnRing,
    updateRings:updateRings,
    drawRings:drawRings,
    spawnParticles:spawnParticles,
    spawnDirectedSparks:spawnDirectedSparks,
    updateParticles:updateParticles,
    drawParticles:drawParticles,
    impactCorrect:impactCorrect,
    impactWrong:impactWrong,
    impactDebris:impactDebris,
    impactShipHit:impactShipHit,
    emitDamageSmoke:emitDamageSmoke
  };
}
