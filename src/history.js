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

// 兼容已上线的日期字符串键和最早的场次 ID 键，统一到 UTC 毫秒 (同时兼容 :start 开赛后缀)
function normalizeHistoryKeys(history) {
  if (!history || typeof history !== 'object') return history;
  for (const [oldKey, record] of Object.entries(history)) {
    const match = oldKey.match(/^(.*)_(\d{4}-\d{2}-\d{2}T.*?)(:start)?$/);
    let baseId, startMs, suffix = '';
    if (match) {
      baseId = match[1];
      startMs = Date.parse(match[2]);
      suffix = match[3] || '';
    } else if (/^\d+(:start)?$/.test(oldKey) && record && typeof record.stStr === 'string') {
      const isStart = oldKey.endsWith(':start');
      const rawId = isStart ? oldKey.replace(':start', '') : oldKey;
      baseId = `key_${rawId}`;
      startMs = Date.parse(record.stStr.replace(' ', 'T') + '+08:00');
      suffix = isStart ? ':start' : '';
    }
    if (baseId && Number.isFinite(startMs)) {
      const normalizedKey = `${baseId}_${startMs}${suffix}`;
      if (!history[normalizedKey]) history[normalizedKey] = record;
      if (normalizedKey !== oldKey) {
        delete history[oldKey];
      }
    }
  }
  return history;
}

// 从键名或 ISO 字符串中提取开赛时间戳（毫秒）
function extractTimestampFromKey(k) {
  if (!k || typeof k !== 'string') return null;
  const clean = k.endsWith(':start') ? k.slice(0, -6) : k;
  const numMatch = clean.match(/_(\d{12,14})$/);
  if (numMatch) return Number(numMatch[1]);
  const parts = clean.split(':');
  if (parts.length >= 6) {
    const iso = parts.slice(5).join(':');
    const t = Date.parse(iso);
    if (Number.isFinite(t)) return t;
  }
  return null;
}

// 多别名键安全检索记录：支持直接键查、ISO毫秒兼容（.000Z <-> Z）以及基于开赛时间戳与环节的语义级去重
function findHistoryRecord(history, candidateKeys, sessionContext) {
  if (!history || typeof history !== 'object') return null;
  const keys = Array.isArray(candidateKeys) ? candidateKeys : [candidateKeys];

  // 1. 直匹配 candidateKeys
  for (const k of keys) {
    if (k && history[k]) return history[k];
  }

  // 2. 尝试 ISO 毫秒互换匹配 (.000Z <-> Z)
  for (const k of keys) {
    if (!k || typeof k !== 'string') continue;
    let altKey = null;
    if (k.includes('.000Z')) {
      altKey = k.replace('.000Z', 'Z');
    } else if (k.match(/:\d{2}Z/)) {
      altKey = k.replace(/(:?\d{2})Z/, '$1.000Z');
    }
    if (altKey && history[altKey]) return history[altKey];
  }

  // 3. 语义级时间戳与环节匹配（深度安全兜底，彻底杜绝跨系统键名命名差异导致的重复投递）
  const targetTimeMs = sessionContext?.startTimeMs || (keys[0] ? extractTimestampFromKey(keys[0]) : null);
  const targetPhase = sessionContext?.phase || (keys[0] && keys[0].endsWith(':start') ? 'start' : 'before');

  if (Number.isFinite(targetTimeMs)) {
    for (const record of Object.values(history)) {
      if (!record || typeof record !== 'object') continue;
      const recTimeMs = record.start_time_utc ? Date.parse(record.start_time_utc) :
                        (record.stStr ? Date.parse(record.stStr.replace(' ', 'T') + '+08:00') : null);
      const recPhase = record.phase || (record.redis_key && record.redis_key.endsWith(':start') ? 'start' : 'before');

      if (Number.isFinite(recTimeMs) && recTimeMs === targetTimeMs && recPhase === targetPhase) {
        return record;
      }
    }
  }

  return null;
}

// 安全合并历史记录：绝不覆盖已确认 sent 的记录，绝不丢弃旧记录
function mergeHistory(existingHistory, newRecords) {
  const merged = { ...(existingHistory || {}) };
  if (!newRecords || typeof newRecords !== 'object') return merged;

  for (const [k, v] of Object.entries(newRecords)) {
    if (!merged[k]) {
      merged[k] = v;
    } else {
      // 若已有记录已被确认为 sent，绝不能被 uncertain 或 pending 覆盖退化
      if (merged[k].status === 'sent' && v.status !== 'sent') {
        continue;
      }
      merged[k] = { ...merged[k], ...v };
    }
  }
  return merged;
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
  extractTimestampFromKey,
  findHistoryRecord,
  mergeHistory,
  isSentRecord,
  isUncertainRecord
};

