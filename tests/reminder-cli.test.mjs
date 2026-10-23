import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('real scheduled CLI heartbeat discovers US practice and sends through official verification',()=>{
  const child=spawnSync(process.execPath,['--import',new URL('./fixtures/reminder-cli-fetch.mjs',import.meta.url).href,'reminder.js'],{
    cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',timeout:10000,
    env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,WEEKLY_PLAN:'true',SCHEDULE_CRON:'*/15 * * * 5,6,0',PUSH_KEY:'https://open.feishu.cn/test-only',UPSTASH_REDIS_REST_URL:'https://redis.invalid',UPSTASH_REDIS_REST_TOKEN:'test-only'}
  });
  assert.equal(child.status,0,child.stderr+child.stdout);
  const health=JSON.parse(child.stdout.trim().split('\n').at(-1));
  assert.equal(health.source,'github');assert.equal(health.results.length,1);
  assert.equal(health.results[0].status,'sent');assert.match(health.results[0].session,/FP1/);
  assert.equal(health.official.length,1);
});
