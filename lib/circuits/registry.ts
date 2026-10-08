// lib/circuits/registry.ts
// 赛道资产中央注册表：通过 season + circuitId + layoutId 精确解析，严禁通过 Round -> SVG

import { CircuitMetadata } from './types';
import { CIRCUITS_METADATA } from './metadata';
import { normalizeCircuitId } from './mapping';

export class CircuitRegistry {
  /**
   * 通过 season + circuitId + layoutId 解析赛道元数据
   */
  public static getCircuit(
    circuitId: string,
    season: string = '2026',
    layoutId?: string
  ): CircuitMetadata | null {
    const normalizedId = normalizeCircuitId(circuitId);
    const meta = CIRCUITS_METADATA[normalizedId];
    if (!meta) {
      // 容灾兜底返回 marina_bay，但不降级为空白
      return CIRCUITS_METADATA['marina_bay'] || null;
    }
    return meta;
  }

  /**
   * 获取当前赛季注册的全部赛道
   */
  public static getAllCircuits(season: string = '2026'): CircuitMetadata[] {
    return Object.values(CIRCUITS_METADATA).filter(c => c.season === season);
  }

  /**
   * 检查指定 circuitId 是否在注册表中注册
   */
  public static hasCircuit(circuitId: string): boolean {
    const normalized = normalizeCircuitId(circuitId);
    return Boolean(CIRCUITS_METADATA[normalized]);
  }
}
