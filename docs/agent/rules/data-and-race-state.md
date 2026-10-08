# Rule: Data & Race State Specifications

## 1. 动态事实与权威链路
- 赛历、分站安排、Session、车手与车队积分榜、比赛结果、最快圈属于**动态竞赛事实**。
- 严禁在页面或组件内部 hardcode 当前分站或排名前列数据。
- 必须通过 `F1Service` 访问，链路为：
  `Jolpica / OpenF1` -> `Cache (Redis / Memory)` -> `LKG Snapshot (.lkg_snapshot.json)` -> `Unavailable`
- 赛季总场数必须使用 `calendar.length` 动态计算，不得写死 `23` 或 `24`。
- 分站唯一识别键：`season + meetingId + circuitId`。

## 2. 统一赛事状态机 (RaceStateService)
所有页面、倒计时组件、卡片、AI 必须使用全站唯一的 `RaceStateService`：
- `UPCOMING_WEEKEND`：距离本站第一节自由练习 (FP1) 超过 2 小时。
- `SESSION_UPCOMING`：距离下一节 (FP/Quali/Sprint/Race) 在 2 小时以内且未到开赛时间。
- `SESSION_IN_PROGRESS`：从该节开赛时间到预计结束时间（通常练习赛/排位赛 1~1.5 小时，正赛 2~2.5 小时，红旗/雨地封顶 3 小时）。
- `SESSION_FINISHED`：当前节结束，但周末尚未完结。
- `RACE_FINISHED`：正赛已结束，官方初步结果产生。
- `WEEKEND_FINISHED`：正赛结束且官方积分榜已更新，准备过渡到下一分站。

## 3. 时间与倒计时计算
- 内部数据流绝对统一使用 UTC ISO-8601。
- 倒计时剩余毫秒：`Math.max(0, targetTimestamp - Date.now())`，严禁递减本地变量或出现负数。
- 展示层日期时间强制经由统一 formatter (`formatDate`, `formatTime`, `formatDateTime`, `formatRaceRange`, `formatBeijingDisplay`)，杜绝出现 `10月月09日日`、`Invalid Date`、`NaN`、`undefined`。
