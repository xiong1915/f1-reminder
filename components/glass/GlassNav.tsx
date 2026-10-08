// components/glass/GlassNav.tsx
// 统一 Liquid Glass 导航条容器组件，桌面端高饱和微折射，移动端静态轻阴影

import React from 'react';

export interface GlassNavProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function GlassNav({ children, className = '', style = {}, ...props }: GlassNavProps) {
  return (
    <nav className={`glass-nav ${className}`} style={style} {...props}>
      {children}
    </nav>
  );
}
