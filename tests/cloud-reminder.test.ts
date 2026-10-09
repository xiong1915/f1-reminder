import test from 'node:test';
import assert from 'node:assert/strict';
import { reminderDue, deliverReminder, DeliveryStore } from '../lib/f1/reminder-delivery';

function memoryStore() {
  const states = new Map<string, string>();
  const store: DeliveryStore = {
    async claim(key) { if (states.has(key)) return false; states.set(key, 'pending'); return true; },
    async finish(key, status) { states.set(key, status); },
    async release(key) { states.delete(key); },
    async readStatus(key) { return states.get(key) || null; }
  };
  return { states, store };
}
test('35-minute boundary, delayed catch-up, no early or post-start reminder', () => {
  const start = '2026-10-10T09:00:00Z';
  const t = Date.parse(start);
  assert.equal(reminderDue(start, t - 35 * 60000 - 1), false);
  assert.equal(reminderDue(start, t - 35 * 60000), true);
  assert.equal(reminderDue(start, t - 29 * 60000), true);
  assert.equal(reminderDue(start, t), false);
  assert.equal(reminderDue('invalid', t), false);
});
test('concurrent checks and repeated triggers send once', async () => {
  const {store, states} = memoryStore(); let sent = 0;
  const send = async () => { sent++; return 'sent' as const; };
  await Promise.all([deliverReminder('race', store, send), deliverReminder('race', store, send)]);
  assert.equal(sent, 1); assert.equal(states.get('race'), 'sent');
});
test('explicit rejection permits retry; ambiguous failure is retained separately', async () => {
  const {store, states} = memoryStore();
  assert.equal(await deliverReminder('race', store, async () => 'rejected'), 'failed');
  assert.equal(states.has('race'), false);
  assert.equal(await deliverReminder('race', store, async () => 'sent'), 'sent');
  assert.equal(await deliverReminder('other', store, async () => { throw Error('timeout'); }), 'uncertain');
  assert.equal(states.get('other'), 'uncertain');
  assert.equal(await deliverReminder('other', store, async () => 'sent'), 'uncertain');
});
test('storage failure stops delivery rather than bypassing deduplication', async () => {
  const {store} = memoryStore(); let sent = false;
  store.claim = async () => { throw Error('Redis unavailable'); };
  await assert.rejects(deliverReminder('race', store, async () => { sent = true; return 'sent'; }));
  assert.equal(sent, false);
});
