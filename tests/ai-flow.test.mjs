// tests/ai-flow.test.mjs
// Phase 4 Quality Gate: APEX AI Flow, State Machine, IME, Abort & Fact Fast Path Tests

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { defaultAIOrchestrator } from '../lib/ai/orchestrator.ts';
import { defaultF1Service } from '../providers/f1/service.ts';

const ROOT_DIR = process.cwd();

test('Phase 4 — 1. AI Intent Classification & Domain Isolation', () => {
  // F1 Factual Queries
  assert.equal(defaultAIOrchestrator.classifyIntent('下一站几点开赛？'), 'F1_FACTUAL');
  assert.equal(defaultAIOrchestrator.classifyIntent('当前车手积分榜前三是谁'), 'F1_FACTUAL');
  assert.equal(defaultAIOrchestrator.classifyIntent('上一站谁赢了'), 'F1_FACTUAL');

  // F1 Tactical / Technical Analysis
  assert.equal(defaultAIOrchestrator.classifyIntent('解释一下什么是 undercut 战术'), 'F1_ANALYSIS');
  assert.equal(defaultAIOrchestrator.classifyIntent('地面效应底盘在雨战中有什么风险？'), 'F1_ANALYSIS');

  // General Questions (Strict Domain Isolation — MUST NOT inject F1 context)
  assert.equal(defaultAIOrchestrator.classifyIntent('写一段 Python 快速排序代码'), 'GENERAL');
  assert.equal(defaultAIOrchestrator.classifyIntent('明天北京的天气怎么样'), 'GENERAL');
  assert.equal(defaultAIOrchestrator.classifyIntent('帮我润色一段商务邮件致谢辞'), 'GENERAL');
});

test('Phase 4 — 2. Fact Fast Path (Canonical Core Direct Extraction)', async () => {
  const overview = await defaultF1Service.getOverview();

  // Test Next Race Fact Card
  const nextRaceCard = defaultAIOrchestrator.getFactCard('F1_FACTUAL', '下一场比赛几点开赛？', overview);
  assert.ok(nextRaceCard, 'Next race fact card must be generated');
  assert.equal(nextRaceCard.type, 'next_race');
  assert.ok(nextRaceCard.title.length > 0);
  assert.ok(nextRaceCard.fields.length >= 2);
  const raceTimeField = nextRaceCard.fields.find(f => f.label.includes('正赛时间'));
  assert.ok(raceTimeField, 'Must include canonical race start time');

  // Test Standings Fact Card
  const standingsCard = defaultAIOrchestrator.getFactCard('F1_FACTUAL', '车手积分榜前三是谁？', overview);
  assert.ok(standingsCard, 'Standings fact card must be generated');
  assert.equal(standingsCard.type, 'standings');
  assert.ok(standingsCard.fields.length >= 1);

  // Test General Query (No Fact Card)
  const generalCard = defaultAIOrchestrator.getFactCard('GENERAL', '你好，今天天气不错', overview);
  assert.equal(generalCard, null, 'General queries must NOT generate F1 fact cards');
});

test('Phase 4 — 3. Domain Isolation System Prompt Verification', async () => {
  const { systemPrompt } = await defaultAIOrchestrator.buildPrompt('GENERAL', '推荐一本侦探小说');
  assert.match(
    systemPrompt,
    /若用户未提及 F1 或赛车，严禁主动引入 F1 或赛车话题/,
    'General prompts must explicitly prohibit gratuitous F1 topic insertion'
  );
});

test('Phase 4 — 4. AbortSignal Disconnection Protection', async () => {
  const controller = new AbortController();
  controller.abort(); // Abort immediately

  // Non-streaming answer with pre-aborted signal should resolve gracefully
  const res = await defaultAIOrchestrator.answer(
    [{ role: 'user', content: '测试中断' }],
    'test-client',
    controller.signal
  );
  assert.deepEqual(res, { reply: '', sources: [] });

  // Stream answer with pre-aborted signal should yield nothing
  const streamEvents = [];
  for await (const chunk of defaultAIOrchestrator.streamAnswer(
    [{ role: 'user', content: '测试中断流' }],
    'test-client',
    controller.signal
  )) {
    streamEvents.push(chunk);
  }
  // Even if sources were yielded before signal check, no delta tokens should stream
  const deltas = streamEvents.filter(e => e.type === 'delta');
  assert.equal(deltas.length, 0, 'No token delta chunks should stream when aborted');
});

test('Phase 4 — 5. Frontend AIPage Architectural Invariants', () => {
  const aiPagePath = path.join(ROOT_DIR, 'app', 'ai', 'page.tsx');
  assert.ok(fs.existsSync(aiPagePath), 'app/ai/page.tsx must exist');
  const code = fs.readFileSync(aiPagePath, 'utf8');

  // 1. 9-state state machine verification
  const requiredStates = [
    'idle',
    'composing',
    'submitting',
    'streaming',
    'completed',
    'error',
    'aborted',
    'rate_limited',
    'offline'
  ];
  for (const s of requiredStates) {
    assert.match(code, new RegExp(`['"]${s}['"]`), `AIPage must support state: ${s}`);
  }

  // 2. Chinese IME Composition Guard
  assert.match(code, /onCompositionStart/, 'Must guard IME start');
  assert.match(code, /onCompositionEnd/, 'Must guard IME end');
  assert.match(code, /isComposingRef/, 'Must track composing ref to prevent premature Enter dispatch');

  // 3. Dynamic Send <-> Stop Button Toggle
  assert.match(code, /handleStop/, 'Must implement handleStop callback');
  assert.match(code, /variant="danger"[\s\S]*?停止/, 'Must render Stop button while streaming');

  // 4. Retry Mechanism
  assert.match(code, /handleRetry/, 'Must provide handleRetry callback');

  // 5. Fact Fast Path Card Render
  assert.match(code, /factCard/, 'Must handle factCard in UI state and messages');

  // 6. Mobile 100dvh & safe-area insets
  assert.match(code, /100dvh/, 'Must use 100dvh for mobile address bar stability');
  assert.match(code, /safe-area-inset-bottom/, 'Must adapt to bottom safe area');

  // 7. GlassComposer & GlassButton integration
  assert.match(code, /<GlassComposer/, 'Must use GlassComposer');
  assert.match(code, /<GlassButton/, 'Must use GlassButton');
});
