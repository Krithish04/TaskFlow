import React from 'react';

export default function Badge({
  children,
  variant = 'default', // 'default' | 'high' | 'medium' | 'low' | 'todo' | 'progress' | 'review' | 'done'
  size = 'md',         // 'sm' | 'md'
  dot = false,
  className = '',
  ...props
}) {
  return (
    <span className={`tf-chip chip-${variant} chip-${size} ${className}`} {...props}>
      {dot && <span className="chip-dot" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}
