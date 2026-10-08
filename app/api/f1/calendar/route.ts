// app/api/f1/calendar/route.ts
import { NextResponse } from 'next/server';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const calendar = await defaultF1Service.getCalendar('2026');
    return NextResponse.json({
      season: '2026',
      totalRounds: calendar.length,
      races: calendar
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
