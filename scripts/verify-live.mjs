// scripts/verify-live.mjs
// 验证 https://f1.tike69.cc.cd/ 正式生产环境实际响应

import fs from 'node:fs';

const BASE_URL = 'https://f1.tike69.cc.cd';

async function main() {
  console.log(`=== 开始对正式域名 ${BASE_URL} 执行端到端线上功能复测 ===\n`);

  // 1. 读取 CRON_SECRET 测试 /api/cron/sync
  let cronSecret = '';
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const m = env.match(/CRON_SECRET=([^\r\n]+)/);
    if (m) cronSecret = m[1].trim().replace(/^["']|["']$/g, '');
  } catch (_) {}

  console.log('1. 测试 /api/cron/sync 鉴权与同步功能：');
  const unauthRes = await fetch(`${BASE_URL}/api/cron/sync`);
  console.log(`- 未授权请求返回 HTTP: ${unauthRes.status}`);

  if (cronSecret) {
    const authRes = await fetch(`${BASE_URL}/api/cron/sync`, {
      headers: { Authorization: `Bearer ${cronSecret}` }
    });
    const syncData = await authRes.json();
    console.log(`- 授权请求状态: HTTP ${authRes.status}, 结果:`, {
      success: syncData.success,
      feishuNotificationSuppressed: syncData.feishuNotificationSuppressed,
      inRaceWindow: syncData.inRaceWindow,
      driversSummary: syncData.summary?.drivers
    });
  }

  // 2. 测试 /api/f1/overview 权威数据与截止场次
  console.log('\n2. 测试 /api/f1/overview 权威数据与截止场次：');
  const overviewRes = await fetch(`${BASE_URL}/api/f1/overview`);
  const overview = await overviewRes.json();
  console.log(`- 积分统计截止场次描述: "${overview.standingsCutoffDesc}"`);
  console.log(`- 领跑车手: ${overview.driverStandings?.[0]?.name} (${overview.driverStandings?.[0]?.points}分)`);
  console.log(`- 是否冲刺赛待进行 (isSprintPending): ${overview.isSprintPending}`);

  // 3. 测试 AI 接口 - 查询 1: 新加坡排位赛
  console.log('\n3. 测试 AI 接口: 新加坡排位赛前三名 (非流式验证)');
  const q1 = '2026年10月11日 新加坡排位赛谁拿了前三名？只给一句结论，查不到不要猜';
  const aiRes1 = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: q1, stream: false })
  });
  const data1 = await aiRes1.json();
  console.log(`- 回复状态: HTTP ${aiRes1.status}`);
  console.log(`- Sources 来源数量: ${data1.sources?.length || 0}`);
  if (data1.sources?.length) {
    console.log('- Sources 列表:');
    data1.sources.forEach(s => console.log(`  * ${s.name} (${s.url})`));
  }
  const hasBahrainIn1 = (data1.sources || []).some(s => s.url?.includes('bahrain') || s.name?.includes('巴林'));
  console.log(`- 是否混入无关巴林站正赛链接: ${hasBahrainIn1 ? '【错误：存在巴林链接】' : '【正常：无巴林链接】'}`);
  console.log(`- AI 回答内容:\n${data1.reply}\n`);

  // 4. 测试 AI 接口 - 查询 2: 汉密尔顿加盟法拉利
  console.log('4. 测试 AI 接口: 汉密尔顿加盟法拉利新闻');
  const q2 = '汉密尔顿加盟法拉利新闻';
  const aiRes2 = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: q2, stream: false })
  });
  const data2 = await aiRes2.json();
  const hasBahrainIn2 = (data2.sources || []).some(s => s.url?.includes('bahrain') || s.name?.includes('巴林'));
  console.log(`- Sources 来源数量: ${data2.sources?.length || 0}`);
  if (data2.sources?.length) {
    console.log('- Sources 列表:');
    data2.sources.forEach(s => console.log(`  * ${s.name} (${s.url})`));
  }
  console.log(`- 是否混入无关巴林站正赛链接: ${hasBahrainIn2 ? '【错误：存在巴林链接】' : '【正常：无巴林链接】'}`);
  console.log(`- AI 回答摘要:\n${data2.reply?.slice(0, 300)}...\n`);

  // 5. 测试 AI 接口 - 查询 3: 车手积分榜前 5 名
  console.log('5. 测试 AI 接口: 车手积分榜前 5 名');
  const q3 = '请给出当前车手积分榜前5名是谁？';
  const aiRes3 = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: q3, stream: false })
  });
  const data3 = await aiRes3.json();
  console.log(`- AI 回答正文:\n${data3.reply}\n`);
  const hasP6 = data3.reply?.includes('6. **') || data3.reply?.includes('P6');
  console.log(`- 是否被违规扩展为前10名 (含P6): ${hasP6 ? '【异常：包含了P6】' : '【正常：严格仅前5名】'}`);

  console.log('\n=== 线上全量复测验证完成 ===');
}

main().catch(err => {
  console.error('复测失败:', err);
  process.exit(1);
});
