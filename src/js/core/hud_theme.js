"use strict";

/**
 * Canvas HUD colors aligned with CSS --ui-* (mission briefing) tokens in asteroid_blaster.css.
 */
export var hudTheme = {
  surfacePanel: "rgba(8, 12, 24, 0.78)",
  surfacePanelMid: "rgba(8, 12, 24, 0.72)",
  surfaceDark: "rgba(0, 0, 0, 0.45)",
  strokeSoft: "rgba(255, 255, 255, 0.22)",
  strokeMuted: "rgba(255, 255, 255, 0.2)",
  strokeRing: "rgba(255, 255, 255, 0.2)",
  textPrimary: "rgba(232, 236, 255, 0.95)",
  textMuted: "rgba(232, 236, 255, 0.75)",
  textDim: "rgba(232, 236, 255, 0.88)",
  accentCyan: "rgba(0, 229, 255, 0.92)",
  accentCyanSoft: "rgba(110, 228, 255, 0.94)",
  warnAmmo: "rgba(255, 200, 90, 0.9)",
  badAmmo: "rgba(255, 80, 80, 0.75)",
  /** Pause / dim overlays on canvas */
  pauseOverlay: "rgba(0, 0, 0, 0.35)",
  barTrack: "rgba(0, 0, 0, 0.4)",
  glowCyan: "rgba(0, 229, 255, 0.35)",
  missionFail: "rgba(255, 77, 109, 0.92)",
  missionFailGlow: "rgba(255, 77, 109, 0.35)",
  timeUpGold: "rgba(255, 221, 0, 0.92)",
  timeUpGlow: "rgba(255, 221, 0, 0.35)",
  mineralTutorialGlow: "rgba(110, 220, 255, 0.26)",
  digitArrowFill: "rgba(255, 255, 255, 0.85)",
  textScreenshot: "rgba(232, 236, 255, 0.55)",
  accentCyanBadge: "rgba(0, 229, 255, 0.2)",
  strokeHigh: "rgba(255, 255, 255, 0.8)",
  strokeNearWhite: "rgba(255, 255, 255, 0.88)",
  strokePeak: "rgba(255, 255, 255, 0.9)",
  fillPeak: "rgba(255, 255, 255, 0.9)",
  pickupSlotEmptyStroke: "rgba(232, 236, 255, 0.35)",
  pickupSlotEmptyFill: "rgba(232, 236, 255, 0.06)",
  strokePickupIcon: "rgba(255, 255, 255, 0.85)",
  strokePickupIconStrong: "rgba(255, 255, 255, 0.9)",
  accentRingTrack: "rgba(0, 229, 255, 0.26)",
  accentRingFill: "rgba(0, 229, 255, 0.8)",
  accentSlotBadge: "rgba(0, 229, 255, 0.9)",
  textHudStrong: "rgba(232, 236, 255, 0.9)",
  strokeBoxSelected: "rgba(0, 229, 255, 0.6)",
  tutorialDotSurface: "rgba(8, 12, 24, 0.75)",
  tutorialDotActiveStroke: "rgba(0, 229, 255, 0.9)",
  tutorialDotInactiveStroke: "rgba(255, 255, 255, 0.65)",
  tutorialDotActiveText: "rgba(0, 229, 255, 0.95)",
  tutorialDotInactiveText: "rgba(232, 236, 255, 0.85)",
  timerBarFill: "rgba(0, 169, 255, 0.9)",
  timerBarGlow: "rgba(0, 169, 255, 0.35)",
  timerWarnFill: "rgba(255, 180, 60, 0.92)",
  timerWarnGlow: "rgba(255, 180, 60, 0.35)",
  progressBarFill: "rgba(210, 210, 210, 0.92)",
  progressBarGlow: "rgba(255, 255, 255, 0.25)",
  hpPulseGlow: "rgba(255, 80, 80, 0.75)",
  livesActive: "rgba(255, 80, 80, 0.9)",
  livesInactive: "rgba(255, 80, 80, 0.2)",
  livesStroke: "rgba(255, 120, 120, 0.5)",
  strikeActive: "rgba(255, 210, 90, 0.95)",
  strikeInactive: "rgba(255, 210, 90, 0.2)",
  strikeStroke: "rgba(255, 220, 120, 0.55)",
  /** Radial gradients / rings (tutorial portal, similar FX) */
  accentGlowStopStrong: "rgba(0, 229, 255, 0.5)",
  accentGlowStopMid: "rgba(0, 229, 255, 0.18)",
  accentGlowStopOuter: "rgba(0, 229, 255, 0.44)",
  accentGlowStopOuterMid: "rgba(0, 229, 255, 0.14)",
  accentStrokeHard: "rgba(0, 229, 255, 0.95)",
  accentLockRing: "rgba(0, 229, 255, 0.65)",
  labelBackdrop: "rgba(0, 0, 0, 0.6)",
  shipFloorGlow: "rgba(0, 229, 255, 0.06)",
  barHpFill: "rgba(28, 220, 120, 0.9)",
  barHpGlow: "rgba(28, 220, 120, 0.35)",
  fontLabel: '600 11px Oxanium, sans-serif',
  fontLabelSm: '600 10px Oxanium, sans-serif',
  fontTitleSm: '700 14px Oxanium, sans-serif',
  fontHudTitle: '700 20px Oxanium, sans-serif',
  fontHudSub: '600 14px Oxanium, sans-serif',
  fontTiny: '600 12px Oxanium, sans-serif',
  radiusPanel: 8,
  radiusTile: 10,
  radiusPill: 3
};

export function hudQuestionFontSize(w){
  return Math.max(28, Math.min(64, w * 0.06));
}

/** Injected #missionBriefOverlay rules (matches --ui-* briefing card). */
export function getMissionBriefInjectedCss(){
  var scrim = "rgba(6, 10, 20, 0.72)";
  var cardBg = "rgba(8, 12, 24, 0.92)";
  var cardBorder = "rgba(0, 210, 255, 0.28)";
  var shadow = "0 18px 48px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.04)";
  var btnBg = "rgba(8, 12, 24, 0.65)";
  var btnBorder = "rgba(0, 210, 255, 0.35)";
  return "#missionBriefOverlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:18;background:" + scrim + ";backdrop-filter:blur(4px);}#missionBriefOverlay.show{display:flex;}#missionBriefOverlay .missionBrief-wrap{display:flex;align-items:flex-end;gap:18px;}#missionBriefOverlay .missionBrief-avatarWrap{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:220px;}#missionBriefOverlay .missionBrief-avatar{width:230px;height:230px;object-fit:contain;filter:drop-shadow(0 12px 26px rgba(0,0,0,.45));}#missionBriefOverlay .missionBrief-avatarName{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:rgba(232,236,255,.85);}#missionBriefOverlay .missionBrief-card{background:" + cardBg + ";border:1px solid " + cardBorder + ";border-radius:18px;padding:18px 20px;max-width:480px;width:min(480px,92%);box-shadow:" + shadow + ";font-family:\"Oxanium\",sans-serif;transform:scale(0.92);opacity:0;transition:transform .35s ease, opacity .35s ease;}#missionBriefOverlay.show .missionBrief-card{transform:scale(1);opacity:1;}#missionBriefOverlay .missionBrief-card.is-exiting{transform:scale(0.86);opacity:0;}#missionBriefOverlay h3{margin:0 0 10px;font-size:14px;letter-spacing:1.6px;text-transform:uppercase;color:#e8ecff;}#missionBriefOverlay p{margin:0 0 16px;font-size:13px;line-height:1.6;color:rgba(232,236,255,.8);white-space:pre-line;}#missionBriefOverlay .brief-actions{display:flex;justify-content:flex-end;}#missionBriefOverlay .brief-btn{background:" + btnBg + ";border:1px solid " + btnBorder + ";color:#e8ecff;border-radius:12px;padding:8px 12px;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;font-family:\"Oxanium\",sans-serif;}";
}

/** Injected .sandboxPanel rules (briefing-aligned chrome). */
export function getSandboxPanelInjectedCss(){
  var shell = "rgba(8, 12, 24, 0.9)";
  var border = "rgba(0, 210, 255, 0.22)";
  var group = "rgba(8, 12, 24, 0.45)";
  var line = "rgba(255, 255, 255, 0.12)";
  var btn = "rgba(8, 12, 24, 0.55)";
  var accent = "rgba(0, 229, 255, 0.55)";
  return ".sandboxPanel{position:fixed;top:90px;left:16px;z-index:45;width:min(460px,calc(100vw - 32px));max-height:calc(100vh - 112px);overflow:auto;background:" + shell + ";border:1px solid " + border + ";border-radius:16px;padding:12px 14px;box-shadow:0 24px 60px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.04);}"+
    ".sandboxPanel .sandboxHeader{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}"+
    ".sandboxPanel h4{margin:0;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:rgba(232,236,255,.82);}"+
    ".sandboxPanel .sandboxToggle{border:1px solid " + line + ";background:" + btn + ";color:#e8ecff;border-radius:10px;padding:4px 8px;font-size:10px;letter-spacing:.6px;text-transform:uppercase;cursor:pointer;}"+
    ".sandboxPanel.collapsed .sandboxBody{display:none;}"+
    ".sandboxPanel .sandboxSectionTools{display:flex;gap:8px;margin-bottom:8px;}"+
    ".sandboxPanel .sandboxSectionTools .sandboxToggle{flex:1;}"+
    ".sandboxPanel .sandboxGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}"+
    ".sandboxPanel .sandboxGroup{margin:0;border:1px solid " + border + ";background:" + group + ";border-radius:12px;padding:8px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05);}"+
    ".sandboxPanel .sandboxGroupHeader{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;}"+
    ".sandboxPanel .sandboxGroupTitle{font-size:11px;letter-spacing:1.1px;text-transform:uppercase;color:rgba(232,236,255,.78);}"+
    ".sandboxPanel .sandboxGroupToggle{border:1px solid " + line + ";background:" + btn + ";color:#e8ecff;border-radius:8px;padding:2px 6px;font-size:10px;cursor:pointer;}"+
    ".sandboxPanel .sandboxGroup.collapsed .sandboxGroupBody{display:none;}"+
    ".sandboxPanel .sandboxButtons{display:flex;flex-wrap:wrap;gap:6px;}"+
    ".sandboxPanel .sandboxBtn{border:1px solid " + line + ";background:" + btn + ";color:#e8ecff;border-radius:10px;padding:6px 8px;font-size:11px;letter-spacing:.6px;text-transform:uppercase;cursor:pointer;}"+
    ".sandboxPanel .sandboxBtn.active{border-color:" + accent + ";box-shadow:0 0 0 1px rgba(0,229,255,.22) inset;}"+
    ".sandboxPanel .sandboxBtn:hover{transform:translateY(-1px);border-color:" + accent + ";box-shadow:0 8px 18px rgba(0,0,0,.28);}"+
    ".sandboxPanel .sandboxNote{font-size:11px;color:rgba(232,236,255,.55);margin:6px 0 4px;}"+
    "@media (max-width: 960px){.sandboxPanel{top:78px;left:10px;width:min(420px,calc(100vw - 20px));max-height:calc(100vh - 96px);}.sandboxPanel .sandboxGrid{grid-template-columns:1fr;}}";
}
