import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";

interface BannedScreenProps {
  user: {
    username?: string;
    banReason?: string | null;
    banAt?: number | null;
    banUntil?: number | null;
  };
}

export function BannedScreen({ user }: BannedScreenProps) {
  const { logout } = useAuth();
  const [visible, setVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleRef = useRef(0);

  const banDate = user.banAt ? new Date(user.banAt * 1000) : null;
  const banUntil = user.banUntil ? new Date(user.banUntil * 1000) : null;

  // Entrance animation sequence
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 80);
    const t2 = setTimeout(() => setCardVisible(true), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Ripple pulse on ban icon
  useEffect(() => {
    const interval = setInterval(() => {
      const id = rippleRef.current++;
      setRipples((prev) => [...prev, { id, x: 50, y: 50 }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1800);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=Inter:wght@400;500;600&display=swap');

        .banned-root {
          font-family: 'Inter', sans-serif;
          min-height: 100svh;
          background: #0a0a0a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 20px;
          position: relative;
          overflow: hidden;
        }

        /* Animated noise texture */
        .banned-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          pointer-events: none;
          opacity: 0.6;
          z-index: 0;
        }

        /* Radial blood glow */
        .banned-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -60%);
          width: 500px;
          height: 500px;
          background: radial-gradient(ellipse at center, rgba(220,30,30,0.18) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
          animation: glowPulse 4s ease-in-out infinite;
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -60%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -60%) scale(1.08); }
        }

        /* Scanlines */
        .banned-scanlines {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(255,255,255,0.012) 3px,
            rgba(255,255,255,0.012) 4px
          );
          pointer-events: none;
          z-index: 0;
        }

        .banned-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 360px;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1);
        }
        .banned-content.visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Icon area */
        .banned-icon-wrap {
          position: relative;
          width: 88px;
          height: 88px;
          margin-bottom: 28px;
        }
        .banned-icon-inner {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(220,30,30,0.25), rgba(120,0,0,0.3));
          border: 1.5px solid rgba(220,30,30,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          animation: iconBreath 3s ease-in-out infinite;
          box-shadow: 0 0 0 0 rgba(220,30,30,0.4), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        @keyframes iconBreath {
          0%, 100% { box-shadow: 0 0 24px rgba(220,30,30,0.2), inset 0 1px 0 rgba(255,255,255,0.06); }
          50% { box-shadow: 0 0 40px rgba(220,30,30,0.35), inset 0 1px 0 rgba(255,255,255,0.06); }
        }
        .banned-icon-svg {
          width: 40px;
          height: 40px;
          color: #dc1e1e;
          filter: drop-shadow(0 0 8px rgba(220,30,30,0.6));
          animation: iconPulse 3s ease-in-out infinite;
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 8px rgba(220,30,30,0.6)); }
          50% { transform: scale(1.06); filter: drop-shadow(0 0 14px rgba(220,30,30,0.9)); }
        }

        /* Ripple rings */
        .banned-ripple {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 88px;
          height: 88px;
          border-radius: 50%;
          border: 1.5px solid rgba(220,30,30,0.5);
          animation: rippleOut 1.8s ease-out forwards;
          pointer-events: none;
          z-index: 1;
        }
        @keyframes rippleOut {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
        }

        /* Title */
        .banned-title {
          font-family: 'Unbounded', sans-serif;
          font-size: 22px;
          font-weight: 900;
          color: #dc1e1e;
          letter-spacing: -0.02em;
          margin: 0 0 10px;
          text-align: center;
          text-shadow: 0 0 30px rgba(220,30,30,0.4);
          animation: titleGlitch 8s step-end infinite;
        }

        @keyframes titleGlitch {
          0%, 90%, 100% { clip-path: none; transform: none; }
          91% { clip-path: inset(30% 0 50% 0); transform: translateX(-4px); }
          92% { clip-path: inset(70% 0 10% 0); transform: translateX(4px); }
          93% { clip-path: none; transform: none; }
        }

        .banned-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.45);
          text-align: center;
          margin: 0 0 28px;
          line-height: 1.55;
        }
        .banned-subtitle b {
          color: rgba(255,255,255,0.75);
          font-weight: 600;
        }

        /* Info card */
        .banned-card {
          width: 100%;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(220,30,30,0.2);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          backdrop-filter: blur(12px);
          opacity: 0;
          transform: translateY(16px) scale(0.97);
          transition: opacity 0.6s cubic-bezier(.16,1,.3,1), transform 0.6s cubic-bezier(.16,1,.3,1);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 60px rgba(0,0,0,0.5);
          position: relative;
          overflow: hidden;
        }
        .banned-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(220,30,30,0.4), transparent);
        }
        .banned-card.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        .banned-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .banned-row-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
        }
        .banned-row-value {
          font-size: 15px;
          font-weight: 500;
          color: rgba(255,255,255,0.85);
        }
        .banned-row-value.permanent {
          color: #dc1e1e;
          font-weight: 600;
        }

        .banned-divider {
          height: 1px;
          background: rgba(255,255,255,0.06);
        }

        /* Footer */
        .banned-footer {
          margin-top: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          width: 100%;
        }
        .banned-support {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          text-align: center;
          line-height: 1.5;
        }

        .banned-logout-btn {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.4);
          font-size: 13px;
          font-family: 'Inter', sans-serif;
          padding: 10px 24px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          letter-spacing: 0.01em;
        }
        .banned-logout-btn:hover {
          border-color: rgba(220,30,30,0.4);
          color: rgba(220,30,30,0.8);
          background: rgba(220,30,30,0.06);
        }
        .banned-logout-btn:active {
          transform: scale(0.97);
        }

        /* Countdown ticker (if temp ban) */
        .banned-countdown {
          font-family: 'Unbounded', sans-serif;
          font-size: 11px;
          color: rgba(220,30,30,0.6);
          letter-spacing: 0.05em;
        }
      `}</style>

      <div className="banned-root">
        <div className="banned-glow" />
        <div className="banned-scanlines" />

        <div className={`banned-content ${visible ? "visible" : ""}`}>
          {/* Icon */}
          <div className="banned-icon-wrap">
            {ripples.map((r) => (
              <span key={r.id} className="banned-ripple" />
            ))}
            <div className="banned-icon-inner">
              <svg className="banned-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <h1 className="banned-title">Аккаунт заблокирован</h1>
          <p className="banned-subtitle">
            Ваш аккаунт <b>@{user.username ?? "unknown"}</b><br />
            заблокирован и доступ к платформе ограничен.
          </p>

          {/* Info card */}
          <div className={`banned-card ${cardVisible ? "visible" : ""}`}>
            {user.banReason && (
              <>
                <div className="banned-row">
                  <span className="banned-row-label">Причина</span>
                  <span className="banned-row-value">{user.banReason}</span>
                </div>
                <div className="banned-divider" />
              </>
            )}

            {banDate && (
              <>
                <div className="banned-row">
                  <span className="banned-row-label">Дата блокировки</span>
                  <span className="banned-row-value">
                    {banDate.toLocaleString("ru-RU", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit", second: "2-digit",
                    })}
                  </span>
                </div>
                <div className="banned-divider" />
              </>
            )}

            <div className="banned-row">
              <span className="banned-row-label">Срок</span>
              {banUntil ? (
                <span className="banned-row-value">
                  До {banUntil.toLocaleString("ru-RU", {
                    day: "2-digit", month: "2-digit", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              ) : (
                <span className="banned-row-value permanent">Бессрочно</span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="banned-footer">
            <p className="banned-support">
              Если вы считаете это ошибкой,<br />
              обратитесь в поддержку через Telegram.
            </p>
            <button className="banned-logout-btn" onClick={() => logout()}>
              Выйти из аккаунта
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
