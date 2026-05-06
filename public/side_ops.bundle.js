"use strict";
(() => {
  // src/js/side_ops/engines/memory_match.js
  var DEFAULT_MISS_DELAY_MS = 900;
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }
  function buildDeck(pairs) {
    const deck = [];
    pairs.forEach((p) => {
      deck.push({ key: "L-" + p.id, id: p.id, face: p.faceA, kind: "L" });
      deck.push({ key: "R-" + p.id, id: p.id, face: p.faceB, kind: "R" });
    });
    return shuffle(deck);
  }
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class")
          node.className = attrs[k];
        else if (k === "style")
          node.setAttribute("style", attrs[k]);
        else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (k === "html")
          node.innerHTML = attrs[k];
        else if (attrs[k] != null)
          node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      for (const c of children) {
        if (c == null)
          continue;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
    }
    return node;
  }
  function mountMemoryMatch(container, opts) {
    const pairs = opts.pairs || [];
    const api = opts.api;
    const htmlFaces = !!opts.htmlFaces;
    const pairLabel = opts.pairLabel || "Pairs";
    const accent = opts.accent || "accent";
    const total = pairs.length;
    const deck = buildDeck(pairs);
    const state = {
      flipped: [],
      matched: /* @__PURE__ */ new Set(),
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
    container.innerHTML = "";
    const cardMin = (() => {
      if (deck.length >= 24)
        return 84;
      if (deck.length >= 16)
        return 100;
      if (deck.length >= 10)
        return 120;
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
    function setCardFace(btn, card) {
      if (!card) {
        btn.innerHTML = '<span style="opacity:.55;font-size:28px;">?</span>';
        btn.style.background = "linear-gradient(160deg, rgba(0,229,255,.12), rgba(8,14,28,.85))";
        btn.classList.remove("revealed");
        return;
      }
      if (htmlFaces) {
        btn.innerHTML = "<span>" + card.face + "</span>";
      } else {
        btn.textContent = card.face;
      }
      btn.style.background = "linear-gradient(160deg, rgba(0,229,255,.22), rgba(8,14,28,.9))";
      btn.classList.remove("revealed");
      void btn.offsetWidth;
      btn.classList.add("revealed");
    }
    function markMatched(btn) {
      btn.style.background = "linear-gradient(160deg, rgba(193,216,47,.22), rgba(8,20,14,.85))";
      btn.style.borderColor = "rgba(193,216,47,.55)";
      btn.style.boxShadow = "0 0 18px rgba(193,216,47,.25)";
      btn.style.cursor = "default";
      btn.classList.remove("miss");
      void btn.offsetWidth;
      btn.classList.add("matched");
    }
    function markMiss(btn) {
      btn.style.borderColor = "rgba(255,77,109,.55)";
      btn.style.boxShadow = "0 0 14px rgba(255,77,109,.22)";
      void btn.offsetWidth;
      btn.classList.add("miss");
    }
    function clearMiss(btn) {
      btn.style.borderColor = "var(--ui-border-accent)";
      btn.style.boxShadow = "";
      btn.classList.remove("miss");
    }
    function onCardClick(card, btn) {
      if (state.destroyed)
        return;
      if (state.locked)
        return;
      if (state.matched.has(card.id))
        return;
      if (state.flipped.find((c) => c.key === card.key))
        return;
      if (state.flipped.length >= 2)
        return;
      api.sfx.click();
      if (!state.started) {
        state.started = true;
        state.startTime = performance.now();
        api.hud.startTimer();
      }
      setCardFace(btn, card);
      state.flipped.push(card);
      if (state.flipped.length === 2) {
        state.moves += 1;
        api.hud.setStat("moves", String(state.moves));
        const [a, b] = state.flipped;
        if (a.id === b.id && a.kind !== b.kind) {
          state.matched.add(a.id);
          markMatched(cardEls[a.key]);
          markMatched(cardEls[b.key]);
          state.flipped = [];
          api.hud.setStat("pairs", state.matched.size + " / " + total, accent);
          api.hud.flashStat && api.hud.flashStat("pairs");
          api.sfx.success();
          if (state.matched.size === total) {
            finishRun(true);
          }
        } else {
          state.locked = true;
          api.sfx.error();
          markMiss(cardEls[a.key]);
          markMiss(cardEls[b.key]);
          setTimeout(() => {
            if (state.destroyed)
              return;
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
    function finishRun(won) {
      api.hud.stopTimer();
      const elapsed = state.started ? performance.now() - state.startTime : 0;
      const rows = [
        { label: "Pairs", value: state.matched.size + " / " + total },
        { label: "Moves", value: String(state.moves) },
        { label: "Time", value: formatTime2(elapsed) }
      ];
      if (state.moves > 0) {
        const efficiency = total > 0 ? Math.round(total / state.moves * 100) : 0;
        rows.push({ label: "Efficiency", value: efficiency + "%" });
      }
      api.exit({
        title: won ? "All Pairs Matched" : "Run Ended",
        kicker: won ? "COMPLETE" : "RUN ENDED",
        rows
      });
    }
    function formatTime2(ms) {
      const s = Math.max(0, Math.floor(ms / 1e3));
      const mm = Math.floor(s / 60);
      const ss = s % 60;
      return mm + ":" + (ss < 10 ? "0" : "") + ss;
    }
    return function teardown() {
      state.destroyed = true;
      api.hud.stopTimer();
    };
  }

  // src/js/side_ops/games/perfect_match.js
  function buildPairs(start2, end) {
    const lo = Math.min(start2, end);
    const hi = Math.max(start2, end);
    const pairs = [];
    for (let n = lo; n <= hi; n++) {
      pairs.push({
        id: n,
        faceA: n + "\xB2",
        faceB: String(n * n)
      });
    }
    return pairs;
  }
  var descriptor = {
    id: "perfect_match",
    title: "Perfect Match",
    tagline: "Memory \u2022 Squares",
    blurb: "Match each n\xB2 tile with its numeric square. Clear the board as fast as you can.",
    brief: "Flip two cards per move. A match is a square notation (n\xB2) paired with its value (n\xD7n). Timer starts on your first flip.",
    configSchema: [
      {
        type: "number",
        id: "start",
        label: "Start n",
        default: 1,
        min: 1,
        max: 60,
        hint: "Lowest root in the deck."
      },
      {
        type: "number",
        id: "end",
        label: "End n",
        default: 12,
        min: 1,
        max: 60,
        hint: "Highest root. Up to 60."
      }
    ],
    mount(container, config, api) {
      const pairs = buildPairs(config.start, config.end);
      return mountMemoryMatch(container, {
        pairs,
        api,
        htmlFaces: false,
        pairLabel: "Pairs",
        accent: "accent"
      });
    }
  };

  // src/js/side_ops/games/root_match.js
  function buildPairs2(start2, end) {
    const lo = Math.min(start2, end);
    const hi = Math.max(start2, end);
    const pairs = [];
    for (let n = lo; n <= hi; n++) {
      pairs.push({
        id: n,
        faceA: "\u221A" + n * n,
        faceB: String(n)
      });
    }
    return pairs;
  }
  var descriptor2 = {
    id: "root_match",
    title: "Root Match",
    tagline: "Memory \u2022 Square Roots",
    blurb: "Match each radical \u221A(n\xB2) with its integer root. Inverse of Perfect Match.",
    brief: "Flip two cards per move. A match is a radical (\u221A of a square) paired with its positive root. Timer starts on your first flip.",
    configSchema: [
      {
        type: "number",
        id: "start",
        label: "Start n",
        default: 1,
        min: 1,
        max: 60,
        hint: "Lowest root in the deck."
      },
      {
        type: "number",
        id: "end",
        label: "End n",
        default: 12,
        min: 1,
        max: 60,
        hint: "Highest root. Up to 60."
      }
    ],
    mount(container, config, api) {
      const pairs = buildPairs2(config.start, config.end);
      return mountMemoryMatch(container, {
        pairs,
        api,
        htmlFaces: false,
        pairLabel: "Pairs",
        accent: "accent"
      });
    }
  };

  // src/js/side_ops/games/fraction_match.js
  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }
  function decimalWithBarHTML(n, d) {
    const g = gcd(n, d);
    n = n / g;
    d = d / g;
    let rem = n % d;
    if (rem === 0)
      return "0";
    let digits = "";
    const seen = {};
    let idx = 0;
    while (rem !== 0 && seen[rem] === void 0) {
      seen[rem] = idx++;
      rem *= 10;
      digits += Math.floor(rem / d);
      rem %= d;
    }
    if (rem === 0) {
      return "0." + digits;
    }
    const cut = seen[rem];
    const nonrep = digits.slice(0, cut);
    const rep = digits.slice(cut) || "0";
    return "0." + nonrep + '<span class="repeatOverline">' + rep + "</span>";
  }
  function buildFractionPairs(A, B) {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (let d = A; d <= B; d++) {
      for (let n = 1; n < d; n++) {
        const g = gcd(n, d);
        const p = n / g;
        const q = d / g;
        const key = p + "/" + q;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            id: key,
            faceA: key,
            faceB: decimalWithBarHTML(p, q)
          });
        }
      }
    }
    return out;
  }
  var descriptor3 = {
    id: "fraction_match",
    title: "Fraction Match",
    tagline: "Memory \u2022 Decimals",
    blurb: "Pair each reduced fraction with its decimal expansion. Watch for the repeating bar.",
    brief: "For denominators in [Start, End], match the unique reduced fractions against their decimal forms. Repeating digits are marked with an overline.",
    configSchema: [
      {
        type: "number",
        id: "start",
        label: "Start denominator",
        default: 2,
        min: 2,
        max: 12,
        hint: "Lowest denominator to pull pairs from."
      },
      {
        type: "number",
        id: "end",
        label: "End denominator",
        default: 6,
        min: 2,
        max: 12,
        hint: "Highest denominator. 12 generates a large deck."
      }
    ],
    mount(container, config, api) {
      const lo = Math.max(2, Math.min(config.start, config.end));
      const hi = Math.min(12, Math.max(config.start, config.end));
      const pairs = buildFractionPairs(lo, hi);
      return mountMemoryMatch(container, {
        pairs,
        api,
        htmlFaces: true,
        pairLabel: "Fractions",
        accent: "accent"
      });
    }
  };

  // src/js/side_ops/games/grid_master.js
  function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = h << 13 | h >>> 19;
    }
    return function hash() {
      h = Math.imul(h ^ h >>> 16, 2246822507);
      h = Math.imul(h ^ h >>> 13, 3266489909);
      return (h ^ h >>> 16) >>> 0;
    };
  }
  function sfc32(a, b, c, d) {
    return function rng() {
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      let t = a + b | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = c << 21 | c >>> 11;
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  function rngFromSeed(seed) {
    const h = xmur3(String(seed));
    return sfc32(h(), h(), h(), h());
  }
  function shuffleInPlace(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }
  function genDigitsSeq(rng, n, digits) {
    const L = [];
    const d = digits;
    const digs = [];
    for (let i = 0; i < d; i++) {
      if (i === 0) {
        digs.push(d > 1 ? 1 + Math.floor(rng() * 9) : Math.floor(rng() * 10));
      } else {
        digs.push(Math.floor(rng() * 10));
      }
    }
    for (let i = 0; i < n; i++) {
      let v = 0;
      for (let k = 0; k < digs.length; k++)
        v = v * 10 + digs[k];
      L.push(v);
      digs[d - 1] = (digs[d - 1] + 3) % 10;
      digs[0] = (digs[0] + 3) % 10;
      if (d > 1 && digs[0] === 0)
        digs[0] = (digs[0] + 3) % 10 || 1;
      for (let j = 1; j < d - 1; j++) {
        if (Math.random() < 0.3)
          digs[j] = Math.floor(rng() * 10);
      }
    }
    return L;
  }
  function sizesFor(maxItems) {
    if (maxItems === 40)
      return { ACOUNT: 8, BCOUNT: 5 };
    return { ACOUNT: 10, BCOUNT: 8 };
  }
  function buildAddSession(seed, digitA, digitB, maxItems) {
    const rng = rngFromSeed(seed);
    const { ACOUNT, BCOUNT } = sizesFor(maxItems);
    const AsBase = genDigitsSeq(rng, 10, digitA).slice(0, ACOUNT);
    const Bs = genDigitsSeq(rng, 10, digitB).slice(0, BCOUNT);
    const idxs = [];
    for (let i = 0; i < ACOUNT; i++)
      idxs.push(i);
    shuffleInPlace(idxs, rng);
    const negCount = Math.floor(ACOUNT / 2);
    const negSet = new Set(idxs.slice(0, negCount));
    const As = AsBase.map((v, i) => negSet.has(i) ? -v : v);
    const items = [];
    for (let ci = 0; ci < Bs.length; ci++) {
      for (let ri = 0; ri < As.length; ri++) {
        items.push({ ri, ci, A: As[ri], B: Bs[ci], answer: As[ri] + Bs[ci] });
      }
    }
    return { seed, As, Bs, items };
  }
  function buildMulSession(seed, digitA, digitB, maxItems) {
    const rng = rngFromSeed(seed);
    const { ACOUNT, BCOUNT } = sizesFor(maxItems);
    const As = genDigitsSeq(rng, 10, digitA).slice(0, ACOUNT);
    const bs = genDigitsSeq(rng, 10, digitB).slice(0, BCOUNT);
    const items = [];
    for (let ci = 0; ci < bs.length; ci++) {
      for (let ri = 0; ri < As.length; ri++) {
        items.push({ ri, ci, A: As[ri], B: bs[ci], answer: As[ri] * bs[ci] });
      }
    }
    return { seed, As, Bs: bs, items };
  }
  function fmtTime(ms) {
    const s = Math.max(0, Math.ceil(ms / 1e3));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }
  function formatOperand(n) {
    return n < 0 ? "(" + n + ")" : String(n);
  }
  function mount(container, config, api) {
    const mode = config.mode === "add" ? "add" : "mul";
    const maxItems = config.items === 40 ? 40 : 80;
    const minutes = [3, 5, 10].indexOf(config.minutes) >= 0 ? config.minutes : 10;
    const digitA = Math.max(1, Math.min(3, config.digitA || 3));
    const digitB = Math.max(1, Math.min(3, config.digitB || (mode === "mul" ? 1 : 3)));
    const seed = String(Math.floor(Math.random() * 2147483647));
    const session = mode === "add" ? buildAddSession(seed, digitA, digitB, maxItems) : buildMulSession(seed, digitA, digitB, maxItems);
    const state = {
      idx: 0,
      log: [],
      itemStart: 0,
      deadline: performance.now() + minutes * 60 * 1e3,
      ended: false,
      destroyed: false
    };
    api.hud.setChips([
      { id: "progress", label: "Progress", value: "0 / " + maxItems, variant: "accent" },
      { id: "correct", label: "Correct", value: "0" },
      { id: "streak", label: "Streak", value: "0", variant: "good" },
      { id: "time", label: "Time", value: fmtTime(minutes * 60 * 1e3), variant: "warn" },
      { spacer: true }
    ]);
    container.innerHTML = "";
    const seedBadge = document.createElement("div");
    seedBadge.style.cssText = "font-size:10px; letter-spacing:2px; text-transform:uppercase; color: var(--ui-text-label); margin-bottom:12px;";
    seedBadge.textContent = "MODE: " + mode.toUpperCase() + " \u2022 SEED: " + seed + " \u2022 " + (mode === "add" ? digitA + "d + " + digitB + "d" : digitA + "d \xD7 " + digitB + "d");
    container.appendChild(seedBadge);
    const promptEl = document.createElement("div");
    promptEl.className = "gridMasterPrompt";
    promptEl.style.cssText = [
      "font-size: clamp(32px, 6vw, 64px)",
      "font-weight:700",
      "letter-spacing:2px",
      "text-align:center",
      "color: var(--ui-text-bright)",
      "text-shadow: 0 0 18px rgba(0,229,255,.25)",
      "padding:24px 12px",
      "transition: color .2s ease, text-shadow .2s ease"
    ].join(";");
    container.appendChild(promptEl);
    const dirRow = document.createElement("div");
    dirRow.style.cssText = "display:flex; gap:6px; justify-content:center; align-items:center; margin-bottom:10px;";
    container.appendChild(dirRow);
    const dirLabel = document.createElement("span");
    dirLabel.textContent = "Entry";
    dirLabel.style.cssText = "font-size:10px; letter-spacing:2px; text-transform:uppercase; color: var(--ui-text-label); margin-right:4px;";
    dirRow.appendChild(dirLabel);
    function makeSeg(id, text, title) {
      const b = document.createElement("button");
      b.className = "btn sideOpsToggle";
      b.type = "button";
      b.id = id;
      b.textContent = text;
      b.title = title;
      b.style.cssText = "padding:6px 12px; font-size:11px; letter-spacing:1.5px; min-width:64px;";
      return b;
    }
    const segLR = makeSeg("gmSegLR", "L\u2192R", "Type left-to-right");
    const segRL = makeSeg("gmSegRL", "R\u2192L", "Type right-to-left");
    dirRow.appendChild(segLR);
    dirRow.appendChild(segRL);
    const inputWrap = document.createElement("div");
    inputWrap.style.cssText = "display:flex; gap:10px; justify-content:center; align-items:center; flex-wrap:wrap;";
    container.appendChild(inputWrap);
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.readOnly = true;
    input.style.cssText = [
      "font: inherit",
      "font-size:28px",
      "font-weight:700",
      "letter-spacing:2px",
      "text-align:center",
      "padding:12px 18px",
      "width:min(260px, 70vw)",
      "background: rgba(0,0,0,.35)",
      "color: var(--ui-text-bright)",
      "border:1px solid var(--ui-border-accent-strong)",
      "border-radius:12px",
      "outline:none",
      "caret-color: transparent"
    ].join(";");
    input.tabIndex = 0;
    inputWrap.appendChild(input);
    const submitBtn = document.createElement("button");
    submitBtn.className = "btn";
    submitBtn.type = "button";
    submitBtn.textContent = "Submit";
    submitBtn.style.cssText = "border-color: var(--ui-border-accent-strong); background: rgba(0,229,255,.14); color: var(--ui-accent-cyan-soft); min-width:110px;";
    inputWrap.appendChild(submitBtn);
    if (mode === "add") {
      const neg = document.createElement("button");
      neg.className = "btn";
      neg.type = "button";
      neg.textContent = "\xB1";
      neg.title = "Toggle sign";
      neg.addEventListener("click", () => {
        if (!input.value) {
          input.value = "-";
        } else if (input.value.charAt(0) === "-") {
          input.value = input.value.slice(1);
        } else {
          input.value = "-" + input.value;
        }
        input.focus();
      });
      inputWrap.appendChild(neg);
    }
    let entryRTL = (config.direction || "rtl") === "rtl";
    function setDir(rtl) {
      entryRTL = rtl;
      segLR.classList.toggle("on", !rtl);
      segRL.classList.toggle("on", rtl);
      segLR.style.background = !rtl ? "rgba(0,229,255,.18)" : "";
      segRL.style.background = rtl ? "rgba(0,229,255,.18)" : "";
      input.focus();
    }
    segLR.addEventListener("click", () => setDir(false));
    segRL.addEventListener("click", () => setDir(true));
    setDir(entryRTL);
    const feedback = document.createElement("div");
    feedback.style.cssText = "min-height:20px; margin-top:14px; text-align:center; letter-spacing:2px; text-transform:uppercase; font-size:12px;";
    container.appendChild(feedback);
    let correctCount = 0;
    let currentStreak = 0;
    let bestStreak = 0;
    function currentItem() {
      return session.items[state.idx];
    }
    function renderPrompt() {
      const it = currentItem();
      if (!it)
        return;
      if (mode === "add") {
        promptEl.textContent = formatOperand(it.A) + "  +  " + formatOperand(it.B) + "  =  ?";
      } else {
        promptEl.textContent = it.A + "  \xD7  " + it.B + "  =  ?";
      }
      promptEl.classList.remove("correct", "wrong");
      void promptEl.offsetWidth;
      promptEl.style.animation = "none";
      void promptEl.offsetWidth;
      promptEl.style.animation = "";
      input.value = "";
      input.focus();
      state.itemStart = performance.now();
    }
    function flashFeedback(ok) {
      feedback.textContent = ok ? "CORRECT" : "MISS";
      feedback.style.color = ok ? "var(--good)" : "var(--bad)";
      promptEl.classList.remove("correct", "wrong");
      void promptEl.offsetWidth;
      promptEl.classList.add(ok ? "correct" : "wrong");
      setTimeout(() => {
        if (state.destroyed)
          return;
        feedback.textContent = "";
        promptEl.classList.remove("correct", "wrong");
      }, 360);
    }
    function submitAnswer() {
      if (state.ended || state.destroyed)
        return;
      const it = currentItem();
      if (!it)
        return;
      const raw = input.value.trim();
      const parsed = parseInt(raw, 10);
      const userFinal = raw === "" || isNaN(parsed) ? null : parsed;
      const correct = userFinal != null && userFinal === it.answer;
      const latency = performance.now() - state.itemStart;
      state.log.push({
        ri: it.ri,
        ci: it.ci,
        A: it.A,
        B: it.B,
        answer: it.answer,
        userFinal,
        correct,
        latencyMs: latency
      });
      if (correct) {
        correctCount++;
        currentStreak++;
        if (currentStreak > bestStreak)
          bestStreak = currentStreak;
        api.sfx.success();
      } else {
        currentStreak = 0;
        api.sfx.error();
      }
      flashFeedback(correct);
      api.hud.setStat("correct", String(correctCount));
      api.hud.setStat("streak", String(currentStreak), "good");
      if (correct && api.hud.flashStat) {
        api.hud.flashStat("correct");
        if (currentStreak >= 3)
          api.hud.flashStat("streak");
      }
      state.idx++;
      api.hud.setStat("progress", state.idx + " / " + maxItems);
      if (state.idx >= maxItems) {
        endSession("complete");
      } else {
        renderPrompt();
      }
    }
    function endSession(reason) {
      if (state.ended)
        return;
      state.ended = true;
      stopTicker();
      const attempted = state.log.length;
      const acc = attempted ? Math.round(100 * correctCount / attempted) : 0;
      const avgLatency = attempted ? Math.round(state.log.reduce((s, x) => s + x.latencyMs, 0) / attempted) : 0;
      const kicker = reason === "timeup" ? "TIME UP" : reason === "ended" ? "ENDED EARLY" : "GRID CLEAR";
      api.exit({
        kicker,
        title: mode === "add" ? "Addition Drill" : "Multiplication Drill",
        rows: [
          { label: "Attempted", value: attempted + " / " + maxItems },
          { label: "Correct", value: correctCount + " (" + acc + "%)" },
          { label: "Best Streak", value: bestStreak },
          { label: "Avg Time", value: (avgLatency / 1e3).toFixed(2) + "s" }
        ]
      });
    }
    function tick() {
      const remain = state.deadline - performance.now();
      api.hud.setStat("time", fmtTime(remain));
      if (remain <= 0) {
        endSession("timeup");
      }
    }
    let tickHandle = setInterval(tick, 250);
    function stopTicker() {
      if (tickHandle) {
        clearInterval(tickHandle);
        tickHandle = null;
      }
    }
    submitBtn.addEventListener("click", submitAnswer);
    function handleKeyDown(e) {
      if (state.ended || state.destroyed)
        return;
      if (input.disabled)
        return;
      const tgt = e.target;
      if (tgt && tgt !== input && tgt !== document.body && typeof tgt.tagName === "string") {
        const tag = tgt.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select")
          return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey)
        return;
      if (e.key === "Enter") {
        e.preventDefault();
        submitAnswer();
        return;
      }
      if (e.key === "Backspace") {
        e.preventDefault();
        let v = input.value;
        if (!v)
          return;
        if (entryRTL) {
          if (v.charAt(0) === "-") {
            v = "-" + v.slice(2);
          } else {
            v = v.slice(1);
          }
        } else {
          v = v.slice(0, -1);
        }
        input.value = v;
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        let v = input.value;
        if (entryRTL) {
          if (v.charAt(0) === "-")
            v = "-" + e.key + v.slice(1);
          else
            v = e.key + v;
        } else {
          v = v + e.key;
        }
        input.value = v;
        return;
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    input.addEventListener("focus", () => {
    });
    const endEarly = document.createElement("button");
    endEarly.className = "btn";
    endEarly.type = "button";
    endEarly.textContent = "End Now";
    endEarly.style.cssText = "margin-top:18px; border-color: rgba(255,77,109,.35);";
    endEarly.addEventListener("click", () => endSession("ended"));
    const endRow = document.createElement("div");
    endRow.style.cssText = "display:flex; justify-content:center;";
    endRow.appendChild(endEarly);
    container.appendChild(endRow);
    renderPrompt();
    let pauseRemainder = 0;
    return {
      teardown() {
        state.destroyed = true;
        stopTicker();
        document.removeEventListener("keydown", handleKeyDown);
      },
      onPause() {
        pauseRemainder = state.deadline - performance.now();
        stopTicker();
        input.disabled = true;
      },
      onResume() {
        if (state.ended || state.destroyed)
          return;
        state.deadline = performance.now() + Math.max(0, pauseRemainder);
        tickHandle = setInterval(tick, 250);
        input.disabled = false;
        input.focus();
      }
    };
  }
  var descriptor4 = {
    id: "grid_master",
    title: "Grid Master",
    tagline: "Drill \u2022 Add / Mul",
    blurb: "Every row paired with every column. Timed mental-math sprint with per-question latency tracking.",
    brief: "Pick mode, grid size, digit widths, and duration. Questions proceed column-by-column through the generated grid. Enter submits.",
    configSchema: [
      {
        type: "select",
        id: "mode",
        label: "Mode",
        default: "mul",
        valueType: "string",
        options: [
          { value: "mul", label: "Multiplication" },
          { value: "add", label: "Addition" }
        ]
      },
      {
        type: "select",
        id: "items",
        label: "Grid Size",
        default: 40,
        valueType: "number",
        options: [
          { value: 40, label: "40 (8 \xD7 5)" },
          { value: 80, label: "80 (10 \xD7 8)" }
        ],
        hint: "Total questions."
      },
      {
        type: "select",
        id: "minutes",
        label: "Time",
        default: 5,
        valueType: "number",
        options: [
          { value: 3, label: "3 min" },
          { value: 5, label: "5 min" },
          { value: 10, label: "10 min" }
        ]
      },
      {
        type: "number",
        id: "digitA",
        label: "Row digits",
        default: 3,
        min: 1,
        max: 3,
        hint: "Width of row values."
      },
      {
        type: "number",
        id: "digitB",
        label: "Col digits",
        default: 1,
        min: 1,
        max: 3,
        hint: "Width of column values."
      },
      {
        type: "select",
        id: "direction",
        label: "Entry direction",
        default: "rtl",
        valueType: "string",
        options: [
          { value: "rtl", label: "R \u2192 L (right-to-left)" },
          { value: "ltr", label: "L \u2192 R (left-to-right)" }
        ],
        hint: "Live toggle is available during play."
      }
    ],
    mount
  };

  // src/js/side_ops/util/math_questions.js
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function makeQuestion(opsEnabled, includeSquares, includeRoots, sqStart, sqEnd) {
    const kinds = [];
    if (opsEnabled.has("add"))
      kinds.push("add");
    if (opsEnabled.has("sub"))
      kinds.push("sub");
    if (opsEnabled.has("mul"))
      kinds.push("mul");
    if (opsEnabled.has("div"))
      kinds.push("div");
    if (includeSquares)
      kinds.push("square");
    if (includeRoots)
      kinds.push("root");
    if (!kinds.length)
      kinds.push("add");
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    if (kind === "square") {
      const n = sqStart + Math.floor(Math.random() * (sqEnd - sqStart + 1));
      return { text: n + "\xB2 = ?", answer: n * n };
    }
    if (kind === "root") {
      const n = sqStart + Math.floor(Math.random() * (sqEnd - sqStart + 1));
      return { text: "\u221A" + n * n + " = ?", answer: n };
    }
    let a = Math.floor(Math.random() * 11) + 2;
    let b = Math.floor(Math.random() * 11) + 2;
    if (kind === "sub") {
      if (a < b) {
        const t = a;
        a = b;
        b = t;
      }
      return { text: a + " \u2212 " + b + " = ?", answer: a - b };
    }
    if (kind === "mul") {
      a = Math.floor(Math.random() * 9) + 3;
      b = Math.floor(Math.random() * 6) + 2;
      return { text: a + " \xD7 " + b + " = ?", answer: a * b };
    }
    if (kind === "div") {
      const divisor = Math.floor(Math.random() * 9) + 2;
      const quotient = Math.floor(Math.random() * 9) + 2;
      return { text: divisor * quotient + " \xF7 " + divisor + " = ?", answer: quotient };
    }
    return { text: a + " + " + b + " = ?", answer: a + b };
  }

  // src/js/side_ops/games/neon_snake.js
  var BEST_KEY = "sideOps.neonSnake.best";
  var ASTEROID_SRCS = [
    "images/asteroids/asteroid1.png",
    "images/asteroids/asteroid2.png",
    "images/asteroids/asteroid3.png",
    "images/asteroids/asteroid4.png",
    "images/asteroids/asteroid6.png"
  ];
  var SHIP_CATALOG = [
    { value: "classic", label: "Scarlet Classic", icon: "images/ships/Scarlet%20Classic.png", defaultUnlocked: true },
    { value: "spire", label: "Verdant Spire", icon: "images/ships/Verdant%20Spire.png", defaultUnlocked: true },
    { value: "am2", label: "AM3 Scout", icon: "images/ships/AM3%20Scout.png", defaultUnlocked: true },
    { value: "mk7", label: "Crimson MK-7", icon: "images/ships/Crimson%20MK-7.png" },
    { value: "fizard", label: "Aurora Dart", icon: "images/ships/Aurora%20Dart.png" },
    { value: "ember", label: "Ruby Strike", icon: "images/ships/Ruby%20Strike.png" },
    { value: "azure", label: "Azure Lancer", icon: "images/ships/Azure%20Lancer.png" },
    { value: "bu2x", label: "BU2X", icon: "images/ships/BU2X.png" },
    { value: "mantas", label: "Mantas Arc-5", icon: "images/ships/Mantas%20-%20Arc%205.png" },
    { value: "cyan", label: "Cyan Vector 7", icon: "images/ships/Cyan%20Vector%207.png" },
    { value: "veloz", label: "Veloz Mas", icon: "images/ships/Veloz%20Mas.png" },
    { value: "verde9", label: "VER-DE-9", icon: "images/ships/VER-DE-9.png" },
    { value: "whiteflame8", label: "White Flame 8", icon: "images/ships/White%20Flame%208.png" },
    { value: "datsawze", label: "D.A.T. Sawze", icon: "images/ships/D.A.T.%20Sawze.png" },
    { value: "apextiburoniv", label: "Apex Tiburon IV", icon: "images/ships/Apex%20Tiburon%20IV.png" }
  ];
  function loadImage(src) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    return img;
  }
  function dirRotation(dir) {
    if (dir.x === 1 && dir.y === 0)
      return Math.PI / 2;
    if (dir.x === -1 && dir.y === 0)
      return -Math.PI / 2;
    if (dir.x === 0 && dir.y === 1)
      return Math.PI;
    return 0;
  }
  var POWERUP_SPAWN_EVERY = 5;
  var POWERUP_EXPIRE_MS = 1e4;
  var POWERUP_COLORS = {
    freeze: "#38bdf8",
    slow: "#a78bfa",
    shield: "#fbbf24",
    scoreBomb: "#f43f5e",
    shrink: "#34d399"
  };
  var POWERUP_WEIGHTED = [
    "freeze",
    "slow",
    "shield",
    "scoreBomb",
    "shrink",
    "freeze",
    "slow",
    "shrink"
  ];
  function mount2(container, config, api) {
    const opsEnabled = new Set(config.ops || ["add", "sub", "mul", "div"]);
    const includeSquares = !!config.squares;
    const includeRoots = !!config.roots;
    const sqStart = clamp(parseInt(config.sStart, 10) || 1, 1, 60);
    const sqEndRaw = clamp(parseInt(config.sEnd, 10) || 12, 1, 60);
    const sStart = Math.min(sqStart, sqEndRaw);
    const sEnd = Math.max(sqStart, sqEndRaw);
    const shipId = config.ship || "classic";
    const shipMeta = SHIP_CATALOG.find((s) => s.value === shipId) || SHIP_CATALOG[0];
    const shipImg = loadImage(shipMeta.icon);
    const asteroidImgs = ASTEROID_SRCS.map(loadImage);
    const best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
    api.hud.setChips([
      { id: "score", label: "Score", value: "0", variant: "accent" },
      { id: "streak", label: "Streak", value: "0", variant: "good" },
      { id: "best", label: "Best", value: String(best) },
      { id: "shield", label: "Shield", value: "--", variant: "warn" },
      { spacer: true }
    ]);
    container.innerHTML = "";
    const qBar = document.createElement("div");
    qBar.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:12px 20px",
      "margin-bottom:12px",
      "border:1px solid var(--ui-border-accent)",
      "border-radius:var(--ui-radius-tile)",
      "background: var(--ui-surface-tile)",
      "font-size: clamp(20px, 3.5vw, 36px)",
      "font-weight:700",
      "letter-spacing:2px",
      "color: var(--ui-text-bright)",
      "text-shadow: 0 0 16px rgba(0,229,255,.25)"
    ].join(";");
    qBar.textContent = "Press Start";
    container.appendChild(qBar);
    const canvasWrap = document.createElement("div");
    canvasWrap.style.cssText = "position:relative; width:100%;";
    container.appendChild(canvasWrap);
    const canvas = document.createElement("canvas");
    canvas.width = 1120;
    canvas.height = 700;
    canvas.style.cssText = [
      "display:block",
      "width:100%",
      "height:auto",
      "background: linear-gradient(160deg, rgba(8,14,28,.95), rgba(6,8,20,.98))",
      "border:1px solid var(--ui-border-accent)",
      "border-radius:var(--ui-radius-tile)",
      "box-shadow: var(--ui-shadow-meta), inset 0 0 40px rgba(0,229,255,.08)"
    ].join(";");
    canvasWrap.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const cellSize = 28;
    const cols = Math.floor(canvas.width / cellSize);
    const rows = Math.floor(canvas.height / cellSize);
    const footer = document.createElement("div");
    footer.style.cssText = "margin-top:12px; text-align:center; color: var(--muted); font-size:12px; letter-spacing:2px; text-transform:uppercase;";
    footer.textContent = "Arrow keys or WASD \u2022 Space to pause \u2022 Collect the correct asteroid";
    container.appendChild(footer);
    const state = {
      snake: [],
      tailArts: [],
      pellets: [],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      question: null,
      score: 0,
      streak: 0,
      best,
      phase: "idle",
      // idle | running | over
      paused: false,
      lastTime: 0,
      acc: 0,
      powerups: [],
      correctSince: 0,
      active: {
        freeze: { on: false, expires: 0 },
        slow: { on: false, expires: 0 },
        shield: { on: false },
        scoreBomb: { on: false }
      },
      rafId: null,
      destroyed: false,
      flashOpacity: 0,
      toast: null,
      pendingTailArt: null,
      bodyRotFrame: 0
    };
    function randomAsteroidIdx() {
      return Math.floor(Math.random() * asteroidImgs.length);
    }
    function randomCell() {
      return { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * rows) };
    }
    function cellOccupied(p) {
      for (const s of state.snake)
        if (s.x === p.x && s.y === p.y)
          return true;
      for (const s of state.pellets)
        if (s.x === p.x && s.y === p.y)
          return true;
      for (const s of state.powerups)
        if (s.x === p.x && s.y === p.y)
          return true;
      return false;
    }
    function safeCell() {
      let tries = 0;
      let spot = randomCell();
      while (cellOccupied(spot) && tries++ < 200)
        spot = randomCell();
      return spot;
    }
    function spawnPellets(answer) {
      state.pellets = [];
      const decoys = /* @__PURE__ */ new Set();
      while (decoys.size < 2) {
        const delta = Math.floor(Math.random() * 9) + 2;
        const sign = Math.random() > 0.5 ? 1 : -1;
        const val = Math.max(0, answer + delta * sign);
        if (val !== answer)
          decoys.add(val);
      }
      const vals = [answer, ...decoys];
      for (let i = vals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [vals[i], vals[j]] = [vals[j], vals[i]];
      }
      vals.forEach((val) => {
        const spot = safeCell();
        state.pellets.push({
          x: spot.x,
          y: spot.y,
          value: val,
          correct: val === answer,
          astIdx: randomAsteroidIdx(),
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.02
        });
      });
    }
    function spawnPowerup(ts) {
      const kind = POWERUP_WEIGHTED[Math.floor(Math.random() * POWERUP_WEIGHTED.length)];
      if ((kind === "freeze" || kind === "slow") && state.active[kind] && state.active[kind].on)
        return;
      const spot = safeCell();
      state.powerups.push({ x: spot.x, y: spot.y, kind, spawnedAt: ts });
    }
    function showToast(msg) {
      state.toast = { msg, expires: performance.now() + 1400 };
    }
    function applyPowerup(kind, ts) {
      switch (kind) {
        case "freeze":
          state.active.freeze = { on: true, expires: ts + 5e3 };
          showToast("FREEZE \u2014 5s");
          break;
        case "slow":
          state.active.slow = { on: true, expires: ts + 8e3 };
          showToast("SLOW \u2014 8s");
          break;
        case "shield":
          state.active.shield.on = true;
          showToast("SHIELD ONLINE");
          break;
        case "scoreBomb":
          state.active.scoreBomb.on = true;
          showToast("NEXT HIT \xD73");
          break;
        case "shrink":
          state.snake.splice(Math.max(1, state.snake.length - 3));
          showToast("TAIL TRIMMED");
          break;
      }
      syncHud();
    }
    function tickPowerupTimers(ts) {
      for (let i = state.powerups.length - 1; i >= 0; i--) {
        if (ts - state.powerups[i].spawnedAt > POWERUP_EXPIRE_MS)
          state.powerups.splice(i, 1);
      }
      if (state.active.freeze.on && ts > state.active.freeze.expires) {
        state.active.freeze.on = false;
        if (state.phase === "running") {
          state.question = makeQuestion(opsEnabled, includeSquares, includeRoots, sStart, sEnd);
          spawnPellets(state.question.answer);
        }
      }
      if (state.active.slow.on && ts > state.active.slow.expires) {
        state.active.slow.on = false;
      }
    }
    function resetSnake() {
      state.snake = [];
      state.tailArts = [];
      const sx = Math.floor(cols / 2);
      const sy = Math.floor(rows / 2);
      for (let i = 0; i < 5; i++)
        state.snake.push({ x: sx - i, y: sy });
      for (let i = 0; i < 4; i++) {
        state.tailArts.push({
          idx: randomAsteroidIdx(),
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.02
        });
      }
      state.dir = { x: 1, y: 0 };
      state.nextDir = { x: 1, y: 0 };
      state.pendingTailArt = null;
    }
    function beginRound() {
      state.score = 0;
      state.streak = 0;
      state.paused = false;
      state.phase = "running";
      state.lastTime = performance.now();
      state.acc = 0;
      state.powerups = [];
      state.correctSince = 0;
      state.active = {
        freeze: { on: false, expires: 0 },
        slow: { on: false, expires: 0 },
        shield: { on: false },
        scoreBomb: { on: false }
      };
      state.flashOpacity = 0;
      resetSnake();
      state.question = makeQuestion(opsEnabled, includeSquares, includeRoots, sStart, sEnd);
      spawnPellets(state.question.answer);
      qBar.textContent = state.question.text;
      syncHud();
    }
    function handleGameOver(reason) {
      state.phase = "over";
      const newBest = state.score > state.best;
      if (newBest) {
        state.best = state.score;
        try {
          localStorage.setItem(BEST_KEY, String(state.best));
        } catch (e) {
        }
      }
      state.flashOpacity = 0.55;
      api.sfx.error();
      setTimeout(() => {
        if (state.destroyed)
          return;
        api.exit({
          kicker: newBest ? "NEW BEST" : "RUN OVER",
          title: "Collections",
          rows: [
            { label: "Score", value: state.score },
            { label: "Streak", value: state.streak },
            { label: "Best", value: state.best },
            { label: "Reason", value: reason || "\u2014" }
          ]
        });
      }, 600);
    }
    function stepInterval() {
      const base = Math.max(80, 160 - state.streak * 3);
      return state.active.slow.on ? Math.min(400, base * 2) : base;
    }
    function syncHud() {
      api.hud.setStat("score", String(state.score));
      api.hud.setStat("streak", String(state.streak), "good");
      api.hud.setStat("best", String(state.best));
      api.hud.setStat("shield", state.active.shield.on ? "ON" : "--", state.active.shield.on ? "warn" : void 0);
    }
    function advance(ts) {
      if (state.phase !== "running")
        return;
      state.dir = state.nextDir;
      const head = state.snake[0];
      const next = {
        x: (head.x + state.dir.x + cols) % cols,
        y: (head.y + state.dir.y + rows) % rows
      };
      for (const p of state.snake) {
        if (p.x === next.x && p.y === next.y) {
          if (state.active.shield.on) {
            state.active.shield.on = false;
            showToast("SHIELD ABSORBED");
            state.flashOpacity = 0.25;
            syncHud();
            return;
          }
          handleGameOver("Self-collision");
          return;
        }
      }
      const pelletIdx = state.pellets.findIndex((p) => p.x === next.x && p.y === next.y);
      const pellet = pelletIdx >= 0 ? state.pellets[pelletIdx] : null;
      const pwIdx = state.powerups.findIndex((p) => p.x === next.x && p.y === next.y);
      const powerup = pwIdx >= 0 ? state.powerups[pwIdx] : null;
      state.snake.unshift(next);
      const newArt = state.pendingTailArt || {
        idx: randomAsteroidIdx(),
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02
      };
      state.tailArts.unshift(newArt);
      state.pendingTailArt = null;
      let grew = false;
      if (pellet) {
        state.pellets.splice(pelletIdx, 1);
        if (pellet.correct) {
          const mult = state.active.scoreBomb.on ? 3 : 1;
          if (state.active.scoreBomb.on) {
            state.active.scoreBomb.on = false;
            showToast("SCORE BOMB \xD73");
          }
          state.score += (10 + state.streak * 2) * mult;
          state.streak += 1;
          api.sfx.success();
          state.pendingTailArt = {
            idx: pellet.astIdx,
            rot: pellet.rot,
            rotSpeed: pellet.rotSpeed
          };
          state.tailArts[0] = {
            idx: pellet.astIdx,
            rot: pellet.rot,
            rotSpeed: pellet.rotSpeed
          };
          state.pendingTailArt = null;
          grew = true;
          if (!state.active.freeze.on) {
            state.question = makeQuestion(opsEnabled, includeSquares, includeRoots, sStart, sEnd);
            spawnPellets(state.question.answer);
            qBar.textContent = state.question.text;
          }
          state.correctSince++;
          if (state.correctSince >= POWERUP_SPAWN_EVERY) {
            spawnPowerup(ts);
            state.correctSince = 0;
          }
        } else {
          if (state.active.shield.on) {
            state.active.shield.on = false;
            showToast("SHIELD ABSORBED");
            state.flashOpacity = 0.25;
            state.snake.pop();
            state.tailArts.pop();
            syncHud();
            return;
          }
          handleGameOver("Wrong answer");
          return;
        }
      } else if (powerup) {
        state.powerups.splice(pwIdx, 1);
        applyPowerup(powerup.kind, ts);
      }
      if (!grew) {
        state.snake.pop();
        state.tailArts.pop();
      }
      syncHud();
    }
    function drawGrid() {
      ctx.strokeStyle = "rgba(0, 210, 255, .06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= cols; x++) {
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, rows * cellSize);
      }
      for (let y = 0; y <= rows; y++) {
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(cols * cellSize, y * cellSize);
      }
      ctx.stroke();
    }
    function drawAsteroidTile(img, cx, cy, size, rot) {
      if (!img || !img.complete || !img.naturalWidth) {
        ctx.fillStyle = "rgba(120,120,140,.85)";
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot || 0);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    function drawShip(cx, cy, size, rot) {
      if (!shipImg.complete || !shipImg.naturalWidth) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.fillStyle = "#22ffcc";
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.5);
        ctx.lineTo(size * 0.4, size * 0.4);
        ctx.lineTo(-size * 0.4, size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.shadowColor = "rgba(0,229,255,.45)";
      ctx.shadowBlur = 18;
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.drawImage(shipImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    function drawSnake() {
      const bodySize = cellSize * 1.05;
      for (let i = state.snake.length - 1; i >= 1; i--) {
        const seg = state.snake[i];
        const art = state.tailArts[i - 1];
        const cx = seg.x * cellSize + cellSize / 2;
        const cy = seg.y * cellSize + cellSize / 2;
        if (art) {
          art.rot += art.rotSpeed || 0;
          drawAsteroidTile(asteroidImgs[art.idx] || asteroidImgs[0], cx, cy, bodySize, art.rot);
        } else {
          drawAsteroidTile(asteroidImgs[0], cx, cy, bodySize, 0);
        }
      }
      if (state.snake.length) {
        const head = state.snake[0];
        const cx = head.x * cellSize + cellSize / 2;
        const cy = head.y * cellSize + cellSize / 2;
        drawShip(cx, cy, cellSize * 1.5, dirRotation(state.dir));
      }
    }
    function drawPellets() {
      const pSize = cellSize * 1.1;
      state.pellets.forEach((p) => {
        const cx = p.x * cellSize + cellSize / 2;
        const cy = p.y * cellSize + cellSize / 2;
        p.rot += p.rotSpeed || 0;
        const glow = ctx.createRadialGradient(cx, cy, pSize * 0.1, cx, cy, pSize * 0.7);
        glow.addColorStop(0, "rgba(0, 229, 255, .35)");
        glow.addColorStop(1, "rgba(0, 60, 120, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, pSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
        drawAsteroidTile(asteroidImgs[p.astIdx] || asteroidImgs[0], cx, cy, pSize, p.rot);
        ctx.fillStyle = "rgba(6, 10, 22, .82)";
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,229,255,.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#e6fbff";
        ctx.font = "bold " + Math.max(14, Math.floor(cellSize * 0.6)) + "px Oxanium, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(p.value), cx, cy);
      });
    }
    function drawPowerups() {
      state.powerups.forEach((pw) => {
        const cx = pw.x * cellSize + cellSize / 2;
        const cy = pw.y * cellSize + cellSize / 2;
        const r = cellSize * 0.5;
        ctx.fillStyle = POWERUP_COLORS[pw.kind] || "#fff";
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#050814";
        ctx.font = "bold " + Math.floor(cellSize * 0.55) + "px Oxanium, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const glyph = pw.kind === "freeze" ? "F" : pw.kind === "slow" ? "S" : pw.kind === "shield" ? "D" : pw.kind === "scoreBomb" ? "\xD7" : "-";
        ctx.fillText(glyph, cx, cy);
      });
    }
    function drawOverlay() {
      if (state.flashOpacity > 0) {
        ctx.fillStyle = "rgba(255,77,109," + state.flashOpacity + ")";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        state.flashOpacity = Math.max(0, state.flashOpacity - 0.03);
      }
      if (state.toast) {
        const now = performance.now();
        if (now < state.toast.expires) {
          const remain = state.toast.expires - now;
          ctx.globalAlpha = Math.min(1, remain / 400);
          ctx.fillStyle = "rgba(8,14,28,.85)";
          const text = state.toast.msg;
          ctx.font = "bold 22px Oxanium, sans-serif";
          const w = ctx.measureText(text).width + 40;
          const x = canvas.width / 2 - w / 2;
          const y = 24;
          ctx.fillRect(x, y, w, 44);
          ctx.fillStyle = "#7df3ff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text, canvas.width / 2, y + 22);
          ctx.globalAlpha = 1;
        } else {
          state.toast = null;
        }
      }
      if (state.phase === "idle") {
        ctx.fillStyle = "rgba(6,9,22,0.55)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#e5e7ff";
        ctx.font = "bold 34px Oxanium, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PRESS START", canvas.width / 2, canvas.height / 2 - 12);
        ctx.font = "16px Oxanium, sans-serif";
        ctx.fillStyle = "rgba(226,232,255,0.7)";
        ctx.fillText("Collect the correct asteroid. Wrap the edges.", canvas.width / 2, canvas.height / 2 + 20);
      } else if (state.phase === "over") {
        ctx.fillStyle = "rgba(6,9,22,0.72)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff4d6d";
        ctx.font = "bold 36px Oxanium, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("RUN OVER", canvas.width / 2, canvas.height / 2 - 6);
        ctx.font = "18px Oxanium, sans-serif";
        ctx.fillStyle = "rgba(226,232,255,0.8)";
        ctx.fillText("Score " + state.score + "   //   Best " + state.best, canvas.width / 2, canvas.height / 2 + 24);
      } else if (state.paused) {
        ctx.fillStyle = "rgba(6,9,22,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#7df3ff";
        ctx.font = "bold 32px Oxanium, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
      }
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid();
      drawPowerups();
      drawPellets();
      drawSnake();
      drawOverlay();
    }
    function loop(ts) {
      if (state.destroyed)
        return;
      state.rafId = requestAnimationFrame(loop);
      const delta = Math.min(ts - state.lastTime, 50);
      state.lastTime = ts;
      if (state.phase !== "running" || state.paused) {
        if (state.paused)
          state.acc = 0;
        draw();
        return;
      }
      tickPowerupTimers(ts);
      state.acc += delta;
      const interval = stepInterval();
      while (state.acc >= interval) {
        advance(ts);
        state.acc -= interval;
      }
      draw();
    }
    const KEY_DIR = {
      "ArrowUp": { x: 0, y: -1 },
      "ArrowDown": { x: 0, y: 1 },
      "ArrowLeft": { x: -1, y: 0 },
      "ArrowRight": { x: 1, y: 0 },
      "w": { x: 0, y: -1 },
      "s": { x: 0, y: 1 },
      "a": { x: -1, y: 0 },
      "d": { x: 1, y: 0 },
      "W": { x: 0, y: -1 },
      "S": { x: 0, y: 1 },
      "A": { x: -1, y: 0 },
      "D": { x: 1, y: 0 }
    };
    function onKey(e) {
      if (state.destroyed)
        return;
      if (e.key === " " || e.code === "Space") {
        if (state.phase === "idle") {
          start2();
          e.preventDefault();
          return;
        }
        if (state.phase === "running") {
          state.paused = !state.paused;
          if (!state.paused)
            state.lastTime = performance.now();
          e.preventDefault();
        }
        return;
      }
      if (e.key === "Enter" && state.phase === "idle") {
        start2();
        e.preventDefault();
        return;
      }
      const dir = KEY_DIR[e.key];
      if (!dir)
        return;
      const cur = state.dir;
      if (cur.x === -dir.x && cur.y === -dir.y)
        return;
      state.nextDir = dir;
      e.preventDefault();
    }
    function start2() {
      if (state.rafId)
        cancelAnimationFrame(state.rafId);
      beginRound();
      qBar.textContent = state.question.text;
      state.rafId = requestAnimationFrame(loop);
    }
    document.addEventListener("keydown", onKey);
    canvas.addEventListener("click", () => {
      if (state.phase === "idle")
        start2();
    });
    state.rafId = requestAnimationFrame(loop);
    return {
      teardown() {
        state.destroyed = true;
        if (state.rafId)
          cancelAnimationFrame(state.rafId);
        document.removeEventListener("keydown", onKey);
      },
      onPause() {
        state.paused = true;
      },
      onResume() {
        if (state.phase !== "running")
          return;
        state.paused = false;
        state.lastTime = performance.now();
      }
    };
  }
  var descriptor5 = {
    id: "neon_snake",
    title: "Collections",
    tagline: "Arcade \u2022 Ship vs Asteroids",
    blurb: "Pilot your ship, collect the correct asteroid, and grow the tail. Wrong answers or self-bites end the run.",
    brief: "Three numbered asteroids drift each round \u2014 only one matches the answer. Collected asteroids chain to the ship's tail. Speed scales with streak. Powerups occasionally drop (freeze, slow, shield, score bomb, shrink).",
    configSchema: [
      {
        type: "ship",
        id: "ship",
        label: "Ship",
        default: "classic",
        options: SHIP_CATALOG,
        hint: "Only unlocked ships are selectable. Unlock more in the main game."
      },
      {
        type: "toggles",
        id: "ops",
        label: "Operations",
        default: ["add", "sub", "mul", "div"],
        options: [
          { value: "add", label: "+" },
          { value: "sub", label: "\u2212" },
          { value: "mul", label: "\xD7" },
          { value: "div", label: "\xF7" }
        ],
        min: 1
      },
      {
        type: "select",
        id: "squares",
        label: "Squares",
        default: "0",
        valueType: "string",
        options: [
          { value: "0", label: "Off" },
          { value: "1", label: "On (n\xB2 = ?)" }
        ]
      },
      {
        type: "select",
        id: "roots",
        label: "Roots",
        default: "0",
        valueType: "string",
        options: [
          { value: "0", label: "Off" },
          { value: "1", label: "On (\u221A(n\xB2) = ?)" }
        ]
      },
      { type: "number", id: "sStart", label: "Square/root start n", default: 1, min: 1, max: 60 },
      { type: "number", id: "sEnd", label: "Square/root end n", default: 12, min: 1, max: 60 }
    ],
    mount(container, config, api) {
      const cfg = {
        ship: config.ship || "classic",
        ops: config.ops,
        squares: config.squares === "1" || config.squares === 1 || config.squares === true,
        roots: config.roots === "1" || config.roots === 1 || config.roots === true,
        sStart: config.sStart,
        sEnd: config.sEnd
      };
      return mount2(container, cfg, api);
    }
  };

  // src/js/side_ops/games/claim_field.js
  var BEST_KEY2 = "sideOps.claimField.best";
  var ASTEROID_SRCS2 = [
    "images/asteroids/asteroid1.png",
    "images/asteroids/asteroid2.png",
    "images/asteroids/asteroid3.png",
    "images/asteroids/asteroid4.png",
    "images/asteroids/asteroid6.png"
  ];
  var SHIP_CATALOG2 = [
    { value: "classic", label: "Scarlet Classic", icon: "images/ships/Scarlet%20Classic.png", defaultUnlocked: true },
    { value: "spire", label: "Verdant Spire", icon: "images/ships/Verdant%20Spire.png", defaultUnlocked: true },
    { value: "am2", label: "AM3 Scout", icon: "images/ships/AM3%20Scout.png", defaultUnlocked: true },
    { value: "mk7", label: "Crimson MK-7", icon: "images/ships/Crimson%20MK-7.png" },
    { value: "fizard", label: "Aurora Dart", icon: "images/ships/Aurora%20Dart.png" },
    { value: "ember", label: "Ruby Strike", icon: "images/ships/Ruby%20Strike.png" },
    { value: "azure", label: "Azure Lancer", icon: "images/ships/Azure%20Lancer.png" },
    { value: "bu2x", label: "BU2X", icon: "images/ships/BU2X.png" },
    { value: "mantas", label: "Mantas Arc-5", icon: "images/ships/Mantas%20-%20Arc%205.png" },
    { value: "cyan", label: "Cyan Vector 7", icon: "images/ships/Cyan%20Vector%207.png" },
    { value: "veloz", label: "Veloz Mas", icon: "images/ships/Veloz%20Mas.png" },
    { value: "verde9", label: "VER-DE-9", icon: "images/ships/VER-DE-9.png" },
    { value: "whiteflame8", label: "White Flame 8", icon: "images/ships/White%20Flame%208.png" },
    { value: "datsawze", label: "D.A.T. Sawze", icon: "images/ships/D.A.T.%20Sawze.png" },
    { value: "apextiburoniv", label: "Apex Tiburon IV", icon: "images/ships/Apex%20Tiburon%20IV.png" }
  ];
  var ALIEN_SRC = "images/aliens/alien_ET.png";
  function loadImage2(src) {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    return img;
  }
  function distSq(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }
  function wrap(v, max) {
    let x = v;
    while (x < 0)
      x += max;
    while (x >= max)
      x -= max;
    return x;
  }
  function mountGame(container, config, api) {
    const opsEnabled = new Set(config.ops || ["add", "sub", "mul", "div"]);
    const includeSquares = !!config.squares;
    const includeRoots = !!config.roots;
    const sqStart = clamp(parseInt(config.sStart, 10) || 1, 1, 60);
    const sqEndRaw = clamp(parseInt(config.sEnd, 10) || 12, 1, 60);
    const sStart = Math.min(sqStart, sqEndRaw);
    const sEnd = Math.max(sqStart, sqEndRaw);
    const stoneCount = clamp(parseInt(config.stones, 10) || 10, 4, 16);
    const initialLives = clamp(parseInt(config.lives, 10) || 3, 1, 9);
    const alienSpawnMs = clamp(parseInt(config.alienSpawnMs, 10) || 3200, 1200, 12e3);
    const maxAliens = clamp(parseInt(config.maxAliens, 10) || 5, 1, 12);
    const alienSpeed = clamp(parseInt(config.alienSpeed, 10) || 62, 20, 200);
    const shipId = config.ship || "classic";
    const shipMeta = SHIP_CATALOG2.find((s) => s.value === shipId) || SHIP_CATALOG2[0];
    const shipImg = loadImage2(shipMeta.icon);
    const asteroidImgs = ASTEROID_SRCS2.map(loadImage2);
    const alienImg = loadImage2(ALIEN_SRC);
    const best = parseInt(localStorage.getItem(BEST_KEY2) || "0", 10) || 0;
    api.hud.setChips([
      { id: "score", label: "Score", value: "0", variant: "accent" },
      { id: "lives", label: "Lives", value: String(initialLives), variant: "warn" },
      { id: "streak", label: "Streak", value: "0", variant: "good" },
      { id: "best", label: "Best", value: String(best) },
      { spacer: true }
    ]);
    container.innerHTML = "";
    const qBar = document.createElement("div");
    qBar.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:12px 20px",
      "margin-bottom:12px",
      "border:1px solid var(--ui-border-accent)",
      "border-radius:var(--ui-radius-tile)",
      "background: var(--ui-surface-tile)",
      "font-size: clamp(20px, 3.5vw, 36px)",
      "font-weight:700",
      "letter-spacing:2px",
      "color: var(--ui-text-bright)",
      "text-shadow: 0 0 16px rgba(0,229,255,.25)"
    ].join(";");
    qBar.textContent = "Press Start";
    container.appendChild(qBar);
    const canvasWrap = document.createElement("div");
    canvasWrap.style.cssText = "position:relative; width:100%;";
    container.appendChild(canvasWrap);
    const canvas = document.createElement("canvas");
    canvas.width = 1120;
    canvas.height = 700;
    canvas.style.cssText = [
      "display:block",
      "width:100%",
      "height:auto",
      "background: linear-gradient(160deg, rgba(8,14,28,.95), rgba(6,8,20,.98))",
      "border:1px solid var(--ui-border-accent)",
      "border-radius:var(--ui-radius-tile)",
      "box-shadow: var(--ui-shadow-meta), inset 0 0 40px rgba(0,229,255,.08)"
    ].join(";");
    canvasWrap.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const footer = document.createElement("div");
    footer.style.cssText = "margin-top:12px; text-align:center; color: var(--muted); font-size:12px; letter-spacing:2px; text-transform:uppercase;";
    footer.textContent = "\u2190 \u2192 rotate \u2022 \u2191 thrust (or WASD) \u2014 collide with the matching number";
    container.appendChild(footer);
    const SHIP_R = 20;
    const AST_R = 38;
    const THRUST = 560;
    const TURN_SPEED = 3.1;
    const FRICTION_POW = 0.986;
    const MAX_SPEED = 420;
    const MARGIN_OFF = 80;
    let nextAlienSpawn = 0;
    const state = {
      phase: "idle",
      paused: false,
      destroyed: false,
      lastTime: 0,
      rafId: 0,
      ship: {
        x: W / 2,
        y: H / 2,
        heading: 0,
        vx: 0,
        vy: 0
      },
      asteroids: [],
      answer: 0,
      question: null,
      aliens: [],
      score: 0,
      streak: 0,
      lives: initialLives,
      best,
      keys: {},
      stunUntil: 0,
      cooldownUntil: 0
    };
    function syncHud() {
      api.hud.setStat("score", String(state.score));
      api.hud.setStat("lives", String(state.lives), "warn");
      api.hud.setStat("streak", String(state.streak), "good");
      api.hud.setStat("best", String(state.best));
    }
    function physicsStep(dtSec) {
      const now = performance.now();
      const stun = now < state.stunUntil;
      let turn = 0;
      if (state.keys.ArrowLeft || state.keys.KeyA) {
        turn -= 1;
      }
      if (state.keys.ArrowRight || state.keys.KeyD) {
        turn += 1;
      }
      if (!stun && turn !== 0) {
        state.ship.heading += turn * TURN_SPEED * dtSec;
      }
      if (!stun && (state.keys.ArrowUp || state.keys.KeyW)) {
        state.ship.vx += Math.sin(state.ship.heading) * THRUST * dtSec;
        state.ship.vy += -Math.cos(state.ship.heading) * THRUST * dtSec;
      }
      const sp = Math.sqrt(state.ship.vx * state.ship.vx + state.ship.vy * state.ship.vy);
      if (sp > MAX_SPEED) {
        const k = MAX_SPEED / sp;
        state.ship.vx *= k;
        state.ship.vy *= k;
      }
      const fr = Math.pow(FRICTION_POW, dtSec * 60);
      state.ship.vx *= fr;
      state.ship.vy *= fr;
      state.ship.x += state.ship.vx * dtSec;
      state.ship.y += state.ship.vy * dtSec;
      state.ship.x = wrap(state.ship.x, W);
      state.ship.y = wrap(state.ship.y, H);
      for (let i = 0; i < state.asteroids.length; i++) {
        state.asteroids[i].rot += state.asteroids[i].rotSpeed * dtSec;
      }
      for (let i = 0; i < state.aliens.length; i++) {
        const al = state.aliens[i];
        const dx = state.ship.x - al.x;
        const dy = state.ship.y - al.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
        al.x += dx / d * alienSpeed * dtSec;
        al.y += dy / d * alienSpeed * dtSec;
        al.x = wrap(al.x, W);
        al.y = wrap(al.y, H);
      }
    }
    function trySpawnAlien(ts) {
      if (state.aliens.length >= maxAliens)
        return;
      if (ts < nextAlienSpawn)
        return;
      nextAlienSpawn = ts + alienSpawnMs + Math.random() * 900;
      const edge = Math.floor(Math.random() * 4);
      let x = 0;
      let y = 0;
      if (edge === 0) {
        x = Math.random() * W;
        y = -MARGIN_OFF;
      } else if (edge === 1) {
        x = W + MARGIN_OFF;
        y = Math.random() * H;
      } else if (edge === 2) {
        x = Math.random() * W;
        y = H + MARGIN_OFF;
      } else {
        x = -MARGIN_OFF;
        y = Math.random() * H;
      }
      state.aliens.push({ x, y });
    }
    function buildDecoys(ans, need) {
      const set = /* @__PURE__ */ new Set([ans]);
      let guard = 0;
      while (set.size < need && guard++ < 500) {
        let v;
        const roll = Math.random();
        if (roll < 0.45) {
          const delta = Math.floor(Math.random() * 18) + 1;
          v = ans + (Math.random() > 0.5 ? delta : -delta);
        } else if (roll < 0.72) {
          v = ans + Math.floor(Math.random() * 7) - 3;
        } else {
          v = Math.floor(Math.random() * 120);
        }
        if (v !== ans && v >= 0 && v <= 9999)
          set.add(v);
      }
      const arr = Array.from(set).slice(0, need);
      while (arr.length < need) {
        const extra = ans + Math.floor(Math.random() * 50) + 1;
        if (!arr.includes(extra))
          arr.push(extra);
      }
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = arr[i];
        arr[i] = arr[j];
        arr[j] = t;
      }
      return arr;
    }
    function layAsteroids(ans) {
      const values = buildDecoys(ans, stoneCount);
      const placed = [];
      const padding = AST_R + SHIP_R + 24;
      const cx0 = state.ship.x;
      const cy0 = state.ship.y;
      values.forEach((val, idx) => {
        let tries = 0;
        let x = 0;
        let y = 0;
        let ok = false;
        while (!ok && tries++ < 300) {
          x = AST_R + Math.random() * (W - 2 * AST_R);
          y = AST_R + Math.random() * (H - 2 * AST_R);
          ok = distSq(x, y, cx0, cy0) >= padding * padding;
          for (let i = 0; ok && i < placed.length; i++) {
            if (distSq(x, y, placed[i].x, placed[i].y) < (AST_R * 2.1) ** 2) {
              ok = false;
            }
          }
        }
        placed.push({
          x,
          y,
          value: val,
          astIdx: idx % asteroidImgs.length,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.35
        });
      });
      state.asteroids = placed;
    }
    function beginRound(resetScore) {
      if (resetScore) {
        state.score = 0;
        state.streak = 0;
        state.lives = initialLives;
      }
      state.phase = "running";
      state.paused = false;
      state.lastTime = performance.now();
      state.ship.x = W / 2;
      state.ship.y = H / 2;
      state.ship.heading = 0;
      state.ship.vx = 0;
      state.ship.vy = 0;
      state.aliens = [];
      nextAlienSpawn = performance.now() + 800;
      state.question = makeQuestion(opsEnabled, includeSquares, includeRoots, sStart, sEnd);
      state.answer = state.question.answer;
      qBar.textContent = state.question.text;
      layAsteroids(state.answer);
      state.cooldownUntil = performance.now() + 400;
      syncHud();
    }
    function handleGameOver(reason) {
      state.phase = "over";
      const newBest = state.score > state.best;
      if (newBest) {
        state.best = state.score;
        try {
          localStorage.setItem(BEST_KEY2, String(state.best));
        } catch (e) {
        }
      }
      api.sfx.error();
      setTimeout(() => {
        if (state.destroyed)
          return;
        api.exit({
          kicker: newBest ? "NEW BEST" : "RUN OVER",
          title: "Claim Field",
          rows: [
            { label: "Score", value: state.score },
            { label: "Streak", value: state.streak },
            { label: "Best", value: state.best },
            { label: "Reason", value: reason || "\u2014" }
          ]
        });
      }, 650);
    }
    function onHitAsteroid(ast) {
      const now = performance.now();
      if (now < state.cooldownUntil)
        return;
      if (ast.value === state.answer) {
        state.score += 60 + state.streak * 15;
        state.streak++;
        api.sfx.success();
        api.hud.flashStat("streak");
        state.question = makeQuestion(opsEnabled, includeSquares, includeRoots, sStart, sEnd);
        state.answer = state.question.answer;
        qBar.textContent = state.question.text;
        layAsteroids(state.answer);
        state.cooldownUntil = now + 350;
        state.ship.vx *= 0.55;
        state.ship.vy *= 0.55;
        if (state.aliens.length > 2)
          state.aliens.splice(0, state.aliens.length - 2);
      } else {
        state.lives--;
        state.streak = 0;
        api.sfx.error();
        api.hud.flashStat("lives");
        state.stunUntil = now + 850;
        state.ship.vx *= 0.15;
        state.ship.vy *= 0.15;
        state.cooldownUntil = now + 550;
        if (state.lives <= 0)
          handleGameOver("Wrong asteroid");
      }
      syncHud();
    }
    function collide() {
      const now = performance.now();
      if (now < state.cooldownUntil)
        return;
      for (let i = 0; i < state.asteroids.length; i++) {
        const a = state.asteroids[i];
        if (distSq(a.x, a.y, state.ship.x, state.ship.y) <= (AST_R + SHIP_R) ** 2) {
          onHitAsteroid(a);
          return;
        }
      }
      for (let i = 0; i < state.aliens.length; i++) {
        const al = state.aliens[i];
        if (distSq(al.x, al.y, state.ship.x, state.ship.y) <= (SHIP_R + 26) ** 2) {
          state.stunUntil = now + 500;
          const dx = state.ship.x - al.x;
          const dy = state.ship.y - al.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          state.ship.vx += dx / d * 280;
          state.ship.vy += dy / d * 280;
          api.sfx.tick();
        }
      }
    }
    function drawAsteroidTile(img, cx, cy, size, rot) {
      if (!img || !img.complete || !img.naturalWidth) {
        ctx.fillStyle = "rgba(120,120,140,.85)";
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.45, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot || 0);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
    function drawShip(cx, cy, size) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(state.ship.heading);
      if (!shipImg.complete || !shipImg.naturalWidth) {
        ctx.fillStyle = "#22ffcc";
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.5);
        ctx.lineTo(size * 0.4, size * 0.4);
        ctx.lineTo(-size * 0.4, size * 0.4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.shadowColor = "rgba(0,229,255,.45)";
        ctx.shadowBlur = 18;
        ctx.drawImage(shipImg, -size / 2, -size / 2, size, size);
      }
      ctx.restore();
    }
    function drawField() {
      const pSize = AST_R * 1.35;
      state.asteroids.forEach((p) => {
        const cx = p.x;
        const cy = p.y;
        const glow = ctx.createRadialGradient(cx, cy, pSize * 0.08, cx, cy, pSize * 0.72);
        glow.addColorStop(0, "rgba(0, 229, 255, .38)");
        glow.addColorStop(1, "rgba(0, 60, 120, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, pSize * 0.72, 0, Math.PI * 2);
        ctx.fill();
        drawAsteroidTile(asteroidImgs[p.astIdx] || asteroidImgs[0], cx, cy, pSize, p.rot);
        ctx.fillStyle = "rgba(6, 10, 22, .82)";
        ctx.beginPath();
        ctx.arc(cx, cy, AST_R * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,229,255,.55)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#e6fbff";
        ctx.font = "bold " + Math.floor(AST_R * 0.82) + "px Oxanium, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(p.value), cx, cy + 1);
      });
    }
    function drawAliens() {
      const r = 30;
      state.aliens.forEach((al) => {
        if (alienImg.complete && alienImg.naturalWidth) {
          ctx.save();
          ctx.translate(al.x, al.y);
          const ang = Math.atan2(state.ship.y - al.y, state.ship.x - al.x) + Math.PI / 2;
          ctx.rotate(ang);
          ctx.shadowColor = "rgba(255,77,166,.42)";
          ctx.shadowBlur = 14;
          ctx.drawImage(alienImg, -r, -r, r * 2, r * 2);
          ctx.restore();
        } else {
          ctx.fillStyle = "#ff79c6";
          ctx.beginPath();
          ctx.arc(al.x, al.y, r * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      drawField();
      drawAliens();
      drawShip(state.ship.x, state.ship.y, SHIP_R * 2.3);
      if (state.phase === "idle") {
        ctx.fillStyle = "rgba(6,9,22,0.55)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#e5e7ff";
        ctx.font = "bold 34px Oxanium, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("PRESS START", W / 2, H / 2 - 12);
        ctx.font = "16px Oxanium, sans-serif";
        ctx.fillStyle = "rgba(226,232,255,0.7)";
        ctx.fillText("Thrust drifts \u2014 use rotation + momentum. Wrong rock costs a life.", W / 2, H / 2 + 20);
      } else if (state.phase === "over") {
        ctx.fillStyle = "rgba(6,9,22,0.72)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ff4d6d";
        ctx.font = "bold 36px Oxanium, sans-serif";
        ctx.fillText("RUN OVER", W / 2, H / 2 - 6);
        ctx.font = "18px Oxanium, sans-serif";
        ctx.fillStyle = "rgba(226,232,255,0.8)";
        ctx.fillText("Score " + state.score + "   //   Best " + state.best, W / 2, H / 2 + 24);
      } else if (state.paused) {
        ctx.fillStyle = "rgba(6,9,22,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#7df3ff";
        ctx.font = "bold 32px Oxanium, sans-serif";
        ctx.fillText("PAUSED", W / 2, H / 2);
      }
      const now = performance.now();
      if (now < state.stunUntil) {
        ctx.fillStyle = "rgba(100,149,237,0.12)";
        ctx.fillRect(0, 0, W, H);
      }
    }
    function loop(ts) {
      if (state.destroyed)
        return;
      state.rafId = requestAnimationFrame(loop);
      const delta = Math.min(ts - state.lastTime, 50);
      state.lastTime = ts;
      const dt = delta / 1e3;
      if (state.phase === "running" && !state.paused) {
        physicsStep(dt);
        trySpawnAlien(ts);
        collide();
      }
      draw();
    }
    function onKeyDown(e) {
      if (state.phase === "over")
        return;
      state.keys[e.code] = true;
      if (e.code === "Space") {
        state.paused = !state.paused;
        state.lastTime = performance.now();
        e.preventDefault();
        return;
      }
      if ((e.code === "Enter" || e.code === "NumpadEnter") && state.phase === "idle") {
        beginRound(true);
        e.preventDefault();
        return;
      }
      const nav = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"];
      if (nav.indexOf(e.code) >= 0)
        e.preventDefault();
    }
    function onKeyUp(e) {
      state.keys[e.code] = false;
      const nav = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS"];
      if (nav.indexOf(e.code) >= 0)
        e.preventDefault();
    }
    canvas.addEventListener("click", () => {
      if (state.phase === "idle")
        beginRound(true);
    });
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    state.lastTime = performance.now();
    state.rafId = requestAnimationFrame(loop);
    return {
      teardown() {
        state.destroyed = true;
        if (state.rafId)
          cancelAnimationFrame(state.rafId);
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
      },
      onPause() {
        state.paused = true;
      },
      onResume() {
        if (state.phase !== "running")
          return;
        state.paused = false;
        state.lastTime = performance.now();
      }
    };
  }
  var descriptor6 = {
    id: "claim_field",
    title: "Claim Field",
    tagline: "Arcade \u2022 Drift & scan",
    blurb: "Rotate and thrust through inertia, find the answer among static rocks, dodge pursuing aliens.",
    brief: "Thrust builds velocity along your nose (drift). Left/Right only spin the ship. Numbered asteroids fill the arena; touch the answer to score. Wrong pick costs a life. Aliens creep in from the edges homing on you.",
    configSchema: [
      {
        type: "ship",
        id: "ship",
        label: "Ship",
        default: "classic",
        options: SHIP_CATALOG2,
        hint: "Only unlocked ships are selectable. Unlock more in the main game."
      },
      {
        type: "toggles",
        id: "ops",
        label: "Operations",
        default: ["add", "sub", "mul", "div"],
        options: [
          { value: "add", label: "+" },
          { value: "sub", label: "\u2212" },
          { value: "mul", label: "\xD7" },
          { value: "div", label: "\xF7" }
        ],
        min: 1
      },
      {
        type: "select",
        id: "squares",
        label: "Squares",
        default: "0",
        valueType: "string",
        options: [
          { value: "0", label: "Off" },
          { value: "1", label: "On (n\xB2 = ?)" }
        ]
      },
      {
        type: "select",
        id: "roots",
        label: "Roots",
        default: "0",
        valueType: "string",
        options: [
          { value: "0", label: "Off" },
          { value: "1", label: "On (\u221A(n\xB2) = ?)" }
        ]
      },
      { type: "number", id: "sStart", label: "Square/root start n", default: 1, min: 1, max: 60 },
      { type: "number", id: "sEnd", label: "Square/root end n", default: 12, min: 1, max: 60 },
      { type: "number", id: "stones", label: "Asteroids in field", default: 10, min: 4, max: 16 },
      { type: "number", id: "lives", label: "Lives", default: 3, min: 1, max: 9 },
      { type: "number", id: "alienSpawnMs", label: "Alien spawn interval (ms)", default: 3200, min: 1200, max: 12e3 },
      { type: "number", id: "maxAliens", label: "Max aliens", default: 5, min: 1, max: 12 },
      { type: "number", id: "alienSpeed", label: "Alien chase speed", default: 62, min: 20, max: 200 }
    ],
    mount(container, config, api) {
      const cfg = {
        ship: config.ship || "classic",
        ops: config.ops,
        squares: config.squares === "1" || config.squares === 1 || config.squares === true,
        roots: config.roots === "1" || config.roots === 1 || config.roots === true,
        sStart: config.sStart,
        sEnd: config.sEnd,
        stones: config.stones,
        lives: config.lives,
        alienSpawnMs: config.alienSpawnMs,
        maxAliens: config.maxAliens,
        alienSpeed: config.alienSpeed
      };
      return mountGame(container, cfg, api);
    }
  };

  // src/js/side_ops/registry.js
  var CATEGORIES = [
    {
      id: "memory_belts",
      title: "Memory Belts",
      tagline: "Memory \u2022 Matching drills",
      blurb: "Card-matching belts for squares, roots, and decimals. Flip, match, clear.",
      games: [
        descriptor,
        descriptor2,
        descriptor3
      ]
    },
    {
      id: "grid_master_panel",
      title: descriptor4.title,
      tagline: descriptor4.tagline,
      blurb: descriptor4.blurb,
      game: descriptor4
    },
    {
      id: "collections_panel",
      title: descriptor5.title,
      tagline: descriptor5.tagline,
      blurb: descriptor5.blurb,
      game: descriptor5
    },
    {
      id: "claim_field_panel",
      title: descriptor6.title,
      tagline: descriptor6.tagline,
      blurb: descriptor6.blurb,
      game: descriptor6
    }
  ];
  var ALL_GAMES = [
    descriptor,
    descriptor2,
    descriptor3,
    descriptor4,
    descriptor5,
    descriptor6
  ];
  function listCategories() {
    return CATEGORIES.slice();
  }
  function getCategory(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id)
        return CATEGORIES[i];
    }
    return null;
  }
  function getGame(id) {
    for (var i = 0; i < ALL_GAMES.length; i++) {
      if (ALL_GAMES[i].id === id)
        return ALL_GAMES[i];
    }
    return null;
  }

  // src/js/side_ops/shell.js
  var audioCtx = function() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC)
        return null;
      return new AC();
    } catch (e) {
      return null;
    }
  }();
  function beep(freq, duration, type, gain) {
    if (!audioCtx)
      return;
    try {
      if (audioCtx.state === "suspended")
        audioCtx.resume();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type || "sine";
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(gain || 0.08, now + 0.01);
      g.gain.exponentialRampToValueAtTime(1e-4, now + duration);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) {
    }
  }
  var SFX = {
    click: () => beep(520, 0.05, "square", 0.05),
    select: () => beep(660, 0.08, "triangle", 0.06),
    success: () => {
      beep(660, 0.08, "sine", 0.08);
      setTimeout(() => beep(880, 0.12, "sine", 0.08), 70);
    },
    error: () => beep(180, 0.18, "sawtooth", 0.06),
    win: () => {
      const notes = [523, 659, 784, 1046];
      notes.forEach((f, i) => setTimeout(() => beep(f, 0.18, "triangle", 0.08), i * 110));
    },
    tick: () => beep(380, 0.03, "square", 0.03)
  };
  function el2(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === "class")
          node.className = attrs[k];
        else if (k === "style")
          node.setAttribute("style", attrs[k]);
        else if (k === "dataset") {
          for (const dk in attrs[k])
            node.dataset[dk] = attrs[k][dk];
        } else if (k.startsWith("on") && typeof attrs[k] === "function") {
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        } else if (k === "html")
          node.innerHTML = attrs[k];
        else if (attrs[k] != null)
          node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      for (const c of children) {
        if (c == null)
          continue;
        node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
      }
    }
    return node;
  }
  function clear(node) {
    while (node.firstChild)
      node.removeChild(node.firstChild);
  }
  function formatTime(ms) {
    if (ms == null || !isFinite(ms))
      return "0:00";
    const s = Math.max(0, Math.floor(ms / 1e3));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return mm + ":" + (ss < 10 ? "0" : "") + ss;
  }
  var rootEl = null;
  var crumbEl = null;
  var hudBar = null;
  var hudChips = {};
  var gameContainer = null;
  var pauseOverlay = null;
  var resultsOverlay = null;
  var activeGameId = null;
  var activeGame = null;
  var activeConfig = null;
  var activeTeardown = null;
  var activeOnPause = null;
  var activeOnResume = null;
  var hudTimer = null;
  var hudTimerStart = 0;
  var hudTimerBase = 0;
  var hudTimerRunning = false;
  var isPaused = false;
  function start(root) {
    rootEl = root;
    crumbEl = document.getElementById("sideOpsCrumb");
    document.addEventListener("keydown", onGlobalKey);
    showHub();
  }
  function setCrumb(text) {
    if (crumbEl)
      crumbEl.textContent = text || "";
  }
  function onGlobalKey(e) {
    if (!activeGameId)
      return;
    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      if (resultsOverlay && resultsOverlay.classList.contains("show"))
        return;
      togglePause();
      e.preventDefault();
    }
  }
  function showHub() {
    teardownActive();
    clear(rootEl);
    setCrumb("Pick a mission");
    const cats = listCategories();
    const grid = el2("div", { class: "sideOpsHubGrid" });
    cats.forEach((cat) => {
      const isGroup = Array.isArray(cat.games);
      const extra = isGroup ? el2("span", { class: "sideOpsTileBadge" }, [cat.games.length + " variants"]) : null;
      const tile = el2("button", {
        class: "sideOpsTile",
        type: "button",
        onclick: () => {
          SFX.select();
          if (isGroup)
            showGroup(cat.id);
          else
            showConfig(cat.game.id);
        }
      }, [
        el2("span", { class: "tag" }, [cat.tagline || "Mini Game"]),
        el2("h3", { class: "name" }, [cat.title]),
        el2("p", { class: "blurb" }, [cat.blurb || ""]),
        extra
      ]);
      grid.appendChild(tile);
    });
    const wrap2 = el2("div", { class: "sideOpsHub" }, [
      el2("div", { class: "sideOpsConfigHeader", style: "margin-bottom:14px;" }, [
        el2("span", { class: "kicker" }, ["SIDE OPS // MINI GAMES"]),
        el2("h2", {}, ["Pick an operation"]),
        el2("p", {}, ["Short, focused math drills. Each panel has its own mechanic. Timer and stats report back after every run."])
      ]),
      grid
    ]);
    rootEl.appendChild(wrap2);
  }
  function showGroup(catId) {
    const cat = getCategory(catId);
    if (!cat || !Array.isArray(cat.games)) {
      showHub();
      return;
    }
    teardownActive();
    clear(rootEl);
    setCrumb(cat.title + " \u2014 pick a belt");
    const grid = el2("div", { class: "sideOpsHubGrid" });
    cat.games.forEach((g) => {
      const tile = el2("button", {
        class: "sideOpsTile",
        type: "button",
        onclick: () => {
          SFX.select();
          showConfig(g.id);
        }
      }, [
        el2("span", { class: "tag" }, [g.tagline || "Mini Game"]),
        el2("h3", { class: "name" }, [g.title]),
        el2("p", { class: "blurb" }, [g.blurb || ""])
      ]);
      grid.appendChild(tile);
    });
    const back = el2("button", {
      class: "btn",
      type: "button",
      onclick: () => {
        SFX.click();
        showHub();
      }
    }, ["Back"]);
    const wrap2 = el2("div", { class: "sideOpsHub" }, [
      el2("div", { class: "sideOpsConfigHeader", style: "margin-bottom:14px;" }, [
        el2("span", { class: "kicker" }, ["SIDE OPS // " + cat.title.toUpperCase()]),
        el2("h2", {}, [cat.title]),
        el2("p", {}, [cat.blurb || ""])
      ]),
      grid,
      el2("div", { class: "sideOpsActions", style: "margin-top:16px; justify-content:flex-start;" }, [back])
    ]);
    rootEl.appendChild(wrap2);
  }
  function findParentGroup(gameId) {
    const cats = listCategories();
    for (let i = 0; i < cats.length; i++) {
      const c = cats[i];
      if (Array.isArray(c.games) && c.games.some((g) => g.id === gameId))
        return c;
    }
    return null;
  }
  function showConfig(gameId) {
    const game = getGame(gameId);
    if (!game) {
      showHub();
      return;
    }
    clear(rootEl);
    setCrumb(game.title + " \u2014 briefing");
    const schema = game.configSchema || [];
    const values = {};
    schema.forEach((f) => {
      values[f.id] = f.default;
    });
    const fieldsEl = el2("div", { class: "sideOpsFields" });
    schema.forEach((field) => {
      fieldsEl.appendChild(renderField(field, values, () => {
      }));
    });
    const launch = el2("button", {
      class: "btn primary",
      type: "button",
      onclick: () => {
        SFX.success();
        const errs = validateConfig(schema, values);
        if (errs.length) {
          showToastInline(fieldsEl.parentElement, errs.join(" \u2022 "));
          return;
        }
        showPlay(game, Object.assign({}, values));
      }
    }, ["Launch"]);
    const parentGroup = findParentGroup(gameId);
    const back = el2("button", {
      class: "btn",
      type: "button",
      onclick: () => {
        SFX.click();
        if (parentGroup)
          showGroup(parentGroup.id);
        else
          showHub();
      }
    }, ["Back"]);
    const wrap2 = el2("div", { class: "sideOpsConfig" }, [
      el2("div", { class: "sideOpsConfigHeader" }, [
        el2("span", { class: "kicker" }, [game.tagline || "Side Op"]),
        el2("h2", {}, [game.title]),
        el2("p", {}, [game.brief || game.blurb || ""])
      ]),
      fieldsEl,
      el2("div", { class: "sideOpsActions" }, [back, launch])
    ]);
    rootEl.appendChild(wrap2);
  }
  function renderField(field, values, onChange) {
    const id = "cfg_" + field.id;
    const wrap2 = el2("div", { class: "sideOpsField" });
    wrap2.appendChild(el2("label", { for: id }, [field.label]));
    if (field.type === "number" || field.type === "range") {
      const input = el2("input", {
        type: "number",
        id,
        min: field.min,
        max: field.max,
        step: field.step || 1,
        value: field.default
      });
      input.addEventListener("input", () => {
        let v = parseInt(input.value, 10);
        if (isNaN(v))
          v = field.default;
        values[field.id] = v;
        onChange();
      });
      wrap2.appendChild(input);
    } else if (field.type === "select") {
      const sel = el2("select", { id });
      (field.options || []).forEach((opt) => {
        const o = el2("option", { value: opt.value }, [opt.label]);
        if (opt.value === field.default)
          o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", () => {
        const raw = sel.value;
        values[field.id] = field.valueType === "number" ? parseInt(raw, 10) : raw;
        onChange();
      });
      wrap2.appendChild(sel);
    } else if (field.type === "toggles") {
      const row = el2("div", { class: "sideOpsToggleRow" });
      const current = new Set(field.default || []);
      values[field.id] = Array.from(current);
      (field.options || []).forEach((opt) => {
        const b = el2("button", {
          type: "button",
          class: "sideOpsToggle" + (current.has(opt.value) ? " on" : ""),
          onclick: () => {
            if (current.has(opt.value)) {
              if (current.size <= (field.min || 1))
                return;
              current.delete(opt.value);
              b.classList.remove("on");
            } else {
              current.add(opt.value);
              b.classList.add("on");
            }
            values[field.id] = Array.from(current);
            onChange();
          }
        }, [opt.label]);
        row.appendChild(b);
      });
      wrap2.appendChild(row);
    } else if (field.type === "text") {
      const input = el2("input", {
        type: "text",
        id,
        value: field.default || ""
      });
      input.addEventListener("input", () => {
        values[field.id] = input.value;
        onChange();
      });
      wrap2.appendChild(input);
    } else if (field.type === "ship") {
      const options = field.options || [];
      const unlockMap = {};
      try {
        const raw = localStorage.getItem("mentaris.unlocks.ships");
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr))
            arr.forEach((id2) => {
              unlockMap[id2] = true;
            });
        }
      } catch (e) {
      }
      const available = options.filter((o) => o.defaultUnlocked || unlockMap[o.value]);
      const initial = field.default && available.some((o) => o.value === field.default) ? field.default : available[0] && available[0].value;
      values[field.id] = initial;
      const grid = el2("div", { class: "shipPicker" });
      options.forEach((opt) => {
        const locked = !(opt.defaultUnlocked || unlockMap[opt.value]);
        const card = el2("button", {
          type: "button",
          class: "shipPickCard" + (opt.value === initial ? " selected" : "") + (locked ? " locked" : ""),
          "data-ship-id": opt.value,
          title: locked ? "Locked \u2014 unlock in main game" : opt.label,
          onclick: () => {
            if (locked)
              return;
            values[field.id] = opt.value;
            grid.querySelectorAll(".shipPickCard").forEach((n) => n.classList.remove("selected"));
            card.classList.add("selected");
            onChange();
          }
        });
        const img = el2("img", { class: "shipThumb", src: opt.icon, alt: opt.label });
        img.loading = "lazy";
        img.decoding = "async";
        card.appendChild(img);
        card.appendChild(el2("span", { class: "shipName" }, [opt.label]));
        if (locked)
          card.appendChild(el2("span", { class: "lockIcon" }, ["Locked"]));
        grid.appendChild(card);
      });
      wrap2.appendChild(grid);
    }
    if (field.hint)
      wrap2.appendChild(el2("div", { class: "hint" }, [field.hint]));
    return wrap2;
  }
  function validateConfig(schema, values) {
    const errs = [];
    schema.forEach((f) => {
      if (f.type === "number" || f.type === "range") {
        const v = values[f.id];
        if (typeof v !== "number" || isNaN(v)) {
          errs.push(f.label + " required");
          return;
        }
        if (f.min != null && v < f.min)
          errs.push(f.label + " must be \u2265 " + f.min);
        if (f.max != null && v > f.max)
          errs.push(f.label + " must be \u2264 " + f.max);
      }
    });
    if (typeof schema.validate === "function") {
      const more = schema.validate(values) || [];
      more.forEach((m) => errs.push(m));
    }
    return errs;
  }
  function showToastInline(parent, msg) {
    const t = el2("div", {
      style: "margin-top:8px; color: var(--bad); font-size:12px; letter-spacing:1px; text-transform:uppercase;"
    }, [msg]);
    parent.parentElement.insertBefore(t, parent.nextSibling);
    setTimeout(() => {
      if (t.parentNode)
        t.parentNode.removeChild(t);
    }, 2400);
  }
  function showPlay(game, config) {
    teardownActive();
    clear(rootEl);
    activeGameId = game.id;
    activeGame = game;
    activeConfig = config;
    setCrumb(game.title + " \u2014 live");
    hudBar = el2("div", { class: "sideOpsHudBar", hidden: "" });
    hudChips = {};
    gameContainer = el2("div", { class: "sideOpsGame" });
    pauseOverlay = buildPauseOverlay();
    resultsOverlay = buildResultsOverlay();
    const wrap2 = el2("div", { style: "position:relative;" }, [
      hudBar,
      gameContainer,
      pauseOverlay,
      resultsOverlay
    ]);
    rootEl.appendChild(wrap2);
    const api = {
      hud: {
        setChips: setHudChips,
        setStat: setHudStat,
        flashStat: flashHudStat,
        startTimer: startHudTimer,
        stopTimer: stopHudTimer,
        setTime: setHudTime,
        countdownFrom: startHudCountdown,
        hide: () => {
          hudBar.setAttribute("hidden", "");
        },
        show: () => {
          hudBar.removeAttribute("hidden");
        }
      },
      sfx: SFX,
      exit: (stats) => showResults(stats || {}),
      back: () => exitToHub()
    };
    try {
      const result = game.mount(gameContainer, config, api);
      if (typeof result === "function") {
        activeTeardown = result;
      } else if (result && typeof result === "object") {
        activeTeardown = typeof result.teardown === "function" ? result.teardown : null;
        activeOnPause = typeof result.onPause === "function" ? result.onPause : null;
        activeOnResume = typeof result.onResume === "function" ? result.onResume : null;
      } else {
        activeTeardown = null;
      }
    } catch (e) {
      console.error("Failed to mount side-op game", game.id, e);
      clear(gameContainer);
      gameContainer.appendChild(el2("div", { class: "sideOpsMsg" }, [
        "Failed to start this op. Check the console for details."
      ]));
    }
  }
  function exitToHub() {
    const parent = activeGameId ? findParentGroup(activeGameId) : null;
    teardownActive();
    if (parent)
      showGroup(parent.id);
    else
      showHub();
  }
  function teardownActive() {
    if (activeTeardown) {
      try {
        activeTeardown();
      } catch (e) {
        console.warn(e);
      }
    }
    stopHudTimer();
    activeGameId = null;
    activeGame = null;
    activeConfig = null;
    activeTeardown = null;
    activeOnPause = null;
    activeOnResume = null;
    hudBar = null;
    hudChips = {};
    gameContainer = null;
    pauseOverlay = null;
    resultsOverlay = null;
    isPaused = false;
  }
  function setHudChips(defs) {
    clear(hudBar);
    hudChips = {};
    (defs || []).forEach((d) => {
      if (d.spacer) {
        hudBar.appendChild(el2("div", { class: "sideOpsHudSpacer" }));
        return;
      }
      const chip = el2("div", { class: "sideOpsHudChip" + (d.variant ? " " + d.variant : "") }, [
        el2("span", { class: "label" }, [d.label]),
        el2("span", { class: "value" }, [d.value != null ? String(d.value) : ""])
      ]);
      if (d.id)
        hudChips[d.id] = chip;
      hudBar.appendChild(chip);
    });
    const backBtn = el2("button", {
      class: "btn",
      type: "button",
      onclick: () => {
        SFX.click();
        exitToHub();
      }
    }, ["Back"]);
    hudBar.appendChild(backBtn);
    hudBar.removeAttribute("hidden");
  }
  function setHudStat(id, value, variant) {
    const chip = hudChips[id];
    if (!chip)
      return;
    const v = chip.querySelector(".value");
    if (v)
      v.textContent = value != null ? String(value) : "";
    if (variant) {
      chip.classList.remove("accent", "warn", "bad", "good");
      chip.classList.add(variant);
    }
  }
  function flashHudStat(id) {
    const chip = hudChips[id];
    if (!chip)
      return;
    chip.classList.remove("justMatched");
    void chip.offsetWidth;
    chip.classList.add("justMatched");
    setTimeout(() => chip.classList.remove("justMatched"), 420);
  }
  function setHudTime(ms) {
    setHudStat("time", formatTime(ms));
  }
  function startHudTimer() {
    stopHudTimer();
    hudTimerBase = 0;
    hudTimerStart = performance.now();
    hudTimerRunning = true;
    setHudTime(0);
    hudTimer = setInterval(() => {
      if (!hudTimerRunning)
        return;
      const now = performance.now();
      setHudTime(hudTimerBase + (now - hudTimerStart));
    }, 250);
  }
  function stopHudTimer() {
    if (hudTimer) {
      clearInterval(hudTimer);
      hudTimer = null;
    }
    hudTimerRunning = false;
  }
  function pauseHudTimer() {
    if (!hudTimerRunning)
      return;
    hudTimerBase += performance.now() - hudTimerStart;
    hudTimerRunning = false;
  }
  function resumeHudTimer() {
    if (hudTimerRunning)
      return;
    hudTimerStart = performance.now();
    hudTimerRunning = true;
  }
  function startHudCountdown(totalMs, onDone) {
    stopHudTimer();
    const start2 = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start2;
      const remain = Math.max(0, totalMs - elapsed);
      setHudTime(remain);
      if (remain <= 0) {
        stopHudTimer();
        if (typeof onDone === "function")
          onDone();
        return;
      }
    };
    tick();
    hudTimer = setInterval(tick, 250);
    hudTimerRunning = true;
  }
  function buildPauseOverlay() {
    const resumeBtn = el2("button", {
      class: "btn primary",
      type: "button",
      onclick: () => togglePause()
    }, ["Resume"]);
    const quitBtn = el2("button", {
      class: "btn",
      type: "button",
      onclick: () => exitToHub()
    }, ["Quit Op"]);
    return el2("div", { class: "sideOpsPause" }, [
      el2("div", { class: "sideOpsPauseCard" }, [
        el2("h3", {}, ["Paused"]),
        el2("div", { style: "color:var(--muted); font-size:12px; letter-spacing:1px;" }, ["Press P or Esc to resume"]),
        el2("div", { class: "row" }, [resumeBtn, quitBtn])
      ])
    ]);
  }
  function togglePause() {
    if (!activeGameId || !pauseOverlay)
      return;
    isPaused = !isPaused;
    if (isPaused) {
      pauseOverlay.classList.add("show");
      pauseHudTimer();
      if (activeOnPause)
        try {
          activeOnPause();
        } catch (e) {
        }
    } else {
      pauseOverlay.classList.remove("show");
      resumeHudTimer();
      if (activeOnResume)
        try {
          activeOnResume();
        } catch (e) {
        }
    }
  }
  function buildResultsOverlay() {
    return el2("div", { class: "sideOpsResults" }, [
      el2("div", { class: "sideOpsResultsCard" }, [
        el2("div", { class: "kicker", id: "sideOpsResKicker" }, ["MISSION COMPLETE"]),
        el2("h2", { id: "sideOpsResTitle" }, ["Nice run"]),
        el2("div", { class: "sideOpsResultsStats", id: "sideOpsResStats" }),
        el2("div", { class: "row" }, [
          el2("button", {
            class: "btn",
            type: "button",
            onclick: () => {
              SFX.click();
              exitToHub();
            }
          }, ["Side Ops"]),
          el2("button", {
            class: "btn primary",
            type: "button",
            onclick: () => {
              SFX.select();
              const g = activeGame;
              const cfg = Object.assign({}, activeConfig);
              if (g)
                showPlay(g, cfg);
            }
          }, ["Play Again"])
        ])
      ])
    ]);
  }
  function showResults(stats) {
    if (!resultsOverlay)
      return;
    stopHudTimer();
    SFX.win();
    const statsHost = resultsOverlay.querySelector("#sideOpsResStats");
    const title = resultsOverlay.querySelector("#sideOpsResTitle");
    const kicker = resultsOverlay.querySelector("#sideOpsResKicker");
    if (kicker)
      kicker.textContent = stats.kicker || "MISSION COMPLETE";
    if (title)
      title.textContent = stats.title || (activeGame ? activeGame.title : "Nice run");
    clear(statsHost);
    const rows = stats.rows || [];
    rows.forEach((r) => {
      statsHost.appendChild(el2("div", { class: "sideOpsResultsStat" }, [
        el2("div", { class: "label" }, [r.label]),
        el2("div", { class: "value" }, [String(r.value)])
      ]));
    });
    resultsOverlay.classList.add("show");
  }

  // src/js/side_ops/fx/floating_bg.js
  var ASTEROID_IMAGES = [
    "images/asteroids/asteroid1.png",
    "images/asteroids/asteroid2.png",
    "images/asteroids/asteroid3.png",
    "images/asteroids/asteroid4.png",
    "images/asteroids/asteroid6.png"
  ];
  function rand(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }
  function pick(a) {
    return a[Math.floor(Math.random() * a.length)];
  }
  function mountFloatingAsteroidBg(count) {
    if (document.getElementById("sideOpsFloatingBg"))
      return;
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
    const wrap2 = document.createElement("div");
    wrap2.id = "sideOpsFloatingBg";
    wrap2.setAttribute("aria-hidden", "true");
    for (let i = 0; i < n; i++) {
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
      wrap2.appendChild(img);
    }
    document.body.insertBefore(wrap2, document.body.firstChild);
  }

  // src/js/entry/side_ops.js
  function boot() {
    const root = document.getElementById("sideOpsRoot");
    if (!root) {
      console.error("Side Ops root element not found");
      return;
    }
    mountFloatingAsteroidBg(14);
    start(root);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
//# sourceMappingURL=side_ops.bundle.js.map
