// Synthetic contract-test input only. Never imported by production modules.
import {after,mock} from 'node:test';
import {defaultF1Service} from '../../providers/f1/service.ts';
import {FIXTURE_2026_DRIVERS,FIXTURE_2026_CONSTRUCTORS,FIXTURE_LAST_RACE} from './2026_season_fixture.ts';
export function installOfflineOverview() {
  const race={id:'race-17',name:'大奖赛正赛',nameEn:'Grand Prix',type:'race',startTimeUTC:'2026-10-11T12:00:00Z',durationMinutes:120};
  const meeting={round:17,season:'2026',name:'Singapore Grand Prix',nameZh:'新加坡大奖赛',country:'新加坡',locality:'Marina Bay',circuitId:'marina_bay',circuitName:'滨海湾',raceStartUTC:race.startTimeUTC,isSprintWeekend:true,sessions:[race]};
  const overview={season:'2026',currentMeeting:meeting,nextSession:{session:race,status:'NEXT',targetUtcMs:Date.parse(race.startTimeUTC),targetIso:race.startTimeUTC},driverStandings:FIXTURE_2026_DRIVERS,constructorStandings:FIXTURE_2026_CONSTRUCTORS,previousRace:FIXTURE_LAST_RACE,respondedAt:'2026-10-07T00:00:00Z',dataSource:'cache',totalRounds:23,canSimulateRace:true,canSimulateSprint:true,standingsCutoffDesc:'截止上一场正赛（离线测试样例）',standingsCutoffVerified:true,isSprintPending:true};
  const handles=[mock.method(defaultF1Service,'getOverview',async()=>structuredClone(overview)),mock.method(defaultF1Service,'getCalendar',async()=>[structuredClone(meeting)])];
  after(()=>handles.forEach(handle=>handle.mock.restore()));
}
