import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size = 'md',         // 'sm' | 'md' | 'lg'
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ariaLabel,
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon className="btn-icon-left" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} aria-hidden="true" />
          )}
          {children && <span>{children}</span>}
          {Icon && iconPosition === 'right' && (
            <Icon className="btn-icon-right" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} aria-hidden="true" />
          )}
        </>
      )}
    </button>
  );
}
