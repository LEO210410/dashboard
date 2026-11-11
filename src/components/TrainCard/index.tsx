import React, { useCallback, useEffect, useRef } from 'react';
import { RAILWAY_CATALOG } from '../../config/railwayCatalog';
import { TrainStatusItem } from '../../services/trainService';

export interface TrainCardProps {
  items: TrainStatusItem[];
}

const StatusBadge: React.FC<{ statusText: string }> = ({ statusText }) => {
  const isWarn = statusText.includes('遅延') || statusText.includes('遅れ');
  const isBad = statusText.includes('見合わせ') || statusText.includes('運休');
  const isInfo = statusText.includes('計画') || statusText.includes('情報');

  if (isBad) {
    return (
      <span className="train-status bad">
        <svg viewBox="0 0 24 24">
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {statusText}
      </span>
    );
  }
  if (isWarn) {
    return (
      <span className="train-status warm">
        <svg viewBox="0 0 24 24">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" />
        </svg>
        {statusText}
      </span>
    );
  }
  if (isInfo) {
    return (
      <span className="train-status info">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        {statusText}
      </span>
    );
  }
  return (
    <span className="train-status">
      <svg viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      平常運転
    </span>
  );
};

export const TrainCard: React.FC<TrainCardProps> = React.memo(
  ({ items }) => {
    const listRef = useRef<HTMLDivElement>(null);

    const checkMarquee = useCallback(() => {
      const container = listRef.current;
      if (!container) return;
      container.querySelectorAll<HTMLDivElement>('.train-detail-box').forEach((box) => {
        const content = box.querySelector<HTMLSpanElement>('.train-detail-content');
        if (!content) return;
        const overflow = content.scrollWidth - box.clientWidth;
        if (overflow > 4) {
          box.classList.add('marquee');
          box.style.setProperty('--scroll-dist', `${overflow + 14}px`);
          const dur = Math.max(6, Math.round(overflow / 30) + 4);
          box.style.setProperty('--duration', `${dur}s`);
        } else {
          box.classList.remove('marquee');
          box.style.removeProperty('--scroll-dist');
          box.style.removeProperty('--duration');
        }
      });
    }, []);

    useEffect(() => {
      const timerId = window.setTimeout(checkMarquee, 100);
      window.addEventListener('resize', checkMarquee);
      return () => {
        window.clearTimeout(timerId);
        window.removeEventListener('resize', checkMarquee);
      };
    }, [items, checkMarquee]);

    if (!items || !items.length) {
      return (
        <div className="empty">
          表示する路線が選択されていません（設定から選択してください）
        </div>
      );
    }

    return (
      <div className="train-list" ref={listRef}>
        {items.map((item) => {
          const cat = RAILWAY_CATALOG.find((x) => x.id === item.id);
          const svgFile = cat?.file || item.file || '';
          const statusText =
            item.statusText || (item.delay ? '列車遅延' : '平常運転');
          const isBad =
            statusText.includes('見合わせ') || statusText.includes('運休');
          const isWarn =
            statusText.includes('遅延') || statusText.includes('遅れ');
          const rowCls = item.delay ? (isBad ? 'delay' : isWarn ? 'warn' : '') : '';

          return (
            <div
              key={item.id}
              className={`train-item glass-item ${rowCls}`.trim()}
            >
              <div className="train-main-row">
                <img
                  className="line-icon-svg"
                  src={`icon/${encodeURI(svgFile)}`}
                  alt={item.name}
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.r) {
                      img.dataset.r = '1';
                      img.src = `icons/${encodeURI(svgFile)}`;
                    }
                  }}
                />
                <div className="train-info-col">
                  <div className="train-name">{item.name}</div>
                  <div className="train-comp">{item.company || ''}</div>
                </div>
                <StatusBadge statusText={statusText} />
              </div>
              {item.detail ? (
                <div className="train-detail-box">
                  <span className="train-detail-content">{item.detail}</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  },
  (prev, next) => JSON.stringify(prev.items) === JSON.stringify(next.items)
);
