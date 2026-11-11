import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppConfig,
  CardKey,
  loadProfileConfig,
  ProfileMode,
  resetProfileConfig,
  resolveInitialMode,
  saveActiveMode,
  saveProfileConfig,
  STORAGE_KEYS,
} from './config/appConfig';
import { CalendarCard } from './components/CalendarCard';
import { Clock } from './components/Clock';
import { NewsCard } from './components/NewsCard';
import { QuakeCard } from './components/QuakeCard';
import { SettingsDrawer } from './components/SettingsDrawer';
import { TrainCard } from './components/TrainCard';
import { getWeatherBgClass, WeatherCard } from './components/WeatherCard';
import { useBurnInProtect } from './hooks/useBurnInProtect';
import { useFullscreen } from './hooks/useFullscreen';
import { useWakeLock } from './hooks/useWakeLock';
import { resolveLocationWithFallback } from './services/geolocation';
import { CalendarEventItem, fetchCalendarEvents } from './services/icsParser';
import { fetchNewsWithFallback, NewsItem } from './services/newsService';
import { fetchQuakeData, QuakeItem } from './services/quakeApi';
import {
  buildTrainStatusList,
  fetchYahooTrainTroubles,
  TrainStatusItem,
  YahooTroublesResult,
} from './services/trainService';
import { fetchWeatherData, WeatherData } from './services/weatherApi';

interface CachedDashboardData {
  t: number;
  data: {
    weather?: WeatherData | null;
    train?: TrainStatusItem[];
    news?: NewsItem[];
    quake?: QuakeItem[];
    calendar?: CalendarEventItem[];
  };
}

const CARD_DEFS: { key: CardKey; title: string; header: string }[] = [
  { key: 'weather', title: '天気', header: '天気と3時間ごとの予報' },
  { key: 'train', title: '鉄道', header: '鉄道運行情報' },
  { key: 'news', title: 'ニュース', header: 'トピックニュース' },
  { key: 'quake', title: '地震情報', header: '地震情報' },
  { key: 'calendar', title: '予定', header: 'カレンダーの予定' },
];

function loadCachedData(mode: ProfileMode): CachedDashboardData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.cache[mode]);
    if (!raw) return null;
    return JSON.parse(raw) as CachedDashboardData;
  } catch (_) {
    return null;
  }
}

function saveCachedData(mode: ProfileMode, payload: CachedDashboardData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.cache[mode], JSON.stringify(payload));
  } catch (_) {
    // ignore
  }
}

export const App: React.FC = () => {
  const [mode, setMode] = useState<ProfileMode>(() => resolveInitialMode());
  const [cfg, setCfg] = useState<AppConfig>(() => loadProfileConfig(resolveInitialMode()));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initialCache = useMemo(() => loadCachedData(mode), [mode]);

  const [weather, setWeather] = useState<WeatherData | null>(
    () => initialCache?.data?.weather ?? null
  );
  const [train, setTrain] = useState<TrainStatusItem[]>(
    () => initialCache?.data?.train ?? []
  );
  const [news, setNews] = useState<NewsItem[]>(
    () => initialCache?.data?.news ?? []
  );
  const [quake, setQuake] = useState<QuakeItem[]>(
    () => initialCache?.data?.quake ?? []
  );
  const [calendar, setCalendar] = useState<CalendarEventItem[]>(
    () => initialCache?.data?.calendar ?? []
  );

  const [trainDiag, setTrainDiag] = useState<YahooTroublesResult | null>(null);
  const [statusOk, setStatusOk] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(() => initialCache?.t ?? 0);
  const [wxBgClass, setWxBgClass] = useState<string>(() => getWeatherBgClass());

  // 鉄道運行情報のDOM/アニメーション再マウント防止用ハッシュRef
  const prevTrainHashRef = useRef<string>(
    initialCache?.data?.train ? JSON.stringify(initialCache.data.train) : ''
  );
  const busyRef = useRef<boolean>(false);

  // ページャー・自動スクロール制御
  const pagerRef = useRef<HTMLDivElement>(null);
  const [curIndex, setCurIndex] = useState<number>(0);
  const curIndexRef = useRef<number>(0);
  curIndexRef.current = curIndex;
  const touchedRef = useRef<number>(0);
  const drawerOpenRef = useRef<boolean>(drawerOpen);
  drawerOpenRef.current = drawerOpen;

  const { toggleFullscreen } = useFullscreen();
  useWakeLock();
  useBurnInProtect({
    burnShift: cfg.burnShift,
    nightDim: cfg.nightDim,
    nightStartHour: cfg.nightStartHour,
    nightEndHour: cfg.nightEndHour,
  });

  // 相対パス環境（GitHub Pagesサブディレクトリ等）でも背景画像が確実に解決されるよう絶対URL化してCSS変数を設定
  useEffect(() => {
    const root = document.documentElement.style;
    const resolveAsset = (file: string) => {
      try {
        return `url('${new URL(`./${file}`, window.location.href).href}')`;
      } catch (_) {
        return `url('./${file}')`;
      }
    };
    root.setProperty('--bg-train', resolveAsset('train-bg.jpg'));
    root.setProperty('--bg-news', resolveAsset('news-bg.jpg'));
    root.setProperty('--bg-quake', resolveAsset('earthquake-bg.jpg'));
    root.setProperty('--bg-calendar', resolveAsset('calendar-bg.jpg'));
  }, []);

  // 時間帯に応じた天気カード背景の更新（1分毎）
  useEffect(() => {
    const id = window.setInterval(() => {
      setWxBgClass(getWeatherBgClass());
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  const visibleCards = useMemo(
    () => CARD_DEFS.filter((c) => cfg.show[c.key]),
    [cfg.show]
  );

  const goCard = useCallback(
    (index: number) => {
      const n = visibleCards.length;
      if (!n || !pagerRef.current) return;
      const next = ((index % n) + n) % n;
      setCurIndex(next);
      curIndexRef.current = next;
      pagerRef.current.scrollTo({
        top: next * pagerRef.current.clientHeight,
        behavior: 'smooth',
      });
    },
    [visibleCards.length]
  );

  // 表示カード変更時にページャー位置を先頭へリセット
  useEffect(() => {
    setCurIndex(0);
    curIndexRef.current = 0;
    if (pagerRef.current) {
      pagerRef.current.scrollTop = 0;
    }
  }, [cfg.show]);

  // 自動スクロールタイマー
  useEffect(() => {
    if (cfg.autoScrollSeconds <= 0 || visibleCards.length <= 1) return;
    const timer = window.setInterval(() => {
      if (Date.now() - touchedRef.current < 15000 || drawerOpenRef.current) return;
      goCard(curIndexRef.current + 1);
    }, cfg.autoScrollSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [cfg.autoScrollSeconds, visibleCards.length, goCard]);

  // データ一括取得処理（1分毎 + 設定変更時）
  const loadData = useCallback(
    async (activeMode: ProfileMode, activeCfg: AppConfig) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setWxBgClass(getWeatherBgClass());

      try {
        // 1. 位置情報の解決（useAutoLocation が true の場合は Geolocation + 逆ジオコーディング、失敗時は固定座標へフォールバック）
        let targetLat = activeCfg.lat;
        let targetLon = activeCfg.lon;
        let targetCityName = activeCfg.cityName;

        if (activeCfg.useAutoLocation) {
          const resolved = await resolveLocationWithFallback({
            lat: activeCfg.lat,
            lon: activeCfg.lon,
            cityName: activeCfg.cityName,
          });
          targetLat = resolved.lat;
          targetLon = resolved.lon;
          targetCityName = resolved.cityName;
        }

        // 2. 各APIの並列取得
        const [weatherData, yahooRes, newsData, quakeData, calData] =
          await Promise.all([
            fetchWeatherData(targetLat, targetLon, targetCityName),
            fetchYahooTrainTroubles(activeCfg.gasUrl),
            fetchNewsWithFallback(activeCfg.newsRss),
            fetchQuakeData(),
            fetchCalendarEvents(activeCfg.calUrl, activeCfg.gasUrl),
          ]);

        setTrainDiag(yahooRes);

        const trainData = buildTrainStatusList(
          activeCfg.selectedLines,
          yahooRes
        );

        const prevCache = loadCachedData(activeMode)?.data || {};
        const nextWeather = weatherData || prevCache.weather || null;
        const nextNews = newsData.length ? newsData : prevCache.news || [];
        const nextQuake = quakeData.length ? quakeData : prevCache.quake || [];
        const nextCal = calData.length ? calData : prevCache.calendar || [];

        setWeather(nextWeather);
        setNews(nextNews);
        setQuake(nextQuake);
        setCalendar(nextCal);

        // 鉄道運行情報は内容が変化していない場合、state参照を更新せず <TrainCard /> のDOM・マーキーを再マウントさせない
        const curTrainHash = JSON.stringify(trainData);
        if (curTrainHash !== prevTrainHashRef.current) {
          prevTrainHashRef.current = curTrainHash;
          setTrain(trainData);
        }

        const nowTs = Date.now();
        setStatusOk(true);
        setLastUpdated(nowTs);

        saveCachedData(activeMode, {
          t: nowTs,
          data: {
            weather: nextWeather,
            train: trainData,
            news: nextNews,
            quake: nextQuake,
            calendar: nextCal,
          },
        });
      } catch (_) {
        setStatusOk(false);
      } finally {
        busyRef.current = false;
      }
    },
    []
  );

  // 初回ロード ＆ 60秒ごとの定期更新
  useEffect(() => {
    loadData(mode, cfg);
    const id = window.setInterval(() => {
      loadData(mode, cfg);
    }, 60000);
    return () => window.clearInterval(id);
  }, [mode, cfg, loadData]);

  const handlePagerScroll = () => {
    const pager = pagerRef.current;
    if (!pager || !pager.clientHeight) return;
    const i = Math.round(pager.scrollTop / pager.clientHeight);
    if (i !== curIndexRef.current) {
      curIndexRef.current = i;
      setCurIndex(i);
    }
  };

  const handleSaveSettings = (nextMode: ProfileMode, nextConfig: AppConfig) => {
    saveActiveMode(nextMode);
    saveProfileConfig(nextMode, nextConfig);
    setMode(nextMode);
    setCfg(nextConfig);
    setDrawerOpen(false);
    busyRef.current = false;
    loadData(nextMode, nextConfig);
  };

  const handleResetProfile = (targetMode: ProfileMode): AppConfig => {
    return resetProfileConfig(targetMode);
  };

  return (
    <>
      <div id="app">
        <Clock
          temp={weather?.temp}
          statusOk={statusOk}
          lastUpdated={lastUpdated}
          onOpenSettings={() => setDrawerOpen(true)}
        />

        <section className="stage">
          <div
            id="pager"
            ref={pagerRef}
            onScroll={handlePagerScroll}
            onTouchStart={() => {
              touchedRef.current = Date.now();
            }}
            onWheel={() => {
              touchedRef.current = Date.now();
            }}
          >
            <article
              className={`card ${wxBgClass}`}
              id="cardWeather"
              data-k="weather"
              data-t="天気"
              hidden={!cfg.show.weather}
            >
              <div className="card-hdr">
                <h2>天気と3時間ごとの予報</h2>
              </div>
              <div className="body" id="b-weather">
                <WeatherCard weather={weather} cityName={cfg.cityName} />
              </div>
            </article>

            <article
              className="card"
              data-k="train"
              data-t="鉄道"
              hidden={!cfg.show.train}
            >
              <div className="card-hdr">
                <h2>鉄道運行情報</h2>
              </div>
              <div className="body" id="b-train">
                <TrainCard items={train} />
              </div>
            </article>

            <article
              className="card"
              data-k="news"
              data-t="ニュース"
              hidden={!cfg.show.news}
            >
              <div className="card-hdr">
                <h2>トピックニュース</h2>
              </div>
              <div className="body" id="b-news">
                <NewsCard items={news} />
              </div>
            </article>

            <article
              className="card"
              data-k="quake"
              data-t="地震情報"
              hidden={!cfg.show.quake}
            >
              <div className="card-hdr">
                <h2>地震情報</h2>
              </div>
              <div className="body" id="b-quake">
                <QuakeCard items={quake} />
              </div>
            </article>

            <article
              className="card"
              data-k="calendar"
              data-t="予定"
              hidden={!cfg.show.calendar}
            >
              <div className="card-hdr">
                <h2>カレンダーの予定</h2>
              </div>
              <div className="body" id="b-calendar">
                <CalendarCard events={calendar} />
              </div>
            </article>
          </div>

          <div
            id="dots"
            style={{ display: visibleCards.length > 1 ? undefined : 'none' }}
          >
            {visibleCards.map((c, i) => (
              <button
                key={c.key}
                type="button"
                aria-label={c.title}
                className={i === curIndex ? 'on' : ''}
                onClick={() => {
                  touchedRef.current = Date.now();
                  goCard(i);
                }}
              />
            ))}
          </div>
        </section>
      </div>

      <SettingsDrawer
        isOpen={drawerOpen}
        mode={mode}
        config={cfg}
        trainDiag={trainDiag}
        onOpen={() => setDrawerOpen(true)}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveSettings}
        onResetProfile={handleResetProfile}
        onToggleFullscreen={toggleFullscreen}
      />
    </>
  );
};
export default App;
