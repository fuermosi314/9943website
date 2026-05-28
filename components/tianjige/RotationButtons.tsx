'use client';

import { useRef, useCallback } from 'react';

interface RotationButtonsProps {
  onRotate: (direction: 1 | -1, angleDeg?: number) => void;
  size?: 'sm' | 'md';
}

export default function RotationButtons({ onRotate, size = 'md' }: RotationButtonsProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);
  const isLongPress = useRef(false);
  const pendingDirection = useRef<1 | -1>(1);
  const lastTimeRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    lastTimeRef.current = 0;
  }, []);

  const startContinuous = useCallback((direction: 1 | -1) => {
    const speed = 120; // degrees per second
    const tick = (now: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const angle = speed * dt;
      onRotate(direction, angle);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [onRotate]);

  const handlePointerDown = useCallback((e: React.PointerEvent, direction: 1 | -1) => {
    e.stopPropagation();
    cleanup();
    isLongPress.current = false;
    pendingDirection.current = direction;
    lastTimeRef.current = 0;
    timeoutRef.current = setTimeout(() => {
      isLongPress.current = true;
      startContinuous(direction);
    }, 300);
  }, [cleanup, startContinuous]);

  const handlePointerUp = useCallback(() => {
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
