import React from 'react';
import { WeatherData } from '../../services/weatherApi';

export interface WeatherCardProps {
  weather: WeatherData | null | undefined;
  cityName: string;
}

const num = (v: number | null | undefined): string | number =>
  v == null || isNaN(v) ? '--' : Math.round(v);

export function getWeatherBgClass(hour = new Date().getHours()): string {
  if (hour >= 5 && hour < 9) return 'wx-morning';
  if (hour >= 9 && hour < 16) return 'wx-day';
  if (hour >= 16 && hour < 19) return 'wx-evening';
  return 'wx-night';
}

const WeatherSvg: React.FC<{ code: number; hour: number }> = ({ code, hour }) => {
  const c = +code;
  const isNight = hour < 6 || hour >= 18;
  const cloudBack = (
    <path
      d="M12 25h14a5 5 0 0 0 .5-9.97A7 7 0 0 0 13.5 11.5a5.5 5.5 0 0 0-1.5 13.5z"
      fill="rgba(255,255,255,0.78)"
    />
  );

  if (c === 0) {
    if (isNight) {
      return (
        <svg viewBox="0 0 36 36">
          <path
            d="M22.5 7.5A9.5 9.5 0 1 0 27.5 23a8 8 0 0 1-5-15.5z"
            fill="#facc15"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="7" fill="#fbbf24" />
        <g stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round">
          <line x1="18" y1="5" x2="18" y2="7.5" />
          <line x1="18" y1="28.5" x2="18" y2="31" />
          <line x1="5" y1="18" x2="7.5" y2="18" />
          <line x1="28.5" y1="18" x2="31" y2="18" />
          <line x1="8.8" y1="8.8" x2="10.6" y2="10.6" />
          <line x1="25.4" y1="25.4" x2="27.2" y2="27.2" />
          <line x1="27.2" y1="8.8" x2="25.4" y2="10.6" />
          <line x1="10.6" y1="25.4" x2="8.8" y2="27.2" />
        </g>
      </svg>
    );
  }

  if (c <= 2) {
    if (isNight) {
      return (
        <svg viewBox="0 0 36 36">
          {cloudBack}
          <path
            d="M14 6.5A7.5 7.5 0 1 0 18.5 19a6.2 6.2 0 0 1-4.5-12.5z"
            fill="#facc15"
            filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
          />
        </svg>
      );
    }
    return (
      <svg viewBox="0 0 36 36">
        {cloudBack}
        <circle
          cx="12"
          cy="12"
          r="6"
          fill="#fbbf24"
          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
        />
      </svg>
    );
  }

  if (c <= 48) {
    return (
      <svg viewBox="0 0 36 36">
        <path
          d="M9 22h13a4.5 4.5 0 0 0 .4-8.97A6 6 0 0 0 10 10.5a4.8 4.8 0 0 0-1 11.5z"
          fill="rgba(255,255,255,0.5)"
        />
        <path
          d="M12 26h15a5.5 5.5 0 0 0 .6-10.97A7.5 7.5 0 0 0 13.3 12a6 6 0 0 0-1.3 14z"
          fill="#ffffff"
        />
      </svg>
    );
  }

  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) {
    return (
      <svg viewBox="0 0 36 36">
        <path
          d="M12 24h14a5.5 5.5 0 0 0 .6-10.97A7.5 7.5 0 0 0 13.3 10a6 6 0 0 0-1.3 14z"
          fill="#ffffff"
        />
        <g stroke="#60a5fa" strokeWidth="2.2" strokeLinecap="round">
          <line x1="14" y1="27" x2="12.5" y2="31" />
          <line x1="19.5" y1="27" x2="18" y2="31" />
          <line x1="25" y1="27" x2="23.5" y2="31" />
        </g>
      </svg>
    );
  }

  if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) {
    return (
      <svg viewBox="0 0 36 36">
        <path
          d="M12 24h14a5.5 5.5 0 0 0 .6-10.97A7.5 7.5 0 0 0 13.3 10a6 6 0 0 0-1.3 14z"
          fill="#ffffff"
        />
        <g fill="#bae6fd">
          <circle cx="14" cy="29" r="1.8" />
          <circle cx="19.5" cy="30" r="1.8" />
          <circle cx="25" cy="29" r="1.8" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 36 36">
      <path
        d="M12 23h14a5.5 5.5 0 0 0 .6-10.97A7.5 7.5 0 0 0 13.3 9a6 6 0 0 0-1.3 14z"
        fill="#ffffff"
      />
      <polygon
        points="19,23 14,29 18,29 16.5,33 23,26.5 19,26.5"
        fill="#facc15"
      />
    </svg>
  );
};

export const WeatherCard: React.FC<WeatherCardProps> = ({ weather, cityName }) => {
  if (!weather) {
    return <div className="empty">天気データを取得中…</div>;
  }

  const curHr = new Date().getHours();
  const displayCity = weather.cityName || cityName || '現在地';
  const hourlyItems = (weather.hourly || []).slice(0, 6);

  return (
    <>
      <div className="wx-main">
        <span className="wx-ic">
          <WeatherSvg code={weather.code} hour={curHr} />
        </span>
        <span className="wx-t">{num(weather.temp)}°</span>
        <div className="wx-details">
          <div className="wx-d">{weather.desc}</div>
          <div className="wx-hl">
            最高 {num(weather.hi)}° / 最低 {num(weather.lo)}°
          </div>
          <div className="wx-loc-pop">
            <span>{displayCity}</span>
            <span className="wx-pop-badge">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
              降水 {num(weather.pop)}%
            </span>
          </div>
        </div>
      </div>
      <div className="hrs">
        {hourlyItems.map((h, idx) => {
          const d = new Date(h.time);
          const hrNum = isNaN(d.getTime()) ? 0 : d.getHours();
          const timeLabel = isNaN(d.getTime()) ? h.time || '' : `${hrNum}時`;
          return (
            <div className="hr" key={h.time || idx}>
              <div>{timeLabel}</div>
              <div className="hr-ic">
                <WeatherSvg code={h.code} hour={hrNum} />
              </div>
              <div className="hr-temp">{num(h.temp)}°</div>
              <small>{num(h.pop)}%</small>
            </div>
          );
        })}
      </div>
    </>
  );
};
