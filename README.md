# F1 每周赛程规划与开赛提醒

每周日北京时间 12:07 读取随后 8 天的赛程，保存 weekly-plan.json，并为每场比赛生成开赛前 30 分钟（主触发）及开赛前 15 分钟（备用触发）的双重 GitHub Actions 定时任务。无比赛时不生成比赛定时任务，也不发送消息。提醒阶段读取已保存的计划，不轮询赛程接口。

## 设置

保留现有 PUSH_KEY（飞书等推送地址）及可选 PUSHPLUS_CHANNEL。

在仓库 Settings → Secrets and variables → Actions 中新增 SCHEDULE_TOKEN：
- 使用 fine-grained personal access token，只选择 xiong1915/f1-reminder
- Repository permissions：Contents 和 Workflows 均为 Read and write
- 令牌到期前需要更新；不要把令牌提交到代码或日志

设置后可在 Actions 中手动运行 F1 Weekly Planner，首次生成或刷新计划。每周规划不会发送测试消息。F1 Race 30-Min Reminder 的 test_mode 仅用于主动测试机器人通路。

## 行为与故障

- 规划失败、令牌缺失/过期、提交失败，会使任务报错；旧计划保留，不清空提醒历史
- 提醒计划有效期 8 天，过期时停止依据旧计划发送并明确报错
- 已取消的场次不排入计划；相同场次及相同时间只提醒一次，真正改期可重新提醒
- 无比赛周只运行一次规划；有比赛周另加实际提醒次数
- 保留练习、排位、冲刺和正赛提醒
- 每周检查后发生的改期或取消，需要手动刷新计划，周内不会自动重新查询
- GitHub 定时任务可能延迟或被丢弃，无法保证准点或每次送达；程序在开赛后不补发
- 推送接口成功不等于每位群成员已收到或阅读
