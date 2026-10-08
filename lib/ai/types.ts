// lib/ai/types.ts
// 统一 AI Provider 接口与类型定义

export type AIRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AIMessage {
  role: AIRole;
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIRequest {
  messages: AIMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  reasoningEffort?: 'low' | 'medium' | 'high';
  tools?: AITool[];
  responseFormat?: unknown;
  signal?: AbortSignal;
}

export interface AISource {
  name: string;
  url?: string;
  snippet?: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  sources?: AISource[];
}

export type AIStreamEventType = 'delta' | 'done' | 'error' | 'sources' | 'tool_call' | 'fact_card';

export interface AIFactCardField {
  label: string;
  value: string;
}

export interface AIFactCard {
  type: 'next_race' | 'standings' | 'previous_race';
  title: string;
  badge?: string;
  fields: AIFactCardField[];
}

export interface AIStreamEvent {
  type: AIStreamEventType;
  content?: string;
  sources?: AISource[];
  factCard?: AIFactCard;
  error?: string;
}

export type HealthStatus = 'healthy' | 'degraded' | 'unavailable';

export interface ProviderHealth {
  status: HealthStatus;
  providerId: string;
  providerName: string;
  model: string;
  apiStyle: string;
  latencyMs?: number;
  lastSuccessfulRequest?: string;
  error?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<AIStreamEvent>;
  healthCheck?(): Promise<ProviderHealth>;
}
