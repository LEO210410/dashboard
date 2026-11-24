import React, { useCallback, useEffect, useRef } from 'react';
import { TrainMarqueeMode } from '../../config/appConfig';
import { RAILWAY_CATALOG } from '../../config/railwayCatalog';
import { TrainStatusItem } from '../../services/trainService';

export interface TrainCardProps {
  items: TrainStatusItem[];
  marqueeMode?: TrainMarqueeMode;
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
  ({ items, marqueeMode = 'oneway' }) => {
    const listRef = useRef<HTMLDivElement>(null);

    const checkMarquee = useCallback(() => {
      const container = listRef.current;
      if (!container) return;
      container.querySelectorAll<HTMLDivElement>('.train-detail-box').forEach((box) => {
        const content = box.querySelector<HTMLSpanElement>(
          '.train-detail-content:not(.train-detail-clone)'
        );
        if (!content) return;

        const contentStyle = window.getComputedStyle(content);
        const padRight = parseFloat(contentStyle.paddingRight) || 0;
        const textWidth = content.scrollWidth - padRight;

        const boxStyle = window.getComputedStyle(box);
        const padLeftBox = parseFloat(boxStyle.paddingLeft) || 0;
        const padRightBox = parseFloat(boxStyle.paddingRight) || 0;
        const boxInnerWidth = box.clientWidth - padLeftBox - padRightBox;

        if (textWidth > boxInnerWidth + 2) {
          if (!box.classList.contains('marquee')) {
            box.classList.add('marquee');
          }
          const boxWVal = `${Math.round(boxInnerWidth + padRightBox)}px`;
          if (box.style.getPropertyValue('--box-w') !== boxWVal) {
            box.style.setProperty('--box-w', boxWVal);
          }

          let durSec = 10;
          if (marqueeMode === 'oneway') {
            durSec = Math.max(7, Math.round(((box.clientWidth + textWidth) / 65) * 10) / 10);
          } else if (marqueeMode === 'pause-scroll') {
            durSec = Math.min(14, Math.max(10, Math.round((textWidth / 85 + 2.5) * 10) / 10));
          } else {
            const fontSize = parseFloat(contentStyle.fontSize) || 14;
            const unitDist = textWidth + fontSize * 3;
            durSec = Math.max(7, Math.round((unitDist / 65) * 10) / 10);
          }

          const durVal = `${durSec}s`;
          if (box.style.getPropertyValue('--duration') !== durVal) {
            box.style.setProperty('--duration', durVal);
          }
        } else {
          box.classList.remove('marquee');
          box.style.removeProperty('--box-w');
          box.style.removeProperty('--duration');
        }
      });
    }, [marqueeMode]);

    useEffect(() => {
      const timerId = window.setTimeout(checkMarquee, 100);
      window.addEventListener('resize', checkMarquee);
      return () => {
        window.clearTimeout(timerId);
        window.removeEventListener('resize', checkMarquee);
      };
    }, [items, marqueeMode, checkMarquee]);

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
                <div className={`train-detail-box mode-${marqueeMode}`}>
                  <div className="train-detail-track">
                    <span className="train-detail-content">{item.detail}</span>
                    <span
                      className="train-detail-content train-detail-clone"
                      aria-hidden="true"
                    >
                      {item.detail}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  },
  (prev, next) =>
    prev.marqueeMode === next.marqueeMode &&
    JSON.stringify(prev.items) === JSON.stringify(next.items)
);
