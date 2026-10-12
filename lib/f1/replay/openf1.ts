import type { ReplayFrame, ReplaySessionMetadata, TelemetryVehicleState } from './types';
import { setTimeout as delay } from 'node:timers/promises';

// OpenF1 historical API, https://openf1.org/docs/ (unofficial, 2023 onwards).
export interface OpenSession {
  session_key: number; year: number; session_name: string; date_start: string;
  date_end: string; circuit_short_name: string; location: string; country_name: string;
}
export interface ReplayManifest {
  session: OpenSession; metadata: ReplaySessionMetadata; drivers: any[];
  bounds: { minX: number; minY: number; span: number };
}
const BASE = 'https://api.openf1.org/v1/';
let nextRequestAt = 0;
const manifests = new Map<number, ReplayManifest>();

export async function openF1(endpoint: string, params: Record<string, string | number>, signal?: AbortSignal): Promise<any[]> {
  const url = new URL(endpoint, BASE);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000);
  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const slot = Math.max(Date.now(), nextRequestAt); nextRequestAt = slot + 400;
    if (slot > Date.now()) await delay(slot - Date.now(), undefined, { signal: requestSignal });
    response = await fetch(url, { signal: requestSignal, next: { revalidate: 86400 } });
    if (response.status !== 429 || attempt === 2) break;
    const retry = Number(response.headers.get('retry-after'));
    await response.body?.cancel();
    await delay(Math.min(10000, Math.max(1500, Number.isFinite(retry) ? retry * 1000 : 1500)), undefined, { signal: requestSignal });
  }
  if (!response) throw new Error('OpenF1 response unavailable');
  if (!response.ok) throw new Error(`OpenF1 ${endpoint}: HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Invalid OpenF1 response');
  return rows;
}

export async function getReplayManifest(sessionKey: number, signal?: AbortSignal): Promise<ReplayManifest> {
  signal?.throwIfAborted();
  const cached = manifests.get(sessionKey);
  if (cached) return cached;
  const sessions = await openF1('sessions', { session_key: sessionKey }, signal);
  const session = sessions[0] as OpenSession;
  if (!session || session.session_name !== 'Race' || Date.parse(session.date_end) >= Date.now()) throw new Error('Only completed historical races are supported');
  const drivers = await openF1('drivers', { session_key: sessionKey }, signal);
  if (!drivers.length) throw new Error('Driver data unavailable');
  const laps = await openF1('laps', { session_key: sessionKey }, signal);
  const lap = laps.find(l => l.driver_number === drivers[0].driver_number && l.lap_number >= 2 && l.lap_duration > 40 && l.lap_duration < 180 && l.date_start);
  if (!lap) throw new Error('Track reference lap unavailable');
  const points = await openF1('location', {
    session_key: sessionKey, driver_number: drivers[0].driver_number,
    'date>': lap.date_start, 'date<': new Date(Date.parse(lap.date_start) + lap.lap_duration * 1000).toISOString()
  }, signal);
  const valid = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y) && (p.x !== 0 || p.y !== 0));
  if (valid.length < 30) throw new Error('Track coordinates unavailable');
  const minX = Math.min(...valid.map(p => p.x)); const minY = Math.min(...valid.map(p => p.y));
  const span = Math.max(Math.max(...valid.map(p => p.x)) - minX, Math.max(...valid.map(p => p.y)) - minY);
  if (!(span > 0)) throw new Error('Invalid track bounds');
  const recordedFinish = Math.max(...laps.filter(l => l.date_start && Number.isFinite(l.lap_duration) && l.lap_duration > 0).map(l => Date.parse(l.date_start) + l.lap_duration * 1000));
  const durationSeconds = (Math.min(Date.parse(session.date_end), recordedFinish) - Date.parse(session.date_start)) / 1000;
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error('Invalid session duration');
  const trackPath = valid.filter((_, i) => i % 3 === 0).map(p => [0.08 + 0.84 * (p.x - minX) / span, 0.92 - 0.84 * (p.y - minY) / span] as [number, number]);
  const manifest: ReplayManifest = {
    session, drivers, bounds: { minX, minY, span },
    metadata: { coordinateAspectRatio: 1, id: `openf1-${sessionKey}`, title: `${session.year} ${session.country_name} · ${session.circuit_short_name} 正赛`,
      season: String(session.year), round: 0, meetingName: session.country_name, locality: session.location,
      circuitId: String(sessionKey), circuitName: session.circuit_short_name, durationSeconds, fps: 2,
      totalFrames: Math.ceil(durationSeconds * 2), trackPath, corners: [], drsZones: [], sourceProvider: 'openf1' }
  };
  if (manifests.size >= 8) manifests.delete(manifests.keys().next().value!);
  manifests.set(sessionKey, manifest);
  return manifest;
}

export function buildOpenFrames(manifest: ReplayManifest, offsetSeconds: number, locations: any[], telemetry: any[], positions: any[], laps: any[]): ReplayFrame[] {
  const origin = Date.parse(manifest.session.date_start);
  const group = (rows: any[], dateField = 'date') => {
    const map = new Map<number, any[]>();
    for (const row of rows) {
      const time = Date.parse(row[dateField]);
      if (!Number.isFinite(time)) continue;
      const list = map.get(row.driver_number) || [];
      list.push({ ...row, time }); map.set(row.driver_number, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.time - b.time);
    return map;
  };
  const loc = group(locations); const car = group(telemetry); const pos = group(positions); const lapMap = group(laps, 'date_start');
  const at = (list: any[] | undefined, time: number) => {
    if (!list?.length) return undefined;
    let lo = 0, hi = list.length - 1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (list[mid].time <= time) lo = mid + 1; else hi = mid - 1; }
    return hi >= 0 ? list[hi] : undefined;
  };
  const frames: ReplayFrame[] = [];
  const end = Math.min(offsetSeconds + 60, manifest.metadata.durationSeconds);
  for (let sec = offsetSeconds; sec <= end; sec += 0.5) {
    const time = origin + sec * 1000;
    const vehicles: TelemetryVehicleState[] = [];
    for (const driver of manifest.drivers) {
      const p = at(loc.get(driver.driver_number), time);
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || (p.x === 0 && p.y === 0)) continue;
      const t = at(car.get(driver.driver_number), time); const position = at(pos.get(driver.driver_number), time);
      const lap = at(lapMap.get(driver.driver_number), time);
      const stale = time - p.time > 3000;
      const telemetryStale = !t || time - t.time > 3000;
      vehicles.push({ driverNumber: driver.driver_number, code: driver.name_acronym || String(driver.driver_number),
        name: driver.full_name, team: driver.team_name, teamColor: `#${driver.team_colour || 'ffffff'}`,
        normX: 0.08 + 0.84 * (p.x - manifest.bounds.minX) / manifest.bounds.span,
        normY: 0.92 - 0.84 * (p.y - manifest.bounds.minY) / manifest.bounds.span,
        speed: telemetryStale ? 0 : t.speed, gear: telemetryStale ? 0 : t.n_gear, rpm: telemetryStale ? undefined : t.rpm,
        drs: !telemetryStale && [10, 12, 14].includes(t.drs), lap: lap?.lap_number || 0,
        position: position?.position || 0, stale, telemetryStale, sampleTimestampMs: p.time - origin });
    }
    frames.push({ frameIndex: Math.round(sec * 2), timestampMs: sec * 1000, lap: Math.max(0, ...vehicles.map(v => v.lap)), vehicles });
  }
  return frames;
}

export async function getReplayWindow(manifest: ReplayManifest, offset: number, signal?: AbortSignal): Promise<ReplayFrame[]> {
  const key = manifest.session.session_key;
  const origin = Date.parse(manifest.session.date_start);
  const params = { session_key: key, 'date>': new Date(origin + Math.max(0, offset - 5) * 1000).toISOString(),
    'date<': new Date(origin + Math.min(offset + 61, manifest.metadata.durationSeconds) * 1000).toISOString() };
  const [locations, telemetry, positions, laps] = await Promise.all([
    openF1('location', params, signal), openF1('car_data', params, signal),
    openF1('position', { session_key: key }, signal), openF1('laps', { session_key: key }, signal)
  ]);
  return buildOpenFrames(manifest, offset, locations, telemetry, positions, laps);
}
