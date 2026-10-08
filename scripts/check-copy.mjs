// scripts/check-copy.mjs
// 静态检查：扫描消费者端页面与组件，严格杜绝虚浮营销词与日期时间格式错乱

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 禁止出现在面向消费者的 UI 界面文案中的夸大营销词或格式错误词
const FORBIDDEN_MARKETING_TERMS = [
  '新一代',
  '智能中枢',
  '高精度',
  '零付费生产级',
  '确定性数学推演',
  '智能赋能',
  '极速智库',
  '全栈架构'
];

const FORBIDDEN_UI_ANOMALIES = [
  '月月',
  '日日',
  'Invalid Date',
  'NaN',
  'undefined'
];

// 白名单目录与文件（技术/运维/遥测专页及系统文档允许描述架构特性）
const WHITELIST_PATHS = [
  path.normalize('app/system'),
  path.normalize('docs/'),
  path.normalize('scripts/'),
  path.normalize('tests/'),
  path.normalize('node_modules/'),
  path.normalize('.next/'),
  path.normalize('.git/')
];

function isWhitelisted(filePath) {
  const rel = path.relative(rootDir, filePath);
  return WHITELIST_PATHS.some(w => rel.startsWith(w) || rel.includes(w));
}

function scanDir(dir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(item)) continue;
      scanDir(fullPath, fileList);
    } else if (/\.(tsx|ts|jsx|js)$/.test(item)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

let violations = [];

const targetDirs = [
  path.join(rootDir, 'app'),
  path.join(rootDir, 'components')
];

for (const targetDir of targetDirs) {
  if (!fs.existsSync(targetDir)) continue;
  const files = scanDir(targetDir);

  for (const file of files) {
    if (isWhitelisted(file)) continue;

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // 忽略纯注释或 import 语句
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
      if (trimmed.startsWith('import ') || trimmed.startsWith('export type ')) return;

      for (const term of FORBIDDEN_MARKETING_TERMS) {
        if (line.includes(term)) {
          violations.push({
            file: path.relative(rootDir, file),
            line: idx + 1,
            term,
            type: 'MARKETING_TERM',
            text: trimmed
          });
        }
      }

      for (const anomaly of FORBIDDEN_UI_ANOMALIES) {
        // 允许代码逻辑中的严格判断，例如 typeof window !== 'undefined' 或 isNaN
        if (anomaly === 'undefined' && (line.includes('=== undefined') || line.includes('!== undefined') || line.includes('typeof ') || line.includes('?:'))) continue;
        if (anomaly === 'NaN' && (line.includes('isNaN') || line.includes('Number.isNaN'))) continue;

        // 如果在 JSX 文本或中文上下文包含该异常词
        if (line.includes(anomaly)) {
          // 排除 TS 类型定义或函数参数
          if (line.includes(': undefined') || line.includes('| undefined')) continue;
          violations.push({
            file: path.relative(rootDir, file),
            line: idx + 1,
            term: anomaly,
            type: 'UI_ANOMALY',
            text: trimmed
          });
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error('\n❌ Copy & UI Text Validation FAILED! Found prohibited terms:\n');
  for (const v of violations) {
    console.error(`  [${v.type}] ${v.file}:${v.line} -> matched: "${v.term}"`);
    console.error(`    > ${v.text}`);
  }
  console.error(`\nTotal violations: ${violations.length}. Please clean consumer-facing copy.\n`);
  process.exit(1);
} else {
  console.log('✅ Copy & UI Text Validation PASSED! No prohibited marketing terms or format anomalies.');
  process.exit(0);
}
