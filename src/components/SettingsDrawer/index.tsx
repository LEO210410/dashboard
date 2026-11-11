import React, { useEffect, useState } from 'react';
import {
  AppConfig,
  CardKey,
  cloneConfig,
  NEWS_PRESETS,
  ProfileMode,
  PROFILES,
} from '../../config/appConfig';
import { KANTO_MAIN_LINES, RAILWAY_CATALOG } from '../../config/railwayCatalog';
import { fetchCurrentLocationStrict } from '../../services/geolocation';
import { YahooTroublesResult } from '../../services/trainService';

export interface SettingsDrawerProps {
  isOpen: boolean;
  mode: ProfileMode;
  config: AppConfig;
  trainDiag: YahooTroublesResult | null;
  onOpen: () => void;
  onClose: () => void;
  onSave: (nextMode: ProfileMode, nextConfig: AppConfig) => void;
  onResetProfile: (targetMode: ProfileMode) => AppConfig;
  onToggleFullscreen: () => void;
}

const CARD_LABELS: { key: CardKey; label: string }[] = [
  { key: 'weather', label: '天気' },
  { key: 'train', label: '運行情報' },
  { key: 'news', label: 'ニュース' },
  { key: 'quake', label: '地震情報' },
  { key: 'calendar', label: '予定' },
];

type IconName = 'home' | 'building' | 'refresh' | 'pin' | 'warn' | 'check';

/** 絵文字の代わりに使うインラインSVGアイコン（currentColor 追従） */
const Icon: React.FC<{ name: IconName }> = ({ name }) => {
  let body: React.ReactNode;
  switch (name) {
    case 'home':
      body = <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />;
      break;
    case 'building':
      body = <path d="M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M3 21h18" />;
      break;
    case 'refresh':
      body = <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />;
      break;
    case 'pin':
      body = (
        <>
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      );
      break;
    case 'warn':
      body = (
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01" />
      );
      break;
    case 'check':
      body = <polyline points="20 6 9 17 4 12" />;
      break;
  }
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true">
      {body}
    </svg>
  );
};

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  mode,
  config,
  trainDiag,
  onOpen,
  onClose,
  onSave,
  onResetProfile,
  onToggleFullscreen,
}) => {
  const [draftMode, setDraftMode] = useState<ProfileMode>(mode);
  const [draft, setDraft] = useState<AppConfig>(() => cloneConfig(config));
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMsg, setGeoMsg] = useState<{ text: string; isError?: boolean } | null>(
    null
  );

  useEffect(() => {
    if (isOpen) {
      setDraftMode(mode);
      setDraft(cloneConfig(config));
      setGeoMsg(null);
    }
  }, [isOpen, mode, config]);

  useEffect(() => {
    document.body.classList.toggle('open', isOpen);
    return () => {
      document.body.classList.remove('open');
    };
  }, [isOpen]);

  const handleSelectProfile = (targetMode: ProfileMode) => {
    setDraftMode(targetMode);
    // 切り替えた際は該当プロファイルの初期値をフォームに反映する
    setDraft(cloneConfig(PROFILES[targetMode]));
    setGeoMsg({
      text: `「${PROFILES[targetMode].profileName}」プロファイルの初期値をフォームに読み込みました（「保存して更新」で確定）`,
    });
  };

  const handleResetToDefault = () => {
    const resetCfg = onResetProfile(draftMode);
    setDraft(cloneConfig(resetCfg));
    setGeoMsg({
      text: `「${PROFILES[draftMode].profileName}」プロファイルの初期値にリセットしました`,
    });
  };

  const handleFetchCurrentLocationNow = async () => {
    setGeoLoading(true);
    setGeoMsg({ text: '現在地を取得中…' });
    try {
      const loc = await fetchCurrentLocationStrict();
      setDraft((prev) => ({
        ...prev,
        lat: loc.lat,
        lon: loc.lon,
        cityName: loc.cityName,
      }));
      setGeoMsg({
        text: `現在地を反映しました: ${loc.cityName} (${loc.lat}, ${loc.lon})`,
      });
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : '位置情報の取得に失敗しました（ブラウザの権限設定等をご確認ください）';
      setGeoMsg({ text: message, isError: true });
    } finally {
      setGeoLoading(false);
    }
  };

  const toggleCard = (key: CardKey, checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      show: {
        ...prev.show,
        [key]: checked,
      },
    }));
  };

  const toggleLine = (lineId: string, checked: boolean) => {
    setDraft((prev) => {
      const set = new Set(prev.selectedLines);
      if (checked) set.add(lineId);
      else set.delete(lineId);
      return {
        ...prev,
        selectedLines: RAILWAY_CATALOG.filter((l) => set.has(l.id)).map((l) => l.id),
      };
    });
  };

  const selectAllLines = () => {
    setDraft((prev) => ({
      ...prev,
      selectedLines: RAILWAY_CATALOG.map((l) => l.id),
    }));
  };

  const clearAllLines = () => {
    setDraft((prev) => ({
      ...prev,
      selectedLines: [],
    }));
  };

  const selectKantoMainLines = () => {
    setDraft((prev) => ({
      ...prev,
      selectedLines: [...KANTO_MAIN_LINES],
    }));
  };

  const selectShinkansenLines = () => {
    setDraft((prev) => ({
      ...prev,
      selectedLines: RAILWAY_CATALOG.filter((l) => l.group === 'shinkansen').map(
        (l) => l.id
      ),
    }));
  };

  const handleSave = () => {
    const autoSec =
      isNaN(draft.autoScrollSeconds) || draft.autoScrollSeconds < 0
        ? 0
        : Math.round(draft.autoScrollSeconds);
    const latVal = isNaN(draft.lat) ? PROFILES[draftMode].lat : draft.lat;
    const lonVal = isNaN(draft.lon) ? PROFILES[draftMode].lon : draft.lon;
    const ns =
      !isNaN(draft.nightStartHour) &&
      draft.nightStartHour >= 0 &&
      draft.nightStartHour <= 23
        ? Math.round(draft.nightStartHour)
        : 23;
    const ne =
      !isNaN(draft.nightEndHour) &&
      draft.nightEndHour >= 0 &&
      draft.nightEndHour <= 23
        ? Math.round(draft.nightEndHour)
        : 6;

    const nextShow = { ...draft.show };
    if (!Object.values(nextShow).some(Boolean)) {
      nextShow.weather = true;
    }

    const sanitized: AppConfig = {
      ...draft,
      profileName: PROFILES[draftMode].profileName,
      autoScrollSeconds: autoSec,
      cityName: draft.cityName.trim(),
      lat: latVal,
      lon: lonVal,
      calUrl: draft.calUrl.trim(),
      gasUrl: draft.gasUrl.trim(),
      newsRss: draft.newsRss.trim(),
      nightStartHour: ns,
      nightEndHour: ne,
      show: nextShow,
    };

    onSave(draftMode, sanitized);
  };

  const matchedPreset = NEWS_PRESETS.some((p) => p.url === draft.newsRss)
    ? draft.newsRss
    : 'custom';

  return (
    <>
      <button id="edge" aria-label="設定を開く" onClick={onOpen}></button>
      <div id="scrim" onClick={onClose}></div>
      <aside id="drawer" aria-label="設定">
        <h3>
          <span>設定</span>
          <span className="profile-badge">
            <Icon name={draftMode === 'facility' ? 'building' : 'home'} />
            現在: {draftMode === 'facility' ? '施設用' : '自宅用'}
          </span>
        </h3>

        <fieldset>
          <legend>プロファイル切り替え（初期設定プリセット）</legend>
          <div className="profile-seg">
            <button
              type="button"
              className={draftMode === 'home' ? 'active' : ''}
              onClick={() => handleSelectProfile('home')}
            >
              <Icon name="home" />
              自宅用モード
            </button>
            <button
              type="button"
              className={draftMode === 'facility' ? 'active' : ''}
              onClick={() => handleSelectProfile('facility')}
            >
              <Icon name="building" />
              施設用モード
            </button>
          </div>
          <div className="profile-actions">
            <button
              type="button"
              className="btn-sub"
              onClick={handleResetToDefault}
            >
              <Icon name="refresh" />
              プロファイル初期値にリセット
            </button>
          </div>
          <small className="hint-text">
            URLパラメータ <code>?mode=home</code> または <code>?mode=facility</code> でも起動モードを自動切り替えできます。
          </small>
        </fieldset>

        <label>
          自動スクロールの間隔
          <input
            id="sAuto"
            type="number"
            min={0}
            max={600}
            inputMode="numeric"
            value={draft.autoScrollSeconds}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                autoScrollSeconds:
                  e.target.value === '' ? 0 : parseInt(e.target.value, 10),
              }))
            }
          />
        </label>

        <fieldset>
          <legend>表示するカード</legend>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {CARD_LABELS.map(({ key, label }) => (
              <label className="chk" key={key}>
                <input
                  type="checkbox"
                  data-k={key}
                  checked={!!draft.show[key]}
                  onChange={(e) => toggleCard(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>路線を選択する</legend>
          <div className="line-filter-btns">
            <button type="button" id="btnAllLines" onClick={selectAllLines}>
              全選択
            </button>
            <button type="button" id="btnClearLines" onClick={clearAllLines}>
              全解除
            </button>
            <button type="button" id="btnKantoLines" onClick={selectKantoMainLines}>
              主要路線
            </button>
            <button type="button" id="btnShinkansen" onClick={selectShinkansenLines}>
              新幹線全線
            </button>
          </div>
          <div className="line-grid" id="lineCheckboxes">
            {RAILWAY_CATALOG.map((line) => (
              <label className="line-chk-item" key={line.id}>
                <input
                  type="checkbox"
                  className="line-chk"
                  value={line.id}
                  checked={draft.selectedLines.includes(line.id)}
                  onChange={(e) => toggleLine(line.id, e.target.checked)}
                />
                <img
                  className="mini-sym-img"
                  src={`icon/${encodeURI(line.file)}`}
                  alt=""
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.r) {
                      img.dataset.r = '1';
                      img.src = `icons/${encodeURI(line.file)}`;
                    }
                  }}
                />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {line.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Googleカレンダー設定</legend>
          <label>
            Googleカレンダー iCal URL
            <input
              id="sCalUrl"
              type="text"
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
              value={draft.calUrl}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, calUrl: e.target.value }))
              }
            />
          </label>
          <small className="hint-text">
            Googleカレンダーの設定 ＞「マイカレンダーの設定」＞「iCal形式の非公開URL」を入力してください。
          </small>
        </fieldset>

        <fieldset>
          <legend>運行情報プロキシ設定（GAS）</legend>
          <label>
            運行情報中継 URL (GASウェブアプリURL)
            <input
              id="sGasUrl"
              type="text"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={draft.gasUrl}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, gasUrl: e.target.value }))
              }
            />
          </label>
          <small className="hint-text">
            Google Apps Scriptで作成したウェブアプリURLを経由しないと、運行情報が取得できません
          </small>
        </fieldset>

        <fieldset>
          <legend>ニュース設定</legend>
          <label>
            配信元プリセット
            <select
              id="sNewsPreset"
              value={matchedPreset}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== 'custom') {
                  setDraft((prev) => ({ ...prev, newsRss: val }));
                }
              }}
            >
              {NEWS_PRESETS.map((p) => (
                <option key={p.url} value={p.url}>
                  {p.label}
                </option>
              ))}
              <option value="custom">カスタム（下の欄に直接URLを入力）</option>
            </select>
          </label>
          <label>
            RSS フィード URL
            <input
              id="sNewsRss"
              type="text"
              placeholder="https://news.web.nhk/n-data/conf/na/rss/cat0.xml"
              value={draft.newsRss}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, newsRss: e.target.value }))
              }
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>画面焼け防止・減光設定</legend>
          <label className="chk">
            <input
              type="checkbox"
              id="sBurnShift"
              checked={!!draft.burnShift}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, burnShift: e.target.checked }))
              }
            />
            画面焼け防止
          </label>
          <label className="chk">
            <input
              type="checkbox"
              id="sNightDim"
              checked={!!draft.nightDim}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, nightDim: e.target.checked }))
              }
            />
            夜間自動減光（ナイトモード）
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginTop: '4px',
            }}
          >
            <label>
              減光開始時刻
              <input
                id="sNightStart"
                type="number"
                min={0}
                max={23}
                inputMode="numeric"
                value={draft.nightStartHour}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    nightStartHour:
                      e.target.value === '' ? 0 : parseInt(e.target.value, 10),
                  }))
                }
              />
            </label>
            <label>
              減光終了時刻
              <input
                id="sNightEnd"
                type="number"
                min={0}
                max={23}
                inputMode="numeric"
                value={draft.nightEndHour}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    nightEndHour:
                      e.target.value === '' ? 0 : parseInt(e.target.value, 10),
                  }))
                }
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>天気カードの位置情報設定</legend>
          <label className="chk">
            <input
              type="checkbox"
              id="sUseAutoLoc"
              checked={!!draft.useAutoLocation}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  useAutoLocation: e.target.checked,
                }))
              }
            />
            起動時に現在地を自動取得する（useAutoLocation）
          </label>
          <button
            type="button"
            id="btnGeoNow"
            className="btn-geo"
            disabled={geoLoading}
            onClick={handleFetchCurrentLocationNow}
          >
            <Icon name="pin" />
            {geoLoading ? '取得中…' : '今すぐ現在地を取得して反映'}
          </button>
          {geoMsg && (
            <div
              className={`geo-msg ${geoMsg.isError ? 'err' : 'ok'}`}
              role="status"
            >
              {geoMsg.text}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label style={{ gridColumn: '1 / -1' }}>
              表示地域名（天気カード用）
              <input
                id="sCityName"
                type="text"
                placeholder="例: 千葉県船橋市"
                value={draft.cityName}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, cityName: e.target.value }))
                }
              />
            </label>
            <label>
              緯度
              <input
                id="sLat"
                type="number"
                step="any"
                inputMode="decimal"
                value={draft.lat}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    lat: parseFloat(e.target.value),
                  }))
                }
              />
            </label>
            <label>
              経度
              <input
                id="sLon"
                type="number"
                step="any"
                inputMode="decimal"
                value={draft.lon}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    lon: parseFloat(e.target.value),
                  }))
                }
              />
            </label>
          </div>
        </fieldset>

        <button id="save" type="button" onClick={handleSave}>
          保存して更新
        </button>
        <button
          id="fs"
          type="button"
          onClick={() => {
            onToggleFullscreen();
            onClose();
          }}
        >
          全画面にする（画面2回タップでも切替可）
        </button>
        <button id="close" type="button" onClick={onClose}>
          閉じる
        </button>

        <div className="source-info">
          <h4>データ取得元 ＆ リアルタイム取得診断</h4>
          <div className="source-row">
            <strong>鉄道運行情報（Yahoo!路線情報 取得ステータス）</strong>
            <span className="source-url">
              https://transit.yahoo.co.jp/diainfo/area/4
            </span>
            <div className="diag-box" id="diag-train-box">
              {!trainDiag ? (
                '取得状況を確認中…'
              ) : !trainDiag.ok ? (
                <span style={{ color: 'var(--bad)' }}>
                  <Icon name="warn" />
                  取得に失敗しました（{trainDiag.source}経由）
                  <br />
                  原因: {trainDiag.error || '不明'}
                  <br />
                  GASのURL・公開設定（アクセスできるユーザー: 全員）をご確認ください。
                </span>
              ) : (
                <>
                  {trainDiag.error && (
                    <div style={{ color: 'var(--warm)', marginBottom: '4px' }}>
                      <Icon name="warn" />
                      GAS経由に失敗したため代替経路を使用中: {trainDiag.error}
                    </div>
                  )}
                  {trainDiag.troubles.length === 0 ? (
                    <span style={{ color: 'var(--good)' }}>
                      <Icon name="check" />
                      取得成功（{trainDiag.source}経由・{trainDiag.parsedRows}
                      路線を検査：現在トラブル路線は0件です）
                    </span>
                  ) : (
                    <>
                      <div
                        style={{
                          color: 'var(--warm)',
                          fontWeight: 700,
                          marginBottom: '4px',
                        }}
                      >
                        <Icon name="warn" />
                        検出中の路線（{trainDiag.source}経由・計
                        {trainDiag.troubles.length}件）:
                      </div>
                      {trainDiag.troubles.map((t, i) => (
                        <React.Fragment key={t.name + i}>
                          {i > 0 && <br />}・<b>{t.name}</b>（{t.status}）
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="source-row">
            <strong>天気・気温・降水確率</strong>
            <span>Open-Meteo Weather Forecast API</span>
            <span className="source-url">
              https://api.open-meteo.com/v1/forecast
            </span>
          </div>
          <div className="source-row">
            <strong>ニュース記事</strong>
            <span>NHK ONE 公式RSSフィード等</span>
            <span className="source-url" id="info-rss-url">
              {draft.newsRss || '未設定'}
            </span>
          </div>
          <div className="source-row">
            <strong>地震情報（震度・震源・規模）</strong>
            <span>P2P地震情報 JSON API v2</span>
            <span className="source-url">
              https://api.p2pquake.net/v2/history?codes=551
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
