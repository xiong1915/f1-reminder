// components/season_selector.tsx
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SeasonSelectorProps {
  currentSeason: string;
  seasons: string[];
  baseUrl?: string;
}

export function SeasonSelector({
  currentSeason,
  seasons,
  baseUrl = '/races'
}: SeasonSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', selected);
    router.push(`${baseUrl}?${params.toString()}`);
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <label
        htmlFor="season-select"
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--text-secondary, #94a3b8)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
      >
        选择赛季：
      </label>
      <div style={{ position: 'relative' }}>
        <select
          id="season-select"
          value={currentSeason}
          onChange={handleSeasonChange}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            background: 'var(--bg-secondary, #18181b)',
            color: 'var(--text-primary, #ffffff)',
            border: '1px solid var(--line-dark, rgba(255, 255, 255, 0.15))',
            borderRadius: '8px',
            padding: '6px 32px 6px 14px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            outline: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          {seasons.map(s => (
            <option key={s} value={s} style={{ background: '#18181b', color: '#ffffff' }}>
              {s} 赛季 {s === '2026' ? '(当前)' : ''}
            </option>
          ))}
        </select>
        <span
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            fontSize: '10px',
            color: 'var(--text-muted, #71717a)'
          }}
        >
          ▼
        </span>
      </div>
    </div>
  );
}
