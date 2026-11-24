import { useCallback, useEffect } from 'react';

interface VendorDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface VendorElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

const CURSOR_HIDE_DELAY_MS = 3000;

function isFullscreenActive(): boolean {
  const doc = document as VendorDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export function toggleFullscreen(): void {
  try {
    const doc = document as VendorDocument;
    const elem = doc.documentElement as VendorElement;
    const isFs = isFullscreenActive();
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

export function useFullscreen(drawerOpen = false): { toggleFullscreen: () => void } {
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

  // フルスクリーン時のマウスカーソル自動非表示（3秒無操作で非表示）
  useEffect(() => {
    let hideTimer: number | undefined;
    let listeningMouse = false;

    const clearHideTimer = () => {
      if (hideTimer !== undefined) {
        window.clearTimeout(hideTimer);
        hideTimer = undefined;
      }
    };

    const showCursorAndSchedule = () => {
      clearHideTimer();
      document.body.classList.remove('hide-cursor');
      if (
        isFullscreenActive() &&
        !drawerOpen &&
        !document.body.classList.contains('open')
      ) {
        hideTimer = window.setTimeout(() => {
          if (
            isFullscreenActive() &&
            !drawerOpen &&
            !document.body.classList.contains('open')
          ) {
            document.body.classList.add('hide-cursor');
          }
        }, CURSOR_HIDE_DELAY_MS);
      }
    };

    const attachMouseListeners = () => {
      if (listeningMouse) return;
      listeningMouse = true;
      window.addEventListener('mousemove', showCursorAndSchedule, { passive: true });
      window.addEventListener('mousedown', showCursorAndSchedule, { passive: true });
      window.addEventListener('wheel', showCursorAndSchedule, { passive: true });
    };

    const detachMouseListeners = () => {
      if (!listeningMouse) return;
      listeningMouse = false;
      window.removeEventListener('mousemove', showCursorAndSchedule);
      window.removeEventListener('mousedown', showCursorAndSchedule);
      window.removeEventListener('wheel', showCursorAndSchedule);
    };

    const syncFullscreenCursorState = () => {
      if (isFullscreenActive()) {
        attachMouseListeners();
        showCursorAndSchedule();
      } else {
        detachMouseListeners();
        clearHideTimer();
        document.body.classList.remove('hide-cursor');
      }
    };

    syncFullscreenCursorState();

    document.addEventListener('fullscreenchange', syncFullscreenCursorState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenCursorState);

    return () => {
      detachMouseListeners();
      clearHideTimer();
      document.body.classList.remove('hide-cursor');
      document.removeEventListener('fullscreenchange', syncFullscreenCursorState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenCursorState);
    };
  }, [drawerOpen]);

  const toggle = useCallback(() => {
    toggleFullscreen();
  }, []);

  return { toggleFullscreen: toggle };
}
