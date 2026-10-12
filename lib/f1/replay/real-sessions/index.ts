// lib/f1/replay/real-sessions/index.ts
// 权威真实历史遥测比赛回放数据集与非均匀时间戳插值引擎

import type { ReplayDataset, ReplaySessionMetadata, ReplayFrame, TelemetryVehicleState } from '../types';
import { DEFAULT_SINGAPORE_REPLAY } from '../sample-sessions';

// 导入提取自真实 GeoJSON 的参考线点列
import { BAHRAIN_TRACK_PATH, SILVERSTONE_TRACK_PATH } from './track-paths';
import bahrainFramesRaw from './bahrain-2023.json';
import silverstoneFramesRaw from './silverstone-2023.json';

export const BAHRAIN_DEMO_METADATA: ReplaySessionMetadata = {
  id: 'demo-bahrain',
  title: '【DEMO 算法仿真】2023 赛季巴林大奖赛 演示',
  season: '2023',
  round: 1,
  meetingName: '巴林大奖赛 (演示)',
  locality: '萨基尔',
  circuitId: 'bahrain',
  circuitName: '巴林国际赛车场 (Bahrain International Circuit)',
  durationSeconds: 180,
  fps: 5,
  totalFrames: 900,
  trackPath: BAHRAIN_TRACK_PATH,
  corners: [
    { number: 1, name: 'T1 Heavy Braking', x: 0.18, y: 0.88 },
    { number: 4, name: 'T4 Downhill', x: 0.35, y: 0.32 },
    { number: 8, name: 'T8 Hairpin', x: 0.58, y: 0.65 },
    { number: 10, name: 'T10 Off-Camber', x: 0.38, y: 0.72 },
    { number: 14, name: 'T14 Final Turn', x: 0.78, y: 0.90 }
  ],
  drsZones: [
    { id: 'drs_1', startIndex: 0, endIndex: 15, name: '发车大直道 DRS 1' },
    { id: 'drs_2', startIndex: 35, endIndex: 50, name: '回传直道 DRS 2' }
  ],
  sourceProvider: 'curated_demo'
};

export const SILVERSTONE_DEMO_METADATA: ReplaySessionMetadata = {
  id: 'demo-silverstone',
  title: '【DEMO 算法仿真】2023 赛季英国大奖赛 (银石) 演示',
  season: '2023',
  round: 10,
  meetingName: '英国大奖赛 (演示)',
  locality: '银石',
  circuitId: 'silverstone',
  circuitName: '银石赛道 (Silverstone Circuit)',
  durationSeconds: 180,
  fps: 5,
  totalFrames: 900,
  trackPath: SILVERSTONE_TRACK_PATH,
  corners: [
    { number: 1, name: 'Abbey', x: 0.68, y: 0.82 },
    { number: 3, name: 'Village', x: 0.52, y: 0.74 },
    { number: 6, name: 'Brooklands', x: 0.28, y: 0.68 },
    { number: 9, name: 'Copse', x: 0.75, y: 0.45 },
    { number: 11, name: 'Maggotts', x: 0.70, y: 0.32 },
    { number: 12, name: 'Becketts', x: 0.62, y: 0.28 },
    { number: 15, name: 'Stowe', x: 0.32, y: 0.25 },
    { number: 16, name: 'Vale', x: 0.42, y: 0.55 }
  ],
  drsZones: [
    { id: 'drs_1', startIndex: 15, endIndex: 35, name: '威灵顿直道 DRS 1' },
    { id: 'drs_2', startIndex: 80, endIndex: 105, name: '机库直道 DRS 2' }
  ],
  sourceProvider: 'curated_demo'
};

export const BAHRAIN_2023_METADATA = BAHRAIN_DEMO_METADATA;
export const SILVERSTONE_2023_METADATA = SILVERSTONE_DEMO_METADATA;

// DEMO 算法仿真模式数据集：严格标记为 curated_demo，绝不冒充真实历史遥测
export const DEMO_REPLAY_SESSIONS: Record<string, ReplayDataset> = {
  'demo-singapore': {
    metadata: {
      ...DEFAULT_SINGAPORE_REPLAY.metadata,
      id: 'demo-singapore',
      sourceProvider: 'curated_demo'
    },
    frames: DEFAULT_SINGAPORE_REPLAY.frames
  },
  'demo-bahrain': {
    metadata: BAHRAIN_DEMO_METADATA,
    frames: bahrainFramesRaw as ReplayFrame[]
  },
  'demo-silverstone': {
    metadata: SILVERSTONE_DEMO_METADATA,
    frames: silverstoneFramesRaw as ReplayFrame[]
  }
};

// 官方真实历史遥测回放数据集：由正弦公式生成的巴林、银石已全部降级为独立 DEMO，移出真实列表
export const REAL_REPLAY_SESSIONS: Record<string, ReplayDataset> = {};

// 全部回放集合
export const ALL_REPLAY_SESSIONS: Record<string, ReplayDataset> = {
  ...DEMO_REPLAY_SESSIONS,
  ...REAL_REPLAY_SESSIONS
};

/**
 * 真实非均匀时间戳插值器
 * 核心质量门禁：超过 maxGapMs (3000ms = 3s) 缺口坚决不跨缺口插值！
 */
export function interpolateVehiclesAtTimestamp(
  frames: ReplayFrame[],
  targetMs: number,
  maxGapMs = 3000
): TelemetryVehicleState[] {
  if (!frames || frames.length === 0) return [];
  if (targetMs <= frames[0].timestampMs) return frames[0].vehicles;
  if (targetMs >= frames[frames.length - 1].timestampMs) return frames[frames.length - 1].vehicles;

  // 1. 二分查找目标时间的前后临近帧
  let low = 0;
  let high = frames.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (frames[mid].timestampMs === targetMs) {
      return frames[mid].vehicles;
    }
    if (frames[mid].timestampMs < targetMs) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const prevIdx = Math.max(0, high);
  const nextIdx = Math.min(frames.length - 1, low);

  const prevFrame = frames[prevIdx];
  const nextFrame = frames[nextIdx];

  const gap = nextFrame.timestampMs - prevFrame.timestampMs;

  // 超过 3 秒缺口不跨缺口插值，直接返回前一帧状态
  if (gap > maxGapMs || gap <= 0) {
    return prevFrame.vehicles.map(v => ({ ...v, stale: true, telemetryStale: true }));
  }

  const alpha = (targetMs - prevFrame.timestampMs) / gap;

  // 2. 对两帧中匹配的车手逐一进行平滑插值
  const nextMap = new Map<number, TelemetryVehicleState>();
  nextFrame.vehicles.forEach(v => nextMap.set(v.driverNumber, v));

  const interpolatedVehicles: TelemetryVehicleState[] = prevFrame.vehicles.map(v0 => {
    const v1 = nextMap.get(v0.driverNumber);
    if (!v1) {
      // 下一帧没有该车手（出现掉线/进站），不跨越插值
      return { ...v0, stale: true, telemetryStale: true };
    }
    if (v0.stale || v1.stale) return { ...v0, stale: true, telemetryStale: true };

    return {
      ...v0,
      normX: v0.normX + (v1.normX - v0.normX) * alpha,
      normY: v0.normY + (v1.normY - v0.normY) * alpha,
      speed: Math.round(v0.speed + (v1.speed - v0.speed) * alpha),
      gear: alpha > 0.5 ? v1.gear : v0.gear,
      rpm: v0.rpm && v1.rpm ? Math.round(v0.rpm + (v1.rpm - v0.rpm) * alpha) : v0.rpm,
      drs: alpha > 0.5 ? v1.drs : v0.drs,
      position: alpha > 0.5 ? v1.position : v0.position,
      gapToLeader: v0.gapToLeader !== undefined && v1.gapToLeader !== undefined
        ? Math.round((v0.gapToLeader + (v1.gapToLeader - v0.gapToLeader) * alpha) * 10) / 10
        : v0.gapToLeader,
      gapToAhead: v0.gapToAhead !== undefined && v1.gapToAhead !== undefined
        ? Math.round((v0.gapToAhead + (v1.gapToAhead - v0.gapToAhead) * alpha) * 10) / 10
        : v0.gapToAhead
    };
  });

  return interpolatedVehicles;
}
