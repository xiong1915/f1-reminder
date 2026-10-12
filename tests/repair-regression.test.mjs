import test from 'node:test';
import assert from 'node:assert/strict';
import { determineStandingsCutoff } from '../providers/f1/service.ts';
import { fetchJolpicaDriverStandings } from '../providers/f1/jolpica.ts';
import { buildOpenFrames } from '../lib/f1/replay/openf1.ts';
import { checkUrlSafety } from '../lib/search/url_safety.ts';
import { filterAndRankCandidates } from '../lib/search/filter.ts';
import { defaultAIOrchestrator } from '../lib/ai/orchestrator.ts';
import { SearchService } from '../lib/search/service.ts';
import { normalizeJolpicaLastResult } from '../lib/f1/normalize.ts';
import { defaultF1Service } from '../providers/f1/service.ts';
import { GET as getCalendarAPI } from '../app/api/f1/calendar/route.ts';
import { NextRequest } from 'next/server';

const calendar = [{ season: '2026', round: 17, nameZh: '新加坡', isSprintWeekend: true }];
test('single-driver deltas never certify sprint or race', () => {
  for (const delta of [8, 25, 26, 33, 34]) {
    const result = determineStandingsCutoff([{ driverId: 'a', points: 340, officialRound: 17 }], [{ teamId: 't', points: 500, officialRound: 17 }], calendar, undefined, undefined, '2026', { previousRoundDriverPoints: { a: 340 - delta } });
    assert.equal(result.verified, false);
  }
});
test('full official driver and constructor result reconciliation certifies correct session only', () => {
  const driver = [{ driverId: 'a', points: 133, officialRound: 17 }, { driverId: 'b', points: 75, officialRound: 17 }];
  const teams = [{ teamId: 't', points: 208, officialRound: 17 }];
  const evidence = { season: '2026', round: 17, previousRoundDriverPoints: { a: 100, b: 50 }, previousRoundConstructorPoints: { t: 150 },
    sprintResults: [{ driverId: 'a', constructorId: 't', points: 8 }, { driverId: 'b', constructorId: 't', points: 7 }],
    raceResults: [{ driverId: 'a', constructorId: 't', points: 25 }, { driverId: 'b', constructorId: 't', points: 18 }] };
  assert.equal(determineStandingsCutoff(driver, teams, calendar, undefined, undefined, '2026', evidence).reason, 'FULL_RESULTS_RECONCILED_RACE');
  assert.equal(determineStandingsCutoff(driver, [{ ...teams[0], points: 207 }], calendar, undefined, undefined, '2026', evidence).verified, false);
  assert.equal(determineStandingsCutoff(driver, teams, calendar, undefined, undefined, '2026', { ...evidence, round: 16 }).verified, false);
});
test('historical certification needs matching final rounds and a published final result', () => {
  const drivers = [{ officialRound: 22 }], teams = [{ officialRound: 22 }], races = Array.from({length:22}, (_, i) => ({ season: '2023', round: i+1 }));
  assert.equal(determineStandingsCutoff(drivers, teams, races, undefined, undefined, '2023').verified, false);
  assert.equal(determineStandingsCutoff(drivers, teams, races, { season: '2023', round: 22, winner: { code: 'VER' } }, undefined, '2023').verified, true);
  assert.equal(determineStandingsCutoff(drivers, [{ officialRound: 21 }], races, { round: 22, winner: {} }, undefined, '2023').verified, false);
});
test('pagination rejects malformed later pages and changing round, instead of publishing partial standings', async () => {
  const original = globalThis.fetch;
  const first = Array.from({ length: 100 }, (_, i) => ({ position: String(i + 1), points: '1', wins: '0', Driver: { driverId: `d${i}` }, Constructors: [] }));
  try {
    for (const malformed of [true, false]) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return new Response(JSON.stringify({ MRData: { total: '101', StandingsTable: { StandingsLists: [{ season: '2023', round: calls === 1 ? '22' : '21', DriverStandings: calls === 1 ? first : malformed ? undefined : [first[0]] }] } } }));
      };
      await assert.rejects(fetchJolpicaDriverStandings('2023'), /Invalid standings page|changed during pagination/);
      assert.equal(calls, 2);
    }
  } finally { globalThis.fetch = original; }
});
test('real replay joins source timestamps without inventing missing telemetry or ranks', () => {
  const manifest = { session: { date_start: '2023-01-01T00:00:00Z' }, metadata: { durationSeconds: 7200 },
    drivers: [{ driver_number: 1, name_acronym: 'VER', full_name: 'Max', team_name: 'Red Bull', team_colour: '0000ff' }], bounds: { minX: 0, minY: 0, span: 100 } };
  const frames = buildOpenFrames(manifest, 600, [{ date: '2023-01-01T00:10:00Z', driver_number: 1, x: 50, y: 50 }], [], [], []);
  assert.equal(frames[0].timestampMs, 600000); assert.equal(frames.at(-1).timestampMs, 660000);
  assert.equal(frames[0].vehicles[0].telemetryStale, true); assert.equal(frames[0].vehicles[0].position, 0);
  assert.equal(frames[10].vehicles[0].stale, true); assert.equal(frames[0].vehicles[0].sampleTimestampMs, 600000);
});
test('IPv6 loopback and mapped private IPv4 cannot bypass URL checks', () => {
  for (const url of ['http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[::ffff:192.168.1.1]/', 'http://[fe80::1]/']) assert.equal(checkUrlSafety(url).safe, false);
});
test('English official Singapore result survives Chinese meeting context; wrong year is rejected', () => {
  const items = [2023, 2024].map(year => ({ title: `${year} Singapore Grand Prix race result`, snippet: 'Formula 1 Singapore race', url: `https://www.formula1.com/en/results/${year}/races`, source: '' }));
  const filtered = filterAndRankCandidates(items, { query: '2023 新加坡正赛', season: '2023', meetingName: '新加坡', isOfficialOnly: true });
  assert.equal(filtered.length, 1); assert.ok(filtered[0].title.includes('2023'));
});
test('historical race question cannot be answered with season standings', () => {
  assert.equal(defaultAIOrchestrator.getCanonicalFactBlock('F1_FACTUAL', '2008 巴西站正赛谁赢了', {}, [], { season: '2008', standings: [{ rank: 1, name: 'Hamilton', points: 98 }] }), null);
});
test('historical constructor question uses constructor points, with pre-1958 award absence', () => {
  const snapshot = { season: '2008', standings: [{ rank: 1, name: 'Hamilton', points: 98 }], constructorStandings: [{ rank: 1, name: 'Ferrari', points: 172 }] };
  const result = defaultAIOrchestrator.getCanonicalFactBlock('F1_FACTUAL', '2008年车队积分榜第一', {}, [], snapshot);
  assert.match(result.factText, /Ferrari.*172/); assert.ok(!result.factText.includes('Hamilton'));
  assert.match(defaultAIOrchestrator.getCanonicalFactBlock('F1_FACTUAL', '1950年车队积分榜', {}, [], { season: '1950', standings: [] }).factText, /1958/);
});
test('search cancellation stops before contacting any provider', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(new SearchService().search('unique cancelled query', undefined, controller.signal), { name: 'AbortError' });
});
test('historical round 16 result is not renamed to Malaysia', () => {
  const result = normalizeJolpicaLastResult({ season: '2023', round: '16', raceName: 'Singapore Grand Prix', Circuit: { circuitId: 'marina_bay', Location: { locality: 'Singapore' } }, Results: [{ position: '1', Driver: { driverId: 'sainz', code: 'SAI', givenName: 'Carlos', familyName: 'Sainz' }, Constructor: { constructorId: 'ferrari' } }] });
  assert.equal(result.locality, '新加坡'); assert.ok(!result.name.includes('马来西亚'));
});
test('unavailable official news search gives identical honest stream and nonstream responses', async () => {
  const original = defaultAIOrchestrator.buildPrompt;
  defaultAIOrchestrator.buildPrompt = async () => ({ systemPrompt: '', sources: [], searchResults: [], evidenceUnavailable: true });
  try {
    const messages = [{ role: 'user', content: '联网查汉密尔顿法拉利最新官方新闻' }];
    const answer = await defaultAIOrchestrator.answer(messages); let text = '';
    for await (const event of defaultAIOrchestrator.streamAnswer(messages)) if (event.type === 'delta') text += event.content;
    assert.equal(text, answer.reply); assert.match(text, /未取得.*可核实来源/); assert.equal(answer.sources.length, 0);
  } finally { defaultAIOrchestrator.buildPrompt = original; }
});
test('calendar API passes requested season and reports upstream unavailability as 503', async () => {
  const original = defaultF1Service.getCalendarResult;
  let season;
  defaultF1Service.getCalendarResult = async requested => { season = requested; return { data: [], source: 'unavailable', isStale: true }; };
  try {
    const response = await getCalendarAPI(new NextRequest('http://localhost/api/f1/calendar?season=1950'));
    assert.equal(season, '1950'); assert.equal(response.status, 503);
    assert.match((await response.json()).error, /暂不可用/);
  } finally { defaultF1Service.getCalendarResult = original; }
});
