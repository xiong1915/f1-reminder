import { NextRequest, NextResponse } from 'next/server';
import { openF1, getReplayManifest, getReplayWindow } from '@/lib/f1/replay/openf1';
import { fetchJolpicaCalendar } from '@/providers/f1/jolpica';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  try {
    const key = Number(q.get('key'));
    if (!q.has('key')) {
      const year = Number(q.get('season') || new Date().getUTCFullYear());
      if (!Number.isInteger(year) || year < 2023 || year > new Date().getUTCFullYear()) return NextResponse.json({ error: '真实遥测支持 2023 年起已结束的场次' }, { status: 400 });
      const sessions = await openF1('sessions', { year, session_name: 'Race' }, request.signal);
      const calendar = await fetchJolpicaCalendar(String(year));
      const completed = sessions.filter(s => Date.parse(s.date_end) < Date.now()).map(s => {
        const race = calendar.find(r => Math.abs(Date.parse(r.raceStartUTC) - Date.parse(s.date_start)) < 12 * 3600000);
        return race ? { ...s, round: race.round, nameZh: race.nameZh || s.circuit_short_name } : null;
      }).filter(Boolean).sort((a, b) => Date.parse(b!.date_start) - Date.parse(a!.date_start));
      return NextResponse.json({ sessions: completed }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
    }
    if (!Number.isInteger(key) || key < 1) return NextResponse.json({ error: 'Invalid session key' }, { status: 400 });
    const manifest = await getReplayManifest(key, request.signal);
    if (!q.has('offset')) return NextResponse.json(manifest);
    const offset = Number(q.get('offset'));
    if (!Number.isInteger(offset) || offset < 0 || offset % 60 !== 0 || offset >= manifest.metadata.durationSeconds) return NextResponse.json({ error: 'Invalid replay window' }, { status: 400 });
    const frames = await getReplayWindow(manifest, offset, request.signal);
    return NextResponse.json({ frames, offset }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '回放数据源暂不可用' }, { status: 502 });
  }
}
