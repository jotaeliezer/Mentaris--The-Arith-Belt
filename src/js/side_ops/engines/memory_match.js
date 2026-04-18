"use strict";

/**
 * Reusable memory-match engine. Caller supplies a list of pair objects:
 *   [{ id, faceA, faceB }, ...]
 * where faceA / faceB can be plain strings or raw HTML (controlled by
 * `htmlFaces: true`). Each pair yields two cards (L and R); a match requires
 * same pair `id` and different `kind` (L vs R).
 *
 * mountMemoryMatch(container, { pairs, api, htmlFaces, pairLabel, accent })
 * returns a teardown function.
 */

const DEFAULT_MISS_DELAY_MS = 900;

function shuffle(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function buildDeck(pairs){
  const deck = [];
  pairs.forEach((p) => {
    deck.push({ key: "L-" + p.id, id: p.id, face: p.faceA, kind: "L" });
    deck.push({ key: "R-" + p.id, id: p.id, face: p.faceB, kind: "R" });
  });
  return shuffle(deck);
}

function el(tag, attrs, children){
  const node = document.createElement(tag);
  if(attrs){
    for(const k in attrs){
      if(k === "class") node.className = attrs[k];
      else if(k === "style") node.setAttribute("style", attrs[k]);
      else if(k.startsWith("on") && typeof attrs[k] === "function"){
        node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      }
      else if(k === "html") node.innerHTML = attrs[k];
      else if(attrs[k] != null) node.setAttribute(k, attrs[k]);
    }
  }
  if(children){
    for(const c of children){
      if(c == null) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
  }
  return node;
}

export function mountMemoryMatch(container, opts){
  const pairs = opts.pairs || [];
  const api = opts.api;
  const htmlFaces = !!opts.htmlFaces;
  const pairLabel = opts.pairLabel || "Pairs";
  const accent = opts.accent || "accent";

  const total = pairs.length;
  const deck = buildDeck(pairs);

  const state = {
    flipped: [],
    matched: new Set(),
    moves: 0,
    started: false,
    startTime: 0,
    locked: false,
    destroyed: false
  };

  api.hud.setChips([
    { id: "pairs", label: pairLabel, value: "0 / " + total, variant: accent },
    { id: "moves", label: "Moves", value: "0" },
    { id: "time", label: "Time", value: "0:00" },
    { spacer: true }
  ]);

  // Layout
  container.innerHTML = "";
  const cardMin = (() => {
    if(deck.length >= 24) return 84;
    if(deck.length >= 16) return 100;
    if(deck.length >= 10) return 120;
    return 140;
  })();

  const grid = el("div", {
    class: "memoryMatchGrid",
    style: [
      "display:grid",
      "grid-template-columns:repeat(auto-fill, minmax(" + cardMin + "px, 1fr))",
      "gap:10px",
      "padding:4px"
    ].join(";")
  });

  const cardEls = {};

  deck.forEach((card) => {
    const btn = el("button", {
      type: "button",
      class: "memoryCard",
      "data-key": card.key,
      "data-id": String(card.id),
      style: [
        "position:relative",
        "aspect-ratio:3/4",
        "min-height:92px",
        "border-radius:14px",
        "border:1px solid var(--ui-border-accent)",
        "background:linear-gradient(160deg, rgba(0,229,255,.12), rgba(8,14,28,.85))",
        "color:var(--ui-text-bright)",
        "cursor:pointer",
        "font:inherit",
        "font-size:22px",
        "font-weight:700",
        "letter-spacing:.5px",
        "text-align:center",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:8px",
        "transition:transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease",
        "overflow:hidden"
      ].join(";")
    });
    setCardFace(btn, null);
    btn.addEventListener("click", () => onCardClick(card, btn));
    cardEls[card.key] = btn;
    grid.appendChild(btn);
  });

  container.appendChild(grid);

  function setCardFace(btn, card){
    if(!card){
      btn.innerHTML = "<span style=\"opacity:.55;font-size:28px;\">?</span>";
      btn.style.background = "linear-gradient(160deg, rgba(0,229,255,.12), rgba(8,14,28,.85))";
      btn.classList.remove("revealed");
      return;
    }
    if(htmlFaces){
      btn.innerHTML = "<span>" + card.face + "</span>";
    } else {
      btn.textContent = card.face;
    }
    btn.style.background = "linear-gradient(160deg, rgba(0,229,255,.22), rgba(8,14,28,.9))";
    btn.classList.remove("revealed");
    // Force reflow so the flip animation retriggers on subsequent flips.
    void btn.offsetWidth;
    btn.classList.add("revealed");
  }

  function markMatched(btn){
    btn.style.background = "linear-gradient(160deg, rgba(193,216,47,.22), rgba(8,20,14,.85))";
    btn.style.borderColor = "rgba(193,216,47,.55)";
    btn.style.boxShadow = "0 0 18px rgba(193,216,47,.25)";
    btn.style.cursor = "default";
    btn.classList.remove("miss");
    void btn.offsetWidth;
    btn.classList.add("matched");
  }

  function markMiss(btn){
    btn.style.borderColor = "rgba(255,77,109,.55)";
    btn.style.boxShadow = "0 0 14px rgba(255,77,109,.22)";
    void btn.offsetWidth;
    btn.classList.add("miss");
  }
  function clearMiss(btn){
    btn.style.borderColor = "var(--ui-border-accent)";
    btn.style.boxShadow = "";
    btn.classList.remove("miss");
  }

  function onCardClick(card, btn){
    if(state.destroyed) return;
    if(state.locked) return;
    if(state.matched.has(card.id)) return;
    if(state.flipped.find((c) => c.key === card.key)) return;
    if(state.flipped.length >= 2) return;

    api.sfx.click();
    if(!state.started){
      state.started = true;
      state.startTime = performance.now();
      api.hud.startTimer();
    }

    setCardFace(btn, card);
    state.flipped.push(card);

    if(state.flipped.length === 2){
      state.moves += 1;
      api.hud.setStat("moves", String(state.moves));
      const [a, b] = state.flipped;
      if(a.id === b.id && a.kind !== b.kind){
        state.matched.add(a.id);
        markMatched(cardEls[a.key]);
        markMatched(cardEls[b.key]);
        state.flipped = [];
        api.hud.setStat("pairs", state.matched.size + " / " + total, accent);
        api.hud.flashStat && api.hud.flashStat("pairs");
        api.sfx.success();
        if(state.matched.size === total){
          finishRun(true);
        }
      } else {
        state.locked = true;
        api.sfx.error();
        markMiss(cardEls[a.key]);
        markMiss(cardEls[b.key]);
        setTimeout(() => {
          if(state.destroyed) return;
          setCardFace(cardEls[a.key], null);
          setCardFace(cardEls[b.key], null);
          clearMiss(cardEls[a.key]);
          clearMiss(cardEls[b.key]);
          state.flipped = [];
          state.locked = false;
        }, DEFAULT_MISS_DELAY_MS);
      }
    }
  }

  function finishRun(won){
    api.hud.stopTimer();
    const elapsed = state.started ? performance.now() - state.startTime : 0;
    const rows = [
      { label: "Pairs", value: state.matched.size + " / " + total },
      { label: "Moves", value: String(state.moves) },
      { label: "Time", value: formatTime(elapsed) }
    ];
    if(state.moves > 0){
      const efficiency = total > 0 ? Math.round((total / state.moves) * 100) : 0;
      rows.push({ label: "Efficiency", value: efficiency + "%" });
    }
    api.exit({
      title: won ? "All Pairs Matched" : "Run Ended",
      kicker: won ? "COMPLETE" : "RUN ENDED",
      rows: rows
    });
  }

  function formatTime(ms){
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return mm + ":" + (ss < 10 ? "0" : "") + ss;
  }

  return function teardown(){
    state.destroyed = true;
    api.hud.stopTimer();
  };
}
