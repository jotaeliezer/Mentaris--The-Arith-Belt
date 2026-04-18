"use strict";

/**
 * Floating-asteroid ambient background. Creates a fixed, pointer-events:none
 * layer below the Side Ops UI. Each asteroid gets a random image, size,
 * starting position, drift vector, and rotation. Motion is driven by CSS
 * variables so we can update them per-element and let the GPU compositor
 * animate the transform.
 */

const ASTEROID_IMAGES = [
  "images/asteroids/asteroid1.png",
  "images/asteroids/asteroid2.png",
  "images/asteroids/asteroid3.png",
  "images/asteroids/asteroid4.png",
  "images/asteroids/asteroid6.png"
];

function rand(lo, hi){ return lo + Math.random() * (hi - lo); }
function pick(a){ return a[Math.floor(Math.random() * a.length)]; }

export function mountFloatingAsteroidBg(count){
  if(document.getElementById("sideOpsFloatingBg")) return;
  const n = count || 14;

  const style = document.createElement("style");
  style.id = "sideOpsFloatingBgStyle";
  style.textContent = `
    #sideOpsFloatingBg{
      position:fixed;
      inset:0;
      pointer-events:none;
      z-index:0;
      overflow:hidden;
    }
    #sideOpsFloatingBg::before{
      content:"";
      position:absolute;
      inset:-10%;
      background:
        radial-gradient(circle at 18% 28%, rgba(255,255,255,.08), transparent 22%),
        radial-gradient(circle at 78% 68%, rgba(255,255,255,.06), transparent 18%),
        radial-gradient(circle at 42% 88%, rgba(255,255,255,.05), transparent 14%),
        radial-gradient(circle at 88% 14%, rgba(255,255,255,.07), transparent 16%);
      opacity:.6;
      animation: sideOpsBgStars 36s linear infinite;
    }
    .sideOpsAsteroid{
      position:absolute;
      left:var(--sx);
      top:var(--sy);
      width:var(--sz);
      height:var(--sz);
      opacity:0;
      filter: drop-shadow(0 0 12px rgba(0,229,255,.18)) drop-shadow(0 18px 40px rgba(0,0,0,.5));
      will-change: transform, opacity;
      pointer-events:none;
      user-select:none;
      animation:
        sideOpsAstDrift var(--dur) ease-in-out infinite,
        sideOpsAstSpin var(--spin) linear infinite,
        sideOpsAstFade var(--fade) ease-in-out infinite;
      animation-delay: var(--d1), var(--d2), var(--d3);
    }
    @keyframes sideOpsAstDrift{
      0%  { transform: translate3d(0,0,0); }
      50% { transform: translate3d(var(--dx), var(--dy), 0); }
      100%{ transform: translate3d(0,0,0); }
    }
    @keyframes sideOpsAstSpin{
      0%  { rotate: 0deg; }
      100%{ rotate: var(--rotTarget, 360deg); }
    }
    @keyframes sideOpsAstFade{
      0%, 8%   { opacity:0; }
      25%      { opacity: var(--peakOpacity, .28); }
      70%      { opacity: var(--peakOpacity, .28); }
      92%, 100%{ opacity:0; }
    }
    @keyframes sideOpsBgStars{
      0%  { transform: translate3d(0,0,0); }
      100%{ transform: translate3d(-30px, -20px, 0); }
    }

    body.sideOpsReduced .sideOpsAsteroid{
      animation: none;
      opacity: .14;
    }

    @media (prefers-reduced-motion: reduce){
      .sideOpsAsteroid{ animation: none; opacity: .14; }
      #sideOpsFloatingBg::before{ animation: none; }
    }

    .sideOpsWrap{ position:relative; z-index:2; }
  `;
  document.head.appendChild(style);

  const wrap = document.createElement("div");
  wrap.id = "sideOpsFloatingBg";
  wrap.setAttribute("aria-hidden", "true");

  for(let i = 0; i < n; i++){
    const img = document.createElement("img");
    img.src = pick(ASTEROID_IMAGES);
    img.className = "sideOpsAsteroid";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";

    const size = Math.round(rand(48, 180));
    const startX = rand(-5, 100);
    const startY = rand(-5, 100);
    const driftX = Math.round(rand(-120, 120));
    const driftY = Math.round(rand(-80, 80));
    const dur = rand(22, 44).toFixed(1) + "s";
    const spin = rand(22, 60).toFixed(1) + "s";
    const fade = rand(18, 30).toFixed(1) + "s";
    const d1 = (-rand(0, 30)).toFixed(1) + "s";
    const d2 = (-rand(0, 30)).toFixed(1) + "s";
    const d3 = (-rand(0, 30)).toFixed(1) + "s";
    const rotTarget = (Math.random() > 0.5 ? 360 : -360) + "deg";
    const peak = rand(0.14, 0.34).toFixed(2);

    img.style.setProperty("--sx", startX + "%");
    img.style.setProperty("--sy", startY + "%");
    img.style.setProperty("--sz", size + "px");
    img.style.setProperty("--dx", driftX + "px");
    img.style.setProperty("--dy", driftY + "px");
    img.style.setProperty("--dur", dur);
    img.style.setProperty("--spin", spin);
    img.style.setProperty("--fade", fade);
    img.style.setProperty("--d1", d1);
    img.style.setProperty("--d2", d2);
    img.style.setProperty("--d3", d3);
    img.style.setProperty("--rotTarget", rotTarget);
    img.style.setProperty("--peakOpacity", peak);

    wrap.appendChild(img);
  }

  document.body.insertBefore(wrap, document.body.firstChild);
}
