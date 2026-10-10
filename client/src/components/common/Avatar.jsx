import React from 'react';
import { initials } from '../../utils';
import StatusDot from './StatusDot';

export default function Avatar({
  user,
  name,
  color,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  status,
  className = '',
  style = {},
  ...props
}) {
  const userName = name || user?.name || '?';
  const bgColor = color || user?.color || '#4F46E5';
  const userStatus = status || user?.status;

  const sizePx = typeof size === 'number' ? size : { sm: 24, md: 32, lg: 40, xl: 48 }[size] || 32;
  const fontSize = Math.max(10, Math.floor(sizePx * 0.4));

  return (
    <div className={`avatar-container size-${size} ${className}`} style={{ position: 'relative', display: 'inline-flex', ...style }} {...props}>
      <div
        className="ava-circle"
        style={{
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          borderRadius: '50%',
          backgroundColor: bgColor,
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: `${fontSize}px`,
          userSelect: 'none',
          flexShrink: 0,
        }}
        title={userName}
      >
        {initials(userName)}
      </div>

      {userStatus && (
        <StatusDot
          status={userStatus}
          size={Math.max(8, Math.floor(sizePx * 0.3))}
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            border: '2px solid var(--bg-surface)',
          }}
        />
      )}
    </div>
  );
}
