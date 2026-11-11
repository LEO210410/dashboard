import { useEffect } from 'react';

export function useWakeLock(): void {
  useEffect(() => {
    let wl: WakeLockSentinel | null = null;
    let mounted = true;

    const requestLock = async () => {
      try {
        if (!mounted || !('wakeLock' in navigator) || wl) return;
        wl = await navigator.wakeLock.request('screen');
        wl.addEventListener('release', () => {
          wl = null;
        });
      } catch (_) {
        wl = null;
      }
    };

    requestLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wl) {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wl) {
        wl.release().catch(() => {});
        wl = null;
      }
    };
  }, []);
}
