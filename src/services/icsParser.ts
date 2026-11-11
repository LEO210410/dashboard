import { fetchJsonp } from './gasJsonp';

export interface CalendarEventItem {
  title: string;
  isAllDay: boolean;
  start: Date | string;
  end?: Date | string;
}

interface GasIcalResponse {
  ok?: boolean;
  ics?: string;
}

export function parseIcsDate(str: string): Date | null {
  if (!str) return null;
  const m = str.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return new Date(str);
  const isUtc = !!m[7];
  if (m[4]) {
    if (isUtc) {
      return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
    }
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  }
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

export function parseIcsEvents(icsText: string): CalendarEventItem[] {
  if (!icsText) return [];
  const events: Array<{
    title: string;
    isAllDay: boolean;
    start?: Date | null;
    end?: Date | null;
  }> = [];

  const lines = icsText
    .replace(/\r\n /g, '')
    .replace(/\n /g, '')
    .split(/\r\n|\n|\r/);
  let cur: {
    title: string;
    isAllDay: boolean;
    start?: Date | null;
    end?: Date | null;
  } | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      cur = { title: '名称未設定', isAllDay: false };
    } else if (line.startsWith('END:VEVENT')) {
      if (cur && cur.start) {
        events.push(cur);
      }
      cur = null;
    } else if (cur) {
      const idx = line.indexOf(':');
      if (idx !== -1) {
        const key = line.substring(0, idx);
        const val = line
          .substring(idx + 1)
          .replace(/\\,/g, ',')
          .replace(/\\;/g, ';')
          .replace(/\\n/g, ' ');
        if (key.startsWith('SUMMARY')) {
          cur.title = val.trim();
        } else if (key.startsWith('DTSTART')) {
          cur.isAllDay = !key.includes('T') && !val.includes('T');
          cur.start = parseIcsDate(val);
        } else if (key.startsWith('DTEND')) {
          cur.end = parseIcsDate(val);
        }
      }
    }
  }

  const now = new Date();
  return events
    .filter((ev): ev is { title: string; isAllDay: boolean; start: Date; end?: Date } => {
      if (!ev.start) return false;
      const checkEnd = ev.end || new Date(ev.start.getTime() + 86400000);
      return checkEnd >= now;
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5);
}

export async function fetchCalendarEvents(
  calUrl: string,
  gasUrl?: string
): Promise<CalendarEventItem[]> {
  if (!calUrl) return [];

  if (gasUrl && gasUrl.startsWith('https://script.google.com/')) {
    try {
      const sep = gasUrl.includes('?') ? '&' : '?';
      const target = `${gasUrl}${sep}icalUrl=${encodeURIComponent(calUrl)}`;
      const res = await fetchJsonp<GasIcalResponse>(target);
      if (res && res.ok && res.ics) {
        return parseIcsEvents(res.ics);
      }
      console.error('[Calendar] GAS レスポンス形式不整合', { gasUrl, response: res });
    } catch (e) {
      console.error('[Calendar] GAS(JSONP) 失敗 -> CORS プロキシへフォールバック', {
        gasUrl,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(calUrl)}`;
    const r = await fetch(proxyUrl, { cache: 'no-store' });
    if (r.ok) {
      const txt = await r.text();
      return parseIcsEvents(txt);
    }
  } catch (_) {
    // ignore
  }

  return [];
}
