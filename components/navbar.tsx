// components/navbar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

import { GlassNav } from '@/components/glass/GlassNav';

export function Navbar() {
  const [bjTimeStr, setBjTimeStr] = useState('北京时间 --:--:--');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      try {
        const s = new Intl.DateTimeFormat('zh-CN', {
          timeZone: 'Asia/Shanghai',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(new Date());
        setBjTimeStr(`北京时间 ${s}`);
      } catch (_) {}
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <GlassNav style={{ height: '64px' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
        {/* Brand */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '18px', letterSpacing: '0.08em' }}>
          <span>TIKE</span>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-red)' }}></span>
        </Link>

        {/* Desktop Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }} className="desktop-nav">
          <Link href="/#race" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, transition: 'color 0.2s' }}>当前分站</Link>
          <Link href="/standings" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, transition: 'color 0.2s' }}>积分榜</Link>
          <Link href="/drivers" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, transition: 'color 0.2s' }}>车手</Link>
          <Link href="/teams" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, transition: 'color 0.2s' }}>车队</Link>
          <Link href="/races" style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, transition: 'color 0.2s' }}>全季赛历</Link>
          <Link href="/system" style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>系统状态</Link>
        </div>

        {/* Right CTA & Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span className="tabular-nums desktop-nav" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            {bjTimeStr}
          </span>

          <Link href="/ai" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid var(--line-dark)', padding: '6px 14px', borderRadius: 'var(--radius-pill)', fontSize: '12px', fontWeight: 600 }}>
            <span>TIKE AI 智能</span>
            <span style={{ fontSize: '10px', color: '#ff453a' }}>✦</span>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="mobile-nav-toggle"
            aria-label="切换导航菜单"
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {menuOpen && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: 'calc(100dvh - 64px)',
          background: 'rgba(10, 10, 11, 0.98)',
          zIndex: 99,
          padding: '36px 24px calc(36px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <Link href="/#race" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 600 }}>当前分站赛程</Link>
          <Link href="/standings" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 600 }}>锦标赛积分榜</Link>
          <Link href="/drivers" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 600 }}>正式车手阵容</Link>
          <Link href="/teams" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 600 }}>制造商品牌</Link>
          <Link href="/races" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 600 }}>2026 全年赛历</Link>
          <Link href="/ai" onClick={() => setMenuOpen(false)} style={{ fontSize: '20px', fontWeight: 600, color: '#ff453a' }}>TIKE AI 智能控制台 ✦</Link>
          <Link href="/system" onClick={() => setMenuOpen(false)} style={{ fontSize: '16px', color: 'var(--text-muted)', marginTop: '20px' }}>系统监控遥测</Link>
          <div className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-muted)', marginTop: 'auto' }}>
            {bjTimeStr} · UTC+8
          </div>
        </div>
      )}
    </GlassNav>
  );
}
