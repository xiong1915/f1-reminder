// app/api/f1/seasons/route.ts
import { NextResponse } from 'next/server';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const seasons = await defaultF1Service.getSeasons();
    return NextResponse.json({ seasons }, {
      headers: {
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Unable to load seasons' }, { status: 500 });
  }
}
