// lib/circuits/registry.ts
// 赛道资产中央注册表：通过 season + circuitId + layoutId 精确解析
// 严禁任何私自回退到 marina_bay 的行为，缺失或年代不匹配时返回 null

import { CircuitMetadata } from './types';
import { CIRCUITS_METADATA } from './metadata';
import { normalizeCircuitId } from './mapping';

export class CircuitRegistry {
  /**
   * 通过 season + circuitId + layoutId 解析真实赛道元数据
   * 若未知或该年份无对应构型，严禁回退到新加坡，一律返回 null
   */
  public static getCircuit(
    circuitId: string,
    season?: string | number,
    layoutId?: string
  ): CircuitMetadata | null {
    if (!circuitId) return null;
    const normalizedId = normalizeCircuitId(circuitId);
    const meta = CIRCUITS_METADATA[normalizedId];
    if (!meta) {
      return null;
    }

    // 若指定了 season，进行年代真实性核验
    if (season !== undefined && season !== null) {
      const seasonNum = typeof season === 'number' ? season : parseInt(String(season), 10);
      if (!Number.isNaN(seasonNum)) {
        const from = meta.validFrom ?? 1950;
        const to = meta.validTo ?? 2099;
        if (seasonNum < from || seasonNum > to) {
          // 该年份无此赛道或构型不匹配，返回 null，由 UI 显示真实历史构型暂缺
          return null;
        }
      }
    }

    if (layoutId && meta.layoutId !== layoutId) {
      // 布局不匹配
      return null;
    }

    return meta;
  }

  /**
   * 获取指定赛季有效的赛道列表
   */
  public static getAllCircuits(season?: string | number): CircuitMetadata[] {
    const list = Object.values(CIRCUITS_METADATA);
    if (!season) return list;
    const sNum = typeof season === 'number' ? season : parseInt(String(season), 10);
    if (Number.isNaN(sNum)) return list;
    return list.filter(c => {
      const from = c.validFrom ?? 1950;
      const to = c.validTo ?? 2099;
      return sNum >= from && sNum <= to;
    });
  }

  /**
   * 检查指定 circuitId 在指定赛季是否在注册表中有效
   */
  public static hasCircuit(circuitId: string, season?: string | number): boolean {
    return Boolean(this.getCircuit(circuitId, season));
  }
}
