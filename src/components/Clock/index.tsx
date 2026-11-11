import React, { useEffect, useRef } from 'react';

export interface ClockProps {
  temp: number | null | undefined;
  statusOk: boolean;
  lastUpdated: number;
  onOpenSettings: () => void;
}

const pad = (n: number): string => String(n).padStart(2, '0');
const DAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface FlipUnitState {
  el: HTMLDivElement | null;
  spans: HTMLSpanElement[];
  timerId: number;
  val: string | undefined;
}

export const Clock: React.FC<ClockProps> = React.memo(
  ({ temp, statusOk, lastUpdated, onOpenSettings }) => {
    const hRef = useRef<HTMLDivElement>(null);
    const mRef = useRef<HTMLDivElement>(null);
    const sRef = useRef<HTMLDivElement>(null);
    const dateRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      const units: FlipUnitState[] = [hRef.current, mRef.current, sRef.current].map((el) => ({
        el,
        spans: el ? Array.from(el.querySelectorAll('span')) : [],
        timerId: 0,
        val: undefined,
      }));

      const lastVals = ['', '', ''];
      let lastDay = -1;
      let tickTimerId = 0;
      let unmounted = false;

      const fin = (u: FlipUnitState) => {
        if (!u.el) return;
        window.clearTimeout(u.timerId);
        if (u.spans[1] && u.val !== undefined) u.spans[1].textContent = u.val;
        if (u.spans[2] && u.val !== undefined) u.spans[2].textContent = u.val;
        u.el.classList.remove('go');
      };

      const put = (u: FlipUnitState, x: string) => {
        if (!u.el || !u.spans.length) return;
        if (u.val === undefined) {
          u.spans.forEach((sp) => {
            sp.textContent = x;
          });
          u.val = x;
          return;
        }
        if (u.el.classList.contains('go')) {
          fin(u);
        }
        if (u.spans[0]) u.spans[0].textContent = u.val;
        if (u.spans[3]) u.spans[3].textContent = u.val;
        u.val = x;
        u.el.classList.remove('go');
        void u.el.offsetWidth;
        u.el.classList.add('go');
        u.timerId = window.setTimeout(() => fin(u), 640);
      };

      const tick = () => {
        if (unmounted) return;
        try {
          const d = new Date();
          const v = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())];
          v.forEach((x, i) => {
            if (x !== lastVals[i]) {
              put(units[i], x);
              lastVals[i] = x;
            }
          });
          if (d.getDate() !== lastDay) {
            lastDay = d.getDate();
            if (dateRef.current) {
              dateRef.current.textContent = `${d.getFullYear()}年${
                d.getMonth() + 1
              }月${d.getDate()}日(${DAYS[d.getDay()]})`;
            }
          }
        } catch (err) {
          console.error('Clock tick error:', err);
        } finally {
          if (!unmounted) {
            const now = new Date();
            const delay = Math.max(200, 1000 - now.getMilliseconds());
            tickTimerId = window.setTimeout(tick, delay);
          }
        }
      };

      tick();

      return () => {
        unmounted = true;
        window.clearTimeout(tickTimerId);
        units.forEach((u) => window.clearTimeout(u.timerId));
      };
    }, []);

    const fmtStatusTime = (): string => {
      if (!lastUpdated) return '--:--';
      const d = new Date(lastUpdated);
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const tempText =
      temp != null && !isNaN(temp) ? `${Math.round(temp)}°C` : '';

    return (
      <section className="clock">
        <div className="flips">
          <div className="flip" id="h" ref={hRef}>
            <div className="u"><span>00</span></div>
            <div className="l"><span>00</span></div>
            <div className="fa"><span>00</span></div>
            <div className="fb"><span>00</span></div>
          </div>
          <div className="flip" id="m" ref={mRef}>
            <div className="u"><span>00</span></div>
            <div className="l"><span>00</span></div>
            <div className="fa"><span>00</span></div>
            <div className="fb"><span>00</span></div>
          </div>
          <div className="flip s" id="s" ref={sRef}>
            <div className="u"><span>00</span></div>
            <div className="l"><span>00</span></div>
            <div className="fa"><span>00</span></div>
            <div className="fb"><span>00</span></div>
          </div>
        </div>
        <div className="meta">
          <span id="date" ref={dateRef}></span>
          <span id="temp">{tempText}</span>
        </div>
        <div className="clock-foot">
          <button
            id="cfgBtn"
            aria-label="設定を開く"
            title="設定"
            onClick={onOpenSettings}
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3.2"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
          <div id="stat" className={statusOk ? '' : 'err'}>
            {statusOk ? `${fmtStatusTime()} 更新` : `${fmtStatusTime()} 更新試行中`}
          </div>
        </div>
      </section>
    );
  }
);
