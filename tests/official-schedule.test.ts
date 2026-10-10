import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOfficialSchedule } from '../providers/f1/official-schedule';

function page(events:object[]) { return `<script type="application/ld+json">${JSON.stringify({'@type':'SportsEvent',subEvent:events})}</script>`; }
const qualifying={'@type':'SportsEvent',name:'Qualifying - Singapore Grand Prix',startDate:'2026-10-10T13:30:00.000Z'};
const race={'@type':'SportsEvent',name:'Race - Singapore Grand Prix',startDate:'2026-10-11T12:00:00.000Z'};
test('official UTC qualifying is 21:30 Beijing rather than secondary provider 21:00',()=>{
  const times=parseOfficialSchedule(page([qualifying,race]),'2026');
  assert.equal(times[0].startTimeUTC,'2026-10-10T13:30:00.000Z');
});
test('missing, malformed, wrong-year and timezone-free official data fail closed',()=>{
  assert.throws(()=>parseOfficialSchedule('<html>Unavailable</html>','2026'));
  for(const startDate of ['invalid','2025-10-10T13:30:00Z','2026-10-10T13:30:00'])
    assert.throws(()=>parseOfficialSchedule(page([{...qualifying,startDate},race]),'2026'));
  assert.throws(()=>parseOfficialSchedule(page([qualifying,qualifying,race]),'2026'));
});
test('official cancellation is retained rather than interpreted as a scheduled race',()=>{
  assert.equal(parseOfficialSchedule(page([qualifying,{...race,eventStatus:'https://schema.org/EventCancelled'}]),'2026')[1].cancelled,true);
});
