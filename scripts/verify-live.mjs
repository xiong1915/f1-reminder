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

  // 6. 测试历史积分中心 (2008 & 2023)
  console.log('\n6. 测试历史积分中心:');
  const hRes2008 = await fetch(`${BASE_URL}/api/f1/standings?season=2008`);
  const hData2008 = await hRes2008.json();
  console.log(`- 2008 赛季积分榜车手榜首: ${hData2008.driverStandings?.[0]?.name} (${hData2008.driverStandings?.[0]?.points}分)`);
  console.log(`- 2008 赛季车队榜首: ${hData2008.constructorStandings?.[0]?.name} (${hData2008.constructorStandings?.[0]?.points}分)`);
  console.log(`- 2008 赛季截止描述: "${hData2008.standingsCutoffDesc}", verified: ${hData2008.standingsCutoffVerified}`);

  const hRes2023 = await fetch(`${BASE_URL}/api/f1/standings?season=2023`);
  const hData2023 = await hRes2023.json();
  console.log(`- 2023 赛季积分榜车手榜首: ${hData2023.driverStandings?.[0]?.name} (${hData2023.driverStandings?.[0]?.points}分)`);

  // 7. 测试历史赛道构型 (2015 墨尔本 16 弯 - 严禁现代 2022 构型冒充)
  console.log('\n7. 测试历史赛道构型 (2015 墨尔本):');
  const trackRes = await fetch(`${BASE_URL}/races/1?season=2015`);
  const trackHtml = await trackRes.text();
  const hasMissingLayoutNotice = trackHtml.includes('历史赛道构型暂缺') || trackHtml.includes('暂缺');
  console.log(`- 2015 墨尔本分站页面状态: HTTP ${trackRes.status}`);
  console.log(`- 是否展示“历史赛道构型暂缺”明确提示 (禁止现代冒充): ${hasMissingLayoutNotice ? '【正常：如实提示暂缺】' : '【异常：未提示暂缺】'}`);

  // 8. 测试 APEX REPLAY 比赛动态回放与会话
  console.log('\n8. 测试 APEX REPLAY 回放 API 与 DEMO 隔离:');
  const replayPageRes = await fetch(`${BASE_URL}/replay`);
  console.log(`- /replay 页面状态: HTTP ${replayPageRes.status}`);
  const replayApiRes = await fetch(`${BASE_URL}/api/f1/replay?season=2023`);
  const replayApiData = await replayApiRes.json();
  console.log(`- 2023 赛季可用历史正赛场次数量: ${replayApiData.sessions?.length || 0}`);
  if (replayApiData.sessions?.length) {
    console.log(`  * 第一场: ${replayApiData.sessions[0].nameZh} (key: ${replayApiData.sessions[0].session_key})`);
  }

  // 9. 测试 AI 通道一：指定网址直读 (URL 直通解析)
  console.log('\n9. 测试 AI 通道一: 指定网页直通解析 (无模糊搜索污染)');
  const targetUrl = 'https://www.formula1.com/en/latest.html';
  const qDirectUrl = `请阅读此页面并告知其主旨内容：${targetUrl}`;
  const directUrlRes = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: qDirectUrl, stream: false })
  });
  const directUrlData = await directUrlRes.json();
  console.log(`- AI 指定 URL 回复状态: HTTP ${directUrlRes.status}`);
  console.log(`- Sources 数量: ${directUrlData.sources?.length || 0}`);
  const urlMatched = (directUrlData.sources || []).some(s => s.url === targetUrl);
  console.log(`- 是否仅精准指向目标 URL: ${urlMatched ? '【通过：精准指向目标 URL】' : '【未匹配目标 URL】'}`);
  console.log(`- AI 回答内容摘要:\n${directUrlData.reply?.slice(0, 200)}...\n`);

  console.log('\n=== 线上全量复测验证完成 ===');
}

main().catch(err => {
  console.error('复测失败:', err);
  process.exit(1);
});
