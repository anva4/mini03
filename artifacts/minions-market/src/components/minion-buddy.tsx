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
  "/radio": "Музычка! Бипа-бипа-буп! 🎵",
};

const SCARED_LINES = [
  "Ааааа! Не трогай! 😱",
  "МАМА!!! 😨",
  "Стой! Я ещё не готов! 🙈",
  "Кто я?! Где я?! 😵",
  "БЕГУ-БЕГУ-БЕГУ! 🏃",
];

const ANGRY_LINES = [
  "ПАПА! ПАПА! 😤",
  "Я кусаюсь!!! 😡",
  "БАБАЛААА!!! 👿",
  "ОТПУСТИ!!! 🤬",
];

const MINION_W = 62;
const BASE_SPD = 85;   // px / second
const SCARED_SPD = 310; // px / second
const SLEEP_DELAY = 12000; // ms of idle before sleeping

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
//  SVG Minion face elements (eyes / brows / mouth)
// ─────────────────────────────────────────────
function MinionFace({ state }: { state: MinionState }) {
  if (state === "sleeping") return (
    <>
      <line x1="14" y1="26" x2="28" y2="26" stroke="#7B4B28" strokeWidth="3" strokeLinecap="round" />
      <line x1="34" y1="26" x2="48" y2="26" stroke="#7B4B28" strokeWidth="3" strokeLinecap="round" />
      <path d="M23 41 Q31 43 39 41" stroke="#555" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );

  if (state === "angry") return (
    <>
      <circle cx="21" cy="26" r="6.5" fill="#7B4B28" />
      <circle cx="21" cy="26" r="3.5" fill="#111" />
      <circle cx="19" cy="23" r="1.8" fill="white" />
      <circle cx="41" cy="26" r="6.5" fill="#7B4B28" />
      <circle cx="41" cy="26" r="3.5" fill="#111" />
      <circle cx="39" cy="23" r="1.8" fill="white" />
      {/* angry brows slanted inward */}
      <path d="M12 16 L27 21" stroke="#222" strokeWidth="3" strokeLinecap="round" />
      <path d="M35 21 L50 16" stroke="#222" strokeWidth="3" strokeLinecap="round" />
      {/* frown */}
      <path d="M20 43 Q31 38 42 43" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />
    </>
  );

  if (state === "scared") return (
    <>
      <circle cx="21" cy="26" r="9" fill="#7B4B28" />
      <circle cx="21" cy="26" r="5.5" fill="#111" />
      <circle cx="18" cy="22" r="2.5" fill="white" />
      <circle cx="41" cy="26" r="9" fill="#7B4B28" />
      <circle cx="41" cy="26" r="5.5" fill="#111" />
      <circle cx="38" cy="22" r="2.5" fill="white" />
      {/* open mouth O */}
      <ellipse cx="31" cy="43" rx="7" ry="5.5" fill="#111" />
    </>
  );

  // walking / waving / jumping – happy normal face
  const bigSmile = state === "waving" || state === "jumping";
  return (
    <>
      <circle cx="21" cy="26" r="6.5" fill="#7B4B28" />
      <circle cx="21" cy="26" r="3.5" fill="#111" />
      <circle cx="19" cy="23" r="1.8" fill="white" />
      <circle cx="41" cy="26" r="6.5" fill="#7B4B28" />
      <circle cx="41" cy="26" r="3.5" fill="#111" />
      <circle cx="39" cy="23" r="1.8" fill="white" />
      {bigSmile
        ? <path d="M19 40 Q31 51 43 40" stroke="#333" strokeWidth="2" fill="#FFB3B3" strokeLinecap="round" />
        : <path d="M21 40 Q31 47 41 40" stroke="#333" strokeWidth="2" fill="none" strokeLinecap="round" />}
    </>
  );
}

// ─────────────────────────────────────────────
//  SVG Minion body
// ─────────────────────────────────────────────
function MinionSVG({ state, dir }: { state: MinionState; dir: 1 | -1 }) {
  const waving = state === "waving";
  return (
    <svg
      width="62"
      height="88"
      viewBox="0 0 62 88"
      style={{ transform: dir === -1 ? "scaleX(-1)" : "none", overflow: "visible", display: "block" }}
    >
      {/* ── Shoes ── */}
      <ellipse cx="20" cy="86" rx="13" ry="5.5" fill="#111" />
      <ellipse cx="42" cy="86" rx="13" ry="5.5" fill="#111" />

      {/* ── Body ── */}
      <ellipse cx="31" cy="60" rx="21" ry="23" fill="#F5C518" />

      {/* ── Overalls lower ── */}
      <path d="M12 69 Q11 88 31 88 Q51 88 50 69 Z" fill="#4A7CC7" />

      {/* ── Overalls bib ── */}
      <rect x="21" y="52" width="20" height="20" rx="4" fill="#4A7CC7" />

      {/* ── G badge ── */}
      <circle cx="31" cy="66" r="5.5" fill="#3a6cb7" stroke="#6090d8" strokeWidth="1" />
      <text x="31" y="69.5" textAnchor="middle" fontSize="7" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold">G</text>

      {/* ── Straps ── */}
      <rect x="21" y="41" width="5" height="14" rx="2.5" fill="#4A7CC7" />
      <rect x="36" y="41" width="5" height="14" rx="2.5" fill="#4A7CC7" />

      {/* ── Left arm + glove ── */}
      <ellipse cx="9" cy="62" rx="6" ry="12.5" fill="#F5C518" transform="rotate(-10 9 62)" />
      <circle cx="7" cy="74.5" r="6.5" fill="#111" />

      {/* ── Right arm + glove (waving = raised) ── */}
      {waving ? (
        <>
          <ellipse cx="55" cy="49" rx="6" ry="12.5" fill="#F5C518" transform="rotate(-58 55 49)" />
          <circle cx="64" cy="41" r="6.5" fill="#111" />
        </>
      ) : (
        <>
          <ellipse cx="53" cy="62" rx="6" ry="12.5" fill="#F5C518" transform="rotate(10 53 62)" />
          <circle cx="55" cy="74.5" r="6.5" fill="#111" />
        </>
      )}

      {/* ── Head ── */}
      <ellipse cx="31" cy="28" rx="23" ry="26" fill="#F5C518" />

      {/* ── Goggle band ── */}
      <rect x="8" y="18" width="46" height="16" rx="8" fill="#6e6e6e" />

      {/* ── Goggle whites ── */}
      <circle cx="21" cy="26" r="11.5" fill="white" />
      <circle cx="21" cy="26" r="11.5" fill="none" stroke="#bbb" strokeWidth="1.5" />
      <circle cx="41" cy="26" r="11.5" fill="white" />
      <circle cx="41" cy="26" r="11.5" fill="none" stroke="#bbb" strokeWidth="1.5" />

      {/* ── Face ── */}
      <MinionFace state={state} />
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
      bottom: 96,
      ...(alignRight ? { right: 0 } : { left: 0 }),
      background: "white",
      border: "2.5px solid #F5C518",
      borderRadius: 16,
      padding: "8px 13px",
      fontSize: 12,
      fontWeight: 700,
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#222",
      whiteSpace: "nowrap",
      maxWidth: 200,
      boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
      zIndex: 10002,
      animation: "mb-bubble-pop 0.22s ease-out forwards",
      pointerEvents: "none",
      lineHeight: 1.4,
    }}>
      {text}
      {/* Tail outer */}
      <div style={{
        position: "absolute", bottom: -12,
        ...(alignRight ? { right: 18 } : { left: 18 }),
        width: 0, height: 0,
        borderLeft: "9px solid transparent",
        borderRight: "9px solid transparent",
        borderTop: "12px solid #F5C518",
      }} />
      {/* Tail inner */}
      <div style={{
        position: "absolute", bottom: -8,
        ...(alignRight ? { right: 21 } : { left: 21 }),
        width: 0, height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderTop: "9px solid white",
      }} />
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export function MinionBuddy() {
  const [hidden, setHidden] = useState(() => localStorage.getItem("minion_hidden") === "1");
  const [location] = useLocation();

  const [posX, setPosX] = useState(120);
  const [mState, setMState] = useState<MinionState>("walking");
  const [dir, setDir] = useState<1 | -1>(1);
  const [speech, setSpeech] = useState<{ text: string; alignRight: boolean } | null>(null);

  // mutable refs (not causing re-renders)
  const xRef = useRef(120);
  const dirRef = useRef<1 | -1>(1);
  const stateRef = useRef<MinionState>("walking");
  const speechTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const randomTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const scaredTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const prevLocRef = useRef(location);

  // ── Listen for external toggle (from settings) ──
  useEffect(() => {
    const onToggle = () => {
      const h = localStorage.getItem("minion_hidden") === "1";
      setHidden(h);
    };
    window.addEventListener("minion-visibility-change", onToggle);
    return () => window.removeEventListener("minion-visibility-change", onToggle);
  }, []);

  // ── Movement loop ──
  useEffect(() => {
    if (hidden) return;
    let lastTime = performance.now();
    let raf: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
      lastTime = now;

      const s = stateRef.current;
      if (s === "walking" || s === "scared") {
        const speed = s === "scared" ? SCARED_SPD : BASE_SPD;
        const maxX = window.innerWidth - MINION_W - 12;
        xRef.current += dirRef.current * speed * dt;

        if (xRef.current <= 4) {
          xRef.current = 4;
          dirRef.current = 1;
          setDir(1);
        } else if (xRef.current >= maxX) {
          xRef.current = maxX;
          dirRef.current = -1;
          setDir(-1);
        }
        setPosX(Math.round(xRef.current));
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hidden]);

  // ── Sleep timer ──
  const resetSleep = useCallback(() => {
    clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(() => {
      if (stateRef.current === "walking") {
        stateRef.current = "sleeping";
        setMState("sleeping");
      }
    }, SLEEP_DELAY);
  }, []);

  // ── Random actions (wave / jump) ──
  const scheduleRandom = useCallback(() => {
    clearTimeout(randomTimerRef.current);
    const delay = 4500 + Math.random() * 6500;
    randomTimerRef.current = setTimeout(() => {
      if (stateRef.current !== "walking") { scheduleRandom(); return; }
      const action: MinionState = Math.random() < 0.5 ? "waving" : "jumping";
      stateRef.current = action;
      setMState(action);
      setTimeout(() => {
        if (stateRef.current === action) {
          stateRef.current = "walking";
          setMState("walking");
        }
        scheduleRandom();
      }, 2200);
    }, delay);
  }, []);

  useEffect(() => {
    if (hidden) return;
    scheduleRandom();
    resetSleep();
    return () => {
      clearTimeout(randomTimerRef.current);
      clearTimeout(sleepTimerRef.current);
    };
  }, [hidden, scheduleRandom, resetSleep]);

  // ── Show speech helper ──
  const showSpeech = useCallback((text: string, ms = 3200) => {
    const alignRight = xRef.current > (window.innerWidth || 400) / 2;
    setSpeech({ text, alignRight });
    clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => setSpeech(null), ms);
  }, []);

  // ── Page change → speech bubble ──
  useEffect(() => {
    if (location === prevLocRef.current) return;
    prevLocRef.current = location;
    showSpeech(getPageMsg(location), 4500);
    resetSleep();
  }, [location, showSpeech, resetSleep]);

  // ── Welcome on first mount ──
  useEffect(() => {
    if (hidden) return;
    const timer = setTimeout(() => showSpeech(getPageMsg(location), 5000), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  // ── Pointer interactions ──
  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Wake from sleep
    if (stateRef.current === "sleeping") {
      stateRef.current = "walking";
      setMState("walking");
      showSpeech("Хм? Кто там? 😴", 2000);
      resetSleep();
      return;
    }

    // Start hold → angry timer
    holdTimerRef.current = setTimeout(() => {
      stateRef.current = "angry";
      setMState("angry");
      showSpeech(pickRandom(ANGRY_LINES), 2500);
    }, 620);
  }

  function handlePointerUp(e: React.PointerEvent) {
    e.preventDefault();
    clearTimeout(holdTimerRef.current);
    resetSleep();

    // Calm down from angry
    if (stateRef.current === "angry") {
      setTimeout(() => {
        if (stateRef.current === "angry") {
          stateRef.current = "walking";
          setMState("walking");
        }
      }, 900);
      return;
    }

    // Quick tap → scared
    if (stateRef.current === "sleeping") return; // handled in pointerDown

    stateRef.current = "scared";
    setMState("scared");
    // Run the opposite way
    dirRef.current = (-dirRef.current) as 1 | -1;
    setDir(dirRef.current);
    showSpeech(pickRandom(SCARED_LINES), 2600);

    clearTimeout(scaredTimerRef.current);
    scaredTimerRef.current = setTimeout(() => {
      if (stateRef.current === "scared") {
        stateRef.current = "walking";
        setMState("walking");
      }
    }, 2600);
  }

  if (hidden) return null;

  return (
    <>
      {/* ── Keyframe styles ── */}
      <style>{`
        @keyframes mb-walk {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25%       { transform: translateY(-5px) rotate(-1deg); }
          75%       { transform: translateY(-5px) rotate(1deg); }
        }
        @keyframes mb-jump {
          0%, 100%  { transform: translateY(0px) scaleY(1); }
          10%        { transform: translateY(0px) scaleY(0.85) scaleX(1.1); }
          40%        { transform: translateY(-44px) scaleY(1.05); }
          65%        { transform: translateY(-44px); }
          90%        { transform: translateY(0px) scaleY(0.88) scaleX(1.08); }
        }
        @keyframes mb-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          20%      { transform: translateX(-6px) rotate(-4deg); }
          60%      { transform: translateX(6px) rotate(4deg); }
        }
        @keyframes mb-sleep {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50%      { transform: translateY(4px) rotate(-6deg); }
        }
        @keyframes mb-scared {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes mb-wave {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes mb-bubble-pop {
          0%   { transform: scale(0.35) translateY(12px); opacity: 0; }
          65%  { transform: scale(1.06) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes mb-zzz {
          0%   { opacity: 0; transform: translateY(0) scale(0.4); }
          25%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-32px) scale(1.1); }
        }
        .mb-walking { animation: mb-walk  0.48s ease-in-out infinite; }
        .mb-jumping { animation: mb-jump  0.65s ease-in-out infinite; }
        .mb-angry   { animation: mb-shake 0.14s linear infinite; }
        .mb-scared  { animation: mb-scared 0.24s ease-in-out infinite; }
        .mb-sleeping{ animation: mb-sleep  2.2s ease-in-out infinite; }
        .mb-waving  { animation: mb-wave  0.55s ease-in-out infinite; }
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
        {/* Speech bubble */}
        {speech && <SpeechBubble text={speech.text} alignRight={speech.alignRight} />}

        {/* ZZZ floaters when sleeping */}
        {mState === "sleeping" && (
          <>
            <span style={{ position: "absolute", top: -28, left: 46, fontSize: 13, fontWeight: 900, color: "#4A7CC7", animation: "mb-zzz 2.2s ease-in-out infinite", animationDelay: "0s" }}>Z</span>
            <span style={{ position: "absolute", top: -44, left: 53, fontSize: 17, fontWeight: 900, color: "#4A7CC7", animation: "mb-zzz 2.2s ease-in-out infinite", animationDelay: "0.65s" }}>Z</span>
            <span style={{ position: "absolute", top: -64, left: 59, fontSize: 22, fontWeight: 900, color: "#4A7CC7", animation: "mb-zzz 2.2s ease-in-out infinite", animationDelay: "1.3s" }}>Z</span>
          </>
        )}

        {/* Minion body */}
        <div className={`mb-${mState}`} style={{ transformOrigin: "bottom center" }}>
          <MinionSVG state={mState} dir={dir} />
        </div>
      </div>
    </>
  );
}
