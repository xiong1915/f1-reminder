// src/render/client_scripts.js
// 客户端脚本：基于 Bootstrap 数据水合、确定性争冠模拟器、无漂移 UTC 倒计时与 AI 交互

export const CLIENT_SCRIPTS = `
(function() {
  // 1. 读取服务端 SSR 注入的 Bootstrap 数据与基准时钟偏差
  let tikeData = {};
  let clockSkew = 0;
  try {
    const el = document.getElementById('tike-bootstrap') || document.getElementById('apex-bootstrap');
    if (el && el.textContent) {
      tikeData = JSON.parse(el.textContent);
      if (typeof tikeData.serverTimeMs === 'number') {
        clockSkew = Date.now() - tikeData.serverTimeMs;
      }
    }
  } catch (e) {
    console.warn('[TIKE] Bootstrap parse error', e);
  }

  // 2. 实时北京时钟 (统一使用 Intl.DateTimeFormat)
  let clockTimer = null;
  function initClock() {
    const clockEl = document.getElementById('tike-clock') || document.getElementById('apex-clock');
    if (!clockEl) return;
    if (clockTimer) clearInterval(clockTimer);

    const update = () => {
      try {
        const adjustedNow = new Date(Date.now() - clockSkew);
        const s = new Intl.DateTimeFormat('zh-CN', {
          timeZone: 'Asia/Shanghai',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(adjustedNow);
        clockEl.textContent = '北京时间 ' + s + ' · UTC+8';
      } catch (_) {}
    };

    clockTimer = setInterval(update, 1000);
    update();
  }

  // 3. 毫秒级无漂移倒计时 (基于 UTC 时间戳差值)
  let countdownTimer = null;
  function initCountdown() {
    const box = document.getElementById('hero-countdown');
    const attrTarget = box ? Number(box.getAttribute('data-target-utc')) : 0;
    const targetMs = attrTarget
      || tikeData.nextSession?.targetUtcMs
      || (tikeData.nextMeeting?.raceStartUTC ? new Date(tikeData.nextMeeting.raceStartUTC).getTime() : 0)
      || 1791534600000; // 兜底：2026-10-09 16:30:00+08:00 (新加坡 FP1)

    if (countdownTimer) clearInterval(countdownTimer);

    let dEl = document.getElementById('cd-days');
    let hEl = document.getElementById('cd-hours');
    let mEl = document.getElementById('cd-mins');
    let sEl = document.getElementById('cd-secs');

    const update = () => {
      if (!sEl) {
        dEl = document.getElementById('cd-days');
        hEl = document.getElementById('cd-hours');
        mEl = document.getElementById('cd-mins');
        sEl = document.getElementById('cd-secs');
      }
      if (!sEl) return;

      const adjustedNow = Date.now() - clockSkew;
      const diff = targetMs - adjustedNow;

      if (diff <= 0) {
        if (dEl) dEl.textContent = '00';
        if (hEl) hEl.textContent = '00';
        if (mEl) mEl.textContent = '00';
        if (sEl) sEl.textContent = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (dEl) dEl.textContent = String(days).padStart(2, '0');
      if (hEl) hEl.textContent = String(hours).padStart(2, '0');
      if (mEl) mEl.textContent = String(mins).padStart(2, '0');
      if (sEl) sEl.textContent = String(secs).padStart(2, '0');
    };

    countdownTimer = setInterval(update, 1000);
    update();
  }

  // 4. 争冠数学模型推演
  window.runChampionshipSim = function() {
    const drivers = tikeData.driverStandings || [];
    if (drivers.length < 2) return;

    const leader = drivers[0];
    const challenger = drivers[1];

    const lSprint = parseInt(document.getElementById('sim-l-sprint')?.value || '0', 10);
    const lRace = parseInt(document.getElementById('sim-l-race')?.value || '0', 10);
    const cSprint = parseInt(document.getElementById('sim-c-sprint')?.value || '0', 10);
    const cRace = parseInt(document.getElementById('sim-c-race')?.value || '0', 10);

    const lTotal = (leader.points || 0) + lSprint + lRace;
    const cTotal = (challenger.points || 0) + cSprint + cRace;
    const gap = lTotal - cTotal;

    const lEl = document.getElementById('sim-out-leader');
    const cEl = document.getElementById('sim-out-challenger');
    const gEl = document.getElementById('sim-out-gap');
    const nEl = document.getElementById('sim-out-narrative');

    if (lEl) lEl.textContent = lTotal + ' 分';
    if (cEl) cEl.textContent = cTotal + ' 分';
    if (gEl) {
      gEl.textContent = (gap >= 0 ? '+' : '') + gap + ' 分';
      gEl.style.color = gap >= 0 ? '#ff2d20' : '#00e5ff';
    }

    if (nEl) {
      const baseGap = (leader.points || 0) - (challenger.points || 0);
      if (gap > baseGap) {
        nEl.textContent = '若 ' + leader.name + ' 在本周末稳定取分，领先优势将扩大至 ' + gap + ' 分，建立稳固争冠壁垒。';
      } else if (gap < baseGap && gap > 0) {
        nEl.textContent = challenger.name + ' 成功将分差缩小至 ' + gap + ' 分，夺冠悬念进一步加剧。';
      } else if (gap <= 0) {
        nEl.textContent = challenger.name + ' 实现了积分反超或持平，争冠格局发生实质性逆转！';
      } else {
        nEl.textContent = '双方单站积分持平，分差维持在 ' + gap + ' 分左右。';
      }
    }
  };

  // 5. TIKE AI 交互检索
  window.submitTikeAi = async function(queryText) {
    const inp = document.getElementById('tike-ai-input') || document.getElementById('apex-ai-input');
    const q = queryText || inp?.value?.trim();
    if (!q) return;

    const outBox = document.getElementById('tike-ai-result-box') || document.getElementById('apex-ai-result-box');
    const outText = document.getElementById('tike-ai-text') || document.getElementById('apex-ai-text');
    const outSources = document.getElementById('tike-ai-sources') || document.getElementById('apex-ai-sources');

    if (outBox) outBox.style.display = 'block';
    if (outText) outText.innerHTML = '<span style="color:#86868b;">正在检索 2026 赛季权威赛事数据与实时分析...</span>';
    if (outSources) outSources.innerHTML = '';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q })
      });
      const data = await res.json();
      let reply = (data.reply || data.error || '暂无可用结果').replace(/\\n/g, '<br>');
      reply = reply.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');

      if (outText) outText.innerHTML = reply;

      if (outSources && Array.isArray(data.sources) && data.sources.length > 0) {
        outSources.innerHTML = '<strong>数据溯源:</strong> ' + data.sources.map(s => s.name).join(' · ');
      }
    } catch (err) {
      if (outText) outText.textContent = '请求失败: ' + err.message;
    }
  };
  window.submitApexAi = window.submitTikeAi;

  // 6. 全生命周期立即启动（不单依赖已可能触发过的 DOMContentLoaded）
  function bootTike() {
    initClock();
    initCountdown();
  }

  // 6.1 脚本执行时立刻运行 (此时当前标签前方的 HTML 已全量渲染)
  try {
    bootTike();
  } catch (err) {
    console.warn('[TIKE] immediate boot error', err);
  }

  // 6.2 如果文档仍在加载状态，挂载 DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootTike);
  }

  // 6.3 挂载 window load 事件兜底
  window.addEventListener('load', bootTike);
})();
`;
