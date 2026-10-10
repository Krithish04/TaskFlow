import React from 'react';
import Avatar from './Avatar';

export default function AvatarStack({ users = [], max = 4, size = 'sm', className = '' }) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  const sizePx = typeof size === 'number' ? size : { sm: 24, md: 32, lg: 40 }[size] || 28;

  return (
    <div className={`avatar-stack flex items-center ${className}`} style={{ display: 'inline-flex' }}>
      {visible.map((u, i) => (
        <div
          key={u._id || u.name || i}
          className="avatar-stack-item"
          style={{
            marginLeft: i === 0 ? 0 : -8,
            zIndex: visible.length - i,
            border: '2px solid var(--bg-surface)',
            borderRadius: '50%',
          }}
        >
          <Avatar user={u} name={u.name} color={u.color} size={sizePx} status={u.status} />
        </div>
      ))}

      {overflow > 0 && (
        <div
          className="avatar-stack-overflow"
          style={{
            marginLeft: -8,
            width: `${sizePx}px`,
            height: `${sizePx}px`,
            borderRadius: '50%',
            backgroundColor: 'var(--bg-surface-active)',
            color: 'var(--text-primary)',
            border: '2px solid var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 600,
            zIndex: 0,
          }}
          title={`${overflow} more team members`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
