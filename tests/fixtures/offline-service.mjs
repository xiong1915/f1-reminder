// Test-only synthetic input. Never import from application code.
import { F1Service } from '../../providers/f1/service.ts';
import { MemoryCacheStore } from '../../lib/storage/index.ts';
import { LastKnownGoodStore } from '../../lib/storage/lkg.ts';
import { normalizeJolpicaRace } from '../../lib/f1/normalize.ts';
import { FIXTURE_2026_CALENDAR, FIXTURE_2026_DRIVERS, FIXTURE_2026_CONSTRUCTORS, FIXTURE_LAST_RACE } from './2026_season_fixture.ts';

const circuitIds = ['albert_park', 'shanghai', 'suzuka', 'miami', 'villeneuve',
  'monaco', 'catalunya', 'red_bull_ring', 'silverstone', 'spa', 'hungaroring',
  'zandvoort', 'monza', 'madring', 'baku', 'sepang', 'marina_bay', 'americas',
  'rodriguez', 'interlagos', 'vegas', 'losail', 'yas_marina'];

export async function createFixtureF1Service() {
  const cache = new MemoryCacheStore();
  const calendar = FIXTURE_2026_CALENDAR.map((race, index) => normalizeJolpicaRace({
    season: '2026', round: String(race.round), raceName: race.name,
    date: race.dateEnd, time: '14:00:00Z',
    Circuit: { circuitId: circuitIds[index], circuitName: race.circuit,
      Location: { country: 'Test country', locality: 'Test city' } },
    FirstPractice: { date: race.dateStart, time: '10:00:00Z' },
    Qualifying: { date: race.dateStart, time: '14:00:00Z' },
    ...(race.isSprint ? { Sprint: { date: race.dateStart, time: '12:00:00Z' } } : {})
  }));
  for (const [key, value] of [
    ['calendar', calendar],
    ['standings:drivers', FIXTURE_2026_DRIVERS],
    ['standings:constructors', FIXTURE_2026_CONSTRUCTORS],
    ['results:last', FIXTURE_LAST_RACE]
  ]) {
    await cache.set(`f1:v3:${key}:2026`, structuredClone(value), 3600);
  }
  // Private memory cache and no disk backup: no production state or network required.
  return new F1Service(cache, new LastKnownGoodStore(cache, ''));
}
