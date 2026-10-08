# Rule: APEX AI Specifications

## 1. 架构与默认 Provider
- 默认提供者：DeepSeek (`deepseek-chat`)。
- 费用兜底与降级：`AI_FALLBACK_PROVIDER=none`，严禁在主模型异常时擅自切换付费模型。

## 2. 事实快通道 (F1 Fact Fast Path)
- 对于客观确定性查询（如“下一站几点开赛”、“当前积分榜前三是谁”、“上站谁赢了”）：
  - 优先由 Canonical F1 Core 数据层即时直出结构化 Fact Card。
  - DeepSeek 只负责战术策略分析、规则解释和自然语言补充。
  - 严禁 DeepSeek 的生成文本覆盖 Canonical 事实（例如官方开赛时间为 20:00，模型幻觉 21:00，界面必须呈现 20:00）。

## 3. 全链路流式与可中断保护 (Abort Controller)
- 前端状态机：`idle` | `composing` | `submitting` | `streaming` | `completed` | `error` | `aborted` | `rate_limited` | `offline`。
- 用户点击停止 (Stop)：
  - 必须立刻触发前端 `AbortController.abort()`。
  - 信号沿 HTTP 连接中断传递至 Next.js API Route。
  - 后端中止对 DeepSeek 的流式请求，停止消耗 Token。
- SSE 处理：严格处理 chunk 分包、跨多帧合并、UTF-8 多字节截断解析。

## 4. 交互细节
- Desktop：`Enter` 发送，`Shift+Enter` 换行。严格监听 `compositionstart` / `compositionend`，中文输入法选词回车绝不误触发发送。
- 错误恢复：出错时保留已输入及已生成内容，提供单键 Retry。
- 领域隔离：通用非 F1 问题（如代码、数学、日常常识）正常回答，严禁强行插话 F1 话题。
