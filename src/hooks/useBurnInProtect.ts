import { useEffect, useRef } from 'react';

const SHIFT_COORDS: [number, number][] = [
  [0, 0],
  [4, -3],
  [6, 0],
  [4, 3],
  [0, 5],
  [-4, 3],
  [-6, 0],
  [-4, -3],
];

export interface BurnInOptions {
  burnShift: boolean;
  nightDim: boolean;
  nightStartHour: number;
  nightEndHour: number;
}

export function useBurnInProtect(options: BurnInOptions): void {
  const stepRef = useRef<number>(0);
  const lastActiveRef = useRef<number>(Date.now());
  const optsRef = useRef<BurnInOptions>(options);
  optsRef.current = options;

  useEffect(() => {
    const applyProtection = (advanceShift: boolean) => {
      const cfg = optsRef.current;
      const root = document.documentElement.style;

      if (cfg.burnShift) {
        const [dx, dy] = SHIFT_COORDS[stepRef.current % SHIFT_COORDS.length];
        root.setProperty('--px', `${dx}px`);
        root.setProperty('--py', `${dy}px`);
        if (advanceShift) {
          stepRef.current += 1;
        }
      } else {
        root.setProperty('--px', '0px');
        root.setProperty('--py', '0px');
      }

      const hr = new Date().getHours();
      let isNight = false;
      if (cfg.nightDim) {
        if (cfg.nightStartHour > cfg.nightEndHour) {
          isNight = hr >= cfg.nightStartHour || hr < cfg.nightEndHour;
        } else if (cfg.nightStartHour < cfg.nightEndHour) {
          isNight = hr >= cfg.nightStartHour && hr < cfg.nightEndHour;
        }
      }

      const isIdle = Date.now() - lastActiveRef.current > 300000;
      const targetDim = isNight ? 0.35 : isIdle ? 0.9 : 1.0;
      root.setProperty('--dim', String(targetDim));
    };

    applyProtection(false);

    const onUserActivity = () => {
      lastActiveRef.current = Date.now();
      applyProtection(false);
    };

    const events: (keyof WindowEventMap)[] = ['touchstart', 'pointerdown', 'wheel', 'keydown'];
    events.forEach((ev) => {
      window.addEventListener(ev, onUserActivity, { passive: true });
    });

    const intervalId = window.setInterval(() => {
      applyProtection(true);
    }, 60000);

    return () => {
      events.forEach((ev) => {
        window.removeEventListener(ev, onUserActivity);
      });
      window.clearInterval(intervalId);
    };
  }, [options.burnShift, options.nightDim, options.nightStartHour, options.nightEndHour]);
}
