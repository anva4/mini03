import { useState, useRef, useCallback } from "react";
import { Check, ArrowRight } from "lucide-react";

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
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number | null>(null);
  const THUMB_SIZE = 52;

  const getTrackWidth = () => trackRef.current?.clientWidth ?? 300;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || loading || confirmed) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startXRef.current = e.clientX;
  }, [disabled, loading, confirmed]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (startXRef.current === null) return;
    const max = getTrackWidth() - THUMB_SIZE - 8;
    const delta = Math.min(Math.max(e.clientX - startXRef.current, 0), max);
    setOffset(delta);
  }, []);

  const onPointerUp = useCallback(() => {
    if (startXRef.current === null) return;
    startXRef.current = null;
    const max = getTrackWidth() - THUMB_SIZE - 8;
    if (offset >= max * 0.85) {
      setOffset(max);
      setConfirmed(true);
      setTimeout(() => {
        onConfirm();
        setTimeout(() => {
          setOffset(0);
          setConfirmed(false);
        }, 600);
      }, 300);
    } else {
      setOffset(0);
    }
  }, [offset, onConfirm]);

  const progress = Math.min(offset / Math.max(getTrackWidth() - THUMB_SIZE - 8, 1), 1);

  return (
    <div
      ref={trackRef}
      className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{
        height: 60,
        background: disabled ? "#334155" : "#1e3a5f",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "default",
      }}
    >
      {/* Fill */}
      <div
        className="absolute inset-y-0 left-0 rounded-2xl transition-colors"
        style={{
          width: `${THUMB_SIZE + 8 + offset}px`,
          background: confirmed ? "#22c55e" : `rgba(59, 130, 246, ${0.3 + progress * 0.5})`,
          transition: startXRef.current ? "none" : "width 0.25s ease, background 0.3s",
        }}
      />

      {/* Label */}
      <div
        className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm pointer-events-none"
        style={{ opacity: loading ? 0 : 1 - progress * 0.8 }}
      >
        {label}
      </div>

      {/* Loading dots */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center gap-1 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-white animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
          {loadingLabel && <span className="text-white text-sm ml-2">{loadingLabel}</span>}
        </div>
      )}

      {/* Thumb */}
      <div
        className="absolute top-1 bottom-1 rounded-xl flex items-center justify-center shadow-lg z-10 touch-none"
        style={{
          left: 4 + offset,
          width: THUMB_SIZE,
          background: confirmed ? "#22c55e" : "#3b82f6",
          transition: startXRef.current ? "none" : "left 0.25s ease, background 0.3s",
          cursor: disabled ? "not-allowed" : "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {confirmed
          ? <Check className="w-5 h-5 text-white" />
          : <ArrowRight className="w-5 h-5 text-white" />
        }
      </div>
    </div>
  );
}
