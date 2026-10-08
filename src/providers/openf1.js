// src/providers/openf1.js
// OpenF1 API 数据提供者 (用于会话时间、实时天气与赛道元数据)

const OPENF1_BASE = 'https://api.openf1.org/v1';
const REQUEST_TIMEOUT_MS = 6000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TIKE-F1-Engine/2.0'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOpenF1Meetings(year = 2026) {
  const data = await fetchWithTimeout(`${OPENF1_BASE}/meetings?year=${year}`);
  if (!Array.isArray(data)) throw new Error('Invalid OpenF1 meetings payload');
  return data;
}

export async function fetchOpenF1Sessions(meetingKey) {
  if (!meetingKey) return [];
  const data = await fetchWithTimeout(`${OPENF1_BASE}/sessions?meeting_key=${meetingKey}`);
  if (!Array.isArray(data)) return [];
  return data;
}

export async function fetchOpenF1LiveWeather(meetingKey) {
  if (!meetingKey) return null;
  try {
    const data = await fetchWithTimeout(`${OPENF1_BASE}/weather?meeting_key=${meetingKey}`);
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[data.length - 1];
      return {
        airTemp: latest.air_temperature,
        trackTemp: latest.track_temperature,
        humidity: latest.humidity,
        rainfall: latest.rainfall > 0,
        windSpeed: latest.wind_speed,
        pressure: latest.pressure
      };
    }
  } catch (e) {
    // 允许天气获取静默降级
  }
  return null;
}
