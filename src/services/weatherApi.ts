export interface HourlyForecastItem {
  time: string;
  temp: number;
  pop: number;
  code: number;
}

export interface WeatherData {
  temp: number;
  code: number;
  desc: string;
  pop: number;
  hi: number;
  lo: number;
  hourly: HourlyForecastItem[];
  cityName?: string;
}

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    weather_code: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export function wxLabel(code: number): string {
  const c = +code;
  if (c === 0) return '快晴';
  if (c <= 2) return '晴れ時々曇';
  if (c === 3) return '曇り';
  if (c <= 48) return '霧';
  if (c <= 57) return '小雨';
  if (c <= 67) return '雨';
  if (c <= 77) return '雪';
  if (c <= 82) return '強い雨';
  if (c >= 95) return '雷雨';
  return '曇り';
}

export async function fetchWeatherData(
  lat: number,
  lon: number,
  cityName?: string
): Promise<WeatherData | null> {
  try {
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
      lat
    )}&longitude=${encodeURIComponent(
      lon
    )}&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo&forecast_days=2`;

    const r = await fetch(wxUrl);
    if (!r.ok) return null;
    const wxRes = (await r.json()) as OpenMeteoResponse;

    const curCode = wxRes.current.weather_code;
    const nowHour = new Date().getHours();

    const hourly: HourlyForecastItem[] = [];
    for (let i = nowHour; i < nowHour + 18; i += 3) {
      if (wxRes.hourly.time[i]) {
        hourly.push({
          time: wxRes.hourly.time[i],
          temp: wxRes.hourly.temperature_2m[i],
          pop: wxRes.hourly.precipitation_probability[i],
          code: wxRes.hourly.weather_code[i],
        });
      }
    }

    return {
      temp: wxRes.current.temperature_2m,
      code: curCode,
      desc: wxLabel(curCode),
      pop: wxRes.hourly.precipitation_probability[nowHour] || 0,
      hi: wxRes.daily.temperature_2m_max[0],
      lo: wxRes.daily.temperature_2m_min[0],
      hourly,
      cityName,
    };
  } catch (_) {
    return null;
  }
}
