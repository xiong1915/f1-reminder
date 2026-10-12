// app/api/f1/standings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const season = req.nextUrl.searchParams.get('season') || String(new Date().getUTCFullYear());
  if (!/^\d{4}$/.test(season) || Number(season) < 1950 || Number(season) > new Date().getUTCFullYear() + 1) return NextResponse.json({ error: 'Invalid season' }, { status: 400 });
  try {
    const [drivers, constructors] = await Promise.all([
      defaultF1Service.getDriverStandingsResult(season),
      defaultF1Service.getConstructorStandingsResult(season)
    ]);
    return NextResponse.json({
      season,
      driverStandings: drivers.data,
      constructorStandings: constructors.data,
      dataSource: { drivers: drivers.source, constructors: constructors.source },
      isStale: drivers.isStale || constructors.isStale,
      error: drivers.source === 'unavailable' || constructors.source === 'unavailable' ? '积分数据源暂不可用' : undefined
    }, {
      status: drivers.source === 'unavailable' || constructors.source === 'unavailable' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Unable to load F1 data' }, { status: 500 });
  }
}
