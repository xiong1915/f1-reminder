const https = require('https');

async function test() {
  const url = 'https://api.openf1.org/v1/sessions?year=2023&session_name=Race';
  const res = await fetch(url);
  const sessions = await res.json();
  console.log('2023 OpenF1 Races count:', sessions.length);
  sessions.slice(0, 5).forEach(s => {
    console.log(`- [${s.session_key}] ${s.meeting_name || s.location} (${s.circuit_short_name}), Start: ${s.date_start}, End: ${s.date_end}`);
  });
}

test().catch(e => console.error(e.message));
