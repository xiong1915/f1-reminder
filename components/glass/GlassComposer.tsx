// components/glass/GlassComposer.tsx
// 统一 Liquid Glass 输入编辑器容器组件，常驻移动端安全区与软键盘适配

import React from 'react';

export interface GlassComposerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isFocused?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassComposer = React.forwardRef<HTMLDivElement, GlassComposerProps>(
  ({ children, isFocused = false, className = '', style = {}, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`glass-composer ${isFocused ? 'is-focused' : ''} ${className}`}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassComposer.displayName = 'GlassComposer';
