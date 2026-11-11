import React from 'react';
import { CalendarEventItem } from '../../services/icsParser';

export interface CalendarCardProps {
  events: CalendarEventItem[];
}

const pad = (n: number): string => String(n).padStart(2, '0');
const fmtEventDate = (d: Date): string => `${d.getMonth() + 1}/${d.getDate()}`;
const fmtEventTime = (d: Date): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const toDate = (v: Date | string | undefined): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export const CalendarCard: React.FC<CalendarCardProps> = ({ events }) => {
  if (!events || !events.length) {
    return (
      <div className="empty">
        直近の予定はありません（設定からiCal URLをご登録ください）
      </div>
    );
  }

  return (
    <div className="cal-list">
      {events.slice(0, 5).map((ev, idx) => {
        let timeStr = '終日';
        let dateStr = '';
        const startDate = toDate(ev.start);
        const endDate = toDate(ev.end);

        if (startDate) {
          dateStr = fmtEventDate(startDate);
          const t1 = fmtEventTime(startDate);
          const t2 = endDate ? fmtEventTime(endDate) : '';
          if (
            ev.isAllDay ||
            (t1 === '00:00' && (t2 === '00:00' || !t2)) ||
            (t2 && t1 === t2)
          ) {
            timeStr = '終日';
          } else {
            timeStr = t1;
            if (endDate && t1 !== t2) {
              timeStr += ` - ${t2}`;
            }
          }
        }

        return (
          <div className="cal-item glass-item" key={`${dateStr}-${timeStr}-${ev.title}-${idx}`}>
            <div className="cal-time-col">
              <span className="cal-date">{dateStr}</span>
              <span className="cal-time">{timeStr}</span>
            </div>
            <div className="cal-title">{ev.title}</div>
          </div>
        );
      })}
    </div>
  );
};
