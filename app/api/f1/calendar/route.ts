// app/api/f1/calendar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const season = req.nextUrl.searchParams.get('season') || String(new Date().getUTCFullYear());
  if (!/^\d{4}$/.test(season) || Number(season) < 1950 || Number(season) > new Date().getUTCFullYear() + 1) return NextResponse.json({ error: 'Invalid season' }, { status: 400 });
  try {
    const result = await defaultF1Service.getCalendarResult(season);
    if (result.source === 'unavailable') return NextResponse.json({ error: '赛历数据源暂不可用', season }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    const calendar = result.data;
    return NextResponse.json({
      season,
      totalRounds: calendar.length,
      races: calendar,
      dataSource: result.source, updatedAt: result.fetchedAt, isStale: result.isStale
    }, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Unable to load F1 data' }, { status: 500 });
  }
}
