import { useState, useRef, useCallback, useEffect } from "react";
import { Check } from "lucide-react";

interface SwipeButtonProps {
  onConfirm: () => void;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export function SwipeButton({ onConfirm, label, disabled, loading, loadingLabel }: SwipeButtonProps) {
  const [offset, setOffset] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ripples, setRipples] = useState<{ id: number; x: number }[]>([]);

  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startXRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particleAnimRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rippleIdRef = useRef(0);

  const THUMB_SIZE = 58;
  const PADDING = 5;
  const MAGNETIC_ZONE = 48; // px from end where magnet kicks in

  const getMax = useCallback(() =>
    (trackRef.current?.clientWidth ?? 300) - THUMB_SIZE - PADDING * 2, []);

  const applyMagnet = useCallback((raw: number) => {
    const max = getMax();
    const distFromEnd = max - raw;
    if (distFromEnd < MAGNETIC_ZONE && distFromEnd > 0) {
      const pull = 1 - distFromEnd / MAGNETIC_ZONE;
      return raw + distFromEnd * pull * 0.7;
    }
    return raw;
  }, [getMax]);

  const getProgress = useCallback(() =>
    Math.min(offset / Math.max(getMax(), 1), 1), [offset, getMax]);

  // Particle system on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.vx *= 0.97;
        p.life -= 1;

        const alpha = p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        // Mix of dots and sparks
        if (p.id % 3 === 0) {
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.atan2(p.vy, p.vx));
          ctx.fillRect(-p.size * 2 * alpha, -p.size * 0.5, p.size * 4, p.size);
          ctx.restore();
        }
        ctx.fill();
        ctx.restore();
      });

      particleAnimRef.current = requestAnimationFrame(animate);
    };

    particleAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (particleAnimRef.current) cancelAnimationFrame(particleAnimRef.current);
    };
  }, []);

  const spawnParticles = useCallback((thumbX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = thumbX + THUMB_SIZE / 2;
    const cy = canvas.height / 2;

    const colors = [
      "#60a5fa", "#34d399", "#a78bfa", "#f472b6",
      "#fbbf24", "#38bdf8", "#4ade80", "#c084fc",
    ];

    const newParticles: Particle[] = Array.from({ length: 52 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 52 + (Math.random() - 0.5) * 0.4;
      const speed = 2.5 + Math.random() * 5;
      return {
        id: i,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 1.5 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 35 + Math.random() * 25,
        maxLife: 60,
      };
    });

    particlesRef.current = [...particlesRef.current, ...newParticles];
  }, []);

  // Reset after loading
  useEffect(() => {
    if (!loading && confirmed) {
      const t = setTimeout(() => {
        setConfirmed(false);
        setOffset(0);
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [loading, confirmed]);

  // Ripple on drag
  useEffect(() => {
    if (isDragging && offset > 10) {
      const id = ++rippleIdRef.current;
      setRipples(r => [...r.slice(-2), { id, x: offset }]);
      const t = setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 600);
      return () => clearTimeout(t);
    }
  }, [Math.round(offset / 20)]); // trigger every 20px

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || loading || confirmed) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startXRef.current = e.clientX - offset;
    setIsDragging(true);
  }, [disabled, loading, confirmed, offset]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startXRef.current === null) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      const max = getMax();
      const raw = Math.min(Math.max(e.clientX - startXRef.current!, 0), max);
      setOffset(applyMagnet(raw));
    });
  }, [getMax, applyMagnet]);

  const onPointerUp = useCallback(() => {
    if (startXRef.current === null) return;
    startXRef.current = null;
    setIsDragging(false);
    const max = getMax();
    if (offset >= max * 0.78) {
      setOffset(max);
      setConfirmed(true);
      spawnParticles(max + PADDING);
      setTimeout(() => onConfirm(), 400);
    } else {
      setOffset(0);
    }
  }, [offset, getMax, onConfirm, spawnParticles]);

  const progress = getProgress();

  // Color interpolation: deep blue → electric blue → cyan → emerald
  const hue = 220 + progress * 140;
  const sat = 80 + progress * 10;
  const lit = 38 + progress * 12;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Canvas for particles */}
      <canvas
        ref={canvasRef}
        width={trackRef.current?.clientWidth ?? 340}
        height={64}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 20,
          borderRadius: 22,
        }}
      />

      <div
        ref={trackRef}
        className="relative w-full select-none"
        style={{
          height: 64,
          borderRadius: 22,
          background: disabled
            ? "rgba(15,23,42,0.8)"
            : confirmed
            ? "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)"
            : `linear-gradient(135deg,
                hsl(${220 + progress * 30}, 70%, 18%) 0%,
                hsl(${210 + progress * 60}, 75%, 22%) 50%,
                hsl(${200 + progress * 100}, 80%, 28%) 100%)`,
          opacity: disabled ? 0.4 : 1,
          cursor: disabled ? "not-allowed" : "default",
          transition: isDragging ? "none" : "background 0.5s ease",
          // Outer glow
          boxShadow: confirmed
            ? "0 0 40px rgba(16,185,129,0.5), 0 0 80px rgba(16,185,129,0.2), 0 6px 30px rgba(0,0,0,0.4)"
            : `0 0 ${20 + progress * 40}px rgba(${96 - progress * 30},${130 + progress * 80},${246 - progress * 80},${0.2 + progress * 0.45}), 0 6px 28px rgba(0,0,0,0.35)`,
          // Glass border
          border: `1px solid rgba(255,255,255,${0.06 + progress * 0.08})`,
          overflow: "hidden",
        }}
      >
        {/* Animated background grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.02) 40px,
              rgba(255,255,255,0.02) 41px
            )`,
            pointerEvents: "none",
            opacity: 1 - progress * 0.8,
          }}
        />

        {/* Moving light beam */}
        {!confirmed && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "-100%",
              width: "60%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
              animation: isDragging ? "none" : "sb-beam 3s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Progress fill with glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: `${PADDING + offset + THUMB_SIZE * 0.6}px`,
            background: confirmed
              ? "linear-gradient(90deg, rgba(16,185,129,0.25), rgba(52,211,153,0.15))"
              : `linear-gradient(90deg,
                  rgba(${37 + progress * 20},${99 + progress * 100},${235 - progress * 80},0.3),
                  rgba(${56 + progress * 30},${189 + progress * 50},${248 - progress * 100},0.15))`,
            transition: isDragging ? "none" : "width 0.3s ease, background 0.4s ease",
            pointerEvents: "none",
          }}
        />

        {/* Ripple waves */}
        {ripples.map(r => (
          <div
            key={r.id}
            style={{
              position: "absolute",
              top: "50%",
              left: PADDING + r.x + THUMB_SIZE / 2,
              transform: "translate(-50%, -50%)",
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: `1.5px solid rgba(147,197,253,0.6)`,
              animation: "sb-ripple 0.6s ease-out forwards",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Label */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: confirmed ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)",
            fontWeight: 600,
            fontSize: 15,
            letterSpacing: "0.04em",
            pointerEvents: "none",
            opacity: loading ? 0 : confirmed ? 1 : Math.max(0, 1 - progress * 1.5),
            transition: "opacity 0.25s ease",
            paddingLeft: confirmed ? 0 : THUMB_SIZE + PADDING * 2 + 8,
            textShadow: "0 1px 8px rgba(0,0,0,0.5)",
          }}
        >
          {confirmed ? (
            <span style={{ animation: "sb-fadein 0.4s ease" }}>✓ Подтверждено</span>
          ) : label}
        </div>

        {/* Loading dots */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            pointerEvents: "none",
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "rgba(255,255,255,0.9)",
                animation: "sb-pulse 1.3s ease-in-out infinite",
                animationDelay: `${i * 0.18}s`,
              }} />
            ))}
            {loadingLabel && (
              <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: 500, marginLeft: 4 }}>
                {loadingLabel}
              </span>
            )}
          </div>
        )}

        {/* ── THUMB ── */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: "absolute",
            top: PADDING,
            bottom: PADDING,
            left: PADDING + offset,
            width: THUMB_SIZE,
            borderRadius: 17,
            // Glassmorphism
            background: confirmed
              ? "linear-gradient(145deg, rgba(52,211,153,0.9), rgba(16,185,129,0.95))"
              : `linear-gradient(145deg,
                  rgba(${100 + progress * 40},${160 + progress * 60},${255 - progress * 60},0.92),
                  rgba(${56 + progress * 50},${120 + progress * 80},${246 - progress * 60},0.85))`,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: `1px solid rgba(255,255,255,${0.2 + progress * 0.15})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: disabled ? "not-allowed" : isDragging ? "grabbing" : "grab",
            transition: isDragging
              ? "background 0.15s ease, box-shadow 0.15s ease"
              : "left 0.4s cubic-bezier(0.34,1.56,0.64,1), background 0.35s ease, box-shadow 0.3s ease",
            boxShadow: confirmed
              ? `0 0 30px rgba(52,211,153,0.7), 0 0 60px rgba(16,185,129,0.3), 0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.4)`
              : `0 0 ${16 + progress * 24}px rgba(${96},${165 + progress * 60},${250 - progress * 60},${0.5 + progress * 0.35}),
                 0 0 ${32 + progress * 48}px rgba(${59},${130 + progress * 80},${246 - progress * 80},${0.15 + progress * 0.2}),
                 0 4px 14px rgba(0,0,0,0.4),
                 inset 0 1px 0 rgba(255,255,255,0.3)`,
            zIndex: 10,
            touchAction: "none",
            userSelect: "none",
            willChange: "left, box-shadow",
            // Scale on drag
            transform: isDragging ? "scaleY(0.93)" : "scaleY(1)",
          }}
        >
          {/* Gloss top reflection */}
          <div style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: "45%",
            borderRadius: "17px 17px 50% 50%",
            background: "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, transparent 100%)",
            pointerEvents: "none",
          }} />

          {/* Icon */}
          {confirmed ? (
            <Check style={{
              width: 23, height: 23, color: "white",
              filter: "drop-shadow(0 0 6px rgba(255,255,255,0.8))",
              animation: "sb-popin 0.35s cubic-bezier(0.34,1.8,0.64,1)",
            }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              {/* Animated arrows */}
              {[0, 1].map(i => (
                <svg key={i} width={i === 0 ? 14 : 18} height={i === 0 ? 14 : 18}
                  viewBox="0 0 24 24" fill="none"
                  style={{
                    color: i === 0 ? "rgba(255,255,255,0.45)" : "white",
                    animation: isDragging ? "none" : `sb-arrow 1.6s ease-in-out infinite`,
                    animationDelay: `${i * 0.18}s`,
                    filter: i === 1 ? "drop-shadow(0 0 4px rgba(255,255,255,0.6))" : "none",
                    marginLeft: i === 0 ? 0 : -4,
                  }}>
                  <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth={2.5}
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ))}
            </div>
          )}
        </div>

        {/* Track end hint dots */}
        {!confirmed && progress < 0.7 && (
          <div style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            gap: 3,
            pointerEvents: "none",
            opacity: Math.max(0, 0.5 - progress * 1.2),
            transition: "opacity 0.3s",
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 4, height: 4, borderRadius: "50%",
                background: "rgba(255,255,255,0.3)",
                animation: `sb-dot 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.25}s`,
              }} />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes sb-beam {
          0% { left: -100%; }
          60%, 100% { left: 200%; }
        }
        @keyframes sb-arrow {
          0%, 100% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(5px); opacity: 0.5; }
        }
        @keyframes sb-ripple {
          0% { width: 20px; height: 20px; opacity: 0.8; }
          100% { width: 80px; height: 80px; opacity: 0; }
        }
        @keyframes sb-popin {
          0% { transform: scale(0.1) rotate(-40deg); opacity: 0; }
          70% { transform: scale(1.2) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes sb-pulse {
          0%, 80%, 100% { transform: scale(0.45); opacity: 0.25; }
          40% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes sb-dot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
        @keyframes sb-fadein {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
