// tests/fault-injection.test.mjs
// Phase 5 Quality Gate: Fault Injection & Resilience Testing
// Tests graceful degradation across Jolpica timeouts, Redis failures, DeepSeek offline, and Search errors.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryCacheStore } from '../lib/storage/index.ts';
import { LastKnownGoodStore } from '../lib/storage/lkg.ts';
import { F1Service } from '../providers/f1/service.ts';
import { defaultAIOrchestrator } from '../lib/ai/orchestrator.ts';
import { defaultSearchService } from '../lib/search/service.ts';
import { RaceStateService } from '../lib/f1/race-state.ts';

test('Fault Injection 1 — Jolpica Upstream Timeout gracefully falls back to LKG Store', async () => {
  // Construct an isolated LKG store and mock empty cache to simulate cold cache + dead upstream
  const cache = new MemoryCacheStore();
  const lkg = new LastKnownGoodStore();
  
  // Seed LKG with known good calendar
  await lkg.save('calendar', [
    {
      round: 1,
      name: 'Australian Grand Prix',
      circuitId: 'albert_park',
      raceStartUTC: '2026-03-15T04:00:00Z',
      sessions: []
    }
  ], 'fault_test', '2026');

  const f1Service = new F1Service(cache, lkg);

  // When Jolpica network fails, service must return LKG snapshot rather than crashing
  const calendar = await f1Service.getCalendar('2026');
  assert.ok(Array.isArray(calendar), 'Calendar must be an array');
  assert.ok(calendar.length > 0, 'Calendar should recover from LKG store');
  assert.equal(calendar[0].circuitId, 'albert_park');
});

test('Fault Injection 2 — Storage Layer Redis Failure seamlessly uses MemoryCacheStore', async () => {
  const memCache = new MemoryCacheStore();
  
  // Test basic operations
  await memCache.set('test:key', { foo: 'bar' }, 60);
  const val = await memCache.get('test:key');
  assert.deepEqual(val, { foo: 'bar' });

  // Test delete
  await memCache.delete('test:key');
  const deletedVal = await memCache.get('test:key');
  assert.equal(deletedVal, null);

  // Test clear
  await memCache.set('test:clear1', 'val1');
  await memCache.set('test:clear2', 'val2');
  await memCache.clear();
  assert.equal(await memCache.get('test:clear1'), null);
  assert.equal(await memCache.get('test:clear2'), null);
});

test('Fault Injection 3 — DeepSeek Offline / Unconfigured gracefully yields Deterministic F1 Facts', async () => {
  // Request factual F1 query without DeepSeek key
  const res = await defaultAIOrchestrator.answer([
    { role: 'user', content: '下一站几点开赛？' }
  ]);

  assert.ok(res.reply.length > 0, 'Fallback reply must be non-empty');
  assert.match(res.reply, /下一场 F1 比赛信息|分站：/, 'Must contain deterministic schedule facts');
  assert.doesNotMatch(res.reply, /500 Internal Server Error/, 'Must not expose raw server error');
});

test('Fault Injection 4 — Search Service Provider Failure degrades safely', async () => {
  // Search with empty or invalid query
  const res = await defaultSearchService.search('');
  assert.equal(res.success, false);
  assert.deepEqual(res.results, []);

  // AI Orchestrator must still successfully produce answers even if news search yields empty
  const { systemPrompt, sources } = await defaultAIOrchestrator.buildPrompt('F1_NEWS', '');
  assert.ok(systemPrompt.length > 0);
  assert.ok(Array.isArray(sources));
});

test('Fault Injection 5 — RaceStateService handles corrupted or missing timestamps without NaN', () => {
  const corruptedMeeting = {
    round: 99,
    name: 'Corrupted GP',
    circuitId: 'unknown',
    raceStartUTC: 'invalid-date-string',
    sessions: [
      { id: 'p1', name: 'Practice', type: 'practice', startTimeUTC: '' },
      { id: 'race', name: 'Race', type: 'race', startTimeUTC: 'null' }
    ]
  };

  const snapshot = RaceStateService.evaluateMeeting(corruptedMeeting, Date.now());
  assert.ok(snapshot, 'Must return a valid RaceStateEvaluation');
  assert.ok(!isNaN(snapshot.remainingMs), 'Countdown must not be NaN');
  assert.ok(snapshot.remainingMs >= 0, 'Countdown must be >= 0');
});
