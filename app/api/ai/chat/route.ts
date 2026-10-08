// app/api/ai/chat/route.ts
// TIKE AI 流式交互与标准响应接口 (集成客户端断开中止防护，杜绝无谓 token 计费)

import { NextRequest, NextResponse } from 'next/server';
import { defaultAIOrchestrator } from '@/lib/ai/orchestrator';
import { AIMessage } from '@/lib/ai/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anon';
    const body = await req.json();

    let messages: AIMessage[] = [];
    if (Array.isArray(body.messages)) {
      messages = body.messages;
    } else if (typeof body.message === 'string') {
      messages = [{ role: 'user', content: body.message }];
    } else {
      return NextResponse.json({ error: '请提供有效的 message 或 messages 数组' }, { status: 400 });
    }

    const wantStream = body.stream !== false; // 默认支持流式

    // 建立请求取消控制器，当客户端关闭连接或切换路由时立即终止大模型上游请求
    const abortController = new AbortController();
    req.signal.addEventListener('abort', () => {
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
              const errData = `data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`;
              controller.enqueue(encoder.encode(errData));
            }
          } finally {
            try {
              controller.close();
            } catch (_) {}
          }
        },
        cancel() {
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
    const result = await defaultAIOrchestrator.answer(messages, clientIp, abortController.signal);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
