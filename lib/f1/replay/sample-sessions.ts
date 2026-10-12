// lib/f1/replay/sample-sessions.ts
// APEX REPLAY 高保真示范数据集：2026 新加坡大奖赛 滨海湾市街赛道 攻防回放
// 零服务器维护成本：纯静态预加载高帧率遥测阵列，客户端瞬时渲染

import type { ReplayDataset, ReplaySessionMetadata, ReplayFrame, TelemetryVehicleState } from './types';

// 新加坡滨海湾市街赛道 19 个弯角坐标点列（归一化至 0.05 ~ 0.95 视口，适合 Canvas 4:3 / 16:9 居中显示）
export const MARINA_BAY_TRACK_PATH: [number, number][] = [
  // 起终点大直道 (Main Straight)
  [0.65, 0.88], [0.58, 0.88], [0.50, 0.88], [0.42, 0.88], [0.35, 0.88],
  // T1 - T3 (Sheares Chicane 减速弯)
  [0.30, 0.85], [0.26, 0.81], [0.23, 0.74], [0.25, 0.68], [0.29, 0.64],
  // T4 - T5 (Republic Boulevard)
  [0.35, 0.61], [0.42, 0.58], [0.48, 0.55],
  // T6 - T7 (Raffles Boulevard 高速 DRS 2 直道)
  [0.55, 0.51], [0.62, 0.47], [0.69, 0.43], [0.76, 0.39], [0.82, 0.35],
  // T7 90度左急减速弯 (Turn 7 Heavy Braking)
  [0.85, 0.31], [0.83, 0.25], [0.78, 0.22],
  // T8 - T9 (Padang Complex)
  [0.70, 0.22], [0.62, 0.22], [0.55, 0.22], [0.48, 0.23], [0.43, 0.25],
  // T10 - T12 (Singapore Sling & St Andrew's)
  [0.38, 0.28], [0.33, 0.33], [0.28, 0.38], [0.24, 0.43],
  // T13 (Anderson Bridge 安德森桥发卡弯)
  [0.21, 0.49], [0.18, 0.55], [0.17, 0.61], [0.19, 0.66],
  // T14 (Esplanade Drive 大直道进入重刹区)
  [0.25, 0.68], [0.33, 0.69], [0.42, 0.70], [0.50, 0.71],
  // T15 - T17 (滨海湾看台与浮动看台下穿通道)
  [0.58, 0.71], [0.65, 0.71], [0.72, 0.71], [0.78, 0.73], [0.82, 0.77],
  // T18 - T19 (最后双左弯回到发车直道)
  [0.81, 0.82], [0.76, 0.86], [0.71, 0.88], [0.65, 0.88]
];

export const MARINA_BAY_CORNERS = [
  { number: 1, name: 'Sheares', x: 0.26, y: 0.81 },
  { number: 3, name: 'Turn 3', x: 0.29, y: 0.64 },
  { number: 7, name: 'Memorial', x: 0.85, y: 0.31 },
  { number: 9, name: 'Padang', x: 0.48, y: 0.23 },
  { number: 13, name: 'Anderson Bridge', x: 0.17, y: 0.61 },
  { number: 14, name: 'Connaught', x: 0.42, y: 0.70 },
  { number: 16, name: 'Bay Grandstand', x: 0.78, y: 0.73 },
  { number: 19, name: 'Final Turn', x: 0.76, y: 0.86 }
];

export const MARINA_BAY_DRS_ZONES = [
  { id: 'drs_1', startIndex: 0, endIndex: 4, name: '起终点直道 DRS 1' },
  { id: 'drs_2', startIndex: 13, endIndex: 17, name: '莱佛士大道 DRS 2' },
  { id: 'drs_3', startIndex: 32, endIndex: 36, name: '滨海大道直道 DRS 3' }
];

interface DriverSeed {
  driverNumber: number;
  code: string;
  name: string;
  team: string;
  teamColor: string;
  initialOffset: number; // 0..1 赛道周长起点偏移
  baseSpeedModifier: number;
}

const DRIVER_SEEDS: DriverSeed[] = [
  { driverNumber: 1, code: 'VER', name: '马克斯·维斯塔潘', team: '红牛车队', teamColor: '#3671C6', initialOffset: 0.08, baseSpeedModifier: 1.02 },
  { driverNumber: 4, code: 'NOR', name: '兰多·诺里斯', team: '迈凯伦车队', teamColor: '#FF8000', initialOffset: 0.072, baseSpeedModifier: 1.015 },
  { driverNumber: 16, code: 'LEC', name: '夏尔·勒克莱尔', team: '法拉利车队', teamColor: '#E80020', initialOffset: 0.065, baseSpeedModifier: 1.012 },
  { driverNumber: 12, code: 'ANT', name: '基米·安东内利', team: '梅赛德斯车队', teamColor: '#27F4D2', initialOffset: 0.058, baseSpeedModifier: 1.01 },
  { driverNumber: 63, code: 'RUS', name: '乔治·拉塞尔', team: '梅赛德斯车队', teamColor: '#27F4D2', initialOffset: 0.051, baseSpeedModifier: 1.008 },
  { driverNumber: 44, code: 'HAM', name: '刘易斯·汉密尔顿', team: '法拉利车队', teamColor: '#E80020', initialOffset: 0.043, baseSpeedModifier: 1.006 },
  { driverNumber: 81, code: 'PIA', name: '奥斯卡·皮亚斯特里', team: '迈凯伦车队', teamColor: '#FF8000', initialOffset: 0.035, baseSpeedModifier: 1.004 },
  { driverNumber: 14, code: 'ALO', name: '费尔南多·阿隆索', team: '阿斯顿·马丁', teamColor: '#229971', initialOffset: 0.026, baseSpeedModifier: 0.998 },
  { driverNumber: 55, code: 'SAI', name: '卡洛斯·塞恩斯', team: '威廉姆斯车队', teamColor: '#64C4FF', initialOffset: 0.018, baseSpeedModifier: 0.995 },
  { driverNumber: 22, code: 'TSU', name: '角田裕毅', team: '小红牛车队 (RB)', teamColor: '#6692FF', initialOffset: 0.009, baseSpeedModifier: 0.991 }
];

// 沿赛道点列插值计算平滑坐标与弯道曲率速度
function getInterpolatedPoint(path: [number, number][], progress: number): {
  pos: [number, number];
  curvature: number;
  pathIndex: number;
} {
  const normProgress = ((progress % 1) + 1) % 1;
  const count = path.length;
  const floatIdx = normProgress * (count - 1);
  const idx = Math.floor(floatIdx);
  const t = floatIdx - idx;
  const p1 = path[idx];
  const p2 = path[(idx + 1) % count];
  const p3 = path[(idx + 2) % count];

  const x = p1[0] + (p2[0] - p1[0]) * t;
  const y = p1[1] + (p2[1] - p1[1]) * t;

  // 简易三点曲率近似：向量变化越大，曲率越大
  const dx1 = p2[0] - p1[0];
  const dy1 = p2[1] - p1[1];
  const dx2 = p3[0] - p2[0];
  const dy2 = p3[1] - p2[1];
  const cross = Math.abs(dx1 * dy2 - dy1 * dx2);
  const curvature = Math.min(cross * 200, 1.0);

  return { pos: [x, y], curvature, pathIndex: idx };
}

export function buildSingaporeReplayDataset(durationSeconds: number = 60, fps: number = 10): ReplayDataset {
  const totalFrames = durationSeconds * fps;
  const frames: ReplayFrame[] = [];

  const metadata: ReplaySessionMetadata = {
    id: 'replay-demo-2026-r17-singapore',
    title: '2026 新加坡大奖赛 赛道高仿真回放 (DEMO)',
    season: '2026',
    round: 17,
    meetingName: '新加坡大奖赛 (Singapore GP)',
    locality: 'Marina Bay',
    circuitId: 'marina_bay',
    circuitName: '滨海湾市街赛道',
    durationSeconds,
    fps,
    totalFrames,
    trackPath: MARINA_BAY_TRACK_PATH,
    corners: MARINA_BAY_CORNERS,
    drsZones: MARINA_BAY_DRS_ZONES,
    sourceProvider: 'curated_demo'
  };

  for (let f = 0; f < totalFrames; f++) {
    const timeSec = f / fps;
    const timestampMs = Math.round(timeSec * 1000);

    const vehicles: TelemetryVehicleState[] = DRIVER_SEEDS.map((seed, driverIdx) => {
      // 动态前进速度：大直道加速，弯道急刹减速
      const progress = seed.initialOffset + (timeSec * 0.016 * seed.baseSpeedModifier);
      const { pos, curvature, pathIndex } = getInterpolatedPoint(MARINA_BAY_TRACK_PATH, progress);

      // DRS 激活判断：处于 DRS 区域且曲率较低
      const isDrsZone = MARINA_BAY_DRS_ZONES.some(z => pathIndex >= z.startIndex && pathIndex <= z.endIndex);
      const isDrs = isDrsZone && curvature < 0.25;

      // 速度根据曲率在 95 km/h (发卡弯) 到 325 km/h (直道超车) 间平滑过渡
      let speed = Math.round(315 - curvature * 210 + (isDrs ? 15 : 0) + (seed.baseSpeedModifier - 1) * 20);
      speed = Math.max(88, Math.min(328, speed));

      // 挡位估算 (1 ~ 8)
      let gear = 8;
      if (speed < 110) gear = 2;
      else if (speed < 150) gear = 3;
      else if (speed < 195) gear = 4;
      else if (speed < 240) gear = 5;
      else if (speed < 275) gear = 6;
      else if (speed < 300) gear = 7;

      return {
        driverNumber: seed.driverNumber,
        code: seed.code,
        name: seed.name,
        team: seed.team,
        teamColor: seed.teamColor,
        normX: Number(pos[0].toFixed(4)),
        normY: Number(pos[1].toFixed(4)),
        speed,
        gear,
        drs: isDrs,
        lap: Math.floor(progress) + 1,
        position: driverIdx + 1,
        gapToLeader: Number((driverIdx * 0.65 + Math.sin(timeSec + driverIdx) * 0.15).toFixed(2)),
        gapToAhead: driverIdx === 0 ? 0 : Number((0.65 + Math.sin(timeSec + driverIdx * 2) * 0.1).toFixed(2))
      };
    });

    // 根据动态进度实时对 position 重新排序 (模拟超车交换位置)
    vehicles.sort((a, b) => (b.speed + (10 - b.position) * 30) - (a.speed + (10 - a.position) * 30));
    vehicles.forEach((v, idx) => {
      v.position = idx + 1;
    });

    frames.push({
      frameIndex: f,
      timestampMs,
      lap: 1,
      vehicles
    });
  }

  return { metadata, frames };
}

// 全局静态单例示范数据集（零额外网络请求与高可用预载）
export const DEFAULT_SINGAPORE_REPLAY = buildSingaporeReplayDataset(60, 10);
