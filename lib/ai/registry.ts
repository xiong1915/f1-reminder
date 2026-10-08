// lib/ai/registry.ts
// AI Provider 注册表与解析中心

import { AIProvider, ProviderHealth } from './types';
import { DeepSeekProvider } from '../../providers/ai/deepseek';
import { OpenAICompatibleProvider } from '../../providers/ai/openai_compat';
import { CustomProvider } from '../../providers/ai/custom';

export class ProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private defaultProviderId: string;

  constructor() {
    // 默认内置注册三大 Provider
    this.register(new DeepSeekProvider());
    this.register(new OpenAICompatibleProvider());
    this.register(new CustomProvider());

    // 解析当前环境变量设定的默认 Provider
    this.defaultProviderId = process.env.AI_PROVIDER?.toLowerCase() || 'deepseek';
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  get(providerId?: string): AIProvider {
    const id = (providerId || this.defaultProviderId).toLowerCase();
    const provider = this.providers.get(id);
    if (!provider) {
      // 容错降级至已注册的第一个可用 provider 或 deepseek
      const fallback = this.providers.get('deepseek') || Array.from(this.providers.values())[0];
      if (!fallback) throw new Error(`[ProviderRegistry] No AI Provider available for id: ${id}`);
      return fallback;
    }
    return provider;
  }

  list(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  async getAllHealth(): Promise<ProviderHealth[]> {
    const results: ProviderHealth[] = [];
    for (const p of this.providers.values()) {
      if (p.healthCheck) {
        try {
          results.push(await p.healthCheck());
        } catch (e: any) {
          results.push({
            status: 'unavailable',
            providerId: p.id,
            providerName: p.name,
            model: 'unknown',
            apiStyle: 'unknown',
            error: e.message
          });
        }
      }
    }
    return results;
  }
}

export const defaultRegistry = new ProviderRegistry();
