import { useState, useRef, useCallback, useEffect } from "react";
import { Check, ChevronRight } from "lucide-react";

interface SwipeButtonProps {
  onConfirm: () => void;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

export function SwipeButton({ onConfirm, label, disabled, loading, loadingLabel }: SwipeButtonProps) {
  const [offset, setOffset] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const THUMB_SIZE = 56;
  const PADDING = 4;

  const getMax = () => (trackRef.current?.clientWidth ?? 300) - THUMB_SIZE - PADDING * 2;
  const getProgress = () => Math.min(offset / Math.max(getMax(), 1), 1);

  useEffect(() => {
    if (!loading && confirmed) {
      const t = setTimeout(() => {
        setConfirmed(false);
        setOffset(0);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [loading, confirmed]);

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
      const newOffset = Math.min(Math.max(e.clientX - startXRef.current!, 0), max);
      setOffset(newOffset);
    });
  }, []);

  const onPointerUp = useCallback(() => {
    if (startXRef.current === null) return;
    startXRef.current = null;
    setIsDragging(false);
    const max = getMax();
    if (offset >= max * 0.82) {
      setOffset(max);
      setConfirmed(true);
      setTimeout(() => onConfirm(), 350);
    } else {
      setOffset(0);
    }
  }, [offset, onConfirm]);

  const progress = getProgress();

  const trackBg = confirmed
    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
    : `linear-gradient(135deg,
        hsl(${217 + progress * 60}, ${80 - progress * 10}%, ${35 + progress * 8}%) 0%,
        hsl(${200 + progress * 80}, 85%, ${45 + progress * 10}%) 100%)`;

  const thumbBg = confirmed
    ? "linear-gradient(135deg, #10b981, #34d399)"
    : `linear-gradient(135deg,
        hsl(${210 + progress * 70}, 90%, ${55 + progress * 15}%),
        hsl(${190 + progress * 90}, 85%, ${60 + progress * 12}%))`;

  return (
    <div
      ref={trackRef}
      className="relative w-full select-none overflow-hidden"
      style={{
        height: 64,
        borderRadius: 20,
        background: disabled
          ? "linear-gradient(135deg, #1e293b, #0f172a)"
          : trackBg,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "default",
        transition: isDragging ? "none" : "background 0.4s ease",
        boxShadow: confirmed
          ? "0 0 32px rgba(16,185,129,0.4), 0 4px 24px rgba(0,0,0,0.3)"
          : `0 0 ${24 + progress * 24}px rgba(59,130,246,${0.15 + progress * 0.35}), 0 4px 20px rgba(0,0,0,0.25)`,
      }}
    >
      {/* Shimmer */}
      {!confirmed && !loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: isDragging ? "none" : "sb-shimmer 2.5s infinite",
            borderRadius: "inherit",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Trail glow */}
      {offset > 0 && !confirmed && (
        <div
          style={{
            position: "absolute",
            top: PADDING,
            bottom: PADDING,
            left: PADDING,
            width: offset + THUMB_SIZE * 0.5,
            background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.12))",
            borderRadius: 16,
            pointerEvents: "none",
            transition: isDragging ? "none" : "width 0.3s ease",
          }}
        />
      )}

      {/* Label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(255,255,255,0.9)",
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: "0.02em",
          pointerEvents: "none",
          opacity: loading ? 0 : Math.max(0, 1 - progress * 1.4),
          transition: "opacity 0.2s ease",
          paddingLeft: THUMB_SIZE + PADDING * 2,
        }}
      >
        {label}
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.9)",
                  animation: "sb-pulse 1.2s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
          {loadingLabel && (
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: 500 }}>
              {loadingLabel}
            </span>
          )}
        </div>
      )}

      {/* Thumb */}
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
          borderRadius: 16,
          background: thumbBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: disabled ? "not-allowed" : isDragging ? "grabbing" : "grab",
          transition: isDragging ? "none" : "left 0.35s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease, box-shadow 0.3s ease",
          boxShadow: confirmed
            ? "0 0 20px rgba(16,185,129,0.6), 0 2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)"
            : `0 0 ${12 + progress * 16}px rgba(99,179,237,${0.4 + progress * 0.4}), 0 2px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)`,
          zIndex: 10,
          touchAction: "none",
          userSelect: "none",
          willChange: "left",
        }}
      >
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {confirmed ? (
            <Check
              style={{
                width: 22,
                height: 22,
                color: "white",
                animation: "sb-popin 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              }}
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center" }}>
              <ChevronRight
                style={{
                  width: 18,
                  height: 18,
                  color: "rgba(255,255,255,0.5)",
                  animation: isDragging ? "none" : "sb-nudge 1.8s ease-in-out infinite",
                  animationDelay: "0.15s",
                  transform: "translateX(-4px)",
                }}
              />
              <ChevronRight
                style={{
                  width: 22,
                  height: 22,
                  color: "white",
                  animation: isDragging ? "none" : "sb-nudge 1.8s ease-in-out infinite",
                }}
              />
            </div>
          )}
        </div>
        {/* Inner gloss */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            background: "linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 55%)",
            pointerEvents: "none",
          }}
        />
      </div>

      <style>{`
        @keyframes sb-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes sb-nudge {
          0%, 100% { transform: translateX(0); opacity: 1; }
          45% { transform: translateX(5px); opacity: 0.6; }
          65% { transform: translateX(2px); opacity: 0.85; }
        }
        @keyframes sb-pulse {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes sb-popin {
          0% { transform: scale(0.2) rotate(-30deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
