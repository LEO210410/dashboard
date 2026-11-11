export interface ResolvedLocation {
  lat: number;
  lon: number;
  cityName: string;
  isFromGeolocation: boolean;
}

interface BigDataCloudResponse {
  principalSubdivision?: string;
  city?: string;
  locality?: string;
}

/**
 * 緯度・経度から逆ジオコーディングで日本の地域名（都道府県＋市区町村）を取得する
 */
export async function reverseGeocodeCityName(
  lat: number,
  lon: number,
  fallbackName = '現在地'
): Promise<string> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(lon)}&localityLanguage=ja`;
    const res = await fetch(url);
    if (!res.ok) return fallbackName;

    const data = (await res.json()) as BigDataCloudResponse;
    const pref = (data.principalSubdivision || '').trim();
    const city = (data.city || data.locality || '').trim();

    if (pref && city) {
      return city.startsWith(pref) ? city : `${pref}${city}`;
    }
    if (pref || city) {
      return pref || city;
    }
  } catch (_) {
    // ignore reverse geocode failure
  }
  return fallbackName;
}

/**
 * Geolocation API で現在地座標を取得し、逆ジオコーディングで地域名を解決する。
 * 設定ドロワーの「今すぐ現在地を取得して反映」ボタン等から直接呼び出す場合は
 * 失敗時に例外をスローする。
 */
export async function fetchCurrentLocationStrict(): Promise<ResolvedLocation> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    throw new Error('お使いのブラウザは位置情報取得（Geolocation API）に対応していません。');
  }

  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 6000,
      enableHighAccuracy: false,
      maximumAge: 300000,
    });
  });

  const lat = Number(pos.coords.latitude.toFixed(4));
  const lon = Number(pos.coords.longitude.toFixed(4));
  const cityName = await reverseGeocodeCityName(lat, lon, '現在地');

  return {
    lat,
    lon,
    cityName,
    isFromGeolocation: true,
  };
}

/**
 * サイネージ稼働用：権限拒否・タイムアウト・通信失敗時はエラーで停止させず、
 * 即座にプロファイルの固定座標（fallback）へフォールバックする。
 */
export async function resolveLocationWithFallback(fallback: {
  lat: number;
  lon: number;
  cityName: string;
}): Promise<ResolvedLocation> {
  try {
    const loc = await fetchCurrentLocationStrict();
    return {
      lat: loc.lat,
      lon: loc.lon,
      cityName: loc.cityName || fallback.cityName || '現在地',
      isFromGeolocation: true,
    };
  } catch (_) {
    return {
      lat: fallback.lat,
      lon: fallback.lon,
      cityName: fallback.cityName,
      isFromGeolocation: false,
    };
  }
}
