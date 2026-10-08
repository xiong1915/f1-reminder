# TIKE V3 AI Provider 配置与扩展指南

本文档介绍如何在 TIKE V3 平台配置或扩展不同的 AI 模型提供者。

---

## 1. 默认提供者：DeepSeek AI

TIKE V3 默认选用 **DeepSeek** 作为主要推理引擎。

### 配置方式
在环境变量中配置：
```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_API_STYLE=chat-completions
```

- **`DEEPSEEK_API_STYLE`** 可选值：
  - `chat-completions`：调用 `/chat/completions` 端点（标准 OpenAI 兼容风格）。
  - `responses`：调用 `/responses` 端点。

---

## 2. 通用 OpenAI-Compatible 提供者

如需接入任何提供 OpenAI 兼容格式的服务（如本地 Ollama、OpenRouter、OneAPI 等），只需修改环境变量：

```bash
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://your-provider-url.com/v1
AI_API_KEY=your_key
AI_MODEL=model-name
```
无需改动任何核心业务或 UI 代码。

---

## 3. 自定义 Provider (Custom)

```bash
AI_PROVIDER=custom
CUSTOM_AI_BASE_URL=https://custom-service.internal/v1
CUSTOM_AI_API_KEY=your_secret
CUSTOM_AI_MODEL=custom-agent
```

---

## 4. 成本控制与防刷防护

TIKE 平台内置以下防刷和费用保护参数：

```bash
# 显式降级：默认为 none。严禁主模型失败时私自调用未经确认的收费模型！
AI_FALLBACK_PROVIDER=none

# 单次生成的最大 Token 上限
AI_MAX_OUTPUT_TOKENS=2048

# 多轮对话保留的最大历史消息条数
AI_MAX_HISTORY_MESSAGES=10

# 滑动窗口限流：每个客户端/IP 每分钟的最大请求次数
AI_RATE_LIMIT=30
```

---

## 5. 扩展新 Provider

实现 `AIProvider` 接口（位于 `lib/ai/types.ts`）：
```typescript
import { AIProvider, AIRequest, AIResponse, AIStreamEvent, ProviderHealth } from '@/lib/ai/types';

export class MyNewProvider implements AIProvider {
  readonly id = 'my-provider';
  readonly name = 'My Provider';

  async generate(request: AIRequest): Promise<AIResponse> { ... }
  async *stream(request: AIRequest): AsyncIterable<AIStreamEvent> { ... }
  async healthCheck?(): Promise<ProviderHealth> { ... }
}
```
然后在 `lib/ai/registry.ts` 的 `ProviderRegistry` 中通过 `this.register(new MyNewProvider())` 注册即可。
