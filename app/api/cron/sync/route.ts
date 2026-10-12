import { NextRequest, NextResponse } from 'next/server';
import { defaultF1Service } from '@/providers/f1/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Fail closed: missing credentials must never expose a public cache-writing endpoint.
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  if (!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) ||
      !(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN) || process.env.STORAGE_PROVIDER === 'memory') {
    return NextResponse.json({error: 'Persistent storage is required'}, {status: 503});
  }
  const season = req.nextUrl.searchParams.get('season') || String(new Date().getUTCFullYear());
  if (!/^\d{4}$/.test(season)) return NextResponse.json({error: 'Invalid season'}, {status: 400});
  try {
    const operations = [
      ['calendar', () => defaultF1Service.getCalendarResult(season, true)],
      ['drivers', () => defaultF1Service.getDriverStandingsResult(season, true)],
      ['constructors', () => defaultF1Service.getConstructorStandingsResult(season, true)],
      ['lastResult', () => defaultF1Service.getLastRaceResultResult(season, true)]
    ] as const;
    const completed = await Promise.allSettled(operations.map(([, run]) => run()));
    const summary = Object.fromEntries(completed.map((result, i) => [operations[i][0],
      result.status === 'fulfilled' ? {success: result.value.source === 'live', source: result.value.source, updatedAt: result.value.fetchedAt}
        : {success: false, reason: 'Sync failed'}]));
    const success = Object.values(summary).every(result => result.success);
    return NextResponse.json({success, season, feishuNotificationSuppressed: true, summary}, {status: success ? 200 : 503});
  } catch {
    return NextResponse.json({success: false, error: 'Sync failed'}, {status: 503});
  }
}
export async function POST(req: NextRequest) { return GET(req); }
