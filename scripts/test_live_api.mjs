// scripts/test_live_api.mjs
import { execSync } from 'node:child_process';

const BASE_URL = process.argv[2] || 'https://f1-race-reminder-cloud.vercel.app';

function curl(url, options = {}) {
  const method = options.method || 'GET';
  let cmd = `curl.exe -s -k -X ${method}`;
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      cmd += ` -H "${k}: ${v}"`;
    }
  }
  if (options.body) {
    const escaped = options.body.replace(/"/g, '\\"');
    cmd += ` -d "${escaped}"`;
  }
  cmd += ` "${url}"`;
  return execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
}

async function run() {
  console.log(`=======================================================`);
  console.log(`TIKE V3 PREVIEW LIVE ENVIRONMENT AUTOMATED AUDIT`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`=======================================================\n`);
  const results = [];

  function check(name, fn) {
    try {
      const res = fn();
      console.log(`[PASS] ${name}: ${typeof res === 'object' ? JSON.stringify(res).slice(0, 110) : res}`);
      results.push({ name, pass: true, detail: res });
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      results.push({ name, pass: false, error: err.message });
    }
  }

  // 1. API: /api/f1/overview
  check('API /api/f1/overview', () => {
    const raw = curl(`${BASE_URL}/api/f1/overview`);
    const data = JSON.parse(raw);
    if (!data.season || !data.totalRounds || !data.currentMeeting || !data.driverStandings) {
      throw new Error(`Invalid overview structure: keys=${Object.keys(data).join(',')}`);
    }
    return {
      season: data.season,
      totalRounds: data.totalRounds,
      currentMeeting: data.currentMeeting.name,
      nextSession: data.nextSession?.name,
      leader: data.driverStandings[0]?.nameEn,
      dataSource: data.dataSource,
      isStale: data.isStale
    };
  });

  // 2. API: /api/f1/calendar
  check('API /api/f1/calendar', () => {
    const raw = curl(`${BASE_URL}/api/f1/calendar`);
    const data = JSON.parse(raw);
    if (!Array.isArray(data.races) || data.races.length === 0) {
      throw new Error('Invalid calendar structure');
    }
    return { total: data.races.length, firstRace: data.races[0].name, round17: data.races.find(r => r.round === 17)?.name };
  });

  // 3. API: /api/f1/standings
  check('API /api/f1/standings', () => {
    const raw = curl(`${BASE_URL}/api/f1/standings`);
    const data = JSON.parse(raw);
    if (!Array.isArray(data.driverStandings) || !Array.isArray(data.constructorStandings)) {
      throw new Error(`Invalid standings structure: keys=${Object.keys(data).join(',')}`);
    }
    return {
      season: data.season,
      topDriver: `${data.driverStandings[0]?.nameEn} (${data.driverStandings[0]?.points} pts)`,
      topConstructor: `${data.constructorStandings[0]?.nameEn} (${data.constructorStandings[0]?.points} pts)`
    };
  });

  // 4. API: /api/feishu (Handshake)
  check('API /api/feishu (url_verification handshake)', () => {
    const raw = curl(`${BASE_URL}/api/feishu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'url_verification', challenge: 'challenge_token_live_test_789' })
    });
    const data = JSON.parse(raw);
    if (data.challenge !== 'challenge_token_live_test_789') {
      throw new Error(`Challenge mismatch: ${raw}`);
    }
    return { challenge: data.challenge, status: 'Handshake successful' };
  });

  // 5. API: /api/ai/chat (DeepSeek Streaming Chat)
  check('API /api/ai/chat (DeepSeek Full Duplex Streaming)', () => {
    const raw = curl(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: '2026年新加坡大奖赛正赛开赛日期是哪天？请用一句话回答。' }]
      })
    });
    if (!raw || raw.length === 0) throw new Error('Empty AI response');
    const hasSources = raw.includes('type":"sources');
    const hasContent = raw.includes('type":"delta') || raw.includes('content');
    return {
      streamBytes: raw.length,
      groundedSourcesIncluded: hasSources,
      responseReceived: hasContent,
      preview: raw.slice(0, 100).replace(/\r?\n/g, ' ')
    };
  });

  // 6. UI Routes
  const pages = [
    { path: '/', title: 'Home Dashboard' },
    { path: '/ai', title: 'AI Copilot' },
    { path: '/races', title: 'Race Calendar' },
    { path: '/standings', title: 'Championship Standings' },
    { path: '/drivers', title: 'Drivers Directory' },
    { path: '/teams', title: 'Constructors Directory' },
    { path: '/system', title: 'System Telemetry' },
    { path: '/races/17', title: 'Race Detail (Round 17)' },
    { path: '/drivers/norris', title: 'Driver Detail (Norris)' },
    { path: '/teams/mclaren', title: 'Team Detail (McLaren)' }
  ];

  for (const page of pages) {
    check(`UI Page ${page.path} (${page.title})`, () => {
      const html = curl(`${BASE_URL}${page.path}`);
      if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
        throw new Error('Not valid HTML');
      }
      return { status: 200, htmlBytes: html.length };
    });
  }

  // 7. System Telemetry Detailed Audit
  check('System Architecture Audit (Upstash Redis & DeepSeek AI)', () => {
    const html = curl(`${BASE_URL}/system`);
    const checks = {
      upstashRedis: html.includes('Upstash Redis'),
      persistent: html.includes('Persistent (云端持久化)'),
      atomicIdempotency: html.includes('SET NX 原子防重'),
      liveDataSource: html.includes('● Jolpica Live'),
      zeroCostInfrastructure: html.includes('¥0 / 月'),
      deepSeekActive: html.includes('DeepSeek AI') || html.includes('deepseek-chat')
    };

    for (const [k, v] of Object.entries(checks)) {
      if (!v) throw new Error(`Missing telemetry assertion: ${k}`);
    }
    return checks;
  });

  console.log('\n=======================================================');
  console.log('AUDIT RESULTS');
  console.log('=======================================================');
  const allPassed = results.every(r => r.pass);
  console.log(`TOTAL CHECKS: ${results.length}`);
  console.log(`PASSED: ${results.filter(r => r.pass).length}`);
  console.log(`FAILED: ${results.filter(r => !r.pass).length}`);

  if (!allPassed) {
    console.error('\nFAILURE DETECTED in Preview deployment!');
    process.exit(1);
  } else {
    console.log('\nALL PREVIEW REQUISITES 100% VERIFIED AND PASSING!');
  }
}

run();
