// app/api/f1/standings/route.ts
import { NextResponse } from 'next/server';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [drivers, constructors] = await Promise.all([
      defaultF1Service.getDriverStandings('2026'),
      defaultF1Service.getConstructorStandings('2026')
    ]);
    return NextResponse.json({
      season: '2026',
      driverStandings: drivers,
      constructorStandings: constructors
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=7200'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
