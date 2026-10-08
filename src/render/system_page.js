// src/render/system_page.js
// 独立系统与基础设施遥测监控页 (/system)

import { BASE_STYLES } from './styles.js';

export function renderSystemPage(overview) {
  const updatedAt = overview?.updatedAt ? new Date(overview.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '未记录';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>System & Infrastructure · TIKE Telemetry</title>
  <style>${BASE_STYLES}</style>
</head>
<body style="background:var(--black); color:var(--white); padding:40px 0;">
  <div class="container" style="max-width:880px;">
    <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid var(--line-dark); padding-bottom:24px; margin-bottom:36px;">
      <div>
        <div class="eyebrow eyebrow-red">Platform Health & Telemetry</div>
        <h1 style="font-size:28px; font-weight:800; letter-spacing:-0.02em;">系统与遥测监控</h1>
      </div>
      <a href="/" style="font-size:13px; color:#86868b; text-decoration:none;">← 返回赛事主站</a>
    </div>

    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px; margin-bottom:32px;">
      <div style="background:var(--graphite); border:1px solid var(--line-dark); border-radius:16px; padding:20px;">
        <div style="font-size:11px; font-weight:700; color:#86868b; letter-spacing:0.08em; text-transform:uppercase;">Cloudflare Edge Gateway</div>
        <div style="font-family:var(--font-mono); font-size:16px; font-weight:700; color:#10B981; margin-top:6px;">● Active (200 OK)</div>
      </div>

      <div style="background:var(--graphite); border:1px solid var(--line-dark); border-radius:16px; padding:20px;">
        <div style="font-size:11px; font-weight:700; color:#86868b; letter-spacing:0.08em; text-transform:uppercase;">Canonical F1 Data Engine</div>
        <div style="font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--white); margin-top:6px;">Jolpica · OpenF1 API</div>
      </div>

      <div style="background:var(--graphite); border:1px solid var(--line-dark); border-radius:16px; padding:20px;">
        <div style="font-size:11px; font-weight:700; color:#86868b; letter-spacing:0.08em; text-transform:uppercase;">AI Inference Engine</div>
        <div style="font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--white); margin-top:6px;">DeepSeek-V3 (Chat)</div>
      </div>

      <div style="background:var(--graphite); border:1px solid var(--line-dark); border-radius:16px; padding:20px;">
        <div style="font-size:11px; font-weight:700; color:#86868b; letter-spacing:0.08em; text-transform:uppercase;">Realtime Search Pipeline</div>
        <div style="font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--white); margin-top:6px;">Tavily · GDELT · RSS</div>
      </div>

      <div style="background:var(--graphite); border:1px solid var(--line-dark); border-radius:16px; padding:20px;">
        <div style="font-size:11px; font-weight:700; color:#86868b; letter-spacing:0.08em; text-transform:uppercase;">Timezone & Sync</div>
        <div style="font-family:var(--font-mono); font-size:16px; font-weight:700; color:var(--white); margin-top:6px;">Asia/Shanghai (UTC+8)</div>
      </div>

      <div style="background:var(--graphite); border:1px solid var(--line-dark); border-radius:16px; padding:20px;">
        <div style="font-size:11px; font-weight:700; color:#86868b; letter-spacing:0.08em; text-transform:uppercase;">Last Data Refresh</div>
        <div style="font-family:var(--font-mono); font-size:14px; font-weight:600; color:#a1a1a6; margin-top:6px;">${updatedAt}</div>
      </div>
    </div>

    <div style="background:var(--graphite); border:1px solid var(--line-dark); border-radius:16px; padding:24px; margin-bottom:24px;">
      <div style="font-size:11px; font-weight:700; color:#86868b; letter-spacing:0.08em; text-transform:uppercase;">Feishu Webhook Endpoint</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
        <span style="font-family:var(--font-mono); font-size:14px; color:var(--white);">https://f1.tike69.cc.cd</span>
        <button style="background:rgba(255,255,255,0.08); border:1px solid var(--line-dark); color:var(--white); padding:6px 14px; border-radius:6px; font-size:12px; cursor:pointer;" onclick="navigator.clipboard.writeText('https://f1.tike69.cc.cd').then(()=>alert('已复制'))">复制</button>
      </div>
    </div>
  </div>
</body>
</html>`;
}
