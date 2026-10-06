// src/timing.js - 提醒时间窗口边界定义与判断逻辑

// 双层提醒窗口设计：
// 1. 标准 30 分钟窗口：[20.0, 35.0] 分钟
// 2. 紧急补发窗口 (Catch-up Window)：(0, 20.0) 分钟（防止 GitHub 调度偶尔排队延迟导致错过窗口）
const WINDOW_STANDARD_MIN = 20.0;
const WINDOW_STANDARD_MAX = 35.0;
const WINDOW_CATCHUP_MAX = 20.0;

function isStandardWindow(diffMins) {
  return diffMins >= WINDOW_STANDARD_MIN && diffMins <= WINDOW_STANDARD_MAX;
}

function isCatchupWindow(diffMins) {
  return diffMins > 0 && diffMins < WINDOW_CATCHUP_MAX;
}

function isTimingMatched(diffMins) {
  return isStandardWindow(diffMins) || isCatchupWindow(diffMins);
}

module.exports = {
  WINDOW_STANDARD_MIN,
  WINDOW_STANDARD_MAX,
  WINDOW_CATCHUP_MAX,
  isStandardWindow,
  isCatchupWindow,
  isTimingMatched
};
