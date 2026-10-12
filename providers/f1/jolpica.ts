// providers/f1/jolpica.ts
// Jolpica-F1 (Ergast-compatible) API 数据提供者
// 全面支持 1950-2026 历年赛历、积分榜与各节成绩，支持 limit=100 及全部分页获取

import {
  normalizeJolpicaRace,
  normalizeJolpicaDriverStandings,
  normalizeJolpicaConstructorStandings,
  normalizeJolpicaLastResult,
  normalizeJolpicaRaceResultsList,
  normalizeJolpicaQualifyingResultsList,
  normalizeJolpicaSprintResultsList
} from '../../lib/f1/normalize';
import type {
  F1Meeting,
  DriverStanding,
  ConstructorStanding,
  RaceResultSummary,
  DetailedRaceResultItem,
  DetailedQualifyingResultItem,
  DetailedSprintResultItem
} from '../../lib/f1/types';

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

/**
 * 获取所有支持的赛季列表 (从 1950 至最新赛季)
 */
export async function fetchJolpicaSeasons(): Promise<string[]> {
  try {
    const json = await fetchWithTimeout(`${JOLPICA_BASE}/seasons.json?limit=100`);
    const seasons = json?.MRData?.SeasonTable?.Seasons;
    if (Array.isArray(seasons) && seasons.length > 0) {
      return seasons.map((s: any) => String(s.season)).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
    }
  } catch (err) {
    console.warn('获取 Jolpica 赛季列表失败，采用权威历史年份回退:', err);
  }

  // 兜底生成 1950 - 2026 年份列表 (从新到旧)
  const fallbackSeasons: string[] = [];
  for (let y = new Date().getUTCFullYear(); y >= 1950; y--) {
    fallbackSeasons.push(String(y));
  }
  return fallbackSeasons;
}

/**
 * 获取指定赛季赛历 (支持 limit=100)
 */
export async function fetchJolpicaCalendar(season: string = 'current'): Promise<F1Meeting[]> {
  const json = await fetchWithTimeout(`${JOLPICA_BASE}/${season}.json?limit=100`);
  const races = json?.MRData?.RaceTable?.Races;
  if (!Array.isArray(races)) throw new Error('Invalid races payload from Jolpica');
  if (season !== 'current' && races.some((race: any) => String(race.season) !== season)) {
    throw new Error('Calendar season mismatch');
  }
  return races.map(normalizeJolpicaRace);
}

/**
 * 获取指定赛季车手积分榜 (支持分页并合并全部结果，不截断为 30 条)
 */
async function fetchStandingsPages(season: string, kind: 'Driver' | 'Constructor', scopeRound?: number): Promise<{ rows: any[]; round?: number }> {
  const rows: any[] = [];
  let round: number | undefined;
  let expectedTotal: number | undefined;
  for (let offset = 0; offset < 10000; offset += 100) {
    const json = await fetchWithTimeout(`${JOLPICA_BASE}/${season}/${scopeRound ? `${scopeRound}/` : ''}${kind.toLowerCase()}Standings.json?limit=100&offset=${offset}`);
    const lists = json?.MRData?.StandingsTable?.StandingsLists;
    if (offset === 0 && Array.isArray(lists) && lists.length === 0 && kind === 'Constructor' && Number(season) < 1958) return { rows: [] };
    const snapshot = lists?.[0];
    const page = snapshot?.[`${kind}Standings`];
    const total = Number(json?.MRData?.total);
    const pageRound = Number(snapshot?.round);
    if (!Array.isArray(page) || !Number.isInteger(total) || total < 0 || String(snapshot?.season) !== season || !Number.isInteger(pageRound) || pageRound < 1) throw new Error('Invalid standings page');
    if (offset === 0) { round = pageRound; expectedTotal = total; }
    if (pageRound !== round || total !== expectedTotal || (scopeRound && pageRound !== scopeRound)) throw new Error('Standings changed during pagination');
    rows.push(...page);
    if (rows.length === total) {
      const ids = rows.map(r => kind === 'Driver' ? r.Driver?.driverId : r.Constructor?.constructorId);
      if (ids.some(id => !id) || new Set(ids).size !== rows.length) throw new Error('Duplicate or missing standings entries');
      return { rows, round };
    }
    if (page.length !== 100 || rows.length > total) throw new Error('Incomplete standings pagination');
  }
  throw new Error('Standings pagination limit exceeded');
}

export async function fetchJolpicaDriverStandings(season: string = 'current', scopeRound?: number): Promise<DriverStanding[]> {
  if (season === 'current') season = String(new Date().getUTCFullYear());
  const { rows, round } = await fetchStandingsPages(season, 'Driver', scopeRound);
  return normalizeJolpicaDriverStandings(rows, round);
}
/**
 * 获取指定赛季车队积分榜 (1950-1957 年车队榜未设立，返回空数组，不报错)
 */
export async function fetchJolpicaConstructorStandings(season: string = 'current', scopeRound?: number): Promise<ConstructorStanding[]> {
  if (season === 'current') season = String(new Date().getUTCFullYear());
  const { rows, round } = await fetchStandingsPages(season, 'Constructor', scopeRound);
  return normalizeJolpicaConstructorStandings(rows, round);
}
/**
 * 获取最新分站赛果
 */
export async function fetchJolpicaLastResult(season: string = 'current'): Promise<RaceResultSummary> {
  const json = await fetchWithTimeout(`${JOLPICA_BASE}/${season}/last/results.json`);
  const race = json?.MRData?.RaceTable?.Races?.[0];
  if (!race) throw new Error('Invalid last race payload from Jolpica');
  if (season !== 'current' && String(race.season) !== season) throw new Error('Race result season mismatch');
  if (!Array.isArray(race.Results) || !race.Results.length || String(race.Results[0]?.position) !== '1') throw new Error('Published winner unavailable');
  return normalizeJolpicaLastResult(race);
}

/**
 * 获取指定分站正赛详细赛果
 */
export async function fetchJolpicaRaceResult(season: string, round: number | string): Promise<DetailedRaceResultItem[]> {
  const json = await fetchWithTimeout(`${JOLPICA_BASE}/${season}/${round}/results.json?limit=100`);
  const race = json?.MRData?.RaceTable?.Races?.[0];
  if (!race) return [];
  if (String(race.season) !== season || Number(race.round) !== Number(round)) throw new Error('Race result scope mismatch');
  return normalizeJolpicaRaceResultsList(race);
}

/**
 * 获取指定分站排位详细赛果
 */
export async function fetchJolpicaQualifyingResult(season: string, round: number | string): Promise<DetailedQualifyingResultItem[]> {
  const json = await fetchWithTimeout(`${JOLPICA_BASE}/${season}/${round}/qualifying.json?limit=100`);
  const race = json?.MRData?.RaceTable?.Races?.[0];
  if (!race) return [];
  if (String(race.season) !== season || Number(race.round) !== Number(round)) throw new Error('Race result scope mismatch');
  return normalizeJolpicaQualifyingResultsList(race);
}

/**
 * 获取指定分站冲刺赛详细赛果
 */
export async function fetchJolpicaSprintResult(season: string, round: number | string): Promise<DetailedSprintResultItem[]> {
  const json = await fetchWithTimeout(`${JOLPICA_BASE}/${season}/${round}/sprint.json?limit=100`);
  const race = json?.MRData?.RaceTable?.Races?.[0];
  if (!race) return [];
  if (String(race.season) !== season || Number(race.round) !== Number(round)) throw new Error('Race result scope mismatch');
  return normalizeJolpicaSprintResultsList(race);
}
