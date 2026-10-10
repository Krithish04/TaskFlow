import React from 'react';

export default function Badge({
  children,
  variant = 'default', // 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size = 'md',         // 'sm' | 'md'
  dot = false,
  className = '',
  ...props
}) {
  return (
    <span className={`tf-badge tf-badge-${variant} tf-badge-${size} ${className}`} {...props}>
      {dot && <span className="tf-badge-dot" />}
      {children}
    </span>
  );
}
