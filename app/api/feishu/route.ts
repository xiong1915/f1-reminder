// app/api/feishu/route.ts
// 飞书开放平台 Webhook 事件接收入口 (兼容 GET 校验与 POST 事件分发)

import { NextRequest, NextResponse } from 'next/server';
import { handleFeishuPayload } from '@/lib/feishu/handler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const result = await handleFeishuPayload(payload);
    return NextResponse.json(result.body, { status: result.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'TIKE Feishu Bot Gateway v3.0'
  });
}
