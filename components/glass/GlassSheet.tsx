// components/glass/GlassSheet.tsx
// 统一 Liquid Glass 移动端底部抽屉 / 侧边抽屉组件

import React from 'react';

export interface GlassSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function GlassSheet({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}: GlassSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="glass-sheet-backdrop" onClick={onClose}>
      <div
        className={`glass-sheet-panel animate-fade-in ${className}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="glass-sheet-header">
          {title && <h3 style={{ fontSize: '18px', fontWeight: 800 }}>{title}</h3>}
          <button
            onClick={onClose}
            className="glass-button glass-btn-ghost glass-btn-sm"
            aria-label="关闭"
            style={{ marginLeft: 'auto' }}
          >
            ✕
          </button>
        </div>
        <div className="glass-sheet-content">
          {children}
        </div>
      </div>
    </div>
  );
}
