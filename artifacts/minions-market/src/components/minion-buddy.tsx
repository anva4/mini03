// Placement: artifacts/minions-market/src/components/minion-buddy.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

type MinionState = "walking" | "waving" | "jumping" | "scared" | "angry" | "sleeping";

const PAGE_MESSAGES: Record<string, string> = {
  "/": "Йо! Я Боб! Помогу разобраться! 🍌",
  "/catalog": "Тут можно купить крутые штуки! 🎮",
  "/sell": "Хочешь продать? Жми сюда! 💰",
  "/wallet": "Тут твои бананы... эм деньги! 🍌",
  "/deals": "Смотри свои сделки! 🤝",
  "/messages": "Тебе написали! Скорей отвечай! 📨",
  "/profile": "Это твой профиль! Красавчик! 😎",
  "/settings": "Тут можно меня спрятать... не надо! 🥺",
  "/favorites": "Любимые товары тут! ❤️",
  "/radio": "Бипа-бипа-буп! Музычка! 🎵",
};

const SCARED_LINES = [
  "Ааааа! Не трогай! 😱",
  "МАМА!!! 😨",
  "Стой! Не готов! 🙈",
  "Кто я?! Где я?! 😵",
  "БЕГУ-БЕГУ-БЕГУ! 🏃",
];

const ANGRY_LINES = [
  "ПАПА! ПАПА! 😤",
  "Я кусаюсь!!! 😡",
  "БАБАЛААА!!! 👿",
  "ОТПУСТИ!!! 🤬",
];

const MINION_W = 72;
const BASE_SPD = 85;
const SCARED_SPD = 310;
const SLEEP_DELAY = 12000;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPageMsg(loc: string): string {
  if (loc === "/") return PAGE_MESSAGES["/"];
  for (const [path, msg] of Object.entries(PAGE_MESSAGES)) {
    if (path !== "/" && loc.startsWith(path)) return msg;
  }
  return "Привет! Я Боб! 👋";
}

// ─────────────────────────────────────────────
//  SVG Minion — redesigned with full gradients
// ─────────────────────────────────────────────
function MinionSVG({ state, dir }: { state: MinionState; dir: 1 | -1 }) {
  const waving   = state === "waving";
  const angry    = state === "angry";
  const scared   = state === "scared";
  const sleeping = state === "sleeping";
  const happy    = state === "waving" || state === "jumping";

  return (
    <svg
      width="72"
      height="108"
      viewBox="0 0 100 150"
      style={{ transform: dir === -1 ? "scaleX(-1)" : "none", overflow: "visible", display: "block" }}
    >
      <defs>
        {/* Yellow skin — warm spherical shading */}
        <radialGradient id="mb-skin" cx="40%" cy="32%" r="68%" gradientUnits="objectBoundingBox">
          <stop offset="0%"   stopColor="#FFF58A"/>
          <stop offset="30%"  stopColor="#FFD700"/>
          <stop offset="68%"  stopColor="#F5B800"/>
          <stop offset="100%" stopColor="#C48A00"/>
        </radialGradient>
        {/* Skin for arms */}
        <radialGradient id="mb-skinArm" cx="35%" cy="25%" r="70%">
          <stop offset="0%"   stopColor="#FFE84A"/>
          <stop offset="55%"  stopColor="#F0B000"/>
          <stop offset="100%" stopColor="#B88000"/>
        </radialGradient>
        {/* Goggle band — brushed silver */}
        <linearGradient id="mb-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#E2E2E2"/>
          <stop offset="28%"  stopColor="#C0C0C0"/>
          <stop offset="52%"  stopColor="#888"/>
          <stop offset="78%"  stopColor="#AEAEAE"/>
          <stop offset="100%" stopColor="#CACACA"/>
        </linearGradient>
        {/* Chrome ring for goggles */}
        <radialGradient id="mb-chrome" cx="32%" cy="28%" r="72%">
          <stop offset="0%"   stopColor="#F0F0F0"/>
          <stop offset="35%"  stopColor="#C0C0C0"/>
          <stop offset="70%"  stopColor="#808080"/>
          <stop offset="100%" stopColor="#505050"/>
        </radialGradient>
        {/* Goggle lens white */}
        <radialGradient id="mb-lens" cx="38%" cy="32%" r="68%">
          <stop offset="0%"   stopColor="#FFFFFF"/>
          <stop offset="65%"  stopColor="#F2F2F2"/>
          <stop offset="100%" stopColor="#E2E2E2"/>
        </radialGradient>
        {/* Brown iris */}
        <radialGradient id="mb-iris" cx="40%" cy="36%" r="64%">
          <stop offset="0%"   stopColor="#D4944A"/>
          <stop offset="28%"  stopColor="#A8682A"/>
          <stop offset="60%"  stopColor="#7B4418"/>
          <stop offset="100%" stopColor="#3A1E08"/>
        </radialGradient>
        {/* Denim overalls */}
        <linearGradient id="mb-denim" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%"   stopColor="#6090D8"/>
          <stop offset="38%"  stopColor="#4A78C0"/>
          <stop offset="75%"  stopColor="#3A64A8"/>
          <stop offset="100%" stopColor="#2E5490"/>
        </linearGradient>
        {/* Denim sheen highlight */}
        <linearGradient id="mb-denimHL" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#7AAAE0" stopOpacity="0.65"/>
          <stop offset="50%"  stopColor="#5888C8" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#4070B0" stopOpacity="0.35"/>
        </linearGradient>
        {/* Floor shadow */}
        <radialGradient id="mb-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#000" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
        {/* Bottom body ambient shadow */}
        <radialGradient id="mb-bodyShadow" cx="50%" cy="90%" r="55%">
          <stop offset="0%"   stopColor="#8B6000" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#8B6000" stopOpacity="0"/>
        </radialGradient>
        {/* Drop shadow filter */}
        <filter id="mb-drop" x="-18%" y="-6%" width="136%" height="122%">
          <feDropShadow dx="0" dy="4" stdDeviation="4.5" floodColor="#000" floodOpacity="0.22"/>
        </filter>
      </defs>

      {/* FLOOR SHADOW */}
      <ellipse cx="50" cy="149" rx="34" ry="6" fill="url(#mb-shadow)"/>

      {/* SHOES */}
      <ellipse cx="30" cy="143" rx="20" ry="9.5" fill="#151515"/>
      <ellipse cx="70" cy="143" rx="20" ry="9.5" fill="#151515"/>
      <ellipse cx="25" cy="139" rx="9"  ry="3.5" fill="#2e2e2e" opacity="0.55"/>
      <ellipse cx="65" cy="139" rx="9"  ry="3.5" fill="#2e2e2e" opacity="0.55"/>

      {/* BODY — one pill capsule shape */}
      <ellipse cx="50" cy="80" rx="39" ry="66" fill="url(#mb-skin)" filter="url(#mb-drop)"/>
      <ellipse cx="50" cy="110" rx="39" ry="36" fill="url(#mb-bodyShadow)"/>

      {/* OVERALLS LOWER */}
      <path d="M13 104 Q11 148 30 148 Q50 151 70 148 Q89 148 87 104 Z" fill="url(#mb-denim)"/>
      <path d="M13 104 Q11 148 30 148 Q50 151 70 148 Q89 148 87 104 Z" fill="url(#mb-denimHL)"/>

      {/* BIB front pocket */}
      <rect x="28" y="88" width="44" height="40" rx="6" fill="url(#mb-denim)"/>
      <rect x="28" y="88" width="44" height="40" rx="6" fill="url(#mb-denimHL)"/>
      {/* bib stitching */}
      <rect x="30" y="90" width="40" height="36" rx="5" fill="none" stroke="#7AAAE0" strokeWidth="0.9" strokeDasharray="3.5,2.5" opacity="0.42"/>

      {/* Side pocket shadow hints */}
      <path d="M13 107 Q12 121 17 124" stroke="#3A64A8" strokeWidth="1.5" fill="none" opacity="0.55"/>
      <path d="M87 107 Q88 121 83 124" stroke="#3A64A8" strokeWidth="1.5" fill="none" opacity="0.55"/>

      {/* SUSPENDER STRAPS */}
      <rect x="28" y="60" width="11" height="32" rx="5.5" fill="url(#mb-denim)"/>
      <rect x="61" y="60" width="11" height="32" rx="5.5" fill="url(#mb-denim)"/>
      <rect x="30" y="62" width="5"  height="28" rx="2.5" fill="#7AAAE0" opacity="0.38"/>
      <rect x="63" y="62" width="5"  height="28" rx="2.5" fill="#7AAAE0" opacity="0.38"/>

      {/* BUCKLE buttons */}
      <circle cx="33.5" cy="92" r="3.5" fill="#D4A830"/>
      <circle cx="33.5" cy="92" r="2"   fill="#F0C850"/>
      <circle cx="66.5" cy="92" r="3.5" fill="#D4A830"/>
      <circle cx="66.5" cy="92" r="2"   fill="#F0C850"/>

      {/* G BADGE — hexagonal Gru logo */}
      <g transform="translate(50,112)">
        <path d="M0,-14 L12,-7 L12,7 L0,14 L-12,7 L-12,-7 Z" fill="#111"/>
        <path d="M0,-11.5 L9.5,-5.75 L9.5,5.75 L0,11.5 L-9.5,5.75 L-9.5,-5.75 Z"
              fill="none" stroke="#2a2a2a" strokeWidth="1"/>
        <text x="0" y="5" textAnchor="middle" fontSize="11"
              fill="#F5C518" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900">G</text>
      </g>

      {/* LEFT ARM */}
      <ellipse cx="8" cy="108" rx="10" ry="17" fill="url(#mb-skinArm)" transform="rotate(12 8 108)"/>
      <circle cx="5" cy="124" r="11" fill="#111"/>
      <ellipse cx="1" cy="120" rx="5" ry="3.5" fill="#2a2a2a" opacity="0.6"/>

      {/* RIGHT ARM */}
      {waving ? (
        <>
          <ellipse cx="93" cy="80" rx="10" ry="17" fill="url(#mb-skinArm)" transform="rotate(-62 93 80)"/>
          <circle cx="104" cy="68" r="11" fill="#111"/>
          <ellipse cx="100" cy="64" rx="5" ry="3.5" fill="#2a2a2a" opacity="0.6"/>
        </>
      ) : (
        <>
          <ellipse cx="92" cy="108" rx="10" ry="17" fill="url(#mb-skinArm)" transform="rotate(-12 92 108)"/>
          <circle cx="95" cy="124" r="11" fill="#111"/>
          <ellipse cx="91" cy="120" rx="5" ry="3.5" fill="#2a2a2a" opacity="0.6"/>
        </>
      )}

      {/* GOGGLE BAND */}
      <rect x="5" y="32" width="90" height="21" rx="10.5" fill="url(#mb-band)"/>
      <rect x="5" y="32" width="90" height="8"  rx="6"    fill="white" opacity="0.18"/>
      <rect x="5" y="47" width="90" height="6"  rx="4"    fill="#000"  opacity="0.12"/>

      {/* LEFT GOGGLE */}
      <circle cx="31" cy="42.5" r="20"   fill="url(#mb-chrome)"/>
      <circle cx="31" cy="42.5" r="17.5" fill="#6A6A6A" opacity="0.22"/>
      <circle cx="31" cy="42.5" r="16.5" fill="url(#mb-lens)"/>
      {sleeping ? (
        <line x1="15" y1="42.5" x2="47" y2="42.5" stroke="#6B3A1F" strokeWidth="3.5" strokeLinecap="round"/>
      ) : (
        <>
          <circle cx="31" cy="42.5" r={scared ? "13" : "11"} fill="url(#mb-iris)"/>
          <circle cx="31" cy="42.5" r={scared ? "8"  : "6.5"} fill="#0A0A0A"/>
          <circle cx="25"  cy="36"  r="4"   fill="white" opacity="0.92"/>
          <circle cx="36.5" cy="48" r="1.8" fill="white" opacity="0.38"/>
        </>
      )}
      <path d="M16 30 Q31 26 46 30" stroke="white" strokeWidth="1.8" fill="none" opacity="0.35" strokeLinecap="round"/>

      {/* RIGHT GOGGLE */}
      <circle cx="69" cy="42.5" r="20"   fill="url(#mb-chrome)"/>
      <circle cx="69" cy="42.5" r="17.5" fill="#6A6A6A" opacity="0.22"/>
      <circle cx="69" cy="42.5" r="16.5" fill="url(#mb-lens)"/>
      {sleeping ? (
        <line x1="53" y1="42.5" x2="85" y2="42.5" stroke="#6B3A1F" strokeWidth="3.5" strokeLinecap="round"/>
      ) : (
        <>
          <circle cx="69" cy="42.5" r={scared ? "13" : "11"} fill="url(#mb-iris)"/>
          <circle cx="69" cy="42.5" r={scared ? "8"  : "6.5"} fill="#0A0A0A"/>
          <circle cx="63"  cy="36"  r="4"   fill="white" opacity="0.92"/>
          <circle cx="74.5" cy="48" r="1.8" fill="white" opacity="0.38"/>
        </>
      )}
      <path d="M54 30 Q69 26 84 30" stroke="white" strokeWidth="1.8" fill="none" opacity="0.35" strokeLinecap="round"/>

      {/* ANGRY EYEBROWS */}
      {angry && (
        <>
          <path d="M12 25 Q24 20 40 26" stroke="#111" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <path d="M60 26 Q76 20 88 25" stroke="#111" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        </>
      )}

      {/* MOUTH */}
      {!sleeping && (
        angry ? (
          <path d="M35 72 Q50 67 65 72" stroke="#2a2a2a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        ) : scared ? (
          <ellipse cx="50" cy="72" rx="8.5" ry="7" fill="#111"/>
        ) : happy ? (
          <path d="M34 70 Q50 83 66 70" stroke="#2a2a2a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        ) : (
          <path d="M38 71 Q50 80 62 71" stroke="#2a2a2a" strokeWidth="2" fill="none" strokeLinecap="round"/>
        )
      )}

      {/* HAIR strands */}
      <path d="M43 9  Q44 1  46 8"  stroke="#111" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      <path d="M50 6  Q51 -3 53 6"  stroke="#111" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      <path d="M57 9  Q59 2  61 10" stroke="#111" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

// ─────────────────────────────────────────────
//  Speech bubble
// ─────────────────────────────────────────────
function SpeechBubble({ text, alignRight }: { text: string; alignRight: boolean }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 112,
      ...(alignRight ? { right: 0 } : { left: 0 }),
      background: "white",
      border: "2.5px solid #FFD700",
      borderRadius: 16,
      padding: "9px 13px",
      fontSize: 12,
      fontWeight: 700,
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#1a1a1a",
      whiteSpace: "nowrap",
      maxWidth: 210,
      boxShadow: "0 4px 24px rgba(0,0,0,0.18), 0 1px 6px rgba(0,0,0,0.1)",
      zIndex: 10002,
      animation: "mb-bubble-pop 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
      pointerEvents: "none",
      lineHeight: 1.45,
    }}>
      {text}
      <div style={{
        position: "absolute", bottom: -12,
        ...(alignRight ? { right: 20 } : { left: 20 }),
        width: 0, height: 0,
        borderLeft: "9px solid transparent",
        borderRight: "9px solid transparent",
        borderTop: "12px solid #FFD700",
      }}/>
      <div style={{
        position: "absolute", bottom: -8.5,
        ...(alignRight ? { right: 23 } : { left: 23 }),
        width: 0, height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderTop: "9px solid white",
      }}/>
    </div>
  );
}

// ─────────────────────────────────────────────
//  MinionBuddy
// ─────────────────────────────────────────────
export function MinionBuddy() {
  const [hidden, setHidden] = useState(() => localStorage.getItem("minion_hidden") === "1");
  const [location]          = useLocation();
  const [posX, setPosX]     = useState(120);
  const [mState, setMState] = useState<MinionState>("walking");
  const [dir, setDir]       = useState<1 | -1>(1);
  const [speech, setSpeech] = useState<{ text: string; alignRight: boolean } | null>(null);

  const xRef       = useRef(120);
  const dirRef     = useRef<1 | -1>(1);
  const stateRef   = useRef<MinionState>("walking");
  const speechT    = useRef<ReturnType<typeof setTimeout>>();
  const sleepT     = useRef<ReturnType<typeof setTimeout>>();
  const randomT    = useRef<ReturnType<typeof setTimeout>>();
  const scaredT    = useRef<ReturnType<typeof setTimeout>>();
  const holdT      = useRef<ReturnType<typeof setTimeout>>();
  const prevLoc    = useRef(location);

  useEffect(() => {
    const onToggle = () => setHidden(localStorage.getItem("minion_hidden") === "1");
    window.addEventListener("minion-visibility-change", onToggle);
    return () => window.removeEventListener("minion-visibility-change", onToggle);
  }, []);

  useEffect(() => {
    if (hidden) return;
    let last = performance.now();
    let raf: number;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const s = stateRef.current;
      if (s === "walking" || s === "scared") {
        const spd = s === "scared" ? SCARED_SPD : BASE_SPD;
        const max = window.innerWidth - MINION_W - 12;
        xRef.current += dirRef.current * spd * dt;
        if (xRef.current <= 4)   { xRef.current = 4;   dirRef.current = 1;  setDir(1); }
        if (xRef.current >= max) { xRef.current = max; dirRef.current = -1; setDir(-1); }
        setPosX(Math.round(xRef.current));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hidden]);

  const resetSleep = useCallback(() => {
    clearTimeout(sleepT.current);
    sleepT.current = setTimeout(() => {
      if (stateRef.current === "walking") { stateRef.current = "sleeping"; setMState("sleeping"); }
    }, SLEEP_DELAY);
  }, []);

  const scheduleRandom = useCallback(() => {
    clearTimeout(randomT.current);
    const delay = 4500 + Math.random() * 7000;
    randomT.current = setTimeout(() => {
      if (stateRef.current !== "walking") { scheduleRandom(); return; }
      const action: MinionState = Math.random() < 0.5 ? "waving" : "jumping";
      stateRef.current = action; setMState(action);
      setTimeout(() => {
        if (stateRef.current === action) { stateRef.current = "walking"; setMState("walking"); }
        scheduleRandom();
      }, 2200);
    }, delay);
  }, []);

  useEffect(() => {
    if (hidden) return;
    scheduleRandom(); resetSleep();
    return () => { clearTimeout(randomT.current); clearTimeout(sleepT.current); };
  }, [hidden, scheduleRandom, resetSleep]);

  const showSpeech = useCallback((text: string, ms = 3500) => {
    const alignRight = xRef.current > (window.innerWidth || 400) / 2;
    setSpeech({ text, alignRight });
    clearTimeout(speechT.current);
    speechT.current = setTimeout(() => setSpeech(null), ms);
  }, []);

  useEffect(() => {
    if (location === prevLoc.current) return;
    prevLoc.current = location;
    showSpeech(getPageMsg(location), 4500);
    resetSleep();
  }, [location, showSpeech, resetSleep]);

  useEffect(() => {
    if (hidden) return;
    const t = setTimeout(() => showSpeech(getPageMsg(location), 5000), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (stateRef.current === "sleeping") {
      stateRef.current = "walking"; setMState("walking");
      showSpeech("Хм? Кто там? 😴", 2000); resetSleep(); return;
    }
    holdT.current = setTimeout(() => {
      stateRef.current = "angry"; setMState("angry");
      showSpeech(pickRandom(ANGRY_LINES), 2500);
    }, 620);
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.preventDefault();
    clearTimeout(holdT.current);
    resetSleep();
    if (stateRef.current === "angry") {
      setTimeout(() => { if (stateRef.current === "angry") { stateRef.current = "walking"; setMState("walking"); } }, 900);
      return;
    }
    if (stateRef.current === "sleeping") return;
    stateRef.current = "scared"; setMState("scared");
    dirRef.current = (-dirRef.current) as 1 | -1; setDir(dirRef.current);
    showSpeech(pickRandom(SCARED_LINES), 2600);
    clearTimeout(scaredT.current);
    scaredT.current = setTimeout(() => {
      if (stateRef.current === "scared") { stateRef.current = "walking"; setMState("walking"); }
    }, 2600);
  }

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes mb-walk {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          25%     { transform: translateY(-6px) rotate(-1.2deg); }
          75%     { transform: translateY(-6px) rotate(1.2deg); }
        }
        @keyframes mb-jump {
          0%,100% { transform: translateY(0)     scaleY(1)    scaleX(1); }
          8%      { transform: translateY(2px)   scaleY(0.83) scaleX(1.15); }
          42%     { transform: translateY(-50px) scaleY(1.05) scaleX(0.96); }
          58%     { transform: translateY(-50px) scaleY(1.05) scaleX(0.96); }
          90%     { transform: translateY(2px)   scaleY(0.86) scaleX(1.12); }
        }
        @keyframes mb-shake {
          0%,100% { transform: translateX(0)   rotate(0deg); }
          20%     { transform: translateX(-7px) rotate(-5deg); }
          60%     { transform: translateX(7px)  rotate(5deg); }
        }
        @keyframes mb-sleep {
          0%,100% { transform: translateY(0)  rotate(-5deg); }
          50%     { transform: translateY(4px) rotate(-5deg); }
        }
        @keyframes mb-scared {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-5px); }
        }
        @keyframes mb-wave {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-5px); }
        }
        @keyframes mb-bubble-pop {
          0%   { transform: scale(0.3) translateY(14px); opacity: 0; }
          60%  { transform: scale(1.07) translateY(-3px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes mb-zzz {
          0%   { opacity: 0; transform: translateY(0)     scale(0.4); }
          25%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-36px) scale(1.1); }
        }
        .mb-walking  { animation: mb-walk   0.48s ease-in-out infinite; transform-origin: bottom center; }
        .mb-jumping  { animation: mb-jump   0.68s ease-in-out infinite; transform-origin: bottom center; }
        .mb-angry    { animation: mb-shake  0.15s linear infinite;      transform-origin: center center; }
        .mb-scared   { animation: mb-scared 0.24s ease-in-out infinite; transform-origin: bottom center; }
        .mb-sleeping { animation: mb-sleep  2.4s  ease-in-out infinite; transform-origin: bottom center; }
        .mb-waving   { animation: mb-wave   0.52s ease-in-out infinite; transform-origin: bottom center; }
      `}</style>

      <div
        style={{
          position: "fixed",
          bottom: 58,
          left: posX,
          width: MINION_W,
          zIndex: 9998,
          cursor: "pointer",
          userSelect: "none",
          touchAction: "none",
          willChange: "left",
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {speech && <SpeechBubble text={speech.text} alignRight={speech.alignRight} />}

        {mState === "sleeping" && (
          <>
            <span style={{ position:"absolute", top:-30, left:52, fontSize:13, fontWeight:900, color:"#4A7CC7", animation:"mb-zzz 2.3s ease-in-out infinite", animationDelay:"0s",   pointerEvents:"none" }}>Z</span>
            <span style={{ position:"absolute", top:-48, left:60, fontSize:18, fontWeight:900, color:"#4A7CC7", animation:"mb-zzz 2.3s ease-in-out infinite", animationDelay:"0.7s", pointerEvents:"none" }}>Z</span>
            <span style={{ position:"absolute", top:-70, left:67, fontSize:23, fontWeight:900, color:"#4A7CC7", animation:"mb-zzz 2.3s ease-in-out infinite", animationDelay:"1.4s", pointerEvents:"none" }}>Z</span>
          </>
        )}

        <div className={`mb-${mState}`}>
          <MinionSVG state={mState} dir={dir} />
        </div>
      </div>
    </>
  );
}
