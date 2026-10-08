// lib/ai/service.ts
// AIService 核心调度门面：封装限流防护、成本保护、会话裁剪与显式 Fallback 策略

import { AIRequest, AIResponse, AIStreamEvent, AIProvider } from './types';
import { ProviderRegistry, defaultRegistry } from './registry';

// 简单内存滑动窗口限流器 (保护个人 DeepSeek API 不被外部恶意刷爆)
class SlidingWindowRateLimiter {
  private requests = new Map<string, number[]>();
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 30, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = (this.requests.get(key) || []).filter(t => now - t < this.windowMs);
    if (timestamps.length >= this.limit) {
      this.requests.set(key, timestamps);
      return false;
    }
    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }
}

export class AIService {
  private registry: ProviderRegistry;
  private rateLimiter: SlidingWindowRateLimiter;
  private maxOutputTokens: number;
  private maxHistoryMessages: number;
  private fallbackProviderId: string;

  constructor(registry: ProviderRegistry = defaultRegistry) {
    this.registry = registry;
    const rateLimit = parseInt(process.env.AI_RATE_LIMIT || '30', 10);
    this.rateLimiter = new SlidingWindowRateLimiter(rateLimit, 60000);
    this.maxOutputTokens = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '2048', 10);
    this.maxHistoryMessages = parseInt(process.env.AI_MAX_HISTORY_MESSAGES || '10', 10);
    this.fallbackProviderId = (process.env.AI_FALLBACK_PROVIDER || 'none').toLowerCase();
  }

  private sanitizeRequest(request: AIRequest): AIRequest {
    // 裁剪超长历史上下文，仅保留最新 N 条消息 + 始终保留 system prompt
    let messages = [...request.messages];
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystem = messages.filter(m => m.role !== 'system');

    if (nonSystem.length > this.maxHistoryMessages) {
      messages = [...systemMessages, ...nonSystem.slice(-this.maxHistoryMessages)];
    }

    return {
      ...request,
      messages,
      maxTokens: request.maxTokens ? Math.min(request.maxTokens, this.maxOutputTokens) : this.maxOutputTokens
    };
  }

  checkRateLimit(clientIdentifier: string): boolean {
    return this.rateLimiter.isAllowed(clientIdentifier);
  }

  async generate(request: AIRequest, providerId?: string, clientKey?: string): Promise<AIResponse> {
    if (clientKey && !this.checkRateLimit(clientKey)) {
      throw new Error('请求过于频繁，请稍后再试 (Rate limit exceeded)');
    }

    const sanitized = this.sanitizeRequest(request);
    const primaryProvider = this.registry.get(providerId);

    try {
      return await primaryProvider.generate(sanitized);
    } catch (primaryErr: any) {
      console.warn(`[AIService] Primary provider '${primaryProvider.id}' failed: ${primaryErr.message}`);

      // 仅当显式配置了 fallback 时才尝试降级，绝不私自调用未经确认的收费模型
      if (this.fallbackProviderId && this.fallbackProviderId !== 'none' && this.fallbackProviderId !== primaryProvider.id) {
        try {
          console.info(`[AIService] Attempting explicit fallback to '${this.fallbackProviderId}'...`);
          const fallbackProvider = this.registry.get(this.fallbackProviderId);
          return await fallbackProvider.generate(sanitized);
        } catch (fallbackErr: any) {
          console.error(`[AIService] Fallback provider '${this.fallbackProviderId}' also failed: ${fallbackErr.message}`);
        }
      }

      throw primaryErr;
    }
  }

  async *stream(request: AIRequest, providerId?: string, clientKey?: string): AsyncIterable<AIStreamEvent> {
    if (clientKey && !this.checkRateLimit(clientKey)) {
      yield { type: 'error', error: '请求过于频繁，请稍后再试 (Rate limit exceeded)' };
      return;
    }

    const sanitized = this.sanitizeRequest(request);
    const primaryProvider = this.registry.get(providerId);

    try {
      yield* primaryProvider.stream(sanitized);
    } catch (err: any) {
      yield { type: 'error', error: err.message };
    }
  }
}

export const defaultAIService = new AIService(defaultRegistry);
