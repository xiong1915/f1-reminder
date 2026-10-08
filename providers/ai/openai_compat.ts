// providers/ai/openai_compat.ts
// 通用 OpenAI 兼容协议 Provider 实现，支持无缝接入任何兼容 OpenAI API 规范的服务

import { AIProvider, AIRequest, AIResponse, AIStreamEvent, ProviderHealth } from '../../lib/ai/types';

export interface OpenAICompatConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id = 'openai-compatible';
  readonly name = 'OpenAI Compatible';

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private lastSuccessIso?: string;

  constructor(config: OpenAICompatConfig = {}) {
    this.apiKey = config.apiKey || process.env.AI_API_KEY || '';
    this.baseUrl = (config.baseUrl || process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.defaultModel = config.model || process.env.AI_MODEL || 'gpt-4o-mini';
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('[OpenAICompatibleProvider] AI_API_KEY is not configured on server.');
    }

    const model = request.model || this.defaultModel;
    const endpoint = `${this.baseUrl}/chat/completions`;

    const payload: Record<string, unknown> = {
      model,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      temperature: request.temperature ?? 0.7,
      stream: false
    };

    if (request.maxTokens) payload.max_tokens = request.maxTokens;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload),
      signal: request.signal
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[OpenAICompatibleProvider] API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    this.lastSuccessIso = new Date().toISOString();

    return {
      content: data.choices?.[0]?.message?.content || '',
      model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined
    };
  }

  async *stream(request: AIRequest): AsyncIterable<AIStreamEvent> {
    if (!this.apiKey) {
      yield { type: 'error', error: 'AI_API_KEY 未配置' };
      return;
    }

    const model = request.model || this.defaultModel;
    const endpoint = `${this.baseUrl}/chat/completions`;

    const payload: Record<string, unknown> = {
      model,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      temperature: request.temperature ?? 0.7,
      stream: true
    };

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        signal: request.signal
      });
    } catch (err: any) {
      yield { type: 'error', error: `网络请求失败: ${err.message}` };
      return;
    }

    if (!res.ok || !res.body) {
      const err = await res.text().catch(() => 'No body');
      yield { type: 'error', error: `API 返回异常: ${err}` };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') {
            this.lastSuccessIso = new Date().toISOString();
            yield { type: 'done' };
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) yield { type: 'delta', content: delta };
          } catch (_) {}
        }
      }
      this.lastSuccessIso = new Date().toISOString();
      yield { type: 'done' };
    } finally {
      reader.releaseLock();
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      status: this.apiKey ? 'healthy' : 'unavailable',
      providerId: this.id,
      providerName: this.name,
      model: this.defaultModel,
      apiStyle: 'chat-completions',
      lastSuccessfulRequest: this.lastSuccessIso
    };
  }
}
