// app/api/f1/overview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const season = req.nextUrl.searchParams.get('season') || String(new Date().getUTCFullYear());
    if (!/^\d{4}$/.test(season) || Number(season) < 1950 || Number(season) > new Date().getUTCFullYear() + 1) return NextResponse.json({ error: 'Invalid season' }, { status: 400 });
    const overview = await defaultF1Service.getOverview(season);
    return NextResponse.json(overview, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Unable to load F1 data' }, { status: 500 });
  }
}
