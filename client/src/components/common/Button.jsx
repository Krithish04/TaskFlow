import React from 'react';

export default function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md',         // 'sm' | 'md' | 'lg'
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="btn-spinner" />
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="btn-icon-left" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="btn-icon-right" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
        </>
      )}
    </button>
  );
}
