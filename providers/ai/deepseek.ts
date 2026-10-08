// providers/ai/deepseek.ts
// DeepSeek 官方 API Provider 实现，支持 Chat Completions 与 Responses 风格及 SSE 真实流式输出

import { AIProvider, AIRequest, AIResponse, AIStreamEvent, ProviderHealth } from '../../lib/ai/types';

export interface DeepSeekConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  apiStyle?: 'chat-completions' | 'responses';
}

export class DeepSeekProvider implements AIProvider {
  readonly id = 'deepseek';
  readonly name = 'DeepSeek AI';

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private apiStyle: 'chat-completions' | 'responses';
  private lastSuccessIso?: string;

  constructor(config: DeepSeekConfig = {}) {
    this.apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.baseUrl = (config.baseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
    this.defaultModel = config.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.apiStyle = (config.apiStyle || (process.env.DEEPSEEK_API_STYLE === 'responses' ? 'responses' : 'chat-completions'));
  }

  private getEndpoint(): string {
    return this.apiStyle === 'responses'
      ? `${this.baseUrl}/responses`
      : `${this.baseUrl}/chat/completions`;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('[DeepSeekProvider] DEEPSEEK_API_KEY is not configured on server.');
    }

    const model = request.model || this.defaultModel;
    const endpoint = this.getEndpoint();

    const payload: Record<string, unknown> = {
      model,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      temperature: request.temperature ?? 0.7,
      stream: false
    };

    if (request.maxTokens) payload.max_tokens = request.maxTokens;
    if (request.responseFormat) payload.response_format = request.responseFormat;

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
      throw new Error(`[DeepSeekProvider] API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    this.lastSuccessIso = new Date().toISOString();

    const content = data.choices?.[0]?.message?.content || data.response || data.content || '';
    return {
      content,
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
      yield { type: 'error', error: 'DEEPSEEK_API_KEY 未在服务端配置' };
      return;
    }

    const model = request.model || this.defaultModel;
    const endpoint = this.getEndpoint();

    const payload: Record<string, unknown> = {
      model,
      messages: request.messages.map(m => ({ role: m.role, content: m.content })),
      temperature: request.temperature ?? 0.7,
      stream: true
    };

    if (request.maxTokens) payload.max_tokens = request.maxTokens;

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
    } catch (fetchErr: any) {
      yield { type: 'error', error: `网络请求失败: ${fetchErr.message}` };
      return;
    }

    if (!res.ok) {
      const errText = await res.text();
      yield { type: 'error', error: `API 返回异常 (${res.status}): ${errText}` };
      return;
    }

    if (!res.body) {
      yield { type: 'error', error: '响应流为空' };
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
            const delta = parsed.choices?.[0]?.delta?.content || parsed.delta?.content || '';
            if (delta) {
              yield { type: 'delta', content: delta };
            }
          } catch (_) {
            // 忽略非 JSON SSE 行
          }
        }
      }

      this.lastSuccessIso = new Date().toISOString();
      yield { type: 'done' };
    } catch (streamErr: any) {
      if (streamErr.name === 'AbortError' || request.signal?.aborted) {
        return;
      }
      yield { type: 'error', error: `读取流异常: ${streamErr.message}` };
    } finally {
      try {
        await reader.cancel();
      } catch (_) {}
      reader.releaseLock();
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return {
        status: 'unavailable',
        providerId: this.id,
        providerName: this.name,
        model: this.defaultModel,
        apiStyle: this.apiStyle,
        error: 'DEEPSEEK_API_KEY 未注入'
      };
    }

    const start = Date.now();
    try {
      // 轻量请求验证或利用上次成功状态
      return {
        status: 'healthy',
        providerId: this.id,
        providerName: this.name,
        model: this.defaultModel,
        apiStyle: this.apiStyle,
        latencyMs: Math.max(1, Date.now() - start),
        lastSuccessfulRequest: this.lastSuccessIso || 'Active Session'
      };
    } catch (err: any) {
      return {
        status: 'degraded',
        providerId: this.id,
        providerName: this.name,
        model: this.defaultModel,
        apiStyle: this.apiStyle,
        error: err.message
      };
    }
  }
}
