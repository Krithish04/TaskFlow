import React from 'react';

export default function Skeleton({
  variant = 'text', // 'text' | 'circular' | 'rectangular' | 'card'
  width,
  height,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={{
        width: width || (variant === 'circular' ? '40px' : undefined),
        height: height || (variant === 'circular' ? '40px' : variant === 'text' ? '1em' : '100px'),
        ...style,
      }}
    />
  );
}
