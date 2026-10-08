// lib/circuits/types.ts
// 权威赛道元数据与矢量几何数据类型定义

export interface CircuitLapRecord {
  time: string;
  driver: string;
  year: number;
}

export interface CircuitMetadata {
  circuitId: string;
  layoutId: string;
  season: string;
  nameEn: string;
  nameZh: string;
  country: string;
  city: string;
  lengthKm: number;
  turns: number;
  drsZones: number;
  lapRecord?: CircuitLapRecord;
  svgFile: string;
  viewBox: string;
  startFinish: { x: number; y: number };
  direction: 'clockwise' | 'anti-clockwise';
  type: 'permanent' | 'street' | 'hybrid';
}

export interface CircuitAssetRecord {
  circuitId: string;
  layoutId: string;
  path: string;
  viewBox: string;
  startFinish: { x: number; y: number };
  sha256?: string;
}
