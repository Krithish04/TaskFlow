import React from 'react';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`empty-state-container ${className}`}>
      {Icon && (
        <div className="empty-state-icon-wrapper">
          <Icon className="empty-state-icon" size={32} />
        </div>
      )}
      {title && <h4 className="empty-state-title">{title}</h4>}
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
