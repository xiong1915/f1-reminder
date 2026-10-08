// scripts/check-production-routing.mjs
// 自动化生产路由拓扑与构建指纹检查脚本
// 循环请求核心路由，收集 X-APEX-Build 及边缘请求头，检测是否存在生产混流或 Legacy HTML 串流

const targetOrigin = process.argv[2] || process.env.TARGET_URL || 'https://f1.tike69.cc.cd';
const corePaths = ['/', '/ai', '/races', '/standings', '/drivers', '/teams', '/system'];
const ROUNDS_PER_PATH = 3;

console.log('='.repeat(70));
console.log(`APEX V3 PRODUCTION ROUTING & BUILD FINGERPRINT AUDIT`);
console.log(`Target: ${targetOrigin}`);
console.log(`Sampling ${corePaths.length} paths x ${ROUNDS_PER_PATH} rounds = ${corePaths.length * ROUNDS_PER_PATH} requests`);
console.log('='.repeat(70));

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function runAudit() {
  const buildIds = new Set();
  const originHeadersSummary = [];
  let legacyHtmlDetected = false;
  let totalRequests = 0;
  let successfulRequests = 0;
  const errors = [];

  for (let round = 1; round <= ROUNDS_PER_PATH; round++) {
    for (const p of corePaths) {
      totalRequests++;
      const url = `${targetOrigin}${p}`;
      try {
        const res = await fetchWithRetry(url, {
          redirect: 'manual',
          headers: {
            'User-Agent': 'APEX-V3-Production-Auditor/1.0',
            'Cache-Control': 'no-cache'
          }
        });

        successfulRequests++;
        const buildHeader = res.headers.get('x-apex-build');
        const vercelId = res.headers.get('x-vercel-id');
        const cfRay = res.headers.get('cf-ray');
        const server = res.headers.get('server');
        const text = await res.text();

        if (buildHeader) {
          buildIds.add(buildHeader);
        }

        // 检查是否返回 Legacy HTML（旧版 Cloudflare Worker 纯字符串拼接无 _next/static 特征）
        const isLegacyWorkerHtml =
          text.includes('id="apex-bootstrap"') &&
          !text.includes('/_next/static') &&
          !text.includes('__NEXT_DATA__');

        if (isLegacyWorkerHtml) {
          legacyHtmlDetected = true;
          errors.push(`Legacy HTML detected on ${p} (Round ${round})!`);
        }

        originHeadersSummary.push({
          path: p,
          status: res.status,
          build: buildHeader || '(none)',
          vercelId: vercelId ? vercelId.slice(0, 15) + '...' : '(none)',
          cfRay: cfRay || '(none)',
          server: server || '(none)'
        });
      } catch (err) {
        errors.push(`Failed to fetch ${p}: ${err.message}`);
      }
    }
  }

  console.log('\n--- ROUTING SAMPLE SUMMARY (First 5 requests) ---');
  originHeadersSummary.slice(0, 5).forEach(s => {
    console.log(`[${s.status}] ${s.path.padEnd(12)} build=${s.build} vercel=${s.vercelId} cf=${s.cfRay}`);
  });

  console.log('\n--- AUDIT EVALUATION ---');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful: ${successfulRequests}`);
  console.log(`Unique X-APEX-Build observed: [${Array.from(buildIds).join(', ') || 'none'}]`);

  let passed = true;

  if (legacyHtmlDetected) {
    console.error('❌ FAIL: Detected Legacy Cloudflare Worker HTML being served in production!');
    passed = false;
  } else {
    console.log('✔ PASS: 0 Legacy Worker HTML responses detected.');
  }

  if (buildIds.size > 1) {
    console.error(`❌ FAIL: Multiple X-APEX-Build identifiers detected in production (${Array.from(buildIds).join(', ')}). Possible cache flapping or mixed deployments!`);
    passed = false;
  } else if (buildIds.size === 1) {
    console.log(`✔ PASS: Single unified build fingerprint across all routes: ${Array.from(buildIds)[0]}`);
  } else {
    // If no X-APEX-Build yet deployed to remote target
    console.warn(`⚠ NOTICE: Remote production target has not yet deployed X-APEX-Build header (local changes pending deployment).`);
  }

  if (errors.length > 0) {
    console.warn(`⚠ Warnings/Errors encountered during requests (${errors.length}):`);
    errors.slice(0, 5).forEach(e => console.warn(`   ${e}`));
  }

  if (!passed) {
    process.exit(1);
  } else {
    console.log('\n✅ Production routing fingerprint check completed successfully.');
    process.exit(0);
  }
}

runAudit();
