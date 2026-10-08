// components/glass/GlassButton.tsx
// 统一 Liquid Glass 按钮组件，支持主色调、次要透明与危险态，移动端自动降级

import React from 'react';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant = 'secondary', size = 'md', children, className = '', style = {}, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`glass-button glass-btn-${variant} glass-btn-${size} ${className}`}
        style={style}
        {...props}
      >
        {children}
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';
