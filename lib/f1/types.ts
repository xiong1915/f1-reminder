// lib/f1/types.ts
// Canonical F1 TypeScript Domain Models

export type SessionType = 
  | 'practice'
  | 'sprint_qualifying'
  | 'sprint'
  | 'qualifying'
  | 'race';

export interface F1Session {
  id: string;
  name: string;
  nameEn: string;
  type: SessionType;
  startTimeUTC: string;
  endTimeUTC?: string;
  durationMinutes: number;
}

export interface CircuitSpecs {
  lengthKm: string;
  laps: number;
  lapRecord?: string;
  turns?: string;
}

export interface F1Meeting {
  meetingId?: string;
  round: number;
  season: string;
  name: string;
  nameZh: string;
  country: string;
  locality: string;
  circuitId: string;
  circuitName: string;
  raceStartUTC: string;
  isSprintWeekend: boolean;
  sessions: F1Session[];
  specs?: CircuitSpecs;
}

export interface DriverStanding {
  rank: number;
  driverId: string;
  code: string;
  number: string;
  name: string;
  nameEn: string;
  fullZh: string;
  team: string;
  teamId: string;
  points: number;
  wins: number;
  gap: number;
}

export interface ConstructorStanding {
  rank: number;
  teamId: string;
  name: string;
  nameEn: string;
  points: number;
  wins: number;
  gap: number;
}

export interface RaceWinner {
  code: string;
  name: string;
  team: string;
  time?: string;
}

export interface PodiumItem {
  position: number;
  code: string;
  name: string;
  team: string;
}

export interface RaceResultSummary {
  round: number;
  season: string;
  name: string;
  locality: string;
  date: string;
  winner: RaceWinner;
  podium: PodiumItem[];
  pole?: { code: string; name: string };
  fastestLap?: { code: string; name: string; lapTime: string };
}

export interface NextSessionState {
  session: F1Session | null;
  status: 'NEXT' | 'IN_PROGRESS' | 'UPCOMING' | 'FINISHED';
  targetUtcMs: number | null;
  targetIso: string | null;
}

export interface F1Overview {
  season: string;
  currentMeeting: F1Meeting;
  nextSession: NextSessionState;
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  previousRace?: RaceResultSummary;
  updatedAt: string;
  dataSource: 'live' | 'cache' | 'lkg' | 'unavailable';
  isStale?: boolean;
  staleReason?: string;
  totalRounds?: number;
}
