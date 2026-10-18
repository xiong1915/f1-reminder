// tests/search-and-sync-acceptance.test.mjs
// 针对 AI 联网检索链路、日期解析、SSRF 防护、信源分类、积分榜截止场次与自动同步路由的专项验收测试

import test from 'node:test';
import assert from 'node:assert';

test('AI 联网检索、事实一致性与完赛自动同步专项测试', async (t) => {
  const { defaultAIOrchestrator } = await import('../lib/ai/orchestrator.ts');
  const { checkUrlSafety } = await import('../lib/search/url_safety.ts');
  const { filterAndRankCandidates } = await import('../lib/search/filter.ts');
  const { defaultF1Service } = await import('../providers/f1/service.ts');
  const { createFixtureF1Service } = await import('./fixtures/offline-service.mjs');
  const { defaultSearchService } = await import('../lib/search/service.ts');
  const fixtureService = await createFixtureF1Service();
  // Exercise orchestration with fixed upstream inputs; no live search or race API.
  t.mock.method(defaultF1Service, 'getOverview', fixtureService.getOverview.bind(fixtureService));
  t.mock.method(defaultF1Service, 'getCalendar', fixtureService.getCalendar.bind(fixtureService));
  t.mock.method(defaultSearchService, 'search', async (query) => ({
    success: true, provider: 'test-fixture', results: [{
      title: query, snippet: query, content: query, hasFullText: true,
      url: 'https://www.formula1.com/en/latest/article/test-fixture',
      source: 'test-fixture', isOfficial: true, sourceType: 'official'
    }]
  }));

  await t.test('1. 搜索关键词清洗、指令剔除与动态日期解析', () => {
    // 1.1 剔除指令词与格式要求
    const rawWithInstruction = '2026年10月11日 新加坡排位赛谁拿了前三名？只给一句结论，查不到不要猜';
    const cleaned = defaultAIOrchestrator.extractSearchKeyword(rawWithInstruction);
    assert.strictEqual(cleaned.includes('只给一句结论'), false, '必须剔除“只给一句结论”');
    assert.strictEqual(cleaned.includes('查不到不要猜'), false, '必须剔除“查不到不要猜”');
    assert.ok(cleaned.includes('2026年10月11日'), '必须保留用户显式指定的真实日期');
    assert.ok(cleaned.includes('新加坡排位赛') || cleaned.includes('新加坡'), '必须保留核心实体');

    // 1.2 动态解析“今天”与“昨天”为 Asia/Shanghai 实际日期，不硬编码 10月10日
    const queryToday = '请问今天新加坡站冲刺赛成绩如何？';
    const cleanedToday = defaultAIOrchestrator.extractSearchKeyword(queryToday);
    assert.strictEqual(cleanedToday.includes('今天'), false, '“今天”必须被替换');

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(now);
    const y = parts.find(p => p.type === 'year')?.value || '2026';
    const m = parts.find(p => p.type === 'month')?.value || '10';
    const d = parts.find(p => p.type === 'day')?.value || '11';
    const expectedToday = `${y}年${m}月${d}日`;
    assert.ok(cleanedToday.includes(expectedToday), `应动态替换为当前北京时间日期: ${expectedToday}`);

    // 1.3 多轮对话指代消解 (Coreference Resolution)
    const messages = [
      { role: 'user', content: '基米·安东内利在梅赛德斯表现怎么样？' },
      { role: 'assistant', content: '安东内利表现出色，领跑积分榜。' },
      { role: 'user', content: '他现在拿了多少积分？只给结论' }
    ];
    const resolvedKw = defaultAIOrchestrator.extractSearchKeyword('他现在拿了多少积分？只给结论', messages);
    assert.strictEqual(resolvedKw.includes('只给结论'), false, '应剔除只给结论');
    assert.ok(resolvedKw.includes('安东内利'), '“他”应被正确消解为前文实体“安东内利”');
  });

  await t.test('2. SSRF 防护、URL 安全性与信源分级校验', () => {
    // 2.1 禁止私有回环与内网网段
    const loopback = checkUrlSafety('http://127.0.0.1:8080/admin');
    assert.strictEqual(loopback.safe, false, '必须拦截 127.0.0.1');

    const privateIp = checkUrlSafety('http://192.168.1.1/router');
    assert.strictEqual(privateIp.safe, false, '必须拦截 192.168.x.x');

    const cloudMeta = checkUrlSafety('http://169.254.169.254/latest/meta-data/');
    assert.strictEqual(cloudMeta.safe, false, '必须拦截云元数据 169.254.169.254');

    // 2.2 协议限制
    const fileProto = checkUrlSafety('file:///etc/passwd');
    assert.strictEqual(fileProto.safe, false, '必须拦截 file:// 协议');

    // 2.3 搜索引擎内部页过滤
    const searchInternal = checkUrlSafety('https://wap.sogou.com/web/searchList.jsp?keyword=f1');
    assert.strictEqual(searchInternal.safe, false, '必须拦截搜索引擎 searchList.jsp');

    // 2.4 信源分类：官方 vs 主流媒体 vs 自媒体 (网易号)
    const officialCheck = checkUrlSafety('https://www.formula1.com/en/results/2026/races/1308/singapore.html');
    assert.strictEqual(officialCheck.safe, true);
    assert.strictEqual(officialCheck.sourceType, 'official');
    assert.strictEqual(officialCheck.isOfficial, true);

    const neteaseCheck = checkUrlSafety('https://www.163.com/dy/article/JCL420PR0529DS7F.html');
    assert.strictEqual(neteaseCheck.safe, true);
    assert.strictEqual(neteaseCheck.sourceType, 'self_media', '网易号 163.com/dy 必须标注为自媒体，严禁标记为官方');
    assert.strictEqual(neteaseCheck.isOfficial, false);

    const mainstreamCheck = checkUrlSafety('https://www.chinanews.com/ty/2024/02-02/10157616.shtml');
    assert.strictEqual(mainstreamCheck.safe, true);
    assert.strictEqual(mainstreamCheck.sourceType, 'mainstream_media');
  });

  await t.test('3. 搜索候选过滤：排除非赛车体育与垃圾站', () => {
    const rawCandidates = [
      {
        title: 'WTT中国大满贯孙颖莎晋级女单决赛_体育_央视网',
        url: 'https://sports.cctv.com/2024/10/05/ARTIxwtt123.shtml',
        snippet: '乒乓球WTT中国大满贯女单半决赛孙颖莎战胜对手晋级决赛。'
      },
      {
        title: 'NBA季前赛湖人对阵勇士全场集锦',
        url: 'https://sports.sina.com.cn/nba/2024-10-06/doc-nba123.shtml',
        snippet: 'NBA季前赛焦点战，勒布朗詹姆斯出战。'
      },
      {
        title: '2026 F1 新加坡大奖赛排位赛：诺里斯夺杆',
        url: 'https://www.formula1.com/en/results/2026/singapore/qualifying.html',
        snippet: 'Formula 1 Marina Bay Singapore GP Qualifying results.'
      }
    ];

    const filtered = filterAndRankCandidates(rawCandidates, { query: 'F1 2026 新加坡 排位赛' });
    assert.strictEqual(filtered.length, 1, '必须过滤乒乓球与篮球等无关体育');
    assert.strictEqual(filtered[0].title.includes('新加坡大奖赛排位赛'), true);
  });

  await t.test('4. 引用来源（Sources）与问题关联严格对应，无巴林站污染', async () => {
    // 4.1 询问新加坡排位赛时，sources 中绝不能出现上一站巴林赛果链接
    const promptForSingapore = await defaultAIOrchestrator.buildPrompt('F1_NEWS', '2026 新加坡大奖赛 排位赛成绩');
    const hasBahrainInSingapore = promptForSingapore.sources.some(s => s.url.includes('bahrain') || s.name.includes('巴林'));
    assert.strictEqual(hasBahrainInSingapore, false, '询问新加坡排位赛时严禁在 sources 混入巴林正赛链接');

    // 4.2 询问汉密尔顿加盟法拉利时，sources 中绝不能出现上一站巴林赛果链接
    const promptForHamilton = await defaultAIOrchestrator.buildPrompt('F1_NEWS', '汉密尔顿加盟法拉利新闻进展');
    const hasBahrainInHamilton = promptForHamilton.sources.some(s => s.url.includes('bahrain') || s.name.includes('巴林'));
    assert.strictEqual(hasBahrainInHamilton, false, '询问汉密尔顿转会时严禁在 sources 混入巴林正赛链接');

    // 4.3 仅在明确询问上一站赛果时才将上一站链接放入 sources
    const promptForLastRace = await defaultAIOrchestrator.buildPrompt('F1_FACTUAL', '上一站谁夺冠了？上一场正赛成绩');
    const hasBahrainInLastRace = promptForLastRace.sources.some(s => s.url.includes('bahrain') || s.name.includes('官方'));
    assert.strictEqual(hasBahrainInLastRace, true, '询问上一站赛果时应包含官方赛果链接');
  });

  await t.test('5. 积分榜截止场次、前 5 名截断与试算冲刺赛互斥', async () => {
    const overview = await defaultF1Service.getOverview();

    // 5.1 截止场次描述
    assert.ok(overview.standingsCutoffDesc, 'overview 必须包含 standingsCutoffDesc');
    assert.strictEqual(
      overview.standingsCutoffDesc.includes('冲刺赛') || overview.standingsCutoffDesc.includes('正赛') || overview.standingsCutoffDesc.includes('待核实'),
      true,
      '截止场次必须具有明确描述'
    );

    // 5.2 请求前 5 名时，卡片与正文只截取前 5 名
    const cardTop5 = defaultAIOrchestrator.getFactCard('F1_FACTUAL', '请给出当前车手积分榜前5名', overview);
    assert.ok(cardTop5);
    assert.strictEqual(cardTop5.fields.length, 5, '请求前5名时卡片字段数量必须为 5');

    const canonicalTop5 = defaultAIOrchestrator.getCanonicalFactBlock('F1_FACTUAL', '请给出当前车手积分榜前5名', overview);
    assert.ok(canonicalTop5);
    // 确认正文只列出 P1 到 P5
    assert.ok(canonicalTop5.factText.includes('1. **'), '包含 P1');
    assert.ok(canonicalTop5.factText.includes('5. **'), '包含 P5');
    assert.strictEqual(canonicalTop5.factText.includes('6. **'), false, '请求前5名时正文严禁出现 P6 及以后');
  });
});
