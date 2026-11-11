import { useCallback, useEffect } from 'react';

interface VendorDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface VendorElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

export function toggleFullscreen(): void {
  try {
    const doc = document as VendorDocument;
    const elem = doc.documentElement as VendorElement;
    const isFs = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (!isFs) {
      const req = elem.requestFullscreen || elem.webkitRequestFullscreen;
      if (req) Promise.resolve(req.call(elem)).catch(() => {});
    } else {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (exit) Promise.resolve(exit.call(doc)).catch(() => {});
    }
  } catch (_) {
    // ignore fullscreen errors
  }
}

export function useFullscreen(): { toggleFullscreen: () => void } {
  useEffect(() => {
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    const handleTouchEnd = (e: TouchEvent) => {
      if (document.body.classList.contains('open')) return;
      const target = e.target as Element | null;
      if (target?.closest('button, input, select, label, #drawer, #dots')) return;
      if (e.changedTouches.length !== 1) return;

      const now = Date.now();
      const t = e.changedTouches[0];
      const dt = now - lastTapTime;
      const dist = Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY);

      if (dt > 40 && dt < 320 && dist < 45) {
        e.preventDefault();
        toggleFullscreen();
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastTapX = t.clientX;
        lastTapY = t.clientY;
      }
    };

    const handleDblClick = (e: MouseEvent) => {
      if (document.body.classList.contains('open')) return;
      const target = e.target as Element | null;
      if (target?.closest('button, input, select, label, #drawer, #dots')) return;
      toggleFullscreen();
    };

    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('dblclick', handleDblClick);

    return () => {
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('dblclick', handleDblClick);
    };
  }, []);

  const toggle = useCallback(() => {
    toggleFullscreen();
  }, []);

  return { toggleFullscreen: toggle };
}
