// app/ai/page.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AIMessage, AISource, AIFactCard } from '@/lib/ai/types';
import { GlassComposer, GlassButton } from '@/components/glass';

export type AIStatus =
  | 'idle'
  | 'composing'
  | 'submitting'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'aborted'
  | 'rate_limited'
  | 'offline';

const PROMPT_SUGGESTIONS = [
  '2026 赛季当前车手积分榜前五名是谁？',
  '新加坡大奖赛正赛几点开赛？包含冲刺赛吗？',
  '解释一下什么是 Undercut 战术以及它的成功前提',
  '谁是上一场大奖赛的分站冠军？'
];

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: AISource[];
  factCard?: AIFactCard;
  status?: 'completed' | 'streaming' | 'error' | 'aborted';
}

export default function AIPage() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AIStatus>('idle');
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingSources, setStreamingSources] = useState<AISource[]>([]);
  const [streamingFactCard, setStreamingFactCard] = useState<AIFactCard | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isComposingRef = useRef(false); // 中文输入法组合保护
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 滚动至最新内容
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // 中断当前流式请求
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('aborted');
    if (streamingContent || streamingFactCard) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: (streamingContent || '') + ' [已中断生成]',
          sources: streamingSources,
          factCard: streamingFactCard || undefined,
          status: 'aborted'
        }
      ]);
      setStreamingContent('');
      setStreamingSources([]);
      setStreamingFactCard(null);
    }
  }, [streamingContent, streamingSources, streamingFactCard]);

  // 发送消息
  const sendMessage = useCallback(async (textToSend?: string) => {
    const q = (textToSend !== undefined ? textToSend : input).trim();
    if (!q || status === 'submitting' || status === 'streaming') return;

    // 清除上一次中断
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
      status: 'completed'
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setStatus('submitting');
    setStreamingContent('');
    setStreamingSources([]);
    setStreamingFactCard(null);
    setErrorMessage(null);

    const apiPayload: AIMessage[] = nextHistory.map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      setStatus('streaming');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiPayload, stream: true }),
        signal: controller.signal
      });

      if (res.status === 429) {
        setStatus('rate_limited');
        throw new Error('请求过于频繁，请稍候再试 (Rate Limited)');
      }

      if (!res.ok) {
        throw new Error(`服务端异常 (HTTP ${res.status})`);
      }

      if (!res.body) {
        throw new Error('无法建立数据流连接通道');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let collectedText = '';
      let collectedSources: AISource[] = [];
      let collectedFactCard: AIFactCard | null = null;

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
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'delta' && parsed.content) {
              collectedText += parsed.content;
              setStreamingContent(collectedText);
            } else if (parsed.type === 'fact_card' && parsed.factCard) {
              collectedFactCard = parsed.factCard;
              setStreamingFactCard(collectedFactCard);
            } else if (parsed.type === 'sources' && Array.isArray(parsed.sources)) {
              collectedSources = parsed.sources;
              setStreamingSources(collectedSources);
            } else if (parsed.type === 'error') {
              throw new Error(parsed.error || '模型生成异常');
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              // Non-JSON SSE syntax or thrown error
            }
          }
        }
      }

      // 完成流式
      setMessages(prev => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: collectedText,
          sources: collectedSources,
          factCard: collectedFactCard || undefined,
          status: 'completed'
        }
      ]);
      setStreamingContent('');
      setStreamingSources([]);
      setStreamingFactCard(null);
      setStatus('completed');
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        setStatus('aborted');
      } else if (!navigator.onLine) {
        setStatus('offline');
        setErrorMessage('网络已断开，请检查网络连接');
      } else {
        setStatus('error');
        setErrorMessage(err.message || '请求超时或连接失败');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [input, messages, status]);

  // 从首页搜索框等携带的 prompt 初始化自动发送
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPrompt = sessionStorage.getItem('apex_ai_prompt');
      if (savedPrompt) {
        sessionStorage.removeItem('apex_ai_prompt');
        sendMessage(savedPrompt);
      }
    }
  }, [sendMessage]);

  // 重试最近一次提问
  const handleRetry = () => {
    const lastUserTurn = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserTurn) {
      sendMessage(lastUserTurn.content);
    }
  };

  // 键盘回车与中文输入法 (IME) 防误触
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (isComposingRef.current) {
        // 正在拼音输入法候选词输入中，不触发提交
        return;
      }
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClear = () => {
    if (status === 'streaming') {
      handleStop();
    }
    setMessages([]);
    setStreamingContent('');
    setStreamingSources([]);
    setErrorMessage(null);
    setStatus('idle');
  };

  const isGenerating = status === 'submitting' || status === 'streaming';

  return (
    <div
      className="section-dark"
      style={{
        minHeight: 'calc(100dvh - 64px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '32px 0 env(safe-area-inset-bottom, 24px)'
      }}
    >
      <div className="container" style={{ maxWidth: '880px', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--line-dark)', paddingBottom: '20px', marginBottom: '28px' }}>
          <div>
            <div className="badge-pill badge-red" style={{ marginBottom: '8px' }}>
              FIA 官方数据基准 · 深度赛车策略
            </div>
            <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800 }}>
              TIKE AI 智能控制台
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              实时赛季事实快通道 (Fast Path) · 战术模型推演 · 全网赛事要闻溯源
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {messages.length > 0 && (
              <GlassButton variant="ghost" size="sm" onClick={handleClear}>
                清空对话
              </GlassButton>
            )}
            <Link href="/system" style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 10px' }}>
              拓扑状态
            </Link>
          </div>
        </div>

        {/* Message Stream */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
          {messages.length === 0 && !isGenerating && (
            <div style={{ textAlign: 'center', padding: '48px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed var(--line-dark)' }}>
              <div style={{ fontSize: '32px', marginBottom: '14px' }}>✦</div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>准备就绪，欢迎提问</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                支持 2026 赛季赛历换算、分站正赛时间、车手与车队积分榜、争冠数学模型以及空气动力学战术推演。
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {PROMPT_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(s)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--line-dark)',
                      color: 'var(--text-secondary)',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-pill)',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              {/* 事实快通道卡片 (Fact Fast Path) */}
              {m.factCard && (
                <div
                  style={{
                    width: '100%',
                    maxWidth: '88%',
                    background: 'rgba(255, 45, 32, 0.05)',
                    border: '1px solid rgba(255, 45, 32, 0.25)',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#ff453a' }}>
                      {m.factCard.title}
                    </span>
                    {m.factCard.badge && (
                      <span className="badge-pill badge-red" style={{ fontSize: '10px' }}>
                        {m.factCard.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {m.factCard.fields.map((f, fIdx) => (
                      <div key={fIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: fIdx === m.factCard!.fields.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{f.label}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {m.content && (
                <div
                  style={{
                    maxWidth: '88%',
                    padding: '14px 18px',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: m.role === 'user' ? 'var(--accent-red)' : 'var(--bg-secondary)',
                    color: m.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--line-dark)',
                    lineHeight: 1.65,
                    fontSize: '15px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    boxShadow: m.role === 'user' ? '0 4px 16px rgba(255,45,32,0.3)' : '0 4px 16px rgba(0,0,0,0.3)'
                  }}
                >
                  {m.content}
                </div>
              )}

              {m.sources && m.sources.length > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '88%', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>溯源权威:</span>
                  {m.sources.map((s, sIdx) => (
                    <span key={sIdx} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>{s.name}</a>
                      ) : s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* 流式生成中的气泡 */}
          {isGenerating && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {streamingFactCard && (
                <div
                  style={{
                    width: '100%',
                    maxWidth: '88%',
                    background: 'rgba(255, 45, 32, 0.05)',
                    border: '1px solid rgba(255, 45, 32, 0.25)',
                    borderRadius: '16px',
                    padding: '14px 18px',
                    marginBottom: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#ff453a' }}>
                      {streamingFactCard.title}
                    </span>
                    {streamingFactCard.badge && (
                      <span className="badge-pill badge-red" style={{ fontSize: '10px' }}>
                        {streamingFactCard.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {streamingFactCard.fields.map((f, fIdx) => (
                      <div key={fIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: fIdx === streamingFactCard.fields.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)', paddingBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{f.label}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  maxWidth: '88%',
                  padding: '14px 18px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--line-dark)',
                  lineHeight: 1.65,
                  fontSize: '15px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {streamingContent || (
                  <span style={{ color: 'var(--text-muted)' }}>
                    正在检索 2026 赛季事实基准并组织推演分析...
                  </span>
                )}
              </div>

              {streamingSources.length > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontWeight: 700 }}>实时溯源:</span>
                  {streamingSources.map((s, sIdx) => (
                    <span key={sIdx} style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                      {s.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 异常提示与重试 */}
          {errorMessage && (
            <div
              style={{
                padding: '14px 18px',
                background: 'rgba(255,45,32,0.1)',
                border: '1px solid rgba(255,45,32,0.3)',
                borderRadius: '14px',
                color: '#ff453a',
                fontSize: '13px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{errorMessage}</span>
              <GlassButton variant="primary" size="sm" onClick={handleRetry}>
                重试
              </GlassButton>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* 底部功能性输入框：Liquid Glass Composer */}
        <div style={{ position: 'sticky', bottom: '16px', zIndex: 50 }}>
          <GlassComposer isFocused={isFocused} style={{ padding: '8px 12px 8px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  if (status === 'completed' || status === 'idle') {
                    setStatus('composing');
                  }
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  isComposingRef.current = false;
                }}
                onKeyDown={handleKeyDown}
                placeholder="输入 F1 问题（Enter 发送，Shift+Enter 换行）..."
                disabled={isGenerating}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '15px',
                  color: 'var(--text-primary)',
                  resize: 'none',
                  maxHeight: '120px',
                  lineHeight: 1.4,
                  padding: '6px 0',
                  fontFamily: 'inherit'
                }}
              />

              {isGenerating ? (
                <GlassButton variant="danger" size="md" onClick={handleStop}>
                  停止
                </GlassButton>
              ) : (
                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  style={{ opacity: !input.trim() ? 0.5 : 1, cursor: !input.trim() ? 'not-allowed' : 'pointer' }}
                >
                  发送
                </GlassButton>
              )}
            </div>
          </GlassComposer>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
            AI 生成内容仅供参考 · 事实数据基于 2026 FIA 官方权威规程
          </div>
        </div>
      </div>
    </div>
  );
}
