// tests/circuit-integrity.test.mjs
// 赛道资产与几何完整性自动化质量门禁测试套件
// 验证 100% 覆盖率、真实本地 SVG 存在性、viewBox、安全清洗、几何 SHA-256 无碰撞

import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CircuitRegistry } from '../lib/circuits/registry.ts';
import { normalizeCircuitId } from '../lib/circuits/mapping.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const circuitsDir = path.join(rootDir, 'public', 'circuits');

// 2026 赛季赛历中涉及的全部官方 circuitId
const OFFICIAL_2026_CIRCUIT_IDS = [
  'albert_park',
  'shanghai',
  'suzuka',
  'miami',
  'villeneuve',
  'monaco',
  'catalunya',
  'red_bull_ring',
  'silverstone',
  'spa',
  'hungaroring',
  'zandvoort',
  'monza',
  'madring',
  'baku',
  'sepang',
  'marina_bay',
  'americas',
  'rodriguez',
  'interlagos',
  'vegas',
  'losail',
  'yas_marina'
];

test('Circuit Integrity & Vector Asset Quality Gate', async (t) => {
  const seenHashes = new Map();

  await t.test('1. 赛道注册表 100% 覆盖率校验 (Coverage = 100%)', () => {
    for (const cId of OFFICIAL_2026_CIRCUIT_IDS) {
      assert.ok(CircuitRegistry.hasCircuit(cId), `CircuitRegistry 必须注册 circuitId: "${cId}"`);
      const meta = CircuitRegistry.getCircuit(cId);
      assert.ok(meta !== null, `元数据必须非空: "${cId}"`);
      assert.strictEqual(meta.season, '2026');
      assert.ok(meta.nameZh.length > 0);
      assert.ok(meta.nameEn.length > 0);
      assert.ok(meta.lengthKm > 2.0 && meta.lengthKm < 8.0, `长度应在合理区间: ${meta.lengthKm}`);
      assert.ok(meta.turns >= 8 && meta.turns <= 25, `弯角数应在合理区间: ${meta.turns}`);
    }
  });

  await t.test('2. 别名归一化映射 (Mapping) 健全性', () => {
    const aliasCases = [
      { input: 'albert-park', expected: 'albert_park' },
      { input: 'melbourne', expected: 'albert_park' },
      { input: 'cota', expected: 'americas' },
      { input: 'singapore', expected: 'marina_bay' },
      { input: 'las-vegas', expected: 'vegas' }
    ];

    for (const c of aliasCases) {
      const resolved = normalizeCircuitId(c.input);
      assert.strictEqual(resolved, c.expected, `别名 ${c.input} 必须正确映射到 ${c.expected}`);
    }
  });

  await t.test('3. 真实本地 SVG 存在性与安全标签审查 (Security & Sanitization)', () => {
    for (const cId of OFFICIAL_2026_CIRCUIT_IDS) {
      const svgPath = path.join(circuitsDir, `${cId}.svg`);
      assert.ok(fs.existsSync(svgPath), `SVG 文件必须本地存在: "${svgPath}"`);

      const content = fs.readFileSync(svgPath, 'utf8');
      assert.ok(content.length > 100, `SVG 内容长度过短: "${cId}"`);

      // 安全标签检查：严禁出现可执行或外部引入代码
      assert.ok(!/<script/i.test(content), `SVG 不得包含 <script>: "${cId}"`);
      assert.ok(!/foreignObject/i.test(content), `SVG 不得包含 foreignObject: "${cId}"`);
      assert.ok(!/onload=/i.test(content), `SVG 不得包含 onload: "${cId}"`);
      assert.ok(!/onclick=/i.test(content), `SVG 不得包含 onclick: "${cId}"`);
      assert.ok(!/javascript:/i.test(content), `SVG 不得包含 javascript:: "${cId}"`);

      // 规范 viewBox
      const viewBoxMatch = content.match(/viewBox=["']([^"']+)["']/);
      assert.ok(viewBoxMatch !== null, `SVG 必须包含合法的 viewBox: "${cId}"`);
      const parts = viewBoxMatch[1].trim().split(/\s+/).map(Number);
      assert.strictEqual(parts.length, 4, `viewBox 必须包含 4 个维度数值: "${cId}"`);
      assert.ok(parts[2] > 0 && parts[3] > 0, `viewBox 宽和高必须大于 0: "${cId}"`);

      // 提取主几何 path 计算几何 SHA-256
      const pathMatch = content.match(/class="track-main"\s+d=["']([^"']+)["']/);
      assert.ok(pathMatch !== null, `必须包含 class="track-main" 路径: "${cId}"`);
      const geometry = pathMatch[1].trim();

      const hash = crypto.createHash('sha256').update(geometry).digest('hex');
      if (seenHashes.has(hash)) {
        assert.fail(`碰撞缺陷: 赛道 "${cId}" 与 "${seenHashes.get(hash)}" 的几何哈希完全相同，严禁复用相同几何！`);
      }
      seenHashes.set(hash, cId);
    }

    assert.strictEqual(seenHashes.size, OFFICIAL_2026_CIRCUIT_IDS.length, '所有赛道必须具备各自独立的唯一 SHA-256 几何指纹');
  });
});
