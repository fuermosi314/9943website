'use client';

import { useRef, useCallback } from 'react';

interface RotationButtonsProps {
  onRotate: (direction: 1 | -1, angleDeg?: number) => void;
  size?: 'sm' | 'md';
}

export default function RotationButtons({ onRotate, size = 'md' }: RotationButtonsProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const pendingDirection = useRef<1 | -1>(1);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, direction: 1 | -1) => {
    e.stopPropagation();
    cleanup();
    isLongPress.current = false;
    pendingDirection.current = direction;
    // After 300ms hold → start continuous rotation (no initial jump)
    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      intervalRef.current = setInterval(() => onRotate(direction, 3), 50);
    }, 300);
  }, [onRotate, cleanup]);

  const handlePointerUp = useCallback(() => {
    // Short tap → rotate 90°
    if (!isLongPress.current) {
      onRotate(pendingDirection.current);
    }
    cleanup();
  }, [onRotate, cleanup]);

  const btnSize = size === 'sm' ? 'w-10 h-10 text-lg' : 'w-12 h-12 text-xl';

  return (
    <div className="flex gap-2">
      <button
        onPointerDown={(e) => handlePointerDown(e, -1)}
        onPointerUp={handlePointerUp}
        onPointerLeave={cleanup}
        onPointerCancel={cleanup}
        className={`${btnSize} flex items-center justify-center rounded-full bg-[#1a1a2e]/90 border border-white/20 text-white/70 hover:text-white hover:border-[#fb6400]/50 transition-colors active:bg-[#fb6400]/20`}
        title="逆时针旋转"
      >
        ↺
      </button>
      <button
        onPointerDown={(e) => handlePointerDown(e, 1)}
        onPointerUp={handlePointerUp}
        onPointerLeave={cleanup}
        onPointerCancel={cleanup}
        className={`${btnSize} flex items-center justify-center rounded-full bg-[#1a1a2e]/90 border border-white/20 text-white/70 hover:text-white hover:border-[#fb6400]/50 transition-colors active:bg-[#fb6400]/20`}
        title="顺时针旋转"
      >
        ↻
      </button>
    </div>
  );
}
