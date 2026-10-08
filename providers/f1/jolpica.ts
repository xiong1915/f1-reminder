// providers/f1/jolpica.ts
// Jolpica-F1 (Ergast-compatible) API 数据提供者，支持超时与异常捕获

import {
  normalizeJolpicaRace,
  normalizeJolpicaDriverStandings,
  normalizeJolpicaConstructorStandings,
  normalizeJolpicaLastResult
} from '../../lib/f1/normalize';
import { F1Meeting, DriverStanding, ConstructorStanding, RaceResultSummary } from '../../lib/f1/types';

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
const REQUEST_TIMEOUT_MS = 10000;

async function fetchWithTimeout(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
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

export async function fetchJolpicaCalendar(season: string = 'current'): Promise<F1Meeting[]> {
  const json = await fetchWithTimeout(`${JOLPICA_BASE}/${season}.json`);
  const races = json?.MRData?.RaceTable?.Races;
  if (!Array.isArray(races)) throw new Error('Invalid races payload from Jolpica');
  return races.map(normalizeJolpicaRace);
}

export async function fetchJolpicaDriverStandings(season: string = 'current'): Promise<DriverStanding[]> {
  const json = await fetchWithTimeout(`${JOLPICA_BASE}/${season}/driverStandings.json`);
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings;
  if (!Array.isArray(list)) throw new Error('Invalid driver standings payload from Jolpica');
  return normalizeJolpicaDriverStandings(list);
}

export async function fetchJolpicaConstructorStandings(season: string = 'current'): Promise<ConstructorStanding[]> {
  const json = await fetchWithTimeout(`${JOLPICA_BASE}/${season}/constructorStandings.json`);
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings;
  if (!Array.isArray(list)) throw new Error('Invalid constructor standings payload from Jolpica');
  return normalizeJolpicaConstructorStandings(list);
}

export async function fetchJolpicaLastResult(): Promise<RaceResultSummary> {
  const json = await fetchWithTimeout(`${JOLPICA_BASE}/current/last/results.json`);
  const race = json?.MRData?.RaceTable?.Races?.[0];
  if (!race) throw new Error('Invalid last race payload from Jolpica');
  return normalizeJolpicaLastResult(race);
}
