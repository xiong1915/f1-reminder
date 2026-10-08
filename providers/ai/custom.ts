// providers/ai/custom.ts
// 自定义模型 Provider 实现，安全封装服务端自定义端点与凭据

import { AIProvider, AIRequest, AIResponse, AIStreamEvent, ProviderHealth } from '../../lib/ai/types';
import { OpenAICompatibleProvider } from './openai_compat';

export class CustomProvider implements AIProvider {
  readonly id = 'custom';
  readonly name = 'Custom AI Provider';

  private inner: OpenAICompatibleProvider;

  constructor() {
    this.inner = new OpenAICompatibleProvider({
      apiKey: process.env.CUSTOM_AI_API_KEY,
      baseUrl: process.env.CUSTOM_AI_BASE_URL,
      model: process.env.CUSTOM_AI_MODEL || 'custom-model'
    });
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    return this.inner.generate(request);
  }

  async *stream(request: AIRequest): AsyncIterable<AIStreamEvent> {
    yield* this.inner.stream(request);
  }

  async healthCheck(): Promise<ProviderHealth> {
    const h = await this.inner.healthCheck();
    return {
      ...h,
      providerId: this.id,
      providerName: this.name
    };
  }
}
