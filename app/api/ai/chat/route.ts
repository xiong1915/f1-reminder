import { NextRequest, NextResponse } from 'next/server';
import { defaultAIOrchestrator } from '@/lib/ai/orchestrator';
import { AIMessage } from '@/lib/ai/types';
import { getRateLimitStore } from '@/lib/storage';

export const dynamic = 'force-dynamic';

function extractTrustedClientIp(req: NextRequest): string {
  // 1. 优先采用 Cloudflare 边缘不可伪造的真实客户端 IP (cf-connecting-ip)
  const cfIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  // 2. 其次采用 Vercel 注入的真实客户端 IP (x-real-ip)
  const realIp = req.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  // 3. 再次回退解析 x-forwarded-for 中的第一个 IP
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const list = fwd.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length > 0) return list[0];
  }

  return '127.0.0.1';
}

async function checkRateLimit(clientIp: string): Promise<{ allowed: boolean; retryAfter: number; reason?: string }> {
  try {
    const limiter = getRateLimitStore();

    // 1. 全局小时总使用量保护 (600次/小时, 跨实例由 Redis INCR 原子保证)
    const globalRes = await limiter.checkRateLimit('ai:global:hourly', 600, 3600);
    if (!globalRes.allowed) {
      const retryAfter = Math.max(1, Math.ceil((globalRes.resetAt - Date.now()) / 1000));
      return {
        allowed: false,
        retryAfter,
        reason: '服务当前调用量较高，已启用总额度保护，请稍后重试'
      };
    }

    // 2. 单客户端 IP 频次限制 (15次/分钟, 跨实例由 Redis INCR 原子保证)
    const ipRes = await limiter.checkRateLimit(`ai:ip:${clientIp}`, 15, 60);
    if (!ipRes.allowed) {
      const retryAfter = Math.max(1, Math.ceil((ipRes.resetAt - Date.now()) / 1000));
      return {
        allowed: false,
        retryAfter,
        reason: '请求过于频繁，请稍后再试'
      };
    }

    return { allowed: true, retryAfter: 0 };
  } catch (storeErr) {
    console.warn('[RateLimit] RateLimitStore check error, safe fail-open fallback:', storeErr);
    // 当持久化存储网络瞬断时，安全放行单次请求，避免因存储故障导致全站正常问答彻底瘫痪
    return { allowed: true, retryAfter: 0 };
  }
}

function sanitizeErrorMessage(err: any): string {
  if (err?.name === 'AbortError' || err?.message === 'REQUEST_TIMEOUT') {
    return '请求超时，上游模型响应耗时过长，请稍后重试';
  }
  const msg = String(err?.message || '');
  if (/key|token|auth|bearer|secret|password|credential/i.test(msg)) {
    return '服务响应异常，请稍后重试';
  }
  return msg || '服务响应异常，请稍后重试';
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = extractTrustedClientIp(req);
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: '无效的 JSON 请求体' }, { status: 400 });
    }

    let messages: AIMessage[] = [];
    if (Array.isArray(body.messages)) {
      messages = body.messages;
    } else if (typeof body.message === 'string') {
      messages = [{ role: 'user', content: body.message }];
    } else {
      return NextResponse.json({ error: '请提供有效的 message 或 messages 数组' }, { status: 400 });
    }

    // 1. 消息数量校验
    if (messages.length === 0) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }
    if (messages.length > 20) {
      return NextResponse.json({ error: '上下文消息数量超过上限 (最多 20 条)' }, { status: 400 });
    }

    // 2. 校验消息角色、单条输入上限与总上下文上限
    let totalLength = 0;
    for (const msg of messages) {
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        return NextResponse.json({ error: '非法消息角色，不允许通过 system 或 developer 角色覆盖系统指令' }, { status: 400 });
      }
      if (typeof msg.content !== 'string' || msg.content.trim().length === 0) {
        return NextResponse.json({ error: '单条消息内容不能为空' }, { status: 400 });
      }
      if (msg.content.length > 1000) {
        return NextResponse.json({ error: '单条输入内容长度超过上限 (最多 1000 字符)' }, { status: 400 });
      }
      totalLength += msg.content.length;
    }

    if (totalLength > 4000) {
      return NextResponse.json({ error: '总上下文长度超过上限 (最多 4000 字符)' }, { status: 400 });
    }

    // 3. 服务端限流与使用量保护 (基于持久化设施与原子递增)
    const rateCheck = await checkRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: rateCheck.reason, retryAfter: rateCheck.retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfter),
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const wantStream = body.stream !== false; // 默认流式

    // 4. 建立请求取消控制器，并设置 25 秒超时与客户端中断监听
    const abortController = new AbortController();
    const timeoutTimer = setTimeout(() => {
      abortController.abort(new Error('REQUEST_TIMEOUT'));
    }, 25000);

    req.signal.addEventListener('abort', () => {
      clearTimeout(timeoutTimer);
      abortController.abort();
    });

    if (wantStream) {
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of defaultAIOrchestrator.streamAnswer(messages, clientIp, abortController.signal)) {
              if (abortController.signal.aborted) break;
              const data = `data: ${JSON.stringify(chunk)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
            if (!abortController.signal.aborted) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
          } catch (err: any) {
            if (!abortController.signal.aborted) {
              const safeErr = sanitizeErrorMessage(err);
              const errData = `data: ${JSON.stringify({ type: 'error', error: safeErr })}\n\n`;
              controller.enqueue(encoder.encode(errData));
            }
          } finally {
            clearTimeout(timeoutTimer);
            try {
              controller.close();
            } catch (_) {}
          }
        },
        cancel() {
          clearTimeout(timeoutTimer);
          abortController.abort();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // 非流式回退
    try {
      const result = await defaultAIOrchestrator.answer(messages, clientIp, abortController.signal);
      return NextResponse.json(result);
    } finally {
      clearTimeout(timeoutTimer);
    }
  } catch (err: any) {
    const safeMsg = sanitizeErrorMessage(err);
    return NextResponse.json({ error: safeMsg }, { status: 500 });
  }
}
