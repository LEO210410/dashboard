import React from 'react';
import { QuakeItem } from '../../services/quakeApi';

export interface QuakeCardProps {
  items: QuakeItem[];
}

const pad = (n: number): string => String(n).padStart(2, '0');

const fmtTime = (tStr: string): string => {
  const d = new Date(tStr);
  return isNaN(d.getTime())
    ? tStr || ''
    : `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const QuakeCard: React.FC<QuakeCardProps> = ({ items }) => {
  if (!items || !items.length) {
    return <div className="empty">直近の地震情報はありません</div>;
  }

  const latest = items[0];
  const older = items.slice(1, 5).reverse();
  const lm = +latest.mag;
  const badgeCls = lm >= 6 ? 'hi' : lm >= 4.5 ? 'mid' : '';

  return (
    <div className="eq-wrap">
      <div className="eq-older-list">
        {older.map((q, idx) => {
          const m = +q.mag;
          return (
            <div className="eq-old glass-item" key={`${q.time}-${idx}`}>
              <span className="eq-old-mag">
                M{isNaN(m) ? '-' : m.toFixed(1)}
              </span>
              <span className="eq-old-place">{q.place}</span>
              <span className="eq-old-time">{fmtTime(q.time)}</span>
              <span className="eq-old-int">震度{q.intensity || '-'}</span>
            </div>
          );
        })}
      </div>
      <div className="eq-latest glass-item">
        <div className={`eq-latest-badge ${badgeCls}`.trim()}>
          <span className="eq-latest-lbl">最大震度</span>
          <span className="eq-latest-int">{latest.intensity || '-'}</span>
        </div>
        <div className="eq-latest-info">
          <div className="eq-latest-top">
            <span className="eq-latest-tag">最新</span>
            <span className="eq-latest-time">{fmtTime(latest.time)} 発生</span>
          </div>
          <div className="eq-latest-place">{latest.place}</div>
          <div className="eq-latest-meta">
            規模 M{isNaN(lm) ? '-' : lm.toFixed(1)} ／ 深さ {latest.depth}
          </div>
        </div>
      </div>
    </div>
  );
};
