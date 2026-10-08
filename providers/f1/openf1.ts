// providers/f1/openf1.ts
// OpenF1 API 数据提供者 (遵守免费层原则，仅调用公开免费可用 endpoints)

const OPENF1_BASE = 'https://api.openf1.org/v1';
const REQUEST_TIMEOUT_MS = 6000;

async function fetchOpenF1(endpoint: string, params: Record<string, string | number> = {}): Promise<any[]> {
  const url = new URL(`${OPENF1_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.append(k, String(v));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TIKE-V3-Engine/3.0'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOpenF1Meetings(year: number = 2026): Promise<any[]> {
  return fetchOpenF1('meetings', { year });
}

export async function fetchOpenF1Sessions(meetingKey: number | string): Promise<any[]> {
  return fetchOpenF1('sessions', { meeting_key: meetingKey });
}

export async function fetchOpenF1Weather(sessionKey: number | string): Promise<any[]> {
  return fetchOpenF1('weather', { session_key: sessionKey });
}
