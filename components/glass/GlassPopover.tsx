// components/glass/GlassPopover.tsx
// 统一 Liquid Glass 气泡弹出层组件

import React from 'react';

export interface GlassPopoverProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function GlassPopover({
  isOpen,
  onClose,
  children,
  className = '',
  style = {},
  ...props
}: GlassPopoverProps) {
  if (!isOpen) return null;

  return (
    <div className={`glass-popover animate-fade-in ${className}`} style={style} {...props}>
      {children}
    </div>
  );
}
