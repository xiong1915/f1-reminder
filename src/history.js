// src/history.js - 提醒历史持久化、结构容灾与状态判定模块
const fs = require('fs');

// 严谨读取历史文件，损坏时拒绝静默忽略，并备份异常文件
function loadHistory(file) {
  if (!fs.existsSync(file)) return {};
  let raw = '';
  try {
    raw = fs.readFileSync(file, 'utf-8').trim();
  } catch (e) {
    throw new Error(`[历史记录读取失败] 读取 ${file} 出错: ${e.message}`);
  }

  // 若文件存在但完全为空，可能是写入被异常中断导致截断
  if (!raw) {
    const corruptBackup = `${file}.corrupt.${Date.now()}`;
    try { fs.copyFileSync(file, corruptBackup); } catch (_) {}
    throw new Error(`[历史记录损坏] 文件 ${file} 存在但为空文件。已备份至 ${corruptBackup}。为防止全量重复推送，已中止执行！`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const corruptBackup = `${file}.corrupt.${Date.now()}`;
    try { fs.copyFileSync(file, corruptBackup); } catch (_) {}
    throw new Error(`[历史记录损坏] 文件 ${file} 存在但 JSON 解析失败: ${e.message}。已备份至 ${corruptBackup}。为防止全量重复推送，已中止执行！`);
  }

  // 严格校验必须为普通对象且非数组、非null
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const corruptBackup = `${file}.corrupt.${Date.now()}`;
    try { fs.copyFileSync(file, corruptBackup); } catch (_) {}
    throw new Error(`[历史记录损坏] 文件 ${file} 内容不是有效的字典对象 (得到 ${Array.isArray(parsed) ? '数组' : typeof parsed})。已备份至 ${corruptBackup}。为防止全量重复推送，已中止执行！`);
  }

  return parsed;
}

// 立即安全写盘（写入临时文件后原子性替换，防止截断）
function saveHistory(file, historyObj) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(historyObj, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

// 兼容已上线的日期字符串键和最早的场次 ID 键，统一到 UTC 毫秒
function normalizeHistoryKeys(history) {
  if (!history || typeof history !== 'object') return history;
  for (const [oldKey, record] of Object.entries(history)) {
    const match = oldKey.match(/^(.*)_(\d{4}-\d{2}-\d{2}T.*)$/);
    let baseId, startMs;
    if (match) {
      baseId = match[1];
      startMs = Date.parse(match[2]);
    } else if (/^\d+$/.test(oldKey) && record && typeof record.stStr === 'string') {
      baseId = `key_${oldKey}`;
      startMs = Date.parse(record.stStr.replace(' ', 'T') + '+08:00');
    }
    if (baseId && Number.isFinite(startMs)) {
      const normalizedKey = `${baseId}_${startMs}`;
      if (!history[normalizedKey]) history[normalizedKey] = record;
      delete history[oldKey];
    }
  }
  return history;
}

// 判断记录是否为已发送（兼容旧版无 status 字段的 legacy sent 记录）
function isSentRecord(record) {
  if (!record) return false;
  return !record.status || record.status === 'sent';
}

// 判断记录是否处于 uncertain 不确定送达状态
function isUncertainRecord(record) {
  if (!record) return false;
  return record.status === 'uncertain';
}

module.exports = {
  loadHistory,
  saveHistory,
  normalizeHistoryKeys,
  isSentRecord,
  isUncertainRecord
};
