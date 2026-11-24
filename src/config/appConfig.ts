export type CardKey = 'weather' | 'train' | 'news' | 'quake' | 'calendar';

export type TrainMarqueeMode = 'oneway' | 'pause-scroll' | 'seamless';

export interface CardVisibility {
  weather: boolean;
  train: boolean;
  news: boolean;
  quake: boolean;
  calendar: boolean;
}

export interface AppConfig {
  /** 各カードの表示/非表示（true: 表示 / false: 非表示） */
  show: CardVisibility;
  /** 表示する鉄道路線のID一覧 */
  selectedLines: string[];
  /** 鉄道運行情報の詳細テキストのスクロール方式 */
  trainMarqueeMode: TrainMarqueeMode;
  /** 運行情報中継 URL（Google Apps Script ウェブアプリの公開URL） */
  gasUrl: string;
  /** Googleカレンダー iCal URL（非公開URLまたは公開URLの .ics リンク） */
  calUrl: string;
  /** 天気カード用の表示場所名 */
  cityName: string;
  /** 緯度 */
  lat: number;
  /** 経度 */
  lon: number;
  /** 起動時に現在地を自動取得するかどうか（Geolocation API + 逆ジオコーディング） */
  useAutoLocation: boolean;
  /** ニュースの配信元 RSS フィード URL */
  newsRss: string;
  /** 自動スライドの間隔（秒数、0で自動スクロール停止） */
  autoScrollSeconds: number;
  /** 画面焼け防止（ピクセル微動） */
  burnShift: boolean;
  /** 夜間自動減光（ナイトモード） */
  nightDim: boolean;
  /** 減光開始時刻（0〜23時） */
  nightStartHour: number;
  /** 減光終了時刻（0〜23時） */
  nightEndHour: number;
  /**
   * 初期設定を強制適用するフラグ
   * true に設定すると、ブラウザに保存された設定をリセットし、常にコード内の初期値で起動します
   */
  FORCE_DEFAULT_SETTINGS: boolean;
}

/** localStorage キー定義（既存保存データとの互換性を維持） */
export const STORAGE_KEYS = {
  cfg: 'dash.cfg.home',
  cache: 'dash.cache.home',
} as const;

/** ニュース配信元プリセット一覧 */
export const NEWS_PRESETS: { label: string; url: string }[] = [
  { label: 'NHK ニュース（主要・最新URL）', url: 'https://news.web.nhk/n-data/conf/na/rss/cat0.xml' },
  { label: 'NHK ニュース（社会）', url: 'https://news.web.nhk/n-data/conf/na/rss/cat1.xml' },
  { label: 'NHK ニュース（科学・文化）', url: 'https://news.web.nhk/n-data/conf/na/rss/cat3.xml' },
  { label: 'NHK ニュース（経済）', url: 'https://news.web.nhk/n-data/conf/na/rss/cat5.xml' },
  { label: 'Yahoo!ニュース（主要トピックス）', url: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml' },
  { label: 'Yahoo!ニュース（IT・テクノロジー）', url: 'https://news.yahoo.co.jp/rss/topics/it.xml' },
];

/* ==========================================================================
   ▼▼▼ 初期設定（DEFAULT_CONFIG） ▼▼▼
   プライベート専用の初期設定です。
   設定画面からの変更内容はブラウザ（localStorage）に保持されます。
   ========================================================================== */
export const DEFAULT_CONFIG: AppConfig = {
  // 1. 各カードの表示/非表示（true: 表示 / false: 非表示）
  show: {
    weather: true,    // 天気
    train: true,      // 鉄道運行情報
    news: true,       // ニュース
    quake: true,      // 地震情報
    calendar: true,   // カレンダーの予定
  },

  // 2. 表示する鉄道路線のID一覧（デフォルトで監視したい路線IDを記述）
  selectedLines: [
    'jb_sobu',              // 中央・総武各駅停車
    'jo_sobu_rapid',        // 総武快速線
    'je_keiyo',             // 京葉線
    't_tozai',              // 東西線
    'ks_keisei',            // 京成本線
    'r_rinkai',             // りんかい線
    'jy_yamanote',          // 山手線
    'tokaido_shinkansen',   // 東海道新幹線
  ],

  // 鉄道運行情報のスクロール方式（'oneway' | 'pause-scroll' | 'seamless'）
  trainMarqueeMode: 'oneway',

  // 3. 運行情報中継 URL（Google Apps Script ウェブアプリの公開URL）
  gasUrl: 'https://script.google.com/macros/s/AKfycbz0TFWGaL7GzNdM4R48vz1Lj-rNAxXiciCurd--pBuLb_433CjXRfGrOJHSmdxktA-1/exec',

  // 4. Googleカレンダー iCal URL（非公開URLまたは公開URLの .ics リンク）
  calUrl: 'https://calendar.google.com/calendar/ical/reo4glx10%40gmail.com/private-799db8e79ae7a9d6b5e2081e338d083c/basic.ics',

  // 5. 天気カード用の表示場所名および緯度・経度・現在地自動取得フラグ
  cityName: '千葉県船橋市',
  lat: 35.6908,
  lon: 139.9984,
  useAutoLocation: false,

  // 6. ニュースの配信元 RSS フィード URL
  newsRss: 'https://news.web.nhk/n-data/conf/na/rss/cat0.xml',

  // 7. 自動スライドの間隔（秒数、0で自動スクロール停止）
  autoScrollSeconds: 15,

  // 8. ディスプレイ焼き付き防止・減光設定
  burnShift: true,          // ピクセル微動（焼き付き防止）
  nightDim: false,          // 夜間自動減光
  nightStartHour: 23,       // 減光開始（23時〜）
  nightEndHour: 6,          // 減光終了（〜翌朝6時）

  // 9. 設定強制フラグ（false: 設定画面での変更をlocalStorageに保存して維持）
  FORCE_DEFAULT_SETTINGS: false,
};
/* ==========================================================================
   ▲▲▲ 初期設定ここまで ▲▲▲
   ========================================================================== */

/** 設定オブジェクトをディープコピーする */
export function cloneConfig(cfg: AppConfig): AppConfig {
  return {
    ...cfg,
    show: { ...cfg.show },
    selectedLines: [...cfg.selectedLines],
  };
}

/**
 * 設定をロードする。
 * FORCE_DEFAULT_SETTINGS が true の場合は常に DEFAULT_CONFIG の初期値で上書きする。
 */
export function loadConfig(): AppConfig {
  const def = cloneConfig(DEFAULT_CONFIG);

  if (def.FORCE_DEFAULT_SETTINGS) {
    saveConfig(def);
    return def;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.cfg);
    if (!raw) return def;
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    const merged: AppConfig = {
      ...def,
      ...parsed,
      show: {
        ...def.show,
        ...(parsed.show || {}),
      },
      selectedLines:
        Array.isArray(parsed.selectedLines) && parsed.selectedLines.length > 0
          ? [...parsed.selectedLines]
          : [...def.selectedLines],
    };
    // 過去に保存された空の gasUrl でコード内の有効なURLが上書きされないよう補完する
    if (!merged.gasUrl || !merged.gasUrl.trim()) {
      merged.gasUrl = def.gasUrl;
    }
    const validMarqueeModes: TrainMarqueeMode[] = ['oneway', 'pause-scroll', 'seamless'];
    if (!validMarqueeModes.includes(merged.trainMarqueeMode)) {
      merged.trainMarqueeMode = def.trainMarqueeMode;
    }
    return merged;
  } catch (_) {
    return def;
  }
}

/** 設定を localStorage に保存する */
export function saveConfig(cfg: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.cfg, JSON.stringify(cfg));
  } catch (_) {
    // ignore
  }
}

/** 設定を初期値にリセットして保存する */
export function resetConfig(): AppConfig {
  const def = cloneConfig(DEFAULT_CONFIG);
  saveConfig(def);
  return def;
}
