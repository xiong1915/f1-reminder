// tests/delivery-state.test.js - 投递状态机、错误分类与跨 cron 防重离线测试
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { postJson, parseJsonResponse } = require('../reminder');
const { loadHistory, saveHistory, isSentRecord, isUncertainRecord } = require('../src/history');

test('Delivery State: 建连前错误归类为 not_delivered 并允许安全重试', async () => {
  const unusedPort = 59997;
  let capturedErr;
  try {
    await postJson(`http://127.0.0.1:${unusedPort}/fail`, { test: true });
  } catch (err) {
    capturedErr = err;
  }
  assert.ok(capturedErr, '端口未监听必须抛错');
  assert.strictEqual(capturedErr.deliveryStatus, 'not_delivered', '建连前拒绝必须归类为 not_delivered');
  assert.strictEqual(capturedErr.isSafeToRetry, true, 'not_delivered 必须允许安全重试');
});

test('Delivery State: HTTP 200 正文非合法 JSON 归类为 uncertain 防止重复轰炸', () => {
  assert.throws(() => {
    parseJsonResponse('测试渠道', '<html>502 Bad Gateway</html>');
  }, (err) => {
    return err.deliveryStatus === 'uncertain' && err.isDeliveryUncertain === true;
  });

  const parsed = parseJsonResponse('测试渠道', '{"code":0,"msg":"ok"}');
  assert.strictEqual(parsed.code, 0);
});

test('Delivery State: 离线模拟主 cron 遇断流记录 uncertain，备用 cron 成功抑制发包 (网络请求严格为 1)', async () => {
  let networkRequestsCount = 0;
  const mockServer = http.createServer((req, res) => {
    networkRequestsCount++;
    req.on('data', () => {});
    req.on('end', () => {
      // 模拟请求体完全接收后连接突然中断
      req.socket.destroy();
    });
  });

  await new Promise(resolve => mockServer.listen(0, '127.0.0.1', resolve));
  const port = mockServer.address().port;
  const mockUrl = `http://127.0.0.1:${port}/webhook`;

  const tmpHistory = path.join(__dirname, `history_delivery_test_${Date.now()}.json`);
  fs.writeFileSync(tmpHistory, JSON.stringify({}, null, 2), 'utf-8');

  const testKey = `key_singapore_fp1_${Date.now()}`;

  // 1. 模拟主 cron 运行
  let primaryThrew = false;
  try {
    const history = loadHistory(tmpHistory);
    let uncertainErr = null;
    try {
      await postJson(mockUrl, { text: "主 cron 消息" });
    } catch (err) {
      if (err.deliveryStatus === 'uncertain') {
        uncertainErr = err;
      }
    }

    if (uncertainErr) {
      history[testKey] = {
        status: 'uncertain',
        attempted_at: new Date().toISOString(),
        error: uncertainErr.message
      };
      saveHistory(tmpHistory, history);
      throw new Error(`主任务抛错: ${uncertainErr.message}`);
    }
  } catch (_) {
    primaryThrew = true;
  }

  assert.strictEqual(primaryThrew, true, '主任务发生 uncertain 必须抛错使 Actions 报红');
  assert.strictEqual(networkRequestsCount, 1, '主 cron 发出 1 次网络请求后遇断流终止');

  const afterPrimaryHistory = loadHistory(tmpHistory);
  assert.strictEqual(isUncertainRecord(afterPrimaryHistory[testKey]), true, 'history 中状态必须为 uncertain');
  assert.strictEqual(isSentRecord(afterPrimaryHistory[testKey]), false, '绝不得伪装为 sent');

  // 2. 模拟 15 分钟后备用 cron 运行
  let backupSentNetwork = false;
  let backupSkipped = false;
  const backupHistory = loadHistory(tmpHistory);
  const existing = backupHistory[testKey];

  if (existing) {
    if (isUncertainRecord(existing)) {
      backupSkipped = true; // 识别后跳过，不发包
    }
  } else {
    backupSentNetwork = true;
    await postJson(mockUrl, { text: "备用 cron 消息" });
  }

  assert.strictEqual(backupSkipped, true, '备用 cron 检测到 uncertain 记录主动跳过');
  assert.strictEqual(backupSentNetwork, false, '备用 cron 绝不能发送网络请求');
  assert.strictEqual(networkRequestsCount, 1, '总网络请求严格为 1 次，杜绝重复推送');

  // 清理
  mockServer.close();
  try { fs.unlinkSync(tmpHistory); } catch (_) {}
});
