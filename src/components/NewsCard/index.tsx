import React from 'react';
import { NewsItem, stripHtml } from '../../services/newsService';

export interface NewsCardProps {
  items: NewsItem[];
}

export const NewsCard: React.FC<NewsCardProps> = ({ items }) => {
  const valid = (items || []).filter((n) => n && n.title);
  if (!valid.length) {
    return <div className="empty">ニュースを取得しています…</div>;
  }

  const list = valid.slice(0, 3);

  return (
    <div className="nw-stack">
      {list.map((n, idx) => {
        const desc = n.desc ? stripHtml(n.desc) : '';
        return (
          <div className="nw-item glass-item" key={n.url || n.title || idx}>
            <div className="nw-item-top">
              <div className="nw-item-title">{n.title}</div>
              <span className="nw-item-time">
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15.5 14" />
                </svg>
                {n.date || '最新'}
              </span>
            </div>
            <div className="nw-item-desc">{desc}</div>
          </div>
        );
      })}
    </div>
  );
};
