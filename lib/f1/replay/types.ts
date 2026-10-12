// lib/f1/replay/types.ts
// APEX REPLAY 比赛动态回放与 APEX LIVE 实时追踪通用领域模型
// 零服务器成本架构：统一遥测载荷、赛道归一化坐标与多源数据驱动标准

export interface TelemetryVehicleState {
  stale?: boolean;
  telemetryStale?: boolean;
  sampleTimestampMs?: number;
  driverNumber: number;
  code: string;
  name: string;
  team: string;
  teamColor: string;
  normX: number; // 0..1 赛道归一化横坐标
  normY: number; // 0..1 赛道归一化纵坐标
  speed: number; // km/h
  gear: number;  // 1-8, 0 for N, -1 for R
  rpm?: number;
  drs: boolean;  // DRS 激活状态
  lap: number;
  position: number;
  gapToLeader?: number; // 距离头车秒数
  gapToAhead?: number;  // 距离前车秒数
}

export interface TrackCorner {
  number: number;
  name?: string;
  x: number; // 0..1 归一化坐标
  y: number; // 0..1 归一化坐标
}

export interface TrackDrsZone {
  id: string;
  startIndex: number;
  endIndex: number;
  name?: string;
}

export interface ReplaySessionMetadata {
  coordinateAspectRatio?: number;
  id: string;
  title: string;
  season: string;
  round: number;
  meetingName: string;
  locality: string;
  circuitId: string;
  circuitName: string;
  durationSeconds: number;
  fps: number;
  totalFrames: number;
  trackPath: [number, number][]; // 赛道闭合回路参考线 (0..1 归一化点列)
  corners: TrackCorner[];
  drsZones: TrackDrsZone[];
  sourceProvider: 'openf1' | 'curated_demo';
}

export interface ReplayFrame {
  frameIndex: number;
  timestampMs: number;
  lap: number;
  vehicles: TelemetryVehicleState[];
}

export interface ReplayDataset {
  metadata: ReplaySessionMetadata;
  frames: ReplayFrame[];
}

/**
 * P4 预留架构：统一遥测数据源驱动接口
 * 供 APEX REPLAY (历史回放) 与 APEX LIVE (实时追踪) 零成本共享组件树
 */
export interface ITelemetryDataSource {
  readonly mode: 'replay' | 'live';
  getMetadata(): ReplaySessionMetadata;
  getCurrentFrame(timestampMs?: number): ReplayFrame;
  seek?(targetMs: number): void;
  play?(): void;
  pause?(): void;
  setSpeed?(multiplier: number): void;
  subscribe(callback: (frame: ReplayFrame) => void): () => void;
}
