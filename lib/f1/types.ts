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
  officialVerifiedAt?: string;
  officialSourceUrl?: string;
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
  officialVerifiedAt?: string;
  officialSourceUrl?: string;
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
  officialRound?: number;
  snapshotSession?: 'sprint' | 'race'; // 明确的场次元数据证据
}

export interface ConstructorStanding {
  rank: number;
  teamId: string;
  name: string;
  nameEn: string;
  points: number;
  wins: number;
  gap: number;
  officialRound?: number;
  snapshotSession?: 'sprint' | 'race';
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
  nameZh?: string;
  locality: string;
  date: string;
  winner: RaceWinner;
  podium: PodiumItem[];
  pole?: { code: string; name: string; team?: string };
  qualifyingP1?: { code: string; name: string; team?: string; time?: string };
  startingGridP1?: { code: string; name: string; team?: string };
  fastestLap?: { code: string; name: string; lapTime: string; lap?: number | string; team?: string };
  officialUrl?: string;
  sourceUrls?: {
    raceResult?: string;
    qualifying?: string;
    startingGrid?: string;
    fastestLaps?: string;
  };
}

export interface DetailedRaceResultItem {
  position: number;
  driverId: string;
  driverName: string;
  driverCode: string;
  driverNumber?: string;
  constructorName: string;
  constructorId: string;
  grid: number;
  laps: number;
  status: string;
  points: number;
  time?: string;
  fastestLap?: {
    rank?: string;
    lap: number;
    time: string;
  };
}

export interface DetailedQualifyingResultItem {
  position: number;
  driverId: string;
  driverName: string;
  driverCode?: string;
  driverNumber?: string;
  constructorName: string;
  constructorId: string;
  q1?: string;
  q2?: string;
  q3?: string;
}

export interface DetailedSprintResultItem {
  position: number;
  driverId: string;
  driverName: string;
  driverCode?: string;
  driverNumber?: string;
  constructorName: string;
  constructorId: string;
  grid: number;
  laps: number;
  status: string;
  points: number;
  time?: string;
}

export interface NextSessionState {
  session: F1Session | null;
  status: 'NEXT' | 'IN_PROGRESS' | 'UPCOMING' | 'FINISHED';
  targetUtcMs: number | null;
  targetIso: string | null;
}

export interface StandingsScopeDetail {
  driverStandingsRound?: number;
  constructorStandingsRound?: number;
  lastRaceResultRound?: number;
  driverSnapshotSession?: 'sprint' | 'race';
  isSynchronized: boolean; // 车手积分、车队积分与赛果轮次及场次是否保持同步
  hasLatestRaceResult: boolean | 'unknown'; // 数据是否包含最新已完赛正赛结果
  standingsLagging: boolean; // 积分榜是否落后于最新已完赛正赛
  sessionEvidenceAvailable: boolean; // 冲刺周末是否有明确场次元数据或积分核对证据
}

export interface DataSyncStatus {
  lastSuccessfulSyncAt?: string; // 无真实同步时间时为 undefined，绝不补造历史
  lastAttemptAt?: string;
  source: 'live' | 'cache' | 'lkg' | 'unavailable';
  // 独立三维状态解耦：
  upstreamSyncSuccess?: boolean; // 上游最近同步是否成功（缓存未请求且无历史记录时为 undefined/未知）
  upstreamError?: string;
  isCacheHit: boolean;          // 当前是否使用缓存
  hasLatestRaceResult: boolean | 'unknown'; // 数据是否包含最新目标赛事赛果
  scopeDetail?: StandingsScopeDetail;
  isStale: boolean;
  staleReason?: string;
}

export interface F1Overview {
  season: string;
  currentMeeting: F1Meeting;
  nextSession: NextSessionState;
  driverStandings: DriverStanding[];
  constructorStandings: ConstructorStanding[];
  previousRace?: RaceResultSummary;
  updatedAt?: string; // 无真实历史记录时为 undefined，绝不补造历史
  respondedAt: string;
  dataSource: 'live' | 'cache' | 'lkg' | 'unavailable';
  upstreamSyncSuccess?: boolean;
  isCacheHit?: boolean;
  hasLatestRaceResult?: boolean | 'unknown';
  scopeDetail?: StandingsScopeDetail;
  isStale?: boolean;
  staleReason?: string;
  totalRounds?: number;
  canSimulateRace?: boolean;
  canSimulateSprint?: boolean;
  standingsCutoffDesc?: string;
  standingsCutoffVerified?: boolean;
  isSprintPending?: boolean;
  syncStatus?: DataSyncStatus;
}
