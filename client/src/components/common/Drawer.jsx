import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className={`drawer-content drawer-${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            {title && <h3 className="drawer-title">{title}</h3>}
            {subtitle && <p className="drawer-subtitle">{subtitle}</p>}
          </div>
          <button className="btn-icon drawer-close" onClick={onClose} aria-label="Close drawer">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}
