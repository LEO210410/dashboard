export interface NewsItem {
  title: string;
  desc: string;
  url: string;
  date: string;
  source: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function stripHtml(s: string | null | undefined): string {
  return String(s == null ? '' : s)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatPubDate(str: string | null | undefined): string {
  if (!str) return '';
  const d = new Date(str.replace(/-/g, '/'));
  const d2 = isNaN(d.getTime()) ? new Date(str) : d;
  return isNaN(d2.getTime())
    ? ''
    : `${d2.getMonth() + 1}/${d2.getDate()} ${pad(d2.getHours())}:${pad(d2.getMinutes())}`;
}

export function parseXmlString(xmlText: string): NewsItem[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'text/xml');
  const feedTitle = stripHtml(
    xml.querySelector('channel > title, feed > title')?.textContent || 'NHKニュース'
  );
  const items = Array.from(xml.querySelectorAll('item, entry')).slice(0, 6);
  return items
    .map((item) => {
      const title = stripHtml(item.querySelector('title')?.textContent || '');
      const desc = stripHtml(
        item.querySelector('description, summary, content')?.textContent || ''
      );
      const link =
        item.querySelector('link')?.textContent?.trim() ||
        item.querySelector('link')?.getAttribute('href') ||
        '';
      const pub =
        item.querySelector('pubDate, updated, date')?.textContent ||
        item.getElementsByTagName('dc:date')[0]?.textContent ||
        '';
      return {
        title,
        desc,
        url: link,
        date: formatPubDate(pub),
        source: feedTitle,
      };
    })
    .filter((it) => it.title);
}

export async function fetchNewsWithFallback(rssUrl: string): Promise<NewsItem[]> {
  if (!rssUrl) return [];

  try {
    const r1 = await fetch(`https://corsproxy.io/?${encodeURIComponent(rssUrl)}`);
    if (r1.ok) {
      const txt = await r1.text();
      const parsed = parseXmlString(txt);
      if (parsed.length > 0) return parsed;
    }
  } catch (_) {
    // ignore
  }

  try {
    const r2 = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`);
    if (r2.ok) {
      const j = (await r2.json()) as { contents?: string };
      if (j.contents) {
        const parsed = parseXmlString(j.contents);
        if (parsed.length > 0) return parsed;
      }
    }
  } catch (_) {
    // ignore
  }

  try {
    const r3 = await fetch(
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`
    );
    if (r3.ok) {
      const j = (await r3.json()) as {
        status?: string;
        feed?: { title?: string };
        items?: Array<{
          title?: string;
          description?: string;
          content?: string;
          link?: string;
          pubDate?: string;
        }>;
      };
      if (j.status === 'ok' && j.items && j.items.length > 0) {
        const src = stripHtml(j.feed?.title || 'NHKニュース');
        const list = j.items
          .map((it) => ({
            title: stripHtml(it.title),
            desc: stripHtml(it.description || it.content || ''),
            url: it.link || '',
            date: formatPubDate(it.pubDate),
            source: src,
          }))
          .filter((it) => it.title);
        if (list.length > 0) return list;
      }
    }
  } catch (_) {
    // ignore
  }

  return [];
}
